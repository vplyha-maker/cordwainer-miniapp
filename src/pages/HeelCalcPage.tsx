import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'

type HeelCalcPageProps = {
  onBack: () => void
  lang: Lang
}

export function HeelCalcPage({ onBack, lang }: HeelCalcPageProps) {
  // --- 1. Стейты ---
  const [shoeSize, setShoeSize] = useState(38)
  const [heelHeight, setHeelHeight] = useState(75)     
  const [toeThickness, setToeThickness] = useState(15) 
  const [rockerAngle, setRockerAngle] = useState(12)   
  const [rockerStartPct, setRockerStartPct] = useState(63) 
  
  const [soleType, setSoleType] = useState<'flat' | 'rocker'>('rocker')
  const [heelType, setHeelType] = useState<'stiletto' | 'block' | 'kitten'>('stiletto')
  const [showSpecs, setShowSpecs] = useState(false)
  const [showFormulas, setShowFormulas] = useState(false)

  // Защита от отрицательного перепада (Edge Case)
  useEffect(() => {
    if (toeThickness > heelHeight + 10) {
      setToeThickness(heelHeight + 10)
    }
  }, [heelHeight, toeThickness])

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
      toe: 'Платформа',
      angle: 'Угол',
      start: 'Старт',
      fixBtn: 'Баланс',
      internalSlope: 'Наклон стопы:',
      loadLbl: 'Нагрузка на пучки:',
      successTitle: '✅ АУДИТ ПРОЙДЕН',
      successDesc: 'Баланс в пределах физиологической нормы.',
      warnTitle: '⚠️ ПРЕДУПРЕЖДЕНИЕ',
      warn1Desc: 'Высокий подъем без переката. Перегрузка плюсневых костей.',
      warn2Desc: 'Эффект "обратного завала". Центр тяжести на пятке.',
      errTitle: '⚠️ КРИТИЧЕСКИЙ КАБЛУК',
      errDesc: 'Предельный наклон. Обязателен метатарзальный пелот.',
      heelLbl: 'ПЯТКА',
      toeLbl: 'НОСОК',
      ballJointLbl: 'ПУЧКИ',
      stiletto: 'Шпилька',
      block: 'Блок',
      kitten: 'Рюмочка',
      flat: 'Flat',
      rocker: 'Rocker',
      specsBtn: '⚙️ Спецификация геленка',
      shankLength: 'Длина супинатора:',
      shankSteel: 'Толщина стали (65Г):',
      shankProfile: 'Профиль детали:',
      formulaBtn: 'ℹ️ Как это считается?',
      formulaTitle: 'Математика комфорта',
      formulaText: 'Распределение веса: P = 50 + ((H - T) / L_eff) × 100. Чем выше каблук, тем сильнее смещается центр тяжести на носок. Металлический геленок рассчитывается от высоты подъема.',
      formulaMath: 'α = arcsin((H - T) / (L * 0.73))'
    },
    uk: {
      title: 'Інженерія та Баланс',
      desc: 'Аудит рокера та шпильок',
      size: 'Розмір (EU)',
      heel: 'Підбор',
      toe: 'Платформа',
      angle: 'Кут',
      start: 'Старт',
      fixBtn: 'Баланс',
      internalSlope: 'Нахил стопи:',
      loadLbl: 'Навантаження на пучки:',
      successTitle: '✅ АУДИТ ПРОЙДЕНО',
      successDesc: 'Баланс у межах фізіологічної норми.',
      warnTitle: '⚠️ ПОПЕРЕДЖЕННЯ',
      warn1Desc: 'Високий підйом без перекату. Перевантаження плеснових кісток.',
      warn2Desc: 'Ефект "зворотного завалу". Центр ваги на п\'яті.',
      errTitle: '⚠️ КРИТИЧНИЙ ПІДБОР',
      errDesc: 'Граничний нахил. Потрібен метатарзальний пелот.',
      heelLbl: 'П\'ЯТКА',
      toeLbl: 'НОСОК',
      ballJointLbl: 'ПУЧКИ',
      stiletto: 'Шпилька',
      block: 'Блок',
      kitten: 'Чарочка',
      flat: 'Flat',
      rocker: 'Rocker',
      specsBtn: '⚙️ Специфікація геленка',
      shankLength: 'Довжина супінатора:',
      shankSteel: 'Товщина сталі (65Г):',
      shankProfile: 'Профіль деталі:',
      formulaBtn: 'ℹ️ Як це рахується?',
      formulaTitle: 'Математика комфорту',
      formulaText: 'Розподіл ваги: P = 50 + ((H - T) / L_eff) × 100. Чим вищий підбор, тим сильніше зміщується центр ваги на носок. Металевий геленок розраховується від висоти підйому.',
      formulaMath: 'α = arcsin((H - T) / (L * 0.73))'
    },
  }[lang]

  // --- 3. Инженерные Вычисления ---
  const engineeringData = useMemo(() => {
    const lastLengthMm = (shoeSize * 6.67) + 12
    const lEff = lastLengthMm * 0.73
    const netRise = heelHeight - toeThickness
    const activeRocker = soleType === 'rocker' ? rockerAngle : 0

    const asinArg = Math.max(-1, Math.min(1, netRise / lEff))
    const internalSlope = (Math.asin(asinArg) * (180 / Math.PI)) - (activeRocker * 0.5)

    const forefootLoad = Math.min(95, Math.max(0, Math.round(50 + (netRise / lEff) * 100 - (activeRocker * 1.5))))

    // Расчет супинатора (по ГОСТ)
    const shankLength = Math.round((lastLengthMm * 0.48) + 15)
    let steelThickness = 1.2
    let shankType = lang === 'ru' ? "Стандартный плоский" : "Стандартний плоский"

    if (netRise > 40 && netRise <= 70) {
      steelThickness = 1.5
      shankType = lang === 'ru' ? "Усиленный (с ребром жесткости)" : "Посилений (з ребром жорсткості)"
    } else if (netRise > 70) {
      steelThickness = 2.0
      shankType = heelType === 'stiletto' 
        ? (lang === 'ru' ? "Двухслойный арочный / Гофре" : "Двошаровий арковий / Гофре")
        : (lang === 'ru' ? "Утолщенный двухреберный" : "Потовщений двореберний")
    }

    return { internalSlope, forefootLoad, shankLength, steelThickness, shankType }
  }, [shoeSize, heelHeight, toeThickness, heelType, lang, soleType, rockerAngle])

  // --- 4. Auto-Fix ---
  const handleAutoFix = () => {
    triggerHaptic('medium')
    if (soleType === 'flat') setSoleType('rocker')

    if (engineeringData.forefootLoad > 80) {
      const lastLengthMm = (shoeSize * 6.67) + 12
      const lEff = lastLengthMm * 0.73
      const neededPlatform = Math.max(0, Math.round(heelHeight - (lEff * Math.sin((16 * Math.PI) / 180))))
      setToeThickness(Math.min(60, neededPlatform)) 
    }

    let idealRocker = Math.round(engineeringData.internalSlope - 2)
    setRockerAngle(Math.max(5, Math.min(20, idealRocker)))
  }

  // --- 5. Геометрия SVG ---
  const geometry = useMemo(() => {
    const totalLength = shoeSize * 6.67 + 12
    const scale = 1.05
    const svgWidth = totalLength * scale
    const svgHeight = 220
    const padding = 35 

    const xHeel = padding
    const xRockerStart = padding + totalLength * (rockerStartPct / 100) * scale
    const xToe = padding + totalLength * scale
    const yGround = 190

    const getHeelPath = () => {
      const h = heelHeight * scale
      const x = xHeel
      const y = yGround
      switch (heelType) {
        case 'stiletto': return `M ${x + 5} ${y - h} L ${x + 2} ${y} L ${x + 8} ${y} Z`
        case 'block': return `M ${x} ${y - h} L ${x + 15} ${y - h} L ${x + 15} ${y} L ${x} ${y} Z`
        case 'kitten': return `M ${x + 8} ${y - h} Q ${x - 5} ${y - h/2} ${x + 2} ${y} L ${x + 10} ${y} Q ${x + 12} ${y - h/2} ${x + 12} ${y - h} Z`
        default: return ''
      }
    }

    const ySoleHeelTop = yGround - heelHeight * scale
    const ySoleRockerTop = yGround - toeThickness * scale
    
    const activeRockerAngle = soleType === 'rocker' ? rockerAngle : 0
    const rockerLengthSvg = totalLength * (1 - rockerStartPct / 100) * scale
    const toeLiftSvg = rockerLengthSvg * Math.sin((activeRockerAngle * Math.PI) / 180)
    const ySoleToeTop = (yGround - toeLiftSvg) - toeThickness * scale

    const xHeelCenter = padding + (totalLength * 0.15 * scale)

    const solePath = `
      M ${xHeel + 12} ${ySoleHeelTop}
      C ${xHeel + 40 * scale} ${ySoleHeelTop}, ${xRockerStart - 30 * scale} ${ySoleRockerTop}, ${xRockerStart} ${ySoleRockerTop}
      C ${xRockerStart + 15 * scale} ${ySoleRockerTop}, ${xToe - 10 * scale} ${ySoleToeTop + 5}, ${xToe} ${ySoleToeTop}
      L ${xToe} ${ySoleToeTop + 5}
      L ${xHeel + 12} ${ySoleHeelTop + 5}
      Z
    `

    const shankCurve = `
      M ${xHeel + 15} ${ySoleHeelTop + 2}
      Q ${xHeel + 40} ${ySoleHeelTop + 2} ${xHeel + (engineeringData.shankLength * scale)} ${ySoleRockerTop + 2}
    `

    return { 
      svgWidth: svgWidth + padding * 2, svgHeight, solePath, shankCurve, heelPath: getHeelPath(),
      xHeel, xRockerStart, xToe, yGround, xHeelCenter, scale
    }
  }, [shoeSize, heelHeight, toeThickness, rockerAngle, rockerStartPct, heelType, soleType, engineeringData.shankLength])

  // --- 6. Аудит (Сводный) ---
  const balanceAudit = useMemo(() => {
    let status = 'SUCCESS'
    let title = t.successTitle
    let message = t.successDesc
    let colors = 'border-green-500/30 bg-green-500/10 text-green-400'
    let boxColors = 'border-green-500/20 bg-[#1C1816]'
    
    const activeRocker = soleType === 'rocker' ? rockerAngle : 0

    if (engineeringData.forefootLoad > 80 || engineeringData.internalSlope > 18) {
      status = 'ERROR'
      title = t.errTitle
      message = t.errDesc
      colors = 'border-red-500/30 bg-red-500/20 text-red-400'
      boxColors = 'border-red-500/40 bg-red-950/20'
    } else if (engineeringData.internalSlope > 14 && activeRocker < 8) {
      status = 'WARNING'
      title = t.warnTitle
      message = t.warn1Desc
      colors = 'border-amber-500/30 bg-amber-500/20 text-amber-400'
      boxColors = 'border-amber-500/40 bg-amber-950/20'
    } else if (heelHeight < 20 && activeRocker > 16) {
      status = 'WARNING'
      title = t.warnTitle
      message = t.warn2Desc
      colors = 'border-amber-500/30 bg-amber-500/20 text-amber-400'
      boxColors = 'border-amber-500/40 bg-amber-950/20'
    }

    return { status, title, message, colors, boxColors }
  }, [engineeringData, rockerAngle, soleType, heelHeight, t])

  // --- 7. UI Степпера ---
  const Stepper = ({ label, value, min, max, onChange, unit = '', disabled = false }: any) => {
    const handleAdd = () => { if (!disabled && value < max) { triggerHaptic('light'); onChange(value + 1) } }
    const handleSub = () => { if (!disabled && value > min) { triggerHaptic('light'); onChange(value - 1) } }
    return (
      <div className={`bg-[#1C1816] border border-white/5 rounded-[16px] p-3 flex flex-col justify-between transition-opacity duration-300 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
        <span className="text-[#A3988E] text-[12px] font-medium mb-3 uppercase tracking-wider">{label}</span>
        <div className="flex items-center justify-between gap-1">
          <button onClick={handleSub} disabled={disabled || value <= min} className="w-10 h-10 flex items-center justify-center rounded-[10px] bg-white/5 active:bg-white/10 active:scale-95 disabled:opacity-30">
            <span className="text-2xl font-medium leading-none mb-1">-</span>
          </button>
          <div className="flex items-baseline justify-center font-bold text-[18px] text-[#F3EFEA]">
            {value}<span className="text-[12px] text-[#A3988E] ml-1">{unit}</span>
          </div>
          <button onClick={handleAdd} disabled={disabled || value >= max} className="w-10 h-10 flex items-center justify-center rounded-[10px] bg-white/5 active:bg-white/10 active:scale-95 disabled:opacity-30">
            <span className="text-2xl font-medium leading-none mb-1">+</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="flex flex-col h-[100dvh] bg-[#110F0E] text-[#F3EFEA] overflow-hidden">
      
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
        
        {/* Интерактивный Экран (SVG + Аудит) */}
        <div className={`flex flex-col rounded-[16px] border transition-colors duration-500 overflow-hidden relative ${balanceAudit.boxColors}`}>
          
          {/* Инфо Панель поверх SVG */}
          <div className="flex flex-col p-3 pb-0 z-10 min-h-[50px]">
            <div className="flex justify-between items-start gap-2">
              <div className="flex flex-col">
                <span className={`text-[12px] font-bold ${balanceAudit.colors.split(' ').pop()}`}>{balanceAudit.title}</span>
                <span className="text-[11px] opacity-80 mt-1 leading-snug">{balanceAudit.message}</span>
              </div>
              {balanceAudit.status !== 'SUCCESS' && (
                <button onClick={handleAutoFix} className="shrink-0 bg-[#8B5CF6] text-white text-[11px] font-bold py-1.5 px-3 rounded-lg shadow-lg active:scale-95 transition-transform flex items-center gap-1">
                  🪄 {t.fixBtn}
                </button>
              )}
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="relative flex justify-center items-center h-[200px] w-full">
            <svg width="100%" height="100%" viewBox={`0 0 ${geometry.svgWidth} ${geometry.svgHeight}`} className="overflow-visible">
              <text x={geometry.xHeel - 15} y="35" fill="#8B5CF6" fontSize="11" fontWeight="bold" opacity="0.8">{t.heelLbl}</text>
              <text x={geometry.xToe - 30} y="35" fill="#8B5CF6" fontSize="11" fontWeight="bold" opacity="0.8">{t.toeLbl}</text>
              
              <line x1="0" y1={geometry.yGround} x2={geometry.svgWidth} y2={geometry.yGround} stroke="#4A423C" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={geometry.xHeelCenter} y1={30} x2={geometry.xHeelCenter} y2={geometry.yGround} stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" style={{ transition: 'all 0.3s ease' }} />
              <circle cx={geometry.xHeelCenter} cy={geometry.yGround} r="2.5" fill="#10B981" opacity="0.7" style={{ transition: 'all 0.3s ease' }} />

              {/* 1. Линия чистого перепада (Net Rise) */}
              <line x1={geometry.xHeel - 10} y1={geometry.yGround - toeThickness * geometry.scale} x2={geometry.xToe + 10} y2={geometry.yGround - toeThickness * geometry.scale} stroke="#3B82F6" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" style={{ transition: 'all 0.3s ease' }} />
              <text x={geometry.xHeel - 35} y={geometry.yGround - toeThickness * geometry.scale + 3} fill="#3B82F6" fontSize="10" fontWeight="600" style={{ transition: 'all 0.3s ease' }}>H: {heelHeight - toeThickness}</text>

              {/* 2. Линия пучков (Ball Joint) */}
              <line x1={geometry.xHeel + (engineeringData.shankLength * geometry.scale)} y1={geometry.yGround - heelHeight * geometry.scale - 20} x2={geometry.xHeel + (engineeringData.shankLength * geometry.scale)} y2={geometry.yGround} stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" style={{ transition: 'all 0.3s ease' }} />
              <text x={geometry.xHeel + (engineeringData.shankLength * geometry.scale) - 15} y={geometry.yGround - heelHeight * geometry.scale - 25} fill="#F59E0B" fontSize="9" fontWeight="bold" style={{ transition: 'all 0.3s ease' }}>{t.ballJointLbl}</text>

              {/* Каблук */}
              <path d={geometry.heelPath} fill="#D49A5C" opacity="0.8" style={{ transition: 'all 0.3s ease' }} />

              {/* Тело подошвы */}
              <path d={geometry.solePath} fill="#2A2421" stroke="#D49A5C" strokeWidth="2" strokeLinejoin="round" style={{ transition: 'all 0.3s ease' }} />

              {/* 3. Стальной Геленок (Shank) */}
              <path d={geometry.shankCurve} fill="none" stroke="#94A3B8" strokeWidth={engineeringData.steelThickness * geometry.scale} strokeLinecap="round" style={{ transition: 'all 0.3s ease' }} />

              {soleType === 'rocker' && (
                <>
                  <circle cx={geometry.xRockerStart} cy={geometry.yGround} r="3.5" fill="#EF4444" style={{ transition: 'all 0.3s ease' }} />
                  <line x1={geometry.xRockerStart} y1={geometry.yGround} x2={geometry.xRockerStart} y2={geometry.yGround - 35} stroke="#EF4444" strokeWidth="1" strokeDasharray="2 2" style={{ transition: 'all 0.3s ease' }} />
                  <text x={geometry.xRockerStart - 25} y={geometry.yGround - 40} fontSize="10" fill="#EF4444" fontWeight="600" style={{ transition: 'all 0.3s ease' }}>{rockerStartPct}%</text>
                </>
              )}
            </svg>
          </div>

          {/* Футер SVG-блока с цифрами */}
          <div className="px-4 pb-3 pt-2 border-t border-white/5 flex justify-between text-[11px] opacity-90 z-10 bg-black/20">
            <span>{t.internalSlope} <strong className="text-[12px]">{engineeringData.internalSlope.toFixed(1)}°</strong></span>
            <span>{t.loadLbl} <strong className={`text-[12px] ${engineeringData.forefootLoad > 80 ? 'text-red-400' : ''}`}>{engineeringData.forefootLoad}%</strong></span>
          </div>
        </div>

        {/* Переключатели */}
        <div className="flex flex-col gap-2">
          <div className="flex bg-[#1C1816] p-1 rounded-[12px] border border-white/5">
            {(['flat', 'rocker'] as const).map(type => (
              <button key={type} onClick={() => { triggerHaptic('light'); setSoleType(type) }} className={`flex-1 py-2 text-[12px] font-medium rounded-[10px] transition-colors ${soleType === type ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-[#A3988E] bg-transparent'}`}>{t[type]}</button>
            ))}
          </div>
          <div className="flex bg-[#1C1816] p-1 rounded-[12px] border border-white/5">
            {(['stiletto', 'block', 'kitten'] as const).map(type => (
              <button key={type} onClick={() => { triggerHaptic('light'); setHeelType(type) }} className={`flex-1 py-2 text-[12px] font-medium rounded-[10px] transition-colors ${heelType === type ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-[#A3988E] bg-transparent'}`}>{t[type]}</button>
            ))}
          </div>
        </div>

        {/* Сетка контролов */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Stepper label={t.size} min={33} max={48} value={shoeSize} onChange={setShoeSize} />
          </div>
          <Stepper label={t.heel} min={10} max={130} value={heelHeight} onChange={setHeelHeight} unit="мм" />
          <Stepper 
            label={t.toe} min={0} 
            max={Math.min(60, heelHeight + 10)} // Защита макс. высоты платформы
            value={toeThickness} onChange={setToeThickness} unit="мм" 
          />
          <Stepper label={t.angle} min={5} max={30} value={rockerAngle} onChange={setRockerAngle} unit="°" disabled={soleType === 'flat'} />
          <Stepper label={t.start} min={55} max={75} value={rockerStartPct} onChange={setRockerStartPct} unit="%" disabled={soleType === 'flat'} />
        </div>
        
        {/* Аккордеоны информации */}
        <div className="pt-2 space-y-2">
          <div>
            <button onClick={() => { triggerHaptic('light'); setShowSpecs(!showSpecs) }} className={`w-full py-3.5 px-4 bg-[#1C1816] rounded-[14px] text-[13px] font-medium flex items-center justify-between border transition-colors ${showSpecs ? 'border-[#8B5CF6]/50' : 'border-white/5'}`}>
              <span className="flex items-center gap-2">{t.specsBtn}</span>
              <svg className={`w-4 h-4 text-[#A3988E] transition-transform duration-300 ${showSpecs ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <AnimatePresence>
              {showSpecs && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 8 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="bg-[#1C1816] p-4 rounded-[14px] border border-white/5 text-[12px] text-[#A3988E] space-y-2">
                    <div className="flex justify-between"><span>{t.shankLength}</span> <strong className="text-[#F3EFEA]">{engineeringData.shankLength} мм</strong></div>
                    <div className="flex justify-between"><span>{t.shankSteel}</span> <strong className="text-[#F3EFEA]">{engineeringData.steelThickness.toFixed(1)} мм</strong></div>
                    <div className="pt-2 mt-2 border-t border-white/5 text-[#8B5CF6] font-medium">{t.shankProfile} {engineeringData.shankType}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <button onClick={() => { triggerHaptic('light'); setShowFormulas(!showFormulas) }} className="w-full py-3.5 px-4 bg-[#1C1816] rounded-[14px] text-[13px] font-medium flex items-center justify-between border border-white/5">
              <span className="flex items-center gap-2">{t.formulaBtn}</span>
              <svg className={`w-4 h-4 text-[#A3988E] transition-transform duration-300 ${showFormulas ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <AnimatePresence>
              {showFormulas && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 8 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="bg-[#1C1816] p-4 rounded-[14px] border border-white/5 text-[12px] leading-relaxed text-[#A3988E]">
                    <h4 className="text-[#F3EFEA] font-bold mb-2 text-[13px]">{t.formulaTitle}</h4>
                    <p>{t.formulaText}</p>
                    <div className="mt-3 pt-3 border-t border-white/5 font-mono text-[11px] text-[#D49A5C] text-center bg-black/20 p-2 rounded-lg">{t.formulaMath}</div>
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
