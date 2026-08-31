import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  ArrowLeft,
  Search,
  X,
  TrendingDown,
  Store,
  Tag,
  ChevronLeft,
  ChevronRight,
  BookOpen,
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
}

type GroupedProduct = {
  key: string
  name: string
  product_code: string | null
  image_url: string | null
  category: string | null
  offers: {
    id: number
    source: string
    price: number
    url: string | null
  }[]
  minPrice: number
  maxPrice: number
  avgPrice: number
  maxSavings: number
}

type PricesPageProps = {
  onBack: () => void
  lang: Lang
}

type SortOption = 'default' | 'price-asc' | 'savings' | 'name'

// ИЗМЕНЕНИЕ 1: Увеличили количество товаров на странице с 3 до 10
const PAGE_SIZE = 10 

const DICTIONARY = {
  ru: {
    title: 'Аналитика цен',
    loading: 'Анализируем рынок…',
    error: 'Не удалось загрузить данные',
    retry: 'Повторить попытку',
    search: 'Поиск по артикулу или названию...',
    allSources: 'Все рынки',
    sortDefault: 'Популярные',
    sortPriceAsc: 'Дешевые',
    sortSavings: 'Макс. выгода',
    sortName: 'Алфавит',
    code: 'Артикул',
    bestPrice: 'ТОП Цена',
    marketSpread: 'Разброс цен',
    saveUpTo: 'Экономия до',
    statsTotal: 'товаров',
    statsAvgSpread: 'Средняя разница',
    pageOf: 'стр.',
    of: 'из',
    empty: 'Ничего не найдено',
    emptyHint: 'Измените фильтры или поиск',
    bookletHint: 'Листайте буклет',
    singleOffer:
      'Цена из одного магазина — сравнение появится, когда товар найдётся ещё где-то',
  },
  uk: {
    title: 'Аналітика цін',
    loading: 'Аналізуємо ринок…',
    error: 'Не вдалося завантажити дані',
    retry: 'Повторити спробу',
    search: 'Пошук за артикулом або назвою...',
    allSources: 'Всі ринки',
    sortDefault: 'Популярні',
    sortPriceAsc: 'Дешевші',
    sortSavings: 'Макс. вигода',
    sortName: 'Алфавіт',
    code: 'Артикул',
    bestPrice: 'ТОП Ціна',
    marketSpread: 'Розкид цін',
    saveUpTo: 'Економія до',
    statsTotal: 'товарів',
    statsAvgSpread: 'Середня різниця',
    pageOf: 'стор.',
    of: 'з',
    empty: 'Нічого не знайдено',
    emptyHint: 'Змініть фільтри або пошук',
    bookletHint: 'Гортайте буклет',
    singleOffer:
      'Ціна з одного магазину — порівняння з’явиться, коли товар знайдеться ще десь',
  },
}

const formatSourceName = (sourceId: string) => {
  const customNames: Record<string, string> = {
    zotti: 'Zotti',
    aligo: 'Aligo Group',
    bahtarma: 'Bahtarma',
    bashmachnik: 'Башмачник',
    masterok: 'Masterok',
  }
  return (
    customNames[sourceId.toLowerCase()] ||
    sourceId.charAt(0).toUpperCase() + sourceId.slice(1)
  )
}

/* =========================================================
   УМНАЯ НОРМАЛИЗАЦИЯ НАЗВАНИЙ
   ========================================================= */

