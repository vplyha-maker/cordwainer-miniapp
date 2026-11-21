import { RANGES, type BrandFitEntry, type Gender } from '../../lib/shoeSizes'
import {
  APP_THEME_STORAGE_KEY,
  LEGACY_PREFS_STORAGE_KEY,
  PREFS_STORAGE_KEY,
  THEME_STORAGE_KEY,
  VALID_GENDERS,
  VALID_MODES,
  VALID_STYLES,
  VALID_UNITS,
  VALID_WIDTHS,
  type SavedPrefs,
} from './types'

export function detectTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false
  const tg = (window as unknown as {
    Telegram?: {
      WebApp?: {
        initData?: string
        platform?: string
      }
    }
  }).Telegram?.WebApp
  return Boolean(tg && (tg.initData || (tg.platform && tg.platform !== 'unknown')))
}

export function loadSavedPrefs(): SavedPrefs {
  if (typeof window === 'undefined') return {}
  try {
    const raw =
      window.localStorage.getItem(PREFS_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_PREFS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<SavedPrefs>
    const gender = parsed.gender && VALID_GENDERS.includes(parsed.gender) ? parsed.gender : undefined
    const measureMode =
      parsed.measureMode && VALID_MODES.includes(parsed.measureMode) ? parsed.measureMode : undefined
    const unit = parsed.unit && VALID_UNITS.includes(parsed.unit) ? parsed.unit : undefined
    const shoeStyle =
      parsed.shoeStyle && VALID_STYLES.includes(parsed.shoeStyle) ? parsed.shoeStyle : undefined
    const widthFit =
      parsed.widthFit && VALID_WIDTHS.includes(parsed.widthFit) ? parsed.widthFit : undefined
    const activeGender: Gender = gender ?? 'men'
    const range = RANGES[activeGender]
    const footMm =
      typeof parsed.footMm === 'number' && Number.isFinite(parsed.footMm)
        ? Math.min(range.max, Math.max(range.min, Math.round(parsed.footMm)))
        : undefined
    return { gender, measureMode, unit, shoeStyle, widthFit, footMm }
  } catch {
    return {}
  }
}

export function savePrefs(payload: SavedPrefs): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(payload))
  } catch {}
}

export function resolveInitialDarkTheme(): boolean {
  if (typeof document === 'undefined') return true
  try {
    const stored =
      window.localStorage.getItem(APP_THEME_STORAGE_KEY) ??
      window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
      return true
    }
    if (stored === 'light') {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
      return false
    }
  } catch {}

  if (document.documentElement.classList.contains('dark')) {
    return true
  }
  if (document.documentElement.classList.contains('light')) {
    return false
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
    return prefersDark
  }
  return true
}

export function applyThemePreference(isDark: boolean): void {
  const bgHex = isDark ? '#0B0B0C' : '#F7F4EE'
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.classList.toggle('light', !isDark)
    document.documentElement.style.backgroundColor = bgHex
    if (document.body) {
      document.body.style.backgroundColor = bgHex
    }
  }
  try {
    const themeVal = isDark ? 'dark' : 'light'
    window.localStorage.setItem(APP_THEME_STORAGE_KEY, themeVal)
    window.localStorage.setItem(THEME_STORAGE_KEY, themeVal)
    const tg = (window as unknown as {
      Telegram?: {
        WebApp?: {
          setHeaderColor?: (color: string) => void
          setBackgroundColor?: (color: string) => void
        }
      }
    }).Telegram?.WebApp
    tg?.setHeaderColor?.(bgHex)
    tg?.setBackgroundColor?.(bgHex)
  } catch {}
}

export function isClassicBrandEntry(row: BrandFitEntry): boolean {
  const cat = row.category.toUpperCase()
  return cat.includes('LEATHER') || cat.includes('CLASSIC') || cat.includes('DRESS')
}

