import { Pigment } from '../data/pigments'
import { Lang } from '../App'
import {
  mixSpectra,
  spectrumToRGB,
  rgbToHex,
  SpectrumPoint,
  MixComponent,
} from './colorScience'

export type CoverageSystem = 'aniline' | 'acrylic'

// ==========================================
// Чистые базовые цвета
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
    sourceIds: ['ivory_black', 'lamp_black', 'bone_black'],
  },
  {
    id: 'pure_red',
    name: { uk: 'Червоний', ru: 'Красный', en: 'Red' },
    sourceIds: ['cadmium_red', 'pyrrole_red', 'carmine_lake'],
  },
  {
    id: 'pure_yellow',
    name: { uk: 'Жовтий', ru: 'Жёлтый', en: 'Yellow' },
    sourceIds: ['cadmium_yellow', 'yellow_ochre', 'hansa_yellow'],
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
    const source = pigments.find((p) =>
      (basic.sourceIds as readonly string[]).some((id) => id === p.id)
    )
    return source ? source : null
  }).filter(Boolean) as Pigment[]
}

export const getPigmentCategory = (id: string, lang: Lang) => {
  const isUk = lang === 'uk'
  if (id.includes('cadmium')) return isUk ? 'Кадмієва група' : 'Кадмиевая группа'
  if (id.includes('cobalt')) return isUk ? 'Кобальтова група' : 'Кобальтовая группа'
  if (id.includes('white') || ['lithopone', 'chalk', 'gypsum'].includes(id))
    return isUk ? 'Білила / Наповнювачі' : 'Белила / Наполнители'
  if (
    id.includes('ochre') ||
    id.includes('sienna') ||
    id.includes('umber') ||
    id === 'green_earth'
  )
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

  const kL = 1,
    kC = 1,
    kH = 1

  const C1 = Math.sqrt(a1 * a1 + b1 * b1)
  const C2 = Math.sqrt(a2 * a2 + b2 * b2)
  const Cbar = (C1 + C2) / 2

  const G =
    0.5 *
    (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))))

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

