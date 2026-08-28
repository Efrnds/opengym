// WebAudio beeps + haptics (ported from the vanilla app). `enabled` gates sound.
let audioCtx = null

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
export function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p) } catch (e) { /* */ } }
