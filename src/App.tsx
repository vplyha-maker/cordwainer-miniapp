import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

import { WelcomePage } from './pages/WelcomePage'
import { HomePage } from './pages/HomePage'
import { BlogPage } from './pages/BlogPage'
import {
  getSavedPerfMode,
  savePerfMode,
  measureShouldUseFastMode,
  applyPerfMode,
  guessLowPowerDevice,
} from './lib/performance'

declare global {
  interface Window {
    Telegram?: { WebApp: any }
  }
}

export type Screen = 'welcome' | 'home' | 'blog'
export type Lang = 'ru' | 'uk'

export type FavoriteType = 'blog' | 'article'

export interface FavoriteItem {
  id: string
  type: FavoriteType
  imagePng: string
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome')
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('cordwainer_lang')
      return saved === 'uk' ? 'uk' : 'ru'
    } catch {
      return 'ru'
    }
  })

  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem('cordwainer_favorites')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Миграция со старого формата (массив строк)
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          return parsed.map((id: string) => ({
            id,
            type: id.includes('blog') ? 'blog' : 'article',
            imagePng: id.includes('blog') ? '/blog-hero.png' : `/${id}.png`,
          }))
        }
        return parsed as FavoriteItem[]
      }
      return []
    } catch {
      return []
    }
  })

  const [showPerfHint, setShowPerfHint] = useState(false)

  const handleSetLang = (next: Lang) => {
    setLang(next)
    try {
      localStorage.setItem('cordwainer_lang', next)
    } catch {}
  }

  const toggleFavorite = (item: FavoriteItem) => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
    } catch {}

    setFavorites((prev) => {
      const exists = prev.some((fav) => fav.id === item.id)
      const next = exists
        ? prev.filter((fav) => fav.id !== item.id)
        : [...prev, item]

      try {
        localStorage.setItem('cordwainer_favorites', JSON.stringify(next))
      } catch {}

      return next
    })
  }

  // Telegram theme
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return

    tg.ready()
    tg.expand()

    const applyTheme = () => {
      const isDark = tg.colorScheme === 'dark'
      document.documentElement.classList.toggle('dark', isDark)

      try {
        if (isDark) {
          tg.setHeaderColor('#151210')
          tg.setBackgroundColor('#151210')
        } else {
          tg.setHeaderColor('#F5F1EA')
          tg.setBackgroundColor('#F5F1EA')
        }
      } catch {}
    }

    applyTheme()
    tg.onEvent('themeChanged', applyTheme)

    return () => {
      tg.offEvent('themeChanged', applyTheme)
    }
  }, [])

  // Performance mode
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const saved = getSavedPerfMode()

      if (saved === 'fast') {
        applyPerfMode('fast')
        return
      }
      if (saved === 'full') {
        applyPerfMode('full')
        return
      }

      // auto
      if (guessLowPowerDevice()) {
        applyPerfMode('fast')
        if (!cancelled) setShowPerfHint(true)
        return
      }

      const needFast = await measureShouldUseFastMode(1100)
      if (cancelled) return

      if (needFast) {
        applyPerfMode('fast')
        setShowPerfHint(true)
      } else {
        applyPerfMode('full')
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)] font-body tg-safe">
      {showPerfHint && (
        <div
          className="fixed top-3 left-3 right-3 z-[100] rounded-2xl px-3.5 py-3 text-[12px] text-[#F5F1EB]"
          style={{
            background: 'rgba(29,24,21,0.96)',
            border: '1px solid rgba(198,164,122,0.35)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          <div className="mb-2 leading-snug text-[#B9ACA0]">
            {lang === 'uk'
              ? 'Інтерфейс працює нерівномірно. Увімкнено швидкий режим — ефекти спрощено.'
              : 'Интерфейс работает неравномерно. Включён быстрый режим — эффекты упрощены.'}
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 py-2 rounded-xl text-[11px] font-semibold"
              style={{ background: '#D8A35C', color: '#151210' }}
              onClick={() => {
                savePerfMode('fast')
                applyPerfMode('fast')
                setShowPerfHint(false)
              }}
            >
              OK
            </button>
            <button
              className="flex-1 py-2 rounded-xl text-[11px] font-medium text-[#B9ACA0]"
              style={{ border: '1px solid rgba(185,172,160,0.25)' }}
              onClick={() => {
                savePerfMode('full')
                applyPerfMode('full')
                setShowPerfHint(false)
              }}
            >
              {lang === 'uk' ? 'Залишити красивий' : 'Оставить красивый'}
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {screen === 'welcome' && (
          <WelcomePage
            key="welcome"
            onStart={() => setScreen('home')}
            onOpenBlog={() => setScreen('blog')}
            lang={lang}
            setLang={handleSetLang}
            favorites={favorites}
          />
        )}

        {screen === 'home' && (
          <HomePage
            key="home"
            onBack={() => setScreen('welcome')}
            onOpenBlog={() => setScreen('blog')}
            lang={lang}
            setLang={handleSetLang}
            favorites={favorites}
          />
        )}

        {screen === 'blog' && (
          <BlogPage
            key="blog"
            onBack={() => setScreen('home')}
            lang={lang}
            isFavorite={favorites.some((f) => f.id === 'blog-orvard')}
            onToggleFavorite={() =>
              toggleFavorite({
                id: 'blog-orvard',
                type: 'blog',
                imagePng: '/blog-hero.png',
              })
            }
            // ── избранные статьи ──────────────────────────────────
            favoriteArticleIds={favorites
              .filter((f) => f.type === 'article')
              .map((f) => f.id)}
            onToggleArticleFavorite={(articleId, cover) =>
              toggleFavorite({
                id: articleId,
                type: 'article',
                imagePng: cover || `/${articleId}.png`,
              })
            }
          />
        )}
      </AnimatePresence>
    </div>
  )
  }
