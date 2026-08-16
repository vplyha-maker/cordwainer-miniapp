// src/components/heel/HeelStepper.tsx
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
      className={`bg-[#1C1816] border border-white/5 rounded-xl px-2 py-1.5 flex flex-col ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      }`}
    >
      <span className="text-[#A3988E] text-[9px] font-medium mb-1 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center justify-between gap-0.5">
        <button
          onClick={() => bump(-1)}
          disabled={disabled || value <= min}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 active:bg-white/10 disabled:opacity-30"
        >
          <span className="text-lg leading-none">−</span>
        </button>
        <div className="flex items-baseline font-bold text-[14px] text-[#F3EFEA]">
          {value}
          {unit ? <span className="text-[9px] text-[#A3988E] ml-0.5">{unit}</span> : null}
        </div>
        <button
          onClick={() => bump(1)}
          disabled={disabled || value >= max}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 active:bg-white/10 disabled:opacity-30"
        >
          <span className="text-lg leading-none">+</span>
        </button>
      </div>
    </div>
  )
}
