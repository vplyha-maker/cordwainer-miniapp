/**
 * useColorCalculations.ts
 * Смешивание пигментов вкладки Mix → spectrum / RGB / HEX.
 */
import { useMemo } from 'react'
import { Pigment } from '../data/pigments'
import {
  mixSpectra,
  spectrumToRGB,
  rgbToHex,
  type SpectrumPoint,
  type MixComponent,
} from '../utils/colorScience'
import { PaintPart } from './usePaintMix'

interface UseColorCalculationsParams {
  pigments: Pigment[]
  paints: PaintPart[]
  totalAmount: number
}

export interface MixedColor {
  rgb: { r: number; g: number; b: number }
  hex: string
  spectrum: SpectrumPoint[]
}

export function useColorCalculations({
  pigments,
  paints,
  totalAmount,
}: UseColorCalculationsParams) {
  const mixedColor = useMemo((): MixedColor | null => {
    if (pigments.length === 0 || totalAmount <= 0) return null

    // Map id → pigment один раз (O(n) вместо find на каждую строку)
    const byId = new Map<string, Pigment>()
    for (let i = 0; i < pigments.length; i++) {
      byId.set(pigments[i].id, pigments[i])
    }

    const components: MixComponent[] = []
    for (let i = 0; i < paints.length; i++) {
      const paint = paints[i]
      const val = parseFloat(paint.amount)
      if (!val || val <= 0) continue

      const pigment = byId.get(paint.pigmentId)
      if (!pigment?.spectrum || pigment.spectrum.length === 0) continue

      components.push({
        spectrum: pigment.spectrum,
        volume: val,
        isBinder: pigment.id === 'acrylic_binder',
      })
    }

    if (components.length === 0) return null

    const mixedSpectrum = mixSpectra(components)
    if (!mixedSpectrum.length) return null

    const rgb = spectrumToRGB(mixedSpectrum)
    return {
      rgb,
      hex: rgbToHex(rgb),
      spectrum: mixedSpectrum,
    }
  }, [paints, pigments, totalAmount])

  return { mixedColor }
}
