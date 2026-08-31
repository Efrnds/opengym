import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { fmtDate, fmtNum } from '../lib/format.js'
import { dietHistoryDays } from '../lib/diet.js'
import { WorkoutRow, workoutDetailSheet, bwSheet, confirmSheet } from '../sheets.jsx'
import { Segmented, Button } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

export default function History() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [tab, setTab] = useState('workouts')

  const dietDays = dietHistoryDays(S, 90)
  const checks = [...(S.vaultChecks || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const bodyweights = [...(S.bodyweight || [])].sort((a, b) => (b.d || '').localeCompare(a.d || ''))
  const progressCount = checks.length || bodyweights.length

  return <>
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/stats')} aria-label={t('Stats')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 12 }}>
        <h1>{t('History')}</h1>
        <div className="sub">
          {tab === 'workouts' && t('{0} workouts', S.workouts.length)}
          {tab === 'progress' && t('{0} entries', progressCount)}
          {tab === 'diet' && t('{0} days', dietDays.length)}
        </div>
      </div>
    </div>

    <div className="narrow" style={{ marginBottom: 12 }}>
      <Segmented
        className="seg-glass"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'workouts', label: t('Workouts') },
          { value: 'progress', label: t('Photos & Weight') },
          { value: 'diet', label: t('Nutrition log') },
        ]}
      />
    </div>

    {tab === 'workouts' && (
      S.workouts.length
        ? <div className="list">{[...S.workouts].reverse().map(w => <WorkoutRow key={w.id} w={w} onClick={() => workoutDetailSheet(w)} />)}</div>
        : <div className="empty"><div className="ico"><Icon name="history" /></div>{t('No workouts yet.')}</div>
    )}

    {tab === 'progress' && (
      (checks.length || bodyweights.length) ? (
        <div className="list">
          <div className="row between" style={{ padding: '4px 4px 10px' }}>
            <span className="muted small">{t('Weight & photo checks')}</span>
            <div className="row gap" style={{ gap: 8 }}>
              <Button size="sm" variant="tinted" icon="camera" onClick={() => nav('/vault')}>{t('Photos')}</Button>
              <Button size="sm" variant="tinted" icon="scale" onClick={() => bwSheet()}>{t('Log weight')}</Button>
            </div>
          </div>

          {checks.map(c => (
            <div key={c.id} className="card" style={{ marginBottom: 12 }}>
              <div className="row between">
                <div className="row gap" style={{ alignItems: 'center', gap: 10 }}>
                  <span className="lrow-i" style={{ width: 34, height: 34, borderRadius: 8 }}><Icon name="camera" /></span>
                  <div>
                    <div className="tt">{fmtDate(c.date, true)}</div>
                    <div className="ss">{c.weightKg ? `${fmtNum(c.weightKg)} ${S.unit}` : t('No weight')}</div>
                  </div>
                </div>
                <button type="button" className="iconbtn" onClick={() => confirmSheet({
                  title: t('Delete this check?'), danger: true, confirmText: t('Delete'),
                  onConfirm: () => update(s => { s.vaultChecks = s.vaultChecks.filter(x => x.id !== c.id) }),
                })} aria-label={t('Delete')}><Icon name="trash" /></button>
              </div>
              {(c.front || c.side || c.back) && (
                <div className="diet-pics" style={{ marginTop: 8 }}>
                  {c.front && <img src={c.front} alt={t('Front')} style={{ borderRadius: 8 }} />}
                  {c.side && <img src={c.side} alt={t('Side')} style={{ borderRadius: 8 }} />}
                  {c.back && <img src={c.back} alt={t('Back photo')} style={{ borderRadius: 8 }} />}
                </div>
              )}
              {c.notes ? <p className="muted small" style={{ marginTop: 6 }}>{c.notes}</p> : null}
            </div>
          ))}

          {bodyweights.filter(b => !checks.some(c => c.date === b.d)).map((b, i) => (
            <div key={b.d + i} className="item">
              <span className="lrow-i" style={{ width: 34, height: 34, borderRadius: 8 }}><Icon name="chart" /></span>
              <div className="grow">
                <div className="tt">{fmtDate(b.d, true)}</div>
                <div className="ss">{fmtNum(b.w)} {S.unit}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="ico"><Icon name="camera" /></div>
          <div>{t('No photos or weight logged yet.')}</div>
          <div style={{ marginTop: 12 }}>
            <Button size="sm" variant="primary" onClick={() => nav('/vault')}>{t('Log weight & photos')}</Button>
          </div>
        </div>
      )
    )}

    {tab === 'diet' && (
      dietDays.length
        ? <div className="list">
          {dietDays.map(d => (
            <div key={d.d} className="item">
              <span className="lrow-i" style={{ width: 34, height: 34, borderRadius: 8 }}><Icon name="clipboard" /></span>
              <div className="grow">
                <div className="tt">{fmtDate(d.d, true)}</div>
                <div className="ss">
                  {d.kcal}{d.target ? '/' + d.target : ''} kcal · P {d.protein} · C {d.carbs} · G {d.fats}
                  {' · '}{d.water} ml · {t('Burned')} {d.burned}
                </div>
              </div>
            </div>
          ))}
        </div>
        : <div className="empty"><div className="ico"><Icon name="clipboard" /></div>{t('No nutrition history yet.')}</div>
    )}
  </>
}
