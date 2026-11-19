import React, { useMemo, useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
import type { Lang } from '../App'
import {
  calculateProFit,
  formatSize,
  RANGES,
  STYLE_ALLOWANCES,
  type Gender,
  type ShoeStyle,
  type WidthFit,
  type MeasureMode,
  type BrandFitEntry,
} from '../lib/shoeSizes'
import {
  I18N,
  type SupportedLang,
  hapticSelection,
  hapticImpact,
  FlagEU,
  FlagUA,
  FlagUK,
  FlagUS,
  FlagJP,
  FlagBR,
  LockIcon,
} from '../lib/sizeCalcI18n'

type SizeCalcPageProps = {
  onBack: () => void
  lang: Lang
}

type ActiveTab = 'world' | 'fit' | 'brands' | 'guide'
type UnitMode = 'cm' | 'mm'

type SavedPrefs = {
  gender?: Gender
  measureMode?: MeasureMode
  unit?: UnitMode
  shoeStyle?: ShoeStyle
  widthFit?: WidthFit
  footMm?: number
}

const RULER_TICKS = 31
const PREFS_STORAGE_KEY = 'cordwaine_size_calc_prefs_v1'
const LEGACY_PREFS_STORAGE_KEY = 'cordwainer_size_calc_prefs_v1'
const THEME_STORAGE_KEY = 'cordwaine_theme'
const LEGACY_THEME_STORAGE_KEY = 'cordwainer_theme'
const SLIDER_HAPTIC_THROTTLE_MS = 36

const VALID_GENDERS: Gender[] = ['men', 'women', 'kids']
const VALID_MODES: MeasureMode[] = ['foot', 'insole']
const VALID_UNITS: UnitMode[] = ['cm', 'mm']
const VALID_STYLES: ShoeStyle[] = ['sneakers', 'classic', 'winter', 'running', 'sandals']
const VALID_WIDTHS: WidthFit[] = ['narrow', 'standard', 'wide', 'extraWide']

const UI_LABELS: Record<
  SupportedLang,
  {
    styleSection: string
    widthSection: string
    groupSport: string
    groupClassic: string
  }
> = {
  uk: {
    styleSection: 'Тип взуття та запас',
    widthSection: 'Повнота стопи',
    groupSport: 'Спорт і кросівки',
    groupClassic: 'Класика і шкіра',
  },
  ru: {
    styleSection: 'Тип обуви и запас',
    widthSection: 'Полнота стопы',
    groupSport: 'Спорт и кроссовки',
    groupClassic: 'Классика и кожа',
  },
  en: {
    styleSection: 'Footwear Type & Allowance',
    widthSection: 'Foot Width',
    groupSport: 'Sport & Sneakers',
    groupClassic: 'Classic & Leather',
  },
  de: {
    styleSection: 'Schuhtyp & Zugabe',
    widthSection: 'Fußweite',
    groupSport: 'Sport & Sneaker',
    groupClassic: 'Klassik & Leder',
  },
}

function FlagCN() {
  return (
    <svg
      width="18"
      height="13"
      viewBox="0 0 18 13"
      fill="none"
      aria-hidden="true"
      className="rounded-[2px] shrink-0"
    >
      <rect width="18" height="13" fill="#DE2910" />
      <polygon
        points="3.6,1.8 4.15,3.5 5.95,3.5 4.5,4.55 5.05,6.25 3.6,5.2 2.15,6.25 2.7,4.55 1.25,3.5 3.05,3.5"
        fill="#FFDE00"
      />
      <circle cx="7.2" cy="1.8" r="0.55" fill="#FFDE00" />
      <circle cx="8.3" cy="3.1" r="0.55" fill="#FFDE00" />
      <circle cx="8.3" cy="4.8" r="0.55" fill="#FFDE00" />
      <circle cx="7.2" cy="6.1" r="0.55" fill="#FFDE00" />
    </svg>
  )
}

function normalizeBrandName(text: string): string {
  return text.replace(/cordwainer/gi, (match) => {
    if (match === match.toUpperCase()) return 'CORDWAINE'
    if (match[0] === match[0].toUpperCase()) return 'Cordwaine'
    return 'cordwaine'
  })
}

function safeHapticSelection() {
  try {
    hapticSelection()
  } catch {}
}

function safeHapticImpact(style: 'light' | 'medium' | 'heavy') {
  try {
    hapticImpact(style)
  } catch {}
}

function detectTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false
  const tg = (window as unknown as {
    Telegram?: {
      WebApp?: {
        initData?: string
        platform?: string
      }
    }
  }).Telegram?.WebApp
  return Boolean(tg && (tg.initData || (tg.platform && tg.platform !== 'unknown')))
}

