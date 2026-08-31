import { todayISO, uid } from './format.js'
import { normalizeStockItem, buildSmartShoppingList } from './shopping.js'
import {
  mealIngredientNeeds, applyStockDeltas, activeWeeklyPrep,
  normalizeRecipe, normalizeWeeklyPrep,
  deductRecipeFromStock, restoreRecipeToStock,
} from './recipes.js'
import { estimateSessionKcal, workoutDurationMin } from './workout-model.js'

export { workoutDurationMin }
import { bodyweightKg } from './cardio.js'
import { LB_TO_KG } from './recovery.js'

export const WATER_STEP_ML = 250
export const STOCK_UNITS = ['g', 'kg', 'un', 'ml', 'L']

export const CATEGORIES = ['PROTEIN', 'CARB', 'DAIRY', 'VEGETABLE', 'FRUIT', 'SUPPLEMENT', 'PANTRY']
export const CATEGORY_LABEL = {
  PROTEIN: 'Protein',
  CARB: 'Carb',
  DAIRY: 'Dairy',
  VEGETABLE: 'Vegetable',
  FRUIT: 'Fruit',
  SUPPLEMENT: 'Supplement',
  PANTRY: 'Pantry',
}

export const ROUTINE_KINDS = ['WORK', 'TRAINING', 'THERAPY', 'OTHER']
export const ROUTINE_KIND_LABEL = {
  WORK: 'Work',
  TRAINING: 'Training',
  THERAPY: 'Study / therapy',
  OTHER: 'Other',
}

const FAIR = new Set(['VEGETABLE', 'FRUIT'])

export function shoppingChannel(category) {
  return FAIR.has(category) ? 'FAIR' : 'MARKET'
}

export function roundQty(value) {
  return Math.round(value * 100) / 100
}

export function parseMinutes(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function nowMinutes(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes()
}

/** Accepts 8:00, 08:00, 8h00, 08.00, 08:00:00 → HH:MM, or null. */
export function normalizeTime(value) {
  const s = String(value || '').trim()
  const m = s.match(/^(\d{1,2})\s*[:hH.]\s*(\d{2})/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0')
}

export function emptyLog() {
  return {
    meals: [], extras: [], water: 0, kcal: 0, protein: 0, carbs: 0, fats: 0, burned: 0,
    stockMoves: {},
    marmitaMoves: {},
  }
}

export function ensureDiet(S) {
  if (S.calorieTarget == null) S.calorieTarget = 0
  if (S.proteinTarget == null) S.proteinTarget = 0
  if (S.carbsTarget == null) S.carbsTarget = 0
  if (S.fatsTarget == null) S.fatsTarget = 0
  if (S.waterTargetMl == null) S.waterTargetMl = 0
  if (typeof S.useShoppingList !== 'boolean') S.useShoppingList = true
  if (!Array.isArray(S.meals)) S.meals = []
  if (!Array.isArray(S.dayBlocks)) S.dayBlocks = []
  if (!Array.isArray(S.stock)) S.stock = []
  else S.stock = S.stock.map(normalizeStockItem)
  if (!Array.isArray(S.mealPreps)) S.mealPreps = []
  if (!Array.isArray(S.recipes)) S.recipes = []
  else S.recipes = S.recipes.map(normalizeRecipe)
  if (!Array.isArray(S.weeklyMealPrep)) S.weeklyMealPrep = []
  else S.weeklyMealPrep = S.weeklyMealPrep.map(normalizeWeeklyPrep)
  if (!Array.isArray(S.shoppingExtras)) S.shoppingExtras = []
  if (!S.dietLogs || typeof S.dietLogs !== 'object') S.dietLogs = {}
  if (!Array.isArray(S.vaultChecks)) S.vaultChecks = []
  if (!S.shoppingShare || typeof S.shoppingShare !== 'object') {
    S.shoppingShare = {
      code: null, pairedCode: null, role: null, members: 0, paired: false, partnerName: null,
      guestPerms: { canAdd: true, canEdit: true, canRemove: true, canPurchase: true },
    }
  } else {
    if (!('role' in S.shoppingShare)) S.shoppingShare.role = null
    if (!('members' in S.shoppingShare)) S.shoppingShare.members = 0
    if (!('paired' in S.shoppingShare)) S.shoppingShare.paired = (S.shoppingShare.members || 0) >= 2
    if (!('partnerName' in S.shoppingShare)) S.shoppingShare.partnerName = null
    if (!S.shoppingShare.guestPerms || typeof S.shoppingShare.guestPerms !== 'object') {
      S.shoppingShare.guestPerms = { canAdd: true, canEdit: true, canRemove: true, canPurchase: true }
    }
  }
  S.meals = S.meals.map(m => ({
    ...m,
    ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
  }))
  return S
}

export function logOf(S, date = todayISO()) {
  ensureDiet(S)
  const log = S.dietLogs[date]
  if (!log) return emptyLog()
  return {
    ...emptyLog(),
    ...log,
    meals: log.meals || [],
    extras: log.extras || [],
    stockMoves: log.stockMoves && typeof log.stockMoves === 'object' ? log.stockMoves : {},
  }
}

function writeLog(S, date, log) {
  S.dietLogs[date] = log
}

export function activePrep(S) {
  ensureDiet(S)
  return S.mealPreps.find(p => p.isActive && p.currentPortions > 0) || S.mealPreps.find(p => p.isActive) || null
}

export function mergeTimeline(meals, blocks) {
  const items = [
    ...(meals || []).map(m => ({
      id: m.id, title: m.name, startTime: m.time, endTime: null,
      kind: 'MEAL', mealId: m.id, isMarmita: !!m.isMarmita,
    })),
    ...(blocks || []).map(b => ({
      id: b.id, title: b.title, startTime: b.startTime, endTime: b.endTime || null,
      kind: b.kind || 'OTHER',
    })),
  ]
  return items.sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime))
}

