/**
 * calculatorLogic.ts
 * Подбор рецепта пигментов (Two-Constant KM + Saunderson + CIEDE2000)
 * Оптимизировано под мобильный WebView: лимиты комбинаций, меньше GC.
 */
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

// ─── Color space ───────────────────────────────────────────────

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

function calculateDeltaE2000(
  lab1: { L: number; a: number; b: number },
  lab2: { L: number; a: number; b: number }
): number {
  const { L: L1, a: a1, b: b1 } = lab1
  const { L: L2, a: a2, b: b2 } = lab2

  const kL = 1
  const kC = 1
  const kH = 1

  const C1 = Math.sqrt(a1 * a1 + b1 * b1)
  const C2 = Math.sqrt(a2 * a2 + b2 * b2)
  const Cbar = (C1 + C2) / 2

  const G =
    0.5 *
    (1 -
      Math.sqrt(
        Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))
      ))

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
    2 *
    Math.sqrt(C1Prime * C2Prime) *
    Math.sin((deltahPrime * Math.PI) / 360)

  const LbarPrime = (L1 + L2) / 2
  const S_L =
    1 +
    (0.015 * Math.pow(LbarPrime - 50, 2)) /
      Math.sqrt(20 + Math.pow(LbarPrime - 50, 2))
  const S_C = 1 + 0.045 * CbarPrime
  const S_H = 1 + 0.015 * CbarPrime * T

  const deltaTheta = 30 * Math.exp(-Math.pow((HbarPrime - 275) / 25, 2))
  const R_C =
    2 *
    Math.sqrt(
      Math.pow(CbarPrime, 7) / (Math.pow(CbarPrime, 7) + Math.pow(25, 7))
    )
  const R_T = -Math.sin((2 * deltaTheta * Math.PI) / 180) * R_C

  return Math.sqrt(
    Math.pow(deltaLPrime / (kL * S_L), 2) +
      Math.pow(deltaCPrime / (kC * S_C), 2) +
      Math.pow(deltaHPrime / (kH * S_H), 2) +
      R_T * (deltaCPrime / (kC * S_C)) * (deltaHPrime / (kH * S_H))
  )
}

