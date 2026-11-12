import React, { useEffect, useState, useCallback, useRef, useMemo, KeyboardEvent } from 'react'
import AboutView from './AboutView'

export type Lang = 'ru' | 'uk' | 'de'
type CategoryId = 'all' | 'sport' | 'streetwear' | 'luxury' | 'outdoor'
type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'year_desc'
type GridMode = 'editorial' | 'compact'

export interface Sneaker {
  id: string
  brand: string
  name: string
  gender: string
  retailPrice: number
  sku?: string | null
  releaseDate?: string | null
  release_date?: string | null
  publishedAt?: string | null
  year?: string | number | null
  releaseYear?: string | number | null
  image?: {
    original?: string | null
  }
}

interface BrandItem {
  id: string
  name: string
  category: CategoryId
}

const BRANDS: BrandItem[] = [
  // Sport & Running
  { id: 'nike', name: 'Nike', category: 'sport' },
  { id: 'jordan', name: 'Jordan', category: 'sport' },
  { id: 'adidas', name: 'Adidas', category: 'sport' },
  { id: 'yeezy', name: 'Yeezy', category: 'sport' },
  { id: 'new balance', name: 'New Balance', category: 'sport' },
  { id: 'asics', name: 'Asics', category: 'sport' },
  { id: 'puma', name: 'Puma', category: 'sport' },
  { id: 'reebok', name: 'Reebok', category: 'sport' },
  { id: 'saucony', name: 'Saucony', category: 'sport' },
  { id: 'mizuno', name: 'Mizuno', category: 'sport' },
  { id: 'hoka', name: 'Hoka', category: 'sport' },
  { id: 'on', name: 'On Running', category: 'sport' },
  { id: 'under armour', name: 'Under Armour', category: 'sport' },
  { id: 'fila', name: 'Fila', category: 'sport' },
  { id: 'skechers', name: 'Skechers', category: 'sport' },

  // Streetwear & Skate
  { id: 'converse', name: 'Converse', category: 'streetwear' },
  { id: 'vans', name: 'Vans', category: 'streetwear' },
  { id: 'bape', name: 'BAPE', category: 'streetwear' },
  { id: 'supreme', name: 'Supreme', category: 'streetwear' },
  { id: 'fear of god', name: 'Fear of God', category: 'streetwear' },
  { id: 'kith', name: 'Kith', category: 'streetwear' },
  { id: 'palace', name: 'Palace', category: 'streetwear' },
  { id: 'off-white', name: 'Off-White', category: 'streetwear' },
  { id: 'veja', name: 'Veja', category: 'streetwear' },
  { id: 'autry', name: 'Autry', category: 'streetwear' },
  { id: 'etnies', name: 'Etnies', category: 'streetwear' },
  { id: 'osiris', name: 'Osiris', category: 'streetwear' },
  { id: 'dc', name: 'DC', category: 'streetwear' },

  // Luxury & High Fashion
  { id: 'balenciaga', name: 'Balenciaga', category: 'luxury' },
  { id: 'gucci', name: 'Gucci', category: 'luxury' },
  { id: 'prada', name: 'Prada', category: 'luxury' },
  { id: 'louis vuitton', name: 'Louis Vuitton', category: 'luxury' },
  { id: 'dior', name: 'Dior', category: 'luxury' },
  { id: 'maison margiela', name: 'Maison Margiela', category: 'luxury' },
  { id: 'rick owens', name: 'Rick Owens', category: 'luxury' },
  { id: 'alexander mcqueen', name: 'Alexander McQueen', category: 'luxury' },
  { id: 'lanvin', name: 'Lanvin', category: 'luxury' },
  { id: 'versace', name: 'Versace', category: 'luxury' },
  { id: 'valentino', name: 'Valentino', category: 'luxury' },
  { id: 'givenchy', name: 'Givenchy', category: 'luxury' },
  { id: 'dsquared2', name: 'Dsquared2', category: 'luxury' },
  { id: 'lacoste', name: 'Lacoste', category: 'luxury' },
  { id: 'calvin klein', name: 'Calvin Klein', category: 'luxury' },
  { id: 'tommy hilfiger', name: 'Tommy Hilfiger', category: 'luxury' },
  { id: 'polo ralph lauren', name: 'Polo Ralph Lauren', category: 'luxury' },

  // Outdoor & Casual
  { id: 'salomon', name: 'Salomon', category: 'outdoor' },
  { id: 'arcteryx', name: "Arc'teryx", category: 'outdoor' },
  { id: 'merrell', name: 'Merrell', category: 'outdoor' },
  { id: 'oakley', name: 'Oakley', category: 'outdoor' },
  { id: 'timberland', name: 'Timberland', category: 'outdoor' },
  { id: 'ugg', name: 'UGG', category: 'outdoor' },
  { id: 'dr. martens', name: 'Dr. Martens', category: 'outdoor' },
  { id: 'birkenstock', name: 'Birkenstock', category: 'outdoor' },
  { id: 'clarks', name: 'Clarks', category: 'outdoor' },
  { id: 'crocs', name: 'Crocs', category: 'outdoor' },
]

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  ru: {
    back: 'Назад',
    catalog: 'Каталог',
    archive: 'Архив',
    info: 'Инфо',
    savedArchive: 'Сохраненный архив',
    sneakerIndex: 'Footwear Index',
    editorialSub: 'Digital Footwear Encyclopedia & Lookbook',
    searchPlaceholder: 'Модель, бренд или артикул (Dunk, 550, Tabi)...',
    searchBtn: 'Найти',
    allBrands: 'Все марки',
    catAll: 'Все сегменты',
    catSport: 'Спорт & Бег',
    catStreet: 'Стритвир',
    catLuxury: 'Люкс & Подиум',
    catOutdoor: 'Аутдор & Кэжуал',
    all: 'Все',
    men: 'Мужские',
    women: 'Женские',
    sortNewest: 'По новизне',
    sortPriceAsc: 'Цена ↑',
    sortPriceDesc: 'Цена ↓',
    sortYearDesc: 'По году',
    emptyArchive: 'Ваш архив избранных моделей пуст',
    notFound: 'По вашему запросу моделей не найдено',
    resetFilters: 'Сбросить фильтры',
    priceUnav: 'По запросу',
    retail: 'Ритейл',
    find: 'Подробнее',
    buySearch: 'Найти в продаже',
    copySku: 'Скопировать название',
    copied: 'Скопировано',
    loadMore: '+ Загрузить еще модели',
    loading: 'Загрузка каталога...',
    errorLoad: 'Ошибка при загрузке данных',
    errorSneakers: 'Не удалось загрузить каталог',
    errorRateLimit: 'Слишком много запросов. Подождите минуту.',
    scrollTop: 'Наверх',
    scrollReturn: 'Вернуться к месту',
    searchSuffix: 'купить оригинал',
    loaded: 'Показано',
    totalDb: 'В базе',
    updatedAt: 'Синхр.',
    noPhoto: 'Фото в обработке',
    releaseYearLabel: 'Год релиза',
    skuLabel: 'Артикул / SKU',
    close: 'Закрыть',
  },
  uk: {
    back: 'Назад',
    catalog: 'Каталог',
    archive: 'Архів',
    info: 'Інфо',
    savedArchive: 'Збережений архів',
    sneakerIndex: 'Footwear Index',
    editorialSub: 'Digital Footwear Encyclopedia & Lookbook',
    searchPlaceholder: 'Модель, бренд або артикул (Dunk, 550, Tabi)...',
    searchBtn: 'Знайти',
    allBrands: 'Всі марки',
    catAll: 'Всі сегменти',
    catSport: 'Спорт & Біг',
    catStreet: 'Стрітвір',
    catLuxury: 'Люкс & Подіум',
    catOutdoor: 'Аутдор & Кежуал',
    all: 'Всі',
    men: 'Чоловічі',
    women: 'Жіночі',
    sortNewest: 'За новизною',
    sortPriceAsc: 'Ціна ↑',
    sortPriceDesc: 'Ціна ↓',
    sortYearDesc: 'За роком',
    emptyArchive: 'Ваш архів обраних моделей порожній',
    notFound: 'За вашим запитом моделей не знайдено',
    resetFilters: 'Скинути фільтри',
    priceUnav: 'За запитом',
    retail: 'Ритейл',
    find: 'Детальніше',
    buySearch: 'Знайти у продажу',
    copySku: 'Скопіювати назву',
    copied: 'Скопійовано',
    loadMore: '+ Завантажити ще моделі',
    loading: 'Завантаження каталогу...',
    errorLoad: 'Помилка завантаження даних',
    errorSneakers: 'Не вдалося завантажити каталог',
    errorRateLimit: 'Забагато запитів. Зачекайте хвилину.',
    scrollTop: 'Вгору',
    scrollReturn: 'Повернутися',
    searchSuffix: 'купити в Україні',
    loaded: 'Показано',
    totalDb: 'В базі',
    updatedAt: 'Синхр.',
    noPhoto: 'Фото в обробці',
    releaseYearLabel: 'Рік релізу',
    skuLabel: 'Артикул / SKU',
    close: 'Закрити',
  },
  de: {
    back: 'Zurück',
    catalog: 'Katalog',
    archive: 'Archiv',
    info: 'Info',
    savedArchive: 'Gespeichertes Archiv',
    sneakerIndex: 'Footwear Index',
    editorialSub: 'Digital Footwear Encyclopedia & Lookbook',
    searchPlaceholder: 'Modell, Marke oder SKU (Dunk, 550, Tabi)...',
    searchBtn: 'Suchen',
    allBrands: 'Alle Marken',
    catAll: 'Alle Segmente',
    catSport: 'Sport & Running',
    catStreet: 'Streetwear',
    catLuxury: 'Luxury & Runway',
    catOutdoor: 'Outdoor & Casual',
    all: 'Alle',
    men: 'Herren',
    women: 'Damen',
    sortNewest: 'Neueste',
    sortPriceAsc: 'Preis ↑',
    sortPriceDesc: 'Preis ↓',
    sortYearDesc: 'Nach Jahr',
    emptyArchive: 'Ihr gespeichertes Archiv ist leer',
    notFound: 'Keine Modelle gefunden',
    resetFilters: 'Filter zurücksetzen',
    priceUnav: 'Auf Anfrage',
    retail: 'UVP',
    find: 'Details',
    buySearch: 'Online finden',
    copySku: 'Modellname kopieren',
    copied: 'Kopiert',
    loadMore: '+ Weitere Modelle laden',
    loading: 'Katalog wird geladen...',
    errorLoad: 'Fehler beim Laden der Daten',
    errorSneakers: 'Katalog konnte nicht geladen werden',
    errorRateLimit: 'Zu viele Anfragen. Bitte warten Sie eine Minute.',
    scrollTop: 'Nach oben',
    scrollReturn: 'Zurückspringen',
    searchSuffix: 'kaufen',
    loaded: 'Gezeigt',
    totalDb: 'In DB',
    updatedAt: 'Stand',
    noPhoto: 'Foto in Bearbeitung',
    releaseYearLabel: 'Erscheinungsjahr',
    skuLabel: 'SKU / Artikelnummer',
    close: 'Schließen',
  },
}

