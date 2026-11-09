import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  cardioCatalog,
  getLocalizedCategory,
  getLocalizedColor,
  getLocalizedFeature,
  type ShoeItem,
  type CartItem,
  type SizeKey,
} from '../data/catalog';
import { WholesaleCart } from './WholesaleCart';
import type { Lang } from '../App';

/**
 * ДЕЙСТВУЮЩИЕ PIN-КОДЫ ДОСТУПА ДЛЯ ОПТОВИКОВ:
 * - '2026' — Общий код сезона CARDIO 2026
 * - '7777' — Мастер-код разработчика
 * - '1511' — Код Бориса (последние 4 цифры его номера +38097-454-15-11)
 * - '3716' — Код Георгия (последние 4 цифры его номера +38067-719-37-16)
 */
export const VALID_WHOLESALE_PINS = new Set(['2026', '7777', '1511', '3716']);
const PIN_STORAGE_KEY = 'cardio_b2b_price_pin_ok_v1';
const CART_STORAGE_KEY = 'cardio_b2b_cart_v1';

const SIZES: readonly SizeKey[] = [40, 41, 42, 43, 44, 45] as const;
const STANDARD_8_RUN: Record<SizeKey, number> = { 40: 1, 41: 1, 42: 2, 43: 2, 44: 1, 45: 1 };
const EVEN_6_RUN: Record<SizeKey, number> = { 40: 1, 41: 1, 42: 1, 43: 1, 44: 1, 45: 1 };

export type SeasonKey = 'autumn' | 'winter';

export interface PriceItemConfig {
  modelNumber: string;
  season: SeasonKey;
  priceUsd: number;
}

export const PRICE_LIST_2026: PriceItemConfig[] = [
  // === AUTUMN 2026 ===
  { modelNumber: '20', season: 'autumn', priceUsd: 34 },
  { modelNumber: '22', season: 'autumn', priceUsd: 36 },
  { modelNumber: '23', season: 'autumn', priceUsd: 36 },
  { modelNumber: '26', season: 'autumn', priceUsd: 39 },
  { modelNumber: '28', season: 'autumn', priceUsd: 37 },
  { modelNumber: '35', season: 'autumn', priceUsd: 36 },
  { modelNumber: '36', season: 'autumn', priceUsd: 38 },
  { modelNumber: '37', season: 'autumn', priceUsd: 36 },
  { modelNumber: '43', season: 'autumn', priceUsd: 39 },
  { modelNumber: '44', season: 'autumn', priceUsd: 39 },
  { modelNumber: '70', season: 'autumn', priceUsd: 38 },

  // === WINTER 2026 ===
  { modelNumber: '165', season: 'winter', priceUsd: 48 },
  { modelNumber: '172', season: 'winter', priceUsd: 49 },
  { modelNumber: '173', season: 'winter', priceUsd: 48 },
  { modelNumber: '174', season: 'winter', priceUsd: 48 },
  { modelNumber: '188', season: 'winter', priceUsd: 45 },
  { modelNumber: '201', season: 'winter', priceUsd: 45 },
  { modelNumber: '206', season: 'winter', priceUsd: 45 },
  { modelNumber: '208', season: 'winter', priceUsd: 45 },
  { modelNumber: '210', season: 'winter', priceUsd: 45 },
  { modelNumber: '214', season: 'winter', priceUsd: 46 },
  { modelNumber: '218', season: 'winter', priceUsd: 41 },
  { modelNumber: '220', season: 'winter', priceUsd: 48 },
  { modelNumber: '223', season: 'winter', priceUsd: 44 },
  { modelNumber: '224', season: 'winter', priceUsd: 47 },
  { modelNumber: '225', season: 'winter', priceUsd: 44 },
  { modelNumber: '226', season: 'winter', priceUsd: 45 },
  { modelNumber: '227', season: 'winter', priceUsd: 45 },
  { modelNumber: '228', season: 'winter', priceUsd: 46 },
  { modelNumber: '229', season: 'winter', priceUsd: 46 },
];

const PRICE_MAP = new Map<string, PriceItemConfig>(
  PRICE_LIST_2026.map((item) => [item.modelNumber.trim(), item])
);

export function getWholesalePriceByModel(modelNumber: string): number | null {
  return PRICE_MAP.get(modelNumber.trim())?.priceUsd ?? null;
}

type TgWebAppExtended = {
  initDataUnsafe?: {
    user?: {
      id?: number;
      first_name?: string;
      username?: string;
    };
  };
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  downloadFile?: (params: { url: string; file_name: string }, callback?: (accepted: boolean) => void) => void;
};

function getTgWebApp(): TgWebAppExtended | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Telegram?: { WebApp?: TgWebAppExtended } }).Telegram?.WebApp;
}

function getTelegramUserInfo(): { id?: number; label: string; watermarkLine: string } {
  try {
    const u = getTgWebApp()?.initDataUnsafe?.user;
    if (u?.id) {
      const namePart = u.username ? `@${u.username}` : u.first_name || '';
      return {
        id: u.id,
        label: `PARTNER ID: ${u.id}${namePart ? ` (${namePart})` : ''}`,
        watermarkLine: `CARDIO B2B 2026   •   ID: ${u.id} ${namePart}   •   CONFIDENTIAL   •   DO NOT FORWARD`,
      };
    }
  } catch {}
  return {
    label: 'CONFIDENTIAL B2B EDITION',
    watermarkLine: 'CARDIO B2B 2026   •   CONFIDENTIAL WHOLESALE PRICE   •   DO NOT COPY OR FORWARD',
  };
}

