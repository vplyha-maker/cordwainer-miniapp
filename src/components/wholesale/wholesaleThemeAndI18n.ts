/**
 * @file src/components/wholesale/wholesaleThemeAndI18n.ts
 * @description Централизованный модуль цветовых тем (Light/Dark) и мультиязычных словарей (RU / UK / DE)
 * для B2B прайс-каталога и генератора журнального PDF-лукбука CARDIO.
 *
 * ЗАЧЕМ НУЖЕН ЭТОТ ФАЙЛ:
 * 1. Разгружает UI-компоненты и Canvas-генератор от сотен строк текстовых констант.
 * 2. Гарантирует типобезопасность переводов: все 3 языка (ru, uk, de) обязаны иметь
 *    одинаковую структуру ключей.
 * 3. Хранит единую дизайн-палитру B2B-раздела (бумажный фон #F5F3EE, графитовый #171717,
 *    акцентный зелёный и типографику Playfair Display).
 */

import type { Lang } from '../../App';

/** Поддерживаемые языки оптового каталога */
export type WholesaleLang = 'ru' | 'uk' | 'de';

/**
 * Безопасно нормализует входной язык приложения в один из поддерживаемых языков B2B-каталога.
 */
export function normalizeWholesaleLang(lang?: Lang): WholesaleLang {
  return lang && ['ru', 'uk', 'de'].includes(lang) ? (lang as WholesaleLang) : 'ru';
}

/** Структура цветовой палитры B2B-интерфейса */
export interface WholesaleTheme {
  bg: string;
  surface: string;
  surfaceActive: string;
  cardInCart: string;
  imageStage: string;
  ink: string;
  inkMuted: string;
  inkLight: string;
  onInk: string;
  onInkMuted: string;
  border: string;
  accentGreen: string;
  serif: string;
}

/**
 * Возвращает цветовую палитру интерфейса в зависимости от активной темы (светлая / тёмная).
 * Важно: сцена под обувь (`imageStage`) всегда остаётся в цвете тёплой бумаги `#F5F3EE`,
 * чтобы фотографии с `mix-blend-mode: multiply` отображались без белых рамок.
 */
export function getWholesaleTheme(isDark: boolean): WholesaleTheme {
  return isDark
    ? {
        bg: '#0A0A0A',
        surface: '#141416',
        surfaceActive: '#222226',
        cardInCart: '#1A221C',
        imageStage: '#F5F3EE',
        ink: '#F5F3EE',
        inkMuted: '#85837E',
        inkLight: '#71717A',
        onInk: '#171717',
        onInkMuted: '#4A4742',
        border: '#2C2C30',
        accentGreen: '#2E7D32',
        serif: '"Playfair Display", Georgia, serif',
      }
    : {
        bg: '#F5F3EE',
        surface: '#FAF8F5',
        surfaceActive: '#EAE6DF',
        cardInCart: '#EFECE4',
        imageStage: '#F5F3EE',
        ink: '#171717',
        inkMuted: '#85837E',
        inkLight: '#A69984',
        onInk: '#F5F3EE',
        onInkMuted: '#D6D1C7',
        border: '#D6D1C7',
        accentGreen: '#1E4620',
        serif: '"Playfair Display", Georgia, serif',
      };
}

/**
 * Локализация входного баннера (`WholesalePriceBanner`), который встраивается на главную витрину.
 */
