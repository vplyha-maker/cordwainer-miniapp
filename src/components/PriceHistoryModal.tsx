import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, TrendingUp } from 'lucide-react'
import type { Lang } from '../App'

type Offer = {
  id: number
  source: string
  price: number 
  history?: number[] 
}

type GroupedProduct = {
  key: string
  name: string
  product_code: string | null
  offers: Offer[]
}

type PriceHistoryModalProps = {
  group: GroupedProduct
  lang: Lang
  onClose: () => void
  t: any
}

const COLORS = [
  '#3b82f6', // Синий
  '#ef4444', // Красный
  '#10b981', // Зеленый
  '#f59e0b', // Оранжевый
  '#8b5cf6', // Фиолетовый
]

const formatSourceName = (sourceId: string) => {
  if (!sourceId) return 'Unknown'
  const customNames: Record<string, string> = {
    zotti: 'Zotti',
    aligo: 'Aligo Group',
    bahtarma: 'Bahtarma',
    bashmachnik: 'Башмачник',
    masterok: 'Masterok',
  }
  return customNames[sourceId.toLowerCase()] || sourceId.charAt(0).toUpperCase() + sourceId.slice(1)
}

export function PriceHistoryModal({ group, lang, onClose, t }: PriceHistoryModalProps) {
  const chartData = useMemo(() => {
    return group.offers.filter(o => o.price > 0).map((offer, index) => {
      const history = offer.history?.length === 5 
        ? offer.history 
        : [offer.price, offer.price, offer.price, offer.price, offer.price]
      
      return {
        ...offer,
        history,
        color: COLORS[index % COLORS.length]
      }
    })
  }, [group])

  const { minPrice, maxPrice } = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    chartData.forEach(offer => {
      offer.history.forEach(price => {
        if (price < min) min = price
        if (price > max) max = price
      })
    })
    
    if (min === Infinity) return { minPrice: 0, maxPrice: 100 }
    
    const padding = (max - min) * 0.1 || max * 0.1
    return {
      minPrice: Math.max(0, min - padding),
      maxPrice: max + padding
    }
  }, [chartData])

  const width = 100
  const height = 100

  const getCoordinates = (index: number, price: number, totalPoints: number) => {
    const x = (index / (totalPoints - 1)) * width
    const y = height - ((price - minPrice) / (maxPrice - minPrice)) * height
    return { x, y: isNaN(y) ? height / 2 : y }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 font-sans">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#000000] opacity-70 backdrop-blur-sm cursor-pointer"
      />
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[var(--color-surface)] border-t sm:border border-[var(--color-border)] shadow-2xl p-6 sm:p-8 rounded-t-3xl sm:rounded-3xl z-10 overflow-hidden"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 pr-4">
            <h3 className="text-sm uppercase tracking-widest text-[var(--color-muted)] font-bold mb-1 flex items-center gap-2">
              <TrendingUp size={16} />
              {t.priceHistory}
            </h3>
            <h2 className="text-lg font-serif font-medium text-[var(--color-ink)] leading-tight line-clamp-2">
              {group.name}
            </h2>
            {group.product_code && (
              <p className="text-[11px] font-mono text-[var(--color-muted)] mt-1">
                {t.code} {group.product_code}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 -m-2 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors bg-[var(--color-surface-2)] rounded-full"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="relative w-full aspect-[2/1] mt-4 mb-6">
          <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-[var(--color-muted)] font-mono">
            <div className="w-full flex items-center gap-2">
              <span className="w-10 text-right shrink-0">{maxPrice.toFixed(0)}</span>
              <div className="flex-1 h-px bg-[var(--color-border)] opacity-50"></div>
            </div>
            <div className="w-full flex items-center gap-2">
              <span className="w-10 text-right shrink-0">{((maxPrice + minPrice) / 2).toFixed(0)}</span>
              <div className="flex-1 h-px bg-[var(--color-border)] opacity-50"></div>
            </div>
            <div className="w-full flex items-center gap-2">
              <span className="w-10 text-right shrink-0">{minPrice.toFixed(0)}</span>
              <div className="flex-1 h-px bg-[var(--color-border)] opacity-50"></div>
            </div>
          </div>

          <div className="absolute inset-0 ml-12">
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
              {chartData.map((offer, idx) => {
                const points = offer.history.map((price, i) => {
                  const { x, y } = getCoordinates(i, price, offer.history.length)
                  return `${x},${y}`
                }).join(' L ')

                return (
                  <motion.g key={offer.source} initial={{ opacity: 0, pathLength: 0 }} animate={{ opacity: 1, pathLength: 1 }} transition={{ duration: 0.5, delay: idx * 0.1 }}>
                    <path
                      d={`M ${points}`}
                      fill="none"
                      stroke={offer.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="drop-shadow-sm"
                    />
                    {offer.history.map((price, i) => {
                      const { x, y } = getCoordinates(i, price, offer.history.length)
                      return (
                        <circle key={i} cx={x} cy={y} r="2.5" fill={offer.color} stroke="var(--color-surface)" strokeWidth="1" />
                      )
                    })}
                  </motion.g>
                )
              })}
            </svg>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-[var(--color-border)]">
          {chartData.map(offer => (
            <div key={offer.source} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: offer.color }} />
              <span className="text-xs font-medium text-[var(--color-ink)]">
                {formatSourceName(offer.source)}
              </span>
              <span className="text-[10px] font-mono text-[var(--color-muted)]">
                ({offer.price} ₴)
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
