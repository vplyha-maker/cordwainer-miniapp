import type { Lang } from '../../App'
import type { FootwearMappingPreset, Scheme, SneakerZoneKey, SolePresetId } from './colorEngine'
import type { StudioBgId, ThemeMode } from './themeSystem'

export type SupportedLang = Lang

export type ColorsTranslation = {
  title: string
  settingsTitle: string
  back: string
  guide: string
  tabs: {
    colors: string
    models: string
    harmonies: string
    palette: string
  }
  subTabs: {
    tone: string
    sole: string
    bg: string
  }
  themeModes: Record<ThemeMode, string>
  honestBadge: string
  honestSubtext: string
  soleTitle: string
  soleSubtitle: string
  soleReset: string
  soleCustom: string
  solePresets: Record<Exclude<SolePresetId, 'custom'>, string>
  bgTitle: string
  bgSubtitle: string
  bgCustom: string
  bgAutoContrast: string
  bgAutoContrastDesc: string
  bgPresets: Record<Exclude<StudioBgId, 'custom'>, string>
  toneTitle: string
  hueLabel: string
  tintLabel: string
  shadeLabel: string
  chromaLabel: string
  wheelModelLabel: string
  hapticsLabel: string
  hapticsDesc: string
  langLabel: string
  interfaceBlock: string
  slots: {
    primary: string
    primaryDesc: string
    secondary: string
    secondaryDesc: string
    accent: string
    accentDesc: string
  }
  contrastLabel: string
  contrastLevels: {
    soft: string
    optimal: string
    high: string
  }
  copyHex: string
  copied: string
  copySpec: string
  specTitle: string
  savePalette: string
  savedToast: string
  savedEmpty: string
  applyPalette: string
  deletePalette: string
  confirmDelete: string
  cancel: string
  proBadge: string
  proTitle: string
  proDesc: string
  proBuyBtn: string
  proProcessing: string
  proActive: string
  paymentVerifyFailed: string
  paymentPendingMsg: string
  paymentTelegramOnly: string
  paymentInvoiceError: string
  paymentGenericFailed: string
  schemes: Record<Scheme, { name: string; short: string; desc: string }>
  presets: Record<FootwearMappingPreset, string>
  zones: Record<SneakerZoneKey, string>
  modelNotes: Record<'aerostrap' | 'nexus' | 'monolith', string>
  guideSections: {
    title: string
    items: { heading: string; body: string }[]
    close: string
  }
}

export type TranslationDict = ColorsTranslation

