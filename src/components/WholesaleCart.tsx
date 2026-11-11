/**
 * @file src/components/WholesaleCart.tsx
 * @description Компонент оптовой накладной (корзины), расчёта логистики Новой Почты
 * и защищённого личного архива отправленных заказов («Мои заказы»).
 *
 * ЧТО ИСПРАВЛЕНО И ДОБАВЛЕНО:
 * 1. ДВУХФАКТОРНАЯ ЗАЩИТА АРХИВА (`TelegramOtpAuthBox`): На внешнем сайте (www.cordwainer.app)
 *    доступ к истории заказов по номеру телефона защищён 4-значным кодом в Telegram (@Cordwainer_bot).
 *    Конкуренты больше не могут пробить чужие накладные по номеру телефона.
 * 2. АВТООЧИСТКА НАКЛАДНОЙ: После успешной отправки заказа руководителю текущая корзина
 *    полностью очищается во всех окнах приложения.
 * 3. АРХИВ «МОИ ЗАКАЗЫ»: Все отправленные накладные сохраняются локально и синхронизируются с базой Neon.
 */

import {
  useState,
  useEffect,
  useRef,
  type CSSProperties,
} from 'react';
import { type CartItem, type SizeKey } from '../data/catalog';
import {
  ManagersContactCard,
  triggerHaptic,
  playAppSound,
  preloadAppSounds,
} from './ManagersContactCard';
import { getWholesalePriceByModel } from './wholesale/wholesaleData';
import {
  getUniversalClientUid,
  normalizePhoneForSearch,
  getLocalArchivedOrders,
  saveOrderToLocalArchive,
  fetchAndMergeOrderHistory,
  clearWholesaleCartEverywhere,
  type ArchivedOrder,
} from './wholesale/orderHistoryStore';
import { TelegramOtpAuthBox } from './wholesale/TelegramOtpAuthBox';
import type { Lang } from '../App';

type WholesaleCartProps = {
  items: CartItem[];
  lang: Lang;
  theme?: 'light' | 'dark';
  isDark?: boolean;
  onUpdateQuantity: (uid: string, newBoxesCount: number) => void;
  onRemove: (uid: string) => void;
  onClear: () => void;
  onClose: () => void;
};

type CityOption = {
  name: string;
  uaName: string;
  deName: string;
  fullLabel: string;
  fullLabelRu?: string;
  fullLabelDe?: string;
  ref: string;
  area?: string;
};

type WarehouseOption = {
  ref: string;
  number: string;
  description: string;
};

type SavedRecipientData = {
  selectedCity: CityOption;
  cityQuery: string;
  branchOrComment: string;
  clientName: string;
  clientPhone: string;
  orderComment?: string;
};

const RECIPIENT_STORAGE_KEY = 'cardio_b2b_recipient_v1';
const INVOICE_META_STORAGE_KEY = 'cardio_b2b_invoice_meta_v1';
const SIZES_ORDER: SizeKey[] = [40, 41, 42, 43, 44, 45];

const VALID_UA_OPERATOR_CODES = new Set([
  '039', '050', '063', '066', '067', '068',
  '073', '075', '077', '089', '091', '092',
  '093', '094', '095', '096', '097', '098', '099',
]);

const POPULAR_CITIES: CityOption[] = [
  {
    name: 'Киев',
    uaName: 'Київ',
    deName: 'Kyjiw',
    fullLabel: 'м. Київ (Київська обл.)',
    fullLabelRu: 'г. Киев (Киевская обл.)',
    fullLabelDe: 'Kyjiw (Oblast Kyjiw)',
    ref: '8d5a980d-391c-11dd-90d9-001a92567626',
    area: 'Київська',
  },
  {
    name: 'Днепр',
    uaName: 'Дніпро',
    deName: 'Dnipro',
    fullLabel: 'м. Дніпро (Дніпропетровська обл.)',
    fullLabelRu: 'г. Днепр (Днепропетровская обл.)',
    fullLabelDe: 'Dnipro (Oblast Dnipropetrowsk)',
    ref: 'db5c88f0-391c-11dd-90d9-001a92567626',
    area: 'Дніпропетровська',
  },
  {
    name: 'Одесса',
    uaName: 'Одеса',
    deName: 'Odessa',
    fullLabel: 'м. Одеса (Одеська обл.)',
    fullLabelRu: 'г. Одесса (Одесская обл.)',
    fullLabelDe: 'Odessa (Oblast Odessa)',
    ref: 'db5c88d0-391c-11dd-90d9-001a92567626',
    area: 'Одеська',
  },
  {
    name: 'Львов',
    uaName: 'Львів',
    deName: 'Lwiw',
    fullLabel: 'м. Львів (Львівська обл.)',
    fullLabelRu: 'г. Львов (Львовская обл.)',
    fullLabelDe: 'Lwiw (Oblast Lwiw)',
    ref: 'db5c88f5-391c-11dd-90d9-001a92567626',
    area: 'Львівська',
  },
  {
    name: 'Харьков',
    uaName: 'Харків',
    deName: 'Charkiw',
    fullLabel: 'м. Харків (Харківська обл.)',
    fullLabelRu: 'г. Харьков (Харьковская обл.)',
    fullLabelDe: 'Charkiw (Oblast Charkiw)',
    ref: 'db5c88e0-391c-11dd-90d9-001a92567626',
    area: 'Харківська',
  },
  {
    name: 'Полтава',
    uaName: 'Полтава',
    deName: 'Poltawa',
    fullLabel: 'м. Полтава (Полтавська обл.)',
    fullLabelRu: 'г. Полтава (Полтавская обл.)',
    fullLabelDe: 'Poltawa (Oblast Poltawa)',
    ref: 'db5c8892-391c-11dd-90d9-001a92567626',
    area: 'Полтавська',
  },
  {
    name: 'Запорожье',
    uaName: 'Запоріжжя',
    deName: 'Saporischschja',
    fullLabel: 'м. Запоріжжя (Запорізька обл.)',
    fullLabelRu: 'г. Запорожье (Запорожская обл.)',
    fullLabelDe: 'Saporischschja (Oblast Saporischschja)',
    ref: 'db5c88c6-391c-11dd-90d9-001a92567626',
    area: 'Запорізька',
  },
  {
    name: 'Винница',
    uaName: 'Вінниця',
    deName: 'Winnyzja',
    fullLabel: 'м. Вінниця (Вінницька обл.)',
    fullLabelRu: 'г. Винница (Винницкая обл.)',
    fullLabelDe: 'Winnyzja (Oblast Winnyzja)',
    ref: 'db5c88de-391c-11dd-90d9-001a92567626',
    area: 'Вінницька',
  },
];

const SHOE_TERMS_MAP: Record<string, { uk: string; de: string }> = {
  'черный': { uk: 'Чорний', de: 'Schwarz' },
  'чёрный': { uk: 'Чорний', de: 'Schwarz' },
  'белый': { uk: 'Білий', de: 'Weiß' },
  'коричневый': { uk: 'Коричневий', de: 'Braun' },
  'темно-коричневый': { uk: 'Темно-коричневий', de: 'Dunkelbraun' },
  'светло-коричневый': { uk: 'Світло-коричневий', de: 'Hellbraun' },
  'синий': { uk: 'Синій', de: 'Blau' },
  'темно-синий': { uk: 'Темно-синій', de: 'Dunkelblau' },
  'серый': { uk: 'Сірий', de: 'Grau' },
  'бежевый': { uk: 'Бежевий', de: 'Beige' },
  'рыжий': { uk: 'Рудий', de: 'Cognac' },
  'коньяк': { uk: 'Коньяк', de: 'Cognac' },
  'бордовый': { uk: 'Бордовий', de: 'Bordeaux' },
  'зеленый': { uk: 'Зелений', de: 'Grün' },
  'хаки': { uk: 'Хакі', de: 'Khaki' },
  'оливковый': { uk: 'Оливковий', de: 'Oliv' },
  'комбинированный': { uk: 'Комбінований', de: 'Kombiniert' },
  'кожа': { uk: 'Шкіра', de: 'Leder' },
  'замша': { uk: 'Замша', de: 'Wildleder' },
  'нубук': { uk: 'Нубук', de: 'Nubuk' },
  'текстиль': { uk: 'Текстиль', de: 'Textil' },
  'сетка': { uk: 'Сітка', de: 'Mesh' },
  'перфорация': { uk: 'Перфорація', de: 'Perforiert' },
  'кроссовки': { uk: 'Кросівки', de: 'Sneaker' },
  'кеды': { uk: 'Кеди', de: 'Sneaker' },
  'туфли': { uk: 'Туфлі', de: 'Halbschuhe' },
  'ботинки': { uk: 'Черевики', de: 'Stiefel' },
  'лоферы': { uk: 'Лофери', de: 'Loafer' },
  'мокасины': { uk: 'Мокасини', de: 'Mokassins' },
  'слипоны': { uk: 'Сліпони', de: 'Slipper' },
  'топсайдеры': { uk: 'Топсайдери', de: 'Bootsschuhe' },
  'дерби': { uk: 'Дербі', de: 'Derby' },
  'оксфорды': { uk: 'Оксфорди', de: 'Oxford' },
  'челси': { uk: 'Челсі', de: 'Chelsea Boots' },
  'сандалии': { uk: 'Сандалі', de: 'Sandalen' },
  'классика': { uk: 'Класика', de: 'Klassik' },
  'комфорт': { uk: 'Комфорт', de: 'Komfort' },
  'спорт': { uk: 'Спорт', de: 'Sport' },
  'повседневные': { uk: 'Повсякденні', de: 'Casual' },
  'весна-осень': { uk: 'Весна-Осінь', de: 'Frühling-Herbst' },
  'лето': { uk: 'Літо', de: 'Sommer' },
  'зима': { uk: 'Зима', de: 'Winter' },
  'демисезон': { uk: 'Демісезон', de: 'Übergang' },
};

