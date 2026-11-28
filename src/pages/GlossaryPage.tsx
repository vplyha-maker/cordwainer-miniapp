import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  GLOSSARY_TERMS,
  searchTerms,
  type GlossaryTerm,
} from '../data/glossary'
import type { Lang } from '../App'
import { FlipCard } from '../components/FlipCard'
import { GlossaryDossierModal } from './glossary/GlossaryDossierModal'
import {
  ALPHABETS,
  CATEGORY_META,
  GLOSSARY_I18N,
  getAltTitle,
  getGlossaryTheme,
  getLocalizedDef,
  getLocalizedTitle,
  haptic,
  resolveGlossaryLang,
  type GlossaryCategory,
} from './glossary/glossaryConfig'

type GlossaryPageProps = {
  onBack?: () => void
  lang: Lang
  setLang?: (lang: Lang) => void
  initialTermId?: string | null
}

const RENDER_BATCH_SIZE = 48

export function GlossaryPage({ onBack, lang, initialTermId }: GlossaryPageProps) {
  const safeLang = resolveGlossaryLang(lang)
  const t = GLOSSARY_I18N[safeLang]

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [activeLetter, setActiveLetter] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory | null>(null)
  const [viewMode, setViewMode] = useState<'lookbook' | 'index'>('lookbook')
  const [selectedDossier, setSelectedDossier] = useState<GlossaryTerm | null>(null)
  const [visibleCount, setVisibleCount] = useState(RENDER_BATCH_SIZE)

  const [isProPurchased, setIsProPurchased] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const onBackRef = useRef(onBack)

  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  useLayoutEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    } catch {}
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Нативная кнопка «Назад» в Telegram Mini App
  useEffect(() => {
    const tg = (window as unknown as {
      Telegram?: {
        WebApp?: {
          BackButton?: {
            show?: () => void
            hide?: () => void
            onClick?: (cb: () => void) => void
            offClick?: (cb: () => void) => void
          }
        }
      }
    }).Telegram?.WebApp

    const tgBack = tg?.BackButton
    if (!tgBack?.onClick) return

    const listener = () => {
      haptic('medium')
      onBackRef.current?.()
    }
    try {
      tgBack.show?.()
      tgBack.onClick(listener)
    } catch {}

    return () => {
      try {
        tgBack.offClick?.(listener)
        tgBack.hide?.()
      } catch {}
    }
  }, [])

  useEffect(() => {
    setActiveLetter(null)
  }, [safeLang])

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

  useEffect(() => {
    if (initialTermId) {
      const term = GLOSSARY_TERMS.find((item) => item.id === initialTermId)
      if (term) {
        setQuery(getLocalizedTitle(term, safeLang))
        setActiveLetter(null)
        setActiveCategory(null)
      }
    }
  }, [initialTermId, safeLang])

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

  // O(1) индекс терминов вместо O(N^2) findIndex при рендере больших баз
  const termIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    GLOSSARY_TERMS.forEach((item, idx) => map.set(item.id, idx))
    return map
  }, [])

  const categories = useMemo(
    () =>
      Array.from(
        new Set(GLOSSARY_TERMS.map((x) => x.category ?? 'other'))
      ) as GlossaryCategory[],
    []
  )

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    GLOSSARY_TERMS.forEach((item) => {
      const cat = item.category ?? 'other'
      counts[cat] = (counts[cat] ?? 0) + 1
    })
    return counts
  }, [])

  const activeLetters = useMemo(() => {
    const letters = new Set<string>()
    GLOSSARY_TERMS.forEach((item) => {
      const title = getLocalizedTitle(item, safeLang)
      if (title) letters.add(title.charAt(0).toUpperCase())
    })
    return letters
  }, [safeLang])

  const filtered = useMemo(() => {
    let list = searchTerms(deferredQuery, safeLang)
    if (activeLetter) {
      list = list.filter(
        (item) => getLocalizedTitle(item, safeLang).charAt(0).toUpperCase() === activeLetter
      )
    }
    if (activeCategory) {
      list = list.filter((item) => (item.category ?? 'other') === activeCategory)
    }
    return list
  }, [deferredQuery, activeLetter, activeCategory, safeLang])

  useEffect(() => {
    setVisibleCount(RENDER_BATCH_SIZE)
  }, [deferredQuery, activeLetter, activeCategory, safeLang, viewMode])

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || visibleCount >= filtered.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(filtered.length, prev + RENDER_BATCH_SIZE))
        }
      },
      { rootMargin: '320px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visibleCount, filtered.length])

  const visibleTerms = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  )

  const availableLetters = ALPHABETS[safeLang] || ALPHABETS.ru
  const theme = getGlossaryTheme(isDark)
  const hasActiveFilters = Boolean(query.trim() || activeLetter || activeCategory)

  const selectedCatalogNumber = selectedDossier
    ? (termIndexMap.get(selectedDossier.id) ?? 0) + 1
    : 1

  return (
    <div
      className={`min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden transition-colors duration-300 ${theme.bgPage} ${theme.textPrimary} select-none`}
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes cwViewFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cwBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cwSheetIn {
          from { opacity: 0; transform: translateY(18px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cw-view-fade { animation: cwViewFade 0.2s ease-out; }
        .cw-backdrop-in { animation: cwBackdropIn 0.18s ease-out; }
        .cw-sheet-in { animation: cwSheetIn 0.26s cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>

      {/* ================= STICKY TOP BAR ================= */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-xl transition-colors duration-300 ${theme.bgHeader} border-b ${theme.hairline} pt-[env(safe-area-inset-top)]`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              haptic('light')
              onBack?.()
            }}
            className={`inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-full text-xs font-sans font-medium tracking-wide cursor-pointer active:scale-95 transition-all ${theme.bgSurface} ${theme.textPrimary}`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span>{t.back}</span>
          </button>

          <span className="hidden min-[380px]:block font-serif text-[13px] sm:text-sm uppercase tracking-[0.26em] font-medium">
            Cordwaine
          </span>

          {/* Сегментированный переключатель GRID / INDEX */}
          <div className={`inline-flex items-center p-1 rounded-full ${theme.bgSurface}`}>
            <button
              type="button"
              onClick={() => {
                haptic('light')
                setViewMode('lookbook')
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-sans font-semibold tracking-[0.06em] uppercase transition-all cursor-pointer ${
                viewMode === 'lookbook' ? theme.activeInvert : theme.textSecondary
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>GRID</span>
            </button>

            <button
              type="button"
              onClick={() => {
                haptic('light')
                setViewMode('index')
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-sans font-semibold tracking-[0.06em] uppercase transition-all cursor-pointer ${
                viewMode === 'index' ? theme.activeInvert : theme.textSecondary
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 6h13" />
                <path d="M8 12h13" />
                <path d="M8 18h13" />
                <path d="M3 6h.01" />
                <path d="M3 12h.01" />
                <path d="M3 18h.01" />
              </svg>
              <span>INDEX</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN WORKSPACE ================= */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-[max(3rem,env(safe-area-inset-bottom))] space-y-5 sm:space-y-6">
        {/* 1. ЗАГОЛОВОК + ПОИСК (АДАПТИВНЫЙ WORKSPACE HEADER) */}
        <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`text-[11px] font-sans font-semibold uppercase tracking-[0.18em] ${theme.accentText}`}>
                {t.eyebrow}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono tabular-nums ${theme.bgSurface} ${theme.textSecondary}`}
              >
                {filtered.length} / {GLOSSARY_TERMS.length}
              </span>
            </div>

            <h1 className="font-serif text-[36px] sm:text-[46px] lg:text-[52px] font-normal leading-[1.02] tracking-[-0.025em]">
              {t.title}
            </h1>

            <p className={`text-[13.5px] sm:text-[14.5px] font-sans leading-relaxed ${theme.textSecondary}`}>
              {t.manifesto}
            </p>
          </div>

          {/* Поисковая строка Spotlight-уровня */}
          <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0">
            <div
              onClick={() => searchInputRef.current?.focus()}
              className={`group flex items-center gap-3 h-12 sm:h-[52px] px-4 rounded-2xl border transition-all duration-200 ${theme.bgCardStatic} ${theme.hairline} focus-within:border-[#C9A86A] focus-within:ring-4 focus-within:ring-[#C9A86A]/12 ${theme.cardShadow}`}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`shrink-0 transition-colors ${query ? theme.accentText : theme.textTertiary}`}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>

              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveLetter(null)
                }}
                placeholder={t.searchPlaceholder}
                className={`w-full bg-transparent outline-none border-0 text-[14.5px] font-sans ${theme.textPrimary} placeholder:opacity-50`}
              />

              {query && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    haptic('light')
                    setQuery('')
                    searchInputRef.current?.focus()
                  }}
                  aria-label="Clear search"
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-90 ${theme.bgSurfaceSoft} ${theme.textSecondary}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 2. VIP БАННЕР (ЕСЛИ PRO НЕ КУПЛЕН) */}
        {!isProPurchased && (
          <section
            onClick={handleProClick}
            className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all active:scale-[0.995] flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${theme.bgSurface} ${
              isDark ? 'border-[#C9A86A]/25' : 'border-[#9A6B2F]/25'
            }`}
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: isDark ? 'rgba(201,168,106,0.14)' : 'rgba(154,107,47,0.12)',
                  color: theme.accentHex,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="font-serif text-[18px] leading-snug">{t.vipTitle}</h2>
                <p className={`text-[12.5px] font-sans leading-relaxed mt-0.5 ${theme.textSecondary}`}>
                  {t.vipDesc(GLOSSARY_TERMS.length)}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isPurchasing}
              className={`sm:shrink-0 min-h-[42px] px-5 py-2.5 rounded-2xl text-[12px] font-sans font-semibold uppercase tracking-[0.1em] transition-transform active:scale-[0.98] cursor-pointer ${theme.activeInvert}`}
            >
              {isPurchasing ? '...' : t.vipBtn}
            </button>
          </section>
        )}

        {/* 3. КАТЕГОРИИ И АЛФАВИТНАЯ НАВИГАЦИЯ */}
        <section className="space-y-3">
          {/* Категории-чипы с цветовой дифференциацией */}
          <div className="flex items-center gap-2 overflow-x-auto sm:flex-wrap pb-1 scrollbar-hide">
            <button
              type="button"
              onClick={() => {
                haptic('light')
                setActiveCategory(null)
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[12.5px] font-sans font-medium whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
                activeCategory === null
                  ? theme.activeInvert
                  : `${theme.bgSurface} ${theme.textSecondary} hover:opacity-90`
              }`}
            >
              <span>{t.all}</span>
              <span className="text-[11px] opacity-65 tabular-nums">{GLOSSARY_TERMS.length}</span>
            </button>

            {categories.map((cat) => {
              const isActive = activeCategory === cat
              const meta = CATEGORY_META[cat]
              const dotColor = isDark ? meta.dotDark : meta.dotLight

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    haptic('light')
                    setActiveCategory(isActive ? null : cat)
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[12.5px] font-sans font-medium whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
                    isActive
                      ? theme.activeInvert
                      : `${theme.bgSurface} ${theme.textSecondary} hover:opacity-90`
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: isActive ? theme.accentHex : dotColor,
                    }}
                  />
                  <span>{meta[safeLang]}</span>
                  <span className="text-[11px] opacity-60 tabular-nums">
                    {categoryCounts[cat] ?? 0}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Компактная сенсорная алфавитная линейка */}
          <div
            className={`flex items-center gap-1 p-1.5 rounded-2xl border overflow-x-auto scrollbar-hide ${theme.bgSurface} ${theme.hairline}`}
          >
            <button
              type="button"
              onClick={() => {
                haptic('light')
                setActiveLetter(null)
              }}
              className={`h-8 px-3 rounded-xl text-[11.5px] font-sans font-semibold shrink-0 transition-all cursor-pointer ${
                activeLetter === null ? theme.activeInvert : theme.textSecondary
              }`}
            >
              {t.allLetters}
            </button>

            <div className={`w-px h-4 mx-1 shrink-0 ${isDark ? 'bg-[#F4F0E8]/12' : 'bg-[#181715]/12'}`} />

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
                  className={`min-w-[32px] h-8 px-1 rounded-xl text-[13px] font-sans font-medium shrink-0 transition-all ${
                    !hasTerms
                      ? 'opacity-20 pointer-events-none'
                      : isSelected
                      ? `${theme.activeInvert} font-semibold shadow-sm`
                      : `${theme.textPrimary} opacity-75 hover:opacity-100 cursor-pointer`
                  }`}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        </section>

        {/* 4. КОНТЕНТ: GRID ИЛИ INDEX */}
        {filtered.length === 0 ? (
          <div className={`py-16 px-6 rounded-3xl border text-center flex flex-col items-center gap-3 ${theme.bgCardStatic} ${theme.hairline}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme.bgSurface} ${theme.textTertiary}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <h3 className="font-serif text-2xl">{t.empty}</h3>
            <p className={`text-[13.5px] font-sans max-w-sm ${theme.textSecondary}`}>
              {t.emptySub}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  haptic('light')
                  setQuery('')
                  setActiveLetter(null)
                  setActiveCategory(null)
                }}
                className={`mt-2 px-5 py-2.5 rounded-full text-xs font-sans font-semibold uppercase tracking-[0.1em] cursor-pointer active:scale-95 transition-transform ${theme.activeInvert}`}
              >
                {t.emptyReset}
              </button>
            )}
          </div>
        ) : viewMode === 'lookbook' ? (
          /* АДАПТИВНАЯ СЕТКА (1 колонка на смартфоне, 2 на планшете, 3 на ПК) */
          <section
            key="grid-view"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 cw-view-fade"
          >
            {visibleTerms.map((term, i) => {
              const globalIndex = termIndexMap.get(term.id) ?? i
              const isFree = globalIndex < 3

              return (
                <FlipCard
                  key={term.id}
                  term={term}
                  lang={safeLang}
                  index={i}
                  catalogNumber={globalIndex + 1}
                  isDark={isDark}
                  flipHint={t.flipHint}
                  isLocked={!isProPurchased && !isFree}
                  onUnlock={handleProClick}
                  isPurchasing={isPurchasing}
                  onOpenDossier={(item) => setSelectedDossier(item)}
                />
              )
            })}
          </section>
        ) : (
          /* СТРУКТУРИРОВАННЫЙ INDEX (БАЗА ЗНАНИЙ LINEAR / NOTION) */
          <section
            key="index-view"
            className={`rounded-3xl border overflow-hidden cw-view-fade ${theme.bgCardStatic} ${theme.hairline} ${theme.cardShadow}`}
          >
            {/* Шапка таблицы для планшетов и ПК */}
            <div
              className={`hidden md:grid md:grid-cols-[72px_minmax(190px,1.2fr)_140px_minmax(240px,2fr)_104px] items-center gap-4 px-6 py-3 border-b text-[11px] font-sans font-semibold uppercase tracking-[0.12em] ${theme.bgSurface} ${theme.hairline} ${theme.textTertiary}`}
            >
              <span>#</span>
              <span>{t.colTerm}</span>
              <span>{t.colCategory}</span>
              <span>{t.colDefinition}</span>
              <span className="text-right">{t.colAction}</span>
            </div>

            <div className={`divide-y ${theme.divider}`}>
              {visibleTerms.map((term, i) => {
                const globalIndex = termIndexMap.get(term.id) ?? i
                const isFree = globalIndex < 3
                const locked = !isProPurchased && !isFree
                const cat = term.category ?? 'other'
                const catMeta = CATEGORY_META[cat]
                const catPill = isDark ? catMeta.pillDark : catMeta.pillLight
                const catDot = isDark ? catMeta.dotDark : catMeta.dotLight
                const title = getLocalizedTitle(term, safeLang)
                const altTitle = getAltTitle(term, safeLang)
                const definition = getLocalizedDef(term, safeLang)

                return (
                  <div
                    key={term.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      haptic('light')
                      if (locked) {
                        handleProClick()
                      } else {
                        setSelectedDossier(term)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        if (locked) handleProClick()
                        else setSelectedDossier(term)
                      }
                    }}
                    className={`group px-4 sm:px-6 py-4 transition-colors cursor-pointer outline-none ${
                      isDark ? 'hover:bg-[#1B1B1F] active:bg-[#1E1E23]' : 'hover:bg-[#F7F4EE]/80 active:bg-[#EFEAE1]/70'
                    }`}
                  >
                    {/* Мобильная и планшет/ПК сетка строки */}
                    <div className="flex items-start justify-between gap-3 md:grid md:grid-cols-[72px_minmax(190px,1.2fr)_140px_minmax(240px,2fr)_104px] md:items-center md:gap-4">
                      {/* Номер (ПК) */}
                      <span className={`hidden md:block font-mono text-[12px] tabular-nums ${theme.textTertiary}`}>
                        #{String(globalIndex + 1).padStart(3, '0')}
                      </span>

                      {/* Название + перевод + мобильное превью */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="md:hidden w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: catDot }}
                          />
                          <h3 className="font-serif text-[19px] md:text-[17px] leading-snug truncate">
                            {title}
                          </h3>
                        </div>

                        {altTitle && altTitle !== title && (
                          <p className={`text-[12px] font-sans truncate mt-0.5 ${theme.textTertiary}`}>
                            {altTitle}
                          </p>
                        )}

                        {!locked && (
                          <p className={`md:hidden text-[12.5px] font-sans line-clamp-1 mt-1.5 ${theme.textSecondary}`}>
                            {definition}
                          </p>
                        )}
                      </div>

                      {/* Категория (ПК) */}
                      <div className="hidden md:flex">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium border ${catPill}`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: catDot }}
                          />
                          <span className="truncate">{catMeta[safeLang]}</span>
                        </span>
                      </div>

                      {/* Краткое описание (ПК) */}
                      <p className={`hidden md:block text-[13px] font-sans line-clamp-1 ${theme.textSecondary}`}>
                        {locked ? t.paywallDesc : definition}
                      </p>

                      {/* Статус / Действие */}
                      <div className="shrink-0 flex md:justify-end pt-0.5 md:pt-0">
                        {locked ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-sans font-semibold ${theme.bgSurface} ${theme.accentText}`}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <rect x="3" y="11" width="18" height="11" rx="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            {t.lockedBadge}
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11.5px] font-sans font-medium transition-colors ${theme.bgSurface} ${theme.textPrimary}`}
                          >
                            <span>{t.readAction}</span>
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                              style={{ color: theme.accentHex }}
                            >
                              <path d="M7 17 17 7" />
                              <path d="M7 7h10v10" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Сенсор прогрессивной подгрузки (для плавной работы на 1000–10000+ терминов) */}
        {visibleCount < filtered.length && (
          <div ref={loadMoreRef} className="h-10 w-full flex items-center justify-center">
            <span className={`text-xs font-mono ${theme.textTertiary}`}>
              {visibleCount} / {filtered.length}
            </span>
          </div>
        )}
      </main>

      {/* ================= ОКНО ЧТЕНИЯ ТЕРМИНА ================= */}
      <GlossaryDossierModal
        term={selectedDossier}
        catalogNumber={selectedCatalogNumber}
        lang={safeLang}
        isDark={isDark}
        onClose={() => setSelectedDossier(null)}
      />
    </div>
  )
}
