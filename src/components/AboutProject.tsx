import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import type { Lang } from '../App'

type AboutProjectProps = {
  lang?: Lang
  onClose?: () => void
}

const CONTENT = {
  ru: {
    title: 'Благодарность',
    p1_1: 'Отдельно хочу выразить искреннюю благодарность',
    p1_2: 'коллективу компании «Форвард Орто».',
    p2_1: 'Спасибо коллегам за профессиональный опыт,',
    p2_2: 'знания, поддержку и возможность работать в среде,',
    p2_3: 'где я смог получить практическое понимание',
    p2_4: 'обувного производства и ремесла.',
    p3_1: 'Этот опыт стал важной частью основы,',
    p3_2: 'на которой появился проект',
    emphasis: 'Cordwainer',
    dedication: 'Посвящается Маме'
  },
  uk: {
    title: 'Вдячність',
    p1_1: 'Окремо хочу висловити щиру подяку',
    p1_2: 'колективу компанії «Форвард Орто».',
    p2_1: 'Дякую колегам за професійний досвід,',
    p2_2: 'знання, підтримку та можливість працювати в середовищі,',
    p2_3: 'де я зміг отримати практичне розуміння',
    p2_4: 'взуттєвого виробництва та ремесла.',
    p3_1: 'Цей досвід став важливою частиною основи,',
    p3_2: 'на якій зʼявився проєкт',
    emphasis: 'Cordwainer',
    dedication: 'Присвячується Мамі'
  },
  de: {
    title: 'Danksagung',
    p1_1: 'Besonders möchte ich meine aufrichtige Dankbarkeit',
    p1_2: 'gegenüber dem Team von «Forward Ortho» ausdrücken.',
    p2_1: 'Vielen Dank an meine Kollegen für die Erfahrung,',
    p2_2: 'das Wissen, die Unterstützung und die Möglichkeit,',
    p2_3: 'in einem Umfeld zu arbeiten, in dem ich ein praktisches',
    p2_4: 'Verständnis für die Schuhherstellung erlangen konnte.',
    p3_1: 'Diese Erfahrung wurde zu einem wichtigen Teil des',
    p3_2: 'Fundaments, auf dem das Projekt entstand:',
    emphasis: 'Cordwainer',
    dedication: 'Meiner Mutter gewidmet'
  }
}

