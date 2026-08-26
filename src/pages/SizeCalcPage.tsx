import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'
import {
  convertShoeSize,
  formatSize,
  RANGES,
  BRAND_LABELS,
  type Gender,
  type Brand,
} from '../lib/shoeSizes'

type SizeCalcPageProps = {
  onBack: () => void
  lang: Lang
}

const FlagEU = () => (
  <svg width="16" height="11" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="12" fill="#003399" />
    <g fill="#FFCC00">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const a = (i * 30 - 90) * (Math.PI / 180)
        return <circle key={i} cx={9 + 3.8 * Math.cos(a)} cy={6 + 3.8 * Math.sin(a)} r="0.55" />
      })}
    </g>
  </svg>
)

const FlagUA = () => (
  <svg width="16" height="11" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="6" fill="#0057B7" />
    <rect y="6" width="18" height="6" fill="#FFD700" />
  </svg>
)

const FlagUK = () => (
  <svg width="16" height="11" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="12" fill="#012169" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#fff" strokeWidth="2" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#C8102E" strokeWidth="1" />
    <path d="M9 0 V12 M0 6 H18" stroke="#fff" strokeWidth="3.2" />
    <path d="M9 0 V12 M0 6 H18" stroke="#C8102E" strokeWidth="1.6" />
  </svg>
)

const FlagUS = () => (
  <svg width="16" height="11" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="12" fill="#B22234" />
    <rect y="1.33" width="18" height="1.33" fill="#fff" />
    <rect y="4" width="18" height="1.33" fill="#fff" />
    <rect y="6.67" width="18" height="1.33" fill="#fff" />
    <rect y="9.33" width="18" height="1.33" fill="#fff" />
    <rect width="7.2" height="6.5" fill="#3C3B6E" />
  </svg>
)

const THEMES = {
  men: {
    accent: '#C6A47A',
    accentSoft: '#E8C9A0',
    accentBg: 'rgba(198,164,122,0.18)',
    accentBorder: 'rgba(198,164,122,0.22)',
    thumbBorder: '#C6A47A',
    buttonText: '#0F0D0B',
  },
  women: {
    accent: '#E8A0B5',
    accentSoft: '#F2C4D0',
    accentBg: 'rgba(232,160,181,0.16)',
    accentBorder: 'rgba(232,160,181,0.25)',
    thumbBorder: '#E8A0B5',
    buttonText: '#1A1214',
  },
  kids: {
    accent: '#7EB8D4',
    accentSoft: '#A8D4E8',
    accentBg: 'rgba(126,184,212,0.16)',
    accentBorder: 'rgba(126,184,212,0.25)',
    thumbBorder: '#7EB8D4',
    buttonText: '#0F1418',
  },
} as const

const BRANDS: Brand[] = [
  'standard',
  'nike',
  'adidas',
  'newbalance',
  'puma',
  'zara',
  'bershka',
  'terranova',
  'lacoste',
]

