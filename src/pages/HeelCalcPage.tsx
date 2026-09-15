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

const StaticIcon = ({ type, className }: { type: 'length' | 'ball' | 'instep' | 'heel', className?: string }) => {
  const paths = {
    length: "M3 12h18M5 9v6M19 9v6",
    ball: "M12 5c-4.4 0-8 3.1-8 7s3.6 7 8 7 8-3.1 8-7",
    instep: "M4 16c0-6 4-10 8-10s8 4 8 10",
    heel: "M18 6L6 18M7 7l-2 2 2 2"
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`}>
      <path d={paths[type]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
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
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'

  return (
    <div className={`relative flex flex-col min-h-[100dvh] w-full max-w-[100vw] transition-colors duration-500 ${cBg} ${cText} overflow-hidden overflow-x-hidden`}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; -webkit-touch-callout: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .stagger-item {
          opacity: 0;
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* HEADER */}
      <header className="px-6 pt-8 pb-4 flex items-start justify-between z-20 shrink-0">
        <button 
          onClick={() => { haptic('light'); onBack(); }}
          className={`group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors`}
        >
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-24 scrollbar-hide w-full">
        
        {/* Title */}
        <div className="stagger-item mb-8 w-full" style={{ animationDelay: '0.05s' }}>
          <p className={`text-[9px] font-sans font-medium uppercase tracking-[0.4em] mb-4 ${cTextMuted}`}>
            {t.desc}
          </p>
          <h1 className="font-serif text-[13vw] min-[400px]:text-5xl leading-[0.9] tracking-tight">
            {t.title}
          </h1>
        </div>

        {/* Toggles (Horizontal Scroll) */}
        <div className="stagger-item mb-6" style={{ animationDelay: '0.1s' }}>
          <div className={`flex gap-6 pb-3 border-b ${cLine} mb-4`}>
            {(['flat', 'rocker'] as const).map((type) => (
              <button
                key={type}
                onClick={() => { haptic('light'); setSoleType(type) }}
                className={`text-[9px] font-sans uppercase tracking-[0.25em] transition-all outline-none border-none bg-transparent cursor-pointer ${
                  soleType === type ? `italic ${cText} opacity-100` : `${cTextMuted} opacity-60 hover:opacity-100`
                }`}
              >
                {t[type]}
              </button>
            ))}
          </div>

          <div className="flex overflow-x-auto gap-6 pb-2 scrollbar-hide">
            {soleType === 'flat' ? (
              (['stiletto', 'kitten', 'block', 'flared'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => { haptic('light'); setHeelType(type) }}
                  className={`text-[10px] font-serif transition-all outline-none border-none bg-transparent cursor-pointer whitespace-nowrap ${
                    heelType === type ? `italic ${cText} opacity-100` : `${cTextMuted} opacity-50 hover:opacity-100`
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
                  onClick={() => handleRockerType(type)}
                  className={`text-[10px] font-serif transition-all outline-none border-none bg-transparent cursor-pointer whitespace-nowrap ${
                    rockerType === type ? `italic ${cText} opacity-100` : `${cTextMuted} opacity-50 hover:opacity-100`
                  }`}
                >
                  {t[labelKey]}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Visualizer Canvas */}
        <div className="stagger-item w-full mb-10 relative" style={{ animationDelay: '0.15s' }}>
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
        <div className="stagger-item grid grid-cols-2 gap-x-6 gap-y-6 mb-12" style={{ animationDelay: '0.2s' }}>
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
        <div className="stagger-item w-full" style={{ animationDelay: '0.25s' }}>
          <button
            onClick={() => { haptic('light'); setShowSpecs(!showSpecs); }}
            className={`w-full flex items-center justify-between pb-4 border-b transition-colors outline-none cursor-pointer ${cLine} ${cTextMuted} hover:text-current`}
          >
            <span className="text-[9px] font-sans uppercase tracking-[0.2em]">
              {t.specsBtn}
            </span>
            <motion.div animate={{ rotate: showSpecs ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 9l-7 7-7-7" /></svg>
            </motion.div>
          </button>

          <AnimatePresence>
            {showSpecs && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-8 space-y-2 pb-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-6">
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

                  <div className={`mt-8 pt-4 border-t ${cLine} text-center`}>
                    <span className={`font-mono text-[9px] uppercase tracking-widest ${cTextMuted}`}>
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md cursor-pointer"
            onClick={() => setActiveInfo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()} 
              className={`w-full max-w-[320px] p-8 border ${cLine} ${cBg} shadow-2xl flex flex-col cursor-default relative z-10`}
            >
              <h3 className={`font-serif text-2xl leading-tight mb-4 ${cText} capitalize`}>
                 {activeInfo}
              </h3>
              <p className={`text-[12px] font-sans font-light leading-[1.6] mb-8 ${cTextMuted}`}>
                {infos[activeInfo]}
              </p>
              
              <button
                type="button"
                onClick={() => setActiveInfo(null)}
                className={`w-full py-4 border transition-all active:scale-95 text-[9px] font-sans uppercase tracking-[0.3em] cursor-pointer ${cText} ${cLine} hover:bg-current/5`}
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
// КОМПАКТНЫЕ ЖУРНАЛЬНЫЕ КОМПОНЕНТЫ
// ------------------------------------------------------------------

function JournalStepper({ label, value, min, max, onChange, unit = '', isDark }: any) {
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'

  return (
    <div className={`flex flex-col border-b ${cLine} pb-3 justify-between`}>
      <span className={`text-[8.5px] uppercase tracking-[0.2em] mb-3 ${cTextMuted} truncate pr-1`}>{label}</span>
      <div className="flex items-center justify-between">
        <button 
          type="button"
          onClick={() => { if(value > min) { haptic('light'); onChange(value - 1) } }} 
          className={`text-2xl leading-none px-2 outline-none cursor-pointer ${value <= min ? 'opacity-20 cursor-not-allowed' : `active:scale-90 ${cTextMuted} hover:${cText}`}`}
        >
          -
        </button>
        <span className={`font-serif text-3xl tabular-nums ${cText}`}>
          {value}<span className={`font-sans text-[10px] ml-1 ${cTextMuted}`}>{unit}</span>
        </span>
        <button 
          type="button"
          onClick={() => { if(value < max) { haptic('light'); onChange(value + 1) } }} 
          className={`text-2xl leading-none px-2 outline-none cursor-pointer ${value >= max ? 'opacity-20 cursor-not-allowed' : `active:scale-90 ${cTextMuted} hover:${cText}`}`}
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
  const cDanger = '#ef4444' // red-500

  return (
    <div className={`flex flex-col border-b ${cLine} pb-3 relative`}>
      <div className="flex items-center gap-2 mb-2 pr-4">
        <span className={`text-[8.5px] uppercase tracking-[0.2em] truncate ${cTextMuted}`}>
          {label}
        </span>
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInfo();
          }}
          className={`relative z-10 w-3.5 h-3.5 rounded-full border ${cLine} flex items-center justify-center text-[7px] font-bold shrink-0 outline-none cursor-pointer active:scale-90 ${cTextMuted} hover:${cText}`}
        >
          !
        </button>
      </div>
      <span className={`font-serif text-xl md:text-2xl tabular-nums`} style={{ color: danger ? cDanger : cText }}>
        {value}
        {unit && <span className={`font-sans text-[9px] ml-1 ${cTextMuted}`}>{unit}</span>}
      </span>
    </div>
  )
}

// ------------------------------------------------------------------
// ТЕКСТОВЫЕ ДАННЫЕ
// ------------------------------------------------------------------

function getLabels(lang: Lang) {
  const C = HEEL_CONST
  const ru = {
    title: 'Инженерия',
    desc: 'Баланс & Аудит профиля',
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
    padDesc: 'Требуется обязательная установка встроенного метатарзального пелота в стельку.',
    negDropTitle: '⚠️ ОБРАТНЫЙ УКЛОН', negDropDesc: 'Платформа выше каблука. Нарушение биомеханики.',
    heelBackTitle: '⚠️ КАБЛУК ЗАВАЛЕН НАЗАД',
    heelBackDesc: 'Ошибка: Каблук завален назад, произойдет перелом супинатора.',
    heelFwdTitle: '⚠️ СМЕЩЕНИЕ ВПЕРЁД',
    heelFwdDesc: `Набойка смещена вперёд больше чем на ${C.MAX_HEEL_OFFSET_MM} мм. Снижена стабильность.`,
    invertTitle: '⚠️ РИСК ИНВЕРСИИ',
    invertDesc: 'Набойка слишком узкая при высоком каблуке — высокий риск подворачивания.',
    heelLbl: 'ПЯТКА', toeLbl: 'НОСОК',
    stiletto: 'Шпилька', block: 'Блок', kitten: 'Рюмочка', flared: 'Трапеция',
    flat: 'Стандарт', rocker: 'Рокер',
    specsBtn: 'Спецификация', dropLbl: 'Перепад',
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
    title: 'Інженерія',
    desc: 'Баланс & Аудит профілю',
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
    padDesc: 'Потрібна обовʼязкова установка вбудованого метатарзального пелота у устілку.',
    negDropTitle: '⚠️ ЗВОРОТНІЙ УХИЛ', negDropDesc: 'Платформа вища за підбор. Порушення біомеханіки.',
    heelBackTitle: '⚠️ ПІДБОР ЗАВАЛЕНИЙ НАЗАД',
    heelBackDesc: 'Помилка: Підбор завалений назад, відбудеться перелом супінатора.',
    heelFwdTitle: '⚠️ ЗМІЩЕННЯ ВПЕРЕД',
    heelFwdDesc: `Набійка зміщена вперед більше ніж на ${C.MAX_HEEL_OFFSET_MM} мм. Знижена стабільність.`,
    invertTitle: '⚠️ РИЗИК ІНВЕРСІЇ',
    invertDesc: 'Набійка занадто вузька при високому підборі — ризик підвертання.',
    heelLbl: "П'ЯТКА", toeLbl: 'НОСОК',
    stiletto: 'Шпилька', block: 'Блок', kitten: 'Чарочка', flared: 'Трапеція',
    flat: 'Стандарт', rocker: 'Рокер',
    specsBtn: 'Специфікація', dropLbl: 'Перепад',
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
    rockerForefoot: 'Метатарзалгия',
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
    title: 'Engineering',
    desc: 'Balance & Profil Audit',
    size: 'Größe', heel: 'Absatz', toe: 'Plateau', angle: 'Winkel', start: 'Rolle',
    fixBtn: 'Balance', offset: 'Versatz', tipW: 'Fleck',
    internalSlope: 'Leisten Neigung:', loadLbl: 'Belastung auf Ballen:',
    successTitle: '✅ BALANCE OPTIMAL', successDesc: 'Physiologische Norm erreicht.',
    warnTitle: '⚠️ HOHER SPRENGUNGSWINKEL',
    warn1Desc: `Winkel über ${C.COMFORT_ANGLE}°. Bitte Plateau erhöhen oder Absatz reduzieren.`,
    warn2Desc: 'Zu starker Rocker bei niedrigem Absatz.',
    errTitle: '⚠️ KRITISCHE NEIGUNG',
    errDesc: `Leistenwinkel > ${C.CRITICAL_ANGLE}°. Plateaudicke erhöhen oder Absatzhöhe verringern.`,
    padTitle: '⚠️ KRITISCHE BALLENBELASTUNG',
    padDesc: 'Einbau einer Pelotte zur Entlastung zwingend erforderlich.',
    negDropTitle: '⚠️ NEGATIVE SPRENGUNG', negDropDesc: 'Plateau höher als Absatz. Biomechanik gestört.',
    heelBackTitle: '⚠️ ABSATZ NACH HINTEN GENEIGT',
    heelBackDesc: 'Fehler: Absatz zu weit hinten. Gefahr des Gelenkfederbruchs.',
    heelFwdTitle: '⚠️ ABSATZ NACH VORNE VERLAGERT',
    heelFwdDesc: `Absatzfleck > ${C.MAX_HEEL_OFFSET_MM} mm nach vorne. Reduzierte Stabilität.`,
    invertTitle: '⚠️ INVERSIONSRISIKO',
    invertDesc: 'Absatzfleck zu schmal bei hohem Absatz — Umknickgefahr.',
    heelLbl: 'FERSE', toeLbl: 'SPITZE',
    stiletto: 'Stiletto', block: 'Block', kitten: 'Kitten', flared: 'Ausgestellt',
    flat: 'Standard', rocker: 'Rocker',
    specsBtn: 'Spezifikationen', dropLbl: 'Sprengung',
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
