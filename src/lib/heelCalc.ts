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
  SAFE_ANGLE: 11.5,
  CRITICAL_LOAD: 75,
  CRITICAL_KPA: 240, // порог перегрузки тканей под головками плюсневых костей, кПа
  MAX_ROCKER_ANGLE: 28,
  ROCKER_MITIGATION_CAP: 0.28,
  HEEL_CENTER_RATIO: 0.15,
  MAX_HEEL_OFFSET_MM: 5,
  CRITICAL_PRONATION_DEG: 6,
  WARN_PRONATION_DEG: 3,
} as const

/** Клинические пресеты рокерной подошвы: угол переката + линия старта (апекс рокера) */
export const ROCKER_PRESETS: Record<RockerType, { angle: number; startPct: number }> = {
  forefoot:  { angle: 14, startPct: 60 }, // Метатарзалгия / разгрузка головок M1-M5
  heelToToe: { angle: 16, startPct: 55 }, // Артроз голеностопа / Hallux Rigidus
  negative:  { angle: 9,  startPct: 65 }, // Диабетическая стопа / разгрузка пятки
}

export interface HeelInput {
  gender: Gender
  shoeSize: number
  /** Вес пациента / клиента, кг (40–150 кг) */
  weightKg: number
  heelHeight: number
  toeThickness: number
  soleType: SoleType
  rockerAngle: number
  rockerStartPct: number
  heelTipOffsetMm: number
  rockerType?: RockerType
  /**
   * Угол фронтального завала пятки и среднего отдела:
   * Отрицательный (-1° .. -12°) = Гиперпронация / Вальгус (завал внутрь)
   * Положительный (+1° .. +12°) = Гиперсупинация / Варус (завал наружу)
   */
  pronationDeg: number
  /** Обхват стопы в пучках (Ball Girth O_п), мм */
  ballGirthMm: number
  /** Прямой обхват взъема (Direct Instep Girth O_в), мм */
  instepGirthMm: number
  /** Косой обхват через пятку и сгиб голеностопа (Oblique Girth O_к), мм */
  obliqueGirthMm: number
}

export interface MasterPrescription {
  /** Полнота колодки по ГОСТ / WMS */
  widthCode: string
  /** Налепка (+) или утяжка (-) в пучках колодки, мм */
  ballBuildUpMm: number
  /** Налепка (+) или вкладыш (-) на гребень прямого взъема, мм */
  instepBuildUpMm: number
  /** Запас/дефицит по косому обхвату пятка-взъем, мм */
  obliqueEntryDeltaMm: number
  /** Нужна ли шнуровка/молния (стопа не пройдет в глухое голенище) */
  requiresZipOrLaceWarning: boolean
  /** Тип ортопедической стельки: нейтральная / супинатор (антивальгус) / пронатор (антиварус) */
  insoleType: 'neutral' | 'supinator' | 'pronator'
  /** Высота выкладки продольного свода стельки, мм */
  archSupportHeightMm: number
  /** Медиальный (внутренний) клин под пятку (косок Супфикс), мм */
  medialHeelWedgeMm: number
  /** Латеральный (наружный) клин под пятку и пучок M5, мм */
  lateralWedgeMm: number
  /** Рекомендуемая твердость базы стельки и пелота по Шору А (зависит от веса кг) */
  shoreA: string
  /** Рекомендован ли каблук Томаса по биомеханике */
  recommendThomasHeel: boolean
  /** Ориентация выступа Томаса: 'none' | 'medial' (прямой, изнутри) | 'lateral' (обратный, снаружи) */
  thomasHeelType: 'none' | 'medial' | 'lateral'
  /** Длина продольного удлинения груди каблука Томаса вперед под свод, мм */
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
  /** Пиковое плантарное давление под передним отделом с учетом веса, кПа */
  peakForefootPressureKpa: number
  /** Пиковое давление под пяткой, кПа */
  peakHeelPressureKpa: number
  copLongitudinalMm: number
  copLateralMm: number
  /** Изгибающий момент на стальной геленок при реальном весе тела, Н·м */
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

/** Эталонные обмеры стопы стандартной полноты F(6) по ГОСТ / WMS */
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

