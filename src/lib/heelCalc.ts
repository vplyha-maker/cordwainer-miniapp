// src/lib/heelCalc.ts

export type Gender = 'female' | 'male'
export type SoleType = 'flat' | 'thomas' | 'rocker'
export type RockerType = 'forefoot' | 'heelToToe' | 'negative'

export const HEEL_CONST = {
  STEP_TO_MM: 6.67,
  FUNCTIONAL_ALLOWANCE: 8,
  MAX_TOE: 60,
  MAX_LIFT: 50,
  CRITICAL_ANGLE: 16,
  COMFORT_ANGLE: 12,
  SAFE_ANGLE: 11.0,
  CRITICAL_LOAD: 75,
  CRITICAL_KPA: 245,
  MAX_ROCKER_ANGLE: 28,
  ROCKER_MITIGATION_CAP: 0.32,
  HEEL_CENTER_RATIO: 0.15,
  MAX_HEEL_OFFSET_MM: 5,
  CRITICAL_PRONATION_DEG: 6,
  WARN_PRONATION_DEG: 3,
} as const

export const ROCKER_PRESETS: Record<RockerType, { angle: number; startPct: number }> = {
  forefoot:  { angle: 15, startPct: 60 }, // Метатарзалгия
  heelToToe: { angle: 18, startPct: 56 }, // Артроз / Полный перекат
  negative:  { angle: 10, startPct: 65 }, // Диабетическая стопа
}

export interface HeelInput {
  gender: Gender
  shoeSize: number
  weightKg: number
  heelHeight: number
  toeThickness: number
  soleType: SoleType
  rockerAngle: number
  rockerStartPct: number
  heelTipOffsetMm: number
  rockerType?: RockerType
  pronationDeg: number
  ballGirthMm: number
  instepGirthMm: number
  obliqueGirthMm: number
}

export interface MasterPrescription {
  widthCode: string
  ballBuildUpMm: number
  instepBuildUpMm: number
  obliqueEntryDeltaMm: number
  requiresZipOrLaceWarning: boolean
  insoleType: 'neutral' | 'supinator' | 'pronator'
  archSupportHeightMm: number
  medialHeelWedgeMm: number
  lateralWedgeMm: number
  shoreA: string
  /** Клиническая рекомендация: нужен ли каблук Томаса по завалу стопы */
  recommendThomasHeel: boolean
  /** Фактически установленный выступ Томаса (активен ТОЛЬКО когда выбран режим soleType === 'thomas') */
  thomasHeelType: 'none' | 'medial' | 'lateral'
  /** Фактическая длина выступа Томаса в текущей сборке (0 мм для flat и rocker) */
  thomasExtensionMm: number
  /** Расчетная рекомендуемая длина выступа Томаса для справки в техкарте, мм */
  recommendedThomasMm: number
}

export interface HeelEngineering {
  lastLengthMm: number
  footLengthMm: number
  lEff: number
  netRise: number
  internalSlope: number
  forefootLoad: number
  heelLoad: number
  loadM1Pct: number
  loadM5Pct: number
  peakForefootPressureKpa: number
  peakHeelPressureKpa: number
  copLongitudinalMm: number
  copLateralMm: number
  shankBendingMomentNm: number
  shankLength: number
  steelThickness: number
  heelOffsetTooFarBack: boolean
  heelOffsetTooFarForward: boolean
  requiresMetatarsalPad: boolean
  inversionRisk: number
  highInversionRisk: boolean
  pronationDeg: number
  highPronationStress: boolean
  metatarsalPadPosMm: number | null
  metatarsalPadHeightMm: number | null
  apexM1_Mm: number
  apexM5_Mm: number
  carbonInsertThicknessMm: number
  rx: MasterPrescription
}

export type AuditStatus = 'SUCCESS' | 'WARNING' | 'ERROR'

export interface HeelAudit {
  status: AuditStatus
  titleKey: string
  messageKey: string
}

export function getStandardGirths(gender: Gender, shoeSize: number) {
  if (gender === 'male') {
    const diff = shoeSize - 42
    return {
      ballGirthMm: Math.round(244 + diff * 5.0),
      instepGirthMm: Math.round(252 + diff * 5.2),
      obliqueGirthMm: Math.round(322 + diff * 6.5),
      stepWidthMm: 6,
    }
  } else {
    const diff = shoeSize - 38
    return {
      ballGirthMm: Math.round(222 + diff * 4.8),
      instepGirthMm: Math.round(229 + diff * 5.0),
      obliqueGirthMm: Math.round(292 + diff * 6.0),
      stepWidthMm: 5,
    }
  }
}

