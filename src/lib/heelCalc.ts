// src/lib/heelCalc.ts

export type Gender = 'female' | 'male'
export type SoleType = 'flat' | 'thomas' | 'rocker'
export type RockerType = 'forefoot' | 'heelToToe' | 'negative'
export type ToeShape = 'egyptian' | 'greek' | 'roman'
export type ArchMorphology = 'flat' | 'normal' | 'cavus'
export type LastApexType = 'medial_straight' | 'oblique_anatomical' | 'wide_square'

export const HEEL_CONST = {
  STEP_TO_MM: 6.67,
  FUNCTIONAL_ALLOWANCE: 8,
  MAX_TOE: 60,
  MAX_LIFT: 50,
  MAX_THOMAS_HEEL_MM: 35,
  MAX_SHANK_MOMENT_NM: 28,
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
  toeShape?: ToeShape
  halluxValgusDeg?: number
  archType?: ArchMorphology
  lengthAsymmetryMm?: number
}

export interface MathFormulaStep {
  title: string
  given: string
  formula: string
  substitution: string
  result: string
  meaning: string
}

export interface MasterPrescription {
  widthCode: string
  ballBuildUpMm: number
  instepBuildUpMm: number
  obliqueEntryDeltaMm: number
  requiresZipOrLaceWarning: boolean
  forefootWidthMm: number
  standardForefootWidthMm: number
  heelWidthMm: number
  widthIndexPct: number
  lastApexType: LastApexType
  lastApexLabel: string
  /** Положение анатомического апекса стопы от центральной оси (+ внутрь к I пальцу, - к II/III пальцам), мм */
  anatomicalFootApexOffsetMm: number
  /** Положение геометрического апекса колодки от центральной оси, мм */
  toeBoxShiftMedialMm: number
  toeBoxHeightMm: number
  /** Свободный функциональный припуск перед пальцами (зеленая зона), мм */
  toeFreeSpaceMm: number
  medialBunionPocketMm: number
  compensatoryInsoleHalfPairMm: number
  orthoticIndicated: boolean
  insoleType: 'neutral' | 'supinator' | 'pronator'
  archSupportHeightMm: number
  medialHeelWedgeMm: number
  lateralWedgeMm: number
  shoreA: string
  counterStiffness: string
  recommendThomasHeel: boolean
  thomasHeelType: 'none' | 'medial' | 'lateral'
  thomasExtensionMm: number
  recommendedThomasMm: number
  metatarsalObliqueAngleDeg: number
  calculations: MathFormulaStep[]
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
    toeShape = 'egyptian',
    halluxValgusDeg = 0,
    archType = 'normal',
    lengthAsymmetryMm = 0,
  } = input

  const clampedWeight = Math.max(35, Math.min(160, weightKg))
  const hvDeg = Math.max(0, Math.min(40, halluxValgusDeg))
  const asymMm = Math.max(0, Math.min(15, lengthAsymmetryMm))

  const footLengthMm = Math.round((shoeSize - 1.5) * C.STEP_TO_MM + asymMm * 0.5)
  const toeShapeAllowance = toeShape === 'greek' ? 11 : toeShape === 'roman' ? 9 : 8
  const toeFreeSpaceMm = 10 + ( gender === 'male' ? 2 : 0 ) + (toeShapeAllowance - 8)
  const lastLengthMm = Math.round(footLengthMm + toeFreeSpaceMm + 6)

  const std = getStandardGirths(gender, shoeSize)
  const ballBuildUpMm = ballGirthMm - std.ballGirthMm
  const instepBuildUpMm = instepGirthMm - std.instepGirthMm
  const obliqueEntryDeltaMm = obliqueGirthMm - std.obliqueGirthMm

  const standardForefootWidthMm = parseFloat((std.ballGirthMm * 0.415).toFixed(1))
  const forefootWidthMm = parseFloat((ballGirthMm * 0.415).toFixed(1))
  const heelWidthMm = parseFloat((ballGirthMm * 0.274).toFixed(1))
  const widthIndexPct = parseFloat(((forefootWidthMm / footLengthMm) * 100).toFixed(1))

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
  const requiresZipOrLaceWarning =
    obliqueEntryDeltaMm >= 12 || instepBuildUpMm >= 10 || archType === 'cavus'

  // Разделение Анатомического апекса стопы и Геометрического апекса колодки
  const anatomicalFootApexOffsetMm =
    toeShape === 'egyptian' ? 9 : toeShape === 'greek' ? -2 : 3

  let lastApexType: LastApexType = 'medial_straight'
  let lastApexLabel = 'Прямой апекс (Straight Medial Apex — по оси I луча)'
  let toeBoxShiftMedialMm = 5
  if (toeShape === 'greek' && hvDeg < 12) {
    lastApexType = 'oblique_anatomical'
    lastApexLabel = 'Косой апекс (Oblique Apex — вершина по II лучу)'
    toeBoxShiftMedialMm = 0
  } else if (toeShape === 'roman') {
    lastApexType = 'wide_square'
    lastApexLabel = 'Широкий трапециевидный апекс (I–III лучи)'
    toeBoxShiftMedialMm = 3
  } else if (hvDeg >= 10) {
    lastApexType = 'medial_straight'
    lastApexLabel = 'Орто-прямой медиальный апекс (разгрузка I луча)'
    toeBoxShiftMedialMm = Math.round(5 + (hvDeg - 8) * 0.25)
  }

  const medialBunionPocketMm = hvDeg >= 10 ? Math.min(8, Math.round((hvDeg - 8) * 0.35)) : 0
  const toeBoxHeightMm = archType === 'cavus' ? 28 : hvDeg >= 15 ? 25 : 22
  const compensatoryInsoleHalfPairMm = asymMm >= 4 ? Math.round(asymMm * 0.75) : 0

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

  const counterStiffness =
    Math.abs(clampedPronation) >= 4 || clampedWeight >= 95
      ? 'Жесткий удлиненный задник 2.2 мм (до пучков)'
      : 'Формоустойчивый задник 1.6 мм'

  const orthoticIndicated =
    Math.abs(clampedPronation) >= 2 ||
    archType !== 'normal' ||
    hvDeg >= 10 ||
    ballBuildUpMm >= 6 ||
    clampedWeight >= 90

  let insoleType: 'neutral' | 'supinator' | 'pronator' = 'neutral'
  let archSupportHeightMm = archType === 'cavus' ? 14 : archType === 'flat' ? 12 : 8
  let medialHeelWedgeMm = 0
  let lateralWedgeMm = 0
  let recommendThomasHeel = false
  let recommendedThomasMm = 0

  if (clampedPronation <= -2 || archType === 'flat') {
    const valgusAbs = Math.max(Math.abs(clampedPronation), archType === 'flat' ? 3 : 0)
    insoleType = 'supinator'
    archSupportHeightMm = Math.min(16, Math.round(10 + valgusAbs * 0.5))
    medialHeelWedgeMm = Math.min(7, Math.max(2, Math.round(valgusAbs * 0.5 * weightScale)))
    recommendThomasHeel = valgusAbs >= 3
    recommendedThomasMm = Math.min(26, Math.round((13 + valgusAbs * 0.95) * Math.min(1.15, weightScale)))
  } else if (clampedPronation >= 2 || archType === 'cavus') {
    const varusAbs = Math.max(Math.abs(clampedPronation), archType === 'cavus' ? 3 : 0)
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
  const apexM5_Mm = Math.round(apexM1_Mm - footLengthMm * 0.082)
  const metatarsalObliqueAngleDeg = parseFloat(
    (Math.atan2(apexM1_Mm - apexM5_Mm, forefootWidthMm * 0.82) * (180 / Math.PI)).toFixed(1)
  )

  const contactAreaScale = (footLengthMm / 245) * (1 + ballBuildUpMm * 0.008)
  const orthoReliefFactor =
    soleType === 'rocker' ? 1.52 : soleType === 'thomas' ? 1.42 : 1.0
  const foreAreaCm2 = Math.max(30, 46 * contactAreaScale * orthoReliefFactor)
  const heelAreaCm2 = Math.max(22, 33 * contactAreaScale * (soleType !== 'flat' ? 1.32 : 1.0))

  const totalForceN = clampedWeight * 9.81 * 1.15
  const foreForceN = totalForceN * (forefootLoad / 100)
  const heelForceN = totalForceN * (heelLoad / 100)
  const rollConcentration = 1 + Math.abs(effectiveRoll) * 0.028 + (archType === 'cavus' ? 0.12 : 0)

  const peakForefootPressureKpa = Math.round(
    (foreForceN / foreAreaCm2) * 10 * 1.55 * rollConcentration
  )
  const peakHeelPressureKpa = Math.round((heelForceN / heelAreaCm2) * 10 * 1.45)

  // ИСПРАВЛЕНО: Пелот Зейца назначается ТОЛЬКО при реальных показаниях поперечного отдела!
  // Он больше НЕ включается автоматически при выборе подошвы Томаса или Рокера!
  const requiresMetatarsalPad =
    forefootLoad >= 68 ||
    peakForefootPressureKpa >= 215 ||
    ballBuildUpMm >= 6 ||
    hvDeg >= 12 ||
    archType === 'flat' ||
    archType === 'cavus'

  let metatarsalPadPosMm: number | null = null
  let metatarsalPadHeightMm: number | null = null
  if (requiresMetatarsalPad) {
    metatarsalPadPosMm = Math.round(apexM1_Mm - 7)
    metatarsalPadHeightMm =
      clampedWeight >= 100 || ballBuildUpMm >= 10 || hvDeg >= 15 ? 6 : netRise > 25 ? 5 : 4
  }

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

  const calculations: MathFormulaStep[] = [
    {
      title: '1. Конструктивная длина следа колодки (L_last)',
      given: `Размер = ${shoeSize}, Стопа L_ст = ${footLengthMm} мм, Припуск Движ+Фасон = ${toeFreeSpaceMm + 6} мм`,
      formula: 'L_last = L_ст + Δ_свободн + Δ_фасон',
      substitution: `${footLengthMm} + ${toeFreeSpaceMm} + 6`,
      result: `${lastLengthMm} мм`,
      meaning: `Зеленая зона свободного пространства перед пальцами равна ${toeFreeSpaceMm} мм.`,
    },
    {
      title: '2. Расширение пучков и карман под I луч (Желтая зона доработки)',
      given: `Обхват клиента O_п = ${ballGirthMm} мм, База = ${std.ballGirthMm} мм, HV = ${hvDeg}°`,
      formula: 'ΔO_п = O_п − O_база;  ΔW_пуч = (O_п − O_база) × 0.415',
      substitution: `${ballGirthMm} − ${std.ballGirthMm} = ${ballBuildUpMm} мм`,
      result: `Налепка пучков: ${ballBuildUpMm >= 0 ? `+${ballBuildUpMm}` : ballBuildUpMm} мм (Ширина ${forefootWidthMm} мм vs база ${standardForefootWidthMm} мм)`,
      meaning:
        ballBuildUpMm > 0 || medialBunionPocketMm > 0
          ? `Желтая зона модификации: расширить пучки на +${Math.max(0, ballBuildUpMm)} мм, карман M1 +${medialBunionPocketMm} мм.`
          : 'Стандартная ширина пучков колодки.',
    },
    {
      title: '3. Положение апекса и косой линии сгиба (Синие ориентиры)',
      given: `M1 = ${apexM1_Mm} мм, M5 = ${apexM5_Mm} мм, Ширина = ${forefootWidthMm} мм`,
      formula: 'φ_изгиба = arctan((X_M1 − X_M5) / (0.82 × W_пуч))',
      substitution: `arctan((${apexM1_Mm} − ${apexM5_Mm}) / ${(forefootWidthMm * 0.82).toFixed(1)})`,
      result: `Угол сгиба φ = ${metatarsalObliqueAngleDeg}°; Смещение апекса мыска = +${toeBoxShiftMedialMm} мм`,
      meaning: `${lastApexLabel}.`,
    },
    {
      title: '4. Пиковое давление (Красная зона) и момент геленка 65Г',
      given: `Вес = ${clampedWeight} кг, Нагрузка пучков = ${forefootLoad}%, Наклон = ${internalSlope.toFixed(1)}°`,
      formula: 'P_peak = (F_пуч / S_оп) × k;  M_гел = F_дин × L_рычага × k_укл',
      substitution: `P = ${peakForefootPressureKpa} кПа;  M = ${shankBendingMomentNm} Н·м`,
      result: `Давление ${peakForefootPressureKpa} кПа · Момент ${shankBendingMomentNm} Н·м (Сталь ${steelThickness} мм)`,
      meaning: requiresMetatarsalPad
        ? `Требуется пелот Зейца ${metatarsalPadHeightMm} мм на расстоянии ${metatarsalPadPosMm} мм от пятки.`
        : 'Перегрузки поперечного свода нет — пелот Зейца не требуется.',
    },
  ]

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
      forefootWidthMm,
      standardForefootWidthMm,
      heelWidthMm,
      widthIndexPct,
      lastApexType,
      lastApexLabel,
      anatomicalFootApexOffsetMm,
      toeBoxShiftMedialMm,
      toeBoxHeightMm,
      toeFreeSpaceMm,
      medialBunionPocketMm,
      compensatoryInsoleHalfPairMm,
      orthoticIndicated,
      insoleType,
      archSupportHeightMm,
      medialHeelWedgeMm,
      lateralWedgeMm,
      shoreA,
      counterStiffness,
      recommendThomasHeel,
      thomasHeelType,
      thomasExtensionMm,
      recommendedThomasMm,
      metatarsalObliqueAngleDeg,
      calculations,
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

  if (Math.abs(input.pronationDeg) >= 3) {
    soleType = 'thomas'
    heelHeight = 24
    toeThickness = 14
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

  if (soleType === 'thomas' && heelHeight > HEEL_CONST.MAX_THOMAS_HEEL_MM) {
    heelHeight = 28
    toeThickness = Math.max(toeThickness, 12)
  }

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
