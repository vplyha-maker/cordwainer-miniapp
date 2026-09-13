import { useState, useEffect } from 'react'
import { BottomDock } from '../components/BottomDock'
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

      if (trimmed.length > 0 && trimmed.length < 32) {
        return trimmed
      }
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

export function WelcomePage({
  onStart,
  lang,
  setLang,
  onChangeTab,
}: WelcomePageProps) {
  const [heroReady, setHeroReady] = useState(false)
  const [firstName] = useState(getTelegramFirstName)
  const [returning] = useState(hasVisitedBefore)
  const [isDark, setIsDark] = useState(true)

  /* -------------------------------------------------------
     THEME
  ------------------------------------------------------- */

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(
        document.documentElement.classList.contains('dark')
      )
    }

    checkTheme()

    const observer = new MutationObserver(checkTheme)

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  /* -------------------------------------------------------
     LANGUAGE
  ------------------------------------------------------- */

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang

    const supportedLangs: Lang[] = ['ru', 'uk', 'de']

    if (
      savedLang &&
      supportedLangs.includes(savedLang)
    ) {
      if (savedLang !== lang) {
        setLang(savedLang)
      }
    } else if (!savedLang) {
      const sysLang = navigator.language.slice(0, 2)

      const defaultLang: Lang = supportedLangs.includes(
        sysLang as Lang
      )
        ? (sysLang as Lang)
        : 'uk'

      setLang(defaultLang)

      localStorage.setItem(
        'app_lang',
        defaultLang
      )

      localStorage.setItem(
        'cordwainer_lang',
        defaultLang
      )
    }

    try {
      localStorage.setItem(
        'cordwainer_visited',
        '1'
      )
    } catch {}
  }, [lang, setLang])

  /* -------------------------------------------------------
     TRANSLATIONS
  ------------------------------------------------------- */

  const t = {
    ru: {
      hello: 'Привет',
      helloBack: 'Снова здесь',
      welcome: 'Добро пожаловать',
      welcomeBack: 'С возвращением',

      tagline:
        'Энциклопедия обувного мастерства',

      value:
        'Материалы, цвета, фасоны и калькуляторы — для сапожника, модельера и ортопеда.',

      idea:
        'Предмет как идея · Форма как язык · Мастерство как опыт',

      issue: 'ISSUE 01',

      start: 'ISSUE 01 — НАЧАТЬ',
    },

    uk: {
      hello: 'Привіт',
      helloBack: 'Знову тут',
      welcome: 'Ласкаво просимо',
      welcomeBack: 'З поверненням',

      tagline:
        'Енциклопедія взуттєвої майстерності',

      value:
        'Матеріали, кольори, фасони і калькулятори — для шевця, модельєра та ортопеда.',

      idea:
        'Предмет як ідея · Форма як мова · Майстерність як досвід',

      issue: 'ISSUE 01',

      start: 'ISSUE 01 — ПОЧАТИ',
    },

    de: {
      hello: 'Hallo',
      helloBack: 'Wieder da',
      welcome: 'Willkommen',
      welcomeBack: 'Willkommen zurück',

      tagline:
        'Enzyklopädie der Schuhmacherkunst',

      value:
        'Materialien, Farben, Leisten und Rechner — für Schuhmacher, Designer und Orthopäden.',

      idea:
        'Objekt als Idee · Form als Sprache · Handwerk als Erfahrung',

      issue: 'ISSUE 01',

      start: 'ISSUE 01 — STARTEN',
    },
  }[lang]

  const greeting = returning
    ? firstName
      ? `${t.helloBack}, ${firstName}`
      : t.welcomeBack
    : firstName
      ? `${t.hello}, ${firstName}`
      : t.welcome

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  return (
    <main
      className="
        relative
        flex
        h-[100dvh]
        w-full
        flex-col
        overflow-hidden
        bg-[var(--color-bg)]
        text-[var(--color-ink)]
        transition-colors
        duration-500
      "
    >

      {/* =====================================================
          HERO IMAGE
      ===================================================== */}

      <div className="absolute inset-0 z-0">

        {!heroReady && (
          <div
            className="
              absolute
              inset-0
              bg-[var(--color-surface)]
            "
            aria-hidden
          />
        )}

        <img
          src="/hero-cover.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          onLoad={() => setHeroReady(true)}
          className="
            absolute
            inset-0
            h-full
            w-full
            object-cover
            object-[center_top]
          "
          style={{
            opacity: heroReady
              ? isDark
                ? 1
                : 0.92
              : 0,

            transition:
              'opacity 700ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />

        {/* Editorial photographic treatment */}

        <div
          className="
            absolute
            inset-0
            pointer-events-none
          "
          style={{
            background: isDark
              ? `
                linear-gradient(
                  to bottom,
                  rgba(12,10,9,0.08) 0%,
                  rgba(12,10,9,0.05) 34%,
                  rgba(12,10,9,0.38) 58%,
                  rgba(12,10,9,0.78) 76%,
                  rgba(12,10,9,0.96) 100%
                )
              `
              : `
                linear-gradient(
                  to bottom,
                  rgba(245,241,234,0.04) 0%,
                  rgba(245,241,234,0.12) 36%,
                  rgba(245,241,234,0.55) 66%,
                  rgba(245,241,234,0.94) 100%
                )
              `,
          }}
        />

        {/* Very subtle side vignette */}

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, rgba(10,8,7,0.18), transparent 38%, rgba(10,8,7,0.08))'
              : 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent 40%)',
          }}
        />

      </div>


      {/* =====================================================
          EDITORIAL CONTENT
      ===================================================== */}

      <section
        className="
          relative
          z-20
          flex
          min-h-0
          flex-1
          flex-col
          justify-end

          px-6
          pb-[116px]

          sm:px-7
        "
      >

        <div
          className="
            w-full
            max-w-[390px]
            mx-auto
          "
        >

          {/* ISSUE */}

          <div className="mb-5">
            <span
              className={`
                inline-block
                text-[10px]
                font-medium
                uppercase
                tracking-[0.30em]
                ${
                  isDark
                    ? 'text-white/55'
                    : 'text-black/50'
                }
              `}
            >
              {t.issue}
            </span>
          </div>


          {/* GREETING */}

          <p
            className={`
              mb-3
              text-[11px]
              font-light
              tracking-[0.08em]
              ${
                isDark
                  ? 'text-white/55'
                  : 'text-black/55'
              }
            `}
          >
            {greeting}
          </p>


          {/* BRAND */}

          <h1
            className={`
              font-display
              mb-5

              text-[3.45rem]
              leading-[0.88]
              tracking-[-0.045em]

              sm:text-[3.8rem]

              ${
                isDark
                  ? 'text-[#F4F0E8]'
                  : 'text-[#1C1816]'
              }
            `}
          >
            Cordwainer
          </h1>


          {/* TAGLINE */}

          <p
            className={`
              mb-7
              max-w-[330px]

              text-[10px]
              font-medium
              uppercase
              leading-[1.45]
              tracking-[0.24em]

              ${
                isDark
                  ? 'text-white/48'
                  : 'text-black/48'
              }
            `}
          >
            {t.tagline}
          </p>


          {/* EDITORIAL LINE */}

          <div
            className={`
              mb-6
              h-px
              w-10
              ${
                isDark
                  ? 'bg-white/30'
                  : 'bg-black/20'
              }
            `}
          />


          {/* DESCRIPTION */}

          <p
            className={`
              mb-4
              max-w-[335px]

              text-[15px]
              font-light
              leading-[1.48]

              ${
                isDark
                  ? 'text-white/80'
                  : 'text-black/72'
              }
            `}
          >
            {t.value}
          </p>


          {/* EDITORIAL STATEMENT */}

          <p
            className={`
              mb-7
              max-w-[330px]

              text-[9px]
              font-medium
              uppercase
              leading-[1.75]
              tracking-[0.19em]

              ${
                isDark
                  ? 'text-white/38'
                  : 'text-black/40'
              }
            `}
          >
            {t.idea}
          </p>


          {/* CTA */}

          <button
            type="button"
            onClick={onStart}
            className={`
              group
              inline-flex
              h-[48px]
              items-center
              justify-center

              rounded-[11px]

              border
              px-5

              text-[10px]
              font-medium
              uppercase
              tracking-[0.18em]

              transition-all
              duration-200
              active:scale-[0.98]

              ${
                isDark
                  ? `
                    border-white/25
                    bg-[#191512]/55
                    text-[#F1EDE4]
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
                  `
                  : `
                    border-black/20
                    bg-white/45
                    text-[#1C1816]
                  `
              }
            `}
          >
            <span
              className="
                transition-transform
                duration-200
                group-active:translate-x-[1px]
              "
            >
              {t.start}
            </span>

            <span
              className="
                ml-3
                text-[13px]
                leading-none
                opacity-60
                transition-transform
                duration-200
                group-active:translate-x-1
              "
              aria-hidden
            >
              →
            </span>
          </button>

        </div>

      </section>


      {/* =====================================================
          BOTTOM NAVIGATION
      ===================================================== */}

      <BottomDock
        active="profile"
        lang={lang}
        onChange={onChangeTab}
      />

    </main>
  )
}
