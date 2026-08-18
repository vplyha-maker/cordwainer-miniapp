import { Pigment } from '../data/pigments'
import { Lang } from '../App'
import {
  mixSpectra,
  spectrumToRGB,
  rgbToHex,
  SpectrumPoint,
} from './colorScience'

export type CoverageSystem = 'aniline' | 'acrylic'

// ==========================================
// Чистые базовые цвета (канцтовары)
// ==========================================
export const PURE_BASIC_COLORS = [
  {
    id: 'pure_white',
    name: { uk: 'Білий', ru: 'Белый', en: 'White' },
    sourceIds: ['titanium_white', 'zinc_white', 'lithopone'],
  },
  {
    id: 'pure_black',
    name: { uk: 'Чорний', ru: 'Чёрный', en: 'Black' },
    sourceIds: ['carbon_black', 'ivory_black', 'lamp_black'],
  },
  {
    id: 'pure_red',
    name: { uk: 'Червоний', ru: 'Красный', en: 'Red' },
    sourceIds: ['cadmium_red', 'iron_oxide_red', 'pyrrole_red'],
  },
  {
    id: 'pure_yellow',
    name: { uk: 'Жовтий', ru: 'Жёлтый', en: 'Yellow' },
    sourceIds: ['cadmium_yellow', 'ochre', 'azo_yellow'],
  },
  {
    id: 'pure_blue',
    name: { uk: 'Синій', ru: 'Синий', en: 'Blue' },
    sourceIds: ['ultramarine', 'phthalo_blue', 'prussian_blue'],
  },
  {
    id: 'pure_green',
    name: { uk: 'Зелений', ru: 'Зелёный', en: 'Green' },
    sourceIds: ['phthalo_green', 'green_earth', 'viridian'],
  },
] as const

export function getPureBasicPigments(pigments: Pigment[]): Pigment[] {
  return PURE_BASIC_COLORS.map((basic) => {
    const source = pigments.find((p) => basic.sourceIds.some((id) => id === p.id))
    return source ? source : null
  }).filter(Boolean) as Pigment[]
}

export const getPigmentCategory = (id: string, lang: Lang) => {
  const isUk = lang === 'uk'
  if (id.includes('cadmium')) return isUk ? 'Кадмієва група' : 'Кадмиевая группа'
  if (id.includes('cobalt')) return isUk ? 'Кобальтова група' : 'Кобальтовая группа'
  if (id.includes('white') || ['lithopone', 'chalk', 'gypsum'].includes(id))
    return isUk ? 'Білила / Наповнювачі' : 'Белила / Наполнители'
  if (id.includes('ochre') || id.includes('sienna') || id.includes('umber') || id === 'green_earth')
    return isUk ? 'Земляні пігменти' : 'Земляные пигменты'
  if (id.includes('black') || id === 'bitumen')
    return isUk ? 'Чорні / Вуглецеві' : 'Черные / Углеродные'
  if (id.includes('phthalo'))
    return isUk ? 'Фталоціаніни (синтетика)' : 'Фталоцианины (синтетика)'
  if (['ultramarine', 'ultramarine_nat', 'prussian_blue', 'azurite'].includes(id))
    return isUk ? 'Традиційні сині' : 'Традиционные синие'
  return isUk ? 'Органічний / Інший' : 'Органический / Прочий'
}

// ==========================================
// RGB → Lab (D65)
// ==========================================
function rgbToLab(r: number, g: number, b: number) {
  let r_ = r / 255
  let g_ = g / 255
  let b_ = b / 255

  r_ = r_ > 0.04045 ? Math.pow((r_ + 0.055) / 1.055, 2.4) : r_ / 12.92
  g_ = g_ > 0.04045 ? Math.pow((g_ + 0.055) / 1.055, 2.4) : g_ / 12.92
  b_ = b_ > 0.04045 ? Math.pow((b_ + 0.055) / 1.055, 2.4) : b_ / 12.92

  let x = (r_ * 0.4124 + g_ * 0.3576 + b_ * 0.1805) * 100
  let y = (r_ * 0.2126 + g_ * 0.7152 + b_ * 0.0722) * 100
  let z = (r_ * 0.0193 + g_ * 0.1192 + b_ * 0.9505) * 100

  x /= 95.047
  y /= 100.0
  z /= 108.883

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116

  return {
    L: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  }
}

