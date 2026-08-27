import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { isCardio, smOf } from '../lib/exercises.js'
import { bestWeightFor } from '../lib/history.js'
import { fmtDate, fmtNum, fmtVol } from '../lib/format.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import { musclesOf } from '../lib/muscles.js'
import { exerciseProgressSeries, exerciseHistory } from '../lib/exercise-detail.js'
import { best1RM } from '../lib/onerm.js'
import BodyMap from './BodyMap.jsx'
import Media from './Media.jsx'
import LineChart from './LineChart.jsx'
import Icon from './Icon.jsx'
import { Segmented } from './ui.jsx'

export default function ExerciseSummaryPanel({
  ex,
  compact = false,
  collapsible = false,
  showMedia = true,
  showMeta = true,
  showPrs = true,
}) {
  const st = useStore(s => s.S)
  const [range, setRange] = useState(90)
  const [metric, setMetric] = useState('top')
  const [expanded, setExpanded] = useState(!collapsible)
  const progress = useMemo(() => exerciseProgressSeries(st, ex.id, { range }), [st.workouts, st.unit, ex.id, range])
  const history = useMemo(() => exerciseHistory(st, ex.id), [st.workouts, ex.id])
  const best = bestWeightFor(st, ex.id)
  const bestE1 = best1RM(st, ex.id)
  const muscleLoad = useMemo(() => musclesOf(ex), [ex])
  const primaries = ex.primaries?.length ? ex.primaries : (ex.tg ? [ex.tg] : [])
  const secondaries = (ex.secondaries?.length ? ex.secondaries : smOf(ex)).slice(0, 5)
  const onE1 = progress.showE1 && metric === 'e1rm'
  const onVol = progress.showVol && metric === 'volume'
  const chartPts = onE1 ? progress.e1Pts : onVol ? progress.volPts : progress.topPts
  const chartBest = onE1 ? progress.e1Best?.est : onVol ? progress.volBest : progress.topBest
  const chartUnit = onVol ? st.unit : progress.exUnit
  const metricOpts = [{ value: 'top', label: t('Top set') }]
  if (progress.showE1) metricOpts.push({ value: 'e1rm', label: t('Est. 1RM') })
  if (progress.showVol) metricOpts.push({ value: 'volume', label: t('Best volume') })

  const body = <>
    {!compact && <BodyMap load={muscleLoad} body={st.body} className="ex-load" />}
    {showMedia && <Media ex={ex} />}
    {showMeta && <>
      <div className="capitalize" style={{ margin: '12px 0 6px', fontWeight: 700 }}>{exerciseNameFor(ex)}</div>
      {primaries.length > 0 && <div className="small" style={{ marginBottom: 4 }}>
        <span className="muted">{t('Primary')}:</span> {primaries.map((s, i) => <span key={i}>{i ? ', ' : ''}{t(s)}</span>)}
      </div>}
      {secondaries.length > 0 && <div className="small" style={{ marginBottom: 10 }}>
        <span className="muted">{t('Secondary')}:</span> {secondaries.map((s, i) => <span key={i}>{i ? ', ' : ''}{t(s)}</span>)}
      </div>}
      {ex.desc && <div className="exnote">{ex.desc}</div>}
    </>}
    {history.length > 0 ? <div className={compact ? undefined : 'ex-chart'}>
      <div className="row between" style={{ margin: '12px 0 6px', alignItems: 'flex-end' }}>
        <div>
          {chartBest > 0 && <div className="stat-v">{onVol ? fmtVol(chartBest, st.unit) : fmtNum(chartBest) + ' ' + chartUnit}</div>}
          {chartPts.length > 0 && <div className="small dim">{fmtDate(chartPts[chartPts.length - 1].d, true)}</div>}
        </div>
        <Segmented className="seg-range" style={{ marginBottom: 0 }} value={range} onChange={setRange}
          options={[{ value: 30, label: '1M' }, { value: 90, label: '3M' }, { value: 365, label: '1Y' }, { value: 0, label: t('All') }]} />
      </div>
      {metricOpts.length > 1 && <Segmented className="seg-range" value={onVol ? 'volume' : onE1 ? 'e1rm' : 'top'} onChange={setMetric} options={metricOpts} />}
      <div className="chart"><LineChart points={chartPts} h={compact ? 80 : 150} unit={chartUnit} color="var(--blue)" /></div>
      <div className="small dim" style={{ marginTop: 6 }}>
        {onE1 ? t('Estimated 1RM per workout') : onVol ? t('Best volume per workout') : progress.curCardio ? t('Top speed per workout') : progress.curTimed ? t('Longest hold per workout') : t('Best set weight per workout')}
        {chartBest > 0 && <> · {t('Best:')} <b className="accent">{onVol ? fmtVol(chartBest, st.unit) : fmtNum(chartBest) + ' ' + chartUnit}</b></>}
      </div>
    </div> : <div className="muted small" style={{ margin: '12px 0' }}>{t('No logged sessions yet')}</div>}
    {showPrs && (best > 0 || bestE1) && <>
      <h4 className="sec" style={{ marginTop: 14 }}><Icon name="trophy" style={{ fontSize: 14, color: 'var(--yellow)', marginRight: 6 }} />{t('PRs')}</h4>
      {best > 0 && !isCardio(ex) && <div className="row between small" style={{ padding: '6px 0' }}>
        <span className="muted">{t('Top set')}</span><b className="accent">{fmtNum(best)} {st.unit}</b>
      </div>}
      {bestE1 && !isCardio(ex) && <div className="row between small" style={{ padding: '6px 0' }}>
        <span className="muted">{t('Est. 1RM')}</span><b className="accent">{fmtNum(bestE1.est)} {st.unit}</b>
      </div>}
    </>}
  </>

  if (collapsible) {
    return (
      <div data-testid="exercise-summary" style={{ margin: '6px 0 8px' }}>
        <button
          type="button"
          className="chip"
          aria-expanded={expanded}
          aria-label={t('Progress summary')}
          style={{ fontSize: 11, padding: '4px 10px', color: 'var(--acc)', borderColor: 'var(--acc)', background: 'var(--surface-2)', cursor: 'pointer', marginBottom: expanded ? 8 : 0 }}
          onClick={() => setExpanded(v => !v)}
        >
          <Icon name={expanded ? 'chevronUp' : 'chevronDown'} /> {t('Progress summary')}
        </button>
        {expanded && body}
      </div>
    )
  }

  return <div data-testid="exercise-summary" className={compact ? undefined : 'ex-summary'}>{body}</div>
}
