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
  const [loadError, setLoadError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showCopyFallback, setShowCopyFallback] = useState(false)

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
  })

  const isUk = lang === 'uk'
  const displayHex = mixedColor?.hex
    ? mixedColor.hex.toUpperCase()
    : null
  const squareColor = displayHex || '#2A2522'

  const loadPigments = () => {
    setLoading(true)
    setLoadError(false)
    loadAllPigments()
      .then((loaded) => {
        setPigments(loaded)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
        setLoadError(true)
      })
  }

  useEffect(() => {
    loadPigments()
  }, [])

  const copyHex = async () => {
    if (!displayHex) return
    if (!navigator.clipboard) {
      setShowCopyFallback(true)
      return
    }
    try {
      await navigator.clipboard.writeText(displayHex)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setShowCopyFallback(true)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="min-h-screen flex flex-col pt-safe px-4 pb-10"
      style={{
        background: 'var(--color-bg, #1C1816)',
        color: 'var(--color-ink, #F5F1EA)',
      }}
    >
      <header className="flex items-center gap-1 py-3">
        <button
          onClick={onBack}
          className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full opacity-70 active:opacity-100"
          style={{ color: 'var(--color-ink, #F5F1EA)' }}
          aria-label="Back"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1
          className="flex-1 text-[17px] font-semibold tracking-tight"
          style={{ color: 'var(--color-ink, #F5F1EA)' }}
        >
          {isUk ? 'Калькулятор кольору' : 'Калькулятор цвета'}
        </h1>
      </header>

      <div className="flex-1 flex flex-col gap-4 mt-1">
        {/* Состав */}
        <section
          className="rounded-2xl overflow-visible relative z-10"
          style={{ background: 'var(--color-surface, #25201C)' }}
        >
          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
            <h2
              className="text-[13px] font-semibold"
              style={{
                color:
                  'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)',
              }}
            >
              {isUk ? 'Склад суміші' : 'Состав смеси'}
            </h2>
            {totalAmount > 0 && (
              <button
                onClick={clearAllAmounts}
                className="text-[12px] font-medium px-2 py-1 -mr-1 rounded-lg"
                style={{ color: 'var(--color-danger, #f87171)' }}
              >
                {isUk ? 'Очистити' : 'Очистить'}
              </button>
            )}
          </div>

          <div className="px-4 pb-4">
            {loading ? (
              <div
                className="py-8 text-center text-[13px]"
                style={{
                  color:
                    'color-mix(in srgb, var(--color-ink, #F5F1EA) 40%, transparent)',
                }}
              >
                {isUk ? 'Завантаження…' : 'Загрузка…'}
              </div>
            ) : loadError ? (
              <div className="py-6 flex flex-col items-center gap-3">
                <p
                  className="text-[13px] text-center"
                  style={{ color: 'var(--color-danger, #f87171)' }}
                >
                  {isUk
                    ? 'Помилка завантаження пігментів'
                    : 'Ошибка загрузки пигментов'}
                </p>
                <button
                  onClick={loadPigments}
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold active:scale-[0.97]"
                  style={{
                    background: 'var(--color-accent, #D8A35C)',
                    color: 'var(--color-bg, #1C1816)',
                  }}
                >
                  {isUk ? 'Спробувати знову' : 'Повторить'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {paints.map((paint) => (
                  <div
                    key={paint.id}
                    className="flex items-center gap-2 p-2 rounded-2xl"
                    style={{
                      background:
                        'color-mix(in srgb, var(--color-ink, #F5F1EA) 4%, transparent)',
                      border:
                        '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                    }}
                  >
                    {/* Селектор */}
                    <div
                      className="flex-1 min-w-0 pr-1"
                      style={{
                        borderRight:
                          '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                      }}
                    >
                      {pigments.length === 0 ? (
                        <div
                          className="h-10 rounded-xl animate-pulse"
                          style={{
                            background:
                              'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                          }}
                        />
                      ) : (
                        <PigmentSelector
                          pigments={pigments}
                          value={paint.pigmentId}
                          onChange={(newId) =>
                            updatePaint(paint.id, 'pigmentId', newId)
                          }
                          lang={lang}
                        />
                      )}
                    </div>

                    {/* Объём */}
                    <div className="flex items-center gap-1 w-[70px] flex-shrink-0">
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
                          if (!isNaN(num)) {
                            updatePaint(
                              paint.id,
                              'amount',
                              String(Math.min(num, 5000))
                            )
                          }
                        }}
                        className="w-full bg-transparent border-0 text-right font-semibold focus:outline-none p-0"
                        placeholder="0"
                        style={{
                          fontSize: '16px',
                          color: 'var(--color-ink, #F5F1EA)',
                        }}
                      />
                      <span
                        className="text-[12px] font-medium flex-shrink-0"
                        style={{
                          color:
                            'color-mix(in srgb, var(--color-ink, #F5F1EA) 40%, transparent)',
                        }}
                      >
                        мл
                      </span>
                    </div>

                    {/* Удалить */}
                    <button
                      onClick={() => removePaint(paint.id)}
                      disabled={paints.length <= 1}
                      className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 disabled:opacity-15 active:bg-white/10"
                      style={{
                        color:
                          'color-mix(in srgb, var(--color-ink, #F5F1EA) 28%, transparent)',
                      }}
                      aria-label="Remove"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
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
              disabled={loading || loadError}
              className="mt-3.5 w-full py-3 rounded-xl text-[14px] font-medium disabled:opacity-40"
              style={{
                border:
                  '1px dashed color-mix(in srgb, var(--color-accent, #D8A35C) 45%, transparent)',
                color: 'var(--color-accent, #D8A35C)',
              }}
            >
              {isUk ? '+ Додати пігмент' : '+ Добавить пигмент'}
            </button>
          </div>
        </section>

        {/* Результат */}
        <section
          className="rounded-2xl px-4 pt-4 pb-5"
          style={{ background: 'var(--color-surface, #25201C)' }}
        >
          <h2
            className="text-[13px] font-semibold mb-4"
            style={{
              color:
                'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)',
            }}
          >
            {isUk ? 'Результат' : 'Результат'}
          </h2>

          <div className="flex flex-col items-center">
            <div
              className="w-36 h-36 rounded-2xl shadow-lg mb-4"
              style={{
                backgroundColor: squareColor,
                border:
                  '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)',
              }}
            />

            <div className="w-full flex items-center gap-2">
              <div
                className="flex-1 min-w-0 rounded-xl px-3 py-3 text-center font-mono tracking-wider"
                style={{
                  fontSize: '16px',
                  background:
                    'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                  color: 'var(--color-ink, #F5F1EA)',
                }}
              >
                {displayHex || '#------'}
              </div>
              <button
                onClick={copyHex}
                disabled={!displayHex}
                className="flex-shrink-0 h-12 px-4 rounded-xl text-[13px] font-semibold disabled:opacity-35 active:scale-[0.97]"
                style={{
                  background: 'var(--color-accent, #D8A35C)',
                  color: 'var(--color-bg, #1C1816)',
                }}
              >
                {copied ? 'OK' : isUk ? 'Копіювати' : 'Копировать'}
              </button>
            </div>

            <p
              className="mt-2.5 text-[12px] text-center"
              style={{
                color:
                  'color-mix(in srgb, var(--color-ink, #F5F1EA) 35%, transparent)',
              }}
            >
              {displayHex
                ? isUk
                  ? 'HEX суміші — лише для копіювання'
                  : 'HEX смеси — только для копирования'
                : isUk
                  ? 'Додайте пігменти та обсяги'
                  : 'Добавьте пигменты и объёмы'}
            </p>
          </div>
        </section>

        {/* Объём */}
        <section
          className="rounded-2xl px-4 py-3.5"
          style={{ background: 'var(--color-surface, #25201C)' }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[14px] font-medium"
              style={{
                color:
                  'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)',
              }}
            >
              {isUk ? 'Загальний об’єм' : 'Общий объём'}
            </span>
            <span
              className="text-[17px] font-semibold tabular-nums"
              style={{ color: 'var(--color-ink, #F5F1EA)' }}
            >
              {totalAmount > 1000
                ? (totalAmount / 1000).toFixed(2) + ' л'
                : totalAmount.toFixed(1) + ' мл'}
            </span>
          </div>
        </section>
      </div>

      {showCopyFallback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{
            background:
              'color-mix(in srgb, var(--color-bg, #1C1816) 60%, transparent)',
          }}
        >
          <div
            className="rounded-2xl p-5 w-full max-w-sm"
            style={{
              background: 'var(--color-surface, #25201C)',
              border:
                '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 12%, transparent)',
            }}
          >
            <p
              className="text-[14px] mb-3 text-center"
              style={{ color: 'var(--color-ink, #F5F1EA)' }}
            >
              {isUk
                ? 'Буфер обміну недоступний. Виділіть і скопіюйте:'
                : 'Буфер обмена недоступен. Выделите и скопируйте:'}
            </p>
            <input
              type="text"
              readOnly
              value={displayHex || ''}
              className="w-full rounded-xl px-3 py-3 text-center font-mono tracking-wider mb-4"
              style={{
                background:
                  'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                color: 'var(--color-ink, #F5F1EA)',
              }}
              onFocus={(e) => e.target.select()}
              autoFocus
            />
            <button
              onClick={() => setShowCopyFallback(false)}
              className="w-full py-3 rounded-xl text-[14px] font-semibold"
              style={{
                background: 'var(--color-accent, #D8A35C)',
                color: 'var(--color-bg, #1C1816)',
              }}
            >
              {isUk ? 'Закрити' : 'Закрыть'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
