import { useState, useMemo } from 'react'
import { t, exerciseNameFor } from '../lib/i18n.js'
import { uid, DAYN } from '../lib/format.js'
import { useStore } from '../store/useStore.js'
import { exOr } from '../lib/exercises.js'
import { activeProfile } from '../lib/equipment.js'
import {
  buildProgram, defaultWeekdays, hasUnderfilledRoutines, MIN_ROUTINE_EXERCISES,
  summarizeProgram, splitLabelForDays, progForLevel
} from '../lib/program-generator.js'
import { POLICY_NAME, POLICY_DESC } from '../lib/progression.js'
import { computeRoutineStats } from './RoutineSummary.jsx'
import { confirmSheet, equipmentProfileSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

function toStoreRoutines(routines) {
  return routines.map(r => ({
    id: uid(),
    name: t(r.name),
    emoji: r.emoji,
    prog: r.prog,
    ex: r.ex.map(e => ({
      id: e.id,
      target: {
        sets: e.sets,
        ...(e.reps != null ? { reps: e.reps } : {}),
        ...(e.restSec != null ? { restSec: e.restSec } : {}),
        ...(e.min != null ? { min: e.min } : {}),
        ...(e.speed != null ? { speed: e.speed } : {})
      }
    }))
  }))
}

function CompactMuscleBars({ muscleSets }) {
  if (!muscleSets?.length) return null
  const maxSets = Math.max(1, ...muscleSets.map(m => m.sets))
  return (
    <div style={{ marginTop: 10 }}>
      <div className="row between" style={{ marginBottom: 6, fontSize: 12, fontWeight: 600 }}>
        <span className="dim">{t('Muscle')}</span>
        <span className="dim">{t('Sets')}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {muscleSets.slice(0, 5).map(m => {
          const pct = Math.max(8, Math.round((m.sets / maxSets) * 100))
          return (
            <div key={m.muscle} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <div style={{ width: 72, textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t(m.label)}
              </div>
              <div style={{ flex: 1, height: 8, background: 'var(--surface-3, rgba(255,255,255,0.06))', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--acc, #3a86ff)', borderRadius: 99 }} />
              </div>
              <div style={{ width: 24, textAlign: 'right', fontWeight: 600 }}>{m.sets}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RoutinePreviewCard({ routine, daysForRoutine, restSec, expanded, onToggle }) {
  const stats = computeRoutineStats(routine, restSec)
  const sparse = routine.ex.length < MIN_ROUTINE_EXERCISES
  const showAnalytics = routine.ex.length >= MIN_ROUTINE_EXERCISES

  return (
    <div className="card" style={{ marginBottom: 10, padding: 10 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
      >
        <div className="row between" style={{ gap: 8, marginBottom: 4 }}>
          <div className="row" style={{ gap: 6, flex: 1, minWidth: 0 }}>
            <Icon name={routine.emoji} />
            <span className="bold" style={{ fontSize: 13 }}>{t(routine.name)}</span>
          </div>
          <Icon name={expanded ? 'chevronUp' : 'chevronDown'} style={{ flexShrink: 0, opacity: 0.6 }} />
        </div>
        <div className="dim small" style={{ lineHeight: 1.4 }}>
          {daysForRoutine.length > 0 && (
            <span>{daysForRoutine.map(d => t(DAYN[d])).join(', ')} · </span>
          )}
          {t('{0} exercises · {1} sets · ~{2} min', stats.exCount, stats.totalSets, stats.estMinutes)}
        </div>
      </button>

      {sparse && (
        <div className="dim small" style={{ marginTop: 6, color: 'var(--orange)' }}>
          {t('Only {0} exercises matched — equipment filters may be too strict.', routine.ex.length)}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 10 }}>
          {routine.ex.map((e, ei) => {
            const ex = exOr(e.id)
            const name = exerciseNameFor(ex)
            const detail = e.min != null ? t('{0} min', e.min) : t('{0}×{1}', e.sets, e.reps)
            return (
              <div key={ei} className="row between" style={{ padding: '6px 0', borderTop: ei ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                <span>{name}</span>
                <span className="dim">{detail}</span>
              </div>
            )
          })}
          {showAnalytics && <CompactMuscleBars muscleSets={stats.muscleSets} />}
        </div>
      )}
    </div>
  )
}

export default function ProgramGenerator({ close }) {
  const update = useStore(s => s.update)
  const storeSnapshot = useStore(s => s.S)
  const restSec = storeSnapshot.restSec ?? 90

  const [goal, setGoal] = useState('hypertrophy')
  const [days, setDays] = useState(4)
  const [level, setLevel] = useState('intermediate')
  const [equipmentMode, setEquipmentMode] = useState('gym')
  const [selectedWeekdays, setSelectedWeekdays] = useState(() => defaultWeekdays(4))
  const [preview, setPreview] = useState(null)
  const [seedVariant, setSeedVariant] = useState(0)
  const [expandedRoutines, setExpandedRoutines] = useState(() => new Set([0]))

  const equipProfile = activeProfile(storeSnapshot)

  const goals = [
    { id: 'hypertrophy', label: t('Hypertrophy & muscle mass'), icon: 'dumbbell', desc: t('8-12 reps, focus on muscle volume and aesthetics') },
    { id: 'strength', label: t('Raw strength & heavy loads'), icon: 'bolt', desc: t('4-6 reps on main compounds with load progression') },
    { id: 'fatloss', label: t('Cutting & fat loss'), icon: 'flame', desc: t('Circuits, higher density and integrated cardio') },
    { id: 'functional', label: t('Conditioning & longevity'), icon: 'figureRun', desc: t('Balance of strength, cardio and joint mobility') }
  ]

  const dayOptions = [
    { val: 3, label: t('3 days / week'), split: t('Full Body A / B / C or PPL') },
    { val: 4, label: t('4 days / week'), split: t('Upper / Lower') },
    { val: 5, label: t('5 days / week'), split: t('ABCDE split by muscle group') },
    { val: 6, label: t('6 days / week'), split: t('Push / Pull / Legs (PPL 2x) or Arnold') }
  ]

  const equipmentOptions = [
    { id: 'gym', label: t('Full gym'), sub: t('Barbell, cables & machines') },
    { id: 'dumbbells', label: t('Dumbbells'), sub: t('Dumbbells & body weight') },
    { id: 'bodyweight', label: t('Body weight'), sub: t('No equipment needed') }
  ]

  const levelOptions = [
    { id: 'beginner', label: t('Beginner'), sub: t('Linear progression') },
    { id: 'intermediate', label: t('Intermediate'), sub: t('DUP periodization') },
    { id: 'advanced', label: t('Advanced'), sub: t('Double overload') }
  ]

  const selectedSplit = t(splitLabelForDays(days))
  const progPolicy = progForLevel(level, goal)
  const policyName = t(POLICY_NAME[progPolicy])
  const policyDesc = t(POLICY_DESC[progPolicy])

  const weekdayMismatch = selectedWeekdays.length !== days

  const pickDays = val => {
    setDays(val)
    setSelectedWeekdays(defaultWeekdays(val))
  }

  const toggleWeekday = d => {
    setSelectedWeekdays(prev => {
      const has = prev.includes(d)
      if (has) return prev.length > 1 ? prev.filter(x => x !== d) : prev
      return [...prev, d].sort((a, b) => a - b)
    })
  }

  const buildOpts = {
    goal, days, level, equipmentMode,
    selectedWeekdays: selectedWeekdays.length ? selectedWeekdays : defaultWeekdays(days),
    storeSnapshot,
    seedVariant
  }

  const generated = useMemo(() => {
    if (!preview) return null
    return buildProgram(buildOpts)
  }, [preview, goal, days, level, equipmentMode, selectedWeekdays, storeSnapshot, seedVariant])

  const programSummary = useMemo(() => {
    if (!generated) return null
    return summarizeProgram(generated, restSec)
  }, [generated, restSec])

  const showPreview = () => {
    setExpandedRoutines(new Set([0]))
    setPreview(true)
  }

  const toggleRoutineExpanded = ri => {
    setExpandedRoutines(prev => {
      const next = new Set(prev)
      if (next.has(ri)) next.delete(ri)
      else next.add(ri)
      return next
    })
  }

  const applyProgram = mode => {
    const { routines, weekSchedule } = buildProgram(buildOpts)
    const created = toStoreRoutines(routines)

    update(st => {
      if (mode === 'replace') {
        st.routines = created
        st.week = {}
        Object.entries(weekSchedule).forEach(([day, rIdx]) => {
          if (created[rIdx]) st.week[day] = created[rIdx].id
        })
      } else {
        st.routines.push(...created)
        Object.entries(weekSchedule).forEach(([day, rIdx]) => {
          if (!st.week[day] && created[rIdx]) st.week[day] = created[rIdx].id
        })
      }
    })
    close()
  }

  const confirmReplace = () => {
    const { routines } = buildProgram(buildOpts)
    const critical = hasUnderfilledRoutines(routines, MIN_ROUTINE_EXERCISES)

    confirmSheet({
      title: critical ? t('Replace plan with incomplete routines?') : t('Replace current plan?'),
      message: critical
        ? t('Some routines have too few exercises — your equipment profile may be blocking matches. This replaces all your routines and weekly schedule.')
        : t('This replaces all your routines and weekly schedule.'),
      confirmText: critical ? t('Replace anyway') : t('Replace plan'),
      danger: true,
      onConfirm: () => applyProgram('replace')
    })
  }

  if (preview && generated && programSummary) {
    const { routines, weekSchedule } = generated
    const { weekly, quality } = programSummary
    const assignedDays = WEEK_ORDER.filter(d => weekSchedule[d] != null)
    const underfilled = quality.isCritical

    return (
      <div style={{ padding: '6px 0' }}>
        <div className="row between" style={{ marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>{t('Program preview')}</h3>
          <button className="chip nocap" onClick={() => setPreview(false)}>{t('Back to settings')}</button>
        </div>

        <div className="tiles" style={{ marginBottom: 12 }}>
          <div className="tile">
            <div className="l">{t('Routines')}</div>
            <div className="v">{weekly.routineCount}</div>
          </div>
          <div className="tile">
            <div className="l">{t('Training days')}</div>
            <div className="v">{weekly.trainingDays}</div>
          </div>
          <div className="tile">
            <div className="l">{t('Sets / week')}</div>
            <div className="v">{weekly.totalSets}</div>
          </div>
          <div className="tile">
            <div className="l">{t('Est. Duration')}</div>
            <div className="v">~{weekly.estMinutes}m</div>
          </div>
        </div>

        {underfilled && (
          <div className="card" style={{ marginBottom: 12, padding: 10, borderColor: 'var(--orange)' }}>
            <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
              <Icon name="warning" style={{ color: 'var(--orange)', flexShrink: 0 }} />
              <div className="small">
                {t('Some routines have very few exercises. Try a different equipment mode or check your equipment profile filters.')}
                {storeSnapshot.equipFilterOn && equipProfile && (
                  <button
                    type="button"
                    className="chip nocap"
                    style={{ marginTop: 8, display: 'inline-flex' }}
                    onClick={() => equipmentProfileSheet(equipProfile)}
                  >
                    {t('Edit equipment profile')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {routines.map((r, ri) => {
          const daysForRoutine = assignedDays.filter(d => weekSchedule[d] === ri)
          return (
            <RoutinePreviewCard
              key={ri}
              routine={r}
              daysForRoutine={daysForRoutine}
              restSec={restSec}
              expanded={expandedRoutines.has(ri)}
              onToggle={() => toggleRoutineExpanded(ri)}
            />
          )
        })}

        <div style={{ marginTop: 14 }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={close}>{t('Cancel')}</Button>
            <Button variant="ghost" icon="shuffle" onClick={() => setSeedVariant(v => v + 1)}>{t('Regenerate')}</Button>
            <Button variant="tinted" onClick={() => applyProgram('merge')}>{t('Merge into plan')}</Button>
            <Button variant="primary" icon="sparkles" onClick={confirmReplace}>{t('Replace plan')}</Button>
          </div>
          <div className="muted small" style={{ marginTop: 8 }}>
            {t('Merge only fills empty weekdays in your current schedule.')}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '6px 0' }}>
      <div className="row between" style={{ marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>{t('Guided Trainer')}</h3>
        <span className="tag acc" style={{ fontWeight: 700 }}>{t('Personalized')}</span>
      </div>
      <div className="muted small" style={{ marginBottom: 16 }}>
        {t('Generate a personalized science-based training program for your routine')}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="bold small" style={{ marginBottom: 8 }}>{t('1. Primary goal:')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {goals.map(g => {
            const isSel = goal === g.id
            return (
              <div
                key={g.id}
                onClick={() => setGoal(g.id)}
                className="card"
                style={{
                  cursor: 'pointer',
                  borderColor: isSel ? 'var(--acc)' : 'var(--border)',
                  background: isSel ? 'var(--surface-2)' : 'var(--card-bg)',
                  padding: 10,
                  margin: 0
                }}
              >
                <div className="row" style={{ gap: 6, alignItems: 'center', marginBottom: 4 }}>
                  <Icon name={g.icon} style={{ color: isSel ? 'var(--acc)' : 'inherit' }} />
                  <span className="bold" style={{ fontSize: 13 }}>{g.label.split(' & ')[0]}</span>
                </div>
                <div className="dim small" style={{ fontSize: 11, lineHeight: 1.3 }}>{g.desc}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="bold small" style={{ marginBottom: 8 }}>{t('2. Weekly frequency:')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {dayOptions.map(d => (
            <button
              key={d.val}
              className={'chip' + (days === d.val ? ' on' : '')}
              style={{ justifyContent: 'center', padding: '8px 0', fontSize: 12 }}
              onClick={() => pickDays(d.val)}
            >
              {d.val} {t('days')}
            </button>
          ))}
        </div>
        <div className="muted small" style={{ marginTop: 8 }}>
          {t('Split')}: {selectedSplit}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="bold small" style={{ marginBottom: 8 }}>{t('3. Experience level:')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {levelOptions.map(l => (
            <button
              key={l.id}
              className={'chip' + (level === l.id ? ' on' : '')}
              style={{ flexDirection: 'column', padding: '8px 6px', height: 'auto', gap: 2 }}
              onClick={() => setLevel(l.id)}
            >
              <span className="bold">{l.label}</span>
              <span className="dim" style={{ fontSize: 10 }}>{l.sub}</span>
            </button>
          ))}
        </div>
        <div className="card" style={{ marginTop: 8, padding: 10, marginBottom: 0 }}>
          <div className="bold small">{t('Progression')}: {policyName}</div>
          <div className="dim small" style={{ marginTop: 4, lineHeight: 1.4 }}>{policyDesc}</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="bold small" style={{ marginBottom: 8 }}>{t('4. Equipment:')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {equipmentOptions.map(e => (
            <button
              key={e.id}
              className={'chip' + (equipmentMode === e.id ? ' on' : '')}
              style={{ flexDirection: 'column', padding: '8px 6px', height: 'auto', gap: 2 }}
              onClick={() => setEquipmentMode(e.id)}
            >
              <span className="bold">{e.label}</span>
              <span className="dim" style={{ fontSize: 10 }}>{e.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {storeSnapshot.equipFilterOn && equipProfile && (
        <div className="card" style={{ marginBottom: 16, padding: 10, background: 'var(--surface-2)' }}>
          <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
            <Icon name="info" style={{ flexShrink: 0, opacity: 0.7 }} />
            <div className="small muted" style={{ flex: 1 }}>
              {t('Generation respects your active equipment profile "{0}".', equipProfile.name)}
              <button
                type="button"
                className="chip nocap"
                style={{ marginTop: 8, display: 'inline-flex' }}
                onClick={() => equipmentProfileSheet(equipProfile)}
              >
                {t('Edit equipment profile')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <div className="bold small" style={{ marginBottom: 8 }}>{t('5. Training days:')}</div>
        <div className="chips" style={{ flexWrap: 'wrap', gap: 6 }}>
          {WEEK_ORDER.map(d => (
            <button
              key={d}
              className={'chip' + (selectedWeekdays.includes(d) ? ' on' : '')}
              style={{ minWidth: 44, justifyContent: 'center' }}
              onClick={() => toggleWeekday(d)}
            >
              {t(DAYN[d]).slice(0, 3)}
            </button>
          ))}
        </div>
        {weekdayMismatch && (
          <div className="muted small" style={{ marginTop: 8 }}>
            {t('Select exactly {0} training days to match your weekly frequency ({1} selected).', days, selectedWeekdays.length)}
          </div>
        )}
      </div>

      <div className="row" style={{ gap: 8 }}>
        <Button variant="ghost" onClick={close}>{t('Cancel')}</Button>
        <Button variant="primary" icon="sparkles" onClick={showPreview} disabled={!selectedWeekdays.length || weekdayMismatch}>
          {t('Generate preview')}
        </Button>
      </div>
    </div>
  )
}
