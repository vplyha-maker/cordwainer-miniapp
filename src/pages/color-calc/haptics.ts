import { useCallback, useEffect, useState } from 'react'

const HAPTICS_STORAGE_KEY = 'cordwainer_haptics_enabled_v1'
const HAPTICS_EVENT = 'cordwaine:haptics-changed'
const SELECT_COOLDOWN_MS = 45

let lastSelectHapticAt = 0
let sharedAudioCtx: AudioContext | null = null
let audioUnlockAttached = false

type TgHapticApi = {
  impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  selectionChanged?: () => void
  notificationOccurred?: (type: 'error' | 'success' | 'warning') => void
}

type ExtendedHapticWindow = {
  Telegram?: {
    WebApp?: {
      HapticFeedback?: TgHapticApi
    }
  }
  TelegramWebviewProxy?: {
    postEvent?: (eventType: string, eventData: string) => void
  }
  webkitAudioContext?: typeof AudioContext
}

function getExtendedWindow(): ExtendedHapticWindow | undefined {
  if (typeof window === 'undefined') return undefined
  return window as unknown as ExtendedHapticWindow
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
  if (audioUnlockAttached || typeof window === 'undefined') return
  audioUnlockAttached = true
  const unlock = () => {
    ensureAudioUnlocked()
  }
  window.addEventListener('pointerdown', unlock, { passive: true, capture: true })
  window.addEventListener('touchstart', unlock, { passive: true, capture: true })
}

attachGlobalAudioUnlock()

export function isHapticsEnabled(): boolean {
  try {
    const saved = localStorage.getItem(HAPTICS_STORAGE_KEY)
    if (saved === null) return true
    return saved === '1' || saved === 'true'
  } catch {
    return true
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(HAPTICS_STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // ignore
  }
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(HAPTICS_EVENT, { detail: enabled }))
    }
  } catch {
    // ignore
  }
}

export function useHapticsSetting(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabledState] = useState<boolean>(() => isHapticsEnabled())

  useEffect(() => {
    const onChange = (e: Event) => {
      const custom = e as CustomEvent<boolean>
      if (typeof custom.detail === 'boolean') {
        setEnabledState(custom.detail)
      } else {
        setEnabledState(isHapticsEnabled())
      }
    }
    window.addEventListener(HAPTICS_EVENT, onChange)
    return () => window.removeEventListener(HAPTICS_EVENT, onChange)
  }, [])

  const update = useCallback((next: boolean) => {
    setHapticsEnabled(next)
    setEnabledState(next)
  }, [])

  return [enabled, update]
}

function fireNavigatorVibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch {
    // ignore
  }
}

function fireTelegramProxy(
  payload:
    | { type: 'impact'; impact_style: 'light' | 'medium' | 'heavy' }
    | { type: 'selection_change' }
    | { type: 'notification'; notification_type: 'success' | 'warning' | 'error' }
): void {
  try {
    const proxy = getExtendedWindow()?.TelegramWebviewProxy
    if (proxy && typeof proxy.postEvent === 'function') {
      proxy.postEvent('web_app_trigger_haptic_feedback', JSON.stringify(payload))
    }
  } catch {
    // ignore
  }
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

// Слышимый на динамике Android тактильный механический щелчок (520–2250 Гц)
function fireAudioClick(strength: 'soft' | 'tap' | 'confirm' | 'error'): void {
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
        } else if (strength === 'error') {
          scheduleTick(ctx, now, 950, 340, 0.024, 0.18, 'triangle')
        } else {
          // confirm / success: двойной чёткий щелчок
          scheduleTick(ctx, now, 1850, 620, 0.015, 0.22, 'triangle')
          scheduleTick(ctx, now + 0.045, 2250, 860, 0.018, 0.24, 'triangle')
        }
      } catch {
        // ignore
      }
    }

    if (ctx.state === 'running') {
      play()
    } else if (ctx.state === 'suspended') {
      void ctx.resume().then(play).catch(() => {})
    }
  } catch {
    // ignore
  }
}

export function hapticTap(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.impactOccurred?.('medium')
  } catch {
    // ignore
  }
  fireTelegramProxy({ type: 'impact', impact_style: 'medium' })
  fireNavigatorVibrate(18)
  fireAudioClick('tap')
}

export function hapticSelect(): void {
  if (!isHapticsEnabled()) return
  const now = Date.now()
  if (now - lastSelectHapticAt < SELECT_COOLDOWN_MS) return
  lastSelectHapticAt = now

  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.impactOccurred?.('light')
    tgHaptic?.selectionChanged?.()
  } catch {
    // ignore
  }
  fireTelegramProxy({ type: 'impact', impact_style: 'light' })
  fireNavigatorVibrate(14)
  fireAudioClick('soft')
}

export function hapticConfirm(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.impactOccurred?.('heavy')
  } catch {
    // ignore
  }
  fireTelegramProxy({ type: 'impact', impact_style: 'heavy' })
  fireNavigatorVibrate([18, 22, 18])
  fireAudioClick('confirm')
}

export function hapticSuccess(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.notificationOccurred?.('success')
  } catch {
    // ignore
  }
  fireTelegramProxy({ type: 'notification', notification_type: 'success' })
  fireNavigatorVibrate([22, 28, 32])
  fireAudioClick('confirm')
}

export function hapticError(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.notificationOccurred?.('error')
  } catch {
    // ignore
  }
  fireTelegramProxy({ type: 'notification', notification_type: 'error' })
  fireNavigatorVibrate([24, 24, 16])
  fireAudioClick('error')
}
