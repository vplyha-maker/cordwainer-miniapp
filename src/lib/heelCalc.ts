// src/lib/heelCalc.ts

export type Gender = 'female' | 'male'
export type SoleType = 'flat' | 'thomas' | 'rocker'
export type RockerType = 'forefoot' | 'heelToToe' | 'negative'
export type ToeShape = 'egyptian' | 'greek' | 'roman'
export type ArchMorphology = 'flat' | 'normal' | 'cavus'
export type LastApexType = 'medial_straight' | 'oblique_anatomical' | 'wide_square'
export type AsymmetrySide = 'left' | 'right' | 'equal'
export type BuildUpAction = 'build_up' | 'reduce' | 'neutral'
export type ShankProfileType = 'flat_plate' | 'fluted_ribbed'
export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO'
export type ValidationCategory =
  | 'GEOMETRY_INVARIANT'
  | 'CRITICAL_BIOMECHANICS'
  | 'ALLOWANCE_AND_GIRTH'
  | 'CLINICAL_HEURISTIC'

/**
 * Единый реестр антропометрических, биомеханических, прочностных и конструктивных констант.
 * Все эмпирические коэффициенты задокументированы с указанием физического смысла
 * и отраслевого источника (ГОСТ 3927 / ЦНИИКП / Novel Pedar / сопромат стали 65Г).
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
  /** Коэффициент пересчёта приращения обхвата ΔO в радиальную толщину слоя налепки ΔH (по геометрии овала сечения ~0.26..0.28) */
  GIRTH_DELTA_TO_RADIAL_LAYER_RATIO: 0.27,
  /** Предельный припуск обхвата (мм), свыше которого ручная оклейка базовой колодки недопустима — нужна ЧПУ-колодка */
  MAX_MANUAL_GIRTH_BUILDUP_MM: 35,
  /** Предельное снятие по обхвату (мм) без потери геометрии стандартной колодки */
  MAX_MANUAL_GIRTH_REDUCTION_MM: 18,

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
  /** Порог разницы длин стоп ΔL (мм), начиная с которого рекомендуется распаровка (разные размеры колодок L/R) */
  MISMATCHED_PAIR_LAST_THRESHOLD_MM: 8,
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

  /** Предельно допустимый изгибающий момент свода на узел супинатора (Н·м) */
  MAX_SHANK_MOMENT_NM: 28,
  /** Условный предел текучести термообработанной пружинной стали 65Г (HRC 44–48), МПа */
  STEEL_65G_YIELD_STRENGTH_MPA: 780,
  /** Предел усталостной выносливости стали 65Г при пульсирующем изгибе (R=0, N=10^6 циклов шага, с учётом концентратора отверстий K_σ=1.45), МПа */
  STEEL_65G_FATIGUE_LIMIT_1E6_MPA: 340,
  /** Коэффициент повышения момента сопротивления W_x желобчатого геленка с ребром жёсткости относительно плоской пластины */
  FLUTED_SHANK_SECTION_GAIN: 2.35,

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

/**
 * Индивидуальный профиль обхватов и угловых деформаций для одной стопы (левой или правой).
 */
export interface FootSideProfile {
  ballGirthMm: number
  instepGirthMm: number
  obliqueGirthMm: number
  pronationDeg: number
  halluxValgusDeg: number
  archType: ArchMorphology
  toeShape: ToeShape
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
  /** Включён ли режим независимых профилей левой и правой стопы */
  independentSides?: boolean
  /** Активная полупара для отображения на 2D/3D сцене при раздельном режиме */
  activeSide?: 'left' | 'right'
  /** Индивидуальные параметры левой стопы */
  leftProfile?: FootSideProfile
  /** Индивидуальные параметры правой стопы */
  rightProfile?: FootSideProfile
  /** Предпочтительный профиль геленка (если задан вручную) */
  shankProfilePreference?: ShankProfileType
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
  requiresMismatchedPairLasts: boolean
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

  // 5. Поперечная геометрия, апекс, Hallux Valgus и модификации обхватов
  standardForefootWidthMm: number
  forefootWidthMm: number
  effectiveForefootWidthWithBunionMm: number
  heelWidthMm: number
  ballBuildUpMm: number
  ballRadialLayerMm: number
  ballModAction: BuildUpAction
  instepBuildUpMm: number
  instepRadialLayerMm: number
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
 * Полноценный модуль расчёта геленка как составной балки «затяжная стелька + геленок 65Г + подошва»
 * на упругом винклеровском основании с проверкой циклической долговечности (10^6 шагов).
 */
export interface ShankEngineeringModel {
  isAnalyticalEstimate: true
  material: 'steel_65G' | 'carbon_composite'
  profileType: ShankProfileType
  profileLabel: string
  shankLengthMm: number
  shankWidthMm: number
  steelThicknessMm: number
  ribDepthMm: number
  effectiveMomentArmMm: number
  /** Полный изгибающий момент в своде от реакции опоры (Н·м) */
  bendingMomentNm: number
  /** Доля момента, воспринимаемая непосредственно геленком в составном сечении «стелька + геленок + подошва» (%) */
  compositeShankLoadSharePct: number
  /** Коэффициент разгрузки пролёта упругим основанием свода / грудью Томаса (%) */
  winklerFoundationReliefPct: number
  /** Чистый изгибающий момент, нагружающий стальной геленок (Н·м) */
  netShankMomentNm: number
  maxAllowedMomentNm: number
  /** Момент сопротивления сечения геленка W_x (мм³) с учётом плоского или желобчатого профиля */
  sectionModulusMm3: number
  /** Действующее максимальное напряжение изгиба в геленке σ_max (МПа) */
  estimatedBendingStressMpa: number
  /** Предел выносливости при 10^6 циклах шага σ_fat (МПа) */
  fatigueLimit1e6Mpa: number
  /** Статический запас прочности по пределу текучести (780 МПа) */
  safetyFactor: number
  /** Усталостный коэффициент запаса прочности на базе 10^6 циклов шага */
  fatigueSafetyFactor: number
  /** Прогноз циклического ресурса */
  fatigueLifeStatus: string
  isOverloaded: boolean
}

/**
 * Двумерная гауссова педобарографическая модель распределения плантарного давления
 * по 5 плюсневым головкам (M1–M5), среднему отделу и секторам пятки (калибровка Novel Pedar / Tekscan).
 */
export interface PedobarographyModel {
  isCalibratedGaussianModel: true
  calibrationReference: string
  kpaM1: number
  kpaM2: number
  kpaM3: number
  kpaM4: number
  kpaM5: number
  kpaMidfoot: number
  kpaHeelMedial: number
  kpaHeelLateral: number
  peakForefootKpa: number
  peakHeelKpa: number
  dominantMetatarsalRay: 'M1' | 'M2' | 'M3' | 'M4' | 'M5'
  pelotteReliefKpa: number
  /** Параметры 2D гауссовых центров (u ∈ [0, 1], zRatio ∈ [-1, 1], amplitudeKpa, sigmaU, sigmaZ) для 3D тепловой карты */
  gaussianCenters: ReadonlyArray<{
    id: string
    u: number
    zRatio: number
    peakKpa: number
    sigmaU: number
    sigmaZ: number
  }>
}

/**
 * Элемент специализированной валидации геометрии и клинических правил.
 */
export interface ValidationRuleResult {
  code: string
  category: ValidationCategory
  severity: ValidationSeverity
  title: string
  description: string
  passed: boolean
}

export interface LastValidationReport {
  allInvariantsPassed: boolean
  hasCriticalErrors: boolean
  hasWarnings: boolean
  invariants: ValidationRuleResult[]
  criticalChecks: ValidationRuleResult[]
  allowanceRules: ValidationRuleResult[]
  clinicalHeuristics: ValidationRuleResult[]
  activeIssues: ValidationRuleResult[]
}

/**
 * Расчётные параметры отдельной полупары (левой или правой) для двухколоночного ТЗ мастеру.
 */
export interface HalfPairPrescriptionSpec {
  side: 'left' | 'right'
  sideLabel: string
  footLengthMm: number
  lastLengthMm: number
  widthCode: string
  forefootWidthMm: number
  effectiveForefootWidthWithBunionMm: number
  ballGirthMm: number
  ballBuildUpMm: number
  ballRadialLayerMm: number
  ballModAction: BuildUpAction
  ballModSummary: string
  instepGirthMm: number
  instepBuildUpMm: number
  instepRadialLayerMm: number
  instepModAction: BuildUpAction
  instepModSummary: string
  obliqueGirthMm: number
  obliqueEntryDeltaMm: number
  requiresZipOrLaceWarning: boolean
  pronationDeg: number
  halluxValgusDeg: number
  archType: ArchMorphology
  toeShape: ToeShape
  medialBunionPocketMm: number
  toeBoxShiftMedialMm: number
  toeBoxHeightMm: number
  toeFreeSpaceMm: number
  lastApexType: LastApexType
  lastApexLabel: string
  insoleType: 'neutral' | 'supinator' | 'pronator'
  archSupportHeightMm: number
  medialHeelWedgeMm: number
  lateralWedgeMm: number
  thomasHeelType: 'none' | 'medial' | 'lateral'
  thomasExtensionMm: number
  compensatoryInsoleMm: number
  requiresMetatarsalPad: boolean
  metatarsalPadHeightMm: number | null
  metatarsalPadPosMm: number | null
  peakForefootPressureKpa: number
  dominantRay: 'M1' | 'M2' | 'M3' | 'M4' | 'M5'
}

export interface PairedFootPrescription {
  independentSides: boolean
  activeSide: 'left' | 'right'
  left: HalfPairPrescriptionSpec
  right: HalfPairPrescriptionSpec
}

export interface MasterPrescription {
  widthCode: string
  ballBuildUpMm: number
  ballRadialLayerMm: number
  ballModAction: BuildUpAction
  ballModSummary: string
  instepBuildUpMm: number
  instepRadialLayerMm: number
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
  requiresMismatchedPairLasts: boolean
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
  pairedRx: PairedFootPrescription
}

export interface HeelEngineering {
  /** Единый источник геометрической правды для 2D, 3D и ТЗ */
  geometryModel: LastGeometryModel
  /** Составная модель прочности и усталостной долговечности геленка 65Г / карбона */
  shankEngineering: ShankEngineeringModel
  /** Двумерная гауссова педобарографическая модель по головкам M1–M5 и пятке */
  pressureModel: PedobarographyModel
  /** Полный отчёт валидации геометрических инвариантов, допусков и клинических эвристик */
  validation: LastValidationReport
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
  peakForefootPressureKpa: number
  peakHeelPressureKpa: number
  copLongitudinalMm: number
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

export function getBuildUpAction(deltaMm: number): BuildUpAction {
  if (deltaMm > 0) return 'build_up'
  if (deltaMm < 0) return 'reduce'
  return 'neutral'
}

export function computeRadialLayerMm(girthDeltaMm: number): number {
  if (girthDeltaMm === 0) return 0
  const sign = girthDeltaMm > 0 ? 1 : -1
  const absLayer = Math.max(
    1,
    Math.round(Math.abs(girthDeltaMm) * HEEL_CONST.GIRTH_DELTA_TO_RADIAL_LAYER_RATIO)
  )
  return sign * absLayer
}

export function formatBallModification(ballBuildUpMm: number, short = false): string {
  const layerMm = computeRadialLayerMm(ballBuildUpMm)
  if (ballBuildUpMm > 0) {
    return short
      ? ('Налепка пучков +' + String(ballBuildUpMm) + ' мм (слой ~' + String(layerMm) + ' мм)')
      : ('Наращивание (налепка) в пучках: ΔOп +' + String(ballBuildUpMm) + ' мм (радиальный слой +' + String(layerMm) + ' мм)')
  }
  if (ballBuildUpMm < 0) {
    return short
      ? ('Снятие в пучках ' + String(ballBuildUpMm) + ' мм (слой ' + String(layerMm) + ' мм)')
      : ('Снятие материала (уменьшение) в пучках: ΔOп ' + String(ballBuildUpMm) + ' мм (радиальный съем ' + String(layerMm) + ' мм)')
  }
  return short ? 'База пучков 0 мм' : 'Базовая геометрия пучков (0 мм)'
}

export function formatInstepModification(instepBuildUpMm: number, short = false): string {
  const layerMm = computeRadialLayerMm(instepBuildUpMm)
  if (instepBuildUpMm > 0) {
    return short
      ? ('Налепка на гребень +' + String(instepBuildUpMm) + ' мм (слой +' + String(layerMm) + ' мм)')
      : ('Наращивание (налепка) на гребень взъёма: ΔOв +' + String(instepBuildUpMm) + ' мм (толщина налепки +' + String(layerMm) + ' мм)')
  }
  if (instepBuildUpMm < 0) {
    return short
      ? ('Снятие / вкладыш ' + String(instepBuildUpMm) + ' мм (слой ' + String(layerMm) + ' мм)')
      : ('Снятие материала с гребня (уменьшение / вкладыш): ΔOв ' + String(instepBuildUpMm) + ' мм (толщина ' + String(layerMm) + ' мм)')
  }
  return short ? 'Взъём в норме 0 мм' : 'Базовая геометрия прямого взъёма (0 мм)'
}

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
  shankProfileType?: ShankProfileType
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
    shankProfileType = 'flat_plate',
  } = params

