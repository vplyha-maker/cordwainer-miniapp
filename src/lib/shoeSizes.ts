/**
 * src/lib/shoeSizes.ts
 * Практическое ядро конвертации размеров и полноты обуви:
 * - Реальная коммерческая сетка (UA / EU / US / UK / JP-CM / BR / CN)
 * - Таблицы полноты и обхвата пучков (JIS S 5037 / EU E–K / US Brannock)
 */

export type Gender = 'men' | 'women' | 'kids'
export type ShoeStyle = 'sneakers' | 'classic' | 'winter' | 'running' | 'sandals'
export type WidthFit = 'narrow' | 'standard' | 'wide' | 'extraWide'
export type MeasureMode = 'foot' | 'insole'

export interface AdultSizeRow {
  mm: number
  ua: number
  eu: number
  uk: number
  usMen: number
  usWomen: number
  jp: number
  br: number
  cn: number
}

export interface KidsSizeRow {
  mm: number
  ua: number
  eu: number
  uk: number
  us: number
  jp: number
  br: number
  cn: number
}

export interface SizeResult {
  mondopoint: number
  ua: number
  eu: number
  uk: number
  us: number
  jp: number
  cn: number
  br: number
  cm: number
  mm: number
}

export interface WidthMarks {
  eu: 'E / F' | 'G' | 'H' | 'K'
  us: string
  uk: string
  jp: string
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
  allowanceMm: number
  hasReserveShift: boolean
  baseSize: SizeResult
  recommendedSize: SizeResult
  ballWidthMm: number
  ballGirthMm: number
  widthMarks: WidthMarks
  brandMatrix: BrandFitEntry[]
}

/**
 * Практическая таблица размеров для взрослых (210–320 мм).
 * На 270 мм (27.0 см): UA 42 | EU 42.5 | US M 9 | UK 8.5 | JP 27.0 | BR 40 | CN 44
 * С запасом на 275 мм (27.5 см — зима, бег): UA 42.5 | EU 43 | US M 9.5 | UK 9 | JP 27.5 | BR 41 | CN 45
 */
export const ADULT_TABLE: ReadonlyArray<AdultSizeRow> = [
  { mm: 210, ua: 33.0, eu: 34.0, uk: 2.0, usMen: 3.0, usWomen: 4.0, jp: 21.0, br: 32.0, cn: 32 },
  { mm: 215, ua: 34.0, eu: 34.5, uk: 2.5, usMen: 3.5, usWomen: 4.5, jp: 21.5, br: 32.5, cn: 33 },
  { mm: 220, ua: 34.5, eu: 35.0, uk: 3.0, usMen: 4.0, usWomen: 5.0, jp: 22.0, br: 33.0, cn: 34 },
  { mm: 225, ua: 35.0, eu: 36.0, uk: 3.5, usMen: 4.5, usWomen: 5.5, jp: 22.5, br: 34.0, cn: 35 },
  { mm: 230, ua: 36.0, eu: 36.5, uk: 4.0, usMen: 5.0, usWomen: 6.0, jp: 23.0, br: 34.5, cn: 36 },
  { mm: 235, ua: 36.5, eu: 37.5, uk: 4.5, usMen: 5.5, usWomen: 6.5, jp: 23.5, br: 35.5, cn: 37 },
  { mm: 240, ua: 37.5, eu: 38.0, uk: 5.5, usMen: 6.0, usWomen: 7.0, jp: 24.0, br: 36.0, cn: 38 },
  { mm: 245, ua: 38.0, eu: 38.5, uk: 6.0, usMen: 6.5, usWomen: 7.5, jp: 24.5, br: 36.5, cn: 39 },
  { mm: 250, ua: 39.0, eu: 39.5, uk: 6.5, usMen: 7.0, usWomen: 8.0, jp: 25.0, br: 37.5, cn: 40 },
  { mm: 255, ua: 40.0, eu: 40.5, uk: 7.0, usMen: 7.5, usWomen: 8.5, jp: 25.5, br: 38.5, cn: 41 },
  { mm: 260, ua: 40.5, eu: 41.0, uk: 7.5, usMen: 8.0, usWomen: 9.0, jp: 26.0, br: 39.0, cn: 42 },
  { mm: 265, ua: 41.0, eu: 42.0, uk: 8.0, usMen: 8.5, usWomen: 9.5, jp: 26.5, br: 39.5, cn: 43 },
  { mm: 270, ua: 42.0, eu: 42.5, uk: 8.5, usMen: 9.0, usWomen: 10.0, jp: 27.0, br: 40.0, cn: 44 },
  { mm: 275, ua: 42.5, eu: 43.0, uk: 9.0, usMen: 9.5, usWomen: 10.5, jp: 27.5, br: 41.0, cn: 45 },
  { mm: 280, ua: 43.5, eu: 44.0, uk: 9.5, usMen: 10.0, usWomen: 11.0, jp: 28.0, br: 42.0, cn: 46 },
  { mm: 285, ua: 44.0, eu: 44.5, uk: 10.0, usMen: 10.5, usWomen: 11.5, jp: 28.5, br: 42.5, cn: 47 },
  { mm: 290, ua: 45.0, eu: 45.5, uk: 10.5, usMen: 11.0, usWomen: 12.0, jp: 29.0, br: 43.5, cn: 48 },
  { mm: 295, ua: 45.5, eu: 46.0, uk: 11.0, usMen: 11.5, usWomen: 12.5, jp: 29.5, br: 44.0, cn: 49 },
  { mm: 300, ua: 46.0, eu: 47.0, uk: 11.5, usMen: 12.0, usWomen: 13.0, jp: 30.0, br: 45.0, cn: 50 },
  { mm: 305, ua: 47.0, eu: 47.5, uk: 12.0, usMen: 12.5, usWomen: 13.5, jp: 30.5, br: 45.5, cn: 51 },
  { mm: 310, ua: 47.5, eu: 48.5, uk: 13.0, usMen: 13.5, usWomen: 14.5, jp: 31.0, br: 46.5, cn: 52 },
  { mm: 315, ua: 48.0, eu: 49.0, uk: 13.5, usMen: 14.0, usWomen: 15.0, jp: 31.5, br: 47.0, cn: 53 },
  { mm: 320, ua: 49.0, eu: 50.0, uk: 14.0, usMen: 15.0, usWomen: 16.0, jp: 32.0, br: 48.0, cn: 54 },
]

