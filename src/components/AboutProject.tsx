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

// Настройки синхронизации с музыкой (122 BPM)
const SONG_BPM = 122
const MS_PER_BEAT = 60000 / SONG_BPM
const CHAR_DELAY = MS_PER_BEAT / 16 // Скорость "написания"
const LINE_DELAY = MS_PER_BEAT * 1.5 // Пауза в конце абзаца
const EMPTY_LINE_DELAY = MS_PER_BEAT / 2 // Пауза для пустого пространства

// Редакционный текст (переписанный из терминального формата)
const CREDITS: Record<Lang, CreditLine[]> = {
  ru: [
    { text: 'Благодарность', type: 'title' },
    { text: 'Отдельно хочу выразить искреннюю благодарность коллективу компании «Форвард Орто».', type: 'text' },
    { text: 'Спасибо коллегам за профессиональный опыт, знания, поддержку и возможность работать в среде, где я смог получить практическое понимание обувного производства и ремесла.', type: 'text' },
    { text: 'Этот опыт стал важной частью основы, на которой появился проект Cordwainer.', type: 'text' },
    { text: '', type: 'space' },
    { text: 'Посвящается Маме', type: 'dedication' },
    { text: '', type: 'space' },
    { text: '', type: 'space' },
    { text: 'Архитектура & Технологии', type: 'title' },
    { text: 'Платформа', type: 'subtitle' },
    { text: 'Telegram Mini Apps (TMA)', type: 'text' },
    { text: 'SDK: @tma.js/sdk — адаптация под экосистему', type: 'bullet' },
    { text: 'Бесшовная синхронизация тем Dark / Light', type: 'bullet' },
    { text: '', type: 'space' },
    { text: 'Фронтенд', type: 'subtitle' },
    { text: 'React 18 + TypeScript + Vite', type: 'text' },
    { text: 'Tailwind CSS, Framer Motion для плавных UI-переходов', type: 'bullet' },
    { text: 'Журнальная верстка и модульная архитектура', type: 'bullet' },
    { text: '', type: 'space' },
    { text: 'Цветовая наука', type: 'subtitle' },
    { text: 'Спектральная колориметрия (380–780 нм)', type: 'text' },
    { text: 'База спектров отражения пигментов', type: 'bullet' },
    { text: 'Модель смешения Kubelka–Munk + Saunderson', type: 'bullet' },
    { text: 'Метрика цветового различия CIEDE2000 (ΔE₀₀)', type: 'bullet' },
    { text: 'Web Worker для сложных вычислений рецептур без фризов UI', type: 'bullet' },
    { text: '', type: 'space' },
    { text: 'Оптимизация', type: 'subtitle' },
    { text: 'Custom Performance Profiler', type: 'text' },
    { text: 'Динамическое отключение эффектов на слабых устройствах', type: 'bullet' },
    { text: 'Стриминг медиа через глобальную CDN', type: 'bullet' },
    { text: '', type: 'space' },
  ],
  uk: [
    { text: 'Вдячність', type: 'title' },
    { text: 'Окремо хочу висловити щиру подяку колективу компанії «Форвард Орто».', type: 'text' },
    { text: 'Дякую колегам за професійний досвід, знання, підтримку та можливість працювати в середовищі, де я зміг отримати практичне розуміння взуттєвого виробництва та ремесла.', type: 'text' },
    { text: 'Цей досвід став важливою частиною основи, на якій зʼявився проєкт Cordwainer.', type: 'text' },
    { text: '', type: 'space' },
    { text: 'Присвячується Мамі', type: 'dedication' },
    { text: '', type: 'space' },
    { text: '', type: 'space' },
    { text: 'Архітектура & Технології', type: 'title' },
    { text: 'Платформа', type: 'subtitle' },
    { text: 'Telegram Mini Apps (TMA)', type: 'text' },
    { text: 'SDK: @tma.js/sdk — адаптація під екосистему', type: 'bullet' },
    { text: 'Безшовна синхронізація тем Dark / Light', type: 'bullet' },
    { text: '', type: 'space' },
    { text: 'Фронтенд', type: 'subtitle' },
    { text: 'React 18 + TypeScript + Vite', type: 'text' },
    { text: 'Tailwind CSS, Framer Motion для плавних UI-переходів', type: 'bullet' },
    { text: 'Журнальна верстка та модульна архітектура', type: 'bullet' },
    { text: '', type: 'space' },
    { text: 'Кольорова наука', type: 'subtitle' },
    { text: 'Спектральна колориметрія (380–780 нм)', type: 'text' },
    { text: 'База спектрів відбиття пігментів', type: 'bullet' },
    { text: 'Модель змішування Kubelka–Munk + Saunderson', type: 'bullet' },
    { text: 'Метрика колірної різниці CIEDE2000 (ΔE₀₀)', type: 'bullet' },
    { text: 'Web Worker для складних обчислень рецептур без фризів UI', type: 'bullet' },
    { text: '', type: 'space' },
    { text: 'Оптимізація', type: 'subtitle' },
    { text: 'Custom Performance Profiler', type: 'text' },
    { text: 'Динамічне відключення ефектів на слабких пристроях', type: 'bullet' },
    { text: 'Стримінг медіа через глобальну CDN', type: 'bullet' },
    { text: '', type: 'space' },
  ],
  de: [
    { text: 'Danksagung', type: 'title' },
    { text: 'Besonders möchte ich meine aufrichtige Dankbarkeit gegenüber dem Team von «Forward Ortho» ausdrücken.', type: 'text' },
    { text: 'Vielen Dank an meine Kollegen für die Erfahrung, das Wissen, die Unterstützung und die Möglichkeit, in einem Umfeld zu arbeiten, in dem ich ein praktisches Verständnis für die Schuhherstellung und das Handwerk erlangen konnte.', type: 'text' },
    { text: 'Diese Erfahrung wurde zu einem wichtigen Teil des Fundaments, auf dem das Cordwainer-Projekt entstand.', type: 'text' },
    { text: '', type: 'space' },
    { text: 'Meiner Mutter gewidmet', type: 'dedication' },
    { text: '', type: 'space' },
    { text: '', type: 'space' },
    { text: 'Architektur & Technologie', type: 'title' },
    { text: 'Plattform', type: 'subtitle' },
    { text: 'Telegram Mini Apps (TMA)', type: 'text' },
    { text: 'SDK: @tma.js/sdk — Ökosystem-Anpassung', type: 'bullet' },
    { text: 'Nahtlose Dark / Light-Synchronisation', type: 'bullet' },
    { text: '', type: 'space' },
    { text: 'Frontend', type: 'subtitle' },
    { text: 'React 18 + TypeScript + Vite', type: 'text' },
    { text: 'Tailwind CSS, Framer Motion für reibungslose UI', type: 'bullet' },
    { text: 'Redaktionelles Layout und modulare Architektur', type: 'bullet' },
    { text: '', type: 'space' },
    { text: 'Farbwissenschaft', type: 'subtitle' },
    { text: 'Spektralkolorimetrie (380–780 nm)', type: 'text' },
    { text: 'Datenbank der Pigmentreflexion', type: 'bullet' },
    { text: 'Mischmodell nach Kubelka–Munk + Saunderson', type: 'bullet' },
    { text: 'Farbabstandsmetrik CIEDE2000 (ΔE₀₀)', type: 'bullet' },
    { text: 'Web Worker für komplexe Rezepturberechnungen', type: 'bullet' },
    { text: '', type: 'space' },
    { text: 'Leistung', type: 'subtitle' },
    { text: 'Custom Performance Profiler', type: 'text' },
    { text: 'Dynamische Deaktivierung von Effekten auf schwachen Geräten', type: 'bullet' },
    { text: 'Medien-Streaming über ein globales CDN', type: 'bullet' },
    { text: '', type: 'space' },
  ]
}

