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

type Screen = 'welcome' | 'home' | 'blog'
export type Lang = 'ru' | 'uk'

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

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cordwainer_favorites')
      return saved ? JSON.parse(saved) : []
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

  // Функция переключения (добавление / удаление) с тактильным откликом
  const toggleFavorite = (id: string) => {
    try {
      // Легкая вибрация при клике (нативный Telegram Haptic)
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
    } catch {}

    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
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
            onOpenBlog={() => setScreen('blog')} // Добавлено: передаем функцию открытия блога
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
            favorites={favorites} // Добавлено: передаем избранное в меню
          />
        )}
        {screen === 'blog' && (
          <BlogPage
            key="blog"
            onBack={() => setScreen('home')}
            lang={lang}
            isFavorite={favorites.includes('blog-orvard')}
            onToggleFavorite={() => toggleFavorite('blog-orvard')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
