import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const DEFAULT_GUEST_PERMS = Object.freeze({
  canAdd: true,
  canEdit: true,
  canRemove: true,
  canPurchase: true,
});

export function normalizeGuestPerms(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    canAdd: src.canAdd !== false,
    canEdit: src.canEdit !== false,
    canRemove: src.canRemove !== false,
    canPurchase: src.canPurchase !== false,
  };
}

export function makeShareCode(bytes = 6) {
  let code = '';
  const buf = crypto.randomBytes(bytes);
  for (const b of buf) code += ALPHABET[b % ALPHABET.length];
  return code;
}

export function sanitizeShareLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines
    .map(l => ({
      name: String(l?.name || '').trim().slice(0, 80),
      category: String(l?.category || 'PANTRY').slice(0, 24),
      unit: String(l?.unit || 'un').slice(0, 12),
      qty: Math.max(0, Math.round((Number(l?.qty) || 0) * 100) / 100),
      source: l?.source === 'manual' ? 'manual' : 'auto',
      stockId: l?.stockId ? String(l.stockId).slice(0, 40) : null,
      barcode: String(l?.barcode || '').replace(/\D/g, '').slice(0, 32),
    }))
    .filter(l => l.name && l.qty > 0)
    .slice(0, 200);
}

/** Merge two line arrays by name+unit (case-insensitive), keeping the larger qty. */
export function mergeShareLines(a = [], b = []) {
  const map = new Map();
  const key = l => `${l.name.toLowerCase()}|${l.unit}`;
  for (const line of [...a, ...b]) {
    const k = key(line);
    const prev = map.get(k);
    if (!prev) {
      map.set(k, { ...line });
      continue;
    }
    map.set(k, {
      ...prev,
      qty: Math.max(prev.qty, line.qty),
      barcode: prev.barcode || line.barcode || '',
      stockId: prev.stockId || line.stockId || null,
      source: prev.source === 'manual' || line.source === 'manual' ? 'manual' : 'auto',
    });
  }
  return [...map.values()].sort((x, y) => x.name.localeCompare(y.name));
}

function unionMemberLines(linesByMember = {}) {
  return Object.values(linesByMember).reduce((acc, lines) => mergeShareLines(acc, lines), []);
}

export function sanitizeStockItem(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    id: String(item.id || crypto.randomUUID?.() || makeShareCode(8)),
    name: String(item.name || '').trim().slice(0, 80) || 'Item',
    category: String(item.category || 'PANTRY').slice(0, 24),
    unit: String(item.unit || 'g').slice(0, 12),
    currentQty: Math.max(0, Math.round((Number(item.currentQty) || 0) * 100) / 100),
    minAlertQty: Math.max(0, Math.round((Number(item.minAlertQty) || 0) * 100) / 100),
    costPerUnit: Math.max(0, Math.round((Number(item.costPerUnit) || 0) * 100) / 100),
    calories: Math.max(0, Math.round(Number(item.calories) || 0)),
    protein: Math.max(0, Math.round(Number(item.protein) || 0)),
    carbs: Math.max(0, Math.round(Number(item.carbs) || 0)),
    fats: Math.max(0, Math.round(Number(item.fats) || 0)),
    barcode: String(item.barcode || '').replace(/\D/g, '').slice(0, 32),
  };
}

export function sanitizeStockArray(stock) {
  if (!Array.isArray(stock)) return [];
  return stock.map(sanitizeStockItem).filter(Boolean).slice(0, 300);
}

export function sanitizeRecipeItem(r) {
  if (!r || typeof r !== 'object') return null;
  return {
    id: String(r.id || '').trim().slice(0, 40) || 'rec-' + Date.now(),
    name: String(r.name || '').trim().slice(0, 80) || 'Recipe',
    portions: Math.max(1, Math.min(100, Math.round(Number(r.portions) || 1))),
    ingredients: Array.isArray(r.ingredients)
      ? r.ingredients.map(i => ({
          stockId: String(i?.stockId || '').slice(0, 40),
          name: String(i?.name || '').slice(0, 80),
          qty: Math.max(0, Math.round((Number(i?.qty) || 0) * 100) / 100),
          unit: String(i?.unit || 'g').slice(0, 12),
        })).filter(i => i.stockId && i.qty > 0).slice(0, 50)
      : [],
    notes: String(r.notes || '').slice(0, 500),
  };
}

