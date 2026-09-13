import { useState, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
import type { Lang } from '../App'

// ЭКСПОРТИРУЕМ КОЛИЧЕСТВО ДЛЯ HOMEPAGE
export const CALCULATORS_COUNT = 5;

type CalcMenuPageProps = {
  onBack: () => void
  lang: Lang
  onOpenSizeCalc?: () => void
  onOpenWidthCalc?: () => void
  onOpenHeelCalc?: () => void
  onOpenColorCalc?: () => void
  onOpenSalaryCalc?: () => void 
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

type MenuItem = {
  id: string
  title: string
  subtitle: string
  action?: () => void
}

function haptic(kind: 'light' | 'medium' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(kind)
    else if (navigator.vibrate) navigator.vibrate(kind === 'light' ? 20 : 40)
  } catch {}
}

export function CalcMenuPage({
  onBack,
  lang,
  onOpenSizeCalc,
  onOpenWidthCalc,
  onOpenHeelCalc,
  onOpenColorCalc,
  onOpenSalaryCalc,
  isFavorite = false,
  onToggleFavorite,
}: CalcMenuPageProps) {
  const [isDark, setIsDark] = useState(true)

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

    const savedTheme = localStorage.getItem('cordwainer_theme')
    if (savedTheme) {
      setIsDark(savedTheme === 'dark')
    } else {
      setIsDark(document.documentElement.classList.contains('dark'))
    }

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const t = {
    ru: {
      title: 'Расчёты',
      subtitle: 'Инструментарий PRO',
      sizeTitle: 'Размеры',
      sizeSub: 'UK, US, EU, UKR',
      widthTitle: 'Полнота',
      widthSub: 'Обхват и форма',
      heelTitle: 'Каблук',
      heelSub: 'Биомеханика (H)',
      colorTitle: 'Колористика',
      colorSub: 'Смешивание красок',
      salaryTitle: 'Зарплата',
      salarySub: 'Сдельная оплата',
      saveAddTitle: 'В закладки',
      saveAddSub: 'Сохранить раздел',
      saveRemoveTitle: 'Сохранено',
      saveRemoveSub: 'Удалить из закладок',
    },
    uk: {
      title: 'Розрахунки',
      subtitle: 'Інструментарій PRO',
      sizeTitle: 'Розміри',
      sizeSub: 'UK, US, EU, UKR',
      widthTitle: 'Повнота',
      widthSub: 'Обхват та форма',
      heelTitle: 'Підбор',
      heelSub: 'Біомеханіка (H)',
      colorTitle: 'Колористика',
      colorSub: 'Змішування фарб',
      salaryTitle: 'Зарплата',
      salarySub: 'Відрядна оплата',
      saveAddTitle: 'У закладки',
      saveAddSub: 'Зберегти розділ',
      saveRemoveTitle: 'Збережено',
      saveRemoveSub: 'Видалити з закладок',
    },
    de: {
      title: 'Rechner',
      subtitle: 'PRO Werkzeuge',
      sizeTitle: 'Größen',
      sizeSub: 'UK, US, EU, UKR',
      widthTitle: 'Weite',
      widthSub: 'Umfang & Form',
      heelTitle: 'Absatz',
      heelSub: 'Biomechanik (H)',
      colorTitle: 'Farben',
      colorSub: 'Farbmischung',
      salaryTitle: 'Lohn',
      salarySub: 'Akkordlohn',
      saveAddTitle: 'Speichern',
      saveAddSub: 'Zum Archiv',
      saveRemoveTitle: 'Gespeichert',
      saveRemoveSub: 'Aus Archiv entfernen',
    },
  }[lang]

  const CALCS: MenuItem[] = [
    { id: 'size', title: t.sizeTitle, subtitle: t.sizeSub, action: onOpenSizeCalc },
    { id: 'width', title: t.widthTitle, subtitle: t.widthSub, action: onOpenWidthCalc },
    { id: 'heel', title: t.heelTitle, subtitle: t.heelSub, action: onOpenHeelCalc },
    { id: 'color', title: t.colorTitle, subtitle: t.colorSub, action: onOpenColorCalc },
    { id: 'salary', title: t.salaryTitle, subtitle: t.salarySub, action: onOpenSalaryCalc },
  ]

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'

  const cGrad = isDark ? 'from-[#0A0A0A] via-[#0A0A0A]/90' : 'from-[#F2EFE9] via-[#F2EFE9]/90'
  const imgOpacity = isDark ? '0.35' : '0.6'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`relative min-h-[100dvh] w-full ${cBg} ${cText}`}
    >
      <style>{`
        /* Жесткое отключение вспышек и мерцания при тапе на мобилках */
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none;
        }
        
        button {
          background-color: transparent;
        }

        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes coutureZoom {
          0% { opacity: 0; transform: scale(1.03); }
          100% { opacity: var(--img-opacity); transform: scale(1); }
        }
        .stagger-item {
          opacity: 0;
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .anim-bg {
          animation: coutureZoom 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* ФОН */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="/CalcMenuPage/size.jpg"
          alt=""
          style={{ '--img-opacity': imgOpacity } as React.CSSProperties}
          className={`anim-bg absolute inset-0 w-full h-full object-cover object-[center_top] ${isDark ? 'grayscale-[40%]' : 'grayscale-[10%]'}`}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        <div className={`absolute bottom-0 left-0 right-0 h-[85%] bg-gradient-to-t ${cGrad} to-transparent`} />
      </div>

      {/* HEADER */}
      <header className="relative z-20 px-6 pt-8 pb-4 flex items-start justify-between">
        <button 
          onClick={() => { haptic('light'); onBack(); }}
          className={`group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none cursor-pointer ${cTextMuted} ${cHover}`}
        >
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>
      </header>

      {/* КОНТЕНТ */}
      <div className="relative z-10 px-6 pb-24 mt-4">
        
        {/* ЗАГОЛОВОК */}
        <div className="stagger-item mb-16" style={{ animationDelay: '0.05s' }}>
          <p className={`text-[9px] font-sans font-medium uppercase tracking-[0.3em] mb-4 ${cTextMuted}`}>
            {t.subtitle}
          </p>
          <h1 className="font-serif text-[16vw] min-[400px]:text-6xl leading-[0.85] tracking-tight">
            {t.title}
          </h1>
        </div>

        {/* СПИСОК КАЛЬКУЛЯТОРОВ */}
        <div className="flex flex-col mb-16">
          {CALCS.map((item, idx) => {
            const num = idx + 1
            const numStr = num < 10 ? `0${num}` : `${num}`
            
            return (
              <div key={item.id} className="stagger-item" style={{ animationDelay: `${0.1 + idx * 0.04}s` }}>
                <button
                  onClick={() => { haptic('medium'); item.action?.(); }}
                  className={`w-full group relative flex items-end justify-between py-6 border-b outline-none border-0 bg-transparent cursor-pointer ${cLine} text-left`}
                >
                  <div className="flex items-start gap-4">
                    <span className={`text-[9px] font-sans tracking-widest mt-2 ${cTextMuted}`}>
                      {numStr}
                    </span>
                    <div className="font-serif text-[7vw] min-[375px]:text-3xl leading-[1.1] transition-transform group-hover:translate-x-1">
                      {item.title}
                    </div>
                  </div>
                  <div className={`text-[10px] font-sans tracking-[0.1em] text-right w-[40%] ${cTextMuted}`}>
                    {item.subtitle}
                  </div>
                </button>
              </div>
            )
          })}
        </div>

        {/* ИЗБРАННОЕ */}
        <div className="stagger-item" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={() => { haptic(isFavorite ? 'light' : 'medium'); onToggleFavorite?.(); }}
            className={`w-full flex items-center justify-between p-6 border outline-none bg-transparent cursor-pointer transition-colors duration-300 ${
              isFavorite 
                ? `${isDark ? 'border-white/30 bg-white/5' : 'border-black/30 bg-black/5'}` 
                : `${cLine}`
            }`}
          >
            <div className="text-left">
              <div className="font-serif text-[26px] leading-none mb-2">
                {isFavorite ? t.saveRemoveTitle : t.saveAddTitle}
              </div>
              <div className={`text-[10px] font-sans uppercase tracking-[0.2em] ${isFavorite ? cText : cTextMuted}`}>
                {isFavorite ? t.saveRemoveSub : t.saveAddSub}
              </div>
            </div>
            
            <div className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors duration-300 ${
              isFavorite 
                ? `${isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black'}` 
                : `bg-transparent ${cLine} ${cTextMuted}`
            }`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </button>
        </div>

      </div>
    </motion.div>
  )
}
