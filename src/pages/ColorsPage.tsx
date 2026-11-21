import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  Copy,
  Check,
  Bookmark,
  Trash2,
  Sun,
  Moon,
  Monitor,
  MoreVertical,
  HelpCircle,
  Lock,
  ShieldCheck,
  Palette,
  Layers,
  Sparkles,
} from 'lucide-react'
import type { Lang } from '../App'
import {
  ColorModelMode,
  DEFAULT_SOLE_CONFIG,
  FootwearMappingPreset,
  Scheme,
  SneakerZoneKey,
  SoleColorConfig,
  applySoleColorToFootwear,
  evaluateHarmonyContrast,
  formatOklch,
  generateHarmonyPalette,
  getCircularAngleDiff,
  getSchemeWheelAngles,
  mapPaletteToFootwear,
  rybHueToRgbHue,
} from './colors/colorEngine'
import { COLORS_TRANSLATIONS } from './colors/colorsTranslations'
import {
  GuideModal,
  SoleColorCard,
  StudioBgCard,
  StudioSettingsView,
  ToneControlCard,
} from './colors/ColorLabPanels'
import { Sneaker3D } from './colors/Sneaker3D'
import type { SneakerModelId } from './colors/sneakerGeometry'
import {
  StudioBgConfig,
  ThemeMode,
  getThemeTokens,
  isStudioBgDark,
  loadHapticsEnabled,
  loadStudioBg,
  loadThemeMode,
  resolveIsDark,
  resolveStudioBgHex,
  saveHapticsEnabled,
  saveStudioBg,
  saveThemeMode,
  triggerHaptic,
} from './colors/themeSystem'

type Props = {
  onBack: () => void
  lang: Lang
  setLang: (lang: Lang) => void
}

type MainTab = 'colors' | 'models' | 'harmonies' | 'palette'
type SubTool = 'tone' | 'sole' | 'bg'
type PaymentState = 'idle' | 'creating_invoice' | 'invoice_open' | 'verifying_payment' | 'purchased' | 'failed'

type SavedPalette = {
  id: string
  createdAt: number
  scheme: Scheme
  preset: FootwearMappingPreset
  modelId: SneakerModelId
  baseHue: number
  tintWhite: number
  shadeBlack: number
  chromaScale: number
  modelMode: ColorModelMode
  sole: SoleColorConfig
  colors: string[]
}

const PRO_PRICE_STARS = 250
const DEFAULT_MODEL_ID: SneakerModelId = 'aerostrap'
const FREE_SCHEMES: readonly Scheme[] = ['complementary', 'analogous', 'monochromatic']
const ALL_SCHEMES: readonly Scheme[] = [
  'complementary',
  'analogous',
  'triadic',
  'split-complementary',
  'tetradic',
  'rectangular',
  'monochromatic',
]
const ALL_PRESETS: readonly FootwearMappingPreset[] = [
  'classic',
  'toe-focus',
  'split-quarter',
  'neutral-sole',
]
const MODEL_OPTIONS: readonly { id: SneakerModelId; name: string; shortName: string }[] = [
  { id: 'aerostrap', name: 'CORDWAINE AEROSTRAP', shortName: 'AEROSTRAP' },
  { id: 'nexus', name: 'CORDWAINE NEXUS X1', shortName: 'NEXUS X1' },
  { id: 'monolith', name: 'CORDWAINE MONOLITH V', shortName: 'MONOLITH V' },
]
const SPEC_ZONES: readonly SneakerZoneKey[] = [
  'vamp',
  'heel',
  'quarters',
  'toeBox',
  'eyestays',
  'tongue',
  'collar',
  'lining',
  'swoosh',
  'encap',
  'midsole',
  'outsole',
  'laces',
]

const STATE_STORAGE_KEY = 'cordwainer_colorlab_state_v4'
const SAVED_PALETTES_KEY = 'cordwainer_saved_palettes_v2'

type TgWebAppLike = {
  initData?: string
  initDataUnsafe?: { user?: { id?: number } }
  openInvoice?: (url: string, cb: (status: string) => void) => void
  setHeaderColor?: (c: string) => void
  setBackgroundColor?: (c: string) => void
  BackButton?: {
    show?: () => void
    hide?: () => void
    onClick?: (cb: () => void) => void
    offClick?: (cb: () => void) => void
  }
}

function getTg(): TgWebAppLike | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { Telegram?: { WebApp?: TgWebAppLike } }).Telegram?.WebApp
}

