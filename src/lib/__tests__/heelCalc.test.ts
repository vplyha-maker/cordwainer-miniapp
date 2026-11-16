// src/lib/__tests__/heelCalc.test.ts
import {
  HEEL_CONST,
  getStandardGirths,
  computeEngineering,
  computeAudit,
  suggestAutoFix,
  getBuildUpAction,
  formatBallModification,
  formatInstepModification,
  describeSoleConstruction,
  type HeelInput,
} from '../heelCalc'
import { buildHeelGeometry } from '../heelGeometry'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(('ASSERTION FAILED: ' + String(message)))
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      ('ASSERTION FAILED: ' + String(message) + ' — expected ' + String(JSON.stringify(expected)) + ', got ' + String(JSON.stringify(actual)))
    )
  }
}

function createBaseInput(overrides: Partial<HeelInput> = {}): HeelInput {
  const std = getStandardGirths('female', 38)
  return {
    gender: 'female',
    shoeSize: 38,
    weightKg: 65,
    heelHeight: 28,
    toeThickness: 12,
    soleType: 'thomas',
    rockerAngle: 15,
    rockerStartPct: 60,
    heelTipOffsetMm: 0,
    rockerType: 'forefoot',
    pronationDeg: -4,
    ballGirthMm: std.ballGirthMm,
    instepGirthMm: std.instepGirthMm,
    obliqueGirthMm: std.obliqueGirthMm,
    toeShape: 'egyptian',
    halluxValgusDeg: 8,
    archType: 'normal',
    lengthAsymmetryMm: 0,
    asymmetrySide: 'equal',
    ...overrides,
  }
}

