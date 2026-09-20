import { useState, useMemo, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'
import { getWidthData, SIZE_LIMITS, type Gender, type WidthCategory } from '../lib/shoeWidths'

type WidthCalcPageProps = {
  onBack: () => void
  lang: Lang
}

type InfoModalType = 'gostNum' | 'iso' | null
type Unit = 'mm' | 'in'

function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
    else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 15 : (style === 'heavy' ? 40 : 25))
  } catch {}
}

const StaticIcon = ({ type, className }: { type: 'length' | 'ball' | 'instep' | 'heel', className?: string }) => {
  const paths = {
    length: "M3 12h18M5 9v6M19 9v6",
    ball: "M12 5c-4.4 0-8 3.1-8 7s3.6 7 8 7 8-3.1 8-7",
    instep: "M4 16c0-6 4-10 8-10s8 4 8 10",
    heel: "M18 6L6 18M7 7l-2 2 2 2"
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`}>
      <path d={paths[type]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-[2px]">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0110 0v4"></path>
  </svg>
)

export function WidthCalcPage({ onBack, lang }: WidthCalcPageProps) {
  const safeLang = (lang && ['ru', 'uk', 'de'].includes(lang)) ? lang : 'uk'

  const t = {
    ru: {
      title: 'Полнота обуви',
      subtitle: 'Объем и маркировка',
      men: 'Мужской', women: 'Женский', kids: 'Детский',
      step1: 'Размер (EU)',
      step2: 'Полнота',
      cats: { narrow: 'Узкая', standard: 'Средняя', wide: 'Широкая', xwide: 'Очень шир.' },
      proModules: 'PRO: Конструктивные данные',
      buyPro: 'КУПИТЬ 1 ⭐️',
      loading: 'ОБРАБОТКА...',
      gostNum: 'ГОСТ RU (цифра)', gostLet: 'ГОСТ RU (буква)', iso: 'EU / ISO',
      mondopointLabel: 'Mondopoint',
      tableLength: 'Длина стопы', tableBall: 'Пучки (Обхват)', tableInstep: 'Прямой взъем', tableHeel: 'Косой обхват',
      understood: 'Закрыть',
      mm: 'мм',
      in: 'дюймы',
      modal: {
        gostNum: { title: 'Стандарты ГОСТ RU', text: 'ГОСТ 3927-88 (цифровая и буквенная системы). Определяет базовые обхваты колодки.' },
        iso: { title: 'Стандарт ISO', text: 'Международный стандарт ISO / EU для маркировки параметров обуви и колодок.' }
      }
    },
    uk: {
      title: 'Повнота взуття',
      subtitle: 'Об’єм та маркування',
      men: 'Чоловічий', women: 'Жіночий', kids: 'Дитячий',
      step1: 'Розмір (EU)',
      step2: 'Повнота',
      cats: { narrow: 'Вузька', standard: 'Середня', wide: 'Широка', xwide: 'Дуже шир.' },
      proModules: 'PRO: Конструктивні дані',
      buyPro: 'КУПИТИ 1 ⭐️',
      loading: 'ОБРОБКА...',
      gostNum: 'ДСТУ UKR (цифра)', gostLet: 'ДСТУ UKR (буква)', iso: 'EU / ISO',
      mondopointLabel: 'Mondopoint',
      tableLength: 'Довжина стопи', tableBall: 'Пучки (Обхват)', tableInstep: 'Прямий підйом', tableHeel: 'Косий обхват',
      understood: 'Закрити',
      mm: 'мм',
      in: 'дюйми',
      modal: {
        gostNum: { title: 'Стандарти ДСТУ UKR', text: 'ДСТУ 3927-88 (цифрова та літерна системи). Визначає базові обхвати колодки.' },
        iso: { title: 'Стандарт ISO', text: 'Міжнародний стандарт ISO / EU для маркування параметрів взуття та колодок.' }
      }
    },
    de: {
      title: 'Schuhweite',
      subtitle: 'Volumen & Markierung',
      men: 'Herren', women: 'Damen', kids: 'Kinder',
      step1: 'Größe (EU)',
      step2: 'Weite',
      cats: { narrow: 'Schmal', standard: 'Standard', wide: 'Weit', xwide: 'Sehr weit' },
      proModules: 'PRO: Konstruktionsdaten',
      buyPro: 'KAUFEN 1 ⭐️',
      loading: 'LÄDT...',
      gostNum: 'RU-Norm (Zahl)', gostLet: 'RU-Norm (Buchst.)', iso: 'EU / ISO',
      mondopointLabel: 'Mondopoint',
      tableLength: 'Fußlänge', tableBall: 'Ballenumfang', tableInstep: 'Ristumfang', tableHeel: 'Fersenumfang',
      understood: 'Schließen',
      mm: 'mm',
      in: 'in',
      modal: {
        gostNum: { title: 'Osteuropäische Norm', text: 'Der Standard 3927-88 (GOST/DSTU) nutzt ein Zahlen- und Buchstabensystem zur Definition der Leistenumfänge.' },
        iso: { title: 'ISO Standard', text: 'Internationaler ISO / EU Standard für die Markierung von Schuh- und Leistenparametern.' }
      }
    }
  }[safeLang]

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') return document.documentElement.classList.contains('dark')
    return true
  })

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const [gender, setGender] = useState<Gender>(() => (localStorage.getItem('wc_gender') as Gender) || 'men')
  const [sizeEu, setSizeEu] = useState<number>(() => Number(localStorage.getItem('wc_size')) || 42)
  const [widthCat, setWidthCat] = useState<WidthCategory>(() => (localStorage.getItem('wc_width') as WidthCategory) || 'standard')
  const [unit, setUnit] = useState<Unit>(() => (localStorage.getItem('wc_unit') as Unit) || 'mm')
  
  const [showPro, setShowPro] = useState(false)
  const [isProPurchased, setIsProPurchased] = useState(false) 
  const [isPurchasing, setIsPurchasing] = useState(false)
  
  const [activeInfo, setActiveInfo] = useState<InfoModalType>(null)

  const limits = SIZE_LIMITS[gender]
  const result = useMemo(() => getWidthData(gender, sizeEu, widthCat), [gender, sizeEu, widthCat])

  useEffect(() => {
    localStorage.setItem('wc_gender', gender)
    localStorage.setItem('wc_size', String(sizeEu))
    localStorage.setItem('wc_width', widthCat)
    localStorage.setItem('wc_unit', unit)
  }, [gender, sizeEu, widthCat, unit])

  const handleGender = (g: Gender) => {
    if (gender === g) return
    haptic('medium')
    setGender(g)
    const newLimits = SIZE_LIMITS[g]
    if (sizeEu < newLimits.min || sizeEu > newLimits.max) {
      setSizeEu(g === 'men' ? 42 : g === 'women' ? 38 : 28)
    }
  }

  const handleSizeChange = (newSize: number) => {
    const clamped = Math.max(limits.min, Math.min(limits.max, newSize))
    if (clamped !== sizeEu) {
      haptic('light')
      setSizeEu(clamped)
    } else if (newSize !== sizeEu) {
      haptic('heavy')
    }
  }

  // === ОПЛАТА TELEGRAM STARS ===
  const handleProClick = async () => {
    if (isProPurchased) {
      haptic('light');
      setShowPro(!showPro);
      return;
    }

    const tg = (window as any).Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;

    if (!userId) {
      alert("Ошибка: Откройте приложение через Telegram.");
      return;
    }

    setIsPurchasing(true);
    haptic('light');

    try {
      const response = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId, productId: "pro_width_calc" })
      });

      const data = await response.json();

      if (!response.ok || !data.invoiceLink) {
        throw new Error(data.error || "Ошибка генерации счета");
      }

      tg.openInvoice(data.invoiceLink, (status: string) => {
        console.log("=== Invoice status:", status, "===");

        if (status === 'paid') {
          haptic('heavy');
          setIsProPurchased(true);
          setShowPro(true);
        } else if (status === 'failed') {
          alert("Оплата была отменена или произошла ошибка. (status: failed)");
        } else if (status === 'cancelled') {
          console.log("Пользователь отменил оплату");
        } else {
          console.log("Неизвестный статус оплаты:", status);
        }
      });
    } catch (error: any) {
      console.error(error);
      alert(`Сбой сервера: ${error.message}`);
    } finally {
      setIsPurchasing(false);
    }
  };

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'

  return (
    <div className={`relative flex flex-col min-h-[100dvh] w-full max-w-[100vw] transition-colors duration-500 ${cBg} ${cText} overflow-hidden overflow-x-hidden`}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; -webkit-touch-callout: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .stagger-item {
          opacity: 0;
          animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* HEADER */}
      <header className="px-6 pt-8 pb-4 flex items-start justify-between z-20 shrink-0">
        <button 
          onClick={() => { haptic('light'); onBack(); }}
          className={`group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors`}
        >
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-24 scrollbar-hide w-full">
        
        {/* ЗАГОЛОВОК И ВКЛАДКИ ПОЛА */}
        <div className="stagger-item mb-12 w-full" style={{ animationDelay: '0.05s' }}>
          <p className={`text-[9px] font-sans font-medium uppercase tracking-[0.4em] mb-4 ${cTextMuted}`}>
            {t.subtitle}
          </p>
          <h1 className="font-serif text-[15vw] min-[400px]:text-6xl leading-[0.85] tracking-tight mb-8">
            {t.title}
          </h1>

          <div className={`flex gap-6 pb-3 border-b ${cLine}`}>
            {(['men', 'women', 'kids'] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => handleGender(g)}
                className={`text-[9px] font-sans uppercase tracking-[0.25em] transition-all outline-none border-none bg-transparent cursor-pointer ${
                  gender === g ? `italic \( {cText} opacity-100` : ` \){cTextMuted} opacity-60 hover:opacity-100`
                }`}
              >
                {t[g]}
              </button>
            ))}
          </div>
        </div>

        {/* СЕКЦИЯ: ВВОД РАЗМЕРА И ПОЛНОТЫ */}
        <div className="stagger-item mb-16 w-full" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <span className={`text-[9px] font-sans uppercase tracking-[0.25em] ${cTextMuted}`}>
                {t.step1}
              </span>
              <span className={`text-[9px] font-sans font-light mt-1 ${cTextMuted}`}>
                ({limits.min} — {limits.max})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between w-full mb-12">
            <button
              onClick={() => handleSizeChange(sizeEu - 1)}
              disabled={sizeEu <= limits.min}
              className={`w-12 h-12 flex items-center justify-center rounded-full border ${cLine} ${cTextMuted} active:scale-90 transition-transform disabled:opacity-20 bg-transparent outline-none cursor-pointer`}
            >
              <span className="text-[20px] font-light leading-none mb-1">-</span>
            </button>

            <div className="text-center w-full max-w-[200px]">
              <span className={`text-[20vw] md:text-[90px] font-serif leading-none tracking-tighter ${cText}`}>
                {sizeEu}
              </span>
            </div>

            <button
              onClick={() => handleSizeChange(sizeEu + 1)}
              disabled={sizeEu >= limits.max}
              className={`w-12 h-12 flex items-center justify-center rounded-full border ${cLine} ${cTextMuted} active:scale-90 transition-transform disabled:opacity-20 bg-transparent outline-none cursor-pointer`}
            >
              <span className="text-[20px] font-light leading-none mb-0.5">+</span>
            </button>
          </div>

          {/* Категории полноты */}
          <div className="mb-4">
            <span className={`text-[9px] font-sans uppercase tracking-[0.25em] block mb-5 ${cTextMuted}`}>
              {t.step2}
            </span>
            <div className={`flex overflow-x-auto gap-5 pb-4 border-b ${cLine} scrollbar-hide`}>
              {(Object.keys(t.cats) as WidthCategory[]).map(cat => (
                <button
                  key={cat} 
                  onClick={() => { haptic('light'); setWidthCat(cat); }}
                  className={`text-[10px] min-[390px]:text-[11px] font-sans uppercase tracking-[0.2em] whitespace-nowrap transition-all outline-none border-none bg-transparent cursor-pointer ${
                    widthCat === cat ? `italic \( {cText} opacity-100` : ` \){cTextMuted} opacity-40 hover:opacity-100`
                  }`}
                >
                  {t.cats[cat]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* СЕКЦИЯ: РЕЗУЛЬТАТ (US / UK) */}
        <div className={`stagger-item border-b ${cLine} pb-12 mb-12 flex justify-between px-4 md:px-12`} style={{ animationDelay: '0.15s' }}>
          <div className="flex flex-col items-center gap-4 w-1/2">
            <span className={`text-[9px] font-sans uppercase tracking-[0.3em] ${cTextMuted}`}>US Size</span>
            <span className={`font-serif text-[60px] md:text-[80px] leading-none ${cText}`}>{result.us}</span>
          </div>
          <div className="flex flex-col items-center gap-4 w-1/2">
            <span className={`text-[9px] font-sans uppercase tracking-[0.3em] ${cTextMuted}`}>UK Size</span>
            <span className={`font-serif text-[60px] md:text-[80px] leading-none ${cText}`}>{result.uk}</span>
          </div>
        </div>

        {/* PRO DATA - БЛОК С ОПЛАТОЙ */}
        <div className="stagger-item w-full" style={{ animationDelay: '0.2s' }}>
          <button
            onClick={handleProClick}
            disabled={isPurchasing}
            className={`w-full flex items-center justify-between pb-4 border-b transition-colors outline-none bg-transparent cursor-pointer ${cLine} ${cTextMuted} hover:text-current`}
          >
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-sans uppercase tracking-[0.2em]">
                {t.proModules}
              </span>
              {!isProPurchased && (
                <span className={`flex items-center gap-1 text-[8px] font-sans uppercase tracking-[0.1em] px-2 py-0.5 rounded-sm border ${cLine} text-[#FFB020] border-[#FFB020]/30 bg-[#FFB020]/10`}>
                  <LockIcon /> {t.buyPro}
                </span>
              )}
            </div>
            
            {isPurchasing ? (
              <span className="text-[8px] font-sans uppercase animate-pulse">{t.loading}</span>
            ) : (
              <motion.div animate={{ rotate: showPro ? 180 : 0 }} transition={{ duration: 0.3 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 9l-7 7-7-7" /></svg>
              </motion.div>
            )}
          </button>

          <AnimatePresence>
            {showPro && isProPurchased && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-8 space-y-12 pb-4">
                  
                  {/* Standards (ГОСТ / ISO) */}
                  <div className={`grid grid-cols-3 gap-2 border-b ${cLine} pb-8`}>
                    {[
                      { key: 'gostNum' as const, label: t.gostNum, value: result.gostNum },
                      { key: 'gostNum' as const, label: t.gostLet, value: result.gostLetter },
                      { key: 'iso' as const, label: t.iso, value: result.euCode },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => { haptic('light'); setActiveInfo(item.key); }}
                        className="flex flex-col items-center justify-between cursor-pointer group"
                      >
                        <span className={`text-[8px] font-sans uppercase tracking-widest text-center leading-tight mb-4 ${cTextMuted} group-hover:text-current transition-colors`}>
                          {item.label}
                        </span>
                        <span className={`font-serif text-3xl md:text-4xl ${cText}`}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Dimensions Table */}
                  <div>
                    <div className="flex justify-between items-center pb-6">
                      <span className={`text-[9px] font-sans uppercase tracking-[0.3em] ${cTextMuted}`}>
                        {t.mondopointLabel}
                      </span>
                      <div className="flex gap-5">
                        {(['mm', 'in'] as Unit[]).map(u => (
                          <button 
                            key={u}
                            onClick={() => { haptic('light'); setUnit(u) }}
                            className={`text-[9px] font-sans uppercase tracking-[0.2em] transition-colors outline-none border-none bg-transparent cursor-pointer ${
                              unit === u ? `italic \( {cText} opacity-100` : ` \){cTextMuted} opacity-40 hover:opacity-100`
                            }`}
                          >
                            {t[u]}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-0">
                      {[
                        { id: 'length' as const, label: t.tableLength, valMm: result.footLengthMm, valIn: result.footLengthIn },
                        { id: 'ball' as const, label: t.tableBall, valMm: result.girthMm, valIn: result.girthIn },
                        { id: 'instep' as const, label: t.tableInstep, valMm: result.instepMm, valIn: result.instepIn },
                        { id: 'heel' as const, label: t.tableHeel, valMm: result.heelMm, valIn: result.heelIn }
                      ].map((row) => (
                        <div key={row.id} className={`flex justify-between items-end py-5 border-b ${cLine}`}>
                          <div className="flex items-center gap-4">
                            <StaticIcon type={row.id} className={cTextMuted} />
                            <span className={`text-[12px] font-sans font-light tracking-wide ${cText}`}>
                              {row.label}
                            </span>
                          </div>
                          <span className={`font-serif text-2xl md:text-3xl ${cText}`}>
                            {unit === 'mm' ? row.valMm : row.valIn}
                            <span className={`font-sans text-[10px] ml-1.5 ${cTextMuted}`}>
                              {unit === 'mm' ? 'mm' : 'in'}
                            </span>
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

      {/* MODAL */}
      <AnimatePresence>
        {activeInfo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            onClick={() => setActiveInfo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className={`w-full max-w-[320px] p-8 border ${cLine} ${cBg} shadow-2xl flex flex-col`}
            >
              <h3 className={`font-serif text-2xl leading-tight mb-4 ${cText}`}>
                {t.modal[activeInfo].title}
              </h3>
              <p className={`text-[12px] font-sans font-light leading-[1.6] mb-8 ${cTextMuted}`}>
                {t.modal[activeInfo].text}
              </p>
              
              <button
                onClick={() => setActiveInfo(null)}
                className={`w-full py-4 border transition-all active:scale-95 text-[9px] font-sans uppercase tracking-[0.3em] ${cText} ${cLine} hover:bg-current/5`}
              >
                {t.understood}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
