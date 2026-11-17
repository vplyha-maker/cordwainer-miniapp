import { useMemo, useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'
import {
  convertShoeSize,
  formatSize,
  RANGES,
  type Gender,
} from '../lib/shoeSizes'

type SizeCalcPageProps = {
  onBack: () => void
  lang: Lang
}

export type ShoeStyle = 'sneakers' | 'classic' | 'winter' | 'running' | 'sandals'
export type WidthFit = 'narrow' | 'standard' | 'wide' | 'extraWide'
type ActiveTab = 'world' | 'fit' | 'brands' | 'guide'

export type ExtendedSizeResult = {
  mondopoint: number
  eu: number
  uk: number
  us: number
  ukr: number
  jp: number
  cn: number
  kr: number
  br: number
  cm: number
  mm: number
}

export type WidthMarks = {
  eu: 'E' | 'F' | 'G' | 'H'
  us: string
  uk: string
  jp: string
  gost: number
  cn: string
}

export type BrandFitEntry = {
  brand: string
  category: string
  eu: string
  us: string
  uk: string
  jp: string
  offsetNote: {
    ru: string
    uk: string
    de: string
    en: string
  }
}

export type ProFitResult = {
  insoleMm: number
  insoleCm: number
  lastTraceMm: number
  allowanceMm: number
  ballWidthMm: number
  ballGirthMm: number
  instepGirthMm: number
  widthMarks: WidthMarks
  brandMatrix: BrandFitEntry[]
}

const PRO_PRICE_STARS = 150

const STYLE_ALLOWANCES: Record<
  ShoeStyle,
  { insoleAddMm: number; lastTraceAddMm: number }
> = {
  sneakers: { insoleAddMm: 10, lastTraceAddMm: 12 },
  classic: { insoleAddMm: 12, lastTraceAddMm: 16 },
  winter: { insoleAddMm: 15, lastTraceAddMm: 18 },
  running: { insoleAddMm: 13, lastTraceAddMm: 15 },
  sandals: { insoleAddMm: 6, lastTraceAddMm: 7 },
}

/**
 * Расширяет базовый результат convertShoeSize мировыми стандартами JP, CN, KR, BR.
 * Полностью совместимо как со старой, так и с новой версией ../lib/shoeSizes.
 */
function computeExtendedSize(footMm: number, gender: Gender): ExtendedSizeResult {
  const base = convertShoeSize(footMm, gender)
  // Японский стандарт JIS S 5037: длина стопы в см с шагом 0.5
  const jp = Math.round((base.mondopoint / 10) * 2) / 2
  // Китайский стандарт GB/T 3293.1: (см * 2) - 10
  const cn = Math.round((jp * 2 - 10) * 2) / 2
  // Корейский стандарт KS K 3405: Mondopoint в мм
  const kr = base.mondopoint
  // Бразильский стандарт ABNT NBR 13310: EU - 2
  const br = gender === 'kids'
    ? Math.max(17, Math.round((base.eu - 2) * 2) / 2)
    : Math.round((base.eu - 2) * 2) / 2

  return {
    mondopoint: base.mondopoint,
    eu: base.eu,
    uk: base.uk,
    us: base.us,
    ukr: base.ukr,
    jp,
    cn,
    kr,
    br,
    cm: base.cm,
    mm: base.mm,
  }
}

function calculateProFit(
  footMm: number,
  gender: Gender,
  style: ShoeStyle,
  widthFit: WidthFit
): ProFitResult {
  const baseSize = computeExtendedSize(footMm, gender)
  const allowance = STYLE_ALLOWANCES[style]

  const widthDeltaMm =
    widthFit === 'narrow'
      ? -4
      : widthFit === 'standard'
        ? 0
        : widthFit === 'wide'
          ? 5
          : 9

  const girthDeltaMm =
    widthFit === 'narrow'
      ? -8
      : widthFit === 'standard'
        ? 0
        : widthFit === 'wide'
          ? 10
          : 18

  const widthLengthCompMm =
    (widthFit === 'wide' || widthFit === 'extraWide') &&
    (style === 'classic' || style === 'running')
      ? 3
      : 0

  const totalAllowanceMm = allowance.insoleAddMm + widthLengthCompMm
  const insoleMm = Math.round(footMm + totalAllowanceMm)
  const insoleCm = Math.round((insoleMm / 10) * 10) / 10
  const lastTraceMm = Math.round(footMm + allowance.lastTraceAddMm + widthLengthCompMm)

  const genderWidthFactor = gender === 'men' ? 0.375 : gender === 'women' ? 0.365 : 0.38
  const genderGirthFactor = gender === 'men' ? 0.945 : gender === 'women' ? 0.925 : 0.95

  const ballWidthMm = Math.round(footMm * genderWidthFactor + widthDeltaMm)
  const ballGirthMm = Math.round(footMm * genderGirthFactor + girthDeltaMm)
  const instepGirthMm = Math.round(ballGirthMm * 1.03)

  const widthMap: Record<WidthFit, WidthMarks> = {
    narrow: {
      eu: 'E',
      us: gender === 'women' ? 'AA (2A)' : 'B (Narrow)',
      uk: 'C / D',
      jp: 'D / E',
      gost: 4,
      cn: '1.5',
    },
    standard: {
      eu: 'F',
      us: gender === 'women' ? 'B (Medium)' : 'D (Medium)',
      uk: 'E / F',
      jp: 'E / 2E',
      gost: 6,
      cn: '2.0',
    },
    wide: {
      eu: 'G',
      us: gender === 'women' ? 'D (Wide)' : '2E (Wide)',
      uk: 'G',
      jp: '3E',
      gost: 8,
      cn: '2.5',
    },
    extraWide: {
      eu: 'H',
      us: gender === 'women' ? '2E (X-Wide)' : '4E (X-Wide)',
      uk: 'H',
      jp: '4E / F',
      gost: 10,
      cn: '3.0',
    },
  }

  const wShift = widthFit === 'wide' || widthFit === 'extraWide' ? 0.5 : 0

  const brandMatrix: BrandFitEntry[] = [
    {
      brand: 'Nike / Jordan',
      category: 'Athletic',
      eu: formatSize(baseSize.eu + 0.5 + wShift),
      us: formatSize(baseSize.us + 0.5 + wShift),
      uk: formatSize(baseSize.uk + 0.5),
      jp: formatSize(baseSize.jp + 0.5),
      offsetNote: {
        ru: 'Плотнее в пучках — рекомендуется +0.5 размера',
        uk: 'Щільніше в пучках — рекомендовано +0.5 розміру',
        de: 'Schmaler im Vorfuß — +0.5 Größe empfohlen',
        en: 'Snug forefoot — +0.5 size up recommended',
      },
    },
    {
      brand: 'New Balance',
      category: 'Lifestyle / Run',
      eu: formatSize(baseSize.eu + wShift),
      us: `${formatSize(baseSize.us)} (${widthFit === 'wide' || widthFit === 'extraWide' ? '2E' : 'D'})`,
      uk: formatSize(baseSize.uk),
      jp: formatSize(baseSize.jp),
      offsetNote: {
        ru: 'Эталонная колодка US Brannock, доступны полноты D/2E',
        uk: 'Еталонна колодка US Brannock, доступні повноти D/2E',
        de: 'Referenz-Passform nach US Brannock (Weiten D/2E)',
        en: 'True to US Brannock standard with D/2E widths',
      },
    },
    {
      brand: 'Adidas Originals',
      category: 'Sneakers',
      eu: `${formatSize(baseSize.eu)}⅔`,
      us: formatSize(baseSize.us + wShift),
      uk: formatSize(baseSize.uk + wShift),
      jp: formatSize(baseSize.jp),
      offsetNote: {
        ru: 'Дробная сетка 1/3 · стандартная посадка по стопе',
        uk: 'Дробова сітка 1/3 · стандартна посадка по стопі',
        de: '1/3-Größenraster · reguläre Passform',
        en: '1/3-step French sizing · true to foot length',
      },
    },
    {
      brand: 'ASICS / Mizuno',
      category: 'Japan CM',
      eu: formatSize(baseSize.eu + 0.5),
      us: formatSize(baseSize.us + 0.5),
      uk: formatSize(baseSize.uk + 0.5),
      jp: `${baseSize.jp.toFixed(1)} cm`,
      offsetNote: {
        ru: 'Маркировка строго по длине стопы в см (JIS S 5037)',
        uk: 'Маркування суворо за довжиною стопи в см (JIS S 5037)',
        de: 'Exakte Zentimeter-Markierung nach JIS S 5037',
        en: 'Exact centimeter foot-length marking (JIS S 5037)',
      },
    },
    {
      brand: 'Cardio / Dress Last',
      category: 'Classic / Leather',
      eu: formatSize(Math.round(baseSize.eu)),
      us: formatSize(baseSize.us),
      uk: formatSize(baseSize.uk),
      jp: formatSize(baseSize.jp),
      offsetNote: {
        ru: 'Полноразмерная кожаная колодка с припуском +12 мм',
        uk: 'Повнорозмірна шкіряна колодка з припуском +12 мм',
        de: 'Vollwertiger Lederleisten mit +12 mm Zugabe',
        en: 'Full-grain leather last with +12 mm allowance',
      },
    },
  ]

  return {
    insoleMm,
    insoleCm,
    lastTraceMm,
    allowanceMm: totalAllowanceMm,
    ballWidthMm,
    ballGirthMm,
    instepGirthMm,
    widthMarks: widthMap[widthFit],
    brandMatrix,
  }
}

const FlagEU = () => (
  <svg width="15" height="10" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="12" fill="#003399" />
    <g fill="#FFCC00">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const a = (i * 30 - 90) * (Math.PI / 180)
        return <circle key={i} cx={9 + 3.8 * Math.cos(a)} cy={6 + 3.8 * Math.sin(a)} r="0.55" />
      })}
    </g>
  </svg>
)

