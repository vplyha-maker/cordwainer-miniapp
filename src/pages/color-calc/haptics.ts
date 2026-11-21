const STORAGE_KEY = 'cordwaine_haptics_enabled'

type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
type NotificationType = 'error' | 'success' | 'warning'

interface TgHapticAPI {
  impactOccurred?: (style: ImpactStyle) => void
  notificationOccurred?: (type: NotificationType) => void
  selectionChanged?: () => void
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
    // ignore storage errors in private mode
  }
}

function getTgHaptic(): TgHapticAPI | null {
  if (typeof window === 'undefined' || !isHapticsEnabled()) return null
  const api = window.Telegram?.WebApp?.HapticFeedback as TgHapticAPI | undefined
  return api || null
}

/** Лёгкий отклик при переключении вкладок, слоёв, режимов и освещения */
export function hapticSelect(): void {
  const api = getTgHaptic()
  if (api?.selectionChanged) {
    api.selectionChanged()
  }
}

/** Мягкий тактильный клик на обычных кнопках */
export function hapticTap(): void {
  const api = getTgHaptic()
  if (api?.impactOccurred) {
    api.impactOccurred('light')
  }
}

/** Выраженный отклик для ключевых действий (синтез рецепта, перенос в формулу) */
export function hapticConfirm(): void {
  const api = getTgHaptic()
  if (api?.impactOccurred) {
    api.impactOccurred('medium')
  }
}

/** Сигнал успешного завершения (копирование HEX, найден рецепт) */
export function hapticSuccess(): void {
  const api = getTgHaptic()
  if (api?.notificationOccurred) {
    api.notificationOccurred('success')
  }
}

/** Сигнал ошибки или предупреждения */
export function hapticError(): void {
  const api = getTgHaptic()
  if (api?.notificationOccurred) {
    api.notificationOccurred('error')
  }
}
