import { uid } from './format.js'

export const DEFAULT_GUEST_PERMS = Object.freeze({
  canAdd: true,
  canEdit: true,
  canRemove: true,
  canPurchase: true,
})

export function normalizeGuestPerms(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    canAdd: src.canAdd !== false,
    canEdit: src.canEdit !== false,
    canRemove: src.canRemove !== false,
    canPurchase: src.canPurchase !== false,
  }
}

const FAIR = new Set(['VEGETABLE', 'FRUIT'])
const roundQty = value => Math.round(value * 100) / 100
const n = v => Math.max(0, Number(v) || 0)

export function shoppingChannel(category) {
  return FAIR.has(category) ? 'FAIR' : 'MARKET'
}

/** Normalize pantry / stock item — safe for old saves missing new fields. */
export function normalizeStockItem(row = {}) {
  const unit = row.unit || 'g'
  let calories = n(row.calories)
  let protein = n(row.protein)
  let carbs = n(row.carbs)
  let fats = n(row.fats)

  // Auto-heal legacy saves where macros were saved per-1g instead of per-100g:
  // e.g. calories: 1 (for rice/beans/etc.) or carbs: 0.28
  if ((unit === 'g' || unit === 'ml') && calories > 0 && calories <= 5) {
    const rawName = String(row.name || '').toLowerCase()
    if (rawName.includes('arroz')) {
      calories = 130; protein = 2.7; carbs = 28; fats = 0.3
    } else if (rawName.includes('feij')) {
      calories = 76; protein = 4.8; carbs = 14; fats = 0.5
    } else if (rawName.includes('frango')) {
      calories = 165; protein = 31; carbs = 0; fats = 3.6
    } else if (rawName.includes('patinho') || rawName.includes('carne')) {
      calories = 219; protein = 35.9; carbs = 0; fats = 7.3
    } else {
      calories = Math.round(calories * 100)
      protein = Math.round(protein * 1000) / 10
      carbs = Math.round(carbs * 1000) / 10
      fats = Math.round(fats * 1000) / 10
    }
  }

  return {
    id: row.id || uid(),
    name: String(row.name || '').trim() || 'Item',
    category: row.category || 'PANTRY',
    unit,
    currentQty: n(row.currentQty),
    minAlertQty: n(row.minAlertQty),
    costPerUnit: n(row.costPerUnit),
    calories,
    protein,
    carbs,
    fats,
    barcode: String(row.barcode || '').replace(/\D/g, ''),
  }
}

/**
 * Auto lines from stock below min + optional manual extras.
 * When shoppingMode is false, returns only manual extras (stock is qty-only).
 */
export function buildSmartShoppingList(stock, extras = [], shoppingMode = true, ignored = []) {
  const auto = shoppingMode
    ? (stock || [])
      .map(normalizeStockItem)
      .map(item => {
        const deficit = Math.max(0, roundQty(item.minAlertQty - item.currentQty))
        return {
          id: item.id,
          stockId: item.id,
          name: item.name,
          category: item.category,
          channel: shoppingChannel(item.category),
          unit: item.unit,
          deficit,
          qty: deficit,
          cost: deficit * item.costPerUnit,
          currentQty: item.currentQty,
          minAlertQty: item.minAlertQty,
          source: 'auto',
          barcode: item.barcode || '',
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fats: item.fats,
        }
      })
      .filter(line => line.deficit > 0)
    : []

  const manual = (extras || []).map(x => ({
    id: x.id || uid(),
    stockId: x.stockId || null,
    name: String(x.name || '').trim() || 'Item',
    category: x.category || 'PANTRY',
    channel: shoppingChannel(x.category || 'PANTRY'),
    unit: x.unit || 'un',
    deficit: n(x.qty),
    qty: n(x.qty),
    cost: n(x.qty) * n(x.costPerUnit),
    currentQty: 0,
    minAlertQty: 0,
    source: 'manual',
    checked: !!x.checked,
    calories: n(x.calories),
    protein: n(x.protein),
    carbs: n(x.carbs),
    fats: n(x.fats),
    barcode: String(x.barcode || '').replace(/\D/g, ''),
  })).filter(l => l.qty > 0)

  return [...auto, ...manual].filter(l => !ignored.includes(l.id) && !ignored.includes(l.stockId)).sort(
    (a, b) => a.channel.localeCompare(b.channel) || a.name.localeCompare(b.name),
  )
}

