import { useMemo, useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import {
  calculateProFit,
  formatSize,
  RANGES,
  STYLE_ALLOWANCES,
  type Gender,
  type MeasureMode,
  type ShoeStyle,
  type WidthFit,
} from '../lib/shoeSizes'
import {
  FlagEU,
  FlagUA,
  I18N,
  LockIcon,
  type SupportedLang,
} from '../lib/sizeCalcI18n'
import { safeHapticImpact } from './size-calc/haptics'
import { RulerControl } from './size-calc/RulerControl'
import { SizeTabs } from './size-calc/SizeTabs'
import {
  applyThemePreference,
  detectTelegramMiniApp,
  loadSavedPrefs,
  resolveInitialDarkTheme,
  savePrefs,
} from './size-calc/storage'
import {
  UI_LABELS,
  type ActiveTab,
  type SizeCalcPageProps,
  type UnitMode,
} from './size-calc/types'

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
    if (typeof onBackRef.current === 'function') {
      onBackRef.current()
    }
    safeHapticImpact('medium')
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
      if (typeof onBackRef.current === 'function') {
        onBackRef.current()
      }
      safeHapticImpact('medium')
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
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    } catch {}
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
      applyThemePreference(next)
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
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isProPurchased, setIsProPurchased] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)

  useEffect(() => {
    savePrefs({ gender, measureMode, unit, shoeStyle, widthFit, footMm })
  }, [gender, measureMode, unit, shoeStyle, widthFit, footMm])

  const range = RANGES[gender]

  const handleGenderChange = useCallback((g: Gender) => {
    safeHapticImpact('medium')
    setGender(g)
    const r = RANGES[g]
    setFootMm((prev) => Math.min(r.max, Math.max(r.min, prev)))
  }, [])

  const proFit = useMemo(
    () => calculateProFit(footMm, gender, shoeStyle, widthFit),
    [footMm, gender, shoeStyle, widthFit]
  )

  const activeResult = proFit.recommendedSize

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

    void verifyPurchaseOnServer(userId, rawInitData)
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
            void verifyPurchaseOnServer(userId, rawInitData)
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

  const bgPage = isDark ? 'bg-[#0B0B0C]' : 'bg-[#F7F4EE]'
  const bgHeader = isDark ? 'bg-[#0B0B0C]/90' : 'bg-[#F7F4EE]/90'
  const bgSurface = isDark ? 'bg-[#141416]' : 'bg-[#EFEAE1]'
  const bgSurfaceSoft = isDark ? 'bg-[#1C1C20]' : 'bg-[#E5DFD3]'
  const textPrimary = isDark ? 'text-[#F4F0E8]' : 'text-[#181715]'
  const textSecondary = isDark ? 'text-[#B8B2A8]' : 'text-[#524E47]'
  const textTertiary = isDark ? 'text-[#938E86]' : 'text-[#68635B]'
  const hairline = isDark ? 'border-[#F4F0E8]/[0.09]' : 'border-[#181715]/[0.09]'
  const dividerClass = isDark ? 'divide-[#F4F0E8]/[0.09]' : 'divide-[#181715]/[0.09]'
  const accentHex = isDark ? '#C9A86A' : '#9A6B2F'
  const trackIdleHex = isDark ? 'rgba(244, 240, 232, 0.22)' : 'rgba(24, 23, 21, 0.22)'
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

  const widthLabels: Record<WidthFit, string> = {
    narrow: t.widthNarrow,
    standard: t.widthStandard,
    wide: t.widthWide,
    extraWide: t.widthExtraWide,
  }

  const fitStatusBadge = useMemo(() => {
    if (!proFit.hasReserveShift) {
      return `${t.baseFitBadge} · JP ${formatSize(activeResult.jp)}`
    }
    const isSeasonalStyle = shoeStyle === 'winter' || shoeStyle === 'running'
    const isWideFoot = widthFit === 'wide' || widthFit === 'extraWide'

    if (isSeasonalStyle && isWideFoot) {
      return `${ui.reservePrefix} · ${styleLabels[shoeStyle]} · ${widthLabels[widthFit]}`
    }
    if (isSeasonalStyle) {
      return `${ui.reservePrefix} · ${styleLabels[shoeStyle]}`
    }
    if (isWideFoot) {
      return `${ui.reserveWidthPrefix} · ${widthLabels[widthFit]}`
    }
    return `${ui.reservePrefix} · ${styleLabels[shoeStyle]}`
  }, [
    proFit.hasReserveShift,
    t.baseFitBadge,
    activeResult.jp,
    shoeStyle,
    widthFit,
    ui.reservePrefix,
    ui.reserveWidthPrefix,
    styleLabels,
    widthLabels,
  ])

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

  const themeToggleBtn = (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all ${bgSurface} ${textSecondary}`}
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
        @keyframes cwTabFade {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cw-tab-fade {
          animation: cwTabFade 0.14s ease-out;
        }
      `}</style>

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
        <section className="flex items-center gap-1.5 sm:gap-2.5">
          {isTelegramMiniApp && (
            <button
              type="button"
              onClick={triggerBackNavigation}
              aria-label={t.back}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all ${bgSurface} ${textPrimary}`}
            >
              <svg
                width="17"
                height="17"
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
          )}

          <div className={`flex-1 min-w-0 grid grid-cols-3 p-1 rounded-full ${bgSurface}`}>
            {(['men', 'women', 'kids'] as Gender[]).map((g) => {
              const active = gender === g
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleGenderChange(g)}
                  className={`py-2 px-1 sm:px-2 rounded-full text-[10.5px] sm:text-xs font-sans font-semibold uppercase tracking-[0.03em] sm:tracking-[0.08em] transition-all duration-200 cursor-pointer text-center whitespace-nowrap ${
                    active ? activeInvert : textSecondary
                  }`}
                >
                  {t[g]}
                </button>
              )
            })}
          </div>

          {isTelegramMiniApp && themeToggleBtn}
        </section>

        <RulerControl
          footMm={footMm}
          onChangeFootMm={setFootMm}
          measureMode={measureMode}
          onChangeMeasureMode={setMeasureMode}
          unit={unit}
          onChangeUnit={setUnit}
          range={range}
          insoleMm={proFit.insoleMm}
          allowanceMm={proFit.allowanceMm}
          insoleAddMm={STYLE_ALLOWANCES[shoeStyle].insoleAddMm}
          t={t}
          isDark={isDark}
          bgSurface={bgSurface}
          bgSurfaceSoft={bgSurfaceSoft}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          textTertiary={textTertiary}
          hairline={hairline}
          accentHex={accentHex}
          trackIdleHex={trackIdleHex}
          activeInvert={activeInvert}
        />

        <section className="flex flex-col items-center text-center pt-1">
          <span className={`text-[11px] font-sans font-medium uppercase tracking-[0.2em] mb-2.5 ${textSecondary}`}>
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
                <span className={`text-xs font-sans font-semibold uppercase tracking-[0.18em] ${textSecondary}`}>
                  UA
                </span>
              </div>
            </div>

            <div className={`h-14 w-px ${isDark ? 'bg-[#F4F0E8]/14' : 'bg-[#181715]/14'}`} />

            <div className="flex flex-col items-center pl-3">
              <span className="font-serif text-[56px] sm:text-[66px] leading-[0.92] tracking-tight tabular-nums transition-colors duration-200">
                {formatSize(activeResult.eu)}
              </span>
              <div className="mt-2.5 inline-flex items-center gap-1.5">
                <FlagEU />
                <span className={`text-xs font-sans font-semibold uppercase tracking-[0.18em] ${textSecondary}`}>
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
              {fitStatusBadge}
            </span>
          </div>

          <p className={`mt-2 max-w-md text-xs font-sans leading-relaxed ${textSecondary}`}>
            {dynamicAnnotationText}
          </p>
        </section>

        <section className={`grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-4 py-4 border-y ${hairline}`}>
          <div className="flex flex-col">
            <span className={`text-[11px] font-sans font-medium uppercase tracking-[0.12em] ${textTertiary}`}>
              {t.footTag}
            </span>
            <span className="mt-1 text-base font-sans font-medium tabular-nums">
              {proFit.footMm} {t.mmLabel}
            </span>
            <span className={`mt-0.5 text-xs font-sans tabular-nums ${textSecondary}`}>
              {proFit.footCm.toFixed(1)} {t.cmLabel}
            </span>
          </div>

          <div className="flex flex-col">
            <span className={`text-[11px] font-sans font-medium uppercase tracking-[0.12em] ${textTertiary}`}>
              {t.ballTag}
            </span>
            <span className="mt-1 text-base font-sans font-medium tabular-nums">
              {proFit.ballGirthMm} {t.mmLabel}
            </span>
            <span className={`mt-0.5 text-xs font-sans ${textSecondary}`}>
              EU {proFit.widthMarks.eu}
            </span>
          </div>

          <div className="flex flex-col">
            <span className={`text-[11px] font-sans font-medium uppercase tracking-[0.12em] ${textTertiary}`}>
              {t.insoleLabel}
            </span>
            <span className="mt-1 text-base font-sans font-medium tabular-nums" style={{ color: accentHex }}>
              {proFit.insoleMm} {t.mmLabel}
            </span>
            <span className={`mt-0.5 text-xs font-sans tabular-nums ${textSecondary}`}>
              {proFit.insoleCm.toFixed(1)} {t.cmLabel}
            </span>
          </div>

          <div className="flex flex-col">
            <span className={`text-[11px] font-sans font-medium uppercase tracking-[0.12em] ${textTertiary}`}>
              {t.allowanceLabel}
            </span>
            <span className="mt-1 text-base font-sans font-medium tabular-nums">
              +{proFit.allowanceMm} {t.mmLabel}
            </span>
            <span className={`mt-0.5 text-xs font-sans ${textSecondary}`}>
              {styleLabels[shoeStyle]}
            </span>
          </div>
        </section>

        <SizeTabs
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          gender={gender}
          shoeStyle={shoeStyle}
          onChangeShoeStyle={setShoeStyle}
          widthFit={widthFit}
          onChangeWidthFit={setWidthFit}
          proFit={proFit}
          isProPurchased={isProPurchased}
          onProClick={() => void handleProClick()}
          safeLang={safeLang}
          t={t}
          ui={ui}
          isDark={isDark}
          bgSurface={bgSurface}
          bgSurfaceSoft={bgSurfaceSoft}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          textTertiary={textTertiary}
          hairline={hairline}
          dividerClass={dividerClass}
          accentHex={accentHex}
          activeInvert={activeInvert}
        />

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
                onClick={() => void handleProClick()}
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
            <div className={`py-3 border-t ${hairline} flex items-center justify-between gap-3 text-[11px] font-sans uppercase tracking-[0.12em] ${textSecondary}`}>
              <span className="truncate">{ui.footerBrand}</span>
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
