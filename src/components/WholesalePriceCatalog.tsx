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

function getTelegramUserInfo(): { id?: number; partnerCode: string } {
  try {
    const u = getTgWebApp()?.initDataUnsafe?.user;
    if (u?.id) {
      return {
        id: u.id,
        partnerCode: `B2B-${u.id}`,
      };
    }
  } catch {}
  return {
    partnerCode: 'B2B-OFFICIAL',
  };
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

/**
 * Автоматически кадрирует пустые белые поля вокруг обуви и переводит белый фон фото
 * в благородный тон бумаги #F5F3EE (RGB: 245, 243, 238), чтобы обувь занимала 65% страницы
 * без белых прямоугольников и рамок.
 */
function prepareSeamlessShoeCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const srcW = img.naturalWidth || img.width || 800;
  const srcH = img.naturalHeight || img.height || 600;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = srcW;
  tempCanvas.height = srcH;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return tempCanvas;

  tempCtx.fillStyle = '#FFFFFF';
  tempCtx.fillRect(0, 0, srcW, srcH);
  tempCtx.drawImage(img, 0, 0, srcW, srcH);

  const imgData = tempCtx.getImageData(0, 0, srcW, srcH);
  const data = imgData.data;

  let minX = srcW;
  let minY = srcH;
  let maxX = 0;
  let maxY = 0;

  // Ищем границы самой обуви (отсекая чистый белый студийный фон)
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const idx = (y * srcW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Если пиксель темнее чем #F6F6F6 — это часть обуви или ее естественной тени
      if (r < 245 || g < 245 || b < 245) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Умножаем каждый пиксель на тон бумаги #F5F3EE (245, 243, 238),
  // чтобы белый фон (#FFFFFF) стал ровно #F5F3EE и бесшовно слился с листом каталога
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round((data[i] * 245) / 255);
    data[i + 1] = Math.round((data[i + 1] * 243) / 255);
    data[i + 2] = Math.round((data[i + 2] * 238) / 255);
  }
  tempCtx.putImageData(imgData, 0, 0);

  if (maxX <= minX || maxY <= minY) {
    return tempCanvas;
  }

  const padX = Math.round((maxX - minX) * 0.04);
  const padY = Math.round((maxY - minY) * 0.04);
  const cropX = Math.max(0, minX - padX);
  const cropY = Math.max(0, minY - padY);
  const cropW = Math.min(srcW - cropX, maxX - minX + padX * 2);
  const cropH = Math.min(srcH - cropY, maxY - minY + padY * 2);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = cropW;
  outCanvas.height = cropH;
  const outCtx = outCanvas.getContext('2d');
  if (outCtx) {
    outCtx.fillStyle = '#F5F3EE';
    outCtx.fillRect(0, 0, cropW, cropH);
    outCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  }
  return outCanvas;
}

