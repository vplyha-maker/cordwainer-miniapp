import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { loadAllPigments } from '../data/loadPigments'
import { usePaintMix } from '../hooks/usePaintMix'
import { useColorCalculations } from '../hooks/useColorCalculations'
import { PigmentSelector } from '../components/PigmentSelector'
import { findRecipeByHex, getPureBasicPigments } from '../utils/calculatorLogic' 

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)
  const [isCalculating, setIsCalculating] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const [hexInput, setHexInput] = useState('')
  const [validHex, setValidHex] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  
  const userEdited = useRef(false)

  const {
    paints,
    amountRefs,
    totalAmount,
    addPaint,
    removePaint,
    updatePaint,
    clearAllAmounts,
    setPaints
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

  // Синхронизация квадрата результата при ручном смешивании
  useEffect(() => {
    if (mixedColor?.hex && !isFocused && !userEdited.current) {
      const hex = mixedColor.hex.toUpperCase()
      setHexInput(hex)
    }
    if (!mixedColor?.hex && !isFocused && !userEdited.current) {
      setHexInput('')
    }
  }, [mixedColor?.hex, isFocused])

  useEffect(() => {
    userEdited.current = false
  }, [paints, totalAmount])

  // === DEBOUNCE ЛОГИКА ===
  // Ждем 500мс после окончания ввода, чтобы не вешать браузер на каждом символе
  useEffect(() => {
    if (!userEdited.current) return;
    
    if (hexInput.length === 7) { 
      const timer = setTimeout(() => {
        setValidHex(hexInput.toUpperCase());
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setValidHex(null);
      setIsCalculating(false);
    }
  }, [hexInput]);


  // === Расчет рецепта по введенному HEX ===
  useEffect(() => {
    if (!validHex || !userEdited.current || pigments.length === 0 || loading) {
      setIsCalculating(false)
      return
    }

    setIsCalculating(true)
    
    // Асинхронный таймаут дает React отрендерить спиннер до тяжелой математики
    const calcTimer = setTimeout(() => {
      const basicPigments = getPureBasicPigments(pigments)
      
      // Передаем totalAmount, чтобы рецепт масштабировался под текущий объем (по умолчанию 20мл)
      const recipeData = findRecipeByHex(validHex, basicPigments, 3, totalAmount)

      if (recipeData && recipeData.recipe.length > 0 && setPaints) {
        const newPaints = recipeData.recipe.map((r) => ({
          id: Math.random().toString(36).substring(2, 9),
          pigmentId: r.pigment.id, 
          amount: String(r.ml)
        }))
        
        setPaints(newPaints)
      }
      setIsCalculating(false)
    }, 150)

    return () => clearTimeout(calcTimer)
  }, [validHex, pigments, loading, setPaints, totalAmount])

  const handleHexChange = (raw: string) => {
    userEdited.current = true
    let val = raw.replace(/[^0-9A-Fa-f]/gi, '').slice(0, 6)
    
    if (val.length === 0) {
      setHexInput('')
      setValidHex(null)
      return
    }
    
    setHexInput('#' + val)
  }

  const handleHexBlur = () => {
    setIsFocused(false)
    if (validHex) {
      setHexInput(validHex)
    } else if (mixedColor?.hex) {
      setHexInput(mixedColor.hex.toUpperCase())
      userEdited.current = false
    }
  }

  const copyHex = async () => {
    const colorToCopy = validHex || (mixedColor?.hex ? mixedColor.hex.toUpperCase() : null);
    if (!colorToCopy) return
    try {
      await navigator.clipboard.writeText(colorToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error(err)
    }
  }

  const isUk = lang === 'uk'
  
  // Квадрат показывает либо валидный введенный хекс, либо результат смешивания, либо дефолт
  const displayColor = validHex || (mixedColor?.hex ? mixedColor.hex.toUpperCase() : '#2A2522')
  const hasColor = Boolean(validHex || mixedColor?.hex)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="min-h-screen flex flex-col pt-safe px-4 pb-10"
    >
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

        <section className="bg-[#1C1816] rounded-2xl px-4 pt-4 pb-5">
          <h2 className="text-[13px] font-semibold text-[#F5F1EA]/90 mb-4">
            {isUk ? 'Результат' : 'Результат'}
          </h2>

          <div className="flex flex-col items-center">
            <div
              className="relative w-36 h-36 rounded-2xl border border-white/10 shadow-lg mb-4 transition-colors duration-150 overflow-hidden"
              style={{ backgroundColor: displayColor }}
            >
              {isCalculating && (
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-opacity">
                   <svg className="animate-spin w-8 h-8 text-white mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   <span className="text-[10px] text-white/90 font-medium">
                     {isUk ? 'Рахуємо...' : 'Считаем...'}
                   </span>
                </div>
              )}
            </div>

            <div className="w-full flex items-center gap-2">
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={hexInput}
                onFocus={() => setIsFocused(true)}
                onBlur={handleHexBlur}
                onChange={(e) => handleHexChange(e.target.value)}
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
              {hasColor
                ? isUk
                  ? 'Введіть код — квадрат оновиться одразу'
                  : 'Введите код — квадрат обновится сразу'
                : isUk
                  ? 'Вкажіть обсяги або введіть HEX'
                  : 'Укажите объёмы или введите HEX'}
            </p>
          </div>
        </section>

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