export function sanitizeRecipeArray(recipes) {
  if (!Array.isArray(recipes)) return [];
  return recipes.map(sanitizeRecipeItem).filter(Boolean).slice(0, 100);
}

export function sanitizeWeeklyPrepSummary(prep) {
  if (!prep || typeof prep !== 'object') return null;
  return {
    name: String(prep.name || '').trim().slice(0, 80) || 'Meal prep',
    recipeName: String(prep.recipeName || prep.name || '').trim().slice(0, 80),
    totalPortions: Math.max(0, Math.round(Number(prep.totalPortions) || 0)),
    currentPortions: Math.max(0, Math.round(Number(prep.currentPortions) || 0)),
    peopleCount: Math.max(1, Math.min(10, Math.round(Number(prep.peopleCount) || 1))),
    kind: prep.kind === 'DAILY' ? 'DAILY' : 'BATCH',
    days: Array.isArray(prep.days) ? prep.days.map(Number).filter(d => d >= 0 && d <= 6) : [],
    updatedAt: Date.now(),
  };
}

export function createShareRecord({ uid, name, lines, stock, recipes, guestPerms, weeklyPrep, ttlMs = 7 * 24 * 60 * 60 * 1000 }) {
  const clean = sanitizeShareLines(lines);
  return {
    code: makeShareCode(),
    ownerId: uid,
    ownerName: String(name || '').slice(0, 64),
    guestId: null,
    guestName: null,
    guestPerms: normalizeGuestPerms(guestPerms),
    lines: clean,
    stock: sanitizeStockArray(stock),
    recipes: sanitizeRecipeArray(recipes),
    weeklyPrep: sanitizeWeeklyPrepSummary(weeklyPrep),
    // Each member's latest push; household list is the union (max qty). Avoids qty inflation on poll.
    linesByMember: { [uid]: clean },
    memberIds: [uid],
    createdAt: Date.now(),
    exp: Date.now() + ttlMs,
  };
}

