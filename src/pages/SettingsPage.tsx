import { useState, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'
import { applyImmediateMutedTheme } from '../App'
import { getSavedPerfMode, savePerfMode, applyPerfMode } from '../lib/performance'

type SettingsPageProps = {
  lang: Lang
  setLang: (lang: Lang) => void
  onChangeTab: (tab: 'search' | 'settings' | 'profile') => void
  onBack?: () => void
}

type FontMode = 'classic' | 'system'
type FontSize = 'small' | 'medium' | 'large'

function haptic(kind: 'light' | 'medium' = 'light') {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(kind)
  } catch {}
}

function applyFontMode(mode: FontMode) {
  const root = document.documentElement
  if (mode === 'system') {
    root.style.setProperty('--font-display', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
    root.style.setProperty('--font-body', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
  } else {
    root.style.setProperty('--font-display', '"Playfair Display", "Times New Roman", serif')
    root.style.setProperty('--font-body', '"Inter", system-ui, -apple-system, sans-serif')
  }
}

function applyFontSize(size: FontSize) {
  const root = document.documentElement
  const scale = size === 'small' ? '0.94' : size === 'large' ? '1.07' : '1'
  root.style.setProperty('--font-scale', scale)
  root.style.fontSize = `calc(16px * ${scale})`
}

export function SettingsPage({ lang, setLang, onChangeTab, onBack }: SettingsPageProps) {
  const [graphics, setGraphics] = useState<'full' | 'fast'>('full')
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [isDark, setIsDark] = useState(true)
  const [font, setFont] = useState<FontMode>('classic')
  const [fontSize, setFontSize] = useState<FontSize>('medium')
  const [showWidgetHint, setShowWidgetHint] = useState(false)

  useLayoutEffect(() => {
    // 1. ИСПРАВЛЕНИЕ СКРОЛЛА: Принудительно скроллим в начало при открытии
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

    const savedGraphics = getSavedPerfMode()
    setGraphics(savedGraphics === 'fast' ? 'fast' : 'full')

    const savedTheme = localStorage.getItem('cordwainer_theme')
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme)
      setIsDark(savedTheme === 'dark')
    } else {
      const darkQuery = document.documentElement.classList.contains('dark')
      setTheme(darkQuery ? 'dark' : 'light')
      setIsDark(darkQuery)
    }

    const savedFont = localStorage.getItem('cordwainer_font') as FontMode | null
    if (savedFont === 'classic' || savedFont === 'system') {
      setFont(savedFont)
      applyFontMode(savedFont)
    } else {
      applyFontMode('classic')
    }

    const savedSize = localStorage.getItem('cordwainer_font_size') as FontSize | null
    if (savedSize === 'small' || savedSize === 'medium' || savedSize === 'large') {
      setFontSize(savedSize)
      applyFontSize(savedSize)
    } else {
      applyFontSize('medium')
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

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    haptic('light')
    setTheme(newTheme)
    setIsDark(newTheme === 'dark')
    localStorage.setItem('cordwainer_theme', newTheme)
    applyImmediateMutedTheme(newTheme === 'dark')
  }

  const handleFontChange = (mode: FontMode) => {
    haptic('light')
    setFont(mode)
    localStorage.setItem('cordwainer_font', mode)
    applyFontMode(mode)
  }

  const handleFontSizeChange = (size: FontSize) => {
    haptic('light')
    setFontSize(size)
    localStorage.setItem('cordwainer_font_size', size)
    applyFontSize(size)
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
      language: 'Язык',
      theme: 'Тема',
      themeLight: 'Светлая',
      themeDark: 'Темная',
      font: 'Шрифт',
      fontClassic: 'Изящный',
      fontSystem: 'Строгий',
      fontSize: 'Масштаб',
      sizeSmall: 'Мелкий',
      sizeMedium: 'Стандарт',
      sizeLarge: 'Крупный',
      graphics: 'Графика',
      graphicsHigh: 'Максимум',
      graphicsLow: 'Энергосбережение',
      graphicsDesc: 'Отключение размытия и сложных анимаций для экономии батареи.',
      install: 'Установить',
      installDesc: 'Добавить на главный экран для быстрого доступа без интернета.',
      hintTitle: 'Установка',
      hintText: 'Откройте приложение в браузере (Safari/Chrome) и выберите «На главный экран».',
      close: 'Закрыть',
    },
    uk: {
      title: 'Налаштування',
      language: 'Мова',
      theme: 'Тема',
      themeLight: 'Світла',
      themeDark: 'Темна',
      font: 'Шрифт',
      fontClassic: 'Витончений',
      fontSystem: 'Строгий',
      fontSize: 'Масштаб',
      sizeSmall: 'Дрібний',
      sizeMedium: 'Стандарт',
      sizeLarge: 'Великий',
      graphics: 'Графіка',
      graphicsHigh: 'Максимум',
      graphicsLow: 'Енергозбереження',
      graphicsDesc: 'Вимкнення розмиття та складних анімацій для економії заряду.',
      install: 'Встановити',
      installDesc: 'Додати на головний екран для швидкого доступу без інтернету.',
      hintTitle: 'Встановлення',
      hintText: 'Відкрийте застосунок у браузері та оберіть «На головний екран».',
      close: 'Закрити',
    },
    de: {
      title: 'Einstellungen',
      language: 'Sprache',
      theme: 'Design',
      themeLight: 'Hell',
      themeDark: 'Dunkel',
      font: 'Schriftart',
      fontClassic: 'Elegant',
      fontSystem: 'Streng',
      fontSize: 'Maßstab',
      sizeSmall: 'Klein',
      sizeMedium: 'Standard',
      sizeLarge: 'Groß',
      graphics: 'Grafik',
      graphicsHigh: 'Maximum',
      graphicsLow: 'Sparmodus',
      graphicsDesc: 'Deaktiviert Unschärfe und komplexe Animationen, um Akku zu sparen.',
      install: 'Installieren',
      installDesc: 'Zum Startbildschirm hinzufügen für schnellen Offline-Zugriff.',
      hintTitle: 'Installation',
      hintText: 'Öffnen Sie die App im Browser und wählen Sie „Zum Startbildschirm hinzufügen“.',
      close: 'Schließen',
    },
  }[lang]

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'

  const renderOptionGroup = (
    title: string, 
    options: { label: string; value: string }[], 
    currentValue: string, 
    onChange: (val: any) => void, 
    delay: string,
    desc?: string
  ) => (
    <div className={`stagger-item border-b ${cLine} py-8`} style={{ animationDelay: delay }}>
      <p className={`text-[9px] font-sans font-medium uppercase tracking-[0.3em] mb-6 ${cTextMuted}`}>
        {title}
      </p>
      <div className="flex flex-col gap-5">
        {options.map((opt) => {
          const isActive = currentValue === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="group flex items-center gap-6 text-left transition-all active:opacity-50"
            >
              <span className={`text-[9px] font-sans tracking-[0.2em] transition-opacity w-6 ${isActive ? 'opacity-100' : 'opacity-20'}`}>
                {isActive ? '—' : ''}
              </span>
              <span 
                className={`font-serif text-[6.5vw] min-[375px]:text-3xl transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isActive 
                    ? 'italic opacity-100 translate-x-2' 
                    : 'opacity-30 group-hover:opacity-70'
                }`}
              >
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
      {desc && (
        <p className={`mt-8 text-[10px] font-sans uppercase tracking-[0.15em] leading-[1.6] max-w-[85%] ${cTextMuted}`}>
          {desc}
        </p>
      )}
    </div>
  )

  return (
    <div className={`relative min-h-[100dvh] w-full transition-colors duration-[1.5s] ${cBg} ${cText}`}>
      
      <style>{`
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .stagger-item {
          opacity: 0;
          animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* HEADER */}
      <header className="px-6 pt-8 pb-4 flex items-start justify-between z-20">
        <button 
          onClick={onBack || (() => onChangeTab('search'))} 
          className={`group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] ${cTextMuted} ${cHover} transition-colors`}
        >
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <div className="px-6 pb-24">
        
        {/* 2. ИСПРАВЛЕНИЕ ЗАГОЛОВКА: Убран vw, задан фиксированный изящный размер и добавлены отступы */}
        <div className="stagger-item mt-2 mb-12" style={{ animationDelay: '0.1s' }}>
          <h1 className="font-serif text-5xl min-[400px]:text-6xl leading-[0.95] tracking-tight">
            {t.title}
          </h1>
        </div>

        {renderOptionGroup(
          t.language,
          [
            { label: 'Русский', value: 'ru' },
            { label: 'Українська', value: 'uk' },
            { label: 'Deutsch', value: 'de' }
          ],
          lang,
          handleLangChange,
          '0.15s'
        )}

        {renderOptionGroup(
          t.theme,
          [
            { label: t.themeLight, value: 'light' },
            { label: t.themeDark, value: 'dark' }
          ],
          theme,
          handleThemeChange,
          '0.2s'
        )}

        {renderOptionGroup(
          t.font,
          [
            { label: t.fontClassic, value: 'classic' },
            { label: t.fontSystem, value: 'system' }
          ],
          font,
          handleFontChange,
          '0.25s'
        )}

        {renderOptionGroup(
          t.fontSize,
          [
            { label: t.sizeSmall, value: 'small' },
            { label: t.sizeMedium, value: 'medium' },
            { label: t.sizeLarge, value: 'large' }
          ],
          fontSize,
          handleFontSizeChange,
          '0.3s'
        )}

        {renderOptionGroup(
          t.graphics,
          [
            { label: t.graphicsHigh, value: 'full' },
            { label: t.graphicsLow, value: 'fast' }
          ],
          graphics,
          handleGraphicsChange,
          '0.35s',
          t.graphicsDesc
        )}

        <div className="stagger-item py-12" style={{ animationDelay: '0.4s' }}>
          <button 
            onClick={handleAddToHome} 
            className={`w-full p-8 border text-left transition-colors active:bg-current/5 ${cLine}`}
          >
            <div className="font-serif text-[7vw] min-[375px]:text-3xl mb-4">{t.install}</div>
            <div className={`text-[10px] font-sans uppercase tracking-[0.2em] leading-relaxed max-w-[85%] ${cTextMuted}`}>
              {t.installDesc}
            </div>
          </button>
        </div>

      </div>

      <AnimatePresence>
        {showWidgetHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            onClick={() => setShowWidgetHint(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm p-8 border shadow-2xl ${isDark ? 'bg-[#0A0A0A] border-white/10' : 'bg-[#F2EFE9] border-black/10'}`}
            >
              <h3 className="font-serif text-2xl mb-4 text-center">{t.hintTitle}</h3>
              <p className={`text-[10px] font-sans uppercase tracking-[0.2em] text-center leading-[1.8] mb-8 ${cTextMuted}`}>
                {t.hintText}
              </p>
              <button
                onClick={() => setShowWidgetHint(false)}
                className={`w-full py-4 border text-[10px] font-sans uppercase tracking-[0.3em] transition-colors ${
                  isDark 
                    ? 'border-white/20 hover:bg-white hover:text-black' 
                    : 'border-black/20 hover:bg-black hover:text-white'
                }`}
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
