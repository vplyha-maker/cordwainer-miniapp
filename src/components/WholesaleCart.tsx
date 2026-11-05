import { useState, useEffect, useRef } from 'react';
import { type CartItem, type SizeKey } from '../data/catalog';
import {
  ManagersContactCard,
  type ManagerContact,
  triggerHaptic,
  playAppSound,
  preloadAppSounds,
} from './ManagersContactCard';
import type { Lang } from '../App';

type WholesaleCartProps = {
  items: CartItem[];
  lang: Lang;
  onUpdateQuantity: (uid: string, newBoxesCount: number) => void;
  onRemove: (uid: string) => void;
  onClear: () => void;
  onClose: () => void;
};

type CityOption = {
  name: string;
  uaName: string;
  fullLabel: string;
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
  { name: 'Киев', uaName: 'Київ', fullLabel: 'м. Київ (Київська обл.)', ref: '8d5a980d-391c-11dd-90d9-001a92567626', area: 'Київська' },
  { name: 'Днепр', uaName: 'Дніпро', fullLabel: 'м. Дніпро (Дніпропетровська обл.)', ref: 'db5c88f0-391c-11dd-90d9-001a92567626', area: 'Дніпропетровська' },
  { name: 'Одесса', uaName: 'Одеса', fullLabel: 'м. Одеса (Одеська обл.)', ref: 'db5c88d0-391c-11dd-90d9-001a92567626', area: 'Одеська' },
  { name: 'Львов', uaName: 'Львів', fullLabel: 'м. Львів (Львівська обл.)', ref: 'db5c88f5-391c-11dd-90d9-001a92567626', area: 'Львівська' },
  { name: 'Харьков', uaName: 'Харків', fullLabel: 'м. Харків (Харківська обл.)', ref: 'db5c88e0-391c-11dd-90d9-001a92567626', area: 'Харківська' },
  { name: 'Полтава', uaName: 'Полтава', fullLabel: 'м. Полтава (Полтавська обл.)', ref: 'db5c8892-391c-11dd-90d9-001a92567626', area: 'Полтавська' },
  { name: 'Запорожье', uaName: 'Запоріжжя', fullLabel: 'м. Запоріжжя (Запорізька обл.)', ref: 'db5c88c6-391c-11dd-90d9-001a92567626', area: 'Запорізька' },
  { name: 'Винница', uaName: 'Вінниця', fullLabel: 'м. Вінниця (Вінницька обл.)', ref: 'db5c88de-391c-11dd-90d9-001a92567626', area: 'Вінницька' },
];

const THEME = {
  bg: '#F2EFE9',
  surface: '#F8F6F1',
  surfaceActive: '#EAE5DC',
  ink: '#161514',
  inkMuted: '#6E6A63',
  inkLight: '#9A958C',
  border: '#DCD7CC',
  danger: '#9E2A2B',
  accentGreen: '#1E4620',
  serif: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
  sans: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
};

type InvoiceMeta = {
  invoiceNumber: string;
  dateFormatted: string;
};

function ClearFieldButton({
  onClear,
  isTextarea = false,
  ariaLabel = 'Очистить поле',
}: {
  onClear: () => void;
  isTextarea?: boolean;
  ariaLabel?: string;
}) {
  const handleTrigger = (e: React.PointerEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic('light');
    onClear();
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onPointerDown={handleTrigger}
      onClick={(e) => {
        if (e.detail === 0) handleTrigger(e);
      }}
      style={{
        position: 'absolute',
        right: '1px',
        top: '1px',
        bottom: isTextarea ? 'auto' : '1px',
        height: isTextarea ? '42px' : undefined,
        width: '44px',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
        cursor: 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          backgroundColor: THEME.surfaceActive,
          border: `1px solid ${THEME.border}`,
          color: THEME.ink,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          lineHeight: 1,
          fontWeight: 600,
          pointerEvents: 'none',
        }}
      >
        ✕
      </span>
    </button>
  );
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
    .map((sz) => `${sz}р.(${(item.sizeRun[sz] || 0) * item.boxesCount})`)
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
    return raw ? (JSON.parse(raw) as SavedRecipientData) : null;
  } catch {
    return null;
  }
}

