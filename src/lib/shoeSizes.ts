/**
 * src/lib/shoeSizes.ts
 * Официальное ядро конвертации размеров и биометрии обувной колодки:
 * - ГОСТ Р 57425-2017 (ISO/TS 19407:2015) / ISO 19407:2023 (Таблицы 1, 2, 3)
 * - ISO 9407:2019 (Mondopoint, шаг 5 мм)
 * - JIS S 5037:1998 (Япония: таблицы обхвата 足囲 и ширины пучков 足幅)
 * - ГОСТ 3927-88 / ГОСТ 11373-88 (интервал полноты 8 мм обхвата)
 * - US Brannock Device & Континентальная шкала полноты E–F–G–H–K
 */

export type Gender = 'men' | 'women' | 'kids'
export type ShoeStyle = 'sneakers' | 'classic' | 'winter' | 'running' | 'sandals'
export type WidthFit = 'narrow' | 'standard' | 'wide' | 'extraWide'
export type MeasureMode = 'foot' | 'insole'

export interface AdultIsoRow {
  mm: number
  eu: number
  uk: number
  usMen: number
  usWomen: number
  jp: number
  lastMinMm: number
  lastMaxMm: number
}

export interface KidsIsoRow {
  mm: number
  eu: number
  uk: number
  us: number
  jp: number
  lastMinMm: number
  lastMaxMm: number
}

export interface SizeResult {
  mondopoint: number
  eu: number
  uk: number
  us: number
  ukr: number
  jp: number
  cn: number
  kr: number
  br: number
  cm: number
  mm: number
  isoLastMinMm: number
  isoLastMaxMm: number
}

export interface WidthMarks {
  eu: 'E / F' | 'G' | 'H' | 'K'
  us: string
  uk: string
  jp: string
  gost: number
  cn: string
}

export interface BrandFitEntry {
  brand: string
  category: string
  eu: string
  us: string
  uk: string
  jp: string
  offsetNote: {
    ru: string
    uk: string
    de: string
    en: string
  }
}

export interface ProFitResult {
  footMm: number
  footCm: number
  insoleMm: number
  insoleCm: number
  lastTraceMm: number
  isoLastRangeMm: [number, number]
  allowanceMm: number
  styleSizeShiftEu: number
  recommendedSize: SizeResult
  ballWidthMm: number
  ballGirthMm: number
  widthMarks: WidthMarks
  brandMatrix: BrandFitEntry[]
}

/**
 * Таблица 1 и Таблица 2 ГОСТ Р 57425-2017 (ISO/TS 19407) — Взрослые размеры (210–320 мм)
 */
