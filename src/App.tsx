import { AnimatePresence } from 'framer-motion'
import { useEffect, useLayoutEffect, useState } from 'react'

// Подключаем наш новый провайдер плавного скролла и кастомный курсор
import SmoothScroll from './components/SmoothScroll'
import CustomCursor from './components/CustomCursor'

import { WelcomePage } from './pages/WelcomePage'
import { HomePage } from './pages/HomePage'
import { BlogPage } from './pages/BlogPage'
import { CalcMenuPage } from './pages/CalcMenuPage'
import { SizeCalcPage } from './pages/SizeCalcPage'
import { WidthCalcPage } from './pages/WidthCalcPage'
import { HeelCalcPage } from './pages/HeelCalcPage'
import { ColorCalcPage } from './pages/ColorCalcPage'
import { ColorsPage } from './pages/ColorsPage'
import { ForwardOrthoSEOPage } from './pages/ForwardOrthoSEOPage'
import { GlossaryPage } from './pages/GlossaryPage'
import { PricesPage } from './pages/PricesPage'
import { StylesPage } from './pages/StylesPage'
import { SalaryCalcPage } from './pages/salary' 
import { SettingsPage } from './pages/SettingsPage'

import {
  getSavedPerfMode,
  savePerfMode,
  measureShouldUseFastMode,
  applyPerfMode,
  guessLowPowerDevice,
} from './lib/performance'

declare global {
  interface Window {
    Telegram?: { WebApp: any }
  }
}

export type Screen =
  | 'welcome'
  | 'home'
  | 'blog'
  | 'calc-menu'
  | 'size-calc'
  | 'width-calc'
  | 'heel-calc'
  | 'color-calc'
  | 'salary-calc' 
  | 'colors'
  | 'seo-width'
  | 'glossary'
  | 'prices'
  | 'styles'
  | 'settings'

export type Lang = 'ru' | 'uk' | 'de'
export type FavoriteType = 'blog' | 'article'

export interface FavoriteItem {
  id: string
  type: FavoriteType
  imagePng: string
}

function getIsDarkTheme(): boolean {
  try {
    const savedTheme = localStorage.getItem('cordwainer_theme')
    if (savedTheme === 'dark') return true
    if (savedTheme === 'light') return false
  } catch {}

  const tg = window.Telegram?.WebApp
  const isRealTelegram = Boolean(tg?.initData && tg.initData.trim().length > 0)

  if (isRealTelegram) {
    return tg?.colorScheme === 'dark'
  }
  return true
}

export function applyImmediateMutedTheme(isDark: boolean) {
  const root = document.documentElement

  // Переключаем классы, чтобы стили брались из вашего нового index.css
  if (isDark) {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }

  // Очищаем старые инлайн-цвета, чтобы они не перебивали CSS
  const oldColors = [
    'bg', 'surface', 'surface-2', 'ink', 'muted', 
    'accent', 'accent-strong', 'danger', 'border', 'info', 'success'
  ];
  oldColors.forEach(c => root.style.removeProperty(`--color-${c}`));

  // Оставляем только пигменты для калькулятора цветов (они не влияют на общий дизайн)
  root.style.setProperty('--pigment-lac-dye', '#8B0000')
  root.style.setProperty('--pigment-egyptian-blue', '#1034A6')
  root.style.setProperty('--pigment-orpiment', '#E4D00A')
  root.style.setProperty('--pigment-realgar', '#E34234')
  root.style.setProperty('--pigment-malachite', '#0BDA51')
  root.style.setProperty('--pigment-azurite', '#007FFF')
  root.style.setProperty('--pigment-lead-white', '#F5F1EA')
  root.style.setProperty('--pigment-bone-black', '#1C1816')

  // Синхронизируем цвета фона Telegram с новым монохромом
  try {
    const tg = window.Telegram?.WebApp
    if (tg) {
      const bg = isDark ? '#09090B' : '#F9FAFB'
      tg.setHeaderColor(bg)
      tg.setBackgroundColor(bg)
    }
  } catch {}
}

function normalizeFavoriteImage(src: string): string {
  if (!src) return '/blog-hero.webp'
  return src.replace('/blog-hero.png', '/blog-hero.webp')
}

