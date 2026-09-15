import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { motion } from 'framer-motion' // Добавили импорт motion
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

function SneakerSvg({ colors, isDark }: { colors: string[]; isDark: boolean }) {
  const darkNeutral = isDark ? '#1C1816' : '#EAE6DF'
  const lightNeutral = isDark ? '#2A2420' : '#F5F1EA'

  const mainColor = colors[0]
  const secondaryColor = colors[1]
  const accentColor = colors[colors.length - 1]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      viewBox="0 0 512 512"
      className="w-full h-auto max-h-[240px] md:max-h-[320px] transition-all duration-700"
      style={{ filter: isDark ? 'drop-shadow(0 20px 30px rgba(0,0,0,0.5))' : 'drop-shadow(0 20px 30px rgba(0,0,0,0.1))' }}
    >
      <path
        d="m387.329 315.859-3.053 68.412 112.711-15.5v-26.256c-11.392-38.217-66.901-26.656-109.658-26.656"
        fill={secondaryColor} 
        style={{ transition: 'fill 0.5s ease' }}
      />
      <path
        d="M166 95.727c-2.619-6.497-8.875-10.758-15.88-10.758H42.132c-4.691 0-8.463 3.769-8.548 8.459-1.261 69.511-17.023 192.334-17.023 290.845l370.768-8.552V315.86C246.242 272.128 181.92 135.211 166 95.727"
        fill={mainColor}
        style={{ transition: 'fill 0.5s ease' }}
      />
      <path
        d="M166 95.727c-2.619-6.497-8.875-10.758-15.88-10.758h-33.124c41.934 124.159 136.457 224.064 269.15 276.32l1.182 1.303v-46.733C246.242 272.128 181.92 135.211 166 95.727"
        fill={secondaryColor}
        style={{ transition: 'fill 0.5s ease' }}
      />
      <circle cx="110.624" cy="255.999" r="51.309" fill={accentColor} style={{ transition: 'fill 0.5s ease' }} />
      <circle cx="110.624" cy="255.999" r="25.655" fill={accentColor} fillOpacity={0.7} style={{ transition: 'fill 0.5s ease' }} />
      <path
        d="M206.89 349.046 17.749 333.635c-.728 17.301-1.189 34.318-1.189 50.638l230.891-6.169-19.151-19.151a34.2 34.2 0 0 0-21.41-9.907"
        fill={secondaryColor}
        style={{ transition: 'fill 0.5s ease' }}
      />
      <path
        d="m503.658 375.863-6.671-33.348c-.831.167-78.747 33.204-143.864 33.204H16.56a8.55 8.55 0 0 0-8.552 8.551v25.655c0 9.445 7.658 17.103 17.103 17.103h328.01c51.716 0 108.891-26.009 136.804-30.977 9.448-1.68 15.615-10.779 13.733-20.188"
        fill={lightNeutral}
        style={{ transition: 'fill 0.5s ease' }}
      />
      <path
        d="m511.528 374.291-6.671-33.348c-.03-.146-.213-.818-.224-.855-11.124-36.949-54.483-34.879-92.75-33.047-8.17.39-15.899.75-23.327.788a285 285 0 0 1-31.079-11.814 8.015 8.015 0 0 0-3.78-8.832c-3.515-2.031-7.922-1.088-10.338 2.035a297 297 0 0 1-21.538-12.265c2.023-3.416 1.251-7.883-1.961-10.392a8.016 8.016 0 0 0-11.253 1.383l-.128.165a321 321 0 0 1-20.318-15.495c1.855-3.082 1.462-7.137-1.196-9.795a8.02 8.02 0 0 0-10.731-.548 357 357 0 0 1-18.908-18.514c3.294-2.868 3.695-7.857.869-11.209a8.017 8.017 0 0 0-11.297-.963l-.358.301a398 398 0 0 1-15.492-18.954 8.01 8.01 0 0 0 1.123-8.553c-1.836-3.917-6.432-5.643-10.38-3.971a437 437 0 0 1-15.372-23.166 8.018 8.018 0 0 0-8.032-13.786l-.134.061a448 448 0 0 1-13.636-25.783c3.555-1.844 5.253-6.092 3.806-9.933a8.02 8.02 0 0 0-10.328-4.678l-.222.083a355 355 0 0 1-4.426-10.477c-3.864-9.583-13.016-15.776-23.316-15.776H42.139c-8.969 0-16.401 7.325-16.563 16.329-.533 29.386-3.749 67.648-7.153 108.156-4.467 53.142-9.493 113.114-9.838 168.326C3.473 372.586 0 378.029 0 384.271v25.655c0 13.851 11.269 25.12 25.12 25.12h328.01c53.397 0 113.772-22.048 139.553-31.463 13.771-5.029 21.343-16.801 18.845-29.292m-98.879-51.234c37.303-1.784 63.537-1.617 73.689 15.013-37.218 14.314-67.886 21.792-90.984 25.655v-39.972c5.73-.152 11.574-.423 17.295-.696m74.535 65.465c-24.984 9.124-83.493 30.49-134.053 30.49H25.12c-5.01 0-9.086-4.076-9.086-9.086v-25.655c0-.295.239-.534.534-.534H42.22a8.017 8.017 0 0 0 0-16.034H24.63c.458-54.003 5.386-112.772 9.769-164.923 3.427-40.778 6.664-79.295 7.207-109.207.005-.335.234-.587.532-.587h67.1c1.487 4.109 4.224 11.314 8.338 20.808a8.02 8.02 0 0 0 7.361 4.832 8.019 8.019 0 0 0 7.352-11.207 388 388 0 0 1-5.929-14.433h23.767c3.724 0 7.039 2.252 8.445 5.739a370 370 0 0 0 4.273 10.136l-7.467 2.811a8.018 8.018 0 0 0 5.65 15.006l8.553-3.22a464 464 0 0 0 14.047 26.731l-7.324 3.343a8.017 8.017 0 0 0-3.965 10.622 8.02 8.02 0 0 0 7.299 4.691 8 8 0 0 0 3.323-.726l8.865-4.046a456 456 0 0 0 15.238 23.221l-7.532 3.531a8.018 8.018 0 0 0 6.807 14.519l10.354-4.854a418 418 0 0 0 17.621 21.701l-5.975 5.036a8.017 8.017 0 0 0 5.172 14.148 8 8 0 0 0 5.163-1.887l6.41-5.402a375 375 0 0 0 19.786 19.495l-6.403 6.403a8.016 8.016 0 0 0 0 11.337 8 8 0 0 0 5.669 2.348 8 8 0 0 0 5.669-2.348l7.178-7.179a338 338 0 0 0 21.621 16.615l-4.935 6.318a8.017 8.017 0 0 0 1.383 11.253 7.98 7.98 0 0 0 4.929 1.7 8 8 0 0 0 6.324-3.083l5.668-7.256a312 312 0 0 0 23.289 13.397l-4.65 8.053a8.017 8.017 0 1 0 13.885 8.016l5.226-9.052a301 301 0 0 0 29.6 11.604v28.939c-106.002-35.9-173.339-114.976-211.467-175.876a8.018 8.018 0 0 0-13.591 8.509c39.729 63.456 110.169 145.981 221.599 183.117-10.025 1.047-17.667 1.307-22.731 1.307H76.429a8.017 8.017 0 0 0 0 16.034H353.13c50.899 0 108.971-19.31 137.874-30.292l4.8 23.991c1.408 7.04-6.934 10.47-8.62 11.086"
        fill={darkNeutral}
        style={{ transition: 'fill 0.5s ease' }}
      />
      <path
        d="M137.791 155.109a8.015 8.015 0 0 0 10.877 3.204 8.02 8.02 0 0 0 3.205-10.875 523 523 0 0 1-7.733-14.749 8.017 8.017 0 0 0-14.319 7.215 538 538 0 0 0 7.97 15.205M110.635 315.325c32.713 0 59.326-26.613 59.326-59.326s-26.613-59.326-59.326-59.326-59.326 26.613-59.326 59.326 26.613 59.326 59.326 59.326m0-102.618c23.872 0 43.292 19.42 43.292 43.292s-19.42 43.292-43.292 43.292-43.292-19.422-43.292-43.292 19.421-43.292 43.292-43.292"
        fill={secondaryColor}
        fillOpacity={0.5}
        style={{ transition: 'fill 0.5s ease' }}
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
  
  // Читаем тему синхронно при инициализации, чтобы избежать FOUC (мерцания)
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  const wheelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const rafId = useRef<number | null>(null)
  const pendingValue = useRef<number | null>(null)

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const handleLangChange = (newLang: Lang) => {
    localStorage.setItem('app_lang', newLang)
    setLang(newLang)
  }

  const t = {
    ru: {
      title: 'Цвета',
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
      ittenLabel: 'Круговая палитра',
      guideBtn: 'Гид',
      guideTitle: 'Цвет в дизайне',
      guideClose: 'Закрыть',
      guideIntro:
        'Круг Иттена — классический инструмент гармонизации цвета. В обуви он особенно важен: основная палитра почти всегда строится вокруг нейтралей (чёрный, белый, бежевый, серый), а цвет появляется точечно — в коже верха, подкладке, строчке, подошве или фурнитуре.',
      guideBalanceTitle: 'Правило баланса',
      guideBalance:
        '60 % — основной цвет (обычно нейтраль или доминирующий тон кожи).\n30 % — поддерживающий цвет (подкладка, язычок, задник).\n10 % — акцент (строчка, логотип, металлическая фурнитура, подошва).',
      guideSchemesTitle: 'Схемы и применение',
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
      title: 'Кольори',
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
      ittenLabel: 'Кругова палітра',
      guideBtn: 'Гід',
      guideTitle: 'Колір у дизайні',
      guideClose: 'Закрити',
      guideIntro:
        'Коло Іттена — класичний інструмент гармонізації кольору. У взутті він особливо важливий: основна палітра майже завжди будується навколо нейтралей (чорний, білий, бежевий, сірий), а колір з’являється точково — у шкірі верху, підкладці, рядку, підошві чи фурнітурі.',
      guideBalanceTitle: 'Правило балансу',
      guideBalance:
        '60 % — основний колір (зазвичай нейтраль або домінуючий тон шкіри).\n30 % — підтримуючий колір (підкладка, язичок, задник).\n10 % — акцент (рядок, логотип, металева фурнітура, підошва).',
      guideSchemesTitle: 'Схеми і застосування',
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
    de: {
      title: 'Farben',
      complementary: 'Komplementär',
      analogous: 'Analog',
      triadic: 'Triadisch',
      tetradic: 'Tetradisch (Quadrat)',
      rectangular: 'Tetradisch (Rechteck)',
      'split-complementary': 'Split-Komplementär',
      monochromatic: 'Monochromatisch',
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      quote: '«Farbe ist die Seele des Schuhs.»',
      white: 'Zu Weiß',
      black: 'Zu Schwarz',
      pure: 'Rein',
      ittenLabel: 'Farbkreis',
      guideBtn: 'Guide',
      guideTitle: 'Farbe im Design',
      guideClose: 'Schließen',
      guideIntro:
        'Der Itten-Farbkreis ist ein klassisches Werkzeug zur Farbharmonisierung. Bei Schuhen ist er besonders wichtig: Die Grundpalette ist fast immer um neutrale Farben (Schwarz, Weiß, Beige, Grau) herum aufgebaut, und Farbe taucht punktuell auf — im Oberleder, im Futter, in den Nähten, der Sohle oder den Beschlägen.',
      guideBalanceTitle: 'Die Balance-Regel',
      guideBalance:
        '60 % — Hauptfarbe (meist neutral oder der dominierende Lederton).\n30 % — Unterstützende Farbe (Futter, Zunge, Fersenkappe).\n10 % — Akzent (Nähte, Logo, Metallbeschläge, Sohle).',
      guideSchemesTitle: 'Farbschemata & Anwendung',
      guideComplementary:
        'Komplementär — zwei gegenüberliegende Farben. Ergibt einen starken, energetischen Kontrast. Gut für Sport- und Fashion-Schuhe, bei denen ein leuchtender Akzent auf neutralem Grund benötigt wird.',
      guideAnalogous:
        'Analog — benachbarte Farben auf dem Kreis. Schafft einen weichen, ruhigen Übergang. Ideal für klassische und Freizeitschuhe, wenn man eine reiche Tonalität ohne Härte wünscht.',
      guideTriadic:
        'Triadisch — drei Farben im 120°-Abstand. Lebendig und ausgewogen. Geeignet für Capsule-Kollektionen und saisonale Farbgeschichten.',
      guideTetradic:
        'Tetradisch (Quadrat) — vier Farben im 90°-Abstand. Das lebhafteste Schema. Verwenden Sie einen dominierenden Ton, zwei unterstützende und einen reinen Akzent, sonst wird die Komposition zu bunt.',
      guideRectangular:
        'Tetradisch (Rechteck) — zwei komplementäre Paare mit Verschiebung. Weicher als das Quadrat, bietet mehr Raum für Nuancen. Funktioniert hervorragend bei Premium- und Designerschuhen.',
      guideSplit:
        'Split-Komplementär — Hauptfarbe + die zwei Nachbarn ihrer Komplementärfarbe. Kontrast ist vorhanden, aber weicher als rein komplementär. Eine universelle Wahl für die meisten Modelle.',
      guideMono:
        'Monochromatisch — eine Farbe in verschiedenen Tönen und Sättigungen. Das eleganteste und „teuerste“ Schema. Ideal für Minimalismus, Abendschuhe und wenn das Leder an sich schon ausdrucksstark ist.',
      guideFootwearTitle: 'Besonderheiten bei Schuhen',
      guideFootwear:
        '• Obermaterial: Hauptfarbe (60–70 %).\n• Futter und Innensohle: unterstützender oder hellerer Ton.\n• Sohle und Absatz: oft neutral oder Akzent.\n• Beschläge und Nähte: der reinste und hellste Akzent (5–10 %).\n• Schwarz und Weiß sind keine „Farblosigkeit“, sondern mächtige Werkzeuge für Kontrast und Form.',
      guideTip:
        'Tipp: Überprüfen Sie Farbkombinationen immer bei unterschiedlichen Lichtverhältnissen — Tageslicht, warmes Kunstlicht und kaltes Licht. Leder und Wildleder verändern ihren Farbton stärker als es scheint.',
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

  const SCHEMES: Scheme[] = [
    'complementary',
    'analogous',
    'triadic',
    'tetradic',
    'rectangular',
    'split-complementary',
    'monochromatic',
  ]

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'

  // КОРНЕВОЙ ЭЛЕМЕНТ ТЕПЕРЬ MOTION.DIV ДЛЯ ПЛАВНОГО ПЕРЕХОДА СТРАНИЦ
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative min-h-[100dvh] w-full transition-colors duration-[1.5s] ${cBg} ${cText}`}
    >
      <style>{`
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Утонченные журнальные слайдеры */
        input[type=range] {
          -webkit-appearance: none;
          background: transparent;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 1px;
          background: ${isDark ? 'rgba(244,240,232,0.2)' : 'rgba(28,24,22,0.2)'};
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: ${isDark ? '#F4F0E8' : '#1C1816'};
          margin-top: -5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
      `}</style>

      {/* HEADER */}
      <header className="px-6 pt-8 pb-4 flex items-start justify-between z-20">
        <button 
          onClick={onBack} 
          className={`group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors`}
        >
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {['ru', 'uk', 'de'].map((l) => (
              <button
                key={l}
                onClick={() => handleLangChange(l as Lang)}
                className={`text-[10px] font-sans uppercase tracking-[0.25em] outline-none border-0 bg-transparent cursor-pointer transition-colors duration-300 ${
                  lang === l ? cText : cTextMuted
                } ${cHover}`}
              >
                {l === 'uk' ? 'UKR' : l}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowGuide(true)} 
            className={`text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors`}
          >
            {t.guideBtn}
          </button>
        </div>
      </header>

      <div className="px-6 pb-24">
        
        {/* ЗАГОЛОВОК СТРАНИЦЫ */}
        <div className="mb-10">
          <h1 className="font-serif text-[18vw] min-[400px]:text-6xl leading-[0.85] tracking-[-0.04em]">
            {t.title}
          </h1>
        </div>

        {/* НАВИГАЦИЯ СХЕМ (Журнальная горизонтальная лента) */}
        <div className={`flex overflow-x-auto gap-8 pb-5 mb-10 border-b ${cLine} scrollbar-hide`}>
          {SCHEMES.map(s => (
             <button 
               key={s}
               onClick={() => setScheme(s)} 
               className={`text-[9px] font-sans uppercase tracking-[0.25em] whitespace-nowrap transition-all duration-300 outline-none border-none bg-transparent cursor-pointer ${
                 scheme === s ? `italic ${cText} opacity-100` : `${cTextMuted} opacity-60 hover:opacity-100`
               }`}
             >
               {t[s]}
             </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center md:items-start mb-16">
          
          {/* ЦВЕТОВОЙ КРУГ */}
          <div className="flex flex-col items-center shrink-0">
            <div
              ref={wheelRef}
              className="relative w-[180px] h-[180px] md:w-[220px] md:h-[220px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none"
              style={{
                background: wheelBackground,
                boxShadow: `0 0 0 1px ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}, 0 10px 30px rgba(0,0,0,0.15)`,
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
                className="absolute top-1 left-1/2 w-4 h-4 rounded-full border-[1.5px] border-white shadow-md pointer-events-none origin-[50%_86px] md:origin-[50%_106px]"
                style={{
                  backgroundColor: pointerColor,
                  transform: `translateX(-50%) rotate(${pointerAngle}deg)`,
                }}
              />
            </div>
            <p className={`mt-6 text-[9px] font-sans tracking-[0.3em] uppercase ${cTextMuted}`}>
              {t.ittenLabel}
            </p>
          </div>

          {/* ВИЗУАЛИЗАЦИЯ И СВОТЧИ */}
          <div className="flex-1 w-full max-w-md">
            
            {/* Кроссовок */}
            <div className="mb-12 flex justify-center items-center px-4">
              <SneakerSvg colors={colors} isDark={isDark} />
            </div>

            {/* Слайдеры Тон/Тень */}
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div>
                <div className={`flex justify-between text-[9px] font-sans uppercase tracking-widest mb-4 ${cTextMuted}`}>
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
                />
              </div>
              <div>
                <div className={`flex justify-between text-[9px] font-sans uppercase tracking-widest mb-4 ${cTextMuted}`}>
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
                />
              </div>
            </div>

            {/* Журнальные Pantone-свотчи */}
            <div className={`grid gap-4 ${isTetrad ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {colors.map((c, i) => (
                <div key={i} className="flex flex-col">
                  <div 
                    className={`w-full h-24 mb-4 shadow-sm border ${isDark ? 'border-white/10' : 'border-black/5'}`} 
                    style={{ backgroundColor: c }} 
                  />
                  <div className={`text-[9px] font-sans uppercase tracking-[0.2em] ${cTextMuted}`}>
                    {ratioLabels[i]}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ЦИТАТА */}
        <div className="pb-10 pt-4">
          <div className="flex flex-col items-center text-center px-4">
            <div className={`w-px h-12 mb-8 ${cLine} border-l`} />
            <p className={`font-serif text-[18px] sm:text-[20px] italic leading-[1.5] ${cTextMuted}`}>
              {t.quote}
            </p>
            <p className={`mt-6 text-[9px] font-sans font-bold uppercase tracking-[0.4em] ${cText}`}>
              Cordwainer
            </p>
          </div>
        </div>

      </div>

      {/* OVERLAY: ГИД (Журнальный разворот) */}
      {showGuide && (
        <div className={`fixed inset-0 z-[100] flex flex-col ${cBg} ${cText} overflow-hidden`}>
          <div className="px-6 pt-10 pb-6 flex items-start justify-between shrink-0">
            <h2 className="font-serif text-[12vw] min-[400px]:text-5xl leading-none tracking-tight">
              {t.guideTitle}
            </h2>
            <button
              onClick={() => setShowGuide(false)}
              className={`text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors mt-2`}
            >
              {t.guideClose}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide space-y-12">
            
            <p className="text-[14px] min-[400px]:text-[16px] leading-[1.8] font-light max-w-lg">
              {t.guideIntro}
            </p>

            <div>
              <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-6 ${cTextMuted}`}>
                {t.guideBalanceTitle}
              </h3>
              <p className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] whitespace-pre-line font-light border-l border-current/20 pl-5 max-w-lg`}>
                {t.guideBalance}
              </p>
            </div>

            <div>
              <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-8 ${cTextMuted}`}>
                {t.guideSchemesTitle}
              </h3>
              <div className="space-y-8 max-w-lg">
                {[
                  { title: t.complementary, text: t.guideComplementary },
                  { title: t.analogous, text: t.guideAnalogous },
                  { title: t.triadic, text: t.guideTriadic },
                  { title: t.tetradic, text: t.guideTetradic },
                  { title: t.rectangular, text: t.guideRectangular },
                  { title: t['split-complementary'], text: t.guideSplit },
                  { title: t.monochromatic, text: t.guideMono },
                ].map((item) => (
                  <div key={item.title}>
                    <div className="font-serif text-[22px] min-[400px]:text-[26px] leading-[1.2] mb-3">
                      {item.title}
                    </div>
                    <p className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] font-light ${cTextMuted}`}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-6 ${cTextMuted}`}>
                {t.guideFootwearTitle}
              </h3>
              <p className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] whitespace-pre-line font-light border-l border-current/20 pl-5 max-w-lg`}>
                {t.guideFootwear}
              </p>
            </div>

            <div className={`pt-8 border-t ${cLine} max-w-lg`}>
              <p className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] font-light italic ${cTextMuted}`}>
                {t.guideTip}
              </p>
            </div>
            
          </div>
        </div>
      )}
    </motion.div>
  )
}
