import { useMemo } from 'react'
import {
  formatSize,
  STYLE_ALLOWANCES,
  type BrandFitEntry,
  type Gender,
  type ProFitResult,
  type ShoeStyle,
  type WidthFit,
} from '../../lib/shoeSizes'
import {
  FlagBR,
  FlagEU,
  FlagJP,
  FlagUA,
  FlagUK,
  FlagUS,
  LockIcon,
  type SupportedLang,
  type TranslationBundle,
} from '../../lib/sizeCalcI18n'
import { safeHapticImpact, safeHapticSelection } from './haptics'
import { isClassicBrandEntry } from './storage'
import type { ActiveTab, UiLabels } from './types'

function FlagCN() {
  return (
    <svg
      width="18"
      height="13"
      viewBox="0 0 18 13"
      fill="none"
      aria-hidden="true"
      className="rounded-[2px] shrink-0"
    >
      <rect width="18" height="13" fill="#DE2910" />
      <polygon
        points="3.6,1.8 4.15,3.5 5.95,3.5 4.5,4.55 5.05,6.25 3.6,5.2 2.15,6.25 2.7,4.55 1.25,3.5 3.05,3.5"
        fill="#FFDE00"
      />
      <circle cx="7.2" cy="1.8" r="0.55" fill="#FFDE00" />
      <circle cx="8.3" cy="3.1" r="0.55" fill="#FFDE00" />
      <circle cx="8.3" cy="4.8" r="0.55" fill="#FFDE00" />
      <circle cx="7.2" cy="6.1" r="0.55" fill="#FFDE00" />
    </svg>
  )
}

export type SizeTabsProps = {
  activeTab: ActiveTab
  onChangeTab: (tab: ActiveTab) => void
  gender: Gender
  shoeStyle: ShoeStyle
  onChangeShoeStyle: (style: ShoeStyle) => void
  widthFit: WidthFit
  onChangeWidthFit: (width: WidthFit) => void
  proFit: ProFitResult
  isProPurchased: boolean
  onProClick: () => void
  safeLang: SupportedLang
  t: TranslationBundle
  ui: UiLabels
  isDark: boolean
  bgSurface: string
  bgSurfaceSoft: string
  textPrimary: string
  textSecondary: string
  textTertiary: string
  hairline: string
  dividerClass: string
  accentHex: string
  activeInvert: string
}

