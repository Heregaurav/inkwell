const test = require('node:test');
const assert = require('node:assert/strict');
const aiService = require('../src/services/aiService');
const Post = require('../src/models/Post');
const postsRouter = require('../src/routes/posts');

const slugHandler = postsRouter.stack.find(layer => layer.route?.path === '/:slug').route.stack[1].handle;

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('reading a post does not regenerate summaries on demand when a saved summary already exists', async (t) => {
  let generateCalls = 0;
  const post = {
    _id: '507f1f77bcf86cd799439011',
    slug: 'sample-post',
    title: 'Sample post',
    status: 'published',
    stats: { views: 0, likedBy: [], likes: 0 },
    blocks: [],
    authorId: { _id: 'user-1', username: 'author', displayName: 'Author', avatar: '' },
    topics: [],
    responses: [],
    aiMeta: {
      shortSummary: 'Saved summary',
      detailedSummary: 'Saved detailed summary',
      examBullets: ['Saved bullet'],
      examBulletsSource: 'fallback',
      keyTakeaway: 'Saved takeaway',
      generatedAt: new Date(Date.now() - 10 * 60 * 1000)
    },
    toObject() {
      return { ...this, blocks: this.blocks, aiMeta: { ...this.aiMeta } };
    },
    populate() { return this; }
  };

  t.mock.method(Post, 'findOne', () => post);
  t.mock.method(Post, 'findByIdAndUpdate', () => ({}));
  t.mock.method(Post, 'findById', () => ({ select: () => ({ aiMeta: post.aiMeta }) }));
  t.mock.method(aiService, 'aiStatus', () => ({ enabled: true, provider: 'groq', model: 'x' }));
  t.mock.method(aiService, 'generatePostMeta', async () => {
    generateCalls += 1;
    return true;
  });

  const res = response();
  await slugHandler({
    params: { slug: 'sample-post' },
    query: { readerMode: 'exam' },
    user: null
  }, res);

  assert.equal(generateCalls, 0);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.post.readerContent);
});
