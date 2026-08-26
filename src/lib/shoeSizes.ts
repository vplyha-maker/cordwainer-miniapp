/**
 * Accurate shoe size conversion based on ISO 19407:2023 / ISO/TS 19407
 * and Mondopoint (ISO 9407) + brand-specific lasts (Nike, Adidas, NB, Puma,
 * Zara, Bershka, Terranova, Lacoste).
 *
 * Base unit: foot length in millimetres.
 * Brand tables use official published size charts converted to mm.
 * findClosest always uses the raw footMm (never the rounded mondopoint).
 * ukr is always derived from pure foot length (mondopoint / 10).
 */

export type Gender = 'men' | 'women' | 'kids'

export type Brand =
  | 'standard'
  | 'nike'
  | 'adidas'
  | 'newbalance'
  | 'puma'
  | 'zara'
  | 'bershka'
  | 'terranova'
  | 'lacoste'

export type SizeResult = {
  mondopoint: number // mm, rounded to nearest 5 (pure foot length)
  eu: number
  uk: number
  us: number
  ukr: number // metric / GOST style = mondopoint / 10
  cm: number // exact foot length in cm (1 decimal)
  mm: number // exact input mm
}

type SizeRow = {
  mm: number
  eu: number
  uk: number
  us: number
}

/** Adult recommended marking (ISO 19407 Table 2 style) — fallback */
const ADULT_TABLE: Array<{
  mm: number
  eu: number
  uk: number
  usMen: number
  usWomen: number
}> = [
  { mm: 210, eu: 33.5, uk: 1.5, usMen: 2.5, usWomen: 3.5 },
  { mm: 215, eu: 34, uk: 2.5, usMen: 3.5, usWomen: 4.5 },
  { mm: 220, eu: 35, uk: 3, usMen: 4, usWomen: 5 },
  { mm: 225, eu: 35.5, uk: 3.5, usMen: 4.5, usWomen: 5.5 },
  { mm: 230, eu: 36.5, uk: 4, usMen: 5, usWomen: 6 },
  { mm: 235, eu: 37, uk: 4.5, usMen: 5.5, usWomen: 6.5 },
  { mm: 240, eu: 38, uk: 5.5, usMen: 6.5, usWomen: 7.5 },
  { mm: 245, eu: 38.5, uk: 6, usMen: 7, usWomen: 8 },
  { mm: 250, eu: 39.5, uk: 6.5, usMen: 7.5, usWomen: 8.5 },
  { mm: 255, eu: 40, uk: 7, usMen: 8, usWomen: 9 },
  { mm: 260, eu: 41, uk: 7.5, usMen: 8.5, usWomen: 9.5 },
  { mm: 265, eu: 41.5, uk: 8.5, usMen: 9.5, usWomen: 10.5 },
  { mm: 270, eu: 42.5, uk: 9, usMen: 10, usWomen: 11 },
  { mm: 275, eu: 43, uk: 9.5, usMen: 10.5, usWomen: 11.5 },
  { mm: 280, eu: 44, uk: 10, usMen: 11, usWomen: 12 },
  { mm: 285, eu: 44.5, uk: 10.5, usMen: 11.5, usWomen: 12.5 },
  { mm: 290, eu: 45.5, uk: 11, usMen: 12, usWomen: 13 },
  { mm: 295, eu: 46, uk: 12, usMen: 13, usWomen: 14 },
  { mm: 300, eu: 47, uk: 12.5, usMen: 13.5, usWomen: 14.5 },
  { mm: 305, eu: 47.5, uk: 13, usMen: 14, usWomen: 15 },
  { mm: 310, eu: 48.5, uk: 13.5, usMen: 14.5, usWomen: 15.5 },
  { mm: 315, eu: 49, uk: 14, usMen: 15, usWomen: 16 },
  { mm: 320, eu: 50, uk: 15, usMen: 16, usWomen: 17 },
]

