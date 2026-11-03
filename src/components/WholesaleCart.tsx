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

// Быстрые кнопки популярных городов (с официальными Ref Новой Почты)
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

// Безопасный запрос к Новой Почте через серверный прокси /api/np
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

// Генерация вариантов написания (чтобы ввод «миколаив» или «николаев» находил в базе НП «Миколаїв»)
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

  // 1. Поиск любых населенных пунктов Украины через /api/np -> Новая Почта
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

  // 2. Загрузка реальных отделений и почтоматов Новой Почты для выбранного города
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

  // 3. Расчет стоимости доставки через API Новой Почты
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
          setDeliveryCost(Number(data.data[0].Cost));
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

  // Фильтрация реальных отделений НП (точное совпадение номера всегда первым)
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
      `🚚 Доставка НП: ${selectedCity.fullLabel} (≈ ${deliveryCost} ₴)` +
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
          deliveryCost: deliveryCost,
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
    border: '1px solid #BDBDBD',
    fontSize: '15px',
    backgroundColor: '#FFFFFF',
    color: '#111111',
    WebkitTextFillColor: '#111111',
    caretColor: '#111111',
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
          color: #111111 !important;
          -webkit-text-fill-color: #111111 !important;
          caret-color: #111111 !important;
          background-color: #FFFFFF !important;
          opacity: 1 !important;
        }
        .wholesale-cart-light input::placeholder {
          color: #777777 !important;
          -webkit-text-fill-color: #777777 !important;
          opacity: 1 !important;
        }
      `}</style>

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
            border: '1px solid #CCC',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#1A1A1A',
          }}
        >
          ← Добавить еще модели
        </button>

        {items.length > 0 && (
          <button
            onClick={onClear}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '12px',
              color: '#B91C1C',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Очистить всё
          </button>
        )}
      </div>

      <h1 style={{ fontFamily: 'serif', fontSize: '26px', margin: '0 0 14px 0', fontWeight: 600 }}>
        Оптовая накладная ({items.length})
      </h1>

      {items.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EAE8E3',
            padding: '32px 16px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '14px', color: '#666', margin: '0 0 16px 0' }}>
            В вашем оптовом заказе пока нет выбранных моделей.
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              backgroundColor: '#1A1A1A',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Перейти в каталог
          </button>
        </div>
      ) : (
        <>
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
                      width: '68px',
                      height: '68px',
                      objectFit: 'contain',
                      border: '1px solid #F0EFEA',
                      flexShrink: 0,
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'serif' }}>
                      {idx + 1}. Модель № {item.shoe.modelNumber} {item.shoe.variant || ''}
                    </div>
                    <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
                      Цвет: <strong>{item.shoe.color}</strong> ({item.shoe.category})
                    </div>
                    <div style={{ fontSize: '11px', color: '#333', marginTop: '4px', lineHeight: 1.35 }}>
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
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>
                        Итого: {item.totalPairs} пар
                      </span>

                      {!isSample && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#666' }}>Ростовок:</span>
                          <button
                            onClick={() => onUpdateQuantity(item.uid, item.boxesCount - 1)}
                            style={{
                              width: '24px',
                              height: '24px',
                              border: '1px solid #CCC',
                              backgroundColor: '#FAF9F6',
                              color: '#1A1A1A',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            −
                          </button>
                          <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>
                            {item.boxesCount}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.uid, item.boxesCount + 1)}
                            style={{
                              width: '24px',
                              height: '24px',
                              border: '1px solid #CCC',
                              backgroundColor: '#FAF9F6',
                              color: '#1A1A1A',
                              cursor: 'pointer',
                              fontWeight: 700,
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
                      background: '#FAF9F6',
                      border: '1px solid #DDD',
                      width: '30px',
                      height: '30px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#555',
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

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E2DC',
              padding: '14px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>
              📦 Логистика всей партии (из Харькова)
            </div>

            <div style={{ fontSize: '13px', color: '#222', marginBottom: '8px' }}>
              Населенный пункт получателя: <strong>{selectedCity.fullLabel}</strong>
            </div>

            {/* Быстрые кнопки популярных городов */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
              {POPULAR_CITIES.map((city) => {
                const isSelected = selectedCity.ref === city.ref;
                return (
                  <button
                    key={city.ref}
                    type="button"
                    onClick={() => handleSelectCity(city)}
                    style={{
                      padding: '5px 9px',
                      fontSize: '11px',
                      border: isSelected ? '1px solid #1A1A1A' : '1px solid #DDD',
                      backgroundColor: isSelected ? '#1A1A1A' : '#FAF9F6',
                      color: isSelected ? '#FFFFFF' : '#333',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {city.name}
                  </button>
                );
              })}
            </div>

            {/* Поле живого поиска города через /api/np */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="🔍 Введите город или село (поиск Новой Почты)..."
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
                    fontSize: '14px',
                    color: '#777',
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
                      border: '1px solid #1A1A1A',
                      maxHeight: '240px',
                      overflowY: 'auto',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    {citySearching ? (
                      <div style={{ padding: '10px 12px', fontSize: '13px', color: '#444' }}>
                        Поиск в базе Новой Почты...
                      </div>
                    ) : cityResults.length === 0 ? (
                      <div style={{ padding: '10px 12px', fontSize: '13px', color: '#666' }}>
                        Населенный пункт не найден в базе НП
                      </div>
                    ) : (
                      cityResults.map((c) => (
                        <div
                          key={c.ref}
                          onMouseDown={() => handleSelectCity(c)}
                          style={{
                            padding: '10px 12px',
                            fontSize: '13px',
                            borderBottom: '1px solid #F0EFEA',
                            cursor: 'pointer',
                            color: '#111111',
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
                placeholder="Ваше Имя и Телефон (для накладной)..."
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Выбор реального отделения НП */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder={
                  warehousesLoading
                    ? `Загрузка отделений НП (${selectedCity.uaName})...`
                    : warehouses.length > 0
                    ? `№ отделения или улица в ${selectedCity.uaName} (отделений: ${warehouses.length})...`
                    : '№ отделения Новой Почты или комментарий...'
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
                    fontSize: '14px',
                    color: '#777',
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
                    border: '1px solid #1A1A1A',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
                        padding: '9px 12px',
                        fontSize: '12px',
                        borderBottom: '1px solid #F0EFEA',
                        cursor: 'pointer',
                        color: '#111111',
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
                paddingTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '13px', color: '#333' }}>
                Всего: <strong>{grandTotalPairs} пар</strong> (~{grandTotalBoxes} ящ.)
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>
                {calcLoading ? 'Расчет...' : `Доставка ≈ ${deliveryCost} ₴`}
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #1A1A1A',
              padding: '14px',
              marginBottom: '32px',
            }}
          >
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#555', marginBottom: '10px', fontWeight: 700 }}>
              Отправить готовую накладную ({items.length} мод.):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {MANAGERS.map((mgr, idx) => (
                <button
                  key={idx}
                  onClick={() => sendToManager(mgr)}
                  style={{
                    width: '100%',
                    padding: '13px',
                    backgroundColor: idx === 0 ? '#1A1A1A' : '#333333',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  ✈️ {mgr.label}
                </button>
              ))}

              <button
                onClick={copyInvoice}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#FAF9F6',
                  color: '#1A1A1A',
                  border: '1px solid #CCC',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {copied ? '✓ Накладная скопирована!' : '📋 Скопировать накладную (для Viber / Telegram)'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
