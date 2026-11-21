const STORAGE_KEY = 'cordwaine_haptics_enabled'

type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
type NotificationType = 'error' | 'success' | 'warning'

interface TgHapticAPI {
  impactOccurred?: (style: ImpactStyle) => void
  notificationOccurred?: (type: NotificationType) => void
  selectionChanged?: () => void
}

function detectIOS(): boolean {
  if (typeof window === 'undefined') return false
  const tgPlatform = window.Telegram?.WebApp?.platform as string | undefined
  if (tgPlatform === 'ios') return true
  if (typeof navigator !== 'undefined') {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent)
  }
  return false
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

function getTgHaptic(): TgHapticAPI | null {
  if (typeof window === 'undefined' || !isHapticsEnabled()) return null
  const api = window.Telegram?.WebApp?.HapticFeedback as TgHapticAPI | undefined
  return api || null
}

/** Лёгкий отклик при переключении вкладок, слоёв, режимов и освещения */
export function hapticSelect(): void {
  try {
    getTgHaptic()?.selectionChanged?.()
  } catch {}
}

/** Мягкий клик: на iOS — selectionChanged, на Android — light impact */
export function hapticTap(): void {
  try {
    const api = getTgHaptic()
    if (!api) return
    if (IS_IOS) api.selectionChanged?.()
    else api.impactOccurred?.('light')
  } catch {}
}

/** Выраженный отклик для ключевых действий: на iOS — light impact, на Android — medium */
export function hapticConfirm(): void {
  try {
    const api = getTgHaptic()
    if (!api) return
    if (IS_IOS) api.impactOccurred?.('light')
    else api.impactOccurred?.('medium')
  } catch {}
}

/** Сигнал успешного завершения (копирование HEX, синтез рецепта) */
export function hapticSuccess(): void {
  try {
    getTgHaptic()?.notificationOccurred?.('success')
  } catch {}
}

/** Сигнал ошибки или предупреждения */
export function hapticError(): void {
  try {
    getTgHaptic()?.notificationOccurred?.('error')
  } catch {}
}
