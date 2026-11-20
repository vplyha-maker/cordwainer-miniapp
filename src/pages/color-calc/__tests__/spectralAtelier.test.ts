import { describe, it, expect } from 'vitest'
import {
  SPECTRUM_LEN,
  WL_START,
  WL_STEP,
  parseSpectrum,
  isCieAligned,
  mixSpectra,
  spectrumToRGB,
  spectrumToRGBWithIlluminant,
  rgbToHex,
  type SpectrumPoint,
} from '../../../utils/colorScience'
import {
  rgbToLab,
  calculateDeltaE2000,
  hexToRgbObj,
  simulateLayersKM,
  findRecipeByHex,
  getPigmentCategory,
} from '../../../utils/calculatorLogic'
import type { Pigment } from '../../../data/pigments'
import {
  reflectanceToKS,
  getSpectrumSummary,
  sampleSeriesAtIndex,
} from '../SpectralChart'

function makeFlatSpectrum(refl: number): SpectrumPoint[] {
  return Array.from({ length: SPECTRUM_LEN }, (_, i) => ({
    wavelength: WL_START + i * WL_STEP,
    reflectance: refl,
  }))
}

function makeGaussianSpectrum(
  centerWl: number,
  sigma: number,
  peak: number,
  floor: number
): SpectrumPoint[] {
  return Array.from({ length: SPECTRUM_LEN }, (_, i) => {
    const wl = WL_START + i * WL_STEP
    const g = Math.exp(-0.5 * Math.pow((wl - centerWl) / sigma, 2))
    return { wavelength: wl, reflectance: floor + (peak - floor) * g }
  })
}

function makeStepSpectrum(cutoffWl: number, low: number, high: number): SpectrumPoint[] {
  return Array.from({ length: SPECTRUM_LEN }, (_, i) => {
    const wl = WL_START + i * WL_STEP
    const t = 1 / (1 + Math.exp(-(wl - cutoffWl) / 14))
    return { wavelength: wl, reflectance: low + (high - low) * t }
  })
}

// Эталонная выдержка реального FORS-спектра blue_bice.txt (380–780 нм)
const BLUE_BICE_SAMPLE = `
380.040 7.818
400.160 15.123
420.250 26.001
440.260 34.562
455.179 36.971
470.097 35.031
490.264 27.476
510.155 18.795
530.047 12.674
560.085 8.100
600.012 5.929
650.149 5.389
700.095 6.350
750.167 7.809
780.219 9.039
`

