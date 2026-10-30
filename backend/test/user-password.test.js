const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

test('comparePassword rejects a user without a stored password hash', async () => {
  const user = new User({ username: 'reader', email: 'reader@example.com' });

  assert.equal(await user.comparePassword('password'), false);
});

test('comparePassword rejects invalid input without throwing a bcrypt error', async () => {
  const user = new User({ passwordHash: await bcrypt.hash('test-password', 4) });
  for (const password of [undefined, null, '', 123, {}]) {
    assert.equal(await user.comparePassword(password), false);
  }
});

test('comparePassword verifies stored hashes and rejects incorrect passwords', async () => {
  const user = new User({ passwordHash: await bcrypt.hash('test-password', 4) });
  assert.equal(await user.comparePassword('test-password'), true);
  assert.equal(await user.comparePassword('wrong-password'), false);
});
