import React, { useEffect, useState } from 'react'
import { RotateCcw, Check, BookOpen, X } from 'lucide-react'
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
      <div className="space-y-4">
        <div
          className="flex items-center justify-between gap-3 pb-3 border-b"
          style={{ borderColor: tokens.border }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-8 h-8 rounded-lg shrink-0 border"
              style={{
                backgroundColor: primaryHex,
                borderColor: tokens.strongBorder,
              }}
            />
            <div className="min-w-0">
              <div className="text-[14px] font-medium tracking-tight" style={{ color: tokens.ink }}>
                {t.toneTitle}
              </div>
              <div className="text-[12px] font-mono tabular-nums truncate" style={{ color: tokens.muted }}>
                {primaryHex} · {formatOklch(primaryHex)}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <div className="flex items-center justify-between gap-3 mb-2 min-w-0">
                <span className="text-[13px] font-medium" style={{ color: tokens.ink }}>
                  {row.label}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[13px] font-mono tabular-nums w-11 text-right"
                    style={{ color: tokens.muted }}
                  >
                    {row.valueText}
                  </span>
                  <button
                    type="button"
                    onClick={row.onMinus}
                    aria-label={row.label + ' -'}
                    className="w-8 h-8 rounded-lg border text-[16px] leading-none flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: tokens.cardBg,
                      borderColor: tokens.border,
                      color: tokens.ink,
                    }}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={row.onPlus}
                    aria-label={row.label + ' +'}
                    className="w-8 h-8 rounded-lg border text-[16px] leading-none flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: tokens.cardBg,
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

const EXTRA_SOLE_TONES = ['#F0EAE0', '#D8CFC2', '#7A746B', '#4A3728']

