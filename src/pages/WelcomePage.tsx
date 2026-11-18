import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Lang, FavoriteItem } from '../App'

type WelcomePageProps = {
  onStart?: () => void
  onOpenMaterials?: () => void
  onOpenStyles?: () => void
  onOpenCalc?: () => void
  lang: Lang
  setLang: (lang: Lang) => void
  favorites?: FavoriteItem[]
  onChangeTab?: (tab: 'search' | 'settings' | 'profile') => void
}

function getTelegramFirstName(): string {
  try {
    const name = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name
    if (typeof name === 'string') {
      const cleaned = name.replace(/[^\p{L}\s-]/gu, '').trim()
      if (cleaned.length > 0 && cleaned.length < 32) return cleaned
    }
  } catch {}
  return ''
}

function haptic(style: 'light' | 'medium' = 'light') {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style)
  } catch {}
}

type GridCell = {
  id: number
  col: number
  row: number
  char: string
  wordIndex: number | null // 0..8 for C-O-R-D-W-A-I-N-E
  homeX: number
  homeY: number
  distFromCenter: number
  dirX: number
  dirY: number
}

// 9 columns x 8 rows = 72 cells in SVG coordinate space (360 x 360)
const COLS = 9
const ROWS = 8
const CELL_X = 38
const CELL_Y = 42
const START_X = 28
const START_Y = 36

// Target word: C O R D W A I N E (9 letters, no trailing 'r')
const TARGET_WORD = ['C', 'O', 'R', 'D', 'W', 'A', 'I', 'N', 'E']

// Coordinates (row, col) in the 8x9 grid where each letter of CORDWAINE sits before flying together
const WORD_POSITIONS: Array<[number, number]> = [
  [1, 1], // C
  [1, 4], // O
  [2, 7], // R
  [3, 2], // D
  [3, 5], // W
  [4, 3], // A
  [5, 6], // I
  [6, 1], // N
  [6, 7], // E
]

// Final assembled horizontal positions for C-O-R-D-W-A-I-N-E in stage SVG coordinates (center = 180, 182)
const FINAL_LETTER_X = [50, 81, 113, 145, 181, 217, 244, 272, 306]
const FINAL_LETTER_Y = 186

// Deterministic filler characters evoking bespoke shoemaking & Quiet Table cryptography
const FILLER_CHARS = 'BESPOKELASTSTITCHWELTPATINALEATHERsolecraftarch'

