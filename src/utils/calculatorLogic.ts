import { Pigment } from '../data/pigments'
import { Lang } from '../App'
import { mixSpectra, spectrumToRGB, rgbToHex, SpectrumPoint, MixComponent } from './colorScience'

export type CoverageSystem = 'aniline' | 'acrylic'

export const PURE_BASIC_COLORS = [
  { id: 'pure_white', name: { uk: 'Білий', ru: 'Белый', en: 'White' }, sourceIds: ['pw_6_anatase', 'titanium_white', 'zinc_white', 'lithopone', 'pw_7_zinc_sulfide', 'pw_11_antimony_white', 'pw_21_barium_sulfate'] },
  { id: 'pure_black', name: { uk: 'Чорний', ru: 'Чёрный', en: 'Black' }, sourceIds: ['pbk_1_aniline_black', 'ivory_black', 'lamp_black', 'bone_black'] },
  { id: 'pure_red', name: { uk: 'Червоний', ru: 'Красный', en: 'Red' }, sourceIds: ['cadmium_red', 'pyrrole_red', 'carmine_lake', 'pr_254_pyrrole_red', 'pr_122_quinacridone_magenta', 'pr_255_pyrrole_scarlet'] },
  { id: 'pure_yellow', name: { uk: 'Жовтий', ru: 'Жёлтый', en: 'Yellow' }, sourceIds: ['cadmium_yellow', 'yellow_ochre', 'hansa_yellow', 'py_154_benzimidazolone_yellow_h3g', 'py_83_diarylide_yellow_hr', 'py_150_nickel_azo_yellow'] },
  { id: 'pure_blue', name: { uk: 'Синій', ru: 'Синий', en: 'Blue' }, sourceIds: ['ultramarine', 'phthalo_blue', 'prussian_blue', 'pb_66_synthetic_indigo'] },
  { id: 'pure_green', name: { uk: 'Зелений', ru: 'Зелёный', en: 'Green' }, sourceIds: ['phthalo_green', 'green_earth', 'viridian', 'pg_36_phthalo_green_ys'] },
] as const

export function getPureBasicPigments(pigments: Pigment[]): Pigment[] {
  return PURE_BASIC_COLORS.map((basic) => {
    const source = pigments.find((p) => (basic.sourceIds as readonly string[]).some((id) => id === p.id))
    return source ? source : null
  }).filter(Boolean) as Pigment[]
}

export const getPigmentCategory = (id: string, lang: Lang) => {
  const isUk = lang === 'uk'
  if (id.includes('cadmium')) return isUk ? 'Кадмієва група' : 'Кадмиевая группа'
  if (id.includes('cobalt')) return isUk ? 'Кобальтова група' : 'Кобальтовая группа'
  if (id.includes('white') || id.startsWith('pw_') || ['lithopone', 'chalk', 'gypsum'].includes(id)) return isUk ? 'Білила / Наповнювачі' : 'Белила / Наполнители'
  if (id.includes('ochre') || id.includes('sienna') || id.includes('umber') || id === 'green_earth' || id.startsWith('pbr_')) return isUk ? 'Земляні пігменти' : 'Земляные пигменты'
  if (id.includes('black') || id.startsWith('pbk_') || id === 'bitumen') return isUk ? 'Чорні / Вуглецеві' : 'Черные / Углеродные'
  if (id.includes('phthalo') || id.startsWith('pg_36') || id.startsWith('pb_15')) return isUk ? 'Фталоціаніни (синтетика)' : 'Фталоцианины (синтетика)'
  if (['ultramarine', 'ultramarine_nat', 'prussian_blue', 'azurite'].includes(id)) return isUk ? 'Традиційні сині' : 'Традиционные синие'
  return isUk ? 'Органічний / Інший' : 'Органический / Прочий'
}

function rgbToLab(r: number, g: number, b: number) {
  let r_ = r / 255, g_ = g / 255, b_ = b / 255
  r_ = r_ > 0.04045 ? Math.pow((r_ + 0.055) / 1.055, 2.4) : r_ / 12.92
  g_ = g_ > 0.04045 ? Math.pow((g_ + 0.055) / 1.055, 2.4) : g_ / 12.92
  b_ = b_ > 0.04045 ? Math.pow((b_ + 0.055) / 1.055, 2.4) : b_ / 12.92

  let x = (r_ * 0.4124 + g_ * 0.3576 + b_ * 0.1805) * 100
  let y = (r_ * 0.2126 + g_ * 0.7152 + b_ * 0.0722) * 100
  let z = (r_ * 0.0193 + g_ * 0.1192 + b_ * 0.9505) * 100

  x /= 95.047; y /= 100.0; z /= 108.883
  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) }
}

