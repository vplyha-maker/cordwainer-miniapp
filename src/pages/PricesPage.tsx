import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
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

const PAGE_SIZE = 3

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
    marketSpread: 'Разброс цен',
    saveUpTo: 'Экономия до',
    statsTotal: 'товаров',
    statsAvgSpread: 'Средняя разница',
    pageOf: 'стр.',
    of: 'из',
    empty: 'Ничего не найдено',
    emptyHint: 'Измените фильтры или поиск',
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
    marketSpread: 'Розкид цін',
    saveUpTo: 'Економія до',
    statsTotal: 'товарів',
    statsAvgSpread: 'Середня різниця',
    pageOf: 'стор.',
    of: 'з',
    empty: 'Нічого не знайдено',
    emptyHint: 'Змініть фільтри або пошук',
    bookletHint: 'Гортайте буклет',
  },
}

const formatSourceName = (sourceId: string) => {
  const customNames: Record<string, string> = {
    zotti: 'Zotti',
    aligo: 'Aligo Group',
    bahtarma: 'Bahtarma',
    bashmachnik: 'Башмачник',
  }
  return (
    customNames[sourceId.toLowerCase()] ||
    sourceId.charAt(0).toUpperCase() + sourceId.slice(1)
  )
}

export function PricesPage({ onBack, lang }: PricesPageProps) {
  const t = DICTIONARY[lang]

  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('default')
  const [pageIndex, setPageIndex] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/prices')
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setError(t.error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [t.error])

  useEffect(() => {
    load()
  }, [load])

  const sources = useMemo(() => {
    return Array.from(
      new Set(items.map((i) => i.source).filter(Boolean) as string[])
    ).sort()
  }, [items])

  const groupedItems = useMemo(() => {
    const map = new Map<string, GroupedProduct>()

    items.forEach((item) => {
      const priceNum = Number(item.current_price)
      if (isNaN(priceNum) || priceNum <= 0) return

      const cleanName = item.name
        .toLowerCase()
        .replace(/(\(.*?\)|\[.*?\])/g, '')
        .replace(/[^a-zа-яёіїєґ0-9]/g, '')
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
      const sum = group.offers.reduce((acc, o) => acc + o.price, 0)
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
      result = result.filter((g) =>
        g.offers.some((o) => o.source === selectedSource)
      )
    }

    result.sort((a, b) => {
      if (sortBy === 'price-asc') return a.minPrice - b.minPrice
      if (sortBy === 'savings') return b.maxSavings - a.maxSavings
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return b.offers.length - a.offers.length
    })

    return result
  }, [items, searchQuery, selectedSource, sortBy])

  const pages = useMemo(() => {
    const chunks: GroupedProduct[][] = []
    for (let i = 0; i < groupedItems.length; i += PAGE_SIZE) {
      chunks.push(groupedItems.slice(i, i + PAGE_SIZE))
    }
    return chunks
  }, [groupedItems])

  const totalPages = pages.length
  const safePage = Math.min(pageIndex, Math.max(0, totalPages - 1))

  // Сброс страницы при смене фильтров
  useEffect(() => {
    setPageIndex(0)
  }, [searchQuery, selectedSource, sortBy])

  const goToPage = (next: number) => {
    if (next < 0 || next >= totalPages) return
    setPageIndex(next)
  }

  const globalStats = useMemo(() => {
    if (groupedItems.length === 0) return null
    const multi = groupedItems.filter((g) => g.offers.length > 1)
    const avgSpread = multi.length
      ? multi.reduce((acc, g) => acc + (g.maxSavings / g.minPrice) * 100, 0) /
        multi.length
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

  // ---------- Карточка товара (без transform-анимаций) ----------
  const renderCard = (group: GroupedProduct) => {
    const sortedOffers = [...group.offers].sort((a, b) => a.price - b.price)
    const chartData = sortedOffers.map((o) => ({
      name: formatSourceName(o.source),
      price: o.price,
      isBest: o.price === group.minPrice,
    }))

    return (
      <div
        key={group.key}
        className="rounded-2xl p-4 bg-[#1A1614] border border-white/5 flex flex-col gap-3 relative overflow-hidden"
      >
        {group.maxSavings > 500 && (
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#E4D00A]/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        )}

        <div className="flex gap-3 items-start relative z-10">
          {group.image_url ? (
            <img
              src={group.image_url}
              alt=""
              className="w-[68px] h-[68px] rounded-xl object-cover bg-[#25201C] shrink-0 border border-white/5"
              loading="lazy"
            />
          ) : (
            <div className="w-[68px] h-[68px] rounded-xl bg-[#25201C] shrink-0 flex items-center justify-center text-white/15">
              <Tag size={20} />
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-1.5">
            <h3 className="text-[14px] font-medium leading-snug text-white line-clamp-2">
              {group.name}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {group.product_code && (
                <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono text-[#B9ACA0] uppercase">
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

        {/* График — родитель без transform */}
        {group.offers.length > 1 && (
          <div className="h-[70px] w-full relative z-10 bg-[#25201C]/60 rounded-xl p-2 border border-white/5">
            <span className="absolute top-1.5 left-2 text-[9px] font-semibold text-[#B9ACA0]">
              {t.marketSpread}
            </span>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 14, right: 0, left: 0, bottom: 0 }}>
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-[#12100E] border border-white/10 px-2 py-1.5 rounded-lg text-xs shadow-lg">
                        <div className="font-semibold text-white mb-0.5">
                          {payload[0].payload.name}
                        </div>
                        <div className="text-[#E4D00A]">
                          {formatPrice(payload[0].value as number)}
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="price" radius={[3, 3, 0, 0]} maxBarSize={34}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isBest ? '#E4D00A' : '#3A332C'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex flex-col gap-1.5 relative z-10">
          {sortedOffers.map((offer, idx) => {
            const isBest = idx === 0 && group.offers.length > 1
            const Comp = offer.url ? 'a' : 'div'
            return (
              <Comp
                key={offer.id}
                {...(offer.url
                  ? { href: offer.url, target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                  isBest
                    ? 'bg-[#E4D00A]/10 border border-[#E4D00A]/30'
                    : 'bg-[#25201C] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] font-semibold text-white truncate">
                    {formatSourceName(offer.source)}
                  </span>
                  {isBest && (
                    <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-[#E4D00A] text-black font-bold uppercase">
                      {t.bestPrice}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[14px] font-bold tabular-nums ${
                    isBest ? 'text-[#E4D00A]' : 'text-white'
                  }`}
                >
                  {formatPrice(offer.price)}
                </span>
              </Comp>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="relative flex flex-col h-[100dvh] bg-[#12100E] text-[#F5F1EA] overflow-hidden font-sans"
    >
      {/* HEADER */}
      <div className="shrink-0 z-20 bg-[#1A1614]/95 backdrop-blur-md border-b border-white/5">
        <div className="px-4 pt-5 pb-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <BookOpen size={17} className="text-[#E4D00A] shrink-0" />
              <span className="truncate">{t.title}</span>
            </h1>
            {globalStats && (
              <p className="text-[11px] text-[#B9ACA0] flex items-center gap-1 mt-0.5">
                <TrendingDown size={11} className="text-[#E4D00A]" />
                {t.statsAvgSpread}: {globalStats.avgSpreadPercent}% ·{' '}
                {globalStats.total} {t.statsTotal}
              </p>
            )}
          </div>
        </div>

        {!loading && !error && (
          <div className="px-4 pb-3 space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B9ACA0]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.search}
                  className="w-full h-11 pl-9 pr-9 rounded-xl bg-[#25201C] border border-white/5 focus:border-[#E4D00A]/40 outline-none text-sm text-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#B9ACA0]"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-11 px-3 rounded-xl text-sm bg-[#25201C] border border-white/5 outline-none text-white max-w-[128px]"
              >
                <option value="default">{t.sortDefault}</option>
                <option value="savings">{t.sortSavings}</option>
                <option value="price-asc">{t.sortPriceAsc}</option>
                <option value="name">{t.sortName}</option>
              </select>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
              <button
                onClick={() => setSelectedSource('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${
                  selectedSource === 'all'
                    ? 'bg-[#E4D00A] text-black'
                    : 'bg-white/5 text-[#B9ACA0]'
                }`}
              >
                {t.allSources}
              </button>
              {sources.map((src) => (
                <button
                  key={src}
                  onClick={() => setSelectedSource(src)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 ${
                    selectedSource === src
                      ? 'bg-[#E4D00A] text-black'
                      : 'bg-white/5 text-[#B9ACA0]'
                  }`}
                >
                  <Store size={11} />
                  {formatSourceName(src)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CONTENT — обычный скролл, без transform */}
      <div className="flex-1 overflow-y-auto px-4 py-3 no-scrollbar">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[190px] rounded-2xl bg-[#1A1614] border border-white/5 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
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
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Tag size={28} className="text-white/15 mb-1" />
            <p className="font-medium">{t.empty}</p>
            <p className="text-sm text-[#B9ACA0]">{t.emptyHint}</p>
          </div>
        )}

        {!loading && !error && totalPages > 0 && (
          <div className="space-y-3 pb-4">
            {pages[safePage]?.map((g) => renderCard(g))}
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS — буклет */}
      {!loading && !error && totalPages > 0 && (
        <div className="shrink-0 border-t border-white/5 bg-[#1A1614]/95 backdrop-blur-md">
          <div className="px-4 py-2.5 flex items-center justify-between gap-3">
            <button
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 0}
              className="w-11 h-11 rounded-xl bg-white/5 disabled:opacity-25 flex items-center justify-center"
            >
              <ChevronLeft size={22} />
            </button>

            <div className="flex-1 flex flex-col items-center gap-1">
              {totalPages <= 10 ? (
                <div className="flex items-center gap-1.5">
                  {pages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToPage(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === safePage
                          ? 'w-5 bg-[#E4D00A]'
                          : 'w-1.5 bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <span className="text-xs text-[#B9ACA0] tabular-nums">
                  {t.pageOf} {safePage + 1} {t.of} {totalPages}
                </span>
              )}
              <span className="text-[10px] text-white/25 flex items-center gap-1">
                <BookOpen size={10} />
                {t.bookletHint}
              </span>
            </div>

            <button
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages - 1}
              className="w-11 h-11 rounded-xl bg-white/5 disabled:opacity-25 flex items-center justify-center"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {totalPages > 1 && (
            <div className="h-0.5 bg-white/5">
              <div
                className="h-full bg-[#E4D00A]/70 transition-all duration-300"
                style={{
                  width: `${((safePage + 1) / totalPages) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
 }
