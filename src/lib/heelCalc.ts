// src/lib/heelCalc.ts

export type Gender = 'female' | 'male'
export type SoleType = 'flat' | 'thomas' | 'rocker'
export type RockerType = 'forefoot' | 'heelToToe' | 'negative'
export type ToeShape = 'egyptian' | 'greek' | 'roman'
export type ArchMorphology = 'flat' | 'normal' | 'cavus'
export type LastApexType = 'medial_straight' | 'oblique_anatomical' | 'wide_square'
export type AsymmetrySide = 'left' | 'right' | 'equal'
export type BuildUpAction = 'build_up' | 'reduce' | 'neutral'

/**
 * Единый реестр антропометрических, биомеханических и конструктивных констант.
 * Все эмпирические коэффициенты задокументированы с указанием физического смысла
 * и отраслевого источника (ГОСТ 3927 / ЦНИИКП / ортопедическая биомеханика стопы).
 */
export const HEEL_CONST = {
  /** Шаг штихмассовой системы (1 Paris Point = 2/3 см = 6.67 мм) */
  STEP_TO_MM: 6.67,
  /** Поправка перехода от штихмассового размера (EU) к базовой длине стопы: L_foot = (Size - 1.5) * 6.67 */
  SHOE_SIZE_TO_FOOT_OFFSET_PARIS: 1.5,
  /** Доля учёта межосевой асимметрии при расчёте длины опорной (длинной) стопы относительно базового размера */
  ASYMMETRY_LONGER_FOOT_FACTOR: 0.5,

  /** Базовый минимальный функциональный припуск перед пальцами (женская египетская стопа, мм) */
  FUNCTIONAL_ALLOWANCE: 8,
  /** Базовый функциональный свободный припуск в носочной части (мм) */
  BASE_TOE_FREE_SPACE_MM: 10,
  /** Дополнительный свободный припуск для мужской колодки из-за большей длины дистальных фаланг (мм) */
  MALE_TOE_EXTRA_MM: 2,
  /** Конструктивно-фасонный припуск декоративной части мыска колодки сверх функционального припуска (мм) */
  LAST_FASHION_ALLOWANCE_MM: 6,
  /** Эталонные морфологические поправки припуска под форму пальцев (мм): египетская (8), римская (9), греческая (11 — удлинённый II луч) */
  TOE_ALLOWANCE_EGYPTIAN_MM: 8,
  TOE_ALLOWANCE_ROMAN_MM: 9,
  TOE_ALLOWANCE_GREEK_MM: 11,

  /** Эмпирический антропометрический коэффициент отношения ширины следа в пучках W_пуч к обхвату пучков O_п (ЦНИИКП: ~0.415) */
  FOREFOOT_WIDTH_TO_GIRTH_RATIO: 0.415,
  /** Эмпирический коэффициент отношения ширины пятки W_пят к обхвату пучков O_п (ЦНИИКП: ~0.274) */
  HEEL_WIDTH_TO_GIRTH_RATIO: 0.274,

  /** Порог угла Hallux Valgus (°), начиная с которого требуется формирование разгрузочного кармана под головку M1 */
  HV_POCKET_THRESHOLD_DEG: 10,
  /** Базовый угол нормы I плюснефалангового сустава (°) для отсчёта глубины кармана HV */
  HV_BASE_NORMAL_DEG: 8,
  /** Коэффициент глубины медиального кармана M1 (мм на каждый градус отклонения HV свыше 8°) */
  HV_POCKET_FACTOR: 0.35,
  /** Максимально допустимая глубина локального кармана под косточку M1 без искажения затяжной кромки (мм) */
  MAX_BUNION_POCKET_MM: 8,
  /** Коэффициент дополнительного медиального смещения апекса мыска при Hallux Valgus (мм/град) */
  HV_APEX_SHIFT_FACTOR: 0.25,

  /** Порог разницы длин стоп ΔL (мм), начиная с которого назначается компенсационная полустелька/вкладыш в короткую полупару */
  COMPENSATORY_INSOLE_THRESHOLD_MM: 4,
  /** Доля продольной асимметрии стоп, компенсируемая объёмным вкладышем/полустелькой в короткую полупару */
  COMPENSATORY_INSOLE_RATIO: 0.75,

  /** Максимальная толщина платформы под пучками (мм) */
  MAX_TOE: 60,
  /** Максимальный подъём носочной пружины / рокера (мм) */
  MAX_LIFT: 50,
  /** Максимальная биомеханически эффективная высота каблука Томаса (мм); выше 35 мм теряется поддержка ладьевидной кости */
  MAX_THOMAS_HEEL_MM: 35,
  /** Максимальная безопасная высота пятки для рокерной подошвы-танкетки (мм) */
  MAX_ROCKER_HEEL_MM: 45,
  /** Максимальный безопасный перепад высот (netRise) для жёсткой рокерной подошвы (мм) */
  MAX_ROCKER_NET_RISE_MM: 22,

  /** Предельно допустимый оценочный изгибающий момент на стальной геленок 65Г (Н·м) */
  MAX_SHANK_MOMENT_NM: 28,
  /** Критический угол продольного уклона колодки (°), вызывающий перегрузку плюснефаланговых суставов */
  CRITICAL_ANGLE: 16,
  /** Граница комфортного физиологического угла продольного уклона (°) */
  COMFORT_ANGLE: 11.5,
  /** Целевой безопасный угол продольного уклона при автоподборе (°) */
  SAFE_ANGLE: 10.5,

  /** Критическая доля нагрузки на передний отдел стопы (%) */
  CRITICAL_LOAD: 75,
  /** Порог модельной оценки пикового плантарного давления в пучках (кПа), требующий разгрузки */
  CRITICAL_KPA: 245,
  /** Порог модельной оценки давления для назначения метатарзального пелота Зейца (кПа) */
  PELOTTE_PRESSURE_THRESHOLD_KPA: 215,
  /** Порог нагрузки переднего отдела (%) для назначения пелота Зейца */
  PELOTTE_LOAD_THRESHOLD_PCT: 68,

  /** Максимальный конструктивный угол переднего рокера (°) */
  MAX_ROCKER_ANGLE: 28,
  /** Максимальный коэффициент снижения нагрузки на пучки за счёт перекатной рокерной подошвы (32%) */
  ROCKER_MITIGATION_CAP: 0.32,
  /** Коэффициент разгрузки переднего отдела за счёт удлинения груди каблука Томаса (снижение на 9%) */
  THOMAS_LOAD_RELIEF_FACTOR: 0.91,

  /** Относительная продольная координата центра пяточного опирания (15% от длины колодки L_last) */
  HEEL_CENTER_RATIO: 0.15,
  /** Относительная продольная координата переднего среза (груди) стандартного каблука (25% от L_last) */
  HEEL_FRONT_BASE_RATIO: 0.25,
  /** Относительная продольная координата гребня прямого взъёма (52% от L_last) */
  INSTEP_POS_RATIO: 0.52,
  /** Смещение центра головки I плюсневой кости (M1) проксимальнее расчётной линии пучков (мм) */
  M1_PROXIMAL_FROM_BALL_MM: 5,
  /** Антропометрическое проксимальное смещение головки V плюсневой кости (M5) относительно M1 (8.2% от длины стопы L_foot) */
  M5_PROXIMAL_TO_FOOT_RATIO: 0.082,
  /** Эффективная поперечная база между центрами головок M1 и M5 в долях ширины пучков (82% от W_пуч) */
  EFFECTIVE_METATARSAL_SPAN_RATIO: 0.82,
  /** Позиция вершины метатарзального пелота Зейца проксимальнее головки M1 (за головками II–IV плюсневых костей, мм) */
  PELOTTE_PROXIMAL_OFFSET_MM: 7,

  /**
   * Ограничения смещения оси набойки каблука (heelTipOffsetMm):
   * - Допуск безопасности: от -2 мм (назад) до +5 мм (вперёд).
   * - При смещении < -2 мм назад резко растёт консольный пролёт геленка 65Г под кубовидной костью (риск излома).
   * - При смещении > +5 мм вперёд (без специальной груди Томаса) нарушается устойчивость начального контакта пятки.
   * - Диапазон слайдера в UI (-6...+8 мм) шире безопасного допуска, чтобы позволять моделировать и диагностировать ошибки сборки.
   */
  MIN_SAFE_HEEL_OFFSET_MM: -2,
  MAX_SAFE_HEEL_OFFSET_MM: 5,
  MAX_HEEL_OFFSET_MM: 5,
  MIN_HEEL_OFFSET_SLIDER_MM: -6,
  MAX_HEEL_OFFSET_SLIDER_MM: 8,

  /** Пороги фронтального завала пятки (пронация/супинация, °) */
  CRITICAL_PRONATION_DEG: 5.5,
  WARN_PRONATION_DEG: 3,

  /** Базовая доля нагрузки на передний отдел стопы при нулевом перепаде высот (%) */
  BASE_FOREFOOT_LOAD_PCT: 44,
  /** Коэффициент прироста доли нагрузки на передний отдел от тангенса продольного наклона (netRise / lEff) */
  SLOPE_TO_LOAD_GAIN: 102,
  /** Квазистатический коэффициент вертикальной реакции опоры в фазе переката (1.15 от статического веса m*g) */
  QUASI_STATIC_GAIT_FACTOR: 1.15,
  /** Эталонная длина стопы для масштабирования контактной площади (мм) */
  REF_FOOT_LENGTH_MM: 245,
  /** Эталонная площадь опоры переднего отдела стопы при длине 245 мм (см²) */
  REF_FOREFOOT_CONTACT_AREA_CM2: 46,
  /** Эталонная площадь опоры пятки при длине 245 мм (см²) */
  REF_HEEL_CONTACT_AREA_CM2: 33,
  /** Модельный форм-фактор концентрации пикового давления под головками M1–M5 */
  FOREFOOT_PEAK_CONCENTRATION_FACTOR: 1.55,
  /** Модельный форм-фактор концентрации пикового давления под пяточным бугром */
  HEEL_PEAK_CONCENTRATION_FACTOR: 1.45,

  /** Максимальное число шагов итеративного алгоритма автоподбора (suggestAutoFix) */
  MAX_AUTO_FIX_ITERATIONS: 7,
} as const