function calculateDeltaE2000(lab1: { L: number; a: number; b: number }, lab2: { L: number; a: number; b: number }): number {
  const { L: L1, a: a1, b: b1 } = lab1
  const { L: L2, a: a2, b: b2 } = lab2
  const C1 = Math.sqrt(a1 * a1 + b1 * b1), C2 = Math.sqrt(a2 * a2 + b2 * b2)
  const Cbar = (C1 + C2) / 2
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))))

  const a1Prime = a1 * (1 + G), a2Prime = a2 * (1 + G)
  const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1), C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2)
  const CbarPrime = (C1Prime + C2Prime) / 2

  let h1Prime = b1 === 0 && a1Prime === 0 ? 0 : ((Math.atan2(b1, a1Prime) * 180) / Math.PI + 360) % 360
  let h2Prime = b2 === 0 && a2Prime === 0 ? 0 : ((Math.atan2(b2, a2Prime) * 180) / Math.PI + 360) % 360

  let HbarPrime = h1Prime + h2Prime
  if (C1Prime * C2Prime !== 0) {
    if (Math.abs(h1Prime - h2Prime) > 180) HbarPrime = HbarPrime < 360 ? HbarPrime + 360 : HbarPrime - 360
    HbarPrime /= 2
  }

  const T = 1 - 0.17 * Math.cos(((HbarPrime - 30) * Math.PI) / 180) + 0.24 * Math.cos((2 * HbarPrime * Math.PI) / 180) + 0.32 * Math.cos(((3 * HbarPrime + 6) * Math.PI) / 180) - 0.2 * Math.cos(((4 * HbarPrime - 63) * Math.PI) / 180)

  let deltahPrime = 0
  if (C1Prime * C2Prime !== 0) {
    if (Math.abs(h2Prime - h1Prime) <= 180) deltahPrime = h2Prime - h1Prime
    else if (h2Prime - h1Prime > 180) deltahPrime = h2Prime - h1Prime - 360
    else deltahPrime = h2Prime - h1Prime + 360
  }

  const deltaLPrime = L2 - L1, deltaCPrime = C2Prime - C1Prime, deltaHPrime = 2 * Math.sqrt(C1Prime * C2Prime) * Math.sin((deltahPrime * Math.PI) / 360)

  const LbarPrime = (L1 + L2) / 2
  const S_L = 1 + (0.015 * Math.pow(LbarPrime - 50, 2)) / Math.sqrt(20 + Math.pow(LbarPrime - 50, 2))
  const S_C = 1 + 0.045 * CbarPrime
  const S_H = 1 + 0.015 * CbarPrime * T

  const deltaTheta = 30 * Math.exp(-Math.pow((HbarPrime - 275) / 25, 2))
  const R_C = 2 * Math.sqrt(Math.pow(CbarPrime, 7) / (Math.pow(CbarPrime, 7) + Math.pow(25, 7)))
  const R_T = -Math.sin((2 * deltaTheta * Math.PI) / 180) * R_C

  return Math.sqrt(Math.pow(deltaLPrime / S_L, 2) + Math.pow(deltaCPrime / S_C, 2) + Math.pow(deltaHPrime / S_H, 2) + R_T * (deltaCPrime / S_C) * (deltaHPrime / S_H))
}

export function hexToRgbObj(hex: string) {
  let c = hex.replace(/^#/, '')
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]
  return { r: parseInt(c.substring(0, 2), 16) || 0, g: parseInt(c.substring(2, 4), 16) || 0, b: parseInt(c.substring(4, 6), 16) || 0 }
}

