import { useState, useEffect } from 'react'
import type { Lang, FavoriteItem } from '../App'

type WelcomePageProps = {
  onStart?: () => void
  onOpenBlog?: () => void
  lang: Lang
  setLang: (lang: Lang) => void
  favorites?: FavoriteItem[]
  onChangeTab?: (tab: 'search' | 'settings' | 'profile') => void
}

function getTelegramFirstName(): string {
  try {
    const name = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name
    if (typeof name === 'string') {
      const trimmed = name.trim()
      if (trimmed.length > 0 && trimmed.length < 32) return trimmed
    }
  } catch {}
  return ''
}

function hasVisitedBefore(): boolean {
  try {
    return localStorage.getItem('cordwainer_visited') === '1'
  } catch {
    return false
  }
}

export function WelcomePage({ onStart, lang, setLang }: WelcomePageProps) {
  const [firstName] = useState(getTelegramFirstName)
  const [returning] = useState(hasVisitedBefore)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang
    const supportedLangs: Lang[] = ['ru', 'uk', 'de']

    if (savedLang && supportedLangs.includes(savedLang)) {
      if (savedLang !== lang) setLang(savedLang)
    } else if (!savedLang) {
      const sysLang = navigator.language.slice(0, 2)
      const defaultLang: Lang = supportedLangs.includes(sysLang as Lang) ? (sysLang as Lang) : 'uk'
      setLang(defaultLang)
      localStorage.setItem('app_lang', defaultLang)
      localStorage.setItem('cordwainer_lang', defaultLang)
    }
    try { localStorage.setItem('cordwainer_visited', '1') } catch {}
  }, [lang, setLang])

  const t = {
    ru: {
      hello: 'Привет',
      helloBack: 'Снова здесь',
      welcome: 'Добро пожаловать',
      welcomeBack: 'С возвращением',
      tagline: 'Энциклопедия обувного мастерства',
      value: 'Материалы, цвета, фасоны и калькуляторы — для сапожника, модельера и ортопеда.',
      issue: 'ISSUE 01',
      start: 'НАЧАТЬ ИССЛЕДОВАНИЕ',
    },
    uk: {
      hello: 'Привіт',
      helloBack: 'Знову тут',
      welcome: 'Ласкаво просимо',
      welcomeBack: 'З поверненням',
      tagline: 'Енциклопедія взуттєвої майстерності',
      value: 'Матеріали, кольори, фасони і калькулятори — для шевця, модельєра та ортопеда.',
      issue: 'ISSUE 01',
      start: 'ПОЧАТИ ДОСЛІДЖЕННЯ',
    },
    de: {
      hello: 'Hallo',
      helloBack: 'Wieder da',
      welcome: 'Willkommen',
      welcomeBack: 'Willkommen zurück',
      tagline: 'Enzyklopädie der Schuhmacherkunst',
      value: 'Materialien, Farben, Leisten und Rechner — für Schuhmacher, Designer und Orthopäden.',
      issue: 'ISSUE 01',
      start: 'ENTDECKEN',
    },
  }[lang]

  const greeting = returning
    ? firstName ? `${t.helloBack}, ${firstName}` : t.welcomeBack
    : firstName ? `${t.hello}, ${firstName}` : t.welcome

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/70' : 'text-[#1C1816]/70'
  const cTextFaint = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'bg-[#F4F0E8]/30' : 'bg-[#1C1816]/20'
  
  const cGrad = isDark ? 'from-[#0A0A0A] via-[#0A0A0A]/85' : 'from-[#F2EFE9] via-[#F2EFE9]/80'
  const cOverlay = isDark ? 'bg-black/20' : 'bg-transparent'
  const imgOpacity = isDark ? '0.75' : '0.95'

  return (
    <main className={`relative flex h-[100dvh] w-full flex-col overflow-hidden transition-colors duration-[1.5s] ${cBg}`}>
      
      <style>{`
        @keyframes coutureZoom {
          0% { opacity: 0; transform: scale(1.1); }
          100% { opacity: var(--img-opacity); transform: scale(1); }
        }
        @keyframes coutureFadeUp {
          0% { opacity: 0; transform: translateY(24px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes btnGlare {
          0%   { background-position: -200% center; }
          30%  { background-position: -200% center; }
          70%  { background-position: 200% center; }
          100% { background-position: 200% center; }
        }

        /* ТЁМНАЯ ТЕМА */
        .glare-text-dark {
          background: linear-gradient(
            105deg,
            #F4F0E8 20%,
            #C8C4BC 38%,
            #FFFFFF 48%,
            #FFFFFF 52%,
            #C8C4BC 62%,
            #F4F0E8 80%
          );
          background-size: 280% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: btnGlare 3.6s linear infinite;
          will-change: background-position;
          transform: translateZ(0);
        }
        .glare-line-dark {
          background: linear-gradient(
            105deg,
            #F4F0E8 20%,
            #C8C4BC 38%,
            #FFFFFF 48%,
            #FFFFFF 52%,
            #C8C4BC 62%,
            #F4F0E8 80%
          );
          background-size: 280% 100%;
          animation: btnGlare 3.6s linear infinite;
          will-change: background-position;
          transform: translateZ(0);
        }

        /* СВЕТЛАЯ ТЕМА */
        .glare-text-light {
          background: linear-gradient(
            105deg,
            #1C1816 20%,
            #1C1816 38%,
            #999999 48%,
            #999999 52%,
            #1C1816 62%,
            #1C1816 80%
          );
          background-size: 280% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: btnGlare 3.6s linear infinite;
          will-change: background-position;
          transform: translateZ(0);
        }
        .glare-line-light {
          background: linear-gradient(
            105deg,
            #1C1816 20%,
            #1C1816 38%,
            #999999 48%,
            #999999 52%,
            #1C1816 62%,
            #1C1816 80%
          );
          background-size: 280% 100%;
          animation: btnGlare 3.6s linear infinite;
          will-change: background-position;
          transform: translateZ(0);
        }
        
        .anim-bg {
          animation: coutureZoom 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .anim-item {
          opacity: 0;
          animation: coutureFadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* 1. ФОН */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-cover.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          style={{ '--img-opacity': imgOpacity } as React.CSSProperties}
          className="anim-bg absolute inset-0 h-full w-full object-cover object-[center_top] transition-opacity duration-1000"
        />
        <div className={`absolute inset-0 z-10 transition-colors duration-1000 ${cOverlay}`} />
        <div className={`absolute bottom-0 left-0 right-0 h-[60%] z-10 bg-gradient-to-t ${cGrad} to-transparent pointer-events-none transition-colors duration-1000`} />
      </div>

      {/* 2. МЕТА-ДАННЫЕ (только ISSUE 01 слева) */}
      <div 
        className="anim-item absolute top-6 left-6 right-6 z-30 flex items-start"
        style={{ animationDelay: '0.1s' }}
      >
        <span className={`text-[10px] font-sans font-medium uppercase tracking-[0.35em] transition-colors duration-1000 ${cTextMuted}`}>
          {t.issue}
        </span>
      </div>

      {/* 3. ОСНОВНОЙ КОНТЕНТ */}
      <section className="relative z-30 flex h-full w-full flex-col justify-end px-6 pb-12 sm:pb-16">
        <div className="flex w-full flex-col">
          
          <div className="anim-item" style={{ animationDelay: '0.3s' }}>
            <p className={`mb-3 text-[10px] font-sans font-medium uppercase leading-[1.6] tracking-[0.25em] transition-colors duration-1000 ${cTextMuted}`}>
              {t.tagline}
            </p>
          </div>

          <div className="anim-item" style={{ animationDelay: '0.45s' }}>
            <h1 className={`mb-6 font-serif text-[12.5vw] min-[375px]:text-5xl sm:text-6xl leading-[0.9] tracking-[-0.02em] transition-colors duration-1000 ${cText}`}>
              Cordwainer
            </h1>
          </div>

          <div className="anim-item" style={{ animationDelay: '0.6s' }}>
            <div className={`mb-6 h-px w-10 transition-colors duration-1000 ${cLine}`} />
            <p className={`mb-10 max-w-[320px] text-[14px] font-sans font-light leading-[1.6] transition-colors duration-1000 ${isDark ? 'text-[#F4F0E8]/80' : 'text-[#1C1816]/80'}`}>
              {t.value}
            </p>
          </div>
          
          {/* Кнопка с бликом */}
          <div className="anim-item" style={{ animationDelay: '0.75s' }}>
            <button
              type="button"
              onClick={onStart}
              className={`group relative inline-flex items-center gap-4 self-start text-[11px] font-sans font-medium uppercase tracking-[0.2em] transition-colors duration-1000 active:opacity-60 ${cText}`}
            >
              <span className={`relative z-10 transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 ${isDark ? 'glare-text-dark' : 'glare-text-light'}`}>
                {t.start}
              </span>
              
              <span className={`relative z-10 block h-[1px] w-12 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-16 ${isDark ? 'glare-line-dark' : 'glare-line-light'}`} />
            </button>
          </div>
          
        </div>
      </section>

    </main>
  )
}
