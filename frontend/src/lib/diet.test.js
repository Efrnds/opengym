import { describe, it, expect } from 'vitest'
import {
  ensureDiet, completeMeal, undoMeal, toggleMeal, addWater, addBurned, addExtraFood,
  setWater, waterCupPlan, buildShoppingList, bumpStock, markBought, normalizeTime,
  remainingKcal, estimateWorkoutKcal, shoppingChannel, cookWeeklyBatch, WATER_STEP_ML,
} from './diet.js'
import {
  recipeMacros, deductRecipeFromStock, restoreRecipeToStock,
  normalizeWeeklyPrep, suggestWeeklyPortions,
} from './recipes.js'
import {
  buildSmartShoppingList, applyPurchase, mergeShoppingLists, normalizeStockItem,
} from './shopping.js'
import { _mapProductForTest, _searchCommonsForTest, scaleNutrition, fetchFoodNutrition } from './nutrition-api.js'
import { estimateResistanceKcal, estimateSessionKcal } from './workout-model.js'

function blank() {
  return ensureDiet({
    workouts: [], routines: [], bodyweight: [], meals: [], dayBlocks: [],
    stock: [], mealPreps: [], recipes: [], weeklyMealPrep: [], shoppingExtras: [],
    dietLogs: {}, vaultChecks: [], unit: 'kg',
  })
}

