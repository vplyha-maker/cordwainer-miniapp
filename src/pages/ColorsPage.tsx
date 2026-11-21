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
  SlidersHorizontal,
  HelpCircle,
  Lock,
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
  setActiveStudioBg,
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

function getProportionalDotSize(index: number, total: number): number {
  if (total >= 4) {
    const sizes = [28, 22, 18, 14]
    return sizes[index] ?? 14
  }
  const sizes = [28, 22, 16]
  return sizes[index] ?? 16
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
  setActiveStudioBg(studioBg)
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

  const inspectorScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (inspectorScrollRef.current) {
      inspectorScrollRef.current.scrollTop = 0
    }
  }, [activeTab, subTool, showSettings])

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
    void studioBgHex
    void studioBg.autoContrast
    return applySoleColorToFootwear(honestBase, soleConfig)
  }, [harmonyPalette, baseHue, tintWhite, shadeBlack, chromaScale, modelMode, preset, soleConfig, studioBgHex, studioBg.autoContrast])

  const contrast = useMemo(
    () => evaluateHarmonyContrast(harmonyPalette, sneakerColors),
    [harmonyPalette, sneakerColors]
  )

  const slotPrimary = harmonyPalette[0]
  const slotSecondary = harmonyPalette[1] ?? harmonyPalette[0]
  const slotAccent = harmonyPalette[harmonyPalette.length - 1] ?? harmonyPalette[0]

  const showToast = useCallback((msg: string) => {
    setToastText(msg)
    window.setTimeout(() => setToastText(null), 1800)
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
    const paletteLines =
      harmonyPalette.length === 4
        ? [
            '60% Primary: ' + harmonyPalette[0] + ' (' + formatOklch(harmonyPalette[0]) + ')',
            '20% Secondary: ' + harmonyPalette[1] + ' (' + formatOklch(harmonyPalette[1]) + ')',
            '10% Tertiary: ' + harmonyPalette[2] + ' (' + formatOklch(harmonyPalette[2]) + ')',
            '10% Accent: ' + harmonyPalette[3] + ' (' + formatOklch(harmonyPalette[3]) + ')',
          ]
        : [
            '60% Primary: ' + slotPrimary + ' (' + formatOklch(slotPrimary) + ')',
            '30% Secondary: ' + slotSecondary + ' (' + formatOklch(slotSecondary) + ')',
            '10% Accent: ' + slotAccent + ' (' + formatOklch(slotAccent) + ')',
          ]
    const lines = [
      'CORDWAINE COLOR LAB — TECH SPEC',
      'Model: ' + (modelMeta?.name ?? modelId.toUpperCase()),
      'Harmony: ' + t.schemes[scheme].name + ' (' + modelMode.toUpperCase() + ' ' + Math.round(baseHue) + '°)',
      'Preset: ' + t.presets[preset],
      'Contrast: ' + contrast.ratioText,
      '--- PALETTE ---',
      ...paletteLines,
      '--- 13 ZONES ---',
      ...SPEC_ZONES.map((z) => t.zones[z] + ': ' + sneakerColors[z]),
    ]
    copyText('spec', lines.join('\n'))
    showToast(t.copied)
  }, [
    modelId,
    harmonyPalette,
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
      colors: [...harmonyPalette],
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
    harmonyPalette,
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

  const ThemeIcon = themeMode === 'day' ? Sun : themeMode === 'night' ? Moon : Monitor

  const swatchItems = useMemo(() => {
    if (harmonyPalette.length >= 4) {
      return [
        { key: 'c0', hex: harmonyPalette[0], share: '60%', flex: 'flex-[3.4]' },
        { key: 'c1', hex: harmonyPalette[1], share: '20%', flex: 'flex-[2.4]' },
        { key: 'c2', hex: harmonyPalette[2], share: '10%', flex: 'flex-[2.1]' },
        { key: 'c3', hex: harmonyPalette[3], share: '10%', flex: 'flex-[2.1]' },
      ]
    }
    return [
      { key: 'c0', hex: slotPrimary, share: '60%', flex: 'flex-[5]' },
      { key: 'c1', hex: slotSecondary, share: '30%', flex: 'flex-[3.2]' },
      { key: 'c2', hex: slotAccent, share: '10%', flex: 'flex-[2.8]' },
    ]
  }, [harmonyPalette, slotPrimary, slotSecondary, slotAccent])

  const swatchStrip = (
    <div
      className="shrink-0 px-4 py-2 border-t"
      style={{
        backgroundColor: tokens.pageBg,
        borderColor: tokens.border,
      }}
    >
      <div className="flex items-stretch gap-1.5">
        {swatchItems.map((slot) => (
          <button
            key={slot.key}
            type="button"
            onClick={() => {
              copyText(slot.key, slot.hex)
              showToast(slot.hex + ' · ' + t.copied)
            }}
            className={`${slot.flex} min-w-0 text-left`}
            title={t.copyHex}
          >
            <div
              className="h-5 w-full rounded-md border flex items-center justify-end px-1.5"
              style={{
                backgroundColor: slot.hex,
                borderColor: tokens.strongBorder,
              }}
            >
              <span
                className="text-[9px] font-mono font-semibold leading-none"
                style={{
                  color: isStudioBgDark(slot.hex) ? 'rgba(255,255,255,0.88)' : 'rgba(24,22,19,0.72)',
                }}
              >
                {slot.share}
              </span>
            </div>
            <div className="hidden md:block mt-1 text-[10.5px] font-mono tabular-nums font-medium leading-none" style={{ color: tokens.ink }}>
              {copiedKey === slot.key ? t.copied : slot.hex}
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const inspectorContent = showSettings ? (
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
      {activeTab === 'colors' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-2 border-b" style={{ borderColor: tokens.border }}>
            <div className="flex items-center gap-5">
              {(
                [
                  { id: 'tone', label: t.subTabs.tone },
                  { id: 'sole', label: t.subTabs.sole },
                  { id: 'bg', label: t.subTabs.bg },
                ] as const
              ).map(({ id, label }) => {
                const active = subTool === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('select', hapticsEnabled)
                      setSubTool(id)
                    }}
                    className="pb-2.5 text-[14px] font-medium border-b-2 -mb-px transition-colors"
                    style={{
                      borderColor: active ? tokens.activeTintBorder : 'transparent',
                      color: active ? tokens.ink : tokens.muted,
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <span className="pb-2.5 text-[12px] font-mono tabular-nums" style={{ color: tokens.muted }}>
              {modelMode.toUpperCase()} {Math.round(baseHue)}°
            </span>
          </div>

          {subTool === 'tone' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                  {ALL_SCHEMES.map((sc) => {
                    const active = scheme === sc
                    const locked = !isPro && !FREE_SCHEMES.includes(sc)
                    return (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => handleSelectScheme(sc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors"
                        style={{
                          backgroundColor: active ? tokens.activeTintBg : 'transparent',
                          borderColor: active ? tokens.activeTintBorder : tokens.border,
                          color: active ? tokens.ink : tokens.muted,
                        }}
                      >
                        {locked && <Lock className="w-3 h-3 opacity-75" />}
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
                        className="px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors"
                        style={{
                          backgroundColor: active ? tokens.elevatedBg : 'transparent',
                          color: active ? tokens.ink : tokens.subtle,
                        }}
                      >
                        {t.presets[pr]}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center gap-5">
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
                    className="relative w-32 h-32 rounded-full touch-none select-none cursor-crosshair shrink-0 border"
                    style={{
                      background: wheelGradient,
                      borderColor: tokens.strongBorder,
                    }}
                  >
                    <div
                      className="absolute inset-7 rounded-full border"
                      style={{
                        backgroundColor: slotPrimary,
                        borderColor: 'rgba(255,255,255,0.45)',
                      }}
                    />
                    {wheelAngles.map((ang, idx) => {
                      const rad = ((ang - 90) * Math.PI) / 180
                      const r = 50
                      const cx = 64 + Math.cos(rad) * r
                      const cy = 64 + Math.sin(rad) * r
                      const markerSize = idx === 0 ? 17 : idx === 1 ? 13 : idx === 2 ? 11 : 9
                      const markerColor =
                        wheelAngles.length === 2 && idx === 1
                          ? slotAccent
                          : harmonyPalette[idx] ?? slotAccent
                      return (
                        <span
                          key={idx}
                          className="absolute rounded-full border-2 border-white shadow pointer-events-none"
                          style={{
                            width: markerSize,
                            height: markerSize,
                            left: cx - markerSize / 2,
                            top: cy - markerSize / 2,
                            backgroundColor: markerColor,
                          }}
                        />
                      )
                    })}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div
                      className="text-[18px] font-medium leading-tight"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif", color: tokens.ink }}
                    >
                      {t.schemes[scheme].name}
                    </div>
                    <p className="text-[12px] leading-relaxed" style={{ color: tokens.muted }}>
                      {t.schemes[scheme].desc}
                    </p>
                    <div className="pt-1 text-[12px] font-mono tabular-nums" style={{ color: tokens.ink }}>
                      {t.contrastLabel} {contrast.ratioText} · {t.contrastLevels[contrast.level]}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleSavePalette}
                    className="py-2.5 px-3 rounded-xl text-[13px] font-medium flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                    style={{
                      backgroundColor: tokens.primaryBtnBg,
                      color: tokens.primaryBtnInk,
                    }}
                  >
                    <Bookmark className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t.savePalette}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySpec}
                    className="py-2.5 px-3 rounded-xl border text-[13px] font-medium flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                    style={{
                      backgroundColor: tokens.cardBg,
                      borderColor: tokens.border,
                      color: tokens.ink,
                    }}
                  >
                    {copiedKey === 'spec' ? (
                      <Check className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate">{copiedKey === 'spec' ? t.copied : t.copySpec}</span>
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

              <div className="xl:hidden pt-5 border-t" style={{ borderColor: tokens.border }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium" style={{ color: tokens.ink }}>
                    {t.specTitle}
                  </span>
                  <span className="text-[12px]" style={{ color: tokens.subtle }}>
                    {t.honestBadge}
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: tokens.border }}>
                  {SPEC_ZONES.map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => copyText(z, sneakerColors[z])}
                      className="w-full flex items-center justify-between gap-3 py-2.5 text-left transition-opacity active:opacity-75"
                      style={{ borderColor: tokens.border }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-4 h-4 rounded shrink-0 border"
                          style={{ backgroundColor: sneakerColors[z], borderColor: tokens.strongBorder }}
                        />
                        <span className="text-[13px]" style={{ color: tokens.ink }}>
                          {t.zones[z]}
                        </span>
                      </div>
                      <span className="text-[12px] font-mono tabular-nums shrink-0" style={{ color: tokens.muted }}>
                        {copiedKey === z ? t.copied : sneakerColors[z]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
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
        </div>
      )}

      {activeTab === 'models' && (
        <div className="divide-y" style={{ borderColor: tokens.border }}>
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
                className="w-full py-4 px-1 text-left flex items-center justify-between gap-4 transition-colors"
                style={{ borderColor: tokens.border }}
              >
                <div className="min-w-0">
                  <div
                    className="text-[16px] font-medium tracking-tight"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      color: active ? tokens.activeTintBorder : tokens.ink,
                    }}
                  >
                    {m.name}
                  </div>
                  <div className="text-[13px] mt-1 leading-relaxed" style={{ color: tokens.muted }}>
                    {t.modelNotes[m.id]}
                  </div>
                </div>
                <span
                  className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: active ? tokens.activeTintBorder : 'transparent',
                    borderColor: active ? tokens.activeTintBorder : tokens.strongBorder,
                    color: '#FFFFFF',
                  }}
                >
                  {active && <Check className="w-3.5 h-3.5" />}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {activeTab === 'harmonies' && (
        <div className="divide-y" style={{ borderColor: tokens.border }}>
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
                className="w-full py-4 px-1 text-left flex items-center justify-between gap-4 transition-colors"
                style={{ borderColor: tokens.border }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[15px] font-medium"
                      style={{ color: active ? tokens.activeTintBorder : tokens.ink }}
                    >
                      {t.schemes[sc].name}
                    </span>
                    {locked && (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider"
                        style={{
                          backgroundColor: tokens.elevatedBg,
                          color: tokens.activeTintBorder,
                        }}
                      >
                        {t.proBadge}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] mt-1 leading-relaxed" style={{ color: tokens.muted }}>
                    {t.schemes[sc].desc}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {preview.map((hex, i) => {
                    const size = getProportionalDotSize(i, preview.length)
                    return (
                      <span
                        key={i}
                        className="rounded-full border shrink-0"
                        style={{
                          width: size,
                          height: size,
                          backgroundColor: hex,
                          borderColor: tokens.strongBorder,
                        }}
                      />
                    )
                  })}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {activeTab === 'palette' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleSavePalette}
            className="w-full py-3 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2"
            style={{
              backgroundColor: tokens.primaryBtnBg,
              color: tokens.primaryBtnInk,
            }}
          >
            <Bookmark className="w-4 h-4" />
            {t.savePalette}
          </button>

          {savedPalettes.length === 0 ? (
            <div className="py-8 text-center text-[13px] leading-relaxed" style={{ color: tokens.muted }}>
              {t.savedEmpty}
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: tokens.border }}>
              {savedPalettes.map((item) => (
                <div
                  key={item.id}
                  className="py-3.5 flex items-center justify-between gap-3"
                  style={{ borderColor: tokens.border }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1 shrink-0">
                      {item.colors.map((c, idx) => {
                        const size = getProportionalDotSize(idx, item.colors.length)
                        return (
                          <span
                            key={idx}
                            className="rounded-full border shrink-0"
                            style={{
                              width: size,
                              height: size,
                              backgroundColor: c,
                              borderColor: tokens.strongBorder,
                            }}
                          />
                        )
                      })}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium truncate" style={{ color: tokens.ink }}>
                        {t.schemes[item.scheme]?.name ?? item.scheme}
                      </div>
                      <div className="text-[12px] font-mono truncate" style={{ color: tokens.muted }}>
                        {item.modelId.toUpperCase()} · {item.baseHue}° · {t.presets[item.preset]}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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
                      className="px-3 py-1.5 rounded-lg border text-[12px] font-medium"
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
                        className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-red-600 text-white"
                      >
                        {t.confirmDelete}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        aria-label={t.deletePalette}
                        className="w-8 h-8 rounded-lg border flex items-center justify-center"
                        style={{
                          backgroundColor: tokens.cardBg,
                          borderColor: tokens.border,
                          color: tokens.muted,
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )

  return (
    <div
      className="fixed inset-0 z-30 h-[100dvh] flex flex-col overflow-hidden transition-colors duration-200"
      style={{
        backgroundColor: tokens.pageBg,
        color: tokens.ink,
        WebkitTextSizeAdjust: '100%',
      }}
    >
      <header
        className="shrink-0 z-40 border-b"
        style={{
          backgroundColor: tokens.headerBg,
          borderColor: tokens.border,
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="h-12 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleStepBack}
              className="inline-flex items-center gap-1 text-[14px] font-medium transition-opacity active:opacity-70"
              style={{ color: tokens.ink }}
            >
              <ChevronLeft className="w-5 h-5 -ml-1" />
              <span
                className="text-[18px] tracking-tight truncate"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {showSettings ? t.settingsTitle : t.title}
              </span>
            </button>

            {!isTelegram && (
              <span
                className="hidden md:inline-block text-[12px] uppercase tracking-[0.18em] pl-3 border-l"
                style={{ color: tokens.muted, borderColor: tokens.border }}
              >
                Cordwaine Studio
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 relative">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap', hapticsEnabled)
                setShowThemeMenu((v) => !v)
              }}
              aria-label="Theme"
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{
                backgroundColor: showThemeMenu ? tokens.elevatedBg : 'transparent',
                color: tokens.ink,
              }}
            >
              <ThemeIcon className="w-[18px] h-[18px]" />
            </button>

            {showThemeMenu && (
              <div
                className="absolute right-0 top-11 z-50 p-1 rounded-xl border flex items-center gap-1"
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
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors"
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
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: tokens.ink }}
            >
              <HelpCircle className="w-[18px] h-[18px]" />
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap', hapticsEnabled)
                setShowThemeMenu(false)
                setShowSettings((v) => !v)
              }}
              aria-label={t.settingsTitle}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{
                backgroundColor: showSettings ? tokens.activeTintBg : 'transparent',
                color: showSettings ? tokens.activeTintBorder : tokens.ink,
              }}
            >
              <SlidersHorizontal className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        <aside
          className="hidden xl:flex xl:w-[272px] shrink-0 flex-col border-r overflow-y-auto px-5 py-5 space-y-6"
          style={{
            backgroundColor: tokens.pageBg,
            borderColor: tokens.border,
          }}
        >
          <nav className="space-y-1">
            {(['colors', 'models', 'harmonies', 'palette'] as MainTab[]).map((tab) => {
              const active = !showSettings && activeTab === tab
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    triggerHaptic('select', hapticsEnabled)
                    setShowSettings(false)
                    setActiveTab(tab)
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-left text-[14px] font-medium flex items-center justify-between transition-colors"
                  style={{
                    backgroundColor: active ? tokens.activeTintBg : 'transparent',
                    color: active ? tokens.ink : tokens.muted,
                  }}
                >
                  <span>{t.tabs[tab]}</span>
                  {active && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: tokens.activeTintBorder }}
                    />
                  )}
                </button>
              )
            })}
          </nav>

          <div className="pt-5 border-t space-y-2.5" style={{ borderColor: tokens.border }}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium uppercase tracking-wider" style={{ color: tokens.muted }}>
                {t.specTitle}
              </span>
              <button
                type="button"
                onClick={handleCopySpec}
                className="text-[12px] font-medium"
                style={{ color: tokens.activeTintBorder }}
              >
                {copiedKey === 'spec' ? t.copied : t.copyHex}
              </button>
            </div>
            <div className="space-y-1">
              {SPEC_ZONES.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => copyText(z, sneakerColors[z])}
                  className="w-full flex items-center justify-between gap-2 py-1.5 px-2 rounded-md text-left transition-colors hover:opacity-85"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-sm shrink-0 border"
                      style={{ backgroundColor: sneakerColors[z], borderColor: tokens.strongBorder }}
                    />
                    <span className="text-[12px] truncate" style={{ color: tokens.ink }}>
                      {t.zones[z]}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono shrink-0" style={{ color: tokens.muted }}>
                    {copiedKey === z ? t.copied : sneakerColors[z]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section
          className="shrink-0 md:flex-1 flex flex-col border-b md:border-b-0 md:border-r"
          style={{
            borderColor: tokens.border,
            backgroundColor: studioBgHex,
          }}
        >
          {!showSettings && (
            <div
              className="shrink-0 px-4 py-2 flex items-center justify-between gap-2 border-b"
              style={{
                backgroundColor: tokens.pageBg,
                borderColor: tokens.border,
              }}
            >
              <div className="flex items-center gap-5">
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
                      className="text-[12px] font-medium tracking-wider whitespace-nowrap transition-colors"
                      style={{
                        color: active ? tokens.ink : tokens.subtle,
                        borderBottom: active ? `1.5px solid ${tokens.activeTintBorder}` : '1.5px solid transparent',
                        paddingBottom: '2px',
                      }}
                    >
                      {m.shortName}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div
            className="w-full md:flex-1 flex items-center justify-center"
            style={{ backgroundColor: studioBgHex }}
          >
            <div className="w-full">
              <Sneaker3D
                sneakerColors={sneakerColors}
                modelId={modelId}
                isDark={darkCanvas}
                resetLabel="360°"
              />
            </div>
          </div>

          {!showSettings && swatchStrip}
        </section>

        <section
          className="flex-1 min-h-0 md:flex-none md:w-[390px] lg:w-[430px] xl:w-[400px] flex flex-col overflow-hidden"
          style={{ backgroundColor: tokens.pageBg }}
        >
          {!showSettings && (
            <nav
              className="xl:hidden shrink-0 px-4 flex items-center justify-between border-b"
              style={{ borderColor: tokens.border }}
            >
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
                    className="py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors"
                    style={{
                      borderColor: active ? tokens.activeTintBorder : 'transparent',
                      color: active ? tokens.ink : tokens.muted,
                    }}
                  >
                    {t.tabs[tab]}
                  </button>
                )
              })}
            </nav>
          )}

          <div
            ref={inspectorScrollRef}
            className="flex-1 overflow-y-auto px-4 md:px-5 py-4"
            style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {inspectorContent}
          </div>
        </section>
      </div>

      {toastText && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-[13px] font-medium shadow-md"
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ backgroundColor: 'rgba(8, 8, 10, 0.64)' }}
          onClick={() => {
            if (!isPaymentBusy) setShowProModal(false)
          }}
        >
          <div
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border p-6"
            style={{
              backgroundColor: tokens.pageBg,
              borderColor: tokens.strongBorder,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="text-[20px] font-medium mb-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: tokens.ink }}
            >
              {t.proTitle}
            </div>
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: tokens.muted }}>
              {t.proDesc}
            </p>
            {paymentError && (
              <div className="mb-4 px-3 py-2 rounded-lg text-[12px] bg-red-500/10 text-red-400 border border-red-500/20">
                {paymentError}
              </div>
            )}
            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={isPaymentBusy}
                onClick={() => setShowProModal(false)}
                className="flex-1 py-3 rounded-xl border text-[13px] font-medium"
                style={{
                  backgroundColor: tokens.cardBg,
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
                className="flex-1 py-3 rounded-xl text-[13px] font-medium"
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
