import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'
import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { loadAllPigments } from '../data/loadPigments'
import { mixSpectra, spectrumToRGB, rgbToHex, SpectrumPoint } from '../utils/colorScience'

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

interface PaintPart {
  id: string
  pigmentId: string
  amount: string // Изменено на string для стабильной работы на iOS
}

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)

  // Стартовые значения теперь пустые строки
  const [paints, setPaints] = useState<PaintPart[]>([
    { id: '1', pigmentId: 'titanium_white', amount: '' },
    { id: '2', pigmentId: 'cadmium_yellow', amount: '' },
  ])

  useEffect(() => {
    loadAllPigments()
      .then((loaded: Pigment[]) => {
        setPigments(loaded)
        setLoading(false)
      })
      .catch((err: unknown) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  // При расчетах переводим строки в числа
  const totalAmount = paints.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

  const mixedColor = useMemo(() => {
    if (pigments.length === 0 || totalAmount <= 0) return null

    const components: { spectrum: SpectrumPoint[]; volume: number }[] = []

    for (const paint of paints) {
      const pigment = pigments.find((p) => p.id === paint.pigmentId)
      const val = parseFloat(paint.amount) || 0 // Конвертация для расчетов
      if (pigment?.spectrum && val > 0) {
        components.push({
          spectrum: pigment.spectrum,
          volume: val,
        })
      }
    }

    if (components.length === 0) return null

    const mixedSpectrum = mixSpectra(components)
    const rgb = spectrumToRGB(mixedSpectrum)

    return {
      rgb,
      hex: rgbToHex(rgb),
    }
  }, [paints, pigments, totalAmount])

  const addPaint = () => {
    setPaints([
      ...paints,
      {
        id: Math.random().toString(36).slice(2), // Более надежный генератор ID
        pigmentId: pigments[0]?.id || 'titanium_white',
        amount: '',
      },
    ])
  }

  const removePaint = (id: string) => {
    if (paints.length <= 1) return
    setPaints(paints.filter((p) => p.id !== id))
  }

  const updatePaint = (id: string, field: keyof PaintPart, value: string) => {
    setPaints(paints.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const getPigmentName = (pigmentId: string) => {
    const pigment = pigments.find((p) => p.id === pigmentId)
    if (!pigment) return '...'
    return lang === 'uk' ? pigment.name.uk : pigment.name.ru
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen flex flex-col pt-safe px-4 pb-8"
    >
      {/* Шапка */}
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
          {lang === 'uk' ? 'Калькулятор кольору' : 'Калькулятор цвета'}
        </h1>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {/* Состав смеси */}
        <div className="bg-[var(--color-surface,#F5F1EA)] rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-4 opacity-80">
            {lang === 'uk' ? 'Склад суміші' : 'Состав смеси'}
          </h2>

          {loading ? (
            <div className="text-sm opacity-60 py-4 text-center">
              {lang === 'uk' ? 'Завантаження пігментів...' : 'Загрузка пигментов...'}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {paints.map((paint) => (
                <div key={paint.id} className="flex items-center gap-2">
                  {/* Выбор пигмента */}
                  <select
                    value={paint.pigmentId}
                    onChange={(e) => updatePaint(paint.id, 'pigmentId', e.target.value)}
                    className="flex-1 min-w-0 bg-white text-black border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D8A35C]"
                  >
                    {pigments.map((p) => (
                      <option key={p.id} value={p.id}>
                        {lang === 'uk' ? p.name.uk : p.name.ru}
                      </option>
                    ))}
                  </select>

                  {/* Объём - Исправлено для iOS */}
                  <input
                    type="text" // Используем text вместо number
                    inputMode="decimal" // Вызывает цифровую клавиатуру
                    value={paint.amount}
                    onChange={(e) => {
                      // Меняем запятую на точку (особенность клавиатур на iOS/Android)
                      let val = e.target.value.replace(',', '.')
                      
                      // Проверяем, что введено корректное число (только цифры и макс. одна точка)
                      if (/^\d*\.?\d*$/.test(val)) {
                        // Защита: не больше 5000 мл
                        if (parseFloat(val) > 5000) {
                          val = '5000'
                        }
                        updatePaint(paint.id, 'amount', val)
                      }
                    }}
                    className="w-20 flex-shrink-0 bg-white text-black border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-[#D8A35C]"
                    placeholder="0"
                  />

                  <span className="text-xs opacity-50 flex-shrink-0">мл</span>

                  <button
                    onClick={() => removePaint(paint.id)}
                    className="p-2 text-red-500 opacity-70 hover:opacity-100 flex-shrink-0"
                    disabled={paints.length <= 1}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addPaint}
            disabled={loading}
            className="mt-4 w-full py-2.5 rounded-lg border border-dashed border-[#D8A35C] text-[#D8A35C] text-sm font-medium hover:bg-[#D8A35C] hover:text-white transition-colors disabled:opacity-40"
          >
            {lang === 'uk' ? '+ Додати колір' : '+ Добавить цвет'}
          </button>
        </div>

        {/* Результат */}
        <div className="bg-[#151210] text-[#F5F1EA] rounded-2xl p-6 shadow-md">
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-32 h-32 rounded-2xl border-2 border-white/20 shadow-lg mb-3 transition-colors duration-300"
              style={{ backgroundColor: mixedColor?.hex || '#333' }}
            />
            <div className="text-sm opacity-70">
              {mixedColor ? mixedColor.hex : '—'}
            </div>
          </div>

          <div className="flex justify-between items-end mb-4 border-b border-gray-700 pb-4">
            <span className="text-sm opacity-70">
              {lang === 'uk' ? 'Загальний об’єм:' : 'Общий объем:'}
            </span>
            <span className="text-2xl font-bold">
              {totalAmount > 1000
                ? (totalAmount / 1000).toFixed(2) + ' л'
                : totalAmount.toFixed(1) + ' мл'}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {paints.map((paint) => {
              const paintAmount = parseFloat(paint.amount) || 0 // Конвертация для процентов
              const percentage =
                totalAmount > 0
                  ? ((paintAmount / totalAmount) * 100).toFixed(1)
                  : '0.0'

              const pigment = pigments.find((p) => p.id === paint.pigmentId)

              return (
                <div key={paint.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 truncate pr-4 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full border border-white/30 flex-shrink-0"
                      style={{ backgroundColor: pigment?.hex || '#666' }}
                    />
                    <span className="opacity-80 truncate">
                      {getPigmentName(paint.pigmentId)}
                    </span>
                  </div>
                  <span className="font-mono text-[#D8A35C] flex-shrink-0">{percentage}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
