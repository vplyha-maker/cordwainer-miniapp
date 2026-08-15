import { useState } from 'react'
import { motion } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'
import type { Lang } from '../App'

type CalcMenuPageProps = {
  onBack: () => void
  lang: Lang
  onOpenSizeCalc?: () => void
  onOpenWidthCalc?: () => void
}

export function CalcMenuPage({
  onBack,
  lang,
  onOpenSizeCalc,
  onOpenWidthCalc,
}: CalcMenuPageProps) {
  const [isCalcSaved, setIsCalcSaved] = useState(false)

  const triggerHaptic = (style: 'light' | 'medium' = 'light') => {
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred(style)
      } else if (navigator.vibrate) {
        navigator.vibrate(style === 'light' ? 20 : 40)
      }
    }
  }

  const t = {
    ru: {
      title: 'Калькуляторы',
      sizeTitle: 'Конвертер размеров',
      sizeSub: 'UK, US, EU, CM',
      widthTitle: 'Полнота стопы',
      widthSub: 'Расчет по обхвату',
      saveAdd: 'Сохранить на главной',
      saveRemove: 'Убрать с главной',
    },
    uk: {
      title: 'Калькулятори',
      sizeTitle: 'Конвертер розмірів',
      sizeSub: 'UK, US, EU, CM',
      widthTitle: 'Повнота стопи',
      widthSub: 'Розрахунок за обхватом',
      saveAdd: 'Зберегти на головній',
      saveRemove: 'Видалити з головної',
    },
  }[lang]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="relative flex flex-col h-[100dvh] bg-[#151210] text-[#F5F1EB] overflow-hidden"
    >
      {/* Header Panel (Кнопка назад) */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#151210]/90 to-transparent px-4 py-4 flex items-center">
        <button
          aria-label="Back"
          onClick={() => {
            triggerHaptic('light')
            onBack()
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1D1815]/80 backdrop-blur-md border border-[#C6A47A]/30 text-[#F5F1EB] active:scale-90 transition-transform cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1 text-center font-display text-[1.1rem] text-[#F5F1EB] drop-shadow-md pr-9">
          {t.title}
        </div>
      </div>

      {/* Заглавное фото */}
      <div className="relative w-full h-[32vh] shrink-0">
        <img
          src="/calc-hero.png"
          alt="Calculators"
          className="w-full h-full object-cover bg-[#27211D]"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        {/* Заглушка, если нет картинки */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1D1815] to-[#27211D] -z-10 flex items-center justify-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1" strokeOpacity="0.2">
            <rect x="4" y="2" width="16" height="20" rx="3" />
            <path d="M8 6h8M16 14v.01M12 14v.01M8 14v.01M16 18v.01M12 18v.01M8 18v.01M16 10v.01M12 10v.01M8 10v.01" />
          </svg>
        </div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(21,18,16,0.1) 0%, rgba(21,18,16,0.5) 60%, #151210 100%)' }} />
      </div>

      {/* Кнопки меню */}
      <div className="flex-1 px-4 -mt-4 relative z-10 flex flex-col gap-3 pb-[110px] overflow-y-auto">
        
        {/* Конвертер размеров */}
        <button
          onClick={() => {
            triggerHaptic('medium')
            onOpenSizeCalc?.()
          }}
          className="card-simplified relative rounded-2xl p-4 text-left flex items-center gap-4 cursor-pointer active:scale-[0.97] transition-transform"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34D399' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.29 7 12 12 20.71 7" />
              <line x1="12" y1="22" x2="12" y2="12" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-[#F5F1EB] leading-tight mb-1">{t.sizeTitle}</h3>
            <p className="text-[12px] text-[#B9ACA0]">{t.sizeSub}</p>
          </div>
          <div className="text-[#B9ACA0]/50"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg></div>
        </button>

        {/* Калькулятор полноты */}
        <button
          onClick={() => {
            triggerHaptic('medium')
            onOpenWidthCalc?.()
          }}
          className="card-simplified relative rounded-2xl p-4 text-left flex items-center gap-4 cursor-pointer active:scale-[0.97] transition-transform"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(96, 165, 250, 0.15)', color: '#60A5FA' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-[#F5F1EB] leading-tight mb-1">{t.widthTitle}</h3>
            <p className="text-[12px] text-[#B9ACA0]">{t.widthSub}</p>
          </div>
          <div className="text-[#B9ACA0]/50"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg></div>
        </button>

        {/* Сохранить на главной */}
        <div className="mt-4">
          <button
            onClick={() => {
              triggerHaptic(isCalcSaved ? 'light' : 'medium')
              setIsCalcSaved(!isCalcSaved)
            }}
            className={`btn-favorite-overlay w-full relative overflow-hidden flex items-center justify-center gap-3 py-4 rounded-2xl border transition-colors duration-300 active:scale-[0.98] cursor-pointer ${
              isCalcSaved ? 'border-[#F59E0B]/40' : 'border-[#B9ACA0]/20'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-b from-[#F59E0B]/15 to-[#F59E0B]/5 transition-opacity duration-300 ${isCalcSaved ? 'opacity-100' : 'opacity-0'}`} />
            <div className={`absolute inset-0 bg-gradient-to-b from-[#27211D]/70 to-[#1D1815]/50 transition-opacity duration-300 ${isCalcSaved ? 'opacity-0' : 'opacity-100'}`} />
            
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={isCalcSaved ? '#F59E0B' : 'none'}
              stroke={isCalcSaved ? '#F59E0B' : '#B9ACA0'}
              strokeWidth="1.8"
              className="relative z-10 transition-colors duration-300"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className={`relative z-10 text-[12px] font-bold uppercase tracking-wider transition-colors duration-300 ${isCalcSaved ? 'text-[#F59E0B]' : 'text-[#F5F1EB]'}`}>
              {isCalcSaved ? t.saveRemove : t.saveAdd}
            </span>
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
        <BottomDock active="search" lang={lang} />
      </div>
    </motion.div>
  )
}

