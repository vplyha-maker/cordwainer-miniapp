import React, { useMemo } from 'react'
import { resolveStudioStageStyle } from './themeSystem'

export type RainbowTilesLoaderProps = {
  isDark?: boolean
  label?: string
}

const COLS = 12
const ROWS = 6

const KEYFRAMES_CSS = `
@keyframes cwPrismFlow {
  0% {
    transform: scale(0.76);
    opacity: 0.52;
    filter: hue-rotate(0deg) saturate(1.05);
  }
  50% {
    transform: scale(1);
    opacity: 0.96;
    filter: hue-rotate(140deg) saturate(1.22);
  }
  100% {
    transform: scale(0.76);
    opacity: 0.52;
    filter: hue-rotate(360deg) saturate(1.05);
  }
}

@keyframes cwSilkSheen {
  0% { transform: translate3d(-120%, 0, 0) skewX(-18deg); }
  100% { transform: translate3d(220%, 0, 0) skewX(-18deg); }
}
`

export const RainbowTilesLoader: React.FC<RainbowTilesLoaderProps> = ({
  isDark = false,
  label,
}) => {
  const stage = resolveStudioStageStyle(undefined, true, isDark)
  const lTop = stage.isDarkStage ? 58 : 68
  const lBot = stage.isDarkStage ? 46 : 56

  const tiles = useMemo(() => {
    const items: { key: string; gradient: string; delay: string }[] = []
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const hueA = Math.round(((c / COLS) * 280 + r * 24) % 360)
        const hueB = (hueA + 38) % 360
        const delayMs = (c * 75 + r * 95)
        items.push({
          key: r + '_' + c,
          gradient: `linear-gradient(135deg, hsl(${hueA} 84% ${lTop}%), hsl(${hueB} 82% ${lBot}%))`,
          delay: delayMs + 'ms',
        })
      }
    }
    return items
  }, [lTop, lBot])

  return (
    <div
      className="absolute inset-0 z-30 w-full h-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: stage.bgHex }}
      aria-busy="true"
    >
      <style>{KEYFRAMES_CSS}</style>

      <div className="grid grid-cols-12 grid-rows-6 w-full h-full gap-[3px] p-[3px]">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className="w-full h-full rounded-[6px]"
            style={{
              backgroundImage: tile.gradient,
              animation: 'cwPrismFlow 2.8s ease-in-out infinite',
              animationDelay: tile.delay,
              willChange: 'transform, opacity, filter',
            }}
          />
        ))}
      </div>

      {/* Мягкий диагональный световой блик */}
      <div
        className="pointer-events-none absolute inset-y-0 w-1/3"
        style={{
          background: stage.isDarkStage
            ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.42), transparent)',
          animation: 'cwSilkSheen 2.1s ease-in-out infinite',
          willChange: 'transform',
        }}
      />

      {label && (
        <div
          className="absolute px-4 py-1.5 rounded-full border text-[11px] font-mono uppercase tracking-[0.14em] whitespace-nowrap shadow-sm"
          style={{
            backgroundColor: stage.chipBg,
            borderColor: stage.chipBorder,
            color: stage.chipText,
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}

export default RainbowTilesLoader
