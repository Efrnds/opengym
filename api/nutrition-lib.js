/* Shared nutrition search helpers (OFF + local commons) for the API proxy. */
const OFF = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_BR = 'https://br.openfoodfacts.org/cgi/search.pl';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function mapProduct(p) {
  if (!p || typeof p !== 'object') return null;
  const name = p.product_name || p.product_name_pt || p.product_name_en || p.generic_name || '';
  if (!String(name).trim()) return null;
  const n = p.nutriments || {};
  const calories = num(n['energy-kcal_100g']) || num(n['energy-kcal_serving']) || num(n['energy-kcal']);
  const protein = num(n.proteins_100g) || num(n.proteins_serving) || num(n.proteins);
  const carbs = num(n.carbohydrates_100g) || num(n.carbohydrates_serving) || num(n.carbohydrates);
  const fats = num(n.fat_100g) || num(n.fat_serving) || num(n.fat);
  if (!calories && !protein && !carbs && !fats) return null;
  return {
    id: String(p.code || p._id || name),
    name: String(name).trim(),
    brand: String(p.brands || '').split(',')[0].trim(),
    unit: 'g',
    per: 100,
    source: 'off',
    calories, protein, carbs, fats,
  };
}

const COMMONS = [
  { id: 'local:arroz', name: 'Arroz branco cozido', calories: 130, protein: 2.7, carbs: 28, fats: 0.3, aliases: ['arroz', 'rice'] },
  { id: 'local:frango', name: 'Peito de frango grelhado', calories: 165, protein: 31, carbs: 0, fats: 3.6, aliases: ['frango', 'chicken'] },
  { id: 'local:ovo', name: 'Ovo inteiro', calories: 143, protein: 13, carbs: 0.7, fats: 9.5, aliases: ['ovo', 'egg'] },
  { id: 'local:feijao', name: 'Feijão carioca cozido', calories: 76, protein: 4.8, carbs: 14, fats: 0.5, aliases: ['feijao', 'feijão'] },
  { id: 'local:banana', name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fats: 0.3, aliases: ['banana'] },
  { id: 'local:aveia', name: 'Aveia em flocos', calories: 389, protein: 17, carbs: 66, fats: 7, aliases: ['aveia', 'oats'] },
  { id: 'local:whey', name: 'Whey protein', calories: 400, protein: 80, carbs: 5, fats: 5, aliases: ['whey'] },
  { id: 'local:batata-doce', name: 'Batata-doce cozida', calories: 86, protein: 1.6, carbs: 20, fats: 0.1, aliases: ['batata doce'] },
  { id: 'local:carne', name: 'Carne bovina magra', calories: 250, protein: 26, carbs: 0, fats: 15, aliases: ['carne', 'beef'] },
  { id: 'local:leite', name: 'Leite integral', calories: 61, protein: 3.2, carbs: 4.8, fats: 3.3, aliases: ['leite', 'milk'] },
].map(r => ({ ...r, brand: '', unit: 'g', per: 100, source: 'local' }));

function searchCommons(query, limit) {
  const q = String(query || '').trim().toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '');
  if (q.length < 2) return [];
  const out = [];
  for (const food of COMMONS) {
    const hay = [food.name, ...(food.aliases || [])].join(' ')
      .toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    if (hay.includes(q)) out.push((({ aliases, ...rest }) => rest)(food));
    if (out.length >= limit) break;
  }
  return out;
}

async function offSearch(base, query, limit) {
  const url = `${base}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=code,product_name,product_name_pt,product_name_en,generic_name,brands,nutriments`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'openGym-api/1.2 (self-hosted nutrition proxy)',
    },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  return (Array.isArray(data.products) ? data.products : []).map(mapProduct).filter(Boolean);
}

/** Lookup a single product by EAN / UPC barcode. */
export async function lookupBarcode(code) {
  const barcode = String(code || '').replace(/\D/g, '');
  if (barcode.length < 8) return { results: [], error: 'invalid barcode' };

  let error;
  for (const host of ['https://br.openfoodfacts.org', 'https://world.openfoodfacts.org']) {
    try {
      const res = await fetch(`${host}/api/v2/product/${barcode}?fields=code,product_name,product_name_pt,product_name_en,generic_name,brands,nutriments`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'openGym-api/1.2 (self-hosted nutrition proxy)',
        },
      });
      if (!res.ok) { error = 'HTTP ' + res.status; continue; }
      const data = await res.json();
      const hit = data?.status === 1 || data?.product ? mapProduct({ ...data.product, code: barcode }) : null;
      if (hit) return { results: [hit], source: 'off' };
      error = 'not found';
    } catch (e) {
      error = e.message || 'network error';
    }
  }
  return { results: [], error: error || 'not found' };
}

/** Search OFF (BR then world), fall back to commons. */
export async function searchNutrition(query, { limit = 10 } = {}) {
  const q = String(query || '').trim();
  const lim = Math.min(20, Math.max(1, limit));
  if (q.length < 2) return { results: [], error: 'query too short' };

  let results = [];
  let error;
  for (const base of [OFF_BR, OFF]) {
    try {
      results = await offSearch(base, q, lim);
      if (results.length) break;
    } catch (e) {
      error = e.message || 'network error';
    }
  }
  if (!results.length) {
    results = searchCommons(q, lim);
    return { results, source: results.length ? 'local' : undefined, error: results.length ? undefined : error };
  }
  return { results: results.slice(0, lim), source: 'off' };
}