describe('Cordwaine Spectral Atelier — Colorimetry & Engine', () => {
  it('1. FORS spectrum parses into exact 81 CIE points (380–780 nm, step 5 nm)', () => {
    const spec = parseSpectrum(BLUE_BICE_SAMPLE)
    expect(spec).toHaveLength(SPECTRUM_LEN)
    expect(isCieAligned(spec)).toBe(true)
    expect(spec[0].wavelength).toBe(380)
    expect(spec[SPECTRUM_LEN - 1].wavelength).toBe(780)

    const summary = getSpectrumSummary(spec)
    expect(summary).not.toBeNull()
    expect(summary!.peakWl).toBeGreaterThanOrEqual(445)
    expect(summary!.peakWl).toBeLessThanOrEqual(465)

    const rgb = spectrumToRGB(spec)
    expect(rgb.b).toBeGreaterThan(rgb.g)
    expect(rgb.g).toBeGreaterThan(rgb.r)
    expect(rgbToHex(rgb)).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('2. parseSpectrum handles unsorted lines, mixed delimiters, and empty input', () => {
    const spec = parseSpectrum('780; 20\n380, 10\n580 50\n')
    expect(spec).toHaveLength(SPECTRUM_LEN)
    expect(spec[0].reflectance).toBeCloseTo(10, 2)
    expect(spec[40].reflectance).toBeCloseTo(50, 2)
    expect(spec[80].reflectance).toBeCloseTo(20, 2)
    expect(parseSpectrum('')).toEqual([])
  })

  it('3. Kubelka–Munk subtractive mixing: Yellow + Blue produces Green dominance', () => {
    const yellow = makeStepSpectrum(515, 3, 82)
    const blue = makeGaussianSpectrum(460, 48, 45, 3)
    const mixed = mixSpectra(
      [
        { spectrum: yellow, volume: 10 },
        { spectrum: blue, volume: 10 },
      ],
      false
    )
    const rgb = spectrumToRGB(mixed)
    expect(rgb.g).toBeGreaterThan(rgb.r)
    expect(rgb.g).toBeGreaterThan(rgb.b)
  })

  it('4. Volume scaling invariance (10x batch gives identical spectrum)', () => {
    const blue = parseSpectrum(BLUE_BICE_SAMPLE)
    const white = makeFlatSpectrum(92)
    const m1 = mixSpectra(
      [
        { spectrum: blue, volume: 3 },
        { spectrum: white, volume: 7 },
      ],
      false
    )
    const m2 = mixSpectra(
      [
        { spectrum: blue, volume: 30 },
        { spectrum: white, volume: 70 },
      ],
      false
    )
    for (let i = 0; i < SPECTRUM_LEN; i++) {
      expect(Math.abs(m1[i].reflectance - m2[i].reflectance)).toBeLessThan(1e-6)
    }
  })

  it('5. Pure binder with zero color pigment returns empty spectrum', () => {
    const binder = makeFlatSpectrum(78)
    expect(mixSpectra([{ spectrum: binder, volume: 10, isBinder: true }])).toEqual([])
  })

  it('6. Wet and dry modes keep reflectance strictly inside physical bounds (0..100%)', () => {
    const dark = makeFlatSpectrum(4)
    const dry = mixSpectra([{ spectrum: dark, volume: 10 }], false)
    const wet = mixSpectra([{ spectrum: dark, volume: 10 }], true)
    expect(dry).toHaveLength(SPECTRUM_LEN)
    expect(wet).toHaveLength(SPECTRUM_LEN)
    for (let i = 0; i < SPECTRUM_LEN; i++) {
      expect(dry[i].reflectance).toBeGreaterThan(0)
      expect(dry[i].reflectance).toBeLessThan(100)
      expect(wet[i].reflectance).toBeGreaterThan(0)
      expect(wet[i].reflectance).toBeLessThan(100)
    }
  })

  it('7. Four Planck illuminants produce valid RGB and realistic metamerism shift', () => {
    const blue = parseSpectrum(BLUE_BICE_SAMPLE)
    const d65 = spectrumToRGBWithIlluminant(blue, 'D65')
    const warmA = spectrumToRGBWithIlluminant(blue, 'A')
    const cool = spectrumToRGBWithIlluminant(blue, 'cool')
    const twilight = spectrumToRGBWithIlluminant(blue, 'twilight')

    for (const rgb of [d65, warmA, cool, twilight]) {
      expect(rgb.r).toBeGreaterThanOrEqual(0)
      expect(rgb.r).toBeLessThanOrEqual(255)
      expect(rgb.g).toBeGreaterThanOrEqual(0)
      expect(rgb.g).toBeLessThanOrEqual(255)
      expect(rgb.b).toBeGreaterThanOrEqual(0)
      expect(rgb.b).toBeLessThanOrEqual(255)
    }
    expect(warmA.r / Math.max(1, warmA.b)).toBeGreaterThan(
      twilight.r / Math.max(1, twilight.b)
    )
  })

  it('8. CIEDE2000 matches Sharma et al. (2005) reference benchmark Pair #1', () => {
    const de = calculateDeltaE2000(
      { L: 50.0, a: 2.6772, b: -79.7751 },
      { L: 50.0, a: 0.0, b: -82.7485 }
    )
    expect(Math.abs(de - 2.0425)).toBeLessThan(0.005)
  })

  it('9. CIEDE2000 satisfies identity, symmetry, and perceptual separation', () => {
    const c1 = rgbToLab(139, 69, 19)
    const c2 = rgbToLab(92, 26, 27)
    expect(calculateDeltaE2000(c1, c1)).toBe(0)
    expect(
      Math.abs(calculateDeltaE2000(c1, c2) - calculateDeltaE2000(c2, c1))
    ).toBeLessThan(1e-9)
    expect(
      calculateDeltaE2000(rgbToLab(220, 20, 20), rgbToLab(20, 180, 40))
    ).toBeGreaterThan(50)
  })

  it('10. simulateLayersKM converges monotonically to final and acrylic > aniline', () => {
    const base = makeFlatSpectrum(78)
    const paint = parseSpectrum(BLUE_BICE_SAMPLE)
    const acrylic = simulateLayersKM(base, paint, 'acrylic')
    const aniline = simulateLayersKM(base, paint, 'aniline')

    expect(acrylic.strength).toBeGreaterThan(aniline.strength)

    const labOf = (spec: SpectrumPoint[]) => {
      const rgb = spectrumToRGB(spec)
      return rgbToLab(rgb.r, rgb.g, rgb.b)
    }
    const baseLab = labOf(base)
    const finalLab = labOf(acrylic.final)

    const cov1 = calculateDeltaE2000(baseLab, labOf(acrylic.layer1))
    const cov2 = calculateDeltaE2000(baseLab, labOf(acrylic.layer2))
    const cov3 = calculateDeltaE2000(baseLab, labOf(acrylic.layer3))
    expect(cov1).toBeGreaterThan(0)
    expect(cov2).toBeGreaterThan(cov1)
    expect(cov3).toBeGreaterThan(cov2)

    const d1 = calculateDeltaE2000(labOf(acrylic.layer1), finalLab)
    const d2 = calculateDeltaE2000(labOf(acrylic.layer2), finalLab)
    const d3 = calculateDeltaE2000(labOf(acrylic.layer3), finalLab)
    expect(d1).toBeGreaterThan(d2)
    expect(d2).toBeGreaterThan(d3)
    expect(d3).toBeGreaterThan(0)
  })

  it('11. findRecipeByHex recovers known mix (ΔE ≤ 2.0) and toggles binder by system', () => {
    const pool: Pigment[] = [
      {
        id: 'titanium_white',
        name: { ru: 'Белый', uk: 'Білий', en: 'White', de: 'Weiß' },
        spectrum: makeFlatSpectrum(93),
      },
      {
        id: 'pbk_1_aniline_black',
        name: { ru: 'Чёрный', uk: 'Чорний', en: 'Black', de: 'Schwarz' },
        spectrum: makeFlatSpectrum(3),
      },
      {
        id: 'blue_bice',
        name: { ru: 'Голубая биса', uk: 'Блакитна біса', en: 'Blue Bice', de: 'Bergblau' },
        spectrum: parseSpectrum(BLUE_BICE_SAMPLE),
      },
      {
        id: 'yellow_ochre',
        name: { ru: 'Охра', uk: 'Вохра', en: 'Ochre', de: 'Ocker' },
        spectrum: makeStepSpectrum(530, 5, 65),
      },
      {
        id: 'acrylic_binder',
        name: { ru: 'Биндер', uk: 'Біндер', en: 'Binder', de: 'Binder' },
        spectrum: makeFlatSpectrum(78),
      },
    ]

    const synth = mixSpectra(
      [
        { spectrum: pool[2].spectrum!, volume: 12 },
        { spectrum: pool[0].spectrum!, volume: 8 },
      ],
      false
    )
    const targetHex = rgbToHex(spectrumToRGB(synth))

    const resAcrylic = findRecipeByHex(targetHex, pool, 3, 20, 'acrylic', ['cardboard'])
    expect(resAcrylic).not.toBeNull()
    expect(resAcrylic!.deltaE).toBeLessThanOrEqual(2.0)
    expect(resAcrylic!.recipe.some((r) => r.isBinder)).toBe(true)
    expect(resAcrylic!.recipe.filter((r) => !r.isBinder).length).toBeLessThanOrEqual(3)

    const resAniline = findRecipeByHex(targetHex, pool, 3, 20, 'aniline', ['cardboard'])
    expect(resAniline).not.toBeNull()
    expect(resAniline!.recipe.some((r) => r.isBinder)).toBe(false)
  })

  it('12. SpectralChart reflectanceToKS is strictly monotonic and finite on edge inputs', () => {
    const ksHighR = reflectanceToKS(85)
    const ksMidR = reflectanceToKS(40)
    const ksLowR = reflectanceToKS(5)
    expect(ksLowR).toBeGreaterThan(ksMidR)
    expect(ksMidR).toBeGreaterThan(ksHighR)
    expect(ksHighR).toBeGreaterThan(0)

    for (const edge of [-10, 0, 0.01, 100, 150]) {
      const v = reflectanceToKS(edge)
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
    }

    const spec = parseSpectrum(BLUE_BICE_SAMPLE)
    expect(sampleSeriesAtIndex(spec, -5)?.wavelength).toBe(380)
    expect(sampleSeriesAtIndex(spec, 999)?.wavelength).toBe(780)
    expect(sampleSeriesAtIndex([], 0)).toBeNull()
  })

  it('13. Pigment categories and HEX parser work across RU / UK / DE', () => {
    expect(getPigmentCategory('phthalo_blue', 'ru')).toBe('Фталоцианины (синтетика)')
    expect(getPigmentCategory('phthalo_blue', 'uk')).toBe('Фталоціаніни (синтетика)')
    expect(getPigmentCategory('phthalo_blue', 'de')).toBe('Phthalocyanine (Synthetisch)')
    expect(hexToRgbObj('#8B4513')).toEqual({ r: 139, g: 69, b: 19 })
  })
})