export default function AboutProject({ lang = 'ru', onClose }: AboutProjectProps) {
  const lines = CREDITS[lang] || CREDITS.ru

  const [displayedLines, setDisplayedLines] = useState<string[]>([])
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [finished, setFinished] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    // Блокируем скролл на body пока открыто это окно
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const audio = new Audio('/audio/start-me-up-8bit.mp3')
    audio.loop = true
    audio.volume = 0.35
    // Звук выключен по умолчанию, как запрашивалось
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

  // Логика "написания прописью"
  useEffect(() => {
    if (currentLineIndex >= lines.length) {
      setFinished(true)
      return
    }

    const line = lines[currentLineIndex]
    const fullText = line.text

    if (currentCharIndex < fullText.length) {
      timeoutRef.current = setTimeout(() => {
        setDisplayedLines((prev) => {
          const next = [...prev]
          next[currentLineIndex] = fullText.slice(0, currentCharIndex + 1)
          return next
        })
        setCurrentCharIndex((c) => c + 1)
      }, fullText === '' ? EMPTY_LINE_DELAY : CHAR_DELAY)
    } else {
      timeoutRef.current = setTimeout(() => {
        setCurrentLineIndex((i) => i + 1)
        setCurrentCharIndex(0)
        setDisplayedLines((prev) => [...prev, ''])
      }, fullText === '' ? EMPTY_LINE_DELAY : LINE_DELAY)
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [currentLineIndex, currentCharIndex, lines])

  // Автоскролл
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [displayedLines])

  const renderLine = (text: string, type: LineType, idx: number) => {
    if (type === 'space') return <div key={idx} className="h-4" />

    switch (type) {
      case 'title':
        return (
          <h2 key={idx} className="font-serif text-3xl md:text-4xl text-[#F4F0E8] leading-tight mt-12 mb-6 tracking-wide drop-shadow-md">
            {text}
          </h2>
        )
      case 'subtitle':
        return (
          <h3 key={idx} className="font-sans text-[9px] uppercase tracking-[0.3em] text-[#F4F0E8]/50 mt-10 mb-3 drop-shadow-sm">
            {text}
          </h3>
        )
      case 'dedication':
        return (
          <p key={idx} className="font-serif italic text-2xl text-[#F4F0E8] text-center my-16 tracking-wide drop-shadow-lg opacity-90">
            {text}
          </p>
        )
      case 'bullet':
        return (
          <div key={idx} className="flex items-start gap-3 mb-3">
            <span className="text-[#F4F0E8]/40 text-[10px] mt-1">—</span>
            <p className="font-sans font-light text-[13px] md:text-[14px] leading-[1.8] text-[#F4F0E8]/70">
              {text}
            </p>
          </div>
        )
      case 'text':
      default:
        return (
          <p key={idx} className="font-sans font-light text-[13px] md:text-[14px] leading-[1.8] text-[#F4F0E8]/80 mb-4">
            {text}
          </p>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-[#0A0A0A] text-[#F4F0E8] overflow-hidden select-none">
      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 pt-10 pb-4 flex items-center justify-between mix-blend-difference pointer-events-none">
        <button
          onClick={onClose}
          className="pointer-events-auto group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer text-[#F4F0E8]/70 hover:text-white transition-colors"
        >
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>

        <button
          onClick={toggleMusic}
          className="pointer-events-auto text-[10px] font-sans uppercase tracking-[0.2em] text-[#F4F0E8]/70 hover:text-white transition-colors outline-none"
        >
          {isPlaying ? 'SOUND: ON' : 'SOUND: OFF'}
        </button>
      </header>

      {/* CONTENT SCROLL AREA */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto px-6 pt-24 pb-32 scroll-smooth scrollbar-hide"
      >
        <div className="max-w-lg mx-auto w-full">
          {displayedLines.map((text, idx) => {
            const lineData = lines[idx]
            if (!lineData) return null
            return renderLine(text, lineData.type, idx)
          })}
          
          {/* Кнопка Закрыть в самом конце */}
          <div className={`mt-16 pt-8 transition-opacity duration-1000 ${finished ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button
              onClick={onClose}
              className="w-full py-5 border border-white/20 hover:border-white/60 active:scale-95 transition-all text-[10px] font-sans uppercase tracking-[0.3em] text-white/80 hover:text-white"
            >
              {lang === 'de' ? 'Schließen' : lang === 'uk' ? 'Закрити' : 'Закрыть'}
            </button>
          </div>
        </div>
      </div>
      
      {/* ФОНОВЫЙ ГРАДИЕНТ (Снизу, для мягкого затемнения текста при скролле) */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0A0A0A] to-transparent z-20 pointer-events-none" />
    </div>
  )
}
