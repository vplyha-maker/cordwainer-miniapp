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
    throw new Error('ASSERTION FAILED: ' + String(message))
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      'ASSERTION FAILED: ' +
        String(message) +
        ' — expected ' +
        String(JSON.stringify(expected)) +
        ', got ' +
        String(JSON.stringify(actual))
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
    details.push('✓ ' + String(name))
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

    assertEqual(eng.footLengthMm, gm.footLengthMm, 'eng.footLengthMm === gm.footLengthMm')
    assertEqual(eng.lastLengthMm, gm.lastLengthMm, 'eng.lastLengthMm === gm.lastLengthMm')
    assertEqual(eng.apexM1_Mm, gm.xApexM1Mm, 'eng.apexM1_Mm === gm.xApexM1Mm')
    assertEqual(eng.apexM5_Mm, gm.xApexM5Mm, 'eng.apexM5_Mm === gm.xApexM5Mm')
    assertEqual(
      eng.metatarsalPadPosMm,
      gm.metatarsalPadPosMm,
      'eng.metatarsalPadPosMm === gm.metatarsalPadPosMm'
    )

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
    assertEqual(
      leftLonger.rx.requiresMismatchedPairLasts,
      true,
      'ΔL = 8mm triggers requiresMismatchedPairLasts'
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

  // 4. Отрицательные, нулевые и положительные припуски + радиальная толщина слоя
  test('4. Разделение наращивания (+), снятия материала (−), базовой геометрии (0) и радиального слоя', () => {
    const std = getStandardGirths('female', 38)

    const narrow = computeEngineering(
      createBaseInput({
        ballGirthMm: std.ballGirthMm - 6,
        instepGirthMm: std.instepGirthMm - 5,
      })
    )
    assertEqual(narrow.rx.ballBuildUpMm, -6, 'ballBuildUpMm is -6')
    assertEqual(narrow.rx.ballModAction, 'reduce', 'ballModAction is reduce')
    assert(narrow.rx.ballRadialLayerMm < 0, 'ballRadialLayerMm is negative')
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

    assertEqual(getBuildUpAction(0), 'neutral', '0 delta -> neutral')
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

  // 6. Итеративный Auto-Fix: сходимость и строгое сохранение выбранного пользователем soleType
  test('6. Итеративный suggestAutoFix: устранение ошибок с сохранением выбранного типа подошвы', () => {
    const thomasOverloadInput = createBaseInput({
      soleType: 'thomas',
      heelHeight: 48,
      toeThickness: 8,
      heelTipOffsetMm: -5,
      pronationDeg: -5,
    })
    const initialEng = computeEngineering(thomasOverloadInput)
    const fix1 = suggestAutoFix(thomasOverloadInput, initialEng)
    assertEqual(fix1.resolved, true, 'Auto-fix resolved all critical errors')
    assertEqual(fix1.soleType, 'thomas', 'Preserved thomas soleType')
    assert(
      fix1.heelHeight <= HEEL_CONST.MAX_THOMAS_HEEL_MM,
      'Heel height reduced within MAX_THOMAS_HEEL_MM'
    )
    assertEqual(fix1.heelTipOffsetMm, 0, 'Heel tip offset reset to 0mm')

    const flatValgusInput = createBaseInput({
      soleType: 'flat',
      heelHeight: 65,
      toeThickness: 10,
      pronationDeg: -7,
      weightKg: 82,
    })
    const fix2 = suggestAutoFix(flatValgusInput)
    assertEqual(fix2.resolved, true, 'Resolved flat overload')
    assertEqual(
      fix2.soleType,
      'flat',
      'Preserved flat soleType without forcibly switching to thomas'
    )
  })

  // 7. Разделение описаний Томаса и рокера + флаги модельной оценки
  test('7. Разделение описаний Томаса и рокера + флаги модельной оценки', () => {
    const thomasEng = computeEngineering(
      createBaseInput({ soleType: 'thomas', heelHeight: 26, toeThickness: 12 })
    )
    const rockerEng = computeEngineering(
      createBaseInput({ soleType: 'rocker', heelHeight: 26, toeThickness: 14, rockerAngle: 18 })
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

  // 8. Составной расчёт геленка 65Г (балка на упругом основании Винклера + 10^6 циклов: плоский vs желобчатый профиль)
  test('8. Модуль shankEngineering: сравнение плоского и желобчатого профилей геленка 65Г и расчёт ресурса 10^6 циклов', () => {
    const flatShankEng = computeEngineering(
      createBaseInput({
        weightKg: 92,
        heelHeight: 32,
        toeThickness: 10,
        shankProfilePreference: 'flat_plate',
      })
    )
    const flutedShankEng = computeEngineering(
      createBaseInput({
        weightKg: 92,
        heelHeight: 32,
        toeThickness: 10,
        shankProfilePreference: 'fluted_ribbed',
      })
    )

    assert(
      flutedShankEng.shankEngineering.sectionModulusMm3 >
        flatShankEng.shankEngineering.sectionModulusMm3 * 2.0,
      'Fluted ribbed shank has >2x higher section modulus W_x than flat plate'
    )
    assert(
      flutedShankEng.shankEngineering.estimatedBendingStressMpa <
        flatShankEng.shankEngineering.estimatedBendingStressMpa,
      'Fluted ribbed shank significantly reduces bending stress σ_max'
    )
    assert(
      flutedShankEng.shankEngineering.fatigueSafetyFactor >
        flatShankEng.shankEngineering.fatigueSafetyFactor,
      'Fluted ribbed shank increases 10^6-cycle fatigue safety factor k_fat'
    )
    assert(
      flutedShankEng.shankEngineering.winklerFoundationReliefPct > 0,
      'Winkler elastic foundation relief from arch support and Thomas heel is positive'
    )
  })

  // 9. Калиброванная 2D гауссова педобарография по головкам M1–M5 и разгрузка пелотом Зейца
  test('9. 2D гауссова педобарография M1–M5: перенос нагрузки на M2–M3 при HV и эффект пелота Зейца', () => {
    const hvEng = computeEngineering(
      createBaseInput({
        toeShape: 'greek',
        halluxValgusDeg: 24,
        heelHeight: 30,
        toeThickness: 10,
      })
    )
    const pm = hvEng.pressureModel
    assertEqual(pm.isCalibratedGaussianModel, true, 'isCalibratedGaussianModel is true')
    assertEqual(pm.gaussianCenters.length, 8, '8 Gaussian pressure centers built for 3D map')
    assert(
      pm.kpaM1 > 0 && pm.kpaM2 > 0 && pm.kpaM3 > 0 && pm.kpaM4 > 0 && pm.kpaM5 > 0,
      'All 5 metatarsal heads M1..M5 have positive pressure values'
    )
    assert(
      hvEng.requiresMetatarsalPad && pm.pelotteReliefKpa > 0,
      'Zeitz metatarsal pad provides positive pressure relief (pelotteReliefKpa > 0) on central rays'
    )
  })

  // 10. Раздельные профили левой и правой полупар (LeftRightFootProfile)
  test('10. Независимые профили левой и правой стопы (LeftRightFootProfile) и двухколоночное ТЗ', () => {
    const std = getStandardGirths('female', 38)
    const pairedInput = createBaseInput({
      independentSides: true,
      activeSide: 'right',
      lengthAsymmetryMm: 6,
      asymmetrySide: 'left',
      leftProfile: {
        ballGirthMm: std.ballGirthMm + 10,
        instepGirthMm: std.instepGirthMm + 6,
        obliqueGirthMm: std.obliqueGirthMm + 4,
        pronationDeg: -6,
        halluxValgusDeg: 20,
        archType: 'flat',
        toeShape: 'egyptian',
      },
      rightProfile: {
        ballGirthMm: std.ballGirthMm - 5,
        instepGirthMm: std.instepGirthMm,
        obliqueGirthMm: std.obliqueGirthMm,
        pronationDeg: 0,
        halluxValgusDeg: 4,
        archType: 'normal',
        toeShape: 'greek',
      },
    })

    const eng = computeEngineering(pairedInput)
    const { left, right } = eng.rx.pairedRx

    assertEqual(eng.rx.pairedRx.independentSides, true, 'independentSides enabled')
    assertEqual(left.ballBuildUpMm, 10, 'Left half-pair has +10mm ball build-up')
    assertEqual(right.ballBuildUpMm, -5, 'Right half-pair has -5mm ball reduction')
    assert(left.medialBunionPocketMm > 0, 'Left half-pair has HV bunion pocket')
    assertEqual(right.medialBunionPocketMm, 0, 'Right half-pair has 0mm HV pocket')
    assertEqual(
      right.compensatoryInsoleMm,
      5,
      'Shorter right half-pair receives +5mm compensatory insole'
    )
    assertEqual(
      left.compensatoryInsoleMm,
      0,
      'Longer left half-pair receives 0mm compensatory insole'
    )
    // Поскольку activeSide === 'right', основная сцена отражает правую полупару
    assertEqual(eng.rx.ballBuildUpMm, -5, 'Active scene reflects right half-pair (-5mm)')
  })

  // 11. Специализированная валидация геометрии колодки, инвариантов и клинических эвристик
  test('11. Система валидации validateLastGeometry: инварианты, блокировка отрицательного дропа и эвристики', () => {
    const normalEng = computeEngineering(
      createBaseInput({ soleType: 'thomas', heelHeight: 24, toeThickness: 14, pronationDeg: -4 })
    )
    assertEqual(
      normalEng.validation.allInvariantsPassed,
      true,
      'All geometric chain invariants pass on valid input'
    )
    assertEqual(
      normalEng.validation.hasCriticalErrors,
      false,
      'No critical errors on balanced orthopedic input'
    )

    // Отрицательный дроп обязан блокировать зелёный статус (возвращать ERROR в computeAudit)
    const negDropEng = computeEngineering(
      createBaseInput({ heelHeight: 12, toeThickness: 18 })
    )
    const negDropAudit = computeAudit(negDropEng, 'thomas', 12, 15)
    assertEqual(
      negDropAudit.status,
      'ERROR',
      'Negative drop (netRise < 0) strictly blocks green status with ERROR'
    )
    assertEqual(
      negDropEng.validation.hasCriticalErrors,
      true,
      'Validation flags negative drop as critical error'
    )

    // Проверка клинической эвристики для полой стопы (cavus) при высоком перепаде
    const cavusHighDrop = computeEngineering(
      createBaseInput({ archType: 'cavus', heelHeight: 34, toeThickness: 10 })
    )
    const cavusRule = cavusHighDrop.validation.clinicalHeuristics.find(
      (r) => r.code === 'CLIN_CAVUS_DROP'
    )
    assert(cavusRule !== undefined && !cavusRule.passed, 'CLIN_CAVUS_DROP heuristic triggers on cavus + high drop')
  })

  return { passed, details }
}

const result = runAllHeelTests()
console.log('ALL ' + String(result.passed) + ' TEST SUITES PASSED:')
for (const line of result.details) {
  console.log('  ' + String(line))
}