// ==========================================
// CIEDE2000
// ==========================================
function calculateDeltaE2000(
  lab1: { L: number; a: number; b: number },
  lab2: { L: number; a: number; b: number }
): number {
  const { L: L1, a: a1, b: b1 } = lab1
  const { L: L2, a: a2, b: b2 } = lab2

  const kL = 1, kC = 1, kH = 1

  const C1 = Math.sqrt(a1 * a1 + b1 * b1)
  const C2 = Math.sqrt(a2 * a2 + b2 * b2)
  const Cbar = (C1 + C2) / 2

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))))

  const a1Prime = a1 * (1 + G)
  const a2Prime = a2 * (1 + G)

  const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1)
  const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2)
  const CbarPrime = (C1Prime + C2Prime) / 2

  let h1Prime =
    b1 === 0 && a1Prime === 0
      ? 0
      : ((Math.atan2(b1, a1Prime) * 180) / Math.PI + 360) % 360
  let h2Prime =
    b2 === 0 && a2Prime === 0
      ? 0
      : ((Math.atan2(b2, a2Prime) * 180) / Math.PI + 360) % 360

  let HbarPrime = h1Prime + h2Prime
  if (C1Prime * C2Prime !== 0) {
    if (Math.abs(h1Prime - h2Prime) > 180) {
      HbarPrime = HbarPrime < 360 ? HbarPrime + 360 : HbarPrime - 360
    }
    HbarPrime /= 2
  }

  const T =
    1 -
    0.17 * Math.cos(((HbarPrime - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * HbarPrime * Math.PI) / 180) +
    0.32 * Math.cos(((3 * HbarPrime + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * HbarPrime - 63) * Math.PI) / 180)

  let deltahPrime = 0
  if (C1Prime * C2Prime !== 0) {
    if (Math.abs(h2Prime - h1Prime) <= 180) {
      deltahPrime = h2Prime - h1Prime
    } else if (h2Prime - h1Prime > 180) {
      deltahPrime = h2Prime - h1Prime - 360
    } else {
      deltahPrime = h2Prime - h1Prime + 360
    }
  }

  const deltaLPrime = L2 - L1
  const deltaCPrime = C2Prime - C1Prime
  const deltaHPrime =
    2 * Math.sqrt(C1Prime * C2Prime) * Math.sin((deltahPrime * Math.PI) / 360)

  const LbarPrime = (L1 + L2) / 2
  const S_L =
    1 +
    (0.015 * Math.pow(LbarPrime - 50, 2)) /
      Math.sqrt(20 + Math.pow(LbarPrime - 50, 2))
  const S_C = 1 + 0.045 * CbarPrime
  const S_H = 1 + 0.015 * CbarPrime * T

  const deltaTheta = 30 * Math.exp(-Math.pow((HbarPrime - 275) / 25, 2))
  const R_C = 2 * Math.sqrt(Math.pow(CbarPrime, 7) / (Math.pow(CbarPrime, 7) + Math.pow(25, 7)))
  const R_T = -Math.sin((2 * deltaTheta * Math.PI) / 180) * R_C

  return Math.sqrt(
    Math.pow(deltaLPrime / (kL * S_L), 2) +
      Math.pow(deltaCPrime / (kC * S_C), 2) +
      Math.pow(deltaHPrime / (kH * S_H), 2) +
      R_T * (deltaCPrime / (kC * S_C)) * (deltaHPrime / (kH * S_H))
  )
}

export function hexToRgbObj(hex: string) {
  let c = hex.replace(/^#/, '')
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]
  return {
    r: parseInt(c.substring(0, 2), 16) || 0,
    g: parseInt(c.substring(2, 4), 16) || 0,
    b: parseInt(c.substring(4, 6), 16) || 0,
  }
}

// ==========================================
// Вспомогательные
// ==========================================
function combinations(n: number, k: number): number[][] {
  const result: number[][] = []
  const combo: number[] = []

  function backtrack(start: number) {
    if (combo.length === k) {
      result.push([...combo])
      return
    }
    for (let i = start; i < n; i++) {
      combo.push(i)
      backtrack(i + 1)
      combo.pop()
    }
  }
  backtrack(0)
  return result
}

function isBlack(p: Pigment) {
  return (
    p.id.includes('black') ||
    p.id === 'bitumen' ||
    (p.name?.en || '').toLowerCase().includes('black')
  )
}

function isWhite(p: Pigment) {
  return (
    p.id.includes('white') ||
    ['lithopone', 'chalk', 'gypsum'].includes(p.id) ||
    (p.name?.en || '').toLowerCase().includes('white')
  )
}

