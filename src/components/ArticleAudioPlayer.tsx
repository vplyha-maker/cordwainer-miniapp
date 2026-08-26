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

function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false
  const tg = (window as any).Telegram?.WebApp
  return !!(tg && typeof tg.initData === 'string' && tg.initData.length > 0)
}

export function ArticleAudioPlayer({ text, lang, className = '' }: ArticleAudioPlayerProps) {
  // Скрываем кнопку только внутри настоящего Telegram Mini App
  if (isTelegramWebApp()) {
    return null
  }

  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Очистка при размонтировании / смене статьи
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

    // Пытаемся выбрать голос
    const voices = window.speechSynthesis.getVoices()
    const preferred =
      voices.find((v) => v.lang === utterance.lang) ||
      voices.find((v) => v.lang.startsWith(lang)) ||
      voices.find((v) => lang === 'uk' && v.lang.toLowerCase().includes('uk')) ||
      voices.find((v) => lang === 'ru' && v.lang.toLowerCase().includes('ru'))

    if (preferred) {
      utterance.voice = preferred
    }

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

    // Если голоса ещё не загрузились — ждём
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        const updatedVoices = window.speechSynthesis.getVoices()
        const voice =
          updatedVoices.find((v) => v.lang === utterance.lang) ||
          updatedVoices.find((v) => v.lang.startsWith(lang))
        if (voice) utterance.voice = voice
        window.speechSynthesis.speak(utterance)
        window.speechSynthesis.onvoiceschanged = null
      }
    } else {
      window.speechSynthesis.speak(utterance)
    }
  }, [text, lang])

  const toggle = () => {
    if (isSpeaking) {
      stop()
    } else {
      speak()
    }
  }

  const label = isSpeaking
    ? lang === 'ru' ? 'Остановить' : 'Зупинити'
    : lang === 'ru' ? 'Слушать' : 'Слухати'

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
      {/* Фон */}
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

      {/* Пульсация */}
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

      {/* Иконка */}
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

      {/* Текст */}
      <span className="relative z-10 tracking-wide">
        <AnimatePresence mode="wait">
          <motion.span
            key={label}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
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
