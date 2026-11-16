// src/lib/heelGeometry.ts
import {
  HEEL_CONST,
  computeEngineering,
  type SoleType,
  type Gender,
  type ToeShape,
  type ArchMorphology,
  type AsymmetrySide,
  type BuildUpAction,
  type LastGeometryModel,
} from './heelCalc'

export interface GeometryInput {
  /**
   * Рекомендуемый способ: передать готовый единый объект LastGeometryModel из computeEngineering(input).geometryModel.
   * Если geometryModel не передан (например, в legacy-вызовах), buildHeelGeometry вычислит его через computeEngineering,
   * гарантируя 100% совпадение формул длины колодки, M1, M5, пелота и апекса во всех режимах.
   */
  geometryModel?: LastGeometryModel
  gender?: Gender
  shoeSize: number
  weightKg?: number
  heelHeight: number
  toeThickness: number
  soleType: SoleType
  rockerAngle: number
  rockerStartPct: number
  heelTipOffsetMm: number
  pronationDeg?: number
  ballGirthMm?: number
  instepGirthMm?: number
  obliqueGirthMm?: number
  toeShape?: ToeShape
  halluxValgusDeg?: number
  archType?: ArchMorphology
  lengthAsymmetryMm?: number
  asymmetrySide?: AsymmetrySide
  shankLength?: number
  thomasExtensionMm?: number
  instepBuildUpMm?: number
}

