import { motion } from 'framer-motion'
import type { Lang } from '../App'

type StylesPageProps = {
  onBack: () => void
  lang: Lang
}

// Данные для наших "глянцевых" слайдов
const STYLES_DATA = [
  {
    id: 'botford',
    // Ссылка на твоё видео
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
    // На втором слайде пока картинка (для демонстрации свайпа), потом сможешь заменить на видео челси
    video: '/Fason/chelsi.mp4', 
    title: { ru: 'Челси', uk: 'Челсі' },
    subtitle: { ru: 'Вечная классика', uk: 'Вічна класика' },
    desc: {
      ru: 'Лаконичный дизайн и максимальный комфорт. Идеальный баланс между строгой классикой и расслабленным повседневным стилем.',
      uk: 'Лаконічний дизайн та максимальний комфорт. Ідеальний баланс між суворою класикою та розслабленим повсякденним стилем.',
    },
  },
]

export function StylesPage({ onBack, lang }: StylesPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-black text-white overflow-hidden"
    >
      {/* Скрываем стандартный скроллбар */}
      <style>{`
        .snap-container::-webkit-scrollbar {
          display: none;
        }
        .snap-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>

      {/* Кнопка "Назад" (опущена ниже для избежания конфликта с шапкой Telegram) */}
      <button
        onClick={onBack}
        className="absolute top-16 left-4 md:left-6 z-[100] w-10 h-10 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-md border border-white/20 active:scale-90 transition-transform"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Контейнер для полноэкранного скролла (Свайпер) */}
      <div className="snap-container h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        
        {STYLES_DATA.map((slide, index) => (
          <div
            key={slide.id}
            className="relative h-[100dvh] w-full snap-start snap-always flex items-end justify-center pb-20 md:pb-24 px-6 overflow-hidden"
          >
            {/* Фон (Видео или Картинка) */}
            <div className="absolute inset-0 w-full h-full z-0">
              {slide.video ? (
                <video
                  src={slide.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={slide.image}
                  alt={slide.title[lang]}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Градиентное затемнение (журнальный эффект) */}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

            {/* Текстовый контент (с анимацией при попадании в зону видимости) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="relative z-20 w-full px-6 text-center flex flex-col items-center"
            >
              <h3 className="text-[10px] md:text-[12px] tracking-[0.3em] uppercase text-white/70 mb-4 font-medium drop-shadow-md">
                {slide.subtitle[lang]}
              </h3>
              
              <h2 className="text-5xl md:text-6xl font-serif font-light tracking-wide mb-6 drop-shadow-xl">
                {slide.title[lang]}
              </h2>
              
              <p className="text-[14px] leading-relaxed text-white/80 max-w-[280px] drop-shadow-lg">
                {slide.desc[lang]}
              </p>
            </motion.div>

            {/* Индикатор "Свайп вверх" только на первом слайде */}
            {index === 0 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center opacity-60 animate-bounce-slow">
                <span className="text-[10px] tracking-widest uppercase mb-2">Swipe</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </div>
            )}
          </div>
        ))}

      </div>
    </motion.div>
  )
}
