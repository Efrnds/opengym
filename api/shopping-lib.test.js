import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeShareCode, sanitizeShareLines, mergeShareLines, createShareRecord, joinShare,
  setGuestPerms, normalizeGuestPerms, shareView,
} from './shopping-lib.js';

test('makeShareCode is alphanumeric without ambiguous chars', () => {
  const code = makeShareCode(8);
  assert.equal(code.length, 8);
  assert.match(code, /^[A-HJ-NP-Z2-9]+$/);
});

test('sanitizeShareLines drops empty and caps size', () => {
  const lines = sanitizeShareLines([
    { name: ' Eggs ', qty: 6, unit: 'un' },
    { name: '', qty: 1 },
    { name: 'Rice', qty: -3 },
  ]);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].name, 'Eggs');
  assert.equal(lines[0].qty, 6);
});

test('mergeShareLines keeps the larger qty for same name+unit', () => {
  const merged = mergeShareLines(
    [{ name: 'Eggs', unit: 'un', qty: 6, category: 'PROTEIN', source: 'auto' }],
    [{ name: 'eggs', unit: 'un', qty: 4, category: 'PROTEIN', source: 'auto' }],
  );
  assert.equal(merged[0].qty, 6);
});

test('joinShare unions member contributions without inflating on re-sync', () => {
  const rec = createShareRecord({ uid: 'u1', name: 'A', lines: [{ name: 'Rice', qty: 1, unit: 'kg' }] });
  const j1 = joinShare(rec, { uid: 'u2', name: 'B', lines: [{ name: 'Rice', qty: 2, unit: 'kg' }, { name: 'Banana', qty: 1, unit: 'un' }] });
  assert.equal(j1.record.lines.find(l => l.name === 'Rice').qty, 2);
  assert.equal(j1.record.lines.find(l => l.name === 'Banana').qty, 1);
  assert.deepEqual(j1.record.memberIds, ['u1', 'u2']);
  assert.equal(j1.record.guestName, 'B');
  // Host re-pushes the same local line — qty must stay stable.
  const jSync = joinShare(j1.record, { uid: 'u1', name: 'A', lines: [{ name: 'Rice', qty: 1, unit: 'kg' }] });
  assert.equal(jSync.record.lines.find(l => l.name === 'Rice').qty, 2);
  assert.equal(jSync.record.lines.find(l => l.name === 'Banana').qty, 1);
  // Host drops Rice — only guest's Banana remains (guest still has Rice 2 in their last push).
  const jDrop = joinShare(jSync.record, { uid: 'u1', name: 'A', lines: [] });
  assert.equal(jDrop.record.lines.find(l => l.name === 'Rice').qty, 2);
  const j2 = joinShare(j1.record, { uid: 'u3', name: 'C', lines: [] });
  assert.equal(j2.error, 'full');
});

test('host can set guest permissions; guest without canAdd cannot push lines', () => {
  const rec = createShareRecord({ uid: 'u1', name: 'A', lines: [{ name: 'Rice', qty: 1, unit: 'kg' }] });
  assert.equal(shareView(rec, 'u1').guestPerms.canAdd, true);
  const locked = setGuestPerms(rec, {
    uid: 'u1',
    perms: { canAdd: false, canEdit: false, canRemove: false, canPurchase: true },
  });
  assert.equal(locked.record.guestPerms.canAdd, false);
  assert.equal(locked.record.guestPerms.canPurchase, true);
  const joined = joinShare(locked.record, {
    uid: 'u2', name: 'B', lines: [{ name: 'Banana', qty: 3, unit: 'un' }],
  });
  assert.ok(!joined.record.lines.find(l => l.name === 'Banana'));
  assert.equal(joined.record.lines.find(l => l.name === 'Rice').qty, 1);
  assert.deepEqual(normalizeGuestPerms(joined.record.guestPerms), {
    canAdd: false, canEdit: false, canRemove: false, canPurchase: true,
  });
  const denied = setGuestPerms(joined.record, { uid: 'u2', perms: { canAdd: true } });
  assert.equal(denied.error, 'forbidden');
});

test('shares weekly prep summary across household partners', () => {
  const prep = { name: 'Chicken Bowl', totalPortions: 10, currentPortions: 8, peopleCount: 2, days: [1, 3, 5], kind: 'BATCH' };
  const rec = createShareRecord({ uid: 'u1', name: 'A', lines: [], weeklyPrep: prep });
  assert.equal(rec.weeklyPrep.totalPortions, 10);
  assert.equal(rec.weeklyPrep.peopleCount, 2);
  const view = shareView(rec, 'u1');
  assert.equal(view.weeklyPrep.name, 'Chicken Bowl');
  assert.equal(view.weeklyPrep.currentPortions, 8);
});

test('allows guest to log purchase and updates household stock atomically', () => {
  const stock = [{ id: 's1', name: 'Rice', currentQty: 500, unit: 'g', costPerUnit: 0.01 }];
  const lines = [{ id: 'l1', name: 'Rice', qty: 1000, unit: 'g', stockId: 's1' }];
  const rec = createShareRecord({ uid: 'u1', name: 'Host', lines, stock });

  const out = joinShare(rec, {
    uid: 'u2', name: 'Guest',
    action: {
      type: 'purchase',
      line: lines[0],
      purchase: { qty: 1000, cost: 15, costMode: 'total' },
    },
  });

  assert.equal(out.record.lines.length, 0);
  const rice = out.record.stock.find(s => s.id === 's1');
  assert.equal(rice.currentQty, 1500);
});

test('allows guest to remove an item from the shared list', () => {
  const lines = [{ id: 'l1', name: 'Rice', qty: 1000, unit: 'g' }, { id: 'l2', name: 'Eggs', qty: 12, unit: 'un' }];
  const rec = createShareRecord({ uid: 'u1', name: 'Host', lines });

  const out = joinShare(rec, {
    uid: 'u2', name: 'Guest',
    action: {
      type: 'remove',
      line: lines[0],
    },
  });

  assert.equal(out.record.lines.length, 1);
  assert.equal(out.record.lines[0].name, 'Eggs');
});

test('shares recipes across household members in shareView and joinShare', () => {
  const recipes = [{ id: 'r1', name: 'Arroz com feijao', portions: 10, ingredients: [{ stockId: 's1', name: 'Rice', qty: 1000, unit: 'g' }] }];
  const rec = createShareRecord({ uid: 'u1', name: 'Host', lines: [], recipes });

  const view = shareView(rec, 'u2');
  assert.equal(view.recipes.length, 1);
  assert.equal(view.recipes[0].name, 'Arroz com feijao');
  assert.equal(view.recipes[0].portions, 10);
});