function buildPdfBase64FromJpegPages(
  jpegDataUrls: string[],
  imgW: number,
  imgH: number,
  pageWidthPt = 595.28,
  pageHeightPt = 841.89
): string {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let currentOffset = 0;

  const pushStr = (str: string) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    currentOffset += bytes.length;
  };

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    currentOffset += bytes.length;
  };

  const startObj = (id: number) => {
    offsets[id] = currentOffset;
    pushStr(`${id} 0 obj\n`);
  };

  const endObj = () => {
    pushStr('\nendobj\n');
  };

  const pageCount = jpegDataUrls.length;
  const pageIds: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    pageIds.push(3 + i * 3);
  }

  pushStr('%PDF-1.4\n');

  startObj(1);
  pushStr('<< /Type /Catalog /Pages 2 0 R >>');
  endObj();

  startObj(2);
  pushStr(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`);
  endObj();

  for (let i = 0; i < pageCount; i++) {
    const pageObjId = 3 + i * 3;
    const contentObjId = pageObjId + 1;
    const imgObjId = pageObjId + 2;

    const base64 = jpegDataUrls[i].split(',')[1] || '';
    const binaryStr = atob(base64);
    const imgBytes = new Uint8Array(binaryStr.length);
    for (let k = 0; k < binaryStr.length; k++) {
      imgBytes[k] = binaryStr.charCodeAt(k);
    }

    const contentStream = `q\n${pageWidthPt.toFixed(2)} 0 0 ${pageHeightPt.toFixed(2)} 0 0 cm\n/Im${i} Do\nQ`;

    startObj(pageObjId);
    pushStr(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(2)}] ` +
        `/Resources << /XObject << /Im${i} ${imgObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>`
    );
    endObj();

    startObj(contentObjId);
    pushStr(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`);
    endObj();

    startObj(imgObjId);
    pushStr(
      `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`
    );
    pushBytes(imgBytes);
    pushStr('\nendstream');
    endObj();
  }

  const totalObjects = 3 + pageCount * 3;
  const xrefOffset = currentOffset;
  pushStr(`xref\n0 ${totalObjects}\n0000000000 65535 f \n`);
  for (let id = 1; id < totalObjects; id++) {
    const off = String(offsets[id] || 0).padStart(10, '0');
    pushStr(`${off} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const merged = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    merged.set(c, pos);
    pos += c.length;
  }

  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < merged.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(merged.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export interface FullCatalogPriceItem {
  shoe: ShoeItem;
  priceUsd: number;
  season: SeasonKey;
}

type BannerProps = {
  lang?: Lang;
  isDark?: boolean;
  onSelectShoe?: (shoe: ShoeItem) => void;
  onHaptic?: () => void;
};

/**
 * Журнальный баннер для Materials.tsx — без обрезки текста и без троеточий
 */
export function WholesalePriceBanner({ lang = 'ru', isDark = false, onHaptic }: BannerProps) {
  const safeLang: 'ru' | 'uk' | 'de' = lang && ['ru', 'uk', 'de'].includes(lang) ? lang : 'ru';
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

  const labels = {
    ru: {
      sub: isUnlocked ? 'B2B SHOWROOM // 38 МОДЕЛЕЙ С ЦЕНАМИ' : 'B2B SHOWROOM // ДОСТУП ПО PIN-КОДУ',
      title: 'Оптовый прайс-каталог 2026',
      desc: 'Закрытый лукбук фабрики с оптовыми ценами, расчетом коробов и выгрузкой в PDF',
      btn: isUnlocked ? 'Открыть прайс-каталог →' : 'Ввести PIN и открыть прайс →',
    },
    uk: {
      sub: isUnlocked ? 'B2B SHOWROOM // 38 МОДЕЛЕЙ З ЦІНАМИ' : 'B2B SHOWROOM // ДОСТУП ЗА PIN-КОДОМ',
      title: 'Гуртовий прайс-каталог 2026',
      desc: 'Закритий лукбук фабрики з гуртовими цінами, розрахунком коробів та вивантаженням у PDF',
      btn: isUnlocked ? 'Відкрити прайс-каталог →' : 'Ввести PIN та відкрити прайс →',
    },
    de: {
      sub: isUnlocked ? 'B2B SHOWROOM // 38 MODELLE MIT PREISEN' : 'B2B SHOWROOM // ZUGANG MIT PIN-CODE',
      title: 'Großhandel Preiskatalog 2026',
      desc: 'Exklusives Lookbook ab Werk mit Großhandelspreisen, Kistenkalkulation und PDF-Export',
      btn: isUnlocked ? 'Preiskatalog öffnen →' : 'PIN eingeben & Katalog öffnen →',
    },
  }[safeLang];

  const surface = isDark ? '#141416' : '#F8F6F1';
  const ink = isDark ? '#F4EFE6' : '#161514';
  const muted = isDark ? '#A1A1AA' : '#6E6A63';
  const onInk = isDark ? '#121214' : '#FFFFFF';
  const border = isDark ? '#2C2C30' : '#DCD7CC';

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
              // Обновляем страницу каталога, если корзина менялась внутри прайса
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
  lang: 'ru' | 'uk' | 'de';
  isDark: boolean;
  isUnlocked: boolean;
  onUnlockSuccess: () => void;
  onClose: () => void;
  onHaptic?: () => void;
};

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
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<{
    sentToTelegram: boolean;
    downloadUrl: string;
    fileName: string;
  } | null>(null);

  // Внутренняя навигация внутри закрытого прайс-каталога (чтобы не выбрасывало на главную!)
  const [selectedShoeInPrice, setSelectedShoeInPrice] = useState<ShoeItem | null>(null);
  const [isCartOpenInPrice, setIsCartOpenInPrice] = useState(false);
  const [orderMode, setOrderMode] = useState<'wholesale' | 'sample'>('wholesale');
  const [sizeRun, setSizeRun] = useState<Record<SizeKey, number>>(STANDARD_8_RUN);
  const [sampleSize, setSampleSize] = useState<SizeKey>(42);
  const [boxesCount, setBoxesCount] = useState<number>(1);
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
    } catch {}
  }, [cart]);

  const tgUser = useMemo(() => getTelegramUserInfo(), []);

  // Все 38 моделей из cardioCatalog с привязкой к ценам
  const allCatalogItems: FullCatalogPriceItem[] = useMemo(() => {
    const result: FullCatalogPriceItem[] = [];
    for (const shoe of cardioCatalog) {
      const priceCfg = PRICE_MAP.get(shoe.modelNumber.trim());
      if (priceCfg) {
        result.push({
          shoe,
          priceUsd: priceCfg.priceUsd,
          season: priceCfg.season,
        });
      }
    }
    return result.sort((a, b) => {
      if (a.season !== b.season) return a.season === 'autumn' ? -1 : 1;
      return Number(a.shoe.modelNumber) - Number(b.shoe.modelNumber);
    });
  }, []);

  const autumnCount = useMemo(
    () => allCatalogItems.filter((i) => i.season === 'autumn').length,
    [allCatalogItems]
  );
  const winterCount = useMemo(
    () => allCatalogItems.filter((i) => i.season === 'winter').length,
    [allCatalogItems]
  );

  const visibleItems = useMemo(() => {
    if (seasonFilter === 'all') return allCatalogItems;
    return allCatalogItems.filter((i) => i.season === seasonFilter);
  }, [allCatalogItems, seasonFilter]);

  const cartTotalPairs = useMemo(() => cart.reduce((s, i) => s + i.totalPairs, 0), [cart]);
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

  const pairsPerBox = useMemo(() => SIZES.reduce((sum, sz) => sum + (sizeRun[sz] || 0), 0), [sizeRun]);
  const isStandard8 = useMemo(() => SIZES.every((sz) => sizeRun[sz] === STANDARD_8_RUN[sz]), [sizeRun]);
  const isEven6 = useMemo(() => SIZES.every((sz) => sizeRun[sz] === EVEN_6_RUN[sz]), [sizeRun]);
  const isCustomRun = !isStandard8 && !isEven6;
  const currentTotalPairs = orderMode === 'sample' ? 1 : pairsPerBox * boxesCount;

  const THEME = isDark
    ? {
        bg: '#0A0A0A',
        surface: '#141416',
        surfaceActive: '#222226',
        cardInCart: '#1A221C',
        imageStage: '#E6E1D8',
        ink: '#F4EFE6',
        inkMuted: '#A1A1AA',
        inkLight: '#71717A',
        onInk: '#121214',
        onInkMuted: '#4A4742',
        border: '#2C2C30',
        accentGreen: '#2E7D32',
        serif: '"Playfair Display", Georgia, serif',
      }
    : {
        bg: '#F2EFE9',
        surface: '#F8F6F1',
        surfaceActive: '#EAE5DC',
        cardInCart: '#EFECE4',
        imageStage: '#F8F6F1',
        ink: '#161514',
        inkMuted: '#6E6A63',
        inkLight: '#9A958C',
        onInk: '#FFFFFF',
        onInkMuted: '#D6D1C7',
        border: '#DCD7CC',
        accentGreen: '#1E4620',
        serif: '"Playfair Display", Georgia, serif',
      };

  const t = {
    ru: {
      backToPublic: '← Выход',
      backToPriceList: '← Прайс-каталог',
      invoiceBtn: (p: number, usd: number) => `Накладная (${p} п. • $${usd})`,
      pinTag: 'CARDIO B2B // ЗАКРЫТЫЙ РАЗДЕЛ',
      pinTitle: 'Оптовый прайс-каталог 2026',
      pinSub: 'Оптовые цены предназначены исключительно для партнеров фабрики и владельцев магазинов. Введите 4-значный PIN-код:',
      pinUnlockBtn: 'Открыть прайс-каталог →',
      pinErrorText: 'Неверный PIN-код. Запросите код у руководителя отдела продаж ниже.',
      askPinTitle: 'Получить PIN-код у руководителя отдела продаж:',
      askBoris: 'Борис • +38 (097) 454-15-11',
      askGeorgiy: 'Георгий • +38 (067) 719-37-16',
      lookbookTag: 'CARDIO FOOTWEAR // WHOLESALE LOOKBOOK 2026',
      mainTitle: 'Оптовый прайс-каталог 2026',
      downloadBtn: (count: number) => `⬇ Скачать прайс-каталог PDF (${count} моделей)`,
      downloadBtnTop: '⬇ PDF',
      generatingPdf: 'Верстка PDF',
      sentToTgBanner: '✓ Защищенный PDF-каталог с водяным знаком отправлен вам в чат Telegram от @Cordwainer_bot!',
      downloadDirectBtn: '📥 Скачать файл PDF в память телефона →',
      tabAll: `Все модели (${allCatalogItems.length})`,
      tabAutumn: `Осень 2026 (${autumnCount})`,
      tabWinter: `Зима 2026 (${winterCount})`,
      box6: 'Короб 6 пар',
      box8: 'Короб 8 пар',
      orderBtn: 'Выбрать ростовку →',
      reorderBtn: 'Дозаказать →',
      inCartBadge: (p: number) => `В ЗАКАЗЕ: ${p} П.`,
      footerSub: 'ОТДЕЛ ОПТОВЫХ ПРОДАЖ // CARDIO ХАРЬКОВ',
      georgiyName: 'Георгий',
      borisName: 'Борис',
      securityNote: 'Конфиденциальный B2B-документ. Защищен персональным водяным знаком и запретом пересылки.',
      // Для карточки заказа внутри прайса:
      cardTitle: 'КАРТОЧКА МОДЕЛИ (B2B ПРАЙС)',
      colorLabel: 'Цвет:',
      wholesalePriceLabel: 'Оптовая цена:',
      perPairWord: 'за пару',
      availableColors: 'ВСЕ РАСЦВЕТКИ ЭТОЙ МОДЕЛИ',
      orderParams: 'КОМПЛЕКТАЦИЯ ЗАКАЗА В НАКЛАДНУЮ',
      wholesaleRun: 'Оптовая ростовка',
      sampleRun: 'Тестовый образец (1 п.)',
      standard8: '8 пар • Стандарт',
      standard8Desc: '42 и 43 р. — по 2 пары',
      even6: '6 пар • Ровная',
      even6Desc: '40–45 р. — все по 1 паре',
      boxesCountLabel: 'Количество коробов:',
      samplePrompt: 'Выберите размер тестового образца:',
      addToCart: 'Добавить в накладную',
      addedSuccess: '✓ Добавлено в накладную',
      alreadyInCart: (p: number, usd: number) => `Уже в накладной: ${p} пар ($${usd})`,
      openWord: 'Открыть →',
      bottomOrderTitle: 'ВАШ ОПТОВЫЙ ЗАКАЗ (ПО ПРАЙСУ)',
      bottomInvoiceText: (m: number, p: number, usd: number) => `${m} мод. • ${p} пар • $${usd}`,
      openInvoiceBtn: 'Оформить →',
    },
    uk: {
      backToPublic: '← Вихід',
      backToPriceList: '← Прайс-каталог',
      invoiceBtn: (p: number, usd: number) => `Накладна (${p} п. • $${usd})`,
      pinTag: 'CARDIO B2B // ЗАКРИТИЙ РОЗДІЛ',
      pinTitle: 'Гуртовий прайс-каталог 2026',
      pinSub: 'Гуртові ціни призначені виключно для партнерів фабрики та власників магазинів. Введіть 4-значний PIN-код:',
      pinUnlockBtn: 'Відкрити прайс-каталог →',
      pinErrorText: 'Невірний PIN-код. Запитайте код у керівника відділу продажу нижче.',
      askPinTitle: 'Отримати PIN-код у керівника відділу продажу:',
      askBoris: 'Борис • +38 (097) 454-15-11',
      askGeorgiy: 'Георгій • +38 (067) 719-37-16',
      lookbookTag: 'CARDIO FOOTWEAR // WHOLESALE LOOKBOOK 2026',
      mainTitle: 'Гуртовий прайс-каталог 2026',
      downloadBtn: (count: number) => `⬇ Завантажити прайс-каталог PDF (${count} моделей)`,
      downloadBtnTop: '⬇ PDF',
      generatingPdf: 'Верстка PDF',
      sentToTgBanner: '✓ Захищений PDF-каталог з водяним знаком надіслано вам у чат Telegram від @Cordwainer_bot!',
      downloadDirectBtn: '📥 Завантажити файл PDF у пам’ять телефону →',
      tabAll: `Всі моделі (${allCatalogItems.length})`,
      tabAutumn: `Осінь 2026 (${autumnCount})`,
      tabWinter: `Зима 2026 (${winterCount})`,
      box6: 'Короб 6 пар',
      box8: 'Короб 8 пар',
      orderBtn: 'Вибрати ростовку →',
      reorderBtn: 'Дозамовити →',
      inCartBadge: (p: number) => `У ЗАМОВЛЕННІ: ${p} П.`,
      footerSub: 'ВІДДІЛ ГУРТОВОГО ПРОДАЖУ // CARDIO ХАРКІВ',
      georgiyName: 'Георгій',
      borisName: 'Борис',
      securityNote: 'Конфіденційний B2B-документ. Захищено персональним водяним знаком та забороною пересилання.',
      cardTitle: 'КАРТКА МОДЕЛІ (B2B ПРАЙС)',
      colorLabel: 'Колір:',
      wholesalePriceLabel: 'Гуртова ціна:',
      perPairWord: 'за пару',
      availableColors: 'ВСІ КОЛЬОРИ ЦІЄЇ МОДЕЛІ',
      orderParams: 'КОМПЛЕКТАЦІЯ ЗАМОВЛЕННЯ У НАКЛАДНУ',
      wholesaleRun: 'Гуртова ростовка',
      sampleRun: 'Тестовий зразок (1 п.)',
      standard8: '8 пар • Стандарт',
      standard8Desc: '42 і 43 р. — по 2 пари',
      even6: '6 пар • Рівна',
      even6Desc: '40–45 р. — всі по 1 парі',
      boxesCountLabel: 'Кількість коробів:',
      samplePrompt: 'Виберіть розмір тестового зразка:',
      addToCart: 'Додати до накладної',
      addedSuccess: '✓ Додано до накладної',
      alreadyInCart: (p: number, usd: number) => `Вже у накладній: ${p} пар ($${usd})`,
      openWord: 'Відкрити →',
      bottomOrderTitle: 'ВАШЕ ГУРТОВЕ ЗАМОВЛЕННЯ (ЗА ПРАЙСОМ)',
      bottomInvoiceText: (m: number, p: number, usd: number) => `${m} мод. • ${p} пар • $${usd}`,
      openInvoiceBtn: 'Оформити →',
    },
    de: {
      backToPublic: '← Zurück',
      backToPriceList: '← Preiskatalog',
      invoiceBtn: (p: number, usd: number) => `Rechnung (${p} P. • $${usd})`,
      pinTag: 'CARDIO B2B // EXKLUSIVER BEREICH',
      pinTitle: 'Großhandel Preiskatalog 2026',
      pinSub: 'Die Großhandelspreise sind ausschließlich für autorisierte Partner bestimmt. Bitte 4-stelligen PIN eingeben:',
      pinUnlockBtn: 'Preiskatalog öffnen →',
      pinErrorText: 'Ungültiger PIN-Code. Bitte beim Verkaufsleiter anfordern.',
      askPinTitle: 'PIN-Code beim Verkaufsleiter anfordern:',
      askBoris: 'Boris • +38 (097) 454-15-11',
      askGeorgiy: 'Georgiy • +38 (067) 719-37-16',
      lookbookTag: 'CARDIO FOOTWEAR // WHOLESALE LOOKBOOK 2026',
      mainTitle: 'Großhandel Preiskatalog 2026',
      downloadBtn: (count: number) => `⬇ Preiskatalog PDF herunterladen (${count} Modelle)`,
      downloadBtnTop: '⬇ PDF',
      generatingPdf: 'PDF Layout',
      sentToTgBanner: '✓ Geschützter PDF-Katalog mit Wasserzeichen wurde in Ihren Telegram-Chat gesendet!',
      downloadDirectBtn: '📥 PDF-Datei auf Smartphone speichern →',
      tabAll: `Alle Modelle (${allCatalogItems.length})`,
      tabAutumn: `Herbst 2026 (${autumnCount})`,
      tabWinter: `Winter 2026 (${winterCount})`,
      box6: 'Kiste 6 Paar',
      box8: 'Kiste 8 Paar',
      orderBtn: 'Serie wählen →',
      reorderBtn: 'Nachbestellen →',
      inCartBadge: (p: number) => `IM WAGEN: ${p} P.`,
      footerSub: 'GROSSHANDELSABTEILUNG // CARDIO CHARKIW',
      georgiyName: 'Georgiy',
      borisName: 'Boris',
      securityNote: 'Vertrauliches B2B-Dokument. Geschützt durch persönliches Wasserzeichen.',
      cardTitle: 'MODELLKARTE (B2B PREIS)',
      colorLabel: 'Farbe:',
      wholesalePriceLabel: 'Großhandelspreis:',
      perPairWord: 'pro Paar',
      availableColors: 'VERFÜGBARE FARBVARIANTEN',
      orderParams: 'BESTELLKONFIGURATION',
      wholesaleRun: 'Großhandelsserie',
      sampleRun: 'Testmuster (1 P.)',
      standard8: '8 Paar • Standard',
      standard8Desc: 'Gr. 42 & 43 — je 2 Paar',
      even6: '6 Paar • Gleich',
      even6Desc: 'Gr. 40–45 — je 1 Paar',
      boxesCountLabel: 'Anzahl Kisten:',
      samplePrompt: 'Testmuster-Größe wählen:',
      addToCart: 'Zur Rechnung hinzufügen',
      addedSuccess: '✓ Hinzugefügt',
      alreadyInCart: (p: number, usd: number) => `Bereits auf der Rechnung: ${p} Paar ($${usd})`,
      openWord: 'Öffnen →',
      bottomOrderTitle: 'IHRE GROSSHANDELSBESTELLUNG',
      bottomInvoiceText: (m: number, p: number, usd: number) => `${m} Mod. • ${p} Paar • $${usd}`,
      openInvoiceBtn: 'Bestellen →',
    },
  }[lang];

  const updateSizeCount = (size: SizeKey, delta: number) => {
    const currentVal = sizeRun[size] || 0;
    const nextVal = Math.max(0, Math.min(10, currentVal + delta));
    if (nextVal !== currentVal) {
      onHaptic?.();
      setSizeRun((prev) => ({ ...prev, [size]: nextVal }));
    }
  };

  const addSelectedShoeToCart = () => {
    if (!selectedShoeInPrice || currentTotalPairs === 0) return;
    onHaptic?.();

    const pricePerPair = getWholesalePriceByModel(selectedShoeInPrice.modelNumber) || 0;
    const lineUsd = pricePerPair * currentTotalPairs;

    const formulaText =
      orderMode === 'sample'
        ? `${t.sampleRun} — р. ${sampleSize} ($${lineUsd})`
        : `Ростовок ×${boxesCount} ($${lineUsd}): ` +
          SIZES.filter((sz) => sizeRun[sz] > 0)
            .map((sz) => `${sz}р.(${sizeRun[sz] * boxesCount})`)
            .join(' • ');

    const newItem: CartItem = {
      uid: `${selectedShoeInPrice.id}-${Date.now()}`,
      shoe: selectedShoeInPrice,
      orderMode,
      sizeRun: { ...sizeRun },
      boxesCount,
      sampleSize,
      totalPairs: currentTotalPairs,
      formulaText,
    };

    setCart((prev) => [...prev, newItem]);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2200);
  };

  const triggerDownloadUrl = (relativeOrFullUrl: string, fileName: string) => {
    const fullUrl = relativeOrFullUrl.startsWith('http')
      ? relativeOrFullUrl
      : `${window.location.origin}${relativeOrFullUrl}`;
    const tg = getTgWebApp();

    if (typeof tg?.downloadFile === 'function') {
      try {
        tg.downloadFile({ url: fullUrl, file_name: fileName });
        return;
      } catch {}
    }

    if (typeof tg?.openLink === 'function') {
      try {
        tg.openLink(fullUrl);
        return;
      } catch {}
    }

    window.open(fullUrl, '_blank');
  };

  /**
   * Крупноформатная журнальная верстка PDF:
   * - По 2 крупные модели во всю ширину листа А4 на страницу (идеально читается с экрана телефона)
   * - Контрастный диагональный водяной знак с ID партнера поверх каждого листа и подиума
   */
  const handleGenerateAndDeliverPdf = async () => {
    if (pdfGenerating) return;
    setPdfGenerating(true);
    setDeliveryStatus(null);

    try {
      const logoImg = await loadImageElement('/logo.png');
      const itemsToRender = visibleItems;
      const cardsPerPage = 2; // 2 крупные широкоформатные карточки во всю ширину листа А4!
      const totalPages = Math.max(1, Math.ceil(itemsToRender.length / cardsPerPage));
      const jpegPages: string[] = [];

      const W = 960;
      const H = 1358;

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        setPdfProgressText(`${pageIdx + 1}/${totalPages}`);
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        // 1. Фон дизайнерской бумаги Warm Alabaster
        ctx.fillStyle = '#F2EFE9';
        ctx.fillRect(0, 0, W, H);

        const marginX = 48;
        const contentW = W - marginX * 2; // 864px

        // 2. Верхний колонтитул с ID партнера и номером листа
        ctx.fillStyle = '#161514';
        ctx.font = '700 13px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('CARDIO FOOTWEAR // KHARKIV • B2B LOOKBOOK 2026', marginX, 42);

        ctx.textAlign = 'right';
        ctx.fillText(
          `${tgUser.label}   •   ${ String(pageIdx + 1).padStart(2, '0') } / ${ String(totalPages).padStart(2, '0') }`,
          W - marginX,
          42
        );

        ctx.strokeStyle = '#161514';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(marginX, 56);
        ctx.lineTo(W - marginX, 56);
        ctx.stroke();

        // Шапка с логотипом и названием коллекции
        if (logoImg) {
          const lH = 42;
          const lW = (logoImg.width / Math.max(1, logoImg.height)) * lH;
          ctx.drawImage(logoImg, marginX, 68, lW, lH);
        }

        ctx.fillStyle = '#161514';
        ctx.font = '700 32px Georgia, serif';
        ctx.textAlign = 'left';
        ctx.fillText('CARDIO', marginX + 82, 99);

        ctx.fillStyle = '#6E6A63';
        ctx.font = 'italic 20px Georgia, serif';
        ctx.textAlign = 'right';
        ctx.fillText(t.mainTitle, W - marginX, 98);

        ctx.strokeStyle = '#DCD7CC';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(marginX, 120);
        ctx.lineTo(W - marginX, 120);
        ctx.stroke();

        // 3. Две крупные карточки моделей во всю ширину страницы (864px × 535px каждая)
        const slice = itemsToRender.slice(pageIdx * cardsPerPage, (pageIdx + 1) * cardsPerPage);
        const startY = 138;
        const cardH = 535;
        const gapY = 26;

        for (let i = 0; i < slice.length; i++) {
          const { shoe, priceUsd, season } = slice[i];
          const x = marginX;
          const y = startY + i * (cardH + gapY);

          // Корпус карточки
          ctx.fillStyle = '#F8F6F1';
          ctx.fillRect(x, y, contentW, cardH);
          ctx.strokeStyle = '#161514';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, contentW, cardH);

          // Верхняя темная плашка карточки с крупным номером модели и крупной ценой
          ctx.fillStyle = '#161514';
          ctx.fillRect(x, y, contentW, 64);

          const variantSuffix = shoe.variant ? ` (${shoe.variant})` : '';
          ctx.fillStyle = '#F8F6F1';
          ctx.font = '700 32px Georgia, serif';
          ctx.textAlign = 'left';
          ctx.fillText(`Модель № ${shoe.modelNumber}${variantSuffix}`, x + 24, y + 43);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 34px Georgia, serif';
          ctx.textAlign = 'right';
          ctx.fillText(`$${priceUsd}`, x + contentW - 24, y + 44);

          // Студийный белый подиум во всю ширину (824px × 324px)
          const stageX = x + 20;
          const stageY = y + 80;
          const stageW = contentW - 40;
          const stageH = 320;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(stageX, stageY, stageW, stageH);
          ctx.strokeStyle = '#E5E0D5';
          ctx.lineWidth = 1;
          ctx.strokeRect(stageX, stageY, stageW, stageH);

          // Бейджи внутри подиума (Сезон + Категория | Ростовка 40-45)
          const catLocalized = getLocalizedCategory(shoe.category, lang).toUpperCase();
          const seasonLocalized =
            season === 'autumn'
              ? lang === 'de'
                ? 'HERBST 2026'
                : lang === 'uk'
                ? 'ОСІНЬ 2026'
                : 'ОСЕНЬ 2026'
              : lang === 'de'
              ? 'WINTER 2026'
              : 'ЗИМА 2026';

          ctx.fillStyle = '#6E6A63';
          ctx.font = '700 15px Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`${catLocalized}   •   ${seasonLocalized}`, stageX + 18, stageY + 28);

          ctx.textAlign = 'right';
          ctx.fillText('40—45', stageX + stageW - 18, stageY + 28);

          // Отрисовка крупной фотографии обуви
          const shoeImg = await loadImageElement(shoe.image);
          if (shoeImg) {
            const padX = 40;
            const padY = 28;
            const availW = stageW - padX * 2;
            const availH = stageH - padY * 2;
            const scale = Math.min(
              availW / Math.max(1, shoeImg.width),
              availH / Math.max(1, shoeImg.height)
            );
            const drawW = shoeImg.width * scale;
            const drawH = shoeImg.height * scale;
            const drawX = stageX + (stageW - drawW) / 2;
            const drawY = stageY + (stageH - drawH) / 2 + 8;
            ctx.drawImage(shoeImg, drawX, drawY, drawW, drawH);
          }

          // Нижняя информационная панель карточки (Цвет, Характеристики и Крупный расчет коробов)
          const infoY = stageY + stageH + 34;
          const colorLocalized = getLocalizedColor(shoe.color, lang).toUpperCase();
          const featuresList = shoe.features
            .map((f) => getLocalizedFeature(f, lang).toUpperCase())
            .join('  •  ');
          const specsLine = featuresList
            ? `${t.colorLabel.toUpperCase()} ${colorLocalized}     •     ${featuresList}`
            : `${t.colorLabel.toUpperCase()} ${colorLocalized}`;

          ctx.fillStyle = '#161514';
          ctx.font = '700 18px Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(specsLine, x + 24, infoY);

          // Разделительная черта перед расчетом коробов
          ctx.strokeStyle = '#DCD7CC';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x + 20, infoY + 18);
          ctx.lineTo(x + contentW - 20, infoY + 18);
          ctx.stroke();

          // Крупные плашки цен за короб 6 пар и 8 пар
          const boxRowY = infoY + 56;
          ctx.fillStyle = '#6E6A63';
          ctx.font = '700 18px Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`${t.box6.toUpperCase()} (40–45):`, x + 24, boxRowY);

          ctx.fillStyle = '#161514';
          ctx.font = '700 26px Georgia, serif';
          ctx.fillText(`$${priceUsd * 6}`, x + 245, boxRowY + 2);

          ctx.fillStyle = '#6E6A63';
          ctx.font = '700 18px Arial, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`${t.box8.toUpperCase()}:`, x + contentW - 125, boxRowY);

          ctx.fillStyle = '#161514';
          ctx.font = '700 26px Georgia, serif';
          ctx.fillText(`$${priceUsd * 8}`, x + contentW - 24, boxRowY + 2);
        }

        // 4. ЗАЩИТНЫЙ ДИАГОНАЛЬНЫЙ ВОДЯНОЙ ЗНАК ПОВЕРХ ВСЕГО ЛИСТА (3 полосы + штамп)
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate(-Math.PI / 6.5);
        ctx.textAlign = 'center';

        const watermarkOffsets = [-380, 0, 380];
        for (const offsetY of watermarkOffsets) {
          // Рамка-штамп вокруг водяного знака
          ctx.strokeStyle = 'rgba(22, 21, 20, 0.11)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-520, offsetY - 32, 1040, 46);

          ctx.fillStyle = 'rgba(22, 21, 20, 0.11)';
          ctx.font = '700 21px Arial, sans-serif';
          ctx.fillText(tgUser.watermarkLine, 0, offsetY - 2);
        }
        ctx.restore();

        // 5. Нижний колонтитул с контактами Бориса и Георгия
        const footerY = H - 70;
        ctx.strokeStyle = '#161514';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(marginX, footerY);
        ctx.lineTo(W - marginX, footerY);
        ctx.stroke();

        ctx.fillStyle = '#161514';
        ctx.font = '700 15px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          `${t.footerSub}   •   +38 (067) 719-37-16 (${t.georgiyName})   •   +38 (097) 454-15-11 (${t.borisName})`,
          marginX,
          footerY + 28
        );

        ctx.fillStyle = '#6E6A63';
        ctx.font = '700 12px Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('DO NOT COPY OR FORWARD', W - marginX, footerY + 28);

        jpegPages.push(canvas.toDataURL('image/jpeg', 0.8));
      }

      const pdfBase64 = buildPdfBase64FromJpegPages(jpegPages, W, H);
      const fileName = `CARDIO_PRICE_CATALOG_2026_${lang.toUpperCase()}.pdf`;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_pdf',
          pdfBase64,
          fileName,
          chatId: tgUser.id,
          caption: `📘 CARDIO 2026 — ${t.mainTitle} (${itemsToRender.length} мод.)\n🔒 ${t.securityNote}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.downloadPath) {
          setDeliveryStatus({
            sentToTelegram: Boolean(data.sentToTelegram),
            downloadUrl: data.downloadPath,
            fileName,
          });
          if (!data.sentToTelegram) {
            triggerDownloadUrl(data.downloadPath, fileName);
          }
        }
      }
    } catch {} finally {
      setPdfGenerating(false);
      setPdfProgressText('');
    }
  };

  const handlePinSubmit = () => {
    if (VALID_WHOLESALE_PINS.has(pinInput.trim())) {
      setPinError(false);
      onUnlockSuccess();
    } else {
      setPinError(true);
    }
  };

  // ===========================================================================
  // РЕЖИМ А: ОТКРЫТА НАКЛАДНАЯ ПРЯМО ВНУТРИ ПРАЙС-КАТАЛОГА
  // ===========================================================================
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
                const updatedFormula =
                  item.orderMode === 'sample'
                    ? item.formulaText
                    : `Ростовок ×${newBoxes} ($${lineUsd}): ` +
                      SIZES.filter((sz) => item.sizeRun[sz] > 0)
                        .map((sz) => `${sz}р.(${item.sizeRun[sz] * newBoxes})`)
                        .join(' • ');
                return { ...item, boxesCount: newBoxes, totalPairs: newTotalPairs, formulaText: updatedFormula };
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

  // ===========================================================================
  // РЕЖИМ Б: КАРТОЧКА ЗАКАЗА МОДЕЛИ ВНУТРИ ЗАКРЫТОГО ПРАЙС-КАТАЛОГА (С ЦЕНАМИ В $)
  // ===========================================================================
  if (selectedShoeInPrice) {
    const unitPriceUsd = getWholesalePriceByModel(selectedShoeInPrice.modelNumber) || 0;
    const totalLineUsd = unitPriceUsd * currentTotalPairs;
    const alreadyInCartPairs = pairsInCartByShoeId[selectedShoeInPrice.id] || 0;
    const alreadyInCartUsd = alreadyInCartPairs * unitPriceUsd;
    const translatedSelectedColor = getLocalizedColor(selectedShoeInPrice.color, lang);
    const modelVariants = cardioCatalog.filter((i) => i.modelNumber === selectedShoeInPrice.modelNumber);

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
          padding: '0 16px 110px 16px',
          boxSizing: 'border-box',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
        }}
      >
        {/* Шапка карточки модели: возврат обратно в прайс-каталог (не на главную!) */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: THEME.bg,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 0',
            marginBottom: '18px',
            borderBottom: `1px solid ${THEME.border}`,
          }}
        >
          <button
            type="button"
            onClick={() => {
              onHaptic?.();
              setSelectedShoeInPrice(null);
            }}
            style={{
              backgroundColor: THEME.surface,
              border: `1px solid ${THEME.ink}`,
              padding: '8px 12px',
              fontSize: '10px',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              color: THEME.ink,
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
              setIsCartOpenInPrice(true);
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
              color: cart.length > 0 ? THEME.onInk : THEME.ink,
              whiteSpace: 'nowrap',
            }}
          >
            {t.invoiceBtn(cartTotalPairs, cartTotalUsd)}
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
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: THEME.ink,
            }}
          >
            <span>{t.alreadyInCart(alreadyInCartPairs, alreadyInCartUsd)}</span>
            <span
              onClick={() => {
                onHaptic?.();
                setIsCartOpenInPrice(true);
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

        {/* Заголовок модели + Оптовая цена в $ */}
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
                color: THEME.inkMuted,
                textTransform: 'uppercase',
                letterSpacing: '1.3px',
                marginBottom: '4px',
              }}
            >
              {t.cardTitle} // {getLocalizedCategory(selectedShoeInPrice.category, lang)}
            </div>
            <h1
              style={{
                fontFamily: THEME.serif,
                fontSize: '32px',
                margin: '0 0 4px 0',
                fontWeight: 400,
                lineHeight: 1.1,
              }}
            >
              Модель № {selectedShoeInPrice.modelNumber}
              {selectedShoeInPrice.variant && (
                <span style={{ fontSize: '18px', color: THEME.inkMuted, fontStyle: 'italic', marginLeft: '6px' }}>
                  ({selectedShoeInPrice.variant})
                </span>
              )}
            </h1>
            <div style={{ fontFamily: THEME.serif, fontStyle: 'italic', fontSize: '15px', color: THEME.inkMuted }}>
              {t.colorLabel} {translatedSelectedColor}
            </div>
          </div>

          <div
            style={{
              backgroundColor: THEME.surface,
              border: `1px solid ${THEME.ink}`,
              padding: '8px 12px',
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '1px', color: THEME.inkMuted }}>
              {t.wholesalePriceLabel}
            </div>
            <div style={{ fontFamily: THEME.serif, fontSize: '26px', fontWeight: 700, color: THEME.ink, lineHeight: 1.1 }}>
              ${unitPriceUsd}
            </div>
            <div style={{ fontSize: '9px', color: THEME.inkMuted }}>{t.perPairWord}</div>
          </div>
        </div>

        {/* Подиум с фото обуви */}
        <div
          style={{
            backgroundColor: THEME.surface,
            border: `1px solid ${THEME.border}`,
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 14px',
              borderBottom: `1px solid ${THEME.border}`,
              fontSize: '9px',
              letterSpacing: '1.3px',
              color: THEME.inkLight,
              textTransform: 'uppercase',
            }}
          >
            <span>{t.box6}: ${unitPriceUsd * 6}</span>
            <span>{t.box8}: ${unitPriceUsd * 8}</span>
          </div>

          <div
            style={{
              width: '100%',
              height: '230px',
              padding: '18px 24px',
              boxSizing: 'border-box',
              backgroundColor: THEME.imageStage,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={selectedShoeInPrice.image}
              alt={`Модель ${selectedShoeInPrice.modelNumber}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                mixBlendMode: 'multiply',
              }}
            />
          </div>
        </div>

        {/* Переключение расцветок этой же модели */}
        {modelVariants.length > 1 && (
          <div style={{ marginBottom: '22px' }}>
            <div
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                color: THEME.inkMuted,
                marginBottom: '8px',
              }}
            >
              {t.availableColors}
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
                const isCurrent = v.id === selectedShoeInPrice.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      if (!isCurrent) {
                        onHaptic?.();
                        setSelectedShoeInPrice(v);
                        setJustAdded(false);
                      }
                    }}
                    style={{
                      borderRight: `1px solid ${THEME.border}`,
                      borderBottom: `1px solid ${THEME.border}`,
                      backgroundColor: isCurrent ? THEME.surfaceActive : THEME.surface,
                      padding: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '8px', textAlign: 'left', marginBottom: '4px', fontWeight: isCurrent ? 700 : 400 }}>
                      0{i + 1} {isCurrent ? '✓' : ''}
                    </div>
                    <div
                      style={{
                        height: '76px',
                        padding: '6px',
                        backgroundColor: THEME.imageStage,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={v.image}
                        alt={v.color}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }}
                      />
                    </div>
                    <div style={{ fontSize: '10px', marginTop: '6px', fontWeight: isCurrent ? 600 : 400 }}>
                      {getLocalizedColor(v.color, lang)} {v.variant || ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Выбор комплектации ростовки */}
        <div style={{ marginBottom: '22px' }}>
          <div
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              color: THEME.inkMuted,
              marginBottom: '10px',
            }}
          >
            {t.orderParams}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              border: `1px solid ${THEME.ink}`,
              marginBottom: '16px',
            }}
          >
            <button
              type="button"
              onClick={() => setOrderMode('wholesale')}
              style={{
                backgroundColor: orderMode === 'wholesale' ? THEME.ink : 'transparent',
                color: orderMode === 'wholesale' ? THEME.onInk : THEME.ink,
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
                backgroundColor: orderMode === 'sample' ? THEME.ink : 'transparent',
                color: orderMode === 'sample' ? THEME.onInk : THEME.ink,
                border: 'none',
                borderLeft: `1px solid ${THEME.ink}`,
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setSizeRun({ ...STANDARD_8_RUN })}
                  style={{
                    backgroundColor: isStandard8 ? THEME.ink : THEME.surface,
                    color: isStandard8 ? THEME.onInk : THEME.ink,
                    border: `1px solid ${isStandard8 ? THEME.ink : THEME.border}`,
                    padding: '10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>
                    {t.standard8} (${unitPriceUsd * 8})
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.8, fontFamily: THEME.serif, fontStyle: 'italic' }}>
                    {t.standard8Desc}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSizeRun({ ...EVEN_6_RUN })}
                  style={{
                    backgroundColor: isEven6 ? THEME.ink : THEME.surface,
                    color: isEven6 ? THEME.onInk : THEME.ink,
                    border: `1px solid ${isEven6 ? THEME.ink : THEME.border}`,
                    padding: '10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>
                    {t.even6} (${unitPriceUsd * 6})
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.8, fontFamily: THEME.serif, fontStyle: 'italic' }}>
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
                          color: isDoubled ? THEME.onInk : THEME.inkMuted,
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
                        style={{ background: 'none', border: 'none', padding: '8px 0', fontSize: '16px', color: THEME.ink, cursor: 'pointer' }}
                      >
                        +
                      </button>
                      <div style={{ fontFamily: THEME.serif, fontSize: '18px', fontWeight: 600, padding: '2px 0' }}>
                        {count}
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSizeCount(sz, -1)}
                        style={{ background: 'none', border: 'none', padding: '8px 0', fontSize: '16px', color: THEME.ink, cursor: 'pointer' }}
                      >
                        −
                      </button>
                    </div>
                  );
                })}
              </div>

              {isCustomRun && (
                <div style={{ fontSize: '11px', color: THEME.inkMuted, marginBottom: '10px', textAlign: 'right' }}>
                  В одном коробе: {pairsPerBox} п. (${pairsPerBox * unitPriceUsd})
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: `1px solid ${THEME.border}`,
                }}
              >
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.1px', color: THEME.inkMuted }}>
                  {t.boxesCountLabel}
                </span>
                <div style={{ display: 'flex', border: `1px solid ${THEME.border}` }}>
                  {[1, 2, 3, 5, 10].map((num, idx) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setBoxesCount(num)}
                      style={{
                        padding: '7px 12px',
                        border: 'none',
                        borderLeft: idx === 0 ? 'none' : `1px solid ${THEME.border}`,
                        backgroundColor: boxesCount === num ? THEME.ink : THEME.surface,
                        color: boxesCount === num ? THEME.onInk : THEME.ink,
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
              <div style={{ fontSize: '12px', fontFamily: THEME.serif, fontStyle: 'italic', color: THEME.inkMuted, marginBottom: '10px' }}>
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
                    onClick={() => setSampleSize(sz)}
                    style={{
                      padding: '14px 0',
                      border: 'none',
                      borderRight: `1px solid ${THEME.border}`,
                      borderBottom: `1px solid ${THEME.border}`,
                      backgroundColor: sampleSize === sz ? THEME.ink : THEME.surface,
                      color: sampleSize === sz ? THEME.onInk : THEME.ink,
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
          disabled={currentTotalPairs === 0}
          onClick={addSelectedShoeToCart}
          style={{
            width: '100%',
            padding: '16px 18px',
            backgroundColor: justAdded ? THEME.accentGreen : THEME.ink,
            color: justAdded ? '#FFFFFF' : THEME.onInk,
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
          <span style={{ fontFamily: THEME.serif, fontStyle: 'italic', fontSize: '16px', textTransform: 'none' }}>
            {currentTotalPairs} п. • ${totalLineUsd} →
          </span>
        </button>
      </div>
    );
  }

  // ===========================================================================
  // РЕЖИМ В: ГЛАВНЫЙ ЭКРАН ПРАЙС-КАТАЛОГА (ВВОД PIN ИЛИ СЕТКА ВСЕХ 38 МОДЕЛЕЙ)
  // ===========================================================================
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
        padding: '0 16px 110px 16px',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
      }}
    >
      {/* Липкая верхняя панель */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: THEME.bg,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 0',
          marginBottom: '16px',
          borderBottom: `1px solid ${THEME.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/logo.png"
            alt="Cardio"
            onClick={onClose}
            style={{
              height: '32px',
              width: 'auto',
              objectFit: 'contain',
              mixBlendMode: isDark ? 'screen' : 'multiply',
              filter: isDark ? 'invert(1) hue-rotate(180deg) brightness(1.1)' : 'none',
              cursor: 'pointer',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: THEME.surface,
              border: `1px solid ${THEME.ink}`,
              color: THEME.ink,
              padding: '8px 12px',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t.backToPublic}
          </button>
        </div>

        {isUnlocked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onHaptic?.();
                  setIsCartOpenInPrice(true);
                }}
                style={{
                  backgroundColor: THEME.surface,
                  color: THEME.ink,
                  border: `1px solid ${THEME.ink}`,
                  padding: '8px 10px',
                  fontSize: '9.5px',
                  fontWeight: 600,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.invoiceBtn(cartTotalPairs, cartTotalUsd)}
              </button>
            )}

            <button
              type="button"
              disabled={pdfGenerating}
              onClick={handleGenerateAndDeliverPdf}
              style={{
                backgroundColor: THEME.ink,
                color: THEME.onInk,
                border: `1px solid ${THEME.ink}`,
                padding: '8px 12px',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                cursor: pdfGenerating ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {pdfGenerating ? `${pdfProgressText}` : t.downloadBtnTop}
            </button>
          </div>
        )}
      </div>

      {!isUnlocked ? (
        <div
          style={{
            maxWidth: '400px',
            margin: '24px auto',
            backgroundColor: THEME.surface,
            border: `1px solid ${THEME.border}`,
            padding: '28px 20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              letterSpacing: '1.6px',
              color: THEME.inkMuted,
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            {t.pinTag}
          </div>
          <h2
            style={{
              fontFamily: THEME.serif,
              fontSize: '26px',
              fontWeight: 400,
              margin: '0 0 10px 0',
              color: THEME.ink,
            }}
          >
            {t.pinTitle}
          </h2>
          <p style={{ fontSize: '12px', color: THEME.inkMuted, lineHeight: 1.5, margin: '0 0 18px 0' }}>
            {t.pinSub}
          </p>

          <input
            type="tel"
            inputMode="numeric"
            maxLength={6}
            placeholder="• • • •"
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value.replace(/\D/g, ''));
              setPinError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePinSubmit();
            }}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              fontSize: '22px',
              letterSpacing: '8px',
              textAlign: 'center',
              fontWeight: 600,
              backgroundColor: THEME.bg,
              color: THEME.ink,
              WebkitTextFillColor: THEME.ink,
              border: `1.5px solid ${pinError ? '#B91C1C' : THEME.ink}`,
              outline: 'none',
              marginBottom: '10px',
            }}
          />

          {pinError && (
            <div style={{ fontSize: '11px', color: '#B91C1C', marginBottom: '10px', lineHeight: 1.35 }}>
              {t.pinErrorText}
            </div>
          )}

          <button
            type="button"
            onClick={handlePinSubmit}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: THEME.ink,
              color: THEME.onInk,
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

          <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: '14px' }}>
            <div style={{ fontSize: '10px', color: THEME.inkMuted, marginBottom: '8px' }}>
              {t.askPinTitle}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <a
                href="tel:+380974541511"
                style={{
                  display: 'block',
                  padding: '9px 10px',
                  border: `1px solid ${THEME.border}`,
                  backgroundColor: THEME.bg,
                  color: THEME.ink,
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
                  border: `1px solid ${THEME.border}`,
                  backgroundColor: THEME.bg,
                  color: THEME.ink,
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
      ) : (
        <div>
          {/* Журнальная шапка без обрезки и без переносов */}
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

            <button
              type="button"
              disabled={pdfGenerating}
              onClick={handleGenerateAndDeliverPdf}
              style={{
                width: '100%',
                padding: '14px 16px',
                backgroundColor: THEME.ink,
                color: THEME.onInk,
                border: 'none',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                cursor: pdfGenerating ? 'wait' : 'pointer',
              }}
            >
              {pdfGenerating
                ? `${t.generatingPdf} (${pdfProgressText})...`
                : t.downloadBtn(visibleItems.length)}
            </button>

            {deliveryStatus && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  backgroundColor: THEME.surface,
                  border: `1px solid ${THEME.ink}`,
                }}
              >
                {deliveryStatus.sentToTelegram && (
                  <div style={{ fontSize: '11px', fontWeight: 600, color: THEME.accentGreen, marginBottom: '8px' }}>
                    {t.sentToTgBanner}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => triggerDownloadUrl(deliveryStatus.downloadUrl, deliveryStatus.fileName)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: THEME.surfaceActive,
                    color: THEME.ink,
                    border: `1px solid ${THEME.ink}`,
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {t.downloadDirectBtn}
                </button>
              </div>
            )}
          </div>

          {/* Табы сезонов: Все модели (38) | Осень 2026 (13) | Зима 2026 (25) */}
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
              const label = tab === 'all' ? t.tabAll : tab === 'autumn' ? t.tabAutumn : t.tabWinter;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSeasonFilter(tab)}
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

          {/* Сетка 38 моделей с ценами и индикацией заказа */}
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
              const translatedFeatures = shoe.features.map((f) => getLocalizedFeature(f, lang));
              const inCartPairs = pairsInCartByShoeId[shoe.id] || 0;

              return (
                <div
                  key={shoe.id}
                  onClick={() => {
                    onHaptic?.();
                    setSelectedShoeInPrice(shoe);
                    setJustAdded(false);
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
                      <span style={{ fontSize: '8px', letterSpacing: '0.6px', textTransform: 'uppercase', color: THEME.inkLight }}>
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
                        <span style={{ fontSize: '8px', color: THEME.inkLight }}>
                          {season === 'autumn' ? 'AUTUMN' : 'WINTER'}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '136px',
                        padding: '10px 12px',
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span
                        style={{
                          fontFamily: THEME.serif,
                          fontSize: '19px',
                          color: THEME.ink,
                        }}
                      >
                        № {shoe.modelNumber}
                        {shoe.variant && (
                          <span style={{ fontSize: '12px', fontStyle: 'italic', color: THEME.inkMuted, marginLeft: '4px' }}>
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
                      <span>6 п.: <strong style={{ color: THEME.ink }}>${priceUsd * 6}</strong></span>
                      <span>8 п.: <strong style={{ color: THEME.ink }}>${priceUsd * 8}</strong></span>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '300px', margin: '0 auto 10px auto' }}>
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
            <div style={{ fontSize: '9px', color: THEME.inkLight }}>{t.securityNote}</div>
          </div>
        </div>
      )}

      {/* Фиксированная нижняя панель накладной прямо внутри прайс-каталога */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
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
