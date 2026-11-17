/**
 * src/lib/sizeCalcI18n.tsx
 * Локализация (RU / UK / DE / EN), SVG-флаги и кроссплатформенный виброотклик (iOS + Android).
 */
import React from 'react'

export type SupportedLang = 'ru' | 'uk' | 'de' | 'en'

export const PRO_PRICE_STARS = 150

let sharedAudioCtx: AudioContext | null = null
let lastHapticTimestamp = 0

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

  try {
    const hf = win.Telegram?.WebApp?.HapticFeedback
    if (hf?.impactOccurred) {
      hf.impactOccurred(style)
    } else if (hf?.selectionChanged) {
      hf.selectionChanged()
    }
  } catch {}

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
  reserveActiveBadge: string
  baseFitBadge: string
  annotationFootMode: (eu: string, ua: string, footMm: number, insoleMm: number, addMm: number) => string
  annotationInsoleMode: (insoleMm: number, addMm: number, footMm: number, eu: string, ua: string) => string
  men: string
  women: string
  kids: string
  cmLabel: string
  mmLabel: string
  insoleLabel: string
  allowanceLabel: string
  widthLabel: string
  girthLabel: string
  footTag: string
  ballTag: string
  subUa: string
  subEu: string
  subUs: string
  subUk: string
  subJp: string
  subBrCn: string
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
  guideFootTitle: string
  measureGuide1: string
  measureGuide2: string
  guideInsoleTitle: string
  measureGuide3: string
  measureTip: string
  openInTelegramErr: string
  paymentCancelledErr: string
  serverErrPrefix: string
}