/**
 * Детская размерная сетка (120–235 мм)
 */
export const KIDS_TABLE: ReadonlyArray<KidsSizeRow> = [
  { mm: 120, ua: 19.0, eu: 19.5, uk: 3.5, us: 4.0, jp: 12.0, br: 17.5, cn: 14 },
  { mm: 125, ua: 19.5, eu: 20.0, uk: 4.0, us: 4.5, jp: 12.5, br: 18.0, cn: 15 },
  { mm: 130, ua: 20.5, eu: 21.0, uk: 5.0, us: 5.5, jp: 13.0, br: 19.0, cn: 16 },
  { mm: 135, ua: 21.5, eu: 22.0, uk: 5.5, us: 6.0, jp: 13.5, br: 20.0, cn: 17 },
  { mm: 140, ua: 22.0, eu: 22.5, uk: 6.0, us: 6.5, jp: 14.0, br: 20.5, cn: 18 },
  { mm: 145, ua: 23.0, eu: 23.5, uk: 7.0, us: 7.5, jp: 14.5, br: 21.5, cn: 19 },
  { mm: 150, ua: 24.0, eu: 24.5, uk: 7.5, us: 8.0, jp: 15.0, br: 22.5, cn: 20 },
  { mm: 155, ua: 24.5, eu: 25.0, uk: 8.0, us: 8.5, jp: 15.5, br: 23.0, cn: 21 },
  { mm: 160, ua: 25.5, eu: 26.0, uk: 9.0, us: 9.5, jp: 16.0, br: 24.0, cn: 22 },
  { mm: 165, ua: 26.5, eu: 27.0, uk: 9.5, us: 10.0, jp: 16.5, br: 25.0, cn: 23 },
  { mm: 170, ua: 27.0, eu: 27.5, uk: 10.0, us: 10.5, jp: 17.0, br: 25.5, cn: 24 },
  { mm: 175, ua: 28.0, eu: 28.5, uk: 11.0, us: 11.5, jp: 17.5, br: 26.5, cn: 25 },
  { mm: 180, ua: 28.5, eu: 29.0, uk: 11.5, us: 12.0, jp: 18.0, br: 27.0, cn: 26 },
  { mm: 185, ua: 29.5, eu: 30.0, uk: 12.0, us: 12.5, jp: 18.5, br: 28.0, cn: 27 },
  { mm: 190, ua: 30.5, eu: 31.0, uk: 13.0, us: 13.5, jp: 19.0, br: 29.0, cn: 28 },
  { mm: 195, ua: 31.0, eu: 31.5, uk: 13.5, us: 1.0, jp: 19.5, br: 29.5, cn: 29 },
  { mm: 200, ua: 32.0, eu: 32.5, uk: 1.0, us: 1.5, jp: 20.0, br: 30.5, cn: 30 },
  { mm: 205, ua: 32.5, eu: 33.0, uk: 1.5, us: 2.0, jp: 20.5, br: 31.0, cn: 31 },
  { mm: 210, ua: 33.5, eu: 34.0, uk: 2.0, us: 2.5, jp: 21.0, br: 32.0, cn: 32 },
  { mm: 215, ua: 34.5, eu: 35.0, uk: 3.0, us: 3.5, jp: 21.5, br: 33.0, cn: 33 },
  { mm: 220, ua: 35.0, eu: 35.5, uk: 3.5, us: 4.0, jp: 22.0, br: 33.5, cn: 34 },
  { mm: 225, ua: 36.0, eu: 36.5, uk: 4.0, us: 4.5, jp: 22.5, br: 34.5, cn: 35 },
  { mm: 230, ua: 36.5, eu: 37.0, uk: 4.5, us: 5.0, jp: 23.0, br: 35.0, cn: 36 },
  { mm: 235, ua: 37.5, eu: 38.0, uk: 5.0, us: 5.5, jp: 23.5, br: 36.0, cn: 37 },
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
    return {
      mondopoint: row.mm,
      ua: row.ua,
      eu: row.eu,
      uk: row.uk,
      us: row.us,
      jp: row.jp,
      cn: row.cn,
      br: row.br,
      cm,
      mm,
    }
  }

  const row = findClosest(ADULT_TABLE, mondopoint)
  const us = gender === 'men' ? row.usMen : row.usWomen

  return {
    mondopoint: row.mm,
    ua: row.ua,
    eu: row.eu,
    uk: row.uk,
    us,
    jp: row.jp,
    cn: row.cn,
    br: row.br,
    cm,
    mm,
  }
}

