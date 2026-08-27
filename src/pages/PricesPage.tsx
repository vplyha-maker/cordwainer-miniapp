import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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

export function PricesPage({ onBack, lang }: PricesPageProps) {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const t = {
    ru: {
      title: 'Цены',
      loading: 'Загрузка…',
      error: 'Не удалось загрузить цены',
      retry: 'Повторить',
      noPrice: '—',
      empty: 'Пока нет товаров',
      source: 'Источник',
    },
    uk: {
      title: 'Ціни',
      loading: 'Завантаження…',
      error: 'Не вдалося завантажити ціни',
      retry: 'Повторити',
      noPrice: '—',
      empty: 'Поки немає товарів',
      source: 'Джерело',
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
      <div className="px-4 pt-5 pb-3 flex items-center gap-3 shrink-0 relative z-20">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-90 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-[28px] font-serif font-normal tracking-wide leading-none">
          {t.title}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {loading && (
          <div className="py-16 text-center text-[var(--color-muted,#B9ACA0)] text-[14px]">
            {t.loading}
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
          <div className="py-16 text-center text-[var(--color-muted,#B9ACA0)] text-[14px]">
            {t.empty}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <a
                key={item.id}
                href={item.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-[18px] p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-[0.98] transition-transform"
              >
                <div className="flex gap-3">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover bg-[var(--color-surface-2,#2F2924)] shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[var(--color-surface-2,#2F2924)] shrink-0 flex items-center justify-center text-[var(--color-muted,#B9ACA0)] text-[20px]">
                      📦
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium leading-snug line-clamp-2">
                      {item.name}
                    </div>
                    {item.source && (
                      <div className="text-[11px] text-[var(--color-muted,#B9ACA0)] mt-1">
                        {item.source}
                      </div>
                    )}
                    <div className="text-[16px] font-semibold text-[var(--color-accent,#E4D00A)] mt-2">
                      {formatPrice(item.current_price)}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
 }
