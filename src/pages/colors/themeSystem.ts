import { getRelativeLuminance, normalizeHex } from './colorEngine'

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
const HAPTICS_KEY = 'cordwainer_haptics_v1'

export function loadThemeMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw === 'day' || raw === 'night' || raw === 'auto') return raw
    const legacy = localStorage.getItem('cordwainer_theme')
    if (legacy === 'light') return 'day'
    if (legacy === 'dark') return 'night'
  } catch {
    // ignore storage errors
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
    // ignore storage errors
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
    // ignore storage errors
  }
  return DEFAULT_STUDIO_BG
}

export function saveStudioBg(cfg: StudioBgConfig): void {
  try {
    localStorage.setItem(STUDIO_BG_KEY, JSON.stringify(cfg))
  } catch {
    // ignore storage errors
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

export function loadHapticsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(HAPTICS_KEY)
    if (raw === '0' || raw === 'false') return false
  } catch {
    // ignore
  }
  return true
}

export function saveHapticsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(HAPTICS_KEY, enabled ? '1' : '0')
  } catch {
    // ignore
  }
}

export type HapticKind = 'tap' | 'select' | 'harmony' | 'save' | 'reset'

let lastHapticAt = 0
let sharedAudioCtx: AudioContext | null = null

function playMicroPulse(freqStart: number, freqEnd: number, durationSec: number): void {
  try {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
    const Ctor = W.AudioContext || W.webkitAudioContext
    if (!Ctor) return
    if (!sharedAudioCtx) {
      sharedAudioCtx = new Ctor()
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume()
    }
    const now = sharedAudioCtx.currentTime
    const osc = sharedAudioCtx.createOscillator()
    const gain = sharedAudioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freqStart, now)
    osc.frequency.exponentialRampToValueAtTime(freqEnd, now + durationSec)
    gain.gain.setValueAtTime(0.035, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)
    osc.connect(gain)
    gain.connect(sharedAudioCtx.destination)
    osc.start(now)
    osc.stop(now + durationSec)
  } catch {
    // ignore
  }
}

export function triggerHaptic(kind: HapticKind, enabled = true): void {
  if (!enabled || typeof window === 'undefined') return
  const now = Date.now()
  if (now - lastHapticAt < 45) return
  lastHapticAt = now

  try {
    const tg = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            HapticFeedback?: {
              impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
              selectionChanged?: () => void
              notificationOccurred?: (type: 'error' | 'success' | 'warning') => void
            }
          }
        }
        TelegramWebviewProxy?: { postEvent?: (eventType: string, eventData: string) => void }
      }
    )

    const hf = tg.Telegram?.WebApp?.HapticFeedback
    if (hf) {
      if (kind === 'select') hf.selectionChanged?.()
      else if (kind === 'save') hf.notificationOccurred?.('success')
      else if (kind === 'reset') hf.notificationOccurred?.('warning')
      else if (kind === 'harmony') hf.impactOccurred?.('medium')
      else hf.impactOccurred?.('light')
    }

    if (tg.TelegramWebviewProxy?.postEvent) {
      const style = kind === 'save' ? 'heavy' : kind === 'select' ? 'light' : 'medium'
      tg.TelegramWebviewProxy.postEvent(
        'web_app_trigger_haptic_feedback',
        JSON.stringify({ type: 'impact', impact_style: style })
      )
    }

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if (kind === 'select') navigator.vibrate(14)
      else if (kind === 'tap') navigator.vibrate(18)
      else if (kind === 'harmony') navigator.vibrate([18, 22, 18])
      else if (kind === 'save') navigator.vibrate([22, 28, 32])
      else if (kind === 'reset') navigator.vibrate([16, 20, 24])
    }

    if (kind === 'save') playMicroPulse(190, 62, 0.045)
    else if (kind === 'reset') playMicroPulse(150, 44, 0.04)
    else playMicroPulse(170, 48, 0.028)
  } catch {
    // ignore
  }
}
