// src/lib/heelCalc.ts

export type SoleType = 'flat' | 'rocker'
export type HeelType = 'stiletto' | 'block' | 'kitten' | 'flared'
export type RockerType = 'forefoot' | 'heelToToe' | 'negative'

export const HEEL_CONST = {
  STEP_TO_MM: 6.67,
  FUNCTIONAL_ALLOWANCE: 8, // скорректированный декоративно-функциональный припуск по штихмассу
  L_EFF_RATIO: 0.73,       // базовый коэффициент (используется как ориентир/фоллбэк)
  MAX_TOE: 80,
  MAX_LIFT: 50,
  CRITICAL_ANGLE: 18,
  COMFORT_ANGLE: 14,
  SAFE_ANGLE: 13.8,
  CRITICAL_LOAD: 80,
  MAX_ROCKER_ANGLE: 30,
  ROCKER_MITIGATION_CAP: 0.25,
  HEEL_CENTER_RATIO: 0.15,
  MAX_HEEL_OFFSET_MM: 5,
  CRITICAL_PRONATION_DEG: 7,
  WARN_PRONATION_DEG: 4,
} as const

/** Пресеты рокера: угол + точка старта переката */
export const ROCKER_PRESETS: Record<RockerType, { angle: number; startPct: number }> = {
  forefoot:  { angle: 14, startPct: 60 }, // Метатарзалгия
  heelToToe: { angle: 16, startPct: 55 }, // Артроз
  negative:  { angle: 9,  startPct: 65 }, // Диабетическая стопа
}

export interface HeelInput {
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
  /** Угол завала стопы во фронтальной плоскости: (-) пронация / вальгус, (+) супинация / варус */
  pronationDeg?: number
}

export interface HeelEngineering {
  lastLengthMm: number
  footLengthMm: number
  lEff: number
  netRise: number
  internalSlope: number
  forefootLoad: number
  heelLoad: number
  /** Доля общей массы на медиальный луч (I плюсневая кость, M1), % */
  loadM1Pct: number
  /** Доля общей массы на латеральный луч (V плюсневая кость, M5), % */
  loadM5Pct: number
  /** Продольная координата центра давления (CoP X) от пятки, мм */
  copLongitudinalMm: number
  /** Медиально-латеральное смещение центра давления (CoP Z): (-) внутрь к M1, (+) наружу к M5, мм */
  copLateralMm: number
  /** Изгибающий момент на геленок (супинатор) при массе тела 70 кг, Н·м */
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
  // Клинико-ортопедические расширения
  metatarsalPadPosMm: number | null
  metatarsalPadHeightMm: number | null
  apexM1_Mm: number | null
  apexM5_Mm: number | null
  carbonInsertThicknessMm: number
}

export type AuditStatus = 'SUCCESS' | 'WARNING' | 'ERROR'

export interface HeelAudit {
  status: AuditStatus
  titleKey: string
  messageKey: string
}

/** Минимально безопасная ширина набойки для заданного типа каблука и чистого подъема */
export function computeMinSafeTip(heelType: HeelType, netRise: number): number {
  const positiveRise = Math.max(0, netRise)
  if (heelType === 'stiletto') return 10 + positiveRise * 0.08
  if (heelType === 'kitten')   return 12 + positiveRise * 0.06
  if (heelType === 'flared')   return 16 + positiveRise * 0.05
  return 18 + positiveRise * 0.06 // block
}

