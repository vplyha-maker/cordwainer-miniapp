import { useMemo } from 'react'
import { Pigment } from '../data/pigments'
import {
  mixSpectra,
  spectrumToRGB,
  rgbToHex,
  SpectrumPoint,
} from '../utils/colorScience'
import { PaintPart } from './usePaintMix'

interface UseColorCalculationsParams {
  pigments: Pigment[]
  paints: PaintPart[]
  totalAmount: number
}

export function useColorCalculations({
  pigments,
  paints,
  totalAmount,
}: UseColorCalculationsParams) {
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

  return { mixedColor }
}