function combinations(n: number, k: number): number[][] {
  const result: number[][] = []
  if (k > n || k <= 0) return result
  const combo = new Array<number>(k)
  for (let i = 0; i < k; i++) combo[i] = i
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

export interface RecipeItem { pigment: Pigment; ml: number; isBinder?: boolean }
export interface RecipeResult { recipe: RecipeItem[]; resultRgb: { r: number; g: number; b: number }; resultHex: string; deltaE: number; system: CoverageSystem; approximate?: boolean }
interface BestResult { indices: number[]; volumes: number[]; rgb: { r: number; g: number; b: number }; deltaE: number }

// Умные стартовые точки, включающие сильные отклонения (для пастельных тонов с белилами)
const RATIOS_2 = [ [50, 50], [80, 20], [90, 10], [95, 5], [98, 2], [99, 1], [1, 99], [2, 98], [5, 95], [10, 90], [20, 80] ]
const RATIOS_3 = [
  [34, 33, 33], [60, 20, 20], [80, 10, 10], [90, 5, 5], [95, 3, 2], [98, 1, 1],
  [20, 60, 20], [10, 80, 10], [5, 90, 5], [2, 95, 3], [1, 98, 1],
  [20, 20, 60], [10, 10, 80], [5, 5, 90], [2, 3, 95], [1, 1, 98]
]
const RATIOS_4 = [
  [25, 25, 25, 25], [40, 20, 20, 20], [70, 10, 10, 10], [85, 5, 5, 5], [94, 2, 2, 2], [97, 1, 1, 1],
  [20, 40, 20, 20], [10, 70, 10, 10], [5, 85, 5, 5], [2, 94, 2, 2], [1, 97, 1, 1],
  [20, 20, 40, 20], [10, 10, 70, 10], [5, 5, 85, 5], [2, 2, 94, 2], [1, 1, 97, 1],
  [20, 20, 20, 40], [10, 10, 10, 70], [5, 5, 5, 85], [2, 2, 2, 94], [1, 1, 1, 97]
]

export function findRecipeByHex(targetHex: string, pigments: Pigment[], maxComponents = 3, targetVolume = 20, system: CoverageSystem = 'acrylic', excludeIds: string[] = []): RecipeResult | null {
  if (!pigments.length || !targetHex) return null

  const binderPigment = system === 'acrylic' ? pigments.find((p) => p.id === 'acrylic_binder' || (p as { isBinder?: boolean }).isBinder === true) : undefined
  const validPigments = pigments.filter((p) => p.id !== 'acrylic_binder' && !(p as { isBinder?: boolean }).isBinder && p.spectrum && p.spectrum.length > 0 && !excludeIds.includes(p.id))
  if (validPigments.length === 0) return null

  const targetRgb = hexToRgbObj(targetHex)
  const targetLab = rgbToLab(targetRgb.r, targetRgb.g, targetRgb.b)

  const buildComponents = (selected: Pigment[], vols: number[]): MixComponent[] => {
    const components: MixComponent[] = new Array(selected.length)
    for (let i = 0; i < selected.length; i++) components[i] = { spectrum: selected[i].spectrum!, volume: vols[i] }
    return components
  }

  const isAchromatic = (id: string) => {
    const lower = id.toLowerCase()
    return lower.includes('white') || lower.startsWith('pw_') || lower.includes('black') || lower.startsWith('pbk_')
  }

  // 1. ЖЕСТКАЯ ФИКСАЦИЯ БЕЛИЛ И ЧЕРНОГО В КАНДИДАТАХ
  const candidatesSet = new Set<Pigment>()
  
  // Добавляем ахроматы в первую очередь, если они есть в инвентаре пользователя
  validPigments.forEach(p => {
    if (isAchromatic(p.id)) candidatesSet.add(p)
  })

  // Оцениваем оставшиеся цвета по дистанции
  const scored: { pigment: Pigment; dist: number }[] = []
  for (let i = 0; i < validPigments.length; i++) {
    const p = validPigments[i]
    if (candidatesSet.has(p)) continue // Уже добавили
    
    const rgb = spectrumToRGB(mixSpectra(buildComponents([p], [100])))
    scored.push({ pigment: p, dist: calculateDeltaE2000(targetLab, rgbToLab(rgb.r, rgb.g, rgb.b)) })
  }

  scored.sort((a, b) => a.dist - b.dist)

  // Добиваем пул до 16 кандидатов ближайшими цветами
  for (let i = 0; i < scored.length; i++) {
    if (candidatesSet.size >= 16) break
    candidatesSet.add(scored[i].pigment)
  }

  const candidates = Array.from(candidatesSet)
  const n = candidates.length
  if (n === 0) return null

  let topResults: BestResult[] = []

  const tryAddResult = (indices: number[], vols: number[]) => {
    const selected: Pigment[] = new Array(indices.length)
    for (let i = 0; i < indices.length; i++) selected[i] = candidates[indices[i]]
    const mixed = mixSpectra(buildComponents(selected, vols))
    const rgb = spectrumToRGB(mixed)
    const dist = calculateDeltaE2000(targetLab, rgbToLab(rgb.r, rgb.g, rgb.b))
    topResults.push({ indices: indices.slice(), volumes: vols.slice(), rgb, deltaE: dist })
    topResults.sort((a, b) => a.deltaE - b.deltaE)
    if (topResults.length > 25) topResults.length = 25
  }

  for (let i = 0; i < n; i++) tryAddResult([i], [100])

  const combos2 = combinations(n, 2)
  for (let c = 0; c < combos2.length; c++) {
    for (let r = 0; r < RATIOS_2.length; r++) tryAddResult(combos2[c], RATIOS_2[r])
  }

  if (maxComponents >= 3 && n >= 3) {
    const combos3 = combinations(n, 3)
    for (let c = 0; c < combos3.length; c++) {
      for (let r = 0; r < RATIOS_3.length; r++) tryAddResult(combos3[c], RATIOS_3[r])
    }
  }

  if (maxComponents >= 4 && n >= 4) {
    const combos4 = combinations(n, 4)
    for (let c = 0; c < combos4.length; c++) {
      for (let r = 0; r < RATIOS_4.length; r++) tryAddResult(combos4[c], RATIOS_4[r])
    }
  }

  if (topResults.length === 0) return null

  let absoluteBest: BestResult = { ...topResults[0], volumes: topResults[0].volumes.slice() }
  const coarseAdjustments = [0.2, 0.5, 0.8, 1.25, 2.0, 5.0] // 5.0 позволяет белилам стремительно увеличиться
  const fineAdjustments = [0.9, 0.95, 1.05, 1.1]

  for (let t = 0; t < topResults.length; t++) {
    const candidate = topResults[t]
    let currentVols = candidate.volumes.slice()

    const evaluate = (vols: number[]) => {
      const selected: Pigment[] = new Array(candidate.indices.length)
      for (let i = 0; i < candidate.indices.length; i++) selected[i] = candidates[candidate.indices[i]]
      const rgb = spectrumToRGB(mixSpectra(buildComponents(selected, vols)))
      return { rgb, deltaE: calculateDeltaE2000(targetLab, rgbToLab(rgb.r, rgb.g, rgb.b)) }
    }

    let currentRes = evaluate(currentVols)

    for (let pass = 0; pass < 5; pass++) {
      let improved = false
      for (let i = 0; i < currentVols.length; i++) {
        for (let a = 0; a < coarseAdjustments.length; a++) {
          const trialVols = currentVols.slice()
          trialVols[i] = Math.max(0.001, Math.min(100, trialVols[i] * coarseAdjustments[a]))
          const trialRes = evaluate(trialVols)
          if (trialRes.deltaE < currentRes.deltaE - 0.0001) { currentRes = trialRes; currentVols = trialVols; improved = true }
        }
      }
      if (!improved) break
    }

    for (let pass = 0; pass < 6; pass++) {
      let improved = false
      for (let i = 0; i < currentVols.length; i++) {
        for (let a = 0; a < fineAdjustments.length; a++) {
          const trialVols = currentVols.slice()
          trialVols[i] = Math.max(0.001, Math.min(100, trialVols[i] * fineAdjustments[a]))
          const trialRes = evaluate(trialVols)
          if (trialRes.deltaE < currentRes.deltaE - 0.0001) { currentRes = trialRes; currentVols = trialVols; improved = true }
        }
      }
      if (!improved) break
    }

    if (currentRes.deltaE < absoluteBest.deltaE) {
      absoluteBest = { indices: candidate.indices, volumes: currentVols, rgb: currentRes.rgb, deltaE: currentRes.deltaE }
    }
  }

  const totalWeight = absoluteBest.volumes.reduce((sum, v) => sum + v, 0)
  const scale = (targetVolume > 0 ? targetVolume : 20) / totalWeight

  const recipe: RecipeItem[] = []
  for (let i = 0; i < absoluteBest.indices.length; i++) {
    const ml = Math.round(absoluteBest.volumes[i] * scale * 100) / 100
    if (ml > 0.05) recipe.push({ pigment: candidates[absoluteBest.indices[i]], ml })
  }
  recipe.sort((a, b) => b.ml - a.ml)

  if (binderPigment && system === 'acrylic') {
    const binderMl = Math.round(recipe.reduce((sum, item) => sum + item.ml, 0) * 0.2 * 100) / 100
    if (binderMl > 0) recipe.push({ pigment: binderPigment, ml: binderMl, isBinder: true })
  }

  return {
    recipe,
    resultRgb: absoluteBest.rgb,
    resultHex: rgbToHex(absoluteBest.rgb),
    deltaE: Math.round(absoluteBest.deltaE * 10) / 10,
    system,
    approximate: absoluteBest.deltaE > 2.0,
  }
}

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

  const mixLayer = (current: SpectrumPoint[], paint: SpectrumPoint[], s: number) =>
    mixSpectra([{ spectrum: current, volume: 100 - s }, { spectrum: paint, volume: s }])

  const layer1 = mixLayer(baseSpectrum, paintSpectrum, strength)
  const layer2 = mixLayer(layer1, paintSpectrum, strength * 0.94)
  const layer3 = mixLayer(layer2, paintSpectrum, strength * 0.91)

  return { layer1, layer2, layer3, final: paintSpectrum, strength: Math.round(strength), deltaL }
}
