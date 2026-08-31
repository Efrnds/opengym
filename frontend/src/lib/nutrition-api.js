/**
 * Food nutrition lookup: API proxy → Open Food Facts → local commons table.
 * Returns macros typically per 100 g.
 */

const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl'
const OFF_BR = 'https://br.openfoodfacts.org/cgi/search.pl'

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function pickNutriments(p) {
  const n = p?.nutriments || {}
  const calories = num(n['energy-kcal_100g']) || num(n['energy-kcal_serving']) || num(n['energy-kcal'])
  const protein = num(n.proteins_100g) || num(n.proteins_serving) || num(n.proteins)
  const carbs = num(n.carbohydrates_100g) || num(n.carbohydrates_serving) || num(n.carbohydrates)
  const fats = num(n.fat_100g) || num(n.fat_serving) || num(n.fat)
  return { calories, protein, carbs, fats }
}

function mapProduct(p) {
  if (!p || typeof p !== 'object') return null
  const name = p.product_name || p.product_name_pt || p.product_name_en || p.generic_name || ''
  if (!String(name).trim()) return null
  const macros = pickNutriments(p)
  if (!macros.calories && !macros.protein && !macros.carbs && !macros.fats) return null
  return {
    id: String(p.code || p._id || name),
    name: String(name).trim(),
    brand: String(p.brands || '').split(',')[0].trim(),
    unit: 'g',
    per: 100,
    source: 'off',
    ...macros,
  }
}