export const STYLE_ALLOWANCES: Record<
  ShoeStyle,
  { insoleAddMm: number; reserveStepMm: number }
> = {
  sneakers: { insoleAddMm: 10, reserveStepMm: 0 },
  classic: { insoleAddMm: 10, reserveStepMm: 0 },
  winter: { insoleAddMm: 15, reserveStepMm: 5 }, // +5 мм (шаг на 27.5 см для зимы/меха)
  running: { insoleAddMm: 13, reserveStepMm: 5 }, // +5 мм (шаг на 27.5 см для бега)
  sandals: { insoleAddMm: 6, reserveStepMm: 0 },
}

export function getWidthMarks(widthFit: WidthFit, gender: Gender): WidthMarks {
  const map: Record<WidthFit, WidthMarks> = {
    narrow: {
      eu: 'E / F',
      us: gender === 'women' ? '2A (AA)' : gender === 'kids' ? 'N (B)' : 'B (Narrow)',
      uk: 'D / E',
      jp: gender === 'women' ? 'C / D' : 'D',
    },
    standard: {
      eu: 'G',
      us: gender === 'women' ? 'B (Medium)' : gender === 'kids' ? 'M (D)' : 'D (Medium)',
      uk: 'F',
      jp: gender === 'women' ? 'E' : 'E / 2E',
    },
    wide: {
      eu: 'H',
      us: gender === 'women' ? 'D (Wide)' : gender === 'kids' ? 'W (2E)' : 'E / 2E',
      uk: 'G',
      jp: gender === 'women' ? '2E / 3E' : '3E',
    },
    extraWide: {
      eu: 'K',
      us: gender === 'women' ? '2E (X-Wide)' : gender === 'kids' ? 'XW (4E)' : '3E / 4E',
      uk: 'H',
      jp: gender === 'women' ? '4E' : '4E / F',
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

export function calculateProFit(
  footMm: number,
  gender: Gender,
  style: ShoeStyle,
  widthFit: WidthFit
): ProFitResult {
  const baseSize = convertShoeSize(footMm, gender)
  const allowance = STYLE_ALLOWANCES[style]

  const widthCompMm = widthFit === 'wide' ? 1 : widthFit === 'extraWide' ? 3 : 0
  const totalAllowanceMm = allowance.insoleAddMm + widthCompMm
  const insoleMm = Math.round(footMm + totalAllowanceMm)
  const insoleCm = Math.round(insoleMm) / 10

  // Переход на размер с запасом (+5 мм = шаг сетки, например с 27.0 на 27.5 см для зимы, бега или экстра-полноты)
  const widthReserveMm = widthFit === 'extraWide' ? 5 : 0
  const effectiveReserveMm = Math.min(5, allowance.reserveStepMm + widthReserveMm)
  const hasReserveShift = effectiveReserveMm > 0

  const recommendedSize = hasReserveShift
    ? convertShoeSize(footMm + effectiveReserveMm, gender)
    : baseSize

  const { ballGirthMm, ballWidthMm } = computeStandardBallMetrics(footMm, gender, widthFit)
  const widthMarks = getWidthMarks(widthFit, gender)

  // Примечания и точная посадка по брендам (согласно сводной таблице)
  const brandMatrix: BrandFitEntry[] = [
    {
      brand: 'Nike / Jordan',
      category: 'Sneakers',
      eu: formatSize(recommendedSize.eu),
      us: formatSize(recommendedSize.us),
      uk: formatSize(recommendedSize.uk - 0.5),
      jp: `${recommendedSize.jp.toFixed(1)} (${recommendedSize.mondopoint})`,
      offsetNote: {
        ru: 'У Nike на 27 см: 42.5 EU · 9 US · 8 UK · 27 CM на язычке',
        uk: 'У Nike на 27 см: 42.5 EU · 9 US · 8 UK · 27 CM на язичку',
        de: 'Bei Nike (27 cm): 42.5 EU · 9 US · 8 UK · 27 CM Etikett',
        en: 'Nike (27 cm): 42.5 EU · 9 US · 8 UK · 27 CM on tongue tag',
      },
    },
    {
      brand: 'Adidas Originals',
      category: '1/3 Grid',
      eu: `${Math.floor(recommendedSize.eu)}⅔`,
      us: formatSize(recommendedSize.us),
      uk: formatSize(recommendedSize.uk),
      jp: `${recommendedSize.mondopoint}`,
      offsetNote: {
        ru: 'Дробная сетка: на 27 см идёт 42⅔ EU · 9 US · 8.5 UK · JP 270',
        uk: 'Дробова сітка: на 27 см іде 42⅔ EU · 9 US · 8.5 UK · JP 270',
        de: '1/3-Raster: bei 27 cm gilt 42⅔ EU · 9 US · 8.5 UK · JP 270',
        en: '1/3 grid: 27 cm maps to 42⅔ EU · 9 US · 8.5 UK · JP 270',
      },
    },
    {
      brand: 'New Balance',
      category: 'Brannock',
      eu: formatSize(recommendedSize.eu),
      us: `${formatSize(recommendedSize.us)} (${widthFit === 'wide' ? '2E' : widthFit === 'extraWide' ? '4E' : 'D'})`,
      uk: formatSize(recommendedSize.uk - 0.5),
      jp: `${recommendedSize.jp.toFixed(1)}`,
      offsetNote: {
        ru: 'Стандарт США: 9 US · 8 UK · 27 CM · доступны полноты D, 2E и 4E',
        uk: 'Стандарт США: 9 US · 8 UK · 27 CM · доступні повноти D, 2E та 4E',
        de: 'US-Standard: 9 US · 8 UK · 27 CM · Weiten D, 2E und 4E',
        en: 'US Standard: 9 US · 8 UK · 27 CM · D, 2E, 4E widths available',
      },
    },
    {
      brand: 'ASICS / Mizuno',
      category: 'Japan CM',
      eu: formatSize(recommendedSize.eu),
      us: formatSize(recommendedSize.us),
      uk: formatSize(recommendedSize.uk - 0.5),
      jp: `${recommendedSize.jp.toFixed(1)} (${recommendedSize.mondopoint})`,
      offsetNote: {
        ru: 'Самый точный ориентир по графе CM / JP на язычке обуви',
        uk: 'Найточніший орієнтир за графою CM / JP на язичку взуття',
        de: 'Präziseste Orientierung über die Spalte CM / JP im Schuh',
        en: 'Most accurate fit via CM / JP column on the shoe label',
      },
    },
    {
      brand: 'Goodyear / Classic',
      category: 'Leather',
      eu: formatSize(recommendedSize.ua),
      us: formatSize(recommendedSize.us),
      uk: formatSize(recommendedSize.uk - 0.5),
      jp: `${recommendedSize.jp.toFixed(1)}`,
      offsetNote: {
        ru: 'Классические туфли и ботинки: размер в размер (42 UA / EU на 27 см)',
        uk: 'Класичні туфлі та черевики: розмір у розмір (42 UA / EU на 27 см)',
        de: 'Klassische Lederschuhe: reguläre Passform (42 EU bei 27 cm)',
        en: 'Classic leather dress shoes: true to size (42 EU at 27 cm)',
      },
    },
  ]

  return {
    footMm: Math.round(footMm),
    footCm: Math.round(footMm) / 10,
    insoleMm,
    insoleCm,
    allowanceMm: totalAllowanceMm,
    hasReserveShift,
    baseSize,
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
  men: { min: 220, max: 320, default: 270 },
  women: { min: 210, max: 280, default: 240 },
  kids: { min: 120, max: 230, default: 170 },
} as const
