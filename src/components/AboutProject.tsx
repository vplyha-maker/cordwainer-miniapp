import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
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

const CHAR_SPEED = 0.04 

// Обновленный компонент: разбивает текст по словам, чтобы не было переносов посреди слова
const AnimatedText = ({ text, delay, className = "" }: { text: string, delay: number, className?: string }) => {
  const words = text.split(' ')
  let globalCharIndex = 0

  return (
    <span className={className}>
      {words.map((word, wordIndex) => {
        const wordContent = word.split('').map((char, charIndex) => {
          const currentDelay = delay + globalCharIndex * CHAR_SPEED
          globalCharIndex++
          
          return (
            <motion.span
              key={charIndex}
              initial={{ opacity: 0, y: 10 }} // Уменьшен шаг Y, чтобы не было прыжков на мобилке
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: currentDelay,
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1] 
              }}
              className="inline-block"
            >
              {char}
            </motion.span>
          )
        })
        
        // Учитываем пробел в общем счетчике задержки
        globalCharIndex++

        return (
          <span key={wordIndex} className="inline-block whitespace-nowrap mr-[0.25em] last:mr-0">
            {wordContent}
          </span>
        )
      })}
    </span>
  )
}

export default function AboutProject({ lang = 'ru', onClose }: AboutProjectProps) {
  const text = CONTENT[lang] || CONTENT.ru

  const [showClose, setShowClose] = useState(false)
  const [isAutoScrolling, setIsAutoScrolling] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const { timings, totalTime } = useMemo(() => {
    let currentDelay = 1.0; 
    const map: Record<string, number> = {};
    const LINE_PAUSE = 0.15; 
    
    const processLine = (key: keyof typeof text, extraPause = 0) => {
      const str = text[key];
      map[key] = currentDelay;
      currentDelay += (str.length * CHAR_SPEED) + LINE_PAUSE + extraPause;
    }

    processLine('title', 0.4);
    processLine('p1_1');
    processLine('p1_2', 0.5); 
    processLine('p2_1');
    processLine('p2_2');
    processLine('p2_3');
    processLine('p2_4', 0.5);
    processLine('p3_1');
    processLine('p3_2', 0.2);
    processLine('emphasis', 0.5);
    
    map['decor'] = currentDelay; 
    currentDelay += 0.5;
    
    processLine('dedication');

    return { timings: map, totalTime: currentDelay };
  }, [text]);

  // Логика мягкого автоскролла
  useEffect(() => {
    if (!isAutoScrolling) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollHeight, clientHeight } = scrollRef.current
        if (scrollHeight > clientHeight) {
          scrollRef.current.scrollTo({
            top: scrollHeight,
            behavior: 'smooth'
          })
        }
      }
    }, 1000); // Проверяем и доскролливаем каждую секунду

    return () => clearInterval(interval)
  }, [isAutoScrolling]);

  // Завершение анимации
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowClose(true);
      setIsAutoScrolling(false); // Отключаем принудительный скролл в конце
    }, (totalTime + 1) * 1000); 
    
    return () => clearTimeout(timer);
  }, [totalTime]);

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-[#faf8f5] text-[#1a1a1a] overflow-hidden select-none">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
        .font-playfair { font-family: 'Playfair Display', Georgia, serif; }
        .font-cormorant { font-family: 'Cormorant Garamond', Georgia, serif; }
      `}</style>

      {/* Анимированные двойные рамки */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2 }}
        className="absolute inset-4 border-[1px] border-[#c9a86c]/30 pointer-events-none z-0" 
      />
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2, delay: 0.2 }}
        className="absolute inset-[22px] border-[0.5px] border-[#c9a86c]/20 pointer-events-none z-0" 
      />

      {/* Градиент сверху для скрытия текста при скролле под кнопкой BACK */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#faf8f5] via-[#faf8f5]/90 to-transparent z-40 pointer-events-none" />

      {/* Header (только кнопка Back) */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5 }}
        className="absolute top-0 left-0 right-0 z-50 px-10 pt-12 pb-4 flex items-center justify-between pointer-events-none"
      >
        <button onClick={onClose} className="pointer-events-auto group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors">
          <span className="transform transition-transform duration-500 ease-out group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>
      </motion.header>

      {/* Скролл-контейнер (отключает автоскролл при ручном касании) */}
      <div 
        ref={scrollRef} 
        onTouchStart={() => setIsAutoScrolling(false)}
        onWheel={() => setIsAutoScrolling(false)}
        className="relative z-10 flex-1 overflow-y-auto scroll-smooth scrollbar-hide flex flex-col items-center justify-start pt-32 pb-32 px-6"
      >
        <div className="w-full max-w-[650px] flex flex-col items-center text-center">
          
          {/* Декор заголовка */}
          <motion.div 
            initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} 
            transition={{ delay: 0.4, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-[200px] md:w-[400px] h-[1px] bg-[#c9a86c] mb-12 flex justify-center items-center"
          >
            <div className="w-[5px] h-[5px] rounded-full bg-[#c9a86c] absolute" />
          </motion.div>

          <AnimatedText 
            text={text.title} delay={timings.title} 
            className="font-playfair text-3xl md:text-5xl font-bold text-[#1a1a1a] tracking-[0.1em] mb-20" 
          />

          {/* Абзац 1 */}
          <div className="flex flex-col items-center space-y-2 mb-12 leading-relaxed">
            <AnimatedText text={text.p1_1} delay={timings.p1_1} className="font-cormorant text-xl md:text-2xl text-[#2c2c2c]" />
            <AnimatedText text={text.p1_2} delay={timings.p1_2} className="font-cormorant text-xl md:text-2xl text-[#2c2c2c]" />
          </div>

          {/* Абзац 2 */}
          <div className="flex flex-col items-center space-y-2 mb-12 leading-relaxed">
            <AnimatedText text={text.p2_1} delay={timings.p2_1} className="font-cormorant text-xl md:text-2xl text-[#2c2c2c]" />
            <AnimatedText text={text.p2_2} delay={timings.p2_2} className="font-cormorant text-xl md:text-2xl text-[#2c2c2c]" />
            <AnimatedText text={text.p2_3} delay={timings.p2_3} className="font-cormorant text-xl md:text-2xl text-[#2c2c2c]" />
            <AnimatedText text={text.p2_4} delay={timings.p2_4} className="font-cormorant text-xl md:text-2xl text-[#2c2c2c]" />
          </div>

          {/* Абзац 3 */}
          <div className="flex flex-col items-center space-y-2 mb-6 leading-relaxed">
            <AnimatedText text={text.p3_1} delay={timings.p3_1} className="font-cormorant text-xl md:text-2xl text-[#2c2c2c]" />
            <AnimatedText text={text.p3_2} delay={timings.p3_2} className="font-cormorant text-xl md:text-2xl text-[#2c2c2c]" />
          </div>

          <AnimatedText 
            text={text.emphasis} delay={timings.emphasis} 
            className="font-cormorant text-2xl md:text-3xl font-medium text-[#1a1a1a] mb-24" 
          />

          {/* Декор перед посвящением */}
          <motion.div 
            initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} 
            transition={{ delay: timings.decor, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-[150px] md:w-[300px] h-[1px] bg-[#c9a86c] mb-12 flex justify-center items-center"
          >
            <div className="w-[5px] h-[5px] rounded-full bg-[#c9a86c] absolute" />
            <svg className="absolute -bottom-6 w-10 h-6 overflow-visible" viewBox="0 0 40 20">
              <motion.path 
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} 
                transition={{ delay: timings.decor + 0.5, duration: 1 }}
                d="M 0 0 Q 20 -20 40 0" fill="none" stroke="#c9a86c" strokeWidth="1.2" transform="rotate(180 20 10)"
              />
              <motion.circle 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                transition={{ delay: timings.decor + 1, duration: 0.5 }}
                cx="20" cy="22" r="2" fill="#c9a86c" 
              />
            </svg>
          </motion.div>

          <AnimatedText 
            text={text.dedication} delay={timings.dedication} 
            className="font-playfair text-lg md:text-xl font-semibold italic text-[#3a3a3a] tracking-[0.05em]" 
          />
        </div>
        
        {/* Анимированная кнопка закрытия */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showClose ? 1 : 0, y: showClose ? 0 : 20 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className={`mt-24 w-full px-4 max-w-[300px] ${showClose ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          <button
            onClick={onClose}
            className="w-full py-5 border border-[#c9a86c]/30 hover:border-[#c9a86c] hover:bg-[#c9a86c]/5 active:scale-[0.98] transition-all duration-500 ease-out text-[10px] font-sans uppercase tracking-[0.3em] text-[#1a1a1a]/80 hover:text-[#1a1a1a]"
          >
            {lang === 'de' ? 'Schließen' : lang === 'uk' ? 'Закрити' : 'Закрыть'}
          </button>
        </motion.div>
      </div>
      
      {/* Градиент для мягкого растворения текста внизу экрана */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#faf8f5] to-transparent z-40 pointer-events-none" />
    </div>
  )
}
