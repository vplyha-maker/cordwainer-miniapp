import { memo } from 'react'
import { Tag, LineChart, TrendingDown, Info, Bookmark, Store } from 'lucide-react'
import type { Lang } from '../../../App' // Проверьте путь!
import type { Currency } from '../../../components/PriceHistoryModal' // Проверьте путь!
import type { GroupedProduct } from '../types'
import { DICTIONARY } from '../constants'
import {
  formatDate,
  computeGroupSignals,
  extractHistory,
  convertUah,
  computeOfferSignals,
  formatSourceName,
  signalClass,
  formatPrice,
} from '../utils'

export const ProductCard = memo(
  ({
    group,
    lang,
    t,
    isFavorite,
    onToggleFavorite,
    onOpenSpreadModal,
    onOpenHistory,
    currency,
    usdRate,
    eurRate,
  }: {
    group: GroupedProduct
    lang: Lang
    t: typeof DICTIONARY['ru']
    isFavorite: boolean
    onToggleFavorite: (key: string) => void
    onOpenSpreadModal: (val: number) => void
    onOpenHistory: (group: GroupedProduct) => void
    currency: Currency
    usdRate?: number | null
    eurRate?: number | null
  }) => {
    const sortedOffers = [...group.offers].sort((a, b) => {
      if (a.unitPrice <= 0) return 1
      if (b.unitPrice <= 0) return -1
      return a.unitPrice - b.unitPrice
    })

    const validPrices = sortedOffers.filter((o) => o.unitPrice > 0).map((o) => o.unitPrice)
    const avgUnitPrice = validPrices.length
      ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
      : 0
    const validOffersCount = validPrices.length
    const showSpread = validOffersCount > 1
    const formattedDate = formatDate(group.latestUpdatedAt, lang)
    const groupSignals = computeGroupSignals(group)

    return (
      <article className="group/card flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] transition-colors shadow-sm hover:shadow-md relative">
        <div className="p-5 border-b border-[var(--color-border)] flex gap-4 items-start relative">
          {group.image_url ? (
            <img
              src={group.image_url}
              alt={group.name}
              className="w-16 h-16 object-cover bg-[var(--color-surface-2)] border border-[var(--color-border)] grayscale group-hover/card:grayscale-0 transition-all duration-500 shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 flex items-center justify-center bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-muted)] shrink-0 opacity-50">
              <Tag size={20} strokeWidth={1.5} />
            </div>
          )}

          <div className="flex-1 min-w-0 pr-8">
            <h3 className="font-serif text-lg font-medium leading-snug text-[var(--color-ink)] line-clamp-2">
              {group.name}
            </h3>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3">
              {group.product_code && (
                <span className="text-[10px] font-mono text-[var(--color-muted)] uppercase tracking-widest">
                  {t.code} {group.product_code}
                </span>
              )}

              <button
                onClick={() => onOpenHistory(group)}
                className="relative inline-flex items-center gap-1.5 p-2 -m-2 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink)] opacity-70 hover:opacity-100 transition-opacity focus:outline-none rounded-md"
              >
                <LineChart size={14} strokeWidth={2.5} />
                <span>{t.priceHistory}</span>
              </button>

              {showSpread && group.unitSpread > 0 && (
                <button
                  onClick={() => onOpenSpreadModal(group.unitSpread)}
                  className="relative inline-flex items-center gap-1.5 p-2 -m-2 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-accent)] hover:opacity-80 transition-colors focus:outline-none rounded-md"
                >
                  <TrendingDown size={14} strokeWidth={2.5} />
                  <span>Spread {group.unitSpread.toFixed(0)}%</span>
                  <Info size={12} strokeWidth={2.5} className="opacity-50 ml-0.5" />
                </button>
              )}

              {groupSignals.map((s) => (
                <span
                  key={s.kind}
                  className={
                    'text-[10px] uppercase tracking-wider font-semibold border px-1.5 py-0.5 ' +
                    signalClass(s.tone)
                  }
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => onToggleFavorite(group.key)}
            className="absolute top-4 right-4 p-2 -m-2 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors focus:outline-none"
          >
            <Bookmark
              size={18}
              strokeWidth={1.5}
              className={isFavorite ? 'fill-[var(--color-accent)] text-[var(--color-accent)]' : ''}
            />
          </button>
        </div>

        <div className="flex flex-col">
          {!showSpread && (
            <div className="px-5 py-3 text-[11px] uppercase tracking-widest text-[var(--color-muted)] flex items-center gap-2 border-b border-[var(--color-border)] last:border-0">
              <Store size={14} strokeWidth={1.5} className="opacity-50" /> {t.singleOffer}
            </div>
          )}

          {sortedOffers.map((offer, idx) => {
            const isBest = idx === 0 && showSpread && offer.unitPrice > 0
            const Comp = offer.url ? 'a' : 'div'
            const historyData = (() => {
              const real = extractHistory(offer.history)
              if (real.length >= 2) return real.slice(-5)
              if (offer.price > 0) return [offer.price]
              return [] as number[]
            })()

            const minH = historyData.length ? Math.min(...historyData) : 0
            const maxH = historyData.length ? Math.max(...historyData) : 1
            const range = maxH - minH || 1
            const displayPrice = convertUah(offer.price, currency, usdRate, eurRate)
            const displayUnit = convertUah(offer.unitPrice, currency, usdRate, eurRate)

            const offerSignals = computeOfferSignals(
              offer,
              group,
              avgUnitPrice,
              validOffersCount,
            )

            return (
              <Comp
                key={offer.source + '_' + offer.id}
                {...(offer.url
                  ? { href: offer.url, target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className={
                  'relative flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-0 transition-colors group/row ' +
                  (!isBest ? 'hover:bg-[var(--color-surface-2)]' : '') +
                  (offer.url ? ' cursor-pointer' : '')
                }
              >
                {isBest && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--color-accent)]" />
                )}

                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 pr-3">
                  <span
                    className={
                      'text-sm font-medium truncate ' +
                      (isBest ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)]')
                    }
                  >
                    {formatSourceName(offer.source)}
                  </span>

                  {offer.volumeLabel && (
                    <span className="text-[11px] text-[var(--color-muted)] font-mono border border-[var(--color-border)] px-1.5 py-0.5 bg-[var(--color-bg)] shrink-0">
                      {offer.volumeLabel}
                    </span>
                  )}

                  {offerSignals.slice(0, 2).map((s) => (
                    <span
                      key={s.kind}
                      className={
                        'text-[10px] uppercase tracking-wider font-semibold border px-1.5 py-0.5 shrink-0 ' +
                        signalClass(s.tone)
                      }
                    >
                      {s.label}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {historyData.length > 0 && (
                    <div className="flex items-end gap-[1px] h-4 w-8 opacity-60 grayscale group-hover/row:grayscale-0 transition-all">
                      {historyData.map((val, i) => {
                        const heightPct =
                          historyData.length === 1
                            ? 70
                            : Math.max(15, ((val - minH) / range) * 100)
                        const isLast = i === historyData.length - 1
                        const trendDown =
                          historyData.length >= 2 &&
                          historyData[historyData.length - 1] < historyData[0]
                        const barColor =
                          historyData.length < 2
                            ? 'bg-[var(--color-muted)]'
                            : isLast
                              ? trendDown
                                ? 'bg-[var(--color-success)]'
                                : 'bg-[var(--color-danger)]'
                              : 'bg-[var(--color-muted)] opacity-50'
                        return (
                          <div
                            key={i}
                            style={{ height: heightPct + '%' }}
                            className={'flex-1 ' + barColor}
                          />
                        )
                      })}
                    </div>
                  )}

                  <div className="flex flex-col items-end leading-tight text-right w-24">
                    <span
                      className={
                        'text-sm font-medium tabular-nums ' +
                        (isBest ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink)]')
                      }
                    >
                      {formatPrice(displayPrice, lang, currency)}
                    </span>
                    {offer.multiplier !== 1 && offer.unitPrice > 0 && (
                      <span className="text-[10px] text-[var(--color-muted)] font-mono tracking-tighter mt-1">
                        ≈{' '}
                        {currency === 'UAH'
                          ? Math.round(displayUnit)
                          : displayUnit.toFixed(2)}{' '}
                        / {offer.baseUnit}
                      </span>
                    )}
                  </div>
                </div>
              </Comp>
            )
          })}
        </div>

        {formattedDate && (
          <div className="px-5 py-2.5 bg-[var(--color-surface)] text-[10px] text-[var(--color-muted)] uppercase tracking-widest flex items-center justify-between border-t border-[var(--color-border)]">
            <span>{t.updatedAt}</span>
            <span className="font-mono">{formattedDate}</span>
          </div>
        )}
      </article>
    )
  },
  (prev, next) =>
    prev.group.key === next.group.key &&
    prev.group.latestUpdatedAt === next.group.latestUpdatedAt &&
    prev.group.offers.length === next.group.offers.length &&
    prev.lang === next.lang &&
    prev.isFavorite === next.isFavorite &&
    prev.currency === next.currency &&
    prev.usdRate === next.usdRate &&
    prev.eurRate === next.eurRate,
)

