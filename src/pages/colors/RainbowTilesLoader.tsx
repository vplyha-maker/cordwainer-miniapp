import { useMemo } from 'react'

type RainbowTilesLoaderProps = {
  isDark: boolean
  label?: string
}

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

const COLS = 12
const ROWS = 6

export function RainbowTilesLoader({ isDark, label }: RainbowTilesLoaderProps) {
  const tiles = useMemo<TileMeta[]>(() => {
    const items: TileMeta[] = []
    const maxDiag = COLS - 1 + (ROWS - 1)
    const centerCol = (COLS - 1) / 2
    const centerRow = (ROWS - 1) / 2

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const dist = Math.hypot((col - centerCol) * 0.72, row - centerRow)
        const paletteIdx = Math.round(((row + col) / maxDiag) * (DIAGONAL_PALETTE.length - 1))
        const delaySec = -(dist * 0.24 + (row + col) * 0.03)
        items.push({
          key: row * COLS + col,
          color: DIAGONAL_PALETTE[paletteIdx] ?? DIAGONAL_PALETTE[0],
          delaySec,
        })
      }
    }
    return items
  }, [])

  return (
    <div
      className={
        'absolute inset-0 z-10 overflow-hidden rounded-sm select-none pointer-events-none ' +
        (isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]')
      }
      role="status"
      aria-live="polite"
    >
      <style>{`
        @keyframes cwRainbowTileWave {
          0%, 100% {
            transform: scale3d(0.28, 0.28, 1);
            opacity: 0.28;
          }
          38%, 54% {
            transform: scale3d(1, 1, 1);
            opacity: 0.96;
          }
        }
        .cw-rainbow-tile {
          animation: cwRainbowTileWave 3s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform: translateZ(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .cw-rainbow-tile {
            animation: none;
            transform: scale3d(0.85, 0.85, 1);
            opacity: 0.85;
          }
        }
      `}</style>

      <div
        className="grid grid-cols-12 grid-rows-6 gap-[5px] w-full h-full p-2"
        aria-hidden="true"
      >
        {tiles.map((tile) => (
          <span
            key={tile.key}
            className="cw-rainbow-tile block w-full h-full rounded-[3px]"
            style={{
              backgroundColor: tile.color,
              animationDelay: tile.delaySec.toFixed(3) + 's',
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={
            'px-3.5 py-1.5 text-[8.5px] font-sans uppercase tracking-[0.22em] border rounded-full ' +
            (isDark
              ? 'border-white/20 bg-[#0A0A0A]/85 text-[#F4F0E8]'
              : 'border-black/20 bg-[#F2EFE9]/90 text-[#1C1816]')
          }
        >
          {label || 'Загрузка 3D • CORDWAINE AEROSTRAP...'}
        </span>
      </div>
    </div>
  )
}
