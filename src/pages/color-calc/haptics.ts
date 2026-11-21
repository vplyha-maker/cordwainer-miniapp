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

function getTgHaptic(): TgHapticAPI | null {
  if (typeof window === 'undefined' || !isHapticsEnabled()) return null
  return (window.Telegram?.WebApp?.HapticFeedback as TgHapticAPI | undefined) || null
}

function getProxy(): TgWebviewProxy | null {
  if (typeof window === 'undefined' || !isHapticsEnabled()) return null
  const raw = (window as unknown as { TelegramWebviewProxy?: TgWebviewProxy }).TelegramWebviewProxy
  return raw || null
}

function triggerImpact(style: 'light' | 'medium' | 'heavy'): void {
  if (!isHapticsEnabled()) return
  const tgStyle: 'light' | 'medium' = style === 'heavy' ? 'medium' : 'light'

  try {
    getTgHaptic()?.impactOccurred?.(tgStyle)
  } catch {}

  try {
    getProxy()?.postEvent?.(
      'web_app_trigger_haptic_feedback',
      JSON.stringify({ type: 'impact', impact_style: tgStyle })
    )
  } catch {}

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      const ms = style === 'heavy' ? 16 : style === 'medium' ? 11 : 7
      navigator.vibrate(ms)
    }
  } catch {}
}

/** Лёгкий отклик при переключении вкладок, слоёв, режимов и освещения */
export function hapticSelect(): void {
  if (!isHapticsEnabled()) return
  try {
    const hf = getTgHaptic()
    if (hf?.selectionChanged) {
      hf.selectionChanged()
    } else {
      getProxy()?.postEvent?.(
        'web_app_trigger_haptic_feedback',
        JSON.stringify({ type: 'selection_change' })
      )
    }
  } catch {}

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(6)
    }
  } catch {}
}

/** Мягкий клик на обычных кнопках */
export function hapticTap(): void {
  triggerImpact('light')
}

/** Выраженный отклик для ключевых действий */
export function hapticConfirm(): void {
  triggerImpact('medium')
}

/** Сигнал успешного завершения (копирование HEX, синтез рецепта) */
export function hapticSuccess(): void {
  if (!isHapticsEnabled()) return
  try {
    getTgHaptic()?.notificationOccurred?.('success')
    getProxy()?.postEvent?.(
      'web_app_trigger_haptic_feedback',
      JSON.stringify({ type: 'notification', notification_type: 'success' })
    )
  } catch {}
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(14)
    }
  } catch {}
}

/** Сигнал ошибки или предупреждения */
export function hapticError(): void {
  if (!isHapticsEnabled()) return
  try {
    getTgHaptic()?.notificationOccurred?.('error')
    getProxy()?.postEvent?.(
      'web_app_trigger_haptic_feedback',
      JSON.stringify({ type: 'notification', notification_type: 'error' })
    )
  } catch {}
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([14, 30, 14])
    }
  } catch {}
}
