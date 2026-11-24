const HAPTICS_STORAGE_KEY = 'cordwainer_haptics_enabled_v1'
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

// Слышимый на динамике Android тактильный механический щелчок (520–2200 Гц)
function fireAudioClick(strength: 'soft' | 'tap' | 'confirm' | 'reset'): void {
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
        } else if (strength === 'reset') {
          scheduleTick(ctx, now, 1100, 390, 0.022, 0.18, 'triangle')
        } else {
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

export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'medium'): void {
  if (!isHapticsEnabled()) return
  const tgStyle = style === 'light' ? 'medium' : style
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.impactOccurred?.(tgStyle)
  } catch {
    // ignore
  }
  fireTelegramProxy({ type: 'impact', impact_style: tgStyle })
  fireNavigatorVibrate(style === 'heavy' ? 26 : style === 'medium' ? 18 : 15)
  fireAudioClick(style === 'heavy' ? 'confirm' : 'tap')
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

export function hapticSwatch(): void {
  if (!isHapticsEnabled()) return
  const now = Date.now()
  if (now - lastSwatchHapticAt < SWATCH_COOLDOWN_MS) return
  lastSwatchHapticAt = now

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

export function hapticReset(): void {
  if (!isHapticsEnabled()) return
  try {
    const tgHaptic = getExtendedWindow()?.Telegram?.WebApp?.HapticFeedback
    tgHaptic?.notificationOccurred?.('warning')
  } catch {
    // ignore
  }
  fireTelegramProxy({ type: 'notification', notification_type: 'warning' })
  fireNavigatorVibrate([24, 24, 16])
  fireAudioClick('reset')
}