export const ADULT_TABLE: ReadonlyArray<AdultIsoRow> = [
  { mm: 210, eu: 33.5, uk: 2.0, usMen: 3.0, usWomen: 4.0, jp: 21.0, lastMinMm: 219, lastMaxMm: 231 },
  { mm: 215, eu: 34.0, uk: 2.5, usMen: 3.5, usWomen: 4.5, jp: 21.5, lastMinMm: 222, lastMaxMm: 234 },
  { mm: 220, eu: 35.0, uk: 3.0, usMen: 4.0, usWomen: 5.0, jp: 22.0, lastMinMm: 227, lastMaxMm: 239 },
  { mm: 225, eu: 35.5, uk: 3.5, usMen: 4.5, usWomen: 5.5, jp: 22.5, lastMinMm: 232, lastMaxMm: 244 },
  { mm: 230, eu: 36.5, uk: 4.0, usMen: 5.0, usWomen: 6.0, jp: 23.0, lastMinMm: 237, lastMaxMm: 249 },
  { mm: 235, eu: 37.0, uk: 4.5, usMen: 5.5, usWomen: 6.5, jp: 23.5, lastMinMm: 242, lastMaxMm: 254 },
  { mm: 240, eu: 38.0, uk: 5.5, usMen: 6.5, usWomen: 7.5, jp: 24.0, lastMinMm: 247, lastMaxMm: 259 },
  { mm: 245, eu: 38.5, uk: 6.0, usMen: 7.0, usWomen: 8.0, jp: 24.5, lastMinMm: 252, lastMaxMm: 264 },
  { mm: 250, eu: 39.5, uk: 6.5, usMen: 7.5, usWomen: 8.5, jp: 25.0, lastMinMm: 257, lastMaxMm: 269 },
  { mm: 255, eu: 40.0, uk: 7.0, usMen: 8.0, usWomen: 9.0, jp: 25.5, lastMinMm: 262, lastMaxMm: 274 },
  { mm: 260, eu: 41.0, uk: 7.5, usMen: 8.5, usWomen: 9.5, jp: 26.0, lastMinMm: 267, lastMaxMm: 279 },
  { mm: 265, eu: 41.5, uk: 8.5, usMen: 9.5, usWomen: 10.5, jp: 26.5, lastMinMm: 272, lastMaxMm: 284 },
  { mm: 270, eu: 42.5, uk: 9.0, usMen: 10.0, usWomen: 11.0, jp: 27.0, lastMinMm: 277, lastMaxMm: 289 },
  { mm: 275, eu: 43.0, uk: 9.5, usMen: 10.5, usWomen: 11.5, jp: 27.5, lastMinMm: 282, lastMaxMm: 294 },
  { mm: 280, eu: 44.0, uk: 10.0, usMen: 11.0, usWomen: 12.0, jp: 28.0, lastMinMm: 287, lastMaxMm: 299 },
  { mm: 285, eu: 44.5, uk: 10.5, usMen: 11.5, usWomen: 12.5, jp: 28.5, lastMinMm: 292, lastMaxMm: 304 },
  { mm: 290, eu: 45.5, uk: 11.0, usMen: 12.0, usWomen: 13.0, jp: 29.0, lastMinMm: 297, lastMaxMm: 309 },
  { mm: 295, eu: 46.0, uk: 12.0, usMen: 13.0, usWomen: 14.0, jp: 29.5, lastMinMm: 302, lastMaxMm: 314 },
  { mm: 300, eu: 47.0, uk: 12.5, usMen: 13.5, usWomen: 14.5, jp: 30.0, lastMinMm: 307, lastMaxMm: 319 },
  { mm: 305, eu: 47.5, uk: 13.0, usMen: 14.0, usWomen: 15.0, jp: 30.5, lastMinMm: 312, lastMaxMm: 324 },
  { mm: 310, eu: 48.5, uk: 13.5, usMen: 14.5, usWomen: 15.5, jp: 31.0, lastMinMm: 317, lastMaxMm: 329 },
  { mm: 315, eu: 49.0, uk: 14.0, usMen: 15.0, usWomen: 16.0, jp: 31.5, lastMinMm: 322, lastMaxMm: 334 },
  { mm: 320, eu: 50.0, uk: 15.0, usMen: 16.0, usWomen: 17.0, jp: 32.0, lastMinMm: 327, lastMaxMm: 339 },
]

/**
 * Таблица 3 ГОСТ Р 57425-2017 (ISO/TS 19407) — Детские размеры (120–235 мм)
 */
