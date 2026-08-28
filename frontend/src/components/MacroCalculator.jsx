import { useState } from 'react'
import { t } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import { lastBW } from '../lib/history.js'
import { useStore } from '../store/useStore.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

const GOALS = [
  { id: 'cut', labelKey: 'Cutting', subKey: '−20% calories' },
  { id: 'maintenance', labelKey: 'Maintenance', subKey: 'Keep weight' },
  { id: 'bulk', labelKey: 'Bulking', subKey: '+12% calories' },
]

const ACTIVITY = [
  { val: 1.2, labelKey: 'Light activity', subKey: '1–2 workouts/wk' },
  { val: 1.4, labelKey: 'Moderate activity', subKey: '3–4 workouts/wk' },
  { val: 1.6, labelKey: 'Intense activity', subKey: '5–6 workouts/wk' },
]

export default function MacroCalculator({ close }) {
  const S = useStore(s => s.S)
  const currentBw = lastBW(S)?.w || 75

  const [weight, setWeight] = useState(currentBw)
  const [goal, setGoal] = useState('maintenance')
  const [activity, setActivity] = useState(1.4)
  const [proteinPerKg, setProteinPerKg] = useState(2.0)

  const bmr = 10 * weight + 6.25 * 175 - 5 * 25 + 5
  const tdee = Math.round(bmr * activity)

  let targetCalories = tdee
  if (goal === 'bulk') targetCalories = Math.round(tdee * 1.12)
  if (goal === 'cut') targetCalories = Math.round(tdee * 0.8)

  const proteinGrams = Math.round(weight * proteinPerKg)
  const proteinCals = proteinGrams * 4
  const fatGrams = Math.round(weight * 0.9)
  const fatCals = fatGrams * 9
  const carbCals = Math.max(0, targetCalories - (proteinCals + fatCals))
  const carbGrams = Math.round(carbCals / 4)

  return (
    <div className="macro-calc">
      <div className="row between macro-calc-hd">
        <h3>{t('Macro Calculator & Diet')}</h3>
        <span className="tag acc">{t('Nutrition')}</span>
      </div>
      <p className="muted small macro-calc-lead">
        {t('Calculate your ideal calories and macros for hypertrophy or cutting')}
      </p>

      <div className="grid2 macro-calc-inputs">
        <div className="card macro-calc-input">
          <div className="dim small macro-calc-field-lbl">{t('Body weight')} ({S.unit})</div>
          <div className="bwstep macro-calc-step">
            <button type="button" className="bw-pm" onClick={() => setWeight(w => Math.max(30, Math.round((w - 1) * 10) / 10))}><Icon name="minus" /></button>
            <div className="bw-read macro-calc-read">{fmtNum(weight)}</div>
            <button type="button" className="bw-pm" onClick={() => setWeight(w => Math.round((w + 1) * 10) / 10)}><Icon name="plus" /></button>
          </div>
        </div>

        <div className="card macro-calc-input">
          <div className="dim small macro-calc-field-lbl">{t('Protein (g/kg)')}</div>
          <div className="bwstep macro-calc-step">
            <button type="button" className="bw-pm" onClick={() => setProteinPerKg(p => Math.max(1.2, Math.round((p - 0.1) * 10) / 10))}><Icon name="minus" /></button>
            <div className="bw-read macro-calc-read">{proteinPerKg.toFixed(1)}</div>
            <button type="button" className="bw-pm" onClick={() => setProteinPerKg(p => Math.min(3.0, Math.round((p + 0.1) * 10) / 10))}><Icon name="plus" /></button>
          </div>
        </div>
      </div>

      <section className="macro-calc-section">
        <div className="dim small macro-calc-lbl">{t('Nutrition goal:')}</div>
        <div className="macro-opts" role="group" aria-label={t('Nutrition goal:')}>
          {GOALS.map(g => (
            <button
              key={g.id}
              type="button"
              className={'macro-opt' + (goal === g.id ? ' on' : '')}
              aria-pressed={goal === g.id}
              onClick={() => setGoal(g.id)}
            >
              <span className="macro-opt-lbl">{t(g.labelKey)}</span>
              <span className="macro-opt-sub">{t(g.subKey)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="macro-calc-section">
        <div className="dim small macro-calc-lbl">{t('Activity level:')}</div>
        <div className="macro-opts" role="group" aria-label={t('Activity level:')}>
          {ACTIVITY.map(a => (
            <button
              key={a.val}
              type="button"
              className={'macro-opt' + (activity === a.val ? ' on' : '')}
              aria-pressed={activity === a.val}
              onClick={() => setActivity(a.val)}
            >
              <span className="macro-opt-lbl">{t(a.labelKey)}</span>
              <span className="macro-opt-sub">{t(a.subKey)}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="macro-result">
        <div className="dim small">{t('Estimated daily target')}</div>
        <div className="macro-result-kcal">
          {fmtNum(targetCalories)} <span className="macro-result-unit">{t('kcal / day')}</span>
        </div>
        <div className="dim small">{t('Maintenance TDEE: ~{0} kcal', fmtNum(tdee))}</div>
      </div>

      <div className="macro-macros">
        <div className="card macro-macro protein">
          <div className="macro-macro-hd">{t('Protein')}</div>
          <div className="macro-macro-val">{proteinGrams}g</div>
          <div className="dim small">{Math.round((proteinCals / targetCalories) * 100)}% ({proteinCals} kcal)</div>
        </div>
        <div className="card macro-macro carbs">
          <div className="macro-macro-hd">{t('Carbs')}</div>
          <div className="macro-macro-val">{carbGrams}g</div>
          <div className="dim small">{Math.round((carbCals / targetCalories) * 100)}% ({carbCals} kcal)</div>
        </div>
        <div className="card macro-macro fat">
          <div className="macro-macro-hd">{t('Fat')}</div>
          <div className="macro-macro-val">{fatGrams}g</div>
          <div className="dim small">{Math.round((fatCals / targetCalories) * 100)}% ({fatCals} kcal)</div>
        </div>
      </div>

      <Button variant="tinted" onClick={close}>{t('Close')}</Button>
    </div>
  )
}
