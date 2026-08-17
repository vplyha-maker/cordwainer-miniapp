/**
 * colorScience.ts
 * Reflectance spectrum → XYZ → sRGB
 * CIE 1931 2° + Illuminant D65 / A / Cool / Twilight
 * Subtractive mixing via Kubelka-Munk theory
 */

export interface SpectrumPoint {
  wavelength: number // нм
  reflectance: number // 0–100
}

export interface RGB {
  r: number // 0–255
  g: number
  b: number
}

export interface XYZ {
  x: number
  y: number
  z: number
}

export type IlluminantType = 'D65' | 'A' | 'cool' | 'twilight'

// CIE 1931 2° Color Matching Functions (каждые 5 нм, 380–780)
const CIE_CMF = [
  { wl: 380, x: 0.001368, y: 0.000039, z: 0.006450 },
  { wl: 385, x: 0.002236, y: 0.000064, z: 0.010550 },
  { wl: 390, x: 0.004243, y: 0.000120, z: 0.020050 },
  { wl: 395, x: 0.007650, y: 0.000217, z: 0.036210 },
  { wl: 400, x: 0.014310, y: 0.000396, z: 0.067850 },
  { wl: 405, x: 0.023190, y: 0.000640, z: 0.110200 },
  { wl: 410, x: 0.043510, y: 0.001210, z: 0.207400 },
  { wl: 415, x: 0.077630, y: 0.002180, z: 0.371300 },
  { wl: 420, x: 0.134380, y: 0.004000, z: 0.645600 },
  { wl: 425, x: 0.214770, y: 0.007300, z: 1.039050 },
  { wl: 430, x: 0.283900, y: 0.011600, z: 1.385600 },
  { wl: 435, x: 0.328500, y: 0.016840, z: 1.622960 },
  { wl: 440, x: 0.348280, y: 0.023000, z: 1.747060 },
  { wl: 445, x: 0.348060, y: 0.029800, z: 1.782600 },
  { wl: 450, x: 0.336200, y: 0.038000, z: 1.772110 },
  { wl: 455, x: 0.318700, y: 0.048000, z: 1.744100 },
  { wl: 460, x: 0.290800, y: 0.060000, z: 1.669200 },
  { wl: 465, x: 0.251100, y: 0.073900, z: 1.528100 },
  { wl: 470, x: 0.195360, y: 0.090980, z: 1.287640 },
  { wl: 475, x: 0.142100, y: 0.112600, z: 1.041900 },
  { wl: 480, x: 0.095640, y: 0.139020, z: 0.812950 },
  { wl: 485, x: 0.057950, y: 0.169300, z: 0.616200 },
  { wl: 490, x: 0.032010, y: 0.208020, z: 0.465180 },
  { wl: 495, x: 0.014700, y: 0.258600, z: 0.353300 },
  { wl: 500, x: 0.004900, y: 0.323000, z: 0.272000 },
  { wl: 505, x: 0.002400, y: 0.407300, z: 0.212300 },
  { wl: 510, x: 0.009300, y: 0.503000, z: 0.158200 },
  { wl: 515, x: 0.029100, y: 0.608200, z: 0.111700 },
  { wl: 520, x: 0.063270, y: 0.710000, z: 0.078250 },
  { wl: 525, x: 0.109600, y: 0.793200, z: 0.057250 },
  { wl: 530, x: 0.165500, y: 0.862000, z: 0.042160 },
  { wl: 535, x: 0.225750, y: 0.914850, z: 0.029840 },
  { wl: 540, x: 0.290400, y: 0.954000, z: 0.020300 },
  { wl: 545, x: 0.359700, y: 0.980300, z: 0.013400 },
  { wl: 550, x: 0.433450, y: 0.994950, z: 0.008750 },
  { wl: 555, x: 0.512050, y: 1.000000, z: 0.005750 },
  { wl: 560, x: 0.594500, y: 0.995000, z: 0.003900 },
  { wl: 565, x: 0.678400, y: 0.978600, z: 0.002750 },
  { wl: 570, x: 0.762100, y: 0.952000, z: 0.002100 },
  { wl: 575, x: 0.842500, y: 0.915400, z: 0.001800 },
  { wl: 580, x: 0.916300, y: 0.870000, z: 0.001650 },
  { wl: 585, x: 0.978600, y: 0.816300, z: 0.001400 },
  { wl: 590, x: 1.026300, y: 0.757000, z: 0.001100 },
  { wl: 595, x: 1.056700, y: 0.694900, z: 0.001000 },
  { wl: 600, x: 1.062200, y: 0.631000, z: 0.000800 },
  { wl: 605, x: 1.045600, y: 0.566800, z: 0.000600 },
  { wl: 610, x: 1.002600, y: 0.503000, z: 0.000340 },
  { wl: 615, x: 0.938400, y: 0.441200, z: 0.000240 },
  { wl: 620, x: 0.854450, y: 0.381000, z: 0.000190 },
  { wl: 625, x: 0.751400, y: 0.321000, z: 0.000100 },
  { wl: 630, x: 0.642400, y: 0.265000, z: 0.000050 },
  { wl: 635, x: 0.541900, y: 0.217000, z: 0.000030 },
  { wl: 640, x: 0.447900, y: 0.175000, z: 0.000020 },
  { wl: 645, x: 0.360800, y: 0.138200, z: 0.000010 },
  { wl: 650, x: 0.283500, y: 0.107000, z: 0.000000 },
  { wl: 655, x: 0.218700, y: 0.081600, z: 0.000000 },
  { wl: 660, x: 0.164900, y: 0.061000, z: 0.000000 },
  { wl: 665, x: 0.121200, y: 0.044580, z: 0.000000 },
  { wl: 670, x: 0.087400, y: 0.032000, z: 0.000000 },
  { wl: 675, x: 0.063600, y: 0.023200, z: 0.000000 },
  { wl: 680, x: 0.046770, y: 0.017000, z: 0.000000 },
  { wl: 685, x: 0.032900, y: 0.011920, z: 0.000000 },
  { wl: 690, x: 0.022700, y: 0.008210, z: 0.000000 },
  { wl: 695, x: 0.015840, y: 0.005723, z: 0.000000 },
  { wl: 700, x: 0.011359, y: 0.004102, z: 0.000000 },
  { wl: 705, x: 0.008111, y: 0.002929, z: 0.000000 },
  { wl: 710, x: 0.005790, y: 0.002091, z: 0.000000 },
  { wl: 715, x: 0.004109, y: 0.001484, z: 0.000000 },
  { wl: 720, x: 0.002899, y: 0.001047, z: 0.000000 },
  { wl: 725, x: 0.002049, y: 0.000740, z: 0.000000 },
  { wl: 730, x: 0.001440, y: 0.000520, z: 0.000000 },
  { wl: 735, x: 0.001000, y: 0.000361, z: 0.000000 },
  { wl: 740, x: 0.000690, y: 0.000249, z: 0.000000 },
  { wl: 745, x: 0.000476, y: 0.000172, z: 0.000000 },
  { wl: 750, x: 0.000332, y: 0.000120, z: 0.000000 },
  { wl: 755, x: 0.000235, y: 0.000085, z: 0.000000 },
  { wl: 760, x: 0.000166, y: 0.000060, z: 0.000000 },
  { wl: 765, x: 0.000117, y: 0.000042, z: 0.000000 },
  { wl: 770, x: 0.000083, y: 0.000030, z: 0.000000 },
  { wl: 775, x: 0.000059, y: 0.000021, z: 0.000000 },
  { wl: 780, x: 0.000042, y: 0.000015, z: 0.000000 },
]

