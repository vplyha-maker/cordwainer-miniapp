import { useMemo, useState, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Search,
  X,
  Tag,
  BookOpen,
  ChevronDown,
  Bookmark,
  Info,
  Lock,
} from 'lucide-react'

import type { PricesPageProps, SortOption, GroupedProduct } from './types'
import { DICTIONARY, PAGE_SIZE } from './constants'
import { formatSourceName } from './utils'
import { usePrices } from './usePrices'

import { ProductCard } from './components/ProductCard'
import { CurrencySwitch } from './components/CurrencySwitch'
import { PriceHistoryModal } from '../../components/PriceHistoryModal'

function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
  } catch {}
}

const PricesPage = ({ onBack, lang }: PricesPageProps) => {
  const t = DICTIONARY[lang]

  const {
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
    macroIndicators,
  } = usePrices()

  // Принудительно ставим UAH по умолчанию при первой загрузке
  useEffect(() => {
    if (!currency || currency === 'USD' || currency === 'EUR') {
      setCurrency('UAH' as any)
    }
  }, [])

  // === СВЕТЛАЯ / ТЕМНАЯ ТЕМА ===
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme() 
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cSurface = isDark ? 'bg-[#111111]' : 'bg-[#EAE6DF]'
  const cSurface2 = isDark ? 'bg-[#1A1A1A]' : 'bg-[#E2DED7]'

  // === PAYWALL (PRO MARKET) ===
  const [isProPurchased, setIsProPurchased] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [showProModal, setShowProModal] = useState(false)

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id
    if (!userId) return

    fetch(`/api/check-purchase?userId=${userId}&productId=pro_market`)
      .then(res => res.json())
      .then(data => {
        if (data.purchased) setIsProPurchased(true)
      })
      .catch(err => console.error("Ошибка проверки покупки:", err))
  }, [])

  const handleProClick = async () => {
    const tg = (window as any).Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;

    if (!userId) {
      alert("Ошибка: Откройте приложение через Telegram.");
      return;
    }

    setIsPurchasing(true);
    haptic('light');

    try {
      const response = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, productId: "pro_market" }) 
      });

      const data = await response.json();
      if (!response.ok || !data.invoiceLink) throw new Error(data.error);

      tg.openInvoice(data.invoiceLink, (status: string) => {
        if (status === 'paid') {
          haptic('heavy');
          setIsProPurchased(true); 
          setShowProModal(false);
        } else if (status === 'failed') {
          alert("Оплата была отменена или произошла ошибка.");
        }
      });
    } catch (error: any) {
      console.error(error);
      alert(`Сбой сервера: ${error.message}`);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Перехват смены валюты
  const handleCurrencyChange = (newCurrency: string) => {
    if (newCurrency !== 'UAH' && !isProPurchased) {
      haptic('medium')
      setShowProModal(true)
      return
    }
    setCurrency(newCurrency as any)
  }

  // Перехват добавления в Избранное
  const handleToggleFavorite = (key: string) => {
    if (!isProPurchased) {
      haptic('medium')
      setShowProModal(true)
      return
    }
    toggleFavorite(key)
  }

  const paywallText = {
    ru: {
      title: 'PRO: Рынок',
      desc: 'В PRO-версии вам доступны: пересчет цен в USD и EUR, сохранение в «Отслеживаемые» (Избранное) и прямые ссылки на поставщиков.',
      btn: 'ОТКРЫТЬ ДОСТУП • 1 ⭐️',
      loading: 'ОБРАБОТКА...'
    },
    uk: {
      title: 'PRO: Ринок',
      desc: 'У PRO-версії вам доступні: перерахунок цін в USD та EUR, збереження у «Відстежувані» (Обране) та прямі посилання на постачальників.',
      btn: 'ВІДКРИТИ ДОСТУП • 1 ⭐️',
      loading: 'ОБРОБКА...'
    },
    de: {
      title: 'PRO: Markt',
      desc: 'In der PRO-Version erhalten Sie: Preisumrechnung in USD und EUR, Speichern in Favoriten und direkte Links zu Lieferanten.',
      btn: 'FREISCHALTEN • 1 ⭐️',
      loading: 'LÄDT...'
    }
  }[lang === 'uk' || lang === 'de' ? lang : 'ru']

  const currentModalContent = useMemo(() => {
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
  }, [modalData, t])

  const newsAlert = macroIndicators?.find((m: any) => m.type === 'news_alert')
  const freight = macroIndicators?.find((m: any) => m.type === 'freight_cn_eu')
  const freightTrend = Number(freight?.trend) || 0
  const isFreightUp = freightTrend > 0
  const isFreightDown = freightTrend < 0

  return (
    <div className={`min-h-[100dvh] w-full ${cBg} ${cText} font-sans transition-colors duration-300`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col h-[100dvh] relative"
      >
        <header className={`shrink-0 z-20 ${cSurface} border-b ${cLine} pt-4 pb-3 px-4 md:px-8 transition-colors duration-300`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={onBack}
                  className={`relative p-2 -m-2 border ${cLine} rounded-lg flex items-center justify-center ${cTextMuted} hover:${cSurface2} transition-colors shrink-0`}
                >
                  <ArrowLeft size={18} strokeWidth={1.5} />
                </button>
                <div className="min-w-0">
                  <h1 className={`font-serif text-2xl md:text-3xl tracking-tight flex items-center gap-2.5 ${cText}`}>
                    <BookOpen size={22} className={`${cTextMuted} opacity-70 shrink-0`} strokeWidth={1.5} />
                    <span className="truncate">Рынок</span>
                  </h1>

                  <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mt-1 font-mono ${cTextMuted}`}>
                    <span>{stats.total} {t.statsTotal}</span>
                    {stats.multiCount > 0 && (
                      <>
                        <span className="opacity-30 font-sans">/</span>
                        <button
                          onClick={() => setModalData({ type: 'volatility', value: stats.avgSpreadValue })}
                          className="relative inline-flex items-center p-1 -m-1 rounded text-[#FFB020] font-sans font-medium hover:opacity-80 transition-colors"
                        >
                          {t.statsAvgSpread}: {stats.avgSpreadText}%
                          <Info size={12} strokeWidth={2.5} className="opacity-50 ml-1" />
                        </button>
                      </>
                    )}
                    {/* ВОТ ЗДЕСЬ ВОЗВРАЩЕН ВЫВОД КУРСА ВАЛЮТ */}
                    {(usdRate || eurRate) && (
                      <>
                        <span className="opacity-30 font-sans">/</span>
                        <span className={`tabular-nums font-semibold ${cText}`}>
                          {usdRate && '$ ' + usdRate.toFixed(2)}
                          {usdRate && eurRate && ' · '}
                          {eurRate && '€ ' + eurRate.toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0 pt-1 relative">
                {!isProPurchased && (
                  <div className="absolute -top-3 -right-2 text-[#FFB020] opacity-80" onClick={() => setShowProModal(true)}>
                    <Lock size={12} strokeWidth={2} />
                  </div>
                )}
                <CurrencySwitch
                  currency={currency}
                  onChange={handleCurrencyChange}
                  usdRate={usdRate}
                  eurRate={eurRate}
                />
              </div>
            </div>

            <div className={`flex flex-col lg:flex-row gap-2 border-t ${cLine} pt-3`}>
              <div className="relative flex-1 max-w-md">
                <Search size={14} strokeWidth={1.5} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${cTextMuted}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.search}
                  className={`w-full h-8 pl-8 pr-7 ${cSurface2} border ${cLine} focus:border-current outline-none text-xs ${isDark ? 'placeholder:text-[#F4F0E8]/30' : 'placeholder:text-[#1C1816]/30'} ${cText} transition-colors`}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${cTextMuted} hover:text-current`}>
                    <X size={14} strokeWidth={1.5} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className={`h-8 px-2 min-w-min text-[10px] uppercase tracking-wider ${cSurface2} ${cText} border ${cLine} outline-none cursor-pointer appearance-none shrink-0`}
                >
                  <option value="default">{t.sortDefault}</option>
                  <option value="savings">{t.sortSavings}</option>
                  <option value="unit-price-asc">{t.sortUnitPriceAsc}</option>
                  <option value="name">{t.sortName}</option>
                </select>

                <div className={`h-4 w-px shrink-0 ${isDark ? 'bg-[#F4F0E8]/15' : 'bg-[#1C1816]/15'}`} />

                <div className="flex gap-1 shrink-0 relative">
                  <button
                    onClick={() => setSelectedSource('all')}
                    className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold transition-colors border ${selectedSource === 'all' ? `border-[#FFB020] bg-[#FFB020] ${isDark ? 'text-[#0A0A0A]' : 'text-[#F2EFE9]'}` : `border-transparent ${cTextMuted} hover:text-current`}`}
                  >
                    {t.allSources}
                  </button>
                  <button
                    onClick={() => {
                      if (!isProPurchased) {
                        haptic('medium');
                        setShowProModal(true);
                      } else {
                        setSelectedSource('favorites');
                      }
                    }}
                    className={`relative px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors border ${selectedSource === 'favorites' ? `border-[#FFB020] bg-[#FFB020] ${isDark ? 'text-[#0A0A0A]' : 'text-[#F2EFE9]'}` : `border-transparent ${cTextMuted} hover:text-current`}`}
                  >
                    {!isProPurchased && (
                      <div className="absolute -top-1.5 -right-1.5 text-[#FFB020]">
                        <Lock size={8} strokeWidth={3} />
                      </div>
                    )}
                    <Bookmark size={11} strokeWidth={selectedSource === 'favorites' ? 2 : 1.5} className={selectedSource === 'favorites' ? 'fill-current' : ''} />
                    {t.favorites}
                  </button>
                  {sources.map((src: string) => (
                    <button
                      key={src}
                      onClick={() => setSelectedSource(src)}
                      className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold transition-colors border ${selectedSource === src ? `border-[#FFB020] bg-[#FFB020] ${isDark ? 'text-[#0A0A0A]' : 'text-[#F2EFE9]'}` : `border-transparent ${cTextMuted} hover:text-current`}`}
                    >
                      {formatSourceName(src)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 no-scrollbar relative">
          <div className="max-w-7xl mx-auto">
            {!loading && !error && (newsAlert || freight) && (
              <div className="mb-8 space-y-4">
                {newsAlert?.description && (
                  <div className={`relative overflow-hidden border ${cLine} ${cSurface} rounded-xl`}>
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#FFB020] bg-[#FFB020]/10 px-2 py-0.5 rounded">RSS</span>
                      <div className="relative flex-1 overflow-hidden">
                        <div className="animate-marquee whitespace-nowrap text-sm font-medium text-[#1e40af]">
                          <span className="inline-block pr-16">{newsAlert.description}</span>
                          <span className="inline-block pr-16">{newsAlert.description}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {freight && (
                  <div className={`border ${cLine} ${cSurface} rounded-xl p-3 md:p-4`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${cTextMuted}`}>Макро · Фрахт</span>
                        </div>
                        <h3 className={`font-serif text-base md:text-lg ${cText} leading-none`}>Китай → Европа</h3>
                      </div>
                      <div className="shrink-0 text-right flex flex-col items-end">
                        <div className={`text-xl md:text-2xl font-serif font-medium ${cText} tabular-nums tracking-tight leading-none mb-1.5`}>
                          ${Number(freight.value).toLocaleString('en-US')}
                        </div>
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${isFreightUp ? 'bg-red-500/10 text-red-500' : isFreightDown ? 'bg-emerald-500/10 text-emerald-500' : `${cSurface2}${cTextMuted}`}`}>
                          {isFreightUp && '↑'}
                          {isFreightDown && '↓'}
                          {!isFreightUp && !isFreightDown && '→'}
                          <span>{freightTrend > 0 ? '+' : ''}{freightTrend}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className={`h-60 ${cSurface} border ${cLine} animate-pulse`} />)}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <p className={`font-serif text-xl ${cTextMuted} mb-6`}>{error}</p>
                <button onClick={handleRetry} className={`px-8 py-3 border border-[#FFB020] text-xs uppercase tracking-widest font-semibold text-[#FFB020] hover:bg-[#FFB020] hover:${isDark ? 'text-[#0A0A0A]' : 'text-[#F2EFE9]'}`}>
                  {t.retry}
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-28 text-center ${cTextMuted}`}>
                <Tag size={44} strokeWidth={1} className="mb-4 opacity-40" />
                <p className={`font-serif text-2xl ${cText} mb-2`}>{t.empty}</p>
              </div>
            ) : (
              <div className="pb-14">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                  <AnimatePresence>
                    {filteredItems.slice(0, visibleCount).map((g: GroupedProduct) => (
                      <motion.div key={g.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
                        {/* @ts-ignore - игнорируем ошибку TS, пока не обновим ProductCard */}
                        <ProductCard
                          group={g}
                          lang={lang}
                          t={t as any}
                          isFavorite={favorites.has(g.key)}
                          onToggleFavorite={handleToggleFavorite}
                          onOpenSpreadModal={(val) => setModalData({ type: 'spread', value: val })}
                          onOpenHistory={(groupData) => setHistoryGroup(groupData)}
                          currency={currency as any}
                          usdRate={usdRate}
                          eurRate={eurRate}
                          macroIndicators={macroIndicators as any}
                          isProPurchased={isProPurchased}
                          onRequirePro={() => setShowProModal(true)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {visibleCount < filteredItems.length && (
                  <div className="mt-10 flex justify-center">
                    <button onClick={() => setVisibleCount((v: number) => v + PAGE_SIZE)} className={`px-8 py-3.5 border ${cLine} ${cSurface} text-xs uppercase tracking-widest font-semibold flex items-center gap-2.5 ${cText} hover:opacity-70 transition-opacity`}>
                      {t.loadMore} <ChevronDown size={14} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <AnimatePresence>
          {showProModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#000000]/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full max-w-[340px] p-8 border ${cLine} ${cSurface} shadow-2xl flex flex-col overflow-hidden`}
              >
                <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l ${cLine}`} />
                <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${cLine}`} />
                <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${cLine}`} />
                <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r ${cLine}`} />

                <button onClick={() => setShowProModal(false)} className={`absolute top-4 right-4 ${cTextMuted} hover:text-current`}>
                  <X size={18} strokeWidth={1.5} />
                </button>

                <div className={`flex justify-center mb-5 ${cTextMuted} opacity-50`}>
                  <Lock size={32} strokeWidth={1} />
                </div>

                <h3 className={`font-serif text-2xl tracking-tight mb-4 text-center ${cText}`}>
                  {paywallText.title}
                </h3>
                
                <p className={`text-[12px] font-sans font-light leading-relaxed mb-8 text-center ${cTextMuted}`}>
                  {paywallText.desc}
                </p>

                <button
                  onClick={handleProClick}
                  disabled={isPurchasing}
                  className={`group flex items-center justify-center gap-3 w-full py-4 border ${cLine} ${cSurface} ${cText} hover:${cSurface2} active:scale-95 transition-all outline-none`}
                >
                  {isPurchasing ? (
                    <span className="text-[10px] font-sans uppercase tracking-[0.2em] animate-pulse">
                      {paywallText.loading}
                    </span>
                  ) : (
                    <>
                      <Lock size={14} />
                      <span className="text-[10px] font-sans uppercase tracking-[0.2em]">
                        {paywallText.btn}
                      </span>
                    </>
                  )}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {modalData && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalData(null)} className="absolute inset-0 bg-[#000000] opacity-70 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className={`relative w-full max-w-md ${cSurface} shadow-2xl p-7 rounded-t-3xl sm:rounded-3xl z-10`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-[#FFB020]" />
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="text-6xl font-serif font-medium text-[#FFB020] tracking-tight mb-2">{modalData.value.toFixed(0)}%</div>
                    <h3 className={`text-sm uppercase tracking-widest ${cTextMuted} font-bold mb-6`}>{modalData.type === 'spread' ? t.spreadTitle : t.volatilityTitle}</h3>
                  </div>
                  <button onClick={() => setModalData(null)} className={`p-2 -m-2 ${cTextMuted} hover:text-current transition-colors`}><X size={20} strokeWidth={1.5} /></button>
                </div>
                <div className={`${cSurface2} p-5 border ${cLine} relative`}>
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFB020] opacity-50" />
                  <p className={`text-[11px] font-bold ${cText} uppercase tracking-widest mb-2 font-mono`}>{t.recommendationLabel}</p>
                  <p className={`text-[14px] ${cTextMuted} leading-relaxed`}>{currentModalContent.rec}</p>
                </div>
                <button onClick={() => setModalData(null)} className={`mt-8 w-full py-4 bg-[#FFB020] ${isDark ? 'text-[#0A0A0A]' : 'text-[#F2EFE9]'} text-xs uppercase tracking-widest font-bold`}>
                  {t.gotIt}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {historyGroup && (
            <PriceHistoryModal group={historyGroup} onClose={() => setHistoryGroup(null)} t={t} lang={lang} usdRate={usdRate} eurRate={eurRate} currency={currency} onCurrencyChange={handleCurrencyChange} />
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { display: inline-block; animation: marquee 55s linear infinite; }
        .animate-marquee:hover { animation-play-state: paused; }
      `}</style>
    </div>
  )
}

export { PricesPage }
export default PricesPage
