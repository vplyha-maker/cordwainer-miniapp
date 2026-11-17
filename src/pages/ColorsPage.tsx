import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type * as THREE_TYPES from 'three'
import type { Lang as AppLang } from '../App'

type ThreeLib = typeof THREE_TYPES

// Рыночная стоимость разовой разблокировки PRO-модуля в Telegram Stars (~$4.99)
export const PRO_COLORS_PRICE_STARS = 250

// Строгий список поддерживаемых языков компонента с защитой от неизвестных значений из App.tsx (AUDIT-02)
export type SupportedLang = 'ru' | 'uk' | 'de'

const APP_NATIVE_LANGS: readonly ('ru' | 'uk')[] = ['ru', 'uk']

export function normalizeSupportedLang(input: unknown): SupportedLang {
  if (input === 'ru' || input === 'uk' || input === 'de') return input
  return 'ru'
}

export function isAppNativeLang(input: SupportedLang): input is AppLang & ('ru' | 'uk') {
  return APP_NATIVE_LANGS.includes(input as 'ru' | 'uk')
}

type ColorsPageProps = {
  onBack: () => void
  lang: AppLang
  setLang: (lang: AppLang) => void
}

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

export type PaymentState =
  | 'idle'
  | 'creating_invoice'
  | 'invoice_open'
  | 'verifying_payment'
  | 'purchased'
  | 'failed'

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

type TelegramWebApp = {
  initData?: string
  initDataUnsafe?: { user?: { id?: number } }
  HapticFeedback?: { impactOccurred: (style: string) => void }
  openInvoice?: (link: string, cb: (status: string) => void) => void
}

function getTelegramWebApp(): TelegramWebApp | undefined {
  try {
    return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp
  } catch {
    return undefined
  }
}

function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    const tg = getTelegramWebApp()
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
  } catch {}
}

/**
 * Кратчайшая угловая дистанция на окружности 0..360° (AUDIT-10).
 * Исключает ложные срабатывания виброотклика при переходе через 359° <-> 0°.
 */
export function getCircularAngleDiff(angleA: number, angleB: number): number {
  return Math.abs(((((angleA - angleB) % 360) + 540) % 360) - 180)
}

