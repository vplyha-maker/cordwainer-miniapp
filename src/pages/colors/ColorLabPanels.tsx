import React, { useState } from 'react'
import { ChevronUp, ChevronDown, RotateCcw, Check, Sparkles, Sliders, X } from 'lucide-react'
import type { Lang } from '../../App'
import {
  ColorModelMode,
  SOLE_PRESETS,
  SoleColorConfig,
  formatOklch,
  normalizeHex,
} from './colorEngine'
import type { ColorsTranslation } from './colorsTranslations'
import {
  STUDIO_BG_PRESETS,
  StudioBgConfig,
  ThemeTokens,
  triggerHaptic,
} from './themeSystem'

type ToneControlCardProps = {
  t: ColorsTranslation
  tokens: ThemeTokens
  primaryHex: string
  baseHue: number
  tintWhite: number
  shadeBlack: number
  chromaScale: number
  hapticsEnabled: boolean
  onChangeHue: (next: number) => void
  onChangeTint: (next: number) => void
  onChangeShade: (next: number) => void
  onChangeChroma: (next: number) => void
}

export const ToneControlCard: React.FC<ToneControlCardProps> = React.memo(
  ({
    t,
    tokens,
    primaryHex,
    baseHue,
    tintWhite,
    shadeBlack,
    chromaScale,
    hapticsEnabled,
    onChangeHue,
    onChangeTint,
    onChangeShade,
    onChangeChroma,
  }) => {
    const [collapsed, setCollapsed] = useState(false)

    const stepHue = (delta: number) => {
      triggerHaptic('select', hapticsEnabled)
      onChangeHue((Math.round(baseHue) + delta + 360) % 360)
    }

    const stepPct = (current: number, delta: number, cb: (v: number) => void) => {
      triggerHaptic('select', hapticsEnabled)
      cb(Math.max(0, Math.min(1, Math.round((current + delta) * 100) / 100)))
    }

    const rows = [
      {
        label: t.hueLabel,
        valueText: Math.round(baseHue) + '°',
        min: 0,
        max: 359,
        step: 1,
        value: Math.round(baseHue),
        onSlider: (v: number) => onChangeHue(v),
        onMinus: () => stepHue(-5),
        onPlus: () => stepHue(5),
      },
      {
        label: t.tintLabel,
        valueText: Math.round(tintWhite * 100) + '%',
        min: 0,
        max: 100,
        step: 1,
        value: Math.round(tintWhite * 100),
        onSlider: (v: number) => onChangeTint(v / 100),
        onMinus: () => stepPct(tintWhite, -0.05, onChangeTint),
        onPlus: () => stepPct(tintWhite, 0.05, onChangeTint),
      },
      {
        label: t.shadeLabel,
        valueText: Math.round(shadeBlack * 100) + '%',
        min: 0,
        max: 100,
        step: 1,
        value: Math.round(shadeBlack * 100),
        onSlider: (v: number) => onChangeShade(v / 100),
        onMinus: () => stepPct(shadeBlack, -0.05, onChangeShade),
        onPlus: () => stepPct(shadeBlack, 0.05, onChangeShade),
      },
      {
        label: t.chromaLabel,
        valueText: Math.round(chromaScale * 100) + '%',
        min: 15,
        max: 100,
        step: 1,
        value: Math.round(chromaScale * 100),
        onSlider: (v: number) => onChangeChroma(v / 100),
        onMinus: () => stepPct(chromaScale, -0.05, (v) => onChangeChroma(Math.max(0.15, v))),
        onPlus: () => stepPct(chromaScale, 0.05, onChangeChroma),
      },
    ]

    return (
      <div
        className="rounded-3xl border px-4 pb-4 pt-3 transition-colors duration-200"
        style={{
          backgroundColor: tokens.cardBg,
          borderColor: tokens.border,
          boxShadow: tokens.shadowCard,
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-[50px] h-[50px] rounded-2xl shrink-0 border"
              style={{
                backgroundColor: primaryHex,
                borderColor: tokens.strongBorder,
              }}
            />
            <div className="min-w-0">
              <div className="text-[14px] font-semibold tracking-tight truncate" style={{ color: tokens.ink }}>
                {t.toneTitle}
              </div>
              <div className="text-[11px] font-mono truncate" style={{ color: tokens.muted }}>
                {primaryHex} · {formatOklch(primaryHex)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap', hapticsEnabled)
              setCollapsed((prev) => !prev)
            }}
            aria-label={t.toneTitle}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors"
            style={{
              backgroundColor: tokens.elevatedBg,
              borderColor: tokens.border,
              color: tokens.muted,
            }}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.label} className="min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
                  <span
                    className="text-[11px] font-medium uppercase tracking-wider truncate"
                    style={{ color: tokens.muted }}
                  >
                    {row.label}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[12px] font-mono font-semibold tabular-nums" style={{ color: tokens.ink }}>
                      {row.valueText}
                    </span>
                    <button
                      type="button"
                      onClick={row.onMinus}
                      className="w-7 h-7 rounded-full border text-[15px] leading-none flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: tokens.elevatedBg,
                        borderColor: tokens.border,
                        color: tokens.ink,
                      }}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={row.onPlus}
                      className="w-7 h-7 rounded-full border text-[15px] leading-none flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: tokens.elevatedBg,
                        borderColor: tokens.border,
                        color: tokens.ink,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={row.min}
                  max={row.max}
                  step={row.step}
                  value={row.value}
                  onChange={(e) => row.onSlider(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    backgroundColor: tokens.trackBg,
                    accentColor: tokens.activeTintBorder,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)

type SoleColorCardProps = {
  t: ColorsTranslation
  tokens: ThemeTokens
  soleConfig: SoleColorConfig
  hapticsEnabled: boolean
  onChangeSole: (next: SoleColorConfig) => void
  onResetSole: () => void
}

export const SoleColorCard: React.FC<SoleColorCardProps> = ({
  t,
  tokens,
  soleConfig,
  hapticsEnabled,
  onChangeSole,
  onResetSole,
}) => {
  const [hexDraft, setHexDraft] = useState(soleConfig.customHex)

  const handleCustomHex = (raw: string) => {
    setHexDraft(raw)
    const normalized = normalizeHex(raw, '')
    if (normalized) {
      onChangeSole({ presetId: 'custom', customHex: normalized })
    }
  }

  return (
    <div
      className="rounded-3xl border p-4 transition-colors duration-200"
      style={{
        backgroundColor: tokens.cardBg,
        borderColor: tokens.border,
        boxShadow: tokens.shadowCard,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold tracking-tight" style={{ color: tokens.ink }}>
            {t.soleTitle}
          </div>
          <div className="text-[11px] mt-0.5 leading-snug" style={{ color: tokens.muted }}>
            {t.soleSubtitle}
          </div>
        </div>
        {soleConfig.presetId !== 'white' && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('reset', hapticsEnabled)
              setHexDraft('#FAF8F4')
              onResetSole()
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[11px] font-medium shrink-0 transition-colors"
            style={{
              backgroundColor: tokens.elevatedBg,
              borderColor: tokens.border,
              color: tokens.ink,
            }}
          >
            <RotateCcw className="w-3 h-3" />
            {t.soleReset}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {SOLE_PRESETS.map((preset) => {
          const active = soleConfig.presetId === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                triggerHaptic('select', hapticsEnabled)
                onChangeSole({ presetId: preset.id, customHex: preset.midsole })
              }}
              className="flex items-center gap-2 p-2.5 rounded-2xl border text-left transition-colors min-w-0"
              style={{
                backgroundColor: active ? tokens.activeTintBg : tokens.elevatedBg,
                borderColor: active ? tokens.activeTintBorder : tokens.border,
                color: tokens.ink,
              }}
            >
              <span
                className="w-6 h-6 rounded-full shrink-0 border flex items-center justify-center"
                style={{
                  background: `linear-gradient(180deg, ${preset.midsole} 62%, ${preset.outsole} 62%)`,
                  borderColor: tokens.strongBorder,
                }}
              >
                {active && (
                  <Check
                    className="w-3 h-3"
                    style={{
                      color: preset.id === 'black' || preset.id === 'graphite' ? '#FAF8F4' : '#1C1A17',
                    }}
                  />
                )}
              </span>
              <span className="text-[11px] font-medium truncate">{t.solePresets[preset.id]}</span>
            </button>
          )
        })}
      </div>

      <div
        className="mt-3 pt-3 border-t flex items-center justify-between gap-2"
        style={{ borderColor: tokens.border }}
      >
        <span className="text-[11px] font-medium" style={{ color: tokens.muted }}>
          {t.soleCustom}
        </span>
        <div className="flex items-center gap-2">
          <label
            className="w-7 h-7 rounded-full border overflow-hidden cursor-pointer shrink-0 block"
            style={{
              backgroundColor: soleConfig.customHex,
              borderColor: soleConfig.presetId === 'custom' ? tokens.activeTintBorder : tokens.strongBorder,
            }}
          >
            <input
              type="color"
              value={normalizeHex(soleConfig.customHex, '#FAF8F4')}
              onChange={(e) => {
                const nextHex = e.target.value.toUpperCase()
                setHexDraft(nextHex)
                onChangeSole({ presetId: 'custom', customHex: nextHex })
              }}
              className="opacity-0 w-full h-full cursor-pointer"
            />
          </label>
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => handleCustomHex(e.target.value)}
            maxLength={7}
            className="w-[84px] px-2.5 py-1.5 rounded-xl border text-[12px] font-mono uppercase focus:outline-none"
            style={{
              backgroundColor: tokens.elevatedBg,
              borderColor: soleConfig.presetId === 'custom' ? tokens.activeTintBorder : tokens.border,
              color: tokens.ink,
            }}
          />
        </div>
      </div>
    </div>
  )
}

type StudioBgCardProps = {
  t: ColorsTranslation
  tokens: ThemeTokens
  studioBg: StudioBgConfig
  hapticsEnabled: boolean
  onChangeStudioBg: (next: StudioBgConfig) => void
}

export const StudioBgCard: React.FC<StudioBgCardProps> = ({
  t,
  tokens,
  studioBg,
  hapticsEnabled,
  onChangeStudioBg,
}) => {
  const [hexDraft, setHexDraft] = useState(studioBg.customHex)

  const handleCustomHex = (raw: string) => {
    setHexDraft(raw)
    const normalized = normalizeHex(raw, '')
    if (normalized) {
      onChangeStudioBg({ ...studioBg, id: 'custom', customHex: normalized })
    }
  }

  return (
    <div
      className="rounded-3xl border p-4 transition-colors duration-200"
      style={{
        backgroundColor: tokens.cardBg,
        borderColor: tokens.border,
        boxShadow: tokens.shadowCard,
      }}
    >
      <div className="mb-3">
        <div className="text-[14px] font-semibold tracking-tight" style={{ color: tokens.ink }}>
          {t.bgTitle}
        </div>
        <div className="text-[11px] mt-0.5 leading-snug" style={{ color: tokens.muted }}>
          {t.bgSubtitle}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {STUDIO_BG_PRESETS.map((preset) => {
          const active = studioBg.id === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                triggerHaptic('select', hapticsEnabled)
                onChangeStudioBg({ ...studioBg, id: preset.id, customHex: preset.hex })
              }}
              className="flex items-center gap-2 p-2.5 rounded-2xl border text-left transition-colors min-w-0"
              style={{
                backgroundColor: active ? tokens.activeTintBg : tokens.elevatedBg,
                borderColor: active ? tokens.activeTintBorder : tokens.border,
                color: tokens.ink,
              }}
            >
              <span
                className="w-6 h-6 rounded-full shrink-0 border flex items-center justify-center"
                style={{
                  backgroundColor: preset.hex,
                  borderColor: tokens.strongBorder,
                }}
              >
                {active && (
                  <Check
                    className="w-3 h-3"
                    style={{
                      color: preset.id === 'black' || preset.id === 'graphite' ? '#FAF8F4' : '#1C1A17',
                    }}
                  />
                )}
              </span>
              <span className="text-[11px] font-medium truncate">{t.bgPresets[preset.id]}</span>
            </button>
          )
        })}

        <label
          className="flex items-center gap-2 p-2.5 rounded-2xl border text-left cursor-pointer transition-colors min-w-0"
          style={{
            backgroundColor: studioBg.id === 'custom' ? tokens.activeTintBg : tokens.elevatedBg,
            borderColor: studioBg.id === 'custom' ? tokens.activeTintBorder : tokens.border,
            color: tokens.ink,
          }}
        >
          <span
            className="w-6 h-6 rounded-full shrink-0 border relative overflow-hidden"
            style={{
              backgroundColor: studioBg.customHex,
              borderColor: tokens.strongBorder,
            }}
          >
            <input
              type="color"
              value={normalizeHex(studioBg.customHex, '#F5F1EB')}
              onChange={(e) => {
                const nextHex = e.target.value.toUpperCase()
                setHexDraft(nextHex)
                onChangeStudioBg({ ...studioBg, id: 'custom', customHex: nextHex })
              }}
              className="opacity-0 inset-0 absolute w-full h-full cursor-pointer"
            />
          </span>
          <span className="text-[11px] font-medium truncate">{t.bgCustom}</span>
        </label>
      </div>

      {studioBg.id === 'custom' && (
        <div
          className="mt-3 pt-3 border-t flex items-center justify-between gap-2"
          style={{ borderColor: tokens.border }}
        >
          <span className="text-[11px] font-medium" style={{ color: tokens.muted }}>
            HEX
          </span>
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => handleCustomHex(e.target.value)}
            maxLength={7}
            className="w-[92px] px-2.5 py-1.5 rounded-xl border text-[12px] font-mono uppercase focus:outline-none"
            style={{
              backgroundColor: tokens.elevatedBg,
              borderColor: tokens.activeTintBorder,
              color: tokens.ink,
            }}
          />
        </div>
      )}

      <div
        className="mt-3 pt-3 border-t flex items-center justify-between gap-3"
        style={{ borderColor: tokens.border }}
      >
        <div className="min-w-0">
          <div className="text-[12px] font-medium" style={{ color: tokens.ink }}>
            {t.bgAutoContrast}
          </div>
          <div className="text-[11px] leading-snug" style={{ color: tokens.muted }}>
            {t.bgAutoContrastDesc}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={studioBg.autoContrast}
          onClick={() => {
            triggerHaptic('select', hapticsEnabled)
            onChangeStudioBg({ ...studioBg, autoContrast: !studioBg.autoContrast })
          }}
          className="w-12 h-7 rounded-full p-0.5 transition-colors shrink-0 relative"
          style={{
            backgroundColor: studioBg.autoContrast ? tokens.activeTintBorder : tokens.trackBg,
          }}
        >
          <span
            className="block w-6 h-6 rounded-full bg-white shadow transition-transform duration-200"
            style={{
              transform: studioBg.autoContrast ? 'translateX(20px)' : 'translateX(0px)',
            }}
          />
        </button>
      </div>
    </div>
  )
}