function translateCatalogText(raw: string | undefined, lang: Lang): string {
  if (!raw) return '';
  if (lang === 'ru') return raw;
  const trimmed = raw.trim();
  const direct = SHOE_TERMS_MAP[trimmed.toLowerCase()];
  if (direct) return direct[lang];

  return trimmed
    .split(/(\s*[•/,+()-]\s*)/)
    .map((part) => {
      const lookup = SHOE_TERMS_MAP[part.trim().toLowerCase()];
      return lookup ? lookup[lang] : part;
    })
    .join('');
}

type ThemePalette = {
  bg: string;
  surface: string;
  fieldBg: string;
  surfaceActive: string;
  ink: string;
  inkMuted: string;
  inkLight: string;
  border: string;
  focusBorder: string;
  danger: string;
  dangerBg: string;
  dangerFieldBg: string;
  accentGreen: string;
  successBg: string;
  primaryBtnBg: string;
  primaryBtnText: string;
  photoBg: string;
  serif: string;
  sans: string;
};

const LIGHT_THEME: ThemePalette = {
  bg: '#F2EFE9',
  surface: '#F8F6F1',
  fieldBg: '#FFFFFF',
  surfaceActive: '#EAE5DC',
  ink: '#161514',
  inkMuted: '#6E6A63',
  inkLight: '#9A958C',
  border: '#DCD7CC',
  focusBorder: '#161514',
  danger: '#9E2A2B',
  dangerBg: '#FDF2F2',
  dangerFieldBg: '#FFF5F5',
  accentGreen: '#1E4620',
  successBg: '#EFF5F0',
  primaryBtnBg: '#161514',
  primaryBtnText: '#FFFFFF',
  photoBg: '#F2EFE9',
  serif: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
  sans: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
};

const DARK_THEME: ThemePalette = {
  bg: '#0A0A0A',
  surface: '#141414',
  fieldBg: '#1C1C1E',
  surfaceActive: '#2A2927',
  ink: '#F4EFE6',
  inkMuted: '#A1A1AA',
  inkLight: '#71717A',
  border: '#2E2D2A',
  focusBorder: '#C5A880',
  danger: '#F87171',
  dangerBg: '#2A1415',
  dangerFieldBg: '#281516',
  accentGreen: '#34D399',
  successBg: '#132615',
  primaryBtnBg: '#F4EFE6',
  primaryBtnText: '#141413',
  photoBg: '#EAE5DC',
  serif: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
  sans: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
};

/**
 * Единая функция чтения и синхронизации темы всего приложения
 */
export function detectDarkMode(propTheme?: 'light' | 'dark', propIsDark?: boolean): boolean {
  if (typeof propIsDark === 'boolean') return propIsDark;
  if (propTheme === 'dark') return true;
  if (propTheme === 'light') return false;
  if (typeof window === 'undefined') return false;

  try {
    const html = document.documentElement;
    const body = document.body;
    if (
      html.classList.contains('dark') ||
      body.classList.contains('dark') ||
      html.getAttribute('data-theme') === 'dark' ||
      body.getAttribute('data-theme') === 'dark'
    ) {
      return true;
    }
    if (
      html.classList.contains('light') ||
      body.classList.contains('light') ||
      html.getAttribute('data-theme') === 'light' ||
      body.getAttribute('data-theme') === 'light'
    ) {
      return false;
    }

    const keys = ['theme', 'app_theme', 'cardio_theme'];
    for (const k of keys) {
      const val = localStorage.getItem(k);
      if (val === 'dark') return true;
      if (val === 'light') return false;
    }
  } catch {}

  return false;
}

export function syncGlobalAppTheme(isDark: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const mode = isDark ? 'dark' : 'light';
    const html = document.documentElement;
    const body = document.body;

    html.classList.toggle('dark', isDark);
    html.classList.toggle('light', !isDark);
    html.setAttribute('data-theme', mode);

    if (body) {
      body.classList.toggle('dark', isDark);
      body.classList.toggle('light', !isDark);
      body.setAttribute('data-theme', mode);
    }

    localStorage.setItem('theme', mode);
    localStorage.setItem('app_theme', mode);
    localStorage.setItem('cardio_theme', mode);

    window.dispatchEvent(new CustomEvent('cardio-theme-change', { detail: { theme: mode, isDark } }));
    window.dispatchEvent(new Event('storage'));
  } catch {}
}

type InvoiceMeta = {
  invoiceNumber: string;
  dateFormatted: string;
};

function resolveActiveLang(propLang?: Lang): Lang {
  if (propLang && ['ru', 'uk', 'de'].includes(propLang)) {
    return propLang;
  }
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('app_lang');
      if (saved === 'ru' || saved === 'uk' || saved === 'de') return saved;
      if (saved === 'ua') return 'uk';
    } catch {}
  }
  return 'ru';
}

function getCityFullLabel(city: CityOption, lang: Lang): string {
  const preset = POPULAR_CITIES.find((c) => c.ref === city.ref);
  const target = preset || city;
  if (lang === 'de') return target.fullLabelDe || target.deName || target.fullLabel;
  if (lang === 'ru') return target.fullLabelRu || target.fullLabel;
  return target.fullLabel;
}

function isMatchingCityLabel(query: string, city: CityOption): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const preset = POPULAR_CITIES.find((c) => c.ref === city.ref);
  const candidates = [
    city.fullLabel,
    city.fullLabelRu,
    city.fullLabelDe,
    preset?.fullLabel,
    preset?.fullLabelRu,
    preset?.fullLabelDe,
  ].filter(Boolean) as string[];
  return candidates.some((label) => label.toLowerCase() === q);
}

function getOrCreateInvoiceMeta(forceNew = false): InvoiceMeta {
  if (!forceNew) {
    try {
      const saved = sessionStorage.getItem(INVOICE_META_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as InvoiceMeta;
    } catch {}
  }
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const fullYear = now.getFullYear();
  const secondsToday = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const timePart = String(secondsToday % 100).padStart(2, '0');
  const randomPart = String(Math.floor(10 + Math.random() * 90));

  const meta: InvoiceMeta = {
    invoiceNumber: `CRD-${dd}${mm}${yy}-${timePart}${randomPart}`,
    dateFormatted: `${dd}.${mm}.${fullYear}`,
  };

  try {
    sessionStorage.setItem(INVOICE_META_STORAGE_KEY, JSON.stringify(meta));
  } catch {}
  return meta;
}

function extractLocalPhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('380')) digits = digits.slice(2);
  else if (digits.startsWith('38')) digits = digits.slice(2);
  else if (digits.startsWith('80')) digits = digits.slice(1);
  else if (!digits.startsWith('0')) digits = '0' + digits;
  return digits.slice(0, 10);
}

function formatUkrainePhone(raw: string): string {
  const digits = extractLocalPhoneDigits(raw);
  if (!digits) return '';
  let result = '+38 (' + digits.slice(0, 3);
  if (digits.length > 3) result += ') ' + digits.slice(3, 6);
  if (digits.length > 6) result += '-' + digits.slice(6, 8);
  if (digits.length > 8) result += '-' + digits.slice(8, 10);
  return result;
}

function validateUkrainePhone(raw: string, lang: Lang): { isValid: boolean; errorHint: string | null } {
  const digits = extractLocalPhoneDigits(raw);
  if (digits.length === 0) return { isValid: false, errorHint: null };

  if (digits.length >= 3) {
    const operatorCode = digits.slice(0, 3);
    if (!VALID_UA_OPERATOR_CODES.has(operatorCode)) {
      const hints: Record<Lang, string> = {
        ru: `Некорректный код оператора (${operatorCode}). Пример: 067, 050, 063, 097`,
        uk: `Некоректний код оператора (${operatorCode}). Приклад: 067, 050, 063, 097`,
        de: `Ungültiger Betreibercode (${operatorCode}). Bsp.: 067, 050, 063, 097`,
      };
      return { isValid: false, errorHint: hints[lang] || hints.ru };
    }
  }

  if (digits.length < 10) {
    const hints: Record<Lang, string> = {
      ru: 'Введите номер полностью (10 цифр, например: 067 123-45-67)',
      uk: 'Введіть номер повністю (10 цифр, наприклад: 067 123-45-67)',
      de: 'Nummer vollständig eingeben (10 Ziffern, Bsp.: 067 123-45-67)',
    };
    return { isValid: false, errorHint: hints[lang] || hints.ru };
  }

  const subscriberPart = digits.slice(3);
  if (/^(\d)\1{6}$/.test(subscriberPart)) {
    const hints: Record<Lang, string> = {
      ru: 'Укажите действующий номер телефона получателя',
      uk: 'Вкажіть діючий номер телефону отримувача',
      de: 'Geben Sie eine gültige Empfängernummer an',
    };
    return { isValid: false, errorHint: hints[lang] || hints.ru };
  }

  return { isValid: true, errorHint: null };
}