/** Kids table (ISO recommended, simplified) — fallback */
const KIDS_TABLE: SizeRow[] = [
  { mm: 120, eu: 19.5, uk: 3.5, us: 4 },
  { mm: 125, eu: 20, uk: 4, us: 4.5 },
  { mm: 130, eu: 21, uk: 5, us: 5.5 },
  { mm: 135, eu: 22, uk: 5.5, us: 6 },
  { mm: 140, eu: 22.5, uk: 6, us: 6.5 },
  { mm: 145, eu: 23.5, uk: 7, us: 7.5 },
  { mm: 150, eu: 24.5, uk: 7.5, us: 8 },
  { mm: 155, eu: 25, uk: 8, us: 8.5 },
  { mm: 160, eu: 26, uk: 9, us: 9.5 },
  { mm: 165, eu: 27, uk: 9.5, us: 10 },
  { mm: 170, eu: 27.5, uk: 10, us: 10.5 },
  { mm: 175, eu: 28.5, uk: 11, us: 11.5 },
  { mm: 180, eu: 29, uk: 11.5, us: 12 },
  { mm: 185, eu: 30, uk: 12, us: 12.5 },
  { mm: 190, eu: 31, uk: 13, us: 13.5 },
  { mm: 195, eu: 31.5, uk: 13.5, us: 1 },
  { mm: 200, eu: 32.5, uk: 1, us: 1.5 },
  { mm: 205, eu: 33, uk: 1.5, us: 2 },
  { mm: 210, eu: 34, uk: 2, us: 2.5 },
  { mm: 215, eu: 34.5, uk: 2.5, us: 3 },
  { mm: 220, eu: 35.5, uk: 3.5, us: 4 },
  { mm: 225, eu: 36, uk: 4, us: 4.5 },
]

/* ------------------------------------------------------------------ */
/*  Brand-specific tables (mm → eu / uk / us)                         */
/*  Nike & Puma Men: US − UK = 1                                      */
/*  Adidas: ⅓ / ⅔ Paris Point                                         */
/* ------------------------------------------------------------------ */

// ---------- Nike ----------
// Official Nike: Men US = UK + 1
const NIKE_MEN: SizeRow[] = [
  { mm: 245, eu: 40, uk: 6, us: 7 },
  { mm: 250, eu: 40.5, uk: 6.5, us: 7.5 },
  { mm: 254, eu: 41, uk: 7, us: 8 },
  { mm: 258, eu: 42, uk: 7.5, us: 8.5 },
  { mm: 262, eu: 42.5, uk: 8, us: 9 },
  { mm: 267, eu: 43, uk: 8.5, us: 9.5 },
  { mm: 271, eu: 44, uk: 9, us: 10 },
  { mm: 275, eu: 44.5, uk: 9.5, us: 10.5 },
  { mm: 279, eu: 45, uk: 10, us: 11 },
  { mm: 283, eu: 45.5, uk: 10.5, us: 11.5 },
  { mm: 288, eu: 46, uk: 11, us: 12 },
  { mm: 292, eu: 47, uk: 11.5, us: 12.5 },
  { mm: 296, eu: 47.5, uk: 12, us: 13 },
  { mm: 300, eu: 48, uk: 12.5, us: 13.5 },
]

const NIKE_WOMEN: SizeRow[] = [
  { mm: 220, eu: 35.5, uk: 2.5, us: 5 },
  { mm: 224, eu: 36, uk: 3, us: 5.5 },
  { mm: 229, eu: 36.5, uk: 3.5, us: 6 },
  { mm: 233, eu: 37.5, uk: 4, us: 6.5 },
  { mm: 237, eu: 38, uk: 4.5, us: 7 },
  { mm: 241, eu: 38.5, uk: 5, us: 7.5 },
  { mm: 245, eu: 39, uk: 5.5, us: 8 },
  { mm: 250, eu: 40, uk: 6, us: 8.5 },
  { mm: 254, eu: 40.5, uk: 6.5, us: 9 },
  { mm: 258, eu: 41, uk: 7, us: 9.5 },
  { mm: 262, eu: 42, uk: 7.5, us: 10 },
  { mm: 267, eu: 42.5, uk: 8, us: 10.5 },
  { mm: 271, eu: 43, uk: 8.5, us: 11 },
]