/** Быстрая метрика (квадрат ΔE76) — только для грубого отбора */
function fastDeltaE(
  lab1: { L: number; a: number; b: number },
  lab2: { L: number; a: number; b: number }
): number {
  const dL = lab1.L - lab2.L
  const da = lab1.a - lab2.a
  const db = lab1.b - lab2.b
  return dL * dL + da * da + db * db
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

// ─── Combinations (без рекурсии в hot path — генерим по запросу) ─

function combinations(n: number, k: number): number[][] {
  const result: number[][] = []
  if (k > n || k <= 0) return result
  const combo = new Array<number>(k)
  for (let i = 0; i < k; i++) combo[i] = i

  // eslint-disable-next-line no-constant-condition
  while (true) {
    result.push(combo.slice())
    let i = k - 1
    while (i >= 0 && combo[i] === n - k + i) i--
    if (i < 0) break
    combo[i]++
    for (let j = i + 1; j < k; j++) combo[j] = combo[j - 1] + 1
  }
  return result
}

// ─── Recipe types ──────────────────────────────────────────────

export interface RecipeItem {
  pigment: Pigment
  ml: number
  isBinder?: boolean
}

export interface RecipeResult {
  recipe: RecipeItem[]
  resultRgb: { r: number; g: number; b: number }
  resultHex: string
  deltaE: number
  system: CoverageSystem
  /** true если ΔE₀₀ > 2.0 — неточное совпадение */
  approximate?: boolean
}

interface BestResult {
  indices: number[]
  volumes: number[]
  rgb: { r: number; g: number; b: number }
  deltaE: number
}

// Жёсткие лимиты под мобильный CPU/RAM
const MAX_CANDIDATES = 12
const MAX_TOP = 8
const MAX_EVALS_K3 = 1800
const MAX_EVALS_K4 = 900

// ─── Core search ───────────────────────────────────────────────

export function findRecipeByHex(
  targetHex: string,
  pigments: Pigment[],
  maxComponents = 3,
  targetVolume = 20,
  system: CoverageSystem = 'acrylic',
  excludeIds: string[] = []
): RecipeResult | null {
  if (!pigments.length || !targetHex) return null

  // Binder: ищем в переданном списке (для acrylic лучше передавать полный inventory)
  const binderPigment =
    system === 'acrylic'
      ? pigments.find(
          (p) => p.id === 'acrylic_binder' || (p as { isBinder?: boolean }).isBinder === true
        )
      : undefined

  const validPigments = pigments.filter(
    (p) =>
      p.id !== 'acrylic_binder' &&
      !(p as { isBinder?: boolean }).isBinder &&
      p.spectrum &&
      p.spectrum.length > 0 &&
      !excludeIds.includes(p.id)
  )
  if (validPigments.length === 0) return null

  const targetRgb = hexToRgbObj(targetHex)
  const targetLab = rgbToLab(targetRgb.r, targetRgb.g, targetRgb.b)
  const isDarkTarget = targetLab.L < 45

  const buildComponents = (
    selected: Pigment[],
    vols: number[]
  ): MixComponent[] => {
    const components: MixComponent[] = new Array(selected.length)
    for (let i = 0; i < selected.length; i++) {
      components[i] = {
        spectrum: selected[i].spectrum!,
        volume: vols[i],
      }
    }
    if (binderPigment?.spectrum) {
      let total = 0
      for (let i = 0; i < vols.length; i++) total += vols[i]
      components.push({
        spectrum: binderPigment.spectrum,
        volume: total * 0.2,
        isBinder: true,
      })
    }
    return components
  }

  // 1) Score singles → candidates
  const scored: { pigment: Pigment; dist: number }[] = new Array(
    validPigments.length
  )
  for (let i = 0; i < validPigments.length; i++) {
    const p = validPigments[i]
    const rgb = spectrumToRGB(mixSpectra(buildComponents([p], [100])))
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
    scored[i] = { pigment: p, dist: calculateDeltaE2000(targetLab, lab) }
  }
  scored.sort((a, b) => a.dist - b.dist)

  const candidatesSet = new Set<Pigment>()
  for (let i = 0; i < Math.min(6, scored.length); i++) {
    candidatesSet.add(scored[i].pigment)
  }

  const allBasicIds = PURE_BASIC_COLORS.flatMap(
    (b) => b.sourceIds as readonly string[]
  )
  for (let i = 0; i < validPigments.length; i++) {
    const p = validPigments[i]
    if (allBasicIds.includes(p.id)) candidatesSet.add(p)
  }

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
  ]
  for (let i = 0; i < validPigments.length; i++) {
    const p = validPigments[i]
    if (
      earthAndWarmIds.includes(p.id) ||
      p.id.includes('ochre') ||
      p.id.includes('sienna') ||
      p.id.includes('umber') ||
      p.id.includes('red')
    ) {
      candidatesSet.add(p)
    }
  }

  if (isDarkTarget) {
    for (let i = 0; i < validPigments.length; i++) {
      const p = validPigments[i]
      if (
        p.id.includes('black') ||
        p.id.includes('umber') ||
        p.id.includes('burnt') ||
        p.id === 'bitumen'
      ) {
        candidatesSet.add(p)
      }
    }
  }

  if (targetLab.L < 35) {
    const blueIds = PURE_BASIC_COLORS[4].sourceIds as readonly string[]
    for (let i = 0; i < validPigments.length; i++) {
      if (blueIds.includes(validPigments[i].id)) {
        candidatesSet.add(validPigments[i])
      }
    }
  }

  const candidates = Array.from(candidatesSet).slice(0, MAX_CANDIDATES)
  const n = candidates.length
  if (n === 0) return null

  const darkIndices: number[] = []
  for (let idx = 0; idx < n; idx++) {
    const id = candidates[idx].id
    if (
      id.includes('black') ||
      id.includes('umber') ||
      id.includes('burnt') ||
      id === 'bitumen'
    ) {
      darkIndices.push(idx)
    }
  }

  let topResults: BestResult[] = []
  let evalCount = 0

  const tryAddResult = (indices: number[], vols: number[]) => {
    evalCount++
    const selected: Pigment[] = new Array(indices.length)
    for (let i = 0; i < indices.length; i++) {
      selected[i] = candidates[indices[i]]
    }
    const mixed = mixSpectra(buildComponents(selected, vols))
    const rgb = spectrumToRGB(mixed)
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
    const dist = fastDeltaE(targetLab, lab)

    topResults.push({
      indices: indices.slice(),
      volumes: vols.slice(),
      rgb,
      deltaE: dist,
    })
    topResults.sort((a, b) => a.deltaE - b.deltaE)
    if (topResults.length > MAX_TOP) topResults.length = MAX_TOP
  }

  // k = 1
  for (let i = 0; i < n; i++) tryAddResult([i], [100])

  // k = 2
  const ratios2: number[][] = [
    [98, 2],
    [96, 4],
    [95, 5],
    [92, 8],
    [90, 10],
    [85, 15],
    [80, 20],
    [70, 30],
    [60, 40],
    [50, 50],
  ]
  const combos2 = combinations(n, 2)
  for (let c = 0; c < combos2.length; c++) {
    const [i, j] = combos2[c]
    for (let r = 0; r < ratios2.length; r++) {
      const a = ratios2[r][0]
      const b = ratios2[r][1]
      tryAddResult([i, j], [a, b])
      if (a !== b) tryAddResult([i, j], [b, a])
    }
  }

  if (isDarkTarget && darkIndices.length > 0) {
    for (let i = 0; i < n; i++) {
      if (darkIndices.indexOf(i) >= 0) continue
      for (let d = 0; d < darkIndices.length; d++) {
        const dIdx = darkIndices[d]
        tryAddResult([i, dIdx], [97, 3])
        tryAddResult([i, dIdx], [95, 5])
        tryAddResult([i, dIdx], [90, 10])
        tryAddResult([i, dIdx], [85, 15])
      }
    }
  }

  // k = 3
  if (maxComponents >= 3 && n >= 3) {
    const ratios3: number[][] = [
      [90, 8, 2],
      [85, 10, 5],
      [80, 15, 5],
      [75, 15, 10],
      [70, 20, 10],
      [60, 30, 10],
      [50, 30, 20],
      [40, 40, 20],
      [34, 33, 33],
      [50, 25, 25],
    ]
    const combos3 = combinations(n, 3)
    let k3Evals = 0
    outer3: for (let c = 0; c < combos3.length; c++) {
      const combo = combos3[c]
      for (let r = 0; r < ratios3.length; r++) {
        const ratio = ratios3[r]
        // 3 уникальных перестановки без JSON
        tryAddResult(combo, [ratio[0], ratio[1], ratio[2]])
        tryAddResult(combo, [ratio[0], ratio[2], ratio[1]])
        tryAddResult(combo, [ratio[1], ratio[0], ratio[2]])
        k3Evals += 3
        if (k3Evals >= MAX_EVALS_K3) break outer3
      }
    }

    if (isDarkTarget && darkIndices.length > 0 && k3Evals < MAX_EVALS_K3) {
      for (let c = 0; c < combos3.length && k3Evals < MAX_EVALS_K3; c++) {
        const combo = combos3[c]
        let hasDark = false
        for (let t = 0; t < 3; t++) {
          if (darkIndices.indexOf(combo[t]) >= 0) {
            hasDark = true
            break
          }
        }
        if (!hasDark) continue
        tryAddResult(combo, [90, 7, 3])
        tryAddResult(combo, [85, 10, 5])
        tryAddResult(combo, [80, 15, 5])
        k3Evals += 3
      }
    }
  }

  // k = 4
  if (maxComponents >= 4 && n >= 4) {
    const ratios4: number[][] = [
      [70, 15, 10, 5],
      [60, 20, 15, 5],
      [50, 25, 15, 10],
      [45, 25, 20, 10],
      [40, 30, 20, 10],
      [35, 30, 20, 15],
    ]
    const combos4 = combinations(n, 4)
    let k4Evals = 0
    outer4: for (let c = 0; c < combos4.length; c++) {
      const combo = combos4[c]
      for (let r = 0; r < ratios4.length; r++) {
        tryAddResult(combo, ratios4[r])
        k4Evals++
        if (k4Evals >= MAX_EVALS_K4) break outer4
      }
    }
  }

  if (topResults.length === 0) return null

  // ── Точная доводка (CIEDE2000) ──
  let absoluteBest: BestResult = {
    indices: topResults[0].indices,
    volumes: topResults[0].volumes.slice(),
    rgb: topResults[0].rgb,
    deltaE: Infinity,
  }

  const adjustments = isDarkTarget
    ? [0.7, 0.85, 0.94, 0.97, 1.03, 1.08, 1.2, 1.3]
    : [0.8, 0.9, 0.95, 0.97, 1.03, 1.08, 1.15, 1.25]

  for (let t = 0; t < topResults.length; t++) {
    const candidate = topResults[t]
    let currentVols = candidate.volumes.slice()

    const evaluate = (vols: number[]) => {
      const selected: Pigment[] = new Array(candidate.indices.length)
      for (let i = 0; i < candidate.indices.length; i++) {
        selected[i] = candidates[candidate.indices[i]]
      }
      const mixed = mixSpectra(buildComponents(selected, vols))
      const rgb = spectrumToRGB(mixed)
      const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
      return { rgb, deltaE: calculateDeltaE2000(targetLab, lab) }
    }

    let currentRes = evaluate(currentVols)
    const passes = isDarkTarget ? 4 : 3

    for (let pass = 0; pass < passes; pass++) {
      let improved = false
      for (let i = 0; i < currentVols.length; i++) {
        for (let a = 0; a < adjustments.length; a++) {
          const trialVols = currentVols.slice()
          trialVols[i] = Math.max(0.1, Math.min(100, trialVols[i] * adjustments[a]))
          const trialRes = evaluate(trialVols)
          if (trialRes.deltaE < currentRes.deltaE - 0.0003) {
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

  const totalWeight = absoluteBest.volumes.reduce((sum, v) => sum + v, 0)
  if (totalWeight <= 0) return null

  const scaleTarget = targetVolume > 0 ? targetVolume : 20
  const scale = scaleTarget / totalWeight

  const recipe: RecipeItem[] = []
  for (let i = 0; i < absoluteBest.indices.length; i++) {
    const ml = Math.round(absoluteBest.volumes[i] * scale * 100) / 100
    if (ml > 0.05) {
      recipe.push({
        pigment: candidates[absoluteBest.indices[i]],
        ml,
      })
    }
  }
  recipe.sort((a, b) => b.ml - a.ml)

  if (binderPigment && system === 'acrylic') {
    let totalPigmentMl = 0
    for (let i = 0; i < recipe.length; i++) totalPigmentMl += recipe[i].ml
    const binderMl = Math.round(totalPigmentMl * 0.2 * 100) / 100
    if (binderMl > 0) {
      recipe.push({
        pigment: binderPigment,
        ml: binderMl,
        isBinder: true,
      })
    }
  }

  const deltaE = Math.round(absoluteBest.deltaE * 10) / 10

  return {
    recipe,
    resultRgb: absoluteBest.rgb,
    resultHex: rgbToHex(absoluteBest.rgb),
    deltaE,
    system,
    approximate: deltaE > 2.0,
  }
}

// ─── Layer simulation (без изменений по смыслу) ────────────────

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
  ) =>
    mixSpectra([
      { spectrum: current, volume: 100 - s },
      { spectrum: paint, volume: s },
    ])

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