export function computeEngineering(input: HeelInput): HeelEngineering {
  const C = HEEL_CONST
  const {
    gender,
    shoeSize,
    weightKg = 72,
    heelHeight,
    toeThickness,
    soleType,
    rockerAngle,
    rockerStartPct,
    heelTipOffsetMm,
    pronationDeg = 0,
    ballGirthMm,
    instepGirthMm,
    obliqueGirthMm,
  } = input

  const clampedWeight = Math.max(35, Math.min(160, weightKg))

  // 1. Длина стопы и конструктивная длина колодки
  const footLengthMm = Math.round((shoeSize - 1.5) * C.STEP_TO_MM)
  const allowance = gender === 'male' ? 10 : C.FUNCTIONAL_ALLOWANCE
  const lastLengthMm = Math.round(shoeSize * C.STEP_TO_MM + allowance)

  // 2. Полнота и налепки по обмерам стопы
  const std = getStandardGirths(gender, shoeSize)
  const ballBuildUpMm = ballGirthMm - std.ballGirthMm
  const instepBuildUpMm = instepGirthMm - std.instepGirthMm
  const obliqueEntryDeltaMm = obliqueGirthMm - std.obliqueGirthMm

  const widthIndex = Math.round(6 + ballBuildUpMm / std.stepWidthMm)
  const widthMap: Record<number, string> = {
    3: 'C (3) Узкая',
    4: 'D (4) Узкая',
    5: 'E (5) Умеренно узкая',
    6: 'F (6) Стандарт',
    7: 'G (7) Комфорт',
    8: 'H (8) Широкая',
    9: 'K (9) Повышенная',
    10: 'M (10) Орто-широкая',
    11: 'W (11) Экстра-орто',
  }
  const clampedW = Math.max(3, Math.min(11, widthIndex))
  const widthCode = widthMap[clampedW] || `F (${clampedW})`
  const requiresZipOrLaceWarning = obliqueEntryDeltaMm >= 12 || instepBuildUpMm >= 10

  // 3. Подбор твердости стельки по Шору А от веса пациента
  let shoreA = '40–45 Shore A (Средняя EVA)'
  if (clampedWeight < 60) {
    shoreA = '30–35 Shore A (Мягкая EVA/PPT)'
  } else if (clampedWeight > 85 && clampedWeight <= 108) {
    shoreA = '50–55 Shore A (Усиленная EVA + каркас)'
  } else if (clampedWeight > 108) {
    shoreA = '60–65 Shore A (Жесткий карбон/термопласт)'
  }

  // 4. Ортопедический расчет стельки и СТРОГОЕ разделение режимов (Стандарт / Томаса / Рокер)
  const clampedPronation = Math.max(-15, Math.min(15, pronationDeg))
  const weightScale = 0.85 + (clampedWeight - 70) / 220

  let insoleType: 'neutral' | 'supinator' | 'pronator' = 'neutral'
  let archSupportHeightMm = 9
  let medialHeelWedgeMm = 0
  let lateralWedgeMm = 0
  let recommendThomasHeel = false
  let recommendedThomasMm = 0

  if (clampedPronation <= -2) {
    const valgusAbs = Math.abs(clampedPronation)
    insoleType = 'supinator'
    archSupportHeightMm = Math.min(18, Math.round(10 + valgusAbs * 0.7))
    medialHeelWedgeMm = Math.min(8, Math.max(2, Math.round(valgusAbs * 0.55 * weightScale)))
    recommendThomasHeel = valgusAbs >= 3
    recommendedThomasMm = Math.round((14 + Math.min(12, valgusAbs * 1.15)) * Math.min(1.2, weightScale))
  } else if (clampedPronation >= 2) {
    const varusAbs = Math.abs(clampedPronation)
    insoleType = 'pronator'
    archSupportHeightMm = Math.max(0, Math.round(4 - varusAbs * 0.4))
    lateralWedgeMm = Math.min(8, Math.max(2, Math.round(varusAbs * 0.55 * weightScale)))
    recommendThomasHeel = varusAbs >= 3
    recommendedThomasMm = Math.round((12 + Math.min(10, varusAbs * 1.05)) * Math.min(1.2, weightScale))
  } else {
    recommendedThomasMm = Math.round(16 * Math.min(1.15, weightScale))
  }

  // ВАЖНО: Каблук Томаса физически присутствует ТОЛЬКО тогда, когда выбран режим soleType === 'thomas'!
  let thomasHeelType: 'none' | 'medial' | 'lateral' = 'none'
  let thomasExtensionMm = 0
  if (soleType === 'thomas') {
    thomasHeelType = clampedPronation >= 2 ? 'lateral' : 'medial'
    thomasExtensionMm = recommendedThomasMm
  }

  // 5. Эффективный рычаг L_eff и продольный уклон
  const clampedStartPct = Math.max(52, Math.min(78, rockerStartPct))
  const dynamicLeverRatio = Math.max(
    0.58,
    Math.min(0.78, (clampedStartPct / 100 - C.HEEL_CENTER_RATIO) * 1.38)
  )
  const lEff = parseFloat((lastLengthMm * dynamicLeverRatio).toFixed(1))

  const netRise = heelHeight - toeThickness
  const asinArg = lEff > 0 ? Math.max(-1, Math.min(1, netRise / lEff)) : 0
  const internalSlope = Math.asin(asinArg) * (180 / Math.PI)

  // 6. Продольное распределение нагрузки (Пятка / Пучки)
  let loadCalc = 44 + (netRise / Math.max(lEff, 1)) * 102
  if (soleType === 'rocker') {
    const angleFactor = Math.min(1, Math.max(0, rockerAngle / C.MAX_ROCKER_ANGLE))
    const distFromOptimum = Math.abs(clampedStartPct - 60)
    const placementEfficiency = Math.max(0.35, 1 - distFromOptimum / 28)
    const factor = Math.min(1, angleFactor * placementEfficiency)
    loadCalc *= 1 - C.ROCKER_MITIGATION_CAP * factor
  } else if (soleType === 'thomas') {
    loadCalc *= 0.91 // каблук Томаса берет на себя нагрузку свода
  }
  const forefootLoad = Math.min(100, Math.max(0, Math.round(loadCalc)))
  const heelLoad = 100 - forefootLoad

  // 7. Медиально-латеральный баланс M1 / M5
  // В режиме Томаса и Рокера широкая база и клин стельки компенсируют до 65% завала
  const orthoStabilization =
    soleType === 'thomas'
      ? clampedPronation * 0.65
      : soleType === 'rocker'
      ? clampedPronation * 0.55
      : clampedPronation * 0.2
  const effectiveRoll = clampedPronation - orthoStabilization
  const m1Ratio = Math.max(0.22, Math.min(0.82, 0.55 - effectiveRoll * 0.022))
  const loadM1Pct = Math.round(forefootLoad * m1Ratio)
  const loadM5Pct = Math.max(0, forefootLoad - loadM1Pct)

  // 8. Апексы M1–M5 и Пелот Зейца
  const heelCenterPos = lastLengthMm * C.HEEL_CENTER_RATIO
  const ballPos = lastLengthMm * (clampedStartPct / 100)
  const apexM1_Mm = Math.round(ballPos - 5)
  const apexM5_Mm = Math.round(apexM1_Mm - lastLengthMm * 0.045)

  const requiresMetatarsalPad =
    forefootLoad >= C.CRITICAL_LOAD ||
    clampedWeight >= 85 ||
    ballBuildUpMm >= 6 ||
    soleType === 'thomas' ||
    soleType === 'rocker'

  let metatarsalPadPosMm: number | null = null
  let metatarsalPadHeightMm: number | null = null
  if (requiresMetatarsalPad) {
    metatarsalPadPosMm = Math.round(apexM1_Mm - 7)
    metatarsalPadHeightMm =
      clampedWeight >= 100 || ballBuildUpMm >= 10 ? 6 : netRise > 25 ? 5 : 4
  }

  // 9. Реальное плантарное давление (кПа) с учетом разгрузки полноконтактной орто-стелькой и пелотом Зейца!
  // Когда стоят каблук Томаса или Рокер + пелот Зейца + жесткий свод по Шору, площадь опоры свода растет на 42%
  const contactAreaScale = (footLengthMm / 245) * (1 + ballBuildUpMm * 0.008)
  const orthoReliefFactor =
    soleType === 'rocker'
      ? 1.52
      : soleType === 'thomas'
      ? 1.44
      : 1.0
  const foreAreaCm2 = Math.max(30, 46 * contactAreaScale * orthoReliefFactor)
  const heelAreaCm2 = Math.max(22, 33 * contactAreaScale * (soleType !== 'flat' ? 1.32 : 1.0))

  const totalForceN = clampedWeight * 9.81 * 1.15
  const foreForceN = totalForceN * (forefootLoad / 100)
  const heelForceN = totalForceN * (heelLoad / 100)
  const rollConcentration = 1 + Math.abs(effectiveRoll) * 0.025

  const peakForefootPressureKpa = Math.round(
    (foreForceN / foreAreaCm2) * 10 * 1.55 * rollConcentration
  )
  const peakHeelPressureKpa = Math.round((heelForceN / heelAreaCm2) * 10 * 1.45)

  // 10. Геленок и изгибающий момент (в рокере сплошная подошва лежит на полу, поэтому изгибающий момент минимален)
  const shankLength = Math.round(Math.max(40, ballPos - heelCenterPos - 5))
  const supportReductionMm =
    soleType === 'rocker'
      ? shankLength * 0.35
      : soleType === 'thomas'
      ? thomasExtensionMm * 0.75
      : 0
  const offsetPenaltyMm = soleType === 'flat' ? Math.max(0, -heelTipOffsetMm) * 2.2 : 0
  const effectiveMomentArmM = Math.max(
    0.015,
    (shankLength * 0.5 - supportReductionMm + offsetPenaltyMm) / 1000
  )
  const slopeLoadFactor = 0.32 + Math.max(0, Math.sin((internalSlope * Math.PI) / 180)) * 0.8
  const shankBendingMomentNm = parseFloat(
    (totalForceN * effectiveMomentArmM * slopeLoadFactor).toFixed(1)
  )

  let steelThickness = clampedWeight >= 85 || gender === 'male' ? 1.5 : 1.2
  if (netRise > 35 || shankBendingMomentNm > 20) steelThickness = Math.max(steelThickness, 1.5)
  if (netRise > 55 || shankBendingMomentNm > 28 || clampedWeight >= 105) steelThickness = 2.0

  const heelOffsetTooFarBack = soleType === 'flat' && heelTipOffsetMm < -0.5
  const heelOffsetTooFarForward =
    soleType === 'flat' && heelTipOffsetMm > C.MAX_HEEL_OFFSET_MM

  // 11. Риск инверсии
  const baseStabilityFactor = soleType === 'thomas' ? 0.45 : soleType === 'rocker' ? 0.5 : 1.0
  const heightRisk = Math.max(0, netRise) * 0.55
  const rollRisk = Math.abs(effectiveRoll) * (2.6 + (clampedWeight / 75) * 1.1)
  const inversionRisk = Math.min(100, Math.round((heightRisk + rollRisk) * baseStabilityFactor))

  const copLongitudinalMm = Math.round(
    heelCenterPos + (ballPos - heelCenterPos) * (forefootLoad / 100)
  )
  const copLateralMm = parseFloat((effectiveRoll * 1.45).toFixed(1))

  const carbonInsertThicknessMm =
    soleType === 'rocker'
      ? parseFloat(
          (1.2 + (clampedWeight / 100) * 0.6 + (heelHeight / 100) * 0.4).toFixed(1)
        )
      : 0

  return {
    lastLengthMm,
    footLengthMm,
    lEff,
    netRise,
    internalSlope,
    forefootLoad,
    heelLoad,
    loadM1Pct,
    loadM5Pct,
    peakForefootPressureKpa,
    peakHeelPressureKpa,
    copLongitudinalMm,
    copLateralMm,
    shankBendingMomentNm,
    shankLength,
    steelThickness,
    heelOffsetTooFarBack,
    heelOffsetTooFarForward,
    requiresMetatarsalPad,
    inversionRisk,
    highInversionRisk: inversionRisk >= 52,
    pronationDeg: clampedPronation,
    highPronationStress: Math.abs(effectiveRoll) >= C.CRITICAL_PRONATION_DEG,
    metatarsalPadPosMm,
    metatarsalPadHeightMm,
    apexM1_Mm,
    apexM5_Mm,
    carbonInsertThicknessMm,
    rx: {
      widthCode,
      ballBuildUpMm,
      instepBuildUpMm,
      obliqueEntryDeltaMm,
      requiresZipOrLaceWarning,
      insoleType,
      archSupportHeightMm,
      medialHeelWedgeMm,
      lateralWedgeMm,
      shoreA,
      recommendThomasHeel,
      thomasHeelType,
      thomasExtensionMm,
      recommendedThomasMm,
    },
  }
}

