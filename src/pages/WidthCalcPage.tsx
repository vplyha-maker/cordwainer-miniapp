import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { Lang } from '../App'
import { getWidthData, SIZE_LIMITS, type Gender, type WidthCategory } from '../lib/shoeWidths'

type WidthCalcPageProps = {
  onBack: () => void
  lang: Lang
}

// Насыщенные DCI-P3 цвета, контрастные как в светлой, так и в темной теме
const THEMES = {
  men: { 
    accent: '#B46513', // Мужской: Золотисто-коричневый
    bg: 'color-mix(in srgb, #B46513 15%, var(--color-surface))', 
    text: '#B46513', 
    border: 'color-mix(in srgb, #B46513 35%, transparent)' 
  },
  women: { 
    accent: '#BE185D', // Женский: Глубокий малиновый
    bg: 'color-mix(in srgb, #BE185D 15%, var(--color-surface))', 
    text: '#BE185D', 
    border: 'color-mix(in srgb, #BE185D 35%, transparent)' 
  },
  kids: { 
    accent: '#0369A1', // Детский: Глубокий синий
    bg: 'color-mix(in srgb, #0369A1 15%, var(--color-surface))', 
    text: '#0369A1', 
    border: 'color-mix(in srgb, #0369A1 35%, transparent)' 
  },
} as const

type InfoModalType = 'gostNum' | 'iso' | null
type Unit = 'mm' | 'in'