// Illuminant D65 (каждые 5 нм, 380–780)
const D65 = [
  49.9755, 52.3118, 54.6482, 68.7015, 82.7549, 87.1204, 91.486, 92.4589, 93.4318,
  90.057, 86.6823, 95.7736, 104.865, 110.936, 117.008, 117.41, 117.812, 116.336,
  114.861, 115.392, 115.923, 112.367, 108.811, 109.082, 109.354, 108.578, 107.802,
  106.296, 104.79, 106.239, 107.689, 106.047, 104.405, 104.225, 104.046, 102.023,
  100.0, 98.1671, 96.3342, 96.0611, 95.788, 92.2368, 88.6856, 89.3459, 90.0062,
  89.8026, 89.5991, 88.6489, 87.6987, 85.4936, 83.2886, 83.4936, 83.6986, 81.863,
  80.0268, 80.1207, 80.2146, 81.2462, 82.2778, 80.281, 78.2842, 74.0027, 69.7213,
  70.6652, 71.6091, 72.979, 74.349, 67.9767, 61.6043, 65.7448, 69.8856, 72.486,
  75.0865, 69.3616, 63.6363, 64.8082, 65.9801, 65.023, 64.0659, 61.3633, 58.6608,
]

// Illuminant A (тёплая лампа накаливания \~2856K)
const ILLUMINANT_A = [
  9.7951, 10.863, 12.052, 13.786, 15.452, 16.236, 17.507, 18.912, 20.46,
  22.156, 23.999, 25.991, 28.125, 30.397, 32.809, 35.358, 38.038, 40.84,
  43.749, 46.75, 49.825, 52.952, 56.112, 59.282, 62.439, 65.56, 68.618,
  71.588, 74.445, 77.163, 79.719, 82.092, 84.261, 86.207, 87.913, 89.365,
  90.547, 91.449, 92.062, 92.383, 92.412, 92.152, 91.604, 90.774, 89.668,
  88.298, 86.676, 84.817, 82.738, 80.458, 78, 75.39, 72.653, 69.813,
  66.897, 63.928, 60.93, 57.926, 54.938, 51.988, 49.095, 46.278, 43.55,
  40.924, 38.408, 36.01, 33.734, 31.582, 29.555, 27.652, 25.871, 24.209,
  22.662, 21.225, 19.892, 18.657, 17.515, 16.458, 15.481, 14.578, 13.743,
]

