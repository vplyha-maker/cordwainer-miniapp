import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion'
import { hexToOklch, normalizeHex, oklchToHex, type OklchColor } from './colorEngine'
import type { TranslationDict } from './colorsTranslations'
import { hapticReset, hapticSwatch, hapticTap } from './haptics'
import type { CordwaineThemeTokens } from './themeSystem'

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
  tokens: CordwaineThemeTokens
  t: TranslationDict
  slotLabel: string
  slotRatio: string
  currentHex: string
  quickColors: string[]
  customQuickColors: string[]
  onLivePreviewHex: (hex: string) => void
  onCommitHex: (hex: string) => void
  onResetSlot: () => void
  onClose: () => void
  onAddQuickColor: (hex: string) => void
  onRemoveQuickColor: (hex: string) => void
}

const MAX_OKLCH_CHROMA = 0.28

function buildOklchHueGradient(): string {
  const stops: string[] = []
  for (let i = 0; i <= 12; i++) {
    const h = i * 30
    stops.push(oklchToHex(0.68, 0.22, h) + ' ' + Math.round((i / 12) * 100) + '%')
  }
  return 'linear-gradient(90deg, ' + stops.join(', ') + ')'
}

const OKLCH_SPECTRUM_GRADIENT = buildOklchHueGradient()