export interface HeelGeometry {
  /** Ссылка на единый источник геометрической правды, по которому построен 2D-чертёж */
  model: LastGeometryModel
  svgWidth: number
  svgHeight: number
  padding: number
  scale: number
  solePath: string
  heelPath: string
  thomasExtensionPath: string
  lastUpperPath: string
  /** Контур модификации прямого взъёма (при > 0 — налепка над гребнем, при < 0 — зона снятия материала под гребнем) */
  instepBuildUpPath: string
  instepModAction: BuildUpAction
  /** Контур модификации пучков в профильной проекции (наращивание / снятие) */
  ballBuildUpPath: string
  ballModAction: BuildUpAction
  /** Проекция локального разгрузочного кармана под головку M1 (Hallux Valgus) */
  bunionPocketPath: string
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

/**
 * Строит 2D SVG-геометрию строго из единого объекта LastGeometryModel.
 * Ни одна координата (длина колодки, M1, M5, пелот, взъём, центр пятки, выступ Томаса)
 * не пересчитывается по отдельным формулам — все значения переводятся в SVG-координаты
 * единым линейным преобразованием: X_svg = padding + X_mm * scale.
 */
export function buildHeelGeometry(input: GeometryInput): HeelGeometry {
  const C = HEEL_CONST

  const gm: LastGeometryModel =
    input.geometryModel ??
    computeEngineering({
      gender: input.gender ?? 'female',
      shoeSize: input.shoeSize,
      weightKg: input.weightKg ?? 68,
      heelHeight: input.heelHeight,
      toeThickness: input.toeThickness,
      soleType: input.soleType,
      rockerAngle: input.rockerAngle,
      rockerStartPct: input.rockerStartPct,
      heelTipOffsetMm: input.heelTipOffsetMm,
      pronationDeg: input.pronationDeg ?? 0,
      ballGirthMm: input.ballGirthMm ?? (input.gender === 'male' ? 244 : 222),
      instepGirthMm:
        input.instepGirthMm != null
          ? input.instepGirthMm
          : (input.gender === 'male' ? 252 : 229) + (input.instepBuildUpMm ?? 0),
      obliqueGirthMm: input.obliqueGirthMm ?? (input.gender === 'male' ? 322 : 292),
      toeShape: input.toeShape ?? 'egyptian',
      halluxValgusDeg: input.halluxValgusDeg ?? 0,
      archType: input.archType ?? 'normal',
      lengthAsymmetryMm: input.lengthAsymmetryMm ?? 0,
      asymmetrySide: input.asymmetrySide ?? 'equal',
    }).geometryModel

  const totalLength = gm.lastLengthMm
  const scale = 0.76
  const padding = 32
  const svgWidth = totalLength * scale + padding * 2
  const svgHeight = 144

  // Прямая проекция всех продольных координат из LastGeometryModel (X_svg = padding + X_mm * scale)
  const toSvgX = (xMm: number) => padding + xMm * scale

  const xHeel = toSvgX(gm.xHeelMm)
  const xHeelCenter = toSvgX(gm.xHeelCenterMm)
  const xTipCenter = toSvgX(gm.xHeelTipCenterMm)
  const xBall = toSvgX(gm.xBallMm)
  const xToe = toSvgX(gm.xToeMm)
  const xApexM1 = toSvgX(gm.xApexM1Mm)
  const xApexM5 = toSvgX(gm.xApexM5Mm)
  const xPelotte = toSvgX(gm.xPelotteMm)
  const xInstep = toSvgX(gm.xInstepMm)

  const yGround = 120
  const hScaled = gm.heelHeightMm * scale
  const tScaled = gm.toeThicknessMm * scale
  const yFootHeel = yGround - hScaled
  const yFootBall = yGround - tScaled

  const rockerZone = Math.max(1, xToe - xBall)
  const toeLift =
    gm.soleType === 'rocker'
      ? Math.min(
          C.MAX_LIFT * scale,
          rockerZone *
            Math.min(1, Math.max(0, Math.sin((gm.rockerAngleDeg * Math.PI) / 180)))
        )
      : 0
  const yFootToe = yFootBall - toeLift

  const archStartX = xHeelCenter
  const archSpanX = Math.max(1, xBall - archStartX)
  const c1x = archStartX + archSpanX * 0.35
  const c2x = archStartX + archSpanX * 0.7
  const c1y = yFootHeel * 0.65 + yFootBall * 0.35
  const c2y = yFootHeel * 0.25 + yFootBall * 0.75

  const topPath = ('M ' + String(xHeel - 4) + ' ' + String(yFootHeel - 3) + ' L ' + String(xHeelCenter - 6) + ' ' + String(yFootHeel) + ' C ' + String(c1x) + ' ' + String(c1y) + ', ' + String(c2x) + ' ' + String(c2y) + ', ' + String(xBall) + ' ' + String(yFootBall) + ' Q ' + String(xBall + rockerZone * 0.45) + ' ' + String(yFootBall) + ', ' + String(xToe) + ' ' + String(yFootToe))

  const yHeelSeat = yFootHeel + Math.min(hScaled * 0.14, 7 * scale)
  const yBottomToe =
    gm.soleType === 'rocker' ? yFootToe + Math.max(tScaled, 4) : yGround - 1

  const bottomPath = (' L ' + String(xToe) + ' ' + String(yBottomToe) + ' Q ' + String(xBall + rockerZone * 0.45) + ' ' + String(yGround) + ', ' + String(xBall) + ' ' + String(yGround) + ' C ' + String(c2x) + ' ' + String(yGround) + ', ' + String(c1x) + ' ' + String(yHeelSeat + 2) + ', ' + String(xHeelCenter - 4) + ' ' + String(yHeelSeat + 2) + ' L ' + String(xHeel - 2) + ' ' + String(yHeelSeat) + ' Z')
  const solePath = topPath + bottomPath

  const tInstep = Math.max(0, Math.min(1, (xInstep - archStartX) / archSpanX))
  const yInstepFoot = evalCubicBezier(tInstep, yFootHeel, c1y, c2y, yFootBall)
  const instepHeightPx = gm.instepBaseHeightMm * scale
  const yInstepTop = yInstepFoot - instepHeightPx
  const toeBoxHeightPx = gm.toeBoxHeightMm * scale

  const lastUpperPath = ('M ' + String(xHeel - 2) + ' ' + String(yFootHeel - 3) + ' Q ' + String(xHeel - 5) + ' ' + String(yFootHeel - 32 * scale) + ', ' + String(xHeel + 8) + ' ' + String(yFootHeel - 48 * scale) + ' L ' + String(xInstep - 20) + ' ' + String(yInstepTop - 6) + ' Q ' + String(xInstep + 6) + ' ' + String(yInstepTop + 4) + ', ' + String(xBall + 4) + ' ' + String(yFootBall - 22 * scale) + ' Q ' + String(xToe - 8) + ' ' + String(yFootToe - toeBoxHeightPx * 0.65) + ', ' + String(xToe) + ' ' + String(yFootToe - 3))

  // Модификация прямого взъёма:
  // > 0 -> наращивание (налепка) поверх гребня колодки
  // < 0 -> снятие материала (уменьшение объёма гребня) внутрь контура колодки
  let instepBuildUpPath = ''
  if (gm.instepBuildUpMm > 0) {
    const buildUpPx = gm.instepBuildUpMm * scale * 1.4
    instepBuildUpPath = ('M ' + String(xInstep - 18) + ' ' + String(yInstepTop - 4) + ' Q ' + String(xInstep) + ' ' + String(yInstepTop - 4 - buildUpPx * 1.8) + ', ' + String(xBall) + ' ' + String(yFootBall - 22 * scale) + ' Q ' + String(xInstep) + ' ' + String(yInstepTop + 1) + ', ' + String(xInstep - 18) + ' ' + String(yInstepTop - 4) + ' Z')
  } else if (gm.instepBuildUpMm < 0) {
    const reducePx = Math.abs(gm.instepBuildUpMm) * scale * 1.3
    instepBuildUpPath = ('M ' + String(xInstep - 16) + ' ' + String(yInstepTop - 2) + ' Q ' + String(xInstep) + ' ' + String(yInstepTop + reducePx * 1.6) + ', ' + String(xBall - 2) + ' ' + String(yFootBall - 20 * scale) + ' Q ' + String(xInstep) + ' ' + String(yInstepTop - 1) + ', ' + String(xInstep - 16) + ' ' + String(yInstepTop - 2) + ' Z')
  }

  // Модификация пучков (наращивание / снятие) в зоне M1–M5
  let ballBuildUpPath = ''
  if (gm.ballBuildUpMm !== 0) {
    const ballDeltaPx = Math.min(12, Math.abs(gm.ballBuildUpMm) * scale * 1.1)
    const dir = gm.ballBuildUpMm > 0 ? -1 : 1
    ballBuildUpPath = ('M ' + String(xApexM5 - 6) + ' ' + String(yFootBall - 16 * scale) + ' Q ' + String((xApexM5 + xApexM1) * 0.5) + ' ' + String(yFootBall - 22 * scale + dir * ballDeltaPx * 1.6) + ', ' + String(xApexM1 + 8) + ' ' + String(yFootBall - 14 * scale) + ' Q ' + String((xApexM5 + xApexM1) * 0.5) + ' ' + String(yFootBall - 18 * scale) + ', ' + String(xApexM5 - 6) + ' ' + String(yFootBall - 16 * scale) + ' Z')
  }

  // Карман под Hallux Valgus (центрирован строго по xApexM1 из LastGeometryModel)
  let bunionPocketPath = ''
  if (gm.medialBunionPocketMm > 0) {
    const pocketR = gm.bunionPocketRadiusMm * scale * 0.55
    const pocketH = (3 + gm.medialBunionPocketMm * 1.15) * scale
    const yCenterM1 = yFootBall - 8 * scale
    bunionPocketPath = ('M ' + String(xApexM1 - pocketR) + ' ' + String(yCenterM1 + 2) + ' Q ' + String(xApexM1) + ' ' + String(yCenterM1 - pocketH * 1.7) + ', ' + String(xApexM1 + pocketR) + ' ' + String(yCenterM1 + 2) + ' Q ' + String(xApexM1) + ' ' + String(yCenterM1 + pocketH * 0.65) + ', ' + String(xApexM1 - pocketR) + ' ' + String(yCenterM1 + 2) + ' Z')
  }

  const xBackTop = xHeel - 2
  const xBackBot = toSvgX(gm.xHeelBackBottomMm)
  const xFrontHeel = toSvgX(gm.xHeelFrontBaseMm)

  let heelPath = ''
  if (gm.soleType === 'rocker') {
    heelPath = ('M ' + String(xBackTop) + ' ' + String(yHeelSeat) + ' C ' + String(c1x) + ' ' + String(yHeelSeat) + ', ' + String(c2x) + ' ' + String(yGround) + ', ' + String(xBall) + ' ' + String(yGround) + ' L ' + String(xHeel + 16) + ' ' + String(yGround) + ' C ' + String(xHeel + 4) + ' ' + String(yGround) + ', ' + String(xBackTop - 2) + ' ' + String(yGround - hScaled * 0.4) + ', ' + String(xBackTop) + ' ' + String(yHeelSeat) + ' Z')
  } else {
    heelPath = ('M ' + String(xBackTop) + ' ' + String(yHeelSeat) + ' C ' + String(xBackTop - 2) + ' ' + String(yHeelSeat + hScaled * 0.45) + ', ' + String(xBackBot - 1) + ' ' + String(yGround - hScaled * 0.2) + ', ' + String(xBackBot) + ' ' + String(yGround) + ' L ' + String(xFrontHeel) + ' ' + String(yGround) + ' C ' + String(xFrontHeel - 1) + ' ' + String(yGround - hScaled * 0.3) + ', ' + String(xFrontHeel + 1) + ' ' + String(yHeelSeat + hScaled * 0.3) + ', ' + String(xFrontHeel + 2) + ' ' + String(yHeelSeat + 1) + ' Z')
  }

  // Выступ каблука Томаса строится строго по координате xThomasFrontMm из LastGeometryModel
  let thomasExtensionPath = ''
  if (gm.soleType === 'thomas' && gm.thomasExtensionMm > 0) {
    const xThomasFront = toSvgX(gm.xThomasFrontMm)
    const tThomas = Math.max(0, Math.min(1, (xThomasFront - archStartX) / archSpanX))
    const yThomasArch = evalCubicBezier(tThomas, yFootHeel, c1y, c2y, yFootBall) + 2

    thomasExtensionPath = ('M ' + String(xFrontHeel - 1) + ' ' + String(yHeelSeat + 1) + ' L ' + String(xFrontHeel - 1) + ' ' + String(yGround) + ' L ' + String(xThomasFront) + ' ' + String(yGround) + ' C ' + String(xThomasFront + 2) + ' ' + String(yGround - (yGround - yThomasArch) * 0.45) + ', ' + String(xThomasFront - 1) + ' ' + String(yThomasArch + 4) + ', ' + String(xThomasFront - 2) + ' ' + String(yThomasArch) + ' C ' + String((xFrontHeel + xThomasFront) * 0.5) + ' ' + String(yHeelSeat + 2) + ', ' + String(xFrontHeel + 2) + ' ' + String(yHeelSeat + 1) + ', ' + String(xFrontHeel - 1) + ' ' + String(yHeelSeat + 1) + ' Z')
  }

  const xShankEnd = toSvgX(gm.xShankEndMm)
  const tt = Math.max(0, Math.min(1, (xShankEnd - archStartX) / archSpanX))
  const mt = 1 - tt
  const q1x = mt * archStartX + tt * c1x
  const q1y = mt * yFootHeel + tt * c1y
  const q2x = mt * mt * archStartX + 2 * mt * tt * c1x + tt * tt * c2x
  const q2y = mt * mt * yFootHeel + 2 * mt * tt * c1y + tt * tt * c2y
  const q3x = evalCubicBezier(tt, archStartX, c1x, c2x, xBall)
  const q3y = evalCubicBezier(tt, yFootHeel, c1y, c2y, yFootBall)
  const sOff = 2.5
  const shankCurve = ('M ' + String(archStartX) + ' ' + String(yFootHeel + sOff) + ' C ' + String(q1x) + ' ' + String(q1y + sOff) + ', ' + String(q2x) + ' ' + String(q2y + sOff) + ', ' + String(q3x) + ' ' + String(q3y + sOff))

  const tPelotte = Math.max(0, Math.min(1, (xPelotte - archStartX) / archSpanX))
  const yFootPelotte = evalCubicBezier(tPelotte, yFootHeel, c1y, c2y, yFootBall)

  // Высота и полуширина пелота берутся напрямую из LastGeometryModel
  const pelotteHeightMm = gm.metatarsalPadHeightMm ?? 4
  const pelotteHeightPx = pelotteHeightMm * scale * 1.15
  const pelotteHalfW = gm.pelotteHalfLengthMm * scale
  const tStartP = Math.max(0, Math.min(1, (xPelotte - pelotteHalfW - archStartX) / archSpanX))
  const tEndP = Math.max(0, Math.min(1, (xPelotte + pelotteHalfW - archStartX) / archSpanX))
  const yStartP = evalCubicBezier(tStartP, yFootHeel, c1y, c2y, yFootBall)
  const yEndP = evalCubicBezier(tEndP, yFootHeel, c1y, c2y, yFootBall)

  const pelottePath = ('M ' + String(xPelotte - pelotteHalfW) + ' ' + String(yStartP) + ' Q ' + String(xPelotte) + ' ' + String(yFootPelotte - pelotteHeightPx * 1.65) + ', ' + String(xPelotte + pelotteHalfW) + ' ' + String(yEndP) + ' Z')

  const carbonYOff = 3.2
  const carbonPath = ('M ' + String(xHeelCenter) + ' ' + String(yFootHeel + carbonYOff) + ' C ' + String(c1x) + ' ' + String(c1y + carbonYOff) + ', ' + String(c2x) + ' ' + String(c2y + carbonYOff) + ', ' + String(xBall) + ' ' + String(yFootBall + carbonYOff) + ' Q ' + String(xBall + rockerZone * 0.45) + ' ' + String(yFootBall + carbonYOff) + ', ' + String(xToe - 4) + ' ' + String(yFootToe + carbonYOff))

  return {
    model: gm,
    svgWidth,
    svgHeight,
    padding,
    scale,
    solePath,
    heelPath,
    thomasExtensionPath,
    lastUpperPath,
    instepBuildUpPath,
    instepModAction: gm.instepModAction,
    ballBuildUpPath,
    ballModAction: gm.ballModAction,
    bunionPocketPath,
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
  }
}
