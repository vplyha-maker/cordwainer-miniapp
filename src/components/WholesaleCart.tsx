import { useState, useEffect, useRef } from 'react';
import { type CartItem, type SizeKey } from '../data/catalog';
import {
  ManagersContactCard,
  type ManagerContact,
  triggerHaptic,
  playAppSound,
  preloadAppSounds,
} from './ManagersContactCard';

type WholesaleCartProps = {
  items: CartItem[];
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
};

const KHARKIV_CITY_REF = 'db5c88e0-391c-11dd-90d9-001a92567626'; // Харьков (Отправитель)
const RECIPIENT_STORAGE_KEY = 'cardio_b2b_recipient_v1';
const SIZES_ORDER: SizeKey[] = [40, 41, 42, 43, 44, 45];

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

function getDynamicFormulaText(item: CartItem): string {
  if (item.orderMode === 'sample') {
    return `Тестовый образец (1 пара) — р. ${item.sampleSize}`;
  }
  const breakdown = SIZES_ORDER.filter((sz) => (item.sizeRun[sz] || 0) > 0)
    .map((sz) => `${sz}р.(${(item.sizeRun[sz] || 0) * item.boxesCount})`)
    .join(' • ');

  return `Ростовок ×${item.boxesCount}: ${breakdown}`;
}

async function callNovaPoshta(
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, unknown>
) {
  try {
    const res = await fetch('/api/np', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelName,
        calledMethod,
        methodProperties,
      }),
    });
    const data = await res.json();
    if (data?.success) {
      return data;
    }
  } catch {
    // Ошибка соединения
  }
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
  if (lower.startsWith('никола')) {
    variants.add('Миколаїв');
  }

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

