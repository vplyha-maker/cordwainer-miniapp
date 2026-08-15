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

const DEFAULT_SIZES = { men: 42, women: 38, kids: 28 }

export function WidthCalcPage({ onBack, lang }: WidthCalcPageProps) {
  const [gender, setGender] = useState<Gender>('men')
  const [sizeEu, setSizeEu] = useState<number>(DEFAULT_SIZES.men)
  const [widthCat, setWidthCat] = useState<WidthCategory>('standard')
  const [showPro, setShowPro] = useState(false)

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
    triggerHaptic()
  }

  const t = {
    ru: {
      title: 'Полнота обуви',
      subtitle: 'PRO Конвертор & Обхват',
      men: 'Муж', women: 'Жен', kids: 'Дет',
      step1: '1. Базовый размер (EU)',
      step2: '2. Категория полноты',
      cats: { narrow: 'Узкая', standard: 'Средняя', wide: 'Широкая', xwide: 'Очень шир.' },
      conversion: 'Конвертация стандартов',
      factoryInfo: 'Клеймение колодки',
      factoryColor: 'Цветовая метка (торец):',
      gostNum: 'ГОСТ (Цифра)',
      gostLet: 'ГОСТ (Буква)',
      proModules: 'PRO Модули (Конструктору)',
      girthTitle: 'Обхват в пучках:',
      girthDesc: 'Физический периметр стопы/колодки в самом широком месте для выбранного размера.',
      gradingTitle: 'Градация полноты',
      gradingDesc: gender === 'women' ? 'Шаг полноты: 4 мм. Шаг размера: 3 мм.' : gender === 'men' ? 'Шаг полноты: 5 мм. Шаг размера: 3 мм.' : 'Шаг полноты: 3 мм. Шаг размера: 2.5 мм.',
    },
    uk: {
      title: 'Повнота взуття',
      subtitle: 'PRO Конвертор та Обхват',
      men: 'Чол', women: 'Жін', kids: 'Дит',
      step1: '1. Базовий розмір (EU)',
      step2: '2. Категорія повноти',
      cats: { narrow: 'Вузька', standard: 'Середня', wide: 'Широка', xwide: 'Дуже шир.' },
      conversion: 'Конвертація стандартів',
      factoryInfo: 'Таврування колодки',
      factoryColor: 'Колірна мітка (торець):',
      gostNum: 'ДСТУ (Цифра)',
      gostLet: 'ДСТУ (Літера)',
      proModules: 'PRO Модулі (Конструктору)',
      girthTitle: 'Обхват у пучках:',
      girthDesc: 'Фізичний периметр стопи/колодки в найширшому місці для обраного розміру.',
      gradingTitle: 'Градація повноти',
      gradingDesc: gender === 'women' ? 'Крок повноти: 4 мм. Крок розміру: 3 мм.' : gender === 'men' ? 'Крок повноти: 5 мм. Крок розміру: 3 мм.' : 'Крок повноти: 3 мм. Крок розміру: 2.5 мм.',
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
      <div className="relative z-20 flex items-center justify-between px-4 pt-3 pb-1">
        <button onClick={() => { triggerHaptic(); onBack(); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1D1815] border border-[#C6A47A]/20 active:scale-90 transition-transform">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="text-center">
          <h1 className="text-[16px] font-medium tracking-wide">{t.title}</h1>
          <p className="text-[11px] text-[#B9ACA0]">{t.subtitle}</p>
        </div>
        <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-12 scrollbar-hide">
        {/* Gender */}
        <div className="mt-4 mb-5 flex p-[3px] rounded-2xl bg-[#1D1815] border border-[#C6A47A]/20">
          {(['men', 'women', 'kids'] as Gender[]).map((g) => (
            <button
              key={g} onClick={() => handleGender(g)}
              className="flex-1 py-2.5 rounded-[14px] text-[13px] font-medium transition-all"
              style={gender === g ? { background: THEMES[g].accentBg, color: THEMES[g].accentSoft } : { color: '#B9ACA0' }}
            >
              {g === 'men' ? t.men : g === 'women' ? t.women : t.kids}
            </button>
          ))}
        </div>

        {/* Base Size Input */}
        <div className="rounded-3xl bg-[#1D1815] border border-[#C6A47A]/20 p-5 mb-3 shadow-sm">
          <span className="text-[13px] font-medium text-[#F5F1EB] block mb-4">{t.step1}</span>
          <div className="flex items-center justify-between">
            <button
              onClick={() => { triggerHaptic('light'); setSizeEu(s => s - 1) }}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-[#151210] border border-[#C6A47A]/20 active:bg-white/10"
              style={{ color: theme.accentSoft }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
            </button>
            <div className="text-[40px] font-light tracking-tight leading-none" style={{ color: theme.accentSoft }}>
              {sizeEu}
            </div>
            <button
              onClick={() => { triggerHaptic('light'); setSizeEu(s => s + 1) }}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-[#151210] border border-[#C6A47A]/20 active:bg-white/10"
              style={{ color: theme.accentSoft }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>

        {/* Width Category Selector */}
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

        {/* Grid Results */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-2xl bg-[#1D1815] border border-white/5 p-4 flex flex-col items-center justify-center">
            <span className="text-[11px] text-[#B9ACA0] mb-1 uppercase tracking-widest">US</span>
            <span className="text-[32px] font-medium" style={{ color: theme.accentSoft }}>{result.us}</span>
          </div>
          <div className="rounded-2xl bg-[#1D1815] border border-white/5 p-4 flex flex-col items-center justify-center">
            <span className="text-[11px] text-[#B9ACA0] mb-1 uppercase tracking-widest">UK</span>
            <span className="text-[32px] font-medium" style={{ color: theme.accentSoft }}>{result.uk}</span>
          </div>
        </div>

        {/* Factory Stamp */}
        <div className="rounded-3xl bg-[#1D1815] border border-[#C6A47A]/30 p-5 mb-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>
          </div>
          <div className="text-[12px] font-medium tracking-wide uppercase mb-4" style={{ color: theme.accent }}>
            {t.factoryInfo}
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="flex gap-4 mb-3">
                <div>
                  <div className="text-[10px] text-[#8F867E] mb-0.5">{t.gostNum}</div>
                  <div className="text-[20px] font-medium text-white">{result.gostNum}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8F867E] mb-0.5">{t.gostLet}</div>
                  <div className="text-[20px] font-medium text-white">{result.gostLetter}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8F867E] mb-0.5">EU / ISO</div>
                  <div className="text-[20px] font-medium text-white">{result.euCode}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#B9ACA0]">{t.factoryColor}</span>
                <span className="text-[11px] font-medium text-white">{result.colorName[lang]}</span>
              </div>
            </div>
            {/* Стилизованный торец колодки */}
            <div 
              className="w-10 h-14 rounded-t-full rounded-b-md shadow-lg border-2 border-[#151210]"
              style={{ backgroundColor: result.color }}
            />
          </div>
        </div>

        {/* PRO Modules Accordion */}
        <button
          onClick={() => { triggerHaptic(); setShowPro(!showPro) }}
          className="flex items-center gap-1.5 text-[12px] font-medium mb-3 px-1"
          style={{ color: theme.accent }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {showPro ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
          </svg>
          {t.proModules}
        </button>

        <AnimatePresence>
          {showPro && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl bg-[#1D1815] border border-[#C6A47A]/20 p-4 shadow-sm mb-4 space-y-4">
                
                {/* Girth Calculator */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[13px] font-medium text-white">{t.girthTitle}</span>
                    <span className="text-[18px] font-bold" style={{ color: theme.accentSoft }}>{result.girthMm} <span className="text-[12px] font-normal">мм</span></span>
                  </div>
                  <p className="text-[10px] text-[#B9ACA0] leading-snug">{t.girthDesc}</p>
                </div>

                <div className="h-px w-full bg-white/5" />

                {/* Grading Rule */}
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
    </motion.div>
  )
}

