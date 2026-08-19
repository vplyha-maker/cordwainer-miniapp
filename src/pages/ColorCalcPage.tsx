import { motion } from 'framer-motion'
import { useState, useEffect, useRef, useMemo } from 'react'

import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { loadAllPigments } from '../data/loadPigments'
import { usePaintMix } from '../hooks/usePaintMix'
import { useColorCalculations } from '../hooks/useColorCalculations'
import { PigmentSelector } from '../components/PigmentSelector'
import { ColorMethodology } from '../components/ColorMethodology'
import {
  spectrumToRGB,
  rgbToHex,
  type SpectrumPoint,
} from '../utils/colorScience'
import {
  simulateLayersKM,
  hexToRgbObj,
  type CoverageSystem,
} from '../utils/calculatorLogic'

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const BINDER_RATIO = 0.2

function rgbToLab(r: number, g: number, b: number) {
  let r_ = r / 255
  let g_ = g / 255
  let b_ = b / 255
  r_ = r_ > 0.04045 ? Math.pow((r_ + 0.055) / 1.055, 2.4) : r_ / 12.92
  g_ = g_ > 0.04045 ? Math.pow((g_ + 0.055) / 1.055, 2.4) : g_ / 12.92
  b_ = b_ > 0.04045 ? Math.pow((b_ + 0.055) / 1.055, 2.4) : b_ / 12.92
  let x = (r_ * 0.4124 + g_ * 0.3576 + b_ * 0.1805) * 100
  let y = (r_ * 0.2126 + g_ * 0.7152 + b_ * 0.0722) * 100
  let z = (r_ * 0.0193 + g_ * 0.1192 + b_ * 0.9505) * 100
  x /= 95.047
  y /= 100.0
  z /= 108.883
  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) }
}

function deltaE76(hex1: string, hex2: string): number {
  const a = hexToRgbObj(hex1)
  const b = hexToRgbObj(hex2)
  const lab1 = rgbToLab(a.r, a.g, a.b)
  const lab2 = rgbToLab(b.r, b.g, b.b)
  return Math.sqrt(
    Math.pow(lab1.L - lab2.L, 2) +
      Math.pow(lab1.a - lab2.a, 2) +
      Math.pow(lab1.b - lab2.b, 2)
  )
}

