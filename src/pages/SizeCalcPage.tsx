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

/* ---------- Flags (Упрощены стилистически, оставлены оригинальные) ---------- */
const FlagEU = () => (
  <svg width="14" height="10" viewBox="0 0 18 12" className="rounded-[2px] opacity-90 shrink-0">
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
  <svg width="14" height="10" viewBox="0 0 18 12" className="rounded-[2px] opacity-90 shrink-0">
    <rect width="18" height="6" fill="#0057B7" />
    <rect y="6" width="18" height="6" fill="#FFD700" />
  </svg>
)
const FlagUK = () => (
  <svg width="14" height="10" viewBox="0 0 18 12" className="rounded-[2px] opacity-90 shrink-0">
    <rect width="18" height="12" fill="#012169" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#fff" strokeWidth="2" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#C8102E" strokeWidth="1" />
    <path d="M9 0 V12 M0 6 H18" stroke="#fff" strokeWidth="3.2" />
    <path d="M9 0 V12 M0 6 H18" stroke="#C8102E" strokeWidth="1.6" />
  </svg>
)
const FlagUS = () => (
  <svg width="14" height="10" viewBox="0 0 18 12" className="rounded-[2px] opacity-90 shrink-0">
    <rect width="18" height="12" fill="#B22234" />
    <rect y="1.33" width="18" height="1.33" fill="#fff" />
    <rect y="4" width="18" height="1.33" fill="#fff" />
    <rect y="6.67" width="18" height="1.33" fill="#fff" />
    <rect y="9.33" width="18" height="1.33" fill="#fff" />
    <rect width="7.2" height="6.5" fill="#3C3B6E" />
  </svg>
)

/* ---------- Brand Theme: Cordwainer Craft ---------- */
const THEME = {
  bg: '#110F0E',          // Глубокий фон
  surface: '#1C1816',     // Карточки
  surfaceHover: '#2A231F',
  accent: '#D49A5C',      // Кожа / Тан
  accentMuted: 'rgba(212, 154, 92, 0.15)',
  textPrimary: '#F3EFEA',
  textSecondary: '#A3988E',
  border: 'rgba(255, 255, 255, 0.06)'
}