/** Common pantry staples (per 100 g) — works offline / when OFF is empty. */
export const FOOD_COMMONS = [
  { id: 'local:arroz', name: 'Arroz branco cozido', brand: '', calories: 130, protein: 2.7, carbs: 28, fats: 0.3, aliases: ['arroz', 'rice'] },
  { id: 'local:arroz-cru', name: 'Arroz branco cru', brand: '', calories: 360, protein: 7, carbs: 79, fats: 0.6, aliases: ['arroz cru'] },
  { id: 'local:arroz-integral', name: 'Arroz integral cozido', brand: '', calories: 124, protein: 2.6, carbs: 25.8, fats: 1, aliases: ['arroz integral'] },
  { id: 'local:feijao', name: 'Feijão carioca cozido', brand: '', calories: 76, protein: 4.8, carbs: 14, fats: 0.5, aliases: ['feijao', 'feijão', 'beans'] },
  { id: 'local:feijao-preto', name: 'Feijão preto cozido', brand: '', calories: 77, protein: 4.5, carbs: 14, fats: 0.5, aliases: ['feijao preto'] },
  { id: 'local:frango', name: 'Peito de frango grelhado', brand: '', calories: 165, protein: 31, carbs: 0, fats: 3.6, aliases: ['frango', 'chicken', 'peito'] },
  { id: 'local:patinho', name: 'Patinho bovino moído grelhado', brand: '', calories: 219, protein: 35.9, carbs: 0, fats: 7.3, aliases: ['patinho', 'carne moida', 'carne moída'] },
  { id: 'local:tilapia', name: 'Filé de tilápia grelhado', brand: '', calories: 128, protein: 26, carbs: 0, fats: 2.7, aliases: ['tilapia', 'tilápia', 'peixe'] },
  { id: 'local:ovo', name: 'Ovo de galinha inteiro cozido', brand: '', calories: 143, protein: 13, carbs: 0.7, fats: 9.5, aliases: ['ovo', 'egg', 'ovos'] },
  { id: 'local:clara', name: 'Clara de ovo cozida', brand: '', calories: 52, protein: 11, carbs: 0.7, fats: 0.2, aliases: ['clara de ovo'] },
  { id: 'local:banana', name: 'Banana prata', brand: '', calories: 89, protein: 1.1, carbs: 23, fats: 0.3, aliases: ['banana'] },
  { id: 'local:aveia', name: 'Aveia em flocos', brand: '', calories: 389, protein: 17, carbs: 66, fats: 7, aliases: ['aveia', 'oats'] },
  { id: 'local:batata', name: 'Batata inglesa cozida', brand: '', calories: 87, protein: 1.9, carbs: 20, fats: 0.1, aliases: ['batata', 'potato'] },
  { id: 'local:batata-doce', name: 'Batata-doce cozida', brand: '', calories: 86, protein: 1.6, carbs: 20, fats: 0.1, aliases: ['batata doce', 'sweet potato'] },
  { id: 'local:mandioca', name: 'Mandioca / Aipim cozido', brand: '', calories: 125, protein: 0.6, carbs: 30.1, fats: 0.3, aliases: ['mandioca', 'aipim', 'macaxeira'] },
  { id: 'local:cuscuz', name: 'Cuscuz de milho cozido', brand: '', calories: 112, protein: 2.2, carbs: 25.3, fats: 0.7, aliases: ['cuscuz'] },
  { id: 'local:tapioca', name: 'Massa de tapioca', brand: '', calories: 240, protein: 0, carbs: 60, fats: 0, aliases: ['tapioca'] },
  { id: 'local:leite', name: 'Leite integral', brand: '', calories: 61, protein: 3.2, carbs: 4.8, fats: 3.3, aliases: ['leite', 'milk'] },
  { id: 'local:whey', name: 'Whey protein (concentrado 80%)', brand: '', calories: 400, protein: 80, carbs: 5, fats: 5, aliases: ['whey', 'proteina'] },
  { id: 'local:carne', name: 'Carne bovina magra grelhada', brand: '', calories: 250, protein: 26, carbs: 0, fats: 15, aliases: ['carne', 'beef'] },
  { id: 'local:pao', name: 'Pão francês', brand: '', calories: 300, protein: 8, carbs: 58, fats: 3.1, aliases: ['pao', 'pão', 'bread'] },
  { id: 'local:azeite', name: 'Azeite de oliva extra virgem', brand: '', calories: 884, protein: 0, carbs: 0, fats: 100, aliases: ['azeite', 'olive oil'] },
  { id: 'local:iogurte', name: 'Iogurte natural desnatado', brand: '', calories: 43, protein: 3.8, carbs: 5.8, fats: 0.3, aliases: ['iogurte', 'yogurt'] },
  { id: 'local:maca', name: 'Maçã', brand: '', calories: 52, protein: 0.3, carbs: 14, fats: 0.2, aliases: ['maca', 'maçã', 'apple'] },
  { id: 'local:pasta', name: 'Macarrão cozido', brand: '', calories: 131, protein: 5, carbs: 25, fats: 1.1, aliases: ['macarrao', 'macarrão', 'pasta'] },
  { id: 'local:brocolis', name: 'Brócolis cozido', brand: '', calories: 35, protein: 2.4, carbs: 7.2, fats: 0.4, aliases: ['brocolis', 'brócolis'] },
  { id: 'local:atum', name: 'Atum em conserva (ao natural)', brand: '', calories: 116, protein: 26, carbs: 0, fats: 1, aliases: ['atum', 'tuna'] },
].map(row => ({ ...row, unit: 'g', per: 100, source: 'local' }))

function searchCommons(query, limit = 8) {
  const q = String(query || '').trim().toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '')
  if (q.length < 2) return []
  const scored = []
  for (const food of FOOD_COMMONS) {
    const hay = [food.name, ...(food.aliases || [])].join(' ')
      .toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    if (!hay.includes(q) && !q.split(/\s+/).every(part => hay.includes(part))) continue
    scored.push(food)
  }
  return scored.slice(0, limit).map(({ aliases, ...rest }) => rest)
}

