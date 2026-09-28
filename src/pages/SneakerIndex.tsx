import { useEffect, useState, useCallback, useRef, KeyboardEvent } from 'react'

export type Lang = 'ru' | 'uk' | 'de'

interface Sneaker {
  id: string
  brand: string
  name: string
  gender: string
  retailPrice: number
  releaseDate?: string
  release_date?: string
  publishedAt?: string
  year?: string | number
  releaseYear?: string | number
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
  { id: 'veja', name: 'Veja' },
  { id: 'autry', name: 'Autry' },
  { id: 'lacoste', name: 'Lacoste' },
  { id: 'calvin klein', name: 'Calvin Klein' },
  { id: 'tommy hilfiger', name: 'Tommy Hilfiger' },
  { id: 'polo ralph lauren', name: 'Polo Ralph Lauren' },
  { id: 'dsquared2', name: 'Dsquared2' },
  { id: 'versace', name: 'Versace' },
  { id: 'valentino', name: 'Valentino' },
  { id: 'givenchy', name: 'Givenchy' },
  { id: 'under armour', name: 'Under Armour' },
  { id: 'fila', name: 'Fila' },
  { id: 'skechers', name: 'Skechers' },
  { id: 'etnies', name: 'Etnies' },
  { id: 'osiris', name: 'Osiris' },
  { id: 'dc', name: 'DC' }
]

function haptic(kind: 'light' | 'medium' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(kind)
    else if (navigator.vibrate) navigator.vibrate(kind === 'light' ? 20 : 40)
  } catch {}
}

