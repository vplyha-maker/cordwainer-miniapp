/**
 * recipeWorker.ts
 * Подбор рецепта в Web Worker — UI не блокируется.
 *
 * Важно: передавай в basicPigments полный список, включая acrylic_binder
 * (для system === 'acrylic'). Worker сам отфильтрует цвета.
 */
import { findRecipeByHex } from '../utils/calculatorLogic'
import type { Pigment } from '../data/pigments'
import type { CoverageSystem, RecipeResult } from '../utils/calculatorLogic'

export interface WorkerRequest {
  id: number
  targetHex: string
  /** Полный список пигментов со спектрами (включая binder при acrylic) */
  basicPigments: Pigment[]
  maxComponents?: number
  targetVolume?: number
  system?: CoverageSystem
  /** ID, которые нужно исключить */
  excludeIds?: string[]
  /**
   * Инвентарь пользователя: только эти ID участвуют в подборе.
   * binder (acrylic_binder) можно не включать — подтянется из basicPigments.
   */
  activeIds?: string[]
}

export interface WorkerResponse {
  id: number
  result: RecipeResult | null
  error?: string
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const {
    id,
    targetHex,
    basicPigments,
    maxComponents = 3,
    targetVolume = 20,
    system = 'acrylic',
    excludeIds = [],
    activeIds,
  } = e.data

  try {
    if (!targetHex || !basicPigments?.length) {
      self.postMessage({
        id,
        result: null,
        error: 'Missing targetHex or pigments',
      } as WorkerResponse)
      return
    }

    // Инвентарь: оставляем только activeIds + всегда binder (если acrylic)
    let pool = basicPigments

    if (activeIds && activeIds.length > 0) {
      const allowed = new Set(activeIds)
      pool = basicPigments.filter(
        (p) =>
          allowed.has(p.id) ||
          p.id === 'acrylic_binder' ||
          (p as { isBinder?: boolean }).isBinder === true
      )
    }

    // cardboard / мусор — наружу не пускаем
    const exclude = new Set(excludeIds)
    exclude.add('cardboard')

    const result = findRecipeByHex(
      targetHex,
      pool,
      maxComponents,
      targetVolume,
      system,
      Array.from(exclude)
    )

    self.postMessage({ id, result } as WorkerResponse)
  } catch (err) {
    self.postMessage({
      id,
      result: null,
      error: err instanceof Error ? err.message : String(err),
    } as WorkerResponse)
  }
}

export {}