export function joinShare(record, { uid, name, lines, stock, recipes, weeklyPrep, action }) {
  if (!record) return { error: 'not found' };
  if (record.exp < Date.now()) return { error: 'expired' };
  if (record.memberIds.length >= 2 && !record.memberIds.includes(uid)) {
    return { error: 'full' };
  }
  const already = record.memberIds.includes(uid);
  const members = already ? record.memberIds : [...record.memberIds, uid];
  const perms = normalizeGuestPerms(record.guestPerms);
  const isOwner = uid === record.ownerId;

  // Action handling (purchase, remove, add, edit):
  if (action && typeof action === 'object') {
    if (action.type === 'purchase') {
      if (!isOwner && !perms.canPurchase) return { error: 'forbidden' };
      const { line = {}, purchase = {} } = action;
      const qty = Number(purchase.qty || line.qty || 1);
      const cost = Number(purchase.cost || 0);
      const costMode = purchase.costMode || 'total';
      const asNew = purchase.asNew;
      const stockId = line.stockId;
      let curStock = Array.isArray(record.stock) ? [...record.stock] : [];
      let updatedItem = null;

      if (asNew || !stockId) {
        const itemName = (purchase.newName || line.name || 'Item').trim();
        const unitCost = costMode === 'unit' ? cost : (qty > 0 ? cost / qty : 0);
        const newItem = sanitizeStockItem({
          name: itemName,
          category: line.category || 'PANTRY',
          unit: line.unit || 'un',
          currentQty: qty,
          minAlertQty: qty,
          costPerUnit: unitCost,
          barcode: line.barcode,
          calories: line.calories,
          protein: line.protein,
          carbs: line.carbs,
          fats: line.fats,
        });
        curStock.push(newItem);
        updatedItem = newItem;
      } else {
        const idx = curStock.findIndex(s => s.id === stockId || s.name.toLowerCase() === String(line.name || '').toLowerCase());
        if (idx >= 0) {
          const prev = curStock[idx];
          const newQty = Math.round(((Number(prev.currentQty) || 0) + qty) * 100) / 100;
          const unitCost = costMode === 'unit' ? cost : (qty > 0 ? cost / qty : 0);
          let costPerUnit = prev.costPerUnit || 0;
          if (unitCost > 0 && qty > 0) {
            if (prev.costPerUnit > 0 && prev.currentQty > 0) {
              costPerUnit = Math.round((((prev.costPerUnit * prev.currentQty) + (unitCost * qty)) / newQty) * 100) / 100;
            } else {
              costPerUnit = Math.round(unitCost * 100) / 100;
            }
          }
          curStock[idx] = { ...prev, currentQty: newQty, costPerUnit };
          updatedItem = curStock[idx];
        }
      }

      const matchLine = l => (l.id && line.id && l.id === line.id) || (String(l.name).toLowerCase() === String(line.name).toLowerCase() && l.unit === line.unit);
      const filterLines = list => (list || []).filter(l => !matchLine(l));
      const linesByMember = {};
      for (const [mid, mlines] of Object.entries(record.linesByMember || {})) {
        linesByMember[mid] = filterLines(mlines);
      }
      const nextLines = filterLines(record.lines);

      const next = {
        ...record,
        stock: curStock,
        linesByMember,
        lines: nextLines,
        memberIds: members,
      };
      if (!already && uid !== record.ownerId) {
        next.guestId = uid;
        next.guestName = String(name || '').slice(0, 64) || 'Partner';
      }
      return { record: next, item: updatedItem };
    }

    if (action.type === 'remove') {
      if (!isOwner && !perms.canRemove) return { error: 'forbidden' };
      const line = action.line || {};
      const matchLine = l => (l.id && line.id && l.id === line.id) || (String(l.name).toLowerCase() === String(line.name).toLowerCase() && l.unit === line.unit);
      const filterLines = list => (list || []).filter(l => !matchLine(l));
      const linesByMember = {};
      for (const [mid, mlines] of Object.entries(record.linesByMember || {})) {
        linesByMember[mid] = filterLines(mlines);
      }
      const nextLines = filterLines(record.lines);

      let curStock = Array.isArray(record.stock) ? [...record.stock] : [];
      if (line.stockId) {
        curStock = curStock.map(s => s.id === line.stockId ? { ...s, minAlertQty: s.currentQty } : s);
      }

      const next = {
        ...record,
        stock: curStock,
        linesByMember,
        lines: nextLines,
        memberIds: members,
      };
      if (!already && uid !== record.ownerId) {
        next.guestId = uid;
        next.guestName = String(name || '').slice(0, 64) || 'Partner';
      }
      return { record: next };
    }

    if (action.type === 'add') {
      if (!isOwner && !perms.canAdd) return { error: 'forbidden' };
      const clean = sanitizeShareLines([action.line]);
      if (!clean.length) return { record };
      const nextLine = clean[0];
      const nextLines = mergeShareLines(record.lines || [], [nextLine]);
      const linesByMember = { ...(record.linesByMember || {}) };
      linesByMember[uid] = mergeShareLines(linesByMember[uid] || [], [nextLine]);
      const next = {
        ...record,
        linesByMember,
        lines: nextLines,
        memberIds: members,
      };
      if (!already && uid !== record.ownerId) {
        next.guestId = uid;
        next.guestName = String(name || '').slice(0, 64) || 'Partner';
      }
      return { record: next };
    }

    if (action.type === 'edit') {
      if (!isOwner && !perms.canEdit) return { error: 'forbidden' };
      const prev = action.prev || action.line || {};
      const nextLine = sanitizeShareLines([action.next || action.line])[0];
      if (!nextLine) return { record };
      const matchPrev = l => (l.id && prev.id && l.id === prev.id) || (String(l.name).toLowerCase() === String(prev.name).toLowerCase() && l.unit === prev.unit);
      const replaceIn = list => {
        const idx = (list || []).findIndex(matchPrev);
        if (idx >= 0) {
          const copy = [...list];
          copy[idx] = { ...copy[idx], ...nextLine };
          return copy;
        }
        return list || [];
      };
      const linesByMember = {};
      for (const [mid, mlines] of Object.entries(record.linesByMember || {})) {
        linesByMember[mid] = replaceIn(mlines);
      }
      const nextLines = replaceIn(record.lines);
      const next = {
        ...record,
        linesByMember,
        lines: nextLines,
        memberIds: members,
      };
      if (!already && uid !== record.ownerId) {
        next.guestId = uid;
        next.guestName = String(name || '').slice(0, 64) || 'Partner';
      }
      return { record: next };
    }
  }

  // Regular periodic sync:
  const linesByMember = { ...(record.linesByMember || {}) };
  // Migrate old shares that only stored a flat `lines` array.
  if (!record.linesByMember && record.ownerId && Array.isArray(record.lines)) {
    linesByMember[record.ownerId] = sanitizeShareLines(record.lines);
  }

  let clean = sanitizeShareLines(lines);
  if (!isOwner && !perms.canAdd) {
    clean = Array.isArray(linesByMember[uid]) ? linesByMember[uid] : [];
  }
  linesByMember[uid] = clean;

  const next = {
    ...record,
    guestPerms: perms,
    memberIds: members,
    linesByMember,
    lines: unionMemberLines(linesByMember),
    stock: (isOwner || perms.canStock !== false) && Array.isArray(stock) ? sanitizeStockArray(stock) : (record.stock || []),
    recipes: (isOwner || perms.canStock !== false) && Array.isArray(recipes) ? sanitizeRecipeArray(recipes) : (record.recipes || []),
    weeklyPrep: sanitizeWeeklyPrepSummary(weeklyPrep) || record.weeklyPrep || null,
  };
  // First non-owner to join becomes the guest.
  if (!already && uid !== record.ownerId) {
    next.guestId = uid;
    next.guestName = String(name || '').slice(0, 64) || 'Partner';
  }
  return { record: next };
}