/** Prefer buildSmartShoppingList; kept for older call sites. */
export function buildShoppingList(stock, extras, shoppingMode = true) {
  if (extras !== undefined) return buildSmartShoppingList(stock, extras, shoppingMode)
  return buildSmartShoppingList(stock, [], shoppingMode).map(l => ({
    id: l.id,
    name: l.name,
    category: l.category,
    channel: l.channel,
    unit: l.unit,
    deficit: l.deficit,
    cost: l.cost,
    currentQty: l.currentQty,
    minAlertQty: l.minAlertQty,
  }))
}

export function bumpStock(stock, id, delta) {
  return (stock || []).map(item => item.id !== id ? item : {
    ...item,
    currentQty: roundQty(Math.max(0, (item.currentQty || 0) + delta)),
  })
}

export function markBought(stock, id) {
  return (stock || []).map(item => {
    if (item.id !== id) return item
    const min = item.minAlertQty || 0
    return { ...item, currentQty: roundQty(Math.max(item.currentQty || 0, min)) }
  })
}

function debitMealStock(S, meal, log, mealId, date = todayISO()) {
  let needs = mealIngredientNeeds(meal)
  if (!needs.length) {
    const rec = (S.recipes || []).find(r => r.id === meal.recipeId || (meal.name && r.name.toLowerCase() === meal.name.toLowerCase()))
    if (rec && rec.ingredients?.length) {
      const portions = Math.max(1, Number(rec.portions) || 1)
      needs = rec.ingredients.filter(i => i.stockId && i.qty > 0).map(i => ({
        stockId: i.stockId,
        qty: roundQty(Number(i.qty) / portions),
        unit: i.unit || 'g',
      }))
    }
  }
  if (!needs.length) return
  S.stock = applyStockDeltas(S.stock, needs, -1)
  log.stockMoves = { ...(log.stockMoves || {}), [mealId]: needs }
}

function creditMealStock(S, log, mealId) {
  const moves = log.stockMoves?.[mealId]
  if (!moves?.length) return
  S.stock = applyStockDeltas(S.stock, moves, +1)
  const next = { ...(log.stockMoves || {}) }
  delete next[mealId]
  log.stockMoves = next
}

function debitWeeklyPrep(S, date, portions = null) {
  const prep = activeWeeklyPrep(S, date)
  if (!prep || !(prep.currentPortions > 0)) return null
  const take = portions != null
    ? Math.max(1, Math.min(prep.currentPortions, Math.round(Number(portions)) || 1))
    : 1
  prep.currentPortions -= take
  // BATCH stock was taken when the cook was logged; DAILY cooks on the eat day.
  if (prep.kind !== 'BATCH' && prep.recipeId) {
    const recipe = (S.recipes || []).find(r => r.id === prep.recipeId)
    if (recipe) S.stock = deductRecipeFromStock(S.stock, recipe, take)
  }
  return { source: 'weekly', prepId: prep.id, kind: prep.kind || 'BATCH', portions: take }
}

