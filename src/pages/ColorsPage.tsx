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

export function ColorsPage({ onBack, lang, setLang }: ColorsPageProps) {
  const [scheme, setScheme] = useState<Scheme>('complementary')
  const [baseHue, setBaseHue] = useState(0)
  const [whiteAmount, setWhiteAmount] = useState(0.05)
  const [blackAmount, setBlackAmount] = useState(0.05)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      white: 'К белому',
      black: 'К чёрному',
      pure: 'Чистый',
      ittenLabel: 'Круг Иттена',
      guideBtn: 'Дизайн-гид',
      guideTitle: 'Цвет в обувном дизайне',
      guideClose: 'Закрыть',
      guideIntro:
        'Круг Иттена — классический инструмент гармонизации цвета. В обуви он особенно важен: основная палитра почти всегда строится вокруг нейтралей (чёрный, белый, бежевый, серый), а цвет появляется точечно — в коже верха, подкладке, строчке, подошве или фурнитуре.',
      guideBalanceTitle: 'Правило баланса',
      guideBalance:
        '60 % — основной цвет (обычно нейтраль или доминирующий тон кожи).\n30 % — поддерживающий цвет (подкладка, язычок, задник).\n10 % — акцент (строчка, логотип, металлическая фурнитура, подошва).',
      guideSchemesTitle: 'Схемы и когда их применять',
      guideComplementary:
        'Комплементарная — два противоположных цвета. Даёт сильный, энергичный контраст. Хороша для спортивной и fashion-обуви, где нужен яркий акцент на нейтральном фоне.',
      guideAnalogous:
        'Аналогичная — соседние цвета на круге. Создаёт мягкий, спокойный переход. Идеальна для классической и повседневной обуви, когда хочется богатства тона без резкости.',
      guideTriadic:
        'Триадная — три цвета через 120°. Живая и сбалансированная. Подходит для капсульных коллекций и сезонных цветовых историй.',
      guideTetradic:
        'Тетрада (квадрат) — четыре цвета через 90°. Самая яркая схема. Используйте один доминирующий тон, два поддерживающих и один чистый акцент, иначе композиция станет пёстрой.',
      guideRectangular:
        'Тетрада (прямоугольник) — две комплементарные пары со сдвигом. Мягче квадрата, даёт больше пространства для нюансов. Отлично работает в премиальной и дизайнерской обуви.',
      guideSplit:
        'Контрастная триада — основной цвет + два соседних к его комплементу. Контраст есть, но мягче чистой комплементарной. Универсальный выбор для большинства моделей.',
      guideMono:
        'Монохромная — один цвет в разных тонах и насыщенностях. Самая элегантная и «дорогая» схема. Идеальна для минимализма, вечерней обуви и когда кожа сама по себе выразительна.',
      guideFootwearTitle: 'Специфика обуви',
      guideFootwear:
        '• Верх: основной цвет (60–70 %).\n• Подкладка и стелька: поддерживающий или более светлый тон.\n• Подошва и каблук: часто нейтраль или акцент.\n• Фурнитура и строчка: самый чистый и яркий акцент (5–10 %).\n• Чёрный и белый — не «отсутствие цвета», а мощные инструменты контраста и формы.',
      guideTip:
        'Совет: всегда проверяйте сочетание при разном освещении — дневном, тёплом искусственном и холодном. Кожа и замша меняют оттенок сильнее, чем кажется.',
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
      white: 'До білого',
      black: 'До чорного',
      pure: 'Чистий',
      ittenLabel: 'Коло Іттена',
      guideBtn: 'Дизайн-гід',
      guideTitle: 'Колір у дизайні взуття',
      guideClose: 'Закрити',
      guideIntro:
        'Коло Іттена — класичний інструмент гармонізації кольору. У взутті він особливо важливий: основна палітра майже завжди будується навколо нейтралей (чорний, білий, бежевий, сірий), а колір з’являється точково — у шкірі верху, підкладці, рядку, підошві чи фурнітурі.',
      guideBalanceTitle: 'Правило балансу',
      guideBalance:
        '60 % — основний колір (зазвичай нейтраль або домінуючий тон шкіри).\n30 % — підтримуючий колір (підкладка, язичок, задник).\n10 % — акцент (рядок, логотип, металева фурнітура, підошва).',
      guideSchemesTitle: 'Схеми і коли їх застосовувати',
      guideComplementary:
        'Комплементарна — два протилежні кольори. Дає сильний, енергійний контраст. Добре працює у спортивному та fashion-взутті, де потрібен яскравий акцент на нейтральному тлі.',
      guideAnalogous:
        'Аналогічна — сусідні кольори на колі. Створює м’який, спокійний перехід. Ідеальна для класичного та повсякденного взуття, коли хочеться багатства тону без різкості.',
      guideTriadic:
        'Тріадна — три кольори через 120°. Жива і збалансована. Підходить для капсульних колекцій і сезонних кольорових історій.',
      guideTetradic:
        'Тетрада (квадрат) — чотири кольори через 90°. Найяскравіша схема. Використовуйте один домінуючий тон, два підтримуючих і один чистий акцент, інакше композиція стане строкатою.',
      guideRectangular:
        'Тетрада (прямокутник) — дві комплементарні пари зі зсувом. М’якша за квадрат, дає більше простору для нюансів. Відмінно працює в преміальному та дизайнерському взутті.',
      guideSplit:
        'Контрастна тріада — основний колір + два сусідні до його комплементу. Контраст є, але м’якший за чисту комплементарну. Універсальний вибір для більшості моделей.',
      guideMono:
        'Монохромна — один колір у різних тонах і насиченостях. Найелегантніша і «дорога» схема. Ідеальна для мінімалізму, вечірнього взуття і коли шкіра сама по собі виразна.',
      guideFootwearTitle: 'Специфіка взуття',
      guideFootwear:
        '• Верх: основний колір (60–70 %).\n• Підкладка і устілка: підтримуючий або світліший тон.\n• Підошва і підбор: часто нейтраль або акцент.\n• Фурнітура і рядок: найчистіший і найяскравіший акцент (5–10 %).\n• Чорний і білий — не «відсутність кольору», а потужні інструменти контрасту і форми.',
      guideTip:
        'Порада: завжди перевіряйте поєднання при різному освітленні — денному, теплому штучному і холодному. Шкіра і замша змінюють відтінок сильніше, ніж здається.',
    },
  }[lang]

  const makeIttenColor = (
    hue: number,
    white: number,
    black: number,
    satBase = 85
  ): string => {
    const sat = Math.max(
      12,
      Math.min(92, satBase * (1 - white * 0.75) * (1 - black * 0.55))
    )
    const light = Math.max(
      18,
      Math.min(88, 50 * (1 - black * 0.9) * (1 - white * 0.45) + white * 42)
    )
    return `hsl(${((hue % 360) + 360) % 360}, ${sat.toFixed(1)}%, ${light.toFixed(1)}%)`
  }

  const getColors = useCallback((): string[] => {
    const h = ((baseHue % 360) + 360) % 360

    if (scheme === 'monochromatic') {
      return [
        makeIttenColor(h, whiteAmount * 0.15, blackAmount * 0.3, 82),
        makeIttenColor(h, whiteAmount + 0.45, blackAmount * 0.2, 45),
        makeIttenColor(h, whiteAmount * 0.05, blackAmount + 0.35, 70),
      ]
    }

    switch (scheme) {
      case 'complementary':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.55, blackAmount * 0.45, 78),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.1, blackAmount * 0.15, 88),
        ]
      case 'analogous':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 30) % 360, whiteAmount * 0.6, blackAmount * 0.35, 80),
          makeIttenColor((h - 30 + 360) % 360, whiteAmount * 0.15, blackAmount * 0.25, 86),
        ]
      case 'triadic':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 120) % 360, whiteAmount * 0.55, blackAmount * 0.4, 80),
          makeIttenColor((h + 240) % 360, whiteAmount * 0.12, blackAmount * 0.2, 86),
        ]
      case 'tetradic':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 90) % 360, whiteAmount * 0.5 + 0.1, blackAmount * 0.4 + 0.05, 72),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.45 + 0.12, blackAmount * 0.35 + 0.08, 68),
          makeIttenColor((h + 270) % 360, whiteAmount * 0.08, blackAmount * 0.12, 88),
        ]
      case 'rectangular':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 60) % 360, whiteAmount * 0.45 + 0.08, blackAmount * 0.35 + 0.05, 75),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.45 + 0.12, blackAmount * 0.35 + 0.08, 70),
          makeIttenColor((h + 240) % 360, whiteAmount * 0.08, blackAmount * 0.12, 88),
        ]
      case 'split-complementary':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 150) % 360, whiteAmount * 0.55, blackAmount * 0.4, 80),
          makeIttenColor((h + 210) % 360, whiteAmount * 0.12, blackAmount * 0.2, 86),
        ]
      default:
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.55, blackAmount * 0.45, 78),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.1, blackAmount * 0.15, 88),
        ]
    }
  }, [baseHue, whiteAmount, blackAmount, scheme])

  const colors = getColors()
  const isTetrad = scheme === 'tetradic' || scheme === 'rectangular'

  const wheelBackground = `conic-gradient(
    from 0deg,
    hsl(0, 90%, 50%),
    hsl(30, 90%, 50%),
    hsl(60, 90%, 50%),
    hsl(90, 90%, 50%),
    hsl(120, 90%, 50%),
    hsl(150, 90%, 50%),
    hsl(180, 90%, 50%),
    hsl(210, 90%, 50%),
    hsl(240, 90%, 50%),
    hsl(270, 90%, 50%),
    hsl(300, 90%, 50%),
    hsl(330, 90%, 50%),
    hsl(360, 90%, 50%)
  )`

  const pointerColor = `hsl(${baseHue}, 85%, 50%)`

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

  const pointerAngle = baseHue

  const ratioLabels = isTetrad
    ? [t.main55, t.secondary20, t.secondary15, t.accent10]
    : [t.main60, t.secondary30, t.accent10]

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[var(--color-bg,#1C1816)] text-[var(--color-ink,#F5F1EA)] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
        <h1 className="text-[20px] font-serif font-normal tracking-wide leading-none">
          {t.title}
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(true)}
            className="px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide border border-[var(--color-border,rgba(255,255,255,0.18))] bg-[var(--color-surface,#25201C)] active:scale-95 transition-transform"
          >
            {t.guideBtn}
          </button>

          <div className="flex rounded-full p-0.5 border border-[var(--color-border,rgba(255,255,255,0.12))] bg-[var(--color-surface,#25201C)]">
            <button
              onClick={() => handleLangChange('ru')}
              className={`lang-toggle ${lang === 'ru' ? 'active' : 'inactive'}`}
            >
              RU
            </button>
            <button
              onClick={() => handleLangChange('uk')}
              className={`lang-toggle ${lang === 'uk' ? 'active' : 'inactive'}`}
            >
              UA
            </button>
          </div>

          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-90 transition-transform"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 overflow-hidden">
        {/* Schemes */}
        <div className="flex overflow-x-auto gap-2 pb-3 mb-3 scrollbar-hide shrink-0">
          {(
            [
              'complementary',
              'analogous',
              'triadic',
              'tetradic',
              'rectangular',
              'split-complementary',
              'monochromatic',
            ] as Scheme[]
          ).map((s) => (
            <button
              key={s}
              onClick={() => setScheme(s)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 transition-all ${
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
              className="relative w-[200px] h-[200px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none"
              style={{
                background: wheelBackground,
                boxShadow: '0 0 0 8px var(--color-surface), 0 8px 28px rgba(0,0,0,0.4)',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div
                className="absolute inset-[24%] rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 32%,
                    white 0%,
                    ${colors[0]} 42%,
                    #111 95%)`,
                  boxShadow:
                    'inset -4px -4px 12px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25)',
                }}
              />
              <div
                className="absolute top-1 left-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
                style={{
                  backgroundColor: pointerColor,
                  transform: `translateX(-50%) rotate(${pointerAngle}deg)`,
                  transformOrigin: '50% 96px',
                }}
              />
            </div>
            <p className="mt-2 text-[12px] font-medium tracking-wide text-[var(--color-muted,#B9ACA0)]">
              {t.ittenLabel}
            </p>
          </div>

          {/* Tints */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="flex justify-between text-[11px] mb-1 text-[var(--color-muted,#B9ACA0)]">
                <span>{t.pure}</span>
                <span>{t.white}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={whiteAmount}
                onChange={(e) => setWhiteAmount(parseFloat(e.target.value))}
                className="w-full accent-[var(--color-accent,#E4D00A)] h-1.5"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1 text-[var(--color-muted,#B9ACA0)]">
                <span>{t.pure}</span>
                <span>{t.black}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={blackAmount}
                onChange={(e) => setBlackAmount(parseFloat(e.target.value))}
                className="w-full accent-[var(--color-accent,#E4D00A)] h-1.5"
              />
            </div>
          </div>

          {/* Colour blocks */}
          <div className={`grid gap-2 mb-4 ${isTetrad ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {colors.map((c, i) => (
              <div
                key={i}
                className="rounded-xl p-2.5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]"
              >
                <div className="w-full h-10 rounded-md mb-1.5" style={{ backgroundColor: c }} />
                <div className="text-[11px] font-medium text-center">{ratioLabels[i]}</div>
              </div>
            ))}
          </div>

          {/* Proportional bar */}
          <div className="rounded-2xl overflow-hidden mb-4 border border-[var(--color-border,rgba(255,255,255,0.12))] h-14 flex">
            {colors.map((c, i) => {
              const flex = isTetrad ? [11, 4, 3, 2][i] : [6, 3, 1][i]
              return (
                <div
                  key={i}
                  style={{ backgroundColor: c, flex }}
                  className="h-full transition-colors duration-200"
                />
              )
            })}
          </div>

          {/* Quote */}
          <div className="rounded-2xl p-3.5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
            <p className="text-[12px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/80 italic">
              {t.quote}
            </p>
            <p className="mt-1.5 text-[11px] text-[var(--color-accent,#E4D00A)] font-serif">
              Cordwainer
            </p>
          </div>
        </div>
      </div>

      {/* ========== DESIGN GUIDE OVERLAY ========== */}
      {showGuide && (
        <div className="absolute inset-0 z-50 flex flex-col bg-[var(--color-bg,#1C1816)]">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-[var(--color-border,rgba(255,255,255,0.08))]">
            <h2 className="text-[18px] font-serif tracking-wide">{t.guideTitle}</h2>
            <button
              onClick={() => setShowGuide(false)}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-medium bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-95 transition-transform"
            >
              {t.guideClose}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
            <p className="text-[13px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/85">
              {t.guideIntro}
            </p>

            <div className="rounded-2xl p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.1))]">
              <h3 className="text-[14px] font-serif tracking-wide text-[var(--color-accent,#E4D00A)] mb-2">
                {t.guideBalanceTitle}
              </h3>
              <p className="text-[12.5px] leading-relaxed whitespace-pre-line text-[var(--color-ink,#F5F1EA)]/80">
                {t.guideBalance}
              </p>
            </div>

            <div>
              <h3 className="text-[14px] font-serif tracking-wide text-[var(--color-accent,#E4D00A)] mb-3">
                {t.guideSchemesTitle}
              </h3>
              <div className="space-y-3">
                {[
                  { title: t.complementary, text: t.guideComplementary },
                  { title: t.analogous, text: t.guideAnalogous },
                  { title: t.triadic, text: t.guideTriadic },
                  { title: t.tetradic, text: t.guideTetradic },
                  { title: t.rectangular, text: t.guideRectangular },
                  { title: t['split-complementary'], text: t.guideSplit },
                  { title: t.monochromatic, text: t.guideMono },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl p-3.5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.08))]"
                  >
                    <div className="text-[12.5px] font-medium mb-1.5 text-[var(--color-ink,#F5F1EA)]">
                      {item.title}
                    </div>
                    <p className="text-[12px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/75">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.1))]">
              <h3 className="text-[14px] font-serif tracking-wide text-[var(--color-accent,#E4D00A)] mb-2">
                {t.guideFootwearTitle}
              </h3>
              <p className="text-[12.5px] leading-relaxed whitespace-pre-line text-[var(--color-ink,#F5F1EA)]/80">
                {t.guideFootwear}
              </p>
            </div>

            <div className="rounded-2xl p-4 border border-[var(--color-accent,#E4D00A)]/30 bg-[var(--color-accent,#E4D00A)]/5">
              <p className="text-[12.5px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/90">
                {t.guideTip}
              </p>
            </div>

            <div className="h-4" />
          </div>
        </div>
      )}
    </div>
  )
}