export const ROCKER_PRESETS: Record<RockerType, { angle: number; startPct: number }> = {
  forefoot: { angle: 15, startPct: 60 },
  heelToToe: { angle: 18, startPct: 56 },
  negative: { angle: 10, startPct: 65 },
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
  asymmetrySide?: AsymmetrySide
}

export interface MathFormulaStep {
  title: string
  given: string
  formula: string
  substitution: string
  result: string
  meaning: string
}

/**
 * ЕДИНЫЙ ИСТОЧНИК ГЕОМЕТРИЧЕСКОЙ ПРАВДЫ (Single Source of Truth).
 * Вычисляется ровно один раз в computeEngineering и передаётся во все модули:
 * - 2D SVG (heelGeometry.ts / HeelCanvas.tsx)
 * - 3D сцену (HeelScene3D.tsx)
 * - Экспертный отчёт и ТЗ мастеру (OrthoExpertReportModal.tsx / HeelCalcPage.tsx)
 */
export interface LastGeometryModel {
  // 1. Длины и асимметрия стоп (мм)
  footLengthMm: number
  leftFootLengthMm: number
  rightFootLengthMm: number
  longerFootSide: AsymmetrySide
  shorterFootSide: 'left' | 'right' | 'none'
  lengthAsymmetryMm: number
  compensatoryInsoleHalfPairMm: number
  toeShapeAllowanceMm: number
  toeFreeSpaceMm: number
  fashionAllowanceMm: number
  lastLengthMm: number

  // 2. Продольные координаты по оси X от задника пятки (0 мм) до вершины мыска (lastLengthMm)
  xHeelMm: number
  xHeelCenterMm: number
  xHeelTipCenterMm: number
  xHeelBackBottomMm: number
  xHeelFrontBaseMm: number
  xThomasFrontMm: number
  xShankStartMm: number
  xShankEndMm: number
  xInstepMm: number
  xPelotteMm: number
  xApexM5Mm: number
  xApexM1Mm: number
  xBallMm: number
  xToeMm: number

  // 3. Нормализованные продольные координаты u ∈ [0, 1] (X / lastLengthMm) для 3D и 2D
  uHeelCenter: number
  uHeelFrontBase: number
  uThomasFront: number
  uShankEnd: number
  uInstep: number
  uPelotte: number
  uApexM5: number
  uApexM1: number
  uBall: number

  // 4. Вертикальные параметры профиля (мм)
  heelHeightMm: number
  toeThicknessMm: number
  netRiseMm: number
  rockerLiftMm: number
  instepBaseHeightMm: number
  toeBoxHeightMm: number

  // 5. Поперечная геометрия, апекс, Hallux Valgus и модификации обхватов (build-up / снятие)
  standardForefootWidthMm: number
  forefootWidthMm: number
  effectiveForefootWidthWithBunionMm: number
  heelWidthMm: number
  ballBuildUpMm: number
  ballModAction: BuildUpAction
  instepBuildUpMm: number
  instepModAction: BuildUpAction
  medialBunionPocketMm: number
  bunionPocketCenterMm: number
  bunionPocketRadiusMm: number
  toeShape: ToeShape
  lastApexType: LastApexType
  lastApexLabel: string
  anatomicalFootApexOffsetMm: number
  toeBoxShiftMedialMm: number
  metatarsalObliqueAngleDeg: number

  // 6. Параметры пелота Зейца и опорной конструкции подошвы
  requiresMetatarsalPad: boolean
  metatarsalPadPosMm: number | null
  metatarsalPadHeightMm: number | null
  pelotteHalfLengthMm: number
  soleType: SoleType
  thomasHeelType: 'none' | 'medial' | 'lateral'
  thomasExtensionMm: number
  effectiveHeelTipOffsetMm: number
  rockerAngleDeg: number
  rockerStartPct: number
  rockerZoneLengthMm: number
  shankLengthMm: number
  steelThicknessMm: number
  carbonInsertThicknessMm: number
}

/**
 * Архитектурная модель прочностного расчёта геленка / упругого каркаса подошвы.
 * Текущий расчёт момента является инженерной аналитической оценкой (консольно-балочное приближение)
 * и содержит геометрические характеристики сечения для последующей калибровки (МКЭ / стендовые испытания).
 */
export interface ShankEngineeringModel {
  isAnalyticalEstimate: true
  material: 'steel_65G' | 'carbon_composite'
  shankLengthMm: number
  shankWidthMm: number
  steelThicknessMm: number
  effectiveMomentArmMm: number
  bendingMomentNm: number
  maxAllowedMomentNm: number
  /** Осевой момент сопротивления изгибу прямоугольного сечения W_x = b * h^2 / 6 (мм³) */
  sectionModulusMm3: number
  /** Оценочное нормальное напряжение изгиба в стальной пластине 65Г (МПа) с учётом доли момента, воспринимаемой геленком */
  estimatedBendingStressMpa: number
  /** Оценочный коэффициент запаса прочности относительно условного предела текучести стали 65Г (780 МПа) */
  safetyFactor: number
  isOverloaded: boolean
}

export interface MasterPrescription {
  widthCode: string
  ballBuildUpMm: number
  ballModAction: BuildUpAction
  ballModSummary: string
  instepBuildUpMm: number
  instepModAction: BuildUpAction
  instepModSummary: string
  obliqueEntryDeltaMm: number
  requiresZipOrLaceWarning: boolean
  forefootWidthMm: number
  effectiveForefootWidthWithBunionMm: number
  standardForefootWidthMm: number
  heelWidthMm: number
  widthIndexPct: number
  lastApexType: LastApexType
  lastApexLabel: string
  anatomicalFootApexOffsetMm: number
  toeBoxShiftMedialMm: number
  toeBoxHeightMm: number
  toeFreeSpaceMm: number
  medialBunionPocketMm: number
  asymmetrySide: AsymmetrySide
  leftFootLengthMm: number
  rightFootLengthMm: number
  longerFootSide: AsymmetrySide
  shorterFootSide: 'left' | 'right' | 'none'
  compensatoryInsoleHalfPairMm: number
  asymmetrySummary: string
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
  soleConstructionSummary: string
  metatarsalObliqueAngleDeg: number
  calculations: MathFormulaStep[]
}

