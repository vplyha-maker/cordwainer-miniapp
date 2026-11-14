// src/lib/heelGeometry.ts
import { HEEL_CONST, type SoleType, type HeelType, type Gender } from './heelCalc'

export interface GeometryInput {
  gender?: Gender
  shoeSize: number
  heelHeight: number
  toeThickness: number
  soleType: SoleType
  heelType: HeelType
  rockerAngle: number
  rockerStartPct: number
  heelTipOffsetMm: number
  tipWidthMm: number
  shankLength: number
  thomasExtensionMm?: number
  instepBuildUpMm?: number
}

export interface HeelGeometry {
  svgWidth: number
  svgHeight: number
  solePath: string
  heelPath: string
  thomasExtensionPath: string
  lastUpperPath: string
  instepBuildUpPath: string
  shankCurve: string
  pelottePath: string
  carbonPath: string
  xHeel: number
  xBall: number
  xToe: number
  xHeelCenter: number
  xTipCenter: number
  xApexM1: number
  xApexM5: number
  xPelotte: number
  xInstep: number
  yGround: number
  yFootHeel: number
  yFootBall: number
  yFootPelotte: number
  yInstepTop: number
  scale: number
}

function evalCubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const mt = 1 - t
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  )
}

export function buildHeelGeometry(input: GeometryInput): HeelGeometry {
  const C = HEEL_CONST
  const {
    gender = 'female',
    shoeSize,
    heelHeight,
    toeThickness,
    soleType,
    heelType,
    rockerAngle,
    rockerStartPct,
    heelTipOffsetMm,
    tipWidthMm,
    shankLength,
    thomasExtensionMm = 16,
    instepBuildUpMm = 0,
  } = input

  const allowance = gender === 'male' ? 10 : C.FUNCTIONAL_ALLOWANCE
  const totalLength = shoeSize * C.STEP_TO_MM + allowance
  const scale = 0.76
  const padding = 36
  const svgWidth = totalLength * scale + padding * 2
  const svgHeight = 158

  const xHeel = padding
  const xBall = padding + totalLength * (rockerStartPct / 100) * scale
  const xToe = padding + totalLength * scale
  const xHeelCenter = padding + totalLength * C.HEEL_CENTER_RATIO * scale
  const offsetPx = soleType === 'flat' ? heelTipOffsetMm * scale : 0
  const xTipCenter = xHeelCenter + offsetPx

  const yGround = 130
  const hScaled = heelHeight * scale
  const tScaled = toeThickness * scale
  const yFootHeel = yGround - hScaled
  const yFootBall = yGround - tScaled

  const activeRocker = soleType === 'rocker' ? rockerAngle : 0
  const rockerZone = Math.max(1, xToe - xBall)
  const toeLift = Math.min(
    C.MAX_LIFT * scale,
    rockerZone * Math.min(1, Math.max(0, Math.sin((activeRocker * Math.PI) / 180)))
  )
  const yFootToe = yFootBall - toeLift

  const archStartX = xHeelCenter
  const archSpanX = Math.max(1, xBall - archStartX)
  const c1x = archStartX + archSpanX * 0.35
  const c2x = archStartX + archSpanX * 0.7
  const c1y = yFootHeel * 0.65 + yFootBall * 0.35
  const c2y = yFootHeel * 0.25 + yFootBall * 0.75

  const topPath = `
    M ${xHeel - 4} ${yFootHeel - 3}
    L ${xHeelCenter - 6} ${yFootHeel}
    C ${c1x} ${c1y}, ${c2x} ${c2y}, ${xBall} ${yFootBall}
    Q ${xBall + rockerZone * 0.45} ${yFootBall}, ${xToe} ${yFootToe}
  `

  const yHeelSeat = yFootHeel + Math.min(hScaled * 0.12, 7 * scale)
  const yBottomToe = soleType === 'rocker' ? yFootToe + Math.max(tScaled, 2) : yGround - 1

  const bottomPath = `
    L ${xToe} ${yBottomToe}
    Q ${xBall + rockerZone * 0.45} ${yGround}, ${xBall} ${yGround}
    C ${c2x} ${yGround}, ${c1x} ${yHeelSeat + 2}, ${xHeelCenter - 4} ${yHeelSeat + 2}
    L ${xHeel - 2} ${yHeelSeat}
    Z
  `
  const solePath = topPath + bottomPath

  // Контур силуэта самой колодки (гребень прямого взъема + мысок + пятка) для наглядности обхватов
  const xInstep = padding + totalLength * 0.52 * scale
  const yInstepFoot = evalCubicBezier(0.55, yFootHeel, c1y, c2y, yFootBall)
  const instepHeightPx = (gender === 'male' ? 62 : 56) * scale
  const yInstepTop = yInstepFoot - instepHeightPx

  const lastUpperPath = `
    M ${xHeel - 2} ${yFootHeel - 3}
    Q ${xHeel - 5} ${yFootHeel - 34 * scale}, ${xHeel + 8} ${yFootHeel - 52 * scale}
    L ${xInstep - 22} ${yInstepTop - 8}
    Q ${xInstep + 6} ${yInstepTop + 4}, ${xBall + 4} ${yFootBall - 24 * scale}
    Q ${xToe - 8} ${yFootToe - 15 * scale}, ${xToe} ${yFootToe - 3}
  `

  // Контур налепки на гребень взъема (если instepBuildUpMm > 0)
  const buildUpPx = Math.max(0, instepBuildUpMm) * scale * 1.4
  const instepBuildUpPath =
    buildUpPx > 0.5
      ? `
    M ${xInstep - 18} ${yInstepTop - 5}
    Q ${xInstep} ${yInstepTop - 5 - buildUpPx * 1.8}, ${xBall} ${yFootBall - 24 * scale}
    Q ${xInstep} ${yInstepTop + 1}, ${xInstep - 18} ${yInstepTop - 5}
    Z
  `
      : ''

  const tipW = Math.max(2, tipWidthMm * scale)
  const heelPath = buildHeelPath({
    soleType,
    heelType,
    xHeel,
    xBall,
    xTipCenter,
    yHeelSeat,
    yGround,
    hScaled,
    tipW,
    c1x,
    c2x,
  })

  // Выступ (грудь) каблука Томаса вперед под свод стопы
  const baseBlockHalf = Math.max(11, (Math.max(tipWidthMm, 28) * scale) / 2)
  const xFrontHeel = xHeelCenter + baseBlockHalf
  const xThomasFront = xFrontHeel + thomasExtensionMm * scale
  const tThomas = Math.max(0, Math.min(1, (xThomasFront - archStartX) / archSpanX))
  const yThomasArch = evalCubicBezier(tThomas, yFootHeel, c1y, c2y, yFootBall) + 2

  const thomasExtensionPath =
    soleType === 'thomas'
      ? `
    M ${xFrontHeel - 2} ${yHeelSeat + 1}
    L ${xFrontHeel - 2} ${yGround}
    L ${xThomasFront} ${yGround}
    L ${xThomasFront} ${yThomasArch}
    Q ${(xFrontHeel + xThomasFront) / 2} ${yHeelSeat + 2}, ${xFrontHeel - 2} ${yHeelSeat + 1}
    Z
  `
      : ''

  // Супинатор (геленок)
  const tt = Math.max(0, Math.min(1, (shankLength * scale) / archSpanX))
  const mt = 1 - tt
  const q1x = mt * archStartX + tt * c1x
  const q1y = mt * yFootHeel + tt * c1y
  const q2x = mt * mt * archStartX + 2 * mt * tt * c1x + tt * tt * c2x
  const q2y = mt * mt * yFootHeel + 2 * mt * tt * c1y + tt * tt * c2y
  const q3x = evalCubicBezier(tt, archStartX, c1x, c2x, xBall)
  const q3y = evalCubicBezier(tt, yFootHeel, c1y, c2y, yFootBall)
  const sOff = 2.5
  const shankCurve = `
    M ${archStartX} ${yFootHeel + sOff}
    C ${q1x} ${q1y + sOff}, ${q2x} ${q2y + sOff}, ${q3x} ${q3y + sOff}
  `

  const apexM1_Mm = totalLength * (rockerStartPct / 100) - 5
  const apexM5_Mm = apexM1_Mm - totalLength * 0.045
  const xApexM1 = padding + apexM1_Mm * scale
  const xApexM5 = padding + apexM5_Mm * scale

  const pelottePosMm = apexM1_Mm - 7
  const xPelotte = padding + pelottePosMm * scale
  const tPelotte = Math.max(0, Math.min(1, (xPelotte - archStartX) / archSpanX))
  const yFootPelotte = evalCubicBezier(tPelotte, yFootHeel, c1y, c2y, yFootBall)

  const netRise = Math.max(0, heelHeight - toeThickness)
  const pelotteHeightPx = (netRise > 60 ? 6 : netRise > 30 ? 5 : 4) * scale * 1.15
  const pelotteHalfW = 11 * scale
  const tStartP = Math.max(0, Math.min(1, (xPelotte - pelotteHalfW - archStartX) / archSpanX))
  const tEndP = Math.max(0, Math.min(1, (xPelotte + pelotteHalfW - archStartX) / archSpanX))
  const yStartP = evalCubicBezier(tStartP, yFootHeel, c1y, c2y, yFootBall)
  const yEndP = evalCubicBezier(tEndP, yFootHeel, c1y, c2y, yFootBall)

  const pelottePath = `
    M ${xPelotte - pelotteHalfW} ${yStartP}
    Q ${xPelotte} ${yFootPelotte - pelotteHeightPx * 1.65}, ${xPelotte + pelotteHalfW} ${yEndP}
    Z
  `

  const carbonYOff = 3.2
  const carbonPath = `
    M ${xHeelCenter} ${yFootHeel + carbonYOff}
    C ${c1x} ${c1y + carbonYOff}, ${c2x} ${c2y + carbonYOff}, ${xBall} ${yFootBall + carbonYOff}
    Q ${xBall + rockerZone * 0.45} ${yFootBall + carbonYOff}, ${xToe - 4} ${yFootToe + carbonYOff}
  `

  return {
    svgWidth,
    svgHeight,
    solePath,
    heelPath,
    thomasExtensionPath,
    lastUpperPath,
    instepBuildUpPath,
    shankCurve,
    pelottePath,
    carbonPath,
    xHeel,
    xBall,
    xToe,
    xHeelCenter,
    xTipCenter,
    xApexM1,
    xApexM5,
    xPelotte,
    xInstep,
    yGround,
    yFootHeel,
    yFootBall,
    yFootPelotte,
    yInstepTop,
    scale,
  }
}

