import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'

type HeelCalcPageProps = {
  onBack: () => void
  lang: Lang
}

export function HeelCalcPage({ onBack, lang }: HeelCalcPageProps) {
  // --- 1. Стейты ---
  const [shoeSize, setShoeSize] = useState(38) // Дефолт для женской обуви
  const [heelHeight, setHeelHeight] = useState(75)     
  const [toeThickness, setToeThickness] = useState(15) 
  const [rockerAngle, setRockerAngle] = useState(12)   
  const [rockerStartPct, setRockerStartPct] = useState(63) 
  
  // Новые стейты для интеграции женских каблуков
  const [heelType, setHeelType] = useState<'stiletto' | 'block' | 'kitten'>('stiletto')
  const [showSpecs, setShowSpecs] = useState(false)
  const [showFormulas, setShowFormulas] = useState(false)

  // Haptic Feedback
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
      else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 20 : 40)
    } catch {}
  }

  // --- 2. Локализация ---
  const t = {
    ru: {
      title: 'Инженерия и Баланс',
      desc: 'Аудит рокера и шпилек',
      size: 'Размер (EU)',
      heel: 'Каблук',
      toe: 'Носок/Платф.',
      angle: 'Угол',
      start: 'Старт',
      fixBtn: '🪄 Баланс',
      groundLine: 'ЛИНИЯ ОПОРЫ',
      internalSlope: 'Наклон стопы:',
      targetRocker: 'Рокер:',
      loadLbl: 'Нагрузка на пучки:',
      successTitle: '✅ АУДИТ ПРОЙДЕН',
      successDesc: 'Баланс в пределах физиологической нормы.',
      warnTitle: '⚠️ ПРЕДУПРЕЖДЕНИЕ',
      warn1Desc: 'Высокий подъем без переката. Перегрузка плюсневых костей.',
      warn2Desc: 'Эффект "обратного завала". Центр тяжести на пятке.',
      errTitle: '❌ ОПАСНАЯ КОНСТРУКЦИЯ',
      errDesc: 'Критический наклон! Риск деформации стопы. Требуется метатарзальный пелот.',
      heelLbl: 'ПЯТКА',
      toeLbl: 'НОСОК',
      stiletto: 'Шпилька',
      block: 'Блок',
      kitten: 'Рюмочка',
      specsBtn: '⚙️ Спецификация геленка',
      shankLength: 'Длина супинатора:',
      shankSteel: 'Толщина стали (65Г):',
      shankProfile: 'Профиль детали:',
      formulaBtn: 'ℹ️ Как это считается?',
      formulaTitle: 'Математика комфорта',
      formulaText: 'Распределение веса: P = 50 + ((H - T) / L_eff) × 100. Чем выше каблук, тем сильнее смещается центр тяжести на носок. Металлический геленок (супинатор) рассчитывается от высоты подъема и берет на себя торсионную нагрузку.',
      formulaMath: 'α = arcsin((H - T) / (L * 0.73))'
    },
    uk: {
      title: 'Інженерія та Баланс',
      desc: 'Аудит рокера та шпильок',
      size: 'Розмір (EU)',
      heel: 'Підбор',
      toe: 'Носок/Платф.',
      angle: 'Кут',
      start: 'Старт',
      fixBtn: '🪄 Баланс',
      groundLine: 'ЛІНІЯ ОПОРИ',
      internalSlope: 'Нахил стопи:',
      targetRocker: 'Рокер:',
      loadLbl: 'Навантаження на пучки:',
      successTitle: '✅ АУДИТ ПРОЙДЕНО',
      successDesc: 'Баланс у межах фізіологічної норми.',
      warnTitle: '⚠️ ПОПЕРЕДЖЕННЯ',
      warn1Desc: 'Високий підйом без перекату. Перевантаження плеснових кісток.',
      warn2Desc: 'Ефект "зворотного завалу". Центр ваги на п\'яті.',
      errTitle: '❌ НЕБЕЗПЕЧНА КОНСТРУКЦІЯ',
      errDesc: 'Критичний нахил! Ризик деформації стопи. Потрібен метатарзальний пелот.',
      heelLbl: 'П\'ЯТКА',
      toeLbl: 'НОСОК',
      stiletto: 'Шпилька',
      block: 'Блок',
      kitten: 'Чарочка',
      specsBtn: '⚙️ Специфікація геленка',
      shankLength: 'Довжина супінатора:',
      shankSteel: 'Товщина сталі (65Г):',
      shankProfile: 'Профіль деталі:',
      formulaBtn: 'ℹ️ Як це рахується?',
      formulaTitle: 'Математика комфорту',
      formulaText: 'Розподіл ваги: P = 50 + ((H - T) / L_eff) × 100. Чим вищий підбор, тим сильніше зміщується центр ваги на носок. Металевий геленок (супінатор) розраховується від висоти підйому і бере на себе торсіонне навантаження.',
      formulaMath: 'α = arcsin((H - T) / (L * 0.73))'
    },
  }[lang]

  // --- 3. Инженерные Вычисления (Рокер + Шпильки) ---
  const engineeringData = useMemo(() => {
    const lastLengthMm = (shoeSize * 6.67) + 12
    const lEff = lastLengthMm * 0.73
    const netRise = heelHeight - toeThickness
    
    // Угол наклона
    const asinArg = Math.max(-1, Math.min(1, netRise / lEff))
    const internalSlope = Math.asin(asinArg) * (180 / Math.PI)

    // Нагрузка на переднюю часть стопы
    const forefootLoad = Math.min(95, Math.max(0, Math.round(50 + (netRise / lEff) * 100)))

    // Расчет супинатора (Геленка)
    const shankLength = Math.round((lastLengthMm * 0.48) + 15)
    let steelThickness = 1.2
    let shankType = lang === 'ru' ? "Стандартный плоский" : "Стандартний плоский"

    if (netRise > 40 && netRise <= 70) {
      steelThickness = 1.5
      shankType = lang === 'ru' ? "Усиленный (с ребром жесткости)" : "Посилений (з ребром жорсткості)"
    } else if (netRise > 70) {
      steelThickness = 2.0
      if (heelType === 'stiletto') {
        shankType = lang === 'ru' ? "Двухслойный арочный / Гофре" : "Двошаровий арковий / Гофре"
      } else {
        shankType = lang === 'ru' ? "Утолщенный двухреберный" : "Потовщений двореберний"
      }
    }

    return { internalSlope, forefootLoad, shankLength, steelThickness, shankType, ballClearance: 12 }
  }, [shoeSize, heelHeight, toeThickness, heelType, lang])

  // --- 4. Auto-Fix ---
  const handleAutoFix = () => {
    triggerHaptic('medium')
    // Если перегруз по шпильке - спасаем платформой
    if (engineeringData.forefootLoad > 80) {
      const lastLengthMm = (shoeSize * 6.67) + 12
      const lEff = lastLengthMm * 0.73
      const neededPlatform = Math.max(0, Math.round(heelHeight - (lEff * Math.sin((16 * Math.PI) / 180))))
      setToeThickness(Math.min(50, neededPlatform)) // Поднимаем носок (платформу)
    }

    let idealRocker = Math.round(engineeringData.internalSlope - 2)
    idealRocker = Math.max(5, Math.min(20, idealRocker)) 
    setRockerAngle(idealRocker)
  }

  // --- 5. Геометрия SVG ---
  const geometry = useMemo(() => {
    const totalLength = shoeSize * 6.67 + 12
    const scale = 1.05
    const svgWidth = totalLength * scale
    const svgHeight = 180
    const padding = 35 

    const xHeel = padding
    const xRockerStart = padding + totalLength * (rockerStartPct / 100) * scale
    const xToe = padding + totalLength * scale
    const yGround = 150

    const ySoleHeelBottom = yGround
    const ySoleRockerBottom = yGround

    // Взлет носка
    const rockerLengthMm = totalLength * (1 - rockerStartPct / 100)
    const rockerLengthSvg = rockerLengthMm * scale
    const toeLiftSvg = rockerLengthSvg * Math.sin((rockerAngle * Math.PI) / 180)
    const ySoleToeBottom = yGround - toeLiftSvg

    // Верхняя грань
    const ySoleHeelTop = yGround - heelHeight * scale
    const ySoleRockerTop = yGround - toeThickness * scale
    const ySoleToeTop = ySoleToeBottom - toeThickness * scale

    // Линия центра пятки (15% от длины)
    const xHeelCenter = padding + (totalLength * 0.15 * scale)

    // Органический путь (Обувь)
    const solePath = `
      M ${xHeel} ${ySoleHeelTop}
      C ${xHeel + 20 * scale} ${ySoleHeelTop}, 
        ${xRockerStart - 30 * scale} ${ySoleRockerTop}, 
        ${xRockerStart} ${ySoleRockerTop}
      C ${xRockerStart + 15 * scale} ${ySoleRockerTop}, 
        ${xToe - 10 * scale} ${ySoleToeTop + 5}, 
        ${xToe} ${ySoleToeTop}
      C ${xToe + 5} ${ySoleToeTop + 10},
        ${xToe + 5} ${ySoleToeBottom},
        ${xToe} ${ySoleToeBottom}
      C ${xToe - 15 * scale} ${ySoleToeBottom}, 
        ${xRockerStart + 10 * scale} ${ySoleRockerBottom}, 
        ${xRockerStart} ${ySoleRockerBottom}
      L ${xHeel + 10} ${ySoleHeelBottom}
      C ${xHeel} ${ySoleHeelBottom}, 
        ${xHeel - 5} ${ySoleHeelTop + 10}, 
        ${xHeel} ${ySoleHeelTop}
      Z
    `

    return { svgWidth: svgWidth + padding * 2, svgHeight, solePath, xHeel, xRockerStart, xToe, yGround, xHeelCenter }
  }, [shoeSize, heelHeight, toeThickness, rockerAngle, rockerStartPct])

  // --- 6. Аудит (Сводный) ---
  const balanceAudit = useMemo(() => {
    let status: 'SUCCESS' | 'WARNING' | 'ERROR' = 'SUCCESS'
    let title = t.successTitle
    let message = t.successDesc
    let colorClasses = 'border-green-500/30 bg-green-500/10 text-green-400'

    if (engineeringData.forefootLoad > 80 || engineeringData.internalSlope > 18) {
      status = 'ERROR'
      title = t.errTitle
      message = t.errDesc
      colorClasses = 'border-red-500/30 bg-red-500/10 text-red-400'
    } else if (engineeringData.internalSlope > 14 && rockerAngle < 8) {
      status = 'WARNING'
      title = t.warnTitle
      message = t.warn1Desc
      colorClasses = 'border-amber-500/30 bg-amber-500/10 text-amber-400'
    } else if (heelHeight < 20 && rockerAngle > 16) {
      status = 'WARNING'
      title = t.warnTitle
      message = t.warn2Desc
      colorClasses = 'border-amber-500/30 bg-amber-500/10 text-amber-400'
    }

    return { status, title, message, colorClasses }
  }, [engineeringData, rockerAngle, heelHeight, t])

  // --- 7. Крупный UI Компонент Степпера ---
  const Stepper = ({ label, value, min, max, onChange, unit = '' }: any) => {
    const handleAdd = () => { if (value < max) { triggerHaptic('light'); onChange(value + 1) } }
    const handleSub = () => { if (value > min) { triggerHaptic('light'); onChange(value - 1) } }

    return (
      <div className="bg-[#1C1816] border border-white/5 rounded-[16px] p-3 flex flex-col justify-between">
        <span className="text-[#A3988E] text-[12px] font-medium mb-3 uppercase tracking-wider">{label}</span>
        <div className="flex items-center justify-between gap-2">
          <button 
            onClick={handleSub} disabled={value <= min}
            className="w-11 h-11 flex items-center justify-center rounded-[10px] bg-white/5 active:bg-white/10 active:scale-95 disabled:opacity-30 transition-all"
          >
            <span className="text-2xl font-medium leading-none mb-1">-</span>
          </button>
          <div className="flex items-baseline justify-center font-bold text-[18px] text-[#F3EFEA]">
            {value}<span className="text-[12px] text-[#A3988E] ml-1">{unit}</span>
          </div>
          <button 
            onClick={handleAdd} disabled={value >= max}
            className="w-11 h-11 flex items-center justify-center rounded-[10px] bg-white/5 active:bg-white/10 active:scale-95 disabled:opacity-30 transition-all"
          >
            <span className="text-2xl font-medium leading-none mb-1">+</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col h-[100dvh] bg-[#110F0E] text-[#F3EFEA] overflow-hidden"
    >
      {/* Шапка */}
      <div className="flex-shrink-0 p-4 flex items-center justify-between border-b border-white/5 bg-[#110F0E]/80 backdrop-blur-md z-10">
        <button onClick={() => { triggerHaptic('light'); onBack() }} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1816] border border-white/5 active:scale-90 transition-transform">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="text-right">
          <h1 className="text-[16px] font-medium leading-none mb-1">{t.title}</h1>
          <p className="text-[11px] text-[#A3988E]">{t.desc}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-12">
        
        {/* Окно визуализации SVG */}
        <div className="bg-[#1C1816] border border-white/5 rounded-[16px] p-2 relative overflow-hidden flex justify-center items-center h-[180px]">
          <svg width="100%" height="100%" viewBox={`0 0 ${geometry.svgWidth} ${geometry.svgHeight}`} className="overflow-visible">
            <text x={geometry.xHeel - 10} y="25" fill="#8B5CF6" fontSize="12" fontWeight="bold" opacity="0.8">{t.heelLbl}</text>
            <text x={geometry.xToe - 30} y="25" fill="#8B5CF6" fontSize="12" fontWeight="bold" opacity="0.8">{t.toeLbl}</text>
            
            {/* Линия земли */}
            <line x1="0" y1={geometry.yGround} x2={geometry.svgWidth} y2={geometry.yGround} stroke="#4A423C" strokeWidth="1" strokeDasharray="3 3" />
            
            {/* Линия падения центра тяжести (Пятка) */}
            <line x1={geometry.xHeelCenter} y1={20} x2={geometry.xHeelCenter} y2={geometry.yGround} stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
            <circle cx={geometry.xHeelCenter} cy={geometry.yGround} r="2.5" fill="#10B981" opacity="0.7" />

            {/* Тело подошвы */}
            <path d={geometry.solePath} fill="#2A2421" stroke="#D49A5C" strokeWidth="2" strokeLinejoin="round" />

            {/* Точка переката */}
            <circle cx={geometry.xRockerStart} cy={geometry.yGround} r="3.5" fill="#EF4444" />
            <line x1={geometry.xRockerStart} y1={geometry.yGround} x2={geometry.xRockerStart} y2={geometry.yGround - 35} stroke="#EF4444" strokeWidth="1" strokeDasharray="2 2" />
            <text x={geometry.xRockerStart - 25} y={geometry.yGround - 40} fontSize="10" fill="#EF4444" fontWeight="600">{rockerStartPct}%</text>

            {/* Угол рокера */}
            <path d={`M ${geometry.xRockerStart + 30} ${geometry.yGround} A 30 30 0 0 0 ${geometry.xRockerStart + 30} ${geometry.yGround - 11}`} fill="none" stroke="#8B5CF6" strokeWidth="1.5" />
            <text x={geometry.xToe - 30} y={geometry.yGround - 10} fontSize="11" fill="#8B5CF6" fontWeight="bold">{rockerAngle}°</text>
          </svg>
        </div>

        {/* Выбор типа каблука */}
        <div className="flex bg-[#1C1816] p-1 rounded-[12px] border border-white/5">
          {(['stiletto', 'block', 'kitten'] as const).map(type => (
            <button
              key={type}
              onClick={() => { triggerHaptic('light'); setHeelType(type) }}
              className={`flex-1 py-2 text-[12px] font-medium rounded-[10px] transition-colors ${heelType === type ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-[#A3988E] bg-transparent'}`}
            >
              {t[type]}
            </button>
          ))}
        </div>

        {/* Панель аудита и Auto-fix */}
        <div className={`p-4 rounded-[14px] border transition-colors duration-300 ${balanceAudit.colorClasses}`}>
          <div className="flex justify-between items-start mb-2">
            <strong className="text-[13px] tracking-wide font-semibold leading-tight">{balanceAudit.title}</strong>
            {balanceAudit.status !== 'SUCCESS' && (
              <button 
                onClick={handleAutoFix}
                className="bg-[#8B5CF6] hover:bg-[#7c50de] active:scale-95 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg shadow-md transition-transform ml-2 shrink-0"
              >
                {t.fixBtn}
              </button>
            )}
          </div>
          <p className="text-[12px] leading-snug opacity-90 mb-3">{balanceAudit.message}</p>
          <div className="text-[11px] opacity-75 pt-3 border-t border-current/20 flex justify-between">
            <span>{t.internalSlope} <strong className="text-[12px]">{engineeringData.internalSlope.toFixed(1)}°</strong></span>
            <span>{t.loadLbl} <strong className={`text-[12px] ${engineeringData.forefootLoad > 80 ? 'font-bold' : ''}`}>{engineeringData.forefootLoad}%</strong></span>
          </div>
        </div>

        {/* Сетка контролов */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Stepper label={t.size} min={33} max={48} value={shoeSize} onChange={setShoeSize} unit="" />
          </div>
          <Stepper label={t.heel} min={10} max={130} value={heelHeight} onChange={setHeelHeight} unit="мм" />
          <Stepper label={t.toe} min={0} max={60} value={toeThickness} onChange={setToeThickness} unit="мм" />
          <Stepper label={t.angle} min={5} max={30} value={rockerAngle} onChange={setRockerAngle} unit="°" />
          <Stepper label={t.start} min={55} max={75} value={rockerStartPct} onChange={setRockerStartPct} unit="%" />
        </div>
        
        {/* Аккордеоны информации (Супинатор и Формулы) */}
        <div className="pt-2 space-y-2">
          
          {/* Спецификация супинатора */}
          <div>
            <button 
              onClick={() => { triggerHaptic('light'); setShowSpecs(!showSpecs) }}
              className={`w-full py-3.5 px-4 bg-[#1C1816] rounded-[14px] text-[13px] font-medium flex items-center justify-between border transition-colors ${showSpecs ? 'border-[#8B5CF6]/50' : 'border-white/5 active:bg-white/5'}`}
            >
              <span className="flex items-center gap-2 text-[#F3EFEA]">{t.specsBtn}</span>
              <svg className={`w-4 h-4 text-[#A3988E] transition-transform duration-300 ${showSpecs ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <AnimatePresence>
              {showSpecs && (
                <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 8 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} className="overflow-hidden">
                  <div className="bg-[#1C1816] p-4 rounded-[14px] border border-white/5 text-[12px] text-[#A3988E] space-y-2">
                    <div className="flex justify-between"><span>{t.shankLength}</span> <strong className="text-[#F3EFEA]">{engineeringData.shankLength} мм</strong></div>
                    <div className="flex justify-between"><span>{t.shankSteel}</span> <strong className="text-[#F3EFEA]">{engineeringData.steelThickness.toFixed(1)} мм</strong></div>
                    <div className="pt-2 mt-2 border-t border-white/5 text-[#8B5CF6] font-medium">{t.shankProfile} {engineeringData.shankType}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Формулы */}
          <div>
            <button 
              onClick={() => { triggerHaptic('light'); setShowFormulas(!showFormulas) }}
              className="w-full py-3.5 px-4 bg-[#1C1816] rounded-[14px] text-[13px] font-medium flex items-center justify-between border border-white/5 active:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-2 text-[#A3988E]">{t.formulaBtn}</span>
              <svg className={`w-4 h-4 text-[#A3988E] transition-transform duration-300 ${showFormulas ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <AnimatePresence>
              {showFormulas && (
                <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 8 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} className="overflow-hidden">
                  <div className="bg-[#1C1816] p-4 rounded-[14px] border border-white/5 text-[12px] leading-relaxed text-[#A3988E]">
                    <h4 className="text-[#F3EFEA] font-bold mb-2 text-[13px]">{t.formulaTitle}</h4>
                    <p>{t.formulaText}</p>
                    <div className="mt-3 pt-3 border-t border-white/5 font-mono text-[11px] text-[#D49A5C] text-center bg-black/20 p-2 rounded-lg">
                      {t.formulaMath}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </motion.div>
  )
}
