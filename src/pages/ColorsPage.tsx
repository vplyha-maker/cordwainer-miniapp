import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang as AppLang } from '../App'
import {
  evaluateHarmonyContrast,
  generateHarmonyPalette,
  getCircularAngleDiff,
  getSchemeWheelAngles,
  mapPaletteToFootwear,
  rybHueToRgbHue,
  type ColorModelMode,
  type FootwearMappingPreset,
  type Scheme,
  type SneakerZoneKey,
} from './colors/colorEngine'
import { Sneaker3D } from './colors/Sneaker3D'
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
  triggerHaptic,
  useTelegramProPayment,
} from './colors/useTelegramProPayment'

// Реэкспорты для полной обратной совместимости с остальными модулями проекта
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
  synthesizePigmentHex,
  getRelativeLuminance,
  getContrastRatio,
  getPerceptualPairContrast,
  getSchemeWheelAngles,
  generateHarmonyPalette,
  mapPaletteToFootwear,
  evaluateHarmonyContrast,
  type Scheme,
  type ColorModelMode,
  type FootwearMappingPreset,
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

type PersistedColorsState = {
  baseHue: number
  whiteAmount: number
  blackAmount: number
  chromaAmount: number
  scheme: Scheme
  modelMode: ColorModelMode
  mappingPreset: FootwearMappingPreset
}

const STORAGE_KEY = 'cordwainer_colors_state_v1'

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

const DEFAULT_STATE: PersistedColorsState = {
  baseHue: 194,
  whiteAmount: 0.05,
  blackAmount: 0.05,
  chromaAmount: 0.85,
  scheme: 'complementary',
  modelMode: 'ryb',
  mappingPreset: 'classic',
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
      parsed.modelMode === 'ryb' || parsed.modelMode === 'hsl'
        ? parsed.modelMode
        : DEFAULT_STATE.modelMode

    const mappingPreset: FootwearMappingPreset =
      typeof parsed.mappingPreset === 'string' &&
      ALL_PRESETS.includes(parsed.mappingPreset as FootwearMappingPreset)
        ? (parsed.mappingPreset as FootwearMappingPreset)
        : DEFAULT_STATE.mappingPreset

    return {
      baseHue: Math.round(clamp(parsed.baseHue, 0, 359, DEFAULT_STATE.baseHue)),
      whiteAmount: clamp(parsed.whiteAmount, 0, 1, DEFAULT_STATE.whiteAmount),
      blackAmount: clamp(parsed.blackAmount, 0, 1, DEFAULT_STATE.blackAmount),
      chromaAmount: clamp(parsed.chromaAmount, 0.15, 1, DEFAULT_STATE.chromaAmount),
      scheme,
      modelMode,
      mappingPreset,
    }
  } catch {
    return DEFAULT_STATE
  }
}

