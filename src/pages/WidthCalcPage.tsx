// src/pages/WidthCalcPage.tsx

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { Lang } from '../App'
import { getWidthData, SIZE_LIMITS, type Gender, type WidthCategory } from '../lib/shoeWidths'

type WidthCalcPageProps = {
  onBack: () => void
  lang: Lang
}

// Обновленные, более насыщенные цвета для women и kids
const THEMES = {
  men: { accent: '#D4B895', accentSoft: '#F0DDC5', accentBg: 'rgba(198,164,122,0.15)' },
  women: { accent: '#EC4899', accentSoft: '#F472B6', accentBg: 'rgba(236,72,153,0.15)' }, // Сочный розовый
  kids: { accent: '#0EA5E9', accentSoft: '#38BDF8', accentBg: 'rgba(14,165,233,0.15)' },  // Насыщенный голубой
} as const

type InfoModalType = 'gostNum' | 'iso' | null
type Unit = 'mm' | 'in'

// Инженерные SVG иконки с принудительной анимацией при изменении данных (animKey)
const AnimatedIcon = ({ type, color, animKey }: { type: 'length' | 'ball' | 'instep' | 'heel', color: string, animKey: string | number }) => {
  const prefersReducedMotion = useReducedMotion()
  
  const paths = {
    length: "M3 12h18M5 9v6M19 9v6",
    ball: "M12 5c-4.4 0-8 3.1-8 7s3.6 7 8 7 8-3.1 8-7",
    instep: "M4 16c0-6 4-10 8-10s8 4 8 10",
    heel: "M18 6L6 18M7 7l-2 2 2 2"
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 mr-2 opacity-80" style={{ color }}>
      <motion.path
        key={animKey}
        d={paths[type]}
        stroke="currentColor"
        strokeWidth="1.5"
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
      gostNum: 'ГОСТ (Цифра)', gostLet: 'Альт. система', iso: 'ISO / EU',
      tableLength: 'Длина стопы', tableBall: 'Пучки (Обхват)', tableInstep: 'Прямой взъем', tableHeel: 'Косой обхват',
      modal: {
        gostNum: { title: 'Стандарты ГОСТ', text: 'ГОСТ 3927-88 (цифровая система). Определяет базовые обхваты колодки.' },
        iso: { title: 'Альтернативные системы', text: 'Буквенная система (A, B, C, D, E) и международный стандарт ISO.' }
      }
    },
    uk: {
      title: 'Повнота взуття', subtitle: 'Параметри та маркування',
      men: 'Чоловіки', women: 'Жінки', kids: 'Діти',
      step1: 'Розмір (EU)', step2: 'Повнота',
      cats: { narrow: 'Вузька', standard: 'Середня', wide: 'Широка', xwide: 'Дуже шир.' },
      proModules: 'PRO: Конструктивні дані',
      gostNum: 'ДСТУ (Цифра)', gostLet: 'Альт. система', iso: 'ISO / EU',
      tableLength: 'Довжина стопи', tableBall: 'Пучки (Обхват)', tableInstep: 'Прямий підйом', tableHeel: 'Косий обхват',
      modal: {
        gostNum: { title: 'Стандарти ДСТУ', text: 'ДСТУ 3927-88 (цифрова система). Визначає базові обхвати колодки.' },
        iso: { title: 'Альтернативні системи', text: 'Літерна система (A, B, C, D, E) та міжнародний стандарт ISO.' }
      }
    }
  }[lang]

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="relative flex flex-col h-[100dvh] bg-[#151210] text-[#F5F1EB] overflow-hidden"
    >
      <div className="relative z-20 flex items-center justify-between px-4 py-2 bg-[#151210]/95 backdrop-blur">
        <button 
          onClick={() => { triggerHaptic(); onBack(); }} 
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1D1815] border border-white/10 active:scale-95 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="text-center">
          <h1 className="text-[14px] font-semibold tracking-wide">{t.title}</h1>
          <p className="text-[10px] text-[#8F867E] leading-none mt-0.5">{t.subtitle}</p>
        </div>
        <div className="w-9 h-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 scrollbar-hide">
        
        {/* INPUT CARD */}
        <div className="bg-[#1D1815] rounded-3xl p-3.5 border border-white/5 space-y-4">
          <div className="flex p-1 rounded-2xl bg-[#151210] border border-white/5">
            {(['men', 'women', 'kids'] as Gender[]).map((g) => (
              <button
                key={g} onClick={() => handleGender(g)}
                className="flex-1 py-1.5 rounded-[12px] text-[12px] font-medium transition-all"
                style={gender === g ? { background: theme.accentBg, color: theme.accentSoft } : { color: '#8F867E' }}
              >
                {g === 'men' ? t.men : g === 'women' ? t.women : t.kids}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-[#F5F1EB]">{t.step1}</span>
              <span className="text-[10px] text-[#8F867E]">({limits.min} - {limits.max})</span>
            </div>
            <div className="flex items-center gap-3 bg-[#151210] p-1.5 rounded-full border border-white/5">
              <button
                disabled={sizeEu <= limits.min} onClick={() => handleSizeChange(sizeEu - 1)}
                className="w-9 h-9 flex items-center justify-center rounded-full active:bg-white/10 disabled:opacity-30"
                style={{ color: theme.accentSoft }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
              </button>
              <div aria-live="polite" className="text-[24px] font-light w-10 text-center" style={{ color: theme.accentSoft }}>
                {sizeEu}
              </div>
              <button
                disabled={sizeEu >= limits.max} onClick={() => handleSizeChange(sizeEu + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-full active:bg-white/10 disabled:opacity-30"
                style={{ color: theme.accentSoft }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
          </div>

          <div>
            <span className="text-[13px] font-medium text-[#F5F1EB] block mb-2 px-1">{t.step2}</span>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(t.cats) as WidthCategory[]).map(cat => (
                <button
                  key={cat} onClick={() => { triggerHaptic(); setWidthCat(cat) }}
                  className="py-2 px-1 rounded-xl text-[11px] font-medium transition-all text-center leading-tight"
                  style={widthCat === cat 
                    ? { background: theme.accentBg, color: theme.accentSoft, border: `1px solid ${theme.accent}40` }
                    : { background: '#151210', color: '#8F867E', border: '1px solid transparent' }}
                >
                  {t.cats[cat]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PRIMARY RESULTS */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-[#1D1815] border border-white/5 py-3 flex flex-col items-center justify-center">
            <span className="text-[10px] text-[#8F867E] mb-0.5 font-medium">US SIZE</span>
            <span className="text-[28px] font-medium leading-none" style={{ color: theme.accentSoft }}>{result.us}</span>
          </div>
          <div className="rounded-2xl bg-[#1D1815] border border-white/5 py-3 flex flex-col items-center justify-center">
            <span className="text-[10px] text-[#8F867E] mb-0.5 font-medium">UK SIZE</span>
            <span className="text-[28px] font-medium leading-none" style={{ color: theme.accentSoft }}>{result.uk}</span>
          </div>
        </div>

        {/* PRO DATA */}
        <div className="rounded-3xl bg-[#1D1815] border border-white/5 p-3.5">
           <button
            onClick={() => { triggerHaptic(); setShowPro(!showPro) }}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium" style={{ color: theme.accent }}>{t.proModules}</span>
              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: result.color }} title={result.colorName[lang]} />
            </div>
            <motion.div animate={{ rotate: showPro ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ color: theme.accent }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7" /></svg>
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
                <div className="pt-3 space-y-3">
                  
                  {/* КОМПАКТНЫЙ БЛОК МАРКИРОВОК (Акцент на альтернативной системе) */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <div onClick={() => setActiveInfo('gostNum')} className="bg-[#151210] rounded-xl p-2 flex flex-col items-center justify-center border border-white/5 cursor-pointer active:scale-95 transition-transform">
                      <span className="text-[10px] text-[#8F867E] mb-1 text-center">{t.gostNum}</span>
                      <span className="text-[16px] font-medium text-white leading-none">{result.gostNum}</span>
                    </div>
                    {/* Альтернативная система теперь выделена визуально */}
                    <div onClick={() => setActiveInfo('iso')} className="bg-[#151210] rounded-xl p-2 flex flex-col items-center justify-center border border-white/5 cursor-pointer active:scale-95 transition-transform" style={{ borderColor: `${theme.accent}30`, backgroundColor: theme.accentBg }}>
                      <span className="text-[10px] mb-1 text-center" style={{ color: theme.accentSoft }}>{t.gostLet}</span>
                      <span className="text-[18px] font-bold leading-none" style={{ color: theme.accentSoft }}>{result.euCode}</span>
                    </div>
                    <div onClick={() => setActiveInfo('iso')} className="bg-[#151210] rounded-xl p-2 flex flex-col items-center justify-center border border-white/5 cursor-pointer active:scale-95 transition-transform">
                      <span className="text-[10px] text-[#8F867E] mb-1 text-center">ГОСТ (Буква)</span>
                      <span className="text-[16px] font-medium text-white leading-none">{result.gostLetter}</span>
                    </div>
                  </div>

                  {/* ТАБЛИЦА ФИЗИЧЕСКИХ ПАРАМЕТРОВ */}
                  <div className="bg-[#151210] rounded-xl border border-white/5 p-2.5">
                    <div className="flex justify-between items-center pb-2 mb-2 border-b border-white/5">
                      <span className="text-[11px] font-medium text-[#8F867E]">Mondopoint (мм/дюймы)</span>
                      <div className="flex bg-[#1D1815] rounded-md p-0.5">
                        {(['mm', 'in'] as Unit[]).map(u => (
                          <button 
                            key={u} onClick={() => { triggerHaptic('light'); setUnit(u) }}
                            className={`px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors ${unit === u ? 'bg-white/10 text-white' : 'text-[#8F867E]'}`}
                          >{u}</button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {[
                        { id: 'length' as const, label: t.tableLength, valMm: result.footLengthMm, valIn: result.footLengthIn },
                        { id: 'ball' as const, label: t.tableBall, valMm: result.girthMm, valIn: result.girthIn },
                        { id: 'instep' as const, label: t.tableInstep, valMm: result.instepMm, valIn: result.instepIn },
                        { id: 'heel' as const, label: t.tableHeel, valMm: result.heelMm, valIn: result.heelIn }
                      ].map((row) => (
                        <div key={row.id} className="flex justify-between items-center">
                          <div className="flex items-center">
                            <AnimatedIcon type={row.id} color={theme.accentSoft} animKey={`${row.valMm}-${unit}`} />
                            <span className="text-[12px] text-white/90">{row.label}</span>
                          </div>
                          <span className="text-[14px] font-medium" style={{ color: theme.accentSoft }}>
                            {unit === 'mm' ? row.valMm : row.valIn} <span className="text-[10px] font-normal opacity-50">{unit}</span>
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

      {/* Info Modal */}
      <AnimatePresence>
        {activeInfo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setActiveInfo(null)}
          >
            <motion.div
              ref={modalRef}
              initial={prefersReducedMotion ? { scale: 1 } : { scale: 0.95, y: 10 }} 
              animate={{ scale: 1, y: 0 }} exit={prefersReducedMotion ? { scale: 1 } : { scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[280px] bg-[#1D1815] border border-white/10 rounded-3xl p-5 shadow-2xl"
            >
              <h3 className="text-[15px] font-medium text-white mb-2">{t.modal[activeInfo].title}</h3>
              <p className="text-[12px] text-[#8F867E] leading-relaxed mb-5">{t.modal[activeInfo].text}</p>
              
              <button
                onClick={() => setActiveInfo(null)}
                className="w-full py-2.5 rounded-xl font-medium text-[13px]"
                style={{ backgroundColor: theme.accentBg, color: theme.accentSoft }}
              >
                {lang === 'ru' ? 'Понятно' : 'Зрозуміло'}
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
