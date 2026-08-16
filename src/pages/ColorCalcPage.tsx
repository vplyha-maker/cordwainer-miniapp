import { motion } from 'framer-motion'
import { useState } from 'react'
import { Lang } from '../App'

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

interface PaintPart {
  id: string
  name: string
  amount: number
}

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  // Начальное состояние с парой дефолтных красок
  const [paints, setPaints] = useState<PaintPart[]>([
    { id: '1', name: lang === 'uk' ? 'Чорний базовий' : 'Черный базовый', amount: 10 },
    { id: '2', name: lang === 'uk' ? 'Червоний' : 'Красный', amount: 2 },
  ])

  // Считаем общий объем смеси
  const totalAmount = paints.reduce((sum, paint) => sum + (Number(paint.amount) || 0), 0)

  // Добавление новой краски
  const addPaint = () => {
    setPaints([
      ...paints,
      { id: Date.now().toString(), name: '', amount: 0 },
    ])
  }

  // Удаление краски
  const removePaint = (id: string) => {
    setPaints(paints.filter((p) => p.id !== id))
  }

  // Обновление данных конкретной краски
  const updatePaint = (id: string, field: keyof PaintPart, value: string | number) => {
    setPaints(
      paints.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen flex flex-col pt-safe px-4 pb-8"
    >
      {/* Шапка страницы */}
      <div className="flex items-center mb-6 mt-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-[var(--color-ink)] opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-xl font-bold ml-2">
          {lang === 'uk' ? 'Пропорції фарби' : 'Пропорции краски'}
        </h1>
      </div>

      {/* Основной контент */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-[var(--color-surface,#F5F1EA)] rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-4 opacity-80">
            {lang === 'uk' ? 'Склад суміші' : 'Состав смеси'}
          </h2>
          
          <div className="flex flex-col gap-3">
            {paints.map((paint) => (
              <div key={paint.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={paint.name}
                  onChange={(e) => updatePaint(paint.id, 'name', e.target.value)}
                  placeholder={lang === 'uk' ? 'Назва кольору' : 'Название цвета'}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D8A35C]"
                />
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={paint.amount || ''}
                  onChange={(e) => updatePaint(paint.id, 'amount', parseFloat(e.target.value) || 0)}
                  className="w-20 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-[#D8A35C]"
                  placeholder="0"
                />
                <button
                  onClick={() => removePaint(paint.id)}
                  className="p-2 text-red-500 opacity-70 hover:opacity-100"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addPaint}
            className="mt-4 w-full py-2.5 rounded-lg border border-dashed border-[#D8A35C] text-[#D8A35C] text-sm font-medium hover:bg-[#D8A35C] hover:text-white transition-colors"
          >
            {lang === 'uk' ? '+ Додати колір' : '+ Добавить цвет'}
          </button>
        </div>

        {/* Блок результатов */}
        <div className="bg-[#151210] text-[#F5F1EA] rounded-2xl p-6 shadow-md mt-2">
          <div className="flex justify-between items-end mb-4 border-b border-gray-700 pb-4">
            <span className="text-sm opacity-70">
              {lang === 'uk' ? 'Загальний об’єм:' : 'Общий объем:'}
            </span>
            <span className="text-2xl font-bold">
              {totalAmount.toFixed(1)}
            </span>
          </div>
          
          <div className="flex flex-col gap-2">
            {paints.map((paint) => {
              const percentage = totalAmount > 0 ? ((paint.amount / totalAmount) * 100).toFixed(1) : '0.0';
              return (
                <div key={paint.id} className="flex justify-between items-center text-sm">
                  <span className="opacity-80 truncate pr-4">{paint.name || '...'}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[#D8A35C]">{percentage}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
