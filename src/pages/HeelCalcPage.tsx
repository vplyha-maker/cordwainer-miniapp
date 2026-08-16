import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'

// --- КОНСТАНТЫ И КОЭФФИЦИЕНТЫ ---
const STEP_TO_MM = 6.67
const FUNCTIONAL_ALLOWANCE = 12
const L_EFF_RATIO = 0.73
const SHANK_PROPORTION = 0.48
const SHANK_OFFSET = 15
const MAX_TOE = 80
const MAX_LIFT = 50
const CRITICAL_ANGLE = 18
const COMFORT_ANGLE = 14
const SAFE_ANGLE = 14.5
const CRITICAL_LOAD = 80
const MAX_ROCKER_ANGLE = 30
const ROCKER_MITIGATION_CAP = 0.25
/** Линия центра тяжести (Heel Center Line): 15% длины стельки */
const HEEL_CENTER_RATIO = 0.15
/** Допустимое смещение набойки вперёд, мм */
const MAX_HEEL_OFFSET_MM = 5

type SoleType = 'flat' | 'rocker'
type HeelType = 'stiletto' | 'block' | 'kitten'

type HeelCalcPageProps = {
  onBack: () => void
  lang: Lang
}

export function HeelCalcPage({ onBack, lang }: HeelCalcPageProps) {
  const [shoeSize, setShoeSize] = useState(38)
  const [heelHeight, setHeelHeight] = useState(55)
  const [toeThickness, setToeThickness] = useState(10)
  const [rockerAngle, setRockerAngle] = useState(12)
  const [rockerStartPct, setRockerStartPct] = useState(65)

  const [soleType, setSoleType] = useState<SoleType>('flat')
  const [heelType, setHeelType] = useState<HeelType>('stiletto')
  const [showSpecs, setShowSpecs] = useState(false)

  // Защита: платформа не может быть абсурдно выше каблука
  useEffect(() => {
    if (toeThickness > heelHeight + 10) {
      setToeThickness(heelHeight + 10)
    }
  }, [heelHeight, toeThickness])

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
      else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 20 : 40)
    } catch {}
  }

  const t = {
    ru: {
      title: 'Инженерия и Баланс',
      desc: 'Аудит профиля и каблука',
      size: 'Размер',
      heel: 'Каблук',
      toe: 'Платформа',
      angle: 'Угол',
      start: 'Перекат',
      fixBtn: 'Баланс',
      internalSlope: 'Наклон колодки:',
      loadLbl: 'Нагрузка на плюсну:',
      successTitle: '✅ БАЛАНС В НОРМЕ',
      successDesc: 'Физиологическая норма.',
      warnTitle: '⚠️ ВЫСОКИЙ ПОДЪЕМ',
      warn1Desc: `Угол больше ${COMFORT_ANGLE}°. Увеличьте платформу или уменьшите каблук.`,
      warn2Desc: 'Чрезмерный рокер при низком каблуке.',
      errTitle: '⚠️ КРИТИЧЕСКИЙ НАКЛОН',
      errDesc: `Угол колодки > ${CRITICAL_ANGLE}°. Требуется утолщение платформы или снижение каблука.`,
      padTitle: '⚠️ КРИТИЧЕСКАЯ НАГРУЗКА НА ПЛЮСНУ',
      padDesc:
        'Требуется обязательная установка встроенного метатарзального пелота (капли Зейца) в стельку для разгрузки нервных окончаний.',
      negDropTitle: '⚠️ ОБРАТНЫЙ УКЛОН',
      negDropDesc: 'Платформа выше каблука. Нарушение биомеханики.',
      heelBackTitle: '⚠️ КАБЛУК ЗАВАЛЕН НАЗАД',
      heelBackDesc: 'Ошибка: каблук завален назад — риск перелома супинатора под весом пациента.',
      heelLbl: 'ПЯТКА',
      toeLbl: 'НОСОК',
      stiletto: 'Шпилька',
      block: 'Блок',
      kitten: 'Рюмочка',
      flat: 'Стандарт',
      rocker: 'Рокер',
      specsBtn: '⚙️ Спецификация и Математика',
      dropLbl: 'Перепад',
      formulaStandard: 'P = 50 + ((H − T) / L_eff) × 100',
      formulaRocker: 'P_rocker = P × (1 − 0.25 × rockerFactor)',
    },
    uk: {
      title: 'Інженерія та Баланс',
      desc: 'Аудит профілю та підбора',
      size: 'Розмір',
      heel: 'Підбор',
      toe: 'Платформа',
      angle: 'Кут',
      start: 'Перекат',
      fixBtn: 'Баланс',
      internalSlope: 'Нахил колодки:',
      loadLbl: 'Навантаження на плюсну:',
      successTitle: '✅ БАЛАНС У НОРМІ',
      successDesc: 'Фізіологічна норма.',
      warnTitle: '⚠️ ВИСОКИЙ ПІДЙОМ',
      warn1Desc: `Кут більше ${COMFORT_ANGLE}°. Збільште платформу або зменште підбор.`,
      warn2Desc: 'Надмірний рокер при низькому підборі.',
      errTitle: '⚠️ КРИТИЧНИЙ НАХИЛ',
      errDesc: `Кут колодки > ${CRITICAL_ANGLE}°. Потрібне потовщення платформи або зниження підбора.`,
      padTitle: '⚠️ КРИТИЧНЕ НАВАНТАЖЕННЯ НА ПЛЮСНУ',
      padDesc:
        'Потрібна обовʼязкова установка вбудованого метатарзального пелота (краплі Зейца) у устілку для розвантаження нервових закінчень.',
      negDropTitle: '⚠️ ЗВОРОТНІЙ УХИЛ',
      negDropDesc: 'Платформа вища за підбор. Порушення біомеханіки.',
      heelBackTitle: '⚠️ ПІДБОР ЗАВАЛЕНИЙ НАЗАД',
      heelBackDesc: 'Помилка: підбор завалений назад — ризик перелому супінатора під вагою пацієнта.',
      heelLbl: "П'ЯТКА",
      toeLbl: 'НОСОК',
      stiletto: 'Шпилька',
      block: 'Блок',
      kitten: 'Чарочка',
      flat: 'Стандарт',
      rocker: 'Рокер',
      specsBtn: '⚙️ Специфікація та Математика',
      dropLbl: 'Перепад',
      formulaStandard: 'P = 50 + ((H − T) / L_eff) × 100',
      formulaRocker: 'P_rocker = P × (1 − 0.25 × rockerFactor)',
    },
  }[lang]

  // --- 2. Инженерные вычисления (раздельно: standard / rocker) ---
  const engineeringData = useMemo(() => {
    const lastLengthMm = shoeSize * STEP_TO_MM + FUNCTIONAL_ALLOWANCE
    const lEff = lastLengthMm * L_EFF_RATIO
    const netRise = heelHeight - toeThickness

    const asinArg = lEff > 0 ? Math.max(-1, Math.min(1, netRise / lEff)) : 0
    const internalSlope = Math.asin(asinArg) * (180 / Math.PI)

    // Главная формула аудита шпилек:
    // P_forefoot = 50 + ((H_heel - T_toe) / L_eff) * 100
    let loadCalc = 50 + (netRise / Math.max(lEff, 1)) * 100

    // Mitigation только для рокерной подошвы
    if (soleType === 'rocker') {
      const rockerEffectFactor =
        Math.min(1, rockerAngle / MAX_ROCKER_ANGLE) *
        (1 - (rockerStartPct - 55) / 40)
      loadCalc = loadCalc * (1 - ROCKER_MITIGATION_CAP * Math.max(0, rockerEffectFactor))
    }

    const forefootLoad = Math.min(100, Math.max(0, Math.round(loadCalc)))

    const shankLength = Math.round(lastLengthMm * SHANK_PROPORTION + SHANK_OFFSET)

    let steelThickness = 1.2
    if (netRise > 40 && netRise <= 70) steelThickness = 1.5
    else if (netRise > 70) steelThickness = 2.0

    const heelCenterXRatio = HEEL_CENTER_RATIO

    let estimatedHeelTipOffsetMm = 0
    if (soleType === 'flat') {
      if (heelType === 'stiletto') {
        estimatedHeelTipOffsetMm = netRise > 60 ? -2 : 0
      } else if (heelType === 'kitten') {
        estimatedHeelTipOffsetMm = 1
      } else {
        estimatedHeelTipOffsetMm = 3
      }
    }

    const heelOffsetTooFarBack = estimatedHeelTipOffsetMm < -0.5
    const heelOffsetTooFarForward = estimatedHeelTipOffsetMm > MAX_HEEL_OFFSET_MM

    return {
      lastLengthMm,
      internalSlope,
      forefootLoad,
      shankLength,
      steelThickness,
      netRise,
      lEff,
      heelCenterXRatio,
      estimatedHeelTipOffsetMm,
      heelOffsetTooFarBack,
      heelOffsetTooFarForward,
      requiresMetatarsalPad: forefootLoad > CRITICAL_LOAD,
    }
  }, [shoeSize, heelHeight, toeThickness, rockerAngle, rockerStartPct, soleType, heelType])

  // --- 3. Аудит и баланс ---
  const balanceAudit = useMemo(() => {
    let status: 'SUCCESS' | 'WARNING' | 'ERROR' = 'SUCCESS'
    let title = t.successTitle
    let message = t.successDesc
    let colors = 'border-green-500/30 bg-green-500/10 text-green-400'
    let boxColors = 'border-green-500/20 bg-[#1C1816]'

    const activeRocker = soleType === 'rocker' ? rockerAngle : 0

    if (engineeringData.heelOffsetTooFarBack) {
      status = 'ERROR'
      title = t.heelBackTitle
      message = t.heelBackDesc
      colors = 'border-red-500/30 bg-red-500/20 text-red-400'
      boxColors = 'border-red-500/40 bg-red-950/20'
    } else if (engineeringData.internalSlope < 0) {
      status = 'WARNING'
      title = t.negDropTitle
      message = t.negDropDesc
      colors = 'border-blue-500/30 bg-blue-500/20 text-blue-400'
      boxColors = 'border-blue-500/40 bg-blue-950/20'
    } else if (engineeringData.requiresMetatarsalPad) {
      status = 'ERROR'
      title = t.padTitle
      message = t.padDesc
      colors = 'border-red-500/30 bg-red-500/20 text-red-400'
      boxColors = 'border-red-500/40 bg-red-950/20'
    } else if (
      engineeringData.internalSlope >= CRITICAL_ANGLE ||
      engineeringData.forefootLoad >= CRITICAL_LOAD
    ) {
      status = 'ERROR'
      title = t.errTitle
      message = t.errDesc
      colors = 'border-red-500/30 bg-red-500/20 text-red-400'
      boxColors = 'border-red-500/40 bg-red-950/20'
    } else if (engineeringData.internalSlope > COMFORT_ANGLE) {
      status = 'WARNING'
      title = t.warnTitle
      message = t.warn1Desc
      colors = 'border-amber-500/30 bg-amber-500/20 text-amber-400'
      boxColors = 'border-amber-500/40 bg-amber-950/20'
    } else if (heelHeight < 20 && activeRocker > 16) {
      status = 'WARNING'
      title = t.warnTitle
      message = t.warn2Desc
      colors = 'border-amber-500/30 bg-amber-500/20 text-amber-400'
      boxColors = 'border-amber-500/40 bg-amber-950/20'
    }

    return { status, title, message, colors, boxColors }
  }, [engineeringData, rockerAngle, soleType, heelHeight, t])

  // --- 4. Умный Auto-Fix ---
  const handleAutoFix = () => {
    triggerHaptic('medium')

    const targetAngleRad = (SAFE_ANGLE * Math.PI) / 180
    const maxSafeNetRise = engineeringData.lEff * Math.sin(targetAngleRad)

    const neededPlatform = Math.max(0, Math.round(heelHeight - maxSafeNetRise))

    let finalPlatform = toeThickness
    let finalHeel = heelHeight

    if (neededPlatform <= MAX_TOE) {
      finalPlatform = neededPlatform
    } else {
      finalPlatform = MAX_TOE
      finalHeel = Math.round(MAX_TOE + maxSafeNetRise)
      setHeelHeight(finalHeel)
    }

    setToeThickness(finalPlatform)

    if (soleType === 'rocker') {
      const newNetRise = finalHeel - finalPlatform
      const newSlope =
        Math.asin(Math.max(-1, Math.min(1, newNetRise / engineeringData.lEff))) * (180 / Math.PI)
      const idealRocker = Math.round(newSlope * 0.8)
      setRockerAngle(Math.max(5, Math.min(20, idealRocker)))
    }
  }
  // --- 5. SVG-геометрия + Heel Center Line ---
  const geometry = useMemo(() => {
    const totalLength = shoeSize * STEP_TO_MM + FUNCTIONAL_ALLOWANCE
    const scale = 0.85
    const padding = 45

    const svgWidth = totalLength * scale + padding * 2
    const svgHeight = 180

    const xHeel = padding
    const xBall = padding + totalLength * (rockerStartPct / 100) * scale
    const xToe = padding + totalLength * scale

    // Вертикаль центра пятки (15% длины стельки)
    const xHeelCenter = padding + totalLength * engineeringData.heelCenterXRatio * scale

    const yGround = 150

    const hScaled = heelHeight * scale
    const tScaled = toeThickness * scale

    const yFootHeel = yGround - hScaled
    const yFootBall = yGround - tScaled

    const activeRockerAngle = soleType === 'rocker' ? rockerAngle : 0
    const rockerZoneLength = xToe - xBall
    const rockerAngleRad = activeRockerAngle * (Math.PI / 180)

    const safeSine = Math.min(1, Math.max(0, Math.sin(rockerAngleRad)))
    const toeLiftRaw = rockerZoneLength * safeSine
    const toeLiftScaled = Math.min(MAX_LIFT * scale, toeLiftRaw)
    const yFootToe = yFootBall - toeLiftScaled

    const controlX1 = xHeel + (xBall - xHeel) * 0.4
    const controlX2 = xHeel + (xBall - xHeel) * 0.7

    const controlY1 = yFootHeel * 0.7 + yFootBall * 0.3
    const controlY2 = yFootHeel * 0.3 + yFootBall * 0.7

    const topPath = `
      M ${xHeel - 5} ${yFootHeel - 5}
      L ${xHeel} ${yFootHeel}
      C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${xBall} ${yFootBall}
      Q ${xBall + rockerZoneLength * 0.5} ${yFootBall}, ${xToe} ${yFootToe}
    `

    const platformBase = Math.max(tScaled, 2)
    const heelBodyThickness = Math.min(hScaled, Math.max(5 * scale, platformBase * 0.15))
    const yHeelBase = yFootHeel + heelBodyThickness

    const yBottomBall = yGround
    const yBottomToe = soleType === 'rocker' ? yFootToe + platformBase : yGround - 2

    const bottomPath = `
      L ${xToe} ${yBottomToe}
      Q ${xBall + rockerZoneLength * 0.5} ${yBottomBall}, ${xBall} ${yBottomBall}
      C ${controlX2} ${yBottomBall}, ${controlX1} ${yHeelBase}, ${xHeel} ${yHeelBase}
      Z
    `
    const solePath = topPath + bottomPath

    const heelW = 20 * scale
    const getHeelPath = () => {
      if (soleType === 'rocker') {
        return `
          M ${xHeel} ${yHeelBase - 0.5}
          C ${controlX1} ${yHeelBase}, ${controlX2} ${yBottomBall}, ${xBall} ${yBottomBall}
          L ${xHeel + 30} ${yGround}
          C ${xHeel + 15} ${yGround}, ${xHeel - 2} ${yGround - hScaled * 0.3}, ${xHeel} ${yHeelBase - 0.5}
          Z
        `
      }

      switch (heelType) {
        case 'stiletto':
          // Ось шпильки должна совпадать с Heel Center Line
          return `M ${xHeelCenter - 4} ${yHeelBase - 1}
                  L ${xHeelCenter - 2} ${yGround}
                  L ${xHeelCenter + 2} ${yGround}
                  L ${xHeelCenter + 4} ${yHeelBase - 1} Z`
        case 'block':
          return `M ${xHeelCenter - heelW * 0.6} ${yHeelBase - 1}
                  L ${xHeelCenter - heelW * 0.55} ${yGround}
                  L ${xHeelCenter + heelW * 0.7} ${yGround}
                  L ${xHeelCenter + heelW * 0.65} ${yHeelBase - 1} Z`
        case 'kitten':
          return `M ${xHeelCenter - 4} ${yHeelBase - 1}
                  Q ${xHeelCenter + 2} ${yGround - hScaled * 0.5} ${xHeelCenter} ${yGround}
                  L ${xHeelCenter + 6} ${yGround}
                  Q ${xHeelCenter + 8} ${yGround - hScaled * 0.5} ${xHeelCenter + 6} ${yHeelBase - 1} Z`
        default:
          return ''
      }
    }

    const archDist = Math.max(1, xBall - xHeel)
    const shankLenScaled = engineeringData.shankLength * scale

    const tt = Math.max(0, Math.min(1, shankLenScaled / archDist))
    const mt = 1 - tt

    const q1x = mt * xHeel + tt * controlX1
    const q1y = mt * yFootHeel + tt * controlY1

    const q2x = mt * mt * xHeel + 2 * mt * tt * controlX1 + tt * tt * controlX2
    const q2y = mt * mt * yFootHeel + 2 * mt * tt * controlY1 + tt * tt * controlY2

    const q3x =
      mt * mt * mt * xHeel +
      3 * mt * mt * tt * controlX1 +
      3 * mt * tt * tt * controlX2 +
      tt * tt * tt * xBall
    const q3y =
      mt * mt * mt * yFootHeel +
      3 * mt * mt * tt * controlY1 +
      3 * mt * tt * tt * controlY2 +
      tt * tt * tt * yFootBall

    const sOffset = 2
    const shankCurve = `
      M ${xHeel + 2} ${yFootHeel + sOffset}
      C ${q1x} ${q1y + sOffset}, ${q2x} ${q2y + sOffset}, ${q3x} ${q3y + sOffset}
    `

    return {
      svgWidth,
      svgHeight,
      solePath,
      shankCurve,
      heelPath: getHeelPath(),
      xHeel,
      xBall,
      xToe,
      xHeelCenter,
      yGround,
      scale,
      yFootBall,
      yFootHeel,
    }
  }, [
    shoeSize,
    heelHeight,
    toeThickness,
    rockerAngle,
    rockerStartPct,
    heelType,
    soleType,
    engineeringData.shankLength,
    engineeringData.heelCenterXRatio,
  ])

  // --- 6. Компактный UI-степпер ---
  const Stepper = ({
    label,
    value,
    min,
    max,
    onChange,
    unit = '',
    disabled = false,
  }: {
    label: string
    value: number
    min: number
    max: number
    onChange: (v: number) => void
    unit?: string
    disabled?: boolean
  }) => {
    const handleAdd = () => {
      if (!disabled && value < max) {
        triggerHaptic('light')
        onChange(value + 1)
      }
    }
    const handleSub = () => {
      if (!disabled && value > min) {
        triggerHaptic('light')
        onChange(value - 1)
      }
    }
    return (
      <div
        className={`bg-[#1C1816] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between transition-opacity duration-300 ${
          disabled ? 'opacity-40 pointer-events-none' : ''
        }`}
      >
        <span className="text-[#A3988E] text-[10px] font-medium mb-1.5 uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-center justify-between gap-1">
          <button
            onClick={handleSub}
            disabled={disabled || value <= min}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 active:bg-white/10 active:scale-95 disabled:opacity-30"
          >
            <span className="text-xl font-medium leading-none mb-0.5">-</span>
          </button>
          <div className="flex items-baseline justify-center font-bold text-[15px] text-[#F3EFEA]">
            {value}
            <span className="text-[10px] text-[#A3988E] ml-0.5">{unit}</span>
          </div>
          <button
            onClick={handleAdd}
            disabled={disabled || value >= max}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 active:bg-white/10 active:scale-95 disabled:opacity-30"
          >
            <span className="text-xl font-medium leading-none mb-0.5">+</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-[100dvh] bg-[#110F0E] text-[#F3EFEA] overflow-hidden"
    >
      {/* Шапка */}
      <div className="flex-shrink-0 p-3 flex items-center justify-between border-b border-white/5 bg-[#110F0E]/80 backdrop-blur-md z-10">
        <button
          onClick={() => {
            triggerHaptic('light')
            onBack()
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1C1816] border border-white/5 active:scale-90 transition-transform"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-right">
          <h1 className="text-[14px] font-medium leading-none mb-1">{t.title}</h1>
          <p className="text-[10px] text-[#A3988E]">{t.desc}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-8">
        {/* Интерактивный экран */}
        <div
          className={`flex flex-col rounded-[16px] border transition-colors duration-500 overflow-hidden relative ${balanceAudit.boxColors}`}
        >
          <div className="flex flex-col p-2.5 pb-0 z-10 min-h-[45px]">
            <div className="flex justify-between items-start gap-2">
              <div className="flex flex-col">
                <span className={`text-[11px] font-bold ${balanceAudit.colors.split(' ').pop()}`}>
                  {balanceAudit.title}
                </span>
                <span className="text-[10px] opacity-80 mt-0.5">{balanceAudit.message}</span>
              </div>
              {balanceAudit.status === 'ERROR' && (
                <button
                  onClick={handleAutoFix}
                  className="shrink-0 bg-[#8B5CF6] text-white text-[11px] font-bold py-1 px-2.5 rounded-md shadow-lg active:scale-95 transition-transform flex items-center gap-1"
                >
                  🪄 {t.fixBtn}
                </button>
              )}
            </div>
          </div>

          {/* SVG */}
          <div
            className="relative flex justify-center items-center w-full"
            style={{ height: geometry.svgHeight }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${geometry.svgWidth} ${geometry.svgHeight}`}
              preserveAspectRatio="xMidYMax meet"
              className="overflow-visible"
            >
              <text
                x={geometry.xHeel - 15}
                y="25"
                fill="#8B5CF6"
                fontSize="10"
                fontWeight="bold"
                opacity="0.8"
              >
                {t.heelLbl}
              </text>
              <text
                x={geometry.xToe - 30}
                y="25"
                fill="#8B5CF6"
                fontSize="10"
                fontWeight="bold"
                opacity="0.8"
              >
                {t.toeLbl}
              </text>

              {/* Земля */}
              <line
                x1="0"
                y1={geometry.yGround}
                x2={geometry.svgWidth}
                y2={geometry.yGround}
                stroke="#4A423C"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Горизонт платформы */}
              <line
                x1={geometry.xHeel - 15}
                y1={geometry.yFootBall}
                x2={geometry.xToe + 15}
                y2={geometry.yFootBall}
                stroke="#3B82F6"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.5"
                style={{ transition: 'all 0.3s ease' }}
              />

              {/* Heel Center Line — только для standard */}
              {soleType === 'flat' && (
                <line
                  x1={geometry.xHeelCenter}
                  y1={geometry.yFootHeel - 8}
                  x2={geometry.xHeelCenter}
                  y2={geometry.yGround + 4}
                  stroke={
                    engineeringData.heelOffsetTooFarBack ? '#EF4444' : '#22C55E'
                  }
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.9"
                  style={{ transition: 'all 0.3s ease' }}
                />
              )}

              <text
                x={geometry.xHeel + 12}
                y={geometry.yFootBall - 4}
                fill="#3B82F6"
                fontSize="9"
                fontWeight="600"
                style={{ transition: 'all 0.3s ease' }}
              >
                {t.dropLbl}: {heelHeight - toeThickness} мм
              </text>

              <path
                d={geometry.heelPath}
                fill="#D49A5C"
                opacity="0.8"
                style={{ transition: 'all 0.3s ease' }}
              />
              <path
                d={geometry.solePath}
                fill="#2A2421"
                stroke="#D49A5C"
                strokeWidth="1.5"
                strokeLinejoin="round"
                style={{ transition: 'all 0.3s ease' }}
              />
              <path
                d={geometry.shankCurve}
                fill="none"
                stroke="#94A3B8"
                strokeWidth={engineeringData.steelThickness * geometry.scale}
                strokeLinecap="round"
                style={{ transition: 'all 0.3s ease' }}
              />

              {soleType === 'rocker' && (
                <>
                  <circle
                    cx={geometry.xBall}
                    cy={geometry.yFootBall}
                    r="3"
                    fill="#EF4444"
                    style={{ transition: 'all 0.3s ease' }}
                  />
                  <line
                    x1={geometry.xBall}
                    y1={geometry.yFootBall}
                    x2={geometry.xBall}
                    y2={geometry.yGround}
                    stroke="#EF4444"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    style={{ transition: 'all 0.3s ease' }}
                  />
                </>
              )}
            </svg>
          </div>

          <div className="px-3 pb-2 pt-1 border-t border-white/5 flex justify-between text-[10px] opacity-90 z-10 bg-black/20">
            <span>
              {t.internalSlope}{' '}
              <strong className="text-[11px]">
                {engineeringData.internalSlope.toFixed(1)}°
              </strong>
            </span>
            <span>
              {t.loadLbl}{' '}
              <strong
                className={`text-[11px] ${
                  engineeringData.forefootLoad >= CRITICAL_LOAD ? 'text-red-400' : ''
                }`}
              >
                {engineeringData.forefootLoad}%
              </strong>
            </span>
          </div>
        </div>

        {/* Переключатели: standard / rocker + форма каблука */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex bg-[#1C1816] p-1 rounded-xl border border-white/5">
            {(['flat', 'rocker'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  triggerHaptic('light')
                  setSoleType(type)
                }}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                  soleType === type
                    ? 'bg-[#8B5CF6] text-white shadow-md'
                    : 'text-[#A3988E] bg-transparent'
                }`}
              >
                {t[type]}
              </button>
            ))}
          </div>
          <div className="flex bg-[#1C1816] p-1 rounded-xl border border-white/5">
            {(['stiletto', 'block', 'kitten'] as const).map((type) => {
              const isRocker = soleType === 'rocker'
              return (
                <button
                  key={type}
                  disabled={isRocker}
                  onClick={() => {
                    triggerHaptic('light')
                    setHeelType(type)
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-300
                    ${
                      isRocker
                        ? 'opacity-30 cursor-not-allowed text-[#A3988E]'
                        : heelType === type
                          ? 'bg-[#8B5CF6] text-white shadow-md'
                          : 'text-[#A3988E] bg-transparent hover:bg-white/5'
                    }`}
                >
                  {t[type]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Контролы */}
        <div className="grid grid-cols-2 gap-2">
          <Stepper label={t.size} min={33} max={48} value={shoeSize} onChange={setShoeSize} />
          <Stepper
            label={t.heel}
            min={10}
            max={130}
            value={heelHeight}
            onChange={setHeelHeight}
            unit="мм"
          />
          <Stepper
            label={t.toe}
            min={0}
            max={Math.min(MAX_TOE, heelHeight + 10)}
            value={toeThickness}
            onChange={setToeThickness}
            unit="мм"
          />
          <Stepper
            label={t.angle}
            min={5}
            max={30}
            value={rockerAngle}
            onChange={setRockerAngle}
            unit="°"
            disabled={soleType === 'flat'}
          />
          <div className="col-span-2">
            <Stepper
              label={t.start}
              min={55}
              max={75}
              value={rockerStartPct}
              onChange={setRockerStartPct}
              unit="%"
              disabled={soleType === 'flat'}
            />
          </div>
        </div>

        {/* Спецификация */}
        <div className="pt-1">
          <button
            onClick={() => {
              triggerHaptic('light')
              setShowSpecs(!showSpecs)
            }}
            className="w-full py-2.5 px-3 bg-[#1C1816] rounded-xl text-[12px] font-medium flex items-center justify-between border border-white/5"
          >
            <span>{t.specsBtn}</span>
            <svg
              className={`w-4 h-4 text-[#A3988E] transition-transform duration-300 ${
                showSpecs ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <AnimatePresence>
            {showSpecs && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: 6 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-[#1C1816] p-3 rounded-xl border border-white/5 text-[11px] text-[#A3988E] space-y-2">
                  <div className="flex justify-between">
                    <span>Длина геленка:</span>
                    <strong className="text-[#F3EFEA]">{engineeringData.shankLength} мм</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Толщина стали (65Г):</span>
                    <strong className="text-[#F3EFEA]">
                      {engineeringData.steelThickness.toFixed(1)} мм
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>L_eff ({(L_EFF_RATIO * 100).toFixed(0)}%):</span>
                    <strong className="text-[#F3EFEA]">
                      {engineeringData.lEff.toFixed(1)} мм
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Heel Center Line:</span>
                    <strong className="text-[#F3EFEA]">
                      {(HEEL_CENTER_RATIO * 100).toFixed(0)}% длины
                    </strong>
                  </div>
                  {engineeringData.requiresMetatarsalPad && (
                    <div className="flex justify-between text-red-400">
                      <span>Пелот Зейца:</span>
                      <strong>ОБЯЗАТЕЛЬНО</strong>
                    </div>
                  )}
                  <div className="pt-2 mt-2 border-t border-white/5 font-mono text-[10px] text-[#D49A5C] bg-black/20 p-2 rounded-lg text-center space-y-1">
                    <div>Angle = arcsin((H − T) / L_eff)</div>
                    <div>
                      {soleType === 'flat' ? t.formulaStandard : t.formulaRocker}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
