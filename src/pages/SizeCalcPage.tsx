import { useMemo, useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'
import {
  convertShoeSize,
  formatSize,
  RANGES,
  type Gender,
} from '../lib/shoeSizes'

type SizeCalcPageProps = {
  onBack: () => void
  lang: Lang
}

const FlagEU = () => (
  <svg width="14" height="10" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="12" fill="#003399" />
    <g fill="#FFCC00">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const a = (i * 30 - 90) * (Math.PI / 180)
        return <circle key={i} cx={9 + 3.8 * Math.cos(a)} cy={6 + 3.8 * Math.sin(a)} r="0.55" />
      })}
    </g>
  </svg>
)

const FlagUA = () => (
  <svg width="14" height="10" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="6" fill="#0057B7" />
    <rect y="6" width="18" height="6" fill="#FFD700" />
  </svg>
)

const FlagUK = () => (
  <svg width="14" height="10" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="12" fill="#012169" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#fff" strokeWidth="2" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#C8102E" strokeWidth="1" />
    <path d="M9 0 V12 M0 6 H18" stroke="#fff" strokeWidth="3.2" />
    <path d="M9 0 V12 M0 6 H18" stroke="#C8102E" strokeWidth="1.6" />
  </svg>
)

const FlagUS = () => (
  <svg width="14" height="10" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="12" fill="#B22234" />
    <rect y="1.33" width="18" height="1.33" fill="#fff" />
    <rect y="4" width="18" height="1.33" fill="#fff" />
    <rect y="6.67" width="18" height="1.33" fill="#fff" />
    <rect y="9.33" width="18" height="1.33" fill="#fff" />
    <rect width="7.2" height="6.5" fill="#3C3B6E" />
  </svg>
)

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0110 0v4"></path>
  </svg>
)

// ИСПРАВЛЕНО: добавлено разрешение на параметр 'heavy'
function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
    else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 15 : (style === 'heavy' ? 40 : 25))
  } catch {}
}

