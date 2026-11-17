```typescript
/**
 * Accurate shoe size conversion & anatomical fit engine
 * based on ISO 19407:2023 / ISO/TS 19407, Mondopoint (ISO 9407),
 * JIS S 5037 (Japan), GB/T 3293.1 (China), KS K 3405 (Korea), and GOST/DSTU.
 */

export type Gender = 'men' | 'women' | 'kids'
export type ShoeStyle = 'sneakers' | 'classic' | 'winter' | 'running' | 'sandals'
export type WidthFit = 'narrow' | 'standard' | 'wide' | 'extraWide'

export type SizeResult = {
  mondopoint: number // mm, rounded to nearest 5 (ISO 9407)
  eu: number // Continental Paris Point (6.67 mm)
  uk: number // UK Barleycorn (8.46 mm)
  us: number // US Brannock (Men / Women / Kids)
  ukr: number // Metric cm mark
  jp: number // Japanese JIS S 5037 (cm in 0.5 steps)
  cn: number // Chinese GB/T 3293.1 French-code equivalent (cm * 2 - 10)
  kr: number // Korean KS K 3405 (mm Mondopoint)
  br: number // Brazilian point (EU - 2)
  cm: number // exact foot length in cm (1 decimal)
  mm: number // exact input mm
}

export type WidthMarks = {
  eu: 'E' | 'F' | 'G' | 'H' | 'K'
  us: string
  uk: string
  jp: string
  gost: number
  cn: string
}

export type BrandFitEntry = {
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

export type ProFitResult = {
  insoleMm: number
  insoleCm: number
  lastTraceMm: number
  allowanceMm: number
  ballWidthMm: number
  ballGirthMm: number
  instepGirthMm: number
  widthMarks: WidthMarks
  brandMatrix: BrandFitEntry[]
}

/** Adult recommended marking (ISO 19407 Table 2 + JP/CN/KR/BR) */
const ADULT_TABLE: Array<{
  mm: number
  eu: number
  uk: number
  usMen: number
  usWomen: number
  jp: number
}> = [
  { mm: 210, eu: 33.5, uk: 1.5, usMen: 2.5, usWomen: 3.5, jp: 21.0 },
  { mm: 215, eu: 34, uk: 2.5, usMen: 3.5, usWomen: 4.5, jp: 21.5 },
  { mm: 220, eu: 35, uk: 3, usMen: 4, usWomen: 5, jp: 22.0 },
  { mm: 225, eu: 35.5, uk: 3.5, usMen: 4.5, usWomen: 5.5, jp: 22.5 },
  { mm: 230, eu: 36.5, uk: 4, usMen: 5, usWomen: 6, jp: 23.0 },
  { mm: 235, eu: 37, uk: 4.5, usMen: 5.5, usWomen: 6.5, jp: 23.5 },
  { mm: 240, eu: 38, uk: 5.5, usMen: 6.5, usWomen: 7.5, jp: 24.0 },
  { mm: 245, eu: 38.5, uk: 6, usMen: 7, usWomen: 8, jp: 24.5 },
  { mm: 250, eu: 39.5, uk: 6.5, usMen: 7.5, usWomen: 8.5, jp: 25.0 },
  { mm: 255, eu: 40, uk: 7, usMen: 8, usWomen: 9, jp: 25.5 },
  { mm: 260, eu: 41, uk: 7.5, usMen: 8.5, usWomen: 9.5, jp: 26.0 },
  { mm: 265, eu: 41.5, uk: 8.5, usMen: 9.5, usWomen: 10.5, jp: 26.5 },
  { mm: 270, eu: 42.5, uk: 9, usMen: 10, usWomen: 11, jp: 27.0 },
  { mm: 275, eu: 43, uk: 9.5, usMen: 10.5, usWomen: 11.5, jp: 27.5 },
  { mm: 280, eu: 44, uk: 10, usMen: 11, usWomen: 12, jp: 28.0 },
  { mm: 285, eu: 44.5, uk: 10.5, usMen: 11.5, usWomen: 12.5, jp: 28.5 },
  { mm: 290, eu: 45.5, uk: 11, usMen: 12, usWomen: 13, jp: 29.0 },
  { mm: 295, eu: 46, uk: 12, usMen: 13, usWomen: 14, jp: 29.5 },
  { mm: 300, eu: 47, uk: 12.5, usMen: 13.5, usWomen: 14.5, jp: 30.0 },
  { mm: 305, eu: 47.5, uk: 13, usMen: 14, usWomen: 15, jp: 30.5 },
  { mm: 310, eu: 48.5, uk: 13.5, usMen: 14.5, usWomen: 15.5, jp: 31.0 },
  { mm: 315, eu: 49, uk: 14, usMen: 15, usWomen: 16, jp: 31.5 },
  { mm: 320, eu: 50, uk: 15, usMen: 16, usWomen: 17, jp: 32.0 },
]

/** Kids table (ISO recommended, simplified) */
const KIDS_TABLE: Array<{
  mm: number
  eu: number
  uk: number
  us: number
  jp: number
}> = [
  { mm: 120, eu: 19.5, uk: 3.5, us: 4, jp: 12.0 },
  { mm: 125, eu: 20, uk: 4, us: 4.5, jp: 12.5 },
  { mm: 130, eu: 21, uk: 5, us: 5.5, jp: 13.0 },
  { mm: 135, eu: 22, uk: 5.5, us: 6, jp: 13.5 },
  { mm: 140, eu: 22.5, uk: 6, us: 6.5, jp: 14.0 },
  { mm: 145, eu: 23.5, uk: 7, us: 7.5, jp: 14.5 },
  { mm: 150, eu: 24.5, uk: 7.5, us: 8, jp: 15.0 },
  { mm: 155, eu: 25, uk: 8, us: 8.5, jp: 15.5 },
  { mm: 160, eu: 26, uk: 9, us: 9.5, jp: 16.0 },
  { mm: 165, eu: 27, uk: 9.5, us: 10, jp: 16.5 },
  { mm: 170, eu: 27.5, uk: 10, us: 10.5, jp: 17.0 },
  { mm: 175, eu: 28.5, uk: 11, us: 11.5, jp: 17.5 },
  { mm: 180, eu: 29, uk: 11.5, us: 12, jp: 18.0 },
  { mm: 185, eu: 30, uk: 12, us: 12.5, jp: 18.5 },
  { mm: 190, eu: 31, uk: 13, us: 13.5, jp: 19.0 },
  { mm: 195, eu: 31.5, uk: 13.5, us: 1, jp: 19.5 },
  { mm: 200, eu: 32.5, uk: 1, us: 1.5, jp: 20.0 },
  { mm: 205, eu: 33, uk: 1.5, us: 2, jp: 20.5 },
  { mm: 210, eu: 34, uk: 2, us: 2.5, jp: 21.0 },
  { mm: 215, eu: 34.5, uk: 2.5, us: 3, jp: 21.5 },
  { mm: 220, eu: 35.5, uk: 3.5, us: 4, jp: 22.0 },
  { mm: 225, eu: 36, uk: 4, us: 4.5, jp: 22.5 },
]

/** Round foot length to nearest Mondopoint step (5 mm) */
export function toMondopoint(mm: number): number {
  return Math.round(mm / 5) * 5
}

/** Find closest entry in a table by mm */
function findClosest<T extends { mm: number }>(table: T[], mm: number): T {
  let best = table[0]
  let bestDiff = Math.abs(mm - best.mm)
  for (let i = 1; i < table.length; i++) {
    const diff = Math.abs(mm - table[i].mm)
    if (diff < bestDiff) {
      best = table[i]
      bestDiff = diff
    }
  }
  return best
}

/**
 * Main conversion function across 8 global sizing standards.
 * @param footMm exact foot length in millimetres
 * @param gender men | women | kids
 */
export function convertShoeSize(footMm: number, gender: Gender): SizeResult {
  const mm = Math.max(100, Math.min(340, footMm))
  const mondopoint = toMondopoint(mm)
  const cm = Math.round((mm / 10) * 10) / 10 // 1 decimal

  if (gender === 'kids') {
    const row = findClosest(KIDS_TABLE, mondopoint)
    const cn = Math.round((row.jp * 2 - 10) * 2) / 2
    const br = Math.max(17, Math.round((row.eu - 2) * 2) / 2)
    return {
      mondopoint: row.mm,
      eu: row.eu,
      uk: row.uk,
      us: row.us,
      ukr: Math.round((row.mm / 10) * 10) / 10,
      jp: row.jp,
      cn,
      kr: row.mm,
      br,
      cm,
      mm,
    }
  }

  const row = findClosest(ADULT_TABLE, mondopoint)
  const us = gender === 'men' ? row.usMen : row.usWomen
  // Chinese standard GB/T 3293.1 traditional retail code: cm * 2 - 10
  const cn = Math.round((row.jp * 2 - 10) * 2) / 2
  // Brazilian footwear sizing (ABNT NBR 13310): Continental EU minus 2 points
  const br = Math.round((row.eu - 2) * 2) / 2

  return {
    mondopoint: row.mm,
    eu: row.eu,
    uk: row.uk,
    us,
    ukr: Math.round((row.mm / 10) * 10) / 10,
    jp: row.jp,
    cn,
    kr: row.mm,
    br,
    cm,
    mm,
  }
}

/** Functional toe & last allowances by footwear construction type (mm) */
export const STYLE_ALLOWANCES: Record<
  ShoeStyle,
  { insoleAddMm: number; lastTraceAddMm: number }
> = {
  sneakers: { insoleAddMm: 10, lastTraceAddMm: 12 },
  classic: { insoleAddMm: 12, lastTraceAddMm: 16 },
  winter: { insoleAddMm: 15, lastTraceAddMm: 18 },
  running: { insoleAddMm: 13, lastTraceAddMm: 15 },
  sandals: { insoleAddMm: 6, lastTraceAddMm: 7 },
}

/**
 * PRO Anatomical Last, Width & Brand Fit Calculator
 */
export function calculateProFit(
  footMm: number,
  gender: Gender,
  style: ShoeStyle,
  widthFit: WidthFit
): ProFitResult {
  const baseSize = convertShoeSize(footMm, gender)
  const allowance = STYLE_ALLOWANCES[style]

  const widthDeltaMm =
    widthFit === 'narrow'
      ? -4
      : widthFit === 'standard'
        ? 0
        : widthFit === 'wide'
          ? 5
          : 9

  const girthDeltaMm =
    widthFit === 'narrow'
      ? -8
      : widthFit === 'standard'
        ? 0
        : widthFit === 'wide'
          ? 10
          : 18

  // Extra 2 mm length buffer if wide/extraWide foot is placed in narrow-toe classic or running shoes
  const widthLengthCompMm =
    (widthFit === 'wide' || widthFit === 'extraWide') &&
    (style === 'classic' || style === 'running')
      ? 3
      : 0

  const totalAllowanceMm = allowance.insoleAddMm + widthLengthCompMm
  const insoleMm = Math.round(footMm + totalAllowanceMm)
  const insoleCm = Math.round((insoleMm / 10) * 10) / 10
  const lastTraceMm = Math.round(footMm + allowance.lastTraceAddMm + widthLengthCompMm)

  // Anatomical anthropometry formulas (GOST 3927 / ISO/TS 19408 averages)
  const genderWidthFactor = gender === 'men' ? 0.375 : gender === 'women' ? 0.365 : 0.38
  const genderGirthFactor = gender === 'men' ? 0.945 : gender === 'women' ? 0.925 : 0.95

  const ballWidthMm = Math.round(footMm * genderWidthFactor + widthDeltaMm)
  const ballGirthMm = Math.round(footMm * genderGirthFactor + girthDeltaMm)
  const instepGirthMm = Math.round(ballGirthMm * 1.03)

  const widthMap: Record<WidthFit, WidthMarks> = {
    narrow: {
      eu: 'E',
      us: gender === 'women' ? 'AA (2A)' : 'B (Narrow)',
      uk: 'C / D',
      jp: 'D / E',
      gost: 4,
      cn: '1.5',
    },
    standard: {
      eu: 'F',
      us: gender === 'women' ? 'B (Medium)' : 'D (Medium)',
      uk: 'E / F',
      jp: 'E / 2E',
      gost: 6,
      cn: '2.0',
    },
    wide: {
      eu: 'G',
      us: gender === 'women' ? 'D (Wide)' : '2E (Wide)',
      uk: 'G',
      jp: '3E',
      gost: 8,
      cn: '2.5',
    },
    extraWide: {
      eu: 'H',
      us: gender === 'women' ? '2E (X-Wide)' : '4E (X-Wide)',
      uk: 'H',
      jp: '4E / F',
      gost: 10,
      cn: '3.0',
    },
  }

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
        de: 'Schmaler im Vorfuß — +0.5 Größe empfohlen',
        en: 'Snug forefoot — +0.5 size up recommended',
      },
    },
    {
      brand: 'New Balance',
      category: 'Lifestyle / Run',
      eu: formatSize(baseSize.eu + wShift),
      us: `${formatSize(baseSize.us)} (${widthFit === 'wide' || widthFit === 'extraWide' ? '2E' : 'D'})`,
      uk: formatSize(baseSize.uk),
      jp: formatSize(baseSize.jp),
      offsetNote: {
        ru: 'Эталонная колодка US Brannock, доступны полноты D/2E',
        uk: 'Еталонна колодка US Brannock, доступні повноти D/2E',
        de: 'Referenz-Passform nach US Brannock (Weiten D/2E)',
        en: 'True to US Brannock standard with D/2E widths',
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
        ru: 'Дробная сетка 1/3 · стандартная посадка по стопе',
        uk: 'Дробова сітка 1/3 · стандартна посадка по стопі',
        de: '1/3-Größenraster · reguläre Passform',
        en: '1/3-step French sizing · true to foot length',
      },
    },
    {
      brand: 'ASICS / Mizuno',
      category: 'Japan CM',
      eu: formatSize(baseSize.eu + 0.5),
      us: formatSize(baseSize.us + 0.5),
      uk: formatSize(baseSize.uk + 0.5),
      jp: `${baseSize.jp.toFixed(1)} cm`,
      offsetNote: {
        ru: 'Маркировка строго по длине стопы в см (JIS S 5037)',
        uk: 'Маркування суворо за довжиною стопи в см (JIS S 5037)',
        de: 'Exakte Zentimeter-Markierung nach JIS S 5037',
        en: 'Exact centimeter foot-length marking (JIS S 5037)',
      },
    },
    {
      brand: 'Cardio / Dress Last',
      category: 'Classic / Leather',
      eu: formatSize(Math.round(baseSize.eu)),
      us: formatSize(baseSize.us),
      uk: formatSize(baseSize.uk),
      jp: formatSize(baseSize.jp),
      offsetNote: {
        ru: 'Полноразмерная кожаная колодка с припуском +12 мм',
        uk: 'Повнорозмірна шкіряна колодка з припуском +12 мм',
        de: 'Vollwertiger Lederleisten mit +12 mm Zugabe',
        en: 'Full-grain leather last with +12 mm allowance',
      },
    },
  ]

  return {
    insoleMm,
    insoleCm,
    lastTraceMm,
    allowanceMm: totalAllowanceMm,
    ballWidthMm,
    ballGirthMm,
    instepGirthMm,
    widthMarks: widthMap[widthFit],
    brandMatrix,
  }
}

/** Format size for display (remove .0) */
export function formatSize(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(1).replace(/\.0$/, '')
}

/** Recommended slider ranges */
export const RANGES = {
  men: { min: 220, max: 320, default: 265 },
  women: { min: 210, max: 280, default: 240 },
  kids: { min: 120, max: 230, default: 170 },
} as const
