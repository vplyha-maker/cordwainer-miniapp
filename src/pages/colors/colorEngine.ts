export type Scheme =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'rectangular'
  | 'split-complementary'
  | 'monochromatic'

export type ColorModelMode = 'ryb' | 'oklch' | 'hsl'

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

export type OklchColor = {
  l: number
  c: number
  h: number
}

export type SolePresetId = 'white' | 'cream' | 'stone' | 'graphite' | 'black' | 'gum' | 'custom'

export type SolePreset = {
  id: Exclude<SolePresetId, 'custom'>
  midsole: string
  outsole: string
}

export type SoleColorConfig = {
  presetId: SolePresetId
  customHex: string
}

export const SOLE_PRESETS: readonly SolePreset[] = [
  { id: 'white', midsole: '#FAF8F4', outsole: '#2C2825' },
  { id: 'cream', midsole: '#EDE5D6', outsole: '#3A332C' },
  { id: 'stone', midsole: '#B8B3AA', outsole: '#2E2C2A' },
  { id: 'graphite', midsole: '#3A3836', outsole: '#1F1E1D' },
  { id: 'black', midsole: '#181615', outsole: '#111010' },
  { id: 'gum', midsole: '#C29563', outsole: '#8F6438' },
]

export const DEFAULT_SOLE_CONFIG: SoleColorConfig = {
  presetId: 'white',
  customHex: '#FAF8F4',
}

export function getCircularAngleDiff(angleA: number, angleB: number): number {
  return Math.abs(((((angleA - angleB) % 360) + 540) % 360) - 180)
}

const RYB_TO_HSL_ANCHORS: readonly [number, number][] = [
  [0, 0],
  [30, 15],
  [60, 32],
  [90, 46],
  [120, 60],
  [150, 84],
  [180, 122],
  [210, 175],
  [240, 218],
  [270, 252],
  [300, 282],
  [330, 324],
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

function linearToSrgbChannel(c: number): number {
  const clamped = Math.max(0, Math.min(1, c))
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
}

export function normalizeHex(input: string, fallback = '#FAF8F4'): string {
  const raw = input.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const expanded = raw
      .split('')
      .map((ch) => ch + ch)
      .join('')
      .toUpperCase()
    return '#' + expanded
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return '#' + raw.toUpperCase()
  }
  return fallback
}

function parseHexToRgb01(hex: string): [number, number, number] {
  const clean = normalizeHex(hex, '#808080').slice(1)
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ]
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

export function hexToOklch(hex: string): OklchColor {
  const [L, a, b] = hexToOklab(hex)
  const C = Math.hypot(a, b)
  let H = (Math.atan2(b, a) * 180) / Math.PI
  if (H < 0) H += 360
  return {
    l: Math.max(0, Math.min(1, L)),
    c: Math.max(0, C),
    h: C < 1e-4 ? 0 : H,
  }
}

function oklabToLinearRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

function isInLinearSrgbGamut(r: number, g: number, b: number): boolean {
  const eps = 1e-5
  return r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && b >= -eps && b <= 1 + eps
}

export function oklchToHex(l: number, c: number, h: number): string {
  const L = Math.max(0, Math.min(1, l))
  const C = Math.max(0, c)
  const rad = ((((h % 360) + 360) % 360) * Math.PI) / 180
  const cosH = Math.cos(rad)
  const sinH = Math.sin(rad)

  const [r0, g0, b0] = oklabToLinearRgb(L, C * cosH, C * sinH)
  if (isInLinearSrgbGamut(r0, g0, b0)) {
    return rgb01ToHex(
      linearToSrgbChannel(r0),
      linearToSrgbChannel(g0),
      linearToSrgbChannel(b0)
    )
  }

  let lo = 0
  let hi = C
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) * 0.5
    const [rm, gm, bm] = oklabToLinearRgb(L, mid * cosH, mid * sinH)
    if (isInLinearSrgbGamut(rm, gm, bm)) {
      lo = mid
    } else {
      hi = mid
    }
  }

  const [rf, gf, bf] = oklabToLinearRgb(L, lo * cosH, lo * sinH)
  return rgb01ToHex(
    linearToSrgbChannel(rf),
    linearToSrgbChannel(gf),
    linearToSrgbChannel(bf)
  )
}

