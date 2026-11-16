// src/components/heel/OrthoExpertReportModal.tsx
import React, { useState } from 'react'
import {
  formatBallModification,
  formatInstepModification,
  type HeelInput,
  type HeelEngineering,
} from '../../lib/heelCalc'
import { buildTopPlanProjection } from '../../lib/heelGeometry'

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
  const levels = eng.rx.structuredLevels

  // Размерно-согласованная проекция вида сверху непосредственно из LastGeometryModel (исправление 5.1, 5.2, 5.3)
  const topProj = buildTopPlanProjection(gm)

  const hvDeg =
    input.independentSides && input.activeSide === 'right' && input.rightProfile
      ? input.rightProfile.halluxValgusDeg
      : input.independentSides && input.activeSide === 'left' && input.leftProfile
        ? input.leftProfile.halluxValgusDeg
        : (input.halluxValgusDeg ?? 0)
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
        ? 'Рокерная перекатная подошва [' +
          String(gm.rockerClinicalLabel) +
          ']: угол переката ' +
          String(gm.rockerAngleDeg) +
          '°, линия старта переката ' +
          String(gm.rockerStartPct) +
          '% (' +
          String(gm.xBallMm) +
          ' мм), ' +
          String(se.profileLabel) +
          ' (σ ≈ ' +
          String(se.estimatedBendingStressMpa) +
          ' МПа, k_fat = ' +
          String(se.fatigueSafetyFactor) +
          ')'
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
      '• АКТИВНЫЙ ПРОФИЛЬ ОСНОВНОЙ СЦЕНЫ: ' + String(gm.activeSceneProfileLabel),
      '',
      'I. АНТРОПОМЕТРИЯ (ИСХОДНЫЕ ДАННЫЕ СТОПЫ):',
      '• Профиль клиента: ' +
        String(input.gender === 'male' ? 'Мужской' : 'Женский') +
        ', Размер ' +
        String(input.shoeSize) +
        ' EU, Вес ' +
        String(input.weightKg) +
        ' кг (' +
        String(gm.isAnthropometryMeasured ? 'прямой обмер' : 'расчёт по размеру EU') +
        ')',
      '• Длины стоп и асимметрия: Левая = ' +
        String(leftLen) +
        ' мм, Правая = ' +
        String(rightLen) +
        ' мм (' +
        String(longerSideText) +
        '). ' +
        String(compInsoleText),
      '',
      'II. ИНЖЕНЕРНАЯ СПЕЦИФИКАЦИЯ (ГЕОМЕТРИЯ КОЛОДКИ И КОНСТРУКЦИЯ ПОДОШВЫ):',
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
      ' - Пучки (Oп = ' +
        String(input.ballGirthMm) +
        ' мм): ' +
        String(ballText) +
        ' (ширина следа ' +
        String(gm.forefootWidthMm) +
        ' мм vs база ' +
        String(gm.standardForefootWidthMm) +
        ' мм, пятка ' +
        String(gm.heelWidthMm) +
        ' мм)',
      ' - Карман под Hallux Valgus (HV = ' +
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
      ' - Прямой взъём (Oв = ' + String(input.instepGirthMm) + ' мм): ' + String(instepText),
      '• ПОЛУПАРНАЯ СПЕЦИФИКАЦИЯ (ЛЕВАЯ L / ПРАВАЯ R):',
      ' [ЛЕВАЯ L]: Стопа ' +
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
        ' мм, Пик (' +
        String(prx.left.dominantRay) +
        ')=' +
        String(prx.left.peakForefootPressureKpa) +
        ' кПа',
      ' [ПРАВАЯ R]: Стопа ' +
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
        ' мм, Пик (' +
        String(prx.right.dominantRay) +
        ')=' +
        String(prx.right.peakForefootPressureKpa) +
        ' кПа',
      '• Конструкция подошвы и силового элемента (10^6 циклов): Drop = ' +
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
      '',
      'III. КЛИНИЧЕСКИЕ И ЭРГОНОМИЧЕСКИЕ РЕКОМЕНДАЦИИ (ТРЕБУЮТ ПОДТВЕРЖДЕНИЯ СПЕЦИАЛИСТОМ):',
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
      '• Нормированная биомеханическая эвристика давления M1–M5 (расчётная оценка без датчиков): M1=' +
        String(pm.kpaM1) +
        ' (' +
        String(pm.rayForcesN.M1) +
        'Н), M2=' +
        String(pm.kpaM2) +
        ' (' +
        String(pm.rayForcesN.M2) +
        'Н), M3=' +
        String(pm.kpaM3) +
        ' (' +
        String(pm.rayForcesN.M3) +
        'Н), M4=' +
        String(pm.kpaM4) +
        ' (' +
        String(pm.rayForcesN.M4) +
        'Н), M5=' +
        String(pm.kpaM5) +
        ' (' +
        String(pm.rayForcesN.M5) +
        'Н) кПа (доминирующий луч ' +
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
        {/* 1. ШАПКА МОДАЛЬНОГО ОКНА С ЯВНОЙ МАРКИРОВКОЙ АКТИВНОГО ПРОФИЛЯ ОСНОВНОЙ СЦЕНЫ */}
        <div
          className={
            'px-4 py-3 border-b ' +
            String(cLine) +
            ' flex items-center justify-between shrink-0 bg-[var(--color-surface)]'
          }
        >
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#F59E0B] font-semibold">
              ТЕХЛИСТ КОЛОДОЧНИКА // СЦЕНА: {gm.activeSceneProfileLabel}
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
            КРАСНЫЙ: Давление (эврист.)
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
                { id: 'paired_and_shank', label: '3. L/R & ПРОЧНОСТЬ' },
                { id: 'steps_math', label: '4. 3 УРОВНЯ & ВАЛИД.' },
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
            <div className="col-span-2 font-mono text-[8.5px] text-[#3186FF] pb-0.5 border-b border-[var(--color-border)]/40">
              ▸ АКТИВНЫЙ ПРОФИЛЬ ОСНОВНОЙ СЦЕНЫ: <strong>{gm.activeSceneProfileLabel}</strong>
            </div>
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
              • <strong>Ширина пучков/пятки:</strong> {gm.forefootWidthMm} / {gm.heelWidthMm} мм (база{' '}
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

          {/* ЛИСТ 1: ПРОЕКЦИЯ СВЕРХУ (ДО / ПОСЛЕ) + НОРМИРОВАННАЯ ЭВРИСТИКА ДАВЛЕНИЯ */}
          {projTab === 'top_compare' && (
            <div className="space-y-3">
              <div className={'p-3 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard)}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[8.5px] uppercase tracking-wider font-semibold">
                    ПРОЕКЦИЯ 1: ВИД СВЕРХУ — «БАЗОВАЯ vs ИНДИВИДУАЛЬНАЯ КОЛОДКА»
                  </span>
                  <span className="font-mono text-[7.5px] opacity-65">
                    ИНЖЕНЕРНАЯ СХЕМА (ММ · НЕ CAD-ЛЕКАЛО)
                  </span>
                </div>

                <svg viewBox="0 0 320 155" className="w-full h-auto overflow-visible">
                  <line
                    x1="25"
                    y1={topProj.centerY}
                    x2="295"
                    y2={topProj.centerY}
                    stroke="#3186FF"
                    strokeWidth="0.8"
                    strokeDasharray="4 3"
                    opacity="0.55"
                  />
                  <text x="296" y={topProj.centerY + 2} fill="#3186FF" fontSize="6.5" fontFamily="monospace">
                    ОСЬ 0°
                  </text>

                  {/* Стандартный контур базовой колодки из LastGeometryModel */}
                  <path
                    d={topProj.standardContourPath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.45"
                  />

                  {/* Зона модификации пучков и кармана HV */}
                  {(gm.ballBuildUpMm !== 0 || gm.medialBunionPocketMm > 0) && (
                    <path
                      d={topProj.buildUpZonePath}
                      fill={gm.ballBuildUpMm >= 0 || gm.medialBunionPocketMm > 0 ? '#F59E0B' : '#3186FF'}
                      fillOpacity="0.34"
                      stroke={gm.ballBuildUpMm >= 0 || gm.medialBunionPocketMm > 0 ? '#F59E0B' : '#3186FF'}
                      strokeWidth="1.2"
                      strokeDasharray={
                        gm.ballBuildUpMm < 0 && gm.medialBunionPocketMm === 0 ? '2 2' : undefined
                      }
                    />
                  )}

                  {/* Зелёная зона свободного носочного припуска перед пальцами */}
                  <path
                    d={topProj.toeFreeSpaceZonePath}
                    fill="#10B981"
                    fillOpacity="0.3"
                    stroke="#10B981"
                    strokeWidth="1.1"
                  />

                  {/* Индивидуальный контур колодки (с учётом формы пальцев, полноты и кармана HV) */}
                  <path
                    d={topProj.customContourPath}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="1.6"
                  />

                  {/* Пятна контакта M1 и M5 */}
                  <ellipse
                    cx={topProj.xApexM1}
                    cy={topProj.yM1 + 7}
                    rx={10 + gm.medialBunionPocketMm * 0.4}
                    ry={5.5 + gm.medialBunionPocketMm * 0.22}
                    fill="#E11D48"
                    fillOpacity="0.38"
                    stroke="#E11D48"
                    strokeWidth="1"
                  />
                  <ellipse
                    cx={topProj.xApexM5}
                    cy={topProj.yM5 - 6}
                    rx="8.5"
                    ry="4.8"
                    fill="#E11D48"
                    fillOpacity="0.28"
                    stroke="#E11D48"
                    strokeWidth="0.9"
                  />

                  {/* Косая метатарзальная линия сгиба M1–M5 */}
                  <line
                    x1={topProj.xApexM5}
                    y1={topProj.yM5 - 6}
                    x2={topProj.xApexM1}
                    y2={topProj.yM1 + 7}
                    stroke="#3186FF"
                    strokeWidth="1.4"
                  />
                  <circle cx={topProj.xApexM1} cy={topProj.yM1 + 7} r="3" fill="#3186FF" />
                  <circle cx={topProj.xApexM5} cy={topProj.yM5 - 6} r="3" fill="#3186FF" />

                  {/* Вершина стопы vs апекс колодки */}
                  <circle cx={topProj.xFootTip} cy={topProj.yFootApex} r="3" fill="#3186FF" />
                  <circle cx={topProj.xLastToe} cy={topProj.yLastApex} r="3.5" fill="#F59E0B" />

                  {gm.requiresMetatarsalPad && (
                    <ellipse
                      cx={topProj.xPelotte}
                      cy={topProj.centerY - 2}
                      rx="11"
                      ry="14"
                      fill="#E11D48"
                      fillOpacity="0.25"
                      stroke="#E11D48"
                      strokeDasharray="2 2"
                    />
                  )}

                  <text
                    x={Math.max(92, topProj.xApexM1 - 36)}
                    y="18"
                    fill="#F59E0B"
                    fontSize="6.4"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    Слой пучков {gm.ballRadialLayerMm >= 0 ? '+' + String(gm.ballRadialLayerMm) : gm.ballRadialLayerMm}мм
                    {gm.medialBunionPocketMm > 0
                      ? ' · HV +' + String(gm.medialBunionPocketMm) + 'мм'
                      : ''}
                  </text>
                  <line
                    x1={topProj.xApexM1}
                    y1="21"
                    x2={topProj.xApexM1}
                    y2={topProj.yM1 + 2}
                    stroke="#F59E0B"
                    strokeWidth="0.8"
                  />

                  <text
                    x={Math.max(60, topProj.xApexM5 - 32)}
                    y="142"
                    fill="#3186FF"
                    fontSize="6.6"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    СГИБ M1–M5: {gm.metatarsalObliqueAngleDeg}° ({gm.xApexM1Mm}/{gm.xApexM5Mm}мм)
                  </text>

                  <text
                    x="208"
                    y="16"
                    fill="#10B981"
                    fontSize="6.6"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    ПРИПУСК +{gm.toeFreeSpaceMm}мм ({gm.toeShape.toUpperCase()})
                  </text>

                  <text
                    x="202"
                    y="149"
                    fill="#F59E0B"
                    fontSize="6.6"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    АПЕКС КОЛОДКИ +{gm.toeBoxShiftMedialMm}мм
                  </text>
                </svg>
              </div>

              {/* НОРМИРОВАННАЯ ЭВРИСТИКА ПЛАНТАРНОГО ДАВЛЕНИЯ ПО ГОЛОВКАМ M1–M5 */}
              <div className={'p-3 rounded-[12px] border ' + String(cLine) + ' ' + String(cCard)}>
                <div className="font-mono text-[8px] uppercase tracking-wider text-[#E11D48] font-semibold mb-1.5">
                  РАСЧЁТНАЯ БИОМЕХАНИЧЕСКАЯ ЭВРИСТИКА ДАВЛЕНИЯ M1–M5 (БАЛАНС ΣF_Mi = F_fore)
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center text-[9.5px]">
                  {(
                    [
                      {
                        ray: 'M1',
                        kpa: pm.kpaM1,
                        force: pm.rayForcesN.M1,
                        area: pm.rayContactAreasCm2.M1,
                        share: pm.rayLoadSharesPct.M1,
                      },
                      {
                        ray: 'M2',
                        kpa: pm.kpaM2,
                        force: pm.rayForcesN.M2,
                        area: pm.rayContactAreasCm2.M2,
                        share: pm.rayLoadSharesPct.M2,
                      },
                      {
                        ray: 'M3',
                        kpa: pm.kpaM3,
                        force: pm.rayForcesN.M3,
                        area: pm.rayContactAreasCm2.M3,
                        share: pm.rayLoadSharesPct.M3,
                      },
                      {
                        ray: 'M4',
                        kpa: pm.kpaM4,
                        force: pm.rayForcesN.M4,
                        area: pm.rayContactAreasCm2.M4,
                        share: pm.rayLoadSharesPct.M4,
                      },
                      {
                        ray: 'M5',
                        kpa: pm.kpaM5,
                        force: pm.rayForcesN.M5,
                        area: pm.rayContactAreasCm2.M5,
                        share: pm.rayLoadSharesPct.M5,
                      },
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
                        <div className="font-mono text-[8px] font-bold">
                          {item.ray} ({item.share}%)
                        </div>
                        <div className="font-serif text-[13px] font-semibold">{item.kpa}</div>
                        <div className="text-[7px] opacity-75">
                          кПа · {item.force}Н / {item.area}см²
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="text-[9.5px] opacity-80 mt-1.5">
                  Доминирующий луч: <strong>{pm.dominantMetatarsalRay}</strong> · Фазовый коэфф.
                  переката: <strong>×{pm.gaitPhaseFactor}</strong> · Средний отдел:{' '}
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
                  ПРОЕКЦИЯ 2: ВИД СБОКУ (ИНЖЕНЕРНАЯ СХЕМА ВЗЪЁМА, СВОДА И ПЕРЕПАДА ВЫСОТ)
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
                      d={
                        'M 42 68 L ' +
                        String(Math.round(42 + gm.uBall * 243)) +
                        ' 88 L ' +
                        String(Math.round(42 + gm.uBall * 243)) +
                        ' 96 L ' +
                        String(48 + gm.rearHeelRockerLiftMm) +
                        ' 96 Q 44 94, 42 68 Z'
                      }
                      fill="#475569"
                      fillOpacity="0.55"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  ) : (
                    <path
                      d={
                        'M 42 68 L ' +
                        String(
                          gm.soleType === 'thomas'
                            ? Math.round(42 + gm.uThomasFront * 243)
                            : Math.round(42 + gm.uHeelFrontBase * 243)
                        ) +
                        ' 68 L ' +
                        String(
                          gm.soleType === 'thomas'
                            ? Math.round(42 + gm.uThomasFront * 243)
                            : Math.round(42 + gm.uHeelFrontBase * 243)
                        ) +
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
                    3. ВИД СЗАДИ (ПЯТКА {gm.heelWidthMm} ММ)
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
                      x={Math.round(70 - gm.heelWidthMm * 0.38)}
                      y="72"
                      width={Math.round(gm.heelWidthMm * 0.76)}
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
                          РОКЕР ({gm.rockerType}) {gm.rockerAngleDeg}° · CFRP {gm.carbonInsertThicknessMm}мм
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

          {/* ЛИСТ 3: ДВУХКОЛОНОЧНОЕ ТЗ (L / R) + РАЗДЕЛЁННЫЙ ПРОЧНОСТНОЙ РАСЧЁТ (65Г vs КАРБОН CFRP) */}
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
                        • <strong>Полнота / Ширина:</strong> {sp.widthCode} ({sp.forefootWidthMm} мм, пятка {sp.heelWidthMm} мм)
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
                        • <strong>Пик ({sp.dominantRay}):</strong> {sp.peakForefootPressureKpa} кПа (
                        {sp.forefootLoadPct}%)
                        {sp.requiresMetatarsalPad
                          ? ' · Пелот ' + String(sp.metatarsalPadHeightMm) + 'мм'
                          : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ПРОЧНОСТНОЙ РАСЧЁТ СИЛОВОГО ЭЛЕМЕНТА (СТАЛЬ 65Г vs КАРБОН CFRP) */}
              <div
                className={
                  'p-3 rounded-[12px] border space-y-1.5 text-[10px] ' +
                  String(cLine) +
                  ' ' +
                  String(cCard)
                }
              >
                <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#F59E0B] font-semibold">
                  РАСЧЁТ ПРОЧНОСТИ СИЛОВОГО ЭЛЕМЕНТА ({se.material === 'carbon_composite' ? 'КАРБОН CFRP' : 'СТАЛЬ 65Г'} · 10^6 ЦИКЛОВ)
                </div>
                <div>
                  • <strong>Профиль и геометрия сечения:</strong> {se.profileLabel} ({se.shankLengthMm}×
                  {se.shankWidthMm}×{se.elementThicknessMm} мм
                  {se.ribDepthMm > 0 ? ', гофр ' + String(se.ribDepthMm) + ' мм' : ''}), нейтр. ось z_NA ={' '}
                  <strong>{se.neutralAxisMm} мм</strong>, I_x = <strong>{se.momentOfInertiaMm4} мм⁴</strong>,
                  W_x = <strong>{se.sectionModulusMm3} мм³</strong>, жёсткость EI ={' '}
                  <strong>{se.flexuralRigidityNm2} Н·м²</strong>
                </div>
                <div>
                  • <strong>Распределение момента свода ({se.bendingMomentNm} Н·м):</strong> разгрузка
                  упругим основанием Винклера ={' '}
                  <strong>−{se.winklerFoundationReliefPct}%</strong>; доля жёсткости EI в слоистом пакете ={' '}
                  <strong>{se.compositeShankLoadSharePct}%</strong> (чистый момент ={' '}
                  <strong>{se.netShankMomentNm} Н·м</strong>, концентратор K_σ ={' '}
                  <strong>{se.stressConcentrationFactor}</strong>)
                </div>
                <div>
                  • <strong>Напряжение и циклическая стойкость:</strong> σ_max ≈{' '}
                  <strong>{se.estimatedBendingStressMpa} МПа</strong> (предел прочности ={' '}
                  {se.yieldStrengthMpa} МПа, предел выносливости 10^6 циклов = {se.fatigueLimit1e6Mpa}{' '}
                  МПа, статический запас k_ст = <strong>{se.safetyFactor}</strong>, усталостный запас k_fat ={' '}
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

          {/* ЛИСТ 4: ТРЁХУРОВНЕВАЯ СТРУКТУРА ТЗ МАСТЕРУ, ВАЛИДАЦИЯ И ФОРМУЛЫ */}
          {projTab === 'steps_math' && (
            <div className="space-y-3">
              {/* 3 УРОВНЯ ТЕХНИЧЕСКОГО ЗАДАНИЯ МАСТЕРУ (Аудит раздел 6) */}
              <div
                className={
                  'p-3 rounded-[12px] border space-y-2 text-[9.5px] ' +
                  String(cLine) +
                  ' ' +
                  String(cCard)
                }
              >
                <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#F59E0B] font-semibold">
                  ТРЁХУРОВНЕВАЯ ДЕКОМПОЗИЦИЯ ТЕХНИЧЕСКОГО ЗАДАНИЯ МАСТЕРУ
                </div>
                <div className={'p-2 rounded-[8px] border ' + String(cLine)}>
                  <div className="font-mono text-[8px] text-[#3186FF] font-bold uppercase mb-1">
                    УРОВЕНЬ I. АНТРОПОМЕТРИЯ (ИСХОДНЫЕ ДАННЫЕ СТОПЫ)
                  </div>
                  {levels.level1Anthropometry.map((line, idx) => (
                    <div key={idx} className="opacity-85">
                      • {line}
                    </div>
                  ))}
                </div>
                <div className={'p-2 rounded-[8px] border ' + String(cLine)}>
                  <div className="font-mono text-[8px] text-[#10B981] font-bold uppercase mb-1">
                    УРОВЕНЬ II. ИНЖЕНЕРНАЯ СПЕЦИФИКАЦИЯ (КОЛОДКА И ПОДОШВА)
                  </div>
                  {levels.level2EngineeringSpec.map((line, idx) => (
                    <div key={idx} className="opacity-85">
                      • {line}
                    </div>
                  ))}
                </div>
                <div className={'p-2 rounded-[8px] border ' + String(cLine)}>
                  <div className="font-mono text-[8px] text-[#F59E0B] font-bold uppercase mb-1">
                    УРОВЕНЬ III. КЛИНИЧЕСКИЕ И ЭРГОНОМИЧЕСКИЕ РЕКОМЕНДАЦИИ (ТРЕБУЮТ ПОДТВЕРЖДЕНИЯ)
                  </div>
                  {levels.level3ClinicalRecommendations.map((line, idx) => (
                    <div key={idx} className="opacity-85">
                      • {line}
                    </div>
                  ))}
                </div>
              </div>

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