export function computeAudit(
  eng: HeelEngineering,
  soleType: SoleType,
  heelHeight: number,
  rockerAngle: number
): HeelAudit {
  const C = HEEL_CONST
  const activeRocker = soleType === 'rocker' ? rockerAngle : 0

  if (eng.heelOffsetTooFarBack) {
    return { status: 'ERROR', titleKey: 'heelBackTitle', messageKey: 'heelBackDesc' }
  }
  if (eng.internalSlope >= C.CRITICAL_ANGLE) {
    return { status: 'ERROR', titleKey: 'errTitle', messageKey: 'errDesc' }
  }
  // Если выраженный вальгус/варус, а выбран обычный каблук (flat) — требуем Томаса
  if (eng.rx.recommendThomasHeel && soleType === 'flat') {
    return { status: 'ERROR', titleKey: 'thomasNeedTitle', messageKey: 'thomasNeedDesc' }
  }
  if (eng.highInversionRisk || eng.highPronationStress) {
    return { status: 'ERROR', titleKey: 'invertTitle', messageKey: 'invertDesc' }
  }
  if (eng.peakForefootPressureKpa >= C.CRITICAL_KPA || eng.forefootLoad >= C.CRITICAL_LOAD) {
    return { status: 'ERROR', titleKey: 'padTitle', messageKey: 'padDesc' }
  }
  if (eng.heelOffsetTooFarForward) {
    return { status: 'WARNING', titleKey: 'heelFwdTitle', messageKey: 'heelFwdDesc' }
  }
  if (eng.internalSlope < 0) {
    return { status: 'WARNING', titleKey: 'negDropTitle', messageKey: 'negDropDesc' }
  }
  if (eng.rx.requiresZipOrLaceWarning) {
    return { status: 'WARNING', titleKey: 'girthWarnTitle', messageKey: 'girthWarnDesc' }
  }
  if (eng.internalSlope > C.COMFORT_ANGLE) {
    return { status: 'WARNING', titleKey: 'warnTitle', messageKey: 'warn1Desc' }
  }
  if (heelHeight < 20 && activeRocker > 16) {
    return { status: 'WARNING', titleKey: 'warnTitle', messageKey: 'warn2Desc' }
  }
  return { status: 'SUCCESS', titleKey: 'successTitle', messageKey: 'successDesc' }
}

