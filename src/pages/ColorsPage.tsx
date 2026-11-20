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
  applyMaterialOverrides,
  evaluateHarmonyContrast,
  generateHarmonyPalette,
  getCircularAngleDiff,
  getMaterialZoneHex,
  getSchemeWheelAngles,
  mapPaletteToFootwear,
  oklchToHex,
  rybHueToRgbHue,
  type ColorModelMode,
  type FootwearMappingPreset,
  type MaterialOverrides,
  type MaterialZoneKey,
  type Scheme,
  type SneakerZoneKey,
} from './colors/colorEngine'
import { Sneaker3D, type Sneaker3DHandle } from './colors/Sneaker3D'
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
  getTelegramWebApp,
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
import {
  loadStudioSettings,
  resolveStudioBgHex,
  saveStudioSettings,
  useCordwainerTheme,
  type StudioBgPreset,
  type StudioDisplaySettings,
  type ThemeMode,
} from './colors/themeSystem'
import { ColorEditorSheet } from './colors/ColorEditorSheet'
import { StudioSettingsPanel, ToneControlCard } from './colors/ColorLabPanels'

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
  hexToOklch,
  oklchToHex,
  synthesizePigmentHex,
  getRelativeLuminance,
  getContrastRatio,
  getPerceptualPairContrast,
  getSchemeWheelAngles,
  generateHarmonyPalette,
  mapPaletteToFootwear,
  applyMaterialOverrides,
  getMaterialZoneHex,
  evaluateHarmonyContrast,
  type Scheme,
  type ColorModelMode,
  type FootwearMappingPreset,
  type MaterialZoneKey,
  type MaterialOverrides,
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

type EditorTarget =
  | { kind: 'slot'; index: number }
  | { kind: 'material'; zone: MaterialZoneKey }
  | { kind: 'studio-bg' }

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
  materialOverrides?: MaterialOverrides
}

type SavedPaletteItem = {
  id: string
  name: string
  modelId: SneakerModelId
  scheme: Scheme
  colors: string[]
  materialOverrides?: MaterialOverrides
  createdAt: number
}

const STORAGE_KEY = 'cordwainer_colors_state_v1'
const QUICK_COLORS_KEY = 'cordwainer_quick_colors_v1'
const SAVED_PALETTES_KEY = 'cordwainer_saved_palettes_v1'

