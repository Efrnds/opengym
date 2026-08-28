import { useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from '../store/useStore.js'
import { exOr } from '../lib/exercises.js'
import { activeProfile, exAvailable } from '../lib/equipment.js'
import { uid } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { supersetUnits, cleanupSg, reorderExerciseAt } from '../lib/history.js'
import { glyphPicker, exercisePicker, exConfigSheet, confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { glyphOf } from '../lib/glyphs.js'
import { Button, Section, SelectRow } from '../components/ui.jsx'
import { POLICIES_FOR, POLICY_NAME, POLICY_DESC } from '../lib/progression.js'
import RoutineSummary from '../components/RoutineSummary.jsx'
import RoutineExerciseList from '../components/RoutineExerciseList.jsx'

export default function RoutineEdit() {
  const nav = useNavigate()
  const { id } = useParams()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const r = S.routines.find(x => x.id === id)
  const canDrag = !S.active
  useEffect(() => { if (!r) nav('/plan') }, [!!r])
  useEffect(() => () => useStore.getState().autoBackupNow(), [])
  if (!r) return null

  const edit = fn => update(s => { fn(s.routines.find(x => x.id === id).ex) })
  const move = (i, dir) => edit(ex => { const j = i + dir; if (j < 0 || j >= ex.length) return;[ex[i], ex[j]] = [ex[j], ex[i]]; cleanupSg(ex) })
  const reorder = (from, to) => edit(ex => { const next = reorderExerciseAt(ex, from, to); ex.splice(0, ex.length, ...next) })
  const toggleLink = i => edit(ex => {
    if (i < 1) return
    const cur = ex[i], prev = ex[i - 1]
    if (cur.sg && prev.sg && cur.sg === prev.sg) delete cur.sg
    else { const gid = prev.sg || ('sg' + uid()); prev.sg = gid; cur.sg = gid }
    cleanupSg(ex)
  })

  const units = supersetUnits(r.ex)
  const unitFirst = new Set(units.filter(u => u.length > 1).map(u => u[0]))
  const inSS = new Set(units.filter(u => u.length > 1).flat())
  const profile = activeProfile(S)
  const missingCount = profile ? r.ex.filter(e => !exAvailable(S, exOr(e.id))).length : 0

  return <div className="narrow routine-v2">
    <header className="routine-top">
      <button className="iconbtn" onClick={() => nav('/plan')} aria-label={t('Plan')}><Icon name="chevronLeft" /></button>
      <input
        className="routine-name"
        defaultValue={r.name}
        onChange={e => update(s => { s.routines.find(x => x.id === id).name = e.target.value.trim() || t('Routine') })}
      />
      <button
        className="iconbtn routine-glyph-btn"
        aria-label={t('Pick an icon')}
        onClick={() => glyphPicker(r.emoji, g => update(s => { s.routines.find(x => x.id === id).emoji = g }))}
      >
        <Icon name={glyphOf(r.emoji)} />
      </button>
    </header>

    <Section
      title={t('Progression')}
      footer={t('Applies to every exercise in this routine that does not set its own rule.')}
    >
      <SelectRow
        icon="chartLine"
        title={t('Progression')}
        sheetTitle={t('Progression')}
        value={r.prog || 'linear'}
        onChange={v => update(s => { s.routines.find(x => x.id === id).prog = v })}
        options={POLICIES_FOR.reps.map(p => ({ value: p, label: t(POLICY_NAME[p]), subtitle: t(POLICY_DESC[p]) }))}
      />
    </Section>

    {missingCount > 0 && (
      <div className="routine-warn">
        <Icon name="warning" />
        <span>{t('{0} of {1} exercises need equipment outside "{2}"', missingCount, r.ex.length, profile.name)}</span>
      </div>
    )}

    {r.ex.length ? (
      <div className="sect">
        <h2 className="sect-t">{t('Exercises')}</h2>
        <RoutineExerciseList
          exercises={r.ex}
          profile={profile}
          S={S}
          unitFirst={unitFirst}
          inSS={inSS}
          canDrag={canDrag}
          onOpen={(i, ex, entry) => {
            exConfigSheet(ex, entry, cfg => edit(x => { x[i] = { id: x[i].id, sg: x[i].sg, ...cfg } }), () => edit(x => { x.splice(i, 1); cleanupSg(x) }), r)
          }}
          onToggleLink={toggleLink}
          onMove={move}
          onReorder={reorder}
        />
      </div>
    ) : (
      <div className="empty"><div className="ico"><Icon name="dumbbell" /></div>{t('No exercises yet — add your first one.')}</div>
    )}

    {r.ex.length > 0 && <RoutineSummary routine={r} body={S.body} restSec={S.restSec} />}

    {canDrag && r.ex.length > 1 && (
      <p className="routine-hint">
        <Icon name="grip" />
        {t('Hold the handle and drag to reorder exercises.')}
      </p>
    )}
    <p className="routine-hint">
      <Icon name="link" />
      {t('Tap the link button on an exercise to superset it with the one above — you’ll do them back-to-back.')}
    </p>

    <Button
      variant="primary"
      onClick={() => exercisePicker(ex => exConfigSheet(ex, null, cfg => edit(x => { x.push({ id: ex.id, ...cfg }) }), null, r))}
      icon="plus"
    >
      {t('Add exercise')}
    </Button>

    <div style={{ height: 10 }} />

    <Button
      variant="danger"
      onClick={() => confirmSheet({
        title: t('Delete routine?'),
        message: t('"{0}" and its exercises will be removed.', r.name),
        confirmText: t('Delete'),
        danger: true,
        onConfirm: () => {
          update(s => {
            s.routines = s.routines.filter(x => x.id !== id)
            Object.keys(s.week).forEach(k => { if (s.week[k] === id) delete s.week[k] })
            Object.keys(s.dayPlan).forEach(k => { if (s.dayPlan[k] === id) delete s.dayPlan[k] })
          })
          nav('/plan')
        }
      })}
    >
      {t('Delete routine')}
    </Button>
  </div>
}
