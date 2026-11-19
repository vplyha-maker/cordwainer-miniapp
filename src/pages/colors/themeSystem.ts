import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'day' | 'night' | 'auto'

const THEME_STORAGE_KEY = 'cordwainer_theme_mode_v1'

export type CordwainerThemeTokens = {
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

export const DAY_THEME: CordwainerThemeTokens = {
  pageBg: '#F5F1EB',
  surface: '#FCFBF8',
  surfaceElevated: '#FFFFFF',
  surfaceSoft: '#EFEAE1',
  sheetBg: '#FBF9F5',
  backdrop: 'rgba(24, 22, 20, 0.32)',
  ink: '#181614',
  inkSecondary: '#58534C',
  inkMuted: '#8B857C',
  border: 'rgba(24, 22, 20, 0.09)',
  borderStrong: 'rgba(24, 22, 20, 0.16)',
  divider: 'rgba(24, 22, 20, 0.08)',
  pillActiveBg: '#181614',
  pillActiveText: '#FAF8F4',
  pillIdleBg: 'rgba(255, 255, 255, 0.72)',
  pillIdleText: '#4D4842',
  cardShadow: '0 8px 28px -8px rgba(24, 22, 20, 0.08), 0 1px 3px rgba(24, 22, 20, 0.04)',
  buttonShadow: '0 2px 8px -2px rgba(24, 22, 20, 0.09), 0 1px 2px rgba(24, 22, 20, 0.04)',
  sheetShadow: '0 -12px 40px -8px rgba(24, 22, 20, 0.18), 0 -1px 0 rgba(24, 22, 20, 0.06)',
  accentGold: '#B88940',
  chromeBgHex: '#F5F1EB',
}

export const NIGHT_THEME: CordwainerThemeTokens = {
  pageBg: '#0E0E10',
  surface: '#17171A',
  surfaceElevated: '#1F1F24',
  surfaceSoft: '#26262C',
  sheetBg: '#16161A',
  backdrop: 'rgba(0, 0, 0, 0.54)',
  ink: '#F5F2EB',
  inkSecondary: '#B8B3AA',
  inkMuted: '#7E7A72',
  border: 'rgba(245, 242, 235, 0.10)',
  borderStrong: 'rgba(245, 242, 235, 0.18)',
  divider: 'rgba(245, 242, 235, 0.08)',
  pillActiveBg: '#F5F2EB',
  pillActiveText: '#121215',
  pillIdleBg: 'rgba(38, 38, 44, 0.78)',
  pillIdleText: '#C5C0B6',
  cardShadow: '0 14px 36px -12px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  buttonShadow: '0 4px 12px -4px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  sheetShadow: '0 -16px 48px -8px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
  accentGold: '#D9A75A',
  chromeBgHex: '#0E0E10',
}

export function getThemeTokens(isDark: boolean): CordwainerThemeTokens {
  return isDark ? NIGHT_THEME : DAY_THEME
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

