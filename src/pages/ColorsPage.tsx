import { useState, useEffect, useRef, useCallback } from 'react'
import type { Lang } from '../App'

type ColorsPageProps = {
  onBack: () => void
  lang: Lang
  setLang: (lang: Lang) => void
}

type Scheme =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'rectangular'
  | 'split-complementary'
  | 'monochromatic'

type ColorModel = 'itten' | 'ostwald'

export function ColorsPage({ onBack, lang, setLang }: ColorsPageProps) {
  const [scheme, setScheme] = useState<Scheme>('complementary')
  const [model, setModel] = useState<ColorModel>('itten')
  const [baseHue, setBaseHue] = useState(0)
  const [whiteAmount, setWhiteAmount] = useState(0.08)
  const [blackAmount, setBlackAmount] = useState(0.08)
  const [showGuide, setShowGuide] = useState(false)

  const wheelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const rafId = useRef<number | null>(null)
  const pendingValue = useRef<number | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('app_lang') as Lang | null
    if (saved === 'ru' || saved === 'uk') {
      if (saved !== lang) setLang(saved)
    }
  }, [])

  const handleLangChange = (newLang: Lang) => {
    localStorage.setItem('app_lang', newLang)
    setLang(newLang)
  }

  const t = {
    ru: {
      title: 'Цвета и отделка',
      complementary: 'Комплементарная',
      analogous: 'Аналогичная',
      triadic: 'Триадная',
      tetradic: 'Тетрада (квадрат)',
      rectangular: 'Тетрада (прямоугольник)',
      'split-complementary': 'Контрастная триада',
      monochromatic: 'Монохромная',
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      quote: '«Цвет — это душа обуви.»',
      white: 'Белый (W)',
      black: 'Чёрный (B)',
      pure: 'Чистый',
      ittenLabel: 'Круг Иттена · 12 секторов',
      ostwaldLabel: 'Круг Оствальда · 24 сектора',
      modelItten: 'Иттен',
      modelOstwald: 'Оствальд',
      guideBtn: 'Дизайн-гид',
      guideTitle: 'Цвет в обувном дизайне',
      guideClose: 'Закрыть',
      guideIntro:
        'В обувном дизайне работают две классические системы. Круг Иттена (12 секторов) — инструмент контрастов и акцентов. Круг Оствальда (24 сектора + формула C + W + B = 1) — инструмент тональности, патинирования и благородных полутонов кожи.',
      guideIttenTitle: 'Круг Иттена',
      guideItten:
        'Лучший выбор для подбора контрастов и акцентов: цвет верха + подкладка + рант + контрастная строчка по правилу 60/30/10. Ярко-спектральные сочетания.',
      guideOstwaldTitle: 'Круг Оствальда (Farbkunde, 1923)',
      guideOstwald:
        'Любой цвет = Чистый пигмент (C) + Белый (W) + Чёрный (B), где C + W + B = 1. Это ближе всего к реальному смешиванию аппретур и красок для кожи. Основная работа идёт с глухими, замутнёнными оттенками: коньяк, бордо, тауп, олива, терракота. Идеален для градации одного тона и подбора материалов «в тон».',
      guideBalanceTitle: 'Правило баланса',
      guideBalance:
        '60 % — основной цвет (нейтраль или доминирующий тон кожи).\n30 % — поддерживающий (подкладка, язычок, задник).\n10 % — акцент (строчка, логотип, фурнитура, подошва).',
      guideSchemesTitle: 'Схемы и применение',
      guideComplementary: 'Комплементарная — сильный контраст. Спорт и fashion.',
      guideAnalogous: 'Аналогичная — мягкий переход. Классика и casual.',
      guideTriadic: 'Триадная — живая и сбалансированная. Капсульные коллекции.',
      guideTetradic: 'Тетрада (квадрат) — самая яркая. Один доминант + два поддержки + акцент.',
      guideRectangular: 'Тетрада (прямоугольник) — мягче квадрата. Премиум и дизайн.',
      guideSplit: 'Контрастная триада — универсальный выбор.',
      guideMono: 'Монохромная — самая элегантная. Минимализм и выразительная кожа.',
      guideFootwearTitle: 'Специфика обуви',
      guideFootwear:
        '• Верх: 60–70 %.\n• Подкладка и стелька: поддерживающий или светлее.\n• Подошва и каблук: нейтраль или акцент.\n• Фурнитура и строчка: самый чистый акцент 5–10 %.\n• Чёрный и белый — инструменты формы, а не «отсутствие цвета».',
      guideTip:
        'Всегда проверяйте сочетание при дневном, тёплом и холодном освещении. Кожа и замша меняют оттенок сильнее, чем кажется.',
    },
    uk: {
      title: 'Кольори та оздоблення',
      complementary: 'Комплементарна',
      analogous: 'Аналогічна',
      triadic: 'Тріадна',
      tetradic: 'Тетрада (квадрат)',
      rectangular: 'Тетрада (прямокутник)',
      'split-complementary': 'Контрастна тріада',
      monochromatic: 'Монохромна',
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      quote: '«Колір — це душа взуття.»',
      white: 'Білий (W)',
      black: 'Чорний (B)',
      pure: 'Чистий',
      ittenLabel: 'Коло Іттена · 12 секторів',
      ostwaldLabel: 'Коло Оствальда · 24 сектори',
      modelItten: 'Іттен',
      modelOstwald: 'Оствальд',
      guideBtn: 'Дизайн-гід',
      guideTitle: 'Колір у дизайні взуття',
      guideClose: 'Закрити',
      guideIntro:
        'У дизайні взуття працюють дві класичні системи. Коло Іттена (12 секторів) — інструмент контрастів і акцентів. Коло Оствальда (24 сектори + формула C + W + B = 1) — інструмент тональності, патинування і шляхетних півтонів шкіри.',
      guideIttenTitle: 'Коло Іттена',
      guideItten:
        'Найкращий вибір для підбору контрастів і акцентів: колір верху + підкладка + рант + контрастний рядок за правилом 60/30/10. Яскраво-спектральні поєднання.',
      guideOstwaldTitle: 'Коло Оствальда (Farbkunde, 1923)',
      guideOstwald:
        'Будь-який колір = Чистий пігмент (C) + Білий (W) + Чорний (B), де C + W + B = 1. Це найближче до реального змішування апретур і фарб для шкіри. Основна робота йде з глухими, замученими відтінками: коньяк, бордо, тауп, олива, теракота. Ідеальний для градації одного тону і підбору матеріалів «в тон».',
      guideBalanceTitle: 'Правило балансу',
      guideBalance:
        '60 % — основний колір (нейтраль або домінуючий тон шкіри).\n30 % — підтримуючий (підкладка, язичок, задник).\n10 % — акцент (рядок, логотип, фурнітура, підошва).',
      guideSchemesTitle: 'Схеми і застосування',
      guideComplementary: 'Комплементарна — сильний контраст. Спорт і fashion.',
      guideAnalogous: 'Аналогічна — м’який перехід. Класика і casual.',
      guideTriadic: 'Тріадна — жива і збалансована. Капсульні колекції.',
      guideTetradic: 'Тетрада (квадрат) — найяскравіша. Один домінант + два підтримки + акцент.',
      guideRectangular: 'Тетрада (прямокутник) — м’якша за квадрат. Преміум і дизайн.',
      guideSplit: 'Контрастна тріада — універсальний вибір.',
      guideMono: 'Монохромна — найелегантніша. Мінімалізм і виразна шкіра.',
      guideFootwearTitle: 'Специфіка взуття',
      guideFootwear:
        '• Верх: 60–70 %.\n• Підкладка і устілка: підтримуючий або світліший.\n• Підошва і підбор: нейтраль або акцент.\n• Фурнітура і рядок: найчистіший акцент 5–10 %.\n• Чорний і білий — інструменти форми, а не «відсутність кольору».',
      guideTip:
        'Завжди перевіряйте поєднання при денному, теплому і холодному освітленні. Шкіра і замша змінюють відтінок сильніше, ніж здається.',
    },
  }[lang]

  // ─── Itten (spectral, high chroma) ───────────────────────────────────────
  const makeIttenColor = (hue: number, w: number, b: number, satBase = 85): string => {
    const sat = Math.max(12, Math.min(92, satBase * (1 - w * 0.75) * (1 - b * 0.55)))
    const light = Math.max(18, Math.min(88, 50 * (1 - b * 0.9) * (1 - w * 0.45) + w * 42))
    return `hsl(${((hue % 360) + 360) % 360}, ${sat.toFixed(1)}%, ${light.toFixed(1)}%)`
  }

  // ─── Ostwald (C + W + B = 1) — professional approximation for leather ─────
  // Based on Farbkunde (1923): full colour content drives chroma,
  // white and black contents control the monochromatic triangle.
  const makeOstwaldColor = (hue: number, w: number, b: number): string => {
    const W = Math.min(1, Math.max(0, w))
    const B = Math.min(1, Math.max(0, b))
    const C = Math.max(0, 1 - W - B) // pure colour content

    // Saturation is proportional to pure content (Ostwald principle)
    const sat = Math.max(4, Math.min(88, C * 82 + 4))

    // Lightness: white raises, black lowers, pure colour contributes mid-value.
    // Approximation of the Ostwald triangle projection onto HSL.
    const light = Math.max(
      8,
      Math.min(92, W * 92 + C * 48 * (1 - B * 0.35) + (1 - W - C) * 12)
    )

    return `hsl(${((hue % 360) + 360) % 360}, ${sat.toFixed(1)}%, ${light.toFixed(1)}%)`
  }

  const makeColor = useCallback(
    (hue: number, w: number, b: number, satBase?: number) => {
      return model === 'ostwald'
        ? makeOstwaldColor(hue, w, b)
        : makeIttenColor(hue, w, b, satBase)
    },
    [model]
  )

  const getColors = useCallback((): string[] => {
    const h = ((baseHue % 360) + 360) % 360
    const step = model === 'ostwald' ? 15 : 30 // 24 vs 12 sectors

    if (scheme === 'monochromatic') {
      return [
        makeColor(h, whiteAmount * 0.12, blackAmount * 0.25),
        makeColor(h, whiteAmount + 0.42, blackAmount * 0.15),
        makeColor(h, whiteAmount * 0.04, blackAmount + 0.38),
      ]
    }

    switch (scheme) {
      case 'complementary':
        return [
          makeColor(h, whiteAmount, blackAmount),
          makeColor((h + 180) % 360, whiteAmount * 0.5, blackAmount * 0.4),
          makeColor((h + 180) % 360, whiteAmount * 0.08, blackAmount * 0.12),
        ]
      case 'analogous':
        return [
          makeColor(h, whiteAmount, blackAmount),
          makeColor((h + step) % 360, whiteAmount * 0.55, blackAmount * 0.3),
          makeColor((h - step + 360) % 360, whiteAmount * 0.12, blackAmount * 0.2),
        ]
      case 'triadic':
        return [
          makeColor(h, whiteAmount, blackAmount),
          makeColor((h + 120) % 360, whiteAmount * 0.5, blackAmount * 0.35),
          makeColor((h + 240) % 360, whiteAmount * 0.1, blackAmount * 0.18),
        ]
      case 'tetradic':
        return [
          makeColor(h, whiteAmount, blackAmount),
          makeColor((h + 90) % 360, whiteAmount * 0.45 + 0.08, blackAmount * 0.35 + 0.05),
          makeColor((h + 180) % 360, whiteAmount * 0.4 + 0.1, blackAmount * 0.3 + 0.07),
          makeColor((h + 270) % 360, whiteAmount * 0.06, blackAmount * 0.1),
        ]
      case 'rectangular':
        return [
          makeColor(h, whiteAmount, blackAmount),
          makeColor((h + 60) % 360, whiteAmount * 0.4 + 0.06, blackAmount * 0.3 + 0.04),
          makeColor((h + 180) % 360, whiteAmount * 0.4 + 0.1, blackAmount * 0.3 + 0.07),
          makeColor((h + 240) % 360, whiteAmount * 0.06, blackAmount * 0.1),
        ]
      case 'split-complementary':
        return [
          makeColor(h, whiteAmount, blackAmount),
          makeColor((h + 150) % 360, whiteAmount * 0.5, blackAmount * 0.35),
          makeColor((h + 210) % 360, whiteAmount * 0.1, blackAmount * 0.18),
        ]
      default:
        return [
          makeColor(h, whiteAmount, blackAmount),
          makeColor((h + 180) % 360, whiteAmount * 0.5, blackAmount * 0.4),
          makeColor((h + 180) % 360, whiteAmount * 0.08, blackAmount * 0.12),
        ]
    }
  }, [baseHue, whiteAmount, blackAmount, scheme, model, makeColor])

  const colors = getColors()
  const isTetrad = scheme === 'tetradic' || scheme === 'rectangular'

  // Wheel backgrounds
  const ittenWheel = `conic-gradient(from 0deg,
    hsl(0,90%,50%),hsl(30,90%,50%),hsl(60,90%,50%),hsl(90,90%,50%),
    hsl(120,90%,50%),hsl(150,90%,50%),hsl(180,90%,50%),hsl(210,90%,50%),
    hsl(240,90%,50%),hsl(270,90%,50%),hsl(300,90%,50%),hsl(330,90%,50%),hsl(360,90%,50%))`

  const ostwaldWheel = `conic-gradient(from 0deg,
    hsl(0,75%,48%),hsl(15,75%,48%),hsl(30,75%,48%),hsl(45,75%,48%),
    hsl(60,75%,48%),hsl(75,75%,48%),hsl(90,75%,48%),hsl(105,75%,48%),
    hsl(120,75%,48%),hsl(135,75%,48%),hsl(150,75%,48%),hsl(165,75%,48%),
    hsl(180,75%,48%),hsl(195,75%,48%),hsl(210,75%,48%),hsl(225,75%,48%),
    hsl(240,75%,48%),hsl(255,75%,48%),hsl(270,75%,48%),hsl(285,75%,48%),
    hsl(300,75%,48%),hsl(315,75%,48%),hsl(330,75%,48%),hsl(345,75%,48%),hsl(360,75%,48%))`

  const wheelBackground = model === 'ostwald' ? ostwaldWheel : ittenWheel
  const pointerColor = model === 'ostwald'
    ? `hsl(${baseHue}, 70%, 46%)`
    : `hsl(${baseHue}, 85%, 50%)`

  const updateFromAngle = useCallback((clientX: number, clientY: number) => {
    const el = wheelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy
    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    angle = (angle + 90 + 360) % 360
    pendingValue.current = Math.round(angle)

    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        if (pendingValue.current !== null) {
          setBaseHue(pendingValue.current)
          pendingValue.current = null
        }
        rafId.current = null
      })
    }
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updateFromAngle(e.clientX, e.clientY)
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    updateFromAngle(e.clientX, e.clientY)
  }
  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const ratioLabels = isTetrad
    ? [t.main55, t.secondary20, t.secondary15, t.accent10]
    : [t.main60, t.secondary30, t.accent10]

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[var(--color-bg,#1C1816)] text-[var(--color-ink,#F5F1EA)] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0 gap-2">
        <h1 className="text-[18px] font-serif font-normal tracking-wide leading-none shrink-0">
          {t.title}
        </h1>

        <div className="flex items-center gap-1.5">
          {/* Model switcher */}
          <div className="flex rounded-full p-0.5 border border-[var(--color-border,rgba(255,255,255,0.14))] bg-[var(--color-surface,#25201C)]">
            <button
              onClick={() => setModel('itten')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                model === 'itten'
                  ? 'bg-[var(--color-accent,#E4D00A)] text-[var(--color-bg,#1C1816)]'
                  : 'text-[var(--color-muted,#B9ACA0)]'
              }`}
            >
              {t.modelItten}
            </button>
            <button
              onClick={() => setModel('ostwald')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                model === 'ostwald'
                  ? 'bg-[var(--color-accent,#E4D00A)] text-[var(--color-bg,#1C1816)]'
                  : 'text-[var(--color-muted,#B9ACA0)]'
              }`}
            >
              {t.modelOstwald}
            </button>
          </div>

          <button
            onClick={() => setShowGuide(true)}
            className="px-2.5 py-1.5 rounded-full text-[10px] font-medium tracking-wide border border-[var(--color-border,rgba(255,255,255,0.18))] bg-[var(--color-surface,#25201C)] active:scale-95 transition-transform"
          >
            {t.guideBtn}
          </button>

          <div className="flex rounded-full p-0.5 border border-[var(--color-border,rgba(255,255,255,0.12))] bg-[var(--color-surface,#25201C)]">
            <button onClick={() => handleLangChange('ru')} className={`lang-toggle ${lang === 'ru' ? 'active' : 'inactive'}`}>RU</button>
            <button onClick={() => handleLangChange('uk')} className={`lang-toggle ${lang === 'uk' ? 'active' : 'inactive'}`}>UA</button>
          </div>

          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-90 transition-transform"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 overflow-hidden">
        <div className="flex overflow-x-auto gap-2 pb-3 mb-2 scrollbar-hide shrink-0">
          {(['complementary','analogous','triadic','tetradic','rectangular','split-complementary','monochromatic'] as Scheme[]).map((s) => (
            <button
              key={s}
              onClick={() => setScheme(s)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all ${
                scheme === s
                  ? 'bg-[var(--color-accent,#E4D00A)] text-[var(--color-bg,#1C1816)]'
                  : 'bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]'
              }`}
            >
              {t[s]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-none pb-6">
          {/* Wheel */}
          <div className="flex flex-col items-center mb-2">
            <div
              ref={wheelRef}
              className="relative w-[196px] h-[196px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none"
              style={{
                background: wheelBackground,
                boxShadow: '0 0 0 7px var(--color-surface), 0 8px 28px rgba(0,0,0,0.4)',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div
                className="absolute inset-[24%] rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 32%, white 0%, ${colors[0]} 42%, #111 95%)`,
                  boxShadow: 'inset -4px -4px 12px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25)',
                }}
              />
              <div
                className="absolute top-1 left-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md pointer-events-none"
                style={{
                  backgroundColor: pointerColor,
                  transform: `translateX(-50%) rotate(${baseHue}deg)`,
                  transformOrigin: '50% 94px',
                }}
              />
            </div>
            <p className="mt-2 text-[11px] font-medium tracking-wide text-[var(--color-muted,#B9ACA0)]">
              {model === 'ostwald' ? t.ostwaldLabel : t.ittenLabel}
            </p>
          </div>

          {/* W / B sliders */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="flex justify-between text-[10px] mb-1 text-[var(--color-muted,#B9ACA0)]">
                <span>{t.pure}</span>
                <span>{t.white}</span>
              </div>
              <input type="range" min="0" max="1" step="0.01" value={whiteAmount}
                onChange={(e) => setWhiteAmount(parseFloat(e.target.value))}
                className="w-full accent-[var(--color-accent,#E4D00A)] h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1 text-[var(--color-muted,#B9ACA0)]">
                <span>{t.pure}</span>
                <span>{t.black}</span>
              </div>
              <input type="range" min="0" max="1" step="0.01" value={blackAmount}
                onChange={(e) => setBlackAmount(parseFloat(e.target.value))}
                className="w-full accent-[var(--color-accent,#E4D00A)] h-1.5" />
            </div>
          </div>

          {/* Blocks */}
          <div className={`grid gap-2 mb-4 ${isTetrad ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {colors.map((c, i) => (
              <div key={i} className="rounded-xl p-2.5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
                <div className="w-full h-9 rounded-md mb-1.5" style={{ backgroundColor: c }} />
                <div className="text-[10px] font-medium text-center">{ratioLabels[i]}</div>
              </div>
            ))}
          </div>

          {/* Bar */}
          <div className="rounded-2xl overflow-hidden mb-4 border border-[var(--color-border,rgba(255,255,255,0.12))] h-12 flex">
            {colors.map((c, i) => {
              const flex = isTetrad ? [11, 4, 3, 2][i] : [6, 3, 1][i]
              return <div key={i} style={{ backgroundColor: c, flex }} className="h-full transition-colors duration-200" />
            })}
          </div>

          {/* Quote */}
          <div className="rounded-2xl p-3.5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
            <p className="text-[12px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/80 italic">{t.quote}</p>
            <p className="mt-1.5 text-[11px] text-[var(--color-accent,#E4D00A)] font-serif">Cordwainer</p>
          </div>
        </div>
      </div>

      {/* Guide Overlay */}
      {showGuide && (
        <div className="absolute inset-0 z-50 flex flex-col bg-[var(--color-bg,#1C1816)]">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-[var(--color-border,rgba(255,255,255,0.08))]">
            <h2 className="text-[17px] font-serif tracking-wide">{t.guideTitle}</h2>
            <button onClick={() => setShowGuide(false)}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-medium bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-95 transition-transform">
              {t.guideClose}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
            <p className="text-[13px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/85">{t.guideIntro}</p>

            <div className="rounded-2xl p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.1))]">
              <h3 className="text-[13px] font-serif tracking-wide text-[var(--color-accent,#E4D00A)] mb-1.5">{t.guideIttenTitle}</h3>
              <p className="text-[12px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/80">{t.guideItten}</p>
            </div>

            <div className="rounded-2xl p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.1))]">
              <h3 className="text-[13px] font-serif tracking-wide text-[var(--color-accent,#E4D00A)] mb-1.5">{t.guideOstwaldTitle}</h3>
              <p className="text-[12px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/80">{t.guideOstwald}</p>
            </div>

            <div className="rounded-2xl p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.1))]">
              <h3 className="text-[13px] font-serif tracking-wide text-[var(--color-accent,#E4D00A)] mb-1.5">{t.guideBalanceTitle}</h3>
              <p className="text-[12px] leading-relaxed whitespace-pre-line text-[var(--color-ink,#F5F1EA)]/80">{t.guideBalance}</p>
            </div>

            <div>
              <h3 className="text-[13px] font-serif tracking-wide text-[var(--color-accent,#E4D00A)] mb-2.5">{t.guideSchemesTitle}</h3>
              <div className="space-y-2.5">
                {[
                  { title: t.complementary, text: t.guideComplementary },
                  { title: t.analogous, text: t.guideAnalogous },
                  { title: t.triadic, text: t.guideTriadic },
                  { title: t.tetradic, text: t.guideTetradic },
                  { title: t.rectangular, text: t.guideRectangular },
                  { title: t['split-complementary'], text: t.guideSplit },
                  { title: t.monochromatic, text: t.guideMono },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl p-3 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.08))]">
                    <div className="text-[12px] font-medium mb-1">{item.title}</div>
                    <p className="text-[11.5px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/75">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.1))]">
              <h3 className="text-[13px] font-serif tracking-wide text-[var(--color-accent,#E4D00A)] mb-1.5">{t.guideFootwearTitle}</h3>
              <p className="text-[12px] leading-relaxed whitespace-pre-line text-[var(--color-ink,#F5F1EA)]/80">{t.guideFootwear}</p>
            </div>

            <div className="rounded-2xl p-4 border border-[var(--color-accent,#E4D00A)]/30 bg-[var(--color-accent,#E4D00A)]/5">
              <p className="text-[12px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/90">{t.guideTip}</p>
            </div>
            <div className="h-6" />
          </div>
        </div>
      )}
    </div>
  )
 }