function getDynamicFormulaText(item: CartItem, lang: Lang): string {
  if (item.orderMode === 'sample') {
    return lang === 'de'
      ? `Testmuster (1 Paar) — Gr. ${item.sampleSize}`
      : lang === 'uk'
      ? `Тестовий зразок (1 пара) — р. ${item.sampleSize}`
      : `Тестовый образец (1 пара) — р. ${item.sampleSize}`;
  }
  const breakdown = SIZES_ORDER.filter((sz) => (item.sizeRun[sz] || 0) > 0)
    .map((sz) => {
      const count = (item.sizeRun[sz] || 0) * item.boxesCount;
      return lang === 'de' ? `Gr.${sz}(${count})` : `${sz}р.(${count})`;
    })
    .join(' • ');

  return lang === 'de'
    ? `Kisten ×${item.boxesCount}: ${breakdown}`
    : lang === 'uk'
    ? `Ростовок ×${item.boxesCount}: ${breakdown}`
    : `Ростовок ×${item.boxesCount}: ${breakdown}`;
}

async function callNovaPoshta(modelName: string, calledMethod: string, methodProperties: Record<string, unknown>) {
  try {
    const res = await fetch('/api/np', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelName, calledMethod, methodProperties }),
    });
    const data = await res.json();
    if (data?.success) return data;
  } catch {}
  return null;
}

function buildSearchVariants(raw: string): string[] {
  const clean = raw.trim();
  const lower = clean.toLowerCase();
  const variants = new Set<string>([clean]);
  if (lower.includes('аив') || lower.includes('яив') || lower.includes('иив')) {
    variants.add(clean.replace(/([аяиії])ив/gi, '$1їв'));
  }
  if (lower.includes('и')) {
    variants.add(clean.replace(/и/gi, 'і'));
    variants.add(clean.replace(/ив$/i, 'їв'));
  }
  if (lower.startsWith('никола')) variants.add('Миколаїв');
  return Array.from(variants);
}

