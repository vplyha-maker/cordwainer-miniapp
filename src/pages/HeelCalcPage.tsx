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
  formatBallModification,
  formatInstepModification,
  type Gender,
  type SoleType,
  type RockerType,
  type ToeShape,
  type ArchMorphology,
  type AsymmetrySide,
  type FootSideProfile,
  type ShankProfileType,
} from '../lib/heelCalc'
import { buildHeelGeometry } from '../lib/heelGeometry'
import { HeelCanvas } from '../components/heel/HeelCanvas'
import { OrthoExpertReportModal } from '../components/heel/OrthoExpertReportModal'

export interface HeelCalcPageProps {
  onBack: () => void
  lang: Lang
}

type ActiveTab = 'foot' | 'anatomy' | 'sole' | 'rx'

interface TelegramHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy') => void
}

interface TelegramWindowLike {
  Telegram?: {
    WebApp?: {
      HapticFeedback?: TelegramHapticFeedback
    }
  }
}

export interface CleanStepperProps {
  label: string
  badge: string
  dangerBadge?: boolean
  value: number
  min: number
  max: number
  step?: number
  onChange: (val: number) => void
  unit?: string
  showPlus?: boolean
  isDark: boolean
}

export interface RxCardProps {
  step: string
  title: string
  line1: string
  line2: string
  accent?: boolean
  danger?: boolean
  isDark: boolean
}

function haptic(style: 'light' | 'medium' = 'light'): void {
  try {
    const win = window as unknown as TelegramWindowLike
    const tg = win.Telegram?.WebApp
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style)
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(style === 'light' ? 20 : 40)
    }
  } catch {}
}

