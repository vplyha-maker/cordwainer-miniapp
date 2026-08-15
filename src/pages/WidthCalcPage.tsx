// src/pages/WidthCalcPage.tsx

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'
import { getWidthData, type Gender, type WidthCategory } from '../lib/shoeWidths'

type WidthCalcPageProps = {
  onBack: () => void
  lang: Lang
}

const THEMES = {
  men: { accent: '#C6A47A', accentSoft: '#E8C9A0', accentBg: 'rgba(198,164,122,0.18)' },
  women: { accent: '#E8A0B5', accentSoft: '#F2C4D0', accentBg: 'rgba(232,160,181,0.16)' },
  kids: { accent: '#7EB8D4', accentSoft: '#A8D4E8', accentBg: 'rgba(126,184,212,0.16)' },
} as const

const DEFAULT_SIZES: Record<Gender, number> = { men: 42, women: 38, kids: 28 }

// Тип для активного всплывающего окна (модалки)
type InfoModalType = 'gostNum' | 'gostLet' | 'iso' | null

export function WidthCalcPage({ onBack, lang }: WidthCalcPageProps) {
  const [gender, setGender] = useState<Gender>('men')
  const [sizeEu, setSizeEu] = useState<number>(DEFAULT_SIZES.men)
  const [widthCat, setWidthCat] = useState<WidthCategory>('standard')
  const [showPro, setShowPro] = useState(false) // Для нижнего аккордеона обхватов
  const [activeInfo, setActiveInfo] = useState<InfoModalType>(null) // Для модалки

  const theme = THEMES[gender]
  const result = useMemo(() => getWidthData(gender, sizeEu, widthCat), [gender, sizeEu, widthCat])

  const triggerHaptic = (style: 'light' | 'medium' = 'light') => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
      else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 15 : 30)
    } catch {}
  }

  const handleGender = (g: Gender) => {
    setGender(g)
    setSizeEu(DEFAULT_SIZES[g])
    triggerHaptic('medium')
  }

  const openInfo = (type: InfoModalType) => {
    triggerHaptic('light')
    setActiveInfo(type)
  }

  // Тексты и переводы
  const t = {
    ru: {
      title: 'Полнота обуви',
      subtitle: 'PRO Конвертор & Маркировка',
      proHeader: 'Внутренний стандарт бренда',
      proDesc: 'Цветовая кодировка не регламентируется ISO, но является стандартом на современных производствах для визуального разделения колодок на конвейере. Вы можете использовать эту схему при заказе колодок на фабрике.',
      men: 'Муж', women: 'Жен', kids: 'Дет',
      step1: '1. Базовый размер (EU)',
      step2: '2. Категория полноты',
      cats: { narrow: 'Узкая', standard: 'Средняя', wide: 'Широкая', xwide: 'Очень шир.' },
      factoryColor: 'Цветовая метка (торец):',
      gostNum: 'ГОСТ (Цифра)',
      gostLet: 'ГОСТ (Буква)',
      proModules: 'PRO: Конструктивные параметры',
      girthTitle: 'Обхват в пучках:',
      girthDesc: 'Физический периметр стопы/колодки в самом широком месте для выбранного размера.',
      gradingTitle: 'Градация полноты',
      gradingDesc: gender === 'women' ? 'Шаг полноты: 4 мм. Шаг размера: 3 мм.' : gender === 'men' ? 'Шаг полноты: 5 мм. Шаг размера: 3 мм.' : 'Шаг полноты: 3 мм. Шаг размера: 2.5 мм.',
      modal: {
        gostNum: { title: 'Цифровой ГОСТ', text: 'Отечественный стандарт. Определяет шаг изменения обхвата в пучках. Каждая цифра (например, от 1 до 12) соответствует конкретному физическому обхвату для заданного размера.' },
        gostLet: { title: 'Буквенный ГОСТ', text: 'Альтернативная система маркировки полноты буквами (A, B, C, D, E). Часто используется в модельной обуви для более понятного восприятия покупателем.' },
        iso: { title: 'Система EU / ISO', text: 'Международный европейский стандарт маркировки и градации. Базируется на штихмассовой системе.' }
      }
    },
    uk: {
      title: 'Повнота взуття',
      subtitle: 'PRO Конвертор та Маркування',
      proHeader: 'Внутрішній стандарт бренду',
      proDesc: 'Кольорове кодування не регламентується ISO, але є стандартом на сучасних виробництвах для візуального розділення колодок на конвеєрі. Ви можете використовувати цю схему при замовленні колодок на фабриці.',
      men: 'Чол', women: 'Жін', kids: 'Дит',
      step1: '1. Базовий розмір (EU)',
      step2: '2. Категорія повноти',
      cats: { narrow: 'Вузька', standard: 'Середня', wide: 'Широка', xwide: 'Дуже шир.' },
      factoryColor: 'Колірна мітка (торець):',
      gostNum: 'ДСТУ (Цифра)',
      gostLet: 'ДСТУ (Літера)',
      proModules: 'PRO: Конструктивні параметри',
      girthTitle: 'Обхват у пучках:',
      girthDesc: 'Фізичний периметр стопи/колодки в найширшому місці для обраного розміру.',
      gradingTitle: 'Градація повноти',
      gradingDesc: gender === 'women' ? 'Крок повноти: 4 мм. Крок розміру: 3 мм.' : gender === 'men' ? 'Крок повноти: 5 мм. Крок розміру: 3 мм.' : 'Крок повноти: 3 мм. Крок розміру: 2.5 мм.',
      modal: {
        gostNum: { title: 'Цифровий ДСТУ', text: 'Вітчизняний стандарт. Визначає крок зміни обхвату в пучках. Кожна цифра відповідає конкретному фізичному обхвату для заданого розміру.' },
        gostLet: { title: 'Літерний ДСТУ', text: 'Альтернативна система маркування повноти літерами (A, B, C, D, E). Часто використовується в модельному взутті.' },
        iso: { title: 'Система EU / ISO', text: 'Міжнародний європейський стандарт маркування та градації. Базується на штихмасовій системі.' }
      }
    }
  }[lang]

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="relative flex flex-col h-[100dvh] bg-[#151210] text-[#F5F1EB] overflow-hidden"
    >
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-3 pb-2 bg-[#151210]/80 backdrop-blur-md">
        <button onClick={() => { triggerHaptic(); onBack(); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1D1815] border border-[#C6A47A]/20 active:scale-90 transition-transform">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="text-center">
          <h1 className="text-[16px] font-medium tracking-wide">{t.title}</h1>
          <p className="text-[11px] text-[#B9ACA0]">{t.subtitle}</p>
        </div>
        <div className="w-10 h-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-12 scrollbar-hide">
        
        {/* 1. PRO Модуль: Фабричная Маркировка (Вынесен наверх) */}
        <div className="rounded-3xl bg-[#1D1815] border border-[#C6A47A]/30 p-5 mt-2 mb-5 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          {/* Watermark */}
          <div className="absolute top-[-10px] right-[-10px] w-24 h-24 opacity-5 pointer-events-none text-white">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>
          </div>

          <div className="flex justify-between items-center mb-4 relative z-10">
            <h2 className="text-[12px] font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
              {t.proHeader}
            </h2>
            <div className="w-8 h-8 rounded-full bg-[#151210] flex items-center justify-center border border-white/5 text-[9px] text-[#B9ACA0]">
              PRO
            </div>
          </div>
          
          {/* Интерактивные карточки параметров */}
          <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
            {[
              { id: 'gostNum' as const, label: t.gostNum, val: result.gostNum },
              { id: 'gostLet' as const, label: t.gostLet, val: result.gostLetter },
              { id: 'iso' as const, label: 'EU / ISO', val: result.euCode }
            ].map((item) => (
              <motion.button 
                key={item.id}
                whileTap={{ scale: 0.94 }}
                onClick={() => openInfo(item.id)}
                className="bg-[#151210] p-3 rounded-2xl border border-white/5 text-left flex flex-col justify-between h-[72px] relative overflow-hidden group"
              >
                <div className="text-[9px] text-[#8F867E] uppercase leading-tight">{item.label}</div>
                <div className="text-[22px] font-medium text-white">{item.val}</div>
                {/* Иконка "инфо", появляющаяся при клике */}
                <div className="absolute top-2 right-2 opacity-30 group-hover:opacity-100 transition-opacity">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Визуализация торца и описание */}
          <div className="flex gap-4 items-center relative z-10 p-3 bg-black/20 rounded-2xl border border-white/5">
             <div className="flex flex-col items-center gap-1 min-w-[50px]">
                <div 
                  className="w-10 h-12 rounded-t-full rounded-b-sm border-2 border-[#151210] shadow-inner relative overflow-hidden" 
                  style={{ backgroundColor: result.color }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
                </div>
                <span className="text-[9px] font-medium text-white px-1.5 py-0.5 bg-white/10 rounded">{result.colorName[lang]}</span>
             </div>
             <p className="text-[10px] text-[#B9ACA0] leading-relaxed italic opacity-90 flex-1">
               {t.proDesc}
             </p>
          </div>
        </div>

        {/* 2. Калькулятор: Пол */}
        <div className="mb-5 flex p-[3px] rounded-2xl bg-[#1D1815] border border-[#C6A47A]/20 shadow-sm">
          {(['men', 'women', 'kids'] as Gender[]).map((g) => (
            <button
              key={g} onClick={() => handleGender(g)}
              className="flex-1 py-2.5 rounded-[14px] text-[13px] font-medium transition-all"
              style={gender === g ? { background: theme.accentBg, color: theme.accentSoft } : { color: '#B9ACA0' }}
            >
              {g === 'men' ? t.men : g === 'women' ? t.women : t.kids}
            </button>
          ))}
        </div>

        {/* 3. Калькулятор: Базовый Размер */}
        <div className="rounded-3xl bg-[#1D1815] border border-[#C6A47A]/20 p-5 mb-4 shadow-sm">
          <span className="text-[13px] font-medium text-[#F5F1EB] block mb-4">{t.step1}</span>
          <div className="flex items-center justify-between">
            <button
              onClick={() => { triggerHaptic('light'); setSizeEu(s => s - 1) }}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-[#151210] border border-[#C6A47A]/20 active:bg-white/10"
              style={{ color: theme.accentSoft }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
            </button>
            <motion.div 
              key={sizeEu} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-[44px] font-light tracking-tight leading-none" style={{ color: theme.accentSoft }}
            >
              {sizeEu}
            </motion.div>
            <button
              onClick={() => { triggerHaptic('light'); setSizeEu(s => s + 1) }}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-[#151210] border border-[#C6A47A]/20 active:bg-white/10"
              style={{ color: theme.accentSoft }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>

        {/* 4. Калькулятор: Категория полноты */}
        <div className="mb-6">
          <span className="text-[13px] font-medium text-[#F5F1EB] block mb-2.5 px-1">{t.step2}</span>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(t.cats) as WidthCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => { triggerHaptic(); setWidthCat(cat) }}
                className="py-3 px-2 rounded-xl text-[13px] font-medium transition-all border"
                style={widthCat === cat 
                  ? { background: theme.accentBg, borderColor: theme.accent, color: theme.accentSoft }
                  : { background: '#1D1815', borderColor: 'rgba(198,164,122,0.1)', color: '#B9ACA0' }}
              >
                {t.cats[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Результаты конвертации US/UK */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl bg-[#1D1815] border border-white/5 p-4 flex flex-col items-center justify-center">
            <span className="text-[11px] text-[#B9ACA0] mb-1 uppercase tracking-widest">US</span>
            <span className="text-[32px] font-medium" style={{ color: theme.accentSoft }}>{result.us}</span>
          </div>
          <div className="rounded-2xl bg-[#1D1815] border border-white/5 p-4 flex flex-col items-center justify-center">
            <span className="text-[11px] text-[#B9ACA0] mb-1 uppercase tracking-widest">UK</span>
            <span className="text-[32px] font-medium" style={{ color: theme.accentSoft }}>{result.uk}</span>
          </div>
        </div>

        {/* 6. PRO Modules Accordion (Обхваты) */}
        <button
          onClick={() => { triggerHaptic(); setShowPro(!showPro) }}
          className="flex items-center gap-2 text-[12px] font-medium mb-3 px-1 active:opacity-70 transition-opacity"
          style={{ color: theme.accent }}
        >
          <motion.div animate={{ rotate: showPro ? 90 : 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5l7 7-7 7" /></svg>
          </motion.div>
          {t.proModules}
        </button>

        <AnimatePresence>
          {showPro && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl bg-[#1D1815] border border-[#C6A47A]/20 p-5 shadow-sm mb-4 space-y-4">
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[13px] font-medium text-white">{t.girthTitle}</span>
                    <span className="text-[20px] font-bold" style={{ color: theme.accentSoft }}>{result.girthMm} <span className="text-[12px] font-normal">мм</span></span>
                  </div>
                  <p className="text-[11px] text-[#B9ACA0] leading-snug">{t.girthDesc}</p>
                </div>
                <div className="h-px w-full bg-white/5" />
                <div>
                  <span className="text-[12px] font-medium text-white block mb-1">{t.gradingTitle}</span>
                  <p className="text-[11px] text-[#B9ACA0] leading-snug">
                    {t.gradingDesc} <br/>
                    <span className="text-[10px] opacity-70 mt-1 block">*Правило параллельного смещения градационных сеток</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Информационное Модальное окно (Попап) с SVG анимацией */}
      <AnimatePresence>
        {activeInfo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setActiveInfo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[320px] bg-[#1D1815] border border-[#C6A47A]/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Анимированная SVG графика на фоне */}
              <div className="absolute -top-6 -right-6 opacity-10 pointer-events-none">
                <svg width="120" height="120" viewBox="0 0 100 100" fill="none" stroke={theme.accent}>
                  <motion.path 
                    d="M30 80 C 30 50, 50 30, 80 30" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
                  />
                  <motion.circle 
                    cx="30" cy="80" r="4" fill={theme.accent}
                    animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <motion.circle 
                    cx="80" cy="30" r="4" fill={theme.accent}
                    animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.75 }}
                  />
                </svg>
              </div>

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-full bg-[#151210] border border-[#C6A47A]/20 flex items-center justify-center mb-4 text-[#C6A47A]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
                <h3 className="text-[18px] font-medium text-white mb-2">{t.modal[activeInfo].title}</h3>
                <p className="text-[13px] text-[#B9ACA0] leading-relaxed mb-6">{t.modal[activeInfo].text}</p>
                
                <button
                  onClick={() => setActiveInfo(null)}
                  className="w-full py-3 rounded-xl font-medium text-[14px] transition-colors active:scale-95"
                  style={{ backgroundColor: theme.accentBg, color: theme.accentSoft }}
                >
                  Понятно
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `.scrollbar-hide::-webkit-scrollbar { display: none; }`}} />
    </motion.div>
  )
}
