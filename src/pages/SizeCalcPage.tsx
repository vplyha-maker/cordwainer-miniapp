import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'
import {
  convertShoeSize,
  formatSize,
  RANGES,
  type Gender,
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
    accent: '#B46513',
    bg: 'color-mix(in srgb, #B46513 12%, var(--color-surface))',
    text: '#B46513',
  },
  women: {
    accent: '#BE185D',
    bg: 'color-mix(in srgb, #BE185D 12%, var(--color-surface))',
    text: '#BE185D',
  },
  kids: {
    accent: '#0369A1',
    bg: 'color-mix(in srgb, #0369A1 12%, var(--color-surface))',
    text: '#0369A1',
  },
} as const

export function SizeCalcPage({ onBack, lang }: SizeCalcPageProps) {
  const safeLang = (lang && ['ru', 'uk', 'de'].includes(lang)) ? lang : 'uk'

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
      measureTip: '💡 Лучше всего измерять стопу во второй половине дня — к вечеру ноги немного отекают и становятся больше.',
      recommended: 'Рекомендуемый размер',
      disclaimer: 'Размеры ориентировочные и могут отличаться в зависимости от колодки и бренда.',
      howCalculated: 'Как считается?',
      hide: 'Скрыть',
      men: 'Муж',
      women: 'Жен',
      kids: 'Дет',
      cm: 'см',
      mm: 'мм',
      cmLabel: 'СМ',
      mmLabel: 'ММ',
      standardsTitle: 'Стандарты',
      standardsNote: 'Основано на ISO 19407:2023 и ISO 9407 (Mondopoint). Реальные размеры могут отличаться.',
      isoEu: 'ISO 19407 · Paris Point',
      isoUk: 'ISO 19407 · Barleycorn',
      isoUs: 'ISO 19407 · UK + сдвиг',
      isoMondo: 'ISO 9407 · мм стопы',
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
      measureTip: '💡 Найкраще вимірювати стопу в другій половині дня — до вечора ноги трохи набрякають.',
      recommended: 'Рекомендований розмір',
      disclaimer: 'Розміри орієнтовні і можуть відрізнятися залежно від колодки та бренду.',
      howCalculated: 'Як рахується?',
      hide: 'Сховати',
      men: 'Чол',
      women: 'Жін',
      kids: 'Дит',
      cm: 'см',
      mm: 'мм',
      cmLabel: 'СМ',
      mmLabel: 'ММ',
      standardsTitle: 'Стандарти',
      standardsNote: 'На основі ISO 19407:2023 та ISO 9407 (Mondopoint). Реальні розміри можуть відрізнятися.',
      isoEu: 'ISO 19407 · Paris Point',
      isoUk: 'ISO 19407 · Barleycorn',
      isoUs: 'ISO 19407 · UK + зсув',
      isoMondo: 'ISO 9407 · мм стопи',
    },
    de: {
      title: 'Schuhgröße',
      subtitle: 'nach Fußlänge',
      step1: 'Fußlänge',
      step1Hint: 'Von der Ferse bis zum längsten Zeh',
      howToMeasureBtn: 'Wie messen?',
      measureGuide1: '1. Stellen Sie sich auf ein Blatt Papier (in Socken).',
      measureGuide2: '2. Umranden Sie den Fuß, halten Sie den Stift dabei senkrecht.',
      measureGuide3: '3. Messen Sie den Abstand von der Ferse bis zum längsten Zeh.',
      measureTip: '💡 Am besten messen Sie am Nachmittag — Füße schwellen im Laufe des Tages leicht an.',
      recommended: 'Empfohlene Größe',
      disclaimer: 'Die Größen sind Richtwerte und können je nach Leisten und Marke abweichen.',
      howCalculated: 'Wie wird gerechnet?',
      hide: 'Verbergen',
      men: 'Herren',
      women: 'Damen',
      kids: 'Kinder',
      cm: 'cm',
      mm: 'mm',
      cmLabel: 'cm',
      mmLabel: 'mm',
      standardsTitle: 'Standards',
      standardsNote: 'Basierend auf ISO 19407:2023 und ISO 9407 (Mondopoint). Tatsächliche Größen können abweichen.',
      isoEu: 'ISO 19407 · Paris Point',
      isoUk: 'ISO 19407 · Barleycorn',
      isoUs: 'ISO 19407 · UK + Offset',
      isoMondo: 'ISO 9407 · Fuß in mm',
    },
  }[safeLang]

  const [gender, setGender] = useState<Gender>('men')
  const [unit, setUnit] = useState<'cm' | 'mm'>('cm')
  const [footMm, setFootMm] = useState<number>(RANGES.men.default)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [showStandards, setShowStandards] = useState(false)
  const [showMeasureGuide, setShowMeasureGuide] = useState(false)
  
  // Состояние для иконки "Избранное"
  const [isSaved, setIsSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const theme = THEMES[gender]
  const range = RANGES[gender]

  const handleGenderChange = useCallback((g: Gender) => {
    setGender(g)
    const r = RANGES[g]
    setFootMm((prev) => Math.min(r.max, Math.max(r.min, prev)))
  }, [])

  const result = useMemo(() => convertShoeSize(footMm, gender), [footMm, gender])

  const displayValue =
    unit === 'cm'
      ? (footMm / 10).toFixed(1).replace('.', ',')
      : String(Math.round(footMm))

  const displayUnit = unit === 'cm' ? t.cm : t.mm
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

  const usLabel = gender === 'kids' ? 'US' : gender === 'men' ? 'US M' : 'US W'

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="relative flex flex-col h-[100dvh] overflow-hidden bg-[var(--color-bg)] text-[var(--color-ink)]"
    >
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-4 md:px-6 pt-5 pb-3">
        <button
          onClick={() => { triggerHaptic(); onBack(); }}
          className="w-11 h-11 flex items-center justify-center rounded-full active:scale-90 transition-transform bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm text-[var(--color-ink)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="text-center">
          <h1 className="text-[17px] font-bold tracking-wide text-[var(--color-ink)]">{t.title}</h1>
          <p className="text-[12px] font-medium text-[var(--color-muted)]">{t.subtitle}</p>
        </div>

        <button
          onClick={() => {
            triggerHaptic('medium')
            setIsSaved(!isSaved)
          }}
          className="w-11 h-11 flex items-center justify-center rounded-full active:scale-90 transition-transform bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm"
          style={{ color: theme.accent }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-8 scrollbar-hide">
        
        {/* Gender Tabs */}
        <div className="mt-2 mb-5 flex p-1.5 rounded-[18px] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          {(['men', 'women', 'kids'] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => { triggerHaptic(); handleGenderChange(g); }}
              className="flex-1 py-2.5 rounded-[14px] text-[14px] font-bold transition-all duration-200"
              style={
                gender === g
                  ? { background: THEMES[g].bg, color: THEMES[g].text }
                  : { color: 'var(--color-muted)' }
              }
            >
              {g === 'men' ? t.men : g === 'women' ? t.women : t.kids}
            </button>
          ))}
        </div>

        {/* Foot Length Card */}
        <div className="rounded-[24px] p-5 mb-4 shadow-sm bg-[var(--color-surface)] border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[14px] font-bold text-[var(--color-ink)]">{t.step1}</span>
            <div className="flex rounded-full p-1 bg-[var(--color-bg)] border border-[var(--color-border)]">
              {(['cm', 'mm'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => { triggerHaptic(); setUnit(u); }}
                  className="px-3.5 py-1 rounded-full text-[12px] font-bold transition-all uppercase"
                  style={
                    unit === u
                      ? { background: theme.accent, color: '#FFFFFF' }
                      : { color: 'var(--color-muted)' }
                  }
                >
                  {u === 'cm' ? t.cm : t.mm}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <p className="text-[12px] font-medium text-[var(--color-muted)]">{t.step1Hint}</p>
            <button
              onClick={() => { triggerHaptic(); setShowMeasureGuide((v) => !v); }}
              className="flex items-center gap-1 text-[12px] font-bold transition-opacity active:opacity-70"
              style={{ color: theme.accent }}
            >
              {t.howToMeasureBtn}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                {showMeasureGuide ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
              </svg>
            </button>
          </div>

          {/* Measure Guide Accordion */}
          <AnimatePresence>
            {showMeasureGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="overflow-hidden mb-6"
              >
                <div className="flex items-center gap-3 p-4 mb-2 rounded-[18px] bg-[var(--color-bg)] border border-[var(--color-border)]">
                  <div className="shrink-0 flex items-center justify-center w-12 relative">
                    <svg width="40" height="84" viewBox="0 0 40 84" fill="none">
                      <path d="M19.5 82C13 82 10 75 11 65C12.5 50 8 42 7 30C6 15 11 5 18 3C25 1 29 8 30 15C31 22 30 35 32 45C34.5 57 32 70 28 75C24.5 79.5 22 82 19.5 82Z" stroke="var(--color-muted)" strokeWidth="1.5" />
                      <line x1="2" y1="82" x2="38" y2="82" stroke={theme.accent} strokeDasharray="2 2" strokeWidth="2" />
                      <line x1="2" y1="2" x2="38" y2="2" stroke={theme.accent} strokeDasharray="2 2" strokeWidth="2" />
                      <path d="M35 6L35 78M32 9L35 3L38 9M32 75L35 81L38 75" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <motion.div
                      animate={{ y: [0, 80, 0] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                      className="absolute top-[2px] left-0 w-full h-[2px]"
                      style={{ background: theme.accent, boxShadow: `0 0 8px ${theme.accent}` }}
                    />
                  </div>
                  <div className="flex flex-col justify-center space-y-2 text-[12px] font-medium text-[var(--color-muted)] leading-tight">
                    <p>{t.measureGuide1}</p>
                    <p>{t.measureGuide2}</p>
                    <p>{t.measureGuide3}</p>
                  </div>
                </div>
                <div className="text-[12px] font-medium p-4 rounded-[18px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)]">
                  {t.measureTip}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stepper + Input */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={(e) => stepValue(-1, e)}
              disabled={footMm <= range.min}
              className="w-12 h-12 flex shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] active:scale-95 transition-all disabled:opacity-30 shadow-sm"
              style={{ color: theme.accent }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14" />
              </svg>
            </button>

            <div className="text-center w-40" onClick={startEdit}>
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
                  className="w-full text-center text-[52px] font-bold bg-transparent outline-none tabular-nums"
                  style={{ color: theme.text, borderBottom: `2px solid ${theme.accent}` }}
                  inputMode="decimal"
                />
              ) : (
                <div className="cursor-pointer active:opacity-70 transition-opacity whitespace-nowrap">
                  <span className="text-[52px] font-bold tracking-tight leading-none tabular-nums" style={{ color: theme.text }}>
                    {displayValue}
                  </span>
                  <span className="text-[18px] font-bold ml-1.5 align-top text-[var(--color-muted)]">
                    {unit === 'cm' ? t.cmLabel : t.mmLabel}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={(e) => stepValue(1, e)}
              disabled={footMm >= range.max}
              className="w-12 h-12 flex shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] active:scale-95 transition-all disabled:opacity-30 shadow-sm"
              style={{ color: theme.accent }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {/* Slider */}
          <div className="px-1 relative">
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={1}
              value={footMm}
              onChange={(e) => setFootMm(Number(e.target.value))}
              onPointerUp={() => triggerHaptic('light')}
              className="w-full h-2.5 appearance-none bg-transparent cursor-pointer relative z-10
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-[24px]
                [&::-webkit-slider-thumb]:h-[24px]
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-[24px]
                [&::-moz-range-thumb]:h-[24px]
                [&::-moz-range-thumb]:rounded-full"
              style={{
                background: `linear-gradient(to right, ${theme.accent} 0%, ${theme.accent} ${pct}%, var(--color-border) ${pct}%, var(--color-border) 100%)`,
                borderRadius: 999,
              }}
            />
            <style>{`
              input[type=range]::-webkit-slider-thumb {
                background: ${theme.accent} !important;
                border: 4px solid var(--color-surface) !important;
                box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
              }
              input[type=range]::-moz-range-thumb {
                background: ${theme.accent} !important;
                border: 4px solid var(--color-surface) !important;
                box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
              }
            `}</style>
            <div className="flex justify-between mt-3 text-[11px] font-bold tabular-nums text-[var(--color-muted)]">
              <span>{unit === 'cm' ? (range.min / 10).toFixed(1) : range.min} {displayUnit}</span>
              <span>{unit === 'cm' ? (range.max / 10).toFixed(1) : range.max} {displayUnit}</span>
            </div>
          </div>
        </div>

        {/* Result Card */}
        <div className="rounded-[24px] p-6 mb-4 text-center shadow-sm bg-[var(--color-surface)] border border-[var(--color-border)]">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FlagEU />
            <FlagUA />
            <span className="text-[12px] font-bold tracking-[0.12em] uppercase ml-1 text-[var(--color-muted)]">
              EU / UKR
            </span>
          </div>

          <div className="text-[72px] font-bold leading-none tracking-tight mb-2 tabular-nums" style={{ color: theme.text }}>
            {formatSize(result.eu)}
          </div>
          <div className="text-[13px] font-medium mb-6 text-[var(--color-muted)]">
            {t.recommended}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-5 items-start border-t border-[var(--color-border)]">
            <div className="flex flex-col items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 h-4">
                <FlagUK />
                <span className="text-[12px] font-bold text-[var(--color-muted)]">UK</span>
              </div>
              <span className="text-[16px] font-bold tabular-nums leading-none text-[var(--color-ink)]">
                {formatSize(result.uk)}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2 min-w-0 border-x border-[var(--color-border)] px-1">
              <div className="flex items-center gap-1.5 h-4">
                <FlagUS />
                <span className="text-[12px] font-bold whitespace-nowrap text-[var(--color-muted)]">{usLabel}</span>
              </div>
              <span className="text-[16px] font-bold tabular-nums leading-none text-[var(--color-ink)]">
                {formatSize(result.us)}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2 min-w-0">
              <div className="flex items-center h-4">
                <span className="text-[12px] font-bold text-[var(--color-muted)]">{t.cmLabel}</span>
              </div>
              <span className="text-[16px] font-bold tabular-nums leading-none text-[var(--color-ink)]">
                {result.cm.toFixed(1).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[12px] font-medium leading-snug px-2 mb-4 text-[var(--color-muted)]">
          {t.disclaimer}
        </p>

        {/* Standards Toggle */}
        <button
          onClick={() => { triggerHaptic(); setShowStandards((v) => !v); }}
          className="flex items-center gap-1.5 text-[13px] font-bold mb-5 px-2 active:opacity-70 transition-opacity"
          style={{ color: theme.accent }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
              <div className="rounded-[20px] p-5 shadow-sm bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="text-[12px] font-bold tracking-wide uppercase mb-4" style={{ color: theme.accent }}>
                  {t.standardsTitle}
                </div>
                <div className="space-y-3 text-[13px] font-medium text-[var(--color-muted)]">
                  <div className="flex gap-4">
                    <span className="w-[72px] shrink-0 font-bold" style={{ color: theme.text }}>EU / UKR</span>
                    <span>{t.isoEu}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="w-[72px] shrink-0 font-bold" style={{ color: theme.text }}>UK</span>
                    <span>{t.isoUk}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="w-[72px] shrink-0 font-bold" style={{ color: theme.text }}>US</span>
                    <span>{t.isoUs}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="w-[72px] shrink-0 font-bold" style={{ color: theme.text }}>Mondopoint</span>
                    <span>{t.isoMondo}</span>
                  </div>
                </div>
                <p className="mt-4 text-[12px] font-medium leading-snug pt-3 border-t border-[var(--color-border)] text-[var(--color-muted)]">
                  {t.standardsNote}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
