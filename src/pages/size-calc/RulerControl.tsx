import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { MeasureMode } from '../../lib/shoeSizes'
import type { TranslationBundle } from '../../lib/sizeCalcI18n'
import {
  SLIDER_HAPTIC_THROTTLE_MS,
  safeHapticImpact,
  safeHapticSelection,
} from './haptics'
import { RULER_TICKS, type UnitMode } from './types'

export type RulerControlProps = {
  footMm: number
  onChangeFootMm: React.Dispatch<React.SetStateAction<number>>
  measureMode: MeasureMode
  onChangeMeasureMode: (mode: MeasureMode) => void
  unit: UnitMode
  onChangeUnit: (unit: UnitMode) => void
  range: { readonly min: number; readonly max: number }
  insoleMm: number
  allowanceMm: number
  insoleAddMm: number
  t: TranslationBundle
  isDark: boolean
  bgSurface: string
  bgSurfaceSoft: string
  textPrimary: string
  textSecondary: string
  textTertiary: string
  hairline: string
  accentHex: string
  trackIdleHex: string
  activeInvert: string
}

export function RulerControl({
  footMm,
  onChangeFootMm,
  measureMode,
  onChangeMeasureMode,
  unit,
  onChangeUnit,
  range,
  insoleMm,
  allowanceMm,
  insoleAddMm,
  t,
  isDark,
  bgSurface,
  bgSurfaceSoft,
  textPrimary,
  textSecondary,
  textTertiary,
  hairline,
  accentHex,
  trackIdleHex,
  activeInvert,
}: RulerControlProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [isDraggingSlider, setIsDraggingSlider] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const lastHapticMmRef = useRef<number>(footMm)
  const lastHapticTsRef = useRef<number>(0)
  const holdTimerRef = useRef<number | null>(null)
  const holdIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    lastHapticMmRef.current = footMm
  }, [footMm])

  const currentActiveMm = measureMode === 'foot' ? footMm : insoleMm
  const sliderMin = measureMode === 'foot' ? range.min : range.min + insoleAddMm
  const sliderMax = measureMode === 'foot' ? range.max : range.max + insoleAddMm
  const sliderMid = Math.round((sliderMin + sliderMax) / 2)

  const displayValue =
    unit === 'cm'
      ? (currentActiveMm / 10).toFixed(1).replace('.', ',')
      : String(Math.round(currentActiveMm))

  const pct = Math.min(100, Math.max(0, ((footMm - range.min) / (range.max - range.min)) * 100))

  const formatScaleMark = (mm: number) =>
    unit === 'cm' ? (mm / 10).toFixed(1).replace('.', ',') : String(mm)

  const startEdit = () => {
    safeHapticImpact('light')
    setEditValue(
      unit === 'cm' ? (currentActiveMm / 10).toFixed(1) : String(Math.round(currentActiveMm))
    )
    setIsEditing(true)
  }

  const commitEdit = () => {
    const raw = parseFloat(editValue.replace(',', '.'))
    if (!isNaN(raw)) {
      const inputMm = Math.round(unit === 'cm' ? raw * 10 : raw)
      const targetFootMm = measureMode === 'foot' ? inputMm : inputMm - allowanceMm
      const clamped = Math.min(range.max, Math.max(range.min, targetFootMm))
      onChangeFootMm(clamped)
      lastHapticMmRef.current = clamped
      safeHapticImpact('medium')
    }
    setIsEditing(false)
  }

  const applyStep = useCallback(
    (delta: number) => {
      onChangeFootMm((prev) => {
        const next = Math.min(range.max, Math.max(range.min, prev + delta))
        if (next !== prev) {
          lastHapticMmRef.current = next
          safeHapticSelection()
        }
        return next
      })
    },
    [onChangeFootMm, range.max, range.min]
  )

  const stopHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
  }, [])

  const startHold = useCallback(
    (delta: number, e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      stopHold()
      safeHapticImpact('light')
      onChangeFootMm((prev) => {
        const next = Math.min(range.max, Math.max(range.min, prev + delta))
        lastHapticMmRef.current = next
        return next
      })
      holdTimerRef.current = window.setTimeout(() => {
        holdIntervalRef.current = window.setInterval(() => {
          applyStep(delta)
        }, 75)
      }, 300)
    },
    [applyStep, onChangeFootMm, range.max, range.min, stopHold]
  )

  useEffect(() => {
    return () => stopHold()
  }, [stopHold])

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = Number(e.target.value)
    const nextFootMm =
      measureMode === 'foot'
        ? rawVal
        : Math.min(range.max, Math.max(range.min, rawVal - allowanceMm))
    onChangeFootMm(nextFootMm)
    if (nextFootMm !== lastHapticMmRef.current) {
      lastHapticMmRef.current = nextFootMm
      const now = Date.now()
      if (now - lastHapticTsRef.current >= SLIDER_HAPTIC_THROTTLE_MS) {
        lastHapticTsRef.current = now
        safeHapticSelection()
      }
    }
  }

  return (
    <section className={`rounded-3xl p-4 sm:p-5 transition-colors duration-300 ${bgSurface}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className={`inline-flex items-center p-0.5 rounded-full ${bgSurfaceSoft} min-w-0`}>
          {(['foot', 'insole'] as const).map((m) => {
            const active = measureMode === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  safeHapticImpact('medium')
                  onChangeMeasureMode(m)
                }}
                className={`px-3 sm:px-3.5 py-1.5 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.05em] whitespace-nowrap transition-all cursor-pointer ${
                  active ? activeInvert : textSecondary
                }`}
              >
                {m === 'foot' ? t.modeFoot : t.modeInsole}
              </button>
            )
          })}
        </div>

        <div className={`inline-flex items-center p-0.5 rounded-full ${bgSurfaceSoft} shrink-0`}>
          {(['cm', 'mm'] as const).map((u) => {
            const active = unit === u
            return (
              <button
                key={u}
                type="button"
                onClick={() => {
                  safeHapticImpact('light')
                  onChangeUnit(u)
                }}
                className={`px-3 py-1.5 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.06em] whitespace-nowrap transition-all cursor-pointer ${
                  active ? activeInvert : textSecondary
                }`}
              >
                {u === 'cm' ? t.cmLabel : t.mmLabel}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-5">
        <button
          type="button"
          onPointerDown={(e) => startHold(-1, e)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          disabled={footMm <= range.min}
          aria-label="Decrease"
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full ${bgSurfaceSoft} ${textPrimary} flex items-center justify-center disabled:opacity-25 cursor-pointer shrink-0 active:scale-90 transition-transform`}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <div onClick={startEdit} className="flex flex-col items-center cursor-pointer min-w-0">
          <span className={`text-[11px] font-sans font-medium uppercase tracking-[0.16em] ${textSecondary}`}>
            {measureMode === 'foot' ? t.footLengthLabel : t.insoleInputLabel}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                onBlur={commitEdit}
                onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                className={`w-[116px] text-center text-[40px] sm:text-[46px] font-serif leading-none bg-transparent outline-none border-b ${hairline} ${textPrimary}`}
                inputMode="decimal"
              />
            ) : (
              <span className="text-[42px] sm:text-[48px] font-serif leading-none tracking-tight tabular-nums">
                {displayValue}
              </span>
            )}
            <span className={`text-xs sm:text-sm font-sans font-medium uppercase ${textSecondary}`}>
              {unit === 'cm' ? t.cmLabel : t.mmLabel}
            </span>
          </div>
        </div>

        <button
          type="button"
          onPointerDown={(e) => startHold(1, e)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          disabled={footMm >= range.max}
          aria-label="Increase"
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full ${bgSurfaceSoft} ${textPrimary} flex items-center justify-center disabled:opacity-25 cursor-pointer shrink-0 active:scale-90 transition-transform`}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="relative w-full pt-1 pb-0.5">
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={1}
          value={currentActiveMm}
          onChange={handleSliderChange}
          onPointerDown={() => {
            setIsDraggingSlider(true)
            safeHapticImpact('light')
          }}
          onPointerUp={() => {
            setIsDraggingSlider(false)
            safeHapticImpact('light')
          }}
          onPointerCancel={() => setIsDraggingSlider(false)}
          className="w-full h-14 absolute inset-x-0 -top-1 z-30 opacity-0 cursor-pointer touch-pan-y"
        />

        <div className="relative mx-3.5 h-11 flex items-end justify-between pb-2 pointer-events-none">
          <div
            className="absolute inset-x-0 bottom-2 h-[2px] rounded-full"
            style={{ backgroundColor: trackIdleHex }}
          />

          <div
            className="absolute left-0 bottom-2 h-[2.5px] rounded-full transition-all duration-75"
            style={{
              width: `${pct}%`,
              backgroundColor: accentHex,
            }}
          />

          {Array.from({ length: RULER_TICKS }).map((_, idx) => {
            const tickPct = (idx / (RULER_TICKS - 1)) * 100
            const dist = Math.abs(tickPct - pct)
            const isMajor = idx === 0 || idx === 15 || idx === RULER_TICKS - 1
            const isMid = idx % 5 === 0
            const isActiveRegion = tickPct <= pct + 1.5
            const isNearThumb = dist < 4
            const tickHeight = isMajor ? 18 : isMid ? 12 : 7
            const tickWidth = isMajor ? 2 : isMid ? 1.5 : 1

            return (
              <div
                key={idx}
                className="relative z-10 rounded-full transition-colors duration-75"
                style={{
                  width: `${tickWidth}px`,
                  height: `${isNearThumb ? tickHeight + 3 : tickHeight}px`,
                  backgroundColor: isNearThumb || isActiveRegion ? accentHex : trackIdleHex,
                  opacity: isNearThumb ? 1 : isActiveRegion ? 0.88 : isMajor ? 0.85 : isMid ? 0.65 : 0.45,
                }}
              />
            )
          })}

          <div
            className="absolute bottom-2 z-20 pointer-events-none transition-transform duration-100"
            style={{
              left: `${pct}%`,
              transform: `translate(-50%, 50%) scale(${isDraggingSlider ? 1.14 : 1})`,
            }}
          >
            <div className="relative flex items-center justify-center">
              <div
                className="absolute bottom-full mb-0.5 w-[2px] h-4 rounded-full"
                style={{ backgroundColor: accentHex }}
              />
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shadow-sm"
                style={{
                  backgroundColor: isDark ? '#0B0B0C' : '#F7F4EE',
                  border: `2px solid ${accentHex}`,
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: accentHex }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-3 items-center text-[11px] font-sans font-medium tabular-nums mt-2 px-1 ${textTertiary}`}>
          <span className="text-left">
            {formatScaleMark(sliderMin)} {unit === 'cm' ? t.cmLabel : t.mmLabel}
          </span>
          <span className="text-center">{formatScaleMark(sliderMid)}</span>
          <span className="text-right">
            {formatScaleMark(sliderMax)} {unit === 'cm' ? t.cmLabel : t.mmLabel}
          </span>
        </div>
      </div>
    </section>
  )
}

