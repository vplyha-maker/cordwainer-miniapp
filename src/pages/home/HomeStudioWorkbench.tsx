import type { HomePalette, MenuItem } from './types'

type HomeStudioWorkbenchProps = {
  palette: HomePalette
  colorsItem: MenuItem
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

const MAISON_LOOKS = [
  { code: 'LOOK 01', house: 'PRADA', accent: '#D4A373' },
  { code: 'LOOK 02', house: 'VALENTINO', accent: '#F5F4F0' },
  { code: 'LOOK 03', house: 'BALENCIAGA', accent: '#94A3B8' },
]

const CALC_KEYS = [
  { delay: '0s', type: 'neutral' as const },
  { delay: '1.4s', type: 'neutral' as const },
  { delay: '2.8s', type: 'bronze' as const },
  { delay: '0.7s', type: 'neutral' as const },
  { delay: '2.1s', type: 'neutral' as const },
  { delay: '3.4s', type: 'red' as const },
]

export function HomeStudioWorkbench({
  palette,
  colorsItem,
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
      <div className="w-full grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT WING (5 cols): FULL-BLEED LIVING CHROMATIC SPECTRUM */}
        <button
          type="button"
          onClick={colorsItem.action}
          disabled={!colorsItem.action}
          className={`cw-pigment-stage cw-pane group relative lg:col-span-5 min-h-[260px] sm:min-h-[320px] lg:min-h-[500px] overflow-hidden text-left outline-none border-b lg:border-b-0 lg:border-r ${
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

          <div className="relative z-10 h-full p-6 sm:p-8 lg:p-12 xl:px-16 flex flex-col justify-end text-[#F5F4F0]">
            <div
              className="inline-flex items-end justify-between gap-4 w-full"
              style={{
                background:
                  'linear-gradient(to top, rgba(8,8,10,0.74) 0%, transparent 100%)',
                margin: '0 -24px -24px',
                padding: '52px 24px 24px',
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

        {/* RIGHT WING (7 cols): FOOTWEAR INDEX (RUNWAY ARCHIVE) + CALCULATORS (LIVE HARDWARE) */}
        <div className="lg:col-span-7 flex flex-col">
          {/* TOP PANE: FOOTWEAR INDEX — High-Fashion Runway & Maison Archive */}
          <button
            type="button"
            onClick={catalogItem.action}
            disabled={!catalogItem.action}
            className={`cw-pane group flex-1 min-h-[250px] p-6 sm:p-8 lg:px-12 xl:px-16 flex flex-col justify-between text-left border-b outline-none ${
              catalogItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
            }`}
            style={{
              backgroundColor: '#121216',
              borderColor: palette.border,
              color: '#F5F4F0',
            }}
          >
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 w-full mb-6" aria-hidden="true">
              {MAISON_LOOKS.map((look, idx) => (
                <div
                  key={look.code}
                  className="cw-look-frame rounded-xl p-3 sm:p-4 border flex flex-col justify-between min-h-[104px] sm:min-h-[118px]"
                  style={{
                    background:
                      idx === 1
                        ? 'linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.025) 100%)'
                        : 'linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)',
                    borderColor:
                      idx === 1
                        ? 'rgba(212, 163, 115, 0.34)'
                        : 'rgba(255, 255, 255, 0.10)',
                  }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.12em] text-white/45">
                      {look.code}
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: look.accent, opacity: 0.85 }}
                    />
                  </div>

                  <svg
                    viewBox="0 0 88 32"
                    fill="none"
                    className="w-full h-7 my-2 opacity-80"
                  >
                    {idx === 0 ? (
                      <path
                        d="M14 26 L14 6 L34 6 L38 17 C50 18, 66 19, 74 23 C76 25, 72 26, 62 26 Z"
                        stroke={look.accent}
                        strokeWidth="1.5"
                      />
                    ) : idx === 1 ? (
                      <path
                        d="M10 24 C16 24, 22 11, 34 11 C46 11, 56 17, 74 20 C79 21, 80 25, 72 26 L14 26 C10 26, 8 25, 10 24 Z"
                        stroke={look.accent}
                        strokeWidth="1.5"
                      />
                    ) : (
                      <path
                        d="M12 24 C18 24, 22 14, 34 13 C48 12, 60 16, 76 19 C81 20, 80 26, 70 26 L16 26 C10 26, 9 24, 12 24 Z"
                        stroke={look.accent}
                        strokeWidth="1.5"
                      />
                    )}
                  </svg>

                  <span className="text-[10px] sm:text-[11px] font-sans font-semibold tracking-[0.14em] text-white/85 truncate">
                    {look.house}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-sans font-semibold text-[25px] sm:text-[30px] leading-[1.04] tracking-[-0.03em] text-[#F5F4F0]">
                  {catalogItem.title}
                </h3>
                <p className="text-[13.5px] font-sans text-white/62 mt-1">
                  {catalogItem.subtitle}
                </p>
              </div>
              <span className="cw-glide text-[19px] text-[#D4A373] shrink-0">
                →
              </span>
            </div>
          </button>

          {/* BOTTOM PANE: CALCULATORS — Living Tactile Hardware Console */}
          {calcItem && (
            <button
              type="button"
              onClick={calcItem.action}
              disabled={!calcItem.action}
              className={`cw-pane group flex-1 min-h-[220px] p-6 sm:p-8 lg:px-12 xl:px-16 flex flex-col justify-between text-left outline-none ${
                calcItem.action ? 'cursor-pointer' : 'opacity-45 cursor-default'
              }`}
              style={{
                backgroundColor: palette.surfaceElevated,
              }}
            >
              <div className="flex items-center justify-between gap-4 mb-6" aria-hidden="true">
                <div
                  className="cw-dial-rotor w-14 h-14 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center relative shadow-sm"
                  style={{
                    borderColor: palette.borderStrong,
                    backgroundColor: palette.surface,
                  }}
                >
                  <span
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border"
                    style={{ borderColor: palette.accentBronze }}
                  />
                  <span
                    className="absolute top-2 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: palette.accentRed }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {CALC_KEYS.map((keyItem, k) => (
                    <span
                      key={k}
                      className="cw-calc-key w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-[5px] shadow-xs"
                      style={{
                        animationDelay: keyItem.delay,
                        backgroundColor:
                          keyItem.type === 'red'
                            ? palette.accentRed
                            : keyItem.type === 'bronze'
                              ? palette.accentBronze
                              : palette.borderStrong,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3
                    className="font-sans font-semibold text-[24px] sm:text-[28px] leading-[1.06] tracking-[-0.025em]"
                    style={{ color: palette.text }}
                  >
                    {calcItem.title}
                  </h3>
                  <span
                    className="inline-block text-[13px] font-mono mt-1.5"
                    style={{ color: palette.textMuted }}
                  >
                    {calcItem.subtitle}
                  </span>
                </div>
                <span
                  className="cw-glide text-[19px] shrink-0"
                  style={{ color: palette.accentBronze }}
                >
                  →
                </span>
              </div>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
