import { useCallback, useEffect, useState } from 'react'

const HAPTICS_STORAGE_KEY = 'cordwainer_haptics_enabled_v1'
const HAPTICS_EVENT = 'cordwaine:haptics-changed'
const SWATCH_COOLDOWN_MS = 55

let lastSwatchHapticAt = 0
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
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(HAPTICS_EVENT, { detail: enabled }))
    }
  } catch {}
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

// Канал 1: navigator.vibrate() — длительности >= 14–18ms выше порога раскрутки мотора Android
function fireNavigatorVibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch {}
}

// Канал 2: TelegramWebviewProxy.postEvent для Android (One UI / HyperOS)
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
  } catch {}
}

// Канал 3: Резервный Web Audio API микро-импульс (суббас 175 -> 46 Гц + короткий клик)
function fireAudioMicroImpulse(strength: 'soft' | 'tap' | 'confirm'): void {
  try {
    const ctx = ensureAudioUnlocked()
    if (!ctx) return

    const play = () => {
      try {
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        const peakGain = strength === 'confirm' ? 0.09 : strength === 'tap' ? 0.065 : 0.042
        const startFreq = strength === 'confirm' ? 210 : 175
        const endFreq = 46
        const duration = strength === 'confirm' ? 0.036 : 0.022

        osc.type = 'sine'
        osc.frequency.setValueAtTime(startFreq, now)
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration)

        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.linearRampToValueAtTime(peakGain, now + 0.0025)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + duration + 0.006)
      } catch {}
    }

    if (ctx.state === 'running') {
      play()
    } else if (ctx.state === 'suspended') {
      void ctx.resume().then(play).catch(() => {})
    }
  } catch {}
}

export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'medium'): void {
  if (!isHapticsEnabled()) return
  const tgStyle = style === 'light' ? 'medium' : style
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.impactOccurred?.(tgStyle)
  } catch {}
  fireTelegramProxy({ type: 'impact', impact_style: tgStyle })
  fireNavigatorVibrate(style === 'heavy' ? 26 : style === 'medium' ? 18 : 15)
  fireAudioMicroImpulse(style === 'heavy' ? 'confirm' : 'tap')
}

export function hapticTap(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.impactOccurred?.('medium')
  } catch {}
  fireTelegramProxy({ type: 'impact', impact_style: 'medium' })
  fireNavigatorVibrate(18)
  fireAudioMicroImpulse('tap')
}

export function hapticSwatch(): void {
  if (!isHapticsEnabled()) return
  const now = Date.now()
  if (now - lastSwatchHapticAt < SWATCH_COOLDOWN_MS) return
  lastSwatchHapticAt = now

  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.impactOccurred?.('light')
    tgHaptic?.selectionChanged?.()
  } catch {}
  fireTelegramProxy({ type: 'impact', impact_style: 'light' })
  fireNavigatorVibrate(14)
  fireAudioMicroImpulse('soft')
}

export function hapticHarmony(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.impactOccurred?.('heavy')
  } catch {}
  fireTelegramProxy({ type: 'impact', impact_style: 'heavy' })
  fireNavigatorVibrate([18, 22, 18])
  fireAudioMicroImpulse('confirm')
}

export function hapticModel(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.impactOccurred?.('heavy')
  } catch {}
  fireTelegramProxy({ type: 'impact', impact_style: 'heavy' })
  fireNavigatorVibrate([20, 20, 16])
  fireAudioMicroImpulse('confirm')
}

export function hapticSave(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.notificationOccurred?.('success')
  } catch {}
  fireTelegramProxy({ type: 'notification', notification_type: 'success' })
  fireNavigatorVibrate([22, 28, 32])
  fireAudioMicroImpulse('confirm')
}

export function hapticReset(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.notificationOccurred?.('warning')
  } catch {}
  fireTelegramProxy({ type: 'notification', notification_type: 'warning' })
  fireNavigatorVibrate([24, 24, 16])
  fireAudioMicroImpulse('tap')
}
