import React, { useEffect, useState, useCallback, useRef, useMemo, KeyboardEvent } from 'react'
import AboutView from './AboutView'

export type Lang = 'ru' | 'uk' | 'de'
type CategoryId = 'all' | 'luxury' | 'streetwear' | 'sport' | 'outdoor'
type SortOption = 'newest' | 'price_desc' | 'price_asc' | 'year_desc'
type GridMode = 'editorial' | 'boutique'

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
  origin?: string
}

const BRANDS: BrandItem[] = [
  // Luxury & High Fashion (Подиум и Модные Дома)
  { id: 'prada', name: 'Prada', category: 'luxury', origin: 'MILANO · DAL 1913' },
  { id: 'balenciaga', name: 'Balenciaga', category: 'luxury', origin: 'PARIS · COUTURE HOUSE' },
  { id: 'valentino', name: 'Valentino', category: 'luxury', origin: 'ROMA · ATELIER GARAVANI' },
  { id: 'chanel', name: 'Chanel', category: 'luxury', origin: 'PARIS · 31 RUE CAMBON' },
  { id: 'gucci', name: 'Gucci', category: 'luxury', origin: 'FIRENZE · DAL 1921' },
  { id: 'louis vuitton', name: 'Louis Vuitton', category: 'luxury', origin: 'PARIS · MAISON FONDEE EN 1854' },
  { id: 'dior', name: 'Dior', category: 'luxury', origin: 'PARIS · AVENUE MONTAIGNE' },
  { id: 'saint laurent', name: 'Saint Laurent', category: 'luxury', origin: 'PARIS · RIVE GAUCHE' },
  { id: 'bottega veneta', name: 'Bottega Veneta', category: 'luxury', origin: 'VICENZA · ARTISANAL ATELIER' },
  { id: 'miu miu', name: 'Miu Miu', category: 'luxury', origin: 'MILANO · RUNWAY ARCHIVE' },
  { id: 'celine', name: 'Celine', category: 'luxury', origin: 'PARIS · RUE VIVIENNE' },
  { id: 'loewe', name: 'Loewe', category: 'luxury', origin: 'MADRID · CASA LOEWE' },
  { id: 'hermes', name: 'Hermès', category: 'luxury', origin: 'PARIS · FAUBOURG SAINT-HONORÉ' },
  { id: 'loro piana', name: 'Loro Piana', category: 'luxury', origin: 'QUARONA · ITALIAN EXCELLENCE' },
  { id: 'maison margiela', name: 'Maison Margiela', category: 'luxury', origin: 'PARIS · AVANT-GARDE ARCHIVE' },
  { id: 'rick owens', name: 'Rick Owens', category: 'luxury', origin: 'PARIS · CONCORDIA' },
  { id: 'alexander mcqueen', name: 'Alexander McQueen', category: 'luxury', origin: 'LONDON · SAVILE ROW HERITAGE' },
  { id: 'lanvin', name: 'Lanvin', category: 'luxury', origin: 'PARIS · JEANNE LANVIN 1889' },
  { id: 'versace', name: 'Versace', category: 'luxury', origin: 'MILANO · VIA GESÙ' },
  { id: 'givenchy', name: 'Givenchy', category: 'luxury', origin: 'PARIS · AVENUE GEORGE V' },
  { id: 'dsquared2', name: 'Dsquared2', category: 'luxury', origin: 'MILANO · RUNWAY COLLECTION' },
  { id: 'polo ralph lauren', name: 'Ralph Lauren', category: 'luxury', origin: 'NEW YORK · MADISON AVE' },
  { id: 'lacoste', name: 'Lacoste', category: 'luxury', origin: 'PARIS · TENNIS HERITAGE' },
  { id: 'calvin klein', name: 'Calvin Klein', category: 'luxury', origin: 'NEW YORK · MINIMALIST STUDIO' },
  { id: 'tommy hilfiger', name: 'Tommy Hilfiger', category: 'luxury', origin: 'NEW YORK · ARCHIVE' },

  // Streetwear & Avant-Garde
  { id: 'off-white', name: 'Off-White', category: 'streetwear', origin: 'MILANO · VIRGIL ABLOH ARCHIVE' },
  { id: 'fear of god', name: 'Fear of God', category: 'streetwear', origin: 'LOS ANGELES · ETERNAL LINE' },
  { id: 'bape', name: 'A Bathing Ape', category: 'streetwear', origin: 'TOKYO · URA-HARAJUKU' },
  { id: 'supreme', name: 'Supreme', category: 'streetwear', origin: 'NEW YORK · LAFAYETTE ST' },
  { id: 'kith', name: 'Kith', category: 'streetwear', origin: 'NEW YORK · RONNIE FIEG STUDIO' },
  { id: 'palace', name: 'Palace', category: 'streetwear', origin: 'LONDON · SOHO ARCHIVE' },
  { id: 'autry', name: 'Autry', category: 'streetwear', origin: 'DALLAS · ACTION SHOES' },
  { id: 'veja', name: 'Veja', category: 'streetwear', origin: 'PARIS · STUDIO EDITION' },
  { id: 'converse', name: 'Converse', category: 'streetwear', origin: 'BOSTON · ARCHIVE DIVISION' },
  { id: 'vans', name: 'Vans', category: 'streetwear', origin: 'CALIFORNIA · VAULT ARCHIVE' },
  { id: 'etnies', name: 'Etnies', category: 'streetwear', origin: 'CALIFORNIA · SKATE HERITAGE' },
  { id: 'osiris', name: 'Osiris', category: 'streetwear', origin: 'SAN DIEGO · MILLENNIUM ARCHIVE' },
  { id: 'dc', name: 'DC Shoes', category: 'streetwear', origin: 'CALIFORNIA · STUDIO ARCHIVE' },

  // Sport & Performance Icons
  { id: 'nike', name: 'Nike', category: 'sport', origin: 'BEAVERTON · ARCHIVE & LAB' },
  { id: 'jordan', name: 'Jordan', category: 'sport', origin: 'CHICAGO · FLIGHT ARCHIVE' },
  { id: 'adidas', name: 'Adidas', category: 'sport', origin: 'HERZOGENAURACH · ORIGINALS' },
  { id: 'yeezy', name: 'Yeezy', category: 'sport', origin: 'CALABASAS · DESIGN ARCHIVE' },
  { id: 'new balance', name: 'New Balance', category: 'sport', origin: 'BOSTON · MADE IN USA / UK' },
  { id: 'asics', name: 'Asics', category: 'sport', origin: 'KOBE · SPORTSTYLE LAB' },
  { id: 'on', name: 'On Running', category: 'sport', origin: 'ZÜRICH · SWISS ENGINEERING' },
  { id: 'hoka', name: 'Hoka', category: 'sport', origin: 'ANNECY · PERFORMANCE STUDIO' },
  { id: 'puma', name: 'Puma', category: 'sport', origin: 'HERZOGENAURACH · SELECT' },
  { id: 'reebok', name: 'Reebok', category: 'sport', origin: 'BOLTON · HERITAGE ARCHIVE' },
  { id: 'saucony', name: 'Saucony', category: 'sport', origin: 'PENNSYLVANIA · ORIGINALS' },
  { id: 'mizuno', name: 'Mizuno', category: 'sport', origin: 'OSAKA · WAVE STUDIO' },
  { id: 'under armour', name: 'Under Armour', category: 'sport', origin: 'BALTIMORE · PERFORMANCE' },
  { id: 'fila', name: 'Fila', category: 'sport', origin: 'BIELLA · ITALIAN SPORTSWEAR' },
  { id: 'skechers', name: 'Skechers', category: 'sport', origin: 'MANHATTAN BEACH · STUDIO' },

  // Outdoor & Artisanal Casual
  { id: 'salomon', name: 'Salomon', category: 'outdoor', origin: 'ANNECY · ADVANCED LAB' },
  { id: 'arcteryx', name: "Arc'teryx", category: 'outdoor', origin: 'VANCOUVER · SYSTEM_A' },
  { id: 'birkenstock', name: 'Birkenstock 1774', category: 'outdoor', origin: 'NEUSTADT · TRADITION SEIT 1774' },
  { id: 'dr. martens', name: 'Dr. Martens', category: 'outdoor', origin: 'WOLLASTON · MADE IN ENGLAND' },
  { id: 'clarks', name: 'Clarks Originals', category: 'outdoor', origin: 'SOMERSET · EST. 1825' },
  { id: 'timberland', name: 'Timberland', category: 'outdoor', origin: 'NEW HAMPSHIRE · HERITAGE' },
  { id: 'ugg', name: 'UGG', category: 'outdoor', origin: 'CALIFORNIA · COLLECTIVE' },
  { id: 'oakley', name: 'Oakley Factory Team', category: 'outdoor', origin: 'FOOTHILL RANCH · CONCEPT LAB' },
  { id: 'merrell', name: 'Merrell 1TRL', category: 'outdoor', origin: 'VERMONT · TRAIL ARCHIVE' },
  { id: 'crocs', name: 'Crocs Pollex', category: 'outdoor', origin: 'COLORADO · DESIGN COLLABORATIONS' },
]

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  ru: {
    back: 'Назад',
    catalog: 'Подиум',
    archive: 'Избранное',
    info: 'О проекте',
    savedArchive: 'Частный архив',
    sneakerIndex: 'The Lookbook',
    editorialSub: 'CURATED FOOTWEAR & HIGH-FASHION ARCHIVE',
    searchPlaceholder: 'Поиск силуэта, Дома моды или оттенка...',
    searchBtn: 'Искать',
    allBrands: 'Все Дома',
    catAll: 'Все коллекции',
    catLuxury: 'Высокая мода & Люкс',
    catStreet: 'Авангард & Стритвир',
    catSport: 'Спорт-кутюр',
    catOutdoor: 'Аутдор & Классика',
    all: 'Все линии',
    men: 'Мужская линия',
    women: 'Женская линия',
    sortNewest: 'Новые поступления',
    sortPriceDesc: 'Сначала дорогие',
    sortPriceAsc: 'Сначала доступные',
    sortYearDesc: 'По году коллекции',
    emptyArchive: 'В вашем частном архиве пока нет сохраненных силуэтов',
    notFound: 'Силуэты по данному запросу не найдены в архиве',
    resetFilters: 'Вернуться ко всей коллекции',
    priceUnav: 'По запросу бутика',
    retail: 'Бутик',
    find: 'Открыть силуэт',
    buySearch: 'Найти модель в бутиках и ритейле',
    copySku: 'Скопировать полное имя модели',
    copied: 'Скопировано в буфер',
    loadMore: 'Показать следующие силуэты коллекции',
    loading: 'Открываем архив...',
    errorLoad: 'Не удалось получить данные коллекции',
    errorSneakers: 'Временная пауза соединения с архивом',
    errorRateLimit: 'Слишком много обращений. Повторите через минуту.',
    scrollTop: 'Наверх',
    scrollReturn: 'Вернуться',
    searchSuffix: 'купить оригинал',
    piecesCount: 'силуэтов в подборке',
    totalArchive: 'в фонде архива',
    noPhoto: 'Ателье готовит снимок',
    releaseYearLabel: 'Сезон / Год',
    skuLabel: 'Референс',
    genderLabel: 'Линия',
    colorwayLabel: 'Оттенок / Исполнение',
    close: 'Закрыть',
    editorialView: 'Журнал',
    boutiqueView: 'Галерея',
    curatedNote: 'Архивная селекция подиумных моделей, культовых коллабораций и классических силуэтов.',
  },
  uk: {
    back: 'Назад',
    catalog: 'Подіум',
    archive: 'Обране',
    info: 'Про проєкт',
    savedArchive: 'Приватний архів',
    sneakerIndex: 'The Lookbook',
    editorialSub: 'CURATED FOOTWEAR & HIGH-FASHION ARCHIVE',
    searchPlaceholder: 'Пошук силуету, Дому моди або відтінку...',
    searchBtn: 'Шукати',
    allBrands: 'Всі Доми',
    catAll: 'Всі колекції',
    catLuxury: 'Висока мода & Люкс',
    catStreet: 'Авангард & Стрітвір',
    catSport: 'Спорт-кутюр',
    catOutdoor: 'Аутдор & Класика',
    all: 'Всі лінії',
    men: 'Чоловіча лінія',
    women: 'Жіноча лінія',
    sortNewest: 'Нові надходження',
    sortPriceDesc: 'Спочатку дорожчі',
    sortPriceAsc: 'Спочатку доступніші',
    sortYearDesc: 'За роком колекції',
    emptyArchive: 'У вашому приватному архіві поки немає збережених силуетів',
    notFound: 'Силуети за цим запитом не знайдені в архіві',
    resetFilters: 'Повернутися до всієї колекції',
    priceUnav: 'За запитом бутика',
    retail: 'Бутик',
    find: 'Відкрити силует',
    buySearch: 'Знайти модель у бутиках та ритейлі',
    copySku: 'Скопіювати повну назву моделі',
    copied: 'Скопійовано',
    loadMore: 'Показати наступні силуети колекції',
    loading: 'Відкриваємо архів...',
    errorLoad: 'Не вдалося отримати дані колекції',
    errorSneakers: 'Тимчасова пауза з’єднання з архівом',
    errorRateLimit: 'Забагато запитів. Повторіть за хвилину.',
    scrollTop: 'Вгору',
    scrollReturn: 'Повернутися',
    searchSuffix: 'купити в Україні',
    piecesCount: 'силуетів у добірці',
    totalArchive: 'у фонді архіву',
    noPhoto: 'Ательє готує знімок',
    releaseYearLabel: 'Сезон / Рік',
    skuLabel: 'Референс',
    genderLabel: 'Лінія',
    colorwayLabel: 'Відтінок / Виконання',
    close: 'Закрити',
    editorialView: 'Журнал',
    boutiqueView: 'Галерея',
    curatedNote: 'Архівна селекція подіумних моделей, культових колаборацій та класичних силуетів.',
  },
  de: {
    back: 'Zurück',
    catalog: 'Runway',
    archive: 'Archiv',
    info: 'Editorial',
    savedArchive: 'Privates Archiv',
    sneakerIndex: 'The Lookbook',
    editorialSub: 'CURATED FOOTWEAR & HIGH-FASHION ARCHIVE',
    searchPlaceholder: 'Silhouette, Modehaus oder Farbton suchen...',
    searchBtn: 'Suchen',
    allBrands: 'Alle Häuser',
    catAll: 'Alle Kollektionen',
    catLuxury: 'Haute Couture & Luxury',
    catStreet: 'Avantgarde & Street',
    catSport: 'Sport Couture',
    catOutdoor: 'Outdoor & Heritage',
    all: 'Alle Linien',
    men: 'Herrenlinie',
    women: 'Damenlinie',
    sortNewest: 'Neuheiten',
    sortPriceDesc: 'Preis absteigend',
    sortPriceAsc: 'Preis aufsteigend',
    sortYearDesc: 'Nach Kollektionsjahr',
    emptyArchive: 'Ihr privates Archiv enthält noch keine Silhouetten',
    notFound: 'Keine Silhouetten für diese Anfrage gefunden',
    resetFilters: 'Zur gesamten Kollektion',
    priceUnav: 'Auf Anfrage',
    retail: 'Boutique',
    find: 'Silhouette ansehen',
    buySearch: 'In Boutiquen & Online finden',
    copySku: 'Modellname kopieren',
    copied: 'Kopiert',
    loadMore: 'Weitere Silhouetten der Kollektion laden',
    loading: 'Archiv wird geöffnet...',
    errorLoad: 'Fehler beim Laden der Kollektion',
    errorSneakers: 'Archivverbindung unterbrochen',
    errorRateLimit: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
    scrollTop: 'Nach oben',
    scrollReturn: 'Zurück',
    searchSuffix: 'kaufen',
    piecesCount: 'Silhouetten',
    totalArchive: 'im Archivbestand',
    noPhoto: 'Atelieraufnahme folgt',
    releaseYearLabel: 'Saison / Jahr',
    skuLabel: 'Referenz',
    genderLabel: 'Linie',
    colorwayLabel: 'Farbgebung',
    close: 'Schließen',
    editorialView: 'Lookbook',
    boutiqueView: 'Galerie',
    curatedNote: 'Kuratierte Auswahl an Runway-Modellen, ikonischen Kollaborationen und Klassikern.',
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
 * Очищает название модели от дублирования бренда, технических сокращений ("Wmns", "Mens")
 * и выделяет оттенок в кавычках ('Black', 'Scarlet') в отдельную элегантную строку
 */
function parseEditorialTitle(brand: string, rawName: string): {
  silhouette: string
  colorway: string | null
} {
  if (!rawName) return { silhouette: 'Archive Silhouette', colorway: null }
  let cleaned = rawName.trim()

  // Убираем повтор бренда в начале строки
  const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  cleaned = cleaned.replace(new RegExp(`^${escapedBrand}\\s+`, 'i'), '')

  // Убираем технические пометки из базы (Wmns, Womens, Mens, Big Kids и т.д.)
  cleaned = cleaned
    .replace(/\b(Wmns|Womens|Women's|Mens|Men's|Big Kids|Little Kids|Youth|GS|PS|TD)\b\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Извлекаем название расцветки из одинарных или двойных кавычек в конце
  let colorway: string | null = null
  const quoteMatch = cleaned.match(/['"«“]([^'"»”]+)['"»”]\s*$/)
  if (quoteMatch) {
    colorway = quoteMatch[1].trim()
    cleaned = cleaned.slice(0, quoteMatch.index).trim().replace(/[-–—]\s*$/, '').trim()
  }

  return {
    silhouette: cleaned || rawName,
    colorway,
  }
}

function parseReleaseYear(sneaker: Sneaker): string | null {
  const rawDate = sneaker.releaseDate || sneaker.release_date || sneaker.publishedAt
  if (rawDate && typeof rawDate === 'string' && rawDate.length >= 4) {
    const yearMatch = rawDate.match(/\b(19[7-9]\d|20[0-2]\d)\b/)
    if (yearMatch) return yearMatch[1]
  }

  const rawYear = sneaker.year ?? sneaker.releaseYear
  if (rawYear !== null && rawYear !== undefined) {
    const numYear = Number(rawYear)
    if (!Number.isNaN(numYear) && numYear >= 1970 && numYear <= 2027 && numYear !== 2024) {
      return String(numYear)
    }
  }

  const nameYearMatch = sneaker.name?.match(/\b(19[8-9]\d|20[0-2]\d)\b/)
  if (nameYearMatch) return nameYearMatch[1]

  return null
}

function formatLuxuryPrice(price: number): string {
  if (!price || price <= 0) return ''
  return `$${price.toLocaleString('en-US')}`
}

function buildImageSources(rawUrl?: string | null): string[] {
  if (!rawUrl || typeof rawUrl !== 'string') return []
  const trimmed = rawUrl.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return []

  const httpsUrl = trimmed.replace(/^http:\/\//i, 'https://')
  const sources: string[] = []

  if (httpsUrl.includes('stockx.com')) {
    const base = httpsUrl.split('?')[0]
    sources.push(`${base}?fit=fill&bg=FFFFFF&w=900&h=640&auto=format,compress&q=88&trim=color`)
    sources.push(`https://wsrv.nl/?url=${encodeURIComponent(base)}&w=900&q=88&output=webp`)
    return sources
  }

  if (httpsUrl.includes('goat.com') || httpsUrl.includes('flightclub.com')) {
    sources.push(`https://wsrv.nl/?url=${encodeURIComponent(httpsUrl)}&w=900&q=88&output=webp`)
    sources.push(httpsUrl)
    return sources
  }

  sources.push(httpsUrl)
  sources.push(`https://wsrv.nl/?url=${encodeURIComponent(httpsUrl)}&w=900&q=88&output=webp`)
  return sources
}

interface SneakerCardProps {
  sneaker: Sneaker
  index: number
  isFeatured: boolean
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
  isFeatured,
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
  const { silhouette, colorway } = useMemo(
    () => parseEditorialTitle(sneaker.brand, sneaker.name),
    [sneaker.brand, sneaker.name]
  )

  const lookNumber = String(index + 1).padStart(2, '0')
  const isCompact = gridMode === 'boutique' && !isFeatured

  return (
    <article
      onClick={() => onSelect(sneaker, imgState === 'loaded' ? currentSrc : null)}
      className={`group cursor-pointer flex flex-col justify-between transition-all duration-500 ${
        isFeatured && gridMode === 'boutique' ? 'col-span-2 mb-4' : ''
      }`}
    >
      <div>
        {/* ГАЛЕРЕЙНЫЙ ПОДИУМ: без грубых рамок, с крупной подачей обуви */}
        <div
          className={`w-full overflow-hidden relative flex items-center justify-center transition-all duration-700 ${
            isFeatured
              ? 'aspect-[16/10] mb-5'
              : isCompact
              ? 'aspect-[5/4] mb-3.5'
              : 'aspect-[16/10] mb-5'
          }`}
          style={{
            background: isDark
              ? 'radial-gradient(circle at 50% 55%, #1F1F24 0%, #111114 75%)'
              : 'radial-gradient(circle at 50% 55%, #FFFFFF 0%, #EFECE6 85%)',
          }}
        >
          {/* Тонкий журнальный номер Лука в левом верхнем углу */}
          <div className="absolute top-3.5 left-4 z-10 flex items-center gap-2.5 pointer-events-none">
            <span
              className="font-serif italic text-[11px] tracking-[0.08em] opacity-45"
              style={{ color: themeColors.text }}
            >
              Look {lookNumber}
            </span>
            {releaseYear && (
              <span
                className="text-[8px] font-sans uppercase tracking-[0.22em] opacity-40"
                style={{ color: themeColors.text }}
              >
                · {releaseYear}
              </span>
            )}
          </div>

          {/* Кнопка избранного (минималистичное сердце) */}
          <button
            type="button"
            onClick={(e) => toggleFavorite(e, sneaker)}
            aria-label="Save to archive"
            className="absolute top-2.5 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full outline-none bg-transparent border-none cursor-pointer transition-transform active:scale-90"
            style={{ color: isFav ? themeColors.text : themeColors.textMuted }}
          >
            <svg
              width={isCompact ? '15' : '17'}
              height={isCompact ? '15' : '17'}
              viewBox="0 0 24 24"
              fill={isFav ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {imgState === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-7 h-7 rounded-full border border-t-transparent animate-spin opacity-25"
                style={{ borderColor: themeColors.textMuted, borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {/* Увеличенный масштаб обуви, чтобы компенсировать белые поля студийных фото GOAT */}
          {currentSrc && imgState !== 'error' && (
            <img
              src={currentSrc}
              alt={sneaker.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              onLoad={handleImageLoad}
              onError={handleImageError}
              className={`w-[88%] h-[88%] object-contain transition-all duration-700 ease-out ${
                isFeatured
                  ? 'scale-[1.18] group-hover:scale-[1.26]'
                  : isCompact
                  ? 'scale-[1.16] group-hover:scale-[1.24]'
                  : 'scale-[1.18] group-hover:scale-[1.26]'
              } ${imgState === 'loading' ? 'opacity-0' : 'opacity-100'}`}
              style={{
                mixBlendMode: isDark ? 'normal' : 'multiply',
                filter: isDark
                  ? 'drop-shadow(0 18px 28px rgba(0,0,0,0.65))'
                  : 'drop-shadow(0 14px 22px rgba(0,0,0,0.09))',
              }}
            />
          )}

          {imgState === 'error' && (
            <div className="flex flex-col items-center justify-center text-center px-4 select-none">
              <span
                className="font-serif italic text-[13px] opacity-30 mb-1"
                style={{ color: themeColors.text }}
              >
                {sneaker.brand}
              </span>
              <span
                className="text-[8px] font-sans uppercase tracking-[0.24em] opacity-30"
                style={{ color: themeColors.text }}
              >
                {t.noPhoto}
              </span>
            </div>
          )}

          {/* Тонкая подиумная линия внизу кадра */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[1px] opacity-40"
            style={{ backgroundColor: themeColors.borderFaint }}
          />
        </div>

        {/* ТИПОГРАФИКА БУТИКА: Дом моды -> Силуэт -> Оттенок -> Цена */}
        <div className={isFeatured ? 'px-1 text-center max-w-md mx-auto' : 'px-0.5'}>
          <div
            className={`flex items-center gap-2 mb-1 ${
              isFeatured ? 'justify-center' : 'justify-between'
            }`}
          >
            <span
              className="text-[9px] font-sans font-semibold uppercase tracking-[0.26em]"
              style={{ color: themeColors.text }}
            >
              {sneaker.brand}
            </span>

            {sneaker.retailPrice > 0 && !isFeatured && (
              <span
                className="text-[10px] font-sans tracking-[0.12em] shrink-0"
                style={{ color: themeColors.textMuted }}
              >
                {formatLuxuryPrice(sneaker.retailPrice)}
              </span>
            )}
          </div>

          <h3
            className={`font-serif font-normal leading-[1.2] tracking-[-0.01em] ${
              isFeatured
                ? 'text-[22px] sm:text-[26px] mb-1.5'
                : isCompact
                ? 'text-[14px] line-clamp-1 mb-0.5'
                : 'text-[19px] mb-1'
            }`}
            style={{ color: themeColors.text }}
          >
            {silhouette}
          </h3>

          {colorway && (
            <p
              className={`font-serif italic leading-snug ${
                isCompact ? 'text-[11px] line-clamp-1' : 'text-[13px]'
              }`}
              style={{ color: themeColors.textMuted }}
            >
              {colorway}
            </p>
          )}

          {isFeatured && sneaker.retailPrice > 0 && (
            <p
              className="text-[10px] font-sans uppercase tracking-[0.24em] mt-2"
              style={{ color: themeColors.textMuted }}
            >
              {formatLuxuryPrice(sneaker.retailPrice)}
            </p>
          )}
        </div>
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

  // По умолчанию открываем High-Fashion дом Prada или выбранный поисковый запрос
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all')
  const [selectedBrand, setSelectedBrand] = useState<string>(initialQuery ? 'all' : 'prada')
  const [selectedGender, setSelectedGender] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [gridMode, setGridMode] = useState<GridMode>('boutique')

  const [searchText, setSearchText] = useState(initialQuery || '')
  const [activeQuery, setActiveQuery] = useState(initialQuery || 'prada')

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

  // Палитра высокой моды: теплый алебастр и глубокий оникс
  const themeColors = {
    bg: isDark ? '#0A0A0C' : '#F7F4EE',
    cardBg: isDark ? '#141418' : '#EFECE6',
    modalBg: isDark ? '#111114' : '#FAF8F4',
    text: isDark ? '#F5F2EB' : '#111111',
    textMuted: isDark ? 'rgba(245, 242, 235, 0.52)' : 'rgba(17, 17, 17, 0.52)',
    textFaint: isDark ? 'rgba(245, 242, 235, 0.30)' : 'rgba(17, 17, 17, 0.30)',
    border: isDark ? 'rgba(245, 242, 235, 0.15)' : 'rgba(17, 17, 17, 0.14)',
    borderFaint: isDark ? 'rgba(245, 242, 235, 0.07)' : 'rgba(17, 17, 17, 0.07)',
    accent: isDark ? '#D4C3A3' : '#111111',
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

  const activeBrandMeta = useMemo(() => {
    if (hasSearched || selectedBrand === 'all') return null
    return BRANDS.find((b) => b.id === selectedBrand) || null
  }, [selectedBrand, hasSearched])

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
    } else {
      setSelectedBrand('all')
      setSearchText('')
      setHasSearched(false)
      setActiveQuery('all')
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
      const fallbackBrand = selectedBrand === 'all' ? 'prada' : selectedBrand
      setSelectedBrand(fallbackBrand)
      setActiveQuery(fallbackBrand)
    }
    if (searchInputRef.current) searchInputRef.current.focus()
  }

  const handleResetAllFilters = () => {
    haptic('light')
    setSelectedCategory('all')
    setSelectedBrand('prada')
    setSelectedGender('all')
    setSortBy('newest')
    setSearchText('')
    setHasSearched(false)
    setActiveQuery('prada')
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
    { id: 'luxury', label: t.catLuxury },
    { id: 'streetwear', label: t.catStreet },
    { id: 'sport', label: t.catSport },
    { id: 'outdoor', label: t.catOutdoor },
  ]

  const GENDERS = [
    { id: 'all', name: t.all },
    { id: 'men', name: t.men },
    { id: 'women', name: t.women },
  ]

  // Данные для модального окна выбранной пары
  const modalDetails = useMemo(() => {
    if (!selectedModalSneaker) return null
    const s = selectedModalSneaker.sneaker
    const { silhouette, colorway } = parseEditorialTitle(s.brand, s.name)
    const year = parseReleaseYear(s)
    const isFav = favorites.some((f) => f.id === s.id)
    const genderLabel =
      s.gender === 'men' ? t.men : s.gender === 'women' ? t.women : null
    return { silhouette, colorway, year, isFav, genderLabel }
  }, [selectedModalSneaker, favorites, t])

  return (
    <div
      ref={scrollRef}
      className="h-[100dvh] w-full overflow-y-auto px-5 sm:px-10 pt-5 pb-28 transition-colors duration-500 relative select-none"
      style={{ background: themeColors.bg, color: themeColors.text }}
    >
      <div className="max-w-5xl mx-auto">
        {/* МИНИМАЛИСТИЧНАЯ ШАПКА МОДНОГО ДОМА */}
        <div
          role="navigation"
          className="pt-2 pb-4 mb-8 flex items-center justify-between gap-3"
          style={{ borderBottom: `1px solid ${themeColors.borderFaint}` }}
        >
          <button
            type="button"
            onClick={() => {
              haptic('light')
              if (viewState !== 'catalog') setViewState('catalog')
              else if (onBack) onBack()
            }}
            className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.24em] outline-none border-0 bg-transparent cursor-pointer transition-opacity hover:opacity-100 py-1.5"
            style={{
              color: themeColors.textMuted,
              visibility: viewState === 'catalog' && !onBack ? 'hidden' : 'visible',
            }}
          >
            <span>←</span>
            <span>{t.back}</span>
          </button>

          <div className="flex items-center gap-5 sm:gap-7">
            <button
              type="button"
              onClick={() => {
                haptic('light')
                setViewState('catalog')
              }}
              className="py-1.5 text-[10px] font-sans uppercase tracking-[0.24em] outline-none bg-transparent border-none cursor-pointer transition-all"
              style={{
                color: viewState === 'catalog' ? themeColors.text : themeColors.textMuted,
                borderBottom:
                  viewState === 'catalog'
                    ? `1px solid ${themeColors.text}`
                    : '1px solid transparent',
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
              className="py-1.5 flex items-center gap-1.5 text-[10px] font-sans uppercase tracking-[0.24em] outline-none bg-transparent border-none cursor-pointer transition-all"
              style={{
                color: viewState === 'favorites' ? themeColors.text : themeColors.textMuted,
                borderBottom:
                  viewState === 'favorites'
                    ? `1px solid ${themeColors.text}`
                    : '1px solid transparent',
              }}
            >
              <span>{t.archive}</span>
              {favorites.length > 0 && (
                <span className="font-serif italic text-[11px]" style={{ color: themeColors.text }}>
                  ({favorites.length})
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                haptic('light')
                setViewState(viewState === 'about' ? 'catalog' : 'about')
              }}
              className="py-1.5 text-[10px] font-sans uppercase tracking-[0.24em] outline-none bg-transparent border-none cursor-pointer transition-all"
              style={{
                color: viewState === 'about' ? themeColors.text : themeColors.textMuted,
                borderBottom:
                  viewState === 'about'
                    ? `1px solid ${themeColors.text}`
                    : '1px solid transparent',
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
            {/* ЖУРНАЛЬНЫЙ ТИТУЛ (MAISON HEADER) */}
            <div className="flex flex-col items-center text-center mb-9">
              <span
                className="text-[9px] font-sans uppercase tracking-[0.34em] mb-2.5 block"
                style={{ color: themeColors.textMuted }}
              >
                {viewState === 'favorites'
                  ? 'PRIVATE CURATION'
                  : activeBrandMeta?.origin || t.editorialSub}
              </span>

              <h1 className="font-serif font-normal text-4xl sm:text-6xl leading-[1.04] tracking-[-0.02em] uppercase mb-2.5">
                {viewState === 'favorites'
                  ? t.savedArchive
                  : activeBrandMeta
                  ? activeBrandMeta.name
                  : hasSearched
                  ? `«${activeQuery}»`
                  : t.sneakerIndex}
              </h1>

              {viewState === 'catalog' && (
                <p
                  className="font-serif italic text-[13px] sm:text-[15px] max-w-md leading-relaxed"
                  style={{ color: themeColors.textMuted }}
                >
                  {totalInDb !== null && totalInDb > 0
                    ? `${totalInDb.toLocaleString()} ${t.piecesCount}`
                    : t.curatedNote}
                </p>
              )}
            </div>

            {viewState === 'catalog' && (
              <>
                {/* ЭЛЕГАНТНАЯ СТРОКА ПОИСКА */}
                <div
                  className="mb-6 flex items-center max-w-xl mx-auto"
                  style={{ borderBottom: `1px solid ${themeColors.border}` }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    className="opacity-45 shrink-0 mr-3"
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
                    className="w-full py-2.5 text-[13px] font-serif italic outline-none bg-transparent"
                    style={{ color: themeColors.text }}
                  />
                  {searchText && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="p-2 outline-none bg-transparent border-none cursor-pointer opacity-50 hover:opacity-100"
                      style={{ color: themeColors.text }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={triggerSearch}
                    className="pl-3 py-2 text-[9px] font-sans uppercase tracking-[0.26em] outline-none bg-transparent border-none cursor-pointer shrink-0 opacity-75 hover:opacity-100"
                    style={{ color: themeColors.text }}
                  >
                    {t.searchBtn}
                  </button>
                </div>

                {/* КУРАТОРСКИЕ НАПРАВЛЕНИЯ (ВЫСОКАЯ МОДА / АВАНГАРД / СПОРТ-КУТЮР) */}
                <div className="flex justify-start sm:justify-center gap-2 overflow-x-auto pb-3 scrollbar-none mb-2">
                  {CATEGORIES.map((cat) => {
                    const active = selectedCategory === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryClick(cat.id)}
                        className="px-3.5 py-1.5 text-[9px] font-sans uppercase tracking-[0.22em] whitespace-nowrap cursor-pointer outline-none transition-all shrink-0 rounded-full"
                        style={{
                          backgroundColor: active ? themeColors.text : 'transparent',
                          color: active ? themeColors.bg : themeColors.textMuted,
                          border: `1px solid ${active ? themeColors.text : themeColors.borderFaint}`,
                        }}
                      >
                        {cat.label}
                      </button>
                    )
                  })}
                </div>

                {/* ЛЕНТА МОДНЫХ ДОМОВ */}
                <div className="relative mb-6">
                  <div className="flex gap-5 overflow-x-auto py-3 scrollbar-none pr-12">
                    <button
                      type="button"
                      onClick={() => handleBrandClick('all')}
                      className="text-[10px] font-sans uppercase tracking-[0.22em] whitespace-nowrap cursor-pointer outline-none bg-transparent transition-all shrink-0 pb-1"
                      style={{
                        color:
                          selectedBrand === 'all' && !hasSearched
                            ? themeColors.text
                            : themeColors.textMuted,
                        borderBottom:
                          selectedBrand === 'all' && !hasSearched
                            ? `1px solid ${themeColors.text}`
                            : '1px solid transparent',
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
                          className="text-[10px] font-sans uppercase tracking-[0.22em] whitespace-nowrap cursor-pointer outline-none bg-transparent transition-all shrink-0 pb-1"
                          style={{
                            color: isActive ? themeColors.text : themeColors.textMuted,
                            borderBottom: isActive
                              ? `1px solid ${themeColors.text}`
                              : '1px solid transparent',
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

                {/* ТОНКАЯ ПАНЕЛЬ ЛИНИЙ И ПОДАЧИ */}
                <div
                  className="flex flex-wrap items-center justify-between gap-3 py-3 mb-9"
                  style={{
                    borderTop: `1px solid ${themeColors.borderFaint}`,
                    borderBottom: `1px solid ${themeColors.borderFaint}`,
                  }}
                >
                  <div className="flex items-center gap-5">
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
                          className="text-[9px] font-sans uppercase tracking-[0.22em] cursor-pointer outline-none bg-transparent border-none transition-all"
                          style={{
                            color: isActive ? themeColors.text : themeColors.textFaint,
                          }}
                        >
                          {gender.name}
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex items-center gap-5">
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        haptic('light')
                        setSortBy(e.target.value as SortOption)
                      }}
                      className="text-[9px] font-sans uppercase tracking-[0.2em] bg-transparent outline-none border-none cursor-pointer"
                      style={{ color: themeColors.textMuted }}
                    >
                      <option value="newest" style={{ background: themeColors.bg, color: themeColors.text }}>
                        {t.sortNewest}
                      </option>
                      <option value="price_desc" style={{ background: themeColors.bg, color: themeColors.text }}>
                        {t.sortPriceDesc}
                      </option>
                      <option value="price_asc" style={{ background: themeColors.bg, color: themeColors.text }}>
                        {t.sortPriceAsc}
                      </option>
                      <option value="year_desc" style={{ background: themeColors.bg, color: themeColors.text }}>
                        {t.sortYearDesc}
                      </option>
                    </select>

                    {/* Переключатель: Журнал (1 кол.) / Бутик с подиумными акцентами (2 кол.) */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          haptic('light')
                          setGridMode('editorial')
                        }}
                        className="text-[9px] font-sans uppercase tracking-[0.2em] outline-none bg-transparent border-none cursor-pointer"
                        style={{
                          color: gridMode === 'editorial' ? themeColors.text : themeColors.textFaint,
                        }}
                      >
                        {t.editorialView}
                      </button>
                      <span className="opacity-20 text-[9px]">/</span>
                      <button
                        type="button"
                        onClick={() => {
                          haptic('light')
                          setGridMode('boutique')
                        }}
                        className="text-[9px] font-sans uppercase tracking-[0.2em] outline-none bg-transparent border-none cursor-pointer"
                        style={{
                          color: gridMode === 'boutique' ? themeColors.text : themeColors.textFaint,
                        }}
                      >
                        {t.boutiqueView}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* УВЕДОМЛЕНИЕ ОБ ОШИБКЕ */}
            {error && viewState === 'catalog' && (
              <div
                className="p-4 mb-8 flex items-center justify-between"
                style={{ border: `1px solid ${themeColors.border}` }}
              >
                <p className="text-[11px] font-sans uppercase tracking-widest opacity-80">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => fetchSneakers(activeQuery, selectedGender, page, false)}
                  className="text-[10px] font-sans uppercase tracking-widest underline bg-transparent border-none cursor-pointer"
                  style={{ color: themeColors.text }}
                >
                  Обновить
                </button>
              </div>
            )}

            {/* СКЕЛЕТОН ГАЛЕРЕИ */}
            {loading && viewState === 'catalog' && sneakers.length === 0 && (
              <div className="grid grid-cols-2 gap-x-5 gap-y-12 pb-10 animate-pulse">
                {[1, 2, 3, 4, 5].map((n, idx) => (
                  <div key={n} className={idx === 0 ? 'col-span-2' : ''}>
                    <div
                      className={`w-full mb-4 ${idx === 0 ? 'aspect-[16/10]' : 'aspect-[5/4]'}`}
                      style={{ backgroundColor: themeColors.cardBg }}
                    />
                    <div
                      className="h-3 w-20 mb-2"
                      style={{ backgroundColor: themeColors.cardBg }}
                    />
                    <div
                      className="h-4 w-40"
                      style={{ backgroundColor: themeColors.cardBg }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ПУСТОЕ СОСТОЯНИЕ */}
            {!loading && currentDisplayList.length === 0 && (
              <div className="py-24 text-center flex flex-col items-center justify-center gap-5">
                <p
                  className="font-serif italic text-[16px]"
                  style={{ color: themeColors.textMuted }}
                >
                  {viewState === 'favorites' ? t.emptyArchive : t.notFound}
                </p>
                {viewState === 'catalog' && (
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="px-6 py-3 text-[9px] font-sans uppercase tracking-[0.26em] cursor-pointer bg-transparent transition-opacity hover:opacity-80"
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

            {/* ЖУРНАЛЬНАЯ СЕТКА ЛУКБУКА С АКЦЕНТНЫМИ РАЗВОРОТАМИ */}
            {currentDisplayList.length > 0 && (
              <div
                className={
                  gridMode === 'boutique'
                    ? 'grid grid-cols-2 gap-x-4 sm:gap-x-7 gap-y-10 sm:gap-y-14 pb-12'
                    : 'grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-16 pb-12'
                }
              >
                {currentDisplayList.map((sneaker, idx) => {
                  const isFav = favorites.some((f) => f.id === sneaker.id)
                  // В режиме Галереи каждая 5-я модель (1-я, 6-я, 11-я...) подается крупным журнальным разворотом на всю ширину
                  const isFeatured =
                    gridMode === 'boutique' && viewState === 'catalog' && idx % 5 === 0
                  return (
                    <SneakerCard
                      key={sneaker.id}
                      index={idx}
                      isFeatured={isFeatured}
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

            {/* КНОПКА ЗАГРУЗКИ СЛЕДУЮЩИХ ЛУКОВ */}
            {!loading && !error && hasMore && viewState === 'catalog' && currentDisplayList.length > 0 && (
              <div
                className="pt-10 pb-14 text-center"
                style={{ borderTop: `1px solid ${themeColors.borderFaint}` }}
              >
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-9 py-4 text-[9px] font-sans uppercase tracking-[0.3em] outline-none bg-transparent cursor-pointer transition-all hover:opacity-100 opacity-80"
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

      {/* МОДАЛЬНАЯ КАРТОЧКА БУТИКА (БЕЗ ПУСТЫХ ПРОЧЕРКОВ И ТЕХНИЧЕСКОГО ШУМА) */}
      {selectedModalSneaker && modalDetails && (
        <div
          onClick={() => setSelectedModalSneaker(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md transition-opacity"
          style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto px-6 pt-5 pb-8 sm:p-9 relative rounded-t-2xl sm:rounded-none"
            style={{
              backgroundColor: themeColors.modalBg,
              color: themeColors.text,
              borderTop: `1px solid ${themeColors.border}`,
            }}
          >
            {/* Декоративный индикатор шторки на мобильном */}
            <div
              className="w-10 h-1 rounded-full mx-auto mb-4 sm:hidden opacity-20"
              style={{ backgroundColor: themeColors.text }}
            />

            {/* Верхняя панель модалки */}
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-[10px] font-sans font-semibold uppercase tracking-[0.28em]"
                style={{ color: themeColors.text }}
              >
                {selectedModalSneaker.sneaker.brand}
              </span>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={(e) => toggleFavorite(e, selectedModalSneaker.sneaker)}
                  className="p-1 bg-transparent border-none cursor-pointer"
                  style={{ color: modalDetails.isFav ? themeColors.text : themeColors.textMuted }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={modalDetails.isFav ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="1.3"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedModalSneaker(null)}
                  className="text-[9px] font-sans uppercase tracking-[0.24em] bg-transparent border-none cursor-pointer"
                  style={{ color: themeColors.textMuted }}
                >
                  {t.close} ✕
                </button>
              </div>
            </div>

            {/* Крупный подиумный кадр */}
            {selectedModalSneaker.imageUrl && (
              <div
                className="w-full aspect-[16/10] mb-6 flex items-center justify-center overflow-hidden"
                style={{
                  background: isDark
                    ? 'radial-gradient(circle at 50% 55%, #1F1F24 0%, #141418 75%)'
                    : 'radial-gradient(circle at 50% 55%, #FFFFFF 0%, #EFECE6 85%)',
                }}
              >
                <img
                  src={selectedModalSneaker.imageUrl}
                  alt={selectedModalSneaker.sneaker.name}
                  className="w-[88%] h-[88%] object-contain scale-[1.22]"
                  style={{
                    mixBlendMode: isDark ? 'normal' : 'multiply',
                    filter: isDark
                      ? 'drop-shadow(0 20px 30px rgba(0,0,0,0.65))'
                      : 'drop-shadow(0 16px 24px rgba(0,0,0,0.10))',
                  }}
                />
              </div>
            )}

            {/* Название силуэта и расцветка */}
            <div className="mb-5">
              <h2 className="font-serif font-normal text-2xl sm:text-3xl leading-tight mb-1.5">
                {modalDetails.silhouette}
              </h2>
              {modalDetails.colorway && (
                <p
                  className="font-serif italic text-[16px]"
                  style={{ color: themeColors.textMuted }}
                >
                  {modalDetails.colorway}
                </p>
              )}
            </div>

            {/* Отображаем ТОЛЬКО реально заполненные атрибуты (без пустых прочерков "—") */}
            <div
              className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4 my-4"
              style={{
                borderTop: `1px solid ${themeColors.borderFaint}`,
                borderBottom: `1px solid ${themeColors.borderFaint}`,
              }}
            >
              <div>
                <span
                  className="block text-[8px] font-sans uppercase tracking-[0.22em] mb-1"
                  style={{ color: themeColors.textMuted }}
                >
                  {t.retail}
                </span>
                <span className="font-serif text-[18px]">
                  {selectedModalSneaker.sneaker.retailPrice > 0
                    ? formatLuxuryPrice(selectedModalSneaker.sneaker.retailPrice)
                    : t.priceUnav}
                </span>
              </div>

              {modalDetails.genderLabel && (
                <div>
                  <span
                    className="block text-[8px] font-sans uppercase tracking-[0.22em] mb-1"
                    style={{ color: themeColors.textMuted }}
                  >
                    {t.genderLabel}
                  </span>
                  <span className="text-[12px] font-sans uppercase tracking-[0.14em]">
                    {modalDetails.genderLabel}
                  </span>
                </div>
              )}

              {modalDetails.year && (
                <div>
                  <span
                    className="block text-[8px] font-sans uppercase tracking-[0.22em] mb-1"
                    style={{ color: themeColors.textMuted }}
                  >
                    {t.releaseYearLabel}
                  </span>
                  <span className="font-serif text-[16px]">{modalDetails.year}</span>
                </div>
              )}

              {selectedModalSneaker.sneaker.sku && (
                <div>
                  <span
                    className="block text-[8px] font-sans uppercase tracking-[0.22em] mb-1"
                    style={{ color: themeColors.textMuted }}
                  >
                    {t.skuLabel}
                  </span>
                  <span className="text-[11px] font-sans uppercase tracking-[0.12em]">
                    {selectedModalSneaker.sneaker.sku}
                  </span>
                </div>
              )}
            </div>

            {/* Кнопки действий в стиле люксового бутика */}
            <div className="flex flex-col gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => handleExternalBuySearch(selectedModalSneaker.sneaker)}
                className="w-full py-4 px-5 text-[10px] font-sans uppercase tracking-[0.26em] cursor-pointer border-none transition-opacity hover:opacity-90"
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
                className="w-full py-3.5 px-5 text-[9px] font-sans uppercase tracking-[0.24em] cursor-pointer bg-transparent"
                style={{
                  color: themeColors.textMuted,
                  border: `1px solid ${themeColors.borderFaint}`,
                }}
              >
                {copiedId === selectedModalSneaker.sneaker.id ? t.copied : t.copySku}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ПЛАВАЮЩАЯ КНОПКА ПРОКРУТКИ */}
      <button
        type="button"
        onClick={handleSmartScroll}
        className={`fixed bottom-6 right-6 z-40 flex items-center justify-center w-11 h-11 rounded-full outline-none shadow-lg transition-all duration-500 cursor-pointer backdrop-blur-md ${
          buttonMode !== 'hidden'
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{
          background: isDark ? 'rgba(20, 20, 24, 0.85)' : 'rgba(247, 244, 238, 0.88)',
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
          strokeWidth="1.4"
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
