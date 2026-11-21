import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  StylesPage,
  STYLES_DATA,
  FREE_STYLES_COUNT,
  PRO_VIDEOS_PRICE_STARS,
} from '../../StylesPage'

vi.mock('../haptics', () => ({
  hapticTap: vi.fn(),
  hapticSwatch: vi.fn(),
  hapticSave: vi.fn(),
  hapticReset: vi.fn(),
  triggerHaptic: vi.fn(),
}))

function setupDomMocks() {
  class MockIntersectionObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)

  Element.prototype.scrollIntoView = vi.fn()
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  HTMLMediaElement.prototype.pause = vi.fn()
  HTMLMediaElement.prototype.load = vi.fn()
}

function mockTelegramWebApp(overrides: Record<string, unknown> = {}) {
  const tg = {
    initData: 'query_id=test&hash=abc123',
    initDataUnsafe: { user: { id: 100500 } },
    ready: vi.fn(),
    expand: vi.fn(),
    disableVerticalSwipes: vi.fn(),
    showAlert: vi.fn(),
    openTelegramLink: vi.fn(),
    openInvoice: vi.fn(),
    BackButton: {
      show: vi.fn(),
      hide: vi.fn(),
      onClick: vi.fn(),
      offClick: vi.fn(),
    },
    ...overrides,
  }
  ;(window as unknown as { Telegram?: { WebApp: typeof tg } }).Telegram = { WebApp: tg }
  return tg
}

describe('StylesPage — интеграционные тесты', () => {
  const originalTelegram = (window as unknown as { Telegram?: unknown }).Telegram

  beforeEach(() => {
    setupDomMocks()
    localStorage.clear()
    delete (window as unknown as { Telegram?: unknown }).Telegram
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ purchased: false, total: 0, isLiked: false }),
      })
    )
  })

  afterEach(() => {
    if (originalTelegram !== undefined) {
      ;(window as unknown as { Telegram?: unknown }).Telegram = originalTelegram
    } else {
      delete (window as unknown as { Telegram?: unknown }).Telegram
    }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('показывает только бесплатные фасоны и Paywall без покупки', () => {
    render(<StylesPage onBack={vi.fn()} lang="ru" />)

    // Первый бесплатный фасон виден
    expect(screen.getAllByText(STYLES_DATA[0].title.ru).length).toBeGreaterThan(0)
    // Кнопка покупки с актуальной ценой видна
    expect(
      screen.getByRole('button', { name: new RegExp(String(PRO_VIDEOS_PRICE_STARS)) })
    ).toBeTruthy()
    // Закрытый фасон за пределами бесплатного лимита не отрендерен как слайд
    const lockedSlideTitle = STYLES_DATA[STYLES_DATA.length - 1].title.ru
    expect(screen.queryByRole('heading', { name: lockedSlideTitle })).toBeNull()
  })

  it('открывает всю коллекцию и скрывает Paywall при подтверждённой покупке с сервера', async () => {
    mockTelegramWebApp()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/check-purchase')) {
          return { ok: true, status: 200, json: async () => ({ purchased: true }) }
        }
        return { ok: true, status: 200, json: async () => ({ total: 5, isLiked: false }) }
      })
    )

    render(<StylesPage onBack={vi.fn()} lang="ru" />)

    const lastSlideTitle = STYLES_DATA[STYLES_DATA.length - 1].title.ru
    await waitFor(() => {
      expect(screen.getAllByText(lastSlideTitle).length).toBeGreaterThan(0)
    })

    expect(
      screen.queryByRole('button', { name: new RegExp(String(PRO_VIDEOS_PRICE_STARS)) })
    ).toBeNull()
  })

  it('проходит полный цикл оплаты Telegram Stars (create-invoice -> openInvoice -> check-purchase)', async () => {
    let isPaidOnServer = false
    const tg = mockTelegramWebApp({
      openInvoice: vi.fn((_link: string, cb: (status: string) => void) => {
        isPaidOnServer = true
        cb('paid')
      }),
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/create-invoice')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ invoiceLink: 'https://t.me/$test_invoice' }),
          }
        }
        if (url.includes('/api/check-purchase')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ purchased: isPaidOnServer }),
          }
        }
        return { ok: true, status: 200, json: async () => ({ total: 0, isLiked: false }) }
      })
    )

    render(<StylesPage onBack={vi.fn()} lang="ru" />)

    const payBtn = screen.getByRole('button', {
      name: new RegExp(String(PRO_VIDEOS_PRICE_STARS)),
    })
    fireEvent.click(payBtn)

    await waitFor(() => {
      expect(tg.openInvoice).toHaveBeenCalledWith(
        'https://t.me/$test_invoice',
        expect.any(Function)
      )
    })

    const unlockedSlideTitle = STYLES_DATA[FREE_STYLES_COUNT].title.ru
    await waitFor(() => {
      expect(screen.getAllByText(unlockedSlideTitle).length).toBeGreaterThan(0)
    })
  })

  it('показывает предупреждение при попытке оплаты вне Telegram', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<StylesPage onBack={vi.fn()} lang="ru" />)

    const payBtn = screen.getByRole('button', {
      name: new RegExp(String(PRO_VIDEOS_PRICE_STARS)),
    })
    fireEvent.click(payBtn)

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Telegram Stars')
    )
  })

  it('автоматически прокручивает к фасону при передаче initialStyleId', async () => {
    vi.useFakeTimers()
    const targetStyle = STYLES_DATA[1] // chelsea

    render(<StylesPage onBack={vi.fn()} lang="ru" initialStyleId={targetStyle.id} />)
    vi.advanceTimersByTime(100)

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' })
    vi.useRealTimers()
  })

  it('вызывает onBack по клику на кнопку «Назад» и по клавише Escape', () => {
    const onBack = vi.fn()
    render(<StylesPage onBack={onBack} lang="ru" />)

    fireEvent.click(screen.getByRole('button', { name: /Назад/i }))
    expect(onBack).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onBack).toHaveBeenCalledTimes(2)
  })
})

