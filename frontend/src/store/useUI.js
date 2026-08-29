import { create } from 'zustand'
import { uid } from '../lib/format.js'
import { beep, vibrate, unlockAudio, keepAudioAlive, playRestCompleteSound, startSilentKeepAlive, stopSilentKeepAlive } from '../lib/sound.js'
import {
  restNotifBody,
  showRestNotification,
  ensureRestAlertPermission,
  syncRestPush,
  cancelRestPush,
} from '../lib/rest-notify.js'
import { useStore } from './useStore.js'

const completeRest = () => {
  const finish = useUI.getState().stopRest
  if (!useUI.getState().timer) return
  cancelRestPush()
  const snd = useStore.getState().S.sound
  playRestCompleteSound(snd)
  vibrate([400, 120, 400, 120, 500, 120, 500])
  if (document.visibilityState !== 'visible') showRestNotification()
  useUI.getState().toast(restNotifBody())
  finish()
}

let toastTm = null
let timerInt = null
let timerTick = null
let restEndTm = null
let workInt = null
let workTick = null
let workDone = null

export const useUI = create((set, get) => ({
  sheets: [],          // { id, render:(close)=>JSX, kind:'sheet'|'center', locked }
  toastMsg: '',
  timer: null,         // rest countdown between sets — { left, total, endsAt }
  work: null,          // work countdown DURING a timed set (issue #16) — { left, total, endsAt, label }

  openSheet(render, { kind = 'sheet', locked = false } = {}) {
    const id = uid()
    set(s => ({ sheets: [...s.sheets, { id, render, kind, locked }] }))
    const close = () => get().closeSheet(id)
    return { id, close, lock: v => set(s => ({ sheets: s.sheets.map(x => x.id === id ? { ...x, locked: v } : x) })) }
  },
  closeSheet(id) { set(s => ({ sheets: s.sheets.filter(x => x.id !== id) })) },
  closeAll() { set({ sheets: [] }) },

  toast(msg) {
    set({ toastMsg: msg })
    clearTimeout(toastTm)
    toastTm = setTimeout(() => set({ toastMsg: '' }), 2200)
  },

  startRest(sec) {
    unlockAudio()
    keepAudioAlive()
    startSilentKeepAlive()
    get().stopRest()
    const endsAt = Date.now() + sec * 1000
    set({ timer: { left: sec, total: sec, endsAt } })
    ensureRestAlertPermission()
    syncRestPush(sec)

    restEndTm = setTimeout(completeRest, sec * 1000)

    timerTick = () => {
      const tm = get().timer
      if (!tm) return
      if (document.visibilityState === 'visible') unlockAudio()
      const left = Math.max(0, Math.round((tm.endsAt - Date.now()) / 1000))
      if (left <= 0) {
        if (restEndTm) { clearTimeout(restEndTm); restEndTm = null }
        completeRest()
        return
      }
      if (left === tm.left) return
      const snd = useStore.getState().S.sound
      if (left <= 3) beep(snd, 660, 0.1)
      set({ timer: { ...tm, left } })
    }
    timerInt = setInterval(timerTick, 250)
    document.addEventListener('visibilitychange', timerTick)
  },
  addRest(sec) {
    const tm = get().timer
    if (!tm) return
    const left = tm.left + sec
    if (left <= 0) { completeRest(); return }
    const endsAt = tm.endsAt + sec * 1000
    set({ timer: { ...tm, left, total: tm.total + sec, endsAt } })
    if (restEndTm) clearTimeout(restEndTm)
    restEndTm = setTimeout(completeRest, Math.max(0, endsAt - Date.now()))
    syncRestPush(left)
  },
  stopRest() {
    if (timerInt) clearInterval(timerInt); timerInt = null
    if (restEndTm) clearTimeout(restEndTm); restEndTm = null
    if (timerTick) document.removeEventListener('visibilitychange', timerTick); timerTick = null
    if (!get().work) stopSilentKeepAlive()
    if (get().timer) cancelRestPush()
    set({ timer: null })
  },

  /* ---- work timer (issue #16) ----
     Times the set itself, not the recovery after it. Kept separate from the rest timer on
     purpose: the two mean opposite things, they must never run together, and a work set is
     something you are watching — so it gets no server push (that endpoint says "rest over",
     and a plank does not need a notification you are staring at anyway).
     `onDone(elapsedSec)` is called both when the countdown reaches zero and on an early
     finish; the elapsed time is what actually gets logged, so stopping at 0:38 of a 0:45
     hold records 0:38 rather than crediting the full target. */
  startWork(sec, label, onDone) {
    unlockAudio()
    keepAudioAlive()
    get().stopWork()
    get().stopRest()
    startSilentKeepAlive()
    const total = Math.max(1, Math.round(sec) || 1)
    const endsAt = Date.now() + total * 1000
    workDone = onDone
    set({ work: { left: total, total, endsAt, label } })
    workTick = () => {
      const wk = get().work
      if (!wk) return
      if (document.visibilityState === 'visible') unlockAudio()
      const left = Math.max(0, Math.round((wk.endsAt - Date.now()) / 1000))
      if (left === wk.left) return
      const snd = useStore.getState().S.sound
      if (left <= 0) {
        playRestCompleteSound(snd)
        vibrate([250, 100, 250, 100, 350])
        const done = workDone
        get().stopWork()
        if (done) done(wk.total)
        return
      }
      if (left <= 3) beep(snd, 660, 0.1)
      set({ work: { ...wk, left } })
    }
    workInt = setInterval(workTick, 1000)
    document.addEventListener('visibilitychange', workTick)
  },
  // Ended the hold early — log what was actually held.
  finishWorkEarly() {
    const wk = get().work
    if (!wk) return
    const elapsed = Math.max(1, wk.total - wk.left)
    const done = workDone
    vibrate(30)
    get().stopWork()
    if (done) done(elapsed)
  },
  // Abandon without logging anything.
  stopWork() {
    if (workInt) clearInterval(workInt); workInt = null
    if (workTick) document.removeEventListener('visibilitychange', workTick); workTick = null
    if (!get().timer) stopSilentKeepAlive()
    workDone = null
    set({ work: null })
  }
}))
