import { useEffect, useState, useMemo, useCallback, useDeferredValue, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Search,
  X,
  Store,
  Tag,
  BookOpen,
  ChevronDown,
  Bookmark,
  TrendingDown,
  Sun,
  Moon
} from 'lucide-react'
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
  history?: number[]
}

type Offer = {
  id: number
  source: string
  price: number 
  unitPrice: number 
  baseUnit: 'кг' | 'л' | 'шт'
  volumeLabel: string 
  multiplier: number 
  url: string | null
  updated_at: string | null
  history?: number[] 
}

type GroupedProduct = {
  key: string
  name: string
  product_code: string | null
  image_url: string | null
  category: string | null
  offers: Offer[]
  minUnitPrice: number
  maxUnitPrice: number
  unitSpread: number 
  latestUpdatedAt: string | null
  outOfStockCount: number
  totalOffers: number
}

type PricesPageProps = {
  onBack: () => void
  lang: Lang
}

type SortOption = 'default' | 'unit-price-asc' | 'savings' | 'name'

const PAGE_SIZE = 15

const DICTIONARY = {
  ru: {
    title: 'Аналитика цен',
    loading: 'Сбор рыночных данных…',
    error: 'Не удалось загрузить данные',
    retry: 'Повторить попытку',
    search: 'Поиск по артикулу или названию...',
    allSources: 'Все источники',
    favorites: 'Отслеживаемые',
    sortDefault: 'Популярные',
    sortUnitPriceAsc: 'Минимальная цена (за 1 ед.)',
    sortSavings: 'Максимальный спред',
    sortName: 'Алфавитный порядок',
    code: 'Арт.',
    bestPrice: 'Лучшее предложение',
    saveUpTo: 'Спред',
    statsTotal: 'индексов',
    statsAvgSpread: 'Ср. волатильность',
    empty: 'Рыночных данных не найдено',
    emptyHint: 'Смягчите критерии поиска для отображения результатов',
    noPrice: 'Нет в наличии',
    singleOffer: 'Монопольное предложение',
    loadMore: 'Загрузить следующие',
    updatedAt: 'Обновлено',
    priceLag: 'Задержка котировки',
    deficit: 'Риск дефицита',
    priceRise: 'Ожидается рост цены',
    urgentBuy: 'Рекомендация к покупке',
  },
  uk: {
    title: 'Аналітика цін',
    loading: 'Збір ринкових даних…',
    error: 'Не вдалося завантажити дані',
    retry: 'Повторити спробу',
    search: 'Пошук за артикулом або назвою...',
    allSources: 'Всі джерела',
    favorites: 'Відстежувані',
    sortDefault: 'Популярні',
    sortUnitPriceAsc: 'Мінімальна ціна (за 1 од.)',
    sortSavings: 'Максимальний спред',
    sortName: 'Алфавітний порядок',
    code: 'Арт.',
    bestPrice: 'Найкраща пропозиція',
    saveUpTo: 'Спред',
    statsTotal: 'індексів',
    statsAvgSpread: 'Сер. волатильність',
    empty: 'Ринкових даних не знайдено',
    emptyHint: 'Помʼякшіть критерії пошуку для відображення результатів',
    noPrice: 'Немає в наявності',
    singleOffer: 'Монопольна пропозиція',
    loadMore: 'Завантажити наступні',
    updatedAt: 'Оновлено',
    priceLag: 'Затримка котирування',
    deficit: 'Ризик дефіциту',
    priceRise: 'Очікується зростання ціни',
    urgentBuy: 'Рекомендація до покупки',
  },
  de: {
    title: 'Preisanalyse',
    loading: 'Marktdaten werden erfasst…',
    error: 'Daten konnten nicht geladen werden',
    retry: 'Erneut versuchen',
    search: 'Suche nach Artikelnummer oder Name...',
    allSources: 'Alle Quellen',
    favorites: 'Beobachtet',
    sortDefault: 'Beliebt',
    sortUnitPriceAsc: 'Günstigste (pro Einheit)',
    sortSavings: 'Max. Spread',
    sortName: 'Alphabetisch',
    code: 'Art.',
    bestPrice: 'Bestes Angebot',
    saveUpTo: 'Spread',
    statsTotal: 'Indizes',
    statsAvgSpread: 'Ø Volatilität',
    empty: 'Keine Marktdaten gefunden',
    emptyHint: 'Lockern Sie die Suchkriterien, um Ergebnisse zu sehen',
    noPrice: 'Nicht auf Lager',
    singleOffer: 'Monopolangebot',
    loadMore: 'Weitere laden',
    updatedAt: 'Aktualisiert',
    priceLag: 'Preisverzögerung',
    deficit: 'Engpassrisiko',
    priceRise: 'Preisanstieg erwartet',
    urgentBuy: 'Kaufempfehlung',
  },
}

