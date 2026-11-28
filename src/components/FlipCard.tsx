import { useState } from 'react'
import type { GlossaryTerm } from '../data/glossary'
import type { Lang } from '../App'
import {
  CATEGORY_META,
  GLOSSARY_I18N,
  getAltTitle,
  getGlossaryTheme,
  getLocalizedDef,
  getLocalizedEx,
  getLocalizedTitle,
  haptic,
  resolveGlossaryLang,
} from '../pages/glossary/glossaryConfig'

export type FlipCardProps = {
  term: GlossaryTerm
  lang: Lang
  index?: number
  catalogNumber?: number
  isDark?: boolean
  flipHint?: string
  isLocked?: boolean
  onUnlock?: (e: React.MouseEvent) => void
  isPurchasing?: boolean
  isFeatured?: boolean
  onOpenDossier?: (term: GlossaryTerm) => void
}

export function FlipCard({
  term,
  lang,
  index = 0,
  catalogNumber,
  isDark = true,
  flipHint,
  isLocked = false,
  onUnlock,
  isPurchasing = false,
  onOpenDossier,
}: FlipCardProps) {
  const [flipped, setFlipped] = useState(false)

  const safeLang = resolveGlossaryLang(lang)
  const t = GLOSSARY_I18N[safeLang]
  const theme = getGlossaryTheme(isDark)

  const title = getLocalizedTitle(term, safeLang)
  const altTitle = getAltTitle(term, safeLang)
  const definition = getLocalizedDef(term, safeLang)
  const example = getLocalizedEx(term, safeLang)

  const cat = term.category ?? 'other'
  const catMeta = CATEGORY_META[cat]
  const catPill = isDark ? catMeta.pillDark : catMeta.pillLight
  const catDot = isDark ? catMeta.dotDark : catMeta.dotLight
  const numStr = String(catalogNumber ?? index + 1).padStart(3, '0')

  const handleFlip = () => {
    haptic('light')
    setFlipped((prev) => !prev)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleFlip()
    }
  }

  const stopEvent = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleFlip}
      onKeyDown={handleKeyDown}
      aria-expanded={flipped}
      aria-label={title}
      className="group relative w-full h-[238px] sm:h-[252px] text-left outline-none cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#C9A86A] rounded-[24px]"
      style={{ perspective: '1400px', WebkitPerspective: '1400px' }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
          transition: 'transform 0.56s cubic-bezier(0.22, 1, 0.36, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          WebkitTransform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ================= FRONT ================= */}
        <div
          className={`absolute inset-0 flex flex-col justify-between p-5 rounded-[24px] border transition-all duration-250 ${theme.bgCard} ${theme.textPrimary} ${theme.hairline} ${theme.hairlineHover} ${theme.cardShadow} group-active:scale-[0.99]`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(0deg) translateZ(0)',
            WebkitTransform: 'rotateY(0deg) translateZ(0)',
            zIndex: flipped ? 1 : 2,
            pointerEvents: flipped ? 'none' : 'auto',
          }}
        >
          {/* Верхняя строка: категория + индекс/замок */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium border ${catPill}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: catDot }}
              />
              <span className="truncate max-w-[140px]">{catMeta[safeLang]}</span>
            </span>

            {isLocked ? (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold tracking-wider uppercase ${theme.bgSurfaceSoft} ${theme.accentText}`}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {t.lockedBadge}
              </span>
            ) : (
              <span className={`font-mono text-[11px] tabular-nums ${theme.textTertiary}`}>
                #{numStr}
              </span>
            )}
          </div>

          {/* Центральный блок: термин — главный объект */}
          <div className="my-auto py-2 min-w-0">
            <h3 className="font-serif text-[22px] sm:text-[23px] font-normal leading-[1.18] tracking-[-0.015em] line-clamp-2">
              {title}
            </h3>

            {altTitle && altTitle !== title && (
              <p className={`mt-1 text-[12.5px] font-sans truncate ${theme.textTertiary}`}>
                {altTitle}
              </p>
            )}

            {isLocked ? (
              <p className={`mt-3 text-[12.5px] font-sans leading-relaxed line-clamp-2 ${theme.textTertiary}`}>
                {t.paywallDesc}
              </p>
            ) : (
              <p className={`mt-3 text-[13px] font-sans leading-[1.5] line-clamp-2 ${theme.textSecondary}`}>
                {definition}
              </p>
            )}
          </div>

          {/* Нижняя панель взаимодействий */}
          <div className={`flex items-center justify-between pt-3 border-t ${theme.hairline}`}>
            <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-sans font-medium ${theme.textSecondary}`}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-300 group-hover:rotate-180"
                style={{ color: theme.accentHex }}
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
              <span>{flipHint || t.flipHint}</span>
            </span>

            {!isLocked && onOpenDossier ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  haptic('light')
                  onOpenDossier(term)
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium transition-colors cursor-pointer ${theme.bgSurface} ${theme.textPrimary} hover:opacity-85`}
              >
                <span>{t.openDossier}</span>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 17 17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </button>
            ) : (
              <span className={`text-[11px] font-sans font-semibold ${theme.accentText}`}>
                1 ★
              </span>
            )}
          </div>
        </div>

        {/* ================= BACK ================= */}
        <div
          className={`absolute inset-0 flex flex-col justify-between p-5 rounded-[24px] border ${theme.bgCardStatic} ${theme.textPrimary} ${
            isDark ? 'border-[#C9A86A]/28' : 'border-[#9A6B2F]/28'
          } ${theme.cardShadow}`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg) translateZ(0)',
            WebkitTransform: 'rotateY(180deg) translateZ(0)',
            zIndex: flipped ? 2 : 1,
            pointerEvents: flipped ? 'auto' : 'none',
          }}
        >
          {isLocked ? (
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-sans font-semibold uppercase tracking-[0.12em] ${theme.accentText}`}>
                  {t.paywallBadge}
                </span>
                <span className={`font-mono text-[11px] ${theme.textTertiary}`}>#{numStr}</span>
              </div>

              <div className="my-auto py-2">
                <h4 className="font-serif text-[20px] leading-snug mb-1.5 line-clamp-2">
                  {title}
                </h4>
                <p className={`text-[12.5px] font-sans leading-relaxed ${theme.textSecondary}`}>
                  {t.paywallDesc}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onUnlock?.(e)
                }}
                disabled={isPurchasing}
                className={`w-full min-h-[42px] py-2.5 px-4 rounded-2xl text-[11.5px] font-sans font-semibold uppercase tracking-[0.1em] transition-transform active:scale-[0.98] cursor-pointer ${theme.activeInvert}`}
              >
                {isPurchasing ? '...' : t.paywallBtn}
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full justify-between min-h-0">
              <div className="flex items-center justify-between gap-2 pb-2.5 shrink-0">
                <span className={`font-serif text-[16px] font-medium truncate ${theme.textPrimary}`}>
                  {title}
                </span>
                <span className={`text-[11px] font-sans shrink-0 ${theme.textTertiary}`}>
                  {t.flipBack} ↻
                </span>
              </div>

              <div
                className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain pr-0.5 space-y-2.5"
                onClick={stopEvent}
                onPointerDown={stopEvent}
                onTouchStart={stopEvent}
                onWheel={stopEvent}
              >
                <p className={`text-[13px] font-sans leading-[1.58] ${theme.textSecondary}`}>
                  {definition}
                </p>
                {example && (
                  <div
                    className={`p-2.5 rounded-xl border-l-2 ${theme.bgSurface}`}
                    style={{ borderLeftColor: theme.accentHex }}
                  >
                    <p className={`font-serif italic text-[12.5px] leading-[1.45] ${theme.textPrimary}`}>
                      «{example}»
                    </p>
                  </div>
                )}
              </div>

              {onOpenDossier && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    haptic('light')
                    onOpenDossier(term)
                  }}
                  className={`mt-3 w-full py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-[11.5px] font-sans font-medium transition-colors cursor-pointer ${theme.bgSurface} ${theme.textPrimary} hover:opacity-90 shrink-0`}
                >
                  <span>{t.openDossier}</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: theme.accentHex }}
                  >
                    <path d="M7 17 17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