export interface HeelEngineering {
  /** Единый источник геометрической правды для 2D, 3D и ТЗ */
  geometryModel: LastGeometryModel
  /** Архитектурный модуль оценки прочности геленка 65Г / карбоновой пластины */
  shankEngineering: ShankEngineeringModel
  /** Явный признак того, что пиковое давление (кПа) и координаты ЦД (COP) являются расчётной модельной оценкой */
  isPressureAndCopModelEstimate: true
  lastLengthMm: number
  footLengthMm: number
  lEff: number
  netRise: number
  internalSlope: number
  forefootLoad: number
  heelLoad: number
  loadM1Pct: number
  loadM5Pct: number
  /** Модельная оценка пикового плантарного давления под пучками (кПа) */
  peakForefootPressureKpa: number
  /** Модельная оценка пикового плантарного давления под пяткой (кПа) */
  peakHeelPressureKpa: number
  /** Модельная оценка продольной координаты центра давления COP от задника (мм) */
  copLongitudinalMm: number
  /** Модельная оценка медио-латерального смещения центра давления COP (мм) */
  copLateralMm: number
  shankBendingMomentNm: number
  shankOverloaded: boolean
  thomasTooHigh: boolean
  rockerTooHigh: boolean
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

export type AutoFixResolutionStatus = 'RESOLVED' | 'PARTIAL_OR_UNRESOLVABLE' | 'ALREADY_OPTIMAL'

export interface AutoFixResult {
  soleType: SoleType
  toeThickness: number
  heelHeight: number
  heelTipOffsetMm: number
  rockerAngle: number
  rockerStartPct: number
  status: AutoFixResolutionStatus
  iterations: number
  resolved: boolean
  summaryMessage: string
  appliedChanges: string[]
  remainingIssues: string[]
}

/**
 * Определяет тип технологической операции на колодке по знаку отклонения обхвата:
 * > 0 -> наращивание (налепка кожи/пласта на колодку)
 * < 0 -> снятие материала (уменьшение объёма колодки / компенсационный вкладыш)
 * === 0 -> базовая геометрия без модификации
 */
export function getBuildUpAction(deltaMm: number): BuildUpAction {
  if (deltaMm > 0) return 'build_up'
  if (deltaMm < 0) return 'reduce'
  return 'neutral'
}

export function formatBallModification(ballBuildUpMm: number, short = false): string {
  if (ballBuildUpMm > 0) {
    return short
      ? ('Налепка пучков +' + String(ballBuildUpMm) + ' мм')
      : ('Наращивание (налепка) в пучках +' + String(ballBuildUpMm) + ' мм')
  }
  if (ballBuildUpMm < 0) {
    return short
      ? ('Снятие в пучках ' + String(ballBuildUpMm) + ' мм')
      : ('Снятие материала (уменьшение) в пучках ' + String(ballBuildUpMm) + ' мм')
  }
  return short ? 'База пучков 0 мм' : 'Базовая геометрия пучков (0 мм)'
}

export function formatInstepModification(instepBuildUpMm: number, short = false): string {
  if (instepBuildUpMm > 0) {
    return short
      ? ('Налепка на гребень +' + String(instepBuildUpMm) + ' мм')
      : ('Наращивание (налепка) на гребень взъёма +' + String(instepBuildUpMm) + ' мм')
  }
  if (instepBuildUpMm < 0) {
    return short
      ? ('Снятие / вкладыш ' + String(instepBuildUpMm) + ' мм')
      : ('Снятие материала с гребня (уменьшение / вкладыш) ' + String(instepBuildUpMm) + ' мм')
  }
  return short ? 'Взъём в норме 0 мм' : 'Базовая геометрия прямого взъёма (0 мм)'
}

/**
 * Строго разделяет описание конструкции каблука Томаса, рокерной подошвы с карбоном и стандартного каблука.
 * Исключает смешивание каблука Томаса и рокерной карбоновой пластины в одном описании.
 */
export function describeSoleConstruction(params: {
  soleType: SoleType
  netRiseMm: number
  heelHeightMm: number
  toeThicknessMm: number
  thomasHeelType: 'none' | 'medial' | 'lateral'
  thomasExtensionMm: number
  rockerAngleDeg: number
  rockerStartPct: number
  carbonInsertThicknessMm: number
  shankLengthMm: number
  steelThicknessMm: number
}): string {
  const {
    soleType,
    netRiseMm,
    thomasHeelType,
    thomasExtensionMm,
    rockerAngleDeg,
    rockerStartPct,
    carbonInsertThicknessMm,
    shankLengthMm,
    steelThicknessMm,
  } = params

  if (soleType === 'thomas') {
    const sideLabel = thomasHeelType === 'lateral' ? 'с наружной (латеральной) стороны' : 'с внутренней (медиальной) стороны'
    return ('Ортопедический каблук Томаса с удлинением груди +' + String(thomasExtensionMm) + ' мм ' + String(sideLabel) + ' и стальным геленком 65Г (' + String(shankLengthMm) + '×' + String(steelThicknessMm) + ' мм)')
  }
  if (soleType === 'rocker') {
    return ('Рокерная перекатная подошва (угол переката ' + String(rockerAngleDeg) + '°, старт на ' + String(rockerStartPct) + '% длины) с интегрированной карбоновой пластиной толщиной ' + String(carbonInsertThicknessMm) + ' мм')
  }
  return ('Стандартный каблук (чистый перепад высот ' + String(netRiseMm) + ' мм) со стальным геленком 65Г (' + String(shankLengthMm) + '×' + String(steelThicknessMm) + ' мм)')
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
    asymmetrySide,
  } = input

  const clampedWeight = Math.max(35, Math.min(160, weightKg))
  const hvDeg = Math.max(0, Math.min(40, halluxValgusDeg))
  const rawAsymMm = Math.max(0, Math.min(15, lengthAsymmetryMm))

  // 1. Разрешение стороны асимметрии стоп (left longer / right longer / equal)
  const resolvedAsymmetrySide: AsymmetrySide =
    rawAsymMm === 0 || asymmetrySide === 'equal'
      ? 'equal'
      : asymmetrySide === 'right'
        ? 'right'
        : 'left'

  const effectiveAsymMm = resolvedAsymmetrySide === 'equal' ? 0 : rawAsymMm

  /**
   * ЕДИНАЯ ФОРМУЛА ДЛИНЫ СТОПЫ И КОЛОДКИ (зафиксирована для всех модулей):
   * 1) Длина опорной (длинной) стопы:
   *    footLengthMm = round((shoeSize - 1.5) * 6.67 + effectiveAsymMm * 0.5)
   * 2) Свободный функциональный припуск перед пальцами:
   *    toeFreeSpaceMm = 10 + (male ? 2 : 0) + (toeShapeAllowanceMm - 8)
   * 3) Полная конструктивная длина следа колодки:
   *    lastLengthMm = round(footLengthMm + toeFreeSpaceMm + 6)
   */
  const footLengthMm = Math.round(
    (shoeSize - C.SHOE_SIZE_TO_FOOT_OFFSET_PARIS) * C.STEP_TO_MM +
      effectiveAsymMm * C.ASYMMETRY_LONGER_FOOT_FACTOR
  )
  const shorterFootLengthMm = Math.max(150, footLengthMm - effectiveAsymMm)

  const leftFootLengthMm =
    resolvedAsymmetrySide === 'right' ? shorterFootLengthMm : footLengthMm
  const rightFootLengthMm =
    resolvedAsymmetrySide === 'left' ? shorterFootLengthMm : footLengthMm
  const shorterFootSide: 'left' | 'right' | 'none' =
    resolvedAsymmetrySide === 'left'
      ? 'right'
      : resolvedAsymmetrySide === 'right'
        ? 'left'
        : 'none'

  const toeShapeAllowanceMm =
    toeShape === 'greek'
      ? C.TOE_ALLOWANCE_GREEK_MM
      : toeShape === 'roman'
        ? C.TOE_ALLOWANCE_ROMAN_MM
        : C.TOE_ALLOWANCE_EGYPTIAN_MM
  const toeFreeSpaceMm =
    C.BASE_TOE_FREE_SPACE_MM +
    (gender === 'male' ? C.MALE_TOE_EXTRA_MM : 0) +
    (toeShapeAllowanceMm - C.TOE_ALLOWANCE_EGYPTIAN_MM)
  const fashionAllowanceMm = C.LAST_FASHION_ALLOWANCE_MM
  const lastLengthMm = Math.round(footLengthMm + toeFreeSpaceMm + fashionAllowanceMm)

  // 2. Поперечные обхваты, полнота и модификации колодки (с учётом знака!)
  const std = getStandardGirths(gender, shoeSize)
  const ballBuildUpMm = ballGirthMm - std.ballGirthMm
  const instepBuildUpMm = instepGirthMm - std.instepGirthMm
  const obliqueEntryDeltaMm = obliqueGirthMm - std.obliqueGirthMm

  const ballModAction = getBuildUpAction(ballBuildUpMm)
  const instepModAction = getBuildUpAction(instepBuildUpMm)
  const ballModSummary = formatBallModification(ballBuildUpMm)
  const instepModSummary = formatInstepModification(instepBuildUpMm)

  const standardForefootWidthMm = parseFloat(
    (std.ballGirthMm * C.FOREFOOT_WIDTH_TO_GIRTH_RATIO).toFixed(1)
  )
  const forefootWidthMm = parseFloat(
    (ballGirthMm * C.FOREFOOT_WIDTH_TO_GIRTH_RATIO).toFixed(1)
  )
  const heelWidthMm = parseFloat((ballGirthMm * C.HEEL_WIDTH_TO_GIRTH_RATIO).toFixed(1))
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
  const widthCode = widthMap[clampedW] || ('F (' + String(clampedW) + ')')
  const requiresZipOrLaceWarning =
    obliqueEntryDeltaMm >= 12 || instepBuildUpMm >= 10 || archType === 'cavus'

  // 3. Морфология пальцев (египетская / греческая / римская), апекс и карман под Hallux Valgus
  const anatomicalFootApexOffsetMm =
    toeShape === 'egyptian' ? 9 : toeShape === 'greek' ? -2 : 3

