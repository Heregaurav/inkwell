const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

// Exercise process ownership without connecting to the developer's databases.
function loadModule(file, dependencies, globals = {}) {
  const module = { exports: {} };
  runInNewContext(readFileSync(require.resolve(file), 'utf8'), {
    module,
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    console: { info() {}, error() {}, log() {} },
    ...globals
  });
  return module.exports;
}

function workerHarness(reconcile = async () => {}) {
  const events = [];
  const signals = [];
  const workerOptions = [];
  let tick;
  class Worker {
    constructor(_name, _processor, options) { workerOptions.push(options); }
    on() {}
    async close() { events.push('worker.close'); }
  }
  const connection = (name) => ({
    status: 'ready',
    async quit() { events.push(`${name}.quit`); },
    disconnect() { events.push(`${name}.disconnect`); }
  });
  const workerConnection = connection('consumer');
  const { startWorker } = loadModule('../src/workers/postWorker.js', {
    dotenv: { config() {} },
    mongoose: {
      async connect() { events.push('mongo.connect'); },
      async disconnect() { events.push('mongo.disconnect'); }
    },
    'node:crypto': { randomUUID() {} },
    bullmq: { Worker },
    '../models/Post': {},
    '../services/aiService': {},
    '../queues/connection': { createRedisConnection: () => workerConnection },
    '../jobs/postJobs': { enqueuePendingPostMetaJobs: reconcile },
    '../queues/postQueue': {
      postQueue: { async close() { events.push('queue.close'); } },
      connection: connection('producer')
    }
  }, {
    process: { env: {}, once: (signal) => signals.push(signal) },
    setInterval(callback) { tick = callback; return { unref() {} }; },
    clearInterval() { events.push('timer.clear'); }
  });
  return { startWorker, events, signals, workerOptions, workerConnection, tick: () => tick() };
}

test('embedded worker reuses Mongo and leaves shared resources to the API on shutdown', async () => {
  const h = workerHarness();
  const runtime = await h.startWorker({ embedded: true });
  assert.deepEqual(h.events, []);
  assert.deepEqual(h.signals, []);
  assert.equal(h.workerOptions[0].concurrency, 1);
  await runtime.shutdown('SIGTERM');
  await runtime.shutdown('SIGTERM');
  assert.deepEqual(h.events, ['timer.clear', 'worker.close', 'consumer.quit']);
});

test('standalone worker owns Mongo, producer connection, and process signals', async () => {
  const h = workerHarness();
  const runtime = await h.startWorker();
  assert.deepEqual(h.signals, ['SIGINT', 'SIGTERM']);
  assert.equal(h.workerOptions[0].concurrency, 5);
  await runtime.shutdown('SIGTERM');
  assert.deepEqual(h.events, [
    'mongo.connect', 'timer.clear', 'worker.close', 'consumer.quit',
    'queue.close', 'producer.quit', 'mongo.disconnect'
  ]);
});

test('Redis outage does not block startup or accumulate overlapping reconciliation', async () => {
  let release;
  let calls = 0;
  const h = workerHarness(() => {
    calls += 1;
    return new Promise((resolve) => { release = resolve; });
  });
  const runtime = await h.startWorker({ embedded: true });
  assert.equal(calls, 1);
  await h.tick();
  assert.equal(calls, 1);
  release();
  await new Promise(setImmediate);
  void h.tick();
  assert.equal(calls, 2);
  release();
  await new Promise(setImmediate);
  h.workerConnection.status = 'reconnecting';
  await runtime.shutdown('SIGTERM');
  assert.ok(h.events.includes('consumer.disconnect'));
  await h.tick();
  assert.equal(calls, 2);
});

test('reconciliation retries after a temporary failure', async () => {
  let calls = 0;
  const h = workerHarness(async () => {
    if (++calls === 1) throw new Error('Redis unavailable');
  });
  const runtime = await h.startWorker({ embedded: true });
  await h.tick();
  assert.equal(calls, 2);
  await runtime.shutdown('SIGTERM');
});

test('API starts embedded worker by default and closes it before shared resources', async () => {
  for (const disabled of [false, true]) {
    const events = [];
    const app = { set() {}, use() {}, get() {} };
    const express = Object.assign(() => app, { json() {} });
    const dependencies = {
      dotenv: { config() {} }, express,
      http: { createServer: () => ({ listen(_port, done) { done(); } }) },
      'socket.io': { Server: class { on() {} close(done) { events.push('http.close'); done(); } } },
      mongoose: {
        async connect() {},
        async disconnect() { events.push('mongo.disconnect'); }
      },
      './queues/postQueue': {
        postQueue: { async close() { events.push('queue.close'); } },
        connection: { status: 'ready', async quit() { events.push('producer.quit'); } }
      },
      cors() {}, 'cookie-parser'() {}, morgan() {}, 'express-rate-limit'() {},
      './bootstrap': { async ensureBaseData() {} },
      './workers/postWorker': {
        async startWorker(options) {
          assert.equal(options.embedded, true);
          events.push('worker.start');
          return { async shutdown() { events.push('worker.close'); } };
        }
      }
    };
    for (const route of ['auth', 'posts', 'comments', 'topics', 'users', 'ai', 'feed', 'search']) {
      dependencies[`./routes/${route}`] = {};
    }
    const { startApi } = loadModule('../src/index.js', dependencies, {
      process: { env: disabled ? { RUN_EMBEDDED_WORKER: 'false' } : {}, once() {} }
    });
    const runtime = await startApi();
    await runtime.shutdown('SIGTERM');
    assert.deepEqual(events, [
      ...(!disabled ? ['worker.start'] : []), 'http.close',
      ...(!disabled ? ['worker.close'] : []),
      'queue.close', 'producer.quit', 'mongo.disconnect'
    ]);
  }
});