function creditWeeklyPrep(S, move) {
  const prep = (S.weeklyMealPrep || []).find(p => p.id === move?.prepId) || activeWeeklyPrep(S)
  if (!prep) return
  const portions = move?.portions || 1
  prep.currentPortions = Math.min(
    prep.totalPortions || prep.currentPortions + portions,
    (prep.currentPortions || 0) + portions,
  )
  const kind = move?.kind || prep.kind || 'BATCH'
  if (kind !== 'BATCH' && prep.recipeId) {
    const recipe = (S.recipes || []).find(r => r.id === prep.recipeId)
    if (recipe) S.stock = restoreRecipeToStock(S.stock, recipe, portions)
  }
}

function debitMarmita(S, date, portions = null) {
  const freezer = activePrep(S)
  if (freezer && freezer.currentPortions > 0) {
    const take = portions != null
      ? Math.max(1, Math.min(freezer.currentPortions, Math.round(Number(portions)) || 1))
      : 1
    freezer.currentPortions -= take
    return { source: 'freezer', prepId: freezer.id, portions: take }
  }
  return debitWeeklyPrep(S, date, portions)
}

function creditMarmita(S, move, date) {
  if (!move) {
    // Legacy logs without marmitaMoves: prefer reversing weekly if freezer is empty.
    const freezer = S.mealPreps?.find(p => p.isActive) || S.mealPreps?.[0]
    if (freezer && (freezer.currentPortions || 0) < (freezer.totalPortions || Infinity)) {
      freezer.currentPortions = Math.min(
        freezer.totalPortions || freezer.currentPortions + 1,
        (freezer.currentPortions || 0) + 1,
      )
      return
    }
    creditWeeklyPrep(S, { prepId: activeWeeklyPrep(S, date)?.id, portions: 1 })
    return
  }
  if (move.source === 'freezer') {
    const prep = (S.mealPreps || []).find(p => p.id === move.prepId)
    if (!prep) return
    const portions = move.portions || 1
    prep.currentPortions = Math.min(
      prep.totalPortions || prep.currentPortions + portions,
      (prep.currentPortions || 0) + portions,
    )
    return
  }
  creditWeeklyPrep(S, move)
}

/** When a BATCH weekly prep is first cooked, pull the full recipe from stock once. */
export function cookWeeklyBatch(S, prep) {
  ensureDiet(S)
  if (!prep || prep.kind !== 'BATCH' || !prep.recipeId) return
  const recipe = (S.recipes || []).find(r => r.id === prep.recipeId)
  if (!recipe) return
  const portions = Math.max(0, prep.totalPortions || 0)
  if (portions > 0) S.stock = deductRecipeFromStock(S.stock, recipe, portions)
}

export function completeMeal(S, mealId, date = todayISO()) {
  ensureDiet(S)
  const meal = S.meals.find(m => m.id === mealId)
  if (!meal) return { error: 'Meal not found' }
  const log = { ...emptyLog(), ...(S.dietLogs[date] || {}) }
  log.meals = [...(log.meals || [])]
  log.stockMoves = { ...(log.stockMoves || {}) }
  log.marmitaMoves = { ...(log.marmitaMoves || {}) }
  if (log.meals.includes(mealId)) return { ok: true, already: true }
  
  const isMarmita = meal.isMarmita || meal.recipeId || (activeWeeklyPrep(S, date) && (meal.name || '').toLowerCase().includes('marmita'))
  if (isMarmita) {
    const move = debitMarmita(S, date)
    if (move) log.marmitaMoves[mealId] = move
  }
  debitMealStock(S, meal, log, mealId, date)
  log.meals.push(mealId)
  log.kcal += meal.calories || 0
  log.protein += meal.protein || 0
  log.carbs += meal.carbs || 0
  log.fats += meal.fats || 0
  writeLog(S, date, log)
  return { ok: true }
}

export function undoMeal(S, mealId, date = todayISO()) {
  ensureDiet(S)
  const meal = S.meals.find(m => m.id === mealId)
  if (!meal) return { error: 'Meal not found' }
  const log = { ...emptyLog(), ...(S.dietLogs[date] || {}) }
  log.stockMoves = { ...(log.stockMoves || {}) }
  log.marmitaMoves = { ...(log.marmitaMoves || {}) }
  if (!(log.meals || []).includes(mealId)) return { ok: true, already: true }
  log.meals = log.meals.filter(id => id !== mealId)
  log.kcal = Math.max(0, (log.kcal || 0) - (meal.calories || 0))
  log.protein = Math.max(0, (log.protein || 0) - (meal.protein || 0))
  log.carbs = Math.max(0, (log.carbs || 0) - (meal.carbs || 0))
  log.fats = Math.max(0, (log.fats || 0) - (meal.fats || 0))
  creditMealStock(S, log, mealId)
  if (meal.isMarmita) {
    const move = log.marmitaMoves[mealId]
    creditMarmita(S, move, date)
    delete log.marmitaMoves[mealId]
  }
  writeLog(S, date, log)
  return { ok: true, undone: true }
}

