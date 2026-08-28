import { useRef, useState } from 'react'
import { exOr } from '../lib/exercises.js'
import { exAvailable } from '../lib/equipment.js'
import { dropIndexForReorder, exLine } from '../lib/history.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import { Thumb } from './Media.jsx'
import Icon from './Icon.jsx'

const HOLD_MS = 420
const MOVE_CANCEL = 10

export default function RoutineExerciseList({
  exercises,
  profile,
  S,
  unitFirst,
  inSS,
  canDrag,
  onOpen,
  onToggleLink,
  onMove,
  onReorder,
}) {
  const rowRefs = useRef([])
  const dragRef = useRef(null)
  const [drag, setDrag] = useState(null)

  const rowRects = () => rowRefs.current
    .filter(Boolean)
    .map(el => el.getBoundingClientRect())

  const finishDrag = (commit, pointerId) => {
    const d = dragRef.current
    if (commit && d && d.over !== d.from) onReorder(d.from, d.over)
    dragRef.current = null
    setDrag(null)
    if (pointerId != null) {
      rowRefs.current.forEach(el => {
        try { el?.releasePointerCapture?.(pointerId) } catch { /* released */ }
      })
    }
  }

  const onGripDown = (e, index) => {
    if (!canDrag) return
    e.stopPropagation()
    e.preventDefault()
    const pointerId = e.pointerId
    const originY = e.clientY
    const originX = e.clientX
    let hold = true

    const onMove = ev => {
      if (ev.pointerId !== pointerId) return
      if (hold && (Math.abs(ev.clientY - originY) > MOVE_CANCEL || Math.abs(ev.clientX - originX) > MOVE_CANCEL)) {
        hold = false
        clearTimeout(timer)
      }
      if (!dragRef.current) return
      ev.preventDefault()
      const over = dropIndexForReorder(dragRef.current.from, ev.clientY, rowRects())
      dragRef.current = { ...dragRef.current, over, y: ev.clientY }
      setDrag({ ...dragRef.current })
    }

    const onUp = ev => {
      if (ev.pointerId !== pointerId) return
      clearTimeout(timer)
      finishDrag(true, pointerId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    const timer = setTimeout(() => {
      if (!hold) return
      dragRef.current = { from: index, over: index, y: originY }
      setDrag({ from: index, over: index, y: originY })
      e.currentTarget.setPointerCapture(pointerId)
    }, HOLD_MS)

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  return (
    <div className={'routine-ex-list' + (drag ? ' dragging' : '')}>
      {exercises.map((e, i) => {
        const ex = exOr(e.id)
        const noEquip = profile && !exAvailable(S, ex)
        const linkedPrev = i > 0 && e.sg && exercises[i - 1].sg === e.sg
        const isDragging = drag?.from === i
        const dropHere = drag && drag.over === i && drag.from !== i
        return <div key={i}>
          {unitFirst.has(i) && <div className="ss-label routine-ss-label"><Icon name="link" />{t('Superset')}</div>}
          {dropHere && drag.from > i && <div className="routine-ex-drop" aria-hidden="true" />}
          <div
            ref={el => { rowRefs.current[i] = el }}
            className={'routine-ex'
              + (inSS.has(i) ? ' in-ss' : '')
              + (isDragging ? ' is-dragging' : '')
              + (dropHere ? ' drop-target' : '')}
            onClick={() => { if (!dragRef.current) onOpen(i, ex, e) }}
          >
            {canDrag && (
              <button
                type="button"
                className="routine-ex-grip"
                aria-label={t('Hold and drag to reorder')}
                onPointerDown={ev => onGripDown(ev, i)}
                onClick={ev => ev.stopPropagation()}
              >
                <Icon name="grip" />
              </button>
            )}
            <Thumb ex={ex} />
            <div className="routine-ex-m">
              <div className="routine-ex-t capitalize">{exerciseNameFor(ex)}</div>
              <div className="routine-ex-s">{exLine(e, S.unit)}</div>
              {e.note && <div className="routine-ex-note">{e.note}</div>}
            </div>
            {noEquip && (
              <span className="tag routine-ex-warn" title={t('Needs {0} — not in your active profile', t(ex.eq))}>
                <Icon name="warning" />
              </span>
            )}
            <div className="routine-ex-tools">
              {i > 0 && (
                <button
                  type="button"
                  className={'iconbtn routine-ex-link' + (linkedPrev ? ' on-ss' : '')}
                  title={t('Superset with exercise above')}
                  onClick={ev => { ev.stopPropagation(); onToggleLink(i) }}
                >
                  <Icon name="link" />
                </button>
              )}
              <button type="button" className="iconbtn routine-ex-move" aria-label={t('Move up')} onClick={ev => { ev.stopPropagation(); onMove(i, -1) }}>
                <Icon name="chevronUp" />
              </button>
              <button type="button" className="iconbtn routine-ex-move" aria-label={t('Move down')} onClick={ev => { ev.stopPropagation(); onMove(i, 1) }}>
                <Icon name="chevronDown" />
              </button>
            </div>
          </div>
          {dropHere && drag.from < i && <div className="routine-ex-drop" aria-hidden="true" />}
        </div>
      })}
    </div>
  )
}
