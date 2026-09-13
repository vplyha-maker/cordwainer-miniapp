import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'
import type { Lang } from '../App'

type SettingsPageProps = {
  lang: Lang
  setLang: (lang: Lang) => void
  onChangeTab: (tab: 'search' | 'settings' | 'profile') => void
}

function haptic(kind: 'light' | 'medium' = 'light') {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(kind)
  } catch {}
}

export function SettingsPage({ lang, setLang, onChangeTab }: SettingsPageProps) {
  const [graphics, setGraphics] = useState<'high' | 'low'>('high')
  const [showWidgetHint, setShowWidgetHint] = useState(false)

  useEffect(() => {
    const savedGraphics = localStorage.getItem('cordwainer_graphics') as 'high' | 'low'
    if (savedGraphics) setGraphics(savedGraphics)
  }, [])

  const handleLangChange = (newLang: Lang) => {
    haptic('light')
    localStorage.setItem('app_lang', newLang)
    localStorage.setItem('cordwainer_lang', newLang)
    setLang(newLang)
  }

  const handleGraphicsChange = (mode: 'high' | 'low') => {
    haptic('light')
    setGraphics(mode)
    localStorage.setItem('cordwainer_graphics', mode)
    // Здесь можно глобально отключать блюр или анимации, добавив класс на body
    if (mode === 'low') {
      document.documentElement.classList.add('low-graphics')
    } else {
      document.documentElement.classList.remove('low-graphics')
    }
  }

  const handleAddToHome = async () => {
    haptic('medium')
    const deferredPrompt = (window as any).deferredPrompt
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          ;(window as any).deferredPrompt = null
          return
        }
      } catch {}
    }
    setShowWidgetHint(true)
  }

  const t = {
    ru: {
      title: 'Настройки',
      language: 'Язык интерфейса',
      graphics: 'Качество графики',
      graphicsHigh: 'Высокое',
      graphicsLow: 'Производительность',
      graphicsDesc: 'Отключение размытия и сложных анимаций для экономии батареи.',
      install: 'Установить приложение',
      installDesc: 'Добавить на главный экран для быстрого доступа без интернета.',
      hintTitle: 'Установка',
      hintText: 'Откройте приложение в браузере (Safari/Chrome) и выберите «На главный экран».',
      close: 'Закрыть',
    },
    uk: {
      title: 'Налаштування',
      language: 'Мова інтерфейсу',
      graphics: 'Якість графіки',
      graphicsHigh: 'Висока',
      graphicsLow: 'Продуктивність',
      graphicsDesc: 'Вимкнення розмиття та складних анімацій для економії заряду.',
      install: 'Встановити застосунок',
      installDesc: 'Додати на головний екран для швидкого доступу без інтернету.',
      hintTitle: 'Встановлення',
      hintText: 'Відкрийте застосунок у браузері та оберіть «На головний екран».',
      close: 'Закрити',
    },
    de: {
      title: 'Einstellungen',
      language: 'Sprache',
      graphics: 'Grafikqualität',
      graphicsHigh: 'Hoch',
      graphicsLow: 'Leistung',
      graphicsDesc: 'Deaktiviert Unschärfe und komplexe Animationen, um Akku zu sparen.',
      install: 'App installieren',
      installDesc: 'Zum Startbildschirm hinzufügen für schnellen Offline-Zugriff.',
      hintTitle: 'Installation',
      hintText: 'Öffnen Sie die App im Browser und wählen Sie „Zum Startbildschirm hinzufügen“.',
      close: 'Schließen',
    },
  }[lang]

  return (
    <div className="relative min-h-[100dvh] bg-[#111] text-[#F5F1EA] pb-[120px]">
      {/* Шапка */}
      <div className="px-5 pt-12 pb-6 border-b border-white/10">
        <h1 className="font-display text-[2rem] leading-none mb-1">{t.title}</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] opacity-50">Cordwainer</p>
      </div>

      <div className="px-5 py-6 space-y-10">
        
        {/* Язык */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-4">
            {t.language}
          </h2>
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
            {(['ru', 'uk', 'de'] as const).map((l) => (
              <button
                key={l}
                onClick={() => handleLangChange(l)}
                className={`flex-1 py-3 text-[11px] font-bold tracking-widest uppercase rounded-lg transition-all ${
                  lang === l ? 'bg-white/90 text-black shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                {l === 'uk' ? 'UKR' : l}
              </button>
            ))}
          </div>
        </section>

        {/* Графика */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-4">
            {t.graphics}
          </h2>
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-3">
            <button
              onClick={() => handleGraphicsChange('high')}
              className={`flex-1 py-3 text-[11px] font-bold tracking-widest uppercase rounded-lg transition-all ${
                graphics === 'high' ? 'bg-[#D8A35C] text-black shadow-[0_0_15px_rgba(216,163,92,0.4)]' : 'text-white/60 hover:text-white'
              }`}
            >
              {t.graphicsHigh}
            </button>
            <button
              onClick={() => handleGraphicsChange('low')}
              className={`flex-1 py-3 text-[11px] font-bold tracking-widest uppercase rounded-lg transition-all ${
                graphics === 'low' ? 'bg-white/90 text-black shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              {t.graphicsLow}
            </button>
          </div>
          <p className="text-[11px] font-light opacity-50 leading-relaxed px-1">
            {t.graphicsDesc}
          </p>
        </section>

        {/* PWA Установка */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-4">
            Приложение
          </h2>
          <button
            onClick={handleAddToHome}
            className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 active:scale-95 transition-transform flex items-center justify-between"
          >
            <div>
              <div className="text-[14px] font-medium mb-1">{t.install}</div>
              <div className="text-[11px] font-light opacity-50 leading-relaxed max-w-[240px]">
                {t.installDesc}
              </div>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D8A35C" strokeWidth="1.5" className="opacity-80">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </section>

      </div>

      <BottomDock active="settings" lang={lang} onChange={onChangeTab} />

      {/* Модалка инструкции установки */}
      <AnimatePresence>
        {showWidgetHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-6"
            onClick={() => setShowWidgetHint(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-[#1A1816] border border-white/10 p-5 rounded-2xl shadow-2xl"
            >
              <h3 className="text-[16px] font-medium mb-2 text-[#D8A35C]">{t.hintTitle}</h3>
              <p className="text-[13px] font-light opacity-70 mb-5 leading-relaxed">{t.hintText}</p>
              <button
                onClick={() => setShowWidgetHint(false)}
                className="w-full py-3 rounded-xl bg-white/10 active:bg-white/20 transition-colors text-[11px] font-bold uppercase tracking-widest"
              >
                {t.close}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

