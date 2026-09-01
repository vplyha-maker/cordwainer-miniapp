// src/lib/salaryHelpers.ts
import type { DayRecord, MonthStats, SalaryItem, SalaryUserData } from '../types/salary'
import { MAX_ITEMS } from '../types/salary'

/** Текущая дата в часовом поясе Киева (YYYY-MM-DD) */
export function getKyivDate(): Date {
  // Europe/Kyiv
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(new Date())
  const year = Number(parts.find(p => p.type === 'year')!.value)
  const month = Number(parts.find(p => p.type === 'month')!.value)
  const day = Number(parts.find(p => p.type === 'day')!.value)
  return new Date(year, month - 1, day)
}

export function getToday(): string {
  return getKyivDate().toISOString().slice(0, 10) // YYYY-MM-DD
}

export function getCurrentMonth(): string {
  return getToday().slice(0, 7) // YYYY-MM
}

/** 2025-03-15 → 15.03.2025 */
export function formatDay(dayStr: string): string {
  const [y, m, d] = dayStr.split('-')
  return `\( {d}. \){m}.${y}`
}

/** 2025-03 → Март 2025 / Березень 2025 */
export function formatMonth(monthStr: string, lang: 'ru' | 'uk'): string {
  const monthsRu: Record<string, string> = {
    '01': 'Январь', '02': 'Февраль', '03': 'Март', '04': 'Апрель',
    '05': 'Май', '06': 'Июнь', '07': 'Июль', '08': 'Август',
    '09': 'Сентябрь', '10': 'Октябрь', '11': 'Ноябрь', '12': 'Декабрь',
  }
  const monthsUk: Record<string, string> = {
    '01': 'Січень', '02': 'Лютий', '03': 'Березень', '04': 'Квітень',
    '05': 'Травень', '06': 'Червень', '07': 'Липень', '08': 'Серпень',
    '09': 'Вересень', '10': 'Жовтень', '11': 'Листопад', '12': 'Грудень',
  }

  const [year, month] = monthStr.split('-')
  const name = lang === 'uk' ? (monthsUk[month] || month) : (monthsRu[month] || month)
  return `${name} ${year}`
}

export function generateItemId(): string {
  return 'i' + Math.random().toString(16).slice(2, 10)
}

export function calcDayTotal(quantities: Record<string, number>, rates: Record<string, number>): number {
  let total = 0
  for (const [itemId, qty] of Object.entries(quantities)) {
    total += (qty || 0) * (rates[itemId] || 0)
  }
  return total
}

/** День считается записанным, только если есть хотя бы одно qty > 0 */
export function isDayRecorded(dayData: DayRecord | null | undefined): boolean {
  if (!dayData) return false
  const quantities = dayData.quantities || {}
  return Object.values(quantities).some(qty => (qty || 0) > 0)
}

export function calcMonthStats(
  days: Record<string, DayRecord>,
  month: string, // YYYY-MM
  items: SalaryItem[]
): MonthStats {
  const stats: MonthStats = {
    quantities: Object.fromEntries(items.map(it => [it.id, 0])),
    money: Object.fromEntries(items.map(it => [it.id, 0])),
    total: 0,
    days: 0,
  }

  for (const [dayKey, day] of Object.entries(days)) {
    if (!dayKey.startsWith(month)) continue
    if (!isDayRecorded(day)) continue

    stats.days += 1
    const rates = day.rates || {}

    for (const [itemId, qty] of Object.entries(day.quantities || {})) {
      if (itemId in stats.quantities) {
        stats.quantities[itemId] += qty || 0
        stats.money[itemId] += (qty || 0) * (rates[itemId] || 0)
      }
    }
  }

  stats.total = Object.values(stats.money).reduce((a, b) => a + b, 0)
  return stats
}

export function getItemName(items: SalaryItem[], itemId: string): string {
  return items.find(it => it.id === itemId)?.name || itemId
}

/** Можно ли ещё добавить изделие */
export function canAddItem(items: SalaryItem[]): boolean {
  return items.length < MAX_ITEMS
}