// Холодный белый (приближение LED / F7 \~5000K)
const ILLUMINANT_COOL = [
  55.2, 58.1, 61.0, 72.5, 84.1, 87.9, 91.8, 92.4, 93.0,
  90.8, 88.6, 96.2, 103.8, 108.5, 113.2, 113.5, 113.8, 112.6,
  111.4, 112.0, 112.6, 110.1, 107.6, 108.0, 108.4, 107.7, 107.0,
  105.7, 104.4, 105.7, 107.0, 105.6, 104.2, 104.1, 104.0, 102.3,
  100.6, 99.1, 97.6, 97.4, 97.2, 94.5, 91.8, 92.4, 93.0,
  92.7, 92.4, 91.4, 90.4, 88.2, 86.0, 86.2, 86.4, 84.7,
  83.0, 83.1, 83.2, 84.1, 85.0, 83.1, 81.2, 77.1, 73.0,
  73.9, 74.8, 76.1, 77.4, 71.2, 65.0, 68.9, 72.8, 75.3,
  77.8, 72.5, 67.2, 68.4, 69.6, 68.7, 67.8, 65.2, 62.6,
]

// Сумерки (смещение в сине-фиолетовую область + общее затемнение)
const ILLUMINANT_TWILIGHT = [
  38.0, 42.0, 48.0, 62.0, 78.0, 85.0, 92.0, 95.0, 98.0,
  96.0, 94.0, 102.0, 110.0, 112.0, 114.0, 110.0, 106.0, 100.0,
  94.0, 90.0, 86.0, 80.0, 74.0, 70.0, 66.0, 62.0, 58.0,
  54.0, 50.0, 48.0, 46.0, 44.0, 42.0, 40.0, 38.0, 36.0,
  34.0, 32.0, 30.0, 28.5, 27.0, 25.5, 24.0, 23.0, 22.0,
  21.0, 20.0, 19.0, 18.0, 17.0, 16.0, 15.2, 14.4, 13.6,
  12.8, 12.1, 11.4, 10.8, 10.2, 9.6, 9.1, 8.6, 8.1,
  7.7, 7.3, 6.9, 6.5, 6.2, 5.9, 5.6, 5.3, 5.0,
  4.8, 4.5, 4.3, 4.1, 3.9, 3.7, 3.5, 3.3, 3.2,
]

const ILLUMINANTS: Record<IlluminantType, number[]> = {
  D65,
  A: ILLUMINANT_A,
  cool: ILLUMINANT_COOL,
  twilight: ILLUMINANT_TWILIGHT,
}

// --- Вспомогательные функции для физики смешивания (Кубелка-Мунк) ---

