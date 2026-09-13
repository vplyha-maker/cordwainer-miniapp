import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'
import type { Lang } from '../App'
import { getSavedPerfMode, savePerfMode, applyPerfMode } from '../lib/performance'

type SettingsPageProps = {
  lang: Lang
  setLang: (lang: Lang) => void
  onChangeTab: (tab: 'search' | 'settings' | 'profile') => void
  // ДОБАВЛЕНО: свойство для кнопки "Назад"
  onBack?: () => void
}

function haptic(kind: 'light' | 'medium' = 'light') {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(kind)
  } catch {}
}

export function SettingsPage({ lang, setLang, onChangeTab, onBack }: SettingsPageProps) {
  const [graphics, setGraphics] = useState<'full' | 'fast'>('full')
  const [showWidgetHint, setShowWidgetHint] = useState(false)

  useEffect(() => {
    const saved = getSavedPerfMode()
    if (saved === 'fast') {
      setGraphics('fast')
    } else {
      setGraphics('full')
    }
  }, [])

  const handleLangChange = (newLang: Lang) => {
    haptic('light')
    localStorage.setItem('app_lang', newLang)
    localStorage.setItem('cordwainer_lang', newLang)
    setLang(newLang)
  }

  const handleGraphicsChange = (mode: 'full' | 'fast') => {
    haptic('light')
    setGraphics(mode)
    savePerfMode(mode)
    applyPerfMode(mode)
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
      
      {/* ШАПКА С КНОПКОЙ НАЗАД */}
      <div className="px-5 pt-12 pb-6 border-b border-white/10 flex items-start justify-between">
        <div>
          <h1 className="font-display text-[2rem] leading-none mb-1">{t.title}</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-50">Cordwainer</p>
        </div>
        
        <button
          onClick={onBack || (() => onChangeTab('search'))}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 active:scale-90 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="px-5 py-6 space-y-10">
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

        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-4">
            {t.graphics}
          </h2>
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-3">
            <button
              onClick={() => handleGraphicsChange('full')}
              className={`flex-1 py-3 text-[11px] font-bold tracking-widest uppercase rounded-lg transition-all ${
                graphics === 'full' ? 'bg-[#D8A35C] text-black shadow-[0_0_15px_rgba(216,163,92,0.4)]' : 'text-white/60 hover:text-white'
              }`}
            >
              {t.graphicsHigh}
            </button>
            <button
              onClick={() => handleGraphicsChange('fast')}
              className={`flex-1 py-3 text-[11px] font-bold tracking-widest uppercase rounded-lg transition-all ${
                graphics === 'fast' ? 'bg-white/90 text-black shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              {t.graphicsLow}
            </button>
          </div>
          <p className="text-[11px] font-light opacity-50 leading-relaxed px-1">
            {t.graphicsDesc}
          </p>
        </section>

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