export const COLORS_TRANSLATIONS: Record<Lang, ColorsTranslation> = {
  ru: {
    title: 'Цвета',
    settingsTitle: 'Настройки студии',
    back: 'Назад',
    guide: 'Гид',
    tabs: {
      colors: 'Цвета',
      models: 'Модели',
      harmonies: 'Гармонии',
      palette: 'Палитра',
    },
    subTabs: {
      tone: 'Тон',
      sole: 'Подошва',
      bg: 'Фон',
    },
    themeModes: {
      day: 'День',
      night: 'Ночь',
      auto: 'Авто',
    },
    honestBadge: 'Честная гармония Иттена',
    honestSubtext: 'Верх, берцы и акценты рассчитываются строго по кругу Иттена 60/30/10. Независимо настраиваются только фон и подошва.',
    soleTitle: 'Цвет подошвы',
    soleSubtitle: 'Нейтральная база — не влияет на схемы гармонии',
    soleReset: 'Сбросить',
    soleCustom: 'Свой HEX',
    solePresets: {
      white: 'Белая EVA',
      cream: 'Кремовая',
      stone: 'Серая',
      graphite: 'Графит',
      black: 'Чёрная',
      gum: 'Каучук',
    },
    bgTitle: 'Фон студии',
    bgSubtitle: 'Меняет только фон 3D-сцены, не затрагивая обувь',
    bgCustom: 'Свой фон',
    bgAutoContrast: 'Авто-контраст сцены',
    bgAutoContrastDesc: 'Адаптирует подписи и 360° под яркость фона',
    bgPresets: {
      cream: 'Кремовый',
      white: 'Белый',
      'light-gray': 'Светло-серый',
      graphite: 'Графит',
      black: 'Чёрный',
    },
    toneTitle: 'Тон и насыщенность',
    hueLabel: 'Оттенок',
    tintLabel: 'Белила (Tint)',
    shadeLabel: 'Тень (Shade)',
    chromaLabel: 'Насыщенность',
    wheelModelLabel: 'Цветовая модель круга',
    hapticsLabel: 'Виброотклик',
    hapticsDesc: 'Тактильная отдача и щелчок кнопок',
    langLabel: 'Язык интерфейса',
    interfaceBlock: 'Отображение и интерфейс',
    slots: {
      primary: '60% База',
      primaryDesc: 'Верх · Пятка',
      secondary: '30% Вторичный',
      secondaryDesc: 'Берцы · Язычок',
      accent: '10% Акцент',
      accentDesc: 'Лого · Детали',
    },
    contrastLabel: 'Контраст',
    contrastLevels: {
      soft: 'Мягкий',
      optimal: 'Оптимальный',
      high: 'Высокий',
    },
    copyHex: 'Копировать HEX',
    copied: 'Скопировано',
    copySpec: 'Копировать техкарту',
    specTitle: 'Техкарта 13 зон',
    savePalette: 'Сохранить палитру',
    savedToast: 'Палитра сохранена',
    savedEmpty: 'Пока нет сохранённых палитр. Настройте гармонию на вкладке «Цвета» и нажмите «Сохранить палитру».',
    applyPalette: 'Применить',
    deletePalette: 'Удалить',
    confirmDelete: 'Удалить?',
    cancel: 'Отмена',
    proBadge: 'PRO',
    proTitle: 'Cordwaine Color Lab PRO',
    proDesc: 'Откройте все 7 классических гармоний Иттена (триада, тетрада, прямоугольник, сплит-комплементарная и монохром) и безлимитное сохранение техкарт.',
    proBuyBtn: 'Открыть за {stars} ★',
    proProcessing: 'Открываем оплату…',
    proActive: 'PRO активен',
    paymentVerifyFailed: 'Не удалось подтвердить оплату. Попробуйте снова через пару секунд.',
    paymentPendingMsg: 'Платёж обрабатывается Telegram. Доступ откроется автоматически.',
    paymentTelegramOnly: 'Откройте приложение внутри Telegram для оплаты Stars.',
    paymentInvoiceError: 'Не удалось создать счёт для оплаты.',
    paymentGenericFailed: 'Оплата не была завершена. Попробуйте снова.',
    schemes: {
      complementary: {
        name: 'Комплементарная',
        short: 'Комплемент.',
        desc: 'Противоположные цвета на круге (180°). Максимально выразительный акцент.',
      },
      analogous: {
        name: 'Аналогичная',
        short: 'Аналогичная',
        desc: 'Соседние оттенки (±30°). Спокойный, цельный и благородный силуэт.',
      },
      triadic: {
        name: 'Триада',
        short: 'Триада',
        desc: 'Равносторонний треугольник (120°). Сбалансированный энергичный контраст.',
      },
      'split-complementary': {
        name: 'Сплит-комплементарная',
        short: 'Сплит-компл.',
        desc: 'Базовый цвет + два соседа противоположного (±150°). Мягче прямой комплементарной.',
      },
      tetradic: {
        name: 'Тетрада (квадрат)',
        short: 'Тетрада',
        desc: 'Четыре равноудалённых оттенка (90°). Богатое распределение по слоям.',
      },
      rectangular: {
        name: 'Прямоугольная',
        short: 'Прямоуг.',
        desc: 'Две комплементарные пары (60°/180°/240°). Гибкий студийный баланс.',
      },
      monochromatic: {
        name: 'Монохромная',
        short: 'Монохром',
        desc: 'Один оттенок в разных тонах светлоты и тени. Чистый минимализм.',
      },
    },
    presets: {
      classic: '60/30/10 База',
      'toe-focus': 'Акцент мыска',
      'split-quarter': 'Сплит-берцы',
      'neutral-sole': 'Нейтральная',
    },
    zones: {
      vamp: 'Верх (Союзка)',
      quarters: 'Берцы',
      tongue: 'Язычок',
      lining: 'Подкладка',
      toeBox: 'Мысок / Обвод',
      heel: 'Пятка',
      collar: 'Воротник',
      midsole: 'Основная подошва',
      encap: 'Вставка / Цилиндры',
      outsole: 'Протектор',
      laces: 'Шнурки',
      eyestays: 'Планка шнуровки',
      swoosh: 'Логотип / Акцент',
    },
    modelNotes: {
      aerostrap: 'Модульный беговой силуэт с центральной фиксирующей стропой',
      nexus: 'Футуристичный высокий силуэт — акцент 10% на логотипах и цилиндрах воротника',
      monolith: 'Объёмная скульптурная подошва с рельефными боковыми панелями',
    },
    guideSections: {
      title: 'Как работает студия Cordwaine',
      items: [
        {
          heading: '1. Честная система Иттена 60/30/10',
          body: 'Все три цвета палитры (60% База, 30% Вторичный, 10% Акцент) вычисляются математически по выбранной схеме гармонии и положению на круге RYB или OKLCH. Мы намеренно не ломаем формулу ручной перекраской верха — любая выбранная схема остаётся настоящей колористической гармоникой.',
        },
        {
          heading: '2. Независимые Фон и Подошва',
          body: 'Фон 3D-студии и цвет подошвы (EVA / каучук / графит) полностью отделены от темы интерфейса и расчёта гармоний. Белая подошва остаётся белой в ночном режиме, а смена подошвы никогда не искажает баланс 60/30/10.',
        },
        {
          heading: '3. Пресеты распределения и 3D-модели',
          body: 'Переключайте AEROSTRAP, NEXUS X1 и MONOLITH V, а также 4 схемы раскладки по деталям (60/30/10 База, Акцент мыска, Сплит-берцы, Нейтральная). Верх и пятка всегда держат 60% силуэта.',
        },
        {
          heading: '4. Экспорт техкарты',
          body: 'Нажмите на любую цветную карточку, чтобы скопировать HEX, или скопируйте полную 13-зонную техкарту с углами Иттена и параметрами OKLCH для передачи в производство.',
        },
      ],
      close: 'Понятно',
    },
  },
  uk: {
    title: 'Кольори',
    settingsTitle: 'Налаштування студії',
    back: 'Назад',
    guide: 'Гід',
    tabs: {
      colors: 'Кольори',
      models: 'Моделі',
      harmonies: 'Гармонії',
      palette: 'Палітра',
    },
    subTabs: {
      tone: 'Тон',
      sole: 'Підошва',
      bg: 'Фон',
    },
    themeModes: {
      day: 'День',
      night: 'Ніч',
      auto: 'Авто',
    },
    honestBadge: 'Чесна гармонія Іттена',
    honestSubtext: 'Верх, берці та акценти розраховуються строго за колом Іттена 60/30/10. Незалежно налаштовуються лише фон і підошва.',
    soleTitle: 'Колір підошви',
    soleSubtitle: 'Нейтральна база — не впливає на схеми гармонії',
    soleReset: 'Скинути',
    soleCustom: 'Свій HEX',
    solePresets: {
      white: 'Біла EVA',
      cream: 'Кремова',
      stone: 'Сіра',
      graphite: 'Графіт',
      black: 'Чорна',
      gum: 'Каучук',
    },
    bgTitle: 'Фон студії',
    bgSubtitle: 'Змінює лише фон 3D-сцени, не зачіпаючи взуття',
    bgCustom: 'Свій фон',
    bgAutoContrast: 'Авто-контраст сцени',
    bgAutoContrastDesc: 'Адаптує підписи та 360° під яскравість фону',
    bgPresets: {
      cream: 'Кремовий',
      white: 'Білий',
      'light-gray': 'Світло-сірий',
      graphite: 'Графіт',
      black: 'Чорний',
    },
    toneTitle: 'Тон і насиченість',
    hueLabel: 'Відтінок',
    tintLabel: 'Білила (Tint)',
    shadeLabel: 'Тінь (Shade)',
    chromaLabel: 'Насиченість',
    wheelModelLabel: 'Колірна модель кола',
    hapticsLabel: 'Вібровідгук',
    hapticsDesc: 'Тактильна віддача та клік кнопок',
    langLabel: 'Мова інтерфейсу',
    interfaceBlock: 'Відображення та інтерфейс',
    slots: {
      primary: '60% База',
      primaryDesc: 'Верх · П’ята',
      secondary: '30% Вторинний',
      secondaryDesc: 'Берці · Язичок',
      accent: '10% Акцент',
      accentDesc: 'Лого · Деталі',
    },
    contrastLabel: 'Контраст',
    contrastLevels: {
      soft: 'М’який',
      optimal: 'Оптимальний',
      high: 'Високий',
    },
    copyHex: 'Копіювати HEX',
    copied: 'Скопійовано',
    copySpec: 'Копіювати техкарту',
    specTitle: 'Техкарта 13 зон',
    savePalette: 'Зберегти палітру',
    savedToast: 'Палітру збережено',
    savedEmpty: 'Поки немає збережених палітр. Налаштуйте гармонію на вкладці «Кольори» і натисніть «Зберегти палітру».',
    applyPalette: 'Застосувати',
    deletePalette: 'Видалити',
    confirmDelete: 'Видалити?',
    cancel: 'Скасувати',
    proBadge: 'PRO',
    proTitle: 'Cordwaine Color Lab PRO',
    proDesc: 'Відкрийте всі 7 класичних гармоній Іттена та безлімітне збереження техкарт.',
    proBuyBtn: 'Відкрити за {stars} ★',
    proProcessing: 'Відкриваємо оплату…',
    proActive: 'PRO активний',
    paymentVerifyFailed: 'Не вдалося підтвердити оплату. Спробуйте ще раз за кілька секунд.',
    paymentPendingMsg: 'Платіж обробляється Telegram. Доступ відкриється автоматично.',
    paymentTelegramOnly: 'Відкрийте застосунок усередині Telegram для оплати Stars.',
    paymentInvoiceError: 'Не вдалося створити рахунок для оплати.',
    paymentGenericFailed: 'Оплату не завершено. Спробуйте ще раз.',
    schemes: {
      complementary: {
        name: 'Комплементарна',
        short: 'Комплемент.',
        desc: 'Протилежні кольори на колі (180°). Максимально виразний акцент.',
      },
      analogous: {
        name: 'Аналогічна',
        short: 'Аналогічна',
        desc: 'Сусідні відтінки (±30°). Спокійний, цілісний силует.',
      },
      triadic: {
        name: 'Тріада',
        short: 'Тріада',
        desc: 'Рівносторонній трикутник (120°). Збалансований контраст.',
      },
      'split-complementary': {
        name: 'Спліт-комплементарна',
        short: 'Спліт-компл.',
        desc: 'Базовий колір + два сусіди протилежного (±150°).',
      },
      tetradic: {
        name: 'Тетрада (квадрат)',
        short: 'Тетрада',
        desc: 'Чотири рівновіддалені відтінки (90°).',
      },
      rectangular: {
        name: 'Прямокутна',
        short: 'Прямокут.',
        desc: 'Дві комплементарні пари (60°/180°/240°).',
      },
      monochromatic: {
        name: 'Монохромна',
        short: 'Монохром',
        desc: 'Один відтінок у різних тонах світлоти й тіні.',
      },
    },
    presets: {
      classic: '60/30/10 База',
      'toe-focus': 'Акцент носка',
      'split-quarter': 'Спліт-берці',
      'neutral-sole': 'Нейтральна',
    },
    zones: {
      vamp: 'Верх (Союзка)',
      quarters: 'Берці',
      tongue: 'Язичок',
      lining: 'Підкладка',
      toeBox: 'Носок / Обвід',
      heel: 'П’ята',
      collar: 'Комір',
      midsole: 'Основна підошва',
      encap: 'Вставка / Циліндри',
      outsole: 'Протектор',
      laces: 'Шнурки',
      eyestays: 'Планка шнурівки',
      swoosh: 'Логотип / Акцент',
    },
    modelNotes: {
      aerostrap: 'Модульний біговий силует із центральною стропою',
      nexus: 'Футуристичний високий силует — акцент 10% на логотипах і циліндрах коміра',
      monolith: 'Об’ємна скульптурна підошва з рельєфними бічними панелями',
    },
    guideSections: {
      title: 'Як працює студія Cordwaine',
      items: [
        {
          heading: '1. Чесна система Іттена 60/30/10',
          body: 'Усі три кольори палітри обчислюються математично за обраною схемою гармонії на колі RYB або OKLCH без ручного спотворення верху.',
        },
        {
          heading: '2. Незалежні Фон і Підошва',
          body: 'Фон 3D-студії та колір підошви повністю відокремлені від теми інтерфейсу та схем гармонії. Біла підошва залишається білою в нічному режимі.',
        },
        {
          heading: '3. Пресети розподілу та 3D-моделі',
          body: 'Перемикайте AEROSTRAP, NEXUS X1 і MONOLITH V та 4 схеми розподілу. Верх і п’ята завжди тримають 60% силуету.',
        },
        {
          heading: '4. Експорт техкарти',
          body: 'Натисніть на будь-яку картку для копіювання HEX або скопіюйте повну 13-зонну техкарту для виробництва.',
        },
      ],
      close: 'Зрозуміло',
    },
  },
  de: {
    title: 'Farben',
    settingsTitle: 'Studio-Einstellungen',
    back: 'Zurück',
    guide: 'Guide',
    tabs: {
      colors: 'Farben',
      models: 'Modelle',
      harmonies: 'Harmonien',
      palette: 'Palette',
    },
    subTabs: {
      tone: 'Ton',
      sole: 'Sohle',
      bg: 'Hintergrund',
    },
    themeModes: {
      day: 'Tag',
      night: 'Nacht',
      auto: 'Auto',
    },
    honestBadge: 'Ehrliche Itten-Harmonie',
    honestSubtext: 'Obermaterial, Quartiere und Akzente folgen strikt dem Itten-Farbkreis 60/30/10. Nur Hintergrund und Sohle sind frei wählbar.',
    soleTitle: 'Sohlenfarbe',
    soleSubtitle: 'Neutrale Basis — beeinflusst keine Harmonie-Schemata',
    soleReset: 'Zurücksetzen',
    soleCustom: 'Eigener HEX',
    solePresets: {
      white: 'Weiß EVA',
      cream: 'Creme',
      stone: 'Steingrau',
      graphite: 'Graphit',
      black: 'Schwarz',
      gum: 'Kautschuk',
    },
    bgTitle: 'Studio-Hintergrund',
    bgSubtitle: 'Ändert nur die 3D-Bühne, nicht das Schuhmaterial',
    bgCustom: 'Eigener Ton',
    bgAutoContrast: 'Auto-Kontrast',
    bgAutoContrastDesc: 'Passt 3D-Beschriftungen an die Hintergrundhelligkeit an',
    bgPresets: {
      cream: 'Creme',
      white: 'Weiß',
      'light-gray': 'Hellgrau',
      graphite: 'Graphit',
      black: 'Schwarz',
    },
    toneTitle: 'Ton & Sättigung',
    hueLabel: 'Farbton',
    tintLabel: 'Aufhellung (Tint)',
    shadeLabel: 'Schatten (Shade)',
    chromaLabel: 'Sättigung',
    wheelModelLabel: 'Farbkreis-Modell',
    hapticsLabel: 'Haptik',
    hapticsDesc: 'Taktiles Feedback & Klickton',
    langLabel: 'Sprache',
    interfaceBlock: 'Darstellung & Oberfläche',
    slots: {
      primary: '60% Basis',
      primaryDesc: 'Vorderblatt · Ferse',
      secondary: '30% Sekundär',
      secondaryDesc: 'Quartiere · Zunge',
      accent: '10% Akzent',
      accentDesc: 'Logo · Details',
    },
    contrastLabel: 'Kontrast',
    contrastLevels: {
      soft: 'Sanft',
      optimal: 'Optimal',
      high: 'Hoch',
    },
    copyHex: 'HEX kopieren',
    copied: 'Kopiert',
    copySpec: 'Tech-Spec kopieren',
    specTitle: '13-Zonen-Tech-Spec',
    savePalette: 'Palette speichern',
    savedToast: 'Palette gespeichert',
    savedEmpty: 'Noch keine gespeicherten Paletten. Stelle eine Harmonie ein und tippe auf „Palette speichern“.',
    applyPalette: 'Anwenden',
    deletePalette: 'Löschen',
    confirmDelete: 'Löschen?',
    cancel: 'Abbrechen',
    proBadge: 'PRO',
    proTitle: 'Cordwaine Color Lab PRO',
    proDesc: 'Schalte alle 7 klassischen Itten-Harmonien und unbegrenzte Tech-Specs frei.',
    proBuyBtn: 'Freischalten für {stars} ★',
    proProcessing: 'Zahlung wird geöffnet…',
    proActive: 'PRO aktiv',
    paymentVerifyFailed: 'Zahlung konnte nicht bestätigt werden. Bitte kurz erneut versuchen.',
    paymentPendingMsg: 'Zahlung wird von Telegram verarbeitet.',
    paymentTelegramOnly: 'Öffne die App in Telegram für Stars-Zahlungen.',
    paymentInvoiceError: 'Rechnung konnte nicht erstellt werden.',
    paymentGenericFailed: 'Zahlung nicht abgeschlossen. Bitte erneut versuchen.',
    schemes: {
      complementary: {
        name: 'Komplementär',
        short: 'Komplement.',
        desc: 'Gegenüberliegende Farben (180°) für klaren Akzent.',
      },
      analogous: {
        name: 'Analog',
        short: 'Analog',
        desc: 'Benachbarte Töne (±30°) für ruhige Silhouetten.',
      },
      triadic: {
        name: 'Triade',
        short: 'Triade',
        desc: 'Gleichseitiges Dreieck (120°) für ausgewogenen Kontrast.',
      },
      'split-complementary': {
        name: 'Split-Komplementär',
        short: 'Split-Kompl.',
        desc: 'Grundfarbe + Nachbarn der Gegenfarbe (±150°).',
      },
      tetradic: {
        name: 'Tetrade',
        short: 'Tetrade',
        desc: 'Vier gleichmäßige Farbtöne (90°).',
      },
      rectangular: {
        name: 'Rechteckig',
        short: 'Rechteck.',
        desc: 'Zwei Komplementärpaare (60°/180°/240°).',
      },
      monochromatic: {
        name: 'Monochrom',
        short: 'Monochrom',
        desc: 'Ein Farbton in abgestuften Licht- und Schattenwerten.',
      },
    },
    presets: {
      classic: '60/30/10 Basis',
      'toe-focus': 'Spitzen-Akzent',
      'split-quarter': 'Split-Quartier',
      'neutral-sole': 'Neutral',
    },
    zones: {
      vamp: 'Vorderblatt',
      quarters: 'Quartiere',
      tongue: 'Zunge',
      lining: 'Futter',
      toeBox: 'Kappe / Rand',
      heel: 'Ferse',
      collar: 'Schaftrand',
      midsole: 'Zwischensohle',
      encap: 'Einsatz / Zylinder',
      outsole: 'Laufsohle',
      laces: 'Schnürsenkel',
      eyestays: 'Ösenleiste',
      swoosh: 'Logo / Akzent',
    },
    modelNotes: {
      aerostrap: 'Modulare Runner-Silhouette mit zentralem Riemen',
      nexus: 'Futuristischer High-Top — 10% Akzent auf Logos & Kragenzylindern',
      monolith: 'Skulpturale Sohle mit strukturierten Seitenpaneelen',
    },
    guideSections: {
      title: 'So funktioniert das Cordwaine Studio',
      items: [
        {
          heading: '1. Ehrliche Itten-Harmonie 60/30/10',
          body: 'Alle drei Palettenfarben werden mathematisch über den RYB- oder OKLCH-Farbkreis berechnet, ohne die Harmonie durch manuelles Überschreiben zu verfälschen.',
        },
        {
          heading: '2. Unabhängiger Hintergrund & Sohle',
          body: 'Studio-Hintergrund und Sohlenfarbe sind vollständig von UI-Theme und Harmonie getrennt. Weiße Sohlen bleiben auch im Nachtmodus weiß.',
        },
        {
          heading: '3. Presets & 3D-Modelle',
          body: 'Wechsle zwischen AEROSTRAP, NEXUS X1 und MONOLITH V sowie 4 Zonen-Presets. Obermaterial und Ferse halten stets 60%.',
        },
        {
          heading: '4. Tech-Spec Export',
          body: 'Tippe auf eine Farbkarte für den HEX-Code oder kopiere die komplette 13-Zonen-Tech-Spec für die Produktion.',
        },
      ],
      close: 'Verstanden',
    },
  },
}