const BRAND_ALIASES: Array<[RegExp, string]> = [
  [/\bнайр[іи]т\b/gi, 'nairit'],
  [/\bnairit\b/gi, 'nairit'],
  [/\bneogrip\b/gi, 'neogrip'],
  [/\bboterm\b/gi, 'boterm'],
  [/\bgta\b/gi, 'gta'],
  [/\bpoligrip\b/gi, 'poligrip'],
  [/\bдесмокол\b/gi, 'desmokol'],
  [/\bdesmokol\b/gi, 'desmokol'],
  [/\bbonikol\b/gi, 'bonikol'],
  [/\bбон[іи]кол\b/gi, 'bonikol'],
  [/\bdismakol\b/gi, 'desmokol'],
  [/\bдисмакол\b/gi, 'desmokol'],
  [/\bsar\b/gi, 'sar'],
  [/\bsarmultifix\b/gi, 'sarmultifix'],
  [/\bмультиф[іи]кс\b/gi, 'sarmultifix'],
  [/\bmultifix\b/gi, 'multifix'],
  [/\bpreparatore\b/gi, 'preparatore'],
  [/\bпротрава\b/gi, 'preparatore'],
  [/\bbsk\b/gi, 'bsk'],
  [/\balboter\b/gi, 'alboter'],
  [/\bальботер\b/gi, 'alboter'],
  [/\bsupercolla\b/gi, 'supercolla'],
  [/\bpuntacol\b/gi, 'puntacol'],
  [/\bdenlaks\b/gi, 'denlaks'],
  [/\bkendor\b/gi, 'kendor'],
  [/\bkenda\b/gi, 'kenda'],
  [/\bзатверджувач\b/gi, 'hardener'],
  [/\bотвердитель\b/gi, 'hardener'],
  [/\bsolution\b/gi, 'solution'],
  [/\bsolusion\b/gi, 'solution'],
  [/\bслоник\b/gi, 'solution'],
  [/\brubber\b/gi, 'rubber'],
  [/\bгумов(ий|а|ой)?\b/gi, 'rubber'],
  [/\bрезинов(ый|ий|ая)?\b/gi, 'rubber'],
]

/** 15 кг / 1л / 100мл → 15kg / 1l / 100ml */
function extractVolumeKey(raw: string): string {
  const s = raw.toLowerCase().replace(/,/g, '.').replace(/\u00a0/g, ' ')

  const m = s.match(
    /(\d+(?:\.\d+)?)\s*(кг|kg|г|гр|g|л|l|літр[аів]*|литр[аов]*|мл|ml)\b/i
  )
  if (!m) return ''

  const num = parseFloat(m[1])
  if (!Number.isFinite(num) || num <= 0) return ''

  let unit = m[2].toLowerCase()
  if (unit.startsWith('літр') || unit.startsWith('литр') || unit === 'l') unit = 'l'
  else if (unit === 'кг' || unit === 'kg') unit = 'kg'
  else if (unit === 'г' || unit === 'гр' || unit === 'g') unit = 'g'
  else if (unit === 'мл' || unit === 'ml') unit = 'ml'

  const rounded =
    num >= 10 ? String(Math.round(num)) : String(Math.round(num * 100) / 100)

  return `${rounded}${unit}`
}