// Анимируется только 1 раз при открытии PRO меню, больше не перерисовывается
const AnimatedIcon = ({ type, color }: { type: 'length' | 'ball' | 'instep' | 'heel', color: string }) => {
  const prefersReducedMotion = useReducedMotion()
  
  const paths = {
    length: "M3 12h18M5 9v6M19 9v6",
    ball: "M12 5c-4.4 0-8 3.1-8 7s3.6 7 8 7 8-3.1 8-7",
    instep: "M4 16c0-6 4-10 8-10s8 4 8 10",
    heel: "M18 6L6 18M7 7l-2 2 2 2"
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 mr-2" style={{ color }}>
      <motion.path
        d={paths[type]}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={prefersReducedMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </svg>
  )
}

export function WidthCalcPage({ onBack, lang }: WidthCalcPageProps) {
  const prefersReducedMotion = useReducedMotion()
  
  const [gender, setGender] = useState<Gender>(() => (localStorage.getItem('wc_gender') as Gender) || 'men')
  const [sizeEu, setSizeEu] = useState<number>(() => Number(localStorage.getItem('wc_size')) || 42)
  const [widthCat, setWidthCat] = useState<WidthCategory>(() => (localStorage.getItem('wc_width') as WidthCategory) || 'standard')
  const [unit, setUnit] = useState<Unit>(() => (localStorage.getItem('wc_unit') as Unit) || 'mm')
  
  const [showPro, setShowPro] = useState(false)
  const [activeInfo, setActiveInfo] = useState<InfoModalType>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const theme = THEMES[gender]
  const limits = SIZE_LIMITS[gender]

  useEffect(() => {
    localStorage.setItem('wc_gender', gender)
    localStorage.setItem('wc_size', String(sizeEu))
    localStorage.setItem('wc_width', widthCat)
    localStorage.setItem('wc_unit', unit)
  }, [gender, sizeEu, widthCat, unit])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeInfo) setActiveInfo(null)
    }
    if (activeInfo) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeInfo])

  const result = useMemo(() => getWidthData(gender, sizeEu, widthCat), [gender, sizeEu, widthCat])

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
      else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 15 : (style === 'heavy' ? 40 : 25))
    } catch {}
  }

  const handleGender = (g: Gender) => {
    if (gender === g) return
    triggerHaptic('medium')
    setGender(g)
    const newLimits = SIZE_LIMITS[g]
    if (sizeEu < newLimits.min || sizeEu > newLimits.max) {
      setSizeEu(g === 'men' ? 42 : g === 'women' ? 38 : 28)
    }
  }

  const handleSizeChange = (newSize: number) => {
    const clamped = Math.max(limits.min, Math.min(limits.max, newSize))
    if (clamped !== sizeEu) {
      triggerHaptic('light')
      setSizeEu(clamped)
    } else if (newSize !== sizeEu) {
      triggerHaptic('heavy')
    }
  }

  const t = {
    ru: {
      title: 'Полнота обуви', subtitle: 'Параметры и маркировка',
      men: 'Мужчины', women: 'Женщины', kids: 'Дети',
      step1: 'Размер (EU)', step2: 'Полнота',
      cats: { narrow: 'Узкая', standard: 'Средняя', wide: 'Широкая', xwide: 'Очень шир.' },
      proModules: 'PRO: Конструктивные данные',
      gostNum: 'ГОСТ RU (цифра)', gostLet: 'ГОСТ RU (буква)', iso: 'EU / ISO',
      mondopointLabel: 'Mondopoint (мм/дюймы)',
      tableLength: 'Длина стопы', tableBall: 'Пучки (Обхват)', tableInstep: 'Прямой взъем', tableHeel: 'Косой обхват',
      understood: 'Понятно',
      modal: {
        gostNum: { title: 'Стандарты ГОСТ RU', text: 'ГОСТ 3927-88 (цифровая и буквенная системы). Определяет базовые обхваты колодки.' },
        iso: { title: 'Стандарт ISO', text: 'Международный стандарт ISO / EU для маркировки параметров обуви и колодок.' }
      }
    },
    uk: {
      title: 'Повнота взуття', subtitle: 'Параметри та маркування',
      men: 'Чоловіки', women: 'Жінки', kids: 'Діти',
      step1: 'Розмір (EU)', step2: 'Повнота',
      cats: { narrow: 'Вузька', standard: 'Середня', wide: 'Широка', xwide: 'Дуже шир.' },
      proModules: 'PRO: Конструктивні дані',
      gostNum: 'ДСТУ UKR (цифра)', gostLet: 'ДСТУ UKR (буква)', iso: 'EU / ISO',
      mondopointLabel: 'Mondopoint (мм/дюйми)',
      tableLength: 'Довжина стопи', tableBall: 'Пучки (Обхват)', tableInstep: 'Прямий підйом', tableHeel: 'Косий обхват',
      understood: 'Зрозуміло',
      modal: {
        gostNum: { title: 'Стандарти ДСТУ UKR', text: 'ДСТУ 3927-88 (цифрова та літерна системи). Визначає базові обхвати колодки.' },
        iso: { title: 'Стандарт ISO', text: 'Міжнародний стандарт ISO / EU для маркування параметрів взуття та колодок.' }
      }
    },
    de: {
      title: 'Schuhweite', subtitle: 'Parameter und Markierungen',
      men: 'Herren', women: 'Damen', kids: 'Kinder',
      step1: 'Größe (EU)', step2: 'Weite',
      cats: { narrow: 'Schmal', standard: 'Standard', wide: 'Weit', xwide: 'Sehr weit' },
      proModules: 'PRO: Konstruktionsdaten',
      gostNum: 'RU-Norm (Zahl)', gostLet: 'RU-Norm (Buchst.)',
      iso: 'EU / ISO',
      mondopointLabel: 'Mondopoint (mm/Zoll)',
      tableLength: 'Fußlänge', tableBall: 'Ballenumfang', tableInstep: 'Ristumfang', tableHeel: 'Fersenumfang',
      understood: 'Verstanden',
      modal: {
        gostNum: { title: 'Osteuropäische Norm', text: 'Der Standard 3927-88 (GOST/DSTU in Russland und der Ukraine) nutzt ein Zahlen- und Buchstabensystem zur Definition der grundlegenden Leistenumfänge.' },
        iso: { title: 'ISO Standard', text: 'Internationaler ISO / EU Standard für die Markierung von Schuh- und Leistenparametern.' }
      }
    }
  }[lang]

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="relative flex flex-col h-[100dvh] overflow-hidden bg-[var(--color-bg)] text-[var(--color-ink)]"
    >
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-4 md:px-6 pt-5 pb-3 bg-[var(--color-bg)] border-b border-[var(--color-border)] shadow-sm">
        <button 
          onClick={() => { triggerHaptic(); onBack(); }} 
          className="w-11 h-11 flex items-center justify-center rounded-full active:scale-90 transition-transform bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm text-[var(--color-ink)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="text-center">
          <h1 className="text-[17px] font-bold tracking-wide">{t.title}</h1>
          <p className="text-[12px] font-medium text-[var(--color-muted)] mt-0.5">
            {t.subtitle}
          </p>
        </div>
        <div className="w-11 h-11" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 scrollbar-hide">
        
        {/* Main controls card */}
        <div className="rounded-[24px] p-4 md:p-5 space-y-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          
          {/* Gender segmented */}
          <div className="flex p-1.5 rounded-[18px] bg-[var(--color-bg)] border border-[var(--color-border)] shadow-inner">
            {(['men', 'women', 'kids'] as Gender[]).map((g) => (
              <button
                key={g} onClick={() => handleGender(g)}
                className="flex-1 py-2.5 rounded-[14px] text-[14px] font-bold transition-colors"
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

          {/* Size stepper */}
          <div className="flex items-center justify-between px-1">
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-[var(--color-ink)]">
                {t.step1}
              </span>
              <span className="text-[11px] font-medium text-[var(--color-muted)] mt-0.5">
                ({limits.min} - {limits.max})
              </span>
            </div>
            
            <div className="flex items-center gap-4 p-1.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] shadow-inner">
              <button
                disabled={sizeEu <= limits.min} onClick={() => handleSizeChange(sizeEu - 1)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm active:scale-95 transition-transform disabled:opacity-30"
                style={{ color: theme.text }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
              </button>
              {/* Значение меняется моментально, без анимаций */}
              <div aria-live="polite" className="text-[28px] font-bold w-12 text-center tabular-nums" style={{ color: theme.text }}>
                {sizeEu}
              </div>
              <button
                disabled={sizeEu >= limits.max} onClick={() => handleSizeChange(sizeEu + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm active:scale-95 transition-transform disabled:opacity-30"
                style={{ color: theme.text }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
          </div>

          {/* Width categories */}
          <div className="pt-2 border-t border-[var(--color-border)]">
            <span className="text-[14px] font-bold block mb-3 px-1 text-[var(--color-ink)]">
              {t.step2}
            </span>
            <div className="grid grid-cols-4 gap-1.5 md:gap-2">
              {(Object.keys(t.cats) as WidthCategory[]).map(cat => {
                const isSelected = widthCat === cat
                return (
                  <button
                    key={cat} 
                    onClick={() => { triggerHaptic(); setWidthCat(cat) }}
                    className={`py-2 px-1 rounded-[14px] text-[11px] font-bold transition-colors flex items-center justify-center break-words whitespace-normal leading-[1.1] min-h-[48px] border ${
                      isSelected 
                        ? 'shadow-sm' 
                        : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
                    }`}
                    style={isSelected 
                      ? { 
                          background: `color-mix(in srgb, ${result.color} 15%, var(--color-surface))`, 
                          color: result.color, 
                          borderColor: `color-mix(in srgb, ${result.color} 40%, transparent)` 
                        }
                      : { background: 'var(--color-bg)', color: 'var(--color-muted)' }
                    }
                  >
                    {t.cats[cat]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* US / UK result cards - Убраны анимации (motion.span), теперь данные подставляются мгновенно */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[20px] py-4 flex flex-col items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <span className="text-[11px] mb-1 font-bold tracking-wide text-[var(--color-muted)]">
              US SIZE
            </span>
            <span className="text-[36px] font-bold leading-none text-[var(--color-ink)] tabular-nums">
              {result.us}
            </span>
          </div>
          <div className="rounded-[20px] py-4 flex flex-col items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <span className="text-[11px] mb-1 font-bold tracking-wide text-[var(--color-muted)]">
              UK SIZE
            </span>
            <span className="text-[36px] font-bold leading-none text-[var(--color-ink)] tabular-nums">
              {result.uk}
            </span>
          </div>
        </div>

        {/* PRO DATA */}
        <div className="rounded-[24px] p-4 md:p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
           <button
            onClick={() => { triggerHaptic(); setShowPro(!showPro) }}
            className="flex items-center justify-between w-full group py-1"
          >
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-bold text-[var(--color-ink)]">
                {t.proModules}
              </span>
              <div 
                className="w-3 h-3 rounded-full shadow-sm transition-colors" 
                style={{ backgroundColor: result.color, border: '1px solid var(--color-border)' }} 
                title={(result.colorName as any)[lang] || result.colorName.ru} 
              />
            </div>
            <motion.div
              animate={{ rotate: showPro ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-[var(--color-muted)]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7" /></svg>
            </motion.div>
          </button>

          <AnimatePresence>
            {showPro && (
              <motion.div
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }} 
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }} 
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-3">
                  
                  {/* Standards Grid - Убраны анимации (motion.span) */}
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: 'gostNum' as const, label: t.gostNum, value: result.gostNum },
                      { key: 'gostNum' as const, label: t.gostLet, value: result.gostLetter },
                      { key: 'iso' as const, label: t.iso, value: result.euCode },
                    ]).map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveInfo(item.key)}
                        className="rounded-[16px] p-2.5 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform bg-[var(--color-bg)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-muted)]"
                      >
                        <span className="text-[9.5px] mb-1.5 font-bold text-center leading-tight break-words whitespace-normal text-[var(--color-muted)]">
                          {item.label}
                        </span>
                        <span className="text-[16px] font-bold leading-none text-[var(--color-ink)] tabular-nums">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Table Details - Убраны анимации значений */}
                  <div className="rounded-[20px] p-4 bg-[var(--color-bg)] border border-[var(--color-border)] shadow-sm">
                    <div className="flex justify-between items-center pb-3 mb-3 border-b border-[var(--color-border)]">
                      <span className="text-[12px] font-bold text-[var(--color-muted)]">
                        {t.mondopointLabel}
                      </span>
                      <div className="flex rounded-[10px] p-1 bg-[var(--color-surface)] border border-[var(--color-border)]">
                        {(['mm', 'in'] as Unit[]).map(u => (
                          <button 
                            key={u}
                            onClick={() => { triggerHaptic('light'); setUnit(u) }}
                            className={`px-3 py-1 rounded-[8px] text-[11px] font-bold transition-colors ${
                              unit === u
                                ? 'bg-[var(--color-ink)] text-[var(--color-bg)] shadow-sm'
                                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                            }`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {[
                        { id: 'length' as const, label: t.tableLength, valMm: result.footLengthMm, valIn: result.footLengthIn },
                        { id: 'ball' as const, label: t.tableBall, valMm: result.girthMm, valIn: result.girthIn },
                        { id: 'instep' as const, label: t.tableInstep, valMm: result.instepMm, valIn: result.instepIn },
                        { id: 'heel' as const, label: t.tableHeel, valMm: result.heelMm, valIn: result.heelIn }
                      ].map((row) => (
                        <div key={row.id} className="flex justify-between items-center">
                          <div className="flex items-center">
                            {/* Убран animKey, чтобы иконка рисовалась 1 раз и не дергалась при смене размера */}
                            <AnimatedIcon type={row.id} color={theme.text} />
                            <span className="text-[13px] font-medium text-[var(--color-ink)]">
                              {row.label}
                            </span>
                          </div>
                          <span className="text-[15px] font-bold text-[var(--color-ink)] tabular-nums">
                            {unit === 'mm' ? row.valMm : row.valIn}{' '}
                            <span className="text-[11px] font-medium text-[var(--color-muted)] ml-0.5">{unit}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {activeInfo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={() => setActiveInfo(null)}
          >
            <motion.div
              ref={modalRef}
              initial={prefersReducedMotion ? { scale: 1 } : { scale: 0.95, y: 10 }} 
              animate={{ scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { scale: 1 } : { scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[300px] rounded-[24px] p-6 shadow-2xl bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <h3 className="text-[16px] font-bold mb-2.5 text-[var(--color-ink)]">
                {t.modal[activeInfo].title}
              </h3>
              <p className="text-[13px] font-medium leading-relaxed mb-6 text-[var(--color-muted)]">
                {t.modal[activeInfo].text}
              </p>
              
              <button
                onClick={() => setActiveInfo(null)}
                className="w-full py-3.5 rounded-[16px] font-bold text-[14px] active:scale-95 transition-transform"
                style={{ backgroundColor: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
              >
                {t.understood}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </motion.div>
  )
}
