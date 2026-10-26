const test = require('node:test');
const assert = require('node:assert/strict');
const { createPostMetaProcessor, isPermanentFailure } = require('../src/workers/postWorker');
const { createPostMetaEnqueuer, jobIdFor, queuePublishedPostMetadata } = require('../src/jobs/postJobs');

function fakePostModel({ claimResult = { _id: 'post-1' }, currentPost = null, updateError = null } = {}) {
  const calls = { claim: [], updates: [], reads: [] };
  return {
    calls,
    findOneAndUpdate(query, update) {
      calls.claim.push({ query, update });
      return { select: async () => claimResult };
    },
    findById(postId) {
      calls.reads.push(postId);
      return { select: () => ({ lean: async () => currentPost }) };
    },
    async updateOne(query, update) {
      calls.updates.push({ query, update });
      if (updateError) throw updateError;
      return { matchedCount: 1 };
    }
  };
}

function makeJob(overrides = {}) {
  return {
    id: 'postmeta-post-1-generation-1',
    data: { postId: 'post-1', jobKey: 'generation-1' },
    discarded: false,
    discard() { this.discarded = true; },
    ...overrides
  };
}

test('published post enqueue is fire-and-forget and uses a deterministic job id', async () => {
  const jobs = [];
  const enqueue = createPostMetaEnqueuer({
    add: async (...args) => { jobs.push(args); }
  });
  const post = { _id: 'post-1', aiMeta: { jobKey: 'generation-1' } };
  let queued = false;

  assert.equal(queuePublishedPostMetadata(post, async () => { queued = true; }), post);
  assert.equal(queued, true);
  assert.equal(await enqueue(post._id, post.aiMeta.jobKey), true);
  assert.equal(jobs[0][2].jobId, jobIdFor(post._id, post.aiMeta.jobKey));
  assert.equal(jobs[0][2].jobId, 'postmeta-post-1-generation-1');
});

test('Redis enqueue failure is contained and leaves post creation successful', async () => {
  const enqueue = createPostMetaEnqueuer({ add: async () => { throw new Error('Redis unavailable'); } });
  const post = { _id: 'post-1', aiMeta: { jobKey: 'generation-1' } };

  assert.equal(queuePublishedPostMetadata(post, enqueue), post);
  assert.equal(await enqueue(post._id, post.aiMeta.jobKey), false);
});

test('worker generates metadata for a published post and claims by generation', async () => {
  const PostModel = fakePostModel();
  const generated = [];
  const processor = createPostMetaProcessor({
    PostModel,
    metadataService: { generatePostMetaForJob: async (...args) => { generated.push(args); return true; } }
  });

  assert.deepEqual(await processor(makeJob()), { postId: 'post-1', generated: true });
  assert.equal(generated[0][0], 'post-1');
  assert.equal(generated[0][1], 'generation-1');
  assert.equal(PostModel.calls.claim[0].query.status, 'published');
  assert.equal(PostModel.calls.claim[0].query['aiMeta.jobKey'], 'generation-1');
});

test('archived or deleted posts are skipped without calling AI', async () => {
  for (const currentPost of [null, { status: 'archived', aiMeta: { jobKey: 'generation-1' } }]) {
    const PostModel = fakePostModel({ claimResult: null, currentPost });
    let called = false;
    const processor = createPostMetaProcessor({
      PostModel,
      metadataService: { generatePostMetaForJob: async () => { called = true; } }
    });

    assert.deepEqual(await processor(makeJob()), { skipped: true });
    assert.equal(called, false);
  }
});

test('temporary provider errors release the claim and are retried', async () => {
  const PostModel = fakePostModel();
  const processor = createPostMetaProcessor({
    PostModel,
    metadataService: { generatePostMetaForJob: async () => { throw Object.assign(new Error('rate limited'), { status: 429 }); } }
  });
  const job = makeJob();

  await assert.rejects(processor(job), /rate limited/);
  assert.equal(job.discarded, false);
  assert.equal(PostModel.calls.updates.length, 1);
  assert.ok(PostModel.calls.updates[0].update.$unset['aiMeta.claimToken']);
});

test('permanent provider errors discard BullMQ retries', async () => {
  const processor = createPostMetaProcessor({
    PostModel: fakePostModel(),
    metadataService: { generatePostMetaForJob: async () => { throw Object.assign(new Error('invalid request'), { status: 400 }); } }
  });
  const job = makeJob();

  await assert.rejects(processor(job), /invalid request/);
  assert.equal(job.discarded, true);
  assert.equal(isPermanentFailure(Object.assign(new Error('bad request'), { status: 400 })), true);
  assert.equal(isPermanentFailure(Object.assign(new Error('rate limited'), { status: 429 })), false);
});

test('stalled-job redelivery reclaims with a fresh token and stale writes cannot win', async () => {
  const PostModel = fakePostModel();
  const tokens = [];
  const processor = createPostMetaProcessor({
    PostModel,
    metadataService: { generatePostMetaForJob: async (_id, _key, token) => { tokens.push(token); return true; } }
  });

  await processor(makeJob());
  await processor(makeJob());
  assert.notEqual(tokens[0], tokens[1]);
  assert.equal(PostModel.calls.claim[0].update.$set['aiMeta.claimToken'], tokens[0]);
  assert.ok(PostModel.calls.claim[0].query.$or.some((condition) => condition['aiMeta.claimJobId'] === 'postmeta-post-1-generation-1'));
});

test('Mongo metadata update failures propagate for retry', async () => {
  const error = new Error('Mongo unavailable');
  const PostModel = fakePostModel({ updateError: error });
  const processor = createPostMetaProcessor({
    PostModel,
    metadataService: { generatePostMetaForJob: async () => { throw error; } }
  });

  await assert.rejects(processor(makeJob()), /Mongo unavailable/);
});

test('independent jobs can execute concurrently', async () => {
  let active = 0;
  let maxActive = 0;
  const processor = createPostMetaProcessor({
    PostModel: fakePostModel(),
    metadataService: {
      generatePostMetaForJob: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setImmediate(resolve));
        active -= 1;
        return true;
      }
    }
  });

  await Promise.all([
    processor(makeJob({ id: 'job-1', data: { postId: 'post-1', jobKey: 'one' } })),
    processor(makeJob({ id: 'job-2', data: { postId: 'post-2', jobKey: 'two' } }))
  ]);
  assert.equal(maxActive, 2);
});