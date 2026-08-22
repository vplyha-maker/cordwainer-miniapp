/**
 * colorScience.ts
 * Reflectance → XYZ → sRGB
 * Two-Constant Kubelka–Munk + Saunderson
 *
 * Memory-oriented: CMF/illuminants as Float32Array,
 * fast-path for CIE-aligned spectra (81 pts, no per-λ interpolation).
 */

export interface SpectrumPoint {
  wavelength: number // нм
  reflectance: number // 0–100 %
}

export interface RGB {
  r: number
  g: number
  b: number
}

export interface XYZ {
  x: number
  y: number
  z: number
}

export type IlluminantType = 'D65' | 'A' | 'cool' | 'twilight'

export interface MixComponent {
  spectrum: SpectrumPoint[]
  volume: number
  isBinder?: boolean
}

/** Фиксированная сетка CIE 1931 (5 нм): 380–780 → 81 точка */
export const SPECTRUM_LEN = 81
export const WL_START = 380
export const WL_STEP = 5

// ─── CIE 1931 2° CMF (raw objects — нужны для normalize/parse) ───

const CIE_CMF = [
  { wl: 380, x: 0.001368, y: 0.000039, z: 0.00645 },
  { wl: 385, x: 0.002236, y: 0.000064, z: 0.01055 },
  { wl: 390, x: 0.004243, y: 0.00012, z: 0.02005 },
  { wl: 395, x: 0.00765, y: 0.000217, z: 0.03621 },
  { wl: 400, x: 0.01431, y: 0.000396, z: 0.06785 },
  { wl: 405, x: 0.02319, y: 0.00064, z: 0.1102 },
  { wl: 410, x: 0.04351, y: 0.00121, z: 0.2074 },
  { wl: 415, x: 0.07763, y: 0.00218, z: 0.3713 },
  { wl: 420, x: 0.13438, y: 0.004, z: 0.6456 },
  { wl: 425, x: 0.21477, y: 0.0073, z: 1.03905 },
  { wl: 430, x: 0.2839, y: 0.0116, z: 1.3856 },
  { wl: 435, x: 0.3285, y: 0.01684, z: 1.62296 },
  { wl: 440, x: 0.34828, y: 0.023, z: 1.74706 },
  { wl: 445, x: 0.34806, y: 0.0298, z: 1.7826 },
  { wl: 450, x: 0.3362, y: 0.038, z: 1.77211 },
  { wl: 455, x: 0.3187, y: 0.048, z: 1.7441 },
  { wl: 460, x: 0.2908, y: 0.06, z: 1.6692 },
  { wl: 465, x: 0.2511, y: 0.0739, z: 1.5281 },
  { wl: 470, x: 0.19536, y: 0.09098, z: 1.28764 },
  { wl: 475, x: 0.1421, y: 0.1126, z: 1.0419 },
  { wl: 480, x: 0.09564, y: 0.13902, z: 0.81295 },
  { wl: 485, x: 0.05795, y: 0.1693, z: 0.6162 },
  { wl: 490, x: 0.03201, y: 0.20802, z: 0.46518 },
  { wl: 495, x: 0.0147, y: 0.2586, z: 0.3533 },
  { wl: 500, x: 0.0049, y: 0.323, z: 0.272 },
  { wl: 505, x: 0.0024, y: 0.4073, z: 0.2123 },
  { wl: 510, x: 0.0093, y: 0.503, z: 0.1582 },
  { wl: 515, x: 0.0291, y: 0.6082, z: 0.1117 },
  { wl: 520, x: 0.06327, y: 0.71, z: 0.07825 },
  { wl: 525, x: 0.1096, y: 0.7932, z: 0.05725 },
  { wl: 530, x: 0.1655, y: 0.862, z: 0.04216 },
  { wl: 535, x: 0.22575, y: 0.91485, z: 0.02984 },
  { wl: 540, x: 0.2904, y: 0.954, z: 0.0203 },
  { wl: 545, x: 0.3597, y: 0.9803, z: 0.0134 },
  { wl: 550, x: 0.43345, y: 0.99495, z: 0.00875 },
  { wl: 555, x: 0.51205, y: 1.0, z: 0.00575 },
  { wl: 560, x: 0.5945, y: 0.995, z: 0.0039 },
  { wl: 565, x: 0.6784, y: 0.9786, z: 0.00275 },
  { wl: 570, x: 0.7621, y: 0.952, z: 0.0021 },
  { wl: 575, x: 0.8425, y: 0.9154, z: 0.0018 },
  { wl: 580, x: 0.9163, y: 0.87, z: 0.00165 },
  { wl: 585, x: 0.9786, y: 0.8163, z: 0.0014 },
  { wl: 590, x: 1.0263, y: 0.757, z: 0.0011 },
  { wl: 595, x: 1.0567, y: 0.6949, z: 0.001 },
  { wl: 600, x: 1.0622, y: 0.631, z: 0.0008 },
  { wl: 605, x: 1.0456, y: 0.5668, z: 0.0006 },
  { wl: 610, x: 1.0026, y: 0.503, z: 0.00034 },
  { wl: 615, x: 0.9384, y: 0.4412, z: 0.00024 },
  { wl: 620, x: 0.85445, y: 0.381, z: 0.00019 },
  { wl: 625, x: 0.7514, y: 0.321, z: 0.0001 },
  { wl: 630, x: 0.6424, y: 0.265, z: 0.00005 },
  { wl: 635, x: 0.5419, y: 0.217, z: 0.00003 },
  { wl: 640, x: 0.4479, y: 0.175, z: 0.00002 },
  { wl: 645, x: 0.3608, y: 0.1382, z: 0.00001 },
  { wl: 650, x: 0.2835, y: 0.107, z: 0 },
  { wl: 655, x: 0.2187, y: 0.0816, z: 0 },
  { wl: 660, x: 0.1649, y: 0.061, z: 0 },
  { wl: 665, x: 0.1212, y: 0.04458, z: 0 },
  { wl: 670, x: 0.0874, y: 0.032, z: 0 },
  { wl: 675, x: 0.0636, y: 0.0232, z: 0 },
  { wl: 680, x: 0.04677, y: 0.017, z: 0 },
  { wl: 685, x: 0.0329, y: 0.01192, z: 0 },
  { wl: 690, x: 0.0227, y: 0.00821, z: 0 },
  { wl: 695, x: 0.01584, y: 0.005723, z: 0 },
  { wl: 700, x: 0.011359, y: 0.004102, z: 0 },
  { wl: 705, x: 0.008111, y: 0.002929, z: 0 },
  { wl: 710, x: 0.00579, y: 0.002091, z: 0 },
  { wl: 715, x: 0.004109, y: 0.001484, z: 0 },
  { wl: 720, x: 0.002899, y: 0.001047, z: 0 },
  { wl: 725, x: 0.002049, y: 0.00074, z: 0 },
  { wl: 730, x: 0.00144, y: 0.00052, z: 0 },
  { wl: 735, x: 0.001, y: 0.000361, z: 0 },
  { wl: 740, x: 0.00069, y: 0.000249, z: 0 },
  { wl: 745, x: 0.000476, y: 0.000172, z: 0 },
  { wl: 750, x: 0.000332, y: 0.00012, z: 0 },
  { wl: 755, x: 0.000235, y: 0.000085, z: 0 },
  { wl: 760, x: 0.000166, y: 0.00006, z: 0 },
  { wl: 765, x: 0.000117, y: 0.000042, z: 0 },
  { wl: 770, x: 0.000083, y: 0.00003, z: 0 },
  { wl: 775, x: 0.000059, y: 0.000021, z: 0 },
  { wl: 780, x: 0.000042, y: 0.000015, z: 0 },
]

