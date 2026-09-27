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
  { id: 'jordan', name: 'Jordan' },
  { id: 'adidas', name: 'Adidas' },
  { id: 'yeezy', name: 'Yeezy' },
  { id: 'new balance', name: 'New Balance' },
  { id: 'asics', name: 'Asics' },
  { id: 'converse', name: 'Converse' },
  { id: 'vans', name: 'Vans' },
  { id: 'puma', name: 'Puma' },
  { id: 'reebok', name: 'Reebok' },
  { id: 'saucony', name: 'Saucony' },
  { id: 'mizuno', name: 'Mizuno' },
  { id: 'salomon', name: 'Salomon' },
  { id: 'hoka', name: 'Hoka' },
  { id: 'on', name: 'On Running' },
  { id: 'merrell', name: 'Merrell' },
  { id: 'oakley', name: 'Oakley' },
  { id: 'arcteryx', name: "Arc'teryx" },
  { id: 'bape', name: 'BAPE' },
  { id: 'supreme', name: 'Supreme' },
  { id: 'fear of god', name: 'Fear of God' },
  { id: 'kith', name: 'Kith' },
  { id: 'palace', name: 'Palace' },
  { id: 'dc shoes', name: 'DC Shoes' },
  { id: 'balenciaga', name: 'Balenciaga' },
  { id: 'off-white', name: 'Off-White' },
  { id: 'gucci', name: 'Gucci' },
  { id: 'prada', name: 'Prada' },
  { id: 'louis vuitton', name: 'Louis Vuitton' },
  { id: 'dior', name: 'Dior' },
  { id: 'maison margiela', name: 'Maison Margiela' },
  { id: 'rick owens', name: 'Rick Owens' },
  { id: 'alexander mcqueen', name: 'Alexander McQueen' },
  { id: 'lanvin', name: 'Lanvin' },
  { id: 'crocs', name: 'Crocs' },
  { id: 'timberland', name: 'Timberland' },
  { id: 'ugg', name: 'UGG' },
  { id: 'dr. martens', name: 'Dr. Martens' },
  { id: 'birkenstock', name: 'Birkenstock' },
  { id: 'clarks', name: 'Clarks' },
  { id: 'mschf', name: 'MSCHF' }
]

const GENDERS = [
  { id: 'all', name: 'Все' },
  { id: 'men', name: 'Мужские' },
  { id: 'women', name: 'Женские' },
]

// Добавлен пропс theme для управления светлой/темной версиями
interface SneakerIndexProps {
  onBack?: () => void
  theme?: 'light' | 'dark'
}