describe('diet', () => {
  it('normalizes clock times', () => {
    expect(normalizeTime('8:00')).toBe('08:00')
    expect(normalizeTime('12h30')).toBe('12:30')
    expect(normalizeTime('16.00')).toBe('16:00')
    expect(normalizeTime('20:00:00')).toBe('20:00')
    expect(normalizeTime('')).toBe(null)
  })

  it('completes a meal and undoes kcal', () => {
    const S = blank()
    S.meals = [{ id: 'm1', name: 'Breakfast', calories: 400, protein: 30, carbs: 10, fats: 5, isMarmita: false }]
    expect(completeMeal(S, 'm1', '2026-08-31')).toEqual({ ok: true })
    expect(S.dietLogs['2026-08-31'].kcal).toBe(400)
    expect(undoMeal(S, 'm1', '2026-08-31').undone).toBe(true)
    expect(S.dietLogs['2026-08-31'].kcal).toBe(0)
  })

  it('debits linked stock on complete and restores on undo', () => {
    const S = blank()
    S.stock = [normalizeStockItem({ id: 'egg', name: 'Eggs', currentQty: 10, unit: 'un', calories: 70 })]
    S.meals = [{
      id: 'm1', name: 'Omelette', calories: 200, protein: 20, carbs: 0, fats: 10,
      ingredients: [{ stockId: 'egg', qty: 2, unit: 'un' }],
    }]
    completeMeal(S, 'm1', '2026-08-31')
    expect(S.stock[0].currentQty).toBe(8)
    undoMeal(S, 'm1', '2026-08-31')
    expect(S.stock[0].currentQty).toBe(10)
  })

  it('still logs a meal-prep slot when the freezer is empty', () => {
    const S = blank()
    S.meals = [{ id: 'm2', name: 'Lunch', calories: 500, protein: 50, carbs: 40, fats: 14, isMarmita: true }]
    S.mealPreps = [{ id: 'p1', isActive: true, currentPortions: 0, totalPortions: 10 }]
    expect(completeMeal(S, 'm2', '2026-08-31').ok).toBe(true)
    expect(S.dietLogs['2026-08-31'].kcal).toBe(500)
    expect(S.mealPreps[0].currentPortions).toBe(0)
  })

  it('debits the freezer when portions remain', () => {
    const S = blank()
    S.meals = [{ id: 'm2', name: 'Lunch', calories: 500, protein: 50, carbs: 0, fats: 0, isMarmita: true }]
    S.mealPreps = [{ id: 'p1', isActive: true, currentPortions: 3, totalPortions: 10 }]
    expect(completeMeal(S, 'm2', '2026-08-31').ok).toBe(true)
    expect(S.mealPreps[0].currentPortions).toBe(2)
    undoMeal(S, 'm2', '2026-08-31')
    expect(S.mealPreps[0].currentPortions).toBe(3)
  })

  it('uses weekly prep when freezer is empty and restores the same source on undo', () => {
    const S = blank()
    S.stock = [normalizeStockItem({ id: 'rice', name: 'Rice', currentQty: 1000, unit: 'g', calories: 1 })]
    S.recipes = [{ id: 'r1', name: 'Bowl', portions: 2, ingredients: [{ stockId: 'rice', qty: 200, unit: 'g' }] }]
    S.weeklyMealPrep = [{
      id: 'w1', recipeId: 'r1', name: 'Week', days: [1], // Mon = 2026-08-31
      totalPortions: 4, currentPortions: 4, kind: 'DAILY', isActive: true,
    }]
    S.mealPreps = [{ id: 'p1', isActive: true, currentPortions: 0, totalPortions: 10 }]
    S.meals = [{ id: 'm2', name: 'Lunch', calories: 500, protein: 0, carbs: 0, fats: 0, isMarmita: true }]
    completeMeal(S, 'm2', '2026-08-31')
    expect(S.weeklyMealPrep[0].currentPortions).toBe(3)
    expect(S.mealPreps[0].currentPortions).toBe(0)
    expect(S.stock[0].currentQty).toBe(900) // DAILY: 200g / 2 portions = 100g
    expect(S.dietLogs['2026-08-31'].marmitaMoves.m2.source).toBe('weekly')
    undoMeal(S, 'm2', '2026-08-31')
    expect(S.weeklyMealPrep[0].currentPortions).toBe(4)
    expect(S.mealPreps[0].currentPortions).toBe(0)
    expect(S.stock[0].currentQty).toBe(1000)
  })

  it('BATCH weekly prep deducts pantry once on cook, not again on eat', () => {
    const S = blank()
    S.stock = [normalizeStockItem({ id: 'rice', name: 'Rice', currentQty: 2000, unit: 'g' })]
    S.recipes = [{ id: 'r1', name: 'Bowl', portions: 2, ingredients: [{ stockId: 'rice', qty: 200, unit: 'g' }] }]
    const prep = {
      id: 'w1', recipeId: 'r1', name: 'Week', days: [1],
      totalPortions: 4, currentPortions: 4, kind: 'BATCH', isActive: true,
    }
    S.weeklyMealPrep = [prep]
    cookWeeklyBatch(S, prep)
    // 4 portions × (200g / 2 recipe portions) = 400g
    expect(S.stock[0].currentQty).toBe(1600)
    S.meals = [{ id: 'm2', name: 'Lunch', calories: 500, protein: 0, carbs: 0, fats: 0, isMarmita: true }]
    completeMeal(S, 'm2', '2026-08-31')
    expect(S.weeklyMealPrep[0].currentPortions).toBe(3)
    expect(S.stock[0].currentQty).toBe(1600)
    undoMeal(S, 'm2', '2026-08-31')
    expect(S.weeklyMealPrep[0].currentPortions).toBe(4)
    expect(S.stock[0].currentQty).toBe(1600)
  })

  it('calculates suggested portions and debits for 2 people (household)', () => {
    expect(suggestWeeklyPortions([1, 2, 3, 4, 5], 2)).toBe(10)
    expect(suggestWeeklyPortions(3, 2)).toBe(6)

    const S = blank()
    S.stock = [normalizeStockItem({ id: 'chicken', name: 'Chicken', currentQty: 2000, unit: 'g' })]
    S.recipes = [{ id: 'r1', name: 'Meal', portions: 2, ingredients: [{ stockId: 'chicken', qty: 300, unit: 'g' }] }]
    const prep = normalizeWeeklyPrep({
      id: 'w2', recipeId: 'r1', name: 'Couple Prep', days: [1, 2, 3, 4, 5],
      peopleCount: 2, totalPortions: 10, currentPortions: 10, kind: 'BATCH', isActive: true,
    })
    expect(prep.peopleCount).toBe(2)
    expect(prep.totalPortions).toBe(10)
    S.weeklyMealPrep = [prep]

    cookWeeklyBatch(S, prep)
    // 10 portions × (300g / 2 portions) = 1500g consumed on batch cook
    expect(S.stock[0].currentQty).toBe(500)

    S.meals = [{ id: 'm_couple', name: 'Couple Lunch', isMarmita: true }]
    completeMeal(S, 'm_couple', '2026-08-31')
    // Each person logs their own meal: debits 1 portion
    expect(S.weeklyMealPrep[0].currentPortions).toBe(9)

    undoMeal(S, 'm_couple', '2026-08-31')
    expect(S.weeklyMealPrep[0].currentPortions).toBe(10)
  })

  it('builds a shopping list from deficits', () => {
    const list = buildShoppingList([
      { id: '1', name: 'Eggs', category: 'PROTEIN', currentQty: 8, minAlertQty: 12, unit: 'un', costPerUnit: 1 },
      { id: '2', name: 'Rice', category: 'CARB', currentQty: 2, minAlertQty: 1, unit: 'kg', costPerUnit: 6 },
      { id: '3', name: 'Banana', category: 'FRUIT', currentQty: 3, minAlertQty: 8, unit: 'un', costPerUnit: 0.7 },
    ])
    expect(list.map(l => l.name)).toEqual(['Banana', 'Eggs'])
    expect(shoppingChannel('FRUIT')).toBe('FAIR')
  })

  it('respects the global shopping-list mode', () => {
    const stock = [
      { id: '1', name: 'Eggs', currentQty: 1, minAlertQty: 12, unit: 'un' },
      { id: '2', name: 'Rice', currentQty: 0, minAlertQty: 1, unit: 'kg' },
    ]
    expect(buildSmartShoppingList(stock, [], true).map(l => l.name).sort()).toEqual(['Eggs', 'Rice'])
    expect(buildSmartShoppingList(stock, [], false)).toEqual([])
    expect(buildSmartShoppingList(stock, [{ id: 'x', name: 'Banana', qty: 3 }], false).map(l => l.name)).toEqual(['Banana'])
  })

  it('restocks to the minimum when marked bought', () => {
    const next = markBought(
      [{ id: '1', name: 'Eggs', currentQty: 8, minAlertQty: 12 }],
      '1',
    )
    expect(next[0].currentQty).toBe(12)
  })

  it('bumps stock without going negative', () => {
    const next = bumpStock([{ id: '1', currentQty: 0.2 }], '1', -1)
    expect(next[0].currentQty).toBe(0)
  })

  it('adds and subtracts water', () => {
    const S = blank()
    addWater(S, WATER_STEP_ML, '2026-08-31')
    addWater(S, WATER_STEP_ML, '2026-08-31')
    addWater(S, -WATER_STEP_ML, '2026-08-31')
    expect(S.dietLogs['2026-08-31'].water).toBe(WATER_STEP_ML)
  })

  it('tracks extra food against the remaining budget without adding burned kcal', () => {
    const S = blank()
    S.calorieTarget = 2000
    addExtraFood(S, { name: 'Coffee', calories: 50 }, '2026-08-31')
    addBurned(S, 100, '2026-08-31')
    S.workouts = [{ d: '2026-08-31', start: 0, end: 60 * 60 * 1000, vol: 5000, kcal: 420 }]
    expect(S.dietLogs['2026-08-31'].kcal).toBe(50)
    expect(S.dietLogs['2026-08-31'].burned).toBe(100)
    expect(estimateWorkoutKcal(S.workouts, '2026-08-31', S)).toBe(420)
    expect(remainingKcal(S, '2026-08-31')).toBe(1950)
  })

  it('fills water by the glass, not by adding burn to the eating budget', () => {
    const S = blank()
    S.waterTargetMl = 2000
    const plan = waterCupPlan(S)
    expect(plan.cups).toBe(8)
    setWater(S, plan.per * 3, '2026-08-31')
    expect(S.dietLogs['2026-08-31'].water).toBe(750)
  })

  it('toggle is idempotent in both directions', () => {
    const S = blank()
    S.meals = [{ id: 'm1', name: 'Breakfast', calories: 100, protein: 0, carbs: 0, fats: 0, isMarmita: false }]
    toggleMeal(S, 'm1', '2026-08-31')
    toggleMeal(S, 'm1', '2026-08-31')
    expect(S.dietLogs['2026-08-31'].meals).toEqual([])
  })
})

