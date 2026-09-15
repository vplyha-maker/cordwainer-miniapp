import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import type { Lang } from '../App'

type AboutProjectProps = {
  lang?: Lang
  onClose?: () => void
}

// Структурированные данные для 3-х языков, разбитые по строкам SVG
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

    // Показываем кнопку закрытия через 4 секунды (когда пройдет анимация SVG)
    const timer = setTimeout(() => setShowClose(true), 4000)

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
    <div className="fixed inset-0 z-[150] flex flex-col bg-[#0A0A0A] text-[#F4F0E8] overflow-hidden select-none">
      
      {/* ХЕДЕР */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 pt-10 pb-4 flex items-center justify-between pointer-events-none mix-blend-difference">
        <button onClick={onClose} className="pointer-events-auto group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer text-[#F4F0E8]/70 hover:text-white transition-colors">
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>
        <button onClick={toggleMusic} className="pointer-events-auto text-[10px] font-sans uppercase tracking-[0.2em] text-[#F4F0E8]/70 hover:text-white transition-colors outline-none">
          {isPlaying ? 'SOUND: ON' : 'SOUND: OFF'}
        </button>
      </header>

      {/* КОНТЕЙНЕР ДЛЯ SVG */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 pt-24 pb-32 scroll-smooth scrollbar-hide flex flex-col items-center">
        
        {/* Сам SVG */}
        <div className="w-full max-w-[600px] shadow-2xl shadow-black/50">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 800 1000" 
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
                
                /* Анимация проявления текста */
                .anim-fade {
                  opacity: 0;
                  animation: fade-in-up 1.5s ease-out forwards;
                }
                .delay-1 { animation-delay: 0.2s; }
                .delay-2 { animation-delay: 1.0s; }
                .delay-3 { animation-delay: 1.8s; }
                .delay-4 { animation-delay: 2.6s; }
                .delay-5 { animation-delay: 3.4s; }

                @keyframes fade-in-up {
                  0% { opacity: 0; transform: translateY(10px); }
                  100% { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </defs>
            
            {/* Background & Borders */}
            <rect width="800" height="1000" fill="#faf8f5"/>
            <rect x="40" y="40" width="720" height="920" fill="none" stroke="#c9a86c" strokeWidth="1.5"/>
            <rect x="50" y="50" width="700" height="900" fill="none" stroke="#c9a86c" strokeWidth="0.5"/>
            
            {/* Title Section */}
            <g className="anim-fade delay-1">
              <line x1="200" y1="160" x2="600" y2="160" className="svg-line"/>
              <circle cx="400" cy="160" r="3" fill="#c9a86c"/>
              <text x="400" y="140" textAnchor="middle" className="svg-title">{text.title}</text>
            </g>
            
            {/* First Block */}
            <text x="400" y="260" textAnchor="middle" className="svg-body anim-fade delay-2">
              <tspan x="400" dy="0">{text.p1_1}</tspan>
              <tspan x="400" dy="36">{text.p1_2}</tspan>
            </text>
            
            {/* Second Block */}
            <text x="400" y="380" textAnchor="middle" className="svg-body anim-fade delay-3">
              <tspan x="400" dy="0">{text.p2_1}</tspan>
              <tspan x="400" dy="36">{text.p2_2}</tspan>
              <tspan x="400" dy="36">{text.p2_3}</tspan>
              <tspan x="400" dy="36">{text.p2_4}</tspan>
            </text>
            
            {/* Third Block */}
            <text x="400" y="560" textAnchor="middle" className="svg-body anim-fade delay-4">
              <tspan x="400" dy="0">{text.p3_1}</tspan>
              <tspan x="400" dy="36">{text.p3_2}</tspan>
            </text>
            <text x="400" y="650" textAnchor="middle" className="svg-emphasis anim-fade delay-4">
              {text.emphasis}
            </text>
            
            {/* Dedication Section */}
            <g className="anim-fade delay-5">
              <line x1="250" y1="740" x2="550" y2="740" className="svg-line"/>
              <circle cx="400" cy="740" r="3" fill="#c9a86c"/>
              <text x="400" y="820" textAnchor="middle" className="svg-dedication">{text.dedication}</text>
              <path d="M380 880 Q400 860 420 880" fill="none" stroke="#c9a86c" strokeWidth="1.2"/>
              <circle cx="400" cy="885" r="2" fill="#c9a86c"/>
            </g>

          </svg>
        </div>
        
        {/* Кнопка Закрыть (появляется в самом конце) */}
        <div className={`mt-12 w-full max-w-[600px] transition-opacity duration-1000 ${showClose ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button
            onClick={onClose}
            className="w-full py-5 border border-white/20 hover:border-white/60 active:scale-95 transition-all text-[10px] font-sans uppercase tracking-[0.3em] text-white/80 hover:text-white"
          >
            {lang === 'de' ? 'Schließen' : lang === 'uk' ? 'Закрити' : 'Закрыть'}
          </button>
        </div>

      </div>
      
      {/* ФОНОВЫЙ ГРАДИЕНТ для красоты скролла */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0A0A0A] to-transparent z-20 pointer-events-none" />
    </div>
  )
}