function loadSavedPrefs(): SavedPrefs {
  if (typeof window === 'undefined') return {}
  try {
    const raw =
      window.localStorage.getItem(PREFS_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_PREFS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<SavedPrefs>
    const gender = parsed.gender && VALID_GENDERS.includes(parsed.gender) ? parsed.gender : undefined
    const measureMode =
      parsed.measureMode && VALID_MODES.includes(parsed.measureMode) ? parsed.measureMode : undefined
    const unit = parsed.unit && VALID_UNITS.includes(parsed.unit) ? parsed.unit : undefined
    const shoeStyle =
      parsed.shoeStyle && VALID_STYLES.includes(parsed.shoeStyle) ? parsed.shoeStyle : undefined
    const widthFit =
      parsed.widthFit && VALID_WIDTHS.includes(parsed.widthFit) ? parsed.widthFit : undefined
    const activeGender: Gender = gender ?? 'men'
    const range = RANGES[activeGender]
    const footMm =
      typeof parsed.footMm === 'number' && Number.isFinite(parsed.footMm)
        ? Math.min(range.max, Math.max(range.min, Math.round(parsed.footMm)))
        : undefined
    return { gender, measureMode, unit, shoeStyle, widthFit, footMm }
  } catch {
    return {}
  }
}

function resolveInitialDarkTheme(): boolean {
  if (typeof document === 'undefined') return true
  try {
    const stored =
      window.localStorage.getItem(THEME_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
      return true
    }
    if (stored === 'light') {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
      return false
    }
  } catch {}

  if (document.documentElement.classList.contains('dark')) {
    return true
  }
  if (document.documentElement.classList.contains('light')) {
    return false
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
    return prefersDark
  }
  return true
}

function isClassicBrandEntry(row: BrandFitEntry): boolean {
  const cat = row.category.toUpperCase()
  return cat.includes('LEATHER') || cat.includes('CLASSIC') || cat.includes('DRESS')
}

export function SizeCalcPage({ onBack, lang }: SizeCalcPageProps) {
  const safeLang: SupportedLang =
    lang && (lang === 'ru' || lang === 'uk' || lang === 'de' || lang === 'en') ? lang : 'uk'
  const t = I18N[safeLang]
  const ui = UI_LABELS[safeLang]

  const initialPrefs = useMemo(() => loadSavedPrefs(), [])
  const [isTelegramMiniApp] = useState<boolean>(() => detectTelegramMiniApp())

  const onBackRef = useRef(onBack)
  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  const triggerBackNavigation = useCallback(() => {
    safeHapticImpact('medium')
    if (typeof onBackRef.current === 'function') {
      onBackRef.current()
    }
  }, [])

  useEffect(() => {
    const tg = (window as unknown as {
      Telegram?: {
        WebApp?: {
          BackButton?: {
            show?: () => void
            hide?: () => void
            onClick?: (cb: () => void) => void
            offClick?: (cb: () => void) => void
          }
        }
      }
    }).Telegram?.WebApp

    const tgBack = tg?.BackButton
    if (!tgBack?.onClick) return

    const listener = () => {
      safeHapticImpact('medium')
      onBackRef.current?.()
    }
    try {
      tgBack.show?.()
      tgBack.onClick(listener)
    } catch {}

    return () => {
      try {
        tgBack.offClick?.(listener)
        tgBack.hide?.()
      } catch {}
    }
  }, [])

  const [isDark, setIsDark] = useState<boolean>(() => resolveInitialDarkTheme())

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const toggleTheme = useCallback(() => {
    safeHapticImpact('light')
    setIsDark((prev) => {
      const next = !prev
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next)
        document.documentElement.classList.toggle('light', !next)
      }
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light')
      } catch {}
      return next
    })
  }, [])

  const [gender, setGender] = useState<Gender>(initialPrefs.gender ?? 'men')
  const [measureMode, setMeasureMode] = useState<MeasureMode>(initialPrefs.measureMode ?? 'foot')
  const [unit, setUnit] = useState<UnitMode>(initialPrefs.unit ?? 'mm')
  const [footMm, setFootMm] = useState<number>(
    initialPrefs.footMm ?? RANGES[initialPrefs.gender ?? 'men'].default
  )
  const [shoeStyle, setShoeStyle] = useState<ShoeStyle>(initialPrefs.shoeStyle ?? 'sneakers')
  const [widthFit, setWidthFit] = useState<WidthFit>(initialPrefs.widthFit ?? 'standard')
  const [activeTab, setActiveTab] = useState<ActiveTab>('world')
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [isDraggingSlider, setIsDraggingSlider] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const [isProPurchased, setIsProPurchased] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const lastHapticMmRef = useRef<number>(footMm)
  const lastHapticTsRef = useRef<number>(0)
  const holdTimerRef = useRef<number | null>(null)
  const holdIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    try {
      const payload: SavedPrefs = {
        gender,
        measureMode,
        unit,
        shoeStyle,
        widthFit,
        footMm,
      }
      window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(payload))
    } catch {}
  }, [gender, measureMode, unit, shoeStyle, widthFit, footMm])

  const range = RANGES[gender]

  const handleGenderChange = useCallback((g: Gender) => {
    safeHapticImpact('medium')
    setGender(g)
    const r = RANGES[g]
    setFootMm((prev) => {
      const clamped = Math.min(r.max, Math.max(r.min, prev))
      lastHapticMmRef.current = clamped
      return clamped
    })
  }, [])

  const proFit = useMemo(
    () => calculateProFit(footMm, gender, shoeStyle, widthFit),
    [footMm, gender, shoeStyle, widthFit]
  )

  const activeResult = proFit.recommendedSize

  const currentActiveMm = measureMode === 'foot' ? footMm : proFit.insoleMm
  const sliderMin =
    measureMode === 'foot' ? range.min : range.min + STYLE_ALLOWANCES[shoeStyle].insoleAddMm
  const sliderMax =
    measureMode === 'foot' ? range.max : range.max + STYLE_ALLOWANCES[shoeStyle].insoleAddMm
  const sliderMid = Math.round((sliderMin + sliderMax) / 2)

  const displayValue =
    unit === 'cm'
      ? (currentActiveMm / 10).toFixed(1).replace('.', ',')
      : String(Math.round(currentActiveMm))

  const pct = Math.min(100, Math.max(0, ((footMm - range.min) / (range.max - range.min)) * 100))

  const verifyPurchaseOnServer = useCallback(async (uid: number | string, rawInitData: string) => {
    try {
      const res = await fetch(
        `/api/check-purchase?userId=${encodeURIComponent(String(uid))}&productId=pro_sizes`,
        {
          cache: 'no-store',
          headers: rawInitData ? { 'X-Telegram-Init-Data': rawInitData } : {},
        }
      )
      if (!res.ok) return false
      const data = await res.json()
      const purchased = Boolean(data?.purchased)
      setIsProPurchased(purchased)
      try {
        if (purchased) {
          localStorage.setItem(`cordwaine_pro_sizes_${uid}`, '1')
        } else {
          localStorage.removeItem(`cordwaine_pro_sizes_${uid}`)
          localStorage.removeItem(`cordwainer_pro_sizes_${uid}`)
        }
      } catch {}
      return purchased
    } catch (err) {
      console.error('Ошибка проверки покупки:', err)
      return false
    }
  }, [])

  useEffect(() => {
    const tg = (window as unknown as {
      Telegram?: {
        WebApp?: {
          initData?: string
          initDataUnsafe?: { user?: { id?: number } }
        }
      }
    }).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id
    const rawInitData = typeof tg?.initData === 'string' ? tg.initData : ''
    if (!userId) return

    try {
      if (
        localStorage.getItem(`cordwaine_pro_sizes_${userId}`) === '1' ||
        localStorage.getItem(`cordwainer_pro_sizes_${userId}`) === '1'
      ) {
        setIsProPurchased(true)
      }
    } catch {}

    verifyPurchaseOnServer(userId, rawInitData)
  }, [verifyPurchaseOnServer])

  const handleProClick = async () => {
    setStatusError(null)
    const tg = (window as unknown as {
      Telegram?: {
        WebApp?: {
          initData?: string
          initDataUnsafe?: { user?: { id?: number } }
          openInvoice?: (url: string, cb: (status: string) => void) => void
        }
      }
    }).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id
    const rawInitData = typeof tg?.initData === 'string' ? tg.initData : ''

    if (!userId || !rawInitData) {
      safeHapticImpact('heavy')
      setStatusError(t.openInTelegramErr)
      return
    }

    setIsPurchasing(true)
    safeHapticImpact('medium')

    try {
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': rawInitData,
        },
        body: JSON.stringify({
          userId,
          productId: 'pro_sizes',
          initData: rawInitData,
        }),
      })

      const data = await response.json()

      if (response.status === 409 && data?.alreadyPurchased) {
        safeHapticImpact('heavy')
        setIsProPurchased(true)
        try {
          localStorage.setItem(`cordwaine_pro_sizes_${userId}`, '1')
        } catch {}
        setIsPurchasing(false)
        return
      }

      if (!response.ok || !data?.invoiceLink) {
        throw new Error(data?.error || 'Invoice generation failed')
      }

      tg?.openInvoice?.(data.invoiceLink, async (status: string) => {
        if (status === 'paid' || status === 'pending') {
          safeHapticImpact('heavy')
          setIsProPurchased(true)
          try {
            localStorage.setItem(`cordwaine_pro_sizes_${userId}`, '1')
          } catch {}
          setTimeout(() => {
            verifyPurchaseOnServer(userId, rawInitData)
          }, 1500)
        } else if (status === 'failed' || status === 'cancelled') {
          setStatusError(t.paymentCancelledErr)
        }
        setIsPurchasing(false)
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown'
      setStatusError(`${t.serverErrPrefix}: ${message}`)
      setIsPurchasing(false)
    }
  }

  const startEdit = () => {
    safeHapticImpact('light')
    setEditValue(
      unit === 'cm' ? (currentActiveMm / 10).toFixed(1) : String(Math.round(currentActiveMm))
    )
    setIsEditing(true)
  }

  const commitEdit = () => {
    const raw = parseFloat(editValue.replace(',', '.'))
    if (!isNaN(raw)) {
      const inputMm = Math.round(unit === 'cm' ? raw * 10 : raw)
      const targetFootMm = measureMode === 'foot' ? inputMm : inputMm - proFit.allowanceMm
      const clamped = Math.min(range.max, Math.max(range.min, targetFootMm))
      setFootMm(clamped)
      lastHapticMmRef.current = clamped
      safeHapticImpact('medium')
    }
    setIsEditing(false)
  }

  const applyStep = useCallback(
    (delta: number) => {
      setFootMm((prev) => {
        const next = Math.min(range.max, Math.max(range.min, prev + delta))
        if (next !== prev) {
          lastHapticMmRef.current = next
          safeHapticSelection()
        }
        return next
      })
    },
    [range.max, range.min]
  )

  const stopHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
  }, [])

  const startHold = useCallback(
    (delta: number, e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      stopHold()
      safeHapticImpact('light')
      setFootMm((prev) => {
        const next = Math.min(range.max, Math.max(range.min, prev + delta))
        lastHapticMmRef.current = next
        return next
      })
      holdTimerRef.current = window.setTimeout(() => {
        holdIntervalRef.current = window.setInterval(() => {
          applyStep(delta)
        }, 75)
      }, 300)
    },
    [applyStep, range.max, range.min, stopHold]
  )

  useEffect(() => {
    return () => stopHold()
  }, [stopHold])

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = Number(e.target.value)
    const nextFootMm =
      measureMode === 'foot'
        ? rawVal
        : Math.min(range.max, Math.max(range.min, rawVal - proFit.allowanceMm))
    setFootMm(nextFootMm)
    if (nextFootMm !== lastHapticMmRef.current) {
      lastHapticMmRef.current = nextFootMm
      const now = Date.now()
      if (now - lastHapticTsRef.current >= SLIDER_HAPTIC_THROTTLE_MS) {
        lastHapticTsRef.current = now
        safeHapticSelection()
      }
    }
  }

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const usLabel = gender === 'kids' ? 'US K' : gender === 'men' ? 'US M' : 'US W'

  const bgPage = isDark ? 'bg-[#0B0B0C]' : 'bg-[#F7F4EE]'
  const bgHeader = isDark ? 'bg-[#0B0B0C]/90' : 'bg-[#F7F4EE]/90'
  const bgSurface = isDark ? 'bg-[#141416]' : 'bg-[#EFEAE1]'
  const bgSurfaceSoft = isDark ? 'bg-[#1C1C20]' : 'bg-[#E5DFD3]'
  const textPrimary = isDark ? 'text-[#F4F0E8]' : 'text-[#181715]'
  const textSecondary = isDark ? 'text-[#A29D95]' : 'text-[#6D6860]'
  const textTertiary = isDark ? 'text-[#736F68]' : 'text-[#8C867D]'
  const hairline = isDark ? 'border-[#F4F0E8]/[0.08]' : 'border-[#181715]/[0.08]'
  const dividerClass = isDark ? 'divide-[#F4F0E8]/[0.08]' : 'divide-[#181715]/[0.08]'
  const accentHex = isDark ? '#C9A86A' : '#9A6B2F'
  const trackIdleHex = isDark ? 'rgba(244, 240, 232, 0.16)' : 'rgba(24, 23, 21, 0.16)'
  const activeInvert = isDark
    ? 'bg-[#F4F0E8] text-[#0B0B0C]'
    : 'bg-[#181715] text-[#F7F4EE]'

  const styleItems: Array<{ id: ShoeStyle; label: string; addMm: number }> = [
    { id: 'sneakers', label: t.styleSneakers, addMm: STYLE_ALLOWANCES.sneakers.insoleAddMm },
    { id: 'classic', label: t.styleClassic, addMm: STYLE_ALLOWANCES.classic.insoleAddMm },
    { id: 'winter', label: t.styleWinter, addMm: STYLE_ALLOWANCES.winter.insoleAddMm },
    { id: 'running', label: t.styleRunning, addMm: STYLE_ALLOWANCES.running.insoleAddMm },
    { id: 'sandals', label: t.styleSandals, addMm: STYLE_ALLOWANCES.sandals.insoleAddMm },
  ]

  const styleLabels: Record<ShoeStyle, string> = {
    sneakers: t.styleSneakers,
    classic: t.styleClassic,
    winter: t.styleWinter,
    running: t.styleRunning,
    sandals: t.styleSandals,
  }

  const worldSystems = [
    {
      code: 'UA',
      sub: t.subUa,
      val: formatSize(activeResult.ua),
      flag: <FlagUA />,
      free: true,
    },
    {
      code: 'EU',
      sub: t.subEu,
      val: formatSize(activeResult.eu),
      flag: <FlagEU />,
      free: true,
    },
    {
      code: usLabel,
      sub: t.subUs,
      val: formatSize(activeResult.us),
      flag: <FlagUS />,
      free: false,
    },
    {
      code: 'UK',
      sub: t.subUk,
      val: formatSize(activeResult.uk),
      flag: <FlagUK />,
      free: false,
    },
    {
      code: 'JP / CM',
      sub: t.subJp,
      val: `${formatSize(activeResult.jp)} (${activeResult.mondopoint})`,
      flag: <FlagJP />,
      free: false,
    },
    {
      code: 'BR / CN',
      sub: t.subBrCn,
      val: `${formatSize(activeResult.br)} / ${formatSize(activeResult.cn)}`,
      flag: (
        <span className="inline-flex items-center gap-1 shrink-0">
          <FlagBR />
          <FlagCN />
        </span>
      ),
      free: false,
    },
  ]

  const brandGroups = useMemo(() => {
    const sport = proFit.brandMatrix.filter((row) => !isClassicBrandEntry(row))
    const classic = proFit.brandMatrix.filter((row) => isClassicBrandEntry(row))
    const groups: Array<{ id: string; title: string; rows: BrandFitEntry[] }> = []
    if (sport.length > 0) groups.push({ id: 'sport', title: ui.groupSport, rows: sport })
    if (classic.length > 0) groups.push({ id: 'classic', title: ui.groupClassic, rows: classic })
    return groups
  }, [proFit.brandMatrix, ui.groupSport, ui.groupClassic])

  const dynamicAnnotationText =
    measureMode === 'foot'
      ? t.annotationFootMode(
          formatSize(activeResult.eu),
          formatSize(activeResult.ua),
          proFit.footMm,
          proFit.insoleMm,
          proFit.allowanceMm
        )
      : t.annotationInsoleMode(
          proFit.insoleMm,
          proFit.allowanceMm,
          proFit.footMm,
          formatSize(activeResult.eu),
          formatSize(activeResult.ua)
        )

  const formatScaleMark = (mm: number) =>
    unit === 'cm' ? (mm / 10).toFixed(1).replace('.', ',') : String(mm)

  const themeToggleBtn = (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all ${bgSurface} ${textSecondary}`}
    >
      {isDark ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="M4.93 4.93l1.41 1.41" />
          <path d="M17.66 17.66l1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="M6.34 17.66l-1.41 1.41" />
          <path d="M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )

  return (
    <div
      className={`min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden transition-colors duration-300 ${bgPage} ${textPrimary} select-none`}
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; -webkit-touch-callout: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 1. ВЕРХНЯЯ НАВИГАЦИЯ (БЕЗ ДУБЛИРОВАНИЯ ШАПКИ TELEGRAM MINI APP + SAFE-AREA) */}
      {!isTelegramMiniApp && (
        <header
          className={`sticky top-0 z-30 backdrop-blur-xl transition-colors duration-300 ${bgHeader} border-b ${hairline} pt-[env(safe-area-inset-top)]`}
        >
          <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={triggerBackNavigation}
              className={`inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-full text-xs font-sans font-medium tracking-wide cursor-pointer active:scale-95 transition-all ${bgSurface} ${textPrimary}`}
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
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span>{t.back}</span>
            </button>

            <span className="font-serif text-[13px] sm:text-sm uppercase tracking-[0.26em] font-medium">
              Cordwaine
            </span>

            {themeToggleBtn}
          </div>
        </header>
      )}

      <main
        className={`max-w-2xl mx-auto px-4 sm:px-6 pb-[max(2rem,env(safe-area-inset-bottom))] flex flex-col gap-5 ${
          isTelegramMiniApp ? 'pt-[calc(0.75rem+env(safe-area-inset-top))]' : 'pt-3.5'
        }`}
      >
        {/* 2. ПОЛ ПОЛЬЗОВАТЕЛЯ (+ ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ В TELEGRAM MINI APP) */}
        <section className="flex items-center gap-2.5">
          <div className={`flex-1 grid grid-cols-3 p-1 rounded-full ${bgSurface}`}>
            {(['men', 'women', 'kids'] as Gender[]).map((g) => {
              const active = gender === g
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleGenderChange(g)}
                  className={`relative py-2 px-2 rounded-full text-[11px] sm:text-xs font-sans font-semibold uppercase tracking-[0.08em] transition-colors cursor-pointer text-center whitespace-nowrap ${
                    active ? (isDark ? 'text-[#0B0B0C]' : 'text-[#F7F4EE]') : textSecondary
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="genderSegmentIndicator"
                      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                      className={`absolute inset-0 rounded-full ${activeInvert}`}
                    />
                  )}
                  <span className="relative z-10">{t[g]}</span>
                </button>
              )
            })}
          </div>

          {isTelegramMiniApp && themeToggleBtn}
        </section>

        {/* 3. БЛОК ИЗМЕРЕНИЯ И ПРЕЦИЗИОННЫЙ ПОЛЗУНОК */}
        <section className={`rounded-3xl p-4 sm:p-5 transition-colors duration-300 ${bgSurface}`}>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className={`inline-flex items-center p-0.5 rounded-full ${bgSurfaceSoft} min-w-0`}>
              {(['foot', 'insole'] as const).map((m) => {
                const active = measureMode === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      safeHapticImpact('medium')
                      setMeasureMode(m)
                    }}
                    className={`px-2.5 sm:px-3.5 py-1.5 rounded-full text-[10.5px] sm:text-[11px] font-sans font-semibold uppercase tracking-[0.05em] whitespace-nowrap transition-all cursor-pointer ${
                      active ? activeInvert : textSecondary
                    }`}
                  >
                    {m === 'foot' ? t.modeFoot : t.modeInsole}
                  </button>
                )
              })}
            </div>

            <div className={`inline-flex items-center p-0.5 rounded-full ${bgSurfaceSoft} shrink-0`}>
              {(['cm', 'mm'] as const).map((u) => {
                const active = unit === u
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      safeHapticImpact('light')
                      setUnit(u)
                    }}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10.5px] sm:text-[11px] font-sans font-semibold uppercase tracking-[0.06em] whitespace-nowrap transition-all cursor-pointer ${
                      active ? activeInvert : textSecondary
                    }`}
                  >
                    {u === 'cm' ? t.cmLabel : t.mmLabel}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mb-4">
            <button
              type="button"
              onPointerDown={(e) => startHold(-1, e)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              disabled={footMm <= range.min}
              aria-label="Decrease"
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full ${bgSurfaceSoft} ${textPrimary} flex items-center justify-center disabled:opacity-25 cursor-pointer shrink-0 active:scale-90 transition-transform`}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            <div onClick={startEdit} className="flex flex-col items-center cursor-pointer min-w-0">
              <span className={`text-[10px] font-sans font-medium uppercase tracking-[0.18em] ${textSecondary}`}>
                {measureMode === 'foot' ? t.footLengthLabel : t.insoleInputLabel}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    value={editValue}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                    onBlur={commitEdit}
                    onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                    className={`w-[116px] text-center text-[40px] sm:text-[46px] font-serif leading-none bg-transparent outline-none border-b ${hairline} ${textPrimary}`}
                    inputMode="decimal"
                  />
                ) : (
                  <span className="text-[42px] sm:text-[48px] font-serif leading-none tracking-tight tabular-nums">
                    {displayValue}
                  </span>
                )}
                <span className={`text-xs sm:text-sm font-sans font-medium uppercase ${textSecondary}`}>
                  {unit === 'cm' ? t.cmLabel : t.mmLabel}
                </span>
              </div>
            </div>

            <button
              type="button"
              onPointerDown={(e) => startHold(1, e)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              disabled={footMm >= range.max}
              aria-label="Increase"
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full ${bgSurfaceSoft} ${textPrimary} flex items-center justify-center disabled:opacity-25 cursor-pointer shrink-0 active:scale-90 transition-transform`}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <div className="relative w-full pt-1 pb-0.5">
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={1}
              value={currentActiveMm}
              onChange={handleSliderChange}
              onPointerDown={() => {
                setIsDraggingSlider(true)
                safeHapticImpact('light')
              }}
              onPointerUp={() => {
                setIsDraggingSlider(false)
                safeHapticImpact('light')
              }}
              onPointerCancel={() => setIsDraggingSlider(false)}
              className="w-full h-14 absolute inset-x-0 -top-1 z-30 opacity-0 cursor-pointer touch-pan-y"
            />

            <div className="relative mx-3 h-11 flex items-center justify-between pointer-events-none">
              <div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full"
                style={{ backgroundColor: trackIdleHex }}
              />

              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[2.5px] rounded-full transition-all duration-75"
                style={{
                  width: `${pct}%`,
                  backgroundColor: accentHex,
                }}
              />

              {Array.from({ length: RULER_TICKS }).map((_, idx) => {
                const tickPct = (idx / (RULER_TICKS - 1)) * 100
                const dist = Math.abs(tickPct - pct)
                const proximity = Math.max(0, 1 - dist / 14)
                const isMajor = idx % 5 === 0
                const baseHeight = isMajor ? 14 : 6
                const dynamicHeight = baseHeight + proximity * 12

                return (
                  <div
                    key={idx}
                    className="relative z-10 w-[1.5px] rounded-full transition-all duration-75"
                    style={{
                      height: `${dynamicHeight}px`,
                      backgroundColor: proximity > 0.28 ? accentHex : trackIdleHex,
                      opacity: proximity > 0.2 ? 1 : isMajor ? 0.72 : 0.36,
                    }}
                  />
                )
              })}

              <div
                className="absolute top-1/2 z-20 pointer-events-none transition-transform duration-100"
                style={{
                  left: `${pct}%`,
                  transform: `translate(-50%, -50%) scale(${isDraggingSlider ? 1.16 : 1})`,
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shadow-sm"
                  style={{
                    backgroundColor: isDark ? '#0B0B0C' : '#F7F4EE',
                    border: `2px solid ${accentHex}`,
                  }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: accentHex }}
                  />
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-3 items-center text-[10.5px] font-sans tabular-nums mt-0.5 px-1 ${textTertiary}`}>
              <span className="text-left">
                {formatScaleMark(sliderMin)} {unit === 'cm' ? t.cmLabel : t.mmLabel}
              </span>
              <span className="text-center opacity-70">{formatScaleMark(sliderMid)}</span>
              <span className="text-right">
                {formatScaleMark(sliderMax)} {unit === 'cm' ? t.cmLabel : t.mmLabel}
              </span>
            </div>
          </div>
        </section>

        {/* 4. ГЛАВНЫЙ РЕЗУЛЬТАТ UA / EU */}
        <section className="flex flex-col items-center text-center pt-1">
          <span className={`text-[10.5px] font-sans font-medium uppercase tracking-[0.22em] mb-2.5 ${textSecondary}`}>
            {t.yourSizeLabel}
          </span>

          <div className="w-full max-w-sm grid grid-cols-[1fr_1px_1fr] items-center">
            <div className="flex flex-col items-center pr-3">
              <span
                className="font-serif text-[64px] sm:text-[74px] leading-[0.92] tracking-tight tabular-nums transition-colors duration-200"
                style={{ color: accentHex }}
              >
                {formatSize(activeResult.ua)}
              </span>
              <div className="mt-2.5 inline-flex items-center gap-1.5">
                <FlagUA />
                <span className={`text-[11px] font-sans font-semibold uppercase tracking-[0.2em] ${textSecondary}`}>
                  UA
                </span>
              </div>
            </div>

            <div className={`h-14 w-px ${isDark ? 'bg-[#F4F0E8]/12' : 'bg-[#181715]/12'}`} />

            <div className="flex flex-col items-center pl-3">
              <span className="font-serif text-[56px] sm:text-[66px] leading-[0.92] tracking-tight tabular-nums transition-colors duration-200">
                {formatSize(activeResult.eu)}
              </span>
              <div className="mt-2.5 inline-flex items-center gap-1.5">
                <FlagEU />
                <span className={`text-[11px] font-sans font-semibold uppercase tracking-[0.2em] ${textSecondary}`}>
                  EU
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3.5 inline-flex items-center gap-2 text-xs font-sans">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: accentHex }}
            />
            <span
              className="font-medium tracking-wide"
              style={{ color: proFit.hasReserveShift ? accentHex : undefined }}
            >
              {proFit.hasReserveShift
                ? t.reserveActiveBadge
                : `${t.baseFitBadge} · JP ${formatSize(activeResult.jp)}`}
            </span>
          </div>

          <p className={`mt-2 max-w-md text-xs font-sans leading-relaxed ${textSecondary}`}>
            {dynamicAnnotationText}
          </p>
        </section>

        {/* 5. ПОКАЗАТЕЛИ ИЗМЕРЕНИЯ (АДАПТИВНАЯ СЕТКА 2×2 НА УЗКИХ ЭКРАНАХ, 4 В РЯД НА ШИРОКИХ) */}
        <section className={`grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-4 py-4 border-y ${hairline}`}>
          <div className="flex flex-col">
            <span className={`text-[10.5px] font-sans font-medium uppercase tracking-[0.14em] ${textTertiary}`}>
              {t.footTag}
            </span>
            <span className="mt-1 text-base font-sans font-medium tabular-nums">
              {proFit.footMm} {t.mmLabel}
            </span>
            <span className={`text-xs font-sans tabular-nums ${textSecondary}`}>
              {proFit.footCm.toFixed(1)} {t.cmLabel}
            </span>
          </div>

          <div className="flex flex-col">
            <span className={`text-[10.5px] font-sans font-medium uppercase tracking-[0.14em] ${textTertiary}`}>
              {t.ballTag}
            </span>
            <span className="mt-1 text-base font-sans font-medium tabular-nums">
              {proFit.ballGirthMm} {t.mmLabel}
            </span>
            <span className={`text-xs font-sans ${textSecondary}`}>
              EU {proFit.widthMarks.eu}
            </span>
          </div>

          <div className="flex flex-col">
            <span className={`text-[10.5px] font-sans font-medium uppercase tracking-[0.14em] ${textTertiary}`}>
              {t.insoleLabel}
            </span>
            <span className="mt-1 text-base font-sans font-medium tabular-nums" style={{ color: accentHex }}>
              {proFit.insoleMm} {t.mmLabel}
            </span>
            <span className={`text-xs font-sans tabular-nums ${textSecondary}`}>
              {proFit.insoleCm.toFixed(1)} {t.cmLabel}
            </span>
          </div>

          <div className="flex flex-col">
            <span className={`text-[10.5px] font-sans font-medium uppercase tracking-[0.14em] ${textTertiary}`}>
              {t.allowanceLabel}
            </span>
            <span className="mt-1 text-base font-sans font-medium tabular-nums">
              +{proFit.allowanceMm} {t.mmLabel}
            </span>
            <span className={`text-xs font-sans ${textSecondary}`}>
              {styleLabels[shoeStyle]}
            </span>
          </div>
        </section>

        {/* 6. ВКЛАДКИ: МИРОВЫЕ · КОЛОДКА · БРЕНДЫ · ЗАМЕР */}
        <section className="flex flex-col gap-4">
          <nav className={`grid grid-cols-4 border-b ${hairline}`}>
            {(
              [
                { id: 'world', label: t.tabWorld },
                { id: 'fit', label: t.tabFit },
                { id: 'brands', label: t.tabBrands },
                { id: 'guide', label: t.tabGuide },
              ] as Array<{ id: ActiveTab; label: string }>
            ).map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    safeHapticImpact('medium')
                    setActiveTab(tab.id)
                  }}
                  className={`relative pb-2.5 pt-1 text-[11.5px] sm:text-[12.5px] font-sans font-semibold uppercase tracking-[0.09em] transition-colors cursor-pointer truncate ${
                    active ? textPrimary : textSecondary
                  }`}
                >
                  {tab.label}
                  {active && (
                    <motion.span
                      layoutId="activeTabUnderline"
                      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                      className="absolute inset-x-2 bottom-0 h-[2px] rounded-full"
                      style={{ backgroundColor: accentHex }}
                    />
                  )}
                </button>
              )
            })}
          </nav>

          {/* ВКЛАДКА 1: МИРОВЫЕ СИСТЕМЫ */}
          {activeTab === 'world' && (
            <motion.div
              key="world"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            >
              {worldSystems.map((item) => {
                const unlocked = item.free || isProPurchased
                const isWideVal = item.val.length > 6
                return (
                  <div
                    key={item.code}
                    onClick={() => {
                      if (!unlocked) handleProClick()
                      else safeHapticSelection()
                    }}
                    className={`rounded-2xl p-4 flex flex-col justify-between min-h-[112px] transition-colors ${bgSurface} ${
                      !unlocked ? 'cursor-pointer active:scale-[0.98]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.flag}
                        <span className="text-xs font-sans font-semibold uppercase tracking-[0.1em] whitespace-nowrap">
                          {item.code}
                        </span>
                      </div>
                      {!unlocked && (
                        <span className={textTertiary}>
                          <LockIcon />
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      {unlocked ? (
                        <span
                          className={`font-serif leading-none tracking-tight tabular-nums block whitespace-nowrap ${
                            isWideVal ? 'text-[23px] sm:text-[25px]' : 'text-[28px] sm:text-[30px]'
                          }`}
                        >
                          {item.val}
                        </span>
                      ) : (
                        <span className="font-serif text-[26px] leading-none blur-[5px] opacity-35 select-none block">
                          42.5
                        </span>
                      )}
                      <span className={`text-[11px] font-sans block mt-2 truncate ${textSecondary}`}>
                        {item.sub}
                      </span>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* ВКЛАДКА 2: КОЛОДКА, СЕЗОН И ПОЛНОТА */}
          {activeTab === 'fit' && (
            <motion.div
              key="fit"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="flex flex-col gap-4"
            >
              <div>
                <span className={`block text-[10.5px] font-sans font-semibold uppercase tracking-[0.16em] mb-2 ${textTertiary}`}>
                  {ui.styleSection}
                </span>
                <div className="grid grid-cols-6 gap-2">
                  {styleItems.map((st, idx) => {
                    const active = shoeStyle === st.id
                    const spanClass = idx < 3 ? 'col-span-2' : 'col-span-3'
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          safeHapticImpact('medium')
                          setShoeStyle(st.id)
                        }}
                        className={`${spanClass} py-2.5 px-2.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                          active ? activeInvert : `${bgSurface} ${textPrimary}`
                        }`}
                      >
                        <span className="text-xs font-sans font-medium truncate max-w-full">
                          {st.label}
                        </span>
                        <span
                          className={`text-[10.5px] font-sans tabular-nums ${
                            active ? 'opacity-75' : textSecondary
                          }`}
                        >
                          +{st.addMm} {t.mmLabel}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <span className={`block text-[10.5px] font-sans font-semibold uppercase tracking-[0.16em] mb-2 ${textTertiary}`}>
                  {ui.widthSection}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'narrow', label: t.widthNarrow },
                      { id: 'standard', label: t.widthStandard },
                      { id: 'wide', label: t.widthWide },
                      { id: 'extraWide', label: t.widthExtraWide },
                    ] as Array<{ id: WidthFit; label: string }>
                  ).map((wf) => {
                    const active = widthFit === wf.id
                    return (
                      <button
                        key={wf.id}
                        type="button"
                        onClick={() => {
                          safeHapticImpact('medium')
                          setWidthFit(wf.id)
                        }}
                        className={`py-2.5 px-3 rounded-2xl text-xs font-sans font-medium tracking-wide cursor-pointer truncate transition-all ${
                          active ? textPrimary : `${bgSurface} ${textSecondary}`
                        }`}
                        style={
                          active
                            ? {
                                backgroundColor: isDark
                                  ? 'rgba(201, 168, 106, 0.16)'
                                  : 'rgba(154, 107, 47, 0.14)',
                                color: accentHex,
                              }
                            : undefined
                        }
                      >
                        {wf.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div
                onClick={() => {
                  if (!isProPurchased) handleProClick()
                }}
                className={`rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 ${bgSurface} ${
                  !isProPurchased ? 'cursor-pointer' : ''
                }`}
              >
                <div>
                  <span className={`text-[10.5px] font-sans uppercase tracking-[0.16em] block ${textTertiary}`}>
                    {t.insoleLabel} · {t.allowanceLabel}
                  </span>
                  <span className={`font-serif text-[25px] sm:text-[26px] leading-tight block mt-1.5 tabular-nums ${!isProPurchased ? 'blur-[5px]' : ''}`}>
                    {proFit.insoleMm} {t.mmLabel} ({proFit.insoleCm.toFixed(1)} {t.cmLabel})
                  </span>
                  <span className={`block text-xs mt-1.5 ${textSecondary}`}>
                    {t.footTag} {proFit.footMm} + {proFit.allowanceMm} →{' '}
                    <strong className="font-semibold" style={{ color: accentHex }}>
                      {formatSize(activeResult.ua)} UA / {formatSize(activeResult.eu)} EU
                    </strong>
                  </span>
                </div>

                <div className={`pt-4 border-t ${hairline} sm:pt-0 sm:border-t-0 sm:pl-5 sm:border-l`}>
                  <span className={`text-[10.5px] font-sans uppercase tracking-[0.16em] block ${textTertiary}`}>
                    {t.widthLabel} · {t.girthLabel}
                  </span>
                  <span className={`font-serif text-[25px] sm:text-[26px] leading-tight block mt-1.5 tabular-nums ${!isProPurchased ? 'blur-[5px]' : ''}`}>
                    {proFit.ballWidthMm} / {proFit.ballGirthMm} {t.mmLabel}
                  </span>
                  <span className={`block text-xs mt-1.5 ${textSecondary} ${!isProPurchased ? 'blur-[4px]' : ''}`}>
                    EU {proFit.widthMarks.eu} · US {proFit.widthMarks.us} · JP {proFit.widthMarks.jp}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ВКЛАДКА 3: СГРУППИРОВАННЫЕ БРЕНДЫ С ЕДИНЫМ ВЫРАВНИВАНИЕМ */}
          {activeTab === 'brands' && (
            <motion.div
              key="brands"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="flex flex-col gap-4"
            >
              {brandGroups.map((group) => (
                <div key={group.id} className="flex flex-col gap-2">
                  <span className={`text-[10.5px] font-sans font-semibold uppercase tracking-[0.16em] px-1 ${textTertiary}`}>
                    {group.title}
                  </span>

                  <div className={`rounded-2xl px-4 sm:px-5 divide-y ${bgSurface} ${dividerClass}`}>
                    {group.rows.map((row) => (
                      <div
                        key={row.brand}
                        onClick={() => {
                          if (!isProPurchased) handleProClick()
                          else safeHapticSelection()
                        }}
                        className={`py-4 flex items-start justify-between gap-4 ${
                          !isProPurchased ? 'cursor-pointer' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1 flex flex-col items-start">
                          <span className="text-[13.5px] font-sans font-semibold uppercase tracking-[0.06em] leading-snug">
                            {row.brand}
                          </span>
                          <span
                            className={`mt-1 text-[9.5px] font-sans font-medium uppercase tracking-[0.12em] px-2 py-0.5 rounded-full ${bgSurfaceSoft} ${textSecondary}`}
                          >
                            {row.category}
                          </span>
                          <p className={`text-xs font-sans leading-relaxed mt-2 ${textSecondary}`}>
                            {row.offsetNote[safeLang]}
                          </p>
                        </div>

                        {isProPurchased ? (
                          <div className="text-right shrink-0 min-w-[104px] pt-0.5">
                            <span className="font-serif text-[21px] block leading-none tabular-nums">
                              EU {row.eu}
                            </span>
                            <span
                              className="text-[11.5px] font-sans font-medium tabular-nums block mt-1.5"
                              style={{ color: accentHex }}
                            >
                              US {row.us} · UK {row.uk}
                            </span>
                            <span className={`text-[11px] font-sans tabular-nums block mt-0.5 ${textTertiary}`}>
                              JP {row.jp}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0 pt-1">
                            <span className="font-serif text-base blur-[5px] opacity-35 select-none">
                              EU 42.5
                            </span>
                            <span className={textTertiary}>
                              <LockIcon />
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* ВКЛАДКА 4: ИНСТРУКЦИЯ ЗАМЕРА */}
          {activeTab === 'guide' && (
            <motion.div
              key="guide"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className={`rounded-2xl p-4 sm:p-5 flex flex-col gap-4 ${bgSurface}`}
            >
              <div className="flex gap-3">
                <span className="font-serif text-lg leading-none pt-0.5 shrink-0" style={{ color: accentHex }}>
                  01
                </span>
                <div>
                  <h4 className="text-xs font-sans font-semibold uppercase tracking-[0.13em]">
                    {t.guideFootTitle}
                  </h4>
                  <p className="text-[13px] font-sans leading-relaxed mt-1">{t.measureGuide1}</p>
                  <p className={`text-xs font-sans leading-relaxed mt-1.5 ${textSecondary}`}>
                    {t.measureGuide2}
                  </p>
                </div>
              </div>

              <div className={`pt-4 border-t ${hairline} flex gap-3`}>
                <span className="font-serif text-lg leading-none pt-0.5 shrink-0" style={{ color: accentHex }}>
                  02
                </span>
                <div>
                  <h4 className="text-xs font-sans font-semibold uppercase tracking-[0.13em]">
                    {t.guideInsoleTitle}
                  </h4>
                  <p className="text-[13px] font-sans leading-relaxed mt-1">{t.measureGuide3}</p>
                </div>
              </div>

              <p className={`text-xs font-sans italic leading-relaxed pt-3.5 border-t ${hairline} ${textSecondary}`}>
                {t.measureTip}
              </p>
            </motion.div>
          )}
        </section>

        {/* 7. СТАТУС PRO ИЛИ ПОКУПКА */}
        <footer>
          {statusError && (
            <div className="mb-3 px-4 py-2.5 rounded-2xl bg-red-500/10 text-red-400 text-xs text-center">
              {statusError}
            </div>
          )}

          {!isProPurchased ? (
            <div className={`rounded-3xl p-4 sm:p-5 flex flex-col gap-3.5 ${bgSurface}`}>
              <div>
                <h3 className="font-serif text-lg tracking-tight leading-snug">{t.proTitle}</h3>
                <p className={`text-xs font-sans leading-relaxed mt-1 ${textSecondary}`}>
                  {t.proDesc}
                </p>
              </div>

              <button
                type="button"
                onClick={handleProClick}
                disabled={isPurchasing}
                className={`w-full min-h-[46px] py-3 px-5 rounded-2xl flex items-center justify-center gap-2 text-xs font-sans font-semibold uppercase tracking-[0.14em] cursor-pointer active:scale-[0.99] transition-transform ${activeInvert}`}
              >
                {isPurchasing ? (
                  <span className="animate-pulse">{t.loading}</span>
                ) : (
                  <>
                    <LockIcon />
                    <span>{t.proBtn}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className={`py-3 border-t ${hairline} flex items-center justify-between gap-3 text-[11px] font-sans uppercase tracking-[0.14em] ${textSecondary}`}>
              <span className="truncate">{normalizeBrandName(t.subtitle)}</span>
              <span className="shrink-0 font-semibold" style={{ color: accentHex }}>
                ★ {t.proActiveBadge}
              </span>
            </div>
          )}
        </footer>
      </main>
    </div>
  )
}
