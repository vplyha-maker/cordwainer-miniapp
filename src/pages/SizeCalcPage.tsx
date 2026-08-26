import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
// Убедитесь, что пути к типам в вашем проекте корректные
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

// Вынесенные SVG иконки
const FlagEU = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-sm">
    <rect width="18" height="12" fill="#003399" />
    <g fill="#FFCC00">
      {[...Array(12)].map((_, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180)
        return <circle key={i} cx={9 + 3.8 * Math.cos(a)} cy={6 + 3.8 * Math.sin(a)} r="0.6" />
      })}
    </g>
  </svg>
)

const FlagUA = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-sm">
    <rect width="18" height="6" fill="#0057B7" />
    <rect y="6" width="18" height="6" fill="#FFD700" />
  </svg>
)

const FlagUK = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-sm">
    <rect width="18" height="12" fill="#012169" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#fff" strokeWidth="2.5" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#C8102E" strokeWidth="1.2" />
    <path d="M9 0 V12 M0 6 H18" stroke="#fff" strokeWidth="3.5" />
    <path d="M9 0 V12 M0 6 H18" stroke="#C8102E" strokeWidth="2" />
  </svg>
)

const FlagUS = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-sm">
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
  'standard', 'nike', 'adidas', 'newbalance', 
  'puma', 'zara', 'bershka', 'terranova', 'lacoste'
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
  const scrollRef = useRef<HTMLDivElement>(null)

  const theme = THEMES[gender]
  const range = RANGES[gender]

  const handleGenderChange = useCallback((g: Gender) => {
    setGender(g)
    const r = RANGES[g]
    setFootMm((prev) => Math.min(r.max, Math.max(r.min, prev)))
  }, [])

  const result = useMemo(() => convertShoeSize(footMm, gender, brand), [footMm, gender, brand])

  const displayValue = unit === 'cm' ? (footMm / 10).toFixed(1).replace('.', ',') : String(Math.round(footMm))
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

  const stepValue = (delta: number) => {
    setFootMm((prev) => {
      const next = Math.min(range.max, Math.max(range.min, prev + delta))
      if (next !== prev) triggerHaptic('light')
      return next
    })
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const t = {
    ru: {
      title: 'Размер обуви', subtitle: 'по длине стопы',
      step1: 'Длина стопы', step1Hint: 'От пятки до самого длинного пальца',
      howToMeasureBtn: 'Как мерить?',
      measureGuide1: '1. Встаньте на лист бумаги (в носках).', measureGuide2: '2. Обведите стопу, держа ручку вертикально.', measureGuide3: '3. Измерьте расстояние от пятки до края пальцев.',
      measureTip: '💡 Измеряйте стопу во второй половине дня — к вечеру ноги немного отекают.',
      recommended: 'Рекомендуемый размер', disclaimer: 'Размеры ориентировочные и могут отличаться в зависимости от колодки.',
      howCalculated: 'Как считается?', hide: 'Скрыть', save: 'Сохранить результат',
      men: 'Муж', women: 'Жен', kids: 'Дет',
      cm: 'см', mm: 'мм',
      standardsTitle: 'Стандарты', standardsNote: 'Основано на ISO 19407:2023 и ISO 9407 (Mondopoint).', brand: 'Бренд',
    },
    uk: {
      title: 'Розмір взуття', subtitle: 'за довжиною стопи',
      step1: 'Довжина стопи', step1Hint: 'Від п’яти до найдовшого пальця',
      howToMeasureBtn: 'Як міряти?',
      measureGuide1: '1. Станьте на аркуш паперу (у шкарпетках).', measureGuide2: '2. Обведіть стопу, тримаючи ручку вертикально.', measureGuide3: '3. Виміряйте відстань від п’яти до краю пальців.',
      measureTip: '💡 Найкраще вимірювати стопу в другій половині дня — до вечора ноги трохи набрякають.',
      recommended: 'Рекомендований розмір', disclaimer: 'Розміри орієнтовні і можуть відрізнятися залежно від колодки.',
      howCalculated: 'Як рахується?', hide: 'Сховати', save: 'Зберегти результат',
      men: 'Чол', women: 'Жін', kids: 'Дит',
      cm: 'см', mm: 'мм',
      standardsTitle: 'Стандарти', standardsNote: 'На основі ISO 19407:2023 та ISO 9407 (Mondopoint).', brand: 'Бренд',
    },
  }[lang]

  const usLabel = gender === 'kids' ? 'US' : gender === 'men' ? 'US M' : 'US W'

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative flex flex-col h-[100dvh] overflow-hidden"
      style={{ background: 'var(--color-bg, #1C1816)', color: 'var(--color-ink, #F5F1EA)' }}
    >
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-4 md:px-6 pt-4 pb-2">
        <button
          onClick={() => { triggerHaptic(); onBack() }}
          className="w-11 h-11 flex items-center justify-center rounded-full active:scale-90 transition-transform bg-[var(--color-surface,#25201C)] border border-[color-mix(in_srgb,var(--color-accent,#C6A47A)_20%,transparent)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-center">
          <h1 className="text-[17px] font-semibold tracking-wide">{t.title}</h1>
          <p className="text-[12px] text-[var(--color-muted,#B9ACA0)]">{t.subtitle}</p>
        </div>
        <div className="w-11 h-11" /> {/* Space balancer */}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-32 scrollbar-hide">
        {/* Gender Tabs */}
        <div className="mt-4 mb-4 flex p-1 rounded-2xl bg-[var(--color-surface,#25201C)] border border-[color-mix(in_srgb,var(--color-accent,#C6A47A)_20%,transparent)]">
          {(['men', 'women', 'kids'] as Gender[]).map((g) => (
            <button
              key={g} onClick={() => { triggerHaptic(); handleGenderChange(g) }}
              className="flex-1 py-2.5 rounded-[12px] text-[14px] font-medium transition-all duration-200 active:scale-95"
              style={gender === g ? { background: THEMES[g].accentBg, color: THEMES[g].accentSoft } : { color: 'var(--color-muted, #B9ACA0)' }}
            >
              {g === 'men' ? t.men : g === 'women' ? t.women : t.kids}
            </button>
          ))}
        </div>

        {/* Brands Carousel */}
        <div className="mb-6 -mx-4 md:-mx-6 px-4 md:px-6 relative">
          <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2 snap-x" style={{ WebkitOverflowScrolling: 'touch' }}>
            {BRANDS.map((b) => (
              <button
                key={b} onClick={() => { triggerHaptic('light'); setBrand(b) }}
                className="shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 active:scale-95 snap-start"
                style={
                  brand === b
                    ? { background: theme.accent, color: theme.buttonText, boxShadow: `0 4px 12px ${theme.accent}40` }
                    : { background: 'var(--color-surface, #25201C)', color: 'var(--color-muted, #B9ACA0)', border: `1px solid color-mix(in srgb, ${theme.accent} 20%, transparent)` }
                }
              >
                {BRAND_LABELS[b]}
              </button>
            ))}
          </div>
        </div>

        {/* Measurement Input Card */}
        <div className="rounded-3xl p-5 mb-5 shadow-lg bg-[var(--color-surface,#25201C)] border border-[color-mix(in_srgb,var(--color-accent,#C6A47A)_20%,transparent)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[14px] font-medium block">{t.step1}</span>
              <span className="text-[11px] text-[var(--color-muted,#B9ACA0)] block mt-0.5">{t.step1Hint}</span>
            </div>
            
            <div className="flex rounded-full p-1 bg-[var(--color-bg,#1C1816)] border border-[color-mix(in_srgb,var(--color-accent,#C6A47A)_20%,transparent)]">
              {(['cm', 'mm'] as const).map((u) => (
                <button
                  key={u} onClick={() => { triggerHaptic(); setUnit(u) }}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all active:scale-95"
                  style={unit === u ? { background: theme.accent, color: theme.buttonText } : { color: 'var(--color-muted, #B9ACA0)' }}
                >
                  {u === 'cm' ? t.cm : t.mm}
                </button>
              ))}
            </div>
          </div>

          {/* Value Editor */}
          <div className="flex items-center justify-center gap-5 mb-8">
            <button
              onClick={() => stepValue(-1)} disabled={footMm <= range.min}
              className="w-12 h-12 flex shrink-0 items-center justify-center rounded-full bg-[var(--color-bg,#1C1816)] border border-[color-mix(in_srgb,var(--color-accent,#C6A47A)_20%,transparent)] active:scale-90 transition-all disabled:opacity-30"
              style={{ color: theme.accentSoft }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /></svg>
            </button>

            <div className="text-center w-40 relative flex justify-center" onClick={startEdit}>
              {isEditing ? (
                <input
                  ref={inputRef} value={editValue} inputMode="decimal"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                  onBlur={commitEdit} onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                  className="w-full text-center text-[52px] font-light bg-transparent outline-none border-b-2 tabular-nums"
                  style={{ color: theme.accentSoft, borderColor: theme.accent }}
                />
              ) : (
                <div className="cursor-pointer active:scale-95 transition-transform whitespace-nowrap flex items-baseline">
                  <span className="text-[52px] font-light tracking-tight leading-none tabular-nums" style={{ color: theme.accentSoft }}>
                    {displayValue}
                  </span>
                  <span className="text-[20px] ml-1.5 font-medium text-[var(--color-muted,#B9ACA0)]">{displayUnit}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => stepValue(1)} disabled={footMm >= range.max}
              className="w-12 h-12 flex shrink-0 items-center justify-center rounded-full bg-[var(--color-bg,#1C1816)] border border-[color-mix(in_srgb,var(--color-accent,#C6A47A)_20%,transparent)] active:scale-90 transition-all disabled:opacity-30"
              style={{ color: theme.accentSoft }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>

          {/* Custom Slider */}
          <div className="px-2">
            <input
              type="range" min={range.min} max={range.max} step={1}
              value={footMm} onChange={(e) => setFootMm(Number(e.target.value))} onPointerUp={() => triggerHaptic('light')}
              className="w-full h-2.5 appearance-none bg-transparent cursor-pointer rounded-full"
              style={{
                background: `linear-gradient(to right, ${theme.accent} 0%, ${theme.accent} ${pct}%, color-mix(in srgb, var(--color-surface-2, #2F2924) 80%, transparent) ${pct}%, color-mix(in srgb, var(--color-surface-2, #2F2924) 80%, transparent) 100%)`,
              }}
            />
            <style>{`
              input[type=range]::-webkit-slider-thumb {
                appearance: none; width: 28px; height: 28px; border-radius: 50%;
                background: ${theme.accentSoft}; border: 3px solid ${theme.thumbBorder};
                box-shadow: 0 0 12px ${theme.accent}80; cursor: pointer; transition: transform 0.1s;
              }
              input[type=range]:active::-webkit-slider-thumb { transform: scale(1.15); }
              input[type=range]::-moz-range-thumb {
                width: 28px; height: 28px; border-radius: 50%;
                background: ${theme.accentSoft}; border: 3px solid ${theme.thumbBorder};
                box-shadow: 0 0 12px ${theme.accent}80; cursor: pointer;
              }
            `}</style>
            <div className="flex justify-between mt-3 text-[11px] font-medium tabular-nums text-[var(--color-muted,#B9ACA0)]">
              <span>{unit === 'cm' ? (range.min / 10).toFixed(1) : range.min} {displayUnit}</span>
              <span>{unit === 'cm' ? (range.max / 10).toFixed(1) : range.max} {displayUnit}</span>
            </div>
          </div>
          
          {/* Guide Dropdown */}
          <div className="mt-5 pt-4 border-t border-[color-mix(in_srgb,var(--color-accent,#C6A47A)_15%,transparent)]">
            <button
              onClick={() => { triggerHaptic(); setShowMeasureGuide((v) => !v) }}
              className="flex items-center justify-between w-full text-[13px] font-medium active:opacity-70 transition-opacity"
              style={{ color: theme.accentSoft }}
            >
              {t.howToMeasureBtn}
              <motion.svg animate={{ rotate: showMeasureGuide ? 180 : 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </motion.svg>
            </button>
            <AnimatePresence>
              {showMeasureGuide && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-3 p-3.5 rounded-xl bg-[var(--color-bg,#1C1816)] text-[12px] text-[var(--color-muted,#B9ACA0)] leading-relaxed space-y-2 border border-[color-mix(in_srgb,var(--color-accent,#C6A47A)_15%,transparent)]">
                    <p>{t.measureGuide1}</p><p>{t.measureGuide2}</p><p>{t.measureGuide3}</p>
                    <div className="mt-2 pt-2 border-t border-[color-mix(in_srgb,var(--color-accent,#C6A47A)_10%,transparent)] text-[11px] opacity-80">{t.measureTip}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Results Card */}
        <div className="rounded-3xl p-6 mb-5 text-center shadow-lg bg-[var(--color-surface,#25201C)] border border-[color-mix(in_srgb,var(--color-accent,#C6A47A)_25%,transparent)]">
          <div className="flex items-center justify-center gap-2 mb-3">
            <FlagEU /><FlagUA />
            <span className="text-[12px] font-bold tracking-widest text-[var(--color-muted,#B9ACA0)] ml-1">EU/UKR</span>
          </div>

          <div className="text-[72px] font-light leading-none tracking-tight mb-2 tabular-nums" style={{ color: theme.accentSoft }}>
            {formatSize(result.eu)}
          </div>
          
          <div className="text-[13px] mb-6 font-medium text-[var(--color-muted,#B9ACA0)] flex items-center justify-center gap-1.5">
            {t.recommended}
            {brand !== 'standard' && <span className="px-2 py-0.5 rounded-md bg-[var(--color-bg,#1C1816)] text-[11px]">{BRAND_LABELS[brand]}</span>}
          </div>

          {/* Secondary Sizes Grid */}
          <div className="grid grid-cols-3 gap-2 pt-5 border-t border-[color-mix(in_srgb,var(--color-accent,#C6A47A)_15%,transparent)]">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5 h-5 text-[12px] font-medium text-[var(--color-muted,#B9ACA0)]"><FlagUK /> UK</div>
              <span className="text-[18px] font-semibold tabular-nums">{formatSize(result.uk)}</span>
            </div>
            <div className="flex flex-col items-center gap-2 border-x border-[color-mix(in_srgb,var(--color-accent,#C6A47A)_15%,transparent)]">
              <div className="flex items-center gap-1.5 h-5 text-[12px] font-medium text-[var(--color-muted,#B9ACA0)]"><FlagUS /> {usLabel}</div>
              <span className="text-[18px] font-semibold tabular-nums">{formatSize(result.us)}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center h-5 text-[12px] font-medium text-[var(--color-muted,#B9ACA0)]">CM</div>
              <span className="text-[18px] font-semibold tabular-nums">{result.cm.toFixed(1).replace('.', ',')}</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-center px-4 mb-5 opacity-60 text-[var(--color-muted,#B9ACA0)]">{t.disclaimer}</p>

        {/* Tech Standards */}
        <button onClick={() => { triggerHaptic(); setShowStandards((v) => !v) }} className="flex items-center justify-center w-full gap-2 text-[13px] font-medium mb-6 active:opacity-70 transition-opacity" style={{ color: theme.accent }}>
          <motion.svg animate={{ rotate: showStandards ? 180 : 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></motion.svg>
          {showStandards ? t.hide : t.howCalculated}
        </button>

        <AnimatePresence>
          {showStandards && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl p-4 shadow-sm bg-[var(--color-surface,#25201C)] border border-[color-mix(in_srgb,var(--color-accent,#C6A47A)_20%,transparent)] text-[12px]">
                <div className="font-bold tracking-wide uppercase mb-3" style={{ color: theme.accent }}>{t.standardsTitle}</div>
                <div className="space-y-2.5 text-[var(--color-muted,#B9ACA0)]">
                  <div className="flex gap-3"><span className="w-20 shrink-0 font-medium" style={{ color: theme.accentSoft }}>EU / UKR</span><span>ISO 19407 · Paris Point</span></div>
                  <div className="flex gap-3"><span className="w-20 shrink-0 font-medium" style={{ color: theme.accentSoft }}>UK</span><span>ISO 19407 · Barleycorn</span></div>
                  <div className="flex gap-3"><span className="w-20 shrink-0 font-medium" style={{ color: theme.accentSoft }}>US</span><span>ISO 19407 · UK + offset</span></div>
                  <div className="flex gap-3"><span className="w-20 shrink-0 font-medium" style={{ color: theme.accentSoft }}>Mondopoint</span><span>ISO 9407 · ММ стопы</span></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-6 left-0 right-0 z-40 px-4 md:px-6 flex justify-center pointer-events-none">
        <button
          onClick={() => triggerHaptic('medium')}
          className="w-full max-w-md py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-all pointer-events-auto"
          style={{ background: theme.accent, color: theme.buttonText, boxShadow: `0 8px 30px ${theme.accent}50` }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          {t.save}
        </button>
      </div>
    </motion.div>
  )
}
