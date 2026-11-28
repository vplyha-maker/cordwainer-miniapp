import type { GlossaryTerm } from '../../data/glossary'
import type { Lang } from '../../App'

export type GlossaryLang = 'ru' | 'uk' | 'de'
export type GlossaryCategory = NonNullable<GlossaryTerm['category']>

export function resolveGlossaryLang(lang: Lang): GlossaryLang {
  if (lang === 'uk' || lang === 'de') return lang
  return 'ru'
}

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    const tg = (window as unknown as {
      Telegram?: {
        WebApp?: {
          HapticFeedback?: { impactOccurred?: (s: string) => void }
        }
      }
    }).Telegram?.WebApp
    tg?.HapticFeedback?.impactOccurred?.(style)
  } catch {}
}

export const CATEGORY_META: Record<
  GlossaryCategory,
  {
    ru: string
    uk: string
    de: string
    dotDark: string
    dotLight: string
    pillDark: string
    pillLight: string
  }
> = {
  material: {
    ru: 'Материалы',
    uk: 'Матеріали',
    de: 'Materialien',
    dotDark: '#C9A86A',
    dotLight: '#9A6B2F',
    pillDark: 'bg-[#C9A86A]/12 text-[#DFC186] border-[#C9A86A]/20',
    pillLight: 'bg-[#9A6B2F]/10 text-[#7D5521] border-[#9A6B2F]/20',
  },
  part: {
    ru: 'Детали',
    uk: 'Деталі',
    de: 'Schuhteile',
    dotDark: '#8AA7CC',
    dotLight: '#43628A',
    pillDark: 'bg-[#8AA7CC]/12 text-[#AFC5E0] border-[#8AA7CC]/20',
    pillLight: 'bg-[#43628A]/10 text-[#344F73] border-[#43628A]/20',
  },
  process: {
    ru: 'Процессы',
    uk: 'Процеси',
    de: 'Verfahren',
    dotDark: '#D48C6A',
    dotLight: '#A85834',
    pillDark: 'bg-[#D48C6A]/12 text-[#E5AE93] border-[#D48C6A]/20',
    pillLight: 'bg-[#A85834]/10 text-[#8B4425] border-[#A85834]/20',
  },
  tool: {
    ru: 'Инструменты',
    uk: 'Інструменти',
    de: 'Werkzeuge',
    dotDark: '#7EA892',
    dotLight: '#3F6F57',
    pillDark: 'bg-[#7EA892]/12 text-[#A4C7B5] border-[#7EA892]/20',
    pillLight: 'bg-[#3F6F57]/10 text-[#2E5742] border-[#3F6F57]/20',
  },
  type: {
    ru: 'Виды',
    uk: 'Види',
    de: 'Arten',
    dotDark: '#B396CC',
    dotLight: '#6F518A',
    pillDark: 'bg-[#B396CC]/12 text-[#CBB4DF] border-[#B396CC]/20',
    pillLight: 'bg-[#6F518A]/10 text-[#5B4073] border-[#6F518A]/20',
  },
  defect: {
    ru: 'Дефекты',
    uk: 'Дефекти',
    de: 'Defekte',
    dotDark: '#D97B7B',
    dotLight: '#AD4242',
    pillDark: 'bg-[#D97B7B]/12 text-[#E8A2A2] border-[#D97B7B]/20',
    pillLight: 'bg-[#AD4242]/10 text-[#8F3131] border-[#AD4242]/20',
  },
  other: {
    ru: 'Прочее',
    uk: 'Інше',
    de: 'Sonstiges',
    dotDark: '#A39E96',
    dotLight: '#6B665F',
    pillDark: 'bg-[#F4F0E8]/[0.07] text-[#C8C2B8] border-[#F4F0E8]/12',
    pillLight: 'bg-[#181715]/[0.06] text-[#524E47] border-[#181715]/10',
  },
}

export const ALPHABETS: Record<GlossaryLang, string[]> = {
  ru: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split(''),
  uk: 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЮЯ'.split(''),
  de: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ'.split(''),
}