export function WholesaleCart({ items, lang, onUpdateQuantity, onRemove, onClear, onClose }: WholesaleCartProps) {
  const safeLang = lang && ['ru', 'uk', 'de'].includes(lang) ? lang : 'ru';

  const t = {
    ru: {
      back: '← Назад в каталог',
      clearCart: '✕ Очистить накладную',
      headerSub: 'CARDIO FOOTWEAR // ОПТОВЫЙ ЗАКАЗ',
      title: (count: number) => `Оптовая накладная (${count})`,
      emptyText: 'В вашей накладной пока нет выбранных моделей.',
      goToCatalog: 'Перейти в каталог →',
      totalPairsLabel: 'Итого:',
      boxesLabel: 'Коробов',
      sectionLogistics: 'I. ДАННЫЕ ПОЛУЧАТЕЛЯ И ДОСТАВКА',
      sectionShipping: 'РЕКВИЗИТЫ ОТГРУЗКИ',
      fillRequired: 'Заполните обязательные поля:',
      cityPrompt: 'Населенный пункт:',
      citySub: 'Выберите город из быстрого списка или начните вводить название любого города, пгт или села:',
      cityPlaceholder: '1. Начните вводить город, пгт или село *',
      namePlaceholder: '2. Имя и Фамилия получателя *',
      phonePlaceholder: '3. Телефон получателя: +38 (0XX) XXX-XX-XX *',
      warehouseLoading: 'Загрузка доступных отделений...',
      warehousePlaceholder: (city: string) => `4. Выберите отделение или введите адрес (${city}) *`,
      commentPlaceholder: '5. Комментарий к заказу (необязательно — пожелания по отправке, упаковке или срокам)',
      totalToShip: 'Всего к отгрузке:',
      boxesSuffix: (b: number) => `(~${b} кор.)`,
      deleteTitle: 'Удалить позицию',
    },
    uk: {
      back: '← Назад у каталог',
      clearCart: '✕ Очистити накладну',
      headerSub: 'CARDIO FOOTWEAR // ГУРТОВЕ ЗАМОВЛЕННЯ',
      title: (count: number) => `Гуртова накладна (${count})`,
      emptyText: 'У вашій накладній поки немає обраних моделей.',
      goToCatalog: 'Перейти до каталогу →',
      totalPairsLabel: 'Разом:',
      boxesLabel: 'Коробів',
      sectionLogistics: 'I. ДАНІ ОТРИМУВАЧА ТА ДОСТАВКА',
      sectionShipping: 'РЕКВІЗИТИ ВІДПРАВКИ',
      fillRequired: 'Заповніть обов’язкові поля:',
      cityPrompt: 'Населений пункт:',
      citySub: 'Виберіть місто зі швидкого списку або почніть вводити назву будь-якого міста, смт чи села:',
      cityPlaceholder: '1. Почніть вводити місто, смт чи село *',
      namePlaceholder: '2. Ім’я та Прізвище отримувача *',
      phonePlaceholder: '3. Телефон отримувача: +38 (0XX) XXX-XX-XX *',
      warehouseLoading: 'Завантаження доступних відділень...',
      warehousePlaceholder: (city: string) => `4. Виберіть відділення або введіть адресу (${city}) *`,
      commentPlaceholder: '5. Коментар до замовлення (необов’язково — побажання щодо відправки, упаковки чи термінів)',
      totalToShip: 'Всього до відвантаження:',
      boxesSuffix: (b: number) => `(~${b} кор.)`,
      deleteTitle: 'Видалити позицію',
    },
    de: {
      back: '← Zurück zum Katalog',
      clearCart: '✕ Rechnung leeren',
      headerSub: 'CARDIO FOOTWEAR // GROSSHANDELSBESTELLUNG',
      title: (count: number) => `Großhandelsrechnung (${count})`,
      emptyText: 'Ihre Rechnung enthält noch keine Modelle.',
      goToCatalog: 'Zum Katalog →',
      totalPairsLabel: 'Gesamt:',
      boxesLabel: 'Kisten',
      sectionLogistics: 'I. EMPFÄNGERDATEN & VERSAND',
      sectionShipping: 'VERSANDDETAILS',
      fillRequired: 'Bitte füllen Sie Pflichtfelder aus:',
      cityPrompt: 'Ortschaft:',
      citySub: 'Wählen Sie eine Stadt aus oder geben Sie den Namen ein:',
      cityPlaceholder: '1. Stadt, Gemeinde oder Dorf eingeben *',
      namePlaceholder: '2. Vor- und Nachname des Empfängers *',
      phonePlaceholder: '3. Telefon: +38 (0XX) XXX-XX-XX *',
      warehouseLoading: 'Filialen werden geladen...',
      warehousePlaceholder: (city: string) => `4. Filiale wählen oder Adresse eingeben (${city}) *`,
      commentPlaceholder: '5. Kommentar zur Bestellung (optional — Wünsche zu Versand oder Verpackung)',
      totalToShip: 'Gesamtmenge:',
      boxesSuffix: (b: number) => `(~${b} Kist.)`,
      deleteTitle: 'Position löschen',
    },
  }[safeLang];

  const savedRecipient = loadSavedRecipient();
  const [invoiceMeta, setInvoiceMeta] = useState<InvoiceMeta>(() => getOrCreateInvoiceMeta(false));

  const [selectedCity, setSelectedCity] = useState<CityOption>(savedRecipient?.selectedCity || POPULAR_CITIES[0]);
  const [cityQuery, setCityQuery] = useState(savedRecipient?.cityQuery ?? POPULAR_CITIES[0].fullLabel);
  const [cityResults, setCityResults] = useState<CityOption[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);

  const [branchOrComment, setBranchOrComment] = useState(savedRecipient?.branchOrComment || '');
  const [clientName, setClientName] = useState(savedRecipient?.clientName || '');
  const [clientPhone, setClientPhone] = useState(() => savedRecipient?.clientPhone ? formatUkrainePhone(savedRecipient.clientPhone) : '');
  const [orderComment, setOrderComment] = useState(savedRecipient?.orderComment || '');
  const [showValidationErrors, setShowValidationErrors] = useState(false);

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

  useEffect(() => {
    try {
      const payload: SavedRecipientData = { selectedCity, cityQuery, branchOrComment, clientName, clientPhone, orderComment };
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    preloadAppSounds();
  }, []);

  useEffect(() => {
    const trimmed = cityQuery.trim();
    if (trimmed.length < 1 || trimmed === selectedCity.fullLabel) {
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

              collected.push({ name: ru || ua, uaName: ua, fullLabel, ref, area });
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
  }, [cityQuery, selectedCity.fullLabel]);

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
            description: w.Description || w.DescriptionRu || '',
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
  }, [selectedCity]);

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

  const handleSelectCity = (city: CityOption) => {
    triggerHaptic('medium');
    setSelectedCity(city);
    setCityQuery(city.fullLabel);
    setShowCityDropdown(false);
    setBranchOrComment('');
  };

  const handleValidationFail = () => {
    triggerHaptic('error');
    setShowValidationErrors(true);
    logisticsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleClearCart = () => {
    triggerHaptic('warning');
    playAppSound('nul.mp3');
    setInvoiceMeta(getOrCreateInvoiceMeta(true));
    setTimeout(() => onClear(), 150);
  };

  const combinedClientContact = `${clientName.trim()}, тел.: ${clientPhone.trim()}`;

  const buildInvoiceText = () => {
    const lines = items.map((item, idx) => {
      const variantStr = item.shoe.variant ? ` ${item.shoe.variant}` : '';
      const actualFormula = getDynamicFormulaText(item, safeLang);
      return (
        `${idx + 1}. Модель № ${item.shoe.modelNumber}${variantStr} (${item.shoe.color})\n` +
        `   • ${actualFormula}\n` +
        `   • Итого по модели: ${item.totalPairs} пар`
      );
    });

    const trimmedComment = orderComment.trim();
    const commentBlock = trimmedComment ? `💬 Комментарий: ${trimmedComment}\n` : '';

    return (
      `📦 ОПТОВАЯ НАКЛАДНАЯ № ${invoiceMeta.invoiceNumber}\n` +
      `📅 Дата: ${invoiceMeta.dateFormatted} • CARDIO (Харьков)\n` +
      `════════════════════\n` +
      `${lines.join('\n\n')}\n` +
      `════════════════════\n` +
      `📊 Позиций в заказе: ${items.length}\n` +
      `👟 Общий объем: ${grandTotalPairs} пар (мест: ~${grandTotalBoxes})\n` +
      `🏙 Населенный пункт: ${cityQuery.trim()}\n` +
      `📍 Отделение / Адрес: ${branchOrComment.trim()}\n` +
      `👤 Получатель: ${combinedClientContact}\n` +
      commentBlock +
      `════════════════════\n` +
      `Подтвердите наличие/сроки отшива и реквизиты.`
    );
  };

  const sendToManager = async (manager: ManagerContact): Promise<boolean> => {
    if (!manager.telegramId) return false;
    if (!isFormValid) {
      handleValidationFail();
      return false;
    }

    setOrderBanner(null);
    const text = buildInvoiceText();
    const trimmedComment = orderComment.trim();

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: invoiceMeta.invoiceNumber,
          telegramId: manager.telegramId,
          managerName: manager.name,
          clientContact: combinedClientContact,
          branchOrComment: trimmedComment
            ? `${cityQuery.trim()} — ${branchOrComment.trim()} (Комментарий: ${trimmedComment})`
            : `${cityQuery.trim()} — ${branchOrComment.trim()}`,
          orderComment: trimmedComment,
          totalPairs: grandTotalPairs,
          deliveryCost: 0,
          invoiceText: text,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        triggerHaptic('success');
        setOrderBanner({
          type: 'success',
          text: `✓ Накладная № ${invoiceMeta.invoiceNumber} успешно отправлена руководителю (${manager.name})!`,
        });
        return true;
      } else {
        triggerHaptic('error');
        setOrderBanner({ type: 'error', text: `Ошибка отправки: ${data.error || 'Не удалось отправить заказ'}` });
        return false;
      }
    } catch {
      triggerHaptic('error');
      setOrderBanner({ type: 'error', text: 'Ошибка соединения с сервером.' });
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

  const getFieldStyle = (isValid: boolean): React.CSSProperties => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 46px 11px 12px',
    border: `1px solid ${showValidationErrors && !isValid ? THEME.danger : THEME.border}`,
    fontSize: '13px',
    backgroundColor: showValidationErrors && !isValid ? '#FDF6F6' : THEME.surface,
    color: THEME.ink,
    WebkitTextFillColor: THEME.ink,
    caretColor: THEME.ink,
    colorScheme: 'light',
    outline: 'none',
    borderRadius: 0,
    fontFamily: THEME.sans,
  });

  return (
    <div
      className="wholesale-cart-light"
      style={{
        backgroundColor: THEME.bg,
        minHeight: '100vh',
        padding: '18px 16px 60px 16px',
        color: THEME.ink,
        fontFamily: THEME.sans,
        colorScheme: 'light',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: `1px solid ${THEME.border}`,
        }}
      >
        <button
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

        {items.length > 0 && (
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
          {items.length > 0 && (
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
              № {invoiceMeta.invoiceNumber} от {invoiceMeta.dateFormatted}
            </span>
          )}
        </div>
        <h1
          style={{
            fontFamily: THEME.serif,
            fontSize: '32px',
            margin: 0,
            fontWeight: 400,
            letterSpacing: '0.2px',
          }}
        >
          {t.title(items.length)}
        </h1>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            backgroundColor: THEME.surface,
            border: `1px solid ${THEME.border}`,
            padding: '48px 20px',
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
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: THEME.ink,
              color: '#FFFFFF',
              border: 'none',
              fontSize: '10px',
              letterSpacing: '1.4px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {t.goToCatalog}
          </button>
        </div>
      ) : (
        <>
          <div style={{ borderTop: `1px solid ${THEME.border}`, marginBottom: '24px' }}>
            {items.map((item, idx) => {
              const isSample = item.orderMode === 'sample';
              const canDecrease = item.boxesCount > 1;
              const actualFormula = getDynamicFormulaText(item, safeLang);

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
                      backgroundColor: THEME.bg,
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
                        № {item.shoe.modelNumber} {item.shoe.variant || ''}
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
                          width: '36px',
                          height: '36px',
                          margin: '-8px -8px -8px 0',
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
                      {item.shoe.color} • {item.shoe.category}
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
                        {t.totalPairsLabel} <strong>{item.totalPairs} пар</strong>
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
                    backgroundColor: '#FDF2F2',
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
                {t.cityPrompt} <strong style={{ fontFamily: THEME.serif, fontSize: '14px' }}>{selectedCity.fullLabel}</strong>
              </div>
              <div style={{ fontSize: '11px', color: THEME.inkMuted, marginBottom: '10px', lineHeight: 1.35 }}>
                {t.citySub}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
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
                        border: `1px solid ${isSelected ? THEME.ink : THEME.border}`,
                        backgroundColor: isSelected ? THEME.ink : THEME.bg,
                        color: isSelected ? '#FFFFFF' : THEME.ink,
                        cursor: 'pointer',
                        letterSpacing: '0.5px',
                        fontWeight: isSelected ? 600 : 400,
                        touchAction: 'manipulation',
                      }}
                    >
                      {safeLang === 'uk' ? city.uaName : city.name}
                    </button>
                  );
                })}
              </div>

              <div ref={cityBoxRef} style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  ref={cityInputRef}
                  type="text"
                  placeholder={t.cityPlaceholder}
                  value={cityQuery}
                  onFocus={() => setShowCityDropdown(true)}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setShowCityDropdown(true);
                  }}
                  style={getFieldStyle(isCityValid)}
                />

                {cityQuery.length > 0 && (
                  <ClearFieldButton
                    ariaLabel="Очистить город"
                    onClear={() => {
                      setCityQuery('');
                      setCityResults([]);
                      setShowCityDropdown(true);
                      cityInputRef.current?.focus();
                    }}
                  />
                )}

                {showCityDropdown && cityQuery.trim().length >= 1 && cityQuery.trim() !== selectedCity.fullLabel && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 30,
                      backgroundColor: THEME.surface,
                      border: `1px solid ${THEME.border}`,
                      maxHeight: '220px',
                      overflowY: 'auto',
                      WebkitOverflowScrolling: 'touch',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                    }}
                  >
                    {citySearching ? (
                      <div style={{ padding: '10px 12px', fontSize: '12px', color: THEME.inkMuted }}>
                        Поиск...
                      </div>
                    ) : cityResults.length === 0 ? (
                      <div style={{ padding: '10px 12px', fontSize: '12px', color: THEME.inkMuted }}>
                        Не найдено / Nicht gefunden
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

              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  ref={nameInputRef}
                  type="text"
                  placeholder={t.namePlaceholder}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={getFieldStyle(isNameValid)}
                />
                {clientName.length > 0 && (
                  <ClearFieldButton
                    ariaLabel="Очистить имя"
                    onClear={() => {
                      setClientName('');
                      nameInputRef.current?.focus();
                    }}
                  />
                )}
              </div>

              <div style={{ marginBottom: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    inputMode="tel"
                    placeholder={t.phonePlaceholder}
                    value={clientPhone}
                    onChange={(e) => setClientPhone(formatUkrainePhone(e.target.value))}
                    style={getFieldStyle(isPhoneValid)}
                  />
                  {clientPhone.length > 0 && (
                    <ClearFieldButton
                      ariaLabel="Очистить телефон"
                      onClear={() => {
                        setClientPhone('');
                        phoneInputRef.current?.focus();
                      }}
                    />
                  )}
                </div>
                {phoneValidation.errorHint && (showValidationErrors || clientPhone.length >= 7) && (
                  <div style={{ fontSize: '10px', color: THEME.danger, marginTop: '4px', lineHeight: 1.3 }}>
                    {phoneValidation.errorHint}
                  </div>
                )}
              </div>

              <div ref={warehouseBoxRef} style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  ref={warehouseInputRef}
                  type="text"
                  placeholder={
                    warehousesLoading
                      ? t.warehouseLoading
                      : t.warehousePlaceholder(selectedCity.uaName)
                  }
                  value={branchOrComment}
                  onFocus={() => setShowWarehouseDropdown(true)}
                  onChange={(e) => {
                    setBranchOrComment(e.target.value);
                    setShowWarehouseDropdown(true);
                  }}
                  style={getFieldStyle(isBranchValid)}
                />

                {branchOrComment.length > 0 && (
                  <ClearFieldButton
                    ariaLabel="Очистить отделение"
                    onClear={() => {
                      setBranchOrComment('');
                      setShowWarehouseDropdown(true);
                      warehouseInputRef.current?.focus();
                    }}
                  />
                )}

                {showWarehouseDropdown && filteredWarehouses.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 25,
                      backgroundColor: THEME.surface,
                      border: `1px solid ${THEME.border}`,
                      maxHeight: '210px',
                      overflowY: 'auto',
                      WebkitOverflowScrolling: 'touch',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
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

              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <textarea
                  ref={commentInputRef}
                  rows={2}
                  placeholder={t.commentPlaceholder}
                  value={orderComment}
                  onChange={(e) => setOrderComment(e.target.value)}
                  style={{
                    ...getFieldStyle(true),
                    resize: 'vertical',
                    minHeight: '54px',
                    lineHeight: 1.4,
                  }}
                />
                {orderComment.length > 0 && (
                  <ClearFieldButton
                    isTextarea
                    ariaLabel="Очистить комментарий"
                    onClear={() => {
                      setOrderComment('');
                      commentInputRef.current?.focus();
                    }}
                  />
                )}
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
                  {grandTotalPairs} пар <span style={{ fontSize: '12px', fontWeight: 400, color: THEME.inkMuted }}>{t.boxesSuffix(grandTotalBoxes)}</span>
                </div>
              </div>
            </div>
          </div>

          {orderBanner && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                border: `1px solid ${orderBanner.type === 'success' ? THEME.accentGreen : THEME.danger}`,
                backgroundColor: orderBanner.type === 'success' ? '#EFF5F0' : '#FDF2F2',
                color: orderBanner.type === 'success' ? THEME.accentGreen : THEME.danger,
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {orderBanner.text}
            </div>
          )}

          <div className="managers-contact-scope">
            <ManagersContactCard
              lang={safeLang}
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