export function WholesaleCart({ items, onUpdateQuantity, onRemove, onClear, onClose }: WholesaleCartProps) {
  const savedRecipient = loadSavedRecipient();

  const [selectedCity, setSelectedCity] = useState<CityOption>(
    savedRecipient?.selectedCity || POPULAR_CITIES[0]
  );
  const [cityQuery, setCityQuery] = useState(
    savedRecipient?.cityQuery ?? POPULAR_CITIES[0].fullLabel
  );
  const [cityResults, setCityResults] = useState<CityOption[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);

  const [branchOrComment, setBranchOrComment] = useState(savedRecipient?.branchOrComment || '');
  const [clientName, setClientName] = useState(savedRecipient?.clientName || '');
  const [clientPhone, setClientPhone] = useState(savedRecipient?.clientPhone || '');
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const [deliveryCost, setDeliveryCost] = useState<number>(0);
  const [calcLoading, setCalcLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [orderBanner, setOrderBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const logisticsRef = useRef<HTMLDivElement | null>(null);
  const cityBoxRef = useRef<HTMLDivElement | null>(null);
  const warehouseBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const payload: SavedRecipientData = {
        selectedCity,
        cityQuery,
        branchOrComment,
        clientName,
        clientPhone,
      };
      localStorage.setItem(RECIPIENT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage errors
    }
  }, [selectedCity, cityQuery, branchOrComment, clientName, clientPhone]);

  useEffect(() => {
    const handlePointerDownOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (cityBoxRef.current && !cityBoxRef.current.contains(target)) {
        setShowCityDropdown(false);
      }
      if (warehouseBoxRef.current && !warehouseBoxRef.current.contains(target)) {
        setShowWarehouseDropdown(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, []);

  const grandTotalPairs = items.reduce((sum, item) => sum + item.totalPairs, 0);
  const grandTotalBoxes = useMemoOrCalcBoxes(items, grandTotalPairs);

  const isCityValid = cityQuery.trim().length >= 2;
  const isBranchValid = branchOrComment.trim().length >= 1;
  const isNameValid = clientName.trim().length >= 3;
  const phoneDigits = clientPhone.replace(/\D/g, '');
  const isPhoneValid = phoneDigits.length >= 9;

  const isFormValid = isCityValid && isBranchValid && isNameValid && isPhoneValid;

  const missingFields: string[] = [];
  if (!isCityValid) missingFields.push('город');
  if (!isNameValid) missingFields.push('Имя и Фамилию');
  if (!isPhoneValid) missingFields.push('телефон');
  if (!isBranchValid) missingFields.push('№ отделения / адрес НП');

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
          const dataCities = await callNovaPoshta('Address', 'getCities', {
            FindByString: queryStr,
            Limit: '50',
          });

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

              collected.push({
                name: ru || ua,
                uaName: ua,
                fullLabel,
                ref,
                area,
              });
            }
          }

          if (collected.length > 0) {
            break;
          }
        }

        if (!cancelled) {
          setCityResults(collected);
        }
      } catch {
        if (!cancelled) {
          setCityResults([]);
        }
      } finally {
        if (!cancelled) {
          setCitySearching(false);
        }
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
        const dataWh = await callNovaPoshta('Address', 'getWarehouses', {
          CityRef: selectedCity.ref,
        });

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

  // Запрос актуальной стоимости доставки из API Новой Почты с фоллбеком по зонам
  useEffect(() => {
    if (grandTotalPairs === 0) {
      setDeliveryCost(0);
      return;
    }

    const totalWeight = Math.max(3, Math.round(grandTotalPairs * 1.9)); // ~1.9 кг на 1 пару обуви в коробе
    const declaredCost = grandTotalPairs * 1500; // Оценочная стоимость

    // Умный автономный расчет с учетом географических зон Украины (если API недоступно)
    const calculateSmartFallback = () => {
      let regionalMultiplier = 1.0; // По умолчанию центр
      const label = (selectedCity.fullLabel || '').toLowerCase();
      
      if (label.includes('львівськ') || label.includes('тернопільськ') || label.includes('івано-франківськ') || label.includes('закарпатськ') || label.includes('волинськ') || label.includes('рівненськ') || label.includes('чернівецьк')) {
        regionalMultiplier = 1.22; // Западная Украина (дальше от Харькова)
      } else if (label.includes('одеськ') || label.includes('миколаївськ') || label.includes('херсонськ') || label.includes('запорізьк')) {
        regionalMultiplier = 1.15; // Юг
      } else if (label.includes('харківськ')) {
        regionalMultiplier = 0.85; // Область отправки
      }

      const base = 120 + grandTotalBoxes * 145;
      return Math.round(base * regionalMultiplier);
    };

    if (!selectedCity.ref || selectedCity.ref === KHARKIV_CITY_REF) {
      if (selectedCity.ref === KHARKIV_CITY_REF) {
        setDeliveryCost(Math.round(95 + grandTotalBoxes * 110));
      } else {
        setDeliveryCost(calculateSmartFallback());
      }
      return;
    }

    let cancelled = false;
    setCalcLoading(true);

    callNovaPoshta('InternetDocument', 'getDocumentPrice', {
      CitySender: KHARKIV_CITY_REF,
      CityRecipient: selectedCity.ref,
      Weight: String(totalWeight),
      ServiceType: 'WarehouseWarehouse',
      Cost: String(declaredCost),
      CargoType: 'Cargo',
      SeatsAmount: String(grandTotalBoxes),
    })
      .then((data) => {
        if (cancelled) return;
        if (data?.data?.[0]?.Cost) {
          setDeliveryCost(Math.round(Number(data.data[0].Cost)));
        } else {
          setDeliveryCost(calculateSmartFallback());
        }
      })
      .catch(() => {
        if (!cancelled) setDeliveryCost(calculateSmartFallback());
      })
      .finally(() => {
        if (!cancelled) setCalcLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [grandTotalPairs, grandTotalBoxes, selectedCity]);

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

      if (digits && num === digits) {
        exactNum.push(w);
      } else if (digits && num.startsWith(digits)) {
        startsNum.push(w);
      } else if (num.includes(q) || desc.includes(q)) {
        byText.push(w);
      }
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
    setTimeout(() => {
      onClear();
    }, 150);
  };

  const combinedClientContact = `${clientName.trim()}, тел.: ${clientPhone.trim()}`;

  const buildInvoiceText = () => {
    const lines = items.map((item, idx) => {
      const variantStr = item.shoe.variant ? ` ${item.shoe.variant}` : '';
      const actualFormula = getDynamicFormulaText(item);
      return (
        `${idx + 1}. Модель № ${item.shoe.modelNumber}${variantStr} (${item.shoe.color})\n` +
        `   • ${actualFormula}\n` +
        `   • Итого по модели: ${item.totalPairs} пар`
      );
    });

    return (
      `📦 ОПТОВЫЙ ЗАКАЗ • CARDIO (Харьков)\n` +
      `════════════════════\n` +
      `${lines.join('\n\n')}\n` +
      `════════════════════\n` +
      `📊 Позиций в заказе: ${items.length}\n` +
      `👟 Общий объем: ${grandTotalPairs} пар (мест НП: ~${grandTotalBoxes})\n` +
      `🚚 Доставка НП: ${cityQuery.trim()} (≈ ${Math.round(deliveryCost)} ₴)\n` +
      `📍 Отделение / Адрес: ${branchOrComment.trim()}\n` +
      `👤 Получатель: ${combinedClientContact}\n` +
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

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: manager.telegramId,
          managerName: manager.name,
          clientContact: combinedClientContact,
          branchOrComment: `${cityQuery.trim()} — ${branchOrComment.trim()}`,
          totalPairs: grandTotalPairs,
          deliveryCost: Math.round(deliveryCost),
          invoiceText: text,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        triggerHaptic('success');
        setOrderBanner({
          type: 'success',
          text: `✓ Заказ успешно отправлен руководителю (${manager.name})!`,
        });
        return true;
      } else {
        triggerHaptic('error');
        setOrderBanner({
          type: 'error',
          text: `Ошибка отправки: ${data.error || 'Не удалось отправить заказ'}`,
        });
        return false;
      }
    } catch {
      triggerHaptic('error');
      setOrderBanner({
        type: 'error',
        text: 'Ошибка соединения с сервером. Скопируйте накладную или попробуйте снова.',
      });
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
    padding: '10px 34px 10px 12px',
    border: `1px solid ${showValidationErrors && !isValid ? THEME.danger : THEME.border}`,
    fontSize: '13px',
    backgroundColor: showValidationErrors && !isValid ? '#FDF6F6' : THEME.surface,
    color: THEME.ink,
    WebkitTextFillColor: THEME.ink,
    caretColor: THEME.ink,
    colorScheme: 'light',
    outline: 'none',
    borderRadius: 0,
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
      <style>{`
        .wholesale-cart-light input,
        .wholesale-cart-light select,
        .wholesale-cart-light textarea {
          color-scheme: light !important;
          color: #161514 !important;
          -webkit-text-fill-color: #161514 !important;
          caret-color: #161514 !important;
          opacity: 1 !important;
        }
        .wholesale-cart-light input::placeholder {
          color: #8C877E !important;
          -webkit-text-fill-color: #8C877E !important;
          opacity: 1 !important;
        }
      `}</style>

      {/* Верхняя шапка накладной */}
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
          ← Назад в каталог
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
            ✕ Очистить накладную
          </button>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '9px',
            letterSpacing: '1.6px',
            textTransform: 'uppercase',
            color: THEME.inkMuted,
            marginBottom: '4px',
          }}
        >
          CARDIO FOOTWEAR // ОПТОВЫЙ ЗАКАЗ
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
          Оптовая накладная ({items.length})
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
            В вашей накладной пока нет выбранных моделей.
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
            Перейти в каталог →
          </button>
        </div>
      ) : (
        <>
          {/* Список выбранных моделей */}
          <div
            style={{
              borderTop: `1px solid ${THEME.border}`,
              marginBottom: '24px',
            }}
          >
            {items.map((item, idx) => {
              const isSample = item.orderMode === 'sample';
              const canDecrease = item.boxesCount > 1;
              const actualFormula = getDynamicFormulaText(item);

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
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
                          fontSize: '12px',
                          color: THEME.inkLight,
                          padding: '2px 4px',
                        }}
                        title="Удалить позицию"
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
                        Итого: <strong>{item.totalPairs} пар</strong>
                      </span>

                      {!isSample && (
                        <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${THEME.border}`, backgroundColor: THEME.bg }}>
                          <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.8px', color: THEME.inkMuted, padding: '0 8px' }}>
                            Коробов
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
                              width: '26px',
                              height: '26px',
                              border: 'none',
                              borderLeft: `1px solid ${THEME.border}`,
                              backgroundColor: THEME.surface,
                              color: canDecrease ? THEME.ink : THEME.border,
                              cursor: canDecrease ? 'pointer' : 'default',
                              fontSize: '13px',
                            }}
                          >
                            −
                          </button>
                          <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '24px', textAlign: 'center' }}>
                            {item.boxesCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              onUpdateQuantity(item.uid, item.boxesCount + 1);
                            }}
                            style={{
                              width: '26px',
                              height: '26px',
                              border: 'none',
                              borderLeft: `1px solid ${THEME.border}`,
                              backgroundColor: THEME.surface,
                              color: THEME.ink,
                              cursor: 'pointer',
                              fontSize: '13px',
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

          {/* I. ДАННЫЕ ДОСТАВКИ И ПОЛУЧАТЕЛЯ */}
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
              <span>I. ДАННЫЕ ПОЛУЧАТЕЛЯ И ДОСТАВКА</span>
              <span>НОВА ПОШТА</span>
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
                  Заполните обязательные поля: <strong>{missingFields.join(', ')}</strong>
                </div>
              )}

              <div style={{ fontSize: '12px', color: THEME.ink, marginBottom: '10px' }}>
                Город доставки: <strong style={{ fontFamily: THEME.serif, fontSize: '14px' }}>{selectedCity.fullLabel}</strong>
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
                        padding: '5px 9px',
                        fontSize: '10px',
                        border: `1px solid ${isSelected ? THEME.ink : THEME.border}`,
                        backgroundColor: isSelected ? THEME.ink : THEME.bg,
                        color: isSelected ? '#FFFFFF' : THEME.ink,
                        cursor: 'pointer',
                        letterSpacing: '0.5px',
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {city.name}
                    </button>
                  );
                })}
              </div>

              {/* 1. Город */}
              <div ref={cityBoxRef} style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="1. Населенный пункт (город) *"
                  value={cityQuery}
                  onFocus={() => setShowCityDropdown(true)}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setShowCityDropdown(true);
                  }}
                  style={getFieldStyle(isCityValid)}
                />

                {cityQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setCityQuery('');
                      setCityResults([]);
                      setShowCityDropdown(true);
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      fontSize: '12px',
                      color: THEME.inkMuted,
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    ✕
                  </button>
                )}

                {showCityDropdown &&
                  cityQuery.trim().length >= 1 &&
                  cityQuery.trim() !== selectedCity.fullLabel && (
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
                          Поиск города в базе Новой Почты...
                        </div>
                      ) : cityResults.length === 0 ? (
                        <div style={{ padding: '10px 12px', fontSize: '12px', color: THEME.inkMuted }}>
                          Населенный пункт не найден
                        </div>
                      ) : (
                        cityResults.map((c) => (
                          <div
                            key={c.ref}
                            onClick={() => handleSelectCity(c)}
                            style={{
                              padding: '10px 12px',
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
              <div style={{ marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="2. Имя и Фамилия получателя *"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={getFieldStyle(isNameValid)}
                />
              </div>

              {/* 3. Телефон */}
              <div style={{ marginBottom: '8px' }}>
                <input
                  type="tel"
                  placeholder="3. Телефон получателя (+380...) *"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  style={getFieldStyle(isPhoneValid)}
                />
              </div>

              {/* 4. Отделение Новой Почты */}
              <div ref={warehouseBoxRef} style={{ position: 'relative', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder={
                    warehousesLoading
                      ? 'Загрузка отделений НП...'
                      : `4. № отделения НП или адрес в ${selectedCity.uaName} *`
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
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setBranchOrComment('');
                      setShowWarehouseDropdown(true);
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      fontSize: '12px',
                      color: THEME.inkMuted,
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    ✕
                  </button>
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
                          padding: '9px 12px',
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
                  Всего: <strong style={{ color: THEME.ink }}>{grandTotalPairs} пар</strong> (~{grandTotalBoxes} кор.)
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
                  {calcLoading ? 'Расчет доставки...' : `Доставка ≈ ${Math.round(deliveryCost)}\u00A0₴`}
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

          <ManagersContactCard
            itemsCount={items.length}
            onSendOrder={sendToManager}
            onCopyInvoice={copyInvoice}
            copied={copied}
            isFormValid={isFormValid}
            missingFields={missingFields}
            onValidationFail={handleValidationFail}
          />
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
    if (item.orderMode === 'sample') {
      samplePairs += item.totalPairs;
    } else {
      wholesaleBoxes += item.boxesCount;
    }
  }

  const sampleBoxes = samplePairs > 0 ? Math.ceil(samplePairs / 8) : 0;
  return Math.max(1, wholesaleBoxes + sampleBoxes);
}

export default WholesaleCart;