describe('recipes', () => {
  it('computes total and per-portion macros from stock nutrition', () => {
    const stock = [
      { id: 'c', name: 'Chicken', calories: 110, protein: 30, carbs: 0, fats: 3, unit: 'g' },
      { id: 'r', name: 'Rice', calories: 130, protein: 2.7, carbs: 28, fats: 0.3, unit: 'g' },
    ]
    const recipe = {
      portions: 4,
      ingredients: [
        { stockId: 'c', qty: 400, unit: 'g' },
        { stockId: 'r', qty: 300, unit: 'g' },
      ],
    }
    const m = recipeMacros(recipe, stock)
    // 400g * 110/100 = 440 kcal. 300g * 130/100 = 390 kcal. Total = 830 kcal.
    expect(m.total.calories).toBe(830)
    expect(m.perPortion.calories).toBe(Math.round(830 / 4))
  })

  it('deducts and restores recipe stock by portion', () => {
    const stock = [{ id: 'c', currentQty: 1000 }]
    const recipe = { portions: 4, ingredients: [{ stockId: 'c', qty: 400 }] }
    const after = deductRecipeFromStock(stock, recipe, 1)
    expect(after[0].currentQty).toBe(900)
    expect(restoreRecipeToStock(after, recipe, 1)[0].currentQty).toBe(1000)
  })

  it('calculates recipe macros accurately for gram and unit items', () => {
    const stock = [
      { id: 'rice', name: 'Arroz', currentQty: 2000, unit: 'g', calories: 130, protein: 2.7, carbs: 28, fats: 0.3 },
      { id: 'egg', name: 'Ovo', currentQty: 6, unit: 'un', calories: 70, protein: 6, carbs: 0.5, fats: 5 },
    ]
    const recipe = {
      name: 'Arroz com ovo',
      portions: 4,
      ingredients: [
        { stockId: 'rice', qty: 1000, unit: 'g' },
        { stockId: 'egg', qty: 4, unit: 'un' },
      ],
    }
    const macros = recipeMacros(recipe, stock)
    expect(macros.total.calories).toBe(1580)
    expect(macros.perPortion.calories).toBe(395)
    expect(macros.total.protein).toBe(51)
    expect(macros.perPortion.protein).toBe(12.75)
  })
})

