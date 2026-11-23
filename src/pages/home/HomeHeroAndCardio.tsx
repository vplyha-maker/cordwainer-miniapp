import type { RefObject } from 'react'
import type { HomePalette, HomeStrings } from './types'

type HomeHeroAndCardioProps = {
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

export function HomeHeroAndCardio({
  palette,
  t,
  onOpenStyles,
  onOpenMaterials,
  heroContainerRef,
  heroCanvasRef,
  posterSrc,
  hasCanvasFrame,
  transparentLogoSrc,
}: HomeHeroAndCardioProps) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 mb-10 sm:mb-12 cw-reveal cw-delay-1">
      {/* HERO VIDEO LOOKBOOK — Living Centerpiece */}
      {onOpenStyles && (
        <div ref={heroContainerRef} className="lg:col-span-7">
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
            className="cw-card group relative w-full h-[350px] sm:h-[420px] lg:h-[468px] rounded-[28px] overflow-hidden border text-left cursor-pointer block outline-none"
            style={{
              borderColor: palette.isDark
                ? 'rgba(247, 243, 236, 0.14)'
                : 'rgba(20, 18, 16, 0.10)',
              background: 'linear-gradient(145deg, #2E251E 0%, #161310 100%)',
              boxShadow: palette.shadowHero,
            }}
          >
            {/* Layer 0: Cached Poster */}
            {posterSrc && (
              <img
                src={posterSrc}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-center block pointer-events-none"
                style={{ zIndex: 0 }}
              />
            )}

            {/* Layer 1: CPU-backed Canvas Video */}
            <canvas
              ref={heroCanvasRef}
              className="absolute inset-0 w-full h-full block pointer-events-none"
              style={{
                zIndex: 1,
                opacity: hasCanvasFrame ? 1 : 0,
                transition: 'opacity 0.22s ease-out',
              }}
            />

            {/* Layer 2: Cinematic Vignette & Depth Lighting */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 2,
                background:
                  'linear-gradient(180deg, rgba(12,11,10,0.42) 0%, rgba(12,11,10,0.08) 40%, rgba(12,11,10,0.86) 100%)',
              }}
            />

            {/* Layer 3: Interactive HUD & Typography */}
            <div
              className="relative h-full p-5 sm:p-7 flex flex-col justify-between text-[#F7F3EC]"
              style={{ zIndex: 3 }}
            >
              {/* Top Telemetry Capsules */}
              <div className="flex items-center justify-between gap-3">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md"
                  style={{
                    backgroundColor: 'rgba(18, 16, 14, 0.56)',
                    borderColor: 'rgba(247, 243, 236, 0.16)',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full cw-live-dot shrink-0"
                    style={{ backgroundColor: palette.accentBronze }}
                  />
                  <span className="text-[11px] font-sans font-medium tracking-[0.06em] text-[#F7F3EC]/92">
                    {t.heroTag}
                  </span>
                </div>

                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-mono tabular-nums tracking-[0.08em] border backdrop-blur-md shrink-0"
                  style={{
                    backgroundColor: 'rgba(18, 16, 14, 0.50)',
                    borderColor: 'rgba(247, 243, 236, 0.14)',
                    color: 'rgba(247, 243, 236, 0.85)',
                  }}
                >
                  01 / 15
                </span>
              </div>

              {/* Bottom Hero Title & Tactile CTA Pill */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h2 className="font-serif font-normal text-[38px] sm:text-[48px] lg:text-[52px] leading-[0.96] tracking-[-0.02em] whitespace-pre-line drop-shadow-sm">
                    {t.heroTitle}
                  </h2>
                </div>

                <div
                  className="inline-flex items-center justify-center gap-2 self-start sm:self-end px-4 py-2.5 rounded-full text-[12px] font-sans font-medium tracking-[0.02em] shrink-0 transition-colors"
                  style={{
                    backgroundColor: '#F7F3EC',
                    color: '#141210',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
                  }}
                >
                  <span>{t.heroCta}</span>
                  <span className="cw-arrow text-[13px] leading-none">↗</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 01. CARDIO ATELIER — Flagship Brand Showcase */}
      <div className={onOpenStyles ? 'lg:col-span-5' : 'lg:col-span-12'}>
        <button
          type="button"
          onClick={onOpenMaterials}
          disabled={!onOpenMaterials}
          className={`cw-card group relative w-full h-full min-h-[300px] sm:min-h-[320px] lg:min-h-[468px] rounded-[28px] p-6 sm:p-7 flex flex-col justify-between text-left border overflow-hidden outline-none ${
            onOpenMaterials ? 'cursor-pointer' : 'opacity-45 cursor-default'
          }`}
          style={{
            background: palette.cardioBg,
            borderColor: palette.border,
            boxShadow: palette.shadowCard,
          }}
        >
          {/* Ambient Brand Halo */}
          <div
            className="absolute -right-12 -top-12 w-56 h-56 rounded-full pointer-events-none"
            style={{
              background: palette.isDark
                ? 'radial-gradient(circle, rgba(212, 163, 115, 0.14) 0%, rgba(59, 130, 246, 0.06) 45%, transparent 72%)'
                : 'radial-gradient(circle, rgba(154, 107, 59, 0.14) 0%, rgba(59, 130, 246, 0.05) 45%, transparent 72%)',
            }}
          />

          {/* Top Bar */}
          <div className="relative z-10 flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="text-[11px] font-mono font-medium tabular-nums"
                style={{ color: palette.accentBronze }}
              >
                01
              </span>
              <span
                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: palette.accentBronze }}
              />
              <span
                className="text-[11px] font-sans font-semibold uppercase tracking-[0.14em] truncate"
                style={{ color: palette.text }}
              >
                {t.cardioBadge}
              </span>
            </div>

            <span
              className="text-[10px] font-mono font-medium uppercase tracking-[0.1em] px-2.5 py-1 rounded-full border shrink-0"
              style={{
                borderColor: palette.borderStrong,
                backgroundColor: palette.surfaceSubtle,
                color: palette.textMuted,
              }}
            >
              BESPOKE • B2B
            </span>
          </div>

          {/* Center Brand Stage: Emblem + Identity */}
          <div className="relative z-10 flex flex-row lg:flex-col items-center lg:items-start justify-between gap-4 my-5 lg:my-6">
            <div className="flex-1 min-w-0 order-1 lg:order-2">
              <div className="flex items-baseline gap-2.5 mb-2">
                <h3
                  className="font-serif text-[34px] sm:text-[40px] leading-[0.95] tracking-[-0.015em] uppercase font-normal"
                  style={{ color: palette.text }}
                >
                  Cardio
                </h3>
                <span
                  className="font-serif italic text-[17px]"
                  style={{ color: palette.accentBronze }}
                >
                  Atelier
                </span>
              </div>
              <p
                className="text-[13px] sm:text-[14px] font-sans leading-[1.52] max-w-[290px]"
                style={{ color: palette.textMuted }}
              >
                {t.cardioDesc}
              </p>
            </div>

            {/* 3D Emblem Stage */}
            <div
              className="order-2 lg:order-1 shrink-0 w-[112px] h-[78px] sm:w-[138px] sm:h-[94px] lg:w-full lg:h-[136px] rounded-2xl flex items-center justify-center p-2.5 lg:p-4 border transition-colors"
              style={{
                backgroundColor: palette.isDark
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'rgba(255, 255, 255, 0.65)',
                borderColor: palette.border,
              }}
            >
              <img
                src={transparentLogoSrc}
                alt="Cardio Men's Footwear Emblem"
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                style={{
                  filter: palette.isDark
                    ? 'drop-shadow(0 8px 18px rgba(59, 130, 246, 0.24)) contrast(1.06)'
                    : 'drop-shadow(0 6px 14px rgba(20, 18, 16, 0.12)) contrast(1.04)',
                }}
              />
            </div>
          </div>

          {/* Bottom Tactile Action Strip */}
          <div
            className="relative z-10 pt-4 border-t flex items-center justify-between gap-3 w-full"
            style={{ borderColor: palette.border }}
          >
            <span
              className="text-[12px] font-sans font-medium"
              style={{ color: palette.textMuted }}
            >
              {t.materialsSub}
            </span>

            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-sans font-medium border shrink-0 transition-colors"
              style={{
                backgroundColor: palette.accentBronzeSoft,
                borderColor: palette.isDark
                  ? 'rgba(212, 163, 115, 0.30)'
                  : 'rgba(154, 107, 59, 0.24)',
                color: palette.text,
              }}
            >
              <span>{t.cardioCta}</span>
              <span className="cw-arrow">↗</span>
            </span>
          </div>
        </button>
      </div>
    </section>
  )
}

