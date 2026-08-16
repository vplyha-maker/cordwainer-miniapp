import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'
import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { loadAllPigments } from '../data/loadPigments'
import { mixSpectra, spectrumToRGB, rgbToHex } from '../utils/colorScience'

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

interface PaintPart {
  id: string
  pigmentId: string   // id из базы пигментов
  amount: number
}

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)

  // Состав смеси
  const [paints, setPaints] = useState<PaintPart[]>([
    { id: '1', pigmentId: 'titanium_white', amount: 50 },
    { id: '2', pigmentId: 'cadmium_yellow', amount: 20 },
  ])

  // Загружаем пигменты один раз
  useEffect(() => {
    loadAllPigments()
      .then((loaded) => {
        setPigments(loaded)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  // Общий объём
  const totalAmount = paints.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  // Считаем смешанный цвет
  const mixedColor = useMemo(() => {
    if (pigments.length === 0 || totalAmount <= 0) return null

    const components = paints
      .map((paint) => {
        const pigment = pigments.find((p) => p.id === paint.pigmentId)
        if (!pigment?.spectrum || paint.amount <= 0) return null
        return {
          spectrum: pigment.spectrum,
          volume: paint.amount,
        }
      })
      .filter(Boolean) as { spectrum: any; volume: number }[]

    if (components.length === 0) return null

    const mixedSpectrum = mixSpectra(components)
    const rgb = spectrumToRGB(mixedSpectrum)
    return {
      rgb,
      hex: rgbToHex(rgb),
    }
  }, [paints, pigments, totalAmount])

  // Добавить краску
  const addPaint = () => {
    setPaints([
      ...paints,
      {
        id: Date.now().toString(),
        pigmentId: pigments[0]?.id || 'titanium_white',
        amount: 10,
      },
    ])
  }

  // Удалить краску
  const removePaint = (id: string) => {
    if (paints.length <= 1) return
    setPaints(paints.filter((p) => p.id !== id))
  }

  // Обновить краску
  const updatePaint = (id: string, field: keyof PaintPart, value: string | number) => {
    setPaints(
      paints.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  // Получить название пигмента
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

      {/* Основной контент */}
      <div className="flex-1 flex flex-col gap-4">

        {/* Блок состава смеси */}
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
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D8A35C]"
                  >
                    {pigments.map((p) => (
                      <option key={p.id} value={p.id}>
                        {lang === 'uk' ? p.name.uk : p.name.ru}
                      </option>
                    ))}
                  </select>

                  {/* Объём */}
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={paint.amount || ''}
                    onChange={(e) =>
                      updatePaint(paint.id, 'amount', parseFloat(e.target.value) || 0)
                    }
                    className="w-20 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-[#D8A35C]"
                    placeholder="0"
                  />

                  <span className="text-xs opacity-50 w-6">мл</span>

                  {/* Удалить */}
                  <button
                    onClick={() => removePaint(paint.id)}
                    className="p-2 text-red-500 opacity-70 hover:opacity-100"
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

        {/* Блок результата */}
        <div className="bg-[#151210] text-[#F5F1EA] rounded-2xl p-6 shadow-md">
          {/* Большой цветной квадрат */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-32 h-32 rounded-2xl border-2 border-white/20 shadow-lg mb-3 transition-colors duration-300"
              style={{
                backgroundColor: mixedColor?.hex || '#333',
              }}
            />
            <div className="text-sm opacity-70">
              {mixedColor ? mixedColor.hex : '—'}
            </div>
          </div>

          {/* Общий объём */}
          <div className="flex justify-between items-end mb-4 border-b border-gray-700 pb-4">
            <span className="text-sm opacity-70">
              {lang === 'uk' ? 'Загальний об’єм:' : 'Общий объем:'}
            </span>
            <span className="text-2xl font-bold">
              {totalAmount.toFixed(1)} мл
            </span>
          </div>

          {/* Пропорции */}
          <div className="flex flex-col gap-2">
            {paints.map((paint) => {
              const percentage =
                totalAmount > 0
                  ? ((paint.amount / totalAmount) * 100).toFixed(1)
                  : '0.0'

              const pigment = pigments.find((p) => p.id === paint.pigmentId)

              return (
                <div key={paint.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 truncate pr-4">
                    {/* Маленький цветной кружок пигмента */}
                    <div
                      className="w-3 h-3 rounded-full border border-white/30 flex-shrink-0"
                      style={{ backgroundColor: pigment?.hex || '#666' }}
                    />
                    <span className="opacity-80 truncate">
                      {getPigmentName(paint.pigmentId)}
                    </span>
                  </div>
                  <span className="font-mono text-[#D8A35C]">{percentage}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