export const GLOSSARY_I18N: Record<
  GlossaryLang,
  {
    back: string
    eyebrow: string
    title: string
    manifesto: string
    searchPlaceholder: string
    all: string
    allLetters: string
    entries: string
    empty: string
    emptySub: string
    emptyReset: string
    vipTitle: string
    vipDesc: (count: number) => string
    vipBtn: string
    flipHint: string
    flipBack: string
    openDossier: string
    exampleLabel: string
    definitionLabel: string
    translationsLabel: string
    colTerm: string
    colCategory: string
    colDefinition: string
    colAction: string
    readAction: string
    lockedBadge: string
    paywallBadge: string
    paywallDesc: string
    paywallBtn: string
    closeLabel: string
  }
> = {
  ru: {
    back: 'Назад',
    eyebrow: 'THE SHOEMAKER’S LEXICON',
    title: 'Словарь',
    manifesto: 'Интерактивная база обувной терминологии, материалов, конструкций и ремесленных процессов.',
    searchPlaceholder: 'Поиск термина, материала или детали...',
    all: 'Все главы',
    allLetters: 'Все',
    entries: 'терминов',
    empty: 'Ничего не найдено',
    emptySub: 'Попробуйте изменить запрос или сбросить активные фильтры.',
    emptyReset: 'Сбросить фильтры',
    vipTitle: 'Полный доступ к базе знаний',
    vipDesc: (n) => `Откройте все ${n} профессиональных терминов с переводами и примерами навсегда`,
    vipBtn: 'Открыть • 1 ★',
    flipHint: 'Определение',
    flipBack: 'Назад',
    openDossier: 'Подробнее',
    exampleLabel: 'Контекст и применение',
    definitionLabel: 'Определение',
    translationsLabel: 'Языковые эквиваленты',
    colTerm: 'Термин',
    colCategory: 'Категория',
    colDefinition: 'Описание',
    colAction: 'Доступ',
    readAction: 'Открыть',
    lockedBadge: 'PRO',
    paywallBadge: 'Закрытый раздел',
    paywallDesc: 'Доступно в полной версии словаря Cordwaine',
    paywallBtn: 'Открыть доступ • 1 ★',
    closeLabel: 'Закрыть',
  },
  uk: {
    back: 'Назад',
    eyebrow: 'THE SHOEMAKER’S LEXICON',
    title: 'Словник',
    manifesto: 'Інтерактивна база взуттєвої термінології, матеріалів, конструкцій та ремісничих процесів.',
    searchPlaceholder: 'Пошук терміна, матеріалу чи деталі...',
    all: 'Усі глави',
    allLetters: 'Усі',
    entries: 'термінів',
    empty: 'Нічого не знайдено',
    emptySub: 'Спробуйте змінити запит або скинути активні фільтри.',
    emptyReset: 'Скинути фільтри',
    vipTitle: 'Повний доступ до бази знань',
    vipDesc: (n) => `Відкрийте всі ${n} професійних термінів із перекладами та прикладами назавжди`,
    vipBtn: 'Відкрити • 1 ★',
    flipHint: 'Визначення',
    flipBack: 'Назад',
    openDossier: 'Докладніше',
    exampleLabel: 'Контекст та застосування',
    definitionLabel: 'Визначення',
    translationsLabel: 'Мовні еквіваленти',
    colTerm: 'Термін',
    colCategory: 'Категорія',
    colDefinition: 'Опис',
    colAction: 'Доступ',
    readAction: 'Відкрити',
    lockedBadge: 'PRO',
    paywallBadge: 'Закритий розділ',
    paywallDesc: 'Доступно у повній версії словника Cordwaine',
    paywallBtn: 'Відкрити доступ • 1 ★',
    closeLabel: 'Закрити',
  },
  de: {
    back: 'Zurück',
    eyebrow: 'THE SHOEMAKER’S LEXICON',
    title: 'Lexikon',
    manifesto: 'Interaktive Wissensdatenbank für Schuhmacher-Terminologie, Materialien, Konstruktionen und Verfahren.',
    searchPlaceholder: 'Begriff, Material oder Bauteil suchen...',
    all: 'Alle Kapitel',
    allLetters: 'Alle',
    entries: 'Einträge',
    empty: 'Keine Treffer gefunden',
    emptySub: 'Passen Sie Ihre Suche an oder setzen Sie die aktiven Filter zurück.',
    emptyReset: 'Filter zurücksetzen',
    vipTitle: 'Vollzugriff auf das Lexikon',
    vipDesc: (n) => `Schalten Sie alle ${n} Fachbegriffe mit Übersetzungen dauerhaft frei`,
    vipBtn: 'Freischalten • 1 ★',
    flipHint: 'Definition',
    flipBack: 'Zurück',
    openDossier: 'Details',
    exampleLabel: 'Kontext & Anwendung',
    definitionLabel: 'Definition',
    translationsLabel: 'Sprachvarianten',
    colTerm: 'Begriff',
    colCategory: 'Kategorie',
    colDefinition: 'Beschreibung',
    colAction: 'Status',
    readAction: 'Lesen',
    lockedBadge: 'PRO',
    paywallBadge: 'Geschützter Eintrag',
    paywallDesc: 'Verfügbar in der Vollversion des Cordwaine Lexikons',
    paywallBtn: 'Freischalten • 1 ★',
    closeLabel: 'Schließen',
  },
}