// Typed views — hot path
const XBAR = new Float32Array(SPECTRUM_LEN)
const YBAR = new Float32Array(SPECTRUM_LEN)
const ZBAR = new Float32Array(SPECTRUM_LEN)
const WL = new Float32Array(SPECTRUM_LEN)
for (let i = 0; i < SPECTRUM_LEN; i++) {
  XBAR[i] = CIE_CMF[i].x
  YBAR[i] = CIE_CMF[i].y
  ZBAR[i] = CIE_CMF[i].z
  WL[i] = CIE_CMF[i].wl
}

const D65 = new Float32Array([
  49.9755, 52.3118, 54.6482, 68.7015, 82.7549, 87.1204, 91.486, 92.4589, 93.4318,
  90.057, 86.6823, 95.7736, 104.865, 110.936, 117.008, 117.41, 117.812, 116.336,
  114.861, 115.392, 115.923, 112.367, 108.811, 109.082, 109.354, 108.578, 107.802,
  106.296, 104.79, 106.239, 107.689, 106.047, 104.405, 104.225, 104.046, 102.023,
  100.0, 98.1671, 96.3342, 96.0611, 95.788, 92.2368, 88.6856, 89.3459, 90.0062,
  89.8026, 89.5991, 88.6489, 87.6987, 85.4936, 83.2886, 83.4936, 83.6986, 81.863,
  80.0268, 80.1207, 80.2146, 81.2462, 82.2778, 80.281, 78.2842, 74.0027, 69.7213,
  70.6652, 71.6091, 72.979, 74.349, 67.9767, 61.6043, 65.7448, 69.8856, 72.486,
  75.0865, 69.3616, 63.6363, 64.8082, 65.9801, 65.023, 64.0659, 61.3633, 58.6608,
])

