const { Queue } = require('bullmq');
const { createRedisConnection } = require('./connection');

const POST_META_QUEUE = 'post-metadata';
const connection = createRedisConnection();
const postQueue = new Queue(POST_META_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
    removeOnFail: { age: 30 * 24 * 60 * 60, count: 1000 }
  }
});

postQueue.on('error', (error) => {
  console.error(JSON.stringify({ level: 'error', event: 'post_queue_error', message: error.message }));
});

module.exports = { POST_META_QUEUE, connection, postQueue };