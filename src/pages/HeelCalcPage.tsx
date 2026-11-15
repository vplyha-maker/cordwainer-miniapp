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
  const [heelHeight, setHeelHeight] = useState(30)
  const [toeThickness, setToeThickness] = useState(10)
  const [rockerAngle, setRockerAngle] = useState(14)
  const [rockerStartPct, setRockerStartPct] = useState(60)
  const [soleType, setSoleType] = useState<SoleType>('thomas')
  const [heelTipOffsetMm, setHeelTipOffsetMm] = useState(0)
  const [rockerType, setRockerType] = useState<RockerType>('forefoot')
  const [pronationDeg, setPronationDeg] = useState(-5)

  // Антропометрические обмеры стопы клиента (мм)
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
    setHeelHeight(newGender === 'male' ? 26 : 30)
    setToeThickness(10)
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
      setHeelHeight(30)
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
  const cTextMuted = isDark ? 'text-[#F4F0E8]/55' : 'text-[#1C1816]/55'
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

      {/* 1. КОМПАКТНАЯ ВЕРХНЯЯ ШАПКА + ПЕРЕКЛЮЧАТЕЛЬ ЖЕН / МУЖ */}
      <header className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0 border-b border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => {
            haptic('light')
            onBack()
          }}
          className={`flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer py-1 ${cTextMuted}`}
        >
          <span>←</span>
          <span>ОРТО-ЛАБОРАТОРИЯ</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Тип подошвы прямо в шапке */}
          <div className="flex items-center rounded-[8px] p-0.5 border border-[var(--color-border)] bg-[var(--color-surface)]">
            {(['flat', 'thomas', 'rocker'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleSoleTypeChange(type)}
                className={`px-2 py-1 rounded-[6px] text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer border-none ${
                  soleType === type
                    ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold'
                    : 'bg-transparent text-[var(--color-ink)] opacity-60'
                }`}
              >
                {t[type]}
              </button>
            ))}
          </div>

          {/* Пол ЖЕН / МУЖ */}
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

      {/* 2. ЗАКРЕПЛЕННАЯ СЦЕНА 3D / 2D (ВСЕГДА ПЕРЕД ГЛАЗАМИ ПРИ ВВОДЕ ПАРАМЕТРОВ!) */}
      <div className="px-3.5 pt-2 pb-1.5 shrink-0">
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

      {/* 3. ВКЛАДКИ ПАНЕЛИ УПРАВЛЕНИЯ МАСТЕРА */}
      <div className="px-3.5 shrink-0">
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
              className={`py-2 rounded-[8px] text-[8.5px] font-mono uppercase tracking-wider transition-all cursor-pointer border-none ${
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

      {/* 4. НИЖНЯЯ ОБЛАСТЬ КОНТРОЛОВ (СКРОЛЛИТСЯ НЕЗАВИСИМО ПОД 3D-МОДЕЛЬЮ) */}
      <div className="flex-1 overflow-y-auto px-3.5 pt-2.5 pb-8 scrollbar-hide">
        {activeTab === 'foot' && (
          <div className="grid grid-cols-2 gap-2.5">
            <CompactStepper
              label={t.size}
              sub={`${eng.footLengthMm} мм стопа`}
              value={shoeSize}
              min={gender === 'male' ? 38 : 33}
              max={gender === 'male' ? 48 : 43}
              onChange={handleSizeChange}
              isDark={isDark}
            />
            <CompactStepper
              label={t.weight}
              sub={eng.rx.shoreA.split(' ')[0] + ' Shore A'}
              value={weightKg}
              min={40}
              max={150}
              step={2}
              onChange={setWeightKg}
              unit="кг"
              isDark={isDark}
            />
            <CompactStepper
              label={t.pronation}
              sub={
                pronationDeg <= -2
                  ? 'Вальгус (внутрь)'
                  : pronationDeg >= 2
                  ? 'Варус (наружу)'
                  : 'Нейтраль'
              }
              value={pronationDeg}
              min={-12}
              max={12}
              onChange={setPronationDeg}
              unit="°"
              isDark={isDark}
            />
            <CompactStepper
              label={t.ballGirth}
              sub={`Налепка: ${eng.rx.ballBuildUpMm > 0 ? `+${eng.rx.ballBuildUpMm}` : eng.rx.ballBuildUpMm} мм`}
              value={ballGirthMm}
              min={185}
              max={295}
              onChange={setBallGirthMm}
              unit="мм"
              isDark={isDark}
            />
            <CompactStepper
              label={t.instepGirth}
              sub={`На взъем: ${eng.rx.instepBuildUpMm > 0 ? `+${eng.rx.instepBuildUpMm}` : eng.rx.instepBuildUpMm} мм`}
              value={instepGirthMm}
              min={190}
              max={310}
              onChange={setInstepGirthMm}
              unit="мм"
              isDark={isDark}
            />
            <CompactStepper
              label={t.obliqueGirth}
              sub={eng.rx.requiresZipOrLaceWarning ? 'Нужна молния/шнур!' : 'Вход свободный'}
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
          <div className="space-y-3">
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
                    className={`py-2 px-1 rounded-[8px] text-[9px] font-mono border cursor-pointer ${
                      rockerType === r.type
                        ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-transparent font-semibold'
                        : `${cLine} bg-[var(--color-surface)] ${cText} opacity-70`
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <CompactStepper
                label={t.heel}
                sub={`Дроп: ${eng.netRise} мм`}
                value={heelHeight}
                min={10}
                max={gender === 'male' ? 55 : 85}
                onChange={setHeelHeight}
                unit="мм"
                isDark={isDark}
              />
              <CompactStepper
                label={t.toe}
                sub={`Угол: ${eng.internalSlope.toFixed(1)}°`}
                value={toeThickness}
                min={0}
                max={Math.min(HEEL_CONST.MAX_TOE, heelHeight + 10)}
                onChange={setToeThickness}
                unit="мм"
                isDark={isDark}
              />
              <CompactStepper
                label={t.start}
                sub={`Апекс M1: ${eng.apexM1_Mm} мм`}
                value={rockerStartPct}
                min={55}
                max={75}
                onChange={setRockerStartPct}
                unit="%"
                isDark={isDark}
              />
              {soleType === 'rocker' ? (
                <CompactStepper
                  label={t.angle}
                  sub={`Карбон: ${eng.carbonInsertThicknessMm} мм`}
                  value={rockerAngle}
                  min={5}
                  max={28}
                  onChange={setRockerAngle}
                  unit="°"
                  isDark={isDark}
                />
              ) : (
                <CompactStepper
                  label={t.offset}
                  sub={
                    soleType === 'thomas'
                      ? `Выступ Томаса: +${eng.rx.thomasExtensionMm} мм`
                      : 'Посадка пятки'
                  }
                  value={heelTipOffsetMm}
                  min={-10}
                  max={10}
                  onChange={setHeelTipOffsetMm}
                  unit="мм"
                  isDark={isDark}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'rx' && (
          <div className={`rounded-[14px] border ${cLine} p-3.5 bg-[var(--color-surface)] space-y-2.5 text-[11px]`}>
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <span className="font-mono text-[8.5px] uppercase tracking-wider font-semibold">
                {t.masterCardTitle}
              </span>
              <span className="font-mono text-[8px] opacity-70">
                {weightKg} кг // {eng.footLengthMm} мм
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className={`p-2.5 rounded-[10px] border ${cLine}`}>
                <div className="font-mono text-[8px] uppercase opacity-55 mb-0.5">
                  1. ДОРАБОТКА КОЛОДКИ
                </div>
                <div className="font-serif text-sm font-medium">{eng.rx.widthCode}</div>
                <div className="opacity-85">
                  • Пучки (Oп):{' '}
                  <strong>
                    {eng.rx.ballBuildUpMm > 0
                      ? `+${eng.rx.ballBuildUpMm} мм (налепка)`
                      : `${eng.rx.ballBuildUpMm} мм`}
                  </strong>{' '}
                  | Взъем (Oв):{' '}
                  <strong>
                    {eng.rx.instepBuildUpMm > 0
                      ? `+${eng.rx.instepBuildUpMm} мм (гребень)`
                      : `${eng.rx.instepBuildUpMm} мм`}
                  </strong>
                </div>
                <div className={eng.rx.requiresZipOrLaceWarning ? 'text-[#E11D48] font-medium' : 'opacity-80'}>
                  • Косой обхват (Oк):{' '}
                  {eng.rx.requiresZipOrLaceWarning
                    ? `+${eng.rx.obliqueEntryDeltaMm} мм (Обязательна шнуровка или молния!)`
                    : 'Проходимость пятки в норме'}
                </div>
              </div>

              <div className={`p-2.5 rounded-[10px] border ${cLine}`}>
                <div className="font-mono text-[8px] uppercase opacity-55 mb-0.5">
                  2. ОРТОПЕДИЧЕСКАЯ СТЕЛЬКА (ПО ВЕСУ {weightKg} КГ)
                </div>
                <div className="font-serif text-sm font-medium">
                  {eng.rx.insoleType === 'supinator'
                    ? 'Супинаторная (антивальгус)'
                    : eng.rx.insoleType === 'pronator'
                    ? 'Пронаторная (антиварус)'
                    : 'Анатомическая поддержка'}
                </div>
                <div className="opacity-85">
                  • Жесткость базы: <strong>{eng.rx.shoreA}</strong>
                </div>
                <div className="opacity-85">
                  • Выкладка свода: <strong>{eng.rx.archSupportHeightMm} мм</strong>
                  {eng.rx.medialHeelWedgeMm > 0 && (
                    <span className="text-[#10B981] font-semibold">
                      {' '}
                      | Медиальный клин пятки: +{eng.rx.medialHeelWedgeMm} мм
                    </span>
                  )}
                  {eng.rx.lateralWedgeMm > 0 && (
                    <span className="text-[#D97706] font-semibold">
                      {' '}
                      | Латеральный клин: +{eng.rx.lateralWedgeMm} мм
                    </span>
                  )}
                </div>
                <div className="opacity-85">
                  • Пелот Зейца:{' '}
                  <strong>
                    {eng.requiresMetatarsalPad
                      ? `Высота ${eng.metatarsalPadHeightMm} мм (на ${eng.metatarsalPadPosMm} мм от пятки)`
                      : 'Не требуется'}
                  </strong>
                </div>
              </div>

              <div className={`p-2.5 rounded-[10px] border ${cLine}`}>
                <div className="font-mono text-[8px] uppercase opacity-55 mb-0.5">
                  3. ПОДОШВА, ГЕЛЕНОК 65Г И КАБЛУК ТОМАСА
                </div>
                <div className="opacity-85">
                  • Выступ каблука Томаса:{' '}
                  <strong className="text-[#10B981]">
                    {eng.rx.thomasHeelType === 'none'
                      ? 'Не требуется'
                      : `+${eng.rx.thomasExtensionMm} мм (${
                          eng.rx.thomasHeelType === 'medial' ? 'внутренний упор' : 'наружный упор'
                        })`}
                  </strong>
                </div>
                <div className="opacity-85">
                  • Апексы пучков: <strong>M1 = {eng.apexM1_Mm} мм / M5 = {eng.apexM5_Mm} мм</strong>
                </div>
                <div className="opacity-85">
                  • Геленок 65Г: <strong>{eng.shankLength} мм (толщина {eng.steelThickness} мм)</strong> | Пик:{' '}
                  <strong>{eng.peakForefootPressureKpa} кПа</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CompactStepper({ label, sub, value, min, max, step = 1, onChange, unit = '', isDark }: any) {
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/55' : 'text-[#1C1816]/55'

  return (
    <div
      className={`flex flex-col border ${cLine} rounded-[12px] px-3 py-2 bg-[var(--color-surface)] justify-between`}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className={`text-[7.5px] uppercase tracking-[0.15em] ${cTextMuted} truncate font-mono`}>
          {label}
        </span>
        {sub && <span className="text-[7.5px] font-mono text-[#10B981] truncate">{sub}</span>}
      </div>
      <div className="flex items-center justify-between">
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
        <span className={`font-serif text-xl tabular-nums ${cText}`}>
          {value > 0 && label.includes('Пронация') ? `+${value}` : value}
          <span className="font-sans text-[9px] ml-0.5 opacity-60">{unit}</span>
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
    </div>
  )
}

function getLabels(lang: Lang) {
  const C = HEEL_CONST
  const ru = {
    female: 'ЖЕН',
    male: 'МУЖ',
    size: 'Размер (Штихмасс)',
    weight: 'Вес пациента',
    heel: 'Высота каблука',
    toe: 'Платформа носка',
    angle: 'Угол рокера',
    start: 'Линия пучков',
    fixBtn: 'Автоподбор',
    offset: 'Смещение пятки',
    pronation: 'Пронация(−) / Суп.(+)',
    ballGirth: 'Обхват пучков (Oп)',
    instepGirth: 'Прямой взъем (Oв)',
    obliqueGirth: 'Косой обхват (Oк)',
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
    thomasNeedDesc: 'Завал стопы продавливает свод. Нажмите «Автоподбор» для каблука Томаса.',
    errTitle: 'КРИТИЧЕСКИЙ НАКЛОН КОЛОДКИ',
    errDesc: `Угол ≥ ${C.CRITICAL_ANGLE}°. Уменьшите каблук или добавьте платформу.`,
    padTitle: 'ПЕРЕГРУЗКА ПУЧКОВ (> 240 кПа)',
    padDesc: 'Высокое давление под M1–M5! Добавлен пелот Зейца, рекомендуется Рокер.',
    negDropTitle: 'ОТРИЦАТЕЛЬНЫЙ ДРОП',
    negDropDesc: 'Платформа выше каблука.',
    heelBackTitle: 'СМЕЩЕНИЕ КАБЛУКА НАЗАД',
    heelBackDesc: 'Критично: риск излома супинатора 65Г.',
    heelFwdTitle: 'СМЕЩЕНИЕ КАБЛУКА ВПЕРЕД',
    heelFwdDesc: `Смещение > ${C.MAX_HEEL_OFFSET_MM} мм.`,
    invertTitle: 'РИСК ВЫВИХА / ИНВЕРСИИ',
    invertDesc: 'Критический боковой завал при текущем весе. Нажмите «Автоподбор».',
    heelLbl: 'ПЯТКА',
    toeLbl: 'ПУЧКИ',
    flat: 'Стандарт',
    thomas: 'Томаса',
    rocker: 'Рокер',
    masterCardTitle: 'РЕЦЕПТ МАСТЕРА: КОЛОДКА, СТЕЛЬКА, ОПОРА',
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
    size: 'Розмір (Штихмас)',
    weight: 'Вага пацієнта',
    heel: 'Висота підбора',
    toe: 'Платформа носка',
    angle: 'Кут рокера',
    start: 'Лінія пучків',
    fixBtn: 'Автопідбір',
    pronation: 'Пронація(−) / Суп.(+)',
    ballGirth: 'Обхват пучків (Oп)',
    instepGirth: 'Прямий підйом (Oв)',
    obliqueGirth: 'Косий обхват (Oк)',
    successTitle: 'БІОМЕХАНІКА ЗБАЛАНСОВАНА',
    thomasNeedTitle: 'ПОТРІБЕН КАБЛУК ТОМАСА',
    padTitle: 'ПЕРЕВАНТАЖЕННЯ ПУЧКІВ (> 240 кПа)',
    flat: 'Стандарт',
    thomas: 'Томаса',
    rocker: 'Рокер',
  }
  const de = {
    ...ru,
    female: 'DAM',
    male: 'HER',
    size: 'Größe (Stichmaß)',
    weight: 'Körpergewicht',
    heel: 'Absatzhöhe',
    toe: 'Plateau',
    fixBtn: 'Auto-Fix',
    flat: 'Standard',
    thomas: 'Thomas',
    rocker: 'Rocker',
  }

  if (lang === 'uk') return uk
  if (lang === 'de') return de
  return ru
}
