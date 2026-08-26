import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Lang = 'ru' | 'uk'

type ArticleAudioPlayerProps = {
  text: string
  lang: Lang
  className?: string
  // Новая функция, которая будет передавать индекс читаемого предложения наверх
  onProgress?: (sentenceIndex: number) => void 
}

const LANG_MAP: Record<Lang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
}

function stripMarkdown(md: string): string {
  return md
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/>\s?/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Экспортируем функцию нарезки, она нам понадобится в компоненте вывода текста!
export function getSentences(text: string): string[] {
  const clean = text.replace(/\n/g, '. ')
  const chunks = clean.split(/([.!?]+)/)
  const result: string[] = []

  for (let i = 0; i < chunks.length; i += 2) {
    const sentence = chunks[i]
    const punctuation = chunks[i + 1] || ''
    const combined = (sentence + punctuation).trim()
    if (combined) {
      result.push(combined)
    }
  }
  return result
}

function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false
  const tg = (window as any).Telegram?.WebApp
  return !!(tg && typeof tg.initData === 'string' && tg.initData.length > 0)
}

export function ArticleAudioPlayer({ text, lang, className = '', onProgress }: ArticleAudioPlayerProps) {
  if (isTelegramWebApp()) {
    return null
  }

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Создаем уникальный ключ для сохранения прогресса именно этой статьи
  const storageKey = useMemo(() => {
    return `audio-progress-${text.substring(0, 30).replace(/\s/g, '')}`
  }, [text])

  // При загрузке проверяем, есть ли сохраненный прогресс
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        setCurrentChunkIndex(parseInt(saved, 10))
      }
    }
  }, [storageKey])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices()
      
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices()
      }
      
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)
      
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    utteranceRef.current = null
    setIsSpeaking(false)
    if (onProgress) onProgress(-1) // Сообщаем, что чтение остановлено
  }, [onProgress])

  const speak = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Ошибка: Ваш браузер не поддерживает синтез речи')
      return
    }

    const cleanText = stripMarkdown(text)
    if (!cleanText || cleanText.trim() === '') return

    try {
      const sentences = getSentences(cleanText)
      const voices = window.speechSynthesis.getVoices()

      // Если дочитали до конца в прошлый раз, начинаем с нуля
      let startIndex = currentChunkIndex
      if (startIndex >= sentences.length) {
        startIndex = 0
        setCurrentChunkIndex(0)
        localStorage.removeItem(storageKey)
      }

      const sentencesToRead = sentences.slice(startIndex)
      if (sentencesToRead.length === 0) return

      sentencesToRead.forEach((sentence, index) => {
        const absoluteIndex = startIndex + index
        const utterance = new SpeechSynthesisUtterance(sentence)
        
        utterance.lang = LANG_MAP[lang] || 'ru-RU'
        utterance.rate = 0.95
        utterance.pitch = 1
        utterance.volume = 1

        const preferred =
          voices.find((v) => v.lang === utterance.lang) ||
          voices.find((v) => v.lang.startsWith(lang)) ||
          voices.find((v) => lang === 'uk' && (v.lang.includes('uk') || v.name.toLowerCase().includes('ukrain'))) ||
          voices.find((v) => lang === 'ru' && (v.lang.includes('ru') || v.name.toLowerCase().includes('russian'))) ||
          voices[0]

        if (preferred) utterance.voice = preferred

        utterance.onstart = () => {
          setIsSpeaking(true)
          setCurrentChunkIndex(absoluteIndex)
          localStorage.setItem(storageKey, absoluteIndex.toString())
          if (onProgress) onProgress(absoluteIndex) // Подсвечиваем текущее предложение!
        }
        
        utterance.onend = () => {
          if (absoluteIndex === sentences.length - 1) {
            setIsSpeaking(false)
            setCurrentChunkIndex(0)
            localStorage.removeItem(storageKey)
            utteranceRef.current = null
            if (onProgress) onProgress(-1) // Снимаем подсветку
          }
        }

        utterance.onerror = (e) => {
          if (e.error !== 'canceled' && e.error !== 'interrupted') {
            setIsSpeaking(false)
            if (onProgress) onProgress(-1)
          }
        }

        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
      })
      
    } catch (error: any) {
      alert('Критическая ошибка запуска: ' + error.message)
    }
  }, [text, lang, currentChunkIndex, storageKey, onProgress])

  const toggle = () => {
    if (isSpeaking) {
      stop()
    } else {
      speak()
    }
  }

  const label = isSpeaking
    ? (lang === 'ru' ? 'Остановить' : 'Зупинити')
    : (lang === 'ru' ? 'Слушать' : 'Слухати')

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.97 }}
      className={`
        relative flex items-center justify-center gap-2.5
        w-full px-5 py-3.5 rounded-2xl text-[13px] font-semibold
        overflow-hidden transition-colors duration-300
        focus-visible
        ${className}
      `}
      style={{
        border: `1px solid color-mix(in srgb, var(--color-accent, #D8A35C) ${isSpeaking ? '50%' : '28%'}, transparent)`,
        color: isSpeaking ? 'var(--color-accent, #D8A35C)' : 'var(--color-ink, #F5F1EA)',
      }}
      aria-label={label}
    >
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{
          background: isSpeaking
            ? 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent, #D8A35C) 20%, transparent), color-mix(in srgb, var(--color-accent, #D8A35C) 8%, transparent))'
            : 'linear-gradient(135deg, color-mix(in srgb, var(--color-surface, #25201C) 90%, transparent), color-mix(in srgb, var(--color-surface, #25201C) 70%, transparent))',
        }}
        transition={{ duration: 0.3 }}
      />

      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.25, 0.55, 0.25] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--color-accent, #D8A35C) 50%, transparent)',
            }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 w-5 h-5 flex items-center justify-center shrink-0">
        <AnimatePresence mode="wait">
          {isSpeaking ? (
            <motion.svg
              key="stop"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <rect x="6" y="6" width="12" height="12" rx="1.5" />
            </motion.svg>
          ) : (
            <motion.svg
              key="play"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <polygon points="6 3 20 12 6 21 6 3" />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      <span className="relative z-10 tracking-wide">{label}</span>
    </motion.button>
  )
}
