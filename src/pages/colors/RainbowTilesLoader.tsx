import { useMemo } from 'react'

type RainbowTilesLoaderProps = {
  isDark: boolean
  label?: string
}

// Палитра 7x7 диагональной радуги (13 диагоналей от верхнего левого к нижнему правому углу)
const DIAGONAL_PALETTE = [
  '#5A2D82',
  '#912E8D',
  '#B44195',
  '#E12CA1',
  '#F64828',
  '#E86B05',
  '#E4AA1E',
  '#EDCE48',
  '#7AC143',
  '#188B72',
  '#1CAAD7',
  '#3D98C6',
  '#4A56E2',
] as const

type TileMeta = {
  key: number
  color: string
  delaySec: number
}

export function RainbowTilesLoader({ isDark, label }: RainbowTilesLoaderProps) {
  const tiles = useMemo<TileMeta[]>(() => {
    const items: TileMeta[] = []
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        const layer = Math.max(Math.abs(row - 3), Math.abs(col - 3)) // 0..3 (4 слоя)
        const diag = row + col // 0..12
        const delaySec = -(layer * 0.28 + diag * 0.035)
        items.push({
          key: row * 7 + col,
          color: DIAGONAL_PALETTE[diag] ?? DIAGONAL_PALETTE[0],
          delaySec,
        })
      }
    }
    return items
  }, [])

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none select-none"
      role="status"
      aria-live="polite"
    >
      <style>{`
        @keyframes cwRainbowTileWave {
          0%, 100% {
            transform: scale3d(0.28, 0.28, 1);
            opacity: 0.32;
            border-radius: 35%;
          }
          35%, 55% {
            transform: scale3d(1, 1, 1);
            opacity: 1;
            border-radius: 18%;
          }
        }
        .cw-rainbow-tile {
          animation: cwRainbowTileWave 3s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .cw-rainbow-tile {
            animation: none;
            transform: scale3d(0.85, 0.85, 1);
            opacity: 0.9;
          }
        }
      `}</style>

      <div
        className="grid grid-cols-7 gap-[4px] w-[96px] h-[96px] sm:w-[110px] sm:h-[110px]"
        aria-hidden="true"
      >
        {tiles.map((tile) => (
          <span
            key={tile.key}
            className="cw-rainbow-tile block w-full h-full"
            style={{
              backgroundColor: tile.color,
              animationDelay: tile.delaySec.toFixed(3) + 's',
            }}
          />
        ))}
      </div>

      <span
        className={
          'px-3 py-1 text-[8.5px] font-sans uppercase tracking-[0.22em] border rounded-full backdrop-blur-sm ' +
          (isDark
            ? 'border-white/15 bg-black/45 text-[#F4F0E8]/80'
            : 'border-black/15 bg-white/60 text-[#1C1816]/80')
        }
      >
        {label || 'Загрузка 3D • CORDWAINE AEROSTRAP...'}
      </span>
    </div>
  )
}

