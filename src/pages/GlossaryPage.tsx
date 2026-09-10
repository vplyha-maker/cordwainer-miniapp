import { useMemo, useState, useEffect, useRef } from 'react'
import { BottomDock } from '../components/BottomDock'
import { FlipCard } from '../components/FlipCard'
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
  type: { ru: 'Виды обуви', uk: 'Види взуття', de: 'Schuharten' },
  defect: { ru: 'Дефекты', uk: 'Дефекти', de: 'Defekte' },
  other: { ru: 'Прочее', uk: 'Інше', de: 'Sonstiges' },
}

export function GlossaryPage({ onBack, lang, initialTermId }: GlossaryPageProps) {
  const [query, setQuery] = useState('')
  const [activeLetter, setActiveLetter] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setActiveLetter(null)
  }, [lang])

  const t = {
    ru: {
      title: 'Глоссарий',
      search: 'Поиск термина...',
      all: 'Все',
      terms: 'терминов',
      empty: 'Ничего не найдено',
      emptyHint: 'Попробуйте другой запрос или сбросьте фильтры',
      source: 'Краткий словарь терминов обувного дела',
      flipHint: 'Нажмите на карточку, чтобы увидеть определение',
    },
    uk: {
      title: 'Глосарій',
      search: 'Пошук терміна...',
      all: 'Усі',
      terms: 'термінів',
      empty: 'Нічого не знайдено',
      emptyHint: 'Спробуйте інший запит або скиньте фільтри',
      source: 'Короткий словник термінів взуттєвої справи',
      flipHint: 'Натисніть на картку, щоб побачити визначення',
    },
    de: {
      title: 'Glossar',
      search: 'Begriff suchen...',
      all: 'Alle',
      terms: 'Begriffe',
      empty: 'Nichts gefunden',
      emptyHint: 'Versuchen Sie eine andere Suchanfrage oder setzen Sie die Filter zurück',
      source: 'Kurzes Wörterbuch der Schuhmacher-Begriffe',
      flipHint: 'Klicken Sie auf die Karte, um die Definition zu sehen',
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

  const availableLetters = useMemo(() => {
    const letters = new Set<string>()
    GLOSSARY_TERMS.forEach((item) => {
      const title = getLocalizedTitle(item, lang)
      if (title) letters.add(title.charAt(0).toUpperCase())
    })
    const locale = lang === 'de' ? 'de-DE' : lang === 'uk' ? 'uk-UA' : 'ru-RU'
    return Array.from(letters).sort((a, b) => a.localeCompare(b, locale))
  }, [lang])

  const categories = useMemo(() => {
    const set = new Set(GLOSSARY_TERMS.map((x) => x.category ?? 'other'))
    return Array.from(set) as NonNullable<GlossaryTerm['category']>[]
  }, [])

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)] overflow-hidden transition-colors">
      {/* Header */}
      <div className="px-4 md:px-6 pt-5 pb-3 flex items-center justify-between shrink-0 relative z-20">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="w-11 h-11 rounded-full flex items-center justify-center text-[var(--color-ink)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm active:scale-90 transition-transform shrink-0"
              aria-label={lang === 'de' ? 'Zurück' : (lang === 'uk' ? 'Назад' : 'Назад')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-[28px] md:text-[34px] font-serif font-bold tracking-wide leading-none text-[var(--color-ink)] truncate">
              {t.title}
            </h1>
            <p className="text-[12px] font-medium text-[var(--color-muted)] mt-1.5">
              {filtered.length} {t.terms}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div ref={listRef} className="flex-1 px-4 md:px-6 overflow-y-auto pb-[110px] overscroll-none">
        
        {/* Search */}
        <div className="mb-4">
          <div className="rounded-[20px] px-4 py-3.5 flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--color-muted)] shrink-0"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveLetter(null)
              }}
              placeholder={t.search}
              className="flex-1 bg-transparent border-0 outline-none text-[14px] font-medium text-[var(--color-ink)] placeholder:text-[var(--color-muted)] min-w-0"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-[var(--color-muted)] hover:text-[var(--color-ink)] active:scale-90 transition-transform p-0.5"
                aria-label="Clear"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Alphabet filter */}
        <div className="mb-3 -mx-1 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 px-1 pb-1 min-w-max">
            <button
              type="button"
              onClick={() => setActiveLetter(null)}
              className={`h-9 px-4 rounded-[14px] text-[13px] font-bold transition-all shrink-0 border ${
                activeLetter === null
                  ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-[var(--color-ink)] shadow-sm'
                  : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-ink)]'
              }`}
            >
              {t.all}
            </button>
            {availableLetters.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
                className={`w-9 h-9 rounded-[14px] text-[14px] font-bold transition-all shrink-0 flex items-center justify-center border ${
                  activeLetter === letter
                    ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-[var(--color-ink)] shadow-sm'
                    : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-ink)]'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div className="mb-5 -mx-1 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 px-1 pb-1 min-w-max">
            {categories.map((cat) => {
              const label = CATEGORY_LABELS[cat][lang]
              const active = activeCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(active ? null : cat)}
                  className={`h-8 px-3.5 rounded-[12px] text-[12px] font-bold transition-all shrink-0 border ${
                    active
                      ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-[var(--color-ink)] shadow-sm'
                      : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-ink)]'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-[12px] font-medium text-[var(--color-muted)] mb-4 text-center">
          {t.flipHint}
        </p>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div className="rounded-[24px] p-8 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm text-center">
            <p className="text-[15px] font-bold text-[var(--color-ink)]">{t.empty}</p>
            <p className="text-[13px] font-medium text-[var(--color-muted)] mt-1.5">{t.emptyHint}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {filtered.map((term, i) => (
              <div
                key={term.id}
                className="animate-glossary-in opacity-0"
                style={{
                  animation: `glossaryIn 0.45s ease forwards`,
                  animationDelay: `${Math.min(i * 35, 350)}ms`,
                }}
              >
                <FlipCard term={term} lang={lang} index={i} />
              </div>
            ))}
          </div>
        )}

        {/* Source */}
        <p className="text-[11px] font-medium text-[var(--color-muted)] text-center opacity-60 mb-6">
          {t.source}
        </p>
      </div>

      {/* Bottom Dock */}
      <div className="fixed bottom-[10px] left-0 right-0 z-50 pointer-events-auto">
        <div className="mx-auto w-full max-w-[var(--app-max-width)]">
          <BottomDock active="search" lang={lang} />
        </div>
      </div>

      <style>{`
        @keyframes glossaryIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .perspective-\\[1000px\\] { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
