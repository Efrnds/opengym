/** Downscale + JPEG encode so phone photos fit the feed upload limit (server max 2 MB). */
const MAX_BYTES = 1.45 * 1024 * 1024
const MAX_DIM = 2040

const dataUrlBytes = dataUrl => {
  const i = String(dataUrl).indexOf(',')
  if (i < 0) return 0
  return Math.ceil((dataUrl.length - i - 1) * 3 / 4)
}

const loadBitmap = file => new Promise((resolve, reject) => {
  if (typeof createImageBitmap === 'function') {
    createImageBitmap(file).then(resolve).catch(reject)
    return
  }
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
  img.onerror = e => { URL.revokeObjectURL(url); reject(e) }
  img.src = url
})

const drawScaled = (src, maxDim) => {
  const sw = src.width || src.bitmapWidth
  const sh = src.height || src.bitmapHeight
  const scale = Math.min(1, maxDim / Math.max(sw, sh, 1))
  const w = Math.max(1, Math.round(sw * scale))
  const h = Math.max(1, Math.round(sh * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(src, 0, 0, w, h)
  return canvas
}

const encodeJpeg = (canvas, quality) => canvas.toDataURL('image/jpeg', quality)

/** @returns {Promise<string>} data:image/jpeg;base64,... */
export async function compressPhotoFile(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('not an image')
  const bitmap = await loadBitmap(file)
  let maxDim = MAX_DIM
  let quality = 0.88
  let dataUrl = null
  try {
    for (let attempt = 0; attempt < 12; attempt++) {
      const canvas = drawScaled(bitmap, maxDim)
      dataUrl = encodeJpeg(canvas, quality)
      canvas.width = 0
      canvas.height = 0
      if (dataUrlBytes(dataUrl) <= MAX_BYTES) return dataUrl
      if (quality > 0.55) quality -= 0.07
      else maxDim = Math.round(maxDim * 0.82)
    }
    if (dataUrl && dataUrlBytes(dataUrl) <= MAX_BYTES * 1.05) return dataUrl
    throw new Error('photo too large after compression')
  } finally {
    bitmap.close?.()
  }
}

export { dataUrlBytes, MAX_BYTES }
