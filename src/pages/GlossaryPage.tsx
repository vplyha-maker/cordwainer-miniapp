import { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react'
import {
  GLOSSARY_TERMS,
  searchTerms,
  type GlossaryTerm,
} from '../data/glossary'
import type { Lang } from '../App'
import { FlipCard } from './FlipCard' // Импортируйте ваш путь к карточке

type GlossaryPageProps = {
  onBack?: () => void
  lang: Lang
  setLang?: (lang: Lang) => void
  initialTermId?: string | null
}

const CATEGORY_LABELS: Record<NonNullable<GlossaryTerm['category']>, { ru: string; uk: string; de: string }> = {
  material: { ru: 'Материалы', uk: 'Матеріали', de: 'Materialien' },
  part: { ru: 'Детали', uk: 'Деталі', de: 'Schuhteile' },
  process: { ru: 'Процессы', uk: 'Процеси', de: 'Verfahren' },
  tool: { ru: 'Инструменты', uk: 'Інструменти', de: 'Werkzeuge' },
  type: { ru: 'Виды', uk: 'Види', de: 'Arten' },
  defect: { ru: 'Дефекты', uk: 'Дефекти', de: 'Defekte' },
  other: { ru: 'Прочее', uk: 'Інше', de: 'Sonstiges' },
}

const ALPHABETS = {
  ru: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split(''),
  uk: 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЮЯ'.split(''),
  de: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ'.split('')
}

function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
  } catch {}
}

