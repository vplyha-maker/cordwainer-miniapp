import { useMemo, useState, useEffect, useRef } from 'react'
import { BottomDock } from '../components/BottomDock'
import { FlipCard } from '../components/FlipCard'
import {
  GLOSSARY_TERMS,
  GLOSSARY_LETTERS,
  searchTerms,
  type GlossaryTerm,
} from '../data/glossary'
import type { Lang } from '../App'

type GlossaryPageProps = {
  onBack?: () => void
  lang: Lang
  setLang?: (lang: Lang) => void
}

const CATEGORY_LABELS: Record<
  NonNullable<GlossaryTerm['category']>,
  { ru: string; uk: string }
> = {
  material: { ru: 'Материалы', uk: 'Матеріали' },
  part: { ru: 'Детали', uk: 'Деталі' },
  process: { ru: 'Процессы', uk: 'Процеси' },
  tool: { ru: 'Инструменты', uk: 'Інструменти' },
  type: { ru: 'Виды обуви', uk: 'Види взуття' },
  defect: { ru: 'Дефекты', uk: 'Дефекти' },
  other: { ru: 'Прочее', uk: 'Інше' },
}

export function GlossaryPage({ onBack, lang }: GlossaryPageProps) {
  const [query, setQuery] = useState('')
  const [activeLetter, setActiveLetter] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

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
  }[lang]

  const filtered = useMemo(() => {
    let list = searchTerms(query, lang)
    if (activeLetter) {
      list = list.filter((item) => item.letter === activeLetter)
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
    const set = new Set(GLOSSARY_TERMS.map((x) => x.letter))
    return GLOSSARY_LETTERS.filter((l) => set.has(l))
  }, [])

  const categories = useMemo(() => {
    const set = new Set(GLOSSARY_TERMS.map((x) => x.category ?? 'other'))
    return Array.from(set) as NonNullable<GlossaryTerm['category']>[]
  }, [])

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[var(--color-bg,#1C1816)] text-[var(--color-ink,#F5F1EA)] overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 pt-5 pb-3 flex items-center justify-between shrink-0 relative z-20">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-ink,#F5F1EA)] bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-90 transition-transform shrink-0"
              aria-label={lang === 'uk' ? 'Назад' : 'Назад'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-[28px] md:text-[34px] font-serif font-normal tracking-wide leading-none text-[var(--color-ink,#F5F1EA)] truncate">
              {t.title}
            </h1>
            <p className="text-[11px] text-[var(--color-muted,#B9ACA0)] mt-1">
              {filtered.length} {t.terms}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div ref={listRef} className="flex-1 px-4 md:px-6 overflow-y-auto pb-[110px] overscroll-none">
        {/* Search */}
        <div className="mb-4">
          <div className="rounded-[18px] px-4 py-3 flex items-center gap-2.5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="text-[var(--color-muted,#B9ACA0)] shrink-0"
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
              className="flex-1 bg-transparent border-0 outline-none text-[13px] text-[var(--color-ink,#F5F1EA)] placeholder:text-[var(--color-muted,#B9ACA0)] min-w-0"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-[var(--color-muted,#B9ACA0)] hover:text-[var(--color-ink,#F5F1EA)] p-0.5"
                aria-label="Clear"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Alphabet filter */}
        <div className="mb-3 -mx-1 overflow-x-auto scrollbar-none">
          <div className="flex gap-1.5 px-1 pb-1 min-w-max">
            <button
              type="button"
              onClick={() => setActiveLetter(null)}
              className={`h-8 px-3 rounded-full text-[12px] font-medium transition-colors shrink-0 ${
                activeLetter === null
                  ? 'bg-[var(--color-accent,#E4D00A)] text-[var(--color-bg,#1C1816)]'
                  : 'bg-[var(--color-surface,#25201C)] text-[var(--color-muted,#B9ACA0)] border border-[var(--color-border,rgba(255,255,255,0.12))]'
              }`}
            >
              {t.all}
            </button>
            {availableLetters.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
                className={`w-8 h-8 rounded-full text-[13px] font-serif font-medium transition-colors shrink-0 flex items-center justify-center ${
                  activeLetter === letter
                    ? 'bg-[var(--color-accent,#E4D00A)] text-[var(--color-bg,#1C1816)]'
                    : 'bg-[var(--color-surface,#25201C)] text-[var(--color-muted,#B9ACA0)] border border-[var(--color-border,rgba(255,255,255,0.12))]'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div className="mb-4 -mx-1 overflow-x-auto scrollbar-none">
          <div className="flex gap-1.5 px-1 pb-1 min-w-max">
            {categories.map((cat) => {
              const label = CATEGORY_LABELS[cat][lang]
              const active = activeCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(active ? null : cat)}
                  className={`h-7 px-2.5 rounded-full text-[11px] transition-colors shrink-0 ${
                    active
                      ? 'bg-[var(--color-surface-2,#2F2924)] text-[var(--color-ink,#F5F1EA)] border border-[var(--color-accent,#E4D00A)]/50'
                      : 'bg-[var(--color-surface,#25201C)] text-[var(--color-muted,#B9ACA0)] border border-[var(--color-border,rgba(255,255,255,0.08))]'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-[11px] text-[var(--color-muted,#B9ACA0)] mb-3 opacity-70">
          {t.flipHint}
        </p>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div className="rounded-[18px] p-8 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] text-center">
            <p className="text-[14px] text-[var(--color-ink,#F5F1EA)]">{t.empty}</p>
            <p className="text-[12px] text-[var(--color-muted,#B9ACA0)] mt-1">{t.emptyHint}</p>
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
        <p className="text-[10px] text-[var(--color-muted,#B9ACA0)] text-center opacity-50 mb-4">
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
          from {
            opacity: 0;
            transform: scale(0.92) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .perspective-\\[1000px\\] {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
 }
