type TgWindow = {
  Telegram?: {
    WebApp?: {
      initData?: string
      platform?: string
    }
  }
}

export const BANNED_EVENT_NAME = 'cordwaine:user-banned'

function getOrCreateDeviceId(): string {
  try {
    const key = 'cordwainer_device_id'
    let id = localStorage.getItem(key)
    if (!id) {
      id = 'web_' + Math.random().toString(36).slice(2, 12)
      localStorage.setItem(key, id)
    }
    return id
  } catch {
    return 'web_guest'
  }
}

export function trackEvent(
  event: string,
  page?: string,
  meta?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined') return
  try {
    const tg = (window as unknown as TgWindow).Telegram?.WebApp
    const initData = tg?.initData || ''
    const platform = tg?.platform || (initData ? 'telegram' : 'web')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (initData) {
      headers['X-Telegram-Init-Data'] = initData
    }

    fetch('/api/check-purchase?action=track', {
      method: 'POST',
      headers,
      keepalive: true,
      body: JSON.stringify({
        event,
        page,
        platform,
        deviceId: getOrCreateDeviceId(),
        meta,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { banned?: boolean; reason?: string } | null) => {
        if (data?.banned) {
          window.dispatchEvent(
            new CustomEvent(BANNED_EVENT_NAME, {
              detail: data.reason || 'Доступ ограничен администратором',
            })
          )
        }
      })
      .catch(() => {})
  } catch {
    // аналитика никогда не должна ломать интерфейс
  }
}
