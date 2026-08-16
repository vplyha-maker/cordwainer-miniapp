// src/lib/heelCalc.ts

export type SoleType = 'standard' | 'rocker'
export type HeelShape = 'stiletto' | 'block' | 'kitten' | 'flared'

export interface HeelCalculationParams {
  shoeSize: number
  /** Высота каблука, мм */
  heelHeight: number
  /** Толщина платформы / toe, мм */
  tToe: number
  /** Угол рокера, ° (только для soleType = 'rocker') */
  rockerAngle?: number
  /** Начало переката, % длины (только rocker) */
  rockerStartPct?: number
  soleType?: SoleType
  heelShape?: HeelShape
  /**
   * Смещение центра набойки от Heel Center Line, мм.
   * +: вперёд, −: назад (завал).
   */
  heelTipOffsetMm?: number
}

export interface HeelCalculationResult {
  lastLength: number
  effLength: number
  /** Чистый перепад H − T, мм */
  netHeelHeight: number
  totalHeelHeight: number
  internalSlopeDeg: number
  /** % нагрузки на плюсну (метатарзальную зону) */
  forefootLoadPct: number
  isMedicalWarning: boolean
  /** Жёсткий алерт: > 80% → обязательный пелот Зейца */
  requiresMetatarsalPad: boolean
  medicalMessage: string | null
  /** Длина геленка, мм */
  shankLength: number
  /** Рекомендуемая толщина супинатора (сталь 65Г), мм */
  steelThickness: number
  /** Визуальные маркеры для SVG */
  heelCenterLineXRatio: number
  maxAllowedHeelOffsetMm: number
  heelOffsetStatus: 'ok' | 'too_far_back' | 'too_far_forward'
  heelOffsetMessage: string | null
}

const STEP_TO_MM = 6.67
const FUNCTIONAL_ALLOWANCE = 12
const L_EFF_RATIO = 0.73
const HEEL_CENTER_RATIO = 0.15
const MAX_HEEL_OFFSET_MM = 5
const CRITICAL_FOREFOOT = 80
const COMFORT_SLOPE_DEG = 14
const ROCKER_MITIGATION_CAP = 0.25
const MAX_ROCKER_ANGLE = 30
const SHANK_PROPORTION = 0.48
const SHANK_OFFSET = 15

/**
 * Основной калькулятор геометрии + аудит нагрузки на пучки.
 *
 * Standard:  P = 50 + ((H − T) / L_eff) × 100
 * Rocker:    P_rocker = P × (1 − 0.25 × rockerFactor)
 *
 * При P > 80% — обязательный метатарзальный пелот (капли Зейца).
 */
