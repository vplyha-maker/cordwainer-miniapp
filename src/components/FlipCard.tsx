import { useState } from 'react'
import type { GlossaryTerm } from '../data/glossary'
import type { Lang } from '../App'

type FlipCardProps = {
  term: GlossaryTerm
  lang: Lang
  index?: number
  isDark?: boolean
  flipHint?: string
}

const CATEGORY_LABELS: Record<NonNullable<GlossaryTerm['category']>, { ru: string; uk: string; de: string }> = {
  material: { ru: 'Материалы', uk: 'Матеріали', de: 'Materialien' },
  part: { ru: 'Детали', uk: 'Деталі', de: 'Schuhteile' },
  process: { ru: 'Процессы', uk: 'Процеси', de: 'Verfahren' },
  tool: { ru: 'Инструменты', uk: 'Інструменти', de: 'Werkzeuge' },
  type: { ru: 'Виды', uk: 'Види', de: 'Arten' },
  defect: { ru: 'Дефекты', uk: 'Дефекти', de: 'Defekte' },
  other: { ru: 'Прочее', uk: 'Інше', de: 'Sonstiges' },
}

const CATEGORY_ICON: Record<NonNullable<GlossaryTerm['category']>, React.ReactNode> = {
  material: <path d="M9 3H15L17.5 5.5L21 7.5L19.5 12.5L20.5 17.5L15.5 21H8.5L3.5 17.5L4.5 12.5L3 7.5L6.5 5.5L9 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  part: <path d="M2.5 17.5C4 17.5 6 17 7.5 15L11.5 9.5C12.5 8.2 13.8 7.5 15.5 7.5H19.5C20.6 7.5 21.5 8.4 21.5 9.5V14.5C21.5 16.2 19.8 17.5 18 17.5H2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  process: <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  tool: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  type: <path d="M4 17.5V14c0-2.5 1.5-4.5 4-5.5l4-1.5L14 3h6v4.5c0 3.5-2.5 6-5 7.5L12 17.5H4.5A.5.5 0 0 1 4 17.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  defect: <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  other: <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
}

function haptic(style: 'light' | 'medium' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
  } catch {}
}

export function FlipCard({ term, lang, index = 0, isDark = true, flipHint = 'TAP TO READ' }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false)

  const title = lang === 'de' && (term as any).termDe ? (term as any).termDe 
              : lang === 'uk' && term.termUk ? term.termUk 
              : term.term
              
  const definition = lang === 'de' && (term as any).definitionDe ? (term as any).definitionDe 
                   : lang === 'uk' && term.definitionUk ? term.definitionUk 
                   : term.definition
                   
  const example = lang === 'de' && (term as any).exampleDe ? (term as any).exampleDe 
                : lang === 'uk' && term.exampleUk ? term.exampleUk 
                : term.example

  const cat = term.category ?? 'other'
  const icon = CATEGORY_ICON[cat]

  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cSurface = isDark ? 'bg-[#111111]' : 'bg-[#EAE6DF]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'

  const stopEvent = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { haptic('light'); setFlipped((f) => !f) }}
      aria-expanded={flipped}
      className="group relative w-full aspect-[3/4] min-h-[220px] max-h-[300px] text-left outline-none cursor-pointer"
      style={{ perspective: '1200px', WebkitPerspective: '1200px' }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
          transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          WebkitTransform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-between p-4 md:p-5 border ${cLine} ${cSurface} shadow-sm`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
            WebkitTransform: 'rotateY(0deg)',
            zIndex: 2,
            pointerEvents: flipped ? 'none' : 'auto',
          }}
        >
          <div className="w-full flex items-center justify-between z-10">
            <span className={`text-[8.5px] md:text-[9px] font-sans uppercase tracking-[0.15em] truncate pr-2 ${cTextMuted}`}>
              {CATEGORY_LABELS[cat][lang]}
            </span>
            <div className={`w-4 h-4 md:w-5 md:h-5 flex items-center justify-center shrink-0 ${cTextMuted}`}>
              <svg width="100%" height="100%" viewBox="0 0 24 24">
                {icon}
              </svg>
            </div>
          </div>

          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-[100px] md:text-[120px] leading-none opacity-5 pointer-events-none select-none ${cText}`}>
            {title.charAt(0).toUpperCase()}
          </div>

          <div className="w-full flex flex-col items-center text-center z-10 mt-auto px-1">
            <h3 className={`font-serif text-[17px] md:text-[20px] leading-[1.15] mb-3 break-words hyphens-auto w-full ${cText}`}>
              {title}
            </h3>
            <div className={`text-[8px] font-sans tracking-[0.25em] uppercase transition-opacity opacity-0 group-hover:opacity-100 ${cTextMuted}`}>
              {flipHint}
            </div>
          </div>
        </div>

        {/* BACK */}
        <div
          className={`absolute inset-0 flex flex-col p-4 md:p-5 border ${cLine} ${cSurface} shadow-sm`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            WebkitTransform: 'rotateY(180deg)',
            zIndex: 1,
            pointerEvents: flipped ? 'auto' : 'none',
          }}
        >
          <div className={`flex items-center justify-between pb-3 mb-3 border-b ${cLine} shrink-0`}>
            <h3 className={`font-serif text-[15px] md:text-[17px] leading-tight break-words pr-2 ${cText}`}>
              {title}
            </h3>
          </div>

          <div
            className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain pb-2"
            onClick={stopEvent}
            onPointerDown={stopEvent}
            onTouchStart={stopEvent}
            onWheel={stopEvent}
          >
            <p className={`text-[11px] min-[390px]:text-[12px] font-sans font-light leading-[1.6] ${cTextMuted}`}>
              {definition}
            </p>

            {example && (
              <div className={`mt-3 pt-3 border-t ${cLine}`}>
                <span className={`block mb-1 text-[7.5px] font-sans uppercase tracking-[0.25em] ${cText}`}>
                  {lang === 'de' ? 'BEISPIEL' : lang === 'uk' ? 'ПРИКЛАД' : 'ПРИМЕР'}
                </span>
                <p className={`font-serif text-[12px] md:text-[13px] italic leading-[1.4] ${cTextMuted}`}>
                  {example}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