function reflectanceToKS(r: number): number {
  const clampedR = Math.max(0.0001, Math.min(0.9999, r))
  return Math.pow(1 - clampedR, 2) / (2 * clampedR)
}

function ksToReflectance(ks: number): number {
  const r = 1 + ks - Math.sqrt(Math.pow(ks, 2) + 2 * ks)
  return Math.max(0, Math.min(1, r))
}

// --------------------------------------------------------------------

export function parseSpectrum(text: string): SpectrumPoint[] {
  const lines = text.trim().split(/\r?\n/)
  const points: SpectrumPoint[] = []

  for (const line of lines) {
    const parts = line.trim().split(/[\s,;]+/)
    if (parts.length < 2) continue

    const wl = parseFloat(parts[0])
    const refl = parseFloat(parts[1])

    if (!isNaN(wl) && !isNaN(refl)) {
      points.push({ wavelength: wl, reflectance: refl })
    }
  }

  points.sort((a, b) => a.wavelength - b.wavelength)
  return points
}

function interpolateReflectance(spectrum: SpectrumPoint[], wavelength: number): number {
  if (spectrum.length === 0) return 0
  if (wavelength <= spectrum[0].wavelength) return spectrum[0].reflectance
  if (wavelength >= spectrum[spectrum.length - 1].wavelength) {
    return spectrum[spectrum.length - 1].reflectance
  }

  let low = 0
  let high = spectrum.length - 1

  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2)
    if (spectrum[mid].wavelength < wavelength) low = mid
    else high = mid
  }

  const p1 = spectrum[low]
  const p2 = spectrum[high]
  const t = (wavelength - p1.wavelength) / (p2.wavelength - p1.wavelength)
  return p1.reflectance + t * (p2.reflectance - p1.reflectance)
}

/**
 * Старая функция (для обратной совместимости) — всегда D65
 */
export function spectrumToXYZ(spectrum: SpectrumPoint[]): XYZ {
  return spectrumToXYZWithIlluminant(spectrum, 'D65')
}

/**
 * Пересчёт спектра в XYZ под выбранным осветителем
 */
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

  for (let i = 0; i < CIE_CMF.length; i++) {
    const wl = CIE_CMF[i].wl
    const refl = interpolateReflectance(spectrum, wl) / 100

    const xBar = CIE_CMF[i].x
    const yBar = CIE_CMF[i].y
    const zBar = CIE_CMF[i].z

    X += S[i] * refl * xBar * step
    Y += S[i] * refl * yBar * step
    Z += S[i] * refl * zBar * step
    N += S[i] * yBar * step
  }

  const k = 100 / N

  return {
    x: X * k,
    y: Y * k,
    z: Z * k,
  }
}

function xyzToLinearRGB(xyz: XYZ) {
  const r = 3.2404542 * xyz.x - 1.5371385 * xyz.y - 0.4985314 * xyz.z
  const g = -0.9692660 * xyz.x + 1.8760108 * xyz.y + 0.0415560 * xyz.z
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

/**
 * Старая функция (для обратной совместимости) — всегда D65
 */
export function spectrumToRGB(spectrum: SpectrumPoint[]): RGB {
  return spectrumToRGBWithIlluminant(spectrum, 'D65')
}

/**
 * Полный путь: спектр → RGB под выбранным освещением
 */
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

export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number): string => {
    const value = Math.max(0, Math.min(255, Math.round(n)))
    const hex = value.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return '#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b)
}

export function mixSpectra(
  components: { spectrum: SpectrumPoint[]; volume: number }[]
): SpectrumPoint[] {
  const totalVolume = components.reduce((sum, c) => sum + c.volume, 0)
  if (totalVolume <= 0) return []

  const base = components[0].spectrum
  const result: SpectrumPoint[] = []

  for (const point of base) {
    let mixedKS = 0

    for (const comp of components) {
      const weight = comp.volume / totalVolume
      const refl = interpolateReflectance(comp.spectrum, point.wavelength) / 100
      mixedKS += weight * reflectanceToKS(refl)
    }

    const finalRefl = ksToReflectance(mixedKS) * 100

    result.push({
      wavelength: point.wavelength,
      reflectance: finalRefl,
    })
  }

  return result
}