export function getBannerLabels(lang: WholesaleLang, isUnlocked: boolean) {
  return {
    ru: {
      sub: isUnlocked ? 'B2B SHOWROOM // 38 МОДЕЛЕЙ С ЦЕНАМИ' : 'B2B SHOWROOM // ДОСТУП ПО PIN-КОДУ',
      title: 'Оптовый прайс-каталог 2026',
      desc: 'Персональный журнальный лукбук фабрики (1 модель = 1 страница А4) с ценами за пару и за короб',
      btn: isUnlocked ? 'Открыть прайс-каталог →' : 'Ввести PIN и открыть прайс →',
    },
    uk: {
      sub: isUnlocked ? 'B2B SHOWROOM // 38 МОДЕЛЕЙ З ЦІНАМИ' : 'B2B SHOWROOM // ДОСТУП ЗА PIN-КОДОМ',
      title: 'Гуртовий прайс-каталог 2026',
      desc: 'Персональний журнальний лукбук фабрики (1 модель = 1 сторінка А4) з цінами за пару та за короб',
      btn: isUnlocked ? 'Відкрити прайс-каталог →' : 'Ввести PIN та відкрити прайс →',
    },
    de: {
      sub: isUnlocked ? 'B2B SHOWROOM // 38 MODELLE MIT PREISEN' : 'B2B SHOWROOM // ZUGANG MIT PIN-CODE',
      title: 'Großhandel Preiskatalog 2026',
      desc: 'Exklusives Editorial-Lookbook (1 Modell = 1 Seite A4) mit Paar- und Kistenpreisen',
      btn: isUnlocked ? 'Preiskatalog öffnen →' : 'PIN eingeben & Katalog öffnen →',
    },
  }[lang];
}

/**
 * Полный словарь интерфейса модального окна B2B-каталога, экрана ввода PIN-кода
 * и карточки комплектации ростовки.
 */