export function toggleMeal(S, mealId, date = todayISO()) {
  const log = logOf(S, date)
  return (log.meals || []).includes(mealId) ? undoMeal(S, mealId, date) : completeMeal(S, mealId, date)
}

export function addExtraFood(S, food, date = todayISO()) {
  ensureDiet(S)
  const log = { ...emptyLog(), ...(S.dietLogs[date] || {}) }
  const row = {
    id: food.id || uid(),
    name: food.name || 'Extra',
    calories: food.calories || 0,
    protein: food.protein || 0,
    carbs: food.carbs || 0,
    fats: food.fats || 0,
  }
  log.extras = [...(log.extras || []), row]
  log.kcal += row.calories
  log.protein += row.protein
  log.carbs += row.carbs
  log.fats += row.fats
  writeLog(S, date, log)
  return row
}

export function removeExtraFood(S, extraId, date = todayISO()) {
  ensureDiet(S)
  const log = { ...emptyLog(), ...(S.dietLogs[date] || {}) }
  const row = (log.extras || []).find(x => x.id === extraId)
  if (!row) return
  log.extras = log.extras.filter(x => x.id !== extraId)
  log.kcal = Math.max(0, (log.kcal || 0) - (row.calories || 0))
  log.protein = Math.max(0, (log.protein || 0) - (row.protein || 0))
  log.carbs = Math.max(0, (log.carbs || 0) - (row.carbs || 0))
  log.fats = Math.max(0, (log.fats || 0) - (row.fats || 0))
  writeLog(S, date, log)
}

export function addWater(S, ml = WATER_STEP_ML, date = todayISO()) {
  ensureDiet(S)
  const log = { ...emptyLog(), ...(S.dietLogs[date] || {}) }
  log.water = Math.max(0, (log.water || 0) + ml)
  writeLog(S, date, log)
}

export function setWater(S, ml, date = todayISO()) {
  ensureDiet(S)
  const log = { ...emptyLog(), ...(S.dietLogs[date] || {}) }
  log.water = Math.max(0, Math.round(ml))
  writeLog(S, date, log)
}

/** How many glasses to draw, and ml per glass. Caps at 12 so a 5 L target still fits. */
export function waterCupPlan(S) {
  const target = S.waterTargetMl > 0 ? S.waterTargetMl : 8 * WATER_STEP_ML
  const cups = Math.max(4, Math.min(12, Math.round(target / WATER_STEP_ML) || 8))
  return { cups, per: target / cups, target }
}

export function addBurned(S, kcal = 50, date = todayISO()) {
  ensureDiet(S)
  const log = { ...emptyLog(), ...(S.dietLogs[date] || {}) }
  log.burned = Math.max(0, (log.burned || 0) + kcal)
  writeLog(S, date, log)
}

export function workoutMinutes(w) {
  return workoutDurationMin(w)
}

/**
 * Dynamic workout burn for a calendar day.
 * Uses stored w.kcal when present; otherwise duration + BW + volume.
 */
export function estimateWorkoutKcal(workouts, date, S = null) {
  const kg = S ? (bodyweightKg(S) || 70) : 70
  return (workouts || [])
    .filter(w => w.d === date)
    .reduce((n, w) => {
      let volKg = Number(w.vol) || 0
      if (S?.unit === 'lb' && volKg) volKg *= LB_TO_KG
      return n + estimateSessionKcal(w, { weightKg: kg, volumeKg: volKg })
    }, 0)
}

/** Eating budget left — burned kcal is tracked separately and does not inflate this. */
export function remainingKcal(S, date = todayISO()) {
  if (!S.calorieTarget) return null
  return S.calorieTarget - (logOf(S, date).kcal || 0)
}

/** Chronological diet day summaries for History. */
export function dietHistoryDays(S, limit = 60) {
  ensureDiet(S)
  const dates = Object.keys(S.dietLogs || {}).sort().reverse().slice(0, limit)
  return dates.map(d => {
    const log = logOf(S, d)
    return {
      d,
      water: log.water || 0,
      kcal: Math.round(log.kcal || 0),
      protein: Math.round(log.protein || 0),
      carbs: Math.round(log.carbs || 0),
      fats: Math.round(log.fats || 0),
      burned: Math.round((log.burned || 0) + estimateWorkoutKcal(S.workouts, d, S)),
      meals: (log.meals || []).length,
      target: S.calorieTarget || 0,
    }
  })
}

export const QUICK_TIMES = ['07:00', '10:00', '12:30', '16:00', '20:00']
