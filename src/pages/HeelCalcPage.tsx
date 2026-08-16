import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Lang } from '../App'

type HeelCalcPageProps = {
  onBack: () => void
  lang: Lang
}

export function HeelCalcPage({ onBack, lang }: HeelCalcPageProps) {
  // --- 1. Стейты ---
  const [shoeSize, setShoeSize] = useState(42)
  const [heelHeight, setHeelHeight] = useState(50)     
  const [toeThickness, setToeThickness] = useState(12) 
  const [rockerAngle, setRockerAngle] = useState(22)   
  const [rockerStartPct, setRockerStartPct] = useState(63) 

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
      title: 'Биомеханика и Каблук',
      desc: 'Расчет рокерной подошвы',
      size: 'Размер',
      heel: 'Каблук (мм)',
      toe: 'Носок (мм)',
      angle: 'Угол (°)',
      start: 'Старт (%)',
      fixBtn: '🪄 Баланс',
      groundLine: 'ЛИНИЯ ОПОРЫ',
      rockerPoint: 'Точка переката',
      internalSlope: 'Наклон:',
      targetRocker: 'Рокер:',
      successTitle: '✅ АУДИТ ПРОЙДЕН',
      successDesc: 'Рокер компенсирует наклон. Колодка сбалансирована.',
      warnTitle: '⚠️ ПРЕДУПРЕЖДЕНИЕ',
      warn1Desc: 'Высокий подъем без переката. Перегрузка плюсневых костей.',
      warn2Desc: 'Эффект "обратного завала". Центр тяжести на пятке.',
      errTitle: '❌ БЛОКИРОВКА',
      errDesc: 'Критическая диспропорция! Пациент будет соскальзывать.',
    },
    uk: {
      title: 'Біомеханіка та Підбор',
      desc: 'Розрахунок рокерної підошви',
      size: 'Розмір',
      heel: 'Підбор (мм)',
      toe: 'Носок (мм)',
      angle: 'Кут (°)',
      start: 'Старт (%)',
      fixBtn: '🪄 Баланс',
      groundLine: 'ЛІНІЯ ОПОРИ',
      rockerPoint: 'Точка перекату',
      internalSlope: 'Нахил:',
      targetRocker: 'Рокер:',
      successTitle: '✅ АУДИТ ПРОЙДЕНО',
      successDesc: 'Рокер компенсує нахил. Колодка збалансована.',
      warnTitle: '⚠️ ПОПЕРЕДЖЕННЯ',
      warn1Desc: 'Високий підйом без перекату. Перевантаження плеснових кісток.',
      warn2Desc: 'Ефект "зворотного завалу". Центр ваги на п\'яті.',
      errTitle: '❌ БЛОКУВАННЯ',
      errDesc: 'Критична диспропорція! Пацієнт буде зісковзувати.',
    },
  }[lang]

  // --- 3. Вычисления ---
  const calculateInternalSlope = (size: number, heel: number, toe: number) => {
    const lastLengthMm = size * 6.67 + 12
    const lEff = lastLengthMm * 0.73
    const netHeelRise = heel - toe
    const asinArg = Math.max(-1, Math.min(1, netHeelRise / lEff))
    return Math.asin(asinArg) * (180 / Math.PI)
  }

  // --- 4. Auto-Fix ---
  const handleAutoFix = () => {
    triggerHaptic('medium')
    const internalSlope = calculateInternalSlope(shoeSize, heelHeight, toeThickness)
    let idealRocker = Math.round(internalSlope - 2)
    idealRocker = Math.max(5, Math.min(20, idealRocker)) 
    
    if (heelHeight > 45 && idealRocker >= 20) {
      const maxSafeHeel = Math.round(
        ((shoeSize * 6.67 + 12) * 0.73 * Math.sin((16 * Math.PI) / 180)) + toeThickness
      )
      setHeelHeight(maxSafeHeel)
      setRockerAngle(14)
      return
    }
    setRockerAngle(idealRocker)
  }

  // --- 5. Геометрия (Плавная анатомическая форма) ---
  const geometry = useMemo(() => {
    const totalLength = shoeSize * 6.67 + 12
    const scale = 1.1 // Чуть уменьшили масштаб, чтобы точно влезло
    const svgWidth = totalLength * scale
    const svgHeight = 160
    const padding = 25

    const xHeel = padding
    const xRockerStart = padding + totalLength * (rockerStartPct / 100) * scale
    const xToe = padding + totalLength * scale
    const yGround = 135

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

    // Органический путь (Обувь, а не коробка)
    // Используем кубические кривые Безье (C) для формирования свода стопы и плавного носка
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

    return {
      svgWidth: svgWidth + padding * 2,
      svgHeight,
      solePath,
      xHeel,
      xRockerStart,
      xToe,
      yGround,
    }
  }, [shoeSize, heelHeight, toeThickness, rockerAngle, rockerStartPct])

  // --- 6. Аудит ---
  const balanceAudit = useMemo(() => {
    const internalSlopeAngle = calculateInternalSlope(shoeSize, heelHeight, toeThickness)
    
    let status: 'SUCCESS' | 'WARNING' | 'ERROR' = 'SUCCESS'
    let title = t.successTitle
    let message = t.successDesc
    let colorClasses = 'border-green-500/30 bg-green-500/10 text-green-400'

    if (heelHeight > 40 && rockerAngle > 15) {
      status = 'ERROR'
      title = t.errTitle
      message = t.errDesc
      colorClasses = 'border-red-500/30 bg-red-500/10 text-red-400'
    } else if (internalSlopeAngle > 14 && rockerAngle < 8) {
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

    return { status, title, message, colorClasses, internalSlope: internalSlopeAngle.toFixed(1) }
  }, [shoeSize, heelHeight, rockerAngle, toeThickness, t])

  // --- 7. UI Компонент Степпера ---
  const Stepper = ({ label, value, min, max, onChange, unit = '' }: any) => {
    const handleAdd = () => {
      if (value < max) { triggerHaptic('light'); onChange(value + 1) }
    }
    const handleSub = () => {
      if (value > min) { triggerHaptic('light'); onChange(value - 1) }
    }

    return (
      <div className="bg-[#1C1816] border border-white/5 rounded-[14px] p-3 flex flex-col justify-between">
        <span className="text-[#A3988E] text-[11px] font-medium mb-2">{label}</span>
        <div className="flex items-center justify-between bg-[#110F0E] rounded-[10px] p-1 border border-white/5">
          <button 
            onClick={handleSub}
            disabled={value <= min}
            className="w-8 h-8 flex items-center justify-center rounded-[8px] bg-white/5 active:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14"/></svg>
          </button>
          <span className="font-semibold text-[14px] text-[#F3EFEA]">
            {value}<span className="text-[10px] text-[#A3988E] ml-0.5">{unit}</span>
          </span>
          <button 
            onClick={handleAdd}
            disabled={value >= max}
            className="w-8 h-8 flex items-center justify-center rounded-[8px] bg-white/5 active:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col h-[100dvh] bg-[#110F0E] text-[#F3EFEA] overflow-hidden"
    >
      {/* Шапка (Компактная) */}
      <div className="flex-shrink-0 p-4 flex items-center justify-between border-b border-white/5 bg-[#110F0E]/80 backdrop-blur-md z-10">
        <button
          onClick={() => { triggerHaptic('light'); onBack() }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1C1816] border border-white/5 active:scale-90 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="text-right">
          <h1 className="text-[15px] font-medium leading-none mb-1">{t.title}</h1>
          <p className="text-[10px] text-[#A3988E]">{t.desc}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        
        {/* Окно визуализации SVG */}
        <div className="bg-[#1C1816] border border-white/5 rounded-[16px] p-2 relative overflow-hidden flex justify-center items-center h-[160px]">
          <svg width="100%" height="100%" viewBox={`0 0 ${geometry.svgWidth} ${geometry.svgHeight}`} className="overflow-visible">
            {/* Линия земли */}
            <line x1="0" y1={geometry.yGround} x2={geometry.svgWidth} y2={geometry.yGround} stroke="#4A423C" strokeWidth="1" strokeDasharray="3 3" />
            <text x="10" y={geometry.yGround + 12} fontSize="8" fill="#8A827C">{t.groundLine}</text>

            {/* Тело подошвы (Плавное) */}
            <path d={geometry.solePath} fill="#2A2421" stroke="#D49A5C" strokeWidth="1.5" strokeLinejoin="round" />

            {/* Точка переката */}
            <circle cx={geometry.xRockerStart} cy={geometry.yGround} r="3" fill="#EF4444" />
            <line x1={geometry.xRockerStart} y1={geometry.yGround} x2={geometry.xRockerStart} y2={geometry.yGround - 30} stroke="#EF4444" strokeWidth="1" strokeDasharray="2 2" />
            <text x={geometry.xRockerStart - 25} y={geometry.yGround - 35} fontSize="8" fill="#EF4444">{rockerStartPct}%</text>

            {/* Угол рокера */}
            <path 
              d={`M ${geometry.xRockerStart + 25} ${geometry.yGround} A 25 25 0 0 0 ${geometry.xRockerStart + 25} ${geometry.yGround - 9}`} 
              fill="none" stroke="#8B5CF6" strokeWidth="1.5" 
            />
            <text x={geometry.xToe - 35} y={geometry.yGround - 8} fontSize="9" fill="#8B5CF6" fontWeight="600">{rockerAngle}°</text>
          </svg>
        </div>

        {/* Панель аудита и Auto-fix (Сжатая) */}
        <div className={`p-3 rounded-[14px] border transition-colors duration-300 ${balanceAudit.colorClasses}`}>
          <div className="flex justify-between items-center mb-1.5">
            <strong className="text-[12px] tracking-wide font-semibold">{balanceAudit.title}</strong>
            {balanceAudit.status !== 'SUCCESS' && (
              <button 
                onClick={handleAutoFix}
                className="bg-[#8B5CF6] hover:bg-[#7c50de] active:scale-95 text-white text-[10px] font-bold py-1 px-2.5 rounded-md shadow-md transition-transform ml-2 shrink-0"
              >
                {t.fixBtn}
              </button>
            )}
          </div>
          <p className="text-[11px] leading-snug opacity-90 mb-2">{balanceAudit.message}</p>
          <div className="text-[10px] opacity-75 pt-2 border-t border-current/20 flex justify-between">
            <span>{t.internalSlope} <strong>{balanceAudit.internalSlope}°</strong></span>
            <span>{t.targetRocker} <strong>{rockerAngle}°</strong></span>
          </div>
        </div>

        {/* Сетка контролов (Компактная) */}
        <div className="grid grid-cols-2 gap-3 pb-6">
          <div className="col-span-2">
            <Stepper label={t.size} min={35} max={48} value={shoeSize} onChange={setShoeSize} unit="EU" />
          </div>
          <Stepper label={t.heel} min={10} max={60} value={heelHeight} onChange={setHeelHeight} />
          <Stepper label={t.toe} min={5} max={30} value={toeThickness} onChange={setToeThickness} />
          <Stepper label={t.angle} min={5} max={30} value={rockerAngle} onChange={setRockerAngle} />
          <Stepper label={t.start} min={55} max={75} value={rockerStartPct} onChange={setRockerStartPct} />
        </div>
        
      </div>
    </motion.div>
  )
}
