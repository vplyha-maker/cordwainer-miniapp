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

// Группированный товар по поставщикам
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

export function PricesPage({ onBack, lang }: PricesPageProps) {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('default')

  const t = {
    ru: {
      title: 'Сравнение цен',
      loading: 'Загрузка каталога…',
      error: 'Не удалось загрузить цены',
      retry: 'Повторить',
      noPrice: 'Цена не указана',
      empty: 'Ничего не найдено',
      search: 'Поиск материалов (например, SAR-306)...',
      allSources: 'Все источники',
      sortDefault: 'По умолчанию',
      sortPriceAsc: 'Сначала дешевле',
      sortName: 'По названию',
      code: 'Код:',
      bestPrice: 'Лучшая цена',
      suppliers: 'Поставщики:',
    },
    uk: {
      title: 'Порівняння цін',
      loading: 'Завантаження каталогу…',
      error: 'Не вдалося завантажити ціни',
      retry: 'Повторити',
      noPrice: 'Ціна не вказана',
      empty: 'Нічого не знайдено',
      search: 'Пошук матеріалів (наприклад, SAR-306)...',
      allSources: 'Всі джерела',
      sortDefault: 'За замовчуванням',
      sortPriceAsc: 'Спочатку дешевші',
      sortName: 'За назвою',
      code: 'Код:',
      bestPrice: 'Краща ціна',
      suppliers: 'Постачальники:',
    },
  }[lang]

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

  // Уникальные источники для фильтров
  const sources = useMemo(() => {
    const set = new Set<string>()
    items.forEach(i => { if (i.source) set.add(i.source) })
    return Array.from(set)
  }, [items])

  // Группировка товаров по коду или нормализованному названию
  const groupedItems = useMemo(() => {
    const map = new Map<string, GroupedProduct>()

    items.forEach(item => {
      const priceNum = item.current_price !== null && item.current_price !== '' ? Number(item.current_price) : NaN
      if (isNaN(priceNum) || priceNum <= 0) return // Пропускаем товары без цен для сравнения

      // Ключ для объединения: если есть product_code, используем его, иначе чистим имя
      const groupingKey = item.product_code 
        ? `code_${item.product_code.trim()}` 
        : `name_${item.name.toLowerCase().replace(/[^a-zа-яё0-9]/g, '').slice(0, 20)}`

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
        })
      }

      const group = map.get(groupingKey)!
      // Берем лучшую картинку если у текущей не было
      if (!group.image_url && item.image_url) group.image_url = item.image_url

      group.offers.push({
        id: item.id,
        source: item.source || 'unknown',
        price: priceNum,
        url: item.url,
      })

      if (priceNum < group.minPrice) group.minPrice = priceNum
      if (priceNum > group.maxPrice) group.maxPrice = priceNum
    })

    let result = Array.from(map.values())

    // Фильтрация по поиску
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(g => 
        g.name.toLowerCase().includes(q) || 
        (g.product_code && g.product_code.toLowerCase().includes(q))
      )
    }

    // Фильтрация по источнику (оставляем группы, где есть этот источник)
    if (selectedSource !== 'all') {
      result = result.filter(g => g.offers.some(o => o.source === selectedSource))
    }

    // Сортировка
    result.sort((a, b) => {
      if (sortBy === 'price-asc') return a.minPrice - b.minPrice
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return 0
    })

    return result
  }, [items, searchQuery, selectedSource, sortBy])

  const formatPrice = (val: number) => `${val.toLocaleString(lang === 'uk' ? 'uk-UA' : 'ru-RU')} ₴`

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative flex flex-col h-[100dvh] bg-[var(--color-bg,#1C1816)] text-[var(--color-ink,#F5F1EA)] overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3 shrink-0 relative z-20 bg-[var(--color-bg,#1C1816)]">
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

      {/* Search & Controls */}
      {!loading && !error && items.length > 0 && (
        <div className="px-4 pb-3 shrink-0 flex flex-col gap-2.5 z-10 bg-[var(--color-bg,#1C1816)]">
          <div className="relative">
            <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-[var(--color-muted,#B9ACA0)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] text-[14px] text-[var(--color-ink,#F5F1EA)] placeholder-[var(--color-muted,#B9ACA0)] focus:outline-none focus:border-[var(--color-accent,#E4D00A)] transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-3 flex items-center text-[var(--color-muted,#B9ACA0)] text-xs">✕</button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setSelectedSource('all')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium shrink-0 transition-colors ${
                selectedSource === 'all' ? 'bg-[var(--color-accent,#E4D00A)] text-[#151210]' : 'bg-[var(--color-surface,#25201C)] text-[var(--color-muted,#B9ACA0)] border border-[var(--color-border,rgba(255,255,255,0.08)]'
              }`}
            >
              {t.allSources}
            </button>
            {sources.map(src => (
              <button
                key={src}
                onClick={() => setSelectedSource(src)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium shrink-0 transition-colors ${
                  selectedSource === src ? 'bg-[var(--color-accent,#E4D00A)] text-[#151210]' : 'bg-[var(--color-surface,#25201C)] text-[var(--color-muted,#B9ACA0)] border border-[var(--color-border,rgba(255,255,255,0.08)]'
                }`}
              >
                {src}
              </button>
            ))}

            <div className="h-4 w-[1px] bg-[var(--color-border,rgba(255,255,255,0.12))] shrink-0 mx-1" />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium shrink-0 bg-[var(--color-surface,#25201C)] text-[var(--color-muted,#B9ACA0)] border border-[var(--color-border,rgba(255,255,255,0.08))] focus:outline-none"
            >
              <option value="default">{t.sortDefault}</option>
              <option value="price-asc">{t.sortPriceAsc}</option>
              <option value="name">{t.sortName}</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-12 pt-1">
        {loading && <div className="py-16 text-center text-[var(--color-muted,#B9ACA0)] text-[14px]">{t.loading}</div>}
        {!loading && error && (
          <div className="py-16 text-center">
            <p className="text-[14px] text-[var(--color-muted,#B9ACA0)] mb-4">{error}</p>
            <button onClick={load} className="px-5 py-2.5 rounded-xl bg-[var(--color-accent,#E4D00A)] text-[#151210] text-[13px] font-semibold">{t.retry}</button>
          </div>
        )}
        {!loading && !error && groupedItems.length === 0 && (
          <div className="py-20 text-center text-[var(--color-muted,#B9ACA0)] text-[14px]">{t.empty}</div>
        )}

        {/* Список сгруппированных товаров */}
        {!loading && !error && groupedItems.length > 0 && (
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {groupedItems.map((group) => {
                // Сортируем офферы внутри группы по возрастанию цены
                const sortedOffers = [...group.offers].sort((a, b) => a.price - b.price)
                const bestOffer = sortedOffers[0]

                return (
                  <motion.div
                    key={group.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-[18px] p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] shadow-sm flex flex-col gap-3"
                  >
                    {/* Основная инфо о товаре */}
                    <div className="flex gap-3.5 items-start">
                      {group.image_url ? (
                        <img
                          src={group.image_url}
                          alt=""
                          className="w-16 h-16 rounded-xl object-cover bg-[var(--color-surface-2,#2F2924)] shrink-0 border border-white/5"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-[var(--color-surface-2,#2F2924)] shrink-0 flex items-center justify-center text-[var(--color-muted,#B9ACA0)] text-[20px]">
                          📦
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium leading-snug line-clamp-2 text-[var(--color-ink,#F5F1EA)]">
                          {group.name}
                        </div>
                        {group.product_code && (
                          <div className="text-[11px] text-[var(--color-muted,#B9ACA0)] mt-1 opacity-80">
                            {t.code} {group.product_code}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Блок цен по поставщикам */}
                    <div className="pt-2 border-t border-[var(--color-border,rgba(255,255,255,0.06))] flex flex-col gap-2">
                      <div className="text-[11px] font-semibold text-[var(--color-muted,#B9ACA0)] uppercase tracking-wider">
                        {t.suppliers}
                      </div>

                      <div className="grid grid-cols-1 gap-1.5">
                        {sortedOffers.map((offer, idx) => {
                          const isBest = idx === 0 && sortedOffers.length > 1
                          return (
                            <a
                              key={offer.id}
                              href={offer.url || undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                                isBest 
                                  ? 'bg-[var(--color-surface-2,#2F2924)] border-[var(--color-accent,#E4D00A)]/40' 
                                  : 'bg-[var(--color-bg,#1C1816)] border-[var(--color-border,rgba(255,255,255,0.06)] hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-medium text-[var(--color-ink,#F5F1EA)]">
                                  {offer.source}
                                </span>
                                {isBest && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent,#E4D00A)] text-[#151210] font-bold">
                                    {t.bestPrice}
                                  </span>
                                )}
                              </div>
                              <div className="text-[14px] font-semibold text-[var(--color-accent,#E4D00A)]">
                                {formatPrice(offer.price)}
                              </div>
                            </a>
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