/** Быстрый NNLS проекционного градиента для малых k */
function nnlsProjectedGradient(A: number[][], b: number[], iters = 400, alpha = 0.07) {
  const n = A[0].length
  let x = new Array(n).fill(0.0)

  // warm-start
  const ATb = new Array(n).fill(0)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < b.length; i++) ATb[j] += A[i][j] * b[i]
  }
  const maxAtb = Math.max(...ATb, 0)
  if (maxAtb > 0) {
    for (let j = 0; j < n; j++) x[j] = Math.max(0, ATb[j] / maxAtb)
  }

  for (let it = 0; it < iters; it++) {
    const Ax = new Array(b.length).fill(0)
    for (let i = 0; i < b.length; i++) {
      for (let j = 0; j < n; j++) Ax[i] += A[i][j] * x[j]
    }

    const resid = b.map((bi, i) => Ax[i] - bi)
    const grad = new Array(n).fill(0)
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < b.length; i++) grad[j] += A[i][j] * resid[i]
      grad[j] *= 2
    }

    for (let j = 0; j < n; j++) {
      x[j] = Math.max(0, x[j] - alpha * grad[j])
    }
  }
  return x
}

interface BestResult {
  volumes: number[]
  rgb: { r: number; g: number; b: number }
  deltaE: number
  score: number
}

// ==========================================
// ГЛАВНЫЙ АЛГОРИТМ (NNLS + спектральная оценка)
// ==========================================
export function findRecipeByHex(
  targetHex: string,
  basicPigments: Pigment[],
  maxComponents = 4,
  targetVolume = 20
) {
  if (!basicPigments.length || !targetHex) return null

  const validPigments = basicPigments.filter((p) => p.spectrum && p.spectrum.length > 0)
  if (validPigments.length === 0) return null

  const targetRgb = hexToRgbObj(targetHex)
  const targetLab = rgbToLab(targetRgb.r, targetRgb.g, targetRgb.b)

  // кэш
  const cache = validPigments.map((p) => {
    const rgb = spectrumToRGB(p.spectrum!)
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
    return { p, rgb, lab }
  })

  const blackPigment = validPigments.find(isBlack) || null
  const whitePigment = validPigments.find(isWhite) || null

  // скоринг по deltaE
  const scored = cache
    .filter((c) => c.p !== blackPigment && c.p !== whitePigment)
    .map((c) => ({ ...c, dist: calculateDeltaE2000(targetLab, c.lab) }))
    .sort((a, b) => a.dist - b.dist)

  // кандидаты: чёрный + белый + топ хроматических
  const TOP_M = 6
  const candidates: Pigment[] = []
  if (blackPigment) candidates.push(blackPigment)
  if (whitePigment) candidates.push(whitePigment)
  for (const s of scored) {
    if (candidates.length >= 2 + TOP_M) break
    candidates.push(s.p)
  }

  const n = candidates.length
  if (n === 0) return null

  // предрасчёт данных кандидатов
  const candData = candidates.map((p) => {
    const rgb = spectrumToRGB(p.spectrum!)
    return {
      p,
      spectrum: p.spectrum!,
      rgb,
      lab: rgbToLab(rgb.r, rgb.g, rgb.b),
    }
  })

  const best: BestResult = {
    volumes: new Array(n).fill(0),
    rgb: { r: 0, g: 0, b: 0 },
    deltaE: Infinity,
    score: Infinity,
  }

  // штраф за количество компонентов и крошечные доли
  const scoreWithPenalties = (deltaE: number, volumes: number[]) => {
    const comps = volumes.filter((v) => v > 0.5).length
    const tinyCount = volumes.filter((v) => v > 0.5 && v < 1.1).length
    const lambdaComp = 0.85
    const lambdaTiny = 0.55
    return deltaE + lambdaComp * Math.max(0, comps - 1) + lambdaTiny * tinyCount
  }

  const evaluateByVolumes = (volumesRaw: number[]) => {
    const comps: { spectrum: SpectrumPoint[]; volume: number }[] = []
    for (let i = 0; i < volumesRaw.length; i++) {
      if (volumesRaw[i] > 0.4) {
        comps.push({ spectrum: candData[i].spectrum, volume: volumesRaw[i] })
      }
    }
    if (comps.length === 0) return

    const mixed = mixSpectra(comps)
    const rgb = spectrumToRGB(mixed)
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
    const deltaE = calculateDeltaE2000(targetLab, lab)
    const sc = scoreWithPenalties(deltaE, volumesRaw)

    if (sc < best.score) {
      best.score = sc
      best.deltaE = deltaE
      best.rgb = rgb
      best.volumes = [...volumesRaw]
    }
  }

  // NNLS для одной комбинации
  const runCombinationNNLS = (indices: number[]) => {
    const k = indices.length
    const A = [
      new Array(k).fill(0),
      new Array(k).fill(0),
      new Array(k).fill(0),
    ]
    for (let j = 0; j < k; j++) {
      const d = candData[indices[j]].rgb
      A[0][j] = d.r / 255
      A[1][j] = d.g / 255
      A[2][j] = d.b / 255
    }
    const b = [targetRgb.r / 255, targetRgb.g / 255, targetRgb.b / 255]

    const x = nnlsProjectedGradient(A, b, 500, 0.065)
    const sum = x.reduce((s, v) => s + v, 0)
    if (sum <= 1e-6) return

    const vols = new Array(n).fill(0)
    for (let j = 0; j < k; j++) {
      const abs = (x[j] / sum) * targetVolume
      vols[indices[j]] = Math.max(0, Math.round(abs * 10) / 10)
    }

    evaluateByVolumes(vols)

    // небольшая локальная доводка
    const active = indices.filter((i) => vols[i] > 0.5)
    for (let pass = 0; pass < 2; pass++) {
      for (const idx of active) {
        for (const d of [-1.5, -0.8, 0.8, 1.5]) {
          const trial = [...vols]
          trial[idx] = Math.max(0.3, Math.min(targetVolume * 1.15, Math.round((trial[idx] + d) * 10) / 10))
          const total = trial.reduce((s, v) => s + v, 0)
          if (total <= 0) continue
          const scale = targetVolume / total
          for (let i = 0; i < trial.length; i++) {
            trial[i] = Math.round(trial[i] * scale * 10) / 10
          }
          evaluateByVolumes(trial)
        }
      }
    }
  }

  // перебор комбинаций с ограничением
  const maxCombosToTry = 900
  let triedCombos = 0

  for (let k = 1; k <= Math.min(maxComponents, n); k++) {
    const combos = combinations(n, k)
    for (const combo of combos) {
      if (triedCombos++ > maxCombosToTry) break
      runCombinationNNLS(combo)
    }
    if (triedCombos > maxCombosToTry) break
  }

  if (best.score === Infinity) return null

  // финальная подготовка рецепта
  const total = best.volumes.reduce((s, v) => s + v, 0)
  if (total <= 0) return null

  const scale = targetVolume > 0 ? targetVolume / total : 1

  const recipe = candidates
    .map((p, i) => ({
      pigment: p,
      ml: Math.round(best.volumes[i] * scale * 10) / 10,
    }))
    .filter((r) => r.ml >= 0.3)
    .sort((a, b) => b.ml - a.ml)

  // пересчитываем финальный цвет спектрально
  const finalComps = recipe.map((r) => ({
    spectrum: r.pigment.spectrum!,
    volume: r.ml,
  }))
  const finalMix = mixSpectra(finalComps)
  const finalRgb = spectrumToRGB(finalMix)
  const finalLab = rgbToLab(finalRgb.r, finalRgb.g, finalRgb.b)
  const finalDeltaE = calculateDeltaE2000(targetLab, finalLab)

  return {
    recipe,
    resultRgb: finalRgb,
    resultHex: rgbToHex(finalRgb),
    deltaE: Math.round(finalDeltaE * 10) / 10,
  }
}

