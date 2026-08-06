import { useEffect, useState } from 'react'
import { WelcomePage } from './pages/WelcomePage'
import { HomePage } from './pages/HomePage'

declare global {
  interface Window {
    Telegram?: { WebApp: any }
  }
}

type Screen = 'welcome' | 'home'

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome')

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
    <div className="min-h-full bg-[var(--color-bg)] text-[var(--color-ink)] font-body tg-safe">
      {screen === 'welcome' && (
        <WelcomePage onStart={() => setScreen('home')} />
      )}
      {screen === 'home' && (
        <HomePage onBack={() => setScreen('welcome')} />
      )}
    </div>
  )
}
