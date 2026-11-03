import { useState, useMemo, useEffect, useRef } from 'react';
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
  const [gridMode, setGridMode] = useState<'2col' | 'large'>('2col');

  const [selectedShoe, setSelectedShoe] = useState<ShoeItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Параллакс для Hero-баннера (работает и на window, и во вложенных скролл-контейнерах Mini App)
  const bannerRef = useRef<HTMLDivElement>(null);
  const [parallaxY, setParallaxY] = useState(0);
  const [parallaxScale, setParallaxScale] = useState(1.04);

  useEffect(() => {
    let rafId = 0;

    const updateParallax = () => {
      if (!bannerRef.current) return;
      const rect = bannerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 800;

      // Если баннер в пределах видимости
      if (rect.bottom > 0 && rect.top < viewportHeight) {
        // Смещение относительно верха экрана
        const scrolledPastTop = Math.max(0, -rect.top);
        const rawShift = scrolledPastTop * 0.28;
        const clampedShift = Math.max(-24, Math.min(36, rawShift));
        const zoom = 1.04 + Math.min(0.06, scrolledPastTop * 0.00025);

        setParallaxY(clampedShift);
        setParallaxScale(zoom);
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateParallax);
    };

    updateParallax();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [selectedShoe, isCartOpen]);

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

  // Определение активного пресета ростовки ("8 пар", "6 пар" или "Своя (X пар)")
  const isStandard8 = useMemo(
    () => SIZES.every((sz) => sizeRun[sz] === STANDARD_8_RUN[sz]),
    [sizeRun]
  );

  const isEven6 = useMemo(
    () => SIZES.every((sz) => sizeRun[sz] === EVEN_6_RUN[sz]),
    [sizeRun]
  );

  const isCustomRun = !isStandard8 && !isEven6;

  const totalPairs = orderMode === 'sample' ? 1 : pairsPerBox * boxesCount;
  const cartTotalPairs = useMemo(() => cart.reduce((s, i) => s + i.totalPairs, 0), [cart]);

  const pairsInCartByShoeId = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach((item) => {
      map[item.shoe.id] = (map[item.shoe.id] || 0) + item.totalPairs;
    });
    return map;
  }, [cart]);

  // Изменение количества пар размера: вибрирует ТОЛЬКО при реальном изменении значения
  const updateSizeCount = (size: SizeKey, delta: number) => {
    const currentVal = sizeRun[size] || 0;
    const nextVal = Math.max(0, Math.min(10, currentVal + delta));

    if (nextVal !== currentVal) {
      triggerHaptic('light');
      setSizeRun((prev) => ({ ...prev, [size]: nextVal }));
    }
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
          triggerHaptic('medium');
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
        onRemove={(uid) => {
          triggerHaptic('medium');
          setCart((prev) => prev.filter((item) => item.uid !== uid));
        }}
        onClear={() => {
          triggerHaptic('medium');
          setCart([]);
        }}
        onClose={() => {
          triggerHaptic('light');
          setIsCartOpen(false);
        }}
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
        {/* Верхняя навигация с логотипом */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/logo.png"
              alt="Cardio"
              style={{
                height: '34px',
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
              triggerHaptic('medium');
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
            <span>
              Уже в вашей накладной: <strong>{alreadyInCartPairs} пар</strong>
            </span>
            <span
              onClick={() => {
                triggerHaptic('medium');
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

        {/* Фото товара (увеличенное, пропорция под силуэт обуви, без дубля логотипа) */}
        <div
          style={{
            backgroundColor: THEME.surface,
            border: `1px solid ${THEME.border}`,
            padding: '16px 12px',
            marginBottom: '20px',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}
          >
            <span style={{ fontSize: '9px', letterSpacing: '1.5px', color: THEME.inkLight, textTransform: 'uppercase' }}>
              CARDIO ORIGINAL
            </span>
            <span style={{ fontSize: '9px', letterSpacing: '1.5px', color: THEME.inkLight, textTransform: 'uppercase' }}>
              РАЗМЕРЫ 40—45
            </span>
          </div>

          <div
            style={{
              width: '100%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={selectedShoe.image}
              alt={`Модель ${selectedShoe.modelNumber}`}
              style={{
                width: '100%',
                maxWidth: '400px',
                aspectRatio: '16 / 10',
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto',
                mixBlendMode: 'multiply',
                filter: 'contrast(1.04)',
                transform: 'scale(1.14)',
              }}
            />
          </div>

          {selectedShoe.features.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '12px',
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
                      if (!isCurrent) {
                        triggerHaptic('medium');
                        setSelectedShoe(v);
                      }
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
                        color: isCurrent ? THEME.ink : THEME.inkLight,
                        fontWeight: isCurrent ? 600 : 400,
                        textAlign: 'left',
                        marginBottom: '2px',
                      }}
                    >
                      0{i + 1} {isCurrent ? '✓' : ''}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <img
                        src={v.image}
                        alt={v.color}
                        style={{
                          width: '100%',
                          aspectRatio: '3 / 2',
                          objectFit: 'contain',
                          mixBlendMode: 'multiply',
                          transform: 'scale(1.14)',
                        }}
                      />
                    </div>
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
                if (orderMode !== 'wholesale') {
                  triggerHaptic('medium');
                  setOrderMode('wholesale');
                }
              }}
              style={{
                backgroundColor: orderMode === 'wholesale' ? THEME.ink : 'transparent',
                color: orderMode === 'wholesale' ? '#FFFFFF' : THEME.ink,
                border: 'none',
                padding: '11px 8px',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Оптовая ростовка
            </button>
            <button
              onClick={() => {
                if (orderMode !== 'sample') {
                  triggerHaptic('medium');
                  setOrderMode('sample');
                }
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
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Тестовый образец (1 п.)
            </button>
          </div>

          {orderMode === 'wholesale' ? (
            <>
              {/* Шапка комплектации с автоматическим статусом "Своя (X пар)" */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '12px', color: THEME.inkMuted, fontStyle: 'italic', fontFamily: THEME.serif }}>
                  Комплектация короба (40–45):
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.9px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    backgroundColor: isCustomRun ? THEME.ink : THEME.surfaceActive,
                    color: isCustomRun ? '#FFFFFF' : THEME.ink,
                    border: `1px solid ${ isCustomRun ? THEME.ink : THEME.border}`,
                  }}
                >
                  {isStandard8
                    ? 'Стандарт (8 пар)'
                    : isEven6
                    ? 'Ровная (6 пар)'
                    : `Своя (${pairsPerBox} пар)`}
                </span>
              </div>

              {/* Информативные карточки пресетов ростовки */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    setSizeRun({ ...STANDARD_8_RUN });
                  }}
                  style={{
                    backgroundColor: isStandard8 ? THEME.ink : THEME.surface,
                    color: isStandard8 ? '#FFFFFF' : THEME.ink,
                    border: `1px solid ${isStandard8 ? THEME.ink : THEME.border}`,
                    padding: '10px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                    }}
                  >
                    <span>8 пар • Стандарт</span>
                    {isStandard8 && <span>✓</span>}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: isStandard8 ? '#D6D1C7' : THEME.inkMuted,
                      fontFamily: THEME.serif,
                      fontStyle: 'italic',
                    }}
                  >
                    42 и 43 р. — по 2 пары
                  </div>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    setSizeRun({ ...EVEN_6_RUN });
                  }}
                  style={{
                    backgroundColor: isEven6 ? THEME.ink : THEME.surface,
                    color: isEven6 ? '#FFFFFF' : THEME.ink,
                    border: `1px solid ${isEven6 ? THEME.ink : THEME.border}`,
                    padding: '10px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                    }}
                  >
                    <span>6 пар • Ровная</span>
                    {isEven6 && <span>✓</span>}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: isEven6 ? '#D6D1C7' : THEME.inkMuted,
                      fontFamily: THEME.serif,
                      fontStyle: 'italic',
                    }}
                  >
                    40–45 р. — все по 1 паре
                  </div>
                </button>
              </div>

              {/* Таблица размеров с подсветкой удвоенных размеров (2 и более пар) в шапке */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  borderTop: `1px solid ${THEME.border}`,
                  borderLeft: `1px solid ${THEME.border}`,
                  marginBottom: '18px',
                }}
              >
                {SIZES.map((sz) => {
                  const count = sizeRun[sz] || 0;
                  const isDoubled = count >= 2;

                  return (
                    <div
                      key={sz}
                      style={{
                        backgroundColor: count > 0 ? THEME.surface : THEME.bg,
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
                          backgroundColor: isDoubled ? THEME.ink : 'transparent',
                          color: isDoubled ? '#FFFFFF' : THEME.inkMuted,
                          fontWeight: isDoubled ? 600 : 400,
                          padding: '6px 0',
                          borderBottom: `1px solid ${THEME.border}`,
                          letterSpacing: '0.5px',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {sz}
                      </div>
                      <button
                        onClick={() => updateSizeCount(sz, 1)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '7px 0',
                          fontSize: '15px',
                          cursor: count >= 10 ? 'default' : 'pointer',
                          color: count >= 10 ? THEME.border : THEME.ink,
                        }}
                      >
                        +
                      </button>
                      <div
                        style={{
                          fontFamily: THEME.serif,
                          fontSize: '18px',
                          fontWeight: isDoubled ? 700 : 600,
                          padding: '2px 0',
                          color: count > 0 ? THEME.ink : THEME.inkLight,
                        }}
                      >
                        {count}
                      </div>
                      <button
                        onClick={() => updateSizeCount(sz, -1)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '7px 0',
                          fontSize: '15px',
                          cursor: count <= 0 ? 'default' : 'pointer',
                          color: count <= 0 ? THEME.border : THEME.ink,
                        }}
                      >
                        −
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Выбор количества коробов */}
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
                        triggerHaptic('medium');
                        setBoxesCount(num);
                      }}
                      style={{
                        padding: '7px 12px',
                        border: 'none',
                        borderLeft: idx === 0 ? 'none' : `1px solid ${THEME.border}`,
                        backgroundColor: boxesCount === num ? THEME.ink : THEME.surface,
                        color: boxesCount === num ? '#FFFFFF' : THEME.ink,
                        fontSize: '11px',
                        fontWeight: 600,
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
          <span>{justAdded ? '✓ Добавлено в накладную' : 'Добавить в накладную'}</span>
          <span
            style={{
              fontFamily: THEME.serif,
              fontStyle: 'italic',
              fontSize: '15px',
              textTransform: 'none',
              letterSpacing: '0',
            }}
          >
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
      {/* Верхняя шапка с единственным логотипом */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '14px',
          marginBottom: '16px',
          borderBottom: `1px solid ${THEME.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/logo.png"
            alt="Cardio Footwear Logo"
            style={{
              height: '38px',
              width: 'auto',
              objectFit: 'contain',
              mixBlendMode: 'multiply',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '8px',
                letterSpacing: '1.8px',
                textTransform: 'uppercase',
                color: THEME.inkMuted,
                fontWeight: 600,
              }}
            >
              ХАРЬКОВ
            </span>
            <span
              style={{
                fontSize: '9px',
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: THEME.ink,
                fontFamily: THEME.serif,
                fontStyle: 'italic',
              }}
            >
              Оптовый каталог
            </span>
          </div>
        </div>

        {onBack && (
          <button
            onClick={() => {
              triggerHaptic('light');
              onBack();
            }}
            style={{
              background: 'transparent',
              border: `1px solid ${THEME.border}`,
              padding: '6px 12px',
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

      {/* Hero-баннер с оконным параллакс-эффектом */}
      <div
        ref={bannerRef}
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '20px',
          border: `1px solid ${THEME.border}`,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
          position: 'relative',
          backgroundColor: THEME.surfaceActive,
        }}
      >
        <img
          src="/baner.jpg"
          alt="Cardio Men's Footwear Banner"
          style={{
            position: 'absolute',
            top: '-13%',
            left: 0,
            width: '100%',
            height: '126%',
            objectFit: 'cover',
            display: 'block',
            transform: `translate3d(0, ${parallaxY}px, 0) scale(${parallaxScale})`,
            willChange: 'transform',
          }}
        />
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
            onClick={() => {
              triggerHaptic('light');
              setSearchQuery('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: THEME.inkMuted,
              cursor: 'pointer',
              fontSize: '12px',
              padding: '4px',
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

      {/* Счетчик моделей + Переключатель вида сетки (2 КОЛ. / КРУПНО) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          letterSpacing: '1.2px',
          textTransform: 'uppercase',
          color: THEME.inkMuted,
          marginBottom: '10px',
        }}
      >
        <span>НАЙДЕНО: {filteredShoes.length}</span>

        <div style={{ display: 'flex', border: `1px solid ${THEME.border}` }}>
          <button
            onClick={() => {
              if (gridMode !== '2col') {
                triggerHaptic('medium');
                setGridMode('2col');
              }
            }}
            style={{
              backgroundColor: gridMode === '2col' ? THEME.ink : THEME.surface,
              color: gridMode === '2col' ? '#FFFFFF' : THEME.inkMuted,
              border: 'none',
              padding: '5px 9px',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.9px',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            2 КОЛ.
          </button>
          <button
            onClick={() => {
              if (gridMode !== 'large') {
                triggerHaptic('medium');
                setGridMode('large');
              }
            }}
            style={{
              backgroundColor: gridMode === 'large' ? THEME.ink : THEME.surface,
              color: gridMode === 'large' ? '#FFFFFF' : THEME.inkMuted,
              border: 'none',
              borderLeft: `1px solid ${THEME.border}`,
              padding: '5px 9px',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.9px',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            КРУПНО
          </button>
        </div>
      </div>

      {/* Сетка каталога (без дублирующегося логотипа, padding: 8px, пропорция под силуэт обуви + scale 1.14) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: gridMode === 'large' ? '1fr' : 'repeat(2, 1fr)',
          borderTop: `1px solid ${THEME.border}`,
          borderLeft: `1px solid ${THEME.border}`,
        }}
      >
        {filteredShoes.map((shoe) => {
          const variantsCount = cardioCatalog.filter((i) => i.modelNumber === shoe.modelNumber).length;
          const inCartPairs = pairsInCartByShoeId[shoe.id] || 0;
          const isLarge = gridMode === 'large';

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
                padding: isLarge ? '14px' : '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                position: 'relative',
                boxSizing: 'border-box',
              }}
            >
              {/* Верхняя строка карточки: только категория или бейдж заказа (логотип убран) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                  minHeight: '16px',
                }}
              >
                <span
                  style={{
                    fontSize: isLarge ? '10px' : '8px',
                    color: THEME.inkLight,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                  }}
                >
                  {shoe.category}
                </span>

                {inCartPairs > 0 ? (
                  <span
                    style={{
                      backgroundColor: THEME.ink,
                      color: '#FFFFFF',
                      padding: '2px 5px',
                      fontSize: '8px',
                      letterSpacing: '0.6px',
                      fontWeight: 600,
                    }}
                  >
                    В ЗАКАЗЕ: {inCartPairs} П.
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: isLarge ? '10px' : '8px',
                      color: THEME.inkLight,
                      letterSpacing: '0.6px',
                    }}
                  >
                    {variantsCount > 1 ? `${variantsCount} ЦВ.` : '40—45'}
                  </span>
                )}
              </div>

              {/* Контейнер фото без внутренних отступов, с вытянутой пропорцией 3:2 / 16:10 и кадрированием scale(1.14) */}
              <div
                style={{
                  padding: 0,
                  marginBottom: '8px',
                  overflow: 'hidden',
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
                    aspectRatio: isLarge ? '16 / 10' : '3 / 2',
                    objectFit: 'contain',
                    display: 'block',
                    mixBlendMode: 'multiply',
                    filter: 'contrast(1.04)',
                    transform: 'scale(1.14)',
                  }}
                />
              </div>

              {/* Информация о модели */}
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
                      fontSize: isLarge ? '26px' : '19px',
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
                        fontSize: isLarge ? '13px' : '11px',
                        color: THEME.inkMuted,
                      }}
                    >
                      {shoe.variant}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: isLarge ? '11px' : '10px',
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

                {/* В режиме "КРУПНО" показываем материалы/характеристики прямо в каталоге */}
                {isLarge && shoe.features.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                    {shoe.features.map((f) => (
                      <span
                        key={f}
                        style={{
                          fontSize: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.7px',
                          padding: '2px 6px',
                          border: `1px solid ${THEME.border}`,
                          color: THEME.inkMuted,
                          backgroundColor: THEME.bg,
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    marginTop: '8px',
                    paddingTop: '6px',
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
                    {variantsCount > 1 ? `${variantsCount} ЦВЕТА` : 'РОСТОВКА 40—45'}
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
