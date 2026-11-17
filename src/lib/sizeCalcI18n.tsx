/**
 * src/lib/sizeCalcI18n.tsx
 * Локализация (RU / UK / DE / EN), SVG-флаги и усиленный тактильный движок
 * для Android (Samsung One UI / Xiaomi / Pixel) и iPhone (Taptic Engine).
 */
import React from 'react'

export type SupportedLang = 'ru' | 'uk' | 'de' | 'en'

export const PRO_PRICE_STARS = 150

let sharedAudioCtx: AudioContext | null = null
let lastHapticTimestamp = 0

/**
 * Двухчастотный тактильно-акустический импульс штангенциркуля (работает и на iPhone, и на Android!)
 * Сочетает низкочастотный толчок (125 Гц) и сухой механический щелчок микрометра (880 Гц),
 * который хорошо воспроизводится динамиками Android-смартфонов.
 */
function playTapticMicroPulse(intensity: 'tick' | 'light' | 'medium' | 'heavy') {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx()
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {})
    }
    const now = sharedAudioCtx.currentTime

    // 1. Низкочастотный тактильный резонанс
    const oscLow = sharedAudioCtx.createOscillator()
    const gainLow = sharedAudioCtx.createGain()
    const duration = intensity === 'tick' ? 0.008 : intensity === 'light' ? 0.011 : 0.015
    const peakLow = intensity === 'tick' ? 0.09 : intensity === 'light' ? 0.13 : 0.18

    oscLow.type = 'triangle'
    oscLow.frequency.setValueAtTime(intensity === 'tick' ? 170 : 140, now)
    oscLow.frequency.exponentialRampToValueAtTime(48, now + duration)

    gainLow.gain.setValueAtTime(peakLow, now)
    gainLow.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    oscLow.connect(gainLow)
    gainLow.connect(sharedAudioCtx.destination)
    oscLow.start(now)
    oscLow.stop(now + duration)

    // 2. Короткий механический щелчок храповика микрометра (слышен и ощутим на Android)
    const oscClick = sharedAudioCtx.createOscillator()
    const gainClick = sharedAudioCtx.createGain()
    const clickDur = 0.0035
    oscClick.type = 'sine'
    oscClick.frequency.setValueAtTime(intensity === 'tick' ? 920 : 760, now)
    oscClick.frequency.exponentialRampToValueAtTime(240, now + clickDur)

    gainClick.gain.setValueAtTime(intensity === 'tick' ? 0.05 : 0.08, now)
    gainClick.gain.exponentialRampToValueAtTime(0.0001, now + clickDur)

    oscClick.connect(gainClick)
    gainClick.connect(sharedAudioCtx.destination)
    oscClick.start(now)
    oscClick.stop(now + clickDur)
  } catch {}
}

/**
 * Прямой вызов нативного моста Telegram для Android (TelegramWebviewProxy) + WebApp SDK + Vibrator API
 */
function triggerNativeTelegramHaptic(style: 'light' | 'medium' | 'heavy' | 'rigid') {
  const win = window as unknown as {
    Telegram?: {
      WebApp?: {
        HapticFeedback?: {
          impactOccurred?: (s: string) => void
          selectionChanged?: () => void
        }
      }
      WebView?: {
        postEvent?: (eventType: string, callback?: boolean, eventData?: unknown) => void
      }
    }
    TelegramWebviewProxy?: {
      postEvent?: (eventType: string, eventData: string) => void
    }
  }

  // 1. Стандартный SDK Telegram (на Android используем 'medium'/'rigid', т.к. 'light'/selectionChanged глушится на Samsung)
  try {
    const hf = win.Telegram?.WebApp?.HapticFeedback
    if (hf?.impactOccurred) {
      hf.impactOccurred(style)
    } else if (hf?.selectionChanged) {
      hf.selectionChanged()
    }
  } catch {}

  // 2. Прямой вызов Android Java-моста TelegramWebviewProxy
  try {
    if (typeof win.TelegramWebviewProxy?.postEvent === 'function') {
      win.TelegramWebviewProxy.postEvent(
        'web_app_trigger_haptic_feedback',
        JSON.stringify({ type: 'impact', impact_style: style })
      )
    } else if (typeof win.Telegram?.WebView?.postEvent === 'function') {
      win.Telegram.WebView.postEvent('web_app_trigger_haptic_feedback', false, {
        type: 'impact',
        impact_style: style,
      })
    }
  } catch {}

  // 3. Браузерный вибратор Android Chrome
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(style === 'heavy' ? 35 : 22)
    }
  } catch {}
}

