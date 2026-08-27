import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { isCardio } from '../lib/exercises.js'
import { setLabel } from '../lib/history.js'
import { fmtDate, fmtNum } from '../lib/format.js'
import { t, instrFor, getLang, INSTR_LANGS, exerciseNameFor } from '../lib/i18n.js'
import { exerciseHistory, exerciseClassification } from '../lib/exercise-detail.js'
import { estimate1RM, best1RM, REP_CAP } from '../lib/onerm.js'
import ExerciseSummaryPanel from './ExerciseSummaryPanel.jsx'
import Stepper from './Stepper.jsx'
import Icon from './Icon.jsx'
import { Segmented } from './ui.jsx'

function OneRM({ ex }) {
  const st = useStore(s => s.S)
  const best = best1RM(st, ex.id)
  const [w, setW] = useState(best ? best.w : (st.exWeights[ex.id] || {}).w || 20)
  const [r, setR] = useState(best ? best.r : 5)
  const est = estimate1RM(w, r)
  return <>
    <h4 className="sec">{t('Estimated 1RM')}</h4>
    {best && <div className="small" style={{ marginBottom: 8 }}>
      {t('From your log:')} <b className="accent">{fmtNum(best.est)} {st.unit}</b>
      <span className="dim"> · {t('{0} × {1} on {2}', fmtNum(best.w) + ' ' + st.unit, best.r, fmtDate(best.d, true))}</span>
    </div>}
    <div className="row cfgrow" style={{ marginBottom: 10 }}>
      <Stepper label={t('Weight ({0})', st.unit)} value={w} step={2.5} onChange={setW} />
      <Stepper label={t('Reps')} value={r} step={1} decimal={false} onChange={setR} />
    </div>
    <div className="row between" style={{ marginBottom: 4 }}>
      <span className="muted small">{t('Estimate')}</span>
      <b className="accent" style={{ fontSize: 20 }}>{est === null ? '—' : fmtNum(est) + ' ' + st.unit}</b>
    </div>
    <div className="small dim">{est === null
      ? t('Enter a weight and 1–{0} reps — beyond that an estimate is guesswork.', REP_CAP)
      : t('Epley formula — a calculation from one set, not a tested max.')}</div>
  </>
}

export default function ExerciseDetailTabs({
  ex,
  close,
  onWorkoutClick,
  extraTab,
  summaryFooter,
  defaultTab = 'summary',
}) {
  const st = useStore(s => s.S)
  const [tab, setTab] = useState(defaultTab)
  const history = useMemo(() => exerciseHistory(st, ex.id), [st.workouts, ex.id])
  const classification = useMemo(() => exerciseClassification(st, ex.id), [st.workouts, ex.id])
  const tabOpts = [
    { value: 'summary', label: t('Summary') },
    { value: 'history', label: t('History') },
    { value: 'instructions', label: t('Instructions') },
    { value: 'classifications', label: t('Classifications') },
  ]
  if (extraTab) tabOpts.push({ value: extraTab.value, label: extraTab.label })

  return <div className="ex-detail">
    <h3 className="capitalize">{exerciseNameFor(ex)}</h3>
    <Segmented className="seg-range ex-detail-tabs" value={tab} onChange={setTab} options={tabOpts} />

    {tab === 'summary' && <>
      <ExerciseSummaryPanel ex={ex} showMedia={false} />
      {summaryFooter}
    </>}

    {tab === 'history' && <>
      {history.length ? history.map(({ workout, entry }) => <div key={workout.id} className="item" style={{ marginBottom: 8 }}
        onClick={() => { close(); onWorkoutClick?.(workout) }}>
        <div className="grow">
          <div className="tt">{fmtDate(workout.d, true)}</div>
          <div className="ss">{(entry.sets || []).filter(s => s.done).map(s => setLabel(ex.id, s, entry.target)).join('  ·  ') || t('no sets')}</div>
        </div>
        <Icon name="chevronRight" className="chev" />
      </div>) : <div className="muted small">{t('No logged sessions yet')}</div>}
    </>}

    {tab === 'instructions' && <>
      {instrFor(ex).length > 0
        ? <>
          <h4 className="sec">{t('How to')}{!INSTR_LANGS.includes(getLang()) && <span className="dim" style={{ textTransform: 'none', letterSpacing: 0 }}> · {t('instructions in English')}</span>}</h4>
          <ol className="steps-list">{instrFor(ex).map((s, i) => <li key={i}>{s}</li>)}</ol>
        </>
        : <div className="muted small">{t('No instructions for this exercise yet.')}</div>}
      {!isCardio(ex) && <OneRM ex={ex} />}
    </>}

    {tab === 'classifications' && <>
      {classification ? <>
        <div className="card" style={{ marginBottom: 12, background: 'var(--surface-2)', padding: 12 }}>
          <div className="small muted">{t('Your rank')}</div>
          <div className="stat-v">#{classification.rank}<span className="dim" style={{ fontSize: 16 }}> / {classification.total}</span></div>
          <div className="small dim">{t('Among all logged exercises')}</div>
        </div>
        {classification.muscleRank != null && classification.primaryName && <>
          <div className="card" style={{ marginBottom: 12, background: 'var(--surface-2)', padding: 12 }}>
            <div className="small muted">{t('Among exercises targeting {0}', t(classification.primaryName))}</div>
            <div className="stat-v">#{classification.muscleRank}<span className="dim" style={{ fontSize: 16 }}> / {classification.muscleTotal}</span></div>
          </div>
        </>}
        <div className="row between small" style={{ padding: '6px 0', borderTop: 'var(--hair) solid var(--sep)' }}>
          <span className="muted">{t('Expected current 1RM')}</span><b className="accent">{fmtNum(classification.current)} {st.unit}</b>
        </div>
        <div className="row between small" style={{ padding: '6px 0' }}>
          <span className="muted">{t('Est. 1RM')}</span><span>{fmtNum(classification.est)} {st.unit}</span>
        </div>
        <div className="row between small" style={{ padding: '6px 0' }}>
          <span className="muted">{t('Retained strength')}</span><span>{Math.round(classification.decay * 100)}%</span>
        </div>
        <div className="small dim" style={{ marginTop: 10 }}>{t('Rankings use your own logged sets — no social comparison.')}</div>
      </> : <div className="muted small">{t('No strength estimates yet')}</div>}
    </>}

    {extraTab && tab === extraTab.value && extraTab.content}
  </div>
}