export function GlossaryPage({ onBack, lang, initialTermId }: GlossaryPageProps) {
  const [query, setQuery] = useState('')
  const [activeLetter, setActiveLetter] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  
  const [isProPurchased, setIsProPurchased] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)
  
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })
  
  const listRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme() 
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => { setActiveLetter(null) }, [lang])

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id
    if (!userId) return

    fetch(`/api/check-purchase?userId=${userId}&productId=pro_glossary`)
      .then(res => res.json())
      .then(data => { if (data.purchased) setIsProPurchased(true) })
      .catch(err => console.error(err))
  }, [])

  const handleProClick = async (e: React.MouseEvent) => {
    e.stopPropagation() 
    const tg = (window as any).Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;

    if (!userId) {
      alert("Open via Telegram.");
      return;
    }

    setIsPurchasing(true);
    haptic('light');

    try {
      const response = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, productId: "pro_glossary" }) 
      });

      const data = await response.json();
      if (!response.ok || !data.invoiceLink) throw new Error(data.error);

      tg.openInvoice(data.invoiceLink, (status: string) => {
        if (status === 'paid') {
          haptic('heavy');
          setIsProPurchased(true); 
        }
      });
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const t = {
    ru: { title: 'Словарь', subtitle: 'Архив терминов', search: 'Поиск по энциклопедии...', all: 'Все', empty: 'Ничего не найдено' },
    uk: { title: 'Словник', subtitle: 'Архів термінів', search: 'Пошук по енциклопедії...', all: 'Усі', empty: 'Нічого не знайдено' },
    de: { title: 'Wörterbuch', subtitle: 'Terminologie-Archiv', search: 'Enzyklopädie durchsuchen...', all: 'Alle', empty: 'Keine Ergebnisse' },
  }[lang]

  const getLocalizedTitle = (item: GlossaryTerm, currentLang: Lang) => {
    if (currentLang === 'de' && (item as any).termDe) return (item as any).termDe as string
    if (currentLang === 'uk' && item.termUk) return item.termUk
    return item.term
  }

  useEffect(() => {
    if (initialTermId) {
      const term = GLOSSARY_TERMS.find((t) => t.id === initialTermId)
      if (term) {
        setQuery(getLocalizedTitle(term, lang))
        setActiveLetter(null)
        setActiveCategory(null)
      }
    }
  }, [initialTermId, lang])

  const filtered = useMemo(() => {
    let list = searchTerms(query, lang)
    if (activeLetter) {
      list = list.filter((item) => getLocalizedTitle(item, lang).charAt(0).toUpperCase() === activeLetter)
    }
    if (activeCategory) {
      list = list.filter((item) => (item.category ?? 'other') === activeCategory)
    }
    return list
  }, [query, activeLetter, activeCategory, lang])

  const activeLetters = useMemo(() => {
    const letters = new Set<string>()
    GLOSSARY_TERMS.forEach((item) => {
      const title = getLocalizedTitle(item, lang)
      if (title) letters.add(title.charAt(0).toUpperCase())
    })
    return letters
  }, [lang])

  const availableLetters = ALPHABETS[lang] || ALPHABETS.ru
  const categories = useMemo(() => Array.from(new Set(GLOSSARY_TERMS.map((x) => x.category ?? 'other'))) as NonNullable<GlossaryTerm['category']>[], [])

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#EFECE6]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/40' : 'text-[#1C1816]/40'
  const cLine = isDark ? 'border-white/10' : 'border-black/10'

  return (
    <div className={`relative flex flex-col h-[100dvh] w-full max-w-[100vw] ${cBg} ${cText} overflow-hidden`}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* MINIMAL HEADER */}
      <header className="px-6 pt-6 pb-2 flex items-center justify-between z-20 shrink-0">
        <button 
          onClick={() => { haptic('light'); onBack?.(); }}
          className={`flex items-center gap-2 text-[9px] font-sans uppercase tracking-[0.3em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} hover:${cText} transition-colors`}
        >
          <span>←</span>
          <span>Index</span>
        </button>
        <span className={`text-[9px] font-sans uppercase tracking-[0.3em] ${cTextMuted}`}>
          {filtered.length} entries
        </span>
      </header>

      {/* MAIN CONTAINER */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide w-full">
        
        {/* EDITORIAL TITLE */}
        <div className="mt-8 mb-10">
          <span className={`block text-[8.5px] font-sans uppercase tracking-[0.4em] mb-3 ${cTextMuted}`}>
            {t.subtitle}
          </span>
          <h1 className="font-serif text-5xl md:text-7xl font-light tracking-tight">
            {t.title}
          </h1>
        </div>

        {/* REFINED SEARCH */}
        <div className={`relative flex items-center border-b pb-2 mb-8 ${cLine}`}>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveLetter(null); }}
            placeholder={t.search}
            className={`w-full bg-transparent outline-none border-0 text-[14px] font-sans font-light ${cText} placeholder:${cTextMuted}`}
          />
          {query && (
            <button onClick={() => setQuery('')} className={`text-[8px] font-sans uppercase tracking-widest ${cTextMuted}`}>
              Reset
            </button>
          )}
        </div>

        {/* CATEGORIES CHIPS (EDITORIAL STYLE) */}
        <div className={`flex overflow-x-auto gap-6 pb-4 mb-6 border-b ${cLine} scrollbar-hide`}>
          <button 
            onClick={() => { haptic('light'); setActiveCategory(null); }}
            className={`text-[9px] font-sans uppercase tracking-[0.25em] whitespace-nowrap transition-all outline-none border-none bg-transparent cursor-pointer ${
              activeCategory === null ? `${cText} underline underline-offset-8` : `${cTextMuted} hover:${cText}`
            }`}
          >
            {t.all}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { haptic('light'); setActiveCategory(activeCategory === cat ? null : cat); }}
              className={`text-[9px] font-sans uppercase tracking-[0.25em] whitespace-nowrap transition-all outline-none border-none bg-transparent cursor-pointer ${
                activeCategory === cat ? `${cText} underline underline-offset-8` : `${cTextMuted} hover:${cText}`
              }`}
            >
              {CATEGORY_LABELS[cat][lang]}
            </button>
          ))}
        </div>

        {/* ALPHABET SCROLLER */}
        <div className="flex overflow-x-auto gap-4 pb-6 mb-8 scrollbar-hide items-center">
          <button 
            onClick={() => { haptic('light'); setActiveLetter(null); }}
            className={`text-[11px] font-serif transition-all outline-none border-none bg-transparent cursor-pointer shrink-0 ${
              activeLetter === null ? `${cText} italic` : `${cTextMuted}`
            }`}
          >
            All
          </button>
          {availableLetters.map((letter) => {
            const hasTerms = activeLetters.has(letter)
            return (
              <button
                key={letter}
                disabled={!hasTerms}
                onClick={() => { haptic('light'); setActiveLetter(activeLetter === letter ? null : letter); }}
                className={`text-[12px] font-serif transition-all outline-none border-none bg-transparent shrink-0 ${
                  !hasTerms ? 'opacity-10 pointer-events-none' : 
                  activeLetter === letter ? `${cText} italic scale-125` : `${cTextMuted} hover:${cText}`
                }`}
              >
                {letter}
              </button>
            )
          })}
        </div>

        {/* GRID OF CARDS */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className={`font-serif text-xl italic ${cTextMuted}`}>{t.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 w-full">
            {filtered.map((term, i) => {
              const globalIndex = GLOSSARY_TERMS.findIndex(t => t.id === term.id);
              const isFree = globalIndex < 3;
              
              return (
                <FlipCard 
                  key={term.id}
                  term={term} 
                  lang={lang} 
                  isDark={isDark} 
                  isLocked={!isProPurchased && !isFree}
                  onUnlock={handleProClick}
                  isPurchasing={isPurchasing}
                />
              )
            })}
          </div>
        )}

        {/* EDITORIAL FOOTER */}
        <div className="mt-20 text-center pb-10">
          <div className={`w-[1px] h-8 mx-auto mb-6 ${cLine} border-l`} />
          <p className={`text-[8px] font-sans uppercase tracking-[0.4em] ${cTextMuted}`}>
            Cordwainer Archive
          </p>
        </div>

      </div>
    </div>
  )
}
