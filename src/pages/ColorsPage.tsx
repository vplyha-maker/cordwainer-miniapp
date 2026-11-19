import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { Lang as AppLang } from '../App'
import {
  evaluateHarmonyContrast,
  generateHarmonyPalette,
  getCircularAngleDiff,
  getSchemeWheelAngles,
  mapPaletteToFootwear,
  rybHueToRgbHue,
  type ColorModelMode,
  type FootwearMappingPreset,
  type Scheme,
  type SneakerZoneKey,
} from './colors/colorEngine'
import { Sneaker3D } from './colors/Sneaker3D'
import {
  SNEAKER_MODELS,
  getSneakerModelConfig,
  type SneakerModelId,
} from './colors/sneakerGeometry'
import {
  TRANSLATIONS,
  getPresetSwatchLabels,
  isAppNativeLang,
  normalizeSupportedLang,
  type SupportedLang,
  type TranslationDict,
} from './colors/colorsTranslations'
import {
  expandTelegramWebApp,
  useTelegramProPayment,
} from './colors/useTelegramProPayment'
import {
  hapticHarmony,
  hapticModel,
  hapticReset,
  hapticSave,
  hapticSwatch,
  hapticTap,
  useHapticsSetting,
} from './colors/haptics'
import { useCordwainerTheme } from './colors/themeSystem'
import { ColorEditorSheet } from './colors/ColorEditorSheet'
import { SettingsSheet, ToneControlCard } from './colors/ColorLabPanels'

export {
  PRO_COLORS_PRICE_STARS,
  normalizeSupportedLang,
  isAppNativeLang,
  getPresetSwatchLabels,
  type SupportedLang,
  type TranslationDict,
} from './colors/colorsTranslations'
export {
  getCircularAngleDiff,
  rybHueToRgbHue,
  synthesizePigmentHex,
  getRelativeLuminance,
  getContrastRatio,
  getPerceptualPairContrast,
  getSchemeWheelAngles,
  generateHarmonyPalette,
  mapPaletteToFootwear,
  evaluateHarmonyContrast,
  type Scheme,
  type ColorModelMode,
  type FootwearMappingPreset,
  type SneakerColors,
  type SneakerZoneKey,
} from './colors/colorEngine'
export { type PaymentState } from './colors/useTelegramProPayment'
export { Sneaker3D } from './colors/Sneaker3D'

type ColorsPageProps = {
  onBack: () => void
  lang: AppLang
  setLang: (lang: AppLang) => void
}

type StudioTab = 'colors' | 'models' | 'harmonies' | 'palette'

type PersistedColorsState = {
  baseHue: number
  whiteAmount: number
  blackAmount: number
  chromaAmount: number
  scheme: Scheme
  modelMode: ColorModelMode
  mappingPreset: FootwearMappingPreset
  modelId: SneakerModelId
  customSlotColors?: (string | null)[]
}

type SavedPaletteItem = {
  id: string
  name: string
  modelId: SneakerModelId
  scheme: Scheme
  colors: string[]
  createdAt: number
}

const STORAGE_KEY = 'cordwainer_colors_state_v1'
const QUICK_COLORS_KEY = 'cordwainer_quick_colors_v1'
const SAVED_PALETTES_KEY = 'cordwainer_saved_palettes_v1'

const DEFAULT_QUICK_COLORS: string[] = [
  '#D72867',
  '#E8A0B8',
  '#A05F79',
  '#D9B0BC',
  '#64D21E',
  '#B6EC6B',
]

const FREE_SCHEMES: readonly Scheme[] = ['complementary', 'analogous']

const ALL_SCHEMES: readonly Scheme[] = [
  'complementary',
  'analogous',
  'triadic',
  'tetradic',
  'rectangular',
  'split-complementary',
  'monochromatic',
]

const ALL_PRESETS: readonly FootwearMappingPreset[] = [
  'classic',
  'toe-focus',
  'split-quarter',
  'neutral-sole',
]

const VALID_MODEL_IDS: readonly SneakerModelId[] = ['aerostrap', 'nexus', 'monolith']

const DEFAULT_STATE: PersistedColorsState = {
  baseHue: 194,
  whiteAmount: 0.05,
  blackAmount: 0.05,
  chromaAmount: 0.85,
  scheme: 'complementary',
  modelMode: 'ryb',
  mappingPreset: 'classic',
  modelId: 'aerostrap',
  customSlotColors: [],
}

function loadSavedColorsState(): PersistedColorsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<PersistedColorsState>
    const clamp = (val: unknown, min: number, max: number, fallback: number) => {
      if (typeof val !== 'number' || Number.isNaN(val)) return fallback
      return Math.max(min, Math.min(max, val))
    }

    const scheme: Scheme =
      typeof parsed.scheme === 'string' && FREE_SCHEMES.includes(parsed.scheme as Scheme)
        ? (parsed.scheme as Scheme)
        : DEFAULT_STATE.scheme

    const modelMode: ColorModelMode =
      parsed.modelMode === 'ryb' || parsed.modelMode === 'hsl'
        ? parsed.modelMode
        : DEFAULT_STATE.modelMode

    const mappingPreset: FootwearMappingPreset =
      typeof parsed.mappingPreset === 'string' &&
      ALL_PRESETS.includes(parsed.mappingPreset as FootwearMappingPreset)
        ? (parsed.mappingPreset as FootwearMappingPreset)
        : DEFAULT_STATE.mappingPreset

    const modelId: SneakerModelId =
      typeof parsed.modelId === 'string' &&
      VALID_MODEL_IDS.includes(parsed.modelId as SneakerModelId)
        ? (parsed.modelId as SneakerModelId)
        : DEFAULT_STATE.modelId

    const customSlotColors = Array.isArray(parsed.customSlotColors)
      ? parsed.customSlotColors.map((v) =>
          typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v) ? v.toUpperCase() : null
        )
      : []

    return {
      baseHue: Math.round(clamp(parsed.baseHue, 0, 359, DEFAULT_STATE.baseHue)),
      whiteAmount: clamp(parsed.whiteAmount, 0, 1, DEFAULT_STATE.whiteAmount),
      blackAmount: clamp(parsed.blackAmount, 0, 1, DEFAULT_STATE.blackAmount),
      chromaAmount: clamp(parsed.chromaAmount, 0.15, 1, DEFAULT_STATE.chromaAmount),
      scheme,
      modelMode,
      mappingPreset,
      modelId,
      customSlotColors,
    }
  } catch {
    return DEFAULT_STATE
  }
}

