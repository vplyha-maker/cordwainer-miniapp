import type { Lang as AppLang } from '../../App'
import type { FootwearMappingPreset } from './colorEngine'

export const PRO_COLORS_PRICE_STARS = 250

export type SupportedLang = 'ru' | 'uk' | 'de'

const APP_NATIVE_LANGS: readonly ('ru' | 'uk')[] = ['ru', 'uk']

export function normalizeSupportedLang(input: unknown): SupportedLang {
  if (input === 'ru' || input === 'uk' || input === 'de') return input
  return 'ru'
}

export function isAppNativeLang(input: SupportedLang): input is AppLang & ('ru' | 'uk') {
  return APP_NATIVE_LANGS.includes(input as 'ru' | 'uk')
}

export const TRANSLATIONS = {
  ru: {
    title: 'Цвета',
    complementary: 'Комплементарная',
    analogous: 'Аналогичная',
    triadic: 'Триадная',
    tetradic: 'Тетрада (квадрат)',
    rectangular: 'Тетрада (прямоуг.)',
    'split-complementary': 'Контрастная триада',
    monochromatic: 'Монохромная',
    main60: '60%',
    secondary30: '30%',
    accent10: '10%',
    main55: '55%',
    secondary20: '20%',
    secondary15: '15%',
    roleClassicUpper: 'Верх • Пятка',
    roleClassicDetailsAll: 'Обвод • Волна • Ремень',
    roleClassicDetails: 'Обвод • Волна • Ремень',
    roleClassicLining: 'Канты • Подкладка',
    roleClassicAccent: 'Штрихи • Air блок',
    roleToeMain: 'Верх • Пятка',
    roleToeSecondary: 'Волна • Ремень • Air',
    roleToeLining: 'Канты • Подкладка',
    roleToeAccent: 'Мысок • Штрихи',
    roleSplitMain: 'Верх • Пятка • Штрихи',
    roleSplitSecondary: 'Обвод • Язычок • Air',
    roleSplitLining: 'Канты • Подкладка',
    roleSplitAccent: 'Ремень • Боковая волна',
    roleNeutralAccent: 'Штрихи • Задняя петля',
    specTitle: 'Техкарта 13 зон (нажмите для копирования HEX)',
    exportSpecBtn: 'Копировать техкарту',
    exportCopied: 'Техкарта скопирована',
    zone_vamp: 'Верх',
    zone_toeBox: 'Обвод',
    zone_quarters: 'Волна',
    zone_eyestays: 'Ремень',
    zone_heel: 'Пятка',
    zone_collar: 'Канты',
    zone_tongue: 'Язычок',
    zone_lining: 'Подкладка',
    zone_swoosh: 'Штрихи',
    zone_midsole: 'EVA база',
    zone_encap: 'Air блок',
    zone_outsole: 'Протектор',
    zone_laces: 'Пряжка',
    quote: '«Цвет — это душа обуви.»',
    white: 'Белила (Tint)',
    black: 'Тень (Shade)',
    chroma: 'Насыщенность',
    pure: 'Пигмент',
    ittenLabel: 'Круг Иттена (RYB)',
    hslLabel: 'Цифровой (HSL)',
    presetClassic: '60/30/10 База',
    presetToe: 'Акцент мыска',
    presetSplit: 'Сплит-берцы',
    presetNeutral: 'Нейтр. подошва',
    contrastOptimal: 'Оптимальный контраст',
    contrastSoft: 'Мягкий нюанс',
    contrastHigh: 'Высокий контраст',
    copied: 'Скопировано',
    resetBtn: '360° • Сброс',
    loading3D: 'Загрузка 3D • CORDWAINE AEROSTRAP...',
    webglFallback: 'WebGL недоступен • Режим палитры',
    guideBtn: 'Гид',
    guideTitle: 'Цвет в дизайне',
    guideClose: 'Закрыть',
    paywallTitle: 'PRO: Палитры Studio',
    paywallDesc:
      'Пожизненный доступ ко всем профессиональным схемам Иттена: триады, тетрады, монохром и полная техкарта 13 деталей кроя.',
    paywallBtn: 'ОТКРЫТЬ ДОСТУП • ' + PRO_COLORS_PRICE_STARS + ' ⭐️',
    loading: 'СОЗДАНИЕ СЧЁТА...',
    verifying: 'ПРОВЕРКА ТРАНЗАКЦИИ...',
    paymentTelegramOnly: 'Откройте приложение внутри Telegram для оплаты Stars.',
    paymentVerifyFailed:
      'Оплата ещё не подтверждена сервером. Подождите пару секунд и нажмите снова.',
    paymentPendingMsg:
      'Платёж обрабатывается Telegram. Доступ откроется автоматически после подтверждения.',
    paymentGenericFailed: 'Оплата не была завершена. Попробуйте снова.',
    paymentInvoiceError: 'Сбой создания счёта',
    guideIntro:
      'Круг Иттена (RYB) — классический художественный инструмент гармонизации цвета. В отличие от экранной модели RGB/HSL, в круге Иттена комплементарными парами выступают Красный–Зелёный, Синий–Оранжевый и Жёлтый–Фиолетовый, что создаёт благородные материальные сочетания для кожи и замши.',
    guideBalanceTitle: 'Правило баланса',
    guideBalance:
      '60 % — основной цвет (верх и пятка, всегда привязаны к базовому углу круга).\n30 % — поддерживающий цвет (боковые панели, ремень, язычок).\n10 % — акцент (штрихи, мысок или капсула Air).\nНейтрали (EVA, протектор, фурнитура) не нарушают гармонику Иттена.',
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
      'Совет: нажмите на любой цветовой свотч или чип в техкарте зон внизу экрана, чтобы мгновенно скопировать точный HEX-код для спецификации производства.',
  },
  uk: {
    title: 'Кольори',
    complementary: 'Комплементарна',
    analogous: 'Аналогічна',
    triadic: 'Тріадна',
    tetradic: 'Тетрада (квадрат)',
    rectangular: 'Тетрада (прямокут.)',
    'split-complementary': 'Контрастна тріада',
    monochromatic: 'Монохромна',
    main60: '60%',
    secondary30: '30%',
    accent10: '10%',
    main55: '55%',
    secondary20: '20%',
    secondary15: '15%',
    roleClassicUpper: 'Верх • П’ята',
    roleClassicDetailsAll: 'Обвід • Хвиля • Ремінь',
    roleClassicDetails: 'Обвід • Хвиля • Ремінь',
    roleClassicLining: 'Канти • Підкладка',
    roleClassicAccent: 'Штрихи • Air блок',
    roleToeMain: 'Верх • П’ята',
    roleToeSecondary: 'Хвиля • Ремінь • Air',
    roleToeLining: 'Канти • Підкладка',
    roleToeAccent: 'Мисок • Штрихи',
    roleSplitMain: 'Верх • П’ята • Штрихи',
    roleSplitSecondary: 'Обвід • Язичок • Air',
    roleSplitLining: 'Канти • Підкладка',
    roleSplitAccent: 'Ремінь • Бічна хвиля',
    roleNeutralAccent: 'Штрихи • Задня петля',
    specTitle: 'Техкарта 13 зон (натисніть для копіювання HEX)',
    exportSpecBtn: 'Копіювати техкарту',
    exportCopied: 'Техкарту скопійовано',
    zone_vamp: 'Верх',
    zone_toeBox: 'Обвід',
    zone_quarters: 'Хвиля',
    zone_eyestays: 'Ремінь',
    zone_heel: 'П’ята',
    zone_collar: 'Канти',
    zone_tongue: 'Язичок',
    zone_lining: 'Підкладка',
    zone_swoosh: 'Штрихи',
    zone_midsole: 'EVA база',
    zone_encap: 'Air блок',
    zone_outsole: 'Протектор',
    zone_laces: 'Пряжка',
    quote: '«Колір — це душа взуття.»',
    white: 'Білила (Tint)',
    black: 'Тінь (Shade)',
    chroma: 'Насиченість',
    pure: 'Пігмент',
    ittenLabel: 'Коло Іттена (RYB)',
    hslLabel: 'Цифровий (HSL)',
    presetClassic: '60/30/10 База',
    presetToe: 'Акцент миска',
    presetSplit: 'Спліт-берці',
    presetNeutral: 'Нейтр. підошва',
    contrastOptimal: 'Оптимальний контраст',
    contrastSoft: 'М’який нюанс',
    contrastHigh: 'Високий контраст',
    copied: 'Скопійовано',
    resetBtn: '360° • Скидання',
    loading3D: 'Завантаження 3D • CORDWAINE AEROSTRAP...',
    webglFallback: 'WebGL недоступний • Режим палітри',
    guideBtn: 'Гід',
    guideTitle: 'Колір у дизайні',
    guideClose: 'Закрити',
    paywallTitle: 'PRO: Палітри Studio',
    paywallDesc:
      'Довічний доступ до всіх професійних колірних схем Іттена: тріади, тетради, монохром та повна техкарта 13 деталей крою.',
    paywallBtn: 'ВІДКРИТИ ДОСТУП • ' + PRO_COLORS_PRICE_STARS + ' ⭐️',
    loading: 'СТВОРЕННЯ РАХУНКУ...',
    verifying: 'ПЕРЕВІРКА ТРАНЗАКЦІЇ...',
    paymentTelegramOnly: 'Відкрийте застосунок усередині Telegram для оплати Stars.',
    paymentVerifyFailed:
      'Оплату ще не підтверджено сервером. Зачекайте кілька секунд і спробуйте знову.',
    paymentPendingMsg:
      'Платіж обробляється Telegram. Доступ відкриється автоматично після підтвердження.',
    paymentGenericFailed: 'Оплату не завершено. Спробуйте знову.',
    paymentInvoiceError: 'Збій створення рахунку',
    guideIntro:
      'Коло Іттена (RYB) — класичний художній інструмент гармонізації кольору. На відміну від екранної моделі RGB/HSL, у колі Іттена комплементарними парами виступають Червоний–Зелений, Синій–Помаранчевий та Жовтий–Фіолетовий, що створює благородні поєднання для шкіри та замші.',
    guideBalanceTitle: 'Правило балансу',
    guideBalance:
      '60 % — основний колір (верх і п’ята, завжди прив’язані до базового кута кола).\n30 % — підтримуючий колір (бічні панелі, ремінь, язичок).\n10 % — акцент (штрихи, мисок або капсула Air).\nНейтралі (EVA, протектор, фурнітура) не порушують гармоніку Іттена.',
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
      'Порада: натисніть на будь-який колірний свотч або чіп у техкарті зон внизу екрана, щоб миттєво скопіювати точний HEX-код для технологічної карти виробництва.',
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
    roleClassicUpper: 'Obermaterial • Ferse',
    roleClassicDetailsAll: 'Rand • Welle • Riemen',
    roleClassicDetails: 'Rand • Welle • Riemen',
    roleClassicLining: 'Paspel • Futter',
    roleClassicAccent: 'Akzente • Air-Unit',
    roleToeMain: 'Obermaterial • Ferse',
    roleToeSecondary: 'Welle • Riemen • Air',
    roleToeLining: 'Paspel • Futter',
    roleToeAccent: 'Kappe • Akzente',
    roleSplitMain: 'Obermaterial • Ferse • Akzente',
    roleSplitSecondary: 'Rand • Zunge • Air',
    roleSplitLining: 'Paspel • Futter',
    roleSplitAccent: 'Riemen • Seitenwelle',
    roleNeutralAccent: 'Akzente • Fersenlasche',
    specTitle: '13-Zonen-Spezifikation (Tippen zum HEX-Kopieren)',
    exportSpecBtn: 'Tech-Spec kopieren',
    exportCopied: 'Tech-Spec kopiert',
    zone_vamp: 'Obermaterial',
    zone_toeBox: 'Rand',
    zone_quarters: 'Welle',
    zone_eyestays: 'Riemen',
    zone_heel: 'Ferse',
    zone_collar: 'Paspel',
    zone_tongue: 'Zunge',
    zone_lining: 'Futter',
    zone_swoosh: 'Akzente',
    zone_midsole: 'EVA-Basis',
    zone_encap: 'Air-Unit',
    zone_outsole: 'Laufsohle',
    zone_laces: 'Schnalle',
    quote: '«Farbe ist die Seele des Schuhs.»',
    white: 'Weißanteil (Tint)',
    black: 'Schwarzanteil (Shade)',
    chroma: 'Sättigung',
    pure: 'Pigment',
    ittenLabel: 'Itten-Kreis (RYB)',
    hslLabel: 'Digital (HSL)',
    presetClassic: '60/30/10 Klassik',
    presetToe: 'Kappen-Fokus',
    presetSplit: 'Split-Quartier',
    presetNeutral: 'Neutrale Sohle',
    contrastOptimal: 'Optimaler Kontrast',
    contrastSoft: 'Sanfte Nuance',
    contrastHigh: 'Starker Kontrast',
    copied: 'Kopiert',
    resetBtn: '360° • Reset',
    loading3D: '3D lädt • CORDWAINE AEROSTRAP...',
    webglFallback: 'WebGL nicht verfügbar • Palettenmodus',
    guideBtn: 'Guide',
    guideTitle: 'Farbe im Design',
    guideClose: 'Schließen',
    paywallTitle: 'PRO: Studio-Paletten',
    paywallDesc:
      'Lebenslanger Vollzugriff auf alle professionellen Itten-Farbschemata: Triaden, Tetraden, Monochrom und das komplette 13-Zonen-Datenblatt.',
    paywallBtn: 'FREISCHALTEN FÜR ' + PRO_COLORS_PRICE_STARS + ' ⭐️',
    loading: 'RECHNUNG WIRD ERSTELLT...',
    verifying: 'ZAHLUNG PRÜFEN...',
    paymentTelegramOnly: 'Öffnen Sie die App in Telegram, um mit Stars zu bezahlen.',
    paymentVerifyFailed:
      'Zahlung noch nicht vom Server bestätigt. Bitte warten Sie kurz und versuchen Sie es erneut.',
    paymentPendingMsg:
      'Zahlung wird von Telegram verarbeitet. Der Zugang wird nach Bestätigung freigeschaltet.',
    paymentGenericFailed: 'Zahlung wurde nicht abgeschlossen. Bitte versuchen Sie es erneut.',
    paymentInvoiceError: 'Rechnung konnte nicht erstellt werden',
    guideIntro:
      'Der Itten-Farbkreis (RYB) ist das klassische Werkzeug zur Farbharmonisierung. Im Gegensatz zum digitalen RGB/HSL-Modell bilden hier Rot–Grün, Blau–Orange und Gelb–Violett echte Komplementärpaare für Leder und Wildleder.',
    guideBalanceTitle: 'Die Balance-Regel',
    guideBalance:
      '60 % — Hauptfarbe (Obermaterial & Ferse, immer am Basiswinkel).\n30 % — Unterstützende Farbe (Quartier, Riemen, Zunge).\n10 % — Akzent (Kappe, Akzente oder Air-Unit).\nNeutrale Zonen (EVA, Sohle, Schnürung) erhalten die Itten-Harmonie.',
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
      'Tipp: Tippen Sie unten auf ein beliebiges Farbfeld oder die 13-Zonen-Leiste, um den exakten HEX-Code direkt in die Zwischenablage zu kopieren.',
  },
}

