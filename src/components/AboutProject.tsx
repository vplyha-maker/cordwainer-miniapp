import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import type { Lang } from '../App'

type LineType = 'title' | 'subtitle' | 'text' | 'bullet' | 'dedication' | 'space'

type CreditLine = {
  text: string
  type: LineType
}

type AboutProjectProps = {
  lang?: Lang
  onClose?: () => void
}

// Редакционный текст (сокращен для примера, используйте ваш полный объект CREDITS)
const CREDITS: Record<Lang, CreditLine[]> = {
  ru: [
    { text: 'Благодарность', type: 'title' },
    { text: 'Отдельно хочу выразить искреннюю благодарность коллективу компании «Форвард Орто».', type: 'text' },
    { text: 'Спасибо коллегам за профессиональный опыт, знания, поддержку и возможность работать в среде, где я смог получить практическое понимание обувного производства и ремесла.', type: 'text' },
    { text: '', type: 'space' },
    { text: 'Посвящается Маме', type: 'dedication' },
  ],
  // ... uk, de
}

export default function AboutProject({ lang = 'ru', onClose }: AboutProjectProps) {
  const lines = CREDITS[lang] || CREDITS.ru

  // Оставляем только индекс текущей строки. Посимвольный индекс больше не нужен.
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [finished, setFinished] = useState(false)

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

    return () => {
      audio.pause()
      audioRef.current = null
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

  // Логика переключения строк
  useEffect(() => {
    if (currentLineIndex >= lines.length) {
      setFinished(true)
      return
    }

    const currentText = lines[currentLineIndex].text
    // Динамически рассчитываем время анимации: 50мс на каждый символ
    const animationDuration = currentText === '' ? 400 : currentText.length * 50
    
    // Переходим к следующей строке после завершения анимации + небольшая пауза (200мс)
    const timer = setTimeout(() => {
      setCurrentLineIndex((i) => i + 1)
    }, animationDuration + 200)

    return () => clearTimeout(timer)
  }, [currentLineIndex, lines])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [currentLineIndex])

  const renderLine = (line: CreditLine, idx: number) => {
    // Не рендерим строки, до которых еще не дошла очередь
    if (idx > currentLineIndex) return null

    const isCurrent = idx === currentLineIndex
    const { text, type } = line

    if (type === 'space') return <div key={idx} className="h-4" />

    // Длительность CSS анимации в секундах
    const duration = `${text.length * 0.05}s`

    // Базовые стили для рукописного текста
    const textStyles = {
      fontFamily: '"Caveat", cursive',
      // Применяем анимацию только к текущей (печатающейся) строке
      animation: isCurrent ? `wipe-reveal ${duration} linear forwards` : 'none',
      // Прошлые строки полностью открыты
      clipPath: isCurrent ? 'inset(0 100% 0 0)' : 'inset(0 0 0 0)'
    }

    switch (type) {
      case 'title':
        return (
          <h2 key={idx} style={textStyles} className="text-4xl md:text-5xl text-[#F4F0E8] leading-tight mt-12 mb-6 tracking-wide drop-shadow-md">
            {text}
          </h2>
        )
      case 'subtitle':
        return (
          <h3 key={idx} style={textStyles} className="text-2xl text-[#F4F0E8]/70 mt-10 mb-3 drop-shadow-sm">
            {text}
          </h3>
        )
      case 'dedication':
        return (
          <p key={idx} style={textStyles} className="text-3xl text-[#F4F0E8] text-center my-16 tracking-wide drop-shadow-lg opacity-90">
            {text}
          </p>
        )
      case 'bullet':
        return (
          <div key={idx} className="flex items-start gap-3 mb-3">
            <span className="text-[#F4F0E8]/40 text-sm mt-1">—</span>
            <p style={textStyles} className="text-[20px] md:text-[22px] leading-[1.4] text-[#F4F0E8]/80">
              {text}
            </p>
          </div>
        )
      case 'text':
      default:
        return (
          <p key={idx} style={textStyles} className="text-[20px] md:text-[22px] leading-[1.4] text-[#F4F0E8]/80 mb-4">
            {text}
          </p>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-[#0A0A0A] text-[#F4F0E8] overflow-hidden select-none">
      {/* Встроенные стили для шрифта и анимации */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;700&display=swap');
        
        @keyframes wipe-reveal {
          0% { clip-path: inset(0 100% 0 0); }
          100% { clip-path: inset(0 0 0 0); }
        }
      `}</style>

      <header className="absolute top-0 left-0 right-0 z-50 px-6 pt-10 pb-4 flex items-center justify-between mix-blend-difference pointer-events-none">
        <button onClick={onClose} className="pointer-events-auto group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer text-[#F4F0E8]/70 hover:text-white transition-colors">
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>

        <button onClick={toggleMusic} className="pointer-events-auto text-[10px] font-sans uppercase tracking-[0.2em] text-[#F4F0E8]/70 hover:text-white transition-colors outline-none">
          {isPlaying ? 'SOUND: ON' : 'SOUND: OFF'}
        </button>
      </header>

      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-6 pt-24 pb-32 scroll-smooth scrollbar-hide">
        <div className="max-w-lg mx-auto w-full">
          
          {lines.map((line, idx) => renderLine(line, idx))}
          
          <div className={`mt-16 pt-8 transition-opacity duration-1000 ${finished ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button onClick={onClose} className="w-full py-5 border border-white/20 hover:border-white/60 active:scale-95 transition-all text-[10px] font-sans uppercase tracking-[0.3em] text-white/80 hover:text-white">
              {lang === 'de' ? 'Schließen' : lang === 'uk' ? 'Закрити' : 'Закрыть'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0A0A0A] to-transparent z-20 pointer-events-none" />
    </div>
  )
}
