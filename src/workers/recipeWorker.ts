// src/workers/recipeWorker.ts

import { findRecipeByHex } from '../utils/calculatorLogic'
import type { Pigment } from '../data/pigments'

interface WorkerRequest {
  id: number
  targetHex: string
  basicPigments: Pigment[]
  maxComponents?: number
  targetVolume?: number
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
    maxComponents = 4,
    targetVolume = 20,
  } = e.data

  try {
    const result = findRecipeByHex(
      targetHex,
      basicPigments,
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
