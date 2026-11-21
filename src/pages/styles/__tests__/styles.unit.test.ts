import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getUiText } from '../i18n'
import { STYLES_DATA } from '../stylesData'
import { getDeviceId, isRunningInTelegram } from '../telegram'
import {
  FREE_STYLES_COUNT,
  PREVIEW_TAG_COUNT,
  PRO_VIDEOS_PRICE_STARS,
  normalizeSupportedLang,
  type SupportedLang,
} from '../types'

describe('StylesPage — типы и нормализация языка', () => {
  it('корректно пропускает поддерживаемые языки', () => {
    expect(normalizeSupportedLang('ru')).toBe('ru')
    expect(normalizeSupportedLang('uk')).toBe('uk')
    expect(normalizeSupportedLang('de')).toBe('de')
  })

  it('делает fallback на ru для неизвестных значений', () => {
    expect(normalizeSupportedLang('en')).toBe('ru')
    expect(normalizeSupportedLang('')).toBe('ru')
    expect(normalizeSupportedLang(null)).toBe('ru')
    expect(normalizeSupportedLang(undefined)).toBe('ru')
    expect(normalizeSupportedLang(42)).toBe('ru')
  })
})

describe('STYLES_DATA — целостность коллекции', () => {
  it('содержит больше фасонов, чем бесплатный лимит', () => {
    expect(STYLES_DATA.length).toBeGreaterThan(FREE_STYLES_COUNT)
  })

  it('все id фасонов уникальны и подходят для URL (?style=...)', () => {
    const ids = STYLES_DATA.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9_-]+$/i)
    }
  })

  it('у каждого фасона заполнены тексты на всех 3 языках и медиа', () => {
    const langs: SupportedLang[] = ['ru', 'uk', 'de']
    for (const slide of STYLES_DATA) {
      expect(Boolean(slide.video || slide.image)).toBe(true)
      for (const lang of langs) {
        expect(slide.title[lang].trim().length).toBeGreaterThan(0)
        expect(slide.subtitle[lang].trim().length).toBeGreaterThan(0)
        expect(slide.desc[lang].trim().length).toBeGreaterThan(10)
      }
    }
  })
})

describe('getUiText — локализация и динамические счётчики', () => {
  const langs: SupportedLang[] = ['ru', 'uk', 'de']

  it('подставляет актуальное число фасонов и цену в звёздах', () => {
    const total = STYLES_DATA.length
    const locked = total - FREE_STYLES_COUNT
    const extra = locked - PREVIEW_TAG_COUNT

    for (const lang of langs) {
      const ui = getUiText(lang, total)
      expect(ui.paywall.tag).toContain(`+${locked}`)
      expect(ui.paywall.btn).toContain(String(PRO_VIDEOS_PRICE_STARS))
      expect(ui.moreStyles).toContain(String(extra))
      expect(ui.paywall.desc).toContain(String(FREE_STYLES_COUNT))
      expect(ui.paywall.desc).toContain(String(total))
    }
  })

  it('не содержит технических упоминаний AI / KI в текстах paywall', () => {
    for (const lang of langs) {
      const ui = getUiText(lang, STYLES_DATA.length)
      const combined = `${ui.paywall.tag} ${ui.paywall.desc} ${ui.moreStyles}`
      expect(combined).not.toMatch(/\b(AI|KI)\b/i)
    }
  })
})

describe('telegram.ts — окружение и deviceId', () => {
  const originalTelegram = (window as unknown as { Telegram?: unknown }).Telegram

  beforeEach(() => {
    localStorage.clear()
    delete (window as unknown as { Telegram?: unknown }).Telegram
  })

  afterEach(() => {
    if (originalTelegram !== undefined) {
      ;(window as unknown as { Telegram?: unknown }).Telegram = originalTelegram
    } else {
      delete (window as unknown as { Telegram?: unknown }).Telegram
    }
    vi.restoreAllMocks()
  })

  it('isRunningInTelegram возвращает false в обычном браузере', () => {
    expect(isRunningInTelegram()).toBe(false)
  })

  it('isRunningInTelegram возвращает false, если initData пустой', () => {
    ;(window as unknown as { Telegram?: unknown }).Telegram = {
      WebApp: { initData: '', initDataUnsafe: { user: { id: 123 } } },
    }
    expect(isRunningInTelegram()).toBe(false)
  })

  it('isRunningInTelegram возвращает true при валидных initData и user.id', () => {
    ;(window as unknown as { Telegram?: unknown }).Telegram = {
      WebApp: { initData: 'query_id=abc&hash=123', initDataUnsafe: { user: { id: 777 } } },
    }
    expect(isRunningInTelegram()).toBe(true)
  })

  it('getDeviceId возвращает Telegram user.id внутри WebApp', () => {
    ;(window as unknown as { Telegram?: unknown }).Telegram = {
      WebApp: { initData: 'ok', initDataUnsafe: { user: { id: 987654 } } },
    }
    expect(getDeviceId()).toBe('987654')
  })

  it('getDeviceId генерирует и кэширует web_id в браузере', () => {
    const first = getDeviceId()
    const second = getDeviceId()
    expect(first).toMatch(/^web_/)
    expect(second).toBe(first)
  })
})

