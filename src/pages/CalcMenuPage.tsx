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
      category: 'БЛОГ И СТАТЬИ',
      title: 'PRO Расчёты',
      desc: 'Изнанка обувной индустрии. Дизайн, технологии и секреты производства',
      sizeTitle: 'Размеры',
      sizeSub: 'UK, US, EU, CM',
      widthTitle: 'Полнота',
      widthSub: 'Расчет по обхвату',
      saveAddTitle: 'На главную',
      saveAddSub: 'Добавить калькулятор',
      saveRemoveTitle: 'В избранном',
      saveRemoveSub: 'Убрать с главной',
      backMenu: 'Назад в меню',
    },
    uk: {
      category: 'БЛОГ ТА СТАТТІ',
      title: 'PRO Розрахунки',
      desc: 'Виворіт взуттєвої індустрії. Дизайн, технології та секрети виробництва',
      sizeTitle: 'Розміри',
      sizeSub: 'UK, US, EU, CM',
      widthTitle: 'Повнота',
      widthSub: 'Розрахунок за обхватом',
      saveAddTitle: 'На головну',
      saveAddSub: 'Додати калькулятор',
      saveRemoveTitle: 'В обраному',
      saveRemoveSub: 'Видалити з головної',
      backMenu: 'Назад в меню',
    },
  }[lang]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="relative flex flex-col h-[100dvh] bg-[#12100E] text-[#F5F1EB] overflow-hidden justify-between"
    >
      {/* Верхний баннер с фоновым изображением */}
      <div className="absolute inset-0 h-[65vh] w-full overflow-hidden pointer-events-none">
        <img
          src="/CalcMenuPage/size.jpg"
          alt="Calculators Background"
          className="w-full h-full object-cover object-center opacity-40 brightness-75"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(18,16,14,0.2) 0%, rgba(18,16,14,0.7) 50%, #12100E 100%)',
          }}
        />
      </div>

      {/* Кнопка Назад вверху слева */}
      <div className="relative z-50 p-4">
        <button
          aria-label="Back"
          onClick={() => {
            triggerHaptic('light')
            onBack()
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1D1815]/70 backdrop-blur-md border border-white/10 text-[#F5F1EB] active:scale-90 transition-transform cursor-pointer"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Основной контент */}
      <div className="relative z-10 px-5 flex flex-col justify-end pb-24 flex-1">
        {/* Текстовый заголовок */}
        <div className="mb-6">
          <span className="text-[11px] font-semibold text-[#C6A47A] tracking-widest uppercase block mb-1.5">
            {t.category}
          </span>
          <h1 className="text-3xl font-serif text-[#F5F1EB] font-normal tracking-wide mb-2">
            {t.title}
          </h1>
          <p className="text-xs text-[#B9ACA0] leading-relaxed max-w-[290px]">
            {t.desc}
          </p>
        </div>

        {/* Сетка из 3 карточек */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {/* Карточка 1: Размеры */}
          <button
            onClick={() => {
              triggerHaptic('medium')
              onOpenSizeCalc?.()
            }}
            className="h-[125px] p-3 rounded-2xl bg-[#1D1815]/80 backdrop-blur-md border border-white/10 flex flex-col justify-between text-left transition-all active:scale-95 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#C6A47A]/15 text-[#C6A47A] flex items-center justify-center shadow-inner">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9M15 21V9" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[#F5F1EB] leading-tight">
                {t.sizeTitle}
              </div>
              <div className="text-[10px] text-[#B9ACA0] mt-0.5 leading-tight">
                {t.sizeSub}
              </div>
            </div>
          </button>

          {/* Карточка 2: Полнота */}
          <button
            onClick={() => {
              triggerHaptic('medium')
              onOpenWidthCalc?.()
            }}
            className="h-[125px] p-3 rounded-2xl bg-[#1D1815]/80 backdrop-blur-md border border-white/10 flex flex-col justify-between text-left transition-all active:scale-95 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shadow-inner">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[#F5F1EB] leading-tight">
                {t.widthTitle}
              </div>
              <div className="text-[10px] text-[#B9ACA0] mt-0.5 leading-tight">
                {t.widthSub}
              </div>
            </div>
          </button>

          {/* Карточка 3: Сохранить / В избранном */}
          <button
            onClick={() => {
              triggerHaptic(isCalcSaved ? 'light' : 'medium')
              setIsCalcSaved(!isCalcSaved)
            }}
            className={`h-[125px] p-3 rounded-2xl transition-all active:scale-95 cursor-pointer flex flex-col justify-between text-left ${
              isCalcSaved
                ? 'bg-gradient-to-b from-[#5C223C] to-[#3B1527] border border-[#F472B6]/40 shadow-lg shadow-[#5C223C]/30'
                : 'bg-[#1D1815]/80 backdrop-blur-md border border-white/10'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                isCalcSaved
                  ? 'bg-[#F472B6] text-white shadow-md'
                  : 'bg-white/10 text-[#B9ACA0]'
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={isCalcSaved ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[#F5F1EB] leading-tight">
                {isCalcSaved ? t.saveRemoveTitle : t.saveAddTitle}
              </div>
              <div
                className={`text-[10px] mt-0.5 leading-tight ${
                  isCalcSaved ? 'text-[#F472B6] font-medium' : 'text-[#B9ACA0]'
                }`}
              >
                {isCalcSaved ? t.saveRemoveSub : t.saveAddSub}
              </div>
            </div>
          </button>
        </div>

        {/* Текстовая кнопка "Назад в меню" */}
        <button
          onClick={() => {
            triggerHaptic('light')
            onBack()
          }}
          className="text-center text-[13px] text-[#B9ACA0] hover:text-[#F5F1EB] active:opacity-60 transition-opacity font-medium py-1 cursor-pointer"
        >
          {t.backMenu}
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
        <BottomDock active="search" lang={lang} />
      </div>
    </motion.div>
  )
}
