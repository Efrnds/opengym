import { uid } from './format.js'

const roundQty = value => Math.round(value * 100) / 100
const n = v => Math.max(0, Number(v) || 0)

export const PREP_KINDS = ['BATCH', 'DAILY']
export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0] // Mon…Sun (Date.getDay())

/** Normalize a recipe ingredient line. */
export function normalizeIngredient(row = {}) {
  return {
    stockId: row.stockId || null,
    name: String(row.name || '').trim(),
    qty: n(row.qty),
    unit: row.unit || 'g',
  }
}

export function normalizeRecipe(row = {}) {
  const portions = Math.max(1, Math.round(n(row.portions)) || 1)
  const ingredients = (Array.isArray(row.ingredients) ? row.ingredients : []).map(normalizeIngredient)
  return {
    id: row.id || uid(),
    name: String(row.name || '').trim() || 'Recipe',
    portions,
    ingredients,
    notes: row.notes || '',
  }
}

export function suggestWeeklyPortions(daysCount = 0, peopleCount = 1) {
  const days = Array.isArray(daysCount) ? daysCount.length : Math.max(0, Math.round(Number(daysCount) || 0))
  const people = Math.max(1, Math.round(Number(peopleCount) || 1))
  return days * people
}

export function normalizeWeeklyPrep(row = {}) {
  const total = Math.max(0, Math.round(n(row.totalPortions)))
  const left = Math.max(0, Math.min(total, Math.round(n(row.currentPortions != null ? row.currentPortions : total))))
  const days = Array.isArray(row.days)
    ? [...new Set(row.days.map(d => Number(d)).filter(d => d >= 0 && d <= 6))].sort((a, b) => a - b)
    : []
  const peopleCount = Math.max(1, Math.min(10, Math.round(n(row.peopleCount)) || 1))
  return {
    id: row.id || uid(),
    recipeId: row.recipeId || null,
    name: String(row.name || '').trim() || 'Meal prep',
    days,
    peopleCount,
    totalPortions: total,
    currentPortions: left,
    kind: row.kind === 'DAILY' ? 'DAILY' : 'BATCH',
    isActive: !!row.isActive,
    weekKey: row.weekKey || null,
  }
}

/**
 * Macros for a recipe from stock items (per-unit nutrition × qty).
 * Stock nutrition is per 1 unit of the item's unit (e.g. kcal per g if unit is g).
 */
export function recipeMacros(recipe, stock = []) {
  const byId = new Map((stock || []).map(s => [s.id, s]))
  let calories = 0, protein = 0, carbs = 0, fats = 0
  for (const line of (recipe?.ingredients || [])) {
    const item = line.stockId ? byId.get(line.stockId) : null
    const qty = n(line.qty)
    if (!item || qty <= 0) continue
    const unit = String(item.unit || line.unit || 'g').toLowerCase()
    let itemCal = n(item.calories)
    let itemProt = n(item.protein)
    let itemCarbs = n(item.carbs)
    let itemFats = n(item.fats)

    // Safeguard against unmigrated stock items
    if ((unit === 'g' || unit === 'ml') && itemCal > 0 && itemCal <= 5) {
      const name = String(item.name || '').toLowerCase()
      if (name.includes('arroz')) {
        itemCal = 130; itemProt = 2.7; itemCarbs = 28; itemFats = 0.3
      } else if (name.includes('feij')) {
        itemCal = 76; itemProt = 4.8; itemCarbs = 14; itemFats = 0.5
      } else if (name.includes('frango')) {
        itemCal = 165; itemProt = 31; itemCarbs = 0; itemFats = 3.6
      } else if (name.includes('patinho') || name.includes('carne')) {
        itemCal = 219; itemProt = 35.9; itemCarbs = 0; itemFats = 7.3
      } else {
        itemCal *= 100
        itemProt *= 100
        itemCarbs *= 100
        itemFats *= 100
      }
    }

    const factor = (unit === 'g' || unit === 'ml')
      ? (1 / 100)
      : (unit === 'kg' || unit === 'l')
        ? 10
        : 1
    calories += itemCal * qty * factor
    protein += itemProt * qty * factor
    carbs += itemCarbs * qty * factor
    fats += itemFats * qty * factor
  }
  const portions = Math.max(1, Math.round(n(recipe?.portions)) || 1)
  const total = {
    calories: Math.round(calories),
    protein: roundQty(protein),
    carbs: roundQty(carbs),
    fats: roundQty(fats),
  }
  return {
    total,
    perPortion: {
      calories: Math.round(total.calories / portions),
      protein: roundQty(total.protein / portions),
      carbs: roundQty(total.carbs / portions),
      fats: roundQty(total.fats / portions),
    },
    portions,
  }
}

/** Deduct one recipe's ingredients from stock (portionCount relative to recipe.portions). */
export function deductRecipeFromStock(stock, recipe, portionCount = 1) {
  if (!recipe) return stock || []
  const portions = Math.max(1, Math.round(n(recipe.portions)) || 1)
  const scale = n(portionCount) / portions
  let next = [...(stock || [])]
  for (const line of recipe.ingredients || []) {
    if (!line.stockId || !(line.qty > 0)) continue
    const delta = -roundQty(line.qty * scale)
    next = next.map(item => item.id !== line.stockId ? item : {
      ...item,
      currentQty: roundQty(Math.max(0, (item.currentQty || 0) + delta)),
    })
  }
  return next
}

/** Restore stock after undoing a prep cook / meal consume. */
export function restoreRecipeToStock(stock, recipe, portionCount = 1) {
  if (!recipe) return stock || []
  const portions = Math.max(1, Math.round(n(recipe.portions)) || 1)
  const scale = n(portionCount) / portions
  let next = [...(stock || [])]
  for (const line of recipe.ingredients || []) {
    if (!line.stockId || !(line.qty > 0)) continue
    const delta = roundQty(line.qty * scale)
    next = next.map(item => item.id !== line.stockId ? item : {
      ...item,
      currentQty: roundQty(Math.max(0, (item.currentQty || 0) + delta)),
    })
  }
  return next
}

/** Ingredient lines linked on a meal, scaled for one serving. */
export function mealIngredientNeeds(meal) {
  return (Array.isArray(meal?.ingredients) ? meal.ingredients : [])
    .filter(i => i && i.stockId && n(i.qty) > 0)
    .map(i => ({ stockId: i.stockId, qty: n(i.qty), unit: i.unit || 'g' }))
}

export function applyStockDeltas(stock, deltas, sign = -1) {
  let next = [...(stock || [])]
  for (const d of deltas || []) {
    if (!d.stockId || !(d.qty > 0)) continue
    const delta = roundQty(sign * d.qty)
    next = next.map(item => item.id !== d.stockId ? item : {
      ...item,
      currentQty: roundQty(Math.max(0, (item.currentQty || 0) + delta)),
    })
  }
  return next
}

/** Active weekly prep for today (by weekday), preferring ones with portions left. */
export function activeWeeklyPrep(S, date = new Date()) {
  const day = date instanceof Date ? date.getDay() : new Date(String(date) + 'T12:00:00').getDay()
  const list = S?.weeklyMealPrep || []
  if (!list.length) return null
  const match = list.filter(p => (p.days || []).includes(day))
  return match.find(p => p.isActive && p.currentPortions > 0)
    || match.find(p => p.currentPortions > 0)
    || match.find(p => p.isActive)
    || list.find(p => p.isActive && p.currentPortions > 0)
    || list.find(p => p.currentPortions > 0)
    || list.find(p => p.isActive)
    || list[0]
}
