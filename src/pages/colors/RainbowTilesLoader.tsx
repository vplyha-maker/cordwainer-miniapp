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

export function RainbowTilesLoader({ isDark, label }: RainbowTilesLoaderProps) {
  const tiles = useMemo<TileMeta[]>(() => {
    const items: TileMeta[] = []
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        const layer = Math.max(Math.abs(row - 3), Math.abs(col - 3))
        const diag = row + col
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
      className={
        'fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 select-none ' +
        (isDark ? 'bg-[#0A0A0A] text-[#F4F0E8]' : 'bg-[#F2EFE9] text-[#1C1816]')
      }
      role="status"
      aria-live="polite"
    >
      <style>{`
        @keyframes cwRainbowTileWave {
          0%, 100% {
            transform: scale3d(0.28, 0.28, 1);
            opacity: 0.3;
          }
          38%, 54% {
            transform: scale3d(1, 1, 1);
            opacity: 1;
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
            opacity: 0.9;
          }
        }
      `}</style>

      <div
        className="grid grid-cols-7 gap-[6px] w-[184px] h-[184px] sm:w-[220px] sm:h-[220px]"
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

      <div className="flex flex-col items-center gap-1.5 text-center px-6">
        <span className="font-serif text-lg tracking-[0.06em]">
          CORDWAINE AEROSTRAP
        </span>
        <span
          className={
            'text-[9px] font-sans uppercase tracking-[0.24em] ' +
            (isDark ? 'text-[#F4F0E8]/55' : 'text-[#1C1816]/55')
          }
        >
          {label || 'Загрузка 3D • CORDWAINE AEROSTRAP...'}
        </span>
      </div>
    </div>
  )
}
