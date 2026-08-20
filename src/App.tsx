import { AnimatePresence } from 'framer-motion'
import { useEffect, useLayoutEffect, useState, useRef } from 'react'

import { WelcomePage } from './pages/WelcomePage'
import { HomePage } from './pages/HomePage'
import { BlogPage } from './pages/BlogPage'
import { CalcMenuPage } from './pages/CalcMenuPage'
import { SizeCalcPage } from './pages/SizeCalcPage'
import { WidthCalcPage } from './pages/WidthCalcPage'
import { HeelCalcPage } from './pages/HeelCalcPage'
import { ColorCalcPage } from './pages/ColorCalcPage'
import { ColorsPage } from './pages/ColorsPage'   // ← новый импорт

import { loadThemePigments, loadAllPigments } from './data/loadPigments'
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
  | 'colors'          // ← новый экран

export type Lang = 'ru' | 'uk'

export type FavoriteType = 'blog' | 'article'

export interface FavoriteItem {
  id: string
  type: FavoriteType
  imagePng: string
}

/** 
 * Вспомогательная функция определения темной темы.
 * Жестко фиксируем темную тему для браузера.
 */
function getIsDarkTheme(): boolean {
  const tg = window.Telegram?.WebApp
  // Проверяем наличие initData. Если она не пустая — мы в реальном Telegram.
  const isRealTelegram = Boolean(tg?.initData && tg.initData.trim().length > 0)
  
  if (isRealTelegram) {
    return tg?.colorScheme === 'dark'
  }
  
  // В браузере ВСЕГДА возвращаем true (темная тема)
  return true
}

/** Мгновенный приглушённый fallback (до загрузки спектров) */
function applyImmediateMutedTheme(isDark: boolean) {
  const root = document.documentElement

  if (isDark) {
    root.classList.add('dark')
    root.classList.remove('light')
    root.style.setProperty('--color-bg', '#1C1816')
    root.style.setProperty('--color-surface', '#25201C')
    root.style.setProperty('--color-surface-2', '#2F2924')
    root.style.setProperty('--color-ink', '#F5F1EA')
    root.style.setProperty('--color-muted', '#B9ACA0')
    root.style.setProperty('--color-accent', '#E4D00A')
    root.style.setProperty('--color-accent-strong', '#E34234')
    root.style.setProperty('--color-danger', '#8B0000')
    root.style.setProperty('--color-border', 'rgba(255,255,255,0.12)')
    root.style.setProperty('--color-info', '#1034A6')
    root.style.setProperty('--color-success', '#0BDA51')
    root.style.setProperty('--pigment-lac-dye', '#8B0000')
    root.style.setProperty('--pigment-egyptian-blue', '#1034A6')
    root.style.setProperty('--pigment-orpiment', '#E4D00A')
    root.style.setProperty('--pigment-realgar', '#E34234')
    root.style.setProperty('--pigment-malachite', '#0BDA51')
    root.style.setProperty('--pigment-azurite', '#007FFF')
    root.style.setProperty('--pigment-lead-white', '#F5F1EA')
    root.style.setProperty('--pigment-bone-black', '#1C1816')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
    root.style.setProperty('--color-bg', '#F5F1EA')
    root.style.setProperty('--color-surface', '#F0EBE3')
    root.style.setProperty('--color-surface-2', '#E8E2D9')
    root.style.setProperty('--color-ink', '#1C1816')
    root.style.setProperty('--color-muted', '#6B5E54')
    root.style.setProperty('--color-accent', '#A52A2A')
    root.style.setProperty('--color-accent-strong', '#E34234')
    root.style.setProperty('--color-danger', '#8B0000')
    root.style.setProperty('--color-border', 'rgba(0,0,0,0.12)')
    root.style.setProperty('--color-info', '#1034A6')
    root.style.setProperty('--color-success', '#0BDA51')
    root.style.setProperty('--pigment-lac-dye', '#8B0000')
    root.style.setProperty('--pigment-egyptian-blue', '#1034A6')
    root.style.setProperty('--pigment-orpiment', '#E4D00A')
    root.style.setProperty('--pigment-realgar', '#E34234')
    root.style.setProperty('--pigment-malachite', '#0BDA51')
    root.style.setProperty('--pigment-azurite', '#007FFF')
    root.style.setProperty('--pigment-lead-white', '#F5F1EA')
    root.style.setProperty('--pigment-bone-black', '#1C1816')
  }
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

  // === 0. Мгновенный fallback (до первой отрисовки) ===
  useLayoutEffect(() => {
    const isDark = getIsDarkTheme()
    applyImmediateMutedTheme(isDark)

    const tg = window.Telegram?.WebApp
    try {
      if (tg) {
        const bg = isDark ? '#1C1816' : '#F5F1EA'
        tg.setHeaderColor(bg)
        tg.setBackgroundColor(bg)
      }
    } catch {}
  }, [])

  // === 1. Загрузка пигментов (сначала тема — быстро) ===
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const themePigments = await loadThemePigments()
        if (cancelled) return

        pigmentsRef.current = themePigments

        const isDark = getIsDarkTheme()
        applyPigmentTheme(themePigments, isDark)

        const all = await loadAllPigments()
        if (cancelled) return
        pigmentsRef.current = all
      } catch (err) {
        console.error('Failed to load pigments for theme:', err)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  // === 2. Telegram theme + переключение день/ночь ===
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return

    tg.ready()
    tg.expand()

    const applyTheme = () => {
      const isDark = getIsDarkTheme()

      if (pigmentsRef.current.length > 0) {
        applyPigmentTheme(pigmentsRef.current, isDark)
      } else {
        applyImmediateMutedTheme(isDark)
      }
      
      // ВАЖНО: Всегда обновляем цвета самого приложения Telegram (даже если пигменты загружены)
      try {
        const bg = isDark ? '#1C1816' : '#F5F1EA'
        tg.setHeaderColor(bg)
        tg.setBackgroundColor(bg)
      } catch {}
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
    <div className="app-shell min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)] font-body tg-safe">
      {showPerfHint && (
        <div
          className="fixed top-3 left-3 right-3 z-[100] rounded-2xl px-3.5 py-3 text-[12px] text-[#F5F1EB] max-w-[var(--app-max-width)] mx-auto"
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
            onOpenColors={() => setScreen('colors')}   // ← новый проп
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

        {/* === Новый экран Цвета и отделка === */}
        {screen === 'colors' && (
          <ColorsPage
            key="colors"
            onBack={() => setScreen('home')}
            lang={lang}
            setLang={handleSetLang}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