export function hapticSelection() {
  const now = performance.now()
  if (now - lastHapticTimestamp < 36) return
  lastHapticTimestamp = now

  // На Android 'medium' реально включает мотор вибрации в Telegram (в отличие от беззвучного selectionChanged)
  triggerNativeTelegramHaptic('medium')
  playTapticMicroPulse('tick')
}

export function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light') {
  lastHapticTimestamp = performance.now()
  const effectiveStyle = style === 'light' ? 'medium' : style
  triggerNativeTelegramHaptic(effectiveStyle)
  playTapticMicroPulse(style)
}

export type TranslationBundle = {
  back: string
  subtitle: string
  modeFoot: string
  modeInsole: string
  footLengthLabel: string
  insoleInputLabel: string
  yourSizeLabel: string
  builtInAllowanceHint: string
  winterShiftBadge: string
  men: string
  women: string
  kids: string
  cmLabel: string
  mmLabel: string
  insoleLabel: string
  allowanceLabel: string
  widthLabel: string
  girthLabel: string
  xrayFootTag: string
  xrayInsoleTag: string
  xrayBallTag: string
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
    modeFoot: 'Замер стопы',
    modeInsole: 'По стельке',
    footLengthLabel: 'Длина стопы',
    insoleInputLabel: 'Длина стельки',
    yourSizeLabel: 'Ваш размер',
    builtInAllowanceHint: 'Не прибавляйте стельку на ползунке: внутри размера',
    winterShiftBadge: 'с учётом запаса',
    men: 'Мужской',
    women: 'Женский',
    kids: 'Детский',
    cmLabel: 'см',
    mmLabel: 'мм',
    insoleLabel: 'Стелька внутри',
    allowanceLabel: 'Запас мыска',
    widthLabel: 'Ширина пучков',
    girthLabel: 'Обхват пучков',
    xrayFootTag: 'Стопа',
    xrayInsoleTag: 'Стелька',
    xrayBallTag: 'Обхват M1–M5',
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
    measureGuide1: '1. Встаньте на лист бумаги в носках, распределив вес равномерно на обе ноги.',
    measureGuide2: '2. Отметьте пятку и самый длинный палец вертикальным карандашом (90°) — это ваша длина стопы (например, 270 мм).',
    measureGuide3: '3. ВАЖНО: В размер EU 42.5 (для стопы 270 мм) заводской запас стельки (+12…15 мм, т.е. стелька 282–285 мм) УЖЕ ЗАЛОЖЕН. Не выставляйте длину стельки в режиме «Замер стопы»!',
    measureTip: 'Если вы измерили линейкой вынутую стельку (например, 285 мм), переключите кнопку сверху на «По стельке».',
    disclaimer: 'Расчёты строго по таблицам ГОСТ Р 57425-2017 (ISO 19407) и ISO 9407 (Mondopoint).',
    standardsNote: 'Полнота и обхват пучков: JIS S 5037 · ГОСТ 3927-88 · US Brannock.',
    openInTelegramErr: 'Откройте мини-приложение внутри Telegram для оплаты Stars.',
    paymentCancelledErr: 'Оплата была отменена или не завершена.',
    serverErrPrefix: 'Ошибка соединения',
  },
  uk: {
    back: 'Назад',
    subtitle: 'Cordwainer Biometric Caliper',
    modeFoot: 'Замір стопи',
    modeInsole: 'По устілці',
    footLengthLabel: 'Довжина стопи',
    insoleInputLabel: 'Довжина устілки',
    yourSizeLabel: 'Ваш розмір',
    builtInAllowanceHint: 'Не додавайте устілку на повзунку: всередині розміру',
    winterShiftBadge: 'з урахуванням запасу',
    men: 'Чоловічий',
    women: 'Жіночий',
    kids: 'Дитячий',
    cmLabel: 'см',
    mmLabel: 'мм',
    insoleLabel: 'Устілка всередині',
    allowanceLabel: 'Запас миска',
    widthLabel: 'Ширина пучків',
    girthLabel: 'Обхват пучків',
    xrayFootTag: 'Стопа',
    xrayInsoleTag: 'Устілка',
    xrayBallTag: 'Обхват M1–M5',
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
    measureGuide2: '2. Позначте п’яту та найдовший палець вертикальним олівцем (90°) — це ваша довжина стопи (наприклад, 270 мм).',
    measureGuide3: '3. ВАЖЛИВО: У розмір EU 42.5 (для стопи 270 мм) заводський запас устілки (+12…15 мм, тобто устілка 282–285 мм) ВЖЕ ЗАКЛАДЕНО. Не виставляйте довжину устілки в режимі «Замір стопи»!',
    measureTip: 'Якщо ви виміряли лінійкою вийняту устілку (наприклад, 285 мм), перемкніть кнопку зверху на «По устілці».',
    disclaimer: 'Розрахунки за таблицями ISO 19407:2023 та ISO 9407 (Mondopoint).',
    standardsNote: 'Повнота та обхват пучків: JIS S 5037 · ДСТУ ГОСТ 3927 · US Brannock.',
    openInTelegramErr: 'Відкрийте міні-додаток усередині Telegram для оплати Stars.',
    paymentCancelledErr: 'Оплату було скасовано або не завершено.',
    serverErrPrefix: 'Помилка з’єднання',
  },
  de: {
    back: 'Zurück',
    subtitle: 'Cordwainer Biometric Caliper',
    modeFoot: 'Fußlänge',
    modeInsole: 'Innensohle',
    footLengthLabel: 'Fußlänge',
    insoleInputLabel: 'Sohlenlänge',
    yourSizeLabel: 'Ihre Größe',
    builtInAllowanceHint: 'Zugabe nicht am Regler addieren: In Größe',
    winterShiftBadge: 'inkl. Zugabe',
    men: 'Herren',
    women: 'Damen',
    kids: 'Kinder',
    cmLabel: 'cm',
    mmLabel: 'mm',
    insoleLabel: 'Innensohle',
    allowanceLabel: 'Zehenzugabe',
    widthLabel: 'Ballenbreite',
    girthLabel: 'Ballenumfang',
    xrayFootTag: 'Fuß',
    xrayInsoleTag: 'Sohle',
    xrayBallTag: 'Umfang M1–M5',
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
    measureGuide2: '2. Markieren Sie Ferse und längsten Zeh mit senkrechtem Stift (90°) — das ist Ihre Fußlänge (z. B. 270 mm).',
    measureGuide3: '3. WICHTIG: In Größe EU 42.5 (für 270 mm Fuß) ist die Innensohlen-Zugabe (+12…15 mm, also 282–285 mm Sohle) BEREITS ENTHALTEN!',
    measureTip: 'Wenn Sie eine herausgenommene Innensohle gemessen haben, schalten Sie oben auf „Innensohle“ um.',
    disclaimer: 'Berechnung exakt nach ISO 19407:2023 und ISO 9407 (Mondopoint in mm).',
    standardsNote: 'Ballenweite nach JIS S 5037 · EU-Schuhweite E–K · US Brannock · DSTU / GOST.',
    openInTelegramErr: 'Bitte öffnen Sie die Mini-App in Telegram für Stars-Zahlungen.',
    paymentCancelledErr: 'Zahlung wurde abgebrochen oder nicht abgeschlossen.',
    serverErrPrefix: 'Verbindungsfehler',
  },
  en: {
    back: 'Back',
    subtitle: 'Cordwainer Biometric Caliper',
    modeFoot: 'By Foot',
    modeInsole: 'By Insole',
    footLengthLabel: 'Foot Length',
    insoleInputLabel: 'Insole Length',
    yourSizeLabel: 'Your Size',
    builtInAllowanceHint: 'Do not add insole on slider: inside size',
    winterShiftBadge: 'with allowance',
    men: 'Men',
    women: 'Women',
    kids: 'Kids',
    cmLabel: 'cm',
    mmLabel: 'mm',
    insoleLabel: 'Internal Insole',
    allowanceLabel: 'Toe Box Space',
    widthLabel: 'Ball Width',
    girthLabel: 'Ball Girth',
    xrayFootTag: 'Foot',
    xrayInsoleTag: 'Insole',
    xrayBallTag: 'Girth M1–M5',
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
    measureGuide2: '2. Mark the heel and longest toe with a vertical pen (90°) — this is your foot length (e.g. 270 mm).',
    measureGuide3: '3. IMPORTANT: Size EU 42.5 (for a 270 mm foot) ALREADY has +12…15 mm insole space built-in (282–285 mm insole). Never enter insole length in "By Foot" mode!',
    measureTip: 'If you measured a removable shoe insole with a ruler, switch the top mode to "By Insole".',
    disclaimer: 'Calculated per ISO 19407:2023 and ISO 9407 (Mondopoint in mm).',
    standardsNote: 'Forefoot width & girth per JIS S 5037 · EU E–K · US Brannock · DSTU.',
    openInTelegramErr: 'Please open the Mini App inside Telegram to pay with Stars.',
    paymentCancelledErr: 'Payment was cancelled or failed.',
    serverErrPrefix: 'Connection error',
  },
}