const NIKE_KIDS: SizeRow[] = [
  { mm: 120, eu: 19.5, uk: 3.5, us: 4 },
  { mm: 140, eu: 23.5, uk: 6, us: 7 },
  { mm: 170, eu: 28, uk: 10, us: 11 },
  { mm: 200, eu: 32, uk: 13.5, us: 1 },
  { mm: 220, eu: 35, uk: 2.5, us: 3.5 },
]

// ---------- Adidas (⅓ / ⅔) ----------
const ADIDAS_MEN: SizeRow[] = [
  { mm: 250, eu: 40, uk: 6.5, us: 7 },
  { mm: 255, eu: 40 + 2 / 3, uk: 7, us: 7.5 },
  { mm: 260, eu: 41 + 1 / 3, uk: 7.5, us: 8 },
  { mm: 265, eu: 42, uk: 8, us: 8.5 },
  { mm: 270, eu: 42 + 2 / 3, uk: 8.5, us: 9 },
  { mm: 275, eu: 43 + 1 / 3, uk: 9, us: 9.5 },
  { mm: 280, eu: 44, uk: 9.5, us: 10 },
  { mm: 285, eu: 44 + 2 / 3, uk: 10, us: 10.5 },
  { mm: 290, eu: 45 + 1 / 3, uk: 10.5, us: 11 },
  { mm: 295, eu: 46, uk: 11, us: 11.5 },
  { mm: 300, eu: 46 + 2 / 3, uk: 11.5, us: 12 },
]

const ADIDAS_WOMEN: SizeRow[] = [
  { mm: 230, eu: 37 + 1 / 3, uk: 4.5, us: 6 },
  { mm: 235, eu: 38, uk: 5, us: 6.5 },
  { mm: 240, eu: 38 + 2 / 3, uk: 5.5, us: 7 },
  { mm: 245, eu: 39 + 1 / 3, uk: 6, us: 7.5 },
  { mm: 250, eu: 40, uk: 6.5, us: 8 },
  { mm: 255, eu: 40 + 2 / 3, uk: 7, us: 8.5 },
  { mm: 260, eu: 41 + 1 / 3, uk: 7.5, us: 9 },
  { mm: 265, eu: 42, uk: 8, us: 9.5 },
]

const ADIDAS_KIDS: SizeRow[] = [
  { mm: 120, eu: 20, uk: 4, us: 4.5 },
  { mm: 140, eu: 24, uk: 6.5, us: 7.5 },
  { mm: 170, eu: 28.5, uk: 10.5, us: 11.5 },
  { mm: 200, eu: 33, uk: 1, us: 1.5 },
  { mm: 220, eu: 35.5, uk: 3, us: 4 },
]

// ---------- New Balance (US − UK = 0.5) ----------
const NB_MEN: SizeRow[] = [
  { mm: 250, eu: 40, uk: 6.5, us: 7 },
  { mm: 255, eu: 40.5, uk: 7, us: 7.5 },
  { mm: 260, eu: 41.5, uk: 7.5, us: 8 },
  { mm: 265, eu: 42, uk: 8, us: 8.5 },
  { mm: 270, eu: 42.5, uk: 8.5, us: 9 },
  { mm: 275, eu: 43, uk: 9, us: 9.5 },
  { mm: 280, eu: 44, uk: 9.5, us: 10 },
  { mm: 285, eu: 44.5, uk: 10, us: 10.5 },
  { mm: 290, eu: 45, uk: 10.5, us: 11 },
  { mm: 300, eu: 46.5, uk: 11.5, us: 12 },
]

