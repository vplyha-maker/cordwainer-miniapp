import type { RefObject } from 'react'
import type { HomePalette, HomeStrings } from './types'

type HomeHeroCockpitProps = {
  palette: HomePalette
  t: HomeStrings
  onOpenStyles?: () => void
  onOpenMaterials?: () => void
  heroContainerRef: RefObject<HTMLDivElement>
  heroCanvasRef: RefObject<HTMLCanvasElement>
  posterSrc: string | null
  hasCanvasFrame: boolean
  transparentLogoSrc: string
}

export function HomeHeroCockpit({
  palette,
  t,
  onOpenStyles,
  onOpenMaterials,
  heroContainerRef,
  heroCanvasRef,
  posterSrc,
  hasCanvasFrame,
  transparentLogoSrc,
}: HomeHeroCockpitProps) {
  return (
    <section className="space-y-4 sm:space-y-5 mb-6 sm:mb-8">
      {/* ACT I: KINETIC HERO STAGE — Full-Bleed Living Visual Viewport */}
      {onOpenStyles && (
        <div ref={heroContainerRef} className="cw-reveal-block" data-visible="true">
          <div
            role="button"
            tabIndex={0}
            onClick={onOpenStyles}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpenStyles()
              }
            }}
            className="cw-hero-stage cw-interactive group relative w-full h-[360px] sm:h-[430px] lg:h-[490px] rounded-[28px] sm:rounded-[32px] overflow-hidden border text-left cursor-pointer block outline-none"
            style={{
              borderColor: palette.isDark
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(17, 17, 20, 0.12)',
              background: 'linear-gradient(145deg, #27201A 0%, #100F12 100%)',
              boxShadow: palette.shadowHero,
            }}
          >
            {/* Layer 0: Instant Cached Poster */}
            {posterSrc && (
              <img
                src={posterSrc}
                alt=""
                className="cw-hero-media absolute inset-0 w-full h-full object-cover object-center block pointer-events-none"
                style={{ zIndex: 0 }}
              />
            )}

            {/* Layer 1: CPU-backed Video Canvas */}
            <canvas
              ref={heroCanvasRef}
              className="cw-hero-media absolute inset-0 w-full h-full block pointer-events-none"
              style={{
                zIndex: 1,
                opacity: hasCanvasFrame ? 1 : 0,
                transition: 'opacity 0.24s ease-out',
              }}
            />

            {/* Layer 2: Spatial Studio Gradient */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 2,
                background:
                  'linear-gradient(180deg, rgba(9,9,11,0.34) 0%, rgba(9,9,11,0.06) 44%, rgba(9,9,11,0.88) 100%)',
              }}
            />

            {/* Layer 3: Digital Product HUD Overlay */}
            <div
              className="relative h-full p-5 sm:p-8 flex flex-col justify-between text-[#F5F4F0]"
              style={{ zIndex: 3 }}
            >
              <div className="flex items-center justify-between gap-3">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-xl"
                  style={{
                    backgroundColor: 'rgba(12, 12, 15, 0.56)',
                    borderColor: 'rgba(255, 255, 255, 0.14)',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full cw-beacon shrink-0"
                    style={{ backgroundColor: '#D4A373' }}
                  />
                  <span className="text-[11px] font-sans font-medium tracking-[0.04em] text-[#F5F4F0]/90">
                    {t.heroTag}
                  </span>
                </div>

                <span
                  className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-[11px] font-mono border backdrop-blur-xl"
                  style={{
                    backgroundColor: 'rgba(12, 12, 15, 0.46)',
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    color: 'rgba(245, 244, 240, 0.78)',
                  }}
                >
                  {t.issue}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                <div>
                  <h2 className="font-sans font-semibold text-[38px] sm:text-[52px] lg:text-[60px] leading-[0.94] tracking-[-0.035em] whitespace-pre-line">
                    {t.heroTitle}
                  </h2>
                </div>

                <div
                  className="inline-flex items-center gap-2.5 self-start sm:self-end px-5 py-3 rounded-full text-[13px] font-sans font-semibold shrink-0"
                  style={{
                    backgroundColor: '#F5F4F0',
                    color: '#09090B',
                    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.36)',
                  }}
                >
                  <span>{t.heroCta}</span>
                  <span className="cw-glide text-[14px] leading-none">→</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACT II: MAISON CARDIO — Dark Sculpted Brand Monolith */}
      <div className="cw-reveal-block">
        <button
          type="button"
          onClick={onOpenMaterials}
          disabled={!onOpenMaterials}
          className={`cw-interactive group relative w-full rounded-[26px] sm:rounded-[30px] p-5 sm:p-7 lg:p-8 text-left border overflow-hidden outline-none ${
            onOpenMaterials ? 'cursor-pointer' : 'opacity-45 cursor-default'
          }`}
          style={{
            background: palette.cardioBg,
            borderColor: 'rgba(255, 255, 255, 0.10)',
            boxShadow: palette.shadowHero,
            color: '#F5F4F0',
          }}
        >
          {/* Specular Studio Light */}
          <div
            className="absolute -right-20 -top-24 w-72 h-72 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(212, 163, 115, 0.16) 0%, rgba(59, 130, 246, 0.08) 48%, transparent 72%)',
            }}
          />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 items-center gap-5 sm:gap-7">
            {/* Brand 3D Emblem Stage */}
            <div
              className="md:col-span-4 lg:col-span-3 h-[110px] sm:h-[132px] rounded-2xl flex items-center justify-center p-4 border"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)',
                borderColor: 'rgba(255, 255, 255, 0.09)',
              }}
            >
              <img
                src={transparentLogoSrc}
                alt="Cardio Men's Footwear Emblem"
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                style={{
                  filter:
                    'drop-shadow(0 10px 22px rgba(59, 130, 246, 0.28)) contrast(1.06)',
                }}
              />
            </div>

            {/* Brand Identity Copy */}
            <div className="md:col-span-5 lg:col-span-6 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.14em]"
                  style={{ color: '#D4A373' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373]" />
                  {t.cardioBadge}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 rounded-md bg-white/10 text-white/75">
                  BESPOKE • B2B
                </span>
              </div>

              <div className="flex items-baseline gap-2.5 mb-2">
                <h3 className="font-serif text-[32px] sm:text-[38px] leading-[0.95] tracking-[-0.01em] uppercase font-normal text-[#F5F4F0]">
                  Cardio
                </h3>
                <span className="font-serif italic text-[17px] text-[#D4A373]">
                  Atelier
                </span>
              </div>

              <p className="text-[13px] sm:text-[14px] font-sans leading-[1.5] text-white/70 max-w-[460px]">
                {t.cardioDesc}
              </p>
            </div>

            {/* Direct Collection Action */}
            <div className="md:col-span-3 flex md:flex-col items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
              <span className="text-[12px] font-sans text-white/55">
                {t.materialsSub}
              </span>
              <span
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[12px] font-sans font-semibold shrink-0"
                style={{
                  backgroundColor: '#D4A373',
                  color: '#0E0D0C',
                }}
              >
                <span>{t.cardioCta}</span>
                <span className="cw-glide">→</span>
              </span>
            </div>
          </div>
        </button>
      </div>
    </section>
  )
}