const ILLUMINANT_A = new Float32Array([
  9.7951, 10.863, 12.052, 13.786, 15.452, 16.236, 17.507, 18.912, 20.46, 22.156,
  23.999, 25.991, 28.125, 30.397, 32.809, 35.358, 38.038, 40.84, 43.749, 46.75,
  49.825, 52.952, 56.112, 59.282, 62.439, 65.56, 68.618, 71.588, 74.445, 77.163,
  79.719, 82.092, 84.261, 86.207, 87.913, 89.365, 90.547, 91.449, 92.062, 92.383,
  92.412, 92.152, 91.604, 90.774, 89.668, 88.298, 86.676, 84.817, 82.738, 80.458,
  78, 75.39, 72.653, 69.813, 66.897, 63.928, 60.93, 57.926, 54.938, 51.988,
  49.095, 46.278, 43.55, 40.924, 38.408, 36.01, 33.734, 31.582, 29.555, 27.652,
  25.871, 24.209, 22.662, 21.225, 19.892, 18.657, 17.515, 16.458, 15.481, 14.578,
  13.743,
])

const ILLUMINANT_COOL = new Float32Array([
  55.2, 58.1, 61.0, 72.5, 84.1, 87.9, 91.8, 92.4, 93.0, 90.8, 88.6, 96.2, 103.8,
  108.5, 113.2, 113.5, 113.8, 112.6, 111.4, 112.0, 112.6, 110.1, 107.6, 108.0,
  108.4, 107.7, 107.0, 105.7, 104.4, 105.7, 107.0, 105.6, 104.2, 104.1, 104.0,
  102.3, 100.6, 99.1, 97.6, 97.4, 97.2, 94.5, 91.8, 92.4, 93.0, 92.7, 92.4, 91.4,
  90.4, 88.2, 86.0, 86.2, 86.4, 84.7, 83.0, 83.1, 83.2, 84.1, 85.0, 83.1, 81.2,
  77.1, 73.0, 73.9, 74.8, 76.1, 77.4, 71.2, 65.0, 68.9, 72.8, 75.3, 77.8, 72.5,
  67.2, 68.4, 69.6, 68.7, 67.8, 65.2, 62.6,
])

const ILLUMINANT_TWILIGHT = new Float32Array([
  38.0, 42.0, 48.0, 62.0, 78.0, 85.0, 92.0, 95.0, 98.0, 96.0, 94.0, 102.0, 110.0,
  112.0, 114.0, 110.0, 106.0, 100.0, 94.0, 90.0, 86.0, 80.0, 74.0, 70.0, 66.0,
  62.0, 58.0, 54.0, 50.0, 48.0, 46.0, 44.0, 42.0, 40.0, 38.0, 36.0, 34.0, 32.0,
  30.0, 28.5, 27.0, 25.5, 24.0, 23.0, 22.0, 21.0, 20.0, 19.0, 18.0, 17.0, 16.0,
  15.2, 14.4, 13.6, 12.8, 12.1, 11.4, 10.8, 10.2, 9.6, 9.1, 8.6, 8.1, 7.7, 7.3,
  6.9, 6.5, 6.2, 5.9, 5.6, 5.3, 5.0, 4.8, 4.5, 4.3, 4.1, 3.9, 3.7, 3.5, 3.3, 3.2,
])

