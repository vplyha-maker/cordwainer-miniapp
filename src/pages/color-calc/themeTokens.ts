import { useCallback, useLayoutEffect, useMemo, useState } from 'react'

const THEME_STORAGE_KEY = 'cordwaine_theme'
const APP_THEME_STORAGE_KEY = 'cordwainer_theme'

export interface AtelierTokens {
  pageBg: string
  surface: string
  surfaceSoft: string
  ink: string
  inkSecondary: string
  inkMuted: string
  accent: string
  activeBg: string
  activeText: string
  activeTintBg: string
  activeTintBorder: string
  border: string
  borderStrong: string
  danger: string
}

function resolveInitialDarkTheme(): boolean {
  if (typeof document === 'undefined') return true
  try {
    const stored =
      window.localStorage.getItem(APP_THEME_STORAGE_KEY) ??
      window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark') return true
    if (stored === 'light') return false
  } catch {}
  if (document.documentElement.classList.contains('dark')) return true
  if (document.documentElement.classList.contains('light')) return false
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return true
}

export function useAtelierTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => resolveInitialDarkTheme())

  useLayoutEffect(() => {
    const sync = () => setIsDark(document.documentElement.classList.contains('dark'))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev
      const bgHex = next ? '#0B0B0C' : '#F7F4EE'
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next)
        document.documentElement.classList.toggle('light', !next)
        document.documentElement.style.backgroundColor = bgHex
        if (document.body) document.body.style.backgroundColor = bgHex
      }
      try {
        const themeVal = next ? 'dark' : 'light'
        window.localStorage.setItem(APP_THEME_STORAGE_KEY, themeVal)
        window.localStorage.setItem(THEME_STORAGE_KEY, themeVal)
        window.Telegram?.WebApp?.setHeaderColor?.(bgHex)
        window.Telegram?.WebApp?.setBackgroundColor?.(bgHex)
      } catch {}
      return next
    })
  }, [])

  const tokens = useMemo<AtelierTokens>(() => {
    if (isDark) {
      return {
        pageBg: '#0B0B0C',
        surface: '#141416',
        surfaceSoft: '#1C1C20',
        ink: '#F4F0E8',
        inkSecondary: '#B8B2A8',
        inkMuted: '#938E86',
        accent: '#C9A86A',
        activeBg: '#F4F0E8',
        activeText: '#0B0B0C',
        activeTintBg: 'rgba(201, 168, 106, 0.16)',
        activeTintBorder: 'rgba(201, 168, 106, 0.48)',
        border: 'rgba(244, 240, 232, 0.09)',
        borderStrong: 'rgba(244, 240, 232, 0.18)',
        danger: '#f87171',
      }
    }
    return {
      pageBg: '#F7F4EE',
      surface: '#EFEAE1',
      surfaceSoft: '#E5DFD3',
      ink: '#181715',
      inkSecondary: '#524E47',
      inkMuted: '#68635B',
      accent: '#9A6B2F',
      activeBg: '#181715',
      activeText: '#F7F4EE',
      activeTintBg: 'rgba(154, 107, 47, 0.13)',
      activeTintBorder: 'rgba(154, 107, 47, 0.45)',
      border: 'rgba(24, 23, 21, 0.09)',
      borderStrong: 'rgba(24, 23, 21, 0.18)',
      danger: '#dc2626',
    }
  }, [isDark])

  return { isDark, toggleTheme, tokens }
}

