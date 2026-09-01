/**
 * Universal client-side 1D/2D Barcode Decoder (EAN-13, EAN-8, UPC-A, UPC-E, Code 128, QR).
 * Powered by hardware BarcodeDetector with ZXing multi-format fallback.
 */

import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library'

const hints = new Map()
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.QR_CODE,
])
hints.set(DecodeHintType.TRY_HARDER, true)

let sharedReader = null
function getReader() {
  if (!sharedReader) {
    sharedReader = new MultiFormatReader()
    sharedReader.setHints(hints)
  }
  return sharedReader
}

let sharedCanvas = null
let sharedCtx = null

export function eanChecksum(digits) {
  if (!digits || (digits.length !== 13 && digits.length !== 8 && digits.length !== 12)) return true
  let sum = 0
  for (let i = 0; i < digits.length - 1; i++) {
    const d = parseInt(digits[i], 10)
    sum += (i % 2 === (digits.length % 2 === 0 ? 0 : 1)) ? d * 3 : d
  }
  const calc = (10 - (sum % 10)) % 10
  return calc === parseInt(digits[digits.length - 1], 10)
}

/**
 * Scan an HTML Video, Image or Canvas element for Barcodes.
 * @param {HTMLVideoElement|HTMLCanvasElement|ImageData} source
 * @returns {Promise<string|null>}
 */
export async function decodeBarcodeFromMedia(source) {
  if (!source) return null

  // 1. Try native hardware BarcodeDetector if available
  if (typeof window !== 'undefined' && typeof window.BarcodeDetector === 'function') {
    try {
      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
      })
      const results = await detector.detect(source)
      if (results && results.length > 0 && results[0].rawValue) {
        const raw = results[0].rawValue.trim()
        const digits = raw.replace(/\D/g, '')
        return digits.length >= 8 ? digits : raw
      }
    } catch {
      // Fallback to ZXing
    }
  }

  // 2. ZXing MultiFormatReader
  try {
    let width = 0
    let height = 0
    let ctx = null

    if (source instanceof HTMLCanvasElement) {
      width = source.width
      height = source.height
      ctx = source.getContext('2d', { willReadFrequently: true })
    } else if (source.videoWidth && source.videoHeight) {
      width = Math.min(720, source.videoWidth)
      height = Math.round((source.videoHeight / source.videoWidth) * width)
      if (!sharedCanvas) {
        sharedCanvas = document.createElement('canvas')
        sharedCtx = sharedCanvas.getContext('2d', { willReadFrequently: true })
      }
      if (sharedCanvas.width !== width || sharedCanvas.height !== height) {
        sharedCanvas.width = width
        sharedCanvas.height = height
      }
      ctx = sharedCtx
      ctx.drawImage(source, 0, 0, width, height)
    } else {
      return null
    }

    if (!ctx || width === 0 || height === 0) return null

    const imgData = ctx.getImageData(0, 0, width, height)
    const luminanceSource = new RGBLuminanceSource(imgData.data, width, height)
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource))
    const reader = getReader()
    const result = reader.decode(binaryBitmap)

    if (result && result.getText()) {
      const text = result.getText().trim()
      const digits = text.replace(/\D/g, '')
      return digits.length >= 8 ? digits : text
    }
  } catch {
    // No barcode found in current frame
  }

  return null
}
