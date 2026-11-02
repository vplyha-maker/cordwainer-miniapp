import { useState, useEffect } from 'react';
import { type CartItem } from '../data/catalog';

type WholesaleCartProps = {
  items: CartItem[];
  onUpdateQuantity: (uid: string, newBoxesCount: number) => void;
  onRemove: (uid: string) => void;
  onClear: () => void;
  onClose: () => void;
};

// 👇 ВПИШИТЕ СЮДА TELEGRAM-ЮЗЕРНЕЙМЫ (без @) ДВУХ РУКОВОДИТЕЛЕЙ
const MANAGERS = [
  { label: 'Отправить заказ • ГЕОРГИЙ', username: 'USERNAME_BOSS_1' },
  { label: 'Отправить заказ • БОРИС', username: 'USERNAME_BOSS_2' },
];

const NP_API_KEY = '';
const KHARKIV_CITY_REF = 'db5c88e0-391c-11dd-90d9-001a92567626';

const RECIPIENT_CITIES = [
  { name: 'Киев', ref: '8d5a980d-391c-11dd-90d9-001a92567626', zoneMultiplier: 1 },
  { name: 'Днепр', ref: 'db5c88f0-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.9 },
  { name: 'Одесса', ref: 'db5c88d0-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
  { name: 'Львов', ref: 'db5c88f5-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.1 },
  { name: 'Полтава', ref: 'db5c8892-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.85 },
  { name: 'Запорожье', ref: 'db5c88c6-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.95 },
  { name: 'Винница', ref: 'db5c88de-391c-11dd-90d9-001a92567626', zoneMultiplier: 1.05 },
  { name: 'Харьков (по городу)', ref: 'db5c88e0-391c-11dd-90d9-001a92567626', zoneMultiplier: 0.7 },
];

export function WholesaleCart({ items, onUpdateQuantity, onRemove, onClear, onClose }: WholesaleCartProps) {
  const [selectedCity, setSelectedCity] = useState(RECIPIENT_CITIES[0]);
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

    if (!NP_API_KEY) {
      setDeliveryCost(calculateFallback());
      return;
    }

    let cancelled = false;
    setCalcLoading(true);

    fetch('https://api.novaposhta.ua/v2.0/json/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: NP_API_KEY,
        modelName: 'InternetDocument',
        calledMethod: 'getDocumentPrice',
        methodProperties: {
          CitySender: KHARKIV_CITY_REF,
          CityRecipient: selectedCity.ref,
          Weight: String(totalWeight),
          ServiceType: 'WarehouseWarehouse',
          Cost: String(grandTotalPairs * 1500),
          CargoType: 'Cargo',
          SeatsAmount: String(grandTotalBoxes),
        },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success && data?.data?.[0]?.Cost) {
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
      `🚚 Доставка НП: г. ${selectedCity.name} (≈ ${deliveryCost} ₴)` +
      `${contactLine}${branchLine}\n` +
      `════════════════════\n` +
      `Подтвердите наличие/сроки отшива и реквизиты.`
    );
  };

  const sendToManager = (username: string) => {
    const clean = username.replace('@', '').trim();
    const text = encodeURIComponent(buildInvoiceText());
    window.open(`https://t.me/${clean}?text=${text}`, '_blank');
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

  return (
    <div
      style={{
        backgroundColor: '#F7F6F2',
        minHeight: '100vh',
        padding: '16px',
        color: '#1A1A1A',
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
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>
              📦 Логистика всей партии (из Харькова)
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: '#444', minWidth: '105px' }}>Город НП:</span>
              <select
                value={selectedCity.name}
                onChange={(e) => {
                  const found = RECIPIENT_CITIES.find((c) => c.name === e.target.value);
                  if (found) setSelectedCity(found);
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid #CCC',
                  backgroundColor: '#FAF9F6',
                  color: '#1A1A1A',
                  fontSize: '13px',
                }}
              >
                {RECIPIENT_CITIES.map((city) => (
                  <option key={city.name} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              placeholder="Ваше Имя и Телефон (для накладной)..."
              value={clientContact}
              onChange={(e) => setClientContact(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 10px',
                marginBottom: '8px',
                border: '1px solid #DDD',
                fontSize: '13px',
                backgroundColor: '#FAF9F6',
                color: '#1A1A1A',
              }}
            />

            <input
              type="text"
              placeholder="№ отделения Новой Почты или комментарий..."
              value={branchOrComment}
              onChange={(e) => setBranchOrComment(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 10px',
                marginBottom: '12px',
                border: '1px solid #DDD',
                fontSize: '13px',
                backgroundColor: '#FAF9F6',
                color: '#1A1A1A',
              }}
            />

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
                  onClick={() => sendToManager(mgr.username)}
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
