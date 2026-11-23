import type { FavoriteItem } from '../../App'
import type { HomePalette, HomeStrings, MenuItem } from './types'

type HomeBentoSectionsProps = {
  palette: HomePalette
  t: HomeStrings
  colorsItem: MenuItem
  stylesItem: MenuItem
  catalogItem: MenuItem
  tools: MenuItem[]
  systemItems: MenuItem[]
  articleFavorites: FavoriteItem[]
  onOpenArticle?: (articleId: string) => void
  onOpenFavorites?: () => void
  onSupportClick: () => void
}

function SectionHeading({
  title,
  range,
  palette,
}: {
  title: string
  range: string
  palette: HomePalette
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4 sm:mb-5 px-1">
      <h2
        className="text-[12px] sm:text-[13px] font-sans font-semibold uppercase tracking-[0.14em]"
        style={{ color: palette.textMuted }}
      >
        {title}
      </h2>
      <span
        className="text-[11px] font-mono tabular-nums px-2.5 py-0.5 rounded-full border"
        style={{
          color: palette.textSubtle,
          borderColor: palette.border,
          backgroundColor: palette.surfaceSubtle,
        }}
      >
        {range}
      </span>
    </div>
  )
}

export function HomeBentoSections({
  palette,
  t,
  colorsItem,
  stylesItem,
  catalogItem,
  tools,
  systemItems,
  articleFavorites,
  onOpenArticle,
  onOpenFavorites,
  onSupportClick,
}: HomeBentoSectionsProps) {
  const [calcItem, blogItem, glossaryItem, pricesItem] = tools
  const [settingsItem, profileItem] = systemItems

  const swatchColors = ['#8C4A27', '#C88D55', '#5C1E24', '#263448', '#D8CEC0']

  return (
    <>
      {/* SECTION I: CORE EXPOSITION (Colors, Silhouettes, Footwear Index) */}
      <section className="mb-10 sm:mb-14 cw-reveal cw-delay-2">
        <SectionHeading title={t.learning} range="02 — 04" palette={palette} />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
          {/* 02. COLORS — Chromatic Swatch Instrument */}
          <button
            type="button"
            onClick={colorsItem.action}
            disabled={!colorsItem.action}
            className={`cw-card group relative md:col-span-6 lg:col-span-4 min-h-[208px] rounded-[24px] p-5 sm:p-6 flex flex-col justify-between text-left border overflow-hidden outline-none ${
              colorsItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
            }`}
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.border,
              boxShadow: palette.shadowCard,
            }}
          >
            <div className="flex items-center justify-between w-full">
              <span
                className="text-[11px] font-mono tabular-nums"
                style={{ color: palette.textSubtle }}
              >
                {colorsItem.roman}
              </span>
              <span
                className="text-[10px] font-mono uppercase tracking-[0.14em]"
                style={{ color: palette.textSubtle }}
              >
                {colorsItem.tag}
              </span>
            </div>

            {/* Tactile Leather & Patina Swatch Fan */}
            <div className="cw-swatch-fan flex items-center gap-1.5 my-5" aria-hidden="true">
              {swatchColors.map((hex) => (
                <span
                  key={hex}
                  className="h-9 flex-1 rounded-xl border"
                  style={{
                    backgroundColor: hex,
                    borderColor: palette.isDark
                      ? 'rgba(255,255,255,0.14)'
                      : 'rgba(20,18,16,0.12)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
                  }}
                />
              ))}
            </div>

            <div className="flex items-end justify-between gap-3">
              <div>
                <div
                  className="font-sans font-semibold text-[22px] sm:text-[24px] leading-[1.12] tracking-[-0.02em] mb-1"
                  style={{ color: palette.text }}
                >
                  {colorsItem.title}
                </div>
                <div
                  className="text-[13px] font-sans"
                  style={{ color: palette.textMuted }}
                >
                  {colorsItem.subtitle}
                </div>
              </div>
              <span
                className="cw-arrow w-9 h-9 rounded-full flex items-center justify-center border text-[13px] shrink-0"
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.surfaceSubtle,
                  color: palette.text,
                }}
              >
                ↗
              </span>
            </div>
          </button>

          {/* 03. SILHOUETTES — Last Geometry & Form Architecture */}
          <button
            type="button"
            onClick={stylesItem.action}
            disabled={!stylesItem.action}
            className={`cw-card group relative md:col-span-6 lg:col-span-4 min-h-[208px] rounded-[24px] p-5 sm:p-6 flex flex-col justify-between text-left border overflow-hidden outline-none ${
              stylesItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
            }`}
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.border,
              boxShadow: palette.shadowCard,
            }}
          >
            <div className="flex items-center justify-between w-full">
              <span
                className="text-[11px] font-mono tabular-nums"
                style={{ color: palette.textSubtle }}
              >
                {stylesItem.roman}
              </span>
              <span
                className="text-[10px] font-mono uppercase tracking-[0.14em]"
                style={{ color: palette.textSubtle }}
              >
                {stylesItem.tag}
              </span>
            </div>

            {/* Minimalist Last Contour Blueprint Graphic */}
            <div className="my-4 flex items-center justify-center" aria-hidden="true">
              <svg
                viewBox="0 0 220 58"
                fill="none"
                className="w-full h-[52px] overflow-visible"
              >
                <path
                  d="M14 44 C26 44, 34 14, 62 12 C90 10, 118 28, 152 32 C180 35, 202 36, 206 44 C208 49, 198 50, 174 50 L26 50 C16 50, 10 47, 14 44 Z"
                  stroke={palette.accentBronze}
                  strokeWidth="1.5"
                  strokeOpacity="0.85"
                />
                <path
                  d="M42 48 L42 18 M112 48 L112 24 M168 48 L168 34"
                  stroke={palette.textSubtle}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  strokeOpacity="0.55"
                />
                <circle cx="62" cy="12" r="2.5" fill={palette.accentBronze} />
                <circle cx="152" cy="32" r="2.5" fill={palette.accentBronze} />
              </svg>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div>
                <div
                  className="font-sans font-semibold text-[22px] sm:text-[24px] leading-[1.12] tracking-[-0.02em] mb-1"
                  style={{ color: palette.text }}
                >
                  {stylesItem.title}
                </div>
                <div
                  className="text-[13px] font-sans"
                  style={{ color: palette.textMuted }}
                >
                  {stylesItem.subtitle}
                </div>
              </div>
              <span
                className="cw-arrow w-9 h-9 rounded-full flex items-center justify-center border text-[13px] shrink-0"
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.surfaceSubtle,
                  color: palette.text,
                }}
              >
                ↗
              </span>
            </div>
          </button>

          {/* 04. FOOTWEAR INDEX — Precision Catalog Showcase */}
          <button
            type="button"
            onClick={catalogItem.action}
            disabled={!catalogItem.action}
            className={`cw-card group relative md:col-span-12 lg:col-span-4 min-h-[188px] md:min-h-[168px] lg:min-h-[208px] rounded-[24px] p-5 sm:p-6 flex flex-col justify-between text-left border overflow-hidden outline-none ${
              catalogItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
            }`}
            style={{
              background: palette.isDark
                ? 'linear-gradient(155deg, #1B1815 0%, #141210 100%)'
                : 'linear-gradient(155deg, #FFFFFF 0%, #F7F4EE 100%)',
              borderColor: palette.border,
              boxShadow: palette.shadowCard,
            }}
          >
            <div className="flex items-center justify-between w-full">
              <span
                className="text-[11px] font-mono tabular-nums"
                style={{ color: palette.accentBronze }}
              >
                {catalogItem.roman}
              </span>
              <span
                className="text-[10px] font-mono uppercase tracking-[0.14em] px-2.5 py-0.5 rounded-full border"
                style={{
                  color: palette.textMuted,
                  borderColor: palette.border,
                  backgroundColor: palette.surfaceSubtle,
                }}
              >
                {catalogItem.tag}
              </span>
            </div>

            {/* Precision Scale Ruler Motif */}
            <div className="my-4 flex items-end gap-1.5 h-8" aria-hidden="true">
              {[14, 24, 16, 30, 18, 22, 12, 28, 16, 20, 14, 26, 18, 22, 14].map(
                (barH, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-full"
                    style={{
                      height: `${barH}px`,
                      backgroundColor:
                        index === 3 || index === 7 || index === 11
                          ? palette.accentBronze
                          : palette.borderStrong,
                      opacity: index === 3 || index === 7 || index === 11 ? 0.85 : 0.45,
                    }}
                  />
                ),
              )}
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div
                  className="font-sans font-semibold text-[22px] sm:text-[24px] leading-[1.12] tracking-[-0.02em] mb-1"
                  style={{ color: palette.text }}
                >
                  {catalogItem.title}
                </div>
                <div
                  className="text-[13px] font-sans"
                  style={{ color: palette.textMuted }}
                >
                  {catalogItem.subtitle}
                </div>
              </div>
              <span
                className="cw-arrow w-9 h-9 rounded-full flex items-center justify-center border text-[13px] shrink-0"
                style={{
                  borderColor: palette.borderStrong,
                  backgroundColor: palette.accentBronzeSoft,
                  color: palette.text,
                }}
              >
                ↗
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* SECTION II: TOOLKIT & ARCHIVE (Asymmetric High-Tech Bento) */}
      <section className="mb-10 sm:mb-14 cw-reveal cw-delay-3">
        <SectionHeading title={t.tools} range="05 — 08" palette={palette} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* 05. CALCULATORS — Precision Hardware Module */}
          {calcItem && (
            <button
              type="button"
              onClick={calcItem.action}
              disabled={!calcItem.action}
              className={`cw-card group relative lg:col-span-5 min-h-[184px] rounded-[24px] p-5 sm:p-6 flex flex-col justify-between text-left border overflow-hidden outline-none ${
                calcItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                boxShadow: palette.shadowCard,
              }}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-mono tabular-nums"
                    style={{ color: palette.accentBronze }}
                  >
                    {calcItem.roman}
                  </span>
                  <span
                    className="text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{ color: palette.textSubtle }}
                  >
                    {calcItem.tag}
                  </span>
                </div>

                {/* Precision Tactile Matrix Glyph */}
                <div className="grid grid-cols-3 gap-1" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5].map((dot) => (
                    <span
                      key={dot}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          dot === 4 ? palette.accentBronze : palette.borderStrong,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-8 flex items-end justify-between gap-3">
                <div>
                  <div
                    className="font-sans font-semibold text-[23px] sm:text-[25px] leading-[1.12] tracking-[-0.02em] mb-1.5"
                    style={{ color: palette.text }}
                  >
                    {calcItem.title}
                  </div>
                  <div
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-mono"
                    style={{
                      backgroundColor: palette.surfaceSubtle,
                      color: palette.textMuted,
                    }}
                  >
                    {calcItem.subtitle}
                  </div>
                </div>

                <span
                  className="cw-arrow w-9 h-9 rounded-full flex items-center justify-center border text-[13px] shrink-0"
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceSubtle,
                    color: palette.text,
                  }}
                >
                  ↗
                </span>
              </div>
            </button>
          )}

          {/* 06. BLOG ARCHIVE — Living Editorial Pulse */}
          {blogItem && (
            <button
              type="button"
              onClick={blogItem.action}
              disabled={!blogItem.action}
              className={`cw-card group relative lg:col-span-7 min-h-[184px] rounded-[24px] p-5 sm:p-6 flex flex-col justify-between text-left border overflow-hidden outline-none ${
                blogItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
              style={{
                background: palette.isDark
                  ? 'linear-gradient(135deg, #1A1715 0%, #151311 100%)'
                  : 'linear-gradient(135deg, #FFFFFF 0%, #FAF6F0 100%)',
                borderColor: blogItem.dot
                  ? palette.isDark
                    ? 'rgba(224, 79, 62, 0.34)'
                    : 'rgba(200, 58, 43, 0.25)'
                  : palette.border,
                boxShadow: palette.shadowCard,
              }}
            >
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-mono tabular-nums"
                    style={{ color: palette.textSubtle }}
                  >
                    {blogItem.roman}
                  </span>
                  <span
                    className="text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{ color: palette.textSubtle }}
                  >
                    {blogItem.tag}
                  </span>
                </div>

                {blogItem.dot && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium"
                    style={{
                      backgroundColor: palette.isDark
                        ? 'rgba(224, 79, 62, 0.16)'
                        : 'rgba(200, 58, 43, 0.10)',
                      color: palette.accentRed,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full cw-live-dot"
                      style={{ backgroundColor: palette.accentRed }}
                    />
                    {blogItem.subtitle}
                  </span>
                )}
              </div>

              <div className="mt-8 flex items-end justify-between gap-4">
                <div>
                  <div
                    className="font-serif text-[28px] sm:text-[32px] leading-[1.06] tracking-[-0.015em] mb-1.5"
                    style={{ color: palette.text }}
                  >
                    {blogItem.title}
                  </div>
                  <div
                    className="text-[13px] font-sans"
                    style={{ color: palette.textMuted }}
                  >
                    {blogItem.subtitle}
                  </div>
                </div>

                <span
                  className="cw-arrow w-10 h-10 rounded-full flex items-center justify-center border text-[14px] shrink-0"
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceSubtle,
                    color: palette.text,
                  }}
                >
                  ↗
                </span>
              </div>
            </button>
          )}

          {/* 07. GLOSSARY — Architectural Lexicon */}
          {glossaryItem && (
            <button
              type="button"
              onClick={glossaryItem.action}
              disabled={!glossaryItem.action}
              className={`cw-card group relative lg:col-span-6 min-h-[168px] rounded-[24px] p-5 sm:p-6 flex flex-col justify-between text-left border overflow-hidden outline-none ${
                glossaryItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                boxShadow: palette.shadowCard,
              }}
            >
              {/* Subtle Typographic Relief Watermark */}
              <span
                className="absolute right-5 top-3 font-serif italic text-[74px] leading-none pointer-events-none select-none"
                style={{
                  color: palette.text,
                  opacity: palette.isDark ? 0.045 : 0.055,
                }}
                aria-hidden="true"
              >
                Aa
              </span>

              <div className="relative z-10 flex items-center gap-2">
                <span
                  className="text-[11px] font-mono tabular-nums"
                  style={{ color: palette.textSubtle }}
                >
                  {glossaryItem.roman}
                </span>
                <span
                  className="text-[10px] font-mono uppercase tracking-[0.14em]"
                  style={{ color: palette.textSubtle }}
                >
                  {glossaryItem.tag}
                </span>
              </div>

              <div className="relative z-10 mt-6 flex items-end justify-between gap-3">
                <div>
                  <div
                    className="font-sans font-semibold text-[22px] sm:text-[24px] leading-[1.12] tracking-[-0.02em] mb-1"
                    style={{ color: palette.text }}
                  >
                    {glossaryItem.title}
                  </div>
                  <div
                    className="text-[13px] font-mono"
                    style={{ color: palette.textMuted }}
                  >
                    {glossaryItem.subtitle}
                  </div>
                </div>
                <span
                  className="cw-arrow w-9 h-9 rounded-full flex items-center justify-center border text-[13px] shrink-0"
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceSubtle,
                    color: palette.text,
                  }}
                >
                  ↗
                </span>
              </div>
            </button>
          )}

          {/* 08. MARKET — Valuation Curve Instrument */}
          {pricesItem && (
            <button
              type="button"
              onClick={pricesItem.action}
              disabled={!pricesItem.action}
              className={`cw-card group relative lg:col-span-6 min-h-[168px] rounded-[24px] p-5 sm:p-6 flex flex-col justify-between text-left border overflow-hidden outline-none ${
                pricesItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                boxShadow: palette.shadowCard,
              }}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-mono tabular-nums"
                    style={{ color: palette.textSubtle }}
                  >
                    {pricesItem.roman}
                  </span>
                  <span
                    className="text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{ color: palette.textSubtle }}
                  >
                    {pricesItem.tag}
                  </span>
                </div>

                {/* Minimalist Valuation Sparkline */}
                <svg
                  viewBox="0 0 84 26"
                  fill="none"
                  className="w-[76px] h-[24px]"
                  aria-hidden="true"
                >
                  <path
                    d="M2 21 L18 17 L32 19 L48 10 L64 13 L82 4"
                    stroke={palette.accentBronze}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="82" cy="4" r="2.5" fill={palette.accentBronze} />
                </svg>
              </div>

              <div className="mt-6 flex items-end justify-between gap-3">
                <div>
                  <div
                    className="font-sans font-semibold text-[22px] sm:text-[24px] leading-[1.12] tracking-[-0.02em] mb-1"
                    style={{ color: palette.text }}
                  >
                    {pricesItem.title}
                  </div>
                  <div
                    className="text-[13px] font-sans"
                    style={{ color: palette.textMuted }}
                  >
                    {pricesItem.subtitle}
                  </div>
                </div>
                <span
                  className="cw-arrow w-9 h-9 rounded-full flex items-center justify-center border text-[13px] shrink-0"
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceSubtle,
                    color: palette.text,
                  }}
                >
                  ↗
                </span>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* SECTION III: SYSTEM, PERSONAL ARCHIVE & PATRONAGE */}
      <section className="mb-12 sm:mb-16 cw-reveal cw-delay-4">
        <SectionHeading title={t.system} range="09 — 12" palette={palette} />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
          {/* 09 & 10. INTERFACE & PROFILE */}
          <div className="md:col-span-6 lg:col-span-4 grid grid-cols-2 gap-4">
            {[settingsItem, profileItem].map((item, idx) =>
              item ? (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  className="cw-card group min-h-[144px] rounded-[22px] p-4 sm:p-5 flex flex-col justify-between text-left border cursor-pointer outline-none"
                  style={{
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    boxShadow: palette.shadowCard,
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className="w-8 h-8 rounded-xl flex items-center justify-center border"
                      style={{
                        borderColor: palette.border,
                        backgroundColor: palette.surfaceSubtle,
                        color: palette.text,
                      }}
                    >
                      {idx === 0 ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <line x1="4" y1="7" x2="20" y2="7" />
                          <circle cx="9" cy="7" r="2.5" fill={palette.surface} />
                          <line x1="4" y1="17" x2="20" y2="17" />
                          <circle cx="15" cy="17" r="2.5" fill={palette.surface} />
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M5 20c1.5-3.8 4.2-5.5 7-5.5s5.5 1.7 7 5.5" />
                        </svg>
                      )}
                    </span>
                    <span
                      className="text-[11px] font-mono tabular-nums"
                      style={{ color: palette.textSubtle }}
                    >
                      {item.roman}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div
                      className="font-sans font-semibold text-[16px] sm:text-[17px] leading-snug mb-0.5"
                      style={{ color: palette.text }}
                    >
                      {item.title}
                    </div>
                    <div
                      className="text-[12px] font-sans leading-snug"
                      style={{ color: palette.textMuted }}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              ) : null,
            )}
          </div>

          {/* 11. PERSONAL ARCHIVE (SAVED ARTICLES) */}
          <button
            type="button"
            onClick={() => {
              if (articleFavorites.length === 1) {
                onOpenArticle?.(articleFavorites[0].id)
              } else if (articleFavorites.length > 1) {
                onOpenFavorites?.()
              }
            }}
            className="cw-card group md:col-span-6 lg:col-span-4 min-h-[144px] rounded-[22px] p-5 flex items-center justify-between gap-4 text-left border cursor-pointer outline-none"
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.border,
              boxShadow: palette.shadowCard,
            }}
          >
            <div className="flex flex-col justify-between h-full min-w-0">
              <span
                className="text-[11px] font-mono tabular-nums mb-3"
                style={{ color: palette.textSubtle }}
              >
                11 • ARCHIVE
              </span>
              <div>
                <div
                  className="font-sans font-semibold text-[19px] leading-tight mb-1"
                  style={{ color: palette.text }}
                >
                  {t.favorites}
                </div>
                <div
                  className="text-[13px] font-sans"
                  style={{ color: palette.textMuted }}
                >
                  {t.favoritesSub}
                </div>
              </div>
            </div>

            {articleFavorites.length > 0 ? (
              <div className="flex items-center -space-x-2.5 shrink-0">
                {articleFavorites.slice(0, 3).map((fav) => (
                  <div
                    key={fav.id}
                    className="w-11 h-14 rounded-xl border-2 overflow-hidden shadow-md transition-transform duration-300 group-hover:-translate-y-0.5"
                    style={{
                      borderColor: palette.surface,
                      backgroundColor: palette.surfaceElevated,
                    }}
                  >
                    <img
                      src={fav.imagePng}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center border text-[13px] font-mono shrink-0"
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.surfaceSubtle,
                  color: palette.textSubtle,
                }}
              >
                —
              </span>
            )}
          </button>

          {/* 12. PATRONAGE / TRIBUTE */}
          <button
            type="button"
            onClick={onSupportClick}
            className="cw-card group md:col-span-12 lg:col-span-4 min-h-[144px] rounded-[22px] p-5 flex items-center justify-between gap-4 text-left border cursor-pointer outline-none"
            style={{
              background: palette.tributeBg,
              borderColor: palette.isDark
                ? 'rgba(212, 163, 115, 0.24)'
                : 'rgba(154, 107, 59, 0.22)',
              boxShadow: palette.shadowCard,
            }}
          >
            <div className="flex flex-col justify-between h-full min-w-0">
              <span
                className="text-[11px] font-mono tabular-nums mb-3"
                style={{ color: palette.accentBronze }}
              >
                12 • PATRONAGE
              </span>
              <div>
                <div
                  className="font-sans font-semibold text-[19px] leading-tight mb-1"
                  style={{ color: palette.text }}
                >
                  {t.supportTitle}
                </div>
                <div
                  className="text-[13px] font-sans"
                  style={{ color: palette.textMuted }}
                >
                  {t.supportDesc}
                </div>
              </div>
            </div>

            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-mono font-medium uppercase tracking-[0.12em] border shrink-0"
              style={{
                backgroundColor: palette.pillActiveBg,
                color: palette.pillActiveText,
                borderColor: palette.pillActiveBorder,
              }}
            >
              <span>TRIBUTE</span>
              <span className="cw-arrow">↗</span>
            </span>
          </button>
        </div>
      </section>
    </>
  )
}

