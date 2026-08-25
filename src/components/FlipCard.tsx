import { useState } from 'react'
import type { GlossaryTerm } from '../data/glossary'
import type { Lang } from '../App'

type FlipCardProps = {
  term: GlossaryTerm
  lang: Lang
  index?: number
}

const CATEGORY_ICON: Record<NonNullable<GlossaryTerm['category']>, React.ReactNode> = {
  material: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 4C8.5 4 6 5 5 7.5C4 10 4.5 12 4.5 12C4.5 12 2.5 14 3.5 17C4.5 20 7 19.5 7 19.5C7 19.5 9 18 12 18C15 18 17 19.5 17 19.5C17 19.5 19.5 20 20.5 17C21.5 14 19.5 12 19.5 12C19.5 12 20 10 19 7.5C18 5 15.5 4 15.5 4C15.5 4 14 5.5 12 5.5C10 5.5 8.5 4 8.5 4Z" />
    </svg>
  ),
  part: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 18L3 18C3 18 1.5 17.5 1.5 16.5C1.5 15 3 14 4 14L6.5 13L8.5 8.5C9 7.5 10 7 11.5 7L15 7C16 7 16.5 8 16 9L14 11.5L17 12C19 12.5 21 14 21 16Z" />
      <path d="M21 18L21 16L19 16L19 18Z" />
    </svg>
  ),
  process: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
  tool: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  type: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  ),
  defect: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
  other: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
    </svg>
  ),
}

const CATEGORY_COLOR: Record<NonNullable<GlossaryTerm['category']>, string> = {
  material: 'var(--color-accent,#E4D00A)',
  part: 'var(--pigment-azurite,#007FFF)',
  process: 'var(--pigment-malachite,#0BDA51)',
  tool: 'var(--pigment-egyptian-blue,#1034A6)',
  type: 'var(--pigment-lac-dye,#8B0000)',
  defect: '#c45c26',
  other: 'var(--color-muted,#B9ACA0)',
}

export function FlipCard({ term, lang, index = 0 }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false)

  const title = lang === 'uk' && term.termUk ? term.termUk : term.term
  const definition = lang === 'uk' && term.definitionUk ? term.definitionUk : term.definition
  const example = lang === 'uk' && term.exampleUk ? term.exampleUk : term.example
  const cat = term.category ?? 'other'
  const accent = CATEGORY_COLOR[cat]
  const icon = CATEGORY_ICON[cat]

  const hint = lang === 'uk' ? 'Натисніть, щоб перевернути' : 'Нажмите, чтобы перевернуть'
  const backHint = lang === 'uk' ? 'Натисніть, щоб повернути' : 'Нажмите, чтобы вернуть'

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className="group relative w-full aspect-[3/4] min-h-[200px] max-h-[280px] perspective-[1000px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent,#E4D00A)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg,#1C1816)] rounded-[18px]"
      style={{
        animationDelay: `${Math.min(index * 40, 400)}ms`,
      }}
      aria-label={`${title}. ${flipped ? backHint : hint}`}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.4,0.0,0.2,1)] preserve-3d ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 rounded-[18px] bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] shadow-sm flex flex-col items-center justify-center p-4 backface-hidden overflow-hidden"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <div
            className="absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-serif font-medium"
            style={{
              background: `color-mix(in srgb, ${accent} 18%, transparent)`,
              color: accent,
            }}
          >
            {term.letter}
          </div>

          <div
            className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105"
            style={{
              background: `color-mix(in srgb, ${accent} 15%, transparent)`,
              color: accent,
            }}
          >
            {icon}
          </div>

          <h3 className="text-[15px] md:text-[16px] font-medium text-center leading-snug text-[var(--color-ink,#F5F1EA)] px-1 break-words">
            {title}
          </h3>

          <p className="mt-3 text-[10px] text-[var(--color-muted,#B9ACA0)] opacity-60 group-hover:opacity-100 transition-opacity">
            {hint}
          </p>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-[18px] bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] shadow-sm flex flex-col p-4 backface-hidden overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="flex items-start gap-2 mb-2 shrink-0">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
              style={{
                background: `color-mix(in srgb, ${accent} 15%, transparent)`,
                color: accent,
              }}
            >
              {icon}
            </div>
            <h3 className="text-[13px] font-medium leading-snug text-[var(--color-ink,#F5F1EA)] pt-1 break-words">
              {title}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 pr-0.5">
            <p className="text-[12px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/85">
              {definition}
            </p>
            {example && (
              <p
                className="mt-2 text-[11px] leading-relaxed italic text-[var(--color-muted,#B9ACA0)] border-l-2 pl-2"
                style={{ borderColor: accent }}
              >
                {example}
              </p>
            )}
          </div>

          <p className="mt-2 text-[10px] text-[var(--color-muted,#B9ACA0)] opacity-50 shrink-0 text-center">
            {backHint}
          </p>
        </div>
      </div>
    </button>
  )
 }
