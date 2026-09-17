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
  Info,
  LineChart,
} from 'lucide-react'
import type { Lang } from '../App'
import { PriceHistoryModal, type Currency } from '../components/PriceHistoryModal'

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
  history?: unknown
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
type ModalData = { type: 'volatility' | 'spread'; value: number } | null

type SignalKind = 'best' | 'expensive' | 'spike' | 'spread' | 'deficit' | 'arbitrage'
type Signal = {
  kind: SignalKind
  label: string
  tone: 'good' | 'bad' | 'warn' | 'neutral'
}

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
    priceHistory: 'История цен',
    historyOldest: 'Старые',
    historyNewest: 'Новые',
    historyPoints: 'замеров',
    historySingleTitle: 'История ещё копится',
    historySingleHint:
      'В базе пока мало замеров по этой позиции. График появится после следующих обновлений парсера.',
    volatilityTitle: 'Средняя волатильность',
    spreadTitle: 'Разрыв цен (Spread)',
    gotIt: 'Понятно',
    recommendationLabel: 'Стратегия',
    spreadLow:
      'Цены на рынке почти идентичны. Выгоднее выбирать поставщика с наиболее удобной логистикой или лучшим сервисом, так как разница в цене минимальна.',
    spreadMid:
      'Заметная разница в цене. Это хорошая возможность сэкономить, выбрав более выгодное предложение, если сроки доставки вас устраивают.',
    spreadHigh:
      'На рынке сильный ценовой перекос по данной позиции. Настоятельно рекомендуем закупать объем у выделенного цветом поставщика, чтобы максимизировать вашу маржинальность.',
    volLow:
      'Рынок в данной категории абсолютно стабилен, цены у поставщиков держатся на одном уровне. Срочности в оптимизации закупок нет.',
    volMid:
      'Наблюдаются умеренные колебания цен. Оптимальное время для точечной экономии на конкретных позициях из списка.',
    volHigh:
      'Рынок крайне нестабилен. Это лучшее время для оптимизации — тщательно сравнивайте цены, так как разница у поставщиков сейчас огромна.',
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
    priceHistory: 'Історія цін',
    historyOldest: 'Старі',
    historyNewest: 'Нові',
    historyPoints: 'замірів',
    historySingleTitle: 'Історія ще накопичується',
    historySingleHint:
      'У базі поки мало замірів по цій позиції. Графік зʼявиться після наступних оновлень парсера.',
    volatilityTitle: 'Середня волатильність',
    spreadTitle: 'Розрив цін (Spread)',
    gotIt: 'Зрозуміло',
    recommendationLabel: 'Стратегія',
    spreadLow:
      'Ціни на ринку майже ідентичні. Вигідніше обирати постачальника з найбільш зручною логістикою.',
    spreadMid:
      'Помітна різниця в ціні. Це гарна можливість заощадити, обравши вигіднішу пропозицію.',
    spreadHigh:
      'На ринку сильний ціновий перекіс. Настійно рекомендуємо закуповувати обсяг у виділеного кольором постачальника для максимізації маржинальності.',
    volLow: 'Ринок стабільний, ціни у постачальників тримаються на одному рівні.',
    volMid: 'Помірні коливання цін. Оптимальний час для точкової економії.',
    volHigh:
      'Ринок украй нестабільний. Це найкращий час для оптимізації закупівель — ретельно порівнюйте ціни.',
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
    priceHistory: 'Preisverlauf',
    historyOldest: 'Älter',
    historyNewest: 'Neuer',
    historyPoints: 'Messungen',
    historySingleTitle: 'Verlauf wird noch aufgebaut',
    historySingleHint:
      'Noch zu wenige Messpunkte. Der Chart erscheint nach den nächsten Parser-Updates.',
    volatilityTitle: 'Ø Volatilität',
    spreadTitle: 'Spread (Preisdifferenz)',
    gotIt: 'Verstanden',
    recommendationLabel: 'Strategie',
    spreadLow:
      'Die Preise sind nahezu identisch. Wählen Sie den Lieferanten mit der bequemsten Logistik.',
    spreadMid:
      'Spürbarer Preisunterschied. Eine gute Gelegenheit, durch die günstigere Option Geld zu sparen.',
    spreadHigh:
      'Starkes Preisungleichgewicht. Wir empfehlen dringend, beim farblich markierten Lieferanten zu kaufen.',
    volLow: 'Der Markt ist stabil, die Preise bleiben auf einem Niveau.',
    volMid: 'Moderate Preisschwankungen. Optimale Zeit für gezielte Einsparungen.',
    volHigh:
      'Der Markt ist instabil. Die beste Zeit zur Einkaufsoptimierung – vergleichen Sie die Preise.',
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
  const locale = { de: 'de-DE', uk: 'uk-UA', ru: 'ru-RU' }[lang] || 'en-US'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
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
  if (raw === null || raw === undefined || raw === '') return 0
  if (typeof raw === 'number') return raw > 0 ? raw : 0
  const cleanStr = String(raw).replace(',', '.').replace(/[^0-9.]/g, '')
  const val = parseFloat(cleanStr)
  return !isNaN(val) && val > 0 ? val : 0
}

