import type { Lang } from '../../App'
import type { OpacityLevel } from '../../data/pigmentLore'
import type { IlluminantType } from '../../utils/colorScience'

export interface ColorCalcDict {
  brand: string
  edition: string
  title: string
  navFormula: string
  navSpectrum: string
  navMatch: string
  navArchive: string
  back: string
  guideBtn: string
  guideShort: string
  mixComposition: string
  clear: string
  loading: string
  loadError: string
  retry: string
  addPigment: string
  autoAdjust: string
  adjusting: string
  result: string
  wet: string
  dry: string
  wetExplain: string
  dryExplain: string
  illuminantLabel: string
  illuminants: Record<IlluminantType, { short: string; label: string; temp: string }>
  reset: string
  target: string
  mix: string
  ciePerfect: string
  cieAcceptable: string
  cieBad: string
  copy: string
  copied: string
  totalVolume: string
  targetColor: string
  targetPresetsLabel: string
  maxPigments: string
  acrylic: string
  aniline: string
  inventory: string
  default: string
  all: string
  clearInventory: string
  picking: string
  pickRecipe: string
  recipeError: string
  recipe: string
  binder: string
  moveToMix: string
  pigmentInfoBtn: string
  addToFormula: string
  addedToFormula: string
  searchPlaceholder: string
  archiveTitle: string
  archiveEmpty: string
  spectralTitle: string
  spectralSubtitle: string
  modeReflectance: string
  modeKS: string
  showComponents: string
  peakWl: string
  meanRefl: string
  noSpectrumHint: string
  touchChartHint: string
  dossierTitle: string
  dossierChem: string
  dossierOpacityMeaning: string
  dossierHistory: string
  dossierLeather: string
  dossierWhereToBuy: string
  dossierLeatherBrands: string
  dossierArtSuppliers: string
  dossierClose: string
  opacityLabels: Record<OpacityLevel, string>
  opacityDesc: Record<OpacityLevel, string>
  coatLabels: [string, string, string, string]
  coatExplanations: [string, string, string, string]
  guideModalTitle: string
  guideSectionCoats: string
  guideSectionCoatsText: string
  guideSectionWetDry: string
  guideSectionWetDryText: string
  guideSectionIlluminant: string
  guideSectionIlluminantText: string
  guideSectionOpacity: string
  ml: string
  l: string
}

