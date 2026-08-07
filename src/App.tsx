import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

import { WelcomePage } from './pages/WelcomePage'
import { HomePage } from './pages/HomePage'
import { BlogPage } from './pages/BlogPage'

declare global {
  interface Window {
    Telegram?: { WebApp: any }
  }
}

export type Screen = 'welcome' | 'home' | 'blog'
export type Lang = 'ru' | 'uk'

// ДОБАВЛЕНО: Масштабируемая структура типов избранного
export type FavoriteType = 'blog' | 'article'

export interface FavoriteItem {
  id: string
  type: FavoriteType
  imagePng: string // Путь к картинке вместо эмодзи
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

  // ДОБАВЛЕНО: Теперь храним массив объектов FavoriteItem
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem('cordwainer_favorites')
      if (saved) {
        const parsed = JSON.parse(saved)
        // БЕЗОПАСНОСТЬ: Миграция старых данных (строк) в новые объекты, чтобы приложение не падало
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
          return parsed.map((id: string) => ({
            id,
            type: id.includes('blog') ? 'blog' : 'article',
            imagePng: id.includes('blog') ? '/blog-hero.png' : `/${id}.png` // Автоподстановка
          }))
        }
        return parsed
      }
      return []
    } catch {
      return []
    }
  })

  const handleSetLang = (next: Lang) => {
    setLang(next)
    try {
      localStorage.setItem('cordwainer_lang', next)
    } catch {}
  }

  // ОБНОВЛЕНО: Функция принимает объект целиком
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

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)] font-body tg-safe">
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
            // ОБНОВЛЕНО: Проверяем наличие по id
            isFavorite={favorites.some((f) => f.id === 'blog-orvard')}
            // ОБНОВЛЕНО: Передаем готовый объект со всеми параметрами (на будущее)
            onToggleFavorite={() =>
              toggleFavorite({
                id: 'blog-orvard',
                type: 'blog',
                imagePng: '/blog-hero.png', // Используем обложку блога в качестве иконки
              })
            }
          />
        )}
      </AnimatePresence>
    </div>
  )
}
