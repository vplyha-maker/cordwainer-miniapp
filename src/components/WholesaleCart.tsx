import { useState, useEffect, useRef } from 'react';
import { type CartItem } from '../data/catalog';
import {
  ManagersContactCard,
  type ManagerContact,
  triggerHaptic,
  playAppSound,
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
  zoneMultiplier: number;
};

type WarehouseOption = {
  ref: string;
  number: string;
  description: string;
};

const KHARKIV_CITY_REF = 'db5c88e0-391c-11dd-90d9-001a92567626';

const POPULAR_CITIES: CityOption[] = [
  { name: 'Киев', uaName: 'Київ', fullLabel: 'м. Київ (Київська обл.)', ref: '8d5a980d-391c-11dd-90d9-001a92567626', zoneMultiplier: 1 },
  { name: 'Днепр', uaName: 'Дніпро', fullLabel: 'м. Дніпро (Дніпропетровська обл.)', ref: 'db5c88f0-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.9 },
  { name: 'Одесса', uaName: 'Одеса', fullLabel: 'м. Одеса (Одеська обл.)', ref: 'db5c88d0-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
  { name: 'Львов', uaName: 'Львів', fullLabel: 'м. Львів (Львівська обл.)', ref: 'db5c88f5-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.1 },
  { name: 'Харьков', uaName: 'Харків', fullLabel: 'м. Харків (Харківська обл.)', ref: 'db5c88e0-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.7 },
  { name: 'Полтава', uaName: 'Полтава', fullLabel: 'м. Полтава (Полтавська обл.)', ref: 'db5c8892-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.85 },
  { name: 'Запорожье', uaName: 'Запоріжжя', fullLabel: 'м. Запоріжжя (Запорізька обл.)', ref: 'db5c88c6-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.95 },
  { name: 'Винница', uaName: 'Вінниця', fullLabel: 'м. Вінниця (Вінницька обл.)', ref: 'db5c88de-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
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
  serif: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
  sans: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
};

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

export function WholesaleCart({ items, onUpdateQuantity, onRemove, onClear, onClose }: WholesaleCartProps) {
  const [selectedCity, setSelectedCity] = useState<CityOption>(POPULAR_CITIES[0]);
  const [cityQuery, setCityQuery] = useState(POPULAR_CITIES[0].fullLabel);
  const [cityResults, setCityResults] = useState<CityOption[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);

  // Обязательные поля для формирования накладной
  const [branchOrComment, setBranchOrComment] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const [deliveryCost, setDeliveryCost] = useState<number>(0);
  const [calcLoading, setCalcLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const logisticsRef = useRef<HTMLDivElement | null>(null);

  const grandTotalPairs = items.reduce((sum, item) => sum + item.totalPairs, 0);
  const grandTotalBoxes = Math.max(1, Math.ceil(grandTotalPairs / 8));

  // Строгая проверка заполненности всех 4 реквизитов перед формированием накладной
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
                zoneMultiplier: 1,
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

  useEffect(() => {
    if (grandTotalPairs === 0) {
      setDeliveryCost(0);
      return;
    }

    const totalWeight = Math.max(2, Math.round(grandTotalPairs * 1.9));

    const calculateFallback = () => {
      if (grandTotalPairs === 1) {
        return Math.round(95 * selectedCity.zoneMultiplier);
      }
      const base = 140 + (grandTotalPairs - 1) * 13;
      return Math.round(base * selectedCity.zoneMultiplier);
    };

    if (!selectedCity.ref) {
      setDeliveryCost(calculateFallback());
      return;
    }

    let cancelled = false;
    setCalcLoading(true);

    callNovaPoshta('InternetDocument', 'getDocumentPrice', {
      CitySender: KHARKIV_CITY_REF,
      CityRecipient: selectedCity.ref,
      Weight: String(totalWeight),
      ServiceType: 'WarehouseWarehouse',
      Cost: String(grandTotalPairs * 1500),
      CargoType: 'Cargo',
      SeatsAmount: String(grandTotalBoxes),
    })
      .then((data) => {
        if (cancelled) return;
        if (data?.data?.[0]?.Cost) {
          setDeliveryCost(Math.round(Number(data.data[0].Cost)));
        } else {
          setDeliveryCost(calculateFallback());
        }
      })
      .catch(() => {
        if (!cancelled) setDeliveryCost(calculateFallback());
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
    triggerHaptic('light');
    setSelectedCity(city);
    setCityQuery(city.fullLabel);
    setShowCityDropdown(false);
    setBranchOrComment('');
  };

  const handleValidationFail = () => {
    setShowValidationErrors(true);
    logisticsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Аннулирование заказа со звуком nul.mp3 и вибрацией
  const handleClearCart = () => {
    triggerHaptic('warning');
    playAppSound('nul.mp3');
    onClear();
  };

  const combinedClientContact = `${clientName.trim()}, тел.: ${clientPhone.trim()}`;

  const buildInvoiceText = () => {
    const lines = items.map((item, idx) => {
      const variantStr = item.shoe.variant ? ` ${item.shoe.variant}` : '';
      return (
        `${idx + 1}. Модель № ${item.shoe.modelNumber}${variantStr} (${item.shoe.color})\n` +
        `   • ${item.formulaText}\n` +
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
        alert(`✓ Спецификация успешно отправлена руководителю (${manager.name})!`);
        return true;
      } else {
        alert(`Ошибка отправки: ${data.error || 'Не удалось отправить'}`);
        return false;
      }
    } catch {
      alert('Ошибка соединения с сервером.');
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
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

      {/* Верхний колонтитул Бордеро */}
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
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            fontWeight: 500,
            cursor: 'pointer',
            color: THEME.ink,
          }}
        >
          ← В архив моделей
        </button>

        {items.length > 0 && (
          <button
            onClick={handleClearCart}
            style={{
              background: 'none',
              border: `1px solid ${THEME.border}`,
              padding: '5px 10px',
              fontSize: '9px',
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              color: THEME.danger,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✕ Аннулировать список
          </button>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '9px',
            letterSpacing: '1.8px',
            textTransform: 'uppercase',
            color: THEME.inkMuted,
            marginBottom: '4px',
          }}
        >
          ДОКУМЕНТ // ОПТОВОЕ БОРДЕРО
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
          Спецификация заказа ({items.length})
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
            Спецификация пуста. Выберите силуэты в основном архиве.
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
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Открыть архив →
          </button>
        </div>
      ) : (
        <>
          {/* Табличный реестр позиций заказа */}
          <div
            style={{
              borderTop: `1px solid ${THEME.border}`,
              marginBottom: '24px',
            }}
          >
            {items.map((item, idx) => {
              const isSample = item.orderMode === 'sample';

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
                  <img
                    src={item.shoe.image}
                    alt={item.shoe.modelNumber}
                    style={{
                      width: '68px',
                      height: '58px',
                      objectFit: 'contain',
                      flexShrink: 0,
                      mixBlendMode: 'multiply',
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontSize: '16px', fontFamily: THEME.serif }}>
                        <span style={{ fontSize: '10px', color: THEME.inkLight, marginRight: '6px', fontFamily: THEME.sans }}>
                          0{idx + 1}
                        </span>
                        № {item.shoe.modelNumber} {item.shoe.variant || ''}
                      </div>
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          playAppSound('nul.mp3');
                          onRemove(item.uid);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '11px',
                          color: THEME.inkLight,
                          padding: '0 2px',
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
                      {item.formulaText}
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
                        Объем: <strong>{item.totalPairs} пар</strong>
                      </span>

                      {!isSample && (
                        <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${THEME.border}`, backgroundColor: THEME.bg }}>
                          <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.8px', color: THEME.inkMuted, padding: '0 8px' }}>
                            Коробов
                          </span>
                          <button
                            onClick={() => {
                              triggerHaptic('light');
                              onUpdateQuantity(item.uid, item.boxesCount - 1);
                            }}
                            style={{
                              width: '24px',
                              height: '24px',
                              border: 'none',
                              borderLeft: `1px solid ${THEME.border}`,
                              backgroundColor: THEME.surface,
                              color: THEME.ink,
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            −
                          </button>
                          <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '22px', textAlign: 'center' }}>
                            {item.boxesCount}
                          </span>
                          <button
                            onClick={() => {
                              triggerHaptic('light');
                              onUpdateQuantity(item.uid, item.boxesCount + 1);
                            }}
                            style={{
                              width: '24px',
                              height: '24px',
                              border: 'none',
                              borderLeft: `1px solid ${THEME.border}`,
                              backgroundColor: THEME.surface,
                              color: THEME.ink,
                              cursor: 'pointer',
                              fontSize: '12px',
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

          {/* I. БЛОК ЛОГИСТИКИ И ОБЯЗАТЕЛЬНЫХ ПОЛЕЙ ПОЛУЧАТЕЛЯ */}
          <div ref={logisticsRef} style={{ marginBottom: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.6px',
                color: THEME.inkMuted,
                marginBottom: '8px',
              }}
            >
              <span>I. ЛОГИСТИКА И ПОЛУЧАТЕЛЬ (ОБЯЗАТЕЛЬНО)</span>
              <span>НОВА ПОШТА</span>
            </div>

            <div
              style={{
                backgroundColor: THEME.surface,
                border: `1px solid ${showValidationErrors && !isFormValid ? THEME.danger : THEME.border}`,
                padding: '14px',
              }}
            >
              <div style={{ fontSize: '12px', color: THEME.ink, marginBottom: '10px' }}>
                Направление: <strong style={{ fontFamily: THEME.serif, fontSize: '14px' }}>{selectedCity.fullLabel}</strong>
              </div>

              {/* Быстрые города */}
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
                      }}
                    >
                      {city.name}
                    </button>
                  );
                })}
              </div>

              {/* 1. Поиск населенного пункта */}
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="1. Населенный пункт (город) *"
                  value={cityQuery}
                  onFocus={() => setShowCityDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setShowCityDropdown(true);
                  }}
                  style={getFieldStyle(isCityValid)}
                />

                {cityQuery.length > 0 && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
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
                        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                      }}
                    >
                      {citySearching ? (
                        <div style={{ padding: '10px 12px', fontSize: '12px', color: THEME.inkMuted }}>
                          Запрос в реестр Новой Почты...
                        </div>
                      ) : cityResults.length === 0 ? (
                        <div style={{ padding: '10px 12px', fontSize: '12px', color: THEME.inkMuted }}>
                          Населенный пункт не найден
                        </div>
                      ) : (
                        cityResults.map((c) => (
                          <div
                            key={c.ref}
                            onMouseDown={() => handleSelectCity(c)}
                            style={{
                              padding: '9px 12px',
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

              {/* 2. Имя и Фамилия получателя */}
              <div style={{ marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="2. Имя и Фамилия получателя *"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={getFieldStyle(isNameValid)}
                />
              </div>

              {/* 3. Телефон получателя */}
              <div style={{ marginBottom: '8px' }}>
                <input
                  type="tel"
                  placeholder="3. Телефон получателя (+380...) *"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  style={getFieldStyle(isPhoneValid)}
                />
              </div>

              {/* 4. Отделение НП или адрес */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder={
                    warehousesLoading
                      ? 'Загрузка отделений НП...'
                      : `4. № отделения НП или адрес в ${selectedCity.uaName} *`
                  }
                  value={branchOrComment}
                  onFocus={() => setShowWarehouseDropdown(true)}
                  onBlur={() => setTimeout(() => setShowWarehouseDropdown(false), 200)}
                  onChange={(e) => {
                    setBranchOrComment(e.target.value);
                    setShowWarehouseDropdown(true);
                  }}
                  style={getFieldStyle(isBranchValid)}
                />

                {branchOrComment.length > 0 && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
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
                      maxHeight: '200px',
                      overflowY: 'auto',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                    }}
                  >
                    {filteredWarehouses.map((w) => (
                      <div
                        key={w.ref}
                        onMouseDown={() => {
                          triggerHaptic('light');
                          setBranchOrComment(w.description);
                          setShowWarehouseDropdown(false);
                        }}
                        style={{
                          padding: '8px 12px',
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

              {/* Подвал логистики без разрыва строки на знаке гривны ₴ */}
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
                  Партия: <strong style={{ color: THEME.ink }}>{grandTotalPairs} пар</strong> (~{grandTotalBoxes} мест)
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
                  {calcLoading ? 'Расчет тарифа...' : `Логистика ≈ ${Math.round(deliveryCost)}\u00A0₴`}
                </div>
              </div>
            </div>
          </div>

          {/* II. ОБЪЕДИНЕННЫЙ БЛОК ДИРЕКЦИИ (ОТПРАВКА + ЗАЩИТА + ТЕЛ / VIBER / TG + КОПИРОВАНИЕ) */}
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
