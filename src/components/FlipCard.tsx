import { useState } from 'react'
import type { GlossaryTerm } from '../data/glossary'
import type { Lang } from '../App'

type FlipCardProps = {
  term: GlossaryTerm
  lang: Lang
  index?: number
}

// Осучаснені векторні іконки з єдиною геометрією (24x24, stroke 1.75px, rounded)
const CATEGORY_ICON: Record<NonNullable<GlossaryTerm['category']>, React.ReactNode> = {
  material: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Контур шкіряного шматка / матеріалу */}
      <path d="M9 3H15L17.5 5.5L21 7.5L19.5 12.5L20.5 17.5L15.5 21H8.5L3.5 17.5L4.5 12.5L3 7.5L6.5 5.5L9 3Z" />
      <path d="M9 3v4.5c0 .8.7 1.5 1.5 1.5h7" opacity="0.6" />
    </svg>
  ),
  part: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Деталь взуття / силует підошви і союзки */}
      <path d="M2.5 17.5C4 17.5 6 17 7.5 15L11.5 9.5C12.5 8.2 13.8 7.5 15.5 7.5H19.5C20.6 7.5 21.5 8.4 21.5 9.5V14.5C21.5 16.2 19.8 17.5 18 17.5H2.5Z" />
      <path d="M7.5 15C10 15 12.5 13.5 14 11.5" opacity="0.6" />
    </svg>
  ),
  process: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Процес обробки / шестерня та іскра */}
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </svg>
  ),
  tool: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Взуттєвий ніж / резак */}
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      <path d="M7 17l2 2" opacity="0.7" />
    </svg>
  ),
  type: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Черевик / вид взуття */}
      <path d="M4 17.5V14c0-2.5 1.5-4.5 4-5.5l4-1.5L14 3h6v4.5c0 3.5-2.5 6-5 7.5L12 17.5H4.5A.5.5 0 0 1 4 17.5Z" />
      <path d="M14 3v4c0 1.5 1 2.5 2.5 2.5H20" opacity="0.6" />
    </svg>
  ),
  defect: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Дефект / Попередження */}
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  other: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Інформація / Довідник */}
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
}

const CATEGORY_COLOR: Record<NonNullable<GlossaryTerm['category']>, string> = {
  material: 'var(--color-accent, #E4D00A)',
  part: 'var(--pigment-azurite, #3B82F6)',
  process: 'var(--pigment-malachite, #10B981)',
  tool: 'var(--pigment-egyptian-blue, #6366F1)',
  type: 'var(--pigment-lac-dye, #EC4899)',
  defect: '#F97316',
  other: 'var(--color-muted, #9CA3AF)',
}

export function FlipCard({ term, lang, index = 0 }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false)

  const title = lang === 'uk' && term.termUk ? term.termUk : term.term
  const definition = lang === 'uk' && term.definitionUk ? term.definitionUk : term.definition
  const example = lang === 'uk' && term.exampleUk ? term.exampleUk : term.example
  const cat = term.category ?? 'other'
  const accent = CATEGORY_COLOR[cat]
  const icon = CATEGORY_ICON[cat]

  const hint = lang === 'uk' ? 'Натисніть, щоб відкрити' : 'Нажмите, чтобы открыть'
  const backHint = lang === 'uk' ? 'Натисніть, щоб згорнути' : 'Нажмите, чтобы свернуть'

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-expanded={flipped}
      aria-label={`${title}. ${flipped ? backHint : hint}`}
      className="group relative w-full aspect-[3/4] min-h-[220px] max-h-[300px] perspective-[1000px] text-left focus:outline-none rounded-[20px] select-none tap-highlight-transparent"
      style={{
        animationDelay: `${Math.min(index * 35, 350)}ms`,
      }}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] preserve-3d rounded-[20px] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* FRONT FACE */}
        <div
          className="absolute inset-0 rounded-[20px] bg-gradient-to-b from-[var(--color-surface,#25201C)] to-[var(--color-surface-dark,#1C1816)] border border-[var(--color-border,rgba(255,255,255,0.1))] group-hover:border-[var(--color-border-hover,rgba(255,255,255,0.22))] shadow-md group-hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-between p-5 backface-hidden overflow-hidden"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          {/* Ambient Glow Background */}
          <div
            className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-15 pointer-events-none group-hover:opacity-30 transition-opacity"
            style={{ background: accent }}
          />

          {/* Header Row: Letter Badge */}
          <div className="w-full flex items-center justify-between z-10">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold tracking-wider shadow-inner"
              style={{
                background: `color-mix(in srgb, ${accent} 20%, transparent)`,
                color: accent,
                border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
              }}
            >
              {term.letter}
            </span>
          </div>

          {/* Center Content: Icon & Title */}
          <div className="flex flex-col items-center text-center z-10 px-1 my-auto">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 shadow-lg"
              style={{
                background: `color-mix(in srgb, ${accent} 16%, transparent)`,
                color: accent,
                boxShadow: `0 8px 20px -6px color-mix(in srgb, ${accent} 25%, transparent)`,
              }}
            >
              {icon}
            </div>

            <h3 className="text-[16px] md:text-[17px] font-semibold tracking-tight leading-snug text-[var(--color-ink,#F5F1EA)] break-words">
              {title}
            </h3>
          </div>

          {/* Footer Hint */}
          <div className="z-10 flex items-center gap-1.5 text-[10px] font-medium tracking-wide uppercase text-[var(--color-muted,#B9ACA0)] opacity-60 group-hover:opacity-100 transition-opacity">
            <span>{hint}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            </svg>
          </div>
        </div>

        {/* BACK FACE */}
        <div
          className="absolute inset-0 rounded-[20px] bg-[var(--color-surface,#25201C)] border border-[color-mix(in_srgb,var(--color-accent,#E4D00A)_30%,rgba(255,255,255,0.1))] shadow-2xl flex flex-col p-4 backface-hidden overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 pb-2.5 mb-2.5 border-b border-white/10 shrink-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: `color-mix(in srgb, ${accent} 20%, transparent)`,
                color: accent,
              }}
            >
              {icon}
            </div>
            <h3 className="text-[14px] font-semibold leading-tight text-[var(--color-ink,#F5F1EA)] truncate">
              {title}
            </h3>
          </div>

          {/* Body Content with Scrollable Area */}
          <div 
            className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2.5 text-left custom-scrollbar"
            onClick={(e) => e.stopPropagation()} // Запобігає фліпу при кліку на текст/скрол
          >
            <p className="text-[13px] leading-relaxed font-normal text-[var(--color-ink,#F5F1EA)]/90 tracking-normal">
              {definition}
            </p>

            {example && (
              <div 
                className="p-2.5 rounded-xl text-[11px] leading-relaxed text-[var(--color-muted,#D1C7BD)] bg-black/25 border-l-2"
                style={{ borderColor: accent }}
              >
                <span className="font-semibold block mb-0.5 text-[10px] uppercase tracking-wider opacity-70" style={{ color: accent }}>
                  {lang === 'uk' ? 'Приклад:' : 'Пример:'}
                </span>
                {example}
              </div>
            )}
          </div>

          {/* Back Footer Hint */}
          <div className="pt-2 mt-auto border-t border-white/5 shrink-0 flex items-center justify-center gap-1 text-[10px] font-medium text-[var(--color-muted,#B9ACA0)] opacity-50">
            <span>{backHint}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
