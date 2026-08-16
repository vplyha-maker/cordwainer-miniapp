import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'
import { calculateHeelGeometry } from '../lib/heelCalc'

type HeelCalcPageProps = {
  onBack: () => void
  lang: Lang
}

type InfoKey = 'size' | 'angle' | 'tToe' | 'toeRoll' | 'effLength' | 'netHeel' | 'totalHeel' | null

const THEME = {
  bg: '#110F0E',
  surface: '#1C1816',
  surfaceHover: '#2A231F',
  accent: '#D49A5C',      // Тан / Кожа
  danger: '#EF4444',      // Красный для Warning
  textPrimary: '#F3EFEA',
  textSecondary: '#A3988E',
  border: 'rgba(255, 255, 255, 0.06)'
}

export function HeelCalcPage({ onBack, lang }: HeelCalcPageProps) {
  const [shoeSize, setShoeSize] = useState(42)
  const [angleDeg, setAngleDeg] = useState(10)
  const [tToe, setTToe] = useState(8)
  const [toeRoll, setToeRoll] = useState(12)
  
  const [activeInfo, setActiveInfo] = useState<InfoKey>(null)

  const result = useMemo(() => 
    calculateHeelGeometry({ shoeSize, angleDeg, tToe, toeRoll }), 
  [shoeSize, angleDeg, tToe, toeRoll])

  const triggerHaptic = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
    } catch {}
  }, [])

  const openInfo = (key: InfoKey) => {
    triggerHaptic('light')
    setActiveInfo(key)
  }

  const t = {
    ru: {
      title: 'Высота каблука',
      subtitle: 'Биомеханический расчет H_heel',
      size: 'Размер (EU)',
      angle: 'Угол геленка (α)',
      tToe: 'Толщина носка (T_toe)',
      toeRoll: 'Перекат носка (Δh)',
      effLength: 'Эффективная длина (L_eff)',
      netHeel: 'Приподнятость пятки',
      totalHeel: 'Высота каблука',
      warningTitle: 'Критический наклон',
      warningText: 'Угол более 14° или высота > 40мм критически снижает площадь опоры пятки. Давление на плюсневую зону увеличено на 65%+',
      info: {
        size: { title: 'Размер обуви', desc: 'Определяет базовую длину стопы. Пропорционально влияет на длину геленочной части и общую геометрию колодки.' },
        angle: { title: 'Угол геленка (α)', desc: 'Угол наклона стопы от пучков до пятки. Определяет крутизну подъема. Слишком большой угол переносит критический вес на переднюю часть стопы.' },
        tToe: { title: 'Толщина носка', desc: 'Высота подошвы в носочной части. Действует как платформа, приподнимая всю стопу и соответственно увеличивая итоговую высоту каблука.' },
        toeRoll: { title: 'Перекат носка', desc: 'Приподнятость самого кончика носка от земли. Необходима для обеспечения естественного биомеханического переката стопы при шаге.' },
        effLength: { title: 'Длина переката', desc: 'Горизонтальное расстояние от кончика носка до точки опоры пучковой части. Зависит от формы носка и величины переката.' },
        netHeel: { title: 'Чистая приподнятость', desc: 'Реальная биомеханическая высота подъема пятки относительно пучковой части стопы, без учета толщины самой подошвы.' },
        totalHeel: { title: 'Физическая высота', desc: 'Итоговая габаритная высота каблука от земли до пяточной части колодки (учитывает и угол подъема, и толщину подошвы).' },
      }
    },
    uk: {
      title: 'Висота підбора',
      subtitle: 'Біомеханічний розрахунок H_heel',
      size: 'Розмір (EU)',
      angle: 'Кут геленка (α)',
      tToe: 'Товщина носка (T_toe)',
      toeRoll: 'Перекат носка (Δh)',
      effLength: 'Ефективна довжина (L_eff)',
      netHeel: 'Піднятість п\'яти',
      totalHeel: 'Висота підбора',
      warningTitle: 'Критичний нахил',
      warningText: 'Кут понад 14° або висота > 40мм критично знижує площу опори п\'яти. Тиск на плеснову зону збільшено на 65%+',
      info: {
        size: { title: 'Розмір взуття', desc: 'Визначає базову довжину стопи. Пропорційно впливає на довжину геленкової частини та загальну геометрію колодки.' },
        angle: { title: 'Кут геленка (α)', desc: 'Кут нахилу стопи від пучків до п\'яти. Визначає крутизну підйому. Занадто великий кут переносит критичну вагу на передню частину.' },
        tToe: { title: 'Товщина носка', desc: 'Висота підошви в носковій частині. Діє як платформа, піднімаючи всю стопу і відповідно збільшуючи підсумкову висоту підбора.' },
        toeRoll: { title: 'Перекат носка', desc: 'Піднятість самого кінчика носка від землі. Необхідна для забезпечення природного біомеханічного перекату стопи при кроці.' },
        effLength: { title: 'Довжина перекату', desc: 'Горизонтальна відстань від кінчика носка до точки опори пучкової частини. Залежить від форми носка та величини перекату.' },
        netHeel: { title: 'Чиста піднятість', desc: 'Реальна біомеханічна висота підйому п\'яти відносно пучкової частини стопи, без урахування товщини самої підошви.' },
        totalHeel: { title: 'Фізична висота', desc: 'Підсумкова габаритна висота підбора від землі до п\'яткової частини колодки (враховує і кут підйому, і товщину підошви).' },
      }
    }
  }[lang]

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      className="relative flex flex-col h-[100dvh] overflow-hidden"
      style={{ backgroundColor: THEME.bg, color: THEME.textPrimary }}
    >
      <header className="relative z-20 flex items-center justify-between px-5 pt-4 pb-2">
        <button
          onClick={() => { triggerHaptic(); onBack() }}
          className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition-all"
          style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}` }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>

        <div className="text-center">
          <h1 className="text-[17px] font-semibold tracking-tight">{t.title}</h1>
          <p className="text-[12px] opacity-60 mt-0.5">{t.subtitle}</p>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-12 scrollbar-hide flex flex-col gap-3 mt-3">
        
        {/* Блок параметров */}
        <section 
          className="rounded-[24px] p-5 flex flex-col gap-6"
          style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}` }}
        >
          <SliderRow label={t.size} infoKey="size" onInfo={openInfo} value={shoeSize} unit="" min={34} max={50} onChange={(v) => { setShoeSize(v); triggerHaptic('light') }} />
          <SliderRow label={t.angle} infoKey="angle" onInfo={openInfo} value={angleDeg} unit="°" min={4} max={18} isWarning={result.isMedicalWarning} onChange={(v) => { setAngleDeg(v); triggerHaptic(v > 14 ? 'medium' : 'light') }} />
          <SliderRow label={t.tToe} infoKey="tToe" onInfo={openInfo} value={tToe} unit=" мм" min={3} max={25} onChange={(v) => { setTToe(v); triggerHaptic('light') }} />
          <SliderRow label={t.toeRoll} infoKey="toeRoll" onInfo={openInfo} value={toeRoll} unit=" мм" min={5} max={20} onChange={(v) => { setToeRoll(v); triggerHaptic('light') }} />
        </section>

        {/* Вывод результатов */}
        <section 
          className="rounded-[24px] p-6 relative overflow-hidden"
          style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.accent}40` }}
        >
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: `radial-gradient(circle at 100% 0%, ${THEME.accent} 0%, transparent 60%)` }} />
          
          <div className="relative z-10 flex flex-col gap-4">
            <ResultRow label={t.effLength} value={`${result.effLength} мм`} infoKey="effLength" onInfo={openInfo} />
            <ResultRow label={t.netHeel} value={`${result.netHeelHeight} мм`} infoKey="netHeel" onInfo={openInfo} valueColor="#7EB8D4" />

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-medium">{t.totalHeel}</span>
                <InfoButton onClick={() => openInfo('totalHeel')} />
              </div>
              <div className="flex items-end gap-1">
                <span className="text-[32px] font-light leading-none tracking-tight" style={{ color: THEME.accent }}>
                  {result.totalHeelHeight}
                </span>
                <span className="text-[14px] mb-1" style={{ color: THEME.accent }}>мм</span>
              </div>
            </div>
          </div>
        </section>

        <AnimatePresence>
          {result.isMedicalWarning && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-[20px] p-4 flex gap-3 items-start bg-red-500/10 border border-red-500/20">
                <div className="shrink-0 mt-0.5 text-red-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-[13px] font-semibold text-red-400 mb-1">{t.warningTitle}</h4>
                  <p className="text-[12px] leading-relaxed text-red-200/80">{t.warningText}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Модальное окно с информацией */}
      <AnimatePresence>
        {activeInfo && (
          <InfoModal 
            infoKey={activeInfo} 
            data={t.info[activeInfo]} 
            onClose={() => { triggerHaptic(); setActiveInfo(null) }} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* =========================================
   Вспомогательные компоненты
   ========================================= */

function SliderRow({ label, value, unit, min, max, isWarning, infoKey, onInfo, onChange }: { 
  label: string; value: number; unit: string; min: number; max: number; isWarning?: boolean; infoKey: InfoKey; onInfo: (k: InfoKey) => void; onChange: (val: number) => void 
}) {
  const pct = ((value - min) / (max - min)) * 100
  const color = isWarning ? THEME.danger : THEME.accent

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-1.5">
          <label className="text-[13px] font-medium text-[#A3988E]">{label}</label>
          <InfoButton onClick={() => onInfo(infoKey)} />
        </div>
        <span className="text-[15px] font-semibold" style={{ color }}>{value}{unit}</span>
      </div>
      <div className="relative">
        <input
          type="range" min={min} max={max} step={1} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-transparent cursor-pointer relative z-10"
          style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, ${THEME.bg} ${pct}%, ${THEME.bg} 100%)` }}
        />
        <style>{`
          input[type=range]::-webkit-slider-thumb {
            appearance: none; width: 22px; height: 22px; border-radius: 50%;
            background: ${THEME.surface}; border: 4px solid ${color}; box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          }
        `}</style>
      </div>
    </div>
  )
}

