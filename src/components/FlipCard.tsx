import { useState } from 'react'
import type { GlossaryTerm } from '../data/glossary'
import type { Lang } from '../App'

type FlipCardProps = {
  term: GlossaryTerm
  lang: Lang
  index?: number
  isDark?: boolean
  flipHint?: string
  isLocked?: boolean
  onUnlock?: (e: React.MouseEvent) => void
  isPurchasing?: boolean
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

function haptic(style: 'light' | 'medium' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
  } catch {}
}

export function FlipCard({ term, lang, isDark = true, flipHint = 'FLIP', isLocked = false, onUnlock, isPurchasing = false }: FlipCardProps) {
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

  // Lookbook цветовая палитра
  const cSurface = isDark ? 'bg-[#141414] border-white/10' : 'bg-[#EAE6DF] border-black/10'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/40' : 'text-[#1C1816]/40'

  const stopEvent = (e: React.SyntheticEvent) => e.stopPropagation()

  const paywallText = {
    ru: { desc: 'Архив закрыт', btn: 'ОТКРЫТЬ • 1 ⭐️' },
    uk: { desc: 'Архів закритий', btn: 'ВІДКРИТИ • 1 ⭐️' },
    de: { desc: 'Archiv gesperrt', btn: 'ÖFFNEN • 1 ⭐️' }
  }[lang]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { haptic('light'); setFlipped((f) => !f) }}
      aria-expanded={flipped}
      className="group relative w-full aspect-[3/4] min-h-[240px] text-left outline-none cursor-pointer"
      style={{ perspective: '1400px', WebkitPerspective: '1400px' }}
    >
      <div
        className="relative w-full h-full transition-transform duration-700"
        style={{
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT */}
        <div
          className={`absolute inset-0 flex flex-col justify-between p-5 md:p-6 border ${cSurface} transition-all duration-300 group-hover:border-opacity-40`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            zIndex: 2,
            pointerEvents: flipped ? 'none' : 'auto',
          }}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[8px] font-sans uppercase tracking-[0.25em] ${cTextMuted}`}>
              {CATEGORY_LABELS[cat][lang]}
            </span>
            {isLocked && (
              <span className={`text-[9px] font-sans uppercase tracking-widest ${cTextMuted}`}>
                ✦ PRO
              </span>
            )}
          </div>

          {/* Большая инициал-буква на фоне в стиле редакционного глянца */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-[120px] leading-none opacity-[0.03] select-none pointer-events-none ${cText}`}>
            {title.charAt(0).toUpperCase()}
          </div>

          <div className="flex flex-col justify-end z-10">
            <h3 className={`font-serif text-[18px] md:text-[20px] leading-[1.1] tracking-tight mb-4 ${cText}`}>
              {title}
            </h3>
            <div className={`text-[7.5px] font-sans uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${cTextMuted}`}>
              {flipHint}
            </div>
          </div>
        </div>

        {/* BACK */}
        <div
          className={`absolute inset-0 flex flex-col justify-between p-5 md:p-6 border ${cSurface}`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            zIndex: 1,
            pointerEvents: flipped ? 'auto' : 'none',
          }}
        >
          {isLocked ? (
            <div className="flex flex-col h-full justify-between items-center text-center py-2">
              <div className="flex flex-col items-center justify-center flex-1 gap-2">
                <span className={`text-[10px] uppercase tracking-[0.2em] ${cTextMuted}`}>
                  {paywallText.desc}
                </span>
                <h3 className={`font-serif text-[16px] leading-snug line-clamp-2 ${cText}`}>
                  {title}
                </h3>
              </div>
              <button
                onClick={onUnlock}
                disabled={isPurchasing}
                className={`w-full py-3 border ${cText === 'text-[#F4F0E8]' ? 'border-white/20 hover:bg-white/10' : 'border-black/20 hover:bg-black/10'} ${cText} text-[9px] font-sans uppercase tracking-[0.2em] transition-all active:scale-[0.98] outline-none bg-transparent`}
              >
                {isPurchasing ? 'Processing...' : paywallText.btn}
              </button>
            </div>
          ) : (
            <div 
              className="flex flex-col h-full justify-between overflow-y-auto scrollbar-hide"
              onClick={stopEvent}
              onPointerDown={stopEvent}
              onTouchStart={stopEvent}
            >
              <div>
                <div className={`text-[8px] font-sans uppercase tracking-[0.25em] mb-3 pb-2 border-b ${cText === 'text-[#F4F0E8]' ? 'border-white/10' : 'border-black/10'} ${cTextMuted}`}>
                  {title}
                </div>
                <p className={`font-sans font-light text-[11px] md:text-[12px] leading-[1.6] ${cTextMuted}`}>
                  {definition}
                </p>
              </div>

              {example && (
                <div className={`mt-4 pt-3 border-t ${cText === 'text-[#F4F0E8]' ? 'border-white/10' : 'border-black/10'}`}>
                  <span className={`block text-[7px] font-sans uppercase tracking-[0.3em] mb-1 ${cText}`}>
                    {lang === 'de' ? 'Beispiel' : lang === 'uk' ? 'Приклад' : 'Пример'}
                  </span>
                  <p className={`font-serif text-[11px] italic leading-relaxed ${cTextMuted}`}>
                    {example}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
