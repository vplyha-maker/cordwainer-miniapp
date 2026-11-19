import React, { useMemo, useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
const PREFS_STORAGE_KEY = 'cordwainer_size_calc_prefs_v1'
const THEME_STORAGE_KEY = 'cordwainer_theme'
const SLIDER_HAPTIC_THROTTLE_MS = 32

const VALID_GENDERS: Gender[] = ['men', 'women', 'kids']
const VALID_MODES: MeasureMode[] = ['foot', 'insole']
const VALID_UNITS: UnitMode[] = ['cm', 'mm']
const VALID_STYLES: ShoeStyle[] = ['sneakers', 'classic', 'winter', 'running', 'sandals']
const VALID_WIDTHS: WidthFit[] = ['narrow', 'standard', 'wide', 'extraWide']

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

function loadSavedPrefs(): SavedPrefs {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY)
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
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
      return true
    }
    if (stored === 'light') {
      document.documentElement.classList.remove('dark')
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

export function SizeCalcPage({ onBack, lang }: SizeCalcPageProps) {
  const safeLang: SupportedLang =
    lang && (lang === 'ru' || lang === 'uk' || lang === 'de' || lang === 'en') ? lang : 'uk'
  const t = I18N[safeLang]

  const initialPrefs = useMemo(() => loadSavedPrefs(), [])

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
          localStorage.setItem(`cordwainer_pro_sizes_${uid}`, '1')
        } else {
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
      if (localStorage.getItem(`cordwainer_pro_sizes_${userId}`) === '1') {
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
          localStorage.setItem(`cordwainer_pro_sizes_${userId}`, '1')
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
            localStorage.setItem(`cordwainer_pro_sizes_${userId}`, '1')
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

  // Палитра Premium Fashion Tech (Dark & Light)
  const bgPage = isDark ? 'bg-[#0B0B0C]' : 'bg-[#F7F4EE]'
  const bgHeader = isDark ? 'bg-[#0B0B0C]/85' : 'bg-[#F7F4EE]/85'
  const bgSurface = isDark ? 'bg-[#141416]' : 'bg-[#EFEAE1]'
  const bgSurfaceSoft = isDark ? 'bg-[#1B1B1F]' : 'bg-[#E6E0D5]'
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
      flag: <FlagBR />,
      free: false,
    },
  ]

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

  return (
    <div
      className={`min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden transition-colors duration-300 ${bgPage} ${textPrimary} select-none`}
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; -webkit-touch-callout: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 1. ВЕРХНЯЯ НАВИГАЦИЯ */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-xl transition-colors duration-300 ${bgHeader} border-b ${hairline}`}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-3 pb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={triggerBackNavigation}
              className={`inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full text-xs font-sans font-medium tracking-wide cursor-pointer active:scale-95 transition-all ${bgSurface} ${textPrimary}`}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span>{t.back}</span>
            </button>

            <span className="font-serif text-[13px] sm:text-sm uppercase tracking-[0.26em] font-medium">
              Cordwainer
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-all ${bgSurface} ${textSecondary}`}
            >
              {isDark ? (
                <svg
                  width="17"
                  height="17"
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
                  width="16"
                  height="16"
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
          </div>

          {/* Сегментированный контрол: Мужской / Женский / Детский */}
          <div className={`grid grid-cols-3 p-1 rounded-full ${bgSurface}`}>
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
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className={`absolute inset-0 rounded-full ${activeInvert}`}
                    />
                  )}
                  <span className="relative z-10">{t[g]}</span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-10 flex flex-col gap-7">
        {/* 2. ГЛАВНЫЙ РЕЗУЛЬТАТ — ЦЕНТРАЛЬНЫЙ ЭЛЕМЕНТ КОМПОЗИЦИИ */}
        <section className="flex flex-col items-center text-center pt-1">
          <div className="inline-flex items-center gap-2 mb-3">
            <FlagUA />
            <span className={`text-[11px] font-sans font-medium uppercase tracking-[0.2em] ${textSecondary}`}>
              {t.yourSizeLabel}
            </span>
            <FlagEU />
          </div>

          <div className="flex items-end justify-center gap-6 sm:gap-10">
            <div className="flex flex-col items-center">
              <motion.span
                key={`ua-${activeResult.ua}`}
                initial={{ opacity: 0.45, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="font-serif text-[72px] sm:text-[88px] leading-[0.92] tracking-tight tabular-nums"
                style={{ color: accentHex }}
              >
                {formatSize(activeResult.ua)}
              </motion.span>
              <span className={`mt-2 text-[11px] font-sans font-semibold uppercase tracking-[0.22em] ${textSecondary}`}>
                UA
              </span>
            </div>

            <div className={`h-14 sm:h-16 w-px mb-6 ${isDark ? 'bg-[#F4F0E8]/12' : 'bg-[#181715]/12'}`} />

            <div className="flex flex-col items-center">
              <motion.span
                key={`eu-${activeResult.eu}`}
                initial={{ opacity: 0.45, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="font-serif text-[52px] sm:text-[64px] leading-[0.95] tracking-tight tabular-nums"
              >
                {formatSize(activeResult.eu)}
              </motion.span>
              <span className={`mt-2 text-[11px] font-sans font-semibold uppercase tracking-[0.22em] ${textSecondary}`}>
                EU
              </span>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 text-xs font-sans">
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
        </section>

        {/* 3. ДОПОЛНИТЕЛЬНЫЕ ПАРАМЕТРЫ (ОТКРЫТАЯ ТИПОГРАФИЧЕСКАЯ ПОЛОСА) */}
        <section className={`grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-4 py-4 border-y ${hairline}`}>
          <div className="flex flex-col">
            <span className={`text-[10px] font-sans uppercase tracking-[0.16em] ${textTertiary}`}>
              {t.footTag}
            </span>
            <span className="mt-1 text-base sm:text-lg font-sans font-medium tabular-nums">
              {proFit.footMm} {t.mmLabel}
            </span>
            <span className={`text-[11px] font-sans tabular-nums ${textSecondary}`}>
              {proFit.footCm.toFixed(1)} {t.cmLabel}
            </span>
          </div>

          <div className="flex flex-col">
            <span className={`text-[10px] font-sans uppercase tracking-[0.16em] ${textTertiary}`}>
              {t.ballTag}
            </span>
            <span className="mt-1 text-base sm:text-lg font-sans font-medium tabular-nums">
              {proFit.ballGirthMm} {t.mmLabel}
            </span>
            <span className={`text-[11px] font-sans ${textSecondary}`}>
              EU {proFit.widthMarks.eu}
            </span>
          </div>

          <div className="flex flex-col">
            <span className={`text-[10px] font-sans uppercase tracking-[0.16em] ${textTertiary}`}>
              {t.insoleLabel}
            </span>
            <span className="mt-1 text-base sm:text-lg font-sans font-medium tabular-nums" style={{ color: accentHex }}>
              {proFit.insoleMm} {t.mmLabel}
            </span>
            <span className={`text-[11px] font-sans tabular-nums ${textSecondary}`}>
              {proFit.insoleCm.toFixed(1)} {t.cmLabel}
            </span>
          </div>

          <div className="flex flex-col">
            <span className={`text-[10px] font-sans uppercase tracking-[0.16em] ${textTertiary}`}>
              {t.allowanceLabel}
            </span>
            <span className="mt-1 text-base sm:text-lg font-sans font-medium tabular-nums">
              +{proFit.allowanceMm} {t.mmLabel}
            </span>
            <span className={`text-[11px] font-sans truncate ${textSecondary}`}>
              {styleLabels[shoeStyle]}
            </span>
          </div>
        </section>

        {/* 4. БЛОК ИЗМЕРЕНИЯ И ИНТЕРАКТИВНЫЙ МИКРОМЕТР */}
        <section className={`rounded-3xl p-5 sm:p-6 transition-colors duration-300 ${bgSurface}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div className={`inline-flex items-center p-1 rounded-full ${bgSurfaceSoft}`}>
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
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.08em] transition-all cursor-pointer ${
                      active ? activeInvert : textSecondary
                    }`}
                  >
                    {m === 'foot' ? t.modeFoot : t.modeInsole}
                  </button>
                )
              })}
            </div>

            <div className={`inline-flex items-center p-1 rounded-full ${bgSurfaceSoft}`}>
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
                    className={`px-3 py-1.5 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.08em] transition-all cursor-pointer ${
                      active ? activeInvert : textSecondary
                    }`}
                  >
                    {u === 'cm' ? t.cmLabel : t.mmLabel}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Крупный ввод значения + кнопки уменьшения / увеличения */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <button
              type="button"
              onPointerDown={(e) => startHold(-1, e)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              disabled={footMm <= range.min}
              aria-label="Decrease"
              className={`w-12 h-12 rounded-full ${bgSurfaceSoft} ${textPrimary} flex items-center justify-center disabled:opacity-25 cursor-pointer shrink-0 active:scale-90 transition-transform`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            <div onClick={startEdit} className="flex flex-col items-center cursor-pointer min-w-0">
              <span className={`text-[10.5px] font-sans font-medium uppercase tracking-[0.18em] ${textSecondary}`}>
                {measureMode === 'foot' ? t.footLengthLabel : t.insoleInputLabel}
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    value={editValue}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                    onBlur={commitEdit}
                    onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                    className={`w-[120px] text-center text-[44px] sm:text-[52px] font-serif leading-none bg-transparent outline-none border-b ${hairline} ${textPrimary}`}
                    inputMode="decimal"
                  />
                ) : (
                  <span className="text-[46px] sm:text-[54px] font-serif leading-none tracking-tight tabular-nums">
                    {displayValue}
                  </span>
                )}
                <span className={`text-sm font-sans font-medium uppercase ${textSecondary}`}>
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
              className={`w-12 h-12 rounded-full ${bgSurfaceSoft} ${textPrimary} flex items-center justify-center disabled:opacity-25 cursor-pointer shrink-0 active:scale-90 transition-transform`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Прецизионный измеритель */}
          <div className="relative w-full pt-2 pb-1">
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
              className="w-full h-12 absolute inset-x-0 top-0 z-30 opacity-0 cursor-pointer"
            />

            <div className="relative h-10 flex items-center justify-between px-1 pointer-events-none">
              <div
                className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-[2px] rounded-full"
                style={{ backgroundColor: trackIdleHex }}
              />

              <div
                className="absolute left-1 top-1/2 -translate-y-1/2 h-[2px] rounded-full transition-all duration-75"
                style={{
                  width: `calc(${pct}% - 2px)`,
                  backgroundColor: accentHex,
                }}
              />

              {Array.from({ length: RULER_TICKS }).map((_, idx) => {
                const tickPct = (idx / (RULER_TICKS - 1)) * 100
                const dist = Math.abs(tickPct - pct)
                const proximity = Math.max(0, 1 - dist / 14)
                const isMajor = idx % 5 === 0
                const baseHeight = isMajor ? 12 : 5
                const dynamicHeight = baseHeight + proximity * 12

                return (
                  <div
                    key={idx}
                    className="relative z-10 w-[1.5px] rounded-full transition-all duration-75"
                    style={{
                      height: `${dynamicHeight}px`,
                      backgroundColor: proximity > 0.3 ? accentHex : trackIdleHex,
                      opacity: proximity > 0.2 ? 1 : isMajor ? 0.65 : 0.35,
                    }}
                  />
                )
              })}

              <div
                className="absolute top-1/2 z-20 pointer-events-none transition-transform duration-100"
                style={{
                  left: `calc(${pct}% - 12px)`,
                  transform: `translateY(-50%) scale(${isDraggingSlider ? 1.15 : 1})`,
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
                  style={{
                    backgroundColor: isDark ? '#0B0B0C' : '#F7F4EE',
                    border: `2px solid ${accentHex}`,
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: accentHex }}
                  />
                </div>
              </div>
            </div>

            <div className={`flex justify-between items-center text-[11px] font-sans tabular-nums mt-1 ${textTertiary}`}>
              <span>
                {unit === 'cm' ? (sliderMin / 10).toFixed(1) : sliderMin} {unit === 'cm' ? t.cmLabel : t.mmLabel}
              </span>
              <span>
                {unit === 'cm' ? (sliderMax / 10).toFixed(1) : sliderMax} {unit === 'cm' ? t.cmLabel : t.mmLabel}
              </span>
            </div>
          </div>

          <p className={`mt-4 pt-3.5 border-t ${hairline} text-xs font-sans leading-relaxed ${textSecondary}`}>
            {dynamicAnnotationText}
          </p>
        </section>

        {/* 5. НАВИГАЦИЯ ПО ВКЛАДКАМ (РЕДАКЦИОННОЕ ПОДЧЁРКИВАНИЕ) */}
        <section className="flex flex-col gap-5">
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
                  className={`relative pb-3 pt-1 text-xs sm:text-[13px] font-sans font-semibold uppercase tracking-[0.1em] transition-colors cursor-pointer truncate ${
                    active ? textPrimary : textSecondary
                  }`}
                >
                  {tab.label}
                  {active && (
                    <motion.span
                      layoutId="activeTabUnderline"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-x-2 bottom-0 h-[2px] rounded-full"
                      style={{ backgroundColor: accentHex }}
                    />
                  )}
                </button>
              )
            })}
          </nav>

          <AnimatePresence mode="wait">
            {/* ВКЛАДКА 1: МИРОВЫЕ СИСТЕМЫ */}
            {activeTab === 'world' && (
              <motion.div
                key="world"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              >
                {worldSystems.map((item) => {
                  const unlocked = item.free || isProPurchased
                  return (
                    <div
                      key={item.code}
                      onClick={() => {
                        if (!unlocked) handleProClick()
                        else safeHapticSelection()
                      }}
                      className={`rounded-2xl p-4 flex flex-col justify-between min-h-[104px] transition-colors ${bgSurface} ${
                        !unlocked ? 'cursor-pointer active:scale-[0.98]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {item.flag}
                          <span className="text-xs font-sans font-semibold uppercase tracking-[0.12em] whitespace-nowrap">
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
                          <span className="font-serif text-[26px] leading-none tracking-tight tabular-nums block">
                            {item.val}
                          </span>
                        ) : (
                          <span className="font-serif text-[24px] leading-none blur-[5px] opacity-35 select-none block">
                            42.5
                          </span>
                        )}
                        <span className={`text-[11px] font-sans block mt-1.5 truncate ${textSecondary}`}>
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
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'sneakers', label: t.styleSneakers },
                        { id: 'classic', label: t.styleClassic },
                        { id: 'winter', label: t.styleWinter },
                        { id: 'running', label: t.styleRunning },
                        { id: 'sandals', label: t.styleSandals },
                      ] as Array<{ id: ShoeStyle; label: string }>
                    ).map((st) => {
                      const active = shoeStyle === st.id
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            safeHapticImpact('medium')
                            setShoeStyle(st.id)
                          }}
                          className={`px-3.5 py-2 rounded-full text-xs font-sans font-medium tracking-wide cursor-pointer transition-all ${
                            active ? activeInvert : `${bgSurface} ${textSecondary}`
                          }`}
                        >
                          {st.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

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

                <div
                  onClick={() => {
                    if (!isProPurchased) handleProClick()
                  }}
                  className={`rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-5 ${bgSurface} ${
                    !isProPurchased ? 'cursor-pointer' : ''
                  }`}
                >
                  <div>
                    <span className={`text-[10.5px] font-sans uppercase tracking-[0.16em] block ${textTertiary}`}>
                      {t.insoleLabel} · {t.allowanceLabel}
                    </span>
                    <span className={`font-serif text-[26px] leading-tight block mt-1.5 tabular-nums ${!isProPurchased ? 'blur-[5px]' : ''}`}>
                      {proFit.insoleMm} {t.mmLabel} ({proFit.insoleCm.toFixed(1)} {t.cmLabel})
                    </span>
                    <span className={`block text-xs mt-1.5 ${textSecondary}`}>
                      {t.footTag} {proFit.footMm} + {proFit.allowanceMm} →{' '}
                      <strong className="font-semibold" style={{ color: accentHex }}>
                        {formatSize(activeResult.ua)} UA / {formatSize(activeResult.eu)} EU
                      </strong>
                    </span>
                  </div>

                  <div className={`sm:pl-5 sm:border-l ${hairline}`}>
                    <span className={`text-[10.5px] font-sans uppercase tracking-[0.16em] block ${textTertiary}`}>
                      {t.widthLabel} · {t.girthLabel}
                    </span>
                    <span className={`font-serif text-[26px] leading-tight block mt-1.5 tabular-nums ${!isProPurchased ? 'blur-[5px]' : ''}`}>
                      {proFit.ballWidthMm} / {proFit.ballGirthMm} {t.mmLabel}
                    </span>
                    <span className={`block text-xs mt-1.5 ${textSecondary} ${!isProPurchased ? 'blur-[4px]' : ''}`}>
                      EU {proFit.widthMarks.eu} · US {proFit.widthMarks.us} · JP {proFit.widthMarks.jp}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ВКЛАДКА 3: МАТРИЦА ПОСАДКИ БРЕНДОВ */}
            {activeTab === 'brands' && (
              <motion.div
                key="brands"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className={`rounded-2xl px-4 sm:px-5 divide-y ${bgSurface} ${dividerClass}`}
              >
                {proFit.brandMatrix.map((row: BrandFitEntry) => (
                  <div
                    key={row.brand}
                    onClick={() => {
                      if (!isProPurchased) handleProClick()
                      else safeHapticSelection()
                    }}
                    className={`py-4 flex items-center justify-between gap-4 ${
                      !isProPurchased ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-sans font-semibold uppercase tracking-[0.08em]">
                          {row.brand}
                        </span>
                        <span className={`text-[10px] font-sans uppercase tracking-[0.14em] ${textTertiary}`}>
                          {row.category}
                        </span>
                      </div>
                      <p className={`text-xs font-sans leading-relaxed mt-1 ${textSecondary}`}>
                        {row.offsetNote[safeLang]}
                      </p>
                    </div>

                    {isProPurchased ? (
                      <div className="text-right shrink-0">
                        <span className="font-serif text-xl block leading-tight tabular-nums">
                          EU {row.eu} · US {row.us}
                        </span>
                        <span className={`text-[11px] font-sans tabular-nums ${textSecondary}`}>
                          UK {row.uk} · JP {row.jp}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-serif text-lg blur-[5px] opacity-35 select-none">
                          EU 42.5
                        </span>
                        <span className={textTertiary}>
                          <LockIcon />
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {/* ВКЛАДКА 4: ИНСТРУКЦИЯ ЗАМЕРА */}
            {activeTab === 'guide' && (
              <motion.div
                key="guide"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className={`rounded-2xl p-5 sm:p-6 flex flex-col gap-5 ${bgSurface}`}
              >
                <div className="flex gap-3.5">
                  <span className="font-serif text-lg leading-none pt-0.5 shrink-0" style={{ color: accentHex }}>
                    01
                  </span>
                  <div>
                    <h4 className="text-xs font-sans font-semibold uppercase tracking-[0.14em]">
                      {t.guideFootTitle}
                    </h4>
                    <p className="text-sm font-sans leading-relaxed mt-1.5">{t.measureGuide1}</p>
                    <p className={`text-xs font-sans leading-relaxed mt-1.5 ${textSecondary}`}>
                      {t.measureGuide2}
                    </p>
                  </div>
                </div>

                <div className={`pt-5 border-t ${hairline} flex gap-3.5`}>
                  <span className="font-serif text-lg leading-none pt-0.5 shrink-0" style={{ color: accentHex }}>
                    02
                  </span>
                  <div>
                    <h4 className="text-xs font-sans font-semibold uppercase tracking-[0.14em]">
                      {t.guideInsoleTitle}
                    </h4>
                    <p className="text-sm font-sans leading-relaxed mt-1.5">{t.measureGuide3}</p>
                  </div>
                </div>

                <p className={`text-xs font-sans italic leading-relaxed pt-4 border-t ${hairline} ${textSecondary}`}>
                  {t.measureTip}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 6. СТАТУС PRO ИЛИ ПОКУПКА */}
        <footer className="pt-1">
          {statusError && (
            <div className="mb-3 px-4 py-2.5 rounded-2xl bg-red-500/10 text-red-400 text-xs text-center">
              {statusError}
            </div>
          )}

          {!isProPurchased ? (
            <div className={`rounded-3xl p-5 sm:p-6 flex flex-col gap-4 ${bgSurface}`}>
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
                className={`w-full min-h-[48px] py-3 px-5 rounded-2xl flex items-center justify-center gap-2 text-xs font-sans font-semibold uppercase tracking-[0.14em] cursor-pointer active:scale-[0.99] transition-transform ${activeInvert}`}
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
              <span className="truncate">{t.subtitle}</span>
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
