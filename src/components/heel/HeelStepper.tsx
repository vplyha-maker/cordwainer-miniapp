// src/components/heel/HeelStepper.tsx
import React from 'react'

type Props = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  unit?: string
  showPlusSign?: boolean
  disabled?: boolean
  isDark?: boolean
  onHaptic?: () => void
}

export function HeelStepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = '',
  showPlusSign = false,
  disabled = false,
  isDark = true,
  onHaptic,
}: Props) {
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'

  const bump = (dir: 1 | -1) => {
    const next = parseFloat((value + dir * step).toFixed(2))
    if (disabled || next < min || next > max) return
    onHaptic?.()
    onChange(next)
  }

  const formattedValue =
    (showPlusSign || label.includes('Пронация') || label.includes('Pronation')) && value > 0
      ? `+${value}`
      : `${value}`

  return (
    <div
      className={`flex flex-col border ${cLine} rounded-[14px] p-3.5 bg-[var(--color-surface)] justify-between shadow-[0_4px_20px_rgb(0,0,0,0.02)] transition-colors ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      }`}
    >
      <span
        className={`text-[8px] uppercase tracking-[0.22em] mb-2 ${cTextMuted} truncate pr-1 font-mono`}
      >
        {label}
      </span>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={disabled || value <= min}
          className={`w-7 h-7 flex items-center justify-center rounded-[8px] bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] text-base leading-none outline-none cursor-pointer touch-manipulation transition-transform ${
            disabled || value <= min
              ? 'opacity-20 cursor-not-allowed'
              : `active:scale-95 ${cText}`
          }`}
          aria-label="Decrease"
        >
          −
        </button>

        <div className={`flex items-baseline font-serif text-2xl tabular-nums ${cText}`}>
          {formattedValue}
          {unit ? (
            <span className="font-sans text-[9px] ml-0.5 opacity-60">{unit}</span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => bump(1)}
          disabled={disabled || value >= max}
          className={`w-7 h-7 flex items-center justify-center rounded-[8px] bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] text-base leading-none outline-none cursor-pointer touch-manipulation transition-transform ${
            disabled || value >= max
              ? 'opacity-20 cursor-not-allowed'
              : `active:scale-95 ${cText}`
          }`}
          aria-label="Increase"
        >
          +
        </button>
      </div>
    </div>
  )
}