function getInitialScreen(): Screen {
  try {
    const path = window.location.pathname.replace(/\/+$/, '') || '/'
    if (path === '/forward-ortho-converter') return 'seo-width'
  } catch {}
  return 'welcome'
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(getInitialScreen)
  const [prevMainScreen, setPrevMainScreen] = useState<Screen>('welcome') 
  
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('cordwainer_lang') as Lang
      if (saved && ['ru', 'uk', 'de'].includes(saved)) {
        return saved
      }
      const sysLang = navigator.language.slice(0, 2)
      if (['ru', 'uk', 'de'].includes(sysLang)) {
        return sysLang as Lang
      }
      return 'ru'
    } catch {
      return 'ru'
    }
  })

  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem('cordwainer_favorites')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          return parsed.map((id: string) => ({
            id,
            type: id.includes('blog') ? 'blog' : 'article',
            imagePng: id.includes('blog') ? '/blog-hero.webp' : `/${id}.png`,
          }))
        }
        return (parsed as FavoriteItem[]).map((item) => ({
          ...item,
          imagePng: normalizeFavoriteImage(item.imagePng),
        }))
      }
      return []
    } catch {
      return []
    }
  })

  const [showPerfHint, setShowPerfHint] = useState(false)
  const [pendingArticleId, setPendingArticleId] = useState<string | null>(null)
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [selectedGlossaryTermId, setSelectedGlossaryTermId] = useState<string | null>(null)

  const handleSetLang = (next: Lang) => {
    setLang(next)
    try {
      localStorage.setItem('cordwainer_lang', next)
      localStorage.setItem('app_lang', next)
    } catch {}
  }

  const toggleFavorite = (item: FavoriteItem) => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
    } catch {}

    const normalized: FavoriteItem = {
      ...item,
      imagePng: normalizeFavoriteImage(item.imagePng),
    }

    setFavorites((prev) => {
      const exists = prev.some((fav) => fav.id === normalized.id)
      const next = exists
        ? prev.filter((fav) => fav.id !== normalized.id)
        : [...prev, normalized]

      try {
        localStorage.setItem('cordwainer_favorites', JSON.stringify(next))
      } catch {}

      return next
    })
  }

  useLayoutEffect(() => {
    applyImmediateMutedTheme(getIsDarkTheme())
  }, [])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return

    tg.ready()
    tg.expand()

    const applyTheme = () => {
      applyImmediateMutedTheme(getIsDarkTheme())
    }

    applyTheme()
    tg.onEvent('themeChanged', applyTheme)

    return () => {
      tg.offEvent('themeChanged', applyTheme)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const saved = getSavedPerfMode()
      if (saved === 'fast') { applyPerfMode('fast'); return }
      if (saved === 'full') { applyPerfMode('full'); return }
      if (guessLowPowerDevice()) {
        applyPerfMode('fast')
        if (!cancelled) setShowPerfHint(true)
        return
      }
      const needFast = await measureShouldUseFastMode(1100)
      if (cancelled) return
      if (needFast) {
        applyPerfMode('fast')
        setShowPerfHint(true)
      } else {
        applyPerfMode('full')
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <CustomCursor />
      <SmoothScroll>
        <div className="app-shell min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)] font-body tg-safe transition-colors duration-300">
          {showPerfHint && (
            <div
              className="fixed top-3 left-3 right-3 z-[100] rounded-2xl px-3.5 py-3 text-[12px] text-[#F5F1EB] max-w-[var(--app-max-width)] mx-auto"
              style={{ background: 'rgba(29,24,21,0.96)', border: '1px solid rgba(198,164,122,0.35)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
            >
              <div className="mb-2 leading-snug text-[#B9ACA0]">
                {lang === 'de' ? 'Die Benutzeroberfläche reagiert langsam. Der Schnellmodus wurde aktiviert.' : lang === 'uk' ? 'Інтерфейс працює нерівномірно. Увімкнено швидкий режим.' : 'Интерфейс работает неравномерно. Включён швидкий режим.'}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-xl text-[11px] font-semibold" style={{ background: '#D8A35C', color: '#151210' }} onClick={() => { savePerfMode('fast'); applyPerfMode('fast'); setShowPerfHint(false) }}>OK</button>
                <button className="flex-1 py-2 rounded-xl text-[11px] font-medium text-[#B9ACA0]" style={{ border: '1px solid rgba(185,172,160,0.25)' }} onClick={() => { savePerfMode('full'); applyPerfMode('full'); setShowPerfHint(false) }}>
                  {lang === 'de' ? 'Hohe Qualität beibehalten' : lang === 'uk' ? 'Залишити красивий' : 'Оставить красивый'}
                </button>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {screen === 'welcome' && (
              <WelcomePage
                key="welcome"
                onStart={() => setScreen('home')}
                onOpenBlog={() => setScreen('blog')}
                lang={lang}
                setLang={handleSetLang}
                favorites={favorites}
                onChangeTab={(tab) => {
                  if (tab === 'settings') { setPrevMainScreen('welcome'); setScreen('settings') }
                  if (tab === 'search') setScreen('home')
                }}
              />
            )}

            {screen === 'home' && (
              <HomePage
                key="home"
                onChangeTab={(tab) => {
                  if (tab === 'settings') { setPrevMainScreen('home'); setScreen('settings') }
                  if (tab === 'profile') setScreen('welcome') 
                }}
                onBack={() => setScreen('welcome')}
                onOpenBlog={() => setScreen('blog')}
                onOpenCalcMenu={() => setScreen('calc-menu')}
                onOpenColors={() => setScreen('colors')}
                onOpenStyles={() => setScreen('styles')}
                onOpenGlossary={(termId) => { setSelectedGlossaryTermId(termId || null); setScreen('glossary') }}
                onOpenPrices={() => setScreen('prices')}
                lang={lang}
                setLang={handleSetLang}
                favorites={favorites}
                onOpenArticle={(articleId) => { setPendingArticleId(articleId); setShowOnlyFavorites(false); setScreen('blog') }}
                onOpenFavorites={() => { setPendingArticleId(null); setShowOnlyFavorites(true); setScreen('blog') }}
              />
            )}

            {screen === 'blog' && (
              <BlogPage
                key="blog"
                onBack={() => { setPendingArticleId(null); setShowOnlyFavorites(false); setScreen('home') }}
                lang={lang}
                isFavorite={favorites.some((f) => f.id === 'blog-orvard')}
                onToggleFavorite={() => toggleFavorite({ id: 'blog-orvard', type: 'blog', imagePng: '/blog-hero.webp' })}
                favoriteArticleIds={favorites.filter((f) => f.type === 'article').map((f) => f.id)}
                onToggleArticleFavorite={(articleId, cover) => toggleFavorite({ id: articleId, type: 'article', imagePng: cover || `/${articleId}.png` })}
                initialArticleId={pendingArticleId}
                onArticleOpened={() => setPendingArticleId(null)}
                initialShowFavorites={showOnlyFavorites}
              />
            )}

            {screen === 'calc-menu' && (
              <CalcMenuPage key="calc-menu" lang={lang} onBack={() => setScreen('home')} onOpenSizeCalc={() => setScreen('size-calc')} onOpenWidthCalc={() => setScreen('width-calc')} onOpenHeelCalc={() => setScreen('heel-calc')} onOpenColorCalc={() => setScreen('color-calc')} onOpenSalaryCalc={() => setScreen('salary-calc')} />
            )}
            {screen === 'salary-calc' && <SalaryCalcPage key="salary-calc" onBack={() => setScreen('calc-menu')} lang={lang} />}
            {screen === 'size-calc' && <SizeCalcPage key="size-calc" lang={lang} onBack={() => setScreen('calc-menu')} />}
            {screen === 'width-calc' && <WidthCalcPage key="width-calc" lang={lang} onBack={() => setScreen('calc-menu')} />}
            {screen === 'heel-calc' && <HeelCalcPage key="heel-calc" lang={lang} onBack={() => setScreen('calc-menu')} />}
            {screen === 'color-calc' && <ColorCalcPage key="color-calc" lang={lang} onBack={() => setScreen('calc-menu')} />}
            {screen === 'colors' && <ColorsPage key="colors" onBack={() => setScreen('home')} lang={lang} setLang={handleSetLang} />}
            {screen === 'styles' && <StylesPage key="styles" onBack={() => setScreen('home')} lang={lang} />}
            {screen === 'glossary' && <GlossaryPage key="glossary" lang={lang} initialTermId={selectedGlossaryTermId} onBack={() => { setSelectedGlossaryTermId(null); setScreen('home') }} />}
            {screen === 'prices' && <PricesPage key="prices" onBack={() => setScreen('home')} lang={lang} />}
            {screen === 'seo-width' && <ForwardOrthoSEOPage key="seo-width" lang={lang} setLang={handleSetLang} onBack={() => { try { window.history.replaceState(null, '', '/') } catch {}; setScreen('home') }} />}

            {screen === 'settings' && (
              <SettingsPage
                key="settings"
                lang={lang}
                setLang={handleSetLang}
                onBack={() => setScreen(prevMainScreen)}
                onChangeTab={(tab) => {
                  if (tab === 'search') setScreen('home')
                  if (tab === 'profile') setScreen('welcome')
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </SmoothScroll>
    </>
  )
}
