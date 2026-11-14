// src/lib/heelCalc.ts

export type Gender = 'female' | 'male'
export type SoleType = 'flat' | 'thomas' | 'rocker'
export type HeelType = 'stiletto' | 'block' | 'kitten' | 'flared'
export type RockerType = 'forefoot' | 'heelToToe' | 'negative'
export type FootPathology = 'neutral' | 'pronation' | 'supination'

export const HEEL_CONST = {
  STEP_TO_MM: 6.67,
  FUNCTIONAL_ALLOWANCE: 8,
  L_EFF_RATIO: 0.73,
  MAX_TOE: 80,
  MAX_LIFT: 50,
  CRITICAL_ANGLE: 18,
  COMFORT_ANGLE: 14,
  SAFE_ANGLE: 13.8,
  CRITICAL_LOAD: 78,
  MAX_ROCKER_ANGLE: 30,
  ROCKER_MITIGATION_CAP: 0.25,
  HEEL_CENTER_RATIO: 0.15,
  MAX_HEEL_OFFSET_MM: 5,
  CRITICAL_PRONATION_DEG: 7,
  WARN_PRONATION_DEG: 3,
} as const

/** Пресеты рокера: угол + точка старта переката */
export const ROCKER_PRESETS: Record<RockerType, { angle: number; startPct: number }> = {
  forefoot:  { angle: 14, startPct: 60 }, // Метатарзалгия
  heelToToe: { angle: 16, startPct: 55 }, // Артроз голеностопа / ригидный I палец
  negative:  { angle: 9,  startPct: 65 }, // Диабетическая стопа / разгрузка пятки
}

export interface HeelInput {
  gender: Gender
  shoeSize: number
  heelHeight: number
  toeThickness: number
  soleType: SoleType
  heelType: HeelType
  rockerAngle: number
  rockerStartPct: number
  heelTipOffsetMm: number
  tipWidthMm: number
  rockerType?: RockerType
  /**
   * Угол завала стопы (пятки):
   * Отрицательный (-1° .. -12°) = Гиперпронация / Вальгус (завал внутрь)
   * Положительный (+1° .. +12°) = Гиперсупинация / Варус (завал наружу)
   */
  pronationDeg: number
  /** Косой/прямой обхват в пучках (Ball Girth O_п), мм */
  ballGirthMm: number
  /** Прямой обхват взъема (Direct Instep Girth O_в), мм */
  instepGirthMm: number
  /** Косой обхват через пятку и сгиб голеностопа (Oblique Girth O_к), мм */
  obliqueGirthMm: number
}

export interface MasterPrescription {
  /** Буквенно-цифровой индекс полноты колодки (E/5 .. M/11) */
  widthCode: string
  /** Налепка (+) или сгонка (-) на пучки колодки, мм */
  ballBuildUpMm: number
  /** Налепка (+) или вкладыш (-) на гребень прямого взъема колодки, мм */
  instepBuildUpMm: number
  /** Запас/дефицит косого обхвата для входа стопы в голенище (челси/лофер), мм */
  obliqueEntryDeltaMm: number
  /** Нужна ли молния/шнуровка из-за большого косого обхвата */
  requiresZipOrLaceWarning: boolean
  /** Тип корректирующей стельки: 'neutral' | 'supinator' (при вальгусе) | 'pronator' (при варусе) */
  insoleType: 'neutral' | 'supinator' | 'pronator'
  /** Высота выкладки продольного свода стельки (супинатора), мм */
  archSupportHeightMm: number
  /** Толщина медиального (внутреннего) клина пятки при пронации/вальгусе, мм */
  medialHeelWedgeMm: number
  /** Толщина латерального (внешнего) клина пятки и пучка при супинации/варусе, мм */
  lateralWedgeMm: number
  /** Рекомендуется ли каблук Томаса */
  recommendThomasHeel: boolean
  /** Тип каблука Томаса: 'none' | 'medial' (прямой, удлинение изнутри) | 'lateral' (обратный, снаружи) */
  thomasHeelType: 'none' | 'medial' | 'lateral'
  /** Длина выступа (груди) каблука Томаса вперед под геленок, мм */
  thomasExtensionMm: number
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
  minSafeTipMm: number
  entryAngleDeg: number
  pronationDeg: number
  highPronationStress: boolean
  metatarsalPadPosMm: number | null
  metatarsalPadHeightMm: number | null
  apexM1_Mm: number | null
  apexM5_Mm: number | null
  carbonInsertThicknessMm: number
  /** Полный ортопедический рецепт для мастера-колодочника */
  rx: MasterPrescription
}