const ILLUMINANTS: Record<IlluminantType, Float32Array> = {
  D65,
  A: ILLUMINANT_A,
  cool: ILLUMINANT_COOL,
  twilight: ILLUMINANT_TWILIGHT,
}

/** Saunderson */
const SAUNDERSON_K1 = 0.03
const SAUNDERSON_K2 = 0.6

export function reflectanceToKS(r: number): number {
  const clampedR = Math.max(0.0001, Math.min(0.9999, r))
  const t = 1 - clampedR
  return (t * t) / (2 * clampedR)
}

export function ksToReflectance(ks: number): number {
  const r = 1 + ks - Math.sqrt(ks * ks + 2 * ks)
  return Math.max(0, Math.min(1, r))
}

function toInternalR(rMeasured: number): number {
  const r = Math.max(0.0001, Math.min(0.9999, rMeasured))
  const num = r - SAUNDERSON_K1
  const den = 1 - SAUNDERSON_K1 - SAUNDERSON_K2 + SAUNDERSON_K2 * r
  if (den <= 1e-9) return 0.0001
  return Math.max(0.0001, Math.min(0.9999, num / den))
}

function toMeasuredR(rInternal: number): number {
  const r = Math.max(0.0001, Math.min(0.9999, rInternal))
  const val =
    SAUNDERSON_K1 +
    ((1 - SAUNDERSON_K1) * (1 - SAUNDERSON_K2) * r) / (1 - SAUNDERSON_K2 * r)
  return Math.max(0, Math.min(1, val))
}

/** Спектр уже на сетке CIE (после parseSpectrum / normalizeSpectrumToCIE) */
function isCieAligned(spectrum: SpectrumPoint[]): boolean {
  return (
    spectrum.length === SPECTRUM_LEN &&
    spectrum[0].wavelength === WL_START &&
    spectrum[SPECTRUM_LEN - 1].wavelength === 780
  )
}

export function interpolateReflectance(
  spectrum: SpectrumPoint[],
  wavelength: number
): number {
  if (!spectrum || spectrum.length === 0) return 0
  if (wavelength <= spectrum[0].wavelength) return spectrum[0].reflectance
  if (wavelength >= spectrum[spectrum.length - 1].wavelength) {
    return spectrum[spectrum.length - 1].reflectance
  }

  let low = 0
  let high = spectrum.length - 1
  while (high - low > 1) {
    const mid = (low + high) >> 1
    if (spectrum[mid].wavelength < wavelength) low = mid
    else high = mid
  }

  const p1 = spectrum[low]
  const p2 = spectrum[high]
  const t = (wavelength - p1.wavelength) / (p2.wavelength - p1.wavelength)
  return p1.reflectance + t * (p2.reflectance - p1.reflectance)
}

export function normalizeSpectrumToCIE(
  rawSpectrum: SpectrumPoint[]
): SpectrumPoint[] {
  if (!rawSpectrum || rawSpectrum.length === 0) return []

  const normalized: SpectrumPoint[] = new Array(SPECTRUM_LEN)
  for (let i = 0; i < SPECTRUM_LEN; i++) {
    normalized[i] = {
      wavelength: CIE_CMF[i].wl,
      reflectance: interpolateReflectance(rawSpectrum, CIE_CMF[i].wl),
    }
  }
  return normalized
}

export function parseSpectrum(text: string): SpectrumPoint[] {
  const lines = text.trim().split(/\r?\n/)
  const points: SpectrumPoint[] = []

  for (let li = 0; li < lines.length; li++) {
    const parts = lines[li].trim().split(/[\s,;]+/)
    if (parts.length < 2) continue
    const wl = parseFloat(parts[0])
    const refl = parseFloat(parts[1])
    if (!isNaN(wl) && !isNaN(refl)) {
      points.push({ wavelength: wl, reflectance: refl })
    }
  }

  points.sort((a, b) => a.wavelength - b.wavelength)
  return normalizeSpectrumToCIE(points)
}

/**
 * Two-Constant Kubelka–Munk + Saunderson.
 * Fast-path: CIE-aligned spectra → прямое индексирование, без интерполяции.
 */