describe('shopping', () => {
  it('applies purchase with total cost and averages unit cost', () => {
    const stock = [normalizeStockItem({ id: '1', name: 'Rice', currentQty: 1, costPerUnit: 6, unit: 'kg' })]
    const { stock: next, item } = applyPurchase(stock, { stockId: '1', qty: 1, cost: 8, costMode: 'total' })
    expect(item.currentQty).toBe(2)
    expect(item.costPerUnit).toBe(7)
    expect(next[0].costPerUnit).toBe(7)
  })

  it('creates a substitute item at purchase time', () => {
    const { stock, item } = applyPurchase([], {
      qty: 1.5,
      cost: 30,
      costMode: 'total',
      create: { name: 'Chicken', category: 'PROTEIN', unit: 'kg' },
    })
    expect(stock).toHaveLength(1)
    expect(item.name).toBe('Chicken')
    expect(item.currentQty).toBe(1.5)
    expect(item.costPerUnit).toBe(20)
  })

  it('merges two household lists by name+unit', () => {
    const merged = mergeShoppingLists(
      [{ name: 'Eggs', unit: 'un', qty: 6, channel: 'MARKET' }],
      [{ name: 'eggs', unit: 'un', qty: 4, channel: 'MARKET' }, { name: 'Banana', unit: 'un', qty: 8, channel: 'FAIR' }],
    )
    expect(merged.find(l => /eggs/i.test(l.name)).qty).toBe(6)
    expect(merged.map(l => l.name.toLowerCase()).sort()).toEqual(['banana', 'eggs'])
  })

  it('restores channel from category when shared lines omit it', () => {
    const merged = mergeShoppingLists(
      [],
      [{ name: 'Arroz', unit: 'g', qty: 1, category: 'CARB' }],
    )
    expect(merged).toHaveLength(1)
    expect(merged[0].channel).toBe('MARKET')
    expect(merged[0].name).toBe('Arroz')
  })
})

describe('nutrition-api', () => {
  it('maps Open Food Facts products to macros', () => {
    const hit = _mapProductForTest({
      code: '1',
      product_name: 'Whey',
      nutriments: { 'energy-kcal_100g': 400, proteins_100g: 80, carbohydrates_100g: 5, fat_100g: 5 },
    })
    expect(hit.name).toBe('Whey')
    expect(hit.calories).toBe(400)
    expect(scaleNutrition(hit, 50).calories).toBe(200)
  })

  it('finds commons offline (accent-insensitive)', () => {
    const hits = _searchCommonsForTest('feijao')
    expect(hits.some(h => /feij[aã]o/i.test(h.name))).toBe(true)
    expect(_searchCommonsForTest('frango')[0]?.protein).toBeGreaterThan(20)
  })

  it('falls back to commons when API and OFF are empty', async () => {
    const fetchFn = async () => ({ ok: true, json: async () => ({ results: [], products: [] }) })
    const { results } = await fetchFoodNutrition('ovo', { fetch: fetchFn, apiBase: '' })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].source).toBe('local')
  })
})

describe('workout kcal', () => {
  it('scales resistance burn with duration and bodyweight', () => {
    const a = estimateResistanceKcal({ minutes: 60, weightKg: 70, volumeKg: 0, workSets: 0 })
    const b = estimateResistanceKcal({ minutes: 60, weightKg: 90, volumeKg: 0, workSets: 0 })
    expect(b).toBeGreaterThan(a)
    expect(a).toBeGreaterThan(300)
  })

  it('prefers stored kcal on the workout record', () => {
    expect(estimateSessionKcal({ start: 0, end: 3600000, kcal: 333 }, { weightKg: 70 })).toBe(333)
  })
})
