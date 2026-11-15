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
} from '../lib/heelCalc'
import { buildHeelGeometry } from '../lib/heelGeometry'
import { HeelCanvas } from '../components/heel/HeelCanvas'

type Props = { onBack: () => void; lang: Lang }
type ActiveTab = 'foot' | 'sole' | 'rx'

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
    } else if (type === 'thomas' && heelHeight > 40) {
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

      {/* 1. ВЕРХНЯЯ ШАПКА: ВЫХОД + РЕЖИМ ПОДОШВЫ (СТАНДАРТ / ТОМАСА / РОКЕР) + ПОЛ */}
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

      {/* 3. ПЕРЕКЛЮЧАТЕЛЬ ВКЛАДОК НИЖНЕЙ ПАНЕЛИ */}
      <div className="px-3 shrink-0">
        <div className={`grid grid-cols-3 gap-1 p-1 rounded-[10px] border ${cLine} bg-[var(--color-surface)]`}>
          {(
            [
              { id: 'foot', label: '1. СТОПА & ВЕС' },
              { id: 'sole', label: '2. ПОДОШВА' },
              { id: 'rx', label: '3. ТЕХКАРТА' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                haptic('light')
                setActiveTab(tab.id)
              }}
              className={`py-1.5 rounded-[7px] text-[8.5px] font-mono uppercase tracking-wider transition-all cursor-pointer border-none ${
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

      {/* 4. НИЖНЯЯ ПАНЕЛЬ (ЧИСТАЯ ЧИТАЕМОСТЬ БЕЗ МНОГОТОЧИЙ И СКРОЛЛА В ТЕХКАРТЕ) */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-4 scrollbar-hide">
        {activeTab === 'foot' && (
          <div className="grid grid-cols-2 gap-2">
            <CleanStepper
              label="РАЗМЕР СТОПЫ"
              badge={`Стопа ${eng.footLengthMm} мм · ${eng.rx.widthCode.split(' ')[0]}`}
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
              badge={
                eng.rx.ballBuildUpMm > 0
                  ? `Налепка +${eng.rx.ballBuildUpMm} мм`
                  : eng.rx.ballBuildUpMm < 0
                  ? `Утяжка ${eng.rx.ballBuildUpMm} мм`
                  : 'Базовая колодка 0 мм'
              }
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
                  : 'Вход пятки свободный'
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

        {/* ВКЛАДКА 3: НАГЛЯДНЫЙ ПАСПОРТ ЗАКАЗА МАСТЕРА НА ОДИН ЭКРАН (2x3 КАРТОЧКИ БЕЗ СКРОЛЛА!) */}
        {activeTab === 'rx' && (
          <div className="grid grid-cols-2 gap-2">
            <RxCard
              step="01 // КОЛОДКА"
              title={eng.rx.widthCode}
              line1={`Стопа: ${eng.footLengthMm} мм (След ${eng.lastLengthMm} мм)`}
              line2={`Пучки: ${eng.rx.ballBuildUpMm > 0 ? `+${eng.rx.ballBuildUpMm}` : eng.rx.ballBuildUpMm} мм · Взъем: ${
                eng.rx.instepBuildUpMm > 0 ? `+${eng.rx.instepBuildUpMm}` : eng.rx.instepBuildUpMm
              } мм`}
              accent={eng.rx.ballBuildUpMm !== 0 || eng.rx.instepBuildUpMm !== 0}
              isDark={isDark}
            />

            <RxCard
              step="02 // ПРОХОДИМОСТЬ (Oк)"
              title={eng.rx.requiresZipOrLaceWarning ? 'Нужна молния/шнур' : 'Вход свободный'}
              line1={`Косой обхват: ${obliqueGirthMm} мм`}
              line2={`Отклонение от базы: ${
                eng.rx.obliqueEntryDeltaMm > 0 ? `+${eng.rx.obliqueEntryDeltaMm}` : eng.rx.obliqueEntryDeltaMm
              } мм`}
              danger={eng.rx.requiresZipOrLaceWarning}
              isDark={isDark}
            />

            <RxCard
              step="03 // ТИП СТЕЛЬКИ"
              title={
                eng.rx.insoleType === 'supinator'
                  ? 'Супинатор (Вальгус)'
                  : eng.rx.insoleType === 'pronator'
                  ? 'Пронатор (Варус)'
                  : 'Анатомическая'
              }
              line1={`Выкладка свода: ${eng.rx.archSupportHeightMm} мм`}
              line2={
                eng.rx.medialHeelWedgeMm > 0
                  ? `Внутр. клин пятки: +${eng.rx.medialHeelWedgeMm} мм`
                  : eng.rx.lateralWedgeMm > 0
                  ? `Наруж. клин: +${eng.rx.lateralWedgeMm} мм`
                  : 'Клин пятки: 0 мм'
              }
              accent={eng.rx.insoleType !== 'neutral'}
              isDark={isDark}
            />

            <RxCard
              step={`04 // ШОР & ПЕЛОТ (${weightKg} КГ)`}
              title={eng.rx.shoreA.split('(')[0].trim()}
              line1={
                eng.requiresMetatarsalPad
                  ? `Пелот Зейца: ${eng.metatarsalPadHeightMm} мм`
                  : 'Пелот Зейца: Не нужен'
              }
              line2={
                eng.requiresMetatarsalPad
                  ? `Позиция: ${eng.metatarsalPadPosMm} мм от пятки`
                  : `Пик пучков: ${eng.peakForefootPressureKpa} кПа`
              }
              accent={eng.requiresMetatarsalPad}
              isDark={isDark}
            />

            <RxCard
              step="05 // КАБЛУК & ПОДОШВА"
              title={
                soleType === 'thomas'
                  ? `Томас +${eng.rx.thomasExtensionMm} мм`
                  : soleType === 'rocker'
                  ? `Рокер ${rockerAngle}°`
                  : 'Стандартный каблук'
              }
              line1={
                soleType === 'thomas'
                  ? `Упор: ${eng.rx.thomasHeelType === 'medial' ? 'Внутренний (Med)' : 'Наружный (Lat)'}`
                  : soleType === 'rocker'
                  ? `Карбон пластина: ${eng.carbonInsertThicknessMm} мм`
                  : eng.rx.recommendThomasHeel
                  ? `Рекомендован Томас +${eng.rx.recommendedThomasMm}мм!`
                  : `Перепад высот: ${eng.netRise} мм`
              }
              line2={`Нагрузка M1/M5: ${eng.loadM1Pct}% / ${eng.loadM5Pct}%`}
              danger={soleType === 'flat' && eng.rx.recommendThomasHeel}
              accent={soleType !== 'flat'}
              isDark={isDark}
            />

            <RxCard
              step="06 // ГЕЛЕНОК & АПЕКСЫ"
              title={`Сталь 65Г: ${eng.steelThickness} мм`}
              line1={`Длина: ${eng.shankLength} мм (Момент ${eng.shankBendingMomentNm} Н·м)`}
              line2={`Пучки: M1=${eng.apexM1_Mm} / M5=${eng.apexM5_Mm} мм`}
              isDark={isDark}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/** Чистая карточка ввода без обрезанных заголовков */
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

/** Компактная плашка Техкарты Мастера (6 карточек ровно в один экран) */
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
        className="font-serif text-[14px] font-semibold leading-tight my-0.5"
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
    errTitle: 'КРИТИЧЕСКИЙ НАКЛОН КОЛОДКИ',
    errDesc: `Угол ≥ ${C.CRITICAL_ANGLE}°. Уменьшите каблук или добавьте платформу.`,
    padTitle: 'ПЕРЕГРУЗКА ПУЧКОВ (> 245 кПа)',
    padDesc: 'Высокое давление под M1–M5! Нажмите «Автоподбор» для разгрузки.',
    negDropTitle: 'ОТРИЦАТЕЛЬНЫЙ ДРОП',
    negDropDesc: 'Платформа выше каблука.',
    heelBackTitle: 'СМЕЩЕНИЕ КАБЛУКА НАЗАД',
    heelBackDesc: 'Критично: риск излома супинатора 65Г.',
    heelFwdTitle: 'СМЕЩЕНИЕ КАБЛУКА ВПЕРЕД',
    heelFwdDesc: `Смещение > ${C.MAX_HEEL_OFFSET_MM} мм.`,
    invertTitle: 'РИСК ВЫВИХА / ИНВЕРСИИ',
    invertDesc: 'Боковой завал при текущем весе. Нажмите «Автоподбор».',
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