function buildPdfBytesFromJpegPages(
  jpegDataUrls: string[],
  imgW: number,
  imgH: number,
  pageWidthPt = 595.28,
  pageHeightPt = 841.89
): Uint8Array {
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
  return merged;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
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
      desc: 'Персональный журнальный лукбук фабрики (1 модель = 1 страница А4) с ценами за пару и за короб',
      btn: isUnlocked ? 'Открыть прайс-каталог →' : 'Ввести PIN и открыть прайс →',
    },
    uk: {
      sub: isUnlocked ? 'B2B SHOWROOM // 38 МОДЕЛЕЙ З ЦІНАМИ' : 'B2B SHOWROOM // ДОСТУП ЗА PIN-КОДОМ',
      title: 'Гуртовий прайс-каталог 2026',
      desc: 'Персональний журнальний лукбук фабрики (1 модель = 1 сторінка А4) з цінами за пару та за короб',
      btn: isUnlocked ? 'Відкрити прайс-каталог →' : 'Ввести PIN та відкрити прайс →',
    },
    de: {
      sub: isUnlocked ? 'B2B SHOWROOM // 38 MODELLE MIT PREISEN' : 'B2B SHOWROOM // ZUGANG MIT PIN-CODE',
      title: 'Großhandel Preiskatalog 2026',
      desc: 'Exklusives Editorial-Lookbook (1 Modell = 1 Seite A4) mit Paar- und Kistenpreisen',
      btn: isUnlocked ? 'Preiskatalog öffnen →' : 'PIN eingeben & Katalog öffnen →',
    },
  }[safeLang];

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
    downloadUrl?: string;
    localBlob?: Blob;
    fileName: string;
  } | null>(null);

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
        imageStage: '#F5F3EE',
        ink: '#F5F3EE',
        inkMuted: '#85837E',
        inkLight: '#71717A',
        onInk: '#171717',
        onInkMuted: '#4A4742',
        border: '#2C2C30',
        accentGreen: '#2E7D32',
        serif: '"Playfair Display", Georgia, serif',
      }
    : {
        bg: '#F5F3EE',
        surface: '#FAF8F5',
        surfaceActive: '#EAE6DF',
        cardInCart: '#EFECE4',
        imageStage: '#F5F3EE',
        ink: '#171717',
        inkMuted: '#85837E',
        inkLight: '#A69984',
        onInk: '#F5F3EE',
        onInkMuted: '#D6D1C7',
        border: '#D6D1C7',
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
      downloadBtn: (count: number) => `⬇ Скачать Editorial Lookbook PDF (${count} мод. • 1 мод. = 1 стр.)`,
      downloadBtnTop: '⬇ PDF Lookbook',
      generatingPdf: 'Верстка PDF',
      sentToTgBanner: '✓ Премиальный PDF-каталог отправлен вам в чат Telegram от @Cordwainer_bot!',
      downloadDirectBtn: '📥 Скачать / Открыть PDF на устройстве →',
      tabAll: `Все модели (${allCatalogItems.length})`,
      tabAutumn: `Осень 2026 (${autumnItems.length})`,
      tabWinter: `Зима 2026 (${winterItems.length})`,
      box6: 'Короб 6 пар',
      box8: 'Короб 8 пар',
      orderBtn: 'Выбрать ростовку →',
      reorderBtn: 'Дозаказать →',
      inCartBadge: (p: number) => `В ЗАКАЗЕ: ${p} П.`,
      footerSub: 'ОТДЕЛ ОПТОВЫХ ПРОДАЖ // CARDIO ХАРЬКОВ',
      georgiyName: 'Георгий',
      borisName: 'Борис',
      securityNote: 'Конфиденциальный B2B-документ для оптовых партнеров.',
      cardTitle: 'КАРТОЧКА МОДЕЛИ (B2B ПРАЙС)',
      colorLabel: 'Цвет',
      wholesalePriceLabel: 'Оптовая цена',
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
      downloadBtn: (count: number) => `⬇ Завантажити Editorial Lookbook PDF (${count} мод. • 1 мод. = 1 стор.)`,
      downloadBtnTop: '⬇ PDF Lookbook',
      generatingPdf: 'Верстка PDF',
      sentToTgBanner: '✓ Преміальний PDF-каталог надіслано вам у чат Telegram від @Cordwainer_bot!',
      downloadDirectBtn: '📥 Завантажити / Відкрити PDF на пристрої →',
      tabAll: `Всі моделі (${allCatalogItems.length})`,
      tabAutumn: `Осінь 2026 (${autumnItems.length})`,
      tabWinter: `Зима 2026 (${winterItems.length})`,
      box6: 'Короб 6 пар',
      box8: 'Короб 8 пар',
      orderBtn: 'Вибрати ростовку →',
      reorderBtn: 'Дозамовити →',
      inCartBadge: (p: number) => `У ЗАМОВЛЕННІ: ${p} П.`,
      footerSub: 'ВІДДІЛ ГУРТОВОГО ПРОДАЖУ // CARDIO ХАРКІВ',
      georgiyName: 'Георгій',
      borisName: 'Борис',
      securityNote: 'Конфіденційний B2B-документ для гуртових партнерів.',
      cardTitle: 'КАРТКА МОДЕЛІ (B2B ПРАЙС)',
      colorLabel: 'Колір',
      wholesalePriceLabel: 'Гуртова ціна',
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
      downloadBtn: (count: number) => `⬇ Editorial Lookbook PDF laden (${count} Mod. • 1 Mod. = 1 Seite)`,
      downloadBtnTop: '⬇ PDF Lookbook',
      generatingPdf: 'PDF Layout',
      sentToTgBanner: '✓ Exklusiver PDF-Katalog wurde in Ihren Telegram-Chat gesendet!',
      downloadDirectBtn: '📥 PDF-Datei auf Gerät speichern / öffnen →',
      tabAll: `Alle Modelle (${allCatalogItems.length})`,
      tabAutumn: `Herbst 2026 (${autumnItems.length})`,
      tabWinter: `Winter 2026 (${winterItems.length})`,
      box6: 'Kiste 6 Paar',
      box8: 'Kiste 8 Paar',
      orderBtn: 'Serie wählen →',
      reorderBtn: 'Nachbestellen →',
      inCartBadge: (p: number) => `IM WAGEN: ${p} P.`,
      footerSub: 'GROSSHANDELSABTEILUNG // CARDIO CHARKIW',
      georgiyName: 'Georgiy',
      borisName: 'Boris',
      securityNote: 'Vertrauliches B2B-Dokument für Großhandelspartner.',
      cardTitle: 'MODELLKARTE (B2B PREIS)',
      colorLabel: 'Farbe',
      wholesalePriceLabel: 'Großhandelspreis',
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

  const triggerDownload = async (status: {
    downloadUrl?: string;
    localBlob?: Blob;
    fileName: string;
  }) => {
    const tg = getTgWebApp();

    if (status.downloadUrl) {
      const fullUrl = status.downloadUrl.startsWith('http')
        ? status.downloadUrl
        : `${window.location.origin}${status.downloadUrl}`;

      if (typeof tg?.downloadFile === 'function') {
        try {
          tg.downloadFile({ url: fullUrl, file_name: status.fileName });
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
      return;
    }

    if (status.localBlob) {
      try {
        const file = new File([status.localBlob], status.fileName, { type: 'application/pdf' });
        const nav = navigator as Navigator & { canShare?: (d: { files?: File[] }) => boolean };
        if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare({ files: [file] }))) {
          await nav.share({ files: [file], title: status.fileName });
          return;
        }
      } catch {}

      const blobUrl = URL.createObjectURL(status.localBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = status.fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
    }
  };

  /**
   * ГЕНЕРАТОР ПРЕМИАЛЬНОГО EDITORIAL LOOKBOOK PDF (А4):
   * - Палитра: #F5F3EE (Warm Milky-White), #171717 (Deep Graphite), #85837E (Soft Grey), #A69984 (Metallic Accent)
   * - Главное правило: ОДНА МОДЕЛЬ ОБУВИ (ОДИН ЦВЕТ) — ОДНА ПОЛНОЦЕННАЯ СТРАНИЦА А4
   * - Обувь занимает 60–70% визуального пространства страницы без рамок и прямоугольников
   * - Включает Обложку, Манифест/Оглавление, Разделители сезонов, 38 товарных полос и Контактную полосу
   */
  const handleGenerateAndDeliverPdf = async () => {
    if (pdfGenerating) return;
    setPdfGenerating(true);
    setDeliveryStatus(null);

    try {
      const W = 1240;
      const H = 1754;
      const PAD = 84; // Воздушные журнальные поля
      const CONTENT_W = W - PAD * 2;

      const PAPER = '#F5F3EE';
      const GRAPHITE = '#171717';
      const GREY = '#85837E';
      const METALLIC = '#A69984';
      const RULE = '#D6D1C7';

      const logoImg = await loadImageElement('/logo.png');

      // Определяем список сезонов для рендера
      const includeAutumn = seasonFilter === 'all' || seasonFilter === 'autumn';
      const includeWinter = seasonFilter === 'all' || seasonFilter === 'winter';

      type PageDescriptor =
        | { type: 'cover' }
        | { type: 'manifesto' }
        | { type: 'divider'; season: SeasonKey; count: number }
        | { type: 'product'; item: FullCatalogPriceItem; indexInCatalog: number }
        | { type: 'contacts' };

      const pagePlan: PageDescriptor[] = [{ type: 'cover' }, { type: 'manifesto' }];

      let globalProdIdx = 1;
      if (includeAutumn && autumnItems.length > 0) {
        pagePlan.push({ type: 'divider', season: 'autumn', count: autumnItems.length });
        for (const item of autumnItems) {
          pagePlan.push({ type: 'product', item, indexInCatalog: globalProdIdx++ });
        }
      }
      if (includeWinter && winterItems.length > 0) {
        pagePlan.push({ type: 'divider', season: 'winter', count: winterItems.length });
        for (const item of winterItems) {
          pagePlan.push({ type: 'product', item, indexInCatalog: globalProdIdx++ });
        }
      }
      pagePlan.push({ type: 'contacts' });

      const totalPages = pagePlan.length;
      const jpegPages: string[] = [];

      // Предзагрузим фото флагманской модели для обложки (например, 226 или первая доступная)
      const heroShoeItem =
        allCatalogItems.find((i) => i.shoe.modelNumber === '226')?.shoe ||
        allCatalogItems[0]?.shoe ||
        null;
      const heroShoeImgRaw = heroShoeItem ? await loadImageElement(heroShoeItem.image) : null;
      const heroShoeCropped = heroShoeImgRaw ? prepareSeamlessShoeCanvas(heroShoeImgRaw) : null;

      // Локализованные тексты внутри PDF
      const pdfT = {
        ru: {
          edition: 'WHOLESALE EDITORIAL LOOKBOOK // 2026',
          overviewTitle: 'О КОЛЛЕКЦИИ И СТАНДАРТЫ ОПТОВОЙ ЗАКУПКИ',
          manifestoLead:
            'Коллекция CARDIO 2026 создана для европейских и украинских дистрибьюторов, байеров обувных сетей и владельцев мультибрендовых магазинов.',
          manifestoBody:
            'Каждая пара проектируется и отшивается на собственном производстве в Харькове из отборной натуральной кожи, мембранных материалов Gore-Tex и износостойких подошв с выверенной анатомической колодкой.',
          tocTitle: 'СОДЕРЖАНИЕ КАТАЛОГА',
          tocAutumn: '01. КОЛЛЕКЦИЯ ОСЕНЬ 2026 (Кроссовки и туфли)',
          tocWinter: '02. КОЛЛЕКЦИЯ ЗИМА 2026 (Ботинки и зимние кроссовки)',
          tocContacts: '03. КОНТАКТЫ ОПТОВОГО ОТДЕЛА И УСЛОВИЯ ОТГРУЗКИ',
          boxStandardsTitle: 'СТАНДАРТНЫЕ КОМПЛЕКТАЦИИ КОРОБОВ (РАЗМЕРЫ 40—45)',
          box8Title: 'КОРОБ 8 ПАР — СТАНДАРТНАЯ РОСТОВКА',
          box8Formula: '40 (1)  ·  41 (1)  ·  42 (2)  ·  43 (2)  ·  44 (1)  ·  45 (1)   =   8 пар в коробе',
          box6Title: 'КОРОБ 6 ПАР — РОВНАЯ РОСТОВКА',
          box6Formula: '40 (1)  ·  41 (1)  ·  42 (1)  ·  43 (1)  ·  44 (1)  ·  45 (1)   =   6 пар в коробе',
          autumnChapter: 'ГЛАВА 01 // ОСЕННИЙ СЕЗОН',
          winterChapter: 'ГЛАВА 02 // ЗИМНИЙ СЕЗОН',
          autumnSub: 'КРОССОВКИ И ТУФЛИ  ·  РАЗМЕРЫ 40—45  ·  ОПТ $34—$39',
          winterSub: 'ЗИМНИЕ БОТИНКИ И КРОССОВКИ  ·  РАЗМЕРЫ 40—45  ·  ОПТ $41—$49',
          seasonAutumnLabel: 'AUTUMN COLLECTION 2026',
          seasonWinterLabel: 'WINTER COLLECTION 2026',
          modelLabel: 'МОДЕЛЬ / АРТИКУЛ',
          wholesalePriceLabel: 'ОПТОВАЯ ЦЕНА ЗА ПАРУ',
          colorMaterialLabel: 'ЦВЕТ И ИСПОЛНЕНИЕ',
          naturalLeather: 'НАТУРАЛЬНАЯ КОЖА',
          sizeRangeLabel: 'РАЗМЕРНЫЙ РЯД',
          fullSizeScale: 'ПОЛНОМЕРНАЯ СЕТКА',
          box6Label: 'КОРОБ 6 ПАР (РОВНАЯ)',
          box6Sub: '40–45 по 1 паре',
          box8Label: 'КОРОБ 8 ПАР (СТАНДАРТ)',
          box8Sub: '42 и 43 р. — по 2 пары',
          contactsPageTitle: 'ОТДЕЛ ОПТОВЫХ ПРОДАЖ',
          contactsPageSub: 'ПРЯМЫЕ ПОСТАВКИ ОТ ПРОИЗВОДИТЕЛЯ  ·  ХАРЬКОВ, УКРАИНА',
          managerRole: 'РУКОВОДИТЕЛЬ ОПТОВОГО НАПРАВЛЕНИЯ',
          georgiyName: 'Георгий',
          borisName: 'Борис',
          shippingNote:
            'Отгрузка заказов осуществляется со склада фабрики в Харькове (Новая Почта / паллетная доставка). Минимальный оптовый заказ — от 1 ростовки (6 или 8 пар). Доступен заказ тестового образца (1 пара).',
        },
        uk: {
          edition: 'WHOLESALE EDITORIAL LOOKBOOK // 2026',
          overviewTitle: 'ПРО КОЛЕКЦІЮ ТА СТАНДАРТИ ГУРТОВОЇ ЗАКУПІВЛІ',
          manifestoLead:
            'Колекція CARDIO 2026 створена для дистриб’юторів, байєрів взуттєвих мереж та власників мультибрендових магазинів.',
          manifestoBody:
            'Кожна пара проектується та відшивається на власному виробництві у Харкові з відбірної натуральної шкіри, мембранних матеріалів Gore-Tex та зносостійких підошов з анатомічною колодкою.',
          tocTitle: 'ЗМІСТ КАТАЛОГУ',
          tocAutumn: '01. КОЛЕКЦІЯ ОСІНЬ 2026 (Кросівки та туфлі)',
          tocWinter: '02. КОЛЕКЦІЯ ЗИМА 2026 (Черевики та зимові кросівки)',
          tocContacts: '03. КОНТАКТИ ГУРТОВОГО ВІДДІЛУ ТА УМОВИ ВІДВАНТАЖЕННЯ',
          boxStandardsTitle: 'СТАНДАРТНІ КОМПЛЕКТАЦІЇ КОРОБІВ (РОЗМІРИ 40—45)',
          box8Title: 'КОРОБ 8 ПАР — СТАНДАРТНА РОСТОВКА',
          box8Formula: '40 (1)  ·  41 (1)  ·  42 (2)  ·  43 (2)  ·  44 (1)  ·  45 (1)   =   8 пар у коробі',
          box6Title: 'КОРОБ 6 ПАР — РІВНА РОСТОВКА',
          box6Formula: '40 (1)  ·  41 (1)  ·  42 (1)  ·  43 (1)  ·  44 (1)  ·  45 (1)   =   6 пар у коробі',
          autumnChapter: 'РОЗДІЛ 01 // ОСІННІЙ СЕЗОН',
          winterChapter: 'РОЗДІЛ 02 // ЗИМОВИЙ СЕЗОН',
          autumnSub: 'КРОСІВКИ ТА ТУФЛІ  ·  РОЗМІРИ 40—45  ·  ГУРТ $34—$39',
          winterSub: 'ЗИМОВІ ЧЕРЕВИКИ ТА КРОСІВКИ  ·  РОЗМІРИ 40—45  ·  ГУРТ $41—$49',
          seasonAutumnLabel: 'AUTUMN COLLECTION 2026',
          seasonWinterLabel: 'WINTER COLLECTION 2026',
          modelLabel: 'МОДЕЛЬ / АРТИКУЛ',
          wholesalePriceLabel: 'ГУРТОВА ЦІНА ЗА ПАРУ',
          colorMaterialLabel: 'КОЛІР ТА ВИКОНАННЯ',
          naturalLeather: 'НАТУРАЛЬНА ШКІРА',
          sizeRangeLabel: 'РОЗМІРНИЙ РЯД',
          fullSizeScale: 'ПОВНОМІРНА СІТКА',
          box6Label: 'КОРОБ 6 ПАР (РІВНА)',
          box6Sub: '40–45 по 1 парі',
          box8Label: 'КОРОБ 8 ПАР (СТАНДАРТ)',
          box8Sub: '42 і 43 р. — по 2 пари',
          contactsPageTitle: 'ВІДДІЛ ГУРТОВОГО ПРОДАЖУ',
          contactsPageSub: 'ПРЯМІ ПОСТАВКИ ВІД ВИРОБНИКА  ·  ХАРКІВ, УКРАЇНА',
          managerRole: 'КЕРІВНИК ГУРТОВОГО НАПРЯМКУ',
          georgiyName: 'Георгій',
          borisName: 'Борис',
          shippingNote:
            'Відвантаження замовлень здійснюється зі складу фабрики у Харкові (Нова Пошта / палетна доставка). Мінімальне гуртове замовлення — від 1 ростовки (6 або 8 пар). Доступне замовлення тестового зразка (1 пара).',
        },
        de: {
          edition: 'WHOLESALE EDITORIAL LOOKBOOK // 2026',
          overviewTitle: 'KOLLEKTIONSÜBERSICHT & GROSSHANDELSSTANDARDS',
          manifestoLead:
            'Die CARDIO 2026 Kollektion wurde für europäische Distributoren, Schuheinkäufer und Inhaber von Fachgeschäften entwickelt.',
          manifestoBody:
            'Jedes Paar wird in unserer eigenen Manufaktur in Charkiw aus hochwertigem Naturleder, Gore-Tex-Membranen und langlebigen Profilsohlen mit anatomischer Passform gefertigt.',
          tocTitle: 'INHALTSVERZEICHNIS',
          tocAutumn: '01. HERBSTKOLLEKTION 2026 (Sneaker & Halbschuhe)',
          tocWinter: '02. WINTERKOLLEKTION 2026 (Stiefel & Wintersneaker)',
          tocContacts: '03. GROSSHANDELSKONTAKT & LIEFERBEDINGUNGEN',
          boxStandardsTitle: 'STANDARD-SORTIMENTE PRO KISTE (GRÖSSEN 40—45)',
          box8Title: 'KISTE 8 PAAR — STANDARDSERIE',
          box8Formula: '40 (1)  ·  41 (1)  ·  42 (2)  ·  43 (2)  ·  44 (1)  ·  45 (1)   =   8 Paar pro Kiste',
          box6Title: 'KISTE 6 PAAR — GLEICHE SERIE',
          box6Formula: '40 (1)  ·  41 (1)  ·  42 (1)  ·  43 (1)  ·  44 (1)  ·  45 (1)   =   6 Paar pro Kiste',
          autumnChapter: 'KAPITEL 01 // HERBSTSAISON',
          winterChapter: 'KAPITEL 02 // WINTERSAISON',
          autumnSub: 'SNEAKER & HALBSCHUHE  ·  GRÖSSEN 40—45  ·  B2B $34—$39',
          winterSub: 'WINTERSTIEFEL & SNEAKER  ·  GRÖSSEN 40—45  ·  B2B $41—$49',
          seasonAutumnLabel: 'AUTUMN COLLECTION 2026',
          seasonWinterLabel: 'WINTER COLLECTION 2026',
          modelLabel: 'MODELL / ARTIKEL-NR.',
          wholesalePriceLabel: 'GROSSHANDELSPREIS PRO PAAR',
          colorMaterialLabel: 'FARBE & AUSFÜHRUNG',
          naturalLeather: 'ECHTLEDER',
          sizeRangeLabel: 'GRÖSSENLAUF',
          fullSizeScale: 'EUROPÄISCHE PASSFORM',
          box6Label: 'KISTE 6 PAAR (GLEICH)',
          box6Sub: 'Gr. 40–45 je 1 Paar',
          box8Label: 'KISTE 8 PAAR (STANDARD)',
          box8Sub: 'Gr. 42 & 43 je 2 Paar',
          contactsPageTitle: 'GROSSHANDELSABTEILUNG',
          contactsPageSub: 'DIREKTVERTRIEB AB WERK  ·  CHARKIW, UKRAINE',
          managerRole: 'VERKAUFSLEITUNG B2B',
          georgiyName: 'Georgiy',
          borisName: 'Boris',
          shippingNote:
            'Der Versand erfolgt direkt ab Werk Charkiw. Mindestbestellmenge im Großhandel: ab 1 Kiste (6 oder 8 Paar). Einzelne Testmuster (1 Paar) sind ebenfalls bestellbar.',
        },
      }[lang];

      // Помощник переноса длинных абзацев по словам
      const drawWrappedText = (
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number
      ): number => {
        const words = text.split(' ');
        let line = '';
        let curY = y;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, curY);
            line = words[n] + ' ';
            curY += lineHeight;
          } else {
            line = testLine;
          }
        }
        if (line.trim()) {
          ctx.fillText(line.trim(), x, curY);
          curY += lineHeight;
        }
        return curY;
      };

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        setPdfProgressText(`${pageIdx + 1}/${totalPages}`);
        const pageDesc = pagePlan[pageIdx];
        const pageNumStr = `${String(pageIdx + 1).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`;

        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        // =====================================================================
        // ПОЛОСА 1: ОБЛОЖКА (COVER PAGE)
        // =====================================================================
        if (pageDesc.type === 'cover') {
          ctx.fillStyle = PAPER;
          ctx.fillRect(0, 0, W, H);

          // Верхняя архитектурная строка
          ctx.fillStyle = GRAPHITE;
          ctx.font = '600 13px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('CARDIO FOOTWEAR // MANUFACTURING EST.', PAD, 76);

          ctx.fillStyle = GREY;
          ctx.textAlign = 'right';
          ctx.fillText(`KHARKIV  ·  ${tgUser.partnerCode}`, W - PAD, 76);

          ctx.strokeStyle = GRAPHITE;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(PAD, 98);
          ctx.lineTo(W - PAD, 98);
          ctx.stroke();

          // Монументальная швейцарская типографика заголовка
          ctx.fillStyle = GRAPHITE;
          ctx.font = '400 132px "Playfair Display", Georgia, serif';
          ctx.textAlign = 'left';
          ctx.fillText('CARDIO', PAD - 4, 248);

          ctx.fillStyle = GREY;
          ctx.font = '600 28px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.fillText('F O O T W E A R', PAD + 4, 298);

          if (logoImg) {
            const lH = 68;
            const lW = (logoImg.width / Math.max(1, logoImg.height)) * lH;
            ctx.drawImage(logoImg, W - PAD - lW, 146, lW, lH);
          }

          ctx.strokeStyle = RULE;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD, 338);
          ctx.lineTo(W - PAD, 338);
          ctx.stroke();

          // Центральный подиум обложки с крупным силуэтом обуви (занимает ~55% высоты)
          if (heroShoeCropped) {
            const availW = CONTENT_W - 40;
            const availH = 820;
            const scale = Math.min(
              availW / Math.max(1, heroShoeCropped.width),
              availH / Math.max(1, heroShoeCropped.height)
            );
            const drawW = heroShoeCropped.width * scale;
            const drawH = heroShoeCropped.height * scale;
            const drawX = PAD + (CONTENT_W - drawW) / 2;
            const drawY = 390 + (availH - drawH) / 2;

            // Мягкая контактная студийная тень под обувью
            ctx.save();
            ctx.translate(W / 2, drawY + drawH - 12);
            ctx.scale(1, 0.08);
            const grad = ctx.createRadialGradient(0, 0, 20, 0, 0, drawW * 0.46);
            grad.addColorStop(0, 'rgba(23, 23, 23, 0.22)');
            grad.addColorStop(0.6, 'rgba(23, 23, 23, 0.08)');
            grad.addColorStop(1, 'rgba(23, 23, 23, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, drawW * 0.46, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.drawImage(heroShoeCropped, drawX, drawY, drawW, drawH);
          }

          // Нижний титульный блок обложки
          const bottomBlockY = 1360;
          ctx.strokeStyle = GRAPHITE;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(PAD, bottomBlockY);
          ctx.lineTo(W - PAD, bottomBlockY);
          ctx.stroke();

          ctx.fillStyle = METALLIC;
          ctx.font = '600 15px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('AUTUMN & WINTER SEASONS  ·  SIZES 40—45', PAD, bottomBlockY + 46);

          ctx.fillStyle = GRAPHITE;
          ctx.font = '400 54px "Playfair Display", Georgia, serif';
          ctx.fillText('WHOLESALE COLLECTION 2026', PAD, bottomBlockY + 118);

          ctx.strokeStyle = RULE;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD, bottomBlockY + 165);
          ctx.lineTo(W - PAD, bottomBlockY + 165);
          ctx.stroke();

          ctx.fillStyle = GREY;
          ctx.font = '500 14px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('B2B PARTNER CATALOG  ·  FACTORY DIRECT PRICING', PAD, H - 78);

          ctx.textAlign = 'right';
          ctx.fillText(pageNumStr, W - PAD, H - 78);
        }

        // =====================================================================
        // ПОЛОСА 2: О КОЛЛЕКЦИИ, ОГЛАВЛЕНИЕ И СТАНДАРТЫ КОРОБОВ
        // =====================================================================
        else if (pageDesc.type === 'manifesto') {
          ctx.fillStyle = PAPER;
          ctx.fillRect(0, 0, W, H);

          // Верхний колонтитул
          ctx.fillStyle = GRAPHITE;
          ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('CARDIO FOOTWEAR', PAD, 76);

          ctx.fillStyle = GREY;
          ctx.textAlign = 'center';
          ctx.fillText(pdfT.edition, W / 2, 76);

          ctx.textAlign = 'right';
          ctx.fillText(pageNumStr, W - PAD, 76);

          ctx.strokeStyle = GRAPHITE;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(PAD, 98);
          ctx.lineTo(W - PAD, 98);
          ctx.stroke();

          // Заголовок манифеста
          ctx.fillStyle = METALLIC;
          ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('01 // EDITORIAL INTRODUCTION', PAD, 170);

          ctx.fillStyle = GRAPHITE;
          ctx.font = '400 44px "Playfair Display", Georgia, serif';
          ctx.fillText(pdfT.overviewTitle, PAD, 232);

          // Текст о коллекции
          ctx.fillStyle = GRAPHITE;
          ctx.font = '400 26px "Playfair Display", Georgia, serif';
          const nextY = drawWrappedText(ctx, pdfT.manifestoLead, PAD, 315, CONTENT_W, 40);

          ctx.fillStyle = GREY;
          ctx.font = '400 20px "Inter", "Helvetica Neue", Arial, sans-serif';
          drawWrappedText(ctx, pdfT.manifestoBody, PAD, nextY + 24, CONTENT_W, 32);

          // Секция Оглавления
          const tocY = 580;
          ctx.strokeStyle = RULE;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD, tocY);
          ctx.lineTo(W - PAD, tocY);
          ctx.stroke();

          ctx.fillStyle = METALLIC;
          ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.fillText(`02 // ${pdfT.tocTitle}`, PAD, tocY + 52);

          const tocRows = [
            { title: pdfT.tocAutumn, meta: `${autumnItems.length} MODELS  ·  $34—$39` },
            { title: pdfT.tocWinter, meta: `${winterItems.length} MODELS  ·  $41—$49` },
            { title: pdfT.tocContacts, meta: 'KHARKIV B2B' },
          ];

          tocRows.forEach((row, idx) => {
            const rY = tocY + 125 + idx * 86;
            ctx.fillStyle = GRAPHITE;
            ctx.font = '400 26px "Playfair Display", Georgia, serif';
            ctx.textAlign = 'left';
            ctx.fillText(row.title, PAD, rY);

            ctx.fillStyle = GREY;
            ctx.font = '600 16px "Inter", "Helvetica Neue", Arial, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(row.meta, W - PAD, rY);

            ctx.strokeStyle = RULE;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(PAD, rY + 28);
            ctx.lineTo(W - PAD, rY + 28);
            ctx.stroke();
          });

          // Секция Стандартов комплектации коробов (6 и 8 пар)
          const boxSecY = 1040;
          ctx.fillStyle = METALLIC;
          ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`03 // ${pdfT.boxStandardsTitle}`, PAD, boxSecY);

          // Блок 8 пар
          ctx.strokeStyle = GRAPHITE;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(PAD, boxSecY + 36, CONTENT_W, 175);

          ctx.fillStyle = GRAPHITE;
          ctx.font = '700 20px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.fillText(pdfT.box8Title, PAD + 32, boxSecY + 92);

          ctx.fillStyle = GREY;
          ctx.font = '400 22px "Playfair Display", Georgia, serif';
          ctx.fillText(pdfT.box8Formula, PAD + 32, boxSecY + 150);

          // Блок 6 пар
          ctx.strokeStyle = RULE;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(PAD, boxSecY + 240, CONTENT_W, 175);

          ctx.fillStyle = GRAPHITE;
          ctx.font = '700 20px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.fillText(pdfT.box6Title, PAD + 32, boxSecY + 296);

          ctx.fillStyle = GREY;
          ctx.font = '400 22px "Playfair Display", Georgia, serif';
          ctx.fillText(pdfT.box6Formula, PAD + 32, boxSecY + 354);

          // Нижний колонтитул
          ctx.strokeStyle = RULE;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD, H - 115);
          ctx.lineTo(W - PAD, H - 115);
          ctx.stroke();

          ctx.fillStyle = GREY;
          ctx.font = '500 14px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('CARDIO FOOTWEAR  ·  WHOLESALE COLLECTION 2026', PAD, H - 76);

          ctx.textAlign = 'right';
          ctx.fillText(`+38 (067) 719-37-16 (${pdfT.georgiyName})   ·   +38 (097) 454-15-11 (${pdfT.borisName})`, W - PAD, H - 76);
        }

        // =====================================================================
        // ШМУЦТИТУЛЫ СЕЗОНОВ (SECTION DIVIDERS — AUTUMN / WINTER)
        // =====================================================================
        else if (pageDesc.type === 'divider') {
          ctx.fillStyle = GRAPHITE;
          ctx.fillRect(0, 0, W, H);

          ctx.fillStyle = GREY;
          ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('CARDIO FOOTWEAR // WHOLESALE 2026', PAD, 76);

          ctx.textAlign = 'right';
          ctx.fillText(pageNumStr, W - PAD, 76);

          ctx.strokeStyle = '#333330';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD, 98);
          ctx.lineTo(W - PAD, 98);
          ctx.stroke();

          const isAutumn = pageDesc.season === 'autumn';
          ctx.fillStyle = METALLIC;
          ctx.font = '600 16px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(isAutumn ? pdfT.autumnChapter : pdfT.winterChapter, PAD, H / 2 - 120);

          ctx.fillStyle = PAPER;
          ctx.font = '400 112px "Playfair Display", Georgia, serif';
          ctx.fillText(isAutumn ? 'AUTUMN' : 'WINTER', PAD - 4, H / 2);

          ctx.fillStyle = METALLIC;
          ctx.font = '400 42px "Playfair Display", Georgia, serif';
          ctx.fillText('COLLECTION 2026', PAD, H / 2 + 68);

          ctx.strokeStyle = METALLIC;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(PAD, H / 2 + 120);
          ctx.lineTo(PAD + 260, H / 2 + 120);
          ctx.stroke();

          ctx.fillStyle = GREY;
          ctx.font = '600 16px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.fillText(isAutumn ? pdfT.autumnSub : pdfT.winterSub, PAD, H / 2 + 170);

          ctx.fillStyle = GREY;
          ctx.font = '500 14px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`${pageDesc.count} MODELS IN SECTION`, PAD, H - 78);

          ctx.textAlign = 'right';
          ctx.fillText('SIZES 40—45', W - PAD, H - 78);
        }

        // =====================================================================
        // ТОВАРНАЯ ПОЛОСА (1 МОДЕЛЬ И 1 ЦВЕТ = 1 ПОЛНАЯ СТРАНИЦА А4)
        // =====================================================================
        else if (pageDesc.type === 'product') {
          const { shoe, priceUsd, season } = pageDesc.item;
          const catUpper = getLocalizedCategory(shoe.category, lang).toUpperCase();
          const colorUpper = getLocalizedColor(shoe.color, lang).toUpperCase();
          const featuresUpper = shoe.features.map((f) => getLocalizedFeature(f, lang).toUpperCase());

          // 1. Чистый теплый молочно-белый лист #F5F3EE
          ctx.fillStyle = PAPER;
          ctx.fillRect(0, 0, W, H);

          // 2. ВЕРХНЯЯ ЗОНА (Логотип CARDIO, Сезон и коллекция, Категория обуви, Номер страницы)
          if (logoImg) {
            const lH = 30;
            const lW = (logoImg.width / Math.max(1, logoImg.height)) * lH;
            ctx.drawImage(logoImg, PAD, 54, lW, lH);
          }

          ctx.fillStyle = GRAPHITE;
          ctx.font = '700 15px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('CARDIO', logoImg ? PAD + 52 : PAD, 75);

          ctx.fillStyle = GREY;
          ctx.font = '600 13px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            season === 'autumn' ? pdfT.seasonAutumnLabel : pdfT.seasonWinterLabel,
            W / 2,
            75
          );

          ctx.fillStyle = GRAPHITE;
          ctx.font = '600 13px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`${catUpper}     ·     ${pageNumStr}`, W - PAD, 75);

          ctx.strokeStyle = RULE;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD, 104);
          ctx.lineTo(W - PAD, 104);
          ctx.stroke();

          // 3. ЦЕНТРАЛЬНАЯ ЗОНА (Крупная фотография обуви — 62% площади страницы, максимум воздуха)
          // Деликатный архитектурный индекс на фоне в верхнем левом углу студийной зоны
          ctx.fillStyle = '#EAE6DF';
          ctx.font = '400 180px "Playfair Display", Georgia, serif';
          ctx.textAlign = 'left';
          ctx.fillText(`№${shoe.modelNumber}`, PAD - 6, 285);

          const rawShoeImg = await loadImageElement(shoe.image);
          if (rawShoeImg) {
            const seamlessCanvas = prepareSeamlessShoeCanvas(rawShoeImg);
            const stageTop = 150;
            const stageHeight = 1060; // 60.5% от общей высоты листа А4!
            const maxShoeW = CONTENT_W - 20; // До 1052px в ширину
            const maxShoeH = 880;

            const scale = Math.min(
              maxShoeW / Math.max(1, seamlessCanvas.width),
              maxShoeH / Math.max(1, seamlessCanvas.height)
            );
            const drawW = seamlessCanvas.width * scale;
            const drawH = seamlessCanvas.height * scale;
            const drawX = PAD + (CONTENT_W - drawW) / 2;
            const drawY = stageTop + (stageHeight - drawH) / 2;

            // Мягкая студийная опорная тень под подошвой
            ctx.save();
            ctx.translate(W / 2, drawY + drawH - 8);
            ctx.scale(1, 0.075);
            const shadowGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, drawW * 0.45);
            shadowGrad.addColorStop(0, 'rgba(23, 23, 23, 0.20)');
            shadowGrad.addColorStop(0.65, 'rgba(23, 23, 23, 0.06)');
            shadowGrad.addColorStop(1, 'rgba(23, 23, 23, 0)');
            ctx.fillStyle = shadowGrad;
            ctx.beginPath();
            ctx.arc(0, 0, drawW * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.drawImage(seamlessCanvas, drawX, drawY, drawW, drawH);
          }

          // 4. НИЖНЯЯ ЗОНА (Типографическая спецификация и коммерческий блок)
          const specTopY = 1270;

          // Главная графитовая линия отделения студийной зоны
          ctx.strokeStyle = GRAPHITE;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(PAD, specTopY);
          ctx.lineTo(W - PAD, specTopY);
          ctx.stroke();

          // ЯРУС 1: Крупный номер модели слева + Оптовая цена за пару справа
          ctx.fillStyle = GREY;
          ctx.font = '600 13px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(pdfT.modelLabel, PAD, specTopY + 38);

          ctx.textAlign = 'right';
          ctx.fillText(pdfT.wholesalePriceLabel, W - PAD, specTopY + 38);

          const variantTitle = shoe.variant ? `  ·  ${shoe.variant}` : '';
          ctx.fillStyle = GRAPHITE;
          ctx.font = '400 68px "Playfair Display", Georgia, serif';
          ctx.textAlign = 'left';
          ctx.fillText(`№ ${shoe.modelNumber}${variantTitle}`, PAD, specTopY + 114);

          ctx.fillStyle = GRAPHITE;
          ctx.font = '400 68px "Playfair Display", Georgia, serif';
          ctx.textAlign = 'right';
          ctx.fillText(`$${priceUsd}`, W - PAD, specTopY + 114);

          // Тонкая разделительная линия перед коммерческой матрицей
          const matrixTopY = specTopY + 150;
          ctx.strokeStyle = RULE;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD, matrixTopY);
          ctx.lineTo(W - PAD, matrixTopY);
          ctx.stroke();

          // ЯРУС 2: 4 колонки (Цвет и характеристики | Размерный ряд | Короб 6 пар | Короб 8 пар)
          const col1X = PAD;
          const col2X = PAD + 340;
          const col3X = PAD + 565;
          const col4X = PAD + 825;
          const matrixBottomY = matrixTopY + 168;

          // Вертикальные тонкие швейцарские линии между колонками
          [col2X - 24, col3X - 24, col4X - 24].forEach((divX) => {
            ctx.strokeStyle = RULE;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(divX, matrixTopY + 22);
            ctx.lineTo(divX, matrixBottomY - 22);
            ctx.stroke();
          });

          // Колонка 1: Цвет и материалы
          ctx.textAlign = 'left';
          ctx.fillStyle = GREY;
          ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.fillText(pdfT.colorMaterialLabel, col1X, matrixTopY + 42);

          ctx.fillStyle = GRAPHITE;
          ctx.font = '700 24px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.fillText(colorUpper, col1X, matrixTopY + 86);

          ctx.fillStyle = GREY;
          ctx.font = '500 14px "Inter", "Helvetica Neue", Arial, sans-serif';
          const featLine =
            featuresUpper.length > 0 ? featuresUpper.join('  ·  ') : pdfT.naturalLeather;
          ctx.fillText(featLine.slice(0, 32), col1X, matrixTopY + 122);

          // Колонка 2: Размерный ряд
          ctx.fillStyle = GREY;
          ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.fillText(pdfT.sizeRangeLabel, col2X, matrixTopY + 42);

          ctx.fillStyle = GRAPHITE;
          ctx.font = '700 26px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.fillText('40 — 45', col2X, matrixTopY + 86);

          ctx.fillStyle = GREY;
          ctx.font = '500 14px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.fillText(pdfT.fullSizeScale, col2X, matrixTopY + 122);

          // Колонка 3: Стоимость коробки на 6 пар
          ctx.fillStyle = GREY;
          ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.fillText(pdfT.box6Label, col3X, matrixTopY + 42);

          ctx.fillStyle = GRAPHITE;
          ctx.font = '700 34px "Playfair Display", Georgia, serif';
          ctx.fillText(`$${priceUsd * 6}`, col3X, matrixTopY + 90);

          ctx.fillStyle = GREY;
          ctx.font = '500 14px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.fillText(pdfT.box6Sub, col3X, matrixTopY + 122);

          // Колонка 4: Стоимость коробки на 8 пар
          ctx.fillStyle = GREY;
          ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.fillText(pdfT.box8Label, col4X, matrixTopY + 42);

          ctx.fillStyle = GRAPHITE;
          ctx.font = '700 34px "Playfair Display", Georgia, serif';
          ctx.fillText(`$${priceUsd * 8}`, col4X, matrixTopY + 90);

          ctx.fillStyle = GREY;
          ctx.font = '500 14px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.fillText(pdfT.box8Sub, col4X, matrixTopY + 122);

          // Нижняя линия и чистый колонтитул без наложений
          ctx.strokeStyle = RULE;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD, matrixBottomY);
          ctx.lineTo(W - PAD, matrixBottomY);
          ctx.stroke();

          ctx.fillStyle = GREY;
          ctx.font = '500 13px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(
            `CARDIO FOOTWEAR  ·  WHOLESALE 2026  ·  ${tgUser.partnerCode}`,
            PAD,
            H - 72
          );

          ctx.textAlign = 'right';
          ctx.fillText(
            `+38 (067) 719-37-16 (${pdfT.georgiyName})   ·   +38 (097) 454-15-11 (${pdfT.borisName})`,
            W - PAD,
            H - 72
          );
        }

        // =====================================================================
        // ФИНАЛЬНАЯ ПОЛОСА: КОНТАКТЫ ОПТОВОГО ОТДЕЛА
        // =====================================================================
        else if (pageDesc.type === 'contacts') {
          ctx.fillStyle = PAPER;
          ctx.fillRect(0, 0, W, H);

          ctx.fillStyle = GRAPHITE;
          ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('CARDIO FOOTWEAR', PAD, 76);

          ctx.fillStyle = GREY;
          ctx.textAlign = 'right';
          ctx.fillText(pageNumStr, W - PAD, 76);

          ctx.strokeStyle = GRAPHITE;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(PAD, 98);
          ctx.lineTo(W - PAD, 98);
          ctx.stroke();

          if (logoImg) {
            const lH = 60;
            const lW = (logoImg.width / Math.max(1, logoImg.height)) * lH;
            ctx.drawImage(logoImg, PAD, 180, lW, lH);
          }

          ctx.fillStyle = METALLIC;
          ctx.font = '600 15px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(pdfT.contactsPageSub, PAD, 310);

          ctx.fillStyle = GRAPHITE;
          ctx.font = '400 58px "Playfair Display", Georgia, serif';
          ctx.fillText(pdfT.contactsPageTitle, PAD, 385);

          ctx.strokeStyle = RULE;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD, 440);
          ctx.lineTo(W - PAD, 440);
          ctx.stroke();

          // Карточки руководителей отдела оптовых продаж (Георгий и Борис)
          const contactsList = [
            { name: pdfT.georgiyName, phone: '+38 (067) 719-37-16' },
            { name: pdfT.borisName, phone: '+38 (097) 454-15-11' },
          ];

          contactsList.forEach((c, idx) => {
            const cY = 510 + idx * 250;
            ctx.strokeStyle = GRAPHITE;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(PAD, cY, CONTENT_W, 200);

            ctx.fillStyle = GREY;
            ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(pdfT.managerRole, PAD + 40, cY + 56);

            ctx.fillStyle = GRAPHITE;
            ctx.font = '400 40px "Playfair Display", Georgia, serif';
            ctx.fillText(c.name, PAD + 40, cY + 115);

            ctx.fillStyle = GRAPHITE;
            ctx.font = '700 30px "Inter", "Helvetica Neue", Arial, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(c.phone, W - PAD - 40, cY + 112);
          });

          // Условия отгрузки
          ctx.fillStyle = GREY;
          ctx.font = '400 20px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'left';
          drawWrappedText(ctx, pdfT.shippingNote, PAD, 1080, CONTENT_W, 34);

          ctx.strokeStyle = GRAPHITE;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(PAD, H - 140);
          ctx.lineTo(W - PAD, H - 140);
          ctx.stroke();

          ctx.fillStyle = GRAPHITE;
          ctx.font = '400 28px "Playfair Display", Georgia, serif';
          ctx.textAlign = 'left';
          ctx.fillText('CARDIO FOOTWEAR  ·  2026', PAD, H - 82);

          ctx.fillStyle = GREY;
          ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText('KHARKIV, UKRAINE', W - PAD, H - 82);
        }

        // Из-за чистой палитры #F5F3EE без шума каждый лист при качестве 0.82 весит всего ~55 КБ
        jpegPages.push(canvas.toDataURL('image/jpeg', 0.82));
      }

      const pdfBytes = buildPdfBytesFromJpegPages(jpegPages, W, H);
      const localBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfBase64 = uint8ArrayToBase64(pdfBytes);
      const fileName = `CARDIO_LOOKBOOK_2026_${lang.toUpperCase()}.pdf`;

      let deliveredViaServer = false;
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_pdf',
            pdfBase64,
            fileName,
            chatId: tgUser.id,
            caption: `📘 CARDIO FOOTWEAR — WHOLESALE COLLECTION 2026 (${totalPages} стр. А4)\n🔒 ${t.securityNote}`,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.downloadPath) {
            deliveredViaServer = true;
            setDeliveryStatus({
              sentToTelegram: Boolean(data.sentToTelegram),
              downloadUrl: data.downloadPath,
              localBlob,
              fileName,
            });
            if (!data.sentToTelegram) {
              await triggerDownload({
                downloadUrl: data.downloadPath,
                localBlob,
                fileName,
              });
            }
          }
        }
      } catch {}

      if (!deliveredViaServer) {
        setDeliveryStatus({
          sentToTelegram: false,
          localBlob,
          fileName,
        });
        await triggerDownload({ localBlob, fileName });
      }
    } finally {
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
  // РЕЖИМ А: ОТКРЫТА НАКЛАДНАЯ ВНУТРИ ПРАЙС-КАТАЛОГА
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
  // РЕЖИМ Б: КАРТОЧКА ЗАКАЗА МОДЕЛИ ВНУТРИ ПРАЙС-КАТАЛОГА
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
              № {selectedShoeInPrice.modelNumber}
              {selectedShoeInPrice.variant && (
                <span style={{ fontSize: '18px', color: THEME.inkMuted, fontStyle: 'italic', marginLeft: '6px' }}>
                  ({selectedShoeInPrice.variant})
                </span>
              )}
            </h1>
            <div style={{ fontFamily: THEME.serif, fontStyle: 'italic', fontSize: '15px', color: THEME.inkMuted }}>
              {t.colorLabel}: {translatedSelectedColor}
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
              fontSize: '9.5px',
              letterSpacing: '1.2px',
              color: THEME.inkMuted,
              textTransform: 'uppercase',
            }}
          >
            <span>{t.box6}: <strong style={{ color: THEME.ink }}>${unitPriceUsd * 6}</strong></span>
            <span>{t.box8}: <strong style={{ color: THEME.ink }}>${unitPriceUsd * 8}</strong></span>
          </div>

          <div
            style={{
              width: '100%',
              height: '240px',
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
  // РЕЖИМ В: ГЛАВНЫЙ ЭКРАН ПРАЙС-КАТАЛОГА
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
                letterSpacing: '1.1px',
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
                  onClick={() => triggerDownload(deliveryStatus)}
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
                      <span style={{ fontSize: '8px', letterSpacing: '0.6px', textTransform: 'uppercase', color: THEME.inkMuted }}>
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
