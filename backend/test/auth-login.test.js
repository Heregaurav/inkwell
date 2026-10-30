const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const router = require('../src/routes/auth');

// Exercise the actual login handler and real password/token/cookie helpers,
// replacing only database access. No production accounts are used or changed.
const login = router.stack.find(layer =>
  layer.route?.path === '/login' && layer.route.methods.post
).route.stack[0].handle;

function response() {
  return {
    statusCode: 200,
    cookies: [],
    status(code) { this.statusCode = code; return this; },
    cookie(name, value, options) { this.cookies.push({ name, value, options }); return this; },
    json(body) { this.body = body; return this; }
  };
}

test('login handles account records and creates sessions', async t => {
  const password = 'test-password';
  const hash = await bcrypt.hash(password, 4);

  for (const [label, user] of [
    ['unknown account', null],
    ['account without passwordHash', new User({ username: 'reader' })],
    ['account with empty passwordHash', new User({ passwordHash: '' })],
    ['account with unusable passwordHash', new User({ passwordHash: 'invalid-hash' })],
    ['incorrect password', new User({ passwordHash: await bcrypt.hash('other-password', 4) })]
  ]) {
    await t.test(`${label} returns 401 instead of 500`, async t => {
      t.mock.method(User, 'findOne', async () => user);
      const res = response();
      await login({ body: { email: 'reader@example.com', password } }, res);
      assert.equal(res.statusCode, 401);
      assert.deepEqual(res.body, { error: 'Invalid credentials' });
      assert.equal(res.cookies.length, 0);
    });
  }

  await t.test('valid credentials set a session cookie without returning the hash', async t => {
    const user = new User({ username: 'reader', email: 'reader@example.com', passwordHash: hash });
    t.mock.method(User, 'findOne', async query => {
      assert.deepEqual(query, { email: 'reader@example.com' });
      return user;
    });
    const res = response();
    await login({ body: { email: ' READER@EXAMPLE.COM ', password } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.username, 'reader');
    assert.equal(res.body.user.passwordHash, undefined);
    assert.equal(res.cookies.length, 1);
    const cookie = res.cookies[0];
    assert.equal(cookie.name, 'inkwell_session');
    assert.equal(cookie.options.httpOnly, true);
    assert.equal(cookie.options.path, '/api/v1');
    assert.equal(jwt.decode(cookie.value).userId, user.id);
  });
});