export function formatOklch(hex: string): string {
  const { l, c, h } = hexToOklch(hex)
  return 'OKLCH ' + Math.round(l * 100) + '% · ' + c.toFixed(2) + ' · ' + Math.round(h) + '°'
}

export function synthesizePigmentHex(
  wheelHue: number,
  tintWhite: number,
  shadeBlack: number,
  chromaScale = 0.85,
  modelMode: ColorModelMode = 'ryb'
): string {
  const w = Math.max(0, Math.min(1, tintWhite))
  const b = Math.max(0, Math.min(1, shadeBlack))

  let rP: number
  let gP: number
  let bP: number

  if (modelMode === 'oklch') {
    const pureHex = oklchToHex(0.62, Math.max(0.02, Math.min(0.26, chromaScale * 0.24)), wheelHue)
    ;[rP, gP, bP] = parseHexToRgb01(pureHex)
  } else {
    const effectiveHue =
      modelMode === 'ryb' ? rybHueToRgbHue(wheelHue) : ((wheelHue % 360) + 360) % 360
    const sat = Math.max(8, Math.min(96, chromaScale * 100))
    ;[rP, gP, bP] = hslToRgb01(effectiveHue, sat, 50)
  }

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

  return rgb01ToHex(
    wP * rP + wW * rW + wK * rK + wG * rG,
    wP * gP + wW * gW + wK * gK + wG * gG,
    wP * bP + wW * bW + wK * bK + wG * bG
  )
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
        synthesizePigmentHex((h + 180) % 360, Math.min(1, tintWhite * 0.75 + 0.15), shadeBlack * 0.75, c * 0.8, modelMode),
        synthesizePigmentHex((h + 240) % 360, tintWhite * 0.4, shadeBlack * 0.4, Math.min(0.96, c * 1.06), modelMode),
      ]
  }
}

export function mapPaletteToFootwear(
  colors: string[],
  baseHue: number,
  tintWhite: number,
  shadeBlack: number,
  chromaScale: number,
  modelMode: ColorModelMode,
  preset: FootwearMappingPreset,
  _isDark = false
): SneakerColors {
  void _isDark
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

  const neutralMidsole = '#FAF8F4'
  const neutralEncap = '#E5E0D6'
  const neutralLaces = '#FFFFFF'
  const neutralOutsole = '#2C2825'

  switch (preset) {
    case 'toe-focus':
      return {
        vamp: mainColor,
        heel: mainColor,
        quarters: secondaryColor,
        eyestays: secondaryColor,
        tongue: secondaryColor,
        toeBox: accentColor,
        collar: tertiaryColor,
        lining: tertiaryColor,
        swoosh: accentColor,
        midsole: neutralMidsole,
        encap: secondaryColor,
        outsole: neutralOutsole,
        laces: neutralLaces,
      }
    case 'split-quarter':
      return {
        vamp: mainColor,
        heel: mainColor,
        toeBox: secondaryColor,
        tongue: secondaryColor,
        quarters: accentColor,
        eyestays: accentColor,
        collar: tertiaryColor,
        lining: colors.length > 3 ? tertiaryColor : mainColor,
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
        collar: colors.length > 3 ? colors[2] : tertiaryColor,
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
        collar: colors.length > 3 ? colors[2] : tertiaryColor,
        lining: tertiaryColor,
        swoosh: accentColor,
        midsole: neutralMidsole,
        encap: accentColor,
        outsole: neutralOutsole,
        laces: neutralLaces,
      }
  }
}

export function applySoleColorToFootwear(
  base: SneakerColors,
  sole: SoleColorConfig
): SneakerColors {
  if (sole.presetId === 'custom') {
    const custom = normalizeHex(sole.customHex, '#FAF8F4')
    const lum = getRelativeLuminance(custom)
    const outsole = lum < 0.08 ? '#111010' : lum > 0.65 ? '#2C2825' : custom
    return {
      ...base,
      midsole: custom,
      outsole,
    }
  }

  const found = SOLE_PRESETS.find((p) => p.id === sole.presetId) ?? SOLE_PRESETS[0]
  return {
    ...base,
    midsole: found.midsole,
    outsole: found.outsole,
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
