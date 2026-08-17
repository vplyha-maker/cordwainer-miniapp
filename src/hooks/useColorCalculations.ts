import { useMemo, useCallback } from 'react'
import { Pigment } from '../data/pigments'
import {
  mixSpectra,
  spectrumToRGB,
  rgbToHex,
  SpectrumPoint,
  RGB
} from '../utils/colorScience'
import { PaintPart } from './usePaintMix'
import { Lang } from '../App'

// Вспомогательная функция: перевод HEX в RGB
function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace('#', '')
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16)
  }
}

// Вспомогательная функция: вычисление разницы между цветами (Евклидово расстояние)
function colorDistance(c1: RGB, c2: RGB): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  )
}

interface UseColorCalculationsParams {
  pigments: Pigment[]
  paints: PaintPart[]
  totalAmount: number
  lang: Lang
}

export function useColorCalculations({
  pigments,
  paints,
  totalAmount,
}: UseColorCalculationsParams) {
  
  // ==========================================
  // ПРЯМОЙ РАСЧЕТ (Ваш исходный код)
  // ==========================================
  const mixedColor = useMemo(() => {
    if (pigments.length === 0 || totalAmount <= 0) return null

    const components: { spectrum: SpectrumPoint[]; volume: number }[] = []

    for (const paint of paints) {
      const pigment = pigments.find((p) => p.id === paint.pigmentId)
      const val = parseFloat(paint.amount) || 0
      if (pigment?.spectrum && val > 0) {
        components.push({ spectrum: pigment.spectrum, volume: val })
      }
    }

    if (components.length === 0) return null

    const mixedSpectrum = mixSpectra(components)
    const rgb = spectrumToRGB(mixedSpectrum)

    return {
      rgb,
      hex: rgbToHex(rgb),
      spectrum: mixedSpectrum,
    }
  }, [paints, pigments, totalAmount])

  // ==========================================
  // ОБРАТНЫЙ РАСЧЕТ: Метод оптимизации комбинаций
  // ==========================================
  const findRecipeForHex = useCallback(async (targetHex: string) => {
    if (pigments.length === 0) return null
    
    const targetRgb = hexToRgb(targetHex)
    
    // Оборачиваем в Promise, чтобы дать UI время нарисовать "спиннер" загрузки
    return new Promise<{ pigmentId: string; amount: string }[]>((resolve) => {
      // setTimeout с нулевой задержкой позволяет браузеру отрендерить кадр
      setTimeout(() => {
        let bestDistance = Infinity
        let bestRecipe: { pigmentId: string; amount: number }[] = []

        // Функция для оценки конкретной комбинации миллилитров
        const evaluateMix = (combo: { p: Pigment; v: number }[]) => {
          const components = combo
            .filter(c => c.v > 0)
            .map(c => ({ spectrum: c.p.spectrum, volume: c.v }))
          
          if (components.length === 0) return Infinity
          const mixedSpec = mixSpectra(components)
          const rgb = spectrumToRGB(mixedSpec)
          return colorDistance(targetRgb, rgb)
        }

        // Мы проведем 30 попыток (итераций) со случайными тройками пигментов.
        // Чем больше итераций, тем точнее цвет, но дольше расчет.
        const ATTEMPTS = 30 

        for (let i = 0; i < ATTEMPTS; i++) {
          // 1. Выбираем 3 случайных пигмента
          const p1 = pigments[Math.floor(Math.random() * pigments.length)]
          const p2 = pigments[Math.floor(Math.random() * pigments.length)]
          const p3 = pigments[Math.floor(Math.random() * pigments.length)]
          
          // Начальные объемы (случайные, от 0 до 10 мл)
          let v1 = Math.random() * 10
          let v2 = Math.random() * 10
          let v3 = Math.random() * 10

          let currentDist = evaluateMix([{ p: p1, v: v1 }, { p: p2, v: v2 }, { p: p3, v: v3 }])
          
          // 2. Метод восхождения к вершине (Hill Climbing) для подгонки миллилитров
          const STEPS = 20 // Шаги оптимизации
          let stepSize = 2.0 // На сколько мл меняем за раз

          for (let step = 0; step < STEPS; step++) {
            // Пробуем чуть-чуть изменить объемы
            const tweaks = [
              { v1: v1 + stepSize, v2, v3 }, { v1: Math.max(0, v1 - stepSize), v2, v3 },
              { v1, v2: v2 + stepSize, v3 }, { v1, v2: Math.max(0, v2 - stepSize), v3 },
              { v1, v2, v3: v3 + stepSize }, { v1, v2, v3: Math.max(0, v3 - stepSize) },
            ]

            let improved = false
            for (const tweak of tweaks) {
              const testDist = evaluateMix([{ p: p1, v: tweak.v1 }, { p: p2, v: tweak.v2 }, { p: p3, v: tweak.v3 }])
              
              if (testDist < currentDist) {
                currentDist = testDist
                v1 = tweak.v1; v2 = tweak.v2; v3 = tweak.v3;
                improved = true
              }
            }
            
            // Если улучшений нет, уменьшаем шаг для более тонкой настройки
            if (!improved) {
              stepSize *= 0.5
            }
          }

          // 3. Запоминаем лучшую комбинацию за все попытки
          if (currentDist < bestDistance) {
            bestDistance = currentDist
            bestRecipe = [
              { pigmentId: p1.id, amount: v1 },
              { pigmentId: p2.id, amount: v2 },
              { pigmentId: p3.id, amount: v3 },
            ]
          }
        }

        // 4. Форматируем результат для возврата в интерфейс
        const finalRecipe = bestRecipe
          .filter(r => r.amount >= 0.1) // Отбрасываем микро-дозы меньше 0.1 мл
          .map(r => ({
            pigmentId: r.pigmentId,
            amount: r.amount.toFixed(1) // Округляем до 1 знака после запятой
          }))

        resolve(finalRecipe)
      }, 0)
    })
  }, [pigments])

  return { mixedColor, findRecipeForHex }
}
