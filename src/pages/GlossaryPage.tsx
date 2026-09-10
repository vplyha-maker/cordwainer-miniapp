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

const ALPHABETS = {
  ru: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split(''),
  uk: 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЮЯ'.split(''),
  de: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ'.split('')
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

  return (
    <div className="glossary-theme-root relative flex flex-col h-[100dvh] bg-[var(--color-bg,#1C1816)] text-[var(--color-ink,#F5F1EA)] overflow-hidden">
      <div className="px-4 md:px-6 pt-5 pb-3 flex items-center justify-between shrink-0 relative z-20">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-ink,#F5F1EA)] bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-90 transition-transform shrink-0"
              aria-label={lang === 'de' ? 'Zurück' : (lang === 'uk' ? 'Назад' : 'Назад')}
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

      <div ref={listRef} className="flex-1 px-4 md:px-6 overflow-y-auto pb-[110px] overscroll-none">
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

        <div className="mb-3 -mx-1 overflow-x-auto scrollbar-none">
          <div className="flex gap-1.5 px-1 pb-1 min-w-max">
            <button
              type="button"
              onClick={() => setActiveLetter(null)}
              className={`h-8 px-3 rounded-full text-[12px] font-medium transition-colors shrink-0 ${
                activeLetter === null
                  ? 'bg-[var(--color-accent,#E4D00A)] text-[#1C1816]'
                  : 'bg-[var(--color-surface,#25201C)] text-[var(--color-muted,#B9ACA0)] border border-[var(--color-border,rgba(255,255,255,0.12))]'
              }`}
            >
              {t.all}
            </button>
            {availableLetters.map((letter) => {
              const hasTerms = activeLetters.has(letter)
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!hasTerms}
                  onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
                  className={`w-8 h-8 rounded-full text-[13px] font-serif font-medium transition-colors shrink-0 flex items-center justify-center ${
                    activeLetter === letter
                      ? 'bg-[var(--color-accent,#E4D00A)] text-[#1C1816]'
                      : hasTerms
                        ? 'bg-[var(--color-surface,#25201C)] text-[var(--color-muted,#B9ACA0)] border border-[var(--color-border,rgba(255,255,255,0.12))]'
                        : 'bg-[var(--color-surface,#25201C)] text-[var(--color-muted,#B9ACA0)] border border-[var(--color-border,rgba(255,255,255,0.12))] opacity-30 pointer-events-none'
                  }`}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        </div>

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

        <p className="text-[11px] text-[var(--color-muted,#B9ACA0)] mb-3">
          {t.flipHint}
        </p>

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

        <p className="text-[10px] text-[var(--color-muted,#B9ACA0)] text-center mb-4">
          {t.source}
        </p>
      </div>

      <div className="fixed bottom-[10px] left-0 right-0 z-50 pointer-events-auto">
        <div className="mx-auto w-full max-w-[var(--app-max-width)]">
          <BottomDock active="search" lang={lang} />
        </div>
      </div>

      <style>{`
        .glossary-theme-root {
          /* Light (Day) Theme - Baseline iOS Fallback */
          --color-bg: #F5F1EA;
          --color-ink: #1C1816;
          --color-surface: #FFFFFF;
          --color-surface-2: #E8E3DA;
          --color-border: rgba(0, 0, 0, 0.12);
          --color-muted: #665E57;
          --color-accent: #E4D00A;
        }

        @media (prefers-color-scheme: dark) {
          .glossary-theme-root {
            /* Dark (Night) Theme - Baseline iOS Fallback */
            --color-bg: #1C1816;
            --color-ink: #F5F1EA;
            --color-surface: #25201C;
            --color-surface-2: #2F2924;
            --color-border: rgba(255, 255, 255, 0.12);
            --color-muted: #B9ACA0;
            --color-accent: #E4D00A;
          }
        }

        /* Безопасное применение P3 только если браузер 100% его читает */
        @supports (color: color(display-p3 1 1 1)) {
          @media (color-gamut: p3) {
            .glossary-theme-root {
              --color-bg: color(display-p3 0.961 0.945 0.918);
              --color-ink: color(display-p3 0.110 0.094 0.086);
              --color-surface: color(display-p3 1 1 1);
              --color-surface-2: color(display-p3 0.910 0.890 0.855);
              --color-border: rgba(0, 0, 0, 0.12);
              --color-muted: color(display-p3 0.400 0.369 0.341);
              --color-accent: color(display-p3 0.894 0.816 0.039);
            }
          }
          
          @media (color-gamut: p3) and (prefers-color-scheme: dark) {
            .glossary-theme-root {
              --color-bg: color(display-p3 0.110 0.094 0.086);
              --color-ink: color(display-p3 0.961 0.945 0.918);
              --color-surface: color(display-p3 0.145 0.125 0.110);
              --color-surface-2: color(display-p3 0.184 0.161 0.141);
              --color-border: rgba(255, 255, 255, 0.12);
              --color-muted: color(display-p3 0.725 0.675 0.627);
              --color-accent: color(display-p3 0.894 0.816 0.039);
            }
          }
        }

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
