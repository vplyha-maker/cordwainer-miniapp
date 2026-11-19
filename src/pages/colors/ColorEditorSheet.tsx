import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion'
import { hexToHsl, hslToHex, normalizeHex } from './colorEngine'
import type { TranslationDict } from './colorsTranslations'
import { hapticReset, hapticSwatch, hapticTap } from './haptics'
import type { CordwainerThemeTokens } from './themeSystem'

type EditorMode = 'hue' | 'tone' | 'saturation'

type EyeDropperInstance = {
  open: () => Promise<{ sRGBHex: string }>
}

type WindowWithEyeDropper = Window & {
  EyeDropper?: new () => EyeDropperInstance
}

export type ColorEditorSheetProps = {
  isOpen: boolean
  isDark: boolean
  tokens: CordwainerThemeTokens
  t: TranslationDict
  slotLabel: string
  slotRatio: string
  currentHex: string
  quickColors: string[]
  customQuickColors: string[]
  onLiveChangeHex: (hex: string) => void
  onResetSlot: () => void
  onClose: () => void
  onAddQuickColor: (hex: string) => void
  onRemoveQuickColor: (hex: string) => void
}

const SPECTRUM_GRADIENT =
  'linear-gradient(90deg, #E52B50 0%, #D72867 12%, #9B28D7 24%, #2B59FF 36%, #16B8F3 48%, #22D35B 62%, #B8E622 74%, #F7C924 85%, #F26B24 94%, #E52B50 100%)'

