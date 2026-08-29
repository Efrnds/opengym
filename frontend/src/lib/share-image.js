import { MOBILE } from './mobile.js'

const safeName = name => String(name || 'opengym-workout.png').replace(/[^\w.-]/g, '_')

/** Share or download a PNG blob — Instagram-ready via the OS share sheet. */
export async function shareImageBlob(blob, filename = 'opengym-workout.png') {
  const file = safeName(filename)

  if (MOBILE) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')
      const reader = new FileReader()
      const b64 = await new Promise((res, rej) => {
        reader.onload = () => res(String(reader.result).split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(blob)
      })
      await Filesystem.writeFile({ path: file, directory: Directory.Cache, data: b64 })
      const { uri } = await Filesystem.getUri({ path: file, directory: Directory.Cache })
      await Share.share({ files: [uri], dialogTitle: file })
      await Filesystem.deleteFile({ path: file, directory: Directory.Cache }).catch(() => {})
      return 'share'
    } catch (e) {
      const msg = String(e?.message || '').toLowerCase()
      if (msg.includes('cancel') || msg.includes('dismiss')) return 'cancel'
      throw e
    }
  }

  const shareFile = new File([blob], file, { type: blob.type || 'image/png' })
  if (navigator.share) {
    try {
      if (!navigator.canShare || navigator.canShare({ files: [shareFile] })) {
        await navigator.share({ files: [shareFile], title: file })
        return 'share'
      }
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancel'
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'download'
}