const LockIcon = ({ size = 10 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mb-[1px]"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0110 0v4"></path>
  </svg>
)

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
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`
}

function srgbChannelToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/**
 * ИСПРАВЛЕНО (AUDIT-03): Перцептивно согласованное смешивание базового пигмента
 * с белилами (Tint) и чёрным пигментом (Shade) по билинейной модели Пигмент–Белила–Сажа–Тон.
 * - При shadeBlack = 1.0, tintWhite = 0: даёт глубокий угольно-чёрный цвет кожи (Y < 0.015 < 0.025).
 * - При tintWhite = 1.0, shadeBlack = 0: даёт чистый снежно-белый цвет (Y > 0.92 > 0.88).
 * - При tintWhite = 1.0, shadeBlack = 1.0: даёт сбалансированный нейтральный средне-серый тон.
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

  // 1. Чистый пигмент (w = 0, b = 0)
  const [rP, gP, bP] = hslToRgb01(effectiveHue, sat, 50)

  // 2. Белила (w = 1, b = 0) -> Y ≈ 0.935 (> 0.88)
  const rW = 0.968 + 0.008 * rP
  const gW = 0.968 + 0.008 * gP
  const bW = 0.965 + 0.008 * bP

  // 3. Глубокий обувной чёрный/графит (w = 0, b = 1) -> Y ≈ 0.009 (< 0.025)
  const rK = 0.072 + 0.038 * rP
  const gK = 0.072 + 0.038 * gP
  const bK = 0.072 + 0.038 * bP

  // 4. Нейтральный средне-серый тон при одновременном максимуме белил и сажи (w = 1, b = 1)
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

/**
 * Перевод HEX в перцептивное пространство OKLab для оценки хроматического контраста (AUDIT-08).
 */
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

/**
 * ИСПРАВЛЕНО (AUDIT-08): Комплексная оценка контраста пары цветов, объединяющая
 * яркостный контраст WCAG (ΔL) и хроматическое различие в пространстве OKLab (ΔE).
 */
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
   2. FOOTWEAR COLOR MAPPING (РАСПРЕДЕЛЕНИЕ ЦВЕТОВ И СИНХРОННЫЕ ПОДПИСИ СВОТЧЕЙ)
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
        toeBox: mainColor,
        quarters: secondaryColor,
        eyestays: mainColor,
        heel: accentColor,
        collar: tertiaryColor,
        tongue: mainColor,
        lining: tertiaryColor,
        swoosh: accentColor,
        midsole: neutralMidsole,
        encap: mainColor,
        outsole: accentColor,
        laces: neutralLaces,
      }
    case 'split-quarter':
      return {
        vamp: mainColor,
        toeBox: secondaryColor,
        quarters: accentColor,
        eyestays: secondaryColor,
        heel: mainColor,
        collar: tertiaryColor,
        tongue: secondaryColor,
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
        eyestays: mainColor,
        quarters: secondaryColor,
        toeBox: secondaryColor,
        tongue: secondaryColor,
        collar: colors.length > 3 ? colors[2] : secondaryColor,
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
        eyestays: mainColor,
        quarters: secondaryColor,
        toeBox: secondaryColor,
        tongue: secondaryColor,
        collar: colors.length > 3 ? colors[2] : secondaryColor,
        lining: tertiaryColor,
        swoosh: accentColor,
        midsole: neutralMidsole,
        encap: neutralEncap,
        outsole: accentColor,
        laces: neutralLaces,
      }
  }
}

/* ============================================================================
   3. 3D-ГЕОМЕТРИЯ И МАТЕРИАЛЫ NEW BALANCE 574 (AUDIT-04, AUDIT-06, AUDIT-07, AUDIT-09)
   ============================================================================ */

type SneakerMaterials = {
  vamp: THREE_TYPES.MeshStandardMaterial
  quarters: THREE_TYPES.MeshStandardMaterial
  tongue: THREE_TYPES.MeshStandardMaterial
  lining: THREE_TYPES.MeshStandardMaterial
  toeBox: THREE_TYPES.MeshStandardMaterial
  heel: THREE_TYPES.MeshStandardMaterial
  collar: THREE_TYPES.MeshStandardMaterial
  midsole: THREE_TYPES.MeshStandardMaterial
  encap: THREE_TYPES.MeshStandardMaterial
  outsole: THREE_TYPES.MeshStandardMaterial
  laces: THREE_TYPES.MeshStandardMaterial
  eyestays: THREE_TYPES.MeshStandardMaterial
  swoosh: THREE_TYPES.MeshStandardMaterial
}

const GLB_EXPLICIT_ZONE_MAP: Record<string, SneakerZoneKey> = {
  upper_vamp: 'vamp',
  vamp: 'vamp',
  mudguard: 'vamp',
  toe_mesh: 'toeBox',
  toe_box: 'toeBox',
  toebox: 'toeBox',
  quarter_left: 'quarters',
  quarter_right: 'quarters',
  quarters: 'quarters',
  saddle: 'quarters',
  eyestay: 'eyestays',
  eyestays: 'eyestays',
  eye_stay: 'eyestays',
  heel_counter: 'heel',
  heelcounter: 'heel',
  heel_wrap: 'heel',
  swoosh: 'swoosh',
  heel_lining: 'lining',
  collar_lining: 'lining',
  collar: 'collar',
  ankle_collar: 'collar',
  tongue: 'tongue',
  tongue_mesh: 'tongue',
  lining: 'lining',
  sockliner: 'lining',
  insole: 'lining',
  lace_set: 'laces',
  laces: 'laces',
  n_logo: 'swoosh',
  logo_n: 'swoosh',
  heel_tab: 'swoosh',
  backtab: 'swoosh',
  encap: 'encap',
  encap_rim: 'encap',
  heel_clip: 'encap',
  midsole: 'midsole',
  mid_sole: 'midsole',
  eva_midsole: 'midsole',
  outsole: 'outsole',
  out_sole: 'outsole',
  rubber_outsole: 'outsole',
}

/**
 * ИСПРАВЛЕНО (AUDIT-09): Приоритетный порядок проверки специфичных подстрок
 * (lining и mid_sole проверяются раньше общих heel, collar и sole).
 */
export function resolveGlbZone(rawName: string): SneakerZoneKey | null {
  const normalized = rawName.trim().toLowerCase().replace(/[\s.-]+/g, '_')
  if (!normalized) return null
  if (GLB_EXPLICIT_ZONE_MAP[normalized]) {
    return GLB_EXPLICIT_ZONE_MAP[normalized]
  }
  if (
    normalized.includes('lining') ||
    normalized.includes('insole') ||
    normalized.includes('sockliner')
  ) {
    return 'lining'
  }
  if (
    normalized.includes('heel_tab') ||
    normalized.includes('backtab') ||
    normalized.includes('swoosh') ||
    normalized.includes('logo') ||
    normalized.includes('tab')
  ) {
    return 'swoosh'
  }
  if (normalized.includes('encap') || normalized.includes('clip')) return 'encap'
  if (
    normalized.includes('midsole') ||
    normalized.includes('mid_sole') ||
    normalized.includes('eva')
  ) {
    return 'midsole'
  }
  if (
    normalized.includes('outsole') ||
    normalized.includes('out_sole') ||
    normalized.includes('tread')
  ) {
    return 'outsole'
  }
  if (normalized.includes('eyestay') || normalized.includes('eye_stay')) return 'eyestays'
  if (normalized.includes('toe')) return 'toeBox'
  if (normalized.includes('vamp') || normalized.includes('mudguard')) return 'vamp'
  if (normalized.includes('quarter') || normalized.includes('saddle')) return 'quarters'
  if (normalized.includes('collar')) return 'collar'
  if (normalized.includes('tongue')) return 'tongue'
  if (normalized.includes('lace')) return 'laces'
  if (normalized.includes('heel')) return 'heel'
  if (normalized.includes('sole')) return 'outsole'
  return null
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 + 1e-9)))
  return t * t * (3 - 2 * t)
}

function wrapAnglePi(phi: number): number {
  return Math.atan2(Math.sin(phi), Math.cos(phi))
}

/**
 * ИСПРАВЛЕНО (AUDIT-07): C^1-гладкая параметризация контура следа без бесконечной
 * производной в полюсах мыска (phi = 0) и пятки (phi = ±pi).
 */
export function getFootprintPoint(rawPhi: number) {
  const phi = wrapAnglePi(rawPhi)
  const zNorm = Math.cos(phi)
  const z = 1.34 * zNorm
  const t = 0.5 * (zNorm + 1.0)

  const s = Math.sin(phi)
  // C^infty-гладкая регуляризация вместо негладкого sign(s)*|s|^0.68
  const eps2 = 0.045
  const roundEnv = (s / Math.pow(s * s + eps2, 0.16)) * Math.pow(1 + eps2, 0.16)

  const wBase =
    0.405 -
    0.045 * Math.exp(-Math.pow((t - 0.36) / 0.15, 2)) +
    0.115 * Math.exp(-Math.pow((t - 0.66) / 0.21, 2)) -
    0.025 * Math.exp(-Math.pow((t - 0.96) / 0.07, 2))

  // Гладкий переход асимметрии через s вместо разрывного s >= 0
  const latWeight = 0.5 * (1 + s / Math.sqrt(s * s + 0.02))
  const asymPos =
    -0.035 * Math.exp(-Math.pow((t - 0.38) / 0.14, 2)) +
    0.018 * Math.exp(-Math.pow((t - 0.70) / 0.16, 2))
  const asymNeg = 0.028 * Math.exp(-Math.pow((t - 0.58) / 0.20, 2))
  const asym = latWeight * asymPos + (1 - latWeight) * asymNeg

  const centerX =
    0.025 * Math.exp(-Math.pow((t - 0.70) / 0.25, 2)) -
    0.014 * Math.exp(-Math.pow((t - 0.36) / 0.18, 2))

  const x = centerX + roundEnv * (wBase + asym)
  return { x, z, t }
}

/**
 * ИСПРАВЛЕНО (AUDIT-07): Приведение угла phi к [-pi, pi] и C^1-гладкое замыкание
 * верхнего канта горловины на центральном шве пятки (phi = ±pi).
 */
export function getToplineRim(rawPhi: number) {
  const phi = wrapAnglePi(rawPhi)
  const s = Math.sin(phi)
  // Гладкий модуль угла a и гладкий знак
  const a = Math.acos(Math.max(-1, Math.min(1, Math.cos(phi))))

  const u1 = Math.max(0, Math.min(1, a / 0.35))
  const ue = Math.max(0, Math.min(1, (a - 0.35) / (1.48 - 0.35)))
  const uc = Math.max(0, Math.min(1, (a - 1.48) / (Math.PI - 1.48)))

  const zSeg1 = 0.44 - 0.03 * (u1 * u1)
  const zSeg2 = 0.41 - 0.63 * ue
  const zSeg3 = -0.22 - 0.98 * Math.sin(uc * (Math.PI * 0.5))

  const w12 = smoothstep(0.28, 0.42, a)
  const w23 = smoothstep(1.40, 1.56, a)
  const zRim = (1 - w12) * zSeg1 + w12 * ((1 - w23) * zSeg2 + w23 * zSeg3)

  const xSeg1 = 0.13 * Math.sin(u1 * (Math.PI * 0.5))
  const xSeg2 = 0.13 + 0.05 * ue
  // Гладкое обращение ширины канта в 0 на заднем шве (uc -> 1) с конечной производной
  const cosUc = Math.cos(uc * (Math.PI * 0.5))
  const smoothTapering = (cosUc / Math.pow(cosUc * cosUc + 0.04, 0.15)) * Math.pow(1.04, 0.15)
  const xSeg3 = (0.18 + 0.12 * Math.sin(uc * Math.PI)) * smoothTapering

  const xAbs = (1 - w12) * xSeg1 + w12 * ((1 - w23) * xSeg2 + w23 * xSeg3)
  const signSmooth = s / Math.sqrt(s * s + 1e-5)
  const xRim = signSmooth * xAbs

  const ySeg1 = 0.22
  const ySeg2 = 0.22 + 0.44 * Math.pow(ue + 1e-4, 0.92)
  const ySeg3 = 0.66 * (1 - uc) + 0.62 * uc - 0.21 * Math.pow(Math.sin(uc * Math.PI) + 1e-4, 1.15)
  const yRim = (1 - w12) * ySeg1 + w12 * ((1 - w23) * ySeg2 + w23 * ySeg3)

  return { x: xRim, y: yRim, z: zRim }
}

/**
 * Продольный профиль подошвы с идеально горизонтальной опорной плоскостью
 * на участке пятка–пучки t in [0.12, 0.62] (AUDIT-06).
 */
export function getSoleVerticalProfile(t: number) {
  const toeSpring = Math.pow(Math.max(0, (t - 0.62) / 0.38), 1.75) * 0.11
  const heelBevel = Math.pow(1 - smoothstep(0.0, 0.12, t), 2) * 0.012
  const heelLift = (1 - t) * 0.06
  // Верхняя грань межподошвы (затяжная кромка верха) имеет положительный подъём к пятке
  const yTopBase = -0.14 + heelLift + toeSpring
  // Нижняя грань межподошвы и базовая плоскость протектора строго горизонтальны на t in [0.12, 0.62]
  const yMidBot = -0.268 + heelBevel + toeSpring
  const yOutBotBase = -0.320 + heelBevel + toeSpring
  const midThick = yTopBase - yMidBot
  return { yTopBase, yMidBot, yOutBotBase, midThick, toeSpring }
}

function evalBaseLastSurface(rawPhi: number, v: number): readonly [number, number, number] {
  const phi = wrapAnglePi(rawPhi)
  const fp = getFootprintPoint(phi)
  const rim = getToplineRim(phi)
  const { yTopBase: y0 } = getSoleVerticalProfile(fp.t)

  const a = Math.acos(Math.max(-1, Math.min(1, Math.cos(phi))))
  const toeWeight = 1 - smoothstep(0.35, 0.92, a)
  const heelWeight = smoothstep(2.0, Math.PI, a)

  const vClamped = Math.max(0, Math.min(1, v))
  const uSide = 1 - Math.pow(1 - vClamped, 1.35)

  const uToe =
    vClamped < 0.34
      ? 0.12 * Math.pow(vClamped / 0.34, 1.45)
      : 0.12 + 0.88 * Math.pow((vClamped - 0.34) / 0.66, 1.02)

  const uH = (1 - toeWeight) * uSide + toeWeight * uToe
  const heelBulbZ = -0.048 * Math.sin(vClamped * Math.PI) * heelWeight

  const x = (1 - uH) * fp.x + uH * rim.x
  const z = (1 - uH) * fp.z + uH * rim.z + heelBulbZ

  const ySide = y0 + (rim.y - y0) * Math.pow(vClamped, 0.82) + 0.038 * Math.sin(vClamped * Math.PI)
  const yNoseTop = y0 + 0.19
  const yToe =
    vClamped < 0.34
      ? y0 + (yNoseTop - y0) * Math.sin((vClamped / 0.34) * (Math.PI * 0.5))
      : yNoseTop +
        (rim.y - yNoseTop) * ((vClamped - 0.34) / 0.66) +
        0.015 * Math.sin(((vClamped - 0.34) / 0.66) * Math.PI)

  const y = (1 - toeWeight) * ySide + toeWeight * yToe
  return [x, y, z] as const
}

export function sampleUpperSurfaceWithNormal(
  phi: number,
  v: number,
  normalOffset = 0
): { pos: readonly [number, number, number]; normal: readonly [number, number, number] } {
  const [x, y, z] = evalBaseLastSurface(phi, v)

  const epsPhi = 0.012
  const epsV = 0.012
  const [xP1, yP1, zP1] = evalBaseLastSurface(phi + epsPhi, v)
  const [xP0, yP0, zP0] = evalBaseLastSurface(phi - epsPhi, v)
  const vHi = Math.min(1, v + epsV)
  const vLo = Math.max(0, v - epsV)
  const [xV1, yV1, zV1] = evalBaseLastSurface(phi, vHi)
  const [xV0, yV0, zV0] = evalBaseLastSurface(phi, vLo)

  const tx = xP1 - xP0
  const ty = yP1 - yP0
  const tz = zP1 - zP0

  const bx = xV1 - xV0
  const by = yV1 - yV0
  const bz = zV1 - zV0

  let nx = ty * bz - tz * by
  let ny = tz * bx - tx * bz
  let nz = tx * by - ty * bx

  const outX = x
  const outY = Math.max(0.15, y - 0.02)
  const outZ = z - -0.25
  if (nx * outX + ny * outY + nz * outZ < 0) {
    nx = -nx
    ny = -ny
    nz = -nz
  }

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) + 1e-7
  const unx = nx / len
  const uny = ny / len
  const unz = nz / len

  return {
    pos: [
      x + normalOffset * unx,
      y + normalOffset * uny,
      z + normalOffset * unz,
    ] as const,
    normal: [unx, uny, unz] as const,
  }
}

export function sampleUpperSurface(
  phi: number,
  v: number,
  normalOffset = 0
): readonly [number, number, number] {
  return sampleUpperSurfaceWithNormal(phi, v, normalOffset).pos
}

function buildPanelPatch(
  THREE: ThreeLib,
  options: {
    phiStart: number
    phiEnd: number
    phiSteps: number
    vStart: number
    vEnd: number
    vSteps: number
    layerTier: number
    thickness?: number
    bevelU?: number
    bevelV?: number
    seamInset?: number
  }
): THREE_TYPES.BufferGeometry {
  const {
    phiStart,
    phiEnd,
    phiSteps,
    vStart,
    vEnd,
    vSteps,
    layerTier,
    thickness = 0.011,
    bevelU = 0.08,
    bevelV = 0.09,
    seamInset = 0.008,
  } = options

  const p0 = phiStart + (phiEnd - phiStart) * seamInset
  const p1 = phiEnd - (phiEnd - phiStart) * seamInset
  const v0 = vStart + (vEnd - vStart) * seamInset
  const v1 = vEnd - (vEnd - vStart) * seamInset

  const baseElevation = layerTier * 0.0095
  const outerOffset = baseElevation + thickness
  const innerOffset = baseElevation

  const positions: number[] = []
  const indices: number[] = []
  const stride = vSteps + 1

  for (let i = 0; i <= phiSteps; i++) {
    const u = i / phiSteps
    const phi = p0 + u * (p1 - p0)
    const envU = smoothstep(0, bevelU, u) * smoothstep(1, 1 - bevelU, u)
    for (let j = 0; j <= vSteps; j++) {
      const w = j / vSteps
      const v = v0 + w * (v1 - v0)
      const envV = smoothstep(0, bevelV, w) * smoothstep(1, 1 - bevelV, w)
      const effOffset = innerOffset + (outerOffset - innerOffset) * (0.28 + 0.72 * envU * envV)
      const [x, y, z] = sampleUpperSurface(phi, v, effOffset)
      positions.push(x, y, z)
    }
  }

  const innerBase = (phiSteps + 1) * stride
  for (let i = 0; i <= phiSteps; i++) {
    const phi = p0 + (i / phiSteps) * (p1 - p0)
    for (let j = 0; j <= vSteps; j++) {
      const v = v0 + (j / vSteps) * (v1 - v0)
      const [x, y, z] = sampleUpperSurface(phi, v, innerOffset)
      positions.push(x, y, z)
    }
  }

  for (let i = 0; i < phiSteps; i++) {
    for (let j = 0; j < vSteps; j++) {
      const a = i * stride + j
      const b = (i + 1) * stride + j
      const c = (i + 1) * stride + (j + 1)
      const d = i * stride + (j + 1)
      indices.push(a, d, b, b, d, c)

      const ai = innerBase + a
      const bi = innerBase + b
      const ci = innerBase + c
      const di = innerBase + d
      indices.push(ai, bi, di, bi, ci, di)
    }
  }

  for (let i = 0; i < phiSteps; i++) {
    const a0 = i * stride
    const b0 = (i + 1) * stride
    indices.push(a0, b0, innerBase + a0, b0, innerBase + b0, innerBase + a0)

    const a1 = i * stride + vSteps
    const b1 = (i + 1) * stride + vSteps
    indices.push(a1, innerBase + a1, b1, b1, innerBase + a1, innerBase + b1)
  }

  for (let j = 0; j < vSteps; j++) {
    const a0 = j
    const d0 = j + 1
    indices.push(a0, innerBase + a0, d0, d0, innerBase + a0, innerBase + d0)

    const a1 = phiSteps * stride + j
    const d1 = phiSteps * stride + j + 1
    indices.push(a1, d1, innerBase + a1, d1, innerBase + d1, innerBase + a1)
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setIndex(indices)
  geom.computeVertexNormals()
  return geom
}

export function buildParametricGridGeometry(
  THREE: ThreeLib,
  uSteps: number,
  wSteps: number,
  evalPoint: (u: number, w: number) => readonly [number, number, number],
  flipWinding = false
): THREE_TYPES.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const stride = wSteps + 1

  for (let i = 0; i <= uSteps; i++) {
    const u = i / uSteps
    for (let j = 0; j <= wSteps; j++) {
      const w = j / wSteps
      const [x, y, z] = evalPoint(u, w)
      positions.push(x, y, z)
    }
  }

  for (let i = 0; i < uSteps; i++) {
    for (let j = 0; j < wSteps; j++) {
      const a = i * stride + j
      const b = (i + 1) * stride + j
      const c = (i + 1) * stride + (j + 1)
      const d = i * stride + (j + 1)
      if (flipWinding) {
        indices.push(a, b, d, b, c, d)
      } else {
        indices.push(a, d, b, b, d, c)
      }
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setIndex(indices)
  geom.computeVertexNormals()
  return geom
}

/**
 * ИСПРАВЛЕНО (AUDIT-04): Возвращает штрихи логотипа «N» для латеральной (sign = -1)
 * и медиальной (sign = +1) боковин так, чтобы при взгляде снаружи на каждую боковину
 * диагональная перекладина всегда шла из верхнего левого угла в нижний правый угол буквы «N»
 * (а не превращалась в зеркальную «И» на медиальной стороне), с разносом по высоте (tierOffset)
 * для исключения Z-fighting и согласованием обхода вершин (flipWinding).
 */
export function getNLogoStrokesForSide(sign: -1 | 1): {
  pStart: number
  vStart: number
  pEnd: number
  vEnd: number
  elevationDelta: number
  flipWinding: boolean
}[] {
  // Стойка ближе к мыску (phi ~ 1.12) и стойка ближе к пятке (phi ~ 1.48)
  // При взгляде снаружи:
  // На левой (латеральной, sign = -1) боковине мысок слева, пятка справа -> левая стойка передняя, правая задняя.
  // На правой (медиальной, sign = +1) боковине пятка слева, мысок справа -> левая стойка задняя, правая передняя.
  const diagStartPhi = sign < 0 ? 1.14 : 1.46
  const diagEndPhi = sign < 0 ? 1.46 : 1.14

  return [
    {
      pStart: 1.06,
      vStart: 0.15,
      pEnd: 1.18,
      vEnd: 0.64,
      elevationDelta: 0.0,
      flipWinding: sign < 0,
    },
    {
      pStart: 1.42,
      vStart: 0.15,
      pEnd: 1.54,
      vEnd: 0.64,
      elevationDelta: 0.0,
      flipWinding: sign < 0,
    },
    {
      pStart: diagStartPhi,
      vStart: 0.62,
      pEnd: diagEndPhi,
      vEnd: 0.17,
      // Поднимаем диагональную перекладину на +0.8 мм над стойками для устранения Z-fighting в углах
      elevationDelta: 0.0008,
      // Так как v убывает (0.62 -> 0.17), знак якобиана инвертируется относительно стоек
      flipWinding: sign > 0,
    },
  ]
}

/**
 * ИСПРАВЛЕНО (AUDIT-06):
 * 1) Единая плоская горизонтальная опора на участке пятка–пучки (t in [0.12, 0.62]).
 * 2) Поперечная сетка дна и верха подошвы вместо конусообразной стяжки в одну точку (0, -0.33, 0).
 * 3) Раздельные вершины боковины и крышек верха/дна (чёткие нормали без размытия под 45°).
 * 4) Замкнутые торцевые крышки для полиуретановой чаши ENCAP на phi = ±1.55.
 */
export function buildSoleComponentGeometry(
  THREE: ThreeLib,
  part: 'midsole' | 'encap' | 'outsole',
  phiSteps = 96
): THREE_TYPES.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []

  const phiStart = part === 'encap' ? 1.55 : -Math.PI
  const phiEnd = part === 'encap' ? Math.PI * 2 - 1.55 : Math.PI
  const rings = 4

  const topContour: [number, number, number][] = []
  const botContour: [number, number, number][] = []

  // 1. Боковая стенка (Sidewall) с собственными вершинами для чётких боковых нормалей
  for (let i = 0; i <= phiSteps; i++) {
    const u = i / phiSteps
    const rawPhi = phiStart + u * (phiEnd - phiStart)
    const phi = wrapAnglePi(rawPhi)
    const fp = getFootprintPoint(phi)
    const { yTopBase, yMidBot, yOutBotBase, midThick } = getSoleVerticalProfile(fp.t)

    if (part === 'midsole') {
      const groove = -0.007 * Math.sin(u * Math.PI * 6) * (1 - fp.t * 0.5)
      const pTop: [number, number, number] = [fp.x * 1.002, yTopBase + 0.003, fp.z * 1.002]
      const pBot: [number, number, number] = [fp.x * 1.048, yMidBot, fp.z * 1.044]
      topContour.push(pTop)
      botContour.push(pBot)

      positions.push(...pTop)
      positions.push(fp.x * 1.028, yTopBase - midThick * 0.36 + groove, fp.z * 1.026)
      positions.push(fp.x * 1.044, yTopBase - midThick * 0.78, fp.z * 1.04)
      positions.push(...pBot)
    } else if (part === 'encap') {
      const endFade = smoothstep(0, 0.12, u) * smoothstep(1, 0.88, u)
      const encapOut = 1.055 + 0.014 * endFade
      const yEncapTop = yTopBase - midThick * 0.18
      const yEncapBot = yMidBot + 0.006
      const pTop: [number, number, number] = [fp.x * 1.015, yEncapTop, fp.z * 1.015]
      const pBot: [number, number, number] = [fp.x * 1.046, yEncapBot, fp.z * 1.044]
      topContour.push(pTop)
      botContour.push(pBot)

      positions.push(...pTop)
      positions.push(fp.x * encapOut, yEncapTop - 0.012, fp.z * encapOut)
      positions.push(
        fp.x * (encapOut + 0.006),
        (yEncapTop + yEncapBot) * 0.5,
        fp.z * (encapOut + 0.006)
      )
      positions.push(...pBot)
    } else {
      const lugFreq = 36
      const rawWave = Math.sin(u * lugFreq * Math.PI)
      const isArchBridge = fp.t > 0.34 && fp.t < 0.52
      const lugMod = isArchBridge ? 0.0 : 0.014 * (rawWave > 0 ? 1 : -0.45)
      const yOutBot = yOutBotBase + lugMod
      const pTop: [number, number, number] = [fp.x * 1.046, yMidBot, fp.z * 1.042]
      const pBot: [number, number, number] = [fp.x * 1.032, yOutBot, fp.z * 1.03]
      topContour.push(pTop)
      botContour.push(pBot)

      positions.push(...pTop)
      positions.push(fp.x * 1.054, yMidBot - 0.018, fp.z * 1.048)
      positions.push(fp.x * 1.042, yOutBot + 0.008, fp.z * 1.038)
      positions.push(...pBot)
    }
  }

  for (let i = 0; i < phiSteps; i++) {
    for (let r = 0; r < rings - 1; r++) {
      const a = i * rings + r
      const b = (i + 1) * rings + r
      const c = (i + 1) * rings + (r + 1)
      const d = i * rings + (r + 1)
      indices.push(a, d, b, b, d, c)
    }
  }

  if (part === 'encap') {
    // Замыкаем торцевые крышки ENCAP на начальном (i = 0) и конечном (i = phiSteps) сечениях
    const addEndCap = (ringIdx: number, reverse: boolean) => {
      const baseVertex = positions.length / 3
      const pTop = topContour[ringIdx]
      const pBot = botContour[ringIdx]
      const rMid1: [number, number, number] = [
        positions[(ringIdx * rings + 1) * 3],
        positions[(ringIdx * rings + 1) * 3 + 1],
        positions[(ringIdx * rings + 1) * 3 + 2],
      ]
      const rMid2: [number, number, number] = [
        positions[(ringIdx * rings + 2) * 3],
        positions[(ringIdx * rings + 2) * 3 + 1],
        positions[(ringIdx * rings + 2) * 3 + 2],
      ]
      const innerBack: [number, number, number] = [
        pTop[0] * 0.94,
        (pTop[1] + pBot[1]) * 0.5,
        pTop[2] * 0.98,
      ]
      positions.push(...pTop, ...rMid1, ...rMid2, ...pBot, ...innerBack)
      const [v0, v1, v2, v3, vc] = [
        baseVertex,
        baseVertex + 1,
        baseVertex + 2,
        baseVertex + 3,
        baseVertex + 4,
      ]
      if (reverse) {
        indices.push(vc, v1, v0, vc, v2, v1, vc, v3, v2)
      } else {
        indices.push(vc, v0, v1, vc, v1, v2, vc, v2, v3)
      }
    }
    addEndCap(0, false)
    addEndCap(phiSteps, true)
  } else {
    // 2. Поперечные сетки верхней и нижней крышек (от левого борта к правому по сечениям t)
    const halfSteps = Math.floor(phiSteps / 2)
    const crossCols = 6
    const capStride = crossCols + 1

    const topCapBase = positions.length / 3
    for (let k = 0; k <= halfSteps; k++) {
      // Левый борт: idxLeft = halfSteps - k (phi от 0 до -pi), правый борт: idxRight = halfSteps + k (phi от 0 до +pi)
      const pL = topContour[halfSteps - k]
      const pR = topContour[halfSteps + k]
      for (let c = 0; c <= crossCols; c++) {
        const s = c / crossCols
        positions.push(
          (1 - s) * pL[0] + s * pR[0],
          (1 - s) * pL[1] + s * pR[1],
          (1 - s) * pL[2] + s * pR[2]
        )
      }
    }

    for (let k = 0; k < halfSteps; k++) {
      for (let c = 0; c < crossCols; c++) {
        const a = topCapBase + k * capStride + c
        const b = topCapBase + (k + 1) * capStride + c
        const d = topCapBase + k * capStride + (c + 1)
        const e = topCapBase + (k + 1) * capStride + (c + 1)
        indices.push(a, d, b, b, d, e)
      }
    }

    const botCapBase = positions.length / 3
    for (let k = 0; k <= halfSteps; k++) {
      const uLong = k / halfSteps // 0 = мысок (t=1), 1 = пятка (t=0)
      const phiAbs = uLong * Math.PI
      const fp = getFootprintPoint(phiAbs)
      const { yMidBot, yOutBotBase } = getSoleVerticalProfile(fp.t)
      const pL = botContour[halfSteps - k]
      const pR = botContour[halfSteps + k]

      const isArchBridge = fp.t > 0.34 && fp.t < 0.52
      const treadWave =
        part === 'outsole' && !isArchBridge
          ? 0.012 * (Math.sin(k * 1.45 * Math.PI) > 0 ? 1 : -0.45)
          : 0.0
      const baseFlatY = part === 'outsole' ? yOutBotBase : yMidBot

      for (let c = 0; c <= crossCols; c++) {
        const s = c / crossCols
        const edgeBlend = Math.pow(Math.abs(s - 0.5) * 2, 2)
        const yEdge = (1 - s) * pL[1] + s * pR[1]
        const yInner = baseFlatY + treadWave
        const yFinal = edgeBlend * yEdge + (1 - edgeBlend) * yInner
        positions.push(
          (1 - s) * pL[0] + s * pR[0],
          yFinal,
          (1 - s) * pL[2] + s * pR[2]
        )
      }
    }

    for (let k = 0; k < halfSteps; k++) {
      for (let c = 0; c < crossCols; c++) {
        const a = botCapBase + k * capStride + c
        const b = botCapBase + (k + 1) * capStride + c
        const d = botCapBase + k * capStride + (c + 1)
        const e = botCapBase + (k + 1) * capStride + (c + 1)
        // Нормали нижней поверхности направлены строго вниз (-Y)
        indices.push(a, b, d, b, e, d)
      }
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setIndex(indices)
  geom.computeVertexNormals()
  return geom
}

function buildSneakerMeshGroup(THREE: ThreeLib, mats: SneakerMaterials): THREE_TYPES.Group {
  const group = new THREE.Group()

  // 1. TOE BOX (Базовый сетчатый слой мыска — Tier 0)
  const toeBoxGeom = buildPanelPatch(THREE, {
    phiStart: -0.78,
    phiEnd: 0.78,
    phiSteps: 40,
    vStart: 0.34,
    vEnd: 1.0,
    vSteps: 18,
    layerTier: 0,
    thickness: 0.01,
    seamInset: 0.004,
  })
  group.add(new THREE.Mesh(toeBoxGeom, mats.toeBox))

  // 2. VAMP (Передний замшевый обвод мыска — Tier 2)
  const vampFrontGeom = buildPanelPatch(THREE, {
    phiStart: -0.92,
    phiEnd: 0.92,
    phiSteps: 52,
    vStart: 0.0,
    vEnd: 0.39,
    vSteps: 14,
    layerTier: 2,
    thickness: 0.012,
    seamInset: 0.006,
  })
  group.add(new THREE.Mesh(vampFrontGeom, mats.vamp))

  ;([-1, 1] as const).forEach((sign) => {
    const pMin = sign > 0 ? 0.70 : -0.92
    const pMax = sign > 0 ? 0.92 : -0.70
    const vampWingGeom = buildPanelPatch(THREE, {
      phiStart: pMin,
      phiEnd: pMax,
      phiSteps: 12,
      vStart: 0.35,
      vEnd: 0.70,
      vSteps: 10,
      layerTier: 2,
      thickness: 0.012,
      seamInset: 0.005,
    })
    group.add(new THREE.Mesh(vampWingGeom, mats.vamp))

    // 3. QUARTERS (Боковые панели седла — Tier 1)
    const qMin = sign > 0 ? 0.86 : -1.84
    const qMax = sign > 0 ? 1.84 : -0.86
    const quarterGeom = buildPanelPatch(THREE, {
      phiStart: qMin,
      phiEnd: qMax,
      phiSteps: 32,
      vStart: 0.0,
      vEnd: 0.70,
      vSteps: 18,
      layerTier: 1,
      thickness: 0.011,
      seamInset: 0.006,
    })
    group.add(new THREE.Mesh(quarterGeom, mats.quarters))

    // 4. EYESTAYS (Планка шнуровки — Tier 2)
    const eMin = sign > 0 ? 0.32 : -1.56
    const eMax = sign > 0 ? 1.56 : -0.32
    const eyestayGeom = buildPanelPatch(THREE, {
      phiStart: eMin,
      phiEnd: eMax,
      phiSteps: 32,
      vStart: 0.68,
      vEnd: 1.0,
      vSteps: 12,
      layerTier: 2,
      thickness: 0.013,
      seamInset: 0.006,
    })
    group.add(new THREE.Mesh(eyestayGeom, mats.eyestays))

    // 5. COLLAR (Мягкий валик лодыжки — Tier 0)
    const cMin = sign > 0 ? 1.50 : -2.44
    const cMax = sign > 0 ? 2.44 : -1.50
    const collarGeom = buildPanelPatch(THREE, {
      phiStart: cMin,
      phiEnd: cMax,
      phiSteps: 24,
      vStart: 0.62,
      vEnd: 1.0,
      vSteps: 12,
      layerTier: 0,
      thickness: 0.011,
      seamInset: 0.005,
    })
    group.add(new THREE.Mesh(collarGeom, mats.collar))

    // 6. HEEL COUNTER + HEEL TAB + CRADLE CLIP
    const hMin = sign > 0 ? 1.78 : -Math.PI
    const hMax = sign > 0 ? Math.PI : -1.78
    const heelCounterGeom = buildPanelPatch(THREE, {
      phiStart: hMin,
      phiEnd: hMax,
      phiSteps: 34,
      vStart: 0.18,
      vEnd: 0.68,
      vSteps: 14,
      layerTier: 2,
      thickness: 0.012,
      seamInset: 0.004,
    })
    group.add(new THREE.Mesh(heelCounterGeom, mats.heel))

    const encapMin = sign > 0 ? 1.82 : -Math.PI
    const encapMax = sign > 0 ? Math.PI : -1.82
    const heelClipGeom = buildPanelPatch(THREE, {
      phiStart: encapMin,
      phiEnd: encapMax,
      phiSteps: 30,
      vStart: 0.0,
      vEnd: 0.20,
      vSteps: 8,
      layerTier: 3,
      thickness: 0.012,
      seamInset: 0.004,
    })
    group.add(new THREE.Mesh(heelClipGeom, mats.encap))

    const htMin = sign > 0 ? 2.36 : -Math.PI
    const htMax = sign > 0 ? Math.PI : -2.36
    const heelTabGeom = buildPanelPatch(THREE, {
      phiStart: htMin,
      phiEnd: htMax,
      phiSteps: 22,
      vStart: 0.69,
      vEnd: 1.0,
      vSteps: 10,
      layerTier: 2,
      thickness: 0.012,
      seamInset: 0.004,
    })
    group.add(new THREE.Mesh(heelTabGeom, mats.swoosh))

    // 7. ИСПРАВЛЕНО (AUDIT-04): Корректная ориентация «N» на обеих боковинах без инверсии в «И» и без Z-fighting
    const nStrokes = getNLogoStrokesForSide(sign)
    nStrokes.forEach(({ pStart, vStart, pEnd, vEnd, elevationDelta, flipWinding }) => {
      const trimGeom = buildParametricGridGeometry(
        THREE,
        14,
        6,
        (u, w) => {
          const uExp = -0.08 + u * 1.16
          const wCentered = (w - 0.5) * 2
          const pTrim = sign * ((1 - uExp) * pStart + uExp * pEnd + wCentered * 0.072)
          const vTrim = Math.max(0.08, Math.min(0.74, (1 - uExp) * vStart + uExp * vEnd))
          return sampleUpperSurface(pTrim, vTrim, 0.025 + elevationDelta)
        },
        flipWinding
      )
      group.add(new THREE.Mesh(trimGeom, mats.laces))

      const barGeom = buildParametricGridGeometry(
        THREE,
        14,
        6,
        (u, w) => {
          const wCentered = (w - 0.5) * 2
          const pBar = sign * ((1 - u) * pStart + u * pEnd + wCentered * 0.046)
          const vBar = Math.max(0.1, Math.min(0.72, (1 - u) * vStart + u * vEnd))
          return sampleUpperSurface(pBar, vBar, 0.031 + elevationDelta)
        },
        flipWinding
      )
      group.add(new THREE.Mesh(barGeom, mats.swoosh))
    })
  })

  // 8. ИСПРАВЛЕНО (AUDIT-07): Внутренняя подкладка ограничена зоной воротника (|phi| >= 0.42), не перекрывая язычок
  const liningGeom = buildParametricGridGeometry(THREE, 64, 14, (u, s) => {
    const rawPhi = 0.42 + u * (Math.PI * 2 - 0.84)
    const phi = wrapAnglePi(rawPhi)
    const [xr, yr, zr] = sampleUpperSurface(phi, 0.98, -0.004)
    const sProgress = Math.max(0, (s - 0.14) / 0.86)
    const radialShrink = 1 - 0.72 * Math.pow(sProgress, 1.08)
    const lipArch = 0.022 * Math.sin(Math.min(1, s / 0.28) * Math.PI)
    const x = xr * radialShrink
    const z = -0.58 + (zr - -0.58) * radialShrink
    const y = yr + lipArch - 0.48 * Math.pow(sProgress, 0.8)
    return [x, y, z] as const
  })
  group.add(new THREE.Mesh(liningGeom, mats.lining))

  const tongueGeom = buildParametricGridGeometry(
    THREE,
    26,
    16,
    (u, w) => {
      const wCentered = (w - 0.5) * 2
      const z = 0.44 - u * 0.78
      const x = wCentered * (0.125 + 0.055 * u)
      const y = 0.21 + 0.5 * Math.pow(u, 0.88) + 0.045 * Math.cos(wCentered * (Math.PI * 0.5))
      return [x, y, z] as const
    },
    false
  )
  group.add(new THREE.Mesh(tongueGeom, mats.tongue))

  const tongueTagGeom = buildParametricGridGeometry(
    THREE,
    8,
    8,
    (u, w) => {
      const uTag = 0.8 + u * 0.17
      const wCentered = (w - 0.5) * 0.88
      const z = 0.44 - uTag * 0.78 + 0.01
      const x = wCentered * (0.125 + 0.055 * uTag)
      const y = 0.21 + 0.5 * Math.pow(uTag, 0.88) + 0.05 * Math.cos(wCentered * (Math.PI * 0.5))
      return [x, y, z] as const
    },
    false
  )
  group.add(new THREE.Mesh(tongueTagGeom, mats.swoosh))

  // ИСПРАВЛЕНО (AUDIT-07): Люверсы посажены непосредственно на поверхность планки eyestay по локальной нормали
  const laceU = [0.1, 0.26, 0.42, 0.58, 0.74, 0.88]
  const eyeletTorus = new THREE.TorusGeometry(0.018, 0.0055, 8, 16)
  const zAxisVec = new THREE.Vector3(0, 0, 1)
  const normalVec = new THREE.Vector3()
  laceU.forEach((uL) => {
    const aL = 0.40 + uL * 1.00
    ;([-1, 1] as const).forEach((side) => {
      const { pos, normal } = sampleUpperSurfaceWithNormal(side * aL, 0.84, 0.032)
      const eyeMesh = new THREE.Mesh(eyeletTorus, mats.lining)
      eyeMesh.position.set(pos[0], pos[1], pos[2])
      normalVec.set(normal[0], normal[1], normal[2]).normalize()
      eyeMesh.quaternion.setFromUnitVectors(zAxisVec, normalVec)
      group.add(eyeMesh)
    })
  })

  const lacePairs: [number, number][] = [[0, 0]]
  for (let k = 0; k < laceU.length - 1; k++) {
    lacePairs.push([k, k + 1])
    lacePairs.push([k + 1, k])
  }

  // ИСПРАВЛЕНО (AUDIT-07): flipWinding = true ориентирует нормали шнурков строго наружу (+Y, ny > 0.9)
  lacePairs.forEach(([iL, iR], idxPair) => {
    const aL = 0.40 + laceU[iL] * 1.00
    const aR = 0.40 + laceU[iR] * 1.00
    const rimL = sampleUpperSurface(-aL, 0.84, 0.031)
    const rimR = sampleUpperSurface(aR, 0.84, 0.031)
    const overLift = idxPair % 2 === 1 ? 0.008 : 0.0

    const laceStrapGeom = buildParametricGridGeometry(
      THREE,
      16,
      5,
      (u, w) => {
        const wCentered = 0.5 - w
        const x = (1 - u) * rimL[0] + u * rimR[0]
        const z = (1 - u) * rimL[2] + u * rimR[2] + wCentered * 0.042
        const arch = (0.048 + overLift) * Math.sin(u * Math.PI)
        const y =
          (1 - u) * rimL[1] +
          u * rimR[1] +
          arch +
          0.012 +
          0.006 * Math.cos(wCentered * Math.PI)
        return [x, y, z] as const
      },
      true
    )
    group.add(new THREE.Mesh(laceStrapGeom, mats.laces))
  })

  // 9. ТРЁХКОМПОНЕНТНАЯ ПОДОШВА: EVA MIDSOLE + ENCAP SUPPORT + RUBBER OUTSOLE
  const midsoleGeom = buildSoleComponentGeometry(THREE, 'midsole', 96)
  group.add(new THREE.Mesh(midsoleGeom, mats.midsole))

  const encapRingGeom = buildSoleComponentGeometry(THREE, 'encap', 56)
  group.add(new THREE.Mesh(encapRingGeom, mats.encap))

  const outsoleGeom = buildSoleComponentGeometry(THREE, 'outsole', 96)
  group.add(new THREE.Mesh(outsoleGeom, mats.outsole))

  group.rotation.y = Math.PI * 0.5
  return group
}

function disposeObject3DResources(
  root: THREE_TYPES.Object3D,
  preservedMaterials?: Set<THREE_TYPES.Material>
) {
  const disposedGeometries = new Set<THREE_TYPES.BufferGeometry>()
  const disposedMaterials = new Set<THREE_TYPES.Material>()
  const disposedTextures = new Set<THREE_TYPES.Texture>()

  const disposeMaterialSafely = (mat: THREE_TYPES.Material) => {
    if (preservedMaterials?.has(mat) || disposedMaterials.has(mat)) return
    disposedMaterials.add(mat)

    const stdMat = mat as THREE_TYPES.MeshStandardMaterial
    const texProps: (keyof THREE_TYPES.MeshStandardMaterial)[] = [
      'map',
      'normalMap',
      'roughnessMap',
      'metalnessMap',
      'aoMap',
      'emissiveMap',
      'alphaMap',
      'bumpMap',
    ]
    texProps.forEach((prop) => {
      const tex = stdMat[prop] as THREE_TYPES.Texture | null | undefined
      if (tex && tex.isTexture && !disposedTextures.has(tex)) {
        disposedTextures.add(tex)
        tex.dispose()
      }
    })
    mat.dispose()
  }

  root.traverse((obj) => {
    const mesh = obj as THREE_TYPES.Mesh
    if (!mesh.isMesh) return
    if (mesh.geometry && !disposedGeometries.has(mesh.geometry)) {
      disposedGeometries.add(mesh.geometry)
      mesh.geometry.dispose()
    }
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(disposeMaterialSafely)
    } else if (mesh.material) {
      disposeMaterialSafely(mesh.material)
    }
  })
}

type ZoneMaterialRegistry = Record<SneakerZoneKey, THREE_TYPES.MeshStandardMaterial[]>

/**
 * ИСПРАВЛЕНО (AUDIT-09): Освобождает заменённые исходные материалы GLB после клонирования
 * и сохраняет рельефные карты (normalMap, roughnessMap, aoMap).
 */
function bindGlbMaterialsPreservingTextures(
  THREE: ThreeLib,
  root: THREE_TYPES.Object3D,
  baseMats: SneakerMaterials,
  registry: ZoneMaterialRegistry,
  currentColors: SneakerColors
) {
  const replacedOriginalMaterials = new Set<THREE_TYPES.Material>()

  root.traverse((obj) => {
    const mesh = obj as THREE_TYPES.Mesh
    if (!mesh.isMesh) return

    const rawMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    const candidateName = mesh.name || rawMat?.name || ''
    const zone = resolveGlbZone(candidateName)

    if (!zone) {
      console.warn(
        `[Sneaker3D] Неизвестная зона GLB-объекта: "${candidateName}". Оставлен исходный материал.`
      )
      return
    }

    const hasMeshVertexColor = Boolean(mesh.geometry?.attributes?.color)
    const srcStd = rawMat as THREE_TYPES.MeshStandardMaterial | undefined
    const hasOriginalTextures = Boolean(
      srcStd &&
        (srcStd.map ||
          srcStd.normalMap ||
          srcStd.roughnessMap ||
          srcStd.aoMap ||
          srcStd.metalnessMap)
    )

    if (rawMat) {
      replacedOriginalMaterials.add(rawMat)
    }

    if (hasOriginalTextures && srcStd) {
      const clonedMat = srcStd.clone()
      clonedMat.color = new THREE.Color(currentColors[zone])
      clonedMat.vertexColors = hasMeshVertexColor
      clonedMat.needsUpdate = true
      mesh.material = clonedMat
      registry[zone].push(clonedMat)
    } else if (hasMeshVertexColor) {
      // В sneaker_modular.glb 4K-фактура замши, сетки и швов запечена в атрибут COLOR_0 (средняя яркость ~173..217/255).
      // Мягко нормализуем кривую COLOR_0, чтобы сохранить микрорельеф швов без потери яркости чистых цветов Иттена.
      const colorAttr = mesh.geometry.attributes.color
      if (colorAttr && !mesh.geometry.userData?.colorNormalized) {
        const count = colorAttr.count
        for (let idx = 0; idx < count; idx++) {
          const r = colorAttr.getX(idx)
          const g = colorAttr.getY(idx)
          const b = colorAttr.getZ(idx)
          // Подтягиваем светлые участки замши к 1.0, сохраняя глубокие тени в швах и перфорации
          const lift = (v: number) => Math.min(1, Math.pow(Math.max(0, v), 0.55) * 1.06)
          colorAttr.setXYZ(idx, lift(r), lift(g), lift(b))
        }
        colorAttr.needsUpdate = true
        mesh.geometry.userData = { ...mesh.geometry.userData, colorNormalized: true }
      }

      const vcMat = baseMats[zone].clone()
      vcMat.color = new THREE.Color(currentColors[zone])
      vcMat.vertexColors = true
      if (srcStd) {
        vcMat.side = srcStd.side ?? THREE.DoubleSide
        if (typeof srcStd.roughness === 'number') vcMat.roughness = srcStd.roughness
        if (typeof srcStd.metalness === 'number') vcMat.metalness = srcStd.metalness
      } else {
        vcMat.side = THREE.DoubleSide
      }
      vcMat.needsUpdate = true
      mesh.material = vcMat
      registry[zone].push(vcMat)
    } else {
      baseMats[zone].vertexColors = false
      mesh.material = baseMats[zone]
    }
  })

  // Освобождаем исходные материалы GLB (без удаления их текстур, используемых клонами)
  replacedOriginalMaterials.forEach((origMat) => {
    origMat.dispose()
  })
}

function drawShadowGradient(canvas: HTMLCanvasElement, dark: boolean) {
  const sCtx = canvas.getContext('2d')
  if (!sCtx) return
  sCtx.clearRect(0, 0, canvas.width, canvas.height)
  const grad = sCtx.createRadialGradient(128, 64, 10, 128, 64, 118)
  grad.addColorStop(0, dark ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0.34)')
  grad.addColorStop(0.55, dark ? 'rgba(0,0,0,0.24)' : 'rgba(0,0,0,0.11)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  sCtx.fillStyle = grad
  sCtx.fillRect(0, 0, canvas.width, canvas.height)
}

/* ============================================================================
   4. ИНТЕРАКТИВНЫЙ 3D-КОМПОНЕНТ КРОССОВКА (THREE.JS + GLTFLOADER + ORBIT)
   ============================================================================ */
export function Sneaker3D({
  sneakerColors,
  isDark,
  onResetAll,
  resetLabel,
  loading3DLabel,
  webglFallbackLabel,
}: {
  sneakerColors: SneakerColors
  isDark: boolean
  onResetAll?: () => void
  resetLabel?: string
  loading3DLabel?: string
  webglFallbackLabel?: string
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const matsRef = useRef<SneakerMaterials | null>(null)
  const zoneRegistryRef = useRef<ZoneMaterialRegistry | null>(null)
  const shoeRootRef = useRef<THREE_TYPES.Group | null>(null)

  const latestColorsRef = useRef<SneakerColors>(sneakerColors)
  latestColorsRef.current = sneakerColors
  const latestIsDarkRef = useRef<boolean>(isDark)
  latestIsDarkRef.current = isDark

  const hemiLightRef = useRef<THREE_TYPES.HemisphereLight | null>(null)
  const shadowCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const shadowTexRef = useRef<THREE_TYPES.CanvasTexture | null>(null)

  // ИСПРАВЛЕНО (AUDIT-11): Разделение одиночного рендера кадра (при смене цвета/темы/размера)
  // и пробуждения 6-секундного цикла анимации камеры (только при вращении/сбросе)
  const requestSingleRenderRef = useRef<(() => void) | null>(null)
  const wakeCameraAnimationRef = useRef<(() => void) | null>(null)

  const [isLoading3D, setIsLoading3D] = useState(true)
  const [webglError, setWebglError] = useState(false)
  const [contextLostCount, setContextLostCount] = useState(0)

  const rotTarget = useRef({ yaw: -0.26, pitch: 0.16 })
  const rotCurrent = useRef({ yaw: -0.26, pitch: 0.16 })
  const isInteracting = useRef(false)
  const lastActivityTime = useRef<number>(Date.now())
  const lastPointer = useRef({ x: 0, y: 0 })

  const applyColorsToRegistry = useCallback((colors: SneakerColors) => {
    const reg = zoneRegistryRef.current
    if (!reg) return
    ;(Object.keys(colors) as SneakerZoneKey[]).forEach((zone) => {
      const hex = colors[zone]
      reg[zone]?.forEach((mat) => {
        mat.color.set(hex)
      })
    })
    requestSingleRenderRef.current?.()
  }, [])

  useEffect(() => {
    let disposed = false
    let frameId = 0
    let isLoopRunning = false
    let isVisibleInViewport = true
    let isDocumentVisible = typeof document !== 'undefined' ? !document.hidden : true
    let cleanupFn: (() => void) | undefined

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    setIsLoading3D(true)
    setWebglError(false)

    Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js').catch(() => null),
    ])
      .then(([THREE, gltfMod]) => {
        if (disposed) return

        const container = mountRef.current
        if (!container) return

        const width = container.clientWidth || 340
        const height = container.clientHeight || 205

        let renderer: THREE_TYPES.WebGLRenderer
        try {
          renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          })
        } catch (err) {
          console.error('[Sneaker3D] Не удалось инициализировать WebGLRenderer:', err)
          if (!disposed) {
            setWebglError(true)
            setIsLoading3D(false)
          }
          return
        }

        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.12
        container.innerHTML = ''
        container.appendChild(renderer.domElement)

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(29, width / height, 0.1, 50)
        camera.position.set(0, 0.44, 5.15)
        camera.lookAt(0, 0.04, 0)

        const currentDark = latestIsDarkRef.current
        const currentColors = latestColorsRef.current

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd8d0c5, currentDark ? 1.1 : 1.3)
        hemiLight.position.set(0, 6, 0)
        scene.add(hemiLight)
        hemiLightRef.current = hemiLight

        const keyLight = new THREE.DirectionalLight(0xfffdf8, 2.0)
        keyLight.position.set(3.6, 5.2, 4.4)
        scene.add(keyLight)

        const fillLight = new THREE.DirectionalLight(0xe2ecff, 1.0)
        fillLight.position.set(-4.2, 2.2, 2.8)
        scene.add(fillLight)

        const rimLight = new THREE.DirectionalLight(0xffffff, 1.2)
        rimLight.position.set(0, 3.8, -4.5)
        scene.add(rimLight)

        const mats: SneakerMaterials = {
          vamp: new THREE.MeshStandardMaterial({
            color: new THREE.Color(currentColors.vamp),
            roughness: 0.56,
            metalness: 0.02,
          }),
          quarters: new THREE.MeshStandardMaterial({
            color: new THREE.Color(currentColors.quarters),
            roughness: 0.52,
            metalness: 0.02,
          }),
          tongue: new THREE.MeshStandardMaterial({
            color: new THREE.Color(currentColors.tongue),
            roughness: 0.72,
            metalness: 0.01,
            side: THREE.DoubleSide,
          }),
          lining: new THREE.MeshStandardMaterial({
            color: new THREE.Color(currentColors.lining),
            roughness: 0.68,
            metalness: 0.02,
            side: THREE.DoubleSide,
          }),
          toeBox: new THREE.MeshStandardMaterial({
            color: new THREE.Color(currentColors.toeBox),
            roughness: 0.62,
            metalness: 0.01,
          }),
          heel: new THREE.MeshStandardMaterial({
            color: new THREE.Color(currentColors.heel),
            roughness: 0.54,
            metalness: 0.03,
          }),
          collar: new THREE.MeshStandardMaterial({
            color: new THREE.Color(currentColors.collar),
            roughness: 0.60,
            metalness: 0.02,
          }),
          midsole: new THREE.MeshStandardMaterial({
            color: new THREE.Color(currentColors.midsole),
            roughness: 0.66,
            metalness: 0.02,
          }),
          encap: new THREE.MeshStandardMaterial({
            color: new THREE.Color(currentColors.encap),
            roughness: 0.42,
            metalness: 0.06,
          }),
          outsole: new THREE.MeshStandardMaterial({
            color: new THREE.Color(currentColors.outsole),
            roughness: 0.58,
            metalness: 0.03,
          }),
          laces: new THREE.MeshStandardMaterial({
            color: new THREE.Color(currentColors.laces),
            roughness: 0.78,
            metalness: 0.0,
          }),
          eyestays: new THREE.MeshStandardMaterial({
            color: new THREE.Color(currentColors.eyestays),
            roughness: 0.46,
            metalness: 0.03,
          }),
          swoosh: new THREE.MeshStandardMaterial({
            color: new THREE.Color(currentColors.swoosh),
            roughness: 0.34,
            metalness: 0.06,
          }),
        }
        matsRef.current = mats

        const registry: ZoneMaterialRegistry = {
          vamp: [mats.vamp],
          quarters: [mats.quarters],
          tongue: [mats.tongue],
          lining: [mats.lining],
          toeBox: [mats.toeBox],
          heel: [mats.heel],
          collar: [mats.collar],
          midsole: [mats.midsole],
          encap: [mats.encap],
          outsole: [mats.outsole],
          laces: [mats.laces],
          eyestays: [mats.eyestays],
          swoosh: [mats.swoosh],
        }
        zoneRegistryRef.current = registry
        const baseMaterialsSet = new Set<THREE_TYPES.Material>(Object.values(mats))

        const pivotGroup = new THREE.Group()
        const proceduralMesh = buildSneakerMeshGroup(THREE, mats)
        pivotGroup.add(proceduralMesh)
        scene.add(pivotGroup)
        shoeRootRef.current = pivotGroup

        const shadowCanvas = document.createElement('canvas')
        shadowCanvas.width = 256
        shadowCanvas.height = 128
        drawShadowGradient(shadowCanvas, currentDark)
        shadowCanvasRef.current = shadowCanvas

        const shadowTex = new THREE.CanvasTexture(shadowCanvas)
        shadowTexRef.current = shadowTex
        const shadowGeom = new THREE.PlaneGeometry(3.3, 1.35)
        const shadowMat = new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
        })
        const shadowPlane = new THREE.Mesh(shadowGeom, shadowMat)
        shadowPlane.rotation.x = -Math.PI / 2
        shadowPlane.position.y = -0.42
        scene.add(shadowPlane)

        const clock = new THREE.Clock()

        // ИСПРАВЛЕНО (AUDIT-11): Одиночный рендер кадра без запуска 6-секундного цикла
        const renderSingleFrame = () => {
          if (disposed || !isVisibleInViewport || !isDocumentVisible) return
          if (!isLoopRunning) {
            renderer.render(scene, camera)
          }
        }
        requestSingleRenderRef.current = renderSingleFrame

        // ИСПРАВЛЕНО (AUDIT-11): Строгое завершение цикла на 6000 мс с плавным возвратом position.y к 0
        const animate = () => {
          if (disposed || !isVisibleInViewport || !isDocumentVisible) {
            isLoopRunning = false
            return
          }

          const idleMs = Date.now() - lastActivityTime.current
          if (!isInteracting.current && (prefersReducedMotion || idleMs >= 6000)) {
            rotCurrent.current.yaw = rotTarget.current.yaw
            rotCurrent.current.pitch = rotTarget.current.pitch
            if (shoeRootRef.current) {
              shoeRootRef.current.rotation.y = rotCurrent.current.yaw
              shoeRootRef.current.rotation.x = rotCurrent.current.pitch
              shoeRootRef.current.position.y = 0
            }
            isLoopRunning = false
            renderer.render(scene, camera)
            return
          }

          isLoopRunning = true
          frameId = requestAnimationFrame(animate)
          const elapsed = clock.getElapsedTime()

          // Затухание покачивания за 1.2 секунды до остановки цикла
          const swayDamping = Math.max(0, Math.min(1, (5400 - idleMs) / 1200))

          if (!isInteracting.current && !prefersReducedMotion && swayDamping > 0) {
            rotTarget.current.yaw += Math.sin(elapsed * 0.65) * 0.0007 * swayDamping
          }

          rotCurrent.current.yaw += (rotTarget.current.yaw - rotCurrent.current.yaw) * 0.14
          rotCurrent.current.pitch += (rotTarget.current.pitch - rotCurrent.current.pitch) * 0.14

          if (shoeRootRef.current) {
            shoeRootRef.current.rotation.y = rotCurrent.current.yaw
            shoeRootRef.current.rotation.x = rotCurrent.current.pitch
            shoeRootRef.current.position.y = prefersReducedMotion
              ? 0
              : Math.sin(elapsed * 1.5) * 0.015 * swayDamping
          }

          renderer.render(scene, camera)
        }

        const wakeCameraLoop = () => {
          lastActivityTime.current = Date.now()
          if (prefersReducedMotion) {
            renderSingleFrame()
            return
          }
          if (!isLoopRunning && !disposed && isVisibleInViewport && isDocumentVisible) {
            clock.getDelta()
            animate()
          }
        }
        wakeCameraAnimationRef.current = wakeCameraLoop

        applyColorsToRegistry(latestColorsRef.current)
        setIsLoading3D(false)
        wakeCameraLoop()

        if (gltfMod?.GLTFLoader) {
          const loader = new gltfMod.GLTFLoader()
          const tryLoadGlb = (urls: string[], index = 0) => {
            if (index >= urls.length || disposed) return
            loader.load(
              urls[index],
              (gltf) => {
                // ИСПРАВЛЕНО (AUDIT-09): Если компонент размонтирован во время загрузки GLB, немедленно очищаем gltf.scene
                if (disposed) {
                  if (gltf?.scene) disposeObject3DResources(gltf.scene)
                  return
                }
                if (!gltf?.scene) return

                const box = new THREE.Box3().setFromObject(gltf.scene)
                const size = new THREE.Vector3()
                const center = new THREE.Vector3()
                box.getSize(size)
                box.getCenter(center)
                const maxDim = Math.max(size.x, size.y, size.z)
                if (maxDim > 0 && maxDim < 10) {
                  disposeObject3DResources(pivotGroup, baseMaterialsSet)
                  pivotGroup.clear()

                  bindGlbMaterialsPreservingTextures(
                    THREE,
                    gltf.scene,
                    mats,
                    registry,
                    latestColorsRef.current
                  )
                  gltf.scene.position.sub(center)
                  const scale = 2.74 / maxDim
                  gltf.scene.scale.setScalar(scale)
                  gltf.scene.rotation.y = Math.PI * 0.5
                  pivotGroup.add(gltf.scene)
                  applyColorsToRegistry(latestColorsRef.current)
                } else {
                  disposeObject3DResources(gltf.scene)
                }
              },
              undefined,
              () => tryLoadGlb(urls, index + 1)
            )
          }
          tryLoadGlb(['/sneaker_modular.glb', '/models/sneaker_modular.glb'])
        }

        const updateViewportSize = () => {
          if (!container || disposed) return
          const w = container.clientWidth || 340
          const h = container.clientHeight || 205
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
          renderSingleFrame()
        }

        let resizeObserver: ResizeObserver | null = null
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(updateViewportSize)
          resizeObserver.observe(container)
        }
        window.addEventListener('resize', updateViewportSize)

        let intersectionObserver: IntersectionObserver | null = null
        if (typeof IntersectionObserver !== 'undefined') {
          intersectionObserver = new IntersectionObserver(
            (entries) => {
              const entry = entries[0]
              if (!entry) return
              isVisibleInViewport = entry.isIntersecting
              if (isVisibleInViewport) renderSingleFrame()
            },
            { threshold: 0.05 }
          )
          intersectionObserver.observe(container)
        }

        const onVisibilityChange = () => {
          isDocumentVisible = !document.hidden
          if (isDocumentVisible) renderSingleFrame()
        }
        document.addEventListener('visibilitychange', onVisibilityChange)

        const domCanvas = renderer.domElement
        const onContextLost = (e: Event) => {
          e.preventDefault()
          cancelAnimationFrame(frameId)
          isLoopRunning = false
        }
        const onContextRestored = () => {
          if (!disposed) {
            setContextLostCount((c) => c + 1)
          }
        }
        domCanvas.addEventListener('webglcontextlost', onContextLost, false)
        domCanvas.addEventListener('webglcontextrestored', onContextRestored, false)

        cleanupFn = () => {
          window.removeEventListener('resize', updateViewportSize)
          document.removeEventListener('visibilitychange', onVisibilityChange)
          resizeObserver?.disconnect()
          intersectionObserver?.disconnect()
          domCanvas.removeEventListener('webglcontextlost', onContextLost)
          domCanvas.removeEventListener('webglcontextrestored', onContextRestored)

          disposeObject3DResources(pivotGroup)
          shadowGeom.dispose()
          shadowMat.dispose()
          shadowTex.dispose()
          Object.values(mats).forEach((m) => m.dispose())
          renderer.dispose()

          matsRef.current = null
          zoneRegistryRef.current = null
          shoeRootRef.current = null
          hemiLightRef.current = null
          shadowCanvasRef.current = null
          shadowTexRef.current = null
          requestSingleRenderRef.current = null
          wakeCameraAnimationRef.current = null
        }
      })
      .catch((err) => {
        console.error('[Sneaker3D] Сбой загрузки 3D-модуля:', err)
        if (!disposed) {
          setWebglError(true)
          setIsLoading3D(false)
        }
      })

    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
      if (cleanupFn) cleanupFn()
    }
  }, [contextLostCount, applyColorsToRegistry])

  useEffect(() => {
    applyColorsToRegistry(sneakerColors)
  }, [sneakerColors, applyColorsToRegistry])

  useEffect(() => {
    if (hemiLightRef.current) {
      hemiLightRef.current.intensity = isDark ? 1.1 : 1.3
    }
    if (shadowCanvasRef.current && shadowTexRef.current) {
      drawShadowGradient(shadowCanvasRef.current, isDark)
      shadowTexRef.current.needsUpdate = true
    }
    requestSingleRenderRef.current?.()
  }, [isDark])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isInteracting.current = true
    lastPointer.current = { x: e.clientX, y: e.clientY }
    wakeCameraAnimationRef.current?.()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteracting.current) return
    const dx = e.clientX - lastPointer.current.x
    const dy = e.clientY - lastPointer.current.y
    lastPointer.current = { x: e.clientX, y: e.clientY }

    rotTarget.current.yaw += dx * 0.012
    rotTarget.current.pitch = Math.max(-0.35, Math.min(0.6, rotTarget.current.pitch + dy * 0.009))
    wakeCameraAnimationRef.current?.()
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isInteracting.current = false
    wakeCameraAnimationRef.current?.()
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleResetClick = () => {
    haptic('light')
    rotTarget.current = { yaw: -0.26, pitch: 0.16 }
    wakeCameraAnimationRef.current?.()
    onResetAll?.()
  }

  return (
    <div className="relative w-full h-[178px] sm:h-[218px] md:h-[270px] select-none">
      {webglError ? (
        <div
          className={`w-full h-full flex flex-col items-center justify-center border border-dashed rounded-sm px-4 text-center ${
            isDark ? 'border-white/15 text-[#F4F0E8]/70' : 'border-black/15 text-[#1C1816]/70'
          }`}
        >
          <div className="flex gap-2 mb-2">
            {(
              [
                sneakerColors.vamp,
                sneakerColors.quarters,
                sneakerColors.swoosh,
                sneakerColors.outsole,
              ] as string[]
            ).map((hex, idx) => (
              <span
                key={idx}
                className="w-5 h-5 rounded-full border border-current/20 shadow-sm"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <span className="text-[10px] font-sans uppercase tracking-[0.18em]">
            {webglFallbackLabel || '3D-предпросмотр недоступен на этом устройстве'}
          </span>
        </div>
      ) : (
        <div
          ref={mountRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          style={{ touchAction: 'none' }}
        />
      )}

      {isLoading3D && !webglError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={`px-3 py-1 text-[9px] font-sans uppercase tracking-[0.22em] border rounded-full backdrop-blur-sm animate-pulse ${
              isDark
                ? 'border-white/15 bg-black/40 text-[#F4F0E8]/80'
                : 'border-black/15 bg-white/50 text-[#1C1816]/80'
            }`}
          >
            {loading3DLabel || 'Загрузка 3D • NB 574...'}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={handleResetClick}
        className={`absolute bottom-1 right-2 px-2.5 py-0.5 text-[8px] font-sans uppercase tracking-[0.2em] border rounded-full backdrop-blur-sm transition-opacity opacity-65 hover:opacity-100 cursor-pointer bg-transparent ${
          isDark ? 'border-white/20 text-[#F4F0E8]' : 'border-black/20 text-[#1C1816]'
        }`}
      >
        {resetLabel || '360° • Сброс'}
      </button>
    </div>
  )
}

/* ============================================================================
   5. СЛОВАРЬ ЛОКАЛИЗАЦИИ И ДИНАМИЧЕСКИЕ ПОДПИСИ СВОТЧЕЙ (AUDIT-02, AUDIT-05)
   ============================================================================ */

const TRANSLATIONS = {
  ru: {
    title: 'Цвета',
    complementary: 'Комплементарная',
    analogous: 'Аналогичная',
    triadic: 'Триадная',
    tetradic: 'Тетрада (квадрат)',
    rectangular: 'Тетрада (прямоуг.)',
    'split-complementary': 'Контрастная триада',
    monochromatic: 'Монохромная',
    main60: '60%',
    secondary30: '30%',
    accent10: '10%',
    main55: '55%',
    secondary20: '20%',
    secondary15: '15%',
    // Роли свотчей по пресетам (AUDIT-05)
    roleClassicUpper: 'Обвод • Пятка • Планка',
    roleClassicDetailsAll: 'Берцы • Мысок • Воротник',
    roleClassicDetails: 'Берцы • Мысок • Язычок',
    roleClassicLining: 'Воротник • Подкладка',
    roleClassicAccent: 'Протектор • Лого N',
    roleToeMain: 'Мысок • Планка • ENCAP',
    roleToeSecondary: 'Обвод • Берцы',
    roleToeLining: 'Воротник • Подкладка',
    roleToeAccent: 'Пятка • Лого N • Протектор',
    roleSplitMain: 'Обвод • Пятка • Лого N',
    roleSplitSecondary: 'Мысок • Планка • ENCAP',
    roleSplitLining: 'Воротник • Подкладка',
    roleSplitAccent: 'Боковые берцы (Saddle)',
    roleNeutralAccent: 'Лого N • Задний хлястик',
    // Названия всех 13 зон для технологической спецификации
    specTitle: 'Техкарта зон (нажмите для копирования HEX):',
    zone_vamp: 'Обвод',
    zone_toeBox: 'Мысок',
    zone_quarters: 'Берцы',
    zone_eyestays: 'Планка',
    zone_heel: 'Пятка',
    zone_collar: 'Воротник',
    zone_tongue: 'Язычок',
    zone_lining: 'Подкладка',
    zone_swoosh: 'Лого N',
    zone_midsole: 'EVA база',
    zone_encap: 'ENCAP',
    zone_outsole: 'Протектор',
    zone_laces: 'Шнурки',
    quote: '«Цвет — это душа обуви.»',
    white: 'Белила (Tint)',
    black: 'Тень (Shade)',
    chroma: 'Насыщенность',
    pure: 'Пигмент',
    ittenLabel: 'Круг Иттена (RYB)',
    hslLabel: 'Цифровой (HSL)',
    presetClassic: '60/30/10 База',
    presetToe: 'Акцент мыска',
    presetSplit: 'Сплит-берцы',
    presetNeutral: 'Нейтр. подошва',
    contrastOptimal: 'Оптимальный контраст',
    contrastSoft: 'Мягкий нюанс',
    contrastHigh: 'Высокий контраст',
    copied: 'Скопировано',
    resetBtn: '360° • Сброс',
    loading3D: 'Загрузка 3D • NB 574...',
    webglFallback: 'WebGL недоступен • Режим палитры',
    guideBtn: 'Гид',
    guideTitle: 'Цвет в дизайне',
    guideClose: 'Закрыть',
    paywallTitle: 'PRO: Палитры Studio',
    paywallDesc:
      'Пожизненный доступ ко всем профессиональным схемам Иттена: триады, тетрады, монохром и полная техкарта 13 деталей кроя.',
    paywallBtn: `ОТКРЫТЬ ДОСТУП • ${PRO_COLORS_PRICE_STARS} ⭐️`,
    loading: 'СОЗДАНИЕ СЧЁТА...',
    verifying: 'ПРОВЕРКА ТРАНЗАКЦИИ...',
    paymentVerifyFailed:
      'Оплата ещё не подтверждена сервером. Подождите пару секунд и нажмите снова.',
    paymentPendingMsg:
      'Платёж обрабатывается Telegram. Доступ откроется автоматически после подтверждения.',
    guideIntro:
      'Круг Иттена (RYB) — классический художественный инструмент гармонизации цвета. В отличие от экранной модели RGB/HSL, в круге Иттена комплементарными парами выступают Красный–Зелёный, Синий–Оранжевый и Жёлтый–Фиолетовый, что создаёт благородные материальные сочетания для кожи и замши.',
    guideBalanceTitle: 'Правило баланса',
    guideBalance:
      '60 % — основной цвет (обычно нейтраль или доминирующий тон кожи).\n30 % — поддерживающий цвет (подкладка, язычок, задник).\n10 % — акцент (строчка, логотип, металлическая фурнитура, подошва).',
    guideSchemesTitle: 'Схемы и применение',
    guideComplementary:
      'Комплементарная — два противоположных цвета. Даёт сильный, энергичный контраст. Хороша для спортивной и fashion-обуви, где нужен яркий акцент на нейтральном фоне.',
    guideAnalogous:
      'Аналогичная — соседние цвета на круге. Создаёт мягкий, спокойный переход. Идеальна для классической и повседневной обуви, когда хочется богатства тона без резкости.',
    guideTriadic:
      'Триадная — три цвета через 120°. Живая и сбалансированная. Подходит для капсульных коллекций и сезонных цветовых историй.',
    guideTetradic:
      'Тетрада (квадрат) — четыре цвета через 90°. Самая яркая схема. Используйте один доминирующий тон, два поддерживающих и один чистый акцент, иначе композиция станет пёстрой.',
    guideRectangular:
      'Тетрада (прямоугольник) — две комплементарные пары со сдвигом. Мягче квадрата, даёт больше пространства для нюансов. Отлично работает в премиальной и дизайнерской обуви.',
    guideSplit:
      'Контрастная триада — основной цвет + два соседних к его комплементу. Контраст есть, но мягче чистой комплементарной. Универсальный выбор для большинства моделей.',
    guideMono:
      'Монохромная — один цвет в разных тонах и насыщенностях. Самая элегантная и «дорогая» схема. Идеальна для минимализма, вечерней обуви и когда кожа сама по себе выразительна.',
    guideFootwearTitle: 'Специфика обуви',
    guideFootwear:
      '• Верх: основной цвет (60–70 %).\n• Подкладка и стелька: поддерживающий или более светлый тон.\n• Подошва и каблук: часто нейтраль или акцент.\n• Фурнитура и строчка: самый чистый и яркий акцент (5–10 %).\n• Чёрный и белый — не «отсутствие цвета», а мощные инструменты контраста и формы.',
    guideTip:
      'Совет: нажмите на любой цветовой свотч или чип в техкарте зон внизу экрана, чтобы мгновенно скопировать точный HEX-код для спецификации производства.',
  },
  uk: {
    title: 'Кольори',
    complementary: 'Комплементарна',
    analogous: 'Аналогічна',
    triadic: 'Тріадна',
    tetradic: 'Тетрада (квадрат)',
    rectangular: 'Тетрада (прямокут.)',
    'split-complementary': 'Контрастна тріада',
    monochromatic: 'Монохромна',
    main60: '60%',
    secondary30: '30%',
    accent10: '10%',
    main55: '55%',
    secondary20: '20%',
    secondary15: '15%',
    roleClassicUpper: 'Обвід • П’ята • Планка',
    roleClassicDetailsAll: 'Берці • Мисок • Комір',
    roleClassicDetails: 'Берці • Мисок • Язичок',
    roleClassicLining: 'Комір • Підкладка',
    roleClassicAccent: 'Протектор • Лого N',
    roleToeMain: 'Мисок • Планка • ENCAP',
    roleToeSecondary: 'Обвід • Берці',
    roleToeLining: 'Комір • Підкладка',
    roleToeAccent: 'П’ята • Лого N • Протектор',
    roleSplitMain: 'Обвід • П’ята • Лого N',
    roleSplitSecondary: 'Мисок • Планка • ENCAP',
    roleSplitLining: 'Комір • Підкладка',
    roleSplitAccent: 'Бічні берці (Saddle)',
    roleNeutralAccent: 'Лого N • Задній хлястик',
    specTitle: 'Техкарта зон (натисніть для копіювання HEX):',
    zone_vamp: 'Обвід',
    zone_toeBox: 'Мисок',
    zone_quarters: 'Берці',
    zone_eyestays: 'Планка',
    zone_heel: 'П’ята',
    zone_collar: 'Комір',
    zone_tongue: 'Язичок',
    zone_lining: 'Підкладка',
    zone_swoosh: 'Лого N',
    zone_midsole: 'EVA база',
    zone_encap: 'ENCAP',
    zone_outsole: 'Протектор',
    zone_laces: 'Шнурки',
    quote: '«Колір — це душа взуття.»',
    white: 'Білила (Tint)',
    black: 'Тінь (Shade)',
    chroma: 'Насиченість',
    pure: 'Пігмент',
    ittenLabel: 'Коло Іттена (RYB)',
    hslLabel: 'Цифровий (HSL)',
    presetClassic: '60/30/10 База',
    presetToe: 'Акцент миска',
    presetSplit: 'Спліт-берці',
    presetNeutral: 'Нейтр. підошва',
    contrastOptimal: 'Оптимальний контраст',
    contrastSoft: 'М’який нюанс',
    contrastHigh: 'Високий контраст',
    copied: 'Скопійовано',
    resetBtn: '360° • Скидання',
    loading3D: 'Завантаження 3D • NB 574...',
    webglFallback: 'WebGL недоступний • Режим палітри',
    guideBtn: 'Гід',
    guideTitle: 'Колір у дизайні',
    guideClose: 'Закрити',
    paywallTitle: 'PRO: Палітри Studio',
    paywallDesc:
      'Довічний доступ до всіх професійних колірних схем Іттена: тріади, тетради, монохром та повна техкарта 13 деталей крою.',
    paywallBtn: `ВІДКРИТИ ДОСТУП • ${PRO_COLORS_PRICE_STARS} ⭐️`,
    loading: 'СТВОРЕННЯ РАХУНКУ...',
    verifying: 'ПЕРЕВІРКА ТРАНЗАКЦІЇ...',
    paymentVerifyFailed:
      'Оплату ще не підтверджено сервером. Зачекайте кілька секунд і спробуйте знову.',
    paymentPendingMsg:
      'Платіж обробляється Telegram. Доступ відкриється автоматично після підтвердження.',
    guideIntro:
      'Коло Іттена (RYB) — класичний художній інструмент гармонізації кольору. На відміну від екранної моделі RGB/HSL, у колі Іттена комплементарними парами виступають Червоний–Зелений, Синій–Помаранчевий та Жовтий–Фіолетовий, що створює благородні поєднання для шкіри та замші.',
    guideBalanceTitle: 'Правило балансу',
    guideBalance:
      '60 % — основний колір (зазвичай нейтраль або домінуючий тон шкіри).\n30 % — підтримуючий колір (підкладка, язичок, задник).\n10 % — акцент (рядок, логотип, металева фурнітура, підошва).',
    guideSchemesTitle: 'Схеми і застосування',
    guideComplementary:
      'Комплементарна — два протилежні кольори. Дає сильний, енергійний контраст. Добре працює у спортивному та fashion-взутті, де потрібен яскравий акцент на нейтральному тлі.',
    guideAnalogous:
      'Аналогічна — сусідні кольори на колі. Створює м’який, спокійний перехід. Ідеальна для класичного та повсякденного взуття, коли хочеться багатства тону без різкості.',
    guideTriadic:
      'Тріадна — три кольори через 120°. Жива і збалансована. Підходить для капсульних колекцій і сезонних кольорових історій.',
    guideTetradic:
      'Тетрада (квадрат) — чотири кольори через 90°. Найяскравіша схема. Використовуйте один домінуючий тон, два підтримуючих і один чистий акцент, інакше композиція стане строкатою.',
    guideRectangular:
      'Тетрада (прямокутник) — дві комплементарні пари зі зсувом. М’якша за квадрат, дає більше простору для нюансів. Відмінно працює в преміальному та дизайнерському взутті.',
    guideSplit:
      'Контрастна тріада — основной колір + два сусідні до його комплементу. Контраст є, але м’якший за чисту комплементарну. Універсальний вибір для більшості моделей.',
    guideMono:
      'Monochromatisch — один колір у різних тонах і насиченостях. Найелегантніша і «дорога» схема. Ідеальна для мінімалізму, вечірнього взуття і коли шкіра сама по собі виразна.',
    guideFootwearTitle: 'Специфіка взуття',
    guideFootwear:
      '• Верх: основний колір (60–70 %).\n• Підкладка і устілка: підтримуючий або світліший тон.\n• Підошва і підбор: часто нейтраль або акцент.\n• Фурнітура і рядок: найчистіший і найяскравіший акцент (5–10 %).\n• Чорний і білий — не «відсутність кольору», а потужні інструменти контрасту і форми.',
    guideTip:
      'Порада: натисніть на будь-який колірний свотч або чіп у техкарті зон внизу екрана, щоб миттєво скопіювати точний HEX-код для технологічної карти виробництва.',
  },
  de: {
    title: 'Farben',
    complementary: 'Komplementär',
    analogous: 'Analog',
    triadic: 'Triadisch',
    tetradic: 'Tetradisch (Quadrat)',
    rectangular: 'Tetradisch (Rechteck)',
    'split-complementary': 'Split-Komplementär',
    monochromatic: 'Monochromatisch',
    main60: '60%',
    secondary30: '30%',
    accent10: '10%',
    main55: '55%',
    secondary20: '20%',
    secondary15: '15%',
    roleClassicUpper: 'Rahmen • Ferse • Ösenleiste',
    roleClassicDetailsAll: 'Quartier • Kappe • Kragen',
    roleClassicDetails: 'Quartier • Kappe • Zunge',
    roleClassicLining: 'Kragen • Futter',
    roleClassicAccent: 'Laufsohle • N-Logo',
    roleToeMain: 'Kappe • Ösenleiste • ENCAP',
    roleToeSecondary: 'Rahmen • Quartier',
    roleToeLining: 'Kragen • Futter',
    roleToeAccent: 'Ferse • N-Logo • Sohle',
    roleSplitMain: 'Rahmen • Ferse • N-Logo',
    roleSplitSecondary: 'Kappe • Ösenleiste • ENCAP',
    roleSplitLining: 'Kragen • Futter',
    roleSplitAccent: 'Seitliches Quartier',
    roleNeutralAccent: 'N-Logo • Fersenlasche',
    specTitle: '13-Zonen-Spezifikation (Tippen zum HEX-Kopieren):',
    zone_vamp: 'Rahmen',
    zone_toeBox: 'Kappe',
    zone_quarters: 'Quartier',
    zone_eyestays: 'Ösen',
    zone_heel: 'Ferse',
    zone_collar: 'Kragen',
    zone_tongue: 'Zunge',
    zone_lining: 'Futter',
    zone_swoosh: 'N-Logo',
    zone_midsole: 'EVA-Basis',
    zone_encap: 'ENCAP',
    zone_outsole: 'Laufsohle',
    zone_laces: 'Schnürung',
    quote: '«Farbe ist die Seele des Schuhs.»',
    white: 'Weißanteil (Tint)',
    black: 'Schwarzanteil (Shade)',
    chroma: 'Sättigung',
    pure: 'Pigment',
    ittenLabel: 'Itten-Kreis (RYB)',
    hslLabel: 'Digital (HSL)',
    presetClassic: '60/30/10 Klassik',
    presetToe: 'Kappen-Fokus',
    presetSplit: 'Split-Quartier',
    presetNeutral: 'Neutrale Sohle',
    contrastOptimal: 'Optimaler Kontrast',
    contrastSoft: 'Sanfte Nuance',
    contrastHigh: 'Starker Kontrast',
    copied: 'Kopiert',
    resetBtn: '360° • Reset',
    loading3D: '3D lädt • NB 574...',
    webglFallback: 'WebGL nicht verfügbar • Palettenmodus',
    guideBtn: 'Guide',
    guideTitle: 'Farbe im Design',
    guideClose: 'Schließen',
    paywallTitle: 'PRO: Studio-Paletten',
    paywallDesc:
      'Lebenslanger Vollzugriff auf alle professionellen Itten-Farbschemata: Triaden, Tetraden, Monochrom und das komplette 13-Zonen-Datenblatt.',
    paywallBtn: `FREISCHALTEN FÜR ${PRO_COLORS_PRICE_STARS} ⭐️`,
    loading: 'RECHNUNG WIRD ERSTELLT...',
    verifying: 'ZAHLUNG PRÜFEN...',
    paymentVerifyFailed:
      'Zahlung noch nicht vom Server bestätigt. Bitte warten Sie kurz und versuchen Sie es erneut.',
    paymentPendingMsg:
      'Zahlung wird von Telegram verarbeitet. Der Zugang wird nach Bestätigung freigeschaltet.',
    guideIntro:
      'Der Itten-Farbkreis (RYB) ist das klassische Werkzeug zur Farbharmonisierung. Im Gegensatz zum digitalen RGB/HSL-Modell bilden hier Rot–Grün, Blau–Orange und Gelb–Violett echte Komplementärpaare für Leder und Wildleder.',
    guideBalanceTitle: 'Die Balance-Regel',
    guideBalance:
      '60 % — Hauptfarbe (meist neutral oder der dominierende Lederton).\n30 % — Unterstützende Farbe (Futter, Zunge, Fersenkappe).\n10 % — Akzent (Nähte, Logo, Metallbeschläge, Sohle).',
    guideSchemesTitle: 'Farbschemata & Anwendung',
    guideComplementary:
      'Komplementär — zwei gegenüberliegende Farben. Ergibt einen starken, energetischen Kontrast. Gut für Sport- und Fashion-Schuhe, bei denen ein leuchtender Akzent auf neutralem Grund benötigt wird.',
    guideAnalogous:
      'Analog — benachbarte Farben auf dem Kreis. Schafft einen weichen, ruhigen Übergang. Ideal für klassische und Freizeitschuhe, wenn man eine reiche Tonalität ohne Härte wünscht.',
    guideTriadic:
      'Triadisch — drei Farben im 120°-Abstand. Lebendig und ausgewogen. Geeignet für Capsule-Kollektionen und saisonale Farbgeschichten.',
    guideTetradic:
      'Tetradisch (Quadrat) — vier Farben im 90°-Abstand. Das lebhafteste Schema. Verwenden Sie einen dominierenden Ton, zwei unterstützende und einen reinen Akzent, sonst wird die Komposition zu bunt.',
    guideRectangular:
      'Tetradisch (Rechteck) — zwei komplementäre Paare mit Verschiebung. Weicher als das Quadrat, bietet mehr Raum für Nuancen. Funktioniert hervorragend bei Premium- und Designerschuhen.',
    guideSplit:
      'Split-Komplementär — Hauptfarbe + die zwei Nachbarn ihrer Komplementärfarbe. Kontrast ist vorhanden, aber weicher als rein komplementär. Eine universelle Wahl für die meisten Modelle.',
    guideMono:
      'Monochromatisch — eine Farbe in verschiedenen Tönen und Sättigungen. Das eleganteste und „teuerste“ Schema. Ideal für Minimalismus, Abendschuhe und wenn das Leder an sich schon ausdrucksstark ist.',
    guideFootwearTitle: 'Besonderheiten bei Schuhen',
    guideFootwear:
      '• Obermaterial: Hauptfarbe (60–70 %).\n• Futter und Innensohle: unterstützender oder hellerer Ton.\n• Sohle und Absatz: oft neutral oder Akzent.\n• Beschläge und Nähte: der reinste und hellste Akzent (5–10 %).\n• Schwarz und Weiß sind keine „Farblosigkeit“, sondern mächtige Werkzeuge für Kontrast und Form.',
    guideTip:
      'Tipp: Tippen Sie unten auf ein beliebiges Farbfeld oder die 13-Zonen-Leiste, um den exakten HEX-Code direkt in die Zwischenablage zu kopieren.',
  },
}

export type TranslationDict = {
  [K in keyof (typeof TRANSLATIONS)['ru']]: string
}

/**
 * ИСПРАВЛЕНО (AUDIT-05): Динамическое формирование подписей свотчей в точном соответствии
 * с текущим пресетом распределения цветов (mappingPreset).
 */
export function getPresetSwatchLabels(
  preset: FootwearMappingPreset,
  isTetrad: boolean,
  t: TranslationDict
): { ratioLabels: string[]; roleLabels: string[] } {
  const ratioLabels = isTetrad
    ? [t.main55, t.secondary20, t.secondary15, t.accent10]
    : [t.main60, t.secondary30, t.accent10]

  switch (preset) {
    case 'toe-focus':
      return {
        ratioLabels,
        roleLabels: isTetrad
          ? [t.roleToeMain, t.roleToeSecondary, t.roleToeLining, t.roleToeAccent]
          : [t.roleToeMain, t.roleToeSecondary, t.roleToeAccent],
      }
    case 'split-quarter':
      return {
        ratioLabels,
        roleLabels: isTetrad
          ? [t.roleSplitMain, t.roleSplitSecondary, t.roleSplitLining, t.roleSplitAccent]
          : [t.roleSplitMain, t.roleSplitSecondary, t.roleSplitAccent],
      }
    case 'neutral-sole':
      return {
        ratioLabels,
        roleLabels: isTetrad
          ? [t.roleClassicUpper, t.roleClassicDetails, t.roleClassicLining, t.roleNeutralAccent]
          : [t.roleClassicUpper, t.roleClassicDetailsAll, t.roleNeutralAccent],
      }
    case 'classic':
    default:
      return {
        ratioLabels,
        roleLabels: isTetrad
          ? [t.roleClassicUpper, t.roleClassicDetails, t.roleClassicLining, t.roleClassicAccent]
          : [t.roleClassicUpper, t.roleClassicDetailsAll, t.roleClassicAccent],
      }
  }
}

/* ============================================================================
   6. ОСНОВНОЙ КОМПОНЕНТ СТРАНИЦЫ ЦВЕТОВ (КОМПАКТНЫЙ STUDIO РЕДАКТОР)
   ============================================================================ */
export function ColorsPage({ onBack, lang, setLang }: ColorsPageProps) {
  // ИСПРАВЛЕНО (AUDIT-02): Безопасная нормализация входного пропа lang
  const [localLang, setLocalLang] = useState<SupportedLang>(() => normalizeSupportedLang(lang))
  useEffect(() => {
    setLocalLang(normalizeSupportedLang(lang))
  }, [lang])

  const [scheme, setScheme] = useState<Scheme>('complementary')
  const [modelMode, setModelMode] = useState<ColorModelMode>('ryb')
  const [mappingPreset, setMappingPreset] = useState<FootwearMappingPreset>('classic')

  const [baseHue, setBaseHue] = useState(194)
  const [whiteAmount, setWhiteAmount] = useState(0.05)
  const [blackAmount, setBlackAmount] = useState(0.05)
  const [chromaAmount, setChromaAmount] = useState(0.85)

  const [copiedHex, setCopiedHex] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  // ИСПРАВЛЕНО (AUDIT-01): Строгий платёжный автомат без ложной разблокировки и без вечной блокировки UI
  const [paymentState, setPaymentState] = useState<PaymentState>('idle')
  const [paymentErrorMsg, setPaymentErrorMsg] = useState<string | null>(null)
  const [showProModal, setShowProModal] = useState(false)
  const isProPurchased = paymentState === 'purchased'
  // Модальное окно блокируется ТОЛЬКО на время активного сетевого запроса создания/проверки
  const isPaymentBusy =
    paymentState === 'creating_invoice' || paymentState === 'verifying_payment'

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  const wheelRef = useRef<HTMLDivElement>(null)
  const proModalCloseRef = useRef<HTMLButtonElement>(null)
  const guideCloseRef = useRef<HTMLButtonElement>(null)
  const isDragging = useRef(false)
  const lastHapticHue = useRef(194)

  // Всегда гарантированный словарь переводов с фоллбэком на русский (AUDIT-02)
  const t: TranslationDict = TRANSLATIONS[normalizeSupportedLang(localLang)] ?? TRANSLATIONS.ru

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!showProModal && !showGuide) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      if (showProModal) proModalCloseRef.current?.focus()
      else if (showGuide) guideCloseRef.current?.focus()
    }, 50)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showProModal && !isPaymentBusy) {
          setShowProModal(false)
          if (paymentState === 'invoice_open') setPaymentState('idle')
        }
        if (showGuide) setShowGuide(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [showProModal, showGuide, isPaymentBusy, paymentState])

  const verifyPurchaseOnServer = useCallback(async (): Promise<boolean> => {
    const tg = getTelegramWebApp()
    const userId = tg?.initDataUnsafe?.user?.id
    const rawInitData = tg?.initData || ''
    if (!userId) return false

    try {
      const res = await fetch(
        `/api/check-purchase?userId=${encodeURIComponent(String(userId))}&productId=pro_colors`,
        {
          method: 'GET',
          headers: rawInitData ? { 'X-Telegram-Init-Data': rawInitData } : undefined,
        }
      )
      if (!res.ok) return false
      const data = (await res.json()) as { purchased?: boolean }
      if (data.purchased === true) {
        setPaymentState('purchased')
        return true
      }
      return false
    } catch (err) {
      console.error('Ошибка проверки покупки:', err)
      return false
    }
  }, [])

  useEffect(() => {
    void verifyPurchaseOnServer()
  }, [verifyPurchaseOnServer])

  // ИСПРАВЛЕНО (AUDIT-01): Проверка булева результата verified перед разблокировкой PRO
  // и корректный выход из состояния 'pending' без зависания модального окна
  const handleProClick = async () => {
    if (isPaymentBusy || paymentState === 'invoice_open' || isProPurchased) return
    const tg = getTelegramWebApp()
    const userId = tg?.initDataUnsafe?.user?.id
    const rawInitData = tg?.initData || ''

    if (!userId || !tg?.openInvoice) {
      setPaymentErrorMsg('Откройте приложение внутри Telegram для оплаты Stars.')
      return
    }

    setPaymentErrorMsg(null)
    setPaymentState('creating_invoice')
    haptic('light')

    try {
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(rawInitData ? { 'X-Telegram-Init-Data': rawInitData } : {}),
        },
        body: JSON.stringify({
          userId,
          productId: 'pro_colors',
          initData: rawInitData,
        }),
      })

      const data = (await response.json()) as {
        invoiceLink?: string
        error?: string
        alreadyPurchased?: boolean
      }

      if (response.status === 409 && data.alreadyPurchased) {
        haptic('heavy')
        setPaymentState('purchased')
        setShowProModal(false)
        return
      }

      if (!response.ok || !data.invoiceLink) {
        throw new Error(data.error || 'Не удалось создать счёт')
      }

      setPaymentState('invoice_open')

      tg.openInvoice(data.invoiceLink, async (status: string) => {
        if (status === 'paid') {
          setPaymentState('verifying_payment')
          let verified = await verifyPurchaseOnServer()
          if (!verified) {
            await new Promise((r) => setTimeout(r, 850))
            verified = await verifyPurchaseOnServer()
          }
          if (!verified) {
            await new Promise((r) => setTimeout(r, 1200))
            verified = await verifyPurchaseOnServer()
          }

          if (verified) {
            haptic('heavy')
            setPaymentState('purchased')
            setShowProModal(false)
          } else {
            setPaymentState('failed')
            setPaymentErrorMsg(t.paymentVerifyFailed)
          }
        } else if (status === 'pending') {
          setPaymentState('verifying_payment')
          let verified = await verifyPurchaseOnServer()
          if (!verified) {
            await new Promise((r) => setTimeout(r, 900))
            verified = await verifyPurchaseOnServer()
          }

          if (verified) {
            haptic('heavy')
            setPaymentState('purchased')
            setShowProModal(false)
          } else {
            // Снимаем блокировку isPaymentBusy, чтобы пользователь мог закрыть окно
            setPaymentState('idle')
            setPaymentErrorMsg(t.paymentPendingMsg)
          }
        } else if (status === 'cancelled' || status === 'closed') {
          setPaymentState('idle')
        } else {
          setPaymentState('failed')
          setPaymentErrorMsg('Оплата не была завершена. Попробуйте снова.')
        }
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(error)
      setPaymentState('failed')
      setPaymentErrorMsg(`Сбой создания счёта: ${message}`)
    }
  }

  // ИСПРАВЛЕНО (AUDIT-02): Явная проверка поддерживаемых в App.tsx языков через функцию-гард isAppNativeLang
  const handleLangChange = (newLang: SupportedLang) => {
    const safe = normalizeSupportedLang(newLang)
    try {
      localStorage.setItem('cordwainer_lang', safe)
      localStorage.setItem('app_lang', safe)
    } catch {}
    setLocalLang(safe)
    if (isAppNativeLang(safe)) {
      setLang(safe)
    }
  }

  const handleSchemeClick = (s: Scheme) => {
    const isFree = s === 'complementary' || s === 'analogous'
    if (!isFree && !isProPurchased) {
      haptic('medium')
      setPaymentErrorMsg(null)
      setShowProModal(true)
      return
    }
    haptic('light')
    setScheme(s)
  }

  const handleResetAll = useCallback(() => {
    setBaseHue(194)
    setWhiteAmount(0.05)
    setBlackAmount(0.05)
    setChromaAmount(0.85)
    setMappingPreset('classic')
  }, [])

  const handleCopyHex = useCallback((hex: string) => {
    haptic('light')
    setCopiedHex(hex)
    try {
      void navigator.clipboard?.writeText(hex)
    } catch {}
    window.setTimeout(() => {
      setCopiedHex((prev) => (prev === hex ? null : prev))
    }, 1500)
  }, [])

  const schemeHues = useMemo(() => getSchemeWheelAngles(baseHue, scheme), [baseHue, scheme])

  const colors = useMemo(
    () =>
      generateHarmonyPalette(
        baseHue,
        whiteAmount,
        blackAmount,
        chromaAmount,
        scheme,
        modelMode
      ),
    [baseHue, whiteAmount, blackAmount, chromaAmount, scheme, modelMode]
  )

  const sneakerColors = useMemo(
    () =>
      mapPaletteToFootwear(
        colors,
        baseHue,
        whiteAmount,
        blackAmount,
        chromaAmount,
        modelMode,
        mappingPreset,
        isDark
      ),
    [colors, baseHue, whiteAmount, blackAmount, chromaAmount, modelMode, mappingPreset, isDark]
  )

  // ИСПРАВЛЕНО (AUDIT-08): Оценка контраста учитывает все цвета палитры (включая colors[2] в тетрадах),
  // хроматический контраст OKLab и реально граничащие на кроссовке детали в активном mappingPreset
  const harmonyEvaluation = useMemo(() => {
    const pairScores: number[] = []
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        pairScores.push(getPerceptualPairContrast(colors[i], colors[j]))
      }
    }
    // Контраст фактически соприкасающихся конструктивных узлов обуви
    pairScores.push(getPerceptualPairContrast(sneakerColors.vamp, sneakerColors.toeBox))
    pairScores.push(getPerceptualPairContrast(sneakerColors.quarters, sneakerColors.swoosh))
    pairScores.push(getPerceptualPairContrast(sneakerColors.vamp, sneakerColors.quarters))
    pairScores.push(getPerceptualPairContrast(sneakerColors.heel, sneakerColors.collar))

    const maxContrast = Math.max(...pairScores, 1.0)

    const statusLabel =
      maxContrast < 1.55
        ? t.contrastSoft
        : maxContrast > 4.6
          ? t.contrastHigh
          : t.contrastOptimal

    return {
      ratioText: `${maxContrast.toFixed(1)}:1`,
      statusLabel,
    }
  }, [colors, sneakerColors, t.contrastSoft, t.contrastHigh, t.contrastOptimal])

  const isTetrad = scheme === 'tetradic' || scheme === 'rectangular'

  const { ratioLabels, roleLabels } = useMemo(
    () => getPresetSwatchLabels(mappingPreset, isTetrad, t),
    [mappingPreset, isTetrad, t]
  )

  // Полный список 13 конструктивных зон для техкарты (AUDIT-05)
  const allZonesSpec = useMemo(
    (): { key: SneakerZoneKey; label: string; hex: string }[] => [
      { key: 'vamp', label: t.zone_vamp, hex: sneakerColors.vamp },
      { key: 'toeBox', label: t.zone_toeBox, hex: sneakerColors.toeBox },
      { key: 'quarters', label: t.zone_quarters, hex: sneakerColors.quarters },
      { key: 'eyestays', label: t.zone_eyestays, hex: sneakerColors.eyestays },
      { key: 'heel', label: t.zone_heel, hex: sneakerColors.heel },
      { key: 'collar', label: t.zone_collar, hex: sneakerColors.collar },
      { key: 'tongue', label: t.zone_tongue, hex: sneakerColors.tongue },
      { key: 'lining', label: t.zone_lining, hex: sneakerColors.lining },
      { key: 'swoosh', label: t.zone_swoosh, hex: sneakerColors.swoosh },
      { key: 'midsole', label: t.zone_midsole, hex: sneakerColors.midsole },
      { key: 'encap', label: t.zone_encap, hex: sneakerColors.encap },
      { key: 'outsole', label: t.zone_outsole, hex: sneakerColors.outsole },
      { key: 'laces', label: t.zone_laces, hex: sneakerColors.laces },
    ],
    [sneakerColors, t]
  )

  const wheelBackground = useMemo(() => {
    const stops: string[] = []
    for (let deg = 0; deg <= 360; deg += 30) {
      const displayHue = modelMode === 'ryb' ? rybHueToRgbHue(deg) : deg
      stops.push(`hsl(${displayHue.toFixed(1)}, 90%, 50%)`)
    }
    return `conic-gradient(from 0deg, ${stops.join(', ')})`
  }, [modelMode])

  // ИСПРАВЛЕНО (AUDIT-10): Единый обработчик Pointer Events с кратчайшей угловой дистанцией по модулю 360°
  const updateFromClientXY = useCallback((clientX: number, clientY: number) => {
    const el = wheelRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy

    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    angle = Math.round((angle + 90 + 360) % 360) % 360

    if (getCircularAngleDiff(angle, lastHapticHue.current) >= 15) {
      haptic('light')
      lastHapticHue.current = angle
    }

    setBaseHue(angle)
  }, [])

  const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    updateFromClientXY(e.clientX, e.clientY)
  }

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    updateFromClientXY(e.clientX, e.clientY)
  }

  const handleWheelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleWheelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 15 : 5
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      haptic('light')
      setBaseHue((h) => (h + step) % 360)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      haptic('light')
      setBaseHue((h) => (h - step + 360) % 360)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setBaseHue(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setBaseHue(180)
    }
  }

  const SCHEMES: Scheme[] = [
    'complementary',
    'analogous',
    'triadic',
    'tetradic',
    'rectangular',
    'split-complementary',
    'monochromatic',
  ]

  const PRESETS: { id: FootwearMappingPreset; label: string }[] = [
    { id: 'classic', label: t.presetClassic },
    { id: 'toe-focus', label: t.presetToe },
    { id: 'split-quarter', label: t.presetSplit },
    { id: 'neutral-sole', label: t.presetNeutral },
  ]

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/55' : 'text-[#1C1816]/55'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`relative min-h-[100dvh] w-full flex flex-col justify-between transition-colors duration-700 ${cBg} ${cText}`}
    >
      <style>{`
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        input[type=range] {
          -webkit-appearance: none;
          background: transparent;
          touch-action: pan-x;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 2px;
          background: ${isDark ? 'rgba(244,240,232,0.22)' : 'rgba(28,24,22,0.22)'};
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 50%;
          background: ${isDark ? '#F4F0E8' : '#1C1816'};
          margin-top: -6px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        }
      `}</style>

      {/* КОМПАКТНЫЙ ВЕРХНИЙ ХЕДЕР */}
      <header className="px-4 pt-3 pb-1.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className={`group flex items-center gap-1.5 text-[10px] font-sans uppercase tracking-[0.18em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors`}
          >
            <span className="transform transition-transform group-hover:-translate-x-0.5">←</span>
            <span>Back</span>
          </button>
          <span className={`h-3 w-px ${isDark ? 'bg-white/15' : 'bg-black/15'}`} />
          <h1 className="font-serif text-xl sm:text-2xl tracking-[-0.02em] leading-none">
            {t.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              haptic('light')
              setModelMode((m) => (m === 'ryb' ? 'hsl' : 'ryb'))
            }}
            className={`px-2 py-0.5 border ${cLine} text-[8px] font-sans uppercase tracking-[0.18em] outline-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors`}
            title="Переключить математическую модель круга (RYB Иттена / HSL)"
          >
            {modelMode === 'ryb' ? 'RYB' : 'HSL'}
          </button>

          <div className="flex items-center gap-2">
            {(['ru', 'uk', 'de'] as SupportedLang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => handleLangChange(l)}
                className={`text-[9px] font-sans uppercase tracking-[0.2em] outline-none border-0 bg-transparent cursor-pointer transition-colors ${
                  localLang === l ? `${cText} font-semibold` : cTextMuted
                } ${cHover}`}
              >
                {l === 'uk' ? 'UKR' : l}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className={`px-2 py-0.5 border ${cLine} text-[9px] font-sans uppercase tracking-[0.18em] outline-none bg-transparent cursor-pointer ${cText} transition-colors`}
          >
            {t.guideBtn}
          </button>
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <div className="flex-1 flex flex-col justify-between px-4 pb-2.5 max-w-2xl mx-auto w-full">
        {/* 1. ПОЛОСА СХЕМ ГАРМОНИИ */}
        <div className={`flex overflow-x-auto gap-5 py-1.5 border-y ${cLine} scrollbar-hide`}>
          {SCHEMES.map((s) => {
            const isFree = s === 'complementary' || s === 'analogous'
            const isLocked = !isFree && !isProPurchased

            return (
              <button
                key={s}
                type="button"
                onClick={() => handleSchemeClick(s)}
                className={`flex items-center gap-1 text-[9px] font-sans uppercase tracking-[0.2em] whitespace-nowrap transition-all duration-200 outline-none border-none bg-transparent cursor-pointer ${
                  scheme === s
                    ? `italic font-semibold ${cText} opacity-100`
                    : `${cTextMuted} opacity-65 hover:opacity-100`
                }`}
              >
                {isLocked && (
                  <span className="text-[#FFB020]">
                    <LockIcon size={8} />
                  </span>
                )}
                {t[s]}
              </button>
            )
          })}
        </div>

        {/* 1.5. ПЕРЕКЛЮЧАТЕЛЬ СХЕМ РАСПРЕДЕЛЕНИЯ ЦВЕТОВ ПО КОНСТРУКЦИИ + ИНДИКАТОР КОНТРАСТА */}
        <div className="flex items-center justify-between gap-2 pt-1.5">
          <div className="flex overflow-x-auto gap-1.5 scrollbar-hide">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  haptic('light')
                  setMappingPreset(p.id)
                }}
                className={`px-2 py-0.5 text-[7.5px] font-sans uppercase tracking-[0.16em] whitespace-nowrap border transition-colors cursor-pointer bg-transparent ${
                  mappingPreset === p.id
                    ? `${cLine} ${cText} font-semibold`
                    : `border-transparent ${cTextMuted} ${cHover}`
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <span
            className={`text-[7.5px] font-sans uppercase tracking-[0.14em] whitespace-nowrap ${cTextMuted}`}
          >
            ΔE {harmonyEvaluation.ratioText} • {harmonyEvaluation.statusLabel}
          </span>
        </div>

        {/* 2. 3D-МОДЕЛЬ LOW-TOP КРОССОВКА (NEW BALANCE 574) */}
        <div className="my-0.5">
          <Sneaker3D
            sneakerColors={sneakerColors}
            isDark={isDark}
            onResetAll={handleResetAll}
            resetLabel={t.resetBtn}
            loading3DLabel={t.loading3D}
            webglFallbackLabel={t.webglFallback}
          />
        </div>

        {/* 3. КОМПАКТНЫЙ ПУЛЬТ: КРУГ ИТТЕНА СЛЕВА + 3 ПОЛЗУНКА (TINT / SHADE / CHROMA) СПРАВА */}
        <div
          className={`grid grid-cols-[114px_1fr] sm:grid-cols-[136px_1fr] gap-4 items-center py-2 border-t ${cLine}`}
        >
          <div className="flex flex-col items-center">
            <div
              ref={wheelRef}
              role="slider"
              tabIndex={0}
              aria-label={modelMode === 'ryb' ? t.ittenLabel : t.hslLabel}
              aria-valuemin={0}
              aria-valuemax={359}
              aria-valuenow={baseHue}
              className="relative w-[98px] h-[98px] sm:w-[118px] sm:h-[118px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none focus:outline-none focus:ring-1 focus:ring-current/40"
              style={{
                background: wheelBackground,
                touchAction: 'none',
                boxShadow: `0 0 0 1px ${
                  isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
                }, 0 6px 18px rgba(0,0,0,0.16)`,
              }}
              onPointerDown={handleWheelPointerDown}
              onPointerMove={handleWheelPointerMove}
              onPointerUp={handleWheelPointerUp}
              onPointerCancel={handleWheelPointerUp}
              onKeyDown={handleWheelKeyDown}
            >
              <div
                className="absolute inset-[24%] rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 35% 32%, white 0%, ${colors[0]} 42%, #111 95%)`,
                  boxShadow:
                    'inset -3px -3px 8px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)',
                }}
              />

              {schemeHues.slice(1).map((hAngle, idx) => {
                const dotHue = modelMode === 'ryb' ? rybHueToRgbHue(hAngle) : hAngle
                return (
                  <div
                    key={idx}
                    className="absolute inset-0 pointer-events-none"
                    style={{ transform: `rotate(${hAngle}deg)` }}
                  >
                    <div
                      className="absolute top-[4px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-white/90 shadow-sm"
                      style={{ backgroundColor: `hsl(${dotHue}, 85%, 50%)` }}
                    />
                  </div>
                )
              })}

              <div
                className="absolute inset-0 pointer-events-none"
                style={{ transform: `rotate(${baseHue}deg)` }}
              >
                <div
                  className="absolute top-[2px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-[1.5px] border-white shadow-md"
                  style={{
                    backgroundColor: `hsl(${
                      modelMode === 'ryb' ? rybHueToRgbHue(baseHue) : baseHue
                    }, 85%, 50%)`,
                  }}
                />
              </div>
            </div>
            <span
              className={`mt-1.5 text-[7.5px] font-sans tracking-[0.2em] uppercase ${cTextMuted}`}
            >
              {modelMode === 'ryb' ? t.ittenLabel : t.hslLabel} • {baseHue}°
            </span>
          </div>

          <div className="flex flex-col justify-center gap-2.5 pr-1">
            <div>
              <label
                htmlFor="slider-tint-white"
                className={`flex justify-between text-[8px] font-sans uppercase tracking-[0.18em] mb-1 ${cTextMuted}`}
              >
                <span>{t.pure}</span>
                <span>
                  {t.white} ({Math.round(whiteAmount * 100)}%)
                </span>
              </label>
              <input
                id="slider-tint-white"
                aria-label={t.white}
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={whiteAmount}
                onChange={(e) => setWhiteAmount(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label
                htmlFor="slider-shade-black"
                className={`flex justify-between text-[8px] font-sans uppercase tracking-[0.18em] mb-1 ${cTextMuted}`}
              >
                <span>{t.pure}</span>
                <span>
                  {t.black} ({Math.round(blackAmount * 100)}%)
                </span>
              </label>
              <input
                id="slider-shade-black"
                aria-label={t.black}
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={blackAmount}
                onChange={(e) => setBlackAmount(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label
                htmlFor="slider-chroma-sat"
                className={`flex justify-between text-[8px] font-sans uppercase tracking-[0.18em] mb-1 ${cTextMuted}`}
              >
                <span>Muted</span>
                <span>
                  {t.chroma} ({Math.round(chromaAmount * 100)}%)
                </span>
              </label>
              <input
                id="slider-chroma-sat"
                aria-label={t.chroma}
                type="range"
                min="0.15"
                max="1"
                step="0.01"
                value={chromaAmount}
                onChange={(e) => setChromaAmount(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* 4. СВОТЧИ ПАЛИТРЫ ПО ЗОНАМ КРОССОВКА (СИНХРОНИЗИРОВАНЫ С MAPPING PRESET) */}
        <div className={`grid gap-2.5 pt-1.5 ${isTetrad ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {colors.map((c, i) => {
            const isCopied = copiedHex === c
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleCopyHex(c)}
                className="flex flex-col text-left bg-transparent border-0 p-0 cursor-pointer group outline-none"
                title={`Скопировать ${c}`}
              >
                <div
                  className={`relative w-full h-8 sm:h-10 mb-1 rounded-[2px] shadow-sm border transition-transform duration-150 group-active:scale-[0.98] flex items-end justify-between px-1.5 pb-1 ${
                    isDark ? 'border-white/15' : 'border-black/10'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  <span className="px-1 py-[1px] text-[7.5px] font-mono tracking-wider rounded-[1px] bg-black/45 text-white/95 backdrop-blur-[2px]">
                    {isCopied ? t.copied : c}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-1 w-full">
                  <span
                    className={`text-[9px] font-sans font-semibold uppercase tracking-[0.15em] ${cText}`}
                  >
                    {ratioLabels[i]}
                  </span>
                  <span
                    className={`text-[7.5px] font-sans uppercase tracking-[0.08em] truncate ${cTextMuted}`}
                  >
                    {roleLabels[i]}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* 4.5. ПОЛНАЯ ПРОИЗВОДСТВЕННАЯ ТЕХКАРТА ВСЕХ 13 ЗОН МОДЕЛИ (AUDIT-05) */}
        <div className={`mt-2 pt-1.5 border-t ${cLine}`}>
          <div className="flex overflow-x-auto gap-1.5 pb-0.5 scrollbar-hide">
            {allZonesSpec.map((item) => {
              const isZoneCopied = copiedHex === `${item.key}:${item.hex}`
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    haptic('light')
                    setCopiedHex(`${item.key}:${item.hex}`)
                    try {
                      void navigator.clipboard?.writeText(item.hex)
                    } catch {}
                    window.setTimeout(() => {
                      setCopiedHex((prev) => (prev === `${item.key}:${item.hex}` ? null : prev))
                    }, 1400)
                  }}
                  className={`flex items-center gap-1.5 px-1.5 py-0.5 border ${cLine} rounded-[2px] bg-transparent cursor-pointer shrink-0 transition-opacity hover:opacity-100 opacity-85`}
                  title={`${item.label}: ${item.hex}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-[1px] border border-current/20 shrink-0"
                    style={{ backgroundColor: item.hex }}
                  />
                  <span className={`text-[7px] font-sans uppercase tracking-[0.1em] ${cText}`}>
                    {item.label}
                  </span>
                  <span className={`text-[7px] font-mono ${cTextMuted}`}>
                    {isZoneCopied ? t.copied : item.hex}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 5. РЕДАКЦИОННАЯ ПОДПИСЬ */}
        <div className={`mt-2 pt-1.5 border-t ${cLine} flex items-center justify-between`}>
          <p className={`font-serif text-[12px] italic ${cTextMuted}`}>{t.quote}</p>
          <span className={`text-[8px] font-sans font-bold uppercase tracking-[0.32em] ${cText}`}>
            Cordwainer
          </span>
        </div>
      </div>

      {/* МОДАЛКА PRO ДОСТУПА */}
      <AnimatePresence>
        {showProModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pro-modal-title"
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#000000]/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-[340px] p-8 border ${cLine} ${
                isDark ? 'bg-[#111111]' : 'bg-[#EAE6DF]'
              } shadow-2xl flex flex-col overflow-hidden`}
            >
              <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l ${cLine}`} />
              <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${cLine}`} />
              <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${cLine}`} />
              <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r ${cLine}`} />

              <button
                ref={proModalCloseRef}
                type="button"
                disabled={isPaymentBusy}
                onClick={() => {
                  setShowProModal(false)
                  if (paymentState === 'invoice_open') setPaymentState('idle')
                }}
                aria-label={t.guideClose}
                className={`absolute top-4 right-4 ${cTextMuted} hover:text-current bg-transparent border-0 cursor-pointer disabled:opacity-40`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              <div className={`flex justify-center mb-5 ${cTextMuted} opacity-50`}>
                <LockIcon size={32} />
              </div>

              <h3
                id="pro-modal-title"
                className={`font-serif text-2xl tracking-tight mb-4 text-center ${cText}`}
              >
                {t.paywallTitle}
              </h3>

              <p
                className={`text-[12px] font-sans font-light leading-relaxed mb-6 text-center ${cTextMuted}`}
              >
                {t.paywallDesc}
              </p>

              {paymentErrorMsg && (
                <p className="text-[10px] font-sans text-amber-400 text-center mb-4">
                  {paymentErrorMsg}
                </p>
              )}

              <button
                type="button"
                onClick={handleProClick}
                disabled={isPaymentBusy || paymentState === 'invoice_open'}
                className={`group flex items-center justify-center gap-3 w-full py-4 border ${cLine} ${cText} hover:bg-current/5 active:scale-95 transition-all outline-none bg-transparent cursor-pointer disabled:opacity-50`}
              >
                {isPaymentBusy || paymentState === 'invoice_open' ? (
                  <span className="text-[10px] font-sans uppercase tracking-[0.2em] animate-pulse">
                    {paymentState === 'verifying_payment' ? t.verifying : t.loading}
                  </span>
                ) : (
                  <>
                    <LockIcon size={14} />
                    <span className="text-[10px] font-sans uppercase tracking-[0.2em]">
                      {t.paywallBtn}
                    </span>
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY: ГИД */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="color-guide-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed inset-0 z-[90] flex flex-col ${cBg} ${cText} overflow-hidden`}
          >
            <div className="px-6 pt-10 pb-6 flex items-start justify-between shrink-0">
              <h2
                id="color-guide-title"
                className="font-serif text-[12vw] min-[400px]:text-5xl leading-none tracking-tight"
              >
                {t.guideTitle}
              </h2>
              <button
                ref={guideCloseRef}
                type="button"
                onClick={() => setShowGuide(false)}
                className={`text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors mt-2`}
              >
                {t.guideClose}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide space-y-12">
              <p className="text-[14px] min-[400px]:text-[16px] leading-[1.8] font-light max-w-lg">
                {t.guideIntro}
              </p>

              <div>
                <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-6 ${cTextMuted}`}>
                  {t.guideBalanceTitle}
                </h3>
                <p
                  className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] whitespace-pre-line font-light border-l border-current/20 pl-5 max-w-lg`}
                >
                  {t.guideBalance}
                </p>
              </div>

              <div>
                <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-8 ${cTextMuted}`}>
                  {t.guideSchemesTitle}
                </h3>
                <div className="space-y-8 max-w-lg">
                  {[
                    { title: t.complementary, text: t.guideComplementary },
                    { title: t.analogous, text: t.guideAnalogous },
                    { title: t.triadic, text: t.guideTriadic },
                    { title: t.tetradic, text: t.guideTetradic },
                    { title: t.rectangular, text: t.guideRectangular },
                    { title: t['split-complementary'], text: t.guideSplit },
                    { title: t.monochromatic, text: t.guideMono },
                  ].map((item) => (
                    <div key={item.title}>
                      <div className="font-serif text-[22px] min-[400px]:text-[26px] leading-[1.2] mb-3">
                        {item.title}
                      </div>
                      <p
                        className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] font-light ${cTextMuted}`}
                      >
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-6 ${cTextMuted}`}>
                  {t.guideFootwearTitle}
                </h3>
                <p
                  className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] whitespace-pre-line font-light border-l border-current/20 pl-5 max-w-lg`}
                >
                  {t.guideFootwear}
                </p>
              </div>

              <div className={`pt-8 border-t ${cLine} max-w-lg`}>
                <p
                  className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] font-light italic ${cTextMuted}`}
                >
                  {t.guideTip}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
