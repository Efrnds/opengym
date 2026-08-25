import { useState } from 'react'
import { t } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import { estimate1RM, FORMULAS } from '../lib/onerm.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export default function OneRepMaxCalculator({ initialWeight = 80, initialReps = 5, unit = 'kg', close }) {
  const [weight, setWeight] = useState(initialWeight || 80)
  const [reps, setReps] = useState(Math.min(12, Math.max(1, initialReps || 5)))

  const e1rm = estimate1RM(weight, reps, 'epley') || weight

  const percentages = [
    { pct: 100, label: '1RM', zone: 'Max Strength' },
    { pct: 95, label: '2RM', zone: 'Strength' },
    { pct: 90, label: '3-4RM', zone: 'Strength' },
    { pct: 85, label: '5-6RM', zone: 'Strength / Hypertrophy' },
    { pct: 80, label: '7-8RM', zone: 'Hypertrophy' },
    { pct: 75, label: '9-10RM', zone: 'Hypertrophy' },
    { pct: 70, label: '11-12RM', zone: 'Endurance' },
    { pct: 65, label: '15RM', zone: 'Endurance' }
  ]

  const bumpW = delta => {
    setWeight(prev => Math.max(1, Math.round((prev + delta) * 10) / 10))
  }

  const bumpR = delta => {
    setReps(prev => Math.min(12, Math.max(1, prev + delta)))
  }

  return (
    <div style={{ textAlign: 'center', padding: '6px 0' }}>
      <h3 style={{ marginBottom: 4 }}>{t('1RM & Training Load Calculator')}</h3>
      <div className="muted small" style={{ marginBottom: 16 }}>
        {t('Calculate your estimated 1-rep maximum and training load percentages')}
      </div>

      {/* Input Rows: Weight & Reps */}
      <div className="grid2" style={{ marginBottom: 14 }}>
        <div className="card" style={{ padding: '10px 8px' }}>
          <div className="dim small" style={{ marginBottom: 4 }}>{t('Weight')} ({unit})</div>
          <div className="bwstep" style={{ margin: 0 }}>
            <button className="bw-pm" onClick={() => bumpW(-2.5)} aria-label="minus"><Icon name="minus" /></button>
            <div className="bw-read" style={{ minWidth: 60, fontSize: 18 }}>{fmtNum(weight)}</div>
            <button className="bw-pm" onClick={() => bumpW(2.5)} aria-label="plus"><Icon name="plus" /></button>
          </div>
        </div>

        <div className="card" style={{ padding: '10px 8px' }}>
          <div className="dim small" style={{ marginBottom: 4 }}>{t('Reps')}</div>
          <div className="bwstep" style={{ margin: 0 }}>
            <button className="bw-pm" onClick={() => bumpR(-1)} aria-label="minus"><Icon name="minus" /></button>
            <div className="bw-read" style={{ minWidth: 60, fontSize: 18 }}>{reps}</div>
            <button className="bw-pm" onClick={() => bumpR(1)} aria-label="plus"><Icon name="plus" /></button>
          </div>
        </div>
      </div>

      {/* Estimated 1RM Highlight Box */}
      <div
        style={{
          background: 'var(--surface-2, rgba(255,255,255,0.06))',
          border: '1px solid var(--acc)',
          borderRadius: 12,
          padding: '14px',
          marginBottom: 16
        }}
      >
        <div className="dim small">{t('Estimated 1-Rep Max (1RM)')}</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--acc)', margin: '4px 0' }}>
          {fmtNum(e1rm)} <span style={{ fontSize: 18, fontWeight: 400 }}>{unit}</span>
        </div>
      </div>

      {/* Percentage Load Table */}
      <div className="card" style={{ textAlign: 'left', marginBottom: 16 }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="bold">{t('Percentage Table')}</span>
          <span className="dim small">{t('Load')}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {percentages.map(p => {
            const load = Math.round((e1rm * (p.pct / 100)) * 10) / 10
            return (
              <div
                key={p.pct}
                className="row between"
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'var(--bg-subtle, rgba(255,255,255,0.02))'
                }}
              >
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span className="tag" style={{ minWidth: 44, textAlign: 'center', fontWeight: 700 }}>
                    {p.pct}%
                  </span>
                  <span className="bold">{p.label}</span>
                </div>
                <span className="bold accent">{fmtNum(load)} {unit}</span>
              </div>
            )
          })}
        </div>
      </div>

      <Button variant="tinted" onClick={close}>{t('Close')}</Button>
    </div>
  )
}