export const KIDS_TABLE: ReadonlyArray<KidsIsoRow> = [
  { mm: 120, eu: 19.5, uk: 3.5, us: 4.0, jp: 12.0, lastMinMm: 130, lastMaxMm: 136 },
  { mm: 125, eu: 20.0, uk: 4.0, us: 4.5, jp: 12.5, lastMinMm: 133, lastMaxMm: 139 },
  { mm: 130, eu: 21.0, uk: 5.0, us: 5.5, jp: 13.0, lastMinMm: 140, lastMaxMm: 146 },
  { mm: 135, eu: 22.0, uk: 5.5, us: 6.0, jp: 13.5, lastMinMm: 147, lastMaxMm: 153 },
  { mm: 140, eu: 22.5, uk: 6.0, us: 6.5, jp: 14.0, lastMinMm: 150, lastMaxMm: 156 },
  { mm: 145, eu: 23.5, uk: 7.0, us: 7.5, jp: 14.5, lastMinMm: 157, lastMaxMm: 163 },
  { mm: 150, eu: 24.5, uk: 7.5, us: 8.0, jp: 15.0, lastMinMm: 163, lastMaxMm: 169 },
  { mm: 155, eu: 25.0, uk: 8.0, us: 8.5, jp: 15.5, lastMinMm: 167, lastMaxMm: 173 },
  { mm: 160, eu: 26.0, uk: 9.0, us: 9.5, jp: 16.0, lastMinMm: 173, lastMaxMm: 179 },
  { mm: 165, eu: 27.0, uk: 9.5, us: 10.0, jp: 16.5, lastMinMm: 180, lastMaxMm: 186 },
  { mm: 170, eu: 27.5, uk: 10.0, us: 10.5, jp: 17.0, lastMinMm: 183, lastMaxMm: 189 },
  { mm: 175, eu: 28.5, uk: 11.0, us: 11.5, jp: 17.5, lastMinMm: 190, lastMaxMm: 196 },
  { mm: 180, eu: 29.0, uk: 11.5, us: 12.0, jp: 18.0, lastMinMm: 193, lastMaxMm: 199 },
  { mm: 185, eu: 30.0, uk: 12.0, us: 12.5, jp: 18.5, lastMinMm: 200, lastMaxMm: 206 },
  { mm: 190, eu: 31.0, uk: 13.0, us: 13.5, jp: 19.0, lastMinMm: 207, lastMaxMm: 213 },
  { mm: 195, eu: 31.5, uk: 13.5, us: 1.0, jp: 19.5, lastMinMm: 210, lastMaxMm: 216 },
  { mm: 200, eu: 32.5, uk: 1.0, us: 1.5, jp: 20.0, lastMinMm: 217, lastMaxMm: 223 },
  { mm: 205, eu: 33.0, uk: 1.5, us: 2.0, jp: 20.5, lastMinMm: 220, lastMaxMm: 226 },
  { mm: 210, eu: 34.0, uk: 2.0, us: 2.5, jp: 21.0, lastMinMm: 227, lastMaxMm: 233 },
  { mm: 215, eu: 35.0, uk: 3.0, us: 3.5, jp: 21.5, lastMinMm: 233, lastMaxMm: 239 },
  { mm: 220, eu: 35.5, uk: 3.5, us: 4.0, jp: 22.0, lastMinMm: 237, lastMaxMm: 243 },
  { mm: 225, eu: 36.5, uk: 4.0, us: 4.5, jp: 22.5, lastMinMm: 243, lastMaxMm: 249 },
  { mm: 230, eu: 37.0, uk: 4.5, us: 5.0, jp: 23.0, lastMinMm: 247, lastMaxMm: 253 },
  { mm: 235, eu: 38.0, uk: 5.0, us: 5.5, jp: 23.5, lastMinMm: 253, lastMaxMm: 259 },
]

export function toMondopoint(mm: number): number {
  return Math.round(mm / 5) * 5
}

function findClosest<T extends { mm: number }>(table: ReadonlyArray<T>, mm: number): T {
  let best = table[0]
  let bestDiff = Math.abs(mm - best.mm)
  for (let i = 1; i < table.length; i++) {
    const diff = Math.abs(mm - table[i].mm)
    if (diff <= bestDiff) {
      best = table[i]
      bestDiff = diff
    }
  }
  return best
}

