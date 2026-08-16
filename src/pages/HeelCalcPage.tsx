import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'

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
const HEEL_CENTER_RATIO = 0.15
const MAX_HEEL_OFFSET_MM = 5

type SoleType = 'flat' | 'rocker'
type HeelType = 'stiletto' | 'block' | 'kitten' | 'flared'

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
  const [heelTipOffsetMm, setHeelTipOffsetMm] = useState(0)
  const [tipWidthMm, setTipWidthMm] = useState(10)
  const [showSpecs, setShowSpecs] = useState(false)

  useEffect(() => {
    if (toeThickness > heelHeight + 10) setToeThickness(heelHeight + 10)
  }, [heelHeight, toeThickness])

  useEffect(() => {
    if (soleType !== 'flat') return
    if (heelType === 'stiletto') setTipWidthMm(8)
    else if (heelType === 'kitten') setTipWidthMm(14)
    else if (heelType === 'block') setTipWidthMm(28)
    else if (heelType === 'flared') setTipWidthMm(22)
  }, [heelType, soleType])

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
      offset: 'Смещение',
      tipW: 'Набойка',
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
      heelBackDesc:
        'Ошибка: Каблук завален назад, произойдет перелом супинатора под весом пациента.',
      invertTitle: '⚠️ РИСК ИНВЕРСИИ',
      invertDesc: 'Набойка слишком узкая при высоком каблуке — высокий риск подворачивания лодыжки.',
      heelLbl: 'ПЯТКА',
      toeLbl: 'НОСОК',
      stiletto: 'Шпилька',
      block: 'Блок',
      kitten: 'Рюмочка',
      flared: 'Трапеция',
      flat: 'Стандарт',
      rocker: 'Рокер',
      specsBtn: '⚙️ Спецификация и Математика',
      dropLbl: 'Перепад',
      massTitle: 'Распределение массы',
      forefoot: 'Носок',
      rearfoot: 'Пятка',
      invertRisk: 'Риск инверсии',
      entryAngle: 'Угол въезда',
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
      offset: 'Зміщення',
      tipW: 'Набійка',
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
      heelBackDesc:
        'Помилка: Підбор завалений назад, відбудеться перелом супінатора під вагою пацієнта.',
      invertTitle: '⚠️ РИЗИК ІНВЕРСІЇ',
      invertDesc: 'Набійка занадто вузька при високому підборі — високий ризик підвертання щиколотки.',
      heelLbl: "П'ЯТКА",
      toeLbl: 'НОСОК',
      stiletto: 'Шпилька',
      block: 'Блок',
      kitten: 'Чарочка',
      flared: 'Трапеція',
      flat: 'Стандарт',
      rocker: 'Рокер',
      specsBtn: '⚙️ Специфікація та Математика',
      dropLbl: 'Перепад',
      massTitle: 'Розподіл маси',
      forefoot: 'Носок',
      rearfoot: "П'ятка",
      invertRisk: 'Ризик інверсії',
      entryAngle: 'Кут вʼїзду',
      formulaStandard: 'P = 50 + ((H − T) / L_eff) × 100',
      formulaRocker: 'P_rocker = P × (1 − 0.25 × rockerFactor)',
    },
  }[lang]

  const engineeringData = useMemo(() => {
    const lastLengthMm = shoeSize * STEP_TO_MM + FUNCTIONAL_ALLOWANCE
    const lEff = lastLengthMm * L_EFF_RATIO
    const netRise = heelHeight - toeThickness

    const asinArg = lEff > 0 ? Math.max(-1, Math.min(1, netRise / lEff)) : 0
    const internalSlope = Math.asin(asinArg) * (180 / Math.PI)

    let loadCalc = 50 + (netRise / Math.max(lEff, 1)) * 100
    if (soleType === 'rocker') {
      const rockerEffectFactor =
        Math.min(1, rockerAngle / MAX_ROCKER_ANGLE) *
        (1 - (rockerStartPct - 55) / 40)
      loadCalc *= 1 - ROCKER_MITIGATION_CAP * Math.max(0, rockerEffectFactor)
    }
    const forefootLoad = Math.min(100, Math.max(0, Math.round(loadCalc)))
    const heelLoad = 100 - forefootLoad

    const shankLength = Math.round(lastLengthMm * SHANK_PROPORTION + SHANK_OFFSET)
    let steelThickness = 1.2
    if (netRise > 40 && netRise <= 70) steelThickness = 1.5
    else if (netRise > 70) steelThickness = 2.0

    const heelOffsetTooFarBack = soleType === 'flat' && heelTipOffsetMm < -0.5
    const heelOffsetTooFarForward = soleType === 'flat' && heelTipOffsetMm > MAX_HEEL_OFFSET_MM

    let inversionRisk = 0
    if (soleType === 'flat' && netRise > 0) {
      const minSafeTip =
        heelType === 'stiletto' ? 10 + netRise * 0.08 :
        heelType === 'kitten' ? 12 + netRise * 0.06 :
        heelType === 'flared' ? 16 + netRise * 0.05 :
        20 + netRise * 0.04
      const ratio = tipWidthMm / Math.max(minSafeTip, 1)
      inversionRisk = Math.min(100, Math.max(0, Math.round((1 - ratio) * 100 + (netRise > 70 ? 15 : 0))))
      if (ratio >= 1) inversionRisk = Math.min(inversionRisk, 25)
    }

    let entryAngleDeg = 0
    if (soleType === 'flat' && (heelType === 'kitten' || heelType === 'flared')) {
      const tipHalf = tipWidthMm / 2
      entryAngleDeg = parseFloat(
        (Math.atan2(netRise, Math.max(tipHalf, 1)) * (180 / Math.PI)).toFixed(1)
      )
    }

    return {
      lastLengthMm,
      internalSlope,
      forefootLoad,
      heelLoad,
      shankLength,
      steelThickness,
      netRise,
      lEff,
      heelOffsetTooFarBack,
      heelOffsetTooFarForward,
      requiresMetatarsalPad: forefootLoad > CRITICAL_LOAD,
      inversionRisk,
      entryAngleDeg,
      highInversionRisk: inversionRisk >= 55,
    }
  }, [
    shoeSize, heelHeight, toeThickness, rockerAngle, rockerStartPct,
    soleType, heelType, heelTipOffsetMm, tipWidthMm,
  ])

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
    } else if (engineeringData.highInversionRisk) {
      status = 'ERROR'
      title = t.invertTitle
      message = t.invertDesc
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

    if (engineeringData.heelOffsetTooFarBack) setHeelTipOffsetMm(0)
    if (engineeringData.highInversionRisk) {
      const safe =
        heelType === 'stiletto' ? 12 :
        heelType === 'kitten' ? 16 :
        heelType === 'flared' ? 20 : 28
      setTipWidthMm(Math.max(tipWidthMm, safe))
    }

    if (soleType === 'rocker') {
      const newNetRise = finalHeel - finalPlatform
      const newSlope =
        Math.asin(Math.max(-1, Math.min(1, newNetRise / engineeringData.lEff))) * (180 / Math.PI)
      setRockerAngle(Math.max(5, Math.min(20, Math.round(newSlope * 0.8))))
    }
  }

  // ========== SVG ==========
  // Супинатор стартует от Heel Center Line (не от заднего края).
  // Отдельные path для шпильки / рюмочки / блока / трапеции.
  const geometry = useMemo(() => {
    const totalLength = shoeSize * STEP_TO_MM + FUNCTIONAL_ALLOWANCE
    const scale = 0.85
    const padding = 45
    const svgWidth = totalLength * scale + padding * 2
    const svgHeight = 180

    const xHeel = padding
    const xBall = padding + totalLength * (rockerStartPct / 100) * scale
    const xToe = padding + totalLength * scale

    // Центр пятки = 15% длины
    const xHeelCenter = padding + totalLength * HEEL_CENTER_RATIO * scale
    const offsetPx = soleType === 'flat' ? heelTipOffsetMm * scale : 0
    const xTipCenter = xHeelCenter + offsetPx

    const yGround = 150
    const hScaled = heelHeight * scale
    const tScaled = toeThickness * scale
    const yFootHeel = yGround - hScaled
    const yFootBall = yGround - tScaled

    const activeRockerAngle = soleType === 'rocker' ? rockerAngle : 0
    const rockerZoneLength = Math.max(1, xToe - xBall)
    const rockerAngleRad = activeRockerAngle * (Math.PI / 180)
    const safeSine = Math.min(1, Math.max(0, Math.sin(rockerAngleRad)))
    const toeLiftScaled = Math.min(MAX_LIFT * scale, rockerZoneLength * safeSine)
    const yFootToe = yFootBall - toeLiftScaled

    // Свод: от центра пятки (не от заднего края) к пучкам
    const archStartX = xHeelCenter
    const controlX1 = archStartX + (xBall - archStartX) * 0.35
    const controlX2 = archStartX + (xBall - archStartX) * 0.7
    const controlY1 = yFootHeel * 0.65 + yFootBall * 0.35
    const controlY2 = yFootHeel * 0.25 + yFootBall * 0.75

    // Верх подошвы
    const topPath = `
      M ${xHeel - 4} ${yFootHeel - 3}
      L ${xHeelCenter - 6} ${yFootHeel}
      C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${xBall} ${yFootBall}
      Q ${xBall + rockerZoneLength * 0.45} ${yFootBall}, ${xToe} ${yFootToe}
    `

    const platformBase = Math.max(tScaled, 2)
    const yHeelSeat = yFootHeel + Math.min(hScaled * 0.12, 8 * scale)
    const yBottomBall = yGround
    const yBottomToe = soleType === 'rocker' ? yFootToe + platformBase : yGround - 1

    const bottomPath = `
      L ${xToe} ${yBottomToe}
      Q ${xBall + rockerZoneLength * 0.45} ${yBottomBall}, ${xBall} ${yBottomBall}
      C ${controlX2} ${yBottomBall}, ${controlX1} ${yHeelSeat + 2}, ${xHeelCenter - 4} ${yHeelSeat + 2}
      L ${xHeel - 2} ${yHeelSeat}
      Z
    `
    const solePath = topPath + bottomPath

    const tipW = Math.max(2, tipWidthMm * scale)

    // --- Отдельные SVG каблуков (стандарт) ---
    const getHeelPath = () => {
      if (soleType === 'rocker') {
        return `
          M ${xHeel} ${yHeelSeat}
          C ${controlX1} ${yHeelSeat}, ${controlX2} ${yBottomBall}, ${xBall} ${yBottomBall}
          L ${xHeel + 28} ${yGround}
          C ${xHeel + 14} ${yGround}, ${xHeel - 2} ${yGround - hScaled * 0.25}, ${xHeel} ${yHeelSeat}
          Z
        `
      }

      switch (heelType) {
        case 'stiletto': {
          // Тонкая шпилька: узкая набойка, лёгкое расширение у посадки
          const topHalf = Math.max(2.2, tipW * 0.9)
          const botHalf = Math.max(1.2, tipW / 2)
          return `
            M ${xTipCenter - topHalf} ${yHeelSeat}
            L ${xTipCenter - botHalf} ${yGround}
            L ${xTipCenter + botHalf} ${yGround}
            L ${xTipCenter + topHalf} ${yHeelSeat}
            Z
          `
        }
        case 'kitten': {
          // Рюмочка: изящный изгиб, шире у посадки
          const topHalf = Math.max(4, tipW * 0.85)
          const botHalf = Math.max(2, tipW / 2)
          const midY = yHeelSeat + (yGround - yHeelSeat) * 0.55
          return `
            M ${xTipCenter - topHalf} ${yHeelSeat}
            Q ${xTipCenter - botHalf * 0.4} ${midY} ${xTipCenter - botHalf} ${yGround}
            L ${xTipCenter + botHalf} ${yGround}
            Q ${xTipCenter + botHalf * 0.4} ${midY} ${xTipCenter + topHalf} ${yHeelSeat}
            Z
          `
        }
        case 'block': {
          // Блок: почти вертикальные стенки
          const half = Math.max(5, tipW / 2)
          return `
            M ${xTipCenter - half} ${yHeelSeat}
            L ${xTipCenter - half * 0.92} ${yGround}
            L ${xTipCenter + half * 0.92} ${yGround}
            L ${xTipCenter + half} ${yHeelSeat}
            Z
          `
        }
        case 'flared': {
          // Трапеция: узко сверху, широко снизу
          const topHalf = Math.max(2.5, tipW * 0.32)
          const botHalf = Math.max(5, tipW / 2)
          return `
            M ${xTipCenter - topHalf} ${yHeelSeat}
            L ${xTipCenter - botHalf} ${yGround}
            L ${xTipCenter + botHalf} ${yGround}
            L ${xTipCenter + topHalf} ${yHeelSeat}
            Z
          `
        }
        default:
          return ''
      }
    }

    // --- Супинатор: от центра пятки вдоль свода к пучкам ---
    const shankLenScaled = engineeringData.shankLength * scale
    const archDist = Math.max(1, xBall - archStartX)
    const tt = Math.max(0, Math.min(1, shankLenScaled / archDist))
    const mt = 1 - tt

    // Точки Безье вдоль той же кривой свода
    const q1x = mt * archStartX + tt * controlX1
    const q1y = mt * yFootHeel + tt * controlY1
    const q2x = mt * mt * archStartX + 2 * mt * tt * controlX1 + tt * tt * controlX2
    const q2y = mt * mt * yFootHeel + 2 * mt * tt * controlY1 + tt * tt * controlY2
    const q3x =
      mt * mt * mt * archStartX +
      3 * mt * mt * tt * controlX1 +
      3 * mt * tt * tt * controlX2 +
      tt * tt * tt * xBall
    const q3y =
      mt * mt * mt * yFootHeel +
      3 * mt * mt * tt * controlY1 +
      3 * mt * tt * tt * controlY2 +
      tt * tt * tt * yFootBall

    const sOff = 3
    const shankCurve = `
      M ${archStartX} ${yFootHeel + sOff}
      C ${q1x} ${q1y + sOff}, ${q2x} ${q2y + sOff}, ${q3x} ${q3y + sOff}
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
      xTipCenter,
      yGround,
      scale,
      yFootBall,
      yFootHeel,
    }
  }, [
    shoeSize, heelHeight, toeThickness, rockerAngle, rockerStartPct,
    heelType, soleType, heelTipOffsetMm, tipWidthMm, engineeringData.shankLength,
  ])

  const Stepper = ({
    label, value, min, max, onChange, unit = '', disabled = false,
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
      <div className="flex-shrink-0 p-3 flex items-center justify-between border-b border-white/5 bg-[#110F0E]/80 backdrop-blur-md z-10">
        <button
          onClick={() => {
            triggerHaptic('light')
            onBack()
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1C1816] border border-white/5 active:scale-90 transition-transform"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-right">
          <h1 className="text-[14px] font-medium leading-none mb-1">{t.title}</h1>
          <p className="text-[10px] text-[#A3988E]">{t.desc}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-8">
        <div className={`flex flex-col rounded-[16px] border transition-colors duration-500 overflow-hidden relative ${balanceAudit.boxColors}`}>
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

          <div className="relative flex justify-center items-center w-full" style={{ height: geometry.svgHeight }}>
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${geometry.svgWidth} ${geometry.svgHeight}`}
              preserveAspectRatio="xMidYMax meet"
              className="overflow-visible"
            >
              <text x={geometry.xHeel - 10} y="22" fill="#8B5CF6" fontSize="10" fontWeight="bold" opacity="0.8">
                {t.heelLbl}
              </text>
              <text x={geometry.xToe - 28} y="22" fill="#8B5CF6" fontSize="10" fontWeight="bold" opacity="0.8">
                {t.toeLbl}
              </text>

              <line x1="0" y1={geometry.yGround} x2={geometry.svgWidth} y2={geometry.yGround} stroke="#4A423C" strokeWidth="1" strokeDasharray="2 2" />
              <line
                x1={geometry.xHeel - 10}
                y1={geometry.yFootBall}
                x2={geometry.xToe + 10}
                y2={geometry.yFootBall}
                stroke="#3B82F6"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.45"
              />

              {/* Heel Center Line */}
              {soleType === 'flat' && (
                <>
                  <line
                    x1={geometry.xHeelCenter}
                    y1={geometry.yFootHeel - 12}
                    x2={geometry.xHeelCenter}
                    y2={geometry.yGround + 6}
                    stroke={engineeringData.heelOffsetTooFarBack ? '#EF4444' : '#22C55E'}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.95"
                  />
                  <circle
                    cx={geometry.xTipCenter}
                    cy={geometry.yGround}
                    r="3"
                    fill={engineeringData.heelOffsetTooFarBack ? '#EF4444' : '#22C55E'}
                  />
                </>
              )}

              <text x={geometry.xHeelCenter + 8} y={geometry.yFootBall - 5} fill="#3B82F6" fontSize="9" fontWeight="600">
                {t.dropLbl}: {heelHeight - toeThickness} мм
              </text>

              <path d={geometry.heelPath} fill="#D49A5C" opacity="0.9" />
              <path d={geometry.solePath} fill="#2A2421" stroke="#D49A5C" strokeWidth="1.5" strokeLinejoin="round" />
              <path
                d={geometry.shankCurve}
                fill="none"
                stroke="#94A3B8"
                strokeWidth={Math.max(1.2, engineeringData.steelThickness * geometry.scale)}
                strokeLinecap="round"
              />

              {soleType === 'rocker' && (
                <>
                  <circle cx={geometry.xBall} cy={geometry.yFootBall} r="3" fill="#EF4444" />
                  <line
                    x1={geometry.xBall}
                    y1={geometry.yFootBall}
                    x2={geometry.xBall}
                    y2={geometry.yGround}
                    stroke="#EF4444"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                </>
              )}
            </svg>
          </div>

          <div className="px-3 pb-2 pt-1 border-t border-white/5 flex justify-between text-[10px] opacity-90 z-10 bg-black/20">
            <span>
              {t.internalSlope}{' '}
              <strong className="text-[11px]">{engineeringData.internalSlope.toFixed(1)}°</strong>
            </span>
            <span>
              {t.loadLbl}{' '}
              <strong className={`text-[11px] ${engineeringData.forefootLoad >= CRITICAL_LOAD ? 'text-red-400' : ''}`}>
                {engineeringData.forefootLoad}%
              </strong>
            </span>
          </div>
        </div>

        {/* Массы */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#1C1816] border border-white/5 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-[#A3988E] uppercase mb-1">{t.massTitle}</div>
            <div className="flex justify-center gap-3 text-[12px]">
              <span>
                {t.forefoot}: <strong className="text-red-400">{engineeringData.forefootLoad}%</strong>
              </span>
              <span>
                {t.rearfoot}: <strong className="text-green-400">{engineeringData.heelLoad}%</strong>
              </span>
            </div>
          </div>
          <div className="bg-[#1C1816] border border-white/5 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-[#A3988E] uppercase mb-1">
              {soleType === 'flat' && (heelType === 'kitten' || heelType === 'flared')
                ? t.entryAngle
                : t.invertRisk}
            </div>
            <div className="text-[14px] font-bold">
              {soleType === 'flat' && (heelType === 'kitten' || heelType === 'flared') ? (
                <>{engineeringData.entryAngleDeg}°</>
              ) : soleType === 'flat' ? (
                <span className={engineeringData.inversionRisk >= 55 ? 'text-red-400' : 'text-[#F3EFEA]'}>
                  {engineeringData.inversionRisk}%
                </span>
              ) : (
                '—'
              )}
            </div>
          </div>
        </div>

        {/* Переключатели */}
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
                  soleType === type ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-[#A3988E] bg-transparent'
                }`}
              >
                {t[type]}
              </button>
            ))}
          </div>
          <div className="flex bg-[#1C1816] p-1 rounded-xl border border-white/5 overflow-x-auto">
            {(['stiletto', 'kitten', 'block', 'flared'] as const).map((type) => {
              const isRocker = soleType === 'rocker'
              return (
                <button
                  key={type}
                  disabled={isRocker}
                  onClick={() => {
                    triggerHaptic('light')
                    setHeelType(type)
                  }}
                  className={`flex-1 min-w-[52px] py-1.5 text-[10px] font-medium rounded-lg transition-all
                    ${
                      isRocker
                        ? 'opacity-30 cursor-not-allowed text-[#A3988E]'
                        : heelType === type
                          ? 'bg-[#8B5CF6] text-white shadow-md'
                          : 'text-[#A3988E] bg-transparent'
                    }`}
                >
                  {t[type]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Контролы: угол/перекат только у рокера; смещение/набойка только у стандарта */}
        <div className="grid grid-cols-2 gap-2">
          <Stepper label={t.size} min={33} max={48} value={shoeSize} onChange={setShoeSize} />
          <Stepper label={t.heel} min={10} max={130} value={heelHeight} onChange={setHeelHeight} unit="мм" />
          <Stepper
            label={t.toe}
            min={0}
            max={Math.min(MAX_TOE, heelHeight + 10)}
            value={toeThickness}
            onChange={setToeThickness}
            unit="мм"
          />

          {soleType === 'rocker' ? (
            <>
              <Stepper
                label={t.angle}
                min={5}
                max={30}
                value={rockerAngle}
                onChange={setRockerAngle}
                unit="°"
              />
              <div className="col-span-2">
                <Stepper
                  label={t.start}
                  min={55}
                  max={75}
                  value={rockerStartPct}
                  onChange={setRockerStartPct}
                  unit="%"
                />
              </div>
            </>
          ) : (
            <>
              <Stepper
                label={t.offset}
                min={-15}
                max={15}
                value={heelTipOffsetMm}
                onChange={setHeelTipOffsetMm}
                unit="мм"
              />
              <Stepper
                label={t.tipW}
                min={6}
                max={45}
                value={tipWidthMm}
                onChange={setTipWidthMm}
                unit="мм"
              />
            </>
          )}
        </div>

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
              className={`w-4 h-4 text-[#A3988E] transition-transform duration-300 ${showSpecs ? 'rotate-180' : ''}`}
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
                    <strong className="text-[#F3EFEA]">{engineeringData.steelThickness.toFixed(1)} мм</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>L_eff:</span>
                    <strong className="text-[#F3EFEA]">{engineeringData.lEff.toFixed(1)} мм</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Heel Center Line:</span>
                    <strong className="text-[#F3EFEA]">{(HEEL_CENTER_RATIO * 100).toFixed(0)}%</strong>
                  </div>
                  {soleType === 'flat' && (
                    <>
                      <div className="flex justify-between">
                        <span>Смещение набойки:</span>
                        <strong className={engineeringData.heelOffsetTooFarBack ? 'text-red-400' : 'text-[#F3EFEA]'}>
                          {heelTipOffsetMm} мм
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Ширина набойки:</span>
                        <strong className="text-[#F3EFEA]">{tipWidthMm} мм</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>{t.invertRisk}:</span>
                        <strong className={engineeringData.inversionRisk >= 55 ? 'text-red-400' : 'text-[#F3EFEA]'}>
                          {engineeringData.inversionRisk}%
                        </strong>
                      </div>
                    </>
                  )}
                  <div className="pt-2 mt-2 border-t border-white/5 font-mono text-[10px] text-[#D49A5C] bg-black/20 p-2 rounded-lg text-center space-y-1">
                    <div>Angle = arcsin((H − T) / L_eff)</div>
                    <div>{soleType === 'flat' ? t.formulaStandard : t.formulaRocker}</div>
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