function deltaEQuality(de: number, isUk: boolean): string {
  if (de < 1)
    return isUk ? 'Відмінно — око майже не бачить різниці' : 'Отлично — глаз почти не видит разницы'
  if (de < 2)
    return isUk ? 'Дуже добре — різниця ледь помітна' : 'Очень хорошо — разница едва заметна'
  if (de < 3.5)
    return isUk ? 'Прийнятно для майстерні' : 'Приемлемо для мастерской'
  if (de < 5)
    return isUk ? 'Помітна різниця — краще уточнити' : 'Заметная разница — лучше уточнить'
  return isUk ? 'Велика різниця — потрібен інший рецепт' : 'Большая разница — нужен другой рецепт'
}

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showCopyFallback, setShowCopyFallback] = useState(false)
  const [showMethod, setShowMethod] = useState(false)
  const [showDeltaInfo, setShowDeltaInfo] = useState(false)

  const [system, setSystem] = useState<CoverageSystem>('acrylic')
  const [anilineLayer, setAnilineLayer] = useState<1 | 2 | 3>(1)

  const [hexInput, setHexInput] = useState('')
  const [validHex, setValidHex] = useState<string | null>(null)
  const [hexError, setHexError] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const [targetHex, setTargetHex] = useState<string | null>(null)
  const [recipeDeltaE, setRecipeDeltaE] = useState<number | null>(null)

  const lastTargetHex = useRef<string | null>(null)
  const fromRecipeRef = useRef(false)
  const userEdited = useRef(false)
  const calcRef = useRef(0)
  const workerRef = useRef<Worker | null>(null)
  const currentExcludeRef = useRef<string[]>([])

  const {
    paints,
    amountRefs,
    totalAmount,
    addPaint,
    removePaint,
    updatePaint,
    clearAllAmounts,
    setPaints,
  } = usePaintMix(pigments)

  const { mixedColor } = useColorCalculations({
    pigments,
    paints,
    totalAmount,
    lang,
  })

  const binderMl = useMemo(() => {
    if (system !== 'acrylic' || totalAmount <= 0) return 0
    return Math.round(totalAmount * BINDER_RATIO * 10) / 10
  }, [system, totalAmount])

  const grandTotal = totalAmount + binderMl

  const actualHex = mixedColor?.hex ? mixedColor.hex.toUpperCase() : null

  const liveDeltaE = useMemo(() => {
    if (!targetHex || !actualHex) return recipeDeltaE
    try {
      return Math.round(deltaE76(targetHex, actualHex) * 10) / 10
    } catch {
      return recipeDeltaE
    }
  }, [targetHex, actualHex, recipeDeltaE])

  const leatherBaseSpectrum = useMemo((): SpectrumPoint[] => {
    const points: SpectrumPoint[] = []
    for (let wl = 380; wl <= 780; wl += 5) {
      const t = (wl - 380) / 400
      const refl = 45 + t * 25 + Math.sin(t * Math.PI) * 8
      points.push({
        wavelength: wl,
        reflectance: Math.min(85, Math.max(25, refl)),
      })
    }
    return points
  }, [])

  const anilineLayerColors = useMemo(() => {
    if (system !== 'aniline' || !mixedColor?.spectrum) {
      return {
        layer1: null as string | null,
        layer2: null as string | null,
        layer3: null as string | null,
      }
    }
    const sim = simulateLayersKM(
      leatherBaseSpectrum,
      mixedColor.spectrum,
      'aniline'
    )
    const toHex = (spec: SpectrumPoint[]) =>
      rgbToHex(spectrumToRGB(spec)).toUpperCase()
    return {
      layer1: toHex(sim.layer1),
      layer2: toHex(sim.layer2),
      layer3: toHex(sim.layer3),
    }
  }, [system, mixedColor, leatherBaseSpectrum])

  const squareColor = useMemo(() => {
    if (isCalculating && (validHex || lastTargetHex.current)) {
      return (validHex || lastTargetHex.current)!
    }
    if (system === 'aniline' && mixedColor?.spectrum) {
      if (anilineLayer === 1) return anilineLayerColors.layer1 || '#2A2522'
      if (anilineLayer === 2) return anilineLayerColors.layer2 || '#2A2522'
      return anilineLayerColors.layer3 || '#2A2522'
    }
    if (actualHex) return actualHex
    if (userEdited.current && validHex) return validHex
    return validHex || lastTargetHex.current || '#2A2522'
  }, [
    isCalculating,
    validHex,
    system,
    mixedColor,
    anilineLayer,
    anilineLayerColors,
    actualHex,
  ])

  const anilineOpacity =
    system === 'aniline' && mixedColor
      ? anilineLayer === 1
        ? 0.55
        : anilineLayer === 2
          ? 0.75
          : 0.92
      : 1

  const loadPigments = () => {
    setLoading(true)
    setLoadError(false)
    loadAllPigments()
      .then((loaded) => {
        setPigments(loaded)
        setLoading(false)
        setLoadError(false)
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

  // ===== WORKER створюється ОДИН раз =====
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/recipeWorker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e: MessageEvent) => {
      const { id, result, error } = e.data
      if (id !== calcRef.current) return

      if (error) {
        console.error('Worker error:', error)
        setIsCalculating(false)
        return
      }

      if (result?.recipe?.length > 0 && setPaints) {
        fromRecipeRef.current = true
        const tgt = lastTargetHex.current
        setTargetHex(tgt)
        setRecipeDeltaE(
          typeof result.deltaE === 'number' ? result.deltaE : null
        )

        const newPaints = result.recipe
          .filter(
            (r: { pigment: { id: string } }) =>
              r.pigment.id !== 'acrylic_binder'
          )
          .map((r: { pigment: { id: string }; ml: number }) => ({
            id: generateId(),
            pigmentId: r.pigment.id,
            amount: String(Math.round(r.ml * 100) / 100),
          }))
        setPaints(newPaints)

        if (result.resultHex) {
          setHexInput(String(result.resultHex).toUpperCase())
        }

        // після успішного рецепту скидаємо exclude
        currentExcludeRef.current = []
      }

      setIsCalculating(false)
    }

    worker.onerror = () => setIsCalculating(false)
    workerRef.current = worker

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [setPaints]) // ← тільки setPaints

  // Синхронізація HEX при ручному змішуванні
  useEffect(() => {
    if (fromRecipeRef.current) return
    if (mixedColor?.hex && !isFocused && !userEdited.current) {
      setHexInput(mixedColor.hex.toUpperCase())
    }
    if (!mixedColor?.hex && !isFocused && !userEdited.current) {
      setHexInput('')
    }
  }, [mixedColor?.hex, isFocused])

  useEffect(() => {
    if (fromRecipeRef.current) {
      fromRecipeRef.current = false
      userEdited.current = false
      setValidHex(null)
      return
    }
    // ручна зміна суміші — скидаємо ціль
    userEdited.current = false
    setValidHex(null)
    if (!isFocused) {
      setTargetHex(null)
      setRecipeDeltaE(null)
    }
  }, [paints, totalAmount])

  useEffect(() => {
    if (!userEdited.current) return
    if (hexInput.length === 7) {
      const isValid = /^#[0-9A-Fa-f]{6}$/.test(hexInput)
      if (isValid) {
        setHexError(false)
        const timer = setTimeout(() => {
          setValidHex(hexInput.toUpperCase())
        }, 500)
        return () => clearTimeout(timer)
      } else {
        setHexError(true)
        setValidHex(null)
        setIsCalculating(false)
      }
    } else {
      setHexError(hexInput.length > 0 && hexInput.length < 7)
      setValidHex(null)
      setIsCalculating(false)
    }
  }, [hexInput])

  // Головний запуск пошуку рецепту
  useEffect(() => {
    if (!validHex || !userEdited.current || pigments.length === 0 || loading) {
      setIsCalculating(false)
      return
    }
    if (!workerRef.current) return

    const id = ++calcRef.current
    setIsCalculating(true)
    lastTargetHex.current = validHex
    setTargetHex(validHex)

    workerRef.current.postMessage({
      id,
      targetHex: validHex,
      basicPigments: pigments,
      maxComponents: 3,
      targetVolume: totalAmount > 0 ? totalAmount : 20,
      system,
      excludeIds: currentExcludeRef.current,
    })
  }, [validHex, pigments, loading, totalAmount, system])

  // ===== УТОЧНИТИ РЕЦЕПТ =====
  const runRefine = () => {
    const tgt = targetHex || lastTargetHex.current
    if (!tgt || !workerRef.current || pigments.length === 0) return

    // Виключаємо поточні пігменти, щоб алгоритм шукав інші
    const currentIds = paints
      .map((p) => p.pigmentId)
      .filter(Boolean) as string[]

    currentExcludeRef.current = currentIds

    const id = ++calcRef.current
    setIsCalculating(true)
    userEdited.current = true
    lastTargetHex.current = tgt
    setValidHex(tgt)

    // Відразу відправляємо з maxComponents: 4 + exclude
    workerRef.current.postMessage({
      id,
      targetHex: tgt,
      basicPigments: pigments,
      maxComponents: 4,
      targetVolume: totalAmount > 0 ? totalAmount : 20,
      system,
      excludeIds: currentIds,
    })
  }

  const handleHexChange = (raw: string) => {
    userEdited.current = true
    currentExcludeRef.current = [] // новий HEX — скидаємо exclude
    const val = raw.replace(/[^0-9A-Fa-f]/gi, '').slice(0, 6)
    if (val.length === 0) {
      setHexInput('')
      setValidHex(null)
      setHexError(false)
      lastTargetHex.current = null
      setTargetHex(null)
      setRecipeDeltaE(null)
      return
    }
    setHexInput('#' + val)
  }

  const handleHexBlur = () => {
    setIsFocused(false)
    if (validHex) setHexInput(validHex)
    else if (actualHex && !userEdited.current) setHexInput(actualHex)
    else if (hexInput && !/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
      setHexError(true)
    }
  }

  const copyHex = async () => {
    const colorToCopy =
      actualHex ||
      hexInput ||
      (userEdited.current && validHex) ||
      validHex
    if (!colorToCopy) return
    if (!navigator.clipboard) {
      setShowCopyFallback(true)
      return
    }
    try {
      await navigator.clipboard.writeText(colorToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setShowCopyFallback(true)
    }
  }

  const isUk = lang === 'uk'
  const layerWord = isUk ? ' шар' : ' слой'

  const hasColor = Boolean(
    hexInput || actualHex || validHex || lastTargetHex.current
  )

  const systemLabel =
    system === 'aniline'
      ? isUk
        ? 'Анілінова система'
        : 'Анилиновая система'
      : isUk
        ? 'Акрилова / пігментна'
        : 'Акриловая / пигментная'

  const systemHint =
    system === 'aniline'
      ? isUk
        ? 'Прозорі барвники, слабке укриття. Краще 2–3 тонкі шари.'
        : 'Прозрачные красители, слабое укрытие. Лучше 2–3 тонких слоя.'
      : isUk
        ? 'Криючі пігменти + біндер. Сильне укриття, один шар часто достатній.'
        : 'Кроющие пигменты + биндер. Сильное укрытие, часто хватает одного слоя.'

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

        <h1 className="flex-1 text-[17px] font-semibold tracking-tight text-[var(--color-ink)] truncate">
          {isUk ? 'Калькулятор кольору' : 'Калькулятор цвета'}
        </h1>

        <button
          type="button"
          onClick={() => setShowMethod(true)}
          className="h-9 px-3 rounded-full border border-[#C4A35A]/45 text-[#C4A35A] text-[12px] font-semibold active:bg-[#C4A35A]/15 flex-shrink-0"
        >
          {isUk ? 'Методологія' : 'Методология'}
        </button>
      </header>

      <div className="flex-1 flex flex-col gap-4 mt-1">
        {/* Система */}
        <section className="bg-[#1C1816] rounded-2xl px-4 py-3.5">
          <h2 className="text-[13px] font-semibold text-[#F5F1EA]/90 mb-3">
            {isUk ? 'Система фарбування' : 'Система крашения'}
          </h2>
          <div className="flex gap-2 p-1 bg-black/30 rounded-xl">
            <button
              type="button"
              onClick={() => setSystem('aniline')}
              className={
                'flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-colors ' +
                (system === 'aniline'
                  ? 'bg-[#D8A35C] text-black'
                  : 'text-[#F5F1EA]/60 active:bg-white/5')
              }
            >
              {isUk ? 'Анілін' : 'Анилин'}
            </button>
            <button
              type="button"
              onClick={() => setSystem('acrylic')}
              className={
                'flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-colors ' +
                (system === 'acrylic'
                  ? 'bg-[#D8A35C] text-black'
                  : 'text-[#F5F1EA]/60 active:bg-white/5')
              }
            >
              {isUk ? 'Акрил / пігмент' : 'Акрил / пигмент'}
            </button>
          </div>
          <p className="mt-2.5 text-[12px] leading-snug text-[#F5F1EA]/45">
            {systemHint}
          </p>
        </section>

        {/* Склад */}
        <section className="bg-[#1C1816] rounded-2xl overflow-visible relative z-10">
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
            ) : loadError ? (
              <div className="py-6 flex flex-col items-center gap-3">
                <p className="text-[13px] text-red-400/90 text-center">
                  {isUk
                    ? 'Помилка завантаження пігментів'
                    : 'Ошибка загрузки пигментов'}
                </p>
                <button
                  onClick={loadPigments}
                  className="px-4 py-2 rounded-xl bg-[#D8A35C] text-black text-[13px] font-semibold active:scale-[0.97]"
                >
                  {isUk ? 'Спробувати знову' : 'Повторить'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {paints.map((paint) => (
                  <div key={paint.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      {pigments.length === 0 ? (
                        <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
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
                          updatePaint(
                            paint.id,
                            'amount',
                            String(Math.min(num, 5000))
                          )
                      }}
                      className="w-[64px] flex-shrink-0 bg-white/10 text-[#F5F1EA] border-0 rounded-xl px-2 py-3 text-center font-medium focus:outline-none focus:ring-2 focus:ring-[#D8A35C]/50"
                      placeholder="0"
                      style={{ fontSize: '16px' }}
                    />
                    <span className="text-[12px] text-[#F5F1EA]/40 w-5 flex-shrink-0">
                      мл
                    </span>
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

                {system === 'acrylic' && totalAmount > 0 && (
                  <div className="flex items-center gap-2 mt-1 pt-3 border-t border-dashed border-[#D8A35C]/30">
                    <div className="flex-1 min-w-0 rounded-xl px-3 py-2.5 bg-[#D8A35C]/15 border border-[#D8A35C]/35">
                      <p className="text-[13px] font-semibold text-[#D8A35C]">
                        {isUk ? 'Акриловий біндер' : 'Акриловый биндер'}
                      </p>
                      <p className="text-[10px] text-[#F5F1EA]/45 mt-0.5">
                        {isUk ? 'авто: 20% від пігментів' : 'авто: 20% от пигментов'}
                      </p>
                    </div>
                    <div className="w-[64px] flex-shrink-0 bg-[#D8A35C]/20 text-[#D8A35C] rounded-xl px-2 py-3 text-center font-semibold text-[15px]">
                      {binderMl}
                    </div>
                    <span className="text-[12px] text-[#D8A35C]/70 w-5 flex-shrink-0">
                      мл
                    </span>
                    <div className="w-10 flex-shrink-0" />
                  </div>
                )}
              </div>
            )}

            <button
              onClick={addPaint}
              disabled={loading || loadError}
              className="mt-4 w-full py-3.5 rounded-xl border border-dashed border-[#D8A35C]/50 text-[#D8A35C] text-[14px] font-medium active:bg-[#D8A35C]/10 disabled:opacity-40"
            >
              {isUk ? '+ Додати пігмент' : '+ Добавить пигмент'}
            </button>
          </div>
        </section>

        {/* Результат */}
        <section className="bg-[#1C1816] rounded-2xl px-4 pt-4 pb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold text-[#F5F1EA]/90">
              {isUk ? 'Результат' : 'Результат'}
            </h2>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#D8A35C]/20 text-[#D8A35C] font-medium">
              {systemLabel}
            </span>
          </div>

          <div className="flex flex-col items-center">
            {system === 'aniline' && mixedColor && (
              <div className="w-full flex gap-2 mb-3">
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAnilineLayer(n)}
                    className={
                      'flex-1 py-2 rounded-xl text-[12px] font-semibold transition-colors ' +
                      (anilineLayer === n
                        ? 'bg-[#D8A35C] text-black'
                        : 'bg-white/8 text-[#F5F1EA]/60 active:bg-white/12')
                    }
                  >
                    {String(n) + layerWord}
                  </button>
                ))}
              </div>
            )}

            <div
              role="status"
              aria-live="polite"
              aria-busy={isCalculating}
              className="relative w-36 h-36 rounded-2xl border border-white/10 shadow-lg mb-3 overflow-hidden"
            >
              {system === 'aniline' && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: '#2a2624',
                    backgroundImage:
                      'linear-gradient(45deg, #3a3532 25%, transparent 25%), linear-gradient(-45deg, #3a3532 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #3a3532 75%), linear-gradient(-45deg, transparent 75%, #3a3532 75%)',
                    backgroundSize: '12px 12px',
                    backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                  }}
                />
              )}
              <div
                className="absolute inset-0 transition-all duration-200"
                style={{
                  backgroundColor: squareColor,
                  opacity: isCalculating ? 1 : anilineOpacity,
                }}
              />
              {isCalculating && (
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                  <svg
                    className="animate-spin w-8 h-8 text-white mb-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-[10px] text-white/90 font-medium">
                    {isUk ? 'Рахуємо...' : 'Считаем...'}
                  </span>
                </div>
              )}
            </div>

            {/* Ціль / факт / ΔE */}
            {targetHex && actualHex && (
              <div className="w-full mb-3 rounded-xl bg-black/25 border border-white/8 px-3 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#F5F1EA]/45">
                    {isUk ? 'Ціль' : 'Цель'}
                  </span>
                  <span className="font-mono text-[#F5F1EA]/80">{targetHex}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#F5F1EA]/45">
                    {isUk ? 'Факт суміші' : 'Факт смеси'}
                  </span>
                  <span className="font-mono text-[#F5F1EA]">{actualHex}</span>
                </div>
                {liveDeltaE != null && (
                  <div className="flex items-center justify-between text-[12px] pt-1 border-t border-white/8">
                    <button
                      type="button"
                      onClick={() => setShowDeltaInfo(true)}
                      className="flex items-center gap-1.5 text-[#C4A35A] font-semibold"
                    >
                      ΔE
                      <span className="w-4 h-4 rounded-full border border-[#C4A35A]/60 text-[10px] flex items-center justify-center">
                        i
                      </span>
                    </button>
                    <span
                      className={
                        'font-semibold tabular-nums ' +
                        (liveDeltaE < 2
                          ? 'text-emerald-400'
                          : liveDeltaE < 3.5
                            ? 'text-[#C4A35A]'
                            : 'text-red-400')
                      }
                    >
                      {liveDeltaE.toFixed(1)}
                    </span>
                  </div>
                )}
                {liveDeltaE != null && (
                  <p className="text-[11px] text-[#F5F1EA]/40 leading-snug">
                    {deltaEQuality(liveDeltaE, isUk)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={runRefine}
                  disabled={isCalculating || !targetHex}
                  className="mt-1 w-full py-2 rounded-lg border border-[#C4A35A]/40 text-[#C4A35A] text-[12px] font-semibold active:bg-[#C4A35A]/10 disabled:opacity-40"
                >
                  {isUk ? 'Уточнити рецепт' : 'Уточнить рецепт'}
                </button>
              </div>
            )}

            {system === 'aniline' && mixedColor && (
              <p className="mb-3 text-[11px] text-center text-[#F5F1EA]/40">
                {isUk
                  ? 'Шахматка = слабке укриття аніліну на шкірі'
                  : 'Шахматка = слабое укрытие анилина на коже'}
              </p>
            )}

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
                className={
                  'flex-1 min-w-0 bg-white/10 text-[#F5F1EA] border-0 rounded-xl px-3 py-3 text-center font-mono tracking-wider focus:outline-none focus:ring-2 ' +
                  (hexError
                    ? 'ring-2 ring-red-500/70 focus:ring-red-500/70'
                    : 'focus:ring-[#D8A35C]/50')
                }
                style={{ fontSize: '16px' }}
                aria-invalid={hexError}
              />
              <button
                onClick={copyHex}
                disabled={!hasColor}
                className="flex-shrink-0 h-12 px-4 rounded-xl bg-[#D8A35C] text-black text-[13px] font-semibold disabled:opacity-35 active:scale-[0.97]"
              >
                {copied ? 'OK' : isUk ? 'Копіювати' : 'Копировать'}
              </button>
            </div>

            {hexError && (
              <p className="mt-1.5 text-[12px] text-center text-red-400/90">
                {isUk
                  ? 'Некоректний HEX, очікується #RRGGBB'
                  : 'Некорректный HEX, ожидается #RRGGBB'}
              </p>
            )}

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

        {/* Об’єм */}
        <section className="bg-[#1C1816] rounded-2xl px-4 py-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-[#F5F1EA]/50">
              {isUk ? 'Пігменти' : 'Пигменты'}
            </span>
            <span className="text-[15px] font-semibold tabular-nums text-[#F5F1EA]">
              {totalAmount.toFixed(1)} мл
            </span>
          </div>
          {system === 'acrylic' && binderMl > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[#D8A35C]/80">
                {isUk ? 'Біндер (20%)' : 'Биндер (20%)'}
              </span>
              <span className="text-[15px] font-semibold tabular-nums text-[#D8A35C]">
                {binderMl.toFixed(1)} мл
              </span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-white/8">
            <span className="text-[14px] text-[#F5F1EA]/70 font-medium">
              {isUk ? 'Загальний об’єм' : 'Общий объём'}
            </span>
            <span className="text-[17px] font-semibold tabular-nums text-[#F5F1EA]">
              {grandTotal > 1000
                ? (grandTotal / 1000).toFixed(2) + ' л'
                : grandTotal.toFixed(1) + ' мл'}
            </span>
          </div>
        </section>
      </div>

      {/* Модалка ΔE */}
      {showDeltaInfo && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 px-4 pb-safe">
          <div className="bg-[#1C1816] rounded-2xl p-5 w-full max-w-sm border border-white/10 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[16px] font-semibold text-[#C4A35A]">ΔE</span>
              <span className="text-[13px] text-[#F5F1EA]/50">
                {isUk ? 'Delta E · різниця кольорів' : 'Delta E · разница цветов'}
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-[#F5F1EA]/75 mb-3">
              {isUk
                ? 'ΔE (Delta E) — стандартна міра того, наскільки два кольори відрізняються для людського ока (CIE).'
                : 'ΔE (Delta E) — стандартная мера того, насколько два цвета отличаются для человеческого глаза (CIE).'}
            </p>
            <ul className="text-[12px] space-y-1.5 text-[#F5F1EA]/65 mb-4">
              <li>
                <span className="text-emerald-400 font-semibold">{'< 1'}</span>
                {' — '}
                {isUk ? 'різниці майже не видно' : 'разницы почти не видно'}
              </li>
              <li>
                <span className="text-emerald-400 font-semibold">1–2</span>
                {' — '}
                {isUk ? 'дуже добре для рецепту' : 'очень хорошо для рецепта'}
              </li>
              <li>
                <span className="text-[#C4A35A] font-semibold">2–3.5</span>
                {' — '}
                {isUk ? 'прийнятно в майстерні' : 'приемлемо в мастерской'}
              </li>
              <li>
                <span className="text-red-400 font-semibold">{'> 3.5'}</span>
                {' — '}
                {isUk ? 'краще натиснути «Уточнити»' : 'лучше нажать «Уточнить»'}
              </li>
            </ul>
            <p className="text-[12px] text-[#F5F1EA]/45 mb-4 leading-snug">
              {isUk
                ? 'Мета: ΔE якомога ближче до 0. Після округлення мл колір може трохи «поїхати» — «Уточнити» запускає новий підбір під той самий цільовий HEX (з виключенням поточних пігментів).'
                : 'Цель: ΔE как можно ближе к 0. После округления мл цвет может чуть «уехать» — «Уточнить» запускает новый подбор под тот же целевой HEX (исключая текущие пигменты).'}
            </p>
            <button
              onClick={() => setShowDeltaInfo(false)}
              className="w-full py-3 rounded-xl bg-[#C4A35A] text-[#1A1512] text-[14px] font-semibold"
            >
              {isUk ? 'Зрозуміло' : 'Понятно'}
            </button>
          </div>
        </div>
      )}

      {showCopyFallback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-[#1C1816] rounded-2xl p-5 w-full max-w-sm border border-white/10">
            <p className="text-[14px] text-[#F5F1EA] mb-3 text-center">
              {isUk
                ? 'Буфер обміну недоступний. Виділіть і скопіюйте:'
                : 'Буфер обмена недоступен. Выделите и скопируйте:'}
            </p>
            <input
              type="text"
              readOnly
              value={hexInput || squareColor}
              className="w-full bg-white/10 text-[#F5F1EA] rounded-xl px-3 py-3 text-center font-mono tracking-wider mb-4"
              onFocus={(e) => e.target.select()}
              autoFocus
            />
            <button
              onClick={() => setShowCopyFallback(false)}
              className="w-full py-3 rounded-xl bg-[#D8A35C] text-black text-[14px] font-semibold"
            >
              {isUk ? 'Закрити' : 'Закрыть'}
            </button>
          </div>
        </div>
      )}

      {showMethod && (
        <ColorMethodology lang={lang} onClose={() => setShowMethod(false)} />
      )}
    </motion.div>
  )
 }
