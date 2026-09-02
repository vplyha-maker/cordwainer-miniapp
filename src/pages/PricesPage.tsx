import { useEffect, useState, useMemo, useCallback, useDeferredValue, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Search,
  X,
  Store,
  Tag,
  BookOpen,
  ChevronDown,
  Clock,
  Bookmark,
  TrendingDown
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

type Offer = {
  id: number
  source: string
  price: number // Исходная цена
  unitPrice: number // Цена за 1 кг / 1 л / 1 шт
  baseUnit: 'кг' | 'л' | 'шт'
  volumeLabel: string // Исходная этикетка объема (например "15 кг")
  url: string | null
  updated_at: string | null
}

type GroupedProduct = {
  key: string
  name: string
  product_code: string | null
  image_url: string | null
  category: string | null
  offers: Offer[]
  minUnitPrice: number
  maxUnitPrice: number
  unitSpread: number // В процентах разница удельой цены
  latestUpdatedAt: string | null
  outOfStockCount: number
  totalOffers: number
}

type PricesPageProps = {
  onBack: () => void
  lang: Lang
}

type SortOption = 'default' | 'unit-price-asc' | 'savings' | 'name'

const PAGE_SIZE = 15

const DICTIONARY = {
  ru: {
    title: 'Аналитика цен',
    loading: 'Анализируем рынок…',
    error: 'Не удалось загрузить данные',
    retry: 'Повторить попытку',
    search: 'Поиск по артикулу или названию...',
    allSources: 'Все рынки',
    favorites: 'Отслеживаемые',
    sortDefault: 'Популярные',
    sortUnitPriceAsc: 'Выгодные (за кг/л)',
    sortSavings: 'Макс. разница',
    sortName: 'Алфавит',
    code: 'Арт.',
    bestPrice: 'ТОП Цена',
    saveUpTo: 'Разница',
    statsTotal: 'товаров',
    statsAvgSpread: 'Средняя разница',
    empty: 'Ничего не найдено',
    emptyHint: 'Измените фильтры или поиск',
    noPrice: 'Нет в наличии',
    singleOffer: 'Товар найден только в одном магазине',
    loadMore: 'Показать еще',
    updatedAt: 'Обновлено',
    priceLag: '⚡ Задержка прайса',
    deficit: '⚠️ Риск дефицита',
    priceRise: '📈 Ожидается рост цены',
    urgentBuy: '🔥 Срочный выкуп',
    perUnit: 'за',
  },
  uk: {
    title: 'Аналітика цін',
    loading: 'Аналізуємо ринок…',
    error: 'Не вдалося завантажити дані',
    retry: 'Повторити спробу',
    search: 'Пошук за артикулом або назвою...',
    allSources: 'Всі ринки',
    favorites: 'Відстежувані',
    sortDefault: 'Популярні',
    sortUnitPriceAsc: 'Вигідні (за кг/л)',
    sortSavings: 'Макс. різниця',
    sortName: 'Алфавіт',
    code: 'Арт.',
    bestPrice: 'ТОП Ціна',
    saveUpTo: 'Різниця',
    statsTotal: 'товарів',
    statsAvgSpread: 'Середня різниця',
    empty: 'Нічого не знайдено',
    emptyHint: 'Змініть фільтри або пошук',
    noPrice: 'Немає в наявності',
    singleOffer: 'Товар знайдено лише в одному магазині',
    loadMore: 'Показати ще',
    updatedAt: 'Оновлено',
    priceLag: '⚡ Затримка прайсу',
    deficit: '⚠️ Ризик дефіциту',
    priceRise: '📈 Очікується зростання ціни',
    urgentBuy: '🔥 Терміновий викуп',
    perUnit: 'за',
  },
}

const formatSourceName = (sourceId: string) => {
  if (!sourceId) return 'Неизвестно'
  const customNames: Record<string, string> = {
    zotti: 'Zotti',
    aligo: 'Aligo Group',
    bahtarma: 'Bahtarma',
    bashmachnik: 'Башмачник',
    masterok: 'Masterok',
  }
  return customNames[sourceId.toLowerCase()] || sourceId.charAt(0).toUpperCase() + sourceId.slice(1)
}

const formatDate = (dateStr: string | null, lang: Lang) => {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat(lang === 'uk' ? 'uk-UA' : 'ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(d)
}

const BRAND_ALIASES: Array<[RegExp, string]> = [
  [/\bнайр[іи]т\b/gi, 'nairit'],
  [/\bдесмокол\b/gi, 'desmokol'],
  [/\bdismakol\b/gi, 'desmokol'],
  [/\bбон[іи]кол\b/gi, 'bonikol'],
  [/\bзатверджувач\b/gi, 'hardener'],
  [/\bотвердитель\b/gi, 'hardener'],
  [/\bмультиф[іи]кс\b/gi, 'sarmultifix'],
  [/\bпротрава\b/gi, 'preparatore'],
  [/\bслоник\b/gi, 'solution'],
]

// Универсальный парсер объемов для приведения к цене за 1 кг / 1 л
function getVolumeData(raw: string): { baseUnit: 'кг' | 'л' | 'шт'; originalLabel: string; multiplier: number } {
  if (!raw) return { baseUnit: 'шт', originalLabel: '', multiplier: 1 }
  const s = raw.toLowerCase().replace(/,/g, '.').replace(/\u00a0/g, ' ')
  const m = s.match(/(\d+(?:\.\d+)?)\s*(кг|kg|г|гр|g|л|l|літр[а-я]*|литр[а-я]*|мл|ml)\b/i)
  if (!m) return { baseUnit: 'шт', originalLabel: '', multiplier: 1 }

  const num = parseFloat(m[1])
  if (num === 0 || isNaN(num)) return { baseUnit: 'шт', originalLabel: '', multiplier: 1 }

  const u = m[2].toLowerCase()
  if (u.startsWith('л') || u === 'l') return { baseUnit: 'л', originalLabel: `${num} л`, multiplier: 1 / num }
  if (u.startsWith('м') || u === 'ml') return { baseUnit: 'л', originalLabel: `${num} мл`, multiplier: 1000 / num }
  if (['кг', 'kg'].includes(u)) return { baseUnit: 'кг', originalLabel: `${num} кг`, multiplier: 1 / num }
  return { baseUnit: 'кг', originalLabel: `${num} г`, multiplier: 1000 / num }
}

// Жесткая очистка названий от "мусорных" слов для объединения 1кг и 15кг в одну группу
function normalizeProductName(raw: string): string {
  if (!raw) return ''
  let s = raw.toLowerCase().replace(/ё/g, 'е').replace(/['"`«»„“()[\]{}_/\\|–—−]/g, ' ')
  
  const stopWords = [
    'клей', 'взуттєвий', 'обувной', 'банка', 'італія', 'италия', 'чорний', 'черный', 
    'світлий', 'светлый', 'білий', 'белый', 'універсальний', 'универсальный', 'для', 
    'ремонту', 'шкіряного', 'взуття', 'пінополіуретану', 'тканини', 'кг', 'л', 'мл', 'г', 'гр', 'литр', 'шт'
  ]

  for (const [re, rep] of BRAND_ALIASES) s = s.replace(re, ` ${rep} `)
  
  // Вырезаем объемы, чтобы SAR 306 1кг и SAR 306 15кг стали просто SAR 306
  s = s.replace(/\b\d+([.,]\d+)?\s*(кг|kg|г|гр|g|л|l|літр\w*|литр\w*|мл|ml)\b/gi, ' ')
  
  const words = s.split(/\s+/).filter(w => w.length > 1 && !stopWords.includes(w))
  // Сортируем слова по алфавиту, чтобы порядок не влиял на группировку
  return Array.from(new Set(words)).sort().join(' ')
}

function makeGroupingKey(item: Product): string {
  const code = item.product_code?.trim()?.toLowerCase()
  if (code && code.length >= 2) return `code_${code}`

  const base = normalizeProductName(item.name)
  if (base.length >= 4) return `name_${base}`

  return `raw_${(item.name || '').toLowerCase().replace(/[^a-z0-9]/gi, '').slice(0, 30) || item.id}`
}

const formatPrice = (val: number, lang: Lang) => {
  if (!val || val <= 0) return DICTIONARY[lang].noPrice
  return new Intl.NumberFormat(lang === 'uk' ? 'uk-UA' : 'ru-RU', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 0,
  }).format(val)
}

const ProductCard = memo(
  ({
    group,
    lang,
    t,
    eurRate,
    usdRate,
    isFavorite,
    onToggleFavorite,
  }: {
    group: GroupedProduct
    lang: Lang
    t: typeof DICTIONARY['ru']
    eurRate: number | null
    usdRate: number | null
    isFavorite: boolean
    onToggleFavorite: (key: string) => void
  }) => {
    // Сортируем предложения по УДЕЛЬНОЙ цене, а не по исходной
    const sortedOffers = [...group.offers].sort((a, b) => {
      if (a.unitPrice <= 0) return 1
      if (b.unitPrice <= 0) return -1
      return a.unitPrice - b.unitPrice
    })

    const validPrices = sortedOffers.filter((o) => o.unitPrice > 0).map((o) => o.unitPrice)
    const avgUnitPrice = validPrices.length ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0
    const validOffersCount = validPrices.length

    const showSpread = validOffersCount > 1
    const maxCardPrice = Math.max(...validPrices, 0)
    const formattedDate = formatDate(group.latestUpdatedAt, lang)

    const isDeficit = group.totalOffers >= 3 && group.outOfStockCount >= 2
    const isStrongDeficit =
      group.totalOffers >= 3 && group.outOfStockCount >= group.totalOffers - 1 && validOffersCount > 0

    return (
      <div className="rounded-2xl p-4 bg-[#1A1614] border border-white/5 flex flex-col gap-3 relative overflow-hidden group/card">
        {(group.unitSpread > 30 || isDeficit) && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#E4D00A]/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        )}

        <div className="flex gap-3 items-start relative z-10">
          {group.image_url ? (
            <img
              src={group.image_url}
              alt=""
              className="w-14 h-14 rounded-xl object-cover bg-[#25201C] shrink-0 border border-white/5"
              loading="lazy"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-[#25201C] shrink-0 flex items-center justify-center text-white/10">
              <Tag size={18} />
            </div>
          )}
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="text-sm font-bold leading-tight text-white line-clamp-2">{group.name}</h3>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {group.product_code && (
                <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono text-[#B9ACA0] uppercase tracking-wider">
                  {t.code} {group.product_code}
                </span>
              )}
              {showSpread && group.unitSpread > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#E4D00A]/10 text-[#E4D00A] text-[10px] font-bold flex items-center gap-1">
                  <TrendingDown size={10} />
                  {group.unitSpread.toFixed(0)}%
                </span>
              )}
              {isStrongDeficit && (
                <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 text-[10px] font-bold">
                  {t.deficit}
                </span>
              )}
              {formattedDate && (
                <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-medium text-[#B9ACA0] flex items-center gap-1">
                  <Clock size={10} className="text-[#B9ACA0]/70" />
                  {formattedDate}
                </span>
              )}
            </div>
          </div>
          
          <button 
            onClick={() => onToggleFavorite(group.key)}
            className="absolute top-0 right-0 p-1 rounded-lg text-[#B9ACA0] hover:text-white active:scale-90 transition-all"
          >
            <Bookmark size={18} className={isFavorite ? "fill-[#E4D00A] text-[#E4D00A]" : ""} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 mt-2 relative z-10">
          {!showSpread && (
            <div className="mb-0.5 text-[11px] text-[#B9ACA0] flex items-center gap-1.5 px-1">
              <Store size={12} className="text-white/20" /> {t.singleOffer}
            </div>
          )}

          {sortedOffers.map((offer, idx) => {
            const isBest = idx === 0 && showSpread && offer.unitPrice > 0
            const isArbitrage = offer.unitPrice > 0 && validOffersCount > 1 && offer.unitPrice < avgUnitPrice * 0.88
            const isStrongArbitrage = offer.unitPrice > 0 && validOffersCount > 1 && offer.unitPrice < avgUnitPrice * 0.8

            const Comp = offer.url ? 'a' : 'div'
            const barWidth = offer.unitPrice > 0 && maxCardPrice > 0 ? `${(offer.unitPrice / maxCardPrice) * 100}%` : '0%'

            return (
              <Comp
                key={`${offer.source}_${offer.id}`}
                {...(offer.url ? { href: offer.url, target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors overflow-hidden ${
                  isBest ? 'bg-[#E4D00A]/10 border border-[#E4D00A]/20' : isStrongArbitrage ? 'bg-red-500/10 border border-red-500/20' : 'bg-[#25201C] border border-transparent'
                }`}
              >
                {showSpread && offer.unitPrice > 0 && (
                  <div
                    className={`absolute left-0 bottom-0 top-0 opacity-10 pointer-events-none transition-all ${
                      isBest ? 'bg-[#E4D00A]' : isStrongArbitrage ? 'bg-red-400' : 'bg-white'
                    }`}
                    style={{ width: barWidth }}
                  />
                )}

                <div className="flex flex-col justify-center z-10 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[13px] font-medium truncate ${isBest ? 'text-white' : 'text-[#B9ACA0]'}`}>
                      {formatSourceName(offer.source)}
                    </span>
                    {offer.volumeLabel && (
                      <span className="text-[10px] bg-white/5 text-[#B9ACA0] px-1.5 py-0.5 rounded font-mono">
                        {offer.volumeLabel}
                      </span>
                    )}
                  </div>
                  {(isStrongArbitrage || isArbitrage || isBest) && (
                    <div className="flex gap-1.5 mt-1">
                      {isStrongArbitrage && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/25 text-red-300 font-bold uppercase tracking-wide">
                          {t.urgentBuy}
                        </span>
                      )}
                      {isBest && !isArbitrage && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E4D00A] text-black font-bold uppercase tracking-wide">
                          {t.bestPrice}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end z-10 shrink-0">
                  <span className={`text-sm font-bold tabular-nums ${isBest ? 'text-[#E4D00A]' : isStrongArbitrage ? 'text-red-300' : 'text-white'}`}>
                    {formatPrice(offer.price, lang)}
                  </span>
                  {offer.multiplier !== 1 && offer.unitPrice > 0 && (
                    <span className="text-[10px] text-[#B9ACA0] font-medium tracking-wide mt-0.5">
                      {Math.round(offer.unitPrice)} ₴ / 1 {offer.baseUnit}
                    </span>
                  )}
                </div>
              </Comp>
            )
          })}
        </div>
      </div>
    )
  },
  (prev, next) =>
    prev.group.key === next.group.key &&
    prev.lang === next.lang &&
    prev.isFavorite === next.isFavorite &&
    prev.eurRate === next.eurRate &&
    prev.usdRate === next.usdRate
)

export function PricesPage({ onBack, lang }: PricesPageProps) {
  const t = DICTIONARY[lang]
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [eurRate, setEurRate] = useState<number | null>(null)
  const [usdRate, setUsdRate] = useState<number | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [selectedSource, setSelectedSource] = useState<string>('all') // 'all' | 'favorites' | sourceId
  const [sortBy, setSortBy] = useState<SortOption>('default')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('price_favorites')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const toggleFavorite = useCallback((key: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      localStorage.setItem('price_favorites', JSON.stringify([...next]))
      return next
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [apiRes, ratesRes] = await Promise.all([
        fetch('/api/prices').catch(() => null),
        fetch('/api/rates').catch(() => null),
      ])

      if (!apiRes || !apiRes.ok) throw new Error('API error')
      const data = await apiRes.json()
      setItems(Array.isArray(data) ? data : [])

      if (ratesRes && ratesRes.ok) {
        const rates = await ratesRes.json()
        if (rates?.usd) setUsdRate(Number(rates.usd))
        if (rates?.eur) setEurRate(Number(rates.eur))
      }
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

  const sources = useMemo(
    () => Array.from(new Set(items.map((i) => i.source).filter(Boolean) as string[])).sort(),
    [items]
  )

  const baseGroupedItems = useMemo(() => {
    const map = new Map<string, GroupedProduct>()

    items.forEach((item) => {
      let validPrice = item.current_price && !isNaN(Number(item.current_price)) && Number(item.current_price) > 0 ? Number(item.current_price) : 0
      
      // Защита от мусора в базе (например, когда парсер захватил телефон или артикул 306400 как цену)
      if (validPrice > 50000) validPrice = 0

      const volData = getVolumeData(item.name)
      const unitPrice = validPrice * volData.multiplier
      const groupingKey = makeGroupingKey(item)

      if (!map.has(groupingKey)) {
        map.set(groupingKey, {
          key: groupingKey,
          name: item.name,
          product_code: item.product_code,
          image_url: item.image_url,
          category: item.category,
          offers: [],
          minUnitPrice: Infinity,
          maxUnitPrice: -Infinity,
          unitSpread: 0,
          latestUpdatedAt: null,
          outOfStockCount: 0,
          totalOffers: 0,
        })
      }

      const group = map.get(groupingKey)!

      if (item.name.length > group.name.length) group.name = item.name
      if (!group.image_url && item.image_url) group.image_url = item.image_url
      if (!group.product_code && item.product_code) group.product_code = item.product_code

      if (item.updated_at) {
        if (!group.latestUpdatedAt || new Date(item.updated_at) > new Date(group.latestUpdatedAt)) {
          group.latestUpdatedAt = item.updated_at
        }
      }

      const existingOfferIndex = group.offers.findIndex((o) => o.source === item.source)

      if (existingOfferIndex >= 0 && !item.product_code) {
        // Изолируем товары без артикула, если в одном магазине их несколько, чтобы не перезаписывать
        const uniqueKey = `raw_isolate_${item.id}`
        map.set(uniqueKey, {
          key: uniqueKey,
          name: item.name,
          product_code: item.product_code,
          image_url: item.image_url,
          category: item.category,
          offers: [{ id: item.id, source: item.source || 'unknown', price: validPrice, unitPrice, baseUnit: volData.baseUnit, volumeLabel: volData.originalLabel, url: item.url, updated_at: item.updated_at }],
          minUnitPrice: unitPrice, maxUnitPrice: unitPrice, unitSpread: 0, latestUpdatedAt: item.updated_at,
          outOfStockCount: validPrice <= 0 ? 1 : 0, totalOffers: 1,
        })
        return
      }

      if (existingOfferIndex >= 0) {
        const existingOffer = group.offers[existingOfferIndex]
        // Оставляем самое выгодное предложение (за удельную единицу) от одного магазина
        if (unitPrice > 0 && (existingOffer.unitPrice === 0 || unitPrice < existingOffer.unitPrice)) {
          group.offers[existingOfferIndex] = {
            id: item.id, source: item.source || 'unknown', price: validPrice, unitPrice, baseUnit: volData.baseUnit, volumeLabel: volData.originalLabel, url: item.url, updated_at: item.updated_at
          }
        }
      } else {
        group.offers.push({
          id: item.id, source: item.source || 'unknown', price: validPrice, unitPrice, baseUnit: volData.baseUnit, volumeLabel: volData.originalLabel, url: item.url, updated_at: item.updated_at
        })
      }
    })

    return Array.from(map.values()).map((group) => {
      const priced = group.offers.filter((o) => o.unitPrice > 0)
      group.minUnitPrice = priced.length ? Math.min(...priced.map((o) => o.unitPrice)) : 0
      group.maxUnitPrice = priced.length ? Math.max(...priced.map((o) => o.unitPrice)) : 0
      group.unitSpread = group.minUnitPrice > 0 ? ((group.maxUnitPrice - group.minUnitPrice) / group.minUnitPrice) * 100 : 0
      group.totalOffers = group.offers.length
      group.outOfStockCount = group.offers.filter((o) => o.unitPrice <= 0).length
      return group
    })
  }, [items])

  const filteredItems = useMemo(() => {
    let result = baseGroupedItems

    if (selectedSource === 'favorites') {
      result = result.filter(g => favorites.has(g.key))
    } else if (selectedSource !== 'all') {
      result = result.filter((g) => g.offers.some((o) => o.source.toLowerCase() === selectedSource.toLowerCase()))
    }

    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase().trim()
      result = result.filter(
        (g) => g.name.toLowerCase().includes(q) || (g.product_code && g.product_code.toLowerCase().includes(q))
      )
    }

    return result.sort((a, b) => {
      if (sortBy === 'unit-price-asc') return a.minUnitPrice - b.minUnitPrice
      if (sortBy === 'savings') return b.unitSpread - a.unitSpread
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return b.offers.length - a.offers.length || b.unitSpread - a.unitSpread
    })
  }, [baseGroupedItems, deferredSearchQuery, selectedSource, sortBy, favorites])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [deferredSearchQuery, selectedSource, sortBy])

  const stats = useMemo(() => {
    const multi = filteredItems.filter((g) => g.offers.length > 1)
    const avgSpread = multi.length ? multi.reduce((acc, g) => acc + g.unitSpread, 0) / multi.length : 0
    return {
      total: filteredItems.length,
      multiCount: multi.length,
      avgSpread: avgSpread.toFixed(1),
    }
  }, [filteredItems])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-[100dvh] bg-[#12100E] text-[#F5F1EA] font-sans"
    >
      <div className="shrink-0 z-20 bg-[#1A1614]/95 backdrop-blur-md border-b border-white/5 pt-4 pb-3">
        <div className="px-4 flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <BookOpen size={17} className="text-[#E4D00A] shrink-0" />
              <span className="truncate">{t.title}</span>
            </h1>
            <p className="text-[11px] text-[#B9ACA0] mt-0.5">
              {stats.multiCount > 0 && (
                <span className="text-[#E4D00A]">
                  {t.statsAvgSpread}: {stats.avgSpread}% ·{' '}
                </span>
              )}
              {stats.total} {t.statsTotal}
              {(usdRate || eurRate) && (
                <span className="ml-1.5 opacity-70">
                  {usdRate && ` $ ${usdRate.toFixed(2)}`}
                  {usdRate && eurRate && ' ·'}
                  {eurRate && ` € ${eurRate.toFixed(2)}`}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="px-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B9ACA0]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className="w-full h-11 pl-9 pr-9 rounded-xl bg-[#25201C] border border-white/5 focus:border-[#E4D00A]/40 outline-none text-sm text-white transition-colors"
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
              className="h-11 px-3 rounded-xl text-sm bg-[#25201C] border border-white/5 outline-none text-white max-w-[120px]"
            >
              <option value="default">{t.sortDefault}</option>
              <option value="savings">{t.sortSavings}</option>
              <option value="unit-price-asc">{t.sortUnitPriceAsc}</option>
              <option value="name">{t.sortName}</option>
            </select>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            <button
              onClick={() => setSelectedSource('all')}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium shrink-0 transition-colors ${
                selectedSource === 'all' ? 'bg-[#E4D00A] text-black' : 'bg-white/5 text-[#B9ACA0]'
              }`}
            >
              {t.allSources}
            </button>
            <button
              onClick={() => setSelectedSource('favorites')}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium shrink-0 flex items-center gap-1.5 transition-colors ${
                selectedSource === 'favorites' ? 'bg-[#E4D00A] text-black' : 'bg-white/5 text-[#B9ACA0]'
              }`}
            >
              <Bookmark size={14} className={selectedSource === 'favorites' ? "fill-black" : ""} />
              {t.favorites}
            </button>
            {sources.map((src) => (
              <button
                key={src}
                onClick={() => setSelectedSource(src)}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium shrink-0 flex items-center gap-1.5 transition-colors ${
                  selectedSource === src ? 'bg-[#E4D00A] text-black' : 'bg-white/5 text-[#B9ACA0]'
                }`}
              >
                {formatSourceName(src)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[140px] rounded-2xl bg-[#1A1614] border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="text-[#B9ACA0] text-sm mb-4">{error}</p>
            <button
              onClick={load}
              className="px-5 py-2.5 rounded-xl bg-[#E4D00A] text-black font-semibold"
            >
              {t.retry}
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center text-[#B9ACA0]">
            <Tag size={32} className="opacity-20 mb-3" />
            <p className="font-medium text-white">{t.empty}</p>
            <p className="text-sm mt-1">{t.emptyHint}</p>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            <AnimatePresence>
              {filteredItems.slice(0, visibleCount).map((g) => (
                <ProductCard
                  key={g.key}
                  group={g}
                  lang={lang}
                  t={t}
                  eurRate={eurRate}
                  usdRate={usdRate}
                  isFavorite={favorites.has(g.key)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </AnimatePresence>

            {visibleCount < filteredItems.length && (
              <button
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="w-full py-3.5 mt-4 flex items-center justify-center gap-2 rounded-xl bg-white/5 text-sm font-medium text-white hover:bg-white/10 active:scale-[0.98] transition-all"
              >
                {t.loadMore} <ChevronDown size={16} className="opacity-50" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
