import { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react'
import {
  GLOSSARY_TERMS,
  searchTerms,
  type GlossaryTerm,
} from '../data/glossary'
import type { Lang } from '../App'

type GlossaryPageProps = {
  onBack?: () => void
  lang: Lang
  setLang?: (lang: Lang) => void
  initialTermId?: string | null
}

const CATEGORY_LABELS: Record<
  NonNullable<GlossaryTerm['category']>,
  { ru: string; uk: string; de: string }
> = {
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

const CATEGORY_ICON: Record<NonNullable<GlossaryTerm['category']>, React.ReactNode> = {
  material: <path d="M9 3H15L17.5 5.5L21 7.5L19.5 12.5L20.5 17.5L15.5 21H8.5L3.5 17.5L4.5 12.5L3 7.5L6.5 5.5L9 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  part: <path d="M2.5 17.5C4 17.5 6 17 7.5 15L11.5 9.5C12.5 8.2 13.8 7.5 15.5 7.5H19.5C20.6 7.5 21.5 8.4 21.5 9.5V14.5C21.5 16.2 19.8 17.5 18 17.5H2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  process: <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  tool: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  type: <path d="M4 17.5V14c0-2.5 1.5-4.5 4-5.5l4-1.5L14 3h6v4.5c0 3.5-2.5 6-5 7.5L12 17.5H4.5A.5.5 0 0 1 4 17.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  defect: <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  other: <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
}

function haptic(style: 'light' | 'medium' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
  } catch {}
}

export function GlossaryPage({ onBack, lang, initialTermId }: GlossaryPageProps) {
  const [query, setQuery] = useState('')
  const [activeLetter, setActiveLetter] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  
  // ИСПРАВЛЕНИЕ: Синхронно читаем тему прямо в момент создания компонента
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
    checkTheme() // Подстраховка
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setActiveLetter(null)
  }, [lang])

  const t = {
    ru: {
      title: 'Словарь',
      subtitle: 'Терминология',
      search: 'Поиск (термин, деталь...)',
      all: 'Все',
      terms: 'Терминов',
      empty: 'Ничего не найдено',
      emptyHint: 'Попробуйте изменить запрос',
      source: 'Энциклопедия обувного дела',
      flipHint: 'TAP TO READ',
    },
    uk: {
      title: 'Словник',
      subtitle: 'Термінологія',
      search: 'Пошук (термін, деталь...)',
      all: 'Усі',
      terms: 'Термінів',
      empty: 'Нічого не знайдено',
      emptyHint: 'Спробуйте змінити запит',
      source: 'Енциклопедія взуттєвої справи',
      flipHint: 'TAP TO READ',
    },
    de: {
      title: 'Wörterbuch',
      subtitle: 'Terminologie',
      search: 'Suchen (Begriff, Teil...)',
      all: 'Alle',
      terms: 'Begriffe',
      empty: 'Nichts gefunden',
      emptyHint: 'Versuchen Sie eine andere Anfrage',
      source: 'Schuhmacher Enzyklopädie',
      flipHint: 'TAP TO READ',
    },
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
      list = list.filter((item) => {
        const title = getLocalizedTitle(item, lang)
        return title.charAt(0).toUpperCase() === activeLetter
      })
    }
    if (activeCategory) {
      list = list.filter((item) => (item.category ?? 'other') === activeCategory)
    }
    return list
  }, [query, activeLetter, activeCategory, lang])

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [query, activeLetter, activeCategory])

  const activeLetters = useMemo(() => {
    const letters = new Set<string>()
    GLOSSARY_TERMS.forEach((item) => {
      const title = getLocalizedTitle(item, lang)
      if (title) letters.add(title.charAt(0).toUpperCase())
    })
    return letters
  }, [lang])

  const availableLetters = ALPHABETS[lang] || ALPHABETS.ru

  const categories = useMemo(() => {
    const set = new Set(GLOSSARY_TERMS.map((x) => x.category ?? 'other'))
    return Array.from(set) as NonNullable<GlossaryTerm['category']>[]
  }, [])

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'

  return (
    <div className={`relative flex flex-col h-[100dvh] transition-colors duration-[1.5s] ${cBg} ${cText} overflow-hidden`}>
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
          onClick={() => { haptic('light'); onBack?.(); }}
          className={`group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors`}
        >
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>
      </header>

      {/* CONTENT */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide">
        
        {/* ЗАГОЛОВОК */}
        <div className="stagger-item mb-12" style={{ animationDelay: '0.05s' }}>
          <p className={`text-[9px] font-sans font-medium uppercase tracking-[0.4em] mb-4 ${cTextMuted}`}>
            {t.subtitle} / {filtered.length} {t.terms}
          </p>
          <h1 className="font-serif text-[18vw] min-[400px]:text-7xl leading-[0.85] tracking-tight">
            {t.title}
          </h1>
        </div>

        {/* ПОИСК */}
        <div className="stagger-item mb-10" style={{ animationDelay: '0.1s' }}>
          <div className={`relative flex items-end border-b pb-3 transition-colors ${cLine}`}>
            <span className={`text-[12px] font-serif italic mr-4 ${cTextMuted}`}>Find.</span>
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveLetter(null); }}
              placeholder={t.search}
              className={`w-full bg-transparent outline-none border-0 text-[16px] font-sans font-light placeholder:font-light ${isDark ? 'placeholder:text-[#F4F0E8]/30' : 'placeholder:text-[#1C1816]/30'}`}
            />
            {query && (
              <button onClick={() => setQuery('')} className={`ml-2 text-[10px] uppercase tracking-widest outline-none border-0 bg-transparent cursor-pointer ${cTextMuted}`}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ФИЛЬТРЫ (КАТЕГОРИИ И АЛФАВИТ) */}
        <div className="stagger-item mb-12 flex flex-col gap-6" style={{ animationDelay: '0.15s' }}>
          {/* Categories */}
          <div className={`flex overflow-x-auto gap-6 pb-4 border-b ${cLine} scrollbar-hide`}>
            <button 
              onClick={() => { haptic('light'); setActiveCategory(null); }}
              className={`text-[9px] font-sans uppercase tracking-[0.25em] whitespace-nowrap transition-all outline-none border-none bg-transparent cursor-pointer ${
                activeCategory === null ? `italic ${cText} opacity-100` : `${cTextMuted} opacity-60 hover:opacity-100`
              }`}
            >
              {t.all}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { haptic('light'); setActiveCategory(activeCategory === cat ? null : cat); }}
                className={`text-[9px] font-sans uppercase tracking-[0.25em] whitespace-nowrap transition-all outline-none border-none bg-transparent cursor-pointer ${
                  activeCategory === cat ? `italic ${cText} opacity-100` : `${cTextMuted} opacity-60 hover:opacity-100`
                }`}
              >
                {CATEGORY_LABELS[cat][lang]}
              </button>
            ))}
          </div>

          {/* Alphabet */}
          <div className="flex overflow-x-auto gap-6 pb-2 scrollbar-hide">
             <button 
              onClick={() => { haptic('light'); setActiveLetter(null); }}
              className={`text-[12px] font-serif transition-all outline-none border-none bg-transparent cursor-pointer ${
                activeLetter === null ? `italic ${cText} opacity-100` : `${cTextMuted} opacity-40 hover:opacity-100`
              }`}
            >
              {t.all}
            </button>
            {availableLetters.map((letter) => {
              const hasTerms = activeLetters.has(letter)
              return (
                <button
                  key={letter}
                  disabled={!hasTerms}
                  onClick={() => { haptic('light'); setActiveLetter(activeLetter === letter ? null : letter); }}
                  className={`text-[14px] font-serif transition-all outline-none border-none bg-transparent ${
                    !hasTerms ? 'opacity-20 pointer-events-none' : 
                    activeLetter === letter ? `italic ${cText} opacity-100` : `${cTextMuted} opacity-60 hover:opacity-100 cursor-pointer`
                  }`}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        </div>

        {/* СЕТКА КАРТОЧЕК */}
        {filtered.length === 0 ? (
          <div className="stagger-item py-12 text-center flex flex-col items-center gap-6" style={{ animationDelay: '0.2s' }}>
            <p className={`font-serif text-2xl italic ${cTextMuted}`}>
              {t.empty}
            </p>
            <p className={`text-[10px] font-sans uppercase tracking-[0.2em] ${cTextMuted}`}>
              {t.emptyHint}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-16">
            {filtered.map((term, i) => (
              <div
                key={term.id}
                className="stagger-item"
                style={{ animationDelay: `${0.2 + (i % 10) * 0.05}s` }}
              >
                <FlipCard 
                  term={term} 
                  lang={lang} 
                  isDark={isDark} 
                  flipHint={t.flipHint}
                />
              </div>
            ))}
          </div>
        )}

        {/* FOOTER */}
        <div className="stagger-item pb-10" style={{ animationDelay: '0.4s' }}>
          <div className="flex flex-col items-center text-center px-4">
            <div className={`w-px h-12 mb-8 ${cLine} border-l`} />
            <p className={`text-[9px] font-sans font-medium uppercase tracking-[0.4em] ${cTextMuted}`}>
              {t.source}
            </p>
            <p className={`mt-4 text-[9px] font-sans font-bold uppercase tracking-[0.4em] ${cText}`}>
              Cordwainer
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

type FlipCardProps = {
  term: GlossaryTerm
  lang: Lang
  isDark: boolean
  flipHint: string
}

function FlipCard({ term, lang, isDark, flipHint }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false)

  const title = lang === 'de' && (term as any).termDe ? (term as any).termDe 
              : lang === 'uk' && term.termUk ? term.termUk 
              : term.term
              
  const definition = lang === 'de' && (term as any).definitionDe ? (term as any).definitionDe 
                   : lang === 'uk' && term.definitionUk ? term.definitionUk 
                   : term.definition
                   
  const example = lang === 'de' && (term as any).exampleDe ? (term as any).exampleDe 
                : lang === 'uk' && term.exampleUk ? term.exampleUk 
                : term.example

  const cat = term.category ?? 'other'
  const icon = CATEGORY_ICON[cat]

  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cSurface = isDark ? 'bg-[#111111]' : 'bg-[#EAE6DF]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'

  const stopEvent = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { haptic('light'); setFlipped((f) => !f) }}
      aria-expanded={flipped}
      className="group relative w-full aspect-[3/4] min-h-[220px] max-h-[300px] text-left outline-none cursor-pointer"
      style={{ perspective: 1200, WebkitPerspective: 1200 }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
          transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          WebkitTransform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-between p-5 border ${cLine} ${cSurface} overflow-hidden backface-hidden shadow-sm`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            pointerEvents: flipped ? 'none' : 'auto',
          }}
        >
          {/* Top Line */}
          <div className="w-full flex items-center justify-between z-10">
            <span className={`text-[9px] font-sans uppercase tracking-[0.2em] ${cTextMuted}`}>
              {CATEGORY_LABELS[cat][lang]}
            </span>
            <div className={`w-5 h-5 flex items-center justify-center ${cTextMuted}`}>
              <svg width="100%" height="100%" viewBox="0 0 24 24">
                {icon}
              </svg>
            </div>
          </div>

          {/* Center Huge Letter */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-[120px] leading-none opacity-5 pointer-events-none select-none ${cText}`}>
            {title.charAt(0).toUpperCase()}
          </div>

          {/* Bottom Term */}
          <div className="w-full flex flex-col items-center text-center z-10 mt-auto">
            <h3 className={`font-serif text-[22px] leading-[1.1] mb-4 ${cText}`}>
              {title}
            </h3>
            <div className={`text-[8px] font-sans tracking-[0.3em] uppercase transition-opacity opacity-0 group-hover:opacity-100 ${cTextMuted}`}>
              {flipHint}
            </div>
          </div>
        </div>

        {/* BACK */}
        <div
          className={`absolute inset-0 flex flex-col p-5 border ${cLine} ${cSurface} overflow-hidden shadow-sm`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            WebkitTransform: 'rotateY(180deg)',
            pointerEvents: flipped ? 'auto' : 'none',
          }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between pb-3 mb-4 border-b ${cLine} shrink-0`}>
            <h3 className={`font-serif text-[18px] leading-none truncate ${cText}`}>
              {title}
            </h3>
          </div>

          {/* Scrollable Content */}
          <div
            className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain pb-2"
            onClick={stopEvent}
            onPointerDown={stopEvent}
            onTouchStart={stopEvent}
            onWheel={stopEvent}
          >
            <p className={`text-[11px] min-[390px]:text-[12px] font-sans font-light leading-[1.7] ${cTextMuted}`}>
              {definition}
            </p>

            {example && (
              <div className={`mt-4 pt-4 border-t ${cLine}`}>
                <span className={`block mb-1 text-[8px] font-sans uppercase tracking-[0.3em] ${cText}`}>
                  {lang === 'de' ? 'BEISPIEL' : lang === 'uk' ? 'ПРИКЛАД' : 'ПРИМЕР'}
                </span>
                <p className={`font-serif text-[13px] italic leading-[1.5] ${cTextMuted}`}>
                  {example}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