function formatOklchReadout(c: OklchColor): string {
  return 'OKLCH  L ' + c.l.toFixed(2) + ' • C ' + c.c.toFixed(2) + ' • H ' + Math.round(c.h) + '°'
}

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
  onLivePreviewHex,
  onCommitHex,
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

  // DOM refs для 60fps перетаскивания ползунка OKLCH БЕЗ перерендера React
  const trackRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const hexInputRef = useRef<HTMLInputElement>(null)
  const oklchReadoutRef = useRef<HTMLDivElement>(null)

  const isDraggingTrack = useRef(false)
  const dragOklchRef = useRef<OklchColor>(hexToOklch(currentHex))
  const dragHexRef = useRef<string>(currentHex.toUpperCase())

  const oklch = useMemo(() => hexToOklch(currentHex), [currentHex])

  useEffect(() => {
    if (!isDraggingTrack.current) {
      const upper = currentHex.toUpperCase()
      setHexInput(upper)
      dragHexRef.current = upper
      dragOklchRef.current = hexToOklch(upper)
    }
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
    if (mode === 'hue') return (oklch.h / 360) * 100
    if (mode === 'tone') return oklch.l * 100
    return Math.min(100, (oklch.c / MAX_OKLCH_CHROMA) * 100)
  }, [mode, oklch])

  const trackBackground = useMemo(() => {
    if (mode === 'hue') return OKLCH_SPECTRUM_GRADIENT
    const refC = Math.max(oklch.c, 0.14)
    if (mode === 'tone') {
      const midHex = oklchToHex(0.62, refC, oklch.h)
      return 'linear-gradient(90deg, #0E0E10 0%, ' + midHex + ' 55%, #FFFFFF 100%)'
    }
    const refL = Math.max(0.28, Math.min(0.84, oklch.l))
    const neutralHex = oklchToHex(refL, 0, oklch.h)
    const vividHex = oklchToHex(refL, MAX_OKLCH_CHROMA, oklch.h)
    return 'linear-gradient(90deg, ' + neutralHex + ' 0%, ' + vividHex + ' 100%)'
  }, [mode, oklch])

  const applyTrackClientXDirect = useCallback(
    (clientX: number) => {
      const el = trackRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(rect.width, 1)))
      const base = dragOklchRef.current

      let nextL = base.l
      let nextC = base.c
      let nextH = base.h

      if (mode === 'hue') {
        nextH = Math.round(ratio * 359)
        if (nextC < 0.04) nextC = 0.18
        if (nextL < 0.16 || nextL > 0.94) nextL = 0.64
      } else if (mode === 'tone') {
        nextL = 0.06 + ratio * 0.94
      } else {
        nextC = ratio * MAX_OKLCH_CHROMA
      }

      const nextHex = oklchToHex(nextL, nextC, nextH)
      dragHexRef.current = nextHex
      const pct = Math.max(4, Math.min(96, ratio * 100))

      if (thumbRef.current) {
        thumbRef.current.style.left = pct + '%'
        thumbRef.current.style.backgroundColor = nextHex
      }
      if (previewRef.current) {
        previewRef.current.style.backgroundColor = nextHex
      }
      if (hexInputRef.current) {
        hexInputRef.current.value = nextHex
      }
      if (oklchReadoutRef.current) {
        oklchReadoutRef.current.textContent = formatOklchReadout({
          l: nextL,
          c: nextC,
          h: nextH,
        })
      }

      hapticSwatch()
      onLivePreviewHex(nextHex)
    },
    [mode, onLivePreviewHex]
  )

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingTrack.current = true
    dragOklchRef.current = hexToOklch(dragHexRef.current)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    applyTrackClientXDirect(e.clientX)
  }

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingTrack.current) return
    applyTrackClientXDirect(e.clientX)
  }

  const handleTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingTrack.current) return
    isDraggingTrack.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    const committed = dragHexRef.current
    dragOklchRef.current = hexToOklch(committed)
    setHexInput(committed)
    onCommitHex(committed)
  }

  const handleHexChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^#0-9A-F]/g, '')
    const formatted = cleaned.startsWith('#') ? cleaned.slice(0, 7) : ('#' + cleaned).slice(0, 7)
    setHexInput(formatted)
    const valid = normalizeHex(formatted)
    if (valid && formatted.length === 7) {
      hapticSwatch()
      dragHexRef.current = valid
      dragOklchRef.current = hexToOklch(valid)
      onLivePreviewHex(valid)
      onCommitHex(valid)
    }
  }

  const handleCopyHex = () => {
    hapticTap()
    setCopied(true)
    try {
      void navigator.clipboard?.writeText(dragHexRef.current)
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
        dragHexRef.current = valid
        dragOklchRef.current = hexToOklch(valid)
        setHexInput(valid)
        onLivePreviewHex(valid)
        onCommitHex(valid)
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
          <motion.button
            type="button"
            aria-label={t.guideClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0.05 : 0.18 }}
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

          <motion.div
            initial={prefersReduced ? { opacity: 0 } : { y: '100%' }}
            animate={prefersReduced ? { opacity: 1 } : { y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { y: '100%' }}
            transition={
              prefersReduced
                ? { duration: 0.08 }
                : { type: 'spring', stiffness: 380, damping: 36, mass: 0.85 }
            }
            drag={prefersReduced ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            className="pointer-events-auto w-full max-w-xl md:max-w-[460px] mx-auto md:ml-auto md:mr-6 md:mb-6 rounded-t-[28px] md:rounded-[28px] px-5 pt-2.5 pb-5 border-t md:border"
            style={{
              backgroundColor: tokens.sheetBg,
              borderColor: tokens.border,
              boxShadow: tokens.sheetShadow,
              paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="flex justify-center pb-2.5 cursor-grab active:cursor-grabbing">
              <div
                className="w-10 h-1 rounded-full"
                style={{ backgroundColor: tokens.borderStrong }}
              />
            </div>

            <div className="flex items-center justify-between mb-3">
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
                    {slotRatio ? slotRatio + ' • ' + slotLabel : slotLabel}
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
                className="cw-press w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer shrink-0"
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

            <div className="flex items-center justify-between gap-2 mb-3">
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
                      className="cw-press px-3 py-1.5 rounded-full text-[12px] font-sans font-medium whitespace-nowrap border cursor-pointer"
                      style={{
                        backgroundColor: active ? tokens.pillActiveBg : tokens.pillIdleBg,
                        color: active ? tokens.pillActiveText : tokens.pillIdleText,
                        borderColor: active ? tokens.pillActiveBg : tokens.border,
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
                className="cw-press flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-sans font-medium whitespace-nowrap cursor-pointer shrink-0 bg-transparent border-0"
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

            {/* Перцептивная спектральная полоса OKLCH (60fps, 0 React re-renders) */}
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
              className="relative w-full h-8 rounded-full cursor-pointer select-none touch-none mb-2.5"
              style={{
                background: trackBackground,
                touchAction: 'none',
                boxShadow:
                  'inset 0 0 0 1px ' +
                  (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'),
              }}
            >
              <div
                ref={thumbRef}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[24px] h-[24px] rounded-full border-[2.5px] border-white pointer-events-none"
                style={{
                  left: Math.max(4, Math.min(96, sliderPercent)) + '%',
                  backgroundColor: currentHex,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.34), 0 0 0 1px rgba(0,0,0,0.12)',
                }}
              />
            </div>

            {/* Живые координаты OKLCH */}
            <div
              ref={oklchReadoutRef}
              className="text-[10px] font-mono tracking-[0.06em] mb-3 px-0.5"
              style={{ color: tokens.inkMuted }}
            >
              {formatOklchReadout(oklch)}
            </div>

            <div className="flex items-center gap-2.5 mb-3.5">
              <div
                ref={previewRef}
                className="flex-1 h-11 rounded-[14px] border"
                style={{
                  backgroundColor: currentHex,
                  borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
                }}
              />

              <span
                className="text-[11px] font-sans font-medium uppercase tracking-[0.12em] shrink-0"
                style={{ color: tokens.inkMuted }}
              >
                HEX
              </span>

              <input
                ref={hexInputRef}
                type="text"
                inputMode="text"
                spellCheck={false}
                autoComplete="off"
                aria-label="HEX"
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                className="w-[104px] h-10 px-3 rounded-full text-center font-mono text-[13px] font-medium tracking-[0.04em] border outline-none"
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
                className="cw-press w-10 h-10 rounded-full flex items-center justify-center border cursor-pointer shrink-0"
                style={{
                  backgroundColor: copied ? tokens.pillActiveBg : tokens.surface,
                  borderColor: copied ? tokens.pillActiveBg : tokens.borderStrong,
                  color: copied ? tokens.pillActiveText : tokens.ink,
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

            <div className="flex items-center justify-between gap-2 mb-3.5">
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
                    className="cw-press px-1.5 py-0.5 rounded-full text-[10px] font-sans border bg-transparent cursor-pointer"
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
                          dragHexRef.current = swatch.hex
                          dragOklchRef.current = hexToOklch(swatch.hex)
                          setHexInput(swatch.hex)
                          onLivePreviewHex(swatch.hex)
                          onCommitHex(swatch.hex)
                        }}
                        aria-label={swatch.hex}
                        className="cw-press w-7 h-7 rounded-full cursor-pointer flex items-center justify-center p-[2px]"
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
                          className="cw-press absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border cursor-pointer"
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

                <button
                  type="button"
                  onClick={() => {
                    hapticTap()
                    onAddQuickColor(dragHexRef.current)
                  }}
                  disabled={!canAddCurrent}
                  aria-label={t.addColor}
                  title={t.addColor}
                  className="cw-press w-7 h-7 rounded-full flex items-center justify-center border cursor-pointer shrink-0 disabled:opacity-40"
                  style={{
                    backgroundColor: tokens.surface,
                    borderColor: tokens.borderStrong,
                    color: tokens.ink,
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

            <div className="grid grid-cols-[1fr_1.45fr] gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  hapticReset()
                  onResetSlot()
                }}
                className="cw-press h-11 rounded-full flex items-center justify-center gap-2 border text-[13px] font-sans font-medium cursor-pointer"
                style={{
                  backgroundColor: tokens.surface,
                  borderColor: tokens.borderStrong,
                  color: tokens.ink,
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
                className="cw-press h-11 rounded-full flex items-center justify-center gap-2 border text-[13px] font-sans font-medium cursor-pointer"
                style={{
                  backgroundColor: tokens.pillActiveBg,
                  borderColor: tokens.pillActiveBg,
                  color: tokens.pillActiveText,
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
