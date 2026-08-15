// src/lib/shoeWidths.ts

export type Gender = 'men' | 'women' | 'kids'
export type WidthCategory = 'narrow' | 'standard' | 'wide' | 'xwide'

export interface WidthResult {
  gostNum: number
  gostLetter: string
  us: string
  uk: string
  euCode: string
  color: string
  colorName: { ru: string; uk: string }
  girthMm: number
  girthIn: number // Добавлено для конвертации mm/in
}

// Экспортируем лимиты для централизованного управления (валидация)
export const SIZE_LIMITS: Record<Gender, { min: number, max: number }> = {
  men: { min: 38, max: 50 },
  women: { min: 34, max: 43 },
  kids: { min: 16, max: 38 },
}

// Базовые размеры для расчета обхвата пучков по стандартам (ISO / ГОСТ)
const BASE_MEASUREMENTS = {
  men: { baseEu: 42, baseGirth: 254, widthStep: 5, lengthStep: 3 },
  women: { baseEu: 38, baseGirth: 228, widthStep: 4, lengthStep: 3 },
  kids: { baseEu: 28, baseGirth: 164, widthStep: 3, lengthStep: 2.5 },
}

// Источник данных: ГОСТ 3927-88 (Обувь. Колодки обувные) / ISO 9407
const WIDTH_DATA: Record<Gender, Record<WidthCategory, Omit<WidthResult, 'girthMm' | 'girthIn'>>> = {
  men: {
    narrow: { gostNum: 4, gostLetter: 'У', us: 'B', uk: 'C/D', euCode: 'E', color: '#10B981', colorName: { ru: 'Зеленый', uk: 'Зелений' } },
    standard: { gostNum: 6, gostLetter: 'С', us: 'D', uk: 'E/F', euCode: 'F', color: '#3B82F6', colorName: { ru: 'Синий', uk: 'Синій' } },
    wide: { gostNum: 8, gostLetter: 'Ш', us: '2E', uk: 'G', euCode: 'G', color: '#EF4444', colorName: { ru: 'Красный', uk: 'Червоний' } },
    xwide: { gostNum: 10, gostLetter: 'ОШ', us: '4E', uk: 'H', euCode: 'H', color: '#8B5CF6', colorName: { ru: 'Фиолетовый', uk: 'Фіолетовий' } },
  },
  women: {
    narrow: { gostNum: 2, gostLetter: 'У', us: '2A', uk: 'C', euCode: 'E', color: '#10B981', colorName: { ru: 'Зеленый', uk: 'Зелений' } },
    standard: { gostNum: 4, gostLetter: 'С', us: 'B', uk: 'D', euCode: 'F', color: '#3B82F6', colorName: { ru: 'Синий', uk: 'Синій' } },
    wide: { gostNum: 6, gostLetter: 'Ш', us: 'D', uk: 'E', euCode: 'G', color: '#EF4444', colorName: { ru: 'Красный', uk: 'Червоний' } },
    xwide: { gostNum: 8, gostLetter: 'ОШ', us: '2E', uk: 'EE', euCode: 'H', color: '#8B5CF6', colorName: { ru: 'Фиолетовый', uk: 'Фіолетовий' } },
  },
  kids: {
    narrow: { gostNum: 1, gostLetter: 'У', us: 'N', uk: 'C', euCode: 'S', color: '#10B981', colorName: { ru: 'Зеленый', uk: 'Зелений' } },
    standard: { gostNum: 3, gostLetter: 'С', us: 'M', uk: 'D/E', euCode: 'M', color: '#3B82F6', colorName: { ru: 'Синий', uk: 'Синій' } },
    wide: { gostNum: 5, gostLetter: 'Ш', us: 'W', uk: 'F', euCode: 'L', color: '#EF4444', colorName: { ru: 'Красный', uk: 'Червоний' } },
    xwide: { gostNum: 7, gostLetter: 'ОШ', us: 'XW', uk: 'G', euCode: 'XL', color: '#8B5CF6', colorName: { ru: 'Фиолетовый', uk: 'Фіолетовий' } },
  }
}

const WIDTH_MULTIPLIER: Record<WidthCategory, number> = {
  narrow: -1,
  standard: 0,
  wide: 1,
  xwide: 2
}

export function getWidthData(gender: Gender, sizeEu: number, category: WidthCategory): WidthResult {
  const baseData = WIDTH_DATA[gender][category]
  const metrics = BASE_MEASUREMENTS[gender]
  const limits = SIZE_LIMITS[gender]
  
  // Безопасное ограничение (clamp) размера для защиты логики
  const clampedSize = Math.max(limits.min, Math.min(limits.max, sizeEu))
  
  const sizeDelta = clampedSize - metrics.baseEu
  const widthDelta = WIDTH_MULTIPLIER[category]
  
  const girthMm = Math.round(metrics.baseGirth + (sizeDelta * metrics.lengthStep) + (widthDelta * metrics.widthStep))
  const girthIn = Number((girthMm * 0.0393701).toFixed(2)) // Конвертация в дюймы
  
  return {
    ...baseData,
    girthMm,
    girthIn
  }
}
