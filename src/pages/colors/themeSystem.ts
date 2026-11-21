import { getRelativeLuminance, normalizeHex } from './colorEngine'
import {
  hapticHarmony,
  hapticReset,
  hapticSave,
  hapticSwatch,
  hapticTap,
  isHapticsEnabled,
  setHapticsEnabled,
} from './haptics'

export type ThemeMode = 'day' | 'night' | 'auto'

export type StudioBgId = 'cream' | 'white' | 'light-gray' | 'graphite' | 'black' | 'custom'

export type StudioBgConfig = {
  id: StudioBgId
  customHex: string
  autoContrast: boolean
}

export type StudioBgPreset = {
  id: Exclude<StudioBgId, 'custom'>
  hex: string
}

export const STUDIO_BG_PRESETS: readonly StudioBgPreset[] = [
  { id: 'cream', hex: '#F4F1EA' },
  { id: 'white', hex: '#FFFFFF' },
  { id: 'light-gray', hex: '#E6E3DC' },
  { id: 'graphite', hex: '#232220' },
  { id: 'black', hex: '#0E0E10' },
]

export const DEFAULT_STUDIO_BG: StudioBgConfig = {
  id: 'cream',
  customHex: '#F4F1EA',
  autoContrast: true,
}

let activeStudioBgOverride: StudioBgConfig | null = null

export function setActiveStudioBg(cfg: StudioBgConfig): void {
  activeStudioBgOverride = cfg
}

export type ThemeTokens = {
  isDark: boolean
  pageBg: string
  headerBg: string
  cardBg: string
  elevatedBg: string
  trackBg: string
  ink: string
  muted: string
  subtle: string
  border: string
  strongBorder: string
  activeTintBg: string
  activeTintBorder: string
  activeTintInk: string
  primaryBtnBg: string
  primaryBtnInk: string
  shadowCard: string
  shadowSoft: string
}

export const DAY_TOKENS: ThemeTokens = {
  isDark: false,
  pageBg: '#F4F1EA',
  headerBg: '#F4F1EA',
  cardBg: '#FAF8F4',
  elevatedBg: '#EFECE4',
  trackBg: '#DFDAD0',
  ink: '#181613',
  muted: '#666057',
  subtle: '#8F887E',
  border: 'rgba(24, 22, 19, 0.10)',
  strongBorder: 'rgba(24, 22, 19, 0.20)',
  activeTintBg: '#EAE3D5',
  activeTintBorder: '#8F6F47',
  activeTintInk: '#181613',
  primaryBtnBg: '#181613',
  primaryBtnInk: '#F7F4EE',
  shadowCard: '0 1px 2px rgba(24, 22, 19, 0.04)',
  shadowSoft: 'none',
}

export const NIGHT_TOKENS: ThemeTokens = {
  isDark: true,
  pageBg: '#0B0B0C',
  headerBg: '#0B0B0C',
  cardBg: '#131315',
  elevatedBg: '#1B1B1E',
  trackBg: '#2A2A2E',
  ink: '#F4F0E8',
  muted: '#9C968C',
  subtle: '#6E6961',
  border: 'rgba(244, 240, 232, 0.09)',
  strongBorder: 'rgba(244, 240, 232, 0.18)',
  activeTintBg: '#231F1A',
  activeTintBorder: '#C6A477',
  activeTintInk: '#F4F0E8',
  primaryBtnBg: '#F4F0E8',
  primaryBtnInk: '#11100F',
  shadowCard: '0 1px 2px rgba(0, 0, 0, 0.3)',
  shadowSoft: 'none',
}

const THEME_KEY = 'cordwainer_theme_mode_v1'
const STUDIO_BG_KEY = 'cordwainer_studio_bg_v2'

export function loadThemeMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw === 'day' || raw === 'night' || raw === 'auto') return raw
    const legacy = localStorage.getItem('cordwainer_theme')
    if (legacy === 'light') return 'day'
    if (legacy === 'dark') return 'night'
  } catch {
    // ignore
  }
  return 'auto'
}

export function saveThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, mode)
    if (mode === 'day') localStorage.setItem('cordwainer_theme', 'light')
    else if (mode === 'night') localStorage.setItem('cordwainer_theme', 'dark')
    else localStorage.removeItem('cordwainer_theme')
  } catch {
    // ignore
  }
}

export function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'day') return false
  if (mode === 'night') return true
  if (typeof window !== 'undefined') {
    const tg = (window as unknown as { Telegram?: { WebApp?: { colorScheme?: string; initData?: string } } }).Telegram?.WebApp
    if (tg?.initData && tg.initData.trim().length > 0) {
      return tg.colorScheme === 'dark'
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true
    }
  }
  return false
}

