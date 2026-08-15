import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'
import { calculateHeelGeometry } from '../lib/heelCalc'

type HeelCalcPageProps = {
  onBack: () => void
  lang: Lang
}

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

  const result = useMemo(() => 
    calculateHeelGeometry({ shoeSize, angleDeg, tToe, toeRoll }), 
  [shoeSize, angleDeg, tToe, toeRoll])

  const triggerHaptic = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
    } catch {}
  }, [])

  const t = {
    ru: {
      title: 'Высота каблука',
      subtitle: 'Биомеханический расчет H_heel',
      size: 'Размер (EU)',
      angle: 'Угол геленка (α)',
      tToe: 'Толщина носка (T_toe)',
      toeRoll: 'Перекат носка (Δh)',
      effLength: 'Эффективная длина переката (L_eff)',
      netHeel: 'Приподнятость пятки (Чистая)',
      totalHeel: 'Физическая высота каблука',
      warningTitle: 'Критический наклон',
      warningText: 'Угол более 14° или высота > 40мм критически снижает площадь опоры пятки. Давление на плюсневую зону увеличено на 65%+',
    },
    uk: {
      title: 'Висота підбора',
      subtitle: 'Біомеханічний розрахунок H_heel',
      size: 'Розмір (EU)',
      angle: 'Кут геленка (α)',
      tToe: 'Товщина носка (T_toe)',
      toeRoll: 'Перекат носка (Δh)',
      effLength: 'Ефективна довжина перекату (L_eff)',
      netHeel: 'Піднятість п\'яти (Чиста)',
      totalHeel: 'Фізична висота підбора',
      warningTitle: 'Критичний нахил',
      warningText: 'Кут понад 14° або висота > 40мм критично знижує площу опори п\'яти. Тиск на плеснову зону збільшено на 65%+',
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
          <SliderRow label={t.size} value={shoeSize} unit="" min={34} max={50} onChange={(v) => { setShoeSize(v); triggerHaptic('light') }} />
          <SliderRow label={t.angle} value={angleDeg} unit="°" min={4} max={18} isWarning={result.isMedicalWarning} onChange={(v) => { setAngleDeg(v); triggerHaptic(v > 14 ? 'medium' : 'light') }} />
          <SliderRow label={t.tToe} value={tToe} unit=" мм" min={3} max={25} onChange={(v) => { setTToe(v); triggerHaptic('light') }} />
          <SliderRow label={t.toeRoll} value={toeRoll} unit=" мм" min={5} max={20} onChange={(v) => { setToeRoll(v); triggerHaptic('light') }} />
        </section>

        {/* Вывод результатов */}
        <section 
          className="rounded-[24px] p-6 relative overflow-hidden"
          style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.accent}40` }}
        >
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: `radial-gradient(circle at 100% 0%, ${THEME.accent} 0%, transparent 60%)` }} />
          
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3" style={{ borderBottom: `1px solid ${THEME.border}` }}>
              <span className="text-[13px]" style={{ color: THEME.textSecondary }}>{t.effLength}</span>
              <span className="text-[15px] font-medium">{result.effLength} мм</span>
            </div>

            <div className="flex justify-between items-center pb-3" style={{ borderBottom: `1px solid ${THEME.border}` }}>
              <span className="text-[13px]" style={{ color: THEME.textSecondary }}>{t.netHeel}</span>
              <span className="text-[15px] font-medium text-[#7EB8D4]">{result.netHeelHeight} мм</span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[14px] font-medium">{t.totalHeel}</span>
              <div className="flex items-end gap-1">
                <span className="text-[32px] font-light leading-none tracking-tight" style={{ color: THEME.accent }}>
                  {result.totalHeelHeight}
                </span>
                <span className="text-[14px] mb-1" style={{ color: THEME.accent }}>мм</span>
              </div>
            </div>
          </div>
        </section>

        {/* Ортопедическое предупреждение (Эвристика Нильсена: Помощь в распознавании ошибок) */}
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
    </motion.div>
  )
}

/* Вспомогательный компонент для ползунков (DRY) */
function SliderRow({ label, value, unit, min, max, isWarning, onChange }: { 
  label: string; value: number; unit: string; min: number; max: number; isWarning?: boolean; onChange: (val: number) => void 
}) {
  const pct = ((value - min) / (max - min)) * 100
  const color = isWarning ? THEME.danger : THEME.accent

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <label className="text-[13px] font-medium text-[#A3988E]">{label}</label>
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