export const SoleColorCard: React.FC<SoleColorCardProps> = ({
  t,
  tokens,
  soleConfig,
  hapticsEnabled,
  onChangeSole,
  onResetSole,
}) => {
  const [hexDraft, setHexDraft] = useState(soleConfig.customHex)

  useEffect(() => {
    setHexDraft(soleConfig.customHex)
  }, [soleConfig.customHex])

  const handleCustomHex = (raw: string) => {
    const cleaned = raw.startsWith('#') ? raw : '#' + raw
    setHexDraft(cleaned.toUpperCase())
    const normalized = normalizeHex(cleaned, '')
    if (normalized) {
      onChangeSole({ presetId: 'custom', customHex: normalized })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-medium tracking-tight" style={{ color: tokens.ink }}>
            {t.soleTitle}
          </div>
          <div className="text-[13px] mt-0.5 leading-snug" style={{ color: tokens.muted }}>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium shrink-0 transition-colors"
            style={{
              backgroundColor: tokens.cardBg,
              borderColor: tokens.border,
              color: tokens.ink,
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.soleReset}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
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
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-colors"
              style={{
                backgroundColor: active ? tokens.activeTintBg : tokens.cardBg,
                borderColor: active ? tokens.activeTintBorder : tokens.border,
                color: tokens.ink,
              }}
            >
              <span
                className="w-7 h-7 rounded-full shrink-0 border flex items-center justify-center"
                style={{
                  background: `linear-gradient(180deg, ${preset.midsole} 62%, ${preset.outsole} 62%)`,
                  borderColor: tokens.strongBorder,
                }}
              >
                {active && (
                  <Check
                    className="w-3.5 h-3.5"
                    style={{
                      color: preset.id === 'black' || preset.id === 'graphite' ? '#F4F0E8' : '#181613',
                    }}
                  />
                )}
              </span>
              <span className="text-[13px] font-medium leading-tight">
                {t.solePresets[preset.id]}
              </span>
            </button>
          )
        })}
      </div>

      <div
        className="pt-4 border-t flex flex-wrap items-center justify-between gap-3"
        style={{ borderColor: tokens.border }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium" style={{ color: tokens.muted }}>
            {t.soleCustom}
          </span>
          <div className="flex items-center gap-1.5">
            {EXTRA_SOLE_TONES.map((tone) => {
              const active = soleConfig.presetId === 'custom' && soleConfig.customHex === tone
              return (
                <button
                  key={tone}
                  type="button"
                  aria-label={tone}
                  onClick={() => {
                    triggerHaptic('select', hapticsEnabled)
                    setHexDraft(tone)
                    onChangeSole({ presetId: 'custom', customHex: tone })
                  }}
                  className="w-6 h-6 rounded-full border transition-transform"
                  style={{
                    backgroundColor: tone,
                    borderColor: active ? tokens.activeTintBorder : tokens.strongBorder,
                    boxShadow: active ? `0 0 0 2px ${tokens.activeTintBorder}` : 'none',
                  }}
                />
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg border shrink-0"
            style={{
              backgroundColor: normalizeHex(soleConfig.customHex, '#FAF8F4'),
              borderColor: tokens.strongBorder,
            }}
          />
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => handleCustomHex(e.target.value)}
            maxLength={7}
            spellCheck={false}
            className="w-[96px] px-3 py-1.5 rounded-lg border text-[13px] font-mono uppercase tracking-wider focus:outline-none"
            style={{
              backgroundColor: tokens.elevatedBg,
              borderColor: soleConfig.presetId === 'custom' ? tokens.activeTintBorder : tokens.strongBorder,
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

const EXTRA_BG_TONES = ['#EDE8DF', '#D6D2C9', '#383633', '#191B1E']

export const StudioBgCard: React.FC<StudioBgCardProps> = ({
  t,
  tokens,
  studioBg,
  hapticsEnabled,
  onChangeStudioBg,
}) => {
  const [hexDraft, setHexDraft] = useState(studioBg.customHex)

  useEffect(() => {
    setHexDraft(studioBg.customHex)
  }, [studioBg.customHex])

  const handleCustomHex = (raw: string) => {
    const cleaned = raw.startsWith('#') ? raw : '#' + raw
    setHexDraft(cleaned.toUpperCase())
    const normalized = normalizeHex(cleaned, '')
    if (normalized) {
      onChangeStudioBg({ ...studioBg, id: 'custom', customHex: normalized })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[15px] font-medium tracking-tight" style={{ color: tokens.ink }}>
          {t.bgTitle}
        </div>
        <div className="text-[13px] mt-0.5 leading-snug" style={{ color: tokens.muted }}>
          {t.bgSubtitle}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
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
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-colors"
              style={{
                backgroundColor: active ? tokens.activeTintBg : tokens.cardBg,
                borderColor: active ? tokens.activeTintBorder : tokens.border,
                color: tokens.ink,
              }}
            >
              <span
                className="w-7 h-7 rounded-full shrink-0 border flex items-center justify-center"
                style={{
                  backgroundColor: preset.hex,
                  borderColor: tokens.strongBorder,
                }}
              >
                {active && (
                  <Check
                    className="w-3.5 h-3.5"
                    style={{
                      color: preset.id === 'black' || preset.id === 'graphite' ? '#F4F0E8' : '#181613',
                    }}
                  />
                )}
              </span>
              <span className="text-[13px] font-medium leading-tight">
                {t.bgPresets[preset.id]}
              </span>
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => {
            triggerHaptic('select', hapticsEnabled)
            onChangeStudioBg({ ...studioBg, id: 'custom' })
          }}
          className="flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-colors"
          style={{
            backgroundColor: studioBg.id === 'custom' ? tokens.activeTintBg : tokens.cardBg,
            borderColor: studioBg.id === 'custom' ? tokens.activeTintBorder : tokens.border,
            color: tokens.ink,
          }}
        >
          <span
            className="w-7 h-7 rounded-full shrink-0 border"
            style={{
              backgroundColor: normalizeHex(studioBg.customHex, '#F4F1EA'),
              borderColor: tokens.strongBorder,
            }}
          />
          <span className="text-[13px] font-medium leading-tight">{t.bgCustom}</span>
        </button>
      </div>

      {studioBg.id === 'custom' && (
        <div
          className="pt-3 border-t flex flex-wrap items-center justify-between gap-3"
          style={{ borderColor: tokens.border }}
        >
          <div className="flex items-center gap-1.5">
            {EXTRA_BG_TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                aria-label={tone}
                onClick={() => {
                  triggerHaptic('select', hapticsEnabled)
                  setHexDraft(tone)
                  onChangeStudioBg({ ...studioBg, id: 'custom', customHex: tone })
                }}
                className="w-6 h-6 rounded-full border"
                style={{
                  backgroundColor: tone,
                  borderColor: studioBg.customHex === tone ? tokens.activeTintBorder : tokens.strongBorder,
                }}
              />
            ))}
          </div>
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => handleCustomHex(e.target.value)}
            maxLength={7}
            spellCheck={false}
            className="w-[96px] px-3 py-1.5 rounded-lg border text-[13px] font-mono uppercase tracking-wider focus:outline-none"
            style={{
              backgroundColor: tokens.elevatedBg,
              borderColor: tokens.activeTintBorder,
              color: tokens.ink,
            }}
          />
        </div>
      )}

      <div
        className="pt-4 border-t flex items-center justify-between gap-4"
        style={{ borderColor: tokens.border }}
      >
        <div className="min-w-0">
          <div className="text-[14px] font-medium" style={{ color: tokens.ink }}>
            {t.bgAutoContrast}
          </div>
          <div className="text-[12px] leading-snug mt-0.5" style={{ color: tokens.muted }}>
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
          className="w-12 h-7 rounded-full p-0.5 transition-colors shrink-0"
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
    <div className="space-y-7 pb-8">
      <section>
        <StudioBgCard
          t={t}
          tokens={tokens}
          studioBg={studioBg}
          hapticsEnabled={hapticsEnabled}
          onChangeStudioBg={onChangeStudioBg}
        />
      </section>

      <section className="pt-6 border-t" style={{ borderColor: tokens.border }}>
        <SoleColorCard
          t={t}
          tokens={tokens}
          soleConfig={soleConfig}
          hapticsEnabled={hapticsEnabled}
          onChangeSole={onChangeSole}
          onResetSole={onResetSole}
        />
      </section>

      <section className="pt-6 border-t space-y-4" style={{ borderColor: tokens.border }}>
        <div className="text-[15px] font-medium tracking-tight" style={{ color: tokens.ink }}>
          {t.interfaceBlock}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium" style={{ color: tokens.ink }}>
            {t.wheelModelLabel}
          </span>
          <div
            className="inline-flex p-0.5 rounded-lg border"
            style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
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
                  className="px-3.5 py-1.5 rounded-md text-[12px] font-medium uppercase transition-colors"
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
          className="pt-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor: tokens.border }}
        >
          <div className="min-w-0">
            <div className="text-[13px] font-medium" style={{ color: tokens.ink }}>
              {t.hapticsLabel}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: tokens.muted }}>
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
          className="pt-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor: tokens.border }}
        >
          <span className="text-[13px] font-medium" style={{ color: tokens.ink }}>
            {t.langLabel}
          </span>
          <div
            className="inline-flex p-0.5 rounded-lg border"
            style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
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
                  className="px-3 py-1.5 rounded-md text-[12px] font-medium uppercase transition-colors"
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
          className="w-full py-3 px-4 rounded-xl border text-[13px] font-medium flex items-center justify-center gap-2 transition-colors"
          style={{
            backgroundColor: tokens.cardBg,
            borderColor: tokens.border,
            color: tokens.ink,
          }}
        >
          <BookOpen className="w-4 h-4" style={{ color: tokens.activeTintBorder }} />
          {t.guideSections.title}
        </button>
      </section>
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ backgroundColor: 'rgba(8, 8, 10, 0.64)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border p-6 max-h-[84vh] overflow-y-auto"
        style={{
          backgroundColor: tokens.pageBg,
          borderColor: tokens.strongBorder,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 pb-4 border-b" style={{ borderColor: tokens.border }}>
          <h3
            className="text-[20px] font-medium tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: tokens.ink }}
          >
            {t.guideSections.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.guideSections.close}
            className="w-9 h-9 rounded-full border flex items-center justify-center"
            style={{
              backgroundColor: tokens.cardBg,
              borderColor: tokens.border,
              color: tokens.muted,
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y" style={{ borderColor: tokens.border }}>
          {t.guideSections.items.map((item) => (
            <div key={item.heading} className="py-4" style={{ borderColor: tokens.border }}>
              <div className="text-[14px] font-semibold mb-1.5" style={{ color: tokens.ink }}>
                {item.heading}
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: tokens.muted }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-3 rounded-xl text-[13px] font-semibold transition-colors"
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
