import React from 'react'

export type RainbowTilesLoaderProps = {
  isDark?: boolean
  label?: string
}

const SPECTRUM_CSS = `
@keyframes cwLiquidRainbow {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes cwPrismWave {
  0%   { transform: translate3d(-35%, -10%, 0) rotate(-12deg) scale(1.1); }
  50%  { transform: translate3d(35%, 10%, 0) rotate(12deg) scale(1.25); }
  100% { transform: translate3d(-35%, -10%, 0) rotate(-12deg) scale(1.1); }
}

@keyframes cwLineSlide {
  0%   { transform: translate3d(-100%, 0, 0); }
  100% { transform: translate3d(220%, 0, 0); }
}
`

export const RainbowTilesLoader: React.FC<RainbowTilesLoaderProps> = ({
  isDark = false,
  label,
}) => {
  void isDark
  const cleanLabel = label ? label.replace(/^3D\s*·\s*/i, '').trim() : 'CORDWAINE'

  return (
    <div
      className="absolute inset-0 z-30 w-full h-full overflow-hidden flex items-center justify-center"
      aria-busy="true"
    >
      <style>{SPECTRUM_CSS}</style>

      {/* Основной сочный переливающийся спектр */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(125deg, #FF3B6B 0%, #FF8A2B 16%, #FFD43B 32%, #2FD17A 48%, #1EC8E8 64%, #4C6EF5 80%, #B44CFF 92%, #FF3B6B 100%)',
          backgroundSize: '320% 320%',
          animation: 'cwLiquidRainbow 3.6s ease-in-out infinite',
          willChange: 'background-position',
        }}
      />

      {/* Встречная шёлковая световая волна для объёма и перелива */}
      <div
        className="pointer-events-none absolute -inset-1/2"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.12) 32%, transparent 66%)',
          animation: 'cwPrismWave 3.2s ease-in-out infinite',
          willChange: 'transform',
        }}
      />

      {/* Чистая подпись модели по центру */}
      <div className="relative z-10 flex flex-col items-center gap-2 px-5 py-2.5 rounded-2xl bg-black/28 backdrop-blur-sm border border-white/25">
        <div className="text-[12px] font-mono font-semibold uppercase tracking-[0.2em] text-white whitespace-nowrap">
          {cleanLabel}
        </div>
        <div className="relative w-24 h-[2px] rounded-full overflow-hidden bg-white/30">
          <div
            className="absolute inset-y-0 w-1/2 rounded-full bg-white"
            style={{
              animation: 'cwLineSlide 1.3s ease-in-out infinite',
              willChange: 'transform',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default RainbowTilesLoader