function buildHeelPath(p: {
  soleType: SoleType
  heelType: HeelType
  xHeel: number
  xBall: number
  xTipCenter: number
  yHeelSeat: number
  yGround: number
  hScaled: number
  tipW: number
  c1x: number
  c2x: number
}): string {
  const { soleType, heelType, xHeel, xBall, xTipCenter, yHeelSeat, yGround, hScaled, tipW, c1x, c2x } = p

  if (soleType === 'rocker') {
    return `
      M ${xHeel} ${yHeelSeat}
      C ${c1x} ${yHeelSeat}, ${c2x} ${yGround}, ${xBall} ${yGround}
      L ${xHeel + 24} ${yGround}
      C ${xHeel + 12} ${yGround}, ${xHeel - 2} ${yGround - hScaled * 0.25}, ${xHeel} ${yHeelSeat}
      Z
    `
  }

  if (soleType === 'thomas') {
    const half = Math.max(11, tipW / 2)
    return `M ${xTipCenter - half} ${yHeelSeat} L ${xTipCenter - half * 0.96} ${yGround} L ${xTipCenter + half} ${yGround} L ${xTipCenter + half} ${yHeelSeat} Z`
  }

  switch (heelType) {
    case 'stiletto': {
      const top = Math.max(2, tipW * 0.9)
      const bot = Math.max(1.1, tipW / 2)
      return `M ${xTipCenter - top} ${yHeelSeat} L ${xTipCenter - bot} ${yGround} L ${xTipCenter + bot} ${yGround} L ${xTipCenter + top} ${yHeelSeat} Z`
    }
    case 'kitten': {
      const top = Math.max(3.5, tipW * 0.85)
      const bot = Math.max(1.8, tipW / 2)
      const midY = yHeelSeat + (yGround - yHeelSeat) * 0.55
      return `M ${xTipCenter - top} ${yHeelSeat} Q ${xTipCenter - bot * 0.4} ${midY} ${xTipCenter - bot} ${yGround} L ${xTipCenter + bot} ${yGround} Q ${xTipCenter + bot * 0.4} ${midY} ${xTipCenter + top} ${yHeelSeat} Z`
    }
    case 'block': {
      const half = Math.max(4.5, tipW / 2)
      return `M ${xTipCenter - half} ${yHeelSeat} L ${xTipCenter - half * 0.92} ${yGround} L ${xTipCenter + half * 0.92} ${yGround} L ${xTipCenter + half} ${yHeelSeat} Z`
    }
    case 'flared': {
      const top = Math.max(2.2, tipW * 0.32)
      const bot = Math.max(4.5, tipW / 2)
      return `M ${xTipCenter - top} ${yHeelSeat} L ${xTipCenter - bot} ${yGround} L ${xTipCenter + bot} ${yGround} L ${xTipCenter + top} ${yHeelSeat} Z`
    }
    default:
      return ''
  }
}