const formatSourceName = (sourceId: string) => {
  if (!sourceId) return 'Unknown'
  const customNames: Record<string, string> = {
    zotti: 'Zotti',
    aligo: 'Aligo Group',
    bahtarma: 'Bahtarma',
    bashmachnik: 'Башмачник',
    masterok: 'Masterok',
  }
  return customNames[sourceId.toLowerCase()] || sourceId.charAt(0).toUpperCase() + sourceId.slice(1)
}

const formatDate = (dateStr: string | null, lang: Lang) => {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  
  const locale = lang === 'de' ? 'de-DE' : lang === 'uk' ? 'uk-UA' : 'ru-RU'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(d)
}

const BRAND_ALIASES: Array<[RegExp, string]> = [
  [/\bнайр[іи]т\b/gi, 'nairit'],
  [/\bдесмокол\b/gi, 'desmokol'],
  [/\bdismakol\b/gi, 'desmokol'],
  [/\bбон[іи]кол\b/gi, 'bonikol'],
  [/\bзатверджувач\b/gi, 'hardener'],
  [/\bотвердитель\b/gi, 'hardener'],
  [/\bмультиф[іи]кс\b/gi, 'sarmultifix'],
  [/\bпротрава\b/gi, 'preparatore'],
  [/\bпротравка\b/gi, 'preparatore'],
  [/\bпротирання\b/gi, 'preparatore'],
  [/\bслоник\b/gi, 'solution'],
  [/\b(г|ґ)умов(ий|ої|а|е)\b/gi, 'rubber'],
  [/\bрезинов(ый|ой|ая|ое)\b/gi, 'rubber'],
  [/\bполіуретанов(ий|ої|а|е)\b/gi, 'polyurethane'],
  [/\bполиуретанов(ый|ой|ая|ое)\b/gi, 'polyurethane'],
  [/\bполіхлоропренов(ий|ої|а|е)\b/gi, 'polychloroprene'],
  [/\bполихлоропренов(ый|ой|ая|ое)\b/gi, 'polychloroprene'],
]

function parsePriceSafely(raw: number | string | null | undefined): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return raw > 0 ? raw : 0;
  const cleanStr = String(raw).replace(',', '.').replace(/[^0-9.]/g, '');
  const val = parseFloat(cleanStr);
  return !isNaN(val) && val > 0 ? val : 0;
}

function getVolumeData(raw: string): { baseUnit: 'кг' | 'л' | 'шт'; originalLabel: string; multiplier: number } {
  if (!raw) return { baseUnit: 'шт', originalLabel: '', multiplier: 1 }
  const s = raw.toLowerCase().replace(/,/g, '.').replace(/\u00a0/g, ' ')
  const m = s.match(/(\d+(?:\.\d+)?)\s*(кг|kg|г|гр|g|л|l|літр[а-я]*|литр[а-я]*|мл|ml)(?:[\s.,;)]|$)/i)
  if (!m) return { baseUnit: 'шт', originalLabel: '', multiplier: 1 }
  const num = parseFloat(m[1])
  if (num === 0 || isNaN(num)) return { baseUnit: 'шт', originalLabel: '', multiplier: 1 }
  const u = m[2].toLowerCase()
  if (u.startsWith('л') || u === 'l') return { baseUnit: 'л', originalLabel: `${num} л`, multiplier: 1 / num }
  if (u.startsWith('м') || u === 'ml') return { baseUnit: 'л', originalLabel: `${num} мл`, multiplier: 1000 / num }
  if (['кг', 'kg'].includes(u)) return { baseUnit: 'кг', originalLabel: `${num} кг`, multiplier: 1 / num }
  return { baseUnit: 'кг', originalLabel: `${num} г`, multiplier: 1000 / num }
}

