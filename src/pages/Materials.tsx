import { useState, useMemo, useEffect } from 'react';
import { cardioCatalog, type ShoeCategory, type ShoeItem } from '../data/catalog';

type MaterialsProps = {
  onBack?: () => void;
};

const CATEGORIES: ('Все' | ShoeCategory)[] = ['Все', 'Ботинки', 'Кроссовки', 'Туфли'];
const FEATURE_FILTERS = ['Все', 'Мех', 'Gore-Tex', 'Подошва трактор'] as const;

// Вставьте сюда ваш ключ из личного кабинета Новой Почты (если пусто — работает встроенный расчет по тарифам НП)
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

export function Materials({ onBack }: MaterialsProps) {
  const [activeCategory, setActiveCategory] = useState<'Все' | ShoeCategory>('Все');
  const [activeFeature, setActiveFeature] = useState<string>('Все');
  const [searchQuery, setSearchQuery] = useState('');

  // Выбранная модель для детального просмотра (модальное окно)
  const [selectedShoe, setSelectedShoe] = useState<ShoeItem | null>(null);

  // Состояния B2B-калькулятора Новой Почты
  const [orderMode, setOrderMode] = useState<'sample' | 'wholesale'>('wholesale');
  const [boxesCount, setBoxesCount] = useState<number>(1); // 1 ростовка = 8 пар
  const [selectedCity, setSelectedCity] = useState(RECIPIENT_CITIES[0]);
  const [deliveryCost, setDeliveryCost] = useState<number | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // Фильтрация каталога
  const filteredShoes = useMemo(() => {
    return cardioCatalog.filter((item) => {
      const matchesCategory = activeCategory === 'Все' || item.category === activeCategory;
      const matchesFeature =
        activeFeature === 'Все' ||
        item.features.some((f) => f.toLowerCase().includes(activeFeature.toLowerCase()));
      const matchesSearch =
        item.modelNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.color.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesFeature && matchesSearch;
    });
  }, [activeCategory, activeFeature, searchQuery]);

  // Все варианты цветов и подошв для открытой модели (как на Pegres)
  const modelVariants = useMemo(() => {
    if (!selectedShoe) return [];
    return cardioCatalog.filter((item) => item.modelNumber === selectedShoe.modelNumber);
  }, [selectedShoe]);

  // Расчет стоимости доставки из Харькова
  useEffect(() => {
    if (!selectedShoe) return;

    const pairs = orderMode === 'sample' ? 1 : boxesCount * 8;
    // Объемный вес: 1 коробка обуви ~2 кг, оптовый ящик на 8 пар ~15 кг объемного веса
    const totalWeight = orderMode === 'sample' ? 2 : boxesCount * 15;
    const seatsAmount = orderMode === 'sample' ? 1 : boxesCount;

    // Резервная формула по тарифам Новой Почты, если API-ключ еще не указан
    const calculateFallback = () => {
      const base = orderMode === 'sample' ? 95 : 160 + (boxesCount - 1) * 95;
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
          Cost: String(pairs * 1500),
          CargoType: 'Cargo',
          SeatsAmount: String(seatsAmount),
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
  }, [selectedShoe, orderMode, boxesCount, selectedCity]);

  return (
    <div style={{ backgroundColor: '#F7F6F2', minHeight: '100vh', padding: '16px', color: '#1A1A1A' }}>
      {/* Шапка */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#777' }}>
            Харьков • B2B Каталог производства
          </span>
          <h1 style={{ fontFamily: 'serif', fontSize: '26px', margin: '2px 0 0 0', fontWeight: 500 }}>
            Cardio Footwear
          </h1>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: '1px solid #CCC',
              padding: '6px 12px',
              fontSize: '11px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              color: '#1A1A1A',
            }}
          >
            Назад
          </button>
        )}
      </div>

      {/* Поиск */}
      <input
        type="text"
        placeholder="Поиск по номеру модели (226, 228...) или цвету..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px 12px',
          marginBottom: '10px',
          border: '1px solid #DDD',
          backgroundColor: '#FFF',
          color: '#1A1A1A',
          fontSize: '13px',
          outline: 'none',
        }}
      />

      {/* Фильтры категорий */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              style={{
                padding: '7px 14px',
                border: isActive ? '1px solid #1A1A1A' : '1px solid #DDD',
                backgroundColor: isActive ? '#1A1A1A' : '#FFF',
                color: isActive ? '#FFF' : '#1A1A1A',
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Быстрые фильтры особенностей (Мех, Gore-Tex, Трактор) */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px' }}>
        {FEATURE_FILTERS.map((feat) => {
          const isActive = activeFeature === feat;
          return (
            <button
              key={feat}
              onClick={() => setActiveFeature(feat)}
              style={{
                padding: '4px 10px',
                border: isActive ? '1px solid #8B6F47' : '1px solid #E2DFD7',
                backgroundColor: isActive ? '#EFECE6' : 'transparent',
                color: '#333',
                fontSize: '11px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {feat === 'Все' ? 'Все сезоны' : feat}
            </button>
          );
        })}
      </div>

      {/* Сетка каталога */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
          gap: '12px',
        }}
      >
        {filteredShoes.map((shoe) => {
          const variantsCount = cardioCatalog.filter((i) => i.modelNumber === shoe.modelNumber).length;
          return (
            <div
              key={shoe.id}
              onClick={() => setSelectedShoe(shoe)}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EAE8E3',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              {shoe.variant && (
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: '#F7F6F2',
                    border: '1px solid #DDD',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}
                >
                  {shoe.variant}
                </span>
              )}

              <img
                src={shoe.image}
                alt={`Модель ${shoe.modelNumber}`}
                loading="lazy"
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  objectFit: 'contain',
                  marginBottom: '10px',
                }}
              />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'serif', fontSize: '17px', fontWeight: 600 }}>
                    № {shoe.modelNumber}
                  </span>
                  <span style={{ fontSize: '11px', color: '#777' }}>{shoe.category}</span>
                </div>

                <div style={{ fontSize: '12px', color: '#444', marginTop: '4px' }}>
                  Цвет: <strong>{shoe.color}</strong>
                </div>

                {shoe.features.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {shoe.features.map((feat) => (
                      <span
                        key={feat}
                        style={{
                          fontSize: '10px',
                          backgroundColor: '#F0EFEA',
                          padding: '2px 6px',
                          color: '#333',
                        }}
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid #F0EFEA',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    color: '#555',
                  }}
                >
                  <span>{variantsCount > 1 ? `Цветов/версий: ${variantsCount}` : '1 исполнение'}</span>
                  <span style={{ fontWeight: 600, color: '#1A1A1A' }}>B2B →</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Детальное окно модели (стиль Pegres + Калькулятор Новой Почты) */}
      {selectedShoe && (
        <div
          onClick={() => setSelectedShoe(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '20px',
              boxSizing: 'border-box',
              borderTopLeftRadius: '14px',
              borderTopRightRadius: '14px',
            }}
          >
            {/* Верхняя панель модалки */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#777', textTransform: 'uppercase' }}>
                  {selectedShoe.category} • Cardio Харьков
                </span>
                <h2 style={{ fontFamily: 'serif', fontSize: '24px', margin: 0 }}>
                  Модель № {selectedShoe.modelNumber} {selectedShoe.variant || ''}
                </h2>
              </div>
              <button
                onClick={() => setSelectedShoe(null)}
                style={{
                  background: '#F7F6F2',
                  border: '1px solid #DDD',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Крупное фото */}
            <img
              src={selectedShoe.image}
              alt={selectedShoe.modelNumber}
              style={{
                width: '100%',
                maxHeight: '280px',
                objectFit: 'contain',
                backgroundColor: '#FFF',
                border: '1px solid #F0EFEA',
                marginBottom: '14px',
              }}
            />

            {/* Переключатель всех расцветок и подошв этой модели (как на Pegres) */}
            {modelVariants.length > 1 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666', marginBottom: '8px' }}>
                  Другие цвета и подошвы модели № {selectedShoe.modelNumber}:
                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {modelVariants.map((v) => {
                    const isCurrent = v.id === selectedShoe.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelectedShoe(v)}
                        style={{
                          border: isCurrent ? '2px solid #1A1A1A' : '1px solid #DDD',
                          padding: '4px',
                          width: '64px',
                          flexShrink: 0,
                          cursor: 'pointer',
                          textAlign: 'center',
                          backgroundColor: '#FFF',
                        }}
                      >
                        <img
                          src={v.image}
                          alt={v.color}
                          style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain' }}
                        />
                        <div style={{ fontSize: '9px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.variant ? `${v.variant} ` : ''}{v.color}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Блок калькулятора Новой Почты (B2B) */}
            <div
              style={{
                backgroundColor: '#F7F6F2',
                border: '1px solid #E5E2DC',
                padding: '14px',
                marginBottom: '14px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
                📦 Расчет доставки «Нова Пошта» (из Харькова)
              </div>

              {/* Переключатель: 1 пара (образец) или Ростовки (опт) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                <button
                  onClick={() => setOrderMode('wholesale')}
                  style={{
                    padding: '8px',
                    fontSize: '12px',
                    border: '1px solid #1A1A1A',
                    backgroundColor: orderMode === 'wholesale' ? '#1A1A1A' : '#FFF',
                    color: orderMode === 'wholesale' ? '#FFF' : '#1A1A1A',
                    cursor: 'pointer',
                  }}
                >
                  Опт (Ростовка 8 пар)
                </button>
                <button
                  onClick={() => setOrderMode('sample')}
                  style={{
                    padding: '8px',
                    fontSize: '12px',
                    border: '1px solid #1A1A1A',
                    backgroundColor: orderMode === 'sample' ? '#1A1A1A' : '#FFF',
                    color: orderMode === 'sample' ? '#FFF' : '#1A1A1A',
                    cursor: 'pointer',
                  }}
                >
                  Образец (1 пара)
                </button>
              </div>

              {/* Выбор города получателя */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#555', minWidth: '90px' }}>Город доставки:</span>
                <select
                  value={selectedCity.name}
                  onChange={(e) => {
                    const found = RECIPIENT_CITIES.find((c) => c.name === e.target.value);
                    if (found) setSelectedCity(found);
                  }}
                  style={{
                    flex: 1,
                    padding: '7px',
                    border: '1px solid #CCC',
                    backgroundColor: '#FFF',
                    fontSize: '12px',
                  }}
                >
                  {RECIPIENT_CITIES.map((city) => (
                    <option key={city.name} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Количество ящиков (если выбран опт) */}
              {orderMode === 'wholesale' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#555', minWidth: '90px' }}>Ящиков (ростовок):</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[1, 2, 3, 5, 10].map((num) => (
                      <button
                        key={num}
                        onClick={() => setBoxesCount(num)}
                        style={{
                          padding: '5px 10px',
                          border: boxesCount === num ? '1px solid #1A1A1A' : '1px solid #CCC',
                          backgroundColor: boxesCount === num ? '#1A1A1A' : '#FFF',
                          color: boxesCount === num ? '#FFF' : '#1A1A1A',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Итог по доставке */}
              <div
                style={{
                  borderTop: '1px solid #DDD',
                  paddingTop: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '12px', color: '#444' }}>
                  Объем: <strong>{orderMode === 'sample' ? '1 пара (2 кг)' : `${boxesCount * 8} пар (${boxesCount} ящ.)`}</strong>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>
                  {calcLoading ? 'Расчет...' : `≈ ${deliveryCost} ₴`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Materials;