  const medialBunionPocketMm =
    hvDeg >= C.HV_POCKET_THRESHOLD_DEG
      ? Math.min(
          C.MAX_BUNION_POCKET_MM,
          Math.round((hvDeg - C.HV_BASE_NORMAL_DEG) * C.HV_POCKET_FACTOR)
        )
      : 0

  const hvExtraApexShiftMm =
    hvDeg >= C.HV_POCKET_THRESHOLD_DEG
      ? Math.round((hvDeg - C.HV_BASE_NORMAL_DEG) * C.HV_APEX_SHIFT_FACTOR)
      : 0

  let lastApexType: LastApexType = 'medial_straight'
  let lastApexLabel = 'Прямой апекс (Straight Medial Apex — по оси I луча)'
  let toeBoxShiftMedialMm = 5

  if (toeShape === 'greek') {
    if (hvDeg < 15) {
      lastApexType = 'oblique_anatomical'
      lastApexLabel =
        hvDeg >= C.HV_POCKET_THRESHOLD_DEG
          ? 'Косой анатомический апекс (II луч + медиальная коррекция HV)'
          : 'Косой апекс (Oblique Apex — вершина по II лучу)'
      toeBoxShiftMedialMm = hvExtraApexShiftMm
    } else {
      lastApexType = 'medial_straight'
      lastApexLabel =
        'Орто-прямой медиальный апекс (коррекция выраженного HV при греческой стопе)'
      toeBoxShiftMedialMm = 3 + hvExtraApexShiftMm
    }
  } else if (toeShape === 'roman') {
    lastApexType = 'wide_square'
    lastApexLabel =
      hvDeg >= C.HV_POCKET_THRESHOLD_DEG
        ? 'Широкий трапециевидный апекс (I–III лучи + разгрузка HV)'
        : 'Широкий трапециевидный апекс (I–III лучи)'
    toeBoxShiftMedialMm = 3 + hvExtraApexShiftMm
  } else {
    lastApexType = 'medial_straight'
    lastApexLabel =
      hvDeg >= C.HV_POCKET_THRESHOLD_DEG
        ? 'Орто-прямой медиальный апекс (разгрузка I луча)'
        : 'Прямой апекс (Straight Medial Apex — по оси I луча)'
    toeBoxShiftMedialMm = 5 + hvExtraApexShiftMm
  }

  const effectiveForefootWidthWithBunionMm = parseFloat(
    (forefootWidthMm + medialBunionPocketMm).toFixed(1)
  )
  const toeBoxHeightMm = archType === 'cavus' ? 28 : hvDeg >= 15 ? 25 : 22

  // 4. Компенсация асимметрии длины стоп
  const compensatoryInsoleHalfPairMm =
    effectiveAsymMm >= C.COMPENSATORY_INSOLE_THRESHOLD_MM
      ? Math.round(effectiveAsymMm * C.COMPENSATORY_INSOLE_RATIO)
      : 0

  let asymmetrySummary =
    'Стопы равной длины (ΔL = 0 мм). Парные колодки без дополнительной компенсации.'
  if (effectiveAsymMm > 0) {
    const longerName = resolvedAsymmetrySide === 'left' ? 'Левая' : 'Правая'
    const shorterAccusative = resolvedAsymmetrySide === 'left' ? 'правую' : 'левую'
    const shorterGenitive = resolvedAsymmetrySide === 'left' ? 'правой' : 'левой'
    if (compensatoryInsoleHalfPairMm > 0) {
      asymmetrySummary = (String(longerName) + ' стопа длиннее на ' + String(effectiveAsymMm) + ' мм (Лев: ' + String(leftFootLengthMm) + ' мм, Прав: ' + String(rightFootLengthMm) + ' мм). Подбор базовой колодки по длинной стопе; в ' + String(shorterAccusative) + ' полупару установить компенсационную полустельку/вкладыш +' + String(compensatoryInsoleHalfPairMm) + ' мм и выполнить затяжку носка ' + String(shorterGenitive) + ' полупары.')
    } else {
      asymmetrySummary = (String(longerName) + ' стопа длиннее на ' + String(effectiveAsymMm) + ' мм (Лев: ' + String(leftFootLengthMm) + ' мм, Прав: ' + String(rightFootLengthMm) + ' мм). Асимметрия ≤ 3 мм в пределах физиологического допуска — полустелька не требуется.')
    }
  }

  // 5. Жёсткость стельки, задника и стабилизация пятки
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
    hvDeg >= C.HV_POCKET_THRESHOLD_DEG ||
    Math.abs(ballBuildUpMm) >= 6 ||
    clampedWeight >= 90

  let insoleType: 'neutral' | 'supinator' | 'pronator' = 'neutral'
  let archSupportHeightMm = archType === 'cavus' ? 12 : archType === 'flat' ? 11 : 7
  let medialHeelWedgeMm = 0
  let lateralWedgeMm = 0
  let recommendThomasHeel = false
  let recommendedThomasMm = 0

  if (clampedPronation <= -2) {
    const valgusAbs = Math.abs(clampedPronation)
    insoleType = 'supinator'
    archSupportHeightMm = Math.min(15, Math.round(9 + valgusAbs * 0.45))
    medialHeelWedgeMm = Math.min(7, Math.max(2, Math.round(valgusAbs * 0.5 * weightScale)))
    recommendThomasHeel = valgusAbs >= 3.5
    recommendedThomasMm = Math.min(
      26,
      Math.round((13 + valgusAbs * 0.95) * Math.min(1.15, weightScale))
    )
  } else if (clampedPronation >= 2) {
    const varusAbs = Math.abs(clampedPronation)
    insoleType = 'pronator'
    archSupportHeightMm = Math.max(0, Math.round(4 - varusAbs * 0.4))
    lateralWedgeMm = Math.min(7, Math.max(2, Math.round(varusAbs * 0.5 * weightScale)))
    recommendThomasHeel = varusAbs >= 3.5
    recommendedThomasMm = Math.min(
      24,
      Math.round((12 + varusAbs * 0.9) * Math.min(1.15, weightScale))
    )
  } else {
    insoleType = archType === 'flat' ? 'supinator' : 'neutral'
    medialHeelWedgeMm = 0
    lateralWedgeMm = 0
    recommendThomasHeel = false
    recommendedThomasMm = Math.round(15 * Math.min(1.15, weightScale))
  }

  let thomasHeelType: 'none' | 'medial' | 'lateral' = 'none'
  let thomasExtensionMm = 0
  if (soleType === 'thomas') {
    thomasHeelType = clampedPronation >= 2 ? 'lateral' : 'medial'
    thomasExtensionMm = recommendedThomasMm
  }

  // 6. Продольный профиль, эффективный рычаг и распределение нагрузки
  const clampedStartPct = Math.max(52, Math.min(78, rockerStartPct))
  const dynamicLeverRatio = Math.max(
    0.58,
    Math.min(0.78, (clampedStartPct / 100 - C.HEEL_CENTER_RATIO) * 1.38)
  )
  const lEff = parseFloat((lastLengthMm * dynamicLeverRatio).toFixed(1))

  const netRise = heelHeight - toeThickness
  const asinArg = lEff > 0 ? Math.max(-1, Math.min(1, netRise / lEff)) : 0
  const internalSlope = Math.asin(asinArg) * (180 / Math.PI)

