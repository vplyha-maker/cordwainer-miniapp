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
  girthIn: number
}

// Константа для конвертации миллиметров в дюймы
const MM_TO_INCHES = 0.0393701;

// Лимиты для централизованного управления (валидация на стороне UI)
export const SIZE_LIMITS: Record<Gender, { min: number, max: number }> = {
  men: { min: 38, max: 50 },
  women: { min: 34, max: 43 },
  kids: { min: 16, max: 38 },
}

// Базовые параметры по ГОСТ 3927-88 (Обувь. Колодки обувные)
// widthStep  — шаг изменения обхвата на 1 единицу полноты ГОСТ
// lengthStep — шаг изменения обхвата на 1 размер обуви
const BASE_MEASUREMENTS = {
  men: { baseEu: 42, baseGirth: 254, widthStep: 5, lengthStep: 3 },
  women: { baseEu: 38, baseGirth: 228, widthStep: 4, lengthStep: 3 },
  kids: { baseEu: 28, baseGirth: 164, widthStep: 3, lengthStep: 2.5 },
}

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

export function getWidthData(gender: Gender, sizeEu: number, category: WidthCategory): WidthResult {
  const baseData = WIDTH_DATA[gender][category]
  const metrics = BASE_MEASUREMENTS[gender]
  const limits = SIZE_LIMITS[gender]
  
  // Безопасное ограничение (clamp) размера для защиты логики
  const clampedSize = Math.max(limits.min, Math.min(limits.max, sizeEu))
  
  // Смещение по размеру относительно базового стандарта
  const sizeDelta = clampedSize - metrics.baseEu
  
  // ИДЕАЛЬНАЯ МАТЕМАТИКА ГОСТ:
  // Динамически вычисляем разницу в полноте, сравнивая ГОСТ номер выбранной категории
  // с ГОСТ номером стандартной категории для данного пола.
  const baseGostNum = WIDTH_DATA[gender].standard.gostNum
  const targetGostNum = baseData.gostNum
  const widthDelta = targetGostNum - baseGostNum
  
  // Финальный расчет обхвата в миллиметрах
  const girthMm = Math.round(
    metrics.baseGirth + (sizeDelta * metrics.lengthStep) + (widthDelta * metrics.widthStep)
  )
  
  // Конвертация в дюймы
  const girthIn = Number((girthMm * MM_TO_INCHES).toFixed(2))
  
  return {
    ...baseData,
    girthMm,
    girthIn
  }
}
