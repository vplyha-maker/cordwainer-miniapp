import { useState, useMemo, useEffect, useRef } from 'react';
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

// Безопасный URL для файла со скобками в public/logo(1).mp4
const HERO_VIDEO_SRC = '/logo%281%29.mp4';
const FOOTER_BANNER_SRC = '/baner.jpg';

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

// ============================================================================
// ИСПРАВЛЕННЫЙ ТАКТИЛЬНО-АКУСТИЧЕСКИЙ ДВИЖОК ДЛЯ ANDROID И iOS (БЕЗ ОТМЕНЫ ИМПУЛЬСА)
// ============================================================================
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playTapticClick(level: 'light' | 'medium' | 'success') {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (level === 'light') {
      // Усиленный плотный щелчок (28 мс), хорошо слышимый и ощутимый на динамиках Android и iPhone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(240, now);
      osc1.frequency.exponentialRampToValueAtTime(58, now + 0.026);

      gain1.gain.setValueAtTime(0.38, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.026);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.028);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(520, now);
      osc2.frequency.exponentialRampToValueAtTime(140, now + 0.012);

      gain2.gain.setValueAtTime(0.18, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.014);
    } else if (level === 'medium') {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(155, now);
      osc1.frequency.exponentialRampToValueAtTime(44, now + 0.032);

      gain1.gain.setValueAtTime(0.45, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.034);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(720, now + 0.004);
      osc2.frequency.exponentialRampToValueAtTime(190, now + 0.02);

      gain2.gain.setValueAtTime(0.22, now + 0.004);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.004);
      osc2.stop(now + 0.022);
    } else if (level === 'success') {
      [523.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.055;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.095);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.1);
      });
    }
  } catch {
    // Ignore audio context restrictions
  }
}

function fireHaptic(level: 'light' | 'medium' | 'success') {
  playTapticClick(level);

  const isAndroid =
    typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');

  // 1. Одиночный неконфликтующий вызов Telegram HapticFeedback
  // На Android 'light' и 'selectionChanged' слишком слабы или гасят друг друга,
  // поэтому на Android передаем 'heavy' / 'rigid'.
  try {
    const tgHaptic = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            HapticFeedback?: {
              impactOccurred?: (s: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
              notificationOccurred?: (t: 'error' | 'success' | 'warning') => void;
              selectionChanged?: () => void;
            };
          };
        };
      }
    ).Telegram?.WebApp?.HapticFeedback;

    if (tgHaptic) {
      if (level === 'light') {
        if (isAndroid) {
          tgHaptic.impactOccurred?.('heavy');
        } else {
          tgHaptic.impactOccurred?.('medium');
        }
      } else if (level === 'medium') {
        tgHaptic.impactOccurred?.('heavy');
      } else if (level === 'success') {
        tgHaptic.notificationOccurred?.('success');
      }
    }
  } catch {
    // Ignore
  }

  // 2. Прямой вызов системного вибромотора Android (без дублирования с другими функциями)
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if (level === 'light') {
        navigator.vibrate(45);
      } else if (level === 'medium') {
        navigator.vibrate(65);
      } else if (level === 'success') {
        navigator.vibrate([45, 35, 90]);
      }
    }
  } catch {
    // Ignore
  }
}