export function getThemeTokens(isDark: boolean): ThemeTokens {
  return isDark ? NIGHT_TOKENS : DAY_TOKENS
}

export function loadStudioBg(): StudioBgConfig {
  try {
    const raw = localStorage.getItem(STUDIO_BG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StudioBgConfig>
      const validIds: StudioBgId[] = ['cream', 'white', 'light-gray', 'graphite', 'black', 'custom']
      const id = validIds.includes(parsed.id as StudioBgId) ? (parsed.id as StudioBgId) : 'cream'
      return {
        id,
        customHex: normalizeHex(parsed.customHex ?? '#F4F1EA', '#F4F1EA'),
        autoContrast: typeof parsed.autoContrast === 'boolean' ? parsed.autoContrast : true,
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_STUDIO_BG
}

export function saveStudioBg(cfg: StudioBgConfig): void {
  activeStudioBgOverride = cfg
  try {
    localStorage.setItem(STUDIO_BG_KEY, JSON.stringify(cfg))
  } catch {
    // ignore
  }
}

export function resolveStudioBgHex(cfg: StudioBgConfig): string {
  if (cfg.id === 'custom') return normalizeHex(cfg.customHex, '#F4F1EA')
  const found = STUDIO_BG_PRESETS.find((p) => p.id === cfg.id)
  return found ? found.hex : '#F4F1EA'
}

export function isStudioBgDark(hex: string): boolean {
  return getRelativeLuminance(hex) < 0.28
}

export type StudioStageStyle = {
  background: string
  backgroundColor: string
  bgHex: string
  hex: string
  isDarkStage: boolean
  isDark: boolean
  textColor: string
  mutedColor: string
  mutedTextColor: string
  labelColor: string
  borderColor: string
  dividerColor: string
  chipBg: string
  chipBorder: string
  chipText: string
  btnBg: string
  btnBorder: string
  btnText: string
  buttonBg: string
  buttonBorder: string
  buttonText: string
}

export function resolveStudioStageStyle(
  studioBg: string | StudioBgConfig | undefined,
  autoContrast = true,
  fallback?: boolean | ThemeTokens
): StudioStageStyle {
  let hex = '#F4F1EA'
  let useAuto = autoContrast

  if (activeStudioBgOverride) {
    hex = resolveStudioBgHex(activeStudioBgOverride)
    useAuto = activeStudioBgOverride.autoContrast
  } else if (typeof studioBg === 'string') {
    const preset = STUDIO_BG_PRESETS.find((p) => p.id === studioBg)
    hex = preset ? preset.hex : normalizeHex(studioBg, '#F4F1EA')
  } else if (studioBg && typeof studioBg === 'object') {
    hex = resolveStudioBgHex(studioBg)
    useAuto = studioBg.autoContrast
  }

  const fallbackDark = typeof fallback === 'boolean' ? fallback : Boolean(fallback?.isDark)
  const darkStage = useAuto ? isStudioBgDark(hex) : fallbackDark
  const textColor = darkStage ? '#F4F0E8' : '#181613'
  const mutedColor = darkStage ? 'rgba(244, 240, 232, 0.68)' : 'rgba(24, 22, 19, 0.58)'
  const borderColor = darkStage ? 'rgba(244, 240, 232, 0.14)' : 'rgba(24, 22, 19, 0.10)'
  const chipBg = darkStage ? 'rgba(19, 19, 21, 0.88)' : 'rgba(250, 248, 244, 0.92)'
  const chipBorder = darkStage ? 'rgba(244, 240, 232, 0.18)' : 'rgba(24, 22, 19, 0.14)'

  return {
    background: hex,
    backgroundColor: hex,
    bgHex: hex,
    hex,
    isDarkStage: darkStage,
    isDark: darkStage,
    textColor,
    mutedColor,
    mutedTextColor: mutedColor,
    labelColor: mutedColor,
    borderColor,
    dividerColor: borderColor,
    chipBg,
    chipBorder,
    chipText: textColor,
    btnBg: chipBg,
    btnBorder: chipBorder,
    btnText: textColor,
    buttonBg: chipBg,
    buttonBorder: chipBorder,
    buttonText: textColor,
  }
}

export function loadHapticsEnabled(): boolean {
  return isHapticsEnabled()
}

export function saveHapticsEnabled(enabled: boolean): void {
  setHapticsEnabled(enabled)
}

export type HapticKind = 'tap' | 'select' | 'harmony' | 'save' | 'reset'

export function triggerHaptic(kind: HapticKind, enabled = true): void {
  if (!enabled) return
  if (kind === 'select') hapticSwatch()
  else if (kind === 'harmony') hapticHarmony()
  else if (kind === 'save') hapticSave()
  else if (kind === 'reset') hapticReset()
  else hapticTap()
}