  // 1. Анатомическая длина стопы и полная длина следа колодки
  const footLengthMm = Math.round((shoeSize - 1.5) * C.STEP_TO_MM)
  const allowance = gender === 'male' ? 10 : C.FUNCTIONAL_ALLOWANCE
  const lastLengthMm = Math.round(shoeSize * C.STEP_TO_MM + allowance)

  // 2. Полнота колодки и толщина налепок по индивидуальным меркам клиента
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

  // 3. Подбор твердости ортопедической стельки по Шору А в зависимости от веса пациента
  let shoreA = '40–45 Shore A (Средняя EVA)'
  if (clampedWeight < 60) {
    shoreA = '30–35 Shore A (Мягкая EVA/PPT)'
  } else if (clampedWeight > 90 && clampedWeight <= 110) {
    shoreA = '50–55 Shore A (Усиленная EVA + каркас)'
  } else if (clampedWeight > 110) {
    shoreA = '60–65 Shore A (Жесткий термопласт/карбон)'
  }

  // 4. Ортопедический расчет стельки и каблука Томаса по углу пронации/супинации и весу
  const clampedPronation = Math.max(-15, Math.min(15, pronationDeg))
  const weightScale = 0.85 + (clampedWeight - 70) / 220 // тяжелее пациент -> мощнее клин и удлинение Томаса

  let insoleType: 'neutral' | 'supinator' | 'pronator' = 'neutral'
  let archSupportHeightMm = 9
  let medialHeelWedgeMm = 0
  let lateralWedgeMm = 0
  let recommendThomasHeel = false
  let thomasHeelType: 'none' | 'medial' | 'lateral' = 'none'
  let thomasExtensionMm = 0

  if (clampedPronation <= -2) {
    // Гиперпронация (вальгус, завал стопы внутрь)
    const valgusAbs = Math.abs(clampedPronation)
    insoleType = 'supinator'
    archSupportHeightMm = Math.min(18, Math.round(10 + valgusAbs * 0.7))
    medialHeelWedgeMm = Math.min(8, Math.max(2, Math.round(valgusAbs * 0.55 * weightScale)))
    recommendThomasHeel = valgusAbs >= 3 || (valgusAbs >= 2 && clampedWeight >= 85)
    if (soleType === 'thomas' || recommendThomasHeel) {
      thomasHeelType = 'medial'
      thomasExtensionMm = Math.round((14 + Math.min(12, valgusAbs * 1.15)) * Math.min(1.2, weightScale))
    }
  } else if (clampedPronation >= 2) {
    // Гиперсупинация (варус, завал стопы наружу)
    const varusAbs = Math.abs(clampedPronation)
    insoleType = 'pronator'
    archSupportHeightMm = Math.max(0, Math.round(4 - varusAbs * 0.4))
    lateralWedgeMm = Math.min(8, Math.max(2, Math.round(varusAbs * 0.55 * weightScale)))
    recommendThomasHeel = varusAbs >= 3 || (varusAbs >= 2 && clampedWeight >= 85)
    if (soleType === 'thomas' || recommendThomasHeel) {
      thomasHeelType = 'lateral'
      thomasExtensionMm = Math.round((12 + Math.min(10, varusAbs * 1.05)) * Math.min(1.2, weightScale))
    }
  } else if (soleType === 'thomas') {
    thomasHeelType = 'medial'
    thomasExtensionMm = Math.round(16 * Math.min(1.15, weightScale))
  }

  // 5. Динамический рычаг L_eff и продольный угол колодки
  const clampedStartPct = Math.max(52, Math.min(78, rockerStartPct))
  const dynamicLeverRatio = Math.max(
    0.58,
    Math.min(0.78, (clampedStartPct / 100 - C.HEEL_CENTER_RATIO) * 1.38)
  )
  const lEff = parseFloat((lastLengthMm * dynamicLeverRatio).toFixed(1))