export type AuditStatus = 'SUCCESS' | 'WARNING' | 'ERROR'

export interface HeelAudit {
  status: AuditStatus
  titleKey: string
  messageKey: string
}

/**
 * Эталонные антропометрические обмеры стопы (средняя полнота F/6) по ГОСТ / WMS
 * для заданного размера и пола (Мужская / Женская обувь)
 */
export function getStandardGirths(gender: Gender, shoeSize: number) {
  if (gender === 'male') {
    // Мужская шкала: базовый 42 размер -> пучки 244 мм, прямой взъем 252 мм, косой обхват 322 мм
    const diff = shoeSize - 42
    const ballGirthMm = Math.round(244 + diff * 5.0)
    const instepGirthMm = Math.round(252 + diff * 5.2)
    const obliqueGirthMm = Math.round(322 + diff * 6.5)
    return { ballGirthMm, instepGirthMm, obliqueGirthMm, stepWidthMm: 6 }
  } else {
    // Женская шкала: базовый 38 размер -> пучки 222 мм, прямой взъем 229 мм, косой обхват 292 мм
    const diff = shoeSize - 38
    const ballGirthMm = Math.round(222 + diff * 4.8)
    const instepGirthMm = Math.round(229 + diff * 5.0)
    const obliqueGirthMm = Math.round(292 + diff * 6.0)
    return { ballGirthMm, instepGirthMm, obliqueGirthMm, stepWidthMm: 5 }
  }
}

export function computeMinSafeTip(heelType: HeelType, netRise: number, gender: Gender = 'female'): number {
  const positiveRise = Math.max(0, netRise)
  if (gender === 'male') {
    return 24 + positiveRise * 0.08
  }
  if (heelType === 'stiletto') return 10 + positiveRise * 0.08
  if (heelType === 'kitten')   return 12 + positiveRise * 0.06
  if (heelType === 'flared')   return 16 + positiveRise * 0.05
  return 18 + positiveRise * 0.06
}

