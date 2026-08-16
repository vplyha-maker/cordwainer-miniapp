// src/lib/heelCalc.ts

export type SoleType = 'flat' | 'rocker'
export type HeelType = 'stiletto' | 'block' | 'kitten' | 'flared'

export const HEEL_CONST = {
  STEP_TO_MM: 6.67,
  FUNCTIONAL_ALLOWANCE: 12,
  L_EFF_RATIO: 0.73,
  SHANK_PROPORTION: 0.48,
  SHANK_OFFSET: 15,
  MAX_TOE: 80,
  MAX_LIFT: 50,
  CRITICAL_ANGLE: 18,
  COMFORT_ANGLE: 14,
  SAFE_ANGLE: 14.5,
  CRITICAL_LOAD: 80,
  MAX_ROCKER_ANGLE: 30,
  ROCKER_MITIGATION_CAP: 0.25,
  HEEL_CENTER_RATIO: 0.15,
  MAX_HEEL_OFFSET_MM: 5,
} as const

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
}

export interface HeelEngineering {
  lastLengthMm: number
  lEff: number
  netRise: number
  internalSlope: number
  forefootLoad: number
  heelLoad: number
  shankLength: number
  steelThickness: number
  heelOffsetTooFarBack: boolean
  heelOffsetTooFarForward: boolean
  requiresMetatarsalPad: boolean
  inversionRisk: number
  highInversionRisk: boolean
  entryAngleDeg: number
}

export type AuditStatus = 'SUCCESS' | 'WARNING' | 'ERROR'

export interface HeelAudit {
  status: AuditStatus
  titleKey: string
  messageKey: string
}

export function computeEngineering(input: HeelInput): HeelEngineering {
  const C = HEEL_CONST
  const {
    shoeSize, heelHeight, toeThickness, soleType, heelType,
    rockerAngle, rockerStartPct, heelTipOffsetMm, tipWidthMm,
  } = input

  const lastLengthMm = shoeSize * C.STEP_TO_MM + C.FUNCTIONAL_ALLOWANCE
  const lEff = lastLengthMm * C.L_EFF_RATIO
  const netRise = heelHeight - toeThickness

  const asinArg = lEff > 0 ? Math.max(-1, Math.min(1, netRise / lEff)) : 0
  const internalSlope = Math.asin(asinArg) * (180 / Math.PI)

  let loadCalc = 50 + (netRise / Math.max(lEff, 1)) * 100
  if (soleType === 'rocker') {
    const factor =
      Math.min(1, rockerAngle / C.MAX_ROCKER_ANGLE) *
      (1 - (rockerStartPct - 55) / 40)
    loadCalc *= 1 - C.ROCKER_MITIGATION_CAP * Math.max(0, factor)
  }
  const forefootLoad = Math.min(100, Math.max(0, Math.round(loadCalc)))
  const heelLoad = 100 - forefootLoad

  const shankLength = Math.round(lastLengthMm * C.SHANK_PROPORTION + C.SHANK_OFFSET)
  let steelThickness = 1.2
  if (netRise > 40 && netRise <= 70) steelThickness = 1.5
  else if (netRise > 70) steelThickness = 2.0

  const heelOffsetTooFarBack = soleType === 'flat' && heelTipOffsetMm < -0.5
  const heelOffsetTooFarForward = soleType === 'flat' && heelTipOffsetMm > C.MAX_HEEL_OFFSET_MM

  let inversionRisk = 0
  if (soleType === 'flat' && netRise > 0) {
    const minSafe =
      heelType === 'stiletto' ? 10 + netRise * 0.08 :
      heelType === 'kitten' ? 12 + netRise * 0.06 :
      heelType === 'flared' ? 16 + netRise * 0.05 :
      20 + netRise * 0.04
    const ratio = tipWidthMm / Math.max(minSafe, 1)
    inversionRisk = Math.min(100, Math.max(0, Math.round((1 - ratio) * 100 + (netRise > 70 ? 15 : 0))))
    if (ratio >= 1) inversionRisk = Math.min(inversionRisk, 25)
  }

  let entryAngleDeg = 0
  if (soleType === 'flat' && (heelType === 'kitten' || heelType === 'flared')) {
    entryAngleDeg = parseFloat(
      (Math.atan2(netRise, Math.max(tipWidthMm / 2, 1)) * (180 / Math.PI)).toFixed(1)
    )
  }

  return {
    lastLengthMm,
    lEff,
    netRise,
    internalSlope,
    forefootLoad,
    heelLoad,
    shankLength,
    steelThickness,
    heelOffsetTooFarBack,
    heelOffsetTooFarForward,
    requiresMetatarsalPad: forefootLoad > C.CRITICAL_LOAD,
    inversionRisk,
    highInversionRisk: inversionRisk >= 55,
    entryAngleDeg,
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
  if (eng.internalSlope < 0) {
    return { status: 'WARNING', titleKey: 'negDropTitle', messageKey: 'negDropDesc' }
  }
  if (eng.requiresMetatarsalPad) {
    return { status: 'ERROR', titleKey: 'padTitle', messageKey: 'padDesc' }
  }
  if (eng.highInversionRisk) {
    return { status: 'ERROR', titleKey: 'invertTitle', messageKey: 'invertDesc' }
  }
  if (eng.internalSlope >= C.CRITICAL_ANGLE || eng.forefootLoad >= C.CRITICAL_LOAD) {
    return { status: 'ERROR', titleKey: 'errTitle', messageKey: 'errDesc' }
  }
  if (eng.internalSlope > C.COMFORT_ANGLE) {
    return { status: 'WARNING', titleKey: 'warnTitle', messageKey: 'warn1Desc' }
  }
  if (heelHeight < 20 && activeRocker > 16) {
    return { status: 'WARNING', titleKey: 'warnTitle', messageKey: 'warn2Desc' }
  }
  return { status: 'SUCCESS', titleKey: 'successTitle', messageKey: 'successDesc' }
}

export function defaultTipWidth(heelType: HeelType): number {
  if (heelType === 'stiletto') return 8
  if (heelType === 'kitten') return 14
  if (heelType === 'block') return 28
  return 22
}

export function suggestAutoFix(input: HeelInput, eng: HeelEngineering) {
  const C = HEEL_CONST
  const targetRad = (C.SAFE_ANGLE * Math.PI) / 180
  const maxSafeNet = eng.lEff * Math.sin(targetRad)
  const neededPlatform = Math.max(0, Math.round(input.heelHeight - maxSafeNet))

  let toeThickness = input.toeThickness
  let heelHeight = input.heelHeight
  let heelTipOffsetMm = input.heelTipOffsetMm
  let tipWidthMm = input.tipWidthMm
  let rockerAngle = input.rockerAngle

  if (neededPlatform <= C.MAX_TOE) {
    toeThickness = neededPlatform
  } else {
    toeThickness = C.MAX_TOE
    heelHeight = Math.round(C.MAX_TOE + maxSafeNet)
  }

  if (eng.heelOffsetTooFarBack) heelTipOffsetMm = 0
  if (eng.highInversionRisk) {
    tipWidthMm = Math.max(tipWidthMm, defaultTipWidth(input.heelType) + 4)
  }

  if (input.soleType === 'rocker') {
    const newRise = heelHeight - toeThickness
    const slope = Math.asin(Math.max(-1, Math.min(1, newRise / eng.lEff))) * (180 / Math.PI)
    rockerAngle = Math.max(5, Math.min(20, Math.round(slope * 0.8)))
  }

  return { toeThickness, heelHeight, heelTipOffsetMm, tipWidthMm, rockerAngle }
}