// ==========================================
// Симуляция слоёв (Kubelka-Munk)
// ==========================================
export function simulateLayersKM(
  baseSpectrum: SpectrumPoint[],
  paintSpectrum: SpectrumPoint[],
  system: CoverageSystem
) {
  let strength = system === 'aniline' ? 24 : 48

  const baseRgb = spectrumToRGB(baseSpectrum)
  const paintRgb = spectrumToRGB(paintSpectrum)

  const baseL = (0.2126 * baseRgb.r + 0.7152 * baseRgb.g + 0.0722 * baseRgb.b) / 255
  const paintL = (0.2126 * paintRgb.r + 0.7152 * paintRgb.g + 0.0722 * paintRgb.b) / 255
  const deltaL = Math.abs(paintL - baseL)

  if (deltaL > 0.45) strength *= 0.72
  else if (deltaL > 0.3) strength *= 0.85
  else if (deltaL < 0.12) strength *= 1.18

  strength = Math.max(16, Math.min(58, strength))

  const mixLayer = (current: SpectrumPoint[], paint: SpectrumPoint[], s: number) => {
    return mixSpectra([
      { spectrum: current, volume: 100 - s },
      { spectrum: paint, volume: s },
    ])
  }

  const layer1 = mixLayer(baseSpectrum, paintSpectrum, strength)
  const layer2 = mixLayer(layer1, paintSpectrum, strength * 0.94)
  const layer3 = mixLayer(layer2, paintSpectrum, strength * 0.91)

  return {
    layer1,
    layer2,
    layer3,
    final: paintSpectrum,
    strength: Math.round(strength),
    deltaL,
  }
}