type StudioSettingsViewProps = {
  t: ColorsTranslation
  tokens: ThemeTokens
  lang: Lang
  modelMode: ColorModelMode
  hapticsEnabled: boolean
  studioBg: StudioBgConfig
  soleConfig: SoleColorConfig
  onChangeStudioBg: (next: StudioBgConfig) => void
  onChangeSole: (next: SoleColorConfig) => void
  onResetSole: () => void
  onChangeModelMode: (next: ColorModelMode) => void
  onToggleHaptics: () => void
  onChangeLang: (next: Lang) => void
  onOpenGuide: () => void
}

export const StudioSettingsView: React.FC<StudioSettingsViewProps> = ({
  t,
  tokens,
  lang,
  modelMode,
  hapticsEnabled,
  studioBg,
  soleConfig,
  onChangeStudioBg,
  onChangeSole,
  onResetSole,
  onChangeModelMode,
  onToggleHaptics,
  onChangeLang,
  onOpenGuide,
}) => {
  return (
    <div className="space-y-3.5 pb-6">
      <StudioBgCard
        t={t}
        tokens={tokens}
        studioBg={studioBg}
        hapticsEnabled={hapticsEnabled}
        onChangeStudioBg={onChangeStudioBg}
      />

      <SoleColorCard
        t={t}
        tokens={tokens}
        soleConfig={soleConfig}
        hapticsEnabled={hapticsEnabled}
        onChangeSole={onChangeSole}
        onResetSole={onResetSole}
      />

      <div
        className="rounded-3xl border p-4 space-y-4"
        style={{
          backgroundColor: tokens.cardBg,
          borderColor: tokens.border,
          boxShadow: tokens.shadowCard,
        }}
      >
        <div className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: tokens.ink }}>
          <Sliders className="w-4 h-4" style={{ color: tokens.activeTintBorder }} />
          {t.interfaceBlock}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-medium" style={{ color: tokens.ink }}>
            {t.wheelModelLabel}
          </span>
          <div
            className="inline-flex p-1 rounded-full border"
            style={{ backgroundColor: tokens.elevatedBg, borderColor: tokens.border }}
          >
            {(['ryb', 'oklch'] as const).map((m) => {
              const active = modelMode === m || (m === 'oklch' && modelMode === 'hsl')
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    triggerHaptic('select', hapticsEnabled)
                    onChangeModelMode(m)
                  }}
                  className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase transition-colors"
                  style={{
                    backgroundColor: active ? tokens.activeTintBg : 'transparent',
                    color: active ? tokens.activeTintInk : tokens.muted,
                  }}
                >
                  {m.toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>

        <div
          className="pt-3 border-t flex items-center justify-between gap-3"
          style={{ borderColor: tokens.border }}
        >
          <div className="min-w-0">
            <div className="text-[12px] font-medium" style={{ color: tokens.ink }}>
              {t.hapticsLabel}
            </div>
            <div className="text-[11px]" style={{ color: tokens.muted }}>
              {t.hapticsDesc}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hapticsEnabled}
            onClick={onToggleHaptics}
            className="w-12 h-7 rounded-full p-0.5 transition-colors shrink-0"
            style={{
              backgroundColor: hapticsEnabled ? tokens.activeTintBorder : tokens.trackBg,
            }}
          >
            <span
              className="block w-6 h-6 rounded-full bg-white shadow transition-transform duration-200"
              style={{
                transform: hapticsEnabled ? 'translateX(20px)' : 'translateX(0px)',
              }}
            />
          </button>
        </div>

        <div
          className="pt-3 border-t flex items-center justify-between gap-3"
          style={{ borderColor: tokens.border }}
        >
          <span className="text-[12px] font-medium" style={{ color: tokens.ink }}>
            {t.langLabel}
          </span>
          <div
            className="inline-flex p-1 rounded-full border"
            style={{ backgroundColor: tokens.elevatedBg, borderColor: tokens.border }}
          >
            {(['ru', 'uk', 'de'] as Lang[]).map((code) => {
              const active = lang === code
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    triggerHaptic('select', hapticsEnabled)
                    onChangeLang(code)
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase transition-colors"
                  style={{
                    backgroundColor: active ? tokens.activeTintBg : 'transparent',
                    color: active ? tokens.activeTintInk : tokens.muted,
                  }}
                >
                  {code === 'uk' ? 'UKR' : code.toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('tap', hapticsEnabled)
            onOpenGuide()
          }}
          className="w-full py-2.5 px-4 rounded-2xl border text-[12px] font-semibold flex items-center justify-center gap-2 transition-colors"
          style={{
            backgroundColor: tokens.elevatedBg,
            borderColor: tokens.border,
            color: tokens.ink,
          }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: tokens.activeTintBorder }} />
          {t.guideSections.title}
        </button>
      </div>
    </div>
  )
}

