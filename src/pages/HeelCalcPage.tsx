// src/pages/HeelCalcPage.tsx
import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'
import {
  HEEL_CONST,
  ROCKER_PRESETS,
  computeEngineering,
  computeAudit,
  defaultTipWidth,
  suggestAutoFix,
  type SoleType,
  type HeelType,
  type RockerType,
} from '../lib/heelCalc'
import { buildHeelGeometry } from '../lib/heelGeometry'
import { HeelStepper } from '../components/heel/HeelStepper'
import { HeelCanvas } from '../components/heel/HeelCanvas'

type Props = { onBack: () => void; lang: Lang }

type InfoKey =
  | 'перекат'
  | 'геленок'
  | 'сталь'
  | 'lEff'
  | 'heelCenter'
  | 'смещение'
  | 'набойка'
  | 'invertRisk'
  | 'entryAngle'
  | 'padPos'
  | 'padHeight'
  | 'apexM1'
  | 'apexM5'
  | 'carbonInsert'

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
  const [rockerType, setRockerType] = useState<RockerType>('forefoot')
  const [showSpecs, setShowSpecs] = useState(false)
  const [openInfo, setOpenInfo] = useState<InfoKey | null>(null)

  useEffect(() => {
    if (toeThickness > heelHeight + 10) setToeThickness(heelHeight + 10)
  }, [heelHeight, toeThickness])

  useEffect(() => {
    if (soleType === 'flat') setTipWidthMm(defaultTipWidth(heelType))
  }, [heelType, soleType])

  // Применение пресета рокера
  useEffect(() => {
    if (soleType === 'rocker') {
      const preset = ROCKER_PRESETS[rockerType]
      setRockerAngle(preset.angle)
      setRockerStartPct(preset.startPct)
    }
  }, [rockerType, soleType])

  const haptic = (style: 'light' | 'medium' = 'light') => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
      else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 20 : 40)
    } catch {}
  }

  const t = useMemo(() => getLabels(lang), [lang])
  const infos = useMemo(() => getInfoTexts(lang), [lang])

  const input = {
    shoeSize, heelHeight, toeThickness, soleType, heelType,
    rockerAngle, rockerStartPct, heelTipOffsetMm, tipWidthMm, rockerType,
  }

  const eng = useMemo(() => computeEngineering(input), [
    shoeSize, heelHeight, toeThickness, soleType, heelType,
    rockerAngle, rockerStartPct, heelTipOffsetMm, tipWidthMm, rockerType,
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

  const handleRockerType = (type: RockerType) => {
    haptic()
    setRockerType(type)
  }

  const toggleInfo = (key: InfoKey) => {
    haptic()
    setOpenInfo((prev) => (prev === key ? null : key))
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-[100dvh] overflow-hidden"
      style={{
        background: 'var(--color-bg, #1C1816)',
        color: 'var(--color-ink, #F5F1EA)',
      }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 p-3 md:px-6 md:py-3.5 flex items-center justify-between backdrop-blur-md z-10"
        style={{
          background: 'color-mix(in srgb, var(--color-bg, #1C1816) 80%, transparent)',
          borderBottom: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 40%, transparent)',
        }}
      >
        <button
          onClick={() => { haptic(); onBack() }}
          className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full active:scale-90"
          style={{
            background: 'var(--color-surface, #25201C)',
            border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 40%, transparent)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-right">
          <h1 className="text-[14px] font-medium leading-none mb-1 calc-page-title">{t.title}</h1>
          <p className="text-[10px]" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
            {t.desc}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 md:px-6 py-2 space-y-2 pb-6 calc-page-content">
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
        <div
          className="flex p-1 rounded-xl calc-segment"
          style={{
            background: 'var(--color-surface, #25201C)',
            border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 40%, transparent)',
          }}
        >
          {(['flat', 'rocker'] as const).map((type) => (
            <button
              key={type}
              onClick={() => { haptic(); setSoleType(type) }}
              className="flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-colors"
              style={
                soleType === type
                  ? {
                      background: 'var(--color-accent, #D8A35C)',
                      color: 'var(--color-bg, #1C1816)',
                    }
                  : { color: 'var(--color-muted, #B9ACA0)' }
              }
            >
              {t[type]}
            </button>
          ))}
        </div>

        {/* Типы каблука — только Стандарт */}
        {soleType === 'flat' && (
          <div
            className="grid grid-cols-2 gap-1 md:gap-2 p-1 rounded-xl calc-segment"
            style={{
              background: 'var(--color-surface, #25201C)',
              border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 40%, transparent)',
            }}
          >
            {(['stiletto', 'kitten', 'block', 'flared'] as const).map((type) => (
              <button
                key={type}
                onClick={() => { haptic(); setHeelType(type) }}
                className="py-1.5 text-[11px] font-medium rounded-lg transition-colors"
                style={
                  heelType === type
                    ? {
                        background: 'var(--color-accent, #D8A35C)',
                        color: 'var(--color-bg, #1C1816)',
                      }
                    : { color: 'var(--color-muted, #B9ACA0)' }
                }
              >
                {t[type]}
              </button>
            ))}
          </div>
        )}

        {/* Типы рокера — только Рокер */}
        {soleType === 'rocker' && (
          <div
            className="grid grid-cols-3 gap-1 md:gap-2 p-1 rounded-xl calc-segment"
            style={{
              background: 'var(--color-surface, #25201C)',
              border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 40%, transparent)',
            }}
          >
            {([
              { type: 'forefoot' as const, labelKey: 'rockerForefoot' as const },
              { type: 'heelToToe' as const, labelKey: 'rockerHeelToToe' as const },
              { type: 'negative' as const, labelKey: 'rockerNegative' as const },
            ]).map(({ type, labelKey }) => (
              <button
                key={type}
                onClick={() => handleRockerType(type)}
                className="py-1.5 text-[10px] md:text-[11px] font-medium rounded-lg transition-colors leading-tight"
                style={
                  rockerType === type
                    ? {
                        background: 'var(--color-accent, #D8A35C)',
                        color: 'var(--color-bg, #1C1816)',
                      }
                    : { color: 'var(--color-muted, #B9ACA0)' }
                }
              >
                {t[labelKey]}
              </button>
            ))}
          </div>
        )}

        {/* Степперы */}
        <div className="grid grid-cols-2 gap-1.5 md:gap-3">
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
          onClick={() => { haptic(); setShowSpecs(!showSpecs); setOpenInfo(null) }}
          className="w-full py-2 px-3 rounded-xl text-[11px] font-medium flex items-center justify-between"
          style={{
            background: 'var(--color-surface, #25201C)',
            border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 40%, transparent)',
          }}
        >
          <span>{t.specsBtn}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform ${showSpecs ? 'rotate-180' : ''}`}
            style={{ color: 'var(--color-muted, #B9ACA0)' }}
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
              <div
                className="p-2.5 md:p-4 rounded-xl text-[10px] space-y-1.5 calc-result-card"
                style={{
                  background: 'var(--color-surface, #25201C)',
                  border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 40%, transparent)',
                  color: 'var(--color-muted, #B9ACA0)',
                }}
              >
                <SpecRow
                  label={t.specПерекат}
                  value={`${rockerStartPct}%`}
                  infoKey="перекат"
                  openInfo={openInfo}
                  onToggleInfo={toggleInfo}
                  infoText={infos.перекат}
                />
                <SpecRow
                  label={t.specГеленок}
                  value={`${eng.shankLength} мм`}
                  infoKey="геленок"
                  openInfo={openInfo}
                  onToggleInfo={toggleInfo}
                  infoText={infos.геленок}
                />
                <SpecRow
                  label={t.specСталь}
                  value={`${eng.steelThickness.toFixed(1)} мм`}
                  infoKey="сталь"
                  openInfo={openInfo}
                  onToggleInfo={toggleInfo}
                  infoText={infos.сталь}
                />
                <SpecRow
                  label="L_eff"
                  value={`${eng.lEff.toFixed(1)} мм`}
                  infoKey="lEff"
                  openInfo={openInfo}
                  onToggleInfo={toggleInfo}
                  infoText={infos.lEff}
                />
                <SpecRow
                  label="Heel Center"
                  value={`${HEEL_CONST.HEEL_CENTER_RATIO * 100}%`}
                  infoKey="heelCenter"
                  openInfo={openInfo}
                  onToggleInfo={toggleInfo}
                  infoText={infos.heelCenter}
                />

                {soleType === 'flat' && (
                  <>
                    <SpecRow
                      label={t.specСмещение}
                      value={`${heelTipOffsetMm} мм`}
                      danger={eng.heelOffsetTooFarBack || eng.heelOffsetTooFarForward}
                      infoKey="смещение"
                      openInfo={openInfo}
                      onToggleInfo={toggleInfo}
                      infoText={infos.смещение}
                    />
                    <SpecRow
                      label={t.specНабойка}
                      value={`${tipWidthMm} мм`}
                      infoKey="набойка"
                      openInfo={openInfo}
                      onToggleInfo={toggleInfo}
                      infoText={infos.набойка}
                    />
                    <SpecRow
                      label={t.invertRisk}
                      value={`${eng.inversionRisk}%`}
                      danger={eng.inversionRisk >= 55}
                      infoKey="invertRisk"
                      openInfo={openInfo}
                      onToggleInfo={toggleInfo}
                      infoText={infos.invertRisk}
                    />
                    {(heelType === 'kitten' || heelType === 'flared') && (
                      <SpecRow
                        label={t.entryAngle}
                        value={`${eng.entryAngleDeg}°`}
                        infoKey="entryAngle"
                        openInfo={openInfo}
                        onToggleInfo={toggleInfo}
                        infoText={infos.entryAngle}
                      />
                    )}
                  </>
                )}

                {/* Клинико-ортопедические параметры */}
                {eng.requiresMetatarsalPad && eng.metatarsalPadPosMm != null && (
                  <>
                    <SpecRow
                      label={t.padPos}
                      value={`${eng.metatarsalPadPosMm} мм`}
                      infoKey="padPos"
                      openInfo={openInfo}
                      onToggleInfo={toggleInfo}
                      infoText={infos.padPos}
                    />
                    <SpecRow
                      label={t.padHeight}
                      value={`${eng.metatarsalPadHeightMm} мм`}
                      infoKey="padHeight"
                      openInfo={openInfo}
                      onToggleInfo={toggleInfo}
                      infoText={infos.padHeight}
                    />
                  </>
                )}

                {eng.apexM1_Mm != null && (
                  <>
                    <SpecRow
                      label={t.apexM1}
                      value={`${eng.apexM1_Mm} мм`}
                      infoKey="apexM1"
                      openInfo={openInfo}
                      onToggleInfo={toggleInfo}
                      infoText={infos.apexM1}
                    />
                    <SpecRow
                      label={t.apexM5}
                      value={`${eng.apexM5_Mm} мм`}
                      infoKey="apexM5"
                      openInfo={openInfo}
                      onToggleInfo={toggleInfo}
                      infoText={infos.apexM5}
                    />
                  </>
                )}

                {soleType === 'rocker' && eng.carbonInsertThicknessMm > 0 && (
                  <SpecRow
                    label={t.carbonInsert}
                    value={`${eng.carbonInsertThicknessMm} мм`}
                    infoKey="carbonInsert"
                    openInfo={openInfo}
                    onToggleInfo={toggleInfo}
                    infoText={infos.carbonInsert}
                  />
                )}

                <div
                  className="pt-1.5 mt-1 font-mono text-[9px] p-1.5 rounded-lg text-center"
                  style={{
                    borderTop: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 40%, transparent)',
                    color: 'var(--color-accent, #D8A35C)',
                    background: 'color-mix(in srgb, var(--color-bg, #1C1816) 40%, transparent)',
                  }}
                >
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

function SpecRow({
  label,
  value,
  danger,
  infoKey,
  openInfo,
  onToggleInfo,
  infoText,
}: {
  label: string
  value: string
  danger?: boolean
  infoKey: InfoKey
  openInfo: InfoKey | null
  onToggleInfo: (key: InfoKey) => void
  infoText: string
}) {
  const isOpen = openInfo === infoKey
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center gap-2">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="truncate">{label}</span>
          <button
            type="button"
            onClick={() => onToggleInfo(infoKey)}
            className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold leading-none active:scale-90"
            style={{
              background: isOpen
                ? 'var(--color-accent, #D8A35C)'
                : 'color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 80%, transparent)',
              color: isOpen
                ? 'var(--color-bg, #1C1816)'
                : 'var(--color-muted, #B9ACA0)',
              border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 50%, transparent)',
            }}
            aria-label="info"
          >
            !
          </button>
        </span>
        <strong
          className="flex-shrink-0"
          style={{
            color: danger
              ? 'var(--color-danger, #f87171)'
              : 'var(--color-ink, #F5F1EA)',
          }}
        >
          {value}
        </strong>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p
              className="text-[9px] leading-snug p-2 rounded-lg"
              style={{
                background: 'color-mix(in srgb, var(--color-bg, #1C1816) 55%, transparent)',
                color: 'var(--color-muted, #B9ACA0)',
                border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 35%, transparent)',
              }}
            >
              {infoText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
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
    massTitle: 'Распределение массы',
    forefoot: 'Носок',
    rearfoot: 'Пятка',
    invertRisk: 'Риск инверсии',
    entryAngle: 'Угол въезда',
    // Клинико-ортопедические
    padPos: 'Пелот Зейца (поз.)',
    padHeight: 'Высота пелота',
    apexM1: 'Апекс M1',
    apexM5: 'Апекс M5',
    carbonInsert: 'Карбон (толщ.)',
    // Пресеты рокера
    rockerForefoot: 'Метатарзалгия',
    rockerHeelToToe: 'Артроз',
    rockerNegative: 'Диабет. стопа',
    // Подписи в спеке
    specПерекат: 'Перекат',
    specГеленок: 'Геленок',
    specСталь: 'Сталь 65Г',
    specСмещение: 'Смещение',
    specНабойка: 'Набойка',
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
    massTitle: 'Розподіл маси',
    forefoot: 'Носок',
    rearfoot: "П'ятка",
    invertRisk: 'Ризик інверсії',
    entryAngle: 'Кут вʼїзду',
    padPos: 'Пелот Зейца (поз.)',
    padHeight: 'Висота пелота',
    apexM1: 'Апекс M1',
    apexM5: 'Апекс M5',
    carbonInsert: 'Карбон (товщ.)',
    rockerForefoot: 'Метатарзалгія',
    rockerHeelToToe: 'Артроз',
    rockerNegative: 'Діабет. стопа',
    specПерекат: 'Перекат',
    specГеленок: 'Геленк',
    specСталь: 'Сталь 65Г',
    specСмещение: 'Зміщення',
    specНабойка: 'Набійка',
  }
  return lang === 'uk' ? uk : ru
}

function getInfoTexts(lang: Lang): Record<InfoKey, string> {
  if (lang === 'uk') {
    return {
      перекат:
        'Точка початку перекату (rocker start) — відсоток довжини колодки, з якого починається підйом/згинання підошви. Типово 55–75%. Впливає на довжину геленка і розвантаження плюсни.',
      геленок:
        'Жорстка вставка (супінатор/shank) від центру пʼятки до зони плюсни. Не дає підошві прогинатися під навантаженням і стабілізує каблук.',
      сталь:
        'Рекомендована товщина сталевої пластини 65Г за величиною перепаду (net rise). Вища платформа/каблук — товстіша пластина.',
      lEff:
        'Ефективна довжина важеля (≈ 73% довжини колодки). У формулі кута: Angle = arcsin((H − T) / L_eff). Від неї залежить внутрішній нахил і навантаження на плюсну.',
      heelCenter:
        'Умовний центр опори пʼятки (\~15% довжини колодки від задника). Від цієї точки рахується довжина геленка до зони перекату.',
      смещение:
        'Зміщення набійки відносно осі каблука. Занадто назад — ризик поломки супінатора; занадто вперед (>5 мм) — нестабільність посадки.',
      набойка:
        'Ширина контактної площадки каблука з підлогою. Вузька набійка при високому каблуці різко підвищує ризик інверсії (підвертання).',
      invertRisk:
        'Імовірність підвертання щиколотки. Розраховується з ширини набійки, типу каблука і висоти. ≥55% — критично, потрібна ширша набійка.',
      entryAngle:
        'Кут «вʼїзду» каблука (kitten/flared): atan2(перепад, половина ширини набійки). Показує, наскільки агресивно каблук «заходить» у опору.',
      padPos:
        'Позиція метатарзального пелота Зейца від пʼятки. Ставиться під головками плюсни (\~60% довжини колодки − 12 мм) для розвантаження нервів при критичному навантаженні.',
      padHeight:
        'Висота пелота (4–6 мм) залежить від перепаду: чим вищий підйом, тим вищий пелот для адекватної розгрузки.',
      apexM1:
        'Апекс M1 — внутрішня точка суглобової лінії плюсни (I палець). Скос 12–15°: apexM1 ≈ точка перекату − 5 мм. Орієнтир для рокера і пелота.',
      apexM5:
        'Апекс M5 — зовнішня точка (V палець). Зсунута проксимально відносно M1 на \~4.5% довжини колодки через діагональний скос суглобової лінії.',
      carbonInsert:
        'Мінімальна товщина карбонової вставки в зоні плюсни. Рокер працює лише якщо підошва не згинається в пучках — потрібна жорсткість.',
    }
  }
  return {
    перекат:
      'Точка начала переката (rocker start) — процент длины колодки, с которого начинается подъём/сгибание подошвы. Обычно 55–75%. Влияет на длину геленка и разгрузку плюсны.',
    геленок:
      'Жёсткая вставка (супинатор/shank) от центра пятки до зоны плюсны. Не даёт подошве прогибаться под нагрузкой и стабилизирует каблук.',
    сталь:
      'Рекомендуемая толщина стальной пластины 65Г по величине перепада (net rise). Выше платформа/каблук — толще пластина.',
    lEff:
      'Эффективная длина рычага (≈ 73% длины колодки). В формуле угла: Angle = arcsin((H − T) / L_eff). От неё зависят внутренний наклон и нагрузка на плюсну.',
    heelCenter:
      'Условный центр опоры пятки (\~15% длины колодки от задника). От этой точки считается длина геленка до зоны переката.',
    смещение:
      'Смещение набойки относительно оси каблука. Слишком назад — риск поломки супинатора; слишком вперёд (>5 мм) — нестабильность посадки.',
    набойка:
      'Ширина контактной площадки каблука с полом. Узкая набойка при высоком каблуке резко повышает риск инверсии (подворачивания).',
    invertRisk:
      'Вероятность подворачивания лодыжки. Считается из ширины набойки, типа каблука и высоты. ≥55% — критично, нужна более широкая набойка.',
    entryAngle:
      'Угол «въезда» каблука (kitten/flared): atan2(перепад, половина ширины набойки). Показывает, насколько агрессивно каблук «заходит» в опору.',
    padPos:
      'Позиция метатарзального пелота Зейца от пятки. Ставится под головками плюсен (\~60% длины колодки − 12 мм) для разгрузки нервов при критической нагрузке.',
    padHeight:
      'Высота пелота (4–6 мм) зависит от перепада: чем выше подъём, тем выше пелот для адекватной разгрузки.',
    apexM1:
      'Апекс M1 — внутренняя точка суставной линии плюсен (I палец). Скос 12–15°: apexM1 ≈ точка переката − 5 мм. Ориентир для рокера и пелота.',
    apexM5:
      'Апекс M5 — наружная точка (V палец). Смещена проксимально относительно M1 на \~4.5% длины колодки из‑за диагонального скоса суставной линии.',
    carbonInsert:
      'Минимальная толщина карбоновой вставки в зоне плюсен. Рокер работает только если подошва не гнётся в пучках — нужна жёсткость.',
  }
 }