const NB_WOMEN: SizeRow[] = [
  { mm: 230, eu: 36, uk: 3.5, us: 6 },
  { mm: 235, eu: 37, uk: 4, us: 6.5 },
  { mm: 240, eu: 37.5, uk: 4.5, us: 7 },
  { mm: 245, eu: 38, uk: 5, us: 7.5 },
  { mm: 250, eu: 39, uk: 5.5, us: 8 },
  { mm: 255, eu: 40, uk: 6, us: 8.5 },
  { mm: 260, eu: 40.5, uk: 6.5, us: 9 },
]

const NB_KIDS: SizeRow[] = [
  { mm: 120, eu: 20, uk: 4, us: 4.5 },
  { mm: 140, eu: 23.5, uk: 6, us: 7 },
  { mm: 170, eu: 28, uk: 10, us: 11 },
  { mm: 200, eu: 32.5, uk: 13.5, us: 1 },
  { mm: 220, eu: 35, uk: 2.5, us: 3.5 },
]

// ---------- Puma ----------
// Official Puma: Men US = UK + 1
const PUMA_MEN: SizeRow[] = [
  { mm: 245, eu: 39, uk: 6, us: 7 },
  { mm: 250, eu: 40, uk: 6.5, us: 7.5 },
  { mm: 255, eu: 40.5, uk: 7, us: 8 },
  { mm: 260, eu: 41, uk: 7.5, us: 8.5 },
  { mm: 265, eu: 42, uk: 8, us: 9 },
  { mm: 270, eu: 42.5, uk: 8.5, us: 9.5 },
  { mm: 275, eu: 43, uk: 9, us: 10 },
  { mm: 280, eu: 44, uk: 9.5, us: 10.5 },
  { mm: 285, eu: 44.5, uk: 10, us: 11 },
  { mm: 290, eu: 45, uk: 10.5, us: 11.5 },
  { mm: 295, eu: 46, uk: 11, us: 12 },
  { mm: 300, eu: 46.5, uk: 11.5, us: 12.5 },
]

const PUMA_WOMEN: SizeRow[] = [
  { mm: 220, eu: 35.5, uk: 3, us: 5.5 },
  { mm: 225, eu: 36, uk: 3.5, us: 6 },
  { mm: 230, eu: 37, uk: 4, us: 6.5 },
  { mm: 235, eu: 37.5, uk: 4.5, us: 7 },
  { mm: 240, eu: 38, uk: 5, us: 7.5 },
  { mm: 245, eu: 38.5, uk: 5.5, us: 8 },
  { mm: 250, eu: 39, uk: 6, us: 8.5 },
  { mm: 255, eu: 40, uk: 6.5, us: 9 },
  { mm: 260, eu: 40.5, uk: 7, us: 9.5 },
  { mm: 265, eu: 41, uk: 7.5, us: 10 },
]

const PUMA_KIDS: SizeRow[] = [
  { mm: 120, eu: 20, uk: 4, us: 4.5 },
  { mm: 140, eu: 24, uk: 6.5, us: 7.5 },
  { mm: 170, eu: 28, uk: 10, us: 11 },
  { mm: 200, eu: 32, uk: 13.5, us: 1 },
  { mm: 220, eu: 35.5, uk: 3, us: 4 },
]

// ---------- Zara / Bershka (identical Inditex last) ----------
const ZARA_MEN: SizeRow[] = [
  { mm: 254, eu: 39, uk: 6, us: 7 },
  { mm: 259, eu: 40, uk: 6.5, us: 7.5 },
  { mm: 264, eu: 41, uk: 7.5, us: 8.5 },
  { mm: 271, eu: 42, uk: 8, us: 9 },
  { mm: 277, eu: 43, uk: 9, us: 10 },
  { mm: 284, eu: 44, uk: 9.5, us: 10.5 },
  { mm: 289, eu: 45, uk: 10.5, us: 11.5 },
]

