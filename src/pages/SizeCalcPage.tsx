import React, { useMemo, useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'
import {
  convertShoeSize,
  calculateProFit,
  formatSize,
  RANGES,
  type Gender,
  type ShoeStyle,
  type WidthFit,
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
  FlagCN,
  FlagKR,
  FlagBR,
  LockIcon,
} from '../lib/sizeCalcI18n'

type SizeCalcPageProps = {
  onBack: () => void
  lang: Lang
}

type ActiveTab = 'world' | 'fit' | 'brands' | 'guide'

const RULER_TICKS = 29

export function SizeCalcPage({ onBack, lang }: SizeCalcPageProps) {
  const safeLang: SupportedLang =
    lang && (lang === 'ru' || lang === 'uk' || lang === 'de' || lang === 'en') ? lang : 'uk'
  const t = I18N[safeLang]

  // Реф для надёжного вызова onBack независимо от ре-рендеров при смене gender
  const onBackRef = useRef(onBack)
  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  const handleBackClick = useCallback(
    (e?: React.MouseEvent | React.PointerEvent) => {
      if (e) {
        e.stopPropagation()
      }
      hapticImpact('light')
      onBackRef.current()
    },
    []
  )

  // Поддержка системной кнопки «Назад» в Telegram Mini App (Android / iOS)
  useEffect(() => {
    const tg = (window as unknown as {
      Telegram?: {
        WebApp?: {
          BackButton?: {
            show?: () => void
            onClick?: (cb: () => void) => void
            offClick?: (cb: () => void) => void
          }
        }
      }
    }).Telegram?.WebApp

    const tgBack = tg?.BackButton
    if (!tgBack?.onClick) return

    const listener = () => {
      hapticImpact('light')
      onBackRef.current()
    }
    try {
      tgBack.show?.()
      tgBack.onClick(listener)
    } catch {}

    return () => {
      try {
        tgBack.offClick?.(listener)
      } catch {}
    }
  }, [])

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const [gender, setGender] = useState<Gender>('men')
  const [unit, setUnit] = useState<'cm' | 'mm'>('cm')
  const [footMm, setFootMm] = useState<number>(RANGES.men.default)
  const [shoeStyle, setShoeStyle] = useState<ShoeStyle>('sneakers')
  const [widthFit, setWidthFit] = useState<WidthFit>('standard')
  const [activeTab, setActiveTab] = useState<ActiveTab>('world')
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [isDraggingSlider, setIsDraggingSlider] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const [isProPurchased, setIsProPurchased] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const lastHapticMmRef = useRef<number>(footMm)
  const holdTimerRef = useRef<number | null>(null)
  const holdIntervalRef = useRef<number | null>(null)

  const range = RANGES[gender]

  const handleGenderChange = useCallback((g: Gender) => {
    hapticImpact('light')
    setGender(g)
    const r = RANGES[g]
    setFootMm((prev) => {
      const clamped = Math.min(r.max, Math.max(r.min, prev))
      lastHapticMmRef.current = clamped
      return clamped
    })
  }, [])

  // Все расчёты выполняются через единую библиотеку src/lib/shoeSizes.ts
  const result = useMemo(() => convertShoeSize(footMm, gender), [footMm, gender])
  const proFit = useMemo(
    () => calculateProFit(footMm, gender, shoeStyle, widthFit),
    [footMm, gender, shoeStyle, widthFit]
  )

  const displayValue =
    unit === 'cm' ? (footMm / 10).toFixed(1).replace('.', ',') : String(Math.round(footMm))
  const pct = Math.min(100, Math.max(0, ((footMm - range.min) / (range.max - range.min)) * 100))

  // Нормализация прогресс-баров по реальным физическим величинам (устранение ID-10)
  const girthBarPct = useMemo(() => {
    const minG = gender === 'kids' ? 120 : 195
    const maxG = gender === 'kids' ? 235 : 300
    return Math.min(100, Math.max(20, ((proFit.ballGirthMm - minG) / (maxG - minG)) * 100))
  }, [proFit.ballGirthMm, gender])

  const widthBarPct = useMemo(() => {
    const minW = gender === 'kids' ? 48 : 78
    const maxW = gender === 'kids' ? 98 : 122
    return Math.min(100, Math.max(20, ((proFit.ballWidthMm - minW) / (maxW - minW)) * 100))
  }, [proFit.ballWidthMm, gender])

  const insoleBarPct = useMemo(() => {
    return Math.min(100, Math.max(25, (proFit.allowanceMm / 19) * 100))
  }, [proFit.allowanceMm])

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
      hapticImpact('medium')
      setStatusError(t.openInTelegramErr)
      return
    }

    setIsPurchasing(true)
    hapticImpact('medium')

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
        hapticImpact('heavy')
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
          hapticImpact('heavy')
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
    hapticImpact('light')
    setEditValue(unit === 'cm' ? (footMm / 10).toFixed(1) : String(Math.round(footMm)))
    setIsEditing(true)
  }

  const commitEdit = () => {
    const raw = parseFloat(editValue.replace(',', '.'))
    if (!isNaN(raw)) {
      const mm = Math.round(unit === 'cm' ? raw * 10 : raw)
      const clamped = Math.min(range.max, Math.max(range.min, mm))
      setFootMm(clamped)
      lastHapticMmRef.current = clamped
      hapticImpact('medium')
    }
    setIsEditing(false)
  }

  const applyStep = useCallback(
    (delta: number) => {
      setFootMm((prev) => {
        const next = Math.min(range.max, Math.max(range.min, prev + delta))
        if (next !== prev) {
          lastHapticMmRef.current = next
          hapticSelection()
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
      hapticImpact('light')
      setFootMm((prev) => {
        const next = Math.min(range.max, Math.max(range.min, prev + delta))
        lastHapticMmRef.current = next
        return next
      })
      holdTimerRef.current = window.setTimeout(() => {
        holdIntervalRef.current = window.setInterval(() => {
          applyStep(delta)
        }, 70)
      }, 320)
    },
    [applyStep, range.max, range.min, stopHold]
  )

  useEffect(() => {
    return () => stopHold()
  }, [stopHold])

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextMm = Number(e.target.value)
    setFootMm(nextMm)
    if (nextMm !== lastHapticMmRef.current) {
      lastHapticMmRef.current = nextMm
      hapticSelection()
    }
  }

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const usLabel = gender === 'kids' ? 'US K' : gender === 'men' ? 'US M' : 'US W'

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cCard = isDark ? 'bg-[#141414]' : 'bg-[#EAE4DA]'
  const cCardElevated = isDark ? 'bg-[#1C1C1E]' : 'bg-[#E2DBD0]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/65' : 'text-[#1C1816]/65'
  const cLine = isDark ? 'border-[#F4F0E8]/14' : 'border-[#1C1816]/14'
  const accentHex = isDark ? '#D4AF37' : '#8C5A2B'
  const trackColor = isDark ? '#F4F0E8' : '#1C1816'
  const trackBgColor = isDark ? 'rgba(244,240,232,0.16)' : 'rgba(28,24,22,0.16)'

  const worldSystems = [
    { code: 'EU', sub: t.subParisPoint, val: formatSize(result.eu), flag: <FlagEU />, free: true },
    { code: `UA (${t.cmLabel.toUpperCase()})`, sub: t.subDstuMetric, val: formatSize(result.ukr), flag: <FlagUA />, free: true },
    { code: usLabel, sub: t.subBrannock, val: formatSize(result.us), flag: <FlagUS />, free: false },
    { code: 'UK', sub: t.subBarleycorn, val: formatSize(result.uk), flag: <FlagUK />, free: false },
    { code: 'JP', sub: t.subJis, val: result.jp.toFixed(1), flag: <FlagJP />, free: false },
    { code: 'CN', sub: t.subGbt, val: `${formatSize(result.cn)} (${result.mondopoint})`, flag: <FlagCN />, free: false },
    { code: 'KR', sub: t.subKsk, val: String(result.kr), flag: <FlagKR />, free: false },
    { code: 'BR', sub: t.subAbnt, val: formatSize(result.br), flag: <FlagBR />, free: false },
  ]

  return (
    <div
      className={`relative flex flex-col h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] transition-colors duration-300 ${cBg} ${cText} overflow-hidden select-none`}
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; -webkit-touch-callout: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes proGlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .pro-shimmer {
          background: linear-gradient(120deg, rgba(212,175,55,0.10), rgba(212,175,55,0.24), rgba(212,175,55,0.10));
          background-size: 200% 200%;
          animation: proGlow 4s ease infinite;
        }
      `}</style>

      {/* 1. ШАПКА БЕЗ ПЕРЕПОЛНЕНИЯ НА ВСЕХ ЯЗЫКАХ (RU / UK / DE / EN) */}
      <header className={`px-3 pt-2 pb-1.5 border-b ${cLine} flex items-center justify-between gap-1.5 shrink-0 z-30`}>
        <button
          type="button"
          onClick={handleBackClick}
          className={`relative z-30 flex items-center gap-1 min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-sans font-semibold uppercase tracking-[0.08em] outline-none border ${cLine} ${cCard} cursor-pointer shrink-0 active:opacity-75`}
        >
          <span className="text-sm leading-none">←</span>
          <span>{t.back}</span>
        </button>

        {/* Компактный переключатель пола (вмещается даже на узких 320–360px экранах) */}
        <div className={`relative grid grid-cols-3 items-center rounded-full p-0.5 border ${cLine} ${cCard} min-w-0 flex-1 max-w-[260px]`}>
          {(['men', 'women', 'kids'] as Gender[]).map((g) => {
            const active = gender === g
            return (
              <button
                key={g}
                type="button"
                onClick={() => handleGenderChange(g)}
                className={`relative z-10 px-1.5 py-1 rounded-full text-[10px] font-sans font-semibold uppercase tracking-[0.03em] transition-colors border-none bg-transparent cursor-pointer truncate text-center ${
                  active
                    ? isDark
                      ? 'text-[#0A0A0A]'
                      : 'text-[#F2EFE9]'
                    : cTextMuted
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="genderSegmentedPill"
                    transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                    className={`absolute inset-0 rounded-full -z-10 shadow-xs ${
                      isDark ? 'bg-[#F4F0E8]' : 'bg-[#1C1816]'
                    }`}
                  />
                )}
                {t[g]}
              </button>
            )
          })}
        </div>
      </header>

      {/* 2. КОМПАКТНАЯ БИОМЕТРИЧЕСКАЯ КАПСУЛА */}
      <section className="px-3 pt-1.5 shrink-0">
        <div className={`relative rounded-2xl border ${cLine} ${cCard} px-3 pt-2 pb-2 overflow-hidden shadow-xs`}>
          {/* Верхняя строка: Индекс стандарта + переключатель CM / MM */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <FlagEU />
              <FlagUA />
              <span className="text-[11.5px] font-sans font-semibold tracking-[0.08em] uppercase truncate">
                EU {formatSize(result.eu)}
              </span>
              <span className={`text-[11px] font-sans ${cTextMuted} shrink-0`}>
                · MP {result.mondopoint} {t.mmLabel}
              </span>
            </div>

            <div className={`relative flex items-center rounded-lg p-0.5 border ${cLine} ${cCardElevated} shrink-0`}>
              {(['cm', 'mm'] as const).map((u) => {
                const active = unit === u
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      hapticImpact('light')
                      setUnit(u)
                    }}
                    className={`relative z-10 px-2 py-0.5 rounded-md text-[10.5px] font-sans font-semibold uppercase tracking-wider transition-colors border-none bg-transparent cursor-pointer ${
                      active
                        ? isDark
                          ? 'text-[#0A0A0A]'
                          : 'text-[#F2EFE9]'
                        : cTextMuted
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="unitSwitchPill"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className={`absolute inset-0 rounded-md -z-10 ${
                          isDark ? 'bg-[#F4F0E8]' : 'bg-[#1C1816]'
                        }`}
                      />
                    )}
                    {u === 'cm' ? t.cmLabel : t.mmLabel}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Барабан размера + кнопки - / + */}
          <div className="flex items-center justify-between gap-2 my-1">
            <button
              type="button"
              onPointerDown={(e) => startHold(-1, e)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              disabled={footMm <= range.min}
              aria-label="Decrease foot length"
              className={`w-9 h-9 rounded-full border ${cLine} ${cCardElevated} ${cText} flex items-center justify-center disabled:opacity-25 cursor-pointer shrink-0 active:scale-95`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            <div onClick={startEdit} className="flex-1 flex items-center justify-center cursor-pointer">
              <div className="flex items-baseline justify-center gap-1">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    value={editValue}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                    onBlur={commitEdit}
                    onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                    className={`w-[100px] text-center text-[34px] font-serif leading-none bg-transparent outline-none border-b ${cLine} ${cText}`}
                    inputMode="decimal"
                  />
                ) : (
                  <motion.span
                    key={displayValue}
                    initial={{ opacity: 0.7, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 32 }}
                    className="text-[36px] font-serif leading-none tracking-tight"
                  >
                    {displayValue}
                  </motion.span>
                )}
                <span className={`text-xs font-sans font-semibold uppercase ${cTextMuted}`}>
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
              aria-label="Increase foot length"
              className={`w-9 h-9 rounded-full border ${cLine} ${cCardElevated} ${cText} flex items-center justify-center disabled:opacity-25 cursor-pointer shrink-0 active:scale-95`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* 3-ЗОННАЯ ТЕЛЕМЕТРИЯ ПО СТАНДАРТАМ JIS S 5037 / ГОСТ 3927-88 / ISO 19407 (без переноса и наложения слов) */}
          <div className={`grid grid-cols-3 gap-1 my-1.5 p-1.5 rounded-xl border ${cLine} ${cCardElevated}`}>
            {/* Зона 1: Обхват пучков M1–M5 (JIS S 5037 / ГОСТ 3927-88) */}
            <div className="flex flex-col px-1 min-w-0">
              <span className={`text-[9.5px] font-sans truncate ${cTextMuted}`}>{t.zoneGirth}</span>
              <span className="text-[11px] font-sans font-semibold truncate">
                {proFit.ballGirthMm} {t.mmLabel}
              </span>
              <div className="w-full h-1 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: trackBgColor }}>
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${girthBarPct}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  style={{ backgroundColor: trackColor }}
                />
              </div>
            </div>

            {/* Зона 2: Ширина пучков M1–M5 (JIS S 5037) */}
            <div className={`flex flex-col px-1.5 border-l border-r ${cLine} min-w-0`}>
              <span className={`text-[9.5px] font-sans truncate ${cTextMuted}`}>{t.zoneArch}</span>
              <span className="text-[11px] font-sans font-semibold truncate">
                {proFit.ballWidthMm} {t.mmLabel} · {proFit.widthMarks.eu}
              </span>
              <div className="w-full h-1 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: trackBgColor }}>
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${widthBarPct}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  style={{ backgroundColor: accentHex }}
                />
              </div>
            </div>

            {/* Зона 3: Стелька и припуск (ISO 19407 Таблица 1) */}
            <div className="flex flex-col px-1 min-w-0">
              <span className={`text-[9.5px] font-sans truncate ${cTextMuted}`}>{t.zoneInsole}</span>
              <span className="text-[11px] font-sans font-semibold truncate" style={{ color: accentHex }}>
                {proFit.insoleMm} {t.mmLabel}
              </span>
              <div className="w-full h-1 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: trackBgColor }}>
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${insoleBarPct}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  style={{ backgroundColor: accentHex }}
                />
              </div>
            </div>
          </div>

          {/* 3. МАГНИТНАЯ ШКАЛА */}
          <div className="relative w-full pt-0.5">
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={1}
              value={footMm}
              onChange={handleSliderChange}
              onPointerDown={() => {
                setIsDraggingSlider(true)
                hapticImpact('light')
              }}
              onPointerUp={() => {
                setIsDraggingSlider(false)
                hapticImpact('light')
              }}
              onPointerCancel={() => setIsDraggingSlider(false)}
              className="w-full h-7 absolute inset-x-0 -top-0.5 z-30 opacity-0 cursor-pointer"
            />

            <div className="relative h-5 flex items-end justify-between px-1 pointer-events-none">
              {Array.from({ length: RULER_TICKS }).map((_, idx) => {
                const tickPct = (idx / (RULER_TICKS - 1)) * 100
                const dist = Math.abs(tickPct - pct)
                const proximity = Math.max(0, 1 - dist / 14)
                const baseHeight = idx % 4 === 0 ? 8 : 4
                const dynamicHeight = baseHeight + proximity * 9
                const isMajor = idx % 4 === 0

                return (
                  <div
                    key={idx}
                    className="w-[1.5px] rounded-full transition-all duration-75"
                    style={{
                      height: `${dynamicHeight}px`,
                      backgroundColor: proximity > 0.55 ? accentHex : trackColor,
                      opacity: proximity > 0.2 ? 0.95 : isMajor ? 0.45 : 0.22,
                    }}
                  />
                )
              })}

              <div
                className="absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none transition-transform duration-75"
                style={{
                  left: `calc(${pct}% - 10px)`,
                  transform: `translateY(-50%) scale(${isDraggingSlider ? 1.18 : 1})`,
                }}
              >
                <div
                  className="w-5 h-5 rounded-full shadow-md flex items-center justify-center"
                  style={{
                    backgroundColor: trackColor,
                    border: `2px solid ${isDark ? '#0A0A0A' : '#F2EFE9'}`,
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentHex }} />
                </div>
              </div>
            </div>

            <div className={`flex justify-between items-center text-[10px] font-sans font-medium ${cTextMuted} mt-0.5 px-0.5`}>
              <span>
                {unit === 'cm' ? (range.min / 10).toFixed(1) : range.min} {unit === 'cm' ? t.cmLabel : t.mmLabel}
              </span>
              <span className="text-[9.5px] uppercase tracking-[0.1em] truncate px-1">
                {t.step1} · +{proFit.allowanceMm} {t.mmLabel}
              </span>
              <span>
                {unit === 'cm' ? (range.max / 10).toFixed(1) : range.max} {unit === 'cm' ? t.cmLabel : t.mmLabel}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. НАВИГАЦИЯ ПО ВКЛАДКАМ */}
      <nav className="px-3 pt-1.5 shrink-0">
        <div className={`relative grid grid-cols-4 gap-1 p-0.5 rounded-xl border ${cLine} ${cCard}`}>
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
                  hapticImpact('light')
                  setActiveTab(tab.id)
                }}
                className={`relative z-10 py-1.5 px-1 rounded-lg text-[10.5px] font-sans font-semibold uppercase tracking-[0.04em] transition-colors border-none bg-transparent cursor-pointer truncate ${
                  active
                    ? isDark
                      ? 'text-[#0A0A0A]'
                      : 'text-[#F2EFE9]'
                    : cTextMuted
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeTabPill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className={`absolute inset-0 rounded-lg -z-10 shadow-xs ${
                      isDark ? 'bg-[#F4F0E8]' : 'bg-[#1C1816]'
                    }`}
                  />
                )}
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* 5. РАБОЧАЯ ОБЛАСТЬ ВКЛАДОК (адаптивно сжимается и прокручивается без обрезки на iPhone/Android) */}
      <main className="flex-1 min-h-0 px-3 pt-1.5 pb-2 overflow-y-auto scrollbar-hide flex flex-col justify-between gap-1.5">
        <AnimatePresence mode="wait">
          {/* ВКЛАДКА 1: 8 МИРОВЫХ СТАНДАРТОВ */}
          {activeTab === 'world' && (
            <motion.div
              key="world"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="grid grid-cols-2 gap-1.5"
            >
              {worldSystems.map((item) => {
                const unlocked = item.free || isProPurchased
                return (
                  <div
                    key={item.code}
                    onClick={() => {
                      if (!unlocked) handleProClick()
                      else hapticSelection()
                    }}
                    className={`relative rounded-xl border ${cLine} ${cCard} px-2.5 py-2 flex items-center justify-between gap-1.5 ${
                      !unlocked ? 'cursor-pointer active:scale-[0.98]' : ''
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        {item.flag}
                        <span className="text-[11.5px] font-sans font-semibold uppercase tracking-[0.04em] truncate">
                          {item.code}
                        </span>
                      </div>
                      <span className={`text-[10px] font-sans ${cTextMuted} truncate mt-0.5`}>
                        {item.sub}
                      </span>
                    </div>

                    {unlocked ? (
                      <motion.span
                        key={item.val}
                        initial={{ scale: 0.94, opacity: 0.65 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="font-serif text-[21px] leading-none tracking-tight shrink-0"
                      >
                        {item.val}
                      </motion.span>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-serif text-base blur-[4px] opacity-40 select-none">42.5</span>
                        <span className={`p-1 rounded-md border ${cLine} ${cTextMuted}`}>
                          <LockIcon />
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* ВКЛАДКА 2: КОЛОДКА, СТЕЛЬКА И ПОЛНОТА */}
          {activeTab === 'fit' && (
            <motion.div
              key="fit"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="flex flex-col gap-1.5"
            >
              <div className={`rounded-xl border ${cLine} ${cCard} p-2.5 flex flex-col gap-2`}>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      { id: 'sneakers', label: t.styleSneakers },
                      { id: 'classic', label: t.styleClassic },
                      { id: 'winter', label: t.styleWinter },
                      { id: 'running', label: t.styleRunning },
                      { id: 'sandals', label: t.styleSandals },
                    ] as Array<{ id: ShoeStyle; label: string }>
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        hapticImpact('light')
                        setShoeStyle(st.id)
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-sans font-medium uppercase tracking-wider border cursor-pointer ${
                        shoeStyle === st.id
                          ? isDark
                            ? 'border-[#F4F0E8] bg-[#F4F0E8] text-[#0A0A0A] font-semibold'
                            : 'border-[#1C1816] bg-[#1C1816] text-[#F2EFE9] font-semibold'
                          : `${cLine} bg-transparent ${cTextMuted}`
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1">
                  {(
                    [
                      { id: 'narrow', label: t.widthNarrow },
                      { id: 'standard', label: t.widthStandard },
                      { id: 'wide', label: t.widthWide },
                      { id: 'extraWide', label: t.widthExtraWide },
                    ] as Array<{ id: WidthFit; label: string }>
                  ).map((wf) => (
                    <button
                      key={wf.id}
                      type="button"
                      onClick={() => {
                        hapticImpact('light')
                        setWidthFit(wf.id)
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[10.5px] font-sans font-medium uppercase tracking-wider border cursor-pointer truncate ${
                        widthFit === wf.id
                          ? isDark
                            ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#F4F0E8] font-semibold'
                            : 'border-[#8C5A2B] bg-[#8C5A2B]/15 text-[#1C1816] font-semibold'
                          : `${cLine} bg-transparent ${cTextMuted}`
                      }`}
                    >
                      {wf.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                onClick={() => {
                  if (!isProPurchased) handleProClick()
                }}
                className={`rounded-xl border ${cLine} ${cCard} p-3 grid grid-cols-2 gap-2.5 ${
                  !isProPurchased ? 'cursor-pointer' : ''
                }`}
              >
                <div className="min-w-0">
                  <span className={`text-[10px] uppercase tracking-wider block truncate ${cTextMuted}`}>
                    {t.insoleLabel} / {t.allowanceLabel}
                  </span>
                  <span className={`font-serif text-xl block mt-0.5 ${!isProPurchased ? 'blur-[4px]' : ''}`}>
                    {proFit.insoleMm} {t.mmLabel} ({proFit.insoleCm} {t.cmLabel})
                  </span>
                  <span className={`block text-[10.5px] mt-0.5 ${cTextMuted}`}>
                    +{proFit.allowanceMm} {t.mmLabel} · ISO {proFit.isoLastRangeMm[0]}–{proFit.isoLastRangeMm[1]} {t.mmLabel}
                  </span>
                </div>

                <div className="min-w-0">
                  <span className={`text-[10px] uppercase tracking-wider block truncate ${cTextMuted}`}>
                    {t.widthLabel} / {t.girthLabel}
                  </span>
                  <span className={`font-serif text-xl block mt-0.5 ${!isProPurchased ? 'blur-[4px]' : ''}`}>
                    {proFit.ballWidthMm} / {proFit.ballGirthMm} {t.mmLabel}
                  </span>
                  <span className={`block text-[10.5px] mt-0.5 ${cTextMuted} ${!isProPurchased ? 'blur-[3px]' : ''}`}>
                    EU {proFit.widthMarks.eu} · US {proFit.widthMarks.us} · UK {proFit.widthMarks.uk} · JP {proFit.widthMarks.jp}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ВКЛАДКА 3: МАТРИЦА ПОСАДКИ БРЕНДОВ (без Cardio, без обрезки описаний) */}
          {activeTab === 'brands' && (
            <motion.div
              key="brands"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="flex flex-col gap-1.5"
            >
              {proFit.brandMatrix.map((row: BrandFitEntry) => (
                <div
                  key={row.brand}
                  onClick={() => {
                    if (!isProPurchased) handleProClick()
                    else hapticSelection()
                  }}
                  className={`rounded-xl border ${cLine} ${cCard} px-3 py-2 flex items-center justify-between gap-2 ${
                    !isProPurchased ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12px] font-sans font-semibold uppercase tracking-wider">
                        {row.brand}
                      </span>
                      <span className={`text-[9.5px] uppercase px-1.5 py-0.2 rounded border ${cLine} ${cTextMuted}`}>
                        {row.category}
                      </span>
                    </div>
                    <p className={`text-[10.5px] font-sans leading-snug ${cTextMuted} line-clamp-2 mt-0.5`}>
                      {row.offsetNote[safeLang]}
                    </p>
                  </div>

                  {isProPurchased ? (
                    <div className="text-right shrink-0">
                      <span className="font-serif text-[16px] block leading-tight">
                        EU {row.eu} · US {row.us}
                      </span>
                      <span className={`text-[10px] font-sans ${cTextMuted}`}>
                        UK {row.uk} · JP {row.jp}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-serif text-sm blur-[4px] opacity-40 select-none">EU 42.5</span>
                      <LockIcon />
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* ВКЛАДКА 4: ИНСТРУКЦИЯ ЗАМЕРА И ISO */}
          {activeTab === 'guide' && (
            <motion.div
              key="guide"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className={`rounded-xl border ${cLine} ${cCard} p-3 flex flex-col gap-2`}
            >
              <p className="text-[12px] font-sans leading-snug">{t.measureGuide1}</p>
              <p className="text-[12px] font-sans leading-snug">{t.measureGuide2}</p>
              <p className="text-[12px] font-sans leading-snug">{t.measureGuide3}</p>
              <p className={`text-[11px] font-sans italic pt-1.5 border-t ${cLine} ${cTextMuted}`}>
                {t.measureTip}
              </p>
              <div className={`pt-1.5 border-t ${cLine} text-[10px] font-sans ${cTextMuted}`}>
                <div>{t.disclaimer}</div>
                <div className="mt-0.5">{t.standardsNote}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 6. НИЖНИЙ БАР СТАТУСА ИЛИ ПОКУПКИ PRO (компактный, всегда виден на экране iPhone и Android) */}
        <div className="shrink-0 pt-0.5">
          {statusError && (
            <div className="mb-1 px-2.5 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-[11px] text-center">
              {statusError}
            </div>
          )}

          {!isProPurchased ? (
            <div className={`rounded-xl border ${cLine} pro-shimmer px-3 py-2 flex flex-col gap-1.5`}>
              <div>
                <h3 className="font-serif text-sm tracking-tight leading-tight">{t.proTitle}</h3>
                <p className={`text-[10.5px] font-sans leading-tight mt-0.5 ${cTextMuted}`}>{t.proDesc}</p>
              </div>

              <button
                type="button"
                onClick={handleProClick}
                disabled={isPurchasing}
                className={`w-full py-2 px-3 rounded-lg border ${cLine} flex items-center justify-center gap-1.5 text-[11px] font-sans font-semibold uppercase tracking-[0.1em] cursor-pointer active:scale-[0.99] ${
                  isDark ? 'bg-[#F4F0E8] text-[#0A0A0A]' : 'bg-[#1C1816] text-[#F2EFE9]'
                }`}
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
            <div className={`rounded-xl border ${cLine} ${cCard} px-3 py-2 flex items-center justify-between text-[10px] font-sans font-medium uppercase tracking-[0.1em] ${cTextMuted}`}>
              <span className="truncate">{t.subtitle}</span>
              <span className="shrink-0 ml-2 font-semibold" style={{ color: accentHex }}>
                ★ {t.proActiveBadge}
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