function fastDeltaE(
  lab1: { L: number; a: number; b: number },
  lab2: { L: number; a: number; b: number }
): number {
  return (
    Math.pow(lab1.L - lab2.L, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
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

interface BestResult {
  indices: number[]
  volumes: number[]
  rgb: { r: number; g: number; b: number }
  deltaE: number
}

export interface RecipeItem {
  pigment: Pigment
  ml: number
  isBinder?: boolean
}

// ==========================================
// ГЛАВНЫЙ АЛГОРИТМ (покращений)
// ==========================================
export function findRecipeByHex(
  targetHex: string,
  pigments: Pigment[],
  maxComponents = 3,
  targetVolume = 20,
  system: CoverageSystem = 'acrylic',
  excludeIds: string[] = []
) {
  if (!pigments.length || !targetHex) return null

  const binderPigment =
    system === 'acrylic'
      ? pigments.find((p) => p.id === 'acrylic_binder' || (p as any).isBinder === true)
      : undefined

  const validPigments = pigments.filter(
    (p) =>
      p.id !== 'acrylic_binder' &&
      !(p as any).isBinder &&
      p.spectrum &&
      p.spectrum.length > 0 &&
      !excludeIds.includes(p.id)
  )
  if (validPigments.length === 0) return null

  const targetRgb = hexToRgbObj(targetHex)
  const targetLab = rgbToLab(targetRgb.r, targetRgb.g, targetRgb.b)

  const buildComponentsWithBinder = (
    selectedPigments: Pigment[],
    vols: number[]
  ): MixComponent[] => {
    const components: MixComponent[] = selectedPigments.map((pigment, i) => ({
      spectrum: pigment.spectrum!,
      volume: vols[i],
    }))

    if (binderPigment?.spectrum) {
      const totalPigmentVol = vols.reduce((sum, v) => sum + v, 0)
      components.push({
        spectrum: binderPigment.spectrum,
        volume: totalPigmentVol * 0.2,
        isBinder: true,
      })
    }

    return components
  }

  // 1. Оцінка кожного пігмента
  const scored = validPigments.map((p) => {
    const components = buildComponentsWithBinder([p], [100])
    const rgb = spectrumToRGB(mixSpectra(components))
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
    return { pigment: p, dist: calculateDeltaE2000(targetLab, lab) }
  })
  scored.sort((a, b) => a.dist - b.dist)

  // 2. Розумний набір кандидатів (значно ширший)
  const candidatesSet = new Set<Pigment>()

  // Топ-6 найближчих
  scored.slice(0, 6).forEach((s) => candidatesSet.add(s.pigment))

  // Усі базові (білий, чорний, червоний, жовтий…)
  const allBasicIds = PURE_BASIC_COLORS.flatMap(
    (b) => b.sourceIds as readonly string[]
  )
  validPigments
    .filter((p) => allBasicIds.includes(p.id))
    .forEach((p) => candidatesSet.add(p))

  // Земляні + червоні/коричневі (дуже важливо для #642226 тощо)
  const earthAndWarmIds = [
    'yellow_ochre',
    'red_ochre',
    'raw_sienna',
    'burnt_sienna',
    'raw_umber',
    'burnt_umber',
    'green_earth',
    'cadmium_red',
    'pyrrole_red',
    'carmine_lake',
    'venetian_red',
    'indian_red',
    'mars_red',
    'quinacridone_red',
    'permanent_red',
  ]
  validPigments
    .filter(
      (p) =>
        earthAndWarmIds.includes(p.id) ||
        p.id.includes('ochre') ||
        p.id.includes('sienna') ||
        p.id.includes('umber') ||
        p.id.includes('red')
    )
    .forEach((p) => candidatesSet.add(p))

  // Для дуже темних цілей — додатково сині
  if (targetLab.L < 35) {
    const blueIds = PURE_BASIC_COLORS[4].sourceIds as readonly string[]
    validPigments
      .filter((p) => blueIds.includes(p.id))
      .forEach((p) => candidatesSet.add(p))
  }

  const candidates = Array.from(candidatesSet).slice(0, 12) // максимум 12
  const n = candidates.length

  let topResults: BestResult[] = []

  const tryAddResult = (indices: number[], vols: number[]) => {
    const selectedPigments = indices.map((idx) => candidates[idx])
    const components = buildComponentsWithBinder(selectedPigments, vols)

    const mixed = mixSpectra(components)
    const rgb = spectrumToRGB(mixed)
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
    const dist = fastDeltaE(targetLab, lab)

    topResults.push({ indices, volumes: [...vols], rgb, deltaE: dist })
    topResults.sort((a, b) => a.deltaE - b.deltaE)
    if (topResults.length > 8) topResults.pop()
  }

  // --- 3. ГРУБИЙ ПЕРЕБІР ---

  // k = 1
  for (let i = 0; i < n; i++) tryAddResult([i], [100])

  // k = 2
  const ratios2 = [
    [98, 2],
    [95, 5],
    [90, 10],
    [85, 15],
    [80, 20],
    [70, 30],
    [60, 40],
    [50, 50],
    [40, 60],
    [30, 70],
  ]
  for (const [i, j] of combinations(n, 2)) {
    for (const [a, b] of ratios2) {
      tryAddResult([i, j], [a, b])
      if (a !== b) tryAddResult([i, j], [b, a])
    }
  }

  // k = 3
  if (maxComponents >= 3) {
    const ratios3 = [
      [90, 8, 2],
      [85, 10, 5],
      [80, 15, 5],
      [75, 15, 10],
      [70, 20, 10],
      [65, 25, 10],
      [60, 30, 10],
      [55, 30, 15],
      [50, 30, 20],
      [45, 35, 20],
      [40, 40, 20],
      [40, 35, 25],
      [34, 33, 33],
      [50, 25, 25],
      [60, 25, 15],
    ]
    for (const combo of combinations(n, 3)) {
      for (const ratio of ratios3) {
        const perms = [
          [ratio[0], ratio[1], ratio[2]],
          [ratio[0], ratio[2], ratio[1]],
          [ratio[1], ratio[0], ratio[2]],
          [ratio[1], ratio[2], ratio[0]],
          [ratio[2], ratio[0], ratio[1]],
          [ratio[2], ratio[1], ratio[0]],
        ]
        const uniquePerms = Array.from(
          new Set(perms.map((p) => JSON.stringify(p)))
        ).map((s) => JSON.parse(s) as number[])
        for (const p of uniquePerms) tryAddResult(combo, p)
      }
    }
  }

  // k = 4 (тільки якщо явно попросили)
  if (maxComponents >= 4 && n >= 4) {
    const ratios4 = [
      [70, 15, 10, 5],
      [60, 20, 15, 5],
      [50, 25, 15, 10],
      [40, 30, 20, 10],
      [40, 25, 20, 15],
      [35, 30, 20, 15],
    ]
    for (const combo of combinations(n, 4)) {
      for (const ratio of ratios4) {
        tryAddResult(combo, ratio)
      }
    }
  }

  if (topResults.length === 0) return null

  // --- 4. ТОЧНА ДОВОДКА ---
  let absoluteBest: BestResult = { ...topResults[0], deltaE: Infinity }

  const adjustments = [0.75, 0.85, 0.92, 0.97, 1.03, 1.08, 1.15, 1.25]

  for (const candidate of topResults) {
    let currentVols = [...candidate.volumes]

    const evaluate = (vols: number[]) => {
      const selectedPigments = candidate.indices.map((idx) => candidates[idx])
      const components = buildComponentsWithBinder(selectedPigments, vols)
      const mixed = mixSpectra(components)
      const rgb = spectrumToRGB(mixed)
      const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
      return { rgb, deltaE: calculateDeltaE2000(targetLab, lab) }
    }

    let currentRes = evaluate(currentVols)

    for (let pass = 0; pass < 4; pass++) {
      let improved = false
      for (let i = 0; i < currentVols.length; i++) {
        for (const adj of adjustments) {
          const trialVols = [...currentVols]
          trialVols[i] = Math.max(0.15, Math.min(100, trialVols[i] * adj))
          const trialRes = evaluate(trialVols)
          if (trialRes.deltaE < currentRes.deltaE - 0.0005) {
            currentRes = trialRes
            currentVols = trialVols
            improved = true
          }
        }
      }
      if (!improved) break
    }

    if (currentRes.deltaE < absoluteBest.deltaE) {
      absoluteBest = {
        indices: candidate.indices,
        volumes: currentVols,
        rgb: currentRes.rgb,
        deltaE: currentRes.deltaE,
      }
    }
  }

  // --- 5. МАСШТАБУВАННЯ ---
  const totalWeight = absoluteBest.volumes.reduce((sum, v) => sum + v, 0)
  if (totalWeight <= 0) return null

  const scaleTarget = targetVolume > 0 ? targetVolume : 20
  const scale = scaleTarget / totalWeight

  const recipe: RecipeItem[] = absoluteBest.indices
    .map((candidateIdx, i) => ({
      pigment: candidates[candidateIdx],
      ml: Math.round(absoluteBest.volumes[i] * scale * 100) / 100,
    }))
    .filter((r) => r.ml > 0.05)
    .sort((a, b) => b.ml - a.ml)

  if (binderPigment && system === 'acrylic') {
    const totalPigmentMl = recipe.reduce((sum, r) => sum + r.ml, 0)
    const binderMl = Math.round(totalPigmentMl * 0.2 * 100) / 100
    if (binderMl > 0) {
      recipe.push({
        pigment: binderPigment,
        ml: binderMl,
        isBinder: true,
      })
    }
  }

  return {
    recipe,
    resultRgb: absoluteBest.rgb,
    resultHex: rgbToHex(absoluteBest.rgb),
    deltaE: Math.round(absoluteBest.deltaE * 10) / 10,
    system,
  }
}

// ==========================================
// Симуляція шарів
// ==========================================
export function simulateLayersKM(
  baseSpectrum: SpectrumPoint[],
  paintSpectrum: SpectrumPoint[],
  system: CoverageSystem
) {
  let strength = system === 'aniline' ? 24 : 48

  const baseRgb = spectrumToRGB(baseSpectrum)
  const paintRgb = spectrumToRGB(paintSpectrum)

  const baseL =
    (0.2126 * baseRgb.r + 0.7152 * baseRgb.g + 0.0722 * baseRgb.b) / 255
  const paintL =
    (0.2126 * paintRgb.r + 0.7152 * paintRgb.g + 0.0722 * paintRgb.b) / 255
  const deltaL = Math.abs(paintL - baseL)

  if (deltaL > 0.45) strength *= 0.72
  else if (deltaL > 0.3) strength *= 0.85
  else if (deltaL < 0.12) strength *= 1.18

  strength = Math.max(16, Math.min(58, strength))

  const mixLayer = (
    current: SpectrumPoint[],
    paint: SpectrumPoint[],
    s: number
  ) => {
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