function normalizeProductName(raw: string): string {
  if (!raw) return ''
  let s = raw.toLowerCase().replace(/ё/g, 'е').replace(/['"`«»„“()[\]{}_/\\|–—−\-]/g, ' ')
  for (const [re, rep] of BRAND_ALIASES) s = s.replace(re, ` ${rep} `)
  s = s.replace(/\b\d+([.,]\d+)?\s*(кг|kg|г|гр|g|л|l|літр\w*|литр\w*|мл|ml)(?:[\s.,;)]|$)/gi, ' ')
  const stopWords = [
    'клей', 'взуттєвий', 'обувной', 'обувної', 'банка', 'італія', 'италия', 'чорний', 'черный', 
    'світлий', 'светлый', 'білий', 'белый', 'універсальний', 'универсальный', 'для', 
    'ремонту', 'шкіряного', 'взуття', 'пінополіуретану', 'тканини', 'кг', 'л', 'мл', 'г', 'гр', 'литр', 'шт',
    'розлив', 'на', 'original', 'strong', 'shoe', 'glue', 'в', 'от',
    '06w', '06wn', '006w', 'm', 'і', 'и', 'та', 'або', 'или'
  ]
  const words = s.split(/\s+/).filter(w => w.length > 1 && !stopWords.includes(w))
  return Array.from(new Set(words)).sort().join(' ')
}

function calculateWordSimilarity(name1: string, name2: string): number {
  const w1 = name1.split(' ').filter(Boolean);
  const w2 = name2.split(' ').filter(Boolean);
  if (w1.length === 0 || w2.length === 0) return 0;
  let matches = 0;
  for (const w of w1) {
    if (w2.includes(w)) matches++;
  }
  const unionSize = new Set([...w1, ...w2]).size;
  return matches / unionSize;
}

const formatPrice = (val: number, lang: Lang) => {
  if (!val || val <= 0) return DICTIONARY[lang].noPrice
  const locale = lang === 'de' ? 'de-DE' : lang === 'uk' ? 'uk-UA' : 'ru-RU'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 0,
  }).format(val)
}

// -----------------------------------------------------------------------------
// UI COMPONENTS
// -----------------------------------------------------------------------------

