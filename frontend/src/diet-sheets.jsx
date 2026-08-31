import { useState, useEffect, useRef } from 'react'
import { api } from './lib/api.js'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { t } from './lib/i18n.js'
import { uid, DAYS } from './lib/format.js'
import {
  CATEGORIES, CATEGORY_LABEL, ROUTINE_KINDS, ROUTINE_KIND_LABEL, QUICK_TIMES,
  STOCK_UNITS, normalizeTime, addExtraFood, cookWeeklyBatch,
} from './lib/diet.js'
import { normalizeRecipe, normalizeWeeklyPrep, recipeMacros, suggestWeeklyPortions } from './lib/recipes.js'
import { normalizeStockItem, applyPurchase } from './lib/shopping.js'
import { fetchFoodNutrition, fetchFoodByBarcode, scaleNutrition } from './lib/nutrition-api.js'
import { Button, TextField, NumberField, Switch, SelectRow, Segmented } from './components/ui.jsx'
import Icon from './components/Icon.jsx'

const toast = m => useUI.getState().toast(m)
const sheet = render => useUI.getState().openSheet(render)

function Field({ label, children }) {
  return <div className="diet-field" data-nodrag><span className="diet-field-lbl">{label}</span>{children}</div>
}

/** Name field doubles as search query; icon-only search + barcode actions. */
function FoodSearchRow({ value, onChange, onSearch, onBarcode, busy, autoFocus, placeholder }) {
  return (
    <div className="diet-search">
      <TextField
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder || t('Search foods…')}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSearch?.() } }}
      />
      <button
        type="button"
        className="diet-search-ico"
        disabled={busy}
        aria-label={t('Search')}
        onClick={onSearch}
      >
        <Icon name="magnifier" />
      </button>
      <button
        type="button"
        className="diet-search-ico"
        disabled={busy}
        aria-label={t('Scan barcode')}
        onClick={onBarcode}
      >
        <Icon name="qrcode" />
      </button>
    </div>
  )
}

function FoodHits({ hits, onPick }) {
  if (!hits?.length) return null
  return (
    <div className="diet-hits">
      {hits.map(h => (
        <button key={h.id} type="button" className="diet-hit" onClick={() => onPick(h)}>
          <span className="diet-hit-t">{h.name}</span>
          <span className="diet-hit-s">
            {h.brand ? h.brand + ' · ' : ''}{h.calories} kcal/100g · P {h.protein}g
            {h.source === 'local' ? ' · ' + t('Offline table') : ''}
          </span>
        </button>
      ))}
    </div>
  )
}

async function runFoodSearch(q) {
  const raw = String(q || '').trim()
  if (raw.length < 2) { toast(t('Type at least 2 characters')); return [] }
  const digits = raw.replace(/\D/g, '')
  if (digits.length >= 8 && digits.length <= 14 && /^\d+$/.test(raw.replace(/[\s-]/g, ''))) {
    const { results, error } = await fetchFoodByBarcode(digits)
    if (!results.length) toast(error ? t('Could not look up food') : t('Barcode not found'))
    return results
  }
  const { results, error } = await fetchFoodNutrition(raw)
  if (!results.length) toast(error ? t('Could not look up food') : t('No results — try a simpler name'))
  return results
}

function BarcodeScanForm({ close, onCode }) {
  const [manual, setManual] = useState('')
  const videoRef = useRef(null)
  const [camOn, setCamOn] = useState(false)
  const [hint, setHint] = useState(t('Opening camera…'))
  const onCodeRef = useRef(onCode)
  onCodeRef.current = onCode

  useEffect(() => {
    let stream
    let timer
    let gone = false
    const finish = raw => {
      if (gone || raw == null || raw === '') return
      gone = true
      const digits = String(raw).replace(/\D/g, '')
      onCodeRef.current(digits.length >= 8 ? digits : String(raw).trim())
      close()
    }

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setHint(t('Camera unavailable — type the barcode'))
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        if (gone) {
          stream.getTracks().forEach(tr => tr.stop())
          return
        }
        const video = videoRef.current
        if (!video) {
          setHint(t('Camera unavailable — type the barcode'))
          stream.getTracks().forEach(tr => tr.stop())
          return
        }
        video.srcObject = stream
        video.playsInline = true
        video.muted = true
        await video.play()
        setCamOn(true)

        if (typeof window.BarcodeDetector === 'function') {
          setHint(t('Point at the barcode'))
          let detector
          try {
            detector = new window.BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128', 'code_39'],
            })
          } catch {
            detector = new window.BarcodeDetector()
          }
          timer = setInterval(async () => {
            if (gone || video.readyState < 2) return
            try {
              const codes = await detector.detect(video)
              const raw = codes?.[0]?.rawValue
              if (raw) finish(raw)
            } catch { /* keep scanning */ }
          }, 320)
        } else {
          setHint(t('Camera on — auto-scan needs Chrome/Edge; type the digits or try again there'))
        }
      } catch {
        setCamOn(false)
        setHint(t('Camera unavailable — type the barcode'))
      }
    }

    start()
    return () => {
      gone = true
      clearInterval(timer)
      stream?.getTracks().forEach(tr => tr.stop())
    }
  }, [close])

  const submitManual = () => {
    const c = manual.replace(/\D/g, '')
    if (c.length < 8) { toast(t('Type at least 8 digits')); return }
    onCode(c)
    close()
  }

  return (
    <div data-nodrag className="diet-sheet">
      <h3>{t('Scan barcode')}</h3>
      <div className={'diet-scan-wrap' + (camOn ? ' on' : '')}>
        <video
          ref={videoRef}
          className="diet-scan-video"
          playsInline
          muted
          autoPlay
        />
        <div className="diet-scan-frame" aria-hidden />
      </div>
      <p className="muted small">{hint}</p>
      <Field label={t('Barcode')}>
        <TextField
          value={manual}
          inputMode="numeric"
          placeholder="7891000100103"
          onChange={e => setManual(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitManual() } }}
        />
      </Field>
      <Button size="sm" variant="primary" onClick={submitManual}>{t('Look up')}</Button>
    </div>
  )
}

