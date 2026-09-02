// src/types/salary.ts

export type Lang = 'ru' | 'uk'

export interface SalaryItem {
  id: string
  name: string
}

export interface DayRecord {
  quantities: Record<string, number> // itemId → qty
  rates: Record<string, number>      // itemId → rate (снимок на момент записи)
}

export interface MonthStats {
  quantities: Record<string, number>
  money: Record<string, number>
  total: number
  days: number
}

export interface ArchiveMonth {
  days: Record<string, DayRecord> // 'YYYY-MM-DD' → DayRecord
  stats: MonthStats
}

export interface SalaryUserData {
  items: SalaryItem[]
  rates: Record<string, number>          // текущие расценки
  days: Record<string, DayRecord>        // текущий (и возможно прошлый) месяц
  archive: Record<string, ArchiveMonth>  // 'YYYY-MM' → ArchiveMonth
  updatedAt: string                      // ISO
}

export const MAX_ITEMS = 10

export function createEmptySalaryData(): SalaryUserData {
  return {
    items: [],
    rates: {},
    days: {},
    archive: {},
    updatedAt: new Date().toISOString(),
  }
  }