  const netRise = heelHeight - toeThickness
  const asinArg = lEff > 0 ? Math.max(-1, Math.min(1, netRise / lEff)) : 0
  const internalSlope = Math.asin(asinArg) * (180 / Math.PI)

  // 6. Распределение нагрузки между пяткой и передним отделом (плюсной)
  let loadCalc = 46 + (netRise / Math.max(lEff, 1)) * 105
  if (soleType === 'rocker') {
    const angleFactor = Math.min(1, Math.max(0, rockerAngle / C.MAX_ROCKER_ANGLE))
    const distFromOptimum = Math.abs(clampedStartPct - 60)
    const placementEfficiency = Math.max(0.25, 1 - distFromOptimum / 25)
    const factor = Math.min(1, angleFactor * placementEfficiency)
    loadCalc *= 1 - C.ROCKER_MITIGATION_CAP * factor
  } else if (soleType === 'thomas') {
    loadCalc *= 0.93 // каблук Томаса поддерживает средний отдел и разгружает пучки
  }
  const forefootLoad = Math.min(100, Math.max(0, Math.round(loadCalc)))
  const heelLoad = 100 - forefootLoad

  // 7. Медиально-латеральное распределение нагрузки по лучам M1 и M5
  const thomasCompensation = soleType === 'thomas' ? clampedPronation * 0.5 : 0
  const effectiveRoll = clampedPronation - thomasCompensation
  const m1Ratio = Math.max(0.2, Math.min(0.85, 0.56 - effectiveRoll * 0.024))
  const loadM1Pct = Math.round(forefootLoad * m1Ratio)
  const loadM5Pct = Math.max(0, forefootLoad - loadM1Pct)

  // 8. Расчет реального плантарного давления в кПа с учетом веса тела и площади опоры
  // Эффективная площадь контакта пучков и пятки масштабируется от длины стопы и полноты
  const contactAreaScale = (footLengthMm / 245) * (1 + ballBuildUpMm * 0.008)
  const foreAreaCm2 = Math.max(28, 44 * contactAreaScale * (soleType === 'rocker' ? 1.18 : 1.0))
  const heelAreaCm2 = Math.max(20, 31 * contactAreaScale * (soleType === 'thomas' ? 1.25 : 1.0))
  // В фазе одиночной опоры шага динамическая перегрузка составляет 1.18 от веса тела
  const totalForceN = clampedWeight * 9.81 * 1.18
  const foreForceN = totalForceN * (forefootLoad / 100)
  const heelForceN = totalForceN * (heelLoad / 100)
  // Коэффициент концентрации пикового давления под головками M1/M5 (~1.85)
  const rollConcentration = 1 + Math.abs(effectiveRoll) * 0.035
  const peakForefootPressureKpa = Math.round((foreForceN / foreAreaCm2) * 10 * 1.85 * rollConcentration)
  const peakHeelPressureKpa = Math.round((heelForceN / heelAreaCm2) * 10 * 1.65)

  // 9. Длина геленка и изгибающий момент от реального веса пациента
  const heelCenterPos = lastLengthMm * C.HEEL_CENTER_RATIO
  const ballPos = lastLengthMm * (clampedStartPct / 100)
  const shankLength = Math.round(Math.max(40, ballPos - heelCenterPos - 5))

  const thomasSupportReduction = soleType === 'thomas' ? thomasExtensionMm * 0.7 : 0
  const offsetPenaltyMm = soleType === 'flat' ? Math.max(0, -heelTipOffsetMm) * 2.2 : 0
  const effectiveMomentArmM = Math.max(
    0.018,
    (shankLength * 0.52 - thomasSupportReduction + offsetPenaltyMm) / 1000
  )
  const slopeLoadFactor = 0.35 + Math.max(0, Math.sin((internalSlope * Math.PI) / 180)) * 0.85
  const shankBendingMomentNm = parseFloat(
    (totalForceN * effectiveMomentArmM * slopeLoadFactor).toFixed(1)
  )

