import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, TrendingUp } from 'lucide-react'
import type { Lang } from '../App'

export type Currency = 'UAH' | 'USD' | 'EUR'

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
  usdRate?: number | null
  eurRate?: number | null
  currency: Currency
  onCurrencyChange: (currency: Currency) => void
}

const COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
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

function parseHistoryPoint(item: unknown): number {
  if (typeof item === 'number') return Number.isFinite(item) && item > 0 ? item : 0
  if (typeof item === 'string') {
    const n = parseFloat(item.replace(',', '.').replace(/[^0-9.]/g, ''))
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  if (item && typeof item === 'object' && 'price' in (item as object)) {
    return parseHistoryPoint((item as { price: unknown }).price)
  }
  return 0
}

function extractHistory(raw: unknown, fallbackPrice: number): number[] {
  let data: unknown = raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) data = []
    else {
      try {
        data = JSON.parse(trimmed)
      } catch {
        data = []
      }
    }
  }

  const fromApi: number[] = []
  if (Array.isArray(data)) {
    for (const item of data) {
      const n = parseHistoryPoint(item)
      if (n > 0) fromApi.push(n)
    }
  }

  if (fromApi.length > 0) return fromApi
  return fallbackPrice > 0 ? [fallbackPrice] : []
}

export function PriceHistoryModal({
  group,
  lang: _lang,
  onClose,
  t,
  usdRate,
  eurRate,
  currency,
  onCurrencyChange,
}: PriceHistoryModalProps) {
  const currentRate = useMemo(() => {
    if (currency === 'USD' && usdRate && usdRate > 0) return usdRate
    if (currency === 'EUR' && eurRate && eurRate > 0) return eurRate
    return 1
  }, [currency, usdRate, eurRate])

  const currencySymbol = currency === 'UAH' ? '₴' : currency === 'USD' ? '$' : '€'

  const chartData = useMemo(() => {
    return group.offers.filter(o => o.price > 0).map((offer, index) => {
      const historyRaw = extractHistory(offer.history, offer.price)
      const history = historyRaw.map(p => p / currentRate)
      const convertedPrice = offer.price / currentRate

      return {
        ...offer,
        history,
        convertedPrice,
        color: COLORS[index % COLORS.length],
      }
    })
  }, [group, currentRate])

  const maxPoints = chartData.reduce((m, o) => Math.max(m, o.history.length), 0)
  const hasEnoughHistory = chartData.some(o => o.history.length >= 2)

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

    const padding = (max - min) * 0.1 || max * 0.1 || 1
    return {
      minPrice: Math.max(0, min - padding),
      maxPrice: max + padding,
    }
  }, [chartData])

  const width = 100
  const height = 100

  const getCoordinates = (index: number, price: number, totalPoints: number) => {
    const x = totalPoints <= 1 ? width / 2 : (index / (totalPoints - 1)) * width
    const span = maxPrice - minPrice
    const y = span === 0 ? height / 2 : height - ((price - minPrice) / span) * height
    return { x, y: isNaN(y) ? height / 2 : y }
  }

  const formatAxisY = (val: number) => {
    return currency === 'UAH' ? val.toFixed(0) : val.toFixed(1)
  }

  const formatLegendPrice = (val: number) => {
    return currency === 'UAH' ? val.toFixed(0) : val.toFixed(2)
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
        className="relative w-full max-w-lg bg-[var(--color-surface)] border-t sm:border border-[var(--color-border)] shadow-2xl p-6 sm:p-8 rounded-t-3xl sm:rounded-3xl z-10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-start mb-6 shrink-0 gap-4">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h3 className="text-sm uppercase tracking-widest text-[var(--color-muted)] font-bold flex items-center gap-2">
                <TrendingUp size={16} />
                {t.priceHistory}
              </h3>

              <div className="flex bg-[var(--color-surface-2)] p-0.5 rounded-md border border-[var(--color-border)]">
                {(['UAH', 'USD', 'EUR'] as Currency[]).map((cur) => {
                  if (cur === 'USD' && !usdRate) return null
                  if (cur === 'EUR' && !eurRate) return null
                  const isActive = currency === cur
                  return (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => onCurrencyChange(cur)}
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded transition-all ${
                        isActive
                          ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-ink)]'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                      }`}
                    >
                      {cur}
                    </button>
                  )
                })}
              </div>
            </div>

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
            type="button"
            onClick={onClose}
            className="p-2 -m-2 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors bg-[var(--color-surface-2)] rounded-full shrink-0"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {hasEnoughHistory ? (
          <>
            <div className="relative w-full aspect-[2/1] mt-2 mb-2 shrink-0">
              <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-[var(--color-muted)] font-mono">
                <div className="w-full flex items-center gap-2">
                  <span className="w-10 text-right shrink-0">
                    {currencySymbol}{formatAxisY(maxPrice)}
                  </span>
                  <div className="flex-1 h-px bg-[var(--color-border)] opacity-50"></div>
                </div>
                <div className="w-full flex items-center gap-2">
                  <span className="w-10 text-right shrink-0">
                    {currencySymbol}{formatAxisY((maxPrice + minPrice) / 2)}
                  </span>
                  <div className="flex-1 h-px bg-[var(--color-border)] opacity-50"></div>
                </div>
                <div className="w-full flex items-center gap-2">
                  <span className="w-10 text-right shrink-0">
                    {currencySymbol}{formatAxisY(minPrice)}
                  </span>
                  <div className="flex-1 h-px bg-[var(--color-border)] opacity-50"></div>
                </div>
              </div>

              <div className="absolute inset-0 ml-12 py-1">
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                  {chartData.map((offer, idx) => {
                    const points = offer.history.map((price, i) => {
                      const { x, y } = getCoordinates(i, price, offer.history.length)
                      return `\( {x}, \){y}`
                    }).join(' L ')

                    return (
                      <motion.g key={offer.source} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: idx * 0.08 }}>
                        {offer.history.length >= 2 && (
                          <path
                            d={`M ${points}`}
                            fill="none"
                            stroke={offer.color}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            className="drop-shadow-sm"
                          />
                        )}
                        {offer.history.map((price, i) => {
                          const { x, y } = getCoordinates(i, price, offer.history.length)
                          return (
                            <circle key={i} cx={x} cy={y} r="2.5" fill={offer.color} stroke="var(--color-surface)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                          )
                        })}
                      </motion.g>
                    )
                  })}
                </svg>
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[var(--color-muted)] mb-3 px-12">
              <span>{t.historyOldest}</span>
              <span>{t.historyNewest} · {maxPoints} {t.historyPoints}</span>
            </div>
          </>
        ) : (
          <div className="py-8 px-4 mb-2 text-center bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl">
            <p className="text-sm text-[var(--color-ink)] font-medium mb-1">{t.historySingleTitle}</p>
            <p className="text-[13px] text-[var(--color-muted)] leading-relaxed">{t.historySingleHint}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 pt-4 border-t border-[var(--color-border)] overflow-y-auto min-h-0">
          {chartData.map(offer => (
            <div key={offer.source} className="flex items-center gap-1.5 bg-[var(--color-surface-2)] px-2 py-1 rounded-md border border-[var(--color-border)]">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: offer.color }} />
              <span className="text-[11px] font-medium text-[var(--color-ink)] truncate max-w-[100px]">
                {formatSourceName(offer.source)}
              </span>
              <span className="text-[10px] font-mono text-[var(--color-muted)] whitespace-nowrap">
                {formatLegendPrice(offer.convertedPrice)} {currencySymbol}
              </span>
              {offer.history.length > 1 && (
                <span className="text-[9px] font-mono text-[var(--color-muted)] opacity-70">
                  · {offer.history.length}
                </span>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
