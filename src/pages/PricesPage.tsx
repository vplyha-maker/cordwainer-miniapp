import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
}

type PricesPageProps = {
  onBack: () => void
  lang: Lang
}

type SortOption = 'default' | 'price-asc' | 'name'

// Выносим словари за пределы компонента, чтобы не пересоздавать при рендере
const DICTIONARY = {
  ru: {
    title: 'Сравнение цен',
    loading: 'Загрузка каталога…',
    error: 'Не удалось загрузить цены',
    retry: 'Повторить',
    noPrice: 'Цена не указана',
    empty: 'Ничего не найдено',
    search: 'Поиск (например, SAR 306)...',
    allSources: 'Все магазины',
    sortDefault: 'Сначала популярные',
    sortPriceAsc: 'Сначала дешевые',
    sortName: 'По алфавиту',
    code: 'Код:',
    bestPrice: 'Лучшая цена',
    suppliers: 'Предложения в магазинах:',
    goToStore: 'Перейти',
  },
  uk: {
    title: 'Порівняння цін',
    loading: 'Завантаження каталогу…',
    error: 'Не вдалося завантажити ціни',
    retry: 'Повторити',
    noPrice: 'Ціна не вказана',
    empty: 'Нічого не знайдено',
    search: 'Пошук (наприклад, SAR 306)...',
    allSources: 'Всі магазини',
    sortDefault: 'Спочатку популярні',
    sortPriceAsc: 'Спочатку дешевші',
    sortName: 'За алфавітом',
    code: 'Код:',
    bestPrice: 'Краща ціна',
    suppliers: 'Пропозиції в магазинах:',
    goToStore: 'Перейти',
  },
}

