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
  { id: 'cream', hex: '#F5F1EB' },
  { id: 'white', hex: '#FFFFFF' },
  { id: 'light-gray', hex: '#E7E5E0' },
  { id: 'graphite', hex: '#262523' },
  { id: 'black', hex: '#111112' },
]

export const DEFAULT_STUDIO_BG: StudioBgConfig = {
  id: 'cream',
  customHex: '#F5F1EB',
  autoContrast: true,
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
  pageBg: '#F5F1EB',
  headerBg: 'rgba(245, 241, 235, 0.92)',
  cardBg: '#FFFFFF',
  elevatedBg: '#F9F6F1',
  trackBg: '#EAE4DA',
  ink: '#1C1A17',
  muted: '#6E685F',
  subtle: '#968F85',
  border: 'rgba(28, 26, 23, 0.09)',
  strongBorder: 'rgba(28, 26, 23, 0.16)',
  activeTintBg: '#EAE1D2',
  activeTintBorder: '#9A8263',
  activeTintInk: '#1C1A17',
  primaryBtnBg: '#1C1A17',
  primaryBtnInk: '#FAF8F4',
  shadowCard: '0 2px 12px rgba(28, 26, 23, 0.05)',
  shadowSoft: '0 1px 4px rgba(28, 26, 23, 0.04)',
}

export const NIGHT_TOKENS: ThemeTokens = {
  isDark: true,
  pageBg: '#0E0E10',
  headerBg: 'rgba(14, 14, 16, 0.92)',
  cardBg: '#18181B',
  elevatedBg: '#202024',
  trackBg: '#2A2A2F',
  ink: '#F5F2EC',
  muted: '#A09A91',
  subtle: '#757068',
  border: 'rgba(245, 242, 236, 0.1)',
  strongBorder: 'rgba(245, 242, 236, 0.18)',
  activeTintBg: '#2C2721',
  activeTintBorder: '#C79B58',
  activeTintInk: '#F5F2EC',
  primaryBtnBg: '#F5F2EC',
  primaryBtnInk: '#141312',
  shadowCard: '0 4px 18px rgba(0, 0, 0, 0.32)',
  shadowSoft: '0 1px 6px rgba(0, 0, 0, 0.24)',
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
        customHex: normalizeHex(parsed.customHex ?? '#F5F1EB', '#F5F1EB'),
        autoContrast: typeof parsed.autoContrast === 'boolean' ? parsed.autoContrast : true,
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_STUDIO_BG
}

export function saveStudioBg(cfg: StudioBgConfig): void {
  try {
    localStorage.setItem(STUDIO_BG_KEY, JSON.stringify(cfg))
  } catch {
    // ignore
  }
}

export function resolveStudioBgHex(cfg: StudioBgConfig): string {
  if (cfg.id === 'custom') return normalizeHex(cfg.customHex, '#F5F1EB')
  const found = STUDIO_BG_PRESETS.find((p) => p.id === cfg.id)
  return found ? found.hex : '#F5F1EB'
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
  let hex = '#F5F1EB'
  let useAuto = autoContrast

  if (typeof studioBg === 'string') {
    const preset = STUDIO_BG_PRESETS.find((p) => p.id === studioBg)
    hex = preset ? preset.hex : normalizeHex(studioBg, '#F5F1EB')
  } else if (studioBg && typeof studioBg === 'object') {
    hex = resolveStudioBgHex(studioBg)
    useAuto = studioBg.autoContrast
  }

  const fallbackDark = typeof fallback === 'boolean' ? fallback : Boolean(fallback?.isDark)
  const darkStage = useAuto ? isStudioBgDark(hex) : fallbackDark
  const textColor = darkStage ? '#F5F2EC' : '#1C1A17'
  const mutedColor = darkStage ? 'rgba(245, 242, 236, 0.7)' : 'rgba(28, 26, 23, 0.62)'
  const borderColor = darkStage ? 'rgba(245, 242, 236, 0.14)' : 'rgba(28, 26, 23, 0.1)'
  const chipBg = darkStage ? 'rgba(24, 24, 27, 0.86)' : 'rgba(255, 255, 255, 0.9)'
  const chipBorder = darkStage ? 'rgba(245, 242, 236, 0.18)' : 'rgba(28, 26, 23, 0.12)'

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