export function computeEngineering(input: HeelInput): HeelEngineering {
  const C = HEEL_CONST
  const {
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
  } = input

  // 1. Анатомическая длина стопы (Paris Point) и полная конструктивная длина колодки
  const footLengthMm = Math.round((shoeSize - 1.5) * C.STEP_TO_MM)
  const lastLengthMm = Math.round(shoeSize * C.STEP_TO_MM + C.FUNCTIONAL_ALLOWANCE)

  // 2. Динамический эффективный рычаг L_eff от центра пятки (15%) до линии пучков (rockerStartPct)
  // Коэффициент 1.18 учитывает переход от проекции переката к дуге свода колодки
  const clampedStartPct = Math.max(52, Math.min(78, rockerStartPct))
  const dynamicLeverRatio = Math.max(0.58, Math.min(0.78, (clampedStartPct / 100 - C.HEEL_CENTER_RATIO) * 1.38))
  const lEff = parseFloat((lastLengthMm * dynamicLeverRatio).toFixed(1))

  const netRise = heelHeight - toeThickness

  const asinArg = lEff > 0 ? Math.max(-1, Math.min(1, netRise / lEff)) : 0
  const internalSlope = Math.asin(asinArg) * (180 / Math.PI)

  // 3. Базовое продольное распределение нагрузки (Пятка / Плюсна)
  let loadCalc = 46 + (netRise / Math.max(lEff, 1)) * 105
  if (soleType === 'rocker') {
    const angleFactor = Math.min(1, Math.max(0, rockerAngle / C.MAX_ROCKER_ANGLE))
    // Оптимум рокера лежит в зоне 58–62% длины колодки (сразу за головками M1–M5)
    const distFromOptimum = Math.abs(clampedStartPct - 60)
    const placementEfficiency = Math.max(0.25, 1 - distFromOptimum / 25)
    const factor = Math.min(1, angleFactor * placementEfficiency)
    loadCalc *= 1 - C.ROCKER_MITIGATION_CAP * factor
  }
  const forefootLoad = Math.min(100, Math.max(0, Math.round(loadCalc)))
  const heelLoad = 100 - forefootLoad

  // 4. Медиально-латеральный баланс в 3D (распределение между лучами M1 и M5)
  // В нейтральном положении (0°) I луч берет ~56% нагрузки переднего отдела, наружные лучи (M2-M5) ~44%.
  // Пронация (< 0°) смещает вектор внутрь на M1; супинация (> 0°) уводит на латеральный край M5.
  const clampedPronation = Math.max(-15, Math.min(15, pronationDeg))
  const m1Ratio = Math.max(0.2, Math.min(0.85, 0.56 - clampedPronation * 0.024))
  const loadM1Pct = Math.round(forefootLoad * m1Ratio)
  const loadM5Pct = Math.max(0, forefootLoad - loadM1Pct)

  // 5. Геленок (супинатор): от центра пятки (15%) до точки переката минус 5 мм зазора
  const heelCenterPos = lastLengthMm * C.HEEL_CENTER_RATIO
  const ballPos = lastLengthMm * (clampedStartPct / 100)
  const shankLength = Math.round(Math.max(40, ballPos - heelCenterPos - 5))

  // Изгибающий момент на супинатор при референсной вертикальной реакции опоры 700 Н (~70 кг)
  const offsetPenaltyMm = soleType === 'flat' ? Math.max(0, -heelTipOffsetMm) * 2.2 : 0
  const effectiveMomentArmM = (shankLength * 0.52 + offsetPenaltyMm) / 1000
  const slopeLoadFactor = 0.35 + Math.max(0, Math.sin((internalSlope * Math.PI) / 180)) * 0.85
  const shankBendingMomentNm = parseFloat((700 * effectiveMomentArmM * slopeLoadFactor).toFixed(1))

  let steelThickness = 1.2
  if (netRise > 40 && netRise <= 70) steelThickness = 1.5
  else if (netRise > 70 || shankBendingMomentNm > 26) steelThickness = 2.0

  const heelOffsetTooFarBack = soleType === 'flat' && heelTipOffsetMm < -0.5
  const heelOffsetTooFarForward =
    soleType === 'flat' && heelTipOffsetMm > C.MAX_HEEL_OFFSET_MM

  // 6. Расчет риска фронтальной инверсии (подворачивания) с учетом ширины набойки и угла супинации/пронации
  const minSafeTipMm = parseFloat(computeMinSafeTip(heelType, netRise).toFixed(1))
  let inversionRisk = 0
  if (soleType === 'flat' && netRise > 0) {
    const ratio = tipWidthMm / Math.max(minSafeTipMm, 1)

    if (ratio >= 1) {
      const residual =
        heelType === 'block'  ? netRise / 10 :
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
  // Латеральный или медиальный завал увеличивает опрокидывающий момент вокруг края набойки
  const rollInstabilityBonus = Math.round(Math.abs(clampedPronation) * (netRise > 45 ? 2.6 : 1.6))
  inversionRisk = Math.min(100, inversionRisk + rollInstabilityBonus)

  // 7. Истинный угол захода / скоса задней грани каблука (Pitch / Entry Angle)
  // Отражает отклонение оси каблука от вертикали за счет смещения набойки и геометрии (рюмочка / трапеция)
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

  // 8. Диагональный апекс M1–M5 (скос анатомической суставной линии пучков 12–15°)
  const apexM1_Mm = Math.round(ballPos - 5)
  const apexM5_Mm = Math.round(apexM1_Mm - lastLengthMm * 0.045)

  // 9. Пелот Зейца (Metatarsal Pad) — привязан строго проксимальнее линии апекса M1 (на 7 мм за головками плюсневых костей)
  const requiresMetatarsalPad = forefootLoad >= C.CRITICAL_LOAD
  let metatarsalPadPosMm: number | null = null
  let metatarsalPadHeightMm: number | null = null
  if (requiresMetatarsalPad) {
    metatarsalPadPosMm = Math.round(apexM1_Mm - 7)
    metatarsalPadHeightMm = netRise > 60 ? 6 : netRise > 30 ? 5 : 4
  }

  // 10. Координаты 3D-вектора центра давления (CoP) на опорной поверхности
  const copLongitudinalMm = Math.round(
    heelCenterPos + (ballPos - heelCenterPos) * (forefootLoad / 100)
  )
  const copLateralMm = parseFloat((clampedPronation * 1.45).toFixed(1))

  // 11. Индекс жёсткости / минимальная толщина карбоновой пластины для рокерной подошвы
  const carbonInsertThicknessMm =
    soleType === 'rocker'
      ? parseFloat((1.2 + (heelHeight / 100) * 0.6).toFixed(1))
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
    highPronationStress: Math.abs(clampedPronation) >= C.CRITICAL_PRONATION_DEG,
    metatarsalPadPosMm,
    metatarsalPadHeightMm,
    apexM1_Mm,
    apexM5_Mm,
    carbonInsertThicknessMm,
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

  // 1. Критично: завал каблука назад → риск усталостного излома супинатора
  if (eng.heelOffsetTooFarBack) {
    return { status: 'ERROR', titleKey: 'heelBackTitle', messageKey: 'heelBackDesc' }
  }
  // 2. Критично: запредельный угол колодки (>= 18°) проверяется ДО пелота, чтобы не перекрываться им
  if (eng.internalSlope >= C.CRITICAL_ANGLE) {
    return { status: 'ERROR', titleKey: 'errTitle', messageKey: 'errDesc' }
  }
  // 3. Критично: высокий риск инверсии (узкая набойка или сильный варусный/вальгусный завал)
  if (eng.highInversionRisk || eng.highPronationStress) {
    return { status: 'ERROR', titleKey: 'invertTitle', messageKey: 'invertDesc' }
  }
  // 4. Критично: перегрузка переднего отдела стопы (>= 80%) → требуется пелот Зейца
  if (eng.requiresMetatarsalPad) {
    return { status: 'ERROR', titleKey: 'padTitle', messageKey: 'padDesc' }
  }
  // 5. Предупреждение: смещение набойки вперёд > 5 мм
  if (eng.heelOffsetTooFarForward) {
    return { status: 'WARNING', titleKey: 'heelFwdTitle', messageKey: 'heelFwdDesc' }
  }
  // 6. Информационное предупреждение: отрицательный дроп (платформа выше каблука)
  if (eng.internalSlope < 0) {
    return { status: 'WARNING', titleKey: 'negDropTitle', messageKey: 'negDropDesc' }
  }
  // 7. Предупреждение: умеренный завал во фронтальной плоскости (пронация/супинация >= 4°)
  if (Math.abs(eng.pronationDeg) >= C.WARN_PRONATION_DEG) {
    return { status: 'WARNING', titleKey: 'warnTitle', messageKey: 'warn1Desc' }
  }
  // 8. Предупреждение: угол выше комфортного (> 14°)
  if (eng.internalSlope > C.COMFORT_ANGLE) {
    return { status: 'WARNING', titleKey: 'warnTitle', messageKey: 'warn1Desc' }
  }
  // 9. Предупреждение: чрезмерный угол рокера при низком каблуке
  if (heelHeight < 20 && activeRocker > 16) {
    return { status: 'WARNING', titleKey: 'warnTitle', messageKey: 'warn2Desc' }
  }
  return { status: 'SUCCESS', titleKey: 'successTitle', messageKey: 'successDesc' }
}

export function defaultTipWidth(heelType: HeelType): number {
  if (heelType === 'stiletto') return 10
  if (heelType === 'kitten') return 14
  if (heelType === 'block') return 28
  return 22
}

/**
 * Гарантированно выводит конфигурацию колодки из статуса ERROR в безопасную зону (SUCCESS / комфорт)
 */
export function suggestAutoFix(input: HeelInput, eng: HeelEngineering) {
  const C = HEEL_CONST

  // Вычисляем максимально допустимый чистый подъём (netRise), при котором:
  // 1) internalSlope <= SAFE_ANGLE (13.8°)
  // 2) forefootLoad < CRITICAL_LOAD (80%) -> 46 + (netRise / lEff) * 105 <= 78 -> netRise <= lEff * 0.304
  const targetRad = (C.SAFE_ANGLE * Math.PI) / 180
  const maxRiseByAngle = eng.lEff * Math.sin(targetRad)
  const maxRiseByLoad = eng.lEff * ((C.CRITICAL_LOAD - 48) / 105)
  const maxSafeNet = Math.floor(Math.min(maxRiseByAngle, maxRiseByLoad))

  let toeThickness = input.toeThickness
  let heelHeight = input.heelHeight
  let heelTipOffsetMm = input.heelTipOffsetMm
  let tipWidthMm = input.tipWidthMm
  let rockerAngle = input.rockerAngle
  let pronationDeg = input.pronationDeg ?? 0

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

  // Выравниваем смещение каблука
  if (eng.heelOffsetTooFarBack) heelTipOffsetMm = 0
  if (eng.heelOffsetTooFarForward) heelTipOffsetMm = C.MAX_HEEL_OFFSET_MM

  // Сбрасываем критический фронтальный завал (пронацию/супинацию) в 0°
  if (Math.abs(pronationDeg) >= C.WARN_PRONATION_DEG) {
    pronationDeg = 0
  }

  // Вычисляем точную безопасную ширину набойки под новый чистый подъём + 1 мм запаса
  const requiredSafeTip = Math.ceil(computeMinSafeTip(input.heelType, newNetRise)) + 1
  if (tipWidthMm < requiredSafeTip) {
    tipWidthMm = Math.min(45, Math.max(tipWidthMm, requiredSafeTip))
  }

  if (input.soleType === 'rocker') {
    const slope =
      Math.asin(Math.max(-1, Math.min(1, newNetRise / Math.max(eng.lEff, 1)))) * (180 / Math.PI)
    rockerAngle = Math.max(8, Math.min(18, Math.round(slope * 0.85)))
  }

  return {
    toeThickness,
    heelHeight,
    heelTipOffsetMm,
    tipWidthMm,
    rockerAngle,
    pronationDeg,
  }
}
