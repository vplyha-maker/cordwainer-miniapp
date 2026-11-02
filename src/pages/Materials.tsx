import { useState, useMemo, useEffect } from 'react';
import { cardioCatalog, type ShoeCategory, type ShoeItem } from '../data/catalog';
import { WholesaleCart, type CartItem } from '../components/WholesaleCart';

type MaterialsProps = {
  onBack?: () => void;
};

const CATEGORIES: ('Все' | ShoeCategory)[] = ['Все', 'Ботинки', 'Кроссовки', 'Туфли'];
const FEATURE_FILTERS = ['Все', 'Мех', 'Gore-Tex', 'Подошва трактор'] as const;

const SIZES = [40, 41, 42, 43, 44, 45] as const;
type SizeKey = (typeof SIZES)[number];

const STANDARD_8_RUN: Record<SizeKey, number> = { 40: 1, 41: 1, 42: 2, 43: 2, 44: 1, 45: 1 };
const EVEN_6_RUN: Record<SizeKey, number> = { 40: 1, 41: 1, 42: 1, 43: 1, 44: 1, 45: 1 };

const CART_STORAGE_KEY = 'cardio_b2b_cart_v1';

export function Materials({ onBack }: MaterialsProps) {
  const [activeCategory, setActiveCategory] = useState<'Все' | ShoeCategory>('Все');
  const [activeFeature, setActiveFeature] = useState<string>('Все');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedShoe, setSelectedShoe] = useState<ShoeItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Загрузка корзины из памяти телефона
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Игнорируем ошибки приватного режима
    }
  }, [cart]);

  // Параметры выбора размеров внутри карточки модели
  const [orderMode, setOrderMode] = useState<'sample' | 'wholesale'>('wholesale');
  const [sizeRun, setSizeRun] = useState<Record<SizeKey, number>>(STANDARD_8_RUN);
  const [sampleSize, setSampleSize] = useState<SizeKey>(42);
  const [boxesCount, setBoxesCount] = useState<number>(1);

  useEffect(() => {
    if (selectedShoe) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setJustAdded(false);
    }
  }, [selectedShoe]);

  const pairsPerBox = useMemo(() => {
    return SIZES.reduce((sum, sz) => sum + (sizeRun[sz] || 0), 0);
  }, [sizeRun]);

  const totalPairs = orderMode === 'sample' ? 1 : pairsPerBox * boxesCount;
  const cartTotalPairs = useMemo(() => cart.reduce((s, i) => s + i.totalPairs, 0), [cart]);

  const updateSizeCount = (size: SizeKey, delta: number) => {
    setSizeRun((prev) => {
      const nextVal = Math.max(0, Math.min(10, (prev[size] || 0) + delta));
      return { ...prev, [size]: nextVal };
    });
  };

  // Добавление выбранной модели с её ростовкой в общую корзину
  const addCurrentShoeToCart = () => {
    if (!selectedShoe || totalPairs === 0) return;

    const formulaText =
      orderMode === 'sample'
        ? `Тестовый образец (1 пара) — р. ${sampleSize}`
        : `Ростовок ×${boxesCount}: ` +
          SIZES.filter((sz) => sizeRun[sz] > 0)
            .map((sz) => `${sz}р.(${sizeRun[sz] * boxesCount})`)
            .join(' • ');

    const newItem: CartItem = {
      uid: `${selectedShoe.id}-${Date.now()}`,
      shoe: selectedShoe,
      orderMode,
      sizeRun: { ...sizeRun },
      boxesCount,
      sampleSize,
      totalPairs,
      formulaText,
    };

    setCart((prev) => [...prev, newItem]);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
  };

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

  const modelVariants = useMemo(() => {
    if (!selectedShoe) return [];
    return cardioCatalog.filter((item) => item.modelNumber === selectedShoe.modelNumber);
  }, [selectedShoe]);

  // ЭКРАН 1: ОПТОВАЯ КОРЗИНА (из отдельного файла)
  if (isCartOpen) {
    return (
      <WholesaleCart
        items={cart}
        onRemove={(uid) => setCart((prev) => prev.filter((item) => item.uid !== uid))}
        onClear={() => setCart([])}
        onClose={() => setIsCartOpen(false)}
      />
    );
  }

  // ЭКРАН 2: ПОЛНАЯ СТРАНИЦА МОДЕЛИ
  if (selectedShoe) {
    return (
      <div
        style={{
          backgroundColor: '#F7F6F2',
          minHeight: '100vh',
          padding: '16px 16px 90px 16px',
          color: '#1A1A1A',
          boxSizing: 'border-box',
          overflowX: 'hidden',
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
            onClick={() => setSelectedShoe(null)}
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
            ← В каталог
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              background: '#1A1A1A',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🛒 Заказ ({cart.length})
          </button>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
            {selectedShoe.category} • Цвет: <strong>{selectedShoe.color}</strong>
          </div>
          <h1 style={{ fontFamily: 'serif', fontSize: '28px', margin: '4px 0 0 0', fontWeight: 600 }}>
            Модель № {selectedShoe.modelNumber} {selectedShoe.variant || ''}
          </h1>
          {selectedShoe.features.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {selectedShoe.features.map((feat) => (
                <span
                  key={feat}
                  style={{ fontSize: '11px', backgroundColor: '#E8E6DF', padding: '3px 8px', fontWeight: 500 }}
                >
                  {feat}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EAE8E3',
            padding: '16px',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          <img
            src={selectedShoe.image}
            alt={`Модель ${selectedShoe.modelNumber}`}
            style={{
              width: '100%',
              maxWidth: '340px',
              aspectRatio: '1 / 1',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto',
            }}
          />
        </div>

        {modelVariants.length > 1 && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #EAE8E3',
              padding: '12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666', marginBottom: '8px', fontWeight: 600 }}>
              Исполнения модели № {selectedShoe.modelNumber} ({modelVariants.length}):
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
                      padding: '6px',
                      width: '72px',
                      flexShrink: 0,
                      cursor: 'pointer',
                      textAlign: 'center',
                      backgroundColor: isCurrent ? '#FAF9F6' : '#FFF',
                    }}
                  >
                    <img src={v.image} alt={v.color} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain' }} />
                    <div
                      style={{
                        fontSize: '10px',
                        marginTop: '4px',
                        fontWeight: isCurrent ? 700 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {v.variant ? `${v.variant} ` : ''}{v.color}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          <button
            onClick={() => setOrderMode('wholesale')}
            style={{
              padding: '11px',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid #1A1A1A',
              backgroundColor: orderMode === 'wholesale' ? '#1A1A1A' : '#FFF',
              color: orderMode === 'wholesale' ? '#FFF' : '#1A1A1A',
              cursor: 'pointer',
            }}
          >
            Опт (Ростовка)
          </button>
          <button
            onClick={() => setOrderMode('sample')}
            style={{
              padding: '11px',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid #1A1A1A',
              backgroundColor: orderMode === 'sample' ? '#1A1A1A' : '#FFF',
              color: orderMode === 'sample' ? '#FFF' : '#1A1A1A',
              cursor: 'pointer',
            }}
          >
            Образец (1 пара)
          </button>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E2DC',
            padding: '14px',
            marginBottom: '16px',
          }}
        >
          {orderMode === 'wholesale' ? (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                  📏 Размерная сетка ящика (40–45)
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setSizeRun(STANDARD_8_RUN)}
                    style={{
                      fontSize: '11px',
                      padding: '5px 10px',
                      border: '1px solid #CCC',
                      backgroundColor: '#F7F6F2',
                      cursor: 'pointer',
                      color: '#1A1A1A',
                    }}
                  >
                    Стандарт 8 пар
                  </button>
                  <button
                    onClick={() => setSizeRun(EVEN_6_RUN)}
                    style={{
                      fontSize: '11px',
                      padding: '5px 10px',
                      border: '1px solid #CCC',
                      backgroundColor: '#F7F6F2',
                      cursor: 'pointer',
                      color: '#1A1A1A',
                    }}
                  >
                    Ровный 6 пар
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                {SIZES.map((sz) => (
                  <div
                    key={sz}
                    style={{
                      border: '1px solid #DDD',
                      backgroundColor: '#FAF9F6',
                      textAlign: 'center',
                      padding: '8px 6px',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#555', marginBottom: '6px', fontWeight: 600 }}>
                      Размер {sz}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                      <button
                        onClick={() => updateSizeCount(sz, -1)}
                        style={{
                          width: '28px',
                          height: '28px',
                          border: '1px solid #CCC',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#1A1A1A',
                        }}
                      >
                        −
                      </button>
                      <span style={{ fontSize: '15px', fontWeight: 700 }}>{sizeRun[sz]}</span>
                      <button
                        onClick={() => updateSizeCount(sz, 1)}
                        style={{
                          width: '28px',
                          height: '28px',
                          border: '1px solid #CCC',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#1A1A1A',
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#444' }}>Количество ростовок:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[1, 2, 3, 5, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setBoxesCount(num)}
                      style={{
                        padding: '6px 12px',
                        border: boxesCount === num ? '1px solid #1A1A1A' : '1px solid #CCC',
                        backgroundColor: boxesCount === num ? '#1A1A1A' : '#FFF',
                        color: boxesCount === num ? '#FFF' : '#1A1A1A',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ×{num}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>
                📏 Выберите размер тестового образца:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSampleSize(sz)}
                    style={{
                      padding: '10px 0',
                      border: sampleSize === sz ? '2px solid #1A1A1A' : '1px solid #CCC',
                      backgroundColor: sampleSize === sz ? '#1A1A1A' : '#FFF',
                      color: sampleSize === sz ? '#FFF' : '#1A1A1A',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    р. {sz}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Кнопка добавления этой модели в общую оптовую корзину */}
        <button
          disabled={totalPairs === 0}
          onClick={addCurrentShoeToCart}
          style={{
            width: '100%',
            padding: '15px',
            backgroundColor: justAdded ? '#15803D' : '#1A1A1A',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            cursor: totalPairs === 0 ? 'not-allowed' : 'pointer',
            marginBottom: '10px',
          }}
        >
          {justAdded
            ? `✓ Добавлено в заказ (${totalPairs} пар)!`
            : `➕ Добавить в оптовый заказ (${totalPairs} пар)`}
        </button>

        {cart.length > 0 && (
          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              width: '100%',
              padding: '13px',
              backgroundColor: '#FFFFFF',
              color: '#1A1A1A',
              border: '2px solid #1A1A1A',
              fontSize: '13px',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            🛒 Перейти к оформлению ({cart.length} мод. • {cartTotalPairs} пар) →
          </button>
        )}
      </div>
    );
  }

  // ЭКРАН 3: ОСНОВНОЙ КАТАЛОГ
  return (
    <div style={{ backgroundColor: '#F7F6F2', minHeight: '100vh', padding: '16px 16px 85px 16px', color: '#1A1A1A' }}>
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
                        style={{ fontSize: '10px', backgroundColor: '#F0EFEA', padding: '2px 6px', color: '#333' }}
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
                  <span>{variantsCount > 1 ? `Вариантов: ${variantsCount}` : '40–45 разм.'}</span>
                  <span style={{ fontWeight: 600, color: '#1A1A1A' }}>Выбрать →</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Плавающая нижняя панель корзины (появляется, когда добавлена хотя бы 1 модель) */}
      {cart.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#1A1A1A',
            color: '#FFFFFF',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 900,
            boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ fontSize: '13px' }}>
            🛒 В заказе: <strong>{cart.length} мод.</strong> ({cartTotalPairs} пар)
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#1A1A1A',
              border: 'none',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Оформить →
          </button>
        </div>
      )}
    </div>
  );
}

export default Materials;
