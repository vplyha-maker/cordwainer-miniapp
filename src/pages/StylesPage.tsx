import { motion } from 'framer-motion'
import { useState } from 'react' // <--- ДОБАВИЛИ ИМПОРТ
import type { Lang } from '../App'

type StylesPageProps = {
  onBack: () => void
  lang: Lang
}

type StyleSlide = {
  id: string
  video?: string
  image?: string
  title: { ru: string; uk: string }
  subtitle: { ru: string; uk: string }
  desc: { ru: string; uk: string }
}

const STYLES_DATA: StyleSlide[] = [
  {
    id: 'botford',
    video: '/Fason/Botford.mp4',
    title: { ru: 'Ботфорты', uk: 'Ботфорти' },
    subtitle: { ru: 'Высокий стиль', uk: 'Високий стиль' },
    desc: {
      ru: 'Смелость и элегантность в каждом шаге. Визуально удлиняют силуэт и становятся главным, безупречным акцентом любого образа.',
      uk: 'Сміливість та елегантність у кожному кроці. Візуально подовжують силует і стають головним, бездоганним акцентом будь-якого образу.',
    },
  },
  {
    id: 'chelsea',
    video: '/Fason/chelsi.mp4', 
    title: { ru: 'Челси', uk: 'Челсі' },
    subtitle: { ru: 'Вечная классика', uk: 'Вічна класика' },
    desc: {
      ru: 'Лаконичный дизайн и максимальный комфорт. Идеальный баланс между строгой классикой и расслабленным повседневным стилем.',
      uk: 'Лаконічний дизайн та максимальний комфорт. Ідеальний баланс між суворою класикою та розслабленим повсякденним стилем.',
    },
  },
  {
    id: 'martins',
    video: '/Fason/martins.mp4',
    title: { ru: 'Мартинсы\n/ Берцы', uk: 'Мартінси\n/ Берці' },
    subtitle: { ru: 'Бунтарский дух', uk: 'Бунтарський дух' },
    desc: {
      ru: 'Грубая эстетика, покорившая мировые подиумы. Массивная подошва и высокая шнуровка создают дерзкий, но притягательный контраст.',
      uk: 'Груба естетика, що підкорила світові подіуми. Масивна підошва та висока шнурівка створюють зухвалий, але притягальний контраст.',
    },
  }
]

export function StylesPage({ onBack, lang }: StylesPageProps) {
  // Добавляем состояние для звука (по умолчанию выключен, чтобы видео могло стартовать)
  const [isMuted, setIsMuted] = useState(true)

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-[#111] text-white overflow-hidden"
    >
      <style>{`
        .snap-container::-webkit-scrollbar { display: none; }
        .snap-container { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes subtle-float {
          0%, 100% { transform: translateY(0) translateX(-50%); }
          50% { transform: translateY(-8px) translateX(-50%); }
        }
        .animate-subtle-float {
          animation: subtle-float 2.5s ease-in-out infinite;
        }
      `}</style>

      {/* Кнопка "Назад" */}
      <button
        onClick={onBack}
        className="absolute top-14 left-5 z-[100] w-10 h-10 flex items-center justify-center text-white/80 active:scale-90 transition-transform"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Кнопка управления звуком (в правом верхнем углу) */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-14 right-5 z-[100] w-10 h-10 flex items-center justify-center text-white/80 active:scale-90 transition-transform"
      >
        {isMuted ? (
          // Иконка "Звук выключен"
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
        ) : (
          // Иконка "Звук включен"
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
          </svg>
        )}
      </button>

      <div className="snap-container h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        {STYLES_DATA.map((slide, index) => (
          <div
            key={slide.id}
            className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden"
          >
            {/* Фон */}
            <div className="absolute inset-0 w-full h-full z-0 bg-black">
              {slide.video ? (
                <video
                  src={slide.video}
                  autoPlay
                  loop
                  muted={isMuted} // <--- ПЕРЕДАЕМ СОСТОЯНИЕ ЗВУКА СЮДА
                  playsInline
                  className="w-full h-full object-cover opacity-90"
                />
              ) : slide.image ? (
                <img
                  src={slide.image}
                  alt={slide.title[lang]}
                  className="w-full h-full object-cover opacity-90"
                />
              ) : null}
            </div>

            <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-transparent to-black/50 pointer-events-none" />

            {/* Верхний блок: Разделитель + Подзаголовок + Главный заголовок */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              className="absolute top-[22%] left-6 z-20 max-w-[85%]"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-8 h-[1px] bg-white/60" />
                <h3 className="text-[10px] md:text-[11px] tracking-[0.4em] uppercase text-white/80 font-medium drop-shadow-md">
                  {slide.subtitle[lang]}
                </h3>
              </div>
              
              <h2 className="text-[48px] md:text-7xl font-serif font-light tracking-wide leading-[1.1] drop-shadow-xl whitespace-pre-line">
                {slide.title[lang]}
              </h2>
            </motion.div>

            {/* Нижний блок: Компактное описание сбоку */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              className="absolute bottom-12 left-6 z-20 max-w-[240px] md:max-w-[280px]"
            >
              <p className="text-[13px] leading-[1.6] text-white/70 font-light drop-shadow-lg">
                {slide.desc[lang]}
              </p>
            </motion.div>

            {/* Журнальный вертикальный Swipe сбоку (только на первом экране) */}
            {index === 0 && (
              <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20 opacity-50 flex items-center justify-center">
                <span 
                  className="text-[9px] tracking-[0.4em] uppercase text-white/80 font-medium"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  Swipe
                </span>
                <div className="absolute -bottom-10 left-1/2 w-[1px] h-6 bg-white/40 animate-subtle-float" />
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
