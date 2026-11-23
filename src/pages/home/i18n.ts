import type { Lang } from '../../App'
import type { HomeStrings } from './types'

export function glossaryLabel(count: number, lang: Lang): string {
  if (lang === 'uk') {
    const n10 = count % 10
    const n100 = count % 100
    if (n10 === 1 && n100 !== 11) return `${count} термін`
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return `${count} терміни`
    return `${count} термінів`
  }
  if (lang === 'de') {
    return count === 1 ? `${count} Begriff` : `${count} Begriffe`
  }
  const n10 = count % 10
  const n100 = count % 100
  if (n10 === 1 && n100 !== 11) return `${count} термин`
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return `${count} термина`
  return `${count} терминов`
}

export function getSafeLang(lang: Lang): 'ru' | 'uk' | 'de' {
  if (lang === 'ru' || lang === 'uk' || lang === 'de') {
    return lang
  }
  return 'uk'
}

export function getHomeStrings(
  lang: 'ru' | 'uk' | 'de',
  calculatorsCount: number,
  hasNewBlog: boolean,
  glossaryCount: number,
  favoritesCount: number,
): HomeStrings {
  if (lang === 'ru') {
    return {
      back: 'Назад',
      issue: 'ВЫПУСК № 01 — ЦИФРОВАЯ ЭНЦИКЛОПЕДИЯ',
      heroTag: 'ВИДЕО-ЛУКБУК • 15 СИЛУЭТОВ',
      heroTitle: 'Анатомия\nФормы',
      heroCta: 'Смотреть лукбук',
      search: 'Поиск: коллекция Cardio, силуэты, статьи...',
      clear: 'Сброс',
      learning: 'I. ДОМ ОБУВИ И ЭКСПОЗИЦИЯ',
      tools: 'II. ИНСТРУМЕНТАРИЙ И АРХИВ',
      system: 'III. СИСТЕМА И КОЛЛЕКЦИЯ',
      materials: 'Cardio',
      materialsSub: 'Производство • Опт',
      cardioBadge: 'MAISON CARDIO',
      cardioDesc:
        'Авторское производство мужской обуви. Сезонный лукбук, колодки и прямой оптовый заказ.',
      cardioCta: 'Открыть коллекцию',
      colors: 'Цвета',
      colorsSub: 'Патина и колористика',
      styles: 'Силуэты',
      stylesSub: '15 культовых фасонов',
      sneakers: 'Footwear Index',
      sneakersSub: 'Каталог и мировые релизы',
      calc: 'Калькуляторы',
      calcSub: `${calculatorsCount} точных модулей`,
      blog: 'Архив статей',
      blogSub: hasNewBlog ? 'Свежий выпуск' : 'Журнал',
      glossary: 'Глоссарий',
      glossarySub: glossaryLabel(glossaryCount, 'ru'),
      prices: 'Рынок',
      pricesSub: 'Индекс цен',
      settings: 'Интерфейс',
      settingsSub: 'Тема и язык',
      profile: 'Профиль',
      profileSub: 'Личные данные',
      favorites: 'Личный архив',
      favoritesSub:
        favoritesCount > 0 ? `Сохранено томов: ${favoritesCount}` : 'Пусто',
      supportTitle: 'Меценатство',
      supportDesc: 'Поддержать издание',
      quote: '«Мастерство — в деталях. Знание — в опыте.»',
      searchResults: 'Найдено в архиве',
      noResults: 'По вашему запросу записей не найдено',
      section: 'Раздел',
    }
  }

  if (lang === 'de') {
    return {
      back: 'Zurück',
      issue: 'AUSGABE № 01 — DIGITALE ENZYKLOPÄDIE',
      heroTag: 'VIDEO-LOOKBOOK • 15 SILHOUETTEN',
      heroTitle: 'Anatomie\nder Form',
      heroCta: 'Lookbook öffnen',
      search: 'Suche: Cardio Kollektion, Silhouetten, Artikel...',
      clear: 'Löschen',
      learning: 'I. SCHUHHAUS & EXPOSITION',
      tools: 'II. WERKZEUGE & ARCHIV',
      system: 'III. SYSTEM & SAMMLUNG',
      materials: 'Cardio',
      materialsSub: 'Manufaktur • B2B',
      cardioBadge: 'MAISON CARDIO',
      cardioDesc:
        'Herrenschuh-Manufaktur. Saisonales Lookbook, Leisten und direkte B2B-Bestellung.',
      cardioCta: 'Kollektion öffnen',
      colors: 'Farben',
      colorsSub: 'Patina & Farblehre',
      styles: 'Silhouetten',
      stylesSub: '15 ikonische Schnitte',
      sneakers: 'Footwear Index',
      sneakersSub: 'Katalog & Releases',
      calc: 'Rechner',
      calcSub: `${calculatorsCount} Präzisionsmodule`,
      blog: 'Artikelarchiv',
      blogSub: hasNewBlog ? 'Neue Ausgabe' : 'Journal',
      glossary: 'Glossar',
      glossarySub: glossaryLabel(glossaryCount, 'de'),
      prices: 'Markt',
      pricesSub: 'Preisindex',
      settings: 'Oberfläche',
      settingsSub: 'Design & Sprache',
      profile: 'Profil',
      profileSub: 'Persönliche Daten',
      favorites: 'Persönliches Archiv',
      favoritesSub:
        favoritesCount > 0 ? `Gespeicherte Bände: ${favoritesCount}` : 'Leer',
      supportTitle: 'Patronat',
      supportDesc: 'Edition unterstützen',
      quote: '„Meisterschaft liegt im Detail. Wissen in der Erfahrung.“',
      searchResults: 'Suchergebnisse',
      noResults: 'Keine Einträge gefunden',
      section: 'Bereich',
    }
  }

  return {
    back: 'Назад',
    issue: 'ВИПУСК № 01 — ЦИФРОВА ЕНЦИКЛОПЕДІЯ',
    heroTag: 'ВІДЕО-ЛУКБУК • 15 СИЛУЕТІВ',
    heroTitle: 'Анатомія\nФорми',
    heroCta: 'Дивитися лукбук',
    search: 'Пошук: колекція Cardio, силуети, статті...',
    clear: 'Скинути',
    learning: 'I. ДІМ ВЗУТТЯ ТА ЕКСПОЗИЦІЯ',
    tools: 'II. ІНСТРУМЕНТАРІЙ ТА АРХІВ',
    system: 'III. СИСТЕМА ТА КОЛЕКЦІЯ',
    materials: 'Cardio',
    materialsSub: 'Виробництво • Гурт',
    cardioBadge: 'MAISON CARDIO',
    cardioDesc:
      'Авторське виробництво чоловічого взуття. Сезонний лукбук, колодки та пряме гуртове замовлення.',
    cardioCta: 'Відкрити колекцію',
    colors: 'Кольори',
    colorsSub: 'Патина та колористика',
    styles: 'Силуети',
    stylesSub: '15 культових фасонів',
    sneakers: 'Footwear Index',
    sneakersSub: 'Каталог та світові релізи',
    calc: 'Калькулятори',
    calcSub: `${calculatorsCount} точних модулів`,
    blog: 'Архів статей',
    blogSub: hasNewBlog ? 'Свіжий випуск' : 'Журнал',
    glossary: 'Глосарій',
    glossarySub: glossaryLabel(glossaryCount, 'uk'),
    prices: 'Ринок',
    pricesSub: 'Індекс цін',
    settings: 'Інтерфейс',
    settingsSub: 'Тема та мова',
    profile: 'Профіль',
    profileSub: 'Особисті дані',
    favorites: 'Особистий архів',
    favoritesSub:
      favoritesCount > 0 ? `Збережено томів: ${favoritesCount}` : 'Порожньо',
    supportTitle: 'Меценатство',
    supportDesc: 'Підтримати видання',
    quote: '«Майстерність — в деталях. Знання — в досвіді.»',
    searchResults: 'Знайдено в архіві',
    noResults: 'За вашим запитом записів не знайдено',
    section: 'Розділ',
  }
}

