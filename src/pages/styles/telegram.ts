export type TelegramWebApp = {
  initData?: string
  initDataUnsafe?: { user?: { id?: number } }
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  BackButton?: {
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
  ready: () => void
  expand?: () => void
  disableVerticalSwipes?: () => void
  showAlert?: (message: string) => void
  openTelegramLink?: (url: string) => void
  openInvoice?: (link: string, cb: (status: string) => void) => void
}

export function getTelegramWebApp(): TelegramWebApp | undefined {
  try {
    return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp
  } catch {
    return undefined
  }
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'unknown'
  const tg = getTelegramWebApp()
  const tgUserId = tg?.initDataUnsafe?.user?.id?.toString()
  if (tgUserId) return tgUserId

  try {
    let deviceId = localStorage.getItem('cordwainer_device_id')
    if (!deviceId) {
      deviceId = 'web_' + Math.random().toString(36).substring(2, 15)
      localStorage.setItem('cordwainer_device_id', deviceId)
    }
    return deviceId
  } catch {
    return 'web_guest'
  }
}

export function isRunningInTelegram(): boolean {
  if (typeof window === 'undefined') return false
  const tg = getTelegramWebApp()
  return Boolean(tg?.initData && tg.initData.length > 0 && tg?.initDataUnsafe?.user?.id)
}

export function showTelegramAlert(message: string): void {
  const tg = getTelegramWebApp()
  if (isRunningInTelegram() && tg?.showAlert) {
    try {
      tg.showAlert(message)
      return
    } catch {}
  }
  alert(message)
}