const FlagUA = () => (
  <svg width="15" height="10" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="6" fill="#0057B7" />
    <rect y="6" width="18" height="6" fill="#FFD700" />
  </svg>
)

const FlagUK = () => (
  <svg width="15" height="10" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="12" fill="#012169" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#fff" strokeWidth="2" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#C8102E" strokeWidth="1" />
    <path d="M9 0 V12 M0 6 H18" stroke="#fff" strokeWidth="3.2" />
    <path d="M9 0 V12 M0 6 H18" stroke="#C8102E" strokeWidth="1.6" />
  </svg>
)

const FlagUS = () => (
  <svg width="15" height="10" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="12" fill="#B22234" />
    <rect y="1.33" width="18" height="1.33" fill="#fff" />
    <rect y="4" width="18" height="1.33" fill="#fff" />
    <rect y="6.67" width="18" height="1.33" fill="#fff" />
    <rect y="9.33" width="18" height="1.33" fill="#fff" />
    <rect width="7.2" height="6.5" fill="#3C3B6E" />
  </svg>
)

const FlagJP = () => (
  <svg width="15" height="10" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0 border border-current/15">
    <rect width="18" height="12" fill="#FFFFFF" />
    <circle cx="9" cy="6" r="3.4" fill="#BC002D" />
  </svg>
)

const FlagCN = () => (
  <svg width="15" height="10" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="12" fill="#DE2910" />
    <circle cx="3.8" cy="3.6" r="1.4" fill="#FFDE00" />
    <circle cx="6.5" cy="1.8" r="0.45" fill="#FFDE00" />
    <circle cx="7.6" cy="3.0" r="0.45" fill="#FFDE00" />
    <circle cx="7.4" cy="4.6" r="0.45" fill="#FFDE00" />
    <circle cx="6.3" cy="5.8" r="0.45" fill="#FFDE00" />
  </svg>
)

const FlagKR = () => (
  <svg width="15" height="10" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0 border border-current/15">
    <rect width="18" height="12" fill="#FFFFFF" />
    <circle cx="9" cy="6" r="2.8" fill="#CD2E3A" />
    <path d="M6.2 6 A2.8 2.8 0 0 0 11.8 6 A1.4 1.4 0 0 1 9 6 A1.4 1.4 0 0 0 6.2 6 Z" fill="#0047A0" />
  </svg>
)

const FlagBR = () => (
  <svg width="15" height="10" viewBox="0 0 18 12" className="rounded-[1.5px] overflow-hidden shrink-0">
    <rect width="18" height="12" fill="#009739" />
    <polygon points="9,1.4 16.2,6 9,10.6 1.8,6" fill="#FEDD00" />
    <circle cx="9" cy="6" r="2.2" fill="#012169" />
  </svg>
)

const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0110 0v4"></path>
  </svg>
)

function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
    else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 12 : style === 'heavy' ? 35 : 22)
  } catch {}
}