export const FlagEU: React.FC = () => (
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

export const FlagUA: React.FC = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="6" fill="#0057B7" />
    <rect y="6" width="18" height="6" fill="#FFD700" />
  </svg>
)

export const FlagUK: React.FC = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="12" fill="#012169" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#fff" strokeWidth="2" />
    <path d="M0 0 L18 12 M18 0 L0 12" stroke="#C8102E" strokeWidth="1" />
    <path d="M9 0 V12 M0 6 H18" stroke="#fff" strokeWidth="3.2" />
    <path d="M9 0 V12 M0 6 H18" stroke="#C8102E" strokeWidth="1.6" />
  </svg>
)

export const FlagUS: React.FC = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="12" fill="#B22234" />
    <rect y="1.33" width="18" height="1.33" fill="#fff" />
    <rect y="4" width="18" height="1.33" fill="#fff" />
    <rect y="6.67" width="18" height="1.33" fill="#fff" />
    <rect y="9.33" width="18" height="1.33" fill="#fff" />
    <rect width="7.2" height="6.5" fill="#3C3B6E" />
  </svg>
)

export const FlagJP: React.FC = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 border border-current/15 shadow-xs">
    <rect width="18" height="12" fill="#FFFFFF" />
    <circle cx="9" cy="6" r="3.4" fill="#BC002D" />
  </svg>
)

