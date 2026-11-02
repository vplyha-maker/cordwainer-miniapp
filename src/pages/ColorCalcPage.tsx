import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { loadAllPigments } from '../data/loadPigments'
import { usePaintMix } from '../hooks/usePaintMix'
import { useColorCalculations } from '../hooks/useColorCalculations'
import { PigmentSelector } from '../components/PigmentSelector'
import {
  type CoverageSystem,
  type RecipeResult,
  getPigmentCategory,
  simulateLayersKM,
  rgbToLab,
  calculateDeltaE2000,
  hexToRgbObj,
} from '../utils/calculatorLogic'

import { mixSpectra, spectrumToRGB, rgbToHex } from '../utils/colorScience'

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

type TabId = 'mix' | 'pro'

const DEFAULT_INVENTORY_IDS = [
  'pw_6_anatase',
  'pbk_1_aniline_black',
  'py_154_benzimidazolone_yellow_h3g',
  'py_83_diarylide_yellow_hr',
  'po_73_pyrrole_orange',
  'pr_254_pyrrole_red',
  'pr_122_quinacridone_magenta',
  'pv_23_dioxazine_purple',
  'phthalo_blue',
  'pg_36_phthalo_green_ys',
  'pbr_25_benzimidazolone_brown',
  'acrylic_binder',
] as const

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true
  return false
}

