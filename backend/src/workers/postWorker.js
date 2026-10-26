require('dotenv').config();
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { Worker } = require('bullmq');
const Post = require('../models/Post');
const aiService = require('../services/aiService');
const { createRedisConnection } = require('../queues/connection');
const { enqueuePendingPostMetaJobs } = require('../jobs/postJobs');

const POST_META_QUEUE = 'post-metadata';
const concurrency = Math.max(1, Number.parseInt(process.env.QUEUE_WORKER_CONCURRENCY, 10) || 5);

function isPermanentFailure(error) {
  if (error.permanent) return true;
  if (!error.status || error.status === 429) return false;
  return error.status >= 400 && error.status < 500;
}

function createPostMetaProcessor({ PostModel = Post, metadataService = aiService } = {}) {
  return async (job) => {
    const { postId, jobKey } = job.data;
    const jobId = String(job.id);
    const claimToken = randomUUID();
    const leaseExpiredBefore = new Date(Date.now() - 15 * 60 * 1000);
    const claimed = await PostModel.findOneAndUpdate({
      _id: postId,
      status: 'published',
      'aiMeta.status': 'pending',
      'aiMeta.jobKey': jobKey,
      $or: [
        { 'aiMeta.claimJobId': { $exists: false } },
        { 'aiMeta.claimJobId': null },
        { 'aiMeta.claimJobId': jobId },
        { 'aiMeta.claimedAt': { $lt: leaseExpiredBefore } }
      ]
    }, { $set: { 'aiMeta.claimJobId': jobId, 'aiMeta.claimToken': claimToken, 'aiMeta.claimedAt': new Date() } }, { new: true }).select('_id');

    if (!claimed) {
      const current = await PostModel.findById(postId).select('status aiMeta.status aiMeta.jobKey').lean();
      if (!current || current.status !== 'published' || current.aiMeta?.jobKey !== jobKey || current.aiMeta?.status === 'done') {
        return { skipped: true };
      }
      const error = new Error('Post metadata generation is claimed by another job');
      error.retryable = true;
      throw error;
    }

    try {
      const generated = await metadataService.generatePostMetaForJob(postId, jobKey, claimToken);
      if (!generated) {
        await PostModel.updateOne({ _id: postId, status: 'published', 'aiMeta.jobKey': jobKey }, {
          $set: { 'aiMeta.status': 'failed' },
          $unset: { 'aiMeta.claimJobId': 1, 'aiMeta.claimToken': 1, 'aiMeta.claimedAt': 1 }
        });
        return { skipped: true };
      }
      return { postId, generated: true };
    } catch (error) {
      if (isPermanentFailure(error)) job.discard();
      await PostModel.updateOne({ _id: postId, status: 'published', 'aiMeta.jobKey': jobKey, 'aiMeta.claimToken': claimToken }, {
        $unset: { 'aiMeta.claimJobId': 1, 'aiMeta.claimToken': 1, 'aiMeta.claimedAt': 1 }
      }).catch((releaseError) => {
        console.error(JSON.stringify({ level: 'error', event: 'post_meta_claim_release_failed', jobId, postId, message: releaseError.message }));
      });
      throw error;
    }
  };
}

async function startWorker() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/inkwell_db';
  await mongoose.connect(mongoUri);

  const { postQueue } = require('../queues/postQueue');
  const redisConnection = createRedisConnection();
  const worker = new Worker(POST_META_QUEUE, createPostMetaProcessor(), {
    connection: redisConnection,
    concurrency
  });

  worker.on('active', (job) => {
    console.info(JSON.stringify({ level: 'info', event: 'post_meta_job_started', jobId: job.id, postId: job.data.postId }));
  });
  worker.on('completed', (job) => {
    console.info(JSON.stringify({ level: 'info', event: 'post_meta_job_completed', jobId: job.id, postId: job.data.postId }));
  });
  worker.on('failed', async (job, error) => {
    if (!job) return;
    const exhausted = job.discarded || job.attemptsMade >= (job.opts.attempts || 1);
    console.error(JSON.stringify({
      level: exhausted ? 'error' : 'warn',
      event: exhausted ? 'post_meta_job_failed' : 'post_meta_job_retrying',
      jobId: job.id,
      postId: job.data.postId,
      attemptsMade: job.attemptsMade,
      message: error.message
    }));
    if (exhausted) {
      await Post.updateOne({ _id: job.data.postId, status: 'published', 'aiMeta.jobKey': job.data.jobKey }, {
        $set: { 'aiMeta.status': 'failed' },
        $unset: { 'aiMeta.claimJobId': 1, 'aiMeta.claimToken': 1, 'aiMeta.claimedAt': 1 }
      }).catch((updateError) => {
        console.error(JSON.stringify({ level: 'error', event: 'post_meta_failure_state_update_failed', jobId: job.id, postId: job.data.postId, message: updateError.message }));
      });
    }
  });
  worker.on('error', (error) => {
    console.error(JSON.stringify({ level: 'error', event: 'post_worker_error', message: error.message }));
  });

  await enqueuePendingPostMetaJobs();
  const reconcileTimer = setInterval(() => {
    enqueuePendingPostMetaJobs().catch((error) => {
      console.error(JSON.stringify({ level: 'error', event: 'post_meta_reconciliation_failed', message: error.message }));
    });
  }, 30_000);
  reconcileTimer.unref?.();

  console.info(JSON.stringify({ level: 'info', event: 'post_worker_started', concurrency }));
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(JSON.stringify({ level: 'info', event: 'post_worker_stopping', signal }));
    clearInterval(reconcileTimer);
    await worker.close();
    await postQueue.close();
    await redisConnection.quit().catch(() => redisConnection.disconnect());
    await mongoose.disconnect();
  };
  process.once('SIGINT', () => shutdown('SIGINT').finally(() => process.exit(0)));
  process.once('SIGTERM', () => shutdown('SIGTERM').finally(() => process.exit(0)));

  return { worker, shutdown };
}

if (require.main === module) {
  startWorker().catch((error) => {
    console.error(JSON.stringify({ level: 'error', event: 'post_worker_start_failed', message: error.message }));
    process.exit(1);
  });
}

module.exports = { createPostMetaProcessor, isPermanentFailure, startWorker };