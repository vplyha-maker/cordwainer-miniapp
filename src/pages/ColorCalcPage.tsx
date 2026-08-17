import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

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

function normalizeHex(raw: string): string | null {
  let v = raw.trim().replace(/^#/, '').toUpperCase()
  
  // Если введено 3 символа, удваиваем их (например, F00 -> FF0000)
  if (/^[0-9A-F]{3}$/.test(v)) {
    v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2]
  }
  
  // Если получилось 6 символов, возвращаем с решеткой
  if (/^[0-9A-F]{6}$/.test(v)) {
    return `#${v}`
  }
  
  return null
}

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)
  const [isMatching, setIsMatching] = useState(false) // Состояние загрузки при подборе по HEX
  const [copied, setCopied] = useState(false)
  const [hexInput, setHexInput] = useState('')
  const [validHex, setValidHex] = useState<string | null>(null)
  
  const userEdited = useRef(false)
  const isInternalUpdate = useRef(false) // Защита от зацикливания при программном изменении рецепта

  const {
    paints,
    amountRefs,
    totalAmount,
    addPaint,
    removePaint,
    updatePaint,
    clearAllAmounts,
    setAllPaints, // Функция должна быть добавлена в usePaintMix для массовой установки рецепта
  } = usePaintMix(pigments)

  const { mixedColor, findRecipeForHex } = useColorCalculations({
    pigments,
    paints,
    totalAmount,
    lang,
  })

  // Смесь изменилась → подставляем её HEX (если пользователь не редактировал вручную)
  useEffect(() => {
    if (isInternalUpdate.current) return

    if (mixedColor?.hex && !userEdited.current) {
      const hex = mixedColor.hex.toUpperCase()
      setHexInput(hex)
      setValidHex(hex)
    }
    if (!mixedColor?.hex && !userEdited.current) {
      setHexInput('')
      setValidHex(null)
    }
  }, [mixedColor?.hex])

  // При изменении объёмов/пигментов снова доверяем смеси (если это не внутренний подбор)
  useEffect(() => {
    if (!isInternalUpdate.current) {
      userEdited.current = false
    }
  }, [paints, totalAmount])

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

  // Обработка ввода HEX и запуск обратного расчета
  const handleHexChange = async (raw: string) => {
    userEdited.current = true
    const cleaned = raw.replace(/[^#0-9A-Fa-f]/g, '').slice(0, 7)
    setHexInput(cleaned)
    
    const normalized = normalizeHex(cleaned)
    if (normalized) {
      setValidHex(normalized)
      
      // Запускаем физический подбор рецепта по введенному HEX
      if (pigments.length > 0 && setAllPaints) {
        setIsMatching(true)
        try {
          const recipe = await findRecipeForHex(normalized)
          if (recipe && recipe.length > 0) {
            isInternalUpdate.current = true
            setAllPaints(recipe)
            // Сбрасываем флаг внутренней защиты после завершения рендеринга
            setTimeout(() => {
              isInternalUpdate.current = false
            }, 100)
          }
        } catch (err) {
          console.error("Ошибка подбора рецепта:", err)
        } finally {
          setIsMatching(false)
        }
      }
    } else {
      setValidHex(null)
    }
  }

  const handleHexBlur = () => {
    if (validHex) setHexInput(validHex)
  }

  const copyHex = async () => {
    if (!validHex) return
    try {
      await navigator.clipboard.writeText(validHex)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error(err)
    }
  }

  const isUk = lang === 'uk'
  const displayColor = validHex || '#2A2522'
  const hasColor = Boolean(validHex)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="min-h-screen flex flex-col pt-safe px-4 pb-10"
    >
      {/* Header */}
      <header className="flex items-center gap-1 py-3">
        <button
          onClick={onBack}
          className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-[var(--color-ink)] opacity-70 active:opacity-100"
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
        <h1 className="text-[17px] font-semibold tracking-tight text-[var(--color-ink)]">
          {isUk ? 'Калькулятор кольору' : 'Калькулятор цвета'}
        </h1>
      </header>

      <div className="flex-1 flex flex-col gap-4 mt-1">

        {/* ===== Состав смеси ===== */}
        <section className="bg-[#1C1816] rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-[#F5F1EA]/90">
              {isUk ? 'Склад суміші' : 'Состав смеси'}
            </h2>
            {totalAmount > 0 && (
              <button
                onClick={clearAllAmounts}
                className="text-[12px] font-medium text-red-400/90 px-2 py-1 -mr-1 rounded-lg active:bg-white/5"
              >
                {isUk ? 'Очистити' : 'Очистить'}
              </button>
            )}
          </div>

          <div className="px-4 pb-4">
            {loading ? (
              <div className="py-8 text-center text-[13px] text-[#F5F1EA]/40">
                {isUk ? 'Завантаження…' : 'Загрузка…'}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {paints.map((paint) => (
                  <div key={paint.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <PigmentSelector
                        pigments={pigments}
                        value={paint.pigmentId}
                        onChange={(newId) => updatePaint(paint.id, 'pigmentId', newId)}
                        lang={lang}
                      />
                    </div>

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
                      className="w-[64px] flex-shrink-0 bg-white/10 text-[#F5F1EA] border-0 rounded-xl px-2 py-3 text-center font-medium focus:outline-none focus:ring-2 focus:ring-[#D8A35C]/50"
                      placeholder="0"
                      style={{ fontSize: '16px' }}
                    />
                    <span className="text-[12px] text-[#F5F1EA]/40 w-5 flex-shrink-0">мл</span>

                    <button
                      onClick={() => removePaint(paint.id)}
                      disabled={paints.length <= 1}
                      className="w-10 h-10 -mr-1 flex items-center justify-center rounded-full text-[#F5F1EA]/30 active:bg-white/5 disabled:opacity-20"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              className="mt-4 w-full py-3.5 rounded-xl border border-dashed border-[#D8A35C]/50 text-[#D8A35C] text-[14px] font-medium active:bg-[#D8A35C]/10 disabled:opacity-40"
            >
              {isUk ? '+ Додати пігмент' : '+ Добавить пигмент'}
            </button>
          </div>
        </section>

        {/* ===== Результат ===== */}
        <section className="bg-[#1C1816] rounded-2xl px-4 pt-4 pb-5">
          <h2 className="text-[13px] font-semibold text-[#F5F1EA]/90 mb-4">
            {isUk ? 'Результат' : 'Результат'}
          </h2>

          <div className="flex flex-col items-center">
            <div
              className="w-36 h-36 rounded-2xl border border-white/10 shadow-lg mb-4 transition-colors duration-150 relative flex items-center justify-center"
              style={{ backgroundColor: displayColor }}
            >
              {/* Спиннер во время подбора цвета */}
              {isMatching && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-xs rounded-2xl flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#D8A35C] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* HEX + копировать — в одну линию без переполнения */}
            <div className="w-full flex items-center gap-2">
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                onBlur={handleHexBlur}
                placeholder="#000000"
                className="flex-1 min-w-0 bg-white/10 text-[#F5F1EA] border-0 rounded-xl px-3 py-3 text-center font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#D8A35C]/50"
                style={{ fontSize: '16px' }}
              />
              <button
                onClick={copyHex}
                disabled={!hasColor}
                className="flex-shrink-0 h-12 px-4 rounded-xl bg-[#D8A35C] text-black text-[13px] font-semibold disabled:opacity-35 active:scale-[0.97]"
              >
                {copied ? '✓' : isUk ? 'Копіювати' : 'Копир.'}
              </button>
            </div>

            <p className="mt-2.5 text-[12px] text-center text-[#F5F1EA]/35">
              {isMatching
                ? isUk
                  ? 'Підбираємо пропорції пігментів…'
                  : 'Подбираем пропорции пигментов…'
                : hasColor
                  ? isUk
                    ? 'Змінюйте код — калькулятор підбере рецепт'
                    : 'Меняйте код — калькулятор подберет рецепт'
                  : isUk
                    ? 'Вкажіть обсяги або введіть HEX'
                    : 'Укажите объёмы или введите HEX'}
            </p>
          </div>
        </section>

        {/* ===== Объём — сразу под результатом ===== */}
        <section className="bg-[#1C1816] rounded-2xl px-4 py-3.5 flex items-center justify-between">
          <span className="text-[14px] text-[#F5F1EA]/50">
            {isUk ? 'Загальний об’єм' : 'Общий объём'}
          </span>
          <span className="text-[17px] font-semibold tabular-nums text-[#F5F1EA]">
            {totalAmount > 1000
              ? `${(totalAmount / 1000).toFixed(2)} л`
              : `${totalAmount.toFixed(1)} мл`}
          </span>
        </section>
      </div>
    </motion.div>
  )
}
