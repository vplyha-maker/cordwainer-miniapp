import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  cardioCatalog,
  getLocalizedCategory,
  getLocalizedColor,
  getLocalizedFeature,
  type ShoeItem,
} from '../data/catalog';
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

function getTelegramUserInfo(): { id?: number; label: string } {
  try {
    const u = getTgWebApp()?.initDataUnsafe?.user;
    if (u?.id) {
      const namePart = u.username ? `@${u.username}` : u.first_name || '';
      return {
        id: u.id,
        label: `PARTNER ID: ${u.id}${namePart ? ` (${namePart})` : ''}`,
      };
    }
  } catch {}
  return { label: 'CONFIDENTIAL B2B PARTNER EDITION' };
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

export function WholesalePriceBanner({ lang = 'ru', isDark = false, onSelectShoe, onHaptic }: BannerProps) {
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
      sub: isUnlocked ? 'B2B SHOWROOM // 38 МОДЕЛЕЙ С ЦЕНАМИ' : 'B2B SHOWROOM // ДОСТУП ПО PIN',
      title: 'Оптовый прайс-лукбук 2026 (PDF)',
      btn: isUnlocked ? 'Открыть прайс →' : 'Открыть PDF →',
    },
    uk: {
      sub: isUnlocked ? 'B2B SHOWROOM // 38 МОДЕЛЕЙ З ЦІНАМИ' : 'B2B SHOWROOM // ДОСТУП ЗА PIN',
      title: 'Гуртовий прайс-лукбук 2026 (PDF)',
      btn: isUnlocked ? 'Відкрити прайс →' : 'Відкрити PDF →',
    },
    de: {
      sub: isUnlocked ? 'B2B SHOWROOM // 38 MODELLE MIT PREISEN' : 'B2B SHOWROOM // PIN-ZUGANG',
      title: 'Großhandel Preiskatalog 2026 (PDF)',
      btn: isUnlocked ? 'Preise öffnen →' : 'PDF öffnen →',
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
            onClose={() => setIsModalOpen(false)}
            onSelectShoe={(shoe) => {
              setIsModalOpen(false);
              onSelectShoe?.(shoe);
            }}
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
          padding: '12px 14px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '8.5px',
              letterSpacing: '1.4px',
              textTransform: 'uppercase',
              color: muted,
              fontWeight: 600,
              marginBottom: '3px',
            }}
          >
            {labels.sub}
          </div>
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: '16px',
              color: ink,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {labels.title}
          </div>
        </div>

        <button
          type="button"
          style={{
            backgroundColor: ink,
            color: onInk,
            border: 'none',
            padding: '9px 12px',
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            cursor: 'pointer',
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
  onSelectShoe?: (shoe: ShoeItem) => void;
};

function WholesalePriceCatalogModal({
  lang,
  isDark,
  isUnlocked,
  onUnlockSuccess,
  onClose,
  onSelectShoe,
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
    pages: string[];
  } | null>(null);

  const tgUser = useMemo(() => getTelegramUserInfo(), []);

  // Все 38 позиций из cardioCatalog (каждый цвет и вариант #1, #2, #3 отдельно)
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

  const THEME = isDark
    ? {
        bg: '#0A0A0A',
        surface: '#141416',
        surfaceActive: '#222226',
        imageStage: '#E6E1D8',
        ink: '#F4EFE6',
        inkMuted: '#A1A1AA',
        inkLight: '#71717A',
        onInk: '#121214',
        border: '#2C2C30',
        accentGreen: '#2E7D32',
      }
    : {
        bg: '#F2EFE9',
        surface: '#F8F6F1',
        surfaceActive: '#EAE5DC',
        imageStage: '#F8F6F1',
        ink: '#161514',
        inkMuted: '#6E6A63',
        inkLight: '#9A958C',
        onInk: '#FFFFFF',
        border: '#DCD7CC',
        accentGreen: '#1E4620',
      };

  const t = {
    ru: {
      back: '← В каталог',
      pinTag: 'CARDIO B2B // ЗАКРЫТЫЙ РАЗДЕЛ',
      pinTitle: 'Оптовый прайс-лукбук 2026',
      pinSub: 'Оптовые цены предназначены исключительно для партнеров фабрики и владельцев магазинов. Введите 4-значный PIN-код:',
      pinUnlockBtn: 'Открыть прайс-каталог →',
      pinErrorText: 'Неверный PIN-код. Запросите код у руководителя отдела продаж ниже.',
      askPinTitle: 'Получить PIN-код у руководителя отдела продаж:',
      askBoris: 'Борис • +38 (097) 454-15-11',
      askGeorgiy: 'Георгий • +38 (067) 719-37-16',
      lookbookTag: 'CARDIO FOOTWEAR // WHOLESALE LOOKBOOK 2026',
      mainTitle: 'Оптовый прайс-каталог',
      downloadBtn: '⬇ Получить PDF-каталог (все 38 цветов)',
      downloadBtnTop: '⬇ Скачать PDF',
      generatingPdf: 'Верстка PDF',
      sentToTgBanner: '✓ Защищенный PDF-каталог отправлен вам в чат Telegram от @Cordwainer_bot!',
      downloadDirectBtn: '📥 Скачать файл PDF в память телефона →',
      tabAll: `Все (${allCatalogItems.length})`,
      tabAutumn: `Осень (${autumnCount})`,
      tabWinter: `Зима (${winterCount})`,
      box6: 'Короб 6 пар',
      box8: 'Короб 8 пар',
      orderBtn: 'Выбрать ростовку →',
      footerSub: 'ОТДЕЛ ОПТОВЫХ ПРОДАЖ // CARDIO ХАРЬКОВ',
      georgiyName: 'Георгий',
      borisName: 'Борис',
      securityNote: 'Конфиденциальный B2B-документ. Защищен от пересылки третьим лицам.',
    },
    uk: {
      back: '← У каталог',
      pinTag: 'CARDIO B2B // ЗАКРИТИЙ РОЗДІЛ',
      pinTitle: 'Гуртовий прайс-лукбук 2026',
      pinSub: 'Гуртові ціни призначені виключно для партнерів фабрики та власників магазинів. Введіть 4-значний PIN-код:',
      pinUnlockBtn: 'Відкрити прайс-каталог →',
      pinErrorText: 'Невірний PIN-код. Запитайте код у керівника відділу продажу нижче.',
      askPinTitle: 'Отримати PIN-код у керівника відділу продажу:',
      askBoris: 'Борис • +38 (097) 454-15-11',
      askGeorgiy: 'Георгій • +38 (067) 719-37-16',
      lookbookTag: 'CARDIO FOOTWEAR // WHOLESALE LOOKBOOK 2026',
      mainTitle: 'Гуртовий прайс-каталог',
      downloadBtn: '⬇ Отримати PDF-каталог (всі 38 кольорів)',
      downloadBtnTop: '⬇ Завантажити PDF',
      generatingPdf: 'Верстка PDF',
      sentToTgBanner: '✓ Захищений PDF-каталог надіслано вам у чат Telegram від @Cordwainer_bot!',
      downloadDirectBtn: '📥 Завантажити файл PDF у пам’ять телефону →',
      tabAll: `Всі (${allCatalogItems.length})`,
      tabAutumn: `Осінь (${autumnCount})`,
      tabWinter: `Зима (${winterCount})`,
      box6: 'Короб 6 пар',
      box8: 'Короб 8 пар',
      orderBtn: 'Вибрати ростовку →',
      footerSub: 'ВІДДІЛ ГУРТОВОГО ПРОДАЖУ // CARDIO ХАРКІВ',
      georgiyName: 'Георгій',
      borisName: 'Борис',
      securityNote: 'Конфіденційний B2B-документ. Захищено від пересилання третім особам.',
    },
    de: {
      back: '← Zum Katalog',
      pinTag: 'CARDIO B2B // EXKLUSIVER BEREICH',
      pinTitle: 'Großhandel Lookbook 2026',
      pinSub: 'Die Großhandelspreise sind ausschließlich für autorisierte Partner bestimmt. Bitte 4-stelligen PIN eingeben:',
      pinUnlockBtn: 'Preiskatalog öffnen →',
      pinErrorText: 'Ungültiger PIN-Code. Bitte beim Verkaufsleiter anfordern.',
      askPinTitle: 'PIN-Code beim Verkaufsleiter anfordern:',
      askBoris: 'Boris • +38 (097) 454-15-11',
      askGeorgiy: 'Georgiy • +38 (067) 719-37-16',
      lookbookTag: 'CARDIO FOOTWEAR // WHOLESALE LOOKBOOK 2026',
      mainTitle: 'B2B Preiskatalog 2026',
      downloadBtn: '⬇ PDF-Lookbook erhalten (Alle 38 Farben)',
      downloadBtnTop: '⬇ PDF laden',
      generatingPdf: 'PDF Layout',
      sentToTgBanner: '✓ Geschützter PDF-Katalog wurde in Ihren Telegram-Chat gesendet!',
      downloadDirectBtn: '📥 PDF-Datei auf Smartphone speichern →',
      tabAll: `Alle (${allCatalogItems.length})`,
      tabAutumn: `Herbst (${autumnCount})`,
      tabWinter: `Winter (${winterCount})`,
      box6: 'Kiste 6 P.',
      box8: 'Kiste 8 P.',
      orderBtn: 'Serie wählen →',
      footerSub: 'GROSSHANDELSABTEILUNG // CARDIO CHARKIW',
      georgiyName: 'Georgiy',
      borisName: 'Boris',
      securityNote: 'Vertrauliches B2B-Dokument. Weiterleitung an Dritte untersagt.',
    },
  }[lang];

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

  const handleGenerateAndDeliverPdf = async () => {
    if (pdfGenerating) return;
    setPdfGenerating(true);
    setDeliveryStatus(null);

    try {
      const logoImg = await loadImageElement('/logo.png');
      const itemsToRender = visibleItems;
      const cardsPerPage = 6;
      const totalPages = Math.max(1, Math.ceil(itemsToRender.length / cardsPerPage));
      const jpegPages: string[] = [];

      const W = 1040;
      const H = 1471;

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        setPdfProgressText(`${pageIdx + 1}/${totalPages}`);
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.fillStyle = '#F2EFE9';
        ctx.fillRect(0, 0, W, H);

        const marginX = 52;
        const contentW = W - marginX * 2; // 936px

        ctx.fillStyle = '#6E6A63';
        ctx.font = '600 11px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('CARDIO FOOTWEAR // KHARKIV • B2B LOOKBOOK 2026', marginX, 46);

        ctx.textAlign = 'right';
        ctx.fillText(
          `${tgUser.label}   •   PAGE ${String(pageIdx + 1).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`,
          W - marginX,
          46
        );

        ctx.strokeStyle = '#161514';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(marginX, 60);
        ctx.lineTo(W - marginX, 60);
        ctx.stroke();

        if (logoImg) {
          const lH = 40;
          const lW = (logoImg.width / Math.max(1, logoImg.height)) * lH;
          ctx.drawImage(logoImg, marginX, 74, lW, lH);
        }

        ctx.fillStyle = '#161514';
        ctx.font = '400 32px Georgia, serif';
        ctx.textAlign = 'left';
        ctx.fillText('CARDIO', marginX + 80, 102);

        ctx.fillStyle = '#6E6A63';
        ctx.font = 'italic 17px Georgia, serif';
        const collectionLabel =
          seasonFilter === 'autumn'
            ? 'Autumn Collection 2026'
            : seasonFilter === 'winter'
            ? 'Winter Collection 2026'
            : 'Complete Wholesale Collection 2026 (All Colors)';
        ctx.textAlign = 'right';
        ctx.fillText(collectionLabel, W - marginX, 100);

        ctx.strokeStyle = '#DCD7CC';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(marginX, 126);
        ctx.lineTo(W - marginX, 126);
        ctx.stroke();

        const slice = itemsToRender.slice(pageIdx * cardsPerPage, (pageIdx + 1) * cardsPerPage);
        const gridTop = 142;
        const gapX = 20;
        const gapY = 18;
        const cardW = (contentW - gapX) / 2; // 458px
        const cardH = 392;

        for (let i = 0; i < slice.length; i++) {
          const entry = slice[i];
          const { shoe, priceUsd, season } = entry;
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = marginX + col * (cardW + gapX);
          const y = gridTop + row * (cardH + gapY);

          ctx.fillStyle = '#F8F6F1';
          ctx.fillRect(x, y, cardW, cardH);

          ctx.strokeStyle = '#DCD7CC';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, cardW, cardH);

          const catLocalized = getLocalizedCategory(shoe.category, lang).toUpperCase();
          const seasonShort = season === 'autumn' ? 'AUTUMN' : 'WINTER';

          ctx.fillStyle = '#6E6A63';
          ctx.font = '600 10.5px Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`${catLocalized} // ${seasonShort} '26`, x + 14, y + 22);

          ctx.textAlign = 'right';
          ctx.fillText('40—45', x + cardW - 14, y + 22);

          ctx.strokeStyle = '#E5E0D5';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y + 32);
          ctx.lineTo(x + cardW, y + 32);
          ctx.stroke();

          const stageX = x + 12;
          const stageY = y + 40;
          const stageW = cardW - 24;
          const stageH = 222;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(stageX, stageY, stageW, stageH);

          const shoeImg = await loadImageElement(shoe.image);
          if (shoeImg) {
            const pad = 18;
            const availW = stageW - pad * 2;
            const availH = stageH - pad * 2;
            const scale = Math.min(
              availW / Math.max(1, shoeImg.width),
              availH / Math.max(1, shoeImg.height)
            );
            const drawW = shoeImg.width * scale;
            const drawH = shoeImg.height * scale;
            const drawX = stageX + (stageW - drawW) / 2;
            const drawY = stageY + (stageH - drawH) / 2;
            ctx.drawImage(shoeImg, drawX, drawY, drawW, drawH);
          }

          const infoTop = stageY + stageH + 12;

          ctx.fillStyle = '#161514';
          ctx.font = '400 25px Georgia, serif';
          ctx.textAlign = 'left';
          const variantSuffix = shoe.variant ? ` (${shoe.variant})` : '';
          ctx.fillText(`№ ${shoe.modelNumber}${variantSuffix}`, x + 14, infoTop + 22);

          ctx.fillStyle = '#161514';
          ctx.font = '700 25px Georgia, serif';
          ctx.textAlign = 'right';
          ctx.fillText(`$${priceUsd}`, x + cardW - 14, infoTop + 22);

          const colorLocalized = getLocalizedColor(shoe.color, lang);
          const featuresList = shoe.features.map((f) => getLocalizedFeature(f, lang)).join(' • ');
          const subtitleLine = featuresList ? `${colorLocalized}  •  ${featuresList}` : colorLocalized;

          ctx.fillStyle = '#6E6A63';
          ctx.font = '500 12px Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(subtitleLine.toUpperCase().slice(0, 46), x + 14, infoTop + 44);

          ctx.strokeStyle = '#DCD7CC';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 14, infoTop + 56);
          ctx.lineTo(x + cardW - 14, infoTop + 56);
          ctx.stroke();

          ctx.fillStyle = '#6E6A63';
          ctx.font = '600 10.5px Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`${t.box6.toUpperCase()}:`, x + 14, infoTop + 78);

          ctx.fillStyle = '#161514';
          ctx.font = '700 13px Georgia, serif';
          ctx.fillText(`$${priceUsd * 6}`, x + 102, infoTop + 78);

          ctx.fillStyle = '#6E6A63';
          ctx.font = '600 10.5px Arial, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`${t.box8.toUpperCase()}:  $${priceUsd * 8}`, x + cardW - 14, infoTop + 78);
        }

        const footerY = H - 72;
        ctx.strokeStyle = '#161514';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(marginX, footerY);
        ctx.lineTo(W - marginX, footerY);
        ctx.stroke();

        ctx.fillStyle = '#161514';
        ctx.font = '600 12px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          `${t.footerSub}   •   +38 (067) 719-37-16 (${t.georgiyName})   •   +38 (097) 454-15-11 (${t.borisName})`,
          marginX,
          footerY + 24
        );

        ctx.fillStyle = '#6E6A63';
        ctx.font = '400 10.5px Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('CONFIDENTIAL B2B PRICE LIST • DO NOT FORWARD', W - marginX, footerY + 24);

        jpegPages.push(canvas.toDataURL('image/jpeg', 0.82));
      }

      const pdfBase64 = buildPdfBase64FromJpegPages(jpegPages, W, H);
      const fileName = `CARDIO_LOOKBOOK_2026_${lang.toUpperCase()}.pdf`;

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
            pages: jpegPages,
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
        padding: '0 16px 90px 16px',
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
            }}
          >
            {t.back}
          </button>
        </div>

        {isUnlocked && (
          <button
            type="button"
            disabled={pdfGenerating}
            onClick={handleGenerateAndDeliverPdf}
            style={{
              backgroundColor: THEME.ink,
              color: THEME.onInk,
              border: `1px solid ${THEME.ink}`,
              padding: '8px 14px',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.9px',
              textTransform: 'uppercase',
              cursor: pdfGenerating ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {pdfGenerating ? `${t.generatingPdf} ${pdfProgressText}...` : t.downloadBtnTop}
          </button>
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
              fontFamily: '"Playfair Display", Georgia, serif',
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
                fontSize: '9px',
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
                color: THEME.inkMuted,
                marginBottom: '4px',
              }}
            >
              <span>{t.lookbookTag}</span>
              <span>40—45</span>
            </div>
            <h1
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: '30px',
                fontWeight: 400,
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
                letterSpacing: '1.3px',
                textTransform: 'uppercase',
                cursor: pdfGenerating ? 'wait' : 'pointer',
              }}
            >
              {pdfGenerating ? `${t.generatingPdf} (${pdfProgressText})...` : t.downloadBtn}
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
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
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

              return (
                <div
                  key={shoe.id}
                  onClick={() => onSelectShoe?.(shoe)}
                  style={{
                    backgroundColor: THEME.surface,
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
                        fontSize: '8px',
                        letterSpacing: '0.6px',
                        textTransform: 'uppercase',
                        color: THEME.inkLight,
                      }}
                    >
                      <span>{translatedCat}</span>
                      <span>{season === 'autumn' ? 'AUTUMN' : 'WINTER'}</span>
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
                          fontFamily: '"Playfair Display", Georgia, serif',
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
                          fontFamily: '"Playfair Display", Georgia, serif',
                          fontSize: '19px',
                          fontWeight: 600,
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
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
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
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
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
                        color: THEME.ink,
                        textAlign: 'right',
                      }}
                    >
                      {t.orderBtn}
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
    </div>
  );
}

export default WholesalePriceBanner;
