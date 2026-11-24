type TgUser = {
  id?: number | string
  username?: string
  first_name?: string
  last_name?: string
  language_code?: string
}

type TgWindow = {
  Telegram?: {
    WebApp?: {
      initData?: string
      initDataUnsafe?: {
        user?: TgUser
      }
      platform?: string
    }
  }
}

export const BANNED_EVENT_NAME = 'cordwaine:user-banned'

let sessionFallbackId = ''

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
    if (!sessionFallbackId) {
      sessionFallbackId = 'web_' + Math.random().toString(36).slice(2, 12)
    }
    return sessionFallbackId
  }
}

function resolveTelegramUser(tg: NonNullable<TgWindow['Telegram']>['WebApp']): TgUser | null {
  const direct = tg?.initDataUnsafe?.user
  if (direct?.id != null) return direct

  if (tg?.initData) {
    try {
      const rawUser = new URLSearchParams(tg.initData).get('user')
      if (rawUser) {
        const parsed = JSON.parse(rawUser) as TgUser
        if (parsed?.id != null) return parsed
      }
    } catch {
      return null
    }
  }

  return null
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
    const tgUser = resolveTelegramUser(tg)
    const isTelegram = Boolean(tgUser?.id != null || initData)

    const deviceId = getOrCreateDeviceId()
    const userId = tgUser?.id != null ? String(tgUser.id) : deviceId
    const username = tgUser?.username || ''
    const firstName = [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(' ')
    const source = isTelegram ? 'telegram' : 'web'

    const rawPlatform = tg?.platform && tg.platform !== 'unknown' ? tg.platform : ''
    const platform = rawPlatform || (isTelegram ? 'telegram' : 'web')

    const metaLang = typeof meta?.lang === 'string' ? meta.lang : ''
    const browserLang = typeof navigator !== 'undefined' ? (navigator.language || '').slice(0, 2) : ''
    const lang = (metaLang || tgUser?.language_code || browserLang || 'unknown').toLowerCase()

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
        userId,
        username,
        firstName,
        source,
        platform,
        lang,
        event,
        page,
        deviceId,
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
