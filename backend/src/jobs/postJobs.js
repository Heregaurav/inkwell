const Post = require('../models/Post');

function getPostQueue() {
  return require('../queues/postQueue').postQueue;
}

function jobIdFor(postId, jobKey) {
  return `postmeta-${postId}-${jobKey}`;
}

function createPostMetaEnqueuer(queue) {
  return (postId, jobKey) => {
    const jobId = jobIdFor(postId, jobKey);
    return queue.add('generate-post-metadata', { postId: String(postId), jobKey }, { jobId }).then(() => {
      console.info(JSON.stringify({ level: 'info', event: 'post_meta_job_queued', jobId, postId: String(postId) }));
      return true;
    }, (error) => {
      console.error(JSON.stringify({ level: 'error', event: 'post_meta_job_enqueue_failed', jobId, postId: String(postId), message: error.message }));
      return false;
    });
  };
}

const enqueuePostMetaJob = createPostMetaEnqueuer({
  add: (...args) => getPostQueue().add(...args)
});

function queuePublishedPostMetadata(post, enqueue = enqueuePostMetaJob) {
  enqueue(post._id, post.aiMeta.jobKey);
  return post;
}

async function enqueuePendingPostMetaJobs(limit = 100) {
  const postQueue = getPostQueue();
  const pending = await Post.find({
    status: 'published',
    'aiMeta.status': 'pending',
    'aiMeta.jobKey': { $exists: true, $ne: null }
  }).select('_id aiMeta.jobKey').limit(limit).lean();

  return Promise.all(pending.map(async (post) => {
    const jobId = jobIdFor(post._id, post.aiMeta.jobKey);
    const existing = await postQueue.getJob(jobId);
    if (existing && await existing.getState() === 'failed') await existing.remove();
    return enqueuePostMetaJob(post._id, post.aiMeta.jobKey);
  }));
}

module.exports = { enqueuePostMetaJob, enqueuePendingPostMetaJobs, jobIdFor, createPostMetaEnqueuer, queuePublishedPostMetadata };