function extractHistory(raw: unknown): number[] {
  let data: unknown = raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return []
    try {
      data = JSON.parse(trimmed)
    } catch {
      return []
    }
  }
  if (!Array.isArray(data)) return []
  const out: number[] = []
  for (const item of data) {
    if (typeof item === 'number' && item > 0 && Number.isFinite(item)) {
      out.push(item)
    } else if (typeof item === 'string') {
      const n = parsePriceSafely(item)
      if (n > 0) out.push(n)
    } else if (item && typeof item === 'object' && 'price' in (item as Record<string, unknown>)) {
      const n = parsePriceSafely((item as { price: number | string | null }).price)
      if (n > 0) out.push(n)
    }
  }
  return out
}

function convertUah(
  uah: number,
  currency: Currency,
  usdRate?: number | null,
  eurRate?: number | null,
): number {
  if (!uah || uah <= 0) return 0
  if (currency === 'USD' && usdRate && usdRate > 0) return uah / usdRate
  if (currency === 'EUR' && eurRate && eurRate > 0) return uah / eurRate
  return uah
}

function getVolumeData(raw: string): {
  baseUnit: 'кг' | 'л' | 'шт'
  originalLabel: string
  multiplier: number
} {
  if (!raw) return { baseUnit: 'шт', originalLabel: '', multiplier: 1 }
  const s = raw.toLowerCase().replace(/,/g, '.').replace(/\u00a0/g, ' ')
  const m = s.match(
    /(\d+(?:\.\d+)?)\s*(кг|kg|г|гр|g|л|l|літр[а-я]*|литр[а-я]*|мл|ml)(?:[\s.,;)]|$)/i,
  )
  if (!m) return { baseUnit: 'шт', originalLabel: '', multiplier: 1 }
  const num = parseFloat(m[1])
  if (num === 0 || isNaN(num)) return { baseUnit: 'шт', originalLabel: '', multiplier: 1 }
  const u = m[2].toLowerCase()
  if (u.startsWith('л') || u === 'l')
    return { baseUnit: 'л', originalLabel: num + ' л', multiplier: 1 / num }
  if (u.startsWith('м') || u === 'ml')
    return { baseUnit: 'л', originalLabel: num + ' мл', multiplier: 1000 / num }
  if (['кг', 'kg'].includes(u))
    return { baseUnit: 'кг', originalLabel: num + ' кг', multiplier: 1 / num }
  return { baseUnit: 'кг', originalLabel: num + ' г', multiplier: 1000 / num }
}

function normalizeProductName(raw: string): string {
  if (!raw) return ''
  let s = raw
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/['"`«»„“()[\]{}_/\\|–—−\-]/g, ' ')
  for (const [re, rep] of BRAND_ALIASES) s = s.replace(re, ' ' + rep + ' ')
  s = s.replace(
    /\b\d+([.,]\d+)?\s*(кг|kg|г|гр|g|л|l|літр\w*|литр\w*|мл|ml)(?:[\s.,;)]|$)/gi,
    ' ',
  )
  const stopWords = [
    'клей', 'взуттєвий', 'обувной', 'обувної', 'банка', 'італія', 'италия', 'чорний', 'черный',
    'світлий', 'светлый', 'білий', 'белый', 'універсальний', 'универсальный', 'для', 'ремонту',
    'шкіряного', 'взуття', 'пінополіуретану', 'тканини', 'кг', 'л', 'мл', 'г', 'гр', 'литр',
    'шт', 'розлив', 'на', 'original', 'strong', 'shoe', 'glue', 'в', 'от', '06w', '06wn',
    '006w', 'm', 'і', 'и', 'та', 'або', 'или',
  ]
  const words = s.split(/\s+/).filter((w) => w.length > 1 && !stopWords.includes(w))
  return Array.from(new Set(words)).sort().join(' ')
}

