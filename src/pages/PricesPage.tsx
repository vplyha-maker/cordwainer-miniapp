import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ArrowLeft, Search, X, TrendingDown, Info, Store, Tag } from 'lucide-react'
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
  maxSavings: number // Выгода (разница между самой дорогой и дешевой)
}

type PricesPageProps = {
  onBack: () => void
  lang: Lang
}

type SortOption = 'default' | 'price-asc' | 'savings' | 'name'

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

export function PricesPage({ onBack, lang }: PricesPageProps) {
  const t = DICTIONARY[lang]

  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('default')

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

  useEffect(() => { load() }, [])

  const sources = useMemo(() => {
    return Array.from(new Set(items.map(i => i.source).filter(Boolean) as string[])).sort()
  }, [items])

  const groupedItems = useMemo(() => {
    const map = new Map<string, GroupedProduct>()

    items.forEach(item => {
      const priceNum = Number(item.current_price)
      if (isNaN(priceNum) || priceNum <= 0) return

      const cleanName = item.name.toLowerCase().replace(/(\(.*?\)|\[.*?\])/g, '').replace(/[^a-zа-яё0-9]/g, '')
      const groupingKey = item.product_code ? `code_${item.product_code.trim().toLowerCase()}` : `name_${cleanName.slice(0, 30)}`

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
          maxSavings: 0
        })
      }

      const group = map.get(groupingKey)!
      if (!group.image_url && item.image_url) group.image_url = item.image_url

      if (!group.offers.find(o => o.source === item.source)) {
        group.offers.push({ id: item.id, source: item.source || 'unknown', price: priceNum, url: item.url })
        if (priceNum < group.minPrice) group.minPrice = priceNum
        if (priceNum > group.maxPrice) group.maxPrice = priceNum
      }
    })

    let result = Array.from(map.values()).map(group => {
      // Подсчет аналитики для группы
      const sum = group.offers.reduce((acc, offer) => acc + offer.price, 0)
      group.avgPrice = sum / group.offers.length
      group.maxSavings = group.maxPrice - group.minPrice
      return group
    })

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(g => g.name.toLowerCase().includes(q) || (g.product_code && g.product_code.toLowerCase().includes(q)))
    }

    if (selectedSource !== 'all') {
      result = result.filter(g => g.offers.some(o => o.source === selectedSource))
    }

    result.sort((a, b) => {
      if (sortBy === 'price-asc') return a.minPrice - b.minPrice
      if (sortBy === 'savings') return b.maxSavings - a.maxSavings
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return b.offers.length - a.offers.length
    })

    return result
  }, [items, searchQuery, selectedSource, sortBy])

  // Глобальная статистика рынка (Дашборд)
  const globalStats = useMemo(() => {
    if (groupedItems.length === 0) return null
    const multiOfferItems = groupedItems.filter(g => g.offers.length > 1)
    const avgSpread = multiOfferItems.length 
      ? multiOfferItems.reduce((acc, g) => acc + (g.maxSavings / g.minPrice * 100), 0) / multiOfferItems.length 
      : 0
    return {
      total: groupedItems.length,
      avgSpreadPercent: avgSpread.toFixed(1)
    }
  }, [groupedItems])

  const formatPrice = (val: number) => 
    new Intl.NumberFormat(lang === 'uk' ? 'uk-UA' : 'ru-RU', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(val)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="relative flex flex-col h-[100dvh] bg-[#12100E] text-[#F5F1EA] overflow-hidden font-sans"
    >
      {/* HEADER SECTION (GLASSMORPHISM) */}
      <div className="shrink-0 flex flex-col z-20 bg-[#1A1614]/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                {t.title}
              </h1>
              {globalStats && (
                <span className="text-xs text-[#B9ACA0] flex items-center gap-1 mt-0.5">
                  <TrendingDown size={12} className="text-[#E4D00A]" /> 
                  {t.statsAvgSpread}: {globalStats.avgSpreadPercent}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* FILTERS */}
        {!loading && !error && (
          <div className="px-4 pb-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B9ACA0] group-focus-within:text-[#E4D00A] transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.search}
                  className="w-full h-12 pl-10 pr-10 rounded-xl bg-[#25201C] border border-white/5 focus:border-[#E4D00A]/50 outline-none text-sm transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#B9ACA0] hover:text-white">
                    <X size={16} />
                  </button>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-12 px-4 rounded-xl text-sm font-medium bg-[#25201C] border border-white/5 focus:border-[#E4D00A]/50 outline-none cursor-pointer"
              >
                <option value="default">{t.sortDefault}</option>
                <option value="savings">{t.sortSavings}</option>
                <option value="price-asc">{t.sortPriceAsc}</option>
                <option value="name">{t.sortName}</option>
              </select>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
              <button
                onClick={() => setSelectedSource('all')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                  selectedSource === 'all' ? 'bg-[#E4D00A] text-black' : 'bg-white/5 text-[#B9ACA0] hover:bg-white/10'
                }`}
              >
                {t.allSources}
              </button>
              {sources.map(src => (
                <button
                  key={src}
                  onClick={() => setSelectedSource(src)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                    selectedSource === src ? 'bg-[#E4D00A] text-black' : 'bg-white/5 text-[#B9ACA0] hover:bg-white/10'
                  }`}
                >
                  <Store size={12} /> {formatSourceName(src)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CONTENT LIST */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
        {loading && (
          // SKELETON LOADER
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[220px] rounded-2xl bg-[#1A1614] border border-white/5 p-4 animate-pulse flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="w-[80px] h-[80px] bg-white/5 rounded-xl"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-white/5 rounded w-3/4"></div>
                  <div className="h-4 bg-white/5 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-20 bg-white/5 rounded-xl"></div>
            </div>
          ))
        )}

        {!loading && groupedItems.map((group, index) => {
          const sortedOffers = [...group.offers].sort((a, b) => a.price - b.price)
          const chartData = sortedOffers.map(o => ({
            name: formatSourceName(o.source),
            price: o.price,
            isBest: o.price === group.minPrice
          }))

          return (
            <motion.div
              key={group.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl p-5 bg-[#1A1614] border border-white/5 hover:border-white/10 transition-colors flex flex-col gap-5 relative overflow-hidden"
            >
              {/* Highlight Glow for high savings */}
              {group.maxSavings > 500 && (
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[#E4D00A]/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              )}

              {/* Product Info */}
              <div className="flex gap-4 items-start relative z-10">
                {group.image_url ? (
                  <img src={group.image_url} alt={group.name} className="w-20 h-20 rounded-xl object-cover bg-[#25201C] shrink-0 border border-white/5" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-[#25201C] shrink-0 flex items-center justify-center text-white/10">
                    <Tag size={24} />
                  </div>
                )}
                
                <div className="flex-1 min-w-0 pt-1 space-y-2">
                  <h3 className="text-[15px] font-medium leading-snug text-white line-clamp-2">
                    {group.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {group.product_code && (
                      <span className="px-2 py-1 rounded bg-white/5 text-[10px] font-mono text-[#B9ACA0] uppercase tracking-wider">
                        {t.code} {group.product_code}
                      </span>
                    )}
                    {group.offers.length > 1 && group.maxSavings > 0 && (
                      <span className="px-2 py-1 rounded bg-[#E4D00A]/20 text-[#E4D00A] text-[10px] font-bold">
                        {t.saveUpTo} {formatPrice(group.maxSavings)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Analytics Graph (Recharts) */}
              {group.offers.length > 1 && (
                <div className="h-[80px] w-full mt-2 relative z-10 bg-[#25201C]/50 rounded-xl p-3 border border-white/5">
                  <span className="absolute top-2 left-3 text-[10px] font-semibold text-[#B9ACA0]">{t.marketSpread}</span>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 15, right: 0, left: 0, bottom: 0 }}>
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-[#12100E] border border-white/10 p-2 rounded-lg shadow-xl text-xs">
                                <span className="block font-semibold mb-1">{payload[0].payload.name}</span>
                                <span className="text-[#E4D00A]">{formatPrice(payload[0].value as number)}</span>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="price" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.isBest ? '#E4D00A' : '#3A332C'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Offer List */}
              <div className="flex flex-col gap-2 relative z-10">
                {sortedOffers.map((offer, idx) => {
                  const isBest = idx === 0 && group.offers.length > 1
                  const Element = offer.url ? 'a' : 'div'
                  
                  return (
                    <Element
                      key={offer.id}
                      {...(offer.url ? { href: offer.url, target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        isBest ? 'bg-[#E4D00A]/10 border border-[#E4D00A]/30' : 'bg-[#25201C] border border-transparent'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
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
                      </div>
                      <div className={`text-[15px] font-bold ${isBest ? 'text-[#E4D00A]' : 'text-white'}`}>
                        {formatPrice(offer.price)}
                      </div>
                    </Element>
                  )
                })}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
