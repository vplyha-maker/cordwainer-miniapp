import { useCallback, useEffect, useState } from 'react'

const HAPTICS_STORAGE_KEY = 'cordwainer_haptics_enabled_v1'
const HAPTICS_EVENT = 'cordwaine:haptics-changed'
const SWATCH_COOLDOWN_MS = 45

let lastSwatchHapticAt = 0

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

function safeVibrate(pattern: number | number[]): void {
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      navigator.vibrate(pattern)
    }
  } catch {}
}

function safeTelegramProxyImpact(style: 'light' | 'medium' | 'heavy'): void {
  try {
    const proxy = getExtendedWindow()?.TelegramWebviewProxy
    if (proxy && typeof proxy.postEvent === 'function') {
      proxy.postEvent(
        'web_app_trigger_haptic_feedback',
        JSON.stringify({ type: 'impact', impact_style: style })
      )
    }
  } catch {}
}

export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    if (tgHaptic && typeof tgHaptic.impactOccurred === 'function') {
      tgHaptic.impactOccurred(style)
      return
    }
    safeTelegramProxyImpact(style)
    const ms = style === 'heavy' ? 16 : style === 'medium' ? 11 : 7
    safeVibrate(ms)
  } catch {}
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
    if (tgHaptic && typeof tgHaptic.selectionChanged === 'function') {
      tgHaptic.selectionChanged()
      return
    }
    safeVibrate(8)
  } catch {}
}

export function hapticHarmony(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    if (tgHaptic && typeof tgHaptic.impactOccurred === 'function') {
      tgHaptic.impactOccurred('medium')
      return
    }
    safeTelegramProxyImpact('medium')
    safeVibrate([9, 20, 10])
  } catch {}
}

export function hapticModel(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    if (tgHaptic && typeof tgHaptic.impactOccurred === 'function') {
      tgHaptic.impactOccurred('medium')
      return
    }
    safeTelegramProxyImpact('medium')
    safeVibrate(13)
  } catch {}
}

export function hapticSave(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    if (tgHaptic && typeof tgHaptic.notificationOccurred === 'function') {
      tgHaptic.notificationOccurred('success')
      return
    }
    safeTelegramProxyImpact('heavy')
    safeVibrate([12, 26, 20])
  } catch {}
}

export function hapticReset(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    if (tgHaptic && typeof tgHaptic.notificationOccurred === 'function') {
      tgHaptic.notificationOccurred('warning')
      return
    }
    safeTelegramProxyImpact('medium')
    safeVibrate([15, 22, 10])
  } catch {}
}
