import { Fragment, useEffect, useRef, useState } from 'react'
import { LayoutGroup, MotionConfig, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { exOr } from '../lib/exercises.js'
import { effectiveRoutine, lastEntryFor, bestWeightFor, buildSets, freestyleConfig, defaultConfig, setsDoneActive, supersetUnits, unitOf, setLabel, modeOf, isBw, isPerSide, sideReps, repStep, EFFORT, effortOf, stepEffort, capEffort, cascadeWeight, insertWarmupRow, removeRowAt, pairAdjacent, unpairSuperset, cleanupSg, applyIntensifierPlan } from '../lib/history.js'
import { fmtNum, fmtDate, todayISO, exCount, DAYN } from '../lib/format.js'
import { beep, vibrate } from '../lib/sound.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import { api } from '../lib/api.js'
import { setProgressHighWater, supersetFlowStep } from '../lib/supersetFlow.js'
import Media from '../components/Media.jsx'
import { startFlow, exercisePicker, exConfigSheet, exerciseDetailSheet, topWeightSheet, finishWorkout, workoutCompleteSheet, confirmSheet, plateCalculatorSheet, warmupCalculatorSheet, oneRepMaxCalculatorSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Check, NumberField } from '../components/ui.jsx'
import { nextPrescription, applyPrescription } from '../lib/progression.js'
import { glyphOf } from '../lib/glyphs.js'
import { isWarmupRow, isDropSet, isRestPauseSet, dropsOf, clustersOf, addDrop, addCluster, removeDropAt, removeClusterAt, setDropAt, setClusterAt, nextDropWeight, nextBurstReps } from '../lib/workout-model.js'

/* ---------- start chooser (no active workout) ---------- */
function StartChooser() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const todayR = effectiveRoutine(S, todayISO())
  const todayOvr = S.dayPlan[todayISO()] !== undefined
  const others = S.routines.filter(r => r !== todayR)
  return <div className="narrow">
    <div className="hdr"><div><h1>{t('Start workout')}</h1><div className="sub">{t(DAYN[new Date().getDay()])} — {todayR ? t('today is {0}', todayR.name) : t('rest day, but no one’s stopping you')}</div></div></div>
    {todayR && <div className="card" style={{ borderColor: 'var(--acc)' }}>
      <h2 className="accent">{t("Today's plan")}{todayOvr ? ' · ' + t('rescheduled') : ''}</h2>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div><div className="big">{todayR.name}</div><div className="muted small">{exCount(todayR.ex.length)}</div></div>
        <span className="lrow-i" style={{ width: 38, height: 38, borderRadius: 9, fontSize: 22 }}><Icon name={glyphOf(todayR.emoji)} /></span>
      </div>
      <Button variant="primary" icon="play" onClick={() => startFlow(todayR.id)}>{t('Start {0}', todayR.name)}</Button>
    </div>}
    {others.length > 0 && <><h4 className="sec">{t('Other routines')}</h4>
      <div className="list">{others.map(r => <div key={r.id} className="item" onClick={() => startFlow(r.id)}>
        <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
        <div className="grow"><div className="tt">{r.name}</div><div className="ss">{exCount(r.ex.length)}</div></div>
        <span className="tag acc">{t('Start')}</span></div>)}</div></>}
    <div style={{ height: 14 }} />
    <Button icon="shuffle" onClick={() => startFlow(null)}>{t('Freestyle workout (pick as you go)')}</Button>
    {!S.routines.length && <><div style={{ height: 10 }} /><Button variant="primary" onClick={() => nav('/plan')}>{t('Build a plan first')}</Button></>}
  </div>
}

