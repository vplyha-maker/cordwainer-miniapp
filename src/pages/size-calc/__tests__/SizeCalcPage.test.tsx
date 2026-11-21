import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { SizeCalcPage } from '../../SizeCalcPage'
import { I18N, PRO_PRICE_STARS } from '../../../lib/sizeCalcI18n'
import { PREFS_STORAGE_KEY } from '../types'

vi.mock('../haptics', () => ({
  IS_IOS: false,
  SLIDER_HAPTIC_THROTTLE_MS: 42,
  isHapticsEnabled: vi.fn(() => true),
  safeHapticImpact: vi.fn(),
  safeHapticSelection: vi.fn(),
}))

function mockTelegramWebApp(overrides: Record<string, unknown> = {}) {
  const tg = {
    platform: 'android',
    initData: 'query_id=test&hash=abc123',
    initDataUnsafe: { user: { id: 777001 } },
    openInvoice: vi.fn(),
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
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

describe('SizeCalcPage — интеграционные тесты', () => {
  const originalTelegram = (window as unknown as { Telegram?: unknown }).Telegram

  beforeEach(() => {
    window.scrollTo = vi.fn()
    localStorage.clear()
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add('dark')
    delete (window as unknown as { Telegram?: unknown }).Telegram

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ purchased: false }),
      })
    )
  })

  afterEach(() => {
    cleanup()
    if (originalTelegram !== undefined) {
      ;(window as unknown as { Telegram?: unknown }).Telegram = originalTelegram
    } else {
      delete (window as unknown as { Telegram?: unknown }).Telegram
    }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('рендерит дефолтные мужские размеры (270 мм -> 42 UA / 42.5 EU) и кнопку PRO', () => {
    render(<SizeCalcPage onBack={vi.fn()} lang="ru" />)

    expect(screen.getAllByText('270').length).toBeGreaterThan(0)
    expect(screen.getAllByText('42').length).toBeGreaterThan(0)
    expect(screen.getAllByText('42.5').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('button', { name: new RegExp(String(PRO_PRICE_STARS)) })
    ).toBeTruthy()
  })

  it('зажимает длину стопы при переключении на «Детский» и сохраняет настройки', () => {
    render(<SizeCalcPage onBack={vi.fn()} lang="ru" />)

    fireEvent.click(screen.getByRole('button', { name: I18N.ru.kids }))

    // 270 мм зажимается в RANGES.kids.max = 230 мм (36.5 UA / 37 EU)
    expect(screen.getAllByText('230').length).toBeGreaterThan(0)
    expect(screen.getAllByText('36.5').length).toBeGreaterThan(0)
    expect(screen.getAllByText('37').length).toBeGreaterThan(0)

    const saved = JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY) || '{}')
    expect(saved.gender).toBe('kids')
    expect(saved.footMm).toBe(230)
  })

  it('переключает режим «По стельке» и единицы измерения «см / мм»', () => {
    render(<SizeCalcPage onBack={vi.fn()} lang="ru" />)

    // 270 мм + 10 мм (кроссовки) = 280 мм стелька
    fireEvent.click(screen.getByRole('button', { name: I18N.ru.modeInsole }))
    expect(screen.getByText('280')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: I18N.ru.cmLabel }))
    expect(screen.getByText('28,0')).toBeTruthy()
  })

  it('поддерживает ручной ввод длины стопы и кнопки − / +', () => {
    render(<SizeCalcPage onBack={vi.fn()} lang="ru" />)

    // Клик по отображаемому значению «270» открывает input
    fireEvent.click(screen.getByText('270'))
    const input = screen.getByDisplayValue('270')
    fireEvent.change(input, { target: { value: '280' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // 280 мм -> 43.5 UA / 44 EU
    expect(screen.getByText('280')).toBeTruthy()
    expect(screen.getAllByText('43.5').length).toBeGreaterThan(0)
    expect(screen.getAllByText('44').length).toBeGreaterThan(0)

    // Кнопка +1 мм
    const incBtn = screen.getByRole('button', { name: 'Increase' })
    fireEvent.pointerDown(incBtn)
    fireEvent.pointerUp(incBtn)
    expect(screen.getByText('281')).toBeTruthy()

    // Кнопка -1 мм
    const decBtn = screen.getByRole('button', { name: 'Decrease' })
    fireEvent.pointerDown(decBtn)
    fireEvent.pointerUp(decBtn)
    expect(screen.getByText('280')).toBeTruthy()
  })

  it('переключает вкладки и применяет запас для стиля «Зима / Мех»', () => {
    render(<SizeCalcPage onBack={vi.fn()} lang="ru" />)

    fireEvent.click(screen.getByRole('button', { name: I18N.ru.tabFit }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(I18N.ru.styleWinter) }))

    // 270 мм + зимний запас -> 42.5 UA / 43 EU
    expect(screen.getAllByText('43').length).toBeGreaterThan(0)
    expect(screen.getByText(/С запасом · Зима \/ Мех/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: I18N.ru.tabBrands }))
    expect(screen.getByText('Nike / Jordan')).toBeTruthy()
    expect(screen.getByText('Goodyear / Classic')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: I18N.ru.tabGuide }))
    expect(screen.getByText(I18N.ru.guideFootTitle)).toBeTruthy()
  })

  it('показывает ошибку при попытке оплаты PRO вне Telegram', async () => {
    render(<SizeCalcPage onBack={vi.fn()} lang="ru" />)

    const proBtn = screen.getByRole('button', { name: new RegExp(String(PRO_PRICE_STARS)) })
    fireEvent.click(proBtn)

    await waitFor(() => {
      expect(screen.getByText(I18N.ru.openInTelegramErr)).toBeTruthy()
    })
  })

  it('проходит полный цикл оплаты Telegram Stars и открывает PRO-доступ', async () => {
    const tg = mockTelegramWebApp({
      openInvoice: vi.fn((_link: string, cb: (status: string) => void) => {
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
            json: async () => ({ invoiceLink: 'https://t.me/$pro_sizes_invoice' }),
          }
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ purchased: false }),
        }
      })
    )

    render(<SizeCalcPage onBack={vi.fn()} lang="ru" />)

    const proBtn = screen.getByRole('button', { name: new RegExp(String(PRO_PRICE_STARS)) })
    fireEvent.click(proBtn)

    await waitFor(() => {
      expect(tg.openInvoice).toHaveBeenCalledWith(
        'https://t.me/$pro_sizes_invoice',
        expect.any(Function)
      )
    })

    await waitFor(() => {
      expect(screen.getByText(new RegExp(I18N.ru.proActiveBadge))).toBeTruthy()
    })
  })

  it('вызывает onBack и переключает светлую/тёмную тему', () => {
    const onBack = vi.fn()
    render(<SizeCalcPage onBack={onBack} lang="ru" />)

    fireEvent.click(screen.getByRole('button', { name: I18N.ru.back }))
    expect(onBack).toHaveBeenCalledTimes(1)

    const themeBtn = screen.getByRole('button', { name: /Switch to light mode/i })
    fireEvent.click(themeBtn)
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})

