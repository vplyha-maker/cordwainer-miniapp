import { AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'

import { WelcomePage } from './pages/WelcomePage'
import { HomePage } from './pages/HomePage'
import { BlogPage } from './pages/BlogPage'
import { CalcMenuPage } from './pages/CalcMenuPage'
import { SizeCalcPage } from './pages/SizeCalcPage'
import { WidthCalcPage } from './pages/WidthCalcPage'
import { HeelCalcPage } from './pages/HeelCalcPage'
import { ColorCalcPage } from './pages/ColorCalcPage'

import { loadAllPigments } from './data/loadPigments'
import { applyPigmentTheme } from './theme/pigmentTheme'
import type { Pigment } from './data/pigments'

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

export type Screen =
  | 'welcome'
  | 'home'
  | 'blog'
  | 'calc-menu'
  | 'size-calc'
  | 'width-calc'
  | 'heel-calc'
  | 'color-calc'

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
  const [pendingArticleId, setPendingArticleId] = useState<string | null>(null)
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)

  // Зберігаємо пігменти, щоб перезастосовувати тему при зміні day/night
  const pigmentsRef = useRef<Pigment[]>([])

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

  // === 1. Завантаження пігментів ===
  useEffect(() => {
    loadAllPigments()
      .then((loaded) => {
        pigmentsRef.current = loaded

        const tg = window.Telegram?.WebApp
        const isDark = tg ? tg.colorScheme === 'dark' : true
        applyPigmentTheme(loaded, isDark)
      })
      .catch((err) => {
        console.error('Failed to load pigments for theme:', err)
      })
  }, [])

  // === 2. Telegram theme + перемикання день/ніч ===
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return

    tg.ready()
    tg.expand()

    const applyTheme = () => {
      const isDark = tg.colorScheme === 'dark'

      // Якщо пігменти вже завантажені — застосовуємо тему з них
      if (pigmentsRef.current.length > 0) {
        applyPigmentTheme(pigmentsRef.current, isDark)
      } else {
        // Fallback, поки пігменти ще вантажаться
        document.documentElement.classList.toggle('dark', isDark)
        try {
          if (isDark) {
            tg.setHeaderColor('#1C1816')
            tg.setBackgroundColor('#1C1816')
          } else {
            tg.setHeaderColor('#F5F1EA')
            tg.setBackgroundColor('#F5F1EA')
          }
        } catch {}
      }
    }

    applyTheme()
    tg.onEvent('themeChanged', applyTheme)

    return () => {
      tg.offEvent('themeChanged', applyTheme)
    }
  }, [])

  // === 3. Performance mode ===
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
            onOpenCalcMenu={() => setScreen('calc-menu')}
            lang={lang}
            setLang={handleSetLang}
            favorites={favorites}
            onOpenArticle={(articleId) => {
              setPendingArticleId(articleId)
              setShowOnlyFavorites(false)
              setScreen('blog')
            }}
            onOpenFavorites={() => {
              setPendingArticleId(null)
              setShowOnlyFavorites(true)
              setScreen('blog')
            }}
          />
        )}

        {screen === 'blog' && (
          <BlogPage
            key="blog"
            onBack={() => {
              setPendingArticleId(null)
              setShowOnlyFavorites(false)
              setScreen('home')
            }}
            lang={lang}
            isFavorite={favorites.some((f) => f.id === 'blog-orvard')}
            onToggleFavorite={() =>
              toggleFavorite({
                id: 'blog-orvard',
                type: 'blog',
                imagePng: '/blog-hero.png',
              })
            }
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
            initialArticleId={pendingArticleId}
            onArticleOpened={() => setPendingArticleId(null)}
            initialShowFavorites={showOnlyFavorites}
          />
        )}

        {screen === 'calc-menu' && (
          <CalcMenuPage
            key="calc-menu"
            lang={lang}
            onBack={() => setScreen('home')}
            onOpenSizeCalc={() => setScreen('size-calc')}
            onOpenWidthCalc={() => setScreen('width-calc')}
            onOpenHeelCalc={() => setScreen('heel-calc')}
            onOpenColorCalc={() => setScreen('color-calc')}
          />
        )}

        {screen === 'size-calc' && (
          <SizeCalcPage
            key="size-calc"
            lang={lang}
            onBack={() => setScreen('calc-menu')}
          />
        )}

        {screen === 'width-calc' && (
          <WidthCalcPage
            key="width-calc"
            lang={lang}
            onBack={() => setScreen('calc-menu')}
          />
        )}

        {screen === 'heel-calc' && (
          <HeelCalcPage
            key="heel-calc"
            lang={lang}
            onBack={() => setScreen('calc-menu')}
          />
        )}

        {screen === 'color-calc' && (
          <ColorCalcPage
            key="color-calc"
            lang={lang}
            onBack={() => setScreen('calc-menu')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
