const STORAGE_KEY = 'cordwaine_haptics_enabled'

type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
type NotificationType = 'error' | 'success' | 'warning'

interface TgHapticAPI {
  impactOccurred?: (style: ImpactStyle) => void
  notificationOccurred?: (type: NotificationType) => void
  selectionChanged?: () => void
}

interface TgWebviewProxy {
  postEvent?: (eventType: string, eventData: string) => void
}

let audioCtx: AudioContext | null = null

function detectIOS(): boolean {
  if (typeof window === 'undefined') return false
  const plat = window.Telegram?.WebApp?.platform as string | undefined
  if (plat === 'ios') return true
  return typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

const IS_IOS = detectIOS()

export function isHapticsEnabled(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === '0' || saved === 'false') return false
    return true
  } catch {
    return true
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // ignore storage errors
  }
}

function playSoftTick(pitch = 1): void {
  if (typeof window === 'undefined' || !isHapticsEnabled()) return
  try {
    const soundOff = localStorage.getItem('cordwainer_sound') === '0'
    if (soundOff) return
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new Ctx()
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume()
    }
    const t0 = audioCtx.currentTime
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(520 * pitch, t0)
    osc.frequency.exponentialRampToValueAtTime(150 * pitch, t0 + 0.026)

    gain.gain.setValueAtTime(0.16, t0)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.026)

    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.03)
  } catch {}
}

function getTgHaptic(): TgHapticAPI | null {
  if (typeof window === 'undefined' || !isHapticsEnabled()) return null
  return (window.Telegram?.WebApp?.HapticFeedback as TgHapticAPI | undefined) || null
}

function getProxy(): TgWebviewProxy | null {
  if (typeof window === 'undefined' || !isHapticsEnabled()) return null
  return (window as unknown as { TelegramWebviewProxy?: TgWebviewProxy }).TelegramWebviewProxy || null
}

function triggerImpact(style: 'light' | 'medium' | 'heavy', pitch = 1): void {
  if (!isHapticsEnabled()) return
  const tgStyle: 'light' | 'medium' =
    IS_IOS ? (style === 'heavy' ? 'light' : 'light') : style === 'light' ? 'light' : 'medium'

  playSoftTick(pitch)

  try {
    if (IS_IOS && style === 'light') {
      getTgHaptic()?.selectionChanged?.()
    } else {
      getTgHaptic()?.impactOccurred?.(tgStyle)
    }
  } catch {}

  try {
    getProxy()?.postEvent?.(
      'web_app_trigger_haptic_feedback',
      JSON.stringify({ type: 'impact', impact_style: tgStyle })
    )
  } catch {}

  try {
    if (!IS_IOS && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      const ms = style === 'heavy' ? 22 : style === 'medium' ? 16 : 12
      navigator.vibrate(ms)
    }
  } catch {}
}

export function hapticSelect(): void {
  triggerImpact('light', 1.08)
}

export function hapticTap(): void {
  triggerImpact('light', 1.0)
}

export function hapticConfirm(): void {
  triggerImpact('medium', 1.2)
}

export function hapticSuccess(): void {
  if (!isHapticsEnabled()) return
  playSoftTick(1.28)
  try {
    getTgHaptic()?.notificationOccurred?.('success')
    getProxy()?.postEvent?.(
      'web_app_trigger_haptic_feedback',
      JSON.stringify({ type: 'notification', notification_type: 'success' })
    )
  } catch {}
  try {
    if (!IS_IOS && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(18)
    }
  } catch {}
}

export function hapticError(): void {
  if (!isHapticsEnabled()) return
  playSoftTick(0.75)
  try {
    getTgHaptic()?.notificationOccurred?.('error')
    getProxy()?.postEvent?.(
      'web_app_trigger_haptic_feedback',
      JSON.stringify({ type: 'notification', notification_type: 'error' })
    )
  } catch {}
  try {
    if (!IS_IOS && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([18, 35, 18])
    }
  } catch {}
}