export default function AboutProject({ lang = 'ru', onClose }: AboutProjectProps) {
  const text = CONTENT[lang] || CONTENT.ru

  const [isPlaying, setIsPlaying] = useState(false)
  const [showClose, setShowClose] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const audio = new Audio('/audio/start-me-up-8bit.mp3')
    audio.loop = true
    audio.volume = 0.35
    audioRef.current = audio

    // Увеличили таймер до 10.5 секунд, так как текст "пишется" постепенно
    const timer = setTimeout(() => setShowClose(true), 10500)

    return () => {
      audio.pause()
      audioRef.current = null
      clearTimeout(timer)
    }
  }, [])

  const toggleMusic = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-[#faf8f5] text-[#1a1a1a] overflow-hidden select-none">
      
      {/* ПОЛНОЭКРАННАЯ РАМКА ИЗ CSS */}
      <div className="absolute inset-4 border-[1.5px] border-[#c9a86c] pointer-events-none z-0" />
      <div className="absolute inset-[22px] border-[0.5px] border-[#c9a86c] pointer-events-none z-0" />

      {/* ХЕДЕР */}
      <header className="absolute top-0 left-0 right-0 z-50 px-8 pt-10 pb-4 flex items-center justify-between pointer-events-none">
        <button onClick={onClose} className="pointer-events-auto group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors">
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>
        <button onClick={toggleMusic} className="pointer-events-auto text-[10px] font-sans uppercase tracking-[0.2em] text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors outline-none">
          {isPlaying ? 'SOUND: ON' : 'SOUND: OFF'}
        </button>
      </header>

      {/* КОНТЕЙНЕР ДЛЯ КОНТЕНТА */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto scroll-smooth scrollbar-hide flex flex-col items-center justify-center pt-20 pb-20">
        
        {/* SVG */}
        <div className="w-full max-w-[650px] px-6">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 800 860" 
            className="w-full h-auto"
          >
            <defs>
              <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
                
                .svg-title {
                  font-family: 'Playfair Display', Georgia, serif;
                  font-size: 42px;
                  font-weight: 700;
                  fill: #1a1a1a;
                  letter-spacing: 4px;
                }
                .svg-body {
                  font-family: 'Cormorant Garamond', Georgia, serif;
                  font-size: 24px;
                  font-weight: 400;
                  fill: #2c2c2c;
                }
                .svg-emphasis {
                  font-family: 'Cormorant Garamond', Georgia, serif;
                  font-size: 28px;
                  font-weight: 500;
                  fill: #1a1a1a;
                }
                .svg-dedication {
                  font-family: 'Playfair Display', Georgia, serif;
                  font-size: 20px;
                  font-weight: 600;
                  font-style: italic;
                  fill: #3a3a3a;
                  letter-spacing: 1px;
                }
                .svg-line {
                  stroke: #c9a86c;
                  stroke-width: 1.5;
                }
                
                /* Анимация проявления элементов (для линий) */
                .anim-fade {
                  opacity: 0;
                  animation: fade-in-up 1.5s ease-out forwards;
                }
                @keyframes fade-in-up {
                  0% { opacity: 0; transform: translateY(10px); }
                  100% { opacity: 1; transform: translateY(0); }
                }

                /* Анимация написания текста слева направо */
                .anim-write {
                  clip-path: inset(0 100% -20% 0);
                  -webkit-clip-path: inset(0 100% -20% 0);
                  animation: wipe-text 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
                @keyframes wipe-text {
                  0% { 
                    clip-path: inset(0 100% -20% 0); 
                    -webkit-clip-path: inset(0 100% -20% 0);
                  }
                  100% { 
                    clip-path: inset(0 -10% -20% -10%); 
                    -webkit-clip-path: inset(0 -10% -20% -10%);
                  }
                }

                /* Расписание анимации (строка за строкой) */
                .delay-title-dec { animation-delay: 0.5s; }
                .delay-title { animation-delay: 0.5s; }
                
                .delay-l1 { animation-delay: 1.5s; }
                .delay-l2 { animation-delay: 2.3s; }
                
                .delay-l3 { animation-delay: 3.1s; }
                .delay-l4 { animation-delay: 3.9s; }
                .delay-l5 { animation-delay: 4.7s; }
                .delay-l6 { animation-delay: 5.5s; }
                
                .delay-l7 { animation-delay: 6.3s; }
                .delay-l8 { animation-delay: 7.1s; }
                
                .delay-l9 { animation-delay: 8.0s; }
                
                .delay-dec2 { animation-delay: 9.2s; }
                .delay-dedication { animation-delay: 9.2s; }
              `}</style>
            </defs>
            
            {/* Title Section */}
            <g className="anim-fade delay-title-dec">
              <line x1="200" y1="100" x2="600" y2="100" className="svg-line"/>
              <circle cx="400" cy="100" r="3" fill="#c9a86c"/>
            </g>
            <text x="400" y="80" textAnchor="middle" className="svg-title anim-write delay-title">{text.title}</text>
            
            {/* First Block (каждая строка вынесена отдельно для правильной анимации) */}
            <text x="400" y="200" textAnchor="middle" className="svg-body anim-write delay-l1">{text.p1_1}</text>
            <text x="400" y="236" textAnchor="middle" className="svg-body anim-write delay-l2">{text.p1_2}</text>
            
            {/* Second Block */}
            <text x="400" y="320" textAnchor="middle" className="svg-body anim-write delay-l3">{text.p2_1}</text>
            <text x="400" y="356" textAnchor="middle" className="svg-body anim-write delay-l4">{text.p2_2}</text>
            <text x="400" y="392" textAnchor="middle" className="svg-body anim-write delay-l5">{text.p2_3}</text>
            <text x="400" y="428" textAnchor="middle" className="svg-body anim-write delay-l6">{text.p2_4}</text>
            
            {/* Third Block */}
            <text x="400" y="500" textAnchor="middle" className="svg-body anim-write delay-l7">{text.p3_1}</text>
            <text x="400" y="536" textAnchor="middle" className="svg-body anim-write delay-l8">{text.p3_2}</text>
            
            {/* Emphasis - Появляется мягким фейдом для красоты */}
            <text x="400" y="590" textAnchor="middle" className="svg-emphasis anim-fade delay-l9">{text.emphasis}</text>
            
            {/* Dedication Section */}
            <g className="anim-fade delay-dec2">
              <line x1="250" y1="680" x2="550" y2="680" className="svg-line"/>
              <circle cx="400" cy="680" r="3" fill="#c9a86c"/>
              <path d="M380 820 Q400 800 420 820" fill="none" stroke="#c9a86c" strokeWidth="1.2"/>
              <circle cx="400" cy="825" r="2" fill="#c9a86c"/>
            </g>
            <text x="400" y="760" textAnchor="middle" className="svg-dedication anim-write delay-dedication">{text.dedication}</text>

          </svg>
        </div>
        
        {/* Кнопка Закрыть */}
        <div className={`mt-8 w-full px-12 max-w-[400px] transition-opacity duration-1000 ${showClose ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button
            onClick={onClose}
            className="w-full py-4 border border-[#c9a86c]/50 hover:border-[#c9a86c] active:scale-95 transition-all text-[10px] font-sans uppercase tracking-[0.3em] text-[#1a1a1a]/80 hover:text-[#1a1a1a]"
          >
            {lang === 'de' ? 'Schließen' : lang === 'uk' ? 'Закрити' : 'Закрыть'}
          </button>
        </div>

      </div>
      
      {/* Мягкое размытие внизу */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#faf8f5] to-transparent z-20 pointer-events-none" />
    </div>
  )
}
