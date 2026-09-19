import { useMemo } from 'react'
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
} from 'lucide-react'

import type { PricesPageProps, SortOption, GroupedProduct } from './types'
import { DICTIONARY, PAGE_SIZE } from './constants'
import { formatSourceName } from './utils'
import { usePrices } from './usePrices'

import { ProductCard } from './components/ProductCard'
import { CurrencySwitch } from './components/CurrencySwitch'
import { PriceHistoryModal } from '../../components/PriceHistoryModal'

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

  // Макро-индикаторы
  const newsAlert = macroIndicators?.find((m: any) => m.type === 'news_alert')
  const freight = macroIndicators?.find((m: any) => m.type === 'freight_cn_eu')

  const freightTrend = Number(freight?.trend) || 0
  const isFreightUp = freightTrend > 0
  const isFreightDown = freightTrend < 0

  return (
    <div className="min-h-[100dvh] w-full bg-[var(--color-bg)] text-[var(--color-ink)] font-sans transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col h-[100dvh] relative"
      >
        {/* ===== HEADER ===== */}
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
                    {/* ПУНКТ 2 ВЫПОЛНЕН ЗДЕСЬ: ЖЕСТКО ПРОПИСАНО СЛОВО "Рынок" ВМЕСТО t.title */}
                    <span className="truncate">Рынок</span>
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
                  {sources.map((src: string) => (
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

        {/* ===== MAIN ===== */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 no-scrollbar">
          <div className="max-w-7xl mx-auto">

            {/* ===== МАКРО: БЕГУЩАЯ СТРОКА + ФРАХТ ===== */}
            {!loading && !error && (newsAlert || freight) && (
              <div className="mb-8 space-y-4">

                {/* Бегущая строка новостей */}
                {newsAlert?.description && (
                  <div className="relative overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl">
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-0.5 rounded">
                        RSS
                      </span>
                      <div className="relative flex-1 overflow-hidden">
                        <div className="animate-marquee whitespace-nowrap text-sm font-medium text-[#1e40af]">
                          <span className="inline-block pr-16">
                            {newsAlert.description}
                            {newsAlert.value > 0 && (
                              <span className="ml-3 text-[var(--color-accent)] font-medium">
                                · алертов: {newsAlert.value}
                              </span>
                            )}
                          </span>
                          <span className="inline-block pr-16">
                            {newsAlert.description}
                            {newsAlert.value > 0 && (
                              <span className="ml-3 text-[var(--color-accent)] font-medium">
                                · алертов: {newsAlert.value}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Карточка фрахта Drewry WCI (Компактная) */}
                {freight && (
                  <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl p-3 md:p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
                            Макро · Фрахт
                          </span>
                          <span className="text-[9px] text-[var(--color-muted)] opacity-50">·</span>
                          <span className="text-[9px] text-[var(--color-muted)] truncate">
                            Drewry WCI
                          </span>
                        </div>
                        <h3 className="font-serif text-base md:text-lg text-[var(--color-ink)] leading-none">
                          Китай → Европа
                        </h3>
                      </div>

                      <div className="shrink-0 text-right flex flex-col items-end">
                        <div className="text-xl md:text-2xl font-serif font-medium text-[var(--color-ink)] tabular-nums tracking-tight leading-none mb-1.5">
                          ${Number(freight.value).toLocaleString('en-US')}
                        </div>
                        <div
                          className={
                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ' +
                            (isFreightUp
                              ? 'bg-red-500/10 text-red-500'
                              : isFreightDown
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-[var(--color-surface-2)] text-[var(--color-muted)]')
                          }
                        >
                          {isFreightUp && '↑'}
                          {isFreightDown && '↓'}
                          {!isFreightUp && !isFreightDown && '→'}
                          <span>
                            {freightTrend > 0 ? '+' : ''}
                            {freightTrend}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== КОНТЕНТ ===== */}
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
                    {filteredItems.slice(0, visibleCount).map((g: GroupedProduct) => (
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
                          macroIndicators={macroIndicators}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {visibleCount < filteredItems.length && (
                  <div className="mt-10 flex justify-center">
                    <button
                      onClick={() => setVisibleCount((v: number) => v + PAGE_SIZE)}
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

        {/* ===== MODALS ===== */}
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

      {/* CSS для бегущей строки — медленнее + благородный синий */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 55s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}

export { PricesPage }
export default PricesPage
