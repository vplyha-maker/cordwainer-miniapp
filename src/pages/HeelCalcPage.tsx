// src/pages/HeelCalcPage.tsx
import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'
import {
  HEEL_CONST,
  computeEngineering,
  computeAudit,
  defaultTipWidth,
  suggestAutoFix,
  type SoleType,
  type HeelType,
} from '../lib/heelCalc'
import { buildHeelGeometry } from '../lib/heelGeometry'
import { HeelStepper } from '../components/heel/HeelStepper'
import { HeelCanvas } from '../components/heel/HeelCanvas'

type Props = { onBack: () => void; lang: Lang }

export function HeelCalcPage({ onBack, lang }: Props) {
  const [shoeSize, setShoeSize] = useState(38)
  const [heelHeight, setHeelHeight] = useState(55)
  const [toeThickness, setToeThickness] = useState(10)
  const [rockerAngle, setRockerAngle] = useState(12)
  const [rockerStartPct, setRockerStartPct] = useState(65)
  const [soleType, setSoleType] = useState<SoleType>('flat')
  const [heelType, setHeelType] = useState<HeelType>('stiletto')
  const [heelTipOffsetMm, setHeelTipOffsetMm] = useState(0)
  const [tipWidthMm, setTipWidthMm] = useState(10)
  const [showSpecs, setShowSpecs] = useState(false)

  useEffect(() => {
    if (toeThickness > heelHeight + 10) setToeThickness(heelHeight + 10)
  }, [heelHeight, toeThickness])

  useEffect(() => {
    if (soleType === 'flat') setTipWidthMm(defaultTipWidth(heelType))
  }, [heelType, soleType])

  const haptic = (style: 'light' | 'medium' = 'light') => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
      else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 20 : 40)
    } catch {}
  }

  const t = useMemo(() => getLabels(lang), [lang])

  const input = {
    shoeSize, heelHeight, toeThickness, soleType, heelType,
    rockerAngle, rockerStartPct, heelTipOffsetMm, tipWidthMm,
  }

  const eng = useMemo(() => computeEngineering(input), [
    shoeSize, heelHeight, toeThickness, soleType, heelType,
    rockerAngle, rockerStartPct, heelTipOffsetMm, tipWidthMm,
  ])

  const audit = useMemo(
    () => computeAudit(eng, soleType, heelHeight, rockerAngle),
    [eng, soleType, heelHeight, rockerAngle]
  )

  const geometry = useMemo(
    () => buildHeelGeometry({ ...input, shankLength: eng.shankLength }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shoeSize, heelHeight, toeThickness, soleType, heelType, rockerAngle, rockerStartPct, heelTipOffsetMm, tipWidthMm, eng.shankLength]
  )

  const handleFix = () => {
    haptic('medium')
    const fix = suggestAutoFix(input, eng)
    setToeThickness(fix.toeThickness)
    setHeelHeight(fix.heelHeight)
    setHeelTipOffsetMm(fix.heelTipOffsetMm)
    setTipWidthMm(fix.tipWidthMm)
    setRockerAngle(fix.rockerAngle)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-[100dvh] bg-[#110F0E] text-[#F3EFEA] overflow-hidden"
    >
      <div className="flex-shrink-0 p-3 flex items-center justify-between border-b border-white/5 bg-[#110F0E]/80 backdrop-blur-md z-10">
        <button
          onClick={() => { haptic(); onBack() }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1C1816] border border-white/5 active:scale-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-right">
          <h1 className="text-[14px] font-medium leading-none mb-1">{t.title}</h1>
          <p className="text-[10px] text-[#A3988E]">{t.desc}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2 pb-6">
        <HeelCanvas
          geometry={geometry}
          eng={eng}
          audit={audit}
          auditTitle={(t as any)[audit.titleKey]}
          auditMessage={(t as any)[audit.messageKey]}
          soleType={soleType}
          heelType={heelType}
          heelHeight={heelHeight}
          toeThickness={toeThickness}
          labels={t}
          onFix={handleFix}
        />

        {/* Стандарт / Рокер */}
        <div className="flex bg-[#1C1816] p-1 rounded-xl border border-white/5">
          {(['flat', 'rocker'] as const).map((type) => (
            <button
              key={type}
              onClick={() => { haptic(); setSoleType(type) }}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg ${
                soleType === type ? 'bg-[#8B5CF6] text-white' : 'text-[#A3988E]'
              }`}
            >
              {t[type]}
            </button>
          ))}
        </div>

        {/* Типы каблука — только Стандарт */}
        {soleType === 'flat' && (
          <div className="grid grid-cols-2 gap-1 bg-[#1C1816] p-1 rounded-xl border border-white/5">
            {(['stiletto', 'kitten', 'block', 'flared'] as const).map((type) => (
              <button
                key={type}
                onClick={() => { haptic(); setHeelType(type) }}
                className={`py-1.5 text-[11px] font-medium rounded-lg ${
                  heelType === type ? 'bg-[#8B5CF6] text-white' : 'text-[#A3988E]'
                }`}
              >
                {t[type]}
              </button>
            ))}
          </div>
        )}

        {/* Степперы */}
        <div className="grid grid-cols-2 gap-1.5">
          <HeelStepper label={t.size} min={33} max={48} value={shoeSize} onChange={setShoeSize} onHaptic={() => haptic()} />
          <HeelStepper label={t.heel} min={10} max={130} value={heelHeight} onChange={setHeelHeight} unit="мм" onHaptic={() => haptic()} />
          <HeelStepper
            label={t.toe}
            min={0}
            max={Math.min(HEEL_CONST.MAX_TOE, heelHeight + 10)}
            value={toeThickness}
            onChange={setToeThickness}
            unit="мм"
            onHaptic={() => haptic()}
          />
          <HeelStepper
            label={t.start}
            min={55}
            max={75}
            value={rockerStartPct}
            onChange={setRockerStartPct}
            unit="%"
            onHaptic={() => haptic()}
          />

          {soleType === 'rocker' ? (
            <HeelStepper
              label={t.angle}
              min={5}
              max={30}
              value={rockerAngle}
              onChange={setRockerAngle}
              unit="°"
              onHaptic={() => haptic()}
            />
          ) : (
            <>
              <HeelStepper
                label={t.offset}
                min={-15}
                max={15}
                value={heelTipOffsetMm}
                onChange={setHeelTipOffsetMm}
                unit="мм"
                onHaptic={() => haptic()}
              />
              <HeelStepper
                label={t.tipW}
                min={6}
                max={45}
                value={tipWidthMm}
                onChange={setTipWidthMm}
                unit="мм"
                onHaptic={() => haptic()}
              />
            </>
          )}
        </div>

        {/* Спека */}
        <button
          onClick={() => { haptic(); setShowSpecs(!showSpecs) }}
          className="w-full py-2 px-3 bg-[#1C1816] rounded-xl text-[11px] font-medium flex items-center justify-between border border-white/5"
        >
          <span>{t.specsBtn}</span>
          <svg
            className={`w-3.5 h-3.5 text-[#A3988E] transition-transform ${showSpecs ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <AnimatePresence>
          {showSpecs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[#1C1816] p-2.5 rounded-xl border border-white/5 text-[10px] text-[#A3988E] space-y-1.5">
                <Row label="Перекат" value={`${rockerStartPct}%`} />
                <Row label="Геленок" value={`${eng.shankLength} мм`} />
                <Row label="Сталь 65Г" value={`${eng.steelThickness.toFixed(1)} мм`} />
                <Row label="L_eff" value={`${eng.lEff.toFixed(1)} мм`} />
                <Row label="Heel Center" value={`${HEEL_CONST.HEEL_CENTER_RATIO * 100}%`} />
                {soleType === 'flat' && (
                  <>
                    <Row
                      label="Смещение"
                      value={`${heelTipOffsetMm} мм`}
                      danger={eng.heelOffsetTooFarBack || eng.heelOffsetTooFarForward}
                    />
                    <Row label="Набойка" value={`${tipWidthMm} мм`} />
                    <Row label={t.invertRisk} value={`${eng.inversionRisk}%`} danger={eng.inversionRisk >= 55} />
                    {(heelType === 'kitten' || heelType === 'flared') && (
                      <Row label={t.entryAngle} value={`${eng.entryAngleDeg}°`} />
                    )}
                  </>
                )}
                <div className="pt-1.5 mt-1 border-t border-white/5 font-mono text-[9px] text-[#D49A5C] bg-black/20 p-1.5 rounded-lg text-center">
                  Angle = arcsin((H − T) / L_eff)
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex justify-between">
      <span>{label}:</span>
      <strong className={danger ? 'text-red-400' : 'text-[#F3EFEA]'}>{value}</strong>
    </div>
  )
}

function getLabels(lang: Lang) {
  const C = HEEL_CONST
  const ru = {
    title: 'Инженерия и Баланс',
    desc: 'Аудит профиля и каблука',
    size: 'Размер', heel: 'Каблук', toe: 'Платформа', angle: 'Угол', start: 'Перекат',
    fixBtn: 'Баланс', offset: 'Смещение', tipW: 'Набойка',
    internalSlope: 'Наклон колодки:', loadLbl: 'Нагрузка на плюсну:',
    successTitle: '✅ БАЛАНС В НОРМЕ', successDesc: 'Физиологическая норма.',
    warnTitle: '⚠️ ВЫСОКИЙ ПОДЪЕМ',
    warn1Desc: `Угол больше ${C.COMFORT_ANGLE}°. Увеличьте платформу или уменьшите каблук.`,
    warn2Desc: 'Чрезмерный рокер при низком каблуке.',
    errTitle: '⚠️ КРИТИЧЕСКИЙ НАКЛОН',
    errDesc: `Угол колодки > ${C.CRITICAL_ANGLE}°. Требуется утолщение платформы или снижение каблука.`,
    padTitle: '⚠️ КРИТИЧЕСКАЯ НАГРУЗКА НА ПЛЮСНУ',
    padDesc: 'Требуется обязательная установка встроенного метатарзального пелота (капли Зейца) в стельку для разгрузки нервных окончаний.',
    negDropTitle: '⚠️ ОБРАТНЫЙ УКЛОН', negDropDesc: 'Платформа выше каблука. Нарушение биомеханики.',
    heelBackTitle: '⚠️ КАБЛУК ЗАВАЛЕН НАЗАД',
    heelBackDesc: 'Ошибка: Каблук завален назад, произойдет перелом супинатора под весом пациента.',
    heelFwdTitle: '⚠️ СМЕЩЕНИЕ ВПЕРЁД',
    heelFwdDesc: `Набойка смещена вперёд больше чем на ${C.MAX_HEEL_OFFSET_MM} мм. Снижена стабильность, риск срыва посадки каблука.`,
    invertTitle: '⚠️ РИСК ИНВЕРСИИ',
    invertDesc: 'Набойка слишком узкая при высоком каблуке — высокий риск подворачивания лодыжки.',
    heelLbl: 'ПЯТКА', toeLbl: 'НОСОК',
    stiletto: 'Шпилька', block: 'Блок', kitten: 'Рюмочка', flared: 'Трапеция',
    flat: 'Стандарт', rocker: 'Рокер',
    specsBtn: '⚙️ Спецификация и Математика', dropLbl: 'Перепад',
    massTitle: 'Распределение массы', forefoot: 'Носок', rearfoot: 'Пятка',
    invertRisk: 'Риск инверсии', entryAngle: 'Угол въезда',
  }
  const uk = {
    ...ru,
    title: 'Інженерія та Баланс',
    desc: 'Аудит профілю та підбора',
    size: 'Розмір', heel: 'Підбор', toe: 'Платформа', angle: 'Кут', start: 'Перекат',
    fixBtn: 'Баланс', offset: 'Зміщення', tipW: 'Набійка',
    internalSlope: 'Нахил колодки:', loadLbl: 'Навантаження на плюсну:',
    successTitle: '✅ БАЛАНС У НОРМІ', successDesc: 'Фізіологічна норма.',
    warnTitle: '⚠️ ВИСОКИЙ ПІДЙОМ',
    warn1Desc: `Кут більше ${C.COMFORT_ANGLE}°. Збільште платформу або зменште підбор.`,
    warn2Desc: 'Надмірний рокер при низькому підборі.',
    errTitle: '⚠️ КРИТИЧНИЙ НАХИЛ',
    errDesc: `Кут колодки > ${C.CRITICAL_ANGLE}°. Потрібне потовщення платформи або зниження підбора.`,
    padTitle: '⚠️ КРИТИЧНЕ НАВАНТАЖЕННЯ НА ПЛЮСНУ',
    padDesc: 'Потрібна обовʼязкова установка вбудованого метатарзального пелота (краплі Зейца) у устілку для розвантаження нервових закінчень.',
    negDropTitle: '⚠️ ЗВОРОТНІЙ УХИЛ', negDropDesc: 'Платформа вища за підбор. Порушення біомеханіки.',
    heelBackTitle: '⚠️ ПІДБОР ЗАВАЛЕНИЙ НАЗАД',
    heelBackDesc: 'Помилка: Підбор завалений назад, відбудеться перелом супінатора під вагою пацієнта.',
    heelFwdTitle: '⚠️ ЗМІЩЕННЯ ВПЕРЕД',
    heelFwdDesc: `Набійка зміщена вперед більше ніж на ${C.MAX_HEEL_OFFSET_MM} мм. Знижена стабільність, ризик зриву посадки підбора.`,
    invertTitle: '⚠️ РИЗИК ІНВЕРСІЇ',
    invertDesc: 'Набійка занадто вузька при високому підборі — високий ризик підвертання щиколотки.',
    heelLbl: "П'ЯТКА", toeLbl: 'НОСОК',
    stiletto: 'Шпилька', block: 'Блок', kitten: 'Чарочка', flared: 'Трапеція',
    flat: 'Стандарт', rocker: 'Рокер',
    specsBtn: '⚙️ Специфікація та Математика', dropLbl: 'Перепад',
    massTitle: 'Розподіл маси', forefoot: 'Носок', rearfoot: "П'ятка",
    invertRisk: 'Ризик інверсії', entryAngle: 'Кут вʼїзду',
  }
  return lang === 'uk' ? uk : ru
}
