import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmail, emailOk, passwordIssue, nameOk,
  hashPassword, verifyPassword, findUserByEmail, checkAuthRateLimit,
} from './password-auth.js';

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  Foo@Bar.COM '), 'foo@bar.com');
});

test('emailOk rejects junk', () => {
  assert.equal(emailOk('a@b.co'), true);
  assert.equal(emailOk('not-an-email'), false);
  assert.equal(emailOk(''), false);
  assert.equal(emailOk('a@b'), false);
});

test('passwordIssue enforces length', () => {
  assert.match(passwordIssue('short'), /at least/);
  assert.equal(passwordIssue('longenough'), null);
});

test('nameOk', () => {
  assert.equal(nameOk('Edu'), true);
  assert.equal(nameOk('  '), false);
});

test('hashPassword + verifyPassword round-trip', async () => {
  const enc = await hashPassword('correct-horse');
  assert.match(enc, /^scrypt\$/);
  assert.equal(await verifyPassword('correct-horse', enc), true);
  assert.equal(await verifyPassword('wrong', enc), false);
  assert.equal(await verifyPassword('correct-horse', 'garbage'), false);
});

test('findUserByEmail', () => {
  const users = [{ id: '1', email: 'a@b.co', name: 'A' }];
  assert.equal(findUserByEmail(users, 'A@B.CO').id, '1');
  assert.equal(findUserByEmail(users, 'x@y.z'), null);
});

test('checkAuthRateLimit caps attempts', () => {
  const map = new Map();
  for (let i = 0; i < 3; i++) assert.equal(checkAuthRateLimit(map, 'ip', { limit: 3 }), true);
  assert.equal(checkAuthRateLimit(map, 'ip', { limit: 3 }), false);
});