export function calculateHeelGeometry(
  params: HeelCalculationParams
): HeelCalculationResult {
  const {
    shoeSize,
    heelHeight,
    tToe,
    rockerAngle = 0,
    rockerStartPct = 65,
    soleType = 'standard',
    heelTipOffsetMm = 0,
  } = params

  // 1. Длина следа (Paris Point)
  const lastLengthMm = shoeSize * STEP_TO_MM + FUNCTIONAL_ALLOWANCE

  // 2. Эффективная длина пятка → пучки
  const lEff = lastLengthMm * L_EFF_RATIO

  // 3. Чистый перепад
  const netRise = heelHeight - tToe

  // 4. Угол наклона колодки
  const asinArg = lEff > 0 ? Math.max(-1, Math.min(1, netRise / lEff)) : 0
  const internalSlopeDeg = (Math.asin(asinArg) * 180) / Math.PI

  // 5. Нагрузка на плюсну (главная формула аудита шпилек)
  // P_forefoot = 50 + ((H_heel - T_toe) / L_eff) * 100
  let forefootLoad = 50 + (netRise / Math.max(lEff, 1)) * 100

  // 6. Mitigation только для рокера
  if (soleType === 'rocker') {
    const rockerEffectFactor =
      Math.min(1, rockerAngle / MAX_ROCKER_ANGLE) *
      (1 - (rockerStartPct - 55) / 40)
    forefootLoad *= 1 - ROCKER_MITIGATION_CAP * Math.max(0, rockerEffectFactor)
  }

  const forefootLoadPct = Math.min(100, Math.max(0, Math.round(forefootLoad)))

  // 7. Геленок и толщина стали
  const shankLength = Math.round(lastLengthMm * SHANK_PROPORTION + SHANK_OFFSET)
  let steelThickness = 1.2
  if (netRise > 40 && netRise <= 70) steelThickness = 1.5
  else if (netRise > 70) steelThickness = 2.0

  // 8. Ортопедические алерты
  const requiresMetatarsalPad = forefootLoadPct > CRITICAL_FOREFOOT
  const isMedicalWarning =
    requiresMetatarsalPad ||
    Math.abs(internalSlopeDeg) > COMFORT_SLOPE_DEG ||
    netRise > 40

  let medicalMessage: string | null = null
  if (requiresMetatarsalPad) {
    medicalMessage =
      'Требуется обязательная установка встроенного метатарзального пелота (капли Зейца) в стельку для разгрузки нервных окончаний.'
  } else if (netRise < 0) {
    medicalMessage =
      'Обратный уклон: платформа выше каблука. Нарушение биомеханики.'
  } else if (internalSlopeDeg > COMFORT_SLOPE_DEG || netRise > 40) {
    medicalMessage =
      'Высокий подъём / критический наклон. Рекомендуется увеличить платформу или снизить каблук.'
  }

  // 9. Heel Center Line (15% длины стельки)
  // Набойка должна лежать под вертикалью (±5 мм вперёд допустимо)
  let heelOffsetStatus: HeelCalculationResult['heelOffsetStatus'] = 'ok'
  let heelOffsetMessage: string | null = null

  if (heelTipOffsetMm < -0.5) {
    heelOffsetStatus = 'too_far_back'
    heelOffsetMessage =
      'Ошибка: Каблук завален назад, произойдет перелом супинатора под весом пациента.'
  } else if (heelTipOffsetMm > MAX_HEEL_OFFSET_MM) {
    heelOffsetStatus = 'too_far_forward'
    heelOffsetMessage = `Смещение набойки вперёд > ${MAX_HEEL_OFFSET_MM} мм. Снижена стабильность фазы наступания.`
  }

  return {
    lastLength: Math.round(lastLengthMm),
    effLength: Math.round(lEff),
    netHeelHeight: parseFloat(netRise.toFixed(1)),
    totalHeelHeight: parseFloat(heelHeight.toFixed(1)),
    internalSlopeDeg: parseFloat(internalSlopeDeg.toFixed(1)),
    forefootLoadPct,
    isMedicalWarning,
    requiresMetatarsalPad,
    medicalMessage,
    shankLength,
    steelThickness,
    heelCenterLineXRatio: HEEL_CENTER_RATIO,
    maxAllowedHeelOffsetMm: MAX_HEEL_OFFSET_MM,
    heelOffsetStatus,
    heelOffsetMessage,
  }
}

/**
 * Хелпер только для % нагрузки на плюсну.
 * Можно вызывать отдельно в UI без полного расчёта.
 */
export function calcForefootLoadPct(
  heelHeight: number,
  tToe: number,
  lEff: number,
  soleType: SoleType = 'standard',
  rockerAngle = 0,
  rockerStartPct = 65
): number {
  let p = 50 + ((heelHeight - tToe) / Math.max(lEff, 1)) * 100

  if (soleType === 'rocker') {
    const factor =
      Math.min(1, rockerAngle / MAX_ROCKER_ANGLE) *
      (1 - (rockerStartPct - 55) / 40)
    p *= 1 - ROCKER_MITIGATION_CAP * Math.max(0, factor)
  }

  return Math.min(100, Math.max(0, Math.round(p)))
}

/** Константы, которые UI может показать в спецификации */
export const HEEL_CALC_CONSTANTS = {
  STEP_TO_MM,
  FUNCTIONAL_ALLOWANCE,
  L_EFF_RATIO,
  HEEL_CENTER_RATIO,
  MAX_HEEL_OFFSET_MM,
  CRITICAL_FOREFOOT,
  COMFORT_SLOPE_DEG,
  ROCKER_MITIGATION_CAP,
  MAX_ROCKER_ANGLE,
} as const