export function SizeTabs({
  activeTab,
  onChangeTab,
  gender,
  shoeStyle,
  onChangeShoeStyle,
  widthFit,
  onChangeWidthFit,
  proFit,
  isProPurchased,
  onProClick,
  safeLang,
  t,
  ui,
  isDark,
  bgSurface,
  bgSurfaceSoft,
  textPrimary,
  textSecondary,
  textTertiary,
  hairline,
  dividerClass,
  accentHex,
  activeInvert,
}: SizeTabsProps) {
  const activeResult = proFit.recommendedSize
  const usLabel = gender === 'kids' ? 'US K' : gender === 'men' ? 'US M' : 'US W'

  const styleItems: Array<{ id: ShoeStyle; label: string; addMm: number }> = [
    { id: 'sneakers', label: t.styleSneakers, addMm: STYLE_ALLOWANCES.sneakers.insoleAddMm },
    { id: 'classic', label: t.styleClassic, addMm: STYLE_ALLOWANCES.classic.insoleAddMm },
    { id: 'winter', label: t.styleWinter, addMm: STYLE_ALLOWANCES.winter.insoleAddMm },
    { id: 'running', label: t.styleRunning, addMm: STYLE_ALLOWANCES.running.insoleAddMm },
    { id: 'sandals', label: t.styleSandals, addMm: STYLE_ALLOWANCES.sandals.insoleAddMm },
  ]

  const worldSystems = [
    {
      code: 'UA',
      sub: t.subUa,
      val: formatSize(activeResult.ua),
      flag: <FlagUA />,
      free: true,
    },
    {
      code: 'EU',
      sub: t.subEu,
      val: formatSize(activeResult.eu),
      flag: <FlagEU />,
      free: true,
    },
    {
      code: usLabel,
      sub: t.subUs,
      val: formatSize(activeResult.us),
      flag: <FlagUS />,
      free: false,
    },
    {
      code: 'UK',
      sub: t.subUk,
      val: formatSize(activeResult.uk),
      flag: <FlagUK />,
      free: false,
    },
    {
      code: 'JP / CM',
      sub: t.subJp,
      val: `${formatSize(activeResult.jp)} (${activeResult.mondopoint})`,
      flag: <FlagJP />,
      free: false,
    },
    {
      code: 'BR / CN',
      sub: t.subBrCn,
      val: `${formatSize(activeResult.br)} / ${formatSize(activeResult.cn)}`,
      flag: (
        <span className="inline-flex items-center gap-1 shrink-0">
          <FlagBR />
          <FlagCN />
        </span>
      ),
      free: false,
    },
  ]

  const brandGroups = useMemo(() => {
    const sport = proFit.brandMatrix.filter((row) => !isClassicBrandEntry(row))
    const classic = proFit.brandMatrix.filter((row) => isClassicBrandEntry(row))
    const groups: Array<{ id: string; title: string; rows: BrandFitEntry[] }> = []
    if (sport.length > 0) groups.push({ id: 'sport', title: ui.groupSport, rows: sport })
    if (classic.length > 0) groups.push({ id: 'classic', title: ui.groupClassic, rows: classic })
    return groups
  }, [proFit.brandMatrix, ui.groupSport, ui.groupClassic])

  return (
    <section className="flex flex-col gap-4">
      <nav className={`grid grid-cols-4 border-b ${hairline}`}>
        {(
          [
            { id: 'world', label: t.tabWorld },
            { id: 'fit', label: t.tabFit },
            { id: 'brands', label: t.tabBrands },
            { id: 'guide', label: t.tabGuide },
          ] as Array<{ id: ActiveTab; label: string }>
        ).map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                safeHapticImpact('medium')
                onChangeTab(tab.id)
              }}
              className={`relative pb-2.5 pt-1 text-xs sm:text-[13px] font-sans font-semibold uppercase tracking-[0.08em] transition-colors cursor-pointer truncate ${
                active ? textPrimary : textSecondary
              }`}
            >
              {tab.label}
              <span
                className={`absolute inset-x-2 bottom-0 h-[2px] rounded-full transition-opacity duration-150 ${
                  active ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ backgroundColor: accentHex }}
              />
            </button>
          )
        })}
      </nav>

      {/* ВКЛАДКА 1: МИРОВЫЕ СИСТЕМЫ */}
      {activeTab === 'world' && (
        <div key="world" className="cw-tab-fade grid grid-cols-2 sm:grid-cols-3 gap-3">
          {worldSystems.map((item) => {
            const unlocked = item.free || isProPurchased
            const isWideVal = item.val.length > 6
            return (
              <div
                key={item.code}
                onClick={() => {
                  if (!unlocked) onProClick()
                  else safeHapticSelection()
                }}
                className={`rounded-2xl p-4 flex flex-col justify-between min-h-[114px] transition-colors ${bgSurface} ${
                  !unlocked ? 'cursor-pointer active:scale-[0.98]' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.flag}
                    <span className="text-xs font-sans font-semibold uppercase tracking-[0.1em] whitespace-nowrap">
                      {item.code}
                    </span>
                  </div>
                  {!unlocked && (
                    <span className={textTertiary}>
                      <LockIcon />
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  {unlocked ? (
                    <span
                      className={`font-serif leading-none tracking-tight tabular-nums block whitespace-nowrap ${
                        isWideVal ? 'text-[23px] sm:text-[25px]' : 'text-[28px] sm:text-[30px]'
                      }`}
                    >
                      {item.val}
                    </span>
                  ) : (
                    <span className="font-serif text-[26px] leading-none blur-[5px] opacity-35 select-none block">
                      42.5
                    </span>
                  )}
                  <span className={`text-xs font-sans block mt-2 truncate ${textSecondary}`}>
                    {item.sub}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ВКЛАДКА 2: КОЛОДКА, СЕЗОН И ПОЛНОТА */}
      {activeTab === 'fit' && (
        <div key="fit" className="cw-tab-fade flex flex-col gap-4">
          <div>
            <span className={`block text-[11px] font-sans font-semibold uppercase tracking-[0.14em] mb-2 ${textTertiary}`}>
              {ui.styleSection}
            </span>
            <div className="grid grid-cols-6 gap-2">
              {styleItems.map((st, idx) => {
                const active = shoeStyle === st.id
                const spanClass = idx < 3 ? 'col-span-2' : 'col-span-3'
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      safeHapticImpact('medium')
                      onChangeShoeStyle(st.id)
                    }}
                    className={`${spanClass} py-2.5 px-2.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                      active ? activeInvert : `${bgSurface} ${textPrimary}`
                    }`}
                  >
                    <span className="text-xs font-sans font-medium truncate max-w-full">
                      {st.label}
                    </span>
                    <span
                      className={`text-[11px] font-sans tabular-nums ${
                        active ? 'opacity-80' : textSecondary
                      }`}
                    >
                      +{st.addMm} {t.mmLabel}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <span className={`block text-[11px] font-sans font-semibold uppercase tracking-[0.14em] mb-2 ${textTertiary}`}>
              {ui.widthSection}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'narrow', label: t.widthNarrow },
                  { id: 'standard', label: t.widthStandard },
                  { id: 'wide', label: t.widthWide },
                  { id: 'extraWide', label: t.widthExtraWide },
                ] as Array<{ id: WidthFit; label: string }>
              ).map((wf) => {
                const active = widthFit === wf.id
                return (
                  <button
                    key={wf.id}
                    type="button"
                    onClick={() => {
                      safeHapticImpact('medium')
                      onChangeWidthFit(wf.id)
                    }}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-sans font-medium tracking-wide cursor-pointer truncate transition-all ${
                      active ? textPrimary : `${bgSurface} ${textSecondary}`
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: isDark
                              ? 'rgba(201, 168, 106, 0.16)'
                              : 'rgba(154, 107, 47, 0.14)',
                            color: accentHex,
                          }
                        : undefined
                    }
                  >
                    {wf.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div
            onClick={() => {
              if (!isProPurchased) onProClick()
            }}
            className={`rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 ${bgSurface} ${
              !isProPurchased ? 'cursor-pointer' : ''
            }`}
          >
            <div>
              <span className={`text-[11px] font-sans font-medium uppercase tracking-[0.14em] block ${textTertiary}`}>
                {t.insoleLabel} · {t.allowanceLabel}
              </span>
              <span className={`font-serif text-[25px] sm:text-[26px] leading-tight block mt-1.5 tabular-nums ${!isProPurchased ? 'blur-[5px]' : ''}`}>
                {proFit.insoleMm} {t.mmLabel} ({proFit.insoleCm.toFixed(1)} {t.cmLabel})
              </span>
              <span className={`block text-xs mt-1.5 ${textSecondary}`}>
                {t.footTag} {proFit.footMm} + {proFit.allowanceMm} →{' '}
                <strong className="font-semibold" style={{ color: accentHex }}>
                  {formatSize(activeResult.ua)} UA / {formatSize(activeResult.eu)} EU
                </strong>
              </span>
            </div>

            <div className={`pt-4 border-t ${hairline} sm:pt-0 sm:border-t-0 sm:pl-5 sm:border-l`}>
              <span className={`text-[11px] font-sans font-medium uppercase tracking-[0.14em] block ${textTertiary}`}>
                {t.widthLabel} · {t.girthLabel}
              </span>
              <span className={`font-serif text-[25px] sm:text-[26px] leading-tight block mt-1.5 tabular-nums ${!isProPurchased ? 'blur-[5px]' : ''}`}>
                {proFit.ballWidthMm} / {proFit.ballGirthMm} {t.mmLabel}
              </span>
              <span className={`block text-xs mt-1.5 ${textSecondary} ${!isProPurchased ? 'blur-[4px]' : ''}`}>
                EU {proFit.widthMarks.eu} · US {proFit.widthMarks.us} · JP {proFit.widthMarks.jp}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ВКЛАДКА 3: СТРУКТУРИРОВАННЫЕ КАРТОЧКИ БРЕНДОВ */}
      {activeTab === 'brands' && (
        <div key="brands" className="cw-tab-fade flex flex-col gap-4">
          {brandGroups.map((group) => (
            <div key={group.id} className="flex flex-col gap-2">
              <span className={`text-[11px] font-sans font-semibold uppercase tracking-[0.14em] px-1 ${textTertiary}`}>
                {group.title}
              </span>

              <div className={`rounded-2xl px-4 sm:px-5 divide-y ${bgSurface} ${dividerClass}`}>
                {group.rows.map((row) => (
                  <div
                    key={row.brand}
                    onClick={() => {
                      if (!isProPurchased) onProClick()
                      else safeHapticSelection()
                    }}
                    className={`py-4 flex flex-col gap-2 ${
                      !isProPurchased ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex flex-col items-start gap-1">
                        <span className="text-sm font-sans font-semibold uppercase tracking-[0.06em] leading-snug">
                          {row.brand}
                        </span>
                        <span
                          className={`text-[10.5px] font-sans font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full ${bgSurfaceSoft} ${textSecondary}`}
                        >
                          {row.category}
                        </span>
                      </div>

                      {isProPurchased ? (
                        <span className="font-serif text-[23px] leading-none tracking-tight tabular-nums shrink-0 pt-0.5">
                          EU {row.eu}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0 pt-0.5">
                          <span className="font-serif text-lg blur-[5px] opacity-35 select-none">
                            EU 42.5
                          </span>
                          <span className={textTertiary}>
                            <LockIcon />
                          </span>
                        </div>
                      )}
                    </div>

                    {isProPurchased && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-sans tabular-nums">
                        <span className="font-medium" style={{ color: accentHex }}>
                          US {row.us}
                        </span>
                        <span className={textTertiary}>·</span>
                        <span className="font-medium" style={{ color: accentHex }}>
                          UK {row.uk}
                        </span>
                        <span className={textTertiary}>·</span>
                        <span className={textSecondary}>JP {row.jp}</span>
                      </div>
                    )}

                    <p className={`text-xs font-sans leading-relaxed ${textSecondary}`}>
                      {row.offsetNote[safeLang]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ВКЛАДКА 4: ИНСТРУКЦИЯ ЗАМЕРА */}
      {activeTab === 'guide' && (
        <div key="guide" className={`cw-tab-fade rounded-2xl p-4 sm:p-5 flex flex-col gap-4 ${bgSurface}`}>
          <div className="flex gap-3">
            <span className="font-serif text-lg leading-none pt-0.5 shrink-0" style={{ color: accentHex }}>
              01
            </span>
            <div>
              <h4 className="text-xs font-sans font-semibold uppercase tracking-[0.13em]">
                {t.guideFootTitle}
              </h4>
              <p className="text-[13px] font-sans leading-relaxed mt-1.5">{t.measureGuide1}</p>
              <p className={`text-xs font-sans leading-relaxed mt-1.5 ${textSecondary}`}>
                {t.measureGuide2}
              </p>
            </div>
          </div>

          <div className={`pt-4 border-t ${hairline} flex gap-3`}>
            <span className="font-serif text-lg leading-none pt-0.5 shrink-0" style={{ color: accentHex }}>
              02
            </span>
            <div>
              <h4 className="text-xs font-sans font-semibold uppercase tracking-[0.13em]">
                {t.guideInsoleTitle}
              </h4>
              <p className="text-[13px] font-sans leading-relaxed mt-1.5">{t.measureGuide3}</p>
            </div>
          </div>

          <p className={`text-xs font-sans italic leading-relaxed pt-3.5 border-t ${hairline} ${textSecondary}`}>
            {t.measureTip}
          </p>
        </div>
      )}
    </section>
  )
}

