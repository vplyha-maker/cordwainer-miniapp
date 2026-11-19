import React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ColorModelMode } from './colorEngine'
import type { SupportedLang, TranslationDict } from './colorsTranslations'
import { hapticTap } from './haptics'
import type { CordwainerThemeTokens, ThemeMode } from './themeSystem'

export type ToneControlCardProps = {
  isOpen: boolean
  isDark: boolean
  tokens: CordwainerThemeTokens
  t: TranslationDict
  activeColorHex: string
  whiteAmount: number
  blackAmount: number
  chromaAmount: number
  onChangeWhite: (next: number) => void
  onChangeBlack: (next: number) => void
  onChangeChroma: (next: number) => void
  onOpenEditor: () => void
  onCollapse: () => void
}

function clamp01(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, Math.round(v * 100) / 100))
}

export function ToneControlCard({
  isOpen,
  isDark,
  tokens,
  t,
  activeColorHex,
  whiteAmount,
  blackAmount,
  chromaAmount,
  onChangeWhite,
  onChangeBlack,
  onChangeChroma,
  onOpenEditor,
  onCollapse,
}: ToneControlCardProps) {
  const prefersReduced = useReducedMotion()

  const rows = [
    {
      id: 'tint',
      label: t.tintLabel,
      sub: t.tintSub,
      pct: Math.round(whiteAmount * 100),
      onDec: () => {
        hapticTap()
        onChangeWhite(clamp01(whiteAmount - 0.05, 0, 1))
      },
      onInc: () => {
        hapticTap()
        onChangeWhite(clamp01(whiteAmount + 0.05, 0, 1))
      },
    },
    {
      id: 'shade',
      label: t.shadeLabel,
      sub: t.shadeSub,
      pct: Math.round(blackAmount * 100),
      onDec: () => {
        hapticTap()
        onChangeBlack(clamp01(blackAmount - 0.05, 0, 1))
      },
      onInc: () => {
        hapticTap()
        onChangeBlack(clamp01(blackAmount + 0.05, 0, 1))
      },
    },
    {
      id: 'sat',
      label: t.saturationLabel,
      sub: t.saturationSub,
      pct: Math.round(chromaAmount * 100),
      onDec: () => {
        hapticTap()
        onChangeChroma(clamp01(chromaAmount - 0.05, 0.15, 1))
      },
      onInc: () => {
        hapticTap()
        onChangeChroma(clamp01(chromaAmount + 0.05, 0.15, 1))
      },
    },
  ]

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
          transition={{ duration: prefersReduced ? 0.05 : 0.2 }}
          className="relative rounded-[20px] p-3.5 border mt-2.5"
          style={{
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
            boxShadow: tokens.cardShadow,
          }}
        >
          <button
            type="button"
            onClick={() => {
              hapticTap()
              onCollapse()
            }}
            aria-label={t.guideClose}
            className="absolute top-2.5 right-3 w-6 h-6 rounded-full flex items-center justify-center bg-transparent border-0 cursor-pointer transition-transform active:scale-90"
            style={{ color: tokens.inkMuted }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>

          <div className="grid grid-cols-[62px_1fr] gap-3.5 items-center pr-2">
            {/* Интерактивный квадрат текущего цвета */}
            <button
              type="button"
              onClick={() => {
                hapticTap()
                onOpenEditor()
              }}
              aria-label={t.editorTitle}
              className="w-[62px] h-[62px] rounded-[16px] border transition-transform duration-150 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: activeColorHex,
                borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)',
                boxShadow: tokens.buttonShadow,
              }}
            />

            <div
              className="flex flex-col pl-3 border-l"
              style={{ borderColor: tokens.divider }}
            >
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className={
                    'flex items-center justify-between gap-2 py-2 ' +
                    (idx > 0 ? 'border-t' : '')
                  }
                  style={idx > 0 ? { borderColor: tokens.divider } : undefined}
                >
                  <div className="min-w-0">
                    <div
                      className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] leading-tight truncate"
                      style={{ color: tokens.ink }}
                    >
                      {row.label}
                    </div>
                    <div
                      className="text-[9px] font-sans uppercase tracking-[0.12em] leading-tight mt-0.5"
                      style={{ color: tokens.inkMuted }}
                    >
                      {row.sub}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[13px] font-sans font-semibold tabular-nums w-9 text-right"
                      style={{ color: tokens.ink }}
                    >
                      {row.pct}%
                    </span>

                    <button
                      type="button"
                      onClick={row.onDec}
                      aria-label={row.label + ' -'}
                      className="w-7 h-7 rounded-full flex items-center justify-center border transition-transform duration-100 active:scale-90 cursor-pointer"
                      style={{
                        backgroundColor: tokens.surfaceSoft,
                        borderColor: tokens.border,
                        color: tokens.ink,
                      }}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      >
                        <path d="M5 12h14" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={row.onInc}
                      aria-label={row.label + ' +'}
                      className="w-7 h-7 rounded-full flex items-center justify-center border transition-transform duration-100 active:scale-90 cursor-pointer"
                      style={{
                        backgroundColor: tokens.surfaceSoft,
                        borderColor: tokens.border,
                        color: tokens.ink,
                      }}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export type SettingsSheetProps = {
  isOpen: boolean
  tokens: CordwainerThemeTokens
  t: TranslationDict
  themeMode: ThemeMode
  onChangeThemeMode: (mode: ThemeMode) => void
  hapticsEnabled: boolean
  onToggleHaptics: (next: boolean) => void
  modelMode: ColorModelMode
  onChangeModelMode: (mode: ColorModelMode) => void
  localLang: SupportedLang
  onChangeLang: (lang: SupportedLang) => void
  onOpenGuide: () => void
  onClose: () => void
}