export const FlagCN: React.FC = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="12" fill="#DE2910" />
    <circle cx="3.8" cy="3.6" r="1.4" fill="#FFDE00" />
    <circle cx="6.5" cy="1.8" r="0.45" fill="#FFDE00" />
    <circle cx="7.6" cy="3.0" r="0.45" fill="#FFDE00" />
    <circle cx="7.4" cy="4.6" r="0.45" fill="#FFDE00" />
    <circle cx="6.3" cy="5.8" r="0.45" fill="#FFDE00" />
  </svg>
)

export const FlagKR: React.FC = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 border border-current/15 shadow-xs">
    <rect width="18" height="12" fill="#FFFFFF" />
    <circle cx="9" cy="6" r="2.8" fill="#CD2E3A" />
    <path d="M6.2 6 A2.8 2.8 0 0 0 11.8 6 A1.4 1.4 0 0 1 9 6 A1.4 1.4 0 0 0 6.2 6 Z" fill="#0047A0" />
  </svg>
)

export const FlagBR: React.FC = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" className="rounded-[2px] overflow-hidden shrink-0 shadow-xs">
    <rect width="18" height="12" fill="#009739" />
    <polygon points="9,1.4 16.2,6 9,10.6 1.8,6" fill="#FEDD00" />
    <circle cx="9" cy="6" r="2.2" fill="#012169" />
  </svg>
)

export const LockIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
)
