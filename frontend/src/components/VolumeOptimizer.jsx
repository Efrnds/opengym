import { t } from '../lib/i18n.js'
import { loadOfWorkouts, MUSCLE_NAME } from '../lib/muscles.js'
import { todayISO, weekKey } from '../lib/format.js'
import Icon from './Icon.jsx'

export default function VolumeOptimizer({ workouts }) {
  const currentWeek = weekKey(todayISO())
  const thisWeekWorkouts = (workouts || []).filter(w => weekKey(w.d) === currentWeek)
  const load = loadOfWorkouts(thisWeekWorkouts)

  const muscles = [
    'chest', 'upper-back', 'lats', 'front-delts', 'side-delts', 'rear-delts',
    'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'
  ]

  const data = muscles.map(slug => {
    const sets = Math.round((load[slug] || 0) * 10) / 10
    let status = 'low' // low | mev | mav | mrv
    let label = t('Sub-ótimo (<6)')
    let color = 'var(--dim, #888)'

    if (sets >= 22) {
      status = 'mrv'
      label = t('Excessivo (>22)')
      color = '#ef4444'
    } else if (sets >= 10) {
      status = 'mav'
      label = t('Volume Ótimo (10-20)')
      color = '#10b981'
    } else if (sets >= 6) {
      status = 'mev'
      label = t('Manutenção (6-9)')
      color = '#f59e0b'
    }

    return {
      slug,
      name: MUSCLE_NAME[slug] || slug,
      sets,
      status,
      label,
      color
    }
  }).sort((a, b) => b.sets - a.sets)

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div>
          <h2 style={{ margin: 0 }}>{t('Semáforo de Volume Semanal')}</h2>
          <div className="dim small" style={{ marginTop: 2 }}>{t('Faixas científicas de hipertrofia (MEV / MAV / MRV)')}</div>
        </div>
        <span className="tag acc">{thisWeekWorkouts.length} {t('treinos')}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map(item => {
          const maxScale = 25
          const pct = Math.min(100, Math.round((item.sets / maxScale) * 100))
          return (
            <div key={item.slug} style={{ fontSize: 13 }}>
              <div className="row between" style={{ marginBottom: 3 }}>
                <span className="bold capitalize">{t(item.name)}</span>
                <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: item.color, fontWeight: 600 }}>
                    {item.label}
                  </span>
                  <span className="bold">{item.sets} {t('séries')}</span>
                </div>
              </div>
              <div style={{ height: 8, background: 'var(--surface-3, rgba(255,255,255,0.06))', borderRadius: 99, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: item.color,
                    borderRadius: 99,
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
