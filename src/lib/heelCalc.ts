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
 * и отраслевого источника (ГОСТ 3927 / ЦНИИКП / биомеханика шага / сопромат 65Г и углепластика CFRP).
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
  /** Эмпирический коэффициент отношения базовой ширины пятки к длине стопы L_foot (ЦНИИКП: ~0.252) */
  HEEL_WIDTH_TO_FOOT_LENGTH_RATIO: 0.252,
  /** Эмпирический коэффициент отношения ширины пятки W_пят к обхвату пучков O_п (резервный коэффициент ЦНИИКП: ~0.274) */
  HEEL_WIDTH_TO_GIRTH_RATIO: 0.274,
  /** Эмпирический коэффициент отношения ширины геленочной (средней) части стопы к ширине пучков (~0.54) */
  MIDFOOT_TO_FOREFOOT_WIDTH_RATIO: 0.54,
  /** Коэффициент пересчёта приращения обхвата ΔO в радиальную толщину слоя налепки ΔH (по геометрии овала сечения ~0.27) */
  GIRTH_DELTA_TO_RADIAL_LAYER_RATIO: 0.27,
  /** Предельный припуск обхвата пучков/взъёма (мм), свыше которого ручная оклейка базовой колодки недопустима — нужна ЧПУ-колодка */
  MAX_MANUAL_GIRTH_BUILDUP_MM: 35,
  /** Предельное снятие по обхвату пучков/взъёма (мм) без потери геометрии стандартной колодки */
  MAX_MANUAL_GIRTH_REDUCTION_MM: 18,
  /** Предельный припуск косого обхвата (мм) для ручной модификации базовой колодки */
  MAX_MANUAL_OBLIQUE_BUILDUP_MM: 38,
  /** Предельное снятие по косому обхвату (мм) для ручной модификации базовой колодки */
  MAX_MANUAL_OBLIQUE_REDUCTION_MM: 20,

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
  /** Модуль Юнга пружинной стали 65Г (МПа) */
  STEEL_65G_ELASTIC_MODULUS_MPA: 206000,
  /** Условный предел текучести термообработанной пружинной стали 65Г (HRC 44–48), МПа */
  STEEL_65G_YIELD_STRENGTH_MPA: 780,
  /** Предел усталостной выносливости стали 65Г при пульсирующем изгибе (R=0, N=10^6 циклов шага), МПа */
  STEEL_65G_FATIGUE_LIMIT_1E6_MPA: 340,
  /** Коэффициент концентрации напряжений у крепёжных отверстий и переходных галтелей стального геленка */
  STEEL_HOLE_STRESS_CONCENTRATION_FACTOR: 1.32,
  /** Коэффициент повышения момента сопротивления W_x желобчатого геленка с ребром жёсткости относительно плоской пластины */
  FLUTED_SHANK_SECTION_GAIN: 2.35,

  /** Эффективный модуль упругости слоистой карбоновой пластины (CFRP quasi-isotropic laminate), МПа */
  CARBON_CFRP_ELASTIC_MODULUS_MPA: 70000,
  /** Предел прочности при изгибе карбоновой ортопедической пластины (CFRP), МПа */
  CARBON_CFRP_YIELD_STRENGTH_MPA: 620,
  /** Предел усталостной выносливости карбоновой пластины на базе 10^6 циклов шага, МПа */
  CARBON_CFRP_FATIGUE_LIMIT_1E6_MPA: 410,
  /** Коэффициент концентрации напряжений интегрированной карбоновой пластины (без крепёжных отверстий в своде) */
  CARBON_STRESS_CONCENTRATION_FACTOR: 1.12,

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
   * Допуск безопасности: от -2 мм (назад) до +5 мм (вперёд).
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
  /** Квазистатический коэффициент вертикальной реакции опоры в фазе переката (1.15 от статического веса mg) */
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

export const ROCKER_PRESETS: Record<
  RockerType,
  {
    angle: number
    startPct: number
    rearHeelRockerPct: number
    forefootLoadReliefMultiplier: number
    midfootShareBoost: number
    maxAllowedNegativeDropMm: number
    clinicalLabel: string
  }
> = {
  forefoot: {
    angle: 15,
    startPct: 60,
    rearHeelRockerPct: 0.12,
    forefootLoadReliefMultiplier: 1.08,
    midfootShareBoost: 1.0,
    maxAllowedNegativeDropMm: 0,
    clinicalLabel: 'Передний метатарзальный рокер (разгрузка плюсневых головок M1–M5)',
  },
  heelToToe: {
    angle: 18,
    startPct: 56,
    rearHeelRockerPct: 0.2,
    forefootLoadReliefMultiplier: 1.18,
    midfootShareBoost: 1.15,
    maxAllowedNegativeDropMm: 0,
    clinicalLabel: 'Полный перекат Heel-to-Toe (демпфирование удара пятки + защита суставов)',
  },
  negative: {
    angle: 10,
    startPct: 65,
    rearHeelRockerPct: 0.14,
    forefootLoadReliefMultiplier: 1.26,
    midfootShareBoost: 1.32,
    maxAllowedNegativeDropMm: 2,
    clinicalLabel: 'Разгрузочный диабетический / отрицательный профиль (перенос ЦД к своду и пятке)',
  },
}

/**
 * Индивидуальный антропометрический и биомеханический профиль одной стопы (левой или правой).
 * Поддерживает как базовые обхваты, так и прямые индивидуальные обмеры стопы (при наличии).
 */
export interface FootSideProfile {
  ballGirthMm: number
  instepGirthMm: number
  obliqueGirthMm: number
  pronationDeg: number
  halluxValgusDeg: number
  archType: ArchMorphology
  toeShape: ToeShape
  /** Прямое измерение длины стопы (мм); если не задано — вычисляется из размера и асимметрии */
  measuredFootLengthMm?: number
  /** Прямое измерение ширины пучков (мм) */
  measuredForefootWidthMm?: number
  /** Прямое измерение ширины пятки (мм) */
  measuredHeelWidthMm?: number
  /** Прямое измерение ширины средней части стопы (мм) */
  measuredMidfootWidthMm?: number
  /** Прямое измерение высоты продольного свода (мм) */
  measuredArchHeightMm?: number
  /** Прямое измерение продольной позиции головки M1 от пятки (мм) */
  measuredM1PosMm?: number
  /** Прямое измерение продольной позиции головки M5 от пятки (мм) */
  measuredM5PosMm?: number
  /** Длина I луча (мм) */
  firstRayLengthMm?: number
  /** Длина II луча (мм) */
  secondRayLengthMm?: number
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
  /** Прямые антропометрические обмеры (опционально) */
  measuredFootLengthMm?: number
  measuredForefootWidthMm?: number
  measuredHeelWidthMm?: number
  measuredMidfootWidthMm?: number
  measuredArchHeightMm?: number
  measuredM1PosMm?: number
  measuredM5PosMm?: number
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
  // 1. Длины, источник антропометрии и асимметрия стоп (мм)
  isAnthropometryMeasured: boolean
  activeSceneProfileLabel: string
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
  rearHeelRockerLiftMm: number
  instepBaseHeightMm: number
  toeBoxHeightMm: number

  // 5. Поперечная геометрия, апекс, Hallux Valgus и модификации обхватов
  standardForefootWidthMm: number
  forefootWidthMm: number
  midfootWidthMm: number
  effectiveForefootWidthWithBunionMm: number
  heelWidthMm: number
  ballBuildUpMm: number
  ballRadialLayerMm: number
  ballModAction: BuildUpAction
  instepBuildUpMm: number
  instepRadialLayerMm: number
  instepModAction: BuildUpAction
  obliqueEntryDeltaMm: number
  medialBunionPocketMm: number
  bunionPocketCenterMm: number
  bunionPocketRadiusMm: number
  archType: ArchMorphology
  toeShape: ToeShape
  lastApexType: LastApexType
  lastApexLabel: string
  anatomicalFootApexOffsetMm: number
  toeBoxShiftMedialMm: number
  /** Поперечная координата вершины анатомического контура мыска в долях полуширины (-1 лат .. +1 мед) */
  toeApexLateralZNorm: number
  /** Коэффициент полноты латеральных пальцев II–IV для анатомического контура мыска */
  toeLateralPlateauFactor: number
  metatarsalObliqueAngleDeg: number

  // 6. Параметры пелота Зейца и опорной конструкции подошвы
  requiresMetatarsalPad: boolean
  metatarsalPadPosMm: number | null
  metatarsalPadHeightMm: number | null
  pelotteHalfLengthMm: number
  soleType: SoleType
  rockerType: RockerType
  rockerClinicalLabel: string
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
 * Разделённая инженерная модель прочности усилителя свода:
 * 1) Стальной геленок 65Г (составная балка «стелька + 65Г + подошва» на основании Винклера)
 * 2) Интегрированная карбоновая пластина CFRP (для рокерной подошвы)
 */
export interface ShankEngineeringModel {
  isAnalyticalEstimate: true
  material: 'steel_65G' | 'carbon_composite'
  profileType: ShankProfileType
  profileLabel: string
  shankLengthMm: number
  shankWidthMm: number
  steelThicknessMm: number
  /** Толщина рабочего силового элемента (стали 65Г или карбоновой пластины CFRP), мм */
  elementThicknessMm: number
  ribDepthMm: number
  /** Положение нейтральной оси составного/профилированного сечения от нижней грани, мм */
  neutralAxisMm: number
  /** Момент инерции сечения I_x, мм⁴ */
  momentOfInertiaMm4: number
  /** Изгибная жёсткость силового элемента EI, Н·м² */
  flexuralRigidityNm2: number
  /** Коэффициент концентрации напряжений K_σ (отверстия / переходы сечения) */
  stressConcentrationFactor: number
  effectiveMomentArmMm: number
  /** Полный изгибающий момент в своде от реакции опоры (Н·м) */
  bendingMomentNm: number
  /** Доля момента, воспринимаемая силовым элементом в составном пакете EI (%) */
  compositeShankLoadSharePct: number
  /** Коэффициент разгрузки пролёта упругим основанием Винклера (%) */
  winklerFoundationReliefPct: number
  /** Чистый изгибающий момент, нагружающий силовой элемент (Н·м) */
  netShankMomentNm: number
  maxAllowedMomentNm: number
  /** Момент сопротивления сечения W_x (мм³) */
  sectionModulusMm3: number
  /** Действующее максимальное напряжение изгиба с учётом концентратора σ_max (МПа) */
  estimatedBendingStressMpa: number
  /** Предел текучести / статической прочности выбранного материала (780 МПа для 65Г / 620 МПа для CFRP) */
  yieldStrengthMpa: number
  /** Предел выносливости при 10^6 циклах шага σ_fat (340 МПа для 65Г / 410 МПа для CFRP) */
  fatigueLimit1e6Mpa: number
  /** Статический запас прочности по пределу текучести/прочности */
  safetyFactor: number
  /** Усталостный коэффициент запаса прочности на базе 10^6 циклов шага */
  fatigueSafetyFactor: number
  /** Прогноз циклического ресурса */
  fatigueLifeStatus: string
  isOverloaded: boolean
}

/**
 * Нормированная биомеханическая модель распределения плантарного давления
 * по 5 плюсневым головкам (M1–M5), среднему отделу и секторам пятки.
 * Честно маркируется как расчётная биомеханическая эвристика с сохранением интегрального баланса сил.
 */
export interface PedobarographyModel {
  /** Сохранено для обратной совместимости UI; см. isHeuristicEstimate и isSensorCalibrated */
  isCalibratedGaussianModel: boolean
  /** Явный флаг того, что распределение получено расчётной биомеханической эвристикой */
  isHeuristicEstimate: true
  /** Индивидуальная аппаратная калибровка датчиков не проводилась */
  isSensorCalibrated: false
  /** Выполнена строгая нормализация интегральной нагрузки по головкам M1–M5 (Σ F_Mi = F_fore) */
  integralForceNormalized: true
  calibrationReference: string
  gaitPhaseFactor: number
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
  /** Распределение долей нагрузки переднего отдела по 5 лучам (в сумме 100%) */
  rayLoadSharesPct: {
    M1: number
    M2: number
    M3: number
    M4: number
    M5: number
  }
  /** Индивидуальные контактные площади головок M1–M5 (см²) */
  rayContactAreasCm2: {
    M1: number
    M2: number
    M3: number
    M4: number
    M5: number
  }
  /** Силы реакции опоры на каждой плюсневой головке M1–M5 (Н) */
  rayForcesN: {
    M1: number
    M2: number
    M3: number
    M4: number
    M5: number
  }
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
  heelWidthMm: number
  midfootWidthMm: number
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
  requiresCncLastWarning: boolean
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
  forefootLoadPct: number
  heelLoadPct: number
  peakForefootPressureKpa: number
  peakHeelPressureKpa: number
  dominantRay: 'M1' | 'M2' | 'M3' | 'M4' | 'M5'
}

export interface PairedFootPrescription {
  independentSides: boolean
  activeSide: 'left' | 'right'
  activeSceneDescription: string
  left: HalfPairPrescriptionSpec
  right: HalfPairPrescriptionSpec
}

/**
 * Структурированное ТЗ мастеру, разделённое на 3 уровня:
 * 1) Антропометрия (исходные данные стопы)
 * 2) Инженерная спецификация (геометрия колодки и конструкция подошвы)
 * 3) Клинические и эргономические рекомендации (требуют подтверждения специалистом)
 */