type TranslationBundle = {
  back: string
  title: string
  subtitle: string
  step1: string
  men: string
  women: string
  kids: string
  cmLabel: string
  mmLabel: string
  insoleLabel: string
  allowanceLabel: string
  widthLabel: string
  girthLabel: string
  tabWorld: string
  tabFit: string
  tabBrands: string
  tabGuide: string
  styleSneakers: string
  styleClassic: string
  styleWinter: string
  styleRunning: string
  styleSandals: string
  widthNarrow: string
  widthStandard: string
  widthWide: string
  widthExtraWide: string
  proTitle: string
  proDesc: string
  proBtn: string
  proActiveBadge: string
  loading: string
  measureGuide1: string
  measureGuide2: string
  measureGuide3: string
  measureTip: string
  disclaimer: string
  standardsNote: string
  openInTelegramErr: string
  paymentCancelledErr: string
  serverErrPrefix: string
}

const I18N: Record<'ru' | 'uk' | 'de' | 'en', TranslationBundle> = {
  ru: {
    back: 'Назад',
    title: 'Анатомия размера',
    subtitle: 'Cordwainer Biometric Caliper',
    step1: 'Длина стопы',
    men: 'Мужской',
    women: 'Женский',
    kids: 'Детский',
    cmLabel: 'см',
    mmLabel: 'мм',
    insoleLabel: 'Стелька',
    allowanceLabel: 'Припуск',
    widthLabel: 'Ширина пучков',
    girthLabel: 'Обхват пучков',
    tabWorld: 'Мировые (8)',
    tabFit: 'Колодка PRO',
    tabBrands: 'Бренды PRO',
    tabGuide: 'Замер · ISO',
    styleSneakers: 'Кроссовки',
    styleClassic: 'Классика',
    styleWinter: 'Зима / Мех',
    styleRunning: 'Бег / Трек',
    styleSandals: 'Открытая',
    widthNarrow: 'Узкая (E)',
    widthStandard: 'Стандарт (F)',
    widthWide: 'Широкая (G)',
    widthExtraWide: 'Экстра (H)',
    proTitle: 'PRO Паспорт Колодки & 8 стран',
    proDesc: 'US, UK, Япония (JP), Китай (CN), Корея (KR), Бразилия (BR), расчёт полноты E–H, длины стельки и матрица брендов.',
    proBtn: `ОТКРЫТЬ PRO ДОСТУП · ${PRO_PRICE_STARS} ⭐️`,
    proActiveBadge: 'PRO АКТИВЕН',
    loading: 'ПРОВЕРКА ТРАНЗАКЦИИ...',
    measureGuide1: '1. Встаньте на лист бумаги в носках, распределив вес на обе ноги.',
    measureGuide2: '2. Очертите контур стопы, удерживая карандаш строго под углом 90°.',
    measureGuide3: '3. Измерьте дистанцию от крайней точки пятки до самого длинного пальца.',
    measureTip: 'Проводите замер вечером — к концу дня свод стопы удлиняется на 2–3 мм.',
    disclaimer: 'Базовые расчёты по ISO 19407:2023 и ISO 9407 (Mondopoint).',
    standardsNote: 'JIS S 5037 (Япония) · GB/T 3293.1 (Китай) · KS K 3405 (Корея) · ДСТУ / ГОСТ.',
    openInTelegramErr: 'Откройте мини-приложение внутри Telegram для оплаты Stars.',
    paymentCancelledErr: 'Оплата была отменена или не завершена.',
    serverErrPrefix: 'Ошибка соединения',
  },
  uk: {
    back: 'Назад',
    title: 'Анатомія розміру',
    subtitle: 'Cordwainer Biometric Caliper',
    step1: 'Довжина стопи',
    men: 'Чоловічий',
    women: 'Жіночий',
    kids: 'Дитячий',
    cmLabel: 'см',
    mmLabel: 'мм',
    insoleLabel: 'Устілка',
    allowanceLabel: 'Припуск',
    widthLabel: 'Ширина пучків',
    girthLabel: 'Обхват пучків',
    tabWorld: 'Світові (8)',
    tabFit: 'Колодка PRO',
    tabBrands: 'Бренди PRO',
    tabGuide: 'Замір · ISO',
    styleSneakers: 'Кросівки',
    styleClassic: 'Класика',
    styleWinter: 'Зима / Хутро',
    styleRunning: 'Біг / Трек',
    styleSandals: 'Відкрите',
    widthNarrow: 'Вузька (E)',
    widthStandard: 'Стандарт (F)',
    widthWide: 'Широка (G)',
    widthExtraWide: 'Екстра (H)',
    proTitle: 'PRO Паспорт Колодки & 8 країн',
    proDesc: 'US, UK, Японія (JP), Китай (CN), Корея (KR), Бразилія (BR), розрахунок повноти E–H, довжини устілки та матриця брендів.',
    proBtn: `ВІДКРИТИ PRO ДОСТУП · ${PRO_PRICE_STARS} ⭐️`,
    proActiveBadge: 'PRO АКТИВНИЙ',
    loading: 'ПЕРЕВІРКА ТРАНЗАКЦІЇ...',
    measureGuide1: '1. Станьте на аркуш паперу в шкарпетках, розподіливши вагу на обидві ноги.',
    measureGuide2: '2. Окресліть контур стопи, тримаючи олівець суворо під кутом 90°.',
    measureGuide3: '3. Виміряйте дистанцію від крайньої точки п’яти до найдовшого пальця.',
    measureTip: 'Виконуйте замір увечері — до кінця дня склепіння стопи видовжується на 2–3 мм.',
    disclaimer: 'Базові розрахунки за ISO 19407:2023 та ISO 9407 (Mondopoint).',
    standardsNote: 'JIS S 5037 (Японія) · GB/T 3293.1 (Китай) · KS K 3405 (Корея) · ДСТУ.',
    openInTelegramErr: 'Відкрийте міні-додаток усередині Telegram для оплати Stars.',
    paymentCancelledErr: 'Оплату було скасовано або не завершено.',
    serverErrPrefix: 'Помилка з’єднання',
  },
  de: {
    back: 'Zurück',
    title: 'Größen-Anatomie',
    subtitle: 'Cordwainer Biometric Caliper',
    step1: 'Fußlänge',
    men: 'Herren',
    women: 'Damen',
    kids: 'Kinder',
    cmLabel: 'cm',
    mmLabel: 'mm',
    insoleLabel: 'Innensohle',
    allowanceLabel: 'Zugabe',
    widthLabel: 'Ballenbreite',
    girthLabel: 'Ballenumfang',
    tabWorld: 'Weltweit (8)',
    tabFit: 'Leisten PRO',
    tabBrands: 'Marken PRO',
    tabGuide: 'Messen · ISO',
    styleSneakers: 'Sneaker',
    styleClassic: 'Klassisch',
    styleWinter: 'Winter / Pelz',
    styleRunning: 'Running',
    styleSandals: 'Sandalen',
    widthNarrow: 'Schmal (E)',
    widthStandard: 'Standard (F)',
    widthWide: 'Weit (G)',
    widthExtraWide: 'Extra (H)',
    proTitle: 'PRO Leisten-Pass & 8 Normen',
    proDesc: 'US, UK, Japan (JP), China (CN), Korea (KR), Brasilien (BR), Weitenberechnung E–H, Innensohlenlänge & Marken-Matrix.',
    proBtn: `PRO FREISCHALTEN · ${PRO_PRICE_STARS} ⭐️`,
    proActiveBadge: 'PRO AKTIV',
    loading: 'TRANSAKTION LÄUFT...',
    measureGuide1: '1. Stellen Sie sich in Socken mit gleichmäßigem Gewicht auf ein Blatt Papier.',
    measureGuide2: '2. Umranden Sie den Fuß mit exakt senkrecht gehaltenem Stift (90°).',
    measureGuide3: '3. Messen Sie von der äußersten Ferse bis zum längsten Zeh.',
    measureTip: 'Messen Sie am späten Nachmittag — Füße dehnen sich um 2–3 mm aus.',
    disclaimer: 'Berechnung nach ISO 19407:2023 und ISO 9407 (Mondopoint).',
    standardsNote: 'JIS S 5037 (Japan) · GB/T 3293.1 (China) · KS K 3405 (Korea).',
    openInTelegramErr: 'Bitte öffnen Sie die App in Telegram für Stars-Zahlungen.',
    paymentCancelledErr: 'Zahlung wurde abgebrochen.',
    serverErrPrefix: 'Serverfehler',
  },
  en: {
    back: 'Back',
    title: 'Size Anatomy',
    subtitle: 'Cordwainer Biometric Caliper',
    step1: 'Foot Length',
    men: 'Men',
    women: 'Women',
    kids: 'Kids',
    cmLabel: 'cm',
    mmLabel: 'mm',
    insoleLabel: 'Insole',
    allowanceLabel: 'Allowance',
    widthLabel: 'Ball Width',
    girthLabel: 'Ball Girth',
    tabWorld: 'Global (8)',
    tabFit: 'Last Fit PRO',
    tabBrands: 'Brands PRO',
    tabGuide: 'Guide · ISO',
    styleSneakers: 'Sneakers',
    styleClassic: 'Classic',
    styleWinter: 'Winter Fur',
    styleRunning: 'Run / Trek',
    styleSandals: 'Sandals',
    widthNarrow: 'Narrow (E)',
    widthStandard: 'Standard (F)',
    widthWide: 'Wide (G)',
    widthExtraWide: 'X-Wide (H)',
    proTitle: 'PRO Last Passport & 8 Systems',
    proDesc: 'Unlock US, UK, Japan (JP), China (CN), Korea (KR), Brazil (BR), E–H width & girth metrics, insole allowance, and brand matrix.',
    proBtn: `UNLOCK PRO ACCESS · ${PRO_PRICE_STARS} ⭐️`,
    proActiveBadge: 'PRO ACTIVE',
    loading: 'VERIFYING...',
    measureGuide1: '1. Stand on a sheet of paper in socks with weight evenly distributed.',
    measureGuide2: '2. Trace your foot keeping the pen strictly vertical (90°).',
    measureGuide3: '3. Measure from the back of the heel to the tip of the longest toe.',
    measureTip: 'Measure in the evening — feet naturally expand by 2–3 mm.',
    disclaimer: 'Calculated per ISO 19407:2023 and ISO 9407 (Mondopoint).',
    standardsNote: 'JIS S 5037 (Japan) · GB/T 3293.1 (China) · KS K 3405 (Korea).',
    openInTelegramErr: 'Please open the Mini App inside Telegram to pay with Stars.',
    paymentCancelledErr: 'Payment was cancelled or failed.',
    serverErrPrefix: 'Connection error',
  },
}

