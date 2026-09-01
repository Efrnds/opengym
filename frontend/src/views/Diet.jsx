import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { NumberField, Button, Segmented, Switch } from '../components/ui.jsx'
import { CATEGORY_LABEL, ROUTINE_KIND_LABEL, bumpStock } from '../lib/diet.js'
import { recipeMacros } from '../lib/recipes.js'
import { DAYS } from '../lib/format.js'
import { mealSheet, blockSheet, stockSheet, recipeSheet, weeklyPrepSheet } from '../diet-sheets.jsx'
import { confirmSheet, macroCalculatorSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'

export default function Diet() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const tabParam = params.get('tab')
  const tab = ['meals', 'recipes', 'stock'].includes(tabParam) ? tabParam : 'meals'
  const setTab = v => {
    const next = new URLSearchParams(params)
    if (v === 'meals') next.delete('tab')
    else next.set('tab', v)
    setParams(next, { replace: true })
  }

  const meals = [...(S.meals || [])].sort((a, b) => String(a.time).localeCompare(String(b.time)))
  const blocks = [...(S.dayBlocks || [])].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
  const stock = S.stock || []
  const recipes = S.recipes || []
  const weekly = S.weeklyMealPrep || []

  const upsertStock = row => update(s => {
    s.stock = s.stock.some(i => i.id === row.id) ? s.stock.map(i => i.id === row.id ? row : i) : [...s.stock, row]
  })

  return (
    <div className="narrow diet-page">
      <header className="home-top">
        <div>
          <button type="button" className="iconbtn" onClick={() => nav('/home')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
          <p className="home-greet">{t('Nutrition')}</p>
          <p className="home-date">{S.calorieTarget ? S.calorieTarget + ' kcal' : t('Set your targets')} · {S.meals.length} {t('meals')}</p>
        </div>
      </header>

      <Segmented
        className="seg-glass diet-hub-seg"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'meals', label: t('Meals & targets') },
          { value: 'recipes', label: t('Recipes') },
          { value: 'stock', label: t('Stock') },
        ]}
      />

      {tab === 'meals' && (
        <div className="diet-meals-layout">
          <div className="diet-targets-col">
            <section className="card">
              <div className="row between">
                <h2>{t('Daily targets')}</h2>
                <Button size="sm" onClick={macroCalculatorSheet}>{t('Macro Calculator')}</Button>
              </div>
              <div className="grid2">
                <div className="diet-field" style={{ gridColumn: '1 / -1' }}>
                  <span className="diet-field-lbl">{t('Calories')}</span>
                  <NumberField value={S.calorieTarget || 0} decimal={false} onChange={n => update(s => { s.calorieTarget = n || 0 })} />
                </div>
                <div className="diet-field">
                  <span className="diet-field-lbl">{t('Water (ml)')}</span>
                  <NumberField value={S.waterTargetMl || 0} decimal={false} onChange={n => update(s => { s.waterTargetMl = n || 0 })} />
                </div>
                <div className="diet-field">
                  <span className="diet-field-lbl">{t('Protein (g)')}</span>
                  <NumberField value={S.proteinTarget || 0} decimal={false} onChange={n => update(s => { s.proteinTarget = n || 0 })} />
                </div>
                <div className="diet-field">
                  <span className="diet-field-lbl">{t('Carbs (g)')}</span>
                  <NumberField value={S.carbsTarget || 0} decimal={false} onChange={n => update(s => { s.carbsTarget = n || 0 })} />
                </div>
                <div className="diet-field">
                  <span className="diet-field-lbl">{t('Fat (g)')}</span>
                  <NumberField value={S.fatsTarget || 0} decimal={false} onChange={n => update(s => { s.fatsTarget = n || 0 })} />
                </div>
              </div>
            </section>
          </div>

          <div className="diet-timeline-col">
            <section className="card">
              <div className="row between">
                <h2>{t('Meals')}</h2>
                <Button size="sm" icon="plus" onClick={() => mealSheet()}>{t('Add meal')}</Button>
              </div>
              {meals.length === 0 && (
                <div className="diet-empty">
                  <p className="muted small">{t('Add the meals you repeat most days. Tap one on Home to log it.')}</p>
                  <Button variant="primary" icon="plus" onClick={() => mealSheet()}>{t('Add your first meal')}</Button>
                </div>
              )}
              {meals.map(m => (
                <div key={m.id} className="lrow">
                  <span className="lrow-m">
                    <span className="lrow-t">{m.time} · {m.name}</span>
                    <span className="lrow-s">{m.calories || 0} kcal · P {m.protein || 0}g{m.isMarmita ? ' · ' + t('Meal prep') : ''}{(m.ingredients || []).length ? ' · ' + t('{0} ingredients', (m.ingredients || []).length) : ''}</span>
                  </span>
                  <button type="button" className="iconbtn" onClick={() => mealSheet(m)} aria-label={t('Edit')}><Icon name="pencil" /></button>
                  <button type="button" className="iconbtn" onClick={() => confirmSheet({
                    title: t('Delete {0}?', m.name),
                    message: t('This removes it from the daily agenda.'),
                    danger: true,
                    confirmText: t('Delete'),
                    onConfirm: () => { update(s => { s.meals = s.meals.filter(x => x.id !== m.id) }); toast(t('Deleted')) },
                  })} aria-label={t('Delete')}><Icon name="trash" /></button>
                </div>
              ))}
            </section>

            <section className="card">
              <div className="row between">
                <h2>{t('Timeline blocks')}</h2>
                <Button size="sm" icon="plus" onClick={() => blockSheet()}>{t('Add')}</Button>
              </div>
              {blocks.length === 0 && <p className="muted small">{t('Work, training, study — anything that isn’t a meal.')}</p>}
              {blocks.map(b => (
                <div key={b.id} className="lrow">
                  <span className="lrow-m">
                    <span className="lrow-t">{b.startTime}{b.endTime ? '–' + b.endTime : ''} · {b.title}</span>
                    <span className="lrow-s">{t(ROUTINE_KIND_LABEL[b.kind] || b.kind)}</span>
                  </span>
                  <button type="button" className="iconbtn" onClick={() => blockSheet(b)} aria-label={t('Edit')}><Icon name="pencil" /></button>
                  <button type="button" className="iconbtn" onClick={() => confirmSheet({
                    title: t('Delete {0}?', b.title),
                    danger: true,
                    confirmText: t('Delete'),
                    onConfirm: () => update(s => { s.dayBlocks = s.dayBlocks.filter(x => x.id !== b.id) }),
                  })} aria-label={t('Delete')}><Icon name="trash" /></button>
                </div>
              ))}
            </section>
          </div>
        </div>
      )}

      {tab === 'recipes' && (
        <div className="diet-recipes-layout">
          <div className="diet-recipes-col">
            <section className="card">
              <div className="row between">
                <h2>{t('Recipes')}</h2>
                <Button size="sm" icon="plus" onClick={() => recipeSheet()}>{t('Add recipe')}</Button>
              </div>
              {recipes.length === 0 && (
                <p className="muted small">{t('Build a recipe from pantry ingredients — macros are calculated automatically.')}</p>
              )}
              {recipes.map(r => {
                const m = recipeMacros(r, stock)
                return (
                  <div key={r.id} className="lrow">
                    <span className="lrow-m">
                      <span className="lrow-t">{r.name}</span>
                      <span className="lrow-s">{m.portions} {t('portions')} · {m.perPortion.calories} kcal/{t('portion')} · P {m.perPortion.protein}g</span>
                    </span>
                    <button type="button" className="iconbtn" onClick={() => recipeSheet(r)} aria-label={t('Edit')}><Icon name="pencil" /></button>
                    <button type="button" className="iconbtn" onClick={() => confirmSheet({
                      title: t('Delete {0}?', r.name), danger: true, confirmText: t('Delete'),
                      onConfirm: () => update(s => {
                        s.recipes = s.recipes.filter(x => x.id !== r.id)
                        s.weeklyMealPrep = (s.weeklyMealPrep || []).filter(p => p.recipeId !== r.id)
                      }),
                    })} aria-label={t('Delete')}><Icon name="trash" /></button>
                  </div>
                )
              })}
            </section>
          </div>

          <div className="diet-prep-col">
            <section className="card">
              <div className="row between">
                <h2>{t('Weekly meal prep')}</h2>
                <Button size="sm" icon="plus" onClick={() => weeklyPrepSheet()}>{t('Plan week')}</Button>
              </div>
              {weekly.length === 0 && (
                <p className="muted small">{t('Pick recipes and weekdays for BATCH or DAILY prep.')}</p>
              )}
              {weekly.map(p => (
                <div key={p.id} className="lrow">
                  <span className="lrow-m">
                    <span className="lrow-t">{p.name}</span>
                    <span className="lrow-s">
                      {t(p.kind === 'DAILY' ? 'Daily cook' : 'Batch cook')} · {p.currentPortions}/{p.totalPortions}
                      {p.peopleCount > 1 ? ` · ${p.peopleCount} ${t('people')}` : ''}
                      {(p.days || []).length ? ' · ' + p.days.map(d => t(DAYS[d])).join(' ') : ''}
                    </span>
                  </span>
                  <button type="button" className="iconbtn" onClick={() => weeklyPrepSheet(p)} aria-label={t('Edit')}><Icon name="pencil" /></button>
                  <button type="button" className="iconbtn" onClick={() => confirmSheet({
                    title: t('Delete {0}?', p.name), danger: true, confirmText: t('Delete'),
                    onConfirm: () => update(s => { s.weeklyMealPrep = s.weeklyMealPrep.filter(x => x.id !== p.id) }),
                  })} aria-label={t('Delete')}><Icon name="trash" /></button>
                </div>
              ))}
            </section>
          </div>
        </div>
      )}

      {tab === 'stock' && (
        <section className="card">
          <div className="row between">
            <h2>{t('Stock')}</h2>
            <div className="row" style={{ gap: 6 }}>
              <Button size="sm" variant={S.useShoppingList !== false ? 'primary' : undefined} onClick={() => nav('/shopping')}>
                {t('Shopping')}
              </Button>
              {S.useShoppingList === false && (
                <Button size="sm" icon="plus" onClick={() => stockSheet(null, upsertStock)}>{t('Add')}</Button>
              )}
            </div>
          </div>
          <div className="row between diet-shop-toggle">
            <div>
              <div className="diet-field-lbl">{t('Use shopping list')}</div>
              <p className="muted small" style={{ margin: '4px 0 0' }}>
                {S.useShoppingList !== false
                  ? t('Add and buy only in Shopping. Stock is just quantities.')
                  : t('Shopping list off — manage quantities only in Stock.')}
              </p>
            </div>
            <Switch
              checked={S.useShoppingList !== false}
              onChange={v => update(s => { s.useShoppingList = !!v })}
            />
          </div>
          {stock.length === 0 && (
            <div className="diet-empty">
              <p className="muted small">
                {S.useShoppingList !== false
                  ? t('Start in Shopping to add what you buy — Stock tracks how much you have left.')
                  : t('Add food you keep at home and set a reorder point if you want alerts.')}
              </p>
              {S.useShoppingList !== false
                ? <Button size="sm" variant="primary" onClick={() => nav('/shopping')}>{t('Open shopping')}</Button>
                : <Button size="sm" variant="primary" icon="plus" onClick={() => stockSheet(null, upsertStock)}>{t('Add item')}</Button>}
            </div>
          )}
          {stock.map(item => {
            const low = item.minAlertQty > 0 && item.currentQty <= item.minAlertQty
            return (
              <div key={item.id} className={'lrow' + (low ? ' diet-stock-low' : '')}>
                <span className="lrow-m">
                  <span className="lrow-t">{item.name}{low ? <span className="diet-tag-buy">{t('Buy')}</span> : null}</span>
                  <span className="lrow-s">
                    {t(CATEGORY_LABEL[item.category] || item.category)} · {item.currentQty} {item.unit}
                    {item.minAlertQty ? ` · min ${item.minAlertQty}` : ''}
                    {item.calories ? ` · ${item.calories} kcal/${item.unit}` : ''}
                  </span>
                </span>
                <div className="diet-step">
                  <button type="button" onClick={() => update(s => { s.stock = bumpStock(s.stock, item.id, -1) })}>−</button>
                  <button type="button" onClick={() => update(s => { s.stock = bumpStock(s.stock, item.id, 1) })}>+</button>
                </div>
                <button type="button" className="iconbtn" onClick={() => stockSheet(item, upsertStock)} aria-label={t('Edit')}><Icon name="pencil" /></button>
                <button type="button" className="iconbtn" onClick={() => {
                  update(s => { s.stock = s.stock.filter(x => x.id !== item.id) })
                  toast(t('Deleted'))
                }} aria-label={t('Delete')}><Icon name="trash" /></button>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
