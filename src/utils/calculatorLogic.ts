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
  if (id.includes('white') || ['lithopone', 'chalk', 'gypsum'].includes(id)) return isUk ? 'Білила / Наповнювачі' : 'Белила / Наполнители'
  if (id.includes('ochre') || id.includes('sienna') || id.includes('umber') || id === 'green_earth') return isUk ? 'Земляні пігменти' : 'Земляные пигменты'
  if (id.includes('black') || id === 'bitumen') return isUk ? 'Чорні / Вуглецеві' : 'Черные / Углеродные'
  if (id.includes('phthalo')) return isUk ? 'Фталоціаніни (синтетика)' : 'Фталоцианины (синтетика)'
  if (['ultramarine', 'ultramarine_nat', 'prussian_blue', 'azurite'].includes(id)) return isUk ? 'Традиційні сині' : 'Традиционные синие'
  return isUk ? 'Органічний / Інший' : 'Органический / Прочий'
}

// Утилиты для перевода RGB в LAB для точного визуального сравнения (CIE76)
function rgbToLab(r: number, g: number, b: number) {
  let r_ = r / 255, g_ = g / 255, b_ = b / 255;
  r_ = r_ > 0.04045 ? Math.pow((r_ + 0.055) / 1.055, 2.4) : r_ / 12.92;
  g_ = g_ > 0.04045 ? Math.pow((g_ + 0.055) / 1.055, 2.4) : g_ / 12.92;
  b_ = b_ > 0.04045 ? Math.pow((b_ + 0.055) / 1.055, 2.4) : b_ / 12.92;
  
  let x = (r_ * 0.4124 + g_ * 0.3576 + b_ * 0.1805) * 100;
  let y = (r_ * 0.2126 + g_ * 0.7152 + b_ * 0.0722) * 100;
  let z = (r_ * 0.0193 + g_ * 0.1192 + b_ * 0.9505) * 100;
  
  x /= 95.047; y /= 100.000; z /= 108.883;
  
  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);
  
  return { L: (116 * y) - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

function calculateDeltaELab(lab1: {L: number, a: number, b: number}, lab2: {L: number, a: number, b: number}) {
  return Math.sqrt(
    Math.pow(lab1.L - lab2.L, 2) + 
    Math.pow(lab1.a - lab2.a, 2) + 
    Math.pow(lab1.b - lab2.b, 2)
  );
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

interface BestResult {
  volumes: number[]
  rgb: { r: number; g: number; b: number }
  deltaE: number
}

// ГЛАВНЫЙ АЛГОРИТМ ПОИСКА
export function findRecipeByHex(
  targetHex: string,
  basicPigments: Pigment[],
  maxComponents = 3,
  targetVolume = 20 // Масштабируем к объему пользователя
) {
  if (!basicPigments.length || !targetHex) return null

  // 1. ЖЕСТКАЯ ФИЛЬТРАЦИЯ: Убираем пигменты без спектра
  const validPigments = basicPigments.filter(p => p.spectrum && p.spectrum.length > 0)
  if (validPigments.length === 0) return null

  const targetRgb = hexToRgbObj(targetHex)
  const targetLab = rgbToLab(targetRgb.r, targetRgb.g, targetRgb.b)

  // 2. УМНАЯ СОРТИРОВКА: Ищем топ N ближайших пигментов через LAB
  const scoredPigments = validPigments.map(p => {
    const rgb = spectrumToRGB(p.spectrum!)
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
    return { pigment: p, dist: calculateDeltaELab(targetLab, lab) }
  })
  
  scoredPigments.sort((a, b) => a.dist - b.dist)
  
  // Берем топ 5 кандидатов, чтобы избежать взрыва комбинаторики (улучшает точность и не вешает браузер)
  const candidates = scoredPigments.slice(0, 5).map(s => s.pigment)

  // Инициализируем объект сразу, чтобы обойти баг TypeScript с "недостижимым кодом" (never)
  const best: BestResult = {
    volumes: [],
    rgb: { r: 0, g: 0, b: 0 },
    deltaE: Infinity // Бесконечность, чтобы первый же результат стал лучшим
  }
  
  // ФУНКЦИЯ ОЦЕНКИ
  const evaluateVolumes = (vols: number[]) => {
    const total = vols.reduce((s, v) => s + v, 0)
    if (total === 0) return

    const components = []
    let activeCount = 0
    for (let i = 0; i < candidates.length; i++) {
      if (vols[i] > 0) {
        components.push({ spectrum: candidates[i].spectrum!, volume: vols[i] })
        activeCount++
      }
    }

    if (activeCount > maxComponents) return

    const mixed = mixSpectra(components)
    const rgb = spectrumToRGB(mixed)
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
    
    // Внутренняя оценка БЕЗ округления
    const deltaE = calculateDeltaELab(targetLab, lab)

    if (deltaE < best.deltaE) {
      best.volumes = [...vols]
      best.rgb = rgb
      best.deltaE = deltaE
    }
  }

  // 3. ЭТАП 1: ГРУБЫЙ ПОИСК (Coarse Search)
  const coarseSteps = [0, 20, 45, 75, 100]
  
  const searchCoarse = (idx: number, vols: number[]) => {
    if (idx === candidates.length) {
      evaluateVolumes(vols)
      return
    }
    for (const s of coarseSteps) {
      vols[idx] = s
      
      let active = 0
      for (let k = 0; k <= idx; k++) if (vols[k] > 0) active++
      if (active > maxComponents) continue // Pruning

      searchCoarse(idx + 1, vols)
    }
  }

  searchCoarse(0, new Array(candidates.length).fill(0))

  // Если deltaE так и осталась Infinity, значит рецепт не найден
  if (best.deltaE === Infinity) return null

  // 4. ЭТАП 2: ЛОКАЛЬНАЯ ОПТИМИЗАЦИЯ (Fine Tuning)
  // Делаем сетку вокруг лучших значений для уточнения рецепта
  const bestCoarseVolumes = [...best.volumes]
  const fineDeltas = [-10, -5, 5, 10]
  
  const searchFine = (idx: number, currentVols: number[]) => {
    if (idx === candidates.length) {
      evaluateVolumes(currentVols)
      return
    }
    
    // Оптимизируем только те пигменты, которые алгоритм выбрал на грубом этапе
    if (bestCoarseVolumes[idx] > 0) {
      // Проверяем само значение
      searchFine(idx + 1, currentVols)
      
      // И его отклонения
      for (const delta of fineDeltas) {
        const newVal = bestCoarseVolumes[idx] + delta
        if (newVal > 0 && newVal <= 110) { 
          const temp = [...currentVols]
          temp[idx] = newVal
          searchFine(idx + 1, temp)
        }
      }
    } else {
      searchFine(idx + 1, currentVols)
    }
  }

  searchFine(0, [...bestCoarseVolumes])

  // 5. МАСШТАБИРОВАНИЕ К ОБЪЕМУ
  const total = best.volumes.reduce((s, v) => s + v, 0)
  
  // Если объем в UI нулевой, де-факто даем рецепт на 20 мл
  const scaleTarget = targetVolume > 0 ? targetVolume : 20
  const scale = scaleTarget / total

  const recipe = candidates
    .map((p, i) => ({
      pigment: p,
      ml: Math.round(best.volumes[i] * scale * 10) / 10, 
    }))
    .filter((r) => r.ml > 0)

  recipe.sort((a, b) => b.ml - a.ml)

  return {
    recipe,
    resultRgb: best.rgb,
    resultHex: rgbToHex(best.rgb),
    deltaE: Math.round(best.deltaE), // Округляем только для UI
  }
}

// Симуляция Кубелки-Мунка
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