/* ---------- elapsed clock (isolated so the workout tree doesn't re-render every second) ---------- */
function Elapsed({ start }) {
  const [t, setT] = useState('0:00')
  useEffect(() => {
    const tick = () => { const s = Math.floor((Date.now() - start) / 1000); setT(Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')) }
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv)
  }, [start])
  return <span>{t}</span>
}

/* ---------- chain link between adjacent exercises → superset ---------- */
const MERGE_SPRING = { type: 'spring', stiffness: 520, damping: 26, mass: 0.72 }
const LAYOUT_T = { layout: MERGE_SPRING }
const linkId = (a, b) => 'plink-' + Math.min(a, b) + '-' + Math.max(a, b)

function PairLink({ a, b, linked, onClick, label }) {
  return (
    <div className="ss-link">
      <motion.button
        type="button"
        layout
        layoutId={linkId(a, b)}
        className={'ss-link-btn' + (linked ? ' linked' : '')}
        aria-label={label}
        title={label}
        onClick={onClick}
        whileTap={{ scale: 0.82 }}
        transition={LAYOUT_T}
      >
        <Icon name="link" />
      </motion.button>
    </div>
  )
}

/* ---------- one exercise block (reps: weight×reps · time: a held duration · cardio: duration+speed) ---------- */
function ExerciseBlock({ entryIdx, compact, ssPos, onToggle, onField, onAddSet, onRemoveSet, onAddWarmup, onRemoveSetAt, onStartTimed, onMoveUp, onMoveDown, onRemove }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const working = useUI(s => s.work)
  const [showMedia, setShowMedia] = useState(false)
  const entry = S.active?.entries?.[entryIdx]
  if (!entry) return null
  // Drops/bursts mutate the row in place — same card, not a new set with its own long rest.
  // A planned exercise (see the exercise's "Intensifier" config) arrives with these already
  // filled in by applyIntensifierPlan; these only add/edit/remove entries live from here on.
  const mutSet = (i, fn) => update(s => { const row = s.active.entries[entryIdx].sets[i]; s.active.entries[entryIdx].sets[i] = fn(row) }, true)
  const addDropRow = i => mutSet(i, row => {
    const drops = dropsOf(row)
    const base = drops.length ? drops[drops.length - 1].w : (row.w || 0)
    const pct = entry.target?.intensifier?.type === 'dropset' ? entry.target.intensifier.pct : undefined
    return addDrop(row, { w: nextDropWeight(base, pct), r: row.r })
  })
  // A rest-pause row's own reps are always the total across every burst (see
  // applyIntensifierPlan/history.js) — clusters are the breakdown of that total, not extra on
  // top of it — so adding, removing or editing one keeps `r` in step by the same delta.
  const addBurstRow = i => mutSet(i, row => {
    const clusters = clustersOf(row)
    const base = clusters.length ? clusters[clusters.length - 1].r : (row.r || 0)
    const restSec = entry.target?.intensifier?.type === 'restpause' ? entry.target.intensifier.restSec : (S.restPauseSec || 15)
    const added = nextBurstReps(base)
    return { ...addCluster(row, { r: added, restSec }), r: (row.r || 0) + added }
  })
  const removeDrop = (i, di) => mutSet(i, row => removeDropAt(row, di))
  const removeCluster = (i, ci) => mutSet(i, row => {
    const removed = clustersOf(row)[ci]?.r || 0
    return { ...removeClusterAt(row, ci), r: Math.max(0, (row.r || 0) - removed) }
  })
  const setDropField = (i, di, field, v) => mutSet(i, row => setDropAt(row, di, { [field]: v }))
  const setClusterField = (i, ci, v) => mutSet(i, row => {
    const delta = (Number(v) || 0) - (clustersOf(row)[ci]?.r || 0)
    return { ...setClusterAt(row, ci, { r: v }), r: Math.max(0, (row.r || 0) + delta) }
  })
  const ex = exOr(entry.id)
  const mode = modeOf({ ...(entry.target || {}), id: entry.id })
  const cardio = mode === 'cardio'
  const timed = mode === 'time'
  const last = lastEntryFor(S, entry.id)
  // The same number the "confirm your working weight" sheet calls your best, so the two
  // never disagree inside one session: heaviest logged set, or the working weight you kept.
  const best = cardio ? 0 : Math.max(bestWeightFor(S, entry.id), (S.exWeights[entry.id] || {}).w || 0)
  // What the progression policy decided for this session, and why (issue #17). Computed when
  // the session was built so the reason matches the numbers already in the rows.
  const plan = entry.plan
  // A bodyweight set has no weight to type, so the column is not there (issue #32) — one
  // stepper instead of two, which is the whole point of the flag. Adding a belt weight in the
  // config brings it back, now labelled as the addition it is.
  const cfg = { ...(entry.target || {}), id: entry.id }
  const bw = !cardio && isBw(cfg)
  const added = bw && entry.sets.some(s => s.w > 0)
  const loadCol = { f: 'w', step: 2.5, dec: true, hd: bw ? t('Added ({0})', S.unit) : t('Weight ({0})', S.unit) }
  // The reps column is the total in every mode, unilateral included — the stepper walks in
  // twos there so the number you land on is one you can actually split evenly.
  const repCol = { f: 'r', step: repStep(cfg), dec: false, hd: t('Reps') }
  const col1 = cardio ? { f: 'min', step: 1, dec: false, hd: t('Duration (min)') }
    : timed ? { f: 'sec', step: 5, dec: false, hd: t('Seconds') }
      : (bw && !added) ? repCol : loadCol
  const col2 = cardio ? { f: 'speed', step: 0.5, dec: true, hd: t('Speed (km/h)') }
    : timed ? ((bw && !added) ? null : loadCol)
      : (bw && !added) ? null : repCol
  // Effort (RIR or RPE, whichever the profile logs) only makes sense for weighted rep sets,
  // not cardio/timed holds, and is opt-in since it adds a third stepper to every row. `opt`
  // because an unlogged effort is not the same as 0 — RIR 0 says the set went to failure.
  const kind = effortOf(S)
  const eff = EFFORT[kind]
  const col3 = mode === 'reps' && eff ? { ...eff, eff: kind, dec: true, opt: true, hd: t(eff.hd) } : null
  // The effort column walks its own scale — see stepEffort. Weight and reps step up from 0
  // with no ceiling, as they always did.
  const bump = (s, i, col, dir) => {
    if (col.eff) return onField(i, col.f, stepEffort(col.eff, s[col.f], dir))
    onField(i, col.f, Math.max(0, Math.round(((s[col.f] || 0) + dir * col.step) * 100) / 100))
  }
  const ghostVal = (s, i, col) => (!s.done && (s[col.f] === undefined || s[col.f] === '' || s[col.f] === 0))
    ? (last?.sets?.[i]?.[col.f] ?? last?.sets?.[0]?.[col.f] ?? '')
    : ''

  // Direct numeric inputs for weight/reps/duration — compact tabular logging (Anexo 1).
  // Effort (RIR/RPE) keeps the stepper: optional, color-coded, and not KG/REPS.
  const cell = (s, i, col, cls) => {
    if (col.eff) {
      const rirVal = s[col.f] != null ? (col.eff === 'rpe' ? (10 - s[col.f]) : s[col.f]) : null
      const effColor = rirVal != null ? (rirVal === 0 ? '#ef4444' : rirVal <= 1 ? '#f97316' : rirVal <= 2 ? '#eab308' : '#10b981') : undefined
      const ph = ghostVal(s, i, col)
      return (
        <div className={'stp ' + cls} style={effColor ? { borderColor: effColor } : undefined}>
          <button aria-label="Decrease" onClick={() => bump(s, i, col, -1)}><Icon name="minus" /></button>
          <span className="val" style={effColor ? { color: effColor, fontWeight: 700 } : undefined}>
            <NumberField
              decimal={col.dec}
              nullable={col.opt}
              value={s[col.f] ?? ''}
              placeholder={ph !== '' ? String(ph) : undefined}
              onChange={v => onField(i, col.f, capEffort(col.eff, v))}
            />
          </span>
          <button aria-label="Increase" onClick={() => bump(s, i, col, 1)}><Icon name="plus" /></button>
        </div>
      )
    }
    const ph = ghostVal(s, i, col)
    return (
      <div className={'set-input ' + cls}>
        <NumberField
          decimal={col.dec}
          nullable={col.opt}
          value={s[col.f] ?? ''}
          placeholder={ph !== '' ? String(ph) : undefined}
          onChange={v => onField(i, col.f, v)}
        />
      </div>
    )
  }
  // A smaller stepper for a drop's weight/reps or a burst's reps — editing what the plan (or a
  // live "+ Drop"/"+ Burst" tap) already put on the row, not typing into a fresh field.
  const miniStepper = (value, step, dec, onChange) => (
    <div className="stp mini">
      <button aria-label="Decrease" onClick={() => onChange(Math.max(0, Math.round(((value || 0) - step) * 100) / 100))}><Icon name="minus" /></button>
      <span className="val"><NumberField decimal={dec} value={value ?? ''} onChange={onChange} /></span>
      <button aria-label="Increase" onClick={() => onChange(Math.max(0, Math.round(((value || 0) + step) * 100) / 100))}><Icon name="plus" /></button>
    </div>
  )

  const isSetPR = s => {
    if (!s.done || isWarmupRow(s)) return false
    if (s.w > 0 && best > 0 && s.w >= best) return true
    if (s.w > 0 && last && last.sets) {
      const lastMax = Math.max(...last.sets.map(x => x.w || 0), 0)
      if (lastMax > 0 && s.w > lastMax) return true
    }
    return false
  }
  return (
    <div className={'ex-card' + (compact ? ' compact' : '') + (ssPos ? ' ss-' + ssPos : '')}>
      {!compact && showMedia && ex.gif && <Media ex={ex} key={entry.id} className="workout" minimizable />}
      <div className="ex-head">
        <div className="ex-title">
          {exerciseNameFor(ex)}
        </div>
        <div className="ex-actions">
          {!cardio && !bw && (
            <button className="iconbtn" title={t('Plate Calculator')} aria-label={t('Plate Calculator')} onClick={() => plateCalculatorSheet(entry.sets.find(s => !s.done && s.w > 0)?.w || entry.sets[0]?.w || 60, S.unit)}>
              <Icon name="plate" />
            </button>
          )}
          {!cardio && (
            <button className="iconbtn" title={t('1RM Calculator')} aria-label={t('1RM Calculator')} onClick={() => oneRepMaxCalculatorSheet(entry.sets.find(s => !s.done && s.w > 0)?.w || entry.sets[0]?.w || 80, entry.sets.find(s => !s.done && s.r > 0)?.r || entry.sets[0]?.r || 5, S.unit)}>
              <Icon name="chartLine" />
            </button>
          )}
          <button className="iconbtn" title={t('Swap exercise')} aria-label={t('Swap exercise')} onClick={() => exercisePicker(newEx => { update(s => { s.active.entries[entryIdx].id = newEx.id; cleanupSg(s.active.entries) }, true) })}>
            <Icon name="shuffle" />
          </button>
          {onMoveUp && <button className="iconbtn" title={t('Move up')} aria-label={t('Move up')} onClick={onMoveUp}><Icon name="chevronUp" /></button>}
          {onMoveDown && <button className="iconbtn" title={t('Move down')} aria-label={t('Move down')} onClick={onMoveDown}><Icon name="chevronDown" /></button>}
          {onRemove && <button className="iconbtn" title={t('Remove exercise')} aria-label={t('Remove exercise')} disabled={!!working} style={{ color: 'var(--red, #ef4444)' }} onClick={onRemove}><Icon name="trash" /></button>}
          {!compact && ex.gif && !showMedia && (
            <button className="iconbtn" title={t('Show animation')} aria-label={t('Show animation')} onClick={() => setShowMedia(true)}><Icon name="play" /></button>
          )}
          <button className="iconbtn" aria-label={t('Details')} onClick={() => exerciseDetailSheet(ex)}><Icon name="info" /></button>
        </div>
      </div>

      {(ex.tg || ex.bp || cardio || (!cardio && !timed && isPerSide(cfg)) || best > 0) && (
        <div className="ex-meta">
          {cardio && <span className="tag acc"><Icon name="figureRun" />{t('Cardio')}</span>}
          {!cardio && !timed && isPerSide(cfg) && <span className="tag acc nocap"><Icon name="shuffle" />{t('{0} per side', fmtNum(sideReps(entry.sets.find(s => !s.done)?.r ?? entry.sets[0]?.r)))}</span>}
          {(ex.tg || ex.bp) && <span className="tag">{t(ex.tg || ex.bp)}</span>}
          {best > 0 && <span className="tag nocap">{t('Best:')} {fmtNum(best)} {S.unit}</span>}
        </div>
      )}

      <details className="ex-hints" defaultOpen={!!cfg.note}>
        <summary>{t('More')}</summary>
        <div className="ex-hints-b">
          <div className="ex-note">
            <input
              className="input"
              placeholder={t('+ Add a note (e.g. bench 4, wide grip)...')}
              defaultValue={cfg.note || ''}
              onChange={e => {
                update(st => {
                  const ent = st.active?.entries?.[entryIdx]
                  if (ent) {
                    if (!ent.target) ent.target = {}
                    ent.target.note = e.target.value.slice(0, 500)
                  }
                }, true)
              }}
            />
          </div>
          {last && <div className="small dim" style={{ marginBottom: 6 }}>{t('Last time')} ({fmtDate(last.d)}): {last.sets.map(s => setLabel(entry.id, s, last.target)).join(', ')}</div>}
          {plan && plan.why && plan.kind !== 'off' && <div className={'progline' + (plan.kind === 'deload' ? ' warn' : '')}>
            <Icon name={plan.kind === 'up' ? 'arrowUp' : plan.kind === 'deload' ? 'arrowDown' : 'lightbulb'} />
            <span>{t(...plan.why)}</span>
          </div>}
          {last && last.sets && last.sets.length > 0 && entry.sets.some(s => !s.done && (!s.w || s.w === 0)) && (
            <button
              className="chip"
              style={{ fontSize: 11, padding: '4px 10px', color: 'var(--acc)', borderColor: 'var(--acc)', background: 'var(--surface)', cursor: 'pointer', marginTop: 6 }}
              onClick={() => {
                update(st => {
                  const e = st.active.entries[entryIdx]
                  last.sets.forEach((ls, lsi) => {
                    if (e.sets[lsi] && !e.sets[lsi].done) {
                      if (ls.w > 0) e.sets[lsi].w = ls.w
                      if (ls.r > 0) e.sets[lsi].r = ls.r
                    }
                  })
                }, true)
              }}
            >
              <Icon name="copy" /> {t('Repeat previous loads')}
            </button>
          )}
        </div>
      </details>

      {/* Sets Table */}
      <div style={{ marginTop: 6, marginBottom: 0 }}>
        <div className={'sethead' + (col3 ? ' eff3' : '')}><span className="n-sp" /><span className="w-sp">{col1.hd}</span>{col2 && <span className="r-sp">{col2.hd}</span>}{col3 && <span className="eff-sp">{col3.hd}</span>}{timed && <span className="ck-sp" />}<span className="ck-sp" /></div>
        {entry.sets.map((s, i) => {
          const warm = isWarmupRow(s)
          const warmBefore = i > 0 && isWarmupRow(entry.sets[i - 1])
          const isFirstWarmup = warm && !warmBefore
          const phaseNum = entry.sets.slice(0, i + 1).filter(x => isWarmupRow(x) === warm).length
          const pr = isSetPR(s)
          return <div key={i}>
            {isFirstWarmup && <div className="setph">{t('Warm-up')}</div>}
            {!warm && warmBefore && <div className="setsep" />}
            <div className={'setrow' + (s.done ? ' done' : '') + (col3 ? ' eff3' : '')}>
              <div className="n" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                {phaseNum}
                {pr && <span style={{ color: 'var(--yellow, #fbbf24)', fontSize: 9, fontWeight: 900, marginTop: 1 }} title={t('New personal record!')}>PR</span>}
              </div>
              {cell(s, i, col1, 'w')}
              {col2 && cell(s, i, col2, 'r')}
              {col3 && cell(s, i, col3, 'eff')}
              {timed && <button className="setgo" aria-label={t('Start set')} disabled={s.done || !!working}
                onClick={() => onStartTimed(i)}><Icon name="play" /></button>}
              {warm && <button className="iconbtn" style={{ fontSize: 13 }} aria-label={t('Remove set')}
                disabled={entry.sets.length <= 1} onClick={() => onRemoveSetAt(i)}><Icon name="xmark" /></button>}
              <Check checked={s.done} onChange={() => onToggle(i)} />
            </div>
            {!warm && mode === 'reps' && <>
              {dropsOf(s).map((d, di) => (
                <div className="subrow" key={'d' + di}>
                  <span className="subn">{t('Drop {0}', di + 1)}</span>
                  {miniStepper(d.w, 2.5, true, v => setDropField(i, di, 'w', v))}
                  {miniStepper(d.r, 1, false, v => setDropField(i, di, 'r', v))}
                  <button className="iconbtn" aria-label={t('Remove drop')} onClick={() => removeDrop(i, di)}><Icon name="xmark" /></button>
                </div>
              ))}
              {clustersOf(s).map((c, ci) => (
                <div className="subrow" key={'c' + ci}>
                  <span className="subn">{t('Burst {0}', ci + 1)}</span>
                  {miniStepper(c.r, 1, false, v => setClusterField(i, ci, v))}
                  <span className="dim small">{c.restSec}s</span>
                  <button className="iconbtn" aria-label={t('Remove burst')} onClick={() => removeCluster(i, ci)}><Icon name="xmark" /></button>
                </div>
              ))}
              <div className="setextra">
                {!isRestPauseSet(s) && <button className="chip add" onClick={() => addDropRow(i)}><Icon name="arrowDown" />{t('+ Drop')}</button>}
                {!isDropSet(s) && <button className="chip add" onClick={() => addBurstRow(i)}><Icon name="bolt" />{t('+ Burst')}</button>}
              </div>
            </>}
          </div>
        })}
        <div style={{ height: 8 }} />
        <div className="set-tools">
          {!cardio && (
            <Button size="sm" icon="flame" className="set-tool" title={t('Warm-up Calc')} onClick={() => warmupCalculatorSheet(entry.sets.find(s => !isWarmupRow(s) && s.w > 0)?.w || entry.sets[0]?.w || 60, S.unit, warmups => {
              update(s => {
                const ent = s.active.entries[entryIdx]
                const existingWork = ent.sets.filter(x => !isWarmupRow(x))
                ent.sets = [...warmups, ...existingWork]
              }, true)
            })}>
              <span className="set-tool-l">{t('Warm-up Calc')}</span>
            </Button>
          )}
          <Button size="sm" icon="flame" className="set-tool" title={t('Add warm-up set')} onClick={onAddWarmup}>
            <span className="set-tool-l">{t('Add warm-up set')}</span>
          </Button>
          <Button size="sm" icon="minus" className="set-tool" title={t('Remove set')} disabled={entry.sets.length <= 1} onClick={onRemoveSet}>
            <span className="set-tool-l">{t('Remove set')}</span>
          </Button>
          <Button size="sm" icon="plus" className="set-tool" title={t('Add set')} onClick={onAddSet}>
            <span className="set-tool-l">{t('Add set')}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ---------- active workout ---------- */
export function removeActiveExercise(idx) {
  useUI.getState().stopWork()
  useStore.getState().update(s => {
    if (!s.active || !Array.isArray(s.active.entries)) return
    if (idx < 0 || idx >= s.active.entries.length) return
    s.active.entries.splice(idx, 1)
    cleanupSg(s.active.entries)
    if (idx < s.active.cur) s.active.cur--
    if (s.active.cur >= s.active.entries.length) s.active.cur = Math.max(0, s.active.entries.length - 1)
  }, true)
}

function ActiveWorkout() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const { startRest, stopRest } = useUI()
  const work = useUI(s => s.work)
  const A = S.active
  const exRefs = useRef([])
  const progressHighWater = useRef([])

  // All hooks must run before any early return — otherwise discarding the workout
  // (active → null while this tree is still mounted) trips the rules-of-hooks check
  // and the ErrorBoundary, which is exactly the white-screen the discard button exists for.
  useEffect(() => {
    if (!A) return
    document.body.classList.add('workout-active')
    return () => document.body.classList.remove('workout-active')
  }, [!!A])

  useEffect(() => {
    if (!A) nav('/home')
  }, [!!A])

  useEffect(() => {
    if (!A) return
    progressHighWater.current = A.entries.map(e => e.sets.filter(s => s.done).length)
  }, [A?.entries?.length])

  // Live-presence heartbeat so the admin dashboard can show who's training now
  useEffect(() => {
    if (!useStore.getState().user) return
    let stopped = false
    const ping = active => {
      const A2 = useStore.getState().S.active
      if (!A2) return
      const u = supersetUnits(A2.entries)
      const c = Math.min(A2.cur, Math.max(0, A2.entries.length - 1))
      const ui = u.findIndex(x => x.includes(c))
      const tot = A2.entries.reduce((n, e) => n + e.sets.length, 0)
      api('/api/activity', { method: 'POST', body: JSON.stringify({
        active, name: A2.name, exIdx: ui + 1, exTotal: u.length,
        setsDone: setsDoneActive(A2), setsTotal: tot, startedAt: A2.start
      }) }).catch(() => {})
    }
    ping(true)
    const iv = setInterval(() => { if (!stopped) ping(true) }, 20000)
    return () => {
      stopped = true; clearInterval(iv)
      try { navigator.sendBeacon?.('/api/activity', new Blob([JSON.stringify({ active: false })], { type: 'application/json' })) } catch { /* */ }
      api('/api/activity', { method: 'POST', body: JSON.stringify({ active: false }) }).catch(() => {})
    }
  }, [])

  if (!A) return null

  // unitOf expects the grouped index lists from supersetUnits — not the entry objects.
  // Passing A.entries here TypeErrors on `.includes` and white-screens the live view.
  const units = supersetUnits(A.entries)
  const cur = Math.min(A.cur, Math.max(0, A.entries.length - 1))
  const unit = A.entries.length ? unitOf(units, cur) : []
  const unitIdx = units.findIndex(u => u.includes(cur))
  const isSuperset = unit.length > 1

  const total = A.entries.reduce((n, e) => n + e.sets.length, 0)
  const done = setsDoneActive(A)

  const mutEntry = (idx, fn) => update(s => { fn(s.active.entries[idx]) }, true)
  const setField = (idx, i, field, v) => mutEntry(idx, e => {
    if (v == null) delete e.sets[i][field]; else e.sets[i][field] = v
    if (field === 'w') {
      e.sets = cascadeWeight(e.sets, i, v)
    }
  })
  const modeAt = idx => modeOf({ ...(A.entries[idx].target || {}), id: A.entries[idx].id })
  const addSet = idx => mutEntry(idx, e => {
    const l = e.sets[e.sets.length - 1]
    const m = modeOf({ ...(e.target || {}), id: e.id })
    if (m === 'cardio') e.sets.push({ min: l ? l.min : (e.target.min || 20), speed: l ? l.speed : (e.target.speed || 8), done: false })
    else if (m === 'time') e.sets.push({ sec: l ? l.sec : (e.target.sec || 45), w: l ? (l.w || 0) : (e.target.weight || 0), done: false })
    else e.sets.push({ w: l ? l.w : 0, r: l ? l.r : (e.target?.reps || 10), done: false })
  })
  const removeSet = idx => mutEntry(idx, e => { if (e.sets.length > 1) e.sets.pop() })
  const addWarmup = idx => mutEntry(idx, e => {
    const m = modeOf({ ...(e.target || {}), id: e.id })
    e.sets = insertWarmupRow(e.sets, m, e.target || {})
  })
  const removeSetAt = (idx, i) => mutEntry(idx, e => { e.sets = removeRowAt(e.sets, i) })
  const pairAt = (first, second) => update(s => {
    s.active.entries = pairAdjacent(s.active.entries, first, second)
  })
  const unpairAt = idx => update(s => {
    s.active.entries = unpairSuperset(s.active.entries, idx)
  })

  const moveExercise = (idx, dir) => update(s => {
    const j = idx + dir
    if (j < 0 || j >= s.active.entries.length) return
    const temp = s.active.entries[idx]
    s.active.entries[idx] = s.active.entries[j]
    s.active.entries[j] = temp
    cleanupSg(s.active.entries)
  }, true)

  const confirmRemoveExercise = idx => {
    const e = A.entries[idx]
    if (!e) return
    const hasDone = (e.sets || []).some(s => s.done)
    confirmSheet({
      title: t('Remove {0}?', exerciseNameFor(exOr(e.id))),
      message: hasDone
        ? t('The sets you logged for this exercise in this session will be lost.')
        : t('This removes the exercise from your current session.'),
      confirmText: t('Remove'), danger: true, onConfirm: () => removeActiveExercise(idx)
    })
  }

  const startTimed = (idx, i) => {
    const e = A.entries[idx]
    useUI.getState().startWork(e.sets[i].sec || 45, exerciseNameFor(exOr(e.id)), elapsed => {
      mutEntry(idx, en => { en.sets[i].sec = elapsed })
      if (!useStore.getState().S.active.entries[idx].sets[i].done) toggle(idx, i)
    })
  }

  const toggle = (idx, i) => {
    const m = modeAt(idx)
    const cardioEntry = m === 'cardio'
    const isLastUnit = unitIdx >= units.length - 1
    let askTop = false, exJustDone = false, workoutDone = false, checked = false
    mutEntry(idx, e => {
      e.sets[i].done = !e.sets[i].done
      checked = e.sets[i].done
      if (e.sets[i].done) {
        beep(S.sound, 1040, 0.12)
        const unitDone = unit.every(ui => (ui === idx ? e : A.entries[ui]).sets.every(x => x.done))
        if (unitDone && isLastUnit) workoutDone = true
        const loaded = m === 'reps' && !(isBw({ ...(e.target || {}), id: e.id }) && !e.sets.some(x => x.w > 0))
        if (e.sets.every(x => x.done)) { exJustDone = true; if (loaded && !e.asked) { e.asked = true; askTop = true } }
      }
    })

    if (askTop) topWeightSheet(idx)
    else if (workoutDone) workoutCompleteSheet()
    else if (exJustDone && cardioEntry) useUI.getState().toast(t('Cardio logged'))
    else if (exJustDone && m === 'time') useUI.getState().toast(t('Hold logged'))

    const fresh = useStore.getState().S.active
    if (fresh && checked && fresh.entries[idx]) {
      const progress = setProgressHighWater(fresh.entries[idx], progressHighWater.current[idx] || 0)
      progressHighWater.current[idx] = progress.highWater
      if (!progress.isNew) return

      const freshUnits = supersetUnits(fresh.entries)
      const freshUnit = freshUnits.find(u => u.includes(idx))
      const freshUnitIdx = freshUnits.indexOf(freshUnit)
      const freshLastUnit = freshUnitIdx >= freshUnits.length - 1
      const freshUnitDone = freshUnit?.every(ui => fresh.entries[ui].sets.every(x => x.done))

      // Singleton units are ordinary exercises: preserve their historical between-set rest,
      // while final sets finish quietly and never enter superset navigation.
      if (freshUnitDone) stopRest()
      if (!freshUnit || freshUnit.length <= 1) {
        if (!freshUnitDone) startRest(S.restSec)
        return
      }

      const step = supersetFlowStep(fresh.entries, freshUnit, idx)
      if (!step) return
      if (step.unitDone) {
        if (!freshLastUnit) {
          const nextUnit = freshUnits[freshUnitIdx + 1]
          // The top-weight sheet's explicit "Just close" path owns the choice not to advance.
          if (!askTop && nextUnit?.length) update(s => { if (s.active) s.active.cur = nextUnit[0] })
          startRest(S.restSec)
        }
      } else {
        if (step.nextIdx != null) update(s => { if (s.active) s.active.cur = step.nextIdx })
        if (step.roundDone) startRest(S.restSec)
      }
    }
  }

  const exDone = A.entries.filter(e => e.sets.length && e.sets.every(s => s.done)).length
  const allDone = A.entries.length > 0 && exDone === A.entries.length

  const blockProps = idx => ({
    entryIdx: idx,
    onToggle: i => toggle(idx, i),
    onField: (i, f, v) => setField(idx, i, f, v),
    onAddSet: () => addSet(idx),
    onRemoveSet: () => removeSet(idx),
    onAddWarmup: () => addWarmup(idx),
    onRemoveSetAt: i => removeSetAt(idx, i),
    onStartTimed: i => startTimed(idx, i),
    onMoveUp: idx > 0 ? () => moveExercise(idx, -1) : null,
    onMoveDown: idx < A.entries.length - 1 ? () => moveExercise(idx, 1) : null,
    onRemove: () => confirmRemoveExercise(idx),
  })

  const exerciseList = []
  for (let uIdx = 0; uIdx < units.length; uIdx++) {
    const unitArr = units[uIdx]
    if (unitArr.length > 1) {
      exerciseList.push(
        <motion.div
          key={'ss-' + unitArr.join('-')}
          layout
          className="ss-card"
          transition={LAYOUT_T}
        >
          {unitArr.map((idx, k) => (
            <Fragment key={idx}>
              {k > 0 && (
                <PairLink
                  a={unitArr[k - 1]}
                  b={idx}
                  linked
                  label={t('Unpair')}
                  onClick={() => unpairAt(unitArr[0])}
                />
              )}
              <motion.div
                layout
                layoutId={'wex-' + idx}
                className="wex-wrap"
                ref={el => { exRefs.current[idx] = el }}
                transition={LAYOUT_T}
              >
                <ExerciseBlock
                  {...blockProps(idx)}
                  compact
                  ssPos={unitArr.length > 1 ? (k === 0 ? 'top' : k === unitArr.length - 1 ? 'bot' : 'mid') : null}
                />
              </motion.div>
            </Fragment>
          ))}
        </motion.div>
      )
      continue
    }
    const idx = unitArr[0]
    const nextUnit = units[uIdx + 1]
    const nextIdx = nextUnit?.length === 1 ? nextUnit[0] : null

    exerciseList.push(
      <Fragment key={'ex-' + idx}>
        <motion.div
          layout
          layoutId={'wex-' + idx}
          className="wex-wrap"
          ref={el => { exRefs.current[idx] = el }}
          transition={LAYOUT_T}
        >
          <ExerciseBlock {...blockProps(idx)} />
        </motion.div>
        {nextIdx != null && (
          <PairLink
            a={idx}
            b={nextIdx}
            label={t('Make superset with next')}
            onClick={() => pairAt(idx, nextIdx)}
          />
        )}
      </Fragment>
    )
  }

  return (
    <>
    <div className="narrow">
      <div className="w-hdr">
        <button className="iconbtn" aria-label={t('Discard')} onClick={() => confirmSheet({ title: t('Discard workout?'), message: t('The sets you logged in this session will be lost.'), confirmText: t('Discard'), danger: true, onConfirm: () => { update(s => { s.active = null }); stopRest(); nav('/home') } })}><Icon name="xmark" /></button>
        <div className="w-title">
          <input
            defaultValue={A.name}
            onChange={e => update(s => { if (s.active) s.active.name = e.target.value }, true)}
          />
          <div className="w-meta">
            <Elapsed start={A.start} /> · {t('{0} sets', done + '/' + total)}
          </div>
        </div>
        <button className="iconbtn" style={{ color: 'var(--acc)' }} aria-label={t('Finish')} onClick={finishWorkout}><Icon name="check" /></button>
      </div>

      <div className="wprog"><i style={{ width: (total ? done / total * 100 : 0) + '%' }} /></div>

      {/* Continuous All-in-One Exercise List (Hevy Style) */}
      {A.entries.length > 0 ? (
        <MotionConfig reducedMotion="user">
          <LayoutGroup id="workout-exercises">
            <div className="w-list" style={{ marginTop: 12 }}>{exerciseList}</div>
          </LayoutGroup>
        </MotionConfig>
      ) : (
        <div className="empty"><div className="ico"><Icon name="shuffle" /></div>{t('Freestyle workout — add your first exercise.')}</div>
      )}

      {/* Add Exercise Button */}
      <div style={{ marginTop: 14, marginBottom: 8 }}>
        <Button
          variant="primary"
          icon="plus"
          onClick={() => exercisePicker(ex => {
            const routine = S.routines.find(r => r.id === A.routineId)
            const freestyle = !A.routineId
            const seed = freestyle ? freestyleConfig(S, { id: ex.id, ...defaultConfig(ex.id) }) : null
            exConfigSheet(ex, null, cfg => update(s => {
              const full = { ...cfg, id: ex.id }
              const plan = freestyle ? null : nextPrescription(s, full, s.routines.find(r => r.id === s.active.routineId))
              const sets = buildSets(s, full, freestyle ? { preferLast: true } : undefined)
              const progressed = freestyle ? sets : applyPrescription(sets, plan)
              s.active.entries.push({ id: ex.id, target: { ...cfg }, plan, sets: applyIntensifierPlan(progressed, full) })
              s.active.cur = s.active.entries.length - 1
            }), null, routine, seed)
          })}
        >
          {t('+ Add exercise to workout')}
        </Button>
      </div>
    </div>

    <div className="finish-dock">
      <Button variant="primary" icon="check" className="finish-btn" onClick={finishWorkout}>
        {allDone ? t('Finish workout') : t('Finish workout · {0} done', exDone + '/' + A.entries.length)}
      </Button>
    </div>
    </>
  )
}

export default function Workout() {
  const active = useStore(s => s.S.active)
  return active ? <ActiveWorkout /> : <StartChooser />
}