export const ColorsPage: React.FC<Props> = ({ onBack, lang, setLang }) => {
  const t = COLORS_TRANSLATIONS[lang] ?? COLORS_TRANSLATIONS.ru

  const [themeMode, setThemeMode] = useState<ThemeMode>(loadThemeMode)
  const [systemDark, setSystemDark] = useState<boolean>(() => resolveIsDark('auto'))
  const [showThemeMenu, setShowThemeMenu] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const isDark = themeMode === 'auto' ? systemDark : themeMode === 'night'
  const tokens = useMemo(() => getThemeTokens(isDark), [isDark])

  const [studioBg, setStudioBg] = useState<StudioBgConfig>(loadStudioBg)
  const studioBgHex = useMemo(() => resolveStudioBgHex(studioBg), [studioBg])
  const darkCanvas = useMemo(
    () => (studioBg.autoContrast ? isStudioBgDark(studioBgHex) : isDark),
    [studioBg.autoContrast, studioBgHex, isDark]
  )

  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(loadHapticsEnabled)
  const [activeTab, setActiveTab] = useState<MainTab>('colors')
  const [subTool, setSubTool] = useState<SubTool>('tone')
  const [showSettings, setShowSettings] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showProModal, setShowProModal] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [toastText, setToastText] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const isTelegram = useMemo(() => {
    const tg = getTg()
    return Boolean(tg?.initData && tg.initData.trim().length > 0)
  }, [])

  const [paymentState, setPaymentState] = useState<PaymentState>('idle')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const isPro = paymentState === 'purchased'
  const isPaymentBusy = paymentState === 'creating_invoice' || paymentState === 'verifying_payment'

  const verifyPurchaseOnServer = useCallback(async (): Promise<boolean> => {
    const tg = getTg()
    const userId = tg?.initDataUnsafe?.user?.id
    const rawInitData = tg?.initData || ''
    if (!userId) return false
    try {
      const res = await fetch(
        `/api/check-purchase?userId=${encodeURIComponent(String(userId))}&productId=pro_colors`,
        {
          method: 'GET',
          headers: rawInitData ? { 'X-Telegram-Init-Data': rawInitData } : undefined,
        }
      )
      if (!res.ok) return false
      const data = (await res.json()) as { purchased?: boolean }
      if (data.purchased === true) {
        setPaymentState('purchased')
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    void verifyPurchaseOnServer()
  }, [verifyPurchaseOnServer])

  const handleBuyPro = async () => {
    if (isPaymentBusy || paymentState === 'invoice_open' || isPro) return
    const tg = getTg()
    const userId = tg?.initDataUnsafe?.user?.id
    const rawInitData = tg?.initData || ''
    if (!userId || !tg?.openInvoice) {
      setPaymentError(t.paymentTelegramOnly)
      return
    }
    setPaymentError(null)
    setPaymentState('creating_invoice')
    triggerHaptic('tap', hapticsEnabled)

    try {
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(rawInitData ? { 'X-Telegram-Init-Data': rawInitData } : {}),
        },
        body: JSON.stringify({
          userId,
          productId: 'pro_colors',
          initData: rawInitData,
        }),
      })
      const data = (await response.json()) as {
        invoiceLink?: string
        error?: string
        alreadyPurchased?: boolean
      }
      if (response.status === 409 && data.alreadyPurchased) {
        triggerHaptic('save', hapticsEnabled)
        setPaymentState('purchased')
        setShowProModal(false)
        return
      }
      if (!response.ok || !data.invoiceLink) {
        throw new Error(data.error || t.paymentInvoiceError)
      }
      setPaymentState('invoice_open')
      tg.openInvoice(data.invoiceLink, async (status: string) => {
        if (status === 'paid' || status === 'pending') {
          setPaymentState('verifying_payment')
          let verified = await verifyPurchaseOnServer()
          if (!verified) {
            await new Promise((r) => setTimeout(r, 900))
            verified = await verifyPurchaseOnServer()
          }
          if (verified) {
            triggerHaptic('save', hapticsEnabled)
            setPaymentState('purchased')
            setShowProModal(false)
          } else {
            setPaymentState('idle')
            setPaymentError(t.paymentPendingMsg)
          }
        } else {
          setPaymentState('idle')
        }
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setPaymentState('failed')
      setPaymentError(msg)
    }
  }

  const [baseHue, setBaseHue] = useState<number>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) || '{}')
      return typeof saved.baseHue === 'number' ? saved.baseHue : 30
    } catch {
      return 30
    }
  })
  const [tintWhite, setTintWhite] = useState<number>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) || '{}')
      return typeof saved.tintWhite === 'number' ? saved.tintWhite : 0.08
    } catch {
      return 0.08
    }
  })
  const [shadeBlack, setShadeBlack] = useState<number>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) || '{}')
      return typeof saved.shadeBlack === 'number' ? saved.shadeBlack : 0.16
    } catch {
      return 0.16
    }
  })
  const [chromaScale, setChromaScale] = useState<number>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) || '{}')
      return typeof saved.chromaScale === 'number' ? saved.chromaScale : 0.85
    } catch {
      return 0.85
    }
  })
  const [scheme, setScheme] = useState<Scheme>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) || '{}')
      return ALL_SCHEMES.includes(saved.scheme) ? saved.scheme : 'complementary'
    } catch {
      return 'complementary'
    }
  })
  const [preset, setPreset] = useState<FootwearMappingPreset>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) || '{}')
      return ALL_PRESETS.includes(saved.preset) ? saved.preset : 'classic'
    } catch {
      return 'classic'
    }
  })
  const [modelMode, setModelMode] = useState<ColorModelMode>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) || '{}')
      if (saved.modelMode === 'hsl') return 'oklch'
      if (saved.modelMode === 'ryb' || saved.modelMode === 'oklch') return saved.modelMode
      return 'ryb'
    } catch {
      return 'ryb'
    }
  })
  const [modelId, setModelId] = useState<SneakerModelId>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) || '{}')
      if (saved.modelId === 'aerostrap' || saved.modelId === 'nexus' || saved.modelId === 'monolith') {
        return saved.modelId
      }
      return DEFAULT_MODEL_ID
    } catch {
      return DEFAULT_MODEL_ID
    }
  })
  const [soleConfig, setSoleConfig] = useState<SoleColorConfig>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) || '{}')
      if (saved.sole && typeof saved.sole.presetId === 'string') {
        return {
          presetId: saved.sole.presetId,
          customHex: typeof saved.sole.customHex === 'string' ? saved.sole.customHex : '#FAF8F4',
        }
      }
      return DEFAULT_SOLE_CONFIG
    } catch {
      return DEFAULT_SOLE_CONFIG
    }
  })

  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_PALETTES_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const latestStateRef = useRef({
    baseHue,
    tintWhite,
    shadeBlack,
    chromaScale,
    scheme,
    preset,
    modelMode,
    modelId,
    sole: soleConfig,
  })
  latestStateRef.current = {
    baseHue,
    tintWhite,
    shadeBlack,
    chromaScale,
    scheme,
    preset,
    modelMode,
    modelId,
    sole: soleConfig,
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(latestStateRef.current))
      } catch {
        // ignore
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [baseHue, tintWhite, shadeBlack, chromaScale, scheme, preset, modelMode, modelId, soleConfig])

  useEffect(() => {
    const flush = () => {
      try {
        localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(latestStateRef.current))
      } catch {
        // ignore
      }
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  useEffect(() => {
    try {
      const tg = getTg()
      tg?.setHeaderColor?.(tokens.pageBg)
      tg?.setBackgroundColor?.(tokens.pageBg)
    } catch {
      // ignore
    }
  }, [tokens.pageBg])

  const backLockRef = useRef(false)
  const handleStepBack = useCallback(() => {
    if (backLockRef.current) return
    backLockRef.current = true
    window.setTimeout(() => {
      backLockRef.current = false
    }, 240)

    triggerHaptic('tap', hapticsEnabled)
    if (showThemeMenu) {
      setShowThemeMenu(false)
      return
    }
    if (showProModal && !isPaymentBusy) {
      setShowProModal(false)
      return
    }
    if (showGuide) {
      setShowGuide(false)
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
    try {
      document.body.style.overflow = ''
    } catch {
      // ignore
    }
    onBack()
  }, [hapticsEnabled, showThemeMenu, showProModal, isPaymentBusy, showGuide, showSettings, activeTab, onBack])

  useEffect(() => {
    const bb = getTg()?.BackButton
    if (!bb) return
    bb.show?.()
    bb.onClick?.(handleStepBack)
    return () => {
      bb.offClick?.(handleStepBack)
    }
  }, [handleStepBack])

  const harmonyPalette = useMemo(
    () => generateHarmonyPalette(baseHue, tintWhite, shadeBlack, chromaScale, scheme, modelMode),
    [baseHue, tintWhite, shadeBlack, chromaScale, scheme, modelMode]
  )

  const wheelAngles = useMemo(() => getSchemeWheelAngles(baseHue, scheme), [baseHue, scheme])

  const sneakerColors = useMemo(() => {
    const honestBase = mapPaletteToFootwear(
      harmonyPalette,
      baseHue,
      tintWhite,
      shadeBlack,
      chromaScale,
      modelMode,
      preset,
      false
    )
    return applySoleColorToFootwear(honestBase, soleConfig)
  }, [harmonyPalette, baseHue, tintWhite, shadeBlack, chromaScale, modelMode, preset, soleConfig])

  const contrast = useMemo(
    () => evaluateHarmonyContrast(harmonyPalette, sneakerColors),
    [harmonyPalette, sneakerColors]
  )

  const slotPrimary = harmonyPalette[0]
  const slotSecondary = harmonyPalette[1] ?? harmonyPalette[0]
  const slotAccent = harmonyPalette[harmonyPalette.length - 1] ?? harmonyPalette[0]

  const showToast = useCallback((msg: string) => {
    setToastText(msg)
    window.setTimeout(() => setToastText(null), 1900)
  }, [])

  const copyText = useCallback(
    (key: string, text: string) => {
      triggerHaptic('select', hapticsEnabled)
      try {
        void navigator.clipboard?.writeText(text)
      } catch {
        // ignore
      }
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1400)
    },
    [hapticsEnabled]
  )

  const handleCopySpec = useCallback(() => {
    const modelMeta = MODEL_OPTIONS.find((m) => m.id === modelId)
    const lines = [
      'CORDWAINE COLOR LAB — TECH SPEC',
      'Model: ' + (modelMeta?.name ?? modelId.toUpperCase()),
      'Harmony: ' + t.schemes[scheme].name + ' (' + modelMode.toUpperCase() + ' ' + Math.round(baseHue) + '°)',
      'Preset: ' + t.presets[preset],
      'Contrast: ' + contrast.ratioText,
      '--- 60 / 30 / 10 ---',
      '60% Primary: ' + slotPrimary + ' (' + formatOklch(slotPrimary) + ')',
      '30% Secondary: ' + slotSecondary + ' (' + formatOklch(slotSecondary) + ')',
      '10% Accent: ' + slotAccent + ' (' + formatOklch(slotAccent) + ')',
      '--- 13 ZONES ---',
      ...SPEC_ZONES.map((z) => t.zones[z] + ': ' + sneakerColors[z]),
    ]
    copyText('spec', lines.join('\n'))
    showToast(t.copied)
  }, [
    modelId,
    t,
    scheme,
    modelMode,
    baseHue,
    preset,
    contrast.ratioText,
    slotPrimary,
    slotSecondary,
    slotAccent,
    sneakerColors,
    copyText,
    showToast,
  ])

  const handleSavePalette = useCallback(() => {
    triggerHaptic('save', hapticsEnabled)
    const item: SavedPalette = {
      id: 'pal_' + Date.now(),
      createdAt: Date.now(),
      scheme,
      preset,
      modelId,
      baseHue: Math.round(baseHue),
      tintWhite,
      shadeBlack,
      chromaScale,
      modelMode,
      sole: soleConfig,
      colors: [slotPrimary, slotSecondary, slotAccent],
    }
    setSavedPalettes((prev) => {
      const next = [item, ...prev].slice(0, 30)
      try {
        localStorage.setItem(SAVED_PALETTES_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
    showToast(t.savedToast)
  }, [
    hapticsEnabled,
    scheme,
    preset,
    modelId,
    baseHue,
    tintWhite,
    shadeBlack,
    chromaScale,
    modelMode,
    soleConfig,
    slotPrimary,
    slotSecondary,
    slotAccent,
    showToast,
    t.savedToast,
  ])

  const handleDeletePalette = (id: string) => {
    triggerHaptic('reset', hapticsEnabled)
    setSavedPalettes((prev) => {
      const next = prev.filter((p) => p.id !== id)
      try {
        localStorage.setItem(SAVED_PALETTES_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
    setConfirmDeleteId(null)
  }

  const handleSelectScheme = (nextScheme: Scheme) => {
    const locked = !isPro && !FREE_SCHEMES.includes(nextScheme)
    if (locked) {
      triggerHaptic('tap', hapticsEnabled)
      setPaymentError(null)
      setShowProModal(true)
      return
    }
    triggerHaptic('harmony', hapticsEnabled)
    setScheme(nextScheme)
  }

  const wheelRef = useRef<HTMLDivElement | null>(null)
  const lastWheelHapticHue = useRef<number>(baseHue)

  const updateHueFromPointer = (clientX: number, clientY: number) => {
    const el = wheelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const dx = clientX - (rect.left + rect.width / 2)
    const dy = clientY - (rect.top + rect.height / 2)
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90
    if (angle < 0) angle += 360
    const nextHue = Math.round(angle) % 360
    if (getCircularAngleDiff(nextHue, lastWheelHapticHue.current) >= 15) {
      lastWheelHapticHue.current = nextHue
      triggerHaptic('select', hapticsEnabled)
    }
    setBaseHue(nextHue)
  }

  const wheelGradient = useMemo(() => {
    const stops: string[] = []
    for (let deg = 0; deg <= 360; deg += 15) {
      const rgbHue = modelMode === 'ryb' ? rybHueToRgbHue(deg) : deg
      stops.push(`hsl(${Math.round(rgbHue)} 85% 52%) ${deg}deg`)
    }
    return `conic-gradient(from 0deg, ${stops.join(', ')})`
  }, [modelMode])

  const tabIndex = activeTab === 'colors' ? 0 : activeTab === 'models' ? 1 : activeTab === 'harmonies' ? 2 : 3
  const ThemeIcon = themeMode === 'day' ? Sun : themeMode === 'night' ? Moon : Monitor

  return (
    <div
      className="fixed inset-0 z-30 overflow-y-auto transition-colors duration-200"
      style={{
        backgroundColor: tokens.pageBg,
        color: tokens.ink,
        WebkitTextSizeAdjust: '100%',
      }}
    >
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{
          backgroundColor: tokens.headerBg,
          borderColor: tokens.border,
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="max-w-6xl mx-auto px-3.5 h-13 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={handleStepBack}
              className="inline-flex items-center gap-1 pl-1.5 pr-3 h-9 rounded-full border text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: tokens.cardBg,
                borderColor: tokens.border,
                color: tokens.ink,
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="truncate">{showSettings ? t.settingsTitle : t.title}</span>
            </button>

            {!isTelegram && (
              <span
                className="hidden sm:inline-block ml-2 text-[15px] font-semibold tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", color: tokens.ink }}
              >
                Cordwaine
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 relative">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap', hapticsEnabled)
                setShowThemeMenu((v) => !v)
              }}
              aria-label="Theme"
              className="w-9 h-9 rounded-full border flex items-center justify-center transition-colors"
              style={{
                backgroundColor: showThemeMenu ? tokens.activeTintBg : tokens.cardBg,
                borderColor: showThemeMenu ? tokens.activeTintBorder : tokens.border,
                color: tokens.ink,
              }}
            >
              <ThemeIcon className="w-4 h-4" />
            </button>

            {showThemeMenu && (
              <div
                className="absolute right-0 top-11 z-50 p-1.5 rounded-2xl border flex items-center gap-1"
                style={{
                  backgroundColor: tokens.cardBg,
                  borderColor: tokens.strongBorder,
                  boxShadow: tokens.shadowCard,
                }}
              >
                {(['day', 'night', 'auto'] as ThemeMode[]).map((m) => {
                  const active = themeMode === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        triggerHaptic('select', hapticsEnabled)
                        setThemeMode(m)
                        saveThemeMode(m)
                        setShowThemeMenu(false)
                      }}
                      className="px-3 py-1.5 rounded-xl text-[12px] font-medium whitespace-nowrap transition-colors"
                      style={{
                        backgroundColor: active ? tokens.activeTintBg : 'transparent',
                        color: active ? tokens.activeTintInk : tokens.muted,
                      }}
                    >
                      {t.themeModes[m]}
                    </button>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap', hapticsEnabled)
                setShowThemeMenu(false)
                setShowGuide(true)
              }}
              aria-label={t.guide}
              className="w-9 h-9 rounded-full border flex items-center justify-center transition-colors"
              style={{
                backgroundColor: tokens.cardBg,
                borderColor: tokens.border,
                color: tokens.ink,
              }}
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap', hapticsEnabled)
                setShowThemeMenu(false)
                setShowSettings((v) => !v)
              }}
              aria-label={t.settingsTitle}
              className="w-9 h-9 rounded-full border flex items-center justify-center transition-colors"
              style={{
                backgroundColor: showSettings ? tokens.activeTintBg : tokens.cardBg,
                borderColor: showSettings ? tokens.activeTintBorder : tokens.border,
                color: tokens.ink,
              }}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main
        className="max-w-6xl mx-auto px-3.5 pt-3 pb-10 min-[820px]:grid min-[820px]:grid-cols-12 min-[820px]:gap-5 min-[820px]:items-start"
        style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <section className="min-[820px]:col-span-6 min-[820px]:sticky min-[820px]:top-16 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div
              className="inline-flex p-1 rounded-full border overflow-x-auto max-w-full"
              style={{
                backgroundColor: tokens.cardBg,
                borderColor: tokens.border,
              }}
            >
              {MODEL_OPTIONS.map((m) => {
                const active = modelId === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('harmony', hapticsEnabled)
                      setModelId(m.id)
                    }}
                    className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap transition-colors"
                    style={{
                      backgroundColor: active ? tokens.activeTintBg : 'transparent',
                      color: active ? tokens.activeTintInk : tokens.muted,
                    }}
                  >
                    {m.shortName}
                  </button>
                )
              })}
            </div>

            <span
              className="px-2.5 py-1 rounded-full border text-[11px] font-mono font-medium shrink-0"
              style={{
                backgroundColor: tokens.cardBg,
                borderColor: tokens.border,
                color: tokens.muted,
              }}
            >
              Δ {contrast.ratioText}
            </span>
          </div>

          <div
            className="rounded-3xl overflow-hidden border"
            style={{
              backgroundColor: studioBgHex,
              borderColor: tokens.border,
              boxShadow: tokens.shadowCard,
            }}
          >
            <Sneaker3D
              sneakerColors={sneakerColors}
              modelId={modelId}
              isDark={darkCanvas}
              resetLabel="360°"
            />
          </div>

          <div
            className="hidden min-[820px]:block rounded-3xl border p-4"
            style={{
              backgroundColor: tokens.cardBg,
              borderColor: tokens.border,
              boxShadow: tokens.shadowCard,
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[13px] font-semibold" style={{ color: tokens.ink }}>
                {t.specTitle}
              </span>
              <button
                type="button"
                onClick={handleCopySpec}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-colors"
                style={{
                  backgroundColor: tokens.elevatedBg,
                  borderColor: tokens.border,
                  color: tokens.ink,
                }}
              >
                {copiedKey === 'spec' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'spec' ? t.copied : t.copySpec}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SPEC_ZONES.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => copyText(z, sneakerColors[z])}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-2xl border text-left transition-colors min-w-0"
                  style={{
                    backgroundColor: tokens.elevatedBg,
                    borderColor: tokens.border,
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-md shrink-0 border"
                    style={{ backgroundColor: sneakerColors[z], borderColor: tokens.strongBorder }}
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] truncate" style={{ color: tokens.muted }}>
                      {t.zones[z]}
                    </div>
                    <div className="text-[11px] font-mono font-semibold truncate" style={{ color: tokens.ink }}>
                      {copiedKey === z ? t.copied : sneakerColors[z]}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="min-[820px]:col-span-6 mt-3 min-[820px]:mt-0 space-y-3.5">
          {showSettings ? (
            <StudioSettingsView
              t={t}
              tokens={tokens}
              lang={lang}
              modelMode={modelMode}
              hapticsEnabled={hapticsEnabled}
              studioBg={studioBg}
              soleConfig={soleConfig}
              onChangeStudioBg={(next) => {
                setStudioBg(next)
                saveStudioBg(next)
              }}
              onChangeSole={setSoleConfig}
              onResetSole={() => setSoleConfig(DEFAULT_SOLE_CONFIG)}
              onChangeModelMode={setModelMode}
              onToggleHaptics={() => {
                const next = !hapticsEnabled
                setHapticsEnabled(next)
                saveHapticsEnabled(next)
                if (next) triggerHaptic('select', true)
              }}
              onChangeLang={setLang}
              onOpenGuide={() => setShowGuide(true)}
            />
          ) : (
            <>
              <div
                className="relative grid grid-cols-4 p-1 rounded-2xl border"
                style={{
                  backgroundColor: tokens.cardBg,
                  borderColor: tokens.border,
                  boxShadow: tokens.shadowSoft,
                }}
              >
                <div
                  className="absolute top-1 bottom-1 left-1 rounded-xl border transition-transform duration-200 pointer-events-none"
                  style={{
                    width: 'calc(25% - 2px)',
                    transform: `translate3d(${tabIndex * 100}%, 0, 0)`,
                    backgroundColor: tokens.activeTintBg,
                    borderColor: tokens.activeTintBorder,
                  }}
                />
                {(['colors', 'models', 'harmonies', 'palette'] as MainTab[]).map((tab) => {
                  const active = activeTab === tab
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        triggerHaptic('select', hapticsEnabled)
                        setActiveTab(tab)
                      }}
                      className="relative z-10 py-2 text-[12px] font-semibold transition-colors"
                      style={{ color: active ? tokens.activeTintInk : tokens.muted }}
                    >
                      {t.tabs[tab]}
                    </button>
                  )
                })}
              </div>

              {activeTab === 'colors' && (
                <div className="space-y-3.5">
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                    {ALL_SCHEMES.map((sc) => {
                      const active = scheme === sc
                      const locked = !isPro && !FREE_SCHEMES.includes(sc)
                      return (
                        <button
                          key={sc}
                          type="button"
                          onClick={() => handleSelectScheme(sc)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[12px] font-semibold whitespace-nowrap shrink-0 transition-colors"
                          style={{
                            backgroundColor: active ? tokens.primaryBtnBg : tokens.cardBg,
                            borderColor: active ? tokens.primaryBtnBg : tokens.border,
                            color: active ? tokens.primaryBtnInk : tokens.ink,
                          }}
                        >
                          {locked && <Lock className="w-3 h-3 opacity-70" />}
                          {t.schemes[sc].short}
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                    {ALL_PRESETS.map((pr) => {
                      const active = preset === pr
                      return (
                        <button
                          key={pr}
                          type="button"
                          onClick={() => {
                            triggerHaptic('select', hapticsEnabled)
                            setPreset(pr)
                          }}
                          className="px-3 py-1.5 rounded-full border text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors"
                          style={{
                            backgroundColor: active ? tokens.activeTintBg : tokens.cardBg,
                            borderColor: active ? tokens.activeTintBorder : tokens.border,
                            color: active ? tokens.activeTintInk : tokens.muted,
                          }}
                        >
                          {t.presets[pr]}
                        </button>
                      )
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        key: 'primary',
                        hex: slotPrimary,
                        title: t.slots.primary,
                        desc: t.slots.primaryDesc,
                        angle: wheelAngles[0],
                      },
                      {
                        key: 'secondary',
                        hex: slotSecondary,
                        title: t.slots.secondary,
                        desc: t.slots.secondaryDesc,
                        angle: wheelAngles[1] ?? wheelAngles[0],
                      },
                      {
                        key: 'accent',
                        hex: slotAccent,
                        title: t.slots.accent,
                        desc: t.slots.accentDesc,
                        angle: wheelAngles[wheelAngles.length - 1] ?? wheelAngles[0],
                      },
                    ].map((card) => (
                      <button
                        key={card.key}
                        type="button"
                        onClick={() => copyText(card.key, card.hex)}
                        className="rounded-2xl border p-2.5 text-left transition-colors min-w-0"
                        style={{
                          backgroundColor: tokens.cardBg,
                          borderColor: tokens.border,
                          boxShadow: tokens.shadowSoft,
                        }}
                      >
                        <div
                          className="h-11 rounded-xl mb-2 flex items-end justify-between p-1.5 border"
                          style={{
                            backgroundColor: card.hex,
                            borderColor: 'rgba(0,0,0,0.08)',
                          }}
                        >
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-black/55 text-white">
                            {copiedKey === card.key ? t.copied : card.hex}
                          </span>
                          <span className="px-1 py-0.5 rounded-md text-[9px] font-mono bg-black/45 text-white/90">
                            {Math.round(card.angle)}°
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold truncate" style={{ color: tokens.ink }}>
                          {card.title}
                        </div>
                        <div className="text-[10px] truncate" style={{ color: tokens.muted }}>
                          {card.desc}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div
                    className="rounded-2xl border px-3.5 py-2.5 flex items-start gap-2.5"
                    style={{
                      backgroundColor: tokens.elevatedBg,
                      borderColor: tokens.border,
                    }}
                  >
                    <ShieldCheck
                      className="w-4 h-4 shrink-0 mt-0.5"
                      style={{ color: tokens.activeTintBorder }}
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold" style={{ color: tokens.ink }}>
                        {t.honestBadge}
                      </div>
                      <div className="text-[11px] leading-snug" style={{ color: tokens.muted }}>
                        {t.honestSubtext}
                      </div>
                    </div>
                  </div>

                  <div
                    className="grid grid-cols-3 p-1 rounded-2xl border gap-1"
                    style={{
                      backgroundColor: tokens.cardBg,
                      borderColor: tokens.border,
                    }}
                  >
                    {(
                      [
                        { id: 'tone', label: t.subTabs.tone, Icon: Palette },
                        { id: 'sole', label: t.subTabs.sole, Icon: Layers },
                        { id: 'bg', label: t.subTabs.bg, Icon: Sparkles },
                      ] as const
                    ).map(({ id, label, Icon }) => {
                      const active = subTool === id
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            triggerHaptic('select', hapticsEnabled)
                            setSubTool(id)
                          }}
                          className="py-2 px-2 rounded-xl border text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          style={{
                            backgroundColor: active ? tokens.activeTintBg : 'transparent',
                            borderColor: active ? tokens.activeTintBorder : 'transparent',
                            color: active ? tokens.activeTintInk : tokens.muted,
                          }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      )
                    })}
                  </div>

                  {subTool === 'tone' && (
                    <div className="space-y-3">
                      <div
                        className="rounded-3xl border p-4 flex flex-col sm:flex-row items-center gap-4"
                        style={{
                          backgroundColor: tokens.cardBg,
                          borderColor: tokens.border,
                          boxShadow: tokens.shadowCard,
                        }}
                      >
                        <div className="flex flex-col items-center shrink-0">
                          <div
                            ref={wheelRef}
                            onPointerDown={(e) => {
                              e.currentTarget.setPointerCapture(e.pointerId)
                              updateHueFromPointer(e.clientX, e.clientY)
                            }}
                            onPointerMove={(e) => {
                              if (e.buttons === 1 || e.pointerType === 'touch') {
                                updateHueFromPointer(e.clientX, e.clientY)
                              }
                            }}
                            className="relative w-36 h-36 rounded-full touch-none select-none cursor-crosshair border"
                            style={{
                              background: wheelGradient,
                              borderColor: tokens.strongBorder,
                            }}
                          >
                            <div
                              className="absolute inset-8 rounded-full border shadow-inner"
                              style={{
                                backgroundColor: slotPrimary,
                                borderColor: 'rgba(255,255,255,0.45)',
                              }}
                            />
                            {wheelAngles.map((ang, idx) => {
                              const rad = ((ang - 90) * Math.PI) / 180
                              const r = 56
                              const cx = 72 + Math.cos(rad) * r
                              const cy = 72 + Math.sin(rad) * r
                              const isPrimaryMarker = idx === 0
                              return (
                                <span
                                  key={idx}
                                  className="absolute rounded-full border-2 border-white shadow pointer-events-none"
                                  style={{
                                    width: isPrimaryMarker ? 18 : 12,
                                    height: isPrimaryMarker ? 18 : 12,
                                    left: cx - (isPrimaryMarker ? 9 : 6),
                                    top: cy - (isPrimaryMarker ? 9 : 6),
                                    backgroundColor:
                                      idx === 0
                                        ? slotPrimary
                                        : idx === 1
                                          ? slotSecondary
                                          : slotAccent,
                                  }}
                                />
                              )
                            })}
                          </div>
                          <div className="mt-2 text-[11px] font-mono" style={{ color: tokens.muted }}>
                            {modelMode.toUpperCase()} · {Math.round(baseHue)}° · {t.schemes[scheme].short}
                          </div>
                        </div>

                        <div className="flex-1 w-full space-y-2">
                          <div className="flex items-center justify-between text-[12px]">
                            <span style={{ color: tokens.muted }}>{t.contrastLabel}</span>
                            <span className="font-mono font-semibold" style={{ color: tokens.ink }}>
                              {contrast.ratioText} · {t.contrastLevels[contrast.level]}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleSavePalette}
                            className="w-full py-2.5 px-4 rounded-2xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                            style={{
                              backgroundColor: tokens.primaryBtnBg,
                              color: tokens.primaryBtnInk,
                            }}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                            {t.savePalette}
                          </button>
                          <button
                            type="button"
                            onClick={handleCopySpec}
                            className="w-full py-2.5 px-4 rounded-2xl border text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                            style={{
                              backgroundColor: tokens.elevatedBg,
                              borderColor: tokens.border,
                              color: tokens.ink,
                            }}
                          >
                            {copiedKey === 'spec' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedKey === 'spec' ? t.copied : t.copySpec}
                          </button>
                        </div>
                      </div>

                      <ToneControlCard
                        t={t}
                        tokens={tokens}
                        primaryHex={slotPrimary}
                        baseHue={baseHue}
                        tintWhite={tintWhite}
                        shadeBlack={shadeBlack}
                        chromaScale={chromaScale}
                        hapticsEnabled={hapticsEnabled}
                        onChangeHue={setBaseHue}
                        onChangeTint={setTintWhite}
                        onChangeShade={setShadeBlack}
                        onChangeChroma={setChromaScale}
                      />
                    </div>
                  )}

                  {subTool === 'sole' && (
                    <SoleColorCard
                      t={t}
                      tokens={tokens}
                      soleConfig={soleConfig}
                      hapticsEnabled={hapticsEnabled}
                      onChangeSole={setSoleConfig}
                      onResetSole={() => setSoleConfig(DEFAULT_SOLE_CONFIG)}
                    />
                  )}

                  {subTool === 'bg' && (
                    <StudioBgCard
                      t={t}
                      tokens={tokens}
                      studioBg={studioBg}
                      hapticsEnabled={hapticsEnabled}
                      onChangeStudioBg={(next) => {
                        setStudioBg(next)
                        saveStudioBg(next)
                      }}
                    />
                  )}

                  <div
                    className="min-[820px]:hidden rounded-3xl border p-3.5"
                    style={{
                      backgroundColor: tokens.cardBg,
                      borderColor: tokens.border,
                      boxShadow: tokens.shadowSoft,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="text-[12px] font-semibold" style={{ color: tokens.ink }}>
                        {t.specTitle}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopySpec}
                        className="text-[11px] font-semibold"
                        style={{ color: tokens.activeTintBorder }}
                      >
                        {copiedKey === 'spec' ? t.copied : t.copySpec}
                      </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {SPEC_ZONES.map((z) => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => copyText(z, sneakerColors[z])}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shrink-0"
                          style={{
                            backgroundColor: tokens.elevatedBg,
                            borderColor: tokens.border,
                          }}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-sm border"
                            style={{ backgroundColor: sneakerColors[z], borderColor: tokens.strongBorder }}
                          />
                          <span className="text-[11px] font-medium" style={{ color: tokens.ink }}>
                            {t.zones[z]}
                          </span>
                          <span className="text-[10px] font-mono" style={{ color: tokens.muted }}>
                            {copiedKey === z ? t.copied : sneakerColors[z]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'models' && (
                <div className="space-y-2.5">
                  {MODEL_OPTIONS.map((m) => {
                    const active = modelId === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('harmony', hapticsEnabled)
                          setModelId(m.id)
                        }}
                        className="w-full rounded-3xl border p-4 text-left flex items-center justify-between gap-3 transition-colors"
                        style={{
                          backgroundColor: active ? tokens.activeTintBg : tokens.cardBg,
                          borderColor: active ? tokens.activeTintBorder : tokens.border,
                          boxShadow: tokens.shadowCard,
                        }}
                      >
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold tracking-tight" style={{ color: tokens.ink }}>
                            {m.name}
                          </div>
                          <div className="text-[12px] mt-0.5 leading-snug" style={{ color: tokens.muted }}>
                            {t.modelNotes[m.id]}
                          </div>
                        </div>
                        {active && (
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: tokens.activeTintBorder,
                              color: '#FFFFFF',
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {activeTab === 'harmonies' && (
                <div className="space-y-2.5">
                  {ALL_SCHEMES.map((sc) => {
                    const active = scheme === sc
                    const locked = !isPro && !FREE_SCHEMES.includes(sc)
                    const preview = generateHarmonyPalette(
                      baseHue,
                      tintWhite,
                      shadeBlack,
                      chromaScale,
                      sc,
                      modelMode
                    )
                    return (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => handleSelectScheme(sc)}
                        className="w-full rounded-3xl border p-4 text-left flex items-center justify-between gap-3 transition-colors"
                        style={{
                          backgroundColor: active ? tokens.activeTintBg : tokens.cardBg,
                          borderColor: active ? tokens.activeTintBorder : tokens.border,
                          boxShadow: tokens.shadowCard,
                        }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold" style={{ color: tokens.ink }}>
                              {t.schemes[sc].name}
                            </span>
                            {locked && (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{
                                  backgroundColor: tokens.elevatedBg,
                                  color: tokens.activeTintBorder,
                                }}
                              >
                                {t.proBadge}
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] mt-0.5 leading-snug" style={{ color: tokens.muted }}>
                            {t.schemes[sc].desc}
                          </div>
                        </div>
                        <div className="flex items-center -space-x-1.5 shrink-0">
                          {preview.slice(0, 3).map((hex, i) => (
                            <span
                              key={i}
                              className="w-6 h-6 rounded-full border-2"
                              style={{
                                backgroundColor: hex,
                                borderColor: tokens.cardBg,
                              }}
                            />
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {activeTab === 'palette' && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleSavePalette}
                    className="w-full py-3 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: tokens.primaryBtnBg,
                      color: tokens.primaryBtnInk,
                    }}
                  >
                    <Bookmark className="w-4 h-4" />
                    {t.savePalette}
                  </button>

                  {savedPalettes.length === 0 ? (
                    <div
                      className="rounded-3xl border p-5 text-center text-[12px] leading-relaxed"
                      style={{
                        backgroundColor: tokens.cardBg,
                        borderColor: tokens.border,
                        color: tokens.muted,
                      }}
                    >
                      {t.savedEmpty}
                    </div>
                  ) : (
                    savedPalettes.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-3xl border p-3.5 flex items-center justify-between gap-3"
                        style={{
                          backgroundColor: tokens.cardBg,
                          borderColor: tokens.border,
                          boxShadow: tokens.shadowSoft,
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex -space-x-1.5 shrink-0">
                            {item.colors.map((c, idx) => (
                              <span
                                key={idx}
                                className="w-7 h-7 rounded-full border-2"
                                style={{ backgroundColor: c, borderColor: tokens.cardBg }}
                              />
                            ))}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold truncate" style={{ color: tokens.ink }}>
                              {t.schemes[item.scheme]?.name ?? item.scheme}
                            </div>
                            <div className="text-[11px] font-mono truncate" style={{ color: tokens.muted }}>
                              {item.modelId.toUpperCase()} · {item.baseHue}° · {t.presets[item.preset]}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('harmony', hapticsEnabled)
                              setScheme(item.scheme)
                              setPreset(item.preset)
                              setModelId(item.modelId)
                              setBaseHue(item.baseHue)
                              setTintWhite(item.tintWhite)
                              setShadeBlack(item.shadeBlack)
                              setChromaScale(item.chromaScale)
                              setModelMode(item.modelMode === 'hsl' ? 'oklch' : item.modelMode)
                              if (item.sole) setSoleConfig(item.sole)
                              setActiveTab('colors')
                            }}
                            className="px-3 py-1.5 rounded-full border text-[11px] font-semibold"
                            style={{
                              backgroundColor: tokens.activeTintBg,
                              borderColor: tokens.activeTintBorder,
                              color: tokens.activeTintInk,
                            }}
                          >
                            {t.applyPalette}
                          </button>

                          {confirmDeleteId === item.id ? (
                            <button
                              type="button"
                              onClick={() => handleDeletePalette(item.id)}
                              className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-red-600 text-white"
                            >
                              {t.confirmDelete}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              aria-label={t.deletePalette}
                              className="w-8 h-8 rounded-full border flex items-center justify-center"
                              style={{
                                backgroundColor: tokens.elevatedBg,
                                borderColor: tokens.border,
                                color: tokens.muted,
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {toastText && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-[12px] font-semibold shadow-lg"
          style={{
            backgroundColor: tokens.primaryBtnBg,
            color: tokens.primaryBtnInk,
          }}
        >
          {toastText}
        </div>
      )}

      {showGuide && <GuideModal t={t} tokens={tokens} onClose={() => setShowGuide(false)} />}

      {showProModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6"
          style={{ backgroundColor: 'rgba(10, 10, 12, 0.56)' }}
          onClick={() => {
            if (!isPaymentBusy) setShowProModal(false)
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border p-5"
            style={{
              backgroundColor: tokens.cardBg,
              borderColor: tokens.strongBorder,
              boxShadow: tokens.shadowCard,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[16px] font-semibold mb-1.5" style={{ color: tokens.ink }}>
              {t.proTitle}
            </div>
            <p className="text-[12px] leading-relaxed mb-3" style={{ color: tokens.muted }}>
              {t.proDesc}
            </p>
            {paymentError && (
              <div className="mb-3 px-3 py-2 rounded-xl text-[11px] bg-red-500/10 text-red-500 border border-red-500/20">
                {paymentError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPaymentBusy}
                onClick={() => setShowProModal(false)}
                className="flex-1 py-2.5 rounded-2xl border text-[12px] font-semibold"
                style={{
                  backgroundColor: tokens.elevatedBg,
                  borderColor: tokens.border,
                  color: tokens.ink,
                }}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={isPaymentBusy}
                onClick={() => {
                  void handleBuyPro()
                }}
                className="flex-1 py-2.5 rounded-2xl text-[12px] font-semibold"
                style={{
                  backgroundColor: tokens.primaryBtnBg,
                  color: tokens.primaryBtnInk,
                }}
              >
                {isPaymentBusy
                  ? t.proProcessing
                  : t.proBuyBtn.replace('{stars}', String(PRO_PRICE_STARS))}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
