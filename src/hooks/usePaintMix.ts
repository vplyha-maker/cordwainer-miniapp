// hooks/usePaintMix.ts
import { useState, useRef, useMemo } from 'react'
import { Pigment } from '../data/pigments'

export interface PaintPart {
  id: string
  pigmentId: string
  amount: string
}

export function usePaintMix(pigments: Pigment[]) {
  const [paints, setPaints] = useState<PaintPart[]>([
    { id: '1', pigmentId: 'titanium_white', amount: '' },
    { id: '2', pigmentId: 'cadmium_yellow', amount: '' },
  ])

  const amountRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const totalAmount = useMemo(
    () => paints.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
    [paints]
  )

  const addPaint = () => {
    const newId = Math.random().toString(36).slice(2)
    setPaints((prev) => [
      ...prev,
      {
        id: newId,
        pigmentId: pigments[0]?.id || 'titanium_white',
        amount: '',
      },
    ])

    // Фокус после рендера
    setTimeout(() => {
      const input = amountRefs.current.get(newId)
      if (input) input.focus()
    }, 50)
  }

  const removePaint = (id: string) => {
    setPaints((prev) => {
      if (prev.length <= 1) return prev
      amountRefs.current.delete(id)
      return prev.filter((p) => p.id !== id)
    })
  }

  const updatePaint = (id: string, field: keyof PaintPart, value: string) => {
    setPaints((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  const clearAllAmounts = () => {
    setPaints((prev) => prev.map((p) => ({ ...p, amount: '' })))
  }

  // Добавляем функцию для полной перезаписи массива красок (нужна для генерации рецепта по HEX)
  const setAllPaints = (newPaints: PaintPart[]) => {
    setPaints(newPaints)
  }

  return {
    paints,
    amountRefs,
    totalAmount,
    addPaint,
    removePaint,
    updatePaint,
    clearAllAmounts,
    setAllPaints, // Экспортируем добавленную функцию
  }
}
