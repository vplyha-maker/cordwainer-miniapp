import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react'
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

function haptic(style: 'light' | 'medium' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
    else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 20 : 40)
  } catch {}
}

export function HeelCalcPage({ onBack, lang }: Props) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') return document.documentElement.classList.contains('dark')
    return true
  })

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

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
  const [activeInfo, setActiveInfo] = useState<InfoKey | null>(null)

  useEffect(() => {
    if (toeThickness > heelHeight + 10) setToeThickness(heelHeight + 10)
  }, [heelHeight, toeThickness])

  useEffect(() => {
    if (soleType === 'flat') setTipWidthMm(defaultTipWidth(heelType))
  }, [heelType, soleType])

  useEffect(() => {
    if (soleType === 'rocker') {
      const preset = ROCKER_PRESETS[rockerType]
      setRockerAngle(preset.angle)
      setRockerStartPct(preset.startPct)
    }
  }, [rockerType, soleType])

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
    haptic('light')
    setRockerType(type)
  }

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'

  return (
    <div className={`relative flex flex-col min-h-[100dvh] w-full max-w-[100vw] transition-colors duration-500 ${cBg} ${cText} overflow-hidden overflow-x-hidden`}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; -webkit-touch-callout: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .stagger-item {
          opacity: 0;
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* HEADER */}
      <header className="px-6 pt-7 pb-3 flex items-center justify-between z-20 shrink-0 border-b border-[var(--color-border)]">
        <button 
          type="button"
          onClick={() => { haptic('light'); onBack(); }}
          className={`group flex items-center gap-2.5 text-[9px] font-sans uppercase tracking-[0.25em] outline-none border-none bg-transparent cursor-pointer p-1 -m-1 ${cTextMuted} transition-colors touch-manipulation`}
        >
          <span className="transform transition-transform group-active:-translate-x-1">←</span>
          <span>ATELIER INDEX</span>
        </button>
        <span className="font-mono text-[8px] uppercase tracking-[0.3em] opacity-40">
          ARCHIVE // CALC N° 03
        </span>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-24 scrollbar-hide w-full">
        
        {/* Title */}
        <div className="stagger-item my-7 w-full" style={{ animationDelay: '0.05s' }}>
          <p className={`text-[8.5px] font-sans uppercase tracking-[0.35em] mb-2 ${cTextMuted}`}>
            {t.desc}
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-light tracking-tight">
            {t.title}
          </h1>
        </div>

        {/* Mode & Type Toggles */}
        <div className="stagger-item mb-7 space-y-3" style={{ animationDelay: '0.1s' }}>
          <div className={`flex gap-6 pb-2.5 border-b ${cLine}`}>
            {(['flat', 'rocker'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => { haptic('light'); setSoleType(type) }}
                className={`text-[9px] font-sans uppercase tracking-[0.25em] transition-all outline-none border-none bg-transparent p-1 -m-1 cursor-pointer touch-manipulation ${
                  soleType === type ? `italic ${cText} underline underline-offset-8 opacity-100` : `${cTextMuted} opacity-50 hover:opacity-100`
                }`}
              >
                {t[type]}
              </button>
            ))}
          </div>

          <div className="flex overflow-x-auto gap-5 pb-1 scrollbar-hide items-center">
            {soleType === 'flat' ? (
              (['stiletto', 'kitten', 'block', 'flared'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { haptic('light'); setHeelType(type) }}
                  className={`text-[11px] font-serif transition-all outline-none border-none bg-transparent p-1 -m-1 cursor-pointer whitespace-nowrap touch-manipulation ${
                    heelType === type ? `italic ${cText} opacity-100 font-medium scale-105 origin-left` : `${cTextMuted} opacity-50 hover:opacity-100`
                  }`}
                >
                  {t[type]}
                </button>
              ))
            ) : (
              ([
                { type: 'forefoot' as const, labelKey: 'rockerForefoot' as const },
                { type: 'heelToToe' as const, labelKey: 'rockerHeelToToe' as const },
                { type: 'negative' as const, labelKey: 'rockerNegative' as const },
              ]).map(({ type, labelKey }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleRockerType(type)}
                  className={`text-[11px] font-serif transition-all outline-none border-none bg-transparent p-1 -m-1 cursor-pointer whitespace-nowrap touch-manipulation ${
                    rockerType === type ? `italic ${cText} opacity-100 font-medium scale-105 origin-left` : `${cTextMuted} opacity-50 hover:opacity-100`
                  }`}
                >
                  {t[labelKey]}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Visualizer Canvas */}
        <div className="stagger-item w-full mb-8" style={{ animationDelay: '0.15s' }}>
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
        </div>

        {/* Controls Grid */}
        <div className="stagger-item grid grid-cols-2 gap-4 mb-10" style={{ animationDelay: '0.2s' }}>
          <JournalStepper label={t.size} value={shoeSize} min={33} max={48} onChange={setShoeSize} isDark={isDark} />
          <JournalStepper label={t.heel} value={heelHeight} min={10} max={130} onChange={setHeelHeight} unit={t.mm} isDark={isDark} />
          <JournalStepper label={t.toe} value={toeThickness} min={0} max={Math.min(HEEL_CONST.MAX_TOE, heelHeight + 10)} onChange={setToeThickness} unit={t.mm} isDark={isDark} />
          <JournalStepper label={t.start} value={rockerStartPct} min={55} max={75} onChange={setRockerStartPct} unit="%" isDark={isDark} />
          
          {soleType === 'rocker' ? (
            <JournalStepper label={t.angle} value={rockerAngle} min={5} max={30} onChange={setRockerAngle} unit="°" isDark={isDark} />
          ) : (
            <>
              <JournalStepper label={t.offset} value={heelTipOffsetMm} min={-15} max={15} onChange={setHeelTipOffsetMm} unit={t.mm} isDark={isDark} />
              <JournalStepper label={t.tipW} value={tipWidthMm} min={6} max={45} onChange={setTipWidthMm} unit={t.mm} isDark={isDark} />
            </>
          )}
        </div>

        {/* Specs Accordion */}
        <div className="stagger-item w-full pt-2" style={{ animationDelay: '0.25s' }}>
          <button
            type="button"
            onClick={() => { haptic('light'); setShowSpecs(!showSpecs); }}
            className={`w-full flex items-center justify-between py-4 border-y transition-colors outline-none cursor-pointer ${cLine} ${cText} touch-manipulation`}
          >
            <span className="text-[9px] font-sans uppercase tracking-[0.25em] font-medium">
              {t.specsBtn}
            </span>
            <motion.div animate={{ rotate: showSpecs ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <span className="text-xs">↓</span>
            </motion.div>
          </button>

          <AnimatePresence>
            {showSpecs && (
              <motion.div
                key="specs-accordion" 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="py-6 space-y-4 border-b border-[var(--color-border)]">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <SpecCell label={t.specПерекат} value={`${rockerStartPct}%`} infoKey="перекат" onInfo={() => setActiveInfo('перекат')} isDark={isDark} />
                    <SpecCell label={t.specГеленок} value={`${eng.shankLength}`} unit={t.mm} infoKey="геленок" onInfo={() => setActiveInfo('геленок')} isDark={isDark} />
                    <SpecCell label={t.specСталь} value={`${eng.steelThickness.toFixed(1)}`} unit={t.mm} infoKey="сталь" onInfo={() => setActiveInfo('сталь')} isDark={isDark} />
                    <SpecCell label="L_eff" value={`${eng.lEff.toFixed(1)}`} unit={t.mm} infoKey="lEff" onInfo={() => setActiveInfo('lEff')} isDark={isDark} />
                    <SpecCell label="Heel Center" value={`${HEEL_CONST.HEEL_CENTER_RATIO * 100}%`} infoKey="heelCenter" onInfo={() => setActiveInfo('heelCenter')} isDark={isDark} />
                    
                    {soleType === 'flat' && (
                      <>
                        <SpecCell label={t.specСмещение} value={`${heelTipOffsetMm}`} unit={t.mm} danger={eng.heelOffsetTooFarBack || eng.heelOffsetTooFarForward} infoKey="смещение" onInfo={() => setActiveInfo('смещение')} isDark={isDark} />
                        <SpecCell label={t.specНабойка} value={`${tipWidthMm}`} unit={t.mm} infoKey="набойка" onInfo={() => setActiveInfo('набойка')} isDark={isDark} />
                        <SpecCell label={t.invertRisk} value={`${eng.inversionRisk}%`} danger={eng.inversionRisk >= 55} infoKey="invertRisk" onInfo={() => setActiveInfo('invertRisk')} isDark={isDark} />
                        {(heelType === 'kitten' || heelType === 'flared') && (
                          <SpecCell label={t.entryAngle} value={`${eng.entryAngleDeg}°`} infoKey="entryAngle" onInfo={() => setActiveInfo('entryAngle')} isDark={isDark} />
                        )}
                      </>
                    )}

                    {eng.requiresMetatarsalPad && eng.metatarsalPadPosMm != null && (
                      <>
                        <SpecCell label={t.padPos} value={`${eng.metatarsalPadPosMm}`} unit={t.mm} infoKey="padPos" onInfo={() => setActiveInfo('padPos')} isDark={isDark} />
                        <SpecCell label={t.padHeight} value={`${eng.metatarsalPadHeightMm}`} unit={t.mm} infoKey="padHeight" onInfo={() => setActiveInfo('padHeight')} isDark={isDark} />
                      </>
                    )}

                    {eng.apexM1_Mm != null && (
                      <>
                        <SpecCell label={t.apexM1} value={`${eng.apexM1_Mm}`} unit={t.mm} infoKey="apexM1" onInfo={() => setActiveInfo('apexM1')} isDark={isDark} />
                        <SpecCell label={t.apexM5} value={`${eng.apexM5_Mm}`} unit={t.mm} infoKey="apexM5" onInfo={() => setActiveInfo('apexM5')} isDark={isDark} />
                      </>
                    )}

                    {soleType === 'rocker' && eng.carbonInsertThicknessMm > 0 && (
                      <SpecCell label={t.carbonInsert} value={`${eng.carbonInsertThicknessMm}`} unit={t.mm} infoKey="carbonInsert" onInfo={() => setActiveInfo('carbonInsert')} isDark={isDark} />
                    )}
                  </div>

                  <div className={`pt-3 border-t ${cLine} text-center opacity-60`}>
                    <span className="font-mono text-[8px] uppercase tracking-widest">
                      Angle = arcsin((H − T) / L_eff)
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* INFO MODAL */}
      <AnimatePresence>
        {activeInfo && (
          <motion.div
            key="info-modal-backdrop" 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm cursor-pointer touch-manipulation"
            onClick={() => setActiveInfo(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
              onClick={e => e.stopPropagation()} 
              className={`w-full max-w-[340px] p-8 border ${cLine} ${cBg} shadow-2xl flex flex-col cursor-default relative z-10 rounded-[16px]`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[8px] uppercase tracking-[0.3em] opacity-50">
                  SPECIFICATION ARCHIVE
                </span>
                <button
                  type="button"
                  onClick={() => setActiveInfo(null)}
                  className="text-xs opacity-60 hover:opacity-150 p-1"
                >
                  ✕
                </button>
              </div>

              <h3 className={`font-serif text-2xl leading-tight mb-3 ${cText} capitalize`}>
                 {activeInfo}
              </h3>
              <p className={`text-[12px] font-sans font-light leading-[1.65] mb-8 ${cTextMuted}`}>
                {infos[activeInfo]}
              </p>
              
              <button
                type="button"
                onClick={() => setActiveInfo(null)}
                className="w-full py-3.5 border border-[var(--color-border)] text-[9px] font-sans uppercase tracking-[0.3em] cursor-pointer bg-[var(--color-ink)] text-[var(--color-bg)] font-medium rounded-[10px] active:scale-95 transition-transform"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ------------------------------------------------------------------
// ЖУРНАЛЬНЫЕ КОМПОНЕНТЫ УПРАВЛЕНИЯ
// ------------------------------------------------------------------

function JournalStepper({ label, value, min, max, onChange, unit = '', isDark }: any) {
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'

  return (
    <div className={`flex flex-col border ${cLine} rounded-[14px] p-3.5 bg-[var(--color-surface)] justify-between shadow-[0_4px_20px_rgb(0,0,0,0.02)]`}>
      <span className={`text-[8px] uppercase tracking-[0.25em] mb-2 ${cTextMuted} truncate pr-1 font-mono`}>
        {label}
      </span>
      <div className="flex items-center justify-between">
        <button 
          type="button"
          onClick={() => { if(value > min) { haptic('light'); onChange(value - 1) } }} 
          className={`w-7 h-7 flex items-center justify-center rounded-[8px] bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] text-base leading-none outline-none cursor-pointer touch-manipulation ${value <= min ? 'opacity-20 cursor-not-allowed' : `active:scale-95 ${cText}`}`}
        >
          −
        </button>
        <span className={`font-serif text-2xl tabular-nums ${cText}`}>
          {value}<span className={`font-sans text-[9px] ml-0.5 opacity-60`}>{unit}</span>
        </span>
        <button 
          type="button"
          onClick={() => { if(value < max) { haptic('light'); onChange(value + 1) } }} 
          className={`w-7 h-7 flex items-center justify-center rounded-[8px] bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] text-base leading-none outline-none cursor-pointer touch-manipulation ${value >= max ? 'opacity-20 cursor-not-allowed' : `active:scale-95 ${cText}`}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

function SpecCell({ label, value, unit = '', danger = false, onInfo, isDark }: any) {
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cDanger = '#E11D48'

  return (
    <div className={`flex flex-col border-b ${cLine} pb-3 relative`}>
      <div 
        className="flex items-center justify-between mb-1.5 cursor-pointer touch-manipulation group"
        onClick={(e) => {
          e.stopPropagation();
          onInfo();
        }}
      >
        <span className={`text-[8px] uppercase tracking-[0.2em] truncate ${cTextMuted} font-mono`}>
          {label}
        </span>
        <div className={`w-3.5 h-3.5 rounded-full border ${cLine} flex items-center justify-center text-[7.5px] font-mono font-bold shrink-0 opacity-60 group-hover:opacity-100 transition-opacity`}>
          ?
        </div>
      </div>
      
      <span className="font-serif text-xl md:text-2xl tabular-nums" style={{ color: danger ? cDanger : cText }}>
        {value}
        {unit && <span className="font-sans text-[9px] ml-1 opacity-60">{unit}</span>}
      </span>
    </div>
  )
}

// ------------------------------------------------------------------
// ТЕКСТОВЫЕ ДАННЫЕ И ЛОКАЛИЗАЦИЯ
// ------------------------------------------------------------------

function getLabels(lang: Lang) {
  const C = HEEL_CONST
  const ru = {
    title: 'Инженерия каблука',
    desc: 'Биомеханический баланс & Аудит профиля',
    size: 'Размер', heel: 'Каблук', toe: 'Платформа', angle: 'Угол', start: 'Перекат',
    fixBtn: 'Автобаланс', offset: 'Смещение', tipW: 'Набойка',
    internalSlope: 'Наклон колодки:', loadLbl: 'Нагрузка на плюсну:',
    successTitle: 'БАЛАНС В НОРМЕ', successDesc: 'Физиологическая нагрузка сбалансирована.',
    warnTitle: 'ВЫСОКИЙ ПОДЪЕМ',
    warn1Desc: `Угол больше ${C.COMFORT_ANGLE}°. Увеличьте платформу или уменьшите каблук.`,
    warn2Desc: 'Чрезмерный рокер при низком каблуке.',
    errTitle: 'КРИТИЧЕСКИЙ НАКЛОН',
    errDesc: `Угол колодки > ${C.CRITICAL_ANGLE}°. Требуется утолщение платформы или снижение каблука.`,
    padTitle: 'КРИТИЧЕСКАЯ НАГРУЗКА НА ПЛЮСНУ',
    padDesc: 'Требуется обязательная установка встроенного метатарзального пелота в стельку.',
    negDropTitle: 'ОБРАТНЫЙ УКЛОН', negDropDesc: 'Платформа выше каблука. Нарушение биомеханики.',
    heelBackTitle: 'КАБЛУК ЗАВАЛЕН НАЗАД',
    heelBackDesc: 'Ошибка: Каблук завален назад, произойдет перелом супинатора.',
    heelFwdTitle: 'СМЕЩЕНИЕ ВПЕРЁД',
    heelFwdDesc: `Набойка смещена вперёд больше чем на ${C.MAX_HEEL_OFFSET_MM} мм. Снижена стабильность.`,
    invertTitle: 'РИСК ИНВЕРСИИ',
    invertDesc: 'Набойка слишком узкая при высоком каблуке — высокий риск подворачивания.',
    heelLbl: 'ПЯТКА', toeLbl: 'НОСОК',
    stiletto: 'Шпилька', block: 'Блок', kitten: 'Рюмочка', flared: 'Трапеция',
    flat: 'Стандарт', rocker: 'Рокер',
    specsBtn: 'Техническая спецификация ↗', dropLbl: 'Перепад',
    massTitle: 'Распределение массы',
    forefoot: 'Носок',
    rearfoot: 'Пятка',
    invertRisk: 'Риск инверсии',
    entryAngle: 'Угол въезда',
    padPos: 'Пелот Зейца',
    padHeight: 'Высота пелота',
    apexM1: 'Апекс M1',
    apexM5: 'Апекс M5',
    carbonInsert: 'Карбон (толщ.)',
    rockerForefoot: 'Метатарзалгия',
    rockerHeelToToe: 'Артроз',
    rockerNegative: 'Диабет. стопа',
    specПерекат: 'Перекат',
    specГеленок: 'Геленок',
    specСталь: 'Сталь 65Г',
    specСмещение: 'Смещение',
    specНабойка: 'Набойка',
    mm: 'mm'
  }
  const uk = {
    ...ru,
    title: 'Інженерія каблука',
    desc: 'Біомеханічний баланс & Аудит профілю',
    size: 'Розмір', heel: 'Підбір', toe: 'Платформа', angle: 'Кут', start: 'Перекат',
    fixBtn: 'Автобаланс', offset: 'Зміщення', tipW: 'Набійка',
    internalSlope: 'Нахил колодки:', loadLbl: 'Навантаження на плюсну:',
    successTitle: 'БАЛАНС У НОРМІ', successDesc: 'Фізіологічне навантаження збалансоване.',
    warnTitle: 'ВИСОКИЙ ПІДЙОМ',
    warn1Desc: `Кут більше ${C.COMFORT_ANGLE}°. Збільште платформу або зменште підбір.`,
    warn2Desc: 'Надмірний рокер при низькому підборі.',
    errTitle: 'КРИТИЧНИЙ НАХИЛ',
    errDesc: `Кут колодки > ${C.CRITICAL_ANGLE}°. Потрібне потовщення платформи або зниження підбора.`,
    padTitle: 'КРИТИЧНЕ НАВАНТАЖЕННЯ НА ПЛЮСНУ',
    padDesc: 'Потрібна обовʼязкова установка вбудованого метатарзального пелота у устілку.',
    negDropTitle: 'ЗВОРОТНІЙ УХИЛ', negDropDesc: 'Платформа вища за підбор. Порушення біомеханіки.',
    heelBackTitle: 'ПІДБОР ЗАВАЛЕНИЙ НАЗАД',
    heelBackDesc: 'Помилка: Підбор завалений назад, відбудеться перелом супінатора.',
    heelFwdTitle: 'ЗМІЩЕННЯ ВПЕРЕД',
    heelFwdDesc: `Набійка зміщена вперед більше ніж на ${C.MAX_HEEL_OFFSET_MM} мм. Знижена стабільність.`,
    invertTitle: 'РИЗИК ІНВЕРСІЇ',
    invertDesc: 'Набійка занадто вузька при високому підборі — ризик підвертання.',
    heelLbl: "П'ЯТКА", toeLbl: 'НОСОК',
    stiletto: 'Шпилька', block: 'Блок', kitten: 'Чарочка', flared: 'Трапеція',
    flat: 'Стандарт', rocker: 'Рокер',
    specsBtn: 'Технічна специфікація ↗', dropLbl: 'Перепад',
    massTitle: 'Розподіл маси',
    forefoot: 'Носок',
    rearfoot: "П'ятка",
    invertRisk: 'Ризик інверсії',
    entryAngle: 'Кут вʼїзду',
    padPos: 'Пелот Зейца',
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
    mm: 'mm'
  }
  const de = {
    ...ru,
    title: 'Absatz-Engineering',
    desc: 'Biokinetische Balance & Profil-Audit',
    size: 'Größe', heel: 'Absatz', toe: 'Plateau', angle: 'Winkel', start: 'Rolle',
    fixBtn: 'Autobalan.', offset: 'Versatz', tipW: 'Fleck',
    internalSlope: 'Leistenneigung:', loadLbl: 'Vorfußbelastung:',
    successTitle: 'BALANCE OPTIMAL', successDesc: 'Physiologische Norm im Gleichgewicht.',
    warnTitle: 'HOHER SPRENGUNGSWINKEL',
    warn1Desc: `Winkel über ${C.COMFORT_ANGLE}°. Plateau erhöhen oder Absatz reduzieren.`,
    warn2Desc: 'Zu starker Rocker bei niedrigem Absatz.',
    errTitle: 'KRITISCHE NEIGUNG',
    errDesc: `Leistenwinkel > ${C.CRITICAL_ANGLE}°. Plateaudicke erhöhen oder Absatz verringern.`,
    padTitle: 'KRITISCHE VORFUẞBELASTUNG',
    padDesc: 'Einbau einer Pelotte zur Entlastung zwingend erforderlich.',
    negDropTitle: 'NEGATIVE SPRENGUNG', negDropDesc: 'Plateau höher als Absatz.',
    heelBackTitle: 'ABSATZ NACH HINTEN GENEIGT',
    heelBackDesc: 'Fehler: Absatz zu weit hinten. Gelenkfederbruchgefahr.',
    heelFwdTitle: 'ABSATZ NACH VORNE VERLAGERT',
    heelFwdDesc: `Absatzfleck > ${C.MAX_HEEL_OFFSET_MM} mm nach vorne.`,
    invertTitle: 'INVERSIONSRISIKO',
    invertDesc: 'Absatzfleck zu schmal bei hohem Absatz — Umknickgefahr.',
    heelLbl: 'FERSE', toeLbl: 'SPITZE',
    stiletto: 'Stiletto', block: 'Block', kitten: 'Kitten', flared: 'Ausgestellt',
    flat: 'Standard', rocker: 'Rocker',
    specsBtn: 'Technische Spezifikation ↗', dropLbl: 'Sprengung',
    massTitle: 'Gewichtsverteilung',
    forefoot: 'Vorfuß',
    rearfoot: 'Ferse',
    invertRisk: 'Inversionsrisiko',
    entryAngle: 'Eintrittswinkel',
    padPos: 'Pelotte Pos.',
    padHeight: 'Pelottenhöhe',
    apexM1: 'Apex M1',
    apexM5: 'Apex M5',
    carbonInsert: 'Carbon (Dicke)',
    rockerForefoot: 'Metatarsalgie',
    rockerHeelToToe: 'Arthrose',
    rockerNegative: 'Diabet. Fuß',
    specПерекат: 'Rolle',
    specГеленок: 'Gelenk',
    specСталь: 'Stahlfeder',
    specСмещение: 'Versatz',
    specНабойка: 'Fleck',
    mm: 'mm'
  }
  
  if (lang === 'uk') return uk;
  if (lang === 'de') return de;
  return ru;
}

function getInfoTexts(lang: Lang): Record<InfoKey, string> {
  if (lang === 'uk') {
    return {
      перекат: 'Точка початку перекату (rocker start) — відсоток довжини колодки, з якого починається підйом/згинання підошви. Типово 55–75%.',
      геленок: 'Жорстка вставка (супінатор/shank) від центру пʼятки до зони плюсни. Не дає підошві прогинатися під навантаженням і стабілізує каблук.',
      сталь: 'Рекомендована товщина сталевої пластини 65Г за величиною перепаду (net rise). Вища платформа/каблук — товстіша пластина.',
      lEff: 'Ефективна довжина важеля (≈ 73% довжини колодки). Від неї залежить внутрішній нахил і навантаження на плюсну.',
      heelCenter: 'Умовний центр опори пʼятки (\\~15% довжини колодки від задника). Від цієї точки рахується довжина геленка.',
      смещение: 'Зміщення набійки відносно осі каблука. Занадто назад — ризик поломки супінатора; занадто вперед — нестабільність посадки.',
      набойка: 'Ширина контактної площадки каблука з підлогою. Вузька набійка при високому каблуці різко підвищує ризик інверсії (підвертання).',
      invertRisk: 'Імовірність підвертання щиколотки. Розраховується з ширини набійки, типу каблука і висоти.',
      entryAngle: 'Кут «вʼїзду» каблука (kitten/flared). Показує, наскільки агресивно каблук «заходить» у опору.',
      padPos: 'Позиція метатарзального пелота Зейца від пʼятки. Ставиться під головками плюсни для розвантаження нервів при критичному навантаженні.',
      padHeight: 'Висота пелота (4–6 мм) залежить від перепаду: чим вищий підйом, тим вищий пелот для адекватної розгрузки.',
      apexM1: 'Апекс M1 — внутрішня точка суглобової лінії плюсни (I палець). Орієнтир для рокера і пелота.',
      apexM5: 'Апекс M5 — зовнішня точка (V палець). Зсунута проксимально відносно M1 на \\~4.5% довжини колодки.',
      carbonInsert: 'Мінімальна товщина карбоновой вставки в зоні плюсни. Рокер працює лише якщо підошва не згинається в пучках.',
    }
  }
  if (lang === 'de') {
    return {
      перекат: 'Ballenrolle (rocker start) — Prozentsatz der Leistenlänge, bei dem die Sohlenbiegung beginnt. Typischerweise 55–75%.',
      геленок: 'Die Gelenkfeder (Shank) von der Fersenmitte bis zur Ballenlinie. Verhindert das Durchbiegen der Sohle unter Belastung.',
      сталь: 'Empfohlene Dicke der Stahlfeder basierend auf der effektiven Sprengung. Je höher Plateau/Absatz, desto dicker die Feder.',
      lEff: 'Effektive Hebellänge (≈ 73% der Leistenlänge). Bestimmt die innere Neigung und die Vorfußbelastung.',
      heelCenter: 'Bedingter Fersenauflagepunkt (\\~15% der Leistenlänge von der Ferse entfernt).',
      смещение: 'Versatz des Absatzflecks relativ zur Absatzachse. Zu weit hinten — Gefahr des Gelenkfederbruchs; zu weit vorne — instabiler Stand.',
      набойка: 'Breite der Kontaktfläche des Absatzes. Ein schmaler Fleck erhöht das Inversionsrisiko (Umknicken) drastisch.',
      invertRisk: 'Wahrscheinlichkeit des Umknickens des Sprunggelenks. Berechnet aus Fleckbreite, Absatztyp und -höhe.',
      entryAngle: 'Eintrittswinkel des Absatzes (Kitten/Flared). Zeigt an, wie aggressiv der Absatz auf den Boden trifft.',
      padPos: 'Position der Spreizfußpelotte. Wird hinter den Metatarsalköpfchen platziert, um Nerven zu entlasten.',
      padHeight: 'Pelottenhöhe (4–6 mm) ist abhängig von der Sprengung.',
      apexM1: 'Apex M1 — innerer Punkt der Gelenklinie (Großzehe). Orientierungspunkt für Rocker und Pelotte.',
      apexM5: 'Apex M5 — äußerer Punkt (Kleinzehe). Proximal verschoben relativ zu M1 um \\~4.5% der Leistenlänge.',
      carbonInsert: 'Mindestdicke der Carbonfasereinlage im Ballenbereich. Versteifung ist zwingend erforderlich für Abrollsohlen.',
    }
  }
  return {
    перекат: 'Точка начала переката (rocker start) — процент длины колодки, с которого начинается подъём/сгибание подошвы. Обычно 55–75%.',
    геленок: 'Жёсткая вставка (супинатор/shank) от центра пятки до зоны плюсни. Не даёт подошве прогибаться под нагрузкой и стабилизирует каблук.',
    сталь: 'Рекомендуемая толщина стальной пластины 65Г по величине перепада (net rise). Выше платформа/каблук — толще пластина.',
    lEff: 'Эффективная длина рычага (≈ 73% длины колодки). От неё зависят внутренний наклон и нагрузка на плюсну.',
    heelCenter: 'Условный центр опоры пятки (\\~15% длины колодки от задника). От этой точки считается длина геленка.',
    смещение: 'Смещение набойки относительно оси каблука. Слишком назад — риск поломки супинатора; слишком вперёд — нестабильность посадки.',
    набойка: 'Ширина контактной площадки каблука с полом. Узкая набойка при высоком каблуке резко повышает риск инверсии (подворачивания).',
    invertRisk: 'Вероятность подворачивания лодыжки. Считается из ширины набойки, типа каблука и высоты.',
    entryAngle: 'Угол «въезда» каблука (kitten/flared). Показывает, насколько агрессивно каблук «заходит» в опору.',
    padPos: 'Позиция метатарзального пелота Зейца от пятки. Ставится под головками плюсен для разгрузки нервов при критической нагруке.',
    padHeight: 'Высота пелота (4–6 мм) зависит от перепада: чем выше подъём, тем выше пелот для адекватной разгрузки.',
    apexM1: 'Апекс M1 — внутренняя точка суставной линии плюсен (I палец). Ориентир для рокера и пелота.',
    apexM5: 'Апекс M5 — наружная точка (V палец). Смещена проксимально относительно M1 на \\~4.5% длины колодки.',
    carbonInsert: 'Минимальная толщина карбоновой вставки в зоне плюсен. Рокер работает только если подошва не гнётся в пучках.',
  }
}
