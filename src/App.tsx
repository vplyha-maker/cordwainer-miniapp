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

    // Применяем тему Telegram
    const applyTheme = () => {
      const isDark = tg.colorScheme === 'dark'
      document.documentElement.classList.toggle('dark', isDark)

      try {
        if (isDark) {
          tg.setHeaderColor('#1C1A18')
          tg.setBackgroundColor('#1C1A18')
        } else {
          tg.setHeaderColor('#F8F4EE')
          tg.setBackgroundColor('#F8F4EE')
        }
      } catch {}
    }

    applyTheme()

    // Слушаем смену темы
    tg.onEvent('themeChanged', applyTheme)

    return () => {
      tg.offEvent('themeChanged', applyTheme)
    }
  }, [])

  return (
    <div className="min-h-full bg-cream text-ink font-body tg-safe">
      {screen === 'welcome' && (
        <WelcomePage onStart={() => setScreen('home')} />
      )}
      {screen === 'home' && (
        <HomePage onBack={() => setScreen('welcome')} />
      )}
    </div>
  )
 }
