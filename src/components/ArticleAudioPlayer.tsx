import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Lang = 'ru' | 'uk'

type ArticleAudioPlayerProps = {
  text: string
  lang: Lang
  className?: string
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

export function ArticleAudioPlayer({ text, lang, className = '' }: ArticleAudioPlayerProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false)
    }
  }, [])

  // Очистка при размонтировании / смене текста / языка
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      utteranceRef.current = null
      setIsSpeaking(false)
    }
  }, [text, lang])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    utteranceRef.current = null
    setIsSpeaking(false)
  }, [])

  const speak = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) return

    window.speechSynthesis.cancel()

    const cleanText = stripMarkdown(text)
    if (!cleanText) return

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = LANG_MAP[lang] || 'ru-RU'
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.volume = 1

    const applyVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find(
        (v) =>
          v.lang === utterance.lang ||
          v.lang.startsWith(lang) ||
          (lang === 'uk' && (v.lang.startsWith('uk') || v.lang.includes('Ukrainian'))) ||
          (lang === 'ru' && (v.lang.startsWith('ru') || v.lang.includes('Russian')))
      )
      if (preferred) utterance.voice = preferred

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)
        utteranceRef.current = null
      }
      utterance.onerror = () => {
        setIsSpeaking(false)
        utteranceRef.current = null
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }

    // В Telegram WebView и части мобильных браузеров голоса появляются асинхронно
    const voices = window.speechSynthesis.getVoices()
    if (voices.length === 0) {
      const handler = () => {
        applyVoiceAndSpeak()
        window.speechSynthesis.onvoiceschanged = null
      }
      window.speechSynthesis.onvoiceschanged = handler
      // Fallback на случай, если событие не сработает
      setTimeout(applyVoiceAndSpeak, 300)
    } else {
      applyVoiceAndSpeak()
    }
  }, [text, lang])

  const toggle = () => {
    if (isSpeaking) {
      stop()
    } else {
      speak()
    }
  }

  if (!isSupported) return null

  const label = isSpeaking
    ? lang === 'ru' ? 'Остановить' : 'Зупинити'
    : lang === 'ru' ? 'Слушать' : 'Слухати'

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.96 }}
      className={`
        relative flex items-center justify-center gap-2.5
        px-5 py-3 rounded-2xl text-[12px] font-semibold
        overflow-hidden transition-colors duration-300
        focus-visible active:scale-95
        ${className}
      `}
      style={{
        border: `1px solid color-mix(in srgb, var(--color-accent, #D8A35C) ${isSpeaking ? '45%' : '25%'}, transparent)`,
        color: isSpeaking ? 'var(--color-accent, #D8A35C)' : 'var(--color-ink, #F5F1EA)',
      }}
      aria-label={label}
    >
      {/* Фон */}
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{
          background: isSpeaking
            ? 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent, #D8A35C) 18%, transparent), color-mix(in srgb, var(--color-accent, #D8A35C) 8%, transparent))'
            : 'linear-gradient(135deg, color-mix(in srgb, var(--color-surface, #25201C) 85%, transparent), color-mix(in srgb, var(--color-surface, #25201C) 60%, transparent))',
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Пульсирующее кольцо при воспроизведении */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--color-accent, #D8A35C) 40%, transparent)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Иконка */}
      <div className="relative z-10 w-5 h-5 flex items-center justify-center">
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

      {/* Текст */}
      <span className="relative z-10 tracking-wide">
        <AnimatePresence mode="wait">
          <motion.span
            key={label}
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="inline-block"
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.button>
  )
}