export function SizeCalcPage({ onBack, lang }: SizeCalcPageProps) {
  const safeLang = (lang && ['ru', 'uk', 'de'].includes(lang)) ? lang : 'uk'

  const t = {
    ru: {
      title: 'Размер обуви',
      subtitle: 'Анатомия длины',
      step1: 'Длина стопы',
      step1Hint: 'Пятка — длинный палец',
      howToMeasureBtn: 'Как измерить',
      measureGuide1: '1. Встаньте на лист бумаги (в носках).',
      measureGuide2: '2. Обведите стопу, держа ручку строго вертикально.',
      measureGuide3: '3. Измерьте расстояние от пятки до самого длинного пальца.',
      measureTip: 'Измеряйте стопу во второй половине дня — к вечеру ноги немного отекают.',
      recommended: 'Рекомендуемый размер',
      disclaimer: 'Размеры ориентировочны и зависят от конкретной колодки.',
      howCalculated: 'Стандарты',
      hide: 'Скрыть',
      men: 'Мужской',
      women: 'Женский',
      kids: 'Детский',
      cm: 'см',
      mm: 'мм',
      cmLabel: 'см',
      mmLabel: 'мм',
      standardsNote: 'ISO 19407:2023 и ISO 9407 (Mondopoint).',
      isoEu: 'ISO 19407 · Paris Point',
      isoUk: 'ISO 19407 · Barleycorn',
      isoUs: 'ISO 19407 · UK + сдвиг',
      isoMondo: 'ISO 9407 · мм стопы',
      proTitle: 'Global Sizing',
      proDesc: 'Откройте точную конвертацию в международные стандарты США (US) и Великобритании (UK).',
      proBtn: 'РАЗБЛОКИРОВАТЬ ЗА 1 ⭐️',
      loading: 'ОБРАБОТКА...'
    },
    uk: {
      title: 'Розмір взуття',
      subtitle: 'Анатомія довжини',
      step1: 'Довжина стопи',
      step1Hint: 'П’ята — найдовший палець',
      howToMeasureBtn: 'Як виміряти',
      measureGuide1: '1. Станьте на аркуш паперу (у шкарпетках).',
      measureGuide2: '2. Обведіть стопу, тримаючи ручку строго вертикально.',
      measureGuide3: '3. Виміряйте відстань від п’яти до найдовшого пальця.',
      measureTip: 'Вимірюйте стопу в другій половині дня — до вечора ноги трохи набрякають.',
      recommended: 'Рекомендований розмір',
      disclaimer: 'Розміри орієнтовні і залежать від конкретної колодки.',
      howCalculated: 'Стандарти',
      hide: 'Сховати',
      men: 'Чоловічий',
      women: 'Жіночий',
      kids: 'Дитячий',
      cm: 'см',
      mm: 'мм',
      cmLabel: 'см',
      mmLabel: 'мм',
      standardsNote: 'ISO 19407:2023 та ISO 9407 (Mondopoint).',
      isoEu: 'ISO 19407 · Paris Point',
      isoUk: 'ISO 19407 · Barleycorn',
      isoUs: 'ISO 19407 · UK + зсув',
      isoMondo: 'ISO 9407 · мм стопи',
      proTitle: 'Global Sizing',
      proDesc: 'Відкрийте точну конвертацію в міжнародні стандарти США (US) та Великобританії (UK).',
      proBtn: 'РОЗБЛОКУВАТИ ЗА 1 ⭐️',
      loading: 'ОБРОБКА...'
    },
    de: {
      title: 'Schuhgröße',
      subtitle: 'Anatomie der Länge',
      step1: 'Fußlänge',
      step1Hint: 'Ferse — Längster Zeh',
      howToMeasureBtn: 'Wie messen',
      measureGuide1: '1. Stellen Sie sich auf ein Blatt Papier (in Socken).',
      measureGuide2: '2. Umranden Sie den Fuß, halten Sie den Stift senkrecht.',
      measureGuide3: '3. Messen Sie den Abstand von der Ferse bis zum längsten Zeh.',
      measureTip: 'Messen Sie am Nachmittag — Füße schwellen im Laufe des Tages leicht an.',
      recommended: 'Empfohlene Größe',
      disclaimer: 'Die Größen sind Richtwerte und hängen vom jeweiligen Leisten ab.',
      howCalculated: 'Standards',
      hide: 'Verbergen',
      men: 'Herren',
      women: 'Damen',
      kids: 'Kinder',
      cm: 'cm',
      mm: 'mm',
      cmLabel: 'cm',
      mmLabel: 'mm',
      standardsNote: 'ISO 19407:2023 und ISO 9407 (Mondopoint).',
      isoEu: 'ISO 19407 · Paris Point',
      isoUk: 'ISO 19407 · Barleycorn',
      isoUs: 'ISO 19407 · UK + Offset',
      isoMondo: 'ISO 9407 · Fuß in mm',
      proTitle: 'Global Sizing',
      proDesc: 'Schalten Sie die genaue Umrechnung in US- und UK-Standards frei.',
      proBtn: 'FREISCHALTEN FÜR 1 ⭐️',
      loading: 'LÄDT...'
    },
  }[safeLang]

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
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

  const [gender, setGender] = useState<Gender>('men')
  const [unit, setUnit] = useState<'cm' | 'mm'>('cm')
  const [footMm, setFootMm] = useState<number>(RANGES.men.default)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [showStandards, setShowStandards] = useState(false)
  const [showMeasureGuide, setShowMeasureGuide] = useState(false)
  
  // Состояния для Paywall (Neon DB)
  const [isProPurchased, setIsProPurchased] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const range = RANGES[gender]

  const handleGenderChange = useCallback((g: Gender) => {
    setGender(g)
    const r = RANGES[g]
    setFootMm((prev) => Math.min(r.max, Math.max(r.min, prev)))
  }, [])

  const result = useMemo(() => convertShoeSize(footMm, gender), [footMm, gender])
  const displayValue = unit === 'cm' ? (footMm / 10).toFixed(1).replace('.', ',') : String(Math.round(footMm))
  const pct = ((footMm - range.min) / (range.max - range.min)) * 100

  // Автоматическая проверка покупки при загрузке
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id
    if (!userId) return

    fetch(`/api/check-purchase?userId=${userId}&productId=pro_sizes`)
      .then(res => res.json())
      .then(data => {
        if (data.purchased) setIsProPurchased(true)
      })
      .catch(err => console.error("Ошибка проверки покупки:", err))
  }, [])

  const handleProClick = async () => {
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
        body: JSON.stringify({ userId, productId: "pro_sizes" }) 
      });

      const data = await response.json();
      if (!response.ok || !data.invoiceLink) throw new Error(data.error);

      tg.openInvoice(data.invoiceLink, (status: string) => {
        if (status === 'paid') {
          haptic('heavy');
          setIsProPurchased(true); 
        } else if (status === 'failed') {
          alert("Оплата была отменена или произошла ошибка.");
        }
      });
    } catch (error: any) {
      console.error(error);
      alert(`Сбой сервера: ${error.message}`);
    } finally {
      setIsPurchasing(false);
    }
  };

  const startEdit = () => {
    setEditValue(unit === 'cm' ? (footMm / 10).toFixed(1) : String(Math.round(footMm)))
    setIsEditing(true)
  }

  const commitEdit = () => {
    const raw = parseFloat(editValue.replace(',', '.'))
    if (!isNaN(raw)) {
      const mm = unit === 'cm' ? raw * 10 : raw
      setFootMm(Math.min(range.max, Math.max(range.min, mm)))
      haptic('light')
    }
    setIsEditing(false)
  }

  const stepValue = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setFootMm((prev) => {
      const next = Math.min(range.max, Math.max(range.min, prev + delta))
      if (next !== prev) haptic('light')
      return next
    })
  }

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const usLabel = gender === 'kids' ? 'US' : gender === 'men' ? 'US M' : 'US W'

  // Цветовые токены
  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'
  const trackColor = isDark ? '#F4F0E8' : '#1C1816'
  const trackBgColor = isDark ? 'rgba(244,240,232,0.15)' : 'rgba(28,24,22,0.15)'

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

        /* Журнальный ползунок */
        input[type=range] {
          -webkit-appearance: none;
          background: transparent;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 1px;
          background: ${trackBgColor};
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: ${trackColor};
          margin-top: -5.5px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
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
                onClick={() => { haptic('light'); handleGenderChange(g); }}
                className={`text-[9px] font-sans uppercase tracking-[0.25em] transition-all outline-none border-none bg-transparent cursor-pointer ${
                  gender === g ? `italic ${cText} opacity-100` : `${cTextMuted} opacity-60 hover:opacity-100`
                }`}
              >
                {t[g]}
              </button>
            ))}
          </div>
        </div>

        {/* СЕКЦИЯ: ВВОД ДЛИНЫ СТОПЫ */}
        <div className="stagger-item mb-16 w-full" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-8">
            <span className={`text-[9px] font-sans uppercase tracking-[0.25em] ${cTextMuted}`}>
              {t.step1}
            </span>
            <div className="flex gap-4">
               {(['cm', 'mm'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => { haptic('light'); setUnit(u); }}
                  className={`text-[11px] font-sans transition-all outline-none border-none bg-transparent cursor-pointer ${
                    unit === u ? `italic ${cText} opacity-100` : `${cTextMuted} opacity-40`
                  }`}
                >
                  {u === 'cm' ? t.cmLabel : t.mmLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Гигантский ввод */}
          <div className="flex items-center justify-between w-full mb-10">
            <button
              onClick={(e) => stepValue(-1, e)}
              disabled={footMm <= range.min}
              className={`w-12 h-12 flex items-center justify-center rounded-full border ${cLine} ${cTextMuted} active:scale-90 transition-transform disabled:opacity-20 bg-transparent outline-none cursor-pointer`}
            >
              <span className="text-[20px] font-light leading-none mb-1">-</span>
            </button>

            <div className="text-center w-full max-w-[200px]" onClick={startEdit}>
              {isEditing ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                  onBlur={commitEdit}
                  onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                  className={`w-full text-center text-[20vw] md:text-[90px] font-serif leading-none tracking-tighter bg-transparent outline-none border-none ${cText}`}
                  inputMode="decimal"
                />
              ) : (
                <div className="cursor-pointer active:opacity-50 transition-opacity">
                  <span className={`text-[20vw] md:text-[90px] font-serif leading-none tracking-tighter ${cText}`}>
                    {displayValue}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={(e) => stepValue(1, e)}
              disabled={footMm >= range.max}
              className={`w-12 h-12 flex items-center justify-center rounded-full border ${cLine} ${cTextMuted} active:scale-90 transition-transform disabled:opacity-20 bg-transparent outline-none cursor-pointer`}
            >
              <span className="text-[20px] font-light leading-none mb-0.5">+</span>
            </button>
          </div>

          {/* Журнальный Slider */}
          <div className="relative w-full px-2 mb-6">
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={1}
              value={footMm}
              onChange={(e) => setFootMm(Number(e.target.value))}
              onPointerUp={() => haptic('light')}
              className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
            />
            <div className="w-full h-[1px] relative pointer-events-none" style={{ backgroundColor: trackBgColor }}>
               <div className="absolute top-0 left-0 h-full" style={{ width: `${pct}%`, backgroundColor: trackColor }} />
               <div 
                 className="absolute top-1/2 -translate-y-1/2 w-[12px] h-[12px] rounded-full shadow-md"
                 style={{ left: `calc(${pct}% - 6px)`, backgroundColor: trackColor }}
               />
            </div>
            <div className={`flex justify-between mt-4 text-[10px] font-sans ${cTextMuted}`}>
              <span>{unit === 'cm' ? (range.min / 10).toFixed(1) : range.min}</span>
              <span>{unit === 'cm' ? (range.max / 10).toFixed(1) : range.max}</span>
            </div>
          </div>

          {/* Кнопка "Как измерить" */}
          <button
            onClick={() => { haptic('light'); setShowMeasureGuide((v) => !v); }}
            className={`text-[9px] font-sans uppercase tracking-[0.2em] border-b pb-1 transition-colors ${cTextMuted} hover:text-current ${cLine} mx-auto block`}
          >
            {t.howToMeasureBtn}
          </button>

          <AnimatePresence>
            {showMeasureGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`mt-6 pt-6 border-t ${cLine} flex flex-col gap-4`}>
                  <p className={`text-[12px] font-sans font-light leading-[1.6] ${cTextMuted}`}>
                    {t.measureGuide1}
                  </p>
                  <p className={`text-[12px] font-sans font-light leading-[1.6] ${cTextMuted}`}>
                    {t.measureGuide2}
                  </p>
                  <p className={`text-[12px] font-sans font-light leading-[1.6] ${cTextMuted}`}>
                    {t.measureGuide3}
                  </p>
                  <p className={`text-[12px] font-sans font-light leading-[1.6] italic mt-2 ${cTextMuted}`}>
                    {t.measureTip}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* СЕКЦИЯ: РЕЗУЛЬТАТ (ОГРОМНЫЕ ЦИФРЫ И PAYWALL) */}
        <div className={`stagger-item border-t border-b ${cLine} py-12 flex flex-col items-center justify-center mb-12`} style={{ animationDelay: '0.15s' }}>
          
          {/* Главный EU размер (Бесплатно) */}
          <div className="flex items-center gap-3 mb-6 grayscale opacity-80">
            <FlagEU />
            <span className={`text-[9px] font-sans uppercase tracking-[0.3em] ${cTextMuted}`}>EU / UKR</span>
            <FlagUA />
          </div>

          <div className={`font-serif text-[28vw] md:text-[180px] leading-none tracking-tighter mb-4 ${cText}`}>
            {formatSize(result.eu)}
          </div>
          
          <div className="flex flex-col items-center mb-10">
            <div className={`text-[9px] font-sans uppercase tracking-[0.3em] ${cTextMuted} mb-2`}>
              {t.recommended}
            </div>
            <div className={`text-[11px] font-sans ${cTextMuted}`}>
              {result.cm.toFixed(1).replace('.', ',')} {t.cmLabel}
            </div>
          </div>

          {/* PRO DATA - ЖУРНАЛЬНАЯ ВРЕЗКА (Скрывает UK и US до оплаты) */}
          <div className="w-full mt-2">
            {!isProPurchased ? (
              // Состояние: НЕ КУПЛЕНО (Элегантная карточка)
              <div className={`p-8 border ${cLine} flex flex-col items-center text-center relative overflow-hidden`}>
                <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l ${cLine}`} />
                <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${cLine}`} />
                <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${cLine}`} />
                <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r ${cLine}`} />

                <h3 className={`font-serif text-2xl tracking-tight mb-3 ${cText}`}>
                  {t.proTitle}
                </h3>
                
                <p className={`text-[10px] min-[390px]:text-[11px] font-sans font-light leading-relaxed mb-8 max-w-[280px] ${cTextMuted}`}>
                  {t.proDesc}
                </p>

                <button
                  onClick={handleProClick}
                  disabled={isPurchasing}
                  className={`group flex items-center justify-center gap-3 w-full py-4 border ${cLine} ${cText} hover:bg-current/5 active:scale-95 transition-all outline-none bg-transparent cursor-pointer`}
                >
                  {isPurchasing ? (
                    <span className="text-[10px] font-sans uppercase tracking-[0.2em] animate-pulse">
                      {t.loading}
                    </span>
                  ) : (
                    <>
                      <LockIcon />
                      <span className="text-[10px] font-sans uppercase tracking-[0.2em]">
                        {t.proBtn}
                      </span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              // Состояние: КУПЛЕНО (Раскрытые размеры)
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex justify-center gap-16 md:gap-24 px-2 md:px-10"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 grayscale opacity-80 h-4">
                    <FlagUK />
                    <span className={`text-[9px] font-sans uppercase tracking-[0.2em] ${cTextMuted}`}>UK</span>
                  </div>
                  <span className={`font-serif text-4xl md:text-5xl ${cText}`}>
                    {formatSize(result.uk)}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 grayscale opacity-80 h-4">
                    <FlagUS />
                    <span className={`text-[9px] font-sans uppercase tracking-[0.2em] ${cTextMuted}`}>{usLabel}</span>
                  </div>
                  <span className={`font-serif text-4xl md:text-5xl ${cText}`}>
                    {formatSize(result.us)}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* СТАНДАРТЫ */}
        <div className="stagger-item flex flex-col items-center mb-10" style={{ animationDelay: '0.2s' }}>
          <p className={`text-[11px] font-sans font-light leading-snug text-center mb-6 max-w-sm ${cTextMuted}`}>
            {t.disclaimer}
          </p>

          <button
            onClick={() => { haptic('light'); setShowStandards((v) => !v); }}
            className={`text-[9px] font-sans uppercase tracking-[0.2em] border-b pb-1 transition-colors ${cTextMuted} hover:text-current ${cLine}`}
          >
            {showStandards ? t.hide : t.howCalculated}
          </button>

          <AnimatePresence>
            {showStandards && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden w-full max-w-sm"
              >
                <div className={`mt-8 pt-6 border-t ${cLine} space-y-4`}>
                  {[
                    { label: 'EU / UKR', val: t.isoEu },
                    { label: 'UK', val: t.isoUk },
                    { label: 'US', val: t.isoUs },
                    { label: 'Mondopoint', val: t.isoMondo },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] font-sans font-light tracking-wide">
                      <span className={`${cText}`}>{row.label}</span>
                      <span className={`${cTextMuted}`}>{row.val}</span>
                    </div>
                  ))}
                  <p className={`text-[10px] font-sans font-light italic mt-6 pt-4 border-t ${cLine} ${cTextMuted} text-center`}>
                    {t.standardsNote}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  )
}
