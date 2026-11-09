/**
 * @file src/components/wholesale/WholesaleSubViews.tsx
 * @description Дочерние UI-компоненты B2B-каталога: мигающий индикатор статуса,
 * экран авторизации по PIN-коду и карточка детального заказа модели с конструктором ростовок.
 *
 * ЗАЧЕМ НУЖЕН ЭТОТ ФАЙЛ:
 * 1. Изолирует логику авторизации оптовых партнёров (проверка PIN, телефоны менеджеров).
 * 2. Содержит интерактивный конструктор размерного ряда (короб 6/8 пар или кастомный подбор)
 *    и переключатель расцветок выбранной обуви.
 * 3. Делает код главного каталога чистым и декларативным.
 */

import { useState } from 'react';
import {
  cardioCatalog,
  getLocalizedCategory,
  getLocalizedColor,
  type ShoeItem,
  type SizeKey,
} from '../../data/catalog';
import {
  SIZES,
  STANDARD_8_RUN,
  EVEN_6_RUN,
  getWholesalePriceByModel,
  buildOrderFormulaText,
} from './wholesaleData';
import { type WholesaleTheme, type WholesaleUiText } from './wholesaleThemeAndI18n';

/**
 * Компонент мигающих точек индикации активного процесса (верстка / упаковка PDF)
 */
export function BlinkingDots({ phase }: { phase: number }) {
  const dots = [0, 1, 2];
  return (
    <span
      style={{
        display: 'inline-flex',
        gap: '4px',
        marginLeft: '6px',
        verticalAlign: 'middle',
      }}
    >
      {dots.map((d) => {
        const active = phase % 3 === d;
        return (
          <span
            key={d}
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: 'currentColor',
              opacity: active ? 1 : 0.25,
              transition: 'opacity 0.2s ease',
              display: 'inline-block',
            }}
          />
        );
      })}
    </span>
  );
}

interface PinUnlockScreenProps {
  theme: WholesaleTheme;
  t: WholesaleUiText;
  pinInput: string;
  setPinInput: (val: string) => void;
  pinError: boolean;
  onPinSubmit: () => void;
}

/**
 * Экран ввода 4-значного PIN-кода для доступа к закрытому оптовому каталогу.
 */
