import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { loadAllPigments } from '../data/loadPigments'
import { usePaintMix } from '../hooks/usePaintMix'
import { useColorCalculations } from '../hooks/useColorCalculations'
import { PigmentSelector } from '../components/PigmentSelector'

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const {
    paints,
    amountRefs,
    totalAmount,
    addPaint,
    removePaint,
    updatePaint,
    clearAllAmounts,
  } = usePaintMix(pigments)

  const { mixedColor } = useColorCalculations({
    pigments,
    paints,
    totalAmount,
    lang,
  })

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

  const copyHex = async () => {
    if (!mixedColor?.hex) return
    try {
      await navigator.clipboard.writeText(mixedColor.hex.toUpperCase())
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error(err)
    }
  }

  const isUk = lang === 'uk'

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen flex flex-col pt-safe px-4 pb-10"
    >
      {/* Header */}
      <div className="flex items-center mb-5 mt-4">
        <button
          onClick={onBack}
          className="p-2.5 -ml-2 text-[var(--color-ink)] opacity-70 hover:opacity-100"
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
        <h1 className="text-xl font-bold ml-1">
          {isUk ? 'Калькулятор кольору' : 'Калькулятор цвета'}
        </h1>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {/* ===== Блок смеси ===== */}
        <div className="bg-[var(--color-surface,#F5F1EA)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold opacity-80">
              {isUk ? 'Склад суміші' : 'Состав смеси'}
            </h2>
            {totalAmount > 0 && (
              <button
                onClick={clearAllAmounts}
                className="text-xs text-red-500/80 font-medium px-2 py-1 rounded-md hover:bg-red-50"
              >
                {isUk ? 'Очистити' : 'Очистить'}
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-sm opacity-60 py-6 text-center">
              {isUk ? 'Завантаження пігментів...' : 'Загрузка пигментов...'}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {paints.map((paint) => (
                <div key={paint.id} className="flex items-center gap-2">
                  <PigmentSelector
                    pigments={pigments}
                    value={paint.pigmentId}
                    onChange={(newId) => updatePaint(paint.id, 'pigmentId', newId)}
                    lang={lang}
                  />
                  <input
                    ref={(el) => {
                      if (el) amountRefs.current.set(paint.id, el)
                      else amountRefs.current.delete(paint.id)
                    }}
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={paint.amount}
                    onChange={(e) => {
                      let val = e.target.value.replace(',', '.')
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        const num = parseFloat(val)
                        if (!isNaN(num) && num > 5000) val = '5000'
                        updatePaint(paint.id, 'amount', val)
                      }
                    }}
                    onBlur={(e) => {
                      let val = e.target.value.replace(',', '.')
                      if (val === '.' || val === '') {
                        updatePaint(paint.id, 'amount', '')
                        return
                      }
                      const num = parseFloat(val)
                      if (!isNaN(num))
                        updatePaint(paint.id, 'amount', String(Math.min(num, 5000)))
                    }}
                    className="w-16 md:w-20 flex-shrink-0 bg-white text-black border border-gray-200 rounded-lg px-2 py-2.5 text-center focus:outline-none focus:border-[#D8A35C]"
                    placeholder="0"
                    style={{ fontSize: '16px' }}
                  />
                  <span className="text-xs opacity-50 flex-shrink-0 w-6">мл</span>
                  <button
                    onClick={() => removePaint(paint.id)}
                    className="p-2.5 -mr-1 text-red-500/70 hover:text-red-600 hover:bg-red-50 rounded-full"
                    disabled={paints.length <= 1}
                    style={{ opacity: paints.length <= 1 ? 0.3 : 1 }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M18 6L6 18M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addPaint}
            disabled={loading}
            className="mt-4 w-full py-3 rounded-xl border border-dashed border-[#D8A35C] text-[#D8A35C] text-sm font-medium hover:bg-[#D8A35C] hover:text-white transition-colors disabled:opacity-40"
          >
            {isUk ? '+ Додати пігмент' : '+ Добавить пигмент'}
          </button>
        </div>

        {/* ===== Результат смешивания ===== */}
        <div className="bg-[var(--color-surface,#F5F1EA)] rounded-2xl p-6 shadow-sm flex flex-col items-center">
          <div className="text-xs opacity-50 mb-4 font-medium uppercase tracking-wider">
            {isUk ? 'Результат змішування' : 'Результат смешивания'}
          </div>

          <div
            className="w-36 h-36 rounded-2xl border border-black/10 shadow-md mb-4"
            style={{ backgroundColor: mixedColor?.hex || '#E8E4DC' }}
          />

          {mixedColor ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-base font-medium tracking-wide">
                {mixedColor.hex.toUpperCase()}
              </span>
              <button
                onClick={copyHex}
                className="px-3 py-1.5 rounded-lg bg-black/5 text-xs font-medium hover:bg-black/10 transition-colors"
              >
                {copied ? '✓' : isUk ? 'Копіювати' : 'Копировать'}
              </button>
            </div>
          ) : (
            <span className="text-sm opacity-40">
              {isUk ? 'Введіть обсяги пігментів' : 'Введите объёмы пигментов'}
            </span>
          )}
        </div>

        {/* ===== Общий объём ===== */}
        <div className="bg-[var(--color-surface,#F5F1EA)] rounded-2xl px-4 py-4 shadow-sm flex justify-between items-center">
          <span className="text-sm opacity-60">
            {isUk ? 'Загальний об’єм суміші' : 'Общий объём смеси'}
          </span>
          <span className="text-xl font-bold tabular-nums">
            {totalAmount > 1000
              ? (totalAmount / 1000).toFixed(2) + ' л'
              : totalAmount.toFixed(1) + ' мл'}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
