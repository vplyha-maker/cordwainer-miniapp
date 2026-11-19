export type Scheme =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'rectangular'
  | 'split-complementary'
  | 'monochromatic'

export type ColorModelMode = 'ryb' | 'hsl'

export type FootwearMappingPreset =
  | 'classic'
  | 'toe-focus'
  | 'split-quarter'
  | 'neutral-sole'

export type SneakerColors = {
  vamp: string
  quarters: string
  tongue: string
  lining: string
  toeBox: string
  heel: string
  collar: string
  midsole: string
  encap: string
  outsole: string
  laces: string
  eyestays: string
  swoosh: string
}

export type SneakerZoneKey = keyof SneakerColors

export type ContrastLevel = 'soft' | 'optimal' | 'high'

export type HarmonyContrastResult = {
  maxContrast: number
  ratioText: string
  level: ContrastLevel
}

/**
 * Кратчайшая угловая дистанция на окружности 0..360° (AUDIT-10).
 * Исключает ложные срабатывания виброотклика при переходе через 359° <-> 0°.
 */
export function getCircularAngleDiff(angleA: number, angleB: number): number {
  return Math.abs(((((angleA - angleB) % 360) + 540) % 360) - 180)
}

/* ============================================================================
   1. COLOR ENGINE (КРУГ ИТТЕНА RYB <-> HSL, СМЕШИВАНИЕ ПИГМЕНТА, OKLAB КОНТРАСТ)
   ============================================================================ */

const RYB_TO_HSL_ANCHORS: readonly [number, number][] = [
  [0, 0],     // Красный (Red)
  [30, 15],   // Красно-оранжевый
  [60, 32],   // Оранжевый (Orange)
  [90, 46],   // Жёлто-оранжевый
  [120, 60],  // Жёлтый (Yellow)
  [150, 84],  // Жёлто-зелёный
  [180, 122], // Зелёный (Green — комплементарный к красному 0°)
  [210, 175], // Сине-зелёный
  [240, 218], // Синий (Blue — комплементарный к оранжевому 60°)
  [270, 252], // Сине-фиолетовый
  [300, 282], // Фиолетовый (Violet — комплементарный к жёлтому 120°)
  [330, 324], // Красно-фиолетовый
  [360, 360],
]

export function rybHueToRgbHue(rybHue: number): number {
  const norm = ((rybHue % 360) + 360) % 360
  for (let i = 0; i < RYB_TO_HSL_ANCHORS.length - 1; i++) {
    const [r0, h0] = RYB_TO_HSL_ANCHORS[i]
    const [r1, h1] = RYB_TO_HSL_ANCHORS[i + 1]
    if (norm >= r0 && norm <= r1) {
      const t = (norm - r0) / (r1 - r0 + 1e-9)
      return (h0 + t * (h1 - h0)) % 360
    }
  }
  return norm
}

function hslToRgb01(h: number, sPct: number, lPct: number): [number, number, number] {
  const hn = (((h % 360) + 360) % 360) / 360
  const s = Math.max(0, Math.min(1, sPct / 100))
  const l = Math.max(0, Math.min(1, lPct / 100))

  if (s === 0) return [l, l, l]

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    hue2rgb(p, q, hn + 1 / 3),
    hue2rgb(p, q, hn),
    hue2rgb(p, q, hn - 1 / 3),
  ]
}

function rgb01ToHex(r: number, g: number, b: number): string {
  const toByte = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * 255)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  return '#' + toByte(r) + toByte(g) + toByte(b)
}

function srgbChannelToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/**
 * Перцептивно согласованное смешивание базового пигмента
 * с белилами (Tint) и чёрным пигментом (Shade) по билинейной модели Пигмент–Белила–Сажа–Тон (AUDIT-03).
 */
