import { Pigment } from '../data/pigments'
import { Lang } from '../App'

export type CoverageSystem = 'aniline' | 'acrylic'

export const PURE_BASIC_COLORS = [
  { id: 'pure_white', name: { uk: 'Білий', ru: 'Белый', en: 'White' }, sourceIds: ['pw_6_anatase', 'titanium_white', 'zinc_white', 'lithopone', 'pw_7_zinc_sulfide', 'pw_11_antimony_white', 'pw_21_barium_sulfate'] },
  { id: 'pure_black', name: { uk: 'Чорний', ru: 'Чёрный', en: 'Black' }, sourceIds: ['pbk_1_aniline_black', 'ivory_black', 'lamp_black', 'bone_black'] },
  { id: 'pure_red', name: { uk: 'Червоний', ru: 'Красный', en: 'Red' }, sourceIds: ['cadmium_red', 'pyrrole_red', 'carmine_lake', 'pr_254_pyrrole_red', 'pr_122_quinacridone_magenta', 'pr_255_pyrrole_scarlet'] },
  { id: 'pure_yellow', name: { uk: 'Жовтий', ru: 'Жёлтый', en: 'Yellow' }, sourceIds: ['cadmium_yellow', 'yellow_ochre', 'hansa_yellow', 'py_154_benzimidazolone_yellow_h3g', 'py_83_diarylide_yellow_hr', 'py_150_nickel_azo_yellow'] },
  { id: 'pure_blue', name: { uk: 'Синій', ru: 'Синий', en: 'Blue' }, sourceIds: ['ultramarine', 'phthalo_blue', 'prussian_blue', 'pb_66_synthetic_indigo'] },
  { id: 'pure_green', name: { uk: 'Зелений', ru: 'Зелёный', en: 'Green' }, sourceIds: ['phthalo_green', 'green_earth', 'viridian', 'pg_36_phthalo_green_ys'] },
] as const

export function getPigmentCategory(id: string, lang: Lang) {
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
  const { L: L1, a: a1, b: b1 } = lab1, { L: L2, a: a2, b: b2 } = lab2
  const C1 = Math.sqrt(a1 * a1 + b1 * b1), C2 = Math.sqrt(a2 * a2 + b2 * b2), Cbar = (C1 + C2) / 2
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
  const S_C = 1 + 0.045 * CbarPrime, S_H = 1 + 0.015 * CbarPrime * T
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

function getDominantShifts(baseRatios: number[][]): number[][] {
  const unique = new Map<string, number[]>()
  baseRatios.forEach(r => {
    for (let i = 0; i < r.length; i++) {
      const copy = [...r]; const dom = copy.shift()!
      copy.splice(i, 0, dom)
      unique.set(copy.join(','), copy)
    }
  })
  return Array.from(unique.values())
}

const RATIOS_2 = getDominantShifts([[50, 50], [80, 20], [90, 10], [95, 5], [98, 2], [99, 1]])
const RATIOS_3 = getDominantShifts([[34, 33, 33], [60, 20, 20], [80, 10, 10], [90, 5, 5], [95, 3, 2], [98, 1, 1], [99, 0.5, 0.5]])
const RATIOS_4 = getDominantShifts([[25, 25, 25, 25], [40, 20, 20, 20], [60, 20, 10, 10], [80, 10, 5, 5], [90, 5, 3, 2], [95, 3, 1, 1], [98, 1, 0.5, 0.5], [99, 0.5, 0.3, 0.2]])

// --- ОБНОВЛЕННЫЙ И МОЩНЫЙ АЛГОРИТМ ПОИСКА ---
function optimizeCombo(indices: number[], candidates: Pigment[], targetLab: { L: number; a: number; b: number }) {
  const n = indices.length;
  let minDE = Infinity;
  let bestVols = Array(n).fill(100 / n);
  
  const spectra = indices.map(idx => candidates[idx].spectrum!);

  const evalVols = (v: number[]) => {
    let totalVol = 0;
    for (let i = 0; i < n; i++) totalVol += v[i];
    const invTotal = 1 / totalVol;

    const result: SpectrumPoint[] = new Array(SPECTRUM_LEN);
    for (let i = 0; i < SPECTRUM_LEN; i++) {
      let totalK = 0;
      let totalS = 0;
      for (let c = 0; c < n; c++) {
        let rMeas = Math.max(0.0001, Math.min(0.9999, spectra[c][i].reflectance * 0.01));
        const KS = ((1 - rMeas) * (1 - rMeas)) / (2 * rMeas);
        const S = 0.1 + 6.0 * Math.pow(rMeas, 2.5); 
        const K = KS * S;
        
        const weight = v[c] * invTotal;
        totalK += weight * K;
        totalS += weight * S;
      }
      const mixedKS = totalS > 1e-8 ? totalK / totalS : 0.0001;
      let rMix = 1 + mixedKS - Math.sqrt(mixedKS * mixedKS + 2 * mixedKS);
      rMix = Math.max(0, Math.min(1, rMix));
      result[i] = { wavelength: WL[i], reflectance: rMix * 100 };
    }

    const rgb = spectrumToRGB(result);
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
    const de = calculateDeltaE2000(targetLab, lab);
    
    if (de < minDE) { 
      minDE = de; 
      bestVols = [...v]; 
    }
    return de;
  }

  // 1. Плотная сетка поиска (не даст упустить экстремумы)
  const vectors: number[][] = [];
  if (n === 1) {
    vectors.push([100]);
  } else if (n === 2) {
    for (let i = 1; i < 100; i += 2) vectors.push([i, 100 - i]);
    vectors.push([99.5, 0.5], [99.9, 0.1], [0.5, 99.5], [0.1, 99.9]);
  } else if (n === 3) {
    for (let i = 1; i < 100; i += 5)
      for (let j = 1; j < 100 - i; j += 5)
        vectors.push([i, j, 100 - i - j]);
    RATIOS_3.forEach(r => vectors.push(r));
  } else if (n === 4) {
    for (let i = 1; i < 100; i += 12)
      for (let j = 1; j < 100 - i; j += 12)
        for (let k = 1; k < 100 - i - j; k += 12)
          vectors.push([i, j, k, 100 - i - j - k]);
    RATIOS_4.forEach(r => vectors.push(r));
  }

  // Считаем все стартовые векторы
  for (const v of vectors) evalVols(v);

  // 2. Снайперский градиентный спуск
  let improved = true;
  let pass = 0;
  // Добавлены шаги 0.05 и 0.01 для микро-настройки сильных пигментов
  const shifts = [5, 2, 1, 0.5, 0.1, 0.05, 0.01]; 
  while (improved && pass < 40) {
    improved = false;
    pass++;
    for (const s of shifts) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          if (bestVols[j] - s >= 0.001) { // Позволяем объему падать почти до нуля
            const test = [...bestVols];
            test[i] += s;
            test[j] -= s;
            const oldDE = minDE;
            evalVols(test);
            if (minDE < oldDE - 0.0001) improved = true;
          }
        }
      }
    }
  }

  return { vols: bestVols, deltaE: minDE };
}

