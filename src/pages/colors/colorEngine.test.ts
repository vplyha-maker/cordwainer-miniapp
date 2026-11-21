import {
  evaluateHarmonyContrast,
  generateHarmonyPalette,
  getCircularAngleDiff,
  getContrastRatio,
  getPaletteSwatchAngleLabels,
  getPerceptualPairContrast,
  getRelativeLuminance,
  getSchemeWheelAngles,
  mapPaletteToFootwear,
  rybHueToRgbHue,
  synthesizePigmentHex,
  type FootwearMappingPreset,
  type Scheme,
} from './colorEngine'

export type ColorEngineTestReport = {
  passed: number
  failed: number
  failures: string[]
}

const HEX_RE = /^#[0-9A-F]{6}$/

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function assertClose(actual: number, expected: number, eps: number, label: string): void {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(label + ': expected ' + expected + ' +/- ' + eps + ', got ' + actual)
  }
}

export function runColorEngineTests(): ColorEngineTestReport {
  const cases: { name: string; run: () => void }[] = [
    {
      name: '1. getCircularAngleDiff: wrap-around 359° <-> 0°',
      run: () => {
        assertClose(getCircularAngleDiff(359, 0), 1, 1e-6, '359 vs 0')
        assertClose(getCircularAngleDiff(0, 359), 1, 1e-6, '0 vs 359')
        assertClose(getCircularAngleDiff(350, 10), 20, 1e-6, '350 vs 10')
      },
    },
    {
      name: '2. getCircularAngleDiff: противоположные и отрицательные углы',
      run: () => {
        assertClose(getCircularAngleDiff(0, 180), 180, 1e-6, '0 vs 180')
        assertClose(getCircularAngleDiff(-10, 10), 20, 1e-6, '-10 vs 10')
        assertClose(getCircularAngleDiff(720, 0), 0, 1e-6, '720 vs 0')
      },
    },
    {
      name: '3. rybHueToRgbHue: ключевые якоря круга Иттена',
      run: () => {
        assertClose(rybHueToRgbHue(0), 0, 1e-4, 'Red 0°')
        assertClose(rybHueToRgbHue(60), 32, 1e-4, 'Orange 60°')
        assertClose(rybHueToRgbHue(120), 60, 1e-4, 'Yellow 120°')
        assertClose(rybHueToRgbHue(180), 122, 1e-4, 'Green 180°')
        assertClose(rybHueToRgbHue(240), 218, 1e-4, 'Blue 240°')
        assertClose(rybHueToRgbHue(300), 282, 1e-4, 'Violet 300°')
      },
    },
    {
      name: '4. rybHueToRgbHue: нормализация 360° и отрицательных углов',
      run: () => {
        assertClose(rybHueToRgbHue(360), 0, 1e-4, '360° -> 0°')
        assertClose(rybHueToRgbHue(-60), rybHueToRgbHue(300), 1e-4, '-60° == 300°')
        assertClose(rybHueToRgbHue(540), rybHueToRgbHue(180), 1e-4, '540° == 180°')
      },
    },
    {
      name: '5. synthesizePigmentHex: формат #RRGGBB на крайних входах',
      run: () => {
        const samples = [
          synthesizePigmentHex(0, 0, 0, 0.85, 'ryb'),
          synthesizePigmentHex(360, 1, 0, 1, 'ryb'),
          synthesizePigmentHex(-45, 0, 1, 0.15, 'hsl'),
          synthesizePigmentHex(194, 2, -1, 5, 'ryb'),
        ]
        samples.forEach((hex) => assert(HEX_RE.test(hex), 'Invalid HEX: ' + hex))
      },
    },
    {
      name: '6. synthesizePigmentHex: белила (tint=1, shade=0) дают Y > 0.88',
      run: () => {
        for (const hue of [0, 60, 120, 180, 240, 300]) {
          const hex = synthesizePigmentHex(hue, 1, 0, 0.85, 'ryb')
          const lum = getRelativeLuminance(hex)
          assert(lum > 0.88, 'White luminance too low for hue ' + hue + ': ' + lum)
        }
      },
    },
    {
      name: '7. synthesizePigmentHex: сажа (tint=0, shade=1) даёт Y < 0.025',
      run: () => {
        for (const hue of [0, 60, 120, 180, 240, 300]) {
          const hex = synthesizePigmentHex(hue, 0, 1, 0.85, 'ryb')
          const lum = getRelativeLuminance(hex)
          assert(lum < 0.025, 'Black luminance too high for hue ' + hue + ': ' + lum)
        }
      },
    },
    {
      name: '8. synthesizePigmentHex: белила + сажа (1, 1) дают нейтральный средне-серый',
      run: () => {
        const hex = synthesizePigmentHex(194, 1, 1, 0.85, 'ryb')
        const lum = getRelativeLuminance(hex)
        assert(lum > 0.14 && lum < 0.28, 'Mid-gray luminance out of range: ' + lum)
      },
    },
    {
      name: '9. synthesizePigmentHex: RYB и HSL различаются для комплементарного красного (180°)',
      run: () => {
        const rybGreen = synthesizePigmentHex(180, 0, 0, 0.9, 'ryb')
        const hslCyan = synthesizePigmentHex(180, 0, 0, 0.9, 'hsl')
        assert(rybGreen !== hslCyan, 'RYB 180° (green) must differ from HSL 180° (cyan)')
      },
    },
    {
      name: '10. getRelativeLuminance & getContrastRatio: чистый чёрный и белый',
      run: () => {
        assertClose(getRelativeLuminance('#000000'), 0, 1e-6, 'Black Y')
        assertClose(getRelativeLuminance('#FFFFFF'), 1, 1e-6, 'White Y')
        assertClose(getContrastRatio('#000000', '#FFFFFF'), 21, 1e-4, 'WCAG 21:1')
        assertClose(getContrastRatio('#777777', '#777777'), 1, 1e-6, 'Same color 1:1')
      },
    },
    {
      name: '11. getPerceptualPairContrast: улавливает хроматический контраст равной яркости (OKLab)',
      run: () => {
        const wcag = getContrastRatio('#D9381E', '#1E824C')
        const perceptual = getPerceptualPairContrast('#D9381E', '#1E824C')
        assert(perceptual >= wcag, 'Perceptual contrast must be >= WCAG')
        assert(perceptual > 2.5, 'Red vs Green should have strong OKLab contrast: ' + perceptual)
      },
    },
    {
      name: '12. getSchemeWheelAngles & getPaletteSwatchAngleLabels: углы и подписи',
      run: () => {
        const expectedCounts: Record<Scheme, number> = {
          monochromatic: 1,
          complementary: 2,
          analogous: 3,
          triadic: 3,
          'split-complementary': 3,
          tetradic: 4,
          rectangular: 4,
        }
        ;(Object.keys(expectedCounts) as Scheme[]).forEach((scheme) => {
          const angles = getSchemeWheelAngles(355, scheme)
          assert(angles.length === expectedCounts[scheme], scheme + ' count mismatch')
          angles.forEach((a) => assert(a >= 0 && a < 360, 'Angle out of range: ' + a))
        })
        const compLabels = getPaletteSwatchAngleLabels(194, 'complementary')
        assert(compLabels[0] === '194°' && compLabels[1] === 'TONE' && compLabels[2] === '14°', 'comp labels')
      },
    },
    {
      name: '13. generateHarmonyPalette: 3 цвета для триад/комплементарной, 4 для тетрад',
      run: () => {
        const threeColorSchemes: Scheme[] = [
          'monochromatic',
          'complementary',
          'analogous',
          'triadic',
          'split-complementary',
        ]
        threeColorSchemes.forEach((s) => {
          const pal = generateHarmonyPalette(194, 0.05, 0.05, 0.85, s, 'ryb')
          assert(pal.length === 3, s + ' must return 3 colors')
          pal.forEach((hex) => assert(HEX_RE.test(hex), 'Bad HEX in ' + s))
        })

        const fourColorSchemes: Scheme[] = ['tetradic', 'rectangular']
        fourColorSchemes.forEach((s) => {
          const pal = generateHarmonyPalette(194, 0.05, 0.05, 0.85, s, 'ryb')
          assert(pal.length === 4, s + ' must return 4 colors')
          pal.forEach((hex) => assert(HEX_RE.test(hex), 'Bad HEX in ' + s))
        })
      },
    },
    {
      name: '14. generateHarmonyPalette: 0° и 360° дают идентичную палитру',
      run: () => {
        const p0 = generateHarmonyPalette(0, 0.1, 0.1, 0.8, 'triadic', 'ryb')
        const p360 = generateHarmonyPalette(360, 0.1, 0.1, 0.8, 'triadic', 'ryb')
        assert(JSON.stringify(p0) === JSON.stringify(p360), '0° and 360° must match')
      },
    },
    {
      name: '15. mapPaletteToFootwear: во всех 4 пресетах Верх + Пятка всегда 60% (mainColor)',
      run: () => {
        const presets: FootwearMappingPreset[] = [
          'classic',
          'toe-focus',
          'split-quarter',
          'neutral-sole',
        ]
        const pal = generateHarmonyPalette(194, 0.05, 0.05, 0.85, 'tetradic', 'ryb')
        presets.forEach((preset) => {
          const mapped = mapPaletteToFootwear(pal, 194, 0.05, 0.05, 0.85, 'ryb', preset, true)
          const keys = Object.keys(mapped) as (keyof typeof mapped)[]
          assert(keys.length === 13, 'Must map exactly 13 zones')
          assert(mapped.vamp === pal[0] && mapped.heel === pal[0], preset + ' must keep vamp/heel = main')
          keys.forEach((k) => assert(HEX_RE.test(mapped[k]), preset + '.' + k + ' invalid HEX'))
        })
      },
    },
    {
      name: '16. mapPaletteToFootwear: classic (60/30/10) держит протектор нейтральным, штрихи и Air — акцент',
      run: () => {
        const pal = ['#112233', '#445566', '#CC3311']
        const mapped = mapPaletteToFootwear(pal, 194, 0.05, 0.05, 0.85, 'ryb', 'classic', true)
        assert(mapped.vamp === '#112233' && mapped.heel === '#112233', 'classic vamp/heel')
        assert(mapped.quarters === '#445566' && mapped.eyestays === '#445566', 'classic 30%')
        assert(mapped.swoosh === '#CC3311' && mapped.encap === '#CC3311', 'classic accent')
        assert(mapped.outsole === '#181615', 'classic neutral outsole')
      },
    },
    {
      name: '17. mapPaletteToFootwear: toe-focus держит верх 60%, а мысок и штрихи — акцент 10%',
      run: () => {
        const pal = ['#112233', '#445566', '#CC3311']
        const mapped = mapPaletteToFootwear(pal, 194, 0.05, 0.05, 0.85, 'ryb', 'toe-focus', false)
        assert(mapped.vamp === '#112233' && mapped.heel === '#112233', 'toe-focus main upper')
        assert(mapped.toeBox === '#CC3311' && mapped.swoosh === '#CC3311', 'toe-focus accent toe/swoosh')
        assert(mapped.quarters === '#445566' && mapped.eyestays === '#445566', 'toe-focus 30%')
        assert(mapped.outsole === '#2C2825', 'toe-focus neutral outsole')
      },
    },
    {
      name: '18. mapPaletteToFootwear: пресет neutral-sole оставляет подошву и Air нейтральными',
      run: () => {
        const pal = ['#112233', '#445566', '#CC3311']
        const dark = mapPaletteToFootwear(pal, 194, 0.05, 0.05, 0.85, 'ryb', 'neutral-sole', true)
        const light = mapPaletteToFootwear(pal, 194, 0.05, 0.05, 0.85, 'ryb', 'neutral-sole', false)
        assert(dark.outsole === '#181615' && dark.encap === '#3D3A36', 'dark neutral sole')
        assert(light.outsole === '#2C2825' && light.encap === '#E5E0D6', 'light neutral sole')
        assert(dark.swoosh === '#CC3311', 'neutral-sole keeps accent on swoosh')
      },
    },
    {
      name: '19. mapPaletteToFootwear: тетрада передаёт colors[2] в collar и lining',
      run: () => {
        const pal = ['#112233', '#445566', '#778899', '#CC3311']
        const mapped = mapPaletteToFootwear(pal, 194, 0.05, 0.05, 0.85, 'ryb', 'classic', true)
        assert(mapped.collar === '#778899' && mapped.lining === '#778899', 'tetrad collar/lining')
      },
    },
    {
      name: '20. evaluateHarmonyContrast: корректные уровни soft / optimal / high',
      run: () => {
        const softPal = ['#808080', '#848484', '#888888']
        const softSneaker = mapPaletteToFootwear(softPal, 0, 0.5, 0.5, 0.15, 'hsl', 'classic', true)
        softSneaker.collar = '#828282'
        const softRes = evaluateHarmonyContrast(softPal, softSneaker)
        assert(softRes.level === 'soft', 'Expected soft, got ' + softRes.level)

        const highPal = ['#FFFFFF', '#111111', '#000000']
        const highSneaker = mapPaletteToFootwear(highPal, 0, 0, 0, 0.85, 'ryb', 'classic', true)
        const highRes = evaluateHarmonyContrast(highPal, highSneaker)
        assert(highRes.level === 'high', 'Expected high, got ' + highRes.level)
      },
    },
  ]

  const failures: string[] = []
  let passed = 0

  for (const testCase of cases) {
    try {
      testCase.run()
      passed += 1
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failures.push(testCase.name + ' -> ' + msg)
    }
  }

  return { passed, failed: failures.length, failures }
}
