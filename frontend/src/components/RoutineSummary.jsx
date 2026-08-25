import { t } from '../lib/i18n.js'
import { fmtDur } from '../lib/format.js'
import { loadOfRoutine, MUSCLE_NAME } from '../lib/muscles.js'
import { exOr } from '../lib/exercises.js'
import BodyMap from './BodyMap.jsx'

export function computeRoutineStats(routine, defaultRestSec = 90) {
  if (!routine || !Array.isArray(routine.ex)) {
    return { exCount: 0, totalSets: 0, estMinutes: 0, muscleSets: [] }
  }

  const exCount = routine.ex.length
  let totalSets = 0
  const muscleMap = {}

  routine.ex.forEach(e => {
    const sets = Number(e.sets) || Number(e.target?.sets) || 3
    totalSets += sets
    const ex = exOr(e.id)
    
    // Primary muscles get full sets credit, secondary get 0.5
    const prims = Array.isArray(ex.primaries) && ex.primaries.length ? ex.primaries : (ex.mg ? [ex.mg] : (ex.tg ? [ex.tg] : []))
    const secs = Array.isArray(ex.secondaries) ? ex.secondaries : (Array.isArray(ex.sm) ? ex.sm : [])

    prims.forEach(m => {
      const name = m.toLowerCase()
      muscleMap[name] = (muscleMap[name] || 0) + sets
    })

    secs.forEach(m => {
      const name = m.toLowerCase()
      if (!prims.map(p => p.toLowerCase()).includes(name)) {
        muscleMap[name] = (muscleMap[name] || 0) + (sets * 0.5)
      }
    })
  })

  // Estimated duration in minutes: average 45s set + rest timer per set
  const estSeconds = totalSets * (defaultRestSec + 45)
  const estMinutes = Math.max(5, Math.round(estSeconds / 60))

  const muscleSets = Object.entries(muscleMap)
    .map(([m, s]) => ({
      muscle: m,
      label: MUSCLE_NAME[m] || m,
      sets: s
    }))
    .sort((a, b) => b.sets - a.sets)

  return {
    exCount,
    totalSets,
    estMinutes,
    muscleSets
  }
}

export default function RoutineSummary({ routine, body, restSec = 90 }) {
  if (!routine || !routine.ex || !routine.ex.length) return null

  const { exCount, totalSets, estMinutes, muscleSets } = computeRoutineStats(routine, restSec)
  const maxSets = Math.max(1, ...muscleSets.map(m => m.sets))
  const load = loadOfRoutine(routine)

  return (
    <div className="card" style={{ marginTop: 14, marginBottom: 14 }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{t('Routine Summary')}</h3>
        <span className="tag acc" style={{ fontSize: 11 }}>{t('Volume Analysis')}</span>
      </div>

      {/* Top 3 Metric Tiles */}
      <div className="tiles" style={{ marginBottom: 16 }}>
        <div className="tile">
          <div className="l">{t('Exercises')}</div>
          <div className="v" style={{ fontSize: '1.2rem' }}>{exCount}</div>
        </div>
        <div className="tile">
          <div className="l">{t('Total Sets')}</div>
          <div className="v" style={{ fontSize: '1.2rem' }}>{totalSets}</div>
        </div>
        <div className="tile">
          <div className="l">{t('Est. Duration')}</div>
          <div className="v" style={{ fontSize: '1.2rem' }}>~{estMinutes}m</div>
        </div>
      </div>

      {/* Front & Back Anatomy BodyMap */}
      <div style={{ marginBottom: 16 }}>
        <BodyMap load={load} body={body} />
      </div>

      {/* Muscle Set Breakdown Bar Chart */}
      {muscleSets.length > 0 && (
        <div>
          <div className="row between" style={{ marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
            <span className="dim">{t('Muscle')}</span>
            <span className="dim">{t('Sets')}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {muscleSets.slice(0, 8).map(m => {
              const pct = Math.max(8, Math.round((m.sets / maxSets) * 100))
              return (
                <div key={m.muscle} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <div style={{ width: 100, textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t(m.label)}
                  </div>
                  <div style={{ flex: 1, height: 10, background: 'var(--surface-3, rgba(255,255,255,0.06))', borderRadius: 99, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'var(--acc, #3a86ff)',
                        borderRadius: 99,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                  <div style={{ width: 28, textAlign: 'right', fontWeight: 600 }}>
                    {m.sets}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
