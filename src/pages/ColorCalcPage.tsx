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

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showCopyFallback, setShowCopyFallback] = useState(false)
  const [showMethod, setShowMethod] = useState(false)

  const [system, setSystem] = useState<CoverageSystem>('acrylic')
  const [anilineLayer, setAnilineLayer] = useState<1 | 2 | 3>(1)

  const [hexInput, setHexInput] = useState('')
  const [validHex, setValidHex] = useState<string | null>(null)
  const [hexError, setHexError] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const lastTargetHex = useRef<string | null>(null)
  const fromRecipeRef = useRef(false)
  const userEdited = useRef(false)
  const calcRef = useRef(0)
  const workerRef = useRef<Worker | null>(null)

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

    if (mixedColor?.hex) return mixedColor.hex.toUpperCase()
    if (userEdited.current && validHex) return validHex
    return validHex || lastTargetHex.current || '#2A2522'
  }, [
    isCalculating,
    validHex,
    system,
    mixedColor,
    anilineLayer,
    anilineLayerColors,
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
        lastTargetHex.current = validHex

        const newPaints = result.recipe
          .filter(
            (r: { pigment: { id: string } }) =>
              r.pigment.id !== 'acrylic_binder'
          )
          .map((r: { pigment: { id: string }; ml: number }) => ({
            id: generateId(),
            pigmentId: r.pigment.id,
            amount: String(r.ml),
          }))
        setPaints(newPaints)
      }

      setIsCalculating(false)
    }

    worker.onerror = () => setIsCalculating(false)
    workerRef.current = worker

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [setPaints, validHex])

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
      if (lastTargetHex.current) setHexInput(lastTargetHex.current)
      userEdited.current = false
      setValidHex(null)
      return
    }
    userEdited.current = false
    setValidHex(null)
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

  useEffect(() => {
    if (!validHex || !userEdited.current || pigments.length === 0 || loading) {
      setIsCalculating(false)
      return
    }
    if (!workerRef.current) return

    const id = ++calcRef.current
    setIsCalculating(true)

    workerRef.current.postMessage({
      id,
      targetHex: validHex,
      basicPigments: pigments,
      maxComponents: 3,
      targetVolume: totalAmount > 0 ? totalAmount : 20,
      system,
    })
  }, [validHex, pigments, loading, totalAmount, system])

  const handleHexChange = (raw: string) => {
    userEdited.current = true
    const val = raw.replace(/[^0-9A-Fa-f]/gi, '').slice(0, 6)
    if (val.length === 0) {
      setHexInput('')
      setValidHex(null)
      setHexError(false)
      lastTargetHex.current = null
      return
    }
    setHexInput('#' + val)
  }

  const handleHexBlur = () => {
    setIsFocused(false)
    if (validHex) setHexInput(validHex)
    else if (lastTargetHex.current) setHexInput(lastTargetHex.current)
    else if (mixedColor?.hex) {
      setHexInput(mixedColor.hex.toUpperCase())
      userEdited.current = false
    } else if (hexInput && !/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
      setHexError(true)
    }
  }

  const copyHex = async () => {
    const colorToCopy =
      (system === 'aniline' && squareColor !== '#2A2522'
        ? squareColor
        : null) ||
      hexInput ||
      (userEdited.current && validHex) ||
      (mixedColor?.hex ? mixedColor.hex.toUpperCase() : null) ||
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

  const hasColor = Boolean(
    hexInput ||
      (userEdited.current && validHex) ||
      mixedColor?.hex ||
      validHex ||
      lastTargetHex.current
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

  const layerWord = isUk ? ' шар' : ' слой'

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
                      <svg
                        width="18"
                        height="18"
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

                {system === 'acrylic' && totalAmount > 0 && (
                  <div className="flex items-center gap-2 mt-1 pt-3 border-t border-dashed border-[#D8A35C]/30">
                    <div className="flex-1 min-w-0 rounded-xl px-3 py-2.5 bg-[#D8A35C]/15 border border-[#D8A35C]/35">
                      <p className="text-[13px] font-semibold text-[#D8A35C]">
                        {isUk ? 'Акриловий біндер' : 'Акриловый биндер'}
                      </p>
                      <p className="text-[10px] text-[#F5F1EA]/45 mt-0.5">
                        {isUk
                          ? 'авто: 20% від пігментів'
                          : 'авто: 20% от пигментов'}
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
                <button
                  type="button"
                  onClick={() => setAnilineLayer(1)}
                  className={
                    'flex-1 py-2 rounded-xl text-[12px] font-semibold transition-colors ' +
                    (anilineLayer === 1
                      ? 'bg-[#D8A35C] text-black'
                      : 'bg-white/8 text-[#F5F1EA]/60 active:bg-white/12')
                  }
                >
                  {'1' + layerWord}
                </button>
                <button
                  type="button"
                  onClick={() => setAnilineLayer(2)}
                  className={
                    'flex-1 py-2 rounded-xl text-[12px] font-semibold transition-colors ' +
                    (anilineLayer === 2
                      ? 'bg-[#D8A35C] text-black'
                      : 'bg-white/8 text-[#F5F1EA]/60 active:bg-white/12')
                  }
                >
                  {'2' + layerWord}
                </button>
                <button
                  type="button"
                  onClick={() => setAnilineLayer(3)}
                  className={
                    'flex-1 py-2 rounded-xl text-[12px] font-semibold transition-colors ' +
                    (anilineLayer === 3
                      ? 'bg-[#D8A35C] text-black'
                      : 'bg-white/8 text-[#F5F1EA]/60 active:bg-white/12')
                  }
                >
                  {'3' + layerWord}
                </button>
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
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
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