export function convertShoeSize(footMm: number, gender: Gender): SizeResult {
  const mm = Math.max(115, Math.min(330, footMm))
  const mondopoint = toMondopoint(mm)
  const cm = Math.round(mm) / 10

  if (gender === 'kids') {
    const row = findClosest(KIDS_TABLE, mondopoint)
    const cn = Math.round((row.jp * 2 - 10) * 2) / 2
    const br = Math.max(17, Math.round((row.eu - 2) * 2) / 2)
    return {
      mondopoint: row.mm,
      eu: row.eu,
      uk: row.uk,
      us: row.us,
      ukr: Math.round(row.mm) / 10,
      jp: row.jp,
      cn,
      kr: row.mm,
      br,
      cm,
      mm,
      isoLastMinMm: row.lastMinMm,
      isoLastMaxMm: row.lastMaxMm,
    }
  }

  const row = findClosest(ADULT_TABLE, mondopoint)
  const us = gender === 'men' ? row.usMen : row.usWomen
  const cn = Math.round((row.jp * 2 - 10) * 2) / 2
  const br = Math.round((row.eu - 2) * 2) / 2

  return {
    mondopoint: row.mm,
    eu: row.eu,
    uk: row.uk,
    us,
    ukr: Math.round(row.mm) / 10,
    jp: row.jp,
    cn,
    kr: row.mm,
    br,
    cm,
    mm,
    isoLastMinMm: row.lastMinMm,
    isoLastMaxMm: row.lastMaxMm,
  }
}

/**
 * Припуски стельки и следа колодки по типу обуви (мм).
 * ВАЖНО: В стандартный размер обуви (например EU 42.5 для стопы 270 мм)
 * УЖЕ заложен базовый припуск стельки +12 мм (стелька ~282 мм).
 * Только когда требуемый запас превышает базовый (Зима/Мех +15 мм, Бег +13 мм + широкая стопа),
 * рекомендуемый размер к покупке сдвигается на +0.5 размера (например с 42.5 до 43), а НЕ на 2 размера!
 */
export const STYLE_ALLOWANCES: Record<
  ShoeStyle,
  { insoleAddMm: number; lastTraceAddMm: number }
> = {
  sneakers: { insoleAddMm: 10, lastTraceAddMm: 12 },
  classic: { insoleAddMm: 12, lastTraceAddMm: 16 },
  winter: { insoleAddMm: 15, lastTraceAddMm: 18 },
  running: { insoleAddMm: 13, lastTraceAddMm: 15 },
  sandals: { insoleAddMm: 6, lastTraceAddMm: 8 },
}

export function getWidthMarks(widthFit: WidthFit, gender: Gender): WidthMarks {
  const map: Record<WidthFit, WidthMarks> = {
    narrow: {
      eu: 'E / F',
      us: gender === 'women' ? '2A (AA)' : gender === 'kids' ? 'N (B)' : 'B (Narrow)',
      uk: 'D / E',
      jp: gender === 'women' ? 'C / D' : 'D',
      gost: 5,
      cn: '1.5',
    },
    standard: {
      eu: 'G',
      us: gender === 'women' ? 'B (Medium)' : gender === 'kids' ? 'M (D)' : 'D (Medium)',
      uk: 'F',
      jp: gender === 'women' ? 'E' : 'E / 2E',
      gost: 6,
      cn: '2.0',
    },
    wide: {
      eu: 'H',
      us: gender === 'women' ? 'D (Wide)' : gender === 'kids' ? 'W (2E)' : 'E / 2E',
      uk: 'G',
      jp: gender === 'women' ? '2E / 3E' : '3E',
      gost: 8,
      cn: '2.5',
    },
    extraWide: {
      eu: 'K',
      us: gender === 'women' ? '2E (X-Wide)' : gender === 'kids' ? 'XW (4E)' : '3E / 4E',
      uk: 'H',
      jp: gender === 'women' ? '4E' : '4E / F',
      gost: 9,
      cn: '3.0',
    },
  }
  return map[widthFit]
}

