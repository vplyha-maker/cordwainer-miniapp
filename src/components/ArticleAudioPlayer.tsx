import { useState, useEffect, useRef, useCallback } from 'react'

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

/**
 * Убирает markdown-разметку, чтобы озвучка была чистой.
 * Достаточно для статей с обычным markdown.
 */
function stripMarkdown(md: string): string {
  return md
    .replace(/!\[.*?\]\(.*?\)/g, '') // картинки
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // ссылки
    .replace(/#{1,6}\s+/g, '') // заголовки
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // код
    .replace(/^\s*[-*+]\s+/gm, '') // списки
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/>\s?/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function ArticleAudioPlayer({ text, lang, className = '' }: ArticleAudioPlayerProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Проверяем поддержку Web Speech API
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false)
    }
  }, [])

  // Очистка при размонтировании / смене статьи / смене языка
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      utteranceRef.current = null
      setIsSpeaking(false)
    }
  }, [text, lang])

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    utteranceRef.current = null
    setIsSpeaking(false)
  }, [])

  const speak = useCallback(() => {
    if (!window.speechSynthesis || !text) return

    // Всегда сначала отменяем предыдущее
    window.speechSynthesis.cancel()

    const cleanText = stripMarkdown(text)
    if (!cleanText) return

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = LANG_MAP[lang] || 'ru-RU'
    utterance.rate = 0.95 // чуть медленнее для комфорта
    utterance.pitch = 1
    utterance.volume = 1

    // Пытаемся найти голос под язык (особенно важно в мобильных WebView)
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(
      (v) =>
        v.lang === utterance.lang ||
        v.lang.startsWith(lang) ||
        (lang === 'uk' && v.lang.startsWith('uk')) ||
        (lang === 'ru' && v.lang.startsWith('ru'))
    )
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

    // В Telegram WebView и некоторых мобильных браузерах
    // getVoices() может быть пустым до события voiceschanged
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        const updatedVoices = window.speechSynthesis.getVoices()
        const voice = updatedVoices.find(
          (v) =>
            v.lang === utterance.lang ||
            v.lang.startsWith(lang)
        )
        if (voice) utterance.voice = voice
        window.speechSynthesis.speak(utterance)
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

  if (!isSupported) {
    return null // или можно показать disabled-кнопку
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`
        flex items-center justify-center gap-2
        px-4 py-2.5 rounded-full text-[12px] font-semibold
        transition-all active:scale-95
        focus-visible
        ${className}
      `}
      style={{
        background: isSpeaking
          ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 18%, transparent)'
          : 'color-mix(in srgb, var(--color-surface, #25201C) 90%, transparent)',
        border: `1px solid color-mix(in srgb, var(--color-accent, #D8A35C) ${isSpeaking ? '40%' : '25%'}, transparent)`,
        color: isSpeaking
          ? 'var(--color-accent, #D8A35C)'
          : 'var(--color-ink, #F5F1EA)',
      }}
      aria-label={isSpeaking ? 'Остановить озвучку' : 'Слушать статью'}
    >
      {isSpeaking ? (
        // Иконка "Стоп"
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      ) : (
        // Иконка "Слушать"
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      )}
      <span>{isSpeaking ? (lang === 'ru' ? 'Остановить' : 'Зупинити') : (lang === 'ru' ? 'Слушать' : 'Слухати')}</span>
    </button>
  )
}
