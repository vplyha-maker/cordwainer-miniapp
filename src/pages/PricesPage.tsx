import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  ArrowLeft,
  Search,
  X,
  TrendingDown,
  Store,
  Tag,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react'
import type { Lang } from '../App'

type Product = {
  id: number
  name: string
  source: string | null
  product_code: string | null
  url: string | null
  image_url: string | null
  category: string | null
  updated_at: string | null
  current_price: number | string | null
}

type GroupedProduct = {
  key: string
  name: string
  product_code: string | null
  image_url: string | null
  category: string | null
  offers: {
    id: number
    source: string
    price: number
    url: string | null
  }[]
  minPrice: number
  maxPrice: number
  avgPrice: number
  maxSavings: number
}

type PricesPageProps = {
  onBack: () => void
  lang: Lang
}

type SortOption = 'default' | 'price-asc' | 'savings' | 'name'

const PAGE_SIZE = 3 // products per booklet page (mobile-friendly)

const DICTIONARY = {
  ru: {
    title: 'Аналитика цен',
    loading: 'Анализируем рынок…',
    error: 'Не удалось загрузить данные',
    retry: 'Повторить попытку',
    search: 'Поиск по артикулу или названию...',
    allSources: 'Все рынки',
    sortDefault: 'Популярные',
    sortPriceAsc: 'Дешевые',
    sortSavings: 'Макс. выгода',
    sortName: 'Алфавит',
    code: 'Артикул',
    bestPrice: 'ТОП Цена',
    suppliers: 'Анализ предложений:',
    goToStore: 'В магазин',
    marketSpread: 'Разброс цен',
    saveUpTo: 'Экономия до',
    statsTotal: 'Товаров проанализировано',
    statsAvgSpread: 'Средняя разница цен',
    pageOf: 'стр.',
    of: 'из',
    empty: 'Ничего не найдено',
    emptyHint: 'Попробуйте изменить фильтры или поиск',
    bookletHint: 'Листайте буклет',
  },
  uk: {
    title: 'Аналітика цін',
    loading: 'Аналізуємо ринок…',
    error: 'Не вдалося завантажити дані',
    retry: 'Повторити спробу',
    search: 'Пошук за артикулом або назвою...',
    allSources: 'Всі ринки',
    sortDefault: 'Популярні',
    sortPriceAsc: 'Дешевші',
    sortSavings: 'Макс. вигода',
    sortName: 'Алфавіт',
    code: 'Артикул',
    bestPrice: 'ТОП Ціна',
    suppliers: 'Аналіз пропозицій:',
    goToStore: 'В магазин',
    marketSpread: 'Розкид цін',
    saveUpTo: 'Економія до',
    statsTotal: 'Товарів проаналізовано',
    statsAvgSpread: 'Середня різниця цін',
    pageOf: 'стор.',
    of: 'з',
    empty: 'Нічого не знайдено',
    emptyHint: 'Спробуйте змінити фільтри або пошук',
    bookletHint: 'Гортайте буклет',
  },
}

const formatSourceName = (sourceId: string) => {
  const customNames: Record<string, string> = {
    zotti: 'Zotti',
    aligo: 'Aligo Group',
    bahtarma: 'Bahtarma',
  }
  return customNames[sourceId.toLowerCase()] || (sourceId.charAt(0).toUpperCase() + sourceId.slice(1))
}

/** 3D flip variants for booklet pages */
const pageVariants = {
  enter: (direction: number) => ({
    rotateY: direction > 0 ? 85 : -85,
    opacity: 0.15,
    scale: 0.92,
    zIndex: 0,
  }),
  center: {
    rotateY: 0,
    opacity: 1,
    scale: 1,
    zIndex: 1,
    transition: {
      rotateY: { type: 'spring', stiffness: 80, damping: 18 },
      opacity: { duration: 0.25 },
      scale: { duration: 0.3 },
    },
  },
  exit: (direction: number) => ({
    rotateY: direction < 0 ? 85 : -85,
    opacity: 0.15,
    scale: 0.92,
    zIndex: 0,
    transition: {
      rotateY: { type: 'spring', stiffness: 80, damping: 18 },
      opacity: { duration: 0.2 },
    },
  }),
}

