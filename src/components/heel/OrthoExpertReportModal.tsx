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

export function OrthoExpertReportModal({ isOpen, onClose, input, eng, isDark }: Props) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const cBg = isDark ? 'bg-[#0E0E0E]' : 'bg-[#F6F3EC]'
  const cCard = isDark ? 'bg-[#161616]' : 'bg-[#FFFFFF]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cMuted = isDark ? 'text-[#F4F0E8]/60' : 'text-[#1C1816]/60'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'

  const toeShapeName =
    input.toeShape === 'greek'
      ? 'Греческая (II палец длиннее I)'
      : input.toeShape === 'roman'
      ? 'Римская / Прямоугольная (I ≈ II ≈ III)'
      : 'Египетская (I палец доминирует)'

  const archName =
    input.archType === 'flat'
      ? 'Уплощенный свод (признаки продольного плоскостопия)'
      : input.archType === 'cavus'
      ? 'Высокий ригидный свод (Pes Cavus / полая стопа)'
      : 'Физиологическая норма свода'

  const buildPlainTextReport = () => {
    return [
      `ЭКСПЕРТНОЕ ОРТОПЕДИЧЕСКОЕ ЗАКЛЮЧЕНИЕ И ТЗ НА КОЛОДКУ`,
      `====================================================`,
      `A. АНТРОПОМЕТРИЯ СТОПЫ:`,
      `• Пол / Размер: ${input.gender === 'male' ? 'Мужской' : 'Женский'} / ${input.shoeSize} (Длина стопы: ${eng.footLengthMm} мм, Асимметрия L/R: ${input.lengthAsymmetryMm ?? 0} мм)`,
      `• Масса тела: ${input.weightKg} кг`,
      `• Обхват пучков (Oп): ${input.ballGirthMm} мм (Ширина пучков: ${eng.rx.forefootWidthMm} мм, Индекс ширины: ${eng.rx.widthIndexPct}%)`,
      `• Прямой взъем (Oв): ${input.instepGirthMm} мм | Косой обхват (Oк): ${input.obliqueGirthMm} мм (Ширина пятки: ${eng.rx.heelWidthMm} мм)`,
      ``,
      `B. АНАТОМИЧЕСКИЙ ПРОФИЛЬ И СВОДЫ:`,
      `• Форма пальцев: ${toeShapeName}`,
      `• Отклонение I пальца (Hallux Valgus): ${input.halluxValgusDeg ?? 0}°`,
      `• Состояние сводов: ${archName}`,
      ``,
      `C. АНАЛИЗ АПЕКСОВ И БИОМЕХАНИЧЕСКИХ ОСЕЙ:`,
      `• Тип геометрического апекса колодки: ${eng.rx.lastApexLabel}`,
      `• Смещение мыска к медиальной оси: +${eng.rx.toeBoxShiftMedialMm} мм`,
      `• Анатомические головки плюсневых костей: Апекс M1 = ${eng.apexM1_Mm} мм, Апекс M5 = ${eng.apexM5_Mm} мм`,
      `• Угол косой метатарзальной линии сгиба: ${eng.rx.metatarsalObliqueAngleDeg}°`,
      ``,
      `D. БИОМЕХАНИКА ДВИЖЕНИЯ И ДАВЛЕНИЕ:`,
      `• Завал заднего отдела стопы: ${eng.pronationDeg}° (${eng.pronationDeg <= -2 ? 'Гиперпронация / Вальгус' : eng.pronationDeg >= 2 ? 'Гиперсупинация / Варус' : 'Нейтраль'})`,
      `• Распределение нагрузки: Пятка ${eng.heelLoad}% (${eng.peakHeelPressureKpa} кПа) | Пучки ${eng.forefootLoad}% (M1=${eng.loadM1Pct}%, M5=${eng.loadM5Pct}%, Пик=${eng.peakForefootPressureKpa} кПа)`,
      ``,
      `F. ИНДИВИДУАЛЬНОЕ ТЕХНИЧЕСКОЕ ЗАДАНИЕ МАСТЕРУ-КОЛОДОЧНИКУ:`,
      `1. КОЛОДКА: Длина следа = ${eng.lastLengthMm} мм, Полнота = ${eng.rx.widthCode}.`,
      `   • Доработка пучков: ${eng.rx.ballBuildUpMm > 0 ? `+${eng.rx.ballBuildUpMm} мм (налепка)` : `${eng.rx.ballBuildUpMm} мм`}${eng.rx.medialBunionPocketMm > 0 ? `, локальный карман под сустав M1 (HV): +${eng.rx.medialBunionPocketMm} мм` : ''}.`,
      `   • Доработка прямого взъема: ${eng.rx.instepBuildUpMm > 0 ? `+${eng.rx.instepBuildUpMm} мм (на гребень)` : `${eng.rx.instepBuildUpMm} мм`}. Высота носочной части: ${eng.rx.toeBoxHeightMm} мм.`,
      `2. ОРТО-СТЕЛЬКА: ${eng.rx.orthoticIndicated ? (eng.rx.insoleType === 'supinator' ? 'Супинаторная (антивальгус)' : eng.rx.insoleType === 'pronator' ? 'Пронаторная (антиварус)' : 'Индивидуальная разгрузочная') : 'Показаний к жесткому ортезу нет (профилактическая стелька)'}.`,
      `   • Твердость базы: ${eng.rx.shoreA}. Выкладка свода: ${eng.rx.archSupportHeightMm} мм.`,
      `   • Клин пятки: ${eng.rx.medialHeelWedgeMm > 0 ? `Медиальный +${eng.rx.medialHeelWedgeMm} мм` : eng.rx.lateralWedgeMm > 0 ? `Латеральный +${eng.rx.lateralWedgeMm} мм` : '0 мм'}.`,
      `   • Пелот Зейца: ${eng.requiresMetatarsalPad ? `Высота ${eng.metatarsalPadHeightMm} мм на дистанции ${eng.metatarsalPadPosMm} мм от пятки` : 'Не требуется'}.`,
      `3. ПОДОШВА И КАБЛУК: Перепад (Drop) = ${eng.netRise} мм (Каблук ${input.heelHeight} мм / Платформа ${input.toeThickness} мм, Уклон ${eng.internalSlope.toFixed(1)}°).`,
      `   • Конструкция опоры: ${input.soleType === 'thomas' ? `Каблук Томаса с удлинением +${eng.rx.thomasExtensionMm} мм (${eng.rx.thomasHeelType === 'medial' ? 'внутренний' : 'наружный'})` : input.soleType === 'rocker' ? `Рокерный перекат ${input.rockerAngle}° + Карбон ${eng.carbonInsertThicknessMm} мм` : 'Стандартный каблук'}.`,
      `   • Геленок 65Г: Длина ${eng.shankLength} мм, толщина ${eng.steelThickness} мм (Момент ${eng.shankBendingMomentNm} Н·м).`,
      `   • Задник: ${eng.rx.counterStiffness}.`,
    ].join('\n')
  }

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(buildPlainTextReport())
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {}
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[540px] max-h-[92dvh] flex flex-col rounded-t-[20px] sm:rounded-[18px] border ${cLine} ${cBg} ${cText} shadow-2xl overflow-hidden`}
      >
        {/* Шапка отчета */}
        <div className={`px-4 py-3 border-b ${cLine} flex items-center justify-between shrink-0`}>
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.25em] text-[#10B981]">
              CLINICAL & LAST ENGINEERING CONSILIUM // ПРОТОКОЛ A–H
            </div>
            <h2 className="font-serif text-lg font-semibold leading-tight">
              Экспертное ТЗ на колодку, стельку и обувь
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

        {/* Тело отчета A–H */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-[11.5px] leading-relaxed">
          {/* A. АНТРОПОМЕТРИЯ */}
          <section className={`p-3 rounded-[12px] border ${cLine} ${cCard}`}>
            <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#10B981] font-semibold mb-1.5">
              A. АНТРОПОМЕТРИЧЕСКИЙ ПРОТОКОЛ СТОПЫ
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div>• Пол / Размер: <strong>{input.gender === 'male' ? 'МУЖ' : 'ЖЕН'} / {input.shoeSize}</strong></div>
              <div>• Масса тела: <strong>{input.weightKg} кг</strong></div>
              <div>• Длина стопы: <strong>{eng.footLengthMm} мм</strong></div>
              <div>• Асимметрия L/R: <strong>{input.lengthAsymmetryMm ?? 0} мм</strong></div>
              <div>• Обхват пучков (Oп): <strong>{input.ballGirthMm} мм</strong></div>
              <div>• Ширина пучков (Wп): <strong>{eng.rx.forefootWidthMm} мм ({eng.rx.widthIndexPct}%)</strong></div>
              <div>• Прямой взъем (Oв): <strong>{input.instepGirthMm} мм</strong></div>
              <div>• Косой обхват (Oк): <strong>{input.obliqueGirthMm} мм</strong></div>
            </div>
          </section>

          {/* B. АНАТОМИЧЕСКИЙ ПРОФИЛЬ */}
          <section className={`p-3 rounded-[12px] border ${cLine} ${cCard} space-y-1`}>
            <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#10B981] font-semibold mb-1">
              B. АНАТОМИЧЕСКИЙ ПРОФИЛЬ И МОРФОЛОГИЯ СВОДОВ
            </div>
            <div>• Морфотип пальцев: <strong>{toeShapeName}</strong></div>
            <div>
              • Вальгусное отклонение I пальца (Hallux Valgus):{' '}
              <strong className={(input.halluxValgusDeg ?? 0) >= 10 ? 'text-[#E11D48]' : ''}>
                {input.halluxValgusDeg ?? 0}° {(input.halluxValgusDeg ?? 0) >= 15 ? '(Требуется разгрузочный карман M1)' : ''}
              </strong>
            </div>
            <div>• Состояние продольного свода: <strong>{archName}</strong></div>
          </section>

          {/* C. АНАЛИЗ АПЕКСОВ И ОСЕЙ */}
          <section className={`p-3 rounded-[12px] border ${cLine} ${cCard} space-y-1`}>
            <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#10B981] font-semibold mb-1">
              C. АНАЛИЗ АПЕКСОВ И БИОМЕХАНИЧЕСКИХ ОСЕЙ (КОЛОДКА VS СТОПА)
            </div>
            <div>• Рекомендуемый апекс носка колодки: <strong>{eng.rx.lastApexLabel}</strong></div>
            <div>• Медиальное смещение оси мыска: <strong>+{eng.rx.toeBoxShiftMedialMm} мм к оси I луча</strong></div>
            <div>• Анатомические головки плюсневых костей: <strong>M1 = {eng.apexM1_Mm} мм, M5 = {eng.apexM5_Mm} мм от задника</strong></div>
            <div>• Косая линия метатарзального сгиба (Oblique Break): <strong>{eng.rx.metatarsalObliqueAngleDeg}°</strong></div>
          </section>

          {/* D. БИОМЕХАНИЧЕСКИЙ ПРОФИЛЬ */}
          <section className={`p-3 rounded-[12px] border ${cLine} ${cCard} space-y-1`}>
            <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#10B981] font-semibold mb-1">
              D. БИОМЕХАНИКА ДВИЖЕНИЯ И ПЛАНТАРНОЕ ДАВЛЕНИЕ
            </div>
            <div>
              • Установка пятки в фазе контакта:{' '}
              <strong>
                {eng.pronationDeg}° ({eng.pronationDeg <= -2 ? 'Гиперпронация / Вальгус' : eng.pronationDeg >= 2 ? 'Гиперсупинация / Варус' : 'Стабильная нейтраль'})
              </strong>
            </div>
            <div>
              • Распределение нагрузки по лучам: <strong>Пятка {eng.heelLoad}% ({eng.peakHeelPressureKpa} кПа)</strong> |{' '}
              <strong>Передний отдел {eng.forefootLoad}% (Луч M1: {eng.loadM1Pct}%, Луч M5: {eng.loadM5Pct}%)</strong>
            </div>
            <div>
              • Пиковое давление под головками M1–M5: <strong className={eng.peakForefootPressureKpa >= 245 ? 'text-[#E11D48]' : 'text-[#10B981]'}>{eng.peakForefootPressureKpa} кПа</strong> (порог ишемии тканей 245 кПа)
            </div>
          </section>

          {/* E. ИНЖЕНЕРНЫЕ МАТЕМАТИЧЕСКИЕ РАСЧЕТЫ */}
          <section className={`p-3 rounded-[12px] border ${cLine} ${cCard} space-y-2.5`}>
            <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#10B981] font-semibold">
              E. ДОКАЗАТЕЛЬНЫЕ ИНЖЕНЕРНЫЕ РАСЧЕТЫ (ФОРМУЛЫ И ПОДСТАНОВКА)
            </div>
            {eng.rx.calculations.map((calc, idx) => (
              <div key={idx} className={`p-2.5 rounded-[9px] border ${cLine} text-[10.5px] space-y-0.5`}>
                <div className="font-semibold">{calc.title}</div>
                <div className={cMuted}>Исходные данные: {calc.given}</div>
                <div className="font-mono text-[10px] text-[#10B981]">Формула: {calc.formula}</div>
                <div className="font-mono text-[10px]">Расчет: {calc.substitution} = <strong>{calc.result}</strong></div>
                <div className="opacity-85 italic">{calc.meaning}</div>
              </div>
            ))}
          </section>

          {/* F. ИНДИВИДУАЛЬНОЕ ТЕХНИЧЕСКОЕ ЗАДАНИЕ */}
          <section className={`p-3 rounded-[12px] border ${cLine} ${cCard} space-y-1.5`}>
            <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#10B981] font-semibold">
              F. ИНДИВИДУАЛЬНОЕ ТЕХНИЧЕСКОЕ ЗАДАНИЕ НА ИЗГОТОВЛЕНИЕ ОБУВИ
            </div>
            <div>• <strong>Колодка:</strong> Длина следа <strong>{eng.lastLengthMm} мм</strong>, Полнота <strong>{eng.rx.widthCode}</strong>, высота мыска <strong>{eng.rx.toeBoxHeightMm} мм</strong>.</div>
            <div>
              • <strong>Модификация колодки (налепки):</strong> в пучках{' '}
              <strong>{eng.rx.ballBuildUpMm > 0 ? `+${eng.rx.ballBuildUpMm} мм` : `${eng.rx.ballBuildUpMm} мм`}</strong>, на гребне взъема{' '}
              <strong>{eng.rx.instepBuildUpMm > 0 ? `+${eng.rx.instepBuildUpMm} мм` : `${eng.rx.instepBuildUpMm} мм`}</strong>
              {eng.rx.medialBunionPocketMm > 0 ? `, локальная разгрузка сустава I пальца (HV): +${eng.rx.medialBunionPocketMm} мм` : ''}.
            </div>
            {eng.rx.compensatoryInsoleHalfPairMm > 0 && (
              <div className="text-[#D97706] font-medium">
                • <strong>Компенсация асимметрии стоп L/R:</strong> вкладной компенсирующий полустелечный слой +{eng.rx.compensatoryInsoleHalfPairMm} мм под короткую стопу.
              </div>
            )}
            <div>
              • <strong>Ортопедическая стелька:</strong>{' '}
              {eng.rx.orthoticIndicated ? (
                <>
                  Показана <strong>{eng.rx.insoleType === 'supinator' ? 'супинаторная антивальгусная' : eng.rx.insoleType === 'pronator' ? 'пронаторная антиварусная' : 'разгрузочная'}</strong> стелька, база <strong>{eng.rx.shoreA}</strong>, свод <strong>{eng.rx.archSupportHeightMm} мм</strong>
                  {eng.rx.medialHeelWedgeMm > 0 ? `, медиальный клин пятки +${eng.rx.medialHeelWedgeMm} мм` : ''}
                  {eng.rx.lateralWedgeMm > 0 ? `, латеральный клин +${eng.rx.lateralWedgeMm} мм` : ''}.
                </>
              ) : (
                <strong>Функциональных показаний к жесткому ортезированию нет — достаточно анатомической стельки {eng.rx.shoreA}.</strong>
              )}
            </div>
            <div>
              • <strong>Подошва и пяточный узел:</strong> Перепад (Drop) <strong>{eng.netRise} мм</strong>, Геленок 65Г <strong>{eng.shankLength}×{eng.steelThickness} мм</strong>, Задник: <strong>{eng.rx.counterStiffness}</strong>.
            </div>
          </section>

          {/* G & H. РИСКИ, ПРОТИВОПОКАЗАНИЯ И ЗАКЛЮЧЕНИЕ */}
          <section className={`p-3 rounded-[12px] border ${cLine} ${cCard} space-y-1.5`}>
            <div className="font-mono text-[8.5px] uppercase tracking-wider text-[#E11D48] font-semibold">
              G & H. КОНСТРУКЦИИ, КОТОРЫХ СЛЕДУЕТ ИЗБЕГАТЬ & ФИНАЛЬНОЕ ЗАКЛЮЧЕНИЕ
            </div>
            <div>
              • <strong>Противопоказано:</strong> узкий симметричный мысок (вызывает компрессию I и V лучей и прогрессирование Hallux Valgus), мягкий бесформенный задник при завале пятки, перепад высот более {Math.round(eng.lEff * 0.22)} мм без рокерной разгрузки, глухое голенище без шнуровки/молнии при косом обхвате {input.obliqueGirthMm} мм.
            </div>
            <div className={`pt-1 text-[10px] ${cMuted}`}>
              Примечание: Расчеты выполнены на основании введенных антропометрических параметров. Для верификации скрытых деформаций суставов рекомендуется очная подоскопия и бароподометрия в динамике.
            </div>
          </section>
        </div>

        {/* Нижняя кнопка копирования ТЗ для отправки мастеру */}
        <div className={`p-3.5 border-t ${cLine} flex items-center gap-2 shrink-0`}>
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2.5 rounded-[10px] font-mono text-[9.5px] uppercase tracking-wider bg-[#10B981] text-black font-semibold cursor-pointer border-none active:scale-98 transition-transform"
          >
            {copied ? '✓ ТЗ СКОПИРОВАНО В БУФЕР ОБМЕНА' : '📋 СКОПИРОВАТЬ ПОЛНОЕ ТЗ ДЛЯ МАСТЕРА'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-[10px] font-mono text-[9.5px] uppercase tracking-wider border ${cLine} bg-transparent ${cText} cursor-pointer`}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