export function computeStandardBallMetrics(
  footMm: number,
  gender: Gender,
  widthFit: WidthFit
): { ballGirthMm: number; ballWidthMm: number } {
  const gradeStep =
    widthFit === 'narrow'
      ? -1
      : widthFit === 'standard'
        ? 0
        : widthFit === 'wide'
          ? 1
          : 2

  if (gender === 'men') {
    const baseGirthAt265 = 254
    const baseWidthAt265 = 103
    const deltaLength = footMm - 265
    const ballGirthMm = Math.round(baseGirthAt265 + deltaLength * 0.6 + gradeStep * 6)
    const ballWidthMm = Math.round(baseWidthAt265 + deltaLength * 0.24 + gradeStep * 2.2)
    return { ballGirthMm, ballWidthMm }
  }

  if (gender === 'women') {
    const baseGirthAt240 = 234
    const baseWidthAt240 = 96
    const deltaLength = footMm - 240
    const ballGirthMm = Math.round(baseGirthAt240 + deltaLength * 0.6 + gradeStep * 6)
    const ballWidthMm = Math.round(baseWidthAt240 + deltaLength * 0.24 + gradeStep * 2.0)
    return { ballGirthMm, ballWidthMm }
  }

  const baseGirthAt170 = 168
  const baseWidthAt170 = 68
  const deltaLength = footMm - 170
  const ballGirthMm = Math.round(baseGirthAt170 + deltaLength * 0.8 + gradeStep * 6)
  const ballWidthMm = Math.round(baseWidthAt170 + deltaLength * 0.32 + gradeStep * 2.0)
  return { ballGirthMm, ballWidthMm }
}

/**
 * Полный расчёт посадки, стельки и рекомендуемого размера с учётом сезона (Зима/Мех, Бег) и полноты
 */
