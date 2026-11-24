import type { FavoriteItem } from '../../App'
import type { HomePalette, HomeStrings, MenuItem } from './types'

type HomeWorkspaceDockProps = {
  palette: HomePalette
  t: HomeStrings
  tools: MenuItem[]
  systemItems: MenuItem[]
  articleFavorites: FavoriteItem[]
  onOpenArticle?: (articleId: string) => void
  onOpenFavorites?: () => void
  onSupportClick: () => void
}

export function HomeWorkspaceDock({
  palette,
  t,
  tools,
  systemItems,
  articleFavorites,
  onOpenArticle,
  onOpenFavorites,
  onSupportClick,
}: HomeWorkspaceDockProps) {
  const [calcItem, blogItem, glossaryItem, pricesItem] = tools
  const [settingsItem, profileItem] = systemItems

  return (
    <section className="space-y-4 sm:space-y-5 mb-10 sm:mb-12">
      {/* WORKSPACE INSTRUMENTS — Asymmetric 12-Col Digital Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
        {/* CALCULATORS: Hardware Keypad Console */}
        {calcItem && (
          <div className="md:col-span-5 lg:col-span-4 cw-reveal-block">
            <button
              type="button"
              onClick={calcItem.action}
              disabled={!calcItem.action}
              className={`cw-interactive group w-full h-full min-h-[158px] rounded-[24px] p-5 flex items-center justify-between gap-4 text-left border outline-none ${
                calcItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
              style={{
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
                boxShadow: palette.shadowCard,
              }}
            >
              <div className="min-w-0">
                <div
                  className="font-sans font-semibold text-[21px] leading-tight tracking-[-0.02em] mb-1.5"
                  style={{ color: palette.text }}
                >
                  {calcItem.title}
                </div>
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-mono"
                  style={{
                    backgroundColor: palette.surfaceSubtle,
                    color: palette.textMuted,
                  }}
                >
                  {calcItem.subtitle}
                </span>
              </div>

              <div
                className="grid grid-cols-3 gap-1.5 p-2.5 rounded-2xl border shrink-0"
                style={{
                  backgroundColor: palette.surfaceSubtle,
                  borderColor: palette.border,
                }}
                aria-hidden="true"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((keyIdx) => (
                  <span
                    key={keyIdx}
                    className="w-3.5 h-3.5 rounded-[5px]"
                    style={{
                      backgroundColor:
                        keyIdx === 8
                          ? palette.accentRed
                          : keyIdx === 4
                            ? palette.accentBronze
                            : palette.borderStrong,
                    }}
                  />
                ))}
              </div>
            </button>
          </div>
        )}

        {/* BLOG ARCHIVE: Horizontal Editorial Pulse Rail */}
        {blogItem && (
          <div className="md:col-span-7 lg:col-span-8 cw-reveal-block">
            <button
              type="button"
              onClick={blogItem.action}
              disabled={!blogItem.action}
              className={`cw-interactive group relative w-full h-full min-h-[158px] rounded-[24px] p-5 sm:p-6 flex flex-col justify-between text-left border overflow-hidden outline-none ${
                blogItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
              style={{
                backgroundColor: palette.surface,
                borderColor: blogItem.dot
                  ? palette.isDark
                    ? 'rgba(240, 78, 55, 0.36)'
                    : 'rgba(217, 59, 38, 0.28)'
                  : palette.border,
                boxShadow: palette.shadowCard,
              }}
            >
              <span
                className="absolute inset-y-4 left-0 w-1 rounded-r-full"
                style={{
                  backgroundColor: blogItem.dot
                    ? palette.accentRed
                    : palette.accentBronze,
                }}
              />

              <div className="flex items-center justify-between gap-3 pl-2">
                {blogItem.dot ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans font-semibold"
                    style={{
                      backgroundColor: palette.isDark
                        ? 'rgba(240, 78, 55, 0.16)'
                        : 'rgba(217, 59, 38, 0.10)',
                      color: palette.accentRed,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full cw-beacon"
                      style={{ backgroundColor: palette.accentRed }}
                    />
                    {blogItem.subtitle}
                  </span>
                ) : (
                  <span
                    className="text-[12px] font-sans font-medium"
                    style={{ color: palette.textMuted }}
                  >
                    {blogItem.subtitle}
                  </span>
                )}
                <span
                  className="cw-glide text-[16px] font-medium"
                  style={{ color: palette.textMuted }}
                >
                  →
                </span>
              </div>

              <div className="pl-2 mt-5">
                <div
                  className="font-serif text-[28px] sm:text-[34px] leading-[1.04] tracking-[-0.015em]"
                  style={{ color: palette.text }}
                >
                  {blogItem.title}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* GLOSSARY: Compact Lexicon Index Strip */}
        {glossaryItem && (
          <div className="md:col-span-5 cw-reveal-block">
            <button
              type="button"
              onClick={glossaryItem.action}
              disabled={!glossaryItem.action}
              className={`cw-interactive group w-full rounded-[22px] px-5 py-4 flex items-center justify-between gap-4 text-left border outline-none ${
                glossaryItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
              style={{
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
                boxShadow: palette.shadowCard,
              }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span
                  className="w-11 h-11 rounded-2xl flex items-center justify-center font-serif italic text-[20px] shrink-0 border"
                  style={{
                    backgroundColor: palette.surfaceSubtle,
                    borderColor: palette.border,
                    color: palette.accentBronze,
                  }}
                >
                  Aa
                </span>
                <div className="min-w-0">
                  <div
                    className="font-sans font-semibold text-[18px] leading-tight tracking-[-0.015em]"
                    style={{ color: palette.text }}
                  >
                    {glossaryItem.title}
                  </div>
                  <div
                    className="text-[12.5px] font-mono mt-0.5"
                    style={{ color: palette.textMuted }}
                  >
                    {glossaryItem.subtitle}
                  </div>
                </div>
              </div>
              <span
                className="cw-glide text-[15px] shrink-0"
                style={{ color: palette.textSubtle }}
              >
                →
              </span>
            </button>
          </div>
        )}

        {/* MARKET: Telemetry Valuation Curve Bar */}
        {pricesItem && (
          <div className="md:col-span-7 cw-reveal-block">
            <button
              type="button"
              onClick={pricesItem.action}
              disabled={!pricesItem.action}
              className={`cw-interactive group w-full rounded-[22px] px-5 py-4 flex items-center justify-between gap-4 text-left border outline-none ${
                pricesItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                boxShadow: palette.shadowCard,
              }}
            >
              <div className="min-w-0">
                <div
                  className="font-sans font-semibold text-[18px] leading-tight tracking-[-0.015em]"
                  style={{ color: palette.text }}
                >
                  {pricesItem.title}
                </div>
                <div
                  className="text-[12.5px] font-sans mt-0.5"
                  style={{ color: palette.textMuted }}
                >
                  {pricesItem.subtitle}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <svg
                  viewBox="0 0 110 34"
                  fill="none"
                  className="w-[96px] sm:w-[110px] h-[32px]"
                  aria-hidden="true"
                >
                  <path
                    d="M2 28 L22 22 L40 25 L62 12 L82 16 L106 5 L106 34 L2 34 Z"
                    fill={palette.accentBronzeSoft}
                  />
                  <path
                    d="M2 28 L22 22 L40 25 L62 12 L82 16 L106 5"
                    stroke={palette.accentBronze}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="106" cy="5" r="3" fill={palette.accentBronze} />
                </svg>
                <span
                  className="cw-glide text-[15px]"
                  style={{ color: palette.textSubtle }}
                >
                  →
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* SYSTEM UTILITY DOCK + PERSONAL ARCHIVE + TRIBUTE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 cw-reveal-block">
        {/* Compact Segmented System Controls: Interface + Profile */}
        <div
          className="lg:col-span-4 grid grid-cols-2 gap-2 p-1.5 rounded-[20px] border"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.border,
            boxShadow: palette.shadowCard,
          }}
        >
          {[settingsItem, profileItem].map((item, idx) =>
            item ? (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className="cw-interactive rounded-[15px] px-3.5 py-3 flex items-center gap-3 text-left cursor-pointer outline-none border border-transparent"
                style={{
                  backgroundColor: palette.surfaceSubtle,
                }}
              >
                <span
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: palette.surfaceElevated,
                    color: palette.text,
                  }}
                >
                  {idx === 0 ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <line x1="4" y1="7" x2="20" y2="7" />
                      <circle cx="9" cy="7" r="2.5" fill={palette.surfaceElevated} />
                      <line x1="4" y1="17" x2="20" y2="17" />
                      <circle cx="15" cy="17" r="2.5" fill={palette.surfaceElevated} />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M5 20c1.5-3.8 4.2-5.5 7-5.5s5.5 1.7 7 5.5" />
                    </svg>
                  )}
                </span>
                <div className="min-w-0">
                  <div
                    className="font-sans font-semibold text-[14px] leading-tight truncate"
                    style={{ color: palette.text }}
                  >
                    {item.title}
                  </div>
                  <div
                    className="text-[11px] font-sans truncate mt-0.5"
                    style={{ color: palette.textMuted }}
                  >
                    {item.subtitle}
                  </div>
                </div>
              </button>
            ) : null,
          )}
        </div>

        {/* Personal Archive Shelf */}
        <button
          type="button"
          onClick={() => {
            if (articleFavorites.length === 1) {
              onOpenArticle?.(articleFavorites[0].id)
            } else if (articleFavorites.length > 1) {
              onOpenFavorites?.()
            }
          }}
          className="cw-interactive group lg:col-span-4 rounded-[20px] px-4 py-3 flex items-center justify-between gap-3 text-left border cursor-pointer outline-none"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.border,
            boxShadow: palette.shadowCard,
          }}
        >
          <div className="min-w-0">
            <div
              className="font-sans font-semibold text-[15px] leading-tight"
              style={{ color: palette.text }}
            >
              {t.favorites}
            </div>
            <div
              className="text-[12px] font-sans mt-0.5"
              style={{ color: palette.textMuted }}
            >
              {t.favoritesSub}
            </div>
          </div>

          {articleFavorites.length > 0 ? (
            <div className="flex items-center -space-x-2 shrink-0">
              {articleFavorites.slice(0, 3).map((fav) => (
                <div
                  key={fav.id}
                  className="w-9 h-11 rounded-lg border-2 overflow-hidden shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5"
                  style={{ borderColor: palette.surface }}
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
              className="text-[12px] font-mono px-2.5 py-1 rounded-lg"
              style={{
                backgroundColor: palette.surfaceSubtle,
                color: palette.textSubtle,
              }}
            >
              0
            </span>
          )}
        </button>

        {/* Patronage / Tribute Bar */}
        <button
          type="button"
          onClick={onSupportClick}
          className="cw-interactive group lg:col-span-4 rounded-[20px] px-4 py-3 flex items-center justify-between gap-3 text-left border cursor-pointer outline-none"
          style={{
            background: palette.tributeBg,
            borderColor: palette.isDark
              ? 'rgba(212, 163, 115, 0.25)'
              : 'rgba(166, 114, 63, 0.24)',
            boxShadow: palette.shadowCard,
          }}
        >
          <div className="min-w-0">
            <div
              className="font-sans font-semibold text-[15px] leading-tight"
              style={{ color: palette.text }}
            >
              {t.supportTitle}
            </div>
            <div
              className="text-[12px] font-sans mt-0.5"
              style={{ color: palette.textMuted }}
            >
              {t.supportDesc}
            </div>
          </div>

          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold uppercase tracking-[0.08em] shrink-0"
            style={{
              backgroundColor: palette.pillActiveBg,
              color: palette.pillActiveText,
            }}
          >
            <span>TRIBUTE</span>
            <span className="cw-glide">↗</span>
          </span>
        </button>
      </div>
    </section>
  )
}

