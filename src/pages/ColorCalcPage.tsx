import { motion } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'

import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { loadAllPigments } from '../data/loadPigments'
import { usePaintMix } from '../hooks/usePaintMix'
import { useColorCalculations } from '../hooks/useColorCalculations'
import { PigmentSelector } from '../components/PigmentSelector'
import type { CoverageSystem, RecipeResult } from '../utils/calculatorLogic'

// ВАЖНО: Добавлен импорт для локального автоподбора
import { mixSpectra, spectrumToRGB } from '../utils/colorScience'

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

type TabId = 'mix' | 'pro'

const DEFAULT_INVENTORY_IDS = [
  'pw_6_anatase',                      // Белила титановые (PW6)
  'pbk_1_aniline_black',               // Черный (PBk1)
  'py_154_benzimidazolone_yellow_h3g', // Желтый холодный / лимонный (PY154)
  'py_83_diarylide_yellow_hr',         // Желтый теплый (PY83)
  'po_73_pyrrole_orange',              // Оранжевый (PO73)
  'pr_254_pyrrole_red',                // Красный теплый / Пиррол (PR254)
  'pr_122_quinacridone_magenta',       // Маджента / Холодный красный (PR122)
  'pv_23_dioxazine_purple',            // Фиолетовый диоксазин (PV23)
  'phthalo_blue',                      // Синий фталоциан (PB15) - в вашей базе он без индекса в названии, но это современный пигмент
  'pg_36_phthalo_green_ys',            // Зеленый фталоциан (PG36)
  'pbr_25_benzimidazolone_brown',      // Коричневый (PBr25)
  'acrylic_binder',                    // Обязательная прозрачная база
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

// --- Утилиты для расчета DeltaE CIEDE2000 ---
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
  const [isWet, setIsWet] = useState(false)
  const [isAutoAdjusting, setIsAutoAdjusting] = useState(false)

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
    isWet,
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

  const isIOS = isIOSRef.current
  const displayHex = mixedColor?.hex ? mixedColor.hex.toUpperCase() : null
  const squareColor = displayHex || '#2A2522'

  const t = {
    ru: {
      title: 'Калькулятор цвета',
      mixTab: 'Смесь',
      mixComposition: 'Состав смеси',
      clear: 'Очистить',
      loading: 'Загрузка…',
      loadError: 'Ошибка загрузки пигментов',
      retry: 'Повторить',
      addPigment: '+ Добавить пигмент',
      autoAdjust: '✨ Автоподбор',
      adjusting: 'Подбор...',
      result: 'Результат',
      wet: '💧 На палитре (мокрая)',
      dry: '💨 На холсте (сухая)',
      reset: 'Сбросить',
      target: 'Цель',
      mix: 'Смесь',
      deviation: 'Отклонение',
      cieStandard: 'Стандарт CIE ΔE₂₀₀₀',
      ciePerfect: 'Визуально неотличимо (идеальное совпадение)',
      cieAcceptable: 'Коммерчески приемлемо (допустимое отклонение)',
      cieBad: 'Заметное расхождение (требует корректировки)',
      copy: 'Копировать',
      totalVolume: 'Общий объём',
      targetColor: 'Целевой цвет',
      uploadPhoto: 'Загрузить фото',
      camera: 'Камера',
      photo: 'Фото',
      pickColor: 'Снять цвет',
      maxPigments: 'пигмента',
      acrylic: 'Акрил',
      aniline: 'Анилин',
      inventory: 'Инвентарь',
      default: 'По умолч.',
      all: 'Все',
      picking: 'Подбор…',
      pickRecipe: 'Подобрать рецепт',
      recipeError: 'Не удалось подобрать рецепт',
      cameraNotReady: 'Камера ещё не готова, подождите секунду',
      recipe: 'Рецепт',
      inexactMatch: ' — неточное совпадение',
      binder: 'Связующее',
      moveToMix: 'Перенести в смесь'
    },
    uk: {
      title: 'Калькулятор кольору',
      mixTab: 'Суміш',
      mixComposition: 'Склад суміші',
      clear: 'Очистити',
      loading: 'Завантаження…',
      loadError: 'Помилка завантаження пігментів',
      retry: 'Спробувати знову',
      addPigment: '+ Додати пігмент',
      autoAdjust: '✨ Автопідбір',
      adjusting: 'Підбір...',
      result: 'Результат',
      wet: '💧 На палітрі (мокра)',
      dry: '💨 На полотні (суха)',
      reset: 'Скинути',
      target: 'Ціль',
      mix: 'Суміш',
      deviation: 'Відхилення',
      cieStandard: 'Стандарт CIE ΔE₂₀₀₀',
      ciePerfect: 'Візуально невідрізнимо (ідеальний збіг)',
      cieAcceptable: 'Комерційно прийнятно (допустиме відхилення)',
      cieBad: 'Помітна розбіжність (потребує коригування)',
      copy: 'Копіювати',
      totalVolume: 'Загальний об’єм',
      targetColor: 'Цільовий колір',
      uploadPhoto: 'Завантажити фото',
      camera: 'Камера',
      photo: 'Фото',
      pickColor: 'Зняти колір',
      maxPigments: 'пігменти',
      acrylic: 'Акрил',
      aniline: 'Анілін',
      inventory: 'Інвентар',
      default: 'За замовч.',
      all: 'Усі',
      picking: 'Підбір…',
      pickRecipe: 'Підібрати рецепт',
      recipeError: 'Не вдалося підібрати рецепт',
      cameraNotReady: 'Камера ще не готова, зачекайте секунду',
      recipe: 'Рецепт',
      inexactMatch: ' — неточне співпадіння',
      binder: 'Зв’язуюче',
      moveToMix: 'Перенести в суміш'
    },
    de: {
      title: 'Farbkalkulator',
      mixTab: 'Mischung',
      mixComposition: 'Mischungszusammensetzung',
      clear: 'Leeren',
      loading: 'Laden…',
      loadError: 'Fehler beim Laden der Pigmente',
      retry: 'Wiederholen',
      addPigment: '+ Pigment hinzufügen',
      autoAdjust: '✨ Auto-Anpassung',
      adjusting: 'Anpassen...',
      result: 'Ergebnis',
      wet: '💧 Auf Palette (nass)',
      dry: '💨 Auf Leinwand (trocken)',
      reset: 'Zurücksetzen',
      target: 'Ziel',
      mix: 'Mischung',
      deviation: 'Abweichung',
      cieStandard: 'CIE ΔE₂₀₀₀ Standard',
      ciePerfect: 'Optisch nicht unterscheidbar (perfekte Übereinstimmung)',
      cieAcceptable: 'Kommerziell akzeptabel (zulässige Abweichung)',
      cieBad: 'Spürbare Diskrepanz (Korrektur erforderlich)',
      copy: 'Kopieren',
      totalVolume: 'Gesamtvolumen',
      targetColor: 'Zielfarbe',
      uploadPhoto: 'Foto hochladen',
      camera: 'Kamera',
      photo: 'Foto',
      pickColor: 'Farbe aufnehmen',
      maxPigments: 'Pigmente',
      acrylic: 'Acryl',
      aniline: 'Anilin',
      inventory: 'Inventar',
      default: 'Standard',
      all: 'Alle',
      picking: 'Suchen…',
      pickRecipe: 'Rezept finden',
      recipeError: 'Rezept konnte nicht gefunden werden',
      cameraNotReady: 'Kamera ist noch nicht bereit, bitte warten',
      recipe: 'Rezept',
      inexactMatch: ' — ungenaue Übereinstimmung',
      binder: 'Bindemittel',
      moveToMix: 'In Mischung übernehmen'
    }
  }[lang]

  const pigmentName = (p: Pigment) => {
    if (lang === 'uk') return p.name.uk;
    if (lang === 'de') return (p.name as any).de || p.name.ru;
    return p.name.ru;
  }

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
      setRecipeError(t.cameraNotReady)
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
      if (!result) setRecipeError(t.recipeError)
    }

    worker.addEventListener('message', onMsg)
    worker.postMessage({
      id, targetHex, basicPigments: pigments, maxComponents, targetVolume: 20, system, activeIds: inventoryIds, excludeIds: ['cardboard']
    })
  }

  // --- ИСПРАВЛЕННЫЙ АВТОПОДБОР: Локальный, точный, без раздутия объемов ---
  const autoAdjustCurrentMix = () => {
    if (!activeTarget || paints.length === 0 || pigments.length === 0) return;
    setIsAutoAdjusting(true);

    // Небольшая задержка, чтобы UI успел показать статус "Подбор..."
    setTimeout(() => {
      try {
        const targetLab = rgbToLab(hexToRgb(activeTarget));
        
        // Отделяем цветные пигменты от биндера
        const colorPaints = paints.filter(p => p.pigmentId !== 'acrylic_binder' && p.pigmentId !== 'cardboard');
        const binderPaint = paints.find(p => p.pigmentId === 'acrylic_binder');
        
        if (colorPaints.length === 0) {
          setIsAutoAdjusting(false);
          return;
        }

        const activePigments = colorPaints.map(p => ({
          paintId: p.id,
          pigment: pigments.find(pig => pig.id === p.pigmentId)!
        })).filter(p => p.pigment !== undefined);

        const n = activePigments.length;
        let bestVols = colorPaints.map(p => parseFloat(p.amount) || 0.1);
        let minDE = Infinity;

        // Внутренний хелпер для оценки объемов
        const evalVols = (v: number[]) => {
          const components = activePigments.map((ap, i) => ({ spectrum: ap.pigment.spectrum!, volume: v[i] }));
          const mixedSpectrum = mixSpectra(components, false); // Всегда подгоняем под сухой цвет!
          if (!mixedSpectrum.length) return Infinity;
          
          const rgb = spectrumToRGB(mixedSpectrum);
          const lab = rgbToLab([rgb.r, rgb.g, rgb.b]);
          
          // Локальная конвертация для совместимости
          const toHex = (n: number) => {
            const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          };
          const mixedHex = '#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
          
          const de = calculateDeltaE2000(activeTarget, mixedHex);
          
          if (de < minDE) {
            minDE = de;
            bestVols = [...v];
          }
          return de;
        };

        // Точка старта
        evalVols(bestVols);

        // Градиентный спуск для поиска идеальных объемов
        let improved = true;
        let pass = 0;
        const shifts = [5, 1, 0.5, 0.1, 0.05, 0.01];
        
        while (improved && pass < 50) {
          improved = false;
          pass++;
          for (const s of shifts) {
            for (let i = 0; i < n; i++) {
              let test = [...bestVols];
              test[i] += s;
              let de = evalVols(test);
              if (de < minDE - 0.001) improved = true;
              
              if (bestVols[i] - s >= 0.01) { // Не даем опуститься ниже 0.01 мл
                test = [...bestVols];
                test[i] -= s;
                de = evalVols(test);
                if (de < minDE - 0.001) improved = true;
              }
            }
          }
        }

        // ЖЕЛЕЗНОЕ ПРАВИЛО: Сохраняем изначальный общий объем смеси!
        const oldColorVol = colorPaints.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const newColorVol = bestVols.reduce((sum, v) => sum + v, 0);
        const scale = oldColorVol > 0 && newColorVol > 0 ? (oldColorVol / newColorVol) : 1;

        activePigments.forEach((ap, i) => {
          const newVol = Number((bestVols[i] * scale).toFixed(2));
          updatePaint(ap.paintId, 'amount', String(newVol));
        });

        if (binderPaint) {
          const oldBinderVol = parseFloat(binderPaint.amount) || 0;
          const binderRatio = oldColorVol > 0 ? oldBinderVol / oldColorVol : 0;
          const newBinderVol = Number((newColorVol * scale * binderRatio).toFixed(2));
          updatePaint(binderPaint.id, 'amount', String(newBinderVol));
        }

      } catch (err) {
        console.error(err);
      } finally {
        setIsAutoAdjusting(false);
      }
    }, 50); // Микропауза для UI
  }

  const sendRecipeToMix = () => {
    if (!recipeResult?.recipe?.length) return
    applyRecipe(
      recipeResult.recipe.map((item) => ({ 
        pigmentId: item.pigment.id, 
        ml: item.ml 
      }))
    )
    setActiveTarget(targetHex)
    stopCamera()
    setTab('mix')
  }

  const handleSystemChange = (newSystem: CoverageSystem) => {
    setSystem(newSystem)
    if (newSystem === 'aniline') {
      setInventoryIds(prev => prev.filter(id => id !== 'acrylic_binder'))
    } else if (newSystem === 'acrylic') {
      const hasBinder = pigments.some(p => p.id === 'acrylic_binder')
      if (hasBinder) {
        setInventoryIds(prev => prev.includes('acrylic_binder') ? prev : [...prev, 'acrylic_binder'])
      }
    }
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
          {t.title}
        </h1>
      </header>

      <div className="flex gap-2 mb-4">
        {tabBtn('mix', t.mixTab)}
        {tabBtn('pro', 'Pro')}
      </div>

      <div className="flex-1 flex flex-col gap-4 mt-1">
        {tab === 'mix' && (
          <>
            <section className="rounded-2xl overflow-visible relative z-10" style={{ background: 'var(--color-surface, #25201C)' }}>
              <div className="px-4 md:px-5 pt-4 pb-3 flex items-center justify-between">
                <h2 className="text-[13px] font-semibold" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)' }}>
                  {t.mixComposition}
                </h2>
                {totalAmount > 0 && (
                  <button onClick={clearAllAmounts} className="text-[12px] font-medium px-2 py-1 -mr-1 rounded-lg" style={{ color: 'var(--color-danger, #f87171)' }}>
                    {t.clear}
                  </button>
                )}
              </div>

              <div className="px-4 md:px-5 pb-4">
                {loading ? (
                  <div className="py-8 text-center text-[13px]" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 40%, transparent)' }}>{t.loading}</div>
                ) : loadError ? (
                  <div className="py-6 flex flex-col items-center gap-3">
                    <p className="text-[13px] text-center" style={{ color: 'var(--color-danger, #f87171)' }}>{t.loadError}</p>
                    <button onClick={loadPigments} className="px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--color-accent, #D8A35C)', color: 'var(--color-bg, #1C1816)' }}>
                      {t.retry}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {paints.map((paint) => {
                      const currentAmount = parseFloat(paint.amount) || 0;
                      const sliderMax = Math.max(20, Math.ceil(currentAmount * 1.5));
                      
                      return (
                        <div key={paint.id} className="flex flex-col gap-2 p-3 rounded-2xl" style={{ background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)' }}>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0 pr-1">
                              <PigmentSelector pigments={pigments} value={paint.pigmentId} onChange={(newId) => updatePaint(paint.id, 'pigmentId', newId)} lang={lang} />
                            </div>
                            
                            {/* --- ИСПРАВЛЕННЫЙ БЛОК ВВОДА С DELTA E --- */}
                            <div className="flex flex-col items-end w-[75px] flex-shrink-0 relative">
                              <div className="flex items-center justify-end gap-1 w-full">
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
                                <span className="text-[12px] font-medium" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 40%, transparent)' }}>мл</span>
                              </div>
                              
                              {/* Индикатор Delta E под цифрами */}
                              {activeTarget && liveDeltaE !== null && (
                                <div 
                                  className="text-[10px] font-bold text-right w-full pr-[18px] transition-colors leading-none pt-1" 
                                  style={{ color: liveDeltaE <= 2 ? '#4ade80' : liveDeltaE <= 5 ? '#facc15' : '#f87171' }}
                                >
                                  ΔE {liveDeltaE.toFixed(1)}
                                </div>
                              )}
                            </div>
                            {/* --- КОНЕЦ ИСПРАВЛЕННОГО БЛОКА --- */}

                            <button onClick={() => removePaint(paint.id)} disabled={paints.length <= 1} className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 disabled:opacity-15 active:bg-white/10" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 28%, transparent)' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                          </div>

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
                
                <div className="flex gap-2 mt-4">
                  <button onClick={addPaint} disabled={loading || loadError} className="flex-1 py-3 rounded-xl text-[14px] font-medium disabled:opacity-40" style={{ border: '1px dashed color-mix(in srgb, var(--color-accent, #D8A35C) 45%, transparent)', color: 'var(--color-accent, #D8A35C)' }}>
                    {t.addPigment}
                  </button>
                  
                  {activeTarget && paints.filter(p => p.pigmentId !== 'acrylic_binder').length > 0 && (
                    <button 
                      onClick={autoAdjustCurrentMix} 
                      disabled={isAutoAdjusting || loading} 
                      className="flex-1 py-3 rounded-xl text-[14px] font-semibold disabled:opacity-40 transition-colors shadow-sm relative overflow-hidden" 
                      style={{ 
                        background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 20%, transparent)', 
                        color: 'var(--color-accent, #D8A35C)', 
                        border: '1px solid color-mix(in srgb, var(--color-accent, #D8A35C) 40%, transparent)' 
                      }}
                    >
                      {isAutoAdjusting ? t.adjusting : t.autoAdjust}
                    </button>
                  )}
                </div>

              </div>
            </section>

            <section className="rounded-2xl px-4 md:px-5 pt-4 pb-5 calc-result-card" style={{ background: 'var(--color-surface, #25201C)' }}>
              
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[13px] font-semibold" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)' }}>
                  {t.result}
                </h2>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsWet(!isWet)}
                    className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors border flex items-center gap-1.5"
                    style={{
                       borderColor: isWet ? 'var(--color-accent, #D8A35C)' : 'transparent',
                       color: isWet ? 'var(--color-accent, #D8A35C)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 60%, transparent)',
                       background: isWet ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 15%, transparent)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 6%, transparent)'
                    }}
                  >
                    {isWet ? t.wet : t.dry}
                  </button>

                  {activeTarget && (
                    <button onClick={() => setActiveTarget(null)} className="text-[11px] font-medium text-red-400 ml-1">
                      {t.reset}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center">
                
                {activeTarget ? (
                  <div className="w-full flex flex-col items-center gap-3 mb-4">
                    <div className="flex w-full justify-center gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-2xl shadow-lg mb-2" style={{ backgroundColor: activeTarget, border: '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }} />
                        <span className="text-[11px] font-semibold uppercase">{t.target}</span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-2xl shadow-lg mb-2" style={{ backgroundColor: squareColor, border: '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }} />
                        <span className="text-[11px] font-semibold uppercase">{t.mix}</span>
                      </div>
                    </div>

                    {liveDeltaE !== null && (
                      <div className="px-4 py-2 rounded-xl text-center transition-colors flex flex-col items-center" style={{ background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)' }}>
                        <span className="text-[12px] opacity-70 block mb-0.5">{t.deviation}</span>
                        <span className="text-[18px] font-bold" style={{ color: liveDeltaE <= 2 ? '#4ade80' : liveDeltaE <= 5 ? '#facc15' : '#f87171' }}>
                          ΔE = {liveDeltaE.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {liveDeltaE !== null && (
                      <div className="w-full mt-1 p-3 rounded-xl border" style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)', background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 3%, transparent)' }}>
                        <p className="text-[10px] font-semibold mb-2 opacity-60 uppercase tracking-wider text-center">
                          {t.cieStandard}
                        </p>
                        <div className="flex flex-col gap-1.5 text-[11px]">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[#4ade80]" />
                            <span style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)' }}>
                              <strong>ΔE ≤ 2.0:</strong> {t.ciePerfect}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[#facc15]" />
                            <span style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)' }}>
                              <strong>ΔE 2.0 – 5.0:</strong> {t.cieAcceptable}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[#f87171]" />
                            <span style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)' }}>
                              <strong>ΔE &gt; 5.0:</strong> {t.cieBad}
                            </span>
                          </div>
                        </div>
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
                    {copied ? 'OK' : t.copy}
                  </button>
                </div>
              </div>
            </section>
            
            <section className="rounded-2xl px-4 md:px-5 py-3.5" style={{ background: 'var(--color-surface, #25201C)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)' }}>{t.totalVolume}</span>
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
              <h2 className="text-[13px] font-semibold mb-3" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)' }}>{t.targetColor}</h2>
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
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 20%, transparent)', color: 'var(--color-accent, #D8A35C)' }}>{t.uploadPhoto}</button>
                ) : !cameraActive ? (
                  <>
                    <button type="button" onClick={startCamera} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 20%, transparent)', color: 'var(--color-accent, #D8A35C)' }}>{t.camera}</button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 20%, transparent)', color: 'var(--color-accent, #D8A35C)' }}>{t.photo}</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={captureFromCamera} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--color-accent, #D8A35C)', color: 'var(--color-bg, #1C1816)' }}>{t.pickColor}</button>
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
                 <button onClick={() => setMaxComponents(3)} className="flex-1 py-2 rounded-lg text-[12px] font-semibold" style={{ background: maxComponents === 3 ? 'var(--color-accent, #D8A35C)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)', color: maxComponents === 3 ? 'var(--color-bg, #1C1816)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)' }}>≤ 3 {t.maxPigments}</button>
                 <button onClick={() => setMaxComponents(4)} className="flex-1 py-2 rounded-lg text-[12px] font-semibold" style={{ background: maxComponents === 4 ? 'var(--color-accent, #D8A35C)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)', color: maxComponents === 4 ? 'var(--color-bg, #1C1816)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)' }}>≤ 4</button>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => handleSystemChange('acrylic')} className="flex-1 py-2 rounded-lg text-[12px] font-semibold" style={{ background: system === 'acrylic' ? 'var(--color-accent, #D8A35C)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)', color: system === 'acrylic' ? 'var(--color-bg, #1C1816)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)' }}>{t.acrylic}</button>
                 <button onClick={() => handleSystemChange('aniline')} className="flex-1 py-2 rounded-lg text-[12px] font-semibold" style={{ background: system === 'aniline' ? 'var(--color-accent, #D8A35C)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)', color: system === 'aniline' ? 'var(--color-bg, #1C1816)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 70%, transparent)' }}>{t.aniline}</button>
              </div>
            </section>

            <section className="rounded-2xl px-4 md:px-5 py-4" style={{ background: 'var(--color-surface, #25201C)' }}>
               <div className="flex items-center justify-between mb-2 gap-2">
                <h2 className="text-[13px] font-semibold" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)' }}>{t.inventory} ({inventoryIds.length})</h2>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={resetInventoryDefaults} className="text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 22%, transparent)', color: 'var(--color-accent, #D8A35C)' }}>{t.default}</button>
                  <button onClick={selectAllInventory} className="text-[11px] font-medium px-2 py-1 rounded-lg" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 55%, transparent)' }}>{t.all}</button>
                  <button onClick={clearInventory} className="text-[11px] font-medium px-2 py-1 rounded-lg" style={{ color: 'var(--color-danger, #f87171)' }}>{t.reset}</button>
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
              {recipeLoading ? t.picking : t.pickRecipe}
            </button>
            {recipeError && <p className="text-[13px] text-center mt-2" style={{ color: 'var(--color-danger, #f87171)' }}>{recipeError}</p>}

            {recipeResult && (
              <section className="rounded-2xl px-4 md:px-5 pt-4 pb-5 mt-4" style={{ background: 'var(--color-surface, #25201C)' }}>
                <h2 className="text-[13px] font-semibold mb-3" style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)' }}>{t.recipe}</h2>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl flex-shrink-0" style={{ backgroundColor: recipeResult.resultHex || '#333', border: '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 12%, transparent)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[15px] tracking-wider">{(recipeResult.resultHex || '').toUpperCase()}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: recipeResult.deltaE > 2 || recipeResult.approximate ? 'var(--color-danger, #f87171)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 50%, transparent)' }}>
                      ΔE₀₀ ≈ {recipeResult.deltaE.toFixed(1)} {(recipeResult.deltaE > 2 || recipeResult.approximate) && t.inexactMatch}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  {recipeResult.recipe.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 5%, transparent)' }}>
                      <span className="text-[13px] font-medium truncate pr-2">{item.isBinder ? t.binder : pigmentName(item.pigment)}</span>
                      <span className="text-[14px] font-semibold tabular-nums flex-shrink-0">{item.ml.toFixed(1)} мл</span>
                    </div>
                  ))}
                </div>
                <button onClick={sendRecipeToMix} className="w-full py-3 rounded-xl text-[14px] font-semibold" style={{ background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 25%, transparent)', color: 'var(--color-accent, #D8A35C)', border: '1px solid color-mix(in srgb, var(--color-accent, #D8A35C) 45%, transparent)' }}>
                  {t.moveToMix}
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}
