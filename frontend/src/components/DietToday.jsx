import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { todayISO, fmtNum } from '../lib/format.js'
import { lastBW } from '../lib/history.js'
import {
  logOf, toggleMeal, addBurned, addWater, setWater, removeExtraFood, remainingKcal,
  estimateWorkoutKcal, workoutDurationMin, waterCupPlan, buildShoppingList, activePrep, WATER_STEP_ML,
} from '../lib/diet.js'
import { mealSheet, extraFoodSheet } from '../diet-sheets.jsx'
import { bwSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

function MacroBar({ label, tint, current, target, unit = 'g' }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0
  const over = target > 0 && current > target
  return (
    <div className={'diet-mbar' + (over ? ' over' : '')}>
      <div className="diet-mbar-hd">
        <span className={'diet-mbar-dot ' + tint} aria-hidden />
        <span className="diet-mbar-lbl">{label}</span>
        <span className="diet-mbar-val">
          {Math.round(current)}{target > 0 ? ` / ${target}` : ''}{unit}
        </span>
      </div>
      <div className="diet-mbar-track" aria-hidden>
        <i className={tint} style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}

export default function DietToday() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const date = todayISO()
  const log = logOf(S, date)
  const done = log.meals || []
  const extras = log.extras || []
  const prep = activePrep(S)
  const shoppingOn = S.useShoppingList !== false
  const shopping = shoppingOn ? buildShoppingList(S.stock || [], undefined, true) : []
  const workoutBurn = estimateWorkoutKcal(S.workouts, date, S)
  const burned = (log.burned || 0) + workoutBurn
  // Eating budget left (does not inflate when you burn — burned shown separately).
  const remaining = remainingKcal(S, date)
  const over = remaining != null && remaining < 0
  const bw = lastBW(S)
  const eatPct = S.calorieTarget ? Math.min(140, (log.kcal / S.calorieTarget) * 100) : 0
  const plan = waterCupPlan(S)
  const filled = Math.min(plan.cups, Math.round((log.water || 0) / plan.per))
  const hero = remaining == null ? Math.round(log.kcal) : Math.round(Math.abs(remaining))
  const heroLbl = remaining == null ? t('Eaten') : over ? t('Over') : t('Left')

  const todaysWorkouts = (S.workouts || []).filter(w => w.d === date)

  const tapMeal = (id, title) => {
    update(st => {
      const r = toggleMeal(st, id, date)
      if (r.error) toast(t(r.error))
      else if (r.undone) toast(t('Undone'))
      else if (!r.already) toast(t('{0} — logged', title))
    })
  }

  const tapCup = n => {
    update(st => setWater(st, (n === filled ? n - 1 : n) * plan.per, date))
  }

  return (
    <div className="diet-today">
      <section className="diet-card diet-energy">
        <div className="diet-card-hd">
          <h2>{t('Today')}</h2>
          <button type="button" className="iconbtn" onClick={() => nav('/diet')} aria-label={t('Edit')}>
            <Icon name="pencil" />
          </button>
        </div>

        <div className={'diet-kcal' + (over ? ' over' : '')}>
          <span className="diet-kcal-n">{hero}</span>
          <span className="diet-kcal-u">kcal</span>
          <span className="diet-kcal-lbl">{heroLbl}</span>
        </div>

        {S.calorieTarget ? (
          <>
            <div className={'diet-eat-track' + (over ? ' over' : '')} aria-hidden="true">
              <i style={{ width: Math.min(100, eatPct) + '%' }} />
            </div>
            <div className="diet-balance" aria-label={t('Calorie balance')}>
              <span><b>{S.calorieTarget}</b><em>{t('Goal')}</em></span>
              <span className="diet-balance-op">−</span>
              <span><b>{Math.round(log.kcal)}</b><em>{t('Eaten')}</em></span>
              <span className="diet-balance-op">+</span>
              <span><b>{Math.round(burned)}</b><em>{t('Burned')}</em></span>
            </div>

            {todaysWorkouts.length > 0 && (
              <div className="diet-workout-burn-card" style={{ margin: '10px 0 8px', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div className="row between" style={{ marginBottom: 4 }}>
                  <div className="row gap" style={{ gap: 6, fontWeight: 600, fontSize: 13, alignItems: 'center' }}>
                    <Icon name="flame" className="acc" style={{ fontSize: 15 }} />
                    <span>{t('Today’s workouts')}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--acc)', fontSize: 13 }}>
                    -{Math.round(workoutBurn)} kcal
                  </span>
                </div>
                {todaysWorkouts.map((w, idx) => (
                  <div key={w.id || idx} className="row between muted small" style={{ marginTop: 4 }}>
                    <span>{w.name || t('Workout')} ({workoutDurationMin(w)} min)</span>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>-{Math.round(w.kcal || 0)} kcal</span>
                  </div>
                ))}
              </div>
            )}

            <p className="diet-balance-note muted small">
              {t('Left to eat ignores burn — burn is shown for reference.')}
            </p>
          </>
        ) : (
          <Button size="sm" variant="primary" onClick={() => nav('/diet')}>{t('Set calorie target')}</Button>
        )}

        <div className="diet-mbars">
          <MacroBar label={t('Protein')} tint="p" current={log.protein || 0} target={S.proteinTarget || 0} />
          <MacroBar label={t('Carbs')} tint="c" current={log.carbs || 0} target={S.carbsTarget || 0} />
          <MacroBar label={t('Fat')} tint="f" current={log.fats || 0} target={S.fatsTarget || 0} />
        </div>

        <div className="diet-water-block">
          <div className="diet-water-hd">
            <span>{t('Water')}</span>
            <span>{log.water || 0} / {plan.target} ml</span>
          </div>
          <div className="diet-water-acts">
            <button type="button" className="diet-water-chip" onClick={() => update(st => addWater(st, WATER_STEP_ML, date))}>+{WATER_STEP_ML} ml</button>
            <button type="button" className="diet-water-chip" onClick={() => update(st => addWater(st, 500, date))}>+500 ml</button>
          </div>
          <div className="diet-cups" role="group" aria-label={t('Water')}>
            {Array.from({ length: plan.cups }, (_, i) => {
              const n = i + 1
              const on = n <= filled
              return (
                <button
                  key={n}
                  type="button"
                  className={'diet-cup' + (on ? ' on' : '')}
                  aria-pressed={on}
                  aria-label={`${Math.round(n * plan.per)} ml`}
                  onClick={() => tapCup(n)}
                >
                  <span className="diet-cup-glass"><i /></span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="diet-mini">
          <button type="button" className="diet-mini-tile" onClick={() => bwSheet()}>
            <Icon name="scale" className="metric-ico acc" />
            <span className="diet-mini-v">{bw ? fmtNum(bw.w) : '—'}</span>
            <span className="diet-mini-l">{t('Weight')} {S.unit}</span>
          </button>
          <div className="diet-mini-tile">
            <Icon name="flame" className="metric-ico warn" />
            <span className="diet-mini-v">{Math.round(log.burned || 0)}</span>
            <span className="diet-mini-l">{t('Extra burn')}</span>
            <div className="diet-step">
              <button type="button" onClick={() => update(st => addBurned(st, -50, date))} aria-label="−">−</button>
              <button type="button" onClick={() => update(st => addBurned(st, 50, date))} aria-label="+">+</button>
            </div>
          </div>
        </div>
      </section>

      {(prep && prep.currentPortions <= 2) || shopping.length ? (
        <div className="diet-alerts">
          {prep && prep.currentPortions <= 2 && (
            <button type="button" className="diet-alert" onClick={() => nav('/diet?tab=stock')}>
              <Icon name="warning" />
              {t('Freezer: {0} portions left', String(prep.currentPortions))}
            </button>
          )}
          {shopping.length > 0 && (
            <button type="button" className="diet-alert" onClick={() => nav('/shopping')}>
              <Icon name="list" />
              {t('{0} items to restock', String(shopping.length))}
            </button>
          )}
        </div>
      ) : null}

      <section className="diet-card diet-meals">
        <div className="diet-card-hd">
          <h2>{t('Today’s meals')}</h2>
          <button type="button" className="iconbtn" onClick={() => nav('/diet')} aria-label={t('Edit')}>
            <Icon name="pencil" />
          </button>
        </div>
        {S.meals.length === 0 && extras.length === 0 ? (
          <div className="diet-empty">
            <p>{t('Add the meals you repeat most days. Tap one on Home to log it.')}</p>
            <Button size="sm" variant="primary" icon="plus" onClick={() => mealSheet()}>{t('Add your first meal')}</Button>
          </div>
        ) : (
          <div className="diet-timeline">
            {[...S.meals].sort((a, b) => String(a.time).localeCompare(String(b.time))).map(m => {
              const on = done.includes(m.id)
              return (
                <div key={m.id} className={'diet-slot-card' + (on ? ' on' : '')}>
                  <button type="button" className="diet-slot-check" aria-pressed={on} onClick={() => tapMeal(m.id, m.name)}>
                    {on ? <Icon name="check" /> : null}
                  </button>
                  <div className="diet-slot-body">
                    <div className="diet-slot-top">
                      <span className="diet-slot-time">{m.time}</span>
                      {m.isMarmita && <span className="diet-slot-badge">{t('Meal prep')}</span>}
                    </div>
                    <p className="diet-slot-name">{m.name}</p>
                    <p className="diet-slot-macros">
                      {m.calories || 0} kcal · P {m.protein || 0}g · C {m.carbs || 0}g · G {m.fats || 0}g
                    </p>
                    <button type="button" className="diet-slot-add" onClick={() => extraFoodSheet()}>
                      + {t('Add food')}
                    </button>
                  </div>
                </div>
              )
            })}
            {extras.map(x => (
              <div key={x.id} className="diet-slot-card extra">
                <div className="diet-slot-body">
                  <p className="diet-slot-name">{x.name}</p>
                  <p className="diet-slot-macros">{t('Extra')} · {x.calories || 0} kcal</p>
                </div>
                <button type="button" className="iconbtn" onClick={() => update(st => removeExtraFood(st, x.id, date))} aria-label={t('Delete')}>
                  <Icon name="trash" />
                </button>
              </div>
            ))}
            <div className="diet-add-row">
              <Button size="sm" icon="plus" onClick={() => extraFoodSheet()}>{t('Log extra food')}</Button>
              <Button size="sm" onClick={() => mealSheet()}>{t('Add meal')}</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
