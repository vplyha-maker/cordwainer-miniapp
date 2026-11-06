import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  cardioCatalog, 
  getLocalizedCategory, 
  getLocalizedColor, 
  getLocalizedFeature, 
  type ShoeCategory, 
  type ShoeItem, 
  type CartItem, 
  type SizeKey 
} from '../data/catalog';
import { WholesaleCart } from '../components/WholesaleCart';
import type { Lang } from '../App';

type MaterialsProps = {
  onBack?: () => void;
  lang?: Lang;
};

const CATEGORIES: ('Все' | ShoeCategory)[] = ['Все', 'Ботинки', 'Кроссовки', 'Туфли'];
const FEATURE_FILTERS = ['Все', 'Мех', 'Gore-Tex', 'Подошва трактор'] as const;

const SIZES = [40, 41, 42, 43, 44, 45] as const;

const STANDARD_8_RUN: Record<SizeKey, number> = { 40: 1, 41: 1, 42: 2, 43: 2, 44: 1, 45: 1 };
const EVEN_6_RUN: Record<SizeKey, number> = { 40: 1, 41: 1, 42: 1, 43: 1, 44: 1, 45: 1 };

const CART_STORAGE_KEY = 'cardio_b2b_cart_v1';

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

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) sharedAudioCtx = new AudioCtx();
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
  } catch {}
}

function fireHaptic(level: 'light' | 'medium' | 'success') {
  playTapticClick(level);
  try {
    const tgHaptic = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            HapticFeedback?: {
              impactOccurred?: (s: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
              notificationOccurred?: (t: 'error' | 'success' | 'warning') => void;
            };
          };
        };
      }
    ).Telegram?.WebApp?.HapticFeedback;

    if (tgHaptic) {
      if (level === 'light') tgHaptic.impactOccurred?.('medium');
      else if (level === 'medium') tgHaptic.impactOccurred?.('heavy');
      else if (level === 'success') tgHaptic.notificationOccurred?.('success');
    }
  } catch {}
}

