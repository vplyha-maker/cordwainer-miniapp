// src/pages/HeelCalcPage.tsx
import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'
import {
  HEEL_CONST,
  ROCKER_PRESETS,
  getStandardGirths,
  computeEngineering,
  computeAudit,
  defaultTipWidth,
  suggestAutoFix,
  type Gender,
  type SoleType,
  type HeelType,
  type RockerType,
} from '../lib/heelCalc'
import { buildHeelGeometry } from '../lib/heelGeometry'
import { HeelCanvas } from '../components/heel/HeelCanvas'

type Props = { onBack: () => void; lang: Lang }

type InfoKey =
  | 'перекат'
  | 'геленок'
  | 'сталь'
  | 'lEff'
  | 'heelCenter'
  | 'смещение'
  | 'набойка'
  | 'invertRisk'
  | 'entryAngle'
  | 'padPos'
  | 'padHeight'
  | 'apexM1'
  | 'apexM5'
  | 'carbonInsert'
  | 'pronation'
  | 'loadM1M5'
  | 'shankMoment'
  | 'thomasHeel'
  | 'girths'

function haptic(style: 'light' | 'medium' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
    else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 20 : 40)
  } catch {}
}

export function HeelCalcPage({ onBack, lang }: Props) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') return document.documentElement.classList.contains('dark')
    return true
  })

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const [gender, setGender] = useState<Gender>('female')
  const [shoeSize, setShoeSize] = useState(38)
  const [heelHeight, setHeelHeight] = useState(45)
  const [toeThickness, setToeThickness] = useState(10)
  const [rockerAngle, setRockerAngle] = useState(12)
  const [rockerStartPct, setRockerStartPct] = useState(62)
  const [soleType, setSoleType] = useState<SoleType>('flat')
  const [heelType, setHeelType] = useState<HeelType>('block')
  const [heelTipOffsetMm, setHeelTipOffsetMm] = useState(0)
  const [tipWidthMm, setTipWidthMm] = useState(28)
  const [rockerType, setRockerType] = useState<RockerType>('forefoot')
  const [pronationDeg, setPronationDeg] = useState(-4)

  // Антропометрические обмеры стопы клиента (мм)
  const [ballGirthMm, setBallGirthMm] = useState(226)
  const [instepGirthMm, setInstepGirthMm] = useState(235)
  const [obliqueGirthMm, setObliqueGirthMm] = useState(298)

  const [showSpecs, setShowSpecs] = useState(false)
  const [activeInfo, setActiveInfo] = useState<InfoKey | null>(null)

  useEffect(() => {
    if (toeThickness > heelHeight + 10) setToeThickness(heelHeight + 10)
  }, [heelHeight, toeThickness])

  const t = useMemo(() => getLabels(lang), [lang])
  const infos = useMemo(() => getInfoTexts(lang), [lang])

  // При смене пола или размера обновляем эталонные обмеры с сохранением текущей дельты полноты
  const handleGenderChange = (newGender: Gender) => {
    haptic('light')
    const newSize = newGender === 'male' ? 42 : 38
    const std = getStandardGirths(newGender, newSize)
    setGender(newGender)
    setShoeSize(newSize)
    setBallGirthMm(std.ballGirthMm)
    setInstepGirthMm(std.instepGirthMm)
    setObliqueGirthMm(std.obliqueGirthMm)
    if (newGender === 'male') {
      setHeelType('block')
      setHeelHeight(28)
      setToeThickness(10)
      setTipWidthMm(32)
    } else {
      setHeelHeight(45)
      setTipWidthMm(defaultTipWidth(heelType, 'female'))
    }
  }

  const handleSizeChange = (newSize: number) => {
    const oldStd = getStandardGirths(gender, shoeSize)
    const newStd = getStandardGirths(gender, newSize)
    setShoeSize(newSize)
    setBallGirthMm(newStd.ballGirthMm + (ballGirthMm - oldStd.ballGirthMm))
    setInstepGirthMm(newStd.instepGirthMm + (instepGirthMm - oldStd.instepGirthMm))
    setObliqueGirthMm(newStd.obliqueGirthMm + (obliqueGirthMm - oldStd.obliqueGirthMm))
  }

  const input = {
    gender,
    shoeSize,
    heelHeight,
    toeThickness,
    soleType,
    heelType,
    rockerAngle,
    rockerStartPct,
    heelTipOffsetMm,
    tipWidthMm,
    rockerType,
    pronationDeg,
    ballGirthMm,
    instepGirthMm,
    obliqueGirthMm,
  }

  const eng = useMemo(
    () => computeEngineering(input),
    [
      gender,
      shoeSize,
      heelHeight,
      toeThickness,
      soleType,
      heelType,
      rockerAngle,
      rockerStartPct,
      heelTipOffsetMm,
      tipWidthMm,
      rockerType,
      pronationDeg,
      ballGirthMm,
      instepGirthMm,
      obliqueGirthMm,
    ]
  )

  const audit = useMemo(
    () => computeAudit(eng, soleType, heelHeight, rockerAngle),
    [eng, soleType, heelHeight, rockerAngle]
  )

  const geometry = useMemo(
    () =>
      buildHeelGeometry({
        ...input,
        shankLength: eng.shankLength,
        thomasExtensionMm: eng.rx.thomasExtensionMm,
        instepBuildUpMm: eng.rx.instepBuildUpMm,
      }),
    [
      gender,
      shoeSize,
      heelHeight,
      toeThickness,
      soleType,
      heelType,
      rockerAngle,
      rockerStartPct,
      heelTipOffsetMm,
      tipWidthMm,
      eng.shankLength,
      eng.rx.thomasExtensionMm,
      eng.rx.instepBuildUpMm,
    ]
  )

  const handleSoleTypeChange = (type: SoleType) => {
    haptic('light')
    setSoleType(type)
    if (type === 'rocker') {
      const preset = ROCKER_PRESETS[rockerType]
      setRockerAngle(preset.angle)
      setRockerStartPct(preset.startPct)
    } else if (type === 'thomas') {
      setHeelType('block')
      setTipWidthMm(Math.max(tipWidthMm, 28))
      if (heelHeight > 40) setHeelHeight(32)
    }
  }

  const handleHeelTypeChange = (type: HeelType) => {
    haptic('light')
    setHeelType(type)
    setTipWidthMm(defaultTipWidth(type, gender))
  }

  const handleRockerType = (type: RockerType) => {
    haptic('light')
    setRockerType(type)
    const preset = ROCKER_PRESETS[type]
    setRockerAngle(preset.angle)
    setRockerStartPct(preset.startPct)
  }

  const handleFix = () => {
    haptic('medium')
    const fix = suggestAutoFix(input, eng)
    setSoleType(fix.soleType)
    setHeelType(fix.heelType)
    setToeThickness(fix.toeThickness)
    setHeelHeight(fix.heelHeight)
    setHeelTipOffsetMm(fix.heelTipOffsetMm)
    setTipWidthMm(fix.tipWidthMm)
    setRockerAngle(fix.rockerAngle)
  }

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'

  return (
    <div
      className={`relative flex flex-col min-h-[100dvh] w-full max-w-[100vw] transition-colors duration-500 ${cBg} ${cText} overflow-hidden overflow-x-hidden`}
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; -webkit-touch-callout: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .stagger-item {
          opacity: 0;
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* HEADER */}
      <header className="px-6 pt-7 pb-3 flex items-center justify-between z-20 shrink-0 border-b border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => {
            haptic('light')
            onBack()
          }}
          className={`group flex items-center gap-2.5 text-[9px] font-sans uppercase tracking-[0.25em] outline-none border-none bg-transparent cursor-pointer p-1 -m-1 ${cTextMuted} transition-colors touch-manipulation`}
        >
          <span className="transform transition-transform group-active:-translate-x-1">←</span>
          <span>ATELIER INDEX</span>
        </button>
        <span className="font-mono text-[8px] uppercase tracking-[0.3em] opacity-40">
          ORTHO LAST & INSOLE // N° 03
        </span>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-24 scrollbar-hide w-full">
        {/* Title & Gender Switch */}
        <div className="stagger-item my-6 flex items-end justify-between gap-4 w-full" style={{ animationDelay: '0.05s' }}>
          <div>
            <p className={`text-[8.5px] font-sans uppercase tracking-[0.35em] mb-2 ${cTextMuted}`}>
              {t.desc}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-light tracking-tight">{t.title}</h1>
          </div>

          {/* Переключатель Женская / Мужская колодка */}
          <div className="flex items-center rounded-[10px] p-0.5 border border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
            {(['female', 'male'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => handleGenderChange(g)}
                className={`px-3 py-1.5 rounded-[8px] text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer border-none ${
                  gender === g
                    ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold'
                    : 'bg-transparent text-[var(--color-ink)] opacity-55'
                }`}
              >
                {g === 'female' ? t.female : t.male}
              </button>
            ))}
          </div>
        </div>

        {/* Mode & Type Toggles (Стандарт / Каблук Томаса / Рокер) */}
        <div className="stagger-item mb-6 space-y-3" style={{ animationDelay: '0.1s' }}>
          <div className={`flex gap-6 pb-2.5 border-b ${cLine} overflow-x-auto scrollbar-hide`}>
            {(['flat', 'thomas', 'rocker'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleSoleTypeChange(type)}
                className={`text-[9px] font-sans uppercase tracking-[0.25em] whitespace-nowrap transition-all outline-none border-none bg-transparent p-1 -m-1 cursor-pointer touch-manipulation ${
                  soleType === type
                    ? `italic ${cText} underline underline-offset-8 opacity-100 font-semibold`
                    : `${cTextMuted} opacity-50 hover:opacity-100`
                }`}
              >
                {t[type]}
              </button>
            ))}
          </div>

          <div className="flex overflow-x-auto gap-5 pb-1 scrollbar-hide items-center">
            {soleType === 'flat' ? (
              (gender === 'male'
                ? (['block', 'flared'] as const)
                : (['stiletto', 'kitten', 'block', 'flared'] as const)
              ).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleHeelTypeChange(type)}
                  className={`text-[11px] font-serif transition-all outline-none border-none bg-transparent p-1 -m-1 cursor-pointer whitespace-nowrap touch-manipulation ${
                    heelType === type
                      ? `italic ${cText} opacity-100 font-medium scale-105 origin-left`
                      : `${cTextMuted} opacity-50 hover:opacity-100`
                  }`}
                >
                  {t[type]}
                </button>
              ))
            ) : soleType === 'thomas' ? (
              <span className={`text-[11px] font-serif italic ${cTextMuted}`}>
                {eng.rx.thomasHeelType === 'lateral'
                  ? `${t.thomasLateral} (+${eng.rx.thomasExtensionMm} mm)`
                  : `${t.thomasMedial} (+${eng.rx.thomasExtensionMm} mm)`}
              </span>
            ) : (
              (
                [
                  { type: 'forefoot' as const, labelKey: 'rockerForefoot' as const },
                  { type: 'heelToToe' as const, labelKey: 'rockerHeelToToe' as const },
                  { type: 'negative' as const, labelKey: 'rockerNegative' as const },
                ]
              ).map(({ type, labelKey }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleRockerType(type)}
                  className={`text-[11px] font-serif transition-all outline-none border-none bg-transparent p-1 -m-1 cursor-pointer whitespace-nowrap touch-manipulation ${
                    rockerType === type
                      ? `italic ${cText} opacity-100 font-medium scale-105 origin-left`
                      : `${cTextMuted} opacity-50 hover:opacity-100`
                  }`}
                >
                  {t[labelKey]}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Visualizer Canvas (3D Lab + 2D CAD Blueprint) */}
        <div className="stagger-item w-full mb-6" style={{ animationDelay: '0.15s' }}>
          <HeelCanvas
            geometry={geometry}
            eng={eng}
            audit={audit}
            auditTitle={(t as any)[audit.titleKey]}
            auditMessage={(t as any)[audit.messageKey]}
            gender={gender}
            soleType={soleType}
            heelType={heelType}
            heelHeight={heelHeight}
            toeThickness={toeThickness}
            rockerAngle={rockerAngle}
            rockerStartPct={rockerStartPct}
            heelTipOffsetMm={heelTipOffsetMm}
            tipWidthMm={tipWidthMm}
            pronationDeg={pronationDeg}
            isDark={isDark}
            labels={t}
            onFix={handleFix}
          />
        </div>

        {/* ТЕХНОЛОГИЧЕСКАЯ КАРТА МАСТЕРА (Подбор колодки, стельки и подошвы по меркам клиента) */}
        <div
          className={`stagger-item mb-8 rounded-[16px] border ${cLine} p-4 bg-[var(--color-surface)] space-y-3`}
          style={{ animationDelay: '0.18s' }}
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] font-semibold">
              {t.masterCardTitle}
            </span>
            <span className="font-mono text-[8.5px] px-2 py-0.5 rounded bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)]">
              {eng.footLengthMm} mm // {eng.rx.widthCode}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
            {/* 1. КОЛОДКА */}
            <div className={`p-3 rounded-[12px] border ${cLine} space-y-1`}>
              <div className="font-mono text-[8px] uppercase tracking-widest opacity-55">
                1. {t.rxLastTitle}
              </div>
              <div className="font-serif text-sm font-medium">
                {t.rxWidth}: {eng.rx.widthCode}
              </div>
              <div className="opacity-80">
                • {t.ballGirth}:{' '}
                <strong>
                  {eng.rx.ballBuildUpMm > 0
                    ? `+${eng.rx.ballBuildUpMm} mm (налепка)`
                    : eng.rx.ballBuildUpMm < 0
                    ? `${eng.rx.ballBuildUpMm} mm (утяжка)`
                    : '0 mm (база)'}
                </strong>
              </div>
              <div className="opacity-80">
                • {t.instepGirth}:{' '}
                <strong>
                  {eng.rx.instepBuildUpMm > 0
                    ? `+${eng.rx.instepBuildUpMm} mm (на гребень)`
                    : eng.rx.instepBuildUpMm < 0
                    ? `${eng.rx.instepBuildUpMm} mm`
                    : '0 mm (база)'}
                </strong>
              </div>
              <div className={eng.rx.requiresZipOrLaceWarning ? 'text-[#E11D48] font-medium' : 'opacity-75'}>
                • {t.obliqueGirth}:{' '}
                {eng.rx.requiresZipOrLaceWarning
                  ? `+${eng.rx.obliqueEntryDeltaMm} mm (нужна молния/шнурок!)`
                  : 'Вход стопы свободный'}
              </div>
            </div>

            {/* 2. ОРТОПЕДИЧЕСКАЯ СТЕЛЬКА */}
            <div className={`p-3 rounded-[12px] border ${cLine} space-y-1`}>
              <div className="font-mono text-[8px] uppercase tracking-widest opacity-55">
                2. {t.rxInsoleTitle}
              </div>
              <div className="font-serif text-sm font-medium">
                {eng.rx.insoleType === 'supinator'
                  ? t.insoleSupinator
                  : eng.rx.insoleType === 'pronator'
                  ? t.insolePronator
                  : t.insoleNeutral}
              </div>
              <div className="opacity-80">
                • {t.rxArch}: <strong>{eng.rx.archSupportHeightMm} mm</strong>
              </div>
              {eng.rx.medialHeelWedgeMm > 0 && (
                <div className="text-[#10B981] font-medium">
                  • {t.rxMedialWedge}: <strong>+{eng.rx.medialHeelWedgeMm} mm (внутр.)</strong>
                </div>
              )}
              {eng.rx.lateralWedgeMm > 0 && (
                <div className="text-[#D97706] font-medium">
                  • {t.rxLateralWedge}: <strong>+{eng.rx.lateralWedgeMm} mm (наруж.)</strong>
                </div>
              )}
              <div className="opacity-80">
                • {t.padPos}:{' '}
                <strong>
                  {eng.requiresMetatarsalPad
                    ? `${eng.metatarsalPadHeightMm} mm (на ${eng.metatarsalPadPosMm} mm)`
                    : 'Не требуется'}
                </strong>
              </div>
            </div>

            {/* 3. ПОДОШВА И КАБЛУК */}
            <div className={`p-3 rounded-[12px] border ${cLine} space-y-1`}>
              <div className="font-mono text-[8px] uppercase tracking-widest opacity-55">
                3. {t.rxSoleTitle}
              </div>
              <div className="font-serif text-sm font-medium">
                {soleType === 'thomas'
                  ? t.thomas
                  : soleType === 'rocker'
                  ? `${t.rocker} (${rockerAngle}°)`
                  : eng.rx.recommendThomasHeel
                  ? 'Рекомендован Каблук Томаса!'
                  : 'Стандартная сборка'}
              </div>
              {eng.rx.thomasHeelType !== 'none' && (
                <div className="text-[#10B981] font-medium">
                  • Выступ Томаса:{' '}
                  <strong>
                    +{eng.rx.thomasExtensionMm} mm (
                    {eng.rx.thomasHeelType === 'medial' ? 'внутр.' : 'наруж.'})
                  </strong>
                </div>
              )}
              <div className="opacity-80">
                • Апексы пучков: <strong>M1={eng.apexM1_Mm} / M5={eng.apexM5_Mm} mm</strong>
              </div>
              <div className="opacity-80">
                • Геленок 65Г: <strong>{eng.shankLength} mm ({eng.steelThickness} mm)</strong>
              </div>
            </div>
          </div>
        </div>

        {/* БЛОК 1: АНТРОПОМЕТРИЯ СТОПЫ КЛИЕНТА (Обмеры) */}
        <div className="stagger-item mb-3" style={{ animationDelay: '0.2s' }}>
          <span className={`text-[8.5px] font-mono uppercase tracking-[0.25em] ${cTextMuted}`}>
            I. АНТРОПОМЕТРИЯ СТОПЫ КЛИЕНТА (МЕРКИ В ММ И ОСЬ ПЯТКИ)
          </span>
        </div>
        <div className="stagger-item grid grid-cols-2 gap-3.5 mb-7" style={{ animationDelay: '0.22s' }}>
          <JournalStepper
            label={t.size}
            value={shoeSize}
            min={gender === 'male' ? 38 : 33}
            max={gender === 'male' ? 48 : 43}
            onChange={handleSizeChange}
            isDark={isDark}
          />
          <JournalStepper
            label={t.pronation}
            value={pronationDeg}
            min={-12}
            max={12}
            onChange={setPronationDeg}
            unit="°"
            isDark={isDark}
          />
          <JournalStepper
            label={t.ballGirth}
            value={ballGirthMm}
            min={185}
            max={295}
            onChange={setBallGirthMm}
            unit={t.mm}
            isDark={isDark}
          />
          <JournalStepper
            label={t.instepGirth}
            value={instepGirthMm}
            min={190}
            max={310}
            onChange={setInstepGirthMm}
            unit={t.mm}
            isDark={isDark}
          />
          <JournalStepper
            label={t.obliqueGirth}
            value={obliqueGirthMm}
            min={250}
            max={390}
            onChange={setObliqueGirthMm}
            unit={t.mm}
            isDark={isDark}
          />
          <JournalStepper
            label={t.start}
            value={rockerStartPct}
            min={55}
            max={75}
            onChange={setRockerStartPct}
            unit="%"
            isDark={isDark}
          />
        </div>

        {/* БЛОК 2: ПАРАМЕТРЫ КАБЛУКА И ПОДОШВЫ */}
        <div className="stagger-item mb-3" style={{ animationDelay: '0.24s' }}>
          <span className={`text-[8.5px] font-mono uppercase tracking-[0.25em] ${cTextMuted}`}>
            II. КОНСТРУКЦИЯ КАБЛУКА И ПОДОШВЫ
          </span>
        </div>
        <div className="stagger-item grid grid-cols-2 gap-3.5 mb-10" style={{ animationDelay: '0.25s' }}>
          <JournalStepper
            label={t.heel}
            value={heelHeight}
            min={10}
            max={gender === 'male' ? 60 : 130}
            onChange={setHeelHeight}
            unit={t.mm}
            isDark={isDark}
          />
          <JournalStepper
            label={t.toe}
            value={toeThickness}
            min={0}
            max={Math.min(HEEL_CONST.MAX_TOE, heelHeight + 10)}
            onChange={setToeThickness}
            unit={t.mm}
            isDark={isDark}
          />

          {soleType === 'rocker' ? (
            <JournalStepper
              label={t.angle}
              value={rockerAngle}
              min={5}
              max={30}
              onChange={setRockerAngle}
              unit="°"
              isDark={isDark}
            />
          ) : (
            <>
              <JournalStepper
                label={t.offset}
                value={heelTipOffsetMm}
                min={-15}
                max={15}
                onChange={setHeelTipOffsetMm}
                unit={t.mm}
                isDark={isDark}
              />
              <JournalStepper
                label={t.tipW}
                value={tipWidthMm}
                min={6}
                max={45}
                onChange={setTipWidthMm}
                unit={t.mm}
                isDark={isDark}
              />
            </>
          )}
        </div>

        {/* Specs Accordion */}
        <div className="stagger-item w-full pt-2" style={{ animationDelay: '0.28s' }}>
          <button
            type="button"
            onClick={() => {
              haptic('light')
              setShowSpecs(!showSpecs)
            }}
            className={`w-full flex items-center justify-between py-4 border-y transition-colors outline-none cursor-pointer ${cLine} ${cText} touch-manipulation`}
          >
            <span className="text-[9px] font-sans uppercase tracking-[0.25em] font-medium">
              {t.specsBtn}
            </span>
            <motion.div animate={{ rotate: showSpecs ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <span className="text-xs">↓</span>
            </motion.div>
          </button>

          <AnimatePresence>
            {showSpecs && (
              <motion.div
                key="specs-accordion"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="py-6 space-y-4 border-b border-[var(--color-border)]">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <SpecCell
                      label={t.specGirthDelta}
                      value={`${eng.rx.ballBuildUpMm > 0 ? `+${eng.rx.ballBuildUpMm}` : eng.rx.ballBuildUpMm} / ${
                        eng.rx.instepBuildUpMm > 0 ? `+${eng.rx.instepBuildUpMm}` : eng.rx.instepBuildUpMm
                      }`}
                      unit={t.mm}
                      infoKey="girths"
                      onInfo={() => setActiveInfo('girths')}
                      isDark={isDark}
                    />
                    <SpecCell
                      label={t.specThomas}
                      value={
                        eng.rx.thomasHeelType === 'none'
                          ? '0'
                          : `+${eng.rx.thomasExtensionMm} (${eng.rx.thomasHeelType === 'medial' ? 'Med' : 'Lat'})`
                      }
                      unit={t.mm}
                      infoKey="thomasHeel"
                      onInfo={() => setActiveInfo('thomasHeel')}
                      isDark={isDark}
                    />
                    <SpecCell
                      label={t.specLoadM1M5}
                      value={`${eng.loadM1Pct} / ${eng.loadM5Pct}`}
                      unit="%"
                      danger={eng.loadM1Pct >= 45 || eng.loadM5Pct >= 40}
                      infoKey="loadM1M5"
                      onInfo={() => setActiveInfo('loadM1M5')}
                      isDark={isDark}
                    />
                    <SpecCell
                      label={t.specShankMoment}
                      value={`${eng.shankBendingMomentNm.toFixed(1)}`}
                      unit="N·m"
                      danger={eng.shankBendingMomentNm > 26}
                      infoKey="shankMoment"
                      onInfo={() => setActiveInfo('shankMoment')}
                      isDark={isDark}
                    />
                    <SpecCell
                      label={t.specГеленок}
                      value={`${eng.shankLength}`}
                      unit={t.mm}
                      infoKey="геленок"
                      onInfo={() => setActiveInfo('геленок')}
                      isDark={isDark}
                    />
                    <SpecCell
                      label={t.specСталь}
                      value={`${eng.steelThickness.toFixed(1)}`}
                      unit={t.mm}
                      infoKey="сталь"
                      onInfo={() => setActiveInfo('сталь')}
                      isDark={isDark}
                    />
                    <SpecCell
                      label={t.apexM1}
                      value={`${eng.apexM1_Mm}`}
                      unit={t.mm}
                      infoKey="apexM1"
                      onInfo={() => setActiveInfo('apexM1')}
                      isDark={isDark}
                    />
                    <SpecCell
                      label={t.apexM5}
                      value={`${eng.apexM5_Mm}`}
                      unit={t.mm}
                      infoKey="apexM5"
                      onInfo={() => setActiveInfo('apexM5')}
                      isDark={isDark}
                    />
                    {eng.requiresMetatarsalPad && eng.metatarsalPadPosMm != null && (
                      <>
                        <SpecCell
                          label={t.padPos}
                          value={`${eng.metatarsalPadPosMm}`}
                          unit={t.mm}
                          infoKey="padPos"
                          onInfo={() => setActiveInfo('padPos')}
                          isDark={isDark}
                        />
                        <SpecCell
                          label={t.padHeight}
                          value={`${eng.metatarsalPadHeightMm}`}
                          unit={t.mm}
                          infoKey="padHeight"
                          onInfo={() => setActiveInfo('padHeight')}
                          isDark={isDark}
                        />
                      </>
                    )}
                    <SpecCell
                      label={t.invertRisk}
                      value={`${eng.inversionRisk}%`}
                      danger={eng.inversionRisk >= 55}
                      infoKey="invertRisk"
                      onInfo={() => setActiveInfo('invertRisk')}
                      isDark={isDark}
                    />
                    <SpecCell
                      label="L_eff"
                      value={`${eng.lEff.toFixed(1)}`}
                      unit={t.mm}
                      infoKey="lEff"
                      onInfo={() => setActiveInfo('lEff')}
                      isDark={isDark}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* INFO MODAL */}
      <AnimatePresence>
        {activeInfo && (
          <motion.div
            key="info-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm cursor-pointer touch-manipulation"
            onClick={() => setActiveInfo(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-[340px] p-8 border ${cLine} ${cBg} shadow-2xl flex flex-col cursor-default relative z-10 rounded-[16px]`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[8px] uppercase tracking-[0.3em] opacity-50">
                  ORTHOPEDIC SPECIFICATION
                </span>
                <button
                  type="button"
                  onClick={() => setActiveInfo(null)}
                  className="text-xs opacity-60 hover:opacity-100 p-1"
                >
                  ✕
                </button>
              </div>

              <h3 className={`font-serif text-2xl leading-tight mb-3 ${cText} capitalize`}>
                {activeInfo}
              </h3>
              <p className={`text-[12px] font-sans font-light leading-[1.65] mb-8 ${cTextMuted}`}>
                {infos[activeInfo]}
              </p>

              <button
                type="button"
                onClick={() => setActiveInfo(null)}
                className="w-full py-3.5 border border-[var(--color-border)] text-[9px] font-sans uppercase tracking-[0.3em] cursor-pointer bg-[var(--color-ink)] text-[var(--color-bg)] font-medium rounded-[10px] active:scale-95 transition-transform"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function JournalStepper({ label, value, min, max, onChange, unit = '', isDark }: any) {
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'

  return (
    <div
      className={`flex flex-col border ${cLine} rounded-[14px] p-3.5 bg-[var(--color-surface)] justify-between shadow-[0_4px_20px_rgb(0,0,0,0.02)]`}
    >
      <span
        className={`text-[8px] uppercase tracking-[0.22em] mb-2 ${cTextMuted} truncate pr-1 font-mono`}
      >
        {label}
      </span>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (value > min) {
              haptic('light')
              onChange(value - 1)
            }
          }}
          className={`w-7 h-7 flex items-center justify-center rounded-[8px] bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] text-base leading-none outline-none cursor-pointer touch-manipulation ${
            value <= min ? 'opacity-20 cursor-not-allowed' : `active:scale-95 ${cText}`
          }`}
        >
          −
        </button>
        <span className={`font-serif text-2xl tabular-nums ${cText}`}>
          {value > 0 && label.includes('Пронация') ? `+${value}` : value}
          <span className="font-sans text-[9px] ml-0.5 opacity-60">{unit}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            if (value < max) {
              haptic('light')
              onChange(value + 1)
            }
          }}
          className={`w-7 h-7 flex items-center justify-center rounded-[8px] bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] text-base leading-none outline-none cursor-pointer touch-manipulation ${
            value >= max ? 'opacity-20 cursor-not-allowed' : `active:scale-95 ${cText}`
          }`}
        >
          +
        </button>
      </div>
    </div>
  )
}

function SpecCell({ label, value, unit = '', danger = false, onInfo, isDark }: any) {
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cDanger = '#E11D48'

  return (
    <div className={`flex flex-col border-b ${cLine} pb-3 relative`}>
      <div
        className="flex items-center justify-between mb-1.5 cursor-pointer touch-manipulation group"
        onClick={(e) => {
          e.stopPropagation()
          onInfo()
        }}
      >
        <span className={`text-[8px] uppercase tracking-[0.2em] truncate ${cTextMuted} font-mono`}>
          {label}
        </span>
        <div
          className={`w-3.5 h-3.5 rounded-full border ${cLine} flex items-center justify-center text-[7.5px] font-mono font-bold shrink-0 opacity-60 group-hover:opacity-100 transition-opacity`}
        >
          ?
        </div>
      </div>

      <span
        className="font-serif text-xl md:text-2xl tabular-nums"
        style={{ color: danger ? cDanger : cText }}
      >
        {value}
        {unit && <span className="font-sans text-[9px] ml-1 opacity-60">{unit}</span>}
      </span>
    </div>
  )
}

function getLabels(lang: Lang) {
  const C = HEEL_CONST
  const ru = {
    title: 'Колодка & Ортопедия',
    desc: 'Подбор колодки, стельки, каблука Томаса и рокера',
    female: 'ЖЕН',
    male: 'МУЖ',
    size: 'Размер (Штихмасс)',
    heel: 'Высота каблука',
    toe: 'Платформа носка',
    angle: 'Угол рокера',
    start: 'Линия пучков',
    fixBtn: 'Автоподбор',
    offset: 'Смещение набойки',
    tipW: 'Ширина набойки',
    pronation: 'Пронация(−) / Суп.(+)',
    ballGirth: 'Обхват пучков (Oп)',
    instepGirth: 'Прямой взъем (Oв)',
    obliqueGirth: 'Косой обхват (Oк)',
    internalSlope: 'Наклон колодки:',
    loadLbl: 'Нагрузка на плюсну:',
    successTitle: 'КОНСТРУКЦИЯ СБАЛАНСИРОВАНА',
    successDesc: 'Колодка, стелька и опора соответствуют антропометрии стопы.',
    warnTitle: 'ТРЕБУЕТСЯ КОРРЕКЦИЯ',
    warn1Desc: `Высокий наклон (> ${C.COMFORT_ANGLE}°) или завал стопы. Проверьте карту мастера ниже.`,
    warn2Desc: 'Чрезмерный рокер при низком каблуке.',
    girthWarnTitle: 'ВЫСОКИЙ ВЗЪЕМ / КОСОЙ ОБХВАТ',
    girthWarnDesc: 'Стопа не пройдет в закрытое голенище без молнии/шнуровки. Нужна налепка на взъем колодки.',
    thomasNeedTitle: 'НУЖЕН КАБЛУК ТОМАСА',
    thomasNeedDesc: 'При выраженной пронации/супинации и высоком каблуке свод продавливается. Нажмите «Автоподбор».',
    errTitle: 'КРИТИЧЕСКИЙ НАКЛОН КОЛОДКИ',
    errDesc: `Угол колодки ≥ ${C.CRITICAL_ANGLE}°. Увеличьте платформу или снизьте каблук.`,
    padTitle: 'ПЕРЕГРУЗКА ПЕРЕДНЕГО ОТДЕЛА',
    padDesc: 'Обязательна установка метатарзального пелота Зейца за головками M1–M5.',
    negDropTitle: 'ОБРАТНЫЙ УКЛОН',
    negDropDesc: 'Платформа выше каблука. Отрицательный дроп.',
    heelBackTitle: 'КАБЛУК ЗАВАЛЕН НАЗАД',
    heelBackDesc: 'Критично: произойдет перелом геленка и провал пятки.',
    heelFwdTitle: 'СМЕЩЕНИЕ ВПЕРЁД',
    heelFwdDesc: `Набойка смещена вперёд > ${C.MAX_HEEL_OFFSET_MM} мм.`,
    invertTitle: 'РИСК ВЫВИХА / ИНВЕРСИИ',
    invertDesc: 'Узкая опора при завале стопы. Нажмите «Автоподбор» для перехода на каблук Томаса.',
    heelLbl: 'ПЯТКА',
    toeLbl: 'НОСОК',
    stiletto: 'Шпилька',
    block: 'Блок',
    kitten: 'Рюмочка',
    flared: 'Трапеция',
    flat: 'Стандарт',
    thomas: 'Подошва Томаса',
    rocker: 'Рокер',
    thomasMedial: 'Прямой каблук Томаса (медиальный упор под свод)',
    thomasLateral: 'Обратный каблук Томаса (латеральный упор от варуса)',
    masterCardTitle: 'ТЕХКАРТА МАСТЕРА: КОЛОДКА, СТЕЛЬКА, ПОДОШВА',
    rxLastTitle: 'КОЛОДКА (ОБМЕРЫ)',
    rxWidth: 'Полнота',
    rxInsoleTitle: 'ОРТО-СТЕЛЬКА',
    insoleNeutral: 'Анатомическая (нейтраль)',
    insoleSupinator: 'Супинаторная (антивальгус)',
    insolePronator: 'Пронаторная (антиварус)',
    rxArch: 'Выкладка свода',
    rxMedialWedge: 'Клин пятки',
    rxLateralWedge: 'Клин пучка/пятки',
    rxSoleTitle: 'ПОДОШВА & КАБЛУК',
    specsBtn: 'Полная инженерная спецификация ↗',
    dropLbl: 'Перепад',
    massTitle: 'Распределение массы',
    forefoot: 'Плюсна',
    rearfoot: 'Пятка',
    invertRisk: 'Риск инверсии',
    entryAngle: 'Угол скоса',
    padPos: 'Пелот Зейца',
    padHeight: 'Высота пелота',
    apexM1: 'Апекс M1',
    apexM5: 'Апекс M5',
    carbonInsert: 'Карбон (толщ.)',
    rockerForefoot: 'Метатарзалгия',
    rockerHeelToToe: 'Артроз',
    rockerNegative: 'Диабет. стопа',
    specGirthDelta: 'Налепка (Пуч/Взъем)',
    specThomas: 'Выступ Томаса',
    specГеленок: 'Геленок',
    specСталь: 'Сталь 65Г',
    specLoadM1M5: 'Лучи M1 / M5',
    specShankMoment: 'Момент геленка',
    mm: 'mm',
  }
  const uk = {
    ...ru,
    title: 'Колодка & Ортопедія',
    desc: 'Підбір колодки, устілки, каблука Томаса та рокера',
    female: 'ЖІН',
    male: 'ЧОЛ',
    size: 'Розмір (Штихмас)',
    heel: 'Висота підбора',
    toe: 'Платформа носка',
    angle: 'Кут рокера',
    start: 'Лінія пучків',
    fixBtn: 'Автопідбір',
    offset: 'Зміщення набійки',
    tipW: 'Ширина набійки',
    pronation: 'Пронація(−) / Суп.(+)',
    ballGirth: 'Обхват пучків (Oп)',
    instepGirth: 'Прямий підйом (Oв)',
    obliqueGirth: 'Косий обхват (Oк)',
    internalSlope: 'Нахил колодки:',
    loadLbl: 'Навантаження на плюсну:',
    successTitle: 'КОНСТРУКЦІЯ ЗБАЛАНСОВАНА',
    successDesc: 'Колодка, устілка та опора відповідають антропометрії стопи.',
    warnTitle: 'ПОТРІБНА КОРЕКЦІЯ',
    warn1Desc: `Високий нахил (> ${C.COMFORT_ANGLE}°) або завал стопи. Перевірте техкарту майстра.`,
    girthWarnTitle: 'ВИСОКИЙ ПІДЙОМ / КОСИЙ ОБХВАТ',
    girthWarnDesc: 'Стопа не пройде в закриту халяву без блискавки/шнурівки. Потрібна наліпка на підйом.',
    thomasNeedTitle: 'ПОТРІБЕН КАБЛУК ТОМАСА',
    thomasNeedDesc: 'При вираженій пронації/супінації склепіння продавлюється. Натисніть «Автопідбір».',
    flat: 'Стандарт',
    thomas: 'Підошва Томаса',
    rocker: 'Рокер',
    masterCardTitle: 'ТЕХКАРТА МАЙСТРА: КОЛОДКА, УСТІЛКА, ПІДОШВА',
    rxLastTitle: 'КОЛОДКА (ОБМІРИ)',
    rxWidth: 'Повнота',
    rxInsoleTitle: 'ОРТО-УСТІЛКА',
    insoleNeutral: 'Анатомічна (нейтраль)',
    insoleSupinator: 'Супінаторна (антивальгус)',
    insolePronator: 'Пронаторна (антиварус)',
    rxArch: 'Викладка склепіння',
    rxMedialWedge: 'Клин пʼятки',
    rxLateralWedge: 'Клин пучка/пʼятки',
    rxSoleTitle: 'ПІДОШВА & ПІДБІР',
    specGirthDelta: 'Наліпка (Пуч/Підйом)',
    specThomas: 'Виступ Томаса',
  }
  const de = {
    ...ru,
    title: 'Leisten & Orthopädie',
    desc: 'Leistenanpassung, Einlage, Thomas-Absatz & Rolle',
    female: 'DAMEN',
    male: 'HERREN',
    size: 'Größe (Stichmaß)',
    heel: 'Absatzhöhe',
    toe: 'Plateau',
    angle: 'Rollenwinkel',
    start: 'Ballenlinie',
    fixBtn: 'Auto-Konfig',
    pronation: 'Pronation(−) / Sup.(+)',
    ballGirth: 'Ballenmaß (Oп)',
    instepGirth: 'Spannmaß (Oв)',
    obliqueGirth: 'Fersenmaß (Oк)',
    flat: 'Standard',
    thomas: 'Thomas-Absatz',
    rocker: 'Rocker-Sohle',
    masterCardTitle: 'MEISTERKARTE: LEISTEN, EINLAGE & BODENBAU',
  }

  if (lang === 'uk') return uk
  if (lang === 'de') return de
  return ru
}

function getInfoTexts(lang: Lang): Record<InfoKey, string> {
  return {
    girths:
      'Разница между обмерами стопы клиента (пучки Oп, прямой взъем Oв) и эталонной колодкой полноты F(6). Положительное число (+мм) показывает, сколько миллиметров кожи нужно налепить на колодку; при большом косом обхвате Oк требуется молния или шнуровка.',
    thomasHeel:
      'Каблук Томаса имеет удлиненную переднюю грудь (+12..25 мм). Прямой (Med) удлиняется с внутренней стороны и подпирает геленок и ладьевидную кость при пронации/вальгусе. Обратный (Lat) удлиняется снаружи при варусе/супинации.',
    перекат:
      'Точка начала переката (линия пучков) — процент длины колодки, с которого начинается подъём подошвы.',
    геленок:
      'Стальной супинатор 65Г от центра пятки до зоны плюсни. Не даёт подошве прогибаться под сводом.',
    сталь:
      'Рекомендуемая толщина стальной пластины 65Г с учетом пола (муж/жен), высоты каблука и момента.',
    lEff:
      'Динамическая эффективная длина рычага от центра пятки (15%) до линии пучков.',
    heelCenter:
      'Центр опоры пятки (15% длины колодки от задника).',
    смещение:
      'Смещение набойки относительно оси пятки.',
    набойка:
      'Ширина контактной площадки каблука с полом.',
    invertRisk:
      'Вероятность подворачивания лодыжки. При переходе на каблук Томаса риск резко снижается за счет широкой базы.',
    entryAngle:
      'Угол скоса задней грани каблука.',
    padPos:
      'Позиция метатарзального пелота Зейца от пятки (на 7 мм проксимальнее линии апекса M1). Назначается при высоком подъеме или поперечном распластывании пучков.',
    padHeight:
      'Высота купола пелота Зейца (4–6 мм).',
    apexM1:
      'Апекс M1 — проекция головки I плюсневой кости (внутренний пучок).',
    apexM5:
      'Апекс M5 — проекция головки V плюсневой кости (наружный пучок, смещен к пятке на 4.5% длины колодки).',
    carbonInsert:
      'Толщина карбоновой пластины для обеспечения жесткости рокерной подошвы.',
    pronation:
      'Отрицательные значения (−) — гиперпронация (вальгус, стопа валится внутрь -> нужен супинатор, медиальный клин и прямой каблук Томаса). Положительные (+) — супинация (варус, стопа валится наружу -> нужен пронаторный клин снаружи и обратный каблук Томаса).',
    loadM1M5:
      'Распределение нагрузки между внутренним (M1) и наружным (M5) лучами переднего отдела стопы.',
    shankMoment:
      'Изгибающий момент (Н·м) на стальной геленок (при каблуке Томаса момент снижается за счет опоры под сводом).',
  }
}
