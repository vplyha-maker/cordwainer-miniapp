import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'
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

/* ---------- Flags ---------- */
const FlagEU = () => (
  <svg width="16" height="11" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="12" fill="#003399" />
    <g fill="#FFCC00">
      {[0,1,2,3,4,5,6,7,8,9,10,11].map((i) => {
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

/* ---------- Accent themes ---------- */
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
    accent: '#E8A0B5',          // soft rose
    accentSoft: '#F2C4D0',
    accentBg: 'rgba(232,160,181,0.16)',
    accentBorder: 'rgba(232,160,181,0.25)',
    thumbBorder: '#E8A0B5',
    buttonText: '#1A1214',
  },
  kids: {
    accent: '#7EB8D4',          // soft sky blue
    accentSoft: '#A8D4E8',
    accentBg: 'rgba(126,184,212,0.16)',
    accentBorder: 'rgba(126,184,212,0.25)',
    thumbBorder: '#7EB8D4',
    buttonText: '#0F1418',
  },
} as const

export function SizeCalcPage({ onBack, lang }: SizeCalcPageProps) {
  const [gender, setGender] = useState<Gender>('men')
  const [unit, setUnit] = useState<'cm' | 'mm'>('cm')
  const [footMm, setFootMm] = useState<number>(RANGES.men.default)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [showStandards, setShowStandards] = useState(false)
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

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const t = {
    ru: {
      title: 'Размер обуви',
      subtitle: 'по длине стопы',
      step1: 'Длина стопы',
      step1Hint: 'От пятки до самого длинного пальца',
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
      standardsNote: 'Основано на ISO 19407:2023 и ISO 9407 (Mondopoint). Реальные размеры брендов могут отличаться.',
    },
    uk: {
      title: 'Розмір взуття',
      subtitle: 'за довжиною стопи',
      step1: 'Довжина стопи',
      step1Hint: 'Від п’яти до найдовшого пальця',
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
      standardsNote: 'На основі ISO 19407:2023 та ISO 9407 (Mondopoint). Реальні розміри брендів можуть відрізнятися.',
    },
  }[lang]

  const usLabel = gender === 'kids' ? 'US' : gender === 'men' ? 'US M' : 'US W'

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="relative flex flex-col h-[100dvh] bg-[#0F0D0B] text-[#F5F1EB] overflow-hidden"
    >
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-3 pb-1">
        <button
          onClick={() => { triggerHaptic(); onBack() }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 active:scale-90 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="text-center">
          <h1 className="text-[16px] font-medium tracking-wide">{t.title}</h1>
          <p className="text-[11px] text-[#7A726A]">{t.subtitle}</p>
        </div>

        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 active:scale-90 transition-transform"
          style={{ color: theme.accent }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-40 scrollbar-hide">
        {/* Gender segmented */}
        <div className="mt-4 mb-6 flex p-[3px] rounded-2xl bg-[#1A1613] border border-white/[0.04]">
          {(['men', 'women', 'kids'] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => { triggerHaptic(); handleGenderChange(g) }}
              className="flex-1 py-2.5 rounded-[14px] text-[13px] font-medium transition-all duration-200"
              style={
                gender === g
                  ? { background: THEMES[g].accentBg, color: THEMES[g].accentSoft }
                  : { color: '#6B635C' }
              }
            >
              {g === 'men' ? t.men : g === 'women' ? t.women : t.kids}
            </button>
          ))}
        </div>

        {/* Foot length card */}
        <div className="rounded-3xl bg-[#161311] border border-white/[0.04] p-5 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-medium text-[#F5F1EB]">{t.step1}</span>
            <div className="flex rounded-full bg-[#0F0D0B] p-0.5 border border-white/[0.04]">
              {(['cm', 'mm'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => { triggerHaptic(); setUnit(u) }}
                  className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={
                    unit === u
                      ? { background: theme.accent, color: theme.buttonText }
                      : { color: '#6B635C' }
                  }
                >
                  {u === 'cm' ? t.cm : t.mm}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-[#6B635C] mb-6">{t.step1Hint}</p>

          {/* Big value */}
          <div className="text-center mb-7" onClick={startEdit}>
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                className="w-44 text-center text-[52px] font-light bg-transparent outline-none border-b"
                style={{ color: theme.accentSoft, borderColor: `${theme.accent}66` }}
                inputMode="decimal"
              />
            ) : (
              <div className="cursor-pointer active:opacity-70 transition-opacity">
                <span className="text-[52px] font-light tracking-tight leading-none" style={{ color: theme.accentSoft }}>
                  {displayValue}
                </span>
                <span className="text-[18px] text-[#6B635C] ml-1.5 align-top">{displayUnit}</span>
              </div>
            )}
          </div>

          {/* Slider */}
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
                background: `linear-gradient(to right, ${theme.accent} 0%, ${theme.accent} ${pct}%, #2A241F ${pct}%, #2A241F 100%)`,
                borderRadius: 999,
                // @ts-ignore
                ['--thumb-color' as any]: theme.accentSoft,
                ['--thumb-border' as any]: theme.thumbBorder,
              }}
            />
            {/* Custom thumb color via CSS variables fallback */}
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

            <div className="flex justify-between mt-2.5 text-[10px] text-[#5C554E]">
              <span>{unit === 'cm' ? (range.min / 10).toFixed(1) : range.min} {displayUnit}</span>
              <span>{unit === 'cm' ? (range.max / 10).toFixed(1) : range.max} {displayUnit}</span>
            </div>
          </div>
        </div>

        {/* Result card */}
        <div
          className="rounded-3xl bg-[#161311] p-6 mb-4 text-center"
          style={{ border: `1px solid ${theme.accentBorder}` }}
        >
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <FlagEU />
            <FlagUA />
            <span className="text-[11px] text-[#8F867E] tracking-[0.12em] uppercase ml-1">
              EU / UKR
            </span>
          </div>

          <div className="text-[64px] font-light leading-none tracking-tight mb-1" style={{ color: theme.accentSoft }}>
            {formatSize(result.eu)}
          </div>
          <div className="text-[12px] text-[#6B635C] mb-5">{t.recommended}</div>

          <div className="flex items-center justify-center gap-5 pt-4 border-t border-white/[0.04]">
            <div className="flex items-center gap-1.5">
              <FlagUK />
              <span className="text-[12px] text-[#6B635C]">UK</span>
              <span className="text-[15px] font-medium text-[#F5F1EB] ml-0.5">{formatSize(result.uk)}</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <FlagUS />
              <span className="text-[12px] text-[#6B635C]">{usLabel}</span>
              <span className="text-[15px] font-medium text-[#F5F1EB] ml-0.5">{formatSize(result.us)}</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] text-[#6B635C]">CM</span>
              <span className="text-[15px] font-medium text-[#F5F1EB] ml-0.5">
                {result.cm.toFixed(1).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[#5C554E] leading-snug px-1 mb-3">{t.disclaimer}</p>

        <button
          onClick={() => { triggerHaptic(); setShowStandards((v) => !v) }}
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
              <div className="rounded-2xl bg-[#161311] border border-white/[0.04] p-4">
                <div className="text-[11px] font-medium tracking-wide uppercase mb-3" style={{ color: theme.accent }}>
                  {t.standardsTitle}
                </div>
                <div className="space-y-2 text-[12px] text-[#8F867E]">
                  <div className="flex gap-3">
                    <span className="w-[72px] shrink-0" style={{ color: theme.accent }}>EU / UKR</span>
                    <span>ISO 19407 · Paris Point</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-[72px] shrink-0" style={{ color: theme.accent }}>UK</span>
                    <span>ISO 19407 · Barleycorn</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-[72px] shrink-0" style={{ color: theme.accent }}>US</span>
                    <span>ISO 19407 · UK + offset</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-[72px] shrink-0" style={{ color: theme.accent }}>Mondopoint</span>
                    <span>ISO 9407 · мм стопы</span>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-[#5C554E] leading-snug">{t.standardsNote}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky save — raised above dock */}
      <div className="fixed bottom-[84px] left-0 right-0 px-4 z-40 pointer-events-none">
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

      {/* Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <BottomDock active="workspace" lang={lang} />
      </div>
    </motion.div>
  )
}
