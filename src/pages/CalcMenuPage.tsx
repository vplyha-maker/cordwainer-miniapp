import { useState, useLayoutEffect, useMemo, type CSSProperties } from 'react'
import type { Lang } from '../App'
import { getHomePalette } from './home/theme'
import { hapticSwatch, hapticTap, triggerHaptic } from './home/haptics'
import type { ExtendedWindow } from './home/types'

// ЭКСПОРТИРУЕМ КОЛИЧЕСТВО ДЛЯ HOMEPAGE
export const CALCULATORS_COUNT = 5

type CalcMenuPageProps = {
  onBack: () => void
  lang: Lang
  onOpenSizeCalc?: () => void
  onOpenWidthCalc?: () => void
  onOpenHeelCalc?: () => void
  onOpenColorCalc?: () => void
  onOpenSalaryCalc?: () => void
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

const CALC_MENU_STYLES = `
  .cw-calc-root * {
    -webkit-tap-highlight-color: transparent !important;
    -webkit-touch-callout: none;
  }

  @keyframes cwCalcEnter {
    from {
      opacity: 0;
      transform: translate3d(0, 12px, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  @keyframes cwCaliperSlide {
    0%, 100% { transform: translate3d(0, 0, 0); }
    50% { transform: translate3d(38px, 0, 0); }
  }

  @keyframes cwNodePulse {
    0%, 100% { opacity: 1; transform: scale3d(1, 1, 1); }
    50% { opacity: 0.42; transform: scale3d(0.76, 0.76, 1); }
  }

  .cw-calc-enter {
    animation: cwCalcEnter 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .cw-caliper-marker {
    animation: cwCaliperSlide 5.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
  }

  .cw-node-pulse {
    animation: cwNodePulse 2.4s ease-in-out infinite;
  }

  .cw-calc-pane {
    contain: layout style;
    transition:
      background-color 0.22s ease,
      border-color 0.22s ease,
      opacity 0.16s ease;
  }

  .cw-calc-pane:active:not(:disabled) {
    opacity: 0.88;
  }

  .cw-calc-pane:focus-visible {
    outline: 2px solid var(--cw-accent);
    outline-offset: -2px;
  }

  .cw-calc-glide {
    transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @media (hover: hover) {
    .cw-calc-pane:hover:not(:disabled) .cw-calc-glide {
      transform: translate3d(4px, 0, 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cw-calc-enter,
    .cw-caliper-marker,
    .cw-node-pulse {
      animation: none !important;
    }
    .cw-calc-pane,
    .cw-calc-glide {
      transition: none !important;
    }
  }
`

const RULER_TICKS = [
  14, 8, 8, 8, 12, 8, 8, 8, 16, 8, 8, 8, 12, 8, 8, 8, 16, 8, 8, 8, 12, 8, 8, 8, 14,
]

const PIGMENT_BANDS = ['#3B1D14', '#8F4826', '#C88D55', '#541A21', '#1F2B3D']

export function CalcMenuPage({
  onBack,
  lang,
  onOpenSizeCalc,
  onOpenWidthCalc,
  onOpenHeelCalc,
  onOpenColorCalc,
  onOpenSalaryCalc,
  isFavorite = false,
  onToggleFavorite,
}: CalcMenuPageProps) {
  const [isDark, setIsDark] = useState(true)

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

    const syncTheme = () => {
      const savedTheme = localStorage.getItem('cordwainer_theme')
      const dark = savedTheme
        ? savedTheme === 'dark'
        : document.documentElement.classList.contains('dark')
      setIsDark(dark)
      try {
        const tg = (window as ExtendedWindow).Telegram?.WebApp
        const bgHex = dark ? '#08080A' : '#EAE7E0'
        tg?.setHeaderColor?.(bgHex)
        tg?.setBackgroundColor?.(bgHex)
      } catch {
        // Ignore outside Telegram
      }
    }

    syncTheme()
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark')
      setIsDark(dark)
      try {
        const tg = (window as ExtendedWindow).Telegram?.WebApp
        const bgHex = dark ? '#08080A' : '#EAE7E0'
        tg?.setHeaderColor?.(bgHex)
        tg?.setBackgroundColor?.(bgHex)
      } catch {
        // Ignore outside Telegram
      }
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  const safeLang = lang === 'ru' || lang === 'uk' || lang === 'de' ? lang : 'uk'

  const t = {
    ru: {
      title: 'Расчёты',
      subtitle: 'Инструментарий PRO',
      sizeTitle: 'Размеры',
      sizeSub: 'UK, US, EU, UKR',
      widthTitle: 'Полнота',
      widthSub: 'Обхват и форма',
      heelTitle: 'Каблук',
      heelSub: 'Биомеханика (H)',
      colorTitle: 'Колористика',
      colorSub: 'Смешивание красок',
      salaryTitle: 'Зарплата',
      salarySub: 'Сдельная оплата',
      saveAddTitle: 'В закладки',
      saveAddSub: 'Сохранить раздел',
      saveRemoveTitle: 'Сохранено',
      saveRemoveSub: 'Удалить из закладок',
    },
    uk: {
      title: 'Розрахунки',
      subtitle: 'Інструментарій PRO',
      sizeTitle: 'Розміри',
      sizeSub: 'UK, US, EU, UKR',
      widthTitle: 'Повнота',
      widthSub: 'Обхват та форма',
      heelTitle: 'Підбор',
      heelSub: 'Біомеханіка (H)',
      colorTitle: 'Колористика',
      colorSub: 'Змішування фарб',
      salaryTitle: 'Зарплата',
      salarySub: 'Відрядна оплата',
      saveAddTitle: 'У закладки',
      saveAddSub: 'Зберегти розділ',
      saveRemoveTitle: 'Збережено',
      saveRemoveSub: 'Видалити з закладок',
    },
    de: {
      title: 'Rechner',
      subtitle: 'PRO Werkzeuge',
      sizeTitle: 'Größen',
      sizeSub: 'UK, US, EU, UKR',
      widthTitle: 'Weite',
      widthSub: 'Umfang & Form',
      heelTitle: 'Absatz',
      heelSub: 'Biomechanik (H)',
      colorTitle: 'Farben',
      colorSub: 'Farbmischung',
      salaryTitle: 'Lohn',
      salarySub: 'Akkordlohn',
      saveAddTitle: 'Speichern',
      saveAddSub: 'Zum Archiv',
      saveRemoveTitle: 'Gespeichert',
      saveRemoveSub: 'Aus Archiv entfernen',
    },
  }[safeLang]

  const palette = useMemo(() => getHomePalette(isDark), [isDark])

  const openModule = (fn?: () => void) => {
    if (!fn) return
    hapticTap()
    fn()
  }

  const handleToggleFavorite = () => {
    if (isFavorite) {
      hapticSwatch()
    } else {
      triggerHaptic('heavy')
    }
    onToggleFavorite?.()
  }

  return (
    <div
      className="cw-calc-root relative min-h-[100dvh] w-full overflow-x-hidden select-none"
      style={
        {
          backgroundColor: palette.bg,
          backgroundImage: palette.bgMesh,
          color: palette.text,
          '--cw-accent': palette.accentBronze,
        } as CSSProperties
      }
    >
      <style>{CALC_MENU_STYLES}</style>

      {/* FLOATING COMMAND HEADER */}
      <header
        className="sticky top-0 z-30 border-b md:backdrop-blur-md"
        style={{
          backgroundColor: palette.headerBg,
          borderColor: palette.border,
        }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-14 xl:px-20 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              hapticTap()
              onBack()
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-sans font-medium border cursor-pointer outline-none transition-colors"
            style={{
              color: palette.text,
              borderColor: palette.border,
              backgroundColor: palette.surfaceSubtle,
            }}
          >
            <span>←</span>
            <span>Back</span>
          </button>

          <span
            className="text-[11px] font-mono uppercase tracking-[0.14em]"
            style={{ color: palette.accentBronze }}
          >
            {t.subtitle}
          </span>
        </div>
      </header>

      {/* MAIN FULL-WIDTH SPATIAL WORKBENCH */}
      <main className="relative z-10 w-full">
        {/* COMPACT ARCHITECTURAL TITLE BAND */}
        <section
          className="w-full px-5 sm:px-8 lg:px-14 xl:px-20 py-7 sm:py-10 border-b cw-calc-enter"
          style={{ borderColor: palette.border }}
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <h1
              className="font-sans font-semibold text-[40px] sm:text-[54px] lg:text-[62px] leading-[0.94] tracking-[-0.04em]"
              style={{ color: palette.text }}
            >
              {t.title}
            </h1>
            <span
              className="text-[12px] font-mono uppercase tracking-[0.14em]"
              style={{ color: palette.textSubtle }}
            >
              {CALCULATORS_COUNT} PRO MODULES
            </span>
          </div>
        </section>

        {/* INTERLOCKING 5-MODULE INSTRUMENT GRID */}
        <section
          className="w-full border-b cw-calc-enter"
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
            animationDelay: '0.06s',
          }}
        >
          {/* ROW 1: SIZE CALIPER (7 cols) + WIDTH GIRTH (5 cols) */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 border-b" style={{ borderColor: palette.border }}>
            {/* 1. SIZE CALCULATOR */}
            <button
              type="button"
              onClick={() => openModule(onOpenSizeCalc)}
              disabled={!onOpenSizeCalc}
              className={`cw-calc-pane group lg:col-span-7 min-h-[210px] sm:min-h-[240px] p-6 sm:p-8 lg:px-14 xl:px-20 flex flex-col justify-between text-left border-b lg:border-b-0 lg:border-r outline-none ${
                onOpenSizeCalc ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
              style={{
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
              }}
            >
              <div className="relative w-full py-3 mb-4" aria-hidden="true">
                <div className="flex items-end justify-between gap-1 h-8">
                  {RULER_TICKS.map((tickH, i) => (
                    <span
                      key={i}
                      className="w-[2px] rounded-full"
                      style={{
                        height: `${tickH}px`,
                        backgroundColor:
                          i % 8 === 0 ? palette.accentBronze : palette.borderStrong,
                      }}
                    />
                  ))}
                </div>
                <div
                  className="mt-2 h-[2px] w-full rounded-full relative overflow-hidden"
                  style={{ backgroundColor: palette.border }}
                >
                  <span
                    className="cw-caliper-marker absolute left-1/4 top-0 h-full w-16 rounded-full"
                    style={{ backgroundColor: palette.accentRed }}
                  />
                </div>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2
                    className="font-sans font-semibold text-[28px] sm:text-[34px] leading-[1.0] tracking-[-0.03em]"
                    style={{ color: palette.text }}
                  >
                    {t.sizeTitle}
                  </h2>
                  <p
                    className="text-[13px] font-mono mt-1.5"
                    style={{ color: palette.textMuted }}
                  >
                    {t.sizeSub}
                  </p>
                </div>
                <span
                  className="cw-calc-glide text-[20px] shrink-0"
                  style={{ color: palette.accentBronze }}
                >
                  →
                </span>
              </div>
            </button>

            {/* 2. WIDTH CALCULATOR */}
            <button
              type="button"
              onClick={() => openModule(onOpenWidthCalc)}
              disabled={!onOpenWidthCalc}
              className={`cw-calc-pane group lg:col-span-5 min-h-[210px] sm:min-h-[240px] p-6 sm:p-8 lg:px-12 xl:px-16 flex flex-col justify-between text-left outline-none ${
                onOpenWidthCalc ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
              style={{ backgroundColor: palette.surface }}
            >
              <div className="flex items-center justify-start py-1 mb-4" aria-hidden="true">
                <svg viewBox="0 0 180 56" fill="none" className="w-[170px] h-[52px]">
                  <ellipse
                    cx="90"
                    cy="28"
                    rx="72"
                    ry="20"
                    stroke={palette.accentBronze}
                    strokeWidth="1.8"
                  />
                  <ellipse
                    cx="90"
                    cy="28"
                    rx="48"
                    ry="13"
                    stroke={palette.textSubtle}
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1="12"
                    y1="28"
                    x2="168"
                    y2="28"
                    stroke={palette.borderStrong}
                    strokeWidth="1"
                  />
                  <circle cx="18" cy="28" r="3" fill={palette.accentBronze} />
                  <circle cx="162" cy="28" r="3" fill={palette.accentBronze} />
                </svg>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2
                    className="font-sans font-semibold text-[26px] sm:text-[30px] leading-[1.02] tracking-[-0.03em]"
                    style={{ color: palette.text }}
                  >
                    {t.widthTitle}
                  </h2>
                  <p
                    className="text-[13.5px] font-sans mt-1.5"
                    style={{ color: palette.textMuted }}
                  >
                    {t.widthSub}
                  </p>
                </div>
                <span
                  className="cw-calc-glide text-[19px] shrink-0"
                  style={{ color: palette.accentBronze }}
                >
                  →
                </span>
              </div>
            </button>
          </div>

          {/* ROW 2: HEEL BIOMECHANICS (5 cols) + COLOR MIXING (7 cols) */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 border-b" style={{ borderColor: palette.border }}>
            {/* 3. HEEL CALCULATOR */}
            <button
              type="button"
              onClick={() => openModule(onOpenHeelCalc)}
              disabled={!onOpenHeelCalc}
              className={`cw-calc-pane group lg:col-span-5 min-h-[220px] sm:min-h-[250px] p-6 sm:p-8 lg:px-14 xl:px-20 flex flex-col justify-between text-left border-b lg:border-b-0 lg:border-r outline-none ${
                onOpenHeelCalc ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
              style={{
                backgroundColor: '#121216',
                borderColor: palette.border,
                color: '#F5F4F0',
              }}
            >
              <div className="w-full flex items-center justify-start mb-4" aria-hidden="true">
                <svg viewBox="0 0 210 68" fill="none" className="w-[196px] h-[62px]">
                  <line
                    x1="8"
                    y1="58"
                    x2="202"
                    y2="58"
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <path
                    d="M22 14 C56 14, 78 52, 128 54 L190 54"
                    stroke="#D4A373"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="22"
                    y1="14"
                    x2="22"
                    y2="58"
                    stroke="#F04E37"
                    strokeWidth="1.6"
                  />
                  <circle cx="22" cy="14" r="4" fill="#F04E37" className="cw-node-pulse" />
                  <circle cx="128" cy="54" r="3.5" fill="#D4A373" />
                </svg>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-sans font-semibold text-[26px] sm:text-[30px] leading-[1.02] tracking-[-0.03em] text-[#F5F4F0]">
                    {t.heelTitle}
                  </h2>
                  <p className="text-[13px] font-mono text-white/62 mt-1.5">
                    {t.heelSub}
                  </p>
                </div>
                <span className="cw-calc-glide text-[19px] text-[#D4A373] shrink-0">
                  →
                </span>
              </div>
            </button>

            {/* 4. COLOR MIXING */}
            <button
              type="button"
              onClick={() => openModule(onOpenColorCalc)}
              disabled={!onOpenColorCalc}
              className={`cw-calc-pane group relative lg:col-span-7 min-h-[220px] sm:min-h-[250px] overflow-hidden text-left outline-none ${
                onOpenColorCalc ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
            >
              <div className="absolute inset-0 flex w-full h-full" aria-hidden="true">
                {PIGMENT_BANDS.map((hex) => (
                  <span
                    key={hex}
                    className="flex-1 h-full"
                    style={{
                      background: `linear-gradient(175deg, ${hex} 0%, #0C0B0B 100%)`,
                    }}
                  />
                ))}
              </div>

              <div
                className="relative z-10 h-full p-6 sm:p-8 lg:px-12 xl:px-16 flex flex-col justify-end text-[#F5F4F0]"
                style={{
                  background:
                    'linear-gradient(to top, rgba(8,8,10,0.74) 0%, rgba(8,8,10,0.12) 60%, transparent 100%)',
                }}
              >
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="font-sans font-semibold text-[28px] sm:text-[34px] leading-[1.0] tracking-[-0.03em]">
                      {t.colorTitle}
                    </h2>
                    <p className="text-[13.5px] font-sans text-white/78 mt-1.5">
                      {t.colorSub}
                    </p>
                  </div>
                  <span className="cw-calc-glide text-[20px] text-[#D4A373] shrink-0">
                    →
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* ROW 3: SALARY / PIECEWORK */}
          <button
            type="button"
            onClick={() => openModule(onOpenSalaryCalc)}
            disabled={!onOpenSalaryCalc}
            className={`cw-calc-pane group w-full px-6 sm:px-8 lg:px-14 xl:px-20 py-7 sm:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 text-left outline-none ${
              onOpenSalaryCalc ? 'cursor-pointer' : 'opacity-45 cursor-default'
            }`}
            style={{ backgroundColor: palette.surfaceElevated }}
          >
            <div>
              <h2
                className="font-sans font-semibold text-[25px] sm:text-[30px] leading-[1.04] tracking-[-0.03em]"
                style={{ color: palette.text }}
              >
                {t.salaryTitle}
              </h2>
              <p
                className="text-[13.5px] font-sans mt-1"
                style={{ color: palette.textMuted }}
              >
                {t.salarySub}
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
              <div className="flex items-end gap-1.5 h-8" aria-hidden="true">
                {[12, 20, 16, 28, 22, 32].map((barH, idx) => (
                  <span
                    key={idx}
                    className="w-2 rounded-t-sm"
                    style={{
                      height: `${barH}px`,
                      backgroundColor:
                        idx === 5
                          ? palette.accentBronze
                          : palette.borderStrong,
                    }}
                  />
                ))}
              </div>
              <span
                className="cw-calc-glide text-[19px]"
                style={{ color: palette.accentBronze }}
              >
                →
              </span>
            </div>
          </button>
        </section>

        {/* BOTTOM FAVORITE DOCK */}
        <section
          className="w-full px-4 sm:px-8 lg:px-14 xl:px-20 py-8 sm:py-10 cw-calc-enter"
          style={{ animationDelay: '0.12s' }}
        >
          <button
            type="button"
            onClick={handleToggleFavorite}
            className="cw-calc-pane w-full rounded-2xl sm:rounded-full px-5 sm:px-7 py-4 border flex items-center justify-between gap-4 text-left cursor-pointer outline-none"
            style={{
              backgroundColor: isFavorite
                ? palette.accentBronzeSoft
                : palette.surfaceElevated,
              borderColor: isFavorite
                ? palette.accentBronze
                : palette.border,
              boxShadow: palette.shadowCard,
            }}
          >
            <div className="min-w-0">
              <div
                className="font-sans font-semibold text-[16px] sm:text-[18px] leading-tight"
                style={{ color: palette.text }}
              >
                {isFavorite ? t.saveRemoveTitle : t.saveAddTitle}
              </div>
              <div
                className="text-[12.5px] font-sans mt-0.5"
                style={{ color: palette.textMuted }}
              >
                {isFavorite ? t.saveRemoveSub : t.saveAddSub}
              </div>
            </div>

            <div
              className="w-11 h-11 rounded-full border flex items-center justify-center shrink-0 transition-colors"
              style={{
                backgroundColor: isFavorite
                  ? palette.pillActiveBg
                  : palette.surfaceSubtle,
                color: isFavorite ? palette.pillActiveText : palette.textMuted,
                borderColor: isFavorite
                  ? palette.pillActiveBorder
                  : palette.border,
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill={isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </button>
        </section>
      </main>
    </div>
  )
}