/**
 * Apply a purchase: add qty to stock and refresh unit cost.
 * costMode: 'total' | 'unit'
 */
export function applyPurchase(stock, { stockId, qty, cost, costMode = 'total', create } = {}) {
  const amount = n(qty)
  if (amount <= 0 && !create) return { stock: stock || [], error: 'qty required' }

  let next = [...(stock || []).map(normalizeStockItem)]
  const paid = n(cost)
  const unitCost = costMode === 'unit'
    ? paid
    : (amount > 0 ? paid / amount : 0)

  if (create && create.name) {
    const row = normalizeStockItem({
      ...create,
      id: create.id || uid(),
      currentQty: amount,
      costPerUnit: unitCost || n(create.costPerUnit),
    })
    next.push(row)
    return { stock: next, item: row }
  }

  if (!stockId) return { stock: next, error: 'stockId required' }
  const idx = next.findIndex(i => i.id === stockId)
  if (idx < 0) return { stock: next, error: 'item not found' }

  const prev = next[idx]
  const newQty = roundQty(prev.currentQty + amount)
  let costPerUnit = prev.costPerUnit
  if (unitCost > 0 && amount > 0) {
    if (prev.costPerUnit > 0 && prev.currentQty > 0) {
      costPerUnit = roundQty(
        ((prev.costPerUnit * prev.currentQty) + (unitCost * amount)) / newQty,
      )
    } else {
      costPerUnit = roundQty(unitCost)
    }
  }

  const item = { ...prev, currentQty: newQty, costPerUnit }
  next[idx] = item
  return { stock: next, item }
}

/** Merge two shopping lists by name+unit (shared household). */
export function mergeShoppingLists(a = [], b = []) {
  const map = new Map()
  const key = line => `${String(line.name || '').trim().toLowerCase()}|${line.unit || ''}`
  const normalizeLine = line => {
    const qty = n(line.qty || line.deficit)
    const category = line.category || 'PANTRY'
    return {
      ...line,
      name: String(line.name || '').trim() || 'Item',
      category,
      unit: line.unit || 'un',
      channel: line.channel || shoppingChannel(category),
      qty,
      deficit: qty,
      source: line.source === 'manual' ? 'manual' : (line.source || 'auto'),
    }
  }
  for (const raw of [...a, ...b]) {
    const line = normalizeLine(raw)
    const k = key(line)
    const prev = map.get(k)
    if (!prev) {
      map.set(k, line)
      continue
    }
    const qty = Math.max(n(prev.qty), n(line.qty))
    map.set(k, {
      ...prev,
      ...line,
      qty,
      deficit: qty,
      cost: roundQty(qty * n(prev.costPerUnit || (prev.cost && prev.qty ? prev.cost / prev.qty : 0))),
      channel: prev.channel || line.channel,
      barcode: line.barcode || prev.barcode || '',
    })
  }
  return [...map.values()].sort(
    (x, y) => String(x.channel).localeCompare(String(y.channel)) || String(x.name).localeCompare(String(y.name)),
  )
}

/** Snapshot of list lines suitable for API share payload. */
export function shoppingSharePayload(stock, extras = [], shoppingMode = true, weeklyPrep = null) {
  const prepSummary = weeklyPrep ? {
    name: weeklyPrep.name,
    recipeName: weeklyPrep.recipeName || weeklyPrep.name,
    totalPortions: weeklyPrep.totalPortions,
    currentPortions: weeklyPrep.currentPortions,
    peopleCount: weeklyPrep.peopleCount || 1,
    kind: weeklyPrep.kind,
    days: weeklyPrep.days || [],
  } : null

  return {
    lines: buildSmartShoppingList(stock, extras, shoppingMode).map(l => ({
      name: l.name,
      category: l.category,
      unit: l.unit,
      qty: l.qty || l.deficit,
      stockId: l.stockId || null,
      source: l.source,
      barcode: l.barcode || '',
    })),
    weeklyPrep: prepSummary,
    ts: Date.now(),
  }
}
