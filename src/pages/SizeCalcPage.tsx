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

const RULER_TICKS = 31

export function SizeCalcPage({ onBack, lang }: SizeCalcPageProps) {
  const safeLang: SupportedLang =
    lang && (lang === 'ru' || lang === 'uk' || lang === 'de' || lang === 'en') ? lang : 'uk'
  const t = I18N[safeLang]

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
    hapticImpact('medium')
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

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cCard = isDark ? 'bg-[#141414]' : 'bg-[#EAE4DA]'
  const cCardElevated = isDark ? 'bg-[#1E1E20]' : 'bg-[#DFD7CA]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/65' : 'text-[#1C1816]/65'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const accentHex = isDark ? '#D4AF37' : '#9A6024'
  const laserGlowHex = isDark ? '#F5D061' : '#B87328'
  const trackColor = isDark ? '#F4F0E8' : '#1C1816'

  // 6 главных мировых систем (без дублирования Кореи, с реальным украинским размером UA 42)
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

  // Живая аннотация, которая МЕНЯЕТСЯ при переключении «По стопе» / «По стельке»
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
        @keyframes laserPulse {
          0%, 100% { opacity: 0.85; transform: translateY(-50%) scaleY(1); }
          50% { opacity: 1; transform: translateY(-50%) scaleY(1.12); }
        }
        @keyframes haloBreathe {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.45); opacity: 0.85; }
        }
        .pro-shimmer {
          background: linear-gradient(120deg, rgba(212,175,55,0.10), rgba(212,175,55,0.25), rgba(212,175,55,0.10));
          background-size: 200% 200%;
          animation: proGlow 4s ease infinite;
        }
        .laser-vertical-beam {
          animation: laserPulse 1.8s ease-in-out infinite;
        }
        .laser-halo {
          animation: haloBreathe 2s ease-in-out infinite;
        }
      `}</style>

      {/* 1. ШАПКА БЕЗ ОБРЕЗКИ СЛОВ НА ВСЕХ ЯЗЫКАХ */}
      <header className={`px-3 pt-2 pb-1.5 border-b ${cLine} flex items-center justify-between gap-2 shrink-0 z-30`}>
        <button
          type="button"
          onClick={triggerBackNavigation}
          className={`flex items-center gap-1 min-h-[36px] px-2.5 py-1 rounded-xl text-[11px] font-sans font-semibold uppercase tracking-wider outline-none border ${cLine} ${cCard} cursor-pointer shrink-0 active:scale-95 transition-transform`}
        >
          <span className="text-sm leading-none">←</span>
          <span>{t.back}</span>
        </button>

        <div className={`grid grid-cols-3 items-center rounded-full p-0.5 border ${cLine} ${cCard} flex-1 min-w-0`}>
          {(['men', 'women', 'kids'] as Gender[]).map((g) => {
            const active = gender === g
            return (
              <button
                key={g}
                type="button"
                onClick={() => handleGenderChange(g)}
                className={`px-1 py-1.5 rounded-full text-[10.5px] font-sans font-bold uppercase tracking-tight transition-all duration-200 border-none cursor-pointer text-center whitespace-nowrap ${
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

      {/* 2. КОМПАКТНАЯ КАПСУЛА С ЛАЗЕРНЫМ ПРИЦЕЛОМ ПО ПОЛЗУНКУ (Без громоздкого SVG стельки) */}
      <section className="px-3 pt-2 shrink-0">
        <div className={`relative rounded-2xl border ${cLine} ${cCard} px-3.5 py-2.5 overflow-hidden shadow-xs`}>
          {/* Переключатель: [ По стопе | По стельке ] + [ СМ | ММ ] */}
          <div className="flex items-center justify-between gap-2 mb-2">
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
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-sans font-bold uppercase tracking-wider transition-all duration-200 border-none cursor-pointer ${
                      active
                        ? isDark
                          ? 'bg-[#D4AF37] text-[#0A0A0A]'
                          : 'bg-[#9A6024] text-[#F2EFE9]'
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
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-sans font-bold uppercase tracking-wider transition-all duration-200 border-none cursor-pointer ${
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

          {/* КРУПНОЕ ТАБЛО: СЛЕВА — ЗАМЕР, СПРАВА — РАЗМЕР UA / EU */}
          <div className="grid grid-cols-12 items-center gap-2 my-1">
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
                <span className={`text-[10px] font-sans font-semibold uppercase tracking-wider ${cTextMuted}`}>
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
                      className={`w-[92px] text-center text-[38px] font-serif leading-none bg-transparent outline-none border-b ${cLine} ${cText}`}
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

            {/* Правый блок: Размер UA и EU */}
            <div className={`col-span-5 pl-3 border-l ${cLine} flex flex-col items-end justify-center`}>
              <div className="flex items-center gap-1.5">
                <FlagUA />
                <FlagEU />
                <span className={`text-[10px] font-sans uppercase tracking-wider font-bold ${cTextMuted}`}>
                  {t.yourSizeLabel}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[38px] font-serif leading-none tracking-tight tabular-nums" style={{ color: accentHex }}>
                  {formatSize(activeResult.ua)}
                </span>
                <span className={`text-xs font-sans font-bold uppercase ${cTextMuted}`}>
                  UA · {formatSize(activeResult.eu)} EU
                </span>
              </div>
              <span
                className="text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded mt-1 truncate max-w-full"
                style={{
                  backgroundColor: proFit.hasReserveShift
                    ? isDark
                      ? 'rgba(212,175,55,0.2)'
                      : 'rgba(154,96,36,0.16)'
                    : 'transparent',
                  color: proFit.hasReserveShift ? accentHex : undefined,
                }}
              >
                {proFit.hasReserveShift ? t.reserveActiveBadge : `${t.baseFitBadge} · JP ${formatSize(activeResult.jp)}`}
              </span>
            </div>
          </div>

          {/* КОМПАКТНАЯ СТРОКА БИОМЕТРИИ (1 линия вместо огромного SVG) */}
          <div className={`grid grid-cols-3 gap-1.5 py-1.5 px-2 my-1.5 rounded-xl border ${cLine} ${cCardElevated} text-center`}>
            <div>
              <span className={`text-[9.5px] uppercase block ${cTextMuted}`}>{t.footTag}</span>
              <span className="text-[12.5px] font-sans font-bold tabular-nums">
                {proFit.footMm} {t.mmLabel} ({proFit.footCm.toFixed(1)})
              </span>
            </div>
            <div className={`border-l border-r ${cLine}`}>
              <span className={`text-[9.5px] uppercase block ${cTextMuted}`}>{t.ballTag}</span>
              <span className="text-[12.5px] font-sans font-bold tabular-nums">
                {proFit.ballGirthMm} {t.mmLabel} · {proFit.widthMarks.eu}
              </span>
            </div>
            <div>
              <span className={`text-[9.5px] uppercase block ${cTextMuted}`}>{t.insoleLabel}</span>
              <span className="text-[12.5px] font-sans font-bold tabular-nums" style={{ color: accentHex }}>
                {proFit.insoleMm} {t.mmLabel} (+{proFit.allowanceMm})
              </span>
            </div>
          </div>

          {/* 3. ЛАЗЕРНЫЙ ОПТИЧЕСКИЙ ШТАНГЕНЦИРКУЛЬ ПО ПОЛЗУНКУ */}
          <div className="relative w-full pt-3 pb-1">
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
              className="w-full h-11 absolute inset-x-0 top-0 z-30 opacity-0 cursor-pointer"
            />

            {/* Горизонтальный лазерный луч (след от начала шкалы до прицела) */}
            <div
              className="relative h-8 flex items-center justify-between px-1.5 rounded-xl overflow-visible pointer-events-none"
              style={{
                background: isDark
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(212,175,55,0.07) 50%, rgba(255,255,255,0.03) 100%)'
                  : 'linear-gradient(180deg, rgba(28,24,22,0.04) 0%, rgba(154,96,36,0.10) 50%, rgba(28,24,22,0.04) 100%)',
              }}
            >
              {/* Фоновая ось лазера */}
              <div
                className="absolute left-1.5 right-1.5 top-1/2 -translate-y-1/2 h-[2px] rounded-full"
                style={{ backgroundColor: isDark ? 'rgba(244,240,232,0.14)' : 'rgba(28,24,22,0.14)' }}
              />

              {/* Активный светящийся лазерный луч */}
              <div
                className="absolute left-1.5 top-1/2 -translate-y-1/2 h-[2.5px] rounded-full transition-all duration-75"
                style={{
                  width: `calc(${pct}% - 3px)`,
                  background: `linear-gradient(90deg, transparent 0%, ${accentHex} 35%, ${laserGlowHex} 100%)`,
                  boxShadow: `0 0 10px ${laserGlowHex}, 0 0 20px ${accentHex}`,
                }}
              />

              {/* Деления шкалы, вспыхивающие под лазером */}
              {Array.from({ length: RULER_TICKS }).map((_, idx) => {
                const tickPct = (idx / (RULER_TICKS - 1)) * 100
                const dist = Math.abs(tickPct - pct)
                const proximity = Math.max(0, 1 - dist / 13)
                const baseHeight = idx % 5 === 0 ? 11 : 5
                const dynamicHeight = baseHeight + proximity * 14
                const isMajor = idx % 5 === 0
                const isLit = proximity > 0.35

                return (
                  <div
                    key={idx}
                    className="relative z-10 w-[1.5px] rounded-full transition-all duration-75"
                    style={{
                      height: `${dynamicHeight}px`,
                      backgroundColor: isLit ? laserGlowHex : trackColor,
                      boxShadow: isLit ? `0 0 8px ${laserGlowHex}` : 'none',
                      opacity: proximity > 0.15 ? 1 : isMajor ? 0.45 : 0.2,
                    }}
                  />
                )
              })}

              {/* Лазерная головка-прицел с вертикальным лучом */}
              <div
                className="absolute top-1/2 z-20 pointer-events-none transition-transform duration-75"
                style={{
                  left: `calc(${pct}% - 14px)`,
                  transform: `translateY(-50%) scale(${isDraggingSlider ? 1.18 : 1})`,
                }}
              >
                <div className="relative w-7 h-7 flex items-center justify-center">
                  {/* Вертикальный лазерный луч сквозь шкалу */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-1/2 w-[2px] h-10 rounded-full laser-vertical-beam"
                    style={{
                      background: `linear-gradient(180deg, transparent 0%, ${laserGlowHex} 25%, #FFFFFF 50%, ${laserGlowHex} 75%, transparent 100%)`,
                      boxShadow: `0 0 12px ${laserGlowHex}, 0 0 22px ${accentHex}`,
                    }}
                  />
                  {/* Внешний пульсирующий ореол лазера */}
                  <div
                    className="absolute inset-0 rounded-full laser-halo"
                    style={{
                      background: `radial-gradient(circle, ${laserGlowHex} 0%, transparent 70%)`,
                    }}
                  />
                  {/* Оптическое кольцо микрометра */}
                  <div
                    className="relative w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                    style={{
                      backgroundColor: isDark ? '#0A0A0A' : '#F2EFE9',
                      border: `2px solid ${laserGlowHex}`,
                      boxShadow: `0 0 12px ${accentHex}`,
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: laserGlowHex,
                        boxShadow: `0 0 8px ${laserGlowHex}`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={`flex justify-between items-center text-[10.5px] font-sans font-semibold ${cTextMuted} mt-1 px-0.5`}>
              <span>
                {unit === 'cm' ? (sliderMin / 10).toFixed(1) : sliderMin} {unit === 'cm' ? t.cmLabel : t.mmLabel}
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em]" style={{ color: accentHex }}>
                ✦ {measureMode === 'foot' ? t.footLengthLabel : t.insoleInputLabel} ✦
              </span>
              <span>
                {unit === 'cm' ? (sliderMax / 10).toFixed(1) : sliderMax} {unit === 'cm' ? t.cmLabel : t.mmLabel}
              </span>
            </div>
          </div>

          {/* ДИНАМИЧЕСКАЯ АННОТАЦИЯ (Меняет текст при переключении «По стопе» / «По стельке») */}
          <div
            className={`mt-1.5 px-2.5 py-1.5 rounded-xl border ${cLine} ${cCardElevated} text-[11px] font-sans leading-snug transition-colors`}
          >
            {dynamicAnnotationText}
          </div>
        </div>
      </section>

      {/* 4. НАВИГАЦИЯ ПО ВКЛАДКАМ */}
      <nav className="px-3 pt-2 shrink-0">
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
                className={`py-1.5 px-1 rounded-lg text-[11.5px] font-sans font-bold uppercase tracking-[0.04em] transition-all duration-200 border-none cursor-pointer truncate ${
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

      {/* 5. РАБОЧАЯ ОБЛАСТЬ ВКЛАДОК (Вмещается в один экран без прокрутки!) */}
      <main className="flex-1 min-h-0 px-3 pt-2 pb-2.5 overflow-y-auto scrollbar-hide flex flex-col justify-between gap-2">
        <AnimatePresence mode="wait">
          {/* ВКЛАДКА 1: 6 МИРОВЫХ СИСТЕМ (3 ряда × 2 колонки — ничего не обрезается и не требует скролла) */}
          {activeTab === 'world' && (
            <motion.div
              key="world"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="grid grid-cols-2 gap-2 my-auto"
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
                    className={`relative rounded-xl border ${cLine} ${cCard} px-3 py-2.5 flex items-center justify-between gap-1.5 ${
                      !unlocked ? 'cursor-pointer active:scale-[0.98]' : ''
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        {item.flag}
                        <span className="text-[13px] font-sans font-bold uppercase tracking-wide whitespace-nowrap">
                          {item.code}
                        </span>
                      </div>
                      <span className={`text-[10.5px] font-sans ${cTextMuted} truncate mt-0.5`}>
                        {item.sub}
                      </span>
                    </div>

                    {unlocked ? (
                      <span className="font-serif text-[23px] leading-none tracking-tight shrink-0 tabular-nums">
                        {item.val}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-serif text-lg blur-[4px] opacity-40 select-none">42.5</span>
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
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="flex flex-col gap-2 my-auto"
            >
              <div className={`rounded-xl border ${cLine} ${cCard} p-2.5 flex flex-col gap-2`}>
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
                      className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-sans font-semibold uppercase tracking-wider border cursor-pointer transition-colors ${
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
                      className={`py-1.5 px-2 rounded-lg text-[11.5px] font-sans font-semibold uppercase tracking-wider border cursor-pointer truncate transition-colors ${
                        widthFit === wf.id
                          ? isDark
                            ? 'border-[#D4AF37] bg-[#D4AF37]/25 text-[#F4F0E8]'
                            : 'border-[#9A6024] bg-[#9A6024]/20 text-[#1C1816]'
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
                className={`rounded-xl border ${cLine} ${cCard} p-3 grid grid-cols-2 gap-3 ${
                  !isProPurchased ? 'cursor-pointer' : ''
                }`}
              >
                <div>
                  <span className={`text-[10.5px] font-semibold uppercase tracking-wider block ${cTextMuted}`}>
                    {t.insoleLabel} / {t.allowanceLabel}
                  </span>
                  <span className={`font-serif text-[22px] block mt-0.5 ${!isProPurchased ? 'blur-[4px]' : ''}`}>
                    {proFit.insoleMm} {t.mmLabel} ({proFit.insoleCm.toFixed(1)} {t.cmLabel})
                  </span>
                  <span className={`block text-[11px] mt-0.5 ${cTextMuted}`}>
                    {t.footTag} {proFit.footMm} + {proFit.allowanceMm} →{' '}
                    <strong style={{ color: accentHex }}>
                      {formatSize(activeResult.ua)} UA / {formatSize(activeResult.eu)} EU
                    </strong>
                  </span>
                </div>

                <div>
                  <span className={`text-[10.5px] font-semibold uppercase tracking-wider block ${cTextMuted}`}>
                    {t.widthLabel} / {t.girthLabel}
                  </span>
                  <span className={`font-serif text-[22px] block mt-0.5 ${!isProPurchased ? 'blur-[4px]' : ''}`}>
                    {proFit.ballWidthMm} / {proFit.ballGirthMm} {t.mmLabel}
                  </span>
                  <span className={`block text-[11px] mt-0.5 ${cTextMuted} ${!isProPurchased ? 'blur-[3px]' : ''}`}>
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
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="flex flex-col gap-1.5 my-auto"
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
                      <span className="text-[12.5px] font-sans font-bold uppercase tracking-wider">
                        {row.brand}
                      </span>
                      <span className={`text-[9.5px] uppercase px-1.5 py-0.2 rounded border ${cLine} ${cTextMuted}`}>
                        {row.category}
                      </span>
                    </div>
                    <p className={`text-[11px] font-sans leading-snug ${cTextMuted} mt-0.5`}>
                      {row.offsetNote[safeLang]}
                    </p>
                  </div>

                  {isProPurchased ? (
                    <div className="text-right shrink-0">
                      <span className="font-serif text-[17px] block leading-tight">
                        EU {row.eu} · US {row.us}
                      </span>
                      <span className={`text-[10.5px] font-sans ${cTextMuted}`}>
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

          {/* ВКЛАДКА 4: ОБНОВЛЁННАЯ ИНСТРУКЦИЯ ЗАМЕРА (По стопе и По стельке) */}
          {activeTab === 'guide' && (
            <motion.div
              key="guide"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className={`rounded-xl border ${cLine} ${cCard} p-3.5 flex flex-col gap-2 my-auto`}
            >
              <div>
                <h4 className="text-[11.5px] font-sans font-bold uppercase tracking-wider" style={{ color: accentHex }}>
                  {t.guideFootTitle}
                </h4>
                <p className="text-[12px] font-sans leading-snug mt-0.5">{t.measureGuide1}</p>
                <p className={`text-[11.5px] font-sans leading-snug mt-1 ${cTextMuted}`}>{t.measureGuide2}</p>
              </div>

              <div className={`pt-2 border-t ${cLine}`}>
                <h4 className="text-[11.5px] font-sans font-bold uppercase tracking-wider" style={{ color: accentHex }}>
                  {t.guideInsoleTitle}
                </h4>
                <p className="text-[12px] font-sans leading-snug mt-0.5">{t.measureGuide3}</p>
              </div>

              <p className={`text-[11.5px] font-sans italic pt-2 border-t ${cLine} ${cTextMuted}`}>
                {t.measureTip}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 6. НИЖНИЙ БАР СТАТУСА ИЛИ ПОКУПКИ PRO */}
        <div className="shrink-0">
          {statusError && (
            <div className="mb-1 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-[11px] text-center">
              {statusError}
            </div>
          )}

          {!isProPurchased ? (
            <div className={`rounded-xl border ${cLine} pro-shimmer px-3 py-2 flex flex-col gap-1.5`}>
              <div>
                <h3 className="font-serif text-sm tracking-tight leading-snug">{t.proTitle}</h3>
                <p className={`text-[10.5px] font-sans leading-tight mt-0.5 ${cTextMuted}`}>{t.proDesc}</p>
              </div>

              <button
                type="button"
                onClick={handleProClick}
                disabled={isPurchasing}
                className={`w-full py-2.5 px-3 rounded-xl border ${cLine} flex items-center justify-center gap-2 text-[11.5px] font-sans font-bold uppercase tracking-[0.1em] cursor-pointer active:scale-[0.98] transition-transform ${
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
            <div className={`rounded-xl border ${cLine} ${cCard} px-3.5 py-2 flex items-center justify-between text-[10.5px] font-sans font-semibold uppercase tracking-[0.1em] ${cTextMuted}`}>
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