const ZARA_WOMEN: SizeRow[] = [
  { mm: 232, eu: 36, uk: 3.5, us: 6 },
  { mm: 238, eu: 37, uk: 4, us: 6.5 },
  { mm: 244, eu: 38, uk: 5, us: 7.5 },
  { mm: 250, eu: 39, uk: 5.5, us: 8 },
  { mm: 257, eu: 40, uk: 6.5, us: 9 },
  { mm: 264, eu: 41, uk: 7, us: 9.5 },
]

const ZARA_KIDS: SizeRow[] = [
  { mm: 145, eu: 23, uk: 6, us: 7 },
  { mm: 165, eu: 26, uk: 8.5, us: 9.5 },
  { mm: 185, eu: 29, uk: 11, us: 12 },
  { mm: 205, eu: 32, uk: 13.5, us: 1 },
  { mm: 230, eu: 36, uk: 3.5, us: 4.5 },
]

// ---------- Terranova (classic EU mass-market) ----------
const TERRANOVA_MEN: SizeRow[] = [
  { mm: 254, eu: 39, uk: 6, us: 7 },
  { mm: 259, eu: 40, uk: 6.5, us: 7.5 },
  { mm: 264, eu: 41, uk: 7.5, us: 8.5 },
  { mm: 271, eu: 42, uk: 8, us: 9 },
  { mm: 277, eu: 43, uk: 9, us: 10 },
  { mm: 284, eu: 44, uk: 9.5, us: 10.5 },
  { mm: 289, eu: 45, uk: 10.5, us: 11.5 },
]

const TERRANOVA_WOMEN: SizeRow[] = [
  { mm: 232, eu: 36, uk: 3.5, us: 6 },
  { mm: 238, eu: 37, uk: 4, us: 6.5 },
  { mm: 244, eu: 38, uk: 5, us: 7.5 },
  { mm: 250, eu: 39, uk: 5.5, us: 8 },
  { mm: 257, eu: 40, uk: 6.5, us: 9 },
  { mm: 264, eu: 41, uk: 7, us: 9.5 },
]

// ---------- Lacoste (UK-oriented) ----------
const LACOSTE_MEN: SizeRow[] = [
  { mm: 254, eu: 39.5, uk: 6, us: 7 },
  { mm: 259, eu: 40, uk: 6.5, us: 7.5 },
  { mm: 264, eu: 41, uk: 7.5, us: 8.5 },
  { mm: 271, eu: 42, uk: 8, us: 9 },
  { mm: 277, eu: 43, uk: 9, us: 10 },
  { mm: 284, eu: 44, uk: 9.5, us: 10.5 },
  { mm: 289, eu: 45, uk: 10.5, us: 11.5 },
]

const LACOSTE_WOMEN: SizeRow[] = [
  { mm: 232, eu: 36, uk: 3.5, us: 5.5 },
  { mm: 237, eu: 37, uk: 4, us: 6 },
  { mm: 244, eu: 38, uk: 5, us: 7 },
  { mm: 250, eu: 39, uk: 5.5, us: 7.5 },
  { mm: 257, eu: 40, uk: 6.5, us: 8.5 },
  { mm: 263, eu: 41, uk: 7, us: 9 },
]

const LACOSTE_KIDS: SizeRow[] = [
  { mm: 145, eu: 23, uk: 6, us: 7 },
  { mm: 165, eu: 26, uk: 8.5, us: 9.5 },
  { mm: 185, eu: 29, uk: 11, us: 12 },
  { mm: 205, eu: 32, uk: 13.5, us: 1 },
  { mm: 230, eu: 36, uk: 3.5, us: 4.5 },
]

/** Lookup map: brand → gender → table (or undefined → fallback) */
const BRAND_TABLES: Record<
  Exclude<Brand, 'standard'>,
  Partial<Record<Gender, SizeRow[]>>