export default function SneakerIndex({ onBack, theme = 'dark' }: SneakerIndexProps) {
  const [sneakers, setSneakers] = useState<Sneaker[]>([])
  const [favorites, setFavorites] = useState<Sneaker[]>([])
  const [viewState, setViewState] = useState<'catalog' | 'favorites'>('catalog')
  
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

  const cacheRef = useRef<Record<string, Sneaker[]>>({})

  const isDark = theme === 'dark'

  // Динамическая палитра для светлой и темной тем
  const themeColors = {
    bg: isDark ? '#09090B' : '#F4F0E8',
    text: isDark ? '#F4F0E8' : '#09090B',
    textMuted: isDark ? 'rgba(244, 240, 232, 0.4)' : 'rgba(9, 9, 11, 0.4)',
    textFaint: isDark ? 'rgba(244, 240, 232, 0.3)' : 'rgba(9, 9, 11, 0.3)',
    border: isDark ? 'rgba(244, 240, 232, 0.12)' : 'rgba(9, 9, 11, 0.12)',
    borderFaint: isDark ? 'rgba(244, 240, 232, 0.05)' : 'rgba(9, 9, 11, 0.05)',
    imageBg: isDark ? '#111111' : '#E8E3D9',
    iconHover: isDark ? 'hover:text-white' : 'hover:text-black',
  }

  // Загрузка избранного при старте
  useEffect(() => {
    const savedFavs = localStorage.getItem('lookbook_favorites')
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs))
      } catch (e) {
        console.error('Failed to parse favorites')
      }
    }
  }, [])

  // Сохранение избранного при изменении
  useEffect(() => {
    localStorage.setItem('lookbook_favorites', JSON.stringify(favorites))
  }, [favorites])

  const fetchSneakers = useCallback(async (query: string, pageNum: number, append: boolean = false) => {
    const cacheKey = `${query}_p${pageNum}`

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
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Не удалось загрузить кроссовки')
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (viewState === 'catalog') {
      setPage(1)
      fetchSneakers(activeQuery, 1, false)
    }
  }, [activeQuery, fetchSneakers, viewState])

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
      setViewState('catalog')
    }
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchSneakers(activeQuery, nextPage, true)
  }

  const handleCardClick = (sneaker: Sneaker) => {
    const searchQuery = `${sneaker.brand} ${sneaker.name} купити в Україні`
    const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`

    const tg = (window as any).Telegram?.WebApp
    if (tg?.openLink) {
      tg.openLink(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const toggleFavorite = (e: React.MouseEvent, sneaker: Sneaker) => {
    e.stopPropagation() 
    setFavorites(prev => {
      const isFav = prev.some(item => item.id === sneaker.id)
      if (isFav) return prev.filter(item => item.id !== sneaker.id)
      return [...prev, sneaker]
    })
  }

  const handleShare = async (e: React.MouseEvent, sneaker: Sneaker) => {
    e.stopPropagation()
    const shareData = {
      title: `${sneaker.brand} ${sneaker.name}`,
      text: `Смотри, что я нашел: ${sneaker.brand} ${sneaker.name}`,
      url: window.location.href
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log('Share canceled')
      }
    } else {
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.url}`)
      alert('Ссылка скопирована в буфер обмена!')
    }
  }

  const filteredCatalog = sneakers.filter((sneaker) => {
    if (selectedGender === 'all') return true
    if (!sneaker.gender) return false
    const genderStr = sneaker.gender.toLowerCase()

    if (selectedGender === 'men') {
      return genderStr === 'men' || (genderStr.includes('men') && !genderStr.includes('women'))
    }
    if (selectedGender === 'women') {
      return genderStr.includes('women')
    }
    return genderStr.includes(selectedGender)
  })

  const currentDisplayList = viewState === 'favorites' ? favorites : filteredCatalog

  return (
    <div
      className="min-h-screen p-6 transition-colors duration-500"
      style={{ background: themeColors.bg, color: themeColors.text }}
    >
      {/* Header */}
      <header 
        className="pt-8 pb-6 flex items-start justify-between mb-8"
        style={{ borderBottom: `1px solid ${themeColors.borderFaint}` }}
      >
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-0 bg-transparent cursor-pointer transition-opacity hover:opacity-100"
            style={{ color: themeColors.textMuted }}
          >
            <span>←</span>
            <span>Back</span>
          </button>
        ) : <div />}

        {/* Кнопка переключения Избранного */}
        <button
          onClick={() => setViewState(viewState === 'catalog' ? 'favorites' : 'catalog')}
          className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] transition-colors"
          style={{ color: viewState === 'favorites' ? themeColors.text : themeColors.textMuted }}
        >
          <span>Archive</span>
          <span>[{favorites.length}]</span>
        </button>
      </header>

      <h1 className="font-serif text-[12vw] min-[375px]:text-5xl leading-none mb-8 tracking-[-0.02em]">
        {viewState === 'favorites' ? 'Saved Archive' : 'Sneaker Index'}
      </h1>

      {viewState === 'catalog' && (
        <>
          {/* Поиск */}
          <div className="mb-6">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleSearchSubmit}
              placeholder="Модель (576, Dunk, 550...) + Enter"
              className={`w-full px-4 py-3.5 rounded-none text-[13px] font-sans outline-none bg-transparent transition-colors ${isDark ? 'placeholder:text-white/30 focus:border-white/40' : 'placeholder:text-black/30 focus:border-black/40'}`}
              style={{
                color: themeColors.text,
                borderBottom: `1px solid ${themeColors.border}`,
              }}
            />
          </div>

          {/* Бренды */}
          <div className="relative mb-6">
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none pr-12">
              {BRANDS.map((brand) => {
                const isActive = selectedBrand === brand.id && !hasSearched
                return (
                  <button
                    key={brand.id}
                    onClick={() => handleBrandClick(brand.id)}
                    className="text-[10px] font-sans uppercase tracking-[0.15em] whitespace-nowrap cursor-pointer transition-all shrink-0 pb-1"
                    style={{
                      color: isActive ? themeColors.text : themeColors.textMuted,
                      borderBottom: isActive ? `1px solid ${themeColors.text}` : '1px solid transparent',
                    }}
                  >
                    {brand.name}
                  </button>
                )
              })}
            </div>
            
            {/* Градиент затемнения справа - теперь адаптируется под цвет фона */}
            <div 
              className="absolute top-0 right-0 bottom-4 w-12 pointer-events-none" 
              style={{ background: `linear-gradient(to left, ${themeColors.bg} 20%, transparent 100%)` }}
            />
          </div>

          {/* Пол */}
          <div className="flex gap-4 mb-10">
            {GENDERS.map((gender) => {
              const isActive = selectedGender === gender.id
              return (
                <button
                  key={gender.id}
                  onClick={() => setSelectedGender(gender.id)}
                  className="text-[9px] font-sans uppercase tracking-widest cursor-pointer transition-all"
                  style={{ color: isActive ? themeColors.text : themeColors.textFaint }}
                >
                  {gender.name}
                </button>
              )
            })}
          </div>
        </>
      )}

      {error && (
        <p className="text-[11px] font-sans uppercase tracking-widest text-red-400/80 mb-8">{error}</p>
      )}

      {/* Скелетоны */}
      {loading && viewState === 'catalog' && (
        <div className="flex flex-col gap-12 pb-10 animate-pulse">
          {[1, 2].map((n) => (
            <div key={n} className="pb-8">
              <div 
                className="w-full h-[350px] mb-4" 
                style={{ backgroundColor: themeColors.imageBg }}
              />
              <div 
                className="h-5 w-32 mb-2" 
                style={{ backgroundColor: themeColors.imageBg }} 
              />
              <div 
                className="h-4 w-48" 
                style={{ backgroundColor: themeColors.imageBg }} 
              />
            </div>
          ))}
        </div>
      )}

      {/* Карточки */}
      {!loading && (
        <div className="flex flex-col gap-14 pb-10">
          {currentDisplayList.length === 0 && viewState === 'favorites' && (
            <p 
              className="text-[12px] font-sans uppercase tracking-widest text-center py-20"
              style={{ color: themeColors.textMuted }}
            >
              Архив пуст
            </p>
          )}

          {currentDisplayList.map((sneaker) => {
            const isFav = favorites.some(f => f.id === sneaker.id)

            return (
              <div
                key={sneaker.id}
                onClick={() => handleCardClick(sneaker)}
                className="cursor-pointer group flex flex-col"
                style={{ contentVisibility: 'auto' }}
              >
                {sneaker.image?.original ? (
                  <div 
                    className="w-full overflow-hidden mb-4 aspect-[4/3] flex items-center justify-center"
                    style={{ backgroundColor: themeColors.imageBg }}
                  >
                    <img
                      src={sneaker.image.original}
                      alt={sneaker.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div 
                    className="w-full mb-4 aspect-[4/3]" 
                    style={{ backgroundColor: themeColors.imageBg }}
                  />
                )}

                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-serif text-[20px] leading-tight tracking-tight">
                    {sneaker.brand}
                  </h3>
                  
                  {/* Иконки действий */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => handleShare(e, sneaker)}
                      className={`p-1 transition-colors ${themeColors.iconHover}`}
                      style={{ color: themeColors.textMuted }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square">
                        <path d="M4 12v8h16v-8" />
                        <path d="M12 4v12" />
                        <path d="M8 8l4-4 4 4" />
                      </svg>
                    </button>
                    <button 
                      onClick={(e) => toggleFavorite(e, sneaker)}
                      className="p-1 transition-colors"
                      style={{ color: isFav ? themeColors.text : themeColors.textMuted }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <p 
                  className="text-[13px] font-sans font-light leading-snug mb-3 pr-12"
                  style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                >
                  {sneaker.name}
                </p>

                <div 
                  className="flex justify-between items-center pt-3"
                  style={{ borderTop: `1px solid ${themeColors.borderFaint}` }}
                >
                  <p 
                    className="text-[9px] font-sans font-medium uppercase tracking-[0.2em]"
                    style={{ color: themeColors.textMuted }}
                  >
                    {sneaker.retailPrice > 0 ? `Retail USD ${sneaker.retailPrice}` : 'Price unav.'}
                  </p>
                  <span 
                    className={`text-[9px] font-sans uppercase tracking-[0.2em] transition-colors ${themeColors.iconHover}`}
                    style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}
                  >
                    Find →
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Кнопка подгрузки */}
      {!loading && !error && hasMore && viewState === 'catalog' && (
        <div 
          className="pb-28 pt-8 text-center"
          style={{ borderTop: `1px solid ${themeColors.borderFaint}` }}
        >
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="text-[10px] font-sans uppercase tracking-[0.3em] cursor-pointer transition-all opacity-60 hover:opacity-100"
          >
            {loadingMore ? 'Loading...' : '+ Load Archive'}
          </button>
        </div>
      )}
    </div>
  )
}
