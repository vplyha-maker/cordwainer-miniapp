import type { Lang } from '../../App'
import type { Pigment } from '../../data/pigments'
import { SPECTRUM_LEN, WL_START, WL_STEP, type SpectrumPoint } from '../../utils/colorScience'
import { hexToRgbObj } from '../../utils/calculatorLogic'

export type SubstratePresetId = 'crust' | 'white' | 'cognac' | 'espresso' | 'black'

export interface SubstratePreset {
  id: SubstratePresetId
  pigmentIds: string[]
  fallbackHex: string
  label: Record<Lang, string>
}

export const SUBSTRATE_PRESETS: SubstratePreset[] = [
  {
    id: 'crust',
    pigmentIds: ['cardboard'],
    fallbackHex: '#D8C9B4',
    label: { ru: 'Краст', uk: 'Краст', de: 'Natur' },
  },
  {
    id: 'white',
    pigmentIds: ['titanium_white', 'pw_6_anatase'],
    fallbackHex: '#F2F3F0',
    label: { ru: 'Белая', uk: 'Біла', de: 'Weiß' },
  },
  {
    id: 'cognac',
    pigmentIds: ['burnt_sienna', 'raw_sienna', 'yellow_ochre'],
    fallbackHex: '#9A522B',
    label: { ru: 'Коньяк', uk: 'Коньяк', de: 'Cognac' },
  },
  {
    id: 'espresso',
    pigmentIds: ['burnt_umber', 'raw_umber', 'van_dyke_brown'],
    fallbackHex: '#3D271C',
    label: { ru: 'Эспрессо', uk: 'Еспресо', de: 'Espresso' },
  },
  {
    id: 'black',
    pigmentIds: ['pbk_1_aniline_black', 'ivory_black', 'bone_black'],
    fallbackHex: '#181716',
    label: { ru: 'Чёрная', uk: 'Чорна', de: 'Schwarz' },
  },
]

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

/**
 * Переводит произвольный HEX кожи в плавный 81-точечный спектр отражения (380–780 нм)
 * с разбиением единицы (wB + wG + wR = 1) для корректной работы Кубелки–Мунка.
 */
export function hexToApproxSpectrum(hex: string): SpectrumPoint[] {
  const rgb = hexToRgbObj(hex)
  const rL = srgbToLinear(rgb.r)
  const gL = srgbToLinear(rgb.g)
  const bL = srgbToLinear(rgb.b)

  const out: SpectrumPoint[] = new Array(SPECTRUM_LEN)
  for (let i = 0; i < SPECTRUM_LEN; i++) {
    const wl = WL_START + i * WL_STEP
    const gB = Math.exp(-0.5 * Math.pow((wl - 450) / 52, 2))
    const gG = Math.exp(-0.5 * Math.pow((wl - 540) / 52, 2))
    const gR = Math.exp(-0.5 * Math.pow((wl - 635) / 68, 2))
    const sum = gB + gG + gR || 1
    const refl = (bL * gB + gL * gG + rL * gR) / sum
    const clampedPct = Math.max(1.5, Math.min(98.0, refl * 100))
    out[i] = { wavelength: wl, reflectance: clampedPct }
  }
  return out
}

export function resolveSubstrateSpectrum(
  substrateId: SubstratePresetId | 'custom',
  customHex: string,
  pigments: Pigment[]
): SpectrumPoint[] {
  if (substrateId === 'custom') {
    return hexToApproxSpectrum(customHex)
  }
  const preset = SUBSTRATE_PRESETS.find((p) => p.id === substrateId) || SUBSTRATE_PRESETS[0]
  for (let i = 0; i < preset.pigmentIds.length; i++) {
    const found = pigments.find((p) => p.id === preset.pigmentIds[i] && p.spectrum?.length)
    if (found?.spectrum) return found.spectrum
  }
  return hexToApproxSpectrum(preset.fallbackHex)
}