function haptic(kind: 'light' | 'medium' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(kind)
    else if (navigator.vibrate) navigator.vibrate(kind === 'light' ? 15 : 35)
  } catch {}
}

/**
 * Извлекает достоверный год релиза и отсекает дефолтный 2024 год из старых записей
 */
function parseReleaseYear(sneaker: Sneaker): string | null {
  const rawDate = sneaker.releaseDate || sneaker.release_date || sneaker.publishedAt
  if (rawDate && typeof rawDate === 'string' && rawDate.length >= 4) {
    const yearMatch = rawDate.match(/\b(19[7-9]\d|20[0-2]\d)\b/)
    if (yearMatch) return yearMatch[1]
  }

  const rawYear = sneaker.year ?? sneaker.releaseYear
  if (rawYear !== null && rawYear !== undefined) {
    const numYear = Number(rawYear)
    // Исключаем 2024, если он был проставлен старым парсером по умолчанию
    if (!Number.isNaN(numYear) && numYear >= 1970 && numYear <= 2027 && numYear !== 2024) {
      return String(numYear)
    }
  }

  const nameYearMatch = sneaker.name?.match(/\b(19[8-9]\d|20[0-2]\d)\b/)
  if (nameYearMatch) return nameYearMatch[1]

  return null
}

function buildImageSources(rawUrl?: string | null): string[] {
  if (!rawUrl || typeof rawUrl !== 'string') return []
  const trimmed = rawUrl.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return []

  const httpsUrl = trimmed.replace(/^http:\/\//i, 'https://')
  const sources: string[] = []

  if (httpsUrl.includes('stockx.com')) {
    const base = httpsUrl.split('?')[0]
    sources.push(`${base}?fit=fill&bg=FFFFFF&w=800&h=560&auto=format,compress&q=85&trim=color`)
    sources.push(`https://wsrv.nl/?url=${encodeURIComponent(base)}&w=800&q=85&output=webp`)
    return sources
  }

  if (httpsUrl.includes('goat.com') || httpsUrl.includes('flightclub.com')) {
    sources.push(`https://wsrv.nl/?url=${encodeURIComponent(httpsUrl)}&w=800&q=85&output=webp`)
    sources.push(httpsUrl)
    return sources
  }

  sources.push(httpsUrl)
  sources.push(`https://wsrv.nl/?url=${encodeURIComponent(httpsUrl)}&w=800&q=85&output=webp`)
  return sources
}

interface SneakerCardProps {
  sneaker: Sneaker
  index: number
  isFav: boolean
  toggleFavorite: (e: React.MouseEvent, sneaker: Sneaker) => void
  t: Record<string, string>
  themeColors: Record<string, string>
  isDark: boolean
  gridMode: GridMode
  onSelect: (sneaker: Sneaker, activeImageUrl: string | null) => void
  onBrokenImage?: (id: string) => void
}

function SneakerCard({
  sneaker,
  index,
  isFav,
  toggleFavorite,
  t,
  themeColors,
  isDark,
  gridMode,
  onSelect,
  onBrokenImage,
}: SneakerCardProps) {
  const sources = useMemo(() => buildImageSources(sneaker.image?.original), [sneaker.image?.original])
  const [attempt, setAttempt] = useState(0)
  const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>(
    sources.length > 0 ? 'loading' : 'error'
  )

  useEffect(() => {
    setAttempt(0)
    setImgState(sources.length > 0 ? 'loading' : 'error')
  }, [sneaker.id, sources])

  const currentSrc = sources.length > 0 && attempt < sources.length ? sources[attempt] : null

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (e.currentTarget.naturalWidth <= 2 || e.currentTarget.naturalHeight <= 2) {
      handleImageError()
    } else {
      setImgState('loaded')
    }
  }

  const handleImageError = () => {
    if (attempt < sources.length - 1) {
      setAttempt((prev) => prev + 1)
    } else {
      setImgState('error')
      if (onBrokenImage) onBrokenImage(sneaker.id)
    }
  }

  const releaseYear = useMemo(() => parseReleaseYear(sneaker), [sneaker])
  const formattedIndex = `№ ${String(index + 1).padStart(3, '0')}`
  const isCompact = gridMode === 'compact'

  return (
    <article
      onClick={() => onSelect(sneaker, imgState === 'loaded' ? currentSrc : null)}
      className="group cursor-pointer flex flex-col justify-between transition-all duration-300"
    >
      <div>
        <div
          className={`w-full overflow-hidden relative flex items-center justify-center transition-colors ${
            isCompact ? 'aspect-[4/3] mb-3 p-3' : 'aspect-[16/11] mb-4 p-6 sm:p-8'
          }`}
          style={{
            backgroundColor: themeColors.cardBg,
            border: `1px solid ${themeColors.borderFaint}`,
          }}
        >
          <div className="absolute top-2.5 left-3 z-10 flex items-center gap-2 pointer-events-none">
            <span
              className="text-[9px] font-mono tracking-[0.18em] uppercase"
              style={{ color: themeColors.textMuted }}
            >
              {formattedIndex}
            </span>
            {releaseYear && (
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 tracking-widest"
                style={{
                  color: themeColors.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                }}
              >
                {releaseYear}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => toggleFavorite(e, sneaker)}
            aria-label="Favorite"
            className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded-full outline-none bg-transparent border-none cursor-pointer transition-transform active:scale-90"
            style={{ color: isFav ? themeColors.accent : themeColors.textMuted }}
          >
            <svg
              width={isCompact ? '15' : '17'}
              height={isCompact ? '15' : '17'}
              viewBox="0 0 24 24"
              fill={isFav ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.4"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {imgState === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-8 h-8 rounded-full border border-t-transparent animate-spin opacity-30"
                style={{ borderColor: themeColors.textMuted, borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {currentSrc && imgState !== 'error' && (
            <img
              src={currentSrc}
              alt={sneaker.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              onLoad={handleImageLoad}
              onError={handleImageError}
              className={`w-full h-full object-contain transition-all duration-700 ease-out group-hover:scale-105 ${
                imgState === 'loading' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
              style={{
                mixBlendMode: isDark ? 'normal' : 'multiply',
                filter: isDark
                  ? 'drop-shadow(0 14px 24px rgba(0,0,0,0.55))'
                  : 'drop-shadow(0 12px 18px rgba(0,0,0,0.08))',
              }}
            />
          )}

          {imgState === 'error' && (
            <div className="flex flex-col items-center justify-center text-center px-3 select-none">
              <svg
                width={isCompact ? '38' : '52'}
                height={isCompact ? '22' : '30'}
                viewBox="0 0 64 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                className="opacity-20 mb-1.5"
              >
                <path d="M4 24L8 12L22 10L34 18L54 19C58 19 60 21 60 24V27H4V24Z" />
                <path d="M4 27H60" />
              </svg>
              <span
                className="text-[8px] font-sans uppercase tracking-[0.18em] opacity-35"
                style={{ color: themeColors.text }}
              >
                {t.noPhoto}
              </span>
            </div>
          )}

          {sneaker.sku && !isCompact && (
            <span
              className="absolute bottom-2.5 left-3.5 text-[9px] font-mono uppercase tracking-[0.15em] opacity-40"
              style={{ color: themeColors.text }}
            >
              {sneaker.sku}
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h3
            className={`font-serif tracking-tight leading-tight uppercase ${
              isCompact ? 'text-[15px]' : 'text-[20px]'
            }`}
          >
            {sneaker.brand}
          </h3>
          {sneaker.gender && sneaker.gender !== 'unisex' && (
            <span
              className="text-[8px] font-sans uppercase tracking-[0.18em] shrink-0"
              style={{ color: themeColors.textFaint }}
            >
              {sneaker.gender === 'men'
                ? t.men
                : sneaker.gender === 'women'
                ? t.women
                : sneaker.gender}
            </span>
          )}
        </div>

        <p
          className={`font-sans font-light leading-snug line-clamp-2 ${
            isCompact ? 'text-[11px] mb-2.5' : 'text-[13px] mb-3.5'
          }`}
          style={{ color: isDark ? 'rgba(244,240,232,0.68)' : 'rgba(9,9,11,0.68)' }}
        >
          {sneaker.name}
        </p>
      </div>

      <div
        className="flex justify-between items-center pt-2.5"
        style={{ borderTop: `1px solid ${themeColors.borderFaint}` }}
      >
        <span
          className="text-[9px] font-mono uppercase tracking-[0.14em]"
          style={{ color: sneaker.retailPrice > 0 ? themeColors.text : themeColors.textMuted }}
        >
          {sneaker.retailPrice > 0 ? `${t.retail} $${sneaker.retailPrice}` : t.priceUnav}
        </span>
        <span
          className="text-[9px] font-sans uppercase tracking-[0.18em]"
          style={{ color: themeColors.textMuted }}
        >
          {t.find} →
        </span>
      </div>
    </article>
  )
}

interface SneakerIndexProps {
  onBack?: () => void
  theme?: 'light' | 'dark'
  lang?: Lang
}

export default function SneakerIndex({ onBack, theme: propTheme, lang }: SneakerIndexProps) {
  const tgUserId =
    typeof window !== 'undefined'
      ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id || null
      : null

  const getActiveLang = (): Lang => {
    if (lang) return lang
    if (typeof window !== 'undefined') {
      try {
        const savedLang =
          localStorage.getItem('cordwainer_lang') || localStorage.getItem('app_lang')
        if (savedLang === 'ru' || savedLang === 'uk' || savedLang === 'de') return savedLang
      } catch {}
      const tg = (window as any).Telegram?.WebApp
      const tgLang = tg?.initDataUnsafe?.user?.language_code
      if (tgLang === 'uk' || tgLang === 'ukr') return 'uk'
      if (tgLang === 'de') return 'de'
    }
    return 'ru'
  }

  const activeLang = getActiveLang()
  const t = TRANSLATIONS[activeLang]

  const getInitialQuery = (): string | null => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) return q.trim()

    const tg = (window as any).Telegram?.WebApp
    const startParam =
      tg?.initDataUnsafe?.start_param || params.get('tgWebAppStartParam') || null

    if (startParam && typeof startParam === 'string' && startParam.startsWith('search_')) {
      return startParam.slice('search_'.length).replace(/_/g, ' ').trim()
    }
    return null
  }

  const initialQuery = getInitialQuery()

  const [sneakers, setSneakers] = useState<Sneaker[]>([])
  const [favorites, setFavorites] = useState<Sneaker[]>([])
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set())
  const [viewState, setViewState] = useState<'catalog' | 'favorites' | 'about'>('catalog')
  const [totalInDb, setTotalInDb] = useState<number | null>(null)
  const [lastSync, setLastSync] = useState<string>('')

  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all')
  const [selectedBrand, setSelectedBrand] = useState<string>(initialQuery ? 'all' : 'nike')
  const [selectedGender, setSelectedGender] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [gridMode, setGridMode] = useState<GridMode>('compact')

  const [searchText, setSearchText] = useState(initialQuery || '')
  const [activeQuery, setActiveQuery] = useState(initialQuery || 'nike')

  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(!!initialQuery)

  const [selectedModalSneaker, setSelectedModalSneaker] = useState<{
    sneaker: Sneaker
    imageUrl: string | null
  } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [buttonMode, setButtonMode] = useState<'hidden' | 'up' | 'down'>('hidden')
  const returnYRef = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [isDark, setIsDark] = useState(propTheme === 'light' ? false : true)
  const cacheRef = useRef<Record<string, { items: Sneaker[]; total: number | null }>>({})

  useEffect(() => {
    if (tgUserId) {
      fetch(`/api/favorites?user_id=${tgUserId}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.favorites)) {
            setFavorites(data.favorites)
            localStorage.setItem('lookbook_favorites', JSON.stringify(data.favorites))
          }
        })
        .catch(() => {})
    } else {
      try {
        const savedFavs = localStorage.getItem('lookbook_favorites')
        if (savedFavs) setFavorites(JSON.parse(savedFavs))
      } catch {}
    }
  }, [tgUserId])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      const currentY = container.scrollTop
      if (currentY > 600) {
        setButtonMode((prev) => (prev !== 'up' ? 'up' : prev))
      } else if (currentY < 100 && returnYRef.current !== null) {
        setButtonMode((prev) => (prev !== 'down' ? 'down' : prev))
      } else {
        setButtonMode((prev) => (prev !== 'hidden' ? 'hidden' : prev))
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
      setTimeout(() => {
        returnYRef.current = null
      }, 1000)
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
        const lsTheme =
          localStorage.getItem('theme') ||
          localStorage.getItem('app-theme') ||
          localStorage.getItem('color-theme')
        if (lsTheme === 'light') return false
        if (lsTheme === 'dark') return true
      } catch {}

      return true
    }

    setIsDark(checkGlobalTheme())

    const observer = new MutationObserver(() => {
      setIsDark(checkGlobalTheme())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [propTheme])

  const themeColors = {
    bg: isDark ? '#09090B' : '#F4F0E8',
    cardBg: isDark ? '#121215' : '#EBE5D9',
    modalBg: isDark ? '#141417' : '#F9F6F0',
    text: isDark ? '#F4F0E8' : '#09090B',
    textMuted: isDark ? 'rgba(244, 240, 232, 0.48)' : 'rgba(9, 9, 11, 0.48)',
    textFaint: isDark ? 'rgba(244, 240, 232, 0.28)' : 'rgba(9, 9, 11, 0.28)',
    border: isDark ? 'rgba(244, 240, 232, 0.14)' : 'rgba(9, 9, 11, 0.14)',
    borderFaint: isDark ? 'rgba(244, 240, 232, 0.07)' : 'rgba(9, 9, 11, 0.07)',
    accent: isDark ? '#E5D3B3' : '#18181B',
  }

  const fetchSneakers = useCallback(
    async (query: string, genderFilter: string, pageNum: number, append: boolean = false) => {
      const cacheKey = `${query}_${genderFilter}_p${pageNum}`

      if (!append && cacheRef.current[cacheKey]) {
        setSneakers(cacheRef.current[cacheKey].items)
        setTotalInDb(cacheRef.current[cacheKey].total)
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
        const url = `/api/get-top-sneakers?query=${encodeURIComponent(
          query
        )}&gender=${encodeURIComponent(genderFilter)}&limit=60&page=${pageNum}`

        const res = await fetch(url)
        const text = await res.text()

        const upperText = text.toUpperCase()
        if (
          upperText.includes('<HTML') ||
          upperText.includes('TOO MANY REQUESTS') ||
          upperText.includes('RATE LIMIT')
        ) {
          throw new Error('RATE_LIMIT')
        }

        let data: any
        try {
          data = JSON.parse(text)
        } catch {
          throw new Error('PARSE_ERROR')
        }

        if (data.ERROR === 'RATE LIMIT EXCEEDED' || data.error === 'RATE LIMIT EXCEEDED') {
          throw new Error('RATE_LIMIT')
        }

        if (!res.ok) {
          throw new Error(data.details || data.error || data.message || t.errorLoad)
        }

        const resolvedTotal =
          data.total !== undefined
            ? data.total
            : data.totalCount !== undefined
            ? data.totalCount
            : null

        if (resolvedTotal !== null) {
          setTotalInDb(resolvedTotal)
        }

        const list = data.results || data.data || data || []
        const newItems: Sneaker[] = Array.isArray(list) ? list : []

        setHasMore(newItems.length >= 60)

        setSneakers((prev) => {
          const merged = append ? [...prev, ...newItems] : newItems
          const seen = new Set<string>()
          const unique = merged.filter((item) => {
            if (seen.has(item.id)) return false
            seen.add(item.id)
            return true
          })
          if (!append) {
            cacheRef.current[cacheKey] = { items: unique, total: resolvedTotal }
          }
          return unique
        })

        if (data.lastUpdate) {
          const dbDate = new Date(data.lastUpdate)
          if (!Number.isNaN(dbDate.getTime())) {
            const pad = (n: number) => n.toString().padStart(2, '0')
            setLastSync(
              `${pad(dbDate.getDate())}.${pad(dbDate.getMonth() + 1)}.${dbDate.getFullYear()}`
            )
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'RATE_LIMIT') {
          setError(t.errorRateLimit)
        } else {
          setError(t.errorSneakers)
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [t]
  )

  useEffect(() => {
    if (viewState === 'catalog') {
      setPage(1)
      fetchSneakers(activeQuery, selectedGender, 1, false)
    }
  }, [activeQuery, selectedGender, fetchSneakers, viewState])

  const visibleBrands = useMemo(() => {
    if (selectedCategory === 'all') return BRANDS
    return BRANDS.filter((b) => b.category === selectedCategory)
  }, [selectedCategory])

  const handleCategoryClick = (catId: CategoryId) => {
    haptic('light')
    setSelectedCategory(catId)
    if (catId !== 'all') {
      const firstBrandInCat = BRANDS.find((b) => b.category === catId)
      if (firstBrandInCat) {
        setSelectedBrand(firstBrandInCat.id)
        setSearchText('')
        setHasSearched(false)
        setActiveQuery(firstBrandInCat.id)
      }
    }
  }

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

  const triggerSearch = () => {
    const text = searchText.trim()
    if (!text) return
    haptic('light')
    setHasSearched(true)
    setSelectedBrand('all')
    setActiveQuery(text)
    setViewState('catalog')
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname)
    }
  }

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      triggerSearch()
    }
  }

  const clearSearch = () => {
    haptic('light')
    setSearchText('')
    if (hasSearched) {
      setHasSearched(false)
      const fallbackBrand = selectedBrand === 'all' ? 'nike' : selectedBrand
      setSelectedBrand(fallbackBrand)
      setActiveQuery(fallbackBrand)
    }
    if (searchInputRef.current) searchInputRef.current.focus()
  }

  const handleResetAllFilters = () => {
    haptic('light')
    setSelectedCategory('all')
    setSelectedBrand('nike')
    setSelectedGender('all')
    setSortBy('newest')
    setSearchText('')
    setHasSearched(false)
    setActiveQuery('nike')
  }

  const handleLoadMore = () => {
    haptic('light')
    const nextPage = page + 1
    setPage(nextPage)
    fetchSneakers(activeQuery, selectedGender, nextPage, true)
  }

  const handleExternalBuySearch = (sneaker: Sneaker) => {
    haptic('light')
    let cleanName = sneaker.name.trim()
    const brandRegex = new RegExp(`^${sneaker.brand}\\s*`, 'i')
    if (brandRegex.test(cleanName)) {
      cleanName = cleanName.replace(brandRegex, '')
    }

    const searchQuery = `${sneaker.brand} ${cleanName} ${sneaker.sku || ''} ${t.searchSuffix}`.trim()
    const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`

    const tg = (window as any).Telegram?.WebApp
    if (tg?.openLink) {
      tg.openLink(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const handleCopyModel = (sneaker: Sneaker) => {
    haptic('light')
    const fullTitle = `${sneaker.brand} ${sneaker.name}${sneaker.sku ? ` (${sneaker.sku})` : ''}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullTitle).catch(() => {})
    }
    setCopiedId(sneaker.id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const toggleFavorite = (e: React.MouseEvent, sneaker: Sneaker) => {
    e.stopPropagation()
    haptic('medium')
    setFavorites((prev) => {
      const isFav = prev.some((item) => item.id === sneaker.id)
      const newFavs = isFav ? prev.filter((item) => item.id !== sneaker.id) : [...prev, sneaker]
      try {
        localStorage.setItem('lookbook_favorites', JSON.stringify(newFavs))
      } catch {}
      return newFavs
    })

    if (tgUserId) {
      fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: tgUserId, sneaker_id: sneaker.id }),
      }).catch(() => {})
    }
  }

  const handleBrokenImage = useCallback((id: string) => {
    setBrokenIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const processedCatalog = useMemo(() => {
    const filtered = sneakers.filter((sneaker) => {
      if (selectedGender !== 'all' && sneaker.gender) {
        const g = sneaker.gender.toLowerCase()
        if (
          selectedGender === 'men' &&
          !(g === 'men' || g === 'unisex' || (g.includes('men') && !g.includes('women')))
        ) {
          return false
        }
        if (selectedGender === 'women' && !(g.includes('women') || g === 'unisex')) {
          return false
        }
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      const aBroken = brokenIds.has(a.id) || !a.image?.original ? 1 : 0
      const bBroken = brokenIds.has(b.id) || !b.image?.original ? 1 : 0
      if (aBroken !== bBroken) return aBroken - bBroken

      if (sortBy === 'price_asc') {
        const pa = a.retailPrice > 0 ? a.retailPrice : 999999
        const pb = b.retailPrice > 0 ? b.retailPrice : 999999
        return pa - pb
      }
      if (sortBy === 'price_desc') {
        return (b.retailPrice || 0) - (a.retailPrice || 0)
      }
      if (sortBy === 'year_desc') {
        const ya = Number(parseReleaseYear(a) || 0)
        const yb = Number(parseReleaseYear(b) || 0)
        return yb - ya
      }
      return 0
    })
  }, [sneakers, selectedGender, sortBy, brokenIds])

  const currentDisplayList = viewState === 'favorites' ? favorites : processedCatalog

  const CATEGORIES: { id: CategoryId; label: string }[] = [
    { id: 'all', label: t.catAll },
    { id: 'sport', label: t.catSport },
    { id: 'streetwear', label: t.catStreet },
    { id: 'luxury', label: t.catLuxury },
    { id: 'outdoor', label: t.catOutdoor },
  ]

  const GENDERS = [
    { id: 'all', name: t.all },
    { id: 'men', name: t.men },
    { id: 'women', name: t.women },
  ]

  return (
    <div
      ref={scrollRef}
      className="h-[100dvh] w-full overflow-y-auto px-5 sm:px-8 pt-6 pb-24 transition-colors duration-500 relative select-none"
      style={{ background: themeColors.bg, color: themeColors.text }}
    >
      <div className="max-w-6xl mx-auto">
        {/* ВЕРХНЯЯ НАВИГАЦИОННАЯ ПАНЕЛЬ (без тега <header>, чтобы не перекрывать заголовок) */}
        <div
          role="navigation"
          className="pt-2 pb-4 mb-7 flex items-center justify-between gap-3"
          style={{ borderBottom: `1px solid ${themeColors.borderFaint}` }}
        >
          <button
            type="button"
            onClick={() => {
              haptic('light')
              if (viewState !== 'catalog') setViewState('catalog')
              else if (onBack) onBack()
            }}
            className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-0 bg-transparent cursor-pointer transition-opacity hover:opacity-100 py-1.5"
            style={{
              color: themeColors.textMuted,
              visibility: viewState === 'catalog' && !onBack ? 'hidden' : 'visible',
            }}
          >
            <span>←</span>
            <span>{t.back}</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                haptic('light')
                setViewState('catalog')
              }}
              className="px-2.5 py-1.5 text-[10px] font-sans uppercase tracking-[0.18em] outline-none bg-transparent border-none cursor-pointer transition-all"
              style={{
                color: viewState === 'catalog' ? themeColors.text : themeColors.textMuted,
                borderBottom:
                  viewState === 'catalog'
                    ? `1.5px solid ${themeColors.text}`
                    : '1.5px solid transparent',
              }}
            >
              {t.catalog}
            </button>

            <button
              type="button"
              onClick={() => {
                haptic('light')
                setViewState(viewState === 'favorites' ? 'catalog' : 'favorites')
              }}
              className="px-2.5 py-1.5 flex items-center gap-1.5 text-[10px] font-sans uppercase tracking-[0.18em] outline-none bg-transparent border-none cursor-pointer transition-all"
              style={{
                color: viewState === 'favorites' ? themeColors.text : themeColors.textMuted,
                borderBottom:
                  viewState === 'favorites'
                    ? `1.5px solid ${themeColors.text}`
                    : '1.5px solid transparent',
              }}
            >
              <span>{t.archive}</span>
              {favorites.length > 0 && (
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded-full leading-none"
                  style={{
                    backgroundColor: isDark ? 'rgba(244,240,232,0.14)' : 'rgba(9,9,11,0.1)',
                    color: themeColors.text,
                  }}
                >
                  {favorites.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                haptic('light')
                setViewState(viewState === 'about' ? 'catalog' : 'about')
              }}
              className="px-2.5 py-1.5 text-[10px] font-sans uppercase tracking-[0.18em] outline-none bg-transparent border-none cursor-pointer transition-all"
              style={{
                color: viewState === 'about' ? themeColors.text : themeColors.textMuted,
                borderBottom:
                  viewState === 'about'
                    ? `1.5px solid ${themeColors.text}`
                    : '1.5px solid transparent',
              }}
            >
              {t.info}
            </button>
          </div>
        </div>

        {viewState === 'about' ? (
          <AboutView lang={activeLang} themeColors={themeColors} isDark={isDark} />
        ) : (
          <>
            {/* ЗАГОЛОВОК СТРАНИЦЫ */}
            <div className="flex flex-col mb-7">
              <span
                className="text-[9px] font-mono uppercase tracking-[0.26em] mb-2 block"
                style={{ color: themeColors.textMuted }}
              >
                {t.editorialSub}
              </span>
              <h1 className="font-serif text-[11vw] min-[390px]:text-5xl leading-[1.05] tracking-[-0.02em] mb-3">
                {viewState === 'favorites' ? t.savedArchive : t.sneakerIndex}
              </h1>

              {viewState === 'catalog' && (
                <div
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono uppercase tracking-[0.14em]"
                  style={{ color: themeColors.textMuted }}
                >
                  <span>
                    {t.loaded}: <strong style={{ color: themeColors.text }}>{currentDisplayList.length}</strong>
                  </span>
                  {totalInDb !== null && (
                    <>
                      <span className="opacity-30">|</span>
                      <span>
                        {t.totalDb}: <strong style={{ color: themeColors.text }}>{totalInDb}</strong>
                      </span>
                    </>
                  )}
                  {lastSync && (
                    <>
                      <span className="opacity-30">|</span>
                      <span>
                        {t.updatedAt} {lastSync}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {viewState === 'catalog' && (
              <>
                {/* ПОИСКОВАЯ СТРОКА */}
                <div
                  className="mb-5 flex items-center"
                  style={{ borderBottom: `1px solid ${themeColors.border}` }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="opacity-40 shrink-0 mr-3"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={t.searchPlaceholder}
                    className="w-full py-3 text-[13px] font-sans outline-none bg-transparent"
                    style={{ color: themeColors.text }}
                  />
                  {searchText && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="p-2 outline-none bg-transparent border-none cursor-pointer opacity-50 hover:opacity-100"
                      style={{ color: themeColors.text }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={triggerSearch}
                    className="pl-3 py-2 text-[10px] font-sans uppercase tracking-[0.2em] outline-none bg-transparent border-none cursor-pointer shrink-0 opacity-75 hover:opacity-100"
                    style={{ color: themeColors.text }}
                  >
                    {t.searchBtn}
                  </button>
                </div>

                {/* СЕГМЕНТЫ КАТАЛОГА */}
                <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none mb-2">
                  {CATEGORIES.map((cat) => {
                    const active = selectedCategory === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryClick(cat.id)}
                        className="px-3 py-1.5 text-[9px] font-sans uppercase tracking-[0.18em] whitespace-nowrap cursor-pointer outline-none transition-all shrink-0"
                        style={{
                          backgroundColor: active
                            ? themeColors.text
                            : isDark
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(0,0,0,0.04)',
                          color: active ? themeColors.bg : themeColors.textMuted,
                          border: `1px solid ${active ? themeColors.text : themeColors.borderFaint}`,
                        }}
                      >
                        {cat.label}
                      </button>
                    )
                  })}
                </div>

                {/* ПОЛОСА БРЕНДОВ */}
                <div className="relative mb-5">
                  <div className="flex gap-4 overflow-x-auto py-2.5 scrollbar-none pr-12">
                    <button
                      type="button"
                      onClick={() => handleBrandClick('all')}
                      className="text-[10px] font-sans uppercase tracking-[0.16em] whitespace-nowrap cursor-pointer outline-none bg-transparent transition-all shrink-0 pb-1"
                      style={{
                        color:
                          selectedBrand === 'all' && !hasSearched
                            ? themeColors.text
                            : themeColors.textMuted,
                        borderBottom:
                          selectedBrand === 'all' && !hasSearched
                            ? `1.5px solid ${themeColors.text}`
                            : '1.5px solid transparent',
                      }}
                    >
                      {t.allBrands}
                    </button>

                    {visibleBrands.map((brand) => {
                      const isActive = selectedBrand === brand.id && !hasSearched
                      return (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => handleBrandClick(brand.id)}
                          className="text-[10px] font-sans uppercase tracking-[0.16em] whitespace-nowrap cursor-pointer outline-none bg-transparent transition-all shrink-0 pb-1"
                          style={{
                            color: isActive ? themeColors.text : themeColors.textMuted,
                            borderBottom: isActive
                              ? `1.5px solid ${themeColors.text}`
                              : '1.5px solid transparent',
                          }}
                        >
                          {brand.name}
                        </button>
                      )
                    })}
                  </div>
                  <div
                    className="absolute top-0 right-0 bottom-0 w-10 pointer-events-none"
                    style={{
                      background: `linear-gradient(to left, ${themeColors.bg} 20%, transparent 100%)`,
                    }}
                  />
                </div>

                {/* ПАНЕЛЬ ФИЛЬТРА ПО ПОЛУ, СОРТИРОВКИ И СЕТКИ */}
                <div
                  className="flex flex-wrap items-center justify-between gap-3 py-3 mb-8"
                  style={{
                    borderTop: `1px solid ${themeColors.borderFaint}`,
                    borderBottom: `1px solid ${themeColors.borderFaint}`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    {GENDERS.map((gender) => {
                      const isActive = selectedGender === gender.id
                      return (
                        <button
                          key={gender.id}
                          type="button"
                          onClick={() => {
                            haptic('light')
                            setSelectedGender(gender.id)
                          }}
                          className="text-[9px] font-sans uppercase tracking-[0.2em] cursor-pointer outline-none bg-transparent border-none transition-all"
                          style={{
                            color: isActive ? themeColors.text : themeColors.textFaint,
                            fontWeight: isActive ? 600 : 400,
                          }}
                        >
                          {gender.name}
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex items-center gap-4">
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        haptic('light')
                        setSortBy(e.target.value as SortOption)
                      }}
                      className="text-[9px] font-sans uppercase tracking-[0.16em] bg-transparent outline-none border-none cursor-pointer"
                      style={{ color: themeColors.textMuted }}
                    >
                      <option value="newest" style={{ background: themeColors.bg, color: themeColors.text }}>
                        {t.sortNewest}
                      </option>
                      <option value="year_desc" style={{ background: themeColors.bg, color: themeColors.text }}>
                        {t.sortYearDesc}
                      </option>
                      <option value="price_asc" style={{ background: themeColors.bg, color: themeColors.text }}>
                        {t.sortPriceAsc}
                      </option>
                      <option value="price_desc" style={{ background: themeColors.bg, color: themeColors.text }}>
                        {t.sortPriceDesc}
                      </option>
                    </select>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          haptic('light')
                          setGridMode('editorial')
                        }}
                        title="Lookbook View"
                        className="p-1 outline-none bg-transparent border-none cursor-pointer"
                        style={{
                          color: gridMode === 'editorial' ? themeColors.text : themeColors.textFaint,
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="3" y="4" width="18" height="16" rx="1" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          haptic('light')
                          setGridMode('compact')
                        }}
                        title="Grid View"
                        className="p-1 outline-none bg-transparent border-none cursor-pointer"
                        style={{
                          color: gridMode === 'compact' ? themeColors.text : themeColors.textFaint,
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="3" y="3" width="8" height="8" rx="1" />
                          <rect x="13" y="3" width="8" height="8" rx="1" />
                          <rect x="3" y="13" width="8" height="8" rx="1" />
                          <rect x="13" y="13" width="8" height="8" rx="1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ОШИБКА ТОЛЬКО В РЕЖИМЕ КАТАЛОГА */}
            {error && viewState === 'catalog' && (
              <div
                className="p-4 mb-8 flex items-center justify-between"
                style={{ border: `1px solid ${themeColors.border}` }}
              >
                <p className="text-[11px] font-sans uppercase tracking-widest text-red-400">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => fetchSneakers(activeQuery, selectedGender, page, false)}
                  className="text-[10px] font-sans uppercase tracking-widest underline bg-transparent border-none cursor-pointer"
                  style={{ color: themeColors.text }}
                >
                  Повторить
                </button>
              </div>
            )}

            {/* СКЕЛЕТОН ПРИ ЗАГРУЗКЕ */}
            {loading && viewState === 'catalog' && sneakers.length === 0 && (
              <div
                className={
                  gridMode === 'compact'
                    ? 'grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8 pb-10 animate-pulse'
                    : 'grid grid-cols-1 md:grid-cols-2 gap-12 pb-10 animate-pulse'
                }
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n}>
                    <div
                      className="w-full aspect-[4/3] mb-3"
                      style={{ backgroundColor: themeColors.cardBg }}
                    />
                    <div
                      className="h-4 w-24 mb-2"
                      style={{ backgroundColor: themeColors.cardBg }}
                    />
                    <div
                      className="h-3 w-36"
                      style={{ backgroundColor: themeColors.cardBg }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ПУСТОЙ РЕЗУЛЬТАТ */}
            {!loading && currentDisplayList.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
                <p
                  className="text-[12px] font-sans uppercase tracking-[0.2em]"
                  style={{ color: themeColors.textMuted }}
                >
                  {viewState === 'favorites' ? t.emptyArchive : t.notFound}
                </p>
                {viewState === 'catalog' && (
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="px-5 py-2.5 text-[10px] font-sans uppercase tracking-[0.2em] cursor-pointer bg-transparent transition-opacity hover:opacity-80"
                    style={{
                      color: themeColors.text,
                      border: `1px solid ${themeColors.border}`,
                    }}
                  >
                    {t.resetFilters}
                  </button>
                )}
              </div>
            )}

            {/* СЕТКА КАРТОЧЕК */}
            {currentDisplayList.length > 0 && (
              <div
                className={
                  gridMode === 'compact'
                    ? 'grid grid-cols-2 md:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-9 pb-10'
                    : 'grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-14 pb-10'
                }
              >
                {currentDisplayList.map((sneaker, idx) => {
                  const isFav = favorites.some((f) => f.id === sneaker.id)
                  return (
                    <SneakerCard
                      key={sneaker.id}
                      index={idx}
                      sneaker={sneaker}
                      isFav={isFav}
                      toggleFavorite={toggleFavorite}
                      t={t}
                      themeColors={themeColors}
                      isDark={isDark}
                      gridMode={gridMode}
                      onBrokenImage={handleBrokenImage}
                      onSelect={(item, imgUrl) => {
                        haptic('light')
                        setSelectedModalSneaker({ sneaker: item, imageUrl: imgUrl })
                      }}
                    />
                  )
                })}
              </div>
            )}

            {/* ПАГИНАЦИЯ */}
            {!loading && !error && hasMore && viewState === 'catalog' && currentDisplayList.length > 0 && (
              <div
                className="pt-8 pb-12 text-center"
                style={{ borderTop: `1px solid ${themeColors.borderFaint}` }}
              >
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-8 py-3.5 text-[10px] font-sans uppercase tracking-[0.28em] outline-none bg-transparent cursor-pointer transition-all hover:opacity-100 opacity-80"
                  style={{
                    color: themeColors.text,
                    border: `1px solid ${themeColors.border}`,
                  }}
                >
                  {loadingMore ? t.loading : t.loadMore}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО ПРОСМОТРА МОДЕЛИ */}
      {selectedModalSneaker && (
        <div
          onClick={() => setSelectedModalSneaker(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md transition-opacity"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto p-6 sm:p-8 relative"
            style={{
              backgroundColor: themeColors.modalBg,
              color: themeColors.text,
              border: `1px solid ${themeColors.border}`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-[10px] font-mono uppercase tracking-[0.22em]"
                style={{ color: themeColors.textMuted }}
              >
                {selectedModalSneaker.sneaker.brand}
              </span>
              <button
                type="button"
                onClick={() => setSelectedModalSneaker(null)}
                className="text-[10px] font-sans uppercase tracking-[0.2em] bg-transparent border-none cursor-pointer"
                style={{ color: themeColors.textMuted }}
              >
                {t.close} ✕
              </button>
            </div>

            {selectedModalSneaker.imageUrl && (
              <div
                className="w-full aspect-[16/10] mb-6 p-6 flex items-center justify-center"
                style={{ backgroundColor: themeColors.cardBg }}
              >
                <img
                  src={selectedModalSneaker.imageUrl}
                  alt={selectedModalSneaker.sneaker.name}
                  className="w-full h-full object-contain"
                  style={{ mixBlendMode: isDark ? 'normal' : 'multiply' }}
                />
              </div>
            )}

            <h2 className="font-serif text-2xl sm:text-3xl leading-tight mb-2">
              {selectedModalSneaker.sneaker.name}
            </h2>

            <div
              className="grid grid-cols-3 gap-3 py-4 my-4"
              style={{
                borderTop: `1px solid ${themeColors.borderFaint}`,
                borderBottom: `1px solid ${themeColors.borderFaint}`,
              }}
            >
              <div>
                <span
                  className="block text-[9px] font-sans uppercase tracking-widest mb-1"
                  style={{ color: themeColors.textMuted }}
                >
                  {t.retail}
                </span>
                <span className="text-[13px] font-mono">
                  {selectedModalSneaker.sneaker.retailPrice > 0
                    ? `$${selectedModalSneaker.sneaker.retailPrice}`
                    : t.priceUnav}
                </span>
              </div>

              <div>
                <span
                  className="block text-[9px] font-sans uppercase tracking-widest mb-1"
                  style={{ color: themeColors.textMuted }}
                >
                  {t.releaseYearLabel}
                </span>
                <span className="text-[13px] font-mono">
                  {parseReleaseYear(selectedModalSneaker.sneaker) || '—'}
                </span>
              </div>

              <div>
                <span
                  className="block text-[9px] font-sans uppercase tracking-widest mb-1"
                  style={{ color: themeColors.textMuted }}
                >
                  {t.skuLabel}
                </span>
                <span className="text-[12px] font-mono">
                  {selectedModalSneaker.sneaker.sku || '—'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="button"
                onClick={() => handleExternalBuySearch(selectedModalSneaker.sneaker)}
                className="flex-1 py-3.5 px-4 text-[10px] font-sans uppercase tracking-[0.22em] cursor-pointer border-none transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: themeColors.text,
                  color: themeColors.bg,
                }}
              >
                {t.buySearch} ↗
              </button>
              <button
                type="button"
                onClick={() => handleCopyModel(selectedModalSneaker.sneaker)}
                className="py-3.5 px-4 text-[10px] font-sans uppercase tracking-[0.2em] cursor-pointer bg-transparent"
                style={{
                  color: themeColors.text,
                  border: `1px solid ${themeColors.border}`,
                }}
              >
                {copiedId === selectedModalSneaker.sneaker.id ? t.copied : t.copySku}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* КНОПКА ПРОКРУТКИ */}
      <button
        type="button"
        onClick={handleSmartScroll}
        className={`fixed bottom-6 right-6 z-40 flex items-center justify-center w-11 h-11 rounded-full outline-none shadow-lg transition-all duration-500 cursor-pointer backdrop-blur-md ${
          buttonMode !== 'hidden'
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{
          background: isDark ? 'rgba(25, 25, 25, 0.85)' : 'rgba(240, 235, 225, 0.85)',
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
          className={`transition-transform duration-500 ${
            buttonMode === 'down' ? 'rotate-180' : 'rotate-0'
          }`}
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </div>
  )
}
