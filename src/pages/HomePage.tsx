import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { BLOG_ARTICLES } from '../data/blog'
import { GLOSSARY_TERMS } from '../data/glossary'
import { CALCULATORS_COUNT } from './CalcMenuPage'
import type { Lang } from '../App'
import type { ExtendedWindow, HomePageProps, MenuItem, SearchResultItem } from './home/types'
import { getHomeStrings, getSafeLang } from './home/i18n'
import { getHomePalette, HOME_STYLE_SHEET } from './home/theme'
import { useHeroVideoCanvas, useHomeTheme, useTransparentLogo } from './home/hooks'
import { buildSearchResults } from './home/searchUtils'
import { HomeHeroAndCardio } from './home/HomeHeroAndCardio'
import { HomeBentoSections } from './home/HomeBentoSections'

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
  const isDark = useHomeTheme()
  const transparentLogoSrc = useTransparentLogo('/logo.png')

  const isSearching = searchQuery.trim() !== ''
  const { heroContainerRef, heroCanvasRef, posterSrc, hasCanvasFrame } =
    useHeroVideoCanvas(!isSearching, isDark)

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

      {/* Floating Frosted Top Navigation */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{
          backgroundColor: palette.headerBg,
          borderColor: palette.border,
        }}
      >
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-sans font-medium border cursor-pointer outline-none transition-colors"
              style={{
                color: palette.text,
                borderColor: palette.border,
                backgroundColor: palette.surfaceSubtle,
              }}
            >
              <span>←</span>
              <span>{t.back}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: palette.accentBronze }}
              />
              <span
                className="text-[11px] sm:text-[12px] font-mono font-medium uppercase tracking-[0.16em]"
                style={{ color: palette.textMuted }}
              >
                CORDWAINER × CARDIO
              </span>
            </div>
          )}

          {/* Tactile Segmented Language Switcher */}
          <div
            className="inline-flex items-center p-1 rounded-full border"
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
                  className="px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-mono font-medium uppercase tracking-[0.08em] cursor-pointer outline-none border transition-colors"
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

      {/* Main Fluid Responsive Container */}
      <main className="relative z-10 max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 sm:pt-10 pb-20">
        {/* Brand Identity + Spotlight Search Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 sm:mb-10 cw-reveal">
          <div>
            <div className="flex items-center gap-3 mb-2.5">
              <span
                className="text-[11px] sm:text-[12px] font-sans font-medium tracking-[0.12em] uppercase"
                style={{ color: palette.accentBronze }}
              >
                {t.issue}
              </span>
              <span
                className="text-[12px] font-serif italic"
                style={{ color: palette.textSubtle }}
              >
                Vol. I
              </span>
            </div>

            <h1
              className="font-sans font-semibold text-[40px] sm:text-[54px] lg:text-[64px] leading-[0.94] tracking-[-0.04em]"
              style={{ color: palette.text }}
            >
              Cordwainer
            </h1>
          </div>

          {/* Spotlight Search Dock */}
          <div className="w-full lg:w-[420px] shrink-0">
            <div
              className="relative flex items-center gap-3 px-4 h-12 sm:h-[52px] rounded-2xl border transition-colors"
              style={{
                backgroundColor: palette.surface,
                borderColor: searchQuery ? palette.accentBronze : palette.border,
                boxShadow: palette.shadowCard,
              }}
            >
              <svg
                width="16"
                height="16"
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
                className="w-full bg-transparent outline-none border-0 text-[14px] font-sans placeholder:opacity-55"
                style={{ color: palette.text }}
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-2.5 py-1 rounded-full text-[11px] font-sans font-medium cursor-pointer outline-none border shrink-0 transition-colors"
                  style={{
                    color: palette.text,
                    backgroundColor: palette.surfaceSubtle,
                    borderColor: palette.border,
                  }}
                >
                  {t.clear}
                </button>
              )}
            </div>
          </div>
        </div>

        {normalizedQuery ? (
          /* Live Search Results Stage */
          <section className="cw-reveal">
            <div className="flex items-center justify-between mb-4 px-1">
              <p
                className="text-[12px] font-sans font-semibold uppercase tracking-[0.14em]"
                style={{ color: palette.textMuted }}
              >
                {t.searchResults}
              </p>
              <span
                className="text-[12px] font-mono tabular-nums px-2.5 py-0.5 rounded-full border"
                style={{
                  color: palette.textMuted,
                  borderColor: palette.border,
                  backgroundColor: palette.surfaceSubtle,
                }}
              >
                {searchResults.length}
              </span>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {searchResults.map((res, i) => (
                  <button
                    key={`${res.type}-${res.id}-${i}`}
                    type="button"
                    onClick={() => handleResultClick(res)}
                    className="cw-card group w-full flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border text-left cursor-pointer outline-none"
                    style={{
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      boxShadow: palette.shadowCard,
                    }}
                  >
                    <div
                      className="font-sans font-medium text-[17px] sm:text-[18px] leading-snug"
                      style={{ color: palette.text }}
                    >
                      {res.title}
                    </div>
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-[0.08em] border shrink-0"
                      style={{
                        color: palette.textMuted,
                        borderColor: palette.border,
                        backgroundColor: palette.surfaceSubtle,
                      }}
                    >
                      <span>{res.subtitle}</span>
                      <span className="cw-arrow">↗</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div
                className="py-16 px-6 rounded-[24px] border text-[16px] font-serif italic text-center"
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
            <HomeHeroAndCardio
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

            <HomeBentoSections
              palette={palette}
              t={t}
              colorsItem={learningItems[1]}
              stylesItem={learningItems[2]}
              catalogItem={learningItems[3]}
              tools={toolItems}
              systemItems={systemItems}
              articleFavorites={articleFavorites}
              onOpenArticle={onOpenArticle}
              onOpenFavorites={onOpenFavorites}
              onSupportClick={handleSupportClick}
            />

            {/* Minimal Studio Colophon */}
            <footer
              className="pt-8 pb-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left"
              style={{ borderColor: palette.border }}
            >
              <p
                className="font-serif italic text-[17px] leading-[1.5]"
                style={{ color: palette.textMuted }}
              >
                {t.quote}
              </p>
              <p
                className="text-[11px] font-mono uppercase tracking-[0.22em] shrink-0"
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