export function runAllHeelTests(): { passed: number; details: string[] } {
  const details: string[] = []
  let passed = 0

  const test = (name: string, fn: () => void) => {
    fn()
    passed++
    details.push(('✓ ' + String(name)))
  }

  // 1. Единый источник геометрической правды и согласование длин между heelCalc и heelGeometry
  test('1. Синхронизация длины стопы, колодки и всех координат между heelCalc и heelGeometry (LastGeometryModel)', () => {
    const input = createBaseInput({
      shoeSize: 38,
      toeShape: 'greek',
      halluxValgusDeg: 16,
      lengthAsymmetryMm: 4,
      asymmetrySide: 'left',
    })
    const eng = computeEngineering(input)
    const gm = eng.geometryModel

    // Проверка согласования верхнеуровневых полей eng и gm
    assertEqual(eng.footLengthMm, gm.footLengthMm, 'eng.footLengthMm === gm.footLengthMm')
    assertEqual(eng.lastLengthMm, gm.lastLengthMm, 'eng.lastLengthMm === gm.lastLengthMm')
    assertEqual(eng.apexM1_Mm, gm.xApexM1Mm, 'eng.apexM1_Mm === gm.xApexM1Mm')
    assertEqual(eng.apexM5_Mm, gm.xApexM5Mm, 'eng.apexM5_Mm === gm.xApexM5Mm')
    assertEqual(
      eng.metatarsalPadPosMm,
      gm.metatarsalPadPosMm,
      'eng.metatarsalPadPosMm === gm.metatarsalPadPosMm'
    )

    // Строим 2D-геометрию как с передачей geometryModel, так и без неё (legacy-режим)
    const geomDirect = buildHeelGeometry({ ...input, geometryModel: gm })
    const geomLegacy = buildHeelGeometry({ ...input })

    assertEqual(
      geomDirect.svgWidth,
      geomLegacy.svgWidth,
      'geomDirect.svgWidth === geomLegacy.svgWidth'
    )
    assertEqual(geomDirect.xToe, geomLegacy.xToe, 'geomDirect.xToe === geomLegacy.xToe')
    assertEqual(
      geomDirect.xApexM1,
      geomLegacy.xApexM1,
      'geomDirect.xApexM1 === geomLegacy.xApexM1'
    )
    assertEqual(
      geomDirect.xApexM5,
      geomLegacy.xApexM5,
      'geomDirect.xApexM5 === geomLegacy.xApexM5'
    )

    // Строгое равенство: X_svg = padding + X_mm * scale
    const { padding, scale } = geomDirect
    assertEqual(
      geomDirect.xHeel,
      padding + gm.xHeelMm * scale,
      '2D xHeel matches LastGeometryModel'
    )
    assertEqual(
      geomDirect.xHeelCenter,
      padding + gm.xHeelCenterMm * scale,
      '2D xHeelCenter matches LastGeometryModel'
    )
    assertEqual(
      geomDirect.xBall,
      padding + gm.xBallMm * scale,
      '2D xBall matches LastGeometryModel'
    )
    assertEqual(
      geomDirect.xToe,
      padding + gm.lastLengthMm * scale,
      '2D xToe matches LastGeometryModel.lastLengthMm'
    )
    assertEqual(
      geomDirect.xApexM1,
      padding + gm.xApexM1Mm * scale,
      '2D xApexM1 matches LastGeometryModel.xApexM1Mm'
    )
    assertEqual(
      geomDirect.xApexM5,
      padding + gm.xApexM5Mm * scale,
      '2D xApexM5 matches LastGeometryModel.xApexM5Mm'
    )
    assertEqual(
      geomDirect.xPelotte,
      padding + gm.xPelotteMm * scale,
      '2D xPelotte matches LastGeometryModel.xPelotteMm'
    )
    assertEqual(
      geomDirect.xInstep,
      padding + gm.xInstepMm * scale,
      '2D xInstep matches LastGeometryModel.xInstepMm'
    )
  })

  // 2. Морфология пальцев (египетская / греческая / римская) и карман под Hallux Valgus
  test('2. Корректный расчёт апекса и кармана под HV для египетской, греческой и римской стопы', () => {
    const egyptian = computeEngineering(
      createBaseInput({ toeShape: 'egyptian', halluxValgusDeg: 6 })
    )
    const greek = computeEngineering(
      createBaseInput({ toeShape: 'greek', halluxValgusDeg: 6 })
    )
    const roman = computeEngineering(
      createBaseInput({ toeShape: 'roman', halluxValgusDeg: 6 })
    )

    assertEqual(
      egyptian.rx.lastApexType,
      'medial_straight',
      'Egyptian foot -> medial_straight apex'
    )
    assertEqual(
      greek.rx.lastApexType,
      'oblique_anatomical',
      'Greek foot without severe HV -> oblique_anatomical apex'
    )
    assertEqual(
      roman.rx.lastApexType,
      'wide_square',
      'Roman foot -> wide_square apex'
    )

    // Греческая стопа требует больший свободный припуск под длинный II палец (+3 мм относительно египетской)
    assertEqual(
      greek.rx.toeFreeSpaceMm - egyptian.rx.toeFreeSpaceMm,
      3,
      'Greek foot adds +3mm toe free space over Egyptian'
    )
    assertEqual(
      roman.rx.toeFreeSpaceMm - egyptian.rx.toeFreeSpaceMm,
      1,
      'Roman foot adds +1mm toe free space over Egyptian'
    )

    // Проверка кармана под Hallux Valgus (HV = 22°)
    const withHv = computeEngineering(
      createBaseInput({ toeShape: 'roman', halluxValgusDeg: 22 })
    )
    assert(withHv.rx.medialBunionPocketMm > 0, 'HV 22° creates medial bunion pocket > 0')
    assertEqual(
      withHv.geometryModel.effectiveForefootWidthWithBunionMm,
      parseFloat(
        (withHv.rx.forefootWidthMm + withHv.rx.medialBunionPocketMm).toFixed(1)
      ),
      'Effective forefoot width includes medialBunionPocketMm'
    )
    const geomHv = buildHeelGeometry({
      ...createBaseInput({ toeShape: 'roman', halluxValgusDeg: 22 }),
      geometryModel: withHv.geometryModel,
    })
    assert(
      geomHv.bunionPocketPath.length > 0,
      '2D geometry builds non-empty bunionPocketPath when HV pocket > 0'
    )
  })

  // 3. Асимметрия стоп (left longer / right longer / equal) и компенсационная полустелька
  test('3. Поддержка стороны асимметрии стоп (left / right / equal) и расчёт полустельки', () => {
    const leftLonger = computeEngineering(
      createBaseInput({ lengthAsymmetryMm: 8, asymmetrySide: 'left' })
    )
    assertEqual(leftLonger.rx.longerFootSide, 'left', 'Left foot marked as longer')
    assertEqual(leftLonger.rx.shorterFootSide, 'right', 'Right foot marked as shorter')
    assertEqual(
      leftLonger.rx.leftFootLengthMm - leftLonger.rx.rightFootLengthMm,
      8,
      'Left foot is 8mm longer than right foot'
    )
    assertEqual(
      leftLonger.rx.compensatoryInsoleHalfPairMm,
      6,
      'Compensatory half-insole is round(8 * 0.75) = 6 mm'
    )
    assert(
      leftLonger.rx.asymmetrySummary.includes('Левая стопа длиннее') &&
        leftLonger.rx.asymmetrySummary.includes('правую полупару'),
      'Asymmetry summary explicitly instructs placing compensatory insole in RIGHT half-pair'
    )

    const rightLonger = computeEngineering(
      createBaseInput({ lengthAsymmetryMm: 8, asymmetrySide: 'right' })
    )
    assertEqual(rightLonger.rx.longerFootSide, 'right', 'Right foot marked as longer')
    assertEqual(rightLonger.rx.shorterFootSide, 'left', 'Left foot marked as shorter')
    assertEqual(
      rightLonger.rx.rightFootLengthMm - rightLonger.rx.leftFootLengthMm,
      8,
      'Right foot is 8mm longer than left foot'
    )
    assert(
      rightLonger.rx.asymmetrySummary.includes('Правая стопа длиннее') &&
        rightLonger.rx.asymmetrySummary.includes('левую полупару'),
      'Asymmetry summary explicitly instructs placing compensatory insole in LEFT half-pair'
    )

    const equalFeet = computeEngineering(
      createBaseInput({ lengthAsymmetryMm: 6, asymmetrySide: 'equal' })
    )
    assertEqual(
      equalFeet.rx.leftFootLengthMm,
      equalFeet.rx.rightFootLengthMm,
      'When asymmetrySide is equal, left and right foot lengths are equal'
    )
    assertEqual(
      equalFeet.rx.compensatoryInsoleHalfPairMm,
      0,
      'When asymmetrySide is equal, compensatory insole is 0'
    )
  })

  // 4. Отрицательные, нулевые и положительные припуски (build-up vs снятие материала)
  test('4. Разделение наращивания (+), снятия материала (−) и базовой геометрии (0)', () => {
    const std = getStandardGirths('female', 38)

    // Отрицательные припуски (узкая стопа и низкий взъём)
    const narrow = computeEngineering(
      createBaseInput({
        ballGirthMm: std.ballGirthMm - 6,
        instepGirthMm: std.instepGirthMm - 5,
      })
    )
    assertEqual(narrow.rx.ballBuildUpMm, -6, 'ballBuildUpMm is -6')
    assertEqual(narrow.rx.ballModAction, 'reduce', 'ballModAction is reduce')
    assertEqual(narrow.rx.instepBuildUpMm, -5, 'instepBuildUpMm is -5')
    assertEqual(narrow.rx.instepModAction, 'reduce', 'instepModAction is reduce')
    assert(
      !formatBallModification(-6).toLowerCase().includes('налепка'),
      'Negative ball modification must NEVER be called налепка'
    )
    assert(
      formatBallModification(-6).toLowerCase().includes('снятие'),
      'Negative ball modification explicitly states снятие материала'
    )
    assert(
      formatInstepModification(-5).toLowerCase().includes('снятие'),
      'Negative instep modification explicitly states снятие материала'
    )

    const geomNarrow = buildHeelGeometry({
      ...createBaseInput({
        ballGirthMm: std.ballGirthMm - 6,
        instepGirthMm: std.instepGirthMm - 5,
      }),
      geometryModel: narrow.geometryModel,
    })
    assertEqual(geomNarrow.instepModAction, 'reduce', '2D geometry marks instepModAction = reduce')
    assert(
      geomNarrow.instepBuildUpPath.length > 0,
      '2D geometry renders reduction path when instepBuildUpMm < 0'
    )

    // Нулевые припуски
    assertEqual(getBuildUpAction(0), 'neutral', '0 delta -> neutral')
    assert(
      formatBallModification(0).toLowerCase().includes('баз'),
      'Zero ball modification states базовая геометрия'
    )
  })

  // 5. Согласование ограничений смещения каблука (-2..+5 мм)
  test('5. Границы допуска смещения оси каблука (-2..+5 мм) в computeEngineering и computeAudit', () => {
    const safeBack = computeEngineering(
      createBaseInput({ soleType: 'flat', pronationDeg: 0, heelTipOffsetMm: -2 })
    )
    assertEqual(
      safeBack.heelOffsetTooFarBack,
      false,
      'Offset -2mm is within safe posterior tolerance'
    )

    const errBack = computeEngineering(
      createBaseInput({ soleType: 'flat', pronationDeg: 0, heelTipOffsetMm: -3 })
    )
    assertEqual(
      errBack.heelOffsetTooFarBack,
      true,
      'Offset -3mm (< -2mm) triggers heelOffsetTooFarBack error'
    )
    const auditBack = computeAudit(errBack, 'flat', 28, 15)
    assertEqual(auditBack.status, 'ERROR', 'Audit status is ERROR for offset -3mm')
    assertEqual(auditBack.titleKey, 'heelBackTitle', 'Audit titleKey is heelBackTitle')

    const safeFwd = computeEngineering(
      createBaseInput({ soleType: 'flat', pronationDeg: 0, heelTipOffsetMm: 5 })
    )
    assertEqual(
      safeFwd.heelOffsetTooFarForward,
      false,
      'Offset +5mm is within safe anterior tolerance'
    )

    const errFwd = computeEngineering(
      createBaseInput({ soleType: 'flat', pronationDeg: 0, heelTipOffsetMm: 6 })
    )
    assertEqual(
      errFwd.heelOffsetTooFarForward,
      true,
      'Offset +6mm (> +5mm) triggers heelOffsetTooFarForward error'
    )
  })

  // 6. Итеративный Auto-Fix: сходимость при комбинированных нарушениях и сохранение типа подошвы
  test('6. Итеративный suggestAutoFix: устранение комплексных ошибок без лишней смены типа подошвы', () => {
    // Случай 6.1: Режим Thomas с завышенным каблуком (48 мм) и сбитым смещением пятки (-5 мм)
    const thomasOverloadInput = createBaseInput({
      soleType: 'thomas',
      heelHeight: 48,
      toeThickness: 8,
      heelTipOffsetMm: -5,
      pronationDeg: -5,
    })
    const initialEng = computeEngineering(thomasOverloadInput)
    const initialAudit = computeAudit(initialEng, 'thomas', 48, 15)
    assertEqual(initialAudit.status, 'ERROR', 'Initial state has ERROR')

    const fix1 = suggestAutoFix(thomasOverloadInput, initialEng)
    assertEqual(fix1.resolved, true, 'Auto-fix resolved all critical errors')
    assertEqual(fix1.status, 'RESOLVED', 'Status is RESOLVED')
    assertEqual(fix1.soleType, 'thomas', 'Preserved thomas soleType')
    assert(
      fix1.heelHeight <= HEEL_CONST.MAX_THOMAS_HEEL_MM,
      'Heel height reduced within MAX_THOMAS_HEEL_MM'
    )
    assertEqual(fix1.heelTipOffsetMm, 0, 'Heel tip offset reset to 0mm')

    // Проверим, что после применения fix1 computeAudit действительно возвращает не ERROR
    const fixedEng1 = computeEngineering({
      ...thomasOverloadInput,
      soleType: fix1.soleType,
      heelHeight: fix1.heelHeight,
      toeThickness: fix1.toeThickness,
      heelTipOffsetMm: fix1.heelTipOffsetMm,
      rockerAngle: fix1.rockerAngle,
      rockerStartPct: fix1.rockerStartPct,
    })
    const fixedAudit1 = computeAudit(
      fixedEng1,
      fix1.soleType,
      fix1.heelHeight,
      fix1.rockerAngle
    )
    assert(fixedAudit1.status !== 'ERROR', 'Post-fix audit status is not ERROR')

    // Случай 6.2: Плоская подошва при выраженном вальгусе (-7°) и высоком каблуке (65 мм)
    const flatValgusInput = createBaseInput({
      soleType: 'flat',
      heelHeight: 65,
      toeThickness: 10,
      pronationDeg: -7,
      weightKg: 82,
    })
    const fix2 = suggestAutoFix(flatValgusInput)
    assertEqual(fix2.resolved, true, 'Resolved flat valgus overload')
    assertEqual(
      fix2.soleType,
      'flat',
      'Preserved flat soleType without forcibly switching to thomas'
    )
    assert(fix2.iterations >= 1 && fix2.iterations <= 7, 'Converged within iteration limit')

    // Случай 6.3: Уже оптимальное состояние не меняется
    const optimalInput = createBaseInput({
      soleType: 'thomas',
      heelHeight: 24,
      toeThickness: 14,
      pronationDeg: -4,
      heelTipOffsetMm: 0,
    })
    const fixOpt = suggestAutoFix(optimalInput)
    assertEqual(fixOpt.status, 'ALREADY_OPTIMAL', 'Optimal input returns ALREADY_OPTIMAL')
    assertEqual(fixOpt.iterations, 0, '0 iterations needed for optimal input')
  })

  // 7. Жёсткое разделение описания каблука Томаса и рокерной подошвы с карбоном + честность модели
  test('7. Разделение описаний Томаса и рокера + флаги модельной оценки и shankEngineering', () => {
    const thomasEng = computeEngineering(
      createBaseInput({ soleType: 'thomas', heelHeight: 26, toeThickness: 12 })
    )
    const rockerEng = computeEngineering(
      createBaseInput({ soleType: 'rocker', heelHeight: 26, toeThickness: 14, rockerAngle: 18 })
    )

    assertEqual(
      thomasEng.isPressureAndCopModelEstimate,
      true,
      'isPressureAndCopModelEstimate is true'
    )
    assertEqual(
      thomasEng.shankEngineering.isAnalyticalEstimate,
      true,
      'shankEngineering.isAnalyticalEstimate is true'
    )
    assertEqual(
      thomasEng.shankEngineering.material,
      'steel_65G',
      'Thomas mode uses steel_65G shank'
    )
    assertEqual(
      rockerEng.shankEngineering.material,
      'carbon_composite',
      'Rocker mode uses carbon_composite plate'
    )

    assert(
      thomasEng.rx.soleConstructionSummary.includes('Томаса') &&
        !thomasEng.rx.soleConstructionSummary.toLowerCase().includes('карбон'),
      'Thomas construction summary never mentions carbon plate'
    )
    assert(
      rockerEng.rx.soleConstructionSummary.includes('Рокерная') &&
        rockerEng.rx.soleConstructionSummary.includes('карбоновой') &&
        !rockerEng.rx.soleConstructionSummary.includes('Томаса'),
      'Rocker construction summary never mentions Thomas heel'
    )

    const flatDesc = describeSoleConstruction({
      soleType: 'flat',
      netRiseMm: 14,
      heelHeightMm: 26,
      toeThicknessMm: 12,
      thomasHeelType: 'none',
      thomasExtensionMm: 0,
      rockerAngleDeg: 15,
      rockerStartPct: 60,
      carbonInsertThicknessMm: 0,
      shankLengthMm: 110,
      steelThicknessMm: 1.5,
    })
    assert(
      flatDesc.includes('Стандартный каблук') &&
        !flatDesc.includes('Томаса') &&
        !flatDesc.toLowerCase().includes('карбон'),
      'Flat construction summary mentions neither Thomas nor carbon'
    )
  })

  return { passed, details }
}

// Автозапуск при прямом вызове через Node/TSX
const result = runAllHeelTests()
console.log(('ALL ' + String(result.passed) + ' TEST SUITES PASSED:'))
for (const line of result.details) {
  console.log(('  ' + String(line)))
}
