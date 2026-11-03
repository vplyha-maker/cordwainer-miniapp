import { useState, useMemo, useEffect } from 'react';
import { cardioCatalog, type ShoeCategory, type ShoeItem, type CartItem, type SizeKey } from '../data/catalog';
import { WholesaleCart } from '../components/WholesaleCart';
import { triggerHaptic } from '../components/ManagersContactCard';

type MaterialsProps = {
  onBack?: () => void;
};

const CATEGORIES: ('Все' | ShoeCategory)[] = ['Все', 'Ботинки', 'Кроссовки', 'Туфли'];
const FEATURE_FILTERS = ['Все', 'Мех', 'Gore-Tex', 'Подошва трактор'] as const;

const SIZES = [40, 41, 42, 43, 44, 45] as const;

const STANDARD_8_RUN: Record<SizeKey, number> = { 40: 1, 41: 1, 42: 2, 43: 2, 44: 1, 45: 1 };
const EVEN_6_RUN: Record<SizeKey, number> = { 40: 1, 41: 1, 42: 1, 43: 1, 44: 1, 45: 1 };

const CART_STORAGE_KEY = 'cardio_b2b_cart_v1';

const THEME = {
  bg: '#F2EFE9',
  surface: '#F8F6F1',
  surfaceActive: '#EAE5DC',
  ink: '#161514',
  inkMuted: '#6E6A63',
  inkLight: '#9A958C',
  border: '#DCD7CC',
  borderStrong: '#161514',
  accentGreen: '#1E4620',
  serif: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
  sans: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
};

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
    triggerHaptic('light');
    setSizeRun((prev) => {
      const nextVal = Math.max(0, Math.min(10, (prev[size] || 0) + delta));
      return { ...prev, [size]: nextVal };
    });
  };

  const addCurrentShoeToCart = () => {
    if (!selectedShoe || totalPairs === 0) return;

    triggerHaptic('success');

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

  // ЭКРАН 2: КАРТОЧКА МОДЕЛИ
  if (selectedShoe) {
    const alreadyInCartPairs = pairsInCartByShoeId[selectedShoe.id] || 0;

    return (
      <div
        style={{
          backgroundColor: THEME.bg,
          minHeight: '100vh',
          padding: '20px 16px 110px 16px',
          color: THEME.ink,
          boxSizing: 'border-box',
          fontFamily: THEME.sans,
        }}
      >
        {/* Верхняя навигация с логотипом-штампом */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '14px',
            marginBottom: '20px',
            borderBottom: `1px solid ${THEME.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/logo.png"
              alt="Cardio"
              style={{
                height: '20px',
                width: 'auto',
                objectFit: 'contain',
                mixBlendMode: 'multiply',
              }}
            />
            <button
              onClick={() => {
                triggerHaptic('light');
                setSelectedShoe(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 0',
                fontSize: '10px',
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                color: THEME.ink,
                fontWeight: 600,
              }}
            >
              ← Каталог
            </button>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              setIsCartOpen(true);
            }}
            style={{
              background: cart.length > 0 ? THEME.ink : 'transparent',
              border: `1px solid ${THEME.ink}`,
              padding: '7px 12px',
              fontSize: '10px',
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
              fontWeight: 600,
              cursor: 'pointer',
              color: cart.length > 0 ? '#FFFFFF' : THEME.ink,
            }}
          >
            Накладная ({cart.length} • {cartTotalPairs} п.)
          </button>
        </div>

        {/* Индикатор наличия в заказе */}
        {alreadyInCartPairs > 0 && (
          <div
            style={{
              backgroundColor: THEME.surfaceActive,
              border: `1px solid ${THEME.border}`,
              borderLeft: `3px solid ${THEME.ink}`,
              padding: '10px 14px',
              fontSize: '11px',
              letterSpacing: '0.3px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: THEME.ink,
            }}
          >
            <span>Уже в вашей накладной: <strong>{alreadyInCartPairs} пар</strong></span>
            <span
              onClick={() => {
                triggerHaptic('light');
                setIsCartOpen(true);
              }}
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                borderBottom: `1px solid ${THEME.ink}`,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Открыть →
            </span>
          </div>
        )}

        {/* Заголовок модели */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: THEME.inkMuted,
              textTransform: 'uppercase',
              letterSpacing: '1.4px',
              marginBottom: '6px',
            }}
          >
            <span>КАРТОЧКА МОДЕЛИ // {selectedShoe.category}</span>
            <span style={{ fontFamily: THEME.serif, fontStyle: 'italic', textTransform: 'none', fontSize: '12px' }}>
              Арт. № {selectedShoe.modelNumber}
            </span>
          </div>

          <h1
            style={{
              fontFamily: THEME.serif,
              fontSize: '36px',
              margin: '0',
              fontWeight: 400,
              letterSpacing: '-0.3px',
              lineHeight: 1.05,
            }}
          >
            Модель № {selectedShoe.modelNumber}
            {selectedShoe.variant && (
              <span style={{ fontSize: '20px', color: THEME.inkMuted, fontStyle: 'italic', marginLeft: '8px' }}>
                ({selectedShoe.variant})
              </span>
            )}
          </h1>

          <div
            style={{
              fontFamily: THEME.serif,
              fontStyle: 'italic',
              fontSize: '15px',
              color: THEME.inkMuted,
              marginTop: '4px',
            }}
          >
            Цвет: {selectedShoe.color}
          </div>
        </div>

        {/* Фото товара */}
        <div
          style={{
            backgroundColor: THEME.surface,
            border: `1px solid ${THEME.border}`,
            padding: '28px 20px',
            marginBottom: '20px',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '12px',
              fontSize: '9px',
              letterSpacing: '1.5px',
              color: THEME.inkLight,
              textTransform: 'uppercase',
            }}
          >
            CARDIO ORIGINAL
          </div>
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '12px',
              fontSize: '9px',
              letterSpacing: '1.5px',
              color: THEME.inkLight,
              textTransform: 'uppercase',
            }}
          >
            РАЗМЕРЫ 40—45
          </div>

          <img
            src={selectedShoe.image}
            alt={`Модель ${selectedShoe.modelNumber}`}
            style={{
              width: '100%',
              maxWidth: '340px',
              aspectRatio: '4 / 3',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto',
              mixBlendMode: 'multiply',
              filter: 'contrast(1.04)',
            }}
          />

          {selectedShoe.features.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: `1px solid ${THEME.border}`,
              }}
            >
              {selectedShoe.features.map((feat) => (
                <span
                  key={feat}
                  style={{
                    fontSize: '9px',
                    color: THEME.inkMuted,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    border: `1px solid ${THEME.border}`,
                    backgroundColor: THEME.bg,
                  }}
                >
                  {feat}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Варианты цвета */}
        {modelVariants.length > 1 && (
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.3px',
                color: THEME.inkMuted,
                marginBottom: '10px',
              }}
            >
              <span>ДОСТУПНЫЕ ЦВЕТА МОДЕЛИ</span>
              <span>01—0{modelVariants.length}</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(modelVariants.length, 4)}, 1fr)`,
                borderTop: `1px solid ${THEME.border}`,
                borderLeft: `1px solid ${THEME.border}`,
              }}
            >
              {modelVariants.map((v, i) => {
                const isCurrent = v.id === selectedShoe.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedShoe(v);
                    }}
                    style={{
                      borderRight: `1px solid ${THEME.border}`,
                      borderBottom: `1px solid ${THEME.border}`,
                      backgroundColor: isCurrent ? THEME.surfaceActive : THEME.surface,
                      padding: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '8px',
                        color: THEME.inkLight,
                        textAlign: 'left',
                        marginBottom: '4px',
                      }}
                    >
                      0{i + 1}
                    </div>
                    <img
                      src={v.image}
                      alt={v.color}
                      style={{
                        width: '100%',
                        aspectRatio: '1/1',
                        objectFit: 'contain',
                        mixBlendMode: 'multiply',
                      }}
                    />
                    <div
                      style={{
                        fontSize: '10px',
                        marginTop: '6px',
                        fontWeight: isCurrent ? 600 : 400,
                        color: THEME.ink,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {v.color}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ВЫБОР РОСТОВКИ И КОРОБОВ */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1.3px',
              color: THEME.inkMuted,
              marginBottom: '10px',
            }}
          >
            <span>ПАРАМЕТРЫ ЗАКАЗА</span>
            <span>ОПТ / ОБРАЗЕЦ</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              border: `1px solid ${THEME.ink}`,
              marginBottom: '20px',
            }}
          >
            <button
              onClick={() => {
                triggerHaptic('light');
                setOrderMode('wholesale');
              }}
              style={{
                backgroundColor: orderMode === 'wholesale' ? THEME.ink : 'transparent',
                color: orderMode === 'wholesale' ? '#FFFFFF' : THEME.ink,
                border: 'none',
                padding: '11px 8px',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Оптовая ростовка
            </button>
            <button
              onClick={() => {
                triggerHaptic('light');
                setOrderMode('sample');
              }}
              style={{
                backgroundColor: orderMode === 'sample' ? THEME.ink : 'transparent',
                color: orderMode === 'sample' ? '#FFFFFF' : THEME.ink,
                border: 'none',
                borderLeft: `1px solid ${THEME.ink}`,
                padding: '11px 8px',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Тестовый образец (1 п.)
            </button>
          </div>

          {orderMode === 'wholesale' ? (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '12px', color: THEME.inkMuted, fontStyle: 'italic', fontFamily: THEME.serif }}>
                  Размерный ряд коробки (40–45):
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setSizeRun(STANDARD_8_RUN);
                    }}
                    style={{
                      background: THEME.surface,
                      border: `1px solid ${THEME.border}`,
                      padding: '5px 8px',
                      fontSize: '9px',
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                      color: THEME.ink,
                      cursor: 'pointer',
                    }}
                  >
                    8 пар (стандарт)
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setSizeRun(EVEN_6_RUN);
                    }}
                    style={{
                      background: THEME.surface,
                      border: `1px solid ${THEME.border}`,
                      padding: '5px 8px',
                      fontSize: '9px',
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                      color: THEME.ink,
                      cursor: 'pointer',
                    }}
                  >
                    6 пар (ровная)
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  borderTop: `1px solid ${THEME.border}`,
                  borderLeft: `1px solid ${THEME.border}`,
                  marginBottom: '18px',
                }}
              >
                {SIZES.map((sz) => (
                  <div
                    key={sz}
                    style={{
                      backgroundColor: sizeRun[sz] > 0 ? THEME.surface : THEME.bg,
                      borderRight: `1px solid ${THEME.border}`,
                      borderBottom: `1px solid ${THEME.border}`,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        color: THEME.inkMuted,
                        padding: '6px 0',
                        borderBottom: `1px solid ${THEME.border}`,
                        letterSpacing: '0.5px',
                      }}
                    >
                      {sz}
                    </div>
                    <button
                      onClick={() => updateSizeCount(sz, 1)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '6px 0',
                        fontSize: '14px',
                        cursor: 'pointer',
                        color: THEME.inkMuted,
                      }}
                    >
                      +
                    </button>
                    <div
                      style={{
                        fontFamily: THEME.serif,
                        fontSize: '18px',
                        fontWeight: 600,
                        padding: '2px 0',
                        color: sizeRun[sz] > 0 ? THEME.ink : THEME.inkLight,
                      }}
                    >
                      {sizeRun[sz]}
                    </div>
                    <button
                      onClick={() => updateSizeCount(sz, -1)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '6px 0',
                        fontSize: '14px',
                        cursor: 'pointer',
                        color: THEME.inkMuted,
                      }}
                    >
                      −
                    </button>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: `1px solid ${THEME.border}`,
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '1.2px',
                    color: THEME.inkMuted,
                  }}
                >
                  Количество коробов:
                </span>
                <div style={{ display: 'flex', border: `1px solid ${THEME.border}` }}>
                  {[1, 2, 3, 5, 10].map((num, idx) => (
                    <button
                      key={num}
                      onClick={() => {
                        triggerHaptic('light');
                        setBoxesCount(num);
                      }}
                      style={{
                        padding: '7px 12px',
                        border: 'none',
                        borderLeft: idx === 0 ? 'none' : `1px solid ${THEME.border}`,
                        backgroundColor: boxesCount === num ? THEME.ink : THEME.surface,
                        color: boxesCount === num ? '#FFFFFF' : THEME.ink,
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
              <div
                style={{
                  fontSize: '12px',
                  fontFamily: THEME.serif,
                  fontStyle: 'italic',
                  color: THEME.inkMuted,
                  marginBottom: '10px',
                }}
              >
                Выберите размер тестового образца:
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  borderTop: `1px solid ${THEME.border}`,
                  borderLeft: `1px solid ${THEME.border}`,
                }}
              >
                {SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      triggerHaptic('light');
                      setSampleSize(sz);
                    }}
                    style={{
                      padding: '14px 0',
                      border: 'none',
                      borderRight: `1px solid ${THEME.border}`,
                      borderBottom: `1px solid ${THEME.border}`,
                      backgroundColor: sampleSize === sz ? THEME.ink : THEME.surface,
                      color: sampleSize === sz ? '#FFFFFF' : THEME.ink,
                      fontSize: '12px',
                      fontFamily: THEME.serif,
                      cursor: 'pointer',
                    }}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Кнопка добавления в накладную */}
        <button
          disabled={totalPairs === 0}
          onClick={addCurrentShoeToCart}
          style={{
            width: '100%',
            padding: '16px 20px',
            backgroundColor: justAdded ? THEME.accentGreen : THEME.ink,
            color: '#FFFFFF',
            border: 'none',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            cursor: totalPairs === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'background-color 0.2s ease',
          }}
        >
          <span>
            {justAdded ? '✓ Добавлено в накладную' : 'Добавить в накладную'}
          </span>
          <span style={{ fontFamily: THEME.serif, fontStyle: 'italic', fontSize: '15px', textTransform: 'none', letterSpacing: '0' }}>
            {totalPairs} пар →
          </span>
        </button>
      </div>
    );
  }

  // ЭКРАН 3: ОСНОВНОЙ КАТАЛОГ
  return (
    <div
      style={{
        backgroundColor: THEME.bg,
        minHeight: '100vh',
        padding: '18px 16px 120px 16px',
        color: THEME.ink,
        fontFamily: THEME.sans,
        boxSizing: 'border-box',
      }}
    >
      {/* Верхняя шапка с логотипом */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '12px',
          marginBottom: '16px',
          borderBottom: `1px solid ${THEME.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/logo.png"
            alt="Cardio Footwear Logo"
            style={{
              height: '24px',
              width: 'auto',
              objectFit: 'contain',
              mixBlendMode: 'multiply',
            }}
          />
          <span
            style={{
              fontSize: '9px',
              letterSpacing: '1.6px',
              textTransform: 'uppercase',
              color: THEME.inkMuted,
            }}
          >
            ХАРЬКОВ • ОПТОВЫЙ КАТАЛОГ
          </span>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: `1px solid ${THEME.border}`,
              padding: '4px 10px',
              fontSize: '9px',
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              color: THEME.ink,
            }}
          >
            ← На главную
          </button>
        )}
      </div>

      {/* Заголовок бренда */}
      <div style={{ marginBottom: '18px' }}>
        <h1
          style={{
            fontFamily: THEME.serif,
            fontSize: '40px',
            margin: '0',
            fontWeight: 400,
            letterSpacing: '0.5px',
            lineHeight: 1,
            textTransform: 'uppercase',
          }}
        >
          Cardio Footwear
        </h1>
        <div
          style={{
            fontFamily: THEME.serif,
            fontStyle: 'italic',
            fontSize: '14px',
            color: THEME.inkMuted,
            marginTop: '4px',
          }}
        >
          Оптовый шоурум и заказ моделей от производителя
        </div>
      </div>

      {/* Поле поиска */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: THEME.surface,
          border: `1px solid ${THEME.border}`,
          padding: '0 12px',
          marginBottom: '18px',
        }}
      >
        <span
          style={{
            fontFamily: THEME.serif,
            fontStyle: 'italic',
            fontSize: '13px',
            color: THEME.inkMuted,
            marginRight: '10px',
            userSelect: 'none',
          }}
        >
          Поиск:
        </span>
        <input
          type="text"
          placeholder="Номер модели или цвет..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '11px 0',
            border: 'none',
            backgroundColor: 'transparent',
            color: THEME.ink,
            fontSize: '13px',
            outline: 'none',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              background: 'none',
              border: 'none',
              color: THEME.inkMuted,
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Категории */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: `1px solid ${THEME.border}`,
          borderBottom: `1px solid ${THEME.border}`,
          marginBottom: '12px',
        }}
      >
        {CATEGORIES.map((category, idx) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => {
                triggerHaptic('light');
                setActiveCategory(category);
              }}
              style={{
                background: isActive ? THEME.ink : 'transparent',
                color: isActive ? '#FFFFFF' : THEME.ink,
                border: 'none',
                borderLeft: idx === 0 ? 'none' : `1px solid ${THEME.border}`,
                padding: '9px 4px',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Сезонные фильтры */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '12px',
        }}
      >
        {FEATURE_FILTERS.map((feat) => {
          const isActive = activeFeature === feat;
          return (
            <button
              key={feat}
              onClick={() => {
                triggerHaptic('light');
                setActiveFeature(feat);
              }}
              style={{
                backgroundColor: isActive ? THEME.surfaceActive : 'transparent',
                border: `1px solid ${isActive ? THEME.ink : THEME.border}`,
                padding: '5px 10px',
                fontSize: '10px',
                color: isActive ? THEME.ink : THEME.inkMuted,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                letterSpacing: '0.5px',
              }}
            >
              {feat === 'Все' ? 'Все модели' : feat}
            </button>
          );
        })}
      </div>

      {/* Счетчик моделей */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: THEME.inkMuted,
          marginBottom: '8px',
        }}
      >
        <span>КАТАЛОГ МОДЕЛЕЙ</span>
        <span>НАЙДЕНО: {filteredShoes.length}</span>
      </div>

      {/* Табличная сетка каталога */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          borderTop: `1px solid ${THEME.border}`,
          borderLeft: `1px solid ${THEME.border}`,
        }}
      >
        {filteredShoes.map((shoe, index) => {
          const variantsCount = cardioCatalog.filter((i) => i.modelNumber === shoe.modelNumber).length;
          const inCartPairs = pairsInCartByShoeId[shoe.id] || 0;
          const cellIndex = String(index + 1).padStart(2, '0');

          return (
            <div
              key={shoe.id}
              onClick={() => {
                triggerHaptic('light');
                setSelectedShoe(shoe);
              }}
              style={{
                backgroundColor: inCartPairs > 0 ? '#EFECE4' : THEME.surface,
                borderRight: `1px solid ${THEME.border}`,
                borderBottom: `1px solid ${THEME.border}`,
                padding: '12px 12px 14px 12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                position: 'relative',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '9px',
                  letterSpacing: '1px',
                  color: THEME.inkLight,
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                <span>{cellIndex}</span>
                {inCartPairs > 0 ? (
                  <span
                    style={{
                      backgroundColor: THEME.ink,
                      color: '#FFFFFF',
                      padding: '2px 5px',
                      fontSize: '8px',
                      letterSpacing: '0.6px',
                    }}
                  >
                    В ЗАКАЗЕ: {inCartPairs} П.
                  </span>
                ) : (
                  <span>{shoe.category}</span>
                )}
              </div>

              <div
                style={{
                  padding: '6px 4px',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={shoe.image}
                  alt={`Модель ${shoe.modelNumber}`}
                  loading="lazy"
                  style={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    objectFit: 'contain',
                    mixBlendMode: 'multiply',
                    filter: 'contrast(1.04)',
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      fontFamily: THEME.serif,
                      fontSize: '20px',
                      fontWeight: 400,
                      color: THEME.ink,
                      letterSpacing: '0.2px',
                    }}
                  >
                    № {shoe.modelNumber}
                  </span>
                  {shoe.variant && (
                    <span
                      style={{
                        fontFamily: THEME.serif,
                        fontStyle: 'italic',
                        fontSize: '11px',
                        color: THEME.inkMuted,
                      }}
                    >
                      {shoe.variant}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '10px',
                    color: THEME.inkMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {shoe.color}
                </div>

                <div
                  style={{
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: `1px solid ${THEME.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '9px',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                  }}
                >
                  <span style={{ color: THEME.inkLight }}>
                    {variantsCount > 1 ? `${variantsCount} ЦВЕТА` : '40—45'}
                  </span>
                  <span
                    style={{
                      color: inCartPairs > 0 ? THEME.accentGreen : THEME.ink,
                      fontWeight: 600,
                    }}
                  >
                    {inCartPairs > 0 ? 'Дозаказать →' : 'Выбрать →'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Нижняя фиксированная панель накладной */}
      {cart.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: THEME.ink,
            color: '#FFFFFF',
            padding: '12px 16px',
            zIndex: 900,
            borderTop: `1px solid ${THEME.ink}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '9px', letterSpacing: '1.4px', textTransform: 'uppercase', color: '#A09C94' }}>
                ВАШ ОПТОВЫЙ ЗАКАЗ
              </div>
              <div style={{ fontFamily: THEME.serif, fontSize: '16px', marginTop: '1px' }}>
                Накладная: {cart.length} мод. (<span style={{ fontStyle: 'italic' }}>{cartTotalPairs} пар</span>)
              </div>
            </div>
            <button
              onClick={() => {
                triggerHaptic('medium');
                setIsCartOpen(true);
              }}
              style={{
                backgroundColor: THEME.surface,
                color: THEME.ink,
                border: 'none',
                padding: '10px 16px',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Открыть накладную →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Materials;