export function synthesizePigmentHex(
  wheelHue: number,
  tintWhite: number,
  shadeBlack: number,
  chromaScale = 0.85,
  modelMode: ColorModelMode = 'ryb'
): string {
  const effectiveHue =
    modelMode === 'ryb' ? rybHueToRgbHue(wheelHue) : ((wheelHue % 360) + 360) % 360
  const w = Math.max(0, Math.min(1, tintWhite))
  const b = Math.max(0, Math.min(1, shadeBlack))
  const sat = Math.max(8, Math.min(96, chromaScale * 100))

  const [rP, gP, bP] = hslToRgb01(effectiveHue, sat, 50)

  const rW = 0.968 + 0.008 * rP
  const gW = 0.968 + 0.008 * gP
  const bW = 0.965 + 0.008 * bP

  const rK = 0.072 + 0.038 * rP
  const gK = 0.072 + 0.038 * gP
  const bK = 0.072 + 0.038 * bP

  const rG = 0.455 + 0.035 * rP
  const gG = 0.455 + 0.035 * gP
  const bG = 0.455 + 0.035 * bP

  const wP = (1 - w) * (1 - b)
  const wW = w * (1 - b)
  const wK = (1 - w) * b
  const wG = w * b

  const rOut = wP * rP + wW * rW + wK * rK + wG * rG
  const gOut = wP * gP + wW * gW + wK * gK + wG * gG
  const bOut = wP * bP + wW * bW + wK * bK + wG * bG

  return rgb01ToHex(rOut, gOut, bOut)
}

function parseHexToRgb01(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return [0.5, 0.5, 0.5]
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ]
}

export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = parseHexToRgb01(hex)
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  )
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const l1 = getRelativeLuminance(hexA)
  const l2 = getRelativeLuminance(hexB)
  const brightest = Math.max(l1, l2)
  const darkest = Math.min(l1, l2)
  return (brightest + 0.05) / (darkest + 0.05)
}

