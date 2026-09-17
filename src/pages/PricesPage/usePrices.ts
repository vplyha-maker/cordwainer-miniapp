import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react'
import { PAGE_SIZE } from './constants'
// ДОБАВЛЕН MacroIndicator в импорт
import type { Product, GroupedProduct, Offer, SortOption, ModalData, MacroIndicator } from './types'
import type { Currency } from '../../components/PriceHistoryModal'
import {
  parsePriceSafely,
  getVolumeData,
  normalizeProductName,
  calculateWordSimilarity,
  extractHistory,
} from './utils'

export function usePrices() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eurRate, setEurRate] = useState<number | null>(null)
  const [usdRate, setUsdRate] = useState<number | null>(null)
  
  // НОВОЕ СОСТОЯНИЕ ДЛЯ МАКРО-ИНДИКАТОРОВ
  const [macroIndicators, setMacroIndicators] = useState<MacroIndicator[]>([])
  
  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem('price_currency')
      if (saved === 'UAH' || saved === 'USD' || saved === 'EUR') return saved as Currency
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
        // ДОБАВЛЕН ЗАПРОС К /api/macro (с безопасным catch, чтобы не ломать всё остальное)
        const [apiRes, ratesRes, macroRes] = await Promise.all([
          fetch('/api/prices?_t=' + Date.now(), { signal: abortController.signal }),
          fetch('/api/rates?_t=' + Date.now(), { signal: abortController.signal }),
          fetch('/api/macro?_t=' + Date.now(), { signal: abortController.signal }).catch(() => null)
        ])

        if (!apiRes?.ok) throw new Error('API error')
        const data = await apiRes.json()
        setItems(Array.isArray(data) ? data : [])

        if (ratesRes?.ok) {
          const rates = await ratesRes.json()
          if (rates?.usd) setUsdRate(Number(rates.usd))
          if (rates?.eur) setEurRate(Number(rates.eur))
        }

        // Обработка макро-данных, если запрос успешен
        if (macroRes?.ok) {
          try {
            const macroData = await macroRes.json()
            setMacroIndicators(Array.isArray(macroData) ? macroData : [])
          } catch (e) {
            console.warn('Failed to parse macro indicators')
          }
        }

      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError('Error loading data')
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    loadData()
    return () => abortController.abort()
  }, [retryTrigger])

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
            (o: Offer) => o.id === item.id || (o.url && o.url === item.url),
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
      const priced = group.offers.filter((o: Offer) => o.unitPrice > 0)
      group.minUnitPrice = priced.length ? Math.min(...priced.map((o: Offer) => o.unitPrice)) : 0
      group.maxUnitPrice = priced.length ? Math.max(...priced.map((o: Offer) => o.unitPrice)) : 0
      group.unitSpread =
        group.minUnitPrice > 0
          ? ((group.maxUnitPrice - group.minUnitPrice) / group.minUnitPrice) * 100
          : 0
      group.totalOffers = group.offers.length
      group.outOfStockCount = group.offers.filter((o: Offer) => o.unitPrice <= 0).length
      return group
    })
  }, [items])

  const filteredItems = useMemo(() => {
    let result = baseGroupedItems
    if (selectedSource === 'favorites') result = result.filter((g) => favorites.has(g.key))
    else if (selectedSource !== 'all')
      result = result.filter((g: GroupedProduct) =>
        g.offers.some((o: Offer) => o.source.toLowerCase() === selectedSource.toLowerCase()),
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

  return {
    loading,
    error,
    eurRate,
    usdRate,
    currency,
    setCurrency,
    modalData,
    setModalData,
    historyGroup,
    setHistoryGroup,
    searchQuery,
    setSearchQuery,
    selectedSource,
    setSelectedSource,
    sortBy,
    setSortBy,
    visibleCount,
    setVisibleCount,
    favorites,
    toggleFavorite,
    handleRetry,
    sources,
    filteredItems,
    stats,
    // ДОБАВЛЕНО ВОЗВРАЩЕНИЕ МАКРО ИНДИКАТОРОВ
    macroIndicators, 
  }
}