export function getWholesaleUiText(
  lang: WholesaleLang,
  counts: { all: number; autumn: number; winter: number }
) {
  return {
    ru: {
      backToPublic: '← Выход',
      backToPriceList: '← Прайс-каталог',
      invoiceBtn: (p: number, usd: number) => `Накладная (${p} п. • $${usd})`,
      pinTag: 'CARDIO B2B // ЗАКРЫТЫЙ РАЗДЕЛ',
      pinTitle: 'Оптовый прайс-каталог 2026',
      pinSub:
        'Оптовые цены предназначены исключительно для партнеров фабрики и владельцев магазинов. Введите 4-значный PIN-код:',
      pinUnlockBtn: 'Открыть прайс-каталог →',
      pinErrorText: 'Неверный PIN-код. Запросите код у руководителя отдела продаж ниже.',
      askPinTitle: 'Получить PIN-код у руководителя отдела продаж:',
      askBoris: 'Борис • +38 (097) 454-15-11',
      askGeorgiy: 'Георгий • +38 (067) 719-37-16',
      lookbookTag: 'CARDIO FOOTWEAR // WHOLESALE LOOKBOOK 2026',
      mainTitle: 'Оптовый прайс-каталог 2026',
      downloadBtn: (count: number) =>
        `⬇ Скачать Editorial Lookbook PDF (${count} мод. • 1 мод. = 1 стр.)`,
      downloadBtnTop: '⬇ PDF Lookbook',
      stageRendering: (cur: number, tot: number) => `ВЕРСТКА СТРАНИЦ КАТАЛОГА (${cur}/${tot})`,
      stagePackaging: (tot: number) =>
        `✓ ВСЕ ${tot} СТР. СФОРМИРОВАНЫ • УПАКОВКА И ОТПРАВКА PDF`,
      stagePackagingSub:
        'Формируется защищенный файл для телефона и Telegram-бота, пожалуйста подождите',
      soundPlayingHint: '♪ Звуковое сопровождение верстки активно',
      readyBannerTitle: (tot: number) =>
        `✓ КАТАЛОГ ПОЛНОСТЬЮ СФОРМИРОВАН (${tot} СТРАНИЦ А4)`,
      sentToTgBanner: '✓ Файл также отправлен вам в чат Telegram от @Cordwainer_bot!',
      downloadDirectBtn: '📥 СКАЧАТЬ / ОТКРЫТЬ ГОТОВЫЙ PDF НА ТЕЛЕФОНЕ →',
      tabAll: `Все модели (${counts.all})`,
      tabAutumn: `Осень 2026 (${counts.autumn})`,
      tabWinter: `Зима 2026 (${counts.winter})`,
      box6: 'Короб 6 пар',
      box8: 'Короб 8 пар',
      orderBtn: 'Выбрать ростовку →',
      reorderBtn: 'Дозаказать →',
      inCartBadge: (p: number) => `В ЗАКАЗЕ: ${p} П.`,
      footerSub: 'ОТДЕЛ ОПТОВЫХ ПРОДАЖ // CARDIO ХАРЬКОВ',
      georgiyName: 'Георгий',
      borisName: 'Борис',
      securityNote: 'Конфиденциальный B2B-документ для оптовых партнеров.',
      cardTitle: 'КАРТОЧКА МОДЕЛИ (B2B ПРАЙС)',
      colorLabel: 'Цвет',
      wholesalePriceLabel: 'Оптовая цена',
      perPairWord: 'за пару',
      availableColors: 'ВСЕ РАСЦВЕТКИ ЭТОЙ МОДЕЛИ',
      orderParams: 'КОМПЛЕКТАЦИЯ ЗАКАЗА В НАКЛАДНУЮ',
      wholesaleRun: 'Оптовая ростовка',
      sampleRun: 'Тестовый образец (1 п.)',
      standard8: '8 пар • Стандарт',
      standard8Desc: '42 и 43 р. — по 2 пары',
      even6: '6 пар • Ровная',
      even6Desc: '40–45 р. — все по 1 паре',
      boxesCountLabel: 'Количество коробов:',
      samplePrompt: 'Выберите размер тестового образца:',
      addToCart: 'Добавить в накладную',
      addedSuccess: '✓ Добавлено в накладную',
      alreadyInCart: (p: number, usd: number) => `Уже в накладной: ${p} пар ($${usd})`,
      openWord: 'Открыть →',
      bottomOrderTitle: 'ВАШ ОПТОВЫЙ ЗАКАЗ (ПО ПРАЙСУ)',
      bottomInvoiceText: (m: number, p: number, usd: number) =>
        `${m} мод. • ${p} пар • $${usd}`,
      openInvoiceBtn: 'Оформить →',
    },
    uk: {
      backToPublic: '← Вихід',
      backToPriceList: '← Прайс-каталог',
      invoiceBtn: (p: number, usd: number) => `Накладна (${p} п. • $${usd})`,
      pinTag: 'CARDIO B2B // ЗАКРИТИЙ РОЗДІЛ',
      pinTitle: 'Гуртовий прайс-каталог 2026',
      pinSub:
        'Гуртові ціни призначені виключно для партнерів фабрики та власників магазинів. Введіть 4-значний PIN-код:',
      pinUnlockBtn: 'Відкрити прайс-каталог →',
      pinErrorText: 'Невірний PIN-код. Запитайте код у керівника відділу продажу нижче.',
      askPinTitle: 'Отримати PIN-код у керівника відділу продажу:',
      askBoris: 'Борис • +38 (097) 454-15-11',
      askGeorgiy: 'Георгій • +38 (067) 719-37-16',
      lookbookTag: 'CARDIO FOOTWEAR // WHOLESALE LOOKBOOK 2026',
      mainTitle: 'Гуртовий прайс-каталог 2026',
      downloadBtn: (count: number) =>
        `⬇ Завантажити Editorial Lookbook PDF (${count} мод. • 1 мод. = 1 стор.)`,
      downloadBtnTop: '⬇ PDF Lookbook',
      stageRendering: (cur: number, tot: number) => `ВЕРСТКА СТОРІНОК КАТАЛОГУ (${cur}/${tot})`,
      stagePackaging: (tot: number) =>
        `✓ ВСІ ${tot} СТОР. СФОРМОВАНО • УПАКОВКА ТА ВІДПРАВКА PDF`,
      stagePackagingSub:
        'Формується захищений файл для телефону та Telegram-бота, зачекайте будь ласка',
      soundPlayingHint: '♪ Звуковий супровід верстки активний',
      readyBannerTitle: (tot: number) =>
        `✓ КАТАЛОГ ПОВНІСТЮ СФОРМОВАНО (${tot} СТОРІНОК А4)`,
      sentToTgBanner: '✓ Файл також надіслано вам у чат Telegram від @Cordwainer_bot!',
      downloadDirectBtn: '📥 ЗАВАНТАЖИТИ / ВІДКРИТИ ГОТОВЫЙ PDF НА ТЕЛЕФОНІ →',
      tabAll: `Всі моделі (${counts.all})`,
      tabAutumn: `Осінь 2026 (${counts.autumn})`,
      tabWinter: `Зима 2026 (${counts.winter})`,
      box6: 'Короб 6 пар',
      box8: 'Короб 8 пар',
      orderBtn: 'Вибрати ростовку →',
      reorderBtn: 'Дозамовити →',
      inCartBadge: (p: number) => `У ЗАМОВЛЕННІ: ${p} П.`,
      footerSub: 'ВІДДІЛ ГУРТОВОГО ПРОДАЖУ // CARDIO ХАРКІВ',
      georgiyName: 'Георгій',
      borisName: 'Борис',
      securityNote: 'Конфіденційний B2B-документ для гуртових партнерів.',
      cardTitle: 'КАРТКА МОДЕЛІ (B2B ПРАЙС)',
      colorLabel: 'Колір',
      wholesalePriceLabel: 'Гуртова ціна',
      perPairWord: 'за пару',
      availableColors: 'ВСІ КОЛЬОРИ ЦІЄЇ МОДЕЛІ',
      orderParams: 'КОМПЛЕКТАЦІЯ ЗАМОВЛЕННЯ У НАКЛАДНУ',
      wholesaleRun: 'Гуртова ростовка',
      sampleRun: 'Тестовий зразок (1 п.)',
      standard8: '8 пар • Стандарт',
      standard8Desc: '42 і 43 р. — по 2 пари',
      even6: '6 пар • Рівна',
      even6Desc: '40–45 р. — всі по 1 парі',
      boxesCountLabel: 'Кількість коробів:',
      samplePrompt: 'Виберіть розмір тестового зразка:',
      addToCart: 'Додати до накладної',
      addedSuccess: '✓ Додано до накладної',
      alreadyInCart: (p: number, usd: number) => `Вже у накладній: ${p} пар ($${usd})`,
      openWord: 'Відкрити →',
      bottomOrderTitle: 'ВАШЕ ГУРТОВЕ ЗАМОВЛЕННЯ (ЗА ПРАЙСОМ)',
      bottomInvoiceText: (m: number, p: number, usd: number) =>
        `${m} мод. • ${p} пар • $${usd}`,
      openInvoiceBtn: 'Оформити →',
    },
    de: {
      backToPublic: '← Zurück',
      backToPriceList: '← Preiskatalog',
      invoiceBtn: (p: number, usd: number) => `Rechnung (${p} P. • $${usd})`,
      pinTag: 'CARDIO B2B // EXKLUSIVER BEREICH',
      pinTitle: 'Großhandel Preiskatalog 2026',
      pinSub:
        'Die Großhandelspreise sind ausschließlich für autorisierte Partner bestimmt. Bitte 4-stelligen PIN eingeben:',
      pinUnlockBtn: 'Preiskatalog öffnen →',
      pinErrorText: 'Ungültiger PIN-Code. Bitte beim Verkaufsleiter anfordern.',
      askPinTitle: 'PIN-Code beim Verkaufsleiter anfordern:',
      askBoris: 'Boris • +38 (097) 454-15-11',
      askGeorgiy: 'Georgiy • +38 (067) 719-37-16',
      lookbookTag: 'CARDIO FOOTWEAR // WHOLESALE LOOKBOOK 2026',
      mainTitle: 'Großhandel Preiskatalog 2026',
      downloadBtn: (count: number) =>
        `⬇ Editorial Lookbook PDF laden (${count} Mod. • 1 Mod. = 1 Seite)`,
      downloadBtnTop: '⬇ PDF Lookbook',
      stageRendering: (cur: number, tot: number) =>
        `KATALOGSEITEN WERDEN ERSTELLT (${cur}/${tot})`,
      stagePackaging: (tot: number) =>
        `✓ ALLE ${tot} SEITEN ERSTELLT • PDF WIRD VERPACKT & GESENDET`,
      stagePackagingSub:
        'Geschützte PDF-Datei wird für Ihr Gerät und Telegram vorbereitet, bitte warten',
      soundPlayingHint: '♪ Audio-Begleitung aktiv',
      readyBannerTitle: (tot: number) =>
        `✓ KATALOG VOLLSTÄNDIG ERSTELLT (${tot} SEITEN A4)`,
      sentToTgBanner: '✓ Datei wurde auch in Ihren Telegram-Chat von @Cordwainer_bot gesendet!',
      downloadDirectBtn: '📥 FERTIGE PDF AUF GERÄT HERUNTERLADEN / ÖFFNEN →',
      tabAll: `Alle Modelle (${counts.all})`,
      tabAutumn: `Herbst 2026 (${counts.autumn})`,
      tabWinter: `Winter 2026 (${counts.winter})`,
      box6: 'Kiste 6 Paar',
      box8: 'Kiste 8 Paar',
      orderBtn: 'Serie wählen →',
      reorderBtn: 'Nachbestellen →',
      inCartBadge: (p: number) => `IM WAGEN: ${p} P.`,
      footerSub: 'GROSSHANDELSABTEILUNG // CARDIO CHARKIW',
      georgiyName: 'Georgiy',
      borisName: 'Boris',
      securityNote: 'Vertrauliches B2B-Dokument für Großhandelspartner.',
      cardTitle: 'MODELLKARTE (B2B PREIS)',
      colorLabel: 'Farbe',
      wholesalePriceLabel: 'Großhandelspreis',
      perPairWord: 'pro Paar',
      availableColors: 'VERFÜGBARE FARBVARIANTEN',
      orderParams: 'BESTELLKONFIGURATION',
      wholesaleRun: 'Großhandelsserie',
      sampleRun: 'Testmuster (1 P.)',
      standard8: '8 Paar • Standard',
      standard8Desc: 'Gr. 42 & 43 — je 2 Paar',
      even6: '6 Paar • Gleich',
      even6Desc: 'Gr. 40–45 — je 1 Paar',
      boxesCountLabel: 'Anzahl Kisten:',
      samplePrompt: 'Testmuster-Größe wählen:',
      addToCart: 'Zur Rechnung hinzufügen',
      addedSuccess: '✓ Hinzugefügt',
      alreadyInCart: (p: number, usd: number) =>
        `Bereits auf der Rechnung: ${p} Paar ($${usd})`,
      openWord: 'Öffnen →',
      bottomOrderTitle: 'IHRE GROSSHANDELSBESTELLUNG',
      bottomInvoiceText: (m: number, p: number, usd: number) =>
        `${m} Mod. • ${p} Paar • $${usd}`,
      openInvoiceBtn: 'Bestellen →',
    },
  }[lang];
}

