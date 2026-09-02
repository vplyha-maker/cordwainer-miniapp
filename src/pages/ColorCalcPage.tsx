import { motion } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'

import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { loadAllPigments } from '../data/loadPigments'
import { usePaintMix } from '../hooks/usePaintMix'
import { useColorCalculations } from '../hooks/useColorCalculations'
import { PigmentSelector } from '../components/PigmentSelector'
import type { CoverageSystem, RecipeResult } from '../utils/calculatorLogic'

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

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return true
  }
  return false
}

// --- Утилиты для расчета DeltaE CIEDE2000 в реальном времени ---
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0]
}

function rgbToLab(rgb: number[]) {
  let r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92

  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116

  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
}

function calculateDeltaE2000(hex1: string, hex2: string): number {
  const lab1 = rgbToLab(hexToRgb(hex1))
  const lab2 = rgbToLab(hexToRgb(hex2))
  
  const L1 = lab1[0], a1 = lab1[1], b1 = lab1[2]
  const L2 = lab2[0], a2 = lab2[1], b2 = lab2[2]
  
  const C1 = Math.sqrt(a1 * a1 + b1 * b1)
  const C2 = Math.sqrt(a2 * a2 + b2 * b2)
  const Cbar = (C1 + C2) / 2
  
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))))
  const a1Prime = a1 * (1 + G), a2Prime = a2 * (1 + G)
  
  const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1)
  const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2)
  
  let h1Prime = Math.atan2(b1, a1Prime) * (180 / Math.PI)
  if (h1Prime < 0) h1Prime += 360
  let h2Prime = Math.atan2(b2, a2Prime) * (180 / Math.PI)
  if (h2Prime < 0) h2Prime += 360
  
  const dLPrime = L2 - L1
  const dCPrime = C2Prime - C1Prime
  
  let dhPrime = 0
  if (C1Prime * C2Prime !== 0) {
    if (Math.abs(h2Prime - h1Prime) <= 180) dhPrime = h2Prime - h1Prime
    else if (h2Prime - h1Prime > 180) dhPrime = h2Prime - h1Prime - 360
    else dhPrime = h2Prime - h1Prime + 360
  }
  const dHPrime = 2 * Math.sqrt(C1Prime * C2Prime) * Math.sin((dhPrime / 2) * (Math.PI / 180))
  
  const LbarPrime = (L1 + L2) / 2
  const CbarPrime = (C1Prime + C2Prime) / 2
  let hbarPrime = (h1Prime + h2Prime) / 2
  if (C1Prime * C2Prime !== 0 && Math.abs(h1Prime - h2Prime) > 180) {
    hbarPrime += 180
    if (hbarPrime >= 360) hbarPrime -= 360
  }
  
  const T = 1 - 0.17 * Math.cos((hbarPrime - 30) * (Math.PI / 180))
              + 0.24 * Math.cos((2 * hbarPrime) * (Math.PI / 180))
              + 0.32 * Math.cos((3 * hbarPrime + 6) * (Math.PI / 180))
              - 0.20 * Math.cos((4 * hbarPrime - 63) * (Math.PI / 180))
              
  const dTheta = 30 * Math.exp(-Math.pow((hbarPrime - 275) / 25, 2))
  const Rc = 2 * Math.sqrt(Math.pow(CbarPrime, 7) / (Math.pow(CbarPrime, 7) + Math.pow(25, 7)))
  const Rt = -Math.sin(2 * dTheta * (Math.PI / 180)) * Rc
  
  const Sl = 1 + ((0.015 * Math.pow(LbarPrime - 50, 2)) / Math.sqrt(20 + Math.pow(LbarPrime - 50, 2)))
  const Sc = 1 + 0.045 * CbarPrime
  const Sh = 1 + 0.015 * CbarPrime * T
  
  const dE = Math.sqrt(
    Math.pow(dLPrime / Sl, 2) +
    Math.pow(dCPrime / Sc, 2) +
    Math.pow(dHPrime / Sh, 2) +
    Rt * (dCPrime / Sc) * (dHPrime / Sh)
  )
  return dE
}

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
  const [activeTarget, setActiveTarget] = useState<string | null>(null)
  
  const liveDeltaE = activeTarget && mixedColor?.hex 
    ? calculateDeltaE2000(activeTarget, mixedColor.hex) 
    : null

  const [inventoryIds, setInventoryIds] = useState<string[]>([])
  const [maxComponents, setMaxComponents] = useState<3 | 4>(3)
  const [system, setSystem] = useState<CoverageSystem>('acrylic')
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [recipeResult, setRecipeResult] = useState<RecipeResult | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [samplePreview, setSamplePreview] = useState<string | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const reqIdRef = useRef(0)
  const isIOSRef = useRef(detectIOS())

  const isUk = lang === 'uk'
  const isIOS = isIOSRef.current
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
        setInventoryIds(DEFAULT_INVENTORY_IDS.filter((id) => available.has(id)))
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
        setLoadError(true)
      })
  }

  useEffect(() => { loadPigments() }, [])

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    return () => { if (stream) stream.getTracks().forEach((t) => t.stop()) }
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
      try { await video.play() } catch (err) { console.error(err) }
    }
    if (video.readyState >= 2) tryPlay()
    else {
      const onMeta = () => tryPlay()
      video.addEventListener('loadedmetadata', onMeta)
      tryPlay()
      return () => video.removeEventListener('loadedmetadata', onMeta)
    }
  }, [cameraActive, stream])

  const ensureWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../workers/recipeWorker.ts', import.meta.url), { type: 'module' })
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

  const sampleFromSource = useCallback((source: HTMLVideoElement | HTMLImageElement, cx?: number, cy?: number) => {
      const srcW = 'videoWidth' in source ? source.videoWidth : source.naturalWidth
      const srcH = 'videoHeight' in source ? source.videoHeight : source.naturalHeight
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

      let sumR = 0, sumG = 0, sumB = 0
      const pixels = dw * dh
      for (let i = 0; i < data.length; i += 4) {
        sumR += data[i]; sumG += data[i + 1]; sumB += data[i + 2]
      }
      
      const r = Math.round(sumR / pixels)
      const g = Math.round(sumG / pixels)
      const b = Math.round(sumB / pixels)

      const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()

      setTargetHex(hex)
      setSamplePreview(hex)
      setRecipeResult(null)
      setRecipeError(null)
    },
    []
  )

  const handleImageFile = (file: File | undefined | null) => {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { sampleFromSource(img); URL.revokeObjectURL(url) }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => { handleImageFile(e.target.files?.[0]); e.target.value = '' }
  const onCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => { handleImageFile(e.target.files?.[0]); e.target.value = '' }

  const startCamera = () => {
    setRecipeError(null)
    if (isIOSRef.current) return
    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        cameraInputRef.current?.click()
        return
      }
      try {
        if (stream) { stream.getTracks().forEach((t) => t.stop()); setStream(null) }
        let media: MediaStream
        try {
          media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
        } catch {
          media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        }
        setStream(media)
        setCameraActive(true)
      } catch (err) {
        setCameraActive(false)
        setStream(null)
        cameraInputRef.current?.click()
      }
    })()
  }

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); setStream(null) }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
  }

  const captureFromCamera = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) {
      setRecipeError(isUk ? 'Камера ще не готова, зачекайте секунду' : 'Камера ещё не готова, подождите секунду')
      return
    }
    sampleFromSource(video)
  }

  const runRecipeSearch = () => {
    if (!targetHex || targetHex.length < 7 || pigments.length === 0 || inventoryIds.length === 0) return
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
      if (!result) setRecipeError(isUk ? 'Не вдалося підібрати рецепт' : 'Не удалось подобрать рецепт')
    }

    worker.addEventListener('message', onMsg)
    worker.postMessage({
      id, targetHex, basicPigments: pigments, maxComponents, targetVolume: 20, system, activeIds: inventoryIds, excludeIds: ['cardboard']
    })
  }

  const sendRecipeToMix = () => {
    if (!recipeResult?.recipe?.length) return
    applyRecipe(
      recipeResult.recipe
        .filter((item) => !item.isBinder)
        .map((item) => ({ pigmentId: item.pigment.id, ml: item.ml }))
    )
    setActiveTarget(targetHex)
    stopCamera()
    setTab('mix')
  }

  const toggleInventory = (pid: string) => setInventoryIds((prev) => prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid])
  
  const selectAllInventory = () => {
    const ids = pigments.filter((p) => p.id !== 'acrylic_binder' && p.id !== 'cardboard' && p.spectrum).map((p) => p.id)
    if (system === 'acrylic' && pigments.some((p) => p.id === 'acrylic_binder') && !ids.includes('acrylic_binder')) {
      ids.push('acrylic_binder')
    }
    setInventoryIds(ids)
  }

  const clearInventory = () => setInventoryIds([])

  const tabBtn = (id: TabId, label: string) => (
    <button
      key={id}
      onClick={() => { setTab(id); if (id !== 'pro') stopCamera() }}
      className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity"
      style={{
        background: tab === id ? 'var(--color-accent, #D8A35C)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
        color: tab === id ? 'var(--color-bg, #1C1816)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)',
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
      style={{ background: 'var(--color-bg, #1C1816)', color: 'var(--color-ink, #F5F1EA)' }}
    >
      <header className="flex items-center gap-1 py-3">
        <button onClick={onBack} className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full opacity-70 active:opacity-100" style={{ color: 'var(--color-ink, #F5F1EA)' }} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="flex-1 text-[17px] font-semibold tracking-tight calc-page-title" style={{ color: 'var(--color-ink, #F5F1EA)' }}>
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
            <section className="rounded-2xl overflow-visible relative z-10" style={{ background: 'var(--color-surface, #25201C)' }}>
              <div className="px-4 md:px-5 pt-4 pb-3 flex items-center justify-between">
                <h2 className="text-[13px] font-semibold" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)' }}>
                  {isUk ? 'Склад суміші' : 'Состав смеси'}
                </h2>
                {totalAmount > 0 && (
                  <button onClick={clearAllAmounts} className="text-[12px] font-medium px-2 py-1 -mr-1 rounded-lg" style={{ color: 'var(--color-danger, #f87171)' }}>
                    {isUk ? 'Очистити' : 'Очистить'}
                  </button>
                )}
              </div>

              <div className="px-4 md:px-5 pb-4">
                {loading ? (
                  <div className="py-8 text-center text-[13px]" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 40%, transparent)' }}>{isUk ? 'Завантаження…' : 'Загрузка…'}</div>
                ) : loadError ? (
                  <div className="py-6 flex flex-col items-center gap-3">
                    <p className="text-[13px] text-center" style={{ color: 'var(--color-danger, #f87171)' }}>{isUk ? 'Помилка завантаження пігментів' : 'Ошибка загрузки пигментов'}</p>
                    <button onClick={loadPigments} className="px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--color-accent, #D8A35C)', color: 'var(--color-bg, #1C1816)' }}>
                      {isUk ? 'Спробувати знову' : 'Повторить'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {paints.map((paint) => {
                      const currentAmount = parseFloat(paint.amount) || 0;
                      // Динамический максимум ползунка: не меньше 20мл, но если введено больше - расширяем границу (в 1.5 раза)
                      const sliderMax = Math.max(20, Math.ceil(currentAmount * 1.5));
                      
                      return (
                        <div key={paint.id} className="flex flex-col gap-2 p-3 rounded-2xl" style={{ background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)' }}>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0 pr-1">
                              <PigmentSelector pigments={pigments} value={paint.pigmentId} onChange={(newId) => updatePaint(paint.id, 'pigmentId', newId)} lang={lang} />
                            </div>
                            <div className="flex items-center gap-1 w-[70px] flex-shrink-0">
                              <input
                                ref={(el) => { if (el) amountRefs.current.set(paint.id, el); else amountRefs.current.delete(paint.id) }}
                                type="text" inputMode="decimal" enterKeyHint="done"
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
                                  if (val === '.' || val === '') updatePaint(paint.id, 'amount', '')
                                  else {
                                    const num = parseFloat(val)
                                    if (!isNaN(num)) updatePaint(paint.id, 'amount', String(Math.min(num, 5000)))
                                  }
                                }}
                                className="w-full bg-transparent border-0 text-right font-semibold focus:outline-none p-0"
                                placeholder="0" style={{ fontSize: '16px', color: 'var(--color-ink, #F5F1EA)' }}
                              />
                              <span className="text-[12px] font-medium flex-shrink-0" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 40%, transparent)' }}>мл</span>
                            </div>
                            <button onClick={() => removePaint(paint.id)} disabled={paints.length <= 1} className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 disabled:opacity-15 active:bg-white/10" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 28%, transparent)' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                          </div>

                          {/* --- НОВЫЙ БЛОК: ПОЛЗУНОК --- */}
                          <div className="w-full px-1 pb-1">
                            <input
                              type="range"
                              min="0"
                              max={sliderMax}
                              step="0.1"
                              value={currentAmount}
                              onChange={(e) => updatePaint(paint.id, 'amount', e.target.value)}
                              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                              style={{ 
                                background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 15%, transparent)',
                                accentColor: 'var(--color-accent, #D8A35C)'
                              }}
                            />
                          </div>

                        </div>
                      )
                    })}
                  </div>
                )}
                <button onClick={addPaint} disabled={loading || loadError} className="mt-4 w-full py-3 rounded-xl text-[14px] font-medium disabled:opacity-40" style={{ border: '1px dashed color-mix(in srgb, var(--color-accent, #D8A35C) 45%, transparent)', color: 'var(--color-accent, #D8A35C)' }}>
                  {isUk ? '+ Додати пігмент' : '+ Добавить пигмент'}
                </button>
              </div>
            </section>

            <section className="rounded-2xl px-4 md:px-5 pt-4 pb-5 calc-result-card" style={{ background: 'var(--color-surface, #25201C)' }}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[13px] font-semibold" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)' }}>
                  {isUk ? 'Результат' : 'Результат'}
                </h2>
                {activeTarget && (
                  <button onClick={() => setActiveTarget(null)} className="text-[11px] font-medium text-red-400">
                    {isUk ? 'Скинути ціль' : 'Сбросить цель'}
                  </button>
                )}
              </div>

              <div className="flex flex-col items-center">
                
                {activeTarget ? (
                  <div className="w-full flex flex-col items-center gap-3 mb-4">
                    <div className="flex w-full justify-center gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-2xl shadow-lg mb-2" style={{ backgroundColor: activeTarget, border: '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }} />
                        <span className="text-[11px] font-semibold uppercase">{isUk ? 'Ціль' : 'Цель'}</span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-2xl shadow-lg mb-2" style={{ backgroundColor: squareColor, border: '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }} />
                        <span className="text-[11px] font-semibold uppercase">{isUk ? 'Суміш' : 'Смесь'}</span>
                      </div>
                    </div>

                    {liveDeltaE !== null && (
                      <div className="px-4 py-2 rounded-xl text-center transition-colors" style={{ background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)' }}>
                        <span className="text-[12px] opacity-70 block mb-0.5">{isUk ? 'Відхилення' : 'Отклонение'}</span>
                        <span className="text-[18px] font-bold" style={{ color: liveDeltaE <= 2 ? '#4ade80' : liveDeltaE <= 5 ? '#facc15' : '#f87171' }}>
                          ΔE = {liveDeltaE.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-36 h-36 md:w-40 md:h-40 rounded-2xl shadow-lg mb-4" style={{ backgroundColor: squareColor, border: '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }} />
                )}

                <div className="w-full flex items-center gap-2">
                  <div className="flex-1 min-w-0 rounded-xl px-3 py-3 text-center font-mono tracking-wider" style={{ fontSize: '16px', background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)', color: 'var(--color-ink, #F5F1EA)' }}>
                    {displayHex || '#------'}
                  </div>
                  <button onClick={copyHex} disabled={!displayHex} className="flex-shrink-0 h-12 px-4 rounded-xl text-[13px] font-semibold disabled:opacity-35" style={{ background: 'var(--color-accent, #D8A35C)', color: 'var(--color-bg, #1C1816)' }}>
                    {copied ? 'OK' : isUk ? 'Копіювати' : 'Копировать'}
                  </button>
                </div>
              </div>
            </section>
            
            <section className="rounded-2xl px-4 md:px-5 py-3.5" style={{ background: 'var(--color-surface, #25201C)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)' }}>{isUk ? 'Загальний об’єм' : 'Общий объём'}</span>
                <span className="text-[17px] font-semibold tabular-nums" style={{ color: 'var(--color-ink, #F5F1EA)' }}>
                  {totalAmount > 1000 ? (totalAmount / 1000).toFixed(2) + ' л' : totalAmount.toFixed(1) + ' мл'}
                </span>
              </div>
            </section>
          </>
        )}

        {tab === 'pro' && (
          <>
            <section className="rounded-2xl px-4 md:px-5 pt-4 pb-5" style={{ background: 'var(--color-surface, #25201C)' }}>
              <h2 className="text-[13px] font-semibold mb-3" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)' }}>{isUk ? 'Цільовий колір' : 'Целевой цвет'}</h2>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-xl flex-shrink-0 shadow-inner" style={{ backgroundColor: targetHex, border: '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 12%, transparent)' }} />
                <div className="flex-1 min-w-0">
                  <input type="text" value={targetHex} onChange={(e) => {
                      let v = e.target.value.trim()
                      if (!v.startsWith('#')) v = '#' + v
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) { setTargetHex(v.toUpperCase()); setRecipeResult(null) }
                    }} className="w-full rounded-xl px-3 py-2.5 font-mono tracking-wider text-[15px] focus:outline-none" style={{ background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)', color: 'var(--color-ink, #F5F1EA)' }} placeholder="#RRGGBB" maxLength={7} />
                </div>
              </div>
              <div className="flex gap-2 mb-3">
                {isIOS ? (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 20%, transparent)', color: 'var(--color-accent, #D8A35C)' }}>{isUk ? 'Завантажити фото' : 'Загрузить фото'}</button>
                ) : !cameraActive ? (
                  <>
                    <button type="button" onClick={startCamera} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 20%, transparent)', color: 'var(--color-accent, #D8A35C)' }}>{isUk ? 'Камера' : 'Камера'}</button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 20%, transparent)', color: 'var(--color-accent, #D8A35C)' }}>{isUk ? 'Фото' : 'Фото'}</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={captureFromCamera} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--color-accent, #D8A35C)', color: 'var(--color-bg, #1C1816)' }}>{isUk ? 'Зняти колір' : 'Снять цвет'}</button>
                    <button type="button" onClick={stopCamera} className="px-3 py-2.5 rounded-xl text-[13px] font-medium" style={{ background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)', color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)' }}>✕</button>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
                {!isIOS && <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onCameraCapture} />}
              </div>
              {cameraActive && !isIOS && (
                 <div className="relative rounded-xl overflow-hidden mb-2 bg-black">
                   <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-48 object-cover" style={{ background: '#000', minHeight: 160 }} />
                   <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.85)', borderRadius: 4, boxShadow: '0 0 0 1px rgba(0,0,0,0.4)' }} />
                 </div>
              )}
            </section>

            <section className="rounded-2xl px-4 md:px-5 py-4" style={{ background: 'var(--color-surface, #25201C)' }}>
              <div className="flex gap-2 mb-3">
                 <button onClick={() => setMaxComponents(3)} className="flex-1 py-2 rounded-lg text-[12px] font-semibold" style={{ background: maxComponents === 3 ? 'var(--color-accent, #D8A35C)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)', color: maxComponents === 3 ? 'var(--color-bg, #1C1816)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)' }}>≤ 3 {isUk ? 'пігменти' : 'пигмента'}</button>
                 <button onClick={() => setMaxComponents(4)} className="flex-1 py-2 rounded-lg text-[12px] font-semibold" style={{ background: maxComponents === 4 ? 'var(--color-accent, #D8A35C)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)', color: maxComponents === 4 ? 'var(--color-bg, #1C1816)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)' }}>≤ 4</button>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setSystem('acrylic')} className="flex-1 py-2 rounded-lg text-[12px] font-semibold" style={{ background: system === 'acrylic' ? 'var(--color-accent, #D8A35C)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)', color: system === 'acrylic' ? 'var(--color-bg, #1C1816)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)' }}>{isUk ? 'Акрил' : 'Акрил'}</button>
                 <button onClick={() => setSystem('aniline')} className="flex-1 py-2 rounded-lg text-[12px] font-semibold" style={{ background: system === 'aniline' ? 'var(--color-accent, #D8A35C)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)', color: system === 'aniline' ? 'var(--color-bg, #1C1816)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)' }}>{isUk ? 'Анілін' : 'Анилин'}</button>
              </div>
            </section>

            <section className="rounded-2xl px-4 md:px-5 py-4" style={{ background: 'var(--color-surface, #25201C)' }}>
               <div className="flex items-center justify-between mb-2 gap-2">
                <h2 className="text-[13px] font-semibold" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)' }}>{isUk ? `Інвентар (${inventoryIds.length})` : `Инвентарь (${inventoryIds.length})`}</h2>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={resetInventoryDefaults} className="text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 22%, transparent)', color: 'var(--color-accent, #D8A35C)' }}>По умолч.</button>
                  <button onClick={selectAllInventory} className="text-[11px] font-medium px-2 py-1 rounded-lg" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 55%, transparent)' }}>Все</button>
                  <button onClick={clearInventory} className="text-[11px] font-medium px-2 py-1 rounded-lg" style={{ color: 'var(--color-danger, #f87171)' }}>Сбросить</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {pigments.filter((p) => p.id !== 'acrylic_binder' && p.id !== 'cardboard' && p.spectrum).map((p) => {
                  const on = inventoryIds.includes(p.id)
                  return (
                    <button key={p.id} onClick={() => toggleInventory(p.id)} className="px-2 py-1 rounded-lg text-[11px] font-medium" style={{ background: on ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 25%, transparent)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 6%, transparent)', color: on ? 'var(--color-accent, #D8A35C)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 50%, transparent)', border: on ? '1px solid color-mix(in srgb, var(--color-accent, #D8A35C) 50%, transparent)' : '1px solid transparent' }}>
                      {pigmentName(p)}
                    </button>
                  )
                })}
              </div>
            </section>

            <button onClick={runRecipeSearch} disabled={recipeLoading || loading || !targetHex || targetHex.length < 7 || inventoryIds.length === 0} className="w-full py-3.5 rounded-xl text-[15px] font-semibold disabled:opacity-40" style={{ background: 'var(--color-accent, #D8A35C)', color: 'var(--color-bg, #1C1816)' }}>
              {recipeLoading ? (isUk ? 'Підбір…' : 'Подбор…') : (isUk ? 'Підібрати рецепт' : 'Подобрать рецепт')}
            </button>
            {recipeError && <p className="text-[13px] text-center mt-2" style={{ color: 'var(--color-danger, #f87171)' }}>{recipeError}</p>}

            {recipeResult && (
              <section className="rounded-2xl px-4 md:px-5 pt-4 pb-5 mt-4" style={{ background: 'var(--color-surface, #25201C)' }}>
                <h2 className="text-[13px] font-semibold mb-3" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)' }}>{isUk ? 'Рецепт' : 'Рецепт'}</h2>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl flex-shrink-0" style={{ backgroundColor: recipeResult.resultHex || '#333', border: '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 12%, transparent)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[15px] tracking-wider">{(recipeResult.resultHex || '').toUpperCase()}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: recipeResult.deltaE > 2 || recipeResult.approximate ? 'var(--color-danger, #f87171)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 50%, transparent)' }}>
                      ΔE₀₀ ≈ {recipeResult.deltaE.toFixed(1)} {(recipeResult.deltaE > 2 || recipeResult.approximate) && (isUk ? ' — неточне співпадіння' : ' — неточное совпадение')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  {recipeResult.recipe.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 5%, transparent)' }}>
                      <span className="text-[13px] font-medium truncate pr-2">{item.isBinder ? (isUk ? 'Зв’язуюче' : 'Связующее') : pigmentName(item.pigment)}</span>
                      <span className="text-[14px] font-semibold tabular-nums flex-shrink-0">{item.ml.toFixed(1)} мл</span>
                    </div>
                  ))}
                </div>
                <button onClick={sendRecipeToMix} className="w-full py-3 rounded-xl text-[14px] font-semibold" style={{ background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 25%, transparent)', color: 'var(--color-accent, #D8A35C)', border: '1px solid color-mix(in srgb, var(--color-accent, #D8A35C) 45%, transparent)' }}>
                  {isUk ? 'Перенести в суміш' : 'Перенести в смесь'}
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}
