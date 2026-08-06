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
    if (tg) {
      tg.ready()
      tg.expand()
      try {
        tg.setHeaderColor('#F8F4EE')
        tg.setBackgroundColor('#F8F4EE')
      } catch {}
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