export function SizeCalcPage({ onBack, lang }: SizeCalcPageProps) {
  const safeLang: 'ru' | 'uk' | 'de' | 'en' =
    lang && (lang === 'ru' || lang === 'uk' || lang === 'de' || lang === 'en') ? lang : 'uk'
  const t = I18N[safeLang]

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const [gender, setGender] = useState<Gender>('men')
  const [unit, setUnit] = useState<'cm' | 'mm'>('cm')
  const [footMm, setFootMm] = useState<number>(RANGES.men.default)
  const [shoeStyle, setShoeStyle] = useState<ShoeStyle>('sneakers')
  const [widthFit, setWidthFit] = useState<WidthFit>('standard')
  const [activeTab, setActiveTab] = useState<ActiveTab>('world')
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [statusError, setStatusError] = useState<string | null>(null)

  const [isProPurchased, setIsProPurchased] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const range = RANGES[gender]

  const handleGenderChange = useCallback((g: Gender) => {
    setGender(g)
    const r = RANGES[g]
    setFootMm((prev) => Math.min(r.max, Math.max(r.min, prev)))
  }, [])

  const result = useMemo(() => computeExtendedSize(footMm, gender), [footMm, gender])
  const proFit = useMemo(
    () => calculateProFit(footMm, gender, shoeStyle, widthFit),
    [footMm, gender, shoeStyle, widthFit]
  )

  const displayValue =
    unit === 'cm' ? (footMm / 10).toFixed(1).replace('.', ',') : String(Math.round(footMm))
  const pct = Math.min(100, Math.max(0, ((footMm - range.min) / (range.max - range.min)) * 100))

  const verifyPurchaseOnServer = useCallback(async (uid: number | string) => {
    try {
      const res = await fetch(`/api/check-purchase?userId=${encodeURIComponent(String(uid))}&productId=pro_sizes`, {
        cache: 'no-store',
      })
      if (!res.ok) return false
      const data = await res.json()
      if (data?.purchased) {
        setIsProPurchased(true)
        try {
          localStorage.setItem(`cordwainer_pro_sizes_${uid}`, '1')
        } catch {}
        return true
      }
    } catch (err) {
      console.error('Ошибка проверки покупки:', err)
    }
    return false
  }, [])

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id
    if (!userId) return

    try {
      if (localStorage.getItem(`cordwainer_pro_sizes_${userId}`) === '1') {
        setIsProPurchased(true)
      }
    } catch {}

    verifyPurchaseOnServer(userId)
  }, [verifyPurchaseOnServer])

  const handleProClick = async () => {
    setStatusError(null)
    const tg = (window as any).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id
    const rawInitData = typeof tg?.initData === 'string' ? tg.initData : ''

    if (!userId || !rawInitData) {
      setStatusError(t.openInTelegramErr)
      return
    }

    setIsPurchasing(true)
    haptic('light')

    try {
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': rawInitData,
        },
        body: JSON.stringify({
          userId,
          productId: 'pro_sizes',
          initData: rawInitData,
        }),
      })

      const data = await response.json()

      if (response.status === 409 && data?.alreadyPurchased) {
        haptic('heavy')
        setIsProPurchased(true)
        try {
          localStorage.setItem(`cordwainer_pro_sizes_${userId}`, '1')
        } catch {}
        setIsPurchasing(false)
        return
      }

      if (!response.ok || !data?.invoiceLink) {
        throw new Error(data?.error || 'Invoice generation failed')
      }

      tg.openInvoice(data.invoiceLink, async (status: string) => {
        if (status === 'paid' || status === 'pending') {
          haptic('heavy')
          setIsProPurchased(true)
          try {
            localStorage.setItem(`cordwainer_pro_sizes_${userId}`, '1')
          } catch {}
          setTimeout(() => {
            verifyPurchaseOnServer(userId)
          }, 1500)
        } else if (status === 'failed' || status === 'cancelled') {
          setStatusError(t.paymentCancelledErr)
        }
        setIsPurchasing(false)
      })
    } catch (error: any) {
      console.error(error)
      setStatusError(`${t.serverErrPrefix}: ${error?.message || 'Unknown'}`)
      setIsPurchasing(false)
    }
  }

  const startEdit = () => {
    setEditValue(unit === 'cm' ? (footMm / 10).toFixed(1) : String(Math.round(footMm)))
    setIsEditing(true)
  }

  const commitEdit = () => {
    const raw = parseFloat(editValue.replace(',', '.'))
    if (!isNaN(raw)) {
      const mm = unit === 'cm' ? raw * 10 : raw
      setFootMm(Math.min(range.max, Math.max(range.min, mm)))
      haptic('light')
    }
    setIsEditing(false)
  }

  const stepValue = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setFootMm((prev) => {
      const next = Math.min(range.max, Math.max(range.min, prev + delta))
      if (next !== prev) haptic('light')
      return next
    })
  }

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const usLabel = gender === 'kids' ? 'US K' : gender === 'men' ? 'US M' : 'US W'

  const blueprintScaleX = 0.86 + (pct / 100) * 0.2
  const blueprintScaleY =
    widthFit === 'narrow'
      ? 0.91
      : widthFit === 'standard'
        ? 1.0
        : widthFit === 'wide'
          ? 1.08
          : 1.15

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cCard = isDark ? 'bg-[#121212]/90' : 'bg-[#EAE5DC]/85'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/55' : 'text-[#1C1816]/55'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const accentStroke = isDark ? '#D4AF37' : '#8C6239'
  const trackColor = isDark ? '#F4F0E8' : '#1C1816'
  const trackBgColor = isDark ? 'rgba(244,240,232,0.14)' : 'rgba(28,24,22,0.14)'

  const worldSystems = [
    { code: 'EU', sub: 'Paris Point', val: formatSize(result.eu), flag: <FlagEU />, free: true },
    { code: 'UA / СМ', sub: 'ДСТУ / Метр.', val: formatSize(result.ukr), flag: <FlagUA />, free: true },
    { code: usLabel, sub: 'Brannock', val: formatSize(result.us), flag: <FlagUS />, free: false },
    { code: 'UK', sub: 'Barleycorn', val: formatSize(result.uk), flag: <FlagUK />, free: false },
    { code: 'JP', sub: 'JIS S 5037 (cm)', val: result.jp.toFixed(1), flag: <FlagJP />, free: false },
    { code: 'CN', sub: 'GB/T 3293.1', val: `${formatSize(result.cn)} (${result.mondopoint})`, flag: <FlagCN />, free: false },
    { code: 'KR', sub: 'KS K 3405 (mm)', val: String(result.kr), flag: <FlagKR />, free: false },
    { code: 'BR', sub: 'ABNT NBR', val: formatSize(result.br), flag: <FlagBR />, free: false },
  ]

  return (
    <div
      className={`relative flex flex-col h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] transition-colors duration-300 ${cBg} ${cText} overflow-hidden select-none`}
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; -webkit-touch-callout: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes caliperScan {
          0% { transform: translateX(0%); opacity: 0.15; }
          50% { opacity: 0.75; }
          100% { transform: translateX(100%); opacity: 0.15; }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.85); opacity: 0.9; }
          70% { transform: scale(1.75); opacity: 0; }
          100% { transform: scale(1.75); opacity: 0; }
        }
        @keyframes shimmerBorder {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .scan-beam {
          animation: caliperScan 3.6s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
        }
        .bio-node-ring {
          transform-origin: center;
          animation: pulseRing 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .pro-shimmer {
          background: linear-gradient(120deg, rgba(212,175,55,0.08), rgba(212,175,55,0.24), rgba(212,175,55,0.08));
          background-size: 200% 200%;
          animation: shimmerBorder 4s ease infinite;
        }
      `}</style>

      {/* 1. КОМПАКТНАЯ ВЕРХНЯЯ ПАНЕЛЬ */}
      <header className={`px-4 pt-3 pb-2.5 border-b ${cLine} flex items-center justify-between gap-2 shrink-0 z-20`}>
        <button
          onClick={() => {
            haptic('light')
            onBack()
          }}
          className={`flex items-center gap-1.5 text-[10px] font-sans uppercase tracking-[0.18em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} hover:opacity-100 transition-opacity`}
        >
          <span>←</span>
          <span>{t.back}</span>
        </button>

        <div className={`flex items-center rounded-full p-0.5 border ${cLine} ${cCard}`}>
          {(['men', 'women', 'kids'] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => {
                haptic('light')
                handleGenderChange(g)
              }}
              className={`px-2.5 py-1 rounded-full text-[9px] font-sans uppercase tracking-[0.14em] transition-all border-none cursor-pointer ${
                gender === g
                  ? isDark
                    ? 'bg-[#F4F0E8] text-[#0A0A0A] font-medium'
                    : 'bg-[#1C1816] text-[#F2EFE9] font-medium'
                  : `bg-transparent ${cTextMuted}`
              }`}
            >
              {t[g]}
            </button>
          ))}
        </div>

        <div className={`flex items-center rounded-full p-0.5 border ${cLine} ${cCard}`}>
          {(['cm', 'mm'] as const).map((u) => (
            <button
              key={u}
              onClick={() => {
                haptic('light')
                setUnit(u)
              }}
              className={`px-2 py-1 rounded-full text-[9px] font-sans uppercase tracking-wider transition-all border-none cursor-pointer ${
                unit === u
                  ? isDark
                    ? 'bg-[#F4F0E8]/20 text-[#F4F0E8] font-medium'
                    : 'bg-[#1C1816]/15 text-[#1C1816] font-medium'
                  : `bg-transparent ${cTextMuted}`
              }`}
            >
              {u === 'cm' ? t.cmLabel : t.mmLabel}
            </button>
          ))}
        </div>
      </header>

      {/* 2. ЖИВОЙ БИОМЕТРИЧЕСКИЙ ЧЕРТЁЖ СТОПЫ И КАЛИПЕР */}
      <section className="px-4 pt-2.5 shrink-0">
        <div className={`relative rounded-xl border ${cLine} ${cCard} px-3.5 py-2.5 overflow-hidden`}>
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `linear-gradient(to right, ${trackBgColor} 1px, transparent 1px), linear-gradient(to bottom, ${trackBgColor} 1px, transparent 1px)`,
              backgroundSize: '14px 14px',
            }}
          />

          <div className="absolute inset-y-0 left-0 w-1/3 pointer-events-none scan-beam">
            <div
              className="w-[1.5px] h-full"
              style={{
                background: `linear-gradient(to bottom, transparent, ${accentStroke}, transparent)`,
                boxShadow: `0 0 12px ${accentStroke}`,
              }}
            />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex flex-col justify-between shrink-0">
              <div className="flex items-center gap-1.5 mb-1">
                <FlagEU />
                <FlagUA />
                <span className={`text-[8px] font-sans uppercase tracking-[0.22em] ${cTextMuted}`}>
                  EU {formatSize(result.eu)} · MP {result.mondopoint}
                </span>
              </div>

              <div className="flex items-center gap-2 my-0.5">
                <button
                  onClick={(e) => stepValue(-1, e)}
                  disabled={footMm <= range.min}
                  className={`w-7 h-7 flex items-center justify-center rounded-full border ${cLine} ${cText} active:scale-90 transition-transform disabled:opacity-25 bg-transparent cursor-pointer`}
                >
                  <span className="text-sm leading-none">−</span>
                </button>

                <div onClick={startEdit} className="min-w-[68px] text-center cursor-pointer">
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      value={editValue}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                      onBlur={commitEdit}
                      onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                      className={`w-[70px] text-center text-3xl font-serif leading-none bg-transparent outline-none border-b ${cLine} ${cText}`}
                      inputMode="decimal"
                    />
                  ) : (
                    <motion.span
                      key={displayValue}
                      initial={{ opacity: 0.5, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16 }}
                      className="text-3xl font-serif leading-none tracking-tight inline-block"
                    >
                      {displayValue}
                    </motion.span>
                  )}
                  <span className={`ml-1 text-[10px] font-sans ${cTextMuted}`}>
                    {unit === 'cm' ? t.cmLabel : t.mmLabel}
                  </span>
                </div>

                <button
                  onClick={(e) => stepValue(1, e)}
                  disabled={footMm >= range.max}
                  className={`w-7 h-7 flex items-center justify-center rounded-full border ${cLine} ${cText} active:scale-90 transition-transform disabled:opacity-25 bg-transparent cursor-pointer`}
                >
                  <span className="text-sm leading-none">+</span>
                </button>
              </div>

              <div className={`text-[9px] font-sans ${cTextMuted} flex items-center gap-2 mt-0.5`}>
                <span>
                  {t.insoleLabel}: <strong className={cText}>{proFit.insoleMm} {t.mmLabel}</strong>
                </span>
                <span>·</span>
                <span>+{proFit.allowanceMm} {t.mmLabel}</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-end justify-center min-w-[140px]">
              <svg viewBox="0 0 220 82" className="w-full max-w-[195px] h-[66px] overflow-visible">
                <line x1="18" y1="8" x2="18" y2="74" stroke={trackColor} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="184" y1="8" x2="184" y2="74" stroke={trackColor} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="202" y1="8" x2="202" y2="74" stroke={accentStroke} strokeOpacity="0.8" strokeWidth="1" />

                <g
                  style={{
                    transform: `translate(110px, 41px) scale(${blueprintScaleX}, ${blueprintScaleY}) translate(-110px, -41px)`,
                    transition: 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <path
                    d="M20,41 C20,25 36,19 58,21 C82,23 108,16 138,14 C166,12 196,19 200,38 C203,54 182,67 152,67 C122,67 98,58 72,59 C44,60 20,56 20,41 Z"
                    fill="none"
                    stroke={accentStroke}
                    strokeWidth="1.1"
                    strokeDasharray="3 2"
                    opacity="0.7"
                  />

                  <path
                    d="M22,41 C22,27 36,22 56,24 C80,26 105,19 132,17 C157,15 181,22 183,38 C185,52 167,63 142,63 C115,63 94,55 70,56 C44,57 22,53 22,41 Z"
                    fill={isDark ? 'rgba(244,240,232,0.08)' : 'rgba(28,24,22,0.08)'}
                    stroke={trackColor}
                    strokeWidth="1.4"
                  />

                  <line x1="134" y1="16" x2="138" y2="63" stroke={accentStroke} strokeWidth="1.1" strokeDasharray="2 2" />
                  <line x1="22" y1="41" x2="183" y2="38" stroke={trackColor} strokeOpacity="0.3" strokeWidth="0.9" />

                  <g transform="translate(38, 41)">
                    <circle r="4.5" fill={accentStroke} className="bio-node-ring" />
                    <circle r="2.2" fill={accentStroke} />
                  </g>
                  <g transform="translate(135, 26)">
                    <circle r="4.5" fill={accentStroke} className="bio-node-ring" />
                    <circle r="2.2" fill={accentStroke} />
                  </g>
                  <g transform="translate(178, 37)">
                    <circle r="4" fill={trackColor} className="bio-node-ring" />
                    <circle r="2" fill={trackColor} />
                  </g>
                </g>

                <line x1="18" y1="72" x2="184" y2="72" stroke={trackColor} strokeOpacity="0.5" strokeWidth="0.9" />
                <line x1="184" y1="72" x2="202" y2="72" stroke={accentStroke} strokeWidth="1.4" />
                <text x="100" y="80" textAnchor="middle" fill={trackColor} opacity="0.65" fontSize="7.5" fontFamily="sans-serif">
                  {Math.round(footMm)} mm + {proFit.allowanceMm} mm
                </text>
              </svg>
            </div>
          </div>

          {/* 3. ПРЕЦИЗИОННЫЙ СЛАЙДЕР-ШТАНГЕНЦИРКУЛЬ */}
          <div className="relative w-full pt-2 pb-0.5">
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={1}
              value={footMm}
              onChange={(e) => setFootMm(Number(e.target.value))}
              onPointerUp={() => haptic('light')}
              className="w-full h-6 absolute inset-x-0 -top-1 z-20 opacity-0 cursor-pointer"
            />
            <div className="w-full h-[2px] relative rounded-full" style={{ backgroundColor: trackBgColor }}>
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-75"
                style={{ width: `${pct}%`, backgroundColor: trackColor }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow-md transition-transform duration-75"
                style={{
                  left: `calc(${pct}% - 7px)`,
                  backgroundColor: trackColor,
                  border: `2px solid ${isDark ? '#0A0A0A' : '#F2EFE9'}`,
                }}
              />
            </div>

            <div className="flex justify-between items-center mt-1.5 px-0.5">
              {Array.from({ length: 21 }).map((_, idx) => (
                <span
                  key={idx}
                  className="block w-[1px]"
                  style={{
                    height: idx % 5 === 0 ? '5px' : '2.5px',
                    backgroundColor: trackColor,
                    opacity: idx % 5 === 0 ? 0.45 : 0.2,
                  }}
                />
              ))}
            </div>
            <div className={`flex justify-between text-[8.5px] font-sans ${cTextMuted} mt-0.5`}>
              <span>{unit === 'cm' ? (range.min / 10).toFixed(1) : range.min}</span>
              <span className="uppercase tracking-[0.2em]">{t.step1}</span>
              <span>{unit === 'cm' ? (range.max / 10).toFixed(1) : range.max}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. НАВИГАЦИЯ ПО ВКЛАДКАМ */}
      <nav className="px-4 pt-2.5 shrink-0">
        <div className={`grid grid-cols-4 gap-1 p-1 rounded-xl border ${cLine} ${cCard}`}>
          {(
            [
              { id: 'world', label: t.tabWorld },
              { id: 'fit', label: t.tabFit },
              { id: 'brands', label: t.tabBrands },
              { id: 'guide', label: t.tabGuide },
            ] as Array<{ id: ActiveTab; label: string }>
          ).map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  haptic('light')
                  setActiveTab(tab.id)
                }}
                className={`py-1.5 px-1 rounded-lg text-[9px] font-sans uppercase tracking-[0.1em] transition-all border-none cursor-pointer truncate ${
                  active
                    ? isDark
                      ? 'bg-[#F4F0E8] text-[#0A0A0A] font-medium shadow-sm'
                      : 'bg-[#1C1816] text-[#F2EFE9] font-medium shadow-sm'
                    : `bg-transparent ${cTextMuted} hover:opacity-100`
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* 5. РАБОЧАЯ ОБЛАСТЬ ВКЛАДОК */}
      <main className="flex-1 px-4 pt-2.5 pb-3 overflow-y-auto scrollbar-hide flex flex-col justify-between gap-2.5">
        <AnimatePresence mode="wait">
          {activeTab === 'world' && (
            <motion.div
              key="world"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-2 gap-2"
            >
              {worldSystems.map((item) => {
                const unlocked = item.free || isProPurchased
                return (
                  <div
                    key={item.code}
                    onClick={() => {
                      if (!unlocked) handleProClick()
                    }}
                    className={`relative rounded-xl border ${cLine} ${cCard} px-3 py-2.5 flex items-center justify-between transition-all ${
                      !unlocked ? 'cursor-pointer active:scale-[0.98]' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {item.flag}
                        <span className="text-[10px] font-sans font-medium uppercase tracking-[0.15em] truncate">
                          {item.code}
                        </span>
                      </div>
                      <span className={`text-[8.5px] font-sans ${cTextMuted} truncate`}>{item.sub}</span>
                    </div>

                    {unlocked ? (
                      <motion.span
                        key={item.val}
                        initial={{ scale: 0.92, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="font-serif text-2xl leading-none tracking-tight shrink-0"
                      >
                        {item.val}
                      </motion.span>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-serif text-xl blur-[5px] opacity-40 select-none">42.5</span>
                        <span className={`p-1 rounded-md border ${cLine} ${cTextMuted}`}>
                          <LockIcon />
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </motion.div>
          )}

          {activeTab === 'fit' && (
            <motion.div
              key="fit"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-2"
            >
              <div className={`rounded-xl border ${cLine} ${cCard} p-2.5`}>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(
                    [
                      { id: 'sneakers', label: t.styleSneakers },
                      { id: 'classic', label: t.styleClassic },
                      { id: 'winter', label: t.styleWinter },
                      { id: 'running', label: t.styleRunning },
                      { id: 'sandals', label: t.styleSandals },
                    ] as Array<{ id: ShoeStyle; label: string }>
                  ).map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        haptic('light')
                        setShoeStyle(st.id)
                      }}
                      className={`px-2 py-1 rounded-md text-[9px] font-sans uppercase tracking-wider border transition-all cursor-pointer ${
                        shoeStyle === st.id
                          ? isDark
                            ? 'border-[#F4F0E8] bg-[#F4F0E8]/15 text-[#F4F0E8]'
                            : 'border-[#1C1816] bg-[#1C1816]/10 text-[#1C1816]'
                          : `${cLine} bg-transparent ${cTextMuted}`
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      { id: 'narrow', label: t.widthNarrow },
                      { id: 'standard', label: t.widthStandard },
                      { id: 'wide', label: t.widthWide },
                      { id: 'extraWide', label: t.widthExtraWide },
                    ] as Array<{ id: WidthFit; label: string }>
                  ).map((wf) => (
                    <button
                      key={wf.id}
                      onClick={() => {
                        haptic('light')
                        setWidthFit(wf.id)
                      }}
                      className={`py-1 px-1 rounded-md text-[8.5px] font-sans uppercase tracking-wider border transition-all cursor-pointer truncate ${
                        widthFit === wf.id
                          ? isDark
                            ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#F4F0E8]'
                            : 'border-[#8C6239] bg-[#8C6239]/15 text-[#1C1816]'
                          : `${cLine} bg-transparent ${cTextMuted}`
                      }`}
                    >
                      {wf.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                onClick={() => {
                  if (!isProPurchased) handleProClick()
                }}
                className={`relative rounded-xl border ${cLine} ${cCard} p-3 grid grid-cols-2 gap-2.5 ${
                  !isProPurchased ? 'cursor-pointer' : ''
                }`}
              >
                <div>
                  <span className={`text-[8.5px] uppercase tracking-wider block ${cTextMuted}`}>
                    {t.insoleLabel} / {t.allowanceLabel}
                  </span>
                  <span className={`font-serif text-xl ${!isProPurchased ? 'blur-[4px]' : ''}`}>
                    {proFit.insoleMm} {t.mmLabel} ({proFit.insoleCm} {t.cmLabel})
                  </span>
                  <span className={`block text-[9px] ${cTextMuted}`}>
                    +{proFit.allowanceMm} {t.mmLabel} · Last {proFit.lastTraceMm} {t.mmLabel}
                  </span>
                </div>

                <div>
                  <span className={`text-[8.5px] uppercase tracking-wider block ${cTextMuted}`}>
                    {t.widthLabel} / {t.girthLabel}
                  </span>
                  <span className={`font-serif text-xl ${!isProPurchased ? 'blur-[4px]' : ''}`}>
                    {proFit.ballWidthMm} / {proFit.ballGirthMm} {t.mmLabel}
                  </span>
                  <span className={`block text-[9px] ${cTextMuted} ${!isProPurchased ? 'blur-[3px]' : ''}`}>
                    EU {proFit.widthMarks.eu} · US {proFit.widthMarks.us} · JP {proFit.widthMarks.jp} · ГОСТ {proFit.widthMarks.gost}
                  </span>
                </div>

                {!isProPurchased && (
                  <div className="col-span-2 flex items-center justify-center gap-1.5 pt-1 text-[9px] uppercase tracking-[0.15em] opacity-80">
                    <LockIcon />
                    <span>PRO Biometric Fit</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'brands' && (
            <motion.div
              key="brands"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-1.5"
            >
              {proFit.brandMatrix.map((row: BrandFitEntry) => (
                <div
                  key={row.brand}
                  onClick={() => {
                    if (!isProPurchased) handleProClick()
                  }}
                  className={`rounded-xl border ${cLine} ${cCard} px-3 py-2 flex items-center justify-between gap-2 ${
                    !isProPurchased ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-sans font-medium uppercase tracking-wider">
                        {row.brand}
                      </span>
                      <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded border ${cLine} ${cTextMuted}`}>
                        {row.category}
                      </span>
                    </div>
                    <p className={`text-[9px] font-sans ${cTextMuted} truncate mt-0.5`}>
                      {row.offsetNote[safeLang]}
                    </p>
                  </div>

                  {isProPurchased ? (
                    <div className="text-right shrink-0">
                      <span className="font-serif text-base block leading-tight">
                        EU {row.eu} · US {row.us}
                      </span>
                      <span className={`text-[8.5px] font-sans ${cTextMuted}`}>
                        UK {row.uk} · JP {row.jp}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-serif text-sm blur-[4px] opacity-40 select-none">EU 42.5</span>
                      <LockIcon />
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'guide' && (
            <motion.div
              key="guide"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className={`rounded-xl border ${cLine} ${cCard} p-3.5 flex flex-col gap-2`}
            >
              <p className="text-[11px] font-sans leading-relaxed">{t.measureGuide1}</p>
              <p className="text-[11px] font-sans leading-relaxed">{t.measureGuide2}</p>
              <p className="text-[11px] font-sans leading-relaxed">{t.measureGuide3}</p>
              <p className={`text-[10px] font-sans italic pt-1 border-t ${cLine} ${cTextMuted}`}>
                {t.measureTip}
              </p>
              <div className={`pt-1.5 border-t ${cLine} text-[9px] font-sans ${cTextMuted}`}>
                <div>{t.disclaimer}</div>
                <div className="mt-0.5">{t.standardsNote}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 6. КОММЕРЧЕСКИЙ БЛОК РАЗБЛОКИРОВКИ PRO */}
        <div className="shrink-0">
          {statusError && (
            <div className="mb-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-[10px] text-center">
              {statusError}
            </div>
          )}

          {!isProPurchased ? (
            <div className={`rounded-xl border ${cLine} pro-shimmer p-3 flex flex-col gap-2`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-serif text-sm tracking-tight leading-none mb-1">{t.proTitle}</h3>
                  <p className={`text-[9.5px] font-sans leading-snug ${cTextMuted}`}>{t.proDesc}</p>
                </div>
              </div>

              <button
                onClick={handleProClick}
                disabled={isPurchasing}
                className={`w-full py-2.5 px-4 rounded-lg border ${cLine} flex items-center justify-center gap-2 text-[10px] font-sans font-medium uppercase tracking-[0.18em] transition-all active:scale-[0.98] cursor-pointer ${
                  isDark ? 'bg-[#F4F0E8] text-[#0A0A0A]' : 'bg-[#1C1816] text-[#F2EFE9]'
                }`}
              >
                {isPurchasing ? (
                  <span className="animate-pulse">{t.loading}</span>
                ) : (
                  <>
                    <LockIcon />
                    <span>{t.proBtn}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className={`rounded-xl border ${cLine} ${cCard} px-3 py-2 flex items-center justify-between text-[9px] font-sans uppercase tracking-[0.2em] ${cTextMuted}`}>
              <span>{t.subtitle}</span>
              <span className="text-[#D4AF37] font-medium">★ {t.proActiveBadge}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
