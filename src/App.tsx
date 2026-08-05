import { useEffect } from 'react'
import { WelcomePage } from './pages/WelcomePage'

declare global {
  interface Window {
    Telegram?: { WebApp: any }
  }
}

export default function App() {
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
      <WelcomePage />
    </div>
  )
}
