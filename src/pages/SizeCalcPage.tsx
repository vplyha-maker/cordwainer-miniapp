import { useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'
import type { Lang } from '../App'
import {
  convertShoeSize,
  formatSize,
  RANGES,
  type Gender,
} from '../lib/shoeSizes'

type SizeCalcPageProps = {
  onBack: () => void
  lang: Lang
}

/* ---------- Мини-флаги (SVG) ---------- */
const FlagEU = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden">
    <rect width="18" height="12" fill="#003399" />
    <g fill="#FFCC00">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180)
        const cx = 9 + 3.8 * Math.cos(angle)
        const cy = 6 + 3.8 * Math.sin(angle)
        return (
          <circle key={i} cx={cx} cy={cy} r="0.55" />
        )
      })}
    </g>
  </svg>
)

const FlagUK = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden">
    <rect width="18" height="12" fill="#012169" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#fff" strokeWidth="2" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#C8102E" strokeWidth="1" />
    <path d="M9 0 V12 M0 6 H18" stroke="#fff" strokeWidth="3.2" />
    <path d="M9 0 V12 M0 6 H18" stroke="#C8102E" strokeWidth="1.6" />
  </svg>
)

const FlagUS = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden">
    <rect width="18" height="12" fill="#B22234" />
    <rect y="1.33" width="18" height="1.33" fill="#fff" />
    <rect y="4" width="18" height="1.33" fill="#fff" />
    <rect y="6.67" width="18" height="1.33" fill="#fff" />
    <rect y="9.33" width="18" height="1.33" fill="#fff" />
    <rect width="7.2" height="6.5" fill="#3C3B6E" />
  </svg>
)

const FlagUA = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden">
    <rect width="18" height="6" fill="#0057B7" />
    <rect y="6" width="18" height="6" fill="#FFD700" />
  </svg>
)

