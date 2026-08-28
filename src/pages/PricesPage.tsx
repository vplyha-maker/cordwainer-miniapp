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

type PricesPageProps = {
  onBack: () => void
  lang: Lang
}

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name'

export function PricesPage({ onBack, lang }: PricesPageProps) {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('default')

  const t = {
    ru: {
      title: 'Цены и материалы',
      loading: 'Загрузка каталога…',
      error: 'Не удалось загрузить цены',
      retry: 'Повторить',
      noPrice: 'Цена не указана',
      empty: 'Ничего не найдено',
      search: 'Поиск по материалам...',
      allSources: 'Все источники',
      sortDefault: 'По умолчанию',
      sortPriceAsc: 'Сначала дешевле',
      sortPriceDesc: 'Сначала дороже',
      sortName: 'По названию',
      code: 'Код:',
    },
    uk: {
      title: 'Ціни та матеріалы',
      loading: 'Завантаження каталогу…',
      error: 'Не вдалося завантажити ціни',
      retry: 'Повторити',
      noPrice: 'Ціна не вказана',
      empty: 'Нічого не знайдено',
      search: 'Пошук за матеріалами...',
      allSources: 'Всі джерела',
      sortDefault: 'За замовчуванням',
      sortPriceAsc: 'Спочатку дешевші',
      sortPriceDesc: 'Спочатку дорожчі',
      sortName: 'За назвою',
      code: 'Код:',
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

  // Extract unique sources for filtering pills
  const sources = useMemo(() => {
    const set = new Set<string>()
    items.forEach(i => { if (i.source) set.add(i.source) })
    return Array.from(set)
  }, [items])

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items]

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(i => 
        i.name.toLowerCase().includes(q) || 
        (i.product_code && i.product_code.toLowerCase().includes(q))
      )
    }

    // Source filter
    if (selectedSource !== 'all') {
      result = result.filter(i => i.source === selectedSource)
    }

    // Sorting
    result.sort((a, b) => {
      const priceA = a.current_price !== null ? Number(a.current_price) : -1
      const priceB = b.current_price !== null ? Number(b.current_price) : -1

      if (sortBy === 'price-asc') return priceA - priceB
      if (sortBy === 'price-desc') return priceB - priceA
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return 0
    })

    return result
  }, [items, searchQuery, selectedSource, sortBy])

  const formatPrice = (value: number | string | null) => {
    if (value === null || value === undefined || value === '') return t.noPrice
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (Number.isNaN(num)) return t.noPrice
    return `${num.toLocaleString(lang === 'uk' ? 'uk-UA' : 'ru-RU')} ₴`
  }

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

      {/* Search & Controls Bar */}
      {!loading && !error && items.length > 0 && (
        <div className="px-4 pb-3 shrink-0 flex flex-col gap-2.5 z-10 bg-[var(--color-bg,#1C1816)]">
          {/* Search Input */}
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
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 flex items-center text-[var(--color-muted,#B9ACA0)] hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters & Sorting row */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setSelectedSource('all')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium shrink-0 transition-colors ${
                selectedSource === 'all' 
                  ? 'bg-[var(--color-accent,#E4D00A)] text-[#151210]' 
                  : 'bg-[var(--color-surface,#25201C)] text-[var(--color-muted,#B9ACA0)] border border-[var(--color-border,rgba(255,255,255,0.08)]'
              }`}
            >
              {t.allSources}
            </button>
            {sources.map(src => (
              <button
                key={src}
                onClick={() => setSelectedSource(src)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium shrink-0 transition-colors ${
                  selectedSource === src 
                    ? 'bg-[var(--color-accent,#E4D00A)] text-[#151210]' 
                    : 'bg-[var(--color-surface,#25201C)] text-[var(--color-muted,#B9ACA0)] border border-[var(--color-border,rgba(255,255,255,0.08)]'
                }`}
              >
                {src}
              </button>
            ))}

            <div className="h-4 w-[1px] bg-[var(--color-border,rgba(255,255,255,0.12))] shrink-0 mx-1" />

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium shrink-0 bg-[var(--color-surface,#25201C)] text-[var(--color-muted,#B9ACA0)] border border-[var(--color-border,rgba(255,255,255,0.08))] focus:outline-none"
            >
              <option value="default">{t.sortDefault}</option>
              <option value="price-asc">{t.sortPriceAsc}</option>
              <option value="price-desc">{t.sortPriceDesc}</option>
              <option value="name">{t.sortName}</option>
            </select>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-12 pt-1">
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="rounded-[18px] p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.06)] animate-pulse flex gap-3">
                <div className="w-16 h-16 rounded-xl bg-[var(--color-surface-2,#2F2924)] shrink-0" />
                <div className="flex-1 py-1">
                  <div className="h-4 bg-[var(--color-surface-2,#2F2924)] rounded w-3/4 mb-2" />
                  <div className="h-3 bg-[var(--color-surface-2,#2F2924)] rounded w-1/4 mb-3" />
                  <div className="h-4 bg-[var(--color-surface-2,#2F2924)] rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="py-16 text-center">
            <p className="text-[14px] text-[var(--color-muted,#B9ACA0)] mb-4">{error}</p>
            <button
              onClick={load}
              className="px-5 py-2.5 rounded-xl bg-[var(--color-accent,#E4D00A)] text-[#151210] text-[13px] font-semibold active:scale-95 transition-transform"
            >
              {t.retry}
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="py-20 text-center text-[var(--color-muted,#B9ACA0)] text-[14px]">
            {t.empty}
          </div>
        )}

        {!loading && !error && items.length > 0 && filteredItems.length === 0 && (
          <div className="py-20 text-center text-[var(--color-muted,#B9ACA0)] text-[14px]">
            {t.empty}
          </div>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {filteredItems.map((item) => (
                <motion.a
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  href={item.url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-[18px] p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-[0.98] transition-transform shadow-sm"
                >
                  <div className="flex gap-3.5 items-start">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
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
                        {item.name}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        {item.source && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--color-surface-2,#2F2924)] text-[var(--color-muted,#B9ACA0)] font-medium">
                            {item.source}
                          </span>
                        )}
                        {item.product_code && (
                          <span className="text-[11px] text-[var(--color-muted,#B9ACA0)] opacity-80">
                            {t.code} {item.product_code}
                          </span>
                        )}
                      </div>

                      <div className="text-[16px] font-semibold text-[var(--color-accent,#E4D00A)] mt-2">
                        {formatPrice(item.current_price)}
                      </div>
                    </div>
                  </div>
                </motion.a>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}