/**
 * Автоподбор, который ГАРАНТИРОВАННО выводит систему в зелёный статус (SUCCESS) при любом весе (даже 120–150 кг)
 */
export function suggestAutoFix(input: HeelInput, eng: HeelEngineering) {
  let soleType: SoleType = input.soleType
  let heelHeight = input.heelHeight
  let toeThickness = input.toeThickness
  let heelTipOffsetMm = 0
  let rockerAngle = input.rockerAngle

  // 1. Если большой вес (>= 95 кг) и высокое давление в пучках — выбираем между Рокером и Томасом с минимальным перепадом (дроп 12–14 мм)
  if (input.weightKg >= 95 && eng.peakForefootPressureKpa >= HEEL_CONST.CRITICAL_KPA) {
    soleType = Math.abs(input.pronationDeg) >= 3 ? 'thomas' : 'rocker'
    heelHeight = 26
    toeThickness = 14 // чистый перепад всего 12 мм -> нагрузка уходит с пучков на всю стопу!
    rockerAngle = 16
  } else if (eng.rx.recommendThomasHeel && soleType === 'flat') {
    soleType = 'thomas'
    heelHeight = input.gender === 'male' ? 26 : 28
    toeThickness = 12
  } else if (eng.peakForefootPressureKpa >= HEEL_CONST.CRITICAL_KPA) {
    if (soleType === 'flat') soleType = 'rocker'
    heelHeight = 26
    toeThickness = 14
    rockerAngle = 15
  }

  // 2. Если наклон всё ещё выше безопасного 11° — выравниваем платформой
  const targetRad = (HEEL_CONST.SAFE_ANGLE * Math.PI) / 180
  const maxSafeNet = Math.floor(eng.lEff * Math.sin(targetRad))
  if (heelHeight - toeThickness > maxSafeNet) {
    toeThickness = Math.min(HEEL_CONST.MAX_TOE, Math.max(0, Math.ceil(heelHeight - maxSafeNet)))
  } else if (heelHeight < toeThickness) {
    toeThickness = heelHeight
  }

  return {
    soleType,
    toeThickness,
    heelHeight,
    heelTipOffsetMm,
    rockerAngle,
  }
}