export function SizeCalcPage({ onBack, lang }: SizeCalcPageProps) {
  const [gender, setGender] = useState<Gender>('men')
  const [unit, setUnit] = useState<'cm' | 'mm'>('cm')
  const [footMm, setFootMm] = useState<number>(RANGES.men.default)

  const range = RANGES[gender]

  const handleGenderChange = useCallback((g: Gender) => {
    setGender(g)
    const r = RANGES[g]
    setFootMm((prev) => Math.min(r.max, Math.max(r.min, prev)))
  }, [])

  const result = useMemo(
    () => convertShoeSize(footMm, gender),
    [footMm, gender]
  )

  const displayValue =
    unit === 'cm'
      ? (footMm / 10).toFixed(1).replace('.', ',')
      : String(Math.round(footMm))

  const displayUnit = unit === 'cm' ? 'см' : 'мм'

  const triggerHaptic = (style: 'light' | 'medium' = 'light') => {
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred(style)
      } else if (navigator.vibrate) {
        navigator.vibrate(style === 'light' ? 20 : 40)
      }
    }
  }

  const t = {
    ru: {
      title: 'Размер обуви',
      subtitle: 'Рекомендация размера\nпо длине стопы',
      step1: 'Длина вашей стопы',
      step1Hint: 'Измерьте от пятки до самого длинного пальца.',
      step2: 'Рекомендованный размер',
      recommended: 'Рекомендованный размер',
      disclaimer:
        'Рекомендации ориентировочные. Размеры могут отличаться в зависимости от колодки и фасона.',
      more: 'Подробнее',
      sizeChart: 'Размерная сетка',
      sizeChartSub: 'Таблицы размеров разных систем',
      howToMeasure: 'Как правильно измерить стопу',
      howToMeasureSub: 'Пошаговая инструкция',
      save: 'Сохранить результат',
      men: 'Мужская',
      women: 'Женская',
      kids: 'Детская',
      cm: 'СМ',
      mm: 'ММ',
      uk: 'UK',
      usM: 'US (M)',
      usW: 'US (W)',
      us: 'US',
      eu: 'EU / UKR',
      cmLabel: 'CM',
    },
    uk: {
      title: 'Розмір взуття',
      subtitle: 'Рекомендація розміру\nза довжиною стопи',
      step1: 'Довжина вашої стопи',
      step1Hint: 'Виміряйте від п’яти до найдовшого пальця.',
      step2: 'Рекомендований розмір',
      recommended: 'Рекомендований розмір',
      disclaimer:
        'Рекомендації є орієнтовними. Розміри можуть відрізнятися залежно від колодки та фасону.',
      more: 'Детальніше',
      sizeChart: 'Розмірна сітка',
      sizeChartSub: 'Таблиці розмірів різних систем',
      howToMeasure: 'Як правильно виміряти стопу',
      howToMeasureSub: 'Покрокова інструкція',
      save: 'Зберегти результат',
      men: 'Чоловіче',
      women: 'Жіноче',
      kids: 'Дитяче',
      cm: 'СМ',
      mm: 'ММ',
      uk: 'UK',
      usM: 'US (M)',
      usW: 'US (W)',
      us: 'US',
      eu: 'EU / UKR',
      cmLabel: 'CM',
    },
  }[lang]

  const usLabel = gender === 'kids' ? t.us : gender === 'men' ? t.usM : t.usW
  const pct = ((footMm - range.min) / (range.max - range.min)) * 100

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative flex flex-col h-[100dvh] bg-[#0F0D0B] text-[#F5F1EB] overflow-hidden"
    >
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-4 pb-2">
        <button
          aria-label="Back"
          onClick={() => {
            triggerHaptic('light')
            onBack()
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1D1815]/90 border border-white/10 text-[#F5F1EB] active:scale-90 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="text-center">
          <h1 className="text-[17px] font-medium text-[#F5F1EB] tracking-wide">
            {t.title}
          </h1>
          <p className="text-[11px] text-[#8F867E] leading-tight whitespace-pre-line mt-0.5">
            {t.subtitle}
          </p>
        </div>

        <button
          aria-label="Bookmark"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1D1815]/90 border border-white/10 text-[#C6A47A] active:scale-90 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 scrollbar-hide">
        {/* Gender selector */}
        <div className="mt-3 mb-5 flex p-1 rounded-2xl bg-[#1A1613] border border-white/5">
          {(['men', 'women', 'kids'] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => {
                triggerHaptic('light')
                handleGenderChange(g)
              }}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                gender === g
                  ? 'bg-[#C6A47A]/15 text-[#E8C9A0] shadow-sm'
                  : 'text-[#8F867E]'
              }`}
            >
              {g === 'men' ? t.men : g === 'women' ? t.women : t.kids}
            </button>
          ))}
        </div>

        {/* Step 1: Foot length */}
        <div className="rounded-2xl bg-[#1A1613] border border-white/5 p-4 mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#C6A47A]/15 text-[#C6A47A] text-[11px] font-semibold flex items-center justify-center">
                1
              </span>
              <span className="text-[14px] font-medium text-[#F5F1EB]">
                {t.step1}
              </span>
            </div>

            <div className="flex rounded-full bg-[#12100E] p-0.5 border border-white/5">
              <button
                onClick={() => {
                  triggerHaptic('light')
                  setUnit('cm')
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  unit === 'cm' ? 'bg-[#C6A47A] text-[#12100E]' : 'text-[#8F867E]'
                }`}
              >
                {t.cm}
              </button>
              <button
                onClick={() => {
                  triggerHaptic('light')
                  setUnit('mm')
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  unit === 'mm' ? 'bg-[#C6A47A] text-[#12100E]' : 'text-[#8F867E]'
                }`}
              >
                {t.mm}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-[#8F867E] mb-5 pl-7">{t.step1Hint}</p>

          <div className="text-center mb-6">
            <span className="text-[48px] font-light tracking-tight text-[#E8C9A0] leading-none">
              {displayValue}
            </span>
            <span className="text-[18px] text-[#8F867E] ml-1.5 align-top">
              {displayUnit}
            </span>
          </div>

          <div className="relative px-1">
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={1}
              value={footMm}
              onChange={(e) => setFootMm(Number(e.target.value))}
              onPointerUp={() => triggerHaptic('light')}
              className="w-full h-1.5 appearance-none bg-transparent cursor-pointer relative z-10
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-[#E8C9A0]
                [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-[#C6A47A]
                [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(198,164,122,0.5)]
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-5
                [&::-moz-range-thumb]:h-5
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-[#E8C9A0]
                [&::-moz-range-thumb]:border-2
                [&::-moz-range-thumb]:border-[#C6A47A]
                [&::-moz-range-thumb]:cursor-pointer"
              style={{
                background: `linear-gradient(to right, #C6A47A 0%, #C6A47A ${pct}%, #2A241F ${pct}%, #2A241F 100%)`,
                borderRadius: 999,
              }}
            />
            <div className="flex justify-between mt-2 text-[10px] text-[#6B635C]">
              <span>
                {unit === 'cm'
                  ? (range.min / 10).toFixed(1).replace('.', ',')
                  : range.min}{' '}
                {displayUnit}
              </span>
              <span>
                {unit === 'cm'
                  ? (range.max / 10).toFixed(1).replace('.', ',')
                  : range.max}{' '}
                {displayUnit}
              </span>
            </div>
          </div>
        </div>

        {/* Step 2: Recommended size */}
        <div className="rounded-2xl bg-[#1A1613] border border-white/5 p-4 mb-3">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-5 h-5 rounded-full bg-[#C6A47A]/15 text-[#C6A47A] text-[11px] font-semibold flex items-center justify-center">
              2
            </span>
            <span className="text-[14px] font-medium text-[#F5F1EB]">
              {t.step2}
            </span>
          </div>

          {/* Big EU / UKR card */}
          <div className="rounded-xl bg-[#12100E] border border-[#C6A47A]/20 p-5 mb-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <FlagEU />
              <FlagUA />
              <span className="text-[12px] text-[#8F867E] tracking-widest uppercase ml-1">
                {t.eu}
              </span>
            </div>
            <div className="text-[56px] font-light text-[#E8C9A0] leading-none tracking-tight">
              {formatSize(result.eu)}
            </div>
            <div className="text-[12px] text-[#8F867E] mt-1.5">
              {t.recommended}
            </div>
          </div>

          {/* Secondary sizes — 3 columns */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: t.uk,
                value: formatSize(result.uk),
                flag: <FlagUK />,
              },
              {
                label: usLabel,
                value: formatSize(result.us),
                flag: <FlagUS />,
              },
              {
                label: t.cmLabel,
                value: result.cm.toFixed(1).replace('.', ','),
                flag: null,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-[#12100E] border border-white/5 py-3 text-center"
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  {item.flag}
                  <span className="text-[10px] text-[#6B635C] uppercase tracking-wider">
                    {item.label}
                  </span>
                </div>
                <div className="text-[16px] font-medium text-[#F5F1EB]">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex gap-2.5 items-start px-1 mb-5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8F867E" strokeWidth="1.6" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <p className="text-[11px] text-[#8F867E] leading-snug">{t.disclaimer}</p>
        </div>

        {/* More section */}
        <div className="rounded-2xl bg-[#1A1613] border border-white/5 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-white/5">
            <span className="text-[13px] font-medium text-[#F5F1EB]">{t.more}</span>
          </div>

          <button
            onClick={() => triggerHaptic('light')}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-[#C6A47A]/10 text-[#C6A47A] flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9M15 21V9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#F5F1EB]">{t.sizeChart}</div>
              <div className="text-[11px] text-[#8F867E] truncate">{t.sizeChartSub}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B635C" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <div className="h-px bg-white/5 mx-4" />

          <button
            onClick={() => triggerHaptic('light')}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-[#C6A47A]/10 text-[#C6A47A] flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16l4-8 4 4 4-6 4 10" />
                <path d="M2 20h20" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#F5F1EB]">{t.howToMeasure}</div>
              <div className="text-[11px] text-[#8F867E] truncate">{t.howToMeasureSub}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B635C" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Save button */}
        <button
          onClick={() => triggerHaptic('medium')}
          className="w-full py-3.5 rounded-2xl border border-[#C6A47A]/40 bg-[#C6A47A]/10 text-[#E8C9A0] text-[14px] font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {t.save}
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
        <BottomDock active="workspace" lang={lang} />
      </div>
    </motion.div>
  )
}
