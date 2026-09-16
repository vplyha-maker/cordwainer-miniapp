import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
import type { Lang } from '../App'

type AboutProjectProps = {
  lang?: Lang
  onClose?: () => void
}

const CONTENT = {
  ru: {
    title: 'Благодарность',
    dedication: 'Посвящается Маме'
  },
  uk: {
    title: 'Вдячність',
    dedication: 'Присвячується Мамі'
  },
  de: {
    title: 'Danksagung',
    dedication: 'Meiner Mutter gewidmet'
  }
}

export default function AboutProject({ lang = 'ru', onClose }: AboutProjectProps) {
  const text = CONTENT[lang] || CONTENT.ru
  const [isPlaying, setIsPlaying] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  useEffect(() => {
    const timer = setTimeout(() => setShowClose(true), 9000)
    return () => clearTimeout(timer)
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

  // SVG рукописной записки (только для русского)
  const HandwrittenSVG = () => (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      viewBox="0 0 794 458"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      className="max-w-[720px] w-full drop-shadow-sm"
    >
      <title>Handwritten note</title>
      <defs>
        <style>{`
          @font-face {
            font-family: 'Indie Flower';
            src: url(data:font/woff2;base64,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) format('woff2');
          }
        `}</style>
      </defs>

      {/* Фон «листка» */}
      <rect width="794" height="458" fill="#faf8f5" rx="4" />

      {/* Лёгкая тень/бумага */}
      <rect x="8" y="8" width="778" height="442" fill="#fffef9" stroke="#e8e0d5" strokeWidth="1" rx="2" />

      <g fontFamily="'Indie Flower','Segoe Print','Bradley Hand','Comic Sans MS',cursive" fontSize="24" fill="#1a1a8c">
        {/* Строки появляются последовательно как будто пишут */}
        <motion.text
          x="56" y="107.2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          Отдельно хочу выразить искреннюю благодарность коллективу
        </motion.text>

        <motion.text
          x="56" y="150.4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
        >
          компании «Форвард Орто».
        </motion.text>

        <motion.text
          x="56" y="193.6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 0.6 }}
        >
          Спасибо коллегам за профессиональный опыт, знания, поддержку и
        </motion.text>

        <motion.text
          x="56" y="236.8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.2, duration: 0.6 }}
        >
          возможность работать в среде, где я смог получить практическое
        </motion.text>

        <motion.text
          x="56" y="280"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.0, duration: 0.6 }}
        >
          понимание обувного производства и ремесла.
        </motion.text>

        <motion.text
          x="56" y="323.2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.8, duration: 0.6 }}
        >
          Этот опыт стал важной частью основы, на которой появился проект
        </motion.text>

        <motion.text
          x="56" y="366.4"
          fontWeight="600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 5.6, duration: 0.7 }}
        >
          Cordwainer
        </motion.text>

        <motion.text
          x="56" y="409.6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 6.5, duration: 0.7 }}
        >
          Посвящается Маме
        </motion.text>
      </g>
    </motion.svg>
  )

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-[#faf8f5] text-[#1a1a1a] overflow-hidden select-none">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
        .font-playfair { font-family: 'Playfair Display', Georgia, serif; }
        .font-cormorant { font-family: 'Cormorant Garamond', Georgia, serif; }
      `}</style>

      {/* Рамки */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2 }}
        className="absolute inset-4 border-[1px] border-[#c9a86c]/30 pointer-events-none z-0" 
      />
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2, delay: 0.2 }}
        className="absolute inset-[22px] border-[0.5px] border-[#c9a86c]/20 pointer-events-none z-0" 
      />

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5 }}
        className="absolute top-0 left-0 right-0 z-50 px-10 pt-12 pb-4 flex items-center justify-between pointer-events-none"
      >
        <button 
          onClick={onClose} 
          className="pointer-events-auto group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors"
        >
          <span className="transform transition-transform duration-500 ease-out group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>
        <button 
          onClick={toggleMusic} 
          className="pointer-events-auto text-[10px] font-sans uppercase tracking-[0.2em] text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors outline-none"
        >
          {isPlaying ? 'SOUND: ON' : 'SOUND: OFF'}
        </button>
      </motion.header>

      {/* Контент */}
      <div className="relative z-10 flex-1 overflow-y-auto scroll-smooth scrollbar-hide flex flex-col items-center justify-start pt-28 pb-32 px-4">
        
        <div className="w-full max-w-[780px] flex flex-col items-center">
          
          {/* Декор сверху */}
          <motion.div 
            initial={{ scaleX: 0, opacity: 0 }} 
            animate={{ scaleX: 1, opacity: 1 }} 
            transition={{ delay: 0.4, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-[280px] md:w-[380px] h-[1px] bg-[#c9a86c] mb-10 flex justify-center items-center"
          >
            <div className="w-[5px] h-[5px] rounded-full bg-[#c9a86c] absolute" />
          </motion.div>

          {/* Заголовок */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="font-playfair text-3xl md:text-4xl font-bold text-[#1a1a1a] tracking-[0.12em] mb-12 text-center"
          >
            {text.title}
          </motion.h1>

          {/* Рукописный SVG (только для ru) или обычный текст для других языков */}
          {lang === 'ru' ? (
            <div className="w-full flex justify-center">
              <HandwrittenSVG />
            </div>
          ) : (
            <div className="text-center space-y-4 max-w-[620px] font-cormorant text-xl md:text-2xl text-[#2c2c2c]">
              {/* Здесь можно оставить анимированный текст для uk/de если нужно */}
              <p>Текст для {lang}</p>
            </div>
          )}

          {/* Кнопка закрытия */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: showClose ? 1 : 0, y: showClose ? 0 : 20 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className={`mt-16 w-full px-4 max-w-[280px] ${showClose ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <button
              onClick={onClose}
              className="w-full py-5 border border-[#c9a86c]/30 hover:border-[#c9a86c] hover:bg-[#c9a86c]/5 active:scale-[0.98] transition-all duration-500 ease-out text-[10px] font-sans uppercase tracking-[0.3em] text-[#1a1a1a]/80 hover:text-[#1a1a1a]"
            >
              {lang === 'de' ? 'Schließen' : lang === 'uk' ? 'Закрити' : 'Закрыть'}
            </button>
          </motion.div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#faf8f5] to-transparent z-20 pointer-events-none" />
    </div>
  )
}