function calculateDeltaE2000Hex(hex1: string, hex2: string): number {
  const rgb1 = hexToRgbObj(hex1)
  const rgb2 = hexToRgbObj(hex2)
  return calculateDeltaE2000(
    rgbToLab(rgb1.r, rgb1.g, rgb1.b),
    rgbToLab(rgb2.r, rgb2.g, rgb2.b)
  )
    }

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [copied, setCopied] = useState(false)

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
  const [activeCategory, setActiveCategory] = useState<string>('ALL')

  const liveDeltaE =
    activeTarget && mixedColor?.hex
      ? calculateDeltaE2000Hex(activeTarget, mixedColor.hex)
      : null

  const [inventoryIds, setInventoryIds] = useState<string[]>([])
  const [maxComponents, setMaxComponents] = useState<3 | 4>(3)
  const [system, setSystem] = useState<CoverageSystem>('acrylic')
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [recipeResult, setRecipeResult] = useState<RecipeResult | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const uploadedImgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null)
  const [pickerCrosshair, setPickerCrosshair] = useState<{ x: number; y: number } | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const reqIdRef = useRef(0)
  const isIOSRef = useRef(detectIOS())

  const isIOS = isIOSRef.current
  const displayHex = mixedColor?.hex ? mixedColor.hex.toUpperCase() : null
  const squareColor = displayHex || '#1E1B19'

  const mixedLab = useMemo(() => {
  if (!mixedColor?.rgb) return null
  return rgbToLab(mixedColor.rgb.r, mixedColor.rgb.g, mixedColor.rgb.b)
}, [mixedColor])

  // Симуляция выкраски в 1, 2, 3 слоя по Кубелке-Мунку
  const layerSwatches = useMemo(() => {
    if (!mixedColor?.spectrum || pigments.length === 0) return null
    const basePigment = pigments.find((p) => p.id === 'cardboard') || pigments.find((p) => p.id === 'titanium_white')
    if (!basePigment?.spectrum) return null
    const sim = simulateLayersKM(basePigment.spectrum, mixedColor.spectrum, system)
    return [
      { label: 'I', hex: rgbToHex(spectrumToRGB(sim.layer1)) },
      { label: 'II', hex: rgbToHex(spectrumToRGB(sim.layer2)) },
      { label: 'III', hex: rgbToHex(spectrumToRGB(sim.layer3)) },
      { label: '∞', hex: rgbToHex(spectrumToRGB(sim.final)) },
    ]
  }, [mixedColor, pigments, system])

  const t = {
    ru: {
      edition: 'ATELIER COLORIMETRY · КУБЕЛКА–МУНК',
      title: 'Ателье Формул',
      mixTab: 'Формула Смеси',
      proTab: 'Ателье Подбора',
      mixComposition: 'Пропорции компонентов',
      clear: 'Сбросить вес',
      loading: 'Загрузка спектрального архива…',
      loadError: 'Не удалось загрузить спектры',
      retry: 'Повторить',
      addPigment: '+ Добавить компонент',
      autoAdjust: 'Калибровать под цель',
      adjusting: 'Калибровка…',
      result: 'Карта Оттенка',
      wet: 'WET GLAZE · Мокрая',
      dry: 'DRY MATTE · Сухая',
      reset: 'Снять цель',
      target: 'Эталон',
      mix: 'Образец',
      deviation: 'Дельта',
      ciePerfect: 'Эталонный допуск Haute Couture (ΔE ≤ 2.0)',
      cieAcceptable: 'Коммерческий допуск (ΔE 2.0 – 5.0)',
      cieBad: 'Требуется корректировка тона (ΔE > 5.0)',
      copy: 'Скопировать',
      copied: 'Скопировано',
      totalVolume: 'Суммарный выход',
      targetColor: 'Целевой Образец',
      uploadPhoto: 'Загрузить Лукбук / Фото',
      camera: 'Видоискатель',
      photo: 'Фототека',
      pickColor: 'Зафиксировать тон',
      tapPhotoHint: 'Нажмите на любую область фото для снятия оттенка',
      maxPigments: 'комп.',
      acrylic: 'Акрил (Кроющий)',
      aniline: 'Анилин (Лессировка)',
      inventory: 'Палитра Ателье',
      default: 'Базовая',
      all: 'Весь архив',
      picking: 'Спектральный синтез…',
      pickRecipe: 'Синтезировать Рецепт',
      recipeError: 'Не удалось синтезировать точный рецепт',
      cameraNotReady: 'Оптика фокусируется, подождите секунду',
      recipe: 'Спецификация Рецепта',
      inexactMatch: 'Приближение',
      binder: 'Акриловое связующее (База)',
      moveToMix: 'Передать на колеровку →',
      layersTitle: 'Карта укрывистости (Слои I – III)',
      ml: 'мл',
      l: 'л',
    },
    uk: {
      edition: 'ATELIER COLORIMETRY · КУБЕЛКА–МУНК',
      title: 'Ательє Формул',
      mixTab: 'Формула Суміші',
      proTab: 'Ательє Підбору',
      mixComposition: 'Пропорції компонентів',
      clear: 'Скинути вагу',
      loading: 'Завантаження спектрального архіву…',
      loadError: 'Помилка завантаження спектрів',
      retry: 'Повторити',
      addPigment: '+ Додати компонент',
      autoAdjust: 'Калібрувати під ціль',
      adjusting: 'Калібрування…',
      result: 'Карта Відтінку',
      wet: 'WET GLAZE · Мокра',
      dry: 'DRY MATTE · Суха',
      reset: 'Зняти ціль',
      target: 'Еталон',
      mix: 'Зразок',
      deviation: 'Дельта',
      ciePerfect: 'Еталонний допуск Haute Couture (ΔE ≤ 2.0)',
      cieAcceptable: 'Комерційний допуск (ΔE 2.0 – 5.0)',
      cieBad: 'Потребує коригування тону (ΔE > 5.0)',
      copy: 'Скопіювати',
      copied: 'Скопійовано',
      totalVolume: 'Сумарний вихід',
      targetColor: 'Цільовий Зразок',
      uploadPhoto: 'Завантажити Лукбук / Фото',
      camera: 'Видошукач',
      photo: 'Фототека',
      pickColor: 'Зафіксувати тон',
      tapPhotoHint: 'Натисніть на будь-яку ділянку фото для зняття відтінку',
      maxPigments: 'комп.',
      acrylic: 'Акрил (Криючий)',
      aniline: 'Анілін (Лесування)',
      inventory: 'Палітра Ательє',
      default: 'Базова',
      all: 'Увесь архів',
      picking: 'Спектральний синтез…',
      pickRecipe: 'Синтезувати Рецепт',
      recipeError: 'Не вдалося синтезувати рецепт',
      cameraNotReady: 'Оптика фокусується, зачекайте секунду',
      recipe: 'Специфікація Рецепта',
      inexactMatch: 'Наближення',
      binder: 'Акрилове зв’язуюче (База)',
      moveToMix: 'Передати на колерування →',
      layersTitle: 'Карта покривності (Шари I – III)',
      ml: 'мл',
      l: 'л',
    },
    de: {
      edition: 'ATELIER COLORIMETRY · KUBELKA–MUNK',
      title: 'Farb-Atelier',
      mixTab: 'Rezeptur',
      proTab: 'Atelier-Matching',
      mixComposition: 'Komponenten & Anteile',
      clear: 'Gewicht leeren',
      loading: 'Spektralarchiv wird geladen…',
      loadError: 'Fehler beim Laden der Spektren',
      retry: 'Wiederholen',
      addPigment: '+ Komponente hinzufügen',
      autoAdjust: 'Auf Ziel kalibrieren',
      adjusting: 'Kalibrierung…',
      result: 'Farbkarte',
      wet: 'WET GLAZE · Nass',
      dry: 'DRY MATTE · Trocken',
      reset: 'Ziel lösen',
      target: 'Referenz',
      mix: 'Muster',
      deviation: 'Delta',
      ciePerfect: 'Haute-Couture-Toleranz (ΔE ≤ 2.0)',
      cieAcceptable: 'Kommerziell akzeptabel (ΔE 2.0 – 5.0)',
      cieBad: 'Tonkorrektur erforderlich (ΔE > 5.0)',
      copy: 'Kopieren',
      copied: 'Kopiert',
      totalVolume: 'Gesamtvolumen',
      targetColor: 'Ziel-Referenz',
      uploadPhoto: 'Lookbook / Foto laden',
      camera: 'Sucher',
      photo: 'Galerie',
      pickColor: 'Farbton erfassen',
      tapPhotoHint: 'Tippen Sie auf das Foto, um den Farbton aufzunehmen',
      maxPigments: 'Komp.',
      acrylic: 'Acryl (Deckend)',
      aniline: 'Anilin (Lasur)',
      inventory: 'Atelier-Archiv',
      default: 'Standard',
      all: 'Alle',
      picking: 'Spektralsynthese…',
      pickRecipe: 'Rezeptur Synthetisieren',
      recipeError: 'Rezeptur konnte nicht erstellt werden',
      cameraNotReady: 'Kamera fokussiert, bitte warten',
      recipe: 'Rezeptur-Spezifikation',
      inexactMatch: 'Annäherung',
      binder: 'Acryl-Bindemittel (Basis)',
      moveToMix: 'In Rezeptur übernehmen →',
      layersTitle: 'Deckkraft-Simulation (Schicht I – III)',
      ml: 'ml',
      l: 'l',
    },
  }[lang]

  const pigmentName = useCallback(
    (p: Pigment) => {
      if (lang === 'uk') return p.name.uk
      if (lang === 'de') return p.name.de || p.name.ru
      return p.name.ru
    },
    [lang]
  )

  const selectablePigments = useMemo(
    () => pigments.filter((p) => p.id !== 'acrylic_binder' && p.id !== 'cardboard' && p.spectrum),
    [pigments]
  )

  const categories = useMemo(() => {
    const set = new Set<string>()
    selectablePigments.forEach((p) => set.add(getPigmentCategory(p.id, lang)))
    return ['ALL', ...Array.from(set)]
  }, [selectablePigments, lang])

  const filteredInventoryPigments = useMemo(() => {
    if (activeCategory === 'ALL') return selectablePigments
    return selectablePigments.filter((p) => getPigmentCategory(p.id, lang) === activeCategory)
  }, [selectablePigments, activeCategory, lang])

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
      if (stream) stream.getTracks().forEach((tr) => tr.stop())
    }
  }, [stream])

  useEffect(() => {
    return () => {
      if (uploadedPhotoUrl) URL.revokeObjectURL(uploadedPhotoUrl)
    }
  }, [uploadedPhotoUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!cameraActive || !stream || !video) return
    video.srcObject = stream
    video.muted = true
    video.playsInline = true

    const tryPlay = async () => {
      try {
        await video.play()
      } catch (err) {
        console.error(err)
      }
    }
    if (video.readyState >= 2) tryPlay()
    else {
      const onMeta = () => tryPlay()
      video.addEventListener('loadedmetadata', onMeta)
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
    try {
      await navigator.clipboard?.writeText(displayHex)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Fallback
    }
  }

  const sampleFromSource = useCallback(
    (source: HTMLVideoElement | HTMLImageElement, cx?: number, cy?: number) => {
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

      const canvas = document.createElement('canvas')
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)
      const data = ctx.getImageData(0, 0, sw, sh).data

      let sumR = 0, sumG = 0, sumB = 0
      const pixels = sw * sh
      for (let i = 0; i < data.length; i += 4) {
        sumR += data[i]
        sumG += data[i + 1]
        sumB += data[i + 2]
      }

      const r = Math.round(sumR / pixels)
      const g = Math.round(sumG / pixels)
      const b = Math.round(sumB / pixels)
      const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()

      setTargetHex(hex)
      setRecipeResult(null)
      setRecipeError(null)
    },
    []
  )

  const handleImageFile = (file: File | undefined | null) => {
    if (!file || !file.type.startsWith('image/')) return
    stopCamera()
    if (uploadedPhotoUrl) URL.revokeObjectURL(uploadedPhotoUrl)
    const url = URL.createObjectURL(file)
    setUploadedPhotoUrl(url)
    setPickerCrosshair({ x: 50, y: 50 })
  }

  const handlePhotoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = uploadedImgRef.current
    if (!img || !img.naturalWidth) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    setPickerCrosshair({ x: relX * 100, y: relY * 100 })
    sampleFromSource(img, relX * img.naturalWidth, relY * img.naturalHeight)
  }

  const startCamera = () => {
    setRecipeError(null)
    setUploadedPhotoUrl(null)
    if (isIOSRef.current) {
      fileInputRef.current?.click()
      return
    }
    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        cameraInputRef.current?.click()
        return
      }
      try {
        if (stream) {
          stream.getTracks().forEach((tr) => tr.stop())
          setStream(null)
        }
        let media: MediaStream
        try {
          media = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          })
        } catch {
          media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        }
        setStream(media)
        setCameraActive(true)
      } catch {
        setCameraActive(false)
        setStream(null)
        cameraInputRef.current?.click()
      }
    })()
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((tr) => tr.stop())
      setStream(null)
    }
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

  // Исправленный локальный автоподбор: без бага мутации, учитывает isWet и пустые поля
  const autoAdjustCurrentMix = () => {
    if (!activeTarget || paints.length === 0 || pigments.length === 0) return
    setIsAutoAdjusting(true)

    setTimeout(() => {
      try {
        const colorPaints = paints.filter((p) => p.pigmentId !== 'acrylic_binder' && p.pigmentId !== 'cardboard')
        const binderPaint = paints.find((p) => p.pigmentId === 'acrylic_binder')

        const activePigments = colorPaints
          .map((p) => ({
            paintId: p.id,
            amount: parseFloat(p.amount) || 0,
            pigment: pigments.find((pig) => pig.id === p.pigmentId)!,
          }))
          .filter((p) => p.pigment?.spectrum)

        const n = activePigments.length
        if (n === 0) {
          setIsAutoAdjusting(false)
          return
        }

        const initialTotal = activePigments.reduce((s, p) => s + p.amount, 0)
        const targetTotalVol = initialTotal > 0 ? initialTotal : 20

        let bestVols = activePigments.map((p) => (p.amount > 0 ? p.amount : targetTotalVol / n))
        let minDE = Infinity

        const evaluate = (v: number[]) => {
          const components = activePigments.map((ap, i) => ({
            spectrum: ap.pigment.spectrum!,
            volume: v[i],
          }))
          const mixedSpec = mixSpectra(components, isWet)
          if (!mixedSpec.length) return Infinity
          const rgb = spectrumToRGB(mixedSpec)
          const hex = rgbToHex(rgb)
          return calculateDeltaE2000Hex(activeTarget, hex)
        }

        minDE = evaluate(bestVols)

        const shifts = [4, 1.5, 0.5, 0.15, 0.04]
        for (const s of shifts) {
          let improved = true
          let pass = 0
          while (improved && pass < 20) {
            improved = false
            pass++
            for (let i = 0; i < n; i++) {
              const baseVols = [...bestVols]

              // Шаг вверх
              const testUp = [...baseVols]
              testUp[i] += s
              const deUp = evaluate(testUp)
              if (deUp < minDE - 0.001) {
                minDE = deUp
                bestVols = testUp
                improved = true
                continue
              }

              // Шаг вниз (по оригинальному baseVols!)
              if (baseVols[i] - s >= 0.02) {
                const testDown = [...baseVols]
                testDown[i] -= s
                const deDown = evaluate(testDown)
                if (deDown < minDE - 0.001) {
                  minDE = deDown
                  bestVols = testDown
                  improved = true
                }
              }
            }
          }
        }

        const newSum = bestVols.reduce((s, v) => s + v, 0)
        const scale = newSum > 0 ? targetTotalVol / newSum : 1

        activePigments.forEach((ap, i) => {
          const finalVol = Math.max(0.05, Number((bestVols[i] * scale).toFixed(2)))
          updatePaint(ap.paintId, 'amount', String(finalVol))
        })

        if (binderPaint) {
          const oldBinder = parseFloat(binderPaint.amount) || 0
          const ratio = initialTotal > 0 ? oldBinder / initialTotal : 0.2
          updatePaint(binderPaint.id, 'amount', String(Number((targetTotalVol * ratio).toFixed(2))))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsAutoAdjusting(false)
      }
    }, 40)
  }

  const sendRecipeToMix = () => {
    if (!recipeResult?.recipe?.length) return
    applyRecipe(
      recipeResult.recipe.map((item) => ({
        pigmentId: item.pigment.id,
        ml: item.ml,
      }))
    )
    setActiveTarget(targetHex)
    stopCamera()
    setTab('mix')
  }

  const handleSystemChange = (newSystem: CoverageSystem) => {
    setSystem(newSystem)
    if (newSystem === 'aniline') {
      setInventoryIds((prev) => prev.filter((id) => id !== 'acrylic_binder'))
    } else if (newSystem === 'acrylic') {
      const hasBinder = pigments.some((p) => p.id === 'acrylic_binder')
      if (hasBinder) {
        setInventoryIds((prev) => (prev.includes('acrylic_binder') ? prev : [...prev, 'acrylic_binder']))
      }
    }
  }

  const toggleInventory = (pid: string) =>
    setInventoryIds((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]))

  const selectAllInventory = () => {
    const ids = selectablePigments.map((p) => p.id)
    if (system === 'acrylic' && pigments.some((p) => p.id === 'acrylic_binder')) {
      ids.push('acrylic_binder')
    }
    setInventoryIds(ids)
  }

  const clearInventory = () => setInventoryIds([])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="min-h-screen flex flex-col pt-safe px-4 md:px-8 pb-12 max-w-2xl mx-auto w-full"
      style={{ background: 'var(--color-bg, #141210)', color: 'var(--color-ink, #F5F1EA)' }}
    >
      {/* Editorial Top Header */}
      <header className="flex items-center justify-between py-4 border-b" style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }}>
        <button
          onClick={onBack}
          className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full transition-opacity opacity-70 hover:opacity-100"
          style={{ color: 'var(--color-ink, #F5F1EA)' }}
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[9px] tracking-[0.26em] uppercase opacity-45 font-medium">
            {t.edition}
          </span>
          <h1 className="text-[18px] font-serif tracking-wide mt-0.5" style={{ color: 'var(--color-ink, #F5F1EA)' }}>
            {t.title}
          </h1>
        </div>

        <div className="w-10 text-right font-mono text-[10px] opacity-40">N°01</div>
      </header>

      {/* Editorial Segmented Switcher */}
      <div
        className="grid grid-cols-2 p-1 rounded-none border my-5"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
          background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 3%, transparent)',
        }}
      >
        {(['mix', 'pro'] as const).map((id) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => {
                setTab(id)
                if (id !== 'pro') stopCamera()
              }}
              className="py-2.5 text-[11px] uppercase tracking-[0.18em] font-semibold transition-all"
              style={{
                background: active ? 'var(--color-ink, #F5F1EA)' : 'transparent',
                color: active ? 'var(--color-bg, #141210)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 60%, transparent)',
              }}
            >
              {id === 'mix' ? t.mixTab : t.proTab}
            </button>
          )
        })}
      </div>

      <div className="flex-1 flex flex-col gap-6">
        {tab === 'mix' && (
          <>
            {/* LOOKBOOK SWATCH CARD (Pantone / Haute Couture Style) */}
            <section
              className="border overflow-hidden transition-all"
              style={{
                background: 'var(--color-surface, #1C1917)',
                borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
              }}
            >
              {/* Top Metadata Bar */}
              <div
                className="px-4 py-3 flex items-center justify-between border-b"
                style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.22em] opacity-60 font-semibold">
                    {t.result}
                  </span>
                  {activeTarget && (
                    <button
                      onClick={() => setActiveTarget(null)}
                      className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 border"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-danger, #f87171) 40%, transparent)',
                        color: 'var(--color-danger, #f87171)',
                      }}
                    >
                      {t.reset}
                    </button>
                  )}
                </div>

                {/* Finish Toggle: Wet Glaze vs Dry Matte */}
                <button
                  onClick={() => setIsWet(!isWet)}
                  className="text-[10px] tracking-[0.14em] uppercase font-semibold px-3 py-1 border transition-all"
                  style={{
                    borderColor: isWet
                      ? 'var(--color-accent, #D8A35C)'
                      : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 18%, transparent)',
                    color: isWet ? 'var(--color-accent, #D8A35C)' : 'var(--color-ink, #F5F1EA)',
                    background: isWet
                      ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 12%, transparent)'
                      : 'transparent',
                  }}
                >
                  {isWet ? t.wet : t.dry}
                </button>
              </div>

              {/* Main Lookbook Color Field */}
              <div className="relative h-52 md:h-64 w-full flex overflow-hidden">
                {activeTarget && (
                  <div
                    className="w-1/2 h-full relative flex flex-col justify-end p-4 border-r"
                    style={{
                      backgroundColor: activeTarget,
                      borderColor: 'rgba(255,255,255,0.12)',
                    }}
                  >
                    <span className="inline-block w-fit px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] font-mono backdrop-blur-md bg-black/45 text-white">
                      {t.target} · {activeTarget}
                    </span>
                  </div>
                )}

                <div
                  className="flex-1 h-full relative flex flex-col justify-end p-4 transition-colors duration-300"
                  style={{ backgroundColor: squareColor }}
                >
                  {/* Sheen simulation for Wet Glaze vs Dry Matte */}
                  {isWet ? (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.03) 38%, rgba(0,0,0,0.08) 100%)',
                      }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 pointer-events-none opacity-15"
                      style={{
                        backgroundImage:
                          'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 0)',
                        backgroundSize: '6px 6px',
                      }}
                    />
                  )}

                  <div className="relative z-10 flex items-end justify-between w-full">
                    <span className="px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] font-mono backdrop-blur-md bg-black/45 text-white">
                      {t.mix} · {displayHex || 'UNMIXED'}
                    </span>

                    {liveDeltaE !== null && (
                      <span
                        className="px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider backdrop-blur-md bg-black/65"
                        style={{
                          color: liveDeltaE <= 2 ? '#4ade80' : liveDeltaE <= 5 ? '#facc15' : '#f87171',
                        }}
                      >
                        ΔE₀₀ {liveDeltaE.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Layer Coverage Strip (Kubelka-Munk 1–3 Coats) */}
              {layerSwatches && (
                <div
                  className="grid grid-cols-4 border-t"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }}
                >
                  {layerSwatches.map((ls) => (
                    <div key={ls.label} className="flex items-center gap-2 px-3 py-2 border-r last:border-r-0" style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)' }}>
                      <span className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" style={{ backgroundColor: ls.hex }} />
                      <span className="text-[10px] font-mono opacity-65 tracking-wider">COAT {ls.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pantone-Style Technical Specification Footer */}
              <div
                className="p-4 flex flex-wrap items-center justify-between gap-4 border-t"
                style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }}
              >
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-[0.22em] opacity-45">
                    SPECTRUM HEX / CIELAB
                  </span>
                  <div className="flex items-baseline gap-3 mt-0.5">
                    <span className="font-mono text-[20px] font-semibold tracking-wider">
                      {displayHex || '#------'}
                    </span>
                    {mixedLab && (
                      <span className="font-mono text-[11px] opacity-55">
                        L*{mixedLab.L.toFixed(0)} a*{mixedLab.a.toFixed(0)} b*{mixedLab.b.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right pr-2">
                    <span className="block text-[9px] uppercase tracking-[0.2em] opacity-45">
                      {t.totalVolume}
                    </span>
                    <span className="font-mono text-[15px] font-semibold tabular-nums">
                      {totalAmount > 1000
                        ? (totalAmount / 1000).toFixed(2) + ' ' + t.l
                        : totalAmount.toFixed(1) + ' ' + t.ml}
                    </span>
                  </div>

                  <button
                    onClick={copyHex}
                    disabled={!displayHex}
                    className="h-10 px-4 text-[11px] uppercase tracking-[0.18em] font-semibold border transition-all disabled:opacity-30"
                    style={{
                      borderColor: 'var(--color-accent, #D8A35C)',
                      background: copied ? 'var(--color-accent, #D8A35C)' : 'transparent',
                      color: copied ? 'var(--color-bg, #141210)' : 'var(--color-accent, #D8A35C)',
                    }}
                  >
                    {copied ? t.copied : t.copy}
                  </button>
                </div>
              </div>

              {liveDeltaE !== null && (
                <div
                  className="px-4 py-2 text-[11px] border-t flex items-center justify-between"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                    background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 3%, transparent)',
                  }}
                >
                  <span className="opacity-75">
                    {liveDeltaE <= 2 ? t.ciePerfect : liveDeltaE <= 5 ? t.cieAcceptable : t.cieBad}
                  </span>
                </div>
              )}
            </section>

            {/* FORMULA COMPOSITION SECTION */}
            <section
              className="border p-4 md:p-5"
              style={{
                background: 'var(--color-surface, #1C1917)',
                borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
              }}
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }}>
                <h2 className="text-[11px] uppercase tracking-[0.22em] font-semibold opacity-75">
                  {t.mixComposition}
                </h2>
                {totalAmount > 0 && (
                  <button
                    onClick={clearAllAmounts}
                    className="text-[10px] uppercase tracking-[0.16em] opacity-60 hover:opacity-100"
                    style={{ color: 'var(--color-danger, #f87171)' }}
                  >
                    {t.clear}
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-10 text-center text-[12px] uppercase tracking-[0.2em] opacity-40">
                  {t.loading}
                </div>
              ) : loadError ? (
                <div className="py-6 flex flex-col items-center gap-3">
                  <p className="text-[12px]" style={{ color: 'var(--color-danger, #f87171)' }}>
                    {t.loadError}
                  </p>
                  <button
                    onClick={loadPigments}
                    className="px-4 py-2 text-[11px] uppercase tracking-[0.16em] border"
                    style={{ borderColor: 'var(--color-accent, #D8A35C)', color: 'var(--color-accent, #D8A35C)' }}
                  >
                    {t.retry}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {paints.map((paint, idx) => {
                    const currentAmount = parseFloat(paint.amount) || 0
                    const sliderMax = Math.max(20, Math.ceil(currentAmount * 1.5))
                    const pct = totalAmount > 0 ? Math.round((currentAmount / totalAmount) * 100) : 0

                    return (
                      <div
                        key={paint.id}
                        className="p-3.5 border transition-colors"
                        style={{
                          background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 2%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)',
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[10px] opacity-35 w-5">
                            0{idx + 1}
                          </span>

                          <div className="flex-1 min-w-0">
                            <PigmentSelector
                              pigments={pigments}
                              value={paint.pigmentId}
                              onChange={(newId) => updatePaint(paint.id, 'pigmentId', newId)}
                              lang={lang}
                            />
                          </div>

                          <div className="flex items-baseline justify-end gap-1 w-[86px] flex-shrink-0">
                            <input
                              ref={(el) => {
                                if (el) amountRefs.current.set(paint.id, el)
                                else amountRefs.current.delete(paint.id)
                              }}
                              type="text"
                              inputMode="decimal"
                              enterKeyHint="done"
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
                                const val = e.target.value.replace(',', '.')
                                if (val === '.' || val === '') updatePaint(paint.id, 'amount', '')
                                else {
                                  const num = parseFloat(val)
                                  if (!isNaN(num)) updatePaint(paint.id, 'amount', String(Math.min(num, 5000)))
                                }
                              }}
                              className="w-full bg-transparent border-b border-transparent focus:border-current text-right font-mono text-[16px] font-semibold focus:outline-none p-0"
                              placeholder="0.0"
                              style={{ color: 'var(--color-ink, #F5F1EA)' }}
                            />
                            <span className="text-[11px] font-mono opacity-45">{t.ml}</span>
                          </div>

                          <span className="font-mono text-[10px] opacity-40 w-9 text-right tabular-nums">
                            {pct}%
                          </span>

                          <button
                            onClick={() => removePaint(paint.id)}
                            disabled={paints.length <= 1}
                            className="w-7 h-7 flex items-center justify-center opacity-40 hover:opacity-100 disabled:opacity-10"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="mt-2.5 pl-7 pr-2">
                          <input
                            type="range"
                            min="0"
                            max={sliderMax}
                            step="0.1"
                            value={currentAmount}
                            onChange={(e) => updatePaint(paint.id, 'amount', e.target.value)}
                            className="w-full h-1 appearance-none cursor-pointer"
                            style={{
                              background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 15%, transparent)',
                              accentColor: 'var(--color-accent, #D8A35C)',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
                <button
                  onClick={addPaint}
                  disabled={loading || loadError}
                  className="flex-1 py-3 text-[11px] uppercase tracking-[0.18em] font-semibold border transition-opacity disabled:opacity-40"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 22%, transparent)',
                    color: 'var(--color-ink, #F5F1EA)',
                  }}
                >
                  {t.addPigment}
                </button>

                {activeTarget && paints.some((p) => p.pigmentId !== 'acrylic_binder') && (
                  <button
                    onClick={autoAdjustCurrentMix}
                    disabled={isAutoAdjusting || loading}
                    className="flex-1 py-3 text-[11px] uppercase tracking-[0.18em] font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: 'var(--color-accent, #D8A35C)',
                      color: 'var(--color-bg, #141210)',
                    }}
                  >
                    {isAutoAdjusting ? t.adjusting : t.autoAdjust}
                  </button>
                )}
              </div>
            </section>
          </>
        )}

        {tab === 'pro' && (
          <>
            {/* TARGET SWATCH & INTERACTIVE LOOKBOOK SAMPLER */}
            <section
              className="border p-4 md:p-5"
              style={{
                background: 'var(--color-surface, #1C1917)',
                borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] uppercase tracking-[0.22em] font-semibold opacity-75">
                  {t.targetColor}
                </h2>
                <span className="font-mono text-[11px] opacity-45">CIEDE2000 ENGINE</span>
              </div>

              <div className="flex items-stretch gap-3 mb-4">
                <div
                  className="w-20 h-14 border flex-shrink-0"
                  style={{
                    backgroundColor: targetHex,
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 18%, transparent)',
                  }}
                />
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
                  className="flex-1 px-4 font-mono tracking-[0.15em] text-[16px] border focus:outline-none"
                  style={{
                    background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 4%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
                    color: 'var(--color-ink, #F5F1EA)',
                  }}
                  placeholder="#RRGGBB"
                  maxLength={7}
                />
              </div>

              <div className="flex gap-2 mb-3">
                {isIOS ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 text-[11px] uppercase tracking-[0.16em] font-semibold border"
                    style={{
                      borderColor: 'var(--color-accent, #D8A35C)',
                      color: 'var(--color-accent, #D8A35C)',
                    }}
                  >
                    {t.uploadPhoto}
                  </button>
                ) : !cameraActive ? (
                  <>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 py-2.5 text-[11px] uppercase tracking-[0.16em] font-semibold border"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 22%, transparent)',
                        color: 'var(--color-ink, #F5F1EA)',
                      }}
                    >
                      {t.camera}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2.5 text-[11px] uppercase tracking-[0.16em] font-semibold border"
                      style={{
                        borderColor: 'var(--color-accent, #D8A35C)',
                        color: 'var(--color-accent, #D8A35C)',
                      }}
                    >
                      {t.photo}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={captureFromCamera}
                      className="flex-1 py-2.5 text-[11px] uppercase tracking-[0.16em] font-semibold"
                      style={{
                        background: 'var(--color-accent, #D8A35C)',
                        color: 'var(--color-bg, #141210)',
                      }}
                    >
                      {t.pickColor}
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2.5 text-[11px] border"
                      style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 20%, transparent)' }}
                    >
                      ✕
                    </button>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleImageFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
                {!isIOS && (
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      handleImageFile(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                )}
              </div>

              {/* Interactive Uploaded Photo Lookbook Picker */}
              {uploadedPhotoUrl && (
                <div className="mt-3">
                  <div
                    onClick={handlePhotoClick}
                    className="relative overflow-hidden border cursor-crosshair select-none bg-black"
                    style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 16%, transparent)' }}
                  >
                    <img
                      ref={uploadedImgRef}
                      src={uploadedPhotoUrl}
                      alt="Lookbook sample"
                      onLoad={(e) => sampleFromSource(e.currentTarget)}
                      className="w-full max-h-64 object-contain mx-auto"
                    />
                    {pickerCrosshair && (
                      <div
                        className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg pointer-events-none flex items-center justify-center"
                        style={{
                          left: `${pickerCrosshair.x}%`,
                          top: `${pickerCrosshair.y}%`,
                          backgroundColor: targetHex,
                        }}
                      />
                    )}
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.14em] opacity-50 mt-1.5 text-center">
                    {t.tapPhotoHint}
                  </p>
                </div>
              )}

              {cameraActive && !isIOS && (
                <div className="relative overflow-hidden mt-2 border bg-black" style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 16%, transparent)' }}>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-52 object-cover" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-6 h-6 border border-white/90" />
                </div>
              )}
            </section>

            {/* PARAMETERS & COVERAGE SYSTEM */}
            <section
              className="border p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3"
              style={{
                background: 'var(--color-surface, #1C1917)',
                borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
              }}
            >
              <div className="flex border" style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)' }}>
                {([3, 4] as const).map((num) => (
                  <button
                    key={num}
                    onClick={() => setMaxComponents(num)}
                    className="flex-1 py-2 text-[11px] uppercase tracking-[0.15em] font-semibold"
                    style={{
                      background: maxComponents === num ? 'var(--color-accent, #D8A35C)' : 'transparent',
                      color: maxComponents === num ? 'var(--color-bg, #141210)' : 'var(--color-ink, #F5F1EA)',
                    }}
                  >
                    ≤ {num} {t.maxPigments}
                  </button>
                ))}
              </div>

              <div className="flex border" style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)' }}>
                {(['acrylic', 'aniline'] as const).map((sys) => (
                  <button
                    key={sys}
                    onClick={() => handleSystemChange(sys)}
                    className="flex-1 py-2 text-[11px] uppercase tracking-[0.12em] font-semibold"
                    style={{
                      background: system === sys ? 'var(--color-accent, #D8A35C)' : 'transparent',
                      color: system === sys ? 'var(--color-bg, #141210)' : 'var(--color-ink, #F5F1EA)',
                    }}
                  >
                    {sys === 'acrylic' ? t.acrylic : t.aniline}
                  </button>
                ))}
              </div>
            </section>

            {/* CATEGORIZED ATELIER ARCHIVE */}
            <section
              className="border p-4 md:p-5"
              style={{
                background: 'var(--color-surface, #1C1917)',
                borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
              }}
            >
              <div className="flex items-center justify-between mb-3 gap-2">
                <h2 className="text-[11px] uppercase tracking-[0.22em] font-semibold opacity-75">
                  {t.inventory} ({inventoryIds.length})
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetInventoryDefaults}
                    className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 border"
                    style={{ borderColor: 'var(--color-accent, #D8A35C)', color: 'var(--color-accent, #D8A35C)' }}
                  >
                    {t.default}
                  </button>
                  <button onClick={selectAllInventory} className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 opacity-60 hover:opacity-100">
                    {t.all}
                  </button>
                  <button onClick={clearInventory} className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 text-red-400">
                    ✕
                  </button>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-2.5 mb-3 border-b" style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] whitespace-nowrap border transition-colors"
                    style={{
                      borderColor: activeCategory === cat ? 'var(--color-ink, #F5F1EA)' : 'transparent',
                      background: activeCategory === cat ? 'color-mix(in srgb, var(--color-ink, #F5F1EA) 12%, transparent)' : 'transparent',
                    }}
                  >
                    {cat === 'ALL' ? t.all : cat}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                {filteredInventoryPigments.map((p) => {
                  const on = inventoryIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleInventory(p.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] border transition-all"
                      style={{
                        background: on
                          ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 18%, transparent)'
                          : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 3%, transparent)',
                        color: on ? 'var(--color-ink, #F5F1EA)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 50%, transparent)',
                        borderColor: on
                          ? 'var(--color-accent, #D8A35C)'
                          : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0" style={{ backgroundColor: p.hex || '#444' }} />
                      <span>{pigmentName(p)}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <button
              onClick={runRecipeSearch}
              disabled={recipeLoading || loading || !targetHex || targetHex.length < 7 || inventoryIds.length === 0}
              className="w-full py-4 text-[12px] uppercase tracking-[0.24em] font-semibold transition-opacity disabled:opacity-35"
              style={{
                background: 'var(--color-accent, #D8A35C)',
                color: 'var(--color-bg, #141210)',
              }}
            >
              {recipeLoading ? t.picking : t.pickRecipe}
            </button>

            {recipeError && (
              <p className="text-[12px] text-center" style={{ color: 'var(--color-danger, #f87171)' }}>
                {recipeError}
              </p>
            )}

            {/* SYNTHESIZED RECIPE SPECIFICATION CARD */}
            <AnimatePresence>
              {recipeResult && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="border overflow-hidden"
                  style={{
                    background: 'var(--color-surface, #1C1917)',
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 18%, transparent)',
                  }}
                >
                  <div className="grid grid-cols-2 h-28 border-b" style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 12%, transparent)' }}>
                    <div className="p-3 flex flex-col justify-between" style={{ backgroundColor: targetHex }}>
                      <span className="text-[9px] uppercase tracking-[0.2em] font-mono bg-black/50 text-white px-2 py-0.5 w-fit">
                        {t.target}
                      </span>
                      <span className="font-mono text-[12px] text-white bg-black/50 px-2 py-0.5 w-fit">
                        {targetHex}
                      </span>
                    </div>
                    <div className="p-3 flex flex-col justify-between" style={{ backgroundColor: recipeResult.resultHex || '#333' }}>
                      <span className="text-[9px] uppercase tracking-[0.2em] font-mono bg-black/50 text-white px-2 py-0.5 w-fit">
                        {t.recipe}
                      </span>
                      <span className="font-mono text-[12px] text-white bg-black/50 px-2 py-0.5 w-fit">
                        {(recipeResult.resultHex || '').toUpperCase()} · ΔE₀₀ {recipeResult.deltaE.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 md:p-5">
                    <div className="flex flex-col divide-y mb-4" style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }}>
                      {recipeResult.recipe.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-2.5"
                          style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)' }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span
                              className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                              style={{ backgroundColor: item.pigment.hex || '#888' }}
                            />
                            <span className="text-[13px] truncate">
                              {item.isBinder ? t.binder : pigmentName(item.pigment)}
                            </span>
                          </div>
                          <span className="font-mono text-[14px] font-semibold tabular-nums flex-shrink-0">
                            {item.ml.toFixed(2)} {t.ml}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={sendRecipeToMix}
                      className="w-full py-3.5 text-[11px] uppercase tracking-[0.2em] font-semibold border transition-colors"
                      style={{
                        borderColor: 'var(--color-accent, #D8A35C)',
                        background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 16%, transparent)',
                        color: 'var(--color-accent, #D8A35C)',
                      }}
                    >
                      {t.moveToMix}
                    </button>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  )
}
