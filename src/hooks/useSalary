// src/hooks/useSalary.ts
import { useCallback, useEffect, useState } from 'react'
import type { DayRecord, SalaryItem, SalaryUserData } from '../types/salary'
import { createEmptySalaryData } from '../types/salary'
import {
  calcMonthStats,
  generateItemId,
  getCurrentMonth,
  getKyivDate,
  isDayRecorded,
} from '../lib/salaryHelpers'

type UseSalaryOptions = {
  userId: number | null | undefined
}

export function useSalary({ userId }: UseSalaryOptions) {
  const [data, setData] = useState<SalaryUserData>(createEmptySalaryData())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Загрузка ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!userId) {
      setData(createEmptySalaryData())
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/salary?user_id=${userId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData({
        items: json.items || [],
        rates: json.rates || {},
        days: json.days || {},
        archive: json.archive || {},
        updatedAt: json.updatedAt || new Date().toISOString(),
      })
    } catch (e: any) {
      console.error('useSalary load error', e)
      setError(e.message || 'Ошибка загрузки')
      setData(createEmptySalaryData())
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  // ─── Сохранение ────────────────────────────────────────────────────────
  const save = useCallback(async (next: SalaryUserData) => {
    if (!userId) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/salary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, data: next }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const result = await res.json()
      setData({ ...next, updatedAt: result.updatedAt || next.updatedAt })
    } catch (e: any) {
      console.error('useSalary save error', e)
      setError(e.message || 'Ошибка сохранения')
      throw e
    } finally {
      setSaving(false)
    }
  }, [userId])

  // ─── Удобные действия ──────────────────────────────────────────────────

  /** Добавить изделие (возвращает новый id) */
  const addItem = useCallback(async (name: string, rate: number) => {
    const id = generateItemId()
    const next: SalaryUserData = {
      ...data,
      items: [...data.items, { id, name }],
      rates: { ...data.rates, [id]: rate },
    }
    await save(next)
    return id
  }, [data, save])

  /** Переименовать изделие */
  const renameItem = useCallback(async (itemId: string, newName: string) => {
    const next: SalaryUserData = {
      ...data,
      items: data.items.map(it =>
        it.id === itemId ? { ...it, name: newName } : it
      ),
    }
    await save(next)
  }, [data, save])

  /** Удалить изделие + очистить из текущего месяца */
  const deleteItem = useCallback(async (itemId: string) => {
    const nextItems = data.items.filter(it => it.id !== itemId)
    const nextRates = { ...data.rates }
    delete nextRates[itemId]

    const nextDays: Record<string, DayRecord> = {}
    for (const [dayKey, day] of Object.entries(data.days)) {
      const quantities = { ...day.quantities }
      const rates = { ...day.rates }
      delete quantities[itemId]
      delete rates[itemId]
      nextDays[dayKey] = { quantities, rates }
    }

    const next: SalaryUserData = {
      ...data,
      items: nextItems,
      rates: nextRates,
      days: nextDays,
    }
    await save(next)
  }, [data, save])

  /** Обновить все текущие расценки */
  const updateRates = useCallback(async (newRates: Record<string, number>) => {
    const next: SalaryUserData = {
      ...data,
      rates: { ...newRates },
    }
    await save(next)
  }, [data, save])

  /** Пересчитать текущий месяц по новым расценкам */
  const recalcCurrentMonth = useCallback(async () => {
    const month = getCurrentMonth()
    const nextDays = { ...data.days }

    for (const [dayKey, day] of Object.entries(nextDays)) {
      if (dayKey.startsWith(month)) {
        nextDays[dayKey] = {
          ...day,
          rates: { ...data.rates },
        }
      }
    }

    const next: SalaryUserData = { ...data, days: nextDays }
    await save(next)
  }, [data, save])

  /** Сохранить / обновить день */
  const saveDay = useCallback(async (
    dayStr: string,
    quantities: Record<string, number>,
    rates?: Record<string, number>
  ) => {
    const usedRates = rates || data.rates
    const nextDays = { ...data.days }

    if (isDayRecorded({ quantities, rates: usedRates })) {
      nextDays[dayStr] = {
        quantities: { ...quantities },
        rates: { ...usedRates },
      }
    } else {
      delete nextDays[dayStr]
    }

    const next: SalaryUserData = { ...data, days: nextDays }
    await save(next)
  }, [data, save])

  /** Удалить день */
  const deleteDay = useCallback(async (dayStr: string) => {
    const nextDays = { ...data.days }
    delete nextDays[dayStr]
    const next: SalaryUserData = { ...data, days: nextDays }
    await save(next)
  }, [data, save])

  /** Закрыть месяц (логика как в Python close_month_yes) */
  const closeMonth = useCallback(async () => {
    const today = getKyivDate()
    let month = getCurrentMonth()

    let monthDays = Object.fromEntries(
      Object.entries(data.days).filter(([k]) => k.startsWith(month))
    )

    // Если в текущем месяце нет данных и сегодня ≤ 7 число — пробуем прошлый месяц
    if (Object.keys(monthDays).length === 0 && today.getDate() <= 7) {
      const prev = new Date(today.getFullYear(), today.getMonth(), 0) // последний день прошлого месяца
      const prevMonth = `\( {prev.getFullYear()}- \){String(prev.getMonth() + 1).padStart(2, '0')}`
      const prevDays = Object.fromEntries(
        Object.entries(data.days).filter(([k]) => k.startsWith(prevMonth))
      )

      if (Object.keys(prevDays).length > 0 && !data.archive[prevMonth]) {
        month = prevMonth
        monthDays = prevDays
      }
    }

    if (Object.keys(monthDays).length === 0) {
      throw new Error('NO_DATA')
    }

    if (data.archive[month]) {
      throw new Error('ALREADY_ARCHIVED')
    }

    const stats = calcMonthStats(data.days, month, data.items)

    const nextArchive = {
      ...data.archive,
      [month]: {
        days: monthDays,
        stats,
      },
    }

    const nextDays = Object.fromEntries(
      Object.entries(data.days).filter(([k]) => !k.startsWith(month))
    )

    const next: SalaryUserData = {
      ...data,
      archive: nextArchive,
      days: nextDays,
    }

    await save(next)
    return month
  }, [data, save])

  /** Удалить месяц из архива */
  const deleteArchiveMonth = useCallback(async (month: string) => {
    const nextArchive = { ...data.archive }
    delete nextArchive[month]
    const next: SalaryUserData = { ...data, archive: nextArchive }
    await save(next)
  }, [data, save])

  return {
    data,
    loading,
    saving,
    error,
    reload: load,
    save,
    addItem,
    renameItem,
    deleteItem,
    updateRates,
    recalcCurrentMonth,
    saveDay,
    deleteDay,
    closeMonth,
    deleteArchiveMonth,
  }
}
