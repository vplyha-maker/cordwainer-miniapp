import { DICTIONARY, BRAND_ALIASES } from './constants'
import type { Offer, GroupedProduct, Signal, MacroIndicator } from './types'
import type { Lang } from '../../App' 
import type { Currency } from '../../components/PriceHistoryModal' 

export const formatSourceName = (sourceId: string) => {
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

export const formatDate = (dateStr: string | null, lang: Lang) => {
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

export function parsePriceSafely(raw: number | string | null | undefined): number {
  if (raw === null || raw === undefined || raw === '') return 0
  if (typeof raw === 'number') return raw > 0 ? raw : 0
  const cleanStr = String(raw).replace(',', '.').replace(/[^0-9.]/g, '')
  const val = parseFloat(cleanStr)
  return !isNaN(val) && val > 0 ? val : 0
}

export function extractHistory(raw: unknown): number[] {
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

export function convertUah(
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

export function getVolumeData(raw: string): {
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

export function normalizeProductName(raw: string): string {
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

export function calculateWordSimilarity(name1: string, name2: string): number {
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

export const formatPrice = (val: number, lang: Lang, currency: Currency = 'UAH') => {
  if (!val || val <= 0) return DICTIONARY[lang].noPrice
  const locale = { de: 'de-DE', uk: 'uk-UA', ru: 'ru-RU' }[lang] || 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'UAH' ? 0 : 2,
    minimumFractionDigits: currency === 'UAH' ? 0 : 2,
  }).format(val)
}

export function signalClass(tone: Signal['tone']) {
  if (tone === 'good') return 'text-emerald-700 border-emerald-500/40 bg-emerald-500/10'
  if (tone === 'bad') return 'text-red-600 border-red-500/40 bg-red-500/10'
  if (tone === 'warn')
    return 'text-[var(--color-accent)] border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10'
  return 'text-[var(--color-muted)] border-[var(--color-border)] bg-[var(--color-surface-2)]'
}

export function computeOfferSignals(
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

export function computeGroupSignals(
  group: GroupedProduct, 
  macroIndicators: MacroIndicator[] = []
): Signal[] {
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

  // МАКРО-ЛОГИКА (Умный анализ сырья из базы)
  if (macroIndicators.length > 0) {
    // Объединяем название и нормализованный ключ, переводим в нижний регистр
    const searchString = (group.name + ' ' + group.key).toLowerCase()
    
    // БРОНЕБОЙНЫЙ ПОИСК (Украинский + Русский + Латиница + Опечатки)
    const isPU = searchString.includes('поліуретан') || searchString.includes('полиуретан') || searchString.includes('десмокол') || searchString.includes('дисмакол') || searchString.includes('desmokol') || searchString.includes('sar 30') || searchString.includes('sar30') || searchString.includes('sar-30')
    const isRubber = searchString.includes('найріт') || searchString.includes('наїріт') || searchString.includes('наирит') || searchString.includes('nairit') || searchString.includes('гумов') || searchString.includes('резинов') || searchString.includes('каучук') || searchString.includes('sar 20') || searchString.includes('sar20') || searchString.includes('sar-20')
    const isLatex = searchString.includes('латекс') || searchString.includes('latex')
    const isPrimer = searchString.includes('протирання') || searchString.includes('протрав') || searchString.includes('праймер') || searchString.includes('primer') || searchString.includes('галоген') || searchString.includes('halog') || searchString.includes('preparatore')
    
    // 1. Полиуретан -> Изоцианат
    if (isPU) {
      const isocyanate = macroIndicators.find(m => m.type === 'isocyanate')
      if (isocyanate && isocyanate.trend > 10) {
        signals.push({ kind: 'urgent_buy', label: 'Закупать срочно (рост ПУ-сырья)', tone: 'bad' })
      } else if (isocyanate && isocyanate.trend < -10) {
        signals.push({ kind: 'macro_down', label: 'Сырье ПУ дешевеет', tone: 'good' })
      }
    }

    // 2. Наирит / Каучук -> Хлоропрен или каучук
    if (isRubber) {
      const rubberRaw = macroIndicators.find(m => m.type === 'chloroprene' || m.type === 'rubber')
      if (rubberRaw && rubberRaw.trend > 10) {
        signals.push({ kind: 'urgent_buy', label: 'Закупать срочно (рост каучука)', tone: 'bad' })
      }
    }

    // 3. Латексный клей -> Латекс
    if (isLatex) {
      const latexRaw = macroIndicators.find(m => m.type === 'latex')
      if (latexRaw && latexRaw.trend > 10) {
        signals.push({ kind: 'urgent_buy', label: 'Внимание: рост цен на латекс', tone: 'warn' })
      }
    }

    // 4. Протрава / Праймер / Галоген -> Растворители
    if (isPrimer) {
      const solvent = macroIndicators.find(m => m.type === 'solvent')
      if (solvent && solvent.trend > 10) {
        signals.push({ kind: 'supply_alert', label: 'Риск дефицита (растворители)', tone: 'warn' })
      }
    }

    // 5. Логистика / Фрахт (Для импорта)
    const freight = macroIndicators.find(m => m.type === 'freight_cn_eu')
    if (freight && freight.trend > 15) {
      signals.push({ kind: 'supply_alert', label: 'Ожидается удорожание импорта', tone: 'warn' })
    }
  }

  return signals
}