export function WholesalePinUnlockScreen({
  theme,
  t,
  pinInput,
  setPinInput,
  pinError,
  onPinSubmit,
}: PinUnlockScreenProps) {
  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '24px auto',
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        padding: '28px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '9px',
          letterSpacing: '1.6px',
          color: theme.inkMuted,
          textTransform: 'uppercase',
          marginBottom: '6px',
        }}
      >
        {t.pinTag}
      </div>
      <h2
        style={{
          fontFamily: theme.serif,
          fontSize: '26px',
          fontWeight: 400,
          margin: '0 0 10px 0',
          color: theme.ink,
        }}
      >
        {t.pinTitle}
      </h2>
      <p
        style={{
          fontSize: '12px',
          color: theme.inkMuted,
          lineHeight: 1.5,
          margin: '0 0 18px 0',
        }}
      >
        {t.pinSub}
      </p>

      <input
        type="tel"
        inputMode="numeric"
        maxLength={6}
        placeholder="• • • •"
        value={pinInput}
        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onPinSubmit();
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '12px',
          fontSize: '22px',
          letterSpacing: '8px',
          textAlign: 'center',
          fontWeight: 600,
          backgroundColor: theme.bg,
          color: theme.ink,
          WebkitTextFillColor: theme.ink,
          border: `1.5px solid ${pinError ? '#B91C1C' : theme.ink}`,
          outline: 'none',
          marginBottom: '10px',
        }}
      />

      {pinError && (
        <div
          style={{
            fontSize: '11px',
            color: '#B91C1C',
            marginBottom: '10px',
            lineHeight: 1.35,
          }}
        >
          {t.pinErrorText}
        </div>
      )}

      <button
        type="button"
        onClick={onPinSubmit}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: theme.ink,
          color: theme.onInk,
          border: 'none',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '1.2px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          marginBottom: '22px',
        }}
      >
        {t.pinUnlockBtn}
      </button>

      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '14px' }}>
        <div style={{ fontSize: '10px', color: theme.inkMuted, marginBottom: '8px' }}>
          {t.askPinTitle}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <a
            href="tel:+380974541511"
            style={{
              display: 'block',
              padding: '9px 10px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.bg,
              color: theme.ink,
              textDecoration: 'none',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            {t.askBoris}
          </a>
          <a
            href="tel:+380677193716"
            style={{
              display: 'block',
              padding: '9px 10px',
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.bg,
              color: theme.ink,
              textDecoration: 'none',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            {t.askGeorgiy}
          </a>
        </div>
      </div>
    </div>
  );
}

interface ProductOrderScreenProps {
  shoe: ShoeItem;
  lang: 'ru' | 'uk' | 'de';
  theme: WholesaleTheme;
  t: WholesaleUiText;
  cartTotalPairs: number;
  cartTotalUsd: number;
  alreadyInCartPairs: number;
  alreadyInCartUsd: number;
  onBack: () => void;
  onOpenCart: () => void;
  onSelectShoe: (shoe: ShoeItem) => void;
  onHaptic?: () => void;
  onAddToCart: (item: {
    shoe: ShoeItem;
    orderMode: 'wholesale' | 'sample';
    sizeRun: Record<SizeKey, number>;
    boxesCount: number;
    sampleSize: SizeKey;
    totalPairs: number;
    formulaText: string;
  }) => void;
}

/**
 * Детальная карточка модели с выбором расцветок, режима заказа (ростовка/тест)
 * и интерактивным конфигуратором количества пар по размерам (40–45).
 */
export function ProductOrderScreen({
  shoe,
  lang,
  theme,
  t,
  cartTotalPairs,
  cartTotalUsd,
  alreadyInCartPairs,
  alreadyInCartUsd,
  onBack,
  onOpenCart,
  onSelectShoe,
  onHaptic,
  onAddToCart,
}: ProductOrderScreenProps) {
  const unitPriceUsd = getWholesalePriceByModel(shoe.modelNumber) || 0;
  const modelVariants = cardioCatalog.filter((i) => i.modelNumber === shoe.modelNumber);
  const translatedSelectedColor = getLocalizedColor(shoe.color, lang);

  const [orderMode, setOrderMode] = useState<'wholesale' | 'sample'>('wholesale');
  const [sizeRun, setSizeRun] = useState<Record<SizeKey, number>>(STANDARD_8_RUN);
  const [sampleSize, setSampleSize] = useState<SizeKey>(42);
  const [boxesCount, setBoxesCount] = useState<number>(1);
  const [justAdded, setJustAdded] = useState(false);

  const pairsPerBox = SIZES.reduce((sum, sz) => sum + (sizeRun[sz] || 0), 0);
  const isStandard8 = SIZES.every((sz) => sizeRun[sz] === STANDARD_8_RUN[sz]);
  const isEven6 = SIZES.every((sz) => sizeRun[sz] === EVEN_6_RUN[sz]);
  const isCustomRun = !isStandard8 && !isEven6;
  const currentTotalPairs = orderMode === 'sample' ? 1 : pairsPerBox * boxesCount;
  const totalLineUsd = unitPriceUsd * currentTotalPairs;

  const updateSizeCount = (size: SizeKey, delta: number) => {
    const currentVal = sizeRun[size] || 0;
    const nextVal = Math.max(0, Math.min(10, currentVal + delta));
    if (nextVal !== currentVal) {
      onHaptic?.();
      setSizeRun((prev) => ({ ...prev, [size]: nextVal }));
    }
  };

  const handleAdd = () => {
    if (currentTotalPairs === 0) return;
    onHaptic?.();

    const formulaText = buildOrderFormulaText({
      orderMode,
      sampleRunLabel: t.sampleRun,
      sampleSize,
      sizeRun,
      boxesCount,
      lineUsd: totalLineUsd,
    });

    onAddToCart({
      shoe,
      orderMode,
      sizeRun: { ...sizeRun },
      boxesCount,
      sampleSize,
      totalPairs: currentTotalPairs,
      formulaText,
    });

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: theme.bg,
        color: theme.ink,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '0 16px 110px 16px',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: theme.bg,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 0',
          marginBottom: '18px',
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <button
          type="button"
          onClick={() => {
            onHaptic?.();
            onBack();
          }}
          style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.ink}`,
            padding: '8px 12px',
            fontSize: '10px',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            color: theme.ink,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {t.backToPriceList}
        </button>

        <button
          type="button"
          onClick={() => {
            onHaptic?.();
            onOpenCart();
          }}
          style={{
            backgroundColor: cartTotalPairs > 0 ? theme.ink : 'transparent',
            border: `1px solid ${theme.ink}`,
            padding: '8px 12px',
            fontSize: '10px',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: 'pointer',
            color: cartTotalPairs > 0 ? theme.onInk : theme.ink,
            whiteSpace: 'nowrap',
          }}
        >
          {t.invoiceBtn(cartTotalPairs, cartTotalUsd)}
        </button>
      </div>

      {alreadyInCartPairs > 0 && (
        <div
          style={{
            backgroundColor: theme.surfaceActive,
            border: `1px solid ${theme.border}`,
            borderLeft: `3px solid ${theme.ink}`,
            padding: '10px 14px',
            fontSize: '11px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: theme.ink,
          }}
        >
          <span>{t.alreadyInCart(alreadyInCartPairs, alreadyInCartUsd)}</span>
          <span
            onClick={() => {
              onHaptic?.();
              onOpenCart();
            }}
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              borderBottom: `1px solid ${theme.ink}`,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {t.openWord}
          </span>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '9.5px',
              color: theme.inkMuted,
              textTransform: 'uppercase',
              letterSpacing: '1.3px',
              marginBottom: '4px',
            }}
          >
            {t.cardTitle} // {getLocalizedCategory(shoe.category, lang)}
          </div>
          <h1
            style={{
              fontFamily: theme.serif,
              fontSize: '32px',
              margin: '0 0 4px 0',
              fontWeight: 400,
              lineHeight: 1.1,
            }}
          >
            № {shoe.modelNumber}
            {shoe.variant && (
              <span
                style={{
                  fontSize: '18px',
                  color: theme.inkMuted,
                  fontStyle: 'italic',
                  marginLeft: '6px',
                }}
              >
                ({shoe.variant})
              </span>
            )}
          </h1>
          <div
            style={{
              fontFamily: theme.serif,
              fontStyle: 'italic',
              fontSize: '15px',
              color: theme.inkMuted,
            }}
          >
            {t.colorLabel}: {translatedSelectedColor}
          </div>
        </div>

        <div
          style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.ink}`,
            padding: '8px 12px',
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: '8.5px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: theme.inkMuted,
            }}
          >
            {t.wholesalePriceLabel}
          </div>
          <div
            style={{
              fontFamily: theme.serif,
              fontSize: '26px',
              fontWeight: 700,
              color: theme.ink,
              lineHeight: 1.1,
            }}
          >
            ${unitPriceUsd}
          </div>
          <div style={{ fontSize: '9px', color: theme.inkMuted }}>{t.perPairWord}</div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 14px',
            borderBottom: `1px solid ${theme.border}`,
            fontSize: '9.5px',
            letterSpacing: '1.2px',
            color: theme.inkMuted,
            textTransform: 'uppercase',
          }}
        >
          <span>
            {t.box6}: <strong style={{ color: theme.ink }}>${unitPriceUsd * 6}</strong>
          </span>
          <span>
            {t.box8}: <strong style={{ color: theme.ink }}>${unitPriceUsd * 8}</strong>
          </span>
        </div>

        <div
          style={{
            width: '100%',
            height: '240px',
            padding: '18px 24px',
            boxSizing: 'border-box',
            backgroundColor: theme.imageStage,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={shoe.image}
            alt={`Модель ${shoe.modelNumber}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              mixBlendMode: 'multiply',
            }}
          />
        </div>
      </div>

      {modelVariants.length > 1 && (
        <div style={{ marginBottom: '22px' }}>
          <div
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              color: theme.inkMuted,
              marginBottom: '8px',
            }}
          >
            {t.availableColors}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(modelVariants.length, 4)}, 1fr)`,
              borderTop: `1px solid ${theme.border}`,
              borderLeft: `1px solid ${theme.border}`,
            }}
          >
            {modelVariants.map((v, i) => {
              const isCurrent = v.id === shoe.id;
              return (
                <div
                  key={v.id}
                  onClick={() => {
                    if (!isCurrent) {
                      onHaptic?.();
                      onSelectShoe(v);
                      setJustAdded(false);
                    }
                  }}
                  style={{
                    borderRight: `1px solid ${theme.border}`,
                    borderBottom: `1px solid ${theme.border}`,
                    backgroundColor: isCurrent ? theme.surfaceActive : theme.surface,
                    padding: '8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '8px',
                      textAlign: 'left',
                      marginBottom: '4px',
                      fontWeight: isCurrent ? 700 : 400,
                    }}
                  >
                    0{i + 1} {isCurrent ? '✓' : ''}
                  </div>
                  <div
                    style={{
                      height: '76px',
                      padding: '6px',
                      backgroundColor: theme.imageStage,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={v.image}
                      alt={v.color}
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
                      fontSize: '10px',
                      marginTop: '6px',
                      fontWeight: isCurrent ? 600 : 400,
                    }}
                  >
                    {getLocalizedColor(v.color, lang)} {v.variant || ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '22px' }}>
        <div
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '1.2px',
            color: theme.inkMuted,
            marginBottom: '10px',
          }}
        >
          {t.orderParams}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            border: `1px solid ${theme.ink}`,
            marginBottom: '16px',
          }}
        >
          <button
            type="button"
            onClick={() => setOrderMode('wholesale')}
            style={{
              backgroundColor: orderMode === 'wholesale' ? theme.ink : 'transparent',
              color: orderMode === 'wholesale' ? theme.onInk : theme.ink,
              border: 'none',
              padding: '11px 8px',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.wholesaleRun}
          </button>
          <button
            type="button"
            onClick={() => setOrderMode('sample')}
            style={{
              backgroundColor: orderMode === 'sample' ? theme.ink : 'transparent',
              color: orderMode === 'sample' ? theme.onInk : theme.ink,
              border: 'none',
              borderLeft: `1px solid ${theme.ink}`,
              padding: '11px 8px',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
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
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <button
                type="button"
                onClick={() => setSizeRun({ ...STANDARD_8_RUN })}
                style={{
                  backgroundColor: isStandard8 ? theme.ink : theme.surface,
                  color: isStandard8 ? theme.onInk : theme.ink,
                  border: `1px solid ${isStandard8 ? theme.ink : theme.border}`,
                  padding: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    marginBottom: '3px',
                  }}
                >
                  {t.standard8} (${unitPriceUsd * 8})
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    opacity: 0.8,
                    fontFamily: theme.serif,
                    fontStyle: 'italic',
                  }}
                >
                  {t.standard8Desc}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSizeRun({ ...EVEN_6_RUN })}
                style={{
                  backgroundColor: isEven6 ? theme.ink : theme.surface,
                  color: isEven6 ? theme.onInk : theme.ink,
                  border: `1px solid ${isEven6 ? theme.ink : theme.border}`,
                  padding: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    marginBottom: '3px',
                  }}
                >
                  {t.even6} (${unitPriceUsd * 6})
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    opacity: 0.8,
                    fontFamily: theme.serif,
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
                borderTop: `1px solid ${theme.border}`,
                borderLeft: `1px solid ${theme.border}`,
                marginBottom: '16px',
              }}
            >
              {SIZES.map((sz) => {
                const count = sizeRun[sz] || 0;
                const isDoubled = count >= 2;
                return (
                  <div
                    key={sz}
                    style={{
                      backgroundColor: count > 0 ? theme.surface : theme.bg,
                      borderRight: `1px solid ${theme.border}`,
                      borderBottom: `1px solid ${theme.border}`,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        backgroundColor: isDoubled ? theme.ink : 'transparent',
                        color: isDoubled ? theme.onInk : theme.inkMuted,
                        fontWeight: isDoubled ? 600 : 400,
                        padding: '6px 0',
                        borderBottom: `1px solid ${theme.border}`,
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
                        color: theme.ink,
                        cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                    <div
                      style={{
                        fontFamily: theme.serif,
                        fontSize: '18px',
                        fontWeight: 600,
                        padding: '2px 0',
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
                        color: theme.ink,
                        cursor: 'pointer',
                      }}
                    >
                      −
                    </button>
                  </div>
                );
              })}
            </div>

            {isCustomRun && (
              <div
                style={{
                  fontSize: '11px',
                  color: theme.inkMuted,
                  marginBottom: '10px',
                  textAlign: 'right',
                }}
              >
                В одном коробе: {pairsPerBox} п. (${pairsPerBox * unitPriceUsd})
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: `1px solid ${theme.border}`,
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '1.1px',
                  color: theme.inkMuted,
                }}
              >
                {t.boxesCountLabel}
              </span>
              <div style={{ display: 'flex', border: `1px solid ${theme.border}` }}>
                {[1, 2, 3, 5, 10].map((num, idx) => (
                  <button
                    type="button"
                    key={num}
                    onClick={() => setBoxesCount(num)}
                    style={{
                      padding: '7px 12px',
                      border: 'none',
                      borderLeft: idx === 0 ? 'none' : `1px solid ${theme.border}`,
                      backgroundColor: boxesCount === num ? theme.ink : theme.surface,
                      color: boxesCount === num ? theme.onInk : theme.ink,
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
                fontFamily: theme.serif,
                fontStyle: 'italic',
                color: theme.inkMuted,
                marginBottom: '10px',
              }}
            >
              {t.samplePrompt}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                borderTop: `1px solid ${theme.border}`,
                borderLeft: `1px solid ${theme.border}`,
              }}
            >
              {SIZES.map((sz) => (
                <button
                  type="button"
                  key={sz}
                  onClick={() => setSampleSize(sz)}
                  style={{
                    padding: '14px 0',
                    border: 'none',
                    borderRight: `1px solid ${theme.border}`,
                    borderBottom: `1px solid ${theme.border}`,
                    backgroundColor: sampleSize === sz ? theme.ink : theme.surface,
                    color: sampleSize === sz ? theme.onInk : theme.ink,
                    fontSize: '13px',
                    fontFamily: theme.serif,
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
        disabled={currentTotalPairs === 0}
        onClick={handleAdd}
        style={{
          width: '100%',
          padding: '16px 18px',
          backgroundColor: justAdded ? theme.accentGreen : theme.ink,
          color: justAdded ? '#FFFFFF' : theme.onInk,
          border: 'none',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '1.3px',
          cursor: currentTotalPairs === 0 ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{justAdded ? t.addedSuccess : t.addToCart}</span>
        <span
          style={{
            fontFamily: theme.serif,
            fontStyle: 'italic',
            fontSize: '16px',
            textTransform: 'none',
          }}
        >
          {currentTotalPairs} п. • ${totalLineUsd} →
        </span>
      </button>
    </div>
  );
}