function ResultRow({ label, value, infoKey, onInfo, valueColor = THEME.textPrimary }: {
  label: string; value: string; infoKey: InfoKey; onInfo: (k: InfoKey) => void; valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center pb-3" style={{ borderBottom: `1px solid ${THEME.border}` }}>
      <div className="flex items-center gap-1.5">
        <span className="text-[13px]" style={{ color: THEME.textSecondary }}>{label}</span>
        <InfoButton onClick={() => onInfo(infoKey)} />
      </div>
      <span className="text-[15px] font-medium" style={{ color: valueColor }}>{value}</span>
    </div>
  )
}

function InfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      // relative - нужен для позиционирования псевдоэлемента
      className="relative flex items-center justify-center text-[#A3988E] hover:text-[#D49A5C] transition-colors active:scale-90 opacity-70 hover:opacity-100"
      aria-label="Подробнее"
    >
      {/* Невидимая область клика (Hitbox), расширяющая кнопку на 14px во все стороны (итого ~44x44px) */}
      <span className="absolute inset-[-14px]" aria-hidden="true" />
      
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </button>
  )
}

/* =========================================
   Всплывающее окно и анимации SVG
   ========================================= */

function InfoModal({ infoKey, data, onClose }: { infoKey: InfoKey, data: {title: string, desc: string}, onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-sm rounded-[28px] overflow-hidden p-6"
        style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}`, boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}
      >
        <div className="flex justify-center mb-6">
          <div className="w-48 h-32 bg-[#110F0E] rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden">
            <AnimatedIllustration infoKey={infoKey} />
          </div>
        </div>
        
        <h3 className="text-[18px] font-semibold text-center mb-2" style={{ color: THEME.accent }}>
          {data.title}
        </h3>
        <p className="text-[14px] leading-relaxed text-center text-[#A3988E]">
          {data.desc}
        </p>

        <button 
          onClick={onClose}
          className="mt-6 w-full py-3.5 rounded-2xl text-[15px] font-medium transition-colors"
          style={{ backgroundColor: '#2A231F', color: THEME.textPrimary }}
        >
          Понятно
        </button>
      </motion.div>
    </div>
  )
}

function AnimatedIllustration({ infoKey }: { infoKey: InfoKey }) {
  // Общие стили для SVG графики
  const strokeColor = THEME.accent
  const secondaryStroke = '#4A4139'
  const highlightColor = '#7EB8D4'

  switch (infoKey) {
    case 'angle':
      return (
        <svg width="120" height="80" viewBox="0 0 120 80">
          <path d="M 10 60 L 50 60" stroke={secondaryStroke} strokeWidth="4" strokeLinecap="round" />
          <motion.path 
            d="M 50 60 L 100 60"
            stroke={strokeColor} strokeWidth="4" strokeLinecap="round"
            style={{ transformOrigin: '50px 60px' }}
            animate={{ rotate: [0, -25, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path 
            d="M 65 60 A 15 15 0 0 0 63 52"
            stroke={highlightColor} strokeWidth="2" fill="none"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      )

    case 'tToe':
      return (
        <svg width="120" height="80" viewBox="0 0 120 80">
          <path d="M 20 60 L 100 60" stroke={secondaryStroke} strokeWidth="2" strokeDasharray="4 4" />
          <motion.rect 
            x="20" y="40" width="40" height="20" rx="4"
            fill={strokeColor} fillOpacity="0.2" stroke={strokeColor} strokeWidth="2"
            animate={{ height: [10, 30, 10], y: [50, 30, 50] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <path d="M 65 30 L 100 30" stroke={secondaryStroke} strokeWidth="4" strokeLinecap="round" />
        </svg>
      )

    case 'toeRoll':
      return (
        <svg width="120" height="80" viewBox="0 0 120 80">
          <path d="M 10 60 L 110 60" stroke={secondaryStroke} strokeWidth="2" strokeDasharray="4 4" />
          <motion.path 
            d="M 70 60 C 90 60, 100 60, 110 60"
            stroke={strokeColor} strokeWidth="4" strokeLinecap="round" fill="none"
            animate={{ d: ["M 70 60 C 90 60, 100 60, 110 60", "M 70 60 C 90 60, 105 45, 110 35", "M 70 60 C 90 60, 100 60, 110 60"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <path d="M 30 60 L 70 60" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
        </svg>
      )

    case 'effLength':
      return (
        <svg width="120" height="80" viewBox="0 0 120 80">
          <path d="M 30 50 C 60 50, 80 40, 90 30" stroke={secondaryStroke} strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M 30 70 L 90 70" stroke={secondaryStroke} strokeWidth="2" strokeDasharray="4 4" />
          <motion.line 
            x1="90" y1="65" x2="90" y2="75" stroke={highlightColor} strokeWidth="2"
          />
          <motion.line 
            x1="30" y1="70" y2="70"
            stroke={highlightColor} strokeWidth="3" strokeLinecap="round"
            animate={{ x2: [30, 90, 30] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      )

    case 'netHeel':
      return (
        <svg width="120" height="80" viewBox="0 0 120 80">
          <path d="M 30 60 L 60 60 L 90 40" stroke={secondaryStroke} strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M 30 60 L 90 60" stroke={secondaryStroke} strokeWidth="2" strokeDasharray="4 4" />
          <motion.line 
            x1="90" x2="90"
            stroke={highlightColor} strokeWidth="3" strokeLinecap="round"
            animate={{ y1: [60, 40, 60], y2: [60, 60, 60] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      )

    case 'totalHeel':
      return (
        <svg width="120" height="80" viewBox="0 0 120 80">
          <path d="M 20 70 L 100 70" stroke={secondaryStroke} strokeWidth="2" strokeDasharray="4 4" />
          <path d="M 40 50 L 60 50 L 90 30" stroke={secondaryStroke} strokeWidth="4" strokeLinecap="round" fill="none" />
          <motion.rect 
            x="80" width="20" rx="2"
            fill={strokeColor} fillOpacity="0.8"
            animate={{ y: [70, 30, 70], height: [0, 40, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      )
      
    case 'size':
    default:
      return (
        <svg width="120" height="80" viewBox="0 0 120 80">
          <motion.path 
            d="M 30 50 C 50 50, 70 50, 90 50"
            stroke={strokeColor} strokeWidth="4" strokeLinecap="round" fill="none"
            animate={{ 
              d: ["M 30 50 C 50 50, 70 50, 90 50", "M 20 50 C 50 50, 70 50, 100 50", "M 30 50 C 50 50, 70 50, 90 50"]
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.line 
            y1="60" y2="60" stroke={highlightColor} strokeWidth="2" strokeDasharray="2 2"
            animate={{ x1: [30, 20, 30], x2: [90, 100, 90] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      )
  }
}