export function mixSpectra(components: MixComponent[]): SpectrumPoint[] {
  const n = components.length
  if (n === 0) return []

  let totalVolume = 0
  for (let c = 0; c < n; c++) totalVolume += components[c].volume
  if (totalVolume <= 0) return []

  const invTotal = 1 / totalVolume
  const aligned = components.every((c) => isCieAligned(c.spectrum))
  const result: SpectrumPoint[] = new Array(SPECTRUM_LEN)

  for (let i = 0; i < SPECTRUM_LEN; i++) {
    const wl = WL[i]
    let totalK = 0
    let totalS = 0

    for (let c = 0; c < n; c++) {
      const comp = components[c]
      const weight = comp.volume * invTotal

      let rMeas: number
      if (aligned) {
        rMeas = comp.spectrum[i].reflectance * 0.01
      } else {
        rMeas = interpolateReflectance(comp.spectrum, wl) * 0.01
      }

      if (comp.isBinder) {
        totalS += weight * 0.02
        totalK += weight * 0.002
      } else {
        const rInt = toInternalR(rMeas)
        const S = 0.2 + 0.8 * rInt
        const KS = reflectanceToKS(rInt)
        totalK += weight * KS * S
        totalS += weight * S
      }
    }

    const mixedKS =
      totalS > 1e-8 ? totalK / totalS : reflectanceToKS(0.0001)
    const rMeasMix = toMeasuredR(ksToReflectance(mixedKS))

    result[i] = {
      wavelength: wl,
      reflectance: rMeasMix * 100,
    }
  }

  return result
}

export function spectrumToXYZWithIlluminant(
  spectrum: SpectrumPoint[],
  illuminant: IlluminantType = 'D65'
): XYZ {
  let X = 0
  let Y = 0
  let Z = 0
  let N = 0

  const S = ILLUMINANTS[illuminant]
  const step = 5
  const aligned = isCieAligned(spectrum)

  for (let i = 0; i < SPECTRUM_LEN; i++) {
    const refl = aligned
      ? spectrum[i].reflectance * 0.01
      : interpolateReflectance(spectrum, WL[i]) * 0.01

    const s = S[i]
    X += s * refl * XBAR[i] * step
    Y += s * refl * YBAR[i] * step
    Z += s * refl * ZBAR[i] * step
    N += s * YBAR[i] * step
  }

  const k = N > 0 ? 100 / N : 0
  return { x: X * k, y: Y * k, z: Z * k }
}

export function spectrumToXYZ(spectrum: SpectrumPoint[]): XYZ {
  return spectrumToXYZWithIlluminant(spectrum, 'D65')
}

function xyzToLinearRGB(xyz: XYZ): { r: number; g: number; b: number } {
  const r = 3.2404542 * xyz.x - 1.5371385 * xyz.y - 0.4985314 * xyz.z
  const g = -0.969266 * xyz.x + 1.8760108 * xyz.y + 0.041556 * xyz.z
  const b = 0.0556434 * xyz.x - 0.2040259 * xyz.y + 1.0572252 * xyz.z
  return { r: r / 100, g: g / 100, b: b / 100 }
}

function linearToSrgb(c: number): number {
  const clipped = Math.max(0, Math.min(1, c))
  const encoded =
    clipped <= 0.0031308
      ? 12.92 * clipped
      : 1.055 * Math.pow(clipped, 1 / 2.4) - 0.055
  return Math.round(encoded * 255)
}

export function spectrumToRGBWithIlluminant(
  spectrum: SpectrumPoint[],
  illuminant: IlluminantType = 'D65'
): RGB {
  const xyz = spectrumToXYZWithIlluminant(spectrum, illuminant)
  const linear = xyzToLinearRGB(xyz)
  return {
    r: linearToSrgb(linear.r),
    g: linearToSrgb(linear.g),
    b: linearToSrgb(linear.b),
  }
}

export function spectrumToRGB(spectrum: SpectrumPoint[]): RGB {
  return spectrumToRGBWithIlluminant(spectrum, 'D65')
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number): string => {
    const value = Math.max(0, Math.min(255, Math.round(n)))
    const hex = value.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return '#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b)
}
