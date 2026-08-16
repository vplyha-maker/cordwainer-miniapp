import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'

// --- КОНСТАНТЫ И КОЭФФИЦИЕНТЫ ---
const STEP_TO_MM = 6.67
const FUNCTIONAL_ALLOWANCE = 12
const L_EFF_RATIO = 0.73
const H_REF = 40
const BASE_LOAD = 50
const LOAD_PER_H_REF = 20
const SHANK_PROPORTION = 0.48
const SHANK_OFFSET = 15
const MAX_TOE = 80                    
const MAX_LIFT = 50
const CRITICAL_ANGLE = 18
const COMFORT_ANGLE = 14
const SAFE_ANGLE = 14.5
const CRITICAL_LOAD = 80
const MAX_ROCKER_ANGLE = 30
const ROCKER_MITIGATION_CAP = 0.25

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
  const [rockerStartPct, setRockerStartPct] = useState(65)
  
  const [soleType, setSoleType] = useState<'flat' | 'rocker'>('rocker')
  const [heelType, setHeelType] = useState<'stiletto' | 'block' | 'kitten'>('stiletto')
  const [showSpecs, setShowSpecs] = useState(false)

  // Защита: Платформа не может быть абсурдно выше каблука
  useEffect(() => {
    if (toeThickness > heelHeight + 10) {
      setToeThickness(heelHeight + 10)
    }
  }, [heelHeight, toeThickness])

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
      else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 20 : 40)
    } catch {}
  }

  // Обновленные, профессиональные термины
  const t = {
    ru: {
      title: 'Инженерия и Баланс',
      desc: 'Аудит профиля и каблука',
      size: 'Размер',
      heel: 'Каблук',
      toe: 'Платформа',
      angle: 'Угол',
      start: 'Перекат',
      fixBtn: 'Баланс',
      internalSlope: 'Наклон колодки:',
      loadLbl: 'Нагрузка на плюсну:',
      successTitle: '✅ БАЛАНС В НОРМЕ',
      successDesc: 'Физиологическая норма.',
      warnTitle: '⚠️ ВЫСОКИЙ ПОДЪЕМ',
      warn1Desc: `Угол больше ${COMFORT_ANGLE}°. Рекомендуется компенсация.`,
      warn2Desc: 'Чрезмерный рокер при низком каблуке.',
      errTitle: '⚠️ КРИТИЧЕСКИЙ НАКЛОН',
      errDesc: `Угол колодки > ${CRITICAL_ANGLE}°. Требуется утолщение платформы или снижение каблука.`,
      negDropTitle: '⚠️ ОБРАТНЫЙ УКЛОН',
      negDropDesc: 'Платформа выше каблука. Нарушение биомеханики.',
      heelLbl: 'ПЯТКА',
      toeLbl: 'НОСОК',
      stiletto: 'Шпилька',
      block: 'Блок',
      kitten: 'Рюмочка',
      flat: 'Стандарт',
      rocker: 'Рокер',
      specsBtn: '⚙️ Спецификация и Математика'
    },
    uk: {
      title: 'Інженерія та Баланс',
      desc: 'Аудит профілю та підбора',
      size: 'Розмір',
      heel: 'Підбор',
      toe: 'Платформа',
      angle: 'Кут',
      start: 'Перекат',
      fixBtn: 'Баланс',
      internalSlope: 'Нахил колодки:',
      loadLbl: 'Навантаження:',
      successTitle: '✅ БАЛАНС У НОРМІ',
      successDesc: 'Фізіологічна норма.',
      warnTitle: '⚠️ ВИСОКИЙ ПІДЙОМ',
      warn1Desc: `Кут більше ${COMFORT_ANGLE}°. Рекомендована компенсація.`,
      warn2Desc: 'Надмірний рокер при низькому підборі.',
      errTitle: '⚠️ КРИТИЧНИЙ НАХИЛ',
      errDesc: `Кут колодки > ${CRITICAL_ANGLE}°. Потрібне потовщення платформи або зниження підбора.`,
      negDropTitle: '⚠️ ЗВОРОТНІЙ УХИЛ',
      negDropDesc: 'Платформа вища за підбор. Порушення біомеханіки.',
      heelLbl: 'П\'ЯТКА',
      toeLbl: 'НОСОК',
      stiletto: 'Шпилька',
      block: 'Блок',
      kitten: 'Чарочка',
      flat: 'Стандарт',
      rocker: 'Рокер',
      specsBtn: '⚙️ Специфікація та Математика'
    },
  }[lang]

  // --- 2. Инженерные Вычисления ---
  const engineeringData = useMemo(() => {
    const lastLengthMm = (shoeSize * STEP_TO_MM) + FUNCTIONAL_ALLOWANCE
    const lEff = lastLengthMm * L_EFF_RATIO
    const netRise = heelHeight - toeThickness

    // Исправление 6: Защита от деления на ноль
    const asinArg = lEff > 0 ? Math.max(-1, Math.min(1, netRise / lEff)) : 0
    const internalSlope = Math.asin(asinArg) * (180 / Math.PI)

    const loadCalc = BASE_LOAD + (netRise / H_REF) * LOAD_PER_H_REF
    
    const rockerEffectFactor = (soleType === 'rocker') 
      ? Math.min(1, rockerAngle / MAX_ROCKER_ANGLE) * (1 - (rockerStartPct - 55) / 40) 
      : 0
    
    const adjustedLoad = loadCalc * (1 - ROCKER_MITIGATION_CAP * rockerEffectFactor)
    const forefootLoad = Math.min(100, Math.max(0, Math.round(adjustedLoad)))

    const shankLength = Math.round((lastLengthMm * SHANK_PROPORTION) + SHANK_OFFSET)
    
    let steelThickness = 1.2
    if (netRise > H_REF && netRise <= 70) steelThickness = 1.5
    else if (netRise > 70) steelThickness = 2.0

    return { internalSlope, forefootLoad, shankLength, steelThickness, netRise, lEff }
  }, [shoeSize, heelHeight, toeThickness, rockerAngle, rockerStartPct, soleType])

  // --- 3. Аудит и Баланс ---
  const balanceAudit = useMemo(() => {
    let status = 'SUCCESS'
    let title = t.successTitle
    let message = t.successDesc
    let colors = 'border-green-500/30 bg-green-500/10 text-green-400'
    let boxColors = 'border-green-500/20 bg-[#1C1816]'
    
    const activeRocker = soleType === 'rocker' ? rockerAngle : 0

    if (engineeringData.internalSlope < 0) {
      status = 'WARNING'
      title = t.negDropTitle
      message = t.negDropDesc
      colors = 'border-blue-500/30 bg-blue-500/20 text-blue-400'
      boxColors = 'border-blue-500/40 bg-blue-950/20'
    }
    else if (engineeringData.internalSlope >= CRITICAL_ANGLE || engineeringData.forefootLoad >= CRITICAL_LOAD) {
      status = 'ERROR'
      title = t.errTitle
      message = t.errDesc
      colors = 'border-red-500/30 bg-red-500/20 text-red-400'
      boxColors = 'border-red-500/40 bg-red-950/20'
    } 
    else if (engineeringData.internalSlope > COMFORT_ANGLE) {
      status = 'WARNING'
      title = t.warnTitle
      message = t.warn1Desc
      colors = 'border-amber-500/30 bg-amber-500/20 text-amber-400'
      boxColors = 'border-amber-500/40 bg-amber-950/20'
    } 
    else if (heelHeight < 20 && activeRocker > 16) {
      status = 'WARNING'
      title = t.warnTitle
      message = t.warn2Desc
      colors = 'border-amber-500/30 bg-amber-500/20 text-amber-400'
      boxColors = 'border-amber-500/40 bg-amber-950/20'
    }

    return { status, title, message, colors, boxColors }
  }, [engineeringData, rockerAngle, soleType, heelHeight, t])

  // --- 4. УМНЫЙ Auto-Fix (Двусторонняя корректировка) ---
  const handleAutoFix = () => {
    triggerHaptic('medium')
    if (soleType === 'flat') setSoleType('rocker')

    const targetAngleRad = (SAFE_ANGLE * Math.PI) / 180
    const maxSafeNetRise = engineeringData.lEff * Math.sin(targetAngleRad)
    
    const neededPlatform = Math.max(0, Math.round(heelHeight - maxSafeNetRise))
    
    let finalPlatform = toeThickness;
    let finalHeel = heelHeight;

    if (neededPlatform <= MAX_TOE) {
      finalPlatform = neededPlatform;
    } else {
      finalPlatform = MAX_TOE;
      finalHeel = Math.round(MAX_TOE + maxSafeNetRise);
      setHeelHeight(finalHeel);
    }

    setToeThickness(finalPlatform)
    
    const newNetRise = finalHeel - finalPlatform
    const newSlope = Math.asin(Math.max(-1, Math.min(1, newNetRise / engineeringData.lEff))) * (180 / Math.PI)
    const idealRocker = Math.round(newSlope * 0.8)
    setRockerAngle(Math.max(5, Math.min(20, idealRocker)))
  }

  // --- 5. Глубокая Математика SVG Геометрии ---
  const geometry = useMemo(() => {
    const totalLength = (shoeSize * STEP_TO_MM) + FUNCTIONAL_ALLOWANCE
    const scale = 0.85 
    const padding = 45 
    
    // Исправление 7: Синхронизация масштабирования SVG viewBox
    const svgWidth = (totalLength * scale) + padding * 2
    const svgHeight = 180 

    const xHeel = padding
    const xBall = padding + (totalLength * (rockerStartPct / 100)) * scale 
    const xToe = padding + (totalLength * scale)
    
    const yGround = 150 

    const hScaled = heelHeight * scale
    const tScaled = toeThickness * scale
    
    const yFootHeel = yGround - hScaled
    const yFootBall = yGround - tScaled
    
    // Исправление 4: Сброс угла рокера при flat подошве, чтобы избежать невидимого искривления
    const activeRockerAngle = soleType === 'rocker' ? rockerAngle : 0 
    const rockerZoneLength = xToe - xBall
    const rockerAngleRad = activeRockerAngle * (Math.PI / 180)
    
    // Исправление 1: Безопасный расчет синуса для рокера (защита от аномалий)
    const safeSine = Math.min(1, Math.max(0, Math.sin(rockerAngleRad)))
    const toeLiftRaw = rockerZoneLength * safeSine
    const toeLiftScaled = Math.min(MAX_LIFT * scale, toeLiftRaw)
    const yFootToe = yFootBall - toeLiftScaled

    const controlX1 = xHeel + (xBall - xHeel) * 0.4
    const controlX2 = xHeel + (xBall - xHeel) * 0.7

    // Исправление 2: Корректные контрольные точки Cubic Bezier по оси Y
    const controlY1 = yFootHeel * 0.7 + yFootBall * 0.3
    const controlY2 = yFootHeel * 0.3 + yFootBall * 0.7

    const topPath = `
      M ${xHeel - 5} ${yFootHeel - 5} 
      L ${xHeel} ${yFootHeel} 
      C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${xBall} ${yFootBall}
      Q ${xBall + rockerZoneLength * 0.5} ${yFootBall}, ${xToe} ${yFootToe}
    `

    // Исправление 3: Согласованность координат пятки и платформы
    const platformBase = Math.max(tScaled, 2) // минимум 2px
    const yHeelBase = yGround - hScaled + platformBase 
    const yBottomBall = yGround
    const yBottomToe = soleType === 'rocker' ? yFootToe + platformBase : yGround - 2
    
    const bottomPath = `
      L ${xToe} ${yBottomToe}
      Q ${xBall + rockerZoneLength * 0.5} ${yBottomBall}, ${xBall} ${yBottomBall}
      C ${controlX2} ${yBottomBall}, ${controlX1} ${yHeelBase}, ${xHeel} ${yHeelBase}
      Z
    `
    const solePath = topPath + bottomPath

    const heelW = 20 * scale 
    const getHeelPath = () => {
      if (soleType === 'rocker') {
        return `
          M ${xHeel} ${yHeelBase - 0.5}
          C ${controlX1} ${yHeelBase}, ${controlX2} ${yBottomBall}, ${xBall} ${yBottomBall}
          L ${xHeel + 30} ${yGround}
          C ${xHeel + 15} ${yGround}, ${xHeel - 2} ${yGround - (hScaled * 0.3)}, ${xHeel} ${yHeelBase - 0.5}
          Z
        `
      }

      switch (heelType) {
        case 'stiletto': 
          return `M ${xHeel + 2} ${yHeelBase - 1} 
                  L ${xHeel + 4} ${yGround} 
                  L ${xHeel + 10} ${yGround} 
                  L ${xHeel + 14} ${yHeelBase - 1} Z`
        case 'block': 
          return `M ${xHeel - 2} ${yHeelBase - 1} 
                  L ${xHeel} ${yGround} 
                  L ${xHeel + heelW * 1.5} ${yGround} 
                  L ${xHeel + heelW * 1.5} ${yHeelBase - 1} Z`
        case 'kitten': 
          return `M ${xHeel + 2} ${yHeelBase - 1} 
                  Q ${xHeel + 10} ${yGround - hScaled * 0.5} ${xHeel + 8} ${yGround} 
                  L ${xHeel + 14} ${yGround} 
                  Q ${xHeel + 18} ${yGround - hScaled * 0.5} ${xHeel + 16} ${yHeelBase - 1} Z`
        default: return ''
      }
    }

    const shankLenScaled = engineeringData.shankLength * scale
    // Исправление 5: Динамический расчет высоты конца шанка в зависимости от рокера
    const shankEndY = soleType === 'rocker' ? yFootBall - (toeLiftScaled * 0.2) : yFootBall

    const shankCurve = `
      M ${xHeel + 5} ${yFootHeel + 2}
      C ${controlX1} ${yFootHeel + 2}, ${xHeel + shankLenScaled * 0.8} ${shankEndY + 2}, ${xHeel + shankLenScaled} ${shankEndY + 2}
    `

    return { 
      svgWidth, svgHeight, 
      solePath, shankCurve, heelPath: getHeelPath(),
      xHeel, xBall, xToe, yGround, scale, yFootBall, yFootHeel
    }
  }, [shoeSize, heelHeight, toeThickness, rockerAngle, rockerStartPct, heelType, soleType, engineeringData.shankLength])

  // --- 6. Компактный UI Степпера ---
  const Stepper = ({ label, value, min, max, onChange, unit = '', disabled = false }: any) => {
    const handleAdd = () => { if (!disabled && value < max) { triggerHaptic('light'); onChange(value + 1) } }
    const handleSub = () => { if (!disabled && value > min) { triggerHaptic('light'); onChange(value - 1) } }
    return (
      <div className={`bg-[#1C1816] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between transition-opacity duration-300 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
        <span className="text-[#A3988E] text-[10px] font-medium mb-1.5 uppercase tracking-wider">{label}</span>
        <div className="flex items-center justify-between gap-1">
          <button onClick={handleSub} disabled={disabled || value <= min} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 active:bg-white/10 active:scale-95 disabled:opacity-30">
            <span className="text-xl font-medium leading-none mb-0.5">-</span>
          </button>
          <div className="flex items-baseline justify-center font-bold text-[15px] text-[#F3EFEA]">
            {value}<span className="text-[10px] text-[#A3988E] ml-0.5">{unit}</span>
          </div>
          <button onClick={handleAdd} disabled={disabled || value >= max} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 active:bg-white/10 active:scale-95 disabled:opacity-30">
            <span className="text-xl font-medium leading-none mb-0.5">+</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-[100dvh] bg-[#110F0E] text-[#F3EFEA] overflow-hidden">
      
      {/* Шапка */}
      <div className="flex-shrink-0 p-3 flex items-center justify-between border-b border-white/5 bg-[#110F0E]/80 backdrop-blur-md z-10">
        <button onClick={() => { triggerHaptic('light'); onBack() }} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1C1816] border border-white/5 active:scale-90 transition-transform">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="text-right">
          <h1 className="text-[14px] font-medium leading-none mb-1">{t.title}</h1>
          <p className="text-[10px] text-[#A3988E]">{t.desc}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-8">
        
        {/* Интерактивный Экран (Канвас) */}
        <div className={`flex flex-col rounded-[16px] border transition-colors duration-500 overflow-hidden relative ${balanceAudit.boxColors}`}>
          <div className="flex flex-col p-2.5 pb-0 z-10 min-h-[45px]">
            <div className="flex justify-between items-start gap-2">
              <div className="flex flex-col">
                <span className={`text-[11px] font-bold ${balanceAudit.colors.split(' ').pop()}`}>{balanceAudit.title}</span>
                <span className="text-[10px] opacity-80 mt-0.5">{balanceAudit.message}</span>
              </div>
              {balanceAudit.status === 'ERROR' && (
                <button onClick={handleAutoFix} className="shrink-0 bg-[#8B5CF6] text-white text-[11px] font-bold py-1 px-2.5 rounded-md shadow-lg active:scale-95 transition-transform flex items-center gap-1">
                  🪄 {t.fixBtn}
                </button>
              )}
            </div>
          </div>

          {/* Векторная отрисовка */}
          <div className="relative flex justify-center items-center w-full" style={{ height: geometry.svgHeight }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${geometry.svgWidth} ${geometry.svgHeight}`} preserveAspectRatio="xMidYMax meet" className="overflow-visible">
              
              <text x={geometry.xHeel - 15} y="25" fill="#8B5CF6" fontSize="10" fontWeight="bold" opacity="0.8">{t.heelLbl}</text>
              <text x={geometry.xToe - 30} y="25" fill="#8B5CF6" fontSize="10" fontWeight="bold" opacity="0.8">{t.toeLbl}</text>
              
              <line x1="0" y1={geometry.yGround} x2={geometry.svgWidth} y2={geometry.yGround} stroke="#4A423C" strokeWidth="1" strokeDasharray="2 2" />
              
              <line x1={geometry.xHeel - 15} y1={geometry.yFootBall} x2={geometry.xToe + 15} y2={geometry.yFootBall} stroke="#3B82F6" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" style={{ transition: 'all 0.3s ease' }} />
              <text x={geometry.xHeel - 40} y={geometry.yFootBall + 3} fill="#3B82F6" fontSize="9" fontWeight="600" style={{ transition: 'all 0.3s ease' }}>H: {heelHeight - toeThickness}</text>

              <path d={geometry.heelPath} fill="#D49A5C" opacity="0.8" style={{ transition: 'all 0.3s ease' }} />
              <path d={geometry.solePath} fill="#2A2421" stroke="#D49A5C" strokeWidth="1.5" strokeLinejoin="round" style={{ transition: 'all 0.3s ease' }} />
              <path d={geometry.shankCurve} fill="none" stroke="#94A3B8" strokeWidth={engineeringData.steelThickness * geometry.scale} strokeLinecap="round" style={{ transition: 'all 0.3s ease' }} />

              {soleType === 'rocker' && (
                <>
                  <circle cx={geometry.xBall} cy={geometry.yFootBall} r="3" fill="#EF4444" style={{ transition: 'all 0.3s ease' }} />
                  <line x1={geometry.xBall} y1={geometry.yFootBall} x2={geometry.xBall} y2={geometry.yGround} stroke="#EF4444" strokeWidth="1" strokeDasharray="2 2" style={{ transition: 'all 0.3s ease' }} />
                </>
              )}
            </svg>
          </div>

          <div className="px-3 pb-2 pt-1 border-t border-white/5 flex justify-between text-[10px] opacity-90 z-10 bg-black/20">
            <span>{t.internalSlope} <strong className="text-[11px]">{engineeringData.internalSlope.toFixed(1)}°</strong></span>
            <span>{t.loadLbl} <strong className={`text-[11px] ${engineeringData.forefootLoad >= CRITICAL_LOAD ? 'text-red-400' : ''}`}>{engineeringData.forefootLoad}%</strong></span>
          </div>
        </div>

        {/* Переключатели */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex bg-[#1C1816] p-1 rounded-xl border border-white/5">
            {(['flat', 'rocker'] as const).map(type => (
              <button key={type} onClick={() => { triggerHaptic('light'); setSoleType(type) }} className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${soleType === type ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-[#A3988E] bg-transparent'}`}>{t[type]}</button>
            ))}
          </div>
          <div className="flex bg-[#1C1816] p-1 rounded-xl border border-white/5">
            {(['stiletto', 'block', 'kitten'] as const).map(type => {
              const isRocker = soleType === 'rocker'
              return (
                <button 
                  key={type} 
                  disabled={isRocker}
                  onClick={() => { triggerHaptic('light'); setHeelType(type) }} 
                  className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-300
                    ${isRocker 
                      ? 'opacity-30 cursor-not-allowed text-[#A3988E]' 
                      : heelType === type 
                        ? 'bg-[#8B5CF6] text-white shadow-md' 
                        : 'text-[#A3988E] bg-transparent hover:bg-white/5'}`}
                >
                  {t[type]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Сетка контролов */}
        <div className="grid grid-cols-2 gap-2">
          <Stepper label={t.size} min={33} max={48} value={shoeSize} onChange={setShoeSize} />
          <Stepper label={t.heel} min={10} max={130} value={heelHeight} onChange={setHeelHeight} unit="мм" />
          <Stepper label={t.toe} min={0} max={Math.min(MAX_TOE, heelHeight + 10)} value={toeThickness} onChange={setToeThickness} unit="мм" />
          <Stepper label={t.angle} min={5} max={30} value={rockerAngle} onChange={setRockerAngle} unit="°" disabled={soleType === 'flat'} />
          <div className="col-span-2">
            <Stepper label={t.start} min={55} max={75} value={rockerStartPct} onChange={setRockerStartPct} unit="%" disabled={soleType === 'flat'} />
          </div>
        </div>
        
        {/* Спецификация */}
        <div className="pt-1">
          <button onClick={() => { triggerHaptic('light'); setShowSpecs(!showSpecs) }} className="w-full py-2.5 px-3 bg-[#1C1816] rounded-xl text-[12px] font-medium flex items-center justify-between border border-white/5">
            <span>{t.specsBtn}</span>
            <svg className={`w-4 h-4 text-[#A3988E] transition-transform duration-300 ${showSpecs ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          <AnimatePresence>
            {showSpecs && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 6 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-[#1C1816] p-3 rounded-xl border border-white/5 text-[11px] text-[#A3988E] space-y-2">
                  <div className="flex justify-between"><span>Длина геленка:</span> <strong className="text-[#F3EFEA]">{engineeringData.shankLength} мм</strong></div>
                  <div className="flex justify-between"><span>Толщина стали (65Г):</span> <strong className="text-[#F3EFEA]">{engineeringData.steelThickness.toFixed(1)} мм</strong></div>
                  <div className="flex justify-between"><span>L_eff ({(L_EFF_RATIO * 100).toFixed(0)}%):</span> <strong className="text-[#F3EFEA]">{engineeringData.lEff.toFixed(1)} мм</strong></div>
                  <div className="flex justify-between"><span>H_ref:</span> <strong className="text-[#F3EFEA]">{H_REF} мм</strong></div>
                  <div className="pt-2 mt-2 border-t border-white/5 font-mono text-[10px] text-[#D49A5C] bg-black/20 p-2 rounded-lg text-center">
                    Angle = arcsin((H - T) / L_eff)
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
