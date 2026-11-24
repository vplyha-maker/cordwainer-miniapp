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
import { HomeHeroStage } from './home/HomeHeroStage'
import { HomeStudioWorkbench } from './home/HomeStudioWorkbench'
import { HomeKnowledgeDock } from './home/HomeKnowledgeDock'

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

      {/* FLOATING SPATIAL COMMAND BAR */}
      <header
        className="fixed top-0 inset-x-0 z-40 border-b backdrop-blur-xl"
        style={{
          backgroundColor: normalizedQuery
            ? palette.headerBg
            : 'rgba(10, 10, 13, 0.54)',
          borderColor: normalizedQuery
            ? palette.border
            : 'rgba(255, 255, 255, 0.10)',
          color: normalizedQuery ? palette.text : '#F5F4F0',
        }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-14 xl:px-20 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-sans font-medium border cursor-pointer outline-none transition-colors"
                style={{
                  borderColor: normalizedQuery
                    ? palette.border
                    : 'rgba(255, 255, 255, 0.16)',
                  backgroundColor: normalizedQuery
                    ? palette.surfaceSubtle
                    : 'rgba(255, 255, 255, 0.08)',
                }}
              >
                <span>←</span>
                <span className="hidden sm:inline">{t.back}</span>
              </button>
            )}
            <h1 className="hidden md:block font-sans font-semibold text-[18px] tracking-[-0.03em]">
              Cordwaine
            </h1>
          </div>

          <div className="flex-1 max-w-[520px] mx-1 sm:mx-4">
            <div
              className="w-full flex items-center gap-2 px-3.5 h-9 rounded-full border transition-colors"
              style={{
                backgroundColor: normalizedQuery
                  ? palette.surfaceElevated
                  : 'rgba(255, 255, 255, 0.10)',
                borderColor: searchQuery
                  ? palette.accentBronze
                  : normalizedQuery
                    ? palette.border
                    : 'rgba(255, 255, 255, 0.14)',
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="shrink-0 opacity-65"
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
                className="w-full bg-transparent outline-none border-0 text-[13px] font-sans placeholder:opacity-65"
                style={{ color: 'inherit' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[10.5px] font-sans font-semibold px-2 py-0.5 rounded-full cursor-pointer outline-none border-0 shrink-0"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.16)',
                    color: 'inherit',
                  }}
                >
                  {t.clear}
                </button>
              )}
            </div>
          </div>

          <div
            className="inline-flex items-center p-0.5 rounded-full border shrink-0"
            style={{
              backgroundColor: normalizedQuery
                ? palette.surfaceSubtle
                : 'rgba(255, 255, 255, 0.08)',
              borderColor: normalizedQuery
                ? palette.border
                : 'rgba(255, 255, 255, 0.14)',
            }}
          >
            {(['ru', 'uk', 'de'] as Lang[]).map((l) => {
              const active = safeLang === l
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLangChange(l)}
                  className="px-2 sm:px-2.5 py-1 rounded-full text-[10.5px] font-mono font-medium uppercase cursor-pointer outline-none border-0 transition-colors"
                  style={{
                    backgroundColor: active
                      ? normalizedQuery
                        ? palette.pillActiveBg
                        : '#F5F4F0'
                      : 'transparent',
                    color: active
                      ? normalizedQuery
                        ? palette.pillActiveText
                        : '#08080A'
                      : 'inherit',
                    opacity: active ? 1 : 0.72,
                  }}
                >
                  {l === 'uk' ? 'UA' : l.toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* MAIN SEAMLESS SPATIAL CANVAS */}
      <main className="relative z-10 w-full">
        {normalizedQuery ? (
          <section className="w-full px-4 sm:px-8 lg:px-14 xl:px-20 pt-20 pb-16">
            <div
              className="flex items-center justify-between pb-3 mb-2 border-b"
              style={{ borderColor: palette.border }}
            >
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
              <div className="divide-y" style={{ borderColor: palette.border }}>
                {searchResults.map((res, i) => (
                  <button
                    key={`${res.type}-${res.id}-${i}`}
                    type="button"
                    onClick={() => handleResultClick(res)}
                    className="cw-pane group w-full flex items-center justify-between gap-4 py-4 px-2 text-left cursor-pointer outline-none bg-transparent border-0"
                    style={{ borderColor: palette.border }}
                  >
                    <span
                      className="font-sans font-medium text-[17px] leading-snug"
                      style={{ color: palette.text }}
                    >
                      {res.title}
                    </span>
                    <span
                      className="inline-flex items-center gap-2 text-[11px] font-mono uppercase shrink-0"
                      style={{ color: palette.textMuted }}
                    >
                      <span>{res.subtitle}</span>
                      <span className="cw-glide">→</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div
                className="py-16 text-[15px] font-sans text-center"
                style={{ color: palette.textMuted }}
              >
                {t.noResults}
              </div>
            )}
          </section>
        ) : (
          <>
            <HomeHeroStage
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

            <HomeStudioWorkbench
              palette={palette}
              colorsItem={learningItems[1]}
              catalogItem={learningItems[3]}
              calcItem={toolItems[0]}
            />

            <HomeKnowledgeDock
              palette={palette}
              t={t}
              blogItem={toolItems[1]}
              glossaryItem={toolItems[2]}
              pricesItem={toolItems[3]}
              systemItems={systemItems}
              articleFavorites={articleFavorites}
              onOpenArticle={onOpenArticle}
              onOpenFavorites={onOpenFavorites}
              onSupportClick={handleSupportClick}
            />
          </>
        )}
      </main>
    </div>
  )
}