function openBarcodeScan(onCode) {
  sheet(close => <BarcodeScanForm close={close} onCode={onCode} />)
}


export function mealSheet(existing) {
  sheet(close => <MealForm existing={existing} close={close} />)
}

export function extraFoodSheet() {
  sheet(close => <ExtraForm close={close} />)
}

export function blockSheet(existing) {
  sheet(close => <BlockForm existing={existing} close={close} />)
}

export function stockSheet(existing, onSave) {
  sheet(close => <StockForm existing={existing} close={close} onSave={onSave} />)
}

export function prepSheet(existing) {
  sheet(close => <PrepForm existing={existing} close={close} />)
}

export function recipeSheet(existing, onSave) {
  sheet(close => <RecipeForm existing={existing} close={close} onSave={onSave} />)
}

export function weeklyPrepSheet(existing) {
  sheet(close => <WeeklyPrepForm existing={existing} close={close} />)
}

export function purchaseSheet(line, onDone) {
  sheet(close => <PurchaseForm line={line} close={close} onDone={onDone} />)
}

/** Add or edit a shopping-list line (manual extra or stock-backed auto line). */
export function shoppingAddSheet(onDone) {
  sheet(close => <ShoppingItemForm close={close} onDone={onDone} />)
}

export function shoppingItemSheet(line, onDone) {
  sheet(close => <ShoppingItemForm existing={line} close={close} onDone={onDone} />)
}

