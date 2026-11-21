import React from 'react'
import { resolveStudioStageStyle } from './themeSystem'

export type RainbowTilesLoaderProps = {
  isDark?: boolean
  label?: string
}

const AURORA_CSS = `
@keyframes cwOrbA {
  0%   { transform: translate3d(-18%, -12%, 0) scale(1) rotate(0deg); }
  50%  { transform: translate3d(22%, 14%, 0) scale(1.18) rotate(120deg); }
  100% { transform: translate3d(-18%, -12%, 0) scale(1) rotate(360deg); }
}

@keyframes cwOrbB {
  0%   { transform: translate3d(20%, 16%, 0) scale(1.1) rotate(0deg); }
  50%  { transform: translate3d(-22%, -10%, 0) scale(0.92) rotate(-140deg); }
  100% { transform: translate3d(20%, 16%, 0) scale(1.1) rotate(-360deg); }
}

@keyframes cwOrbC {
  0%   { transform: translate3d(-8%, 20%, 0) scale(0.95); }
  50%  { transform: translate3d(16%, -18%, 0) scale(1.22); }
  100% { transform: translate3d(-8%, 20%, 0) scale(0.95); }
}

@keyframes cwOrbD {
  0%   { transform: translate3d(14%, -16%, 0) scale(1.05); }
  50%  { transform: translate3d(-16%, 18%, 0) scale(1.15); }
  100% { transform: translate3d(14%, -16%, 0) scale(1.05); }
}

@keyframes cwHairlineGlide {
  0%   { transform: translate3d(-100%, 0, 0); }
  100% { transform: translate3d(220%, 0, 0); }
}
`

export const RainbowTilesLoader: React.FC<RainbowTilesLoaderProps> = ({
  isDark = false,
  label,
}) => {
  const stage = resolveStudioStageStyle(undefined, true, isDark)
  const dark = stage.isDarkStage

  const cleanLabel = label ? label.replace(/^3D\s*·\s*/i, '').trim() : 'CORDWAINE'

  return (
    <div
      className="absolute inset-0 z-30 w-full h-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: stage.bgHex }}
      aria-busy="true"
    >
      <style>{AURORA_CSS}</style>

      {/* 4 живых перетекающих перламутровых потока */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -inset-1/4 rounded-full"
          style={{
            background: dark
              ? 'radial-gradient(circle at 35% 40%, rgba(214, 168, 108, 0.55) 0%, rgba(196, 122, 168, 0.28) 38%, transparent 70%)'
              : 'radial-gradient(circle at 35% 40%, rgba(232, 184, 118, 0.72) 0%, rgba(226, 154, 188, 0.42) 40%, transparent 72%)',
            filter: 'blur(34px)',
            animation: 'cwOrbA 6.4s ease-in-out infinite',
            willChange: 'transform',
          }}
        />

        <div
          className="absolute -inset-1/4 rounded-full"
          style={{
            background: dark
              ? 'radial-gradient(circle at 68% 58%, rgba(102, 148, 224, 0.54) 0%, rgba(132, 104, 214, 0.30) 40%, transparent 70%)'
              : 'radial-gradient(circle at 68% 58%, rgba(126, 174, 242, 0.68) 0%, rgba(168, 142, 232, 0.40) 42%, transparent 72%)',
            filter: 'blur(36px)',
            animation: 'cwOrbB 7.2s ease-in-out infinite',
            willChange: 'transform',
          }}
        />

        <div
          className="absolute -inset-1/4 rounded-full"
          style={{
            background: dark
              ? 'radial-gradient(circle at 46% 68%, rgba(92, 196, 168, 0.48) 0%, rgba(168, 204, 126, 0.20) 38%, transparent 68%)'
              : 'radial-gradient(circle at 46% 68%, rgba(118, 214, 184, 0.64) 0%, rgba(206, 224, 142, 0.32) 42%, transparent 70%)',
            filter: 'blur(32px)',
            animation: 'cwOrbC 5.6s ease-in-out infinite',
            willChange: 'transform',
          }}
        />

        <div
          className="absolute -inset-1/4 rounded-full"
          style={{
            background: dark
              ? 'radial-gradient(circle at 62% 30%, rgba(234, 124, 146, 0.42) 0%, transparent 62%)'
              : 'radial-gradient(circle at 62% 30%, rgba(244, 162, 174, 0.54) 0%, transparent 64%)',
            filter: 'blur(30px)',
            animation: 'cwOrbD 6.8s ease-in-out infinite',
            willChange: 'transform',
          }}
        />

        {/* Тонкая фактура рифлёного архитектурного стекла (fluted glass) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: dark
              ? 'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 14px)'
              : 'repeating-linear-gradient(90deg, rgba(255,255,255,0.34) 0px, rgba(255,255,255,0.34) 1px, rgba(24,22,19,0.03) 2px, transparent 4px, transparent 14px)',
          }}
        />
      </div>

      {/* Редакционная подпись по центру + скользящая тонкая линия */}
      <div className="relative z-10 flex flex-col items-center gap-2.5 px-6 text-center">
        <div
          className="text-[12px] font-mono uppercase tracking-[0.22em] whitespace-nowrap"
          style={{ color: stage.textColor }}
        >
          {cleanLabel}
        </div>
        <div
          className="relative w-28 h-[1.5px] rounded-full overflow-hidden"
          style={{
            backgroundColor: dark ? 'rgba(244,240,232,0.18)' : 'rgba(24,22,19,0.14)',
          }}
        >
          <div
            className="absolute inset-y-0 w-1/2 rounded-full"
            style={{
              background: dark
                ? 'linear-gradient(90deg, transparent, #F4F0E8, transparent)'
                : 'linear-gradient(90deg, transparent, #181613, transparent)',
              animation: 'cwHairlineGlide 1.4s ease-in-out infinite',
              willChange: 'transform',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default RainbowTilesLoader
