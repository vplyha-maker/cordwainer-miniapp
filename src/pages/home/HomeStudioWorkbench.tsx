import type { CSSProperties } from 'react'
import type { HomePalette, MenuItem } from './types'

type HomeStudioWorkbenchProps = {
  palette: HomePalette
  colorsItem: MenuItem
  stylesItem: MenuItem
  catalogItem: MenuItem
  calcItem?: MenuItem
}

const PIGMENTS = [
  { hex: '#2D160F', mid: '#4A2418' },
  { hex: '#6E351B', mid: '#8F4826' },
  { hex: '#B5733D', mid: '#D4955A' },
  { hex: '#4B151D', mid: '#6E202B' },
  { hex: '#1B2638', mid: '#2A3B56' },
]

const ANALYTICAL_BARS = [
  24, 42, 30, 58, 36, 48, 22, 68, 40, 52, 28, 62, 34, 46, 26, 54, 38, 64, 32, 44,
]

export function HomeStudioWorkbench({
  palette,
  colorsItem,
  stylesItem,
  catalogItem,
  calcItem,
}: HomeStudioWorkbenchProps) {
  return (
    <section
      className="w-full border-b cw-reveal-block"
      style={{
        borderColor: palette.border,
        backgroundColor: palette.surface,
      }}
    >
      <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT WING (5 cols): FULL-BLEED LIVING CHROMATIC SPECTRUM */}
        <button
          type="button"
          onClick={colorsItem.action}
          disabled={!colorsItem.action}
          className={`cw-pigment-stage cw-pane group relative lg:col-span-5 min-h-[250px] sm:min-h-[300px] lg:min-h-[540px] overflow-hidden text-left outline-none border-b lg:border-b-0 lg:border-r ${
            colorsItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
          }`}
          style={{ borderColor: palette.border }}
        >
          <div className="absolute inset-0 flex w-full h-full" aria-hidden="true">
            {PIGMENTS.map((p) => (
              <div
                key={p.hex}
                className="cw-pigment-col h-full relative"
                style={{
                  background: `linear-gradient(175deg, ${p.mid} 0%, ${p.hex} 62%, #0B0A0A 100%)`,
                }}
              >
                <span className="absolute inset-y-0 left-0 w-px bg-white/10" />
              </div>
            ))}
          </div>

          <div className="relative z-10 h-full p-6 sm:p-8 lg:p-10 flex flex-col justify-end text-[#F5F4F0]">
            <div
              className="inline-flex items-end justify-between gap-4 w-full pt-12"
              style={{
                background:
                  'linear-gradient(to top, rgba(8,8,10,0.72) 0%, transparent 100%)',
                margin: '0 -24px -24px',
                padding: '48px 24px 24px',
              }}
            >
              <div>
                <h3 className="font-sans font-semibold text-[28px] sm:text-[34px] leading-[1.0] tracking-[-0.03em]">
                  {colorsItem.title}
                </h3>
                <p className="text-[13.5px] font-sans text-white/75 mt-1.5">
                  {colorsItem.subtitle}
                </p>
              </div>
              <span className="cw-glide text-[20px] font-medium text-[#D4A373] shrink-0">
                →
              </span>
            </div>
          </div>
        </button>

        {/* RIGHT WING (7 cols): CAD VIEWPORT + ANALYTICAL / INSTRUMENT SPLIT */}
        <div className="lg:col-span-7 flex flex-col">
          {/* SILHOUETTES — ARCHITECTURAL CAD VIEWPORT */}
          <button
            type="button"
            onClick={stylesItem.action}
            disabled={!stylesItem.action}
            className={`cw-pane cw-blueprint-bg group relative w-full min-h-[240px] sm:min-h-[280px] p-6 sm:p-8 lg:p-10 flex flex-col justify-between text-left border-b overflow-hidden outline-none ${
              stylesItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
            }`}
            style={
              {
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
                '--cw-grid': palette.isDark
                  ? 'rgba(255, 255, 255, 0.035)'
                  : 'rgba(16, 16, 19, 0.045)',
              } as CSSProperties
            }
          >
            <div
              className="w-full flex items-center justify-center py-2 sm:py-4"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 460 140"
                fill="none"
                className="cw-blueprint-svg w-full max-w-[440px] h-[112px] sm:h-[136px] overflow-visible"
              >
                <line
                  x1="10"
                  y1="118"
                  x2="450"
                  y2="118"
                  stroke={palette.borderStrong}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <path
                  d="M34 106 C54 106, 68 28, 128 22 C188 16, 246 58, 322 68 C382 76, 430 80, 438 102 C443 114, 420 118, 368 118 L58 118 C34 118, 24 112, 34 106 Z"
                  fill={palette.accentBronzeSoft}
                />
                <path
                  d="M52 106 C68 106, 82 46, 132 40 C182 34, 234 70, 306 78 C362 84, 404 88, 412 104"
                  stroke={palette.accentBronze}
                  strokeWidth="1"
                  strokeOpacity="0.45"
                  strokeDasharray="5 4"
                />
                <path
                  d="M34 106 C54 106, 68 28, 128 22 C188 16, 246 58, 322 68 C382 76, 430 80, 438 102 C443 114, 420 118, 368 118 L58 118 C34 118, 24 112, 34 106 Z"
                  stroke={palette.accentBronze}
                  strokeWidth="2.2"
                />
                <line x1="128" y1="22" x2="128" y2="118" stroke={palette.textSubtle} strokeWidth="1" strokeDasharray="3 3" />
                <line x1="252" y1="54" x2="252" y2="118" stroke={palette.textSubtle} strokeWidth="1" strokeDasharray="3 3" />
                <line x1="348" y1="72" x2="348" y2="118" stroke={palette.textSubtle} strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="128" cy="22" r="4.5" fill={palette.accentBronze} />
                <circle cx="252" cy="54" r="3.5" fill={palette.text} />
                <circle cx="348" cy="72" r="4.5" fill={palette.accentBronze} />
                <circle cx="438" cy="102" r="3.5" fill={palette.accentRed} />
              </svg>
            </div>

            <div className="flex items-end justify-between gap-4 pt-3">
              <div>
                <h3
                  className="font-sans font-semibold text-[26px] sm:text-[32px] leading-[1.02] tracking-[-0.03em]"
                  style={{ color: palette.text }}
                >
                  {stylesItem.title}
                </h3>
                <p
                  className="text-[13.5px] font-sans mt-1"
                  style={{ color: palette.textMuted }}
                >
                  {stylesItem.subtitle}
                </p>
              </div>
              <span
                className="cw-glide text-[19px] font-medium shrink-0"
                style={{ color: palette.accentBronze }}
              >
                →
              </span>
            </div>
          </button>

          {/* BOTTOM SPLIT: FOOTWEAR INDEX + CALCULATORS */}
          <div className="grid grid-cols-1 sm:grid-cols-12 flex-1">
            <button
              type="button"
              onClick={catalogItem.action}
              disabled={!catalogItem.action}
              className={`cw-pane group sm:col-span-7 min-h-[210px] p-6 sm:p-7 flex flex-col justify-between text-left border-b sm:border-b-0 sm:border-r outline-none ${
                catalogItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
              style={{
                backgroundColor: '#121216',
                borderColor: palette.border,
                color: '#F5F4F0',
              }}
            >
              <div className="flex items-end gap-1.5 h-16 w-full mb-5" aria-hidden="true">
                {ANALYTICAL_BARS.map((val, idx) => (
                  <span
                    key={idx}
                    className="flex-1 rounded-t-sm transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      height: `${val}%`,
                      backgroundColor:
                        idx === 7 || idx === 11 || idx === 17
                          ? '#D4A373'
                          : idx === 3
                            ? '#F04E37'
                            : 'rgba(255, 255, 255, 0.22)',
                    }}
                  />
                ))}
              </div>

              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-sans font-semibold text-[22px] sm:text-[25px] leading-tight tracking-[-0.025em] text-[#F5F4F0]">
                    {catalogItem.title}
                  </h3>
                  <p className="text-[13px] font-sans text-white/62 mt-1">
                    {catalogItem.subtitle}
                  </p>
                </div>
                <span className="cw-glide text-[18px] text-[#D4A373] shrink-0">
                  →
                </span>
              </div>
            </button>

            {calcItem && (
              <button
                type="button"
                onClick={calcItem.action}
                disabled={!calcItem.action}
                className={`cw-pane group sm:col-span-5 min-h-[210px] p-6 sm:p-7 flex flex-col justify-between text-left outline-none ${
                  calcItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
                }`}
                style={{
                  backgroundColor: palette.surface,
                }}
              >
                <div className="flex items-center justify-between gap-3 mb-5" aria-hidden="true">
                  <div
                    className="w-14 h-14 rounded-full border flex items-center justify-center relative"
                    style={{
                      borderColor: palette.borderStrong,
                      backgroundColor: palette.surfaceElevated,
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full border"
                      style={{ borderColor: palette.accentBronze }}
                    />
                    <span
                      className="absolute top-2 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: palette.accentRed }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[0, 1, 2, 3, 4, 5].map((k) => (
                      <span
                        key={k}
                        className="w-3.5 h-3.5 rounded-[4px]"
                        style={{
                          backgroundColor:
                            k === 5
                              ? palette.accentRed
                              : k === 2
                                ? palette.accentBronze
                                : palette.borderStrong,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3
                    className="font-sans font-semibold text-[21px] sm:text-[23px] leading-tight tracking-[-0.025em]"
                    style={{ color: palette.text }}
                  >
                    {calcItem.title}
                  </h3>
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <span
                      className="text-[12.5px] font-mono"
                      style={{ color: palette.textMuted }}
                    >
                      {calcItem.subtitle}
                    </span>
                    <span
                      className="cw-glide text-[16px]"
                      style={{ color: palette.accentBronze }}
                    >
                      →
                    </span>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