  const profileDesc =
    shankProfileType === 'fluted_ribbed'
      ? 'желобчатый с ребром жёсткости'
      : 'плоский штампованный'

  if (soleType === 'thomas') {
    const sideLabel =
      thomasHeelType === 'lateral'
        ? 'с наружной (латеральной) стороны'
        : 'с внутренней (медиальной) стороны'
    return (
      'Ортопедический каблук Томаса с удлинением груди +' +
      String(thomasExtensionMm) +
      ' мм ' +
      String(sideLabel) +
      ' и стальным геленком 65Г (' +
      String(shankLengthMm) +
      '×' +
      String(steelThicknessMm) +
      ' мм, ' +
      String(profileDesc) +
      ')'
    )
  }
  if (soleType === 'rocker') {
    return (
      'Рокерная перекатная подошва (угол переката ' +
      String(rockerAngleDeg) +
      '°, старт на ' +
      String(rockerStartPct) +
      '% длины) с интегрированной карбоновой пластиной толщиной ' +
      String(carbonInsertThicknessMm) +
      ' мм'
    )
  }
  return (
    'Стандартный каблук (чистый перепад высот ' +
    String(netRiseMm) +
    ' мм) со стальным геленком 65Г (' +
    String(shankLengthMm) +
    '×' +
    String(steelThicknessMm) +
    ' мм, ' +
    String(profileDesc) +
    ')'
  )
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

/**
 * Вычисляет калиброванное двумерное гауссово поле плантарного давления по головкам M1–M5,
 * среднему отделу и пятке (на основе клинических профилей Novel Pedar / Tekscan).
 */
export function computeCalibratedPressureModel(params: {
  foreForceN: number
  heelForceN: number
  foreAreaCm2: number
  heelAreaCm2: number
  effectiveRollDeg: number
  halluxValgusDeg: number
  toeShape: ToeShape
  archType: ArchMorphology
  requiresMetatarsalPad: boolean
  uApexM1: number
  uApexM5: number
  uHeelCenter: number
}): PedobarographyModel {
  const {
    foreForceN,
    heelForceN,
    foreAreaCm2,
    heelAreaCm2,
    effectiveRollDeg,
    halluxValgusDeg,
    toeShape,
    archType,
    requiresMetatarsalPad,
    uApexM1,
    uApexM5,
    uHeelCenter,
  } = params

  const meanForeKpa = (foreForceN / Math.max(20, foreAreaCm2)) * 10
  const meanHeelKpa = (heelForceN / Math.max(15, heelAreaCm2)) * 10

  // Базовые весовые коэффициенты головок M1–M5 по данным педобарографии (Novel Pedar):
  // В норме M1 несёт самую высокую удельную нагрузку, далее M2 и M3, затем M4 и M5.
  // При Hallux Valgus >= 12° возникает функциональная недостаточность I луча с переносом пика на M2–M3 (transfer metatarsalgia).
  const hvTransfer =
    halluxValgusDeg >= 12 ? Math.min(0.28, (halluxValgusDeg - 10) * 0.012) : 0
  const rollShift = effectiveRollDeg * 0.025 // <0 (вальгус) смещает к M1, >0 (варус) смещает к M5
  const greekM2Boost = toeShape === 'greek' ? 0.08 : 0
  const cavusConcentration = archType === 'cavus' ? 1.14 : archType === 'flat' ? 0.96 : 1.0

  // Разгрузка центральных головок M2–M3 метатарзальным пелотом Зейца
  const pelotteCentralReliefFactor = requiresMetatarsalPad ? 0.84 : 1.0

  const factorM1 = Math.max(
    0.75,
    (1.48 - rollShift * 1.4 - hvTransfer * 0.65) * cavusConcentration
  )
  const factorM2 = Math.max(
    0.8,
    (1.42 + greekM2Boost + hvTransfer * 1.15 - rollShift * 0.4) *
      cavusConcentration *
      pelotteCentralReliefFactor
  )
  const factorM3 = Math.max(
    0.75,
    (1.34 + hvTransfer * 0.95 + rollShift * 0.2) *
      cavusConcentration *
      pelotteCentralReliefFactor
  )
  const factorM4 = Math.max(
    0.65,
    (1.12 + rollShift * 0.85) * cavusConcentration
  )
  const factorM5 = Math.max(
    0.65,
    (1.18 + rollShift * 1.45) * (archType === 'cavus' ? 1.18 : 1.0)
  )

  const kpaM1 = Math.round(meanForeKpa * factorM1)
  const kpaM2 = Math.round(meanForeKpa * factorM2)
  const kpaM3 = Math.round(meanForeKpa * factorM3)
  const kpaM4 = Math.round(meanForeKpa * factorM4)
  const kpaM5 = Math.round(meanForeKpa * factorM5)

  const unmitigatedM2M3 = Math.round(
    meanForeKpa *
      Math.max(
        factorM2 / pelotteCentralReliefFactor,
        factorM3 / pelotteCentralReliefFactor
      )
  )
  const pelotteReliefKpa = requiresMetatarsalPad
    ? Math.max(0, unmitigatedM2M3 - Math.max(kpaM2, kpaM3))
    : 0

  const kpaMidfoot =
    archType === 'cavus'
      ? Math.round(meanForeKpa * 0.22)
      : archType === 'flat'
        ? Math.round(meanForeKpa * 0.68)
        : Math.round(meanForeKpa * 0.42)

  const heelMedialBias = 1 - effectiveRollDeg * 0.018
  const heelLateralBias = 1 + effectiveRollDeg * 0.018
  const kpaHeelMedial = Math.round(meanHeelKpa * 1.44 * Math.max(0.7, heelMedialBias))
  const kpaHeelLateral = Math.round(meanHeelKpa * 1.42 * Math.max(0.7, heelLateralBias))

  const peakForefootKpa = Math.max(kpaM1, kpaM2, kpaM3, kpaM4, kpaM5)
  const peakHeelKpa = Math.max(kpaHeelMedial, kpaHeelLateral)

  let dominantMetatarsalRay: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' = 'M1'
  const rayPairs: Array<['M1' | 'M2' | 'M3' | 'M4' | 'M5', number]> = [
    ['M1', kpaM1],
    ['M2', kpaM2],
    ['M3', kpaM3],
    ['M4', kpaM4],
    ['M5', kpaM5],
  ]
  let maxRayVal = -1
  for (const [ray, val] of rayPairs) {
    if (val > maxRayVal) {
      maxRayVal = val
      dominantMetatarsalRay = ray
    }
  }

  // Интерполяция продольных позиций головок M1..M5 вдоль метатарзальной дуги
  const uM2 = uApexM1 + 0.012
  const uM3 = uApexM1 * 0.65 + uApexM5 * 0.35
  const uM4 = uApexM1 * 0.32 + uApexM5 * 0.68

  const gaussianCenters = [
    { id: 'M1', u: uApexM1, zRatio: 0.62, peakKpa: kpaM1, sigmaU: 0.065, sigmaZ: 0.28 },
    { id: 'M2', u: uM2, zRatio: 0.26, peakKpa: kpaM2, sigmaU: 0.06, sigmaZ: 0.24 },
    { id: 'M3', u: uM3, zRatio: -0.06, peakKpa: kpaM3, sigmaU: 0.06, sigmaZ: 0.24 },
    { id: 'M4', u: uM4, zRatio: -0.38, peakKpa: kpaM4, sigmaU: 0.058, sigmaZ: 0.24 },
    { id: 'M5', u: uApexM5, zRatio: -0.68, peakKpa: kpaM5, sigmaU: 0.062, sigmaZ: 0.26 },
    { id: 'MIDFOOT_LAT', u: 0.42, zRatio: -0.52, peakKpa: kpaMidfoot, sigmaU: 0.11, sigmaZ: 0.32 },
    { id: 'HEEL_MED', u: uHeelCenter, zRatio: 0.28, peakKpa: kpaHeelMedial, sigmaU: 0.075, sigmaZ: 0.35 },
    { id: 'HEEL_LAT', u: uHeelCenter, zRatio: -0.28, peakKpa: kpaHeelLateral, sigmaU: 0.075, sigmaZ: 0.35 },
  ] as const

  return {
    isCalibratedGaussianModel: true,
    calibrationReference: '2D Gaussian Pedobarography (Novel Pedar / Tekscan M1–M5 profile)',
    kpaM1,
    kpaM2,
    kpaM3,
    kpaM4,
    kpaM5,
    kpaMidfoot,
    kpaHeelMedial,
    kpaHeelLateral,
    peakForefootKpa,
    peakHeelKpa,
    dominantMetatarsalRay,
    pelotteReliefKpa,
    gaussianCenters,
  }
}

/**
 * Вычисляет прочность и усталостную долговечность геленка как составной балки
 * «затяжная стелька + геленок 65Г + подошва» на упругом винклеровском основании.
 */
export function computeCompositeShankEngineering(params: {
  soleType: SoleType
  gender: Gender
  weightKg: number
  netRiseMm: number
  shankLengthMm: number
  effectiveMomentArmMm: number
  totalBendingMomentNm: number
  archSupportHeightMm: number
  thomasExtensionMm: number
  preference?: ShankProfileType
}): ShankEngineeringModel {
  const C = HEEL_CONST
  const {
    soleType,
    gender,
    weightKg,
    netRiseMm,
    shankLengthMm,
    effectiveMomentArmMm,
    totalBendingMomentNm,
    archSupportHeightMm,
    thomasExtensionMm,
    preference,
  } = params

  let steelThickness = weightKg >= 85 || gender === 'male' ? 1.5 : 1.2
  if (netRiseMm > 35 || totalBendingMomentNm > 20) {
    steelThickness = Math.max(steelThickness, 1.5)
  }
  if (netRiseMm > 55 || totalBendingMomentNm > 25 || weightKg >= 105) {
    steelThickness = 2.0
  }

  const shankWidthMm = gender === 'male' ? 16 : 14
  const flatSectionModulusMm3 = (shankWidthMm * steelThickness * steelThickness) / 6

  // Разгрузка пролёта упругим основанием Винклера (выкладка продольного свода стельки + грудь каблука Томаса)
  const archWinklerRelief = Math.min(0.22, archSupportHeightMm * 0.012)
  const thomasWinklerRelief =
    soleType === 'thomas' ? Math.min(0.18, thomasExtensionMm * 0.008) : 0
  const rockerWinklerRelief = soleType === 'rocker' ? 0.35 : 0
  const totalWinklerRelief = Math.min(
    0.45,
    archWinklerRelief + thomasWinklerRelief + rockerWinklerRelief
  )
  const winklerFoundationReliefPct = Math.round(totalWinklerRelief * 100)

  // Распределение изгибающей жёсткости EI в составном пакете «затяжная стелька + стальной геленок + подошва»:
  // Стальной сердечник внутри слоистого пакета подошвы воспринимает ~14% (плоский) .. 18% (желобчатый) глобального момента свода
  const prelimFlatNetMomentNmm = totalBendingMomentNm * (1 - totalWinklerRelief) * 0.14 * 1000
  const prelimFlatStressMpa = prelimFlatNetMomentNmm / Math.max(0.8, flatSectionModulusMm3)
  const autoNeedsFluted =
    weightKg >= 85 || netRiseMm >= 28 || totalBendingMomentNm >= 16 || prelimFlatStressMpa > 280
  const profileType: ShankProfileType =
    preference ?? (autoNeedsFluted ? 'fluted_ribbed' : 'flat_plate')

  const compositeShare = profileType === 'fluted_ribbed' ? 0.18 : 0.14
  const compositeShankLoadSharePct = Math.round(compositeShare * 100)

  const ribDepthMm = profileType === 'fluted_ribbed' ? 1.8 : 0
  const sectionModulusMm3 = parseFloat(
    (
      flatSectionModulusMm3 *
      (profileType === 'fluted_ribbed' ? C.FLUTED_SHANK_SECTION_GAIN : 1.0)
    ).toFixed(2)
  )

  const netShankMomentNm = parseFloat(
    (totalBendingMomentNm * (1 - totalWinklerRelief) * compositeShare).toFixed(2)
  )
  const netShankMomentNmm = netShankMomentNm * 1000
  const estimatedBendingStressMpa = Math.round(
    netShankMomentNmm / Math.max(0.8, sectionModulusMm3)
  )

  const safetyFactor = parseFloat(
    (C.STEEL_65G_YIELD_STRENGTH_MPA / Math.max(1, estimatedBendingStressMpa)).toFixed(2)
  )
  const fatigueSafetyFactor = parseFloat(
    (
      C.STEEL_65G_FATIGUE_LIMIT_1E6_MPA / Math.max(1, estimatedBendingStressMpa)
    ).toFixed(2)
  )

  const isOverloaded =
    totalBendingMomentNm > C.MAX_SHANK_MOMENT_NM || fatigueSafetyFactor < 1.0

  const profileLabel =
    soleType === 'rocker'
      ? 'Интегрированная карбоновая пластина'
      : profileType === 'fluted_ribbed'
        ? 'Желобчатый геленок 65Г с ребром жёсткости (HRC 46)'
        : 'Плоский штампованный геленок 65Г (HRC 45)'

  const fatigueLifeStatus =
    fatigueSafetyFactor >= 1.25
      ? ('Ресурс > 10^6 циклов шага (запас выносливости k_fat = ' + String(fatigueSafetyFactor) + ')')
      : fatigueSafetyFactor >= 1.0
        ? ('Допустимый ресурс ~10^6 циклов (k_fat = ' + String(fatigueSafetyFactor) + ', рекомендуется контроль жёсткости)')
        : ('Риск усталостного разрушения до 10^6 циклов (k_fat = ' + String(fatigueSafetyFactor) + ' < 1.0)!')

  return {
    isAnalyticalEstimate: true,
    material: soleType === 'rocker' ? 'carbon_composite' : 'steel_65G',
    profileType,
    profileLabel,
    shankLengthMm,
    shankWidthMm,
    steelThicknessMm: steelThickness,
    ribDepthMm,
    effectiveMomentArmMm,
    bendingMomentNm: totalBendingMomentNm,
    compositeShankLoadSharePct,
    winklerFoundationReliefPct,
    netShankMomentNm,
    maxAllowedMomentNm: C.MAX_SHANK_MOMENT_NM,
    sectionModulusMm3,
    estimatedBendingStressMpa,
    fatigueLimit1e6Mpa: C.STEEL_65G_FATIGUE_LIMIT_1E6_MPA,
    safetyFactor,
    fatigueSafetyFactor,
    fatigueLifeStatus,
    isOverloaded,
  }
}

/**
 * Вычисляет индивидуальную спецификацию полупары (левой или правой) для двухколоночного ТЗ.
 */
function computeHalfPairSpec(params: {
  side: 'left' | 'right'
  gender: Gender
  shoeSize: number
  weightKg: number
  footLengthMm: number
  soleType: SoleType
  heelHeight: number
  toeThickness: number
  rockerAngle: number
  rockerStartPct: number
  compensatoryInsoleMm: number
  profile: FootSideProfile
}): HalfPairPrescriptionSpec {
  const C = HEEL_CONST
  const {
    side,
    gender,
    shoeSize,
    weightKg,
    footLengthMm,
    soleType,
    heelHeight,
    toeThickness,
    rockerAngle,
    rockerStartPct,
    compensatoryInsoleMm,
    profile,
  } = params

  const hvDeg = Math.max(0, Math.min(40, profile.halluxValgusDeg))
  const clampedPronation = Math.max(-15, Math.min(15, profile.pronationDeg))
  const std = getStandardGirths(gender, shoeSize)

  const toeShapeAllowanceMm =
    profile.toeShape === 'greek'
      ? C.TOE_ALLOWANCE_GREEK_MM
      : profile.toeShape === 'roman'
        ? C.TOE_ALLOWANCE_ROMAN_MM
        : C.TOE_ALLOWANCE_EGYPTIAN_MM
  const toeFreeSpaceMm =
    C.BASE_TOE_FREE_SPACE_MM +
    (gender === 'male' ? C.MALE_TOE_EXTRA_MM : 0) +
    (toeShapeAllowanceMm - C.TOE_ALLOWANCE_EGYPTIAN_MM)
  const lastLengthMm = Math.round(footLengthMm + toeFreeSpaceMm + C.LAST_FASHION_ALLOWANCE_MM)

  const ballBuildUpMm = profile.ballGirthMm - std.ballGirthMm
  const instepBuildUpMm = profile.instepGirthMm - std.instepGirthMm
  const obliqueEntryDeltaMm = profile.obliqueGirthMm - std.obliqueGirthMm

  const ballRadialLayerMm = computeRadialLayerMm(ballBuildUpMm)
  const instepRadialLayerMm = computeRadialLayerMm(instepBuildUpMm)
  const ballModAction = getBuildUpAction(ballBuildUpMm)
  const instepModAction = getBuildUpAction(instepBuildUpMm)

  const forefootWidthMm = parseFloat(
    (profile.ballGirthMm * C.FOREFOOT_WIDTH_TO_GIRTH_RATIO).toFixed(1)
  )
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

  const medialBunionPocketMm =
    hvDeg >= C.HV_POCKET_THRESHOLD_DEG
      ? Math.min(
          C.MAX_BUNION_POCKET_MM,
          Math.round((hvDeg - C.HV_BASE_NORMAL_DEG) * C.HV_POCKET_FACTOR)
        )
      : 0
  const effectiveForefootWidthWithBunionMm = parseFloat(
    (forefootWidthMm + medialBunionPocketMm).toFixed(1)
  )

  const hvExtraApexShiftMm =
    hvDeg >= C.HV_POCKET_THRESHOLD_DEG
      ? Math.round((hvDeg - C.HV_BASE_NORMAL_DEG) * C.HV_APEX_SHIFT_FACTOR)
      : 0

  let lastApexType: LastApexType = 'medial_straight'
  let lastApexLabel = 'Прямой апекс (I луч)'
  let toeBoxShiftMedialMm = 5

  if (profile.toeShape === 'greek') {
    if (hvDeg < 15) {
      lastApexType = 'oblique_anatomical'
      lastApexLabel = 'Косой апекс (II луч)'
      toeBoxShiftMedialMm = hvExtraApexShiftMm
    } else {
      lastApexType = 'medial_straight'
      lastApexLabel = 'Орто-прямой апекс (HV + II луч)'
      toeBoxShiftMedialMm = 3 + hvExtraApexShiftMm
    }
  } else if (profile.toeShape === 'roman') {
    lastApexType = 'wide_square'
    lastApexLabel = 'Широкий апекс (I–III лучи)'
    toeBoxShiftMedialMm = 3 + hvExtraApexShiftMm
  } else {
    lastApexType = 'medial_straight'
    lastApexLabel = hvDeg >= 10 ? 'Орто-прямой апекс (I луч + HV)' : 'Прямой апекс (I луч)'
    toeBoxShiftMedialMm = 5 + hvExtraApexShiftMm
  }

  const toeBoxHeightMm = profile.archType === 'cavus' ? 28 : hvDeg >= 15 ? 25 : 22
  const requiresZipOrLaceWarning =
    obliqueEntryDeltaMm >= 12 || instepBuildUpMm >= 10 || profile.archType === 'cavus'

  const weightScale = 0.85 + (weightKg - 70) / 220
  let insoleType: 'neutral' | 'supinator' | 'pronator' = 'neutral'
  let archSupportHeightMm =
    profile.archType === 'cavus' ? 12 : profile.archType === 'flat' ? 11 : 7
  let medialHeelWedgeMm = 0
  let lateralWedgeMm = 0
  let recommendedThomasMm = Math.round(15 * Math.min(1.15, weightScale))

  if (clampedPronation <= -2) {
    const valgusAbs = Math.abs(clampedPronation)
    insoleType = 'supinator'
    archSupportHeightMm = Math.min(15, Math.round(9 + valgusAbs * 0.45))
    medialHeelWedgeMm = Math.min(7, Math.max(2, Math.round(valgusAbs * 0.5 * weightScale)))
    recommendedThomasMm = Math.min(
      26,
      Math.round((13 + valgusAbs * 0.95) * Math.min(1.15, weightScale))
    )
  } else if (clampedPronation >= 2) {
    const varusAbs = Math.abs(clampedPronation)
    insoleType = 'pronator'
    archSupportHeightMm = Math.max(0, Math.round(4 - varusAbs * 0.4))
    lateralWedgeMm = Math.min(7, Math.max(2, Math.round(varusAbs * 0.5 * weightScale)))
    recommendedThomasMm = Math.min(
      24,
      Math.round((12 + varusAbs * 0.9) * Math.min(1.15, weightScale))
    )
  } else if (profile.archType === 'flat') {
    insoleType = 'supinator'
  }

  const thomasHeelType: 'none' | 'medial' | 'lateral' =
    soleType === 'thomas' ? (clampedPronation >= 2 ? 'lateral' : 'medial') : 'none'
  const thomasExtensionMm = soleType === 'thomas' ? recommendedThomasMm : 0

  const clampedStartPct = Math.max(52, Math.min(78, rockerStartPct))
  const ballPos = lastLengthMm * (clampedStartPct / 100)
  const apexM1_Mm = Math.round(ballPos - C.M1_PROXIMAL_FROM_BALL_MM)
  const apexM5_Mm = Math.round(apexM1_Mm - footLengthMm * C.M5_PROXIMAL_TO_FOOT_RATIO)
  const netRise = heelHeight - toeThickness
  const lEff = lastLengthMm * Math.max(0.58, Math.min(0.78, (clampedStartPct / 100 - 0.15) * 1.38))

  let loadCalc = C.BASE_FOREFOOT_LOAD_PCT + (netRise / Math.max(lEff, 1)) * C.SLOPE_TO_LOAD_GAIN
  if (soleType === 'rocker') {
    const factor =
      Math.min(1, Math.max(0, rockerAngle / C.MAX_ROCKER_ANGLE)) *
      Math.max(0.35, 1 - Math.abs(clampedStartPct - 60) / 28)
    loadCalc *= 1 - C.ROCKER_MITIGATION_CAP * factor
  } else if (soleType === 'thomas') {
    loadCalc *= C.THOMAS_LOAD_RELIEF_FACTOR
  }
  const forefootLoad = Math.min(100, Math.max(0, Math.round(loadCalc)))
  const heelLoad = 100 - forefootLoad

  const totalForceN = weightKg * 9.81 * C.QUASI_STATIC_GAIT_FACTOR
  const contactAreaScale =
    (footLengthMm / C.REF_FOOT_LENGTH_MM) *
    (1 + ballBuildUpMm * 0.008 + medialBunionPocketMm * 0.005)
  const orthoReliefFactor =
    soleType === 'rocker' ? 1.52 : soleType === 'thomas' ? 1.42 : 1.0
  const foreAreaCm2 = Math.max(30, C.REF_FOREFOOT_CONTACT_AREA_CM2 * contactAreaScale * orthoReliefFactor)
  const heelAreaCm2 = Math.max(
    22,
    C.REF_HEEL_CONTACT_AREA_CM2 * contactAreaScale * (soleType !== 'flat' ? 1.32 : 1.0)
  )

  const orthoStabilization =
    soleType === 'thomas'
      ? clampedPronation * 0.52
      : soleType === 'rocker'
        ? clampedPronation * 0.42
        : clampedPronation * 0.35
  const effectiveRoll = clampedPronation - orthoStabilization

  const prelimPad =
    forefootLoad >= C.PELOTTE_LOAD_THRESHOLD_PCT || ballBuildUpMm >= 6 || hvDeg >= 12
  const pModel = computeCalibratedPressureModel({
    foreForceN: totalForceN * (forefootLoad / 100),
    heelForceN: totalForceN * (heelLoad / 100),
    foreAreaCm2,
    heelAreaCm2,
    effectiveRollDeg: effectiveRoll,
    halluxValgusDeg: hvDeg,
    toeShape: profile.toeShape,
    archType: profile.archType,
    requiresMetatarsalPad: prelimPad,
    uApexM1: apexM1_Mm / lastLengthMm,
    uApexM5: apexM5_Mm / lastLengthMm,
    uHeelCenter: C.HEEL_CENTER_RATIO,
  })

  const requiresMetatarsalPad =
    prelimPad || pModel.peakForefootKpa >= C.PELOTTE_PRESSURE_THRESHOLD_KPA
  const metatarsalPadPosMm = requiresMetatarsalPad
    ? Math.round(apexM1_Mm - C.PELOTTE_PROXIMAL_OFFSET_MM)
    : null
  const metatarsalPadHeightMm = requiresMetatarsalPad
    ? weightKg >= 100 || ballBuildUpMm >= 10 || hvDeg >= 15
      ? 6
      : netRise > 25
        ? 5
        : 4
    : null

  return {
    side,
    sideLabel: side === 'left' ? 'Левая полупара (L)' : 'Правая полупара (R)',
    footLengthMm,
    lastLengthMm,
    widthCode,
    forefootWidthMm,
    effectiveForefootWidthWithBunionMm,
    ballGirthMm: profile.ballGirthMm,
    ballBuildUpMm,
    ballRadialLayerMm,
    ballModAction,
    ballModSummary: formatBallModification(ballBuildUpMm, true),
    instepGirthMm: profile.instepGirthMm,
    instepBuildUpMm,
    instepRadialLayerMm,
    instepModAction,
    instepModSummary: formatInstepModification(instepBuildUpMm, true),
    obliqueGirthMm: profile.obliqueGirthMm,
    obliqueEntryDeltaMm,
    requiresZipOrLaceWarning,
    pronationDeg: clampedPronation,
    halluxValgusDeg: hvDeg,
    archType: profile.archType,
    toeShape: profile.toeShape,
    medialBunionPocketMm,
    toeBoxShiftMedialMm,
    toeBoxHeightMm,
    toeFreeSpaceMm,
    lastApexType,
    lastApexLabel,
    insoleType,
    archSupportHeightMm,
    medialHeelWedgeMm,
    lateralWedgeMm,
    thomasHeelType,
    thomasExtensionMm,
    compensatoryInsoleMm,
    requiresMetatarsalPad,
    metatarsalPadHeightMm,
    metatarsalPadPosMm,
    peakForefootPressureKpa: pModel.peakForefootKpa,
    dominantRay: pModel.dominantMetatarsalRay,
  }
}

/**
 * Специализированная система валидации геометрии колодки, правил припусков и клинических эвристик.
 */
export function validateLastGeometry(
  input: HeelInput,
  gm: LastGeometryModel,
  shankEng: ShankEngineeringModel,
  pressureModel: PedobarographyModel,
  internalSlope: number,
  forefootLoad: number,
  inversionRisk: number,
  highPronationStress: boolean,
  obliqueEntryDeltaMm: number
): LastValidationReport {
  const C = HEEL_CONST
  const invariants: ValidationRuleResult[] = []
  const criticalChecks: ValidationRuleResult[] = []
  const allowanceRules: ValidationRuleResult[] = []
  const clinicalHeuristics: ValidationRuleResult[] = []

  // 1. ВАЖНЫЕ ГЕОМЕТРИЧЕСКИЕ ИНВАРИАНТЫ РАЗМЕРНОЙ ЦЕПИ (обязательные)
  const chainMonotonic =
    gm.xHeelMm === 0 &&
    gm.xHeelCenterMm > gm.xHeelMm &&
    gm.xHeelFrontBaseMm > gm.xHeelCenterMm &&
    gm.xThomasFrontMm >= gm.xHeelFrontBaseMm &&
    gm.xPelotteMm > gm.xHeelCenterMm &&
    gm.xApexM5Mm < gm.xApexM1Mm &&
    gm.xApexM1Mm < gm.xBallMm &&
    gm.xBallMm < gm.xToeMm &&
    gm.xToeMm === gm.lastLengthMm

  invariants.push({
    code: 'INV_CHAIN_MONOTONIC',
    category: 'GEOMETRY_INVARIANT',
    severity: 'ERROR',
    title: 'Монотонность продольной размерной цепи (0 < X_пят < X_M5 < X_M1 < X_пуч < L_last)',
    description: chainMonotonic
      ? ('Размерная цепь корректна: Пятка ' + String(gm.xHeelCenterMm) + ' < M5 ' + String(gm.xApexM5Mm) + ' < M1 ' + String(gm.xApexM1Mm) + ' < Пучки ' + String(gm.xBallMm) + ' < Мысок ' + String(gm.lastLengthMm) + ' мм.')
      : 'Нарушен порядок анатомических координат вдоль продольной оси колодки!',
    passed: chainMonotonic,
  })

  const thomasPelotteClearance =
    gm.soleType !== 'thomas' || gm.xThomasFrontMm <= gm.xPelotteMm - 6
  invariants.push({
    code: 'INV_THOMAS_PELOTTE_CLEARANCE',
    category: 'GEOMETRY_INVARIANT',
    severity: 'ERROR',
    title: 'Непересечение груди каблука Томаса и зоны пелота Зейца',
    description: thomasPelotteClearance
      ? ('Клиренс соблюдён: срез Томаса (' + String(gm.xThomasFrontMm) + ' мм) проксимальнее пелота (' + String(gm.xPelotteMm) + ' мм).')
      : ('Кросс-конфликт: удлинение Томаса (' + String(gm.xThomasFrontMm) + ' мм) наезжает на зону пелота Зейца (' + String(gm.xPelotteMm) + ' мм)!'),
    passed: thomasPelotteClearance,
  })

  const shankSpanInvariant =
    gm.xShankStartMm >= gm.xHeelCenterMm - 2 && gm.xShankEndMm <= gm.xBallMm - 3
  invariants.push({
    code: 'INV_SHANK_SPAN',
    category: 'GEOMETRY_INVARIANT',
    severity: 'ERROR',
    title: 'Размещение геленка строго в межцентровой сводовой зоне',
    description: shankSpanInvariant
      ? ('Геленок (' + String(gm.xShankStartMm) + '…' + String(gm.xShankEndMm) + ' мм) не блокирует линию пучков (' + String(gm.xBallMm) + ' мм).')
      : 'Конец геленка выходит в зону переката плюснефаланговых суставов!',
    passed: shankSpanInvariant,
  })

  const normalizedCoordSync =
    Math.abs(gm.uApexM1 * gm.lastLengthMm - gm.xApexM1Mm) <= 0.5 &&
    Math.abs(gm.uApexM5 * gm.lastLengthMm - gm.xApexM5Mm) <= 0.5 &&
    Math.abs(gm.uBall * gm.lastLengthMm - gm.xBallMm) <= 0.5
  invariants.push({
    code: 'INV_NORMALIZED_SYNC',
    category: 'GEOMETRY_INVARIANT',
    severity: 'ERROR',
    title: 'Синхронизация абсолютных (мм) и нормализованных (u ∈ [0,1]) координат 2D/3D',
    description: normalizedCoordSync
      ? 'Координаты 2D SVG, 3D меша и ТЗ синхронизированы с точностью < 0.5 мм.'
      : 'Рассогласование нормализованных и миллиметровых координат!',
    passed: normalizedCoordSync,
  })

  // 2. КРИТИЧЕСКИЕ ОШИБКИ БИОМЕХАНИКИ И КОНСТРУКЦИИ (блокируют зелёный статус SUCCESS)
  const nonNegativeDrop = gm.netRiseMm >= 0
  criticalChecks.push({
    code: 'ERR_NEGATIVE_DROP',
    category: 'CRITICAL_BIOMECHANICS',
    severity: 'ERROR',
    title: 'Неотрицательный перепад высот (Drop = H − T ≥ 0 мм)',
    description: nonNegativeDrop
      ? ('Перепад высот в норме: Drop = ' + String(gm.netRiseMm) + ' мм.')
      : ('Отрицательный дроп (' + String(gm.netRiseMm) + ' мм): платформа носка выше пятки!'),
    passed: nonNegativeDrop,
  })

  const heelOffsetSafe =
    gm.soleType === 'rocker' ||
    (gm.effectiveHeelTipOffsetMm >= C.MIN_SAFE_HEEL_OFFSET_MM &&
      gm.effectiveHeelTipOffsetMm <= C.MAX_SAFE_HEEL_OFFSET_MM)
  criticalChecks.push({
    code: 'ERR_HEEL_OFFSET_RANGE',
    category: 'CRITICAL_BIOMECHANICS',
    severity: 'ERROR',
    title: ('Соосность посадки пятки (допуск ' + String(C.MIN_SAFE_HEEL_OFFSET_MM) + '…+' + String(C.MAX_SAFE_HEEL_OFFSET_MM) + ' мм)'),
    description: heelOffsetSafe
      ? ('Смещение оси набойки (' + String(gm.effectiveHeelTipOffsetMm) + ' мм) в пределах допуска.')
      : ('Выход смещения каблука (' + String(gm.effectiveHeelTipOffsetMm) + ' мм) за безопасный диапазон!'),
    passed: heelOffsetSafe,
  })

  const soleHeightSafe =
    !(gm.soleType === 'thomas' && gm.heelHeightMm > C.MAX_THOMAS_HEEL_MM) &&
    !(
      gm.soleType === 'rocker' &&
      (gm.heelHeightMm > C.MAX_ROCKER_HEEL_MM || gm.netRiseMm > C.MAX_ROCKER_NET_RISE_MM)
    )
  criticalChecks.push({
    code: 'ERR_SOLE_HEIGHT_LIMIT',
    category: 'CRITICAL_BIOMECHANICS',
    severity: 'ERROR',
    title: 'Соблюдение предельной высоты для каблука Томаса (≤ 35 мм) и рокера (≤ 45 мм)',
    description: soleHeightSafe
      ? 'Высота каблука соответствует выбранному типу ортопедической подошвы.'
      : 'Превышена предельная высота каблука для выбранного типа подошвы!',
    passed: soleHeightSafe,
  })

  const shankAndSlopeSafe =
    internalSlope < C.CRITICAL_ANGLE && !shankEng.isOverloaded
  criticalChecks.push({
    code: 'ERR_SHANK_AND_SLOPE',
    category: 'CRITICAL_BIOMECHANICS',
    severity: 'ERROR',
    title: 'Прочность геленка 65Г (10^6 циклов) и критический угол уклона (< 16°)',
    description: shankAndSlopeSafe
      ? ('Уклон ' + String(internalSlope.toFixed(1)) + '°, момент ' + String(shankEng.bendingMomentNm) + ' Н·м, запас выносливости k_fat = ' + String(shankEng.fatigueSafetyFactor) + '.')
      : ('Перегрузка супинатора или критический уклон (' + String(internalSlope.toFixed(1)) + '° / ' + String(shankEng.bendingMomentNm) + ' Н·м)!'),
    passed: shankAndSlopeSafe,
  })

  const pressureSafe =
    pressureModel.peakForefootKpa < C.CRITICAL_KPA && forefootLoad < C.CRITICAL_LOAD
  criticalChecks.push({
    code: 'ERR_FOREFOOT_PRESSURE',
    category: 'CRITICAL_BIOMECHANICS',
    severity: 'ERROR',
    title: ('Пиковое давление под пучками M1–M5 (< ' + String(C.CRITICAL_KPA) + ' кПа) и нагрузка (< ' + String(C.CRITICAL_LOAD) + '%)'),
    description: pressureSafe
      ? ('Максимум на луче ' + String(pressureModel.dominantMetatarsalRay) + ': ' + String(pressureModel.peakForefootKpa) + ' кПа (' + String(forefootLoad) + '%).')
      : ('Критическая перегрузка на луче ' + String(pressureModel.dominantMetatarsalRay) + ': ' + String(pressureModel.peakForefootKpa) + ' кПа (' + String(forefootLoad) + '%)!'),
    passed: pressureSafe,
  })

  const lateralStabilitySafe = inversionRisk < 52 && !highPronationStress
  criticalChecks.push({
    code: 'ERR_LATERAL_STABILITY',
    category: 'CRITICAL_BIOMECHANICS',
    severity: 'ERROR',
    title: 'Фронтальная устойчивость голеностопа (риск инверсии < 52%)',
    description: lateralStabilitySafe
      ? ('Индекс боковой нестабильности ' + String(inversionRisk) + '% в пределах нормы.')
      : ('Высокий риск бокового подворота стопы (' + String(inversionRisk) + '%)!'),
    passed: lateralStabilitySafe,
  })

  // 3. ПРАВИЛА ПО ПРИПУСКАМ И ПОЛНОТЕ (под поля проекта)
  const manualBuildUpLimitOk =
    gm.ballBuildUpMm <= C.MAX_MANUAL_GIRTH_BUILDUP_MM &&
    gm.instepBuildUpMm <= C.MAX_MANUAL_GIRTH_BUILDUP_MM &&
    gm.ballBuildUpMm >= -C.MAX_MANUAL_GIRTH_REDUCTION_MM &&
    gm.instepBuildUpMm >= -C.MAX_MANUAL_GIRTH_REDUCTION_MM

  allowanceRules.push({
    code: 'RULE_MANUAL_BUILDUP_LIMIT',
    category: 'ALLOWANCE_AND_GIRTH',
    severity: manualBuildUpLimitOk ? 'INFO' : 'WARNING',
    title: 'Технологический предел ручной модификации стандартной колодки',
    description: manualBuildUpLimitOk
      ? ('Отклонения обхватов (ΔOп = ' + String(gm.ballBuildUpMm) + ' мм, ΔOв = ' + String(gm.instepBuildUpMm) + ' мм) допускают доработку базовой колодки.')
      : ('Экстремальное отклонение обхватов (ΔOп = ' + String(gm.ballBuildUpMm) + ' мм, ΔOв = ' + String(gm.instepBuildUpMm) + ' мм): вместо толстой ручной налепки рекомендуется индивидуальное ЧПУ-фрезерование колодки!'),
    passed: manualBuildUpLimitOk,
  })

  const minReqFreeSpace =
    gm.toeShape === 'greek' ? 13 : gm.toeShape === 'roman' ? 11 : 10
  const toeAllowanceOk = gm.toeFreeSpaceMm >= minReqFreeSpace
  allowanceRules.push({
    code: 'RULE_TOE_FREE_SPACE',
    category: 'ALLOWANCE_AND_GIRTH',
    severity: toeAllowanceOk ? 'INFO' : 'WARNING',
    title: 'Достаточность носочного припуска под форму пальцев',
    description: toeAllowanceOk
      ? ('Припуск перед пальцами +' + String(gm.toeFreeSpaceMm) + ' мм соответствует морфологии (' + String(gm.toeShape) + ').')
      : ('Недостаточный припуск перед пальцами (+' + String(gm.toeFreeSpaceMm) + ' мм < ' + String(minReqFreeSpace) + ' мм)!'),
    passed: toeAllowanceOk,
  })

  const entryErgonomicsOk =
    obliqueEntryDeltaMm < 12 && gm.instepBuildUpMm < 10 && input.archType !== 'cavus'
  allowanceRules.push({
    code: 'RULE_OBLIQUE_ENTRY',
    category: 'ALLOWANCE_AND_GIRTH',
    severity: entryErgonomicsOk ? 'INFO' : 'WARNING',
    title: 'Проходимость пучковой и подъёмной части при надевании (косой обхват Oк)',
    description: entryErgonomicsOk
      ? 'Косой обхват позволяет стандартную конструкцию застёжки.'
      : 'Высокий взъём / косой обхват: обязательна глубокая шнуровка до пучков или застёжка-молния.',
    passed: entryErgonomicsOk,
  })

  // 4. КЛИНИЧЕСКИЕ ЭВРИСТИКИ ПОД ПАРАМЕТРЫ ПРОЕКТА
  const cavusHighDropConflict =
    input.archType === 'cavus' && gm.netRiseMm > 18
  clinicalHeuristics.push({
    code: 'CLIN_CAVUS_DROP',
    category: 'CLINICAL_HEURISTIC',
    severity: cavusHighDropConflict ? 'WARNING' : 'INFO',
    title: 'Сочетание полой стопы (Cavus) и высоты перепада каблука',
    description: cavusHighDropConflict
      ? ('При полой стопе перепад ' + String(gm.netRiseMm) + ' мм резко перегружает головки M1 и M5 (средний отдел выключается из опоры). Рекомендуется снизить перепад до ≤ 16 мм.')
      : 'Высота перепада согласована с морфологией продольного свода.',
    passed: !cavusHighDropConflict,
  })

  const hvHighSlopeConflict =
    (input.halluxValgusDeg ?? 0) >= 15 && gm.netRiseMm > 20 && gm.soleType !== 'rocker'
  clinicalHeuristics.push({
    code: 'CLIN_HV_SLOPE',
    category: 'CLINICAL_HEURISTIC',
    severity: hvHighSlopeConflict ? 'WARNING' : 'INFO',
    title: 'Защита I плюснефалангового сустава при Hallux Valgus ≥ 15°',
    description: hvHighSlopeConflict
      ? ('При HV = ' + String(input.halluxValgusDeg) + '° и перепаде ' + String(gm.netRiseMm) + ' мм возрастает дорсифлексионная нагрузка на I луч. Рекомендуется перепад ≤ 18 мм и бесшовная союзка.')
      : 'Режим разгрузки I плюснефалангового сустава соблюдён.',
    passed: !hvHighSlopeConflict,
  })

  const severeAsymmetryPairConflict = gm.requiresMismatchedPairLasts
  clinicalHeuristics.push({
    code: 'CLIN_ASYMMETRY_MISMATCHED_PAIR',
    category: 'CLINICAL_HEURISTIC',
    severity: severeAsymmetryPairConflict ? 'WARNING' : 'INFO',
    title: 'Критерий распаровки комплекта колодок при выраженной анизомелии (ΔL ≥ 8 мм)',
    description: severeAsymmetryPairConflict
      ? ('Разница длин стоп ΔL = ' + String(gm.lengthAsymmetryMm) + ' мм ≥ 8 мм: одной компенсационной полустельки (+' + String(gm.compensatoryInsoleHalfPairMm) + ' мм) недостаточно — рекомендуется распаровка колодок (разные размеры L и R)!')
      : ('Разница длин стоп ΔL = ' + String(gm.lengthAsymmetryMm) + ' мм компенсируется в рамках одного базового размера колодки.'),
    passed: !severeAsymmetryPairConflict,
  })

  const allRules = [
    ...invariants,
    ...criticalChecks,
    ...allowanceRules,
    ...clinicalHeuristics,
  ]
  const activeIssues = allRules.filter((r) => !r.passed)
  const allInvariantsPassed = invariants.every((r) => r.passed)
  const hasCriticalErrors =
    !allInvariantsPassed || criticalChecks.some((r) => !r.passed)
  const hasWarnings =
    allowanceRules.some((r) => !r.passed) ||
    clinicalHeuristics.some((r) => !r.passed)

  return {
    allInvariantsPassed,
    hasCriticalErrors,
    hasWarnings,
    invariants,
    criticalChecks,
    allowanceRules,
    clinicalHeuristics,
    activeIssues,
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
    independentSides = false,
    activeSide = 'left',
    leftProfile,
    rightProfile,
    shankProfilePreference,
  } = input

  // Если включён раздельный режим L/R, берём для основной визуализации параметры выбранной activeSide
  const activeSideProfile: FootSideProfile =
    independentSides && activeSide === 'right' && rightProfile
      ? rightProfile
      : independentSides && activeSide === 'left' && leftProfile
        ? leftProfile
        : {
            ballGirthMm,
            instepGirthMm,
            obliqueGirthMm,
            pronationDeg,
            halluxValgusDeg,
            archType,
            toeShape,
          }

  const effBallGirthMm = activeSideProfile.ballGirthMm
  const effInstepGirthMm = activeSideProfile.instepGirthMm
  const effObliqueGirthMm = activeSideProfile.obliqueGirthMm
  const effPronationDeg = activeSideProfile.pronationDeg
  const effHvDeg = activeSideProfile.halluxValgusDeg
  const effArchType = activeSideProfile.archType
  const effToeShape = activeSideProfile.toeShape

  const clampedWeight = Math.max(35, Math.min(160, weightKg))
  const hvDeg = Math.max(0, Math.min(40, effHvDeg))
  const rawAsymMm = Math.max(0, Math.min(15, lengthAsymmetryMm))

  // 1. Разрешение стороны асимметрии стоп (left longer / right longer / equal)
  const resolvedAsymmetrySide: AsymmetrySide =
    rawAsymMm === 0 || asymmetrySide === 'equal'
      ? 'equal'
      : asymmetrySide === 'right'
        ? 'right'
        : 'left'

  const effectiveAsymMm = resolvedAsymmetrySide === 'equal' ? 0 : rawAsymMm
  const requiresMismatchedPairLasts =
    effectiveAsymMm >= C.MISMATCHED_PAIR_LAST_THRESHOLD_MM

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
    effToeShape === 'greek'
      ? C.TOE_ALLOWANCE_GREEK_MM
      : effToeShape === 'roman'
        ? C.TOE_ALLOWANCE_ROMAN_MM
        : C.TOE_ALLOWANCE_EGYPTIAN_MM
  const toeFreeSpaceMm =
    C.BASE_TOE_FREE_SPACE_MM +
    (gender === 'male' ? C.MALE_TOE_EXTRA_MM : 0) +
    (toeShapeAllowanceMm - C.TOE_ALLOWANCE_EGYPTIAN_MM)
  const fashionAllowanceMm = C.LAST_FASHION_ALLOWANCE_MM
  const lastLengthMm = Math.round(footLengthMm + toeFreeSpaceMm + fashionAllowanceMm)

  // 2. Поперечные обхваты, полнота и модификации колодки
  const std = getStandardGirths(gender, shoeSize)
  const ballBuildUpMm = effBallGirthMm - std.ballGirthMm
  const instepBuildUpMm = effInstepGirthMm - std.instepGirthMm
  const obliqueEntryDeltaMm = effObliqueGirthMm - std.obliqueGirthMm

  const ballRadialLayerMm = computeRadialLayerMm(ballBuildUpMm)
  const instepRadialLayerMm = computeRadialLayerMm(instepBuildUpMm)
  const ballModAction = getBuildUpAction(ballBuildUpMm)
  const instepModAction = getBuildUpAction(instepBuildUpMm)
  const ballModSummary = formatBallModification(ballBuildUpMm)
  const instepModSummary = formatInstepModification(instepBuildUpMm)

  const standardForefootWidthMm = parseFloat(
    (std.ballGirthMm * C.FOREFOOT_WIDTH_TO_GIRTH_RATIO).toFixed(1)
  )
  const forefootWidthMm = parseFloat(
    (effBallGirthMm * C.FOREFOOT_WIDTH_TO_GIRTH_RATIO).toFixed(1)
  )
  const heelWidthMm = parseFloat((effBallGirthMm * C.HEEL_WIDTH_TO_GIRTH_RATIO).toFixed(1))
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
    obliqueEntryDeltaMm >= 12 || instepBuildUpMm >= 10 || effArchType === 'cavus'

  // 3. Морфология пальцев (египетская / греческая / римская), апекс и карман под Hallux Valgus
  const anatomicalFootApexOffsetMm =
    effToeShape === 'egyptian' ? 9 : effToeShape === 'greek' ? -2 : 3

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

  if (effToeShape === 'greek') {
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
  } else if (effToeShape === 'roman') {
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
  const toeBoxHeightMm = effArchType === 'cavus' ? 28 : hvDeg >= 15 ? 25 : 22

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
      asymmetrySummary =
        String(longerName) +
        ' стопа длиннее на ' +
        String(effectiveAsymMm) +
        ' мм (Лев: ' +
        String(leftFootLengthMm) +
        ' мм, Прав: ' +
        String(rightFootLengthMm) +
        ' мм). Подбор базовой колодки по длинной стопе; в ' +
        String(shorterAccusative) +
        ' полупару установить компенсационную полустельку/вкладыш +' +
        String(compensatoryInsoleHalfPairMm) +
        ' мм и выполнить затяжку носка ' +
        String(shorterGenitive) +
        ' полупары' +
        (requiresMismatchedPairLasts
          ? ' (при ΔL ≥ 8 мм рекомендуется распаровка колодок смежных размеров).'
          : '.')
    } else {
      asymmetrySummary =
        String(longerName) +
        ' стопа длиннее на ' +
        String(effectiveAsymMm) +
        ' мм (Лев: ' +
        String(leftFootLengthMm) +
        ' мм, Прав: ' +
        String(rightFootLengthMm) +
        ' мм). Асимметрия ≤ 3 мм в пределах физиологического допуска — полустелька не требуется.'
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

  const clampedPronation = Math.max(-15, Math.min(15, effPronationDeg))
  const weightScale = 0.85 + (clampedWeight - 70) / 220

  const counterStiffness =
    Math.abs(clampedPronation) >= 4 || clampedWeight >= 95
      ? 'Жесткий удлиненный задник 2.2 мм (до пучков)'
      : 'Формоустойчивый задник 1.6 мм'

  const orthoticIndicated =
    Math.abs(clampedPronation) >= 2 ||
    effArchType !== 'normal' ||
    hvDeg >= C.HV_POCKET_THRESHOLD_DEG ||
    Math.abs(ballBuildUpMm) >= 6 ||
    clampedWeight >= 90

  let insoleType: 'neutral' | 'supinator' | 'pronator' = 'neutral'
  let archSupportHeightMm =
    effArchType === 'cavus' ? 12 : effArchType === 'flat' ? 11 : 7
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
    insoleType = effArchType === 'flat' ? 'supinator' : 'neutral'
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

  // 8. Калиброванная 2D гауссова педобарографическая модель по головкам M1–M5 и пятке
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
    1 + Math.abs(effectiveRoll) * 0.028 + (effArchType === 'cavus' ? 0.12 : 0)

  const prelimPelotte =
    forefootLoad >= C.PELOTTE_LOAD_THRESHOLD_PCT ||
    ballBuildUpMm >= 6 ||
    hvDeg >= 12

  const pressureModel = computeCalibratedPressureModel({
    foreForceN: foreForceN * (1 + (rollConcentration - 1) * 0.6),
    heelForceN,
    foreAreaCm2,
    heelAreaCm2,
    effectiveRollDeg: effectiveRoll,
    halluxValgusDeg: hvDeg,
    toeShape: effToeShape,
    archType: effArchType,
    requiresMetatarsalPad: prelimPelotte,
    uApexM1: parseFloat((apexM1_Mm / lastLengthMm).toFixed(4)),
    uApexM5: parseFloat((apexM5_Mm / lastLengthMm).toFixed(4)),
    uHeelCenter: C.HEEL_CENTER_RATIO,
  })

  const peakForefootPressureKpa = pressureModel.peakForefootKpa
  const peakHeelPressureKpa = pressureModel.peakHeelKpa

  const requiresMetatarsalPad =
    prelimPelotte || peakForefootPressureKpa >= C.PELOTTE_PRESSURE_THRESHOLD_KPA

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

  // 9. Составной расчёт геленка 65Г (балка на упругом основании + 10^6 циклов)
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

  const shankEngineering = computeCompositeShankEngineering({
    soleType,
    gender,
    weightKg: clampedWeight,
    netRiseMm: netRise,
    shankLengthMm: shankLength,
    effectiveMomentArmMm,
    totalBendingMomentNm: shankBendingMomentNm,
    archSupportHeightMm,
    thomasExtensionMm,
    preference: shankProfilePreference,
  })

  const shankOverloaded = shankEngineering.isOverloaded
  const steelThickness = shankEngineering.steelThicknessMm
  const thomasTooHigh = soleType === 'thomas' && heelHeight > C.MAX_THOMAS_HEEL_MM
  const rockerTooHigh =
    soleType === 'rocker' &&
    (heelHeight > C.MAX_ROCKER_HEEL_MM || netRise > C.MAX_ROCKER_NET_RISE_MM)

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
  const highPronationStress = Math.abs(effectiveRoll) >= C.CRITICAL_PRONATION_DEG

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
    requiresMismatchedPairLasts,
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
    ballRadialLayerMm,
    ballModAction,
    instepBuildUpMm,
    instepRadialLayerMm,
    instepModAction,
    medialBunionPocketMm,
    bunionPocketCenterMm: apexM1_Mm,
    bunionPocketRadiusMm: 18 + Math.min(6, Math.round(medialBunionPocketMm * 0.8)),
    toeShape: effToeShape,
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

  // 12. Специализированная валидация геометрии, инвариантов, припусков и клинических эвристик
  const validation = validateLastGeometry(
    input,
    geometryModel,
    shankEngineering,
    pressureModel,
    internalSlope,
    forefootLoad,
    inversionRisk,
    highPronationStress,
    obliqueEntryDeltaMm
  )

  // 13. Расчёт парных спецификаций Левой и Правой полупар (LeftRightFootProfile)
  const resolvedLeftProfile: FootSideProfile = leftProfile ?? {
    ballGirthMm,
    instepGirthMm,
    obliqueGirthMm,
    pronationDeg,
    halluxValgusDeg,
    archType,
    toeShape,
  }
  const resolvedRightProfile: FootSideProfile = rightProfile ?? {
    ballGirthMm,
    instepGirthMm,
    obliqueGirthMm,
    pronationDeg,
    halluxValgusDeg,
    archType,
    toeShape,
  }

  const leftSpec = computeHalfPairSpec({
    side: 'left',
    gender,
    shoeSize,
    weightKg: clampedWeight,
    footLengthMm: leftFootLengthMm,
    soleType,
    heelHeight,
    toeThickness,
    rockerAngle,
    rockerStartPct: clampedStartPct,
    compensatoryInsoleMm: shorterFootSide === 'left' ? compensatoryInsoleHalfPairMm : 0,
    profile: resolvedLeftProfile,
  })

  const rightSpec = computeHalfPairSpec({
    side: 'right',
    gender,
    shoeSize,
    weightKg: clampedWeight,
    footLengthMm: rightFootLengthMm,
    soleType,
    heelHeight,
    toeThickness,
    rockerAngle,
    rockerStartPct: clampedStartPct,
    compensatoryInsoleMm: shorterFootSide === 'right' ? compensatoryInsoleHalfPairMm : 0,
    profile: resolvedRightProfile,
  })

  const pairedRx: PairedFootPrescription = {
    independentSides,
    activeSide,
    left: leftSpec,
    right: rightSpec,
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
    shankProfileType: shankEngineering.profileType,
  })

  const calculations: MathFormulaStep[] = [
    {
      title: '1. Конструктивная длина следа колодки (L_last)',
      given:
        'Размер = ' +
        String(shoeSize) +
        ', Опорная стопа L_ст = ' +
        String(footLengthMm) +
        ' мм (Лев: ' +
        String(leftFootLengthMm) +
        ' / Прав: ' +
        String(rightFootLengthMm) +
        ' мм), Суммарный припуск = ' +
        String(toeFreeSpaceMm + fashionAllowanceMm) +
        ' мм',
      formula: 'L_last = L_ст + Δ_свободн + Δ_фасон',
      substitution:
        String(footLengthMm) +
        ' + ' +
        String(toeFreeSpaceMm) +
        ' + ' +
        String(fashionAllowanceMm),
      result:
        String(lastLengthMm) +
        ' мм (свободный припуск мыска +' +
        String(toeFreeSpaceMm) +
        ' мм)',
      meaning:
        compensatoryInsoleHalfPairMm > 0
          ? String(asymmetrySummary)
          : 'Зелёная зона свободного пространства перед пальцами +' +
            String(toeFreeSpaceMm) +
            ' мм (' +
            String(
              effToeShape === 'greek'
                ? 'Греческая стопа, удлинённый II луч'
                : effToeShape === 'roman'
                  ? 'Римская стопа'
                  : 'Египетская стопа'
            ) +
            ').',
    },
    {
      title: '2. Модификация пучков и карман под I луч (Жёлтая зона доработки)',
      given:
        'Обхват клиента O_п = ' +
        String(effBallGirthMm) +
        ' мм, Эталон = ' +
        String(std.ballGirthMm) +
        ' мм, HV = ' +
        String(hvDeg) +
        '°',
      formula: 'ΔO_п = O_п − O_п(эт); ΔH_слоя ≈ 0.27 × ΔO_п; W_M1 = W_пуч + Δ_HV',
      substitution:
        String(effBallGirthMm) +
        ' − ' +
        String(std.ballGirthMm) +
        ' = ' +
        String(ballBuildUpMm) +
        ' мм (слой ' +
        String(ballRadialLayerMm) +
        ' мм); Карман HV = +' +
        String(medialBunionPocketMm) +
        ' мм',
      result:
        String(ballModSummary) +
        ' (Ширина ' +
        String(forefootWidthMm) +
        ' мм vs база ' +
        String(standardForefootWidthMm) +
        ' мм; с HV: ' +
        String(effectiveForefootWidthWithBunionMm) +
        ' мм)',
      meaning:
        ballBuildUpMm > 0 || medialBunionPocketMm > 0
          ? 'Жёлтая зона модификации: ' +
            String(
              ballBuildUpMm > 0
                ? 'нарастить пучки (ΔOп +' +
                    String(ballBuildUpMm) +
                    ' мм, слой +' +
                    String(ballRadialLayerMm) +
                    ' мм)'
                : ballBuildUpMm < 0
                  ? 'снять материал в пучках (ΔOп ' +
                    String(ballBuildUpMm) +
                    ' мм, слой ' +
                    String(ballRadialLayerMm) +
                    ' мм)'
                  : 'базовая ширина пучков'
            ) +
            String(
              medialBunionPocketMm > 0
                ? ', сформировать локальный карман M1 +' +
                    String(medialBunionPocketMm) +
                    ' мм'
                : ''
            ) +
            '.'
          : ballBuildUpMm < 0
            ? 'Узкая стопа: требуется снятие материала (уменьшение объёма колодки в пучках на ' +
              String(ballBuildUpMm) +
              ' мм по обхвату / ' +
              String(ballRadialLayerMm) +
              ' мм по слою).'
            : 'Стандартная ширина пучков колодки (без налепки и снятия).',
    },
    {
      title: '3. Положение апекса и косой линии сгиба (Синие ориентиры)',
      given:
        'M1 = ' +
        String(apexM1_Mm) +
        ' мм, M5 = ' +
        String(apexM5_Mm) +
        ' мм, Ширина пучков = ' +
        String(forefootWidthMm) +
        ' мм',
      formula: 'φ_изгиба = arctan((X_M1 − X_M5) / (0.82 × W_пуч))',
      substitution:
        'arctan((' +
        String(apexM1_Mm) +
        ' − ' +
        String(apexM5_Mm) +
        ') / ' +
        String((forefootWidthMm * C.EFFECTIVE_METATARSAL_SPAN_RATIO).toFixed(1)) +
        ')',
      result:
        'Угол сгиба φ = ' +
        String(metatarsalObliqueAngleDeg) +
        '°; Смещение апекса мыска = +' +
        String(toeBoxShiftMedialMm) +
        ' мм',
      meaning: String(lastApexLabel) + '.',
    },
    {
      title:
        '4. 2D-педобарография M1–M5 (Красная зона) и составной расчёт геленка 65Г (10^6 циклов)',
      given:
        'Вес = ' +
        String(clampedWeight) +
        ' кг, M1..M5 = ' +
        String(pressureModel.kpaM1) +
        '/' +
        String(pressureModel.kpaM2) +
        '/' +
        String(pressureModel.kpaM3) +
        '/' +
        String(pressureModel.kpaM4) +
        '/' +
        String(pressureModel.kpaM5) +
        ' кПа, Профиль: ' +
        String(shankEngineering.profileLabel),
      formula:
        'P(x,z) = Σ P_k·exp(−r²/2σ²); σ_гел = M_полн·(1 − k_W)·α_гел / W_x ≤ σ_fat(10^6)',
      substitution:
        'Пик (' +
        String(pressureModel.dominantMetatarsalRay) +
        ') = ' +
        String(peakForefootPressureKpa) +
        ' кПа; M_чист = ' +
        String(shankEngineering.netShankMomentNm) +
        ' Н·м, W_x = ' +
        String(shankEngineering.sectionModulusMm3) +
        ' мм³, σ = ' +
        String(shankEngineering.estimatedBendingStressMpa) +
        ' МПа',
      result:
        'Давление ' +
        String(peakForefootPressureKpa) +
        ' кПа · Напряжение геленка ' +
        String(shankEngineering.estimatedBendingStressMpa) +
        ' МПа (k_fat = ' +
        String(shankEngineering.fatigueSafetyFactor) +
        ' при 10^6 циклов)',
      meaning: String(shankEngineering.fatigueLifeStatus) + '. ' + String(soleConstructionSummary) + '.',
    },
  ]

  return {
    geometryModel,
    shankEngineering,
    pressureModel,
    validation,
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
    highPronationStress,
    metatarsalPadPosMm,
    metatarsalPadHeightMm,
    apexM1_Mm,
    apexM5_Mm,
    carbonInsertThicknessMm,
    rx: {
      widthCode,
      ballBuildUpMm,
      ballRadialLayerMm,
      ballModAction,
      ballModSummary,
      instepBuildUpMm,
      instepRadialLayerMm,
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
      requiresMismatchedPairLasts,
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
      pairedRx,
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

  // Все критические ошибки (включая отрицательный дроп и нарушение геометрических инвариантов) блокируют зелёный статус SUCCESS!
  if (!eng.validation.allInvariantsPassed) {
    return { status: 'ERROR', titleKey: 'errTitle', messageKey: 'errDesc' }
  }
  if (eng.internalSlope < 0 || eng.netRise < 0) {
    return { status: 'ERROR', titleKey: 'negDropTitle', messageKey: 'negDropDesc' }
  }
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
  if (eng.highInversionRisk || eng.highPronationStress) {
    return { status: 'ERROR', titleKey: 'invertTitle', messageKey: 'invertDesc' }
  }
  if (eng.peakForefootPressureKpa >= C.CRITICAL_KPA || eng.forefootLoad >= C.CRITICAL_LOAD) {
    return { status: 'ERROR', titleKey: 'padTitle', messageKey: 'padDesc' }
  }
  if (eng.rx.recommendThomasHeel && soleType === 'flat') {
    return { status: 'WARNING', titleKey: 'thomasNeedTitle', messageKey: 'thomasNeedDesc' }
  }
  if (eng.rx.requiresZipOrLaceWarning || eng.validation.hasWarnings) {
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

  for (const inv of eng.validation.invariants) {
    if (!inv.passed) {
      errors.push(inv.description)
    }
  }
  if (eng.netRise < 0 || eng.internalSlope < 0) {
    errors.push('Отрицательный перепад высот (платформа носка выше каблука)')
  }
  if (eng.heelOffsetTooFarBack) {
    errors.push(
      'Смещение каблука назад (< ' +
        String(C.MIN_SAFE_HEEL_OFFSET_MM) +
        ' мм): риск излома геленка 65Г'
    )
  }
  if (eng.heelOffsetTooFarForward) {
    errors.push(
      'Смещение пятки вперёд (> +' +
        String(C.MAX_SAFE_HEEL_OFFSET_MM) +
        ' мм): нарушение соосности пяточного упора'
    )
  }
  if (eng.thomasTooHigh) {
    errors.push(
      'Высота каблука Томаса (' +
        String(heelHeight) +
        ' мм) превышает лимит ' +
        String(C.MAX_THOMAS_HEEL_MM) +
        ' мм'
    )
  }
  if (eng.rockerTooHigh) {
    errors.push(
      'Параметры рокера превышают лимит (высота пятки > ' +
        String(C.MAX_ROCKER_HEEL_MM) +
        ' мм или перепад > ' +
        String(C.MAX_ROCKER_NET_RISE_MM) +
        ' мм)'
    )
  }
  if (eng.internalSlope >= C.CRITICAL_ANGLE) {
    errors.push(
      'Критический угол продольного уклона (' +
        String(eng.internalSlope.toFixed(1)) +
        '° >= ' +
        String(C.CRITICAL_ANGLE) +
        '°)'
    )
  }
  if (eng.shankOverloaded) {
    errors.push(
      'Перегрузка геленка (' +
        String(eng.shankBendingMomentNm) +
        ' Н·м, k_fat = ' +
        String(eng.shankEngineering.fatigueSafetyFactor) +
        ')'
    )
  }
  if (eng.highInversionRisk || eng.highPronationStress) {
    errors.push(
      'Высокий риск боковой нестабильности / вывиха (индекс нестабильности ' +
        String(eng.inversionRisk) +
        '%, эффективный завал)'
    )
  }
  if (eng.peakForefootPressureKpa >= C.CRITICAL_KPA || eng.forefootLoad >= C.CRITICAL_LOAD) {
    errors.push(
      'Перегрузка пучков на луче ' +
        String(eng.pressureModel.dominantMetatarsalRay) +
        ' (' +
        String(eng.peakForefootPressureKpa) +
        ' кПа / нагрузка ' +
        String(eng.forefootLoad) +
        '%)'
    )
  }

  if (eng.rx.recommendThomasHeel && soleType === 'flat') {
    warnings.push(
      'При завале стопы (' +
        String(eng.pronationDeg) +
        '°) для максимальной стабилизации рекомендуется каблук Томаса'
    )
  }
  if (eng.internalSlope > C.COMFORT_ANGLE && eng.internalSlope < C.CRITICAL_ANGLE) {
    warnings.push(
      'Уклон стопы (' +
        String(eng.internalSlope.toFixed(1)) +
        '°) выше комфортного (' +
        String(C.COMFORT_ANGLE) +
        '°)'
    )
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
 * Строго сохраняет выбранный пользователем тип подошвы (soleType) и оптимизирует высоту каблука,
 * платформу, смещение набойки и параметры переката за 1..7 итераций.
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
          'Итер. ' +
            String(step) +
            ': смещение каблука скорректировано с ' +
            String(state.heelTipOffsetMm) +
            ' мм до ' +
            String(safeOffset) +
            ' мм'
        )
        state.heelTipOffsetMm = safeOffset
        changedInStep = true
      }
    }

    // Шаг Б: Устранение отрицательного дропа (платформа выше каблука)
    if (state.heelHeight < state.toeThickness) {
      const nextToe = Math.max(0, state.heelHeight)
      appliedChanges.push(
        'Итер. ' +
          String(step) +
          ': толщина платформы снижена с ' +
          String(state.toeThickness) +
          ' до ' +
          String(nextToe) +
          ' мм (устранение отрицательного дропа)'
      )
      state.toeThickness = nextToe
      changedInStep = true
    }

    // Шаг В: Ограничение высоты каблука Томаса и рокера без смены типа подошвы
    if (state.soleType === 'thomas' && state.heelHeight > C.MAX_THOMAS_HEEL_MM) {
      const nextHeel = C.MAX_THOMAS_HEEL_MM
      appliedChanges.push(
        'Итер. ' +
          String(step) +
          ': высота каблука Томаса снижена с ' +
          String(state.heelHeight) +
          ' до ' +
          String(nextHeel) +
          ' мм'
      )
      state.heelHeight = nextHeel
      state.toeThickness = Math.min(state.toeThickness, state.heelHeight)
      changedInStep = true
    }

    if (state.soleType === 'rocker') {
      if (state.heelHeight > C.MAX_ROCKER_HEEL_MM) {
        appliedChanges.push(
          'Итер. ' +
            String(step) +
            ': высота рокерной пятки снижена с ' +
            String(state.heelHeight) +
            ' до ' +
            String(C.MAX_ROCKER_HEEL_MM) +
            ' мм'
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
            'Итер. ' +
              String(step) +
              ': платформа носка увеличена с ' +
              String(state.toeThickness) +
              ' до ' +
              String(neededToe) +
              ' мм (перепад рокера ≤ ' +
              String(C.MAX_ROCKER_NET_RISE_MM) +
              ' мм)'
          )
          state.toeThickness = neededToe
        } else {
          const nextHeel = Math.max(20, state.toeThickness + C.MAX_ROCKER_NET_RISE_MM)
          appliedChanges.push(
            'Итер. ' +
              String(step) +
              ': высота пятки снижена с ' +
              String(state.heelHeight) +
              ' до ' +
              String(nextHeel) +
              ' мм (перепад рокера ≤ ' +
              String(C.MAX_ROCKER_NET_RISE_MM) +
              ' мм)'
          )
          state.heelHeight = nextHeel
        }
        changedInStep = true
      }
      if (state.heelHeight < 20 && state.rockerAngle > 16) {
        state.heelHeight = 22
        appliedChanges.push(
          'Итер. ' +
            String(step) +
            ': высота пятки увеличена до 22 мм для согласования с углом рокера ' +
            String(state.rockerAngle) +
            '°'
        )
        changedInStep = true
      }
    }

    // Шаг Д: Снижение продольного уклона, перегрузки пучков, момента геленка и риска инверсии внутри выбранного режима
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

      if (currentNet > 0) {
        const targetNet =
          currentNet > maxSafeNet ? maxSafeNet : Math.max(0, currentNet - 4)

        const maxComfortPlatform = Math.min(C.MAX_TOE, state.heelHeight, 18)
        if (
          state.toeThickness < maxComfortPlatform &&
          state.heelHeight - state.toeThickness > targetNet
        ) {
          const nextToe = Math.min(
            maxComfortPlatform,
            state.heelHeight - targetNet,
            state.toeThickness + 4
          )
          if (nextToe !== state.toeThickness) {
            appliedChanges.push(
              'Итер. ' +
                String(step) +
                ': толщина носочной части увеличена с ' +
                String(state.toeThickness) +
                ' до ' +
                String(nextToe) +
                ' мм'
            )
            state.toeThickness = nextToe
            changedInStep = true
          }
        }

        if (
          state.heelHeight - state.toeThickness > targetNet &&
          state.heelHeight > minHeelAllowed
        ) {
          const minTargetHeel = state.soleType === 'rocker' ? 20 : 14
          const nextHeel = Math.max(
            minTargetHeel,
            Math.min(
              maxHeelForGender,
              state.toeThickness + targetNet,
              state.heelHeight - 6
            )
          )
          if (nextHeel < state.heelHeight) {
            appliedChanges.push(
              'Итер. ' +
                String(step) +
                ': высота каблука снижена с ' +
                String(state.heelHeight) +
                ' до ' +
                String(nextHeel) +
                ' мм'
            )
            state.heelHeight = nextHeel
            if (state.toeThickness > state.heelHeight) {
              state.toeThickness = state.heelHeight
            }
            changedInStep = true
          }
        }
      }

      if (
        state.soleType === 'rocker' &&
        (currentEng.peakForefootPressureKpa >= C.CRITICAL_KPA ||
          currentEng.forefootLoad >= C.CRITICAL_LOAD)
      ) {
        if (state.rockerAngle < C.MAX_ROCKER_ANGLE) {
          const nextAngle = Math.min(C.MAX_ROCKER_ANGLE, state.rockerAngle + 4)
          appliedChanges.push(
            'Итер. ' +
              String(step) +
              ': угол переката рокера увеличен с ' +
              String(state.rockerAngle) +
              '° до ' +
              String(nextAngle) +
              '° для разгрузки пучков'
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
            'Итер. ' +
              String(step) +
              ': линия старта рокера приближена к оптимуму (' +
              String(state.rockerStartPct) +
              '% → ' +
              String(nextStart) +
              '%)'
          )
          state.rockerStartPct = nextStart
          changedInStep = true
        }
      }

      const recheckEng = computeEngineering(state)
      if (
        (recheckEng.peakForefootPressureKpa >= C.CRITICAL_KPA ||
          recheckEng.shankOverloaded ||
          recheckEng.highInversionRisk) &&
        state.heelHeight - state.toeThickness > 0
      ) {
        const minHeel = state.soleType === 'rocker' ? 20 : 14
        const nextHeel = Math.max(minHeel, state.heelHeight - 4)
        const nextToe = Math.min(nextHeel, Math.max(state.toeThickness, nextHeel - 4))
        if (nextHeel !== state.heelHeight || nextToe !== state.toeThickness) {
          state.heelHeight = nextHeel
          state.toeThickness = Math.max(0, nextToe)
          appliedChanges.push(
            'Итер. ' +
              String(step) +
              ': перепад высот снижен до ' +
              String(state.heelHeight - state.toeThickness) +
              ' мм (H=' +
              String(state.heelHeight) +
              ', T=' +
              String(state.toeThickness) +
              ' мм) в текущем режиме подошвы'
          )
          changedInStep = true
        }
      }
    }

    if (!changedInStep) {
      break
    }
  }

  const finalEng = computeEngineering(state)
  const finalViolations = collectAuditViolations(
    finalEng,
    state.soleType,
    state.heelHeight,
    state.rockerAngle
  )
  const resolved = finalViolations.errors.length === 0

  const modeHint =
    !resolved && state.soleType === 'flat' && finalEng.rx.recommendThomasHeel
      ? ' (Для полной разгрузки при данном завале переключите вкладку опоры на «Томаса» или «Рокер».)'
      : ''

  const summaryMessage = resolved
    ? 'Автоподбор успешно завершён за ' +
      String(Math.max(1, iterations)) +
      ' итер. (режим подошвы сохранён).'
    : 'Оптимизировано в текущем режиме, но остаётся ' +
      String(finalViolations.errors.length) +
      ' огранич.: ' +
      String(finalViolations.errors.join('; ')) +
      modeHint

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
