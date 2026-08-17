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

// ИСПРАВЛЕНИЕ: Возвращаем оригинальный пигмент, не меняя его ID
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

export function getOstwaldNeutralizer(pigmentId: string, pigments: Pigment[]): string {
  const pigment = pigments.find((p) => p.id === pigmentId)
  if (!pigment?.hex) return 'ultramarine'

  const hex = pigment.hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  if (delta < 25) return 'ultramarine'

  if (r > 150 && g > 120 && b < 110) {
    const violet = pigments.find(p => p.id.includes('ultramarine') || p.id.includes('violet') || p.id.includes('purple'))
    return violet?.id || 'ultramarine'
  }

  if (r > 160 && g > 70 && g < 150 && b < 90) {
    const blue = pigments.find(p => p.id.includes('ultramarine') || p.id.includes('prussian') || p.id.includes('cobalt_blue') || p.id.includes('phthalo'))
    return blue?.id || 'ultramarine'
  }

  if (g > r + 20 && g > b + 20) {
    const red = pigments.find(p => p.id.includes('cadmium_red') || p.id.includes('iron_oxide') || p.id.includes('venetian') || p.id.includes('scarlet'))
    return red?.id || 'cadmium_red'
  }

  if (b > r + 15 && b > g + 10) {
    const warm = pigments.find(p => p.id.includes('cadmium_orange') || p.id.includes('cadmium_yellow') || p.id.includes('ochre'))
    return warm?.id || 'cadmium_yellow'
  }

  if (r > g + 30 && r > b + 30) {
    const green = pigments.find(p => p.id.includes('phthalo_green') || p.id.includes('green_earth') || p.id.includes('viridian'))
    return green?.id || 'green_earth'
  }

  return 'ultramarine'
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
  else if (deltaL > 0.30) strength *= 0.85
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

// ОРИГИНАЛЬНАЯ ФУНКЦИЯ (возвращена, чтобы не было ошибки Vercel)
export function findBasicRecipe(
  targetSpectrum: SpectrumPoint[],
  basicPigments: Pigment[],
  maxComponents = 3
): {
  recipe: { pigment: Pigment; ml: number }[]
  resultRgb: { r: number; g: number; b: number }
  resultHex: string
  deltaE: number
} | null {
  if (!basicPigments.length || !targetSpectrum.length) return null

  const targetRgb = spectrumToRGB(targetSpectrum)

  const scored = basicPigments.map((p) => {
    const rgb = spectrumToRGB(p.spectrum!)
    const dist = Math.sqrt(
      (rgb.r - targetRgb.r) ** 2 +
      (rgb.g - targetRgb.g) ** 2 +
      (rgb.b - targetRgb.b) ** 2
    )
    return { pigment: p, dist }
  })

  scored.sort((a, b) => a.dist - b.dist)
  const candidates = scored.slice(0, Math.min(maxComponents, scored.length)).map((s) => s.pigment)

  if (candidates.length === 0) return null

  interface BestResult {
    volumes: number[]
    rgb: { r: number; g: number; b: number }
    deltaE: number
  }

  const bestHolder: { current: BestResult | null } = { current: null }
  const steps = [0, 15, 30, 50, 70, 100]

  const search = (idx: number, vols: number[]) => {
    if (idx === candidates.length) {
      const total = vols.reduce((s: number, v: number) => s + v, 0)
      if (total < 8) return

      const components = candidates.map((p, i) => ({
        spectrum: p.spectrum!,
        volume: vols[i],
      }))

      const mixed = mixSpectra(components)
      const rgb = spectrumToRGB(mixed)
      const deltaE = Math.sqrt(
        (rgb.r - targetRgb.r) ** 2 +
        (rgb.g - targetRgb.g) ** 2 +
        (rgb.b - targetRgb.b) ** 2
      )

      if (!bestHolder.current || deltaE < bestHolder.current.deltaE) {
        bestHolder.current = {
          volumes: [...vols],
          rgb,
          deltaE,
        }
      }
      return
    }

    for (const s of steps) {
      vols[idx] = s
      search(idx + 1, vols)
    }
  }

  search(0, new Array(candidates.length).fill(0))

  const best = bestHolder.current
  if (!best) return null

  const total = best.volumes.reduce((s: number, v: number) => s + v, 0)
  const scale = 20 / total

  const recipe = candidates
    .map((p, i) => ({
      pigment: p,
      ml: Math.round(best.volumes[i] * scale * 10) / 10,
    }))
    .filter((r) => r.ml >= 0.5)

  return {
    recipe,
    resultRgb: best.rgb,
    resultHex: rgbToHex(best.rgb),
    deltaE: Math.round(best.deltaE),
  }
}

// Вспомогательная функция HEX -> RGB
export function hexToRgbObj(hex: string) {
  let c = hex.replace(/^#/, '')
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]
  return {
    r: parseInt(c.substring(0, 2), 16) || 0,
    g: parseInt(c.substring(2, 4), 16) || 0,
    b: parseInt(c.substring(4, 6), 16) || 0,
  }
}

// НОВАЯ ФУНКЦИЯ ДЛЯ ВВОДА HEX: с улучшенным выбором кандидатов
export function findRecipeByHex(
  targetHex: string,
  basicPigments: Pigment[],
  maxComponents = 4
) {
  if (!basicPigments.length || !targetHex) return null

  const targetRgb = hexToRgbObj(targetHex)

  // УМНЫЙ ПОДБОР: Всегда берем белый и черный в пул кандидатов, если они есть
  const wAndB = basicPigments.filter(p => 
    p.id.includes('white') || p.id.includes('black') || p.id.includes('lithopone')
  )
  
  // Остальные цвета сортируем по близости к нужному
  const colored = basicPigments.filter(p => !wAndB.includes(p))
  const scoredColored = colored.map((p) => {
    if (!p.spectrum) return { pigment: p, dist: 999 }
    const rgb = spectrumToRGB(p.spectrum)
    const dist = Math.sqrt((rgb.r - targetRgb.r)**2 + (rgb.g - targetRgb.g)**2 + (rgb.b - targetRgb.b)**2)
    return { pigment: p, dist }
  })
  scoredColored.sort((a, b) => a.dist - b.dist)

  // Итоговые кандидаты: Белый + Черный + 2 ближайших цветных (итого 4)
  const candidates = [
    ...wAndB,
    ...scoredColored.slice(0, Math.max(0, maxComponents - wAndB.length)).map(s => s.pigment)
  ].filter(Boolean)

  if (candidates.length === 0) return null

  interface BestResult {
    volumes: number[]
    rgb: { r: number; g: number; b: number }
    deltaE: number
  }

  const bestHolder: { current: BestResult | null } = { current: null }
  // Увеличили шаги для большей точности сложных темных цветов
  const steps = [0, 10, 25, 45, 70, 100]

  const search = (idx: number, vols: number[]) => {
    if (idx === candidates.length) {
      const total = vols.reduce((s, v) => s + v, 0)
      if (total < 5) return

      const components = candidates.map((p, i) => ({
        spectrum: p.spectrum!,
        volume: vols[i],
      }))

      const mixed = mixSpectra(components)
      const rgb = spectrumToRGB(mixed)
      const deltaE = Math.sqrt((rgb.r - targetRgb.r)**2 + (rgb.g - targetRgb.g)**2 + (rgb.b - targetRgb.b)**2)

      if (!bestHolder.current || deltaE < bestHolder.current.deltaE) {
        bestHolder.current = { volumes: [...vols], rgb, deltaE }
      }
      return
    }

    for (const s of steps) {
      vols[idx] = s
      search(idx + 1, vols)
    }
  }

  search(0, new Array(candidates.length).fill(0))

  const best = bestHolder.current
  if (!best) return null

  const total = best.volumes.reduce((s, v) => s + v, 0)
  const scale = 20 / total

  const recipe = candidates
    .map((p, i) => ({
      pigment: p,
      ml: Math.round(best.volumes[i] * scale * 10) / 10,
    }))
    .filter((r) => r.ml > 0)

  return {
    recipe,
    resultRgb: best.rgb,
    resultHex: rgbToHex(best.rgb),
    deltaE: Math.round(best.deltaE),
  }
}