  let loadCalc =
    C.BASE_FOREFOOT_LOAD_PCT + (netRise / Math.max(lEff, 1)) * C.SLOPE_TO_LOAD_GAIN
  if (soleType === 'rocker') {
    const angleFactor = Math.min(1, Math.max(0, rockerAngle / C.MAX_ROCKER_ANGLE))
    const distFromOptimum = Math.abs(clampedStartPct - 60)
    const placementEfficiency = Math.max(0.35, 1 - distFromOptimum / 28)
    const factor = Math.min(1, angleFactor * placementEfficiency)
    loadCalc *= 1 - C.ROCKER_MITIGATION_CAP * factor
  } else if (soleType === 'thomas') {
    loadCalc *= C.THOMAS_LOAD_RELIEF_FACTOR
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
        : clampedPronation * 0.35
  const effectiveRoll = clampedPronation - orthoStabilization
  const m1Ratio = Math.max(0.22, Math.min(0.82, 0.55 - effectiveRoll * 0.024))
  const loadM1Pct = Math.round(forefootLoad * m1Ratio)
  const loadM5Pct = Math.max(0, forefootLoad - loadM1Pct)

  // 7. Продольные координаты ключевых анатомических точек (Единый источник геометрической правды)
  const heelCenterPos = lastLengthMm * C.HEEL_CENTER_RATIO
  const ballPos = lastLengthMm * (clampedStartPct / 100)
  const apexM1_Mm = Math.round(ballPos - C.M1_PROXIMAL_FROM_BALL_MM)
  const apexM5_Mm = Math.round(apexM1_Mm - footLengthMm * C.M5_PROXIMAL_TO_FOOT_RATIO)
  const metatarsalObliqueAngleDeg = parseFloat(
    (
      Math.atan2(
        apexM1_Mm - apexM5_Mm,
        forefootWidthMm * C.EFFECTIVE_METATARSAL_SPAN_RATIO
      ) *
      (180 / Math.PI)
    ).toFixed(1)
  )

  // 8. Модельная оценка плантарного давления и показаний к пелоту Зейца
  // Учитываем, что карман под HV также расширяет опорную/объёмную зону первого луча
  const contactAreaScale =
    (footLengthMm / C.REF_FOOT_LENGTH_MM) *
    (1 + ballBuildUpMm * 0.008 + medialBunionPocketMm * 0.005)
  const orthoReliefFactor =
    soleType === 'rocker' ? 1.52 : soleType === 'thomas' ? 1.42 : 1.0
  const foreAreaCm2 = Math.max(
    30,
    C.REF_FOREFOOT_CONTACT_AREA_CM2 * contactAreaScale * orthoReliefFactor
  )
  const heelAreaCm2 = Math.max(
    22,
    C.REF_HEEL_CONTACT_AREA_CM2 * contactAreaScale * (soleType !== 'flat' ? 1.32 : 1.0)
  )

  const totalForceN = clampedWeight * 9.81 * C.QUASI_STATIC_GAIT_FACTOR
  const foreForceN = totalForceN * (forefootLoad / 100)
  const heelForceN = totalForceN * (heelLoad / 100)
  const rollConcentration =
    1 + Math.abs(effectiveRoll) * 0.028 + (archType === 'cavus' ? 0.12 : 0)

  const peakForefootPressureKpa = Math.round(
    (foreForceN / foreAreaCm2) *
      10 *
      C.FOREFOOT_PEAK_CONCENTRATION_FACTOR *
      rollConcentration
  )
  const peakHeelPressureKpa = Math.round(
    (heelForceN / heelAreaCm2) * 10 * C.HEEL_PEAK_CONCENTRATION_FACTOR
  )

  const requiresMetatarsalPad =
    forefootLoad >= C.PELOTTE_LOAD_THRESHOLD_PCT ||
    peakForefootPressureKpa >= C.PELOTTE_PRESSURE_THRESHOLD_KPA ||
    ballBuildUpMm >= 6 ||
    hvDeg >= 12

  const defaultPelottePosMm = Math.round(apexM1_Mm - C.PELOTTE_PROXIMAL_OFFSET_MM)
  let metatarsalPadPosMm: number | null = null
  let metatarsalPadHeightMm: number | null = null
  if (requiresMetatarsalPad) {
    metatarsalPadPosMm = defaultPelottePosMm
    metatarsalPadHeightMm =
      clampedWeight >= 100 || ballBuildUpMm >= 10 || hvDeg >= 15
        ? 6
        : netRise > 25
          ? 5
          : 4
  }

  // 9. Расчёт параметров геленка 65Г и модуля shankEngineering
  const shankLength = Math.round(Math.max(40, ballPos - heelCenterPos - 5))
  const effectiveHeelTipOffsetMm = soleType !== 'rocker' ? heelTipOffsetMm : 0

  const supportReductionMm =
    soleType === 'rocker'
      ? shankLength * 0.42
      : soleType === 'thomas'
        ? thomasExtensionMm * 0.85
        : 0
  const offsetPenaltyMm =
    soleType !== 'rocker' ? Math.max(0, -effectiveHeelTipOffsetMm) * 2.2 : 0
  const effectiveMomentArmMm = parseFloat(
    Math.max(14, shankLength * 0.48 - supportReductionMm + offsetPenaltyMm).toFixed(1)
  )
  const effectiveMomentArmM = effectiveMomentArmMm / 1000
  const slopeLoadFactor =
    0.25 + Math.max(0, Math.sin((internalSlope * Math.PI) / 180)) * 0.95
  const shankBendingMomentNm = parseFloat(
    (totalForceN * effectiveMomentArmM * slopeLoadFactor).toFixed(1)
  )

  const shankOverloaded = shankBendingMomentNm > C.MAX_SHANK_MOMENT_NM
  const thomasTooHigh = soleType === 'thomas' && heelHeight > C.MAX_THOMAS_HEEL_MM
  const rockerTooHigh =
    soleType === 'rocker' &&
    (heelHeight > C.MAX_ROCKER_HEEL_MM || netRise > C.MAX_ROCKER_NET_RISE_MM)

  let steelThickness = clampedWeight >= 85 || gender === 'male' ? 1.5 : 1.2
  if (netRise > 35 || shankBendingMomentNm > 20) steelThickness = Math.max(steelThickness, 1.5)
  if (netRise > 55 || shankBendingMomentNm > 25 || clampedWeight >= 105) steelThickness = 2.0

  const shankWidthMm = gender === 'male' ? 16 : 14
  const sectionModulusMm3 = parseFloat(
    ((shankWidthMm * steelThickness * steelThickness) / 6).toFixed(2)
  )
  // Стальной геленок воспринимает ~35% суммарного изгибающего момента свода (остальное — затяжная стелька и подошва)
  const shankMomentShareNmm = shankBendingMomentNm * 1000 * 0.35
  const estimatedBendingStressMpa = Math.round(
    shankMomentShareNmm / Math.max(0.5, sectionModulusMm3)
  )
  const safetyFactor = parseFloat(
    (780 / Math.max(1, estimatedBendingStressMpa)).toFixed(2)
  )

  const shankEngineering: ShankEngineeringModel = {
    isAnalyticalEstimate: true,
    material: soleType === 'rocker' ? 'carbon_composite' : 'steel_65G',
    shankLengthMm: shankLength,
    shankWidthMm,
    steelThicknessMm: steelThickness,
    effectiveMomentArmMm,
    bendingMomentNm: shankBendingMomentNm,
    maxAllowedMomentNm: C.MAX_SHANK_MOMENT_NM,
    sectionModulusMm3,
    estimatedBendingStressMpa,
    safetyFactor,
    isOverloaded: shankOverloaded,
  }

  // 10. Согласованные допуски смещения оси каблука: [-2 мм .. +5 мм]
  const heelOffsetTooFarBack =
    soleType !== 'rocker' && effectiveHeelTipOffsetMm < C.MIN_SAFE_HEEL_OFFSET_MM
  const heelOffsetTooFarForward =
    soleType !== 'rocker' && effectiveHeelTipOffsetMm > C.MAX_SAFE_HEEL_OFFSET_MM

  const baseStabilityFactor =
    soleType === 'thomas' ? 0.5 : soleType === 'rocker' ? 0.55 : 1.0
  const heightRisk = Math.max(0, netRise) * 0.55
  const rollRisk = Math.abs(effectiveRoll) * (2.6 + (clampedWeight / 75) * 1.15)
  const inversionRisk = Math.min(
    100,
    Math.round((heightRisk + rollRisk) * baseStabilityFactor)
  )

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

  // 11. Сборка единой геометрической модели LastGeometryModel
  const xHeelCenterMm = Math.round(heelCenterPos)
  const xHeelTipCenterMm = Math.round(heelCenterPos + effectiveHeelTipOffsetMm)
  const heelHalfBaseLengthMm = (gender === 'male' ? 32 : 28) * 0.5
  const xHeelBackBottomMm = Math.max(
    0,
    Math.round(xHeelTipCenterMm - heelHalfBaseLengthMm * 0.92)
  )
  const xHeelFrontBaseMm = Math.round(xHeelTipCenterMm + heelHalfBaseLengthMm)
  const xThomasFrontMm =
    soleType === 'thomas' ? xHeelFrontBaseMm + thomasExtensionMm : xHeelFrontBaseMm
  const xShankStartMm = xHeelCenterMm
  const xShankEndMm = Math.min(
    Math.round(ballPos - 4),
    xHeelCenterMm + shankLength
  )
  const xInstepMm = Math.round(lastLengthMm * C.INSTEP_POS_RATIO)
  const xBallMm = Math.round(ballPos)
  const rockerZoneLengthMm = Math.max(1, lastLengthMm - xBallMm)
  const activeRockerDeg = soleType === 'rocker' ? rockerAngle : 0
  const rockerLiftMm =
    soleType === 'rocker'
      ? Math.min(
          C.MAX_LIFT,
          Math.round(
            rockerZoneLengthMm *
              Math.min(1, Math.max(0, Math.sin((activeRockerDeg * Math.PI) / 180)))
          )
        )
      : 6

  const geometryModel: LastGeometryModel = {
    footLengthMm,
    leftFootLengthMm,
    rightFootLengthMm,
    longerFootSide: resolvedAsymmetrySide,
    shorterFootSide,
    lengthAsymmetryMm: effectiveAsymMm,
    compensatoryInsoleHalfPairMm,
    toeShapeAllowanceMm,
    toeFreeSpaceMm,
    fashionAllowanceMm,
    lastLengthMm,

    xHeelMm: 0,
    xHeelCenterMm,
    xHeelTipCenterMm,
    xHeelBackBottomMm,
    xHeelFrontBaseMm,
    xThomasFrontMm,
    xShankStartMm,
    xShankEndMm,
    xInstepMm,
    xPelotteMm: defaultPelottePosMm,
    xApexM5Mm: apexM5_Mm,
    xApexM1Mm: apexM1_Mm,
    xBallMm,
    xToeMm: lastLengthMm,

    uHeelCenter: parseFloat((xHeelCenterMm / lastLengthMm).toFixed(4)),
    uHeelFrontBase: parseFloat((xHeelFrontBaseMm / lastLengthMm).toFixed(4)),
    uThomasFront: parseFloat((xThomasFrontMm / lastLengthMm).toFixed(4)),
    uShankEnd: parseFloat((xShankEndMm / lastLengthMm).toFixed(4)),
    uInstep: parseFloat((xInstepMm / lastLengthMm).toFixed(4)),
    uPelotte: parseFloat((defaultPelottePosMm / lastLengthMm).toFixed(4)),
    uApexM5: parseFloat((apexM5_Mm / lastLengthMm).toFixed(4)),
    uApexM1: parseFloat((apexM1_Mm / lastLengthMm).toFixed(4)),
    uBall: parseFloat((xBallMm / lastLengthMm).toFixed(4)),

    heelHeightMm: heelHeight,
    toeThicknessMm: toeThickness,
    netRiseMm: netRise,
    rockerLiftMm,
    instepBaseHeightMm: gender === 'male' ? 60 : 54,
    toeBoxHeightMm,

    standardForefootWidthMm,
    forefootWidthMm,
    effectiveForefootWidthWithBunionMm,
    heelWidthMm,
    ballBuildUpMm,
    ballModAction,
    instepBuildUpMm,
    instepModAction,
    medialBunionPocketMm,
    bunionPocketCenterMm: apexM1_Mm,
    bunionPocketRadiusMm: 18 + Math.min(6, Math.round(medialBunionPocketMm * 0.8)),
    toeShape,
    lastApexType,
    lastApexLabel,
    anatomicalFootApexOffsetMm,
    toeBoxShiftMedialMm,
    metatarsalObliqueAngleDeg,

    requiresMetatarsalPad,
    metatarsalPadPosMm,
    metatarsalPadHeightMm,
    pelotteHalfLengthMm: 11,
    soleType,
    thomasHeelType,
    thomasExtensionMm,
    effectiveHeelTipOffsetMm,
    rockerAngleDeg: activeRockerDeg,
    rockerStartPct: clampedStartPct,
    rockerZoneLengthMm,
    shankLengthMm: shankLength,
    steelThicknessMm: steelThickness,
    carbonInsertThicknessMm,
  }

  const soleConstructionSummary = describeSoleConstruction({
    soleType,
    netRiseMm: netRise,
    heelHeightMm: heelHeight,
    toeThicknessMm: toeThickness,
    thomasHeelType,
    thomasExtensionMm,
    rockerAngleDeg: rockerAngle,
    rockerStartPct: clampedStartPct,
    carbonInsertThicknessMm,
    shankLengthMm: shankLength,
    steelThicknessMm: steelThickness,
  })

  const calculations: MathFormulaStep[] = [
    {
      title: '1. Конструктивная длина следа колодки (L_last)',
      given: ('Размер = ' + String(shoeSize) + ', Опорная стопа L_ст = ' + String(footLengthMm) + ' мм (Лев: ' + String(leftFootLengthMm) + ' / Прав: ' + String(rightFootLengthMm) + ' мм), Суммарный припуск = ' + String(toeFreeSpaceMm + fashionAllowanceMm) + ' мм'),
      formula: 'L_last = L_ст + Δ_свободн + Δ_фасон',
      substitution: (String(footLengthMm) + ' + ' + String(toeFreeSpaceMm) + ' + ' + String(fashionAllowanceMm)),
      result: (String(lastLengthMm) + ' мм (свободный припуск мыска +' + String(toeFreeSpaceMm) + ' мм)'),
      meaning:
        compensatoryInsoleHalfPairMm > 0
          ? String(asymmetrySummary)
          : ('Зелёная зона свободного пространства перед пальцами +' + String(toeFreeSpaceMm) + ' мм (' + String(toeShape === 'greek' ? 'Греческая стопа, удлинённый II луч' : toeShape === 'roman' ? 'Римская стопа' : 'Египетская стопа') + ').'),
    },
    {
      title: '2. Модификация пучков и карман под I луч (Жёлтая зона доработки)',
      given: ('Обхват клиента O_п = ' + String(ballGirthMm) + ' мм, Эталон = ' + String(std.ballGirthMm) + ' мм, HV = ' + String(hvDeg) + '°'),
      formula: 'ΔO_п = O_п − O_п(эт); W_M1 = W_пуч + Δ_HV',
      substitution: (String(ballGirthMm) + ' − ' + String(std.ballGirthMm) + ' = ' + String(ballBuildUpMm) + ' мм; Карман HV = +' + String(medialBunionPocketMm) + ' мм'),
      result: (String(ballModSummary) + ' (Ширина ' + String(forefootWidthMm) + ' мм vs база ' + String(standardForefootWidthMm) + ' мм; с HV: ' + String(effectiveForefootWidthWithBunionMm) + ' мм)'),
      meaning:
        ballBuildUpMm > 0 || medialBunionPocketMm > 0
          ? ('Жёлтая зона модификации: ' + String(ballBuildUpMm > 0 ? ('нарастить пучки на +' + String(ballBuildUpMm) + ' мм') : ballBuildUpMm < 0 ? ('снять материал в пучках ' + String(ballBuildUpMm) + ' мм') : 'базовая ширина пучков') + String(medialBunionPocketMm > 0 ? (', сформировать локальный карман M1 +' + String(medialBunionPocketMm) + ' мм') : '') + '.')
          : ballBuildUpMm < 0
            ? ('Узкая стопа: требуется снятие материала (уменьшение объёма колодки в пучках на ' + String(ballBuildUpMm) + ' мм).')
            : 'Стандартная ширина пучков колодки (без налепки и снятия).',
    },
    {
      title: '3. Положение апекса и косой линии сгиба (Синие ориентиры)',
      given: ('M1 = ' + String(apexM1_Mm) + ' мм, M5 = ' + String(apexM5_Mm) + ' мм, Ширина пучков = ' + String(forefootWidthMm) + ' мм'),
      formula: 'φ_изгиба = arctan((X_M1 − X_M5) / (0.82 × W_пуч))',
      substitution: ('arctan((' + String(apexM1_Mm) + ' − ' + String(apexM5_Mm) + ') / ' + String((forefootWidthMm * C.EFFECTIVE_METATARSAL_SPAN_RATIO).toFixed(1)) + ')'),
      result: ('Угол сгиба φ = ' + String(metatarsalObliqueAngleDeg) + '°; Смещение апекса мыска = +' + String(toeBoxShiftMedialMm) + ' мм'),
      meaning: (String(lastApexLabel) + '.'),
    },
    {
      title: '4. Модельная оценка пикового давления (Красная зона) и момент геленка',
      given: ('Вес = ' + String(clampedWeight) + ' кг, Нагрузка пучков = ' + String(forefootLoad) + '%, Уклон = ' + String(internalSlope.toFixed(1)) + '°'),
      formula: 'P_est = (F_пуч / S_оп) × k_конц; M_гел = F_дин × L_рычага × k_укл',
      substitution: ('P_est ≈ ' + String(peakForefootPressureKpa) + ' кПа (модельная оценка); M_гел ≈ ' + String(shankBendingMomentNm) + ' Н·м'),
      result: ('Модельная оценка давления: ' + String(peakForefootPressureKpa) + ' кПа · Оценочный момент: ' + String(shankBendingMomentNm) + ' Н·м (' + String(soleType === 'rocker' ? ('Карбон ' + String(carbonInsertThicknessMm) + ' мм') : ('Сталь 65Г ' + String(steelThickness) + ' мм')) + ')'),
      meaning: requiresMetatarsalPad
        ? ('Назначен пелот Зейца высотой ' + String(metatarsalPadHeightMm) + ' мм на расстоянии ' + String(metatarsalPadPosMm) + ' мм от пятки. Конструкция опоры: ' + String(soleConstructionSummary) + '.')
        : ('Перегрузки поперечного свода по модели нет — пелот Зейца не требуется. Конструкция опоры: ' + String(soleConstructionSummary) + '.'),
    },
  ]

  return {
    geometryModel,
    shankEngineering,
    isPressureAndCopModelEstimate: true,
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
    rockerTooHigh,
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
      ballModAction,
      ballModSummary,
      instepBuildUpMm,
      instepModAction,
      instepModSummary,
      obliqueEntryDeltaMm,
      requiresZipOrLaceWarning,
      forefootWidthMm,
      effectiveForefootWidthWithBunionMm,
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
      asymmetrySide: resolvedAsymmetrySide,
      leftFootLengthMm,
      rightFootLengthMm,
      longerFootSide: resolvedAsymmetrySide,
      shorterFootSide,
      compensatoryInsoleHalfPairMm,
      asymmetrySummary,
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
      soleConstructionSummary,
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
  if (eng.thomasTooHigh || eng.rockerTooHigh) {
    return { status: 'ERROR', titleKey: 'errTitle', messageKey: 'errDesc' }
  }
  if (eng.internalSlope >= C.CRITICAL_ANGLE || eng.shankOverloaded) {
    return { status: 'ERROR', titleKey: 'errTitle', messageKey: 'errDesc' }
  }
  // При выборе "Стандарт" рекомендация каблука Томаса показывается как WARNING, а не блокирующий ERROR
  if (eng.highInversionRisk || eng.highPronationStress) {
    return { status: 'ERROR', titleKey: 'invertTitle', messageKey: 'invertDesc' }
  }
  if (eng.peakForefootPressureKpa >= C.CRITICAL_KPA || eng.forefootLoad >= C.CRITICAL_LOAD) {
    return { status: 'ERROR', titleKey: 'padTitle', messageKey: 'padDesc' }
  }
  if (eng.rx.recommendThomasHeel && soleType === 'flat') {
    return { status: 'WARNING', titleKey: 'thomasNeedTitle', messageKey: 'thomasNeedDesc' }
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
 * Собирает полный список всех активных критических ошибок и предупреждений
 * для итеративного алгоритма suggestAutoFix и детальной диагностики.
 */
export function collectAuditViolations(
  eng: HeelEngineering,
  soleType: SoleType,
  heelHeight: number,
  rockerAngle: number
): { errors: string[]; warnings: string[] } {
  const C = HEEL_CONST
  const errors: string[] = []
  const warnings: string[] = []
  const activeRocker = soleType === 'rocker' ? rockerAngle : 0

  if (eng.heelOffsetTooFarBack) {
    errors.push(
      ('Смещение каблука назад (< ' + String(C.MIN_SAFE_HEEL_OFFSET_MM) + ' мм): риск излома геленка 65Г')
    )
  }
  if (eng.heelOffsetTooFarForward) {
    errors.push(
      ('Смещение пятки вперёд (> +' + String(C.MAX_SAFE_HEEL_OFFSET_MM) + ' мм): нарушение соосности пяточного упора')
    )
  }
  if (eng.thomasTooHigh) {
    errors.push(
      ('Высота каблука Томаса (' + String(heelHeight) + ' мм) превышает лимит ' + String(C.MAX_THOMAS_HEEL_MM) + ' мм')
    )
  }
  if (eng.rockerTooHigh) {
    errors.push(
      ('Параметры рокера превышают лимит (высота пятки > ' + String(C.MAX_ROCKER_HEEL_MM) + ' мм или перепад > ' + String(C.MAX_ROCKER_NET_RISE_MM) + ' мм)')
    )
  }
  if (eng.internalSlope >= C.CRITICAL_ANGLE) {
    errors.push(
      ('Критический угол продольного уклона (' + String(eng.internalSlope.toFixed(1)) + '° >= ' + String(C.CRITICAL_ANGLE) + '°)')
    )
  }
  if (eng.shankOverloaded) {
    errors.push(
      ('Перегрузка геленка (' + String(eng.shankBendingMomentNm) + ' Н·м > ' + String(C.MAX_SHANK_MOMENT_NM) + ' Н·м)')
    )
  }
  if (eng.rx.recommendThomasHeel && soleType === 'flat') {
    warnings.push(
      ('При завале стопы (' + String(eng.pronationDeg) + '°) для максимальной стабилизации рекомендуется каблук Томаса')
    )
  }
  if (eng.highInversionRisk || eng.highPronationStress) {
    errors.push(
      ('Высокий риск боковой нестабильности / вывиха (индекс нестабильности ' + String(eng.inversionRisk) + '%, эффективный завал)')
    )
  }
  if (eng.peakForefootPressureKpa >= C.CRITICAL_KPA || eng.forefootLoad >= C.CRITICAL_LOAD) {
    errors.push(
      ('Перегрузка пучков (модельная оценка ' + String(eng.peakForefootPressureKpa) + ' кПа / нагрузка ' + String(eng.forefootLoad) + '%)')
    )
  }

  if (eng.internalSlope < 0) {
    warnings.push('Отрицательный перепад высот (платформа носка выше каблука)')
  }
  if (eng.internalSlope > C.COMFORT_ANGLE && eng.internalSlope < C.CRITICAL_ANGLE) {
    warnings.push(('Уклон стопы (' + String(eng.internalSlope.toFixed(1)) + '°) выше комфортного (' + String(C.COMFORT_ANGLE) + '°)'))
  }
  if (heelHeight < 20 && activeRocker > 16) {
    warnings.push('Слишком агрессивный угол рокера при низкой пятке (< 20 мм)')
  }
  if (eng.rx.requiresZipOrLaceWarning) {
    warnings.push('Высокий взъём / косой обхват — требуется шнуровка или молния')
  }

  return { errors, warnings }
}

/**
 * ИТЕРАТИВНЫЙ И НАДЁЖНЫЙ АЛГОРИТМ АВТОПОДБОРА (suggestAutoFix).
 * Пошагово вычисляет состояние (computeEngineering + computeAudit), находит все активные нарушения,
 * вносит минимально необходимые безопасные корректировки без неоправданной смены типа подошвы
 * и пересчитывает модель до полного устранения ошибок или достижения лимита итераций (7).
 */
export function suggestAutoFix(
  input: HeelInput,
  initialEng?: HeelEngineering
): AutoFixResult {
  const C = HEEL_CONST
  const maxHeelForGender = input.gender === 'male' ? 55 : 85
  const minHeelAllowed = 10

  let state: HeelInput = { ...input }
  let currentEng = initialEng ?? computeEngineering(state)
  let violations = collectAuditViolations(
    currentEng,
    state.soleType,
    state.heelHeight,
    state.rockerAngle
  )

  const appliedChanges: string[] = []

  // Если критических ошибок нет и уклон уже в комфортной зоне (0..COMFORT_ANGLE), ничего не ломаем
  if (
    violations.errors.length === 0 &&
    currentEng.internalSlope >= 0 &&
    currentEng.internalSlope <= C.COMFORT_ANGLE &&
    !(state.heelHeight < 20 && state.soleType === 'rocker' && state.rockerAngle > 16)
  ) {
    return {
      soleType: state.soleType,
      toeThickness: state.toeThickness,
      heelHeight: state.heelHeight,
      heelTipOffsetMm: state.heelTipOffsetMm,
      rockerAngle: state.rockerAngle,
      rockerStartPct: state.rockerStartPct,
      status: 'ALREADY_OPTIMAL',
      iterations: 0,
      resolved: true,
      summaryMessage: 'Параметры уже находятся в безопасном ортопедическом диапазоне.',
      appliedChanges: [],
      remainingIssues: [],
    }
  }

  let iterations = 0

  for (let step = 1; step <= C.MAX_AUTO_FIX_ITERATIONS; step++) {
    currentEng = computeEngineering(state)
    violations = collectAuditViolations(
      currentEng,
      state.soleType,
      state.heelHeight,
      state.rockerAngle
    )

    const hasSlopeOrRockerWarning =
      currentEng.internalSlope < 0 ||
      currentEng.internalSlope > C.COMFORT_ANGLE ||
      (state.soleType === 'rocker' && state.heelHeight < 20 && state.rockerAngle > 16)

    if (violations.errors.length === 0 && !hasSlopeOrRockerWarning) {
      break
    }

    iterations = step
    let changedInStep = false

    // Шаг А: Устранение недопустимого смещения набойки каблука (допуск -2..+5 мм)
    if (currentEng.heelOffsetTooFarBack || currentEng.heelOffsetTooFarForward) {
      const safeOffset = 0
      if (state.heelTipOffsetMm !== safeOffset) {
        appliedChanges.push(
          ('Итер. ' + String(step) + ': смещение каблука скорректировано с ' + String(state.heelTipOffsetMm) + ' мм до ' + String(safeOffset) + ' мм')
        )
        state.heelTipOffsetMm = safeOffset
        changedInStep = true
      }
    }

    // Шаг Б: Устранение отрицательного дропа (платформа выше каблука)
    if (state.heelHeight < state.toeThickness) {
      const nextToe = Math.max(0, state.heelHeight)
      appliedChanges.push(
        ('Итер. ' + String(step) + ': толщина платформы снижена с ' + String(state.toeThickness) + ' до ' + String(nextToe) + ' мм (устранение отрицательного дропа)')
      )
      state.toeThickness = nextToe
      changedInStep = true
    }

    // Шаг В: Ограничение высоты каблука Томаса и рокера без смены типа подошвы
    if (state.soleType === 'thomas' && state.heelHeight > C.MAX_THOMAS_HEEL_MM) {
      const nextHeel = C.MAX_THOMAS_HEEL_MM
      appliedChanges.push(
        ('Итер. ' + String(step) + ': высота каблука Томаса снижена с ' + String(state.heelHeight) + ' до ' + String(nextHeel) + ' мм')
      )
      state.heelHeight = nextHeel
      state.toeThickness = Math.min(state.toeThickness, state.heelHeight)
      changedInStep = true
    }

    if (state.soleType === 'rocker') {
      if (state.heelHeight > C.MAX_ROCKER_HEEL_MM) {
        appliedChanges.push(
          ('Итер. ' + String(step) + ': высота рокерной пятки снижена с ' + String(state.heelHeight) + ' до ' + String(C.MAX_ROCKER_HEEL_MM) + ' мм')
        )
        state.heelHeight = C.MAX_ROCKER_HEEL_MM
        changedInStep = true
      }
      if (state.heelHeight - state.toeThickness > C.MAX_ROCKER_NET_RISE_MM) {
        const neededToe = Math.min(
          C.MAX_TOE,
          state.heelHeight - C.MAX_ROCKER_NET_RISE_MM
        )
        if (neededToe > state.toeThickness && neededToe <= 24) {
          appliedChanges.push(
            ('Итер. ' + String(step) + ': платформа носка увеличена с ' + String(state.toeThickness) + ' до ' + String(neededToe) + ' мм (перепад рокера ≤ ' + String(C.MAX_ROCKER_NET_RISE_MM) + ' мм)')
          )
          state.toeThickness = neededToe
        } else {
          const nextHeel = Math.max(20, state.toeThickness + C.MAX_ROCKER_NET_RISE_MM)
          appliedChanges.push(
            ('Итер. ' + String(step) + ': высота пятки снижена с ' + String(state.heelHeight) + ' до ' + String(nextHeel) + ' мм (перепад рокера ≤ ' + String(C.MAX_ROCKER_NET_RISE_MM) + ' мм)')
          )
          state.heelHeight = nextHeel
        }
        changedInStep = true
      }
      if (state.heelHeight < 20 && state.rockerAngle > 16) {
        state.heelHeight = 22
        appliedChanges.push(
          ('Итер. ' + String(step) + ': высота пятки увеличена до 22 мм для согласования с углом рокера ' + String(state.rockerAngle) + '°')
        )
        changedInStep = true
      }
    }

    // Шаг Г: Сохраняем выбранный пользователем тип подошвы (soleType не меняется принудительно!)

    // Шаг Д: Снижение продольного уклона, перегрузки пучков, момента геленка и риска инверсии
    const needsDropReduction =
      currentEng.internalSlope > C.COMFORT_ANGLE ||
      currentEng.shankOverloaded ||
      currentEng.peakForefootPressureKpa >= C.CRITICAL_KPA ||
      currentEng.forefootLoad >= C.CRITICAL_LOAD ||
      currentEng.highInversionRisk

    if (needsDropReduction) {
      const targetRad = (C.SAFE_ANGLE * Math.PI) / 180
      const maxSafeNet = Math.max(
        0,
        Math.min(14, Math.floor(currentEng.lEff * Math.sin(targetRad)))
      )
      const currentNet = state.heelHeight - state.toeThickness

      // 1) Сначала мягко уменьшаем чистый перепад высот (netRise), сохраняя текущий тип подошвы
      if (currentNet > 0) {
        const targetNet =
          currentNet > maxSafeNet
            ? maxSafeNet
            : Math.max(0, currentNet - 4)

        // Пробуем сначала поднять платформу до разумного предела (16 мм), затем плавно снижать каблук
        const maxComfortPlatform = Math.min(C.MAX_TOE, state.heelHeight, 18)
        if (state.toeThickness < maxComfortPlatform && state.heelHeight - state.toeThickness > targetNet) {
          const nextToe = Math.min(
            maxComfortPlatform,
            state.heelHeight - targetNet,
            state.toeThickness + 4
          )
          if (nextToe !== state.toeThickness) {
            appliedChanges.push(
              ('Итер. ' + String(step) + ': толщина носочной части увеличена с ' + String(state.toeThickness) + ' до ' + String(nextToe) + ' мм')
            )
            state.toeThickness = nextToe
            changedInStep = true
          }
        }

        if (state.heelHeight - state.toeThickness > targetNet && state.heelHeight > minHeelAllowed) {
          const minTargetHeel = state.soleType === 'rocker' ? 20 : 14
          const nextHeel = Math.max(
            minTargetHeel,
            Math.min(maxHeelForGender, state.toeThickness + targetNet, state.heelHeight - 6)
          )
          if (nextHeel < state.heelHeight) {
            appliedChanges.push(
              ('Итер. ' + String(step) + ': высота каблука снижена с ' + String(state.heelHeight) + ' до ' + String(nextHeel) + ' мм')
            )
            state.heelHeight = nextHeel
            if (state.toeThickness > state.heelHeight) {
              state.toeThickness = state.heelHeight
            }
            changedInStep = true
          }
        }
      }

      // 2) Если уже выбран режим 'rocker', оптимизируем угол переката и точку старта (к оптимуму 60%)
      if (
        state.soleType === 'rocker' &&
        (currentEng.peakForefootPressureKpa >= C.CRITICAL_KPA ||
          currentEng.forefootLoad >= C.CRITICAL_LOAD)
      ) {
        if (state.rockerAngle < C.MAX_ROCKER_ANGLE) {
          const nextAngle = Math.min(C.MAX_ROCKER_ANGLE, state.rockerAngle + 4)
          appliedChanges.push(
            ('Итер. ' + String(step) + ': угол переката рокера увеличен с ' + String(state.rockerAngle) + '° до ' + String(nextAngle) + '° для разгрузки пучков')
          )
          state.rockerAngle = nextAngle
          changedInStep = true
        }
        if (Math.abs(state.rockerStartPct - 60) > 2) {
          const nextStart =
            state.rockerStartPct > 60
              ? Math.max(60, state.rockerStartPct - 3)
              : Math.min(60, state.rockerStartPct + 3)
          appliedChanges.push(
            ('Итер. ' + String(step) + ': линия старта рокера приближена к оптимуму (' + String(state.rockerStartPct) + '% → ' + String(nextStart) + '%)')
          )
          state.rockerStartPct = nextStart
          changedInStep = true
        }
      }

      // 3) Если после шага перепад всё ещё даёт перегрузку в рамках текущего типа подошвы — дожимаем перепад высот до минимума (4..8 мм)
      const recheckEng = computeEngineering(state)
      if (
        (recheckEng.peakForefootPressureKpa >= C.CRITICAL_KPA ||
          recheckEng.shankOverloaded ||
          recheckEng.highInversionRisk) &&
        state.heelHeight - state.toeThickness > 4
      ) {
        const minHeel = state.soleType === 'rocker' ? 20 : 16
        const nextHeel = Math.max(minHeel, state.heelHeight - 4)
        const nextToe = Math.min(nextHeel - 4, Math.max(state.toeThickness, nextHeel - 8))
        if (nextHeel !== state.heelHeight || nextToe !== state.toeThickness) {
          state.heelHeight = nextHeel
          state.toeThickness = Math.max(0, nextToe)
          appliedChanges.push(
            ('Итер. ' + String(step) + ': перепад высот снижен до ' + String(state.heelHeight - state.toeThickness) + ' мм (H=' + String(state.heelHeight) + ', T=' + String(state.toeThickness) + ' мм) без смены типа подошвы')
          )
          changedInStep = true
        }
      }
    }

    if (!changedInStep) {
      break
    }
  }

  // Финальная верификация после завершения цикла
  const finalEng = computeEngineering(state)
  const finalViolations = collectAuditViolations(
    finalEng,
    state.soleType,
    state.heelHeight,
    state.rockerAngle
  )
  const resolved = finalViolations.errors.length === 0

  const summaryMessage = resolved
    ? ('Автоподбор успешно завершён за ' + String(Math.max(1, iterations)) + ' итер.: все критические ошибки устранены.')
    : ('Невозможно полностью устранить автоматически в допустимых диапазонах (' + String(finalViolations.errors.length) + ' пробл. требуют индивидуального ортезирования): ' + String(finalViolations.errors.join('; ')))

  return {
    soleType: state.soleType,
    toeThickness: state.toeThickness,
    heelHeight: state.heelHeight,
    heelTipOffsetMm: state.heelTipOffsetMm,
    rockerAngle: state.rockerAngle,
    rockerStartPct: state.rockerStartPct,
    status: resolved ? 'RESOLVED' : 'PARTIAL_OR_UNRESOLVABLE',
    iterations: Math.max(1, iterations),
    resolved,
    summaryMessage,
    appliedChanges,
    remainingIssues: finalViolations.errors,
  }
}
