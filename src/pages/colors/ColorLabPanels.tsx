import React, { memo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  getMaterialZoneHex,
  type ColorModelMode,
  type MaterialOverrides,
  type MaterialZoneKey,
  type SneakerColors,
} from './colorEngine'
import type { SupportedLang, TranslationDict } from './colorsTranslations'
import { hapticReset, hapticSave, hapticSwatch, hapticTap } from './haptics'
import {
  STUDIO_BG_PRESET_HEX,
  type CordwaineThemeTokens,
  type PerformanceMode,
  type StudioBgPreset,
  type StudioDisplaySettings,
} from './themeSystem'

export type ToneControlCardProps = {
  isOpen: boolean
  isDark: boolean
  tokens: CordwaineThemeTokens
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

export const ToneControlCard = memo(function ToneControlCard({
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
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
          transition={{ duration: prefersReduced ? 0.05 : 0.18 }}
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
})

export type StudioSettingsPanelProps = {
  tokens: CordwaineThemeTokens
  t: TranslationDict
  studioSettings: StudioDisplaySettings
  onChangeStudioBgPreset: (preset: StudioBgPreset) => void
  onOpenCustomBgEditor: () => void
  onToggleAutoContrast: (next: boolean) => void
  onChangePerformanceMode: (mode: PerformanceMode) => void
  sneakerColors: SneakerColors
  materialOverrides: MaterialOverrides
  onEditMaterial: (zone: MaterialZoneKey) => void
  onResetMaterial: (zone: MaterialZoneKey) => void
  onResetAllMaterials: () => void
  hapticsEnabled: boolean
  onToggleHaptics: (next: boolean) => void
  modelMode: ColorModelMode
  onChangeModelMode: (mode: ColorModelMode) => void
  localLang: SupportedLang
  onChangeLang: (lang: SupportedLang) => void
  onOpenGuide: () => void
  onSaveAndClose: () => void
}

const BG_OPTIONS: { id: StudioBgPreset; labelKey: keyof TranslationDict; previewBg: string }[] = [
  { id: 'cream', labelKey: 'bgCream', previewBg: STUDIO_BG_PRESET_HEX.cream },
  { id: 'white', labelKey: 'bgWhite', previewBg: STUDIO_BG_PRESET_HEX.white },
  { id: 'light-gray', labelKey: 'bgLightGray', previewBg: STUDIO_BG_PRESET_HEX['light-gray'] },
  { id: 'graphite', labelKey: 'bgGraphite', previewBg: STUDIO_BG_PRESET_HEX.graphite },
  { id: 'black', labelKey: 'bgBlack', previewBg: STUDIO_BG_PRESET_HEX.black },
  {
    id: 'custom',
    labelKey: 'bgCustom',
    previewBg: 'linear-gradient(135deg, #F9E26B 0%, #F57B94 50%, #52B6FF 100%)',
  },
]

const MATERIAL_ROWS: { key: MaterialZoneKey; labelKey: keyof TranslationDict }[] = [
  { key: 'upper', labelKey: 'matUpper' },
  { key: 'outsole', labelKey: 'matOutsole' },
  { key: 'midsole', labelKey: 'matMidsole' },
  { key: 'tread', labelKey: 'matTread' },
  { key: 'accent', labelKey: 'matAccent' },
]

export const StudioSettingsPanel = memo(function StudioSettingsPanel({
  tokens,
  t,
  studioSettings,
  onChangeStudioBgPreset,
  onOpenCustomBgEditor,
  onToggleAutoContrast,
  onChangePerformanceMode,
  sneakerColors,
  materialOverrides,
  onEditMaterial,
  onResetMaterial,
  onResetAllMaterials,
  hapticsEnabled,
  onToggleHaptics,
  modelMode,
  onChangeModelMode,
  localLang,
  onChangeLang,
  onOpenGuide,
  onSaveAndClose,
}: StudioSettingsPanelProps) {
  const [confirmResetMats, setConfirmResetMats] = useState(false)
  const hasAnyMaterialOverride = Object.values(materialOverrides).some(Boolean)

  return (
    <section className="mt-2.5 space-y-3 pb-4" aria-label={t.settingsTitle}>
      {/* БЛОК 1: ФОН СТУДИИ (6 вариантов + Авто-контраст) */}
      <div
        className="rounded-[20px] p-4 border space-y-3"
        style={{
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          boxShadow: tokens.cardShadow,
        }}
      >
        <div className="flex items-start gap-2.5">
          <span
            className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: tokens.surfaceSoft, color: tokens.ink }}
            aria-hidden="true"
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
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2
              className="text-[11.5px] font-sans font-semibold uppercase tracking-[0.12em]"
              style={{ color: tokens.ink }}
            >
              {t.studioBgTitle}
            </h2>
            <p className="text-[11.5px] font-sans mt-0.5" style={{ color: tokens.inkMuted }}>
              {t.studioBgSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          {BG_OPTIONS.map((opt) => {
            const active = studioSettings.bgPreset === opt.id
            const isCustom = opt.id === 'custom'
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  hapticSwatch()
                  if (isCustom) {
                    onChangeStudioBgPreset('custom')
                    onOpenCustomBgEditor()
                  } else {
                    onChangeStudioBgPreset(opt.id)
                  }
                }}
                className="flex flex-col items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer active:scale-95 transition-transform"
              >
                <div
                  className="relative w-full aspect-square rounded-[12px] border flex items-center justify-center overflow-hidden"
                  style={{
                    background:
                      isCustom && active
                        ? studioSettings.customBgHex
                        : opt.previewBg,
                    borderColor: active ? tokens.ink : tokens.borderStrong,
                    borderWidth: active ? '2px' : '1px',
                  }}
                >
                  {isCustom && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#181614"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 22l1-1h3l9-9" />
                      <path d="M3 21v-3l9-9" />
                      <path d="M15 6l3.4-3.4a2.1 2.1 0 113 3L18 9" />
                    </svg>
                  )}
                  {active && !isCustom && (
                    <span
                      className="absolute bottom-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: tokens.pillActiveBg,
                        color: tokens.pillActiveText,
                      }}
                    >
                      <svg
                        width="9"
                        height="9"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                  )}
                </div>
                <span
                  className="text-[9.5px] font-sans leading-tight text-center line-clamp-2"
                  style={{ color: active ? tokens.ink : tokens.inkMuted }}
                >
                  {t[opt.labelKey]}
                </span>
              </button>
            )
          })}
        </div>

        {/* Авто-контраст интерфейса */}
        <div
          className="flex items-center justify-between gap-3 pt-3 border-t"
          style={{ borderColor: tokens.divider }}
        >
          <div className="min-w-0">
            <div className="text-[13px] font-sans font-medium" style={{ color: tokens.ink }}>
              {t.autoContrastTitle}
            </div>
            <div className="text-[11px] font-sans mt-0.5" style={{ color: tokens.inkMuted }}>
              {t.autoContrastSubtitle}
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={studioSettings.autoContrast}
            onClick={() => {
              hapticTap()
              onToggleAutoContrast(!studioSettings.autoContrast)
            }}
            className="relative w-12 h-7 rounded-full border transition-colors duration-200 cursor-pointer shrink-0"
            style={{
              backgroundColor: studioSettings.autoContrast
                ? tokens.pillActiveBg
                : tokens.surfaceSoft,
              borderColor: studioSettings.autoContrast
                ? tokens.pillActiveBg
                : tokens.borderStrong,
            }}
          >
            <span
              className="block w-5 h-5 rounded-full transition-transform duration-200"
              style={{
                backgroundColor: studioSettings.autoContrast
                  ? tokens.pillActiveText
                  : tokens.inkMuted,
                transform: studioSettings.autoContrast ? 'translateX(22px)' : 'translateX(3px)',
              }}
            />
          </button>
        </div>
      </div>

      {/* БЛОК 2: ЦВЕТА МАТЕРИАЛОВ ОБУВИ (5 независимых элементов) */}
      <div
        className="rounded-[20px] p-4 border space-y-2.5"
        style={{
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          boxShadow: tokens.cardShadow,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2
              className="text-[11.5px] font-sans font-semibold uppercase tracking-[0.12em]"
              style={{ color: tokens.ink }}
            >
              {t.materialsTitle}
            </h2>
            <p className="text-[11.5px] font-sans mt-0.5" style={{ color: tokens.inkMuted }}>
              {t.materialsSubtitle}
            </p>
          </div>

          {hasAnyMaterialOverride && (
            <button
              type="button"
              onClick={() => {
                if (!confirmResetMats) {
                  hapticTap()
                  setConfirmResetMats(true)
                  return
                }
                hapticReset()
                setConfirmResetMats(false)
                onResetAllMaterials()
              }}
              className="px-2.5 py-1 rounded-full text-[10.5px] font-sans font-medium border cursor-pointer shrink-0 active:scale-95 transition-transform"
              style={{
                backgroundColor: confirmResetMats ? tokens.pillActiveBg : tokens.surfaceSoft,
                color: confirmResetMats ? tokens.pillActiveText : tokens.ink,
                borderColor: confirmResetMats ? tokens.pillActiveBg : tokens.borderStrong,
              }}
            >
              {confirmResetMats ? t.btnConfirmReset : t.resetMaterialsBtn}
            </button>
          )}
        </div>

        <div className="divide-y" style={{ borderColor: tokens.divider }}>
          {MATERIAL_ROWS.map((row) => {
            const hex = getMaterialZoneHex(sneakerColors, row.key)
            const isOverridden = Boolean(materialOverrides[row.key])
            return (
              <div
                key={row.key}
                className="flex items-center justify-between gap-2 py-2.5"
                style={{ borderColor: tokens.divider }}
              >
                <button
                  type="button"
                  onClick={() => {
                    hapticSwatch()
                    onEditMaterial(row.key)
                  }}
                  className="flex items-center gap-2.5 min-w-0 flex-1 bg-transparent border-0 p-0 text-left cursor-pointer"
                >
                  <span
                    className="w-7 h-7 rounded-[9px] border shrink-0"
                    style={{
                      backgroundColor: hex,
                      borderColor: tokens.borderStrong,
                    }}
                  />
                  <span
                    className="text-[13px] font-sans font-medium truncate"
                    style={{ color: tokens.ink }}
                  >
                    {t[row.labelKey]}
                  </span>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono border"
                    style={{
                      backgroundColor: tokens.surfaceSoft,
                      borderColor: tokens.border,
                      color: tokens.inkSecondary,
                    }}
                  >
                    {hex}
                  </span>

                  {isOverridden && (
                    <button
                      type="button"
                      onClick={() => {
                        hapticReset()
                        onResetMaterial(row.key)
                      }}
                      aria-label={t.btnReset}
                      title={t.btnReset}
                      className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer active:scale-90 transition-transform"
                      style={{
                        backgroundColor: tokens.surfaceSoft,
                        borderColor: tokens.border,
                        color: tokens.inkMuted,
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      hapticTap()
                      onEditMaterial(row.key)
                    }}
                    aria-label={t.editorTitle}
                    className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer active:scale-90 transition-transform"
                    style={{
                      backgroundColor: tokens.surfaceElevated,
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
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* БЛОК 3: ОТОБРАЖЕНИЕ И ПРОИЗВОДИТЕЛЬНОСТЬ */}
      <div
        className="rounded-[20px] p-4 border space-y-3.5"
        style={{
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          boxShadow: tokens.cardShadow,
        }}
      >
        <h2
          className="text-[11.5px] font-sans font-semibold uppercase tracking-[0.12em]"
          style={{ color: tokens.ink }}
        >
          {t.displayPerfTitle}
        </h2>

        {/* Режим производительности Android */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-sans font-medium" style={{ color: tokens.ink }}>
            {t.perfModeLabel}
          </span>
          <div
            className="flex items-center p-1 rounded-full border shrink-0"
            style={{ backgroundColor: tokens.surfaceSoft, borderColor: tokens.border }}
          >
            {(
              [
                { id: 'auto', label: t.perfAuto },
                { id: 'high', label: t.perfHigh },
                { id: 'eco', label: t.perfEco },
              ] as const
            ).map((item) => {
              const active = studioSettings.performanceMode === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    hapticTap()
                    onChangePerformanceMode(item.id)
                  }}
                  className="px-2.5 py-1 rounded-full text-[11.5px] font-sans font-medium border-0 cursor-pointer"
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

        {/* Виброотклик */}
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
                  className="px-3.5 py-1 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.08em] border-0 cursor-pointer"
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
                  className="px-3 py-1 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.08em] border-0 cursor-pointer"
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

        {/* Подробный гид */}
        <button
          type="button"
          onClick={() => {
            hapticTap()
            onOpenGuide()
          }}
          className="w-full h-10 rounded-full border text-[12.5px] font-sans font-medium transition-transform active:scale-[0.98] cursor-pointer"
          style={{
            backgroundColor: tokens.surfaceSoft,
            borderColor: tokens.borderStrong,
            color: tokens.ink,
          }}
        >
          {t.guideBtn} — {t.guideTitle}
        </button>
      </div>

      {/* Primary Action: Сохранить изменения */}
      <button
        type="button"
        onClick={() => {
          hapticSave()
          onSaveAndClose()
        }}
        className="w-full h-12 rounded-full flex items-center justify-center gap-2 border text-[13.5px] font-sans font-medium transition-transform active:scale-[0.97] cursor-pointer"
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
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span>{t.btnSaveChanges}</span>
      </button>
    </section>
  )
})
