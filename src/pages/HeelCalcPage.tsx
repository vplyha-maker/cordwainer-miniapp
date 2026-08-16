import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Lang } from '../App'

type HeelCalcPageProps = {
  onBack: () => void
  lang: Lang
}

export function HeelCalcPage({ onBack, lang }: HeelCalcPageProps) {
  // --- 1. Стейты (с критическими значениями по умолчанию для теста аудита) ---
  const [shoeSize, setShoeSize] = useState(42)
  const [heelHeight, setHeelHeight] = useState(50)     // Высота каблука в мм
  const [rockerAngle, setRockerAngle] = useState(22)   // Угол рокера в градусах
  const [toeThickness, setToeThickness] = useState(12) // Толщина в носке в мм
  const [rockerStartPct, setRockerStartPct] = useState(63) // Начало переката (%)

  // Haptic Feedback
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
      else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 20 : 40)
    } catch {}
  }

  // --- 2. Локализация (Словари) ---
  const t = {
    ru: {
      title: 'Биомеханика и Каблук',
      desc: 'Расчет рокерной подошвы (Rigid Rocker Bottom)',
      size: 'Размер (EU)',
      heel: 'Высота каблука (мм)',
      toe: 'Толщина носка (мм)',
      angle: 'Угол переката (°)',
      start: 'Начало переката (%)',
      fixBtn: '🪄 Сбалансировать автоматически',
      groundLine: 'ЛИНИЯ ОПОРЫ',
      rockerPoint: 'Точка переката',
      internalSlope: 'Внутренний наклон стельки:',
      targetRocker: 'Заданный рокер:',
      successTitle: '✅ ГЕОМЕТРИЯ ПРОШЛА АУДИТ',
      successDesc: 'Рокерный перекат компенсирует наклон. Колодка сбалансирована.',
      warnTitle: '⚠️ ТЕХНОЛОГИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ',
      warn1Desc: 'Высокий подъем без переката. Перегрузка головок плюсневых костей. Противопоказано диабетикам.',
      warn2Desc: 'Эффект "обратного завала". Центр тяжести смещен на пятку. Шаг затруднен.',
      errTitle: '❌ БЛОКИРОВКА ПРОИЗВОДСТВА',
      errDesc: 'КРИТИЧЕСКАЯ ДИСПРОПОРЦИЯ! Опорная площадка в пучках отсутствует. Пациент будет соскальзывать вперед.',
    },
    uk: {
      title: 'Біомеханіка та Підбор',
      desc: 'Розрахунок рокерної підошви (Rigid Rocker Bottom)',
      size: 'Розмір (EU)',
      heel: 'Висота підбора (мм)',
      toe: 'Товщина носка (мм)',
      angle: 'Кут перекату (°)',
      start: 'Початок перекату (%)',
      fixBtn: '🪄 Збалансувати автоматично',
      groundLine: 'ЛІНІЯ ОПОРИ',
      rockerPoint: 'Точка перекату',
      internalSlope: 'Внутрішній нахил устілки:',
      targetRocker: 'Заданий рокер:',
      successTitle: '✅ ГЕОМЕТРІЯ ПРОЙШЛА АУДИТ',
      successDesc: 'Рокерний перекат компенсує нахил. Колодка збалансована.',
      warnTitle: '⚠️ ТЕХНОЛОГІЧНЕ ПОПЕРЕДЖЕННЯ',
      warn1Desc: 'Високий підйом без перекату. Перевантаження головок плеснових кісток. Протипоказано діабетикам.',
      warn2Desc: 'Ефект "зворотного завалу". Центр ваги зміщений на п\'яту. Крок утруднений.',
      errTitle: '❌ БЛОКУВАННЯ ВИРОБНИЦТВА',
      errDesc: 'КРИТИЧНА ДИСПРОПОРЦІЯ! Опорний майданчик у пучках відсутній. Пацієнт буде зісковзувати вперед.',
    },
  }[lang]

  // --- 3. Вычисление внутреннего угла ---
  const calculateInternalSlope = (size: number, heel: number, toe: number) => {
    const lastLengthMm = size * 6.67 + 12
    const lEff = lastLengthMm * 0.73
    const netHeelRise = heel - toe
    const asinArg = Math.max(-1, Math.min(1, netHeelRise / lEff))
    return Math.asin(asinArg) * (180 / Math.PI)
  }

  // --- 4. Логика автокоррекции (Auto-Fix) ---
  const handleAutoFix = () => {
    triggerHaptic('medium')
    const internalSlope = calculateInternalSlope(shoeSize, heelHeight, toeThickness)
    
    // Идеальный угол рокера = наклон - 2 градуса сглаживания
    let idealRocker = Math.round(internalSlope - 2)
    idealRocker = Math.max(5, Math.min(20, idealRocker)) // Технологические рамки
    
    // Экстремальный случай: высокий каблук не компенсируется даже макс. рокером
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

  // --- 5. Расчет геометрии для SVG визуализатора ---
  const geometry = useMemo(() => {
    const totalLength = shoeSize * 6.67 + 12
    const scale = 1.2
    const svgWidth = totalLength * scale
    const svgHeight = 160
    const padding = 20

    const xHeel = padding
    const xRockerStart = padding + totalLength * (rockerStartPct / 100) * scale
    const xToe = padding + totalLength * scale
    const yGround = 140

    const ySoleHeelBottom = yGround
    const ySoleRockerBottom = yGround

    // Высота взлета носка (Math.sin)
    const rockerLengthMm = totalLength * (1 - rockerStartPct / 100)
    const rockerLengthSvg = rockerLengthMm * scale
    const toeLiftSvg = rockerLengthSvg * Math.sin((rockerAngle * Math.PI) / 180)
    const ySoleToeBottom = yGround - toeLiftSvg

    // Верхняя грань
    const ySoleHeelTop = yGround - heelHeight * scale
    const ySoleRockerTop = yGround - toeThickness * scale
    const ySoleToeTop = ySoleToeBottom - toeThickness * scale

    // Векторный Path
    const solePath = `
      M ${xHeel} ${ySoleHeelTop}
      Q ${(xHeel + xRockerStart) / 2} ${(ySoleHeelTop + ySoleRockerTop) / 2}, ${xRockerStart} ${ySoleRockerTop}
      L ${xToe} ${ySoleToeTop}
      L ${xToe} ${ySoleToeBottom}
      L ${xRockerStart} ${ySoleRockerBottom}
      L ${xHeel} ${ySoleHeelBottom}
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
      ySoleToeTop,
      totalLength: Math.round(totalLength)
    }
  }, [shoeSize, heelHeight, toeThickness, rockerAngle, rockerStartPct])

  // --- 6. Аудит баланса (Safety Check) ---
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

  // Рендер Range ползунка с общим стилем
  const RangeSlider = ({ label, min, max, value, onChange }: any) => (
    <div className="mb-4">
      <div className="flex justify-between text-[13px] mb-2 font-medium">
        <span className="text-[#A3988E]">{label}</span>
        <span className="text-[#F3EFEA]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={() => triggerHaptic('light')}
        className="w-full h-1.5 bg-white/10 rounded-full appearance-none outline-none accent-[#8B5CF6]"
      />
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col h-[100dvh] bg-[#110F0E] text-[#F3EFEA] overflow-hidden"
    >
      {/* Шапка */}
      <div className="flex-shrink-0 p-5 flex items-center justify-between border-b border-white/5 bg-[#110F0E]/80 backdrop-blur-md z-10">
        <button
          onClick={() => { triggerHaptic('light'); onBack() }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1816]/90 border border-white/5 active:scale-90 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-right">
          <h1 className="text-[16px] font-medium leading-none mb-1">{t.title}</h1>
          <p className="text-[11px] text-[#A3988E]">{t.desc}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 px-5 pt-5 space-y-6">
        
        {/* Окно визуализации SVG */}
        <div className="bg-[#1C1816] border border-white/5 rounded-[18px] p-4 relative overflow-hidden">
          <svg width="100%" viewBox={`0 0 ${geometry.svgWidth} ${geometry.svgHeight}`} className="overflow-visible">
            {/* Линия земли */}
            <line x1="0" y1={geometry.yGround} x2={geometry.svgWidth} y2={geometry.yGround} stroke="#4A423C" strokeWidth="1" strokeDasharray="4 4" />
            <text x="5" y={geometry.yGround + 14} fontSize="9" fill="#8A827C">{t.groundLine}</text>

            {/* Тело подошвы */}
            <path d={geometry.solePath} fill="#2A2421" stroke="#D49A5C" strokeWidth="2" strokeLinejoin="round" />

            {/* Точка переката */}
            <circle cx={geometry.xRockerStart} cy={geometry.yGround} r="3.5" fill="#EF4444" />
            <line x1={geometry.xRockerStart} y1={geometry.yGround} x2={geometry.xRockerStart} y2={geometry.yGround - 35} stroke="#EF4444" strokeWidth="1" strokeDasharray="2 2" />
            <text x={geometry.xRockerStart - 35} y={geometry.yGround - 40} fontSize="9" fill="#EF4444">{t.rockerPoint} ({rockerStartPct}%)</text>

            {/* Угол рокера */}
            <path 
              d={`M ${geometry.xRockerStart + 35} ${geometry.yGround} A 35 35 0 0 0 ${geometry.xRockerStart + 35} ${geometry.yGround - 12}`} 
              fill="none" stroke="#8B5CF6" strokeWidth="1.5" 
            />
            <text x={geometry.xToe - 45} y={geometry.yGround - 5} fontSize="10" fill="#8B5CF6" fontWeight="600">{rockerAngle}°</text>
          </svg>
        </div>

        {/* Панель аудита и Auto-fix */}
        <div className={`p-4 rounded-[16px] border transition-colors duration-300 ${balanceAudit.colorClasses}`}>
          <div className="flex justify-between items-start mb-2">
            <strong className="text-[13px] tracking-wide font-semibold">{balanceAudit.title}</strong>
            {balanceAudit.status !== 'SUCCESS' && (
              <button 
                onClick={handleAutoFix}
                className="bg-[#8B5CF6] hover:bg-[#7c50de] active:scale-95 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg shadow-lg transition-transform ml-2 shrink-0"
              >
                {t.fixBtn}
              </button>
            )}
          </div>
          <p className="text-[12px] leading-relaxed mb-3 opacity-90">{balanceAudit.message}</p>
          <div className="text-[11px] opacity-75 pt-3 border-t border-current/20 flex justify-between">
            <span>{t.internalSlope} <strong>{balanceAudit.internalSlope}°</strong></span>
            <span>{t.targetRocker} <strong>{rockerAngle}°</strong></span>
          </div>
        </div>

        {/* Ползунки управления */}
        <div className="bg-[#1C1816] border border-white/5 rounded-[18px] p-5 space-y-2">
          <RangeSlider label={t.size} min={35} max={48} value={shoeSize} onChange={setShoeSize} />
          
          <div className="h-px bg-white/5 my-4 w-full" />
          
          <RangeSlider label={t.heel} min={10} max={60} value={heelHeight} onChange={setHeelHeight} />
          <RangeSlider label={t.toe} min={5} max={30} value={toeThickness} onChange={setToeThickness} />
          
          <div className="h-px bg-white/5 my-4 w-full" />
          
          <RangeSlider label={t.angle} min={5} max={30} value={rockerAngle} onChange={setRockerAngle} />
          <RangeSlider label={t.start} min={55} max={75} value={rockerStartPct} onChange={setRockerStartPct} />
        </div>
      </div>
    </motion.div>
  )
}
