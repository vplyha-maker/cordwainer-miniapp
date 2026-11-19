import { useCallback, useEffect, useState } from 'react'

const HAPTICS_STORAGE_KEY = 'cordwainer_haptics_enabled_v1'
const HAPTICS_EVENT = 'cordwaine:haptics-changed'
const SWATCH_COOLDOWN_MS = 50

let lastSwatchHapticAt = 0
let sharedAudioCtx: AudioContext | null = null

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

// Канал 1: navigator.vibrate() для Android WebView и Chrome
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

// Канал 3: Резервный Web Audio API микро-импульс (ощутимый тактильный щелчок даже без вибромотора)
function fireAudioMicroImpulse(strength: 'soft' | 'tap' | 'confirm'): void {
  try {
    const w = getExtendedWindow()
    const AudioCtx =
      typeof AudioContext !== 'undefined' ? AudioContext : w?.webkitAudioContext
    if (!AudioCtx) return

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx()
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume().catch(() => {})
    }
    if (sharedAudioCtx.state !== 'running') return

    const now = sharedAudioCtx.currentTime
    const osc = sharedAudioCtx.createOscillator()
    const gain = sharedAudioCtx.createGain()

    const peakGain = strength === 'confirm' ? 0.045 : strength === 'tap' ? 0.028 : 0.018
    const startFreq = strength === 'confirm' ? 190 : 168
    const endFreq = 46
    const duration = strength === 'confirm' ? 0.032 : 0.018

    osc.type = 'sine'
    osc.frequency.setValueAtTime(startFreq, now)
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    osc.connect(gain)
    gain.connect(sharedAudioCtx.destination)

    osc.start(now)
    osc.stop(now + duration + 0.005)
  } catch {}
}

// 3-канальный тактильный отклик (все каналы без раннего return — работает на One UI / HyperOS / iOS)
export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.impactOccurred?.(style)
  } catch {}
  fireTelegramProxy({ type: 'impact', impact_style: style })
  fireNavigatorVibrate(style === 'heavy' ? 18 : style === 'medium' ? 12 : 9)
  fireAudioMicroImpulse(style === 'heavy' ? 'confirm' : 'tap')
}

export function hapticTap(): void {
  triggerHaptic('light')
}

export function hapticSwatch(): void {
  if (!isHapticsEnabled()) return
  const now = Date.now()
  if (now - lastSwatchHapticAt < SWATCH_COOLDOWN_MS) return
  lastSwatchHapticAt = now

  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.selectionChanged?.()
  } catch {}
  fireTelegramProxy({ type: 'selection_change' })
  fireNavigatorVibrate(8)
  fireAudioMicroImpulse('soft')
}

export function hapticHarmony(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.impactOccurred?.('medium')
  } catch {}
  fireTelegramProxy({ type: 'impact', impact_style: 'medium' })
  fireNavigatorVibrate([10, 20, 12])
  fireAudioMicroImpulse('tap')
}

export function hapticModel(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.impactOccurred?.('medium')
  } catch {}
  fireTelegramProxy({ type: 'impact', impact_style: 'medium' })
  fireNavigatorVibrate(14)
  fireAudioMicroImpulse('tap')
}

export function hapticSave(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.notificationOccurred?.('success')
  } catch {}
  fireTelegramProxy({ type: 'notification', notification_type: 'success' })
  fireNavigatorVibrate([14, 28, 22])
  fireAudioMicroImpulse('confirm')
}

export function hapticReset(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.notificationOccurred?.('warning')
  } catch {}
  fireTelegramProxy({ type: 'notification', notification_type: 'warning' })
  fireNavigatorVibrate([16, 22, 12])
  fireAudioMicroImpulse('tap')
}
