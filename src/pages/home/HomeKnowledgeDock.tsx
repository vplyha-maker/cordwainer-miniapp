import type { FavoriteItem } from '../../App'
import type { HomePalette, HomeStrings, MenuItem } from './types'

type HomeKnowledgeDockProps = {
  palette: HomePalette
  t: HomeStrings
  blogItem?: MenuItem
  glossaryItem?: MenuItem
  pricesItem?: MenuItem
  systemItems: MenuItem[]
  articleFavorites: FavoriteItem[]
  onOpenArticle?: (articleId: string) => void
  onOpenFavorites?: () => void
  onSupportClick: () => void
}

export function HomeKnowledgeDock({
  palette,
  t,
  blogItem,
  glossaryItem,
  pricesItem,
  systemItems,
  articleFavorites,
  onOpenArticle,
  onOpenFavorites,
  onSupportClick,
}: HomeKnowledgeDockProps) {
  const [settingsItem, profileItem] = systemItems

  return (
    <div className="w-full">
      {/* STRATUM 4: KNOWLEDGE & MARKET TELEMETRY — Full-Width Edge-to-Edge */}
      <section
        className="w-full border-b cw-reveal-block"
        style={{
          borderColor: palette.border,
          backgroundColor: palette.surfaceElevated,
        }}
      >
        <div className="w-full grid grid-cols-1 md:grid-cols-12">
          {blogItem && (
            <button
              type="button"
              onClick={blogItem.action}
              disabled={!blogItem.action}
              className={`cw-pane group relative md:col-span-6 p-6 sm:p-8 lg:px-14 xl:px-20 lg:py-10 flex flex-col justify-between text-left border-b md:border-b-0 md:border-r outline-none ${
                blogItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
              style={{ borderColor: palette.border }}
            >
              <div className="flex items-center justify-between gap-3 mb-6">
                {blogItem.dot ? (
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-sans font-semibold"
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
                    className="text-[12px] font-mono uppercase tracking-[0.1em]"
                    style={{ color: palette.textMuted }}
                  >
                    {blogItem.subtitle}
                  </span>
                )}
                <span
                  className="cw-glide text-[18px]"
                  style={{ color: palette.textMuted }}
                >
                  →
                </span>
              </div>

              <h3
                className="font-sans font-semibold text-[30px] sm:text-[36px] leading-[1.0] tracking-[-0.03em]"
                style={{ color: palette.text }}
              >
                {blogItem.title}
              </h3>
            </button>
          )}

          <div className="md:col-span-6 flex flex-col">
            {pricesItem && (
              <button
                type="button"
                onClick={pricesItem.action}
                disabled={!pricesItem.action}
                className={`cw-pane group flex-1 px-6 sm:px-8 lg:px-12 xl:px-16 py-6 flex items-center justify-between gap-4 text-left border-b outline-none ${
                  pricesItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
                }`}
                style={{ borderColor: palette.border }}
              >
                <div className="min-w-0">
                  <h3
                    className="font-sans font-semibold text-[21px] sm:text-[23px] leading-tight tracking-[-0.025em]"
                    style={{ color: palette.text }}
                  >
                    {pricesItem.title}
                  </h3>
                  <p
                    className="text-[13px] font-sans mt-0.5"
                    style={{ color: palette.textMuted }}
                  >
                    {pricesItem.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <svg
                    viewBox="0 0 120 38"
                    fill="none"
                    className="w-[100px] sm:w-[120px] h-[34px]"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 32 L24 25 L44 28 L68 14 L90 19 L116 5 L116 38 L2 38 Z"
                      fill={palette.accentBronzeSoft}
                    />
                    <path
                      d="M2 32 L24 25 L44 28 L68 14 L90 19 L116 5"
                      stroke={palette.accentBronze}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="116" cy="5" r="3.5" fill={palette.accentBronze} />
                  </svg>
                  <span
                    className="cw-glide text-[16px]"
                    style={{ color: palette.textSubtle }}
                  >
                    →
                  </span>
                </div>
              </button>
            )}

            {glossaryItem && (
              <button
                type="button"
                onClick={glossaryItem.action}
                disabled={!glossaryItem.action}
                className={`cw-pane group flex-1 px-6 sm:px-8 lg:px-12 xl:px-16 py-6 flex items-center justify-between gap-4 text-left outline-none ${
                  glossaryItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span
                    className="font-sans font-semibold text-[26px] tracking-[-0.04em] shrink-0"
                    style={{ color: palette.accentBronze }}
                    aria-hidden="true"
                  >
                    Aa
                  </span>
                  <div className="min-w-0">
                    <h3
                      className="font-sans font-semibold text-[21px] sm:text-[23px] leading-tight tracking-[-0.025em]"
                      style={{ color: palette.text }}
                    >
                      {glossaryItem.title}
                    </h3>
                    <p
                      className="text-[13px] font-mono mt-0.5"
                      style={{ color: palette.textMuted }}
                    >
                      {glossaryItem.subtitle}
                    </p>
                  </div>
                </div>
                <span
                  className="cw-glide text-[16px] shrink-0"
                  style={{ color: palette.textSubtle }}
                >
                  →
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* STRATUM 5: UNIFIED FLOATING OS UTILITY DOCK */}
      <section className="w-full px-4 sm:px-8 lg:px-14 xl:px-20 py-8 sm:py-10 cw-reveal-block">
        <div
          className="rounded-2xl sm:rounded-full p-2 border backdrop-blur-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2"
          style={{
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
            boxShadow: palette.shadowCard,
          }}
        >
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 flex-1">
            {[settingsItem, profileItem].map((item, idx) =>
              item ? (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  className="cw-dock-btn flex-1 sm:flex-initial inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl sm:rounded-full text-left cursor-pointer outline-none border border-transparent"
                  style={{ backgroundColor: palette.surfaceSubtle }}
                >
                  <span style={{ color: palette.text }}>
                    {idx === 0 ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                        <line x1="4" y1="7" x2="20" y2="7" />
                        <circle cx="9" cy="7" r="2.5" fill={palette.surfaceElevated} />
                        <line x1="4" y1="17" x2="20" y2="17" />
                        <circle cx="15" cy="17" r="2.5" fill={palette.surfaceElevated} />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M5 20c1.5-3.8 4.2-5.5 7-5.5s5.5 1.7 7 5.5" />
                      </svg>
                    )}
                  </span>
                  <div className="min-w-0">
                    <div
                      className="text-[13px] font-sans font-semibold leading-tight truncate"
                      style={{ color: palette.text }}
                    >
                      {item.title}
                    </div>
                    <div
                      className="text-[11px] font-sans leading-tight truncate"
                      style={{ color: palette.textMuted }}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              ) : null,
            )}

            <button
              type="button"
              onClick={() => {
                if (articleFavorites.length === 1) {
                  onOpenArticle?.(articleFavorites[0].id)
                } else if (articleFavorites.length > 1) {
                  onOpenFavorites?.()
                }
              }}
              className="cw-dock-btn w-full sm:w-auto sm:flex-1 inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl sm:rounded-full text-left cursor-pointer outline-none border border-transparent"
              style={{ backgroundColor: palette.surfaceSubtle }}
            >
              <div className="min-w-0">
                <div
                  className="text-[13px] font-sans font-semibold leading-tight truncate"
                  style={{ color: palette.text }}
                >
                  {t.favorites}
                </div>
                <div
                  className="text-[11px] font-sans leading-tight truncate"
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
                      className="w-7 h-9 rounded-md border overflow-hidden"
                      style={{ borderColor: palette.surfaceElevated }}
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
                  className="text-[11px] font-mono px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: palette.surfaceElevated,
                    color: palette.textSubtle,
                  }}
                >
                  0
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onSupportClick}
            className="cw-dock-btn inline-flex items-center justify-between lg:justify-center gap-3 px-5 py-2.5 rounded-xl sm:rounded-full text-left cursor-pointer outline-none border shrink-0"
            style={{
              background: palette.tributeBg,
              borderColor: palette.isDark
                ? 'rgba(212, 163, 115, 0.28)'
                : 'rgba(166, 114, 63, 0.25)',
            }}
          >
            <div>
              <div
                className="text-[13px] font-sans font-semibold leading-tight"
                style={{ color: palette.text }}
              >
                {t.supportTitle}
              </div>
              <div
                className="text-[11px] font-sans leading-tight"
                style={{ color: palette.textMuted }}
              >
                {t.supportDesc}
              </div>
            </div>
            <span
              className="px-3 py-1 rounded-full text-[11px] font-mono font-semibold uppercase tracking-[0.08em]"
              style={{
                backgroundColor: palette.pillActiveBg,
                color: palette.pillActiveText,
              }}
            >
              TRIBUTE ↗
            </span>
          </button>
        </div>

        <footer className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p
            className="text-[13.5px] font-sans"
            style={{ color: palette.textMuted }}
          >
            {t.quote}
          </p>
          <p
            className="text-[11px] font-mono uppercase tracking-[0.18em] shrink-0"
            style={{ color: palette.textSubtle }}
          >
            CORDWAINE • MMXXVI
          </p>
        </footer>
      </section>
    </div>
  )
}