  let steelThickness = clampedWeight >= 85 || gender === 'male' ? 1.5 : 1.2
  if (netRise > 35 || shankBendingMomentNm > 20) steelThickness = Math.max(steelThickness, 1.5)
  if (netRise > 55 || shankBendingMomentNm > 28 || clampedWeight >= 105) steelThickness = 2.0

  const heelOffsetTooFarBack = soleType === 'flat' && heelTipOffsetMm < -0.5
  const heelOffsetTooFarForward =
    soleType === 'flat' && heelTipOffsetMm > C.MAX_HEEL_OFFSET_MM

  // 10. Риск латеральной/медиальной нестабильности (инверсии голеностопа)
  const baseStabilityFactor = soleType === 'thomas' ? 0.55 : soleType === 'rocker' ? 0.65 : 1.0
  const heightRisk = Math.max(0, netRise) * 0.55
  const rollRisk = Math.abs(effectiveRoll) * (2.8 + (clampedWeight / 70) * 1.2)
  const inversionRisk = Math.min(100, Math.round((heightRisk + rollRisk) * baseStabilityFactor))

  // 11. Апексы пучков M1–M5 и Пелот Зейца (с учетом пикового давления в кПа!)
  const apexM1_Mm = Math.round(ballPos - 5)
  const apexM5_Mm = Math.round(apexM1_Mm - lastLengthMm * 0.045)

  const requiresMetatarsalPad =
    forefootLoad >= C.CRITICAL_LOAD ||
    peakForefootPressureKpa >= C.CRITICAL_KPA ||
    ballBuildUpMm >= 6

  let metatarsalPadPosMm: number | null = null
  let metatarsalPadHeightMm: number | null = null
  if (requiresMetatarsalPad) {
    metatarsalPadPosMm = Math.round(apexM1_Mm - 7)
    metatarsalPadHeightMm =
      peakForefootPressureKpa >= 280 || ballBuildUpMm >= 10 ? 6 : netRise > 25 ? 5 : 4
  }

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
 * Автоподбор ортопедической конструкции под антропометрию и вес клиента
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
  let rockerAngle = input.rockerAngle
  let soleType: SoleType = input.soleType

  // 1. Если есть выраженная пронация или супинация — переводим на Подошву Томаса с ортопедическим перепадом 18–22 мм
  if (eng.rx.recommendThomasHeel && soleType === 'flat') {
    soleType = 'thomas'
    heelHeight = input.gender === 'male' ? 28 : 30
    toeThickness = 10
  }

  // 2. Если пиковое давление в пучках превышает критический порог (240 кПа) и нет завала — включаем разгрузочный Рокер
  if (
    !eng.rx.recommendThomasHeel &&
    eng.peakForefootPressureKpa >= C.CRITICAL_KPA &&
    soleType === 'flat'
  ) {
    soleType = 'rocker'
    heelHeight = Math.min(heelHeight, 32)
    toeThickness = Math.max(toeThickness, 14)
    rockerAngle = 14
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

  if (eng.heelOffsetTooFarBack) heelTipOffsetMm = 0
  if (eng.heelOffsetTooFarForward) heelTipOffsetMm = C.MAX_HEEL_OFFSET_MM

  if (soleType === 'rocker') {
    const newNetRise = Math.max(0, heelHeight - toeThickness)
    const slope =
      Math.asin(Math.max(-1, Math.min(1, newNetRise / Math.max(eng.lEff, 1)))) * (180 / Math.PI)
    rockerAngle = Math.max(10, Math.min(18, Math.round(slope * 0.9 + 6)))
  }

  return {
    soleType,
    toeThickness,
    heelHeight,
    heelTipOffsetMm,
    rockerAngle,
  }
}
