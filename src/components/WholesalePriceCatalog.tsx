/**
 * @file src/components/WholesalePriceCatalog.tsx
 * @description Главный компонент-оркестратор закрытого B2B прайс-каталога CARDIO 2026
 * и входного баннера для оптовых покупателей.
 *
 * ЧТО ИСПРАВЛЕНО В ЭТОЙ ВЕРСИИ:
 * 1. УСТРАНЕН НАЕЗД КНОПОК В ШАПКЕ: Верхняя панель адаптирована под узкие экраны смартфонов
 *    (320px–430px) — кнопки «← Выход», «📂 Заказы» и «⬇ PDF» имеют компактные отступы и не перекрывают друг друга.
 * 2. ПОСТОЯННЫЙ ДОСТУП К АРХИВУ «МОИ ЗАКАЗЫ»: Кнопка «📂 Заказы» в шапке доступна всегда,
 *    даже когда текущая накладная пуста после отправки заказа.
 * 3. АВТООЧИСТКА КОРЗИНЫ: Подписка на событие `cardio-cart-cleared` гарантирует, что после
 *    отправки заказа старые позиции мгновенно исчезают из прайс-каталога.
 * 4. НАДЁЖНОЕ СКАЧИВАНИЕ PDF ИЗ ПАМЯТИ (localBlob): Добавлена крупная кнопка
 *    «📥 Скачать PDF в Загрузки» со свежим жестом пользователя и индикацией сохранения.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  getLocalizedCategory,
  getLocalizedColor,
  getLocalizedFeature,
  type ShoeItem,
  type CartItem,
} from '../data/catalog';
import { WholesaleCart } from './WholesaleCart';
import type { Lang } from '../App';

import {
  VALID_WHOLESALE_PINS,
  PIN_STORAGE_KEY,
  CART_STORAGE_KEY,
  PDF_AUDIO_SRC,
  PRICE_LIST_2026,
  getWholesalePriceByModel,
  getWholesaleCatalogItems,
  buildOrderFormulaText,
  type SeasonKey,
  type PriceItemConfig,
  type FullCatalogPriceItem,
} from './wholesale/wholesaleData';

import {
  normalizeWholesaleLang,
  getWholesaleTheme,
  getBannerLabels,
  getWholesaleUiText,
  type WholesaleLang,
} from './wholesale/wholesaleThemeAndI18n';

import {
  getTelegramUserInfo,
  generateAndDeliverLookbookPdf,
  triggerPdfDownload,
  type PdfStage,
  type PdfDeliveryStatus,
} from './wholesale/pdfLookbookEngine';

import {
  BlinkingDots,
  WholesalePinUnlockScreen,
  ProductOrderScreen,
} from './wholesale/WholesaleSubViews';

export {
  VALID_WHOLESALE_PINS,
  PRICE_LIST_2026,
  getWholesalePriceByModel,
  type SeasonKey,
  type PriceItemConfig,
  type FullCatalogPriceItem,
};

type BannerProps = {
  lang?: Lang;
  isDark?: boolean;
  onSelectShoe?: (shoe: ShoeItem) => void;
  onHaptic?: () => void;
};

/**
 * Баннер входа в оптовый прайс-каталог (размещается на главной витрине приложения).
 */