/** Host-only: update what the guest may do on this list. */
export function setGuestPerms(record, { uid, perms }) {
  if (!record) return { error: 'not found' };
  if (record.exp < Date.now()) return { error: 'expired' };
  if (record.ownerId !== uid) return { error: 'forbidden' };
  const guestPerms = normalizeGuestPerms(perms);
  const next = { ...record, guestPerms };
  if (!guestPerms.canAdd && record.guestId) {
    const linesByMember = { ...(record.linesByMember || {}) };
    linesByMember[record.guestId] = [];
    next.linesByMember = linesByMember;
    next.lines = unionMemberLines(linesByMember);
  }
  return { record: next };
}

/** Public snapshot for the signed-in viewer. */
export function shareView(record, uid) {
  if (!record) return null;
  const role = record.ownerId === uid ? 'host' : 'guest';
  const partnerName = role === 'host'
    ? (record.guestName || null)
    : (record.ownerName || null);
  return {
    code: record.code,
    ownerName: record.ownerName || null,
    guestName: record.guestName || null,
    partnerName,
    members: record.memberIds.length,
    role,
    paired: record.memberIds.length >= 2,
    guestPerms: normalizeGuestPerms(record.guestPerms),
    weeklyPrep: record.weeklyPrep || null,
    stock: record.stock || [],
    recipes: record.recipes || [],
    lines: record.lines || [],
    exp: record.exp,
  };
}
