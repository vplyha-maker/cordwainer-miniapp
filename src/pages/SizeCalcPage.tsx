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

const RULER_TICKS = 31

export function SizeCalcPage({ onBack, lang }: SizeCalcPageProps) {
  const safeLang: SupportedLang =
    lang && (lang === 'ru' || lang === 'uk' || lang === 'de' || lang === 'en') ? lang : 'uk'
  const t = I18N[safeLang]

  // Надёжная ссылка на onBack без блокировки размонтирования Framer Motion
  const onBackRef = useRef(onBack)
  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  const triggerBackNavigation = useCallback(() => {
    hapticImpact('medium')
    if (typeof onBackRef.current === 'function') {
      onBackRef.current()
    }
  }, [])

  // Подключение системной кнопки Telegram BackButton с обязательным скрытием при выходе
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
      hapticImpact('medium')
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
  const [measureMode, setMeasureMode] = useState<MeasureMode>('foot')
  const [unit, setUnit] = useState<'cm' | 'mm'>('mm')
  const [footMm, setFootMm] = useState<number>(270)
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
    hapticImpact('medium')
    setGender(g)
    const r = RANGES[g]
    setFootMm((prev) => {
      const clamped = Math.min(r.max, Math.max(r.min, prev))
      lastHapticMmRef.current = clamped
      return clamped
    })
  }, [])

  // Главный расчёт по стандартам ISO 19407 / JIS S 5037 / ГОСТ 3927-88
  const proFit = useMemo(
    () => calculateProFit(footMm, gender, shoeStyle, widthFit),
    [footMm, gender, shoeStyle, widthFit]
  )

  // Рекомендуемый размер (с учётом выбранного сезона Зима/Мех и полноты)
  const activeResult = proFit.recommendedSize

  // Значение, которое видит пользователь на барабане (либо длина стопы, либо длина вынутой стельки)
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
      hapticImpact('heavy')
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
    setEditValue(
      unit === 'cm' ? (currentActiveMm / 10).toFixed(1) : String(Math.round(currentActiveMm))
    )
    setIsEditing(true)
  }

  const commitEdit = () => {
    const raw = parseFloat(editValue.replace(',', '.'))
    if (!isNaN(raw)) {
      const inputMm = Math.round(unit === 'cm' ? raw * 10 : raw)
      const targetFootMm =
        measureMode === 'foot' ? inputMm : inputMm - proFit.allowanceMm
      const clamped = Math.min(range.max, Math.max(range.min, targetFootMm))
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
      hapticSelection()
    }
  }

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const usLabel = gender === 'kids' ? 'US K' : gender === 'men' ? 'US M' : 'US W'

  // Геометрическое масштабирование живого рентген-сканера стопы и колодки
  const footScaleX = 0.88 + (pct / 100) * 0.14
  const footScaleY =
    widthFit === 'narrow'
      ? 0.9
      : widthFit === 'standard'
        ? 1.0
        : widthFit === 'wide'
          ? 1.09
          : 1.17
  const lastAllowanceExtraPx = Math.round((proFit.allowanceMm - 6) * 0.85)

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cCard = isDark ? 'bg-[#141414]' : 'bg-[#EAE4DA]'
  const cCardElevated = isDark ? 'bg-[#1E1E20]' : 'bg-[#DFD7CA]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/65' : 'text-[#1C1816]/65'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const accentHex = isDark ? '#D4AF37' : '#8C5A2B'
  const trackColor = isDark ? '#F4F0E8' : '#1C1816'
  const trackBgColor = isDark ? 'rgba(244,240,232,0.16)' : 'rgba(28,24,22,0.16)'

  const worldSystems = [
    { code: 'EU', sub: t.subParisPoint, val: formatSize(activeResult.eu), flag: <FlagEU />, free: true },
    { code: `UA (${t.cmLabel.toUpperCase()})`, sub: t.subDstuMetric, val: formatSize(activeResult.ukr), flag: <FlagUA />, free: true },
    { code: usLabel, sub: t.subBrannock, val: formatSize(activeResult.us), flag: <FlagUS />, free: false },
    { code: 'UK', sub: t.subBarleycorn, val: formatSize(activeResult.uk), flag: <FlagUK />, free: false },
    { code: 'JP', sub: t.subJis, val: activeResult.jp.toFixed(1), flag: <FlagJP />, free: false },
    { code: 'CN', sub: t.subGbt, val: `${formatSize(activeResult.cn)} (${activeResult.mondopoint})`, flag: <FlagCN />, free: false },
    { code: 'KR', sub: t.subKsk, val: String(activeResult.kr), flag: <FlagKR />, free: false },
    { code: 'BR', sub: t.subAbnt, val: formatSize(activeResult.br), flag: <FlagBR />, free: false },
  ]

  return (
    <div
      className={`relative flex flex-col min-h-[100dvh] w-full max-w-[100vw] transition-colors duration-300 ${cBg} ${cText} overflow-x-hidden select-none`}
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
        @keyframes xrayLaser {
          0% { transform: translateX(8px); opacity: 0.25; }
          50% { opacity: 0.9; }
          100% { transform: translateX(275px); opacity: 0.25; }
        }
        @keyframes nodePulse {
          0% { transform: scale(0.9); opacity: 0.85; }
          70% { transform: scale(1.85); opacity: 0; }
          100% { transform: scale(1.85); opacity: 0; }
        }
        .pro-shimmer {
          background: linear-gradient(120deg, rgba(212,175,55,0.10), rgba(212,175,55,0.25), rgba(212,175,55,0.10));
          background-size: 200% 200%;
          animation: proGlow 4s ease infinite;
        }
        .xray-laser-line {
          animation: xrayLaser 3.4s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
        }
        .bio-pulse {
          transform-origin: center;
          animation: nodePulse 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
      `}</style>

      {/* 1. ШАПКА (Без layoutId-багов, кнопка «Назад» работает мгновенно при любом выборе пола) */}
      <header className={`px-3.5 pt-2.5 pb-2 border-b ${cLine} flex items-center justify-between gap-2 shrink-0 z-30`}>
        <button
          type="button"
          onClick={triggerBackNavigation}
          className={`flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl text-[12px] font-sans font-semibold uppercase tracking-[0.08em] outline-none border ${cLine} ${cCard} cursor-pointer shrink-0 active:scale-95 transition-transform`}
        >
          <span className="text-base leading-none">←</span>
          <span>{t.back}</span>
        </button>

        <div className={`grid grid-cols-3 items-center rounded-full p-0.5 border ${cLine} ${cCard} min-w-0 flex-1 max-w-[265px]`}>
          {(['men', 'women', 'kids'] as Gender[]).map((g) => {
            const active = gender === g
            return (
              <button
                key={g}
                type="button"
                onClick={() => handleGenderChange(g)}
                className={`px-2 py-1.5 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.04em] transition-all duration-200 border-none cursor-pointer truncate text-center ${
                  active
                    ? isDark
                      ? 'bg-[#F4F0E8] text-[#0A0A0A] shadow-xs'
                      : 'bg-[#1C1816] text-[#F2EFE9] shadow-xs'
                    : `bg-transparent ${cTextMuted}`
                }`}
              >
                {t[g]}
              </button>
            )
          })}
        </div>
      </header>

      {/* 2. ГЛАВНАЯ БИОМЕТРИЧЕСКАЯ СТАНЦИЯ С РЕНТГЕН-СКАНЕРОМ КОЛОДКИ */}
      <section className="px-3.5 pt-2.5 shrink-0">
        <div className={`relative rounded-2xl border ${cLine} ${cCard} p-3.5 overflow-hidden shadow-xs`}>
          {/* Переключатель: [ Замер стопы | По стельке ] + [ СМ | ММ ] */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className={`inline-flex items-center rounded-xl p-0.5 border ${cLine} ${cCardElevated}`}>
              {(['foot', 'insole'] as const).map((m) => {
                const active = measureMode === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      hapticImpact('medium')
                      setMeasureMode(m)
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-sans font-semibold uppercase tracking-wider transition-all duration-200 border-none cursor-pointer ${
                      active
                        ? isDark
                          ? 'bg-[#D4AF37] text-[#0A0A0A]'
                          : 'bg-[#8C5A2B] text-[#F2EFE9]'
                        : `bg-transparent ${cTextMuted}`
                    }`}
                  >
                    {m === 'foot' ? t.modeFoot : t.modeInsole}
                  </button>
                )
              })}
            </div>

            <div className={`inline-flex items-center rounded-xl p-0.5 border ${cLine} ${cCardElevated}`}>
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
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-sans font-semibold uppercase tracking-wider transition-all duration-200 border-none cursor-pointer ${
                      active
                        ? isDark
                          ? 'bg-[#F4F0E8] text-[#0A0A0A]'
                          : 'bg-[#1C1816] text-[#F2EFE9]'
                        : `bg-transparent ${cTextMuted}`
                    }`}
                  >
                    {u === 'cm' ? t.cmLabel : t.mmLabel}
                  </button>
                )
              })}
            </div>
          </div>

          {/* КРУПНОЕ ТАБЛО: СЛЕВА — ЗАМЕР, СПРАВА — РЕКОМЕНДУЕМЫЙ РАЗМЕР EU */}
          <div className="grid grid-cols-12 items-center gap-2 my-1">
            {/* Левый блок: Кнопки - / + и крупное число замера */}
            <div className="col-span-7 flex items-center justify-between gap-1.5">
              <button
                type="button"
                onPointerDown={(e) => startHold(-1, e)}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                disabled={footMm <= range.min}
                aria-label="Decrease"
                className={`w-10 h-10 rounded-full border ${cLine} ${cCardElevated} ${cText} flex items-center justify-center disabled:opacity-25 cursor-pointer shrink-0 active:scale-90 transition-transform`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              <div onClick={startEdit} className="flex flex-col items-center cursor-pointer min-w-0">
                <span className={`text-[10px] font-sans uppercase tracking-wider ${cTextMuted}`}>
                  {measureMode === 'foot' ? t.footLengthLabel : t.insoleInputLabel}
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      value={editValue}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                      onBlur={commitEdit}
                      onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                      className={`w-[96px] text-center text-[38px] font-serif leading-none bg-transparent outline-none border-b ${cLine} ${cText}`}
                      inputMode="decimal"
                    />
                  ) : (
                    <span className="text-[40px] font-serif leading-none tracking-tight tabular-nums">
                      {displayValue}
                    </span>
                  )}
                  <span className={`text-xs font-sans font-bold uppercase ${cTextMuted}`}>
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
                className={`w-10 h-10 rounded-full border ${cLine} ${cCardElevated} ${cText} flex items-center justify-center disabled:opacity-25 cursor-pointer shrink-0 active:scale-90 transition-transform`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            {/* Правый блок: Крупный итоговый размер EU (с учётом сезона Зима/Мех и полноты) */}
            <div className={`col-span-5 pl-3 border-l ${cLine} flex flex-col items-end justify-center`}>
              <div className="flex items-center gap-1.5">
                <FlagEU />
                <span className={`text-[10px] font-sans uppercase tracking-wider font-semibold ${cTextMuted}`}>
                  {t.yourSizeLabel}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[40px] font-serif leading-none tracking-tight" style={{ color: accentHex }}>
                  {formatSize(activeResult.eu)}
                </span>
                <span className={`text-xs font-sans font-semibold uppercase ${cTextMuted}`}>EU</span>
              </div>
              {proFit.styleSizeShiftEu > 0 ? (
                <span
                  className="text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded mt-1"
                  style={{
                    backgroundColor: isDark ? 'rgba(212,175,55,0.18)' : 'rgba(140,90,43,0.15)',
                    color: accentHex,
                  }}
                >
                  +{proFit.styleSizeShiftEu} EU {t.winterShiftBadge}
                </span>
              ) : (
                <span className={`text-[10.5px] font-sans mt-0.5 ${cTextMuted}`}>
                  MP {activeResult.mondopoint} · UA {formatSize(activeResult.ukr)}
                </span>
              )}
            </div>
          </div>

          {/* ИНТЕРАКТИВНЫЙ РЕНТГЕН-СКАНЕР СТОПЫ ВНУТРИ КОЛОДКИ (Визуальный ВАУ-эффект + понятная физика запаса) */}
          <div className={`relative rounded-xl border ${cLine} ${cCardElevated} p-2.5 my-2.5 overflow-hidden`}>
            {/* Миллиметровая сетка */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                backgroundImage: `linear-gradient(to right, ${trackBgColor} 1px, transparent 1px), linear-gradient(to bottom, ${trackBgColor} 1px, transparent 1px)`,
                backgroundSize: '14px 14px',
              }}
            />

            {/* Сканирующий лазерный луч */}
            <div className="absolute inset-y-0 left-0 w-10 pointer-events-none xray-laser-line">
              <div
                className="w-[2px] h-full"
                style={{
                  background: `linear-gradient(to bottom, transparent, ${accentHex}, transparent)`,
                  boxShadow: `0 0 12px ${accentHex}`,
                }}
              />
            </div>

            <div className="relative z-10 flex items-center justify-between gap-2">
              <svg viewBox="0 0 300 88" className="w-full h-[78px] overflow-visible">
                {/* Задняя опорная линия пятки */}
                <line x1="20" y1="10" x2="20" y2="78" stroke={trackColor} strokeOpacity="0.4" strokeWidth="1" strokeDasharray="2 2" />
                {/* Передняя граница стопы (270 мм) */}
                <line x1="236" y1="12" x2="236" y2="76" stroke={trackColor} strokeOpacity="0.55" strokeWidth="1" strokeDasharray="2 2" />
                {/* Передняя граница стельки/колодки с припуском (+10..16 мм) */}
                <line
                  x1={252 + lastAllowanceExtraPx}
                  y1="8"
                  x2={252 + lastAllowanceExtraPx}
                  y2="80"
                  stroke={accentHex}
                  strokeWidth="1.5"
                />

                {/* Зона свободного припуска в носке (заштрихованный буфер между пальцами и носком ботинка) */}
                <rect
                  x="236"
                  y="18"
                  width={Math.max(12, 16 + lastAllowanceExtraPx)}
                  height="52"
                  rx="8"
                  fill={accentHex}
                  fillOpacity={isDark ? '0.18' : '0.15'}
                />

                <g
                  style={{
                    transform: `translate(135px, 44px) scale(${footScaleX}, ${footScaleY}) translate(-135px, -44px)`,
                    transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {/* Внешний контур стельки / обувной колодки (например, 286 мм) */}
                  <path
                    d={`M 20,44 C 20,24 42,16 74,19 C 110,22 146,13 186,11 C 224,9 ${252 + lastAllowanceExtraPx},17 ${255 + lastAllowanceExtraPx},41 C ${258 + lastAllowanceExtraPx},61 230,74 192,74 C 150,74 118,63 82,64 C 48,65 20,61 20,44 Z`}
                    fill={isDark ? 'rgba(212,175,55,0.08)' : 'rgba(140,90,43,0.08)'}
                    stroke={accentHex}
                    strokeWidth="1.6"
                    strokeDasharray={shoeStyle === 'winter' ? '4 2' : 'none'}
                  />

                  {/* Внутренний анатомический контур самой стопы (например, 270 мм) */}
                  <path
                    d="M 23,44 C 23,28 42,22 70,24 C 104,26 138,18 175,16 C 208,14 233,22 236,41 C 238,57 216,67 184,67 C 148,67 118,58 84,59 C 50,60 23,56 23,44 Z"
                    fill={isDark ? 'rgba(244,240,232,0.16)' : 'rgba(28,24,22,0.14)'}
                    stroke={trackColor}
                    strokeWidth="1.6"
                  />

                  {/* Анатомическая ось пучков M1–M5 (ширина и обхват) */}
                  <line x1="176" y1="15" x2="182" y2="67" stroke={accentHex} strokeWidth="1.5" strokeDasharray="3 2" />

                  {/* Продольная ось стопы */}
                  <line x1="24" y1="44" x2="235" y2="41" stroke={trackColor} strokeOpacity="0.35" strokeWidth="1" />

                  {/* Пульсирующие биометрические узлы: Пятка, Пучки M1–M5, Мысок */}
                  <g transform="translate(42, 44)">
                    <circle r="5" fill={accentHex} className="bio-pulse" />
                    <circle r="2.5" fill={accentHex} />
                  </g>
                  <g transform="translate(178, 26)">
                    <circle r="5.5" fill={accentHex} className="bio-pulse" />
                    <circle r="2.5" fill={accentHex} />
                  </g>
                  <g transform="translate(232, 41)">
                    <circle r="4.5" fill={trackColor} className="bio-pulse" />
                    <circle r="2.2" fill={trackColor} />
                  </g>
                </g>

                {/* Подписи прямо на рентген-чертеже */}
                <text x="128" y="47" textAnchor="middle" fill={trackColor} fontSize="10.5" fontWeight="700" fontFamily="sans-serif">
                  {t.xrayFootTag}: {proFit.footMm} {t.mmLabel}
                </text>
                <text
                  x={244 + lastAllowanceExtraPx / 2}
                  y="32"
                  textAnchor="middle"
                  fill={accentHex}
                  fontSize="9.5"
                  fontWeight="700"
                  fontFamily="sans-serif"
                >
                  +{proFit.allowanceMm}
                </text>
              </svg>
            </div>

            {/* Нижняя строка рентген-сканера: 3 чётких параметра крупным шрифтом */}
            <div className={`grid grid-cols-3 gap-2 pt-2 mt-1 border-t ${cLine} text-center`}>
              <div>
                <span className={`text-[10px] uppercase block ${cTextMuted}`}>{t.xrayFootTag}</span>
                <span className="text-[13px] font-sans font-bold">
                  {proFit.footMm} {t.mmLabel} ({proFit.footCm.toFixed(1)} {t.cmLabel})
                </span>
              </div>
              <div className={`border-l border-r ${cLine}`}>
                <span className={`text-[10px] uppercase block ${cTextMuted}`}>{t.xrayBallTag}</span>
                <span className="text-[13px] font-sans font-bold">
                  {proFit.ballGirthMm} {t.mmLabel} · {proFit.widthMarks.eu}
                </span>
              </div>
              <div>
                <span className={`text-[10px] uppercase block ${cTextMuted}`}>{t.insoleLabel}</span>
                <span className="text-[13px] font-sans font-bold" style={{ color: accentHex }}>
                  {proFit.insoleMm} {t.mmLabel} (+{proFit.allowanceMm})
                </span>
              </div>
            </div>
          </div>

          {/* ЯСНАЯ ПОДСКАЗКА ПРОТИВ ОШИБКИ С ПОЛЗУНКОМ */}
          <div className={`text-[11px] font-sans leading-snug px-2.5 py-1.5 rounded-lg border ${cLine} ${cCardElevated} mb-2`}>
            <span>{t.builtInAllowanceHint} </span>
            <strong style={{ color: accentHex }}>EU {formatSize(activeResult.eu)}</strong>
            <span>
              {' '}
              ({t.insoleLabel.toLowerCase()} <strong>{proFit.insoleMm} {t.mmLabel}</strong> = {t.xrayFootTag.toLowerCase()}{' '}
              <strong>{proFit.footMm} {t.mmLabel}</strong> + <strong>{proFit.allowanceMm} {t.mmLabel}</strong>).
            </span>
          </div>

          {/* 3. МАГНИТНАЯ ШКАЛА-РУЛЕТКА */}
          <div className="relative w-full pt-1">
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={1}
              value={currentActiveMm}
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
              className="w-full h-9 absolute inset-x-0 -top-1 z-30 opacity-0 cursor-pointer"
            />

            <div className="relative h-6 flex items-end justify-between px-1 pointer-events-none">
              {Array.from({ length: RULER_TICKS }).map((_, idx) => {
                const tickPct = (idx / (RULER_TICKS - 1)) * 100
                const dist = Math.abs(tickPct - pct)
                const proximity = Math.max(0, 1 - dist / 14)
                const baseHeight = idx % 5 === 0 ? 10 : 5
                const dynamicHeight = baseHeight + proximity * 11
                const isMajor = idx % 5 === 0

                return (
                  <div
                    key={idx}
                    className="w-[1.5px] rounded-full transition-all duration-75"
                    style={{
                      height: `${dynamicHeight}px`,
                      backgroundColor: proximity > 0.55 ? accentHex : trackColor,
                      opacity: proximity > 0.2 ? 0.95 : isMajor ? 0.48 : 0.22,
                    }}
                  />
                )
              })}

              <div
                className="absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none transition-transform duration-75"
                style={{
                  left: `calc(${pct}% - 12px)`,
                  transform: `translateY(-50%) scale(${isDraggingSlider ? 1.2 : 1})`,
                }}
              >
                <div
                  className="w-6 h-6 rounded-full shadow-md flex items-center justify-center"
                  style={{
                    backgroundColor: trackColor,
                    border: `2.5px solid ${isDark ? '#0A0A0A' : '#F2EFE9'}`,
                  }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentHex }} />
                </div>
              </div>
            </div>

            <div className={`flex justify-between items-center text-[11px] font-sans font-semibold ${cTextMuted} mt-1 px-0.5`}>
              <span>
                {unit === 'cm' ? (sliderMin / 10).toFixed(1) : sliderMin} {unit === 'cm' ? t.cmLabel : t.mmLabel}
              </span>
              <span className="text-[10.5px] uppercase tracking-[0.12em]">
                {measureMode === 'foot' ? t.footLengthLabel : t.insoleInputLabel}
              </span>
              <span>
                {unit === 'cm' ? (sliderMax / 10).toFixed(1) : sliderMax} {unit === 'cm' ? t.cmLabel : t.mmLabel}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. НАВИГАЦИЯ ПО ВКЛАДКАМ (Крупный читаемый шрифт 12px, без layoutId-фризов) */}
      <nav className="px-3.5 pt-2 shrink-0">
        <div className={`grid grid-cols-4 gap-1 p-1 rounded-xl border ${cLine} ${cCard}`}>
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
                  hapticImpact('medium')
                  setActiveTab(tab.id)
                }}
                className={`py-2 px-1 rounded-lg text-[12px] font-sans font-semibold uppercase tracking-[0.05em] transition-all duration-200 border-none cursor-pointer truncate ${
                  active
                    ? isDark
                      ? 'bg-[#F4F0E8] text-[#0A0A0A] shadow-xs'
                      : 'bg-[#1C1816] text-[#F2EFE9] shadow-xs'
                    : `bg-transparent ${cTextMuted}`
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* 5. РАБОЧАЯ ОБЛАСТЬ ВКЛАДОК (Крупные цифры 26px и читаемые подписи) */}
      <main className="flex-1 px-3.5 pt-2 pb-4 flex flex-col justify-between gap-2.5">
        <AnimatePresence mode="wait">
          {/* ВКЛАДКА 1: 8 МИРОВЫХ СТАНДАРТОВ */}
          {activeTab === 'world' && (
            <motion.div
              key="world"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-2 gap-2"
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
                    className={`relative rounded-xl border ${cLine} ${cCard} px-3.5 py-3 flex items-center justify-between gap-2 ${
                      !unlocked ? 'cursor-pointer active:scale-[0.98]' : ''
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        {item.flag}
                        <span className="text-[13.5px] font-sans font-bold uppercase tracking-[0.05em] truncate">
                          {item.code}
                        </span>
                      </div>
                      <span className={`text-[11px] font-sans ${cTextMuted} truncate mt-0.5`}>
                        {item.sub}
                      </span>
                    </div>

                    {unlocked ? (
                      <span className="font-serif text-[26px] leading-none tracking-tight shrink-0 tabular-nums">
                        {item.val}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-serif text-xl blur-[4px] opacity-40 select-none">42.5</span>
                        <span className={`p-1.5 rounded-lg border ${cLine} ${cTextMuted}`}>
                          <LockIcon />
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* ВКЛАДКА 2: КОЛОДКА, СЕЗОН (ЗИМА/МЕХ) И ПОЛНОТА */}
          {activeTab === 'fit' && (
            <motion.div
              key="fit"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-2"
            >
              <div className={`rounded-xl border ${cLine} ${cCard} p-3 flex flex-col gap-2.5`}>
                <div className="flex flex-wrap gap-1.5">
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
                        hapticImpact('medium')
                        setShoeStyle(st.id)
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-sans font-semibold uppercase tracking-wider border cursor-pointer transition-colors ${
                        shoeStyle === st.id
                          ? isDark
                            ? 'border-[#F4F0E8] bg-[#F4F0E8] text-[#0A0A0A]'
                            : 'border-[#1C1816] bg-[#1C1816] text-[#F2EFE9]'
                          : `${cLine} bg-transparent ${cTextMuted}`
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
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
                        hapticImpact('medium')
                        setWidthFit(wf.id)
                      }}
                      className={`py-2 px-2.5 rounded-lg text-[12px] font-sans font-semibold uppercase tracking-wider border cursor-pointer truncate transition-colors ${
                        widthFit === wf.id
                          ? isDark
                            ? 'border-[#D4AF37] bg-[#D4AF37]/25 text-[#F4F0E8]'
                            : 'border-[#8C5A2B] bg-[#8C5A2B]/20 text-[#1C1816]'
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
                className={`rounded-xl border ${cLine} ${cCard} p-3.5 grid grid-cols-2 gap-3 ${
                  !isProPurchased ? 'cursor-pointer' : ''
                }`}
              >
                <div>
                  <span className={`text-[11px] font-semibold uppercase tracking-wider block ${cTextMuted}`}>
                    {t.insoleLabel} / {t.allowanceLabel}
                  </span>
                  <span className={`font-serif text-[24px] block mt-0.5 ${!isProPurchased ? 'blur-[4px]' : ''}`}>
                    {proFit.insoleMm} {t.mmLabel} ({proFit.insoleCm.toFixed(1)} {t.cmLabel})
                  </span>
                  <span className={`block text-[11.5px] mt-0.5 ${cTextMuted}`}>
                    {t.xrayFootTag} {proFit.footMm} + {proFit.allowanceMm} {t.mmLabel} →{' '}
                    <strong style={{ color: accentHex }}>EU {formatSize(activeResult.eu)}</strong>
                  </span>
                </div>

                <div>
                  <span className={`text-[11px] font-semibold uppercase tracking-wider block ${cTextMuted}`}>
                    {t.widthLabel} / {t.girthLabel}
                  </span>
                  <span className={`font-serif text-[24px] block mt-0.5 ${!isProPurchased ? 'blur-[4px]' : ''}`}>
                    {proFit.ballWidthMm} / {proFit.ballGirthMm} {t.mmLabel}
                  </span>
                  <span className={`block text-[11.5px] mt-0.5 ${cTextMuted} ${!isProPurchased ? 'blur-[3px]' : ''}`}>
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
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-2"
            >
              {proFit.brandMatrix.map((row: BrandFitEntry) => (
                <div
                  key={row.brand}
                  onClick={() => {
                    if (!isProPurchased) handleProClick()
                    else hapticSelection()
                  }}
                  className={`rounded-xl border ${cLine} ${cCard} px-3.5 py-2.5 flex items-center justify-between gap-2.5 ${
                    !isProPurchased ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-sans font-bold uppercase tracking-wider">
                        {row.brand}
                      </span>
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${cLine} ${cTextMuted}`}>
                        {row.category}
                      </span>
                    </div>
                    <p className={`text-[11.5px] font-sans leading-snug ${cTextMuted} mt-0.5`}>
                      {row.offsetNote[safeLang]}
                    </p>
                  </div>

                  {isProPurchased ? (
                    <div className="text-right shrink-0">
                      <span className="font-serif text-[19px] block leading-tight">
                        EU {row.eu} · US {row.us}
                      </span>
                      <span className={`text-[11px] font-sans ${cTextMuted}`}>
                        UK {row.uk} · JP {row.jp}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-serif text-base blur-[4px] opacity-40 select-none">EU 42.5</span>
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
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className={`rounded-xl border ${cLine} ${cCard} p-4 flex flex-col gap-2.5`}
            >
              <p className="text-[13px] font-sans leading-relaxed">{t.measureGuide1}</p>
              <p className="text-[13px] font-sans leading-relaxed">{t.measureGuide2}</p>
              <p className="text-[13px] font-sans leading-relaxed font-semibold" style={{ color: accentHex }}>
                {t.measureGuide3}
              </p>
              <p className={`text-[12px] font-sans italic pt-2 border-t ${cLine} ${cTextMuted}`}>
                {t.measureTip}
              </p>
              <div className={`pt-2 border-t ${cLine} text-[11px] font-sans ${cTextMuted}`}>
                <div>{t.disclaimer}</div>
                <div className="mt-0.5">{t.standardsNote}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 6. НИЖНИЙ БАР СТАТУСА ИЛИ ПОКУПКИ PRO */}
        <div className="shrink-0 pt-1">
          {statusError && (
            <div className="mb-1.5 px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-[12px] text-center">
              {statusError}
            </div>
          )}

          {!isProPurchased ? (
            <div className={`rounded-xl border ${cLine} pro-shimmer p-3 flex flex-col gap-2`}>
              <div>
                <h3 className="font-serif text-base tracking-tight leading-snug">{t.proTitle}</h3>
                <p className={`text-[11.5px] font-sans leading-snug mt-0.5 ${cTextMuted}`}>{t.proDesc}</p>
              </div>

              <button
                type="button"
                onClick={handleProClick}
                disabled={isPurchasing}
                className={`w-full py-3 px-4 rounded-xl border ${cLine} flex items-center justify-center gap-2 text-[12px] font-sans font-bold uppercase tracking-[0.12em] cursor-pointer active:scale-[0.98] transition-transform ${
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
            <div className={`rounded-xl border ${cLine} ${cCard} px-4 py-2.5 flex items-center justify-between text-[11px] font-sans font-semibold uppercase tracking-[0.12em] ${cTextMuted}`}>
              <span className="truncate">{t.subtitle}</span>
              <span className="shrink-0 ml-2 font-bold" style={{ color: accentHex }}>
                ★ {t.proActiveBadge}
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
