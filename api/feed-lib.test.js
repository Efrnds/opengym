import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isImageBuf, decodePhotoDataUrl, sanitizeWorkoutPost, workoutPostFromState,
  feedPage, parseFeedCursor, checkPostRateLimit, imageExt,
} from './feed-lib.js';

test('isImageBuf detects jpeg magic bytes', () => {
  assert.equal(isImageBuf(Buffer.from([0xFF, 0xD8, 0xFF, 0x00])), true);
  assert.equal(isImageBuf(Buffer.from([0x00, 0x00])), false);
});

test('decodePhotoDataUrl rejects invalid base64', () => {
  assert.equal(decodePhotoDataUrl('data:image/jpeg;base64,!!!'), null);
});

test('workoutPostFromState reads logged workout', () => {
  const state = {
    unit: 'kg',
    workouts: [{
      id: 'w1',
      name: 'Push',
      d: '2026-01-01',
      start: 0,
      end: 3600000,
      vol: 5000,
      prs: ['0025'],
      entries: [{ id: '0025', sets: [{ w: 60, r: 8, done: true }] }],
    }],
  };
  const out = workoutPostFromState(state, 'w1');
  assert.equal(out.name, 'Push');
  assert.equal(out.entries[0].topW, 60);
  assert.equal(out.prs[0], '0025');
});

test('feedPage paginates by createdAt and id', () => {
  const posts = [
    { id: 'b', createdAt: '2026-01-02T00:00:00.000Z' },
    { id: 'a', createdAt: '2026-01-02T00:00:00.000Z' },
    { id: 'c', createdAt: '2026-01-01T00:00:00.000Z' },
  ];
  const p1 = feedPage(posts, { limit: 2 });
  assert.equal(p1.posts.length, 2);
  assert.equal(p1.posts[0].id, 'b');
  const p2 = feedPage(posts, { before: p1.nextBefore, limit: 2 });
  assert.equal(p2.posts[0].id, 'c');
});

test('parseFeedCursor splits at last pipe', () => {
  assert.deepEqual(parseFeedCursor('2026-01-01T00:00:00.000Z|abc'), { at: '2026-01-01T00:00:00.000Z', id: 'abc' });
});

test('checkPostRateLimit caps hourly posts', () => {
  const map = new Map();
  for (let i = 0; i < 20; i++) assert.equal(checkPostRateLimit(map, 'u1', 1000), true);
  assert.equal(checkPostRateLimit(map, 'u1', 1000), false);
});

test('imageExt maps magic bytes', () => {
  assert.equal(imageExt(Buffer.from([0xFF, 0xD8, 0xFF])), 'jpg');
});
