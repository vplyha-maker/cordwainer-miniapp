import type { Lang } from '../../App' 
import type { Currency } from '../../components/PriceHistoryModal'

export type Product = {
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

export type Offer = {
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

export type GroupedProduct = {
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

export type PricesPageProps = {
  onBack: () => void
  lang: Lang
}

export type SortOption = 'default' | 'unit-price-asc' | 'savings' | 'name'
export type ModalData = { type: 'volatility' | 'spread'; value: number } | null

// ДОБАВЛЕНЫ НОВЫЕ МАКРО-СИГНАЛЫ (macro_up, macro_down, supply_alert, urgent_buy)
export type SignalKind = 
  | 'best' | 'expensive' | 'spike' | 'spread' | 'deficit' | 'arbitrage'
  | 'macro_up' | 'macro_down' | 'supply_alert' | 'urgent_buy'

export type Signal = {
  kind: SignalKind
  label: string
  tone: 'good' | 'bad' | 'warn' | 'neutral'
}

// НОВЫЙ ТИП: Структура данных из вашей новой таблицы macro_indicators
export type MacroIndicator = {
  id: number
  type: string // 'polyol', 'isocyanate', 'freight_cn_eu', 'news_alert'
  value: number
  trend: number
  description: string
  updated_at: string
}
