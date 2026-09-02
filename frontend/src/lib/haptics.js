import { MOBILE } from './mobile.js'

/**
 * Universal Haptics / Apple Taptic Engine helper for iOS, Android and Web.
 */

export async function hapticImpact(style = 'medium') {
  if (MOBILE) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
      const styleMap = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      }
      await Haptics.impact({ style: styleMap[style] || ImpactStyle.Medium })
      return
    } catch { /* ignore */ }
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const duration = style === 'heavy' ? 40 : style === 'medium' ? 25 : 15
    try { navigator.vibrate(duration) } catch { /* ignore */ }
  }
}

export async function hapticNotification(type = 'success') {
  if (MOBILE) {
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics')
      const typeMap = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      }
      await Haptics.notification({ type: typeMap[type] || NotificationType.Success })
      return
    } catch { /* ignore */ }
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const pattern = type === 'warning' ? [60, 40, 60] : type === 'error' ? [80, 50, 80, 50, 80] : [40, 30, 50]
    try { navigator.vibrate(pattern) } catch { /* ignore */ }
  }
}

export async function hapticSelection() {
  if (MOBILE) {
    try {
      const { Haptics } = await import('@capacitor/haptics')
      await Haptics.selectionStart()
      await Haptics.selectionChanged()
      return
    } catch { /* ignore */ }
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(10) } catch { /* ignore */ }
  }
}
