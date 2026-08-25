import { useState } from 'react'
import { t } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

const STANDARD_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25]
const STANDARD_PLATES_LB = [45, 35, 25, 10, 5, 2.5]

const PLATE_COLORS_KG = {
  25: { bg: '#e63946', text: '#fff', height: 72 },
  20: { bg: '#3a86ff', text: '#fff', height: 72 },
  15: { bg: '#ffbe0b', text: '#000', height: 62 },
  10: { bg: '#06d6a0', text: '#000', height: 52 },
  5: { bg: '#adb5bd', text: '#000', height: 42 },
  2.5: { bg: '#495057', text: '#fff', height: 34 },
  1.25: { bg: '#6c757d', text: '#fff', height: 26 }
}

const PLATE_COLORS_LB = {
  45: { bg: '#3a86ff', text: '#fff', height: 72 },
  35: { bg: '#ffbe0b', text: '#000', height: 62 },
  25: { bg: '#06d6a0', text: '#000', height: 52 },
  10: { bg: '#adb5bd', text: '#000', height: 42 },
  5: { bg: '#495057', text: '#fff', height: 34 },
  2.5: { bg: '#6c757d', text: '#fff', height: 26 }
}

export function calculatePlates(targetWeight, barWeight, availablePlates) {
  if (targetWeight <= barWeight) return { platesPerSide: [], remainder: 0, perSideWeight: 0 }
  
  let neededPerSide = (targetWeight - barWeight) / 2
  const perSideWeight = neededPerSide
  const platesPerSide = []
  
  const sorted = [...availablePlates].sort((a, b) => b - a)
  
  for (const plate of sorted) {
    while (neededPerSide >= plate - 0.001) {
      platesPerSide.push(plate)
      neededPerSide -= plate
    }
  }
  
  return {
    platesPerSide,
    remainder: Math.round(neededPerSide * 100) / 100,
    perSideWeight
  }
}

