// src/components/heel/OrthoExpertReportModal.tsx
import React, { useState } from 'react'
import {
  formatBallModification,
  formatInstepModification,
  type HeelInput,
  type HeelEngineering,
} from '../../lib/heelCalc'

export interface OrthoExpertReportModalProps {
  isOpen: boolean
  onClose: () => void
  input: HeelInput
  eng: HeelEngineering
  isDark: boolean
}

type ProjectionTab = 'top_compare' | 'side_bottom_rear' | 'steps_math'

export function OrthoExpertReportModal({
  isOpen,
  onClose,
  input,
  eng,
  isDark,
}: OrthoExpertReportModalProps) {
  const [projTab, setProjTab] = useState<ProjectionTab>('top_compare')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  if (!isOpen) return null

  const cBg = isDark ? 'bg-[#0C0C0C]' : 'bg-[#F5F2EB]'
  const cCard = isDark ? 'bg-[#151515]' : 'bg-[#FFFFFF]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'

  // Все координаты и параметры читаются из единого источника правды LastGeometryModel
  const gm = eng.geometryModel
  const hvDeg = input.halluxValgusDeg ?? 0
  const asymMm = gm.lengthAsymmetryMm
  const leftLen = gm.leftFootLengthMm
  const rightLen = gm.rightFootLengthMm

  const longerSideText =
    gm.longerFootSide === 'left'
      ? ('Левая стопа длиннее на ' + String(asymMm) + ' мм')
      : gm.longerFootSide === 'right'
        ? ('Правая стопа длиннее на ' + String(asymMm) + ' мм')
        : 'Стопы равной длины (ΔL = 0 мм)'

  const shorterHalfPairTarget =
    gm.shorterFootSide === 'right'
      ? 'в ПРАВУЮ полупару'
      : gm.shorterFootSide === 'left'
        ? 'в ЛЕВУЮ полупару'
        : ''

  // Координаты для Вида Сверху и Сравнения (строго из gm.uApexM1 и gm.uApexM5)
  const xM1Svg = Math.round(40 + gm.uApexM1 * 230)
  const xM5Svg = Math.round(40 + gm.uApexM5 * 230)
  const xPelotteSvg = Math.round(40 + gm.uPelotte * 230)
  const apexZShiftPx = gm.toeBoxShiftMedialMm * 2.2
  const ballExpandPx = gm.ballBuildUpMm * 1.4
  const bunionPocketPx = gm.medialBunionPocketMm * 2.0

  // Жёсткое разделение описания конструкции подошвы без смешивания Томаса и рокера
  const soleSpecLine =
    gm.soleType === 'thomas'
      ? ('Ортопедический каблук Томаса: удлинение груди +' + String(gm.thomasExtensionMm) + ' мм (' + String(gm.thomasHeelType === 'medial' ? 'внутреннее / медиальное' : 'наружное / латеральное') + '), стальной геленок 65Г ' + String(gm.shankLengthMm) + '×' + String(gm.steelThicknessMm) + ' мм (оценочный момент ' + String(eng.shankBendingMomentNm) + ' Н·м)')
      : gm.soleType === 'rocker'
        ? ('Рокерная перекатная подошва: угол переката ' + String(gm.rockerAngleDeg) + '°, линия старта переката ' + String(gm.rockerStartPct) + '% (' + String(gm.xBallMm) + ' мм), интегрированная карбоновая пластина ' + String(gm.carbonInsertThicknessMm) + ' мм')
        : ('Стандартный каблук: смещение оси набойки ' + String(gm.effectiveHeelTipOffsetMm >= 0 ? ('+' + String(gm.effectiveHeelTipOffsetMm)) : gm.effectiveHeelTipOffsetMm) + ' мм, стальной геленок 65Г ' + String(gm.shankLengthMm) + '×' + String(gm.steelThicknessMm) + ' мм (оценочный момент ' + String(eng.shankBendingMomentNm) + ' Н·м)')

  const handleCopy = async () => {
    const ballText = formatBallModification(gm.ballBuildUpMm, false)
    const instepText = formatInstepModification(gm.instepBuildUpMm, false)
    const wedgeText =
      eng.rx.medialHeelWedgeMm > 0
        ? ('Внутренний (медиальный) клин пятки +' + String(eng.rx.medialHeelWedgeMm) + ' мм')
        : eng.rx.lateralWedgeMm > 0
          ? ('Наружный (латеральный) клин пятки +' + String(eng.rx.lateralWedgeMm) + ' мм')
          : 'Без клина пятки (0 мм)'

    const compInsoleText =
      gm.compensatoryInsoleHalfPairMm > 0
        ? ('Установить компенсационную полустельку/вкладыш +' + String(gm.compensatoryInsoleHalfPairMm) + ' мм ' + String(shorterHalfPairTarget))
        : 'Компенсационная полустелька не требуется (ΔL ≤ 3 мм)'

    const text = [
      'ИНДИВИДУАЛЬНОЕ ТЕХНИЧЕСКОЕ ЗАДАНИЕ МАСТЕРУ ОБУВНОГО ПРОИЗВОДСТВА',
      '================================================================',
      ('• Профиль клиента: ' + String(input.gender === 'male' ? 'Мужской' : 'Женский') + ', Размер ' + String(input.shoeSize) + ' EU, Вес ' + String(input.weightKg) + ' кг'),
      ('• Длины стоп и асимметрия: Левая = ' + String(leftLen) + ' мм, Правая = ' + String(rightLen) + ' мм (' + String(longerSideText) + '). ' + String(compInsoleText)),
      ('• Длина и полнота колодки: След L_last = ' + String(gm.lastLengthMm) + ' мм (опорная стопа ' + String(gm.footLengthMm) + ' мм + свободный припуск ' + String(gm.toeFreeSpaceMm) + ' мм + фасонный припуск ' + String(gm.fashionAllowanceMm) + ' мм), Полнота = ' + String(eng.rx.widthCode)),
      ('• Геометрия мыска и апекса: ' + String(gm.lastApexLabel) + ', смещение вершины мыска +' + String(gm.toeBoxShiftMedialMm) + ' мм к медиальной оси, высота носочной коробки H = ' + String(gm.toeBoxHeightMm) + ' мм'),
      '• Модификация колодки по обхватам (Жёлтая зона):',
      ('  - Пучки (Oп = ' + String(input.ballGirthMm) + ' мм): ' + String(ballText) + ' (ширина следа ' + String(gm.forefootWidthMm) + ' мм vs база ' + String(gm.standardForefootWidthMm) + ' мм)'),
      ('  - Карман под Hallux Valgus (HV = ' + String(hvDeg) + '°): ' + String(gm.medialBunionPocketMm > 0 ? ('сформировать локальный медиальный карман на головке M1 +' + String(gm.medialBunionPocketMm) + ' мм (ширина с учётом HV = ' + String(gm.effectiveForefootWidthWithBunionMm) + ' мм)') : 'не требуется (0 мм)')),
      ('  - Прямой взъём (Oв = ' + String(input.instepGirthMm) + ' мм): ' + String(instepText)),
      ('  - Косой обхват (Oк = ' + String(input.obliqueGirthMm) + ' мм): отклонение ' + String(eng.rx.obliqueEntryDeltaMm >= 0 ? ('+' + String(eng.rx.obliqueEntryDeltaMm)) : eng.rx.obliqueEntryDeltaMm) + ' мм (' + String(eng.rx.requiresZipOrLaceWarning ? 'обязательна раскрываемость: шнуровка / молния' : 'вход стопы свободный') + ')'),
      ('• Анатомические ориентиры (Синяя зона): Центр пятки = ' + String(gm.xHeelCenterMm) + ' мм, Головка M1 = ' + String(gm.xApexM1Mm) + ' мм, Головка M5 = ' + String(gm.xApexM5Mm) + ' мм, Косая метатарзальная ось сгиба = ' + String(gm.metatarsalObliqueAngleDeg) + '°'),
      ('• Конструкция подошвы и каблука: Перепад высот Drop = ' + String(gm.netRiseMm) + ' мм (H = ' + String(gm.heelHeightMm) + ' мм / T = ' + String(gm.toeThicknessMm) + ' мм, продольный уклон ' + String(eng.internalSlope.toFixed(1)) + '°). ' + String(soleSpecLine)),
      ('• Ортопедическая стелька и фурнитура: ' + String(eng.rx.shoreA) + ', выкладка продольного свода ' + String(eng.rx.archSupportHeightMm) + ' мм, ' + String(wedgeText) + ', пелот Зейца: ' + String(gm.requiresMetatarsalPad ? ('высота ' + String(gm.metatarsalPadHeightMm) + ' мм на расстоянии ' + String(gm.metatarsalPadPosMm) + ' мм от пятки') : 'не требуется') + ', задник: ' + String(eng.rx.counterStiffness)),
      ('• Биомеханическая справка (модельная оценка): распределение нагрузки Пучки/Пятка = ' + String(eng.forefootLoad) + '% / ' + String(eng.heelLoad) + '% (M1/M5 = ' + String(eng.loadM1Pct) + '% / ' + String(eng.loadM5Pct) + '%), модельная оценка пикового давления = ' + String(eng.peakForefootPressureKpa) + ' кПа, модельная оценка ЦД (COP) = ' + String(eng.copLongitudinalMm) + ' мм продольно / ' + String(eng.copLateralMm) + ' мм латерально'),
    ].join('\n')

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopyError(false)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      setCopyError(true)
      setTimeout(() => setCopyError(false), 2500)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-3"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={('w-full max-w-[560px] max-h-[95dvh] flex flex-col rounded-t-[20px] sm:rounded-[18px] border ' + String(cLine) + ' ' + String(cBg) + ' ' + String(cText) + ' shadow-2xl overflow-hidden')}
      >
        {/* 1. ШАПКА МОДАЛЬНОГО ОКНА */}
        <div
          className={('px-4 py-3 border-b ' + String(cLine) + ' flex items-center justify-between shrink-0 bg-[var(--color-surface)]')}
        >
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

        {/* 4-ЦВЕТНАЯ ИНЖЕНЕРНАЯ МАРКИРОВКА */}
        <div
          className={('px-3.5 py-1.5 border-b ' + String(cLine) + ' grid grid-cols-2 sm:grid-cols-4 gap-1 text-[8px] font-mono shrink-0 bg-black/20')}
        >
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#E11D48] inline-block shrink-0" />
            КРАСНЫЙ: Давление (мод.)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981] inline-block shrink-0" />
            ЗЕЛЕНЫЙ: Свободный объём
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

        {/* ПЕРЕКЛЮЧАТЕЛЬ ЧЕРТЁЖНЫХ ЛИСТОВ МАСТЕРА */}
        <div className="px-3.5 pt-2 shrink-0">
          <div className={('grid grid-cols-3 gap-1 p-1 rounded-[10px] border ' + String(cLine) + ' ' + String(cCard))}>
            {(
              [
                { id: 'top_compare', label: '1. СВЕРХУ & АПЕКСЫ' },
                { id: 'side_bottom_rear', label: '2. СБОКУ / СЗАДИ / СНИЗУ' },
                { id: 'steps_math', label: '3. ЭТАПЫ 1–6 & РАСЧЕТЫ' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setProjTab(tab.id)}
                className={('py-1.5 rounded-[7px] text-[8px] font-mono uppercase tracking-wider cursor-pointer border-none transition-all ' + String(projTab === tab.id
                    ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold'
                    : 'bg-transparent text-[var(--color-ink)] opacity-60'))}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* СОДЕРЖИМОЕ ТЕХНИЧЕСКОГО ЛИСТА */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-hide">
          {/* СВОДКА ЗАДАНИЯ МАСТЕРУ */}
          <div
            className={('p-3 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard) + ' grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px]')}
          >
            <div>
              • <strong>Стопы (Лев/Прав):</strong> {leftLen} / {rightLen} мм (
              {gm.longerFootSide === 'equal'
                ? 'L = R'
                : gm.longerFootSide === 'left'
                  ? ('Лев +' + String(asymMm) + ' мм')
                  : ('Прав +' + String(asymMm) + ' мм')}
              )
            </div>
            <div>
              • <strong>След колодки:</strong> {gm.lastLengthMm} мм ({eng.rx.widthCode})
            </div>
            <div>
              • <strong>Ширина пучков:</strong> {gm.forefootWidthMm} мм (база{' '}
              {gm.standardForefootWidthMm} мм
              {gm.medialBunionPocketMm > 0
                ? (', с HV: ' + String(gm.effectiveForefootWidthWithBunionMm) + ' мм')
                : ''}
              )
            </div>
            <div>
              • <strong>Апекс колодки:</strong> +{gm.toeBoxShiftMedialMm} мм (
              {gm.lastApexType === 'oblique_anatomical'
                ? 'Косой II луч'
                : gm.lastApexType === 'wide_square'
                  ? 'Широкий I–III лучи'
                  : 'Прямой I луч'}
              )
            </div>
            <div className="text-[#F59E0B] font-medium">
              • <strong>Пучки / Взъём:</strong>{' '}
              {formatBallModification(gm.ballBuildUpMm, true)} ·{' '}
              {formatInstepModification(gm.instepBuildUpMm, true)}
            </div>
            <div className="text-[#10B981] font-medium">
              • <strong>Припуск мыска:</strong> +{gm.toeFreeSpaceMm} мм · Высота{' '}
              {gm.toeBoxHeightMm} мм
              {gm.compensatoryInsoleHalfPairMm > 0
                ? (' · Полустелька +' + String(gm.compensatoryInsoleHalfPairMm) + ' мм')
                : ''}
            </div>
          </div>

          {/* ЛИСТ 1: ПРОЕКЦИЯ СВЕРХУ (ДО / ПОСЛЕ) + СХЕМА АПЕКСОВ */}
          {projTab === 'top_compare' && (
            <div className="space-y-3">
              <div className={('p-3 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard))}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[8.5px] uppercase tracking-wider font-semibold">
                    ПРОЕКЦИЯ 1 & 5: ВИД СВЕРХУ — «СТАНДАРТНАЯ vs ИНДИВИДУАЛЬНАЯ КОЛОДКА»
                  </span>
                  <span className="font-mono text-[8px] opacity-60">МАСШТАБ CAD // ММ</span>
                </div>

                <svg viewBox="0 0 320 155" className="w-full h-auto overflow-visible">
                  {/* Осевая линия колодки */}
                  <line
                    x1="25"
                    y1="78"
                    x2="295"
                    y2="78"
                    stroke="#3186FF"
                    strokeWidth="0.8"
                    strokeDasharray="4 3"
                    opacity="0.55"
                  />
                  <text x="298" y="80" fill="#3186FF" fontSize="6.5" fontFamily="monospace">
                    ОСЬ 0°
                  </text>

                  {/* 1. Пунктирный контур СТАНДАРТНОЙ колодки (ДО корректировки) */}
                  <path
                    d="M 40 78 C 40 52, 85 52, 130 55 C 165 56, 195 44, 225 48 C 258 53, 278 65, 282 78 C 278 91, 258 103, 225 108 C 195 112, 165 100, 130 101 C 85 104, 40 104, 40 78 Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.45"
                  />

                  {/* 2. ЖЁЛТАЯ ЗОНА ДОРАБОТКИ КОЛОДКИ (Наращивание/снятие пучков + карман под косточку M1) */}
                  {(gm.ballBuildUpMm !== 0 || bunionPocketPx > 0) && (
                    <path
                      d={('M 165 52 Q ' + String(xM1Svg) + ' ' + String(36 - Math.max(-8, ballExpandPx) - bunionPocketPx) + ', 248 ' + String(54 - apexZShiftPx) + ' L 245 58 Q ' + String(xM1Svg) + ' 45, 165 54 Z')}
                      fill={gm.ballBuildUpMm >= 0 || bunionPocketPx > 0 ? '#F59E0B' : '#3186FF'}
                      fillOpacity="0.36"
                      stroke={gm.ballBuildUpMm >= 0 || bunionPocketPx > 0 ? '#F59E0B' : '#3186FF'}
                      strokeWidth="1.2"
                      strokeDasharray={gm.ballBuildUpMm < 0 && bunionPocketPx === 0 ? '2 2' : undefined}
                    />
                  )}

                  {/* 3. ЗЕЛЁНАЯ ЗОНА СВОБОДНОГО ПРОСТРАНСТВА МЫСКА */}
                  <path
                    d={('M 258 ' + String(57 - apexZShiftPx * 0.6) + ' Q 290 ' + String(60 - apexZShiftPx) + ', 292 ' + String(76 - apexZShiftPx) + ' Q 290 ' + String(92 - apexZShiftPx * 0.4) + ', 258 97 L 250 92 Q 275 ' + String(76 - apexZShiftPx * 0.7) + ', 250 62 Z')}
                    fill="#10B981"
                    fillOpacity="0.32"
                    stroke="#10B981"
                    strokeWidth="1.1"
                  />

                  {/* 4. Сплошной контур ИНДИВИДУАЛЬНОЙ КОЛОДКИ (ПОСЛЕ корректировки) */}
                  <path
                    d={('M 40 78 C 40 52, 85 52, 130 54 C 165 54, ' + String(xM1Svg - 10) + ' ' + String(42 - ballExpandPx - bunionPocketPx) + ', 228 ' + String(46 - ballExpandPx * 0.6 - apexZShiftPx * 0.5) + ' C 262 ' + String(50 - apexZShiftPx) + ', 288 ' + String(62 - apexZShiftPx) + ', 292 ' + String(76 - apexZShiftPx) + ' C 288 ' + String(92 - apexZShiftPx * 0.4) + ', 260 ' + String(104 + ballExpandPx * 0.5) + ', 222 ' + String(110 + ballExpandPx * 0.8) + ' C 190 ' + String(114 + ballExpandPx) + ', 162 101, 130 101 C 85 104, 40 104, 40 78 Z')}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="1.6"
                  />

                  {/* 5. КРАСНАЯ ЗОНА МОДЕЛЬНОГО ДАВЛЕНИЯ (Головка M1 / HV и головка M5) */}
                  <ellipse
                    cx={xM1Svg}
                    cy={46 - ballExpandPx * 0.5 - bunionPocketPx * 0.35}
                    rx={11 + gm.medialBunionPocketMm * 0.4}
                    ry={6 + gm.medialBunionPocketMm * 0.25}
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

                  {/* 6. СИНИЕ АНАТОМИЧЕСКИЕ ОРИЕНТИРЫ (M1, M5, косая линия сгиба, анатомический апекс) */}
                  <line
                    x1={xM5Svg}
                    y1={106 + ballExpandPx * 0.4}
                    x2={xM1Svg}
                    y2={46 - ballExpandPx * 0.5 - bunionPocketPx * 0.35}
                    stroke="#3186FF"
                    strokeWidth="1.4"
                  />
                  <circle
                    cx={xM1Svg}
                    cy={46 - ballExpandPx * 0.5 - bunionPocketPx * 0.35}
                    r="3"
                    fill="#3186FF"
                  />
                  <circle cx={xM5Svg} cy={106 + ballExpandPx * 0.4} r="3" fill="#3186FF" />

                  {/* Синяя точка — Анатомический апекс пальцев стопы */}
                  <circle
                    cx="268"
                    cy={78 - gm.anatomicalFootApexOffsetMm * 1.6}
                    r="3"
                    fill="#3186FF"
                  />
                  {/* Жёлтая точка — Геометрический апекс носка колодки */}
                  <circle cx="292" cy={76 - apexZShiftPx} r="3.5" fill="#F59E0B" />

                  {/* Пелот Зейца (по координате xPelotteSvg из LastGeometryModel) */}
                  {gm.requiresMetatarsalPad && (
                    <ellipse
                      cx={xPelotteSvg}
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
                  <text
                    x={Math.max(115, xM1Svg - 26)}
                    y="24"
                    fill="#F59E0B"
                    fontSize="6.8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {formatBallModification(gm.ballBuildUpMm, true)}
                    {gm.medialBunionPocketMm > 0
                      ? (' · HV +' + String(gm.medialBunionPocketMm) + 'мм')
                      : ''}
                  </text>
                  <line
                    x1={xM1Svg}
                    y1="27"
                    x2={xM1Svg}
                    y2={40 - ballExpandPx * 0.5 - bunionPocketPx * 0.35}
                    stroke="#F59E0B"
                    strokeWidth="0.8"
                  />

                  <text
                    x={Math.max(70, xM5Svg - 30)}
                    y="136"
                    fill="#3186FF"
                    fontSize="6.8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    СГИБ M1–M5: {gm.metatarsalObliqueAngleDeg}° ({gm.xApexM1Mm}/{gm.xApexM5Mm}мм)
                  </text>

                  <text
                    x="212"
                    y="16"
                    fill="#10B981"
                    fontSize="6.8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    ПРИПУСК +{gm.toeFreeSpaceMm}мм
                  </text>
                  <line
                    x1="265"
                    y1="19"
                    x2="278"
                    y2={62 - apexZShiftPx}
                    stroke="#10B981"
                    strokeWidth="0.8"
                  />

                  <text
                    x="208"
                    y="147"
                    fill="#F59E0B"
                    fontSize="6.8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    АПЕКС КОЛОДКИ +{gm.toeBoxShiftMedialMm}мм
                  </text>
                </svg>
              </div>

              {/* ВИЗУАЛЬНОЕ СРАВНЕНИЕ 3 ТИПОВ АПЕКСА */}
              <div className={('p-3 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard))}>
                <div className="font-mono text-[8px] uppercase tracking-wider text-[#3186FF] font-semibold mb-1.5">
                  СХЕМА АПЕКСОВ НОСОЧНОЙ ЧАСТИ (ЕГИПЕТСКАЯ / ГРЕЧЕСКАЯ / РИМСКАЯ СТОПА)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[9.5px]">
                  <div
                    className={('p-2 rounded-[9px] border ' + String(gm.lastApexType === 'medial_straight'
                        ? 'border-[#10B981] bg-[#10B981]/10'
                        : cLine))}
                  >
                    <div className="font-mono text-[8px] font-bold text-[#10B981]">
                      1. ПРЯМОЙ АПЕКС (I ЛУЧ){' '}
                      {gm.lastApexType === 'medial_straight' ? '✓ ВЫБРАН' : ''}
                    </div>
                    <div className="opacity-85 mt-0.5">
                      Вершина мыска смещена внутрь на{' '}
                      <strong>+{gm.toeBoxShiftMedialMm} мм</strong> к оси I плюсневой кости.
                      Разгружает I палец при Египетской стопе и Hallux Valgus.
                    </div>
                  </div>
                  <div
                    className={('p-2 rounded-[9px] border ' + String(gm.lastApexType === 'oblique_anatomical'
                        ? 'border-[#10B981] bg-[#10B981]/10'
                        : cLine))}
                  >
                    <div className="font-mono text-[8px] font-bold text-[#3186FF]">
                      2. КОСОЙ АПЕКС (II ЛУЧ){' '}
                      {gm.lastApexType === 'oblique_anatomical' ? '✓ ВЫБРАН' : ''}
                    </div>
                    <div className="opacity-85 mt-0.5">
                      Вершина ориентирована по оси II луча с удлинённым припуском и скосом
                      параллельно линии M1–M5 ({gm.metatarsalObliqueAngleDeg}°). Для Греческой стопы.
                    </div>
                  </div>
                  <div
                    className={('p-2 rounded-[9px] border ' + String(gm.lastApexType === 'wide_square'
                        ? 'border-[#10B981] bg-[#10B981]/10'
                        : cLine))}
                  >
                    <div className="font-mono text-[8px] font-bold text-[#F59E0B]">
                      3. ШИРОКИЙ АПЕКС (I–III){' '}
                      {gm.lastApexType === 'wide_square' ? '✓ ВЫБРАН' : ''}
                    </div>
                    <div className="opacity-85 mt-0.5">
                      Трапециевидная коробка со смещением{' '}
                      <strong>+{gm.toeBoxShiftMedialMm} мм</strong> сохраняет полноту для I–III
                      пальцев равной длины. Для Римской стопы.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ЛИСТ 2: ПРОЕКЦИИ СБОКУ, СЗАДИ И СНИЗУ */}
          {projTab === 'side_bottom_rear' && (
            <div className="space-y-3">
              {/* ВИД СБОКУ */}
              <div className={('p-3 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard))}>
                <div className="font-mono text-[8.5px] uppercase tracking-wider font-semibold mb-1">
                  ПРОЕКЦИЯ 2: ВИД СБОКУ (ПРЯМОЙ ВЗЪЁМ, СВОД, ПЕРЕПАД ВЫСОТ И МЫСОК)
                </div>
                <svg viewBox="0 0 320 115" className="w-full h-auto overflow-visible">
                  <line
                    x1="20"
                    y1="96"
                    x2="300"
                    y2="96"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    strokeDasharray="3 3"
                    opacity="0.4"
                  />
                  {/* Подошва и каблук / танкетка */}
                  {gm.soleType === 'rocker' ? (
                    <path
                      d="M 42 68 L 195 88 L 195 96 L 56 96 Q 44 94, 42 68 Z"
                      fill="#475569"
                      fillOpacity="0.55"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  ) : (
                    <path
                      d={('M 42 68 L ' + String(gm.soleType === 'thomas' ? 112 : 95) + ' 68 L ' + String(gm.soleType === 'thomas' ? 112 : 95) + ' 96 L 44 96 Z')}
                      fill={gm.soleType === 'thomas' ? '#10B981' : 'currentColor'}
                      fillOpacity="0.45"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  )}
                  {/* След и верх колодки */}
                  <path
                    d="M 42 68 C 95 68, 145 88, 195 88 L 285 82 L 285 90 L 195 96 C 145 96, 95 74, 42 74 Z"
                    fill="#3186FF"
                    fillOpacity="0.25"
                    stroke="#3186FF"
                    strokeWidth="1.2"
                  />
                  {/* Профиль гребня колодки (Прямой взъём) */}
                  <path
                    d="M 42 68 Q 38 35, 52 22 L 135 24 Q 175 42, 210 66 Q 255 68, 285 82"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeDasharray="3 2"
                    opacity="0.6"
                  />
                  {/* Наращивание (>0) или снятие материала (<0) на прямом взъёме */}
                  {gm.instepBuildUpMm > 0 && (
                    <path
                      d="M 125 24 Q 165 18, 205 64 Q 168 38, 125 24 Z"
                      fill="#F59E0B"
                      fillOpacity="0.45"
                      stroke="#F59E0B"
                      strokeWidth="1.2"
                    />
                  )}
                  {gm.instepBuildUpMm < 0 && (
                    <path
                      d="M 125 24 Q 165 44, 205 64 Q 168 34, 125 24 Z"
                      fill="#3186FF"
                      fillOpacity="0.28"
                      stroke="#3186FF"
                      strokeWidth="1.1"
                      strokeDasharray="2 2"
                    />
                  )}
                  <text
                    x="116"
                    y="15"
                    fill={gm.instepBuildUpMm < 0 ? '#3186FF' : '#F59E0B'}
                    fontSize="6.8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    ВЗЪЁМ (Oв): {formatInstepModification(gm.instepBuildUpMm, true)}
                  </text>
                  <text
                    x="216"
                    y="56"
                    fill="#10B981"
                    fontSize="6.8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    ВЫСОТА НОСКА: {gm.toeBoxHeightMm} мм
                  </text>
                  <text
                    x="40"
                    y="108"
                    fill="#3186FF"
                    fontSize="6.8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    DROP: {gm.netRiseMm}мм (H={gm.heelHeightMm}/T={gm.toeThicknessMm}мм) · СВОД:{' '}
                    {eng.rx.archSupportHeightMm}мм
                  </text>
                </svg>
              </div>

              {/* ВИД СЗАДИ И ВИД СНИЗУ */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* ПРОЕКЦИЯ 3: ВИД СЗАДИ (ОСЬ ПЯТКИ) */}
                <div className={('p-2.5 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard))}>
                  <div className="font-mono text-[8px] uppercase tracking-wider font-semibold mb-1">
                    3. ВИД СЗАДИ (ПЯТКА)
                  </div>
                  <svg viewBox="0 0 140 115" className="w-full h-auto">
                    <line
                      x1="20"
                      y1="98"
                      x2="120"
                      y2="98"
                      stroke="currentColor"
                      strokeWidth="0.8"
                      opacity="0.4"
                    />
                    <line
                      x1="70"
                      y1="12"
                      x2="70"
                      y2="98"
                      stroke="#3186FF"
                      strokeWidth="0.9"
                      strokeDasharray="2 2"
                    />
                    <rect
                      x="46"
                      y="72"
                      width="48"
                      height="26"
                      rx="3"
                      fill="currentColor"
                      fillOpacity="0.25"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
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
                    <line
                      x1="70"
                      y1="72"
                      x2={70 - eng.pronationDeg * 2.2}
                      y2="16"
                      stroke="#E11D48"
                      strokeWidth="1.8"
                    />
                    <text
                      x="12"
                      y="110"
                      fill="#F59E0B"
                      fontSize="6.3"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      ОСЬ: {eng.pronationDeg}° · КЛИН +
                      {Math.max(eng.rx.medialHeelWedgeMm, eng.rx.lateralWedgeMm)}мм
                    </text>
                  </svg>
                </div>

                {/* ПРОЕКЦИЯ 4: ВИД СНИЗУ (ЧЁТКОЕ РАЗДЕЛЕНИЕ ТОМАСА / РОКЕРА / СТАНДАРТА) */}
                <div className={('p-2.5 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard))}>
                  <div className="font-mono text-[8px] uppercase tracking-wider font-semibold mb-1">
                    4. ВИД СНИЗУ (ОПОРА)
                  </div>
                  <svg viewBox="0 0 140 115" className="w-full h-auto">
                    <path
                      d="M 20 56 C 20 38, 55 38, 82 34 C 108 30, 128 42, 130 56 C 128 70, 108 82, 82 78 C 55 74, 20 74, 20 56 Z"
                      fill="currentColor"
                      fillOpacity="0.15"
                      stroke="currentColor"
                      strokeWidth="1.1"
                    />
                    {gm.soleType === 'thomas' ? (
                      <>
                        <path
                          d={
                            gm.thomasHeelType === 'lateral'
                              ? 'M 20 42 L 68 42 L 68 50 L 50 56 L 50 70 L 20 70 Z'
                              : 'M 20 42 L 50 42 L 50 56 L 68 62 L 68 70 L 20 70 Z'
                          }
                          fill="#10B981"
                          fillOpacity="0.45"
                          stroke="#10B981"
                          strokeWidth="1.2"
                        />
                        <line
                          x1="35"
                          y1="56"
                          x2="86"
                          y2="56"
                          stroke="#F59E0B"
                          strokeWidth="2.5"
                        />
                        <text
                          x="8"
                          y="110"
                          fill="#10B981"
                          fontSize="6.1"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          ТОМАС +{gm.thomasExtensionMm}мм · 65Г {gm.shankLengthMm}×
                          {gm.steelThicknessMm}мм
                        </text>
                      </>
                    ) : gm.soleType === 'rocker' ? (
                      <>
                        <line
                          x1="84"
                          y1="32"
                          x2="84"
                          y2="80"
                          stroke="#10B981"
                          strokeWidth="1.2"
                          strokeDasharray="3 2"
                        />
                        <line
                          x1="32"
                          y1="56"
                          x2="118"
                          y2="56"
                          stroke="#10B981"
                          strokeWidth="2.5"
                          strokeDasharray="5 2"
                        />
                        <text
                          x="8"
                          y="110"
                          fill="#10B981"
                          fontSize="6.1"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          РОКЕР {gm.rockerAngleDeg}° · КАРБОН {gm.carbonInsertThicknessMm}мм
                        </text>
                      </>
                    ) : (
                      <>
                        <path
                          d="M 20 42 L 48 42 L 48 70 L 20 70 Z"
                          fill="#3186FF"
                          fillOpacity="0.35"
                          stroke="#3186FF"
                          strokeWidth="1.2"
                        />
                        <line
                          x1="35"
                          y1="56"
                          x2="86"
                          y2="56"
                          stroke="#F59E0B"
                          strokeWidth="2.5"
                        />
                        <text
                          x="8"
                          y="110"
                          fill="#3186FF"
                          fontSize="6.1"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          СТАНДАРТ · 65Г {gm.shankLengthMm}×{gm.steelThicknessMm}мм
                        </text>
                      </>
                    )}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* ЛИСТ 3: ПОСЛЕДОВАТЕЛЬНОСТЬ РАБОТЫ МАСТЕРА (1–6) И ДОКАЗАТЕЛЬНЫЕ РАСЧЁТЫ */}
          {projTab === 'steps_math' && (
            <div className="space-y-3">
              <div className={('p-3 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard) + ' space-y-2')}>
                <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#F59E0B] font-semibold">
                  ПОСЛЕДОВАТЕЛЬНОСТЬ РАБОТЫ ОБУВНОГО МАСТЕРА (ЧЕК-ЛИСТ 1–6)
                </div>
                <div className="space-y-1.5 text-[10.5px]">
                  <div>
                    <strong>1. Подготовка колодки и учёт асимметрии:</strong> Взять базовую
                    колодку размера <strong>{input.shoeSize}</strong> (длина следа{' '}
                    <strong>{gm.lastLengthMm} мм</strong>, полнота{' '}
                    <strong>{eng.rx.widthCode}</strong>). {eng.rx.asymmetrySummary}
                  </div>
                  <div>
                    <strong>2. Модификация колодки по обхватам (Жёлтые зоны):</strong> В пучках —{' '}
                    <strong>{formatBallModification(gm.ballBuildUpMm, false)}</strong> (до ширины
                    следа <strong>{gm.forefootWidthMm} мм</strong>
                    {gm.medialBunionPocketMm > 0
                      ? (', сформировать локальный разгрузочный карман под головку M1 +' + String(gm.medialBunionPocketMm) + ' мм, полная ширина с HV ' + String(gm.effectiveForefootWidthWithBunionMm) + ' мм')
                      : ''}
                    ); по прямому взъёму —{' '}
                    <strong>{formatInstepModification(gm.instepBuildUpMm, false)}</strong>.
                  </div>
                  <div>
                    <strong>3. Положение апекса и оси сгиба:</strong> Сформировать{' '}
                    <strong>{gm.lastApexLabel}</strong> со смещением вершины мыска на{' '}
                    <strong>+{gm.toeBoxShiftMedialMm} мм</strong> к медиальной оси (косая линия
                    сгиба M1–M5 под углом <strong>{gm.metatarsalObliqueAngleDeg}°</strong>: M1 ={' '}
                    <strong>{gm.xApexM1Mm} мм</strong>, M5 = <strong>{gm.xApexM5Mm} мм</strong>).
                  </div>
                  <div>
                    <strong>4. Объём носочной части (Зелёная зона):</strong> Обеспечить высоту
                    носочной коробки <strong>{gm.toeBoxHeightMm} мм</strong> и свободный припуск
                    перед пальцами <strong>+{gm.toeFreeSpaceMm} мм</strong>.
                  </div>
                  <div>
                    <strong>5. Сборка ортопедической стельки:</strong> Изготовить стельку
                    твёрдостью <strong>{eng.rx.shoreA}</strong> (выкладка продольного свода{' '}
                    <strong>{eng.rx.archSupportHeightMm} мм</strong>, клин пятки{' '}
                    <strong>
                      +
                      {Math.max(eng.rx.medialHeelWedgeMm, eng.rx.lateralWedgeMm)} мм
                    </strong>
                    , пелот Зейца:{' '}
                    <strong>
                      {gm.requiresMetatarsalPad
                        ? ('высота ' + String(gm.metatarsalPadHeightMm) + ' мм на ' + String(gm.metatarsalPadPosMm) + ' мм от пятки')
                        : 'не требуется'}
                    </strong>
                    {gm.compensatoryInsoleHalfPairMm > 0
                      ? (', компенсационный вкладыш +' + String(gm.compensatoryInsoleHalfPairMm) + ' мм ' + String(shorterHalfPairTarget))
                      : ''}
                    ).
                  </div>
                  <div>
                    <strong>6. Сборка подошвы и каблука (строго по выбранному типу опоры):</strong>{' '}
                    {soleSpecLine}; установить {eng.rx.counterStiffness.toLowerCase()}.
                  </div>
                </div>
              </div>

              {/* Формулы и примечание о модельной оценке */}
              <div className={('p-3 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard) + ' space-y-2')}>
                <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#10B981] font-semibold">
                  МАТЕМАТИЧЕСКОЕ ОБОСНОВАНИЕ (ЕДИНЫЙ ИСТОЧНИК ГЕОМЕТРИИ)
                </div>
                {eng.rx.calculations.map((c, i) => (
                  <div key={i} className={('p-2 rounded-[8px] border ' + String(cLine) + ' text-[10px]')}>
                    <div className="font-semibold">{c.title}</div>
                    <div className="font-mono text-[#10B981]">
                      {c.formula} → {c.result}
                    </div>
                    <div className="opacity-80">{c.meaning}</div>
                  </div>
                ))}
                <div className="text-[9px] font-mono opacity-65 pt-1">
                  * Примечание: показатели пикового плантарного давления ({eng.peakForefootPressureKpa} кПа),
                  координаты центра давления COP ({eng.copLongitudinalMm} мм) и изгибающий момент геленка ({eng.shankBendingMomentNm} Н·м, σ ≈ {eng.shankEngineering.estimatedBendingStressMpa} МПа, запас прочности k ≈ {eng.shankEngineering.safetyFactor}) являются аналитическими модельными оценками и не заменяют аппаратную педобарографию.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* КНОПКИ ДЕЙСТВИЯ */}
        <div
          className={('p-3 border-t ' + String(cLine) + ' flex items-center gap-2 shrink-0 bg-[var(--color-surface)]')}
        >
          <button
            type="button"
            onClick={() => {
              void handleCopy()
            }}
            className="flex-1 py-2.5 rounded-[10px] font-mono text-[9px] uppercase tracking-wider bg-[#F59E0B] text-black font-semibold cursor-pointer border-none active:scale-98 transition-transform"
          >
            {copied
              ? '✓ ТЕХЗАДАНИЕ СКОПИРОВАНО'
              : copyError
                ? '⚠ ОШИБКА ДОСТУПА К БУФЕРУ ОБМЕНА'
                : '📋 СКОПИРОВАТЬ ТЕХЗАДАНИЕ МАСТЕРУ'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={('px-4 py-2.5 rounded-[10px] font-mono text-[9px] uppercase tracking-wider border ' + String(cLine) + ' bg-transparent ' + String(cText) + ' cursor-pointer')}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
