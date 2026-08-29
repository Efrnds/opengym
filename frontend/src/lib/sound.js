// WebAudio beeps + haptics (ported from the vanilla app). `enabled` gates sound.
let audioCtx = null
let silentSrc = null
let silentGain = null

export function unlockAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
  } catch (e) { /* ignore */ }
}

// iOS/Android often suspend WebAudio between user gestures — a short silent buffer
// keeps the session alive so rest-timer beeps still fire ~90s after the last tap.
export function keepAudioAlive() {
  try {
    unlockAudio()
    if (!audioCtx) return
    const buffer = audioCtx.createBuffer(1, 1, 22050)
    const source = audioCtx.createBufferSource()
    source.buffer = buffer
    source.connect(audioCtx.destination)
    source.start(0)
  } catch (e) { /* ignore */ }
}

/** Inaudible loop during rest — keeps iOS background audio alive so the chime fires on mute. */
export function startSilentKeepAlive() {
  try {
    unlockAudio()
    if (!audioCtx || silentSrc) return
    const rate = audioCtx.sampleRate || 44100
    const buffer = audioCtx.createBuffer(1, rate, rate)
    silentSrc = audioCtx.createBufferSource()
    silentSrc.buffer = buffer
    silentSrc.loop = true
    silentGain = audioCtx.createGain()
    silentGain.gain.value = 0.0001
    silentSrc.connect(silentGain)
    silentGain.connect(audioCtx.destination)
    silentSrc.start(0)
  } catch { /* */ }
}

export function stopSilentKeepAlive() {
  try {
    silentSrc?.stop()
    silentSrc?.disconnect()
    silentGain?.disconnect()
  } catch { /* */ }
  silentSrc = null
  silentGain = null
}

export function beep(enabled, freq, dur, when) {
  if (!enabled) return
  try {
    unlockAudio()
    if (!audioCtx) return
    const o = audioCtx.createOscillator(), g = audioCtx.createGain()
    o.connect(g); g.connect(audioCtx.destination)
    o.frequency.value = freq || 880; o.type = 'sine'
    const t0 = audioCtx.currentTime + (when || 0)
    g.gain.setValueAtTime(0.001, t0)
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + (dur || 0.18))
    o.start(t0); o.stop(t0 + (dur || 0.18) + 0.05)
  } catch (e) { /* */ }
}

/** Hevy-style rest-over chime — three ascending tones, louder than the countdown ticks. */
export function playRestCompleteSound(enabled) {
  if (!enabled) return
  try {
    unlockAudio()
    if (!audioCtx) return
    const tones = [
      { f: 880, d: 0.14, t: 0, type: 'triangle' },
      { f: 1175, d: 0.14, t: 0.16, type: 'triangle' },
      { f: 1568, d: 0.32, t: 0.32, type: 'sine' },
    ]
    for (const { f, d, t, type } of tones) {
      const o = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      o.type = type
      o.frequency.value = f
      o.connect(g)
      g.connect(audioCtx.destination)
      const t0 = audioCtx.currentTime + t
      g.gain.setValueAtTime(0.001, t0)
      g.gain.exponentialRampToValueAtTime(0.75, t0 + 0.015)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + d)
      o.start(t0)
      o.stop(t0 + d + 0.04)
    }
  } catch { /* */ }
}
export function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p) } catch (e) { /* */ } }
