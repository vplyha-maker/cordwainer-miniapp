export type RainbowTilesLoaderProps = {
  isDark?: boolean
  label?: string
}

const KEYFRAMES_CSS = `
@keyframes cwPrismFlow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes cwSilkWave {
  0% {
    transform: translate3d(-18%, -10%, 0) rotate(-6deg) scale(1.12);
    opacity: 0.45;
  }
  50% {
    transform: translate3d(18%, 10%, 0) rotate(6deg) scale(1.22);
    opacity: 0.8;
  }
  100% {
    transform: translate3d(-18%, -10%, 0) rotate(-6deg) scale(1.12);
    opacity: 0.45;
  }
}

@keyframes cwProgressGlide {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(220%);
  }
}
`

export function RainbowTilesLoader({
  isDark = false,
  label,
}: RainbowTilesLoaderProps) {
  const baseGradient = isDark
    ? 'linear-gradient(125deg, #2B1E4A 0%, #5B2B8C 14%, #C23B78 28%, #E86A42 42%, #D9A738 56%, #2F9E84 70%, #2B6CB0 85%, #2B1E4A 100%)'
    : 'linear-gradient(125deg, #FFB3C6 0%, #FFD6A5 16%, #FDFFB6 32%, #CAFFBF 48%, #9BF6FF 64%, #A0C4FF 80%, #BDB2FF 92%, #FFB3C6 100%)'

  const sheenGradient = isDark
    ? 'radial-gradient(60% 55% at 35% 35%, rgba(255, 255, 255, 0.28) 0%, rgba(255, 196, 232, 0.14) 38%, rgba(0, 0, 0, 0) 75%)'
    : 'radial-gradient(60% 55% at 35% 35%, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.25) 42%, rgba(255, 255, 255, 0) 75%)'

  const pillBg = isDark ? 'rgba(11, 11, 12, 0.56)' : 'rgba(255, 255, 255, 0.76)'
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(28, 24, 22, 0.12)'
  const pillText = isDark ? '#F7F4EE' : '#1C1816'
  const trackBg = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(28, 24, 22, 0.12)'
  const barBg = isDark ? '#F7F4EE' : '#1C1816'

  return (
    <div
      className="absolute inset-0 z-30 w-full h-full overflow-hidden flex items-center justify-center"
      aria-busy="true"
      aria-live="polite"
    >
      <style>{KEYFRAMES_CSS}</style>

      {/* Основной жидкий радужный перелив на 100% сцены */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: baseGradient,
          backgroundSize: '320% 320%',
          animation: 'cwPrismFlow 5.5s ease-in-out infinite',
          willChange: 'background-position',
        }}
      />

      {/* Мягкий перламутровый световой блик */}
      <div
        className="absolute -inset-1/4 pointer-events-none"
        style={{
          backgroundImage: sheenGradient,
          mixBlendMode: 'screen',
          animation: 'cwSilkWave 4.2s ease-in-out infinite',
          willChange: 'transform, opacity',
        }}
      />

      {/* Подпись модели и тонкая линия прогресса */}
      <div
        className="relative z-10 flex flex-col items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md shadow-sm"
        style={{
          backgroundColor: pillBg,
          borderColor: pillBorder,
          color: pillText,
        }}
      >
        {label && (
          <span className="text-[11px] font-sans font-medium uppercase tracking-[0.18em] whitespace-nowrap">
            {label}
          </span>
        )}
        <div
          className="relative w-24 h-[2px] rounded-full overflow-hidden"
          style={{ backgroundColor: trackBg }}
        >
          <div
            className="absolute inset-y-0 left-0 w-1/2 rounded-full"
            style={{
              backgroundColor: barBg,
              animation: 'cwProgressGlide 1.35s ease-in-out infinite',
              willChange: 'transform',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default RainbowTilesLoader
