// src/pages/WidthCalcPage.tsx

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { Lang } from '../App'
import { getWidthData, SIZE_LIMITS, type Gender, type WidthCategory } from '../lib/shoeWidths'

type WidthCalcPageProps = {
  onBack: () => void
  lang: Lang
}

const THEMES = {
  men: { accent: '#D4B895', accentSoft: '#F0DDC5', accentBg: 'rgba(198,164,122,0.15)' },
  women: { accent: '#F0B1C4', accentSoft: '#F9D8E1', accentBg: 'rgba(232,160,181,0.15)' },
  kids: { accent: '#90C8E4', accentSoft: '#C2E5F4', accentBg: 'rgba(126,184,212,0.15)' },
} as const

type InfoModalType = 'gostNum' | 'gostLet' | 'iso' | null
type Unit = 'mm' | 'in'

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
      gostNum: 'ГОСТ (Цифра)', gostLet: 'ГОСТ (Буква)',
      proHeader: 'Внутренний стандарт',
      proDesc: 'Цветовая кодировка колодок на производстве.',
      proModules: 'PRO: Конструктивные данные',
      // Новые переводы для таблицы параметров
      tableLength: 'Длина стопы', tableBall: 'Пучки (Обхват)', tableInstep: 'Прямой взъем', tableHeel: 'Косой обхват',
      modal: {
        gostNum: { title: 'Цифровой ГОСТ', text: 'Отечественный стандарт (ГОСТ 3927-88). Определяет шаг изменения обхвата в пучках.' },
        gostLet: { title: 'Буквенный ГОСТ', text: 'Альтернативная система маркировки полноты буквами (A, B, C, D, E).' },
        iso: { title: 'Система EU / ISO', text: 'Международный стандарт маркировки на базе штихмассовой системы.' }
      }
    },
    uk: {
      title: 'Повнота взуття', subtitle: 'Параметри та маркування',
      men: 'Чоловіки', women: 'Жінки', kids: 'Діти',
      step1: 'Розмір (EU)', step2: 'Повнота',
      cats: { narrow: 'Вузька', standard: 'Середня', wide: 'Широка', xwide: 'Дуже шир.' },
      gostNum: 'ДСТУ (Цифра)', gostLet: 'ДСТУ (Літера)',
      proHeader: 'Внутрішній стандарт',
      proDesc: 'Кольорове кодування колодок на виробництві.',
      proModules: 'PRO: Конструктивні дані',
      // Новые переводы для таблицы параметров
      tableLength: 'Довжина стопи', tableBall: 'Пучки (Обхват)', tableInstep: 'Прямий підйом', tableHeel: 'Косий обхват',
      modal: {
        gostNum: { title: 'Цифровий ДСТУ', text: 'Вітчизняний стандарт (ГОСТ 3927-88). Визначає крок зміни обхвату в пучках.' },
        gostLet: { title: 'Літерний ДСТУ', text: 'Альтернативна система маркування повноти літерами (A, B, C, D, E).' },
        iso: { title: 'Система EU / ISO', text: 'Міжнародний стандарт маркування на базі штихмасової системи.' }
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
      {/* 1. Header (Compact) */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-3 pb-2 bg-[#151210]/95 backdrop-blur">
        <button 
          onClick={() => { triggerHaptic(); onBack(); }} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1D1815] border border-white/10 active:scale-95 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="text-center">
          <h1 className="text-[15px] font-semibold tracking-wide">{t.title}</h1>
          <p className="text-[11px] text-[#8F867E]">{t.subtitle}</p>
        </div>
        <div className="w-10 h-10" /> {/* Spacer for centering */}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4 scrollbar-hide">
        
        {/* 2. INPUT CONFIGURATION CARD (Logical Grouping) */}
        <div className="bg-[#1D1815] rounded-3xl p-4 border border-white/5 shadow-sm space-y-5">
          
          {/* Gender Tabs */}
          <div className="flex p-1 rounded-2xl bg-[#151210] border border-white/5">
            {(['men', 'women', 'kids'] as Gender[]).map((g) => (
              <button
                key={g} onClick={() => handleGender(g)}
                className="flex-1 py-2.5 rounded-[12px] text-[13px] font-medium transition-all"
                style={gender === g ? { background: theme.accentBg, color: theme.accentSoft } : { color: '#8F867E' }}
              >
                {g === 'men' ? t.men : g === 'women' ? t.women : t.kids}
              </button>
            ))}
          </div>

          {/* Size Stepper */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-[#F5F1EB]">{t.step1}</span>
              <span className="text-[11px] text-[#8F867E]">({limits.min} - {limits.max})</span>
            </div>
            
            <div className="flex items-center gap-4 bg-[#151210] p-1.5 rounded-full border border-white/5">
              <button
                disabled={sizeEu <= limits.min}
                onClick={() => handleSizeChange(sizeEu - 1)}
                className="w-10 h-10 flex items-center justify-center rounded-full active:bg-white/10 disabled:opacity-30"
                style={{ color: theme.accentSoft }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
              </button>
              <div aria-live="polite" className="text-[28px] font-light w-12 text-center" style={{ color: theme.accentSoft }}>
                {sizeEu}
              </div>
              <button
                disabled={sizeEu >= limits.max}
                onClick={() => handleSizeChange(sizeEu + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-full active:bg-white/10 disabled:opacity-30"
                style={{ color: theme.accentSoft }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
          </div>

          {/* Width Category Grid */}
          <div>
            <span className="text-[13px] font-medium text-[#F5F1EB] block mb-2">{t.step2}</span>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(t.cats) as WidthCategory[]).map(cat => (
                <button
                  key={cat} onClick={() => { triggerHaptic(); setWidthCat(cat) }}
                  className="py-2.5 px-1 rounded-xl text-[12px] font-medium transition-all text-center leading-tight"
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

        {/* 3. PRIMARY RESULTS (US & UK) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#1D1815] border border-white/5 py-4 flex flex-col items-center justify-center">
            <span className="text-[11px] text-[#8F867E] mb-1 font-medium">US SIZE</span>
            <span className="text-[32px] font-medium leading-none" style={{ color: theme.accentSoft }}>{result.us}</span>
          </div>
          <div className="rounded-2xl bg-[#1D1815] border border-white/5 py-4 flex flex-col items-center justify-center">
            <span className="text-[11px] text-[#8F867E] mb-1 font-medium">UK SIZE</span>
            <span className="text-[32px] font-medium leading-none" style={{ color: theme.accentSoft }}>{result.uk}</span>
          </div>
        </div>

        {/* 4. PRO DATA (Progressive Disclosure) */}
        <div className="rounded-3xl bg-[#1D1815] border border-white/5 p-4">
           <button
            onClick={() => { triggerHaptic(); setShowPro(!showPro) }}
            className="flex items-center justify-between w-full text-[13px] font-medium"
            style={{ color: theme.accent }}
          >
            {t.proModules}
            <motion.div animate={{ rotate: showPro ? 180 : 0 }} transition={{ duration: 0.2 }}>
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
                <div className="pt-4 space-y-4">
                  {/* Standard codes */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'gostNum' as const, label: t.gostNum, val: result.gostNum },
                      { id: 'gostLet' as const, label: t.gostLet, val: result.gostLetter },
                      { id: 'iso' as const, label: 'EU / ISO', val: result.euCode }
                    ].map((item) => (
                      <button 
                        key={item.id} onClick={() => { triggerHaptic('light'); setActiveInfo(item.id); }}
                        className="bg-[#151210] p-2 rounded-xl border border-white/5 text-center active:scale-95 transition-transform"
                      >
                        <div className="text-[9px] text-[#8F867E] uppercase mb-1">{item.label}</div>
                        <div className="text-[18px] font-medium text-white">{item.val}</div>
                      </button>
                    ))}
                  </div>

                  {/* ВНИМАНИЕ: Новая таблица измерений */}
                  <div className="bg-[#151210] rounded-xl border border-white/5 overflow-hidden">
                    <div className="flex justify-between items-center p-3 border-b border-white/5">
                      <span className="text-[12px] font-medium text-[#8F867E]">Mondopoint / ГОСТ 3927-88</span>
                      {/* Единый тумблер управления для всей таблицы */}
                      <div className="flex bg-[#1D1815] rounded-md p-0.5">
                        {(['mm', 'in'] as Unit[]).map(u => (
                          <button 
                            key={u} onClick={() => { triggerHaptic('light'); setUnit(u) }}
                            className={`px-3 py-1 rounded text-[10px] font-medium transition-colors ${unit === u ? 'bg-white/10 text-white' : 'text-[#8F867E]'}`}
                          >{u}</button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-3 space-y-3">
                      {[
                        { label: t.tableLength, valMm: result.footLengthMm, valIn: result.footLengthIn },
                        { label: t.tableBall, valMm: result.girthMm, valIn: result.girthIn },
                        { label: t.tableInstep, valMm: result.instepMm, valIn: result.instepIn },
                        { label: t.tableHeel, valMm: result.heelMm, valIn: result.heelIn }
                      ].map((row, i) => (
                        <div key={i} className="flex justify-between items-end">
                          <span className="text-[13px] text-white/90">{row.label}</span>
                          <span className="text-[16px] font-medium" style={{ color: theme.accentSoft }}>
                            {unit === 'mm' ? row.valMm : row.valIn} <span className="text-[11px] font-normal opacity-50">{unit}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Color coding */}
                  <div className="flex items-center gap-3 p-3 bg-[#151210] rounded-xl border border-white/5">
                    <div className="w-8 h-10 rounded-t-full rounded-b-sm shadow-inner shrink-0" style={{ backgroundColor: result.color }} />
                    <div>
                      <div className="text-[12px] font-medium text-white mb-0.5">{t.proHeader}: {result.colorName[lang]}</div>
                      <div className="text-[11px] text-[#8F867E] leading-snug">{t.proDesc}</div>
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
              className="w-full max-w-[300px] bg-[#1D1815] border border-white/10 rounded-3xl p-6 shadow-2xl"
            >
              <h3 className="text-[16px] font-medium text-white mb-2">{t.modal[activeInfo].title}</h3>
              <p className="text-[13px] text-[#8F867E] leading-relaxed mb-6">{t.modal[activeInfo].text}</p>
              
              <button
                onClick={() => setActiveInfo(null)}
                className="w-full py-3 rounded-xl font-medium text-[14px]"
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