export function getLocalizedTitle(item: GlossaryTerm, lang: GlossaryLang): string {
  if (lang === 'de' && item.termDe) return item.termDe
  if (lang === 'uk' && item.termUk) return item.termUk
  return item.term
}

export function getAltTitle(item: GlossaryTerm, lang: GlossaryLang): string | undefined {
  if (lang === 'de') return item.term
  if (item.termDe) return item.termDe
  return lang === 'ru' ? item.termUk : item.term
}

export function getLocalizedDef(item: GlossaryTerm, lang: GlossaryLang): string {
  if (lang === 'de' && item.definitionDe) return item.definitionDe
  if (lang === 'uk' && item.definitionUk) return item.definitionUk
  return item.definition
}

export function getLocalizedEx(item: GlossaryTerm, lang: GlossaryLang): string | undefined {
  if (lang === 'de' && item.exampleDe) return item.exampleDe
  if (lang === 'uk' && item.exampleUk) return item.exampleUk
  return item.example
}

export function getGlossaryTheme(isDark: boolean) {
  return {
    bgPage: isDark ? 'bg-[#0B0B0C]' : 'bg-[#F7F4EE]',
    bgHeader: isDark ? 'bg-[#0B0B0C]/85' : 'bg-[#F7F4EE]/85',
    bgCard: isDark
      ? 'bg-[#141416] hover:bg-[#19191C]'
      : 'bg-[#FFFFFF] hover:bg-[#FCFBF8]',
    bgCardStatic: isDark ? 'bg-[#141416]' : 'bg-[#FFFFFF]',
    bgSurface: isDark ? 'bg-[#141416]' : 'bg-[#EFEAE1]',
    bgSurfaceSoft: isDark ? 'bg-[#1C1C20]' : 'bg-[#E5DFD3]',
    textPrimary: isDark ? 'text-[#F4F0E8]' : 'text-[#181715]',
    textSecondary: isDark ? 'text-[#B8B2A8]' : 'text-[#524E47]',
    textTertiary: isDark ? 'text-[#8B867E]' : 'text-[#736E66]',
    hairline: isDark ? 'border-[#F4F0E8]/[0.09]' : 'border-[#181715]/[0.09]',
    hairlineHover: isDark
      ? 'hover:border-[#F4F0E8]/[0.18]'
      : 'hover:border-[#181715]/[0.18]',
    divider: isDark ? 'divide-[#F4F0E8]/[0.08]' : 'divide-[#181715]/[0.08]',
    accentHex: isDark ? '#C9A86A' : '#9A6B2F',
    accentText: isDark ? 'text-[#C9A86A]' : 'text-[#9A6B2F]',
    activeInvert: isDark
      ? 'bg-[#F4F0E8] text-[#0B0B0C]'
      : 'bg-[#181715] text-[#F7F4EE]',
    cardShadow: isDark
      ? 'shadow-[0_1px_0_0_rgba(244,240,232,0.04)_inset]'
      : 'shadow-[0_2px_10px_rgba(24,23,21,0.04)] hover:shadow-[0_8px_24px_rgba(24,23,21,0.07)]',
  }
}

