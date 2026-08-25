import { useState } from 'react'
import { t } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export function generateWarmupSets(workingWeight, unit = 'kg') {
  const w = Number(workingWeight) || 60
  const isLb = unit === 'lb'
  const barWeight = isLb ? 45 : 20
  
  if (w <= barWeight) {
    return [
      { w: barWeight, r: 10, pct: 100, phase: 'warmup', done: false }
    ]
  }

  // Round weight to nearest 2.5 (or 5 for lb)
  const roundStep = isLb ? 5 : 2.5
  const roundTo = val => Math.max(barWeight, Math.round(val / roundStep) * roundStep)

  const sets = []

  // Set 1: Empty Bar / 40%
  sets.push({
    w: barWeight,
    r: 10,
    pct: Math.round((barWeight / w) * 100),
    phase: 'warmup',
    done: false
  })

  // Set 2: 50%
  const s2 = roundTo(w * 0.5)
  if (s2 > barWeight && s2 < w * 0.65) {
    sets.push({
      w: s2,
      r: 5,
      pct: 50,
      phase: 'warmup',
      done: false
    })
  }

  // Set 3: 70%
  const s3 = roundTo(w * 0.7)
  if (s3 > s2 && s3 < w * 0.82) {
    sets.push({
      w: s3,
      r: 3,
      pct: 70,
      phase: 'warmup',
      done: false
    })
  }

  // Set 4: 85%
  const s4 = roundTo(w * 0.85)
  if (s4 > s3 && s4 < w) {
    sets.push({
      w: s4,
      r: 1,
      pct: 85,
      phase: 'warmup',
      done: false
    })
  }

  return sets
}

export default function WarmupCalculator({ workingWeight = 80, unit = 'kg', onApply, close }) {
  const [weight, setWeight] = useState(workingWeight || 80)
  const warmups = generateWarmupSets(weight, unit)

  const bump = delta => {
    setWeight(prev => Math.max(20, Math.round((prev + delta) * 10) / 10))
  }

  return (
    <div style={{ textAlign: 'center', padding: '6px 0' }}>
      <h3 style={{ marginBottom: 4 }}>{t('Warm-up Calculator')}</h3>
      <div className="muted small" style={{ marginBottom: 16 }}>
        {t('Automatically prepares progressive warm-up sets before your working weight')}
      </div>

      <div className="bwstep" style={{ margin: '0 auto 12px', maxWidth: 280 }}>
        <button className="bw-pm" onClick={() => bump(-2.5)} aria-label="minus">
          <Icon name="minus" />
        </button>
        <div className="bw-read" style={{ minWidth: 120 }}>
          {fmtNum(weight)}
          <span className="u"> {unit}</span>
        </div>
        <button className="bw-pm" onClick={() => bump(2.5)} aria-label="plus">
          <Icon name="plus" />
        </button>
      </div>

      <div className="card" style={{ textAlign: 'left', marginBottom: 16 }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="bold">{t('Generated Warm-up Sets:')}</span>
          <span className="dim small">{warmups.length} {t('sets')}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {warmups.map((s, idx) => (
            <div
              key={idx}
              className="row between"
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--bg-subtle, rgba(255,255,255,0.03))',
                border: '1px solid var(--border, rgba(255,255,255,0.06))'
              }}
            >
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <span className="tag" style={{ background: 'var(--orange)', color: '#fff', fontWeight: 700 }}>
                  W{idx + 1}
                </span>
                <span className="bold">{fmtNum(s.w)} {unit}</span>
                <span className="dim">×</span>
                <span className="bold">{s.r} {t('reps')}</span>
              </div>
              <span className="tag dim">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <Button variant="ghost" onClick={close}>{t('Cancel')}</Button>
        <Button
          variant="primary"
          icon="flame"
          onClick={() => {
            if (onApply) onApply(warmups)
            close()
          }}
        >
          {t('Add to Workout')}
        </Button>
      </div>
    </div>
  )
}