function calculateWordSimilarity(name1: string, name2: string): number {
  const w1 = name1.split(' ').filter(Boolean)
  const w2 = name2.split(' ').filter(Boolean)
  if (w1.length === 0 || w2.length === 0) return 0
  let matches = 0
  for (const w of w1) {
    if (w2.includes(w)) matches++
  }
  const unionSize = new Set([...w1, ...w2]).size
  return matches / unionSize
}

const formatPrice = (val: number, lang: Lang, currency: Currency = 'UAH') => {
  if (!val || val <= 0) return DICTIONARY[lang].noPrice
  const locale = { de: 'de-DE', uk: 'uk-UA', ru: 'ru-RU' }[lang] || 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'UAH' ? 0 : 2,
    minimumFractionDigits: currency === 'UAH' ? 0 : 2,
  }).format(val)
}

function signalClass(tone: Signal['tone']) {
  if (tone === 'good') return 'text-emerald-700 border-emerald-500/40 bg-emerald-500/10'
  if (tone === 'bad') return 'text-red-600 border-red-500/40 bg-red-500/10'
  if (tone === 'warn')
    return 'text-[var(--color-accent)] border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10'
  return 'text-[var(--color-muted)] border-[var(--color-border)] bg-[var(--color-surface-2)]'
}

function computeOfferSignals(
  offer: Offer,
  group: GroupedProduct,
  avgUnitPrice: number,
  validOffersCount: number,
): Signal[] {
  const signals: Signal[] = []
  if (offer.unitPrice <= 0) return signals

  const history = offer.history && offer.history.length >= 2 ? offer.history : []
  const first = history[0]
  const last = history[history.length - 1]
  const changePct =
    history.length >= 2 && first > 0 ? ((last - first) / first) * 100 : null

  if (validOffersCount > 1 && offer.unitPrice === group.minUnitPrice && group.minUnitPrice > 0) {
    signals.push({ kind: 'best', label: 'Лучшая цена', tone: 'good' })
  }
  if (validOffersCount > 1 && avgUnitPrice > 0 && offer.unitPrice < avgUnitPrice * 0.88) {
    signals.push({ kind: 'arbitrage', label: 'Ниже рынка', tone: 'good' })
  }
  if (validOffersCount > 1 && avgUnitPrice > 0 && offer.unitPrice > avgUnitPrice * 1.15) {
    signals.push({ kind: 'expensive', label: 'Дороже рынка', tone: 'bad' })
  }
  if (changePct !== null && changePct >= 10) {
    signals.push({
      kind: 'spike',
      label: 'Рост +' + changePct.toFixed(0) + '%',
      tone: 'warn',
    })
  }
  return signals
}

function computeGroupSignals(group: GroupedProduct): Signal[] {
  const signals: Signal[] = []
  if (group.totalOffers >= 3 && group.outOfStockCount >= 2) {
    signals.push({ kind: 'deficit', label: 'Риск дефицита', tone: 'bad' })
  }
  if (group.unitSpread >= 35) {
    signals.push({
      kind: 'spread',
      label: 'Спред ' + group.unitSpread.toFixed(0) + '%',
      tone: 'warn',
    })
  }
  return signals
}

function CurrencySwitch({
  currency,
  onChange,
  usdRate,
  eurRate,
}: {
  currency: Currency
  onChange: (c: Currency) => void
  usdRate?: number | null
  eurRate?: number | null
}) {
  return (
    <div className="flex bg-[var(--color-surface-2)] p-0.5 rounded-md border border-[var(--color-border)]">
      {(['UAH', 'USD', 'EUR'] as Currency[]).map((cur) => {
        if (cur === 'USD' && !usdRate) return null
        if (cur === 'EUR' && !eurRate) return null
        const isActive = currency === cur
        return (
          <button
            key={cur}
            type="button"
            onClick={() => onChange(cur)}
            className={
              'px-2.5 py-1 text-[10px] font-bold rounded transition-all ' +
              (isActive
                ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-ink)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]')
            }
          >
            {cur}
          </button>
        )
      })}
    </div>
  )
}