export function computeEngineering(input: HeelInput): HeelEngineering {
  const C = HEEL_CONST
  const {
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
    pronationDeg = 0,
    ballGirthMm,
    instepGirthMm,
    obliqueGirthMm,
  } = input

  // 1. Длина стопы и конструктивная длина колодки
  const footLengthMm = Math.round((shoeSize - 1.5) * C.STEP_TO_MM)
  const allowance = gender === 'male' ? 10 : C.FUNCTIONAL_ALLOWANCE
  const lastLengthMm = Math.round(shoeSize * C.STEP_TO_MM + allowance)

  // 2. Расчет антропометрии колодки (Полнота, Налепка на пучки, Прямой взъем, Косой обхват)
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

  // Если косой обхват превышает стандарт более чем на 12 мм, в челси/сапоги без молнии нога не войдет
  const requiresZipOrLaceWarning = obliqueEntryDeltaMm >= 12 || instepBuildUpMm >= 10

  // 3. Ортопедический рецепт стельки и каблука Томаса по углу пронации/супинации
  const clampedPronation = Math.max(-15, Math.min(15, pronationDeg))
  let insoleType: 'neutral' | 'supinator' | 'pronator' = 'neutral'
  let archSupportHeightMm = 8 // базовая анатомическая поддержка свода
  let medialHeelWedgeMm = 0
  let lateralWedgeMm = 0
  let recommendThomasHeel = false
  let thomasHeelType: 'none' | 'medial' | 'lateral' = 'none'
  let thomasExtensionMm = 0

  if (clampedPronation <= -2) {
    // Гиперпронация (вальгус, завал стопы ВНУТРЬ) -> нужен СУПИНАТОР + медиальный клин + прямой каблук Томаса
    const valgusAbs = Math.abs(clampedPronation)
    insoleType = 'supinator'
    archSupportHeightMm = Math.min(18, Math.round(10 + valgusAbs * 0.7))
    medialHeelWedgeMm = Math.min(7, Math.max(2, Math.round(valgusAbs * 0.55)))
    recommendThomasHeel = valgusAbs >= 3
    if (soleType === 'thomas' || recommendThomasHeel) {
      thomasHeelType = 'medial'
      thomasExtensionMm = Math.round(14 + Math.min(12, valgusAbs * 1.1))
    }
  } else if (clampedPronation >= 2) {
    // Гиперсупинация (варус, завал стопы НАРУЖУ) -> нужен ПРОНАТОР (латеральный клин) + обратный каблук Томаса
    const varusAbs = Math.abs(clampedPronation)
    insoleType = 'pronator'
    archSupportHeightMm = Math.max(0, Math.round(4 - varusAbs * 0.4)) // убираем внутренний свод, чтобы не выворачивать стопу наружу!
    lateralWedgeMm = Math.min(7, Math.max(2, Math.round(varusAbs * 0.55)))
    recommendThomasHeel = varusAbs >= 3
    if (soleType === 'thomas' || recommendThomasHeel) {
      thomasHeelType = 'lateral'
      thomasExtensionMm = Math.round(12 + Math.min(10, varusAbs * 1.0))
    }
  } else if (soleType === 'thomas') {
    // Если мастер принудительно включил подошву Томаса при нейтральной стопе — делаем стандартное медиальное удлинение 15 мм
    thomasHeelType = 'medial'
    thomasExtensionMm = 15
  }

  // 4. Динамический эффективный рычаг L_eff
  const clampedStartPct = Math.max(52, Math.min(78, rockerStartPct))
  const dynamicLeverRatio = Math.max(
    0.58,
    Math.min(0.78, (clampedStartPct / 100 - C.HEEL_CENTER_RATIO) * 1.38)
  )
  const lEff = parseFloat((lastLengthMm * dynamicLeverRatio).toFixed(1))

  const netRise = heelHeight - toeThickness
  const asinArg = lEff > 0 ? Math.max(-1, Math.min(1, netRise / lEff)) : 0
  const internalSlope = Math.asin(asinArg) * (180 / Math.PI)

  // 5. Распределение продольной нагрузки (Пятка / Плюсна)
  let loadCalc = 46 + (netRise / Math.max(lEff, 1)) * 105
  if (soleType === 'rocker') {
    const angleFactor = Math.min(1, Math.max(0, rockerAngle / C.MAX_ROCKER_ANGLE))
    const distFromOptimum = Math.abs(clampedStartPct - 60)
    const placementEfficiency = Math.max(0.25, 1 - distFromOptimum / 25)
    const factor = Math.min(1, angleFactor * placementEfficiency)
    loadCalc *= 1 - C.ROCKER_MITIGATION_CAP * factor
  } else if (soleType === 'thomas') {
    // Каблук Томаса берет на себя часть опорной реакции среднего отдела стопы, разгружая плюсну на ~6%
    loadCalc *= 0.94
  }
  const forefootLoad = Math.min(100, Math.max(0, Math.round(loadCalc)))
  const heelLoad = 100 - forefootLoad

  // 6. Медиально-латеральный баланс лучей M1 и M5 с учетом компенсации каблуком Томаса
  const thomasCompensation = soleType === 'thomas' ? clampedPronation * 0.45 : 0
  const effectiveRoll = clampedPronation - thomasCompensation
  const m1Ratio = Math.max(0.2, Math.min(0.85, 0.56 - effectiveRoll * 0.024))
  const loadM1Pct = Math.round(forefootLoad * m1Ratio)
  const loadM5Pct = Math.max(0, forefootLoad - loadM1Pct)

  // 7. Геленок (супинатор 65Г) и изгибающий момент
  const heelCenterPos = lastLengthMm * C.HEEL_CENTER_RATIO
  const ballPos = lastLengthMm * (clampedStartPct / 100)
  const shankLength = Math.round(Math.max(40, ballPos - heelCenterPos - 5))

  const thomasSupportReduction = soleType === 'thomas' ? thomasExtensionMm * 0.65 : 0
  const offsetPenaltyMm = soleType === 'flat' ? Math.max(0, -heelTipOffsetMm) * 2.2 : 0
  const effectiveMomentArmM = Math.max(0.02, (shankLength * 0.52 - thomasSupportReduction + offsetPenaltyMm) / 1000)
  const bodyForceN = gender === 'male' ? 820 : 680
  const slopeLoadFactor = 0.35 + Math.max(0, Math.sin((internalSlope * Math.PI) / 180)) * 0.85
  const shankBendingMomentNm = parseFloat((bodyForceN * effectiveMomentArmM * slopeLoadFactor).toFixed(1))

  let steelThickness = gender === 'male' ? 1.5 : 1.2
  if (netRise > 40 && netRise <= 70) steelThickness = Math.max(steelThickness, 1.5)
  if (netRise > 70 || shankBendingMomentNm > 26) steelThickness = 2.0

  const heelOffsetTooFarBack = soleType === 'flat' && heelTipOffsetMm < -0.5
  const heelOffsetTooFarForward =
    soleType === 'flat' && heelTipOffsetMm > C.MAX_HEEL_OFFSET_MM

  // 8. Риск инверсии (подворачивания)
  const minSafeTipMm = parseFloat(computeMinSafeTip(heelType, netRise, gender).toFixed(1))
  let inversionRisk = 0
  if (soleType !== 'rocker' && netRise > 0) {
    const effectiveTipW = soleType === 'thomas' ? Math.max(tipWidthMm, 28) : tipWidthMm
    const ratio = effectiveTipW / Math.max(minSafeTipMm, 1)

    if (ratio >= 1) {
      const residual =
        soleType === 'thomas' || heelType === 'block' ? netRise / 11 :
        heelType === 'flared' ? netRise / 9 :
        heelType === 'kitten' ? netRise / 7 :
        /* stiletto */          netRise / 5
      inversionRisk = Math.min(35, Math.max(0, Math.round(residual)))
    } else {
      const narrow = (1 - ratio) * 100
      const heightBonus = netRise > 70 ? 15 : netRise > 50 ? 8 : 0
      inversionRisk = Math.min(100, Math.max(0, Math.round(narrow + heightBonus)))
    }
  }
  const rollInstabilityBonus = Math.round(Math.abs(effectiveRoll) * (netRise > 45 ? 2.6 : 1.6))
  inversionRisk = Math.min(100, inversionRisk + rollInstabilityBonus)

  // 9. Угол скоса каблука
  let entryAngleDeg = 0
  if (soleType === 'flat' && heelHeight > 0) {
    const geometricTaperMm =
      heelType === 'kitten'   ? tipWidthMm * 0.35 + 4.5 :
      heelType === 'flared'   ? -(tipWidthMm * 0.18 + 2.5) :
      heelType === 'stiletto' ? tipWidthMm * 0.20 :
      /* block */               tipWidthMm * 0.04
    const totalHorizontalSweepMm = Math.abs(geometricTaperMm - heelTipOffsetMm)
    entryAngleDeg = parseFloat(
      (Math.atan2(totalHorizontalSweepMm, Math.max(heelHeight, 10)) * (180 / Math.PI)).toFixed(1)
    )
  }

  // 10. Апекс пучков M1–M5 и Пелот Зейца (при поперечном распластывании или перегрузке)
  const apexM1_Mm = Math.round(ballPos - 5)
  const apexM5_Mm = Math.round(apexM1_Mm - lastLengthMm * 0.045)

  // Пелот Зейца нужен как при высоком наклоне (forefootLoad >= 78%), так и при широком распластанном пучке (ballBuildUpMm >= 6 мм)
  const requiresMetatarsalPad = forefootLoad >= C.CRITICAL_LOAD || ballBuildUpMm >= 6
  let metatarsalPadPosMm: number | null = null
  let metatarsalPadHeightMm: number | null = null
  if (requiresMetatarsalPad) {
    metatarsalPadPosMm = Math.round(apexM1_Mm - 7)
    metatarsalPadHeightMm = netRise > 60 || ballBuildUpMm >= 10 ? 6 : netRise > 30 ? 5 : 4
  }

  const copLongitudinalMm = Math.round(
    heelCenterPos + (ballPos - heelCenterPos) * (forefootLoad / 100)
  )
  const copLateralMm = parseFloat((effectiveRoll * 1.45).toFixed(1))

  const carbonInsertThicknessMm =
    soleType === 'rocker'
      ? parseFloat((1.2 + (heelHeight / 100) * 0.6 + (gender === 'male' ? 0.3 : 0)).toFixed(1))
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
    copLongitudinalMm,
    copLateralMm,
    shankBendingMomentNm,
    shankLength,
    steelThickness,
    heelOffsetTooFarBack,
    heelOffsetTooFarForward,
    requiresMetatarsalPad,
    inversionRisk,
    highInversionRisk: inversionRisk >= 55,
    minSafeTipMm,
    entryAngleDeg,
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
      recommendThomasHeel,
      thomasHeelType,
      thomasExtensionMm,
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
  // Если выраженный вальгус/варус (>= 4°), а подошва не Томаса и высокий каблук -> предупреждаем мастера
  if (eng.rx.recommendThomasHeel && soleType === 'flat' && heelHeight > 45) {
    return { status: 'ERROR', titleKey: 'thomasNeedTitle', messageKey: 'thomasNeedDesc' }
  }
  if (eng.highInversionRisk || eng.highPronationStress) {
    return { status: 'ERROR', titleKey: 'invertTitle', messageKey: 'invertDesc' }
  }
  if (eng.forefootLoad >= C.CRITICAL_LOAD) {
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

export function defaultTipWidth(heelType: HeelType, gender: Gender = 'female'): number {
  if (gender === 'male') return 32
  if (heelType === 'stiletto') return 10
  if (heelType === 'kitten') return 14
  if (heelType === 'block') return 28
  return 22
}

/**
 * Автоподбор конструкции обуви под антропометрию и ортопедию клиента:
 * НЕ стирает диагноз клиента (пронацию/обхваты), а подбирает под него правильную подошву Томаса/платформу/каблук!
 */
export function suggestAutoFix(input: HeelInput, eng: HeelEngineering) {
  const C = HEEL_CONST

  const targetRad = (C.SAFE_ANGLE * Math.PI) / 180
  const maxRiseByAngle = eng.lEff * Math.sin(targetRad)
  const maxRiseByLoad = eng.lEff * ((C.CRITICAL_LOAD - 48) / 105)
  const maxSafeNet = Math.floor(Math.min(maxRiseByAngle, maxRiseByLoad))

  let toeThickness = input.toeThickness
  let heelHeight = input.heelHeight
  let heelTipOffsetMm = input.heelTipOffsetMm
  let tipWidthMm = input.tipWidthMm
  let rockerAngle = input.rockerAngle
  let soleType: SoleType = input.soleType
  let heelType: HeelType = input.heelType

  // Если у клиента выраженная пронация/супинация (>= 3°), автоматически включаем ортопедический каблук Томаса и стабильную высоту (25–35 мм)
  if (Math.abs(input.pronationDeg) >= 3 && soleType === 'flat') {
    soleType = 'thomas'
    heelType = 'block'
    heelHeight = Math.min(heelHeight, input.gender === 'male' ? 28 : 35)
    toeThickness = Math.min(toeThickness, 10)
  }

  if (heelHeight - toeThickness > maxSafeNet) {
    const neededPlatform = Math.max(0, Math.ceil(heelHeight - maxSafeNet))
    if (neededPlatform <= C.MAX_TOE) {
      toeThickness = neededPlatform
    } else {
      toeThickness = C.MAX_TOE
      heelHeight = Math.round(C.MAX_TOE + maxSafeNet)
    }
  } else if (heelHeight < toeThickness) {
    toeThickness = heelHeight
  }

  const newNetRise = Math.max(0, heelHeight - toeThickness)

  if (eng.heelOffsetTooFarBack) heelTipOffsetMm = 0
  if (eng.heelOffsetTooFarForward) heelTipOffsetMm = C.MAX_HEEL_OFFSET_MM

  const requiredSafeTip = Math.ceil(computeMinSafeTip(heelType, newNetRise, input.gender)) + 1
  if (tipWidthMm < requiredSafeTip) {
    tipWidthMm = Math.min(45, Math.max(tipWidthMm, requiredSafeTip))
  }

  if (soleType === 'rocker') {
    const slope =
      Math.asin(Math.max(-1, Math.min(1, newNetRise / Math.max(eng.lEff, 1)))) * (180 / Math.PI)
    rockerAngle = Math.max(8, Math.min(18, Math.round(slope * 0.85)))
  }

  return {
    soleType,
    heelType,
    toeThickness,
    heelHeight,
    heelTipOffsetMm,
    tipWidthMm,
    rockerAngle,
  }
}