export function ColorEditorSheet({
  isOpen,
  isDark,
  tokens,
  t,
  slotLabel,
  slotRatio,
  currentHex,
  quickColors,
  customQuickColors,
  onLiveChangeHex,
  onResetSlot,
  onClose,
  onAddQuickColor,
  onRemoveQuickColor,
}: ColorEditorSheetProps) {
  const prefersReduced = useReducedMotion()
  const [mode, setMode] = useState<EditorMode>('hue')
  const [hexInput, setHexInput] = useState(currentHex.toUpperCase())
  const [copied, setCopied] = useState(false)
  const [eyedropperNotice, setEyedropperNotice] = useState<string | null>(null)
  const [manageQuickMode, setManageQuickMode] = useState(false)

  const trackRef = useRef<HTMLDivElement>(null)
  const isDraggingTrack = useRef(false)
  const lastHapticStep = useRef<number>(-1)

  const hsl = useMemo(() => hexToHsl(currentHex), [currentHex])

  useEffect(() => {
    setHexInput(currentHex.toUpperCase())
  }, [currentHex])

  useEffect(() => {
    if (!isOpen) {
      setEyedropperNotice(null)
      setManageQuickMode(false)
      return
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hapticTap()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const sliderPercent = useMemo(() => {
    if (mode === 'hue') return (hsl.h / 360) * 100
    if (mode === 'tone') return hsl.l
    return hsl.s
  }, [mode, hsl])

  const trackBackground = useMemo(() => {
    if (mode === 'hue') return SPECTRUM_GRADIENT
    const pureHue = hslToHex(hsl.h, Math.max(hsl.s, 45), 50)
    if (mode === 'tone') {
      return 'linear-gradient(90deg, #0D0D0F 0%, ' + pureHue + ' 50%, #FFFFFF 100%)'
    }
    const grayTone = hslToHex(hsl.h, 0, Math.max(20, Math.min(80, hsl.l)))
    const vividTone = hslToHex(hsl.h, 100, Math.max(25, Math.min(72, hsl.l)))
    return 'linear-gradient(90deg, ' + grayTone + ' 0%, ' + vividTone + ' 100%)'
  }, [mode, hsl])

  const applyTrackClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(rect.width, 1)))
      const stepBucket = Math.floor(ratio * 18)
      if (stepBucket !== lastHapticStep.current) {
        hapticSwatch()
        lastHapticStep.current = stepBucket
      }

      if (mode === 'hue') {
        const nextHue = Math.round(ratio * 359)
        const nextS = hsl.s < 12 ? 72 : hsl.s
        const nextL = hsl.l < 12 || hsl.l > 92 ? 50 : hsl.l
        onLiveChangeHex(hslToHex(nextHue, nextS, nextL))
      } else if (mode === 'tone') {
        const nextL = Math.round(4 + ratio * 92)
        onLiveChangeHex(hslToHex(hsl.h, hsl.s, nextL))
      } else {
        const nextS = Math.round(ratio * 100)
        onLiveChangeHex(hslToHex(hsl.h, nextS, hsl.l))
      }
    },
    [mode, hsl, onLiveChangeHex]
  )

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingTrack.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    applyTrackClientX(e.clientX)
  }

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingTrack.current) return
    applyTrackClientX(e.clientX)
  }

  const handleTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingTrack.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleHexChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^#0-9A-F]/g, '')
    const formatted = cleaned.startsWith('#') ? cleaned.slice(0, 7) : ('#' + cleaned).slice(0, 7)
    setHexInput(formatted)
    const valid = normalizeHex(formatted)
    if (valid && formatted.length === 7) {
      hapticSwatch()
      onLiveChangeHex(valid)
    }
  }

  const handleCopyHex = () => {
    hapticTap()
    setCopied(true)
    try {
      void navigator.clipboard?.writeText(currentHex.toUpperCase())
    } catch {}
    window.setTimeout(() => setCopied(false), 1400)
  }

  const handleEyedropper = async () => {
    hapticTap()
    const w = window as WindowWithEyeDropper
    if (!w.EyeDropper) {
      setEyedropperNotice(t.eyedropperUnsupported)
      window.setTimeout(() => setEyedropperNotice(null), 2400)
      return
    }
    try {
      const dropper = new w.EyeDropper()
      const result = await dropper.open()
      const valid = normalizeHex(result.sRGBHex)
      if (valid) {
        hapticSwatch()
        onLiveChangeHex(valid)
      }
    } catch {}
  }

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 75 || info.velocity.y > 380) {
      hapticTap()
      onClose()
    }
  }

  const allQuickSwatches = useMemo(() => {
    const merged: { hex: string; isCustom: boolean }[] = []
    const seen = new Set<string>()
    for (const c of quickColors) {
      const norm = c.toUpperCase()
      if (!seen.has(norm)) {
        seen.add(norm)
        merged.push({ hex: norm, isCustom: false })
      }
    }
    for (const c of customQuickColors) {
      const norm = c.toUpperCase()
      if (!seen.has(norm)) {
        seen.add(norm)
        merged.push({ hex: norm, isCustom: true })
      }
    }
    return merged
  }, [quickColors, customQuickColors])

  const canAddCurrent = !allQuickSwatches.some((s) => s.hex === currentHex.toUpperCase())

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[80] flex flex-col justify-end pointer-events-none"
          role="dialog"
          aria-modal="true"
          aria-label={t.editorTitle}
        >
          {/* Полупрозрачный фон — оставляет 3D-модель сверху видимой в реальном времени */}
          <motion.button
            type="button"
            aria-label={t.guideClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0.05 : 0.22 }}
            onClick={() => {
              hapticTap()
              onClose()
            }}
            className="flex-1 w-full bg-transparent border-0 cursor-default pointer-events-auto"
            style={{
              background:
                'linear-gradient(to bottom, transparent 0%, transparent 45%, ' +
                tokens.backdrop +
                ' 100%)',
            }}
          />

          {/* Bottom Sheet в стиле iOS с поддержкой свайпа вниз */}
          <motion.div
            initial={prefersReduced ? { opacity: 0 } : { y: '100%' }}
            animate={prefersReduced ? { opacity: 1 } : { y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { y: '100%' }}
            transition={
              prefersReduced
                ? { duration: 0.1 }
                : { type: 'spring', stiffness: 360, damping: 34, mass: 0.9 }
            }
            drag={prefersReduced ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.45 }}
            onDragEnd={handleDragEnd}
            className="pointer-events-auto w-full max-w-xl mx-auto rounded-t-[28px] px-5 pt-2.5 pb-5 border-t"
            style={{
              backgroundColor: tokens.sheetBg,
              borderColor: tokens.border,
              boxShadow: tokens.sheetShadow,
              paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {/* iOS Grabber Handle */}
            <div className="flex justify-center pb-2.5 cursor-grab active:cursor-grabbing">
              <div
                className="w-10 h-1 rounded-full"
                style={{ backgroundColor: tokens.borderStrong }}
              />
            </div>

            {/* Заголовок */}
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: tokens.surfaceSoft, color: tokens.ink }}
                  aria-hidden="true"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.03 2 11c0 3.31 2.69 6 6 6h1.2c.83 0 1.5.67 1.5 1.5 0 .39-.15.74-.39 1.01-.23.26-.38.61-.38.99 0 .83.67 1.5 1.5 1.5H12c5.52 0 10-4.48 10-10S17.52 2 12 2zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h2
                    className="font-serif text-[21px] leading-tight tracking-[-0.015em] truncate"
                    style={{ color: tokens.ink }}
                  >
                    {t.editorTitle}
                  </h2>
                  <span
                    className="text-[10px] font-sans uppercase tracking-[0.14em]"
                    style={{ color: tokens.inkMuted }}
                  >
                    {slotRatio} • {slotLabel}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  hapticTap()
                  onClose()
                }}
                aria-label={t.guideClose}
                className="w-8 h-8 rounded-full flex items-center justify-center border transition-transform active:scale-90 cursor-pointer shrink-0"
                style={{
                  backgroundColor: tokens.surfaceSoft,
                  borderColor: tokens.border,
                  color: tokens.inkSecondary,
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Переключатели «Оттенок / Тон / Насыщенность» + Пипетка */}
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                {(
                  [
                    { id: 'hue', label: t.modeHue },
                    { id: 'tone', label: t.modeTone },
                    { id: 'saturation', label: t.modeSaturation },
                  ] as const
                ).map((item) => {
                  const active = mode === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        hapticTap()
                        setMode(item.id)
                      }}
                      className="px-3 py-1.5 rounded-full text-[12px] font-sans font-medium whitespace-nowrap border transition-all duration-150 active:scale-[0.96] cursor-pointer"
                      style={{
                        backgroundColor: active ? tokens.pillActiveBg : tokens.pillIdleBg,
                        color: active ? tokens.pillActiveText : tokens.pillIdleText,
                        borderColor: active ? tokens.pillActiveBg : tokens.border,
                        boxShadow: active ? tokens.buttonShadow : 'none',
                      }}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <span
                className="h-5 w-px shrink-0"
                style={{ backgroundColor: tokens.divider }}
                aria-hidden="true"
              />

              <button
                type="button"
                onClick={() => void handleEyedropper()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-sans font-medium whitespace-nowrap transition-transform active:scale-95 cursor-pointer shrink-0 bg-transparent border-0"
                style={{ color: tokens.inkSecondary }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 22l1-1h3l9-9" />
                  <path d="M3 21v-3l9-9" />
                  <path d="M15 6l3.4-3.4a2.1 2.1 0 113 3L18 9l.4.4a2.1 2.1 0 11-3 3l-3.8-3.8a2.1 2.1 0 113-3l.4.4z" />
                </svg>
                <span>{t.eyedropper}</span>
              </button>
            </div>

            {eyedropperNotice && (
              <p
                className="text-[11px] font-sans mb-2 px-1"
                style={{ color: tokens.inkMuted }}
                role="status"
              >
                {eyedropperNotice}
              </p>
            )}

            {/* Компактная цветовая спектральная полоса */}
            <div
              ref={trackRef}
              role="slider"
              tabIndex={0}
              aria-label={mode === 'hue' ? t.modeHue : mode === 'tone' ? t.modeTone : t.modeSaturation}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(sliderPercent)}
              onPointerDown={handleTrackPointerDown}
              onPointerMove={handleTrackPointerMove}
              onPointerUp={handleTrackPointerUp}
              onPointerCancel={handleTrackPointerUp}
              className="relative w-full h-7 rounded-full cursor-pointer select-none touch-none mb-4"
              style={{
                background: trackBackground,
                touchAction: 'none',
                boxShadow:
                  'inset 0 0 0 1px ' +
                  (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'),
              }}
            >
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[22px] h-[22px] rounded-full border-[2.5px] border-white pointer-events-none transition-[left] duration-75"
                style={{
                  left: Math.max(4, Math.min(96, sliderPercent)) + '%',
                  backgroundColor: currentHex,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.34), 0 0 0 1px rgba(0,0,0,0.12)',
                }}
              />
            </div>

            {/* Живой превью-блок + HEX-редактор + Копировать HEX */}
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="flex-1 h-11 rounded-[14px] border transition-colors duration-150"
                style={{
                  backgroundColor: currentHex,
                  borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
                  boxShadow: tokens.buttonShadow,
                }}
              />

              <span
                className="text-[11px] font-sans font-medium uppercase tracking-[0.12em] shrink-0"
                style={{ color: tokens.inkMuted }}
              >
                HEX
              </span>

              <input
                type="text"
                inputMode="text"
                spellCheck={false}
                autoComplete="off"
                aria-label="HEX"
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                className="w-[104px] h-10 px-3 rounded-full text-center font-mono text-[13px] font-medium tracking-[0.04em] border outline-none transition-colors"
                style={{
                  backgroundColor: tokens.surface,
                  borderColor: tokens.borderStrong,
                  color: tokens.ink,
                }}
              />

              <button
                type="button"
                onClick={handleCopyHex}
                aria-label={copied ? t.copied : 'HEX'}
                className="w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-150 active:scale-90 cursor-pointer shrink-0"
                style={{
                  backgroundColor: copied ? tokens.pillActiveBg : tokens.surface,
                  borderColor: copied ? tokens.pillActiveBg : tokens.borderStrong,
                  color: copied ? tokens.pillActiveText : tokens.ink,
                  boxShadow: tokens.buttonShadow,
                }}
              >
                {copied ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
              </button>
            </div>

            {/* Быстрые цвета + нативная iOS кнопка «+» и удаление */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[12px] font-sans font-medium"
                  style={{ color: tokens.inkSecondary }}
                >
                  {t.quickColors}
                </span>
                {customQuickColors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      hapticTap()
                      setManageQuickMode((v) => !v)
                    }}
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-sans border bg-transparent cursor-pointer transition-opacity"
                    style={{
                      borderColor: tokens.border,
                      color: manageQuickMode ? tokens.ink : tokens.inkMuted,
                    }}
                  >
                    {manageQuickMode ? t.guideClose : '−'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-hide">
                {allQuickSwatches.map((swatch) => {
                  const selected = swatch.hex === currentHex.toUpperCase()
                  return (
                    <div key={swatch.hex} className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          hapticSwatch()
                          onLiveChangeHex(swatch.hex)
                        }}
                        aria-label={swatch.hex}
                        className="w-7 h-7 rounded-full transition-transform duration-150 active:scale-90 cursor-pointer flex items-center justify-center p-[2px]"
                        style={{
                          boxShadow: selected
                            ? '0 0 0 2px ' + tokens.sheetBg + ', 0 0 0 3.5px ' + tokens.ink
                            : 'inset 0 0 0 1px ' +
                              (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'),
                          backgroundColor: swatch.hex,
                        }}
                      />
                      {swatch.isCustom && manageQuickMode && (
                        <button
                          type="button"
                          aria-label={t.removeColor}
                          onClick={() => {
                            hapticReset()
                            onRemoveQuickColor(swatch.hex)
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border cursor-pointer"
                          style={{
                            backgroundColor: tokens.pillActiveBg,
                            color: tokens.pillActiveText,
                            borderColor: tokens.sheetBg,
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                })}

                {/* Нативная iOS кнопка «+» добавления цвета */}
                <button
                  type="button"
                  onClick={() => {
                    hapticTap()
                    onAddQuickColor(currentHex.toUpperCase())
                  }}
                  disabled={!canAddCurrent}
                  aria-label={t.addColor}
                  title={t.addColor}
                  className="w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-150 active:scale-90 cursor-pointer shrink-0 disabled:opacity-40"
                  style={{
                    backgroundColor: tokens.surface,
                    borderColor: tokens.borderStrong,
                    color: tokens.ink,
                    boxShadow: tokens.buttonShadow,
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Кнопки «Сбросить» и «Применить» в стиле iPhone */}
            <div className="grid grid-cols-[1fr_1.45fr] gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  hapticReset()
                  onResetSlot()
                }}
                className="h-11 rounded-full flex items-center justify-center gap-2 border text-[13px] font-sans font-medium transition-transform duration-150 active:scale-[0.97] cursor-pointer"
                style={{
                  backgroundColor: tokens.surface,
                  borderColor: tokens.borderStrong,
                  color: tokens.ink,
                  boxShadow: tokens.buttonShadow,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>{t.btnReset}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticTap()
                  onClose()
                }}
                className="h-11 rounded-full flex items-center justify-center gap-2 border text-[13px] font-sans font-medium transition-transform duration-150 active:scale-[0.97] cursor-pointer"
                style={{
                  backgroundColor: tokens.pillActiveBg,
                  borderColor: tokens.pillActiveBg,
                  color: tokens.pillActiveText,
                  boxShadow: tokens.cardShadow,
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>{t.btnApply}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