type GuideModalProps = {
  t: ColorsTranslation
  tokens: ThemeTokens
  onClose: () => void
}

export const GuideModal: React.FC<GuideModalProps> = ({ t, tokens, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6"
      style={{ backgroundColor: 'rgba(10, 10, 12, 0.56)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border p-5 max-h-[82vh] overflow-y-auto"
        style={{
          backgroundColor: tokens.cardBg,
          borderColor: tokens.strongBorder,
          boxShadow: tokens.shadowCard,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-[16px] font-semibold tracking-tight" style={{ color: tokens.ink }}>
            {t.guideSections.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border flex items-center justify-center"
            style={{
              backgroundColor: tokens.elevatedBg,
              borderColor: tokens.border,
              color: tokens.muted,
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          {t.guideSections.items.map((item) => (
            <div
              key={item.heading}
              className="rounded-2xl border p-3.5"
              style={{
                backgroundColor: tokens.elevatedBg,
                borderColor: tokens.border,
              }}
            >
              <div className="text-[13px] font-semibold mb-1" style={{ color: tokens.ink }}>
                {item.heading}
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: tokens.muted }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-3 rounded-2xl text-[13px] font-semibold transition-colors"
          style={{
            backgroundColor: tokens.primaryBtnBg,
            color: tokens.primaryBtnInk,
          }}
        >
          {t.guideSections.close}
        </button>
      </div>
    </div>
  )
}

