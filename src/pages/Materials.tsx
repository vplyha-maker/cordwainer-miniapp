import { useState, useMemo, useEffect } from 'react';
import { cardioCatalog, type ShoeCategory, type ShoeItem, type CartItem, type SizeKey } from '../data/catalog';
import { WholesaleCart } from '../components/WholesaleCart';

type MaterialsProps = {
  onBack?: () => void;
};

const CATEGORIES: ('Все' | ShoeCategory)[] = ['Все', 'Ботинки', 'Кроссовки', 'Туфли'];
const FEATURE_FILTERS = ['Все', 'Мех', 'Gore-Tex', 'Подошва трактор'] as const;

const SIZES = [40, 41, 42, 43, 44, 45] as const;

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
      // Ignore storage errors
    }
  }, [cart]);

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

  const pairsInCartByShoeId = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach((item) => {
      map[item.shoe.id] = (map[item.shoe.id] || 0) + item.totalPairs;
    });
    return map;
  }, [cart]);

  const updateSizeCount = (size: SizeKey, delta: number) => {
    setSizeRun((prev) => {
      const nextVal = Math.max(0, Math.min(10, (prev[size] || 0) + delta));
      return { ...prev, [size]: nextVal };
    });
  };

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

  // ЭКРАН 1: ОПТОВАЯ НАКЛАДНАЯ (КОРЗИНА)
  if (isCartOpen) {
    return (
      <WholesaleCart
        items={cart}
        onUpdateQuantity={(uid, newBoxes) => {
          if (newBoxes < 1) return;
          setCart((prev) =>
            prev.map((item) => {
              if (item.uid !== uid) return item;
              const pairsPerRun = Object.values(item.sizeRun).reduce((a, b) => a + b, 0);
              const newTotalPairs = pairsPerRun * newBoxes;
              return {
                ...item,
                boxesCount: newBoxes,
                totalPairs: newTotalPairs,
              };
            })
          );
        }}
        onRemove={(uid) => setCart((prev) => prev.filter((item) => item.uid !== uid))}
        onClear={() => setCart([])}
        onClose={() => setIsCartOpen(false)}
      />
    );
  }

  // ЭКРАН 2: СТРАНИЦА МОДЕЛИ (LOOKBOOK DETAIL)
  if (selectedShoe) {
    const alreadyInCartPairs = pairsInCartByShoeId[selectedShoe.id] || 0;

    return (
      <div
        style={{
          backgroundColor: '#F7F6F2',
          minHeight: '100vh',
          padding: '24px 20px 100px 20px',
          color: '#1A1A1A',
          boxSizing: 'border-box',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <button
            onClick={() => setSelectedShoe(null)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0',
              fontSize: '11px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              color: '#555',
              fontWeight: 500,
            }}
          >
            ← Назад в каталог
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              background: 'transparent',
              border: '1px solid #1A1A1A',
              padding: '8px 14px',
              fontSize: '11px',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              fontWeight: 500,
              cursor: 'pointer',
              color: '#1A1A1A',
            }}
          >
            Накладная ({cart.length} • {cartTotalPairs} п.)
          </button>
        </div>

        {alreadyInCartPairs > 0 && (
          <div
            style={{
              backgroundColor: '#EFECE6',
              borderLeft: '2px solid #1A1A1A',
              padding: '10px 14px',
              fontSize: '11px',
              letterSpacing: '0.5px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#333',
            }}
          >
            <span>Модель уже добавлена в заказ ({alreadyInCartPairs} пар)</span>
            <span
              onClick={() => setIsCartOpen(true)}
              style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
            >
              Смотреть
            </span>
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
            {selectedShoe.category} / {selectedShoe.color}
          </div>
          <h1 style={{ fontFamily: 'serif', fontSize: '32px', margin: '0', fontWeight: 400, letterSpacing: '0.5px' }}>
            Модель № {selectedShoe.modelNumber} {selectedShoe.variant || ''}
          </h1>
          {selectedShoe.features.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {selectedShoe.features.map((feat) => (
                <span
                  key={feat}
                  style={{ fontSize: '10px', color: '#666', letterSpacing: '0.5px', textTransform: 'uppercase' }}
                >
                  [{feat}]
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Большое фото товара в стиле люкс */}
        <div
          style={{
            backgroundColor: '#FAF9F6',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}
        >
          <img
            src={selectedShoe.image}
            alt={`Модель ${selectedShoe.modelNumber}`}
            style={{
              width: '100%',
              maxWidth: '380px',
              aspectRatio: '1 / 1',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto',
            }}
          />
        </div>

        {modelVariants.length > 1 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '10px' }}>
              Доступные варианты исполнения:
            </div>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              {modelVariants.map((v) => {
                const isCurrent = v.id === selectedShoe.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedShoe(v)}
                    style={{
                      borderBottom: isCurrent ? '2px solid #1A1A1A' : '1px solid transparent',
                      paddingBottom: '6px',
                      width: '64px',
                      flexShrink: 0,
                      cursor: 'pointer',
                      textAlign: 'center',
                      opacity: isCurrent ? 1 : 0.6,
                    }}
                  >
                    <img src={v.image} alt={v.color} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain' }} />
                    <div style={{ fontSize: '10px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.color}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Переключатель режимов заказа */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', borderBottom: '1px solid #E2DFD7', paddingBottom: '12px' }}>
          <button
            onClick={() => setOrderMode('wholesale')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: orderMode === 'wholesale' ? 600 : 400,
              color: orderMode === 'wholesale' ? '#1A1A1A' : '#888',
              cursor: 'pointer',
            }}
          >
            Оптовая ростовка
          </button>
          <button
            onClick={() => setOrderMode('sample')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: orderMode === 'sample' ? 600 : 400,
              color: orderMode === 'sample' ? '#1A1A1A' : '#888',
              cursor: 'pointer',
            }}
          >
            Тестовый образец (1 пара)
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          {orderMode === 'wholesale' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#666' }}>
                  Размерный ряд коробки (40–45)
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setSizeRun(STANDARD_8_RUN)}
                    style={{ background: 'none', border: 'none', fontSize: '10px', color: '#555', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    8 пар
                  </button>
                  <button
                    onClick={() => setSizeRun(EVEN_6_RUN)}
                    style={{ background: 'none', border: 'none', fontSize: '10px', color: '#555', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    6 пар
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {SIZES.map((sz) => (
                  <div
                    key={sz}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E2DC',
                      padding: '10px 8px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#777', marginBottom: '6px' }}>{sz} р.</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        onClick={() => updateSizeCount(sz, -1)}
                        style={{ background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#666', padding: '0 4px' }}
                      >
                        −
                      </button>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{sizeRun[sz]}</span>
                      <button
                        onClick={() => updateSizeCount(sz, 1)}
                        style={{ background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#666', padding: '0 4px' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#666' }}>Количество коробов:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[1, 2, 3, 5, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setBoxesCount(num)}
                      style={{
                        padding: '6px 10px',
                        border: boxesCount === num ? '1px solid #1A1A1A' : '1px solid #D6D3CB',
                        backgroundColor: boxesCount === num ? '#1A1A1A' : '#FFFFFF',
                        color: boxesCount === num ? '#FFFFFF' : '#1A1A1A',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#666', marginBottom: '10px' }}>
                Выберите размер образца:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSampleSize(sz)}
                    style={{
                      padding: '10px 0',
                      border: sampleSize === sz ? '1px solid #1A1A1A' : '1px solid #D6D3CB',
                      backgroundColor: sampleSize === sz ? '#1A1A1A' : '#FFFFFF',
                      color: sampleSize === sz ? '#FFFFFF' : '#1A1A1A',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {sz} р.
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          disabled={totalPairs === 0}
          onClick={addCurrentShoeToCart}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: justAdded ? '#15803D' : '#1A1A1A',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '11px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            cursor: totalPairs === 0 ? 'not-allowed' : 'pointer',
            marginBottom: '10px',
            transition: 'background-color 0.2s ease',
          }}
        >
          {justAdded
            ? `✓ Добавлено в накладную (${totalPairs} пар)`
            : `Добавить в накладную — ${totalPairs} пар`}
        </button>
      </div>
    );
  }

  // ЭКРАН 3: ОСНОВНОЙ КАТАЛОГ (LOOKBOOK GRID)
  return (
    <div
      style={{
        backgroundColor: '#F7F6F2',
        minHeight: '100vh',
        padding: '20px 16px 120px 16px',
        color: '#1A1A1A',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Шапка */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#888' }}>
            Харьков • B2B Showroom
          </span>
          <h1 style={{ fontFamily: 'serif', fontSize: '28px', margin: '2px 0 0 0', fontWeight: 400, letterSpacing: '0.5px' }}>
            Cardio Footwear
          </h1>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: '1px solid #D6D3CB',
              padding: '6px 12px',
              fontSize: '10px',
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
        placeholder="Поиск по номеру модели или цвету..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '11px 14px',
          marginBottom: '16px',
          border: '1px solid #D6D3CB',
          backgroundColor: '#FFFFFF',
          color: '#1A1A1A',
          fontSize: '13px',
          outline: 'none',
        }}
      />

      {/* Категории (минималистичные вкладки) */}
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '8px', borderBottom: '1px solid #E2DFD7' }}>
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 0',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: 'pointer',
                color: isActive ? '#1A1A1A' : '#888',
                fontWeight: isActive ? 600 : 400,
                whiteSpace: 'nowrap',
                borderBottom: isActive ? '2px solid #1A1A1A' : '2px solid transparent',
              }}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Сезонные фильтры */}
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '20px' }}>
        {FEATURE_FILTERS.map((feat) => {
          const isActive = activeFeature === feat;
          return (
            <button
              key={feat}
              onClick={() => setActiveFeature(feat)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '2px 0',
                fontSize: '11px',
                color: isActive ? '#1A1A1A' : '#777',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                textDecoration: isActive ? 'underline' : 'none',
                letterSpacing: '0.5px',
              }}
            >
              {feat === 'Все' ? 'Все модели' : feat}
            </button>
          );
        })}
      </div>

      {/* Сетка товаров (без тяжелых карточек и рамок) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px 16px',
        }}
      >
        {filteredShoes.map((shoe) => {
          const variantsCount = cardioCatalog.filter((i) => i.modelNumber === shoe.modelNumber).length;
          const inCartPairs = pairsInCartByShoeId[shoe.id] || 0;

          return (
            <div
              key={shoe.id}
              onClick={() => setSelectedShoe(shoe)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div
                style={{
                  backgroundColor: '#FAF9F6',
                  padding: '12px',
                  marginBottom: '10px',
                  position: 'relative',
                }}
              >
                {inCartPairs > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      backgroundColor: '#1A1A1A',
                      color: '#FFFFFF',
                      padding: '2px 6px',
                      fontSize: '9px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}
                  >
                    В заказе: {inCartPairs}п.
                  </span>
                )}

                {shoe.variant && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      color: '#666',
                      fontSize: '10px',
                      letterSpacing: '0.5px',
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
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'serif', fontSize: '16px', fontWeight: 500, letterSpacing: '0.3px' }}>
                    № {shoe.modelNumber}
                  </span>
                  <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {shoe.category}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                  {shoe.color}
                </div>

                <div
                  style={{
                    marginTop: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10px',
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  <span>{variantsCount > 1 ? `${variantsCount} варианта` : '40–45'}</span>
                  <span style={{ color: inCartPairs > 0 ? '#15803D' : '#1A1A1A', fontWeight: 500 }}>
                    {inCartPairs > 0 ? 'Дозаказать →' : 'Выбрать →'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Фиксированная нижняя панель корзины */}
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
            zIndex: 900,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', letterSpacing: '0.5px' }}>
              Накладная: <strong>{cart.length} мод.</strong> ({cartTotalPairs} пар)
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A',
                border: 'none',
                padding: '8px 16px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Сводная накладная →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Materials;
