import { useEffect, useState, useCallback, KeyboardEvent } from 'react'

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
  const [activeQuery, setActiveQuery] = useState('nike') // то, что реально уходит в API
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  // Загрузка данных
  const fetchSneakers = useCallback(async (query: string) => {
    setLoading(true)
    setError('')
    setSneakers([])

    try {
      const res = await fetch(
        `/api/get-top-sneakers?query=${encodeURIComponent(query)}&limit=50`
      )
      if (!res.ok) throw new Error('Ошибка при загрузке данных')

      const data = await res.json()

      // API может возвращать results или data
      const list = data.results || data.data || data || []
      setSneakers(Array.isArray(list) ? list : [])
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить кроссовки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSneakers(activeQuery)
  }, [activeQuery, fetchSneakers])

  // Клик по бренду
  const handleBrandClick = (brandId: string) => {
    setSelectedBrand(brandId)
    setSearchText('')
    setHasSearched(false)
    setActiveQuery(brandId)
  }

  // Поиск по Enter
  const handleSearchSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const text = searchText.trim()
      if (!text) return

      // Если выбран бренд — ищем "бренд + модель"
      // Это сильно улучшает поиск (например "new balance 576")
      const query =
        selectedBrand && selectedBrand !== 'all'
          ? `${selectedBrand} ${text}`
          : text

      setHasSearched(true)
      setActiveQuery(query)
    }
  }

  // Клиентская фильтрация по полу
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

      {/* Состояния */}
      {loading && (
        <p className="text-[12px] font-sans uppercase tracking-widest opacity-50 mb-8">
          Ищем в базе...
        </p>
      )}

      {error && (
        <p className="text-[13px] font-sans text-red-400 mb-8">{error}</p>
      )}

      {!loading && !error && filteredSneakers.length === 0 && (
        <div className="mb-10">
          <p className="text-[13px] font-sans opacity-60 mb-2">
            Ничего не найдено по запросу «{activeQuery}»
          </p>
          <p className="text-[12px] font-sans opacity-40">
            Попробуй другой бренд или более точную модель (например 576, 550, Dunk Low)
          </p>
        </div>
      )}

      {/* Карточки */}
      <div className="flex flex-col gap-10 pb-28">
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
    </div>
  )
}
