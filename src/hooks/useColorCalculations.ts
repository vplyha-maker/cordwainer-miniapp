import { useMemo } from 'react'
import { Pigment } from '../data/pigments'
import {
  mixSpectra,
  spectrumToRGB,
  rgbToHex,
  SpectrumPoint,
} from '../utils/colorScience'
import {
  CoverageSystem,
  simulateLayersKM,
} from '../utils/calculatorLogic'
import { PaintPart } from './usePaintMix'
import { Lang } from '../App'

interface UseColorCalculationsParams {
  pigments: Pigment[]
  paints: PaintPart[]
  totalAmount: number
  basePigmentId: string
  coverageSystem: CoverageSystem
  unwantedPigmentId: string
  neutralizerPigmentId: string
  neutralizeStrength: number
  lang: Lang
}

export function useColorCalculations({
  pigments,
  paints,
  totalAmount,
  basePigmentId,
  coverageSystem,
  unwantedPigmentId,
  neutralizerPigmentId,
  neutralizeStrength,
  lang,
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

  const layerData = useMemo(() => {
    if (!mixedColor?.spectrum) return null

    const basePigment = pigments.find((p) => p.id === basePigmentId)
    if (!basePigment?.spectrum) return null

    return simulateLayersKM(
      basePigment.spectrum,
      mixedColor.spectrum,
      coverageSystem
    )
  }, [basePigmentId, mixedColor, pigments, coverageSystem])

  const layers = useMemo(() => {
    if (!layerData) return null

    return {
      layer1: spectrumToRGB(layerData.layer1),
      layer2: spectrumToRGB(layerData.layer2),
      layer3: spectrumToRGB(layerData.layer3),
      final: spectrumToRGB(layerData.final),
    }
  }, [layerData])

  const coverageAdvice = useMemo(() => {
    if (!layerData) return null

    const { deltaL } = layerData
    const isUk = lang === 'uk'

    let opacityLabel = ''
    let layersLabel = ''
    let note = ''

    if (deltaL > 0.4) {
      opacityLabel = isUk ? 'Низька' : 'Низкая'
      layersLabel =
        coverageSystem === 'aniline'
          ? isUk
            ? '4–5+ шарів'
            : '4–5+ слоёв'
          : isUk
            ? '3–4 шари'
            : '3–4 слоя'
      note = isUk
        ? 'Велика різниця яскравості. Рекомендується ґрунт + акрилова система.'
        : 'Большая разница яркости. Рекомендуется грунт + акриловая система.'
    } else if (deltaL > 0.22) {
      opacityLabel = isUk ? 'Середня' : 'Средняя'
      layersLabel =
        coverageSystem === 'aniline'
          ? isUk
            ? '3–4 шари'
            : '3–4 слоя'
          : isUk
            ? '2–3 шари'
            : '2–3 слоя'
      note = isUk
        ? 'Потрібна помірна кількість шарів. Акрил перекриє швидше.'
        : 'Потребуется умеренное количество слоёв. Акрил перекроет быстрее.'
    } else {
      opacityLabel = isUk ? 'Висока' : 'Высокая'
      layersLabel = isUk ? '1–2 шари' : '1–2 слоя'
      note = isUk
        ? 'Колір добре лягає на основу. Можна працювати тонкими шарами.'
        : 'Цвет хорошо ложится на основу. Можно работать тонкими слоями.'
    }

    return { opacityLabel, layersLabel, note }
  }, [layerData, coverageSystem, lang])

  const neutralizeResult = useMemo(() => {
    const unwanted = pigments.find((p) => p.id === unwantedPigmentId)
    const neutralizer = pigments.find((p) => p.id === neutralizerPigmentId)

    if (!unwanted?.spectrum || !neutralizer?.spectrum) return null

    const components = [
      { spectrum: unwanted.spectrum, volume: 100 - neutralizeStrength },
      { spectrum: neutralizer.spectrum, volume: neutralizeStrength },
    ]

    const mixed = mixSpectra(components)
    const rgb = spectrumToRGB(mixed)

    return {
      rgb,
      hex: rgbToHex(rgb),
    }
  }, [pigments, unwantedPigmentId, neutralizerPigmentId, neutralizeStrength])

  return {
    mixedColor,
    layerData,
    layers,
    coverageAdvice,
    neutralizeResult,
  }
}