const DICTIONARIES: Record<Lang, ColorCalcDict> = {
  ru: {
    brand: 'CORDWAINE',
    edition: 'SPECTRAL ATELIER · КУБЕЛКА–МУНК',
    title: 'Спектральное Ателье',
    navFormula: 'Формула',
    navSpectrum: 'Спектр',
    navMatch: 'Подбор',
    navArchive: 'Архив',
    back: 'Назад',
    guideBtn: 'Шпаргалка',
    guideShort: '?',
    mixComposition: 'Пропорции компонентов',
    clear: 'Сбросить вес',
    loading: 'Загрузка спектрального архива…',
    loadError: 'Не удалось загрузить спектры',
    retry: 'Повторить',
    addPigment: '+ Добавить компонент',
    autoAdjust: 'Калибровать под цель',
    adjusting: 'Калибровка…',
    result: 'Карта Оттенка',
    wet: 'Мокрая (Глянец)',
    dry: 'Сухая (Мат)',
    wetExplain: 'Свежая краска в баночке или под глянцевым лаком/воском — цвет глубже и темнее.',
    dryExplain: 'Высохшая краска без лака — микропоры рассеивают свет, тон выглядит чуть светлее и матовее.',
    illuminantLabel: 'Освещение (метамеризм)',
    illuminants: {
      D65: { short: 'D65', label: 'Дневной свет', temp: '6500K' },
      A: { short: 'Бутик', label: 'Тёплый бутик', temp: '2856K' },
      cool: { short: 'Студия', label: 'Нейтральный', temp: '4200K' },
      twilight: { short: 'Сумерки', label: 'Холодная тень', temp: '9000K' },
    },
    reset: 'Снять цель',
    target: 'Эталон',
    mix: 'Образец',
    ciePerfect: 'Эталонный допуск Haute Couture (ΔE ≤ 2.0)',
    cieAcceptable: 'Коммерческий допуск (ΔE 2.0 – 5.0)',
    cieBad: 'Требуется корректировка тона (ΔE > 5.0)',
    copy: 'Скопировать',
    copied: 'Скопировано',
    totalVolume: 'Суммарный выход',
    targetColor: 'Целевой Образец',
    targetPresetsLabel: 'Классические оттенки кожи',
    maxPigments: 'комп.',
    acrylic: 'Акрил (Кроющий)',
    aniline: 'Анилин (Лессировка)',
    inventory: 'Палитра Ателье',
    default: 'Базовая',
    all: 'Весь архив',
    clearInventory: 'Очистить',
    picking: 'Спектральный синтез…',
    pickRecipe: 'Синтезировать Рецепт',
    recipeError: 'Не удалось синтезировать точный рецепт из выбранной палитры',
    recipe: 'Спецификация Рецепта',
    binder: 'Акриловое связующее (База)',
    moveToMix: 'Передать в формулу →',
    pigmentInfoBtn: 'Паспорт',
    addToFormula: '+ В формулу',
    addedToFormula: 'Добавлен',
    searchPlaceholder: 'Поиск: название, индекс CI, HEX, бренд…',
    archiveTitle: 'Архив Пигментов',
    archiveEmpty: 'По запросу ничего не найдено',
    spectralTitle: 'Спектральная Кривая',
    spectralSubtitle: 'Диапазон CIE 380–780 нм · шаг 5 нм',
    modeReflectance: 'R(λ) Отражение',
    modeKS: 'K/S(λ) Поглощение',
    showComponents: 'Кривые компонентов',
    peakWl: 'Пик λ',
    meanRefl: 'Сред. R',
    noSpectrumHint: 'Укажите объём пигментов в формуле, чтобы построить живую спектральную кривую смеси.',
    touchChartHint: 'Проведите по графику для замера длины волны',
    dossierTitle: 'Паспорт пигмента',
    dossierChem: 'Химический класс и индекс',
    dossierOpacityMeaning: 'Укрывистость на коже',
    dossierHistory: 'История открытия',
    dossierLeather: 'Применение в кожевенном ремесле',
    dossierWhereToBuy: 'Где брать и в каких красках искать',
    dossierLeatherBrands: 'Краски для кожи и обуви:',
    dossierArtSuppliers: 'Чистые пигменты и акриловые дисперсии:',
    dossierClose: 'Закрыть',
    opacityLabels: {
      opaque: 'Кроющий',
      'semi-opaque': 'Полукроющий',
      'semi-transparent': 'Полупрозрачный',
      transparent: 'Лессировочный',
    },
    opacityDesc: {
      opaque: 'Кроющий (плотный) — закрашивает старый цвет кожи и пятна за 1–2 слоя, как грунтовая эмаль.',
      'semi-opaque': 'Полукроющий — полностью перекрывает фон за 2–3 слоя, сохраняя живую текстуру кожи.',
      'semi-transparent': 'Полупрозрачный — мягко тонирует кожу, оставляя видимым её природный рисунок.',
      transparent: 'Лессировочный (прозрачный) — работает как цветное стекло для патины, глассажа и глубоких переливов.',
    },
    coatLabels: ['1 слой', '2 слоя', '3 слоя', 'Полный ∞'],
    coatExplanations: [
      '1 слой: тонкое нанесение — сквозь полупрозрачную краску ещё просвечивает светлая кожа.',
      '2 слоя: стандартная покраска — цвет набирает силу, прозрачные пигменты дают глубину.',
      '3 слоя: плотное покрытие — базовый фон кожи почти полностью перекрыт.',
      'Полный (∞): 100% перекрытие — итоговый цвет густой краски в баночке или в 4+ слоёв.',
    ],
    guideModalTitle: 'Шпаргалка мастера: как читать лабораторию',
    guideSectionCoats: '1. Слои нанесения (1 слой → Полный ∞)',
    guideSectionCoatsText:
      'Краска ложится постепенно: в 1 слой сквозь неё просвечивает светлая кожа. Переключая слои, вы заранее видите, сколько проходов кистью или аэрографом нужно для полного перекрытия.',
    guideSectionWetDry: '2. Сухая (Мат) / Мокрая (Глянец)',
    guideSectionWetDryText:
      'При высыхании краска слегка светлеет и становится матовой из-за диффузного рассеяния. «Мокрая» показывает тон свежей смеси или под глянцевым финишем/воском.',
    guideSectionIlluminant: '3. Освещение и метамеризм (D65 / Бутик / Студия / Сумерки)',
    guideSectionIlluminantText:
      'Разные пигменты могут совпадать при дневном свете (D65), но расходиться под тёплыми лампами бутика (2856K). Переключайте источник света, чтобы проверить оттенок заранее.',
    guideSectionOpacity: '4. Типы укрывистости пигментов',
    ml: 'мл',
    l: 'л',
  },
  uk: {
    brand: 'CORDWAINE',
    edition: 'SPECTRAL ATELIER · КУБЕЛКА–МУНК',
    title: 'Спектральне Ательє',
    navFormula: 'Формула',
    navSpectrum: 'Спектр',
    navMatch: 'Підбір',
    navArchive: 'Архів',
    back: 'Назад',
    guideBtn: 'Шпаргалка',
    guideShort: '?',
    mixComposition: 'Пропорції компонентів',
    clear: 'Скинути вагу',
    loading: 'Завантаження спектрального архіву…',
    loadError: 'Не вдалося завантажити спектри',
    retry: 'Повторити',
    addPigment: '+ Додати компонент',
    autoAdjust: 'Калібрувати під ціль',
    adjusting: 'Калібрування…',
    result: 'Карта Відтінку',
    wet: 'Мокра (Глянець)',
    dry: 'Суха (Мат)',
    wetExplain: 'Свіжа фарба в баночці або під глянцевим лаком/воском — колір глибший і темніший.',
    dryExplain: 'Висохла фарба без лаку — мікропори розсіюють світло, тон трохи світліший і матовіший.',
    illuminantLabel: 'Освітлення (метамеризм)',
    illuminants: {
      D65: { short: 'D65', label: 'Денне світло', temp: '6500K' },
      A: { short: 'Бутік', label: 'Теплий бутік', temp: '2856K' },
      cool: { short: 'Студія', label: 'Нейтральне', temp: '4200K' },
      twilight: { short: 'Сутінки', label: 'Холодна тінь', temp: '9000K' },
    },
    reset: 'Зняти ціль',
    target: 'Еталон',
    mix: 'Зразок',
    ciePerfect: 'Еталонний допуск Haute Couture (ΔE ≤ 2.0)',
    cieAcceptable: 'Комерційний допуск (ΔE 2.0 – 5.0)',
    cieBad: 'Потребує коригування тону (ΔE > 5.0)',
    copy: 'Скопіювати',
    copied: 'Скопійовано',
    totalVolume: 'Сумарний вихід',
    targetColor: 'Цільовий Зразок',
    targetPresetsLabel: 'Класичні відтінки шкіри',
    maxPigments: 'комп.',
    acrylic: 'Акрил (Криючий)',
    aniline: 'Анілін (Лесування)',
    inventory: 'Палітра Ательє',
    default: 'Базова',
    all: 'Увесь архів',
    clearInventory: 'Очистити',
    picking: 'Спектральний синтез…',
    pickRecipe: 'Синтезувати Рецепт',
    recipeError: 'Не вдалося синтезувати точний рецепт із вибраної палітри',
    recipe: 'Специфікація Рецепта',
    binder: 'Акрилове зв’язуюче (База)',
    moveToMix: 'Передати у формулу →',
    pigmentInfoBtn: 'Паспорт',
    addToFormula: '+ У формулу',
    addedToFormula: 'Додано',
    searchPlaceholder: 'Пошук: назва, індекс CI, HEX, бренд…',
    archiveTitle: 'Архів Пігментів',
    archiveEmpty: 'За запитом нічого не знайдено',
    spectralTitle: 'Спектральна Крива',
    spectralSubtitle: 'Діапазон CIE 380–780 нм · крок 5 нм',
    modeReflectance: 'R(λ) Відбиття',
    modeKS: 'K/S(λ) Поглинання',
    showComponents: 'Криві компонентів',
    peakWl: 'Пік λ',
    meanRefl: 'Серед. R',
    noSpectrumHint: 'Вкажіть об’єм пігментів у формулі, щоб побудувати живу спектральну криву суміші.',
    touchChartHint: 'Проведіть по графіку для виміру довжини хвилі',
    dossierTitle: 'Паспорт пігменту',
    dossierChem: 'Хімічний клас та індекс',
    dossierOpacityMeaning: 'Покривність на шкірі',
    dossierHistory: 'Історія відкриття',
    dossierLeather: 'Застосування у шкіряному ремеслі',
    dossierWhereToBuy: 'Де брати та в яких фарбах шукати',
    dossierLeatherBrands: 'Фарби для шкіри та взуття:',
    dossierArtSuppliers: 'Чисті пігменти та акрилові дисперсії:',
    dossierClose: 'Закрити',
    opacityLabels: {
      opaque: 'Криючий',
      'semi-opaque': 'Напівкриючий',
      'semi-transparent': 'Напівпрозорий',
      transparent: 'Лесувальний',
    },
    opacityDesc: {
      opaque: 'Криючий (щільний) — зафарбовує старий колір шкіри та плями за 1–2 шари, як ґрунтова емаль.',
      'semi-opaque': 'Напівкриючий — повністю перекриває фон за 2–3 шари, зберігаючи живу текстуру шкіри.',
      'semi-transparent': 'Напівпрозорий — м’яко тонує шкіру, залишаючи видимим її природний малюнок.',
      transparent: 'Лесувальний (прозорий) — працює як кольорове скло для патини, гласажу та глибоких переливів.',
    },
    coatLabels: ['1 шар', '2 шари', '3 шари', 'Повний ∞'],
    coatExplanations: [
      '1 шар: тонке нанесення — крізь напівпрозору фарбу ще просвічує світла шкіра.',
      '2 шари: стандартне фарбування — колір набирає силу, прозорі пігменти дають глибину.',
      '3 шари: щільне покриття — базовий фон шкіри майже повністю перекритий.',
      'Повний (∞): 100% перекриття — підсумковий колір густої фарби в баночці або в 4+ шарів.',
    ],
    guideModalTitle: 'Шпаргалка майстра: як читати лабораторію',
    guideSectionCoats: '1. Шари нанесення (1 шар → Повний ∞)',
    guideSectionCoatsText:
      'Фарба лягає поступово: в 1 шар крізь неї просвічує світла основа шкіри. Перемикаючи шари, ви заздалегідь бачите потрібну кількість проходів.',
    guideSectionWetDry: '2. Суха (Мат) / Мокра (Глянець)',
    guideSectionWetDryText:
      'При висиханні фарба трохи світлішає і стає матовою. «Мокра» показує тон свіжої суміші або під глянцевим фінішем/воском.',
    guideSectionIlluminant: '3. Освітлення та метамеризм (D65 / Бутік / Студія / Сутінки)',
    guideSectionIlluminantText:
      'Різні пігменти можуть збігатися при денному світлі (D65), але відрізнятися під теплими лампами бутіка (2856K). Перевіряйте відтінок заздалегідь.',
    guideSectionOpacity: '4. Типи покривності пігментів',
    ml: 'мл',
    l: 'л',
  },
  de: {
    brand: 'CORDWAINE',
    edition: 'SPECTRAL ATELIER · KUBELKA–MUNK',
    title: 'Spektral-Atelier',
    navFormula: 'Rezeptur',
    navSpectrum: 'Spektrum',
    navMatch: 'Matching',
    navArchive: 'Archiv',
    back: 'Zurück',
    guideBtn: 'Leitfaden',
    guideShort: '?',
    mixComposition: 'Komponenten & Anteile',
    clear: 'Leeren',
    loading: 'Spektralarchiv wird geladen…',
    loadError: 'Fehler beim Laden der Spektren',
    retry: 'Wiederholen',
    addPigment: '+ Komponente hinzufügen',
    autoAdjust: 'Auf Ziel kalibrieren',
    adjusting: 'Kalibrierung…',
    result: 'Farbkarte',
    wet: 'Nass (Glanz)',
    dry: 'Trocken (Matt)',
    wetExplain: 'Frische Farbe im Glas oder unter Glanz-Finish/Wachs — der Farbton wirkt tiefer und dunkler.',
    dryExplain: 'Getrocknete Farbe ohne Finish — Lichtstreuung lässt den Ton etwas heller und matter wirken.',
    illuminantLabel: 'Lichtart (Metamerie)',
    illuminants: {
      D65: { short: 'D65', label: 'Tageslicht', temp: '6500K' },
      A: { short: 'Boutique', label: 'Warmlicht', temp: '2856K' },
      cool: { short: 'Studio', label: 'Neutral', temp: '4200K' },
      twilight: { short: 'Schatten', label: 'Kühles Licht', temp: '9000K' },
    },
    reset: 'Ziel lösen',
    target: 'Referenz',
    mix: 'Muster',
    ciePerfect: 'Haute-Couture-Toleranz (ΔE ≤ 2.0)',
    cieAcceptable: 'Kommerziell akzeptabel (ΔE 2.0 – 5.0)',
    cieBad: 'Tonkorrektur erforderlich (ΔE > 5.0)',
    copy: 'Kopieren',
    copied: 'Kopiert',
    totalVolume: 'Gesamtvolumen',
    targetColor: 'Ziel-Referenz',
    targetPresetsLabel: 'Klassische Ledertöne',
    maxPigments: 'Komp.',
    acrylic: 'Acryl (Deckend)',
    aniline: 'Anilin (Lasur)',
    inventory: 'Atelier-Palette',
    default: 'Standard',
    all: 'Alle',
    clearInventory: 'Leeren',
    picking: 'Spektralsynthese…',
    pickRecipe: 'Rezeptur Synthetisieren',
    recipeError: 'Rezeptur konnte aus der gewählten Palette nicht erstellt werden',
    recipe: 'Rezeptur-Spezifikation',
    binder: 'Acryl-Bindemittel (Basis)',
    moveToMix: 'In Rezeptur übernehmen →',
    pigmentInfoBtn: 'Dossier',
    addToFormula: '+ Zur Formel',
    addedToFormula: 'Hinzugefügt',
    searchPlaceholder: 'Suche: Name, CI-Code, HEX, Marke…',
    archiveTitle: 'Pigment-Archiv',
    archiveEmpty: 'Keine Pigmente gefunden',
    spectralTitle: 'Spektralkurve',
    spectralSubtitle: 'CIE-Bereich 380–780 nm · 5-nm-Schritte',
    modeReflectance: 'R(λ) Reflexion',
    modeKS: 'K/S(λ) Absorption',
    showComponents: 'Komponentenkurven',
    peakWl: 'Peak λ',
    meanRefl: 'Ø Refl.',
    noSpectrumHint: 'Geben Sie Pigmentmengen in der Formel ein, um die Live-Spektralkurve zu berechnen.',
    touchChartHint: 'Über das Diagramm fahren für exakte Wellenlänge',
    dossierTitle: 'Pigment-Dossier',
    dossierChem: 'Chemische Klasse & Colour Index',
    dossierOpacityMeaning: 'Deckkraft auf Leder',
    dossierHistory: 'Entdeckungsgeschichte',
    dossierLeather: 'Anwendung im Schuh- & Lederhandwerk',
    dossierWhereToBuy: 'Bezugsquellen & Marken',
    dossierLeatherBrands: 'Leder- & Schuhfarben:',
    dossierArtSuppliers: 'Reinpigmente & Künstler-Dispersionen:',
    dossierClose: 'Schließen',
    opacityLabels: {
      opaque: 'Deckend',
      'semi-opaque': 'Halbdeckend',
      'semi-transparent': 'Halbtransparent',
      transparent: 'Lasierend',
    },
    opacityDesc: {
      opaque: 'Deckend — überdeckt den alten Lederton und Flecken bereits in 1–2 Schichten vollständig.',
      'semi-opaque': 'Halbdeckend — deckt nach 2–3 Schichten voll ab und erhält die natürliche Ledernarbung.',
      'semi-transparent': 'Halbtransparent — tönt das Leder sanft ab, während die Struktur sichtbar bleibt.',
      transparent: 'Lasierend (transparent) — wirkt wie farbiges Glas für Patina, Wasserglanz und Tiefeneffekte.',
    },
    coatLabels: ['1. Schicht', '2. Schicht', '3. Schicht', 'Vollton ∞'],
    coatExplanations: [
      '1. Schicht: Dünner Auftrag — das helle Grundleder scheint bei lasierenden Pigmenten noch durch.',
      '2. Schicht: Normaler Auftrag — der Farbton gewinnt an Tiefe und Sättigung.',
      '3. Schicht: Dichter Auftrag — der Untergrund ist fast vollständig abgedeckt.',
      'Vollton (∞): 100 % Deckung — Farbe im Gebinde oder ab 4+ Schichten.',
    ],
    guideModalTitle: 'Atelier-Leitfaden: Labor richtig lesen',
    guideSectionCoats: '1. Schichten (1. Schicht → Vollton ∞)',
    guideSectionCoatsText:
      'Je nach Deckkraft scheint beim ersten Auftrag noch das Grundleder durch. Durch Antippen der Schichten sehen Sie vorab, wie sich der Ton entwickelt.',
    guideSectionWetDry: '2. Trocken (Matt) / Nass (Glanz)',
    guideSectionWetDryText:
      'Lederfarbe trocknet etwas heller und matter auf. „Nass“ zeigt den tiefen Ton im frischen Zustand oder unter Glanzappretur/Wachs.',
    guideSectionIlluminant: '3. Lichtart & Metamerie (D65 / Boutique / Studio / Schatten)',
    guideSectionIlluminantText:
      'Zwei Pigmente können bei Tageslicht (D65) gleich wirken, aber unter warmem Ladenlicht (2856K) abweichen. Prüfen Sie den Ton unter allen Lichtarten.',
    guideSectionOpacity: '4. Deckkraft-Stufen',
    ml: 'ml',
    l: 'l',
  },
}

export function getColorCalcDict(lang: Lang): ColorCalcDict {
  return DICTIONARIES[lang] || DICTIONARIES.ru
}

