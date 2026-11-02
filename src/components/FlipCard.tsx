import { useState } from 'react'
import type { GlossaryTerm } from '../data/glossary'
import type { Lang } from '../App'

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

const CATEGORY_LABELS: Record<
  NonNullable<GlossaryTerm['category']>,
  { ru: string; uk: string; de: string; code: string }
> = {
  material: { ru: 'Материалы', uk: 'Матеріали', de: 'Materialien', code: 'MAT.01' },
  part: { ru: 'Детали', uk: 'Деталі', de: 'Schuhteile', code: 'PRT.02' },
  process: { ru: 'Процессы', uk: 'Процеси', de: 'Verfahren', code: 'PRC.03' },
  tool: { ru: 'Инструменты', uk: 'Інструменти', de: 'Werkzeuge', code: 'TLS.04' },
  type: { ru: 'Виды', uk: 'Види', de: 'Arten', code: 'TYP.05' },
  defect: { ru: 'Дефекты', uk: 'Дефекти', de: 'Defekte', code: 'DFC.06' },
  other: { ru: 'Прочее', uk: 'Інше', de: 'Sonstiges', code: 'ARC.07' },
}

function haptic(style: 'light' | 'medium' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
  } catch {}
}

export function FlipCard({
  term,
  lang,
  index = 0,
  catalogNumber,
  isDark = true,
  flipHint = 'TURN',
  isLocked = false,
  onUnlock,
  isPurchasing = false,
  isFeatured = false,
  onOpenDossier,
}: FlipCardProps) {
  const [flipped, setFlipped] = useState(false)

  const title =
    lang === 'de' && (term as any).termDe
      ? (term as any).termDe
      : lang === 'uk' && term.termUk
      ? term.termUk
      : term.term

  // Второй язык для создания эффекта международного архива (DE / RU)
  const altTitle =
    lang === 'de'
      ? term.term
      : (term as any).termDe || (lang === 'ru' ? term.termUk : term.term)

  const definition =
    lang === 'de' && (term as any).definitionDe
      ? (term as any).definitionDe
      : lang === 'uk' && term.definitionUk
      ? term.definitionUk
      : term.definition

  const example =
    lang === 'de' && (term as any).exampleDe
      ? (term as any).exampleDe
      : lang === 'uk' && term.exampleUk
      ? term.exampleUk
      : term.example

  const cat = term.category ?? 'other'
  const numStr = String(catalogNumber ?? index + 1).padStart(3, '0')

  const paywallText = {
    ru: { badge: 'PRIVATE ARCHIVE', desc: 'Доступно в полном издании словаря', btn: 'ОТКРЫТЬ ДОСТУП • 1 ★' },
    uk: { badge: 'PRIVATE ARCHIVE', desc: 'Доступно у повному виданні словника', btn: 'ВІДКРИТИ ДОСТУП • 1 ★' },
    de: { badge: 'PRIVATE ARCHIVE', desc: 'Verfügbar in der Vollausgabe', btn: 'FREISCHALTEN • 1 ★' },
  }[lang]

  const expandLabel = {
    ru: 'ЧИТАТЬ ПОЛНОСТЬЮ ↗',
    uk: 'ЧИТАТИ ПОВНІСТЮ ↗',
    de: 'VOLLSTÄNDIG LESEN ↗',
  }[lang]

  const stopEvent = (e: React.SyntheticEvent) => e.stopPropagation()

  // Акцентная карточка-разворот (каждая 5-я в сетке) имеет инвертированную тему "Black Label"
  const useInvertedPalette = isFeatured
    ? !isDark
    : isDark

  const cSurface = useInvertedPalette
    ? 'bg-[#121110] text-[#F4EFE6] border-[#F4EFE6]/15'
    : 'bg-[#FAF8F5] text-[#141210] border-[#141210]/12'

  const cSurfaceBack = isDark
    ? 'bg-[#161412] text-[#F4EFE6] border-[#C5A880]/30'
    : 'bg-[#EFECE6] text-[#141210] border-[#141210]/25'

  const cMuted = useInvertedPalette ? 'text-[#F4EFE6]/45' : 'text-[#141210]/45'
  const cMutedBack = isDark ? 'text-[#F4EFE6]/65' : 'text-[#141210]/65'
  const cHairline = useInvertedPalette ? 'border-[#F4EFE6]/12' : 'border-[#141210]/10'
  const cHairlineBack = isDark ? 'border-[#F4EFE6]/12' : 'border-[#141210]/12'
  const cAccent = useInvertedPalette ? 'text-[#C5A880]' : 'text-[#8C6D46]'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        haptic('light')
        setFlipped((f) => !f)
      }}
      aria-expanded={flipped}
      className={`group relative w-full text-left outline-none cursor-pointer select-none ${
        isFeatured ? 'aspect-[16/10] min-h-[210px]' : 'aspect-[3/4.2] min-h-[250px]'
      }`}
      style={{ perspective: '1600px', WebkitPerspective: '1600px' }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
          transition: 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          WebkitTransform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ================= FRONT (ATELIER SPEC PLATE) ================= */}
        <div
          className={`absolute inset-0 flex flex-col justify-between p-4 md:p-6 border ${cSurface} transition-colors duration-300`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
            WebkitTransform: 'rotateY(0deg)',
            zIndex: 2,
            pointerEvents: flipped ? 'none' : 'auto',
          }}
        >
          {/* Архитектурные метки по углам в стиле лекал высокую моды */}
          <span className={`absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l ${cHairline}`} />
          <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 border-t border-r ${cHairline}`} />
          <span className={`absolute bottom-1.5 left-1.5 w-1.5 h-1.5 border-b border-l ${cHairline}`} />
          <span className={`absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r ${cHairline}`} />

          {/* ВЕРХНИЙ КОЛОНТИТУЛ БИРКИ */}
          <div className={`w-full flex items-center justify-between pb-2.5 border-b ${cHairline} z-10`}>
            <span className={`font-mono text-[9px] tracking-[0.2em] ${cAccent}`}>
              N° {numStr}
            </span>
            <span className={`text-[8px] font-sans uppercase tracking-[0.22em] truncate pl-2 ${cMuted}`}>
              {isLocked ? '🔒 PRO' : CATEGORY_LABELS[cat].code}
            </span>
          </div>

          {/* ЦЕНТРАЛЬНАЯ КОМПОЗИЦИЯ (ВОДЯНОЙ ЗНАК В СТИЛЕ VOGUE / MARGIELA) */}
          <div className="relative flex-1 flex items-center justify-between overflow-hidden my-1">
            <div
              className={`font-serif italic font-light leading-none select-none pointer-events-none transition-transform duration-700 group-hover:scale-105 ${
                isFeatured ? 'text-[88px] md:text-[110px] opacity-15' : 'text-[68px] opacity-[0.08]'
              }`}
            >
              {title.charAt(0).toUpperCase()}
              <span className="text-[0.4em] not-italic font-sans tracking-widest ml-1 opacity-60">
                /{numStr.slice(-2)}
              </span>
            </div>

            {isFeatured && !isLocked && (
              <p className={`hidden sm:block max-w-[52%] text-[11px] font-sans font-light leading-relaxed line-clamp-3 pl-4 border-l ${cHairline}${cMuted}`}>
                {definition}
              </p>
            )}
          </div>

          {/* НИЖНИЙ БЛОК: ЗАГОЛОВОК И МЕТАДАННЫЕ */}
          <div className="w-full z-10 mt-auto">
            <div className={`text-[7.5px] font-sans uppercase tracking-[0.28em] mb-1.5 ${cMuted}`}>
              {CATEGORY_LABELS[cat][lang]}
            </div>

            <h3
              className={`font-serif font-normal tracking-[-0.01em] leading-[1.12] break-words hyphens-auto ${
                isFeatured ? 'text-[22px] md:text-[26px]' : 'text-[16px] md:text-[18px]'
              }`}
            >
              {title}
            </h3>

            {altTitle && altTitle !== title && (
              <p className={`font-serif italic text-[11px] mt-1 truncate ${cMuted}`}>
                {altTitle}
              </p>
            )}

            <div className={`w-full flex items-center justify-between pt-2.5 mt-3 border-t ${cHairline}`}>
              <span className={`text-[7.5px] font-sans uppercase tracking-[0.28em] ${cMuted}`}>
                {isLocked ? 'LOCKED ENTRY' : flipHint}
              </span>
              <span className={`text-[10px] transition-transform duration-300 group-hover:translate-x-0.5 ${cAccent}`}>
                ↻
              </span>
            </div>
          </div>
        </div>

        {/* ================= BACK (EDITORIAL DOSSIER PREVIEW) ================= */}
        <div
          className={`absolute inset-0 flex flex-col justify-between p-4 md:p-6 border ${cSurfaceBack}`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            WebkitTransform: 'rotateY(180deg)',
            zIndex: 1,
            pointerEvents: flipped ? 'auto' : 'none',
          }}
        >
          {isLocked ? (
            /* ЗАКРЫТЫЙ АРХИВ (LUXURY PAYWALL) */
            <div className="flex flex-col h-full justify-between text-left">
              <div className={`flex items-center justify-between pb-2.5 border-b ${cHairlineBack}`}>
                <span className={`font-mono text-[8.5px] tracking-[0.2em] ${cAccent}`}>
                  N° {numStr} // VIP
                </span>
                <span className="text-[9px]">🔒</span>
              </div>

              <div className="my-auto py-2">
                <span className={`block text-[7.5px] font-sans uppercase tracking-[0.3em] mb-2 ${cAccent}`}>
                  {paywallText.badge}
                </span>
                <h4 className="font-serif text-[17px] leading-snug mb-2 line-clamp-2">
                  {title}
                </h4>
                <p className={`text-[10px] font-sans font-light leading-relaxed ${cMutedBack}`}>
                  {paywallText.desc}
                </p>
              </div>

              <button
                type="button"
                onClick={onUnlock}
                disabled={isPurchasing}
                className={`w-full py-2.5 px-3 text-[8.5px] font-sans uppercase tracking-[0.22em] transition-all active:scale-[0.98] cursor-pointer border ${
                  isDark
                    ? 'bg-[#F4EFE6] text-[#121110] border-[#F4EFE6] hover:bg-transparent hover:text-[#F4EFE6]'
                    : 'bg-[#141210] text-[#FAF8F5] border-[#141210] hover:bg-transparent hover:text-[#141210]'
                }`}
              >
                {isPurchasing ? '...' : paywallText.btn}
              </button>
            </div>
          ) : (
            /* ОТКРЫТАЯ КАРТОЧКА С ОПРЕДЕЛЕНИЕМ */
            <div className="flex flex-col h-full justify-between">
              <div className={`flex items-center justify-between pb-2 mb-2.5 border-b ${cHairlineBack} shrink-0`}>
                <span className={`font-mono text-[8.5px] tracking-[0.18em] ${cAccent}`}>
                  N° {numStr}
                </span>
                <span className={`text-[7.5px] font-sans uppercase tracking-[0.2em] ${cMutedBack}`}>
                  {CATEGORY_LABELS[cat][lang]}
                </span>
              </div>

              <div
                className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain pr-0.5"
                onClick={stopEvent}
                onPointerDown={stopEvent}
                onTouchStart={stopEvent}
                onWheel={stopEvent}
              >
                <h4 className="font-serif text-[14px] md:text-[16px] leading-snug mb-2">
                  {title}
                </h4>
                <p className={`text-[11px] md:text-[12px] font-sans font-light leading-[1.55] ${cMutedBack}`}> {definition} </p>  {example && ( <div className={`mt-3 pt-2.5 border-t ${cHairlineBack}`}>
                    <p className={`font-serif italic text-[11px] leading-[1.45] ${cMutedBack}`}>
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
                  className={`w-full pt-2.5 mt-2 border-t ${cHairlineBack} flex items-center justify-between text-[7.5px] font-sans uppercase tracking-[0.25em]${cAccent} bg-transparent border-x-0 border-b-0 cursor-pointer outline-none`}
                >
                  <span>{expandLabel}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
