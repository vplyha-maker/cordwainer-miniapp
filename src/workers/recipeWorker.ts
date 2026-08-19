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
  excludeIds?: string[]
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
    system = 'acrylic',
    excludeIds = [],
  } = e.data

  try {
    const colorPigments = basicPigments.filter(
      (p) => p.id !== 'acrylic_binder' && p.id !== 'cardboard'
    )

    const result = findRecipeByHex(
      targetHex,
      colorPigments,
      maxComponents,
      targetVolume,
      system,
      excludeIds
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
