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
  heelSeatMm: number
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
 * Apple Taptic Engine + Telegram Haptic Feedback Engine
 * Обеспечивает мгновенный тактильный отклик при каждом шаге ползунка, нажатиях кнопок и переключениях.
 */
let sharedAudioCtx: AudioContext | null = null

function playTapticMicroPulse(intensity: 'tick' | 'light' | 'medium' | 'heavy') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx()
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {})
    }
    const now = sharedAudioCtx.currentTime
    const osc = sharedAudioCtx.createOscillator()
    const gain = sharedAudioCtx.createGain()

    // Короткий низкочастотный импульс по стандарту Apple Taptic Engine
    const freq = intensity === 'tick' ? 155 : intensity === 'light' ? 135 : intensity === 'medium' ? 115 : 95
    const duration = intensity === 'tick' ? 0.004 : intensity === 'light' ? 0.006 : 0.009
    const peakGain = intensity === 'tick' ? 0.035 : intensity === 'light' ? 0.05 : 0.08

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)
    osc.frequency.exponentialRampToValueAtTime(40, now + duration)

    gain.gain.setValueAtTime(peakGain, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    osc.connect(gain)
    gain.connect(sharedAudioCtx.destination)
    osc.start(now)
    osc.stop(now + duration)
  } catch {}
}

function hapticSelection() {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback?.selectionChanged) {
      tg.HapticFeedback.selectionChanged()
    } else if (navigator.vibrate) {
      navigator.vibrate(6)
    }
  } catch {}
  playTapticMicroPulse('tick')
}

function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback?.impactOccurred) {
      tg.HapticFeedback.impactOccurred(style)
    } else if (navigator.vibrate) {
      navigator.vibrate(style === 'light' ? 12 : style === 'heavy' ? 32 : 20)
    }
  } catch {}
  playTapticMicroPulse(style)
}

function computeExtendedSize(footMm: number, gender: Gender): ExtendedSizeResult {
  const base = convertShoeSize(footMm, gender)
  const jp = Math.round((base.mondopoint / 10) * 2) / 2
  const cn = Math.round((jp * 2 - 10) * 2) / 2
  const kr = base.mondopoint
  const br =
    gender === 'kids'
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
  const heelSeatMm = Math.round(ballWidthMm * 0.66)

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
      category: 'Lifestyle',
      eu: formatSize(baseSize.eu + wShift),
      us: `${formatSize(baseSize.us)} (${widthFit === 'wide' || widthFit === 'extraWide' ? '2E' : 'D'})`,
      uk: formatSize(baseSize.uk),
      jp: formatSize(baseSize.jp),
      offsetNote: {
        ru: 'Эталон US Brannock · доступны полноты D и 2E',
        uk: 'Еталон US Brannock · доступні повноти D та 2E',
        de: 'Referenz nach US Brannock · Weiten D und 2E',
        en: 'True to US Brannock · D and 2E widths available',
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
      jp: `${baseSize.jp.toFixed(1)}`,
      offsetNote: {
        ru: 'Японский стандарт JIS S 5037 строго по стопе в см',
        uk: 'Японський стандарт JIS S 5037 суворо по стопі в см',
        de: 'Exakte Zentimeter-Markierung nach JIS S 5037',
        en: 'Exact centimeter foot-length marking (JIS S 5037)',
      },
    },
    {
      brand: 'Cardio / Dress Last',
      category: 'Classic',
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
    heelSeatMm,
    widthMarks: widthMap[widthFit],
    brandMatrix,
  }
}

const FlagEU = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="12" fill="#003399" />
    <g fill="#FFCC00">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const a = (i * 30 - 90) * (Math.PI / 180)
        return <circle key={i} cx={9 + 3.8 * Math.cos(a)} cy={6 + 3.8 * Math.sin(a)} r="0.6" />
      })}
    </g>
  </svg>
)

const FlagUA = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="6" fill="#0057B7" />
    <rect y="6" width="18" height="6" fill="#FFD700" />
  </svg>
)

const FlagUK = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="12" fill="#012169" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#fff" strokeWidth="2" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#C8102E" strokeWidth="1" />
    <path d="M9 0 V12 M0 6 H18" stroke="#fff" strokeWidth="3.2" />
    <path d="M9 0 V12 M0 6 H18" stroke="#C8102E" strokeWidth="1.6" />
  </svg>
)

