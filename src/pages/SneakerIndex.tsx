import { useEffect, useState, useCallback, useRef, KeyboardEvent } from 'react'

interface Sneaker {
  id: string
  brand: string
  name: string
  gender: string
  retailPrice: number
  image?: {
    original?: string
  }
}

const BRANDS = [
  { id: 'nike', name: 'Nike' },
  { id: 'adidas', name: 'Adidas' },
  { id: 'jordan', name: 'Jordan' },
  { id: 'yeezy', name: 'Yeezy' },
  { id: 'new balance', name: 'New Balance' },
  { id: 'puma', name: 'Puma' },
  { id: 'reebok', name: 'Reebok' },
  { id: 'asics', name: 'Asics' },
  { id: 'converse', name: 'Converse' },
]

const GENDERS = [
  { id: 'all', name: 'Все' },
  { id: 'men', name: 'Мужские' },
  { id: 'women', name: 'Женские' },
  { id: 'kid', name: 'Детские' },
]

export default function SneakerIndex({ onBack }: { onBack?: () => void }) {
  const [sneakers, setSneakers] = useState<Sneaker[]>([])
  const [selectedBrand, setSelectedBrand] = useState('nike')
  const [selectedGender, setSelectedGender] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [activeQuery, setActiveQuery] = useState('nike')
  
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  // Кэш в памяти, чтобы не ждать повторные запросы по уже открытым брендам
  const cacheRef = useRef<Record<string, Sneaker[]>>({})

  // Загрузка данных с оптимизацией кэша
  const fetchSneakers = useCallback(async (query: string, pageNum: number, append: boolean = false) => {
    const cacheKey = `${query}_p${pageNum}`

    // Если страница первая и есть в кэше — отдаем мгновенно!
    if (!append && cacheRef.current[cacheKey]) {
      setSneakers(cacheRef.current[cacheKey])
      setLoading(false)
      return
    }

    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setSneakers([])
    }
    setError('')

    try {
      const res = await fetch(
        `/api/get-top-sneakers?query=${encodeURIComponent(query)}&limit=100&page=${pageNum}`
      )
      
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.details || data.error || 'Ошибка при загрузке данных')
      }

      const list = data.results || data.data || data || []
      const newItems = Array.isArray(list) ? list : []

      if (newItems.length < 100) {
        setHasMore(false)
      } else {
        setHasMore(true)
      }

      setSneakers((prev) => {
        const updated = append ? [...prev, ...newItems] : newItems
        if (!append) {
          cacheRef.current[cacheKey] = updated
        }
        return updated
      })
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить кроссовки')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    fetchSneakers(activeQuery, 1, false)
  }, [activeQuery, fetchSneakers])

  const handleBrandClick = (brandId: string) => {
    setSelectedBrand(brandId)
    setSearchText('')
    setHasSearched(false)
    setActiveQuery(brandId)
  }

  const handleSearchSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const text = searchText.trim()
      if (!text) return

      const query =
        selectedBrand && selectedBrand !== 'all'
          ? `${selectedBrand} ${text}`
          : text

      setHasSearched(true)
      setActiveQuery(query)
    }
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchSneakers(activeQuery, nextPage, true)
  }

  const filteredSneakers = sneakers.filter((sneaker) => {
    if (selectedGender === 'all') return true
    if (!sneaker.gender) return false
    return sneaker.gender.toLowerCase().includes(selectedGender)
  })

  return (
    <div
      className="min-h-screen p-6 transition-colors duration-500"
      style={{ background: '#09090B', color: '#F4F0E8' }}
    >
      {/* Header */}
      <header className="pt-8 pb-6 flex items-start justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-0 bg-transparent cursor-pointer"
            style={{ color: 'rgba(244, 240, 232, 0.5)' }}
          >
            <span>←</span>
            <span>Back</span>
          </button>
        )}
      </header>

      <h1 className="font-serif text-[12vw] min-[375px]:text-5xl leading-none mb-6 tracking-[-0.02em]">
        Sneaker Index
      </h1>

      {/* Поиск */}
      <div className="mb-6">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleSearchSubmit}
          placeholder="Модель (576, Dunk, 550...) + Enter"
          className="w-full px-4 py-3.5 rounded-xl text-[15px] font-sans outline-none bg-[#1A1A1A] placeholder:text-white/30"
          style={{
            color: '#F4F0E8',
            border: '1px solid rgba(244, 240, 232, 0.12)',
          }}
        />
        <p className="mt-2 text-[11px] opacity-40 font-sans">
          Нажми Enter. Если выбран бренд — поиск идёт по «бренд + модель»
        </p>
      </div>

      {/* Бренды */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none">
        {BRANDS.map((brand) => {
          const isActive = selectedBrand === brand.id && !hasSearched
          return (
            <button
              key={brand.id}
              onClick={() => handleBrandClick(brand.id)}
              className="px-4 py-2 rounded-full text-[11px] font-sans uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all"
              style={{
                background: isActive ? '#F4F0E8' : 'transparent',
                color: isActive ? '#09090B' : '#F4F0E8',
                border: '1px solid rgba(244, 240, 232, 0.18)',
              }}
            >
              {brand.name}
            </button>
          )
        })}
      </div>

      {/* Пол */}
      <div className="flex gap-2 mb-8">
        {GENDERS.map((gender) => {
          const isActive = selectedGender === gender.id
          return (
            <button
              key={gender.id}
              onClick={() => setSelectedGender(gender.id)}
              className="px-3.5 py-1.5 rounded-lg text-[10px] font-sans uppercase tracking-widest cursor-pointer transition-all"
              style={{
                background: isActive ? 'rgba(244, 240, 232, 0.15)' : 'transparent',
                color: isActive ? '#F4F0E8' : 'rgba(244, 240, 232, 0.45)',
                border: '1px solid rgba(244, 240, 232, 0.1)',
              }}
            >
              {gender.name}
            </button>
          )
        })}
      </div>

      {error && (
        <p className="text-[13px] font-sans text-red-400 mb-8">{error}</p>
      )}

      {/* Скелетоны-заглушки вместо пустого экрана во время загрузки */}
      {loading && (
        <div className="flex flex-col gap-10 pb-10 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="border-b pb-10" style={{ borderColor: 'rgba(244, 240, 232, 0.06)' }}>
              <div className="w-full h-64 rounded-2xl mb-5 bg-[#161618]" />
              <div className="flex justify-between items-start mb-3">
                <div className="h-6 w-28 bg-[#161618] rounded" />
                <div className="h-5 w-16 bg-[#161618] rounded" />
              </div>
              <div className="h-4 w-3/4 bg-[#161618] rounded mb-4" />
              <div className="h-3 w-24 bg-[#161618] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Карточки */}
      {!loading && (
        <div className="flex flex-col gap-10 pb-10">
          {filteredSneakers.map((sneaker) => (
            <div
              key={sneaker.id}
              className="border-b pb-10"
              style={{ borderColor: 'rgba(244, 240, 232, 0.12)' }}
            >
              {sneaker.image?.original && (
                <div className="w-full rounded-2xl overflow-hidden mb-5 bg-[#141414]">
                  <img
                    src={sneaker.image.original}
                    alt={sneaker.name}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="flex justify-between items-start mb-2">
                <h3 className="font-serif text-[24px] leading-none tracking-tight">
                  {sneaker.brand}
                </h3>
                {sneaker.gender && (
                  <span className="text-[9px] font-sans uppercase tracking-widest px-2.5 py-1 rounded bg-[#1A1A1A] opacity-70">
                    {sneaker.gender}
                  </span>
                )}
              </div>

              <p
                className="text-[15px] font-sans font-light mb-4 leading-snug"
                style={{ color: 'rgba(244, 240, 232, 0.65)' }}
              >
                {sneaker.name}
              </p>

              {sneaker.retailPrice > 0 && (
                <p className="text-[11px] font-sans font-medium uppercase tracking-[0.18em]">
                  Retail · ${sneaker.retailPrice}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Если после фильтрации пусто */}
      {!loading && !error && sneakers.length > 0 && filteredSneakers.length === 0 && (
        <div className="mb-8 text-center py-6">
          <p className="text-[13px] font-sans opacity-60 mb-2">
            В текущей порции нет моделей для этого пола. Нажмите «Загрузить ещё», чтобы подгрузить следующие.
          </p>
        </div>
      )}

      {/* Кнопка подгрузки */}
      {!loading && !error && hasMore && (
        <div className="pb-28 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full py-4 rounded-xl text-[12px] font-sans uppercase tracking-widest cursor-pointer transition-all"
            style={{
              background: 'rgba(244, 240, 232, 0.1)',
              color: '#F4F0E8',
              border: '1px solid rgba(244, 240, 232, 0.15)',
            }}
          >
            {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
          </button>
        </div>
      )}
    </div>
  )
}
