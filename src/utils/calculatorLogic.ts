import { Pigment } from '../data/pigments'
import { Lang } from '../App'
import { mixSpectra, spectrumToRGB, rgbToHex, SpectrumPoint, WL, SPECTRUM_LEN } from './colorScience'

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

// ─── ВЫСОКОСКОРОСТНОЙ ПОИСК ПО СЕТКЕ И ПОДГОНКА ───
function optimizeCombo(indices: number[], candidates: Pigment[], targetLab: any) {
  const n = indices.length;
  let minDE = Infinity;
  let bestVols = Array(n).fill(100 / n);
  
  const spectra = indices.map(idx => candidates[idx].spectrum!);

  // Супер-быстрая inline функция оценки смеси без лишних объектов
  const evalVols = (v: number[]) => {
    let totalVol = 0;
    for (let i = 0; i < n; i++) totalVol += v[i];
    const invTotal = 1 / totalVol;

    const result: SpectrumPoint[] = new Array(SPECTRUM_LEN);
    for (let i = 0; i < SPECTRUM_LEN; i++) {
      let mixedKS = 0;
      for (let c = 0; c < n; c++) {
        let rMeas = Math.max(0.0001, Math.min(0.9999, spectra[c][i].reflectance * 0.01));
        const rInt = rMeas / (0.4 + 0.6 * rMeas); // Saunderson
        const KS = ((1 - rInt) * (1 - rInt)) / (2 * rInt);
        mixedKS += (v[c] * invTotal) * KS;
      }
      let rMixInt = 1 + mixedKS - Math.sqrt(mixedKS * mixedKS + 2 * mixedKS);
      rMixInt = Math.max(0.0001, Math.min(0.9999, rMixInt));
      const rMixMeas = (0.4 * rMixInt) / (1 - 0.6 * rMixInt);
      result[i] = { wavelength: WL[i], reflectance: rMixMeas * 100 };
    }

    const rgb = spectrumToRGB(result);
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
    const de = calculateDeltaE2000(targetLab, lab);
    if (de < minDE) { minDE = de; bestVols = [...v]; }
    return de;
  }

  // 1. Быстрый Grid Search (Поиск по сетке). Гарантирует, что алгоритм найдет нужный баланс (даже 95% белил и 5% цвета)
  if (n === 1) {
    evalVols([100]);
  } else if (n === 2) {
    for (let i = 5; i <= 95; i += 5) evalVols([i, 100 - i]);
  } else if (n === 3) {
    for (let i = 5; i <= 90; i += 15)
      for (let j = 5; j <= 95 - i; j += 15)
        evalVols([i, j, 100 - i - j]);
  } else if (n === 4) {
    for (let i = 5; i <= 85; i += 25)
      for (let j = 5; j <= 90 - i; j += 25)
        for (let k = 5; k <= 95 - i - j; k += 25)
          evalVols([i, j, k, 100 - i - j - k]);
  }

  // 2. Hill Climbing (Ювелирная подгонка сдвигом)
  let improved = true;
  let pass = 0;
  const shifts = [10, 5, 1, 0.5, 0.1]; // Сдвигаем доли процента
  while (improved && pass < 20) {
    improved = false;
    pass++;
    for (let s of shifts) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          if (bestVols[j] - s >= 0.1) {
            let test = [...bestVols];
            test[i] += s;
            test[j] -= s;
            const oldDE = minDE;
            evalVols(test);
            if (minDE < oldDE - 0.001) improved = true;
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

  // Всегда добавляем Ахроматы (Белила и Черный) в кандидаты, чтобы алгоритм мог работать со светлотой!
  const achromatics = validPigments.filter(p => isAchromatic(p.id))
  const colors = validPigments.filter(p => !isAchromatic(p.id))

  // Сортируем цветные пигменты по дистанции
  const scoredColors = colors.map(p => {
    const mixed = mixSpectra([{ spectrum: p.spectrum!, volume: 100 }])
    const rgb = spectrumToRGB(mixed)
    return { pigment: p, dist: calculateDeltaE2000(targetLab, rgbToLab(rgb.r, rgb.g, rgb.b)) }
  })
  scoredColors.sort((a, b) => a.dist - b.dist)

  // Берем Ахроматы + топ 10 ближайших цветов
  const candidatesSet = new Set([...achromatics, ...scoredColors.slice(0, 10).map(s => s.pigment)])
  const candidates = Array.from(candidatesSet)
  const n = candidates.length
  if (n === 0) return null

  let bestGlobalResult: { indices: number[], vols: number[], deltaE: number } | null = null

  const evaluateCombo = (indices: number[]) => {
    const res = optimizeCombo(indices, candidates, targetLab);
    if (!bestGlobalResult || res.deltaE < bestGlobalResult.deltaE) {
      bestGlobalResult = { indices, vols: res.vols, deltaE: res.deltaE };
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

  if (!bestGlobalResult) return null

  // Повторно вычисляем финальный RGB для лучшего результата
  const finalIndices = bestGlobalResult.indices
  const finalVols = bestGlobalResult.vols
  const selected: Pigment[] = finalIndices.map(idx => candidates[idx])
  
  const finalMixed = mixSpectra(selected.map((p, i) => ({ spectrum: p.spectrum!, volume: finalVols[i] })))
  const finalRgb = spectrumToRGB(finalMixed)

  const totalWeight = finalVols.reduce((sum, v) => sum + v, 0)
  const scale = (targetVolume > 0 ? targetVolume : 20) / totalWeight

  const recipe: RecipeItem[] = []
  for (let i = 0; i < finalIndices.length; i++) {
    const ml = Math.round(finalVols[i] * scale * 100) / 100
    if (ml > 0.05) recipe.push({ pigment: candidates[finalIndices[i]], ml })
  }
  recipe.sort((a, b) => b.ml - a.ml)

  // В самом конце мы подставляем 20% прозрачного акрилового біндера
  if (binderPigment && system === 'acrylic') {
    const binderMl = Math.round(recipe.reduce((sum, item) => sum + item.ml, 0) * 0.2 * 100) / 100
    if (binderMl > 0) recipe.push({ pigment: binderPigment, ml: binderMl, isBinder: true })
  }

  return {
    recipe,
    resultRgb: finalRgb,
    resultHex: rgbToHex(finalRgb),
    deltaE: Math.round(bestGlobalResult.deltaE * 10) / 10,
    system,
    approximate: bestGlobalResult.deltaE > 2.0,
  }
}

// ... остальной код (simulateLayersKM и т.д.)


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