export default function PlateCalculator({ initialWeight = 60, unit = 'kg', close }) {
  const isLb = unit === 'lb'
  const defaultBar = isLb ? 45 : 20
  const [barWeight, setBarWeight] = useState(defaultBar)
  const [targetWeight, setTargetWeight] = useState(Math.max(initialWeight || 60, defaultBar))
  const [plates] = useState(isLb ? STANDARD_PLATES_LB : STANDARD_PLATES_KG)
  const colors = isLb ? PLATE_COLORS_LB : PLATE_COLORS_KG

  const { platesPerSide, remainder, perSideWeight } = calculatePlates(targetWeight, barWeight, plates)

  // Group plates for summary list (e.g. 2x 20kg, 1x 10kg)
  const plateCounts = {}
  platesPerSide.forEach(p => {
    plateCounts[p] = (plateCounts[p] || 0) + 1
  })

  const bump = delta => {
    setTargetWeight(prev => Math.max(barWeight, Math.round((prev + delta) * 10) / 10))
  }

  return (
    <div style={{ textAlign: 'center', padding: '6px 0' }}>
      <h3 style={{ marginBottom: 4 }}>{t('Plate Calculator')}</h3>
      <div className="muted small" style={{ marginBottom: 16 }}>
        {t('Calculate exact plates needed on each side of the barbell')}
      </div>

      {/* Target Weight Controls */}
      <div className="bwstep" style={{ margin: '0 auto 10px', maxWidth: 280 }}>
        <button className="bw-pm" onClick={() => bump(isLb ? -5 : -2.5)} aria-label="minus">
          <Icon name="minus" />
        </button>
        <div className="bw-read" style={{ minWidth: 120 }}>
          {fmtNum(targetWeight)}
          <span className="u"> {unit}</span>
        </div>
        <button className="bw-pm" onClick={() => bump(isLb ? 5 : 2.5)} aria-label="plus">
          <Icon name="plus" />
        </button>
      </div>

      <div className="chips" style={{ justifyContent: 'center', marginBottom: 14 }}>
        <button className="chip" onClick={() => bump(isLb ? -20 : -10)}>−10</button>
        <button className="chip" onClick={() => bump(isLb ? -10 : -5)}>−5</button>
        <button className="chip" onClick={() => bump(isLb ? -5 : -2.5)}>−{isLb ? '5' : '2.5'}</button>
        <button className="chip" onClick={() => bump(isLb ? 5 : 2.5)}>+{isLb ? '5' : '2.5'}</button>
        <button className="chip" onClick={() => bump(isLb ? 10 : 5)}>+5</button>
        <button className="chip" onClick={() => bump(isLb ? 20 : 10)}>+10</button>
      </div>

      {/* Bar Selection */}
      <div className="row center" style={{ gap: 6, marginBottom: 16 }}>
        <span className="dim small" style={{ marginRight: 4 }}>{t('Bar:')}</span>
        {[
          { label: isLb ? '45 lb' : '20 kg (Olympic)', val: defaultBar },
          { label: isLb ? '35 lb' : '15 kg', val: isLb ? 35 : 15 },
          { label: isLb ? '25 lb' : '10 kg', val: isLb ? 25 : 10 },
          { label: '0 (Smith/Sled)', val: 0 }
        ].map(b => (
          <button
            key={b.val}
            className={'chip' + (barWeight === b.val ? ' on' : '')}
            onClick={() => {
              setBarWeight(b.val)
              if (targetWeight < b.val) setTargetWeight(b.val)
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Visual Barbell Sleeve */}
      <div
        style={{
          background: 'var(--card-bg, rgba(255,255,255,0.05))',
          borderRadius: 12,
          padding: '24px 12px',
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 110,
          border: '1px solid var(--border, rgba(255,255,255,0.1))',
          overflowX: 'auto'
        }}
      >
        {/* Barbell sleeve shaft */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {/* Inner Bar Collar */}
          <div
            style={{
              width: 14,
              height: 56,
              background: '#8d99ae',
              borderRadius: 3,
              marginRight: 4
            }}
          />
          {/* Sleeve */}
          <div
            style={{
              height: 20,
              background: '#adb5bd',
              width: 18,
              borderRadius: '2px 0 0 2px'
            }}
          />
          {/* Stacked Plates */}
          {platesPerSide.length === 0 ? (
            <span className="dim small" style={{ fontStyle: 'italic', padding: '0 8px' }}>
              {t('Empty bar (no plates)')}
            </span>
          ) : (
            platesPerSide.map((p, idx) => {
              const conf = colors[p] || { bg: '#6c757d', text: '#fff', height: 40 }
              return (
                <div
                  key={idx}
                  style={{
                    width: 18,
                    height: conf.height,
                    backgroundColor: conf.bg,
                    color: conf.text,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    userSelect: 'none'
                  }}
                  title={`${p} ${unit}`}
                >
                  {p}
                </div>
              )
            })
          )}
          {/* Outer Collar */}
          <div
            style={{
              width: 8,
              height: 32,
              background: '#495057',
              borderRadius: 2,
              marginLeft: 2
            }}
          />
        </div>
      </div>

      {/* Plate Counts Summary */}
      <div className="card" style={{ textAlign: 'left', marginBottom: 16 }}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <span className="bold">{t('Each Side:')}</span>
          <span className="accent bold">{fmtNum(perSideWeight)} {unit}</span>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {Object.keys(plateCounts).length === 0 ? (
            <span className="dim">{t('No plates needed')}</span>
          ) : (
            Object.entries(plateCounts).map(([plate, count]) => {
              const conf = colors[plate] || { bg: '#6c757d', text: '#fff' }
              return (
                <span
                  key={plate}
                  className="tag"
                  style={{
                    backgroundColor: conf.bg,
                    color: conf.text,
                    fontWeight: 700,
                    padding: '4px 8px'
                  }}
                >
                  {count}× {plate} {unit}
                </span>
              )
            })
          )}
        </div>
        {remainder > 0 && (
          <div className="small warn" style={{ marginTop: 8 }}>
            ⚠️ {t('Remaining {0} {1} cannot be matched with standard plates', remainder, unit)}
          </div>
        )}
      </div>

      <Button variant="tinted" onClick={close}>{t('Close')}</Button>
    </div>
  )
}