function loadSavedRecipient(): SavedRecipientData | null {
  try {
    const raw = localStorage.getItem(RECIPIENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedRecipientData;
    if (parsed?.selectedCity?.ref) {
      const matchedPopular = POPULAR_CITIES.find((c) => c.ref === parsed.selectedCity.ref);
      if (matchedPopular) {
        parsed.selectedCity = matchedPopular;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function WholesaleCart({
  items,
  lang,
  theme,
  isDark: propIsDark,
  onUpdateQuantity,
  onRemove,
  onClear,
  onClose,
}: WholesaleCartProps) {
  const safeLang: Lang = resolveActiveLang(lang);
  const [darkActive, setDarkActive] = useState<boolean>(() =>
    detectDarkMode(theme, propIsDark)
  );

  // Вкладка: текущая накладная или архив «Мои заказы»
  const [activeTab, setActiveTab] = useState<'current' | 'archive'>('current');
  const [archivedOrders, setArchivedOrders] = useState<ArchivedOrder[]>(() =>
    getLocalArchivedOrders()
  );
  const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(null);
  const [copiedArchiveId, setCopiedArchiveId] = useState<string | null>(null);

  useEffect(() => {
    setDarkActive(detectDarkMode(theme, propIsDark));
  }, [theme, propIsDark]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncTheme = () => setDarkActive(detectDarkMode(theme, propIsDark));

    window.addEventListener('storage', syncTheme);
    window.addEventListener('cardio-theme-change', syncTheme);

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-theme'],
      });
    }

    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('cardio-theme-change', syncTheme);
      observer.disconnect();
    };
  }, [theme, propIsDark]);

  const THEME = darkActive ? DARK_THEME : LIGHT_THEME;

  const t = {
    ru: {
      back: '← Назад в каталог',
      clearCart: '✕ Очистить накладную',
      headerSub: 'CARDIO FOOTWEAR // ОПТОВЫЙ ЗАКАЗ',
      invoiceBadge: (num: string, date: string) => `№ ${num} от ${date}`,
      title: (count: number) => `Оптовая накладная (${count})`,
      archiveTitle: (count: number) => `Мои заказы (${count})`,
      tabCurrent: (count: number) => `Накладная (${count})`,
      tabArchive: (count: number) => `Мои заказы (${count})`,
      emptyText: 'В вашей текущей накладной нет выбранных моделей.',
      goToCatalog: 'Перейти в каталог →',
      openArchiveBtn: (count: number) => `📂 Открыть архив «Мои заказы» (${count})`,
      archiveEmpty: 'У вас пока нет доступных заказов. Подтвердите номер через Telegram выше или оформите новый заказ.',
      archiveShowDetails: 'Показать состав накладной ▼',
      archiveHideDetails: 'Скрыть состав ▲',
      archiveCopyBtn: 'Скопировать накладную',
      archiveCopied: '✓ Скопировано',
      archiveManagerLabel: 'Руководитель:',
      modelPrefix: '№',
      totalPairsLabel: 'Итого:',
      pairsUnit: 'пар',
      boxesLabel: 'Коробов',
      sectionLogistics: 'I. ДАННЫЕ ПОЛУЧАТЕЛЯ И ДОСТАВКА',
      sectionShipping: 'РЕКВИЗИТЫ ОТГРУЗКИ',
      fillRequired: 'Заполните обязательные поля:',
      cityPrompt: 'Населенный пункт:',
      citySub: 'Выберите город из быстрого списка или начните вводить название любого города, пгт или села:',
      labelCity: '1. Населенный пункт (город, пгт, село) *',
      cityPlaceholder: 'Введите название населенного пункта...',
      citySearchingText: 'Поиск...',
      cityNotFound: 'Не найдено',
      labelName: '2. Имя и Фамилия получателя *',
      namePlaceholder: 'Например: Александр Коваленко',
      labelPhone: '3. Телефон получателя *',
      phonePlaceholder: '+38 (0XX) XXX-XX-XX',
      labelWarehouse: '4. Отделение Новой Почты или адрес *',
      warehouseLoading: 'Загрузка доступных отделений...',
      warehousePlaceholder: (city: string) => `Выберите отделение или адрес (${city})`,
      labelComment: '5. Комментарий к заказу (необязательно)',
      commentPlaceholder: 'Пожелания по отправке, упаковке или срокам...',
      clearFieldBtn: '✕ Очистить',
      totalToShip: 'Всего к отгрузке:',
      boxesSuffix: (b: number) => `(~${b} кор.)`,
      deleteTitle: 'Удалить позицию',
      orderSentSuccess: (num: string, mgr: string) =>
        `✓ Накладная № ${num} успешно отправлена руководителю (${mgr})! Текущая корзина очищена, заказ сохранен в «Мои заказы».`,
      orderSendError: (err?: string) => `Ошибка отправки: ${err || 'Не удалось отправить заказ'}`,
      orderNetworkError: 'Ошибка соединения с сервером.',
      invHeader: (num: string) => `📦 ОПТОВАЯ НАКЛАДНАЯ № ${num}`,
      invDate: (date: string) => `📅 Дата: ${date} • CARDIO (Харьков)`,
      invModel: (idx: number, model: string, variant: string, color: string) => `${idx}. Модель № ${model}${variant} (${color})`,
      invModelTotal: (pairs: number) => `Итого по модели: ${pairs} пар`,
      invPositions: (count: number) => `📊 Позиций в заказе: ${count}`,
      invVolume: (pairs: number, boxes: number) => `👟 Общий объем: ${pairs} пар (мест: ~${boxes})`,
      invCity: (city: string) => `🏙 Населенный пункт: ${city}`,
      invBranch: (branch: string) => `📍 Отделение / Адрес: ${branch}`,
      invRecipient: (contact: string) => `👤 Получатель: ${contact}`,
      invComment: (comment: string) => `💬 Комментарий: ${comment}\n`,
      invFooter: 'Подтвердите наличие/сроки отшива и реквизиты.',
      phoneLabelShort: 'тел.',
    },
    uk: {
      back: '← Назад у каталог',
      clearCart: '✕ Очистити накладну',
      headerSub: 'CARDIO FOOTWEAR // ГУРТОВЕ ЗАМОВЛЕННЯ',
      invoiceBadge: (num: string, date: string) => `№ ${num} від ${date}`,
      title: (count: number) => `Гуртова накладна (${count})`,
      archiveTitle: (count: number) => `Мої замовлення (${count})`,
      tabCurrent: (count: number) => `Накладна (${count})`,
      tabArchive: (count: number) => `Мої замовлення (${count})`,
      emptyText: 'У вашій поточній накладній немає обраних моделей.',
      goToCatalog: 'Перейти до каталогу →',
      openArchiveBtn: (count: number) => `📂 Відкрити архів «Мої замовлення» (${count})`,
      archiveEmpty: 'У вас поки немає доступних замовлень. Підтвердіть номер через Telegram вище або оформіть нове замовлення.',
      archiveShowDetails: 'Показати склад накладної ▼',
      archiveHideDetails: 'Сховати склад ▲',
      archiveCopyBtn: 'Скопіювати накладну',
      archiveCopied: '✓ Скопійовано',
      archiveManagerLabel: 'Керівник:',
      modelPrefix: '№',
      totalPairsLabel: 'Разом:',
      pairsUnit: 'пар',
      boxesLabel: 'Коробів',
      sectionLogistics: 'I. ДАНІ ОТРИМУВАЧА ТА ДОСТАВКА',
      sectionShipping: 'РЕКВІЗИТИ ВІДВАНТАЖЕННЯ',
      fillRequired: 'Заповніть обов’язкові поля:',
      cityPrompt: 'Населений пункт:',
      citySub: 'Виберіть місто зі швидкого списку або почніть вводити назву будь-якого міста, смт чи села:',
      labelCity: '1. Населений пункт (місто, смт, село) *',
      cityPlaceholder: 'Почніть вводити назву...',
      citySearchingText: 'Пошук...',
      cityNotFound: 'Не знайдено',
      labelName: '2. Ім’я та Прізвище отримувача *',
      namePlaceholder: 'Наприклад: Олександр Коваленко',
      labelPhone: '3. Телефон отримувача *',
      phonePlaceholder: '+38 (0XX) XXX-XX-XX',
      labelWarehouse: '4. Відділення Нової Пошти або адреса *',
      warehouseLoading: 'Завантаження доступних відділень...',
      warehousePlaceholder: (city: string) => `Виберіть відділення або адресу (${city})`,
      labelComment: '5. Коментар до замовлення (необов’язково)',
      commentPlaceholder: 'Побажання щодо відправки, упаковки чи термінів...',
      clearFieldBtn: '✕ Очистити',
      totalToShip: 'Всього до відвантаження:',
      boxesSuffix: (b: number) => `(~${b} кор.)`,
      deleteTitle: 'Видалити позицію',
      orderSentSuccess: (num: string, mgr: string) =>
        `✓ Накладну № ${num} успішно надіслано керівнику (${mgr})! Поточний кошик очищено, замовлення збережено в «Мої замовлення».`,
      orderSendError: (err?: string) => `Помилка надсилання: ${err || 'Не вдалося надіслати замовлення'}`,
      orderNetworkError: 'Помилка з’єднання з сервером.',
      invHeader: (num: string) => `📦 ГУРТОВА НАКЛАДНА № ${num}`,
      invDate: (date: string) => `📅 Дата: ${date} • CARDIO (Харків)`,
      invModel: (idx: number, model: string, variant: string, color: string) => `${idx}. Модель № ${model}${variant} (${color})`,
      invModelTotal: (pairs: number) => `Разом по моделі: ${pairs} пар`,
      invPositions: (count: number) => `📊 Позицій у замовленні: ${count}`,
      invVolume: (pairs: number, boxes: number) => `👟 Загальний обсяг: ${pairs} пар (місць: ~${boxes})`,
      invCity: (city: string) => `🏙 Населений пункт: ${city}`,
      invBranch: (branch: string) => `📍 Відділення / Адреса: ${branch}`,
      invRecipient: (contact: string) => `👤 Отримувач: ${contact}`,
      invComment: (comment: string) => `💬 Коментар: ${comment}\n`,
      invFooter: 'Підтвердіть наявність/терміни відшиву та реквізити.',
      phoneLabelShort: 'тел.',
    },
    de: {
      back: '← Zurück zum Katalog',
      clearCart: '✕ Rechnung leeren',
      headerSub: 'CARDIO FOOTWEAR // GROSSHANDELSBESTELLUNG',
      invoiceBadge: (num: string, date: string) => `Nr. ${num} vom ${date}`,
      title: (count: number) => `Großhandelsrechnung (${count})`,
      archiveTitle: (count: number) => `Meine Bestellungen (${count})`,
      tabCurrent: (count: number) => `Rechnung (${count})`,
      tabArchive: (count: number) => `Archiv (${count})`,
      emptyText: 'Ihre aktuelle Rechnung enthält keine Modelle.',
      goToCatalog: 'Zum Katalog →',
      openArchiveBtn: (count: number) => `📂 Archiv «Meine Bestellungen» (${count})`,
      archiveEmpty: 'Noch keine Bestellungen verfügbar. Bitte Nummer oben via Telegram bestätigen.',
      archiveShowDetails: 'Rechnungsdetails anzeigen ▼',
      archiveHideDetails: 'Details ausblenden ▲',
      archiveCopyBtn: 'Rechnung kopieren',
      archiveCopied: '✓ Kopiert',
      archiveManagerLabel: 'Verkaufsleiter:',
      modelPrefix: 'Nr.',
      totalPairsLabel: 'Gesamt:',
      pairsUnit: 'Paar',
      boxesLabel: 'Kisten',
      sectionLogistics: 'I. EMPFÄNGERDATEN & VERSAND',
      sectionShipping: 'VERSANDDETAILS',
      fillRequired: 'Bitte füllen Sie Pflichtfelder aus:',
      cityPrompt: 'Ortschaft:',
      citySub: 'Wählen Sie eine Stadt aus oder geben Sie den Namen ein:',
      labelCity: '1. Ortschaft (Stadt, Gemeinde, Dorf) *',
      cityPlaceholder: 'Ortschaft eingeben...',
      citySearchingText: 'Suche...',
      cityNotFound: 'Nicht gefunden',
      labelName: '2. Vor- und Nachname des Empfängers *',
      namePlaceholder: 'z.B. Alexander Kowalenko',
      labelPhone: '3. Telefon des Empfängers *',
      phonePlaceholder: '+38 (0XX) XXX-XX-XX',
      labelWarehouse: '4. Filiale oder Lieferadresse *',
      warehouseLoading: 'Filialen werden geladen...',
      warehousePlaceholder: (city: string) => `Filiale wählen oder Adresse (${city})`,
      labelComment: '5. Kommentar zur Bestellung (optional)',
      commentPlaceholder: 'Wünsche zu Versand oder Verpackung...',
      clearFieldBtn: '✕ Löschen',
      totalToShip: 'Gesamtmenge:',
      boxesSuffix: (b: number) => `(~${b} Kist.)`,
      deleteTitle: 'Position löschen',
      orderSentSuccess: (num: string, mgr: string) =>
        `✓ Rechnung Nr. ${num} erfolgreich an ${mgr} gesendet! Warenkorb geleert und im Archiv gespeichert.`,
      orderSendError: (err?: string) => `Sendefehler: ${err || 'Bestellung konnte nicht gesendet werden'}`,
      orderNetworkError: 'Verbindungsfehler zum Server.',
      invHeader: (num: string) => `📦 GROSSHANDELSRECHNUNG Nr. ${num}`,
      invDate: (date: string) => `📅 Datum: ${date} • CARDIO (Charkiw)`,
      invModel: (idx: number, model: string, variant: string, color: string) => `${idx}. Modell Nr. ${model}${variant} (${color})`,
      invModelTotal: (pairs: number) => `Gesamt pro Modell: ${pairs} Paar`,
      invPositions: (count: number) => `📊 Positionen: ${count}`,
      invVolume: (pairs: number, boxes: number) => `👟 Gesamtmenge: ${pairs} Paar (Kisten: ~${boxes})`,
      invCity: (city: string) => `🏙 Ortschaft: ${city}`,
      invBranch: (branch: string) => `📍 Filiale / Adresse: ${branch}`,
      invRecipient: (contact: string) => `👤 Empfänger: ${contact}`,
      invComment: (comment: string) => `💬 Kommentar: ${comment}\n`,
      invFooter: 'Bitte Verfügbarkeit/Lieferzeit und Zahlungsdaten bestätigen.',
      phoneLabelShort: 'Tel.',
    },
  }[safeLang];

  const savedRecipient = loadSavedRecipient();
  const [invoiceMeta, setInvoiceMeta] = useState<InvoiceMeta>(() => getOrCreateInvoiceMeta(false));

  const initialCity = savedRecipient?.selectedCity || POPULAR_CITIES[0];
  const [selectedCity, setSelectedCity] = useState<CityOption>(initialCity);
  const [cityQuery, setCityQuery] = useState(() => {
    if (savedRecipient?.cityQuery && !isMatchingCityLabel(savedRecipient.cityQuery, initialCity)) {
      return savedRecipient.cityQuery;
    }
    return getCityFullLabel(initialCity, safeLang);
  });
  const [cityResults, setCityResults] = useState<CityOption[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);

  const [branchOrComment, setBranchOrComment] = useState(savedRecipient?.branchOrComment || '');
  const [clientName, setClientName] = useState(savedRecipient?.clientName || '');
  const [clientPhone, setClientPhone] = useState(() =>
    savedRecipient?.clientPhone ? formatUkrainePhone(savedRecipient.clientPhone) : ''
  );
  const [orderComment, setOrderComment] = useState(savedRecipient?.orderComment || '');
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [activeField, setActiveField] = useState<'city' | 'name' | 'phone' | 'warehouse' | 'comment' | null>(null);

  const [copied, setCopied] = useState(false);
  const [orderBanner, setOrderBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const logisticsRef = useRef<HTMLDivElement | null>(null);
  const cityBoxRef = useRef<HTMLDivElement | null>(null);
  const warehouseBoxRef = useRef<HTMLDivElement | null>(null);

  const cityInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const warehouseInputRef = useRef<HTMLInputElement | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Подгружаем историю заказов при открытии корзины (только если сессия доверенная)
  useEffect(() => {
    let active = true;
    fetchAndMergeOrderHistory(savedRecipient?.clientPhone).then((merged) => {
      if (active) setArchivedOrders(merged);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setCityQuery((prev) => {
      if (isMatchingCityLabel(prev, selectedCity)) {
        return getCityFullLabel(selectedCity, safeLang);
      }
      return prev;
    });
  }, [safeLang, selectedCity]);

  useEffect(() => {
    try {
      const payload: SavedRecipientData = {
        selectedCity,
        cityQuery,
        branchOrComment,
        clientName,
        clientPhone,
        orderComment,
      };
      localStorage.setItem(RECIPIENT_STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [selectedCity, cityQuery, branchOrComment, clientName, clientPhone, orderComment]);

  useEffect(() => {
    const handlePointerDownOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (cityBoxRef.current && !cityBoxRef.current.contains(target)) setShowCityDropdown(false);
      if (warehouseBoxRef.current && !warehouseBoxRef.current.contains(target)) setShowWarehouseDropdown(false);
    };
    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, []);

  const grandTotalPairs = items.reduce((sum, item) => sum + item.totalPairs, 0);
  const grandTotalUsd = items.reduce((sum, item) => {
    const p = getWholesalePriceByModel(item.shoe.modelNumber) || 0;
    return sum + p * item.totalPairs;
  }, 0);
  const grandTotalBoxes = useMemoOrCalcBoxes(items, grandTotalPairs);

  const isCityValid = cityQuery.trim().length >= 2;
  const isBranchValid = branchOrComment.trim().length >= 2;
  const isNameValid = clientName.trim().length >= 3 && !/^(.)\1+$/.test(clientName.trim().toLowerCase());
  const phoneValidation = validateUkrainePhone(clientPhone, safeLang);
  const isPhoneValid = phoneValidation.isValid;

  const isFormValid = isCityValid && isBranchValid && isNameValid && isPhoneValid;

  const missingFields: string[] = [];
  if (!isCityValid) missingFields.push(safeLang === 'de' ? 'Ortschaft' : safeLang === 'uk' ? 'населений пункт' : 'населенный пункт');
  if (!isNameValid) missingFields.push(safeLang === 'de' ? 'Name' : safeLang === 'uk' ? 'Ім’я та Прізвище' : 'Имя и Фамилию');
  if (!isPhoneValid) missingFields.push(safeLang === 'de' ? 'Telefon' : safeLang === 'uk' ? 'коректний телефон' : 'корректный телефон');
  if (!isBranchValid) missingFields.push(safeLang === 'de' ? 'Filiale / Adresse' : safeLang === 'uk' ? '№ відділення / адреса' : '№ отделения / адрес доставки');

  useEffect(() => {
    window.scrollTo(0, 0);
    preloadAppSounds();
  }, []);

  useEffect(() => {
    const trimmed = cityQuery.trim();
    if (trimmed.length < 1 || isMatchingCityLabel(trimmed, selectedCity)) {
      setCityResults([]);
      setCitySearching(false);
      return;
    }

    let cancelled = false;
    setCitySearching(true);

    const timer = setTimeout(async () => {
      try {
        const searchVariants = buildSearchVariants(trimmed);
        const collected: CityOption[] = [];
        const seenRefs = new Set<string>();

        for (const queryStr of searchVariants) {
          const dataCities = await callNovaPoshta('Address', 'getCities', { FindByString: queryStr, Limit: '50' });
          if (cancelled) return;

          if (Array.isArray(dataCities?.data)) {
            for (const item of dataCities.data as Array<Record<string, string>>) {
              const ref = item.Ref;
              if (!ref || seenRefs.has(ref)) continue;
              seenRefs.add(ref);

              const ua = item.Description || '';
              const ru = item.DescriptionRu || ua;
              const type = item.SettlementTypeDescription || 'м.';
              const area = item.AreaDescription || '';

              const namePart = ru && ru.toLowerCase() !== ua.toLowerCase() ? `${ua} / ${ru}` : ua;
              const fullLabel = area ? `${type} ${namePart} (${area} обл.)` : `${type} ${namePart}`;

              collected.push({ name: ru || ua, uaName: ua, deName: ua, fullLabel, ref, area });
            }
          }
          if (collected.length > 0) break;
        }

        if (!cancelled) setCityResults(collected);
      } catch {
        if (!cancelled) setCityResults([]);
      } finally {
        if (!cancelled) setCitySearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cityQuery, selectedCity]);

  useEffect(() => {
    if (!selectedCity.ref) {
      setWarehouses([]);
      return;
    }
    let cancelled = false;
    setWarehousesLoading(true);

    const loadWarehouses = async () => {
      try {
        const dataWh = await callNovaPoshta('Address', 'getWarehouses', { CityRef: selectedCity.ref });
        if (cancelled) return;
        if (Array.isArray(dataWh?.data)) {
          const list: WarehouseOption[] = dataWh.data.map((w: Record<string, string>) => ({
            ref: w.Ref,
            number: String(w.Number || ''),
            description:
              safeLang === 'ru'
                ? w.DescriptionRu || w.Description || ''
                : w.Description || w.DescriptionRu || '',
          }));
          setWarehouses(list);
        } else {
          setWarehouses([]);
        }
      } catch {
        if (!cancelled) setWarehouses([]);
      } finally {
        if (!cancelled) setWarehousesLoading(false);
      }
    };

    loadWarehouses();
    return () => {
      cancelled = true;
    };
  }, [selectedCity, safeLang]);

  const filteredWarehouses = (() => {
    const q = branchOrComment.trim().toLowerCase();
    if (!q) return warehouses.slice(0, 50);

    const digits = q.replace(/\D/g, '');
    const exactNum: WarehouseOption[] = [];
    const startsNum: WarehouseOption[] = [];
    const byText: WarehouseOption[] = [];

    for (const w of warehouses) {
      const num = w.number.toLowerCase();
      const desc = w.description.toLowerCase();
      if (digits && num === digits) exactNum.push(w);
      else if (digits && num.startsWith(digits)) startsNum.push(w);
      else if (num.includes(q) || desc.includes(q)) byText.push(w);
    }
    return [...exactNum, ...startsNum, ...byText].slice(0, 50);
  })();

  const getLocalizedCityName = (city: CityOption) => {
    if (safeLang === 'uk') return city.uaName;
    if (safeLang === 'de') return city.deName || city.uaName;
    return city.name;
  };

  const handleSelectCity = (city: CityOption) => {
    triggerHaptic('medium');
    setSelectedCity(city);
    setCityQuery(getCityFullLabel(city, safeLang));
    setShowCityDropdown(false);
    setBranchOrComment('');
  };

  const handleValidationFail = () => {
    triggerHaptic('error');
    setShowValidationErrors(true);
    logisticsRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' });
  };

  const handleClearCart = () => {
    triggerHaptic('warning');
    playAppSound('nul.mp3');
    setInvoiceMeta(getOrCreateInvoiceMeta(true));
    clearWholesaleCartEverywhere();
    setTimeout(() => onClear(), 150);
  };

  const combinedClientContact = `${clientName.trim()}, ${t.phoneLabelShort}: ${clientPhone.trim()}`;

  const buildInvoiceText = () => {
    const lines = items.map((item, idx) => {
      const variantStr = item.shoe.variant ? ` ${translateCatalogText(item.shoe.variant, safeLang)}` : '';
      const colorStr = translateCatalogText(item.shoe.color, safeLang);
      const actualFormula = getDynamicFormulaText(item, safeLang);
      return (
        `${t.invModel(idx + 1, item.shoe.modelNumber, variantStr, colorStr)}\n` +
        `   • ${actualFormula}\n` +
        `   • ${t.invModelTotal(item.totalPairs)}`
      );
    });

    const trimmedComment = orderComment.trim();
    const commentBlock = trimmedComment ? t.invComment(trimmedComment) : '';

    return (
      `${t.invHeader(invoiceMeta.invoiceNumber)}\n` +
      `${t.invDate(invoiceMeta.dateFormatted)}\n` +
      `════════════════════\n` +
      `${lines.join('\n\n')}\n` +
      `════════════════════\n` +
      `${t.invPositions(items.length)}\n` +
      `${t.invVolume(grandTotalPairs, grandTotalBoxes)}\n` +
      `${t.invCity(cityQuery.trim())}\n` +
      `${t.invBranch(branchOrComment.trim())}\n` +
      `${t.invRecipient(combinedClientContact)}\n` +
      commentBlock +
      `════════════════════\n` +
      `${t.invFooter}`
    );
  };

  const sendToManager = async (manager: { name: string; telegramId?: string }): Promise<boolean> => {
    if (!manager.telegramId) return false;
    if (!isFormValid) {
      handleValidationFail();
      return false;
    }

    setOrderBanner(null);
    const text = buildInvoiceText();
    const trimmedComment = orderComment.trim();
    const clientUid = getUniversalClientUid();
    const cleanPhone = normalizePhoneForSearch(clientPhone);
    const fullBranchText = trimmedComment
      ? `${cityQuery.trim()} — ${branchOrComment.trim()} (${trimmedComment})`
      : `${cityQuery.trim()} — ${branchOrComment.trim()}`;

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: invoiceMeta.invoiceNumber,
          clientUid,
          clientPhone: cleanPhone,
          telegramId: manager.telegramId,
          managerName: manager.name,
          clientContact: combinedClientContact,
          branchOrComment: fullBranchText,
          orderComment: trimmedComment,
          totalPairs: grandTotalPairs,
          totalUsd: grandTotalUsd,
          deliveryCost: 0,
          invoiceText: text,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        triggerHaptic('success');

        const sentInvoiceNum = invoiceMeta.invoiceNumber;
        const archivedItem: ArchivedOrder = {
          id: sentInvoiceNum,
          createdAt: new Date().toISOString(),
          managerName: manager.name,
          clientContact: combinedClientContact,
          branchOrComment: fullBranchText,
          totalPairs: grandTotalPairs,
          totalUsd: grandTotalUsd,
          invoiceText: text,
          items: [...items],
        };
        const updatedArchive = saveOrderToLocalArchive(archivedItem);
        setArchivedOrders(updatedArchive);
        setExpandedArchiveId(sentInvoiceNum);

        setOrderBanner({
          type: 'success',
          text: t.orderSentSuccess(sentInvoiceNum, manager.name),
        });
        setInvoiceMeta(getOrCreateInvoiceMeta(true));

        clearWholesaleCartEverywhere();
        onClear();
        setActiveTab('archive');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        return true;
      } else {
        triggerHaptic('error');
        setOrderBanner({ type: 'error', text: t.orderSendError(data.error) });
        return false;
      }
    } catch {
      triggerHaptic('error');
      setOrderBanner({ type: 'error', text: t.orderSendError(t.orderNetworkError) });
      return false;
    }
  };

  const copyInvoice = async () => {
    if (!isFormValid) {
      handleValidationFail();
      return;
    }
    try {
      await navigator.clipboard.writeText(buildInvoiceText());
      triggerHaptic('success');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      triggerHaptic('error');
    }
  };

  const getSolidInputStyle = (isValid: boolean, isFocused: boolean): CSSProperties => {
    const hasError = showValidationErrors && !isValid;
    const borderColor = hasError
      ? THEME.danger
      : isFocused
      ? THEME.focusBorder
      : THEME.border;
    const bgColor = hasError ? THEME.dangerFieldBg : THEME.fieldBg;

    return {
      display: 'block',
      width: '100%',
      boxSizing: 'border-box',
      padding: '12px 12px',
      border: `1.5px solid ${borderColor}`,
      backgroundColor: bgColor,
      color: THEME.ink,
      WebkitTextFillColor: THEME.ink,
      caretColor: THEME.ink,
      fontSize: '15px',
      lineHeight: '20px',
      fontWeight: 500,
      fontFamily: THEME.sans,
      borderRadius: 0,
      outline: 'none',
      boxShadow: 'none',
      WebkitAppearance: 'none',
      appearance: 'none',
    };
  };

  const renderFieldHeader = (
    label: string,
    currentValue: string,
    isFocused: boolean,
    onClearField: () => void
  ) => {
    const hasText = currentValue.length > 0;
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '5px',
          minHeight: '20px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            lineHeight: 1.25,
            color: isFocused ? THEME.ink : THEME.inkMuted,
            fontWeight: isFocused ? 600 : 500,
            letterSpacing: '0.2px',
          }}
        >
          {label}
        </span>

        {hasText && (
          <span
            role="button"
            tabIndex={0}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              triggerHaptic('light');
              onClearField();
            }}
            onClick={(e) => {
              if (e.detail === 0) {
                e.preventDefault();
                triggerHaptic('light');
                onClearField();
              }
            }}
            style={{
              flexShrink: 0,
              fontSize: '10px',
              fontWeight: 600,
              color: THEME.inkMuted,
              backgroundColor: THEME.surfaceActive,
              border: `1px solid ${THEME.border}`,
              padding: '2px 8px',
              cursor: 'pointer',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {t.clearFieldBtn}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className={`wholesale-cart-root ${darkActive ? 'wholesale-cart-dark' : 'wholesale-cart-light'}`}
      style={{
        backgroundColor: THEME.bg,
        minHeight: '100vh',
        padding: '18px 16px 90px 16px',
        color: THEME.ink,
        fontFamily: THEME.sans,
        colorScheme: darkActive ? 'dark' : 'light',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        .wholesale-cart-root input.wc-solid-input,
        .wholesale-cart-root textarea.wc-solid-input,
        .wholesale-cart-root input.wc-solid-input:focus,
        .wholesale-cart-root textarea.wc-solid-input:focus,
        .wholesale-cart-root input.wc-solid-input:active,
        .wholesale-cart-root textarea.wc-solid-input:active {
          color: ${THEME.ink} !important;
          -webkit-text-fill-color: ${THEME.ink} !important;
          caret-color: ${THEME.ink} !important;
          background-color: ${THEME.fieldBg} !important;
          opacity: 1 !important;
          visibility: visible !important;
          -webkit-appearance: none !important;
          appearance: none !important;
          transform: none !important;
          -webkit-transform: none !important;
        }
        .wholesale-cart-root input.wc-solid-input::placeholder,
        .wholesale-cart-root textarea.wc-solid-input::placeholder {
          color: ${THEME.inkLight} !important;
          -webkit-text-fill-color: ${THEME.inkLight} !important;
          opacity: 0.85 !important;
        }
        .wholesale-cart-root input.wc-solid-input:-webkit-autofill,
        .wholesale-cart-root input.wc-solid-input:-webkit-autofill:hover,
        .wholesale-cart-root input.wc-solid-input:-webkit-autofill:focus,
        .wholesale-cart-root textarea.wc-solid-input:-webkit-autofill {
          -webkit-text-fill-color: ${THEME.ink} !important;
          -webkit-box-shadow: 0 0 0px 1000px ${THEME.fieldBg} inset !important;
        }
      `}</style>

      {/* Верхняя строка: Назад и Очистить */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          paddingBottom: '12px',
          borderBottom: `1px solid ${THEME.border}`,
        }}
      >
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px 0',
            fontSize: '10px',
            letterSpacing: '1.4px',
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: 'pointer',
            color: THEME.ink,
          }}
        >
          {t.back}
        </button>

        {activeTab === 'current' && items.length > 0 && (
          <button
            type="button"
            onClick={handleClearCart}
            style={{
              background: THEME.surface,
              border: `1px solid ${THEME.danger}`,
              padding: '6px 10px',
              fontSize: '9px',
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
              color: THEME.danger,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.clearCart}
          </button>
        )}
      </div>

      {/* Переключатель вкладок: Текущая накладная / Мои заказы (Архив) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          border: `1px solid ${THEME.ink}`,
          marginBottom: '18px',
        }}
      >
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('current');
          }}
          style={{
            backgroundColor: activeTab === 'current' ? THEME.primaryBtnBg : THEME.surface,
            color: activeTab === 'current' ? THEME.primaryBtnText : THEME.ink,
            border: 'none',
            padding: '11px 8px',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {t.tabCurrent(items.length)}
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('archive');
          }}
          style={{
            backgroundColor: activeTab === 'archive' ? THEME.primaryBtnBg : THEME.surface,
            color: activeTab === 'archive' ? THEME.primaryBtnText : THEME.ink,
            border: 'none',
            borderLeft: `1px solid ${THEME.ink}`,
            padding: '11px 8px',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {t.tabArchive(archivedOrders.length)}
        </button>
      </div>

      {/* Баннер успешной отправки */}
      {orderBanner && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 14px',
            border: `1.5px solid ${orderBanner.type === 'success' ? THEME.accentGreen : THEME.danger}`,
            backgroundColor: orderBanner.type === 'success' ? THEME.successBg : THEME.dangerBg,
            color: orderBanner.type === 'success' ? THEME.accentGreen : THEME.danger,
            fontSize: '12px',
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          {orderBanner.text}
        </div>
      )}

      {/* Заголовок активной вкладки */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '6px',
            fontSize: '9px',
            letterSpacing: '1.6px',
            textTransform: 'uppercase',
            color: THEME.inkMuted,
            marginBottom: '4px',
          }}
        >
          <span>{t.headerSub}</span>
          {activeTab === 'current' && items.length > 0 && (
            <span
              style={{
                backgroundColor: THEME.surface,
                border: `1px solid ${THEME.border}`,
                padding: '3px 7px',
                color: THEME.ink,
                fontWeight: 600,
                letterSpacing: '1px',
              }}
            >
              {t.invoiceBadge(invoiceMeta.invoiceNumber, invoiceMeta.dateFormatted)}
            </span>
          )}
        </div>
        <h1
          style={{
            fontFamily: THEME.serif,
            fontSize: '30px',
            margin: 0,
            fontWeight: 400,
            letterSpacing: '0.2px',
          }}
        >
          {activeTab === 'current'
            ? t.title(items.length)
            : t.archiveTitle(archivedOrders.length)}
        </h1>
      </div>

      {/* ===================================================================== */}
      {/* ВКЛАДКА 2: АРХИВ «МОИ ЗАКАЗЫ» С ЗАЩИТОЙ ЧЕРЕЗ TELEGRAM OTP            */}
      {/* ===================================================================== */}
      {activeTab === 'archive' ? (
        <div>
          {/* Защищенный двухфакторный блок верификации через 4-значный код в Telegram */}
          <TelegramOtpAuthBox
            lang={safeLang}
            clientPhone={clientPhone}
            onPhoneChange={setClientPhone}
            formatPhoneFn={formatUkrainePhone}
            onOrdersLoaded={(merged) => setArchivedOrders(merged)}
            onHaptic={(lvl) => triggerHaptic(lvl || 'light')}
            theme={THEME}
          />

          {archivedOrders.length === 0 ? (
            <div
              style={{
                backgroundColor: THEME.surface,
                border: `1px solid ${THEME.border}`,
                padding: '40px 20px',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontFamily: THEME.serif,
                  fontStyle: 'italic',
                  fontSize: '16px',
                  color: THEME.inkMuted,
                  margin: '0 0 18px 0',
                }}
              >
                {t.archiveEmpty}
              </p>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: THEME.primaryBtnBg,
                  color: THEME.primaryBtnText,
                  border: 'none',
                  fontSize: '10px',
                  letterSpacing: '1.4px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {t.goToCatalog}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {archivedOrders.map((ord) => {
                const isExpanded = expandedArchiveId === ord.id;
                const isThisCopied = copiedArchiveId === ord.id;
                const dateObj = new Date(ord.createdAt);
                const readableDate = isNaN(dateObj.getTime())
                  ? ord.createdAt
                  : dateObj.toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                return (
                  <div
                    key={ord.id}
                    style={{
                      backgroundColor: THEME.surface,
                      border: `1px solid ${THEME.border}`,
                      borderLeft: `3px solid ${THEME.primaryBtnBg}`,
                      padding: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '8px',
                        marginBottom: '6px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '10px', color: THEME.inkMuted, letterSpacing: '0.8px' }}>
                          {readableDate}
                        </div>
                        <div style={{ fontFamily: THEME.serif, fontSize: '19px', fontWeight: 600 }}>
                          {ord.id}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: THEME.serif, fontSize: '18px', fontWeight: 700 }}>
                          {ord.totalPairs} {t.pairsUnit}
                          {ord.totalUsd ? ` • $${ord.totalUsd}` : ''}
                        </div>
                        <div style={{ fontSize: '10px', color: THEME.accentGreen, fontWeight: 600 }}>
                          ✓ {t.archiveManagerLabel} {ord.managerName}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: THEME.inkMuted, marginBottom: '10px', lineHeight: 1.35 }}>
                      <div>{ord.branchOrComment}</div>
                      <div>{ord.clientContact}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setExpandedArchiveId(isExpanded ? null : ord.id);
                        }}
                        style={{
                          flex: '1 1 auto',
                          backgroundColor: THEME.bg,
                          color: THEME.ink,
                          border: `1px solid ${THEME.border}`,
                          padding: '8px 10px',
                          fontSize: '10px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.6px',
                          cursor: 'pointer',
                        }}
                      >
                        {isExpanded ? t.archiveHideDetails : t.archiveShowDetails}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(ord.invoiceText);
                            triggerHaptic('success');
                            setCopiedArchiveId(ord.id);
                            setTimeout(() => setCopiedArchiveId(null), 2000);
                          } catch {}
                        }}
                        style={{
                          backgroundColor: isThisCopied ? THEME.accentGreen : THEME.primaryBtnBg,
                          color: isThisCopied ? '#FFFFFF' : THEME.primaryBtnText,
                          border: 'none',
                          padding: '8px 12px',
                          fontSize: '10px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.6px',
                          cursor: 'pointer',
                        }}
                      >
                        {isThisCopied ? t.archiveCopied : t.archiveCopyBtn}
                      </button>
                    </div>

                    {isExpanded && (
                      <pre
                        style={{
                          marginTop: '10px',
                          padding: '10px',
                          backgroundColor: THEME.bg,
                          border: `1px solid ${THEME.border}`,
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          color: THEME.ink,
                          lineHeight: 1.4,
                        }}
                      >
                        {ord.invoiceText}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : items.length === 0 ? (
        /* ===================================================================== */
        /* ВКЛАДКА 1 (ПУСТАЯ): В текущей накладной нет моделей                   */
        /* ===================================================================== */
        <div
          style={{
            backgroundColor: THEME.surface,
            border: `1px solid ${THEME.border}`,
            padding: '44px 20px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: THEME.serif,
              fontStyle: 'italic',
              fontSize: '16px',
              color: THEME.inkMuted,
              margin: '0 0 20px 0',
            }}
          >
            {t.emptyText}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '280px', margin: '0 auto' }}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: THEME.primaryBtnBg,
                color: THEME.primaryBtnText,
                border: 'none',
                fontSize: '10px',
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {t.goToCatalog}
            </button>

            {archivedOrders.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab('archive');
                }}
                style={{
                  padding: '11px 18px',
                  backgroundColor: THEME.bg,
                  color: THEME.ink,
                  border: `1px solid ${THEME.ink}`,
                  fontSize: '10px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {t.openArchiveBtn(archivedOrders.length)}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ===================================================================== */
        /* ВКЛАДКА 1 (АКТИВНАЯ): Список выбранных моделей и форма отправки       */
        /* ===================================================================== */
        <>
          <div style={{ borderTop: `1px solid ${THEME.border}`, marginBottom: '24px' }}>
            {items.map((item, idx) => {
              const isSample = item.orderMode === 'sample';
              const canDecrease = item.boxesCount > 1;
              const actualFormula = getDynamicFormulaText(item, safeLang);
              const localizedColor = translateCatalogText(item.shoe.color, safeLang);
              const localizedCategory = translateCatalogText(item.shoe.category, safeLang);
              const localizedVariant = translateCatalogText(item.shoe.variant, safeLang);

              return (
                <div
                  key={item.uid}
                  style={{
                    backgroundColor: THEME.surface,
                    borderBottom: `1px solid ${THEME.border}`,
                    borderLeft: `1px solid ${THEME.border}`,
                    borderRight: `1px solid ${THEME.border}`,
                    padding: '12px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '82px',
                      aspectRatio: '3 / 2',
                      flexShrink: 0,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: THEME.photoBg,
                      border: `1px solid ${THEME.border}`,
                    }}
                  >
                    <img
                      src={item.shoe.image}
                      alt={item.shoe.modelNumber}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        mixBlendMode: 'multiply',
                        filter: 'contrast(1.04)',
                        transform: 'scale(1.14)',
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '17px', fontFamily: THEME.serif }}>
                        <span style={{ fontSize: '10px', color: THEME.inkLight, marginRight: '6px', fontFamily: THEME.sans }}>
                          0{idx + 1}
                        </span>
                        {t.modelPrefix} {item.shoe.modelNumber} {localizedVariant}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('medium');
                          playAppSound('nul.mp3');
                          setTimeout(() => onRemove(item.uid), 120);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: THEME.inkLight,
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          touchAction: 'manipulation',
                        }}
                        title={t.deleteTitle}
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{ fontSize: '10px', color: THEME.inkMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '2px' }}>
                      {localizedColor} • {localizedCategory}
                    </div>
                    <div style={{ fontSize: '11px', color: THEME.ink, marginTop: '5px', lineHeight: 1.35 }}>
                      {actualFormula}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '8px',
                        borderTop: `1px solid ${THEME.border}`,
                        paddingTop: '8px',
                      }}
                    >
                      <span style={{ fontFamily: THEME.serif, fontStyle: 'italic', fontSize: '14px' }}>
                        {t.totalPairsLabel} <strong>{item.totalPairs} {t.pairsUnit}</strong>
                      </span>

                      {!isSample && (
                        <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${THEME.border}`, backgroundColor: THEME.bg }}>
                          <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.8px', color: THEME.inkMuted, padding: '0 8px' }}>
                            {t.boxesLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (canDecrease) {
                                triggerHaptic('light');
                                onUpdateQuantity(item.uid, item.boxesCount - 1);
                              }
                            }}
                            style={{
                              width: '28px',
                              height: '28px',
                              border: 'none',
                              borderLeft: `1px solid ${THEME.border}`,
                              backgroundColor: THEME.surface,
                              color: canDecrease ? THEME.ink : THEME.border,
                              cursor: canDecrease ? 'pointer' : 'default',
                              fontSize: '14px',
                              touchAction: 'manipulation',
                            }}
                          >
                            −
                          </button>
                          <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '26px', textAlign: 'center' }}>
                            {item.boxesCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              onUpdateQuantity(item.uid, item.boxesCount + 1);
                            }}
                            style={{
                              width: '28px',
                              height: '28px',
                              border: 'none',
                              borderLeft: `1px solid ${THEME.border}`,
                              backgroundColor: THEME.surface,
                              color: THEME.ink,
                              cursor: 'pointer',
                              fontSize: '14px',
                              touchAction: 'manipulation',
                            }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div ref={logisticsRef} style={{ marginBottom: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.4px',
                color: THEME.inkMuted,
                marginBottom: '8px',
              }}
            >
              <span>{t.sectionLogistics}</span>
              <span>{t.sectionShipping}</span>
            </div>

            <div
              style={{
                backgroundColor: THEME.surface,
                border: `1px solid ${showValidationErrors && !isFormValid ? THEME.danger : THEME.border}`,
                padding: '14px',
              }}
            >
              {showValidationErrors && !isFormValid && (
                <div
                  style={{
                    backgroundColor: THEME.dangerBg,
                    border: `1px solid ${THEME.danger}`,
                    color: THEME.danger,
                    padding: '8px 10px',
                    fontSize: '11px',
                    marginBottom: '12px',
                    lineHeight: 1.35,
                  }}
                >
                  {t.fillRequired} <strong>{missingFields.join(', ')}</strong>
                </div>
              )}

              <div style={{ fontSize: '12px', color: THEME.ink, marginBottom: '6px' }}>
                {t.cityPrompt}{' '}
                <strong style={{ fontFamily: THEME.serif, fontSize: '14px' }}>
                  {getCityFullLabel(selectedCity, safeLang)}
                </strong>
              </div>
              <div style={{ fontSize: '11px', color: THEME.inkMuted, marginBottom: '10px', lineHeight: 1.35 }}>
                {t.citySub}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                {POPULAR_CITIES.map((city) => {
                  const isSelected = selectedCity.ref === city.ref;
                  return (
                    <button
                      key={city.ref}
                      type="button"
                      onClick={() => handleSelectCity(city)}
                      style={{
                        padding: '6px 10px',
                        fontSize: '10px',
                        border: `1px solid ${isSelected ? THEME.primaryBtnBg : THEME.border}`,
                        backgroundColor: isSelected ? THEME.primaryBtnBg : THEME.bg,
                        color: isSelected ? THEME.primaryBtnText : THEME.ink,
                        cursor: 'pointer',
                        letterSpacing: '0.5px',
                        fontWeight: isSelected ? 600 : 400,
                        touchAction: 'manipulation',
                      }}
                    >
                      {getLocalizedCityName(city)}
                    </button>
                  );
                })}
              </div>

              {/* 1. Город */}
              <div ref={cityBoxRef} style={{ position: 'relative', marginBottom: '12px' }}>
                {renderFieldHeader(t.labelCity, cityQuery, activeField === 'city', () => {
                  setCityQuery('');
                  setCityResults([]);
                  setShowCityDropdown(true);
                  cityInputRef.current?.focus();
                })}
                <input
                  ref={cityInputRef}
                  className="wc-solid-input"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={t.cityPlaceholder}
                  value={cityQuery}
                  onFocus={() => {
                    setActiveField('city');
                    setShowCityDropdown(true);
                  }}
                  onBlur={() => setActiveField((prev) => (prev === 'city' ? null : prev))}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setShowCityDropdown(true);
                  }}
                  style={getSolidInputStyle(isCityValid, activeField === 'city')}
                />

                {showCityDropdown && cityQuery.trim().length >= 1 && !isMatchingCityLabel(cityQuery, selectedCity) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 30,
                      backgroundColor: THEME.fieldBg,
                      border: `1px solid ${THEME.border}`,
                      maxHeight: '220px',
                      overflowY: 'auto',
                      WebkitOverflowScrolling: 'touch',
                      boxShadow: darkActive
                        ? '0 6px 16px rgba(0,0,0,0.65)'
                        : '0 6px 16px rgba(0,0,0,0.12)',
                    }}
                  >
                    {citySearching ? (
                      <div style={{ padding: '10px 12px', fontSize: '12px', color: THEME.inkMuted }}>
                        {t.citySearchingText}
                      </div>
                    ) : cityResults.length === 0 ? (
                      <div style={{ padding: '10px 12px', fontSize: '12px', color: THEME.inkMuted }}>
                        {t.cityNotFound}
                      </div>
                    ) : (
                      cityResults.map((c) => (
                        <div
                          key={c.ref}
                          onClick={() => handleSelectCity(c)}
                          style={{
                            padding: '11px 12px',
                            fontSize: '12px',
                            borderBottom: `1px solid ${THEME.border}`,
                            cursor: 'pointer',
                            color: THEME.ink,
                          }}
                        >
                          {c.fullLabel}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 2. Имя и Фамилия */}
              <div style={{ marginBottom: '12px' }}>
                {renderFieldHeader(t.labelName, clientName, activeField === 'name', () => {
                  setClientName('');
                  nameInputRef.current?.focus();
                })}
                <input
                  ref={nameInputRef}
                  className="wc-solid-input"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={t.namePlaceholder}
                  value={clientName}
                  onFocus={() => setActiveField('name')}
                  onBlur={() => setActiveField((prev) => (prev === 'name' ? null : prev))}
                  onChange={(e) => setClientName(e.target.value)}
                  style={getSolidInputStyle(isNameValid, activeField === 'name')}
                />
              </div>

              {/* 3. Телефон */}
              <div style={{ marginBottom: '12px' }}>
                {renderFieldHeader(t.labelPhone, clientPhone, activeField === 'phone', () => {
                  setClientPhone('');
                  phoneInputRef.current?.focus();
                })}
                <input
                  ref={phoneInputRef}
                  className="wc-solid-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={t.phonePlaceholder}
                  value={clientPhone}
                  onFocus={() => setActiveField('phone')}
                  onBlur={() => setActiveField((prev) => (prev === 'phone' ? null : prev))}
                  onChange={(e) => setClientPhone(formatUkrainePhone(e.target.value))}
                  style={getSolidInputStyle(isPhoneValid, activeField === 'phone')}
                />
                {phoneValidation.errorHint && (showValidationErrors || clientPhone.length >= 7) && (
                  <div style={{ fontSize: '10px', color: THEME.danger, marginTop: '4px', lineHeight: 1.3 }}>
                    {phoneValidation.errorHint}
                  </div>
                )}
              </div>

              {/* 4. Отделение / Адрес */}
              <div ref={warehouseBoxRef} style={{ position: 'relative', marginBottom: '12px' }}>
                {renderFieldHeader(t.labelWarehouse, branchOrComment, activeField === 'warehouse', () => {
                  setBranchOrComment('');
                  setShowWarehouseDropdown(true);
                  warehouseInputRef.current?.focus();
                })}
                <input
                  ref={warehouseInputRef}
                  className="wc-solid-input"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={
                    warehousesLoading
                      ? t.warehouseLoading
                      : t.warehousePlaceholder(getLocalizedCityName(selectedCity))
                  }
                  value={branchOrComment}
                  onFocus={() => {
                    setActiveField('warehouse');
                    setShowWarehouseDropdown(true);
                  }}
                  onBlur={() => setActiveField((prev) => (prev === 'warehouse' ? null : prev))}
                  onChange={(e) => {
                    setBranchOrComment(e.target.value);
                    setShowWarehouseDropdown(true);
                  }}
                  style={getSolidInputStyle(isBranchValid, activeField === 'warehouse')}
                />

                {showWarehouseDropdown && filteredWarehouses.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 25,
                      backgroundColor: THEME.fieldBg,
                      border: `1px solid ${THEME.border}`,
                      maxHeight: '210px',
                      overflowY: 'auto',
                      WebkitOverflowScrolling: 'touch',
                      boxShadow: darkActive
                        ? '0 6px 16px rgba(0,0,0,0.65)'
                        : '0 6px 16px rgba(0,0,0,0.12)',
                    }}
                  >
                    {filteredWarehouses.map((w) => (
                      <div
                        key={w.ref}
                        onClick={() => {
                          triggerHaptic('light');
                          setBranchOrComment(w.description);
                          setShowWarehouseDropdown(false);
                        }}
                        style={{
                          padding: '10px 12px',
                          fontSize: '11px',
                          borderBottom: `1px solid ${THEME.border}`,
                          cursor: 'pointer',
                          color: THEME.ink,
                        }}
                      >
                        {w.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Комментарий */}
              <div style={{ marginBottom: '12px' }}>
                {renderFieldHeader(t.labelComment, orderComment, activeField === 'comment', () => {
                  setOrderComment('');
                  commentInputRef.current?.focus();
                })}
                <textarea
                  ref={commentInputRef}
                  className="wc-solid-input"
                  rows={3}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={t.commentPlaceholder}
                  value={orderComment}
                  onFocus={() => setActiveField('comment')}
                  onBlur={() => setActiveField((prev) => (prev === 'comment' ? null : prev))}
                  onChange={(e) => setOrderComment(e.target.value)}
                  style={{
                    ...getSolidInputStyle(true, activeField === 'comment'),
                    resize: 'vertical',
                    minHeight: '68px',
                    lineHeight: '1.4',
                  }}
                />
              </div>

              <div
                style={{
                  borderTop: `1px solid ${THEME.border}`,
                  paddingTop: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '11px', color: THEME.inkMuted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  {t.totalToShip}
                </div>
                <div
                  style={{
                    fontFamily: THEME.serif,
                    fontSize: '16px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {grandTotalPairs} {t.pairsUnit}{' '}
                  <span style={{ fontSize: '12px', fontWeight: 400, color: THEME.inkMuted }}>
                    {t.boxesSuffix(grandTotalBoxes)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="managers-contact-scope">
            <ManagersContactCard
              lang={safeLang}
              isDark={darkActive}
              itemsCount={items.length}
              onSendOrder={sendToManager}
              onCopyInvoice={copyInvoice}
              copied={copied}
              isFormValid={isFormValid}
              missingFields={missingFields}
              onValidationFail={handleValidationFail}
            />
          </div>
        </>
      )}
    </div>
  );
}

function useMemoOrCalcBoxes(items: CartItem[], grandTotalPairs: number): number {
  if (grandTotalPairs === 0) return 0;
  let wholesaleBoxes = 0;
  let samplePairs = 0;

  for (const item of items) {
    if (item.orderMode === 'sample') samplePairs += item.totalPairs;
    else wholesaleBoxes += item.boxesCount;
  }

  const sampleBoxes = samplePairs > 0 ? Math.ceil(samplePairs / 8) : 0;
  return Math.max(1, wholesaleBoxes + sampleBoxes);
}

export default WholesaleCart;
