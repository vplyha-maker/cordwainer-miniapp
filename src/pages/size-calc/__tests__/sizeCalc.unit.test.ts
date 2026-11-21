import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ADULT_TABLE,
  KIDS_TABLE,
  RANGES,
  STYLE_ALLOWANCES,
  calculateProFit,
  computeStandardBallMetrics,
  convertShoeSize,
  formatSize,
  getWidthMarks,
  toMondopoint,
  type BrandFitEntry,
} from '../../../lib/shoeSizes'
import {
  applyThemePreference,
  detectTelegramMiniApp,
  isClassicBrandEntry,
  loadSavedPrefs,
  resolveInitialDarkTheme,
  savePrefs,
} from '../storage'
import {
  APP_THEME_STORAGE_KEY,
  LEGACY_PREFS_STORAGE_KEY,
  PREFS_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from '../types'

describe('shoeSizes — математическое ядро и инварианты таблиц', () => {
  it('toMondopoint корректно округляет к ближайшему шагу 5 мм', () => {
    expect(toMondopoint(267)).toBe(265)
    expect(toMondopoint(268)).toBe(270)
    expect(toMondopoint(270)).toBe(270)
    expect(toMondopoint(272)).toBe(270)
    expect(toMondopoint(273)).toBe(275)
  })

  it('formatSize убирает .0 у целых чисел и сохраняет половинки', () => {
    expect(formatSize(42)).toBe('42')
    expect(formatSize(42.0)).toBe('42')
    expect(formatSize(42.5)).toBe('42.5')
    expect(formatSize(9.5)).toBe('9.5')
  })

  it('ADULT_TABLE строго монотонна по всем размерным шкалам', () => {
    for (let i = 1; i < ADULT_TABLE.length; i++) {
      const prev = ADULT_TABLE[i - 1]
      const curr = ADULT_TABLE[i]
      expect(curr.mm).toBeGreaterThan(prev.mm)
      expect(curr.ua).toBeGreaterThan(prev.ua)
      expect(curr.eu).toBeGreaterThan(prev.eu)
      expect(curr.uk).toBeGreaterThan(prev.uk)
      expect(curr.usMen).toBeGreaterThan(prev.usMen)
      expect(curr.usWomen).toBeGreaterThan(prev.usWomen)
      expect(curr.jp).toBeGreaterThan(prev.jp)
      expect(curr.br).toBeGreaterThan(prev.br)
      expect(curr.cn).toBeGreaterThan(prev.cn)
      expect(curr.usWomen - curr.usMen).toBe(1)
    }
  })

  it('KIDS_TABLE строго монотонна по метрическим и европейским шкалам', () => {
    for (let i = 1; i < KIDS_TABLE.length; i++) {
      const prev = KIDS_TABLE[i - 1]
      const curr = KIDS_TABLE[i]
      expect(curr.mm).toBeGreaterThan(prev.mm)
      expect(curr.ua).toBeGreaterThan(prev.ua)
      expect(curr.eu).toBeGreaterThan(prev.eu)
      expect(curr.jp).toBeGreaterThan(prev.jp)
      expect(curr.br).toBeGreaterThan(prev.br)
      expect(curr.cn).toBeGreaterThan(prev.cn)
    }
  })

  it('convertShoeSize возвращает эталонные значения для мужчин, женщин и детей', () => {
    const men270 = convertShoeSize(270, 'men')
    expect(men270).toMatchObject({
      mondopoint: 270,
      ua: 42,
      eu: 42.5,
      uk: 8.5,
      us: 9,
      jp: 27,
      br: 40,
      cn: 44,
      cm: 27,
      mm: 270,
    })

    const women270 = convertShoeSize(270, 'women')
    expect(women270.us).toBe(10)
    expect(women270.eu).toBe(42.5)

    const kids170 = convertShoeSize(170, 'kids')
    expect(kids170).toMatchObject({
      mondopoint: 170,
      ua: 27,
      eu: 27.5,
      uk: 10,
      us: 10.5,
      jp: 17,
      br: 25.5,
      cn: 24,
    })
  })

  it('convertShoeSize безопасно ограничивает экстремальные значения', () => {
    const tooSmall = convertShoeSize(50, 'men')
    expect(tooSmall.mm).toBe(115)
    expect(tooSmall.eu).toBe(ADULT_TABLE[0].eu)

    const tooLarge = convertShoeSize(500, 'men')
    expect(tooLarge.mm).toBe(330)
    expect(tooLarge.eu).toBe(ADULT_TABLE[ADULT_TABLE.length - 1].eu)
  })

  it('calculateProFit корректно считает припуски и сдвиг размера для зимы, бега и полноты', () => {
    const sneakers = calculateProFit(270, 'men', 'sneakers', 'standard')
    expect(sneakers.allowanceMm).toBe(STYLE_ALLOWANCES.sneakers.insoleAddMm)
    expect(sneakers.insoleMm).toBe(280)
    expect(sneakers.hasReserveShift).toBe(false)
    expect(sneakers.recommendedSize.eu).toBe(42.5)

    const winter = calculateProFit(270, 'men', 'winter', 'standard')
    expect(winter.allowanceMm).toBe(15)
    expect(winter.insoleMm).toBe(285)
    expect(winter.hasReserveShift).toBe(true)
    expect(winter.recommendedSize.eu).toBe(43)
    expect(winter.recommendedSize.ua).toBe(42.5)

    const extraWideSneakers = calculateProFit(270, 'men', 'sneakers', 'extraWide')
    expect(extraWideSneakers.allowanceMm).toBe(13) // 10 + 3 мм компенсации
    expect(extraWideSneakers.hasReserveShift).toBe(true)
    expect(extraWideSneakers.recommendedSize.eu).toBe(43)

    // Двойной запас (зима + extraWide) не суммируется сверх шага 5 мм
    const winterExtraWide = calculateProFit(270, 'men', 'winter', 'extraWide')
    expect(winterExtraWide.allowanceMm).toBe(18) // 15 + 3 мм
    expect(winterExtraWide.recommendedSize.eu).toBe(43)
  })

  it('computeStandardBallMetrics монотонно растёт с полнотой и длиной стопы', () => {
    const narrow = computeStandardBallMetrics(265, 'men', 'narrow')
    const standard = computeStandardBallMetrics(265, 'men', 'standard')
    const wide = computeStandardBallMetrics(265, 'men', 'wide')
    const extraWide = computeStandardBallMetrics(265, 'men', 'extraWide')

    expect(standard).toEqual({ ballGirthMm: 254, ballWidthMm: 103 })
    expect(narrow.ballGirthMm).toBeLessThan(standard.ballGirthMm)
    expect(standard.ballGirthMm).toBeLessThan(wide.ballGirthMm)
    expect(wide.ballGirthMm).toBeLessThan(extraWide.ballGirthMm)

    const womenBase = computeStandardBallMetrics(240, 'women', 'standard')
    expect(womenBase).toEqual({ ballGirthMm: 234, ballWidthMm: 96 })

    const kidsBase = computeStandardBallMetrics(170, 'kids', 'standard')
    expect(kidsBase).toEqual({ ballGirthMm: 168, ballWidthMm: 68 })
  })

  it('getWidthMarks и brandMatrix отдают корректные маркировки и локализации', () => {
    expect(getWidthMarks('standard', 'men').eu).toBe('G')
    expect(getWidthMarks('extraWide', 'women').us).toBe('2E (X-Wide)')
    expect(getWidthMarks('wide', 'kids').us).toBe('W (2E)')

    const fit = calculateProFit(270, 'men', 'sneakers', 'wide')
    expect(fit.brandMatrix).toHaveLength(5)
    const nb = fit.brandMatrix.find((b) => b.brand === 'New Balance')
    expect(nb?.us).toContain('(2E)')

    for (const row of fit.brandMatrix) {
      expect(row.offsetNote.ru.length).toBeGreaterThan(5)
      expect(row.offsetNote.uk.length).toBeGreaterThan(5)
      expect(row.offsetNote.de.length).toBeGreaterThan(5)
      expect(row.offsetNote.en.length).toBeGreaterThan(5)
    }
  })
})

describe('size-calc/storage — настройки, тема, Telegram и классификация брендов', () => {
  const originalTelegram = (window as unknown as { Telegram?: unknown }).Telegram

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.style.backgroundColor = ''
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

  it('savePrefs и loadSavedPrefs сохраняют, валидируют и ограничивают значения', () => {
    savePrefs({
      gender: 'women',
      measureMode: 'insole',
      unit: 'cm',
      shoeStyle: 'winter',
      widthFit: 'wide',
      footMm: 245,
    })

    expect(loadSavedPrefs()).toEqual({
      gender: 'women',
      measureMode: 'insole',
      unit: 'cm',
      shoeStyle: 'winter',
      widthFit: 'wide',
      footMm: 245,
    })

    // Отбрасывает невалидные enum и зажимает footMm в границы диапазона kids
    localStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({
        gender: 'kids',
        measureMode: 'broken',
        unit: 'inches',
        shoeStyle: 'boots',
        widthFit: 'huge',
        footMm: 999,
      })
    )
    expect(loadSavedPrefs()).toEqual({
      gender: 'kids',
      measureMode: undefined,
      unit: undefined,
      shoeStyle: undefined,
      widthFit: undefined,
      footMm: RANGES.kids.max,
    })
  })

  it('loadSavedPrefs подхватывает legacy-ключ и не падает на битом JSON', () => {
    localStorage.setItem(
      LEGACY_PREFS_STORAGE_KEY,
      JSON.stringify({ gender: 'men', footMm: 275 })
    )
    expect(loadSavedPrefs().footMm).toBe(275)

    localStorage.setItem(PREFS_STORAGE_KEY, '{broken_json')
    expect(loadSavedPrefs()).toEqual({})
  })

  it('detectTelegramMiniApp отличает браузер от среды Telegram', () => {
    expect(detectTelegramMiniApp()).toBe(false)

    ;(window as unknown as { Telegram?: unknown }).Telegram = {
      WebApp: { platform: 'unknown', initData: '' },
    }
    expect(detectTelegramMiniApp()).toBe(false)

    ;(window as unknown as { Telegram?: unknown }).Telegram = {
      WebApp: { platform: 'ios', initData: '' },
    }
    expect(detectTelegramMiniApp()).toBe(true)

    ;(window as unknown as { Telegram?: unknown }).Telegram = {
      WebApp: { platform: 'unknown', initData: 'query_id=1' },
    }
    expect(detectTelegramMiniApp()).toBe(true)
  })

  it('applyThemePreference и resolveInitialDarkTheme синхронизируют DOM, storage и Telegram', () => {
    const setHeaderColor = vi.fn()
    const setBackgroundColor = vi.fn()
    ;(window as unknown as { Telegram?: unknown }).Telegram = {
      WebApp: { setHeaderColor, setBackgroundColor },
    }

    applyThemePreference(false)
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(setHeaderColor).toHaveBeenCalledWith('#F7F4EE')
    expect(setBackgroundColor).toHaveBeenCalledWith('#F7F4EE')
    expect(resolveInitialDarkTheme()).toBe(false)

    applyThemePreference(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(resolveInitialDarkTheme()).toBe(true)
  })

  it('isClassicBrandEntry корректно разделяет классику и спорт', () => {
    const makeRow = (category: string): BrandFitEntry => ({
      brand: 'Test',
      category,
      eu: '42.5',
      us: '9',
      uk: '8.5',
      jp: '27.0',
      offsetNote: { ru: '', uk: '', de: '', en: '' },
    })

    expect(isClassicBrandEntry(makeRow('Leather'))).toBe(true)
    expect(isClassicBrandEntry(makeRow('Classic Dress'))).toBe(true)
    expect(isClassicBrandEntry(makeRow('Sneakers'))).toBe(false)
    expect(isClassicBrandEntry(makeRow('1/3 Grid'))).toBe(false)
  })
})

