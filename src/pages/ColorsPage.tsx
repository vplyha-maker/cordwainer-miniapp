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

// Компонент-визуализатор кроссовка
// Мы принимаем массив цветов, чтобы динамически красить детали
function SneakerSvg({ colors, isTetrad }: { colors: string[]; isTetrad: boolean }) {
  // Базовые нейтральные цвета для элементов, которые не должны сильно меняться
  const darkNeutral = '#25201C' // цвет поверхности
  const lightNeutral = '#e4eaf8' // цвет подошвы из оригинального SVG

  // Распределение цветов в зависимости от схемы
  // colors[0] - основной (60%)
  // colors[1] - поддерживающий (30%)
  // colors[last] - акцент (10%)
  const mainColor = colors[0]
  const secondaryColor = colors[1]
  const accentColor = colors[colors.length - 1]

  // Если тетрада, можно использовать colors[2] для мелких деталей,
  // но для этого SVG 3 активных цвета + нейтральные - оптимально.

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      viewBox="0 0 512 512"
      className="w-full h-auto max-h-[280px] md:max-h-[350px]"
    >
      {/* Фон внутри кроссовка (задняя часть галочки) */}
      <path
        d="m387.329 315.859-3.053 68.412 112.711-15.5v-26.256c-11.392-38.217-66.901-26.656-109.658-26.656"
        fill={secondaryColor} // Используем вторичный цвет
      />

      {/* Основной корпус (розовый в оригинале) - Красим в ОСНОВНОЙ цвет */}
      <path
        d="M166 95.727c-2.619-6.497-8.875-10.758-15.88-10.758H42.132c-4.691 0-8.463 3.769-8.548 8.459-1.261 69.511-17.023 192.334-17.023 290.845l370.768-8.552V315.86C246.242 272.128 181.92 135.211 166 95.727"
        fill={mainColor}
      />

      {/* Накладки (светло-розовый в оригинале) - Красим во ВТОРИЧНЫЙ цвет */}
      <path
        d="M166 95.727c-2.619-6.497-8.875-10.758-15.88-10.758h-33.124c41.934 124.159 136.457 224.064 269.15 276.32l1.182 1.303v-46.733C246.242 272.128 181.92 135.211 166 95.727"
        fill={secondaryColor}
      />

      {/* Логотип-круг большой - Красим в АКЦЕНТНЫЙ цвет */}
      <circle cx="110.624" cy="255.999" r="51.309" fill={accentColor} />

      {/* Логотип-круг малый - Чуть темнее акцентного для объема */}
      <circle cx="110.624" cy="255.999" r="25.655" fill={accentColor} fillOpacity={0.7} />

      {/* Деталь подошвы над основной подошвой (темно-розовая) - Красим во ВТОРИЧНЫЙ */}
      <path
        d="M206.89 349.046 17.749 333.635c-.728 17.301-1.189 34.318-1.189 50.638l230.891-6.169-19.151-19.151a34.2 34.2 0 0 0-21.41-9.907"
        fill={secondaryColor}
      />

      {/* Основная подошва (голубоватая) - Оставляем нейтральной светлой */}
      <path
        d="m503.658 375.863-6.671-33.348c-.831.167-78.747 33.204-143.864 33.204H16.56a8.55 8.55 0 0 0-8.552 8.551v25.655c0 9.445 7.658 17.103 17.103 17.103h328.01c51.716 0 108.891-26.009 136.804-30.977 9.448-1.68 15.615-10.779 13.733-20.188"
        fill={lightNeutral}
      />

      {/* Контуры, шнурки, галочка (черный) - Оставляем нейтральным темным */}
      <path
        d="m511.528 374.291-6.671-33.348c-.03-.146-.213-.818-.224-.855-11.124-36.949-54.483-34.879-92.75-33.047-8.17.39-15.899.75-23.327.788a285 285 0 0 1-31.079-11.814 8.015 8.015 0 0 0-3.78-8.832c-3.515-2.031-7.922-1.088-10.338 2.035a297 297 0 0 1-21.538-12.265c2.023-3.416 1.251-7.883-1.961-10.392a8.016 8.016 0 0 0-11.253 1.383l-.128.165a321 321 0 0 1-20.318-15.495c1.855-3.082 1.462-7.137-1.196-9.795a8.02 8.02 0 0 0-10.731-.548 357 357 0 0 1-18.908-18.514c3.294-2.868 3.695-7.857.869-11.209a8.017 8.017 0 0 0-11.297-.963l-.358.301a398 398 0 0 1-15.492-18.954 8.01 8.01 0 0 0 1.123-8.553c-1.836-3.917-6.432-5.643-10.38-3.971a437 437 0 0 1-15.372-23.166 8.018 8.018 0 0 0-8.032-13.786l-.134.061a448 448 0 0 1-13.636-25.783c3.555-1.844 5.253-6.092 3.806-9.933a8.02 8.02 0 0 0-10.328-4.678l-.222.083a355 355 0 0 1-4.426-10.477c-3.864-9.583-13.016-15.776-23.316-15.776H42.139c-8.969 0-16.401 7.325-16.563 16.329-.533 29.386-3.749 67.648-7.153 108.156-4.467 53.142-9.493 113.114-9.838 168.326C3.473 372.586 0 378.029 0 384.271v25.655c0 13.851 11.269 25.12 25.12 25.12h328.01c53.397 0 113.772-22.048 139.553-31.463 13.771-5.029 21.343-16.801 18.845-29.292m-98.879-51.234c37.303-1.784 63.537-1.617 73.689 15.013-37.218 14.314-67.886 21.792-90.984 25.655v-39.972c5.73-.152 11.574-.423 17.295-.696m74.535 65.465c-24.984 9.124-83.493 30.49-134.053 30.49H25.12c-5.01 0-9.086-4.076-9.086-9.086v-25.655c0-.295.239-.534.534-.534H42.22a8.017 8.017 0 0 0 0-16.034H24.63c.458-54.003 5.386-112.772 9.769-164.923 3.427-40.778 6.664-79.295 7.207-109.207.005-.335.234-.587.532-.587h67.1c1.487 4.109 4.224 11.314 8.338 20.808a8.02 8.02 0 0 0 7.361 4.832 8.019 8.019 0 0 0 7.352-11.207 388 388 0 0 1-5.929-14.433h23.767c3.724 0 7.039 2.252 8.445 5.739a370 370 0 0 0 4.273 10.136l-7.467 2.811a8.018 8.018 0 0 0 5.65 15.006l8.553-3.22a464 464 0 0 0 14.047 26.731l-7.324 3.343a8.017 8.017 0 0 0-3.965 10.622 8.02 8.02 0 0 0 7.299 4.691 8 8 0 0 0 3.323-.726l8.865-4.046a456 456 0 0 0 15.238 23.221l-7.532 3.531a8.018 8.018 0 0 0 6.807 14.519l10.354-4.854a418 418 0 0 0 17.621 21.701l-5.975 5.036a8.017 8.017 0 0 0 5.172 14.148 8 8 0 0 0 5.163-1.887l6.41-5.402a375 375 0 0 0 19.786 19.495l-6.403 6.403a8.016 8.016 0 0 0 0 11.337 8 8 0 0 0 5.669 2.348 8 8 0 0 0 5.669-2.348l7.178-7.179a338 338 0 0 0 21.621 16.615l-4.935 6.318a8.017 8.017 0 0 0 1.383 11.253 7.98 7.98 0 0 0 4.929 1.7 8 8 0 0 0 6.324-3.083l5.668-7.256a312 312 0 0 0 23.289 13.397l-4.65 8.053a8.017 8.017 0 1 0 13.885 8.016l5.226-9.052a301 301 0 0 0 29.6 11.604v28.939c-106.002-35.9-173.339-114.976-211.467-175.876a8.018 8.018 0 0 0-13.591 8.509c39.729 63.456 110.169 145.981 221.599 183.117-10.025 1.047-17.667 1.307-22.731 1.307H76.429a8.017 8.017 0 0 0 0 16.034H353.13c50.899 0 108.971-19.31 137.874-30.292l4.8 23.991c1.408 7.04-6.934 10.47-8.62 11.086"
        fill={darkNeutral}
      />

      {/* Мелкие штрихи объема на галочке - Красим во ВТОРИЧНЫЙ */}
      <path
        d="M137.791 155.109a8.015 8.015 0 0 0 10.877 3.204 8.02 8.02 0 0 0 3.205-10.875 523 523 0 0 1-7.733-14.749 8.017 8.017 0 0 0-14.319 7.215 538 538 0 0 0 7.97 15.205M110.635 315.325c32.713 0 59.326-26.613 59.326-59.326s-26.613-59.326-59.326-59.326-59.326 26.613-59.326 59.326 26.613 59.326 59.326 59.326m0-102.618c23.872 0 43.292 19.42 43.292 43.292s-19.42 43.292-43.292 43.292-43.292-19.422-43.292-43.292 19.421-43.292 43.292-43.292"
        fill={secondaryColor}
        fillOpacity={0.5}
      />
    </svg>
  )
}

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
      guideSchemesTitle: 'Схми і коли їх застосовувати',
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
        '• Верх: основний колір (60–70 %).\n• Підкладка і устілка: підтримуючий або світліший тон.\n• Підошва і підбор: часто нейтраль або акцент.\n• Фурнітура і рядок: найчистіший і найяскравіший акцент (5–10 %).\n• Чорний і білий — не «отсутність кольору», а потужні інструменти контрасту і форми.',
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
  // origin: half of wheel height (200/2=100 → 96px offset; 240/2=120 → \~116)
  // CSS variable via style on element is cleaner; use 96 on mobile, 116 on md via class
  const ratioLabels = isTetrad
    ? [t.main55, t.secondary20, t.secondary15, t.accent10]
    : [t.main60, t.secondary30, t.accent10]

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[var(--color-bg,#1C1816)] text-[var(--color-ink,#F5F1EA)] overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-2 flex items-center justify-between shrink-0">
        <h1 className="text-[20px] md:text-[24px] font-serif font-normal tracking-wide leading-none calc-page-title">
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
            className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-90 transition-transform"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 md:px-6 overflow-hidden calc-page-content">
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
              className={`px-3.5 py-1.5 md:py-2 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 transition-all ${
                scheme === s
                  ? 'bg-[var(--color-accent,#E4D00A)] text-[var(--color-bg,#1C1816)]'
                  : 'bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]'
              }`}
            >
              {t[s]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-none pb-6 scrollbar-hide">
          {/* Wheel */}
          <div className="flex flex-col items-center mb-6">
            <div
              ref={wheelRef}
              className="relative w-[200px] h-[200px] md:w-[240px] md:h-[240px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none"
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
                className="absolute top-1 left-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none origin-[50%_96px] md:origin-[50%_116px]"
                style={{
                  backgroundColor: pointerColor,
                  transform: `translateX(-50%) rotate(${pointerAngle}deg)`,
                }}
              />
            </div>
            <p className="mt-2 text-[12px] font-medium tracking-wide text-[var(--color-muted,#B9ACA0)]">
              {t.ittenLabel}
            </p>
          </div>

          {/* SNEAKER VISUALIZATION - ЗАМЕНА СТАРОЙ ПОЛОСКИ */}
          <div className="rounded-2xl p-4 mb-6 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] flex justify-center items-center shadow-inner-dark">
            <SneakerSvg colors={colors} isTetrad={isTetrad} />
          </div>

          {/* Tints */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
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
          <div className={`grid gap-2 md:gap-3 mb-6 ${isTetrad ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {colors.map((c, i) => (
              <div
                key={i}
                className="rounded-xl p-2.5 md:p-3 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]"
              >
                <div className="w-full h-10 md:h-12 rounded-md mb-1.5" style={{ backgroundColor: c }} />
                <div className="text-[11px] font-medium text-center">{ratioLabels[i]}</div>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div className="rounded-2xl p-3.5 md:p-5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
            <p className="text-[12px] md:text-[13px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/80 italic">
              {t.quote}
            </p>
            <p className="mt-1.5 text-[11px] text-[var(--color-accent,#E4D00A)] font-serif">
              Cordwainer
            </p>
          </div>
        </div>
      </div>

      {/* DESIGN GUIDE OVERLAY */}
      {showGuide && (
        <div className="absolute inset-0 z-50 flex flex-col bg-[var(--color-bg,#1C1816)] overscroll-none">
          <div className="px-4 md:px-6 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-[var(--color-border,rgba(255,255,255,0.08))] overflow-hidden">
            <h2 className="text-[18px] md:text-[20px] font-serif tracking-wide truncate pr-2">{t.guideTitle}</h2>
            <button
              onClick={() => setShowGuide(false)}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-medium bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-95 transition-transform shrink-0"
            >
              {t.guideClose}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-6 scrollbar-hide">
            <p className="text-[13px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/85">
              {t.guideIntro}
            </p>

            <div className="rounded-2xl p-4 md:p-5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.1))] overflow-hidden">
              <h3 className="text-[14px] font-serif tracking-wide text-[var(--color-accent,#E4D00A)] mb-2 overflow-hidden text-ellipsis whitespace-nowrap">
                {t.guideBalanceTitle}
              </h3>
              <p className="text-[12.5px] leading-relaxed whitespace-pre-line text-[var(--color-ink,#F5F1EA)]/80">
                {t.guideBalance}
              </p>
            </div>

            <div>
              <h3 className="text-[14px] font-serif tracking-wide text-[var(--color-accent,#E4D00A)] mb-3 overflow-hidden text-ellipsis whitespace-nowrap">
                {t.guideSchemesTitle}
              </h3>
              <div className="space-y-3 overflow-hidden">
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
                    className="rounded-xl p-3.5 md:p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.08))] overflow-hidden"
                  >
                    <div className="text-[12.5px] font-medium mb-1.5 text-[var(--color-ink,#F5F1EA)] overflow-hidden text-ellipsis whitespace-nowrap">
                      {item.title}
                    </div>
                    <p className="text-[12px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/75">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4 md:p-5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.1))] overflow-hidden">
              <h3 className="text-[14px] font-serif tracking-wide text-[var(--color-accent,#E4D00A)] mb-2 overflow-hidden text-ellipsis whitespace-nowrap">
                {t.guideFootwearTitle}
              </h3>
              <p className="text-[12.5px] leading-relaxed whitespace-pre-line text-[var(--color-ink,#F5F1EA)]/80">
                {t.guideFootwear}
              </p>
            </div>

            <div className="rounded-2xl p-4 md:p-5 border border-[var(--color-accent,#E4D00A)]/30 bg-[var(--color-accent,#E4D00A)]/5 overflow-hidden">
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
