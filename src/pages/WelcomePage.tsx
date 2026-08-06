import { motion } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'

type WelcomePageProps = {
  onStart?: () => void
}

export function WelcomePage({ onStart }: WelcomePageProps) {
  return (
    <div className="relative min-h-[100dvh] bg-[#151210] text-[#F5F1EB] pb-[100px]">
      
      {/* HERO */}
      <div className="relative h-[48vh] min-h-[300px] max-h-[420px]">
        <img
          src="/hero-cover.png"
          alt="Cordwainer"
          className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(21,18,16,0.15) 0%, rgba(21,18,16,0.4) 50%, #151210 100%)',
          }}
        />

        <div className="absolute top-3 left-4 right-4 z-10 flex items-start justify-between">
          <div>
            <h1
              className="font-display text-[2.35rem] leading-[0.9] text-[#F5F1EB]"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
            >
              Cordwainer
            </h1>
            <p className="mt-1.5 text-[10px] tracking-[0.2em] uppercase text-[#B9ACA0]">
              Энциклопедия обувного мастерства
            </p>
          </div>
          <button className="w-9 h-9 rounded-full bg-[#1D1815]/70 border border-[#C6A47A]/25 flex items-center justify-center text-[#F5F1EB] backdrop-blur-md">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
        </div>

        <div className="absolute bottom-14 left-4 z-10">
          <p className="text-[9px] tracking-[0.2em] uppercase text-[#B9ACA0]/80 mb-3">
            Issue 01 · 2026
          </p>
          <div className="flex flex-col gap-0.5 text-[8px] tracking-[0.12em] uppercase text-[#B9ACA0]/50 leading-tight">
            <span>Предмет как идея.</span>
            <span>Форма как язык.</span>
            <span>Мастерство как опыт.</span>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 px-4 -mt-6">

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-3 gap-2 mb-3.5"
        >
          {[
            { title: 'Материалы', sub: 'Кожа · Замша\nПодошвы', accent: '#D8A35C' },
            { title: 'Цвета', sub: 'Колористика\nПатина', accent: '#A78BFA' },
            { title: 'Фасоны\nи силуэты', sub: 'Классика\nУличные', accent: '#60A5FA' },
          ].map((item) => (
            <button
              key={item.title}
              className="rounded-2xl p-2.5 text-left active:scale-[0.97] transition-transform"
              style={{
                background: 'rgba(39, 33, 29, 0.78)',
                border: '1px solid rgba(198, 164, 122, 0.22)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-2 text-sm"
                style={{
                  background: `${item.accent}20`,
                  color: item.accent,
                  boxShadow: `0 0 14px ${item.accent}35`,
                }}
              >
                ●
              </div>
              <div className="text-[11px] font-semibold leading-tight text-[#F5F1EB] whitespace-pre-line">
                {item.title}
              </div>
              <div className="text-[9px] text-[#B9ACA0] leading-snug mt-0.5 whitespace-pre-line">
                {item.sub}
              </div>
            </button>
          ))}
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={onStart}
          className="w-full h-[46px] rounded-2xl font-medium text-[14px] tracking-wide active:scale-[0.98] transition-transform flex items-center justify-center gap-2 mb-3.5"
          style={{
            background: '#F5F1EB',
            color: '#1A1612',
            boxShadow: '0 4px 20px rgba(245, 241, 235, 0.12)',
          }}
        >
          <span>Начать изучение</span>
          <span>→</span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-3 flex items-center gap-3 mb-4"
          style={{
            background: 'rgba(39, 33, 29, 0.82)',
            border: '1px solid rgba(198, 164, 122, 0.2)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-[9px] tracking-[0.14em] uppercase text-[#B9ACA0] mb-0.5">
              Продолжить обучение
            </div>
            <div className="text-[13px] font-semibold text-[#F5F1EB] leading-tight mb-2">
              Конструкция Goodyear Welt
            </div>
            <div className="h-1 rounded-full bg-[#1D1815] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: '66%',
                  background: 'linear-gradient(90deg, #D8A35C, #F3C27A)',
                  boxShadow: '0 0 8px rgba(243, 194, 122, 0.4)',
                }}
              />
            </div>
          </div>
          <div
            className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-2xl"
            style={{
              background: '#312923',
              border: '1px solid rgba(198, 164, 122, 0.2)',
            }}
          >
            👞
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
        >
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-[10px] tracking-[0.14em] uppercase text-[#B9ACA0]">
              Избранное
            </span>
            <span className="text-[11px] text-[#D8A35C]">Смотреть все</span>
          </div>
          <div className="flex gap-2">
            {['🪵', '🎨', '👞'].map((emoji, i) => (
              <div
                key={i}
                className="w-14 h-14 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{
                  background: '#27211D',
                  border: '1px solid rgba(198, 164, 122, 0.2)',
                }}
              >
                {emoji}
              </div>
            ))}
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-[12px] font-medium text-[#B9ACA0] shrink-0"
              style={{
                background: 'rgba(39, 33, 29, 0.85)',
                border: '1px solid rgba(198, 164, 122, 0.2)',
              }}
            >
              +12
            </div>
          </div>
        </motion.div>
      </div>

      <BottomDock active="search" />
    </div>
  )
}