export interface MasterSpecThreeLevels {
  level1Anthropometry: string[]
  level2EngineeringSpec: string[]
  level3ClinicalRecommendations: string[]
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
  requiresCncLastWarning: boolean
  forefootWidthMm: number
  midfootWidthMm: number
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
  structuredLevels: MasterSpecThreeLevels
}

export interface HeelEngineering {
  /** Единый источник геометрической правды для 2D, 3D и ТЗ */
  geometryModel: LastGeometryModel
  /** Разделённая модель прочности и усталостной долговечности геленка 65Г / карбона CFRP */
  shankEngineering: ShankEngineeringModel
  /** Нормированная биомеханическая модель плантарного давления по головкам M1–M5 и пятке */
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

export type AutoFixResolutionStatus =
  | 'ALREADY_OPTIMAL'
  | 'RESOLVED'
  | 'RESOLVED_WITH_WARNINGS'
  | 'PARTIAL_OR_UNRESOLVABLE'

export type AutoFixQualityLevel =
  | 'FULLY_OPTIMAL'
  | 'CRITICAL_ERRORS_RESOLVED'
  | 'CRITICAL_RESOLVED_WARNINGS_REMAIN'
  | 'UNRESOLVED_LIMITATIONS'

export interface AutoFixIssueDiagnostic {
  severity: 'ERROR' | 'WARNING'
  issue: string
  causeClassification: string
  masterAction: string
}

export interface AutoFixResult {
  soleType: SoleType
  toeThickness: number
  heelHeight: number
  heelTipOffsetMm: number
  rockerAngle: number
  rockerStartPct: number
  status: AutoFixResolutionStatus
  qualityLevel: AutoFixQualityLevel
  iterations: number
  resolved: boolean
  fullyOptimal: boolean
  immutableContractVerified: boolean
  summaryMessage: string
  appliedChanges: string[]
  remainingIssues: string[]
  remainingWarnings: string[]
  diagnostics: AutoFixIssueDiagnostic[]
}

/**
 * Санитизация численного входа (защита от NaN, Infinity и выхода за физические границы).
 */
export function sanitizeFiniteNumber(
  val: number | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return fallback
  }
  return Math.max(min, Math.min(max, val))
}

export function getBuildUpAction(deltaMm: number): BuildUpAction {
  if (deltaMm > 0) return 'build_up'
  if (deltaMm < 0) return 'reduce'
  return 'neutral'
}

export function computeRadialLayerMm(girthDeltaMm: number): number {
  if (!Number.isFinite(girthDeltaMm) || girthDeltaMm === 0) return 0
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
      ? 'Налепка пучков +' + String(ballBuildUpMm) + ' мм (слой ~' + String(layerMm) + ' мм)'
      : 'Наращивание (налепка) в пучках: ΔOп +' +
          String(ballBuildUpMm) +
          ' мм (радиальный слой +' +
          String(layerMm) +
          ' мм)'
  }
  if (ballBuildUpMm < 0) {
    return short
      ? 'Снятие в пучках ' + String(ballBuildUpMm) + ' мм (слой ' + String(layerMm) + ' мм)'
      : 'Снятие материала (уменьшение) в пучках: ΔOп ' +
          String(ballBuildUpMm) +
          ' мм (радиальный съем ' +
          String(layerMm) +
          ' мм)'
  }
  return short ? 'База пучков 0 мм' : 'Базовая геометрия пучков (0 мм)'
}

export function formatInstepModification(instepBuildUpMm: number, short = false): string {
  const layerMm = computeRadialLayerMm(instepBuildUpMm)
  if (instepBuildUpMm > 0) {
    return short
      ? 'Налепка на гребень +' + String(instepBuildUpMm) + ' мм (слой +' + String(layerMm) + ' мм)'
      : 'Наращивание (налепка) на гребень взъёма: ΔOв +' +
          String(instepBuildUpMm) +
          ' мм (толщина налепки +' +
          String(layerMm) +
          ' мм)'
  }
  if (instepBuildUpMm < 0) {
    return short
      ? 'Снятие / вкладыш ' + String(instepBuildUpMm) + ' мм (слой ' + String(layerMm) + ' мм)'
      : 'Снятие материала с гребня (уменьшение / вкладыш): ΔOв ' +
          String(instepBuildUpMm) +
          ' мм (толщина ' +
          String(layerMm) +
          ' мм)'
  }
  return short ? 'Взъём в норме 0 мм' : 'Базовая геометрия прямого взъёма (0 мм)'
}