const ProductCard = memo(
  ({
    group,
    lang,
    t,
    isFavorite,
    onToggleFavorite,
  }: {
    group: GroupedProduct
    lang: Lang
    t: typeof DICTIONARY['ru']
    isFavorite: boolean
    onToggleFavorite: (key: string) => void
  }) => {
    const sortedOffers = [...group.offers].sort((a, b) => {
      if (a.unitPrice <= 0) return 1
      if (b.unitPrice <= 0) return -1
      return a.unitPrice - b.unitPrice
    })

    const validPrices = sortedOffers.filter((o) => o.unitPrice > 0).map((o) => o.unitPrice)
    const avgUnitPrice = validPrices.length ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0
    const validOffersCount = validPrices.length
    const showSpread = validOffersCount > 1
    const formattedDate = formatDate(group.latestUpdatedAt, lang)
    const isDeficit = group.totalOffers >= 3 && group.outOfStockCount >= 2

    return (
      <article className="group/card flex flex-col bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 transition-colors hover:border-stone-400 dark:hover:border-stone-600">
        
        {/* Card Header (Editorial Style) */}
        <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex gap-4 items-start relative">
          
          {group.image_url ? (
            <img
              src={group.image_url}
              alt={group.name}
              className="w-16 h-16 object-cover bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 grayscale group-hover/card:grayscale-0 transition-all duration-500 shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 flex items-center justify-center bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-400 shrink-0">
              <Tag size={20} strokeWidth={1.5} />
            </div>
          )}
          
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="font-serif text-lg font-medium leading-snug text-stone-900 dark:text-stone-100 line-clamp-2">
              {group.name}
            </h3>
            
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {group.product_code && (
                <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                  {t.code} {group.product_code}
                </span>
              )}
              {showSpread && group.unitSpread > 0 && (
                <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <TrendingDown size={12} strokeWidth={2} />
                  Spread {group.unitSpread.toFixed(0)}%
                </span>
              )}
              {isDeficit && (
                <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 px-1.5 py-0.5">
                  {t.deficit}
                </span>
              )}
            </div>
          </div>
          
          <button 
            onClick={() => onToggleFavorite(group.key)}
            className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            <Bookmark size={18} strokeWidth={1.5} className={isFavorite ? "fill-stone-900 dark:fill-stone-100 text-stone-900 dark:text-stone-100" : ""} />
          </button>
        </div>

        {/* Offers Index Table */}
        <div className="flex flex-col bg-stone-50/50 dark:bg-stone-900/50">
          {!showSpread && (
            <div className="px-5 py-3 text-[11px] uppercase tracking-widest text-stone-500 flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 last:border-0">
              <Store size={14} strokeWidth={1.5} /> {t.singleOffer}
            </div>
          )}

          {sortedOffers.map((offer, idx) => {
            const isBest = idx === 0 && showSpread && offer.unitPrice > 0
            const isArbitrage = offer.unitPrice > 0 && validOffersCount > 1 && offer.unitPrice < avgUnitPrice * 0.88

            const Comp = offer.url ? 'a' : 'div'
            const historyData = offer.history?.length === 5 
              ? offer.history 
              : [offer.price * 1.05, offer.price * 1.02, offer.price * 1.01, offer.price * 0.99, offer.price].map(Math.round)
            
            const minH = Math.min(...historyData)
            const maxH = Math.max(...historyData)
            const range = maxH - minH || 1

            return (
              <Comp
                key={`${offer.source}_${offer.id}`}
                {...(offer.url ? { href: offer.url, target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={`relative flex items-center justify-between px-5 py-3 border-b border-stone-100 dark:border-stone-800 last:border-0 transition-colors group/row
                  ${isBest ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : 'hover:bg-stone-100/50 dark:hover:bg-stone-800/50'}
                  ${offer.url ? 'cursor-pointer' : ''}
                `}
              >
                {/* Left visual indicator for "Best" */}
                {isBest && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-600 dark:bg-emerald-500" />
                )}

                <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                  <span className={`text-sm font-medium truncate ${isBest ? 'text-stone-900 dark:text-stone-100' : 'text-stone-600 dark:text-stone-400'}`}>
                    {formatSourceName(offer.source)}
                  </span>
                  
                  {offer.volumeLabel && (
                    <span className="text-[11px] text-stone-500 font-mono border border-stone-200 dark:border-stone-700 px-1.5 py-0.5 bg-white dark:bg-stone-800 shrink-0">
                      {offer.volumeLabel}
                    </span>
                  )}
                  
                  {isArbitrage && (
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-500 hidden sm:inline-block shrink-0">
                        {t.urgentBuy}
                     </span>
                  )}
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  {/* Financial Sparkline */}
                  {offer.price > 0 && (
                    <div className="flex items-end gap-[1px] h-4 w-8 opacity-60 grayscale group-hover/row:grayscale-0 transition-all">
                      {historyData.map((val, i) => {
                        const heightPct = Math.max(15, ((val - minH) / range) * 100)
                        const isLast = i === historyData.length - 1
                        const trendDown = historyData[4] < historyData[0]
                        const barColor = isLast 
                          ? (trendDown ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-rose-600 dark:bg-rose-400') 
                          : 'bg-stone-300 dark:bg-stone-600'
                        return (
                          <div key={i} style={{ height: `${heightPct}%` }} className={`flex-1 ${barColor}`} />
                        )
                      })}
                    </div>
                  )}

                  <div className="flex flex-col items-end leading-tight text-right w-24">
                    <span className={`text-sm font-medium tabular-nums ${isBest ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-900 dark:text-stone-100'}`}>
                      {formatPrice(offer.price, lang)}
                    </span>
                    {offer.multiplier !== 1 && offer.unitPrice > 0 && (
                      <span className="text-[10px] text-stone-500 font-mono tracking-tighter mt-1">
                        ≈ {Math.round(offer.unitPrice)} / {offer.baseUnit}
                      </span>
                    )}
                  </div>
                </div>
              </Comp>
            )
          })}
        </div>
        
        {/* Footer Meta */}
        {formattedDate && (
          <div className="px-5 py-2.5 bg-stone-100 dark:bg-stone-950/50 text-[10px] text-stone-500 uppercase tracking-widest flex items-center justify-between border-t border-stone-200 dark:border-stone-800">
            <span>{t.updatedAt}</span>
            <span className="font-mono">{formattedDate}</span>
          </div>
        )}
      </article>
    )
  },
  (prev, next) =>
    prev.group.key === next.group.key &&
    prev.lang === next.lang &&
    prev.isFavorite === next.isFavorite
)

export function PricesPage({ onBack, lang }: PricesPageProps) {
  const t = DICTIONARY[lang]
  
  // State
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eurRate, setEurRate] = useState<number | null>(null)
  const [usdRate, setUsdRate] = useState<number | null>(null)
  
  // Theme State
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    return false
  })

  // ИСПРАВЛЕНИЕ: Гарантированное переключение темы для Tailwind CSS
  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [selectedSource, setSelectedSource] = useState<string>('all') 
  const [sortBy, setSortBy] = useState<SortOption>('default')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('price_favorites')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const toggleFavorite = useCallback((key: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      localStorage.setItem('price_favorites', JSON.stringify([...next]))
      return next
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [apiRes, ratesRes] = await Promise.all([
        fetch(`/api/prices?_t=${Date.now()}`).catch(() => null),
        fetch(`/api/rates?_t=${Date.now()}`).catch(() => null),
      ])
      if (!apiRes || !apiRes.ok) throw new Error('API error')
      const data = await apiRes.json()
      setItems(Array.isArray(data) ? data : [])

      if (ratesRes && ratesRes.ok) {
        const rates = await ratesRes.json()
        if (rates?.usd) setUsdRate(Number(rates.usd))
        if (rates?.eur) setEurRate(Number(rates.eur))
      }
    } catch {
      setError(t.error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [t.error])

  useEffect(() => { load() }, [load])

  const sources = useMemo(() => Array.from(new Set(items.map((i) => i.source).filter(Boolean) as string[])).sort(), [items])

  const baseGroupedItems = useMemo(() => {
    const groups: GroupedProduct[] = [];
    items.forEach((item) => {
      let validPrice = parsePriceSafely(item.current_price);
      if (validPrice > 50000) validPrice = 0;
      const volData = getVolumeData(item.name);
      const unitPrice = validPrice * volData.multiplier;
      const cleanName = normalizeProductName(item.name);
      const code = item.product_code?.trim()?.toLowerCase();

      let targetGroup: GroupedProduct | null = null;
      if (code && code.length >= 2) targetGroup = groups.find(g => g.product_code?.toLowerCase() === code) || null;
      
      if (!targetGroup && cleanName.length >= 2 && groups.length > 0) {
        let bestMatchScore = 0;
        let bestMatchIndex = -1;
        for (let i = 0; i < groups.length; i++) {
          const score = calculateWordSimilarity(cleanName, groups[i].key);
          if (score > bestMatchScore) {
            bestMatchScore = score;
            bestMatchIndex = i;
          }
        }
        if (bestMatchScore >= 0.65) targetGroup = groups[bestMatchIndex];
      }

      const offer: Offer = {
        id: item.id,
        source: item.source || 'unknown',
        price: validPrice,
        unitPrice,
        baseUnit: volData.baseUnit,
        volumeLabel: volData.originalLabel,
        multiplier: volData.multiplier,
        url: item.url,
        updated_at: item.updated_at,
        history: item.history
      };

      if (targetGroup) {
        if (!targetGroup.offers.some((o) => o.id === item.id || (o.url && o.url === item.url))) {
          targetGroup.offers.push(offer);
        }
        if (item.name.length > targetGroup.name.length) targetGroup.name = item.name;
        if (!targetGroup.image_url && item.image_url) targetGroup.image_url = item.image_url;
        if (!targetGroup.product_code && item.product_code) targetGroup.product_code = item.product_code;
        if (item.updated_at && (!targetGroup.latestUpdatedAt || new Date(item.updated_at) > new Date(targetGroup.latestUpdatedAt))) {
          targetGroup.latestUpdatedAt = item.updated_at;
        }
      } else {
        groups.push({
          key: cleanName || `raw_${item.id}`,
          name: item.name,
          product_code: item.product_code,
          image_url: item.image_url,
          category: item.category,
          offers: [offer],
          minUnitPrice: Infinity,
          maxUnitPrice: -Infinity,
          unitSpread: 0,
          latestUpdatedAt: item.updated_at,
          outOfStockCount: 0,
          totalOffers: 0,
        });
      }
    });

    return groups.map((group) => {
      const priced = group.offers.filter((o) => o.unitPrice > 0);
      group.minUnitPrice = priced.length ? Math.min(...priced.map((o) => o.unitPrice)) : 0;
      group.maxUnitPrice = priced.length ? Math.max(...priced.map((o) => o.unitPrice)) : 0;
      group.unitSpread = group.minUnitPrice > 0 ? ((group.maxUnitPrice - group.minUnitPrice) / group.minUnitPrice) * 100 : 0;
      group.totalOffers = group.offers.length;
      group.outOfStockCount = group.offers.filter((o) => o.unitPrice <= 0).length;
      return group;
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = baseGroupedItems
    if (selectedSource === 'favorites') result = result.filter(g => favorites.has(g.key))
    else if (selectedSource !== 'all') result = result.filter((g) => g.offers.some((o) => o.source.toLowerCase() === selectedSource.toLowerCase()))

    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase().trim()
      result = result.filter((g) => g.name.toLowerCase().includes(q) || (g.product_code && g.product_code.toLowerCase().includes(q)))
    }

    return result.sort((a, b) => {
      if (sortBy === 'unit-price-asc') return a.minUnitPrice - b.minUnitPrice
      if (sortBy === 'savings') return b.unitSpread - a.unitSpread
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return b.offers.length - a.offers.length || b.unitSpread - a.unitSpread
    })
  }, [baseGroupedItems, deferredSearchQuery, selectedSource, sortBy, favorites])

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [deferredSearchQuery, selectedSource, sortBy])

  const stats = useMemo(() => {
    const multi = filteredItems.filter((g) => g.offers.length > 1)
    return {
      total: filteredItems.length,
      multiCount: multi.length,
      avgSpread: multi.length ? (multi.reduce((acc, g) => acc + g.unitSpread, 0) / multi.length).toFixed(1) : '0.0',
    }
  }, [filteredItems])

  return (
    <div className={isDark ? 'dark' : ''}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col h-[100dvh] bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans transition-colors duration-300"
      >
        {/* ИНТЕГРИРОВАННЫЙ ОБНОВЛЕННЫЙ ХЕДЕР */}
        <header className="shrink-0 z-20 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 pt-5 pb-4 px-4 md:px-8 transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            
            {/* НОВЫЙ БЛОК ХЕДЕРА С АДАПТИВНОЙ СВОДКОЙ КОТИРОВОК И КНОПКОЙ ТЕМЫ */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={onBack}
                  className="w-10 h-10 border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors shrink-0"
                  aria-label="Назад"
                >
                  <ArrowLeft size={18} strokeWidth={1.5} />
                </button>
                <div className="min-w-0">
                  <h1 className="font-serif text-2xl md:text-3xl tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
                    <BookOpen size={22} className="text-stone-400 dark:text-stone-500 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{t.title}</span>
                  </h1>
                  
                  {/* Биржевая сводка: видна и на смартфонах, и на десктопе */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-stone-400 mt-1 font-mono">
                    <span>{stats.total} {t.statsTotal}</span>
                    {stats.multiCount > 0 && (
                      <>
                        <span className="text-stone-300 dark:text-stone-700 font-sans">/</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-sans font-medium">
                          {t.statsAvgSpread}: {stats.avgSpread}%
                        </span>
                      </>
                    )}
                    {(usdRate || eurRate) && (
                      <>
                        <span className="text-stone-300 dark:text-stone-700 font-sans">/</span>
                        <span className="tabular-nums font-semibold text-stone-800 dark:text-stone-200">
                          {usdRate && `$ ${usdRate.toFixed(2)}`}
                          {usdRate && eurRate && ' · '}
                          {eurRate && `€ ${eurRate.toFixed(2)}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Переключатель темы */}
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2.5 border border-stone-200 dark:border-stone-800 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors shrink-0"
                aria-label="Сменить тему"
              >
                {isDark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
              </button>
            </div>

            {/* Editorial Filters Toolbar */}
            <div className="flex flex-col lg:flex-row gap-3 border-t border-stone-200 dark:border-stone-800 pt-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.search}
                  className="w-full h-10 pl-10 pr-9 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:border-stone-900 dark:focus:border-stone-400 outline-none text-sm placeholder:text-stone-400 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                  >
                    <X size={15} strokeWidth={1.5} />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-10 px-3 text-xs uppercase tracking-wider bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 outline-none cursor-pointer appearance-none shrink-0"
                >
                  <option value="default">{t.sortDefault}</option>
                  <option value="savings">{t.sortSavings}</option>
                  <option value="unit-price-asc">{t.sortUnitPriceAsc}</option>
                  <option value="name">{t.sortName}</option>
                </select>

                <div className="h-5 w-px bg-stone-200 dark:border-stone-800 shrink-0" />

                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => setSelectedSource('all')}
                    className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold transition-colors border ${
                      selectedSource === 'all' 
                        ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900' 
                        : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    {t.allSources}
                  </button>
                  <button
                    onClick={() => setSelectedSource('favorites')}
                    className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors border ${
                      selectedSource === 'favorites' 
                        ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900' 
                        : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    <Bookmark size={13} strokeWidth={selectedSource === 'favorites' ? 2 : 1.5} className={selectedSource === 'favorites' ? "fill-current" : ""} />
                    {t.favorites}
                  </button>
                  {sources.map((src) => (
                    <button
                      key={src}
                      onClick={() => setSelectedSource(src)}
                      className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold transition-colors border ${
                        selectedSource === src 
                          ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900' 
                          : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                    >
                      {formatSourceName(src)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 no-scrollbar bg-stone-100/50 dark:bg-[#12100E]">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-60 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <p className="font-serif text-xl text-stone-600 dark:text-stone-400 mb-6">{error}</p>
                <button
                  onClick={load}
                  className="px-8 py-3 border border-stone-900 dark:border-stone-100 text-xs uppercase tracking-widest font-semibold hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-900 transition-colors"
                >
                  {t.retry}
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-center text-stone-500">
                <Tag size={44} strokeWidth={1} className="mb-4 opacity-40" />
                <p className="font-serif text-2xl text-stone-900 dark:text-stone-100 mb-2">{t.empty}</p>
                <p className="text-sm tracking-wide">{t.emptyHint}</p>
              </div>
            ) : (
              <div className="pb-14">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                  <AnimatePresence>
                    {filteredItems.slice(0, visibleCount).map((g) => (
                      <motion.div
                        key={g.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ProductCard
                          group={g}
                          lang={lang}
                          t={t}
                          isFavorite={favorites.has(g.key)}
                          onToggleFavorite={toggleFavorite}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {visibleCount < filteredItems.length && (
                  <div className="mt-10 flex justify-center">
                    <button
                      onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                      className="px-8 py-3.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs uppercase tracking-widest font-semibold text-stone-900 dark:text-stone-100 hover:border-stone-900 dark:hover:border-stone-100 transition-colors flex items-center gap-2.5"
                    >
                      {t.loadMore} <ChevronDown size={14} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </motion.div>
    </div>
  )
}