// Задел на будущее: функция для красивого отображения ID магазина из БД
const formatSourceName = (sourceId: string) => {
  const customNames: Record<string, string> = {
    zotti: 'Zotti',
    aligo: 'Aligo Group',
    bahtarma: 'Bahtarma',
    // Сюда можно будет добавлять новые магазины по мере их появления
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

  useEffect(() => {
    load()
  }, [])

  // Автоматический сбор всех уникальных источников (будет работать для любого кол-ва новых парсеров)
  const sources = useMemo(() => {
    const set = new Set<string>()
    items.forEach(i => { if (i.source) set.add(i.source) })
    return Array.from(set).sort() // Сортируем алфавитно для порядка в UI
  }, [items])

  const groupedItems = useMemo(() => {
    const map = new Map<string, GroupedProduct>()

    items.forEach(item => {
      const priceNum = item.current_price !== null && item.current_price !== '' ? Number(item.current_price) : NaN
      if (isNaN(priceNum) || priceNum <= 0) return

      // Более умная нормализация имени (очищаем от частых "мусорных" слов и символов, если нет кода)
      const cleanName = item.name
        .toLowerCase()
        .replace(/(\(.*?\)|\[.*?\])/g, '') // удаляем текст в скобках (напр. "(Италия)")
        .replace(/[^a-zа-яё0-9]/g, '') // оставляем только буквы и цифры

      const groupingKey = item.product_code 
        ? `code_${item.product_code.trim().toLowerCase()}` 
        : `name_${cleanName.slice(0, 30)}`

      if (!map.has(groupingKey)) {
        map.set(groupingKey, {
          key: groupingKey,
          name: item.name, // Берем имя первого встречного товара
          product_code: item.product_code,
          image_url: item.image_url,
          category: item.category,
          offers: [],
          minPrice: Infinity,
          maxPrice: -Infinity,
        })
      }

      const group = map.get(groupingKey)!
      
      // Захватываем картинку, если у базового товара её не было
      if (!group.image_url && item.image_url) group.image_url = item.image_url

      // Избегаем дублей, если парсер случайно отдал два одинаковых товара из одного магазина
      const existingOffer = group.offers.find(o => o.source === item.source)
      if (!existingOffer) {
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

    let result = Array.from(map.values())

    // 1. Поиск
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(g => 
        g.name.toLowerCase().includes(q) || 
        (g.product_code && g.product_code.toLowerCase().includes(q))
      )
    }

    // 2. Фильтрация по магазину
    if (selectedSource !== 'all') {
      result = result.filter(g => g.offers.some(o => o.source === selectedSource))
    }

    // 3. Сортировка
    result.sort((a, b) => {
      if (sortBy === 'price-asc') return a.minPrice - b.minPrice
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      // default: сортируем по количеству предложений (где больше выбор магазинов - те выше)
      return b.offers.length - a.offers.length
    })

    return result
  }, [items, searchQuery, selectedSource, sortBy])

  const formatPrice = (val: number) => 
    new Intl.NumberFormat(lang === 'uk' ? 'uk-UA' : 'ru-RU', { 
      style: 'currency', 
      currency: 'UAH',
      maximumFractionDigits: 0
    }).format(val)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative flex flex-col h-[100dvh] bg-[var(--color-bg,#1C1816)] text-[var(--color-ink,#F5F1EA)] overflow-hidden"
    >
      {/* HEADER + FILTERS (Sticky) - Закреплены сверху, чтобы всегда были под рукой */}
      <div className="shrink-0 flex flex-col z-20 bg-[var(--color-bg,#1C1816)] shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        
        {/* Top Header */}
        <div className="px-4 pt-5 pb-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-90 transition-transform shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-[24px] font-serif font-normal tracking-wide leading-none truncate">
            {t.title}
          </h1>
        </div>

        {/* Search & Sort & Filters */}
        {!loading && !error && items.length > 0 && (
          <div className="px-4 pb-3 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-[var(--color-muted,#B9ACA0)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.search}
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] text-[14px] text-[var(--color-ink,#F5F1EA)] placeholder-[var(--color-muted,#B9ACA0)] focus:outline-none focus:border-[var(--color-accent,#E4D00A)] transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-3 flex items-center p-1 text-[var(--color-muted,#B9ACA0)] hover:text-white transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-11 px-3 rounded-xl text-[13px] font-medium shrink-0 bg-[var(--color-surface,#25201C)] text-[var(--color-ink,#F5F1EA)] border border-[var(--color-border,rgba(255,255,255,0.12))] focus:outline-none focus:border-[var(--color-accent,#E4D00A)] appearance-none cursor-pointer"
              >
                <option value="default">{t.sortDefault}</option>
                <option value="price-asc">{t.sortPriceAsc}</option>
                <option value="name">{t.sortName}</option>
              </select>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setSelectedSource('all')}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold shrink-0 transition-all ${
                  selectedSource === 'all' 
                    ? 'bg-[var(--color-accent,#E4D00A)] text-[#151210] shadow-[0_0_12px_rgba(228,208,10,0.3)]' 
                    : 'bg-[var(--color-surface-2,#2F2924)] text-[var(--color-muted,#B9ACA0)] border border-[var(--color-border,rgba(255,255,255,0.06))]'
                }`}
              >
                {t.allSources}
              </button>
              
              {sources.map(src => (
                <button
                  key={src}
                  onClick={() => setSelectedSource(src)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-semibold shrink-0 transition-all ${
                    selectedSource === src 
                      ? 'bg-[var(--color-accent,#E4D00A)] text-[#151210] shadow-[0_0_12px_rgba(228,208,10,0.3)]' 
                      : 'bg-[var(--color-surface-2,#2F2924)] text-[var(--color-muted,#B9ACA0)] border border-[var(--color-border,rgba(255,255,255,0.06))]'
                  }`}
                >
                  {formatSourceName(src)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CONTENT LIST */}
      <div className="flex-1 overflow-y-auto px-4 pb-12 pt-4 scroll-smooth">
        {loading && (
          <div className="h-full flex flex-col items-center justify-center text-[var(--color-muted,#B9ACA0)]">
             <div className="w-8 h-8 border-2 border-[var(--color-accent,#E4D00A)] border-t-transparent rounded-full animate-spin mb-4" />
             <p className="text-[14px]">{t.loading}</p>
          </div>
        )}
        
        {!loading && error && (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <p className="text-[14px] text-[var(--color-muted,#B9ACA0)]">{error}</p>
            <button onClick={load} className="px-6 py-3 rounded-xl bg-[var(--color-accent,#E4D00A)] text-[#151210] text-[14px] font-bold active:scale-95 transition-transform">
              {t.retry}
            </button>
          </div>
        )}
        
        {!loading && !error && groupedItems.length === 0 && (
          <div className="py-24 flex flex-col items-center justify-center opacity-60">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 text-[var(--color-muted,#B9ACA0)]">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p className="text-[var(--color-muted,#B9ACA0)] text-[15px] font-medium">{t.empty}</p>
          </div>
        )}

        {!loading && !error && groupedItems.length > 0 && (
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {groupedItems.map((group) => {
                const sortedOffers = [...group.offers].sort((a, b) => a.price - b.price)
                const bestPrice = sortedOffers[0].price

                return (
                  <motion.div
                    key={group.key}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-[20px] p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.08))] shadow-lg flex flex-col gap-4"
                  >
                    {/* Товар: Изображение и Название */}
                    <div className="flex gap-4 items-start">
                      {group.image_url ? (
                        <img
                          src={group.image_url}
                          alt={group.name}
                          className="w-[72px] h-[72px] rounded-2xl object-cover bg-white/5 shrink-0 border border-white/10"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-[72px] h-[72px] rounded-2xl bg-white/5 shrink-0 flex items-center justify-center text-white/20">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                      )}

                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="text-[15px] font-medium leading-tight text-[var(--color-ink,#F5F1EA)] mb-1.5 line-clamp-2">
                          {group.name}
                        </h3>
                        {group.product_code && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-mono text-[var(--color-muted,#B9ACA0)]">
                            {t.code} {group.product_code}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Список цен */}
                    <div className="flex flex-col gap-2 pt-3 border-t border-white/5">
                      <div className="text-[12px] font-medium text-[var(--color-muted,#B9ACA0)] mb-1">
                        {t.suppliers}
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {sortedOffers.map((offer, idx) => {
                          const isBest = offer.price === bestPrice && sortedOffers.length > 1
                          
                          // Если ссылки нет, рендерим просто div, иначе a (ссылку)
                          const WrapperElement = offer.url ? 'a' : 'div'

                          return (
                            <WrapperElement
                              key={offer.id}
                              {...(offer.url ? { href: offer.url, target: '_blank', rel: 'noopener noreferrer' } : {})}
                              className={`group flex items-center justify-between p-3 rounded-xl transition-all ${
                                isBest 
                                  ? 'bg-[var(--color-accent,#E4D00A)]/10 border border-[var(--color-accent,#E4D00A)]/30 hover:bg-[var(--color-accent,#E4D00A)]/20' 
                                  : 'bg-[var(--color-surface-2,#2F2924)] border border-transparent hover:border-white/10'
                              } ${offer.url ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] font-semibold text-[var(--color-ink,#F5F1EA)]">
                                    {formatSourceName(offer.source)}
                                  </span>
                                  {isBest && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 bg-[var(--color-accent,#E4D00A)] text-[#151210] font-bold shadow-sm">
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                                      {t.bestPrice}
                                    </span>
                                  )}
                                </div>
                                {offer.url && (
                                  <span className="text-[11px] text-[var(--color-muted,#B9ACA0)] group-hover:text-white/70 transition-colors">
                                    {t.goToStore} ↗
                                  </span>
                                )}
                              </div>
                              <div className={`text-[16px] font-bold tracking-tight ${isBest ? 'text-[var(--color-accent,#E4D00A)]' : 'text-white'}`}>
                                {formatPrice(offer.price)}
                              </div>
                            </WrapperElement>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}