export function SizeCalcPage({ onBack, lang }: SizeCalcPageProps) {
  const [gender, setGender] = useState<Gender>('men')
  const [brand, setBrand] = useState<Brand>('standard')
  const [unit, setUnit] = useState<'cm' | 'mm'>('cm')
  const [footMm, setFootMm] = useState<number>(RANGES.men.default)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [showStandards, setShowStandards] = useState(false)
  const [showMeasureGuide, setShowMeasureGuide] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const theme = THEMES[gender]
  const range = RANGES[gender]

  const handleGenderChange = useCallback((g: Gender) => {
    setGender(g)
    const r = RANGES[g]
    setFootMm((prev) => Math.min(r.max, Math.max(r.min, prev)))
  }, [])

  const result = useMemo(
    () => convertShoeSize(footMm, gender, brand),
    [footMm, gender, brand],
  )

  const displayValue =
    unit === 'cm'
      ? (footMm / 10).toFixed(1).replace('.', ',')
      : String(Math.round(footMm))

  const displayUnit = unit === 'cm' ? 'см' : 'мм'
  const pct = ((footMm - range.min) / (range.max - range.min)) * 100

  const triggerHaptic = (style: 'light' | 'medium' = 'light') => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
      else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 15 : 30)
    } catch {}
  }

  const startEdit = () => {
    setEditValue(unit === 'cm' ? (footMm / 10).toFixed(1) : String(Math.round(footMm)))
    setIsEditing(true)
  }

  const commitEdit = () => {
    const raw = parseFloat(editValue.replace(',', '.'))
    if (!isNaN(raw)) {
      const mm = unit === 'cm' ? raw * 10 : raw
      setFootMm(Math.min(range.max, Math.max(range.min, mm)))
      triggerHaptic('light')
    }
    setIsEditing(false)
  }

  const stepValue = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setFootMm((prev) => {
      const next = Math.min(range.max, Math.max(range.min, prev + delta))
      if (next !== prev) triggerHaptic('light')
      return next
    })
  }

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const t = {
    ru: {
      title: 'Размер обуви',
      subtitle: 'по длине стопы',
      step1: 'Длина стопы',
      step1Hint: 'От пятки до самого длинного пальца',
      howToMeasureBtn: 'Как мерить?',
      measureGuide1: '1. Встаньте на лист бумаги (в носках).',
      measureGuide2: '2. Обведите стопу, держа ручку строго вертикально.',
      measureGuide3: '3. Измерьте линейкой расстояние от пятки до самого длинного пальца.',
      measureTip:
        '💡 Лучше всего измерять стопу во второй половине дня — к вечеру ноги немного отекают и становятся больше.',
      recommended: 'Рекомендуемый размер',
      disclaimer: 'Размеры ориентировочные и могут отличаться в зависимости от колодки и бренда.',
      howCalculated: 'Как считается?',
      hide: 'Скрыть',
      save: 'Сохранить результат',
      men: 'Муж',
      women: 'Жен',
      kids: 'Дет',
      cm: 'см',
      mm: 'мм',
      standardsTitle: 'Стандарты',
      standardsNote:
        'Основано на ISO 19407:2023 и ISO 9407 (Mondopoint). Реальные размеры брендов могут отличаться.',
      brand: 'Бренд',
    },
    uk: {
      title: 'Розмір взуття',
      subtitle: 'за довжиною стопи',
      step1: 'Довжина стопи',
      step1Hint: 'Від п’яти до найдовшого пальця',
      howToMeasureBtn: 'Як міряти?',
      measureGuide1: '1. Станьте на аркуш паперу (у шкарпетках).',
      measureGuide2: '2. Обведіть стопу, тримаючи ручку строго вертикально.',
      measureGuide3: '3. Виміряйте лінійкою відстань від п’яти до найдовшого пальця.',
      measureTip:
        '💡 Найкраще вимірювати стопу в другій половині дня — до вечора ноги трохи набрякають і стають більшими.',
      recommended: 'Рекомендований розмір',
      disclaimer: 'Розміри орієнтовні і можуть відрізнятися залежно від колодки та бренду.',
      howCalculated: 'Як рахується?',
      hide: 'Сховати',
      save: 'Зберегти результат',
      men: 'Чол',
      women: 'Жін',
      kids: 'Дит',
      cm: 'см',
      mm: 'мм',
      standardsTitle: 'Стандарти',
      standardsNote:
        'На основі ISO 19407:2023 та ISO 9407 (Mondopoint). Реальні розміри брендів можуть відрізнятися.',
      brand: 'Бренд',
    },
  }[lang]

  const usLabel = gender === 'kids' ? 'US' : gender === 'men' ? 'US M' : 'US W'

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="relative flex flex-col h-[100dvh] overflow-hidden"
      style={{
        background: 'var(--color-bg, #1C1816)',
        color: 'var(--color-ink, #F5F1EA)',
      }}
    >
      <div className="relative z-20 flex items-center justify-between px-4 md:px-6 pt-3 pb-1">
        <button
          onClick={() => {
            triggerHaptic()
            onBack()
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-transform"
          style={{
            background: 'var(--color-surface, #25201C)',
            border: '1px solid color-mix(in srgb, var(--color-accent, #C6A47A) 20%, transparent)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="text-center">
          <h1 className="text-[16px] font-medium tracking-wide calc-page-title">{t.title}</h1>
          <p className="text-[11px]" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
            {t.subtitle}
          </p>
        </div>

        <button
          className="w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-transform"
          style={{
            background: 'var(--color-surface, #25201C)',
            border: '1px solid color-mix(in srgb, var(--color-accent, #C6A47A) 20%, transparent)',
            color: theme.accent,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-28 scrollbar-hide calc-page-content">
        {/* Gender segment */}
        <div
          className="mt-4 mb-3 flex p-[3px] rounded-2xl calc-segment"
          style={{
            background: 'var(--color-surface, #25201C)',
            border: '1px solid color-mix(in srgb, var(--color-accent, #C6A47A) 20%, transparent)',
          }}
        >
          {(['men', 'women', 'kids'] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => {
                triggerHaptic()
                handleGenderChange(g)
              }}
              className="flex-1 py-2.5 rounded-[14px] text-[13px] font-medium transition-all duration-200"
              style={
                gender === g
                  ? { background: THEMES[g].accentBg, color: THEMES[g].accentSoft }
                  : { color: 'var(--color-muted, #B9ACA0)' }
              }
            >
              {g === 'men' ? t.men : g === 'women' ? t.women : t.kids}
            </button>
          ))}
        </div>

        {/* Brand chips — horizontal scroll */}
        <div className="mb-5 -mx-4 md:-mx-6 px-4 md:px-6">
          <div
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {BRANDS.map((b) => {
              const active = brand === b
              return (
                <button
                  key={b}
                  onClick={() => {
                    triggerHaptic('light')
                    setBrand(b)
                  }}
                  className="shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 active:scale-95"
                  style={
                    active
                      ? {
                          background: theme.accent,
                          color: theme.buttonText,
                          boxShadow: `0 2px 10px ${theme.accent}40`,
                        }
                      : {
                          background: 'var(--color-surface, #25201C)',
                          color: 'var(--color-muted, #B9ACA0)',
                          border: '1px solid color-mix(in srgb, var(--color-accent, #C6A47A) 18%, transparent)',
                        }
                  }
                >
                  {BRAND_LABELS[b]}
                </button>
              )
            })}
          </div>
        </div>

        <div
          className="rounded-3xl p-5 mb-4 shadow-sm"
          style={{
            background: 'var(--color-surface, #25201C)',
            border: '1px solid color-mix(in srgb, var(--color-accent, #C6A47A) 20%, transparent)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium" style={{ color: 'var(--color-ink, #F5F1EA)' }}>
              {t.step1}
            </span>
            <div
              className="flex rounded-full p-0.5"
              style={{
                background: 'var(--color-bg, #1C1816)',
                border: '1px solid color-mix(in srgb, var(--color-accent, #C6A47A) 20%, transparent)',
              }}
            >
              {(['cm', 'mm'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => {
                    triggerHaptic()
                    setUnit(u)
                  }}
                  className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={
                    unit === u
                      ? { background: theme.accent, color: theme.buttonText }
                      : { color: 'var(--color-muted, #B9ACA0)' }
                  }
                >
                  {u === 'cm' ? t.cm : t.mm}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px]" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
              {t.step1Hint}
            </p>
            <button
              onClick={() => {
                triggerHaptic()
                setShowMeasureGuide((v) => !v)
              }}
              className="flex items-center gap-1 text-[11px] font-medium transition-opacity active:opacity-70"
              style={{ color: theme.accent }}
            >
              {t.howToMeasureBtn}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {showMeasureGuide ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
              </svg>
            </button>
          </div>

          <AnimatePresence>
            {showMeasureGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="overflow-hidden mb-6"
              >
                <div
                  className="flex items-center gap-3 p-3 mb-2 rounded-2xl"
                  style={{
                    background: 'var(--color-bg, #1C1816)',
                    border: '1px solid color-mix(in srgb, var(--color-accent, #C6A47A) 20%, transparent)',
                  }}
                >
                  <div className="shrink-0 flex items-center justify-center w-12 relative">
                    <svg width="40" height="84" viewBox="0 0 40 84" fill="none">
                      <path
                        d="M19.5 82C13 82 10 75 11 65C12.5 50 8 42 7 30C6 15 11 5 18 3C25 1 29 8 30 15C31 22 30 35 32 45C34.5 57 32 70 28 75C24.5 79.5 22 82 19.5 82Z"
                        stroke="var(--color-muted, #B9ACA0)"
                        strokeWidth="1.5"
                      />
                      <line x1="2" y1="82" x2="38" y2="82" stroke={theme.accent} strokeDasharray="2 2" strokeWidth="1.5" />
                      <line x1="2" y1="2" x2="38" y2="2" stroke={theme.accent} strokeDasharray="2 2" strokeWidth="1.5" />
                      <path
                        d="M35 6L35 78M32 9L35 3L38 9M32 75L35 81L38 75"
                        stroke={theme.accent}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <motion.div
                      animate={{ y: [0, 80, 0] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                      className="absolute top-[2px] left-0 w-full h-[1px]"
                      style={{ background: theme.accent, boxShadow: `0 0 6px ${theme.accent}` }}
                    />
                  </div>
                  <div
                    className="flex flex-col justify-center space-y-2 text-[11px] leading-tight"
                    style={{ color: 'var(--color-muted, #B9ACA0)' }}
                  >
                    <p>{t.measureGuide1}</p>
                    <p>{t.measureGuide2}</p>
                    <p>{t.measureGuide3}</p>
                  </div>
                </div>
                <div
                  className="text-[11px] p-3 rounded-xl"
                  style={{
                    color: 'var(--color-muted, #B9ACA0)',
                    background: 'var(--color-bg, #1C1816)',
                    border: '1px solid color-mix(in srgb, var(--color-accent, #C6A47A) 20%, transparent)',
                  }}
                >
                  {t.measureTip}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-center gap-4 mb-7">
            <button
              onClick={(e) => stepValue(-1, e)}
              disabled={footMm <= range.min}
              className="w-10 h-10 calc-stepper-btn flex shrink-0 items-center justify-center rounded-full active:bg-white/10 transition-colors disabled:opacity-30"
              style={{
                background: 'var(--color-bg, #1C1816)',
                border: '1px solid color-mix(in srgb, var(--color-accent, #C6A47A) 20%, transparent)',
                color: theme.accentSoft,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14" />
              </svg>
            </button>

            <div className="text-center w-36" onClick={startEdit}>
              {isEditing ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const sanitizedValue = e.target.value.replace(/[^0-9.,]/g, '')
                    setEditValue(sanitizedValue)
                  }}
                  onBlur={commitEdit}
                  onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                  className="w-full text-center text-[48px] font-light bg-transparent outline-none border-b tabular-nums"
                  style={{ color: theme.accentSoft, borderColor: `${theme.accent}66` }}
                  inputMode="decimal"
                />
              ) : (
                <div className="cursor-pointer active:opacity-70 transition-opacity whitespace-nowrap">
                  <span
                    className="text-[48px] font-light tracking-tight leading-none tabular-nums"
                    style={{ color: theme.accentSoft }}
                  >
                    {displayValue}
                  </span>
                  <span
                    className="text-[18px] ml-1.5 align-top"
                    style={{ color: 'var(--color-muted, #B9ACA0)' }}
                  >
                    {displayUnit}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={(e) => stepValue(1, e)}
              disabled={footMm >= range.max}
              className="w-10 h-10 calc-stepper-btn flex shrink-0 items-center justify-center rounded-full active:bg-white/10 transition-colors disabled:opacity-30"
              style={{
                background: 'var(--color-bg, #1C1816)',
                border: '1px solid color-mix(in srgb, var(--color-accent, #C6A47A) 20%, transparent)',
                color: theme.accentSoft,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          <div className="px-1">
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={1}
              value={footMm}
              onChange={(e) => setFootMm(Number(e.target.value))}
              onPointerUp={() => triggerHaptic('light')}
              className="w-full h-2 appearance-none bg-transparent cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-[22px]
                [&::-webkit-slider-thumb]:h-[22px]
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:border-[3px]
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-[22px]
                [&::-moz-range-thumb]:h-[22px]
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:border-[3px]"
              style={{
                background: `linear-gradient(to right, ${theme.accent} 0%, ${theme.accent} ${pct}%, color-mix(in srgb, var(--color-surface-2, #2F2924) 90%, transparent) ${pct}%, color-mix(in srgb, var(--color-surface-2, #2F2924) 90%, transparent) 100%)`,
                borderRadius: 999,
              }}
            />
            <style>{`
              input[type=range]::-webkit-slider-thumb {
                background: ${theme.accentSoft} !important;
                border-color: ${theme.thumbBorder} !important;
                box-shadow: 0 0 16px ${theme.accent}66 !important;
              }
              input[type=range]::-moz-range-thumb {
                background: ${theme.accentSoft} !important;
                border-color: ${theme.thumbBorder} !important;
              }
            `}</style>
            <div
              className="flex justify-between mt-2.5 text-[10px] tabular-nums"
              style={{ color: 'var(--color-muted, #B9ACA0)' }}
            >
              <span>
                {unit === 'cm' ? (range.min / 10).toFixed(1) : range.min} {displayUnit}
              </span>
              <span>
                {unit === 'cm' ? (range.max / 10).toFixed(1) : range.max} {displayUnit}
              </span>
            </div>
          </div>
        </div>

        <div
          className="rounded-3xl p-6 mb-4 text-center shadow-sm calc-result-card"
          style={{
            background: 'var(--color-surface, #25201C)',
            border: `1px solid ${theme.accentBorder}`,
          }}
        >
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <FlagEU />
            <FlagUA />
            <span
              className="text-[11px] tracking-[0.12em] uppercase ml-1"
              style={{ color: 'var(--color-muted, #B9ACA0)' }}
            >
              EU / UKR
            </span>
          </div>

          <div
            className="text-[64px] font-light leading-none tracking-tight mb-1 tabular-nums"
            style={{ color: theme.accentSoft }}
          >
            {formatSize(result.eu)}
          </div>
          <div className="text-[12px] mb-5" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
            {t.recommended}
            {brand !== 'standard' && (
              <span className="ml-1 opacity-70">· {BRAND_LABELS[brand]}</span>
            )}
          </div>

          {/* Стабильная сетка — без прыжков при смене цифр */}
          <div
            className="grid grid-cols-3 gap-2 pt-4 items-start"
            style={{
              borderTop: '1px solid color-mix(in srgb, var(--color-accent, #C6A47A) 10%, transparent)',
            }}
          >
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div className="flex items-center gap-1 h-4">
                <FlagUK />
                <span className="text-[11px]" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
                  UK
                </span>
              </div>
              <span
                className="text-[15px] font-medium tabular-nums leading-none"
                style={{ color: 'var(--color-ink, #F5F1EA)' }}
              >
                {formatSize(result.uk)}
              </span>
            </div>

            <div
              className="flex flex-col items-center gap-1.5 min-w-0 border-x px-1"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-accent, #C6A47A) 15%, transparent)',
              }}
            >
              <div className="flex items-center gap-1 h-4">
                <FlagUS />
                <span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
                  {usLabel}
                </span>
              </div>
              <span
                className="text-[15px] font-medium tabular-nums leading-none"
                style={{ color: 'var(--color-ink, #F5F1EA)' }}
              >
                {formatSize(result.us)}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div className="flex items-center h-4">
                <span className="text-[11px]" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
                  CM
                </span>
              </div>
              <span
                className="text-[15px] font-medium tabular-nums leading-none"
                style={{ color: 'var(--color-ink, #F5F1EA)' }}
              >
                {result.cm.toFixed(1).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        <p
          className="text-[11px] leading-snug px-1 mb-3"
          style={{ color: 'color-mix(in srgb, var(--color-muted, #B9ACA0) 70%, transparent)' }}
        >
          {t.disclaimer}
        </p>

        <button
          onClick={() => {
            triggerHaptic()
            setShowStandards((v) => !v)
          }}
          className="flex items-center gap-1.5 text-[12px] font-medium mb-4 px-1"
          style={{ color: theme.accent }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {showStandards ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
          </svg>
          {showStandards ? t.hide : t.howCalculated}
        </button>

        <AnimatePresence>
          {showStandards && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div
                className="rounded-2xl p-4 shadow-sm"
                style={{
                  background: 'var(--color-surface, #25201C)',
                  border: '1px solid color-mix(in srgb, var(--color-accent, #C6A47A) 20%, transparent)',
                }}
              >
                <div
                  className="text-[11px] font-medium tracking-wide uppercase mb-3"
                  style={{ color: theme.accent }}
                >
                  {t.standardsTitle}
                </div>
                <div className="space-y-2 text-[12px]" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
                  <div className="flex gap-3">
                    <span className="w-[72px] shrink-0" style={{ color: theme.accent }}>
                      EU / UKR
                    </span>
                    <span>ISO 19407 · Paris Point</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-[72px] shrink-0" style={{ color: theme.accent }}>
                      UK
                    </span>
                    <span>ISO 19407 · Barleycorn</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-[72px] shrink-0" style={{ color: theme.accent }}>
                      US
                    </span>
                    <span>ISO 19407 · UK + offset</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-[72px] shrink-0" style={{ color: theme.accent }}>
                      Mondopoint
                    </span>
                    <span>ISO 9407 · мм стопы</span>
                  </div>
                </div>
                <p
                  className="mt-3 text-[11px] leading-snug"
                  style={{ color: 'color-mix(in srgb, var(--color-muted, #B9ACA0) 70%, transparent)' }}
                >
                  {t.standardsNote}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-6 left-0 right-0 z-40 pointer-events-none">
        <div className="mx-auto w-full max-w-[var(--app-max-width)] px-4 md:px-6">
          <button
            onClick={() => triggerHaptic('medium')}
            className="w-full py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform pointer-events-auto"
            style={{
              background: theme.accent,
              color: theme.buttonText,
              boxShadow: `0 8px 28px ${theme.accent}40`,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {t.save}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