function hexToOklab(hex: string): [number, number, number] {
  const [sr, sg, sb] = parseHexToRgb01(hex)
  const r = srgbChannelToLinear(sr)
  const g = srgbChannelToLinear(sg)
  const b = srgbChannelToLinear(sb)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

export function getPerceptualPairContrast(hexA: string, hexB: string): number {
  const lumRatio = getContrastRatio(hexA, hexB)
  const [L1, a1, b1] = hexToOklab(hexA)
  const [L2, a2, b2] = hexToOklab(hexB)
  const deltaChroma = Math.hypot(a1 - a2, b1 - b2)
  const deltaLight = Math.abs(L1 - L2)
  const oklabEffectiveRatio = 1 + deltaChroma * 9.5 + deltaLight * 3.2
  return Math.max(lumRatio, oklabEffectiveRatio)
}

export function getSchemeWheelAngles(baseHue: number, scheme: Scheme): number[] {
  const h = ((baseHue % 360) + 360) % 360
  switch (scheme) {
    case 'monochromatic':
      return [h]
    case 'complementary':
      return [h, (h + 180) % 360]
    case 'analogous':
      return [h, (h + 30) % 360, (h + 330) % 360]
    case 'triadic':
      return [h, (h + 120) % 360, (h + 240) % 360]
    case 'split-complementary':
      return [h, (h + 150) % 360, (h + 210) % 360]
    case 'tetradic':
      return [h, (h + 90) % 360, (h + 180) % 360, (h + 270) % 360]
    case 'rectangular':
      return [h, (h + 60) % 360, (h + 180) % 360, (h + 240) % 360]
    default:
      return [h, (h + 180) % 360]
  }
}

export function generateHarmonyPalette(
  baseHue: number,
  tintWhite: number,
  shadeBlack: number,
  chromaScale: number,
  scheme: Scheme,
  modelMode: ColorModelMode
): string[] {
  const h = ((baseHue % 360) + 360) % 360
  const c = Math.max(0.15, Math.min(1, chromaScale))

  switch (scheme) {
    case 'monochromatic':
      return [
        synthesizePigmentHex(h, tintWhite, shadeBlack, c * 0.95, modelMode),
        synthesizePigmentHex(h, Math.min(1, tintWhite + 0.36), shadeBlack * 0.4, c * 0.65, modelMode),
        synthesizePigmentHex(h, tintWhite * 0.3, Math.min(1, shadeBlack + 0.42), c * 0.85, modelMode),
      ]
    case 'complementary':
      return [
        synthesizePigmentHex(h, tintWhite, shadeBlack, c, modelMode),
        synthesizePigmentHex(
          h,
          Math.min(1, tintWhite * 0.7 + 0.25),
          Math.min(1, shadeBlack * 0.7 + 0.15),
          c * 0.68,
          modelMode
        ),
        synthesizePigmentHex((h + 180) % 360, tintWhite * 0.42, shadeBlack * 0.42, Math.min(0.96, c * 1.06), modelMode),
      ]
    case 'analogous':
      return [
        synthesizePigmentHex(h, tintWhite, shadeBlack, c, modelMode),
        synthesizePigmentHex((h + 30) % 360, Math.min(1, tintWhite * 0.85 + 0.1), shadeBlack * 0.85, c * 0.88, modelMode),
        synthesizePigmentHex((h + 330) % 360, tintWhite * 0.48, shadeBlack * 0.48, Math.min(0.95, c * 1.04), modelMode),
      ]
    case 'triadic':
      return [
        synthesizePigmentHex(h, tintWhite, shadeBlack, c, modelMode),
        synthesizePigmentHex((h + 120) % 360, Math.min(1, tintWhite * 0.8 + 0.12), shadeBlack * 0.8, c * 0.84, modelMode),
        synthesizePigmentHex((h + 240) % 360, tintWhite * 0.45, shadeBlack * 0.45, Math.min(0.95, c * 1.04), modelMode),
      ]
    case 'split-complementary':
      return [
        synthesizePigmentHex(h, tintWhite, shadeBlack, c, modelMode),
        synthesizePigmentHex((h + 150) % 360, Math.min(1, tintWhite * 0.8 + 0.12), shadeBlack * 0.8, c * 0.86, modelMode),
        synthesizePigmentHex((h + 210) % 360, tintWhite * 0.45, shadeBlack * 0.45, Math.min(0.95, c * 1.04), modelMode),
      ]
    case 'tetradic':
      return [
        synthesizePigmentHex(h, tintWhite, shadeBlack, c, modelMode),
        synthesizePigmentHex((h + 90) % 360, Math.min(1, tintWhite * 0.8 + 0.1), shadeBlack * 0.8, c * 0.84, modelMode),
        synthesizePigmentHex((h + 180) % 360, Math.min(1, tintWhite * 0.75 + 0.15), shadeBlack * 0.75, c * 0.78, modelMode),
        synthesizePigmentHex((h + 270) % 360, tintWhite * 0.4, shadeBlack * 0.4, Math.min(0.96, c * 1.06), modelMode),
      ]
    case 'rectangular':
      return [
        synthesizePigmentHex(h, tintWhite, shadeBlack, c, modelMode),
        synthesizePigmentHex((h + 60) % 360, Math.min(1, tintWhite * 0.8 + 0.1), shadeBlack * 0.8, c * 0.86, modelMode),
        synthesizePigmentHex((h + 180) % 360, Math.min(1, tintWhite * 0.75 + 0.15), shadeBlack * 0.75, c * 0.80, modelMode),
        synthesizePigmentHex((h + 240) % 360, tintWhite * 0.4, shadeBlack * 0.4, Math.min(0.96, c * 1.06), modelMode),
      ]
  }
}

/* ============================================================================
   2. FOOTWEAR COLOR MAPPING (УТОЧНЁННАЯ МАТРИЦА CORDWAINE AEROSTRAP)
   ============================================================================ */

export function mapPaletteToFootwear(
  colors: string[],
  baseHue: number,
  tintWhite: number,
  shadeBlack: number,
  chromaScale: number,
  modelMode: ColorModelMode,
  preset: FootwearMappingPreset,
  isDark: boolean
): SneakerColors {
  const mainColor = colors[0]
  const secondaryColor = colors[1] ?? colors[0]
  const tertiaryColor =
    colors.length > 3
      ? colors[2]
      : synthesizePigmentHex(
          baseHue,
          tintWhite * 0.35,
          Math.min(1, shadeBlack + 0.45),
          chromaScale * 0.55,
          modelMode
        )
  const accentColor = colors[colors.length - 1] ?? mainColor

  const neutralMidsole = isDark ? '#2B2926' : '#FAF8F4'
  const neutralEncap = isDark ? '#3D3A36' : '#E5E0D6'
  const neutralLaces = isDark ? '#F4F0E8' : '#FFFFFF'
  const neutralOutsole = isDark ? '#181615' : '#2C2825'

  switch (preset) {
    case 'toe-focus':
      return {
        vamp: secondaryColor,
        heel: secondaryColor,
        toeBox: mainColor,
        quarters: secondaryColor,
        eyestays: mainColor,
        collar: tertiaryColor,
        tongue: mainColor,
        lining: tertiaryColor,
        swoosh: accentColor,
        midsole: neutralMidsole,
        encap: mainColor,
        outsole: neutralOutsole,
        laces: neutralLaces,
      }
    case 'split-quarter':
      return {
        vamp: mainColor,
        heel: mainColor,
        toeBox: secondaryColor,
        quarters: accentColor,
        eyestays: accentColor,
        collar: tertiaryColor,
        tongue: secondaryColor,
        lining: tertiaryColor,
        swoosh: mainColor,
        midsole: neutralMidsole,
        encap: secondaryColor,
        outsole: neutralOutsole,
        laces: neutralLaces,
      }
    case 'neutral-sole':
      return {
        vamp: mainColor,
        heel: mainColor,
        eyestays: secondaryColor,
        quarters: secondaryColor,
        toeBox: secondaryColor,
        tongue: secondaryColor,
        collar: tertiaryColor,
        lining: tertiaryColor,
        swoosh: accentColor,
        midsole: neutralMidsole,
        encap: neutralEncap,
        outsole: neutralOutsole,
        laces: neutralLaces,
      }
    case 'classic':
    default:
      return {
        vamp: mainColor,
        heel: mainColor,
        eyestays: secondaryColor,
        quarters: secondaryColor,
        toeBox: secondaryColor,
        tongue: secondaryColor,
        collar: tertiaryColor,
        lining: tertiaryColor,
        swoosh: accentColor,
        midsole: neutralMidsole,
        encap: accentColor,
        outsole: neutralOutsole,
        laces: neutralLaces,
      }
  }
}

export function evaluateHarmonyContrast(
  colors: string[],
  sneakerColors: SneakerColors
): HarmonyContrastResult {
  const pairScores: number[] = []
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      pairScores.push(getPerceptualPairContrast(colors[i], colors[j]))
    }
  }

  pairScores.push(getPerceptualPairContrast(sneakerColors.vamp, sneakerColors.toeBox))
  pairScores.push(getPerceptualPairContrast(sneakerColors.quarters, sneakerColors.swoosh))
  pairScores.push(getPerceptualPairContrast(sneakerColors.vamp, sneakerColors.quarters))
  pairScores.push(getPerceptualPairContrast(sneakerColors.heel, sneakerColors.collar))

  const maxContrast = Math.max(...pairScores, 1.0)
  const level: ContrastLevel =
    maxContrast < 1.55 ? 'soft' : maxContrast > 4.6 ? 'high' : 'optimal'

  return {
    maxContrast,
    ratioText: maxContrast.toFixed(1) + ':1',
    level,
  }
}