const DEFAULT_QUICK_COLORS: string[] = [
  '#D72867',
  '#E8A0B8',
  '#A05F79',
  '#FFFFFF',
  '#181615',
  '#64D21E',
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

const VALID_MATERIAL_KEYS: readonly MaterialZoneKey[] = [
  'upper',
  'outsole',
  'midsole',
  'tread',
  'accent',
]

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
  materialOverrides: {},
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
      parsed.modelMode === 'ryb' || parsed.modelMode === 'oklch'
        ? parsed.modelMode
        : parsed.modelMode === 'hsl'
          ? 'oklch'
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

    const materialOverrides: MaterialOverrides = {}
    if (parsed.materialOverrides && typeof parsed.materialOverrides === 'object') {
      for (const k of VALID_MATERIAL_KEYS) {
        const val = (parsed.materialOverrides as Record<string, unknown>)[k]
        if (typeof val === 'string' && /^#[0-9A-Fa-f]{6}$/.test(val)) {
          materialOverrides[k] = val.toUpperCase()
        }
      }
    }

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
      materialOverrides,
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

  const { themeMode, isDark, tokens, setThemeMode } = useCordwainerTheme()
  const [showThemeMenu, setShowThemeMenu] = useState(false)

  const [studioSettings, setStudioSettings] = useState<StudioDisplaySettings>(() =>
    loadStudioSettings()
  )
  const studioBgHex = useMemo(() => resolveStudioBgHex(studioSettings), [studioSettings])

  const [hapticsEnabled, setHapticsEnabled] = useHapticsSetting()

  const [localLang, setLocalLang] = useState<SupportedLang>(() => normalizeSupportedLang(lang))
  useEffect(() => {
    setLocalLang(normalizeSupportedLang(lang))
  }, [lang])

  const [activeTab, setActiveTab] = useState<StudioTab>('colors')
  const [showSettings, setShowSettings] = useState<boolean>(false)
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
  const [materialOverrides, setMaterialOverrides] = useState<MaterialOverrides>(
    initialSaved.materialOverrides ?? {}
  )

  const [selectedSlot, setSelectedSlot] = useState<number>(0)
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null)
  const [isToneOpen, setIsToneOpen] = useState<boolean>(true)
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false)

  const [customQuickColors, setCustomQuickColors] = useState<string[]>(() =>
    loadCustomQuickColors()
  )
  const [savedPalettes, setSavedPalettes] = useState<SavedPaletteItem[]>(() =>
    loadSavedPalettes()
  )
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState<boolean>(false)

  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [liveStatusText, setLiveStatusText] = useState('')
  const [showGuide, setShowGuide] = useState(false)

  const sneakerRef = useRef<Sneaker3DHandle | null>(null)
  const wheelRef = useRef<HTMLDivElement>(null)
  const wheelKnobRef = useRef<HTMLDivElement>(null)
  const wheelLabelRef = useRef<HTMLSpanElement>(null)
  const proModalCloseRef = useRef<HTMLButtonElement>(null)
  const guideCloseRef = useRef<HTMLButtonElement>(null)
  const isDraggingWheel = useRef(false)
  const dragWheelHueRef = useRef(initialSaved.baseHue)
  const lastHapticHue = useRef(initialSaved.baseHue)
  const isExitingRef = useRef(false)

  const t: TranslationDict = TRANSLATIONS[normalizeSupportedLang(localLang)] ?? TRANSLATIONS.ru
  const activeModel = getSneakerModelConfig(modelId)
  const isTelegramEnv = useMemo(() => {
    const tg = getTelegramWebApp()
    return Boolean(tg && (tg.initData || tg.initDataUnsafe?.user?.id))
  }, [])

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

  const latestPersistPayloadRef = useRef<PersistedColorsState>(initialSaved)
  latestPersistPayloadRef.current = {
    baseHue,
    whiteAmount,
    blackAmount,
    chromaAmount,
    scheme: isProPurchased || FREE_SCHEMES.includes(scheme) ? scheme : 'complementary',
    modelMode,
    mappingPreset,
    modelId,
    customSlotColors,
    materialOverrides,
  }

  const flushPersistState = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(latestPersistPayloadRef.current))
    } catch {}
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      flushPersistState()
    }, 350)
    return () => window.clearTimeout(timer)
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
    materialOverrides,
    flushPersistState,
  ])

  useEffect(() => {
    const onPageHide = () => flushPersistState()
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      flushPersistState()
    }
  }, [flushPersistState])

  useEffect(() => {
    saveStudioSettings(studioSettings)
  }, [studioSettings])

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

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    expandTelegramWebApp()
    isExitingRef.current = false
  }, [])

  const handleUnifiedBack = useCallback(() => {
    hapticTap()
    if (showThemeMenu) {
      setShowThemeMenu(false)
      return
    }
    if (editorTarget) {
      setEditorTarget(null)
      return
    }
    if (showGuide) {
      setShowGuide(false)
      return
    }
    if (showProModal && !isPaymentBusy) {
      closeProModal()
      return
    }
    if (showSettings) {
      setShowSettings(false)
      return
    }
    if (activeTab !== 'colors') {
      setActiveTab('colors')
      return
    }
    if (isExitingRef.current) return
    isExitingRef.current = true
    document.body.style.overflow = ''
    flushPersistState()
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    onBack()
  }, [
    showThemeMenu,
    editorTarget,
    showGuide,
    showProModal,
    isPaymentBusy,
    closeProModal,
    showSettings,
    activeTab,
    flushPersistState,
    onBack,
  ])

  useEffect(() => {
    const tg = getTelegramWebApp()
    const bb = tg?.BackButton
    if (!bb?.onClick || !bb?.offClick) return
    bb.show?.()
    bb.onClick(handleUnifiedBack)
    return () => {
      bb.offClick?.(handleUnifiedBack)
    }
  }, [handleUnifiedBack])

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

  const handleLangChange = useCallback(
    (newLang: SupportedLang) => {
      const safe = normalizeSupportedLang(newLang)
      try {
        localStorage.setItem('cordwainer_lang', safe)
        localStorage.setItem('app_lang', safe)
      } catch {}
      setLocalLang(safe)
      if (isAppNativeLang(safe)) {
        setLang(safe)
      }
    },
    [setLang]
  )

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

  const handleResetCameraOnly = useCallback(() => {
    setLiveStatusText(t.reset360)
  }, [t.reset360])

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

  // Тема интерфейса НЕ влияет на материалы обуви (всегда передаём false)
  const baseSneakerColors = useMemo(
    () =>
      mapPaletteToFootwear(
        colors,
        baseHue,
        whiteAmount,
        blackAmount,
        chromaAmount,
        modelMode,
        mappingPreset,
        false
      ),
    [colors, baseHue, whiteAmount, blackAmount, chromaAmount, modelMode, mappingPreset]
  )

  const sneakerColors = useMemo(
    () => applyMaterialOverrides(baseSneakerColors, materialOverrides),
    [baseSneakerColors, materialOverrides]
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
      materialOverrides: { ...materialOverrides },
      createdAt: Date.now(),
    }
    setSavedPalettes((prev) => [item, ...prev].slice(0, 18))
    flushPersistState()
    setJustSaved(true)
    setLiveStatusText(t.btnSaved)
    window.setTimeout(() => setJustSaved(false), 1600)
  }, [activeModel.shortLabel, colors, flushPersistState, materialOverrides, modelId, scheme, t])

  const editorMeta = useMemo(() => {
    if (!editorTarget) {
      return {
        label: shortSlotNames[safeSelectedSlot] ?? '',
        ratio: ratioLabels[safeSelectedSlot] ?? '60%',
        hex: colors[safeSelectedSlot] ?? '#D72867',
      }
    }
    if (editorTarget.kind === 'slot') {
      const idx = Math.min(editorTarget.index, colors.length - 1)
      return {
        label: shortSlotNames[idx] ?? roleLabels[idx] ?? '',
        ratio: ratioLabels[idx] ?? '60%',
        hex: colors[idx] ?? '#D72867',
      }
    }
    if (editorTarget.kind === 'material') {
      const matLabels: Record<MaterialZoneKey, string> = {
        upper: t.matUpper,
        outsole: t.matOutsole,
        midsole: t.matMidsole,
        tread: t.matTread,
        accent: t.matAccent,
      }
      return {
        label: matLabels[editorTarget.zone],
        ratio: editorTarget.zone.toUpperCase(),
        hex: getMaterialZoneHex(sneakerColors, editorTarget.zone),
      }
    }
    return {
      label: t.studioBgTitle,
      ratio: t.bgCustom,
      hex: studioBgHex,
    }
  }, [
    editorTarget,
    shortSlotNames,
    safeSelectedSlot,
    ratioLabels,
    colors,
    roleLabels,
    t,
    sneakerColors,
    studioBgHex,
  ])

  // 0-RE-RENDER LIVE PREVIEW: во время перетаскивания ползунка обновляем 3D напрямую через GPU ref!
  const handleEditorLivePreviewHex = useCallback(
    (nextHex: string) => {
      const upper = nextHex.toUpperCase()
      if (!editorTarget || editorTarget.kind === 'slot') {
        const idx = editorTarget?.kind === 'slot' ? editorTarget.index : safeSelectedSlot
        const previewColors = [...colors]
        previewColors[idx] = upper
        const base = mapPaletteToFootwear(
          previewColors,
          baseHue,
          whiteAmount,
          blackAmount,
          chromaAmount,
          modelMode,
          mappingPreset,
          false
        )
        sneakerRef.current?.applyColorsImmediate(
          applyMaterialOverrides(base, materialOverrides)
        )
        return
      }
      if (editorTarget.kind === 'material') {
        const nextOverrides: MaterialOverrides = {
          ...materialOverrides,
          [editorTarget.zone]: upper,
        }
        sneakerRef.current?.applyColorsImmediate(
          applyMaterialOverrides(baseSneakerColors, nextOverrides)
        )
        return
      }
      // Для Своего фона студии обновляем state
      setStudioSettings((prev) => ({
        ...prev,
        bgPreset: 'custom',
        customBgHex: upper,
      }))
    },
    [
      editorTarget,
      safeSelectedSlot,
      colors,
      baseHue,
      whiteAmount,
      blackAmount,
      chromaAmount,
      modelMode,
      mappingPreset,
      materialOverrides,
      baseSneakerColors,
    ]
  )

  // Фиксация в React state только при отпускании пальца (pointerup) или клике по свотчу
  const handleEditorCommitHex = useCallback(
    (nextHex: string) => {
      const upper = nextHex.toUpperCase()
      if (!editorTarget || editorTarget.kind === 'slot') {
        const idx = editorTarget?.kind === 'slot' ? editorTarget.index : safeSelectedSlot
        setCustomSlotColors((prev) => {
          const copy = [...prev]
          copy[idx] = upper
          return copy
        })
        return
      }
      if (editorTarget.kind === 'material') {
        const zone = editorTarget.zone
        setMaterialOverrides((prev) => ({ ...prev, [zone]: upper }))
        return
      }
      setStudioSettings((prev) => ({
        ...prev,
        bgPreset: 'custom',
        customBgHex: upper,
      }))
    },
    [editorTarget, safeSelectedSlot]
  )

  const handleEditorReset = useCallback(() => {
    if (!editorTarget || editorTarget.kind === 'slot') {
      const idx = editorTarget?.kind === 'slot' ? editorTarget.index : safeSelectedSlot
      setCustomSlotColors((prev) => {
        const copy = [...prev]
        copy[idx] = null
        return copy
      })
      return
    }
    if (editorTarget.kind === 'material') {
      const zone = editorTarget.zone
      setMaterialOverrides((prev) => {
        const next = { ...prev }
        delete next[zone]
        return next
      })
      return
    }
    setStudioSettings((prev) => ({ ...prev, bgPreset: 'cream' }))
  }, [editorTarget, safeSelectedSlot])

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
      if (modelMode === 'oklch') {
        stops.push(oklchToHex(0.68, 0.22, deg))
      } else {
        const displayHue = modelMode === 'ryb' ? rybHueToRgbHue(deg) : deg
        stops.push('hsl(' + displayHue.toFixed(1) + ', 90%, 50%)')
      }
    }
    return 'conic-gradient(from 0deg, ' + stops.join(', ') + ')'
  }, [modelMode])

  // 0-RE-RENDER LIVE PREVIEW для круга Иттена во время вращения пальцем
  const updateWheelDirect = useCallback(
    (clientX: number, clientY: number) => {
      const el = wheelRef.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      let angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI)
      angle = Math.round((angle + 90 + 360) % 360) % 360
      dragWheelHueRef.current = angle

      if (wheelKnobRef.current) {
        wheelKnobRef.current.style.transform = 'rotate(' + angle + 'deg)'
      }
      if (wheelLabelRef.current) {
        wheelLabelRef.current.textContent = modelMode.toUpperCase() + ' • ' + angle + '°'
      }

      if (getCircularAngleDiff(angle, lastHapticHue.current) >= 15) {
        hapticSwatch()
        lastHapticHue.current = angle
      }

      const previewPal = generateHarmonyPalette(
        angle,
        whiteAmount,
        blackAmount,
        chromaAmount,
        scheme,
        modelMode
      )
      const previewBase = mapPaletteToFootwear(
        previewPal,
        angle,
        whiteAmount,
        blackAmount,
        chromaAmount,
        modelMode,
        mappingPreset,
        false
      )
      sneakerRef.current?.applyColorsImmediate(
        applyMaterialOverrides(previewBase, materialOverrides)
      )
    },
    [
      whiteAmount,
      blackAmount,
      chromaAmount,
      scheme,
      modelMode,
      mappingPreset,
      materialOverrides,
    ]
  )

  const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingWheel.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    updateWheelDirect(e.clientX, e.clientY)
  }

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWheel.current) return
    updateWheelDirect(e.clientX, e.clientY)
  }

  const handleWheelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWheel.current) return
    isDraggingWheel.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    setCustomSlotColors([])
    setBaseHue(dragWheelHueRef.current)
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

  const QUICK_MATERIALS: { key: MaterialZoneKey; label: string }[] = [
    { key: 'upper', label: t.matUpper },
    { key: 'outsole', label: t.matOutsole },
    { key: 'midsole', label: t.matMidsole },
    { key: 'tread', label: t.matTread },
    { key: 'accent', label: t.matAccent },
  ]

  const activeTabIndex = NAV_TABS.findIndex((item) => item.id === activeTab)
  const activeColorHex = colors[safeSelectedSlot] ?? colors[0] ?? '#D72867'

  const handleChangeStudioBgPreset = useCallback((preset: StudioBgPreset) => {
    setStudioSettings((prev) => ({ ...prev, bgPreset: preset }))
  }, [])

  const handleToggleAutoContrast = useCallback((next: boolean) => {
    setStudioSettings((prev) => ({ ...prev, autoContrast: next }))
  }, [])

  const handleResetMaterial = useCallback((zone: MaterialZoneKey) => {
    setMaterialOverrides((prev) => {
      const next = { ...prev }
      delete next[zone]
      return next
    })
  }, [])

  const handleResetAllMaterials = useCallback(() => {
    setMaterialOverrides({})
  }, [])

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
      transition={{ duration: prefersReduced ? 0.05 : 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-30 min-h-[100dvh] w-full overflow-y-auto overflow-x-hidden flex flex-col justify-between transition-colors duration-200"
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
        html, body { -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; }
        .cw-press {
          transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, opacity 120ms ease;
        }
        .cw-press:active {
          opacity: 0.82;
        }
      `}</style>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveStatusText}
      </div>

      {/* 1. ЕДИНАЯ КОМПАКТНАЯ ШАПКА БЕЗ ДУБЛИРОВАНИЯ CORDWAINE */}
      <header
        className="relative px-4 py-2 flex items-center justify-between max-w-xl md:max-w-5xl lg:max-w-6xl mx-auto w-full z-30 border-b"
        style={{ borderColor: tokens.divider }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={handleUnifiedBack}
            aria-label="Back"
            className="cw-press w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer shrink-0"
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.borderStrong,
              color: tokens.ink,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {!isTelegramEnv && !showSettings ? (
            <span
              className="font-serif text-[22px] sm:text-[24px] tracking-[-0.02em] leading-none truncate"
              style={{ color: tokens.ink }}
            >
              {t.brandName}
            </span>
          ) : (
            <span
              className="text-[15px] font-sans font-semibold tracking-[-0.01em] truncate"
              style={{ color: tokens.ink }}
            >
              {showSettings ? t.settingsTitle : t.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Переключатель темы интерфейса (День / Ночь / Авто) */}
          <button
            type="button"
            onClick={() => {
              hapticTap()
              setShowThemeMenu((v) => !v)
            }}
            aria-label={t.themeLabel}
            aria-expanded={showThemeMenu}
            className="cw-press w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer"
            style={{
              backgroundColor: showThemeMenu ? tokens.pillActiveBg : tokens.surface,
              borderColor: showThemeMenu ? tokens.pillActiveBg : tokens.borderStrong,
              color: showThemeMenu ? tokens.pillActiveText : tokens.ink,
            }}
          >
            {isDark ? (
              <svg
                width="15"
                height="15"
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          {/* Настройки студии */}
          <button
            type="button"
            onClick={() => {
              hapticTap()
              setShowThemeMenu(false)
              setShowSettings((v) => !v)
            }}
            aria-label={t.settingsTitle}
            aria-pressed={showSettings}
            className="cw-press w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer"
            style={{
              backgroundColor: showSettings ? tokens.pillActiveBg : tokens.surface,
              borderColor: showSettings ? tokens.pillActiveBg : tokens.borderStrong,
              color: showSettings ? tokens.pillActiveText : tokens.ink,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="12" cy="19" r="1.75" />
            </svg>
          </button>
        </div>

        {/* Выпадающий Segmented Control темы: День | Ночь | Авто */}
        <AnimatePresence>
          {showThemeMenu && (
            <motion.div
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.14 }}
              className="absolute right-4 top-12 z-40 p-2 rounded-[18px] border"
              style={{
                backgroundColor: tokens.sheetBg,
                borderColor: tokens.borderStrong,
                boxShadow: tokens.cardShadow,
              }}
            >
              <div
                className="text-[10px] font-sans uppercase tracking-[0.14em] px-2 pb-1.5"
                style={{ color: tokens.inkMuted }}
              >
                {t.themeLabel}
              </div>
              <div
                className="flex items-center p-1 rounded-full border"
                style={{ backgroundColor: tokens.surfaceSoft, borderColor: tokens.border }}
              >
                {(
                  [
                    { id: 'day', label: t.themeDay },
                    { id: 'night', label: t.themeNight },
                    { id: 'auto', label: t.themeAuto },
                  ] as { id: ThemeMode; label: string }[]
                ).map((item) => {
                  const active = themeMode === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        hapticTap()
                        setThemeMode(item.id)
                        setShowThemeMenu(false)
                      }}
                      className="cw-press px-3 py-1 rounded-full text-[12px] font-sans font-medium border-0 cursor-pointer"
                      style={{
                        backgroundColor: active ? tokens.pillActiveBg : 'transparent',
                        color: active ? tokens.pillActiveText : tokens.inkSecondary,
                      }}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. ВКЛАДКИ НАВИГАЦИИ (скрыты, когда открыты Настройки студии) */}
      {!showSettings && (
        <nav
          className="px-4 max-w-xl md:max-w-5xl lg:max-w-6xl mx-auto w-full border-b"
          style={{ borderColor: tokens.divider }}
          aria-label="Studio sections"
        >
          <div className="relative grid grid-cols-4 gap-1">
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
                  className="cw-press flex items-center justify-center gap-1.5 py-2 text-[12px] font-sans font-medium bg-transparent border-0 cursor-pointer"
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
                </button>
              )
            })}
            <span
              className="absolute bottom-0 left-0 w-1/4 h-[2px] px-2 transition-transform duration-200 pointer-events-none"
              style={{
                transform: 'translate3d(' + activeTabIndex * 100 + '%, 0, 0)',
              }}
            >
              <span
                className="block w-full h-full rounded-full"
                style={{ backgroundColor: tokens.ink }}
              />
            </span>
          </div>
        </nav>
      )}

      {/* ОСНОВНАЯ РАБОЧАЯ ОБЛАСТЬ */}
      <main className="flex-1 flex flex-col px-4 pt-2 pb-3 max-w-xl md:max-w-5xl lg:max-w-6xl mx-auto w-full">
        {!showSettings && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              type="button"
              onClick={() => {
                hapticTap()
                const nextIdx = (ALL_PRESETS.indexOf(mappingPreset) + 1) % ALL_PRESETS.length
                setMappingPreset(ALL_PRESETS[nextIdx])
              }}
              className="cw-press px-3.5 h-8 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.06em] whitespace-nowrap border cursor-pointer shrink-0"
              style={{
                backgroundColor: tokens.activeTintBg,
                color: tokens.activeTintText,
                borderColor: tokens.activeTintBorder,
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
                  className="cw-press flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[12px] font-sans font-medium whitespace-nowrap border cursor-pointer shrink-0"
                  style={{
                    backgroundColor: isActive ? tokens.pillActiveBg : tokens.pillIdleBg,
                    color: isActive ? tokens.pillActiveText : tokens.pillIdleText,
                    borderColor: isActive ? tokens.pillActiveBg : tokens.border,
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
        )}

        {/* АДАПТИВНАЯ СЕТКА: 1 колонка на смартфоне, 2 колонки (3D слева + панель справа) на планшете и Chrome/Safari */}
        <div className="flex-1 flex flex-col min-[820px]:grid min-[820px]:grid-cols-[1.15fr_1fr] min-[820px]:gap-7 min-[820px]:items-start">
        <div className="my-0.5 min-[820px]:sticky min-[820px]:top-4 min-w-0">
          <Sneaker3D
            ref={sneakerRef}
            sneakerColors={sneakerColors}
            isDark={isDark}
            modelId={modelId}
            onResetAll={handleResetCameraOnly}
            resetLabel={t.reset360}
            loading3DLabel={'3D • ' + activeModel.name + '...'}
            webglFallbackLabel={t.webglFallback}
            compact={Boolean(editorTarget) || showSettings}
            studioBgHex={studioBgHex}
            autoContrast={studioSettings.autoContrast}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
        {/* ЭКРАН НАСТРОЕК СТУДИИ */}
        {showSettings ? (
          <StudioSettingsPanel
            tokens={tokens}
            t={t}
            studioSettings={studioSettings}
            onChangeStudioBgPreset={handleChangeStudioBgPreset}
            onOpenCustomBgEditor={() => setEditorTarget({ kind: 'studio-bg' })}
            onToggleAutoContrast={handleToggleAutoContrast}
            sneakerColors={sneakerColors}
            materialOverrides={materialOverrides}
            onEditMaterial={(zone) => setEditorTarget({ kind: 'material', zone })}
            onResetMaterial={handleResetMaterial}
            onResetAllMaterials={handleResetAllMaterials}
            hapticsEnabled={hapticsEnabled}
            onToggleHaptics={setHapticsEnabled}
            modelMode={modelMode}
            onChangeModelMode={setModelMode}
            localLang={localLang}
            onChangeLang={handleLangChange}
            onOpenGuide={() => setShowGuide(true)}
            onSaveAndClose={() => {
              flushPersistState()
              saveStudioSettings(studioSettings)
              setShowSettings(false)
            }}
          />
        ) : (
          <>
            {/* ВКЛАДКА 1: ЦВЕТА */}
            {activeTab === 'colors' && (
              <section className="mt-2.5 flex-1 flex flex-col">
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

                {/* Полоса 60 / 30 / 10 */}
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
                          setEditorTarget({ kind: 'slot', index: idx })
                        }}
                        aria-label={(ratioLabels[idx] ?? '') + ' ' + (shortSlotNames[idx] ?? '') + ' ' + hex}
                        className="cw-press relative h-full flex items-center justify-center border-0 cursor-pointer"
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

                {/* Интерактивные карточки слотов */}
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
                          setEditorTarget({ kind: 'slot', index: idx })
                        }}
                        className="cw-press flex flex-col items-start text-left px-2.5 py-2 rounded-[14px] border cursor-pointer"
                        style={{
                          backgroundColor: selected ? tokens.activeTintBg : tokens.surface,
                          borderColor: selected ? tokens.activeTintBorder : tokens.border,
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

                {/* Трио кнопок: Цвет | Тон | Детали (Подошва) */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      hapticTap()
                      setEditorTarget({ kind: 'slot', index: safeSelectedSlot })
                    }}
                    className="cw-press h-10 rounded-[14px] flex items-center justify-center gap-1.5 border text-[12.5px] font-sans font-medium cursor-pointer"
                    style={{
                      backgroundColor: editorTarget?.kind === 'slot' ? tokens.pillActiveBg : tokens.surface,
                      borderColor: editorTarget?.kind === 'slot' ? tokens.pillActiveBg : tokens.borderStrong,
                      color: editorTarget?.kind === 'slot' ? tokens.pillActiveText : tokens.ink,
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
                    className="cw-press h-10 rounded-[14px] flex items-center justify-center gap-1.5 border text-[12.5px] font-sans font-medium cursor-pointer"
                    style={{
                      backgroundColor: isToneOpen ? tokens.pillActiveBg : tokens.surface,
                      borderColor: isToneOpen ? tokens.pillActiveBg : tokens.border,
                      color: isToneOpen ? tokens.pillActiveText : tokens.ink,
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
                    className="cw-press h-10 rounded-[14px] flex items-center justify-center gap-1.5 border text-[12.5px] font-sans font-medium cursor-pointer"
                    style={{
                      backgroundColor: isDetailsOpen ? tokens.pillActiveBg : tokens.surface,
                      borderColor: isDetailsOpen ? tokens.pillActiveBg : tokens.border,
                      color: isDetailsOpen ? tokens.pillActiveText : tokens.ink,
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
                  onOpenEditor={() => setEditorTarget({ kind: 'slot', index: safeSelectedSlot })}
                  onCollapse={() => setIsToneOpen(false)}
                />

                {/* ПАНЕЛЬ ДЕТАЛЕЙ: БЫСТРОЕ ИЗМЕНЕНИЕ ПОДОШВЫ / ПРОТЕКТОРА / ВЕРХА В 1 КАСАНИЕ */}
                <AnimatePresence initial={false}>
                  {isDetailsOpen && (
                    <motion.div
                      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                      animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
                      transition={{ duration: prefersReduced ? 0.05 : 0.18 }}
                      className="rounded-[20px] p-3.5 border mt-2.5 space-y-3"
                      style={{
                        backgroundColor: tokens.surface,
                        borderColor: tokens.border,
                        boxShadow: tokens.cardShadow,
                      }}
                    >
                      {/* Быстрый выбор 5 материалов обуви (включая Подошву и Протектор!) */}
                      <div>
                        <div
                          className="text-[11px] font-sans font-semibold uppercase tracking-[0.12em] mb-2"
                          style={{ color: tokens.inkSecondary }}
                        >
                          {t.materialsTitle}
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {QUICK_MATERIALS.map((mat) => {
                            const hex = getMaterialZoneHex(sneakerColors, mat.key)
                            return (
                              <button
                                key={mat.key}
                                type="button"
                                onClick={() => {
                                  hapticSwatch()
                                  setEditorTarget({ kind: 'material', zone: mat.key })
                                }}
                                className="cw-press flex items-center justify-between gap-2 px-3 py-2 rounded-[12px] border cursor-pointer"
                                style={{
                                  backgroundColor: tokens.surfaceSoft,
                                  borderColor: tokens.border,
                                }}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-5 h-5 rounded-[6px] border shrink-0"
                                    style={{
                                      backgroundColor: hex,
                                      borderColor: tokens.borderStrong,
                                    }}
                                  />
                                  <span
                                    className="text-[12.5px] font-sans font-medium truncate"
                                    style={{ color: tokens.ink }}
                                  >
                                    {mat.label}
                                  </span>
                                </div>
                                <span
                                  className="text-[11px] font-mono shrink-0"
                                  style={{ color: tokens.inkMuted }}
                                >
                                  {hex}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div
                        className="pt-2.5 border-t space-y-2"
                        style={{ borderColor: tokens.divider }}
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
                            className="cw-press px-2.5 py-1 rounded-full text-[11px] font-sans font-medium border bg-transparent cursor-pointer"
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
                                className="cw-press h-9 px-3 rounded-[12px] text-[11.5px] font-sans font-medium border text-left truncate cursor-pointer"
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
                        className="cw-press flex items-center justify-between px-4 py-3.5 rounded-[18px] border text-left cursor-pointer"
                        style={{
                          backgroundColor: active ? tokens.activeTintBg : tokens.surface,
                          borderColor: active ? tokens.activeTintBorder : tokens.border,
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

            {/* ВКЛАДКА 3: ГАРМОНИИ (Круг Иттена с 0-re-render вращением) */}
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
                        ref={wheelKnobRef}
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
                      ref={wheelLabelRef}
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
                          className="cw-press flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-sans font-medium border cursor-pointer"
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

            {/* ВКЛАДКА 4: ПАЛИТРА */}
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
                      className="cw-press px-3 py-1 rounded-full text-[11px] font-sans font-medium border bg-transparent cursor-pointer"
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
                          className="cw-press flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-[12px] border cursor-pointer"
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
                      {savedPalettes.map((pal) => {
                        const confirming = confirmDeleteId === pal.id
                        return (
                          <div
                            key={pal.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-[14px] border"
                            style={{
                              backgroundColor: tokens.surfaceSoft,
                              borderColor: tokens.border,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                hapticSwatch()
                                setConfirmDeleteId(null)
                                setModelId(pal.modelId)
                                setCustomSlotColors(pal.colors)
                                setMaterialOverrides(pal.materialOverrides ?? {})
                              }}
                              className="cw-press flex items-center gap-2.5 min-w-0 flex-1 bg-transparent border-0 text-left cursor-pointer rounded-lg"
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
                                if (!confirming) {
                                  hapticTap()
                                  setConfirmDeleteId(pal.id)
                                  return
                                }
                                hapticReset()
                                setConfirmDeleteId(null)
                                setSavedPalettes((prev) => prev.filter((p) => p.id !== pal.id))
                              }}
                              aria-label={t.deletePalette}
                              className="cw-press px-2 h-7 rounded-full flex items-center justify-center border text-[11px] font-sans cursor-pointer shrink-0"
                              style={{
                                backgroundColor: confirming ? tokens.pillActiveBg : 'transparent',
                                borderColor: confirming ? tokens.pillActiveBg : 'transparent',
                                color: confirming ? tokens.pillActiveText : tokens.inkMuted,
                              }}
                            >
                              {confirming ? (
                                t.confirmDelete
                              ) : (
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
                              )}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
        </div>
        </div>
      </main>

      {/* НИЖНЯЯ РЕДАКЦИОННАЯ ПАНЕЛЬ */}
      {!showSettings && (
        <footer
          className="sticky bottom-0 z-30 border-t px-4 py-2.5"
          style={{
            backgroundColor: tokens.pageBg,
            borderColor: tokens.divider,
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="max-w-xl md:max-w-5xl lg:max-w-6xl mx-auto flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                hapticTap()
                setShowGuide(true)
              }}
              className="cw-press flex items-center gap-1.5 bg-transparent border-0 cursor-pointer py-1 px-1.5 rounded-full shrink-0"
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
              CORDWAINE • COLOR ENGINE
            </span>

            <button
              type="button"
              onClick={handleSavePalette}
              className="cw-press h-9 px-4 rounded-full flex items-center gap-1.5 border text-[12.5px] font-sans font-medium cursor-pointer shrink-0"
              style={{
                backgroundColor: tokens.pillActiveBg,
                borderColor: tokens.pillActiveBg,
                color: tokens.pillActiveText,
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
      )}

      {/* BOTTOM SHEET РЕДАКТОРА ЦВЕТА (0-re-render 60fps ползунок) */}
      <ColorEditorSheet
        isOpen={Boolean(editorTarget)}
        isDark={isDark}
        tokens={tokens}
        t={t}
        slotLabel={editorMeta.label}
        slotRatio={editorMeta.ratio}
        currentHex={editorMeta.hex}
        quickColors={DEFAULT_QUICK_COLORS}
        customQuickColors={customQuickColors}
        onLivePreviewHex={handleEditorLivePreviewHex}
        onCommitHex={handleEditorCommitHex}
        onResetSlot={handleEditorReset}
        onClose={() => setEditorTarget(null)}
        onAddQuickColor={handleAddQuickColor}
        onRemoveQuickColor={handleRemoveQuickColor}
      />

      {/* МОДАЛКА PRO ДОСТУПА */}
      <AnimatePresence>
        {showProModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pro-modal-title"
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
            style={{ backgroundColor: tokens.backdrop }}
          >
            <motion.div
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
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
                className="cw-press absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer disabled:opacity-40"
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
                className="cw-press flex items-center justify-center gap-2.5 w-full h-12 rounded-full border cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: tokens.pillActiveBg,
                  borderColor: tokens.pillActiveBg,
                  color: tokens.pillActiveText,
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

      {/* OVERLAY: ПОДРОБНЫЙ ГИД */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="color-guide-title"
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: prefersReduced ? 0.08 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[90] flex flex-col overflow-hidden"
            style={{
              backgroundColor: tokens.pageBg,
              color: tokens.ink,
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="px-6 pt-8 pb-5 flex items-start justify-between gap-3 shrink-0 max-w-xl md:max-w-5xl lg:max-w-6xl mx-auto w-full">
              <h2
                id="color-guide-title"
                className="font-serif text-3xl sm:text-4xl leading-tight tracking-tight"
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
                className="cw-press px-3.5 py-1.5 rounded-full text-[12px] font-sans font-medium border cursor-pointer shrink-0"
                style={{
                  backgroundColor: tokens.surface,
                  borderColor: tokens.borderStrong,
                  color: tokens.ink,
                }}
              >
                {t.guideClose}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-20 scrollbar-hide space-y-9 max-w-xl md:max-w-5xl lg:max-w-6xl mx-auto w-full">
              <p className="text-[14.5px] leading-[1.75] font-light">{t.guideIntro}</p>

              <div>
                <h3
                  className="text-[10.5px] font-sans font-semibold uppercase tracking-[0.2em] mb-3.5"
                  style={{ color: tokens.inkMuted }}
                >
                  {t.guideBalanceTitle}
                </h3>
                <p
                  className="text-[13.5px] leading-[1.8] whitespace-pre-line font-light border-l pl-4"
                  style={{ borderColor: tokens.borderStrong }}
                >
                  {t.guideBalance}
                </p>
              </div>

              <div>
                <h3
                  className="text-[10.5px] font-sans font-semibold uppercase tracking-[0.2em] mb-5"
                  style={{ color: tokens.inkMuted }}
                >
                  {t.guideSchemesTitle}
                </h3>
                <div className="space-y-5">
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
                      <div className="font-serif text-[20px] leading-[1.2] mb-1.5">
                        {item.title}
                      </div>
                      <p
                        className="text-[13px] leading-[1.7] font-light"
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
                  className="text-[10.5px] font-sans font-semibold uppercase tracking-[0.2em] mb-3.5"
                  style={{ color: tokens.inkMuted }}
                >
                  {t.guideFootwearTitle}
                </h3>
                <p
                  className="text-[13.5px] leading-[1.8] whitespace-pre-line font-light border-l pl-4"
                  style={{ borderColor: tokens.borderStrong }}
                >
                  {t.guideFootwear}
                </p>
              </div>

              <div className="pt-5 border-t" style={{ borderColor: tokens.divider }}>
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