export const I18N: Record<SupportedLang, TranslationBundle> = {
  ru: {
    back: 'Назад',
    subtitle: 'Cordwainer Laser Caliper',
    modeFoot: 'По стопе',
    modeInsole: 'По стельке',
    footLengthLabel: 'Длина стопы',
    insoleInputLabel: 'Длина стельки',
    yourSizeLabel: 'Ваш размер',
    reserveActiveBadge: 'С запасом (зима / бег)',
    baseFitBadge: 'Основной размер',
    annotationFootMode: (eu, ua, footMm, insoleMm, addMm) =>
      `Режим «По стопе»: для ноги ${footMm} мм ваш размер ${ua} UA (${eu} EU). Запас +${addMm} мм (стелька ${insoleMm} мм) уже внутри обуви.`,
    annotationInsoleMode: (insoleMm, addMm, footMm, eu, ua) =>
      `Режим «По стельке»: из длины стельки ${insoleMm} мм вычтен запас −${addMm} мм (стопа ${footMm} мм) → ваш размер ${ua} UA (${eu} EU).`,
    men: 'Мужской',
    women: 'Женский',
    kids: 'Детский',
    cmLabel: 'см',
    mmLabel: 'мм',
    insoleLabel: 'Стелька',
    allowanceLabel: 'Запас',
    widthLabel: 'Ширина пучков',
    girthLabel: 'Обхват пучков',
    footTag: 'Стопа',
    ballTag: 'Обхват M1–M5',
    subUa: 'Украина',
    subEu: 'Европа',
    subUs: 'США',
    subUk: 'Британия',
    subJp: 'См (мм) на язычке',
    subBrCn: 'Бразилия · Китай',
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
    proTitle: 'PRO Паспорт Колодки & Все страны',
    proDesc: 'США (US), Британия (UK), Япония (JP/CM), Бразилия, Китай, полнота E–K и шпаргалка брендов.',
    proBtn: `ОТКРЫТЬ PRO ДОСТУП · ${PRO_PRICE_STARS} ⭐️`,
    proActiveBadge: 'PRO АКТИВЕН',
    loading: 'ПРОВЕРКА ТРАНЗАКЦИИ...',
    guideFootTitle: 'Способ 1 — Замер по стопе (рекомендуется)',
    measureGuide1: 'Встаньте на лист бумаги в носках вечером, отметьте пятку и самый длинный палец вертикальным карандашом (90°). Например, 270 мм (27 см) = 42 UA / 42.5 EU.',
    measureGuide2: 'Для зимней и беговой обуви включите во вкладке «Колодка» режим «Зима / Мех» или «Бег» — калькулятор сам добавит запас (+0.5 см → 42.5 / 43).',
    guideInsoleTitle: 'Способ 2 — Замер по вынутой стельке',
    measureGuide3: 'Если вы измерили линейкой вынутую стельку (например, 280–285 мм), переключите кнопку сверху на «По стельке» — калькулятор сам вычтет припуск и покажет точный размер.',
    measureTip: 'При заказе онлайн всегда сверяйтесь с графой CM или JP на язычке (27.0 см на лето/демисезон, 27.5 см на зиму и бег).',
    openInTelegramErr: 'Откройте мини-приложение внутри Telegram для оплаты Stars.',
    paymentCancelledErr: 'Оплата была отменена или не завершена.',
    serverErrPrefix: 'Ошибка соединения',
  },
  uk: {
    back: 'Назад',
    subtitle: 'Cordwainer Laser Caliper',
    modeFoot: 'По стопі',
    modeInsole: 'По устілці',
    footLengthLabel: 'Довжина стопи',
    insoleInputLabel: 'Довжина устілки',
    yourSizeLabel: 'Ваш розмір',
    reserveActiveBadge: 'Із запасом (зима / біг)',
    baseFitBadge: 'Основний розмір',
    annotationFootMode: (eu, ua, footMm, insoleMm, addMm) =>
      `Режим «По стопі»: для ноги ${footMm} мм ваш розмір ${ua} UA (${eu} EU). Запас +${addMm} мм (устілка ${insoleMm} мм) уже всередині взуття.`,
    annotationInsoleMode: (insoleMm, addMm, footMm, eu, ua) =>
      `Режим «По устілці»: з довжини устілки ${insoleMm} мм віднято запас −${addMm} мм (стопа ${footMm} мм) → ваш розмір ${ua} UA (${eu} EU).`,
    men: 'Чоловічий',
    women: 'Жіночий',
    kids: 'Дитячий',
    cmLabel: 'см',
    mmLabel: 'мм',
    insoleLabel: 'Устілка',
    allowanceLabel: 'Запас',
    widthLabel: 'Ширина пучків',
    girthLabel: 'Обхват пучків',
    footTag: 'Стопа',
    ballTag: 'Обхват M1–M5',
    subUa: 'Україна',
    subEu: 'Європа',
    subUs: 'США',
    subUk: 'Британія',
    subJp: 'См (мм) на язичку',
    subBrCn: 'Бразилія · Китай',
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
    proTitle: 'PRO Паспорт Колодки & Усі країни',
    proDesc: 'США (US), Британія (UK), Японія (JP/CM), Бразилія, Китай, повнота E–K та шпаргалка брендів.',
    proBtn: `ВІДКРИТИ PRO ДОСТУП · ${PRO_PRICE_STARS} ⭐️`,
    proActiveBadge: 'PRO АКТИВНИЙ',
    loading: 'ПЕРЕВІРКА ТРАНЗАКЦІЇ...',
    guideFootTitle: 'Спосіб 1 — Замір по стопі (рекомендовано)',
    measureGuide1: 'Станьте на аркуш паперу в шкарпетках увечері, позначте п’яту та найдовший палець вертикальним олівцем (90°). Наприклад, 270 мм (27 см) = 42 UA / 42.5 EU.',
    measureGuide2: 'Для зимового та бігового взуття увімкніть у вкладці «Колодка» режим «Зима / Хутро» або «Біг» — калькулятор сам додасть запас (+0.5 см → 42.5 / 43).',
    guideInsoleTitle: 'Спосіб 2 — Замір по вийнятій устілці',
    measureGuide3: 'Якщо ви виміряли лінійкою вийняту устілку (наприклад, 280–285 мм), перемкніть кнопку зверху на «По устілці» — калькулятор сам відніме припуск і покаже точний розмір.',
    measureTip: 'Під час замовлення онлайн завжди звіряйтеся з графою CM або JP на язичку (27.0 см на літо/демісезон, 27.5 см на зиму та біг).',
    openInTelegramErr: 'Відкрийте міні-додаток усередині Telegram для оплати Stars.',
    paymentCancelledErr: 'Оплату було скасовано або не завершено.',
    serverErrPrefix: 'Помилка з’єднання',
  },
  de: {
    back: 'Zurück',
    subtitle: 'Cordwainer Laser Caliper',
    modeFoot: 'Fußlänge',
    modeInsole: 'Innensohle',
    footLengthLabel: 'Fußlänge',
    insoleInputLabel: 'Sohlenlänge',
    yourSizeLabel: 'Ihre Größe',
    reserveActiveBadge: 'Mit Reserve (Winter / Run)',
    baseFitBadge: 'Basisgröße',
    annotationFootMode: (eu, ua, footMm, insoleMm, addMm) =>
      `Modus „Fußlänge“: Für ${footMm} mm Fuß ist Ihre Größe ${eu} EU (${ua} UA). +${addMm} mm Zugabe (${insoleMm} mm Sohle) ist bereits integriert.`,
    annotationInsoleMode: (insoleMm, addMm, footMm, eu, ua) =>
      `Modus „Innensohle“: Von ${insoleMm} mm Sohlenlänge wurden −${addMm} mm Zugabe abgezogen (${footMm} mm Fuß) → Größe ${eu} EU (${ua} UA).`,
    men: 'Herren',
    women: 'Damen',
    kids: 'Kinder',
    cmLabel: 'cm',
    mmLabel: 'mm',
    insoleLabel: 'Innensohle',
    allowanceLabel: 'Zugabe',
    widthLabel: 'Ballenbreite',
    girthLabel: 'Ballenumfang',
    footTag: 'Fuß',
    ballTag: 'Umfang M1–M5',
    subUa: 'Ukraine',
    subEu: 'Europa',
    subUs: 'USA',
    subUk: 'Großbritannien',
    subJp: 'cm (mm) Etikett',
    subBrCn: 'Brasilien · China',
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
    proTitle: 'PRO Leisten-Pass & Alle Normen',
    proDesc: 'USA (US), UK, Japan (JP/CM), Brasilien, China, Schuhweite E–K und Marken-Matrix.',
    proBtn: `PRO FREISCHALTEN · ${PRO_PRICE_STARS} ⭐️`,
    proActiveBadge: 'PRO AKTIV',
    loading: 'TRANSAKTION LÄUFT...',
    guideFootTitle: 'Methode 1 — Fußlänge messen (empfohlen)',
    measureGuide1: 'Stellen Sie sich abends in Socken auf Papier und markieren Sie Ferse und längsten Zeh (90°). Z. B. 270 mm (27 cm) = 42.5 EU / 42 UA.',
    measureGuide2: 'Für Winter- und Laufschuhe wählen Sie unter „Leisten“ den Modus „Winter / Pelz“ oder „Running“ (+0,5 cm Reserve → 43 EU).',
    guideInsoleTitle: 'Methode 2 — Herausgenommene Innensohle messen',
    measureGuide3: 'Wenn Sie eine Innensohle gemessen haben (z. B. 280–285 mm), schalten Sie oben auf „Innensohle“ um — die Zugabe wird automatisch abgezogen.',
    measureTip: 'Achten Sie beim Online-Kauf immer auf die Angabe CM oder JP im Schuhetikett (27.0 cm regulär, 27.5 cm für Winter/Running).',
    openInTelegramErr: 'Bitte öffnen Sie die Mini-App in Telegram für Stars-Zahlungen.',
    paymentCancelledErr: 'Zahlung wurde abgebrochen oder nicht abgeschlossen.',
    serverErrPrefix: 'Verbindungsfehler',
  },
  en: {
    back: 'Back',
    subtitle: 'Cordwainer Laser Caliper',
    modeFoot: 'By Foot',
    modeInsole: 'By Insole',
    footLengthLabel: 'Foot Length',
    insoleInputLabel: 'Insole Length',
    yourSizeLabel: 'Your Size',
    reserveActiveBadge: 'With Reserve (Winter / Run)',
    baseFitBadge: 'Standard Size',
    annotationFootMode: (eu, ua, footMm, insoleMm, addMm) =>
      `Foot Mode: For a ${footMm} mm foot, your size is ${eu} EU (${ua} UA). The +${addMm} mm allowance (${insoleMm} mm insole) is built-in.`,
    annotationInsoleMode: (insoleMm, addMm, footMm, eu, ua) =>
      `Insole Mode: Subtracted −${addMm} mm allowance from ${insoleMm} mm insole (${footMm} mm foot) → your size is ${eu} EU (${ua} UA).`,
    men: 'Men',
    women: 'Women',
    kids: 'Kids',
    cmLabel: 'cm',
    mmLabel: 'mm',
    insoleLabel: 'Insole',
    allowanceLabel: 'Allowance',
    widthLabel: 'Ball Width',
    girthLabel: 'Ball Girth',
    footTag: 'Foot',
    ballTag: 'Girth M1–M5',
    subUa: 'Ukraine',
    subEu: 'Europe',
    subUs: 'USA',
    subUk: 'United Kingdom',
    subJp: 'cm (mm) Tag',
    subBrCn: 'Brazil · China',
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
    proTitle: 'PRO Last Passport & Global Sizes',
    proDesc: 'Unlock US, UK, Japan (JP/CM), Brazil, China, E–K width & ball girth in mm, and brand matrix.',
    proBtn: `UNLOCK PRO ACCESS · ${PRO_PRICE_STARS} ⭐️`,
    proActiveBadge: 'PRO ACTIVE',
    loading: 'VERIFYING...',
    guideFootTitle: 'Method 1 — Measure Your Foot (Recommended)',
    measureGuide1: 'Stand on paper in socks in the evening and mark heel and longest toe (90°). E.g. 270 mm (27 cm) = 42.5 EU / 9 US.',
    measureGuide2: 'For winter boots or running shoes, select "Winter Fur" or "Run / Trek" in Last Fit — it automatically adds reserve (+0.5 cm → 43 EU / 9.5 US).',
    guideInsoleTitle: 'Method 2 — Measure a Removable Insole',
    measureGuide3: 'If you measured a shoe insole with a ruler (e.g. 280–285 mm), switch the top button to "By Insole" — the allowance is subtracted automatically.',
    measureTip: 'When shopping online, always check the CM or JP box on the shoe tongue label (27.0 cm regular, 27.5 cm for winter/running).',
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
