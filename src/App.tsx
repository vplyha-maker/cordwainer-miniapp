import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

import { WelcomePage } from './pages/WelcomePage'
import { HomePage } from './pages/HomePage'

declare global {
  interface Window {
    Telegram?: { WebApp: any }
  }
}

type Screen = 'welcome' | 'home'
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

  const handleSetLang = (next: Lang) => {
    setLang(next)
    try {
      localStorage.setItem('cordwainer_lang', next)
    } catch {}
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
        {screen === 'welcome' ? (
          <WelcomePage
            key="welcome"
            onStart={() => setScreen('home')}
            lang={lang}
            setLang={handleSetLang}
          />
        ) : (
          <HomePage
            key="home"
            onBack={() => setScreen('welcome')}
            lang={lang}
            setLang={handleSetLang}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
