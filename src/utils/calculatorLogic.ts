import { Pigment } from '../data/pigments'
import { Lang } from '../App'
import {
  mixSpectra,
  spectrumToRGB,
  rgbToHex,
  SpectrumPoint,
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
  if (id.includes('white') || ['lithopone', 'chalk', 'gypsum'].includes(id)) return isUk ? 'Білила / Наповнювачі' : 'Белила / Наполнители'
  if (id.includes('ochre') || id.includes('sienna') || id.includes('umber') || id === 'green_earth') return isUk ? 'Земляні пігменти' : 'Земляные пигменты'
  if (id.includes('black') || id === 'bitumen') return isUk ? 'Чорні / Вуглецеві' : 'Черные / Углеродные'
  if (id.includes('phthalo')) return isUk ? 'Фталоціаніни (синтетика)' : 'Фталоцианины (синтетика)'
  if (['ultramarine', 'ultramarine_nat', 'prussian_blue', 'azurite'].includes(id)) return isUk ? 'Традиційні сині' : 'Традиционные синие'
  return isUk ? 'Органічний / Інший' : 'Органический / Прочий'
}

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
  volumes: number[]
  rgb: { r: number; g: number; b: number }
  deltaE: number
}

export function findRecipeByHex(
  targetHex: string,
  pigments: Pigment[],
  maxComponents = 3,
  targetVolume = 20
) {
  if (!pigments.length || !targetHex) return null

  const validPigments = pigments.filter((p) => p.spectrum && p.spectrum.length > 0)
  if (validPigments.length === 0) return null

  const targetRgb = hexToRgbObj(targetHex)
  const targetLab = rgbToLab(targetRgb.r, targetRgb.g, targetRgb.b)

  const isDarkReddish =
    targetLab.L < 40 &&
    targetLab.a > 10 &&
    Math.abs(targetLab.b) < 30

  const preferredRed = validPigments.find(
    (p) =>
      p.id.includes('carmine') ||
      p.id.includes('кармин') ||
      p.id.includes('cadmium_red') ||
      p.id.includes('pyrrole_red') ||
      p.id.includes('iron_oxide_red')
  )
  const preferredBlue = validPigments.find(
    (p) =>
      p.id.includes('ultramarine') ||
      p.id.includes('ультрамарин')
  )
  const preferredBlack = validPigments.find(
    (p) =>
      p.id.includes('black') ||
      p.id.includes('чёрн') ||
      p.id.includes('carbon') ||
      p.id.includes('ivory') ||
      p.id.includes('lamp')
  )

  // Жёсткий приоритет правильной пропорции
  if (isDarkReddish && preferredRed && preferredBlue && preferredBlack) {
    const variants = [
      [80, 15, 5],
      [82, 13, 5],
      [78, 16, 6],
      [85, 12, 3],
      [75, 18, 7],
      [80, 12, 8],
      [83, 14, 3],
      [79, 15, 6],
    ]

    let bestForced: {
      volumes: number[]
      rgb: { r: number; g: number; b: number }
      deltaE: number
    } | null = null

    for (const [r, b, k] of variants) {
      const mixed = mixSpectra([
        { spectrum: preferredRed.spectrum!, volume: r },
        { spectrum: preferredBlue.spectrum!, volume: b },
        { spectrum: preferredBlack.spectrum!, volume: k },
      ])
      const rgb = spectrumToRGB(mixed)
      const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
      const deltaE = calculateDeltaE2000(targetLab, lab)

      if (!bestForced || deltaE < bestForced.deltaE) {
        bestForced = { volumes: [r, b, k], rgb, deltaE }
      }
    }

    if (bestForced && bestForced.deltaE < 28) {
      const total = bestForced.volumes.reduce((s, v) => s + v, 0)
      const scale = (targetVolume > 0 ? targetVolume : 20) / total

      return {
        recipe: [
          { pigment: preferredRed, ml: Math.round(bestForced.volumes[0] * scale * 10) / 10 },
          { pigment: preferredBlue, ml: Math.round(bestForced.volumes[1] * scale * 10) / 10 },
          { pigment: preferredBlack, ml: Math.round(bestForced.volumes[2] * scale * 10) / 10 },
        ].sort((a, b) => b.ml - a.ml),
        resultRgb: bestForced.rgb,
        resultHex: rgbToHex(bestForced.rgb),
        deltaE: Math.round(bestForced.deltaE * 10) / 10,
      }
    }
  }

  // Обычный поиск
  const scored = validPigments.map((p) => {
    const rgb = spectrumToRGB(p.spectrum!)
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
    return { pigment: p, dist: calculateDeltaE2000(targetLab, lab) }
  })
  scored.sort((a, b) => a.dist - b.dist)

  let candidates = scored.slice(0, 6).map((s) => s.pigment)

  const forceIds = [
    ...PURE_BASIC_COLORS[2].sourceIds,
    ...PURE_BASIC_COLORS[4].sourceIds,
    ...PURE_BASIC_COLORS[1].sourceIds,
  ]
  for (const id of forceIds) {
    const p = validPigments.find((x) => x.id === id)
    if (p && !candidates.some((c) => c.id === p.id)) candidates.push(p)
  }

  if (preferredRed && !candidates.some((c) => c.id === preferredRed.id)) candidates.push(preferredRed)
  if (preferredBlue && !candidates.some((c) => c.id === preferredBlue.id)) candidates.push(preferredBlue)
  if (preferredBlack && !candidates.some((c) => c.id === preferredBlack.id)) candidates.push(preferredBlack)

  if (candidates.length > 9) candidates = candidates.slice(0, 9)

  const n = candidates.length

  const best: BestResult = {
    volumes: new Array(n).fill(0),
    rgb: { r: 0, g: 0, b: 0 },
    deltaE: Infinity,
  }

  const evaluate = (indices: number[], vols: number[]) => {
    const components: { spectrum: SpectrumPoint[]; volume: number }[] = []
    for (let i = 0; i < indices.length; i++) {
      if (vols[i] > 0.5) {
        components.push({
          spectrum: candidates[indices[i]].spectrum!,
          volume: vols[i],
        })
      }
    }
    if (components.length === 0) return

    const mixed = mixSpectra(components)
    const rgb = spectrumToRGB(mixed)
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
    const deltaE = calculateDeltaE2000(targetLab, lab)

    if (deltaE < best.deltaE) {
      best.deltaE = deltaE
      best.rgb = rgb
      const full = new Array(n).fill(0)
      for (let i = 0; i < indices.length; i++) {
        full[indices[i]] = vols[i]
      }
      best.volumes = full
    }
  }

  for (let i = 0; i < n; i++) evaluate([i], [100])

  const ratios2 = [
    [90, 10], [85, 15], [80, 20], [75, 25], [70, 30],
    [65, 35], [60, 40], [50, 50],
  ]
  for (const [i, j] of combinations(n, 2)) {
    for (const [a, b] of ratios2) {
      evaluate([i, j], [a, b])
      if (a !== b) evaluate([i, j], [b, a])
    }
  }

  if (maxComponents >= 3 && n >= 3) {
    const ratios3 = [
      [80, 15, 5], [85, 10, 5], [75, 20, 5],
      [70, 20, 10], [70, 25, 5], [60, 30, 10], [90, 5, 5],
    ]
    const topN = Math.min(7, n)
    for (const combo of combinations(topN, 3)) {
      for (const ratio of ratios3) {
        evaluate(combo, ratio)
        evaluate(combo, [ratio[0], ratio[2], ratio[1]])
        evaluate(combo, [ratio[1], ratio[0], ratio[2]])
      }
    }
  }

  if (best.deltaE === Infinity) return null

  const activeIndices = best.volumes
    .map((v, i) => (v > 0.5 ? i : -1))
    .filter((i) => i >= 0)

  if (activeIndices.length > 0 && activeIndices.length <= 3) {
    const fineDeltas = [-6, -3, 3, 6]
    const baseVols = activeIndices.map((i) => best.volumes[i])

    for (let i = 0; i < activeIndices.length; i++) {
      for (const d of fineDeltas) {
        const trial = [...baseVols]
        trial[i] = Math.max(1.5, Math.min(110, baseVols[i] + d))
        evaluate(activeIndices, trial)
      }
    }
  }

  const total = best.volumes.reduce((s, v) => s + v, 0)
  if (total <= 0) return null

  const scale = (targetVolume > 0 ? targetVolume : 20) / total

  const recipe = candidates
    .map((p, i) => ({
      pigment: p,
      ml: Math.round(best.volumes[i] * scale * 10) / 10,
    }))
    .filter((r) => r.ml > 0.4)
    .sort((a, b) => b.ml - a.ml)

  return {
    recipe,
    resultRgb: best.rgb,
    resultHex: rgbToHex(best.rgb),
    deltaE: Math.round(best.deltaE * 10) / 10,
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
