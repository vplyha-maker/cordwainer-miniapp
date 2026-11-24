import type { CSSProperties } from 'react'
import type { HomePalette, MenuItem } from './types'

type HomeStudioGridProps = {
  palette: HomePalette
  colorsItem: MenuItem
  stylesItem: MenuItem
  catalogItem: MenuItem
}

const LEATHER_SPECTRUM = [
  { hex: '#3B1D14', label: 'Espresso' },
  { hex: '#7A3E20', label: 'Cognac' },
  { hex: '#B87642', label: 'Burnished Tan' },
  { hex: '#541A21', label: 'Oxblood' },
  { hex: '#1F2B3D', label: 'Midnight' },
]

const INDEX_BARS = [16, 28, 20, 36, 22, 30, 14, 40, 24, 28, 18, 34, 20, 26, 16, 32, 18]

export function HomeStudioGrid({
  palette,
  colorsItem,
  stylesItem,
  catalogItem,
}: HomeStudioGridProps) {
  return (
    <section className="space-y-4 sm:space-y-5 mb-6 sm:mb-8">
      {/* Asymmetric Material & Form Studio Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
        {/* COLORS: Full-Bleed Chromatic Spectrum Surface */}
        <div className="md:col-span-5 cw-reveal-block">
          <button
            type="button"
            onClick={colorsItem.action}
            disabled={!colorsItem.action}
            className={`cw-spectrum-block cw-interactive group relative w-full h-[220px] sm:h-[250px] rounded-[26px] overflow-hidden border text-left outline-none block ${
              colorsItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
            }`}
            style={{
              borderColor: palette.borderStrong,
              boxShadow: palette.shadowCard,
            }}
          >
            {/* Full-Bleed Flexing Chromatic Leather Strips */}
            <div className="absolute inset-0 flex w-full h-full" aria-hidden="true">
              {LEATHER_SPECTRUM.map((swatch) => (
                <div
                  key={swatch.hex}
                  className="cw-spectrum-strip h-full relative"
                  style={{
                    background: `linear-gradient(180deg, ${swatch.hex} 0%, ${swatch.hex}DD 65%, #0D0C0B 100%)`,
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0 w-px"
                    style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                  />
                </div>
              ))}
            </div>

            {/* Frosted Label Dock */}
            <div
              className="absolute inset-x-3.5 bottom-3.5 p-4 rounded-2xl border backdrop-blur-xl flex items-end justify-between gap-3 text-[#F5F4F0]"
              style={{
                backgroundColor: 'rgba(12, 11, 10, 0.56)',
                borderColor: 'rgba(255, 255, 255, 0.16)',
              }}
            >
              <div>
                <div className="font-sans font-semibold text-[21px] sm:text-[23px] leading-tight tracking-[-0.02em]">
                  {colorsItem.title}
                </div>
                <div className="text-[12.5px] font-sans text-white/75 mt-0.5">
                  {colorsItem.subtitle}
                </div>
              </div>
              <span className="cw-glide text-[16px] text-[#D4A373] font-medium shrink-0">
                →
              </span>
            </div>
          </button>
        </div>

        {/* SILHOUETTES: Industrial CAD Blueprint Viewport */}
        <div className="md:col-span-7 cw-reveal-block">
          <button
            type="button"
            onClick={stylesItem.action}
            disabled={!stylesItem.action}
            className={`cw-interactive cw-cad-grid group relative w-full h-[220px] sm:h-[250px] rounded-[26px] p-5 sm:p-6 flex flex-col justify-between text-left border overflow-hidden outline-none ${
              stylesItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
            }`}
            style={
              {
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
                boxShadow: palette.shadowCard,
                '--cw-dot': palette.isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(17, 17, 20, 0.08)',
              } as CSSProperties
            }
          >
            {/* Architectural Last Geometry Blueprint */}
            <div className="flex-1 flex items-center justify-center w-full py-1" aria-hidden="true">
              <svg
                viewBox="0 0 360 110"
                fill="none"
                className="cw-cad-svg w-full max-w-[340px] h-[96px] sm:h-[112px] overflow-visible"
              >
                <line
                  x1="12"
                  y1="92"
                  x2="348"
                  y2="92"
                  stroke={palette.borderStrong}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <path
                  d="M28 82 C44 82, 56 24, 102 20 C148 16, 192 48, 250 56 C296 62, 334 65, 340 80 C344 89, 326 92, 286 92 L46 92 C28 92, 20 87, 28 82 Z"
                  fill={palette.accentBronzeSoft}
                />
                <path
                  d="M28 82 C44 82, 56 24, 102 20 C148 16, 192 48, 250 56 C296 62, 334 65, 340 80 C344 89, 326 92, 286 92 L46 92 C28 92, 20 87, 28 82 Z"
                  stroke={palette.accentBronze}
                  strokeWidth="2"
                />
                <line x1="102" y1="20" x2="102" y2="92" stroke={palette.textSubtle} strokeWidth="1" strokeDasharray="3 3" />
                <line x1="250" y1="56" x2="250" y2="92" stroke={palette.textSubtle} strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="102" cy="20" r="4" fill={palette.accentBronze} />
                <circle cx="250" cy="56" r="4" fill={palette.accentBronze} />
                <circle cx="340" cy="80" r="3.5" fill={palette.text} />
              </svg>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <div
                  className="font-sans font-semibold text-[22px] sm:text-[25px] leading-tight tracking-[-0.025em]"
                  style={{ color: palette.text }}
                >
                  {stylesItem.title}
                </div>
                <div
                  className="text-[13px] font-sans mt-0.5"
                  style={{ color: palette.textMuted }}
                >
                  {stylesItem.subtitle}
                </div>
              </div>
              <span
                className="cw-glide text-[16px] font-medium shrink-0"
                style={{ color: palette.accentBronze }}
              >
                →
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* FOOTWEAR INDEX: Sleek Full-Width Horizontal Catalog Strip */}
      <div className="cw-reveal-block">
        <button
          type="button"
          onClick={catalogItem.action}
          disabled={!catalogItem.action}
          className={`cw-interactive group w-full rounded-[22px] px-5 sm:px-7 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left border outline-none ${
            catalogItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
          }`}
          style={{
            backgroundColor: palette.isDark ? '#18181D' : '#18181B',
            borderColor: 'rgba(255, 255, 255, 0.10)',
            boxShadow: palette.shadowCard,
            color: '#F5F4F0',
          }}
        >
          <div className="min-w-0">
            <div className="font-sans font-semibold text-[20px] sm:text-[23px] leading-tight tracking-[-0.02em] text-[#F5F4F0]">
              {catalogItem.title}
            </div>
            <div className="text-[13px] font-sans text-white/65 mt-0.5">
              {catalogItem.subtitle}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
            <div className="flex items-end gap-1 h-9 w-[124px]" aria-hidden="true">
              {INDEX_BARS.map((h, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-full"
                  style={{
                    height: `${h}px`,
                    backgroundColor:
                      i === 3 || i === 7 || i === 11
                        ? '#D4A373'
                        : 'rgba(255, 255, 255, 0.22)',
                  }}
                />
              ))}
            </div>
            <span className="cw-glide text-[16px] font-medium text-[#D4A373]">
              →
            </span>
          </div>
        </button>
      </div>
    </section>
  )
}

