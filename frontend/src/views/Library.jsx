import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { EXDB, BODYPARTS, allExercises, equipmentOf, matchExercise } from '../lib/exercises.js'
import { activeProfile, exAvailable } from '../lib/equipment.js'
import { bestWeightFor } from '../lib/history.js'
import { fmtNum } from '../lib/format.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import { Thumb } from '../components/Media.jsx'
import { exerciseDetailSheet, addToRoutineSheet, customExSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button, SearchField } from '../components/ui.jsx'

export default function Library() {
  const S = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')
  const [eq, setEq] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [shown, setShown] = useState(40)
  const profile = activeProfile(S)
  const base = allExercises(S).filter(e => (!bp || e.bp === bp) && matchExercise(e, q))
  const eqFiltered = (profile && !showAll) ? base.filter(e => exAvailable(S, e)) : base
  const eqOpts = equipmentOf(eqFiltered)
  const eqOn = eqOpts.includes(eq) ? eq : ''
  const f = eqOn ? eqFiltered.filter(e => e.eq === eqOn) : eqFiltered

  return <div className="narrow library-v2">
    <header className="lib-top">
      <h1 className="lib-title">{t('Exercises')}</h1>
      <p className="lib-sub">{t('{0} exercises with animations', EXDB.length)}</p>
    </header>

    <div className="lib-search-wrap">
      <SearchField
        placeholder={t('Search…')}
        value={q}
        onChange={e => { setQ(e.target.value); setShown(40) }}
        onClear={() => { setQ(''); setShown(40) }}
      />
    </div>

    {profile && (
      <div className="lib-profile-hint">
        <Icon name="dumbbell" />
        <span>{showAll ? t('Showing all equipment') : t('Showing what you have in "{0}"', profile.name)}</span>
        <button type="button" className="lib-profile-toggle" onClick={() => setShowAll(v => !v)}>
          {showAll ? t('Filter by "{0}"', profile.name) : t('Show all equipment')}
        </button>
      </div>
    )}

    <div className={'lib-chips' + (eqOpts.length > 1 ? '' : ' tail')}>
      <button type="button" className={'chip nocap' + (!bp ? ' on' : '')} onClick={() => { setBp(''); setEq(''); setShown(40) }}>{t('All')}</button>
      {BODYPARTS.map(b => (
        <button key={b} type="button" className={'chip' + (bp === b ? ' on' : '')} onClick={() => { setBp(b); setEq(''); setShown(40) }}>{t(b)}</button>
      ))}
    </div>

    {eqOpts.length > 1 && (
      <div className="lib-chips tail">
        <button type="button" className={'chip nocap' + (!eqOn ? ' on' : '')} onClick={() => { setEq(''); setShown(40) }}>{t('Any equipment')}</button>
        {eqOpts.map(x => (
          <button key={x} type="button" className={'chip' + (eqOn === x ? ' on' : '')} onClick={() => { setEq(x); setShown(40) }}>{t(x)}</button>
        ))}
      </div>
    )}

    <div className="sect-b lib-rows">
      <button type="button" className="lib-row lib-create" onClick={() => customExSheet(null, ex => exerciseDetailSheet(ex), q.trim())}>
        <div className="thumb thumb-x"><Icon name="sparkles" /></div>
        <div className="lib-row-m">
          <div className="lib-row-t">{t('Create your own exercise')}</div>
          <div className="lib-row-s">{t('name + body part, no animation')}</div>
        </div>
        <Icon name="plus" className="lib-row-chev" />
      </button>

      {f.slice(0, shown).map(e => {
        const best = bestWeightFor(S, e.id)
        return (
          <div key={e.id} className="lib-row" onClick={() => exerciseDetailSheet(e)}>
            <Thumb ex={e} />
            <div className="lib-row-m">
              <div className="lib-row-t capitalize">{exerciseNameFor(e)}</div>
              <div className="lib-row-s capitalize">{t(e.tg || e.bp)} · {t(e.eq)}</div>
            </div>
            {best > 0 && <span className="lib-best">{fmtNum(best)}</span>}
            <Button size="sm" variant="ghost" icon="plus" className="lib-plan" onClick={ev => { ev.stopPropagation(); addToRoutineSheet(e) }}>{t('Plan')}</Button>
          </div>
        )
      })}

      {f.length === 0 && (
        <div className="lib-empty">
          <Icon name="magnifier" />
          <span>{t('No match')}</span>
        </div>
      )}
    </div>

    {f.length > shown && (
      <div className="lib-more">
        <Button onClick={() => setShown(s => s + 40)}>{t('Show more')}</Button>
      </div>
    )}
  </div>
}