const FlagUS = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="12" fill="#B22234" />
    <rect y="1.33" width="18" height="1.33" fill="#fff" />
    <rect y="4" width="18" height="1.33" fill="#fff" />
    <rect y="6.67" width="18" height="1.33" fill="#fff" />
    <rect y="9.33" width="18" height="1.33" fill="#fff" />
    <rect width="7.2" height="6.5" fill="#3C3B6E" />
  </svg>
)

const FlagJP = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 border border-current/15 shadow-xs">
    <rect width="18" height="12" fill="#FFFFFF" />
    <circle cx="9" cy="6" r="3.4" fill="#BC002D" />
  </svg>
)

const FlagCN = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="12" fill="#DE2910" />
    <circle cx="3.8" cy="3.6" r="1.4" fill="#FFDE00" />
    <circle cx="6.5" cy="1.8" r="0.45" fill="#FFDE00" />
    <circle cx="7.6" cy="3.0" r="0.45" fill="#FFDE00" />
    <circle cx="7.4" cy="4.6" r="0.45" fill="#FFDE00" />
    <circle cx="6.3" cy="5.8" r="0.45" fill="#FFDE00" />
  </svg>
)

const FlagKR = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 border border-current/15 shadow-xs">
    <rect width="18" height="12" fill="#FFFFFF" />
    <circle cx="9" cy="6" r="2.8" fill="#CD2E3A" />
    <path d="M6.2 6 A2.8 2.8 0 0 0 11.8 6 A1.4 1.4 0 0 1 9 6 A1.4 1.4 0 0 0 6.2 6 Z" fill="#0047A0" />
  </svg>
)

const FlagBR = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="12" fill="#009739" />
    <polygon points="9,1.4 16.2,6 9,10.6 1.8,6" fill="#FEDD00" />
    <circle cx="9" cy="6" r="2.2" fill="#012169" />
  </svg>
)

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0110 0v4"></path>
  </svg>
)

type TranslationBundle = {
  back: string
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
  zoneHeel: string
  zoneArch: string
  zoneToe: string
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
    subtitle: 'Cordwainer Biometric Caliper',
    step1: 'Шкала длины стопы',
    men: 'Мужской',
    women: 'Женский',
    kids: 'Детский',
    cmLabel: 'см',
    mmLabel: 'мм',
    insoleLabel: 'Стелька',
    allowanceLabel: 'Припуск',
    widthLabel: 'Ширина пучков',
    girthLabel: 'Обхват пучков',
    zoneHeel: 'Пятка',
    zoneArch: 'Пучки M1–M5',
    zoneToe: 'Запас мыска',
    tabWorld: 'Мировые',
    tabFit: 'Колодка',
    tabBrands: 'Бренды',
    tabGuide: 'Замер',
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
    measureGuide2: '2. Очертите контур стопы, удерживая карандаш строго вертикально (90°).',
    measureGuide3: '3. Измерьте расстояние от крайней точки пятки до самого длинного пальца.',
    measureTip: 'Проводите замер вечером — к концу дня свод стопы удлиняется на 2–3 мм.',
    disclaimer: 'Базовые расчёты по ISO 19407:2023 и ISO 9407 (Mondopoint).',
    standardsNote: 'JIS S 5037 (Япония) · GB/T 3293.1 (Китай) · KS K 3405 (Корея) · ДСТУ / ГОСТ.',
    openInTelegramErr: 'Откройте мини-приложение внутри Telegram для оплаты Stars.',
    paymentCancelledErr: 'Оплата была отменена или не завершена.',
    serverErrPrefix: 'Ошибка соединения',
  },
  uk: {
    back: 'Назад',
    subtitle: 'Cordwainer Biometric Caliper',
    step1: 'Шкала довжини стопи',
    men: 'Чоловічий',
    women: 'Жіночий',
    kids: 'Дитячий',
    cmLabel: 'см',
    mmLabel: 'мм',
    insoleLabel: 'Устілка',
    allowanceLabel: 'Припуск',
    widthLabel: 'Ширина пучків',
    girthLabel: 'Обхват пучків',
    zoneHeel: 'П’ята',
    zoneArch: 'Пучки M1–M5',
    zoneToe: 'Запас миска',
    tabWorld: 'Світові',
    tabFit: 'Колодка',
    tabBrands: 'Бренди',
    tabGuide: 'Замір',
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
    measureGuide2: '2. Окресліть контур стопи, тримаючи олівець суворо вертикально (90°).',
    measureGuide3: '3. Виміряйте відстань від крайньої точки п’яти до найдовшого пальця.',
    measureTip: 'Виконуйте замір увечері — до кінця дня склепіння стопи видовжується на 2–3 мм.',
    disclaimer: 'Базові розрахунки за ISO 19407:2023 та ISO 9407 (Mondopoint).',
    standardsNote: 'JIS S 5037 (Японія) · GB/T 3293.1 (Китай) · KS K 3405 (Корея) · ДСТУ.',
    openInTelegramErr: 'Відкрийте міні-додаток усередині Telegram для оплати Stars.',
    paymentCancelledErr: 'Оплату було скасовано або не завершено.',
    serverErrPrefix: 'Помилка з’єднання',
  },
  de: {
    back: 'Zurück',
    subtitle: 'Cordwainer Biometric Caliper',
    step1: 'Fußlängen-Skala',
    men: 'Herren',
    women: 'Damen',
    kids: 'Kinder',
    cmLabel: 'cm',
    mmLabel: 'mm',
    insoleLabel: 'Innensohle',
    allowanceLabel: 'Zugabe',
    widthLabel: 'Ballenbreite',
    girthLabel: 'Ballenumfang',
    zoneHeel: 'Ferse',
    zoneArch: 'Ballen M1–M5',
    zoneToe: 'Zehenraum',
    tabWorld: 'Weltweit',
    tabFit: 'Leisten',
    tabBrands: 'Marken',
    tabGuide: 'Messen',
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
    subtitle: 'Cordwainer Biometric Caliper',
    step1: 'Foot Length Scale',
    men: 'Men',
    women: 'Women',
    kids: 'Kids',
    cmLabel: 'cm',
    mmLabel: 'mm',
    insoleLabel: 'Insole',
    allowanceLabel: 'Allowance',
    widthLabel: 'Ball Width',
    girthLabel: 'Ball Girth',
    zoneHeel: 'Heel Cup',
    zoneArch: 'Forefoot M1–M5',
    zoneToe: 'Toe Box',
    tabWorld: 'Global',
    tabFit: 'Last Fit',
    tabBrands: 'Brands',
    tabGuide: 'Guide',
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
  const [isDraggingSlider, setIsDraggingSlider] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const [isProPurchased, setIsProPurchased] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const lastHapticMmRef = useRef<number>(footMm)
  const holdTimerRef = useRef<number | null>(null)
  const holdIntervalRef = useRef<number | null>(null)

  const range = RANGES[gender]

  const handleGenderChange = useCallback((g: Gender) => {
    hapticImpact('light')
    setGender(g)
    const r = RANGES[g]
    setFootMm((prev) => {
      const clamped = Math.min(r.max, Math.max(r.min, prev))
      lastHapticMmRef.current = clamped
      return clamped
    })
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
      const res = await fetch(
        `/api/check-purchase?userId=${encodeURIComponent(String(uid))}&productId=pro_sizes`,
        { cache: 'no-store' }
      )
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
      hapticImpact('medium')
      setStatusError(t.openInTelegramErr)
      return
    }

    setIsPurchasing(true)
    hapticImpact('medium')

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
        hapticImpact('heavy')
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
          hapticImpact('heavy')
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
    hapticImpact('light')
    setEditValue(unit === 'cm' ? (footMm / 10).toFixed(1) : String(Math.round(footMm)))
    setIsEditing(true)
  }

  const commitEdit = () => {
    const raw = parseFloat(editValue.replace(',', '.'))
    if (!isNaN(raw)) {
      const mm = Math.round(unit === 'cm' ? raw * 10 : raw)
      const clamped = Math.min(range.max, Math.max(range.min, mm))
      setFootMm(clamped)
      lastHapticMmRef.current = clamped
      hapticImpact('medium')
    }
    setIsEditing(false)
  }

  const applyStep = useCallback(
    (delta: number) => {
      setFootMm((prev) => {
        const next = Math.min(range.max, Math.max(range.min, prev + delta))
        if (next !== prev) {
          lastHapticMmRef.current = next
          hapticSelection()
        }
        return next
      })
    },
    [range.max, range.min]
  )

  const stopHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
  }, [])

  const startHold = useCallback(
    (delta: number, e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      stopHold()
      hapticImpact('light')
      setFootMm((prev) => {
        const next = Math.min(range.max, Math.max(range.min, prev + delta))
        lastHapticMmRef.current = next
        return next
      })
      holdTimerRef.current = window.setTimeout(() => {
        holdIntervalRef.current = window.setInterval(() => {
          applyStep(delta)
        }, 70)
      }, 320)
    },
    [applyStep, range.max, range.min, stopHold]
  )

  useEffect(() => {
    return () => stopHold()
  }, [stopHold])

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextMm = Number(e.target.value)
    setFootMm(nextMm)
    if (nextMm !== lastHapticMmRef.current) {
      lastHapticMmRef.current = nextMm
      hapticSelection()
    }
  }

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const usLabel = gender === 'kids' ? 'US K' : gender === 'men' ? 'US M' : 'US W'

  // Цветовая система Quiet Luxury 2026
  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cCard = isDark ? 'bg-[#141414]' : 'bg-[#EAE4DA]'
  const cCardElevated = isDark ? 'bg-[#1C1C1E]' : 'bg-[#E2DBD0]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/60' : 'text-[#1C1816]/60'
  const cLine = isDark ? 'border-[#F4F0E8]/14' : 'border-[#1C1816]/14'
  const accentHex = isDark ? '#D4AF37' : '#8C5A2B'
  const trackColor = isDark ? '#F4F0E8' : '#1C1816'
  const trackBgColor = isDark ? 'rgba(244,240,232,0.16)' : 'rgba(28,24,22,0.16)'

  const worldSystems = [
    { code: 'EU', sub: 'Paris Point', val: formatSize(result.eu), flag: <FlagEU />, free: true },
    { code: 'UA / СМ', sub: 'ДСТУ · Метр.', val: formatSize(result.ukr), flag: <FlagUA />, free: true },
    { code: usLabel, sub: 'Brannock', val: formatSize(result.us), flag: <FlagUS />, free: false },
    { code: 'UK', sub: 'Barleycorn', val: formatSize(result.uk), flag: <FlagUK />, free: false },
    { code: 'JP', sub: 'JIS S 5037 (cm)', val: result.jp.toFixed(1), flag: <FlagJP />, free: false },
    { code: 'CN', sub: 'GB/T 3293.1', val: `${formatSize(result.cn)} (${result.mondopoint})`, flag: <FlagCN />, free: false },
    { code: 'KR', sub: 'KS K 3405 (mm)', val: String(result.kr), flag: <FlagKR />, free: false },
    { code: 'BR', sub: 'ABNT NBR', val: formatSize(result.br), flag: <FlagBR />, free: false },
  ]

  // Генерируем 33 деления для магнитной шкалы-верньера (Apple Watch / iOS Camera style)
  const RULER_TICKS = 33

  return (
    <div
      className={`relative flex flex-col h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] transition-colors duration-300 ${cBg} ${cText} overflow-hidden select-none`}
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; -webkit-touch-callout: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes proGlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .pro-shimmer {
          background: linear-gradient(120deg, rgba(212,175,55,0.10), rgba(212,175,55,0.26), rgba(212,175,55,0.10));
          background-size: 200% 200%;
          animation: proGlow 4s ease infinite;
        }
        .apple-btn {
          transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.18s ease, opacity 0.18s ease;
        }
        .apple-btn:active {
          transform: scale(0.91);
        }
      `}</style>

      {/* 1. ВЕРХНИЙ БАР БЕЗ ПЕРЕПОЛНЕНИЯ (Кнопка Назад + Apple iOS Segmented Gender Control) */}
      <header className={`px-3.5 pt-2.5 pb-2 border-b ${cLine} flex items-center justify-between gap-2 shrink-0 z-20`}>
        <button
          onClick={() => {
            hapticImpact('light')
            onBack()
          }}
          className={`apple-btn flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-sans font-medium uppercase tracking-[0.14em] outline-none border-none bg-transparent cursor-pointer shrink-0 ${cTextMuted} hover:opacity-100`}
        >
          <span className="text-sm leading-none">←</span>
          <span>{t.back}</span>
        </button>

        {/* Пол (Мужской / Женский / Детский) с плавающей капсулой в стиле iOS */}
        <div className={`relative flex items-center rounded-full p-1 border ${cLine} ${cCard} min-w-0`}>
          {(['men', 'women', 'kids'] as Gender[]).map((g) => {
            const active = gender === g
            return (
              <button
                key={g}
                onClick={() => handleGenderChange(g)}
                className={`relative z-10 px-3 py-1 rounded-full text-[11px] font-sans font-medium uppercase tracking-[0.08em] transition-colors border-none bg-transparent cursor-pointer whitespace-nowrap ${
                  active
                    ? isDark
                      ? 'text-[#0A0A0A]'
                      : 'text-[#F2EFE9]'
                    : cTextMuted
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="genderSegmentedPill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className={`absolute inset-0 rounded-full -z-10 shadow-xs ${
                      isDark ? 'bg-[#F4F0E8]' : 'bg-[#1C1816]'
                    }`}
                  />
                )}
                {t[g]}
              </button>
            )
          })}
        </div>
      </header>

      {/* 2. ЦЕНТРАЛЬНАЯ БИОМЕТРИЧЕСКАЯ КАПСУЛА 2026 (Apple Taptic Drum + 3-Zone Telemetry) */}
      <section className="px-3.5 pt-2.5 shrink-0">
        <div className={`relative rounded-2xl border ${cLine} ${cCard} px-4 pt-3 pb-3 overflow-hidden shadow-xs`}>
          {/* Верхняя строка капсулы: Индекс стандарта + переключатель СМ / ММ */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <FlagEU />
              <FlagUA />
              <span className="text-[12px] font-sans font-semibold tracking-[0.12em] uppercase">
                EU {formatSize(result.eu)}
              </span>
              <span className={`text-[11px] font-sans ${cTextMuted}`}>
                · MP {result.mondopoint}
              </span>
            </div>

            {/* Переключатель СМ / ММ внутри карточки (никогда не вылезает за экран) */}
            <div className={`relative flex items-center rounded-lg p-0.5 border ${cLine} ${cCardElevated}`}>
              {(['cm', 'mm'] as const).map((u) => {
                const active = unit === u
                return (
                  <button
                    key={u}
                    onClick={() => {
                      hapticImpact('light')
                      setUnit(u)
                    }}
                    className={`relative z-10 px-2.5 py-0.5 rounded-md text-[11px] font-sans font-semibold uppercase tracking-wider transition-colors border-none bg-transparent cursor-pointer ${
                      active
                        ? isDark
                          ? 'text-[#0A0A0A]'
                          : 'text-[#F2EFE9]'
                        : cTextMuted
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="unitSwitchPill"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className={`absolute inset-0 rounded-md -z-10 ${
                          isDark ? 'bg-[#F4F0E8]' : 'bg-[#1C1816]'
                        }`}
                      />
                    )}
                    {u === 'cm' ? t.cmLabel : t.mmLabel}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Главный барабан размера + Кнопки - / + по стандарту Apple HIG (44x44px + удержание) */}
          <div className="flex items-center justify-between gap-3 my-1">
            <button
              onPointerDown={(e) => startHold(-1, e)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              disabled={footMm <= range.min}
              aria-label="Decrease foot length"
              className={`apple-btn w-11 h-11 rounded-full border ${cLine} ${cCardElevated} ${cText} flex items-center justify-center disabled:opacity-25 cursor-pointer shrink-0 shadow-2xs`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            <div onClick={startEdit} className="flex-1 flex flex-col items-center justify-center cursor-pointer">
              <div className="flex items-baseline justify-center gap-1.5">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    value={editValue}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                    onBlur={commitEdit}
                    onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                    className={`w-[115px] text-center text-[44px] font-serif leading-none bg-transparent outline-none border-b ${cLine} ${cText}`}
                    inputMode="decimal"
                  />
                ) : (
                  <motion.span
                    key={displayValue}
                    initial={{ opacity: 0.65, scale: 0.96, y: 2 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                    className="text-[46px] font-serif leading-none tracking-tight"
                  >
                    {displayValue}
                  </motion.span>
                )}
                <span className={`text-sm font-sans font-medium uppercase ${cTextMuted}`}>
                  {unit === 'cm' ? t.cmLabel : t.mmLabel}
                </span>
              </div>
            </div>

            <button
              onPointerDown={(e) => startHold(1, e)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              disabled={footMm >= range.max}
              aria-label="Increase foot length"
              className={`apple-btn w-11 h-11 rounded-full border ${cLine} ${cCardElevated} ${cText} flex items-center justify-center disabled:opacity-25 cursor-pointer shrink-0 shadow-2xs`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* 2026 BIOMETRIC TELEMETRY BAR (Вместо примитивного контура стельки — 3-зонная телеметрия колодки) */}
          <div className={`grid grid-cols-3 gap-1.5 my-2.5 p-2 rounded-xl border ${cLine} ${cCardElevated}`}>
            {/* Зона 1: Пятка (Heel Seat) */}
            <div className="flex flex-col px-1.5">
              <div className="flex items-center justify-between text-[10px] font-sans">
                <span className={cTextMuted}>{t.zoneHeel}</span>
                <span className="font-semibold">{proFit.heelSeatMm} {t.mmLabel}</span>
              </div>
              <div className="w-full h-1 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: trackBgColor }}>
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${Math.min(100, Math.max(35, pct * 0.8 + 20))}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  style={{ backgroundColor: trackColor }}
                />
              </div>
            </div>

            {/* Зона 2: Пучки M1-M5 (Forefoot Ball Width) */}
            <div className={`flex flex-col px-1.5 border-l border-r ${cLine}`}>
              <div className="flex items-center justify-between text-[10px] font-sans">
                <span className={cTextMuted}>{t.zoneArch}</span>
                <span className="font-semibold">{proFit.ballWidthMm} {t.mmLabel}</span>
              </div>
              <div className="w-full h-1 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: trackBgColor }}>
                <motion.div
                  className="h-full rounded-full"
                  animate={{
                    width:
                      widthFit === 'narrow'
                        ? '48%'
                        : widthFit === 'standard'
                          ? '68%'
                          : widthFit === 'wide'
                            ? '85%'
                            : '98%',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  style={{ backgroundColor: accentHex }}
                />
              </div>
            </div>

            {/* Зона 3: Стелька и Припуск мыска (Insole & Toe Box) */}
            <div className="flex flex-col px-1.5">
              <div className="flex items-center justify-between text-[10px] font-sans">
                <span className={cTextMuted}>{t.insoleLabel}</span>
                <span className="font-semibold" style={{ color: accentHex }}>
                  {proFit.insoleMm} {t.mmLabel}
                </span>
              </div>
              <div className="w-full h-1 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: trackBgColor }}>
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${Math.min(100, (proFit.allowanceMm / 18) * 100)}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  style={{ backgroundColor: accentHex }}
                />
              </div>
            </div>
          </div>

          {/* 3. МАГНИТНАЯ ШКАЛА-РУЛЕТКА В СТИЛЕ APPLE WATCH / iOS CAMERA */}
          <div className="relative w-full pt-1 pb-0.5">
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={1}
              value={footMm}
              onChange={handleSliderChange}
              onPointerDown={() => {
                setIsDraggingSlider(true)
                hapticImpact('light')
              }}
              onPointerUp={() => {
                setIsDraggingSlider(false)
                hapticImpact('light')
              }}
              onPointerCancel={() => setIsDraggingSlider(false)}
              className="w-full h-9 absolute inset-x-0 -top-1 z-30 opacity-0 cursor-pointer"
            />

            {/* Магнитная волна делений шкалы */}
            <div className="relative h-7 flex items-end justify-between px-1 pointer-events-none">
              {Array.from({ length: RULER_TICKS }).map((_, idx) => {
                const tickPct = (idx / (RULER_TICKS - 1)) * 100
                const dist = Math.abs(tickPct - pct)
                // Эффект магнитной линзы Apple: ближние к бегунку деления вырастают
                const proximity = Math.max(0, 1 - dist / 14)
                const baseHeight = idx % 4 === 0 ? 10 : 5
                const dynamicHeight = baseHeight + proximity * 12
                const isMajor = idx % 4 === 0

                return (
                  <div
                    key={idx}
                    className="w-[1.5px] rounded-full transition-all duration-75"
                    style={{
                      height: `${dynamicHeight}px`,
                      backgroundColor: proximity > 0.55 ? accentHex : trackColor,
                      opacity: proximity > 0.2 ? 0.95 : isMajor ? 0.45 : 0.22,
                    }}
                  />
                )
              })}

              {/* Тактильная головка микрометра (Apple Knob) */}
              <div
                className="absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none transition-transform duration-75"
                style={{
                  left: `calc(${pct}% - 12px)`,
                  transform: `translateY(-50%) scale(${isDraggingSlider ? 1.22 : 1})`,
                }}
              >
                <div
                  className="w-6 h-6 rounded-full shadow-md flex items-center justify-center"
                  style={{
                    backgroundColor: trackColor,
                    border: `2.5px solid ${isDark ? '#0A0A0A' : '#F2EFE9'}`,
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: accentHex }}
                  />
                </div>
              </div>
            </div>

            <div className={`flex justify-between items-center text-[11px] font-sans font-medium ${cTextMuted} mt-1 px-0.5`}>
              <span>{unit === 'cm' ? (range.min / 10).toFixed(1) : range.min}</span>
              <span className="text-[10px] uppercase tracking-[0.16em]">
                {t.step1} · +{proFit.allowanceMm} {t.mmLabel}
              </span>
              <span>{unit === 'cm' ? (range.max / 10).toFixed(1) : range.max}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. НАВИГАЦИЯ ПО ВКЛАДКАМ В СТИЛЕ APPLE iOS (Крупный шрифт, без обрезания точек "...") */}
      <nav className="px-3.5 pt-2 shrink-0">
        <div className={`relative grid grid-cols-4 gap-1 p-1 rounded-xl border ${cLine} ${cCard}`}>
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
                  hapticImpact('light')
                  setActiveTab(tab.id)
                }}
                className={`relative z-10 py-2 px-1 rounded-lg text-[11.5px] font-sans font-semibold uppercase tracking-[0.06em] transition-colors border-none bg-transparent cursor-pointer whitespace-nowrap ${
                  active
                    ? isDark
                      ? 'text-[#0A0A0A]'
                      : 'text-[#F2EFE9]'
                    : cTextMuted
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeTabPill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className={`absolute inset-0 rounded-lg -z-10 shadow-xs ${
                      isDark ? 'bg-[#F4F0E8]' : 'bg-[#1C1816]'
                    }`}
                  />
                )}
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* 5. РАБОЧАЯ ОБЛАСТЬ ВКЛАДОК (Крупные читаемые шрифты, равномерное заполнение экрана) */}
      <main className="flex-1 px-3.5 pt-2 pb-3 overflow-y-auto scrollbar-hide flex flex-col justify-between gap-2">
        <AnimatePresence mode="wait">
          {/* ВКЛАДКА 1: 8 МИРОВЫХ СТАНДАРТОВ */}
          {activeTab === 'world' && (
            <motion.div
              key="world"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="grid grid-cols-2 gap-2 my-auto"
            >
              {worldSystems.map((item) => {
                const unlocked = item.free || isProPurchased
                return (
                  <div
                    key={item.code}
                    onClick={() => {
                      if (!unlocked) handleProClick()
                      else hapticSelection()
                    }}
                    className={`apple-btn relative rounded-xl border ${cLine} ${cCard} px-3.5 py-3 flex items-center justify-between ${
                      !unlocked ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        {item.flag}
                        <span className="text-[13px] font-sans font-semibold uppercase tracking-[0.08em] truncate">
                          {item.code}
                        </span>
                      </div>
                      <span className={`text-[11px] font-sans ${cTextMuted} truncate`}>{item.sub}</span>
                    </div>

                    {unlocked ? (
                      <motion.span
                        key={item.val}
                        initial={{ scale: 0.92, opacity: 0.6 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="font-serif text-[26px] leading-none tracking-tight shrink-0 ml-1"
                      >
                        {item.val}
                      </motion.span>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-serif text-xl blur-[5px] opacity-40 select-none">42.5</span>
                        <span className={`p-1.5 rounded-lg border ${cLine} ${cTextMuted}`}>
                          <LockIcon />
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* ВКЛАДКА 2: КОЛОДКА, СТЕЛЬКА И ПОЛНОТА */}
          {activeTab === 'fit' && (
            <motion.div
              key="fit"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="flex flex-col gap-2 my-auto"
            >
              <div className={`rounded-xl border ${cLine} ${cCard} p-3 flex flex-col gap-2.5`}>
                <div className="flex flex-wrap gap-1.5">
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
                        hapticImpact('light')
                        setShoeStyle(st.id)
                      }}
                      className={`apple-btn px-3 py-1.5 rounded-lg text-[11.5px] font-sans font-medium uppercase tracking-wider border cursor-pointer ${
                        shoeStyle === st.id
                          ? isDark
                            ? 'border-[#F4F0E8] bg-[#F4F0E8] text-[#0A0A0A] font-semibold'
                            : 'border-[#1C1816] bg-[#1C1816] text-[#F2EFE9] font-semibold'
                          : `${cLine} bg-transparent ${cTextMuted}`
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
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
                        hapticImpact('light')
                        setWidthFit(wf.id)
                      }}
                      className={`apple-btn py-2 px-2.5 rounded-lg text-[11.5px] font-sans font-medium uppercase tracking-wider border cursor-pointer truncate ${
                        widthFit === wf.id
                          ? isDark
                            ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#F4F0E8] font-semibold'
                            : 'border-[#8C5A2B] bg-[#8C5A2B]/15 text-[#1C1816] font-semibold'
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
                className={`rounded-xl border ${cLine} ${cCard} p-3.5 grid grid-cols-2 gap-3 ${
                  !isProPurchased ? 'cursor-pointer' : ''
                }`}
              >
                <div>
                  <span className={`text-[11px] uppercase tracking-wider block ${cTextMuted}`}>
                    {t.insoleLabel} / {t.allowanceLabel}
                  </span>
                  <span className={`font-serif text-2xl block mt-0.5 ${!isProPurchased ? 'blur-[4px]' : ''}`}>
                    {proFit.insoleMm} {t.mmLabel} ({proFit.insoleCm} {t.cmLabel})
                  </span>
                  <span className={`block text-[11.5px] mt-0.5 ${cTextMuted}`}>
                    +{proFit.allowanceMm} {t.mmLabel} · Last {proFit.lastTraceMm} {t.mmLabel}
                  </span>
                </div>

                <div>
                  <span className={`text-[11px] uppercase tracking-wider block ${cTextMuted}`}>
                    {t.widthLabel} / {t.girthLabel}
                  </span>
                  <span className={`font-serif text-2xl block mt-0.5 ${!isProPurchased ? 'blur-[4px]' : ''}`}>
                    {proFit.ballWidthMm} / {proFit.ballGirthMm} {t.mmLabel}
                  </span>
                  <span className={`block text-[11.5px] mt-0.5 ${cTextMuted} ${!isProPurchased ? 'blur-[3px]' : ''}`}>
                    EU {proFit.widthMarks.eu} · US {proFit.widthMarks.us} · JP {proFit.widthMarks.jp}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ВКЛАДКА 3: МАТРИЦА ПОСАДКИ БРЕНДОВ */}
          {activeTab === 'brands' && (
            <motion.div
              key="brands"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="flex flex-col gap-1.5 my-auto"
            >
              {proFit.brandMatrix.map((row: BrandFitEntry) => (
                <div
                  key={row.brand}
                  onClick={() => {
                    if (!isProPurchased) handleProClick()
                    else hapticSelection()
                  }}
                  className={`rounded-xl border ${cLine} ${cCard} px-3.5 py-2.5 flex items-center justify-between gap-2 ${
                    !isProPurchased ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-sans font-semibold uppercase tracking-wider">
                        {row.brand}
                      </span>
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${cLine} ${cTextMuted}`}>
                        {row.category}
                      </span>
                    </div>
                    <p className={`text-[11.5px] font-sans ${cTextMuted} truncate mt-0.5`}>
                      {row.offsetNote[safeLang]}
                    </p>
                  </div>

                  {isProPurchased ? (
                    <div className="text-right shrink-0">
                      <span className="font-serif text-[19px] block leading-tight">
                        EU {row.eu} · US {row.us}
                      </span>
                      <span className={`text-[11px] font-sans ${cTextMuted}`}>
                        UK {row.uk} · JP {row.jp}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-serif text-base blur-[4px] opacity-40 select-none">EU 42.5</span>
                      <LockIcon />
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* ВКЛАДКА 4: ИНСТРУКЦИЯ ЗАМЕРА И ISO */}
          {activeTab === 'guide' && (
            <motion.div
              key="guide"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className={`rounded-xl border ${cLine} ${cCard} p-4 flex flex-col gap-2.5 my-auto`}
            >
              <p className="text-[13px] font-sans leading-relaxed">{t.measureGuide1}</p>
              <p className="text-[13px] font-sans leading-relaxed">{t.measureGuide2}</p>
              <p className="text-[13px] font-sans leading-relaxed">{t.measureGuide3}</p>
              <p className={`text-[12px] font-sans italic pt-2 border-t ${cLine} ${cTextMuted}`}>
                {t.measureTip}
              </p>
              <div className={`pt-2 border-t ${cLine} text-[11px] font-sans ${cTextMuted}`}>
                <div>{t.disclaimer}</div>
                <div className="mt-0.5">{t.standardsNote}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 6. НИЖНИЙ БАР СТАТУСА ИЛИ ПОКУПКИ PRO */}
        <div className="shrink-0">
          {statusError && (
            <div className="mb-1.5 px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-[12px] text-center">
              {statusError}
            </div>
          )}

          {!isProPurchased ? (
            <div className={`rounded-xl border ${cLine} pro-shimmer p-3 flex flex-col gap-2`}>
              <div>
                <h3 className="font-serif text-base tracking-tight leading-none mb-1">{t.proTitle}</h3>
                <p className={`text-[11.5px] font-sans leading-snug ${cTextMuted}`}>{t.proDesc}</p>
              </div>

              <button
                onClick={handleProClick}
                disabled={isPurchasing}
                className={`apple-btn w-full py-3 px-4 rounded-xl border ${cLine} flex items-center justify-center gap-2 text-[12px] font-sans font-semibold uppercase tracking-[0.14em] cursor-pointer ${
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
            <div className={`rounded-xl border ${cLine} ${cCard} px-4 py-2.5 flex items-center justify-between text-[11px] font-sans font-medium uppercase tracking-[0.14em] ${cTextMuted}`}>
              <span className="truncate">{t.subtitle}</span>
              <span className="shrink-0 ml-2 font-semibold" style={{ color: accentHex }}>
                ★ {t.proActiveBadge}
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
