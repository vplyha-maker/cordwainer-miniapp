import { useCallback, useEffect, useState } from 'react'
import { getRelativeLuminance } from './colorEngine'

export type ThemeMode = 'day' | 'night' | 'auto'

export type StudioBgPreset = 'cream' | 'white' | 'light-gray' | 'graphite' | 'black' | 'custom'

export type PerformanceMode = 'auto' | 'high' | 'eco'

const THEME_STORAGE_KEY = 'cordwainer_theme_mode_v1'
const STUDIO_SETTINGS_KEY = 'cordwainer_studio_settings_v2'

export const STUDIO_BG_PRESET_HEX: Record<Exclude<StudioBgPreset, 'custom'>, string> = {
  cream: '#F5F1EB',
  white: '#FFFFFF',
  'light-gray': '#E5E6EA',
  graphite: '#2B2D32',
  black: '#0D0D0F',
}

export type StudioDisplaySettings = {
  bgPreset: StudioBgPreset
  customBgHex: string
  autoContrast: boolean
  performanceMode: PerformanceMode
}

const DEFAULT_STUDIO_SETTINGS: StudioDisplaySettings = {
  bgPreset: 'cream',
  customBgHex: '#EAE4DA',
  autoContrast: true,
  performanceMode: 'auto',
}

export type CordwaineThemeTokens = {
  pageBg: string
  surface: string
  surfaceElevated: string
  surfaceSoft: string
  sheetBg: string
  backdrop: string
  ink: string
  inkSecondary: string
  inkMuted: string
  border: string
  borderStrong: string
  divider: string
  pillActiveBg: string
  pillActiveText: string
  pillIdleBg: string
  pillIdleText: string
  cardShadow: string
  buttonShadow: string
  sheetShadow: string
  accentGold: string
  chromeBgHex: string
}

// Backward-compatible alias
export type CordwainerThemeTokens = CordwaineThemeTokens

export const DAY_THEME: CordwaineThemeTokens = {
  pageBg: '#F5F1EB',
  surface: '#FCFBF8',
  surfaceElevated: '#FFFFFF',
  surfaceSoft: '#EFEAE1',
  sheetBg: '#FBF9F5',
  backdrop: 'rgba(24, 22, 20, 0.34)',
  ink: '#181614',
  inkSecondary: '#58534C',
  inkMuted: '#8B857C',
  border: 'rgba(24, 22, 20, 0.09)',
  borderStrong: 'rgba(24, 22, 20, 0.16)',
  divider: 'rgba(24, 22, 20, 0.08)',
  pillActiveBg: '#181614',
  pillActiveText: '#FAF8F4',
  pillIdleBg: 'rgba(255, 255, 255, 0.78)',
  pillIdleText: '#4D4842',
  cardShadow: '0 8px 24px -8px rgba(24, 22, 20, 0.08), 0 1px 3px rgba(24, 22, 20, 0.04)',
  buttonShadow: '0 2px 6px -2px rgba(24, 22, 20, 0.08), 0 1px 2px rgba(24, 22, 20, 0.04)',
  sheetShadow: '0 -10px 36px -8px rgba(24, 22, 20, 0.18), 0 -1px 0 rgba(24, 22, 20, 0.06)',
  accentGold: '#B88940',
  chromeBgHex: '#F5F1EB',
}

export const NIGHT_THEME: CordwaineThemeTokens = {
  pageBg: '#0E0E10',
  surface: '#17171B',
  surfaceElevated: '#202026',
  surfaceSoft: '#27272E',
  sheetBg: '#16161A',
  backdrop: 'rgba(0, 0, 0, 0.56)',
  ink: '#F5F2EB',
  inkSecondary: '#B8B3AA',
  inkMuted: '#817D75',
  border: 'rgba(245, 242, 235, 0.11)',
  borderStrong: 'rgba(245, 242, 235, 0.20)',
  divider: 'rgba(245, 242, 235, 0.08)',
  pillActiveBg: '#F5F2EB',
  pillActiveText: '#121215',
  pillIdleBg: 'rgba(39, 39, 46, 0.85)',
  pillIdleText: '#C5C0B6',
  cardShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.58), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  buttonShadow: '0 3px 10px -3px rgba(0, 0, 0, 0.44), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  sheetShadow: '0 -14px 44px -8px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
  accentGold: '#D9A75A',
  chromeBgHex: '#0E0E10',
}

export function getThemeTokens(isDark: boolean): CordwaineThemeTokens {
  return isDark ? NIGHT_THEME : DAY_THEME
}

export function resolveStudioBgHex(settings: StudioDisplaySettings): string {
  if (settings.bgPreset === 'custom') {
    return /^#[0-9A-Fa-f]{6}$/.test(settings.customBgHex)
      ? settings.customBgHex.toUpperCase()
      : DEFAULT_STUDIO_SETTINGS.customBgHex
  }
  return STUDIO_BG_PRESET_HEX[settings.bgPreset] ?? STUDIO_BG_PRESET_HEX.cream
}

export type StudioStageContrastStyle = {
  bgHex: string
  isDarkStage: boolean
  labelColor: string
  dividerColor: string
  btnBg: string
  btnBorder: string
  btnText: string
}

