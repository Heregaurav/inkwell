const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

function createRedisConnection() {
  const connection = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    connectTimeout: 1000,
    retryStrategy: (attempt) => Math.min(attempt * 500, 5000)
  });

  connection.on('error', (error) => {
    console.error(JSON.stringify({ level: 'error', event: 'redis_connection_error', message: error.message }));
  });

  return connection;
}

module.exports = { createRedisConnection };