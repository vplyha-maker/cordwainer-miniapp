import React from 'react'

type Props = {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  unit?: string
  disabled?: boolean
  onHaptic?: () => void
}

export function HeelStepper({
  label, value, min, max, onChange, unit = '', disabled = false, onHaptic,
}: Props) {
  const bump = (dir: 1 | -1) => {
    const next = value + dir
    if (disabled || next < min || next > max) return
    onHaptic?.()
    onChange(next)
  }

  return (
    <div
      className={`bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm rounded-[16px] px-3 py-2.5 flex flex-col transition-colors ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      }`}
    >
      <span className="text-[var(--color-muted)] text-[10px] font-bold mb-1.5 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center justify-between gap-1">
        <button
          onClick={() => bump(-1)}
          disabled={disabled || value <= min}
          className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] active:scale-95 transition-transform disabled:opacity-30 text-[var(--color-ink)]"
          aria-label="Decrease"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
          </svg>
        </button>
        <div className="flex items-baseline font-bold text-[16px] text-[var(--color-ink)] tabular-nums">
          {value}
          {unit ? <span className="text-[11px] text-[var(--color-muted)] font-bold ml-1">{unit}</span> : null}
        </div>
        <button
          onClick={() => bump(1)}
          disabled={disabled || value >= max}
          className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] active:scale-95 transition-transform disabled:opacity-30 text-[var(--color-ink)]"
          aria-label="Increase"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  )
}
