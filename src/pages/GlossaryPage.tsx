import { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react'
import {
  GLOSSARY_TERMS,
  searchTerms,
  type GlossaryTerm,
} from '../data/glossary'
import type { Lang } from '../App'
import { FlipCard } from '../components/FlipCard'

type GlossaryPageProps = {
  onBack?: () => void
  lang: Lang
  setLang?: (lang: Lang) => void
  initialTermId?: string | null
}

const CATEGORY_META: Record<
  NonNullable<GlossaryTerm['category']>,
  { ru: string; uk: string; de: string; num: string }
> = {
  material: { ru: 'Материалы', uk: 'Матеріали', de: 'Materialien', num: '01' },
  part: { ru: 'Детали', uk: 'Деталі', de: 'Schuhteile', num: '02' },
  process: { ru: 'Процессы', uk: 'Процеси', de: 'Verfahren', num: '03' },
  tool: { ru: 'Инструменты', uk: 'Інструменти', de: 'Werkzeuge', num: '04' },
  type: { ru: 'Виды', uk: 'Види', de: 'Arten', num: '05' },
  defect: { ru: 'Дефекты', uk: 'Дефекти', de: 'Defekte', num: '06' },
  other: { ru: 'Прочее', uk: 'Інше', de: 'Sonstiges', num: '07' },
}

const ALPHABETS = {
  ru: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split(''),
  uk: 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЮЯ'.split(''),
  de: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ'.split(''),
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
  const [viewMode, setViewMode] = useState<'lookbook' | 'index'>('lookbook')
  const [selectedDossier, setSelectedDossier] = useState<GlossaryTerm | null>(null)

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

  useEffect(() => {
    setActiveLetter(null)
  }, [lang])

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id
    if (!userId) return

    fetch(`/api/check-purchase?userId=${userId}&productId=pro_glossary`)
      .then((res) => res.json())
      .then((data) => {
        if (data.purchased) setIsProPurchased(true)
      })
      .catch((err) => console.error('Ошибка проверки покупки:', err))
  }, [])

  const handleProClick = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    const tg = (window as any).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id

    if (!userId) {
      alert('Откройте приложение через Telegram.')
      return
    }

    setIsPurchasing(true)
    haptic('light')

    try {
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId: 'pro_glossary' }),
      })

      const data = await response.json()
      if (!response.ok || !data.invoiceLink) throw new Error(data.error)

      tg.openInvoice(data.invoiceLink, (status: string) => {
        if (status === 'paid') {
          haptic('heavy')
          setIsProPurchased(true)
        }
      })
    } catch (error: any) {
      console.error(error)
      alert(`Сбой сервера: ${error.message}`)
    } finally {
      setIsPurchasing(false)
    }
  }

  const t = {
    ru: {
      issue: 'ARCHIVE VOL. IV',
      title: 'Словарь',
      latinSub: 'The Shoemaker’s Lexicon',
      manifesto: 'Кураторский архив обувной терминологии, редких кож, деталей конструкции и ремесленных технологий.',
      searchPlaceholder: 'Индексный поиск (термин, деталь)...',
      all: 'Все главы',
      entries: 'ЗАПИСЕЙ',
      empty: 'В архиве ничего не найдено',
      emptyReset: 'Сбросить параметры',
      vipTitle: 'ПОЛНЫЙ АРХИВ АТЕЛЬЕ',
      vipDesc: 'Разблокируйте все 218 профессиональных терминов навсегда',
      vipBtn: 'ПОЛУЧИТЬ ДОСТУП • 1 ★',
      flipHint: 'ПЕРЕВЕРНУТЬ',
      exampleLabel: 'Контекст и применение',
    },
    uk: {
      issue: 'ARCHIVE VOL. IV',
      title: 'Словник',
      latinSub: 'The Shoemaker’s Lexicon',
      manifesto: 'Кураторський архів взуттєвої термінології, рідкісних шкір, деталей конструкції та ремісничих технологій.',
      searchPlaceholder: 'Індексний пошук (термін, деталь)...',
      all: 'Усі глави',
      entries: 'ЗАПИСІВ',
      empty: 'В архіві нічого не знайдено',
      emptyReset: 'Скинути параметри',
      vipTitle: 'ПОВНИЙ АРХІВ АТЕЛЬЄ',
      vipDesc: 'Розблокуйте всі 218 професійних термінів назавжди',
      vipBtn: 'ОТРИМАТИ ДОСТУП • 1 ★',
      flipHint: 'ПЕРЕВЕРНУТИ',
      exampleLabel: 'Контекст та застосування',
    },
    de: {
      issue: 'ARCHIVE VOL. IV',
      title: 'Lexikon',
      latinSub: 'The Shoemaker’s Lexicon',
      manifesto: 'Kuratiertes Archiv der Schuhmacher-Terminologie, edler Lederarten, Konstruktionsdetails und Handwerkstechniken.',
      searchPlaceholder: 'Index durchsuchen (Begriff, Teil)...',
      all: 'Alle Kapitel',
      entries: 'EINTRÄGE',
      empty: 'Keine Einträge im Archiv gefunden',
      emptyReset: 'Filter zurücksetzen',
      vipTitle: 'VOLLSTÄNDIGES ATELIER-ARCHIV',
      vipDesc: 'Schalten Sie alle 218 Fachbegriffe dauerhaft frei',
      vipBtn: 'VOLLVERSION • 1 ★',
      flipHint: 'WENDEN',
      exampleLabel: 'Kontext & Verwendung',
    },
  }[lang]

  const getLocalizedTitle = (item: GlossaryTerm, currentLang: Lang) => {
    if (currentLang === 'de' && (item as any).termDe) return (item as any).termDe as string
    if (currentLang === 'uk' && item.termUk) return item.termUk
    return item.term
  }

  const getLocalizedDef = (item: GlossaryTerm, currentLang: Lang) => {
    if (currentLang === 'de' && (item as any).definitionDe) return (item as any).definitionDe as string
    if (currentLang === 'uk' && item.definitionUk) return item.definitionUk
    return item.definition
  }

  const getLocalizedEx = (item: GlossaryTerm, currentLang: Lang) => {
    if (currentLang === 'de' && (item as any).exampleDe) return (item as any).exampleDe as string
    if (currentLang === 'uk' && item.exampleUk) return item.exampleUk
    return item.example
  }

  useEffect(() => {
    if (initialTermId) {
      const term = GLOSSARY_TERMS.find((item) => item.id === initialTermId)
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
  const categories = useMemo(
    () => Array.from(new Set(GLOSSARY_TERMS.map((x) => x.category ?? 'other'))) as NonNullable<GlossaryTerm['category']>[],
    []
  )

  // Благородная палитра: теплый алебастр в светлой теме и глубокий обсидиан в темной
  const cBg = isDark ? 'bg-[#0B0A09]' : 'bg-[#F3EFEA]'
  const cText = isDark ? 'text-[#F4EFE6]' : 'text-[#141210]'
  const cMuted = isDark ? 'text-[#F4EFE6]/45' : 'text-[#141210]/45'
  const cBorder = isDark ? 'border-[#F4EFE6]/12' : 'border-[#141210]/12'
  const cAccent = isDark ? 'text-[#C5A880]' : 'text-[#8C6D46]'

  return (
    <div className={`relative flex flex-col h-[100dvh] w-full max-w-[100vw] ${cBg} ${cText} overflow-hidden select-none`}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ================= EDITORIAL TOP BAR ================= */}
      <header className={`px-5 py-3.5 flex items-center justify-between border-b ${cBorder} z-20 shrink-0`}>
        <button
          type="button"
          onClick={() => {
            haptic('light')
            onBack?.()
          }}
          className={`flex items-center gap-2 text-[9px] font-sans uppercase tracking-[0.28em] bg-transparent border-0 outline-none cursor-pointer ${cText}`}
        >
          <span>←</span>
          <span>ATELIER</span>
        </button>

        <span className={`font-mono text-[8.5px] tracking-[0.25em] ${cMuted}`}>
          {t.issue}
        </span>

        {/* Переключатель: Журнальная сетка (Lookbook) или Список (Index) */}
        <div className={`flex items-center border ${cBorder}`}>
          <button
            type="button"
            onClick={() => {
              haptic('light')
              setViewMode('lookbook')
            }}
            className={`px-2 py-1 text-[7.5px] font-sans uppercase tracking-[0.2em] border-0 outline-none cursor-pointer transition-colors ${
              viewMode === 'lookbook'
                ? isDark
                  ? 'bg-[#F4EFE6] text-[#0B0A09]'
                  : 'bg-[#141210] text-[#F3EFEA]'
                : `bg-transparent ${cMuted}`
            }`}
          >
            GRID
          </button>
          <button
            type="button"
            onClick={() => {
              haptic('light')
              setViewMode('index')
            }}
            className={`px-2 py-1 text-[7.5px] font-sans uppercase tracking-[0.2em] border-0 outline-none cursor-pointer transition-colors ${
              viewMode === 'index'
                ? isDark
                  ? 'bg-[#F4EFE6] text-[#0B0A09]'
                  : 'bg-[#141210] text-[#F3EFEA]'
                : `bg-transparent ${cMuted}`
            }`}
          >
            INDEX
          </button>
        </div>
      </header>

      {/* ================= MAIN MAGAZINE SCROLL ================= */}
      <div ref={listRef} className="flex-1 overflow-y-auto overflow-x-hidden px-5 pb-28 scrollbar-hide w-full">
        
        {/* 1. ОБЛОЖКА РАЗДЕЛА (EDITORIAL MASTHEAD) */}
        <section className={`pt-7 pb-6 border-b ${cBorder}`}>
          <div className="flex items-baseline justify-between mb-2">
            <span className={`font-serif italic text-[13px] ${cAccent}`}>
              {t.latinSub}
            </span>
            <span className={`font-mono text-[9px] tracking-[0.2em] ${cMuted}`}>
              [{String(filtered.length).padStart(3, '0')} {t.entries}]
            </span>
          </div>

          <h1 className="font-serif font-normal text-[54px] min-[400px]:text-[64px] leading-[0.88] tracking-[-0.03em] mb-5">
            {t.title}
          </h1>

          <p className={`text-[11.5px] font-sans font-light leading-[1.6] max-w-[92%] ${cMuted}`}>
            {t.manifesto}
          </p>
        </section>

        {/* 2. VIP BLACK CARD BANNER (ЕСЛИ PRO НЕ КУПЛЕН) */}
        {!isProPurchased && (
          <section className="my-5">
            <div
              onClick={handleProClick}
              className={`p-4 border cursor-pointer transition-transform active:scale-[0.99] flex items-center justify-between gap-4 ${
                isDark
                  ? 'bg-[#181614] border-[#C5A880]/40 text-[#F4EFE6]'
                  : 'bg-[#141210] border-[#141210] text-[#F4EFE6]'
              }`}
            >
              <div>
                <div className="text-[8px] font-mono uppercase tracking-[0.28em] text-[#C5A880] mb-1">
                  ✦ {t.vipTitle}
                </div>
                <p className="text-[11px] font-serif italic text-[#F4EFE6]/80">
                  {t.vipDesc}
                </p>
              </div>
              <button
                type="button"
                disabled={isPurchasing}
                className="shrink-0 px-3 py-2 bg-[#C5A880] text-[#0B0A09] text-[8px] font-sans font-semibold uppercase tracking-[0.2em] border-0 cursor-pointer"
              >
                {isPurchasing ? '...' : t.vipBtn}
              </button>
            </div>
          </section>
        )}

        {/* 3. ПОИСК И НАВИГАЦИЯ ПО ГЛАВАМ (CHAPTERS) */}
        <section className="my-5 space-y-4">
          {/* Поисковая строка в архитектурной рамке */}
          <div className={`flex items-center px-3.5 py-2.5 border ${cBorder} ${isDark ? 'bg-[#121110]' : 'bg-[#FAF8F5]'}`}>
            <span className={`font-mono text-[9px] tracking-[0.2em] mr-3 shrink-0 ${cAccent}`}>
              FIND //
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveLetter(null)
              }}
              placeholder={t.searchPlaceholder}
              className={`w-full bg-transparent outline-none border-0 text-[13px] font-sans font-light ${cText} placeholder:opacity-40`}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className={`ml-2 text-[8.5px] font-mono uppercase tracking-widest bg-transparent border-0 cursor-pointer ${cMuted}`}
              >
                [×]
              </button>
            )}
          </div>

          {/* Нумерованные главы как в каталоге Maison Margiela */}
          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
            <button
              type="button"
              onClick={() => {
                haptic('light')
                setActiveCategory(null)
              }}
              className={`px-3 py-1.5 text-[8.5px] font-sans uppercase tracking-[0.22em] whitespace-nowrap border transition-all cursor-pointer outline-none ${
                activeCategory === null
                  ? isDark
                    ? 'bg-[#F4EFE6] text-[#0B0A09] border-[#F4EFE6]'
                    : 'bg-[#141210] text-[#F3EFEA] border-[#141210]'
                  : `bg-transparent ${cText} ${cBorder}`
              }`}
            >
              00 / {t.all}
            </button>
            {categories.map((cat) => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    haptic('light')
                    setActiveCategory(isActive ? null : cat)
                  }}
                  className={`px-3 py-1.5 text-[8.5px] font-sans uppercase tracking-[0.22em] whitespace-nowrap border transition-all cursor-pointer outline-none ${
                    isActive
                      ? isDark
                        ? 'bg-[#F4EFE6] text-[#0B0A09] border-[#F4EFE6]'
                        : 'bg-[#141210] text-[#F3EFEA] border-[#141210]'
                      : `bg-transparent ${cText} ${cBorder}`
                  }`}
                >
                  {CATEGORY_META[cat].num} / {CATEGORY_META[cat][lang]}
                </button>
              )
            })}
          </div>

          {/* Компактная алфавитная линейка */}
          <div className={`flex overflow-x-auto gap-3 py-2.5 border-y ${cBorder} scrollbar-hide items-center`}>
            <button
              type="button"
              onClick={() => {
                haptic('light')
                setActiveLetter(null)
              }}
              className={`text-[9px] font-mono uppercase tracking-[0.2em] px-1.5 py-0.5 border-0 bg-transparent cursor-pointer shrink-0 ${
                activeLetter === null ? `${cAccent} underline underline-offset-4` : cMuted
              }`}
            >
              A–Я
            </button>
            {availableLetters.map((letter) => {
              const hasTerms = activeLetters.has(letter)
              const isSelected = activeLetter === letter
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!hasTerms}
                  onClick={() => {
                    haptic('light')
                    setActiveLetter(isSelected ? null : letter)
                  }}
                  className={`text-[12px] font-serif min-w-[20px] text-center border-0 bg-transparent outline-none shrink-0 transition-all ${
                    !hasTerms
                      ? 'opacity-15 pointer-events-none'
                      : isSelected
                      ? `${cAccent} italic font-semibold scale-125`
                      : `${cText} opacity-75 cursor-pointer`
                  }`}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        </section>

        {/* 4. КОНТЕНТ: LOOKBOOK GRID ИЛИ EDITORIAL INDEX */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <p className={`font-serif text-xl italic ${cMuted}`}>{t.empty}</p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setActiveLetter(null)
                setActiveCategory(null)
              }}
              className={`px-4 py-2 border ${cBorder} text-[9px] font-sans uppercase tracking-[0.25em] bg-transparent ${cText} cursor-pointer`}
            >
              {t.emptyReset}
            </button>
          </div>
        ) : viewMode === 'lookbook' ? (
          /* АСИММЕТРИЧНАЯ СЕТКА ЛУКБУКА (КАЖДАЯ 5-Я КАРТОЧКА — ШИРОКИЙ РАЗВОРОТ) */
          <div className="grid grid-cols-2 gap-3.5 w-full">
            {filtered.map((term, i) => {
              const globalIndex = GLOSSARY_TERMS.findIndex((item) => item.id === term.id)
              const isFree = globalIndex < 3
              const isFeatured = i % 5 === 0

              return (
                <div
                  key={term.id}
                  className={isFeatured ? 'col-span-2' : 'col-span-1'}
                >
                  <FlipCard
                    term={term}
                    lang={lang}
                    index={i}
                    catalogNumber={globalIndex + 1}
                    isDark={isDark}
                    flipHint={t.flipHint}
                    isFeatured={isFeatured}
                    isLocked={!isProPurchased && !isFree}
                    onUnlock={handleProClick}
                    isPurchasing={isPurchasing}
                    onOpenDossier={(item) => setSelectedDossier(item)}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          /* КАТАЛОЖНЫЙ СПИСОК (INDEX VIEW В СТИЛЕ CELINE / JIL SANDER) */
          <div className={`border-t ${cBorder} divide-y ${isDark ? 'divide-[#F4EFE6]/10' : 'divide-[#141210]/10'}`}>
            {filtered.map((term) => {
              const globalIndex = GLOSSARY_TERMS.findIndex((item) => item.id === term.id)
              const isFree = globalIndex < 3
              const locked = !isProPurchased && !isFree
              const cat = term.category ?? 'other'
              const title = getLocalizedTitle(term, lang)

              return (
                <div
                  key={term.id}
                  onClick={() => {
                    haptic('light')
                    if (locked) {
                      handleProClick()
                    } else {
                      setSelectedDossier(term)
                    }
                  }}
                  className="py-4 flex items-baseline justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-baseline gap-3.5 min-w-0">
                    <span className={`font-mono text-[9px] tracking-[0.15em] shrink-0 ${cAccent}`}>
                      {String(globalIndex + 1).padStart(3, '0')}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-serif text-[18px] leading-snug truncate group-hover:italic transition-all">
                        {title}
                      </h3>
                      <span className={`block text-[8px] font-sans uppercase tracking-[0.25em] mt-0.5 ${cMuted}`}>
                        {CATEGORY_META[cat][lang]}
                      </span>
                    </div>
                  </div>

                  <span className={`font-mono text-[9px] uppercase tracking-[0.2em] shrink-0 ${cMuted}`}>
                    {locked ? '🔒 PRO' : 'READ ↗'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* EDITORIAL FOOTER */}
        <footer className="mt-20 pb-8 text-center">
          <div className={`w-px h-10 mx-auto mb-5 ${cBorder} border-l`} />
          <p className={`text-[8px] font-mono uppercase tracking-[0.35em] ${cMuted}`}>
            CORDWAINER ATELIER • ARCHIVAL EDITION
          </p>
        </footer>
      </div>

      {/* ================= ПОЛНОЭКРАННОЕ ДОСЬЕ ТЕРМИНА (MODAL SPREAD) ================= */}
      {selectedDossier && (
        <div
          onClick={() => setSelectedDossier(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg max-h-[85dvh] overflow-y-auto p-6 sm:p-8 border-t sm:border ${cBg} ${cText} ${cBorder}`}
          >
            <div className={`flex items-center justify-between pb-4 mb-6 border-b ${cBorder}`}>
              <span className={`font-mono text-[9px] tracking-[0.25em] ${cAccent}`}>
                DOSSIER // N° {String(GLOSSARY_TERMS.findIndex((x) => x.id === selectedDossier.id) + 1).padStart(3, '0')}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className={`text-[9px] font-mono uppercase tracking-[0.25em] bg-transparent border-0 cursor-pointer ${cText}`}
              >
                [CLOSE ×]
              </button>
            </div>

            <span className={`block text-[8.5px] font-sans uppercase tracking-[0.3em] mb-2 ${cMuted}`}>
              {CATEGORY_META[selectedDossier.category ?? 'other'][lang]}
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl leading-[1.1] mb-4">
              {getLocalizedTitle(selectedDossier, lang)}
            </h2>

            {/* Параллельные переводы термина (RU / UK / DE) */}
            <div className={`flex flex-wrap gap-x-5 gap-y-1 py-3 mb-6 border-y ${cBorder} text-[11px] font-serif italic ${cMuted}`}>
              <span>RU: {selectedDossier.term}</span>
              {selectedDossier.termUk && <span>UA: {selectedDossier.termUk}</span>}
              {(selectedDossier as any).termDe && <span>DE: {(selectedDossier as any).termDe}</span>}
            </div>

            <p className="font-sans font-light text-[14px] leading-[1.75] mb-6">
              {getLocalizedDef(selectedDossier, lang)}
            </p>

            {getLocalizedEx(selectedDossier, lang) && (
              <div className={`p-4 border-l-2 ${isDark ? 'border-[#C5A880] bg-[#141311]' : 'border-[#8C6D46] bg-[#EAE4DC]/60'}`}>
                <span className={`block text-[8px] font-sans uppercase tracking-[0.3em] mb-1.5 ${cAccent}`}>
                  {t.exampleLabel}
                </span>
                <p className="font-serif italic text-[14px] leading-relaxed">
                  «{getLocalizedEx(selectedDossier, lang)}»
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