export function SizeCalcPage({ onBack, lang }: SizeCalcPageProps) {
  const [gender, setGender] = useState<Gender>('men')
  const [unit, setUnit] = useState<'cm' | 'mm'>('cm')
  const [footMm, setFootMm] = useState<number>(RANGES.men.default)
  const [showMeasureGuide, setShowMeasureGuide] = useState(false)
  const [showStandards, setShowStandards] = useState(false)
  
  // Упрощенный стейт ввода (по Нильсену - предсказуемость)
  const [isTyping, setIsTyping] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const range = RANGES[gender]
  const result = useMemo(() => convertShoeSize(footMm, gender), [footMm, gender])
  
  const displayValue = unit === 'cm' 
    ? (footMm / 10).toFixed(1).replace('.', ',') 
    : String(Math.round(footMm))
  
  const pct = ((footMm - range.min) / (range.max - range.min)) * 100

  const triggerHaptic = useCallback((style: 'light' | 'medium' = 'light') => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
      else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 15 : 30)
    } catch {}
  }, [])

  const handleGenderChange = useCallback((g: Gender) => {
    setGender(g)
    const r = RANGES[g]
    setFootMm((prev) => Math.min(r.max, Math.max(r.min, prev)))
    triggerHaptic('light')
  }, [triggerHaptic])

  const stepValue = useCallback((delta: number) => {
    setFootMm((prev) => {
      const next = Math.min(range.max, Math.max(range.min, prev + delta))
      if (next !== prev) triggerHaptic('light')
      return next
    })
  }, [range, triggerHaptic])

  const handleInputBlur = () => {
    const raw = parseFloat(inputValue.replace(',', '.'))
    if (!isNaN(raw)) {
      const mm = unit === 'cm' ? raw * 10 : raw
      setFootMm(Math.min(range.max, Math.max(range.min, mm)))
      triggerHaptic('medium')
    }
    setIsTyping(false)
  }

  const t = {
    ru: {
      title: 'Размер обуви',
      subtitle: 'Подбор по длине стопы',
      step1: 'Длина стопы',
      howToMeasureBtn: 'Как измерить?',
      measureGuide1: '1. Встаньте на лист бумаги в носках.',
      measureGuide2: '2. Обведите стопу, держа ручку строго вертикально.',
      measureGuide3: '3. Измерьте расстояние от пятки до самого длинного пальца.',
      measureTip: 'Рекомендуем измерять стопу вечером — ноги немного отекают.',
      recommended: 'Рекомендуемый размер',
      disclaimer: 'Размеры ориентировочные, зависят от колодки производителя.',
      howCalculated: 'Спецификация стандартов',
      save: 'Сохранить результат',
      men: 'Мужской',
      women: 'Женский',
      kids: 'Детский',
    },
    uk: {
      title: 'Розмір взуття',
      subtitle: 'Підбір за довжиною стопи',
      step1: 'Довжина стопи',
      howToMeasureBtn: 'Як виміряти?',
      measureGuide1: '1. Станьте на аркуш паперу у шкарпетках.',
      measureGuide2: '2. Обведіть стопу, тримаючи ручку суворо вертикально.',
      measureGuide3: '3. Виміряйте відстань від п’яти до найдовшого пальця.',
      measureTip: 'Рекомендуємо вимірювати стопу ввечері — ноги трохи набрякають.',
      recommended: 'Рекомендований розмір',
      disclaimer: 'Розміри орієнтовні, залежать від колодки виробника.',
      howCalculated: 'Специфікація стандартів',
      save: 'Зберегти результат',
      men: 'Чоловічий',
      women: 'Жіночий',
      kids: 'Дитячий',
    }
  }[lang]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex flex-col h-[100dvh] overflow-hidden"
      style={{ backgroundColor: THEME.bg, color: THEME.textPrimary }}
    >
      {/* Header - минималистичный (Спул: ничего лишнего) */}
      <header className="relative z-20 flex items-center justify-between px-5 pt-4 pb-2">
        <button
          onClick={() => { triggerHaptic(); onBack() }}
          className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition-all"
          style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}` }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="text-center">
          <h1 className="text-[17px] font-semibold tracking-tight">{t.title}</h1>
          <p className="text-[12px] opacity-60 mt-0.5">{t.subtitle}</p>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-28 scrollbar-hide flex flex-col gap-3 mt-3">
        
        {/* Segmented Control - Крупные зоны клика */}
        <div 
          className="flex p-1 rounded-2xl w-full"
          style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}` }}
        >
          {(['men', 'women', 'kids'] as Gender[]).map((g) => {
            const isActive = gender === g;
            return (
              <button
                key={g}
                onClick={() => handleGenderChange(g)}
                className="flex-1 py-3 text-[13px] font-medium rounded-xl transition-all duration-300"
                style={{
                  backgroundColor: isActive ? THEME.surfaceHover : 'transparent',
                  color: isActive ? THEME.accent : THEME.textSecondary,
                  boxShadow: isActive ? `0 2px 8px rgba(0,0,0,0.2)` : 'none'
                }}
              >
                {t[g]}
              </button>
            )
          })}
        </div>

        {/* Главная карточка измерения */}
        <section 
          className="rounded-[28px] p-5 flex flex-col"
          style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}` }}
        >
          <header className="flex items-center justify-between mb-6">
            <h2 className="text-[15px] font-medium">{t.step1}</h2>
            
            <div className="flex bg-black/40 rounded-full p-1" style={{ border: `1px solid ${THEME.border}` }}>
              {(['cm', 'mm'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => { triggerHaptic(); setUnit(u) }}
                  className="px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                  style={{
                    backgroundColor: unit === u ? THEME.accent : 'transparent',
                    color: unit === u ? '#110F0E' : THEME.textSecondary,
                  }}
                >
                  {u === 'cm' ? 'см' : 'мм'}
                </button>
              ))}
            </div>
          </header>

          {/* Интерактивный блок с цифрами */}
          <div className="flex items-center justify-between mb-8 px-2">
            <button
              onClick={() => stepValue(-1)}
              disabled={footMm <= range.min}
              className="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-all disabled:opacity-20"
              style={{ backgroundColor: THEME.surfaceHover, color: THEME.accent }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /></svg>
            </button>

            <div 
              className="relative flex flex-col items-center justify-center cursor-text"
              onClick={() => {
                setInputValue(displayValue);
                setIsTyping(true);
              }}
            >
              {isTyping ? (
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                  onBlur={handleInputBlur}
                  onKeyDown={(e) => e.key === 'Enter' && handleInputBlur()}
                  className="w-32 text-center text-[52px] font-light bg-transparent outline-none caret-[#D49A5C]"
                  style={{ color: THEME.accent }}
                />
              ) : (
                <motion.div 
                  className="text-[52px] font-light tracking-tight leading-none"
                  style={{ color: THEME.accent }}
                  whileTap={{ scale: 0.95 }}
                >
                  {displayValue}
                </motion.div>
              )}
            </div>

            <button
              onClick={() => stepValue(1)}
              disabled={footMm >= range.max}
              className="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-all disabled:opacity-20"
              style={{ backgroundColor: THEME.surfaceHover, color: THEME.accent }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>

          {/* Ползунок */}
          <div className="px-2 mb-2">
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={1}
              value={footMm}
              onChange={(e) => setFootMm(Number(e.target.value))}
              onPointerUp={() => triggerHaptic('light')}
              className="w-full h-2 rounded-full appearance-none bg-transparent cursor-pointer relative z-10"
              style={{
                background: `linear-gradient(to right, ${THEME.accent} 0%, ${THEME.accent} ${pct}%, ${THEME.bg} ${pct}%, ${THEME.bg} 100%)`,
              }}
            />
            {/* Стилизация thumb вынесена глобально или через Tailwind arbitrary, оставляем ваш подход */}
            <style>{`
              input[type=range]::-webkit-slider-thumb {
                appearance: none; w: 24px; h: 24px; border-radius: 50%;
                background: ${THEME.surface};
                border: 4px solid ${THEME.accent};
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              }
            `}</style>
          </div>
          
          <button
            onClick={() => { triggerHaptic(); setShowMeasureGuide(!showMeasureGuide) }}
            className="mt-6 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-medium transition-colors"
            style={{ backgroundColor: THEME.accentMuted, color: THEME.accent }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {t.howToMeasureBtn}
          </button>

          <AnimatePresence>
            {showMeasureGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-4"
              >
                <div className="space-y-2 text-[13px] leading-relaxed" style={{ color: THEME.textSecondary }}>
                  <p>{t.measureGuide1}</p>
                  <p>{t.measureGuide2}</p>
                  <p>{t.measureGuide3}</p>
                  <div className="mt-3 p-3 rounded-lg bg-black/30 border border-white/5 text-[12px] flex gap-2">
                    <span className="text-[16px]">💡</span>
                    <p>{t.measureTip}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Карточка результата (Визуальная иерархия усилена) */}
        <section 
          className="rounded-[28px] p-6 text-center relative overflow-hidden"
          style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.accent}40` }}
        >
          {/* Легкий градиент на фоне для акцента */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ background: `radial-gradient(circle at 50% 0%, ${THEME.accent} 0%, transparent 70%)` }} 
          />
          
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FlagEU /> <FlagUA />
              <span className="text-[12px] font-medium uppercase tracking-widest" style={{ color: THEME.textSecondary }}>EU / UKR</span>
            </div>

            <div className="text-[72px] font-light leading-none tracking-tighter mb-1" style={{ color: THEME.accent }}>
              {formatSize(result.eu)}
            </div>
            <div className="text-[13px] mb-6" style={{ color: THEME.textSecondary }}>{t.recommended}</div>

            <div className="grid grid-cols-3 gap-4 pt-5" style={{ borderTop: `1px solid ${THEME.border}` }}>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1"><FlagUK /> <span className="text-[11px]" style={{ color: THEME.textSecondary }}>UK</span></div>
                <span className="text-[16px] font-semibold">{formatSize(result.uk)}</span>
              </div>
              <div className="flex flex-col items-center gap-1" style={{ borderLeft: `1px solid ${THEME.border}`, borderRight: `1px solid ${THEME.border}` }}>
                <div className="flex items-center gap-1"><FlagUS /> <span className="text-[11px]" style={{ color: THEME.textSecondary }}>US {gender === 'kids' ? '' : gender === 'men' ? 'M' : 'W'}</span></div>
                <span className="text-[16px] font-semibold">{formatSize(result.us)}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1"><span className="text-[11px]" style={{ color: THEME.textSecondary }}>CM</span></div>
                <span className="text-[16px] font-semibold">{result.cm.toFixed(1).replace('.', ',')}</span>
              </div>
            </div>
          </div>
        </section>

        <p className="text-[12px] text-center px-4 mt-2 mb-6" style={{ color: THEME.textSecondary }}>
          {t.disclaimer}
        </p>
      </main>

      {/* Floating Action Button - всегда под рукой */}
      <div className="fixed bottom-6 left-0 right-0 px-5 z-40">
        <button
          onClick={() => triggerHaptic('medium')}
          className="w-full py-4 rounded-[18px] text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{
            backgroundColor: THEME.accent,
            color: '#110F0E',
            boxShadow: `0 8px 32px ${THEME.accent}30`,
          }}
        >
          {t.save}
        </button>
      </div>
    </motion.div>
  )
}