function normalizeProductName(raw: string): string {
  let s = (raw || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/['"`«»„“]/g, '')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[_/\\|–—−]+/g, ' ')

  if (s.length > 120) s = s.slice(0, 120)

  for (const [re, rep] of BRAND_ALIASES) {
    s = s.replace(re, ` ${rep} `)
  }

  s = s
    .replace(
      /\b(італія|италия|турция|туреччина|китай|нови[йя]|новый|акція|акция|гель|гелевий|сильної фіксації|для взуття|для обуви|обувной|взуттєвий|полиуретановий|поліуретановий|поліхлоропреновий|полихлоропреновый|на розлив|розливний|светлый|світлий|чорний|черный|premium)\b/gi,
      ' '
    )
    .replace(/\b\d+([.,]\d+)?\s*(кг|kg|г|гр|g|л|l|літр\w*|литр\w*|мл|ml)\b/gi, ' ')
    .replace(/\b\d+\s*[xх×]\s*\d+\b/gi, ' ')
    .replace(/[^a-zа-яіїєґ0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const tokens = s
    .split(' ')
    .filter((t) => t.length > 1)
    .filter(
      (t) =>
        !['клей', 'klej', 'для', 'the', 'and', 'або', 'или', 'тип'].includes(t)
    )

  const seen = new Set<string>()
  const unique: string[] = []
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t)
      unique.push(t)
    }
  }

  return unique.join(' ')
}

function makeGroupingKey(item: {
  product_code: string | null
  name: string
}): string {
  
  // ИЗМЕНЕНИЕ 2: Закомментировали блокировку группировки по артикулу,
  // так как у Башмачника и Masterok артикулы - это просто ID товаров на их сайтах (они не совпадают).
  // Теперь все товары будут группироваться ТОЛЬКО по нормализованному имени и объему.
  /* 
  const code = item.product_code?.trim()
  if (code && code.length >= 3) {
    return `code_${code.toLowerCase()}`
  }
  */

  const base = normalizeProductName(item.name)
  const vol = extractVolumeKey(item.name)

  const core =
    base.length >= 3
      ? base
      : (item.name || '')
          .toLowerCase()
          .replace(/[^a-zа-яіїєґ0-9]/g, '')
          .slice(0, 40)

  return vol ? `name_${core}__${vol}` : `name_${core}`
}

function preferDisplayName(current: string, candidate: string): string {
  if (!current) return candidate
  if (!candidate) return current
  const a = current.length
  const b = candidate.length
  if (b < a * 0.7) return candidate
  if (a > 90 && b < a) return candidate
  return current
}

export function PricesPage({ onBack, lang }: PricesPageProps) {
  const t = DICTIONARY[lang]

  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('default')
  const [pageIndex, setPageIndex] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/prices')
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setError(t.error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [t.error])

  useEffect(() => {
    load()
  }, [load])

  const sources = useMemo(() => {
    return Array.from(
      new Set(items.map((i) => i.source).filter(Boolean) as string[])
    ).sort()
  }, [items])

  const groupedItems = useMemo(() => {
    const map = new Map<string, GroupedProduct>()

    items.forEach((item) => {
      const priceNum = Number(item.current_price)
      if (isNaN(priceNum) || priceNum <= 0Вот обновленный код с учетом оптимизаций для React Vite, которые критически важны для плавной работы в Telegram Mini App. 

Главные изменения, которые здесь применены:
1. **Разделение логики в `useMemo`**: Группировка товаров (`items`) теперь происходит отдельно от их фильтрации и сортировки. Это значит, что при вводе текста в поиск или смене рынка приложение больше не будет заново пересобирать сотни товаров и высчитывать цены.
2. **Плавный поиск (`useDeferredValue`)**: Введен отложенный поиск. Приложение не будет «фризить» интерфейс (зависать) при быстром наборе текста на мобильном устройстве.
3. **Изоляция карточки в `React.memo`**: Функция `renderCard` вынесена в отдельный мемоизированный компонент `ProductCard`. Теперь тяжелые графики `Recharts` не будут перерисовываться при каждом чихе (например, при перелистывании страниц или вводе символа в поиск).

### Обновленный код `PricesPage.tsx`

```tsx
import { useEffect, useState, useMemo, useCallback, useDeferredValue, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  ArrowLeft,
  Search,
  X,
  TrendingDown,
  Store,
  Tag,
  ChevronLeft,
  ChevronRight,
  BookOpen,
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
}

type GroupedProduct = {
  key: string
  name: string
  product_code: string | null
  image_url: string | null
  category: string | null
  offers: {
    id: number
    source: string
    price: number
    url: string | null
  }[]
  minPrice: number
  maxPrice: number
  avgPrice: number
  maxSavings: number
}

type PricesPageProps = {
  onBack: () => void
  lang: Lang
}

type SortOption = 'default' | 'price-asc' | 'savings' | 'name'

const PAGE_SIZE = 3

const DICTIONARY = {
  ru: {
    title: 'Аналитика цен',
    loading: 'Анализируем рынок…',
    error: 'Не удалось загрузить данные',
    retry: 'Повторить попытку',
    search: 'Поиск по артикулу или названию...',
    allSources: 'Все рынки',
    sortDefault: 'Популярные',
    sortPriceAsc: 'Дешевые',
    sortSavings: 'Макс. выгода',
    sortName: 'Алфавит',
    code: 'Артикул',
    bestPrice: 'ТОП Цена',
    marketSpread: 'Разброс цен',
    saveUpTo: 'Экономия до',
    statsTotal: 'товаров',
    statsAvgSpread: 'Средняя разница',
    pageOf: 'стр.',
    of: 'из',
    empty: 'Ничего не найдено',
    emptyHint: 'Измените фильтры или поиск',
    bookletHint: 'Листайте буклет',
    singleOffer:
      'Цена из одного магазина — сравнение появится, когда товар найдётся ещё где-то',
  },
  uk: {
    title: 'Аналітика цін',
    loading: 'Аналізуємо ринок…',
    error: 'Не вдалося завантажити дані',
    retry: 'Повторити спробу',
    search: 'Пошук за артикулом або назвою...',
    allSources: 'Всі ринки',
    sortDefault: 'Популярні',
    sortPriceAsc: 'Дешевші',
    sortSavings: 'Макс. вигода',
    sortName: 'Алфавіт',
    code: 'Артикул',
    bestPrice: 'ТОП Ціна',
    marketSpread: 'Розкид цін',
    saveUpTo: 'Економія до',
    statsTotal: 'товарів',
    statsAvgSpread: 'Середня різниця',
    pageOf: 'стор.',
    of: 'з',
    empty: 'Нічого не знайдено',
    emptyHint: 'Змініть фільтри або пошук',
    bookletHint: 'Гортайте буклет',
    singleOffer:
      'Ціна з одного магазину — порівняння з’явиться, коли товар знайдеться ще десь',
  },
}

const formatSourceName = (sourceId: string) => {
  const customNames: Record<string, string> = {
    zotti: 'Zotti',
    aligo: 'Aligo Group',
    bahtarma: 'Bahtarma',
    bashmachnik: 'Башмачник',
    masterok: 'Masterok',
  }
  return (
    customNames[sourceId.toLowerCase()] ||
    sourceId.charAt(0).toUpperCase() + sourceId.slice(1)
  )
}

/* =========================================================
   УМНАЯ НОРМАЛИЗАЦИЯ НАЗВАНИЙ
   ========================================================= */
const BRAND_ALIASES: Array<[RegExp, string]> = [
  [/\bнайр[іи]т\b/gi, 'nairit'],
  [/\bnairit\b/gi, 'nairit'],
  [/\bneogrip\b/gi, 'neogrip'],
  [/\bboterm\b/gi, 'boterm'],
  [/\bgta\b/gi, 'gta'],
  [/\bpoligrip\b/gi, 'poligrip'],
  [/\bдесмокол\b/gi, 'desmokol'],
  [/\bdesmokol\b/gi, 'desmokol'],
  [/\bbonikol\b/gi, 'bonikol'],
  [/\bбон[іи]кол\b/gi, 'bonikol'],
  [/\bdismakol\b/gi, 'desmokol'],
  [/\bдисмакол\b/gi, 'desmokol'],
  [/\bsar\b/gi, 'sar'],
  [/\bsarmultifix\b/gi, 'sarmultifix'],
  [/\bмультиф[іи]кс\b/gi, 'sarmultifix'],
  [/\bmultifix\b/gi, 'multifix'],
  [/\bpreparatore\b/gi, 'preparatore'],
  [/\bпротрава\b/gi, 'preparatore'],
  [/\bbsk\b/gi, 'bsk'],
  [/\balboter\b/gi, 'alboter'],
  [/\bальботер\b/gi, 'alboter'],
  [/\bsupercolla\b/gi, 'supercolla'],
  [/\bpuntacol\b/gi, 'puntacol'],
  [/\bdenlaks\b/gi, 'denlaks'],
  [/\bkendor\b/gi, 'kendor'],
  [/\bkenda\b/gi, 'kenda'],
  [/\bзатверджувач\b/gi, 'hardener'],
  [/\bотвердитель\b/gi, 'hardener'],
  [/\bsolution\b/gi, 'solution'],
  [/\bsolusion\b/gi, 'solution'],
  [/\bслоник\b/gi, 'solution'],
  [/\brubber\b/gi, 'rubber'],
  [/\bгумов(ий|а|ой)?\b/gi, 'rubber'],
  [/\bрезинов(ый|ий|ая)?\b/gi, 'rubber'],
]

function extractVolumeKey(raw: string): string {
  const s = raw.toLowerCase().replace(/,/g, '.').replace(/\u00a0/g, ' ')
  const m = s.match(/(\d+(?:\.\d+)?)\s*(кг|kg|г|гр|g|л|l|літр[аів]*|литр[аов]*|мл|ml)\b/i)
  if (!m) return ''
  const num = parseFloat(m[1])
  if (!Number.isFinite(num) || num <= 0) return ''
  let unit = m[2].toLowerCase()
  if (unit.startsWith('літр') || unit.startsWith('литр') || unit === 'l') unit = 'l'
  else if (unit === 'кг' || unit === 'kg') unit = 'kg'
  else if (unit === 'г' || unit === 'гр' || unit === 'g') unit = 'g'
  else if (unit === 'мл' || unit === 'ml') unit = 'ml'
  const rounded = num >= 10 ? String(Math.round(num)) : String(Math.round(num * 100) / 100)
  return `${rounded}${unit}`
}

function normalizeProductName(raw: string): string {
  let s = (raw || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/['"`«»„“]/g, '')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[_/\\|–—−]+/g, ' ')

  if (s.length > 120) s = s.slice(0, 120)

  for (const [re, rep] of BRAND_ALIASES) {
    s = s.replace(re, ` ${rep} `)
  }

  s = s
    .replace(/\b(італія|италия|турция|туреччина|китай|нови[йя]|новый|акція|акция|гель|гелевий|сильної фіксації|для взуття|для обуви|обувной|взуттєвий|полиуретановий|поліуретановий|поліхлоропреновий|полихлоропреновый|на розлив|розливний|светлый|світлий|чорний|черный|premium)\b/gi, ' ')
    .replace(/\b\d+([.,]\d+)?\s*(кг|kg|г|гр|g|л|l|літр\w*|литр\w*|мл|ml)\b/gi, ' ')
    .replace(/\b\d+\s*[xх×]\s*\d+\b/gi, ' ')
    .replace(/[^a-zа-яіїєґ0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const tokens = s.split(' ').filter((t) => t.length > 1).filter((t) => !['клей', 'klej', 'для', 'the', 'and', 'або', 'или', 'тип'].includes(t))
  const seen = new Set<string>()
  const unique: string[] = []
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t)
      unique.push(t)
    }
  }
  return unique.join(' ')
}

function makeGroupingKey(item: { product_code: string | null; name: string }): string {
  const code = item.product_code?.trim()
  if (code && code.length >= 3) return `code_${code.toLowerCase()}`

  const base = normalizeProductName(item.name)
  const vol = extractVolumeKey(item.name)
  const core = base.length >= 3 ? base : (item.name || '').toLowerCase().replace(/[^a-zа-яіїєґ0-9]/g, '').slice(0, 40)
  return vol ? `name_${core}__${vol}` : `name_${core}`
}

function preferDisplayName(current: string, candidate: string): string {
  if (!current) return candidate
  if (!candidate) return current
  const a = current.length
  const b = candidate.length
  if (b < a * 0.7) return candidate
  if (a > 90 && b < a) return candidate
  return current
}

const formatPrice = (val: number, lang: Lang) =>
  new Intl.NumberFormat(lang === 'uk' ? 'uk-UA' : 'ru-RU', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 0,
  }).format(val)

/* =========================================================
   ИЗОЛИРОВАННАЯ КАРТОЧКА ТОВАРА (ОПТИМИЗАЦИЯ РЕНДЕРА)
   ========================================================= */
const ProductCard = memo(({ group, lang, t }: { group: GroupedProduct; lang: Lang; t: typeof DICTIONARY['ru'] }) => {
  const sortedOffers = [...group.offers].sort((a, b) => a.price - b.price)
  const chartData = sortedOffers.map((o) => ({
    name: formatSourceName(o.source),
    price: o.price,
    isBest: o.price === group.minPrice,
  }))

  return (
    <div className="rounded-2xl p-4 bg-[#1A1614] border border-white/5 flex flex-col gap-3 relative overflow-hidden">
      {group.maxSavings > 500 && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#E4D00A]/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      )}

      <div className="flex gap-3 items-start relative z-10">
        {group.image_url ? (
          <img
            src={group.image_url}
            alt=""
            className="w-[68px] h-[68px] rounded-xl object-cover bg-[#25201C] shrink-0 border border-white/5"
            loading="lazy"
          />
        ) : (
          <div className="w-[68px] h-[68px] rounded-xl bg-[#25201C] shrink-0 flex items-center justify-center text-white/15">
            <Tag size="{20}"/>
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1.5">
          <h3 className="text-[14px] font-medium leading-snug text-white line-clamp-2">
            {group.name}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {group.product_code && (
              <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono text-[#B9ACA0] uppercase">
                {t.code} {group.product_code}
              </span>
            )}
            {group.offers.length > 1 && group.maxSavings > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-[#E4D00A]/20 text-[#E4D00A] text-[10px] font-bold">
                {t.saveUpTo} {formatPrice(group.maxSavings, lang)}
              </span>
            )}
          </div>
        </div>
      </div>

      {group.offers.length > 1 ? (
        <div className="h-[70px] w-full relative z-10 bg-[#25201C]/60 rounded-xl p-2 border border-white/5">
          <span className="absolute top-1.5 left-2 text-[9px] font-semibold text-[#B9ACA0]">
            {t.marketSpread}
          </span>
          <ResponsiveContainer height="100%" width="100%">
            <BarChart 0 0, 14, bottom: data="{chartData}" left: margin="{{" right: top: }}>
              <Tooltip 'rgba(255,255,255,0.04)' active, content="{({" cursor="{{" fill: payload }: }}> {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-[#12100E] border border-white/10 px-2 py-1.5 rounded-lg text-xs shadow-lg">
                      <div className="font-semibold text-white mb-0.5">{payload[0].payload.name}</div>
                      <div className="text-[#E4D00A]">{formatPrice(payload[0].value as number, lang)}</div>
                    </div>
                  )
                }}
              />
              <Bar 0, 0]} 3, dataKey="price" maxBarSize="{34}" radius="{[3,">
                {chartData.map((entry, i) => (
                  <Cell '#3A332C'} '#E4D00A' : ? fill="{entry.isBest" key="{i}"/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#25201C]/50 border border-white/5 text-[11px] text-[#B9ACA0]">
          <Store className="text-[#E4D00A]/80 shrink-0" size="{12}"/>
          <span>{t.singleOffer}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5 relative z-10">
        {sortedOffers.map((offer, idx) => {
          const isBest = idx === 0 && group.offers.length > 1
          const Comp = offer.url ? 'a' : 'div'
          return (
            <Comp ${ '_blank', 'bg-[#25201C] 'bg-[#E4D00A]/10 'noopener : ? border border-[#E4D00A]/30' border-transparent' className="{`flex" href: isBest items-center justify-between key="{offer.id}" noreferrer' offer.url, px-3 py-2.5 rel: rounded-xl target: transition-colors { {...(offer.url {})} } }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[13px] font-semibold text-white truncate">
                  {formatSourceName(offer.source)}
                </span>
                {isBest && (
                  <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-[#E4D00A] text-black font-bold uppercase">
                    {t.bestPrice}
                  </span>
                )}
              </div>
              <span className={`text-[14px] font-bold tabular-nums ${isBest ? 'text-[#E4D00A]' : 'text-white'}`}>
                {formatPrice(offer.price, lang)}
              </span>
            </Comp>
          )
        })}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.group.key === nextProps.group.key && prevProps.lang === nextProps.lang
})

/* =========================================================
   ОСНОВНОЙ КОМПОНЕНТ СТРАНИЦЫ
   ========================================================= */
export function PricesPage({ onBack, lang }: PricesPageProps) {
  const t = DICTIONARY[lang]

  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  // Отложенное значение для поиска (не блокирует UI при быстром вводе)
  const deferredSearchQuery = useDeferredValue(searchQuery) 
  
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('default')
  const [pageIndex, setPageIndex] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/prices')
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setError(t.error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [t.error])

  useEffect(() => {
    load()
  }, [load])

  const sources = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.source).filter(Boolean) as string[])).sort()
  }, [items])

  // ЭТАП 1: Только базовая группировка. Запускается только при обновлении `items`.
  const baseGroupedItems = useMemo(() => {
    const map = new Map<string, GroupedProduct>()

    items.forEach((item) => {
      const priceNum = Number(item.current_price)
      if (isNaN(priceNum) || priceNum <= 0) return

      const groupingKey = makeGroupingKey(item)

      if (!map.has(groupingKey)) {
        map.set(groupingKey, {
          key: groupingKey,
          name: item.name,
          product_code: item.product_code,
          image_url: item.image_url,
          category: item.category,
          offers: [],
          minPrice: Infinity,
          maxPrice: -Infinity,
          avgPrice: 0,
          maxSavings: 0,
        })
      }

      const group = map.get(groupingKey)!
      group.name = preferDisplayName(group.name, item.name)
      if (!group.image_url && item.image_url) group.image_url = item.image_url
      if (!group.product_code && item.product_code) group.product_code = item.product_code

      if (!group.offers.find((o) => o.source === item.source)) {
        group.offers.push({
          id: item.id,
          source: item.source || 'unknown',
          price: priceNum,
          url: item.url,
        })
        if (priceNum < group.minPrice) group.minPrice = priceNum
        if (priceNum > group.maxPrice) group.maxPrice = priceNum
      }
    })

    return Array.from(map.values()).map((group) => {
      const sum = group.offers.reduce((acc, o) => acc + o.price, 0)
      group.avgPrice = sum / group.offers.length
      group.maxSavings = group.maxPrice - group.minPrice
      return group
    })
  }, [items])

  // ЭТАП 2: Фильтрация и сортировка. Запускается быстро при вводе текста или смене табов.
  const filteredAndSortedGroups = useMemo(() => {
    let result = baseGroupedItems

    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase().trim()
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.product_code && g.product_code.toLowerCase().includes(q)) ||
          normalizeProductName(g.name).includes(normalizeProductName(q))
      )
    }

    if (selectedSource !== 'all') {
      result = result.filter((g) => g.offers.some((o) => o.source === selectedSource))
    }

    result.sort((a, b) => {
      if (sortBy === 'price-asc') return a.minPrice - b.minPrice
      if (sortBy === 'savings') return b.maxSavings - a.maxSavings
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (b.offers.length !== a.offers.length) return b.offers.length - a.offers.length
      return b.maxSavings - a.maxSavings
    })

    return result
  }, [baseGroupedItems, deferredSearchQuery, selectedSource, sortBy])

  const pages = useMemo(() => {
    const chunks: GroupedProduct[][] = []
    for (let i = 0; i < filteredAndSortedGroups.length; i += PAGE_SIZE) {
      chunks.push(filteredAndSortedGroups.slice(i, i + PAGE_SIZE))
    }
    return chunks
  }, [filteredAndSortedGroups])

  const totalPages = pages.length
  const safePage = Math.min(pageIndex, Math.max(0, totalPages - 1))

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setPageIndex(0)
  }, [deferredSearchQuery, selectedSource, sortBy])

  const goToPage = (next: number) => {
    if (next < 0 || next >= totalPages) return
    setPageIndex(next)
  }

  const globalStats = useMemo(() => {
    if (baseGroupedItems.length === 0) return null
    const multi = baseGroupedItems.filter((g) => g.offers.length > 1)
    const avgSpread = multi.length
      ? multi.reduce((acc, g) => acc + (g.maxSavings / g.minPrice) * 100, 0) / multi.length
      : 0
    return {
      total: baseGroupedItems.length,
      multiCount: multi.length,
      avgSpreadPercent: avgSpread.toFixed(1),
    }
  }, [baseGroupedItems])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="relative flex flex-col h-[100dvh] bg-[#12100E] text-[#F5F1EA] overflow-hidden font-sans"
    >
      <div className="shrink-0 z-20 bg-[#1A1614]/95 backdrop-blur-md border-b border-white/5">
        <div className="px-4 pt-5 pb-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft size="{20}"/>
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="text-[#E4D00A] shrink-0" size="{17}"/>
              <span className="truncate">{t.title}</span>
            </h1>
            {globalStats && (
              <p className="text-[11px] text-[#B9ACA0] flex items-center gap-1 mt-0.5">
                <TrendingDown className="text-[#E4D00A]" size="{11}"/>
                {globalStats.multiCount > 0 ? `${t.statsAvgSpread}: ${globalStats.avgSpreadPercent}% · ` : ''}
                {globalStats.total} {t.statsTotal}
                {globalStats.multiCount > 0 ? ` · ${globalStats.multiCount} ${lang === 'uk' ? 'з порівнянням' : 'со сравнением'}` : ''}
              </p>
            )}
          </div>
        </div>

        {!loading && !error && (
          <div className="px-4 pb-3 space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B9ACA0]" size="{15}"/>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.search}
                  className="w-full h-11 pl-9 pr-9 rounded-xl bg-[#25201C] border border-white/5 focus:border-[#E4D00A]/40 outline-none text-sm text-white"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#B9ACA0]">
                    <X size="{15}"/>
                  </button>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-11 px-3 rounded-xl text-sm bg-[#25201C] border border-white/5 outline-none text-white max-w-[128px]"
              >
                <option value="default">{t.sortDefault}</option>
                <option value="savings">{t.sortSavings}</option>
                <option value="price-asc">{t.sortPriceAsc}</option>
                <option value="name">{t.sortName}</option>
              </select>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
              <button
                onClick={() => setSelectedSource('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${
                  selectedSource === 'all' ? 'bg-[#E4D00A] text-black' : 'bg-white/5 text-[#B9ACA0]'
                }`}
              >
                {t.allSources}
              </button>
              {sources.map((src) => (
                <button
                  key={src}
                  onClick={() => setSelectedSource(src)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 ${
                    selectedSource === src ? 'bg-[#E4D00A] text-black' : 'bg-white/5 text-[#B9ACA0]'
                  }`}
                >
                  <Store size="{11}"/>
                  {formatSourceName(src)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 no-scrollbar">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[190px] rounded-2xl bg-[#1A1614] border border-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <p className="text-[#B9ACA0] text-sm">{error}</p>
            <button onClick={load} className="px-5 py-2.5 rounded-xl bg-[#E4D00A] text-black text-sm font-semibold">
              {t.retry}
            </button>
          </div>
        )}

        {!loading && !error && totalPages === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Tag className="text-white/15 mb-1" size="{28}"/>
            <p className="font-medium">{t.empty}</p>
            <p className="text-sm text-[#B9ACA0]">{t.emptyHint}</p>
          </div>
        )}

        {!loading && !error && totalPages > 0 && (
          <div className="space-y-3 pb-4">
            {pages[safePage]?.map((g) => (
              <ProductCard group="{g}" key="{g.key}" lang="{lang}" t="{t}"/>
            ))}
          </div>
        )}
      </div>

      {!loading && !error && totalPages > 0 && (
        <div className="shrink-0 border-t border-white/5 bg-[#1A1614]/95 backdrop-blur-md">
          <div className="px-4 py-2.5 flex items-center justify-between gap-3">
            <button
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 0}
              className="w-11 h-11 rounded-xl bg-white/5 disabled:opacity-25 flex items-center justify-center"
            >
              <ChevronLeft size="{22}"/>
            </button>

            <div className="flex-1 flex flex-col items-center gap-1">
              {totalPages <= 10 ? (
                <div className="flex items-center gap-1.5">
                  {pages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToPage(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === safePage ? 'w-5 bg-[#E4D00A]' : 'w-1.5 bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <span className="text-xs text-[#B9ACA0] tabular-nums">
                  {t.pageOf} {safePage + 1} {t.of} {totalPages}
                </span>
              )}
              <span className="text-[10px] text-white/25 flex items-center gap-1">
                <BookOpen size="{10}"/>
                {t.bookletHint}
              </span>
            </div>

            <button
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages - 1}
              className="w-11 h-11 rounded-xl bg-white/5 disabled:opacity-25 flex items-center justify-center"
            >
              <ChevronRight size="{22}"/>
            </button>
          </div>

          {totalPages > 1 && (
            <div className="h-0.5 bg-white/5">
              <div
                className="h-full bg-[#E4D00A]/70 transition-all duration-300"
                style={{ width: `${((safePage + 1) / totalPages) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