export function resolveStudioStageStyle(
  bgHex: string,
  autoContrast: boolean,
  uiTokens: CordwaineThemeTokens
): StudioStageContrastStyle {
  const lum = getRelativeLuminance(bgHex)
  const isDarkStage = lum < 0.34

  if (!autoContrast) {
    return {
      bgHex,
      isDarkStage,
      labelColor: uiTokens.inkSecondary,
      dividerColor: uiTokens.divider,
      btnBg: uiTokens.surface,
      btnBorder: uiTokens.borderStrong,
      btnText: uiTokens.ink,
    }
  }

  return isDarkStage
    ? {
        bgHex,
        isDarkStage: true,
        labelColor: 'rgba(245, 242, 235, 0.78)',
        dividerColor: 'rgba(245, 242, 235, 0.14)',
        btnBg: 'rgba(32, 32, 38, 0.88)',
        btnBorder: 'rgba(245, 242, 235, 0.22)',
        btnText: '#F5F2EB',
      }
    : {
        bgHex,
        isDarkStage: false,
        labelColor: 'rgba(24, 22, 20, 0.70)',
        dividerColor: 'rgba(24, 22, 20, 0.12)',
        btnBg: 'rgba(255, 255, 255, 0.88)',
        btnBorder: 'rgba(24, 22, 20, 0.16)',
        btnText: '#181614',
      }
}

export function loadStudioSettings(): StudioDisplaySettings {
  try {
    const raw = localStorage.getItem(STUDIO_SETTINGS_KEY)
    if (!raw) return DEFAULT_STUDIO_SETTINGS
    const parsed = JSON.parse(raw) as Partial<StudioDisplaySettings>
    const validPresets: StudioBgPreset[] = [
      'cream',
      'white',
      'light-gray',
      'graphite',
      'black',
      'custom',
    ]
    const bgPreset: StudioBgPreset =
      typeof parsed.bgPreset === 'string' &&
      validPresets.includes(parsed.bgPreset as StudioBgPreset)
        ? (parsed.bgPreset as StudioBgPreset)
        : DEFAULT_STUDIO_SETTINGS.bgPreset

    const customBgHex =
      typeof parsed.customBgHex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(parsed.customBgHex)
        ? parsed.customBgHex.toUpperCase()
        : DEFAULT_STUDIO_SETTINGS.customBgHex

    const autoContrast =
      typeof parsed.autoContrast === 'boolean'
        ? parsed.autoContrast
        : DEFAULT_STUDIO_SETTINGS.autoContrast

    const performanceMode: PerformanceMode =
      parsed.performanceMode === 'auto' ||
      parsed.performanceMode === 'high' ||
      parsed.performanceMode === 'eco'
        ? parsed.performanceMode
        : DEFAULT_STUDIO_SETTINGS.performanceMode

    return { bgPreset, customBgHex, autoContrast, performanceMode }
  } catch {
    return DEFAULT_STUDIO_SETTINGS
  }
}

export function saveStudioSettings(settings: StudioDisplaySettings): void {
  try {
    localStorage.setItem(STUDIO_SETTINGS_KEY, JSON.stringify(settings))
  } catch {}
}

function getSystemPrefersDark(): boolean {
  try {
    if (typeof window === 'undefined') return false
    const tgScheme = (
      window as unknown as { Telegram?: { WebApp?: { colorScheme?: string } } }
    ).Telegram?.WebApp?.colorScheme
    if (tgScheme === 'dark') return true
    if (tgScheme === 'light') return false
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  } catch {
    return false
  }
}

export function loadSavedThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'day' || saved === 'night' || saved === 'auto') {
      return saved
    }
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'night' : 'day'
    }
    return 'auto'
  } catch {
    return 'auto'
  }
}

function syncDocumentAndTelegramTheme(isDark: boolean): void {
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark)
    }
  } catch {}
  try {
    const tg = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            setHeaderColor?: (color: string) => void
            setBackgroundColor?: (color: string) => void
          }
        }
      }
    ).Telegram?.WebApp
    const hex = isDark ? NIGHT_THEME.chromeBgHex : DAY_THEME.chromeBgHex
    tg?.setHeaderColor?.(hex)
    tg?.setBackgroundColor?.(hex)
  } catch {}
}

export function useCordwainerTheme() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => loadSavedThemeMode())
  const [systemDark, setSystemDark] = useState<boolean>(() => getSystemPrefersDark())

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
    return undefined
  }, [])

  const isDark = themeMode === 'auto' ? systemDark : themeMode === 'night'

  useEffect(() => {
    syncDocumentAndTelegramTheme(isDark)
  }, [isDark])

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {}
  }, [])

  const toggleDayNight = useCallback(() => {
    const next: ThemeMode = isDark ? 'day' : 'night'
    setThemeMode(next)
  }, [isDark, setThemeMode])

  const tokens = isDark ? NIGHT_THEME : DAY_THEME

  return {
    themeMode,
    isDark,
    tokens,
    setThemeMode,
    toggleDayNight,
  }
}