export function Materials({ onBack, lang = 'ru' }: MaterialsProps) {
  const safeLang = lang && ['ru', 'uk', 'de'].includes(lang) ? lang : 'ru';

  const t = {
    ru: {
      catalogBtn: 'Каталог',
      invoiceBtn: (p: number) => `Накладная (${p} п.)`,
      alreadyInCart: (p: number) => `Уже в вашей накладной: ${p} пар`,
      openWord: 'Открыть →',
      cardTitle: 'КАРТОЧКА МОДЕЛИ',
      colorLabel: 'Цвет:',
      availableColors: 'ДОСТУПНЫЕ ЦВЕТА МОДЕЛИ',
      orderParams: 'ПАРАМЕТРЫ ЗАКАЗА',
      wholesaleRun: 'Оптовая ростовка',
      sampleRun: 'Тестовый образец (1 п.)',
      standard8: '8 пар • Стандарт',
      standard8Desc: '42 и 43 р. — по 2 пары',
      even6: '6 пар • Ровная',
      even6Desc: '40–45 р. — все по 1 паре',
      boxesCountLabel: 'Количество коробов:',
      samplePrompt: 'Выберите размер тестового образца:',
      addedSuccess: '✓ Добавлено в накладную',
      addToCart: 'Добавить в накладную',
      mainPageBtn: '← Главная',
      searchPlaceholder: 'Номер модели или цвет...',
      searchLabel: 'Поиск:',
      found: (n: number) => `НАЙДЕНО: ${n}`,
      grid2Col: '2 КОЛ.',
      gridLarge: 'КРУПНО',
      inCartBadge: (p: number) => `В ЗАКАЗЕ: ${p} П.`,
      chooseBtn: 'Выбрать →',
      reorderBtn: 'Дозаказать →',
      topToBeginning: '↑ В начало каталога',
      checkoutBtn: (p: number) => `Оформить (${p} п.) →`,
      chooseModelPrompt: 'Выберите модель для заказа',
      bottomOrderTitle: 'ВАШ ОПТОВЫЙ ЗАКАЗ',
      bottomInvoiceText: (m: number, p: number) => `Накладная: ${m} мод. (${p} пар)`,
      openInvoiceBtn: 'Открыть накладную →',
      footerSub: 'ФИНАЛ ЭКСПОЗИЦИИ // CARDIO B2B',
      footerNote: 'Прямой опт от фабрики',
      catAll: 'Все',
      catBoots: 'Ботинки',
      catSneakers: 'Кроссовки',
      catShoes: 'Туфли',
      featAll: 'Все модели',
      featFur: 'Мех',
      featGore: 'Gore-Tex',
      featSole: 'Подошва трактор',
      colorsCountLabel: (c: number) => `${c} ЦВЕТА`,
    },
    uk: {
      catalogBtn: 'Каталог',
      invoiceBtn: (p: number) => `Накладна (${p} п.)`,
      alreadyInCart: (p: number) => `Вже у вашій накладній: ${p} пар`,
      openWord: 'Відкрити →',
      cardTitle: 'КАРТКА МОДЕЛІ',
      colorLabel: 'Колір:',
      availableColors: 'ДОСТУПНІ КОЛЬОРИ МОДЕЛІ',
      orderParams: 'ПАРАМЕТРИ ЗАМОВЛЕННЯ',
      wholesaleRun: 'Гуртова ростовка',
      sampleRun: 'Тестовий зразок (1 п.)',
      standard8: '8 пар • Стандарт',
      standard8Desc: '42 і 43 р. — по 2 пари',
      even6: '6 пар • Рівна',
      even6Desc: '40–45 р. — всі по 1 парі',
      boxesCountLabel: 'Кількість коробів:',
      samplePrompt: 'Виберіть розмір тестового зразка:',
      addedSuccess: '✓ Додано до накладної',
      addToCart: 'Додати до накладної',
      mainPageBtn: '← Головна',
      searchPlaceholder: 'Номер моделі або колір...',
      searchLabel: 'Пошук:',
      found: (n: number) => `ЗНАЙДЕНО: ${n}`,
      grid2Col: '2 КОЛ.',
      gridLarge: 'ВЕЛИКО',
      inCartBadge: (p: number) => `У ЗАМОВЛЕННІ: ${p} П.`,
      chooseBtn: 'Вибрати →',
      reorderBtn: 'Дозамовити →',
      topToBeginning: '↑ На початок каталогу',
      checkoutBtn: (p: number) => `Оформити (${p} п.) →`,
      chooseModelPrompt: 'Виберіть модель для замовлення',
      bottomOrderTitle: 'ВАШЕ ГУРТОВЕ ЗАМОВЛЕННЯ',
      bottomInvoiceText: (m: number, p: number) => `Накладна: ${m} мод. (${p} пар)`,
      openInvoiceBtn: 'Відкрити накладну →',
      footerSub: 'ФІНАЛ ЕКСПОЗИЦІЇ // CARDIO B2B',
      footerNote: 'Прямий гурт від фабрики',
      catAll: 'Всі',
      catBoots: 'Черевики',
      catSneakers: 'Кросівки',
      catShoes: 'Туфлі',
      featAll: 'Всі моделі',
      featFur: 'Хутро',
      featGore: 'Gore-Tex',
      featSole: 'Підошва трактор',
      colorsCountLabel: (c: number) => `${c} КОЛЬОРИ`,
    },
    de: {
      catalogBtn: 'Katalog',
      invoiceBtn: (p: number) => `Rechnung (${p} P.)`,
      alreadyInCart: (p: number) => `Bereits auf der Rechnung: ${p} Paar`,
      openWord: 'Öffnen →',
      cardTitle: 'MODELLKARTE',
      colorLabel: 'Farbe:',
      availableColors: 'VERFÜGBARE FARBEN',
      orderParams: 'BESTELLPARAMETER',
      wholesaleRun: 'Großhandelsserie',
      sampleRun: 'Testmuster (1 P.)',
      standard8: '8 Paar • Standard',
      standard8Desc: 'Gr. 42 & 43 — je 2 Paar',
      even6: '6 Paar • Gleich',
      even6Desc: 'Gr. 40–45 — je 1 Paar',
      boxesCountLabel: 'Anzahl Kisten:',
      samplePrompt: 'Testmuster-Größe wählen:',
      addedSuccess: '✓ Zur Rechnung hinzugefügt',
      addToCart: 'Zur Rechnung hinzufügen',
      mainPageBtn: '← Startseite',
      searchPlaceholder: 'Modellnummer oder Farbe...',
      searchLabel: 'Suche:',
      found: (n: number) => `GEFUNDEN: ${n}`,
      grid2Col: '2 SPALTEN',
      gridLarge: 'GROSS',
      inCartBadge: (p: number) => `IM WAGEN: ${p} P.`,
      chooseBtn: 'Auswählen →',
      reorderBtn: 'Nachbestellen →',
      topToBeginning: '↑ Zum Anfang',
      checkoutBtn: (p: number) => `Bestellen (${p} P.) →`,
      chooseModelPrompt: 'Modell für Bestellung wählen',
      bottomOrderTitle: 'IHRE GROSSHANDELSBESTELLUNG',
      bottomInvoiceText: (m: number, p: number) => `Rechnung: ${m} Mod. (${p} Paar)`,
      openInvoiceBtn: 'Rechnung öffnen →',
      footerSub: 'FINALE DER EXPOSITION // CARDIO B2B',
      footerNote: 'Direkter Großhandel ab Werk',
      catAll: 'Alle',
      catBoots: 'Stiefel',
      catSneakers: 'Sneaker',
      catShoes: 'Schuhe',
      featAll: 'Alle Modelle',
      featFur: 'Futter',
      featGore: 'Gore-Tex',
      featSole: 'Traktionssohle',
      colorsCountLabel: (c: number) => `${c} FARBEN`,
    },
  }[safeLang];

  const [activeCategory, setActiveCategory] = useState<'Все' | ShoeCategory>('Все');
  const [activeFeature, setActiveFeature] = useState<string>('Все');
  const [searchQuery, setSearchQuery] = useState('');
  const [gridMode, setGridMode] = useState<'2col' | 'large'>('2col');

  const [selectedShoe, setSelectedShoe] = useState<ShoeItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const bannerAnchorRef = useRef<HTMLDivElement>(null);
  const bannerGlareRef = useRef<HTMLDivElement>(null);
  const bannerShadowRef = useRef<HTMLDivElement>(null);
  const initialBannerTopRef = useRef<number | null>(null);

  const footerAnchorRef = useRef<HTMLDivElement>(null);
  const footerImgRef = useRef<HTMLImageElement>(null);
  const footerGlareRef = useRef<HTMLDivElement>(null);
  const footerShadowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      (window as unknown as { Telegram?: { WebApp?: { ready?: () => void } } }).Telegram?.WebApp?.ready?.();
    } catch {}

    const unlockAudio = () => { getAudioContext(); };
    window.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (selectedShoe || isCartOpen) return;
    const videoEl = heroVideoRef.current;
    if (!videoEl) return;

    videoEl.muted = true;
    videoEl.defaultMuted = true;
    videoEl.playsInline = true;

    if (videoEl.readyState >= 2) setIsVideoReady(true);

    const tryPlay = () => {
      if (!videoEl) return;
      videoEl.muted = true;
      videoEl.play().then(() => setIsVideoReady(true)).catch(() => setIsVideoReady(true));
    };

    tryPlay();
    const fallbackTimer = window.setTimeout(() => setIsVideoReady(true), 150);
    return () => window.clearTimeout(fallbackTimer);
  }, [selectedShoe, isCartOpen]);

  useEffect(() => {
    if (selectedShoe || isCartOpen) return;
    initialBannerTopRef.current = null;
    let rafId = 0;

    const applyDualParallax = () => {
      const viewportH = window.innerHeight || 800;
      const pageScrollY = window.scrollY ?? 0;

      const topAnchor = bannerAnchorRef.current;
      const topVideo = heroVideoRef.current;
      if (topAnchor && topVideo) {
        const rect = topAnchor.getBoundingClientRect();
        if (initialBannerTopRef.current === null) {
          initialBannerTopRef.current = rect.top + Math.max(0, pageScrollY);
        }
        const rawScrolled = pageScrollY > 0 ? pageScrollY : Math.max(0, (initialBannerTopRef.current || 0) - rect.top);
        const maxScroll = 320;
        const clamped = Math.max(0, Math.min(maxScroll, rawScrolled));
        const progress = clamped / maxScroll;

        const translateY = progress * 22;
        const scale = 1.08 - progress * 0.08;

        topVideo.style.transform = `translateY(${translateY.toFixed(1)}px) scale(${scale.toFixed(4)})`;

        if (bannerGlareRef.current) {
          const glareShift = -45 + progress * 110;
          bannerGlareRef.current.style.transform = `translateX(${glareShift.toFixed(1)}%) skewX(-22deg)`;
          bannerGlareRef.current.style.opacity = `${0.14 + progress * 0.38}`;
        }
        if (bannerShadowRef.current) {
          bannerShadowRef.current.style.opacity = `${progress * 0.42}`;
        }
      }

      const botAnchor = footerAnchorRef.current;
      const botImg = footerImgRef.current;
      if (botAnchor && botImg) {
        const fRect = botAnchor.getBoundingClientRect();
        const revealSpan = Math.max(240, fRect.height + 90);
        const visiblePx = viewportH - fRect.top;
        const fProgress = Math.max(0, Math.min(1, visiblePx / revealSpan));
        const inv = 1 - fProgress;

        const fTranslateY = -inv * 18;
        const fScale = 1 + inv * 0.1;

        botImg.style.transform = `translateY(${fTranslateY.toFixed(1)}px) scale(${fScale.toFixed(4)})`;

        if (footerGlareRef.current) {
          const fGlareShift = -55 + fProgress * 115;
          footerGlareRef.current.style.transform = `translateX(${fGlareShift.toFixed(1)}%) skewX(-22deg)`;
          footerGlareRef.current.style.opacity = `${0.1 + fProgress * 0.36}`;
        }
        if (footerShadowRef.current) {
          footerShadowRef.current.style.opacity = `${inv * 0.45}`;
        }
      }
    };

    const onScrollOrTouch = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(applyDualParallax);
    };

    applyDualParallax();
    window.addEventListener('scroll', onScrollOrTouch, { passive: true, capture: true });
    window.addEventListener('touchmove', onScrollOrTouch, { passive: true });
    window.addEventListener('resize', onScrollOrTouch, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrTouch, { capture: true });
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
    } catch {}
  }, [cart]);

  const [orderMode, setOrderMode] = useState<'sample' | 'wholesale'>('wholesale');
  const [sizeRun, setSizeRun] = useState<Record<SizeKey, number>>(STANDARD_8_RUN);
  const [sampleSize, setSampleSize] = useState<SizeKey>(42);
  const [boxesCount, setBoxesCount] = useState<number>(1);

  useEffect(() => {
    if (selectedShoe) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      setJustAdded(false);
    }
  }, [selectedShoe]);

  const pairsPerBox = useMemo(() => SIZES.reduce((sum, sz) => sum + (sizeRun[sz] || 0), 0), [sizeRun]);
  const isStandard8 = useMemo(() => SIZES.every((sz) => sizeRun[sz] === STANDARD_8_RUN[sz]), [sizeRun]);
  const isEven6 = useMemo(() => SIZES.every((sz) => sizeRun[sz] === EVEN_6_RUN[sz]), [sizeRun]);
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
        ? `${t.sampleRun} — р. ${sampleSize}`
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

  if (isCartOpen) {
    return (
      <WholesaleCart
        items={cart}
        lang={safeLang}
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
              return { ...item, boxesCount: newBoxes, totalPairs: newTotalPairs, formulaText: updatedFormula };
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

  if (selectedShoe) {
    const alreadyInCartPairs = pairsInCartByShoeId[selectedShoe.id] || 0;
    const translatedSelectedColor = getLocalizedColor(selectedShoe.color, safeLang);

    return (
      <div
        style={{
          backgroundColor: THEME.bg,
          minHeight: '100vh',
          padding: '14px 16px 110px 16px',
          color: THEME.ink,
          boxSizing: 'border-box',
          fontFamily: THEME.sans,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            paddingBottom: '12px',
            marginBottom: '20px',
            borderBottom: `1px solid ${THEME.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flexShrink: 1 }}>
            <img
              src="/logo.png"
              alt="Cardio"
              onClick={() => {
                fireHaptic('light');
                setSelectedShoe(null);
              }}
              style={{
                height: '36px',
                width: 'auto',
                objectFit: 'contain',
                mixBlendMode: 'multiply',
                display: 'block',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
            <button
              type="button"
              onClick={() => {
                fireHaptic('light');
                setSelectedShoe(null);
              }}
              style={{
                backgroundColor: THEME.surface,
                border: `1px solid ${THEME.ink}`,
                padding: '8px 10px',
                fontSize: '10px',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                color: THEME.ink,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                touchAction: 'manipulation',
              }}
            >
              <span>←</span>
              <span>{t.catalogBtn}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              fireHaptic('medium');
              setIsCartOpen(true);
            }}
            style={{
              backgroundColor: cart.length > 0 ? THEME.ink : 'transparent',
              border: `1px solid ${THEME.ink}`,
              padding: '8px 12px',
              fontSize: '10px',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              fontWeight: 600,
              cursor: 'pointer',
              color: cart.length > 0 ? '#FFFFFF' : THEME.ink,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              touchAction: 'manipulation',
            }}
          >
            {t.invoiceBtn(cartTotalPairs)}
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
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: THEME.ink,
            }}
          >
            <span>
              {t.alreadyInCart(alreadyInCartPairs)}
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
              {t.openWord}
            </span>
          </div>
        )}

        <div style={{ marginBottom: '22px' }}>
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
            <span>{t.cardTitle} // {getLocalizedCategory(selectedShoe.category, safeLang)}</span>
            <span style={{ fontFamily: THEME.serif, fontStyle: 'italic', textTransform: 'none', fontSize: '12px' }}>
              Арт. № {selectedShoe.modelNumber}
            </span>
          </div>

          <h1
            style={{
              fontFamily: THEME.serif,
              fontSize: '34px',
              margin: '0 0 4px 0',
              fontWeight: 400,
              letterSpacing: '-0.3px',
              lineHeight: 1.08,
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
            }}
          >
            {t.colorLabel} {translatedSelectedColor}
          </div>
        </div>

        <div
          style={{
            backgroundColor: THEME.surface,
            border: `1px solid ${THEME.border}`,
            marginBottom: '20px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '9px 14px',
              borderBottom: `1px solid ${THEME.border}`,
              backgroundColor: THEME.surface,
            }}
          >
            <span style={{ fontSize: '9px', letterSpacing: '1.5px', color: THEME.inkLight, textTransform: 'uppercase' }}>
              CARDIO ORIGINAL
            </span>
            <span style={{ fontSize: '9px', letterSpacing: '1.5px', color: THEME.inkLight, textTransform: 'uppercase' }}>
              40—45
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: '220px',
              padding: '14px 20px',
              boxSizing: 'border-box',
              backgroundColor: THEME.surface,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src={selectedShoe.image}
              alt={`Модель ${selectedShoe.modelNumber}`}
              style={{
                maxWidth: '100%',
                maxHeight: '192px',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                objectPosition: 'center center',
                display: 'block',
                margin: '0 auto',
                mixBlendMode: 'multiply',
              }}
            />
          </div>

          {selectedShoe.features.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                padding: '10px 14px',
                borderTop: `1px solid ${THEME.border}`,
                backgroundColor: THEME.surface,
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
                  {getLocalizedFeature(feat, safeLang)}
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
              <span>{t.availableColors}</span>
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
                const translatedVariantColor = getLocalizedColor(v.color, safeLang);
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
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '8px',
                        color: isCurrent ? THEME.ink : THEME.inkLight,
                        fontWeight: isCurrent ? 600 : 400,
                        textAlign: 'left',
                        marginBottom: '4px',
                      }}
                    >
                      0{i + 1} {isCurrent ? '✓' : ''}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '96px',
                        padding: '4px',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        backgroundColor: cellBg,
                      }}
                    >
                      <img
                        src={v.image}
                        alt={v.color}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '86px',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain',
                          display: 'block',
                          margin: '0 auto',
                          mixBlendMode: 'multiply',
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
                      {translatedVariantColor}
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
            <span>{t.orderParams}</span>
            <span>B2B</span>
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
              type="button"
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
              {t.wholesaleRun}
            </button>
            <button
              type="button"
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
              {t.sampleRun}
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
                  {safeLang === 'de' ? 'Kisteninhalt (40–45):' : safeLang === 'uk' ? 'Комплектація короба (40–45):' : 'Комплектация короба (40–45):'}
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
                    ? (safeLang === 'de' ? 'Standard (8 P.)' : safeLang === 'uk' ? 'Стандарт (8 пар)' : 'Стандарт (8 пар)')
                    : isEven6
                    ? (safeLang === 'de' ? 'Gleich (6 P.)' : safeLang === 'uk' ? 'Рівна (6 пар)' : 'Ровная (6 пар)')
                    : (safeLang === 'de' ? `Eigen (${pairsPerBox} P.)` : safeLang === 'uk' ? `Своя (${pairsPerBox} пар)` : `Своя (${pairsPerBox} пар)`)}
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
                  type="button"
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
                    <span>{t.standard8}</span>
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
                    {t.standard8Desc}
                  </div>
                </button>

                <button
                  type="button"
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
                    <span>{t.even6}</span>
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
                    {t.even6Desc}
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
                          cursor: 'pointer',
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
                          cursor: 'pointer',
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
                  {t.boxesCountLabel}
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
                {t.samplePrompt}
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
          <span>{justAdded ? t.addedSuccess : t.addToCart}</span>
          <span
            style={{
              fontFamily: THEME.serif,
              fontStyle: 'italic',
              fontSize: '15px',
              textTransform: 'none',
              letterSpacing: '0',
            }}
          >
            {totalPairs} {safeLang === 'de' ? 'Paar' : safeLang === 'uk' ? 'пар' : 'пар'} →
          </span>
        </button>
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    'Все': t.catAll,
    'Ботинки': t.catBoots,
    'Кроссовки': t.catSneakers,
    'Туфли': t.catShoes,
  };

  const featureLabels: Record<string, string> = {
    'Все': t.featAll,
    'Мех': t.featFur,
    'Gore-Tex': t.featGore,
    'Подошва трактор': t.featSole,
  };

  return (
    <div
      style={{
        backgroundColor: THEME.bg,
        minHeight: '100vh',
        padding: '14px 16px 120px 16px',
        color: THEME.ink,
        fontFamily: THEME.sans,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          paddingBottom: '12px',
          marginBottom: '14px',
          borderBottom: `1px solid ${THEME.border}`,
          position: 'relative',
          zIndex: 6,
          backgroundColor: THEME.bg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <img
            src="/logo.png"
            alt="Cardio Footwear Logo"
            style={{
              height: '46px',
              width: 'auto',
              objectFit: 'contain',
              mixBlendMode: 'multiply',
              display: 'block',
              flexShrink: 0,
            }}
          />
          <div style={{ width: '1px', height: '32px', backgroundColor: THEME.border, flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
            <span
              style={{
                fontFamily: THEME.serif,
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '2.2px',
                textTransform: 'uppercase',
                color: THEME.ink,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              CARDIO
            </span>
            <span
              style={{
                fontSize: '8.5px',
                letterSpacing: '1.3px',
                textTransform: 'uppercase',
                color: THEME.inkMuted,
                fontWeight: 500,
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
              }}
            >
              KHARKIV • 2026
            </span>
          </div>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={() => {
              fireHaptic('light');
              onBack();
            }}
            style={{
              backgroundColor: THEME.surface,
              border: `1px solid ${THEME.borderStrong}`,
              padding: '7px 10px',
              fontSize: '9px',
              letterSpacing: '0.9px',
              textTransform: 'uppercase',
              fontWeight: 600,
              cursor: 'pointer',
              color: THEME.ink,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              touchAction: 'manipulation',
            }}
          >
            {t.mainPageBtn}
          </button>
        )}
      </div>

      <div
        ref={bannerAnchorRef}
        style={{ width: '100%', marginBottom: '20px', position: 'relative', zIndex: 1 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
            padding: '0 2px',
            position: 'relative',
            zIndex: 3,
          }}
        >
          <span style={{ fontSize: '8px', letterSpacing: '1.6px', textTransform: 'uppercase', color: THEME.inkMuted, fontWeight: 600 }}>
            ● MOTION LOOKBOOK
          </span>
          <span style={{ fontSize: '8px', letterSpacing: '1.5px', textTransform: 'uppercase', color: THEME.inkMuted, fontWeight: 600 }}>
            CARDIO // 40—45
          </span>
        </div>

        <div
          style={{
            width: '100%',
            borderRadius: '4px',
            overflow: 'hidden',
            border: `1px solid ${THEME.border}`,
            position: 'relative',
            backgroundColor: '#121212',
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
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              objectFit: 'cover',
              display: 'block',
              backgroundColor: '#121212',
              opacity: isVideoReady ? 1 : 0,
              transition: 'opacity 0.22s ease-out',
              transformOrigin: 'center center',
            }}
          />
          <div
            ref={bannerGlareRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '65%',
              height: '100%',
              background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,244,214,0.36) 50%, rgba(255,255,255,0) 100%)',
              mixBlendMode: 'overlay',
              pointerEvents: 'none',
              opacity: 0.14,
              transform: 'translateX(-45%) skewX(-22deg)',
              zIndex: 2,
            }}
          />
          <div
            ref={bannerShadowRef}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(22,21,20,0.06) 0%, rgba(22,21,20,0.68) 100%)',
              pointerEvents: 'none',
              opacity: 0,
              zIndex: 2,
            }}
          />
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 5,
          backgroundColor: THEME.bg,
          paddingTop: '4px',
          paddingBottom: '22px',
          borderBottom: `1px solid ${THEME.border}`,
        }}
      >
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
            {t.searchLabel}
          </span>
          <input
            type="text"
            placeholder={t.searchPlaceholder}
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
              type="button"
              onClick={() => {
                fireHaptic('light');
                setSearchQuery('');
              }}
              style={{ background: 'none', border: 'none', color: THEME.inkMuted, cursor: 'pointer', fontSize: '12px', padding: '4px' }}
            >
              ✕
            </button>
          )}
        </div>

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
                type="button"
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
                {categoryLabels[category] || category}
              </button>
            );
          })}
        </div>

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
                type="button"
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
                }}
              >
                {featureLabels[feat] || feat}
              </button>
            );
          })}
        </div>

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
          <span>{t.found(filteredShoes.length)}</span>

          <div style={{ display: 'flex', border: `1px solid ${THEME.border}` }}>
            <button
              type="button"
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
                cursor: 'pointer',
              }}
            >
              {t.grid2Col}
            </button>
            <button
              type="button"
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
                cursor: 'pointer',
              }}
            >
              {t.gridLarge}
            </button>
          </div>
        </div>

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
            const translatedColor = getLocalizedColor(shoe.color, safeLang);
            const translatedCategory = getLocalizedCategory(shoe.category, safeLang);

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
                  padding: isLarge ? '14px' : '10px',
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
                    marginBottom: '6px',
                    minHeight: '16px',
                  }}
                >
                  <span style={{ fontSize: isLarge ? '10px' : '8px', color: THEME.inkLight, textTransform: 'uppercase' }}>
                    {translatedCategory}
                  </span>

                  {inCartPairs > 0 ? (
                    <span style={{ backgroundColor: THEME.ink, color: '#FFFFFF', padding: '2px 5px', fontSize: '8px', fontWeight: 600 }}>
                      {t.inCartBadge(inCartPairs)}
                    </span>
                  ) : (
                    <span style={{ fontSize: isLarge ? '10px' : '8px', color: THEME.inkLight }}>
                      {variantsCount > 1 ? t.colorsCountLabel(variantsCount) : '40—45'}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    width: '100%',
                    height: isLarge ? '200px' : '125px',
                    padding: '6px',
                    boxSizing: 'border-box',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    backgroundColor: cardBg,
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
                      maxWidth: '100%',
                      maxHeight: isLarge ? '184px' : '112px',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto',
                      mixBlendMode: 'multiply',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: THEME.serif, fontSize: isLarge ? '26px' : '19px', fontWeight: 400, color: THEME.ink }}>
                      № {shoe.modelNumber}
                    </span>
                    {shoe.variant && (
                      <span style={{ fontFamily: THEME.serif, fontStyle: 'italic', fontSize: isLarge ? '13px' : '11px', color: THEME.inkMuted }}>
                        {shoe.variant}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: isLarge ? '11px' : '10px', color: THEME.inkMuted, textTransform: 'uppercase', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {translatedColor}
                  </div>

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
                      {variantsCount > 1 ? t.colorsCountLabel(variantsCount) : '40—45'}
                    </span>
                    <span style={{ color: inCartPairs > 0 ? THEME.accentGreen : THEME.ink, fontWeight: 600 }}>
                      {inCartPairs > 0 ? t.reorderBtn : t.chooseBtn}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        ref={footerAnchorRef}
        style={{
          width: '100%',
          marginTop: '24px',
          position: 'relative',
          zIndex: 2,
          backgroundColor: THEME.bg,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '12px',
            fontSize: '9px',
            letterSpacing: '1.3px',
            textTransform: 'uppercase',
            color: THEME.inkMuted,
            marginBottom: '10px',
            position: 'relative',
            zIndex: 3,
          }}
        >
          <span>{t.footerSub}</span>
          <span
            style={{
              fontFamily: THEME.serif,
              fontStyle: 'italic',
              textTransform: 'none',
              fontSize: '12px',
              textAlign: 'right',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {t.footerNote}
          </span>
        </div>

        <div
          style={{
            width: '100%',
            borderRadius: '4px',
            overflow: 'hidden',
            border: `1px solid ${THEME.border}`,
            position: 'relative',
            backgroundColor: '#161514',
            zIndex: 1,
          }}
        >
          <img
            ref={footerImgRef}
            src={FOOTER_BANNER_SRC}
            alt="Cardio Campaign"
            loading="lazy"
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              objectFit: 'cover',
              display: 'block',
              transformOrigin: 'center center',
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
              background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,244,214,0.34) 50%, rgba(255,255,255,0) 100%)',
              mixBlendMode: 'overlay',
              pointerEvents: 'none',
              opacity: 0.12,
              transform: 'translateX(-55%) skewX(-22deg)',
              zIndex: 2,
            }}
          />
          <div
            ref={footerShadowRef}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(22,21,20,0.45) 0%, rgba(22,21,20,0.05) 100%)',
              pointerEvents: 'none',
              opacity: 0,
              zIndex: 2,
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
            gap: '12px',
            position: 'relative',
            zIndex: 3,
          }}
        >
          <button
            type="button"
            onClick={() => {
              fireHaptic('light');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{
              backgroundColor: THEME.surface,
              border: `1px solid ${THEME.border}`,
              padding: '9px 12px',
              fontSize: '9px',
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
              fontWeight: 600,
              color: THEME.ink,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {t.topToBeginning}
          </button>

          {cart.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                fireHaptic('medium');
                setIsCartOpen(true);
              }}
              style={{
                backgroundColor: THEME.ink,
                border: `1px solid ${THEME.ink}`,
                padding: '9px 14px',
                fontSize: '9px',
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {t.checkoutBtn(cartTotalPairs)}
            </button>
          ) : (
            <span
              style={{
                fontFamily: THEME.serif,
                fontStyle: 'italic',
                fontSize: '12px',
                color: THEME.inkMuted,
                textAlign: 'right',
              }}
            >
              {t.chooseModelPrompt}
            </span>
          )}
        </div>
      </div>

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
                {t.bottomOrderTitle}
              </div>
              <div style={{ fontFamily: THEME.serif, fontSize: '16px', marginTop: '1px' }}>
                {t.bottomInvoiceText(cart.length, cartTotalPairs)}
              </div>
            </div>
            <button
              type="button"
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
              {t.openInvoiceBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Materials;
