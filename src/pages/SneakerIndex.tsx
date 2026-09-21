import { useEffect, useState } from 'react'

interface Sneaker {
  id: string
  brand: string
  name: string
  gender: string
  retailPrice: number
  image: {
    original: string
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
  { id: 'converse', name: 'Converse' }
]

const GENDERS = [
  { id: 'all', name: 'Все' },
  { id: 'men', name: 'Мужские' },
  { id: 'women', name: 'Женские' },
  { id: 'kid', name: 'Детские' }
]

export default function SneakerIndex({ onBack }: { onBack?: () => void }) {
  const [sneakers, setSneakers] = useState<Sneaker[]>([])
  const [selectedBrand, setSelectedBrand] = useState('nike')
  const [selectedGender, setSelectedGender] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    
    fetch(`/api/get-top-sneakers?query=${selectedBrand}&limit=100`)
      .then((res) => {
        if (!res.ok) throw new Error('Ошибка при загрузке данных')
        return res.json()
      })
      .then((data) => {
        if (data.results) {
          setSneakers(data.results)
        } else {
          setSneakers([])
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [selectedBrand])

  // Фильтрация по полу и строке поиска
  const filteredSneakers = sneakers.filter((sneaker) => {
    const matchesGender = selectedGender === 'all' || (sneaker.gender && sneaker.gender.toLowerCase().includes(selectedGender))
    const matchesSearch = searchText === '' || 
      sneaker.name.toLowerCase().includes(searchText.toLowerCase()) || 
      sneaker.brand.toLowerCase().includes(searchText.toLowerCase())
    return matchesGender && matchesSearch
  })

  return (
    <div className="min-h-screen p-6 transition-colors duration-500" style={{ background: '#09090B', color: '#F4F0E8' }}>
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

      {/* Строка поиска */}
      <div className="mb-6">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Поиск по названию модели..."
          className="w-full px-4 py-3 rounded-xl text-[14px] font-sans outline-none bg-[#1A1A1A]"
          style={{ 
            color: '#F4F0E8', 
            border: '1px solid rgba(244, 240, 232, 0.15)' 
          }}
        />
      </div>

      {/* Выбор брендов */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {BRANDS.map((brand) => (
          <button
            key={brand.id}
            onClick={() => setSelectedBrand(brand.id)}
            className="px-4 py-2 rounded-full text-[11px] font-sans uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all"
            style={{
              background: selectedBrand === brand.id ? '#F4F0E8' : 'transparent',
              color: selectedBrand === brand.id ? '#09090B' : '#F4F0E8',
              border: '1px solid rgba(244, 240, 232, 0.2)'
            }}
          >
            {brand.name}
          </button>
        ))}
      </div>

      {/* Фильтр по полу (Мужские / Женские / Детские) */}
      <div className="flex gap-2 mb-8">
        {GENDERS.map((gender) => (
          <button
            key={gender.id}
            onClick={() => setSelectedGender(gender.id)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-sans uppercase tracking-widest cursor-pointer transition-all"
            style={{
              background: selectedGender === gender.id ? 'rgba(244, 240, 232, 0.15)' : 'transparent',
              color: selectedGender === gender.id ? '#F4F0E8' : 'rgba(244, 240, 232, 0.5)',
              border: '1px solid rgba(244, 240, 232, 0.1)'
            }}
          >
            {gender.name}
          </button>
        ))}
      </div>

      {loading && <p className="text-[12px] font-sans uppercase tracking-widest opacity-50">Загрузка базы...</p>}
      {error && <p className="text-[12px] font-sans text-red-500">{error}</p>}
      {!loading && !error && filteredSneakers.length === 0 && (
        <p className="text-[12px] font-sans uppercase tracking-widest opacity-50">Ничего не найдено</p>
      )}

      {/* Список карточек */}
      <div className="flex flex-col gap-8 pb-24">
        {filteredSneakers.map((sneaker) => (
          <div key={sneaker.id} className="border-b pb-8" style={{ borderColor: 'rgba(244, 240, 232, 0.15)' }}>
            {sneaker.image?.original && (
              <div className="w-full rounded-xl overflow-hidden mb-5 bg-[#1A1A1A]">
                <img 
                  src={sneaker.image.original} 
                  alt={sneaker.name} 
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-serif text-[26px] leading-none">{sneaker.brand}</h3>
              {sneaker.gender && (
                <span className="text-[9px] font-sans uppercase tracking-widest px-2 py-1 rounded bg-[#1A1A1A] opacity-70">
                  {sneaker.gender}
                </span>
              )}
            </div>
            <p className="text-[14px] font-sans font-light mb-4" style={{ color: 'rgba(244, 240, 232, 0.6)' }}>
              {sneaker.name}
            </p>
            {sneaker.retailPrice > 0 && (
              <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em]">
                Retail: ${sneaker.retailPrice}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