function SneakerCard({ sneaker, isFav, toggleFavorite, t, themeColors, isDark, handleCardClick }: any) {
  const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [useProxyFallback, setUseProxyFallback] = useState(false)

  let rawUrl = sneaker.image?.original || null
  let finalSrc = null

  if (typeof rawUrl === 'string' && rawUrl.trim() !== '' && rawUrl !== 'null') {
    // 1. Очищаем от старых протоколов и мусорных параметров
    let cleanUrl = rawUrl.replace('http://', 'https://').split('?')[0]

    // 2. ХАК: Внедряем нативные параметры Imgix/StockX, чтобы притвориться их фронтендом
    if (cleanUrl.includes('stockx.com')) {
      cleanUrl = `${cleanUrl}?fit=fill&bg=FFFFFF&w=700&h=500&auto=format,compress&q=90&trim=color`
    }

    // 3. Собираем итоговую ссылку (с резервным прокси на случай жестких Telegram-политик)
    finalSrc = useProxyFallback ? `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}` : cleanUrl
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Защита от ложного 200 OK (когда Cloudflare отдает HTML с капчей вместо картинки)
    if (e.currentTarget.naturalWidth <= 1) {
      handleImageError()
    } else {
      setImgState('loaded')
    }
  }

  const handleImageError = () => {
    if (!useProxyFallback) {
      setUseProxyFallback(true) // Включаем единственный надежный резерв
      setImgState('loading')
    } else {
      setImgState('error') // Сдаемся окончательно
    }
  }

  const rawDate = sneaker.releaseDate || sneaker.release_date || sneaker.publishedAt
  const rawYear = sneaker.year || sneaker.releaseYear
  let releaseYear = null
  if (rawDate && typeof rawDate === 'string' && rawDate.length >= 4) {
    const parsed = rawDate.slice(0, 4)
    if (parsed !== '0000') releaseYear = parsed
  } else if (rawYear && String(rawYear) !== '0') {
    releaseYear = String(rawYear)
  }

  return (
    <div onClick={() => handleCardClick(sneaker)} className="cursor-pointer group flex flex-col">
      {finalSrc ? (
        <div
          className="w-full overflow-hidden mb-4 aspect-[4/3] flex items-center justify-center transition-colors rounded-sm relative"
          style={{ backgroundColor: themeColors.imageBg }}
        >
          {imgState !== 'error' && (
            <img
              src={finalSrc}
              alt={sneaker.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${imgState === 'loading' ? 'opacity-0' : 'opacity-100'}`}
              style={{
                mixBlendMode: isDark ? 'normal' : 'multiply',
                filter: isDark ? 'drop-shadow(0 15px 25px rgba(0,0,0,0.4))' : 'drop-shadow(0 15px 20px rgba(0,0,0,0.08))'
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
          {imgState === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center break-all z-10">
              <span className="text-[11px] font-sans uppercase font-bold text-red-500 mb-2">Заблокировано</span>
              <span 
                className="text-[9px] font-sans opacity-40 select-all" 
                style={{ color: themeColors.text }}
                onClick={(e) => e.stopPropagation()}
              >
                {rawUrl}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          className="w-full mb-4 aspect-[4/3] rounded-sm flex items-center justify-center"
          style={{ backgroundColor: themeColors.imageBg }}
        >
          <span className="text-[10px] font-sans uppercase opacity-30 text-center" style={{ color: themeColors.text }}>
            Нет фото
          </span>
        </div>
      )}

      <div className="flex justify-between items-start mb-1">
        <h3 className="font-serif text-[20px] leading-tight tracking-tight">
          {sneaker.brand}
        </h3>
        <button
          onClick={(e) => toggleFavorite(e, sneaker)}
          className="p-1 outline-none bg-transparent border-none cursor-pointer transition-colors"
          style={{ color: isFav ? themeColors.text : themeColors.textMuted }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <p
        className="text-[13px] font-sans font-light leading-snug mb-3 pr-4"
        style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
      >
        {sneaker.name} {releaseYear ? `— ${releaseYear}` : ''}
      </p>

      <div
        className="flex justify-between items-center pt-3"
        style={{ borderTop: `1px solid ${themeColors.borderFaint}` }}
      >
        <p
          className="text-[9px] font-sans font-medium uppercase tracking-[0.2em]"
          style={{ color: themeColors.textMuted }}
        >
          {sneaker.retailPrice > 0 ? `${t.retail} ${sneaker.retailPrice}` : t.priceUnav}
        </p>
        <span
          className={`text-[9px] font-sans uppercase tracking-[0.2em] transition-colors ${themeColors.iconHover}`}
          style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}
        >
          {t.find} →
        </span>
      </div>
    </div>
  )
}

interface SneakerIndexProps {
  onBack?: () => void
  theme?: 'light' | 'dark'
  lang?: Lang
}

export default function SneakerIndex({ onBack, theme: propTheme, lang }: SneakerIndexProps) {
  const getActiveLang = (): Lang => {
    if (lang) return lang
    
    if (typeof window !== 'undefined') {
      try {
        const savedLang = localStorage.getItem('cordwainer_lang') || localStorage.getItem('app_lang')
        if (savedLang === 'ru' || savedLang === 'uk' || savedLang === 'de') {
          return savedLang as Lang
        }
      } catch (e) {}

      const tg = (window as any).Telegram?.WebApp
      const tgLang = tg?.initDataUnsafe?.user?.language_code
      if (tgLang === 'uk' || tgLang === 'ukr') return 'uk'
      if (tgLang === 'de') return 'de'
    }
    return 'ru'
  }

  const activeLang = getActiveLang()

  const t = {
    ru: {
      back: 'Назад',
      archive: 'Архив',
      savedArchive: 'Сохраненный архив',
      sneakerIndex: 'Footwear Index',
      searchPlaceholder: 'Модель (576, Dunk, 550...) + Enter',
      all: 'Все',
      men: 'Мужские',
      women: 'Женские',
      emptyArchive: 'Архив пуст',
      notFound: 'Ничего не найдено',
      priceUnav: 'Нет цены',
      retail: 'Розница USD',
      find: 'Найти',
      loadMore: '+ Загрузить еще',
      loading: 'Загрузка...',
      errorLoad: 'Ошибка при загрузке данных',
      errorSneakers: 'Не удалось загрузить каталог',
      errorRateLimit: 'Слишком много запросов. Подождите минуту.',
      scrollTop: 'Наверх',
      scrollReturn: 'Вернуться к месту',
      searchSuffix: 'купить',
    },
    uk: {
      back: 'Назад',
      archive: 'Архів',
      savedArchive: 'Збережений архів',
      sneakerIndex: 'Footwear Index',
      searchPlaceholder: 'Модель (576, Dunk, 550...) + Enter',
      all: 'Всі',
      men: 'Чоловічі',
      women: 'Жіночі',
      emptyArchive: 'Архів порожній',
      notFound: 'Нічого не знайдено',
      priceUnav: 'Немає ціни',
      retail: 'Роздріб USD',
      find: 'Знайти',
      loadMore: '+ Завантажити ще',
      loading: 'Завантаження...',
      errorLoad: 'Помилка завантаження даних',
      errorSneakers: 'Не вдалося завантажити каталог',
      errorRateLimit: 'Забагато запитів. Зачекайте хвилину.',
      scrollTop: 'Вгору',
      scrollReturn: 'Повернутися',
      searchSuffix: 'купити в Україні',
    },
    de: {
      back: 'Zurück',
      archive: 'Archiv',
      savedArchive: 'Gespeichertes Archiv',
      sneakerIndex: 'Footwear Index',
      searchPlaceholder: 'Modell (576, Dunk, 550...) + Enter',
      all: 'Alle',
      men: 'Herren',
      women: 'Damen',
      emptyArchive: 'Archiv leer',
      notFound: 'Nichts gefunden',
      priceUnav: 'Preis n.v.',
      retail: 'UVP USD',
      find: 'Finden',
      loadMore: '+ Mehr laden',
      loading: 'Wird geladen...',
      errorLoad: 'Fehler beim Laden der Daten',
      errorSneakers: 'Katalog konnte nicht geladen werden',
      errorRateLimit: 'Zu viele Anfragen. Bitte warten Sie eine Minute.',
      scrollTop: 'Nach oben',
      scrollReturn: 'Zurückspringen',
      searchSuffix: 'kaufen',
    },
  }[activeLang]

  const GENDERS = [
    { id: 'all', name: t.all },
    { id: 'men', name: t.men },
    { id: 'women', name: t.women },
  ]

  const getInitialQuery = (): string | null => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) return q.trim()

    const tg = (window as any).Telegram?.WebApp
    const startParam = tg?.initDataUnsafe?.start_param || params.get('tgWebAppStartParam') || null

    if (startParam && typeof startParam === 'string' && startParam.startsWith('search_')) {
      return startParam.slice('search_'.length).replace(/_/g, ' ').trim()
    }
    return null
  }

  const initialQuery = getInitialQuery()

  const [sneakers, setSneakers] = useState<Sneaker[]>([])
  const [favorites, setFavorites] = useState<Sneaker[]>([])
  const [viewState, setViewState] = useState<'catalog' | 'favorites'>('catalog')

  const [selectedBrand, setSelectedBrand] = useState(initialQuery ? 'all' : 'nike')
  const [selectedGender, setSelectedGender] = useState('all')
  const [searchText, setSearchText] = useState(initialQuery || '')
  const [activeQuery, setActiveQuery] = useState(initialQuery || 'nike')

  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(!!initialQuery)

  const [buttonMode, setButtonMode] = useState<'hidden' | 'up' | 'down'>('hidden')
  const returnYRef = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  const [isDark, setIsDark] = useState(propTheme === 'light' ? false : true)
  const cacheRef = useRef<Record<string, Sneaker[]>>({})

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      const currentY = container.scrollTop
      
      if (currentY > 600) {
        setButtonMode(prev => prev !== 'up' ? 'up' : prev)
      } else if (currentY < 100 && returnYRef.current !== null) {
        setButtonMode(prev => prev !== 'down' ? 'down' : prev)
      } else {
        setButtonMode(prev => prev !== 'hidden' ? 'hidden' : prev)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSmartScroll = () => {
    haptic('light')
    const container = scrollRef.current
    if (!container) return
    
    if (buttonMode === 'up') {
      returnYRef.current = container.scrollTop
      container.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (buttonMode === 'down' && returnYRef.current !== null) {
      container.scrollTo({ top: returnYRef.current, behavior: 'smooth' })
      setTimeout(() => { returnYRef.current = null }, 1000)
    }
  }

  useEffect(() => {
    if (propTheme) {
      setIsDark(propTheme === 'dark')
      return
    }

    const checkGlobalTheme = () => {
      const html = document.documentElement
      const body = document.body

      if (html.classList.contains('light') || body.classList.contains('light')) return false
      if (html.classList.contains('dark') || body.classList.contains('dark')) return true

      if (html.getAttribute('data-theme') === 'light') return false
      if (html.getAttribute('data-theme') === 'dark') return true

      try {
        const lsTheme = localStorage.getItem('theme') || localStorage.getItem('app-theme') || localStorage.getItem('color-theme')
        if (lsTheme === 'light') return false
        if (lsTheme === 'dark') return true
      } catch (e) {}

      return true
    }

    setIsDark(checkGlobalTheme())

    const observer = new MutationObserver(() => {
      setIsDark(checkGlobalTheme())
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [propTheme])

  const themeColors = {
    bg: isDark ? '#09090B' : '#F4F0E8',
    text: isDark ? '#F4F0E8' : '#09090B',
    textMuted: isDark ? 'rgba(244, 240, 232, 0.4)' : 'rgba(9, 9, 11, 0.4)',
    textFaint: isDark ? 'rgba(244, 240, 232, 0.3)' : 'rgba(9, 9, 11, 0.3)',
    border: isDark ? 'rgba(244, 240, 232, 0.12)' : 'rgba(9, 9, 11, 0.12)',
    borderFaint: isDark ? 'rgba(244, 240, 232, 0.05)' : 'rgba(9, 9, 11, 0.05)',
    imageBg: isDark ? '#1C1C1E' : '#E5E7EB',
    iconHover: isDark ? 'hover:text-white' : 'hover:text-black',
  }

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
    }
    setError('')

    try {
      const res = await fetch(
        `/api/get-top-sneakers?query=${encodeURIComponent(query)}&limit=100&page=${pageNum}`
      )

      const text = await res.text()

      const upperText = text.toUpperCase()
      if (upperText.includes('<HTML') || upperText.includes('TOO MANY REQUESTS') || upperText.includes('RATE LIMIT')) {
        throw new Error('RATE_LIMIT')
      }

      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error('PARSE_ERROR')
      }

      if (data.ERROR === 'RATE LIMIT EXCEEDED' || data.error === 'RATE LIMIT EXCEEDED') {
        throw new Error('RATE_LIMIT')
      }

      if (!res.ok) {
        throw new Error(data.details || data.error || data.message || data.MESSAGE || t.errorLoad)
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
        if (err.message === 'RATE_LIMIT') {
          setError(t.errorRateLimit)
        } else {
          setError(t.errorSneakers)
        }
      } else {
        setError(t.errorSneakers)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [t])

  useEffect(() => {
    if (viewState === 'catalog') {
      setPage(1)
      fetchSneakers(activeQuery, 1, false)
    }
  }, [activeQuery, fetchSneakers, viewState])

  const handleBrandClick = (brandId: string) => {
    haptic('light')
    setSelectedBrand(brandId)
    setSearchText('')
    setHasSearched(false)
    setActiveQuery(brandId)

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname)
    }
  }

  const handleSearchSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    const text = searchText.trim()
    if (!text) return

    setHasSearched(true)
    setActiveQuery(text)
    setViewState('catalog')

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname)
     }
   }
 }
  const clearSearch = () => {
    setSearchText('')
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  const handleLoadMore = () => {
    haptic('light')
    const nextPage = page + 1
    setPage(nextPage)
    fetchSneakers(activeQuery, nextPage, true)
  }

  const handleCardClick = (sneaker: Sneaker) => {
    const searchQuery = `${sneaker.brand} ${sneaker.name} ${t.searchSuffix}`
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
    haptic('medium')
    setFavorites(prev => {
      const isFav = prev.some(item => item.id === sneaker.id)
      if (isFav) return prev.filter(item => item.id !== sneaker.id)
      return [...prev, sneaker]
    })
  }

  const handleBackClick = () => {
    haptic('light')
    if (viewState === 'favorites') {
      setViewState('catalog')
    } else if (onBack) {
      onBack()
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
      ref={scrollRef}
      className="h-[100dvh] w-full overflow-y-auto p-6 transition-colors duration-500 relative"
      style={{ background: themeColors.bg, color: themeColors.text }}
    >
      <header
        className="pt-8 pb-6 flex items-start justify-between mb-8"
        style={{ borderBottom: `1px solid ${themeColors.borderFaint}` }}
      >
        <button
          onClick={handleBackClick}
          className="flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-0 bg-transparent cursor-pointer transition-opacity hover:opacity-100"
          style={{ color: themeColors.textMuted, visibility: (viewState === 'catalog' && !onBack) ? 'hidden' : 'visible' }}
        >
          <span>←</span>
          <span>{t.back}</span>
        </button>

        <button
          onClick={() => {
            haptic('light');
            setViewState(viewState === 'catalog' ? 'favorites' : 'catalog')
          }}
          className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] transition-colors outline-none bg-transparent border-none cursor-pointer"
          style={{ color: viewState === 'favorites' ? themeColors.text : themeColors.textMuted }}
        >
          <span>{t.archive}</span>
          <span>[{favorites.length}]</span>
        </button>
      </header>

      <h1 className="font-serif text-[12vw] min-[375px]:text-5xl leading-none mb-8 tracking-[-0.02em]">
        {viewState === 'favorites' ? t.savedArchive : t.sneakerIndex}
      </h1>

      {viewState === 'catalog' && (
        <>
          <div className="mb-6 relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleSearchSubmit}
              placeholder={t.searchPlaceholder}
              className={`w-full px-4 py-3.5 pr-10 rounded-none text-[13px] font-sans outline-none bg-transparent transition-colors ${isDark ? 'placeholder:text-white/30 focus:border-white/40' : 'placeholder:text-black/30 focus:border-black/40'}`}
              style={{
                color: themeColors.text,
                borderBottom: `1px solid ${themeColors.border}`,
              }}
            />
            {searchText && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 outline-none bg-transparent border-none cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: themeColors.text }}
                title="Очистить"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="relative mb-6">
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none pr-12">
              {BRANDS.map((brand) => {
                const isActive = selectedBrand === brand.id && !hasSearched
                return (
                  <button
                    key={brand.id}
                    onClick={() => handleBrandClick(brand.id)}
                    className="text-[10px] font-sans uppercase tracking-[0.15em] whitespace-nowrap cursor-pointer outline-none bg-transparent transition-all shrink-0 pb-1"
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

            <div
              className="absolute top-0 right-0 bottom-4 w-12 pointer-events-none"
              style={{ background: `linear-gradient(to left, ${themeColors.bg} 20%, transparent 100%)` }}
            />
          </div>

          <div className="flex gap-4 mb-10">
            {GENDERS.map((gender) => {
              const isActive = selectedGender === gender.id
              return (
                <button
                  key={gender.id}
                  onClick={() => { haptic('light'); setSelectedGender(gender.id); }}
                  className="text-[9px] font-sans uppercase tracking-widest cursor-pointer outline-none bg-transparent border-none transition-all"
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

      {loading && viewState === 'catalog' && sneakers.length === 0 && (
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

      {!loading || sneakers.length > 0 ? (
        <div className="flex flex-col gap-14 pb-10">
          {currentDisplayList.length === 0 && viewState === 'favorites' && (
            <p
              className="text-[12px] font-sans uppercase tracking-widest text-center py-20"
              style={{ color: themeColors.textMuted }}
            >
              {t.emptyArchive}
            </p>
          )}

          {currentDisplayList.length === 0 && viewState === 'catalog' && !error && !loading && (
            <p
              className="text-[12px] font-sans uppercase tracking-widest text-center py-20"
              style={{ color: themeColors.textMuted }}
            >
              {t.notFound}
            </p>
          )}

          {currentDisplayList.map((sneaker) => {
            const isFav = favorites.some(f => f.id === sneaker.id)
            return (
              <SneakerCard
                key={sneaker.id}
                sneaker={sneaker}
                isFav={isFav}
                toggleFavorite={toggleFavorite}
                t={t}
                themeColors={themeColors}
                isDark={isDark}
                handleCardClick={handleCardClick}
              />
            )
          })}
        </div>
      ) : null}

      {!loading && !error && hasMore && viewState === 'catalog' && currentDisplayList.length > 0 && (
        <div
          className="pb-28 pt-8 text-center"
          style={{ borderTop: `1px solid ${themeColors.borderFaint}` }}
        >
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="text-[10px] font-sans uppercase tracking-[0.3em] outline-none bg-transparent border-none cursor-pointer transition-all opacity-60 hover:opacity-100"
            style={{ color: themeColors.text }}
          >
            {loadingMore ? t.loading : t.loadMore}
          </button>
        </div>
      )}

      <button
        onClick={handleSmartScroll}
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-11 h-11 rounded-full outline-none shadow-lg transition-all duration-500 cursor-pointer backdrop-blur-md ${
          buttonMode !== 'hidden' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{
          background: isDark ? 'rgba(25, 25, 25, 0.8)' : 'rgba(240, 235, 225, 0.8)',
          border: `1px solid ${themeColors.border}`,
          color: themeColors.text,
        }}
        title={buttonMode === 'up' ? t.scrollTop : t.scrollReturn}
      >
        <svg 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="square"
          className={`transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            buttonMode === 'down' ? 'rotate-180' : 'rotate-0'
          }`}
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </div>
  )
}