export function PricesPage({ onBack, lang }: PricesPageProps) {
  const t = DICTIONARY[lang]

  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('default')

  // Booklet state
  const [pageIndex, setPageIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/prices')
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const sources = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.source).filter(Boolean) as string[])).sort()
  }, [items])

  const groupedItems = useMemo(() => {
    const map = new Map<string, GroupedProduct>()

    items.forEach((item) => {
      const priceNum = Number(item.current_price)
      if (isNaN(priceNum) || priceNum <= 0) return

      const cleanName = item.name
        .toLowerCase()
        .replace(/(\(.*?\)|\[.*?\])/g, '')
        .replace(/[^a-zа-яё0-9]/g, '')
      const groupingKey = item.product_code
        ? `code_${item.product_code.trim().toLowerCase()}`
        : `name_${cleanName.slice(0, 30)}`

      if (!map.has(groupingKey)) {
        map.set(groupingKey, {
          key: groupingKey,
          name: item.name,
          product_code: item.product_code,
          image_url: item.image_url,
          category: item.category,
          offers: [],
          minPrice: Infinity,
          maxPrice: -Infinity,
          avgPrice: 0,
          maxSavings: 0,
        })
      }

      const group = map.get(groupingKey)!
      if (!group.image_url && item.image_url) group.image_url = item.image_url

      if (!group.offers.find((o) => o.source === item.source)) {
        group.offers.push({
          id: item.id,
          source: item.source || 'unknown',
          price: priceNum,
          url: item.url,
        })
        if (priceNum < group.minPrice) group.minPrice = priceNum
        if (priceNum > group.maxPrice) group.maxPrice = priceNum
      }
    })

    let result = Array.from(map.values()).map((group) => {
      const sum = group.offers.reduce((acc, offer) => acc + offer.price, 0)
      group.avgPrice = sum / group.offers.length
      group.maxSavings = group.maxPrice - group.minPrice
      return group
    })

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.product_code && g.product_code.toLowerCase().includes(q))
      )
    }

    if (selectedSource !== 'all') {
      result = result.filter((g) => g.offers.some((o) => o.source === selectedSource))
    }

    result.sort((a, b) => {
      if (sortBy === 'price-asc') return a.minPrice - b.minPrice
      if (sortBy === 'savings') return b.maxSavings - a.maxSavings
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return b.offers.length - a.offers.length
    })

    return result
  }, [items, searchQuery, selectedSource, sortBy])

  // Paginate into booklet pages
  const pages = useMemo(() => {
    const chunks: GroupedProduct[][] = []
    for (let i = 0; i < groupedItems.length; i += PAGE_SIZE) {
      chunks.push(groupedItems.slice(i, i + PAGE_SIZE))
    }
    return chunks
  }, [groupedItems])

  const totalPages = pages.length
  const safePageIndex = Math.min(pageIndex, Math.max(0, totalPages - 1))

  // Reset to first page when filters/search change
  useEffect(() => {
    setPageIndex(0)
    setDirection(0)
  }, [searchQuery, selectedSource, sortBy])

  const goToPage = useCallback(
    (next: number) => {
      if (next < 0 || next >= totalPages) return
      setDirection(next > pageIndex ? 1 : -1)
      setPageIndex(next)
    },
    [pageIndex, totalPages]
  )

  const globalStats = useMemo(() => {
    if (groupedItems.length === 0) return null
    const multiOfferItems = groupedItems.filter((g) => g.offers.length > 1)
    const avgSpread = multiOfferItems.length
      ? multiOfferItems.reduce((acc, g) => acc + (g.maxSavings / g.minPrice) * 100, 0) /
        multiOfferItems.length
      : 0
    return {
      total: groupedItems.length,
      avgSpreadPercent: avgSpread.toFixed(1),
    }
  }, [groupedItems])

  const formatPrice = (val: number) =>
    new Intl.NumberFormat(lang === 'uk' ? 'uk-UA' : 'ru-RU', {
      style: 'currency',
      currency: 'UAH',
      maximumFractionDigits: 0,
    }).format(val)

  // ---------- Render helpers ----------

  const renderProductCard = (group: GroupedProduct, index: number) => {
    const sortedOffers = [...group.offers].sort((a, b) => a.price - b.price)
    const chartData = sortedOffers.map((o) => ({
      name: formatSourceName(o.source),
      price: o.price,
      isBest: o.price === group.minPrice,
    }))

    return (
      <motion.div
        key={group.key}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 }}
        className="rounded-2xl p-4 bg-[#1A1614] border border-white/5 hover:border-white/10 transition-colors flex flex-col gap-4 relative overflow-hidden"
      >
        {group.maxSavings > 500 && (
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#E4D00A]/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        )}

        <div className="flex gap-3 items-start relative z-10">
          {group.image_url ? (
            <img
              src={group.image_url}
              alt={group.name}
              className="w-[72px] h-[72px] rounded-xl object-cover bg-[#25201C] shrink-0 border border-white/5"
            />
          ) : (
            <div className="w-[72px] h-[72px] rounded-xl bg-[#25201C] shrink-0 flex items-center justify-center text-white/10">
              <Tag size={22} />
            </div>
          )}

          <div className="flex-1 min-w-0 pt-0.5 space-y-1.5">
            <h3 className="text-[14px] font-medium leading-snug text-white line-clamp-2">
              {group.name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {group.product_code && (
                <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono text-[#B9ACA0] uppercase tracking-wider">
                  {t.code} {group.product_code}
                </span>
              )}
              {group.offers.length > 1 && group.maxSavings > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#E4D00A]/20 text-[#E4D00A] text-[10px] font-bold">
                  {t.saveUpTo} {formatPrice(group.maxSavings)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Market spread chart */}
        {group.offers.length > 1 && (
          <div className="h-[72px] w-full relative z-10 bg-[#25201C]/50 rounded-xl p-2.5 border border-white/5">
            <span className="absolute top-1.5 left-2.5 text-[9px] font-semibold text-[#B9ACA0]">
              {t.marketSpread}
            </span>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 0, left: 0, bottom: 0 }}>
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#12100E] border border-white/10 p-2 rounded-lg shadow-xl text-xs">
                          <span className="block font-semibold mb-0.5 text-white">
                            {payload[0].payload.name}
                          </span>
                          <span className="text-[#E4D00A]">
                            {formatPrice(payload[0].value as number)}
                          </span>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="price" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {chartData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.isBest ? '#E4D00A' : '#3A332C'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Offers list */}
        <div className="flex flex-col gap-1.5 relative z-10">
          {sortedOffers.map((offer, idx) => {
            const isBest = idx === 0 && group.offers.length > 1
            const Element = offer.url ? 'a' : 'div'

            return (
              <Element
                key={offer.id}
                {...(offer.url
                  ? { href: offer.url, target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                  isBest
                    ? 'bg-[#E4D00A]/10 border border-[#E4D00A]/30'
                    : 'bg-[#25201C] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-white">
                    {formatSourceName(offer.source)}
                  </span>
                  {isBest && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E4D00A] text-black font-bold uppercase tracking-wider">
                      {t.bestPrice}
                    </span>
                  )}
                </div>
                <div
                  className={`text-[14px] font-bold ${isBest ? 'text-[#E4D00A]' : 'text-white'}`}
                >
                  {formatPrice(offer.price)}
                </div>
              </Element>
            )
          })}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex flex-col h-[100dvh] bg-[#12100E] text-[#F5F1EA] overflow-hidden font-sans"
    >
      {/* ========== HEADER ========== */}
      <div className="shrink-0 flex flex-col z-20 bg-[#1A1614]/90 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-2">
                <BookOpen size={18} className="text-[#E4D00A]" />
                {t.title}
              </h1>
              {globalStats && (
                <span className="text-[11px] text-[#B9ACA0] flex items-center gap-1 mt-0.5">
                  <TrendingDown size={11} className="text-[#E4D00A]" />
                  {t.statsAvgSpread}: {globalStats.avgSpreadPercent}% · {globalStats.total}{' '}
                  {t.statsTotal.toLowerCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        {!loading && !error && (
          <div className="px-4 pb-3 space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B9ACA0] group-focus-within:text-[#E4D00A] transition-colors"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.search}
                  className="w-full h-11 pl-9 pr-9 rounded-xl bg-[#25201C] border border-white/5 focus:border-[#E4D00A]/50 outline-none text-sm transition-all text-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#B9ACA0] hover:text-white"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-11 px-3 rounded-xl text-sm font-medium bg-[#25201C] border border-white/5 focus:border-[#E4D00A]/50 outline-none cursor-pointer text-white max-w-[130px]"
              >
                <option value="default">{t.sortDefault}</option>
                <option value="savings">{t.sortSavings}</option>
                <option value="price-asc">{t.sortPriceAsc}</option>
                <option value="name">{t.sortName}</option>
              </select>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5 -mx-4 px-4">
              <button
                onClick={() => setSelectedSource('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                  selectedSource === 'all'
                    ? 'bg-[#E4D00A] text-black'
                    : 'bg-white/5 text-[#B9ACA0] hover:bg-white/10'
                }`}
              >
                {t.allSources}
              </button>
              {sources.map((src) => (
                <button
                  key={src}
                  onClick={() => setSelectedSource(src)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                    selectedSource === src
                      ? 'bg-[#E4D00A] text-black'
                      : 'bg-white/5 text-[#B9ACA0] hover:bg-white/10'
                  }`}
                >
                  <Store size={11} /> {formatSourceName(src)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========== BOOKLET VIEWPORT ========== */}
      <div className="flex-1 relative overflow-hidden" style={{ perspective: 1400 }}>
        {loading && (
          <div className="absolute inset-0 flex flex-col gap-4 px-4 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[200px] rounded-2xl bg-[#1A1614] border border-white/5 p-4 animate-pulse flex flex-col gap-3"
              >
                <div className="flex gap-3">
                  <div className="w-[72px] h-[72px] bg-white/5 rounded-xl" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3.5 bg-white/5 rounded w-3/4" />
                    <div className="h-3.5 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-16 bg-white/5 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-[#B9ACA0] text-sm">{error}</p>
            <button
              onClick={load}
              className="px-5 py-2.5 rounded-xl bg-[#E4D00A] text-black text-sm font-semibold"
            >
              {t.retry}
            </button>
          </div>
        )}

        {!loading && !error && totalPages === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <Tag size={32} className="text-white/15 mb-2" />
            <p className="text-white font-medium">{t.empty}</p>
            <p className="text-[#B9ACA0] text-sm">{t.emptyHint}</p>
          </div>
        )}

        {!loading && !error && totalPages > 0 && (
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={safePageIndex}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 px-4 py-3 overflow-y-auto no-scrollbar"
              style={{
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
              }}
            >
              {/* Subtle paper-edge decoration */}
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E4D00A]/20 to-transparent" />

              <div className="space-y-3 pb-20">
                {pages[safePageIndex]?.map((group, idx) => renderProductCard(group, idx))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ========== BOOKLET CONTROLS (bottom) ========== */}
      {!loading && !error && totalPages > 0 && (
        <div className="shrink-0 z-30 border-t border-white/5 bg-[#1A1614]/95 backdrop-blur-xl">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            {/* Prev */}
            <button
              onClick={() => goToPage(safePageIndex - 1)}
              disabled={safePageIndex <= 0}
              className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 flex items-center justify-center transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={22} />
            </button>

            {/* Page indicators */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-1.5 max-w-full overflow-hidden">
                {totalPages <= 9 ? (
                  // Dots for few pages
                  pages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToPage(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === safePageIndex
                          ? 'w-5 bg-[#E4D00A]'
                          : 'w-1.5 bg-white/20 hover:bg-white/40'
                      }`}
                      aria-label={`Page ${i + 1}`}
                    />
                  ))
                ) : (
                  // Compact number for many pages
                  <span className="text-xs font-medium text-[#B9ACA0] tabular-nums">
                    {t.pageOf} {safePageIndex + 1} {t.of} {totalPages}
                  </span>
                )}
              </div>
              {totalPages > 1 && (
                <span className="text-[10px] text-white/30 flex items-center gap-1">
                  <BookOpen size={10} />
                  {t.bookletHint}
                </span>
              )}
            </div>

            {/* Next */}
            <button
              onClick={() => goToPage(safePageIndex + 1)}
              disabled={safePageIndex >= totalPages - 1}
              className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 flex items-center justify-center transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {/* Optional progress bar */}
          {totalPages > 1 && (
            <div className="h-0.5 bg-white/5">
              <motion.div
                className="h-full bg-[#E4D00A]/60"
                initial={false}
                animate={{
                  width: `${((safePageIndex + 1) / totalPages) * 100}%`,
                }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
 }
