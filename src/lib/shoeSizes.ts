/**
 * Accurate shoe size conversion based on ISO 19407:2023 / ISO/TS 19407
 * and Mondopoint (ISO 9407).
 *
 * Base unit: foot length in millimetres → Mondopoint.
 * Tables use the "recommended shoe size marking" (simplified Table 2)
 * which is the practical standard for consumer labelling.
 */

export type Gender = 'men' | 'women' | 'kids'

export type SizeResult = {
  mondopoint: number // mm, rounded to nearest 5
  eu: number
  uk: number
  us: number
  ukr: number // metric / GOST style (essentially cm of foot)
  cm: number // exact foot length in cm (1 decimal)
  mm: number // exact input mm
}

/** Adult recommended marking (ISO 19407 Table 2 style) */
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

/** Kids table (ISO recommended, simplified) */
const KIDS_TABLE: Array<{
  mm: number
  eu: number
  uk: number
  us: number
}> = [
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
 * Main conversion function.
 * @param footMm exact foot length in millimetres
 * @param gender men | women | kids
 */
export function convertShoeSize(footMm: number, gender: Gender): SizeResult {
  const mm = Math.max(100, Math.min(340, footMm))
  const mondopoint = toMondopoint(mm)
  const cm = Math.round((mm / 10) * 10) / 10 // 1 decimal

  if (gender === 'kids') {
    const row = findClosest(KIDS_TABLE, mondopoint)
    return {
      mondopoint: row.mm,
      eu: row.eu,
      uk: row.uk,
      us: row.us,
      ukr: Math.round((row.mm / 10) * 10) / 10,
      cm,
      mm,
    }
  }

  const row = findClosest(ADULT_TABLE, mondopoint)
  const us = gender === 'men' ? row.usMen : row.usWomen

  return {
    mondopoint: row.mm,
    eu: row.eu,
    uk: row.uk,
    us,
    ukr: Math.round((row.mm / 10) * 10) / 10,
    cm,
    mm,
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
