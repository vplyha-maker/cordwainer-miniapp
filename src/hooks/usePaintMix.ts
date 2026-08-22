/**
 * usePaintMix.ts
 * Состояние состава смеси (вкладка Mix).
 */
import { useState, useRef, useMemo, useCallback } from 'react'
import { Pigment } from '../data/pigments'

export interface PaintPart {
  id: string
  pigmentId: string
  amount: string
}

let paintIdSeq = 0
function nextPaintId(): string {
  paintIdSeq += 1
  return `p-\( {paintIdSeq}- \){Date.now().toString(36)}`
}

const DEFAULT_ROWS: PaintPart[] = [
  { id: '1', pigmentId: 'titanium_white', amount: '' },
  { id: '2', pigmentId: 'cadmium_yellow', amount: '' },
]

export function usePaintMix(pigments: Pigment[]) {
  const [paints, setPaints] = useState<PaintPart[]>(DEFAULT_ROWS)

  const amountRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const totalAmount = useMemo(() => {
    let sum = 0
    for (let i = 0; i < paints.length; i++) {
      const n = parseFloat(paints[i].amount)
      if (!isNaN(n) && n > 0) sum += n
    }
    return sum
  }, [paints])

  const addPaint = useCallback(() => {
    const newId = nextPaintId()
    const fallbackId = pigments[0]?.id || 'titanium_white'

    setPaints((prev) => [
      ...prev,
      {
        id: newId,
        pigmentId: fallbackId,
        amount: '',
      },
    ])

    // Фокус на поле объёма после монтирования
    setTimeout(() => {
      const input = amountRefs.current.get(newId)
      if (input) input.focus()
    }, 50)
  }, [pigments])

  const removePaint = useCallback((id: string) => {
    setPaints((prev) => {
      if (prev.length <= 1) return prev
      amountRefs.current.delete(id)
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const updatePaint = useCallback(
    (id: string, field: keyof PaintPart, value: string) => {
      setPaints((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
      )
    },
    []
  )

  const clearAllAmounts = useCallback(() => {
    setPaints((prev) => prev.map((p) => ({ ...p, amount: '' })))
  }, [])

  /**
   * Залить рецепт из Pro во вкладку Mix.
   * items: [{ pigmentId, ml }, ...]
   */
  const applyRecipe = useCallback(
    (items: { pigmentId: string; ml: number }[]) => {
      if (!items.length) return
      const rows: PaintPart[] = items.map((it) => ({
        id: nextPaintId(),
        pigmentId: it.pigmentId,
        amount: String(Math.round(it.ml * 100) / 100),
      }))
      setPaints(rows)
    },
    []
  )

  return {
    paints,
    setPaints,
    amountRefs,
    totalAmount,
    addPaint,
    removePaint,
    updatePaint,
    clearAllAmounts,
    applyRecipe,
  }
 }
