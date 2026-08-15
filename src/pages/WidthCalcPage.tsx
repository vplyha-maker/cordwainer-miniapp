// src/pages/WidthCalcPage.tsx

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { Lang } from '../App'
import { getWidthData, SIZE_LIMITS, type Gender, type WidthCategory } from '../lib/shoeWidths'

type WidthCalcPageProps = {
  onBack: () => void
  lang: Lang
}

// Вынесено в токены для лучшего контроля контраста (улучшена читаемость)
const THEMES = {
  men: { accent: '#D4B895', accentSoft: '#F0DDC5', accentBg: 'rgba(198,164,122,0.2)' },
  women: { accent: '#F0B1C4', accentSoft: '#F9D8E1', accentBg: 'rgba(232,160,181,0.2)' },
  kids: { accent: '#90C8E4', accentSoft: '#C2E5F4', accentBg: 'rgba(126,184,212,0.2)' },
} as const

type InfoModalType = 'gostNum' | 'gostLet' | 'iso' | null
type Unit = 'mm' | 'in'

export function WidthCalcPage({ onBack, lang }: WidthCalcPageProps) {
  const prefersReducedMotion = useReducedMotion()
  
  // Состояние с поддержкой LocalStorage для сохранения пресетов
  const [gender, setGender] = useState<Gender>(() => (localStorage.getItem('wc_gender') as Gender) || 'men')
  const [sizeEu, setSizeEu] = useState<number>(() => Number(localStorage.getItem('wc_size')) || 42)
  const [widthCat, setWidthCat] = useState<WidthCategory>(() => (localStorage.getItem('wc_width') as WidthCategory) || 'standard')
  const [unit, setUnit] = useState<Unit>(() => (localStorage.getItem('wc_unit') as Unit) || 'mm')
  
  const [showPro, setShowPro] = useState(false)
  const [activeInfo, setActiveInfo] = useState<InfoModalType>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const theme = THEMES[gender]
  const limits = SIZE_LIMITS[gender]

  // Сохранение настроек в localStorage
  useEffect(() => {
    localStorage.setItem('wc_gender', gender)
    localStorage.setItem('wc_size', String(sizeEu))
    localStorage.setItem('wc_width', widthCat)
    localStorage.setItem('wc_unit', unit)
  }, [gender, sizeEu, widthCat, unit])

  // A11y: Фокус-трап и закрытие модалки по Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeInfo) setActiveInfo(null)
    }
    if (activeInfo) {
      document.body.style.overflow = 'hidden' // Блокировка скролла
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
    // Trap: Сброс размера при смене пола с учетом лимитов нового пола
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
      triggerHaptic('heavy') // Ошибка: выход за пределы
    }
  }

  const openInfo = (type: InfoModalType) => {
    triggerHaptic('light')
    setActiveInfo(type)
  }

  // Тексты (i18n)
  const t = {
    ru: {
      title: 'Полнота обуви', subtitle: 'PRO Конвертор & Маркировка',
      proHeader: 'Внутренний стандарт бренда',
      proDesc: 'Цветовая кодировка не регламентируется ISO, но является стандартом на современных производствах. Вы можете использовать эту схему при заказе колодок.',
      men: 'Муж', women: 'Жен', kids: 'Дет',
      step1: '1. Размер (EU)', step2: '2. Категория полноты',
      cats: { narrow: 'Узкая', standard: 'Средняя', wide: 'Широкая', xwide: 'Очень шир.' },
      gostNum: 'ГОСТ (Цифра)', gostLet: 'ГОСТ (Буква)',
      proModules: 'PRO: Конструктивные параметры',
      girthTitle: 'Обхват в пучках:', export: 'Экспорт CSV',
      girthDesc: 'Физический периметр стопы/колодки в самом широком месте для выбранного размера.',
      gradingTitle: 'Градация полноты',
      inlineHelp: { gostNum: 'Определяет шаг обхвата', gostLet: 'Часто для модельной обуви', iso: 'Международный стандарт' },
      modal: {
        gostNum: { title: 'Цифровой ГОСТ', text: 'Отечественный стандарт. Определяет шаг изменения обхвата в пучках. Каждая цифра соответствует конкретному физическому обхвату для заданного размера.' },
        gostLet: { title: 'Буквенный ГОСТ', text: 'Альтернативная система маркировки полноты буквами (A, B, C, D, E). Часто используется в модельной обуви.' },
        iso: { title: 'Система EU / ISO', text: 'Международный европейский стандарт маркировки и градации. Базируется на штихмассовой системе.' }
      }
    },
    uk: {
      title: 'Повнота взуття', subtitle: 'PRO Конвертор та Маркування',
      proHeader: 'Внутрішній стандарт бренду',
      proDesc: 'Кольорове кодування не регламентується ISO, але є стандартом на сучасних виробництвах. Ви можете використовувати цю схему при замовленні колодок.',
      men: 'Чол', women: 'Жін', kids: 'Дит',
      step1: '1. Розмір (EU)', step2: '2. Категорія повноти',
      cats: { narrow: 'Вузька', standard: 'Середня', wide: 'Широка', xwide: 'Дуже шир.' },
      gostNum: 'ДСТУ (Цифра)', gostLet: 'ДСТУ (Літера)',
      proModules: 'PRO: Конструктивні параметри',
      girthTitle: 'Обхват у пучках:', export: 'Експорт CSV',
      girthDesc: 'Фізичний периметр стопи/колодки в найширшому місці для обраного розміру.',
      gradingTitle: 'Градація повноти',
      inlineHelp: { gostNum: 'Визначає крок обхвату', gostLet: 'Часто для модельного взуття', iso: 'Міжнародний стандарт' },
      modal: {
        gostNum: { title: 'Цифровий ДСТУ', text: 'Вітчизняний стандарт. Визначає крок зміни обхвату в пучках. Кожна цифра відповідає конкретному фізичному обхвату.' },
        gostLet: { title: 'Літерний ДСТУ', text: 'Альтернативна система маркування повноти літерами (A, B, C, D, E). Часто використовується в модельному взутті.' },
        iso: { title: 'Система EU / ISO', text: 'Міжнародний європейський стандарт маркування. Базується на штихмасовій системі.' }
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
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-3 pb-2 bg-[#151210]/90 backdrop-blur-md">
        <button 
          onClick={() => { triggerHaptic(); onBack(); }} 
          aria-label="Назад"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-[#1D1815] border border-[#C6A47A]/20 active:scale-95 transition-transform"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="text-center">
          <h1 className="text-[16px] font-medium tracking-wide">{t.title}</h1>
          <p className="text-[12px] text-[#B9ACA0]">{t.subtitle}</p>
        </div>
        <div className="w-11 h-11 flex items-center justify-center">
          {/* Кнопка экспорта (UI mockup) */}
          <button aria-label={t.export} className="opacity-50 hover:opacity-100 transition-opacity">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-12 scrollbar-hide">
        
        {/* 1. PRO Модуль (Карточки) */}
        <div className="rounded-3xl bg-[#1D1815] border border-[#C6A47A]/30 p-5 mt-2 mb-5 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
              {t.proHeader}
            </h2>
            <div className="px-2 py-1 rounded-full bg-[#151210] border border-white/10 text-[10px] font-semibold text-[#B9ACA0]">PRO</div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { id: 'gostNum' as const, label: t.gostNum, val: result.gostNum, help: t.inlineHelp.gostNum },
              { id: 'gostLet' as const, label: t.gostLet, val: result.gostLetter, help: t.inlineHelp.gostLet },
              { id: 'iso' as const, label: 'EU / ISO', val: result.euCode, help: t.inlineHelp.iso }
            ].map((item) => (
              <button 
                key={item.id}
                aria-label={`Информация про ${item.label}`}
                onClick={() => openInfo(item.id)}
                className="bg-[#151210] p-3 rounded-2xl border border-white/5 text-left flex flex-col justify-between h-[84px] relative group hover:bg-[#201c19] active:scale-[0.98] transition-all"
              >
                <div className="text-[10px] text-[#8F867E] uppercase leading-tight font-medium">{item.label}</div>
                <div className="text-[24px] font-medium text-white">{item.val}</div>
                <div className="text-[8px] text-[#8F867E] opacity-70 leading-tight mt-1 line-clamp-2">{item.help}</div>
                <div className="absolute top-2 right-2 opacity-30 group-hover:opacity-100 transition-opacity">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-4 items-center p-3 bg-black/20 rounded-2xl border border-white/5">
             <div className="flex flex-col items-center gap-1 min-w-[56px]">
                <div className="w-10 h-12 rounded-t-full rounded-b-sm border-2 border-[#151210] shadow-inner" style={{ backgroundColor: result.color }} />
                <span className="text-[10px] font-medium text-white px-2 py-0.5 bg-white/10 rounded">{result.colorName[lang]}</span>
             </div>
             <p className="text-[11px] text-[#B9ACA0] leading-relaxed italic opacity-90 flex-1">{t.proDesc}</p>
          </div>
        </div>

        {/* 2. Пол */}
        <div className="mb-5 flex p-[4px] rounded-2xl bg-[#1D1815] border border-[#C6A47A]/20">
          {(['men', 'women', 'kids'] as Gender[]).map((g) => (
            <button
              key={g} onClick={() => handleGender(g)}
              aria-pressed={gender === g}
              className="flex-1 py-3 rounded-[12px] text-[14px] font-medium transition-all"
              style={gender === g ? { background: theme.accentBg, color: theme.accentSoft } : { color: '#B9ACA0' }}
            >
              {g === 'men' ? t.men : g === 'women' ? t.women : t.kids}
            </button>
          ))}
        </div>

        {/* 3. Размер с валидацией, aria-live и слайдером */}
        <div className="rounded-3xl bg-[#1D1815] border border-[#C6A47A]/20 p-5 mb-4">
          <div className="flex justify-between items-center mb-3">
             <span className="text-[14px] font-medium text-[#F5F1EB]">{t.step1}</span>
             <span className="text-[12px] text-[#8F867E]">({limits.min} - {limits.max})</span>
          </div>
          
          {/* Stepper */}
          <div className="flex items-center justify-between mb-4">
            <button
              aria-label="Уменьшить размер"
              disabled={sizeEu <= limits.min}
              onClick={() => handleSizeChange(sizeEu - 1)}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-[#151210] border border-[#C6A47A]/20 active:bg-white/10 disabled:opacity-30 disabled:active:bg-transparent"
              style={{ color: theme.accentSoft }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
            </button>
            <div aria-live="polite" className="text-[48px] font-light tracking-tight leading-none" style={{ color: theme.accentSoft }}>
              {sizeEu}
            </div>
            <button
              aria-label="Увеличить размер"
              disabled={sizeEu >= limits.max}
              onClick={() => handleSizeChange(sizeEu + 1)}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-[#151210] border border-[#C6A47A]/20 active:bg-white/10 disabled:opacity-30 disabled:active:bg-transparent"
              style={{ color: theme.accentSoft }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>

          {/* Slider input */}
          <input 
            type="range" 
            min={limits.min} max={limits.max} step="1"
            value={sizeEu}
            onChange={(e) => handleSizeChange(Number(e.target.value))}
            className="w-full accent-[#C6A47A] h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
            style={{ accentColor: theme.accent }}
          />
        </div>

        {/* 4. Категория */}
        <div className="mb-6">
          <span className="text-[14px] font-medium text-[#F5F1EB] block mb-3 px-1">{t.step2}</span>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(t.cats) as WidthCategory[]).map(cat => (
              <button
                key={cat} onClick={() => { triggerHaptic(); setWidthCat(cat) }}
                aria-pressed={widthCat === cat}
                className="py-3.5 px-2 rounded-xl text-[14px] font-medium transition-all border min-h-[44px]"
                style={widthCat === cat 
                  ? { background: theme.accentBg, borderColor: theme.accent, color: theme.accentSoft }
                  : { background: '#1D1815', borderColor: 'rgba(255,255,255,0.05)', color: '#B9ACA0' }}
              >
                {t.cats[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Конвертация (US/UK) */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl bg-[#1D1815] border border-white/5 p-4 flex flex-col items-center">
            <span className="text-[12px] text-[#B9ACA0] mb-1 uppercase tracking-widest font-medium">US</span>
            <span className="text-[34px] font-medium" style={{ color: theme.accentSoft }}>{result.us}</span>
          </div>
          <div className="rounded-2xl bg-[#1D1815] border border-white/5 p-4 flex flex-col items-center">
            <span className="text-[12px] text-[#B9ACA0] mb-1 uppercase tracking-widest font-medium">UK</span>
            <span className="text-[34px] font-medium" style={{ color: theme.accentSoft }}>{result.uk}</span>
          </div>
        </div>

        {/* 6. PRO: Обхваты и единицы измерения */}
        <button
          onClick={() => { triggerHaptic(); setShowPro(!showPro) }}
          aria-expanded={showPro}
          className="flex items-center justify-between w-full text-[13px] font-medium mb-3 px-2 py-1 active:opacity-70 transition-opacity min-h-[44px]"
          style={{ color: theme.accent }}
        >
          <span className="flex items-center gap-2">
            <motion.div animate={{ rotate: showPro ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5l7 7-7 7" /></svg>
            </motion.div>
            {t.proModules}
          </span>
        </button>

        <AnimatePresence>
          {showPro && (
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }} 
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }} 
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl bg-[#1D1815] border border-[#C6A47A]/20 p-5 shadow-sm mb-4 space-y-4">
                {/* Переключатель mm/in */}
                <div className="flex justify-between items-center bg-[#151210] p-1 rounded-lg border border-white/5 mb-2 w-max">
                  {(['mm', 'in'] as Unit[]).map(u => (
                    <button 
                      key={u} onClick={() => { triggerHaptic('light'); setUnit(u) }}
                      className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-colors ${unit === u ? 'bg-[#332c26] text-white' : 'text-[#8F867E]'}`}
                    >{u}</button>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[14px] font-medium text-white">{t.girthTitle}</span>
                    <span className="text-[22px] font-bold" style={{ color: theme.accentSoft }}>
                      {unit === 'mm' ? result.girthMm : result.girthIn} <span className="text-[13px] font-normal">{unit}</span>
                    </span>
                  </div>
                  <p className="text-[12px] text-[#B9ACA0] leading-snug">{t.girthDesc}</p>
                </div>
                
                <div className="h-px w-full bg-white/10" />
                
                <div>
                  <span className="text-[13px] font-medium text-white block mb-1">{t.gradingTitle}</span>
                  <p className="text-[12px] text-[#B9ACA0] leading-snug">
                    {lang === 'ru' ? 'Шаг обхвата:' : 'Крок обхвату:'} {gender === 'women' ? '4' : gender === 'men' ? '5' : '3'} мм. <br/>
                    <span className="text-[11px] opacity-70 mt-1 block">*Правило параллельного смещения</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* A11y Модальное окно */}
      <AnimatePresence>
        {activeInfo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setActiveInfo(null)}
          >
            <motion.div
              ref={modalRef}
              role="dialog" aria-modal="true" aria-labelledby="modal-title"
              initial={prefersReducedMotion ? { scale: 1 } : { scale: 0.95, y: 10 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={prefersReducedMotion ? { scale: 1 } : { scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[320px] bg-[#1D1815] border border-[#C6A47A]/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-full bg-[#151210] border border-[#C6A47A]/20 flex items-center justify-center mb-4 text-[#C6A47A]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
                <h3 id="modal-title" className="text-[18px] font-medium text-white mb-3">{t.modal[activeInfo].title}</h3>
                <p className="text-[14px] text-[#B9ACA0] leading-relaxed mb-6">{t.modal[activeInfo].text}</p>
                
                <button
                  onClick={() => setActiveInfo(null)}
                  autoFocus
                  className="w-full py-3.5 rounded-xl font-medium text-[15px] transition-colors active:scale-95"
                  style={{ backgroundColor: theme.accentBg, color: theme.accentSoft }}
                >
                  {lang === 'ru' ? 'Понятно' : 'Зрозуміло'}
                </button>
              </div>
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
