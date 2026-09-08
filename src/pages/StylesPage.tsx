import { motion } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
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
  },
  {
    id: 'lofer',
    video: '/Fason/lofer.mp4',
    title: { ru: 'Лоферы', uk: 'Лофери' },
    subtitle: { ru: 'Тихая роскошь', uk: 'Тиха розкіш' },
    desc: {
      ru: 'Воплощение элегантности и абсолютного комфорта. Идеальная база, которая делает любой образ статусным и расслабленным одновременно.',
      uk: 'Втілення елегантності та абсолютного комфорту. Ідеальна база, яка робить будь-який образ статусним і розслабленим водночас.',
    },
  },
  {
    id: 'sock_boots',
    video: '/Fason/Sock_boots.mp4',
    title: { ru: 'Туфли\n/ Чулки', uk: 'Туфлі\n/ Панчохи' }, 
    subtitle: { ru: 'Гибридная эстетика', uk: 'Гібридна естетика' },
    desc: {
      ru: 'Смелый гибрид классической лодочки и эластичного трикотажа. Безупречно облегает щиколотку, добавляя образу утонченной дерзости и абсолютного комфорта.',
      uk: 'Сміливий гібрид класичного човника та еластичного трикотажу. Бездоганно облягає кісточку, додаючи образу вишуканої зухвалості та абсолютного комфорту.',
    },
  },
  {
    id: 'cozaki',
    video: '/Fason/cozaki.mp4',
    title: { ru: 'Казаки', uk: 'Козаки' }, 
    subtitle: { ru: 'Свобода формы', uk: 'Свобода форми' },
    desc: {
      ru: 'Знаковый скошенный каблук и характерный мыс. Идеальный баланс между эстетикой дикого запада и ритмом современного мегаполиса.',
      uk: 'Знаковий скошений каблук та характерний мис. Ідеальний баланс між естетикою дикого заходу та ритмом сучасного мегаполіса.',
    },
  },
  {
    id: 'boti',
    video: '/Fason/boti.mp4',
    title: { ru: 'Ботильоны', uk: 'Ботильйони' }, 
    subtitle: { ru: 'Идеальные пропорции', uk: 'Ідеальні пропорції' },
    desc: {
      ru: 'Безукоризненная архитектура обуви, мягко обнимающая щиколотку. Универсальный силуэт для создания выверенных, элегантных образов.',
      uk: 'Бездоганна архітектура взуття, що м\'яко обіймає кісточку. Універсальний силует для створення вивірених, елегантних образів.',
    },
  },
  // НОВЫЙ ФАСОН: Мэри Джейн
  {
    id: 'mary_jane',
    video: '/Fason/Mary_Jane.mp4',
    title: { ru: 'Мэри Джейн', uk: 'Мері Джейн' }, 
    subtitle: { ru: 'Новая романтика', uk: 'Нова романтика' },
    desc: {
      ru: 'Символ утонченной женственности. Узнаваемый ремешок на подъеме и трогательный ретро-силуэт задают кокетливый, но неизменно элегантный тон.',
      uk: 'Символ витонченої жіночності. Впізнаваний ремінець на підйомі та зворушливий ретро-силует задають кокетливий, але незмінно елегантний тон.',
    },
  },
  // НОВЫЙ ФАСОН: Топсайдеры
  {
    id: 'topsaed',
    video: '/Fason/Topsaed.mp4',
    title: { ru: 'Топсайдеры', uk: 'Топсайдери' }, 
    subtitle: { ru: 'Эстетика ривьеры', uk: 'Естетика рів\'єри' },
    desc: {
      ru: 'Элитарная расслабленность и дух закрытых яхт-клубов. Нескользящая подошва и круговая шнуровка — безупречная база для теплого сезона.',
      uk: 'Елітарна розслабленість та дух закритих яхт-клубів. Нековзна підошва та кругова шнурівка — бездоганна база для теплого сезону.',
    },
  },
  // НОВЫЙ ФАСОН: Слингбэки
  {
    id: 'slingback',
    video: '/Fason/slingback1.mp4',
    title: { ru: 'Слингбэки', uk: 'Слінгбеки' }, 
    subtitle: { ru: 'Изящная строгость', uk: 'Витончена строгість' },
    desc: {
      ru: 'Чувственный компромисс между классической лодочкой и босоножкой. Открытая пятка визуально облегчает силуэт, делая каждый шаг невесомым.',
      uk: 'Чуттєвий компроміс між класичним човником та босоніжкою. Відкрита п\'ята візуально полегшує силует, роблячи кожен крок невагомим.',
    },
  }
]

function SlideItem({ slide, lang, index, isMuted }: { slide: StyleSlide, lang: Lang, index: number, isMuted: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const currentLang = (lang === 'uk' || lang === 'ru') ? lang : 'ru'

  useEffect(() => {
    if (!videoRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => {})
          } else {
            videoRef.current?.pause()
          }
        })
      },
      { threshold: 0.5 }
    )

    observer.observe(videoRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  return (
    <div className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black">
      {/* 1. ФОН: Чистое видео */}
      <div className="absolute inset-0 w-full h-full z-0">
        {slide.video ? (
          <video
            ref={videoRef}
            src={slide.video}
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : slide.image ? (
          <img
            src={slide.image}
            alt={slide.title[currentLang]}
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      {/* 2. РАВНОМЕРНЫЙ ОВЕРЛЕЙ: Только 15% затемнение для белого текста */}
      <div className="absolute inset-0 z-10 bg-black/15 pointer-events-none" />

      {/* 3. ТИПОГРАФИКА: Экстремальный верхний левый угол */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: false, amount: 0.4 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="absolute top-28 md:top-32 left-6 z-20 flex flex-col gap-3 max-w-[80%]"
      >
        {/* Надстрочник: Гротеск, ультра-трекинг */}
        <h3 className="text-[9px] md:text-[10px] tracking-[0.5em] uppercase text-white/90 font-sans font-light">
          {slide.subtitle[currentLang]}
        </h3>
        
        {/* Название: Классическая антиква, чистый белый */}
        <h2 className="text-[44px] md:text-[56px] font-serif font-light leading-[1.05] tracking-wide text-white whitespace-pre-line">
          {slide.title[currentLang]}
        </h2>
      </motion.div>

      {/* 4. ОПИСАНИЕ: Экстремальный нижний угол */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: false, amount: 0.4 }}
        transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
        className="absolute bottom-12 left-6 z-20 max-w-[280px]"
      >
        <p className="text-[11px] md:text-[12px] leading-[1.8] text-white/80 font-sans font-light tracking-wide">
          {slide.desc[currentLang]}
        </p>
      </motion.div>
    </div>
  )
}

export function StylesPage({ onBack, lang = 'ru' }: StylesPageProps) {
  const [isMuted, setIsMuted] = useState(true)

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-black text-white overflow-hidden"
    >
      <style>{`
        .snap-container::-webkit-scrollbar { display: none; }
        .snap-container { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Элементы управления: строгие и прозрачные */}
      <button
        onClick={onBack}
        className="absolute top-12 left-4 z-[100] w-12 h-12 flex items-center justify-center text-white/70 active:scale-90 transition-transform"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-12 right-4 z-[100] w-12 h-12 flex items-center justify-center text-white/70 active:scale-90 transition-transform"
      >
        {isMuted ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
          </svg>
        )}
      </button>

      <div className="snap-container h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        {STYLES_DATA.map((slide, index) => (
          <SlideItem 
            key={slide.id} 
            slide={slide} 
            lang={lang} 
            index={index} 
            isMuted={isMuted} 
          />
        ))}
      </div>
    </motion.div>
  )
}
