// src/lib/heelCalc.ts

export type Gender = 'female' | 'male'
export type SoleType = 'flat' | 'thomas' | 'rocker'
export type RockerType = 'forefoot' | 'heelToToe' | 'negative'

export const HEEL_CONST = {
  STEP_TO_MM: 6.67,
  FUNCTIONAL_ALLOWANCE: 8,
  MAX_TOE: 60,
  MAX_LIFT: 50,
  MAX_THOMAS_HEEL_MM: 35, // Максимальная ортопедически допустимая высота каблука Томаса
  MAX_SHANK_MOMENT_NM: 28, // Предельный безопасный изгибающий момент на стальной геленок 65Г
  CRITICAL_ANGLE: 16,
  COMFORT_ANGLE: 12,
  SAFE_ANGLE: 10.5,
  CRITICAL_LOAD: 75,
  CRITICAL_KPA: 245,
  MAX_ROCKER_ANGLE: 28,
  ROCKER_MITIGATION_CAP: 0.32,
  HEEL_CENTER_RATIO: 0.15,
  MAX_HEEL_OFFSET_MM: 5,
  CRITICAL_PRONATION_DEG: 5.5,
  WARN_PRONATION_DEG: 3,
} as const

export const ROCKER_PRESETS: Record<RockerType, { angle: number; startPct: number }> = {
  forefoot:  { angle: 15, startPct: 60 },
  heelToToe: { angle: 18, startPct: 56 },
  negative:  { angle: 10, startPct: 65 },
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
  recommendThomasHeel: boolean
  thomasHeelType: 'none' | 'medial' | 'lateral'
  thomasExtensionMm: number
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
  shankOverloaded: boolean
  thomasTooHigh: boolean
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

  const footLengthMm = Math.round((shoeSize - 1.5) * C.STEP_TO_MM)
  const allowance = gender === 'male' ? 10 : C.FUNCTIONAL_ALLOWANCE
  const lastLengthMm = Math.round(shoeSize * C.STEP_TO_MM + allowance)

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

  let shoreA = '40–45 Shore A (Средняя EVA)'
  if (clampedWeight < 60) {
    shoreA = '30–35 Shore A (Мягкая EVA/PPT)'
  } else if (clampedWeight > 85 && clampedWeight <= 108) {
    shoreA = '50–55 Shore A (Усиленная EVA + каркас)'
  } else if (clampedWeight > 108) {
    shoreA = '60–65 Shore A (Жесткий карбон/термопласт)'
  }

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
    archSupportHeightMm = Math.min(16, Math.round(9 + valgusAbs * 0.55))
    medialHeelWedgeMm = Math.min(7, Math.max(2, Math.round(valgusAbs * 0.5 * weightScale)))
    recommendThomasHeel = valgusAbs >= 3
    recommendedThomasMm = Math.min(26, Math.round((13 + valgusAbs * 0.95) * Math.min(1.15, weightScale)))
  } else if (clampedPronation >= 2) {
    const varusAbs = Math.abs(clampedPronation)
    insoleType = 'pronator'
    archSupportHeightMm = Math.max(0, Math.round(4 - varusAbs * 0.4))
    lateralWedgeMm = Math.min(7, Math.max(2, Math.round(varusAbs * 0.5 * weightScale)))
    recommendThomasHeel = varusAbs >= 3
    recommendedThomasMm = Math.min(24, Math.round((12 + varusAbs * 0.9) * Math.min(1.15, weightScale)))
  } else {
    recommendedThomasMm = Math.round(15 * Math.min(1.15, weightScale))
  }

  let thomasHeelType: 'none' | 'medial' | 'lateral' = 'none'
  let thomasExtensionMm = 0
  if (soleType === 'thomas') {
    thomasHeelType = clampedPronation >= 2 ? 'lateral' : 'medial'
    thomasExtensionMm = recommendedThomasMm
  }

  const clampedStartPct = Math.max(52, Math.min(78, rockerStartPct))
  const dynamicLeverRatio = Math.max(
    0.58,
    Math.min(0.78, (clampedStartPct / 100 - C.HEEL_CENTER_RATIO) * 1.38)
  )
  const lEff = parseFloat((lastLengthMm * dynamicLeverRatio).toFixed(1))

  const netRise = heelHeight - toeThickness
  const asinArg = lEff > 0 ? Math.max(-1, Math.min(1, netRise / lEff)) : 0
  const internalSlope = Math.asin(asinArg) * (180 / Math.PI)

  let loadCalc = 44 + (netRise / Math.max(lEff, 1)) * 102
  if (soleType === 'rocker') {
    const angleFactor = Math.min(1, Math.max(0, rockerAngle / C.MAX_ROCKER_ANGLE))
    const distFromOptimum = Math.abs(clampedStartPct - 60)
    const placementEfficiency = Math.max(0.35, 1 - distFromOptimum / 28)
    const factor = Math.min(1, angleFactor * placementEfficiency)
    loadCalc *= 1 - C.ROCKER_MITIGATION_CAP * factor
  } else if (soleType === 'thomas') {
    loadCalc *= 0.91
  }
  const forefootLoad = Math.min(100, Math.max(0, Math.round(loadCalc)))
  const heelLoad = 100 - forefootLoad

  // Компенсация завала каблуком Томаса эффективна только тогда, когда сам каблук не выше 35 мм!
  const thomasHeightEfficiency =
    soleType === 'thomas' ? Math.max(0.2, 1 - Math.max(0, heelHeight - 30) * 0.025) : 0
  const orthoStabilization =
    soleType === 'thomas'
      ? clampedPronation * 0.52 * thomasHeightEfficiency
      : soleType === 'rocker'
      ? clampedPronation * 0.42
      : clampedPronation * 0.15
  const effectiveRoll = clampedPronation - orthoStabilization
  const m1Ratio = Math.max(0.22, Math.min(0.82, 0.55 - effectiveRoll * 0.024))
  const loadM1Pct = Math.round(forefootLoad * m1Ratio)
  const loadM5Pct = Math.max(0, forefootLoad - loadM1Pct)

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

  const contactAreaScale = (footLengthMm / 245) * (1 + ballBuildUpMm * 0.008)
  const orthoReliefFactor =
    soleType === 'rocker' ? 1.52 : soleType === 'thomas' ? 1.42 : 1.0
  const foreAreaCm2 = Math.max(30, 46 * contactAreaScale * orthoReliefFactor)
  const heelAreaCm2 = Math.max(22, 33 * contactAreaScale * (soleType !== 'flat' ? 1.32 : 1.0))

  const totalForceN = clampedWeight * 9.81 * 1.15
  const foreForceN = totalForceN * (forefootLoad / 100)
  const heelForceN = totalForceN * (heelLoad / 100)
  const rollConcentration = 1 + Math.abs(effectiveRoll) * 0.028

  const peakForefootPressureKpa = Math.round(
    (foreForceN / foreAreaCm2) * 10 * 1.55 * rollConcentration
  )
  const peakHeelPressureKpa = Math.round((heelForceN / heelAreaCm2) * 10 * 1.45)

  const shankLength = Math.round(Math.max(40, ballPos - heelCenterPos - 5))
  const supportReductionMm =
    soleType === 'rocker'
      ? shankLength * 0.42
      : soleType === 'thomas'
      ? thomasExtensionMm * 0.85
      : 0
  const offsetPenaltyMm = soleType !== 'rocker' ? Math.max(0, -heelTipOffsetMm) * 2.2 : 0
  const effectiveMomentArmM = Math.max(
    0.014,
    (shankLength * 0.48 - supportReductionMm + offsetPenaltyMm) / 1000
  )
  const slopeLoadFactor = 0.25 + Math.max(0, Math.sin((internalSlope * Math.PI) / 180)) * 0.95
  const shankBendingMomentNm = parseFloat(
    (totalForceN * effectiveMomentArmM * slopeLoadFactor).toFixed(1)
  )

  const shankOverloaded = shankBendingMomentNm > C.MAX_SHANK_MOMENT_NM
  const thomasTooHigh = soleType === 'thomas' && heelHeight > C.MAX_THOMAS_HEEL_MM

  let steelThickness = clampedWeight >= 85 || gender === 'male' ? 1.5 : 1.2
  if (netRise > 35 || shankBendingMomentNm > 20) steelThickness = Math.max(steelThickness, 1.5)
  if (netRise > 55 || shankBendingMomentNm > 25 || clampedWeight >= 105) steelThickness = 2.0

  // ИСПРАВЛЕНО: Смещение пятки проверяется и в режиме СТАНДАРТ, и в режиме ТОМАСА!
  const heelOffsetTooFarBack = soleType !== 'rocker' && heelTipOffsetMm < -1
  const heelOffsetTooFarForward =
    soleType !== 'rocker' && heelTipOffsetMm > C.MAX_HEEL_OFFSET_MM

  const baseStabilityFactor = soleType === 'thomas' ? 0.5 : soleType === 'rocker' ? 0.55 : 1.0
  const heightRisk = Math.max(0, netRise) * 0.55
  const rollRisk = Math.abs(effectiveRoll) * (2.6 + (clampedWeight / 75) * 1.15)
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
    shankOverloaded,
    thomasTooHigh,
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
  if (eng.heelOffsetTooFarForward) {
    return { status: 'ERROR', titleKey: 'heelFwdTitle', messageKey: 'heelFwdDesc' }
  }
  if (eng.thomasTooHigh) {
    return { status: 'ERROR', titleKey: 'errTitle', messageKey: 'errDesc' }
  }
  if (eng.internalSlope >= C.CRITICAL_ANGLE || eng.shankOverloaded) {
    return { status: 'ERROR', titleKey: 'errTitle', messageKey: 'errDesc' }
  }
  if (eng.rx.recommendThomasHeel && soleType === 'flat') {
    return { status: 'ERROR', titleKey: 'thomasNeedTitle', messageKey: 'thomasNeedDesc' }
  }
  if (eng.highInversionRisk || eng.highPronationStress) {
    return { status: 'ERROR', titleKey: 'invertTitle', messageKey: 'invertDesc' }
  }
  if (eng.peakForefootPressureKpa >= C.CRITICAL_KPA || eng.forefootLoad >= C.CRITICAL_LOAD) {
    return { status: 'ERROR', titleKey: 'padTitle', messageKey: 'padDesc' }
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

export function suggestAutoFix(input: HeelInput, eng: HeelEngineering) {
  let soleType: SoleType = input.soleType
  let heelHeight = input.heelHeight
  let toeThickness = input.toeThickness
  const heelTipOffsetMm = 0
  let rockerAngle = input.rockerAngle

  // 1. При выраженном завале пятки (>= 3°) обязательно включаем каблук Томаса и снижаем высоту каблука до ортопедического стандарта (24–28 мм)
  if (Math.abs(input.pronationDeg) >= 3) {
    soleType = 'thomas'
    heelHeight = 24
    toeThickness = 14 // перепад 10 мм -> момент падает ниже 24 Н·м даже при 150 кг!
  } else if (
    eng.peakForefootPressureKpa >= HEEL_CONST.CRITICAL_KPA ||
    eng.shankOverloaded ||
    input.weightKg >= 95
  ) {
    if (soleType === 'flat') soleType = 'rocker'
    heelHeight = 24
    toeThickness = 14
    rockerAngle = 15
  }

  // 2. Если выбран Томас и каблук выше 35 мм — снижаем до 28 мм
  if (soleType === 'thomas' && heelHeight > HEEL_CONST.MAX_THOMAS_HEEL_MM) {
    heelHeight = 28
    toeThickness = Math.max(toeThickness, 12)
  }

  // 3. Проверка по углу и моменту геленка
  const targetRad = (HEEL_CONST.SAFE_ANGLE * Math.PI) / 180
  const maxSafeNet = Math.min(14, Math.floor(eng.lEff * Math.sin(targetRad)))
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