function buildGridCells(): GridCell[] {
  const cells: GridCell[] = []
  const centerX = START_X + ((COLS - 1) * CELL_X) / 2
  const centerY = START_Y + ((ROWS - 1) * CELL_Y) / 2
  const maxDist = Math.hypot(centerX, centerY) || 1

  let fillerIdx = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const wIdx = WORD_POSITIONS.findIndex(([wr, wc]) => wr === r && wc === c)
      const char =
        wIdx !== -1
          ? TARGET_WORD[wIdx]
          : FILLER_CHARS[fillerIdx++ % FILLER_CHARS.length].toUpperCase()

      const homeX = START_X + c * CELL_X
      const homeY = START_Y + r * CELL_Y
      const dx = homeX - centerX
      const dy = homeY - centerY
      const dist = Math.hypot(dx, dy) / maxDist

      cells.push({
        id: r * COLS + c,
        col: c,
        row: r,
        char,
        wordIndex: wIdx !== -1 ? wIdx : null,
        homeX,
        homeY,
        distFromCenter: dist,
        dirX: dx / maxDist,
        dirY: dy / maxDist,
      })
    }
  }
  return cells
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeScrambleMap(count: number, seed: number): number[] {
  const rng = mulberry32(seed)
  const arr = Array.from({ length: count }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

type IntroPhase =
  | 'loading'
  | 'popIn'
  | 'shuffle1'
  | 'shuffle2'
  | 'resolve'
  | 'spell'
  | 'disperse'
  | 'fly'
  | 'settled'

export function WelcomePage({
  onStart,
  onOpenMaterials,
  onOpenStyles,
  onOpenCalc,
  lang,
  setLang,
}: WelcomePageProps) {
  const [firstName] = useState(getTelegramFirstName)
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  const [loadCount, setLoadCount] = useState(0)
  const [phase, setPhase] = useState<IntroPhase>('loading')
  const [spelledCount, setSpelledCount] = useState(0)
  const [glintActive, setGlintActive] = useState(false)
  const [runSeed, setRunSeed] = useState(1)

  const timersRef = useRef<number[]>([])

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }, [])

  // Sync dark/light theme with Telegram WebApp header & background
  useEffect(() => {
    const checkTheme = () => {
      const dark = document.documentElement.classList.contains('dark')
      setIsDark(dark)
      try {
        const bgHex = dark ? '#161412' : '#F3EFEA'
        window.Telegram?.WebApp?.setHeaderColor?.(bgHex)
        window.Telegram?.WebApp?.setBackgroundColor?.(bgHex)
      } catch {}
    }
    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  // Restore or initialize saved language
  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang
    const supportedLangs: Lang[] = ['ru', 'uk', 'de']

    if (savedLang && supportedLangs.includes(savedLang)) {
      if (savedLang !== lang) setLang(savedLang)
    } else if (!savedLang) {
      const sysLang = navigator.language.slice(0, 2)
      const defaultLang: Lang = supportedLangs.includes(sysLang as Lang)
        ? (sysLang as Lang)
        : 'uk'
      setLang(defaultLang)
      localStorage.setItem('app_lang', defaultLang)
      localStorage.setItem('cordwainer_lang', defaultLang)
    }
    try {
      localStorage.setItem('cordwainer_visited', '1')
    } catch {}
  }, [lang, setLang])

  const cells = useMemo(() => buildGridCells(), [])
  const scramble0 = useMemo(() => makeScrambleMap(cells.length, runSeed * 17 + 3), [cells.length, runSeed])
  const scramble1 = useMemo(() => makeScrambleMap(cells.length, runSeed * 31 + 11), [cells.length, runSeed])
  const scramble2 = useMemo(() => makeScrambleMap(cells.length, runSeed * 47 + 29), [cells.length, runSeed])

  const startSequence = useCallback(
    (skipLoader = false) => {
      clearAllTimers()
      setGlintActive(false)
      setSpelledCount(0)

      const schedule = (fn: () => void, ms: number) => {
        const id = window.setTimeout(fn, ms)
        timersRef.current.push(id)
      }

      const baseDelay = skipLoader ? 40 : 680

      if (!skipLoader) {
        setPhase('loading')
        setLoadCount(0)
        const steps = [14, 32, 56, 78, 92, 100]
        steps.forEach((val, idx) => {
          schedule(() => setLoadCount(val), idx * 95)
        })
      }

      // 1. Jumbled pop-in
      schedule(() => setPhase('popIn'), baseDelay)

      // 2. Two crisp shuffle hops
      schedule(() => setPhase('shuffle1'), baseDelay + 560)
      schedule(() => setPhase('shuffle2'), baseDelay + 1080)

      // 3. Resolve to true grid
      schedule(() => setPhase('resolve'), baseDelay + 1620)

      // 4. Spell C-O-R-D-W-A-I-N-E one letter at a time
      schedule(() => {
        setPhase('spell')
        for (let i = 1; i <= TARGET_WORD.length; i++) {
          schedule(() => {
            setSpelledCount(i)
            if (i === 1 || i === TARGET_WORD.length) haptic('light')
          }, i * 75)
        }
      }, baseDelay + 2450)

      // 5. Disperse surrounding letters in a radial ripple
      schedule(() => setPhase('disperse'), baseDelay + 3400)

      // 6. Fly the 9 letters into the centered CORDWAINE lockup
      schedule(() => {
        setPhase('fly')
        haptic('light')
      }, baseDelay + 3820)

      // 7. Settle, draw rules & bespoke flourish, sweep glint, reveal UI
      schedule(() => {
        setPhase('settled')
        setGlintActive(true)
        haptic('medium')
      }, baseDelay + 4750)
    },
    [clearAllTimers]
  )

  const skipIntro = useCallback(() => {
    clearAllTimers()
    haptic('light')
    setLoadCount(100)
    setSpelledCount(TARGET_WORD.length)
    setPhase('settled')
    setGlintActive(true)
  }, [clearAllTimers])

  const replayIntro = useCallback(() => {
    haptic('light')
    setRunSeed((s) => s + 1)
    startSequence(true)
  }, [startSequence])

  useEffect(() => {
    startSequence(false)
    return () => clearAllTimers()
  }, [startSequence, clearAllTimers])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipIntro()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [skipIntro])

  const t = {
    ru: {
      crown: 'bespoke',
      subtitle: 'Энциклопедия обувного мастерства',
      ch1: 'Cardio',
      ch2: 'Силуэты',
      ch3: 'Расчёты',
      enter: 'Войти',
      skip: 'Пропустить',
      replay: 'Повтор',
    },
    uk: {
      crown: 'bespoke',
      subtitle: 'Енциклопедія взуттєвої майстерності',
      ch1: 'Cardio',
      ch2: 'Силуети',
      ch3: 'Розрахунки',
      enter: 'Увійти',
      skip: 'Пропустити',
      replay: 'Повтор',
    },
    de: {
      crown: 'bespoke',
      subtitle: 'Enzyklopädie der Schuhmacherkunst',
      ch1: 'Cardio',
      ch2: 'Silhouetten',
      ch3: 'Rechner',
      enter: 'Eintreten',
      skip: 'Überspringen',
      replay: 'Wiederholen',
    },
  }[lang]

  const langList: Array<{ code: Lang; label: string }> = [
    { code: 'ru', label: 'ru' },
    { code: 'uk', label: 'ukr' },
    { code: 'de', label: 'de' },
  ]
  const activeLangIdx = Math.max(
    0,
    langList.findIndex((item) => item.code === lang)
  )

  const ink = isDark ? '#D5C5AB' : '#2C251E'
  const inkBright = isDark ? '#F4E7CF' : '#120F0C'
  const inkDim = isDark ? 'rgba(213, 197, 171, 0.45)' : 'rgba(44, 37, 30, 0.48)'
  const bgMain = isDark ? '#191714' : '#F3EFEA'
  const bgDeep = isDark ? '#100F0D' : '#E6DFD5'

  const isSettled = phase === 'settled'
  const isFlyingOrSettled = phase === 'fly' || phase === 'settled'

  // Compute per-cell transform and opacity based on current animation phase
  const getCellStyle = (cell: GridCell): React.CSSProperties => {
    const isWord = cell.wordIndex !== null
    const wIdx = cell.wordIndex ?? 0

    let targetX = cell.homeX
    let targetY = cell.homeY
    let scale = 1
    let opacity = 1
    let rotate = 0
    let duration = 680
    let delay = 0
    let easing = 'cubic-bezier(0.22, 1, 0.36, 1)'

    if (phase === 'loading') {
      const dest = cells[scramble0[cell.id]]
      targetX = dest.homeX
      targetY = dest.homeY
      scale = 0.35
      opacity = 0
      rotate = ((cell.id % 7) - 3) * 7
      duration = 0
    } else if (phase === 'popIn') {
      const dest = cells[scramble0[cell.id]]
      targetX = dest.homeX
      targetY = dest.homeY
      scale = 1
      opacity = 0.88
      rotate = 0
      duration = 620
      delay = (cell.id % 12) * 28
      easing = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    } else if (phase === 'shuffle1') {
      const dest = cells[scramble1[cell.id]]
      targetX = dest.homeX
      targetY = dest.homeY
      opacity = 0.9
      duration = 540
      delay = (cell.id % 9) * 22
      easing = 'cubic-bezier(0.65, 0, 0.35, 1)'
    } else if (phase === 'shuffle2') {
      const dest = cells[scramble2[cell.id]]
      targetX = dest.homeX
      targetY = dest.homeY
      opacity = 0.92
      duration = 540
      delay = ((cell.id * 3) % 10) * 20
      easing = 'cubic-bezier(0.65, 0, 0.35, 1)'
    } else if (phase === 'resolve') {
      targetX = cell.homeX
      targetY = cell.homeY
      opacity = 0.92
      duration = 880
      delay = isWord ? 140 + wIdx * 32 : (cell.id % 10) * 26
      easing = 'cubic-bezier(0.16, 1, 0.3, 1)'
    } else if (phase === 'spell') {
      targetX = cell.homeX
      targetY = cell.homeY
      if (isWord) {
        const lit = wIdx < spelledCount
        opacity = 1
        scale = lit ? 1.12 : 1
        duration = 380
      } else {
        opacity = 0.16
        scale = 0.96
        duration = 750
      }
    } else if (phase === 'disperse') {
      if (isWord) {
        targetX = cell.homeX
        targetY = cell.homeY
        opacity = 1
        scale = 1.1
        duration = 420
      } else {
        targetX = cell.homeX + cell.dirX * 26
        targetY = cell.homeY + cell.dirY * 26 + 10
        opacity = 0
        scale = 0.45
        duration = 760
        delay = Math.round(cell.distFromCenter * 380)
        easing = 'cubic-bezier(0.55, 0.05, 0.67, 0.19)'
      }
    } else if (phase === 'fly' || phase === 'settled') {
      if (isWord) {
        targetX = FINAL_LETTER_X[wIdx]
        targetY = FINAL_LETTER_Y
        scale = phase === 'settled' ? 1.72 : 1.66
        opacity = 1
        duration = phase === 'fly' ? 1150 : 900
        delay = phase === 'fly' ? wIdx * 36 : 0
        easing = 'cubic-bezier(0.19, 1, 0.22, 1)'
      } else {
        targetX = cell.homeX + cell.dirX * 32
        targetY = cell.homeY + cell.dirY * 32 + 14
        opacity = 0
        scale = 0.4
        duration = 300
      }
    }

    return {
      transform: `translate3d(${targetX}px, ${targetY}px, 0) scale(${scale}) rotate(${rotate}deg)`,
      opacity,
      transition:
        duration > 0
          ? `transform ${duration}ms ${easing} ${delay}ms, opacity ${Math.min(
              duration,
              650
            )}ms ease ${delay}ms, fill 350ms ease`
          : 'none',
    }
  }

  return (
    <main
      style={{
        background: `radial-gradient(120% 90% at 50% 46%, ${bgMain} 32%, ${bgDeep} 100%)`,
        color: ink,
        fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
      }}
      className="relative flex h-[100dvh] w-full flex-col justify-between overflow-hidden select-none antialiased"
    >
      {/* Subtle film grain overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.055] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Ambient warm bloom behind the assembled wordmark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[44%] z-0 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-[1800ms] ease-out"
        style={{
          width: '74vmin',
          height: '42vmin',
          background: isDark
            ? 'radial-gradient(closest-side, rgba(244, 231, 207, 0.12), transparent)'
            : 'radial-gradient(closest-side, rgba(197, 168, 128, 0.18), transparent)',
          opacity: isFlyingOrSettled ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${isSettled ? 1.08 : 0.85})`,
        }}
      />

      {/* 0. Minimal Intro Loader Bar */}
      <div
        aria-hidden={phase !== 'loading'}
        className={`pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-3.5 transition-opacity duration-500 ${
          phase === 'loading' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: bgMain }}
      >
        <div
          className="relative h-[1px] w-40 overflow-hidden"
          style={{ background: isDark ? 'rgba(213,197,171,0.15)' : 'rgba(44,37,30,0.15)' }}
        >
          <span
            className="absolute inset-0 origin-left transition-transform duration-150 ease-out"
            style={{
              background: ink,
              transform: `scaleX(${loadCount / 100})`,
            }}
          />
        </div>
        <span
          className="font-mono text-[11px] tracking-[0.32em] tabular-nums"
          style={{ color: inkDim }}
        >
          {loadCount}
        </span>
      </div>

      {/* 1. TOP BAR: Apple-style liquid glass language switcher (ru / ukr / de) */}
      <header className="relative z-30 flex items-center justify-between px-6 pt-5 pb-2">
        {/* Left: Replay or Skip subtle control */}
        <div className="flex items-center">
          {isSettled ? (
            <button
              type="button"
              onClick={replayIntro}
              aria-label={t.replay}
              style={{ color: inkDim }}
              className="group inline-flex items-center gap-1.5 border-0 bg-transparent py-1.5 pr-3 text-[13px] italic tracking-[0.06em] outline-none transition-colors duration-300 hover:opacity-100 active:scale-95 cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 fill-current transition-transform duration-500 group-hover:-rotate-90"
              >
                <path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />
              </svg>
              <span>{t.replay}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={skipIntro}
              style={{ color: inkDim }}
              className="border-0 bg-transparent py-1.5 pr-3 text-[13px] italic tracking-[0.06em] outline-none transition-opacity duration-300 hover:opacity-100 cursor-pointer"
            >
              {t.skip}
            </button>
          )}
        </div>

        {/* Right: Apple-style ultra-smooth pill segmented control for RU / UKR / DE */}
        <div
          role="tablist"
          aria-label="Language switcher"
          style={{
            background: isDark
              ? 'rgba(255, 255, 255, 0.055)'
              : 'rgba(22, 20, 18, 0.06)',
            borderColor: isDark
              ? 'rgba(213, 197, 171, 0.14)'
              : 'rgba(44, 37, 30, 0.12)',
          }}
          className="relative grid grid-cols-3 items-center rounded-full border p-[3px] backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]"
        >
          {/* Sliding pill thumb */}
          <span
            aria-hidden="true"
            style={{
              transform: `translate3d(${activeLangIdx * 100}%, 0, 0)`,
              background: isDark
                ? 'rgba(244, 231, 207, 0.16)'
                : 'rgba(255, 255, 255, 0.85)',
              boxShadow: isDark
                ? '0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0.5px rgba(255,255,255,0.18)'
                : '0 2px 6px rgba(0,0,0,0.08), inset 0 1px 0.5px rgba(255,255,255,0.9)',
              transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            className="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-full"
          />

          {langList.map((item) => {
            const active = lang === item.code
            return (
              <button
                key={item.code}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  haptic('light')
                  localStorage.setItem('app_lang', item.code)
                  localStorage.setItem('cordwainer_lang', item.code)
                  setLang(item.code)
                }}
                style={{
                  color: active ? inkBright : inkDim,
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
                  transition: 'color 300ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                className="relative z-10 min-w-[42px] rounded-full border-0 bg-transparent px-2.5 py-1 text-center text-[11px] font-medium lowercase tracking-[0.04em] outline-none cursor-pointer"
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* 2. CENTER STAGE: The Quiet Table letter-grid & CORDWAINE morphing lockup */}
      <section
        aria-label="Cordwaine Intro Stage"
        className="relative z-20 my-auto flex flex-col items-center justify-center px-4"
      >
        <div
          className="relative w-[min(86vw,380px)] transition-transform duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            transform: `scale(${isSettled ? 1.06 : 1})`,
          }}
        >
          <svg
            viewBox="0 0 360 360"
            className="block h-auto w-full overflow-visible"
          >
            <defs>
              <linearGradient id="cordwaine-glint" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor={inkBright} stopOpacity="0" />
                <stop offset="50%" stopColor="#FFF8EB" stopOpacity="0.95" />
                <stop offset="100%" stopColor={inkBright} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Crown rules & italic 'bespoke' / user greeting above CORDWAINE */}
            <g
              style={{
                opacity: isFlyingOrSettled ? 1 : 0,
                transition: 'opacity 700ms ease 220ms',
              }}
            >
              {/* Left rule growing outward from center */}
              <line
                x1="46"
                y1="146"
                x2="132"
                y2="146"
                stroke={ink}
                strokeWidth="0.75"
                strokeOpacity="0.55"
                style={{
                  transformOrigin: '132px 146px',
                  transform: `scaleX(${isFlyingOrSettled ? 1 : 0})`,
                  transition: 'transform 900ms cubic-bezier(0.19, 1, 0.22, 1) 260ms',
                }}
              />
              {/* Italic small overline word ('bespoke' or firstName) */}
              <text
                x="180"
                y="150"
                textAnchor="middle"
                fill={ink}
                className="italic"
                style={{
                  fontSize: '14.5px',
                  letterSpacing: '0.08em',
                }}
              >
                {firstName ? firstName.toLowerCase() : t.crown}
              </text>
              {/* Right rule growing outward from center */}
              <line
                x1="228"
                y1="146"
                x2="314"
                y2="146"
                stroke={ink}
                strokeWidth="0.75"
                strokeOpacity="0.55"
                style={{
                  transformOrigin: '228px 146px',
                  transform: `scaleX(${isFlyingOrSettled ? 1 : 0})`,
                  transition: 'transform 900ms cubic-bezier(0.19, 1, 0.22, 1) 260ms',
                }}
              />
            </g>

            {/* All 72 letter glyphs in the stage */}
            <g>
              {cells.map((cell) => {
                const isWord = cell.wordIndex !== null
                const wIdx = cell.wordIndex ?? -1
                const isLit =
                  isWord &&
                  ((phase === 'spell' && wIdx < spelledCount) ||
                    phase === 'disperse' ||
                    phase === 'fly' ||
                    phase === 'settled')

                return (
                  <g key={cell.id} style={getCellStyle(cell)}>
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isLit ? inkBright : ink}
                      style={{
                        fontSize: '20px',
                        fontWeight: isLit ? 500 : 400,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {cell.char}
                    </text>
                  </g>
                )
              })}
            </g>

            {/* Bespoke calligraphic flourish / tail under the C-O-R of CORDWAINE */}
            <path
              d="M 48 202 C 62 222, 118 225, 168 207 C 132 218, 74 216, 48 202 Z"
              fill={ink}
              style={{
                opacity: isFlyingOrSettled ? 0.85 : 0,
                transform: `translate3d(${isFlyingOrSettled ? 0 : -14}px, 0, 0)`,
                transition:
                  'opacity 850ms ease 340ms, transform 900ms cubic-bezier(0.22, 1, 0.36, 1) 340ms',
              }}
            />

            {/* Soft metallic glint sweeping across CORDWAINE when settled */}
            <rect
              x={glintActive ? 340 : 10}
              y="156"
              width="48"
              height="52"
              fill="url(#cordwaine-glint)"
              style={{
                opacity: glintActive ? 0.32 : 0,
                mixBlendMode: 'screen',
                transition: glintActive
                  ? 'x 1350ms cubic-bezier(0.4, 0, 0.2, 1) 120ms, opacity 400ms ease'
                  : 'none',
              }}
            />

            {/* Subtitle fading in gently beneath the assembled logo */}
            <text
              x="180"
              y="244"
              textAnchor="middle"
              fill={inkDim}
              className="italic"
              style={{
                fontSize: '12.5px',
                letterSpacing: '0.09em',
                opacity: isSettled ? 1 : 0,
                transform: `translate3d(0, ${isSettled ? 0 : 8}px, 0)`,
                transition:
                  'opacity 900ms ease 180ms, transform 900ms cubic-bezier(0.22, 1, 0.36, 1) 180ms',
              }}
            >
              {t.subtitle}
            </text>
          </svg>
        </div>
      </section>

      {/* 3. BOTTOM NAVIGATION: Pure typographic buttons (Cardio, Силуэты, Расчёты, Войти) */}
      <footer
        className="relative z-30 flex flex-col items-center px-6 pb-9 sm:pb-12 transition-all duration-[950ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          opacity: isSettled ? 1 : 0,
          transform: `translate3d(0, ${isSettled ? 0 : 16}px, 0)`,
          pointerEvents: isSettled ? 'auto' : 'none',
        }}
      >
        {/* Secondary typographic row: Cardio · Силуэты · Расчёты */}
        <nav
          aria-label="Primary sections"
          className="mb-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-2"
        >
          {[
            { label: t.ch1, onClick: onOpenMaterials },
            { label: t.ch2, onClick: onOpenStyles },
            { label: t.ch3, onClick: onOpenCalc },
          ].map((item, idx) => (
            <React.Fragment key={item.label}>
              {idx > 0 && (
                <span
                  aria-hidden="true"
                  style={{ color: inkDim }}
                  className="select-none text-[11px] opacity-45"
                >
                  ·
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  haptic('light')
                  item.onClick?.()
                }}
                style={{
                  color: ink,
                  transition:
                    'color 320ms cubic-bezier(0.22, 1, 0.36, 1), transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease',
                }}
                className="group relative border-0 bg-transparent px-1 py-1.5 text-[18px] sm:text-[20px] font-normal tracking-[0.04em] outline-none hover:opacity-100 active:scale-[0.96] cursor-pointer"
              >
                <span>{item.label}</span>
                <span
                  aria-hidden="true"
                  style={{ background: inkBright }}
                  className="pointer-events-none absolute right-1 bottom-0.5 left-1 h-[0.5px] origin-center scale-x-0 opacity-60 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100"
                />
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* Primary typographic CTA: Войти */}
        <button
          type="button"
          onClick={() => {
            haptic('medium')
            onStart?.()
          }}
          style={{
            color: inkBright,
            transition:
              'transform 400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 350ms ease',
          }}
          className="group relative inline-flex flex-col items-center border-0 bg-transparent px-6 py-2 outline-none active:scale-[0.96] cursor-pointer"
        >
          <span className="text-[22px] sm:text-[25px] italic font-normal tracking-[0.12em]">
            {t.enter}
          </span>
          {/* Delicate animated stem line below "Войти" (inspired by Quiet Table scroll cue) */}
          <span
            aria-hidden="true"
            style={{
              background: isDark
                ? 'rgba(213, 197, 171, 0.22)'
                : 'rgba(44, 37, 30, 0.2)',
            }}
            className="mt-2 block h-[26px] w-[1px] overflow-hidden"
          >
            <span
              style={{ background: inkBright }}
              className="block h-1/2 w-full animate-pulse"
            />
          </span>
        </button>
      </footer>
    </main>
  )
}