export function findRecipeByHex(targetHex: string, pigments: Pigment[], maxComponents = 3, targetVolume = 20, system: CoverageSystem = 'acrylic', excludeIds: string[] = []): RecipeResult | null {
  if (!pigments.length || !targetHex) return null

  const binderPigment = system === 'acrylic' ? pigments.find((p) => p.id === 'acrylic_binder' || (p as { isBinder?: boolean }).isBinder === true) : undefined
  const validPigments = pigments.filter((p) => p.id !== 'acrylic_binder' && !(p as { isBinder?: boolean }).isBinder && p.spectrum && p.spectrum.length > 0 && !excludeIds.includes(p.id))
  if (validPigments.length === 0) return null

  const targetRgb = hexToRgbObj(targetHex)
  const targetLab = rgbToLab(targetRgb.r, targetRgb.g, targetRgb.b)

  const isAchromatic = (id: string) => {
    const lower = id.toLowerCase()
    return lower.includes('white') || lower.startsWith('pw_') || lower.includes('black') || lower.startsWith('pbk_')
  }

  const achromatics = validPigments.filter(p => isAchromatic(p.id))
  const colors = validPigments.filter(p => !isAchromatic(p.id))

  const scoredColors = colors.map(p => {
    const mixed = mixSpectra([{ spectrum: p.spectrum!, volume: 100 }])
    const rgb = spectrumToRGB(mixed)
    return { pigment: p, dist: calculateDeltaE2000(targetLab, rgbToLab(rgb.r, rgb.g, rgb.b)) }
  })
  scoredColors.sort((a, b) => a.dist - b.dist)

  const candidatesSet = new Set([...achromatics, ...scoredColors.slice(0, 10).map(s => s.pigment)])
  const candidates = Array.from(candidatesSet)
  const n = candidates.length
  if (n === 0) return null

  let bestDE = Infinity;
  let bestIndices: number[] = [];
  let bestVols: number[] = [];

  const evaluateCombo = (indices: number[]) => {
    const res = optimizeCombo(indices, candidates, targetLab);
    if (res.deltaE < bestDE) {
      bestDE = res.deltaE;
      bestIndices = indices;
      bestVols = res.vols;
    }
  }

  for (let i = 0; i < n; i++) evaluateCombo([i])

  const combos2 = combinations(n, 2)
  for (let c = 0; c < combos2.length; c++) evaluateCombo(combos2[c])

  if (maxComponents >= 3 && n >= 3) {
    const combos3 = combinations(n, 3)
    for (let c = 0; c < combos3.length; c++) evaluateCombo(combos3[c])
  }

  if (maxComponents >= 4 && n >= 4) {
    const combos4 = combinations(n, 4)
    for (let c = 0; c < combos4.length; c++) evaluateCombo(combos4[c])
  }

  if (bestDE === Infinity) return null

  const selected: Pigment[] = bestIndices.map((idx: number) => candidates[idx])
  
  const finalMixed = mixSpectra(selected.map((p, i) => ({ spectrum: p.spectrum!, volume: bestVols[i] })))
  const finalRgb = spectrumToRGB(finalMixed)

  const totalWeight = bestVols.reduce((sum: number, v: number) => sum + v, 0)
  const scale = (targetVolume > 0 ? targetVolume : 20) / totalWeight

  const recipe: RecipeItem[] = []
  for (let i = 0; i < bestIndices.length; i++) {
    const ml = Math.round(bestVols[i] * scale * 100) / 100
    // ИСПРАВЛЕН КРИТИЧЕСКИЙ БАГ: Теперь не выбрасываем микро-дозы от 0.01 мл
    if (ml >= 0.01) recipe.push({ pigment: candidates[bestIndices[i]], ml }) 
  }
  recipe.sort((a, b) => b.ml - a.ml)

  if (binderPigment && system === 'acrylic') {
    const binderMl = Math.round(recipe.reduce((sum: number, item: RecipeItem) => sum + item.ml, 0) * 0.2 * 100) / 100
    if (binderMl > 0) recipe.push({ pigment: binderPigment, ml: binderMl, isBinder: true })
  }

  return {
    recipe,
    resultRgb: finalRgb,
    resultHex: rgbToHex(finalRgb),
    deltaE: Math.round(bestDE * 10) / 10,
    system,
    approximate: bestDE > 2.0,
  }
}