const LockIcon = ({ size = 10 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mb-[1px]"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0110 0v4"></path>
  </svg>
)

export function ColorsPage({ onBack, lang, setLang }: ColorsPageProps) {
  const initialSaved = useMemo(() => loadSavedColorsState(), [])

  const [localLang, setLocalLang] = useState<SupportedLang>(() => normalizeSupportedLang(lang))
  useEffect(() => {
    setLocalLang(normalizeSupportedLang(lang))
  }, [lang])

  const [scheme, setScheme] = useState<Scheme>(initialSaved.scheme)
  const [modelMode, setModelMode] = useState<ColorModelMode>(initialSaved.modelMode)
  const [mappingPreset, setMappingPreset] = useState<FootwearMappingPreset>(
    initialSaved.mappingPreset
  )

  const [baseHue, setBaseHue] = useState(initialSaved.baseHue)
  const [whiteAmount, setWhiteAmount] = useState(initialSaved.whiteAmount)
  const [blackAmount, setBlackAmount] = useState(initialSaved.blackAmount)
  const [chromaAmount, setChromaAmount] = useState(initialSaved.chromaAmount)

  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [liveStatusText, setLiveStatusText] = useState('')
  const [showGuide, setShowGuide] = useState(false)

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  const wheelRef = useRef<HTMLDivElement>(null)
  const proModalCloseRef = useRef<HTMLButtonElement>(null)
  const guideCloseRef = useRef<HTMLButtonElement>(null)
  const isDragging = useRef(false)
  const lastHapticHue = useRef(initialSaved.baseHue)

  const t: TranslationDict = TRANSLATIONS[normalizeSupportedLang(localLang)] ?? TRANSLATIONS.ru

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

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    expandTelegramWebApp()
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Сохранение текущей палитры между сессиями
  useEffect(() => {
    try {
      const payload: PersistedColorsState = {
        baseHue,
        whiteAmount,
        blackAmount,
        chromaAmount,
        scheme: isProPurchased || FREE_SCHEMES.includes(scheme) ? scheme : 'complementary',
        modelMode,
        mappingPreset,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {}
  }, [baseHue, whiteAmount, blackAmount, chromaAmount, scheme, modelMode, mappingPreset, isProPurchased])

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

  const handleLangChange = (newLang: SupportedLang) => {
    const safe = normalizeSupportedLang(newLang)
    try {
      localStorage.setItem('cordwainer_lang', safe)
      localStorage.setItem('app_lang', safe)
    } catch {}
    setLocalLang(safe)
    if (isAppNativeLang(safe)) {
      setLang(safe)
    }
  }

  const handleSchemeClick = (s: Scheme) => {
    const isFree = FREE_SCHEMES.includes(s)
    if (!isFree && !isProPurchased) {
      openProModal()
      return
    }
    triggerHaptic('light')
    setScheme(s)
  }

  const handleResetAll = useCallback(() => {
    setBaseHue(DEFAULT_STATE.baseHue)
    setWhiteAmount(DEFAULT_STATE.whiteAmount)
    setBlackAmount(DEFAULT_STATE.blackAmount)
    setChromaAmount(DEFAULT_STATE.chromaAmount)
    setMappingPreset(DEFAULT_STATE.mappingPreset)
  }, [])

  const copyToClipboard = useCallback(
    (key: string, textToCopy: string, announcement: string) => {
      triggerHaptic('light')
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

  const colors = useMemo(
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

  const sneakerColors = useMemo(
    () =>
      mapPaletteToFootwear(
        colors,
        baseHue,
        whiteAmount,
        blackAmount,
        chromaAmount,
        modelMode,
        mappingPreset,
        isDark
      ),
    [colors, baseHue, whiteAmount, blackAmount, chromaAmount, modelMode, mappingPreset, isDark]
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
      'CORDWAINE AEROSTRAP — ' +
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
  }, [allZonesSpec, baseHue, copyToClipboard, harmonyEvaluation.ratioText, modelMode, scheme, t])

  const wheelBackground = useMemo(() => {
    const stops: string[] = []
    for (let deg = 0; deg <= 360; deg += 30) {
      const displayHue = modelMode === 'ryb' ? rybHueToRgbHue(deg) : deg
      stops.push('hsl(' + displayHue.toFixed(1) + ', 90%, 50%)')
    }
    return 'conic-gradient(from 0deg, ' + stops.join(', ') + ')'
  }, [modelMode])

  const updateFromClientXY = useCallback((clientX: number, clientY: number) => {
    const el = wheelRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy

    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    angle = Math.round((angle + 90 + 360) % 360) % 360

    if (getCircularAngleDiff(angle, lastHapticHue.current) >= 15) {
      triggerHaptic('light')
      lastHapticHue.current = angle
    }

    setBaseHue(angle)
  }, [])

  const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    updateFromClientXY(e.clientX, e.clientY)
  }

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    updateFromClientXY(e.clientX, e.clientY)
  }

  const handleWheelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleWheelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 15 : 5
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      triggerHaptic('light')
      setBaseHue((h) => (h + step) % 360)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      triggerHaptic('light')
      setBaseHue((h) => (h - step + 360) % 360)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setBaseHue(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setBaseHue(180)
    }
  }

  const PRESETS: { id: FootwearMappingPreset; label: string }[] = [
    { id: 'classic', label: t.presetClassic },
    { id: 'toe-focus', label: t.presetToe },
    { id: 'split-quarter', label: t.presetSplit },
    { id: 'neutral-sole', label: t.presetNeutral },
  ]

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/60' : 'text-[#1C1816]/60'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'
  const fadeMaskStyle = {
    maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={
        'relative min-h-[100dvh] w-full flex flex-col justify-between transition-colors duration-700 ' +
        cBg +
        ' ' +
        cText
      }
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <style>{`
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        input[type=range] {
          -webkit-appearance: none;
          background: transparent;
          touch-action: pan-x;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 2px;
          background: ${isDark ? 'rgba(244,240,232,0.22)' : 'rgba(28,24,22,0.22)'};
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: ${isDark ? '#F4F0E8' : '#1C1816'};
          margin-top: -7px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        }
      `}</style>

      {/* Невидимый live-регион для screen readers (WCAG 2.2 AA) */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveStatusText}
      </div>

      {/* КОМПАКТНЫЙ ВЕРХНИЙ ХЕДЕР */}
      <header className="px-4 pt-3 pb-1.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className={
              'group flex items-center gap-1.5 py-1 text-[10px] font-sans uppercase tracking-[0.18em] outline-none border-none bg-transparent cursor-pointer transition-colors ' +
              cTextMuted +
              ' ' +
              cHover
            }
          >
            <span className="transform transition-transform group-hover:-translate-x-0.5">←</span>
            <span>Back</span>
          </button>
          <span className={'h-3 w-px ' + (isDark ? 'bg-white/15' : 'bg-black/15')} />
          <h1 className="font-serif text-xl sm:text-2xl tracking-[-0.02em] leading-none">
            {t.title}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light')
              setModelMode((m) => (m === 'ryb' ? 'hsl' : 'ryb'))
            }}
            className={
              'px-2 py-1 border text-[9px] font-sans uppercase tracking-[0.16em] outline-none bg-transparent cursor-pointer transition-colors ' +
              cLine +
              ' ' +
              cTextMuted +
              ' ' +
              cHover
            }
            title="RYB / HSL"
          >
            {modelMode === 'ryb' ? 'RYB' : 'HSL'}
          </button>

          <div className="flex items-center gap-2">
            {(['ru', 'uk', 'de'] as SupportedLang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => handleLangChange(l)}
                className={
                  'py-1 text-[9.5px] font-sans uppercase tracking-[0.18em] outline-none border-0 bg-transparent cursor-pointer transition-colors ' +
                  (localLang === l ? cText + ' font-semibold' : cTextMuted) +
                  ' ' +
                  cHover
                }
              >
                {l === 'uk' ? 'UKR' : l}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className={
              'px-2.5 py-1 border text-[9.5px] font-sans uppercase tracking-[0.16em] outline-none bg-transparent cursor-pointer transition-colors ' +
              cLine +
              ' ' +
              cText
            }
          >
            {t.guideBtn}
          </button>
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <div className="flex-1 flex flex-col justify-between px-4 pb-3 max-w-2xl mx-auto w-full">
        {/* 1. ПОЛОСА СХЕМ ГАРМОНИИ */}
        <div
          className={'flex overflow-x-auto gap-5 py-2 pr-6 border-y scrollbar-hide ' + cLine}
          style={fadeMaskStyle}
        >
          {ALL_SCHEMES.map((s) => {
            const isFree = FREE_SCHEMES.includes(s)
            const isLocked = !isFree && !isProPurchased

            return (
              <button
                key={s}
                type="button"
                onClick={() => handleSchemeClick(s)}
                className={
                  'flex items-center gap-1 text-[9.5px] font-sans uppercase tracking-[0.2em] whitespace-nowrap transition-all duration-200 outline-none border-none bg-transparent cursor-pointer ' +
                  (scheme === s
                    ? 'italic font-semibold ' + cText + ' opacity-100'
                    : cTextMuted + ' opacity-70 hover:opacity-100')
                }
              >
                {isLocked && (
                  <span className="text-[#FFB020]">
                    <LockIcon size={9} />
                  </span>
                )}
                {t[s]}
              </button>
            )
          })}
        </div>

        {/* 1.5. ПЕРЕКЛЮЧАТЕЛЬ ПРЕСЕТОВ РАСПРЕДЕЛЕНИЯ + ИНДИКАТОР КОНТРАСТА */}
        <div className="flex items-center justify-between gap-2 pt-1.5">
          <div className="flex overflow-x-auto gap-1.5 pr-4 scrollbar-hide" style={fadeMaskStyle}>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light')
                  setMappingPreset(p.id)
                }}
                className={
                  'px-2 py-1 text-[8.5px] font-sans uppercase tracking-[0.14em] whitespace-nowrap border transition-colors cursor-pointer bg-transparent ' +
                  (mappingPreset === p.id
                    ? cLine + ' ' + cText + ' font-semibold'
                    : 'border-transparent ' + cTextMuted + ' ' + cHover)
                }
              >
                {p.label}
              </button>
            ))}
          </div>

          <span
            className={'text-[8px] font-sans uppercase tracking-[0.12em] whitespace-nowrap ' + cTextMuted}
          >
            ΔE {harmonyEvaluation.ratioText} • {harmonyEvaluation.statusLabel}
          </span>
        </div>

        {/* 2. 3D-МОДЕЛЬ CORDWAINE AEROSTRAP */}
        <div className="my-0.5">
          <Sneaker3D
            sneakerColors={sneakerColors}
            isDark={isDark}
            onResetAll={handleResetAll}
            resetLabel={t.resetBtn}
            loading3DLabel={t.loading3D}
            webglFallbackLabel={t.webglFallback}
          />
        </div>

        {/* 3. КОМПАКТНЫЙ ПУЛЬТ: КРУГ ИТТЕНА СЛЕВА + 3 ПОЛЗУНКА СПРАВА */}
        <div
          className={
            'grid grid-cols-[114px_1fr] sm:grid-cols-[136px_1fr] gap-4 items-center py-2 border-t ' +
            cLine
          }
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
              className="relative w-[98px] h-[98px] sm:w-[118px] sm:h-[118px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none focus:outline-none focus:ring-1 focus:ring-current/40"
              style={{
                background: wheelBackground,
                touchAction: 'none',
                boxShadow:
                  '0 0 0 1px ' +
                  (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)') +
                  ', 0 6px 18px rgba(0,0,0,0.16)',
              }}
              onPointerDown={handleWheelPointerDown}
              onPointerMove={handleWheelPointerMove}
              onPointerUp={handleWheelPointerUp}
              onPointerCancel={handleWheelPointerUp}
              onKeyDown={handleWheelKeyDown}
            >
              <div
                className="absolute inset-[24%] rounded-full pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at 35% 32%, white 0%, ' + colors[0] + ' 42%, #111 95%)',
                  boxShadow:
                    'inset -3px -3px 8px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)',
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
                      className="absolute top-[4px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-white/90 shadow-sm"
                      style={{ backgroundColor: 'hsl(' + dotHue + ', 85%, 50%)' }}
                    />
                  </div>
                )
              })}

              <div
                className="absolute inset-0 pointer-events-none"
                style={{ transform: 'rotate(' + baseHue + 'deg)' }}
              >
                <div
                  className="absolute top-[2px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-[1.5px] border-white shadow-md"
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
              className={'mt-1.5 text-[8px] font-sans tracking-[0.18em] uppercase ' + cTextMuted}
            >
              {modelMode === 'ryb' ? t.ittenLabel : t.hslLabel} • {baseHue}°
            </span>
          </div>

          <div className="flex flex-col justify-center gap-2.5 pr-1">
            <div>
              <label
                htmlFor="slider-tint-white"
                className={
                  'flex justify-between text-[8.5px] font-sans uppercase tracking-[0.16em] mb-1 ' +
                  cTextMuted
                }
              >
                <span>{t.pure}</span>
                <span>
                  {t.white} ({Math.round(whiteAmount * 100)}%)
                </span>
              </label>
              <input
                id="slider-tint-white"
                aria-label={t.white}
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={whiteAmount}
                onChange={(e) => setWhiteAmount(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label
                htmlFor="slider-shade-black"
                className={
                  'flex justify-between text-[8.5px] font-sans uppercase tracking-[0.16em] mb-1 ' +
                  cTextMuted
                }
              >
                <span>{t.pure}</span>
                <span>
                  {t.black} ({Math.round(blackAmount * 100)}%)
                </span>
              </label>
              <input
                id="slider-shade-black"
                aria-label={t.black}
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={blackAmount}
                onChange={(e) => setBlackAmount(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label
                htmlFor="slider-chroma-sat"
                className={
                  'flex justify-between text-[8.5px] font-sans uppercase tracking-[0.16em] mb-1 ' +
                  cTextMuted
                }
              >
                <span>Muted</span>
                <span>
                  {t.chroma} ({Math.round(chromaAmount * 100)}%)
                </span>
              </label>
              <input
                id="slider-chroma-sat"
                aria-label={t.chroma}
                type="range"
                min="0.15"
                max="1"
                step="0.01"
                value={chromaAmount}
                onChange={(e) => setChromaAmount(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* 4. СВОТЧИ ПАЛИТРЫ ПО ЗОНАМ */}
        <div className={'grid gap-2.5 pt-1.5 ' + (isTetrad ? 'grid-cols-4' : 'grid-cols-3')}>
          {colors.map((c, i) => {
            const isCopied = copiedKey === 'swatch:' + i + ':' + c
            return (
              <button
                key={i}
                type="button"
                onClick={() => copyToClipboard('swatch:' + i + ':' + c, c, c + ' ' + t.copied)}
                className="flex flex-col text-left bg-transparent border-0 p-0 cursor-pointer group outline-none"
                title={c}
              >
                <div
                  className={
                    'relative w-full h-9 sm:h-10 mb-1 rounded-[2px] shadow-sm border transition-transform duration-150 group-active:scale-[0.98] flex items-end justify-between px-1.5 pb-1 ' +
                    (isDark ? 'border-white/15' : 'border-black/10')
                  }
                  style={{ backgroundColor: c }}
                >
                  <span className="px-1 py-[1px] text-[8px] font-mono tracking-wider rounded-[1px] bg-black/50 text-white/95 backdrop-blur-[2px]">
                    {isCopied ? t.copied : c}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-1 w-full">
                  <span
                    className={'text-[9px] font-sans font-semibold uppercase tracking-[0.14em] ' + cText}
                  >
                    {ratioLabels[i]}
                  </span>
                  <span
                    className={'text-[8px] font-sans uppercase tracking-[0.06em] truncate ' + cTextMuted}
                  >
                    {roleLabels[i]}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* 4.5. ПРОИЗВОДСТВЕННАЯ ТЕХКАРТА 13 ЗОН CORDWAINE AEROSTRAP */}
        <div className={'mt-2 pt-1.5 border-t ' + cLine}>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={'text-[8px] font-sans uppercase tracking-[0.16em] ' + cTextMuted}>
              CORDWAINE AEROSTRAP • 13
            </span>
            <button
              type="button"
              onClick={handleExportFullSpec}
              className={
                'px-2 py-0.5 border rounded-[2px] text-[8px] font-sans uppercase tracking-[0.14em] bg-transparent cursor-pointer transition-colors ' +
                cLine +
                ' ' +
                cTextMuted +
                ' ' +
                cHover
              }
            >
              {copiedKey === '__full_spec__' ? t.exportCopied : t.exportSpecBtn}
            </button>
          </div>

          <div
            className="flex overflow-x-auto gap-1.5 pb-1 pr-6 scrollbar-hide"
            style={fadeMaskStyle}
          >
            {allZonesSpec.map((item) => {
              const zoneKey = 'zone:' + item.key + ':' + item.hex
              const isZoneCopied = copiedKey === zoneKey
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    copyToClipboard(zoneKey, item.hex, item.label + ' ' + item.hex + ' ' + t.copied)
                  }
                  className={
                    'flex items-center gap-1.5 px-2 py-1 border rounded-[2px] bg-transparent cursor-pointer shrink-0 transition-opacity hover:opacity-100 opacity-90 ' +
                    cLine
                  }
                  title={item.label + ': ' + item.hex}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-[1px] border border-current/20 shrink-0"
                    style={{ backgroundColor: item.hex }}
                  />
                  <span className={'text-[8px] font-sans uppercase tracking-[0.08em] ' + cText}>
                    {item.label}
                  </span>
                  <span className={'text-[8px] font-mono ' + cTextMuted}>
                    {isZoneCopied ? t.copied : item.hex}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 5. РЕДАКЦИОННАЯ ПОДПИСЬ */}
        <div className={'mt-2 pt-1.5 border-t flex items-center justify-between ' + cLine}>
          <p className={'font-serif text-[12px] italic ' + cTextMuted}>{t.quote}</p>
          <span className={'text-[8.5px] font-sans font-bold uppercase tracking-[0.3em] ' + cText}>
            Cordwainer
          </span>
        </div>
      </div>

      {/* МОДАЛКА PRO ДОСТУПА */}
      <AnimatePresence>
        {showProModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pro-modal-title"
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#000000]/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={
                'relative w-full max-w-[340px] p-8 border shadow-2xl flex flex-col overflow-hidden ' +
                cLine +
                ' ' +
                (isDark ? 'bg-[#111111]' : 'bg-[#EAE6DF]')
              }
            >
              <div className={'absolute top-0 left-0 w-2 h-2 border-t border-l ' + cLine} />
              <div className={'absolute top-0 right-0 w-2 h-2 border-t border-r ' + cLine} />
              <div className={'absolute bottom-0 left-0 w-2 h-2 border-b border-l ' + cLine} />
              <div className={'absolute bottom-0 right-0 w-2 h-2 border-b border-r ' + cLine} />

              <button
                ref={proModalCloseRef}
                type="button"
                disabled={isPaymentBusy}
                onClick={closeProModal}
                aria-label={t.guideClose}
                className={
                  'absolute top-4 right-4 p-1 hover:text-current bg-transparent border-0 cursor-pointer disabled:opacity-40 ' +
                  cTextMuted
                }
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              <div className={'flex justify-center mb-5 opacity-50 ' + cTextMuted}>
                <LockIcon size={32} />
              </div>

              <h3
                id="pro-modal-title"
                className={'font-serif text-2xl tracking-tight mb-4 text-center ' + cText}
              >
                {t.paywallTitle}
              </h3>

              <p
                className={
                  'text-[12px] font-sans font-light leading-relaxed mb-6 text-center ' + cTextMuted
                }
              >
                {t.paywallDesc}
              </p>

              {paymentErrorMsg && (
                <p className="text-[10px] font-sans text-amber-400 text-center mb-4">
                  {paymentErrorMsg}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleProClick()}
                disabled={isPaymentBusy || paymentState === 'invoice_open'}
                className={
                  'group flex items-center justify-center gap-3 w-full py-4 border hover:bg-current/5 active:scale-95 transition-all outline-none bg-transparent cursor-pointer disabled:opacity-50 ' +
                  cLine +
                  ' ' +
                  cText
                }
              >
                {isPaymentBusy || paymentState === 'invoice_open' ? (
                  <span className="text-[10px] font-sans uppercase tracking-[0.2em] animate-pulse">
                    {paymentState === 'verifying_payment' ? t.verifying : t.loading}
                  </span>
                ) : (
                  <>
                    <LockIcon size={14} />
                    <span className="text-[10px] font-sans uppercase tracking-[0.2em]">
                      {t.paywallBtn}
                    </span>
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY: ГИД */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="color-guide-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={'fixed inset-0 z-[90] flex flex-col overflow-hidden ' + cBg + ' ' + cText}
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="px-6 pt-10 pb-6 flex items-start justify-between shrink-0">
              <h2
                id="color-guide-title"
                className="font-serif text-[12vw] min-[400px]:text-5xl leading-none tracking-tight"
              >
                {t.guideTitle}
              </h2>
              <button
                ref={guideCloseRef}
                type="button"
                onClick={() => setShowGuide(false)}
                className={
                  'text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer transition-colors mt-2 ' +
                  cTextMuted +
                  ' ' +
                  cHover
                }
              >
                {t.guideClose}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide space-y-12">
              <p className="text-[14px] min-[400px]:text-[16px] leading-[1.8] font-light max-w-lg">
                {t.guideIntro}
              </p>

              <div>
                <h3 className={'text-[9px] font-sans uppercase tracking-[0.3em] mb-6 ' + cTextMuted}>
                  {t.guideBalanceTitle}
                </h3>
                <p className="text-[13px] min-[400px]:text-[14px] leading-[1.8] whitespace-pre-line font-light border-l border-current/20 pl-5 max-w-lg">
                  {t.guideBalance}
                </p>
              </div>

              <div>
                <h3 className={'text-[9px] font-sans uppercase tracking-[0.3em] mb-8 ' + cTextMuted}>
                  {t.guideSchemesTitle}
                </h3>
                <div className="space-y-8 max-w-lg">
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
                      <div className="font-serif text-[22px] min-[400px]:text-[26px] leading-[1.2] mb-3">
                        {item.title}
                      </div>
                      <p
                        className={
                          'text-[13px] min-[400px]:text-[14px] leading-[1.8] font-light ' +
                          cTextMuted
                        }
                      >
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className={'text-[9px] font-sans uppercase tracking-[0.3em] mb-6 ' + cTextMuted}>
                  {t.guideFootwearTitle}
                </h3>
                <p className="text-[13px] min-[400px]:text-[14px] leading-[1.8] whitespace-pre-line font-light border-l border-current/20 pl-5 max-w-lg">
                  {t.guideFootwear}
                </p>
              </div>

              <div className={'pt-8 border-t max-w-lg ' + cLine}>
                <p
                  className={
                    'text-[13px] min-[400px]:text-[14px] leading-[1.8] font-light italic ' +
                    cTextMuted
                  }
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
