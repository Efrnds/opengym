// iOS Safari / installed PWAs pin `position:fixed; bottom:0` to the layout viewport,
// so the tab bar can drift mid-screen after scroll, rubber-banding, or the keyboard.
// Track the visual viewport and expose the gap as --vv-offset for #chrome + finish-dock.

function sync() {
  const vv = window.visualViewport
  if (!vv) {
    document.documentElement.style.removeProperty('--vv-offset')
    return
  }
  const off = Math.max(0, window.innerHeight - vv.offsetTop - vv.height)
  document.documentElement.style.setProperty('--vv-offset', off ? `${off}px` : '0px')
}

export function initChromePin() {
  if (!window.visualViewport) return () => {}
  const vv = window.visualViewport
  const run = () => sync()
  vv.addEventListener('resize', run)
  vv.addEventListener('scroll', run)
  window.addEventListener('scroll', run, { passive: true })
  run()
  return () => {
    vv.removeEventListener('resize', run)
    vv.removeEventListener('scroll', run)
    window.removeEventListener('scroll', run)
    document.documentElement.style.removeProperty('--vv-offset')
  }
}