export function Materials({ onBack }: MaterialsProps) {
  const [activeCategory, setActiveCategory] = useState<'Все' | ShoeCategory>('Все');
  const [activeFeature, setActiveFeature] = useState<string>('Все');
  const [searchQuery, setSearchQuery] = useState('');
  const [gridMode, setGridMode] = useState<'2col' | 'large'>('2col');

  const [selectedShoe, setSelectedShoe] = useState<ShoeItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Рефы для ВЕРХНЕГО ВИДЕО-ПАРАЛЛАКСА (Under-Scroll Stage)
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const bannerAnchorRef = useRef<HTMLDivElement>(null);
  const bannerStageRef = useRef<HTMLDivElement>(null);
  const bannerGlareRef = useRef<HTMLDivElement>(null);
  const bannerShadowRef = useRef<HTMLDivElement>(null);
  const initialBannerTopRef = useRef<number | null>(null);

  // Рефы для НИЖНЕГО КАМПЕЙН-ПАРАЛЛАКСА (Curtain Reveal Finale)
  const footerAnchorRef = useRef<HTMLDivElement>(null);
  const footerStageRef = useRef<HTMLDivElement>(null);
  const footerGlareRef = useRef<HTMLDivElement>(null);
  const footerShadowRef = useRef<HTMLDivElement>(null);

  // Инициализация Telegram WebApp и разблокировка AudioContext при первом касании
  useEffect(() => {
    try {
      (window as unknown as { Telegram?: { WebApp?: { ready?: () => void } } }).Telegram?.WebApp?.ready?.();
    } catch {
      // Ignore
    }

    const unlockAudio = () => {
      getAudioContext();
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Надежный автозапуск видео для iOS и Android
  useEffect(() => {
    if (selectedShoe || isCartOpen) return;

    const videoEl = heroVideoRef.current;
    if (!videoEl) return;

    videoEl.muted = true;
    videoEl.defaultMuted = true;
    videoEl.playsInline = true;
    videoEl.setAttribute('muted', '');
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('webkit-playsinline', '');
    videoEl.setAttribute('autoplay', '');

    if (videoEl.readyState >= 2) {
      setIsVideoReady(true);
    }

    const tryPlay = () => {
      if (!videoEl) return;
      videoEl.muted = true;
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsVideoReady(true);
          })
          .catch(() => {
            setIsVideoReady(true);
          });
      }
    };

    tryPlay();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tryPlay();
      }
    };

    window.addEventListener('touchstart', tryPlay, { passive: true, once: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    const fallbackTimer = window.setTimeout(() => setIsVideoReady(true), 150);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('touchstart', tryPlay);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [selectedShoe, isCartOpen]);

  // Единый 60FPS цикл для верхнего видео и нижнего баннера
  useEffect(() => {
    if (selectedShoe || isCartOpen) return;

    initialBannerTopRef.current = null;
    let rafId = 0;

    const applyDualParallax = () => {
      const viewportH = window.innerHeight || document.documentElement.clientHeight || 800;
      const pageScrollY = window.scrollY ?? window.pageYOffset ?? 0;

      // 1. ВЕРХНИЙ HERO ВИДЕО-БАННЕР
      const topAnchor = bannerAnchorRef.current;
      const topStage = bannerStageRef.current;
      if (topAnchor && topStage) {
        const rect = topAnchor.getBoundingClientRect();

        if (initialBannerTopRef.current === null) {
          initialBannerTopRef.current = rect.top + Math.max(0, pageScrollY);
        }

        const rawScrolled =
          pageScrollY > 0
            ? pageScrollY
            : Math.max(0, (initialBannerTopRef.current || 0) - rect.top);

        const maxScroll = 320;
        const clamped = Math.max(0, Math.min(maxScroll, rawScrolled));
        const progress = clamped / maxScroll;

        const translateY = clamped * 0.55;
        const scale = 1 - progress * 0.065;
        const rotateX = progress * 8;

        topStage.style.transform = `perspective(900px) translate3d(0, ${translateY.toFixed(1)}px, 0) scale(${scale.toFixed(4)}) rotateX(${rotateX.toFixed(2)}deg)`;

        if (bannerGlareRef.current) {
          const glareShift = -45 + progress * 110;
          bannerGlareRef.current.style.transform = `translate3d(${glareShift.toFixed(1)}%, 0, 0) skewX(-22deg)`;
          bannerGlareRef.current.style.opacity = `${0.14 + progress * 0.44}`;
        }

        if (bannerShadowRef.current) {
          bannerShadowRef.current.style.opacity = `${progress * 0.48}`;
        }
      }

      // 2. НИЖНИЙ ФИНАЛЬНЫЙ БАННЕР /baner.jpg
      const botAnchor = footerAnchorRef.current;
      const botStage = footerStageRef.current;
      if (botAnchor && botStage) {
        const fRect = botAnchor.getBoundingClientRect();
        const revealSpan = Math.max(260, fRect.height + 110);

        const visiblePx = viewportH - fRect.top;
        const fProgress = Math.max(0, Math.min(1, visiblePx / revealSpan));
        const inv = 1 - fProgress;

        const fTranslateY = -inv * 62;
        const fScale = 0.92 + fProgress * 0.08;
        const fRotateX = -inv * 9;

        botStage.style.transform = `perspective(900px) translate3d(0, ${fTranslateY.toFixed(1)}px, 0) scale(${fScale.toFixed(4)}) rotateX(${fRotateX.toFixed(2)}deg)`;

        if (footerGlareRef.current) {
          const fGlareShift = -55 + fProgress * 115;
          footerGlareRef.current.style.transform = `translate3d(${fGlareShift.toFixed(1)}%, 0, 0) skewX(-22deg)`;
          footerGlareRef.current.style.opacity = `${0.1 + fProgress * 0.42}`;
        }

        if (footerShadowRef.current) {
          footerShadowRef.current.style.opacity = `${inv * 0.58}`;
        }
      }
    };

    const onScrollOrTouch = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(applyDualParallax);
    };

    applyDualParallax();

    window.addEventListener('scroll', onScrollOrTouch, { passive: true, capture: true });
    document.addEventListener('scroll', onScrollOrTouch, { passive: true, capture: true });
    window.addEventListener('touchmove', onScrollOrTouch, { passive: true });
    window.addEventListener('resize', onScrollOrTouch, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrTouch, { capture: true });
      document.removeEventListener('scroll', onScrollOrTouch, { capture: true });
      window.removeEventListener('touchmove', onScrollOrTouch);
      window.removeEventListener('resize', onScrollOrTouch);
    };
  }, [selectedShoe, isCartOpen, activeCategory, activeFeature, searchQuery, gridMode]);

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

  // Мгновенный сброс скролла (без behavior: 'smooth'), чтобы не сбивался GPU-слой изображения
  useEffect(() => {
    if (selectedShoe) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      setJustAdded(false);
    }
  }, [selectedShoe]);

  const pairsPerBox = useMemo(() => {
    return SIZES.reduce((sum, sz) => sum + (sizeRun[sz] || 0), 0);
  }, [sizeRun]);

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

  const updateSizeCount = (size: SizeKey, delta: number) => {
    const currentVal = sizeRun[size] || 0;
    const nextVal = Math.max(0, Math.min(10, currentVal + delta));

    if (nextVal !== currentVal) {
      fireHaptic('light');
      setSizeRun((prev) => ({ ...prev, [size]: nextVal }));
    }
  };

  const addCurrentShoeToCart = () => {
    if (!selectedShoe || totalPairs === 0) return;

    fireHaptic('success');

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
          fireHaptic('medium');
          setCart((prev) =>
            prev.map((item) => {
              if (item.uid !== uid) return item;
              const pairsPerRun = Object.values(item.sizeRun).reduce((a, b) => a + b, 0);
              const newTotalPairs = pairsPerRun * newBoxes;
              const updatedFormula =
                item.orderMode === 'sample'
                  ? item.formulaText
                  : `Ростовок ×${newBoxes}: ` +
                    SIZES.filter((sz) => item.sizeRun[sz] > 0)
                      .map((sz) => `${sz}р.(${item.sizeRun[sz] * newBoxes})`)
                      .join(' • ');
              return {
                ...item,
                boxesCount: newBoxes,
                totalPairs: newTotalPairs,
                formulaText: updatedFormula,
              };
            })
          );
        }}
        onRemove={(uid) => {
          fireHaptic('medium');
          setCart((prev) => prev.filter((item) => item.uid !== uid));
        }}
        onClear={() => {
          fireHaptic('medium');
          setCart([]);
        }}
        onClose={() => {
          fireHaptic('light');
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
          padding: '16px 16px 110px 16px',
          color: THEME.ink,
          boxSizing: 'border-box',
          fontFamily: THEME.sans,
        }}
      >
        {/* Шапка карточки модели с увеличенным логотипом */}
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
                height: '46px',
                width: 'auto',
                objectFit: 'contain',
                mixBlendMode: 'multiply',
                display: 'block',
              }}
            />
            <div
              style={{
                width: '1px',
                height: '28px',
                backgroundColor: THEME.border,
              }}
            />
            <button
              onClick={() => {
                fireHaptic('light');
                setSelectedShoe(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '6px 2px',
                fontSize: '11px',
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
              fireHaptic('medium');
              setIsCartOpen(true);
            }}
            style={{
              background: cart.length > 0 ? THEME.ink : 'transparent',
              border: `1px solid ${THEME.ink}`,
              padding: '8px 12px',
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
                fireHaptic('medium');
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

        {/* Блок фотографии модели — изолированный контейнер с явным фоном THEME.surface без filter */}
        <div
          style={{
            backgroundColor: THEME.surface,
            border: `1px solid ${THEME.border}`,
            padding: '14px 12px',
            marginBottom: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              position: 'relative',
              zIndex: 2,
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
              aspectRatio: '16 / 10',
              backgroundColor: THEME.surface,
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <img
              src={selectedShoe.image}
              alt={`Модель ${selectedShoe.modelNumber}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                mixBlendMode: 'multiply',
                transform: 'scale(1.08)',
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
                position: 'relative',
                zIndex: 2,
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
                const cellBg = isCurrent ? THEME.surfaceActive : THEME.surface;
                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      if (!isCurrent) {
                        fireHaptic('medium');
                        setSelectedShoe(v);
                      }
                    }}
                    style={{
                      borderRight: `1px solid ${THEME.border}`,
                      borderBottom: `1px solid ${THEME.border}`,
                      backgroundColor: cellBg,
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
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '3 / 2',
                        overflow: 'hidden',
                        backgroundColor: cellBg,
                      }}
                    >
                      <img
                        src={v.image}
                        alt={v.color}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          display: 'block',
                          mixBlendMode: 'multiply',
                          transform: 'scale(1.1)',
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
                  fireHaptic('medium');
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
                  fireHaptic('medium');
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
                    border: `1px solid ${isCustomRun ? THEME.ink : THEME.border}`,
                  }}
                >
                  {isStandard8
                    ? 'Стандарт (8 пар)'
                    : isEven6
                    ? 'Ровная (6 пар)'
                    : `Своя (${pairsPerBox} пар)`}
                </span>
              </div>

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
                    fireHaptic('medium');
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
                    fireHaptic('medium');
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
                        type="button"
                        onClick={() => updateSizeCount(sz, 1)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '8px 0',
                          fontSize: '16px',
                          cursor: count >= 10 ? 'default' : 'pointer',
                          color: count >= 10 ? THEME.border : THEME.ink,
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
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
                        type="button"
                        onClick={() => updateSizeCount(sz, -1)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '8px 0',
                          fontSize: '16px',
                          cursor: count <= 0 ? 'default' : 'pointer',
                          color: count <= 0 ? THEME.border : THEME.ink,
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        −
                      </button>
                    </div>
                  );
                })}
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
                      type="button"
                      key={num}
                      onClick={() => {
                        fireHaptic('light');
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
                        touchAction: 'manipulation',
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
                    type="button"
                    key={sz}
                    onClick={() => {
                      fireHaptic('light');
                      setSampleSize(sz);
                    }}
                    style={{
                      padding: '14px 0',
                      border: 'none',
                      borderRight: `1px solid ${THEME.border}`,
                      borderBottom: `1px solid ${THEME.border}`,
                      backgroundColor: sampleSize === sz ? THEME.ink : THEME.surface,
                      color: sampleSize === sz ? '#FFFFFF' : THEME.ink,
                      fontSize: '13px',
                      fontFamily: THEME.serif,
                      cursor: 'pointer',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
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

  // ЭКРАН 3: ОСНОВНОЙ КАТАЛОГ С ОБНОВЛЕННОЙ ШАПКОЙ И ОТКРЫТЫМ ВИДЕО-БАННЕРОМ
  return (
    <div
      style={{
        backgroundColor: THEME.bg,
        minHeight: '100vh',
        padding: '16px 16px 120px 16px',
        color: THEME.ink,
        fontFamily: THEME.sans,
        boxSizing: 'border-box',
      }}
    >
      {/* Верхняя дизайнерская шапка: крупный логотип + CARDIO / KHARKIV • CATALOG 2026 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '14px',
          marginBottom: '14px',
          borderBottom: `1px solid ${THEME.border}`,
          position: 'relative',
          zIndex: 6,
          backgroundColor: THEME.bg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/logo.png"
            alt="Cardio Footwear Logo"
            style={{
              height: '56px',
              width: 'auto',
              objectFit: 'contain',
              mixBlendMode: 'multiply',
              display: 'block',
            }}
          />
          <div
            style={{
              width: '1px',
              height: '36px',
              backgroundColor: THEME.border,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span
              style={{
                fontFamily: THEME.serif,
                fontSize: '22px',
                fontWeight: 600,
                letterSpacing: '3.6px',
                textTransform: 'uppercase',
                color: THEME.ink,
                lineHeight: 1,
              }}
            >
              CARDIO
            </span>
            <span
              style={{
                fontSize: '9px',
                letterSpacing: '2.1px',
                textTransform: 'uppercase',
                color: THEME.inkMuted,
                fontWeight: 500,
                lineHeight: 1.1,
              }}
            >
              KHARKIV • CATALOG 2026
            </span>
          </div>
        </div>

        {onBack && (
          <button
            onClick={() => {
              fireHaptic('light');
              onBack();
            }}
            style={{
              background: 'transparent',
              border: `1px solid ${THEME.border}`,
              padding: '7px 12px',
              fontSize: '9px',
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              color: THEME.ink,
              whiteSpace: 'nowrap',
            }}
          >
            ← На главную
          </button>
        )}
      </div>

      {/* ==================================================================== */}
      {/* ВЕРХНЯЯ КУЛИСА: ВИДЕО-БАННЕР БЕЗ ПЕРЕКРЫТИЯ 3D-ЛОГОТИПА               */}
      {/* ==================================================================== */}
      <div
        ref={bannerAnchorRef}
        style={{
          width: '100%',
          marginBottom: '20px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Редакционная строка вынесена НАД видео, чтобы не перекрывать верх 3D-логотипа */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
            padding: '0 2px',
          }}
        >
          <span
            style={{
              fontSize: '8px',
              letterSpacing: '1.6px',
              textTransform: 'uppercase',
              color: THEME.inkMuted,
              fontWeight: 600,
            }}
          >
            ● MOTION LOOKBOOK
          </span>
          <span
            style={{
              fontSize: '8px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: THEME.inkMuted,
              fontWeight: 600,
            }}
          >
            CARDIO // 40—45
          </span>
        </div>

        <div
          ref={bannerStageRef}
          style={{
            width: '100%',
            borderRadius: '4px',
            overflow: 'hidden',
            border: `1px solid ${THEME.border}`,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            position: 'relative',
            backgroundColor: '#121212',
            transformOrigin: 'center bottom',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          }}
        >
          <video
            ref={heroVideoRef}
            src={HERO_VIDEO_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onLoadedData={() => setIsVideoReady(true)}
            onCanPlay={() => setIsVideoReady(true)}
            onPlay={() => setIsVideoReady(true)}
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              objectFit: 'cover',
              display: 'block',
              backgroundColor: '#121212',
              opacity: isVideoReady ? 1 : 0,
              transition: 'opacity 0.22s ease-out',
            }}
          />

          {/* Скользящий солнечный блик по видео при скролле */}
          <div
            ref={bannerGlareRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '65%',
              height: '100%',
              background:
                'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,244,214,0.36) 50%, rgba(255,255,255,0) 100%)',
              mixBlendMode: 'overlay',
              pointerEvents: 'none',
              opacity: 0.14,
              transform: 'translate3d(-45%, 0, 0) skewX(-22deg)',
              willChange: 'transform, opacity',
              zIndex: 2,
            }}
          />

          {/* Глубинное затенение, когда каталог наезжает поверх видео */}
          <div
            ref={bannerShadowRef}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(22,21,20,0.06) 0%, rgba(22,21,20,0.72) 100%)',
              pointerEvents: 'none',
              opacity: 0,
              willChange: 'opacity',
              zIndex: 2,
            }}
          />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ОСНОВНОЕ ПОЛОТНО КАТАЛОГА                                            */}
      {/* ==================================================================== */}
      <div
        style={{
          position: 'relative',
          zIndex: 5,
          backgroundColor: THEME.bg,
          paddingTop: '4px',
          paddingBottom: '22px',
          boxShadow:
            '0 -12px 20px -8px rgba(242, 239, 233, 0.98), 0 18px 28px -10px rgba(22, 21, 20, 0.16)',
          borderBottom: `1px solid ${THEME.border}`,
        }}
      >
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
                fireHaptic('light');
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
                  fireHaptic('light');
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
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {FEATURE_FILTERS.map((feat) => {
            const isActive = activeFeature === feat;
            return (
              <button
                key={feat}
                onClick={() => {
                  fireHaptic('light');
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

        {/* Счетчик моделей + Переключатель вида сетки */}
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
                  fireHaptic('medium');
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
                  fireHaptic('medium');
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

        {/* Сетка каталога */}
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
            const cardBg = inCartPairs > 0 ? '#EFECE4' : THEME.surface;

            return (
              <div
                key={shoe.id}
                onClick={() => {
                  fireHaptic('light');
                  setSelectedShoe(shoe);
                }}
                style={{
                  backgroundColor: cardBg,
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

                <div
                  style={{
                    width: '100%',
                    aspectRatio: isLarge ? '16 / 10' : '3 / 2',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    backgroundColor: cardBg,
                    position: 'relative',
                  }}
                >
                  <img
                    src={shoe.image}
                    alt={`Модель ${shoe.modelNumber}`}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      mixBlendMode: 'multiply',
                      transform: 'scale(1.1)',
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
      </div>

      {/* ==================================================================== */}
      {/* НИЖНЯЯ КУЛИСА: ФИНАЛЬНЫЙ БАННЕР public/baner.jpg С ПАРАЛЛАКС-ВЫЕЗДОМ */}
      {/* ==================================================================== */}
      <div
        ref={footerAnchorRef}
        style={{
          width: '100%',
          marginTop: '24px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '9px',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: THEME.inkMuted,
            marginBottom: '10px',
          }}
        >
          <span>ФИНАЛ ЭКСПОЗИЦИИ // CARDIO B2B</span>
          <span style={{ fontFamily: THEME.serif, fontStyle: 'italic', textTransform: 'none', fontSize: '12px' }}>
            Прямой опт от фабрики
          </span>
        </div>

        <div
          ref={footerStageRef}
          style={{
            width: '100%',
            borderRadius: '4px',
            overflow: 'hidden',
            border: `1px solid ${THEME.border}`,
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.12)',
            position: 'relative',
            backgroundColor: '#161514',
            transformOrigin: 'center top',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          }}
        >
          <img
            src={FOOTER_BANNER_SRC}
            alt="Cardio Men's Footwear Campaign Banner"
            loading="lazy"
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              objectFit: 'contain',
              display: 'block',
            }}
          />

          <div
            ref={footerGlareRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '65%',
              height: '100%',
              background:
                'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,244,214,0.38) 50%, rgba(255,255,255,0) 100%)',
              mixBlendMode: 'overlay',
              pointerEvents: 'none',
              opacity: 0.15,
              transform: 'translate3d(-55%, 0, 0) skewX(-22deg)',
              willChange: 'transform, opacity',
            }}
          />

          <div
            ref={footerShadowRef}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(22,21,20,0.65) 0%, rgba(22,21,20,0.05) 100%)',
              pointerEvents: 'none',
              opacity: 0.4,
              willChange: 'opacity',
            }}
          />
        </div>

        <div
          style={{
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: `1px solid ${THEME.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <button
            onClick={() => {
              fireHaptic('light');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{
              backgroundColor: THEME.surface,
              border: `1px solid ${THEME.border}`,
              padding: '9px 14px',
              fontSize: '9px',
              letterSpacing: '1.3px',
              textTransform: 'uppercase',
              fontWeight: 600,
              color: THEME.ink,
              cursor: 'pointer',
            }}
          >
            ↑ В начало каталога
          </button>

          {cart.length > 0 ? (
            <button
              onClick={() => {
                fireHaptic('medium');
                setIsCartOpen(true);
              }}
              style={{
                backgroundColor: THEME.ink,
                border: `1px solid ${THEME.ink}`,
                padding: '9px 14px',
                fontSize: '9px',
                letterSpacing: '1.3px',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              Оформить ({cartTotalPairs} п.) →
            </button>
          ) : (
            <span
              style={{
                fontFamily: THEME.serif,
                fontStyle: 'italic',
                fontSize: '12px',
                color: THEME.inkMuted,
              }}
            >
              Выберите модель для заказа
            </span>
          )}
        </div>
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
                fireHaptic('medium');
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