/** Тип словаря UI-переводов для удобной передачи в дочерние экранные компоненты */
export type WholesaleUiText = ReturnType<typeof getWholesaleUiText>;

/**
 * Словарь печатных текстов для рендеринга страниц PDF-каталога А4 на Canvas.
 */
export function getPdfLookbookText(lang: WholesaleLang) {
  return {
    ru: {
      edition: 'WHOLESALE EDITORIAL LOOKBOOK // 2026',
      overviewTitle: 'О КОЛЛЕКЦИИ И СТАНДАРТЫ ОПТОВОЙ ЗАКУПКИ',
      manifestoLead:
        'Коллекция CARDIO 2026 создана для европейских и украинских дистрибьюторов, байеров обувных сетей и владельцев мультибрендовых магазинов.',
      manifestoBody:
        'Каждая пара проектируется и отшивается на собственном производстве в Харькове из отборной натуральной кожи, мембранных материалов Gore-Tex и износостойких подошв с выверенной анатомической колодкой.',
      tocTitle: 'СОДЕРЖАНИЕ КАТАЛОГА',
      tocAutumn: '01. КОЛЛЕКЦИЯ ОСЕНЬ 2026 (Кроссовки и туфли)',
      tocWinter: '02. КОЛЛЕКЦИЯ ЗИМА 2026 (Ботинки и зимние кроссовки)',
      tocContacts: '03. КОНТАКТЫ ОПТОВОГО ОТДЕЛА И УСЛОВИЯ ОТГРУЗКИ',
      boxStandardsTitle: 'СТАНДАРТНЫЕ КОМПЛЕКТАЦИИ КОРОБОВ (РАЗМЕРЫ 40—45)',
      box8Title: 'КОРОБ 8 ПАР — СТАНДАРТНАЯ РОСТОВКА',
      box8Formula:
        '40 (1)  ·  41 (1)  ·  42 (2)  ·  43 (2)  ·  44 (1)  ·  45 (1)   =   8 пар в коробе',
      box6Title: 'КОРОБ 6 ПАР — РОВНАЯ РОСТОВКА',
      box6Formula:
        '40 (1)  ·  41 (1)  ·  42 (1)  ·  43 (1)  ·  44 (1)  ·  45 (1)   =   6 пар в коробе',
      autumnChapter: 'ГЛАВА 01 // ОСЕННИЙ СЕЗОН',
      winterChapter: 'ГЛАВА 02 // ЗИМНИЙ СЕЗОН',
      autumnSub: 'КРОССОВКИ И ТУФЛИ  ·  РАЗМЕРЫ 40—45  ·  ОПТ $34—$39',
      winterSub: 'ЗИМНИЕ БОТИНКИ И КРОССОВКИ  ·  РАЗМЕРЫ 40—45  ·  ОПТ $41—$49',
      seasonAutumnLabel: 'AUTUMN COLLECTION 2026',
      seasonWinterLabel: 'WINTER COLLECTION 2026',
      modelLabel: 'МОДЕЛЬ / АРТИКУЛ',
      wholesalePriceLabel: 'ОПТОВАЯ ЦЕНА ЗА ПАРУ',
      colorMaterialLabel: 'ЦВЕТ И ИСПОЛНЕНИЕ',
      naturalLeather: 'НАТУРАЛЬНАЯ КОЖА',
      sizeRangeLabel: 'РАЗМЕРНЫЙ РЯД',
      fullSizeScale: 'ПОЛНОМЕРНАЯ СЕТКА',
      box6Label: 'КОРОБ 6 ПАР (РОВНАЯ)',
      box6Sub: '40–45 по 1 паре',
      box8Label: 'КОРОБ 8 ПАР (СТАНДАРТ)',
      box8Sub: '42 и 43 р. — по 2 пары',
      contactsPageTitle: 'ОТДЕЛ ОПТОВЫХ ПРОДАЖ',
      contactsPageSub: 'ПРЯМЫЕ ПОСТАВКИ ОТ ПРОИЗВОДИТЕЛЯ  ·  ХАРЬКОВ, УКРАИНА',
      managerRole: 'РУКОВОДИТЕЛЬ ОПТОВОГО НАПРАВЛЕНИЯ',
      georgiyName: 'Георгий',
      borisName: 'Борис',
      shippingNote:
        'Отгрузка заказов осуществляется со склада фабрики в Харькове (Новая Почта / паллетная доставка). Минимальный оптовый заказ — от 1 ростовки (6 или 8 пар). Доступен заказ тестового образца (1 пара).',
    },
    uk: {
      edition: 'WHOLESALE EDITORIAL LOOKBOOK // 2026',
      overviewTitle: 'ПРО КОЛЕКЦІЮ ТА СТАНДАРТИ ГУРТОВОЇ ЗАКУПІВЛІ',
      manifestoLead:
        'Колекція CARDIO 2026 створена для дистриб’юторів, байєрів взуттєвих мереж та власників мультибрендових магазинів.',
      manifestoBody:
        'Кожна пара проектується та відшивається на власному виробництві у Харкові з відбірної натуральної шкіри, мембранних матеріалів Gore-Tex та зносостійких підошов з анатомічною колодкою.',
      tocTitle: 'ЗМІСТ КАТАЛОГУ',
      tocAutumn: '01. КОЛЕКЦІЯ ОСІНЬ 2026 (Кросівки та туфлі)',
      tocWinter: '02. КОЛЕКЦІЯ ЗИМА 2026 (Черевики та зимові кросівки)',
      tocContacts: '03. КОНТАКТИ ГУРТОВОГО ВІДДІЛУ ТА УМОВИ ВІДВАНТАЖЕННЯ',
      boxStandardsTitle: 'СТАНДАРТНІ КОМПЛЕКТАЦІЇ КОРОБІВ (РОЗМІРИ 40—45)',
      box8Title: 'КОРОБ 8 ПАР — СТАНДАРТНА РОСТОВКА',
      box8Formula:
        '40 (1)  ·  41 (1)  ·  42 (2)  ·  43 (2)  ·  44 (1)  ·  45 (1)   =   8 пар у коробі',
      box6Title: 'КОРОБ 6 ПАР — РІВНА РОСТОВКА',
      box6Formula:
        '40 (1)  ·  41 (1)  ·  42 (1)  ·  43 (1)  ·  44 (1)  ·  45 (1)   =   6 пар у коробі',
      autumnChapter: 'РОЗДІЛ 01 // ОСІННІЙ СЕЗОН',
      winterChapter: 'РОЗДІЛ 02 // ЗИМОВИЙ СЕЗОН',
      autumnSub: 'КРОСІВКИ ТА ТУФЛІ  ·  РОЗМІРИ 40—45  ·  ГУРТ $34—$39',
      winterSub: 'ЗИМОВІ ЧЕРЕВИКИ ТА КРОСІВКИ  ·  РОЗМІРИ 40—45  ·  ГУРТ $41—$49',
      seasonAutumnLabel: 'AUTUMN COLLECTION 2026',
      seasonWinterLabel: 'WINTER COLLECTION 2026',
      modelLabel: 'МОДЕЛЬ / АРТИКУЛ',
      wholesalePriceLabel: 'ГУРТОВА ЦІНА ЗА ПАРУ',
      colorMaterialLabel: 'КОЛІР ТА ВИКОНАННЯ',
      naturalLeather: 'НАТУРАЛЬНА ШКІРА',
      sizeRangeLabel: 'РОЗМІРНИЙ РЯД',
      fullSizeScale: 'ПОВНОМІРНА СІТКА',
      box6Label: 'КОРОБ 6 ПАР (РІВНА)',
      box6Sub: '40–45 по 1 парі',
      box8Label: 'КОРОБ 8 ПАР (СТАНДАРТ)',
      box8Sub: '42 і 43 р. — по 2 пари',
      contactsPageTitle: 'ВІДДІЛ ГУРТОВОГО ПРОДАЖУ',
      contactsPageSub: 'ПРЯМІ ПОСТАВКИ ВІД ВИРОБНИКА  ·  ХАРКІВ, УКРАЇНА',
      managerRole: 'КЕРІВНИК ГУРТОВОГО НАПРЯМКУ',
      georgiyName: 'Георгій',
      borisName: 'Борис',
      shippingNote:
        'Відвантаження замовлень здійснюється зі складу фабрики у Харкові (Нова Пошта / палетна доставка). Мінімальне гуртове замовлення — від 1 ростовки (6 або 8 пар). Доступне замовлення тестового зразка (1 пара).',
    },
    de: {
      edition: 'WHOLESALE EDITORIAL LOOKBOOK // 2026',
      overviewTitle: 'KOLLEKTIONSÜBERSICHT & GROSSHANDELSSTANDARDS',
      manifestoLead:
        'Die CARDIO 2026 Kollektion wurde für europäische Distributoren, Schuheinkäufer und Inhaber von Fachgeschäften entwickelt.',
      manifestoBody:
        'Jedes Paar wird in unserer eigenen Manufaktur in Charkiw aus hochwertigem Naturleder, Gore-Tex-Membranen und langlebigen Profilsohlen mit anatomischer Passform gefertigt.',
      tocTitle: 'INHALTSVERZEICHNIS',
      tocAutumn: '01. HERBSTKOLLEKTION 2026 (Sneaker & Halbschuhe)',
      tocWinter: '02. WINTERKOLLEKTION 2026 (Stiefel & Wintersneaker)',
      tocContacts: '03. GROSSHANDELSKONTAKT & LIEFERBEDINGUNGEN',
      boxStandardsTitle: 'STANDARD-SORTIMENTE PRO KISTE (GRÖSSEN 40—45)',
      box8Title: 'KISTE 8 PAAR — STANDARDSERIE',
      box8Formula:
        '40 (1)  ·  41 (1)  ·  42 (2)  ·  43 (2)  ·  44 (1)  ·  45 (1)   =   8 Paar pro Kiste',
      box6Title: 'KISTE 6 PAAR — GLEICHE SERIE',
      box6Formula:
        '40 (1)  ·  41 (1)  ·  42 (1)  ·  43 (1)  ·  44 (1)  ·  45 (1)   =   6 Paar pro Kiste',
      autumnChapter: 'KAPITEL 01 // HERBSTSAISON',
      winterChapter: 'KAPITEL 02 // WINTERSAISON',
      autumnSub: 'SNEAKER & HALBSCHUHE  ·  GRÖSSEN 40—45  ·  B2B $34—$39',
      winterSub: 'WINTERSTIEFEL & SNEAKER  ·  GRÖSSEN 40—45  ·  B2B $41—$49',
      seasonAutumnLabel: 'AUTUMN COLLECTION 2026',
      seasonWinterLabel: 'WINTER COLLECTION 2026',
      modelLabel: 'MODELL / ARTIKEL-NR.',
      wholesalePriceLabel: 'GROSSHANDELSPREIS PRO PAAR',
      colorMaterialLabel: 'FARBE & AUSFÜHRUNG',
      naturalLeather: 'ECHTLEDER',
      sizeRangeLabel: 'GRÖSSENLAUF',
      fullSizeScale: 'EUROPÄISCHE PASSFORM',
      box6Label: 'KISTE 6 PAAR (GLEICH)',
      box6Sub: 'Gr. 40–45 je 1 Paar',
      box8Label: 'KISTE 8 PAAR (STANDARD)',
      box8Sub: 'Gr. 42 & 43 je 2 Paar',
      contactsPageTitle: 'GROSSHANDELSABTEILUNG',
      contactsPageSub: 'DIREKTVERTRIEB AB WERK  ·  CHARKIW, UKRAINE',
      managerRole: 'VERKAUFSLEITUNG B2B',
      georgiyName: 'Georgiy',
      borisName: 'Boris',
      shippingNote:
        'Der Versand erfolgt direkt ab Werk Charkiw. Mindestbestellmenge im Großhandel: ab 1 Kiste (6 oder 8 Paar). Einzelne Testmuster (1 Paar) sind ebenfalls bestellbar.',
    },
  }[lang];
}