const ProductCard = memo(
  ({
    group,
    lang,
    t,
    isFavorite,
    onToggleFavorite,
    onOpenSpreadModal,
    onOpenHistory,
    currency,
    usdRate,
    eurRate,
  }: {
    group: GroupedProduct
    lang: Lang
    t: typeof DICTIONARY['ru']
    isFavorite: boolean
    onToggleFavorite: (key: string) => void
    onOpenSpreadModal: (val: number) => void
    onOpenHistory: (group: GroupedProduct) => void
    currency: Currency
    usdRate?: number | null
    eurRate?: number | null
  }) => {
    const sortedOffers = [...group.offers].sort((a, b) => {
      if (a.unitPrice <= 0) return 1
      if (b.unitPrice <= 0) return -1
      return a.unitPrice - b.unitPrice
    })

    const validPrices = sortedOffers.filter((o) => o.unitPrice > 0).map((o) => o.unitPrice)
    const avgUnitPrice = validPrices.length
      ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
      : 0
    const validOffersCount = validPrices.length
    const showSpread = validOffersCount > 1
    const formattedDate = formatDate(group.latestUpdatedAt, lang)
    const groupSignals = computeGroupSignals(group)

    return (
      <article className="group/card flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] transition-colors shadow-sm hover:shadow-md relative">
        <div className="p-5 border-b border-[var(--color-border)] flex gap-4 items-start relative">
          {group.image_url ? (
            <img
              src={group.image_url}
              alt={group.name}
              className="w-16 h-16 object-cover bg-[var(--color-surface-2)] border border-[var(--color-border)] grayscale group-hover/card:grayscale-0 transition-all duration-500 shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 flex items-center justify-center bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-muted)] shrink-0 opacity-50">
              <Tag size={20} strokeWidth={1.5} />
            </div>
          )}

          <div className="flex-1 min-w-0 pr-8">
            <h3 className="font-serif text-lg font-medium leading-snug text-[var(--color-ink)] line-clamp-2">
              {group.name}
            </h3>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3">
              {group.product_code && (
                <span className="text-[10px] font-mono text-[var(--color-muted)] uppercase tracking-widest">
                  {t.code} {group.product_code}
                </span>
              )}

              <button
                onClick={() => onOpenHistory(group)}
                className="relative inline-flex items-center gap-1.5 p-2 -m-2 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink)] opacity-70 hover:opacity-100 transition-opacity focus:outline-none rounded-md"
              >
                <LineChart size={14} strokeWidth={2.5} />
                <span>{t.priceHistory}</span>
              </button>

              {showSpread && group.unitSpread > 0 && (
                <button
                  onClick={() => onOpenSpreadModal(group.unitSpread)}
                  className="relative inline-flex items-center gap-1.5 p-2 -m-2 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-accent)] hover:opacity-80 transition-colors focus:outline-none rounded-md"
                >
                  <TrendingDown size={14} strokeWidth={2.5} />
                  <span>Spread {group.unitSpread.toFixed(0)}%</span>
                  <Info size={12} strokeWidth={2.5} className="opacity-50 ml-0.5" />
                </button>
              )}

              {groupSignals.map((s) => (
                <span
                  key={s.kind}
                  className={
                    'text-[10px] uppercase tracking-wider font-semibold border px-1.5 py-0.5 ' +
                    signalClass(s.tone)
                  }
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => onToggleFavorite(group.key)}
            className="absolute top-4 right-4 p-2 -m-2 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors focus:outline-none"
          >
            <Bookmark
              size={18}
              strokeWidth={1.5}
              className={isFavorite ? 'fill-[var(--color-accent)] text-[var(--color-accent)]' : ''}
            />
          </button>
        </div>

        <div className="flex flex-col">
          {!showSpread && (
            <div className="px-5 py-3 text-[11px] uppercase tracking-widest text-[var(--color-muted)] flex items-center gap-2 border-b border-[var(--color-border)] last:border-0">
              <Store size={14} strokeWidth={1.5} className="opacity-50" /> {t.singleOffer}
            </div>
          )}

          {sortedOffers.map((offer, idx) => {
            const isBest = idx === 0 && showSpread && offer.unitPrice > 0
            const Comp = offer.url ? 'a' : 'div'
            const historyData = (() => {
              const real = extractHistory(offer.history)
              if (real.length >= 2) return real.slice(-5)
              if (offer.price > 0) return [offer.price]
              return [] as number[]
            })()

            const minH = historyData.length ? Math.min(...historyData) : 0
            const maxH = historyData.length ? Math.max(...historyData) : 1
            const range = maxH - minH || 1
            const displayPrice = convertUah(offer.price, currency, usdRate, eurRate)
            const displayUnit = convertUah(offer.unitPrice, currency, usdRate, eurRate)

            const offerSignals = computeOfferSignals(
              offer,
              group,
              avgUnitPrice,
              validOffersCount,
            )

            return (
              <Comp
                key={offer.source + '_' + offer.id}
                {...(offer.url
                  ? { href: offer.url, target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className={
                  'relative flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-0 transition-colors group/row ' +
                  (!isBest ? 'hover:bg-[var(--color-surface-2)]' : '') +
                  (offer.url ? ' cursor-pointer' : '')
                }
              >
                {isBest && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--color-accent)]" />
                )}

                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 pr-3">
                  <span
                    className={
                      'text-sm font-medium truncate ' +
                      (isBest ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)]')
                    }
                  >
                    {formatSourceName(offer.source)}
                  </span>

                  {offer.volumeLabel && (
                    <span className="text-[11px] text-[var(--color-muted)] font-mono border border-[var(--color-border)] px-1.5 py-0.5 bg-[var(--color-bg)] shrink-0">
                      {offer.volumeLabel}
                    </span>
                  )}

                  {offerSignals.slice(0, 2).map((s) => (
                    <span
                      key={s.kind}
                      className={
                        'text-[10px] uppercase tracking-wider font-semibold border px-1.5 py-0.5 shrink-0 ' +
                        signalClass(s.tone)
                      }
                    >
                      {s.label}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {historyData.length > 0 && (
                    <div className="flex items-end gap-[1px] h-4 w-8 opacity-60 grayscale group-hover/row:grayscale-0 transition-all">
                      {historyData.map((val, i) => {
                        const heightPct =
                          historyData.length === 1
                            ? 70
                            : Math.max(15, ((val - minH) / range) * 100)
                        const isLast = i === historyData.length - 1
                        const trendDown =
                          historyData.length >= 2 &&
                          historyData[historyData.length - 1] < historyData[0]
                        const barColor =
                          historyData.length < 2
                            ? 'bg-[var(--color-muted)]'
                            : isLast
                              ? trendDown
                                ? 'bg-[var(--color-success)]'
                                : 'bg-[var(--color-danger)]'
                              : 'bg-[var(--color-muted)] opacity-50'
                        return (
                          <div
                            key={i}
                            style={{ height: heightPct + '%' }}
                            className={'flex-1 ' + barColor}
                          />
                        )
                      })}
                    </div>
                  )}

                  <div className="flex flex-col items-end leading-tight text-right w-24">
                    <span
                      className={
                        'text-sm font-medium tabular-nums ' +
                        (isBest ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink)]')
                      }
                    >
                      {formatPrice(displayPrice, lang, currency)}
                    </span>
                    {offer.multiplier !== 1 && offer.unitPrice > 0 && (
                      <span className="text-[10px] text-[var(--color-muted)] font-mono tracking-tighter mt-1">
                        ≈{' '}
                        {currency === 'UAH'
                          ? Math.round(displayUnit)
                          : displayUnit.toFixed(2)}{' '}
                        / {offer.baseUnit}
                      </span>
                    )}
                  </div>
                </div>
              </Comp>
            )
          })}
        </div>

        {formattedDate && (
          <div className="px-5 py-2.5 bg-[var(--color-surface)] text-[10px] text-[var(--color-muted)] uppercase tracking-widest flex items-center justify-between border-t border-[var(--color-border)]">
            <span>{t.updatedAt}</span>
            <span className="font-mono">{formattedDate}</span>
          </div>
        )}
      </article>
    )
  },
  (prev, next) =>
    prev.group.key === next.group.key &&
    prev.group.latestUpdatedAt === next.group.latestUpdatedAt &&
    prev.group.offers.length === next.group.offers.length &&
    prev.lang === next.lang &&
    prev.isFavorite === next.isFavorite &&
    prev.currency === next.currency &&
    prev.usdRate === next.usdRate &&
    prev.eurRate === next.eurRate,
)

export function PricesPage({ onBack, lang }: PricesPageProps) {
  const t = DICTIONARY[lang]

  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eurRate, setEurRate] = useState<number | null>(null)
  const [usdRate, setUsdRate] = useState<number | null>(null)
  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem('price_currency')
      if (saved === 'UAH' || saved === 'USD' || saved === 'EUR') return saved
    } catch {
      /* ignore */
    }
    return 'UAH'
  })

  const [modalData, setModalData] = useState<ModalData>(null)
  const [historyGroup, setHistoryGroup] = useState<GroupedProduct | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('default')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [retryTrigger, setRetryTrigger] = useState(0)

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('price_favorites')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('price_currency', currency)
    } catch {
      /* ignore */
    }
  }, [currency])

  useEffect(() => {
    if (loading) return
    if (currency === 'USD' && !usdRate) setCurrency('UAH')
    if (currency === 'EUR' && !eurRate) setCurrency('UAH')
  }, [loading, currency, usdRate, eurRate])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'price_favorites') {
        try {
          const newValue = e.newValue
            ? new Set<string>(JSON.parse(e.newValue))
            : new Set<string>()
          setFavorites(newValue)
        } catch (err) {
          console.warn('Error parsing favorites from storage event:', err)
        }
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const toggleFavorite = useCallback((key: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      try {
        localStorage.setItem('price_favorites', JSON.stringify([...next]))
      } catch (e) {
        console.warn('Cannot save favorites:', e)
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!modalData && !historyGroup) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalData(null)
        setHistoryGroup(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modalData, historyGroup])

  const handleRetry = useCallback(() => setRetryTrigger((prev) => prev + 1), [])

  useEffect(() => {
    const abortController = new AbortController()
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [apiRes, ratesRes] = await Promise.all([
          fetch('/api/prices?_t=' + Date.now(), { signal: abortController.signal }),
          fetch('/api/rates?_t=' + Date.now(), { signal: abortController.signal }),
        ])

        if (!apiRes?.ok) throw new Error('API error')
        const data = await apiRes.json()
        setItems(Array.isArray(data) ? data : [])

        if (ratesRes?.ok) {
          const rates = await ratesRes.json()
          if (rates?.usd) setUsdRate(Number(rates.usd))
          if (rates?.eur) setEurRate(Number(rates.eur))
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(DICTIONARY[lang].error)
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    loadData()
    return () => abortController.abort()
  }, [lang, retryTrigger])

  const sources = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.source).filter(Boolean) as string[])).sort(),
    [items],
  )

  const baseGroupedItems = useMemo(() => {
    const groups: GroupedProduct[] = []
    items.forEach((item) => {
      let validPrice = parsePriceSafely(item.current_price)
      if (validPrice > 50000) validPrice = 0
      const volData = getVolumeData(item.name)
      const unitPrice = validPrice * volData.multiplier
      const cleanName = normalizeProductName(item.name)
      const normalizedCode = item.product_code?.trim()?.toLowerCase() || ''

      let targetGroup: GroupedProduct | null = null
      if (normalizedCode && normalizedCode.length >= 2) {
        targetGroup =
          groups.find((g) => g.product_code?.trim()?.toLowerCase() === normalizedCode) || null
      }

      if (!targetGroup && cleanName.length >= 2 && groups.length > 0) {
        let bestMatchScore = 0
        let bestMatchIndex = -1
        for (let i = 0; i < groups.length; i++) {
          const score = calculateWordSimilarity(cleanName, groups[i].key)
          if (score > bestMatchScore) {
            bestMatchScore = score
            bestMatchIndex = i
          }
        }
        if (bestMatchScore >= 0.65) targetGroup = groups[bestMatchIndex]
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
        history: extractHistory(item.history),
      }

      if (targetGroup) {
        if (
          !targetGroup.offers.some(
            (o) => o.id === item.id || (o.url && o.url === item.url),
          )
        ) {
          targetGroup.offers.push(offer)
        }
        if (item.name.length > targetGroup.name.length) targetGroup.name = item.name
        if (!targetGroup.image_url && item.image_url) targetGroup.image_url = item.image_url
        if (!targetGroup.product_code && item.product_code)
          targetGroup.product_code = item.product_code
        if (
          item.updated_at &&
          (!targetGroup.latestUpdatedAt ||
            new Date(item.updated_at) > new Date(targetGroup.latestUpdatedAt))
        ) {
          targetGroup.latestUpdatedAt = item.updated_at
        }
      } else {
        groups.push({
          key: cleanName || 'raw_' + item.id,
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
        })
      }
    })

    return groups.map((group) => {
      const priced = group.offers.filter((o) => o.unitPrice > 0)
      group.minUnitPrice = priced.length ? Math.min(...priced.map((o) => o.unitPrice)) : 0
      group.maxUnitPrice = priced.length ? Math.max(...priced.map((o) => o.unitPrice)) : 0
      group.unitSpread =
        group.minUnitPrice > 0
          ? ((group.maxUnitPrice - group.minUnitPrice) / group.minUnitPrice) * 100
          : 0
      group.totalOffers = group.offers.length
      group.outOfStockCount = group.offers.filter((o) => o.unitPrice <= 0).length
      return group
    })
  }, [items])

  const filteredItems = useMemo(() => {
    let result = baseGroupedItems
    if (selectedSource === 'favorites') result = result.filter((g) => favorites.has(g.key))
    else if (selectedSource !== 'all')
      result = result.filter((g) =>
        g.offers.some((o) => o.source.toLowerCase() === selectedSource.toLowerCase()),
      )

    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase().trim()
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.product_code && g.product_code.toLowerCase().includes(q)),
      )
    }

    return result.sort((a, b) => {
      if (sortBy === 'unit-price-asc') return a.minUnitPrice - b.minUnitPrice
      if (sortBy === 'savings') return b.unitSpread - a.unitSpread
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return b.offers.length - a.offers.length || b.unitSpread - a.unitSpread
    })
  }, [baseGroupedItems, deferredSearchQuery, selectedSource, sortBy, favorites])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [deferredSearchQuery, selectedSource, sortBy])

  const stats = useMemo(() => {
    const multi = filteredItems.filter((g) => g.offers.length > 1)
    const rawAvg = multi.length
      ? multi.reduce((acc, g) => acc + g.unitSpread, 0) / multi.length
      : 0
    return {
      total: filteredItems.length,
      multiCount: multi.length,
      avgSpreadValue: rawAvg,
      avgSpreadText: rawAvg.toFixed(1),
    }
  }, [filteredItems])

  const getModalText = () => {
    if (!modalData) return { rec: '' }
    if (modalData.type === 'spread') {
      if (modalData.value < 10) return { rec: t.spreadLow }
      if (modalData.value <= 30) return { rec: t.spreadMid }
      return { rec: t.spreadHigh }
    } else {
      if (modalData.value < 10) return { rec: t.volLow }
      if (modalData.value <= 30) return { rec: t.volMid }
      return { rec: t.volHigh }
    }
  }

  const currentModalContent = getModalText()

  return (
    <div className="min-h-[100dvh] w-full bg-[var(--color-bg)] text-[var(--color-ink)] font-sans transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col h-[100dvh] relative"
      >
        <header className="shrink-0 z-20 bg-[var(--color-surface)] border-b border-[var(--color-border)] pt-5 pb-4 px-4 md:px-8 transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={onBack}
                  className="relative p-2 -m-2 border border-[var(--color-border)] rounded-lg flex items-center justify-center text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] transition-colors shrink-0"
                  aria-label="Назад"
                >
                  <ArrowLeft size={18} strokeWidth={1.5} />
                </button>
                <div className="min-w-0">
                  <h1 className="font-serif text-2xl md:text-3xl tracking-tight text-[var(--color-ink)] flex items-center gap-2.5">
                    <BookOpen
                      size={22}
                      className="text-[var(--color-muted)] opacity-70 shrink-0"
                      strokeWidth={1.5}
                    />
                    <span className="truncate">{t.title}</span>
                  </h1>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-[var(--color-muted)] mt-1.5 font-mono">
                    <span>
                      {stats.total} {t.statsTotal}
                    </span>
                    {stats.multiCount > 0 && (
                      <>
                        <span className="text-[var(--color-muted)] opacity-30 font-sans">/</span>
                        <button
                          onClick={() =>
                            setModalData({ type: 'volatility', value: stats.avgSpreadValue })
                          }
                          className="relative inline-flex items-center p-1 -m-1 rounded text-[var(--color-accent)] font-sans font-medium focus:outline-none hover:opacity-80 transition-colors"
                        >
                          {t.statsAvgSpread}: {stats.avgSpreadText}%
                          <Info size={12} strokeWidth={2.5} className="opacity-50 ml-1" />
                        </button>
                      </>
                    )}
                    {(usdRate || eurRate) && (
                      <>
                        <span className="text-[var(--color-muted)] opacity-30 font-sans">/</span>
                        <span className="tabular-nums font-semibold text-[var(--color-ink)]">
                          {usdRate && '$ ' + usdRate.toFixed(2)}
                          {usdRate && eurRate && ' · '}
                          {eurRate && '€ ' + eurRate.toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0 pt-1">
                <CurrencySwitch
                  currency={currency}
                  onChange={setCurrency}
                  usdRate={usdRate}
                  eurRate={eurRate}
                />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 border-t border-[var(--color-border)] pt-4">
              <div className="relative flex-1 max-w-md">
                <Search
                  size={16}
                  strokeWidth={1.5}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.search}
                  className="w-full h-10 pl-10 pr-9 bg-[var(--color-surface-2)] border border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none text-sm placeholder:text-[var(--color-muted)] text-[var(--color-ink)] transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  >
                    <X size={15} strokeWidth={1.5} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-10 px-3 text-xs uppercase tracking-wider bg-[var(--color-surface-2)] text-[var(--color-ink)] border border-[var(--color-border)] outline-none cursor-pointer appearance-none shrink-0"
                >
                  <option value="default">{t.sortDefault}</option>
                  <option value="savings">{t.sortSavings}</option>
                  <option value="unit-price-asc">{t.sortUnitPriceAsc}</option>
                  <option value="name">{t.sortName}</option>
                </select>

                <div className="h-5 w-px bg-[var(--color-border)] shrink-0" />

                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => setSelectedSource('all')}
                    className={
                      'px-3 py-1.5 text-xs uppercase tracking-wider font-semibold transition-colors border ' +
                      (selectedSource === 'all'
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-bg)]'
                        : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]')
                    }
                  >
                    {t.allSources}
                  </button>
                  <button
                    onClick={() => setSelectedSource('favorites')}
                    className={
                      'px-3 py-1.5 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors border ' +
                      (selectedSource === 'favorites'
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-bg)]'
                        : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]')
                    }
                  >
                    <Bookmark
                      size={13}
                      strokeWidth={selectedSource === 'favorites' ? 2 : 1.5}
                      className={selectedSource === 'favorites' ? 'fill-current' : ''}
                    />
                    {t.favorites}
                  </button>
                  {sources.map((src) => (
                    <button
                      key={src}
                      onClick={() => setSelectedSource(src)}
                      className={
                        'px-3 py-1.5 text-xs uppercase tracking-wider font-semibold transition-colors border ' +
                        (selectedSource === src
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-bg)]'
                          : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]')
                      }
                    >
                      {formatSourceName(src)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 no-scrollbar">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-60 bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <p className="font-serif text-xl text-[var(--color-muted)] mb-6">{error}</p>
                <button
                  onClick={handleRetry}
                  className="px-8 py-3 border border-[var(--color-accent)] text-xs uppercase tracking-widest font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)] transition-colors"
                >
                  {t.retry}
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-center text-[var(--color-muted)]">
                <Tag size={44} strokeWidth={1} className="mb-4 opacity-40" />
                <p className="font-serif text-2xl text-[var(--color-ink)] mb-2">{t.empty}</p>
                <p className="text-sm tracking-wide text-[var(--color-muted)]">{t.emptyHint}</p>
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
                          onOpenSpreadModal={(val) =>
                            setModalData({ type: 'spread', value: val })
                          }
                          onOpenHistory={(groupData) => setHistoryGroup(groupData)}
                          currency={currency}
                          usdRate={usdRate}
                          eurRate={eurRate}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {visibleCount < filteredItems.length && (
                  <div className="mt-10 flex justify-center">
                    <button
                      onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                      className="px-8 py-3.5 border border-[var(--color-border)] bg-[var(--color-surface)] text-xs uppercase tracking-widest font-semibold text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors flex items-center gap-2.5"
                    >
                      {t.loadMore} <ChevronDown size={14} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <AnimatePresence>
          {modalData && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setModalData(null)}
                className="absolute inset-0 bg-[#000000] opacity-70 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-md bg-[var(--color-surface)] border-t sm:border border-[var(--color-border)] shadow-2xl p-7 rounded-t-3xl sm:rounded-3xl z-10 overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-accent)]" />
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="text-6xl font-serif font-medium text-[var(--color-accent)] tracking-tight mb-2">
                      {modalData.value.toFixed(0)}%
                    </div>
                    <h3 className="text-sm uppercase tracking-widest text-[var(--color-muted)] font-bold mb-6">
                      {modalData.type === 'spread' ? t.spreadTitle : t.volatilityTitle}
                    </h3>
                  </div>
                  <button
                    onClick={() => setModalData(null)}
                    className="p-2 -m-2 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    <X size={20} strokeWidth={1.5} />
                  </button>
                </div>
                <div className="bg-[var(--color-surface-2)] p-5 border border-[var(--color-border)] relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-accent)] opacity-50" />
                  <p className="text-[11px] font-bold text-[var(--color-ink)] uppercase tracking-widest mb-2 font-mono">
                    {t.recommendationLabel}
                  </p>
                  <p className="text-[14px] text-[var(--color-muted)] leading-relaxed">
                    {currentModalContent.rec}
                  </p>
                </div>
                <button
                  onClick={() => setModalData(null)}
                  className="mt-8 w-full py-4 bg-[var(--color-accent)] text-[var(--color-bg)] text-xs uppercase tracking-widest font-bold hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  {t.gotIt}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {historyGroup && (
            <PriceHistoryModal
              group={historyGroup}
              onClose={() => setHistoryGroup(null)}
              t={t}
              lang={lang}
              usdRate={usdRate}
              eurRate={eurRate}
              currency={currency}
              onCurrencyChange={setCurrency}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
