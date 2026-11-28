import { useEffect } from 'react'
import type { GlossaryTerm } from '../../data/glossary'
import {
  CATEGORY_META,
  GLOSSARY_I18N,
  getGlossaryTheme,
  getLocalizedDef,
  getLocalizedEx,
  getLocalizedTitle,
  haptic,
  type GlossaryLang,
} from './glossaryConfig'

type GlossaryDossierModalProps = {
  term: GlossaryTerm | null
  catalogNumber: number
  lang: GlossaryLang
  isDark: boolean
  onClose: () => void
}

export function GlossaryDossierModal({
  term,
  catalogNumber,
  lang,
  isDark,
  onClose,
}: GlossaryDossierModalProps) {
  useEffect(() => {
    if (!term) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [term, onClose])

  if (!term) return null

  const t = GLOSSARY_I18N[lang]
  const theme = getGlossaryTheme(isDark)
  const cat = term.category ?? 'other'
  const catMeta = CATEGORY_META[cat]
  const catPill = isDark ? catMeta.pillDark : catMeta.pillLight
  const catDot = isDark ? catMeta.dotDark : catMeta.dotLight
  const numStr = String(catalogNumber).padStart(3, '0')
  const example = getLocalizedEx(term, lang)

  const handleClose = () => {
    haptic('light')
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-term-title"
      onClick={handleClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 cw-backdrop-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-2xl max-h-[88dvh] flex flex-col rounded-t-[28px] sm:rounded-[28px] border-t sm:border overflow-hidden cw-sheet-in ${theme.bgCardStatic} ${theme.textPrimary} ${theme.hairline} shadow-2xl`}
      >
        {/* Мобильный индикатор свайпа/шторки */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-[#F4F0E8]/20' : 'bg-[#181715]/15'}`} />
        </div>

        {/* Верхняя панель чтения */}
        <div className={`px-5 sm:px-7 py-3.5 sm:py-4 flex items-center justify-between gap-3 border-b ${theme.hairline} shrink-0`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium border ${catPill}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: catDot }}
              />
              <span className="truncate">{catMeta[lang]}</span>
            </span>
            <span className={`font-mono text-[11px] tabular-nums ${theme.textTertiary}`}>
              #{numStr}
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label={t.closeLabel}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${theme.bgSurface} ${theme.textPrimary}`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Тело чтения с оптимальной шириной строки */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] space-y-6">
          <div>
            <h2
              id="dossier-term-title"
              className="font-serif text-[32px] sm:text-[40px] leading-[1.08] tracking-[-0.02em]"
            >
              {getLocalizedTitle(term, lang)}
            </h2>

            {/* Языковые эквиваленты */}
            <div className="mt-4">
              <span className={`block text-[10.5px] font-sans font-medium uppercase tracking-[0.14em] mb-2 ${theme.textTertiary}`}>
                {t.translationsLabel}
              </span>
              <div className="flex flex-wrap gap-2">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12.5px] font-sans ${theme.bgSurface}`}>
                  <span className={`text-[10px] font-semibold tracking-wider ${theme.accentText}`}>RU</span>
                  <span className={theme.textPrimary}>{term.term}</span>
                </div>
                {term.termUk && (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12.5px] font-sans ${theme.bgSurface}`}>
                    <span className={`text-[10px] font-semibold tracking-wider ${theme.accentText}`}>UA</span>
                    <span className={theme.textPrimary}>{term.termUk}</span>
                  </div>
                )}
                {term.termDe && (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12.5px] font-sans ${theme.bgSurface}`}>
                    <span className={`text-[10px] font-semibold tracking-wider ${theme.accentText}`}>DE</span>
                    <span className={theme.textPrimary}>{term.termDe}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Основное определение */}
          <div className={`pt-5 border-t ${theme.hairline}`}>
            <span className={`block text-[10.5px] font-sans font-medium uppercase tracking-[0.14em] mb-2.5 ${theme.textTertiary}`}>
              {t.definitionLabel}
            </span>
            <p className={`max-w-[60ch] font-sans text-[15px] sm:text-[16px] leading-[1.72] ${theme.textPrimary}`}>
              {getLocalizedDef(term, lang)}
            </p>
          </div>

          {/* Контекст и применение */}
          {example && (
            <div
              className={`p-4 sm:p-5 rounded-2xl border-l-[3px] ${theme.bgSurface}`}
              style={{ borderLeftColor: theme.accentHex }}
            >
              <span className={`block text-[10.5px] font-sans font-semibold uppercase tracking-[0.14em] mb-2 ${theme.accentText}`}>
                {t.exampleLabel}
              </span>
              <p className="font-serif italic text-[16px] sm:text-[17px] leading-[1.6]">
                «{example}»
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

