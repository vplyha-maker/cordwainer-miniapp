// src/components/heel/OrthoExpertReportModal.tsx
import React, { useState } from 'react'
import type { HeelInput, HeelEngineering } from '../../lib/heelCalc'

type Props = {
  isOpen: boolean
  onClose: () => void
  input: HeelInput
  eng: HeelEngineering
  isDark: boolean
}

type ProjectionTab = 'top_compare' | 'side_bottom_rear' | 'steps_math'

export function OrthoExpertReportModal({ isOpen, onClose, input, eng, isDark }: Props) {
  const [projTab, setProjTab] = useState<ProjectionTab>('top_compare')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const cBg = isDark ? 'bg-[#0C0C0C]' : 'bg-[#F5F2EB]'
  const cCard = isDark ? 'bg-[#151515]' : 'bg-[#FFFFFF]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cMuted = isDark ? 'text-[#F4F0E8]/60' : 'text-[#1C1816]/60'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'

  const hvDeg = input.halluxValgusDeg ?? 0
  const asymMm = input.lengthAsymmetryMm ?? 0
  const leftLen = eng.footLengthMm
  const rightLen = Math.max(180, eng.footLengthMm - asymMm)

  // Координаты для Вида Сверху и Сравнения (Стандартная колодка vs Индивидуальная)
  const m1Ratio = eng.apexM1_Mm / eng.lastLengthMm
  const m5Ratio = eng.apexM5_Mm / eng.lastLengthMm
  const xM1Svg = Math.round(40 + m1Ratio * 230)
  const xM5Svg = Math.round(40 + m5Ratio * 230)
  const apexZShiftPx = eng.rx.toeBoxShiftMedialMm * 2.2
  const ballExpandPx = Math.max(0, eng.rx.ballBuildUpMm) * 1.4
  const bunionPocketPx = eng.rx.medialBunionPocketMm * 2.0

  const handleCopy = () => {
    const text = [
      `ИНДИВИДУАЛЬНОЕ ТЕХНИЧЕСКОЕ ЗАДАНИЕ МАСТЕРУ ОБУВНОГО ПРОИЗВОДСТВА`,
      `================================================================`,
      `• Профиль стопы: ${input.gender === 'male' ? 'Мужской' : 'Женский'}, Размер ${input.shoeSize}, Вес ${input.weightKg} кг`,
      `• Размеры стоп: Длинная = ${leftLen} мм, Вторая = ${rightLen} мм (Асимметрия ΔL = ${asymMm} мм)`,
      `• Тип апекса колодки: ${eng.rx.lastApexLabel} (смещение мыска +${eng.rx.toeBoxShiftMedialMm} мм к I лучу)`,
      `• Форма и полнота колодки: След = ${eng.lastLengthMm} мм, Полнота = ${eng.rx.widthCode}, Ширина пучков = ${eng.rx.forefootWidthMm} мм (база ${eng.rx.standardForefootWidthMm} мм)`,
      `• Конструктивные изменения (Желтая зона): Пучки ${eng.rx.ballBuildUpMm >= 0 ? `+${eng.rx.ballBuildUpMm}` : eng.rx.ballBuildUpMm} мм, Карман M1 (HV ${hvDeg}°): +${eng.rx.medialBunionPocketMm} мм, Прямой взъем: ${eng.rx.instepBuildUpMm >= 0 ? `+${eng.rx.instepBuildUpMm}` : eng.rx.instepBuildUpMm} мм, Высота носка: ${eng.rx.toeBoxHeightMm} мм`,
      `• Свободный припуск перед пальцами (Зеленая зона): +${eng.rx.toeFreeSpaceMm} мм`,
      `• Анатомические ориентиры (Синяя зона): Головка M1 = ${eng.apexM1_Mm} мм, Головка M5 = ${eng.apexM5_Mm} мм, Косая линия сгиба = ${eng.rx.metatarsalObliqueAngleDeg}°`,
      `• Подошва и каблук: Перепад Drop = ${eng.netRise} мм (H=${input.heelHeight} / T=${input.toeThickness} мм, Уклон ${eng.internalSlope.toFixed(1)}°), Режим: ${input.soleType === 'thomas' ? `Каблук Томаса +${eng.rx.thomasExtensionMm} мм` : input.soleType === 'rocker' ? `Рокер ${input.rockerAngle}° + Карбон ${eng.carbonInsertThicknessMm} мм` : 'Стандарт'}, Геленок 65Г: ${eng.shankLength}×${eng.steelThickness} мм`,
      `• Стелька: ${eng.rx.shoreA}, Свод ${eng.rx.archSupportHeightMm} мм, Пелот Зейца: ${eng.requiresMetatarsalPad ? `${eng.metatarsalPadHeightMm} мм на ${eng.metatarsalPadPosMm} мм` : 'Не требуется'}`,
    ].join('\n')
    try {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {}
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-3"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[560px] max-h-[95dvh] flex flex-col rounded-t-[20px] sm:rounded-[18px] border ${cLine} ${cBg} ${cText} shadow-2xl overflow-hidden`}
      >
        {/* 1. ГЛАВНЫЙ ЭКРАН — ЗАДАНИЕ МАСТЕРУ (ШАПКА) */}
        <div className={`px-4 py-3 border-b ${cLine} flex items-center justify-between shrink-0 bg-[var(--color-surface)]`}>
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#F59E0B] font-semibold">
              AI FOOTWEAR MASTER VISUAL ASSISTANT // ТЕХЛИСТ КОЛОДОЧНИКА
            </div>
            <h2 className="font-serif text-[16px] font-semibold leading-tight">
              ИНДИВИДУАЛЬНОЕ ТЕХНИЧЕСКОЕ ЗАДАНИЕ МАСТЕРУ
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[var(--color-border)] flex items-center justify-center text-xs cursor-pointer bg-transparent"
          >
            ✕
          </button>
        </div>

        {/* 4-ЦВЕТНАЯ ИНЖЕНЕРНАЯ МАРКИРОВКА (ЛЕГЕНДА СТАНДАРТА) */}
        <div className={`px-3.5 py-1.5 border-b ${cLine} grid grid-cols-2 sm:grid-cols-4 gap-1 text-[8px] font-mono shrink-0 bg-black/20`}>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#E11D48] inline-block shrink-0" />
            КРАСНЫЙ: Давление/Запрет
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981] inline-block shrink-0" />
            ЗЕЛЕНЫЙ: Свободный объем
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#3186FF] inline-block shrink-0" />
            СИНИЙ: Анатомия/Оси
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B] inline-block shrink-0" />
            ЖЕЛТЫЙ: Доработка (мм)
          </span>
        </div>

        {/* ПЕРЕКЛЮЧАТЕЛЬ ЧЕРТЕЖНЫХ ЛИСТОВ МАСТЕРА */}
        <div className="px-3.5 pt-2 shrink-0">
          <div className={`grid grid-cols-3 gap-1 p-1 rounded-[10px] border ${cLine} ${cCard}`}>
            {(
              [
                { id: 'top_compare', label: '1. СВЕРХУ & АПЕКСЫ' },
                { id: 'side_bottom_rear', label: '2. СБОКУ / СЗАДИ / СНИЗУ' },
                { id: 'steps_math', label: '3. ЭТАПЫ 1–6 & РАСЧЕТЫ' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setProjTab(t.id)}
                className={`py-1.5 rounded-[7px] text-[8px] font-mono uppercase tracking-wider cursor-pointer border-none transition-all ${
                  projTab === t.id
                    ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold'
                    : 'bg-transparent text-[var(--color-ink)] opacity-60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* СОДЕРЖИМОЕ ТЕХНИЧЕСКОГО ЛИСТА */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-hide">
          {/* СВОДКА ЗАДАНИЯ МАСТЕРУ */}
          <div className={`p-3 rounded-[12px] border ${cLine} ${cCard} grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px]`}>
            <div>
              • <strong>Стопы (Лев/Прав):</strong> {leftLen} / {rightLen} мм (Δ={asymMm} мм)
            </div>
            <div>
              • <strong>След колодки:</strong> {eng.lastLengthMm} мм ({eng.rx.widthCode})
            </div>
            <div>
              • <strong>Ширина пучков:</strong> {eng.rx.forefootWidthMm} мм (база {eng.rx.standardForefootWidthMm} мм)
            </div>
            <div>
              • <strong>Апекс колодки:</strong> +{eng.rx.toeBoxShiftMedialMm} мм ({eng.rx.lastApexType === 'oblique_anatomical' ? 'Косой II луч' : 'Прямой I луч'})
            </div>
            <div className="text-[#F59E0B] font-medium">
              • <strong>Налепка (Желтый):</strong> Пучки {eng.rx.ballBuildUpMm >= 0 ? `+${eng.rx.ballBuildUpMm}` : eng.rx.ballBuildUpMm} мм · Взъем {eng.rx.instepBuildUpMm >= 0 ? `+${eng.rx.instepBuildUpMm}` : eng.rx.instepBuildUpMm} мм
            </div>
            <div className="text-[#10B981] font-medium">
              • <strong>Припуск мыска (Зеленый):</strong> +{eng.rx.toeFreeSpaceMm} мм · Высота {eng.rx.toeBoxHeightMm} мм
            </div>
          </div>

          {/* ЛИСТ 1: ПРОЕКЦИЯ СВЕРХУ (ДО / ПОСЛЕ) + СРАВНЕНИЕ КОСОГО И ПРЯМОГО АПЕКСА */}
          {projTab === 'top_compare' && (
            <div className="space-y-3">
              <div className={`p-3 rounded-[12px] border ${cLine} ${cCard}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[8.5px] uppercase tracking-wider font-semibold">
                    ПРОЕКЦИЯ 1 & 5: ВИД СВЕРХУ — СРАВНЕНИЕ «СТАНДАРТНАЯ vs ИНДИВИДУАЛЬНАЯ КОЛОДКА»
                  </span>
                  <span className="font-mono text-[8px] opacity-60">МАСШТАБ CAD // ММ</span>
                </div>

                <svg viewBox="0 0 320 155" className="w-full h-auto overflow-visible">
                  {/* Осевая линия колодки */}
                  <line x1="25" y1="78" x2="295" y2="78" stroke="#3186FF" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.55" />
                  <text x="298" y="80" fill="#3186FF" fontSize="6.5" fontFamily="monospace">ОСЬ 0°</text>

                  {/* 1. Пунктирный контур СТАНДАРТНОЙ колодки (ДО корректировки) */}
                  <path
                    d="M 40 78 C 40 52, 85 52, 130 55 C 165 56, 195 44, 225 48 C 258 53, 278 65, 282 78 C 278 91, 258 103, 225 108 C 195 112, 165 100, 130 101 C 85 104, 40 104, 40 78 Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.45"
                  />

                  {/* 2. ЖЕЛТАЯ ЗОНА ДОРАБОТКИ КОЛОДКИ (Расширение пучков + карман под косточку M1) */}
                  {(ballExpandPx > 0 || bunionPocketPx > 0) && (
                    <path
                      d={`M 165 52 Q ${xM1Svg} ${36 - ballExpandPx - bunionPocketPx}, 248 ${54 - apexZShiftPx} L 245 58 Q ${xM1Svg} ${45}, 165 54 Z`}
                      fill="#F59E0B"
                      fillOpacity="0.38"
                      stroke="#F59E0B"
                      strokeWidth="1.2"
                    />
                  )}

                  {/* 3. ЗЕЛЕНАЯ ЗОНА СВОБОДНОГО ПРОСТРАНСТВА МЫСКА (Припуск +мм перед пальцами) */}
                  <path
                    d={`M 258 ${57 - apexZShiftPx * 0.6} Q 290 ${64 - apexZShiftPx}, 292 ${76 - apexZShiftPx} Q 290 ${92 - apexZShiftPx * 0.5}, 258 98 L 250 92 Q 274 ${76 - apexZShiftPx * 0.7}, 250 62 Z`}
                    fill="#10B981"
                    fillOpacity="0.32"
                    stroke="#10B981"
                    strokeWidth="1.1"
                  />

                  {/* 4. Сплошной контур ИНДИВИДУАЛЬНОЙ КОЛОДКИ (ПОСЛЕ корректировки) */}
                  <path
                    d={`M 40 78 C 40 52, 85 52, 130 54 C 165 54, ${xM1Svg - 10} ${42 - ballExpandPx - bunionPocketPx}, 228 ${46 - ballExpandPx * 0.6 - apexZShiftPx * 0.5} C 262 ${50 - apexZShiftPx}, 288 ${62 - apexZShiftPx}, 292 ${76 - apexZShiftPx} C 288 ${92 - apexZShiftPx * 0.4}, 260 ${104 + ballExpandPx * 0.5}, 222 ${110 + ballExpandPx * 0.8} C 190 ${114 + ballExpandPx}, 162 101, 130 101 C 85 104, 40 104, 40 78 Z`}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="1.6"
                  />

                  {/* 5. КРАСНАЯ ЗОНА ПОТЕНЦИАЛЬНОГО ДАВЛЕНИЯ (Головка M1 / HV и головка M5) */}
                  <ellipse
                    cx={xM1Svg}
                    cy={46 - ballExpandPx * 0.5}
                    rx="11"
                    ry="6"
                    fill="#E11D48"
                    fillOpacity="0.38"
                    stroke="#E11D48"
                    strokeWidth="1"
                  />
                  <ellipse
                    cx={xM5Svg}
                    cy={107 + ballExpandPx * 0.4}
                    rx="9"
                    ry="5"
                    fill="#E11D48"
                    fillOpacity="0.28"
                    stroke="#E11D48"
                    strokeWidth="0.9"
                  />

                  {/* 6. СИНИЕ АНАТОМИЧЕСКИЕ ОРИЕНТИРЫ (Головки M1, M5, косая линия сгиба, анатомический апекс) */}
                  <line
                    x1={xM5Svg}
                    y1={106 + ballExpandPx * 0.4}
                    x2={xM1Svg}
                    y2={46 - ballExpandPx * 0.5}
                    stroke="#3186FF"
                    strokeWidth="1.4"
                  />
                  <circle cx={xM1Svg} cy={46 - ballExpandPx * 0.5} r="3" fill="#3186FF" />
                  <circle cx={xM5Svg} cy={106 + ballExpandPx * 0.4} r="3" fill="#3186FF" />

                  {/* Синяя точка — Анатомический апекс пальцев стопы */}
                  <circle
                    cx="268"
                    cy={78 - eng.rx.anatomicalFootApexOffsetMm * 1.6}
                    r="3"
                    fill="#3186FF"
                  />
                  {/* Желтая точка — Геометрический апекс носка колодки */}
                  <circle cx="292" cy={76 - apexZShiftPx} r="3.5" fill="#F59E0B" />

                  {/* Пелот Зейца (показывается ТОЛЬКО если requiresMetatarsalPad === true!) */}
                  {eng.requiresMetatarsalPad && (
                    <ellipse
                      cx={xM1Svg - 16}
                      cy="76"
                      rx="11"
                      ry="14"
                      fill="#E11D48"
                      fillOpacity="0.25"
                      stroke="#E11D48"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Выноски с миллиметрами и градусами */}
                  <text x={xM1Svg - 18} y="24" fill="#F59E0B" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    ПУЧКИ {eng.rx.ballBuildUpMm >= 0 ? `+${eng.rx.ballBuildUpMm}` : eng.rx.ballBuildUpMm}мм
                    {eng.rx.medialBunionPocketMm > 0 ? ` (HV +${eng.rx.medialBunionPocketMm}мм)` : ''}
                  </text>
                  <line x1={xM1Svg} y1="27" x2={xM1Svg} y2={40 - ballExpandPx} stroke="#F59E0B" strokeWidth="0.8" />

                  <text x={xM5Svg - 25} y="136" fill="#3186FF" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    СГИБ M1–M5: {eng.rx.metatarsalObliqueAngleDeg}° ({eng.apexM1_Mm}/{eng.apexM5_Mm}мм)
                  </text>

                  <text x="215" y="18" fill="#10B981" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    ПРИПУСК +{eng.rx.toeFreeSpaceMm}мм
                  </text>
                  <line x1="265" y1="21" x2="278" y2={62 - apexZShiftPx} stroke="#10B981" strokeWidth="0.8" />

                  <text x="215" y="146" fill="#F59E0B" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    АПЕКС КОЛОДКИ +{eng.rx.toeBoxShiftMedialMm}мм
                  </text>
                </svg>
              </div>

              {/* ВИЗУАЛЬНОЕ СРАВНЕНИЕ: ПРЯМОЙ АПЕКС VS КОСОЙ АПЕКС */}
              <div className={`p-3 rounded-[12px] border ${cLine} ${cCard}`}>
                <div className="font-mono text-[8px] uppercase tracking-wider text-[#3186FF] font-semibold mb-1.5">
                  СХЕМА АПЕКСОВ НОСОЧНОЙ ЧАСТИ: ПРЯМОЙ (МЕДИАЛЬНЫЙ) VS КОСОЙ АПЕКС
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-[10px]">
                  <div className={`p-2 rounded-[9px] border ${eng.rx.lastApexType === 'medial_straight' ? 'border-[#10B981] bg-[#10B981]/10' : cLine}`}>
                    <div className="font-mono text-[8px] font-bold text-[#10B981]">
                      1. ПРЯМОЙ АПЕКС (STRAIGHT APEX) {eng.rx.lastApexType === 'medial_straight' ? '✓ ВЫБРАН' : ''}
                    </div>
                    <div className="opacity-85 mt-0.5">
                      Вершина мыска колодки смещена внутрь на <strong>+{eng.rx.toeBoxShiftMedialMm} мм</strong> к оси I плюсневой кости. Исключает боковое давление на большой палец при Египетской стопе и Hallux Valgus.
                    </div>
                  </div>
                  <div className={`p-2 rounded-[9px] border ${eng.rx.lastApexType === 'oblique_anatomical' ? 'border-[#10B981] bg-[#10B981]/10' : cLine}`}>
                    <div className="font-mono text-[8px] font-bold text-[#3186FF]">
                      2. КОСОЙ АПЕКС (OBLIQUE APEX) {eng.rx.lastApexType === 'oblique_anatomical' ? '✓ ВЫБРАН' : ''}
                    </div>
                    <div className="opacity-85 mt-0.5">
                      Вершина мыска ориентирована по оси II луча с плавным косым скосом параллельно линии головок M1–M5 ({eng.rx.metatarsalObliqueAngleDeg}°). Оптимален для Греческой стопы.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ЛИСТ 2: ПРОЕКЦИИ СБОКУ (ВЗЪЕМ И ПРОФИЛЬ), СЗАДИ (ПЯТКА) И СНИЗУ (ОПОРНАЯ БАЗА И ТОМАС) */}
          {projTab === 'side_bottom_rear' && (
            <div className="space-y-3">
              {/* ВИД СБОКУ */}
              <div className={`p-3 rounded-[12px] border ${cLine} ${cCard}`}>
                <div className="font-mono text-[8.5px] uppercase tracking-wider font-semibold mb-1">
                  ПРОЕКЦИЯ 2: ВИД СБОКУ (ПРЯМОЙ ВЗЪЕМ, СВОД, ПЕРЕПАД ВЫСОТ И МЫСОК)
                </div>
                <svg viewBox="0 0 320 115" className="w-full h-auto overflow-visible">
                  <line x1="20" y1="96" x2="300" y2="96" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" />
                  {/* Подошва и каблук */}
                  <path
                    d="M 42 68 L 95 68 L 95 96 L 44 96 Z"
                    fill={input.soleType === 'thomas' ? '#10B981' : 'currentColor'}
                    fillOpacity="0.45"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  {/* След и верх колодки */}
                  <path
                    d="M 42 68 C 95 68, 145 88, 195 88 L 285 82 L 285 90 L 195 96 C 145 96, 95 74, 42 74 Z"
                    fill="#3186FF"
                    fillOpacity="0.25"
                    stroke="#3186FF"
                    strokeWidth="1.2"
                  />
                  {/* Профиль гребня колодки (Прямой взъем) */}
                  <path
                    d="M 42 68 Q 38 35, 52 22 L 135 24 Q 175 42, 210 66 Q 255 68, 285 82"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeDasharray="3 2"
                    opacity="0.6"
                  />
                  {/* Желтая налепка на прямой взъем */}
                  {eng.rx.instepBuildUpMm > 0 && (
                    <path
                      d="M 125 24 Q 165 24, 205 64 Q 168 38, 125 24 Z"
                      fill="#F59E0B"
                      fillOpacity="0.45"
                      stroke="#F59E0B"
                      strokeWidth="1.2"
                    />
                  )}
                  <text x="128" y="16" fill="#F59E0B" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    ВЗЪЕМ (Oв): {eng.rx.instepBuildUpMm >= 0 ? `+${eng.rx.instepBuildUpMm}` : eng.rx.instepBuildUpMm} мм
                  </text>
                  <text x="222" y="56" fill="#10B981" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    ВЫСОТА НОСКА: {eng.rx.toeBoxHeightMm} мм
                  </text>
                  <text x="44" y="108" fill="#3186FF" fontSize="7" fontFamily="monospace" fontWeight="bold">
                    DROP: {eng.netRise}мм (H={input.heelHeight}/T={input.toeThickness}мм) · СВОД: {eng.rx.archSupportHeightMm}мм
                  </text>
                </svg>
              </div>

              {/* ВИД СЗАДИ И ВИД СНИЗУ В ДВЕ КОЛОНКИ */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* ПРОЕКЦИЯ 3: ВИД СЗАДИ (ОСЬ ПЯТКИ) */}
                <div className={`p-2.5 rounded-[12px] border ${cLine} ${cCard}`}>
                  <div className="font-mono text-[8px] uppercase tracking-wider font-semibold mb-1">
                    3. ВИД СЗАДИ (ПЯТКА)
                  </div>
                  <svg viewBox="0 0 140 115" className="w-full h-auto">
                    <line x1="20" y1="98" x2="120" y2="98" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                    {/* Вертикаль нормы */}
                    <line x1="70" y1="12" x2="70" y2="98" stroke="#3186FF" strokeWidth="0.9" strokeDasharray="2 2" />
                    {/* Контур задника и каблука */}
                    <rect x="46" y="72" width="48" height="26" rx="3" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1" />
                    {/* Желтый клин стельки (медиальный или латеральный) */}
                    {(eng.rx.medialHeelWedgeMm > 0 || eng.rx.lateralWedgeMm > 0) && (
                      <polygon
                        points={
                          eng.rx.medialHeelWedgeMm > 0
                            ? '46,72 94,72 94,63'
                            : '46,72 94,72 46,63'
                        }
                        fill="#F59E0B"
                        fillOpacity="0.6"
                        stroke="#F59E0B"
                      />
                    )}
                    {/* Красная отклоненная ось пятки */}
                    <line
                      x1="70"
                      y1="72"
                      x2={70 - eng.pronationDeg * 2.2}
                      y2="16"
                      stroke="#E11D48"
                      strokeWidth="1.8"
                    />
                    <text x="14" y="110" fill="#F59E0B" fontSize="6.5" fontFamily="monospace" fontWeight="bold">
                      ОСЬ: {eng.pronationDeg}° · КЛИН +{Math.max(eng.rx.medialHeelWedgeMm, eng.rx.lateralWedgeMm)}мм
                    </text>
                  </svg>
                </div>

                {/* ПРОЕКЦИЯ 4: ВИД СНИЗУ (ПОДОШВА И КАБЛУК ТОМАСА) */}
                <div className={`p-2.5 rounded-[12px] border ${cLine} ${cCard}`}>
                  <div className="font-mono text-[8px] uppercase tracking-wider font-semibold mb-1">
                    4. ВИД СНИЗУ (ПОДОШВА)
                  </div>
                  <svg viewBox="0 0 140 115" className="w-full h-auto">
                    {/* Контур подошвы */}
                    <path
                      d="M 20 56 C 20 38, 55 38, 82 34 C 108 30, 128 42, 130 56 C 128 70, 108 82, 82 78 C 55 74, 20 74, 20 56 Z"
                      fill="currentColor"
                      fillOpacity="0.15"
                      stroke="currentColor"
                      strokeWidth="1.1"
                    />
                    {/* Г-образный каблук Томаса или стандартный каблук */}
                    <path
                      d={
                        input.soleType === 'thomas'
                          ? 'M 20 42 L 50 42 L 50 56 L 68 62 L 68 70 L 20 70 Z'
                          : 'M 20 42 L 48 42 L 48 70 L 20 70 Z'
                      }
                      fill="#10B981"
                      fillOpacity="0.45"
                      stroke="#10B981"
                      strokeWidth="1.2"
                    />
                    {/* Геленок 65Г */}
                    <line x1="35" y1="56" x2="86" y2="56" stroke="#F59E0B" strokeWidth="2.5" />
                    <text x="12" y="110" fill="#10B981" fontSize="6.5" fontFamily="monospace" fontWeight="bold">
                      {input.soleType === 'thomas'
                        ? `ТОМАС +${eng.rx.thomasExtensionMm}мм · 65Г ${eng.shankLength}мм`
                        : `ГЕЛЕНОК 65Г: ${eng.shankLength}×${eng.steelThickness}мм`}
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* ЛИСТ 3: ПОСЛЕДОВАТЕЛЬНОСТЬ РАБОТЫ МАСТЕРА (1–6) И ДОКАЗАТЕЛЬНЫЕ РАСЧЕТЫ */}
          {projTab === 'steps_math' && (
            <div className="space-y-3">
              <div className={`p-3 rounded-[12px] border ${cLine} ${cCard} space-y-2`}>
                <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#F59E0B] font-semibold">
                  ПОСЛЕДОВАТЕЛЬНОСТЬ РАБОТЫ ОБУВНОГО МАСТЕРА (ЧЕК-ЛИСТ 1–6)
                </div>
                <div className="space-y-1.5 text-[10.5px]">
                  <div>
                    <strong>1. Подготовка колодки:</strong> Взять базовую колодку размера <strong>{input.shoeSize}</strong> (длина следа <strong>{eng.lastLengthMm} мм</strong>, базовая полнота <strong>{eng.rx.widthCode}</strong>).
                  </div>
                  <div>
                    <strong>2. Корректировка геометрии (Желтые зоны):</strong> Выполнить налепку в пучках <strong>{eng.rx.ballBuildUpMm >= 0 ? `+${eng.rx.ballBuildUpMm}` : eng.rx.ballBuildUpMm} мм</strong> (до ширины <strong>{eng.rx.forefootWidthMm} мм</strong>)
                    {eng.rx.medialBunionPocketMm > 0 ? `, сформировать разгрузочный карман под головку M1 +${eng.rx.medialBunionPocketMm} мм` : ''} и налепку на гребень взъема <strong>{eng.rx.instepBuildUpMm >= 0 ? `+${eng.rx.instepBuildUpMm}` : eng.rx.instepBuildUpMm} мм</strong>.
                  </div>
                  <div>
                    <strong>3. Проверка положения апекса:</strong> Сформировать <strong>{eng.rx.lastApexLabel}</strong> со смещением вершины мыска на <strong>+{eng.rx.toeBoxShiftMedialMm} мм</strong> к медиальной оси.
                  </div>
                  <div>
                    <strong>4. Проверка объема носочной части (Зеленая зона):</strong> Обеспечить высоту носочной коробки <strong>{eng.rx.toeBoxHeightMm} мм</strong> и свободный припуск перед пальцами <strong>+{eng.rx.toeFreeSpaceMm} мм</strong>.
                  </div>
                  <div>
                    <strong>5. Сборка стельки и контроль посадки:</strong> Изготовить стельку твердостью <strong>{eng.rx.shoreA}</strong> (выкладка свода <strong>{eng.rx.archSupportHeightMm} мм</strong>, клин пятки <strong>+{Math.max(eng.rx.medialHeelWedgeMm, eng.rx.lateralWedgeMm)} мм</strong>, пелот Зейца: <strong>{eng.requiresMetatarsalPad ? `${eng.metatarsalPadHeightMm} мм на ${eng.metatarsalPadPosMm} мм` : 'не ставится'}</strong>).
                  </div>
                  <div>
                    <strong>6. Сборка подошвы и проверка готовой обуви:</strong> Установить стальной геленок 65Г <strong>{eng.shankLength}×{eng.steelThickness} мм</strong>, {input.soleType === 'thomas' ? `каблук Томаса с удлинением груди +${eng.rx.thomasExtensionMm} мм` : input.soleType === 'rocker' ? `рокерный перекат ${input.rockerAngle}° с карбоном ${eng.carbonInsertThicknessMm} мм` : `каблук с перепадом ${eng.netRise} мм`} и {eng.rx.counterStiffness.toLowerCase()}.
                  </div>
                </div>
              </div>

              {/* Формулы */}
              <div className={`p-3 rounded-[12px] border ${cLine} ${cCard} space-y-2`}>
                <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#10B981] font-semibold">
                  МАТЕМАТИЧЕСКОЕ ОБОСНОВАНИЕ (ФОРМУЛЫ И ПОДСТАНОВКА)
                </div>
                {eng.rx.calculations.map((c, i) => (
                  <div key={i} className={`p-2 rounded-[8px] border ${cLine} text-[10px]`}>
                    <div className="font-semibold">{c.title}</div>
                    <div className="font-mono text-[#10B981]">{c.formula} → {c.result}</div>
                    <div className="opacity-80">{c.meaning}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* КНОПКИ ДЕЙСТВИЯ */}
        <div className={`p-3 border-t ${cLine} flex items-center gap-2 shrink-0 bg-[var(--color-surface)]`}>
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2.5 rounded-[10px] font-mono text-[9px] uppercase tracking-wider bg-[#F59E0B] text-black font-semibold cursor-pointer border-none active:scale-98 transition-transform"
          >
            {copied ? '✓ ТЕХЗАДАНИЕ СКОПИРОВАНО' : '📋 СКОПИРОВАТЬ ТЕХЗАДАНИЕ МАСТЕРУ'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-[10px] font-mono text-[9px] uppercase tracking-wider border ${cLine} bg-transparent ${cText} cursor-pointer`}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
