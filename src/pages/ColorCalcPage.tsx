import { motion } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'

import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { loadAllPigments } from '../data/loadPigments'
import { usePaintMix } from '../hooks/usePaintMix'
import { useColorCalculations } from '../hooks/useColorCalculations'
import { PigmentSelector } from '../components/PigmentSelector'
import type {
  CoverageSystem,
  RecipeResult,
} from '../utils/calculatorLogic'

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

type TabId = 'mix' | 'pro'

const DEFAULT_INVENTORY_IDS = [
  'titanium_white',
  'zinc_white',
  'ivory_black',
  'lamp_black',
  'cadmium_red',
  'pyrrole_red',
  'cadmium_yellow',
  'yellow_ochre',
  'ultramarine',
  'phthalo_blue',
  'phthalo_green',
  'burnt_sienna',
  'raw_umber',
  'acrylic_binder',
] as const

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showCopyFallback, setShowCopyFallback] = useState(false)
  const [tab, setTab] = useState<TabId>('mix')

  const {
    paints,
    amountRefs,
    totalAmount,
    addPaint,
    removePaint,
    updatePaint,
    clearAllAmounts,
    applyRecipe,
  } = usePaintMix(pigments)

  const { mixedColor } = useColorCalculations({
    pigments,
    paints,
    totalAmount,
  })

  const [targetHex, setTargetHex] = useState('#8B4513')
  const [inventoryIds, setInventoryIds] = useState<string[]>([])
  const [maxComponents, setMaxComponents] = useState<3 | 4>(3)
  const [system, setSystem] = useState<CoverageSystem>('acrylic')
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [recipeResult, setRecipeResult] = useState<RecipeResult | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  /** Галерея / файлы — БЕЗ capture */
  const fileInputRef = useRef<HTMLInputElement>(null)
  /** Fallback-камера через input (iOS / Telegram, когда getUserMedia не работает) */
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [samplePreview, setSamplePreview] = useState<string | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const reqIdRef = useRef(0)

  const isUk = lang === 'uk'
  const displayHex = mixedColor?.hex ? mixedColor.hex.toUpperCase() : null
  const squareColor = displayHex || '#2A2522'

  const pigmentName = (p: Pigment) => (isUk ? p.name.uk : p.name.ru)

  const resetInventoryDefaults = useCallback(() => {
    const available = new Set(pigments.map((p) => p.id))
    setInventoryIds(DEFAULT_INVENTORY_IDS.filter((id) => available.has(id)))
  }, [pigments])

  const loadPigments = () => {
    setLoading(true)
    setLoadError(false)
    loadAllPigments()
      .then((loaded) => {
        setPigments(loaded)
        const available = new Set(loaded.map((p) => p.id))
        setInventoryIds(
          DEFAULT_INVENTORY_IDS.filter((id) => available.has(id))
        )
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

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [stream])

  useEffect(() => {
    const video = videoRef.current
    if (!cameraActive || !stream || !video) return

    video.srcObject = stream
    video.muted = true
    video.playsInline = true
    video.setAttribute('playsinline', 'true')
    video.setAttribute('webkit-playsinline', 'true')
    video.setAttribute('muted', 'true')

    const tryPlay = async () => {
      try {
        await video.play()
      } catch (err) {
        console.error('video.play failed', err)
      }
    }

    if (video.readyState >= 2) {
      tryPlay()
    } else {
      const onMeta = () => tryPlay()
      video.addEventListener('loadedmetadata', onMeta)
      tryPlay()
      return () => video.removeEventListener('loadedmetadata', onMeta)
    }
  }, [cameraActive, stream])

  const ensureWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/recipeWorker.ts', import.meta.url),
        { type: 'module' }
      )
    }
    return workerRef.current
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

  const sampleFromSource = useCallback(
    (
      source: HTMLVideoElement | HTMLImageElement,
      cx?: number,
      cy?: number
    ) => {
      const srcW =
        'videoWidth' in source ? source.videoWidth : source.naturalWidth
      const srcH =
        'videoHeight' in source ? source.videoHeight : source.naturalHeight
      if (!srcW || !srcH) return

      const size = 15
      const half = Math.floor(size / 2)
      const centerX = cx ?? srcW / 2
      const centerY = cy ?? srcH / 2
      const sx = Math.max(0, Math.min(srcW - size, Math.round(centerX - half)))
      const sy = Math.max(0, Math.min(srcH - size, Math.round(centerY - half)))
      const sw = Math.min(size, srcW - sx)
      const sh = Math.min(size, srcH - sy)

      const maxDim = 32
      const scale = Math.min(1, maxDim / Math.max(sw, sh))
      const dw = Math.max(1, Math.round(sw * scale))
      const dh = Math.max(1, Math.round(sh * scale))

      const canvas = document.createElement('canvas')
      canvas.width = dw
      canvas.height = dh
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, dw, dh)
      const data = ctx.getImageData(0, 0, dw, dh).data

      let sumR = 0
      let sumG = 0
      let sumB = 0
      const pixels = dw * dh
      for (let i = 0; i < data.length; i += 4) {
        sumR += data[i]
        sumG += data[i + 1]
        sumB += data[i + 2]
      }
      const r = Math.round(sumR / pixels)
      const g = Math.round(sumG / pixels)
      const b = Math.round(sumB / pixels)

      canvas.width = 0
      canvas.height = 0

      const hex =
        '#' +
        [r, g, b]
          .map((v) => v.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase()

      setTargetHex(hex)
      setSamplePreview(hex)
      setRecipeResult(null)
      setRecipeError(null)
    },
    []
  )

  /** Обработка файла из галереи ИЛИ из camera-input */
  const handleImageFile = (file: File | undefined | null) => {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      sampleFromSource(img)
      URL.revokeObjectURL(url)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageFile(e.target.files?.[0])
    e.target.value = ''
  }

  const onCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageFile(e.target.files?.[0])
    e.target.value = ''
  }

  /**
   * Камера:
   * 1) пробуем live getUserMedia
   * 2) если отказ / Telegram iOS — открываем input capture (снять 1 кадр)
   */
  const startCamera = async () => {
    setRecipeError(null)

    // Есть ли API вообще
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      // Сразу fallback: системная камера → один снимок
      cameraInputRef.current?.click()
      return
    }

    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
        setStream(null)
      }

      // На iOS проще без жёсткого facingMode
      let media: MediaStream
      try {
        media = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        })
      } catch {
        // Повтор без constraints
        media = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }

      setStream(media)
      setCameraActive(true)
    } catch (err) {
      console.error('getUserMedia failed, fallback to capture input', err)
      setCameraActive(false)
      setStream(null)
      // iOS / Telegram: открыть нативную камеру на 1 кадр
      cameraInputRef.current?.click()
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const captureFromCamera = () => {
    const video = videoRef.current
    if (!video) return
    if (!video.videoWidth || !video.videoHeight) {
      setRecipeError(
        isUk
          ? 'Камера ще не готова, зачекайте секунду'
          : 'Камера ещё не готова, подождите секунду'
      )
      return
    }
    sampleFromSource(video)
  }

  const runRecipeSearch = () => {
    if (!targetHex || targetHex.length < 7 || pigments.length === 0) return
    if (inventoryIds.length === 0) return

    setRecipeLoading(true)
    setRecipeError(null)
    setRecipeResult(null)

    const id = ++reqIdRef.current
    const worker = ensureWorker()

    const onMsg = (e: MessageEvent) => {
      if (e.data.id !== id) return
      worker.removeEventListener('message', onMsg)
      setRecipeLoading(false)
      if (e.data.error) {
        setRecipeError(String(e.data.error))
        setRecipeResult(null)
        return
      }
      const result = e.data.result as RecipeResult | null
      setRecipeResult(result)
      if (!result) {
        setRecipeError(
          isUk ? 'Не вдалося підібрати рецепт' : 'Не удалось подобрать рецепт'
        )
      }
    }

    worker.addEventListener('message', onMsg)
    worker.postMessage({
      id,
      targetHex,
      basicPigments: pigments,
      maxComponents,
      targetVolume: 20,
      system,
      activeIds: inventoryIds,
      excludeIds: ['cardboard'],
    })
  }

  const sendRecipeToMix = () => {
    if (!recipeResult?.recipe?.length) return
    applyRecipe(
      recipeResult.recipe
        .filter((item) => !item.isBinder)
        .map((item) => ({
          pigmentId: item.pigment.id,
          ml: item.ml,
        }))
    )
    stopCamera()
    setTab('mix')
  }

  const toggleInventory = (pid: string) => {
    setInventoryIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
    )
  }

  const selectAllInventory = () => {
    const ids = pigments
      .filter(
        (p) =>
          p.id !== 'acrylic_binder' &&
          p.id !== 'cardboard' &&
          p.spectrum
      )
      .map((p) => p.id)
    if (system === 'acrylic') {
      const hasBinder = pigments.some((p) => p.id === 'acrylic_binder')
      if (hasBinder && !ids.includes('acrylic_binder')) {
        ids.push('acrylic_binder')
      }
    }
    setInventoryIds(ids)
  }

  const clearInventory = () => setInventoryIds([])

  const tabBtn = (id: TabId, label: string) => (
    <button
      key={id}
      onClick={() => {
        setTab(id)
        if (id !== 'pro') stopCamera()
      }}
      className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity"
      style={{
        background:
          tab === id
            ? 'var(--color-accent, #D8A35C)'
            : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
        color:
          tab === id
            ? 'var(--color-bg, #1C1816)'
            : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)',
      }}
    >
      {label}
    </button>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="min-h-screen flex flex-col pt-safe px-4 md:px-6 pb-10 calc-page-content"
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
          className="flex-1 text-[17px] font-semibold tracking-tight calc-page-title"
          style={{ color: 'var(--color-ink, #F5F1EA)' }}
        >
          {isUk ? 'Калькулятор кольору' : 'Калькулятор цвета'}
        </h1>
      </header>

      <div className="flex gap-2 mb-4">
        {tabBtn('mix', isUk ? 'Суміш' : 'Смесь')}
        {tabBtn('pro', 'Pro')}
      </div>

      <div className="flex-1 flex flex-col gap-4 mt-1">
        {tab === 'mix' && (
          <>
            <section
              className="rounded-2xl overflow-visible relative z-10"
              style={{ background: 'var(--color-surface, #25201C)' }}
            >
              <div className="px-4 md:px-5 pt-4 pb-3 flex items-center justify-between">
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

              <div className="px-4 md:px-5 pb-4">
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

            <section
              className="rounded-2xl px-4 md:px-5 pt-4 pb-5 calc-result-card"
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
                  className="w-36 h-36 md:w-40 md:h-40 rounded-2xl shadow-lg mb-4"
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

            <section
              className="rounded-2xl px-4 md:px-5 py-3.5"
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
          </>
        )}

        {tab === 'pro' && (
          <>
            <section
              className="rounded-2xl px-4 md:px-5 pt-4 pb-5"
              style={{ background: 'var(--color-surface, #25201C)' }}
            >
              <h2
                className="text-[13px] font-semibold mb-3"
                style={{
                  color:
                    'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)',
                }}
              >
                {isUk ? 'Цільовий колір' : 'Целевой цвет'}
              </h2>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-16 h-16 rounded-xl flex-shrink-0 shadow-inner"
                  style={{
                    backgroundColor: targetHex,
                    border:
                      '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 12%, transparent)',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={targetHex}
                    onChange={(e) => {
                      let v = e.target.value.trim()
                      if (!v.startsWith('#')) v = '#' + v
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                        setTargetHex(v.toUpperCase())
                        setRecipeResult(null)
                      }
                    }}
                    className="w-full rounded-xl px-3 py-2.5 font-mono tracking-wider text-[15px] focus:outline-none"
                    style={{
                      background:
                        'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                      color: 'var(--color-ink, #F5F1EA)',
                    }}
                    placeholder="#RRGGBB"
                    maxLength={7}
                  />
                  {samplePreview && (
                    <p
                      className="mt-1 text-[11px]"
                      style={{
                        color:
                          'color-mix(in srgb, var(--color-ink, #F5F1EA) 40%, transparent)',
                      }}
                    >
                      {isUk ? 'Зі зразка' : 'Из образца'}: {samplePreview}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold active:scale-[0.98]"
                    style={{
                      background:
                        'color-mix(in srgb, var(--color-accent, #D8A35C) 20%, transparent)',
                      color: 'var(--color-accent, #D8A35C)',
                    }}
                  >
                    {isUk ? 'Камера' : 'Камера'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={captureFromCamera}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold active:scale-[0.98]"
                      style={{
                        background: 'var(--color-accent, #D8A35C)',
                        color: 'var(--color-bg, #1C1816)',
                      }}
                    >
                      {isUk ? 'Зняти колір' : 'Снять цвет'}
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-2.5 rounded-xl text-[13px] font-medium"
                      style={{
                        background:
                          'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)',
                        color:
                          'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)',
                      }}
                    >
                      ✕
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold active:scale-[0.98]"
                  style={{
                    background:
                      'color-mix(in srgb, var(--color-accent, #D8A35C) 20%, transparent)',
                    color: 'var(--color-accent, #D8A35C)',
                  }}
                >
                  {isUk ? 'Фото' : 'Фото'}
                </button>

                {/* Галерея / файлы — БЕЗ capture */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileSelected}
                />
                {/* Fallback: системная камера на 1 кадр (iOS / Telegram) */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onCameraCapture}
                />
              </div>

              {cameraActive && (
                <div className="relative rounded-xl overflow-hidden mb-2 bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-48 object-cover"
                    style={{ background: '#000', minHeight: 160 }}
                  />
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      width: 20,
                      height: 20,
                      border: '2px solid rgba(255,255,255,0.85)',
                      borderRadius: 4,
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
                    }}
                  />
                </div>
              )}
            </section>

            <section
              className="rounded-2xl px-4 md:px-5 py-4"
              style={{ background: 'var(--color-surface, #25201C)' }}
            >
              <h2
                className="text-[13px] font-semibold mb-3"
                style={{
                  color:
                    'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)',
                }}
              >
                {isUk ? 'Параметри' : 'Параметры'}
              </h2>

              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setMaxComponents(3)}
                  className="flex-1 py-2 rounded-lg text-[12px] font-semibold"
                  style={{
                    background:
                      maxComponents === 3
                        ? 'var(--color-accent, #D8A35C)'
                        : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                    color:
                      maxComponents === 3
                        ? 'var(--color-bg, #1C1816)'
                        : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)',
                  }}
                >
                  ≤ 3 {isUk ? 'пігменти' : 'пигмента'}
                </button>
                <button
                  type="button"
                  onClick={() => setMaxComponents(4)}
                  className="flex-1 py-2 rounded-lg text-[12px] font-semibold"
                  style={{
                    background:
                      maxComponents === 4
                        ? 'var(--color-accent, #D8A35C)'
                        : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                    color:
                      maxComponents === 4
                        ? 'var(--color-bg, #1C1816)'
                        : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)',
                  }}
                >
                  ≤ 4
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSystem('acrylic')}
                  className="flex-1 py-2 rounded-lg text-[12px] font-semibold"
                  style={{
                    background:
                      system === 'acrylic'
                        ? 'var(--color-accent, #D8A35C)'
                        : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                    color:
                      system === 'acrylic'
                        ? 'var(--color-bg, #1C1816)'
                        : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)',
                  }}
                >
                  {isUk ? 'Акрил' : 'Акрил'}
                </button>
                <button
                  type="button"
                  onClick={() => setSystem('aniline')}
                  className="flex-1 py-2 rounded-lg text-[12px] font-semibold"
                  style={{
                    background:
                      system === 'aniline'
                        ? 'var(--color-accent, #D8A35C)'
                        : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                    color:
                      system === 'aniline'
                        ? 'var(--color-bg, #1C1816)'
                        : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)',
                  }}
                >
                  {isUk ? 'Анілін' : 'Анилин'}
                </button>
              </div>
            </section>

            <section
              className="rounded-2xl px-4 md:px-5 py-4"
              style={{ background: 'var(--color-surface, #25201C)' }}
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <h2
                  className="text-[13px] font-semibold"
                  style={{
                    color:
                      'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)',
                  }}
                >
                  {isUk
                    ? `Інвентар (${inventoryIds.length})`
                    : `Инвентарь (${inventoryIds.length})`}
                </h2>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={resetInventoryDefaults}
                    className="text-[11px] font-semibold px-2 py-1 rounded-lg active:opacity-80"
                    style={{
                      background:
                        'color-mix(in srgb, var(--color-accent, #D8A35C) 22%, transparent)',
                      color: 'var(--color-accent, #D8A35C)',
                    }}
                  >
                    {isUk ? 'За замовч.' : 'По умолчанию'}
                  </button>
                  <button
                    type="button"
                    onClick={selectAllInventory}
                    className="text-[11px] font-medium px-2 py-1 rounded-lg active:opacity-80"
                    style={{
                      color:
                        'color-mix(in srgb, var(--color-ink, #F5F1EA) 55%, transparent)',
                    }}
                  >
                    {isUk ? 'Усі' : 'Все'}
                  </button>
                  <button
                    type="button"
                    onClick={clearInventory}
                    className="text-[11px] font-medium px-2 py-1 rounded-lg active:opacity-80"
                    style={{ color: 'var(--color-danger, #f87171)' }}
                  >
                    {isUk ? 'Скинути' : 'Сбросить'}
                  </button>
                </div>
              </div>
              <p
                className="text-[11px] mb-3"
                style={{
                  color:
                    'color-mix(in srgb, var(--color-ink, #F5F1EA) 40%, transparent)',
                }}
              >
                {isUk
                  ? 'Тільки вибрані пігменти беруть участь у підборі'
                  : 'Только выбранные пигменты участвуют в подборе'}
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {pigments
                  .filter(
                    (p) =>
                      p.id !== 'acrylic_binder' &&
                      p.id !== 'cardboard' &&
                      p.spectrum
                  )
                  .map((p) => {
                    const on = inventoryIds.includes(p.id)
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => toggleInventory(p.id)}
                        className="px-2 py-1 rounded-lg text-[11px] font-medium"
                        style={{
                          background: on
                            ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 25%, transparent)'
                            : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 6%, transparent)',
                          color: on
                            ? 'var(--color-accent, #D8A35C)'
                            : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 50%, transparent)',
                          border: on
                            ? '1px solid color-mix(in srgb, var(--color-accent, #D8A35C) 50%, transparent)'
                            : '1px solid transparent',
                        }}
                      >
                        {pigmentName(p)}
                      </button>
                    )
                  })}
              </div>
            </section>

            <button
              type="button"
              onClick={runRecipeSearch}
              disabled={
                recipeLoading ||
                loading ||
                !targetHex ||
                targetHex.length < 7 ||
                inventoryIds.length === 0
              }
              className="w-full py-3.5 rounded-xl text-[15px] font-semibold disabled:opacity-40 active:scale-[0.98]"
              style={{
                background: 'var(--color-accent, #D8A35C)',
                color: 'var(--color-bg, #1C1816)',
              }}
            >
              {recipeLoading
                ? isUk
                  ? 'Підбір…'
                  : 'Подбор…'
                : isUk
                  ? 'Підібрати рецепт'
                  : 'Подобрать рецепт'}
            </button>

            {recipeError && (
              <p
                className="text-[13px] text-center"
                style={{ color: 'var(--color-danger, #f87171)' }}
              >
                {recipeError}
              </p>
            )}

            {recipeResult && (
              <section
                className="rounded-2xl px-4 md:px-5 pt-4 pb-5"
                style={{ background: 'var(--color-surface, #25201C)' }}
              >
                <h2
                  className="text-[13px] font-semibold mb-3"
                  style={{
                    color:
                      'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)',
                  }}
                >
                  {isUk ? 'Рецепт' : 'Рецепт'}
                </h2>

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex-shrink-0"
                    style={{
                      backgroundColor: recipeResult.resultHex || '#333',
                      border:
                        '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 12%, transparent)',
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[15px] tracking-wider">
                      {(recipeResult.resultHex || '').toUpperCase()}
                    </p>
                    <p
                      className="text-[12px] mt-0.5"
                      style={{
                        color:
                          recipeResult.deltaE > 2 || recipeResult.approximate
                            ? 'var(--color-danger, #f87171)'
                            : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 50%, transparent)',
                      }}
                    >
                      ΔE₀₀ ≈ {recipeResult.deltaE.toFixed(1)}
                      {(recipeResult.deltaE > 2 || recipeResult.approximate) &&
                        (isUk
                          ? ' — неточне співпадіння'
                          : ' — неточное совпадение')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  {recipeResult.recipe.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 px-3 rounded-xl"
                      style={{
                        background:
                          'color-mix(in srgb, var(--color-ink, #F5F1EA) 5%, transparent)',
                      }}
                    >
                      <span className="text-[13px] font-medium truncate pr-2">
                        {item.isBinder
                          ? isUk
                            ? 'Зв’язуюче'
                            : 'Связующее'
                          : pigmentName(item.pigment)}
                      </span>
                      <span className="text-[14px] font-semibold tabular-nums flex-shrink-0">
                        {item.ml.toFixed(1)} мл
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={sendRecipeToMix}
                  className="w-full py-3 rounded-xl text-[14px] font-semibold active:scale-[0.98]"
                  style={{
                    background:
                      'color-mix(in srgb, var(--color-accent, #D8A35C) 25%, transparent)',
                    color: 'var(--color-accent, #D8A35C)',
                    border:
                      '1px solid color-mix(in srgb, var(--color-accent, #D8A35C) 45%, transparent)',
                  }}
                >
                  {isUk ? 'Перенести в суміш' : 'Перенести в смесь'}
                </button>
              </section>
            )}
          </>
        )}
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
              type="button"
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