function loadCustomQuickColors(): string[] {
  try {
    const raw = localStorage.getItem(QUICK_COLORS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((c): c is string => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c))
  } catch {
    return []
  }
}

function loadSavedPalettes(): SavedPaletteItem[] {
  try {
    const raw = localStorage.getItem(SAVED_PALETTES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is SavedPaletteItem =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        Array.isArray(item.colors) &&
        item.colors.length >= 3
    )
  } catch {
    return []
  }
}

const LockIcon = ({ size = 10 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
)

export function ColorsPage({ onBack, lang, setLang }: ColorsPageProps) {
  const initialSaved = useMemo(() => loadSavedColorsState(), [])
  const prefersReduced = useReducedMotion()

  const { themeMode, isDark, tokens, setThemeMode, toggleDayNight } = useCordwainerTheme()
  const [hapticsEnabled, setHapticsEnabled] = useHapticsSetting()

  const [localLang, setLocalLang] = useState<SupportedLang>(() => normalizeSupportedLang(lang))
  useEffect(() => {
    setLocalLang(normalizeSupportedLang(lang))
  }, [lang])

  const [activeTab, setActiveTab] = useState<StudioTab>('colors')
  const [scheme, setScheme] = useState<Scheme>(initialSaved.scheme)
  const [modelMode, setModelMode] = useState<ColorModelMode>(initialSaved.modelMode)
  const [mappingPreset, setMappingPreset] = useState<FootwearMappingPreset>(
    initialSaved.mappingPreset
  )
  const [modelId, setModelId] = useState<SneakerModelId>(initialSaved.modelId)

  const [baseHue, setBaseHue] = useState(initialSaved.baseHue)
  const [whiteAmount, setWhiteAmount] = useState(initialSaved.whiteAmount)
  const [blackAmount, setBlackAmount] = useState(initialSaved.blackAmount)
  const [chromaAmount, setChromaAmount] = useState(initialSaved.chromaAmount)

  const [customSlotColors, setCustomSlotColors] = useState<(string | null)[]>(
    initialSaved.customSlotColors ?? []
  )
  const [selectedSlot, setSelectedSlot] = useState<number>(0)
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false)
  const [isToneOpen, setIsToneOpen] = useState<boolean>(true)
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false)
  const [showSettings, setShowSettings] = useState<boolean>(false)

  const [customQuickColors, setCustomQuickColors] = useState<string[]>(() =>
    loadCustomQuickColors()
  )
  const [savedPalettes, setSavedPalettes] = useState<SavedPaletteItem[]>(() =>
    loadSavedPalettes()
  )
  const [justSaved, setJustSaved] = useState<boolean>(false)

  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [liveStatusText, setLiveStatusText] = useState('')
  const [showGuide, setShowGuide] = useState(false)

  const wheelRef = useRef<HTMLDivElement>(null)
  const proModalCloseRef = useRef<HTMLButtonElement>(null)
  const guideCloseRef = useRef<HTMLButtonElement>(null)
  const isDragging = useRef(false)
  const lastHapticHue = useRef(initialSaved.baseHue)

  const t: TranslationDict = TRANSLATIONS[normalizeSupportedLang(localLang)] ?? TRANSLATIONS.ru
  const activeModel = getSneakerModelConfig(modelId)

  const {
    paymentState,
    paymentErrorMsg,
    showProModal,
    isProPurchased,
    isPaymentBusy,
    openProModal,
    closeProModal,
    handleProClick,
  } = useTelegramProPayment(t)

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    expandTelegramWebApp()
  }, [])

  useEffect(() => {
    try {
      const payload: PersistedColorsState = {
        baseHue,
        whiteAmount,
        blackAmount,
        chromaAmount,
        scheme: isProPurchased || FREE_SCHEMES.includes(scheme) ? scheme : 'complementary',
        modelMode,
        mappingPreset,
        modelId,
        customSlotColors,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {}
  }, [
    baseHue,
    whiteAmount,
    blackAmount,
    chromaAmount,
    scheme,
    modelMode,
    mappingPreset,
    modelId,
    isProPurchased,
    customSlotColors,
  ])

  useEffect(() => {
    try {
      localStorage.setItem(QUICK_COLORS_KEY, JSON.stringify(customQuickColors))
    } catch {}
  }, [customQuickColors])

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_PALETTES_KEY, JSON.stringify(savedPalettes))
    } catch {}
  }, [savedPalettes])

  useEffect(() => {
    if (!showProModal && !showGuide) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      if (showProModal) proModalCloseRef.current?.focus()
      else if (showGuide) guideCloseRef.current?.focus()
    }, 50)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showProModal && !isPaymentBusy) closeProModal()
        if (showGuide) setShowGuide(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [showProModal, showGuide, isPaymentBusy, closeProModal])

  const handleLangChange = (newLang: SupportedLang) => {
    const safe = normalizeSupportedLang(newLang)
    try {
      localStorage.setItem('cordwainer_lang', safe)
      localStorage.setItem('app_lang', safe)
    } catch {}
    setLocalLang(safe)
    if (isAppNativeLang(safe)) {
      setLang(safe)
    }
  }

  const handleSchemeClick = (s: Scheme) => {
    const isFree = FREE_SCHEMES.includes(s)
    if (!isFree && !isProPurchased) {
      openProModal()
      return
    }
    hapticHarmony()
    setScheme(s)
    setCustomSlotColors([])
  }

  const handleModelSwitch = (nextId: SneakerModelId) => {
    if (nextId === modelId) return
    hapticModel()
    setModelId(nextId)
  }

  const handleResetAll = useCallback(() => {
    setBaseHue(DEFAULT_STATE.baseHue)
    setWhiteAmount(DEFAULT_STATE.whiteAmount)
    setBlackAmount(DEFAULT_STATE.blackAmount)
    setChromaAmount(DEFAULT_STATE.chromaAmount)
    setMappingPreset(DEFAULT_STATE.mappingPreset)
    setCustomSlotColors([])
  }, [])

  const copyToClipboard = useCallback(
    (key: string, textToCopy: string, announcement: string) => {
      hapticTap()
      setCopiedKey(key)
      setLiveStatusText(announcement)
      try {
        void navigator.clipboard?.writeText(textToCopy)
      } catch {}
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev))
      }, 1500)
    },
    []
  )

  const schemeHues = useMemo(() => getSchemeWheelAngles(baseHue, scheme), [baseHue, scheme])

  const harmonyColors = useMemo(
    () =>
      generateHarmonyPalette(
        baseHue,
        whiteAmount,
        blackAmount,
        chromaAmount,
        scheme,
        modelMode
      ),
    [baseHue, whiteAmount, blackAmount, chromaAmount, scheme, modelMode]
  )

  const colors = useMemo(
    () => harmonyColors.map((hex, idx) => customSlotColors[idx] ?? hex),
    [harmonyColors, customSlotColors]
  )

  const safeSelectedSlot = Math.min(selectedSlot, Math.max(0, colors.length - 1))

  const sneakerColors = useMemo(
    () =>
      mapPaletteToFootwear(
        colors,
        baseHue,
        whiteAmount,
        blackAmount,
        chromaAmount,
        modelMode,
        mappingPreset,
        isDark
      ),
    [colors, baseHue, whiteAmount, blackAmount, chromaAmount, modelMode, mappingPreset, isDark]
  )

  const harmonyEvaluation = useMemo(() => {
    const res = evaluateHarmonyContrast(colors, sneakerColors)
    const statusLabel =
      res.level === 'soft'
        ? t.contrastSoft
        : res.level === 'high'
          ? t.contrastHigh
          : t.contrastOptimal

    return {
      ratioText: res.ratioText,
      statusLabel,
    }
  }, [colors, sneakerColors, t.contrastSoft, t.contrastHigh, t.contrastOptimal])

  const isTetrad = scheme === 'tetradic' || scheme === 'rectangular'

  const { ratioLabels, roleLabels } = useMemo(
    () => getPresetSwatchLabels(mappingPreset, isTetrad, t),
    [mappingPreset, isTetrad, t]
  )

  const shortSlotNames = useMemo(() => {
    if (isTetrad) {
      return [t.slotUpper, t.slotTrim, t.slotLining, t.slotDetails]
    }
    return [t.slotUpper, t.slotTrim, t.slotDetails]
  }, [isTetrad, t.slotUpper, t.slotTrim, t.slotLining, t.slotDetails])

  const slotFlexWeights = isTetrad ? [55, 20, 15, 10] : [60, 30, 10]

  const allZonesSpec = useMemo(
    (): { key: SneakerZoneKey; label: string; hex: string }[] => [
      { key: 'vamp', label: t.zone_vamp, hex: sneakerColors.vamp },
      { key: 'toeBox', label: t.zone_toeBox, hex: sneakerColors.toeBox },
      { key: 'quarters', label: t.zone_quarters, hex: sneakerColors.quarters },
      { key: 'eyestays', label: t.zone_eyestays, hex: sneakerColors.eyestays },
      { key: 'heel', label: t.zone_heel, hex: sneakerColors.heel },
      { key: 'collar', label: t.zone_collar, hex: sneakerColors.collar },
      { key: 'tongue', label: t.zone_tongue, hex: sneakerColors.tongue },
      { key: 'lining', label: t.zone_lining, hex: sneakerColors.lining },
      { key: 'swoosh', label: t.zone_swoosh, hex: sneakerColors.swoosh },
      { key: 'midsole', label: t.zone_midsole, hex: sneakerColors.midsole },
      { key: 'encap', label: t.zone_encap, hex: sneakerColors.encap },
      { key: 'outsole', label: t.zone_outsole, hex: sneakerColors.outsole },
      { key: 'laces', label: t.zone_laces, hex: sneakerColors.laces },
    ],
    [sneakerColors, t]
  )

  const handleExportFullSpec = useCallback(() => {
    const header =
      activeModel.name +
      ' — ' +
      t[scheme] +
      ' (' +
      modelMode.toUpperCase() +
      ' ' +
      baseHue +
      '°, ΔE ' +
      harmonyEvaluation.ratioText +
      ')'
    const lines = allZonesSpec.map((z) => z.label + ': ' + z.hex)
    const fullText = header + '\n' + lines.join('\n')
    copyToClipboard('__full_spec__', fullText, t.exportCopied)
  }, [
    activeModel.name,
    allZonesSpec,
    baseHue,
    copyToClipboard,
    harmonyEvaluation.ratioText,
    modelMode,
    scheme,
    t,
  ])

  const handleSavePalette = useCallback(() => {
    hapticSave()
    const item: SavedPaletteItem = {
      id: String(Date.now()),
      name: activeModel.shortLabel + ' • ' + t[scheme],
      modelId,
      scheme,
      colors: [...colors],
      createdAt: Date.now(),
    }
    setSavedPalettes((prev) => [item, ...prev].slice(0, 18))
    setJustSaved(true)
    setLiveStatusText(t.btnSaved)
    window.setTimeout(() => setJustSaved(false), 1600)
  }, [activeModel.shortLabel, colors, modelId, scheme, t])

  const handleLiveSlotHexChange = useCallback(
    (nextHex: string) => {
      setCustomSlotColors((prev) => {
        const copy = [...prev]
        copy[safeSelectedSlot] = nextHex.toUpperCase()
        return copy
      })
    },
    [safeSelectedSlot]
  )

  const handleResetActiveSlot = useCallback(() => {
    setCustomSlotColors((prev) => {
      const copy = [...prev]
      copy[safeSelectedSlot] = null
      return copy
    })
  }, [safeSelectedSlot])

  const handleAddQuickColor = useCallback((hex: string) => {
    const upper = hex.toUpperCase()
    setCustomQuickColors((prev) => (prev.includes(upper) ? prev : [...prev, upper]))
  }, [])

  const handleRemoveQuickColor = useCallback((hex: string) => {
    const upper = hex.toUpperCase()
    setCustomQuickColors((prev) => prev.filter((c) => c !== upper))
  }, [])

  const wheelBackground = useMemo(() => {
    const stops: string[] = []
    for (let deg = 0; deg <= 360; deg += 30) {
      const displayHue = modelMode === 'ryb' ? rybHueToRgbHue(deg) : deg
      stops.push('hsl(' + displayHue.toFixed(1) + ', 90%, 50%)')
    }
    return 'conic-gradient(from 0deg, ' + stops.join(', ') + ')'
  }, [modelMode])

  const updateFromClientXY = useCallback((clientX: number, clientY: number) => {
    const el = wheelRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy

    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    angle = Math.round((angle + 90 + 360) % 360) % 360

    if (getCircularAngleDiff(angle, lastHapticHue.current) >= 15) {
      hapticSwatch()
      lastHapticHue.current = angle
    }

    setCustomSlotColors([])
    setBaseHue(angle)
  }, [])

  const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    updateFromClientXY(e.clientX, e.clientY)
  }

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    updateFromClientXY(e.clientX, e.clientY)
  }

  const handleWheelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleWheelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 15 : 5
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      hapticSwatch()
      setCustomSlotColors([])
      setBaseHue((h) => (h + step) % 360)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      hapticSwatch()
      setCustomSlotColors([])
      setBaseHue((h) => (h - step + 360) % 360)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setCustomSlotColors([])
      setBaseHue(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setCustomSlotColors([])
      setBaseHue(180)
    }
  }

  const PRESETS: { id: FootwearMappingPreset; label: string }[] = [
    { id: 'classic', label: t.presetClassic },
    { id: 'toe-focus', label: t.presetToe },
    { id: 'split-quarter', label: t.presetSplit },
    { id: 'neutral-sole', label: t.presetNeutral },
  ]

  const NAV_TABS: { id: StudioTab; label: string }[] = [
    { id: 'colors', label: t.tabColors },
    { id: 'models', label: t.tabModels },
    { id: 'harmonies', label: t.tabHarmonies },
    { id: 'palette', label: t.tabPalette },
  ]

  const activeColorHex = colors[safeSelectedSlot] ?? colors[0] ?? '#D72867'

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={{ duration: prefersReduced ? 0.05 : 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-h-[100dvh] w-full overflow-x-hidden flex flex-col justify-between transition-colors duration-300"
      style={{
        backgroundColor: tokens.pageBg,
        color: tokens.ink,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <style>{`
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveStatusText}
      </div>

      {/* 1. ПРЕМИАЛЬНЫЙ ХЕДЕР В СТИЛЕ APPLE EDITORIAL */}
      <header className="px-4 pt-3 pb-1 flex items-center justify-between max-w-xl mx-auto w-full z-20">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => {
              hapticTap()
              onBack()
            }}
            aria-label="Back"
            className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center bg-transparent border-0 cursor-pointer transition-transform active:scale-90 shrink-0"
            style={{ color: tokens.inkSecondary }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1
            className="font-serif text-[28px] sm:text-[31px] tracking-[-0.025em] leading-none truncate"
            style={{ color: tokens.ink }}
          >
            Cordwainer
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Переключатель темы Солнце / Луна в стиле iOS */}
          <button
            type="button"
            onClick={() => {
              hapticTap()
              toggleDayNight()
            }}
            aria-label={isDark ? t.themeDay : t.themeNight}
            className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 cursor-pointer"
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              color: tokens.ink,
              boxShadow: tokens.buttonShadow,
            }}
          >
            {isDark ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          {/* Кнопка настроек (День/Ночь/Авто, Виброотклик, RYB/HSL, Язык, Гид) */}
          <button
            type="button"
            onClick={() => {
              hapticTap()
              setShowSettings(true)
            }}
            aria-label={t.settingsTitle}
            className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-150 active:scale-90 cursor-pointer"
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              color: tokens.ink,
              boxShadow: tokens.buttonShadow,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="12" cy="19" r="1.75" />
            </svg>
          </button>
        </div>
      </header>

      {/* 2. НАВИГАЦИОННАЯ ПАНЕЛЬ ВКЛАДОК: Цвета | Модели | Гармонии | Палитра */}
      <nav
        className="px-4 max-w-xl mx-auto w-full border-b"
        style={{ borderColor: tokens.divider }}
        aria-label="Studio sections"
      >
        <div className="grid grid-cols-4 gap-1">
          {NAV_TABS.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  hapticTap()
                  setActiveTab(tab.id)
                }}
                className="relative flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-sans font-medium bg-transparent border-0 cursor-pointer transition-colors"
                style={{ color: active ? tokens.ink : tokens.inkMuted }}
              >
                {tab.id === 'colors' && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2z" />
                  </svg>
                )}
                {tab.id === 'models' && (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                )}
                {tab.id === 'harmonies' && (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="8" r="3.5" />
                    <circle cx="8" cy="15.5" r="3.5" />
                    <circle cx="16" cy="15.5" r="3.5" />
                  </svg>
                )}
                {tab.id === 'palette' && (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="4" y="4" width="16" height="16" rx="4" />
                    <path d="M12 4v16" />
                  </svg>
                )}
                <span className="truncate">{tab.label}</span>
                {active && (
                  <motion.span
                    layoutId="cw-tab-underline"
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                    style={{ backgroundColor: tokens.ink }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ОСНОВНАЯ РАБОЧАЯ ОБЛАСТЬ */}
      <main className="flex-1 flex flex-col px-4 pt-2.5 pb-3 max-w-xl mx-auto w-full">
        {/* ПОЛОСА БЫСТРЫХ ЧИПОВ ГАРМОНИЙ (как на референсе) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
          <button
            type="button"
            onClick={() => {
              hapticTap()
              const nextIdx = (ALL_PRESETS.indexOf(mappingPreset) + 1) % ALL_PRESETS.length
              setMappingPreset(ALL_PRESETS[nextIdx])
            }}
            className="px-3.5 h-8 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.06em] whitespace-nowrap border transition-transform active:scale-[0.96] cursor-pointer shrink-0"
            style={{
              backgroundColor: tokens.pillActiveBg,
              color: tokens.pillActiveText,
              borderColor: tokens.pillActiveBg,
              boxShadow: tokens.buttonShadow,
            }}
          >
            {PRESETS.find((p) => p.id === mappingPreset)?.label ?? t.presetClassic}
          </button>

          {ALL_SCHEMES.map((s) => {
            const isFree = FREE_SCHEMES.includes(s)
            const isLocked = !isFree && !isProPurchased
            const isActive = scheme === s

            return (
              <button
                key={s}
                type="button"
                onClick={() => handleSchemeClick(s)}
                className="flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[12px] font-sans font-medium whitespace-nowrap border transition-all duration-150 active:scale-[0.96] cursor-pointer shrink-0"
                style={{
                  backgroundColor: isActive ? tokens.surfaceElevated : tokens.pillIdleBg,
                  color: isActive ? tokens.ink : tokens.pillIdleText,
                  borderColor: isActive ? tokens.borderStrong : tokens.border,
                  boxShadow: isActive ? tokens.buttonShadow : 'none',
                }}
              >
                {isLocked && (
                  <span style={{ color: tokens.accentGold }}>
                    <LockIcon size={10} />
                  </span>
                )}
                <span>{t[s]}</span>
              </button>
            )
          })}
        </div>

        {/* ГЛАВНЫЙ ВИЗУАЛЬНЫЙ ЭЛЕМЕНТ: 3D-МОДЕЛЬ ОБУВИ */}
        <div className="my-1">
          <Sneaker3D
            sneakerColors={sneakerColors}
            isDark={isDark}
            modelId={modelId}
            onResetAll={handleResetAll}
            resetLabel={t.resetBtn}
            loading3DLabel={'3D • ' + activeModel.name + '...'}
            webglFallbackLabel={t.webglFallback}
            compact={isEditorOpen}
          />
        </div>

        {/* ВКЛАДКА 1: ЦВЕТА (Цветовая формула 60/30/10 + Цвет/Тон/Детали + Карточка тона) */}
        {activeTab === 'colors' && (
          <section className="mt-2.5 flex-1 flex flex-col">
            {/* Заголовок Цветовая формула */}
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <span
                className="text-[11px] font-sans font-semibold uppercase tracking-[0.14em]"
                style={{ color: tokens.ink }}
              >
                {t.formulaTitle}
              </span>
              <span
                className="text-[10.5px] font-sans uppercase tracking-[0.12em]"
                style={{ color: tokens.inkMuted }}
              >
                {isTetrad ? t.colors4Meta : t.colors3Meta}
              </span>
            </div>

            {/* Пропорциональная интерактивная полоса 60 / 30 / 10 */}
            <div className="flex items-center gap-[3px] w-full h-9 rounded-[11px] overflow-hidden mb-2.5">
              {colors.map((hex, idx) => {
                const selected = idx === safeSelectedSlot
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      hapticSwatch()
                      setSelectedSlot(idx)
                      setIsEditorOpen(true)
                    }}
                    aria-label={(ratioLabels[idx] ?? '') + ' ' + (shortSlotNames[idx] ?? '') + ' ' + hex}
                    className="relative h-full flex items-center justify-center border-0 cursor-pointer transition-all duration-150 active:brightness-95"
                    style={{
                      flex: slotFlexWeights[idx] ?? 1,
                      backgroundColor: hex,
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full border-[1.75px] border-white transition-transform duration-150"
                      style={{
                        transform: selected ? 'scale(1.15)' : 'scale(0.88)',
                        opacity: selected ? 1 : 0.72,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                      }}
                    />
                  </button>
                )
              })}
            </div>

            {/* Три (или четыре) интерактивные цветовые карточки */}
            <div
              className={
                'grid gap-2 mb-3 ' + (isTetrad ? 'grid-cols-4' : 'grid-cols-3')
              }
            >
              {colors.map((hex, idx) => {
                const selected = idx === safeSelectedSlot
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      hapticSwatch()
                      setSelectedSlot(idx)
                      setIsEditorOpen(true)
                    }}
                    className="flex flex-col items-start text-left px-2.5 py-2 rounded-[14px] border transition-all duration-150 active:scale-[0.97] cursor-pointer"
                    style={{
                      backgroundColor: selected ? tokens.surface : 'transparent',
                      borderColor: selected ? tokens.borderStrong : tokens.border,
                      boxShadow: selected ? tokens.buttonShadow : 'none',
                    }}
                  >
                    <span
                      className="text-[15px] font-sans font-semibold leading-none tabular-nums"
                      style={{ color: tokens.ink }}
                    >
                      {ratioLabels[idx]}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5 w-full min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: hex }}
                      />
                      <span
                        className="text-[10px] font-sans uppercase tracking-[0.08em] truncate"
                        style={{ color: tokens.inkSecondary }}
                      >
                        {shortSlotNames[idx] ?? roleLabels[idx]}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Трио iPhone-кнопок: Цвет | Тон | Детали */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  hapticTap()
                  setIsEditorOpen(true)
                }}
                className="h-10 rounded-[14px] flex items-center justify-center gap-1.5 border text-[12.5px] font-sans font-medium transition-all duration-150 active:scale-[0.96] cursor-pointer"
                style={{
                  backgroundColor: isEditorOpen ? tokens.surfaceElevated : tokens.surface,
                  borderColor: isEditorOpen ? activeColorHex : tokens.borderStrong,
                  color: tokens.ink,
                  boxShadow: tokens.buttonShadow,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.03 2 11c0 3.31 2.69 6 6 6h1.2c.83 0 1.5.67 1.5 1.5 0 .39-.15.74-.39 1.01-.23.26-.38.61-.38.99 0 .83.67 1.5 1.5 1.5H12c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
                </svg>
                <span>{t.btnColor}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticTap()
                  setIsToneOpen((v) => !v)
                  setIsDetailsOpen(false)
                }}
                className="h-10 rounded-[14px] flex items-center justify-center gap-1.5 border text-[12.5px] font-sans font-medium transition-all duration-150 active:scale-[0.96] cursor-pointer"
                style={{
                  backgroundColor: isToneOpen ? tokens.surfaceElevated : tokens.surface,
                  borderColor: isToneOpen ? tokens.borderStrong : tokens.border,
                  color: tokens.ink,
                  boxShadow: isToneOpen ? tokens.buttonShadow : 'none',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
                </svg>
                <span>{t.btnTone}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticTap()
                  setIsDetailsOpen((v) => !v)
                  setIsToneOpen(false)
                }}
                className="h-10 rounded-[14px] flex items-center justify-center gap-1.5 border text-[12.5px] font-sans font-medium transition-all duration-150 active:scale-[0.96] cursor-pointer"
                style={{
                  backgroundColor: isDetailsOpen ? tokens.surfaceElevated : tokens.surface,
                  borderColor: isDetailsOpen ? tokens.borderStrong : tokens.border,
                  color: tokens.ink,
                  boxShadow: isDetailsOpen ? tokens.buttonShadow : 'none',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span>{t.btnDetails}</span>
              </button>
            </div>

            {/* Карточка точной настройки Тона (Tint / Shade / Saturation с iOS кнопками − / +) */}
            <ToneControlCard
              isOpen={isToneOpen}
              isDark={isDark}
              tokens={tokens}
              t={t}
              activeColorHex={activeColorHex}
              whiteAmount={whiteAmount}
              blackAmount={blackAmount}
              chromaAmount={chromaAmount}
              onChangeWhite={(v) => {
                setCustomSlotColors([])
                setWhiteAmount(v)
              }}
              onChangeBlack={(v) => {
                setCustomSlotColors([])
                setBlackAmount(v)
              }}
              onChangeChroma={(v) => {
                setCustomSlotColors([])
                setChromaAmount(v)
              }}
              onOpenEditor={() => setIsEditorOpen(true)}
              onCollapse={() => setIsToneOpen(false)}
            />

            {/* Карточка Деталей (пресеты распределения + быстрый доступ к 13 зонам) */}
            <AnimatePresence initial={false}>
              {isDetailsOpen && (
                <motion.div
                  initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  transition={{ duration: prefersReduced ? 0.05 : 0.2 }}
                  className="rounded-[20px] p-3.5 border mt-2.5 space-y-3"
                  style={{
                    backgroundColor: tokens.surface,
                    borderColor: tokens.border,
                    boxShadow: tokens.cardShadow,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[11px] font-sans font-semibold uppercase tracking-[0.12em]"
                      style={{ color: tokens.inkSecondary }}
                    >
                      {t.presetsTitle}
                    </span>
                    <button
                      type="button"
                      onClick={handleExportFullSpec}
                      className="px-2.5 py-1 rounded-full text-[11px] font-sans font-medium border bg-transparent cursor-pointer active:scale-95 transition-transform"
                      style={{ borderColor: tokens.borderStrong, color: tokens.ink }}
                    >
                      {copiedKey === '__full_spec__' ? t.exportCopied : t.exportSpecBtn}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {PRESETS.map((p) => {
                      const active = mappingPreset === p.id
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            hapticTap()
                            setMappingPreset(p.id)
                          }}
                          className="h-9 px-3 rounded-[12px] text-[11.5px] font-sans font-medium border text-left truncate transition-all active:scale-[0.97] cursor-pointer"
                          style={{
                            backgroundColor: active ? tokens.pillActiveBg : tokens.surfaceSoft,
                            color: active ? tokens.pillActiveText : tokens.ink,
                            borderColor: active ? tokens.pillActiveBg : tokens.border,
                          }}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex overflow-x-auto gap-1.5 pb-0.5 scrollbar-hide">
                    {allZonesSpec.map((item) => {
                      const zoneKey = 'zone:' + item.key + ':' + item.hex
                      const isZoneCopied = copiedKey === zoneKey
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              zoneKey,
                              item.hex,
                              item.label + ' ' + item.hex + ' ' + t.copied
                            )
                          }
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shrink-0 cursor-pointer active:scale-95 transition-transform"
                          style={{
                            backgroundColor: tokens.surfaceSoft,
                            borderColor: tokens.border,
                          }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                            style={{ backgroundColor: item.hex }}
                          />
                          <span className="text-[11px] font-sans" style={{ color: tokens.ink }}>
                            {item.label}
                          </span>
                          <span className="text-[10px] font-mono" style={{ color: tokens.inkMuted }}>
                            {isZoneCopied ? t.copied : item.hex}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* ВКЛАДКА 2: МОДЕЛИ */}
        {activeTab === 'models' && (
          <section className="mt-3 space-y-2.5 flex-1">
            <p className="text-[12px] font-sans" style={{ color: tokens.inkMuted }}>
              {t.modelsSubtitle}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SNEAKER_MODELS.map((m) => {
                const active = modelId === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleModelSwitch(m.id)}
                    className="flex items-center justify-between px-4 py-3.5 rounded-[18px] border text-left transition-all duration-150 active:scale-[0.98] cursor-pointer"
                    style={{
                      backgroundColor: active ? tokens.surfaceElevated : tokens.surface,
                      borderColor: active ? tokens.ink : tokens.border,
                      boxShadow: active ? tokens.cardShadow : tokens.buttonShadow,
                    }}
                  >
                    <div>
                      <div
                        className="font-serif text-[18px] leading-tight"
                        style={{ color: tokens.ink }}
                      >
                        {m.shortLabel}
                      </div>
                      <div
                        className="text-[10.5px] font-sans uppercase tracking-[0.14em] mt-0.5"
                        style={{ color: tokens.inkMuted }}
                      >
                        {m.name}
                      </div>
                    </div>
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center border"
                      style={{
                        backgroundColor: active ? tokens.pillActiveBg : 'transparent',
                        borderColor: active ? tokens.pillActiveBg : tokens.borderStrong,
                        color: tokens.pillActiveText,
                      }}
                    >
                      {active && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* ВКЛАДКА 3: ГАРМОНИИ (Круг Иттена + 7 схем + пресеты) */}
        {activeTab === 'harmonies' && (
          <section className="mt-3 space-y-3 flex-1">
            <div
              className="rounded-[22px] p-4 border grid grid-cols-[118px_1fr] gap-4 items-center"
              style={{
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                boxShadow: tokens.cardShadow,
              }}
            >
              <div className="flex flex-col items-center">
                <div
                  ref={wheelRef}
                  role="slider"
                  tabIndex={0}
                  aria-label={modelMode === 'ryb' ? t.ittenLabel : t.hslLabel}
                  aria-valuemin={0}
                  aria-valuemax={359}
                  aria-valuenow={baseHue}
                  className="relative w-[108px] h-[108px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none"
                  style={{
                    background: wheelBackground,
                    touchAction: 'none',
                    boxShadow:
                      '0 0 0 1px ' +
                      (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)') +
                      ', 0 6px 18px rgba(0,0,0,0.16)',
                  }}
                  onPointerDown={handleWheelPointerDown}
                  onPointerMove={handleWheelPointerMove}
                  onPointerUp={handleWheelPointerUp}
                  onPointerCancel={handleWheelPointerUp}
                  onKeyDown={handleWheelKeyDown}
                >
                  <div
                    className="absolute inset-[25%] rounded-full pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle at 35% 32%, white 0%, ' +
                        colors[0] +
                        ' 45%, #111 95%)',
                      boxShadow: 'inset -3px -3px 8px rgba(0,0,0,0.45)',
                    }}
                  />
                  {schemeHues.slice(1).map((hAngle, idx) => {
                    const dotHue = modelMode === 'ryb' ? rybHueToRgbHue(hAngle) : hAngle
                    return (
                      <div
                        key={idx}
                        className="absolute inset-0 pointer-events-none"
                        style={{ transform: 'rotate(' + hAngle + 'deg)' }}
                      >
                        <div
                          className="absolute top-[4px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: 'hsl(' + dotHue + ', 85%, 50%)' }}
                        />
                      </div>
                    )
                  })}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ transform: 'rotate(' + baseHue + 'deg)' }}
                  >
                    <div
                      className="absolute top-[2px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md"
                      style={{
                        backgroundColor:
                          'hsl(' +
                          (modelMode === 'ryb' ? rybHueToRgbHue(baseHue) : baseHue) +
                          ', 85%, 50%)',
                      }}
                    />
                  </div>
                </div>
                <span
                  className="mt-2 text-[10px] font-sans uppercase tracking-[0.14em]"
                  style={{ color: tokens.inkMuted }}
                >
                  {modelMode.toUpperCase()} • {baseHue}°
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ALL_SCHEMES.map((s) => {
                  const isFree = FREE_SCHEMES.includes(s)
                  const isLocked = !isFree && !isProPurchased
                  const active = scheme === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSchemeClick(s)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-sans font-medium border transition-transform active:scale-95 cursor-pointer"
                      style={{
                        backgroundColor: active ? tokens.pillActiveBg : tokens.surfaceSoft,
                        color: active ? tokens.pillActiveText : tokens.ink,
                        borderColor: active ? tokens.pillActiveBg : tokens.border,
                      }}
                    >
                      {isLocked && (
                        <span style={{ color: tokens.accentGold }}>
                          <LockIcon size={9} />
                        </span>
                      )}
                      <span>{t[s]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ВКЛАДКА 4: ПАЛИТРА (13 зон + Экспорт + Сохранённые палитры) */}
        {activeTab === 'palette' && (
          <section className="mt-3 space-y-3 flex-1">
            <div
              className="rounded-[20px] p-3.5 border space-y-2.5"
              style={{
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                boxShadow: tokens.cardShadow,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-[11px] font-sans font-semibold uppercase tracking-[0.12em]"
                  style={{ color: tokens.inkSecondary }}
                >
                  {activeModel.shortLabel} • 13
                </span>
                <button
                  type="button"
                  onClick={handleExportFullSpec}
                  className="px-3 py-1 rounded-full text-[11px] font-sans font-medium border bg-transparent cursor-pointer active:scale-95 transition-transform"
                  style={{ borderColor: tokens.borderStrong, color: tokens.ink }}
                >
                  {copiedKey === '__full_spec__' ? t.exportCopied : t.exportSpecBtn}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {allZonesSpec.map((item) => {
                  const zoneKey = 'zone:' + item.key + ':' + item.hex
                  const isZoneCopied = copiedKey === zoneKey
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          zoneKey,
                          item.hex,
                          item.label + ' ' + item.hex + ' ' + t.copied
                        )
                      }
                      className="flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-[12px] border cursor-pointer active:scale-[0.97] transition-transform"
                      style={{
                        backgroundColor: tokens.surfaceSoft,
                        borderColor: tokens.border,
                      }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: item.hex }}
                        />
                        <span
                          className="text-[11px] font-sans truncate"
                          style={{ color: tokens.ink }}
                        >
                          {item.label}
                        </span>
                      </div>
                      <span
                        className="text-[10px] font-mono shrink-0"
                        style={{ color: tokens.inkMuted }}
                      >
                        {isZoneCopied ? t.copied : item.hex}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Сохранённые палитры */}
            <div
              className="rounded-[20px] p-3.5 border space-y-2.5"
              style={{
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                boxShadow: tokens.cardShadow,
              }}
            >
              <span
                className="text-[11px] font-sans font-semibold uppercase tracking-[0.12em]"
                style={{ color: tokens.inkSecondary }}
              >
                {t.savedPalettesTitle}
              </span>

              {savedPalettes.length === 0 ? (
                <p className="text-[12px] font-sans" style={{ color: tokens.inkMuted }}>
                  {t.savedPalettesEmpty}
                </p>
              ) : (
                <div className="space-y-2">
                  {savedPalettes.map((pal) => (
                    <div
                      key={pal.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-[14px] border"
                      style={{ backgroundColor: tokens.surfaceSoft, borderColor: tokens.border }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          hapticSwatch()
                          setModelId(pal.modelId)
                          setCustomSlotColors(pal.colors)
                        }}
                        className="flex items-center gap-2.5 min-w-0 flex-1 bg-transparent border-0 text-left cursor-pointer"
                      >
                        <div className="flex -space-x-1 shrink-0">
                          {pal.colors.map((c, idx) => (
                            <span
                              key={idx}
                              className="w-5 h-5 rounded-full border border-white/70"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <span
                          className="text-[12px] font-sans font-medium truncate"
                          style={{ color: tokens.ink }}
                        >
                          {pal.name}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          hapticReset()
                          setSavedPalettes((prev) => prev.filter((p) => p.id !== pal.id))
                        }}
                        aria-label={t.deletePalette}
                        className="w-7 h-7 rounded-full flex items-center justify-center bg-transparent border-0 cursor-pointer shrink-0"
                        style={{ color: tokens.inkMuted }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* НИЖНЯЯ РЕДАКЦИОННАЯ ПАНЕЛЬ: ΔE 5.6:1 ⓘ | CORDWAINER • COLOR ENGINE | Сохранить */}
      <footer
        className="sticky bottom-0 z-30 border-t px-4 py-2.5 backdrop-blur-md"
        style={{
          backgroundColor: isDark ? 'rgba(14, 14, 16, 0.88)' : 'rgba(245, 241, 235, 0.90)',
          borderColor: tokens.divider,
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              hapticTap()
              setShowGuide(true)
            }}
            className="flex items-center gap-1.5 bg-transparent border-0 cursor-pointer py-1 shrink-0"
            style={{ color: tokens.ink }}
            title={harmonyEvaluation.statusLabel}
          >
            <span className="text-[12px] font-sans font-semibold tabular-nums">
              ΔE {harmonyEvaluation.ratioText}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              style={{ color: tokens.inkMuted }}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </button>

          <span
            className="hidden min-[370px]:inline text-[9.5px] font-sans uppercase tracking-[0.16em] truncate"
            style={{ color: tokens.inkMuted }}
          >
            CORDWAINER • COLOR ENGINE
          </span>

          <button
            type="button"
            onClick={handleSavePalette}
            className="h-9 px-4 rounded-full flex items-center gap-1.5 border text-[12.5px] font-sans font-medium transition-all duration-150 active:scale-[0.95] cursor-pointer shrink-0"
            style={{
              backgroundColor: tokens.pillActiveBg,
              borderColor: tokens.pillActiveBg,
              color: tokens.pillActiveText,
              boxShadow: tokens.cardShadow,
            }}
          >
            {justSaved ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            )}
            <span>{justSaved ? t.btnSaved : t.btnSave}</span>
          </button>
        </div>
      </footer>

      {/* BOTTOM SHEET РЕДАКТОРА ЦВЕТА (живое обновление 3D-модели) */}
      <ColorEditorSheet
        isOpen={isEditorOpen}
        isDark={isDark}
        tokens={tokens}
        t={t}
        slotLabel={shortSlotNames[safeSelectedSlot] ?? roleLabels[safeSelectedSlot] ?? ''}
        slotRatio={ratioLabels[safeSelectedSlot] ?? '60%'}
        currentHex={activeColorHex}
        quickColors={DEFAULT_QUICK_COLORS}
        customQuickColors={customQuickColors}
        onLiveChangeHex={handleLiveSlotHexChange}
        onResetSlot={handleResetActiveSlot}
        onClose={() => setIsEditorOpen(false)}
        onAddQuickColor={handleAddQuickColor}
        onRemoveQuickColor={handleRemoveQuickColor}
      />

      {/* НАСТРОЙКИ СТУДИИ (День/Ночь/Авто, Виброотклик, RYB/HSL, Язык) */}
      <SettingsSheet
        isOpen={showSettings}
        tokens={tokens}
        t={t}
        themeMode={themeMode}
        onChangeThemeMode={setThemeMode}
        hapticsEnabled={hapticsEnabled}
        onToggleHaptics={setHapticsEnabled}
        modelMode={modelMode}
        onChangeModelMode={setModelMode}
        localLang={localLang}
        onChangeLang={handleLangChange}
        onOpenGuide={() => setShowGuide(true)}
        onClose={() => setShowSettings(false)}
      />

      {/* МОДАЛКА PRO ДОСТУПА */}
      <AnimatePresence>
        {showProModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pro-modal-title"
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm"
            style={{ backgroundColor: tokens.backdrop }}
          >
            <motion.div
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-[340px] p-7 rounded-[26px] border flex flex-col overflow-hidden"
              style={{
                backgroundColor: tokens.sheetBg,
                borderColor: tokens.borderStrong,
                boxShadow: tokens.cardShadow,
              }}
            >
              <button
                ref={proModalCloseRef}
                type="button"
                disabled={isPaymentBusy}
                onClick={closeProModal}
                aria-label={t.guideClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer disabled:opacity-40"
                style={{
                  backgroundColor: tokens.surfaceSoft,
                  borderColor: tokens.border,
                  color: tokens.inkSecondary,
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              <div className="flex justify-center mb-4" style={{ color: tokens.accentGold }}>
                <LockIcon size={28} />
              </div>

              <h3
                id="pro-modal-title"
                className="font-serif text-2xl tracking-tight mb-3 text-center"
                style={{ color: tokens.ink }}
              >
                {t.paywallTitle}
              </h3>

              <p
                className="text-[12.5px] font-sans leading-relaxed mb-6 text-center"
                style={{ color: tokens.inkSecondary }}
              >
                {t.paywallDesc}
              </p>

              {paymentErrorMsg && (
                <p className="text-[11px] font-sans text-amber-500 text-center mb-4">
                  {paymentErrorMsg}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleProClick()}
                disabled={isPaymentBusy || paymentState === 'invoice_open'}
                className="flex items-center justify-center gap-2.5 w-full h-12 rounded-full border transition-transform active:scale-[0.97] cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: tokens.pillActiveBg,
                  borderColor: tokens.pillActiveBg,
                  color: tokens.pillActiveText,
                  boxShadow: tokens.buttonShadow,
                }}
              >
                {isPaymentBusy || paymentState === 'invoice_open' ? (
                  <span className="text-[11px] font-sans uppercase tracking-[0.16em] animate-pulse">
                    {paymentState === 'verifying_payment' ? t.verifying : t.loading}
                  </span>
                ) : (
                  <>
                    <LockIcon size={13} />
                    <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.14em]">
                      {t.paywallBtn}
                    </span>
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY: ГИД */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="color-guide-title"
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: prefersReduced ? 0.08 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[90] flex flex-col overflow-hidden"
            style={{
              backgroundColor: tokens.pageBg,
              color: tokens.ink,
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="px-6 pt-8 pb-5 flex items-start justify-between shrink-0 max-w-xl mx-auto w-full">
              <h2
                id="color-guide-title"
                className="font-serif text-4xl leading-none tracking-tight"
              >
                {t.guideTitle}
              </h2>
              <button
                ref={guideCloseRef}
                type="button"
                onClick={() => {
                  hapticTap()
                  setShowGuide(false)
                }}
                className="px-3.5 py-1.5 rounded-full text-[12px] font-sans font-medium border cursor-pointer active:scale-95 transition-transform"
                style={{
                  backgroundColor: tokens.surface,
                  borderColor: tokens.borderStrong,
                  color: tokens.ink,
                }}
              >
                {t.guideClose}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-20 scrollbar-hide space-y-10 max-w-xl mx-auto w-full">
              <p className="text-[15px] leading-[1.75] font-light">{t.guideIntro}</p>

              <div>
                <h3
                  className="text-[10px] font-sans uppercase tracking-[0.26em] mb-4"
                  style={{ color: tokens.inkMuted }}
                >
                  {t.guideBalanceTitle}
                </h3>
                <p
                  className="text-[14px] leading-[1.8] whitespace-pre-line font-light border-l pl-4"
                  style={{ borderColor: tokens.borderStrong }}
                >
                  {t.guideBalance}
                </p>
              </div>

              <div>
                <h3
                  className="text-[10px] font-sans uppercase tracking-[0.26em] mb-6"
                  style={{ color: tokens.inkMuted }}
                >
                  {t.guideSchemesTitle}
                </h3>
                <div className="space-y-6">
                  {[
                    { title: t.complementary, text: t.guideComplementary },
                    { title: t.analogous, text: t.guideAnalogous },
                    { title: t.triadic, text: t.guideTriadic },
                    { title: t.tetradic, text: t.guideTetradic },
                    { title: t.rectangular, text: t.guideRectangular },
                    { title: t['split-complementary'], text: t.guideSplit },
                    { title: t.monochromatic, text: t.guideMono },
                  ].map((item) => (
                    <div key={item.title}>
                      <div className="font-serif text-[22px] leading-[1.2] mb-2">
                        {item.title}
                      </div>
                      <p
                        className="text-[13.5px] leading-[1.75] font-light"
                        style={{ color: tokens.inkSecondary }}
                      >
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3
                  className="text-[10px] font-sans uppercase tracking-[0.26em] mb-4"
                  style={{ color: tokens.inkMuted }}
                >
                  {t.guideFootwearTitle}
                </h3>
                <p
                  className="text-[14px] leading-[1.8] whitespace-pre-line font-light border-l pl-4"
                  style={{ borderColor: tokens.borderStrong }}
                >
                  {t.guideFootwear}
                </p>
              </div>

              <div className="pt-6 border-t" style={{ borderColor: tokens.divider }}>
                <p
                  className="text-[13.5px] leading-[1.75] font-light italic"
                  style={{ color: tokens.inkSecondary }}
                >
                  {t.guideTip}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