export function describeSoleConstruction(params: {
  soleType: SoleType
  rockerType?: RockerType
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
    rockerType = 'forefoot',
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
    const rPreset = ROCKER_PRESETS[rockerType] ?? ROCKER_PRESETS.forefoot
    return (
      'Рокерная перекатная подошва [' +
      String(rPreset.clinicalLabel) +
      '] (угол переката ' +
      String(rockerAngleDeg) +
      '°, старт на ' +
      String(rockerStartPct) +
      '% длины) с интегрированной карбоновой пластиной CFRP толщиной ' +
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
  const safeSize = sanitizeFiniteNumber(shoeSize, gender === 'male' ? 42 : 38, 30, 52)
  if (gender === 'male') {
    const diff = safeSize - 42
    return {
      ballGirthMm: Math.round(244 + diff * 5.0),
      instepGirthMm: Math.round(252 + diff * 5.2),
      obliqueGirthMm: Math.round(322 + diff * 6.5),
      stepWidthMm: 6,
    }
  } else {
    const diff = safeSize - 38
    return {
      ballGirthMm: Math.round(222 + diff * 4.8),
      instepGirthMm: Math.round(229 + diff * 5.0),
      obliqueGirthMm: Math.round(292 + diff * 6.0),
      stepWidthMm: 5,
    }
  }
}

/**
 * Вычисляет нормированную биомеханическую модель распределения плантарного давления
 * по головкам M1–M5, среднему отделу и пятке.
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
  internalSlopeDeg?: number
  soleType?: SoleType
  rockerType?: RockerType
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
    internalSlopeDeg = 8,
    soleType = 'flat',
    rockerType = 'forefoot',
  } = params

  const safeForeForceN = Math.max(1, foreForceN)
  const safeHeelForceN = Math.max(1, heelForceN)
  const safeForeAreaCm2 = Math.max(20, foreAreaCm2)
  const safeHeelAreaCm2 = Math.max(15, heelAreaCm2)

  // 1. Индивидуальные контактные площади плюсневых головок A_M1..A_M5 (см²)
  const hvM1AreaLoss = halluxValgusDeg >= 12 ? Math.min(0.14, (halluxValgusDeg - 10) * 0.006) : 0
  const romanCentralAreaGain = toeShape === 'roman' ? 0.04 : 0
  const cavusAreaLoss = archType === 'cavus' ? 0.92 : archType === 'flat' ? 1.05 : 1.0

  const rawAreaShares = [
    Math.max(0.2, 0.275 - hvM1AreaLoss),
    0.215 + romanCentralAreaGain * 0.5,
    0.195 + romanCentralAreaGain * 0.5,
    0.165,
    0.15 + hvM1AreaLoss * 0.4,
  ]
  const areaShareSum = rawAreaShares.reduce((acc, v) => acc + v, 0)
  const normAreaShares = rawAreaShares.map((s) => s / areaShareSum)

  const metatarsalHeadsTotalAreaCm2 = safeForeAreaCm2 * cavusAreaLoss
  const areaM1 = parseFloat(Math.max(3.2, metatarsalHeadsTotalAreaCm2 * normAreaShares[0]).toFixed(2))
  const areaM2 = parseFloat(Math.max(2.6, metatarsalHeadsTotalAreaCm2 * normAreaShares[1]).toFixed(2))
  const areaM3 = parseFloat(Math.max(2.4, metatarsalHeadsTotalAreaCm2 * normAreaShares[2]).toFixed(2))
  const areaM4 = parseFloat(Math.max(2.1, metatarsalHeadsTotalAreaCm2 * normAreaShares[3]).toFixed(2))
  const areaM5 = parseFloat(Math.max(1.9, metatarsalHeadsTotalAreaCm2 * normAreaShares[4]).toFixed(2))

  // 2. Биомеханические веса распределения интегральной силы F_fore по 5 лучам с обязательной нормализацией Σ α_i = 1
  const hvTransfer =
    halluxValgusDeg >= 12 ? Math.min(0.11, (halluxValgusDeg - 10) * 0.005) : 0
  const rollShift = effectiveRollDeg * 0.008
  const greekM2Boost = toeShape === 'greek' ? 0.025 : 0

  const rawWeightM1 = Math.max(0.12, 0.285 - rollShift * 1.45 - hvTransfer * 0.95)
  const rawWeightM2 = Math.max(0.14, 0.245 + greekM2Boost + hvTransfer * 0.65 - rollShift * 0.35)
  const rawWeightM3 = Math.max(0.12, 0.205 + hvTransfer * 0.45 + rollShift * 0.15)
  const rawWeightM4 = Math.max(0.08, 0.135 + rollShift * 0.75)
  const rawWeightM5 = Math.max(
    0.08,
    (0.13 + rollShift * 1.15) * (archType === 'cavus' ? 1.14 : 1.0)
  )

  const weightSum = rawWeightM1 + rawWeightM2 + rawWeightM3 + rawWeightM4 + rawWeightM5
  const shareM1 = rawWeightM1 / weightSum
  const shareM2 = rawWeightM2 / weightSum
  const shareM3 = rawWeightM3 / weightSum
  const shareM4 = rawWeightM4 / weightSum
  const shareM5 = rawWeightM5 / weightSum

  // Строгое сохранение интегральной силы переднего отдела: Σ F_Mi = safeForeForceN
  const forceM1 = parseFloat((safeForeForceN * shareM1).toFixed(1))
  const forceM2 = parseFloat((safeForeForceN * shareM2).toFixed(1))
  const forceM3 = parseFloat((safeForeForceN * shareM3).toFixed(1))
  const forceM4 = parseFloat((safeForeForceN * shareM4).toFixed(1))
  const forceM5 = parseFloat(
    Math.max(0, safeForeForceN - (forceM1 + forceM2 + forceM3 + forceM4)).toFixed(1)
  )

  // 3. Фазовый коэффициент переката шага
  const slopeAmplification = 1 + Math.max(0, internalSlopeDeg - 6) * 0.014
  const rockerPhaseRelief =
    soleType === 'rocker'
      ? rockerType === 'negative'
        ? 0.88
        : rockerType === 'heelToToe'
          ? 0.91
          : 0.93
      : soleType === 'thomas'
        ? 0.97
        : 1.0
  const archConcentration = archType === 'cavus' ? 1.12 : archType === 'flat' ? 0.96 : 1.0
  const gaitPhaseFactor = parseFloat(
    (slopeAmplification * rockerPhaseRelief * archConcentration).toFixed(3)
  )

  const shapeFactorM1 = 1.36
  const shapeFactorM2 = 1.28 + (toeShape === 'greek' ? 0.06 : 0) + (halluxValgusDeg >= 15 ? 0.08 : 0)
  const shapeFactorM3 = 1.25 + (halluxValgusDeg >= 15 ? 0.06 : 0)
  const shapeFactorM4 = 1.22
  const shapeFactorM5 = 1.28 * (archType === 'cavus' ? 1.08 : 1.0)

  const pelotteCentralReliefFactor = requiresMetatarsalPad ? 0.84 : 1.0

  const unmitigatedKpaM2 = Math.round(
    (forceM2 / areaM2) * 10 * shapeFactorM2 * gaitPhaseFactor
  )
  const unmitigatedKpaM3 = Math.round(
    (forceM3 / areaM3) * 10 * shapeFactorM3 * gaitPhaseFactor
  )

  const kpaM1 = Math.round((forceM1 / areaM1) * 10 * shapeFactorM1 * gaitPhaseFactor)
  const kpaM2 = Math.round(unmitigatedKpaM2 * pelotteCentralReliefFactor)
  const kpaM3 = Math.round(unmitigatedKpaM3 * pelotteCentralReliefFactor)
  const kpaM4 = Math.round((forceM4 / areaM4) * 10 * shapeFactorM4 * gaitPhaseFactor)
  const kpaM5 = Math.round((forceM5 / areaM5) * 10 * shapeFactorM5 * gaitPhaseFactor)

  const pelotteReliefKpa = requiresMetatarsalPad
    ? Math.max(0, Math.max(unmitigatedKpaM2, unmitigatedKpaM3) - Math.max(kpaM2, kpaM3))
    : 0

  const meanForeKpa = (safeForeForceN / safeForeAreaCm2) * 10
  const meanHeelKpa = (safeHeelForceN / safeHeelAreaCm2) * 10

  const rockerMidfootBoost =
    soleType === 'rocker' ? (ROCKER_PRESETS[rockerType]?.midfootShareBoost ?? 1.0) : 1.0
  const kpaMidfoot =
    archType === 'cavus'
      ? Math.round(meanForeKpa * 0.22 * rockerMidfootBoost)
      : archType === 'flat'
        ? Math.round(meanForeKpa * 0.68 * rockerMidfootBoost)
        : Math.round(meanForeKpa * 0.42 * rockerMidfootBoost)

  const heelRockerCushion =
    soleType === 'rocker' && rockerType === 'heelToToe' ? 0.88 : 1.0
  const heelMedialBias = 1 - effectiveRollDeg * 0.018
  const heelLateralBias = 1 + effectiveRollDeg * 0.018
  const kpaHeelMedial = Math.round(
    meanHeelKpa * 1.44 * Math.max(0.7, heelMedialBias) * heelRockerCushion
  )
  const kpaHeelLateral = Math.round(
    meanHeelKpa * 1.42 * Math.max(0.7, heelLateralBias) * heelRockerCushion
  )

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

  const uM2 = uApexM1 + (toeShape === 'greek' ? 0.016 : 0.011)
  const uM3 = uApexM1 * 0.66 + uApexM5 * 0.34
  const uM4 = uApexM1 * 0.33 + uApexM5 * 0.67

  const areaScale = (a: number) => Math.max(0.82, Math.min(1.22, Math.sqrt(a / 6.5)))

  const gaussianCenters = [
    {
      id: 'M1',
      u: uApexM1,
      zRatio: 0.62,
      peakKpa: kpaM1,
      sigmaU: parseFloat((0.064 * areaScale(areaM1)).toFixed(3)),
      sigmaZ: parseFloat((0.27 * areaScale(areaM1)).toFixed(3)),
    },
    {
      id: 'M2',
      u: uM2,
      zRatio: 0.26,
      peakKpa: kpaM2,
      sigmaU: parseFloat((0.058 * areaScale(areaM2)).toFixed(3)),
      sigmaZ: parseFloat((0.23 * areaScale(areaM2)).toFixed(3)),
    },
    {
      id: 'M3',
      u: uM3,
      zRatio: -0.06,
      peakKpa: kpaM3,
      sigmaU: parseFloat((0.057 * areaScale(areaM3)).toFixed(3)),
      sigmaZ: parseFloat((0.23 * areaScale(areaM3)).toFixed(3)),
    },
    {
      id: 'M4',
      u: uM4,
      zRatio: -0.38,
      peakKpa: kpaM4,
      sigmaU: parseFloat((0.055 * areaScale(areaM4)).toFixed(3)),
      sigmaZ: parseFloat((0.22 * areaScale(areaM4)).toFixed(3)),
    },
    {
      id: 'M5',
      u: uApexM5,
      zRatio: -0.68,
      peakKpa: kpaM5,
      sigmaU: parseFloat((0.06 * areaScale(areaM5)).toFixed(3)),
      sigmaZ: parseFloat((0.25 * areaScale(areaM5)).toFixed(3)),
    },
    {
      id: 'MIDFOOT_LAT',
      u: 0.42,
      zRatio: -0.52,
      peakKpa: kpaMidfoot,
      sigmaU: 0.11,
      sigmaZ: 0.32,
    },
    {
      id: 'HEEL_MED',
      u: uHeelCenter,
      zRatio: 0.28,
      peakKpa: kpaHeelMedial,
      sigmaU: 0.075,
      sigmaZ: 0.35,
    },
    {
      id: 'HEEL_LAT',
      u: uHeelCenter,
      zRatio: -0.28,
      peakKpa: kpaHeelLateral,
      sigmaU: 0.075,
      sigmaZ: 0.35,
    },
  ] as const

  const pctM1 = Math.round(shareM1 * 100)
  const pctM2 = Math.round(shareM2 * 100)
  const pctM3 = Math.round(shareM3 * 100)
  const pctM4 = Math.round(shareM4 * 100)
  const pctM5 = Math.max(0, 100 - (pctM1 + pctM2 + pctM3 + pctM4))

  return {
    isCalibratedGaussianModel: false,
    isHeuristicEstimate: true,
    isSensorCalibrated: false,
    integralForceNormalized: true,
    calibrationReference:
      'Расчётная биомеханическая эвристика M1–M5 (нормированный баланс сил ΣF_Mi = F_fore, без аппаратной калибровки датчиков)',
    gaitPhaseFactor,
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
    rayLoadSharesPct: {
      M1: pctM1,
      M2: pctM2,
      M3: pctM3,
      M4: pctM4,
      M5: pctM5,
    },
    rayContactAreasCm2: {
      M1: areaM1,
      M2: areaM2,
      M3: areaM3,
      M4: areaM4,
      M5: areaM5,
    },
    rayForcesN: {
      M1: forceM1,
      M2: forceM2,
      M3: forceM3,
      M4: forceM4,
      M5: forceM5,
    },
    gaussianCenters,
  }
}

/**
 * Вычисляет прочность и усталостную долговечность силового элемента свода (65Г vs Карбон CFRP).
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
  carbonInsertThicknessMm?: number
  forefootWidthMm?: number
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
    carbonInsertThicknessMm,
    forefootWidthMm = gender === 'male' ? 100 : 92,
    preference,
  } = params

  if (soleType === 'rocker') {
    const carbonThicknessMm =
      carbonInsertThicknessMm !== undefined && carbonInsertThicknessMm > 0
        ? carbonInsertThicknessMm
        : parseFloat(
            (1.2 + (weightKg / 100) * 0.6 + (Math.max(10, netRiseMm + 12) / 100) * 0.4).toFixed(1)
          )
    const carbonWidthMm = Math.round(Math.max(22, Math.min(34, forefootWidthMm * 0.3)))
    const neutralAxisMm = parseFloat((carbonThicknessMm * 0.5).toFixed(2))
    const momentOfInertiaMm4 = parseFloat(
      ((carbonWidthMm * Math.pow(carbonThicknessMm, 3)) / 12).toFixed(2)
    )
    const sectionModulusMm3 = parseFloat(
      ((carbonWidthMm * carbonThicknessMm * carbonThicknessMm) / 6).toFixed(2)
    )

    const eiCarbonNm2 = parseFloat(
      ((C.CARBON_CFRP_ELASTIC_MODULUS_MPA * momentOfInertiaMm4) / 1e6).toFixed(3)
    )
    const wedgeEffectiveHeightMm = Math.max(14, 18 + Math.max(0, netRiseMm) * 0.35)
    const eiWedgeAndInsoleNm2 = parseFloat(
      ((35 * carbonWidthMm * 2.2 * Math.pow(wedgeEffectiveHeightMm, 3)) / (12 * 1e6)).toFixed(3)
    )

    const kWinklerNPerMm2 = 0.28 + archSupportHeightMm * 0.008
    const lambdaMmInv = Math.pow(
      kWinklerNPerMm2 / Math.max(1e-3, 4 * (eiCarbonNm2 + eiWedgeAndInsoleNm2) * 1e6),
      0.25
    )
    const lambdaL = lambdaMmInv * shankLengthMm
    const totalWinklerRelief = Math.min(0.46, Math.max(0.24, 1 - 1 / (1 + 0.28 * lambdaL * lambdaL)))
    const winklerFoundationReliefPct = Math.round(totalWinklerRelief * 100)

    const compositeShare = Math.min(
      0.34,
      Math.max(0.14, eiCarbonNm2 / Math.max(0.05, eiCarbonNm2 + eiWedgeAndInsoleNm2))
    )
    const compositeShankLoadSharePct = Math.round(compositeShare * 100)

    const netShankMomentNm = parseFloat(
      (totalBendingMomentNm * (1 - totalWinklerRelief) * compositeShare).toFixed(2)
    )
    const netShankMomentNmm = netShankMomentNm * 1000
    const stressConcentrationFactor = C.CARBON_STRESS_CONCENTRATION_FACTOR
    const estimatedBendingStressMpa = Math.round(
      (netShankMomentNmm * stressConcentrationFactor) / Math.max(0.8, sectionModulusMm3)
    )

    const yieldStrengthMpa = C.CARBON_CFRP_YIELD_STRENGTH_MPA
    const fatigueLimit1e6Mpa = C.CARBON_CFRP_FATIGUE_LIMIT_1E6_MPA
    const safetyFactor = parseFloat(
      (yieldStrengthMpa / Math.max(1, estimatedBendingStressMpa)).toFixed(2)
    )
    const fatigueSafetyFactor = parseFloat(
      (fatigueLimit1e6Mpa / Math.max(1, estimatedBendingStressMpa)).toFixed(2)
    )
    const isOverloaded =
      totalBendingMomentNm > C.MAX_SHANK_MOMENT_NM || fatigueSafetyFactor < 1.0

    const fatigueLifeStatus =
      fatigueSafetyFactor >= 1.25
        ? 'Карбон CFRP: ресурс > 10^6 циклов (запас выносливости k_fat = ' +
          String(fatigueSafetyFactor) +
          ')'
        : fatigueSafetyFactor >= 1.0
          ? 'Карбон CFRP: допустимый ресурс ~10^6 циклов (k_fat = ' +
            String(fatigueSafetyFactor) +
            ')'
          : 'Риск расслоения карбоновой пластины до 10^6 циклов (k_fat = ' +
            String(fatigueSafetyFactor) +
            ' < 1.0)!'

    return {
      isAnalyticalEstimate: true,
      material: 'carbon_composite',
      profileType: 'flat_plate',
      profileLabel:
        'Интегрированная карбоновая пластина CFRP (' +
        String(carbonWidthMm) +
        '×' +
        String(carbonThicknessMm) +
        ' мм)',
      shankLengthMm,
      shankWidthMm: carbonWidthMm,
      steelThicknessMm: carbonThicknessMm,
      elementThicknessMm: carbonThicknessMm,
      ribDepthMm: 0,
      neutralAxisMm,
      momentOfInertiaMm4,
      flexuralRigidityNm2: eiCarbonNm2,
      stressConcentrationFactor,
      effectiveMomentArmMm,
      bendingMomentNm: totalBendingMomentNm,
      compositeShankLoadSharePct,
      winklerFoundationReliefPct,
      netShankMomentNm,
      maxAllowedMomentNm: C.MAX_SHANK_MOMENT_NM,
      sectionModulusMm3,
      estimatedBendingStressMpa,
      yieldStrengthMpa,
      fatigueLimit1e6Mpa,
      safetyFactor,
      fatigueSafetyFactor,
      fatigueLifeStatus,
      isOverloaded,
    }
  }

  let steelThickness = weightKg >= 85 || gender === 'male' ? 1.5 : 1.2
  if (netRiseMm > 35 || totalBendingMomentNm > 20) {
    steelThickness = Math.max(steelThickness, 1.5)
  }
  if (netRiseMm > 55 || totalBendingMomentNm > 25 || weightKg >= 105) {
    steelThickness = 2.0
  }

  const shankWidthMm = gender === 'male' ? 16 : 14
  const flatInertiaMm4 = (shankWidthMm * Math.pow(steelThickness, 3)) / 12
  const flatSectionModulusMm3 = (shankWidthMm * steelThickness * steelThickness) / 6

  const kFoundationNPerMm2 =
    0.06 +
    archSupportHeightMm * 0.009 +
    (soleType === 'thomas' ? thomasExtensionMm * 0.0065 : 0)
  const eiInsoleAndOutsoleNm2 = gender === 'male' ? 1.65 : 1.35
  const eiFlatSteelNm2 = (C.STEEL_65G_ELASTIC_MODULUS_MPA * flatInertiaMm4) / 1e6

  const lambdaFlat = Math.pow(
    kFoundationNPerMm2 / Math.max(1e-3, 4 * (eiFlatSteelNm2 + eiInsoleAndOutsoleNm2) * 1e6),
    0.25
  )
  const prelimWinklerRelief = Math.min(
    0.42,
    Math.max(0.06, 1 - 1 / (1 + 0.32 * Math.pow(lambdaFlat * shankLengthMm, 2)))
  )
  const prelimShareFlat = Math.min(
    0.22,
    Math.max(0.12, (eiFlatSteelNm2 / (eiFlatSteelNm2 + eiInsoleAndOutsoleNm2)) * 0.42)
  )
  const prelimFlatNetMomentNmm =
    totalBendingMomentNm * (1 - prelimWinklerRelief) * prelimShareFlat * 1000
  const prelimFlatStressMpa =
    (prelimFlatNetMomentNmm * C.STEEL_HOLE_STRESS_CONCENTRATION_FACTOR) /
    Math.max(0.8, flatSectionModulusMm3)

  const autoNeedsFluted =
    weightKg >= 85 || netRiseMm >= 28 || totalBendingMomentNm >= 16 || prelimFlatStressMpa > 280
  const profileType: ShankProfileType =
    preference ?? (autoNeedsFluted ? 'fluted_ribbed' : 'flat_plate')

  const ribDepthMm = profileType === 'fluted_ribbed' ? 1.8 : 0

  let neutralAxisMm = parseFloat((steelThickness * 0.5).toFixed(2))
  let momentOfInertiaMm4 = parseFloat(flatInertiaMm4.toFixed(2))
  let sectionModulusMm3 = parseFloat(flatSectionModulusMm3.toFixed(2))

  if (profileType === 'fluted_ribbed') {
    const flangeWidth = shankWidthMm * 0.52
    const ribWidth = shankWidthMm * 0.48
    const aFlange = flangeWidth * steelThickness
    const aRib = ribWidth * steelThickness * 1.12
    const zFlange = steelThickness * 0.5
    const zRib = steelThickness * 0.5 + ribDepthMm * 0.68
    const totalArea = aFlange + aRib
    const zNa = (aFlange * zFlange + aRib * zRib) / totalArea
    const iFlange =
      (flangeWidth * Math.pow(steelThickness, 3)) / 12 +
      aFlange * Math.pow(zNa - zFlange, 2)
    const iRib =
      (ribWidth * Math.pow(steelThickness * 1.25, 3)) / 12 +
      aRib * Math.pow(zRib - zNa, 2)
    const totalHeight = steelThickness + ribDepthMm
    const zExtreme = Math.max(zNa, totalHeight - zNa)
    const steinerInertia = iFlange + iRib
    const steinerModulus = steinerInertia / Math.max(0.5, zExtreme)

    neutralAxisMm = parseFloat(zNa.toFixed(2))
    momentOfInertiaMm4 = parseFloat(
      Math.max(steinerInertia, flatInertiaMm4 * C.FLUTED_SHANK_SECTION_GAIN).toFixed(2)
    )
    sectionModulusMm3 = parseFloat(
      Math.max(steinerModulus, flatSectionModulusMm3 * C.FLUTED_SHANK_SECTION_GAIN).toFixed(2)
    )
  }

  const flexuralRigidityNm2 = parseFloat(
    ((C.STEEL_65G_ELASTIC_MODULUS_MPA * momentOfInertiaMm4) / 1e6).toFixed(3)
  )

  const stiffnessRatio =
    flexuralRigidityNm2 / Math.max(0.1, flexuralRigidityNm2 + eiInsoleAndOutsoleNm2)
  const compositeShare =
    profileType === 'fluted_ribbed'
      ? Math.min(0.22, Math.max(0.16, stiffnessRatio * 0.34))
      : Math.min(0.17, Math.max(0.12, stiffnessRatio * 0.32))
  const compositeShankLoadSharePct = Math.round(compositeShare * 100)

  const archWinklerRelief = Math.min(0.22, archSupportHeightMm * 0.012)
  const thomasWinklerRelief =
    soleType === 'thomas' ? Math.min(0.18, thomasExtensionMm * 0.008) : 0
  const totalWinklerRelief = Math.min(
    0.45,
    Math.max(0.05, archWinklerRelief + thomasWinklerRelief)
  )
  const winklerFoundationReliefPct = Math.round(totalWinklerRelief * 100)

  const netShankMomentNm = parseFloat(
    (totalBendingMomentNm * (1 - totalWinklerRelief) * compositeShare).toFixed(2)
  )
  const netShankMomentNmm = netShankMomentNm * 1000
  const stressConcentrationFactor = C.STEEL_HOLE_STRESS_CONCENTRATION_FACTOR
  // Предел выносливости 340 МПа уже задан с учётом концентратора отверстий K_σ=1.32; учитываем локальный коэффициент перехода сечения 1.06
  const estimatedBendingStressMpa = Math.round(
    (netShankMomentNmm * 1.06) / Math.max(0.8, sectionModulusMm3)
  )

  const safetyFactor = parseFloat(
    (C.STEEL_65G_YIELD_STRENGTH_MPA / Math.max(1, estimatedBendingStressMpa)).toFixed(2)
  )
  const fatigueSafetyFactor = parseFloat(
    (C.STEEL_65G_FATIGUE_LIMIT_1E6_MPA / Math.max(1, estimatedBendingStressMpa)).toFixed(2)
  )

  const isOverloaded =
    totalBendingMomentNm > C.MAX_SHANK_MOMENT_NM || fatigueSafetyFactor < 1.0

  const profileLabel =
    profileType === 'fluted_ribbed'
      ? 'Желобчатый геленок 65Г с ребром жёсткости (HRC 46)'
      : 'Плоский штампованный геленок 65Г (HRC 45)'

  const fatigueLifeStatus =
    fatigueSafetyFactor >= 1.25
      ? 'Ресурс > 10^6 циклов шага (запас выносливости k_fat = ' + String(fatigueSafetyFactor) + ')'
      : fatigueSafetyFactor >= 1.0
        ? 'Допустимый ресурс ~10^6 циклов (k_fat = ' +
          String(fatigueSafetyFactor) +
          ', рекомендуется контроль жёсткости)'
        : 'Риск усталостного разрушения до 10^6 циклов (k_fat = ' +
          String(fatigueSafetyFactor) +
          ' < 1.0)!'

  return {
    isAnalyticalEstimate: true,
    material: 'steel_65G',
    profileType,
    profileLabel,
    shankLengthMm,
    shankWidthMm,
    steelThicknessMm: steelThickness,
    elementThicknessMm: steelThickness,
    ribDepthMm,
    neutralAxisMm,
    momentOfInertiaMm4,
    flexuralRigidityNm2,
    stressConcentrationFactor,
    effectiveMomentArmMm,
    bendingMomentNm: totalBendingMomentNm,
    compositeShankLoadSharePct,
    winklerFoundationReliefPct,
    netShankMomentNm,
    maxAllowedMomentNm: C.MAX_SHANK_MOMENT_NM,
    sectionModulusMm3,
    estimatedBendingStressMpa,
    yieldStrengthMpa: C.STEEL_65G_YIELD_STRENGTH_MPA,
    fatigueLimit1e6Mpa: C.STEEL_65G_FATIGUE_LIMIT_1E6_MPA,
    safetyFactor,
    fatigueSafetyFactor,
    fatigueLifeStatus,
    isOverloaded,
  }
}

/**
 * ЕДИНАЯ ФУНКЦИЯ РАСЧЁТА БИОМЕХАНИКИ, АНТРОПОМЕТРИИ И ПЕДОБАРОГРАФИИ СТОПЫ (P1.1, P0.3, P1.3).
 */
function computeUnifiedSideBiomechanics(params: {
  gender: Gender
  shoeSize: number
  weightKg: number
  baseFootLengthMm: number
  soleType: SoleType
  rockerType: RockerType
  heelHeight: number
  toeThickness: number
  rockerAngle: number
  rockerStartPct: number
  profile: FootSideProfile
}) {
  const C = HEEL_CONST
  const {
    gender,
    shoeSize,
    weightKg,
    baseFootLengthMm,
    soleType,
    rockerType,
    heelHeight,
    toeThickness,
    rockerAngle,
    rockerStartPct,
    profile,
  } = params

  const clampedWeight = sanitizeFiniteNumber(weightKg, 72, 35, 160)
  const hvDeg = sanitizeFiniteNumber(profile.halluxValgusDeg, 0, 0, 40)
  const clampedPronation = sanitizeFiniteNumber(profile.pronationDeg, 0, -15, 15)
  const std = getStandardGirths(gender, shoeSize)

  const effBallGirthMm = sanitizeFiniteNumber(profile.ballGirthMm, std.ballGirthMm, 160, 340)
  const effInstepGirthMm = sanitizeFiniteNumber(profile.instepGirthMm, std.instepGirthMm, 165, 350)
  const effObliqueGirthMm = sanitizeFiniteNumber(
    profile.obliqueGirthMm,
    std.obliqueGirthMm,
    210,
    430
  )

  const isAnthropometryMeasured =
    profile.measuredFootLengthMm !== undefined ||
    profile.measuredForefootWidthMm !== undefined ||
    profile.measuredHeelWidthMm !== undefined ||
    profile.measuredM1PosMm !== undefined ||
    profile.measuredM5PosMm !== undefined

  const footLengthMm =
    profile.measuredFootLengthMm !== undefined && Number.isFinite(profile.measuredFootLengthMm)
      ? Math.round(sanitizeFiniteNumber(profile.measuredFootLengthMm, baseFootLengthMm, 150, 350))
      : baseFootLengthMm

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
  const fashionAllowanceMm = C.LAST_FASHION_ALLOWANCE_MM
  const lastLengthMm = Math.round(footLengthMm + toeFreeSpaceMm + fashionAllowanceMm)

  const ballBuildUpMm = Math.round(effBallGirthMm - std.ballGirthMm)
  const instepBuildUpMm = Math.round(effInstepGirthMm - std.instepGirthMm)
  const obliqueEntryDeltaMm = Math.round(effObliqueGirthMm - std.obliqueGirthMm)

  const ballRadialLayerMm = computeRadialLayerMm(ballBuildUpMm)
  const instepRadialLayerMm = computeRadialLayerMm(instepBuildUpMm)
  const ballModAction = getBuildUpAction(ballBuildUpMm)
  const instepModAction = getBuildUpAction(instepBuildUpMm)

  const standardForefootWidthMm = parseFloat(
    (std.ballGirthMm * C.FOREFOOT_WIDTH_TO_GIRTH_RATIO).toFixed(1)
  )
  const forefootWidthMm =
    profile.measuredForefootWidthMm !== undefined &&
    Number.isFinite(profile.measuredForefootWidthMm)
      ? parseFloat(
          sanitizeFiniteNumber(profile.measuredForefootWidthMm, standardForefootWidthMm, 60, 145).toFixed(1)
        )
      : parseFloat((effBallGirthMm * C.FOREFOOT_WIDTH_TO_GIRTH_RATIO).toFixed(1))

  const derivedHeelWidthMm = parseFloat(
    (
      footLengthMm * C.HEEL_WIDTH_TO_FOOT_LENGTH_RATIO * 0.45 +
      effBallGirthMm * C.HEEL_WIDTH_TO_GIRTH_RATIO * 0.55
    ).toFixed(1)
  )
  const heelWidthMm =
    profile.measuredHeelWidthMm !== undefined && Number.isFinite(profile.measuredHeelWidthMm)
      ? parseFloat(
          sanitizeFiniteNumber(profile.measuredHeelWidthMm, derivedHeelWidthMm, 42, 98).toFixed(1)
        )
      : derivedHeelWidthMm

  const midfootWidthMm =
    profile.measuredMidfootWidthMm !== undefined && Number.isFinite(profile.measuredMidfootWidthMm)
      ? parseFloat(
          sanitizeFiniteNumber(
            profile.measuredMidfootWidthMm,
            forefootWidthMm * C.MIDFOOT_TO_FOREFOOT_WIDTH_RATIO,
            35,
            110
          ).toFixed(1)
        )
      : parseFloat((forefootWidthMm * C.MIDFOOT_TO_FOREFOOT_WIDTH_RATIO).toFixed(1))

  const widthIndexPct = parseFloat(((forefootWidthMm / Math.max(150, footLengthMm)) * 100).toFixed(1))
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
  const widthCode = widthMap[clampedW] || 'F (' + String(clampedW) + ')'

  const requiresZipOrLaceWarning =
    obliqueEntryDeltaMm >= 12 || instepBuildUpMm >= 10 || profile.archType === 'cavus'
  const requiresCncLastWarning =
    ballBuildUpMm > C.MAX_MANUAL_GIRTH_BUILDUP_MM ||
    instepBuildUpMm > C.MAX_MANUAL_GIRTH_BUILDUP_MM ||
    obliqueEntryDeltaMm > C.MAX_MANUAL_OBLIQUE_BUILDUP_MM ||
    ballBuildUpMm < -C.MAX_MANUAL_GIRTH_REDUCTION_MM ||
    instepBuildUpMm < -C.MAX_MANUAL_GIRTH_REDUCTION_MM ||
    obliqueEntryDeltaMm < -C.MAX_MANUAL_OBLIQUE_REDUCTION_MM

  const anatomicalFootApexOffsetMm =
    profile.toeShape === 'egyptian' ? 9 : profile.toeShape === 'greek' ? -2 : 3

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
  let toeApexLateralZNorm = 0.48
  let toeLateralPlateauFactor = 0.25

  if (profile.toeShape === 'greek') {
    if (hvDeg < 15) {
      lastApexType = 'oblique_anatomical'
      lastApexLabel =
        hvDeg >= C.HV_POCKET_THRESHOLD_DEG
          ? 'Косой анатомический апекс (II луч + медиальная коррекция HV)'
          : 'Косой апекс (Oblique Apex — вершина по II лучу)'
      toeBoxShiftMedialMm = hvExtraApexShiftMm
      toeApexLateralZNorm = 0.16
      toeLateralPlateauFactor = 0.45
    } else {
      lastApexType = 'medial_straight'
      lastApexLabel =
        'Орто-прямой медиальный апекс (коррекция выраженного HV при греческой стопе)'
      toeBoxShiftMedialMm = 3 + hvExtraApexShiftMm
      toeApexLateralZNorm = 0.35
      toeLateralPlateauFactor = 0.5
    }
  } else if (profile.toeShape === 'roman') {
    lastApexType = 'wide_square'
    lastApexLabel =
      hvDeg >= C.HV_POCKET_THRESHOLD_DEG
        ? 'Широкий трапециевидный апекс (I–III лучи + разгрузка HV)'
        : 'Широкий трапециевидный апекс (I–III лучи)'
    toeBoxShiftMedialMm = 3 + hvExtraApexShiftMm
    toeApexLateralZNorm = 0.22
    toeLateralPlateauFactor = 0.85
  } else {
    lastApexType = 'medial_straight'
    lastApexLabel =
      hvDeg >= C.HV_POCKET_THRESHOLD_DEG
        ? 'Орто-прямой медиальный апекс (разгрузка I луча)'
        : 'Прямой апекс (Straight Medial Apex — по оси I луча)'
    toeBoxShiftMedialMm = 5 + hvExtraApexShiftMm
    toeApexLateralZNorm = 0.52
    toeLateralPlateauFactor = 0.22
  }

  const effectiveForefootWidthWithBunionMm = parseFloat(
    (forefootWidthMm + medialBunionPocketMm).toFixed(1)
  )
  const toeBoxHeightMm = profile.archType === 'cavus' ? 28 : hvDeg >= 15 ? 25 : 22

  const weightScale = 0.85 + (clampedWeight - 70) / 220
  let insoleType: 'neutral' | 'supinator' | 'pronator' = 'neutral'
  let archSupportHeightMm =
    profile.measuredArchHeightMm !== undefined && Number.isFinite(profile.measuredArchHeightMm)
      ? Math.round(sanitizeFiniteNumber(profile.measuredArchHeightMm, 9, 0, 22))
      : profile.archType === 'cavus'
        ? 12
        : profile.archType === 'flat'
          ? 11
          : 7
  let medialHeelWedgeMm = 0
  let lateralWedgeMm = 0
  let recommendThomasHeel = false
  let recommendedThomasMm = Math.round(15 * Math.min(1.15, weightScale))

  if (clampedPronation <= -2) {
    const valgusAbs = Math.abs(clampedPronation)
    insoleType = 'supinator'
    if (profile.measuredArchHeightMm === undefined) {
      archSupportHeightMm = Math.min(15, Math.round(9 + valgusAbs * 0.45))
    }
    medialHeelWedgeMm = Math.min(7, Math.max(2, Math.round(valgusAbs * 0.5 * weightScale)))
    recommendThomasHeel = valgusAbs >= 3.5
    recommendedThomasMm = Math.min(
      26,
      Math.round((13 + valgusAbs * 0.95) * Math.min(1.15, weightScale))
    )
  } else if (clampedPronation >= 2) {
    const varusAbs = Math.abs(clampedPronation)
    insoleType = 'pronator'
    if (profile.measuredArchHeightMm === undefined) {
      archSupportHeightMm = Math.max(0, Math.round(4 - varusAbs * 0.4))
    }
    lateralWedgeMm = Math.min(7, Math.max(2, Math.round(varusAbs * 0.5 * weightScale)))
    recommendThomasHeel = varusAbs >= 3.5
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

  const clampedStartPct = sanitizeFiniteNumber(rockerStartPct, 60, 52, 78)
  const ballPos = lastLengthMm * (clampedStartPct / 100)
  const defaultApexM1 = Math.round(ballPos - C.M1_PROXIMAL_FROM_BALL_MM)
  const defaultApexM5 = Math.round(defaultApexM1 - footLengthMm * C.M5_PROXIMAL_TO_FOOT_RATIO)

  const apexM1_Mm =
    profile.measuredM1PosMm !== undefined && Number.isFinite(profile.measuredM1PosMm)
      ? Math.round(
          sanitizeFiniteNumber(
            profile.measuredM1PosMm,
            defaultApexM1,
            Math.round(lastLengthMm * 0.48),
            Math.round(ballPos - 2)
          )
        )
      : defaultApexM1

  const apexM5_Mm =
    profile.measuredM5PosMm !== undefined && Number.isFinite(profile.measuredM5PosMm)
      ? Math.round(
          sanitizeFiniteNumber(
            profile.measuredM5PosMm,
            defaultApexM5,
            Math.round(lastLengthMm * 0.42),
            apexM1_Mm - 4
          )
        )
      : Math.min(apexM1_Mm - 6, defaultApexM5)

  const metatarsalObliqueAngleDeg = parseFloat(
    (
      Math.atan2(
        apexM1_Mm - apexM5_Mm,
        forefootWidthMm * C.EFFECTIVE_METATARSAL_SPAN_RATIO
      ) *
      (180 / Math.PI)
    ).toFixed(1)
  )

  const rPreset = ROCKER_PRESETS[rockerType] ?? ROCKER_PRESETS.forefoot
  const rockerLeverBoost =
    soleType === 'rocker'
      ? rockerType === 'heelToToe'
        ? 1.04
        : rockerType === 'negative'
          ? 1.07
          : 1.0
      : 1.0

  const dynamicLeverRatio = Math.max(
    0.58,
    Math.min(0.82, (clampedStartPct / 100 - C.HEEL_CENTER_RATIO) * 1.38 * rockerLeverBoost)
  )
  const lEff = parseFloat((lastLengthMm * dynamicLeverRatio).toFixed(1))

  const netRise = heelHeight - toeThickness
  const effectiveBiomechanicalRise =
    soleType === 'rocker' && rockerType === 'negative' ? netRise - 2.5 : netRise
  const asinArg = lEff > 0 ? Math.max(-1, Math.min(1, netRise / lEff)) : 0
  const internalSlope = Math.asin(asinArg) * (180 / Math.PI)

  let loadCalc =
    C.BASE_FOREFOOT_LOAD_PCT +
    (effectiveBiomechanicalRise / Math.max(lEff, 1)) * C.SLOPE_TO_LOAD_GAIN

  if (soleType === 'rocker') {
    const angleFactor = Math.min(1, Math.max(0, rockerAngle / C.MAX_ROCKER_ANGLE))
    const optimumStart = rPreset.startPct
    const distFromOptimum = Math.abs(clampedStartPct - optimumStart)
    const placementEfficiency = Math.max(0.38, 1 - distFromOptimum / 28)
    const factor = Math.min(
      1.15,
      angleFactor * placementEfficiency * rPreset.forefootLoadReliefMultiplier
    )
    loadCalc *= 1 - Math.min(0.4, C.ROCKER_MITIGATION_CAP * factor)
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
        ? clampedPronation * (rockerType === 'heelToToe' ? 0.46 : 0.42)
        : clampedPronation * 0.35
  const effectiveRoll = clampedPronation - orthoStabilization

  const m1Ratio = Math.max(0.22, Math.min(0.82, 0.55 - effectiveRoll * 0.024))
  const loadM1Pct = Math.round(forefootLoad * m1Ratio)
  const loadM5Pct = Math.max(0, forefootLoad - loadM1Pct)

  const contactAreaScale =
    (footLengthMm / C.REF_FOOT_LENGTH_MM) *
    (1 + ballBuildUpMm * 0.008 + medialBunionPocketMm * 0.005)
  const orthoReliefFactor =
    soleType === 'rocker'
      ? rockerType === 'negative'
        ? 1.62
        : rockerType === 'heelToToe'
          ? 1.56
          : 1.52
      : soleType === 'thomas'
        ? 1.42
        : 1.0
  const foreAreaCm2 = Math.max(
    30,
    C.REF_FOREFOOT_CONTACT_AREA_CM2 * contactAreaScale * orthoReliefFactor
  )
  const heelAreaCm2 = Math.max(
    22,
    C.REF_HEEL_CONTACT_AREA_CM2 *
      contactAreaScale *
      (soleType === 'rocker' && rockerType === 'heelToToe'
        ? 1.42
        : soleType !== 'flat'
          ? 1.32
          : 1.0)
  )

  const totalForceN = clampedWeight * 9.81 * C.QUASI_STATIC_GAIT_FACTOR
  const foreForceN = totalForceN * (forefootLoad / 100)
  const heelForceN = totalForceN * (heelLoad / 100)
  const rollConcentration =
    1 + Math.abs(effectiveRoll) * 0.028 + (profile.archType === 'cavus' ? 0.12 : 0)

  const prelimPelotte =
    forefootLoad >= C.PELOTTE_LOAD_THRESHOLD_PCT || ballBuildUpMm >= 6 || hvDeg >= 12

  const pressureModel = computeCalibratedPressureModel({
    foreForceN: foreForceN * (1 + (rollConcentration - 1) * 0.6),
    heelForceN,
    foreAreaCm2,
    heelAreaCm2,
    effectiveRollDeg: effectiveRoll,
    halluxValgusDeg: hvDeg,
    toeShape: profile.toeShape,
    archType: profile.archType,
    requiresMetatarsalPad: prelimPelotte,
    uApexM1: parseFloat((apexM1_Mm / lastLengthMm).toFixed(4)),
    uApexM5: parseFloat((apexM5_Mm / lastLengthMm).toFixed(4)),
    uHeelCenter: C.HEEL_CENTER_RATIO,
    internalSlopeDeg: internalSlope,
    soleType,
    rockerType,
  })

  const peakForefootPressureKpa = pressureModel.peakForefootKpa
  const peakHeelPressureKpa = pressureModel.peakHeelKpa

  const requiresMetatarsalPad =
    prelimPelotte || peakForefootPressureKpa >= C.PELOTTE_PRESSURE_THRESHOLD_KPA
  const defaultPelottePosMm = Math.round(apexM1_Mm - C.PELOTTE_PROXIMAL_OFFSET_MM)
  const metatarsalPadPosMm = requiresMetatarsalPad ? defaultPelottePosMm : null
  const metatarsalPadHeightMm = requiresMetatarsalPad
    ? clampedWeight >= 100 || ballBuildUpMm >= 10 || hvDeg >= 15
      ? 6
      : netRise > 25
        ? 5
        : 4
    : null

  return {
    isAnthropometryMeasured,
    clampedWeight,
    hvDeg,
    clampedPronation,
    effBallGirthMm,
    effInstepGirthMm,
    effObliqueGirthMm,
    std,
    footLengthMm,
    toeShapeAllowanceMm,
    toeFreeSpaceMm,
    fashionAllowanceMm,
    lastLengthMm,
    ballBuildUpMm,
    instepBuildUpMm,
    obliqueEntryDeltaMm,
    ballRadialLayerMm,
    instepRadialLayerMm,
    ballModAction,
    instepModAction,
    standardForefootWidthMm,
    forefootWidthMm,
    heelWidthMm,
    midfootWidthMm,
    widthIndexPct,
    widthCode,
    requiresZipOrLaceWarning,
    requiresCncLastWarning,
    anatomicalFootApexOffsetMm,
    medialBunionPocketMm,
    lastApexType,
    lastApexLabel,
    toeBoxShiftMedialMm,
    toeApexLateralZNorm,
    toeLateralPlateauFactor,
    effectiveForefootWidthWithBunionMm,
    toeBoxHeightMm,
    insoleType,
    archSupportHeightMm,
    medialHeelWedgeMm,
    lateralWedgeMm,
    recommendThomasHeel,
    recommendedThomasMm,
    thomasHeelType,
    thomasExtensionMm,
    clampedStartPct,
    ballPos,
    apexM1_Mm,
    apexM5_Mm,
    metatarsalObliqueAngleDeg,
    lEff,
    netRise,
    internalSlope,
    forefootLoad,
    heelLoad,
    effectiveRoll,
    loadM1Pct,
    loadM5Pct,
    totalForceN,
    pressureModel,
    peakForefootPressureKpa,
    peakHeelPressureKpa,
    requiresMetatarsalPad,
    defaultPelottePosMm,
    metatarsalPadPosMm,
    metatarsalPadHeightMm,
  }
}

function computeHalfPairSpec(params: {
  side: 'left' | 'right'
  gender: Gender
  shoeSize: number
  weightKg: number
  footLengthMm: number
  soleType: SoleType
  rockerType: RockerType
  heelHeight: number
  toeThickness: number
  rockerAngle: number
  rockerStartPct: number
  compensatoryInsoleMm: number
  profile: FootSideProfile
}): HalfPairPrescriptionSpec {
  const {
    side,
    gender,
    shoeSize,
    weightKg,
    footLengthMm,
    soleType,
    rockerType,
    heelHeight,
    toeThickness,
    rockerAngle,
    rockerStartPct,
    compensatoryInsoleMm,
    profile,
  } = params

  const bio = computeUnifiedSideBiomechanics({
    gender,
    shoeSize,
    weightKg,
    baseFootLengthMm: footLengthMm,
    soleType,
    rockerType,
    heelHeight,
    toeThickness,
    rockerAngle,
    rockerStartPct,
    profile,
  })

  return {
    side,
    sideLabel: side === 'left' ? 'Левая полупара (L)' : 'Правая полупара (R)',
    footLengthMm: bio.footLengthMm,
    lastLengthMm: bio.lastLengthMm,
    widthCode: bio.widthCode,
    forefootWidthMm: bio.forefootWidthMm,
    heelWidthMm: bio.heelWidthMm,
    midfootWidthMm: bio.midfootWidthMm,
    effectiveForefootWidthWithBunionMm: bio.effectiveForefootWidthWithBunionMm,
    ballGirthMm: bio.effBallGirthMm,
    ballBuildUpMm: bio.ballBuildUpMm,
    ballRadialLayerMm: bio.ballRadialLayerMm,
    ballModAction: bio.ballModAction,
    ballModSummary: formatBallModification(bio.ballBuildUpMm, true),
    instepGirthMm: bio.effInstepGirthMm,
    instepBuildUpMm: bio.instepBuildUpMm,
    instepRadialLayerMm: bio.instepRadialLayerMm,
    instepModAction: bio.instepModAction,
    instepModSummary: formatInstepModification(bio.instepBuildUpMm, true),
    obliqueGirthMm: bio.effObliqueGirthMm,
    obliqueEntryDeltaMm: bio.obliqueEntryDeltaMm,
    requiresZipOrLaceWarning: bio.requiresZipOrLaceWarning,
    requiresCncLastWarning: bio.requiresCncLastWarning,
    pronationDeg: bio.clampedPronation,
    halluxValgusDeg: bio.hvDeg,
    archType: profile.archType,
    toeShape: profile.toeShape,
    medialBunionPocketMm: bio.medialBunionPocketMm,
    toeBoxShiftMedialMm: bio.toeBoxShiftMedialMm,
    toeBoxHeightMm: bio.toeBoxHeightMm,
    toeFreeSpaceMm: bio.toeFreeSpaceMm,
    lastApexType: bio.lastApexType,
    lastApexLabel: bio.lastApexLabel,
    insoleType: bio.insoleType,
    archSupportHeightMm: bio.archSupportHeightMm,
    medialHeelWedgeMm: bio.medialHeelWedgeMm,
    lateralWedgeMm: bio.lateralWedgeMm,
    thomasHeelType: bio.thomasHeelType,
    thomasExtensionMm: bio.thomasExtensionMm,
    compensatoryInsoleMm,
    requiresMetatarsalPad: bio.requiresMetatarsalPad,
    metatarsalPadHeightMm: bio.metatarsalPadHeightMm,
    metatarsalPadPosMm: bio.metatarsalPadPosMm,
    forefootLoadPct: bio.forefootLoad,
    heelLoadPct: bio.heelLoad,
    peakForefootPressureKpa: bio.peakForefootPressureKpa,
    peakHeelPressureKpa: bio.peakHeelPressureKpa,
    dominantRay: bio.pressureModel.dominantMetatarsalRay,
  }
}

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

  const inputsFinite =
    Number.isFinite(input.shoeSize) &&
    Number.isFinite(input.weightKg) &&
    Number.isFinite(input.heelHeight) &&
    Number.isFinite(input.toeThickness) &&
    Number.isFinite(input.ballGirthMm) &&
    Number.isFinite(input.instepGirthMm) &&
    Number.isFinite(input.obliqueGirthMm) &&
    Number.isFinite(gm.lastLengthMm) &&
    Number.isFinite(pressureModel.peakForefootKpa)

  invariants.push({
    code: 'INV_INPUT_SANITY',
    category: 'GEOMETRY_INVARIANT',
    severity: 'ERROR',
    title: 'Корректность и конечность входных антропометрических и конструктивных параметров',
    description: inputsFinite
      ? 'Все входные величины конечны и находятся в физически допустимой области определения.'
      : 'Обнаружены некорректные числовые значения (NaN / Infinity) во входных параметрах!',
    passed: inputsFinite,
  })

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
      ? 'Размерная цепь корректна: Пятка ' +
        String(gm.xHeelCenterMm) +
        ' < M5 ' +
        String(gm.xApexM5Mm) +
        ' < M1 ' +
        String(gm.xApexM1Mm) +
        ' < Пучки ' +
        String(gm.xBallMm) +
        ' < Мысок ' +
        String(gm.lastLengthMm) +
        ' мм.'
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
      ? 'Клиренс соблюдён: срез Томаса (' +
        String(gm.xThomasFrontMm) +
        ' мм) проксимальнее пелота (' +
        String(gm.xPelotteMm) +
        ' мм).'
      : 'Кросс-конфликт: удлинение Томаса (' +
        String(gm.xThomasFrontMm) +
        ' мм) наезжает на зону пелота Зейца (' +
        String(gm.xPelotteMm) +
        ' мм)!',
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
      ? 'Геленок (' +
        String(gm.xShankStartMm) +
        '…' +
        String(gm.xShankEndMm) +
        ' мм) не блокирует линию пучков (' +
        String(gm.xBallMm) +
        ' мм).'
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

  const nonNegativeDrop = gm.netRiseMm >= 0
  criticalChecks.push({
    code: 'ERR_NEGATIVE_DROP',
    category: 'CRITICAL_BIOMECHANICS',
    severity: 'ERROR',
    title: 'Неотрицательный перепад высот (Drop = H − T ≥ 0 мм)',
    description: nonNegativeDrop
      ? 'Перепад высот в норме: Drop = ' + String(gm.netRiseMm) + ' мм.'
      : 'Отрицательный дроп (' + String(gm.netRiseMm) + ' мм): платформа носка выше пятки!',
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
    title:
      'Соосность посадки пятки (допуск ' +
      String(C.MIN_SAFE_HEEL_OFFSET_MM) +
      '…+' +
      String(C.MAX_SAFE_HEEL_OFFSET_MM) +
      ' мм)',
    description: heelOffsetSafe
      ? 'Смещение оси набойки (' + String(gm.effectiveHeelTipOffsetMm) + ' мм) в пределах допуска.'
      : 'Выход смещения каблука (' +
        String(gm.effectiveHeelTipOffsetMm) +
        ' мм) за безопасный диапазон!',
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

  const shankAndSlopeSafe = internalSlope < C.CRITICAL_ANGLE && !shankEng.isOverloaded
  criticalChecks.push({
    code: 'ERR_SHANK_AND_SLOPE',
    category: 'CRITICAL_BIOMECHANICS',
    severity: 'ERROR',
    title:
      'Прочность силового элемента (' +
      String(shankEng.material === 'carbon_composite' ? 'Карбон CFRP' : 'Сталь 65Г') +
      ', 10^6 циклов) и критический уклон (< 16°)',
    description: shankAndSlopeSafe
      ? 'Уклон ' +
        String(internalSlope.toFixed(1)) +
        '°, момент ' +
        String(shankEng.bendingMomentNm) +
        ' Н·м, запас выносливости k_fat = ' +
        String(shankEng.fatigueSafetyFactor) +
        '.'
      : 'Перегрузка супинатора или критический уклон (' +
        String(internalSlope.toFixed(1)) +
        '° / ' +
        String(shankEng.bendingMomentNm) +
        ' Н·м)!',
    passed: shankAndSlopeSafe,
  })

  const pressureSafe =
    pressureModel.peakForefootKpa < C.CRITICAL_KPA && forefootLoad < C.CRITICAL_LOAD
  criticalChecks.push({
    code: 'ERR_FOREFOOT_PRESSURE',
    category: 'CRITICAL_BIOMECHANICS',
    severity: 'ERROR',
    title:
      'Пиковое давление под пучками M1–M5 (< ' +
      String(C.CRITICAL_KPA) +
      ' кПа) и нагрузка (< ' +
      String(C.CRITICAL_LOAD) +
      '%)',
    description: pressureSafe
      ? 'Максимум на луче ' +
        String(pressureModel.dominantMetatarsalRay) +
        ': ' +
        String(pressureModel.peakForefootKpa) +
        ' кПа (' +
        String(forefootLoad) +
        '%).'
      : 'Критическая перегрузка на луче ' +
        String(pressureModel.dominantMetatarsalRay) +
        ': ' +
        String(pressureModel.peakForefootKpa) +
        ' кПа (' +
        String(forefootLoad) +
        '%)!',
    passed: pressureSafe,
  })

  const lateralStabilitySafe = inversionRisk < 52 && !highPronationStress
  criticalChecks.push({
    code: 'ERR_LATERAL_STABILITY',
    category: 'CRITICAL_BIOMECHANICS',
    severity: 'ERROR',
    title: 'Фронтальная устойчивость голеностопа (риск инверсии < 52%)',
    description: lateralStabilitySafe
      ? 'Индекс боковой нестабильности ' + String(inversionRisk) + '% в пределах нормы.'
      : 'Высокий риск бокового подворота стопы (' + String(inversionRisk) + '%)!',
    passed: lateralStabilitySafe,
  })

  const manualBuildUpLimitOk =
    gm.ballBuildUpMm <= C.MAX_MANUAL_GIRTH_BUILDUP_MM &&
    gm.instepBuildUpMm <= C.MAX_MANUAL_GIRTH_BUILDUP_MM &&
    obliqueEntryDeltaMm <= C.MAX_MANUAL_OBLIQUE_BUILDUP_MM &&
    gm.ballBuildUpMm >= -C.MAX_MANUAL_GIRTH_REDUCTION_MM &&
    gm.instepBuildUpMm >= -C.MAX_MANUAL_GIRTH_REDUCTION_MM &&
    obliqueEntryDeltaMm >= -C.MAX_MANUAL_OBLIQUE_REDUCTION_MM

  allowanceRules.push({
    code: 'RULE_MANUAL_BUILDUP_LIMIT',
    category: 'ALLOWANCE_AND_GIRTH',
    severity: manualBuildUpLimitOk ? 'INFO' : 'WARNING',
    title: 'Технологический предел ручной модификации стандартной колодки (ΔOп, ΔOв, ΔOк)',
    description: manualBuildUpLimitOk
      ? 'Отклонения обхватов (ΔOп = ' +
        String(gm.ballBuildUpMm) +
        ' мм, ΔOв = ' +
        String(gm.instepBuildUpMm) +
        ' мм, ΔOк = ' +
        String(obliqueEntryDeltaMm) +
        ' мм) допускают ручную доработку базовой колодки.'
      : 'Экстремальное отклонение обхватов (ΔOп = ' +
        String(gm.ballBuildUpMm) +
        ' мм, ΔOв = ' +
        String(gm.instepBuildUpMm) +
        ' мм, ΔOк = ' +
        String(obliqueEntryDeltaMm) +
        ' мм): ручная налепка/снятие исказит геометрию колодки — требуется индивидуальное ЧПУ-фрезерование колодки!',
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
      ? 'Припуск перед пальцами +' +
        String(gm.toeFreeSpaceMm) +
        ' мм соответствует морфологии (' +
        String(gm.toeShape) +
        ').'
      : 'Недостаточный припуск перед пальцами (+' +
        String(gm.toeFreeSpaceMm) +
        ' мм < ' +
        String(minReqFreeSpace) +
        ' мм)!',
    passed: toeAllowanceOk,
  })

  const entryErgonomicsOk =
    obliqueEntryDeltaMm < 12 && gm.instepBuildUpMm < 10 && gm.archType !== 'cavus'
  allowanceRules.push({
    code: 'RULE_OBLIQUE_ENTRY',
    category: 'ALLOWANCE_AND_GIRTH',
    severity: entryErgonomicsOk ? 'INFO' : 'WARNING',
    title: 'Эргономика надевания обуви и раскрываемость берцев (косой обхват Oк)',
    description: entryErgonomicsOk
      ? 'Косой обхват позволяет стандартную конструкцию застёжки.'
      : 'Высокий взъём / косой обхват (ΔOк = ' +
        String(obliqueEntryDeltaMm) +
        ' мм): для надевания обуви обязательна глубокая шнуровка до пучков или застёжка-молния.',
    passed: entryErgonomicsOk,
  })

  const activeHvDeg =
    input.independentSides && input.activeSide === 'right' && input.rightProfile
      ? input.rightProfile.halluxValgusDeg
      : input.independentSides && input.activeSide === 'left' && input.leftProfile
        ? input.leftProfile.halluxValgusDeg
        : (input.halluxValgusDeg ?? 0)

  const cavusHighDropConflict = gm.archType === 'cavus' && gm.netRiseMm > 18
  clinicalHeuristics.push({
    code: 'CLIN_CAVUS_DROP',
    category: 'CLINICAL_HEURISTIC',
    severity: cavusHighDropConflict ? 'WARNING' : 'INFO',
    title: 'Сочетание полой стопы (Cavus) и высоты перепада каблука',
    description: cavusHighDropConflict
      ? 'При полой стопе перепад ' +
        String(gm.netRiseMm) +
        ' мм резко перегружает головки M1 и M5 (средний отдел выключается из опоры). Рекомендуется снизить перепад до ≤ 16 мм.'
      : 'Высота перепада согласована с морфологией продольного свода.',
    passed: !cavusHighDropConflict,
  })

  const hvHighSlopeConflict =
    activeHvDeg >= 15 && gm.netRiseMm > 20 && gm.soleType !== 'rocker'
  clinicalHeuristics.push({
    code: 'CLIN_HV_SLOPE',
    category: 'CLINICAL_HEURISTIC',
    severity: hvHighSlopeConflict ? 'WARNING' : 'INFO',
    title: 'Защита I плюснефалангового сустава при Hallux Valgus ≥ 15°',
    description: hvHighSlopeConflict
      ? 'При HV = ' +
        String(activeHvDeg) +
        '° и перепаде ' +
        String(gm.netRiseMm) +
        ' мм возрастает дорсифлексионная нагрузка на I луч. Рекомендуется перепад ≤ 18 мм и бесшовная союзка.'
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
      ? 'Разница длин стоп ΔL = ' +
        String(gm.lengthAsymmetryMm) +
        ' мм ≥ 8 мм: одной компенсационной полустельки (+' +
        String(gm.compensatoryInsoleHalfPairMm) +
        ' мм) недостаточно — рекомендуется распаровка колодок (разные размеры L и R)!'
      : 'Разница длин стоп ΔL = ' +
        String(gm.lengthAsymmetryMm) +
        ' мм компенсируется в рамках одного базового размера колодки.',
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
    gender = 'female',
    shoeSize: rawShoeSize = 38,
    weightKg: rawWeightKg = 72,
    heelHeight: rawHeelHeight = 28,
    toeThickness: rawToeThickness = 12,
    soleType = 'thomas',
    rockerAngle: rawRockerAngle = 15,
    rockerStartPct: rawRockerStartPct = 60,
    heelTipOffsetMm: rawHeelTipOffsetMm = 0,
    rockerType = 'forefoot',
    pronationDeg = 0,
    ballGirthMm,
    instepGirthMm,
    obliqueGirthMm,
    toeShape = 'egyptian',
    halluxValgusDeg = 0,
    archType = 'normal',
    lengthAsymmetryMm = 0,
    asymmetrySide,
    measuredFootLengthMm,
    measuredForefootWidthMm,
    measuredHeelWidthMm,
    measuredMidfootWidthMm,
    measuredArchHeightMm,
    measuredM1PosMm,
    measuredM5PosMm,
    independentSides = false,
    activeSide = 'left',
    leftProfile,
    rightProfile,
    shankProfilePreference,
  } = input

  const shoeSize = sanitizeFiniteNumber(rawShoeSize, gender === 'male' ? 42 : 38, 30, 52)
  const clampedWeight = sanitizeFiniteNumber(rawWeightKg, 72, 35, 160)
  const heelHeight = sanitizeFiniteNumber(rawHeelHeight, 28, 0, 120)
  const toeThickness = sanitizeFiniteNumber(rawToeThickness, 12, 0, 80)
  const rockerAngle = sanitizeFiniteNumber(rawRockerAngle, 15, 0, 35)
  const rockerStartPct = sanitizeFiniteNumber(rawRockerStartPct, 60, 52, 78)
  const heelTipOffsetMm = sanitizeFiniteNumber(rawHeelTipOffsetMm, 0, -15, 15)

  const sharedProfile: FootSideProfile = {
    ballGirthMm,
    instepGirthMm,
    obliqueGirthMm,
    pronationDeg,
    halluxValgusDeg,
    archType,
    toeShape,
    measuredFootLengthMm,
    measuredForefootWidthMm,
    measuredHeelWidthMm,
    measuredMidfootWidthMm,
    measuredArchHeightMm,
    measuredM1PosMm,
    measuredM5PosMm,
  }

  const resolvedLeftProfile: FootSideProfile =
    independentSides && leftProfile ? leftProfile : sharedProfile
  const resolvedRightProfile: FootSideProfile =
    independentSides && rightProfile ? rightProfile : sharedProfile

  const activeSideProfile: FootSideProfile = independentSides
    ? activeSide === 'right'
      ? resolvedRightProfile
      : resolvedLeftProfile
    : sharedProfile

  const activeSceneProfileLabel = !independentSides
    ? 'ПАРА (симметричные общие обмеры L = R)'
    : activeSide === 'right'
      ? 'ПРАВАЯ ПОЛУПАРА (R — раздельный режим L/R)'
      : 'ЛЕВАЯ ПОЛУПАРА (L — раздельный режим L/R)'

  const rawAsymMm = sanitizeFiniteNumber(lengthAsymmetryMm, 0, 0, 15)

  const resolvedAsymmetrySide: AsymmetrySide =
    rawAsymMm === 0 || asymmetrySide === 'equal'
      ? 'equal'
      : asymmetrySide === 'right'
        ? 'right'
        : 'left'

  const effectiveAsymMm = resolvedAsymmetrySide === 'equal' ? 0 : rawAsymMm
  const requiresMismatchedPairLasts =
    effectiveAsymMm >= C.MISMATCHED_PAIR_LAST_THRESHOLD_MM

  const baseLongerFootLengthMm =
    measuredFootLengthMm !== undefined && Number.isFinite(measuredFootLengthMm)
      ? Math.round(sanitizeFiniteNumber(measuredFootLengthMm, 245, 150, 350))
      : Math.round(
          (shoeSize - C.SHOE_SIZE_TO_FOOT_OFFSET_PARIS) * C.STEP_TO_MM +
            effectiveAsymMm * C.ASYMMETRY_LONGER_FOOT_FACTOR
        )
  const shorterFootLengthMm = Math.max(150, baseLongerFootLengthMm - effectiveAsymMm)

  const leftFootLengthMm =
    resolvedAsymmetrySide === 'right' ? shorterFootLengthMm : baseLongerFootLengthMm
  const rightFootLengthMm =
    resolvedAsymmetrySide === 'left' ? shorterFootLengthMm : baseLongerFootLengthMm
  const shorterFootSide: 'left' | 'right' | 'none' =
    resolvedAsymmetrySide === 'left'
      ? 'right'
      : resolvedAsymmetrySide === 'right'
        ? 'left'
        : 'none'

  // В режиме независимых полупар основная сцена использует длину стопы активной стороны (чтобы давление совпадало на 100%)
  const sideSpecificBaseLengthMm = independentSides
    ? activeSide === 'right'
      ? rightFootLengthMm
      : leftFootLengthMm
    : baseLongerFootLengthMm

  const mainBaseFootLengthMm =
    activeSideProfile.measuredFootLengthMm !== undefined &&
    Number.isFinite(activeSideProfile.measuredFootLengthMm)
      ? Math.round(
          sanitizeFiniteNumber(
            activeSideProfile.measuredFootLengthMm,
            sideSpecificBaseLengthMm,
            150,
            350
          )
        )
      : sideSpecificBaseLengthMm

  const bio = computeUnifiedSideBiomechanics({
    gender,
    shoeSize,
    weightKg: clampedWeight,
    baseFootLengthMm: mainBaseFootLengthMm,
    soleType,
    rockerType,
    heelHeight,
    toeThickness,
    rockerAngle,
    rockerStartPct,
    profile: activeSideProfile,
  })

  const {
    isAnthropometryMeasured,
    hvDeg,
    clampedPronation,
    effBallGirthMm,
    std,
    footLengthMm,
    toeShapeAllowanceMm,
    toeFreeSpaceMm,
    fashionAllowanceMm,
    lastLengthMm,
    ballBuildUpMm,
    instepBuildUpMm,
    obliqueEntryDeltaMm,
    ballRadialLayerMm,
    instepRadialLayerMm,
    ballModAction,
    instepModAction,
    standardForefootWidthMm,
    forefootWidthMm,
    heelWidthMm,
    midfootWidthMm,
    widthIndexPct,
    widthCode,
    requiresZipOrLaceWarning,
    requiresCncLastWarning,
    anatomicalFootApexOffsetMm,
    medialBunionPocketMm,
    lastApexType,
    lastApexLabel,
    toeBoxShiftMedialMm,
    toeApexLateralZNorm,
    toeLateralPlateauFactor,
    effectiveForefootWidthWithBunionMm,
    toeBoxHeightMm,
    insoleType,
    archSupportHeightMm,
    medialHeelWedgeMm,
    lateralWedgeMm,
    recommendThomasHeel,
    recommendedThomasMm,
    thomasHeelType,
    thomasExtensionMm,
    clampedStartPct,
    ballPos,
    apexM1_Mm,
    apexM5_Mm,
    metatarsalObliqueAngleDeg,
    lEff,
    netRise,
    internalSlope,
    forefootLoad,
    heelLoad,
    effectiveRoll,
    loadM1Pct,
    loadM5Pct,
    totalForceN,
    pressureModel,
    peakForefootPressureKpa,
    peakHeelPressureKpa,
    requiresMetatarsalPad,
    defaultPelottePosMm,
    metatarsalPadPosMm,
    metatarsalPadHeightMm,
  } = bio

  const ballModSummary = formatBallModification(ballBuildUpMm)
  const instepModSummary = formatInstepModification(instepBuildUpMm)

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

  let shoreA = '40–45 Shore A (Средняя EVA)'
  if (clampedWeight < 60) {
    shoreA = '30–35 Shore A (Мягкая EVA/PPT)'
  } else if (clampedWeight > 85 && clampedWeight <= 108) {
    shoreA = '50–55 Shore A (Усиленная EVA + каркас)'
  } else if (clampedWeight > 108) {
    shoreA = '60–65 Shore A (Жесткий карбон/термопласт)'
  }

  const counterStiffness =
    Math.abs(clampedPronation) >= 4 || clampedWeight >= 95
      ? 'Жесткий удлиненный задник 2.2 мм (до пучков)'
      : 'Формоустойчивый задник 1.6 мм'

  const orthoticIndicated =
    Math.abs(clampedPronation) >= 2 ||
    activeSideProfile.archType !== 'normal' ||
    hvDeg >= C.HV_POCKET_THRESHOLD_DEG ||
    Math.abs(ballBuildUpMm) >= 6 ||
    clampedWeight >= 90

  const heelCenterPos = lastLengthMm * C.HEEL_CENTER_RATIO
  const shankLength = Math.round(Math.max(40, ballPos - heelCenterPos - 5))
  const effectiveHeelTipOffsetMm = soleType !== 'rocker' ? heelTipOffsetMm : 0

  const supportReductionMm =
    soleType === 'rocker'
      ? shankLength * (rockerType === 'heelToToe' ? 0.45 : 0.42)
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

  const carbonInsertThicknessMm =
    soleType === 'rocker'
      ? parseFloat(
          (
            1.2 +
            (clampedWeight / 100) * 0.6 +
            (heelHeight / 100) * 0.4 +
            (rockerType === 'heelToToe' ? 0.1 : 0)
          ).toFixed(1)
        )
      : 0

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
    carbonInsertThicknessMm,
    forefootWidthMm,
    preference: shankProfilePreference,
  })

  const shankOverloaded = shankEngineering.isOverloaded
  const steelThickness = shankEngineering.steelThicknessMm
  const thomasTooHigh = soleType === 'thomas' && heelHeight > C.MAX_THOMAS_HEEL_MM
  const rockerTooHigh =
    soleType === 'rocker' &&
    (heelHeight > C.MAX_ROCKER_HEEL_MM || netRise > C.MAX_ROCKER_NET_RISE_MM)

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
  const xShankEndMm = Math.min(Math.round(ballPos - 4), xHeelCenterMm + shankLength)
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

  const rPreset = ROCKER_PRESETS[rockerType] ?? ROCKER_PRESETS.forefoot
  const rearHeelRockerLiftMm =
    soleType === 'rocker'
      ? rockerType === 'heelToToe'
        ? Math.round(Math.min(12, heelHeight * 0.28))
        : rockerType === 'negative'
          ? Math.round(Math.min(8, heelHeight * 0.18))
          : Math.round(Math.min(5, heelHeight * 0.12))
      : 0

  const geometryModel: LastGeometryModel = {
    isAnthropometryMeasured,
    activeSceneProfileLabel,
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
    rearHeelRockerLiftMm,
    instepBaseHeightMm: gender === 'male' ? 60 : 54,
    toeBoxHeightMm,

    standardForefootWidthMm,
    forefootWidthMm,
    midfootWidthMm,
    effectiveForefootWidthWithBunionMm,
    heelWidthMm,
    ballBuildUpMm,
    ballRadialLayerMm,
    ballModAction,
    instepBuildUpMm,
    instepRadialLayerMm,
    instepModAction,
    obliqueEntryDeltaMm,
    medialBunionPocketMm,
    bunionPocketCenterMm: apexM1_Mm,
    bunionPocketRadiusMm: 18 + Math.min(6, Math.round(medialBunionPocketMm * 0.8)),
    archType: activeSideProfile.archType,
    toeShape: activeSideProfile.toeShape,
    lastApexType,
    lastApexLabel,
    anatomicalFootApexOffsetMm,
    toeBoxShiftMedialMm,
    toeApexLateralZNorm,
    toeLateralPlateauFactor,
    metatarsalObliqueAngleDeg,

    requiresMetatarsalPad,
    metatarsalPadPosMm,
    metatarsalPadHeightMm,
    pelotteHalfLengthMm: 11,
    soleType,
    rockerType,
    rockerClinicalLabel: rPreset.clinicalLabel,
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

  const leftSpec = computeHalfPairSpec({
    side: 'left',
    gender,
    shoeSize,
    weightKg: clampedWeight,
    footLengthMm: leftFootLengthMm,
    soleType,
    rockerType,
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
    rockerType,
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
    activeSceneDescription: activeSceneProfileLabel,
    left: leftSpec,
    right: rightSpec,
  }

  const soleConstructionSummary = describeSoleConstruction({
    soleType,
    rockerType,
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

  const structuredLevels: MasterSpecThreeLevels = {
    level1Anthropometry: [
      'Пол / Размер / Вес: ' +
        String(gender === 'male' ? 'Мужской' : 'Женский') +
        ', ' +
        String(shoeSize) +
        ' EU, ' +
        String(clampedWeight) +
        ' кг (' +
        String(isAnthropometryMeasured ? 'прямой обмер стопы' : 'расчёт по размеру EU') +
        ')',
      'Длины стоп (Лев / Прав): ' +
        String(leftFootLengthMm) +
        ' / ' +
        String(rightFootLengthMm) +
        ' мм (ΔL = ' +
        String(effectiveAsymMm) +
        ' мм)',
      'Обхваты активного профиля (' +
        String(activeSceneProfileLabel) +
        '): Oп = ' +
        String(effBallGirthMm) +
        ' мм, Oв = ' +
        String(bio.effInstepGirthMm) +
        ' мм, Oк = ' +
        String(bio.effObliqueGirthMm) +
        ' мм',
      'Морфология и углы: пальцы — ' +
        String(activeSideProfile.toeShape) +
        ', свод — ' +
        String(activeSideProfile.archType) +
        ', завал пятки = ' +
        String(clampedPronation) +
        '°, Hallux Valgus = ' +
        String(hvDeg) +
        '°',
    ],
    level2EngineeringSpec: [
      'Колодка: след L_last = ' +
        String(lastLengthMm) +
        ' мм, полнота ' +
        String(widthCode) +
        ', ширина пучков ' +
        String(forefootWidthMm) +
        ' мм (с карманом HV: ' +
        String(effectiveForefootWidthWithBunionMm) +
        ' мм), ширина пятки ' +
        String(heelWidthMm) +
        ' мм',
      'Доработка колодки: ' +
        String(ballModSummary) +
        '; ' +
        String(instepModSummary) +
        '; карман M1 +' +
        String(medialBunionPocketMm) +
        ' мм',
      'Подошва и силовой элемент: ' +
        String(soleConstructionSummary) +
        ' (W_x = ' +
        String(shankEngineering.sectionModulusMm3) +
        ' мм³, σ_max ≈ ' +
        String(shankEngineering.estimatedBendingStressMpa) +
        ' МПа, k_fat = ' +
        String(shankEngineering.fatigueSafetyFactor) +
        ')',
    ],
    level3ClinicalRecommendations: [
      'Ортопедическая стелька (рекомендация): ' +
        String(shoreA) +
        ', профиль — ' +
        String(insoleType) +
        ', выкладка свода ' +
        String(archSupportHeightMm) +
        ' мм, клин пятки +' +
        String(Math.max(medialHeelWedgeMm, lateralWedgeMm)) +
        ' мм',
      'Метатарзальная разгрузка и компенсация длины: пелот Зейца — ' +
        String(
          requiresMetatarsalPad
            ? 'рекомендован (' +
              String(metatarsalPadHeightMm) +
              ' мм на ' +
              String(metatarsalPadPosMm) +
              ' мм от пятки)'
            : 'не требуется'
        ) +
        '; полустелька — ' +
        String(
          compensatoryInsoleHalfPairMm > 0
            ? '+' + String(compensatoryInsoleHalfPairMm) + ' мм в короткую полупару'
            : 'не требуется'
        ),
      'Расчётная биомеханическая эвристика давления (не заменяет аппаратную педобарографию): пик ' +
        String(peakForefootPressureKpa) +
        ' кПа на луче ' +
        String(pressureModel.dominantMetatarsalRay) +
        ' (требует очной верификации ортопедом)',
    ],
  }

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
              activeSideProfile.toeShape === 'greek'
                ? 'Греческая стопа, удлинённый II луч'
                : activeSideProfile.toeShape === 'roman'
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
        '4. Нормированная эвристика давления M1–M5 и расчёт силового элемента (' +
        String(shankEngineering.material === 'carbon_composite' ? 'CFRP' : '65Г') +
        ', 10^6 циклов)',
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
        'ΣF_Mi = F_fore; P_i = (F_i/A_i)·k_ф·k_шаг; σ_max = K_σ·M_полн·(1 − k_W)·α_EI / W_x ≤ σ_fat(10^6)',
      substitution:
        'Пик (' +
        String(pressureModel.dominantMetatarsalRay) +
        ') = ' +
        String(peakForefootPressureKpa) +
        ' кПа; M_чист = ' +
        String(shankEngineering.netShankMomentNm) +
        ' Н·м, W_x = ' +
        String(shankEngineering.sectionModulusMm3) +
        ' мм³, K_σ = ' +
        String(shankEngineering.stressConcentrationFactor) +
        ', σ = ' +
        String(shankEngineering.estimatedBendingStressMpa) +
        ' МПа',
      result:
        'Давление ' +
        String(peakForefootPressureKpa) +
        ' кПа (эвристика) · Напряжение ' +
        String(shankEngineering.estimatedBendingStressMpa) +
        ' МПа (k_fat = ' +
        String(shankEngineering.fatigueSafetyFactor) +
        ' при пределе ' +
        String(shankEngineering.fatigueLimit1e6Mpa) +
        ' МПа)',
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
      requiresCncLastWarning,
      forefootWidthMm,
      midfootWidthMm,
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
      structuredLevels,
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
      'Перегрузка силового элемента (' +
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
  if (eng.rx.requiresCncLastWarning) {
    warnings.push(
      'Экстремальное отклонение обхватов — вместо ручной налепки требуется ЧПУ-фрезерование колодки'
    )
  }
  if (eng.geometryModel.requiresMismatchedPairLasts) {
    warnings.push(
      'Разница длин стоп ΔL ≥ 8 мм — рекомендуется распаровка колодок (разные размеры L и R)'
    )
  }

  return { errors, warnings }
}

/**
 * Контракт неизменяемости антропометрических параметров пациента и выбранного типа подошвы.
 */
export function verifyImmutablePatientContract(before: HeelInput, after: HeelInput): boolean {
  return (
    before.gender === after.gender &&
    before.shoeSize === after.shoeSize &&
    before.weightKg === after.weightKg &&
    before.ballGirthMm === after.ballGirthMm &&
    before.instepGirthMm === after.instepGirthMm &&
    before.obliqueGirthMm === after.obliqueGirthMm &&
    before.pronationDeg === after.pronationDeg &&
    before.halluxValgusDeg === after.halluxValgusDeg &&
    before.toeShape === after.toeShape &&
    before.archType === after.archType &&
    before.lengthAsymmetryMm === after.lengthAsymmetryMm &&
    before.asymmetrySide === after.asymmetrySide &&
    before.soleType === after.soleType
  )
}

function buildIssueDiagnostics(
  errors: string[],
  warnings: string[],
  eng: HeelEngineering,
  soleType: SoleType
): AutoFixIssueDiagnostic[] {
  const list: AutoFixIssueDiagnostic[] = []

  for (const err of errors) {
    if (err.includes('нестабильности') || err.includes('завал')) {
      list.push({
        severity: 'ERROR',
        issue: err,
        causeClassification:
          'Анатомический завал стопы пациента (' +
          String(eng.pronationDeg) +
          '°) не может быть изменён алгоритмом подбора высоты каблука',
        masterAction:
          soleType === 'flat'
            ? 'Переключите тип подошвы на «Каблук Томаса» или «Рокер», установите жёсткий удлинённый задник 2.2 мм и клин пятки +' +
              String(Math.max(eng.rx.medialHeelWedgeMm, eng.rx.lateralWedgeMm)) +
              ' мм.'
            : 'Примените жёсткий берц с продлением крыла задника до пучков и индивидуальный супинатор/пронатор с клином пятки.',
      })
    } else if (err.includes('пучков') || err.includes('кПа')) {
      list.push({
        severity: 'ERROR',
        issue: err,
        causeClassification:
          'Высокая удельная нагрузка при текущем весе (' +
          String(eng.shankEngineering.bendingMomentNm) +
          ' Н·м) и морфологии стопы',
        masterAction:
          'Установите метатарзальный пелот Зейца (' +
          String(eng.metatarsalPadHeightMm ?? 5) +
          ' мм) и рассмотрите переход на перекатную рокерную подошву.',
      })
    } else {
      list.push({
        severity: 'ERROR',
        issue: err,
        causeClassification: 'Конструктивно-геометрическое ограничение выбранного типа подошвы',
        masterAction: 'Скорректируйте профиль подошвы или выберите усиленный желобчатый геленок 65Г.',
      })
    }
  }

  for (const warn of warnings) {
    if (warn.includes('шнуровка') || warn.includes('молния')) {
      list.push({
        severity: 'WARNING',
        issue: warn,
        causeClassification:
          'Анатомическая особенность подъёма и косого обхвата пациента (не меняется высотой каблука)',
        masterAction:
          'Заложите в крой верха раскрытие берцев до линии пучков или боковую застёжку-молнию.',
      })
    } else if (warn.includes('ЧПУ')) {
      list.push({
        severity: 'WARNING',
        issue: warn,
        causeClassification: 'Превышен предел ручной оклейки стандартной колодки по обхватам',
        masterAction: 'Закажите индивидуальное ЧПУ-фрезерование колодки по обмерному профилю.',
      })
    } else if (warn.includes('Томаса')) {
      list.push({
        severity: 'WARNING',
        issue: warn,
        causeClassification: 'Выбран стандартный каблук при наличии выраженного завала стопы',
        masterAction: 'По согласованию с клиентом переключите вкладку опоры на «Каблук Томаса».',
      })
    } else if (warn.includes('распаровка')) {
      list.push({
        severity: 'WARNING',
        issue: warn,
        causeClassification: 'Анатомическая разница длин стоп ΔL ≥ 8 мм',
        masterAction: 'Используйте распаровку базовых колодок разных размеров для левой и правой полупар.',
      })
    } else {
      list.push({
        severity: 'WARNING',
        issue: warn,
        causeClassification: 'Клинико-эргономическое предупреждение',
        masterAction: 'Проверьте рекомендации в Техкарте мастера.',
      })
    }
  }

  return list
}

export function suggestAutoFix(
  input: HeelInput,
  initialEng?: HeelEngineering
): AutoFixResult {
  const C = HEEL_CONST
  const maxHeelForGender = input.gender === 'male' ? 55 : 85
  const minHeelAllowed = 10

  const frozenInitialInput: HeelInput = { ...input }

  let state: HeelInput = { ...input }
  let currentEng = initialEng ?? computeEngineering(state)
  let violations = collectAuditViolations(
    currentEng,
    state.soleType,
    state.heelHeight,
    state.rockerAngle
  )

  const appliedChanges: string[] = []

  const hasInitialFixableSlopeOrRockerWarning =
    currentEng.internalSlope < 0 ||
    currentEng.internalSlope > C.COMFORT_ANGLE ||
    (state.soleType === 'rocker' && state.heelHeight < 20 && state.rockerAngle > 16) ||
    (currentEng.geometryModel.archType === 'cavus' && currentEng.netRise > 18) ||
    ((state.halluxValgusDeg ?? 0) >= 15 && currentEng.netRise > 20 && state.soleType !== 'rocker')

  if (violations.errors.length === 0 && !hasInitialFixableSlopeOrRockerWarning) {
    const immutableContractVerified = verifyImmutablePatientContract(frozenInitialInput, state)
    const diagnostics = buildIssueDiagnostics(
      violations.errors,
      violations.warnings,
      currentEng,
      state.soleType
    )
    const hasWarnings = violations.warnings.length > 0
    return {
      soleType: state.soleType,
      toeThickness: state.toeThickness,
      heelHeight: state.heelHeight,
      heelTipOffsetMm: state.heelTipOffsetMm,
      rockerAngle: state.rockerAngle,
      rockerStartPct: state.rockerStartPct,
      status: hasWarnings ? 'RESOLVED_WITH_WARNINGS' : 'ALREADY_OPTIMAL',
      qualityLevel: hasWarnings ? 'CRITICAL_RESOLVED_WARNINGS_REMAIN' : 'FULLY_OPTIMAL',
      iterations: 0,
      resolved: true,
      fullyOptimal: !hasWarnings,
      immutableContractVerified,
      summaryMessage: hasWarnings
        ? 'Критических ошибок нет, но имеются анатомические/конструктивные предупреждения (' +
          String(violations.warnings.length) +
          ' шт.): ' +
          String(violations.warnings.join('; '))
        : 'Параметры уже находятся в полностью оптимальном ортопедическом диапазоне.',
      appliedChanges: [],
      remainingIssues: [],
      remainingWarnings: violations.warnings,
      diagnostics,
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
      (state.soleType === 'rocker' && state.heelHeight < 20 && state.rockerAngle > 16) ||
      currentEng.validation.clinicalHeuristics.some(
        (h) => (h.code === 'CLIN_CAVUS_DROP' || h.code === 'CLIN_HV_SLOPE') && !h.passed
      )

    if (violations.errors.length === 0 && !hasSlopeOrRockerWarning) {
      break
    }

    iterations = step
    let changedInStep = false

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

    const cavusOrHvDropConflict = currentEng.validation.clinicalHeuristics.some(
      (h) => (h.code === 'CLIN_CAVUS_DROP' || h.code === 'CLIN_HV_SLOPE') && !h.passed
    )
    const needsDropReduction =
      currentEng.internalSlope > C.COMFORT_ANGLE ||
      currentEng.shankOverloaded ||
      currentEng.peakForefootPressureKpa >= C.CRITICAL_KPA ||
      currentEng.forefootLoad >= C.CRITICAL_LOAD ||
      currentEng.highInversionRisk ||
      cavusOrHvDropConflict

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
        const optStart = ROCKER_PRESETS[state.rockerType ?? 'forefoot'].startPct
        if (Math.abs(state.rockerStartPct - optStart) > 2) {
          const nextStart =
            state.rockerStartPct > optStart
              ? Math.max(optStart, state.rockerStartPct - 3)
              : Math.min(optStart, state.rockerStartPct + 3)
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
  const hasRemainingWarnings = finalViolations.warnings.length > 0
  const fullyOptimal = resolved && !hasRemainingWarnings
  const immutableContractVerified = verifyImmutablePatientContract(frozenInitialInput, state)
  const diagnostics = buildIssueDiagnostics(
    finalViolations.errors,
    finalViolations.warnings,
    finalEng,
    state.soleType
  )

  const status: AutoFixResolutionStatus = !resolved
    ? 'PARTIAL_OR_UNRESOLVABLE'
    : hasRemainingWarnings
      ? 'RESOLVED_WITH_WARNINGS'
      : 'RESOLVED'

  const qualityLevel: AutoFixQualityLevel = !resolved
    ? 'UNRESOLVED_LIMITATIONS'
    : hasRemainingWarnings
      ? 'CRITICAL_RESOLVED_WARNINGS_REMAIN'
      : 'CRITICAL_ERRORS_RESOLVED'

  const modeHint =
    !resolved && state.soleType === 'flat' && finalEng.rx.recommendThomasHeel
      ? ' (Причина: выраженный завал стопы при неизменном типе подошвы; действие мастера: переключите опору на «Томаса» или «Рокер» и установите жёсткий задник.)'
      : ''

  const summaryMessage = fullyOptimal
    ? 'Автоподбор успешно завершён за ' +
      String(Math.max(1, iterations)) +
      ' итер.: все критические ошибки и предупреждения устранены (режим подошвы и антропометрия сохранены).'
    : resolved
      ? 'Критические ошибки устранены за ' +
        String(Math.max(1, iterations)) +
        ' итер., но остались конструктивно-анатомические предупреждения (' +
        String(finalViolations.warnings.length) +
        ' шт.): ' +
        String(finalViolations.warnings.join('; '))
      : 'Оптимизировано в текущем режиме за ' +
        String(Math.max(1, iterations)) +
        ' итер., но остаётся ' +
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
    status,
    qualityLevel,
    iterations: Math.max(1, iterations),
    resolved,
    fullyOptimal,
    immutableContractVerified,
    summaryMessage,
    appliedChanges,
    remainingIssues: finalViolations.errors,
    remainingWarnings: finalViolations.warnings,
    diagnostics,
  }
}
