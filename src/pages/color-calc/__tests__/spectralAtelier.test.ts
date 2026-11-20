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

export interface TestCaseResult {
  name: string
  passed: boolean
  error?: string
}

export interface SpectralTestReport {
  total: number
  passed: number
  failed: number
  results: TestCaseResult[]
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

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

const TEST_CASES: Array<{ name: string; run: () => void }> = [
  {
    name: '1. FORS spectrum parses into exact 81 CIE points (380–780 nm)',
    run: () => {
      const spec = parseSpectrum(BLUE_BICE_SAMPLE)
      assert(spec.length === SPECTRUM_LEN, `Expected ${SPECTRUM_LEN} points`)
      assert(isCieAligned(spec), 'Expected CIE aligned spectrum')
      assert(spec[0].wavelength === 380, 'Expected start 380 nm')
      assert(spec[SPECTRUM_LEN - 1].wavelength === 780, 'Expected end 780 nm')

      const summary = getSpectrumSummary(spec)
      assert(summary !== null, 'Expected non-null summary')
      assert(summary!.peakWl >= 445 && summary!.peakWl <= 465, 'Peak outside blue band')

      const rgb = spectrumToRGB(spec)
      assert(rgb.b > rgb.g && rgb.g > rgb.r, 'Expected blue channel dominance')
      assert(/^#[0-9a-f]{6}$/.test(rgbToHex(rgb)), 'Invalid HEX output')
    },
  },
  {
    name: '2. parseSpectrum handles unsorted lines, mixed delimiters, and empty input',
    run: () => {
      const spec = parseSpectrum('780; 20\n380, 10\n580 50\n')
      assert(spec.length === SPECTRUM_LEN, 'Expected 81 interpolated points')
      assert(Math.abs(spec[0].reflectance - 10) < 0.01, 'Start reflectance mismatch')
      assert(Math.abs(spec[40].reflectance - 50) < 0.01, 'Mid reflectance mismatch')
      assert(Math.abs(spec[80].reflectance - 20) < 0.01, 'End reflectance mismatch')
      assert(parseSpectrum('').length === 0, 'Empty input should yield []')
    },
  },
  {
    name: '3. Kubelka–Munk subtractive mixing: Yellow + Blue yields Green dominance',
    run: () => {
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
      assert(rgb.g > rgb.r && rgb.g > rgb.b, 'Expected green dominance')
    },
  },
  {
    name: '4. Volume scaling invariance (10x batch gives identical spectrum)',
    run: () => {
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
        assert(Math.abs(m1[i].reflectance - m2[i].reflectance) < 1e-6, 'Scaling drift')
      }
    },
  },
  {
    name: '5. Pure binder with zero color pigment returns empty spectrum',
    run: () => {
      const binder = makeFlatSpectrum(78)
      const mixed = mixSpectra([{ spectrum: binder, volume: 10, isBinder: true }])
      assert(mixed.length === 0, 'Expected empty spectrum for binder-only mix')
    },
  },
  {
    name: '6. Wet and dry modes keep reflectance strictly inside physical bounds (0..100%)',
    run: () => {
      const dark = makeFlatSpectrum(4)
      const dry = mixSpectra([{ spectrum: dark, volume: 10 }], false)
      const wet = mixSpectra([{ spectrum: dark, volume: 10 }], true)
      assert(dry.length === SPECTRUM_LEN && wet.length === SPECTRUM_LEN, 'Length mismatch')
      for (let i = 0; i < SPECTRUM_LEN; i++) {
        assert(dry[i].reflectance > 0 && dry[i].reflectance < 100, 'Dry reflectance OOB')
        assert(wet[i].reflectance > 0 && wet[i].reflectance < 100, 'Wet reflectance OOB')
      }
    },
  },
  {
    name: '7. Four Planck illuminants produce valid RGB and realistic metamerism shift',
    run: () => {
      const blue = parseSpectrum(BLUE_BICE_SAMPLE)
      const d65 = spectrumToRGBWithIlluminant(blue, 'D65')
      const warmA = spectrumToRGBWithIlluminant(blue, 'A')
      const cool = spectrumToRGBWithIlluminant(blue, 'cool')
      const twilight = spectrumToRGBWithIlluminant(blue, 'twilight')

      for (const rgb of [d65, warmA, cool, twilight]) {
        assert(rgb.r >= 0 && rgb.r <= 255, 'R out of range')
        assert(rgb.g >= 0 && rgb.g <= 255, 'G out of range')
        assert(rgb.b >= 0 && rgb.b <= 255, 'B out of range')
      }
      assert(
        warmA.r / Math.max(1, warmA.b) > twilight.r / Math.max(1, twilight.b),
        'Expected warmer R/B ratio under illuminant A vs twilight'
      )
    },
  },
  {
    name: '8. CIEDE2000 matches Sharma et al. (2005) reference benchmark Pair #1',
    run: () => {
      const de = calculateDeltaE2000(
        { L: 50.0, a: 2.6772, b: -79.7751 },
        { L: 50.0, a: 0.0, b: -82.7485 }
      )
      assert(Math.abs(de - 2.0425) < 0.005, `Expected ~2.0425, got ${de}`)
    },
  },
  {
    name: '9. CIEDE2000 satisfies identity, symmetry, and perceptual separation',
    run: () => {
      const c1 = rgbToLab(139, 69, 19)
      const c2 = rgbToLab(92, 26, 27)
      assert(calculateDeltaE2000(c1, c1) === 0, 'Identity failed')
      assert(
        Math.abs(calculateDeltaE2000(c1, c2) - calculateDeltaE2000(c2, c1)) < 1e-9,
        'Symmetry failed'
      )
      assert(
        calculateDeltaE2000(rgbToLab(220, 20, 20), rgbToLab(20, 180, 40)) > 50,
        'Opposite colors should have ΔE > 50'
      )
    },
  },
  {
    name: '10. simulateLayersKM converges monotonically to final and acrylic > aniline',
    run: () => {
      const base = makeFlatSpectrum(78)
      const paint = parseSpectrum(BLUE_BICE_SAMPLE)
      const acrylic = simulateLayersKM(base, paint, 'acrylic')
      const aniline = simulateLayersKM(base, paint, 'aniline')

      assert(acrylic.strength > aniline.strength, 'Acrylic should hide stronger than aniline')

      const labOf = (spec: SpectrumPoint[]) => {
        const rgb = spectrumToRGB(spec)
        return rgbToLab(rgb.r, rgb.g, rgb.b)
      }
      const baseLab = labOf(base)
      const finalLab = labOf(acrylic.final)

      const cov1 = calculateDeltaE2000(baseLab, labOf(acrylic.layer1))
      const cov2 = calculateDeltaE2000(baseLab, labOf(acrylic.layer2))
      const cov3 = calculateDeltaE2000(baseLab, labOf(acrylic.layer3))
      assert(cov1 > 0 && cov2 > cov1 && cov3 > cov2, 'Non-monotonic hiding from base')

      const d1 = calculateDeltaE2000(labOf(acrylic.layer1), finalLab)
      const d2 = calculateDeltaE2000(labOf(acrylic.layer2), finalLab)
      const d3 = calculateDeltaE2000(labOf(acrylic.layer3), finalLab)
      assert(d1 > d2 && d2 > d3 && d3 > 0, 'Non-monotonic convergence to final')
    },
  },
  {
    name: '11. findRecipeByHex recovers known mix (ΔE <= 2.0) and toggles binder by system',
    run: () => {
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
      assert(resAcrylic !== null, 'Expected acrylic recipe')
      assert(resAcrylic!.deltaE <= 2.0, `Expected ΔE <= 2.0, got ${resAcrylic!.deltaE}`)
      assert(resAcrylic!.recipe.some((r) => r.isBinder), 'Acrylic must include binder')
      assert(resAcrylic!.recipe.filter((r) => !r.isBinder).length <= 3, 'Exceeded maxComponents')

      const resAniline = findRecipeByHex(targetHex, pool, 3, 20, 'aniline', ['cardboard'])
      assert(resAniline !== null, 'Expected aniline recipe')
      assert(!resAniline!.recipe.some((r) => r.isBinder), 'Aniline must omit binder')
    },
  },
  {
    name: '12. SpectralChart reflectanceToKS is monotonic and finite on edge inputs',
    run: () => {
      const ksHighR = reflectanceToKS(85)
      const ksMidR = reflectanceToKS(40)
      const ksLowR = reflectanceToKS(5)
      assert(ksLowR > ksMidR && ksMidR > ksHighR && ksHighR > 0, 'K/S monotonicity failed')

      for (const edge of [-10, 0, 0.01, 100, 150]) {
        const v = reflectanceToKS(edge)
        assert(Number.isFinite(v) && v >= 0, `Invalid K/S for ${edge}`)
      }

      const spec = parseSpectrum(BLUE_BICE_SAMPLE)
      assert(sampleSeriesAtIndex(spec, -5)?.wavelength === 380, 'Lower clamp failed')
      assert(sampleSeriesAtIndex(spec, 999)?.wavelength === 780, 'Upper clamp failed')
      assert(sampleSeriesAtIndex([], 0) === null, 'Empty series should return null')
    },
  },
  {
    name: '13. Pigment categories and HEX parser work across RU / UK / DE',
    run: () => {
      assert(getPigmentCategory('phthalo_blue', 'ru') === 'Фталоцианины (синтетика)', 'RU category')
      assert(getPigmentCategory('phthalo_blue', 'uk') === 'Фталоціаніни (синтетика)', 'UK category')
      assert(getPigmentCategory('phthalo_blue', 'de') === 'Phthalocyanine (Synthetisch)', 'DE category')
      const rgb = hexToRgbObj('#8B4513')
      assert(rgb.r === 139 && rgb.g === 69 && rgb.b === 19, 'HEX parse mismatch')
    },
  },
]

export function runSpectralAtelierTests(): SpectralTestReport {
  const results: TestCaseResult[] = TEST_CASES.map((tc) => {
    try {
      tc.run()
      return { name: tc.name, passed: true }
    } catch (err) {
      return {
        name: tc.name,
        passed: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  })

  const passed = results.filter((r) => r.passed).length
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  }
}