export function calculateProFit(
  footMm: number,
  gender: Gender,
  style: ShoeStyle,
  widthFit: WidthFit
): ProFitResult {
  const baseSize = convertShoeSize(footMm, gender)
  const allowance = STYLE_ALLOWANCES[style]

  const widthLengthCompMm =
    widthFit === 'wide'
      ? 1
      : widthFit === 'extraWide'
        ? 3
        : 0

  const totalAllowanceMm = allowance.insoleAddMm + widthLengthCompMm
  const insoleMm = Math.round(footMm + totalAllowanceMm)
  const insoleCm = Math.round(insoleMm) / 10
  const lastTraceMm = Math.round(footMm + allowance.lastTraceAddMm + widthLengthCompMm)

  // Базовый стандарт ISO 19407 уже включает ~11–12 мм припуска внутри обычного размера.
  // Если выбран зимний мех (+15 мм) или широкая/экстра-широкая стопа, сдвигаем рекомендуемый размер максимум на +0.5 (или +1.0 для зимы + экстра-полноты).
  let styleSizeShiftEu = 0
  if (style === 'winter') {
    styleSizeShiftEu += 0.5
  } else if (style === 'running' && (widthFit === 'wide' || widthFit === 'extraWide')) {
    styleSizeShiftEu += 0.5
  }
  if (widthFit === 'extraWide') {
    styleSizeShiftEu += 0.5
  } else if (widthFit === 'wide' && style === 'classic') {
    styleSizeShiftEu += 0.5
  }

  // Эффективная длина стопы для подбора маркировки с учётом меха/полноты (шаг +3.5 мм = +0.5 размера)
  const effectiveFootMm = footMm + (styleSizeShiftEu > 0 ? styleSizeShiftEu * 6.67 : 0)
  const recommendedSize =
    styleSizeShiftEu > 0 ? convertShoeSize(effectiveFootMm, gender) : baseSize

  const { ballGirthMm, ballWidthMm } = computeStandardBallMetrics(footMm, gender, widthFit)
  const widthMarks = getWidthMarks(widthFit, gender)

  const wShift = widthFit === 'wide' || widthFit === 'extraWide' ? 0.5 : 0

  const brandMatrix: BrandFitEntry[] = [
    {
      brand: 'Nike / Jordan',
      category: 'Athletic',
      eu: formatSize(baseSize.eu + 0.5 + wShift),
      us: formatSize(baseSize.us + 0.5 + wShift),
      uk: formatSize(baseSize.uk + 0.5),
      jp: formatSize(baseSize.jp + 0.5),
      offsetNote: {
        ru: 'Плотнее в пучках — рекомендуется +0.5 размера',
        uk: 'Щільніше в пучках — рекомендовано +0.5 розміру',
        de: 'Schmaler im Vorfuß — +0,5 Größe empfohlen',
        en: 'Snug forefoot — +0.5 size up recommended',
      },
    },
    {
      brand: 'New Balance',
      category: 'Brannock',
      eu: formatSize(baseSize.eu + wShift),
      us: `${formatSize(baseSize.us)} (${widthFit === 'wide' ? '2E' : widthFit === 'extraWide' ? '4E' : 'D'})`,
      uk: formatSize(baseSize.uk),
      jp: formatSize(baseSize.jp),
      offsetNote: {
        ru: 'Эталон US Brannock · доступны полноты D, 2E и 4E',
        uk: 'Еталон US Brannock · доступні повноти D, 2E та 4E',
        de: 'US-Brannock-Referenz · Weiten D, 2E und 4E verfügbar',
        en: 'True to US Brannock · D, 2E and 4E widths available',
      },
    },
    {
      brand: 'Adidas Originals',
      category: 'Sneakers',
      eu: `${formatSize(baseSize.eu)}⅔`,
      us: formatSize(baseSize.us + wShift),
      uk: formatSize(baseSize.uk + wShift),
      jp: formatSize(baseSize.jp),
      offsetNote: {
        ru: 'Французский шаг 2/3 штиха · стандартная посадка',
        uk: 'Французький крок 2/3 штиха · стандартна посадка',
        de: 'Pariser Stich (1/3-Raster) · reguläre Passform',
        en: '1/3-step Paris Point grid · regular fit',
      },
    },
    {
      brand: 'ASICS / Mizuno',
      category: 'JIS S 5037',
      eu: formatSize(baseSize.eu + 0.5),
      us: formatSize(baseSize.us + 0.5),
      uk: formatSize(baseSize.uk + 0.5),
      jp: `${baseSize.jp.toFixed(1)}`,
      offsetNote: {
        ru: 'Японский стандарт JIS S 5037 строго по длине стопы в см',
        uk: 'Японський стандарт JIS S 5037 суворо за довжиною стопи в см',
        de: 'Japanische Norm JIS S 5037 exakt nach Fußlänge in cm',
        en: 'Japanese JIS S 5037 exact centimeter foot-length marking',
      },
    },
    {
      brand: 'Goodyear / Dress (ISO)',
      category: 'Classic',
      eu: formatSize(Math.round(baseSize.eu)),
      us: formatSize(baseSize.us),
      uk: formatSize(baseSize.uk),
      jp: formatSize(baseSize.jp),
      offsetNote: {
        ru: 'Классическая кожаная колодка по ISO 19407 (припуск +12 мм уже внутри)',
        uk: 'Класична шкіряна колодка за ISO 19407 (припуск +12 мм уже всередині)',
        de: 'Klassischer Rahmenleisten nach ISO 19407 (+12 mm Zugabe integriert)',
        en: 'Classic dress last per ISO 19407 (+12 mm allowance built-in)',
      },
    },
  ]

  return {
    footMm: Math.round(footMm),
    footCm: Math.round(footMm) / 10,
    insoleMm,
    insoleCm,
    lastTraceMm,
    isoLastRangeMm: [baseSize.isoLastMinMm, baseSize.isoLastMaxMm],
    allowanceMm: totalAllowanceMm,
    styleSizeShiftEu,
    recommendedSize,
    ballWidthMm,
    ballGirthMm,
    widthMarks,
    brandMatrix,
  }
}

export function formatSize(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(1).replace(/\.0$/, '')
}

export const RANGES = {
  men: { min: 220, max: 320, default: 265 },
  women: { min: 210, max: 280, default: 240 },
  kids: { min: 120, max: 230, default: 170 },
} as const
