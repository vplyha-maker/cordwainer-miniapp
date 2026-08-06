import { motion } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'

type WelcomePageProps = {
  onStart?: () => void
}

export function WelcomePage({ onStart }: WelcomePageProps) {
  return (
    <div className="relative min-h-[100dvh] bg-[#151210] text-[#F5F1EB] pb-[100px]">
      
      {/* ===== HERO ===== */}
      <div className="relative h-[48vh] min-h-[300px] max-h-[420px]">
        <img
          src="/hero-cover.png"
          alt="Cordwainer"
          className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
        />
        {/* затемнение снизу */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(21,18,16,0.15) 0%, rgba(21,18,16,0.4) 50%, #151210 100%)',
          }}
        />

        {/* Заголовок поверх фото */}
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

        {/* Issue + вертикальный текст */}
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

      {/* ===== КОНТЕНТ ===== */}
      <div className="relative z-10 px-4 -mt-6">

        {/* 3 категории — glass cards */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-3 gap-2 mb-3.5"
        >
          {[
            { title: 'Материалы', sub: 'Кожа · Замша\nПодошвы', accent: '#D8A35C', icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3c-2 3-6 5-6 9a6 6 0 0012 0c0-4-4-6-6-9z" />
              </svg>
            )},
            { title: 'Цвета', sub: 'Колористика\nПатина', accent: '#A78BFA', icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
              </svg>
            )},
            { title: 'Фасоны\nи силуэты', sub: 'Классика\nУличные модели', accent: '#60A5FA', icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 17h16l-2-9H6l-2 9z" />
                <path d="M8 8V6a4 4 0 018 0v2" />
              </svg>
            )},
          ].map((item) => (
            <button
              key={item.title}
              className="rounded-2xl p-2.5 text-left active:scale-[0.97] transition-transform"
              style={{
                background:
