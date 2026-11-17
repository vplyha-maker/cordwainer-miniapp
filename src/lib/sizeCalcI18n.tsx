/**
 * src/lib/sizeCalcI18n.tsx
 * Локализация (RU / UK / DE / EN), SVG-флаги и кроссплатформенный тактильный движок
 * с поддержкой Android WebView (navigator.vibrate + Telegram HapticFeedback) и iOS.
 */
import React from 'react'

export type SupportedLang = 'ru' | 'uk' | 'de' | 'en'

export const PRO_PRICE_STARS = 150

let sharedAudioCtx: AudioContext | null = null
let lastHapticTimestamp = 0

function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /android/i.test(navigator.userAgent || '')
}

function playTapticMicroPulse(intensity: 'tick' | 'light' | 'medium' | 'heavy') {
  try {
    // На Android звуковой микро-импульс при быстром скролле не нужен, там работает мотор вибрации
    if (isAndroidDevice()) return
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
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

/**
 * Тактильный отклик при переборе делений шкалы (с защитой от забивания вибромотора Android)
 */
export function hapticSelection() {
  const now = performance.now()
  if (now - lastHapticTimestamp < 38) return
  lastHapticTimestamp = now

  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { selectionChanged?: () => void } } } }).Telegram?.WebApp
    tg?.HapticFeedback?.selectionChanged?.()
  } catch {}

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      // 16 мс — минимальный импульс для чёткого старта вибромотора Android
      navigator.vibrate(16)
    }
  } catch {}

  playTapticMicroPulse('tick')
}

/**
 * Тактильный отклик при нажатии кнопок и переключении вкладок
 */
export function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light') {
  lastHapticTimestamp = performance.now()

  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred?: (s: string) => void } } } }).Telegram?.WebApp
    tg?.HapticFeedback?.impactOccurred?.(style)
  } catch {}

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      const duration = style === 'light' ? 20 : style === 'heavy' ? 40 : 28
      navigator.vibrate(duration)
    }
  } catch {}

  playTapticMicroPulse(style)
}

export type TranslationBundle = {
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
  zoneGirth: string
  zoneArch: string
  zoneInsole: string
  subParisPoint: string
  subDstuMetric: string
  subBrannock: string
  subBarleycorn: string
  subJis: string
  subGbt: string
  subKsk: string
  subAbnt: string
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

export const I18N: Record<SupportedLang, TranslationBundle> = {
  ru: {
    back: 'Назад',
    subtitle: 'Cordwainer Biometric Caliper',
    step1: 'Шкала стопы',
    men: 'Мужской',
    women: 'Женский',
    kids: 'Детский',
    cmLabel: 'см',
    mmLabel: 'мм',
    insoleLabel: 'Стелька',
    allowanceLabel: 'Припуск',
    widthLabel: 'Ширина пучков',
    girthLabel: 'Обхват пучков',
    zoneGirth: 'Обхват M1–M5',
    zoneArch: 'Ширина M1–M5',
    zoneInsole: 'Стелька',
    subParisPoint: 'Paris Point (2/3 см)',
    subDstuMetric: 'ДСТУ / ГОСТ · см',
    subBrannock: 'Brannock США',
    subBarleycorn: 'Barleycorn (1/3")',
    subJis: 'JIS S 5037 (см)',
    subGbt: 'GB/T 3293.1',
    subKsk: 'KS K 3405 (мм)',
    subAbnt: 'ABNT NBR (EU−2)',
    tabWorld: 'Мировые',
    tabFit: 'Колодка',
    tabBrands: 'Бренды',
    tabGuide: 'Замер',
    styleSneakers: 'Кроссовки',
    styleClassic: 'Классика',
    styleWinter: 'Зима / Мех',
    styleRunning: 'Бег / Трек',
    styleSandals: 'Открытая',
    widthNarrow: 'Узкая (E/F)',
    widthStandard: 'Стандарт (G)',
    widthWide: 'Широкая (H)',
    widthExtraWide: 'Экстра (K)',
    proTitle: 'PRO Паспорт Колодки & 8 стран',
    proDesc: 'US, UK, Япония (JP), Китай (CN), Корея (KR), Бразилия (BR), полнота E–K (JIS / ГОСТ) и матрица брендов.',
    proBtn: `ОТКРЫТЬ PRO ДОСТУП · ${PRO_PRICE_STARS} ⭐️`,
    proActiveBadge: 'PRO АКТИВЕН',
    loading: 'ПРОВЕРКА ТРАНЗАКЦИИ...',
    measureGuide1: '1. Встаньте на лист бумаги в носках, распределив вес тела равномерно на обе ноги.',
    measureGuide2: '2. Отметьте крайнюю точку пятки и самого длинного пальца вертикальным карандашом (90°).',
    measureGuide3: '3. Для полноты измерьте обхват стопы лентой по выступающим косточкам пучков (M1–M5).',
    measureTip: 'Проводите замер вечером — к концу дня стопа удлиняется на 2–3 мм и увеличивается в обхвате.',
    disclaimer: 'Расчёты строго по таблицам ГОСТ Р 57425-2017 (ISO 19407) и ISO 9407 (Mondopoint).',
    standardsNote: 'Полнота и обхват пучков: JIS S 5037 · ГОСТ 3927-88 · US Brannock.',
    openInTelegramErr: 'Откройте мини-приложение внутри Telegram для оплаты Stars.',
    paymentCancelledErr: 'Оплата была отменена или не завершена.',
    serverErrPrefix: 'Ошибка соединения',
  },
  uk: {
    back: 'Назад',
    subtitle: 'Cordwainer Biometric Caliper',
    step1: 'Шкала стопи',
    men: 'Чоловічий',
    women: 'Жіночий',
    kids: 'Дитячий',
    cmLabel: 'см',
    mmLabel: 'мм',
    insoleLabel: 'Устілка',
    allowanceLabel: 'Припуск',
    widthLabel: 'Ширина пучків',
    girthLabel: 'Обхват пучків',
    zoneGirth: 'Обхват M1–M5',
    zoneArch: 'Ширина M1–M5',
    zoneInsole: 'Устілка',
    subParisPoint: 'Paris Point (2/3 см)',
    subDstuMetric: 'ДСТУ · Метричний см',
    subBrannock: 'Brannock США',
    subBarleycorn: 'Barleycorn (1/3")',
    subJis: 'JIS S 5037 (см)',
    subGbt: 'GB/T 3293.1',
    subKsk: 'KS K 3405 (мм)',
    subAbnt: 'ABNT NBR (EU−2)',
    tabWorld: 'Світові',
    tabFit: 'Колодка',
    tabBrands: 'Бренди',
    tabGuide: 'Замір',
    styleSneakers: 'Кросівки',
    styleClassic: 'Класика',
    styleWinter: 'Зима / Хутро',
    styleRunning: 'Біг / Трек',
    styleSandals: 'Відкрите',
    widthNarrow: 'Вузька (E/F)',
    widthStandard: 'Стандарт (G)',
    widthWide: 'Широка (H)',
    widthExtraWide: 'Екстра (K)',
    proTitle: 'PRO Паспорт Колодки & 8 країн',
    proDesc: 'US, UK, Японія (JP), Китай (CN), Корея (KR), Бразилія (BR), повнота E–K (JIS / ДСТУ) та матриця брендів.',
    proBtn: `ВІДКРИТИ PRO ДОСТУП · ${PRO_PRICE_STARS} ⭐️`,
    proActiveBadge: 'PRO АКТИВНИЙ',
    loading: 'ПЕРЕВІРКА ТРАНЗАКЦІЇ...',
    measureGuide1: '1. Станьте на аркуш паперу в шкарпетках, рівномірно розподіливши вагу на обидві ноги.',
    measureGuide2: '2. Позначте крайню точку п’яти та найдовшого пальця вертикальним олівцем (90°).',
    measureGuide3: '3. Для повноти виміряйте обхват стопи стрічкою по виступаючих кісточках пучків (M1–M5).',
    measureTip: 'Виконуйте замір увечері — до кінця дня стопа видовжується на 2–3 мм.',
    disclaimer: 'Розрахунки за таблицями ISO 19407:2023 та ISO 9407 (Mondopoint).',
    standardsNote: 'Повнота та обхват пучків: JIS S 5037 · ДСТУ ГОСТ 3927 · US Brannock.',
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
    zoneGirth: 'Umfang M1–M5',
    zoneArch: 'Breite M1–M5',
    zoneInsole: 'Innensohle',
    subParisPoint: 'Pariser Stich (2/3 cm)',
    subDstuMetric: 'DSTU · Metrisch (cm)',
    subBrannock: 'US Brannock',
    subBarleycorn: 'Barleycorn (1/3 Zoll)',
    subJis: 'JIS S 5037 (cm)',
    subGbt: 'GB/T 3293.1 (China)',
    subKsk: 'KS K 3405 (mm)',
    subAbnt: 'ABNT NBR (EU−2)',
    tabWorld: 'Weltweit',
    tabFit: 'Leisten',
    tabBrands: 'Marken',
    tabGuide: 'Messen',
    styleSneakers: 'Sneaker',
    styleClassic: 'Klassisch',
    styleWinter: 'Winter / Pelz',
    styleRunning: 'Running',
    styleSandals: 'Sandalen',
    widthNarrow: 'Schmal (E/F)',
    widthStandard: 'Standard (G)',
    widthWide: 'Weit (H)',
    widthExtraWide: 'Spezial (K)',
    proTitle: 'PRO Leisten-Pass & 8 Normen',
    proDesc: 'US, UK, Japan (JP), China (CN), Korea (KR), Brasilien (BR), Schuhweite E–K (Ballenumfang in mm) & Marken-Matrix.',
    proBtn: `PRO FREISCHALTEN · ${PRO_PRICE_STARS} ⭐️`,
    proActiveBadge: 'PRO AKTIV',
    loading: 'TRANSAKTION LÄUFT...',
    measureGuide1: '1. Stellen Sie sich in Socken mit gleichmäßig verteiltem Gewicht auf ein Blatt Papier.',
    measureGuide2: '2. Markieren Sie Ferse und längsten Zeh mit exakt senkrecht gehaltenem Stift (90°).',
    measureGuide3: '3. Messen Sie für die Schuhweite den Ballenumfang (M1–M5) mit einem Maßband.',
    measureTip: 'Messen Sie am späten Nachmittag — Füße dehnen sich tagsüber um 2–3 mm aus.',
    disclaimer: 'Berechnung exakt nach ISO 19407:2023 und ISO 9407 (Mondopoint in mm).',
    standardsNote: 'Ballenweite nach JIS S 5037 · EU-Schuhweite E–K · US Brannock · DSTU / GOST.',
    openInTelegramErr: 'Bitte öffnen Sie die Mini-App in Telegram für Stars-Zahlungen.',
    paymentCancelledErr: 'Zahlung wurde abgebrochen oder nicht abgeschlossen.',
    serverErrPrefix: 'Verbindungsfehler',
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
    zoneGirth: 'Girth M1–M5',
    zoneArch: 'Width M1–M5',
    zoneInsole: 'Insole',
    subParisPoint: 'Paris Point (2/3 cm)',
    subDstuMetric: 'DSTU · Metric (cm)',
    subBrannock: 'US Brannock',
    subBarleycorn: 'Barleycorn (1/3 in)',
    subJis: 'JIS S 5037 (cm)',
    subGbt: 'GB/T 3293.1',
    subKsk: 'KS K 3405 (mm)',
    subAbnt: 'ABNT NBR (EU−2)',
    tabWorld: 'Global',
    tabFit: 'Last Fit',
    tabBrands: 'Brands',
    tabGuide: 'Guide',
    styleSneakers: 'Sneakers',
    styleClassic: 'Classic',
    styleWinter: 'Winter Fur',
    styleRunning: 'Run / Trek',
    styleSandals: 'Sandals',
    widthNarrow: 'Narrow (E/F)',
    widthStandard: 'Standard (G)',
    widthWide: 'Wide (H)',
    widthExtraWide: 'X-Wide (K)',
    proTitle: 'PRO Last Passport & 8 Systems',
    proDesc: 'Unlock US, UK, Japan (JP), China (CN), Korea (KR), Brazil (BR), E–K width & ball girth in mm, and brand matrix.',
    proBtn: `UNLOCK PRO ACCESS · ${PRO_PRICE_STARS} ⭐️`,
    proActiveBadge: 'PRO ACTIVE',
    loading: 'VERIFYING...',
    measureGuide1: '1. Stand on a sheet of paper in socks with weight evenly distributed on both feet.',
    measureGuide2: '2. Mark the back of the heel and tip of the longest toe keeping the pen vertical (90°).',
    measureGuide3: '3. Measure forefoot ball girth (M1–M5) with a tape measure around the widest joints.',
    measureTip: 'Measure in the evening — feet naturally expand by 2–3 mm during the day.',
    disclaimer: 'Calculated per ISO 19407:2023 and ISO 9407 (Mondopoint in mm).',
    standardsNote: 'Forefoot width & girth per JIS S 5037 · EU E–K · US Brannock · DSTU.',
    openInTelegramErr: 'Please open the Mini App inside Telegram to pay with Stars.',
    paymentCancelledErr: 'Payment was cancelled or failed.',
    serverErrPrefix: 'Connection error',
  },
}

export const FlagEU: React.FC = () => (
  <svg width="16" height="11" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="12" fill="#003399" />
    <g fill="#FFCC00">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const a = (i * 30 - 90) * (Math.PI / 180)
        return <circle key={i} cx={9 + 3.8 * Math.cos(a)} cy={6 + 3.8 * Math.sin(a)} r="0.6" />
      })}
    </g>
  </svg>
)

export const FlagUA: React.FC = () => (
  <svg width="16" height="11" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="6" fill="#0057B7" />
    <rect y="6" width="18" height="6" fill="#FFD700" />
  </svg>
)

export const FlagUK: React.FC = () => (
  <svg width="16" height="11" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="12" fill="#012169" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#fff" strokeWidth="2" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#C8102E" strokeWidth="1" />
    <path d="M9 0 V12 M0 6 H18" stroke="#fff" strokeWidth="3.2" />
    <path d="M9 0 V12 M0 6 H18" stroke="#C8102E" strokeWidth="1.6" />
  </svg>
)

export const FlagUS: React.FC = () => (
  <svg width="16" height="11" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="12" fill="#B22234" />
    <rect y="1.33" width="18" height="1.33" fill="#fff" />
    <rect y="4" width="18" height="1.33" fill="#fff" />
    <rect y="6.67" width="18" height="1.33" fill="#fff" />
    <rect y="9.33" width="18" height="1.33" fill="#fff" />
    <rect width="7.2" height="6.5" fill="#3C3B6E" />
  </svg>
)

export const FlagJP: React.FC = () => (
  <svg width="16" height="11" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 border border-current/15 shadow-xs">
    <rect width="18" height="12" fill="#FFFFFF" />
    <circle cx="9" cy="6" r="3.4" fill="#BC002D" />
  </svg>
)

export const FlagCN: React.FC = () => (
  <svg width="16" height="11" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="12" fill="#DE2910" />
    <circle cx="3.8" cy="3.6" r="1.4" fill="#FFDE00" />
    <circle cx="6.5" cy="1.8" r="0.45" fill="#FFDE00" />
    <circle cx="7.6" cy="3.0" r="0.45" fill="#FFDE00" />
    <circle cx="7.4" cy="4.6" r="0.45" fill="#FFDE00" />
    <circle cx="6.3" cy="5.8" r="0.45" fill="#FFDE00" />
  </svg>
)

export const FlagKR: React.FC = () => (
  <svg width="16" height="11" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 border border-current/15 shadow-xs">
    <rect width="18" height="12" fill="#FFFFFF" />
    <circle cx="9" cy="6" r="2.8" fill="#CD2E3A" />
    <path d="M6.2 6 A2.8 2.8 0 0 0 11.8 6 A1.4 1.4 0 0 1 9 6 A1.4 1.4 0 0 0 6.2 6 Z" fill="#0047A0" />
  </svg>
)

export const FlagBR: React.FC = () => (
  <svg width="16" height="11" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="12" fill="#009739" />
    <polygon points="9,1.4 16.2,6 9,10.6 1.8,6" fill="#FEDD00" />
    <circle cx="9" cy="6" r="2.2" fill="#012169" />
  </svg>
)

export const LockIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
)