async function searchOff(fetchFn, base, query, limit, signal) {
  const url = `${base}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=code,product_name,product_name_pt,product_name_en,generic_name,brands,nutriments`
  const res = await fetchFn(url, {
    signal,
    headers: {
      Accept: 'application/json',
      // OFF asks for a contactable UA; without it some edges return empty/403.
      'User-Agent': 'openGym/1.2 (nutrition lookup; self-hosted)',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const products = Array.isArray(data?.products) ? data.products : []
  return products.map(mapProduct).filter(Boolean)
}

/**
 * @param {string} query
 * @param {{ fetch?: typeof fetch, signal?: AbortSignal, limit?: number, apiBase?: string }} [opts]
 */
export async function fetchFoodNutrition(query, opts = {}) {
  const q = String(query || '').trim()
  if (q.length < 2) return { results: [], error: 'query too short' }

  const fetchFn = opts.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null)
  if (!fetchFn) return { results: searchCommons(q, opts.limit), error: 'fetch unavailable' }

  const limit = Math.min(20, Math.max(1, opts.limit || 10))

  // Prefer same-origin API proxy (no CORS, server can set UA).
  if (opts.apiBase !== null) {
    try {
      const base = opts.apiBase ?? ''
      const res = await fetchFn(`${base}/api/nutrition/search?q=${encodeURIComponent(q)}&limit=${limit}`, {
        signal: opts.signal,
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        const results = Array.isArray(data?.results) ? data.results : []
        if (results.length) return { results: results.slice(0, limit) }
      }
    } catch { /* fall through */ }
  }

  let results = []
  let error
  for (const base of [OFF_BR, OFF_SEARCH]) {
    try {
      results = await searchOff(fetchFn, base, q, limit, opts.signal)
      if (results.length) break
    } catch (e) {
      if (e?.name === 'AbortError') return { results: [], error: 'aborted' }
      error = e?.message || 'network error'
    }
  }

  if (!results.length) {
    const local = searchCommons(q, limit)
    if (local.length) return { results: local, source: 'local' }
  }

  return { results, error: results.length ? undefined : error }
}

/** Lookup one product by EAN/UPC via API proxy, then direct OFF. */
export async function fetchFoodByBarcode(code, opts = {}) {
  const barcode = String(code || '').replace(/\D/g, '')
  if (barcode.length < 8) return { results: [], error: 'invalid barcode' }

  const fetchFn = opts.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null)
  if (!fetchFn) return { results: [], error: 'fetch unavailable' }

  if (opts.apiBase !== null) {
    try {
      const base = opts.apiBase ?? ''
      const res = await fetchFn(`${base}/api/nutrition/barcode?code=${encodeURIComponent(barcode)}`, {
        signal: opts.signal,
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        const results = Array.isArray(data?.results) ? data.results : []
        if (results.length) {
          const hit = results[0]
          if (hit.calories === 0 && hit.protein === 0 && hit.carbs === 0 && hit.fats === 0 && hit.name) {
            try {
              const nameRes = await fetchFoodNutrition(hit.name, { fetch: fetchFn, apiBase: opts.apiBase, signal: opts.signal, limit: 1 })
              if (nameRes?.results?.[0]) {
                const nut = nameRes.results[0]
                return {
                  results: [{
                    ...hit,
                    calories: nut.calories,
                    protein: nut.protein,
                    carbs: nut.carbs,
                    fats: nut.fats,
                  }],
                }
              }
            } catch { /* fall through */ }
          }
          return { results }
        }
      }
    } catch { /* fall through */ }
  }

  let error
  for (const host of ['https://br.openfoodfacts.org', 'https://world.openfoodfacts.org']) {
    try {
      const res = await fetchFn(`${host}/api/v2/product/${barcode}?fields=code,product_name,product_name_pt,product_name_en,generic_name,brands,nutriments`, {
        signal: opts.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'openGym/1.2 (nutrition lookup; self-hosted)',
        },
      })
      if (!res.ok) { error = `HTTP ${res.status}`; continue }
      const data = await res.json()
      const hit = data?.product ? mapProduct({ ...data.product, code: barcode }) : null
      if (hit) return { results: [hit], source: 'off' }
      error = 'not found'
    } catch (e) {
      if (e?.name === 'AbortError') return { results: [], error: 'aborted' }
      error = e?.message || 'network error'
    }
  }
  return { results: [], error: error || 'not found' }
}

/** Scale per-100g macros to qty in grams. */
export function scaleNutrition(hit, grams) {
  const g = Math.max(0, Number(grams) || 0)
  const per = Math.max(1, Number(hit?.per) || 100)
  const f = g / per
  return {
    calories: Math.round((hit?.calories || 0) * f),
    protein: Math.round((hit?.protein || 0) * f * 10) / 10,
    carbs: Math.round((hit?.carbs || 0) * f * 10) / 10,
    fats: Math.round((hit?.fats || 0) * f * 10) / 10,
  }
}

export { mapProduct as _mapProductForTest, pickNutriments as _pickNutrimentsForTest, searchCommons as _searchCommonsForTest }
