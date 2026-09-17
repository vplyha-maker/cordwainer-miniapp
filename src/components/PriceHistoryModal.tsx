import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Lang } from '../App'

export type Currency = 'UAH' | 'USD' | 'EUR'

type Offer = {
  id: number
  source: string
  price: number
  history?: number[]
  unitPrice?: number
  baseUnit?: string
  volumeLabel?: string
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
  '#10b981',
  '#ef4444',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
]

const formatSourceName = (sourceId: string) => {
  if (!sourceId) return 'Unknown'
  const map: Record<string, string> = {
    zotti: 'Zotti',
    aligo: 'Aligo Group',
    bahtarma: 'Bahtarma',
    bashmachnik: 'Башмачник',
    masterok: 'Masterok',
  }
  return map[sourceId.toLowerCase()] || sourceId.charAt(0).toUpperCase() + sourceId.slice(1)
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

function formatPrice(val: number, currency: Currency) {
  if (!val || val <= 0) return '—'
  if (currency === 'UAH') return Math.round(val).toLocaleString('uk-UA')
  return val.toFixed(2)
}

function Sparkline({
  points,
  color,
  width = 110,
  height = 28,
}: {
  points: number[]
  color: string
  width?: number
  height?: number
}) {
  if (points.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center text-[10px] text-[var(--color-muted)]"
      >
        —
      </div>
    )
  }

  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width
    const y = height - ((p - min) / span) * (height - 6) - 3
    return x + ',' + y
  })

  const path = 'M ' + coords.join(' L ')
  const lastY = height - ((points[points.length - 1] - min) / span) * (height - 6) - 3

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={width} cy={lastY} r="2.8" fill={color} />
    </svg>
  )
}

export function PriceHistoryModal({
  group,
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

  const rows = useMemo(() => {
    return group.offers
      .filter((o) => o.price > 0)
      .map((offer, index) => {
        const historyRaw = extractHistory(offer.history, offer.price)
        const history = historyRaw.map((p) => p / currentRate)
        const convertedPrice = offer.price / currentRate

        const first = history[0] ?? convertedPrice
        const last = history[history.length - 1] ?? convertedPrice

        let changePct: number | null = null
        if (history.length >= 2 && first > 0) {
          changePct = ((last - first) / first) * 100
        }

        return {
          ...offer,
          history,
          convertedPrice,
          changePct,
          color: COLORS[index % COLORS.length],
        }
      })
      .sort((a, b) => a.convertedPrice - b.convertedPrice)
  }, [group, currentRate])

  const hasAnyHistory = rows.some((r) => r.history.length >= 2)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 font-sans">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
      />

      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full max-w-lg bg-[var(--color-surface)] border-t sm:border border-[var(--color-border)] shadow-2xl rounded-t-3xl sm:rounded-3xl z-10 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border)] shrink-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp size={15} className="text-[var(--color-muted)] shrink-0" />
              <h3 className="text-[11px] uppercase tracking-widest text-[var(--color-muted)] font-bold">
                {t.priceHistory}
              </h3>
            </div>

            <div className="flex items-center gap-2">
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
                      className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${
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

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors bg-[var(--color-surface-2)] rounded-full"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <h2 className="text-[17px] font-serif font-medium text-[var(--color-ink)] leading-snug line-clamp-2">
            {group.name}
          </h2>
          {group.product_code && (
            <p className="text-[11px] font-mono text-[var(--color-muted)] mt-1">
              {t.code} {group.product_code}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!hasAnyHistory ? (
            <div className="m-5 py-10 px-5 text-center bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-2xl">
              <p className="text-sm text-[var(--color-ink)] font-medium mb-1.5">
                {t.historySingleTitle}
              </p>
              <p className="text-[13px] text-[var(--color-muted)] leading-relaxed">
                {t.historySingleHint}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {rows.map((row, idx) => {
                const changePct = row.changePct
                const isDown = changePct !== null && changePct < -0.4
                const isUp = changePct !== null && changePct > 0.4

                // Простой и надёжный способ сформировать текст процента
                let changeText = '—'
                if (changePct !== null) {
                  const rounded = changePct.toFixed(1)
                  if (changePct > 0) {
                    changeText = '+' + rounded + '%'
                  } else {
                    changeText = rounded + '%'
                  }
                }

                const changeColor = isDown
                  ? 'text-emerald-600'
                  : isUp
                    ? 'text-red-500'
                    : 'text-[var(--color-muted)]'

                return (
                  <motion.div
                    key={row.source + '_' + row.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="px-5 py-4 flex items-center gap-3"
                  >
                    {/* Цвет + Название поставщика */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: row.color }}
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[var(--color-ink)] truncate">
                          {formatSourceName(row.source)}
                        </div>
                        {row.volumeLabel && (
                          <div className="text-[11px] text-[var(--color-muted)] font-mono">
                            {row.volumeLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sparkline */}
                    <div className="hidden sm:block shrink-0 opacity-90">
                      <Sparkline points={row.history} color={row.color} />
                    </div>

                    {/* Цена + изменение */}
                    <div className="text-right shrink-0">
                      <div className="text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">
                        {formatPrice(row.convertedPrice, currency)}
                        <span className="text-[12px] font-normal text-[var(--color-muted)] ml-0.5">
                          {currencySymbol}
                        </span>
                      </div>

                      <div className={'flex items-center justify-end gap-1 mt-0.5 ' + changeColor}>
                        {isDown && <TrendingDown size={11} strokeWidth={2.5} />}
                        {isUp && <TrendingUp size={11} strokeWidth={2.5} />}
                        {!isDown && !isUp && changePct !== null && (
                          <Minus size={11} strokeWidth={2.5} />
                        )}
                        <span className="text-[11px] font-medium tabular-nums">
                          {changeText}
                        </span>
                        <span className="text-[10px] text-[var(--color-muted)] opacity-60">
                          · {row.history.length}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Подсказка внизу */}
        {hasAnyHistory && (
          <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/50 shrink-0">
            <p className="text-[10px] text-[var(--color-muted)] text-center leading-relaxed">
              Цвет точки = поставщик · % = изменение цены · число = количество замеров
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