export const WET_EMULSION_SPECTRUM: SpectrumPoint[] = Array.from({ length: 81 }, (_, i) => ({
  wavelength: 380 + i * 5,
  reflectance: 85
}));

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

export interface SpectrumPoint {
  wavelength: number
  reflectance: number
}

export interface RGB { r: number; g: number; b: number }
export interface XYZ { x: number; y: number; z: number }
export type IlluminantType = 'D65' | 'A' | 'cool' | 'twilight'

export interface MixComponent {
  spectrum: SpectrumPoint[]
  volume: number
  isBinder?: boolean
}

export const SPECTRUM_LEN = 81
export const WL_START = 380
export const WL_STEP = 5

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

export const XBAR = new Float32Array(SPECTRUM_LEN)
export const YBAR = new Float32Array(SPECTRUM_LEN)
export const ZBAR = new Float32Array(SPECTRUM_LEN)
export const WL = new Float32Array(SPECTRUM_LEN)

for (let i = 0; i < SPECTRUM_LEN; i++) {
  XBAR[i] = CIE_CMF[i].x; YBAR[i] = CIE_CMF[i].y; ZBAR[i] = CIE_CMF[i].z; WL[i] = CIE_CMF[i].wl
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

export function isCieAligned(spectrum: SpectrumPoint[]): boolean {
  return spectrum.length === SPECTRUM_LEN && spectrum[0].wavelength === WL_START && spectrum[SPECTRUM_LEN - 1].wavelength === 780
}

export function interpolateReflectance(spectrum: SpectrumPoint[], wavelength: number): number {
  if (!spectrum || spectrum.length === 0) return 0
  if (wavelength <= spectrum[0].wavelength) return spectrum[0].reflectance
  if (wavelength >= spectrum[spectrum.length - 1].wavelength) return spectrum[spectrum.length - 1].reflectance
  let low = 0, high = spectrum.length - 1
  while (high - low > 1) {
    const mid = (low + high) >> 1
    if (spectrum[mid].wavelength < wavelength) low = mid; else high = mid
  }
  const p1 = spectrum[low], p2 = spectrum[high]
  const t = (wavelength - p1.wavelength) / (p2.wavelength - p1.wavelength)
  return p1.reflectance + t * (p2.reflectance - p1.reflectance)
}

export function normalizeSpectrumToCIE(rawSpectrum: SpectrumPoint[]): SpectrumPoint[] {
  if (!rawSpectrum || rawSpectrum.length === 0) return []
  const normalized: SpectrumPoint[] = new Array(SPECTRUM_LEN)
  for (let i = 0; i < SPECTRUM_LEN; i++) {
    normalized[i] = { wavelength: CIE_CMF[i].wl, reflectance: interpolateReflectance(rawSpectrum, CIE_CMF[i].wl) }
  }
  return normalized
}

export function parseSpectrum(text: string): SpectrumPoint[] {
  const lines = text.trim().split(/\r?\n/)
  const points: SpectrumPoint[] = []
  for (let li = 0; li < lines.length; li++) {
    const parts = lines[li].trim().split(/[\s,;]+/)
    if (parts.length < 2) continue
    const wl = parseFloat(parts[0]), refl = parseFloat(parts[1])
    if (!isNaN(wl) && !isNaN(refl)) points.push({ wavelength: wl, reflectance: refl })
  }
  points.sort((a, b) => a.wavelength - b.wavelength)
  return normalizeSpectrumToCIE(points)
}

export function mixSpectra(components: MixComponent[], isWet = false): SpectrumPoint[] {
  let pigments = components.filter(c => !c.isBinder)

  if (isWet) {
    let totalVol = 0;
    for (let c = 0; c < pigments.length; c++) totalVol += pigments[c].volume;
    if (totalVol > 0) {
      pigments.push({ spectrum: WET_EMULSION_SPECTRUM, volume: totalVol * 0.12, isBinder: true });
    }
  }

  const n = pigments.length
  if (n === 0) return []

  let totalVolume = 0
  for (let c = 0; c < n; c++) totalVolume += pigments[c].volume
  if (totalVolume <= 0) return []

  const invTotal = 1 / totalVolume
  const aligned = pigments.every((c) => isCieAligned(c.spectrum))
  const result: SpectrumPoint[] = new Array(SPECTRUM_LEN)

  for (let i = 0; i < SPECTRUM_LEN; i++) {
    const wl = WL[i]
    let totalK = 0
    let totalS = 0

    for (let c = 0; c < n; c++) {
      let rMeas = aligned
        ? pigments[c].spectrum[i].reflectance * 0.01
        : interpolateReflectance(pigments[c].spectrum, wl) * 0.01

      rMeas = Math.max(0.0001, Math.min(0.9999, rMeas))
      
      const KS = ((1 - rMeas) * (1 - rMeas)) / (2 * rMeas)
      const S = 0.1 + 6.0 * Math.pow(rMeas, 2.5)
      const K = KS * S

      const weight = pigments[c].volume * invTotal
      totalK += weight * K
      totalS += weight * S
    }

    const mixedKS = totalS > 1e-8 ? totalK / totalS : 0.0001
    let rMix = 1 + mixedKS - Math.sqrt(mixedKS * mixedKS + 2 * mixedKS)
    rMix = Math.max(0, Math.min(1, rMix))

    result[i] = { wavelength: wl, reflectance: rMix * 100 }
  }

  return result
}

export function spectrumToXYZWithIlluminant(spectrum: SpectrumPoint[], illuminant: IlluminantType = 'D65'): XYZ {
  let X = 0, Y = 0, Z = 0, N = 0
  const S = D65
  const step = 5
  const aligned = isCieAligned(spectrum)

  for (let i = 0; i < SPECTRUM_LEN; i++) {
    const refl = aligned ? spectrum[i].reflectance * 0.01 : interpolateReflectance(spectrum, WL[i]) * 0.01
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
  return Math.round((clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * Math.pow(clipped, 1 / 2.4) - 0.055) * 255)
}

export function spectrumToRGBWithIlluminant(spectrum: SpectrumPoint[], illuminant: IlluminantType = 'D65'): RGB {
  const xyz = spectrumToXYZWithIlluminant(spectrum, illuminant)
  const linear = xyzToLinearRGB(xyz)
  return { r: linearToSrgb(linear.r), g: linearToSrgb(linear.g), b: linearToSrgb(linear.b) }
}

export function spectrumToRGB(spectrum: SpectrumPoint[]): RGB {
  return spectrumToRGBWithIlluminant(spectrum, 'D65')
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return '#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b)
}
