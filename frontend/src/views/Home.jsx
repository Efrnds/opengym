import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine, effectiveRoutineId, streakWeeks, lastBW, setsDoneActive } from '../lib/history.js'
import { fmtNum, fmtDate, todayISO, isoOf, weekKey, DAYS, exCount } from '../lib/format.js'
import { t, dateLocale } from '../lib/i18n.js'
import { bwSheet, goalSheet, dayOverrideSheet, calendarSheet, startFlow, loadStarterPlan, bwDeltaColor } from '../sheets.jsx'
import LineChart from '../components/LineChart.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { glyphOf } from '../lib/glyphs.js'

const UP = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } }
const T = i => ({ duration: 0.38, delay: i * 0.06, ease: [0.32, 0.72, 0, 1] })

// Home = what to do now + a quick glance. Deep charts & history live in Stats.
export default function Home() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const [weekOffset, setWeekOffset] = useState(0)

  const today = new Date()
  const routine = effectiveRoutine(S, todayISO())
  const todayOvr = S.dayPlan[todayISO()] !== undefined
  const bw = lastBW(S)
  const prevBW = S.bodyweight.length > 1 ? S.bodyweight[S.bodyweight.length - 2] : null
  const delta = bw && prevBW ? bw.w - prevBW.w : null

  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)
  const doneDays = new Set(S.workouts.map(w => w.d))
  const strip = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    const iso = isoOf(d)
    const eff = effectiveRoutineId(S, iso), ovr = S.dayPlan[iso] !== undefined, done = doneDays.has(iso)
    const dot = done ? ' done' : ovr && eff ? ' ovr' : eff ? ' plan' : ''
    strip.push(<button type="button" key={i} className={'wday' + (iso === todayISO() ? ' today' : '')} onClick={() => dayOverrideSheet(iso)}>
      <div className="lbl">{t(DAYS[d.getDay()])}</div><div className="num">{d.getDate()}</div><div className={'dot' + dot} /></button>)
  }
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const wkLabel = weekOffset === 0 ? t('This week') : `${monday.getDate()} ${monday.toLocaleDateString(dateLocale(), { month: 'short' })} – ${sunday.getDate()} ${sunday.toLocaleDateString(dateLocale(), { month: 'short' })}`

  const wThisWeek = S.workouts.filter(w => weekKey(w.d) === weekKey(todayISO())).length
  const plannedPerWeek = Object.keys(S.week).filter(k => S.week[k]).length
  const streak = streakWeeks(S)
  const bwPoints = S.bodyweight.slice(-30).map(b => ({ t: b.t || new Date(b.d).getTime(), y: b.w, d: b.d }))

  const onToday = () => { if (S.active) nav('/workout'); else if (routine) startFlow(routine.id); else dayOverrideSheet(todayISO()) }

  const heroTitle = S.active
    ? S.active.name
    : routine
      ? routine.name
      : t('Rest day')
  const heroSub = S.active
    ? t('{0} sets', setsDoneActive(S.active) + '/' + S.active.entries.reduce((n, e) => n + e.sets.length, 0))
    : routine
      ? exCount(routine.ex.length) + (todayOvr ? ' · ' + t('rescheduled') : '')
      : t('Rest day')
  const heroIcon = S.active ? 'timer' : routine ? glyphOf(routine.emoji) : 'moon'
  const heroCta = S.active ? t('Resume') : routine ? t('Start') : t('Plan')

  return <div className="narrow home-v2">
    <motion.header className="home-top" {...UP} transition={T(0)}>
      <div>
        <p className="home-greet">{user ? t('Hi {0}', user.name) : 'openGym'}</p>
        <p className="home-date">{today.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>
      <button className="iconbtn home-gear" onClick={() => nav('/settings')} aria-label={t('Settings')}><Icon name="gear" /></button>
    </motion.header>

    <motion.button
      type="button"
      className={'home-hero' + (S.active ? ' live' : routine ? ' ready' : ' rest')}
      {...UP}
      transition={T(1)}
      onClick={onToday}
    >
      <div className="home-hero-glow" aria-hidden="true" />
      <div className="home-hero-body">
        <span className={'home-hero-icon' + (S.active ? ' pulse' : '')}>
          <Icon name={heroIcon} />
        </span>
        <div className="home-hero-copy">
          <span className="home-hero-kicker">{t('Today')}</span>
          <span className="home-hero-title">{heroTitle}</span>
          <span className="home-hero-sub">{heroSub}</span>
        </div>
        <span className={'home-hero-cta' + (S.active ? ' warn' : '')}>{heroCta}</span>
      </div>
    </motion.button>

    <motion.section className="home-week" {...UP} transition={T(2)}>
      <div className="home-week-nav">
        <button type="button" className="iconbtn home-week-btn" onClick={() => setWeekOffset(w => w - 1)} aria-label="Previous week"><Icon name="chevronLeft" /></button>
        <span className="home-week-label">{wkLabel}</span>
        <button type="button" className="iconbtn home-week-btn" onClick={() => setWeekOffset(w => w + 1)} aria-label="Next week"><Icon name="chevronRight" /></button>
      </div>
      <div className="week">{strip}</div>
    </motion.section>

    <motion.div className="home-metrics" {...UP} transition={T(3)}>
      <button type="button" className="metric-tile" onClick={() => calendarSheet()}>
        <Icon name="flame" className="metric-ico warn" />
        <span className="metric-val">{streak}</span>
        <span className="metric-lbl">{t('Week streak')}</span>
      </button>
      <button type="button" className="metric-tile" onClick={() => calendarSheet()}>
        <Icon name="dumbbell" className="metric-ico acc" />
        <span className="metric-val">{wThisWeek}{plannedPerWeek ? <small>/{plannedPerWeek}</small> : ''}</span>
        <span className="metric-lbl">{t('this week')}</span>
      </button>
    </motion.div>

    {!S.routines.length && !S.active && (
      <motion.section className="home-onboard" {...UP} transition={T(4)}>
        <Icon name="sparkles" className="home-onboard-ico" />
        <p className="home-onboard-title">{t('Welcome!')}</p>
        <p className="home-onboard-sub">{t('Set up your weekly routine to get going — or load a ready-made Push / Pull / Legs plan.')}</p>
        <Button variant="primary" icon="sparkles" onClick={loadStarterPlan}>{t('Load starter plan (PPL)')}</Button>
        <div style={{ height: 8 }} />
        <Button onClick={() => nav('/plan')}>{t('Build my own plan')}</Button>
      </motion.section>
    )}

    <motion.section className="home-bw" {...UP} transition={T(5)}>
      <div className="home-bw-hd">
        <h2>{t('Body weight')}</h2>
        <div className="row" style={{ gap: 6 }}>
          <Button size="sm" icon="target" style={S.targetW ? { color: 'var(--pr)' } : undefined} onClick={goalSheet}>{S.targetW ? fmtNum(S.targetW) : t('Goal')}</Button>
          <Button size="sm" icon="plus" onClick={() => bwSheet()}>{t('Log')}</Button>
        </div>
      </div>
      {bw ? <>
        <div className="home-bw-now">
          <span className="home-bw-num">{fmtNum(bw.w)}</span>
          <span className="home-bw-unit">{S.unit}</span>
          {!!delta && (
            <span className="home-bw-delta" style={{ color: bwDeltaColor(delta, bw.w) }}>
              <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} />
              {fmtNum(Math.abs(delta))}
            </span>
          )}
          <span className="home-bw-when">{fmtDate(bw.d, true)}</span>
        </div>
        {S.targetW && (
          <p className="home-bw-goal">
            <Icon name="target" />
            {t('Goal')} {fmtNum(S.targetW)} {S.unit} · {Math.abs(S.targetW - bw.w) < 0.05 ? t('reached!') : t(S.targetW > bw.w ? '{0} to gain' : '{0} to lose', fmtNum(Math.abs(S.targetW - bw.w)) + ' ' + S.unit)}
          </p>
        )}
        <div className="chart home-bw-chart"><LineChart points={bwPoints} h={100} unit={S.unit} goal={S.targetW} /></div>
      </> : <p className="home-bw-empty">{t("No entries yet — log your weight to start the curve. It's also asked before every workout.")}</p>}
    </motion.section>
  </div>
}
