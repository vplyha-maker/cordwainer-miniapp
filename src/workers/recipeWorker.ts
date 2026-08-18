// src/workers/recipeWorker.ts

import { findRecipeByHex } from '../utils/calculatorLogic'
import type { Pigment } from '../data/pigments'
import type { CoverageSystem } from '../utils/calculatorLogic'

interface WorkerRequest {
  id: number
  targetHex: string
  basicPigments: Pigment[]
  maxComponents?: number
  targetVolume?: number
  system?: CoverageSystem
}

interface WorkerResponse {
  id: number
  result: ReturnType<typeof findRecipeByHex>
  error?: string
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const {
    id,
    targetHex,
    basicPigments,
    maxComponents = 3,
    targetVolume = 20,
    // system пока не влияет на алгоритм подбора цвета —
    // биндер и подсказки считаются на стороне UI
  } = e.data

  try {
    // Исключаем биндер из подбора цвета (он не должен влиять на оттенок)
    const colorPigments = basicPigments.filter(
      (p) => p.id !== 'acrylic_binder' && p.id !== 'cardboard'
    )

    const result = findRecipeByHex(
      targetHex,
      colorPigments,
      maxComponents,
      targetVolume
    )

    const response: WorkerResponse = { id, result }
    self.postMessage(response)
  } catch (err) {
    const response: WorkerResponse = {
      id,
      result: null,
      error: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(response)
  }
}

export {}