> = {
  nike: { men: NIKE_MEN, women: NIKE_WOMEN, kids: NIKE_KIDS },
  adidas: { men: ADIDAS_MEN, women: ADIDAS_WOMEN, kids: ADIDAS_KIDS },
  newbalance: { men: NB_MEN, women: NB_WOMEN, kids: NB_KIDS },
  puma: { men: PUMA_MEN, women: PUMA_WOMEN, kids: PUMA_KIDS },
  zara: { men: ZARA_MEN, women: ZARA_WOMEN, kids: ZARA_KIDS },
  bershka: { men: ZARA_MEN, women: ZARA_WOMEN, kids: ZARA_KIDS }, // identical to Zara
  terranova: { men: TERRANOVA_MEN, women: TERRANOVA_WOMEN },
  lacoste: { men: LACOSTE_MEN, women: LACOSTE_WOMEN, kids: LACOSTE_KIDS },
}

/** Round foot length to nearest Mondopoint step (5 mm) */
export function toMondopoint(mm: number): number {
  return Math.round(mm / 5) * 5
}

/** Find closest entry in a table by raw mm (never use mondopoint here) */
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
 * Main conversion function.
 * @param footMm exact foot length in millimetres
 * @param gender men | women | kids
 * @param brand standard | nike | adidas | … (default 'standard')
 */
export function convertShoeSize(
  footMm: number,
  gender: Gender,
  brand: Brand = 'standard',
): SizeResult {
  const mm = Math.max(100, Math.min(340, footMm))
  const mondopoint = toMondopoint(mm)
  const cm = Math.round((mm / 10) * 10) / 10 // 1 decimal
  // UKR / GOST always from pure foot length (independent of brand last)
  const ukr = mondopoint / 10

  // Brand-specific table — search by raw mm
  if (brand !== 'standard') {
    const brandTables = BRAND_TABLES[brand]
    const table = brandTables?.[gender]
    if (table && table.length > 0) {
      const row = findClosest(table, mm) // ← raw mm, not mondopoint
      return {
        mondopoint, // pure rounded foot length
        eu: row.eu,
        uk: row.uk,
        us: row.us,
        ukr,
        cm,
        mm,
      }
    }
    // no table for this gender → fall through to ISO
  }

  // ISO fallback — also search by raw mm for consistency
  if (gender === 'kids') {
    const row = findClosest(KIDS_TABLE, mm)
    return {
      mondopoint,
      eu: row.eu,
      uk: row.uk,
      us: row.us,
      ukr,
      cm,
      mm,
    }
  }

  const row = findClosest(ADULT_TABLE, mm)
  const us = gender === 'men' ? row.usMen : row.usWomen

  return {
    mondopoint,
    eu: row.eu,
    uk: row.uk,
    us,
    ukr,
    cm,
    mm,
  }
}

/** Format size for display (remove .0, keep ⅓/⅔ readable) */
export function formatSize(n: number): string {
  // Adidas-style thirds
  const third = 1 / 3
  const twoThird = 2 / 3
  const frac = n - Math.floor(n)
  if (Math.abs(frac - third) < 0.02) return `${Math.floor(n)}⅓`
  if (Math.abs(frac - twoThird) < 0.02) return `${Math.floor(n)}⅔`
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(1).replace(/\.0$/, '')
}

/** Recommended slider ranges */
export const RANGES = {
  men: { min: 220, max: 320, default: 265 },
  women: { min: 210, max: 280, default: 240 },
  kids: { min: 120, max: 230, default: 170 },
} as const

/** Brand display labels (for UI chips) */
export const BRAND_LABELS: Record<Brand, string> = {
  standard: 'ISO',
  nike: 'Nike',
  adidas: 'Adidas',
  newbalance: 'NB',
  puma: 'Puma',
  zara: 'Zara',
  bershka: 'Bershka',
  terranova: 'Terranova',
  lacoste: 'Lacoste',
}
