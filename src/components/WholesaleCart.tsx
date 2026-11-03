import { useState, useEffect } from 'react';
import { type CartItem } from '../data/catalog';
import { ManagersContactCard } from './ManagersContactCard';

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

const MANAGERS = [
  { label: 'Отправить заказ • Борис', telegramId: '8529254699', name: 'Борис' },
  { label: 'Отправить заказ • Георгий', telegramId: '6034597342', name: 'Георгий' },
  { label: 'Отправить заказ • Test', telegramId: '8686072747', name: 'Test' },
];

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

  const [branchOrComment, setBranchOrComment] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [deliveryCost, setDeliveryCost] = useState<number>(0);
  const [calcLoading, setCalcLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const grandTotalPairs = items.reduce((sum, item) => sum + item.totalPairs, 0);
  const grandTotalBoxes = Math.max(1, Math.ceil(grandTotalPairs / 8));

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
          // Округляем до целого числа, чтобы избежать дробных сумм вроде 337.5
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
    setSelectedCity(city);
    setCityQuery(city.fullLabel);
    setShowCityDropdown(false);
    setBranchOrComment('');
  };

  const buildInvoiceText = () => {
    const lines = items.map((item, idx) => {
      const variantStr = item.shoe.variant ? ` ${item.shoe.variant}` : '';
      return (
        `${idx + 1}. Модель № ${item.shoe.modelNumber}${variantStr} (${item.shoe.color})\n` +
        `   • ${item.formulaText}\n` +
        `   • Итого по модели: ${item.totalPairs} пар`
      );
    });

    const contactLine = clientContact.trim() ? `\n👤 Клиент: ${clientContact.trim()}` : '';
    const branchLine = branchOrComment.trim() ? `\n📍 Отделение / Прим.: ${branchOrComment.trim()}` : '';

    return (
      `📦 ОПТОВЫЙ ЗАКАЗ • CARDIO (Харьков)\n` +
      `════════════════════\n` +
      `${lines.join('\n\n')}\n` +
      `════════════════════\n` +
      `📊 Позиций в заказе: ${items.length}\n` +
      `👟 Общий объем: ${grandTotalPairs} пар (мест НП: ~${grandTotalBoxes})\n` +
      `🚚 Доставка НП: ${selectedCity.fullLabel} (≈ ${Math.round(deliveryCost)} ₴)` +
      `${contactLine}${branchLine}\n` +
      `════════════════════\n` +
      `Подтвердите наличие/сроки отшива и реквизиты.`
    );
  };

  const sendToManager = async (manager: { label: string; telegramId: string; name: string }) => {
    if (!manager.telegramId) return;
    const text = buildInvoiceText();

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: manager.telegramId,
          managerName: manager.name,
          clientContact: clientContact,
          branchOrComment: branchOrComment,
          totalPairs: grandTotalPairs,
          deliveryCost: Math.round(deliveryCost), // Гарантированно отправляем целое число в базу данных
          invoiceText: text,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('✓ Заказ успешно отправлен руководителю и сохранен в базу!');
      } else {
        alert(`Ошибка отправки: ${data.error || 'Не удалось отправить'}`);
      }
    } catch {
      alert('Ошибка соединения с сервером.');
    }
  };

  const copyInvoice = async () => {
    try {
      await navigator.clipboard.writeText(buildInvoiceText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 34px 10px 12px',
    border: '1px solid #D6D3CB',
    fontSize: '14px',
    backgroundColor: '#FFFFFF',
    color: '#1A1A1A',
    WebkitTextFillColor: '#1A1A1A',
    caretColor: '#1A1A1A',
    colorScheme: 'light',
    outline: 'none',
  };

  return (
    <div
      className="wholesale-cart-light"
      style={{
        backgroundColor: '#F7F6F2',
        minHeight: '100vh',
        padding: '16px',
        color: '#1A1A1A',
        colorScheme: 'light',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        .wholesale-cart-light input,
        .wholesale-cart-light select,
        .wholesale-cart-light textarea {
          color-scheme: light !important;
          color: #1A1A1A !important;
          -webkit-text-fill-color: #1A1A1A !important;
          caret-color: #1A1A1A !important;
          background-color: #FFFFFF !important;
          opacity: 1 !important;
        }
        .wholesale-cart-light input::placeholder {
          color: #888888 !important;
          -webkit-text-fill-color: #888888 !important;
          opacity: 1 !important;
        }
      `}</style>

      {/* Шапка корзины */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #E2DFD7',
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: '#FFFFFF',
            border: '1px solid #D6D3CB',
            padding: '8px 14px',
            fontSize: '11px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            fontWeight: 500,
            cursor: 'pointer',
            color: '#1A1A1A',
          }}
        >
          ← Каталог
        </button>

        {items.length > 0 && (
          <button
            onClick={onClear}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '11px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: '#888',
              cursor: 'pointer',
            }}
          >
            Очистить
          </button>
        )}
      </div>

      <h1 style={{ fontFamily: 'serif', fontSize: '24px', margin: '0 0 16px 0', fontWeight: 500, letterSpacing: '0.5px' }}>
        Оптовая накладная ({items.length})
      </h1>

      {items.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EAE8E3',
            padding: '40px 16px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 16px 0', letterSpacing: '0.3px' }}>
            В вашем оптовом заказе пока нет выбранных моделей.
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '12px 20px',
              backgroundColor: '#1A1A1A',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '11px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Перейти в каталог
          </button>
        </div>
      ) : (
        <>
          {/* Список товаров */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {items.map((item, idx) => {
              const isSample = item.orderMode === 'sample';

              return (
                <div
                  key={item.uid}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EAE8E3',
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
                      width: '64px',
                      height: '64px',
                      objectFit: 'contain',
                      border: '1px solid #F0EFEA',
                      flexShrink: 0,
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'serif', letterSpacing: '0.3px' }}>
                      {idx + 1}. Модель № {item.shoe.modelNumber} {item.shoe.variant || ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                      Цвет: <strong>{item.shoe.color}</strong> ({item.shoe.category})
                    </div>
                    <div style={{ fontSize: '11px', color: '#444', marginTop: '4px', lineHeight: 1.35 }}>
                      {item.formulaText}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '8px',
                        borderTop: '1px dashed #EAE8E3',
                        paddingTop: '6px',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.3px' }}>
                        Итого: {item.totalPairs} пар
                      </span>

                      {!isSample && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', color: '#888' }}>Коробов:</span>
                          <button
                            onClick={() => onUpdateQuantity(item.uid, item.boxesCount - 1)}
                            style={{
                              width: '22px',
                              height: '22px',
                              border: '1px solid #D6D3CB',
                              backgroundColor: '#FAF9F6',
                              color: '#1A1A1A',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '12px',
                            }}
                          >
                            −
                          </button>
                          <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '16px', textAlign: 'center' }}>
                            {item.boxesCount}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.uid, item.boxesCount + 1)}
                            style={{
                              width: '22px',
                              height: '22px',
                              border: '1px solid #D6D3CB',
                              backgroundColor: '#FAF9F6',
                              color: '#1A1A1A',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '12px',
                            }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onRemove(item.uid)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#999',
                      flexShrink: 0,
                    }}
                    title="Удалить позицию"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Блок логистики */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2DFD7',
              padding: '14px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', marginBottom: '10px' }}>
              Логистика отправки (Харьков)
            </div>

            <div style={{ fontSize: '12px', color: '#333', marginBottom: '8px' }}>
              Пункт назначения: <strong>{selectedCity.fullLabel}</strong>
            </div>

            {/* Быстрые города */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
              {POPULAR_CITIES.map((city) => {
                const isSelected = selectedCity.ref === city.ref;
                return (
                  <button
                    key={city.ref}
                    type="button"
                    onClick={() => handleSelectCity(city)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      border: isSelected ? '1px solid #1A1A1A' : '1px solid #D6D3CB',
                      backgroundColor: isSelected ? '#1A1A1A' : '#FAF9F6',
                      color: isSelected ? '#FFFFFF' : '#444',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 500 : 400,
                      letterSpacing: '0.3px',
                    }}
                  >
                    {city.name}
                  </button>
                );
              })}
            </div>

            {/* Поиск города */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Поиск населенного пункта..."
                value={cityQuery}
                onFocus={() => setShowCityDropdown(true)}
                onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                onChange={(e) => {
                  setCityQuery(e.target.value);
                  setShowCityDropdown(true);
                }}
                style={inputStyle}
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
                    fontSize: '13px',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Очистить"
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
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D6D3CB',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  >
                    {citySearching ? (
                      <div style={{ padding: '10px 12px', fontSize: '12px', color: '#666' }}>
                        Поиск в базе Новой Почты...
                      </div>
                    ) : cityResults.length === 0 ? (
                      <div style={{ padding: '10px 12px', fontSize: '12px', color: '#888' }}>
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
                            borderBottom: '1px solid #F0EFEA',
                            cursor: 'pointer',
                            color: '#1A1A1A',
                            backgroundColor: '#FFFFFF',
                          }}
                        >
                          {c.fullLabel}
                        </div>
                      ))
                    )}
                  </div>
                )}
            </div>

            {/* Контакт клиента */}
            <div style={{ marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Имя и Телефон получателя..."
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Отделение НП */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder={
                  warehousesLoading
                    ? 'Загрузка отделений...'
                    : `№ отделения или адрес в ${selectedCity.uaName}...`
                }
                value={branchOrComment}
                onFocus={() => setShowWarehouseDropdown(true)}
                onBlur={() => setTimeout(() => setShowWarehouseDropdown(false), 200)}
                onChange={(e) => {
                  setBranchOrComment(e.target.value);
                  setShowWarehouseDropdown(true);
                }}
                style={inputStyle}
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
                    fontSize: '13px',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Очистить"
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
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D6D3CB',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                >
                  {filteredWarehouses.map((w) => (
                    <div
                      key={w.ref}
                      onMouseDown={() => {
                        setBranchOrComment(w.description);
                        setShowWarehouseDropdown(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        fontSize: '11px',
                        borderBottom: '1px solid #F0EFEA',
                        cursor: 'pointer',
                        color: '#1A1A1A',
                        backgroundColor: '#FFFFFF',
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
                borderTop: '1px solid #EAE8E3',
                paddingTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '12px', color: '#555' }}>
                Объем: <strong>{grandTotalPairs} пар</strong> (~{grandTotalBoxes} кор.)
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.3px' }}>
                {calcLoading ? 'Расчет...' : `Доставка ≈ ${Math.round(deliveryCost)} ₴`}
              </div>
            </div>
          </div>

          {/* Премиальный блок отправки заказа */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2DFD7',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#777', marginBottom: '12px', fontWeight: 600 }}>
              Передать заказ ({items.length} мод.):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {MANAGERS.map((mgr, idx) => (
                <button
                  key={idx}
                  onClick={() => sendToManager(mgr)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: idx === 0 ? '#1A1A1A' : '#FFFFFF',
                    color: idx === 0 ? '#FFFFFF' : '#1A1A1A',
                    border: '1px solid #1A1A1A',
                    fontSize: '11px',
                    letterSpacing: '0.8px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{mgr.label}</span>
                  <span style={{ fontSize: '13px' }}>→</span>
                </button>
              ))}

              <button
                onClick={copyInvoice}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: 'transparent',
                  color: '#555',
                  border: '1px dashed #D6D3CB',
                  fontSize: '11px',
                  letterSpacing: '0.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                {copied ? '✓ Накладная скопирована в буфер' : '📋 Скопировать текст накладной'}
              </button>
            </div>
          </div>

          {/* Карточка прямой связи с руководством */}
          <ManagersContactCard />
        </>
      )}
    </div>
  );
}