export function SettingsSheet({
  isOpen,
  tokens,
  t,
  themeMode,
  onChangeThemeMode,
  hapticsEnabled,
  onToggleHaptics,
  modelMode,
  onChangeModelMode,
  localLang,
  onChangeLang,
  onOpenGuide,
  onClose,
}: SettingsSheetProps) {
  const prefersReduced = useReducedMotion()

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[85] flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={t.settingsTitle}
        >
          <motion.button
            type="button"
            aria-label={t.guideClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0.05 : 0.2 }}
            onClick={() => {
              hapticTap()
              onClose()
            }}
            className="fixed inset-0 border-0 cursor-default"
            style={{ backgroundColor: tokens.backdrop }}
          />

          <motion.div
            initial={prefersReduced ? { opacity: 0 } : { y: '100%' }}
            animate={prefersReduced ? { opacity: 1 } : { y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { y: '100%' }}
            transition={
              prefersReduced
                ? { duration: 0.1 }
                : { type: 'spring', stiffness: 360, damping: 34 }
            }
            className="relative z-10 w-full max-w-xl rounded-t-[28px] px-5 pt-3 pb-6 border-t space-y-4"
            style={{
              backgroundColor: tokens.sheetBg,
              borderColor: tokens.border,
              boxShadow: tokens.sheetShadow,
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="flex justify-center">
              <div
                className="w-10 h-1 rounded-full"
                style={{ backgroundColor: tokens.borderStrong }}
              />
            </div>

            <div className="flex items-center justify-between">
              <h2
                className="font-serif text-[21px] tracking-[-0.015em]"
                style={{ color: tokens.ink }}
              >
                {t.settingsTitle}
              </h2>
              <button
                type="button"
                onClick={() => {
                  hapticTap()
                  onClose()
                }}
                aria-label={t.guideClose}
                className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer active:scale-90 transition-transform"
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

            {/* Тема: День / Ночь / Авто */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-sans font-medium" style={{ color: tokens.ink }}>
                {t.themeLabel}
              </span>
              <div
                className="flex items-center p-1 rounded-full border"
                style={{ backgroundColor: tokens.surfaceSoft, borderColor: tokens.border }}
              >
                {(
                  [
                    { id: 'day', label: t.themeDay },
                    { id: 'night', label: t.themeNight },
                    { id: 'auto', label: t.themeAuto },
                  ] as const
                ).map((item) => {
                  const active = themeMode === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        hapticTap()
                        onChangeThemeMode(item.id)
                      }}
                      className="px-3 py-1 rounded-full text-[12px] font-sans font-medium border-0 cursor-pointer transition-all"
                      style={{
                        backgroundColor: active ? tokens.pillActiveBg : 'transparent',
                        color: active ? tokens.pillActiveText : tokens.inkSecondary,
                      }}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Виброотклик ON / OFF */}
            <div
              className="flex items-center justify-between gap-3 pt-3 border-t"
              style={{ borderColor: tokens.divider }}
            >
              <span className="text-[13px] font-sans font-medium" style={{ color: tokens.ink }}>
                {t.hapticsLabel}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={hapticsEnabled}
                onClick={() => {
                  const next = !hapticsEnabled
                  onToggleHaptics(next)
                  if (next) hapticTap()
                }}
                className="relative w-12 h-7 rounded-full border transition-colors duration-200 cursor-pointer"
                style={{
                  backgroundColor: hapticsEnabled ? tokens.pillActiveBg : tokens.surfaceSoft,
                  borderColor: hapticsEnabled ? tokens.pillActiveBg : tokens.borderStrong,
                }}
              >
                <span
                  className="block w-5 h-5 rounded-full transition-transform duration-200"
                  style={{
                    backgroundColor: hapticsEnabled ? tokens.pillActiveText : tokens.inkMuted,
                    transform: hapticsEnabled ? 'translateX(22px)' : 'translateX(3px)',
                  }}
                />
              </button>
            </div>

            {/* Цветовая модель RYB / HSL */}
            <div
              className="flex items-center justify-between gap-3 pt-3 border-t"
              style={{ borderColor: tokens.divider }}
            >
              <span className="text-[13px] font-sans font-medium" style={{ color: tokens.ink }}>
                {t.colorModelLabel}
              </span>
              <div
                className="flex items-center p-1 rounded-full border"
                style={{ backgroundColor: tokens.surfaceSoft, borderColor: tokens.border }}
              >
                {(['ryb', 'hsl'] as const).map((m) => {
                  const active = modelMode === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        hapticTap()
                        onChangeModelMode(m)
                      }}
                      className="px-3.5 py-1 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.08em] border-0 cursor-pointer transition-all"
                      style={{
                        backgroundColor: active ? tokens.pillActiveBg : 'transparent',
                        color: active ? tokens.pillActiveText : tokens.inkSecondary,
                      }}
                    >
                      {m.toUpperCase()}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Язык RU / UKR / DE */}
            <div
              className="flex items-center justify-between gap-3 pt-3 border-t"
              style={{ borderColor: tokens.divider }}
            >
              <span className="text-[13px] font-sans font-medium" style={{ color: tokens.ink }}>
                {t.languageLabel}
              </span>
              <div
                className="flex items-center p-1 rounded-full border"
                style={{ backgroundColor: tokens.surfaceSoft, borderColor: tokens.border }}
              >
                {(['ru', 'uk', 'de'] as SupportedLang[]).map((l) => {
                  const active = localLang === l
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => {
                        hapticTap()
                        onChangeLang(l)
                      }}
                      className="px-3 py-1 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.08em] border-0 cursor-pointer transition-all"
                      style={{
                        backgroundColor: active ? tokens.pillActiveBg : 'transparent',
                        color: active ? tokens.pillActiveText : tokens.inkSecondary,
                      }}
                    >
                      {l === 'uk' ? 'UKR' : l.toUpperCase()}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Кнопка открытия Гида */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  hapticTap()
                  onClose()
                  onOpenGuide()
                }}
                className="w-full h-11 rounded-full border text-[13px] font-sans font-medium transition-transform active:scale-[0.98] cursor-pointer"
                style={{
                  backgroundColor: tokens.surface,
                  borderColor: tokens.borderStrong,
                  color: tokens.ink,
                  boxShadow: tokens.buttonShadow,
                }}
              >
                {t.guideBtn} — {t.guideTitle}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