export function HeelCalcPage({ onBack, lang }: HeelCalcPageProps) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  const [activeTab, setActiveTab] = useState<ActiveTab>('foot')
  const [reportOpen, setReportOpen] = useState(false)
  const [autoFixBanner, setAutoFixBanner] = useState<string | null>(null)

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
  const [shankProfilePreference, setShankProfilePreference] = useState<
    ShankProfileType | undefined
  >(undefined)

  // Симметричные начальные параметры по умолчанию (исправление P1.2: L === R при старте)
  const [pronationDeg, setPronationDeg] = useState(-5)
  const [ballGirthMm, setBallGirthMm] = useState(226)
  const [instepGirthMm, setInstepGirthMm] = useState(235)
  const [obliqueGirthMm, setObliqueGirthMm] = useState(296)
  const [toeShape, setToeShape] = useState<ToeShape>('egyptian')
  const [halluxValgusDeg, setHalluxValgusDeg] = useState(8)
  const [archType, setArchType] = useState<ArchMorphology>('normal')
  const [lengthAsymmetryMm, setLengthAsymmetryMm] = useState(0)
  const [asymmetrySide, setAsymmetrySide] = useState<AsymmetrySide>('equal')

  // Независимые профили Левой и Правой стопы инициализируются строго симметрично (P1.2)
  const [independentSides, setIndependentSides] = useState<boolean>(false)
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('left')
  const [leftProfile, setLeftProfile] = useState<FootSideProfile>({
    ballGirthMm: 226,
    instepGirthMm: 235,
    obliqueGirthMm: 296,
    pronationDeg: -5,
    halluxValgusDeg: 8,
    archType: 'normal',
    toeShape: 'egyptian',
  })
  const [rightProfile, setRightProfile] = useState<FootSideProfile>({
    ballGirthMm: 226,
    instepGirthMm: 235,
    obliqueGirthMm: 296,
    pronationDeg: -5,
    halluxValgusDeg: 8,
    archType: 'normal',
    toeShape: 'egyptian',
  })

  useEffect(() => {
    if (toeThickness > heelHeight + 10) {
      setToeThickness(heelHeight + 10)
    }
  }, [heelHeight, toeThickness])

  const t = useMemo(() => getLabels(lang), [lang])

  // Текущие отображаемые в степперах обхваты и углы (с учётом режима ПАРА / ЛЕВ / ПРАВ)
  const curBallGirth = independentSides
    ? activeSide === 'left'
      ? leftProfile.ballGirthMm
      : rightProfile.ballGirthMm
    : ballGirthMm
  const curInstepGirth = independentSides
    ? activeSide === 'left'
      ? leftProfile.instepGirthMm
      : rightProfile.instepGirthMm
    : instepGirthMm
  const curObliqueGirth = independentSides
    ? activeSide === 'left'
      ? leftProfile.obliqueGirthMm
      : rightProfile.obliqueGirthMm
    : obliqueGirthMm
  const curPronation = independentSides
    ? activeSide === 'left'
      ? leftProfile.pronationDeg
      : rightProfile.pronationDeg
    : pronationDeg
  const curHvDeg = independentSides
    ? activeSide === 'left'
      ? leftProfile.halluxValgusDeg
      : rightProfile.halluxValgusDeg
    : halluxValgusDeg
  const curArchType = independentSides
    ? activeSide === 'left'
      ? leftProfile.archType
      : rightProfile.archType
    : archType
  const curToeShape = independentSides
    ? activeSide === 'left'
      ? leftProfile.toeShape
      : rightProfile.toeShape
    : toeShape

  const updateSideField = <K extends keyof FootSideProfile>(
    key: K,
    val: FootSideProfile[K]
  ) => {
    setAutoFixBanner(null)
    if (!independentSides) {
      if (key === 'ballGirthMm') setBallGirthMm(val as number)
      if (key === 'instepGirthMm') setInstepGirthMm(val as number)
      if (key === 'obliqueGirthMm') setObliqueGirthMm(val as number)
      if (key === 'pronationDeg') setPronationDeg(val as number)
      if (key === 'halluxValgusDeg') setHalluxValgusDeg(val as number)
      if (key === 'archType') setArchType(val as ArchMorphology)
      if (key === 'toeShape') setToeShape(val as ToeShape)
      setLeftProfile((p) => ({ ...p, [key]: val }))
      setRightProfile((p) => ({ ...p, [key]: val }))
    } else if (activeSide === 'left') {
      setLeftProfile((p) => ({ ...p, [key]: val }))
    } else {
      setRightProfile((p) => ({ ...p, [key]: val }))
    }
  }

  const handleGenderChange = (newGender: Gender) => {
    haptic('light')
    setAutoFixBanner(null)
    const newSize = newGender === 'male' ? 42 : 38
    const std = getStandardGirths(newGender, newSize)
    setGender(newGender)
    setShoeSize(newSize)
    setWeightKg(newGender === 'male' ? 84 : 65)
    setBallGirthMm(std.ballGirthMm)
    setInstepGirthMm(std.instepGirthMm)
    setObliqueGirthMm(std.obliqueGirthMm)
    setLeftProfile((p) => ({
      ...p,
      ballGirthMm: std.ballGirthMm,
      instepGirthMm: std.instepGirthMm,
      obliqueGirthMm: std.obliqueGirthMm,
    }))
    setRightProfile((p) => ({
      ...p,
      ballGirthMm: std.ballGirthMm,
      instepGirthMm: std.instepGirthMm,
      obliqueGirthMm: std.obliqueGirthMm,
    }))
    setHeelHeight(newGender === 'male' ? 26 : 28)
    setToeThickness(12)
  }

  const handleSizeChange = (newSize: number) => {
    setAutoFixBanner(null)
    const oldStd = getStandardGirths(gender, shoeSize)
    const newStd = getStandardGirths(gender, newSize)
    const dBall = newStd.ballGirthMm - oldStd.ballGirthMm
    const dInstep = newStd.instepGirthMm - oldStd.instepGirthMm
    const dOblique = newStd.obliqueGirthMm - oldStd.obliqueGirthMm
    setShoeSize(newSize)
    setBallGirthMm((v) => v + dBall)
    setInstepGirthMm((v) => v + dInstep)
    setObliqueGirthMm((v) => v + dOblique)
    setLeftProfile((p) => ({
      ...p,
      ballGirthMm: p.ballGirthMm + dBall,
      instepGirthMm: p.instepGirthMm + dInstep,
      obliqueGirthMm: p.obliqueGirthMm + dOblique,
    }))
    setRightProfile((p) => ({
      ...p,
      ballGirthMm: p.ballGirthMm + dBall,
      instepGirthMm: p.instepGirthMm + dInstep,
      obliqueGirthMm: p.obliqueGirthMm + dOblique,
    }))
  }

  const handleAsymmetrySideChange = (side: AsymmetrySide) => {
    haptic('light')
    setAsymmetrySide(side)
    if (side === 'equal') {
      setLengthAsymmetryMm(0)
    } else if (lengthAsymmetryMm === 0) {
      setLengthAsymmetryMm(4)
    }
  }

  const handleAsymmetryMmChange = (val: number) => {
    setLengthAsymmetryMm(val)
    if (val === 0) {
      setAsymmetrySide('equal')
    } else if (asymmetrySide === 'equal') {
      setAsymmetrySide('left')
    }
  }

  const input = useMemo(
    () => ({
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
      pronationDeg: curPronation,
      ballGirthMm: curBallGirth,
      instepGirthMm: curInstepGirth,
      obliqueGirthMm: curObliqueGirth,
      toeShape: curToeShape,
      halluxValgusDeg: curHvDeg,
      archType: curArchType,
      lengthAsymmetryMm,
      asymmetrySide,
      independentSides,
      activeSide,
      leftProfile,
      rightProfile,
      shankProfilePreference,
    }),
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
      curPronation,
      curBallGirth,
      curInstepGirth,
      curObliqueGirth,
      curToeShape,
      curHvDeg,
      curArchType,
      lengthAsymmetryMm,
      asymmetrySide,
      independentSides,
      activeSide,
      leftProfile,
      rightProfile,
      shankProfilePreference,
    ]
  )

  const eng = useMemo(() => computeEngineering(input), [input])

  const audit = useMemo(
    () => computeAudit(eng, soleType, heelHeight, rockerAngle),
    [eng, soleType, heelHeight, rockerAngle]
  )

  const geometry = useMemo(
    () =>
      buildHeelGeometry({
        ...input,
        geometryModel: eng.geometryModel,
      }),
    [input, eng.geometryModel]
  )

  const handleSoleTypeChange = (type: SoleType) => {
    haptic('light')
    setAutoFixBanner(null)
    setSoleType(type)
    if (type === 'rocker') {
      const preset = ROCKER_PRESETS[rockerType]
      setRockerAngle(preset.angle)
      setRockerStartPct(preset.startPct)
    } else if (type === 'thomas' && heelHeight > HEEL_CONST.MAX_THOMAS_HEEL_MM) {
      setHeelHeight(28)
    }
  }

  const handleRockerType = (type: RockerType) => {
    haptic('light')
    setAutoFixBanner(null)
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
    setRockerStartPct(fix.rockerStartPct)
    setAutoFixBanner(fix.summaryMessage)
  }

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/60' : 'text-[#1C1816]/60'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'

  const gm = eng.geometryModel
  const se = eng.shankEngineering
  const auditTitle = t[audit.titleKey as keyof typeof t] ?? audit.titleKey
  const auditMessage = t[audit.messageKey as keyof typeof t] ?? audit.messageKey

  return (
    <div
      className={
        'fixed inset-0 flex flex-col h-[100dvh] w-full max-w-[100vw] transition-colors duration-300 ' +
        String(cBg) +
        ' ' +
        String(cText) +
        ' overflow-hidden'
      }
    >
      <style>{'* { -webkit-tap-highlight-color: transparent !important; -webkit-touch-callout: none; } .scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }'}</style>

      {/* 1. ШАПКА: ВЫХОД + РЕЖИМ ПОДОШВЫ + ПОЛ */}
      <header className="px-3.5 pt-2.5 pb-2 flex items-center justify-between gap-2 shrink-0 border-b border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => {
            haptic('light')
            onBack()
          }}
          className={
            'flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider outline-none border-none bg-transparent cursor-pointer py-1 shrink-0 ' +
            String(cTextMuted)
          }
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
                className={
                  'px-2.5 py-1 rounded-[6px] text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer border-none ' +
                  String(
                    soleType === type
                      ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold'
                      : 'bg-transparent text-[var(--color-ink)] opacity-60'
                  )
                }
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
                className={
                  'px-2 py-1 rounded-[6px] text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer border-none ' +
                  String(
                    gender === g
                      ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold'
                      : 'bg-transparent text-[var(--color-ink)] opacity-60'
                  )
                }
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
          auditTitle={auditTitle}
          auditMessage={auditMessage}
          autoFixBanner={autoFixBanner}
          gender={gender}
          soleType={soleType}
          heelHeight={heelHeight}
          toeThickness={toeThickness}
          rockerAngle={rockerAngle}
          rockerStartPct={rockerStartPct}
          heelTipOffsetMm={heelTipOffsetMm}
          pronationDeg={curPronation}
          isDark={isDark}
          labels={t}
          onFix={handleFix}
        />
      </div>

      {/* 3. ВКЛАДКИ (ОБМЕРЫ / АНАТОМИЯ & АПЕКС / ПОДОШВА / ТЕХКАРТА) */}
      <div className="px-3 shrink-0">
        <div
          className={
            'grid grid-cols-4 gap-1 p-1 rounded-[10px] border ' +
            String(cLine) +
            ' bg-[var(--color-surface)]'
          }
        >
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
              className={
                'py-1.5 rounded-[7px] text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer border-none ' +
                String(
                  activeTab === tab.id
                    ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold shadow-sm'
                    : 'bg-transparent text-[var(--color-ink)] opacity-60'
                )
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. НИЖНЯЯ ПАНЕЛЬ */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-4 scrollbar-hide">
        {/* ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМА ПОЛУПАР (ПАРА СИММЕТРИЧНО vs ЛЕВАЯ L vs ПРАВАЯ R) В ТАБАХ 1 И 2 */}
        {(activeTab === 'foot' || activeTab === 'anatomy') && (
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => {
                haptic('light')
                setIndependentSides(false)
              }}
              className={
                'py-1.5 px-2 rounded-[8px] text-[7.5px] font-mono uppercase border cursor-pointer transition-all ' +
                String(
                  !independentSides
                    ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-transparent font-semibold'
                    : String(cLine) + ' bg-[var(--color-surface)] ' + String(cText) + ' opacity-75'
                )
              }
            >
              ПАРА (ОБЩИЕ ОБМЕРЫ)
            </button>
            <button
              type="button"
              onClick={() => {
                haptic('light')
                setIndependentSides(true)
                setActiveSide('left')
              }}
              className={
                'py-1.5 px-2 rounded-[8px] text-[7.5px] font-mono uppercase border cursor-pointer transition-all ' +
                String(
                  independentSides && activeSide === 'left'
                    ? 'bg-[#10B981] text-black border-transparent font-semibold'
                    : String(cLine) + ' bg-[var(--color-surface)] ' + String(cText) + ' opacity-75'
                )
              }
            >
              ЛЕВАЯ ПОЛУПАРА (L)
            </button>
            <button
              type="button"
              onClick={() => {
                haptic('light')
                setIndependentSides(true)
                setActiveSide('right')
              }}
              className={
                'py-1.5 px-2 rounded-[8px] text-[7.5px] font-mono uppercase border cursor-pointer transition-all ' +
                String(
                  independentSides && activeSide === 'right'
                    ? 'bg-[#3186FF] text-white border-transparent font-semibold'
                    : String(cLine) + ' bg-[var(--color-surface)] ' + String(cText) + ' opacity-75'
                )
              }
            >
              ПРАВАЯ ПОЛУПАРА (R)
            </button>
          </div>
        )}

        {activeTab === 'foot' && (
          <div className="grid grid-cols-2 gap-2">
            <CleanStepper
              label="РАЗМЕР СТОПЫ"
              badge={'Стопа ' + String(gm.footLengthMm) + ' мм · След ' + String(gm.lastLengthMm) + ' мм'}
              value={shoeSize}
              min={gender === 'male' ? 38 : 33}
              max={gender === 'male' ? 48 : 43}
              onChange={handleSizeChange}
              isDark={isDark}
            />
            <CleanStepper
              label="ВЕС ЧЕЛОВЕКА"
              badge={'Стелька ' + String(eng.rx.shoreA.split(' ')[0]) + ' Шор'}
              value={weightKg}
              min={40}
              max={150}
              step={2}
              onChange={(v) => {
                setAutoFixBanner(null)
                setWeightKg(v)
              }}
              unit="кг"
              isDark={isDark}
            />
            <CleanStepper
              label={
                independentSides
                  ? 'ЗАВАЛ ПЯТКИ (' + String(activeSide === 'left' ? 'ЛЕВ' : 'ПРАВ') + ')'
                  : 'ЗАВАЛ ПЯТКИ'
              }
              badge={
                curPronation <= -2
                  ? 'Вальгус · Клин +' + String(eng.rx.medialHeelWedgeMm) + 'мм'
                  : curPronation >= 2
                    ? 'Варус · Клин +' + String(eng.rx.lateralWedgeMm) + 'мм'
                    : 'Нейтральная ось'
              }
              value={curPronation}
              min={-12}
              max={12}
              onChange={(v) => updateSideField('pronationDeg', v)}
              unit="°"
              showPlus
              isDark={isDark}
            />
            <CleanStepper
              label={
                independentSides
                  ? 'ПУЧКИ Oп (' + String(activeSide === 'left' ? 'ЛЕВ' : 'ПРАВ') + ')'
                  : 'ПУЧКИ (ОБХВАТ Oп)'
              }
              badge={
                String(gm.forefootWidthMm) + 'мм · ' + String(formatBallModification(gm.ballBuildUpMm, true))
              }
              value={curBallGirth}
              min={185}
              max={295}
              onChange={(v) => updateSideField('ballGirthMm', v)}
              unit="мм"
              isDark={isDark}
            />
            <CleanStepper
              label={
                independentSides
                  ? 'ПРЯМОЙ ВЗЪЕМ Oв (' + String(activeSide === 'left' ? 'ЛЕВ' : 'ПРАВ') + ')'
                  : 'ПРЯМОЙ ВЗЪЕМ (Oв)'
              }
              badge={formatInstepModification(gm.instepBuildUpMm, true)}
              value={curInstepGirth}
              min={190}
              max={310}
              onChange={(v) => updateSideField('instepGirthMm', v)}
              unit="мм"
              isDark={isDark}
            />
            <CleanStepper
              label={
                independentSides
                  ? 'КОСОЙ ОБХВАТ Oк (' + String(activeSide === 'left' ? 'ЛЕВ' : 'ПРАВ') + ')'
                  : 'КОСОЙ ОБХВАТ (Oк)'
              }
              badge={
                eng.rx.requiresCncLastWarning
                  ? 'ΔOк ' + String(eng.rx.obliqueEntryDeltaMm) + 'мм · ЧПУ-колодка!'
                  : eng.rx.requiresZipOrLaceWarning
                    ? String(
                        eng.rx.obliqueEntryDeltaMm >= 0
                          ? '+' + String(eng.rx.obliqueEntryDeltaMm)
                          : eng.rx.obliqueEntryDeltaMm
                      ) + 'мм · Нужен замок/шнур!'
                    : 'Пятка ' + String(gm.heelWidthMm) + 'мм · Вход свободный'
              }
              dangerBadge={eng.rx.requiresZipOrLaceWarning || eng.rx.requiresCncLastWarning}
              value={curObliqueGirth}
              min={250}
              max={390}
              onChange={(v) => updateSideField('obliqueGirthMm', v)}
              unit="мм"
              isDark={isDark}
            />
          </div>
        )}

        {/* ВКЛАДКА 2: АНАТОМИЯ ПАЛЬЦЕВ, HALLUX VALGUS, СВОДЫ, АСИММЕТРИЯ И АПЕКС КОЛОДКИ */}
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
                    updateSideField('toeShape', item.id)
                  }}
                  className={
                    'p-2 rounded-[10px] border text-left cursor-pointer transition-all ' +
                    String(
                      curToeShape === item.id
                        ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-transparent'
                        : String(cLine) + ' bg-[var(--color-surface)] ' + String(cText)
                    )
                  }
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
                    updateSideField('archType', item.id)
                  }}
                  className={
                    'p-2 rounded-[10px] border text-left cursor-pointer transition-all ' +
                    String(
                      curArchType === item.id
                        ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-transparent'
                        : String(cLine) + ' bg-[var(--color-surface)] ' + String(cText)
                    )
                  }
                >
                  <div className="font-mono text-[8px] font-semibold">{item.title}</div>
                  <div className="text-[8px] opacity-75">{item.sub}</div>
                </button>
              ))}
            </div>

            {/* Выбор стороны асимметрии стоп (left longer / equal / right longer) */}
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  {
                    id: 'left' as const,
                    title: 'ЛЕВАЯ ДЛИННЕЕ',
                    sub: 'Лев ' + String(gm.leftFootLengthMm) + ' > Прав ' + String(gm.rightFootLengthMm),
                  },
                  {
                    id: 'equal' as const,
                    title: 'РАВНЫЕ СТОПЫ',
                    sub: 'Лев = Прав (' + String(gm.footLengthMm) + ' мм)',
                  },
                  {
                    id: 'right' as const,
                    title: 'ПРАВАЯ ДЛИННЕЕ',
                    sub: 'Прав ' + String(gm.rightFootLengthMm) + ' > Лев ' + String(gm.leftFootLengthMm),
                  },
                ]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAsymmetrySideChange(item.id)}
                  className={
                    'p-1.5 rounded-[10px] border text-left cursor-pointer transition-all ' +
                    String(
                      gm.longerFootSide === item.id
                        ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-transparent'
                        : String(cLine) + ' bg-[var(--color-surface)] ' + String(cText)
                    )
                  }
                >
                  <div className="font-mono text-[7.5px] font-semibold">{item.title}</div>
                  <div className="text-[7.5px] opacity-75">{item.sub}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <CleanStepper
                label={
                  independentSides
                    ? 'HALLUX VALGUS (' + String(activeSide === 'left' ? 'ЛЕВ' : 'ПРАВ') + ')'
                    : 'HALLUX VALGUS (I ПАЛЕЦ)'
                }
                badge={
                  gm.medialBunionPocketMm > 0
                    ? 'Карман на колодке +' + String(gm.medialBunionPocketMm) + ' мм'
                    : 'Без деформации M1'
                }
                dangerBadge={curHvDeg >= 15}
                value={curHvDeg}
                min={0}
                max={35}
                onChange={(v) => updateSideField('halluxValgusDeg', v)}
                unit="°"
                isDark={isDark}
              />
              <CleanStepper
                label="РАЗНИЦА ДЛИН СТОП (ΔL)"
                badge={
                  gm.requiresMismatchedPairLasts
                    ? 'Распаровка колодок! Вкладыш +' + String(gm.compensatoryInsoleHalfPairMm) + 'мм'
                    : gm.compensatoryInsoleHalfPairMm > 0
                      ? 'Полустелька +' +
                        String(gm.compensatoryInsoleHalfPairMm) +
                        ' мм (' +
                        String(gm.shorterFootSide === 'right' ? 'в прав.' : 'в лев.') +
                        ')'
                      : 'В пределах нормы (≤ 3 мм)'
                }
                dangerBadge={gm.requiresMismatchedPairLasts}
                value={gm.lengthAsymmetryMm}
                min={0}
                max={14}
                onChange={handleAsymmetryMmChange}
                unit="мм"
                isDark={isDark}
              />
            </div>

            <div
              className={
                'p-2.5 rounded-[11px] border ' +
                String(cLine) +
                ' bg-[var(--color-surface)] text-[10px]'
              }
            >
              <div className="font-mono text-[8px] uppercase text-[#10B981] font-semibold">
                РЕКОМЕНДУЕМАЯ ГЕОМЕТРИЯ МЫСКА И АПЕКСА КОЛОДКИ:
              </div>
              <div className="font-serif text-[13px] font-medium mt-0.5">
                {gm.lastApexLabel}
              </div>
              <div className="opacity-80 mt-0.5">
                Медиальное смещение апекса мыска:{' '}
                <strong>+{gm.toeBoxShiftMedialMm} мм</strong> · Высота носочной коробки:{' '}
                <strong>{gm.toeBoxHeightMm} мм</strong> · Косая метатарзальная ось сгиба:{' '}
                <strong>{gm.metatarsalObliqueAngleDeg}°</strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sole' && (
          <div className="space-y-2.5">
            {soleType === 'rocker' ? (
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
                    className={
                      'py-1.5 px-1 rounded-[8px] text-[8.5px] font-mono border cursor-pointer ' +
                      String(
                        rockerType === r.type
                          ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-transparent font-semibold'
                          : String(cLine) +
                            ' bg-[var(--color-surface)] ' +
                            String(cText) +
                            ' opacity-75'
                      )
                    }
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            ) : (
              /* Выбор профиля стального геленка 65Г (Авто / Плоский / Желобчатый с ребром жёсткости) */
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: undefined, label: 'ГЕЛЕНОК: АВТО' },
                    { id: 'flat_plate' as const, label: 'ПЛОСКИЙ 65Г' },
                    { id: 'fluted_ribbed' as const, label: 'ЖЕЛОБЧАТЫЙ (РЕБРО)' },
                  ]
                ).map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      haptic('light')
                      setShankProfilePreference(item.id)
                    }}
                    className={
                      'py-1.5 px-1 rounded-[8px] text-[7.5px] font-mono border cursor-pointer ' +
                      String(
                        shankProfilePreference === item.id
                          ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-transparent font-semibold'
                          : String(cLine) +
                            ' bg-[var(--color-surface)] ' +
                            String(cText) +
                            ' opacity-75'
                      )
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <CleanStepper
                label="ВЫСОТА КАБЛУКА"
                badge={'Чистый перепад: ' + String(gm.netRiseMm) + ' мм'}
                dangerBadge={eng.thomasTooHigh || eng.rockerTooHigh}
                value={heelHeight}
                min={10}
                max={gender === 'male' ? 55 : 85}
                onChange={(v) => {
                  setAutoFixBanner(null)
                  setHeelHeight(v)
                }}
                unit="мм"
                isDark={isDark}
              />
              <CleanStepper
                label="ПЛАТФОРМА НОСКА"
                badge={'Уклон стопы: ' + String(eng.internalSlope.toFixed(1)) + '°'}
                value={toeThickness}
                min={0}
                max={Math.min(HEEL_CONST.MAX_TOE, heelHeight + 10)}
                onChange={(v) => {
                  setAutoFixBanner(null)
                  setToeThickness(v)
                }}
                unit="мм"
                isDark={isDark}
              />
              <CleanStepper
                label="ЛИНИЯ ПУЧКОВ"
                badge={'M1: ' + String(gm.xApexM1Mm) + 'мм · M5: ' + String(gm.xApexM5Mm) + 'мм'}
                value={rockerStartPct}
                min={55}
                max={75}
                onChange={(v) => {
                  setAutoFixBanner(null)
                  setRockerStartPct(v)
                }}
                unit="%"
                isDark={isDark}
              />
              {soleType === 'rocker' ? (
                <CleanStepper
                  label="УГОЛ РОКЕРА"
                  badge={'Карбон CFRP: ' + String(gm.carbonInsertThicknessMm) + ' мм (k=' + String(se.fatigueSafetyFactor) + ')'}
                  value={rockerAngle}
                  min={5}
                  max={HEEL_CONST.MAX_ROCKER_ANGLE}
                  onChange={(v) => {
                    setAutoFixBanner(null)
                    setRockerAngle(v)
                  }}
                  unit="°"
                  isDark={isDark}
                />
              ) : (
                <CleanStepper
                  label="ПОСАДКА ПЯТКИ (ДОПУСК −2…+5)"
                  badge={
                    soleType === 'thomas'
                      ? 'Томас +' +
                        String(gm.thomasExtensionMm) +
                        'мм (' +
                        String(gm.thomasHeelType === 'medial' ? 'Внутр' : 'Наруж') +
                        ')'
                      : 'Норма: от ' +
                        String(HEEL_CONST.MIN_SAFE_HEEL_OFFSET_MM) +
                        ' до +' +
                        String(HEEL_CONST.MAX_SAFE_HEEL_OFFSET_MM) +
                        ' мм'
                  }
                  dangerBadge={eng.heelOffsetTooFarBack || eng.heelOffsetTooFarForward}
                  value={heelTipOffsetMm}
                  min={HEEL_CONST.MIN_HEEL_OFFSET_SLIDER_MM}
                  max={HEEL_CONST.MAX_HEEL_OFFSET_SLIDER_MM}
                  onChange={(v) => {
                    setAutoFixBanner(null)
                    setHeelTipOffsetMm(v)
                  }}
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
              <span>📋 ОТКРЫТЬ ПОЛНЫЙ ОТЧЕТ КОНСИЛИУМА (L/R + 65Г/CFRP + 3 УРОВНЯ ТЗ)</span>
              <span>↗</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <RxCard
                step="01 // КОЛОДКА & ОБХВАТЫ"
                title={eng.rx.widthCode}
                line1={'След: ' + String(gm.lastLengthMm) + ' мм · Мысок H=' + String(gm.toeBoxHeightMm) + ' мм'}
                line2={
                  'Слой пучков: ' +
                  String(gm.ballRadialLayerMm >= 0 ? '+' + String(gm.ballRadialLayerMm) : gm.ballRadialLayerMm) +
                  'мм · Взъём: ' +
                  String(
                    gm.instepRadialLayerMm >= 0
                      ? '+' + String(gm.instepRadialLayerMm)
                      : gm.instepRadialLayerMm
                  ) +
                  'мм'
                }
                accent={gm.ballBuildUpMm !== 0 || gm.instepBuildUpMm !== 0}
                isDark={isDark}
              />

              <RxCard
                step="02 // МЫСОК, HV & ПОЛУПАРЫ"
                title={
                  gm.lastApexType === 'oblique_anatomical'
                    ? 'Косой апекс (II луч)'
                    : gm.lastApexType === 'wide_square'
                      ? 'Широкий апекс (I–III)'
                      : 'Прямой апекс (I луч)'
                }
                line1={
                  'Сдвиг апекса: +' +
                  String(gm.toeBoxShiftMedialMm) +
                  ' мм · Сгиб ' +
                  String(gm.metatarsalObliqueAngleDeg) +
                  '°'
                }
                line2={
                  gm.medialBunionPocketMm > 0
                    ? 'Карман HV: +' +
                      String(gm.medialBunionPocketMm) +
                      ' мм' +
                      String(
                        gm.compensatoryInsoleHalfPairMm > 0
                          ? ' · Вкладыш +' + String(gm.compensatoryInsoleHalfPairMm) + 'мм'
                          : ''
                      )
                    : gm.compensatoryInsoleHalfPairMm > 0
                      ? 'Полустелька +' +
                        String(gm.compensatoryInsoleHalfPairMm) +
                        ' мм (' +
                        String(gm.shorterFootSide === 'right' ? 'в прав.' : 'в лев.') +
                        ')'
                      : 'Стопы: Лев ' +
                        String(gm.leftFootLengthMm) +
                        ' / Прав ' +
                        String(gm.rightFootLengthMm) +
                        ' мм'
                }
                accent={gm.medialBunionPocketMm > 0 || gm.compensatoryInsoleHalfPairMm > 0}
                isDark={isDark}
              />

              <RxCard
                step="03 // СТЕЛЬКА & ЭВРИСТИКА ДАВЛЕНИЯ"
                title={
                  !eng.rx.orthoticIndicated
                    ? 'Профилактическая'
                    : eng.rx.insoleType === 'supinator'
                      ? 'Супинатор (Вальгус)'
                      : eng.rx.insoleType === 'pronator'
                        ? 'Пронатор (Варус)'
                        : 'Разгрузочная'
                }
                line1={
                  'Свод: ' +
                  String(eng.rx.archSupportHeightMm) +
                  ' мм · ' +
                  String(eng.rx.shoreA.split(' ')[0]) +
                  ' Шор'
                }
                line2={
                  'Пик (' +
                  String(eng.pressureModel.dominantMetatarsalRay) +
                  '): ' +
                  String(eng.peakForefootPressureKpa) +
                  ' кПа (эврист.) · Клин +' +
                  String(Math.max(eng.rx.medialHeelWedgeMm, eng.rx.lateralWedgeMm)) +
                  ' мм'
                }
                accent={eng.rx.orthoticIndicated}
                isDark={isDark}
              />

              <RxCard
                step="04 // УСИЛИТЕЛЬ (10^6 ЦИКЛОВ) & ОПОРА"
                title={
                  soleType === 'thomas'
                    ? 'Каблук Томаса +' + String(gm.thomasExtensionMm) + ' мм'
                    : soleType === 'rocker'
                      ? 'Рокер ' + String(gm.rockerAngleDeg) + '° + Карбон CFRP'
                      : 'Стандартный каблук'
                }
                line1={
                  gm.requiresMetatarsalPad
                    ? 'Пелот Зейца: ' +
                      String(gm.metatarsalPadHeightMm) +
                      'мм (на ' +
                      String(gm.metatarsalPadPosMm) +
                      'мм)'
                    : 'Пелот Зейца: Не требуется'
                }
                line2={
                  soleType === 'rocker'
                    ? 'CFRP ' +
                      String(se.shankWidthMm) +
                      '×' +
                      String(gm.carbonInsertThicknessMm) +
                      'мм (σ=' +
                      String(se.estimatedBendingStressMpa) +
                      'МПа, k=' +
                      String(se.fatigueSafetyFactor) +
                      ')'
                    : String(se.profileType === 'fluted_ribbed' ? 'Желоб 65Г ' : 'Плоск 65Г ') +
                      String(gm.shankLengthMm) +
                      '×' +
                      String(gm.steelThicknessMm) +
                      'мм (σ=' +
                      String(se.estimatedBendingStressMpa) +
                      'МПа, k=' +
                      String(se.fatigueSafetyFactor) +
                      ')'
                }
                danger={se.isOverloaded}
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
}: CleanStepperProps) {
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/60' : 'text-[#1C1816]/60'

  const dispVal = showPlus && value > 0 ? '+' + String(value) : String(value)

  return (
    <div
      className={
        'flex flex-col border ' +
        String(cLine) +
        ' rounded-[12px] px-2.5 py-2 bg-[var(--color-surface)] justify-between'
      }
    >
      <div
        className={
          'text-[8px] uppercase tracking-wider font-mono font-semibold ' + String(cTextMuted)
        }
      >
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
          className={
            'w-7 h-7 flex items-center justify-center rounded-[7px] bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] text-base leading-none outline-none cursor-pointer touch-manipulation ' +
            String(
              value <= min
                ? 'opacity-20 cursor-not-allowed'
                : 'active:scale-95 ' + String(cText)
            )
          }
        >
          −
        </button>

        <span className={'font-serif text-xl font-medium tabular-nums ' + String(cText)}>
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
          className={
            'w-7 h-7 flex items-center justify-center rounded-[7px] bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] text-base leading-none outline-none cursor-pointer touch-manipulation ' +
            String(
              value >= max
                ? 'opacity-20 cursor-not-allowed'
                : 'active:scale-95 ' + String(cText)
            )
          }
        >
          +
        </button>
      </div>

      <div
        className={
          'text-[8.5px] font-mono leading-tight ' +
          String(dangerBadge ? 'text-[#E11D48] font-semibold' : 'text-[#10B981]')
        }
      >
        {badge}
      </div>
    </div>
  )
}

function RxCard({
  step,
  title,
  line1,
  line2,
  accent = false,
  danger = false,
  isDark,
}: RxCardProps) {
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/55' : 'text-[#1C1816]/55'

  return (
    <div
      className={
        'flex flex-col justify-between rounded-[11px] border p-2.5 bg-[var(--color-surface)] ' +
        String(cLine)
      }
    >
      <div className={'text-[7.5px] font-mono uppercase tracking-wider ' + String(cTextMuted)}>
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
    successDesc:
      'Нормированная эвристика давления M1–M5, ресурс усилителя 10^6 циклов и инварианты колодки в норме.',
    warnTitle: 'ПОВЫШЕННАЯ НАГРУЗКА / КЛИНИЧЕСКИЙ КОНТРОЛЬ',
    warn1Desc:
      'Уклон > ' + String(C.COMFORT_ANGLE) + '°. Проверьте жесткость стельки в Техкарте.',
    warn2Desc: 'Сильный угол рокера при низком каблуке.',
    girthWarnTitle: 'ОСОБЫЕ ТРЕБОВАНИЯ К КОЛОДКЕ / РАСКРЫВАЕМОСТИ',
    girthWarnDesc:
      'Проверьте доработку гребня/пучков, шнуровку и клинические рекомендации в Техкарте.',
    thomasNeedTitle: 'РЕКОМЕНДУЕТСЯ КАБЛУК ТОМАСА',
    thomasNeedDesc:
      'Выраженный завал пятки на стандартной подошве — рассмотрите вкладку «Томаса».',
    errTitle: 'ПЕРЕГРУЗКА УСИЛИТЕЛЯ (10^6 ЦИКЛОВ) / ВЫСОКИЙ КАБЛУК',
    errDesc:
      'Превышен предельный момент/усталость 65Г (CFRP) или лимит высоты подошвы. Нажмите «Автоподбор».',
    padTitle: 'ПЕРЕГРУЗКА ПУЧКОВ M1–M5 (> 245 кПа, эврист.)',
    padDesc:
      'Высокая расчётная оценка давления по эвристике M1–M5! Нажмите «Автоподбор».',
    negDropTitle: 'ОТРИЦАТЕЛЬНЫЙ ДРОП (ОШИБКА)',
    negDropDesc: 'Платформа носка выше пятки! Нажмите «Автоподбор» для выравнивания.',
    heelBackTitle:
      'СМЕЩЕНИЕ КАБЛУКА НАЗАД (< ' + String(C.MIN_SAFE_HEEL_OFFSET_MM) + ' мм)',
    heelBackDesc: 'Критично: консольный риск излома супинатора 65Г. Нажмите «Автоподбор».',
    heelFwdTitle:
      'СМЕЩЕНИЕ ПЯТКИ ВПЕРЕД (> +' + String(C.MAX_SAFE_HEEL_OFFSET_MM) + ' мм)',
    heelFwdDesc: 'Нарушена соосность пяточного упора. Нажмите «Автоподбор».',
    invertTitle: 'РИСК ВЫВИХА / ТЯЖЕЛЫЙ ВАЛЬГУС',
    invertDesc:
      'Боковой завал при текущем весе перегружает голеностоп. Нажмите «Автоподбор».',
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
    thomasNeedTitle: 'РЕКОМЕНДУЄТЬСЯ КАБЛУК ТОМАСА',
    padTitle: 'ПЕРЕВАНТАЖЕННЯ ПУЧКІВ (> 245 кПа, евріст.)',
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