export function WholesalePriceBanner({ lang = 'ru', isDark = false, onHaptic }: BannerProps) {
  const safeLang = normalizeWholesaleLang(lang);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PIN_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const syncPin = () => {
      try {
        setIsUnlocked(localStorage.getItem(PIN_STORAGE_KEY) === '1');
      } catch {}
    };
    window.addEventListener('cardio-pin-unlocked', syncPin);
    return () => window.removeEventListener('cardio-pin-unlocked', syncPin);
  }, []);

  const labels = getBannerLabels(safeLang, isUnlocked);

  const surface = isDark ? '#141416' : '#F5F3EE';
  const ink = isDark ? '#F5F3EE' : '#171717';
  const muted = '#85837E';
  const onInk = isDark ? '#171717' : '#F5F3EE';
  const border = isDark ? '#2C2C30' : '#D6D1C7';

  const modalNode =
    isModalOpen && typeof document !== 'undefined'
      ? createPortal(
          <WholesalePriceCatalogModal
            lang={safeLang}
            isDark={isDark}
            isUnlocked={isUnlocked}
            onUnlockSuccess={() => {
              setIsUnlocked(true);
              try {
                localStorage.setItem(PIN_STORAGE_KEY, '1');
                window.dispatchEvent(new Event('cardio-pin-unlocked'));
              } catch {}
            }}
            onClose={() => {
              setIsModalOpen(false);
              window.dispatchEvent(new Event('storage'));
            }}
            onHaptic={onHaptic}
          />,
          document.body
        )
      : null;

  return (
    <>
      <div
        onClick={() => {
          onHaptic?.();
          setIsModalOpen(true);
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          backgroundColor: surface,
          border: `1px solid ${border}`,
          borderLeft: `3px solid ${ink}`,
          padding: '14px 16px',
          marginBottom: '18px',
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        <div
          style={{
            fontSize: '9px',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: muted,
            fontWeight: 600,
            marginBottom: '4px',
          }}
        >
          {labels.sub}
        </div>

        <div
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: '22px',
            color: ink,
            lineHeight: 1.18,
            marginBottom: '6px',
          }}
        >
          {labels.title}
        </div>

        <div
          style={{
            fontSize: '11.5px',
            color: muted,
            lineHeight: 1.4,
            marginBottom: '12px',
          }}
        >
          {labels.desc}
        </div>

        <button
          type="button"
          style={{
            width: '100%',
            backgroundColor: ink,
            color: onInk,
            border: 'none',
            padding: '11px 14px',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          {labels.btn}
        </button>
      </div>

      {modalNode}
    </>
  );
}

type ModalProps = {
  lang: WholesaleLang;
  isDark: boolean;
  isUnlocked: boolean;
  onUnlockSuccess: () => void;
  onClose: () => void;
  onHaptic?: () => void;
};

/**
 * Полноэкранное модальное окно B2B прайс-каталога.
 */
function WholesalePriceCatalogModal({
  lang,
  isDark,
  isUnlocked,
  onUnlockSuccess,
  onClose,
  onHaptic,
}: ModalProps) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState<'all' | SeasonKey>('all');

  const [pdfStage, setPdfStage] = useState<PdfStage>('idle');
  const [pdfCurrentPage, setPdfCurrentPage] = useState(0);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [dotPhase, setDotPhase] = useState(0);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<PdfDeliveryStatus | null>(null);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const pdfAudioRef = useRef<HTMLAudioElement | null>(null);

  const [selectedShoeInPrice, setSelectedShoeInPrice] = useState<ShoeItem | null>(null);
  const [isCartOpenInPrice, setIsCartOpenInPrice] = useState(false);

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

  // Слушаем глобальное событие очистки корзины после отправки заказа
  useEffect(() => {
    const handleCleared = () => {
      setCart([]);
    };
    window.addEventListener('cardio-cart-cleared', handleCleared);
    return () => window.removeEventListener('cardio-cart-cleared', handleCleared);
  }, []);

  useEffect(() => {
    if (pdfStage === 'idle') return;
    const timer = window.setInterval(() => {
      setDotPhase((prev) => (prev + 1) % 3);
    }, 320);
    return () => window.clearInterval(timer);
  }, [pdfStage]);

  useEffect(() => {
    return () => {
      if (pdfAudioRef.current) {
        try {
          pdfAudioRef.current.pause();
          pdfAudioRef.current.currentTime = 0;
        } catch {}
      }
    };
  }, []);

  const startPdfSoundtrack = () => {
    try {
      if (!pdfAudioRef.current) {
        const audio = new Audio(PDF_AUDIO_SRC);
        audio.loop = true;
        audio.volume = 0.85;
        pdfAudioRef.current = audio;
      }
      pdfAudioRef.current.currentTime = 0;
      pdfAudioRef.current.play().catch(() => {});
    } catch {}
  };

  const stopPdfSoundtrack = () => {
    try {
      if (pdfAudioRef.current) {
        pdfAudioRef.current.pause();
        pdfAudioRef.current.currentTime = 0;
      }
    } catch {}
  };

  const tgUser = useMemo(() => getTelegramUserInfo(), []);
  const allCatalogItems = useMemo(() => getWholesaleCatalogItems(), []);

  const autumnItems = useMemo(
    () => allCatalogItems.filter((i) => i.season === 'autumn'),
    [allCatalogItems]
  );
  const winterItems = useMemo(
    () => allCatalogItems.filter((i) => i.season === 'winter'),
    [allCatalogItems]
  );

  const visibleItems = useMemo(() => {
    if (seasonFilter === 'all') return allCatalogItems;
    return allCatalogItems.filter((i) => i.season === seasonFilter);
  }, [allCatalogItems, seasonFilter]);

  const cartTotalPairs = useMemo(
    () => cart.reduce((s, i) => s + i.totalPairs, 0),
    [cart]
  );
  const cartTotalUsd = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const p = getWholesalePriceByModel(item.shoe.modelNumber) || 0;
        return sum + p * item.totalPairs;
      }, 0),
    [cart]
  );

  const pairsInCartByShoeId = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach((item) => {
      map[item.shoe.id] = (map[item.shoe.id] || 0) + item.totalPairs;
    });
    return map;
  }, [cart]);

  const THEME = useMemo(() => getWholesaleTheme(isDark), [isDark]);
  const t = useMemo(
    () =>
      getWholesaleUiText(lang, {
        all: allCatalogItems.length,
        autumn: autumnItems.length,
        winter: winterItems.length,
      }),
    [lang, allCatalogItems.length, autumnItems.length, winterItems.length]
  );

  // Компактная подпись кнопки заказов в шапке (чтобы никогда не наезжала на соседние кнопки)
  const headerOrdersLabel = useMemo(() => {
    if (cartTotalPairs > 0) {
      return lang === 'de'
        ? `📂 Wagen (${cartTotalPairs} P.)`
        : lang === 'uk'
        ? `📂 Накладна (${cartTotalPairs} п.)`
        : `📂 Накладная (${cartTotalPairs} п.)`;
    }
    return lang === 'de'
      ? '📂 Bestellungen'
      : lang === 'uk'
      ? '📂 Замовлення'
      : '📂 Мои заказы';
  }, [cartTotalPairs, lang]);

  // Текст главной кнопки прямого сохранения PDF из localBlob
  const primaryDownloadLabel = useMemo(() => {
    if (justDownloaded) {
      return lang === 'de'
        ? '✓ PDF in Downloads gespeichert'
        : lang === 'uk'
        ? '✓ Файл збережено у Завантаження'
        : '✓ Файл сохранён в Загрузки';
    }
    return lang === 'de'
      ? '📥 PDF in Downloads speichern'
      : lang === 'uk'
      ? '📥 Завантажити PDF у Завантаження'
      : '📥 Скачать PDF в Загрузки';
  }, [justDownloaded, lang]);

  const handleManualDownloadClick = (statusToDownload: PdfDeliveryStatus) => {
    onHaptic?.();
    setJustDownloaded(true);
    void triggerPdfDownload(statusToDownload);
    window.setTimeout(() => {
      setJustDownloaded(false);
    }, 3000);
  };

  const handleGenerateAndDeliverPdf = async () => {
    if (pdfStage !== 'idle') return;
    setDeliveryStatus(null);
    setDeliveryError(null);
    setJustDownloaded(false);

    startPdfSoundtrack();

    try {
      const { status, error } = await generateAndDeliverLookbookPdf({
        lang,
        seasonFilter,
        allCatalogItems,
        autumnItems,
        winterItems,
        tgUser,
        securityNote: t.securityNote,
        onStageChange: setPdfStage,
        onPageProgress: (cur, tot) => {
          setPdfCurrentPage(cur);
          setPdfTotalPages(tot);
        },
      });
      setDeliveryStatus(status);
      setDeliveryError(error);
    } finally {
      stopPdfSoundtrack();
      setPdfStage('idle');
    }
  };

  const handlePdfAction = () => {
    if (pdfStage !== 'idle') return;
    if (deliveryStatus) {
      handleManualDownloadClick(deliveryStatus);
      return;
    }
    onHaptic?.();
    void handleGenerateAndDeliverPdf();
  };

  const handlePinSubmit = () => {
    if (VALID_WHOLESALE_PINS.has(pinInput.trim())) {
      setPinError(false);
      onUnlockSuccess();
    } else {
      setPinError(true);
    }
  };

  // 1. ЭКРАН ОПТОВОЙ КОРЗИНЫ И АРХИВА «МОИ ЗАКАЗЫ»
  if (isCartOpenInPrice) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          backgroundColor: THEME.bg,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <WholesaleCart
          items={cart}
          lang={lang}
          isDark={isDark}
          theme={isDark ? 'dark' : 'light'}
          onUpdateQuantity={(uid, newBoxes) => {
            if (newBoxes < 1) return;
            onHaptic?.();
            setCart((prev) =>
              prev.map((item) => {
                if (item.uid !== uid) return item;
                const pairsPerRun = Object.values(item.sizeRun).reduce((a, b) => a + b, 0);
                const newTotalPairs = pairsPerRun * newBoxes;
                const unitPrice = getWholesalePriceByModel(item.shoe.modelNumber) || 0;
                const lineUsd = unitPrice * newTotalPairs;
                const updatedFormula = buildOrderFormulaText({
                  orderMode: item.orderMode,
                  sampleRunLabel: t.sampleRun,
                  sampleSize: item.sampleSize,
                  sizeRun: item.sizeRun,
                  boxesCount: newBoxes,
                  lineUsd,
                });
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
            onHaptic?.();
            setCart((prev) => prev.filter((item) => item.uid !== uid));
          }}
          onClear={() => {
            onHaptic?.();
            setCart([]);
          }}
          onClose={() => {
            onHaptic?.();
            setIsCartOpenInPrice(false);
          }}
        />
      </div>
    );
  }

  // 2. ЭКРАН ДЕТАЛЬНОЙ КАРТОЧКИ МОДЕЛИ И ВЫБОРА РОСТОВКИ
  if (selectedShoeInPrice) {
    const unitPriceUsd = getWholesalePriceByModel(selectedShoeInPrice.modelNumber) || 0;
    const alreadyInCartPairs = pairsInCartByShoeId[selectedShoeInPrice.id] || 0;
    const alreadyInCartUsd = alreadyInCartPairs * unitPriceUsd;

    return (
      <ProductOrderScreen
        shoe={selectedShoeInPrice}
        lang={lang}
        theme={THEME}
        t={t}
        cartTotalPairs={cartTotalPairs}
        cartTotalUsd={cartTotalUsd}
        alreadyInCartPairs={alreadyInCartPairs}
        alreadyInCartUsd={alreadyInCartUsd}
        onBack={() => setSelectedShoeInPrice(null)}
        onOpenCart={() => setIsCartOpenInPrice(true)}
        onSelectShoe={(newShoe) => setSelectedShoeInPrice(newShoe)}
        onHaptic={onHaptic}
        onAddToCart={(newItemData) => {
          const newItem: CartItem = {
            uid: `${newItemData.shoe.id}-${Date.now()}`,
            ...newItemData,
          };
          setCart((prev) => [...prev, newItem]);
        }}
      />
    );
  }

  // 3. ГЛАВНЫЙ ЭКРАН ПРАЙС-КАТАЛОГА
  const isBusy = pdfStage !== 'idle';
  const progressPercent =
    pdfStage === 'rendering_pages'
      ? Math.round((pdfCurrentPage / Math.max(1, pdfTotalPages)) * 85)
      : pdfStage === 'packaging_and_uploading'
      ? 95
      : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: THEME.bg,
        color: THEME.ink,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '0 14px 110px 14px',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
      }}
    >
      {/* Верхняя закрепленная панель навигации (адаптивная, без наезда кнопок) */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: THEME.bg,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 0',
          marginBottom: '16px',
          borderBottom: `1px solid ${THEME.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <img
            src="/logo.png"
            alt="Cardio"
            onClick={onClose}
            style={{
              height: '26px',
              width: 'auto',
              objectFit: 'contain',
              mixBlendMode: isDark ? 'screen' : 'multiply',
              filter: isDark ? 'invert(1) hue-rotate(180deg) brightness(1.1)' : 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: THEME.surface,
              border: `1px solid ${THEME.ink}`,
              color: THEME.ink,
              padding: '7px 9px',
              fontSize: '9.5px',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t.backToPublic}
          </button>
        </div>

        {isUnlocked && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '6px',
              flexWrap: 'nowrap',
              minWidth: 0,
            }}
          >
            {/* Кнопка входа в Накладную и Архив «Мои заказы» */}
            <button
              type="button"
              onClick={() => {
                onHaptic?.();
                setIsCartOpenInPrice(true);
              }}
              style={{
                backgroundColor: cart.length > 0 ? THEME.surfaceActive : THEME.surface,
                color: THEME.ink,
                border: `1px solid ${THEME.ink}`,
                padding: '7px 9px',
                fontSize: '9.5px',
                fontWeight: 600,
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {headerOrdersLabel}
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={handlePdfAction}
              style={{
                backgroundColor: deliveryStatus ? THEME.accentGreen : THEME.ink,
                color: deliveryStatus ? '#FFFFFF' : THEME.onInk,
                border: `1px solid ${deliveryStatus ? THEME.accentGreen : THEME.ink}`,
                padding: '7px 10px',
                fontSize: '9.5px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                cursor: isBusy ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              {pdfStage === 'rendering_pages' ? (
                <>
                  <span>
                    {pdfCurrentPage}/{pdfTotalPages}
                  </span>
                  <BlinkingDots phase={dotPhase} />
                </>
              ) : pdfStage === 'packaging_and_uploading' ? (
                <>
                  <span>PDF</span>
                  <BlinkingDots phase={dotPhase} />
                </>
              ) : deliveryStatus ? (
                '📥 PDF ✓'
              ) : (
                '⬇ PDF'
              )}
            </button>
          </div>
        )}
      </div>

      {!isUnlocked ? (
        <WholesalePinUnlockScreen
          theme={THEME}
          t={t}
          pinInput={pinInput}
          setPinInput={(val) => {
            setPinInput(val);
            setPinError(false);
          }}
          pinError={pinError}
          onPinSubmit={handlePinSubmit}
        />
      ) : (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '9px',
                letterSpacing: '1.3px',
                textTransform: 'uppercase',
                color: THEME.inkMuted,
                marginBottom: '6px',
              }}
            >
              <span>{t.lookbookTag}</span>
              <span>40—45</span>
            </div>

            <h1
              style={{
                fontFamily: THEME.serif,
                fontSize: '26px',
                fontWeight: 400,
                lineHeight: 1.15,
                margin: '0 0 12px 0',
                color: THEME.ink,
              }}
            >
              {t.mainTitle}
            </h1>

            {!deliveryStatus && (
              <button
                type="button"
                disabled={isBusy}
                onClick={handlePdfAction}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  backgroundColor: THEME.ink,
                  color: THEME.onInk,
                  border: 'none',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '1.1px',
                  textTransform: 'uppercase',
                  cursor: isBusy ? 'wait' : 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {pdfStage === 'rendering_pages' ? (
                  <>
                    <span>{t.stageRendering(pdfCurrentPage, pdfTotalPages)}</span>
                    <BlinkingDots phase={dotPhase} />
                  </>
                ) : pdfStage === 'packaging_and_uploading' ? (
                  <>
                    <span>{t.stagePackaging(pdfTotalPages)}</span>
                    <BlinkingDots phase={dotPhase} />
                  </>
                ) : (
                  t.downloadBtn(visibleItems.length)
                )}
              </button>
            )}

            {isBusy && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '12px 14px',
                  backgroundColor: THEME.surface,
                  border: `1px solid ${THEME.ink}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    color: THEME.ink,
                    marginBottom: '8px',
                  }}
                >
                  <span>
                    {pdfStage === 'rendering_pages'
                      ? t.stageRendering(pdfCurrentPage, pdfTotalPages)
                      : t.stagePackaging(pdfTotalPages)}
                    <BlinkingDots phase={dotPhase} />
                  </span>
                  <span>{progressPercent}%</span>
                </div>

                <div
                  style={{
                    width: '100%',
                    height: '5px',
                    backgroundColor: THEME.border,
                    overflow: 'hidden',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      backgroundColor: THEME.ink,
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>

                {pdfStage === 'packaging_and_uploading' && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: THEME.ink,
                      fontWeight: 500,
                      marginBottom: '4px',
                    }}
                  >
                    {t.stagePackagingSub}
                    <BlinkingDots phase={dotPhase} />
                  </div>
                )}

                <div
                  style={{
                    fontSize: '9.5px',
                    color: THEME.inkMuted,
                    fontStyle: 'italic',
                  }}
                >
                  {t.soundPlayingHint}
                </div>
              </div>
            )}

            {/* Блок готового PDF с явной кнопкой [ Скачать PDF в Загрузки ] */}
            {!isBusy && deliveryStatus && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: THEME.surface,
                  border: `1.5px solid ${THEME.ink}`,
                }}
              >
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.9px',
                    textTransform: 'uppercase',
                    color: THEME.accentGreen,
                    marginBottom: '6px',
                  }}
                >
                  {t.readyBannerTitle(deliveryStatus.totalPages)}
                </div>

                {deliveryStatus.sentToTelegram && (
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: THEME.ink,
                      marginBottom: '10px',
                    }}
                  >
                    {t.sentToTgBanner}
                  </div>
                )}

                {deliveryError && !deliveryStatus.sentToTelegram && (
                  <div
                    style={{
                      fontSize: '10.5px',
                      color: THEME.inkMuted,
                      marginBottom: '10px',
                    }}
                  >
                    {lang === 'de'
                      ? 'PDF ist im Gerätespeicher bereit zum Speichern.'
                      : lang === 'uk'
                      ? 'PDF-каталог сформовано в пам’яті смартфона і готовий до збереження.'
                      : 'PDF-каталог сформирован в памяти смартфона и готов к сохранению.'}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleManualDownloadClick(deliveryStatus)}
                  style={{
                    width: '100%',
                    padding: '15px 16px',
                    backgroundColor: justDownloaded ? THEME.accentGreen : THEME.ink,
                    color: justDownloaded ? '#FFFFFF' : THEME.onInk,
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '1.1px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  {primaryDownloadLabel}
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              borderTop: `1px solid ${THEME.border}`,
              borderBottom: `1px solid ${THEME.border}`,
              marginBottom: '16px',
            }}
          >
            {(['all', 'autumn', 'winter'] as const).map((tab, idx) => {
              const isActive = seasonFilter === tab;
              const label =
                tab === 'all' ? t.tabAll : tab === 'autumn' ? t.tabAutumn : t.tabWinter;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    if (seasonFilter !== tab) {
                      setSeasonFilter(tab);
                      setDeliveryStatus(null);
                      setJustDownloaded(false);
                    }
                  }}
                  style={{
                    background: isActive ? THEME.ink : 'transparent',
                    color: isActive ? THEME.onInk : THEME.ink,
                    border: 'none',
                    borderLeft: idx === 0 ? 'none' : `1px solid ${THEME.border}`,
                    padding: '10px 4px',
                    fontSize: '9.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              borderTop: `1px solid ${THEME.border}`,
              borderLeft: `1px solid ${THEME.border}`,
              marginBottom: '24px',
            }}
          >
            {visibleItems.map(({ shoe, priceUsd, season }) => {
              const translatedCat = getLocalizedCategory(shoe.category, lang);
              const translatedColor = getLocalizedColor(shoe.color, lang);
              const translatedFeatures = shoe.features.map((f) =>
                getLocalizedFeature(f, lang)
              );
              const inCartPairs = pairsInCartByShoeId[shoe.id] || 0;

              return (
                <div
                  key={shoe.id}
                  onClick={() => {
                    onHaptic?.();
                    setSelectedShoeInPrice(shoe);
                  }}
                  style={{
                    backgroundColor: inCartPairs > 0 ? THEME.cardInCart : THEME.surface,
                    borderRight: `1px solid ${THEME.border}`,
                    borderBottom: `1px solid ${THEME.border}`,
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                        minHeight: '16px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '8px',
                          letterSpacing: '0.6px',
                          textTransform: 'uppercase',
                          color: THEME.inkMuted,
                        }}
                      >
                        {translatedCat}
                      </span>
                      {inCartPairs > 0 ? (
                        <span
                          style={{
                            backgroundColor: THEME.ink,
                            color: THEME.onInk,
                            padding: '2px 5px',
                            fontSize: '8px',
                            fontWeight: 600,
                          }}
                        >
                          {t.inCartBadge(inCartPairs)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '8px', color: THEME.inkMuted }}>
                          {season === 'autumn' ? 'AUTUMN' : 'WINTER'}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '142px',
                        padding: '8px 10px',
                        boxSizing: 'border-box',
                        marginBottom: '8px',
                        backgroundColor: THEME.imageStage,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
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
                          mixBlendMode: 'multiply',
                        }}
                      />
                    </div>

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
                          fontSize: '19px',
                          color: THEME.ink,
                        }}
                      >
                        № {shoe.modelNumber}
                        {shoe.variant && (
                          <span
                            style={{
                              fontSize: '12px',
                              fontStyle: 'italic',
                              color: THEME.inkMuted,
                              marginLeft: '4px',
                            }}
                          >
                            {shoe.variant}
                          </span>
                        )}
                      </span>

                      <span
                        style={{
                          fontFamily: THEME.serif,
                          fontSize: '19px',
                          fontWeight: 700,
                          color: THEME.ink,
                        }}
                      >
                        ${priceUsd}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '10px',
                        color: THEME.inkMuted,
                        textTransform: 'uppercase',
                        marginTop: '2px',
                      }}
                    >
                      {translatedColor}
                    </div>

                    {translatedFeatures.length > 0 && (
                      <div
                        style={{
                          fontSize: '8.5px',
                          color: THEME.inkLight,
                          marginTop: '2px',
                        }}
                      >
                        {translatedFeatures.join(' • ')}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '6px',
                      borderTop: `1px solid ${THEME.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '9px',
                        color: THEME.inkMuted,
                        marginBottom: '4px',
                      }}
                    >
                      <span>
                        6 п.: <strong style={{ color: THEME.ink }}>${priceUsd * 6}</strong>
                      </span>
                      <span>
                        8 п.: <strong style={{ color: THEME.ink }}>${priceUsd * 8}</strong>
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '8.5px',
                        letterSpacing: '0.7px',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        color: inCartPairs > 0 ? THEME.accentGreen : THEME.ink,
                        textAlign: 'right',
                      }}
                    >
                      {inCartPairs > 0 ? t.reorderBtn : t.orderBtn}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              backgroundColor: THEME.surface,
              border: `1px solid ${THEME.border}`,
              padding: '16px 14px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '9px',
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
                color: THEME.inkMuted,
                marginBottom: '10px',
              }}
            >
              {t.footerSub}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxWidth: '300px',
                margin: '0 auto 10px auto',
              }}
            >
              <a
                href="tel:+380677193716"
                style={{
                  color: THEME.ink,
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '8px',
                  border: `1px solid ${THEME.border}`,
                  backgroundColor: THEME.bg,
                }}
              >
                +38 (067) 719-37-16 — {t.georgiyName}
              </a>
              <a
                href="tel:+380974541511"
                style={{
                  color: THEME.ink,
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '8px',
                  border: `1px solid ${THEME.border}`,
                  backgroundColor: THEME.bg,
                }}
              >
                +38 (097) 454-15-11 — {t.borisName}
              </a>
            </div>
            <div style={{ fontSize: '9px', color: THEME.inkMuted }}>{t.securityNote}</div>
          </div>
        </div>
      )}

      {isUnlocked && cart.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: THEME.ink,
            color: THEME.onInk,
            padding: '12px 16px',
            zIndex: 1000,
            borderTop: `1px solid ${THEME.border}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '8.5px',
                  letterSpacing: '1.3px',
                  textTransform: 'uppercase',
                  color: THEME.onInkMuted,
                }}
              >
                {t.bottomOrderTitle}
              </div>
              <div style={{ fontFamily: THEME.serif, fontSize: '16px', marginTop: '1px' }}>
                {t.bottomInvoiceText(cart.length, cartTotalPairs, cartTotalUsd)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onHaptic?.();
                setIsCartOpenInPrice(true);
              }}
              style={{
                backgroundColor: THEME.surface,
                color: THEME.ink,
                border: 'none',
                padding: '10px 16px',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '1.1px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
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

export default WholesalePriceBanner;
