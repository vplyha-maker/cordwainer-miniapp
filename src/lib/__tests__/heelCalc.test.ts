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

type ProjectionTab = 'top_compare' | 'side_bottom_rear' | 'paired_and_shank' | 'steps_math'

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

  const gm = eng.geometryModel
  const pm = eng.pressureModel
  const se = eng.shankEngineering
  const val = eng.validation
  const prx = eng.rx.pairedRx

  const hvDeg = input.halluxValgusDeg ?? 0
  const asymMm = gm.lengthAsymmetryMm
  const leftLen = gm.leftFootLengthMm
  const rightLen = gm.rightFootLengthMm

  const longerSideText =
    gm.longerFootSide === 'left'
      ? 'Левая стопа длиннее на ' + String(asymMm) + ' мм'
      : gm.longerFootSide === 'right'
        ? 'Правая стопа длиннее на ' + String(asymMm) + ' мм'
        : 'Стопы равной длины (ΔL = 0 мм)'

  const shorterHalfPairTarget =
    gm.shorterFootSide === 'right'
      ? 'в ПРАВУЮ полупару'
      : gm.shorterFootSide === 'left'
        ? 'в ЛЕВУЮ полупару'
        : ''

  const xM1Svg = Math.round(40 + gm.uApexM1 * 230)
  const xM5Svg = Math.round(40 + gm.uApexM5 * 230)
  const xPelotteSvg = Math.round(40 + gm.uPelotte * 230)
  const apexZShiftPx = gm.toeBoxShiftMedialMm * 2.2
  const ballExpandPx = gm.ballRadialLayerMm * 2.4
  const bunionPocketPx = gm.medialBunionPocketMm * 2.0

  const soleSpecLine =
    gm.soleType === 'thomas'
      ? 'Ортопедический каблук Томаса: удлинение груди +' +
        String(gm.thomasExtensionMm) +
        ' мм (' +
        String(
          gm.thomasHeelType === 'medial'
            ? 'внутреннее / медиальное'
            : 'наружное / латеральное'
        ) +
        '), ' +
        String(se.profileLabel) +
        ' ' +
        String(gm.shankLengthMm) +
        '×' +
        String(gm.steelThicknessMm) +
        ' мм (σ ≈ ' +
        String(se.estimatedBendingStressMpa) +
        ' МПа, k_fat = ' +
        String(se.fatigueSafetyFactor) +
        ')'
      : gm.soleType === 'rocker'
        ? 'Рокерная перекатная подошва: угол переката ' +
          String(gm.rockerAngleDeg) +
          '°, линия старта переката ' +
          String(gm.rockerStartPct) +
          '% (' +
          String(gm.xBallMm) +
          ' мм), интегрированная карбоновая пластина ' +
          String(gm.carbonInsertThicknessMm) +
          ' мм'
        : 'Стандартный каблук: смещение оси набойки ' +
          String(
            gm.effectiveHeelTipOffsetMm >= 0
              ? '+' + String(gm.effectiveHeelTipOffsetMm)
              : gm.effectiveHeelTipOffsetMm
          ) +
          ' мм, ' +
          String(se.profileLabel) +
          ' ' +
          String(gm.shankLengthMm) +
          '×' +
          String(gm.steelThicknessMm) +
          ' мм (σ ≈ ' +
          String(se.estimatedBendingStressMpa) +
          ' МПа, k_fat = ' +
          String(se.fatigueSafetyFactor) +
          ')'

  const handleCopy = async () => {
    const ballText = formatBallModification(gm.ballBuildUpMm, false)
    const instepText = formatInstepModification(gm.instepBuildUpMm, false)
    const wedgeText =
      eng.rx.medialHeelWedgeMm > 0
        ? 'Внутренний (медиальный) клин пятки +' + String(eng.rx.medialHeelWedgeMm) + ' мм'
        : eng.rx.lateralWedgeMm > 0
          ? 'Наружный (латеральный) клин пятки +' + String(eng.rx.lateralWedgeMm) + ' мм'
          : 'Без клина пятки (0 мм)'

    const compInsoleText =
      gm.compensatoryInsoleHalfPairMm > 0
        ? 'Установить компенсационную полустельку/вкладыш +' +
          String(gm.compensatoryInsoleHalfPairMm) +
          ' мм ' +
          String(shorterHalfPairTarget)
        : 'Компенсационная полустелька не требуется (ΔL ≤ 3 мм)'

    const text = [
      'ИНДИВИДУАЛЬНОЕ ТЕХНИЧЕСКОЕ ЗАДАНИЕ МАСТЕРУ ОБУВНОГО ПРОИЗВОДСТВА',
      '================================================================',
      '• Профиль клиента: ' +
        String(input.gender === 'male' ? 'Мужской' : 'Женский') +
        ', Размер ' +
        String(input.shoeSize) +
        ' EU, Вес ' +
        String(input.weightKg) +
        ' кг',
      '• Длины стоп и асимметрия: Левая = ' +
        String(leftLen) +
        ' мм, Правая = ' +
        String(rightLen) +
        ' мм (' +
        String(longerSideText) +
        '). ' +
        String(compInsoleText),
      '• Длина и полнота колодки: След L_last = ' +
        String(gm.lastLengthMm) +
        ' мм (опорная стопа ' +
        String(gm.footLengthMm) +
        ' мм + свободный припуск ' +
        String(gm.toeFreeSpaceMm) +
        ' мм + фасонный припуск ' +
        String(gm.fashionAllowanceMm) +
        ' мм), Полнота = ' +
        String(eng.rx.widthCode),
      '• Геометрия мыска и апекса: ' +
        String(gm.lastApexLabel) +
        ', смещение вершины мыска +' +
        String(gm.toeBoxShiftMedialMm) +
        ' мм к медиальной оси, высота носочной коробки H = ' +
        String(gm.toeBoxHeightMm) +
        ' мм',
      '• Модификация колодки по обхватам (Жёлтая зона):',
      '  - Пучки (Oп = ' +
        String(input.ballGirthMm) +
        ' мм): ' +
        String(ballText) +
        ' (ширина следа ' +
        String(gm.forefootWidthMm) +
        ' мм vs база ' +
        String(gm.standardForefootWidthMm) +
        ' мм)',
      '  - Карман под Hallux Valgus (HV = ' +
        String(hvDeg) +
        '°): ' +
        String(
          gm.medialBunionPocketMm > 0
            ? 'сформировать локальный медиальный карман на головке M1 +' +
                String(gm.medialBunionPocketMm) +
                ' мм (ширина с учётом HV = ' +
                String(gm.effectiveForefootWidthWithBunionMm) +
                ' мм)'
            : 'не требуется (0 мм)'
        ),
      '  - Прямой взъём (Oв = ' + String(input.instepGirthMm) + ' мм): ' + String(instepText),
      '• ПОЛУПАРНАЯ СПЕЦИФИКАЦИЯ (ЛЕВАЯ L / ПРАВАЯ R):',
      '  [ЛЕВАЯ L]: Стопа ' +
        String(prx.left.footLengthMm) +
        ' мм, След ' +
        String(prx.left.lastLengthMm) +
        ' мм, Полнота ' +
        String(prx.left.widthCode) +
        ', Пучки ΔOп=' +
        String(prx.left.ballBuildUpMm) +
        ' мм (слой ' +
        String(prx.left.ballRadialLayerMm) +
        ' мм), Взъём ΔOв=' +
        String(prx.left.instepBuildUpMm) +
        ' мм, HV +' +
        String(prx.left.medialBunionPocketMm) +
        ' мм, Стелька: свод ' +
        String(prx.left.archSupportHeightMm) +
        ' мм, клин +' +
        String(Math.max(prx.left.medialHeelWedgeMm, prx.left.lateralWedgeMm)) +
        ' мм, вкладыш +' +
        String(prx.left.compensatoryInsoleMm) +
        ' мм',
      '  [ПРАВАЯ R]: Стопа ' +
        String(prx.right.footLengthMm) +
        ' мм, След ' +
        String(prx.right.lastLengthMm) +
        ' мм, Полнота ' +
        String(prx.right.widthCode) +
        ', Пучки ΔOп=' +
        String(prx.right.ballBuildUpMm) +
        ' мм (слой ' +
        String(prx.right.ballRadialLayerMm) +
        ' мм), Взъём ΔOв=' +
        String(prx.right.instepBuildUpMm) +
        ' мм, HV +' +
        String(prx.right.medialBunionPocketMm) +
        ' мм, Стелька: свод ' +
        String(prx.right.archSupportHeightMm) +
        ' мм, клин +' +
        String(Math.max(prx.right.medialHeelWedgeMm, prx.right.lateralWedgeMm)) +
        ' мм, вкладыш +' +
        String(prx.right.compensatoryInsoleMm) +
        ' мм',
      '• Конструкция подошвы и геленка (10^6 циклов): Drop = ' +
        String(gm.netRiseMm) +
        ' мм (H = ' +
        String(gm.heelHeightMm) +
        ' / T = ' +
        String(gm.toeThicknessMm) +
        ' мм, уклон ' +
        String(eng.internalSlope.toFixed(1)) +
        '°). ' +
        String(soleSpecLine) +
        '. ' +
        String(se.fatigueLifeStatus),
      '• Ортопедическая стелька и фурнитура: ' +
        String(eng.rx.shoreA) +
        ', выкладка свода ' +
        String(eng.rx.archSupportHeightMm) +
        ' мм, ' +
        String(wedgeText) +
        ', пелот Зейца: ' +
        String(
          gm.requiresMetatarsalPad
            ? 'высота ' +
                String(gm.metatarsalPadHeightMm) +
                ' мм на расстоянии ' +
                String(gm.metatarsalPadPosMm) +
                ' мм от пятки (разгрузка M2–M3 на −' +
                String(pm.pelotteReliefKpa) +
                ' кПа)'
            : 'не требуется'
        ) +
        ', задник: ' +
        String(eng.rx.counterStiffness),
      '• 2D-педобарография M1–M5 (модельная оценка): M1=' +
        String(pm.kpaM1) +
        ', M2=' +
        String(pm.kpaM2) +
        ', M3=' +
        String(pm.kpaM3) +
        ', M4=' +
        String(pm.kpaM4) +
        ', M5=' +
        String(pm.kpaM5) +
        ' кПа (доминирующий луч ' +
        String(pm.dominantMetatarsalRay) +
        '), Пятка Мед/Лат=' +
        String(pm.kpaHeelMedial) +
        '/' +
        String(pm.kpaHeelLateral) +
        ' кПа',
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
        className={
          'w-full max-w-[560px] max-h-[95dvh] flex flex-col rounded-t-[20px] sm:rounded-[18px] border ' +
          String(cLine) +
          ' ' +
          String(cBg) +
          ' ' +
          String(cText) +
          ' shadow-2xl overflow-hidden'
        }
      >
        {/* 1. ШАПКА МОДАЛЬНОГО ОКНА */}
        <div
          className={
            'px-4 py-3 border-b ' +
            String(cLine) +
            ' flex items-center justify-between shrink-0 bg-[var(--color-surface)]'
          }
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
          className={
            'px-3.5 py-1.5 border-b ' +
            String(cLine) +
            ' grid grid-cols-2 sm:grid-cols-4 gap-1 text-[8px] font-mono shrink-0 bg-black/20'
          }
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

        {/* ПЕРЕКЛЮЧАТЕЛЬ ЧЕРТЁЖНЫХ ЛИСТОВ МАСТЕРА (4 ВКЛАДКИ) */}
        <div className="px-3.5 pt-2 shrink-0">
          <div
            className={
              'grid grid-cols-4 gap-1 p-1 rounded-[10px] border ' +
              String(cLine) +
              ' ' +
              String(cCard)
            }
          >
            {(
              [
                { id: 'top_compare', label: '1. СВЕРХУ' },
                { id: 'side_bottom_rear', label: '2. ПРОЕКЦИИ' },
                { id: 'paired_and_shank', label: '3. L/R & 65Г' },
                { id: 'steps_math', label: '4. ВАЛИДАЦИЯ' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setProjTab(tab.id)}
                className={
                  'py-1.5 rounded-[7px] text-[7.5px] font-mono uppercase tracking-wider cursor-pointer border-none transition-all ' +
                  String(
                    projTab === tab.id
                      ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold'
                      : 'bg-transparent text-[var(--color-ink)] opacity-60'
                  )
                }
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
            className={
              'p-3 rounded-[12px] border ' +
              String(cLine) +
              ' ' +
              String(cCard) +
              ' grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px]'
            }
          >
            <div>
              • <strong>Стопы (Лев/Прав):</strong> {leftLen} / {rightLen} мм (
              {gm.longerFootSide === 'equal'
                ? 'L = R'
                : gm.longerFootSide === 'left'
                  ? 'Лев +' + String(asymMm) + ' мм'
                  : 'Прав +' + String(asymMm) + ' мм'}
              )
            </div>
            <div>
              • <strong>След колодки:</strong> {gm.lastLengthMm} мм ({eng.rx.widthCode})
            </div>
            <div>
              • <strong>Ширина пучков:</strong> {gm.forefootWidthMm} мм (база{' '}
              {gm.standardForefootWidthMm} мм
              {gm.medialBunionPocketMm > 0
                ? ', с HV: ' + String(gm.effectiveForefootWidthWithBunionMm) + ' мм'
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
              • <strong>Слой доработки:</strong> Пучки{' '}
              {gm.ballRadialLayerMm >= 0
                ? '+' + String(gm.ballRadialLayerMm)
                : gm.ballRadialLayerMm}{' '}
              мм (ΔOп {gm.ballBuildUpMm >= 0 ? '+' + String(gm.ballBuildUpMm) : gm.ballBuildUpMm}
              мм) · Взъём{' '}
              {gm.instepRadialLayerMm >= 0
                ? '+' + String(gm.instepRadialLayerMm)
                : gm.instepRadialLayerMm}{' '}
              мм
            </div>
            <div className="text-[#10B981] font-medium">
              • <strong>Припуск мыска:</strong> +{gm.toeFreeSpaceMm} мм · Высота{' '}
              {gm.toeBoxHeightMm} мм
              {gm.compensatoryInsoleHalfPairMm > 0
                ? ' · Полустелька +' + String(gm.compensatoryInsoleHalfPairMm) + ' мм'
                : ''}
            </div>
          </div>

          {/* ЛИСТ 1: ПРОЕКЦИЯ СВЕРХУ (ДО / ПОСЛЕ) + СХЕМА АПЕКСОВ */}
          {projTab === 'top_compare' && (
            <div className="space-y-3">
              <div className={'p-3 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard)}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[8.5px] uppercase tracking-wider font-semibold">
                    ПРОЕКЦИЯ 1 & 5: ВИД СВЕРХУ — «СТАНДАРТНАЯ vs ИНДИВИДУАЛЬНАЯ КОЛОДКА»
                  </span>
                  <span className="font-mono text-[8px] opacity-60">МАСШТАБ CAD // ММ</span>
                </div>

                <svg viewBox="0 0 320 155" className="w-full h-auto overflow-visible">
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

                  <path
                    d="M 40 78 C 40 52, 85 52, 130 55 C 165 56, 195 44, 225 48 C 258 53, 278 65, 282 78 C 278 91, 258 103, 225 108 C 195 112, 165 100, 130 101 C 85 104, 40 104, 40 78 Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.45"
                  />

                  {(gm.ballBuildUpMm !== 0 || bunionPocketPx > 0) && (
                    <path
                      d={
                        'M 165 52 Q ' +
                        String(xM1Svg) +
                        ' ' +
                        String(36 - Math.max(-8, ballExpandPx) - bunionPocketPx) +
                        ', 248 ' +
                        String(54 - apexZShiftPx) +
                        ' L 245 58 Q ' +
                        String(xM1Svg) +
                        ' 45, 165 54 Z'
                      }
                      fill={gm.ballBuildUpMm >= 0 || bunionPocketPx > 0 ? '#F59E0B' : '#3186FF'}
                      fillOpacity="0.36"
                      stroke={gm.ballBuildUpMm >= 0 || bunionPocketPx > 0 ? '#F59E0B' : '#3186FF'}
                      strokeWidth="1.2"
                      strokeDasharray={
                        gm.ballBuildUpMm < 0 && bunionPocketPx === 0 ? '2 2' : undefined
                      }
                    />
                  )}

                  <path
                    d={
                      'M 258 ' +
                      String(57 - apexZShiftPx * 0.6) +
                      ' Q 290 ' +
                      String(60 - apexZShiftPx) +
                      ', 292 ' +
                      String(76 - apexZShiftPx) +
                      ' Q 290 ' +
                      String(92 - apexZShiftPx * 0.4) +
                      ', 258 97 L 250 92 Q 275 ' +
                      String(76 - apexZShiftPx * 0.7) +
                      ', 250 62 Z'
                    }
                    fill="#10B981"
                    fillOpacity="0.32"
                    stroke="#10B981"
                    strokeWidth="1.1"
                  />

                  <path
                    d={
                      'M 40 78 C 40 52, 85 52, 130 54 C 165 54, ' +
                      String(xM1Svg - 10) +
                      ' ' +
                      String(42 - ballExpandPx - bunionPocketPx) +
                      ', 228 ' +
                      String(46 - ballExpandPx * 0.6 - apexZShiftPx * 0.5) +
                      ' C 262 ' +
                      String(50 - apexZShiftPx) +
                      ', 288 ' +
                      String(62 - apexZShiftPx) +
                      ', 292 ' +
                      String(76 - apexZShiftPx) +
                      ' C 288 ' +
                      String(92 - apexZShiftPx * 0.4) +
                      ', 260 ' +
                      String(104 + ballExpandPx * 0.5) +
                      ', 222 ' +
                      String(110 + ballExpandPx * 0.8) +
                      ' C 190 ' +
                      String(114 + ballExpandPx) +
                      ', 162 101, 130 101 C 85 104, 40 104, 40 78 Z'
                    }
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="1.6"
                  />

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

                  <circle
                    cx="268"
                    cy={78 - gm.anatomicalFootApexOffsetMm * 1.6}
                    r="3"
                    fill="#3186FF"
                  />
                  <circle cx="292" cy={76 - apexZShiftPx} r="3.5" fill="#F59E0B" />

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

                  <text
                    x={Math.max(105, xM1Svg - 32)}
                    y="24"
                    fill="#F59E0B"
                    fontSize="6.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    Слой пучков {gm.ballRadialLayerMm >= 0 ? '+' + String(gm.ballRadialLayerMm) : gm.ballRadialLayerMm}мм
                    {gm.medialBunionPocketMm > 0
                      ? ' · HV +' + String(gm.medialBunionPocketMm) + 'мм'
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

              {/* 2D ПЕДОБАРОГРАФИЯ ПО ГОЛОВКАМ M1–M5 */}
              <div className={'p-3 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard)}>
                <div className="font-mono text-[8px] uppercase tracking-wider text-[#E11D48] font-semibold mb-1.5">
                  2D ГАУССОВО ПОЛЕ ПЕДОБАРОГРАФИИ (РАСПРЕДЕЛЕНИЕ ПО ГОЛОВКАМ M1–M5, МОД.)
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center text-[9.5px]">
                  {(
                    [
                      { ray: 'M1', kpa: pm.kpaM1 },
                      { ray: 'M2', kpa: pm.kpaM2 },
                      { ray: 'M3', kpa: pm.kpaM3 },
                      { ray: 'M4', kpa: pm.kpaM4 },
                      { ray: 'M5', kpa: pm.kpaM5 },
                    ] as const
                  ).map((item) => {
                    const isDom = pm.dominantMetatarsalRay === item.ray
                    const isHigh = item.kpa >= 245
                    return (
                      <div
                        key={item.ray}
                        className={
                          'p-1.5 rounded-[8px] border ' +
                          String(
                            isHigh
                              ? 'border-[#E11D48] bg-[#E11D48]/15'
                              : isDom
                                ? 'border-[#F59E0B] bg-[#F59E0B]/10'
                                : cLine
                          )
                        }
                      >
                        <div className="font-mono text-[8px] font-bold">{item.ray}</div>
                        <div className="font-serif text-[13px] font-semibold">{item.kpa}</div>
                        <div className="text-[7.5px] opacity-70">кПа</div>
                      </div>
                    )
                  })}
                </div>
                <div className="text-[9.5px] opacity-80 mt-1.5">
                  Доминирующий луч: <strong>{pm.dominantMetatarsalRay}</strong> · Средний отдел:{' '}
                  <strong>{pm.kpaMidfoot} кПа</strong> · Пятка (Мед/Лат):{' '}
                  <strong>
                    {pm.kpaHeelMedial} / {pm.kpaHeelLateral} кПа
                  </strong>
                  {pm.pelotteReliefKpa > 0
                    ? ' · Разгрузка M2–M3 пелотом Зейца: −' + String(pm.pelotteReliefKpa) + ' кПа'
                    : ''}
                </div>
              </div>
            </div>
          )}

          {/* ЛИСТ 2: ПРОЕКЦИИ СБОКУ, СЗАДИ И СНИЗУ */}
          {projTab === 'side_bottom_rear' && (
            <div className="space-y-3">
              <div className={'p-3 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard)}>
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
                      d={
                        'M 42 68 L ' +
                        String(gm.soleType === 'thomas' ? 112 : 95) +
                        ' 68 L ' +
                        String(gm.soleType === 'thomas' ? 112 : 95) +
                        ' 96 L 44 96 Z'
                      }
                      fill={gm.soleType === 'thomas' ? '#10B981' : 'currentColor'}
                      fillOpacity="0.45"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  )}
                  <path
                    d="M 42 68 C 95 68, 145 88, 195 88 L 285 82 L 285 90 L 195 96 C 145 96, 95 74, 42 74 Z"
                    fill="#3186FF"
                    fillOpacity="0.25"
                    stroke="#3186FF"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M 42 68 Q 38 35, 52 22 L 135 24 Q 175 42, 210 66 Q 255 68, 285 82"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeDasharray="3 2"
                    opacity="0.6"
                  />
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
                    x="105"
                    y="15"
                    fill={gm.instepBuildUpMm < 0 ? '#3186FF' : '#F59E0B'}
                    fontSize="6.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    ВЗЪЁМ: {formatInstepModification(gm.instepBuildUpMm, true)}
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

              <div className="grid grid-cols-2 gap-2.5">
                <div className={'p-2.5 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard)}>
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

                <div className={'p-2.5 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard)}>
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

          {/* ЛИСТ 3: ДВУХКОЛОНОЧНОЕ ТЗ (ЛЕВАЯ / ПРАВАЯ ПОЛУПАРА) + РАСЧЁТ ГЕЛЕНКА 65Г (10^6 ЦИКЛОВ) */}
          {projTab === 'paired_and_shank' && (
            <div className="space-y-3">
              <div className={'p-3 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard)}>
                <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#10B981] font-semibold mb-2">
                  ДВУХКОЛОНОЧНОЕ ТЗ МАСТЕРУ: ЛЕВАЯ ПОЛУПАРА (L) vs ПРАВАЯ ПОЛУПАРА (R)
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-[10px]">
                  {([prx.left, prx.right] as const).map((sp) => (
                    <div
                      key={sp.side}
                      className={'p-2.5 rounded-[10px] border space-y-1 ' + String(cLine)}
                    >
                      <div className="font-mono text-[8.5px] font-bold text-[#F59E0B] uppercase">
                        {sp.sideLabel}
                      </div>
                      <div>
                        • <strong>Стопа / След:</strong> {sp.footLengthMm} / {sp.lastLengthMm} мм
                      </div>
                      <div>
                        • <strong>Полнота / Ширина:</strong> {sp.widthCode} ({sp.forefootWidthMm} мм)
                      </div>
                      <div>
                        • <strong>Пучки (Oп={sp.ballGirthMm}):</strong> ΔOп{' '}
                        {sp.ballBuildUpMm >= 0 ? '+' + String(sp.ballBuildUpMm) : sp.ballBuildUpMm} мм
                        (слой{' '}
                        {sp.ballRadialLayerMm >= 0
                          ? '+' + String(sp.ballRadialLayerMm)
                          : sp.ballRadialLayerMm}{' '}
                        мм)
                      </div>
                      <div>
                        • <strong>Взъём (Oв={sp.instepGirthMm}):</strong> ΔOв{' '}
                        {sp.instepBuildUpMm >= 0
                          ? '+' + String(sp.instepBuildUpMm)
                          : sp.instepBuildUpMm}{' '}
                        мм (слой{' '}
                        {sp.instepRadialLayerMm >= 0
                          ? '+' + String(sp.instepRadialLayerMm)
                          : sp.instepRadialLayerMm}{' '}
                        мм)
                      </div>
                      <div>
                        • <strong>HV ({sp.halluxValgusDeg}°):</strong> Карман M1 +
                        {sp.medialBunionPocketMm} мм · Сдвиг апекса +{sp.toeBoxShiftMedialMm} мм
                      </div>
                      <div>
                        • <strong>Завал ({sp.pronationDeg}°):</strong> Свод {sp.archSupportHeightMm}{' '}
                        мм · Клин +{Math.max(sp.medialHeelWedgeMm, sp.lateralWedgeMm)} мм
                      </div>
                      <div>
                        • <strong>Вкладыш длины:</strong>{' '}
                        {sp.compensatoryInsoleMm > 0
                          ? 'Полустелька +' + String(sp.compensatoryInsoleMm) + ' мм'
                          : 'Не требуется (0 мм)'}
                      </div>
                      <div>
                        • <strong>Пик ({sp.dominantRay}):</strong> {sp.peakForefootPressureKpa} кПа
                        {sp.requiresMetatarsalPad
                          ? ' · Пелот ' + String(sp.metatarsalPadHeightMm) + 'мм'
                          : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ПРОЧНОСТНОЙ РАСЧЁТ СОСТАВНОГО СЕЧЕНИЯ ГЕЛЕНКА (БАЛКА НА УПРУГОМ ОСНОВАНИИ ВИНКЛЕРА) */}
              <div
                className={
                  'p-3 rounded-[12px] border space-y-1.5 text-[10px] ' +
                  String(cLine) +
                  ' ' +
                  String(cCard)
                }
              >
                <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#F59E0B] font-semibold">
                  РАСЧЁТ ГЕЛЕНКА: СОСТАВНОЕ СЕЧЕНИЕ НА УПРУГОМ ОСНОВАНИИ (10^6 ЦИКЛОВ ШАГА)
                </div>
                <div>
                  • <strong>Профиль и сечение:</strong> {se.profileLabel} ({se.shankLengthMm}×
                  {se.shankWidthMm}×{se.steelThicknessMm} мм
                  {se.ribDepthMm > 0 ? ', гофр ' + String(se.ribDepthMm) + ' мм' : ''}), W_x ={' '}
                  <strong>{se.sectionModulusMm3} мм³</strong>
                </div>
                <div>
                  • <strong>Распределение момента свода ({se.bendingMomentNm} Н·м):</strong> разгрузка
                  упругим основанием Винклера (свод + Томас) ={' '}
                  <strong>−{se.winklerFoundationReliefPct}%</strong>; доля жесткости геленка в
                  пакете со стелькой = <strong>{se.compositeShankLoadSharePct}%</strong> (чистый
                  момент на геленок = <strong>{se.netShankMomentNm} Н·м</strong>)
                </div>
                <div>
                  • <strong>Напряжение и циклическая стойкость:</strong> σ_max ≈{' '}
                  <strong>{se.estimatedBendingStressMpa} МПа</strong> (предел выносливости 10^6
                  циклов = {se.fatigueLimit1e6Mpa} МПа, статический запас k_ст ={' '}
                  <strong>{se.safetyFactor}</strong>, усталостный запас k_fat ={' '}
                  <strong>{se.fatigueSafetyFactor}</strong>)
                </div>
                <div
                  className={
                    'font-mono text-[9px] font-semibold ' +
                    String(se.fatigueSafetyFactor >= 1.0 ? 'text-[#10B981]' : 'text-[#E11D48]')
                  }
                >
                  ▸ {se.fatigueLifeStatus}
                </div>
              </div>
            </div>
          )}

          {/* ЛИСТ 4: ВАЛИДАЦИЯ ГЕОМЕТРИИ КОЛОДКИ, ЧЕК-ЛИСТ 1–6 И ФОРМУЛЫ */}
          {projTab === 'steps_math' && (
            <div className="space-y-3">
              {/* СПЕЦИАЛИЗИРОВАННАЯ ВАЛИДАЦИЯ ГЕОМЕТРИИ И КЛИНИЧЕСКИХ ЭВРИСТИК */}
              <div
                className={
                  'p-3 rounded-[12px] border space-y-2 ' + String(cLine) + ' ' + String(cCard)
                }
              >
                <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#3186FF] font-semibold">
                  ИНЖЕНЕРНАЯ ВАЛИДАЦИЯ ГЕОМЕТРИИ КОЛОДКИ И КЛИНИЧЕСКИХ ПРАВИЛ
                </div>
                <div className="space-y-1 text-[9.5px]">
                  {[
                    ...val.invariants,
                    ...val.criticalChecks,
                    ...val.allowanceRules,
                    ...val.clinicalHeuristics,
                  ].map((rule) => (
                    <div
                      key={rule.code}
                      className={
                        'p-1.5 rounded-[7px] border flex items-start gap-1.5 ' +
                        String(
                          rule.passed
                            ? cLine
                            : rule.severity === 'ERROR'
                              ? 'border-[#E11D48] bg-[#E11D48]/10'
                              : 'border-[#F59E0B] bg-[#F59E0B]/10'
                        )
                      }
                    >
                      <span
                        className={
                          'font-mono font-bold shrink-0 ' +
                          String(
                            rule.passed
                              ? 'text-[#10B981]'
                              : rule.severity === 'ERROR'
                                ? 'text-[#E11D48]'
                                : 'text-[#F59E0B]'
                          )
                        }
                      >
                        {rule.passed ? '✓' : rule.severity === 'ERROR' ? '✕' : '⚠'}
                      </span>
                      <div>
                        <div className="font-semibold">{rule.title}</div>
                        <div className="opacity-80">{rule.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Формулы */}
              <div
                className={
                  'p-3 rounded-[12px] border space-y-2 ' + String(cLine) + ' ' + String(cCard)
                }
              >
                <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#10B981] font-semibold">
                  МАТЕМАТИЧЕСКОЕ ОБОСНОВАНИЕ (ЕДИНЫЙ ИСТОЧНИК ГЕОМЕТРИИ)
                </div>
                {eng.rx.calculations.map((c, i) => (
                  <div key={i} className={'p-2 rounded-[8px] border text-[10px] ' + String(cLine)}>
                    <div className="font-semibold">{c.title}</div>
                    <div className="font-mono text-[#10B981]">
                      {c.formula} → {c.result}
                    </div>
                    <div className="opacity-80">{c.meaning}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* КНОПКИ ДЕЙСТВИЯ */}
        <div
          className={
            'p-3 border-t ' +
            String(cLine) +
            ' flex items-center gap-2 shrink-0 bg-[var(--color-surface)]'
          }
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
                : '📋 СКОПИРОВАТЬ ТЕХЗАДАНИЕ МАСТЕРУ (С L/R)'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={
              'px-4 py-2.5 rounded-[10px] font-mono text-[9px] uppercase tracking-wider border ' +
              String(cLine) +
              ' bg-transparent ' +
              String(cText) +
              ' cursor-pointer'
            }
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
