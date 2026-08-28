import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { DAYN, uid, exCount } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { dayAssignSheet, loadStarterPlan, planToolsSheet, programGeneratorSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Section, Row } from '../components/ui.jsx'
import { glyphOf, DEFAULT_GLYPH } from '../lib/glyphs.js'

export default function Plan() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)

  const addRoutine = () => {
    const r = { id: uid(), name: t('New routine'), emoji: DEFAULT_GLYPH, ex: [] }
    update(s => { s.routines.push(r) })
    nav('/plan/r/' + r.id)
  }

  return <div className="narrow plan-v2">
    <header className="plan-top">
      <div>
        <h1 className="plan-title">{t('Plan')}</h1>
        <p className="plan-sub">{t('Your weekly routine')}</p>
      </div>
      <div className="plan-top-actions">
        <button className="iconbtn" onClick={programGeneratorSheet} aria-label={t('Guided Trainer')} title={t('Guided Trainer')}><Icon name="sparkles" /></button>
        <button className="iconbtn" onClick={planToolsSheet} aria-label={t('Share your plan')} title={t('Share your plan')}><Icon name="upload" /></button>
      </div>
    </header>

    <div className="plan-cols cols">
      <Section title={t('Week schedule')} className="plan-week">
        {[1, 2, 3, 4, 5, 6, 0].map(d => {
          const r = S.routines.find(x => x.id === S.week[d])
          return (
            <Row
              key={d}
              title={t(DAYN[d])}
              value={r ? r.name : t('Rest')}
              icon={r ? glyphOf(r.emoji) : 'moon'}
              iconTint={r ? undefined : 'var(--label-3)'}
              accessory="chevron"
              onClick={() => dayAssignSheet(d)}
            />
          )
        })}
      </Section>

      <div className="plan-routines-pane">
        <div className="plan-routines-hdr">
          <h2 className="v2-sec">{t('Routines')}</h2>
          <div className="plan-routines-actions">
            <Button size="sm" variant="tinted" icon="sparkles" onClick={programGeneratorSheet}>{t('Trainer')}</Button>
            <Button size="sm" variant="tinted" icon="plus" onClick={addRoutine}>{t('New')}</Button>
          </div>
        </div>
        {S.routines.length ? (
          <div className="plan-routine-grid">
            {S.routines.map(r => (
              <button key={r.id} type="button" className="plan-routine-card" onClick={() => nav('/plan/r/' + r.id)}>
                <span className="plan-routine-glyph"><Icon name={glyphOf(r.emoji)} /></span>
                <span className="plan-routine-body">
                  <span className="plan-routine-name">{r.name}</span>
                  <span className="plan-routine-meta">{exCount(r.ex.length)}</span>
                </span>
                <Icon name="chevronRight" className="plan-routine-chev" />
              </button>
            ))}
          </div>
        ) : <>
          <div className="empty"><div className="ico"><Icon name="clipboard" /></div>{t('No routines yet.')}<br />{t('Create one or load the starter plan.')}</div>
          <Button icon="sparkles" variant="primary" onClick={programGeneratorSheet}>{t('Smart Trainer (Build program)')}</Button>
          <div style={{ height: 8 }} />
          <Button icon="clipboard" onClick={loadStarterPlan}>{t('Load starter plan (Push / Pull / Legs)')}</Button>
        </>}
      </div>
    </div>
  </div>
}
