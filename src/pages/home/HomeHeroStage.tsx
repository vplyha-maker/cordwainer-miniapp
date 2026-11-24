import type { RefObject } from 'react'
import type { HomePalette, HomeStrings } from './types'

type HomeHeroStageProps = {
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

export function HomeHeroStage({
  palette,
  t,
  onOpenStyles,
  onOpenMaterials,
  heroContainerRef,
  heroCanvasRef,
  posterSrc,
  hasCanvasFrame,
  transparentLogoSrc,
}: HomeHeroStageProps) {
  return (
    <div className="w-full">
      {/* STRATUM 1: FULL-BLEED CINEMATIC HERO STAGE */}
      {onOpenStyles && (
        <section ref={heroContainerRef} className="w-full">
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
            className="cw-hero-stage group relative w-full h-[64svh] min-h-[430px] max-h-[680px] overflow-hidden cursor-pointer block outline-none"
            style={{
              background: 'linear-gradient(155deg, #27201A 0%, #0A0A0D 100%)',
            }}
          >
            {posterSrc && (
              <img
                src={posterSrc}
                alt=""
                className="cw-hero-media absolute inset-0 w-full h-full object-cover object-center block pointer-events-none"
                style={{ zIndex: 0 }}
              />
            )}

            <canvas
              ref={heroCanvasRef}
              className="cw-hero-media absolute inset-0 w-full h-full block pointer-events-none"
              style={{
                zIndex: 1,
                opacity: hasCanvasFrame ? 1 : 0,
                transition: 'opacity 0.25s ease-out',
              }}
            />

            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 2,
                background:
                  'linear-gradient(180deg, rgba(8,8,10,0.46) 0%, rgba(8,8,10,0.10) 36%, rgba(12,12,15,0.68) 74%, #0C0C0F 100%)',
              }}
            />

            <div
              className="relative h-full w-full px-5 sm:px-8 lg:px-14 xl:px-20 pt-20 sm:pt-24 pb-8 sm:pb-12 flex flex-col justify-end text-[#F5F4F0]"
              style={{ zIndex: 3 }}
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="max-w-[720px]">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-md mb-4 bg-black/35 border-white/15">
                    <span className="w-1.5 h-1.5 rounded-full cw-beacon bg-[#D4A373]" />
                    <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-white/90">
                      {t.heroTag}
                    </span>
                  </div>

                  <h2 className="font-sans font-semibold text-[44px] sm:text-[62px] lg:text-[76px] leading-[0.92] tracking-[-0.04em] whitespace-pre-line">
                    {t.heroTitle}
                  </h2>
                </div>

                <div className="flex items-center gap-3 self-start md:self-end shrink-0">
                  <span
                    className="inline-flex items-center gap-3 px-6 py-3.5 rounded-full text-[13px] font-sans font-semibold tracking-[-0.01em]"
                    style={{
                      backgroundColor: '#F5F4F0',
                      color: '#08080A',
                      boxShadow: '0 14px 36px rgba(0, 0, 0, 0.45)',
                    }}
                  >
                    <span>{t.heroCta}</span>
                    <span className="cw-glide text-[15px] leading-none">→</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STRATUM 2: MAISON CARDIO — SEAMLESS FULL-WIDTH BRAND BAND */}
      <section
        className="w-full relative overflow-hidden border-t border-b"
        style={{
          background: palette.cardioBg,
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-28 w-[640px] h-[260px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(212, 163, 115, 0.14) 0%, rgba(59, 130, 246, 0.07) 48%, transparent 72%)',
          }}
        />

        <button
          type="button"
          onClick={onOpenMaterials}
          disabled={!onOpenMaterials}
          className={`cw-pane group relative z-10 w-full px-5 sm:px-8 lg:px-14 xl:px-20 py-8 sm:py-10 lg:py-12 text-left outline-none block ${
            onOpenMaterials ? 'cursor-pointer' : 'opacity-45 cursor-default'
          }`}
          style={{ color: '#F5F4F0' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 lg:gap-10">
            <div className="md:col-span-4 lg:col-span-3 flex items-center justify-start md:justify-center">
              <div className="relative w-[136px] h-[92px] sm:w-[172px] sm:h-[112px] flex items-center justify-center">
                <img
                  src={transparentLogoSrc}
                  alt="Cardio Men's Footwear Emblem"
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                  style={{
                    filter:
                      'drop-shadow(0 12px 26px rgba(59, 130, 246, 0.28)) contrast(1.06)',
                  }}
                />
              </div>
            </div>

            <div className="md:col-span-5 lg:col-span-6 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#D4A373]">
                  {t.cardioBadge}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 rounded bg-white/10 text-white/75">
                  BESPOKE • B2B
                </span>
              </div>

              <div className="flex items-baseline gap-2.5 mb-2.5">
                <h3 className="font-sans font-semibold text-[32px] sm:text-[40px] leading-[0.96] tracking-[-0.03em] text-[#F5F4F0]">
                  CARDIO
                </h3>
                <span className="font-sans font-light text-[22px] sm:text-[26px] tracking-[-0.01em] text-[#D4A373]">
                  Atelier
                </span>
              </div>

              <p className="text-[13.5px] sm:text-[15px] font-sans leading-[1.52] text-white/68 max-w-[520px]">
                {t.cardioDesc}
              </p>
            </div>

            <div className="md:col-span-3 flex md:flex-col items-center md:items-end justify-between gap-3">
              <span className="text-[12px] font-mono text-white/50">
                {t.materialsSub}
              </span>
              <span
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12.5px] font-sans font-semibold shrink-0"
                style={{
                  backgroundColor: '#D4A373',
                  color: '#0A0A0D',
                }}
              >
                <span>{t.cardioCta}</span>
                <span className="cw-glide">→</span>
              </span>
            </div>
          </div>
        </button>
      </section>
    </div>
  )
}
