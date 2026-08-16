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
      className={`bg-[#1C1816] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between transition-opacity duration-300 ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      }`}
    >
      <span className="text-[#A3988E] text-[10px] font-medium mb-1.5 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center justify-between gap-1">
        <button
          onClick={() => bump(-1)}
          disabled={disabled || value <= min}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 active:bg-white/10 active:scale-95 disabled:opacity-30"
        >
          <span className="text-xl font-medium leading-none mb-0.5">-</span>
        </button>
        <div className="flex items-baseline justify-center font-bold text-[15px] text-[#F3EFEA]">
          {value}
          <span className="text-[10px] text-[#A3988E] ml-0.5">{unit}</span>
        </div>
        <button
          onClick={() => bump(1)}
          disabled={disabled || value >= max}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 active:bg-white/10 active:scale-95 disabled:opacity-30"
        >
          <span className="text-xl font-medium leading-none mb-0.5">+</span>
        </button>
      </div>
    </div>
  )
}
