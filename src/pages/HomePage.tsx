import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { BLOG_ARTICLES } from '../data/blog'
import { GLOSSARY_TERMS } from '../data/glossary'
import { CALCULATORS_COUNT } from './CalcMenuPage'
import type { Lang } from '../App'
import type { ExtendedWindow, HomePageProps, MenuItem, SearchResultItem } from './home/types'
import { getHomeStrings, getSafeLang } from './home/i18n'
import { getHomePalette, HOME_STYLE_SHEET } from './home/theme'
import {
  useHeroVideoCanvas,
  useHomeTheme,
  useScrollReveal,
  useTransparentLogo,
} from './home/hooks'
import { buildSearchResults } from './home/searchUtils'
import { HomeHeroCockpit } from './home/HomeHeroCockpit'
import { HomeStudioGrid } from './home/HomeStudioGrid'
import { HomeWorkspaceDock } from './home/HomeWorkspaceDock'

export function HomePage({
  onBack,
  onOpenBlog,
  onOpenCalcMenu,
  onOpenColors,
  onOpenStyles,
  onOpenGlossary,
  onOpenPrices,
  onOpenSneakers,
  onOpenMaterials,
  lang,
  setLang,
  favorites = [],
  onOpenArticle,
  onOpenFavorites,
  onChangeTab,
}: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const isDark = useHomeTheme()
  const transparentLogoSrc = useTransparentLogo('/logo.png')

  const isSearching = searchQuery.trim() !== ''
  const { heroContainerRef, heroCanvasRef, posterSrc, hasCanvasFrame } =
    useHeroVideoCanvas(!isSearching, isDark)

  useScrollReveal(rootRef, !isSearching)

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang | null
    const supportedLangs: Lang[] = ['ru', 'uk', 'de']
    if (savedLang && supportedLangs.includes(savedLang) && savedLang !== lang) {
      setLang(savedLang)
    }
  }, [lang, setLang])

  const handleLangChange = (newLang: Lang) => {
    localStorage.setItem('app_lang', newLang)
    localStorage.setItem('cordwainer_lang', newLang)
    setLang(newLang)
  }

  const safeLang = getSafeLang(lang)
  const hasNewBlog = BLOG_ARTICLES?.some((a) => a.isNew) || false
  const articleFavorites = favorites?.filter((f) => f.type === 'article') || []
  const glossaryCount = GLOSSARY_TERMS?.length || 0

  const t = useMemo(
    () =>
      getHomeStrings(
        safeLang,
        CALCULATORS_COUNT,
        hasNewBlog,
        glossaryCount,
        articleFavorites.length,
      ),
    [safeLang, hasNewBlog, glossaryCount, articleFavorites.length],
  )

  const palette = useMemo(() => getHomePalette(isDark), [isDark])

  const learningItems: MenuItem[] = useMemo(
    () => [
      { id: 'materials', roman: '01', tag: 'MAISON', title: t.materials, subtitle: t.materialsSub, action: onOpenMaterials },
      { id: 'colors', roman: '02', tag: 'PALETTE', title: t.colors, subtitle: t.colorsSub, action: onOpenColors },
      { id: 'styles', roman: '03', tag: 'LOOKBOOK', title: t.styles, subtitle: t.stylesSub, action: onOpenStyles },
      { id: 'sneakers', roman: '04', tag: 'CATALOG', title: t.sneakers, subtitle: t.sneakersSub, action: onOpenSneakers },
    ],
    [t, onOpenMaterials, onOpenColors, onOpenStyles, onOpenSneakers],
  )

  const toolItems: MenuItem[] = useMemo(
    () => [
      { id: 'calc', roman: '05', tag: 'UTILITY', title: t.calc, subtitle: t.calcSub, action: onOpenCalcMenu },
      { id: 'blog', roman: '06', tag: 'EDITORIAL', title: t.blog, subtitle: t.blogSub, action: onOpenBlog, dot: hasNewBlog },
      { id: 'glossary', roman: '07', tag: 'LEXICON', title: t.glossary, subtitle: t.glossarySub, action: () => onOpenGlossary?.() },
      { id: 'prices', roman: '08', tag: 'VALUATION', title: t.prices, subtitle: t.pricesSub, action: onOpenPrices },
    ],
    [t, onOpenCalcMenu, onOpenBlog, hasNewBlog, onOpenGlossary, onOpenPrices],
  )

  const systemItems: MenuItem[] = useMemo(
    () => [
      { id: 'settings', roman: '09', tag: 'PREFERENCES', title: t.settings, subtitle: t.settingsSub, action: () => onChangeTab?.('settings') },
      { id: 'profile', roman: '10', tag: 'IDENTITY', title: t.profile, subtitle: t.profileSub, action: () => onChangeTab?.('profile') },
    ],
    [t, onChangeTab],
  )

  const allMenuItems = useMemo(
    () => [...learningItems, ...toolItems, ...systemItems],
    [learningItems, toolItems, systemItems],
  )

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const searchResults = useMemo(
    () =>
      buildSearchResults({
        query: normalizedQuery,
        menuItems: allMenuItems,
        articles: (BLOG_ARTICLES || []) as Array<{ id: string; [key: string]: unknown }>,
        glossaryTerms: (GLOSSARY_TERMS || []) as Array<{ id: string; [key: string]: unknown }>,
        lang: safeLang,
        labels: { section: t.section, blog: t.blog, glossary: t.glossary },
      }),
    [normalizedQuery, allMenuItems, safeLang, t.section, t.blog, t.glossary],
  )

  const handleResultClick = (res: SearchResultItem) => {
    if (res.type === 'category') {
      const match = allMenuItems.find((i) => i.id === res.id)
      match?.action?.()
    } else if (res.type === 'article') {
      onOpenArticle?.(res.id)
    } else if (res.type === 'glossary') {
      onOpenGlossary?.(res.id)
    }
    setSearchQuery('')
  }

  const handleSupportClick = () => {
    const tributeLink = 'https://t.me/tribute/app?startapp=dQO9'
    const tg = (window as ExtendedWindow).Telegram?.WebApp

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(tributeLink)
    } else {
      window.open(tributeLink, '_blank')
    }
  }

  return (
    <div
      ref={rootRef}
      className="cw-home-root relative min-h-[100dvh] w-full overflow-x-hidden select-none"
      style={
        {
          backgroundColor: palette.bg,
          backgroundImage: palette.bgMesh,
          color: palette.text,
          '--cw-accent': palette.accentBronze,
        } as CSSProperties
      }
    >
      <style>{HOME_STYLE_SHEET}</style>

      {/* FLOATING DIGITAL COMMAND BAR */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{
          backgroundColor: palette.headerBg,
          borderColor: palette.border,
        }}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-sans font-medium border cursor-pointer outline-none transition-colors"
                style={{
                  color: palette.text,
                  borderColor: palette.border,
                  backgroundColor: palette.surfaceSubtle,
                }}
              >
                <span>←</span>
                <span className="hidden sm:inline">{t.back}</span>
              </button>
            )}
            <h1
              className="font-sans font-semibold text-[18px] sm:text-[20px] tracking-[-0.03em]"
              style={{ color: palette.text }}
            >
              Cordwainer
            </h1>
          </div>

          {/* Integrated Command Search (Tablet / Desktop) */}
          <div className="hidden md:flex flex-1 max-w-[440px] mx-4">
            <div
              className="w-full flex items-center gap-2.5 px-3.5 h-10 rounded-full border transition-colors"
              style={{
                backgroundColor: palette.surfaceElevated,
                borderColor: searchQuery ? palette.accentBronze : palette.border,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={palette.textMuted}
                strokeWidth="2"
                strokeLinecap="round"
                className="shrink-0"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="20" y1="20" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className="w-full bg-transparent outline-none border-0 text-[13px] font-sans placeholder:opacity-55"
                style={{ color: palette.text }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-full cursor-pointer outline-none border-0"
                  style={{
                    backgroundColor: palette.surfaceSubtle,
                    color: palette.text,
                  }}
                >
                  {t.clear}
                </button>
              )}
            </div>
          </div>

          {/* Hardware Language Pill */}
          <div
            className="inline-flex items-center p-1 rounded-full border shrink-0"
            style={{
              backgroundColor: palette.surfaceSubtle,
              borderColor: palette.border,
            }}
          >
            {(['ru', 'uk', 'de'] as Lang[]).map((l) => {
              const active = safeLang === l
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLangChange(l)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium uppercase cursor-pointer outline-none border transition-colors"
                  style={{
                    backgroundColor: active ? palette.pillActiveBg : 'transparent',
                    color: active ? palette.pillActiveText : palette.textMuted,
                    borderColor: active ? palette.pillActiveBorder : 'transparent',
                  }}
                >
                  {l === 'uk' ? 'UA' : l.toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* MAIN FLUID DIGITAL CANVAS */}
      <main className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-16">
        {/* Mobile-Only Compact Search Bar */}
        <div className="md:hidden mb-4">
          <div
            className="flex items-center gap-2.5 px-3.5 h-11 rounded-2xl border transition-colors"
            style={{
              backgroundColor: palette.surfaceElevated,
              borderColor: searchQuery ? palette.accentBronze : palette.border,
              boxShadow: palette.shadowCard,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke={palette.textMuted}
              strokeWidth="2"
              strokeLinecap="round"
              className="shrink-0"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="20" y1="20" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search}
              className="w-full bg-transparent outline-none border-0 text-[13.5px] font-sans placeholder:opacity-55"
              style={{ color: palette.text }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[11px] font-sans font-medium px-2.5 py-1 rounded-full cursor-pointer outline-none border-0 shrink-0"
                style={{
                  backgroundColor: palette.surfaceSubtle,
                  color: palette.text,
                }}
              >
                {t.clear}
              </button>
            )}
          </div>
        </div>

        {normalizedQuery ? (
          /* LIVE SEARCH RESULTS VIEW */
          <section className="pt-2">
            <div className="flex items-center justify-between mb-3 px-1">
              <span
                className="text-[12px] font-sans font-semibold uppercase tracking-[0.12em]"
                style={{ color: palette.textMuted }}
              >
                {t.searchResults}
              </span>
              <span
                className="text-[12px] font-mono"
                style={{ color: palette.textSubtle }}
              >
                {searchResults.length}
              </span>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.map((res, i) => (
                  <button
                    key={`${res.type}-${res.id}-${i}`}
                    type="button"
                    onClick={() => handleResultClick(res)}
                    className="cw-interactive group w-full flex items-center justify-between gap-4 px-4 py-3.5 rounded-2xl border text-left cursor-pointer outline-none"
                    style={{
                      backgroundColor: palette.surfaceElevated,
                      borderColor: palette.border,
                      boxShadow: palette.shadowCard,
                    }}
                  >
                    <span
                      className="font-sans font-medium text-[16px] leading-snug"
                      style={{ color: palette.text }}
                    >
                      {res.title}
                    </span>
                    <span
                      className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-full shrink-0"
                      style={{
                        backgroundColor: palette.surfaceSubtle,
                        color: palette.textMuted,
                      }}
                    >
                      {res.subtitle}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div
                className="py-14 px-6 rounded-2xl border text-[15px] font-sans text-center"
                style={{
                  color: palette.textMuted,
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                }}
              >
                {t.noResults}
              </div>
            )}
          </section>
        ) : (
          <>
            <HomeHeroCockpit
              palette={palette}
              t={t}
              onOpenStyles={onOpenStyles}
              onOpenMaterials={onOpenMaterials}
              heroContainerRef={heroContainerRef}
              heroCanvasRef={heroCanvasRef}
              posterSrc={posterSrc}
              hasCanvasFrame={hasCanvasFrame}
              transparentLogoSrc={transparentLogoSrc}
            />

            <HomeStudioGrid
              palette={palette}
              colorsItem={learningItems[1]}
              stylesItem={learningItems[2]}
              catalogItem={learningItems[3]}
            />

            <HomeWorkspaceDock
              palette={palette}
              t={t}
              tools={toolItems}
              systemItems={systemItems}
              articleFavorites={articleFavorites}
              onOpenArticle={onOpenArticle}
              onOpenFavorites={onOpenFavorites}
              onSupportClick={handleSupportClick}
            />

            {/* Minimal Digital Colophon */}
            <footer className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
              <p
                className="font-serif italic text-[15px]"
                style={{ color: palette.textMuted }}
              >
                {t.quote}
              </p>
              <p
                className="text-[11px] font-mono uppercase tracking-[0.18em] shrink-0"
                style={{ color: palette.textSubtle }}
              >
                CORDWAINER × CARDIO • MMXXVI
              </p>
            </footer>
          </>
        )}
      </main>
    </div>
  )
}