export type TranslationDict = {
  [K in keyof (typeof TRANSLATIONS)['ru']]: string
}

export function getPresetSwatchLabels(
  preset: FootwearMappingPreset,
  isTetrad: boolean,
  t: TranslationDict
): { ratioLabels: string[]; roleLabels: string[] } {
  const ratioLabels = isTetrad
    ? [t.main55, t.secondary20, t.secondary15, t.accent10]
    : [t.main60, t.secondary30, t.accent10]

  switch (preset) {
    case 'toe-focus':
      return {
        ratioLabels,
        roleLabels: isTetrad
          ? [t.roleToeMain, t.roleToeSecondary, t.roleToeLining, t.roleToeAccent]
          : [t.roleToeMain, t.roleToeSecondary, t.roleToeAccent],
      }
    case 'split-quarter':
      return {
        ratioLabels,
        roleLabels: isTetrad
          ? [t.roleSplitMain, t.roleSplitSecondary, t.roleSplitLining, t.roleSplitAccent]
          : [t.roleSplitMain, t.roleSplitSecondary, t.roleSplitAccent],
      }
    case 'neutral-sole':
      return {
        ratioLabels,
        roleLabels: isTetrad
          ? [t.roleClassicUpper, t.roleClassicDetails, t.roleClassicLining, t.roleNeutralAccent]
          : [t.roleClassicUpper, t.roleClassicDetailsAll, t.roleNeutralAccent],
      }
    case 'classic':
    default:
      return {
        ratioLabels,
        roleLabels: isTetrad
          ? [t.roleClassicUpper, t.roleClassicDetails, t.roleClassicLining, t.roleClassicAccent]
          : [t.roleClassicUpper, t.roleClassicDetailsAll, t.roleClassicAccent],
      }
  }
}
