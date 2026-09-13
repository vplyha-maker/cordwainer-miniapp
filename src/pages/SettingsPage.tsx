import { useState, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'
import type { Lang } from '../App'
import { getSavedPerfMode, savePerfMode, applyPerfMode } from '../lib/performance'

type SettingsPageProps = {
  lang: Lang
  setLang: (lang: Lang) => void
  onChangeTab: (tab: 'search' | 'settings' | 'profile') => void
  onBack?: () => void
}

function haptic(kind: 'light' | 'medium' = 'light') {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(kind)
  } catch {}
}

export function SettingsPage({ lang, setLang, onChangeTab, onBack }: SettingsPageProps) {
  const [graphics, setGraphics] = useState<'full' | 'fast'>('full')
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [showWidgetHint, setShowWidgetHint] = useState(false)

  // Инициализация
  useLayoutEffect(() => {
    // 1. Графика
    const savedGraphics = getSavedPerfMode()
    setGraphics(savedGraphics === 'fast' ? 'fast' : 'full')

    // 2. Тема (проверяем, что сейчас установлено на html)
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
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

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    haptic('light')
    setTheme(newTheme)
    
    // Сохраняем выбор пользователя, чтобы App.tsx мог его подхватить при старте
    localStorage.setItem('cordwainer_theme', newTheme)

    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }

    // Обновляем шапку Telegram
    try {
      const tg = window.Telegram?.WebApp
      if (tg) {
        const bg = newTheme === 'dark' ? '#151210' : '#F5F1EA'
        tg.setHeaderColor(bg)
        tg.setBackgroundColor(bg)
      }
    } catch {}
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
      theme: 'Оформление',
      themeLight: 'Светлое',
      themeDark: 'Темное',
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
      theme: 'Оформлення',
      themeLight: 'Світле',
      themeDark: 'Темне',
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
      theme: 'Erscheinungsbild',
      themeLight: 'Hell',
      themeDark: 'Dunkel',
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
    <div className="relative min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)] pb-[120px] transition-colors duration-300">
      
      {/* ШАПКА */}
      <div className="px-5 pt-12 pb-6 border-b border-[var(--color-border)] flex items-start justify-between">
        <div>
          <h1 className="font-display text-[2rem] leading-none mb-1 text-[var(--color-ink)]">{t.title}</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Cordwainer</p>
        </div>
        
        <button
          onClick={onBack || (() => onChangeTab('search'))}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] active:scale-90 transition-transform text-[var(--color-ink)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="px-5 py-6 space-y-8">
        
        {/* ЯЗЫК */}
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted)] mb-3">
            {t.language}
          </h2>
          <div className="flex bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[20px] p-1.5 shadow-sm">
            {(['ru', 'uk', 'de'] as const).map((l) => {
              const isActive = lang === l
              return (
                <button
                  key={l}
                  onClick={() => handleLangChange(l)}
                  className={`flex-1 py-3.5 text-[11px] font-bold tracking-[0.15em] uppercase rounded-[14px] transition-all ${
                    isActive 
                      ? 'bg-[var(--color-ink)] text-[var(--color-bg)] shadow-md' 
                      : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {l === 'uk' ? 'UKR' : l}
                </button>
              )
            })}
          </div>
        </section>

        {/* ТЕМА */}
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted)] mb-3">
            {t.theme}
          </h2>
          <div className="flex bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[20px] p-1.5 shadow-sm">
            <button
              onClick={() => handleThemeChange('dark')}
              className={`flex-1 py-3.5 text-[11px] font-bold tracking-[0.15em] uppercase rounded-[14px] transition-all ${
                theme === 'dark' 
                  ? 'bg-[var(--color-ink)] text-[var(--color-bg)] shadow-md' 
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {t.themeDark}
            </button>
            <button
              onClick={() => handleThemeChange('light')}
              className={`flex-1 py-3.5 text-[11px] font-bold tracking-[0.15em] uppercase rounded-[14px] transition-all ${
                theme === 'light' 
                  ? 'bg-[var(--color-ink)] text-[var(--color-bg)] shadow-md' 
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {t.themeLight}
            </button>
          </div>
        </section>

        {/* ГРАФИКА */}
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted)] mb-3">
            {t.graphics}
          </h2>
          <div className="flex bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[20px] p-1.5 shadow-sm mb-3">
            <button
              onClick={() => handleGraphicsChange('full')}
              className={`flex-1 py-3.5 text-[11px] font-bold tracking-[0.15em] uppercase rounded-[14px] transition-all ${
                graphics === 'full' 
                  ? 'bg-[var(--color-ink)] text-[var(--color-bg)] shadow-md' 
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {t.graphicsHigh}
            </button>
            <button
              onClick={() => handleGraphicsChange('fast')}
              className={`flex-1 py-3.5 text-[11px] font-bold tracking-[0.15em] uppercase rounded-[14px] transition-all ${
                graphics === 'fast' 
                  ? 'bg-[var(--color-ink)] text-[var(--color-bg)] shadow-md' 
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {t.graphicsLow}
            </button>
          </div>
          <p className="text-[11px] font-medium text-[var(--color-muted)] leading-relaxed px-1">
            {t.graphicsDesc}
          </p>
        </section>

        {/* PWA УСТАНОВКА */}
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted)] mb-3">
            Cordwainer App
          </h2>
          <button
            onClick={handleAddToHome}
            className="w-full text-left p-5 rounded-[20px] bg-[var(--color-surface)] border border-[var(--color-border)] active:scale-[0.98] transition-transform flex items-center justify-between shadow-sm"
          >
            <div>
              <div className="text-[14px] font-bold text-[var(--color-ink)] mb-1">{t.install}</div>
              <div className="text-[11px] font-medium text-[var(--color-muted)] leading-relaxed max-w-[240px]">
                {t.installDesc}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-color-mix(in srgb, var(--color-accent) 15%, transparent) text-[var(--color-accent)] shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
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
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-[var(--color-bg)] border border-[var(--color-border)] p-6 rounded-[24px] shadow-2xl"
            >
              <h3 className="text-[16px] font-bold mb-2 text-[var(--color-ink)]">{t.hintTitle}</h3>
              <p className="text-[13px] font-medium text-[var(--color-muted)] mb-6 leading-relaxed">{t.hintText}</p>
              <button
                onClick={() => setShowWidgetHint(false)}
                className="w-full py-4 rounded-[16px] bg-[var(--color-ink)] text-[var(--color-bg)] active:scale-95 transition-transform text-[11px] font-bold uppercase tracking-widest"
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
