import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'

type HeelCalcPageProps = {
  onBack: () => void
  lang: Lang
}

// Премиальная тема оформления (в стиле кожа / тан / золото)
const THEME = {
  bg: '#151210',
  surface: '#1D1815',
  surfaceInput: '#151210',
  border: 'rgba(198, 164, 122, 0.2)',
  accent: '#C6A47A',
  accentSoft: '#E8C9A0',
  buttonText: '#0F0D0B',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
}

export function HeelCalcPage({ onBack, lang }: HeelCalcPageProps) {
  // --- Стейты ---
  const [shoeSize, setShoeSize] = useState(42)
  const [heelHeight, setHeelHeight] = useState(50)     // мм
  const [toeThickness, setToeThickness] = useState(12) // мм
  const [rockerAngle, setRockerAngle] = useState(22)   // градусы
  const [rockerStartPct, setRockerStartPct] = useState(63) // %

  // Haptic Feedback
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
      else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 15 : 30)
    } catch {}
  }

  // --- Локализация ---
  const t = {
    ru: {
      title: 'Биомеханика и Подбор',
      desc: 'Расчет рокерной подошвы (Rigid Rocker Bottom)',
      size: 'Размер (EU)',
      heel: 'Высота каблука',
      toe: 'Толщина носка',
      angle: 'Угол переката',
      start: 'Начало переката',
      fixBtn: '🪄 Сбалансировать автоматически',
      groundLine: 'ЛИНИЯ ОПОРЫ',
      rockerPoint: 'Точка переката',
      internalSlope: 'Внутренний наклон устилки:',
      targetRocker: 'Заданный рокер:',
      successTitle: '✅ ГЕОМЕТРИЯ ПРОШЛА АУДИТ',
      successDesc: 'Рокерный перекат компенсирует наклон. Колодка сбалансирована.',
      warnTitle: '⚠️ ТЕХНОЛОГИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ',
      warn1Desc: 'Высокий подъем без переката. Перегрузка головок плюсневых костей.',
      warn2Desc: 'Эффект "обратного завала". Центр тяжести смещен на пятку.',
      errTitle: '❌ БЛОКИРОВКА ПРОИЗВОДСТВА',
      errDesc: 'КРИТИЧЕСКАЯ ДИСПРОПОРЦИЯ! Опорная площадка в пучках отсутствует.',
    },
    uk: {
      title: 'Біомеханіка та Підбор',
      desc: 'Розрахунок рокерної підошви (Rigid Rocker Bottom)',
      size: 'Розмір (EU)',
      heel: 'Висота підбора',
      toe: 'Товщина носка',
      angle: 'Кут перекату',
      start: 'Початок перекату',
      fixBtn: '🪄 Збалансувати автоматично',
      groundLine: 'ЛІНІЯ ОПОРИ',
      rockerPoint: 'Точка перекату',
      internalSlope: 'Внутрішній нахил устілки:',
      targetRocker: 'Заданий рокер:',
      successTitle: '✅ ГЕОМЕТРІЯ ПРОЙШЛА АУДИТ',
      successDesc: 'Рокерний перекат компенсує нахил. Колодка збалансована.',
      warnTitle: '⚠️ ТЕХНОЛОГІЧНЕ ПОПЕРЕДЖЕННЯ',
      warn1Desc: 'Високий підйом без перекату. Перевантаження головок плеснових кісток.',
      warn2Desc: 'Ефект "зворотного завалу". Центр ваги зміщений на п\'яту.',
      errTitle: '❌ БЛОКУВАННЯ ВИРОБНИЦТВА',
      errDesc: 'КРИТИЧНА ДИСПРОПОРЦІЯ! Опорний майданчик у пучках відсутній.',
    },
  }[lang]

  // --- Математика внутреннего угла ---
  const calculateInternalSlope = (size: number, heel: number, toe: number) => {
    const lastLengthMm = size * 6.67 + 12
    const lEff = lastLengthMm * 0.73
    const netHeelRise = heel - toe
    const asinArg = Math.max(-1, Math.min(1, netHeelRise / lEff))
    return Math.asin(asinArg) * (180 / Math.PI)
  }

  // --- Автокоррекция ---
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

  // --- Расчет геометрии SVG ---
  const geometry = useMemo(() => {
    const totalLength = shoeSize * 6.67 + 12
    const scale = 1.15
    const svgWidth = totalLength * scale
    const svgHeight = 150
    const padding = 16

    const xHeel = padding
    const xRockerStart = padding + totalLength * (rockerStartPct / 100) * scale
    const xToe = padding + totalLength * scale
    const yGround = 130

    const ySoleHeelBottom = yGround
    const ySoleRockerBottom = yGround

    const rockerLengthMm = totalLength * (1 - rockerStartPct / 100)
    const rockerLengthSvg = rockerLengthMm * scale
    const toeLiftSvg = rockerLengthSvg * Math.sin((rockerAngle * Math.PI) / 180)
    const ySoleToeBottom = yGround - toeLiftSvg

    const ySoleHeelTop = yGround - heelHeight * scale
    const ySoleRockerTop = yGround - toeThickness * scale
    const ySoleToeTop = ySoleToeBottom - toeThickness * scale

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
    }
  }, [shoeSize, heelHeight, toeThickness, rockerAngle, rockerStartPct])

  // --- Аудит баланса ---
  const balanceAudit = useMemo(() => {
    const internalSlopeAngle = calculateInternalSlope(shoeSize, heelHeight, toeThickness)
    
    let status: 'SUCCESS' | 'WARNING' | 'ERROR' = 'SUCCESS'
    let title = t.successTitle
    let message = t.successDesc
    let style = { borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.1)', color: '#34D399' }

    if (heelHeight > 40 && rockerAngle > 15) {
      status = 'ERROR'
      title = t.errTitle
      message = t.errDesc
      style = { borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', color: '#F87171' }
    } else if (internalSlopeAngle > 14 && rockerAngle < 8) {
      status = 'WARNING'
      title = t.warnTitle
      message = t.warn1Desc
      style = { borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.1)', color: '#FBBF24' }
    } else if (heelHeight < 20 && rockerAngle > 16) {
      status = 'WARNING'
      title = t.warnTitle
      message = t.warn2Desc
      style = { borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.1)', color: '#FBBF24' }
    }

    return { status, title, message, style, internalSlope: internalSlopeAngle.toFixed(1) }
  }, [shoeSize, heelHeight, rockerAngle, toeThickness, t])

  // --- Компонент удобного слайдера ---
  const CustomSlider = ({
    label,
    min,
    max,
    value,
    unit = '',
    step = 1,
    onChange,
  }: {
    label: string
    min: number
    max: number
    value: number
    unit?: string
    step?: number
    onChange: (val: number) => void
  }) => {
    const pct = ((value - min) / (max - min)) * 100

    return (
      <div className="mb-5 last:mb-0">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-[13px] font-medium text-[#B9ACA0]">{label}</span>
          <span className="text-[15px] font-semibold" style={{ color: THEME.accentSoft }}>
            {value}{unit}
          </span>
        </div>
        <div className="relative">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            onPointerUp={() => triggerHaptic('light')}
            className="w-full h-2 appearance-none bg-transparent cursor-pointer relative z-10
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-[22px]
              [&::-webkit-slider-thumb]:h-[22px]
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:border-[3px]
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-[22px]
              [&::-moz-range-thumb]:h-[22px]
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-[3px]"
            style={{
              background: `linear-gradient(to right, ${THEME.accent} 0%, ${THEME.accent} ${pct}%, #2A231D ${pct}%, #2A231D 100%)`,
              borderRadius: 999,
            }}
          />
          <style>{`
            input[type=range]::-webkit-slider-thumb {
              background: ${THEME.accentSoft} !important;
              border-color: ${THEME.accent} !important;
              box-shadow: 0 0 16px ${THEME.accent}66 !important;
            }
            input[type=range]::-moz-range-thumb {
              background: ${THEME.accentSoft} !important;
              border-color: ${THEME.accent} !important;
            }
          `}</style>
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-[#B9ACA0]/60">
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="relative flex flex-col h-[100dvh] bg-[#151210] text-[#F5F1EB] overflow-hidden"
    >
      {/* Шапка */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#C6A47A]/10 bg-[#151210]/90 backdrop-blur-md">
        <button
          onClick={() => { triggerHaptic(); onBack() }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1D1815] border border-[#C6A47A]/20 active:scale-90 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-center">
          <h1 className="text-[15px] font-medium tracking-wide">{t.title}</h1>
          <p className="text-[11px] text-[#B9ACA0]">{t.desc}</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Основной контент со скроллом */}
      <div className="flex-1 overflow-y-auto px-4 pb-12 pt-4 scrollbar-hide space-y-4">
        
        {/* SVG Визуализатор */}
        <div className="rounded-3xl bg-[#1D1815] border border-[#C6A47A]/20 p-4 relative overflow-hidden shadow-sm">
          <div className="flex justify-center">
            <svg width="100%" viewBox={`0 0 ${geometry.svgWidth} ${geometry.svgHeight}`} className="overflow-visible max-h-[140px]">
              {/* Линия земли */}
              <line x1="0" y1={geometry.yGround} x2={geometry.svgWidth} y2={geometry.yGround} stroke="#4A423C" strokeWidth="1" strokeDasharray="4 4" />
              <text x="4" y={geometry.yGround + 12} fontSize="9" fill="#8A827C">{t.groundLine}</text>

              {/* Тело подошвы */}
              <path d={geometry.solePath} fill="#26201D" stroke={THEME.accent} strokeWidth="2" strokeLinejoin="round" />

              {/* Точка переката */}
              <circle cx={geometry.xRockerStart} cy={geometry.yGround} r="4" fill="#EF4444" />
              <line x1={geometry.xRockerStart} y1={geometry.yGround} x2={geometry.xRockerStart} y2={geometry.yGround - 30} stroke="#EF4444" strokeWidth="1" strokeDasharray="2 2" />
              <text x={geometry.xRockerStart - 30} y={geometry.yGround - 35} fontSize="9" fill="#EF4444">{t.rockerPoint} ({rockerStartPct}%)</text>

              {/* Угол рокера */}
              <path 
                d={`M ${geometry.xRockerStart + 30} ${geometry.yGround} A 30 30 0 0 0 ${geometry.xRockerStart + 30} ${geometry.yGround - 12}`} 
                fill="none" stroke="#C6A47A" strokeWidth="1.5" 
              />
              <text x={geometry.xToe - 40} y={geometry.yGround - 5} fontSize="10" fill={THEME.accentSoft} fontWeight="600">{rockerAngle}°</text>
            </svg>
          </div>
        </div>

        {/* Панель аудита */}
        <div className="rounded-3xl p-4 border transition-colors duration-300 shadow-sm" style={balanceAudit.style}>
          <div className="flex justify-between items-start mb-2">
            <strong className="text-[13px] tracking-wide font-semibold">{balanceAudit.title}</strong>
            {balanceAudit.status !== 'SUCCESS' && (
              <button 
                onClick={handleAutoFix}
                className="bg-[#C6A47A] hover:bg-[#b5936b] active:scale-95 text-[#0F0D0B] text-[11px] font-bold py-1.5 px-3 rounded-xl shadow-md transition-transform ml-2 shrink-0"
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

        {/* Блок ползунков управления */}
        <div className="rounded-3xl bg-[#1D1815] border border-[#C6A47A]/20 p-5 shadow-sm">
          <CustomSlider label={t.size} min={35} max={48} value={shoeSize} onChange={setShoeSize} />
          <div className="h-px bg-[#C6A47A]/10 my-4 w-full" />
          <CustomSlider label={t.heel} min={10} max={60} value={heelHeight} unit=" мм" onChange={setHeelHeight} />
          <CustomSlider label={t.toe} min={5} max={30} value={toeThickness} unit=" мм" onChange={setToeThickness} />
          <div className="h-px bg-[#C6A47A]/10 my-4 w-full" />
          <CustomSlider label={t.angle} min={5} max={30} value={rockerAngle} unit="°" onChange={setRockerAngle} />
          <CustomSlider label={t.start} min={55} max={75} value={rockerStartPct} unit="%" onChange={setRockerStartPct} />
        </div>

      </div>
    </motion.div>
  )
}