function MealForm({ existing, close }) {
  const update = useStore(s => s.update)
  const stock = useStore(s => s.S.stock || [])
  const recipes = useStore(s => s.S.recipes || [])
  const [time, setTime] = useState(existing?.time || '12:30')
  const [name, setName] = useState(existing?.name || '')
  const [calories, setCalories] = useState(existing?.calories ?? 0)
  const [protein, setProtein] = useState(existing?.protein ?? 0)
  const [carbs, setCarbs] = useState(existing?.carbs ?? 0)
  const [fats, setFats] = useState(existing?.fats ?? 0)
  const [isMarmita, setMarmita] = useState(!!existing?.isMarmita)
  const [ingredients, setIngredients] = useState(existing?.ingredients || [])
  const [recipeId, setRecipeId] = useState(existing?.recipeId || '')

  const pickRecipe = id => {
    setRecipeId(id)
    const rec = recipes.find(r => r.id === id)
    if (!rec) return
    if (!name || name === t('e.g. Lunch') || name === 'Almoço') setName(rec.name)
    const m = recipeMacros(rec, stock).perPortion
    setCalories(m.calories)
    setProtein(m.protein)
    setCarbs(m.carbs)
    setFats(m.fats)
    setMarmita(true)
    const p = Math.max(1, Number(rec.portions) || 1)
    const scaled = (rec.ingredients || []).map(ing => {
      const stItem = stock.find(s => s.id === ing.stockId)
      return {
        stockId: ing.stockId,
        name: stItem?.name || ing.name,
        qty: Math.round((Number(ing.qty) / p) * 100) / 100,
        unit: stItem?.unit || ing.unit || 'g',
      }
    })
    setIngredients(scaled)
    toast(t('Recipe loaded: {0}', rec.name))
  }

  const recalcFromIngredients = () => {
    if (!ingredients.length) return
    const m = recipeMacros({ ingredients, portions: 1 }, stock).perPortion
    setCalories(m.calories)
    setProtein(m.protein)
    setCarbs(m.carbs)
    setFats(m.fats)
    toast(t('Macros recalculated'))
  }

  const addIngredient = () => {
    if (!stock.length) { toast(t('Add pantry items first')); return }
    const first = stock[0]
    setIngredients(list => [...list, { stockId: first.id, name: first.name, qty: 100, unit: first.unit }])
  }

  const save = () => {
    const n = name.trim()
    const hhmm = normalizeTime(time)
    if (!n) { toast(t('Name is required')); return }
    if (!hhmm) { toast(t('Enter a time like 12:30')); return }
    update(S => {
      const row = {
        ...(existing || { id: uid() }),
        time: hhmm, name: n,
        calories: calories || 0, protein: protein || 0, carbs: carbs || 0, fats: fats || 0,
        isMarmita,
        recipeId: recipeId || null,
        ingredients: ingredients.filter(i => i.stockId && i.qty > 0),
      }
      if (existing) S.meals = S.meals.map(m => m.id === existing.id ? row : m)
      else S.meals = [...S.meals, { ...row, orderIndex: S.meals.length + 1 }]
    })
    toast(existing ? t('Meal updated') : t('Meal added'))
    close()
  }

  return <div data-nodrag>
    <h3>{existing ? t('Edit meal') : t('New meal')}</h3>

    {recipes.length > 0 && (
      <div className="card" style={{ marginBottom: 14, padding: 12, background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{t('Use saved recipe')}</span>
          <span className="chip" style={{ fontSize: 11 }}>{t('{0} recipes', recipes.length)}</span>
        </div>
        <SelectRow
          title={t('Recipe')}
          value={recipeId}
          onChange={pickRecipe}
          options={[
            { value: '', label: t('Select a recipe…') },
            ...recipes.map(r => {
              const m = recipeMacros(r, stock).perPortion
              return { value: r.id, label: `${r.name} (${m.calories} kcal / ${t('portion')})` }
            })
          ]}
        />
      </div>
    )}

    <Field label={t('Name')}><TextField autoFocus value={name} placeholder={t('e.g. Lunch')} onChange={e => setName(e.target.value)} /></Field>
    <Field label={t('Time of day')}>
      <TextField value={time} inputMode="numeric" placeholder="12:30" onChange={e => setTime(e.target.value)} />
    </Field>
    <div className="diet-times">
      {QUICK_TIMES.map(hh => (
        <button type="button" key={hh} className={'chip' + (normalizeTime(time) === hh ? ' on' : '')} onClick={() => setTime(hh)}>{hh}</button>
      ))}
    </div>
    <div className="grid2">
      <Field label="kcal"><NumberField value={calories} decimal={false} onChange={setCalories} /></Field>
      <Field label={t('Protein (g)')}><NumberField value={protein} onChange={setProtein} /></Field>
      <Field label={t('Carbs (g)')}><NumberField value={carbs} onChange={setCarbs} /></Field>
      <Field label={t('Fat (g)')}><NumberField value={fats} onChange={setFats} /></Field>
    </div>
    <div className="row between" style={{ margin: '10px 0 8px' }}>
      <div>
        <span>{t('Counts as meal prep')}</span>
        <div className="muted small">{t('Deducts a portion from your weekly batch when eaten')}</div>
      </div>
      <Switch checked={isMarmita} onChange={setMarmita} />
    </div>

    <div className="row between" style={{ marginBottom: 8, marginTop: 12 }}>
      <span className="diet-field-lbl">{t('Ingredients (stock)')}</span>
      <div className="row gap" style={{ gap: 6 }}>
        {ingredients.length > 0 && (
          <Button size="sm" variant="tinted" icon="sparkles" onClick={recalcFromIngredients}>{t('Recalculate')}</Button>
        )}
        <Button size="sm" icon="plus" onClick={addIngredient}>{t('Add')}</Button>
      </div>
    </div>
    {ingredients.map((ing, i) => (
      <div key={i} className="grid2" style={{ marginBottom: 6 }}>
        <SelectRow
          title={t('Item')}
          value={ing.stockId}
          onChange={id => {
            const item = stock.find(s => s.id === id)
            setIngredients(list => list.map((row, j) => j === i ? {
              ...row, stockId: id, name: item?.name || row.name, unit: item?.unit || row.unit,
            } : row))
          }}
          options={stock.map(s => ({ value: s.id, label: s.name }))}
        />
        <Field label={`${t('Qty')} (${ing.unit || 'g'})`}>
          <NumberField value={ing.qty} onChange={q => setIngredients(list => list.map((row, j) => j === i ? { ...row, qty: q } : row))} />
        </Field>
      </div>
    ))}
    <div style={{ height: 8 }} />
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
  </div>
}

function ExtraForm({ close }) {
  const update = useStore(s => s.update)
  const [name, setName] = useState('')
  const [calories, setCalories] = useState(0)
  const [protein, setProtein] = useState(0)
  const [carbs, setCarbs] = useState(0)
  const [fats, setFats] = useState(0)
  const [grams, setGrams] = useState(100)
  const [hits, setHits] = useState([])
  const [hit, setHit] = useState(null)
  const [busy, setBusy] = useState(false)

  const lookup = async () => {
    setBusy(true)
    const results = await runFoodSearch(name)
    setBusy(false)
    setHits(results)
  }

  const applyBarcode = async code => {
    setBusy(true)
    const { results, error } = await fetchFoodByBarcode(code)
    setBusy(false)
    if (!results.length) { toast(error ? t('Could not look up food') : t('Barcode not found')); return }
    pick(results[0])
  }

  const pick = h => {
    setHit(h)
    setName(h.name)
    setHits([])
    const scaled = scaleNutrition(h, grams)
    setCalories(scaled.calories)
    setProtein(scaled.protein)
    setCarbs(scaled.carbs)
    setFats(scaled.fats)
  }

  const onGrams = g => {
    setGrams(g)
    if (hit) {
      const scaled = scaleNutrition(hit, g)
      setCalories(scaled.calories)
      setProtein(scaled.protein)
      setCarbs(scaled.carbs)
      setFats(scaled.fats)
    }
  }

  const save = () => {
    const n = name.trim()
    if (!n) { toast(t('Name is required')); return }
    update(S => addExtraFood(S, {
      name: n, calories: calories || 0, protein: protein || 0, carbs: carbs || 0, fats: fats || 0,
    }))
    toast(t('{0} — logged', n))
    close()
  }

  return <div data-nodrag className="diet-sheet">
    <h3>{t('Log extra food')}</h3>
    <FoodSearchRow
      value={name}
      onChange={v => { setName(v); setHit(null) }}
      onSearch={lookup}
      onBarcode={() => openBarcodeScan(applyBarcode)}
      busy={busy}
      placeholder={t('Name or search…')}
    />
    <FoodHits hits={hits} onPick={pick} />
    {hit && (
      <Field label={t('Portion (g)')}><NumberField value={grams} decimal={false} onChange={onGrams} /></Field>
    )}
    <div className="grid2">
      <Field label="kcal"><NumberField value={calories} decimal={false} onChange={setCalories} /></Field>
      <Field label={t('Protein (g)')}><NumberField value={protein} onChange={setProtein} /></Field>
      <Field label={t('Carbs (g)')}><NumberField value={carbs} onChange={setCarbs} /></Field>
      <Field label={t('Fat (g)')}><NumberField value={fats} onChange={setFats} /></Field>
    </div>
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
  </div>
}

function BlockForm({ existing, close }) {
  const update = useStore(s => s.update)
  const [title, setTitle] = useState(existing?.title || '')
  const [startTime, setStart] = useState(existing?.startTime || '08:00')
  const [endTime, setEnd] = useState(existing?.endTime || '')
  const [kind, setKind] = useState(existing?.kind || 'WORK')
  const save = () => {
    const n = title.trim()
    const start = normalizeTime(startTime)
    if (!n || !start) { toast(t('Title and start time are required')); return }
    const end = normalizeTime(endTime)
    update(S => {
      const row = { ...(existing || { id: uid() }), title: n, startTime: start, endTime: end, kind }
      if (existing) S.dayBlocks = S.dayBlocks.map(b => b.id === existing.id ? row : b)
      else S.dayBlocks = [...S.dayBlocks, { ...row, sortOrder: S.dayBlocks.length + 1 }]
    })
    close()
  }
  return <div data-nodrag>
    <h3>{existing ? t('Edit block') : t('New timeline block')}</h3>
    <Field label={t('Title')}><TextField value={title} placeholder={t('Training')} onChange={e => setTitle(e.target.value)} /></Field>
    <div className="grid2">
      <Field label={t('Start time')}><TextField value={startTime} placeholder="08:00" onChange={e => setStart(e.target.value)} /></Field>
      <Field label={t('End time')}><TextField value={endTime} placeholder="09:00" onChange={e => setEnd(e.target.value)} /></Field>
    </div>
    <SelectRow title={t('Type')} value={kind} onChange={setKind}
      options={ROUTINE_KINDS.map(k => ({ value: k, label: t(ROUTINE_KIND_LABEL[k]) }))} />
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
  </div>
}

function StockForm({ existing, close, onSave }) {
  const [name, setName] = useState(existing?.name || '')
  const [category, setCategory] = useState(existing?.category || 'PROTEIN')
  const [currentQty, setQty] = useState(existing?.currentQty ?? 0)
  const [unit, setUnit] = useState(existing?.unit || 'g')
  const [minAlertQty, setMin] = useState(existing?.minAlertQty ?? 0)
  const [costPerUnit, setCost] = useState(existing?.costPerUnit ?? 0)
  const [calories, setCalories] = useState(existing?.calories ?? 0)
  const [protein, setProtein] = useState(existing?.protein ?? 0)
  const [carbs, setCarbs] = useState(existing?.carbs ?? 0)
  const [fats, setFats] = useState(existing?.fats ?? 0)
  const [hits, setHits] = useState([])
  const [busy, setBusy] = useState(false)

  const lookup = async () => {
    setBusy(true)
    const results = await runFoodSearch(name)
    setBusy(false)
    setHits(results)
  }

  const applyHit = hit => {
    setName(hit.name)
    setCalories(Math.round(Number(hit.calories) || 0))
    setProtein(Math.round((Number(hit.protein) || 0) * 10) / 10)
    setCarbs(Math.round((Number(hit.carbs) || 0) * 10) / 10)
    setFats(Math.round((Number(hit.fats) || 0) * 10) / 10)
    if (unit === 'kg' || unit === 'L') setUnit('g')
    setHits([])
    toast(t('Macros filled'))
  }

  const applyBarcode = async code => {
    setBusy(true)
    const { results, error } = await fetchFoodByBarcode(code)
    setBusy(false)
    if (!results.length) { toast(error ? t('Could not look up food') : t('Barcode not found')); return }
    applyHit(results[0])
  }

  const save = () => {
    const n = name.trim()
    if (!n) { toast(t('Name is required')); return }
    onSave(normalizeStockItem({
      ...(existing || { id: uid() }),
      name: n, category, currentQty: currentQty || 0, unit,
      minAlertQty: minAlertQty || 0, costPerUnit: costPerUnit || 0,
      calories: calories || 0, protein: protein || 0, carbs: carbs || 0, fats: fats || 0,
    }))
    close()
  }

  return <div data-nodrag className="diet-sheet">
    <h3>{existing ? t('Edit item') : t('New pantry item')}</h3>
    <FoodSearchRow
      value={name}
      autoFocus={!existing}
      onChange={setName}
      onSearch={lookup}
      onBarcode={() => openBarcodeScan(applyBarcode)}
      busy={busy}
      placeholder={t('Name or search…')}
    />
    <FoodHits hits={hits} onPick={applyHit} />
    <SelectRow title={t('Category')} value={category} onChange={setCategory}
      options={CATEGORIES.map(c => ({ value: c, label: t(CATEGORY_LABEL[c]) }))} />
    <SelectRow title={t('Unit')} value={unit} onChange={setUnit}
      options={STOCK_UNITS.map(u => ({ value: u, label: u }))} />
    <div className="grid2">
      <Field label={t('Qty')}><NumberField value={currentQty} onChange={setQty} /></Field>
      <Field label={t('Reorder at')}><NumberField value={minAlertQty} onChange={setMin} /></Field>
      <Field label={t('Cost / unit')}><NumberField value={costPerUnit} onChange={setCost} /></Field>
      <Field label={unit === 'g' || unit === 'ml' ? `${t('Calories')} / 100${unit}` : `${t('Calories')} / ${unit}`}><NumberField value={calories} onChange={setCalories} /></Field>
      <Field label={unit === 'g' || unit === 'ml' ? `${t('Protein (g)')} / 100${unit}` : `${t('Protein (g)')} / ${unit}`}><NumberField value={protein} onChange={setProtein} /></Field>
      <Field label={unit === 'g' || unit === 'ml' ? `${t('Carbs (g)')} / 100${unit}` : `${t('Carbs (g)')} / ${unit}`}><NumberField value={carbs} onChange={setCarbs} /></Field>
      <Field label={unit === 'g' || unit === 'ml' ? `${t('Fat (g)')} / 100${unit}` : `${t('Fat (g)')} / ${unit}`}><NumberField value={fats} onChange={setFats} /></Field>
    </div>
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
  </div>
}

function PrepForm({ existing, close }) {
  const update = useStore(s => s.update)
  const [name, setName] = useState(existing?.name || '')
  const [proteinType, setType] = useState(existing?.proteinType || '')
  const [proteinGrams, setGrams] = useState(existing?.proteinGrams ?? 0)
  const [carbType, setCarb] = useState(existing?.carbType || '')
  const [totalPortions, setTotal] = useState(existing?.totalPortions ?? 8)
  const [currentPortions, setLeft] = useState(existing?.currentPortions ?? 8)
  const save = () => {
    const n = name.trim() || [proteinType, proteinGrams ? proteinGrams + 'g' : ''].filter(Boolean).join(' ') || t('Meal prep')
    update(S => {
      S.mealPreps.forEach(p => { p.isActive = false })
      const row = { ...(existing || { id: uid() }), name: n, proteinType, proteinGrams, carbType, totalPortions, currentPortions, isActive: true }
      if (existing) S.mealPreps = S.mealPreps.map(p => p.id === existing.id ? row : p)
      else S.mealPreps = [...S.mealPreps, row]
    })
    close()
  }
  return <div data-nodrag>
    <h3>{existing ? t('Edit batch') : t('Cook a batch')}</h3>
    <Field label={t('Name')}><TextField value={name} placeholder={t('e.g. Chicken + rice')} onChange={e => setName(e.target.value)} /></Field>
    <div className="grid2">
      <Field label={t('Protein')}><TextField value={proteinType} onChange={e => setType(e.target.value)} /></Field>
      <Field label={t('Grams / portion')}><NumberField value={proteinGrams} decimal={false} onChange={setGrams} /></Field>
      <Field label={t('Carb')}><TextField value={carbType} onChange={e => setCarb(e.target.value)} /></Field>
      <Field label={t('Portions')}><NumberField value={totalPortions} decimal={false} onChange={setTotal} /></Field>
    </div>
    <Field label={t('Left in freezer')}><NumberField value={currentPortions} decimal={false} onChange={setLeft} /></Field>
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
  </div>
}

function RecipeForm({ existing, close, onSave }) {
  const update = useStore(s => s.update)
  const stock = useStore(s => s.S.stock || [])
  const [name, setName] = useState(existing?.name || '')
  const [portions, setPortions] = useState(existing?.portions ?? 4)
  const [ingredients, setIngredients] = useState(existing?.ingredients || [])
  const draft = normalizeRecipe({ name, portions, ingredients })
  const macros = recipeMacros(draft, stock)

  const addLine = () => {
    if (!stock.length) { toast(t('Add pantry items first')); return }
    const first = stock[0]
    setIngredients(list => [...list, { stockId: first.id, name: first.name, qty: 100, unit: first.unit }])
  }

  const save = () => {
    if (!name.trim()) { toast(t('Name is required')); return }
    const row = normalizeRecipe({ ...(existing || {}), name, portions, ingredients })
    update(S => {
      if (existing) S.recipes = S.recipes.map(r => r.id === existing.id ? row : r)
      else S.recipes = [...S.recipes, row]
    })
    onSave?.(row)
    close()
  }

  return <div data-nodrag>
    <h3>{existing ? t('Edit recipe') : t('New recipe')}</h3>
    <Field label={t('Name')}><TextField value={name} onChange={e => setName(e.target.value)} /></Field>
    <Field label={t('Portions (yield, e.g. 4)')}><NumberField value={portions} decimal={false} onChange={setPortions} /></Field>
    <p className="muted small">
      {macros.total.calories} kcal {t('total')} · {macros.perPortion.calories} kcal/{t('portion')}
      {macros.perPortion.calories > 0 ? ` (P: ${macros.perPortion.protein}g · C: ${macros.perPortion.carbs}g · G: ${macros.perPortion.fats}g)` : ''}
    </p>
    <div className="row between" style={{ margin: '8px 0' }}>
      <span className="diet-field-lbl">{t('Ingredients')}</span>
      <Button size="sm" icon="plus" onClick={addLine}>{t('Add')}</Button>
    </div>
    {ingredients.map((ing, i) => (
      <div key={i} className="grid2" style={{ marginBottom: 6 }}>
        <SelectRow
          title={t('Item')}
          value={ing.stockId}
          onChange={id => {
            const item = stock.find(s => s.id === id)
            setIngredients(list => list.map((row, j) => j === i ? {
              ...row, stockId: id, name: item?.name || '', unit: item?.unit || 'g',
            } : row))
          }}
          options={stock.map(s => ({ value: s.id, label: s.name }))}
        />
        <Field label={`${t('Qty')} (${ing.unit || 'g'})`}>
          <NumberField value={ing.qty} onChange={q => setIngredients(list => list.map((row, j) => j === i ? { ...row, qty: q } : row))} />
        </Field>
      </div>
    ))}
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
  </div>
}

function WeeklyPrepForm({ existing, close }) {
  const update = useStore(s => s.update)
  const recipes = useStore(s => s.S.recipes || [])
  const stock = useStore(s => s.S.stock || [])
  const isPaired = !!(useStore(s => s.S.shoppingShare?.pairedCode || s.S.shoppingShare?.code))
  const [name, setName] = useState(existing?.name || '')
  const [recipeId, setRecipeId] = useState(existing?.recipeId || recipes[0]?.id || '')
  const [kind, setKind] = useState(existing?.kind || 'BATCH')
  const [days, setDays] = useState(existing?.days || [1, 3, 5])
  const [peopleCount, setPeopleCount] = useState(existing?.peopleCount || (isPaired ? 2 : 1))
  const [manualPortions, setManualPortions] = useState(!!existing)
  const [totalPortions, setTotal] = useState(existing?.totalPortions ?? suggestWeeklyPortions([1, 3, 5], isPaired ? 2 : 1))
  const [currentPortions, setLeft] = useState(existing?.currentPortions ?? (existing?.totalPortions ?? suggestWeeklyPortions([1, 3, 5], isPaired ? 2 : 1)))

  const selectedRecipe = recipes.find(r => r.id === recipeId)

  const toggleDay = d => {
    const nextDays = days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort((a, b) => a - b)
    setDays(nextDays)
    if (!manualPortions) {
      const suggested = suggestWeeklyPortions(nextDays.length, peopleCount)
      setTotal(suggested)
      setLeft(suggested)
    }
  }

  const onPeopleChange = p => {
    setPeopleCount(p)
    if (!manualPortions) {
      const suggested = suggestWeeklyPortions(days.length, p)
      setTotal(suggested)
      setLeft(suggested)
    }
  }

  const save = () => {
    const recipe = recipes.find(r => r.id === recipeId)
    const row = normalizeWeeklyPrep({
      ...(existing || {}),
      name: name.trim() || recipe?.name || t('Meal prep'),
      recipeId: recipeId || null,
      kind, days, peopleCount, totalPortions, currentPortions, isActive: true,
    })
    const isNewBatch = !existing && kind === 'BATCH'
    update(S => {
      S.weeklyMealPrep.forEach(p => { p.isActive = false })
      if (existing) S.weeklyMealPrep = S.weeklyMealPrep.map(p => p.id === existing.id ? row : p)
      else S.weeklyMealPrep = [...S.weeklyMealPrep, row]
      // BATCH: cook once — deduct the full recipe from pantry when the plan is created.
      if (isNewBatch) cookWeeklyBatch(S, row)
    })
    close()
  }

  return <div data-nodrag>
    <h3>{existing ? t('Edit weekly prep') : t('Plan week')}</h3>
    <Field label={t('Name')}><TextField value={name} onChange={e => setName(e.target.value)} /></Field>

    {recipes.length === 0 ? (
      <div className="row between" style={{ margin: '8px 0 10px', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 12 }}>
        <div>
          <span className="diet-field-lbl" style={{ margin: 0 }}>{t('Recipe & Ingredients')}</span>
          <p className="muted small" style={{ margin: '2px 0 0' }}>{t('Create a recipe to link ingredients.')}</p>
        </div>
        <Button size="sm" icon="plus" onClick={() => recipeSheet(null, r => { setRecipeId(r.id); if (!name) setName(r.name) })}>
          {t('Add')}
        </Button>
      </div>
    ) : (
      <div style={{ margin: '8px 0 10px' }}>
        <SelectRow title={t('Recipe')} value={recipeId} onChange={setRecipeId}
          options={recipes.map(r => ({ value: r.id, label: r.name }))} />
        {selectedRecipe && (
          <p className="muted small" style={{ margin: '4px 8px 0' }}>
            {recipeMacros(selectedRecipe, stock).perPortion.calories} kcal/{t('portion')}
            {(selectedRecipe.ingredients || []).length ? ' · ' + selectedRecipe.ingredients.map(i => i.name).filter(Boolean).join(', ') : ''}
          </p>
        )}
      </div>
    )}

    <Segmented
      className="seg-glass"
      value={kind}
      onChange={setKind}
      options={[
        { value: 'BATCH', label: t('Batch cook') },
        { value: 'DAILY', label: t('Daily cook') },
      ]}
    />
    <div className="diet-times" style={{ marginTop: 10 }}>
      {[1, 2, 3, 4, 5, 6, 0].map(d => (
        <button key={d} type="button" className={'chip' + (days.includes(d) ? ' on' : '')} onClick={() => toggleDay(d)}>
          {t(DAYS[d])}
        </button>
      ))}
    </div>
    <div className="row between" style={{ margin: '10px 0 6px' }}>
      <span className="diet-field-lbl">{t('People')}</span>
      <Segmented
        className="seg-glass"
        style={{ minWidth: 170 }}
        value={peopleCount}
        onChange={p => onPeopleChange(Number(p))}
        options={[
          { value: 1, label: t('1 person') },
          { value: 2, label: isPaired ? t('2 people (paired)') : t('2 people') },
        ]}
      />
    </div>
    <div className="grid2" style={{ marginTop: 6 }}>
      <Field label={t('Portions')}>
        <NumberField
          value={totalPortions}
          decimal={false}
          onChange={v => {
            setManualPortions(true)
            setTotal(v)
          }}
        />
      </Field>
      <Field label={t('Left in freezer')}>
        <NumberField value={currentPortions} decimal={false} onChange={setLeft} />
      </Field>
    </div>
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
  </div>
}

function ShoppingItemForm({ existing, close, onDone }) {
  const update = useStore(s => s.update)
  const editing = !!existing
  const isAuto = existing?.source === 'auto' && !!existing?.stockId
  const [name, setName] = useState(existing?.name || '')
  const [category, setCategory] = useState(existing?.category || 'PANTRY')
  const [qty, setQty] = useState(existing?.qty || existing?.deficit || 1)
  const [unit, setUnit] = useState(existing?.unit || 'un')
  const [barcode, setBarcode] = useState(String(existing?.barcode || '').replace(/\D/g, ''))
  const [calories, setCalories] = useState(existing?.calories || 0)
  const [protein, setProtein] = useState(existing?.protein || 0)
  const [carbs, setCarbs] = useState(existing?.carbs || 0)
  const [fats, setFats] = useState(existing?.fats || 0)
  const [hits, setHits] = useState([])
  const [busy, setBusy] = useState(false)

  const onQuery = v => {
    setName(v)
    const digits = String(v || '').replace(/\D/g, '')
    const bare = String(v || '').replace(/[\s-]/g, '')
    if (digits.length >= 8 && digits.length <= 14 && /^\d+$/.test(bare)) setBarcode(digits)
  }

  const lookup = async () => {
    setBusy(true)
    const results = await runFoodSearch(name)
    setBusy(false)
    setHits(results)
    const digits = String(name || '').replace(/\D/g, '')
    const bare = String(name || '').replace(/[\s-]/g, '')
    if (digits.length >= 8 && /^\d+$/.test(bare)) setBarcode(digits)
  }

  const applyHit = hit => {
    setName(hit.name)
    setCalories(Math.round(Number(hit.calories) || 0))
    setProtein(Math.round((Number(hit.protein) || 0) * 10) / 10)
    setCarbs(Math.round((Number(hit.carbs) || 0) * 10) / 10)
    setFats(Math.round((Number(hit.fats) || 0) * 10) / 10)
    const code = String(hit.id || '').replace(/\D/g, '')
    if (code.length >= 8) setBarcode(code)
    if (unit === 'kg' || unit === 'L') setUnit('g')
    setHits([])
    toast(t('Macros filled'))
  }

  const applyScan = async code => {
    const digits = String(code || '').replace(/\D/g, '')
    if (digits.length >= 8) {
      setBarcode(digits)
      setName(digits)
    }
    setBusy(true)
    const { results, error } = await fetchFoodByBarcode(digits)
    setBusy(false)
    if (results.length) applyHit({ ...results[0], id: digits })
    else if (digits.length >= 8) toast(t('Barcode saved — product not found online'))
    else toast(error ? t('Could not look up food') : t('Barcode not found'))
  }

  const resolvedBarcode = () => {
    const digits = String(name || '').replace(/\D/g, '')
    const bare = String(name || '').replace(/[\s-]/g, '')
    if (digits.length >= 8 && /^\d+$/.test(bare)) return digits
    return String(barcode || '').replace(/\D/g, '')
  }

  const linePayload = () => {
    const code = resolvedBarcode()
    let n = name.trim()
    // Don't save a bare EAN as the product name if we somehow only have digits.
    if (code && n.replace(/\D/g, '') === code && /^\d+$/.test(n.replace(/[\s-]/g, ''))) {
      n = existing?.name || n
    }
    if (!n) { toast(t('Name is required')); return null }
    if (!(qty > 0)) { toast(t('qty required')); return null }
    return {
      id: existing?.id || uid(),
      stockId: existing?.stockId || null,
      name: n,
      qty: qty || 1,
      unit,
      category,
      barcode: code,
      calories: calories || 0,
      protein: protein || 0,
      carbs: carbs || 0,
      fats: fats || 0,
      source: isAuto ? 'auto' : 'manual',
    }
  }

  const save = async () => {
    const row = linePayload()
    if (!row) return
    const share = useStore.getState().S.shoppingShare || {}
    const code = share.pairedCode || share.code
    if (code) {
      try {
        await api('/api/shopping/share/join', {
          method: 'POST',
          body: JSON.stringify({
            code,
            action: { type: editing ? 'edit' : 'add', line: row, prev: existing },
          }),
        })
      } catch (e) {
        // Fallback to local
      }
    }
    update(s => {
      if (isAuto) {
        const stockId = existing.stockId
        s.stock = (s.stock || []).map(item => {
          if (item.id !== stockId) return item
          const cur = Number(item.currentQty) || 0
          return normalizeStockItem({
            ...item,
            name: row.name,
            category: row.category,
            unit: row.unit,
            barcode: row.barcode,
            calories: row.calories,
            protein: row.protein,
            carbs: row.carbs,
            fats: row.fats,
            minAlertQty: cur + (row.qty || 0),
          })
        })
      } else if (editing && existing?.source === 'manual') {
        const id = existing.id
        const next = { ...row, source: 'manual' }
        const list = s.shoppingExtras || []
        s.shoppingExtras = list.some(x => x.id === id)
          ? list.map(x => x.id === id ? { ...x, ...next } : x)
          : [...list, next]
      } else {
        s.shoppingExtras = [...(s.shoppingExtras || []), { ...row, source: 'manual' }]
      }
    })
    toast(editing ? t('Saved') : t('Added to shopping list'))
    onDone?.(row)
    close()
  }

  const buyNow = () => {
    const row = linePayload()
    if (!row) return
    close()
    purchaseSheet({ ...row, source: 'manual' })
  }

  return <div data-nodrag className="diet-sheet">
    <h3>{editing ? t('Edit shopping item') : t('Add to shopping')}</h3>
    {!editing && (
      <p className="muted small">{t('Search or scan, then add to the list or log the purchase now.')}</p>
    )}
    <FoodSearchRow
      value={name}
      autoFocus={!editing}
      onChange={onQuery}
      onSearch={lookup}
      onBarcode={() => openBarcodeScan(applyScan)}
      busy={busy}
      placeholder={t('Name, search or barcode…')}
    />
    {barcode ? <p className="muted small diet-barcode-hint">{t('Barcode')}: {barcode}</p> : null}
    <FoodHits hits={hits} onPick={applyHit} />
    <SelectRow title={t('Category')} value={category} onChange={setCategory}
      options={CATEGORIES.map(c => ({ value: c, label: t(CATEGORY_LABEL[c]) }))} />
    <SelectRow title={t('Unit')} value={unit} onChange={setUnit}
      options={STOCK_UNITS.map(u => ({ value: u, label: u }))} />
    <Field label={t('Qty')}><NumberField value={qty} onChange={setQty} /></Field>
    <div style={{ height: 12 }} />
    <div className="diet-add-row">
      <Button size="sm" variant="primary" onClick={save}>{editing ? t('Save') : t('Add to list')}</Button>
      {!editing && (
        <Button size="sm" variant="tinted" onClick={buyNow}>{t('Log purchase')}</Button>
      )}
    </div>
  </div>
}

function PurchaseForm({ line, close, onDone }) {
  const update = useStore(s => s.update)
  const noStock = !line?.stockId || line?.source === 'manual'
  const [qty, setQty] = useState(line?.qty || line?.deficit || 1)
  const [cost, setCost] = useState(line?.cost || 0)
  const [costMode, setCostMode] = useState('total')
  const [asNew, setAsNew] = useState(noStock)
  const [newName, setNewName] = useState(line?.name || '')

  const save = async () => {
    const share = useStore.getState().S.shoppingShare || {}
    const code = share.pairedCode || share.code
    let remoteDone = false
    if (code) {
      try {
        const r = await api('/api/shopping/share/join', {
          method: 'POST',
          body: JSON.stringify({
            code,
            action: {
              type: 'purchase',
              line,
              purchase: { qty, cost, costMode, asNew, newName },
            },
          }),
        })
        if (r.stock) {
          update(S => {
            S.stock = r.stock
            if (line?.source === 'manual' && line?.id) {
              S.shoppingExtras = (S.shoppingExtras || []).filter(x => x.id !== line.id)
            }
          })
          remoteDone = true
          toast(t('Restocked {0}', r.item?.name || line?.name || ''))
          onDone?.(r.item)
        }
      } catch (e) {
        // fallback to local
      }
    }
    if (!remoteDone) {
      update(S => {
        const createNew = asNew || noStock
        const result = applyPurchase(S.stock, createNew
          ? {
            qty, cost, costMode,
            create: {
              name: (newName || line?.name || '').trim(),
              category: line?.category || 'PANTRY',
              unit: line?.unit || 'un',
              minAlertQty: qty || 1,
              calories: line?.calories || 0,
              protein: line?.protein || 0,
              carbs: line?.carbs || 0,
              fats: line?.fats || 0,
              barcode: line?.barcode || '',
            },
          }
          : { stockId: line.stockId, qty, cost, costMode })
        if (result.error) toast(t(result.error))
        else {
          S.stock = result.stock.map(x => {
            if (result.item && x.id === result.item.id && line?.barcode && !x.barcode) {
              return { ...x, barcode: String(line.barcode).replace(/\D/g, '') }
            }
            return x
          })
          if (line?.source === 'manual' && line?.id) {
            S.shoppingExtras = (S.shoppingExtras || []).filter(x => x.id !== line.id)
          }
          toast(t('Restocked {0}', result.item?.name || line?.name || ''))
          onDone?.(result.item)
        }
      })
    }
    close()
  }

  return <div data-nodrag className="diet-sheet">
    <h3>{t('Log purchase')}</h3>
    <p className="muted small">{line?.name}{line?.barcode ? ` · ${line.barcode}` : ''}</p>
    <div className="diet-purchase-nums">
      <Field label={t('Qty')}>
        <NumberField className="diet-num-lg" value={qty} onChange={setQty} />
      </Field>
      <Field label={costMode === 'total' ? t('Total paid') : t('Cost / unit')}>
        <NumberField className="diet-num-lg" value={cost} onChange={setCost} />
      </Field>
    </div>
    <Segmented
      className="seg-glass diet-cost-seg"
      value={costMode}
      onChange={setCostMode}
      options={[
        { value: 'total', label: t('Total paid') },
        { value: 'unit', label: t('Cost / unit') },
      ]}
    />
    {!noStock && (
      <div className="row between diet-shop-toggle">
        <span>{t('Bought a substitute')}</span>
        <Switch checked={asNew} onChange={setAsNew} />
      </div>
    )}
    {(asNew || noStock) && (
      <Field label={t('Name')}>
        <TextField value={newName} placeholder={line?.name} onChange={e => setNewName(e.target.value)} />
      </Field>
    )}
    <div style={{ height: 12 }} />
    <Button size="sm" variant="primary" onClick={save}>{t('Confirm')}</Button>
  </div>
}
