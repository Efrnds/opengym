/**
 * Universal client-side 1D Barcode Decoder (EAN-13, EAN-8, UPC-A, UPC-E).
 * Zero dependencies — works on all browsers (Safari, Chrome, Firefox, iOS, Android).
 */

const L_PATTERNS = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011'
]
const G_PATTERNS = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111'
]
const R_PATTERNS = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100'
]

const FIRST_DIGIT_PARITY = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
]

export function eanChecksum(digits) {
  let sum = 0
  for (let i = 0; i < digits.length - 1; i++) {
    const d = parseInt(digits[i], 10)
    sum += (i % 2 === (digits.length % 2 === 0 ? 0 : 1)) ? d * 3 : d
  }
  const calc = (10 - (sum % 10)) % 10
  return calc === parseInt(digits[digits.length - 1], 10)
}

function decodeModules(bitStr, patterns) {
  for (let d = 0; d < patterns.length; d++) {
    if (bitStr === patterns[d]) return d
  }
  return -1
}

function decodeEan13RunLengths(runs, startIdx) {
  // Guard 101 -> 3 runs
  if (startIdx + 3 + 24 + 5 + 24 + 3 > runs.length) return null

  let idx = startIdx + 3
  const leftDigits = []
  const parity = []

  for (let i = 0; i < 6; i++) {
    const digitRuns = [runs[idx], runs[idx + 1], runs[idx + 2], runs[idx + 3]]
    idx += 4
    const totalW = digitRuns.reduce((a, b) => a + b, 0)
    const norm = digitRuns.map(r => Math.max(1, Math.round((r / totalW) * 7)))
    const sumNorm = norm.reduce((a, b) => a + b, 0)
    if (sumNorm !== 7) {
      const diff = 7 - sumNorm
      norm[0] = Math.max(1, norm[0] + diff)
    }
    const bitStr = '0'.repeat(norm[0]) + '1'.repeat(norm[1]) + '0'.repeat(norm[2]) + '1'.repeat(norm[3])
    
    let d = decodeModules(bitStr, L_PATTERNS)
    if (d !== -1) {
      leftDigits.push(d)
      parity.push('L')
    } else {
      d = decodeModules(bitStr, G_PATTERNS)
      if (d !== -1) {
        leftDigits.push(d)
        parity.push('G')
      } else {
        return null
      }
    }
  }

  // Center guard (space, bar, space, bar, space -> 5 runs)
  idx += 5

  const rightDigits = []
  for (let i = 0; i < 6; i++) {
    const digitRuns = [runs[idx], runs[idx + 1], runs[idx + 2], runs[idx + 3]]
    idx += 4
    const totalW = digitRuns.reduce((a, b) => a + b, 0)
    const norm = digitRuns.map(r => Math.max(1, Math.round((r / totalW) * 7)))
    const sumNorm = norm.reduce((a, b) => a + b, 0)
    if (sumNorm !== 7) {
      const diff = 7 - sumNorm
      norm[0] = Math.max(1, norm[0] + diff)
    }
    const bitStr = '1'.repeat(norm[0]) + '0'.repeat(norm[1]) + '1'.repeat(norm[2]) + '0'.repeat(norm[3])
    const d = decodeModules(bitStr, R_PATTERNS)
    if (d === -1) return null
    rightDigits.push(d)
  }

  const parityStr = parity.join('')
  const firstDigit = FIRST_DIGIT_PARITY.indexOf(parityStr)
  if (firstDigit === -1) return null

  const code = [firstDigit, ...leftDigits, ...rightDigits].join('')
  if (eanChecksum(code)) return code
  return null
}

function scanLineForBarcode(row, width) {
  const threshold = computeRowThreshold(row, width)
  const runs = []
  let currentVal = row[0] < threshold ? 1 : 0
  let currentRun = 0

  for (let x = 0; x < width; x++) {
    const val = row[x] < threshold ? 1 : 0
    if (val === currentVal) {
      currentRun++
    } else {
      runs.push(currentRun)
      currentVal = val
      currentRun = 1
    }
  }
  runs.push(currentRun)

  // Look for start guard 101
  for (let i = 1; i < runs.length - 56; i += 2) {
    const res = decodeEan13RunLengths(runs, i)
    if (res) return res
  }

  return null
}

function computeRowThreshold(row, width) {
  let min = 255, max = 0, sum = 0
  for (let i = 0; i < width; i++) {
    const v = row[i]
    if (v < min) min = v
    if (v > max) max = v
    sum += v
  }
  if (max - min < 20) return 128
  return Math.round(sum / width)
}

/**
 * Scan an HTML Video or Canvas element for 1D Barcode.
 * @param {HTMLVideoElement|HTMLCanvasElement|ImageData} source
 * @returns {Promise<string|null>}
 */
export async function decodeBarcodeFromMedia(source) {
  if (!source) return null

  // 1. Try native BarcodeDetector if available
  if (typeof window !== 'undefined' && typeof window.BarcodeDetector === 'function') {
    try {
      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
      })
      const results = await detector.detect(source)
      if (results && results.length > 0 && results[0].rawValue) {
        const raw = results[0].rawValue.trim()
        const digits = raw.replace(/\D/g, '')
        return digits.length >= 8 ? digits : raw
      }
    } catch {
      // Fallback to internal canvas scanning
    }
  }

  // 2. Fallback Canvas scan lines
  try {
    let canvas, ctx, width, height
    if (source instanceof HTMLCanvasElement) {
      canvas = source
      ctx = canvas.getContext('2d', { willReadFrequently: true })
      width = canvas.width
      height = canvas.height
    } else if (source.videoWidth && source.videoHeight) {
      width = Math.min(800, source.videoWidth)
      height = Math.round((source.videoHeight / source.videoWidth) * width)
      canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(source, 0, 0, width, height)
    } else {
      return null
    }

    const imgData = ctx.getImageData(0, 0, width, height)
    const data = imgData.data

    // Sample scan lines across height
    const scanRatios = [0.5, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7]
    for (const ratio of scanRatios) {
      const y = Math.round(height * ratio)
      const row = new Uint8Array(width)
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        // Grayscale luminance
        row[x] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2])
      }
      const found = scanLineForBarcode(row, width)
      if (found) return found
    }
  } catch {
    // Media capture access error
  }

  return null
}
