import { useState } from 'react'
import { t } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import { lastBW } from '../lib/history.js'
import { useStore } from '../store/useStore.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export default function MacroCalculator({ close }) {
  const S = useStore(s => s.S)
  const currentBw = lastBW(S)?.w || 75

  const [weight, setWeight] = useState(currentBw)
  const [goal, setGoal] = useState('maintenance') // bulk | cut | maintenance
  const [activity, setActivity] = useState(1.4) // 1.2, 1.4, 1.6, 1.8
  const [proteinPerKg, setProteinPerKg] = useState(2.0)

  // BMR estimate via Harris-Benedict / Mifflin-St Jeor average (assuming standard height/age baseline)
  const bmr = 10 * weight + 6.25 * 175 - 5 * 25 + 5
  const tdee = Math.round(bmr * activity)

  // Calorie adjustments based on goal
  let targetCalories = tdee
  if (goal === 'bulk') targetCalories = Math.round(tdee * 1.12) // +12% surplus
  if (goal === 'cut') targetCalories = Math.round(tdee * 0.8) // -20% deficit

  // Macronutrient calculation
  const proteinGrams = Math.round(weight * proteinPerKg)
  const proteinCals = proteinGrams * 4

  const fatGrams = Math.round(weight * 0.9)
  const fatCals = fatGrams * 9

  const carbCals = Math.max(0, targetCalories - (proteinCals + fatCals))
  const carbGrams = Math.round(carbCals / 4)

  return (
    <div style={{ padding: '6px 0' }}>
      <div className="row between" style={{ marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>{t('Macro Calculator & Diet')}</h3>
        <span className="tag acc">{t('Nutrition')}</span>
      </div>
      <div className="muted small" style={{ marginBottom: 16 }}>
        {t('Calculate your ideal calories and macros for hypertrophy or cutting')}
      </div>

      {/* Inputs: Peso e Objetivo */}
      <div className="grid2" style={{ marginBottom: 12 }}>
        <div className="card" style={{ padding: 10, margin: 0 }}>
          <div className="dim small" style={{ marginBottom: 4 }}>{t('Body weight')} ({S.unit})</div>
          <div className="bwstep" style={{ margin: 0 }}>
            <button className="bw-pm" onClick={() => setWeight(w => Math.max(30, Math.round((w - 1) * 10) / 10))}><Icon name="minus" /></button>
            <div className="bw-read" style={{ minWidth: 50, fontSize: 18 }}>{fmtNum(weight)}</div>
            <button className="bw-pm" onClick={() => setWeight(w => Math.round((w + 1) * 10) / 10)}><Icon name="plus" /></button>
          </div>
        </div>

        <div className="card" style={{ padding: 10, margin: 0 }}>
          <div className="dim small" style={{ marginBottom: 4 }}>{t('Protein (g/kg)')}</div>
          <div className="bwstep" style={{ margin: 0 }}>
            <button className="bw-pm" onClick={() => setProteinPerKg(p => Math.max(1.2, Math.round((p - 0.1) * 10) / 10))}><Icon name="minus" /></button>
            <div className="bw-read" style={{ minWidth: 50, fontSize: 18 }}>{proteinPerKg.toFixed(1)}</div>
            <button className="bw-pm" onClick={() => setProteinPerKg(p => Math.min(3.0, Math.round((p + 0.1) * 10) / 10))}><Icon name="plus" /></button>
          </div>
        </div>
      </div>

      {/* Goal Selector */}
      <div style={{ marginBottom: 14 }}>
        <div className="dim small" style={{ marginBottom: 6 }}>{t('Nutrition goal:')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[
            { id: 'cut', label: t('Cutting'), icon: 'flame', sub: '-20% calorias' },
            { id: 'maintenance', label: t('Maintenance'), icon: 'scale', sub: 'Manter peso' },
            { id: 'bulk', label: t('Bulking'), icon: 'arrowUp', sub: '+12% calorias' }
          ].map(g => (
            <button
              key={g.id}
              className={'chip' + (goal === g.id ? ' on' : '')}
              style={{ flexDirection: 'column', padding: '8px 4px', height: 'auto', gap: 2 }}
              onClick={() => setGoal(g.id)}
            >
              <span className="bold" style={{ fontSize: 12 }}>{g.label.split(' ')[0]}</span>
              <span className="dim" style={{ fontSize: 10 }}>{g.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity Level Selector */}
      <div style={{ marginBottom: 16 }}>
        <div className="dim small" style={{ marginBottom: 6 }}>{t('Activity level:')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[
            { val: 1.2, label: t('Light activity'), sub: '1-2 treinos/sem' },
            { val: 1.4, label: t('Moderate activity'), sub: '3-4 treinos/sem' },
            { val: 1.6, label: t('Intense activity'), sub: '5-6 treinos/sem' }
          ].map(a => (
            <button
              key={a.val}
              className={'chip' + (activity === a.val ? ' on' : '')}
              style={{ flexDirection: 'column', padding: '6px 4px', height: 'auto', gap: 1 }}
              onClick={() => setActivity(a.val)}
            >
              <span className="bold" style={{ fontSize: 12 }}>{a.label}</span>
              <span className="dim" style={{ fontSize: 10 }}>{a.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Result Target Calories Highlight */}
      <div
        style={{
          background: 'var(--surface-2, rgba(255,255,255,0.06))',
          border: '1px solid var(--acc)',
          borderRadius: 14,
          padding: '14px',
          marginBottom: 16,
          textAlign: 'center'
        }}
      >
        <div className="dim small">{t('Estimated daily target')}</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--acc)', margin: '4px 0' }}>
          {fmtNum(targetCalories)} <span style={{ fontSize: 18, fontWeight: 500 }}>kcal / dia</span>
        </div>
        <div className="dim small">TDEE de Manutenção: ~{fmtNum(tdee)} kcal</div>
      </div>

      {/* Macro Breakdown Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 16
        }}
      >
        <div className="card" style={{ padding: '10px 8px', textAlign: 'center', margin: 0, borderColor: '#3b82f6' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa' }}>PROTEÍNA</div>
          <div style={{ fontSize: 18, fontWeight: 700, margin: '4px 0' }}>{proteinGrams}g</div>
          <div className="dim small">{Math.round((proteinCals / targetCalories) * 100)}% ({proteinCals} kcal)</div>
        </div>

        <div className="card" style={{ padding: '10px 8px', textAlign: 'center', margin: 0, borderColor: '#eab308' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#facc15' }}>CARBOIDRATOS</div>
          <div style={{ fontSize: 18, fontWeight: 700, margin: '4px 0' }}>{carbGrams}g</div>
          <div className="dim small">{Math.round((carbCals / targetCalories) * 100)}% ({carbCals} kcal)</div>
        </div>

        <div className="card" style={{ padding: '10px 8px', textAlign: 'center', margin: 0, borderColor: '#ef4444' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171' }}>GORDURAS</div>
          <div style={{ fontSize: 18, fontWeight: 700, margin: '4px 0' }}>{fatGrams}g</div>
          <div className="dim small">{Math.round((fatCals / targetCalories) * 100)}% ({fatCals} kcal)</div>
        </div>
      </div>

      <Button variant="tinted" onClick={close}>{t('Close')}</Button>
    </div>
  )
}
