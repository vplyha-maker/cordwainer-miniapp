import { HAPTICS_STORAGE_KEY } from './types'

type TgHapticApi = {
  impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  selectionChanged?: () => void
}

type ExtendedHapticWindow = {
  Telegram?: {
    WebApp?: {
      platform?: string
      HapticFeedback?: TgHapticApi
    }
  }
  TelegramWebviewProxy?: {
    postEvent?: (eventType: string, eventData: string) => void
  }
  webkitAudioContext?: typeof AudioContext
}

let sharedAudioCtx: AudioContext | null = null
let audioUnlockAttached = false

function getExtendedWindow(): ExtendedHapticWindow | undefined {
  if (typeof window === 'undefined') return undefined
  return window as unknown as ExtendedHapticWindow
}

function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false
  const tgPlatform = getExtendedWindow()?.Telegram?.WebApp?.platform
  if (tgPlatform === 'ios') return true
  if (typeof navigator !== 'undefined') {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent)
  }
  return false
}

export const IS_IOS = isIOSDevice()
export const SLIDER_HAPTIC_THROTTLE_MS = IS_IOS ? 55 : 42

export function isHapticsEnabled(): boolean {
  try {
    const saved = localStorage.getItem(HAPTICS_STORAGE_KEY)
    if (saved === null) return true
    return saved === '1' || saved === 'true'
  } catch {
    return true
  }
}

function ensureAudioUnlocked(): AudioContext | null {
  try {
    const w = getExtendedWindow()
    const AudioCtx =
      typeof AudioContext !== 'undefined' ? AudioContext : w?.webkitAudioContext
    if (!AudioCtx) return null
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx()
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume().catch(() => {})
    }
    return sharedAudioCtx
  } catch {
    return null
  }
}

function attachGlobalAudioUnlock(): void {
  if (IS_IOS || audioUnlockAttached || typeof window === 'undefined') return
  audioUnlockAttached = true
  const unlock = () => {
    ensureAudioUnlocked()
  }
  window.addEventListener('pointerdown', unlock, { passive: true, capture: true })
  window.addEventListener('touchstart', unlock, { passive: true, capture: true })
}

attachGlobalAudioUnlock()

function fireNavigatorVibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch {}
}

function fireTelegramProxy(
  payload:
    | { type: 'impact'; impact_style: 'light' | 'medium' | 'heavy' }
    | { type: 'selection_change' }
): void {
  try {
    const proxy = getExtendedWindow()?.TelegramWebviewProxy
    if (proxy && typeof proxy.postEvent === 'function') {
      proxy.postEvent('web_app_trigger_haptic_feedback', JSON.stringify(payload))
    }
  } catch {}
}

function scheduleTick(
  ctx: AudioContext,
  startAt: number,
  freqStart: number,
  freqEnd: number,
  durationSec: number,
  peakGain: number,
  type: OscillatorType
): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freqStart, startAt)
  osc.frequency.exponentialRampToValueAtTime(freqEnd, startAt + durationSec)

  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.0018)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + durationSec + 0.005)
}

function fireAudioClick(strength: 'soft' | 'tap' | 'confirm'): void {
  if (IS_IOS) return
  try {
    const ctx = ensureAudioUnlocked()
    if (!ctx) return

    const play = () => {
      try {
        const now = ctx.currentTime
        if (strength === 'soft') {
          scheduleTick(ctx, now, 1450, 620, 0.012, 0.14, 'triangle')
        } else if (strength === 'tap') {
          scheduleTick(ctx, now, 1850, 540, 0.016, 0.22, 'triangle')
          scheduleTick(ctx, now, 420, 180, 0.02, 0.14, 'sine')
        } else {
          scheduleTick(ctx, now, 1850, 620, 0.015, 0.22, 'triangle')
          scheduleTick(ctx, now + 0.045, 2250, 860, 0.018, 0.24, 'triangle')
        }
      } catch {}
    }

    if (ctx.state === 'running') {
      play()
    } else if (ctx.state === 'suspended') {
      void ctx.resume().then(play).catch(() => {})
    }
  } catch {}
}

export function safeHapticSelection(): void {
  if (!isHapticsEnabled()) return
  const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
  if (IS_IOS) {
    try {
      tgHaptic?.selectionChanged?.()
    } catch {}
    return
  }
  try {
    tgHaptic?.selectionChanged?.()
  } catch {}
  fireTelegramProxy({ type: 'selection_change' })
  fireNavigatorVibrate(10)
  fireAudioClick('soft')
}

export function safeHapticImpact(style: 'light' | 'medium' | 'heavy'): void {
  if (!isHapticsEnabled()) return
  const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
  if (IS_IOS) {
    try {
      if (style === 'heavy') {
        tgHaptic?.impactOccurred?.('light')
      } else {
        tgHaptic?.selectionChanged?.()
      }
    } catch {}
    return
  }
  try {
    tgHaptic?.impactOccurred?.(style)
  } catch {}
  fireTelegramProxy({ type: 'impact', impact_style: style })
  fireNavigatorVibrate(style === 'heavy' ? 26 : style === 'medium' ? 18 : 14)
  fireAudioClick(style === 'heavy' ? 'confirm' : style === 'medium' ? 'tap' : 'soft')
}

