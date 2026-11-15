// src/pages/HeelCalcPage.tsx
import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react'
import type { Lang } from '../App'
import {
  HEEL_CONST,
  ROCKER_PRESETS,
  getStandardGirths,
  computeEngineering,
  computeAudit,
  suggestAutoFix,
  type Gender,
  type SoleType,
  type RockerType,
  type ToeShape,
  type ArchMorphology,
} from '../lib/heelCalc'
import { buildHeelGeometry } from '../lib/heelGeometry'
import { HeelCanvas } from '../components/heel/HeelCanvas'
import { OrthoExpertReportModal } from '../components/heel/OrthoExpertReportModal'

type Props = { onBack: () => void; lang: Lang }
type ActiveTab = 'foot' | 'anatomy' | 'sole' | 'rx'

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

  const [activeTab, setActiveTab] = useState<ActiveTab>('foot')
  const [reportOpen, setReportOpen] = useState(false)

  const [gender, setGender] = useState<Gender>('female')
  const [shoeSize, setShoeSize] = useState(38)
  const [weightKg, setWeightKg] = useState(68)
  const [heelHeight, setHeelHeight] = useState(28)
  const [toeThickness, setToeThickness] = useState(12)
  const [rockerAngle, setRockerAngle] = useState(15)
  const [rockerStartPct, setRockerStartPct] = useState(60)
  const [soleType, setSoleType] = useState<SoleType>('thomas')
  const [heelTipOffsetMm, setHeelTipOffsetMm] = useState(0)
  const [rockerType, setRockerType] = useState<RockerType>('forefoot')
  const [pronationDeg, setPronationDeg] = useState(-5)

  const [ballGirthMm, setBallGirthMm] = useState(226)
  const [instepGirthMm, setInstepGirthMm] = useState(235)
  const [obliqueGirthMm, setObliqueGirthMm] = useState(296)

  // Новые клинические параметры по протоколу эксперта
  const [toeShape, setToeShape] = useState<ToeShape>('egyptian')
  const [halluxValgusDeg, setHalluxValgusDeg] = useState(8)
  const [archType, setArchType] = useState<ArchMorphology>('normal')
  const [lengthAsymmetryMm, setLengthAsymmetryMm] = useState(2)

  useEffect(() => {
    if (toeThickness > heelHeight + 10) setToeThickness(heelHeight + 10)
  }, [heelHeight, toeThickness])

  const t = useMemo(() => getLabels(lang), [lang])

  const handleGenderChange = (newGender: Gender) => {
    haptic('light')
    const newSize = newGender === 'male' ? 42 : 38
    const std = getStandardGirths(newGender, newSize)
    setGender(newGender)
    setShoeSize(newSize)
    setWeightKg(newGender === 'male' ? 84 : 65)
    setBallGirthMm(std.ballGirthMm)
    setInstepGirthMm(std.instepGirthMm)
    setObliqueGirthMm(std.obliqueGirthMm)
    setHeelHeight(newGender === 'male' ? 26 : 28)
    setToeThickness(12)
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
    weightKg,
    heelHeight,
    toeThickness,
    soleType,
    rockerAngle,
    rockerStartPct,
    heelTipOffsetMm,
    rockerType,
    pronationDeg,
    ballGirthMm,
    instepGirthMm,
    obliqueGirthMm,
    toeShape,
    halluxValgusDeg,
    archType,
    lengthAsymmetryMm,
  }

  const eng = useMemo(
    () => computeEngineering(input),
    [
      gender,
      shoeSize,
      weightKg,
      heelHeight,
      toeThickness,
      soleType,
      rockerAngle,
      rockerStartPct,
      heelTipOffsetMm,
      rockerType,
      pronationDeg,
      ballGirthMm,
      instepGirthMm,
      obliqueGirthMm,
      toeShape,
      halluxValgusDeg,
      archType,
      lengthAsymmetryMm,
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
      rockerAngle,
      rockerStartPct,
      heelTipOffsetMm,
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
    } else if (type === 'thomas' && heelHeight > 35) {
      setHeelHeight(28)
    }
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
    setToeThickness(fix.toeThickness)
    setHeelHeight(fix.heelHeight)
    setHeelTipOffsetMm(fix.heelTipOffsetMm)
    setRockerAngle(fix.rockerAngle)
  }

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/60' : 'text-[#1C1816]/60'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'

  return (
    <div
      className={`fixed inset-0 flex flex-col h-[100dvh] w-full max-w-[100vw] transition-colors duration-300 ${cBg} ${cText} overflow-hidden`}
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; -webkit-touch-callout: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 1. ШАПКА: ВЫХОД + РЕЖИМ ПОДОШВЫ + ПОЛ */}
      <header className="px-3.5 pt-2.5 pb-2 flex items-center justify-between gap-2 shrink-0 border-b border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => {
            haptic('light')
            onBack()
          }}
          className={`flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider outline-none border-none bg-transparent cursor-pointer py-1 shrink-0 ${cTextMuted}`}
        >
          <span>←</span>
          <span>НАЗАД</span>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-[8px] p-0.5 border border-[var(--color-border)] bg-[var(--color-surface)]">
            {(['flat', 'thomas', 'rocker'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleSoleTypeChange(type)}
                className={`px-2.5 py-1 rounded-[6px] text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer border-none ${
                  soleType === type
                    ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold'
                    : 'bg-transparent text-[var(--color-ink)] opacity-60'
                }`}
              >
                {t[type]}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-[8px] p-0.5 border border-[var(--color-border)] bg-[var(--color-surface)]">
            {(['female', 'male'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => handleGenderChange(g)}
                className={`px-2 py-1 rounded-[6px] text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer border-none ${
                  gender === g
                    ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold'
                    : 'bg-transparent text-[var(--color-ink)] opacity-60'
                }`}
              >
                {g === 'female' ? t.female : t.male}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 2. ЗАКРЕПЛЕННАЯ СЦЕНА 3D / 2D */}
      <div className="px-3 pt-2 pb-1.5 shrink-0">
        <HeelCanvas
          geometry={geometry}
          eng={eng}
          audit={audit}
          auditTitle={(t as any)[audit.titleKey]}
          auditMessage={(t as any)[audit.messageKey]}
          gender={gender}
          soleType={soleType}
          heelHeight={heelHeight}
          toeThickness={toeThickness}
          rockerAngle={rockerAngle}
          rockerStartPct={rockerStartPct}
          heelTipOffsetMm={heelTipOffsetMm}
          pronationDeg={pronationDeg}
          isDark={isDark}
          labels={t}
          onFix={handleFix}
        />
      </div>

      {/* 3. ВКЛАДКИ (ОБМЕРЫ / АНАТОМИЯ & АПЕКС / ПОДОШВА / ТЕХКАРТА) */}
      <div className="px-3 shrink-0">
        <div className={`grid grid-cols-4 gap-1 p-1 rounded-[10px] border ${cLine} bg-[var(--color-surface)]`}>
          {(
            [
              { id: 'foot', label: '1. ОБМЕРЫ' },
              { id: 'anatomy', label: '2. АПЕКС' },
              { id: 'sole', label: '3. ОПОРА' },
              { id: 'rx', label: '4. ТЗ (A–H)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                haptic('light')
                setActiveTab(tab.id)
              }}
              className={`py-1.5 rounded-[7px] text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer border-none ${
                activeTab === tab.id
                  ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold shadow-sm'
                  : 'bg-transparent text-[var(--color-ink)] opacity-60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. НИЖНЯЯ ПАНЕЛЬ */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-4 scrollbar-hide">
        {activeTab === 'foot' && (
          <div className="grid grid-cols-2 gap-2">
            <CleanStepper
              label="РАЗМЕР СТОПЫ"
              badge={`Стопа ${eng.footLengthMm} мм · След ${eng.lastLengthMm} мм`}
              value={shoeSize}
              min={gender === 'male' ? 38 : 33}
              max={gender === 'male' ? 48 : 43}
              onChange={handleSizeChange}
              isDark={isDark}
            />
            <CleanStepper
              label="ВЕС ЧЕЛОВЕКА"
              badge={`Стелька ${eng.rx.shoreA.split(' ')[0]} Шор`}
              value={weightKg}
              min={40}
              max={150}
              step={2}
              onChange={setWeightKg}
              unit="кг"
              isDark={isDark}
            />
            <CleanStepper
              label="ЗАВАЛ ПЯТКИ"
              badge={
                pronationDeg <= -2
                  ? `Вальгус · Клин +${eng.rx.medialHeelWedgeMm}мм`
                  : pronationDeg >= 2
                  ? `Варус · Клин +${eng.rx.lateralWedgeMm}мм`
                  : 'Нейтральная ось'
              }
              value={pronationDeg}
              min={-12}
              max={12}
              onChange={setPronationDeg}
              unit="°"
              showPlus
              isDark={isDark}
            />
            <CleanStepper
              label="ПУЧКИ (ОБХВАТ Oп)"
              badge={`Ширина ${eng.rx.forefootWidthMm}мм · ${
                eng.rx.ballBuildUpMm >= 0 ? `+${eng.rx.ballBuildUpMm}` : eng.rx.ballBuildUpMm
              }мм`}
              value={ballGirthMm}
              min={185}
              max={295}
              onChange={setBallGirthMm}
              unit="мм"
              isDark={isDark}
            />
            <CleanStepper
              label="ПРЯМОЙ ВЗЪЕМ (Oв)"
              badge={
                eng.rx.instepBuildUpMm > 0
                  ? `На гребень +${eng.rx.instepBuildUpMm} мм`
                  : eng.rx.instepBuildUpMm < 0
                  ? `Вкладыш ${eng.rx.instepBuildUpMm} мм`
                  : 'Взъем в норме 0 мм'
              }
              value={instepGirthMm}
              min={190}
              max={310}
              onChange={setInstepGirthMm}
              unit="мм"
              isDark={isDark}
            />
            <CleanStepper
              label="КОСОЙ ОБХВАТ (Oк)"
              badge={
                eng.rx.requiresZipOrLaceWarning
                  ? `+${eng.rx.obliqueEntryDeltaMm}мм · Нужен замок/шнур!`
                  : `Пятка ${eng.rx.heelWidthMm}мм · Вход свободный`
              }
              dangerBadge={eng.rx.requiresZipOrLaceWarning}
              value={obliqueGirthMm}
              min={250}
              max={390}
              onChange={setObliqueGirthMm}
              unit="мм"
              isDark={isDark}
            />
          </div>
        )}

        {/* ВКЛАДКА 2: АНАТОМИЯ ПАЛЬЦЕВ, HALLUX VALGUS, СВОДЫ И АПЕКС КОЛОДКИ */}
        {activeTab === 'anatomy' && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'egyptian' as const, title: 'ЕГИПЕТСКАЯ', sub: 'I палец длиннее' },
                  { id: 'greek' as const, title: 'ГРЕЧЕСКАЯ', sub: 'II палец длиннее' },
                  { id: 'roman' as const, title: 'РИМСКАЯ', sub: 'Прямые пальцы' },
                ]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    haptic('light')
                    setToeShape(item.id)
                  }}
                  className={`p-2 rounded-[10px] border text-left cursor-pointer transition-all ${
                    toeShape === item.id
                      ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-transparent'
                      : `${cLine} bg-[var(--color-surface)] ${cText}`
                  }`}
                >
                  <div className="font-mono text-[8px] font-semibold">{item.title}</div>
                  <div className="text-[8px] opacity-75">{item.sub}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'flat' as const, title: 'ПЛОСКОСТОПИЕ', sub: 'Низкий свод' },
                  { id: 'normal' as const, title: 'НОРМА СВОДА', sub: 'Стандарт' },
                  { id: 'cavus' as const, title: 'ПОЛАЯ СТОПА', sub: 'Высокий свод' },
                ]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    haptic('light')
                    setArchType(item.id)
                  }}
                  className={`p-2 rounded-[10px] border text-left cursor-pointer transition-all ${
                    archType === item.id
                      ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-transparent'
                      : `${cLine} bg-[var(--color-surface)] ${cText}`
                  }`}
                >
                  <div className="font-mono text-[8px] font-semibold">{item.title}</div>
                  <div className="text-[8px] opacity-75">{item.sub}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <CleanStepper
                label="HALLUX VALGUS (I ПАЛЕЦ)"
                badge={
                  eng.rx.medialBunionPocketMm > 0
                    ? `Карман на колодке +${eng.rx.medialBunionPocketMm} мм`
                    : 'Без деформации M1'
                }
                dangerBadge={halluxValgusDeg >= 15}
                value={halluxValgusDeg}
                min={0}
                max={35}
                onChange={setHalluxValgusDeg}
                unit="°"
                isDark={isDark}
              />
              <CleanStepper
                label="АСИММЕТРИЯ СТОП (L/R)"
                badge={
                  eng.rx.compensatoryInsoleHalfPairMm > 0
                    ? `Полустелька +${eng.rx.compensatoryInsoleHalfPairMm} мм`
                    : 'В пределах нормы (≤ 3 мм)'
                }
                value={lengthAsymmetryMm}
                min={0}
                max={14}
                onChange={setLengthAsymmetryMm}
                unit="мм"
                isDark={isDark}
              />
            </div>

            <div className={`p-2.5 rounded-[11px] border ${cLine} bg-[var(--color-surface)] text-[10px]`}>
              <div className="font-mono text-[8px] uppercase text-[#10B981] font-semibold">
                РЕКОМЕНДУЕМАЯ ГЕОМЕТРИЯ МЫСКА И АПЕКСА КОЛОДКИ:
              </div>
              <div className="font-serif text-[13px] font-medium mt-0.5">{eng.rx.lastApexLabel}</div>
              <div className="opacity-80 mt-0.5">
                Медиальное смещение апекса мыска: <strong>+{eng.rx.toeBoxShiftMedialMm} мм</strong> · Высота носочной коробки:{' '}
                <strong>{eng.rx.toeBoxHeightMm} мм</strong> · Косая метатарзальная ось сгиба: <strong>{eng.rx.metatarsalObliqueAngleDeg}°</strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sole' && (
          <div className="space-y-2.5">
            {soleType === 'rocker' && (
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { type: 'forefoot' as const, label: t.rockerForefoot },
                    { type: 'heelToToe' as const, label: t.rockerHeelToToe },
                    { type: 'negative' as const, label: t.rockerNegative },
                  ]
                ).map((r) => (
                  <button
                    key={r.type}
                    type="button"
                    onClick={() => handleRockerType(r.type)}
                    className={`py-1.5 px-1 rounded-[8px] text-[8.5px] font-mono border cursor-pointer ${
                      rockerType === r.type
                        ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-transparent font-semibold'
                        : `${cLine} bg-[var(--color-surface)] ${cText} opacity-75`
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <CleanStepper
                label="ВЫСОТА КАБЛУКА"
                badge={`Чистый перепад: ${eng.netRise} мм`}
                dangerBadge={eng.thomasTooHigh}
                value={heelHeight}
                min={10}
                max={gender === 'male' ? 55 : 85}
                onChange={setHeelHeight}
                unit="мм"
                isDark={isDark}
              />
              <CleanStepper
                label="ПЛАТФОРМА НОСКА"
                badge={`Уклон стопы: ${eng.internalSlope.toFixed(1)}°`}
                value={toeThickness}
                min={0}
                max={Math.min(HEEL_CONST.MAX_TOE, heelHeight + 10)}
                onChange={setToeThickness}
                unit="мм"
                isDark={isDark}
              />
              <CleanStepper
                label="ЛИНИЯ ПУЧКОВ"
                badge={`M1: ${eng.apexM1_Mm}мм · M5: ${eng.apexM5_Mm}мм`}
                value={rockerStartPct}
                min={55}
                max={75}
                onChange={setRockerStartPct}
                unit="%"
                isDark={isDark}
              />
              {soleType === 'rocker' ? (
                <CleanStepper
                  label="УГОЛ РОКЕРА"
                  badge={`Карбон пластина: ${eng.carbonInsertThicknessMm} мм`}
                  value={rockerAngle}
                  min={5}
                  max={28}
                  onChange={setRockerAngle}
                  unit="°"
                  isDark={isDark}
                />
              ) : (
                <CleanStepper
                  label="ПОСАДКА ПЯТКИ"
                  badge={
                    soleType === 'thomas'
                      ? `Томас +${eng.rx.thomasExtensionMm}мм (${eng.rx.thomasHeelType === 'medial' ? 'Внутр' : 'Наруж'})`
                      : 'Ось набойки от центра'
                  }
                  dangerBadge={eng.heelOffsetTooFarBack || eng.heelOffsetTooFarForward}
                  value={heelTipOffsetMm}
                  min={-8}
                  max={8}
                  onChange={setHeelTipOffsetMm}
                  unit="мм"
                  showPlus
                  isDark={isDark}
                />
              )}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 4: ПАСПОРТ МАСТЕРА + КНОПКА ПОЛНОГО ЭКСПЕРТНОГО ОТЧЕТА A–H */}
        {activeTab === 'rx' && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                haptic('medium')
                setReportOpen(true)
              }}
              className="w-full py-2.5 px-3 rounded-[11px] bg-[#10B981] text-black font-mono text-[9.5px] uppercase tracking-wider font-semibold cursor-pointer border-none shadow-sm active:scale-98 transition-transform flex items-center justify-between"
            >
              <span>📋 ОТКРЫТЬ ПОЛНЫЙ ОТЧЕТ КОНСИЛИУМА (A–H + ФОРМУЛЫ)</span>
              <span>↗</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <RxCard
                step="01 // КОЛОДКА & АПЕКС"
                title={eng.rx.widthCode}
                line1={`След: ${eng.lastLengthMm} мм · Мысок H=${eng.rx.toeBoxHeightMm} мм`}
                line2={`Пучки: ${eng.rx.ballBuildUpMm >= 0 ? `+${eng.rx.ballBuildUpMm}` : eng.rx.ballBuildUpMm}мм · Взъем: ${
                  eng.rx.instepBuildUpMm >= 0 ? `+${eng.rx.instepBuildUpMm}` : eng.rx.instepBuildUpMm
                }мм`}
                accent={eng.rx.ballBuildUpMm !== 0 || eng.rx.instepBuildUpMm !== 0}
                isDark={isDark}
              />

              <RxCard
                step="02 // МЫСОК & HV"
                title={
                  eng.rx.lastApexType === 'oblique_anatomical'
                    ? 'Косой апекс (II луч)'
                    : eng.rx.lastApexType === 'wide_square'
                    ? 'Широкий апекс'
                    : 'Прямой апекс (I луч)'
                }
                line1={`Сдвиг к I лучу: +${eng.rx.toeBoxShiftMedialMm} мм`}
                line2={
                  eng.rx.medialBunionPocketMm > 0
                    ? `Карман под косточку HV: +${eng.rx.medialBunionPocketMm} мм`
                    : `Ось пучков M1–M5: ${eng.rx.metatarsalObliqueAngleDeg}°`
                }
                accent={eng.rx.medialBunionPocketMm > 0}
                isDark={isDark}
              />

              <RxCard
                step="03 // ТИП СТЕЛЬКИ"
                title={
                  !eng.rx.orthoticIndicated
                    ? 'Профилактическая'
                    : eng.rx.insoleType === 'supinator'
                    ? 'Супинатор (Вальгус)'
                    : eng.rx.insoleType === 'pronator'
                    ? 'Пронатор (Варус)'
                    : 'Разгрузочная'
                }
                line1={`Свод: ${eng.rx.archSupportHeightMm} мм · ${eng.rx.shoreA.split(' ')[0]} Шор`}
                line2={
                  eng.rx.medialHeelWedgeMm > 0
                    ? `Внутр. клин пятки: +${eng.rx.medialHeelWedgeMm} мм`
                    : eng.rx.lateralWedgeMm > 0
                    ? `Наруж. клин: +${eng.rx.lateralWedgeMm} мм`
                    : 'Без клина пятки (0 мм)'
                }
                accent={eng.rx.orthoticIndicated}
                isDark={isDark}
              />

              <RxCard
                step="04 // ПЕЛОТ & КАБЛУК"
                title={
                  soleType === 'thomas'
                    ? `Томас +${eng.rx.thomasExtensionMm} мм`
                    : soleType === 'rocker'
                    ? `Рокер ${rockerAngle}°`
                    : 'Стандартный каблук'
                }
                line1={
                  eng.requiresMetatarsalPad
                    ? `Пелот Зейца: ${eng.metatarsalPadHeightMm}мм (на ${eng.metatarsalPadPosMm}мм)`
                    : 'Пелот Зейца: Не нужен'
                }
                line2={`Геленок 65Г: ${eng.shankLength}×${eng.steelThickness} мм (${eng.shankBendingMomentNm} Н·м)`}
                danger={soleType === 'flat' && eng.rx.recommendThomasHeel}
                accent={soleType !== 'flat'}
                isDark={isDark}
              />
            </div>
          </div>
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО ПОЛНОГО ЭКСПЕРТНОГО ОТЧЕТА A–H */}
      <OrthoExpertReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        input={input}
        eng={eng}
        isDark={isDark}
      />
    </div>
  )
}

function CleanStepper({
  label,
  badge,
  dangerBadge = false,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = '',
  showPlus = false,
  isDark,
}: any) {
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/60' : 'text-[#1C1816]/60'

  const dispVal = showPlus && value > 0 ? `+${value}` : `${value}`

  return (
    <div
      className={`flex flex-col border ${cLine} rounded-[12px] px-2.5 py-2 bg-[var(--color-surface)] justify-between`}
    >
      <div className={`text-[8px] uppercase tracking-wider font-mono font-semibold ${cTextMuted}`}>
        {label}
      </div>

      <div className="flex items-center justify-between my-1">
        <button
          type="button"
          onClick={() => {
            if (value - step >= min) {
              haptic('light')
              onChange(value - step)
            }
          }}
          className={`w-7 h-7 flex items-center justify-center rounded-[7px] bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] text-base leading-none outline-none cursor-pointer touch-manipulation ${
            value <= min ? 'opacity-20 cursor-not-allowed' : `active:scale-95 ${cText}`
          }`}
        >
          −
        </button>

        <span className={`font-serif text-xl font-medium tabular-nums ${cText}`}>
          {dispVal}
          <span className="font-sans text-[9px] ml-0.5 opacity-65">{unit}</span>
        </span>

        <button
          type="button"
          onClick={() => {
            if (value + step <= max) {
              haptic('light')
              onChange(value + step)
            }
          }}
          className={`w-7 h-7 flex items-center justify-center rounded-[7px] bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] text-base leading-none outline-none cursor-pointer touch-manipulation ${
            value >= max ? 'opacity-20 cursor-not-allowed' : `active:scale-95 ${cText}`
          }`}
        >
          +
        </button>
      </div>

      <div
        className={`text-[8.5px] font-mono leading-tight ${
          dangerBadge ? 'text-[#E11D48] font-semibold' : 'text-[#10B981]'
        }`}
      >
        {badge}
      </div>
    </div>
  )
}

function RxCard({ step, title, line1, line2, accent = false, danger = false, isDark }: any) {
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/55' : 'text-[#1C1816]/55'

  return (
    <div
      className={`flex flex-col justify-between rounded-[11px] border p-2.5 bg-[var(--color-surface)] ${cLine}`}
    >
      <div className={`text-[7.5px] font-mono uppercase tracking-wider ${cTextMuted}`}>
        {step}
      </div>
      <div
        className="font-serif text-[13.5px] font-semibold leading-tight my-0.5"
        style={{
          color: danger ? '#E11D48' : accent ? '#10B981' : 'inherit',
        }}
      >
        {title}
      </div>
      <div className="text-[9.5px] font-sans leading-snug opacity-85">{line1}</div>
      <div className="text-[9px] font-mono leading-snug opacity-75 mt-0.5">{line2}</div>
    </div>
  )
}

function getLabels(lang: Lang) {
  const C = HEEL_CONST
  const ru = {
    female: 'ЖЕН',
    male: 'МУЖ',
    fixBtn: 'Автоподбор',
    internalSlope: 'УКЛОН:',
    loadLbl: 'ПЛЮСНА:',
    successTitle: 'БИОМЕХАНИКА СБАЛАНСИРОВАНА',
    successDesc: 'Давление в пучках и ось пятки в пределах ортопедической нормы.',
    warnTitle: 'ПОВЫШЕННАЯ НАГРУЗКА',
    warn1Desc: `Уклон > ${C.COMFORT_ANGLE}°. Проверьте жесткость стельки в Техкарте.`,
    warn2Desc: 'Сильный угол рокера при низком каблуке.',
    girthWarnTitle: 'ВЫСОКИЙ ВЗЪЕМ / КОСОЙ ОБХВАТ',
    girthWarnDesc: 'Нужна налепка на гребень колодки и обязательная шнуровка/молния.',
    thomasNeedTitle: 'ТРЕБУЕТСЯ КАБЛУК ТОМАСА',
    thomasNeedDesc: 'Завал стопы продавливает свод. Нажмите «Автоподбор».',
    errTitle: 'ПЕРЕГРУЗКА СУПИНАТОРА / ВЫСОКИЙ КАБЛУК',
    errDesc: `Превышен момент геленка (> ${C.MAX_SHANK_MOMENT_NM} Н·м) или лимит высоты Томаса (35 мм). Нажмите «Автоподбор».`,
    padTitle: 'ПЕРЕГРУЗКА ПУЧКОВ (> 245 кПа)',
    padDesc: 'Высокое давление под M1–M5! Нажмите «Автоподбор» для разгрузки.',
    negDropTitle: 'ОТРИЦАТЕЛЬНЫЙ ДРОП',
    negDropDesc: 'Платформа выше каблука.',
    heelBackTitle: 'СМЕЩЕНИЕ КАБЛУКА НАЗАД',
    heelBackDesc: 'Критично: риск излома супинатора 65Г.',
    heelFwdTitle: 'СМЕЩЕНИЕ ПЯТКИ ВПЕРЕД (> 5 мм)',
    heelFwdDesc: `Нарушена соосность пяточного упора. Нажмите «Автоподбор».`,
    invertTitle: 'РИСК ВЫВИХА / ТЯЖЕЛЫЙ ВАЛЬГУС',
    invertDesc: 'Боковой завал при текущем весе перегружает голеностоп. Нажмите «Автоподбор».',
    heelLbl: 'ПЯТКА',
    toeLbl: 'ПУЧКИ',
    flat: 'Стандарт',
    thomas: 'Томаса',
    rocker: 'Рокер',
    dropLbl: 'Дроп',
    forefoot: 'Пучки',
    rearfoot: 'Пятка',
    rockerForefoot: 'Метатарзалгия',
    rockerHeelToToe: 'Артроз',
    rockerNegative: 'Диабет. стопа',
    mm: 'мм',
  }
  const uk = {
    ...ru,
    female: 'ЖІН',
    male: 'ЧОЛ',
    fixBtn: 'Автопідбір',
    successTitle: 'БІОМЕХАНІКА ЗБАЛАНСОВАНА',
    thomasNeedTitle: 'ПОТРІБЕН КАБЛУК ТОМАСА',
    padTitle: 'ПЕРЕВАНТАЖЕННЯ ПУЧКІВ (> 245 кПа)',
    flat: 'Стандарт',
    thomas: 'Томаса',
    rocker: 'Рокер',
  }
  const de = {
    ...ru,
    female: 'DAM',
    male: 'HER',
    fixBtn: 'Auto-Fix',
    flat: 'Standard',
    thomas: 'Thomas',
    rocker: 'Rocker',
  }

  if (lang === 'uk') return uk
  if (lang === 'de') return de
  return ru
}
