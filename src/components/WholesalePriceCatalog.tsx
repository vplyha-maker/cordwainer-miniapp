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
  rawColors: {
    uk: string;
    ru: string;
    de: string;
  };
}

export const PRICE_LIST_2026: PriceItemConfig[] = [
  // === AUTUMN 2026 ===
  { modelNumber: '20', season: 'autumn', priceUsd: 34, rawColors: { uk: 'Чорний', ru: 'Черный', de: 'Schwarz' } },
  { modelNumber: '22', season: 'autumn', priceUsd: 36, rawColors: { uk: 'Чорний', ru: 'Черный', de: 'Schwarz' } },
  { modelNumber: '23', season: 'autumn', priceUsd: 36, rawColors: { uk: 'Чорний', ru: 'Черный', de: 'Schwarz' } },
  { modelNumber: '26', season: 'autumn', priceUsd: 39, rawColors: { uk: 'Чорний / Оливка', ru: 'Черный / Олива', de: 'Schwarz / Oliv' } },
  { modelNumber: '28', season: 'autumn', priceUsd: 37, rawColors: { uk: 'Чорний / Білий', ru: 'Черный / Белый', de: 'Schwarz / Weiß' } },
  { modelNumber: '35', season: 'autumn', priceUsd: 36, rawColors: { uk: 'Чорний', ru: 'Черный', de: 'Schwarz' } },
  { modelNumber: '36', season: 'autumn', priceUsd: 38, rawColors: { uk: 'Чор. / Біл. №1 / Біл. №2 / Сір. / Зел.', ru: 'Чер. / Бел. №1 / Бел. №2 / Сер. / Зел.', de: 'Schw. / Weiß #1 / Weiß #2 / Grau / Grün' } },
  { modelNumber: '37', season: 'autumn', priceUsd: 36, rawColors: { uk: 'Чорний', ru: 'Черный', de: 'Schwarz' } },
  { modelNumber: '43', season: 'autumn', priceUsd: 39, rawColors: { uk: 'Чор. / Біл. / Біл. №1 / Біл. №2', ru: 'Чер. / Бел. / Бел. №1 / Бел. №2', de: 'Schw. / Weiß #1 / Weiß #2' } },
  { modelNumber: '44', season: 'autumn', priceUsd: 39, rawColors: { uk: 'Чорний', ru: 'Черный', de: 'Schwarz' } },
  { modelNumber: '70', season: 'autumn', priceUsd: 38, rawColors: { uk: 'Чорний / Коричневий', ru: 'Черный / Коричневый', de: 'Schwarz / Braun' } },

  // === WINTER 2026 ===
  { modelNumber: '165', season: 'winter', priceUsd: 48, rawColors: { uk: 'Оливка', ru: 'Олива', de: 'Oliv' } },
  { modelNumber: '172', season: 'winter', priceUsd: 49, rawColors: { uk: 'Оливка, Пісок', ru: 'Олива, Песок', de: 'Oliv, Sand' } },
  { modelNumber: '173', season: 'winter', priceUsd: 48, rawColors: { uk: 'Мультіколор / Чорний', ru: 'Мультиколор / Черный', de: 'Multicolor / Schwarz' } },
  { modelNumber: '174', season: 'winter', priceUsd: 48, rawColors: { uk: 'Чорний, Коричнева', ru: 'Черный, Коричневый', de: 'Schwarz, Braun' } },
  { modelNumber: '188', season: 'winter', priceUsd: 45, rawColors: { uk: 'Чорний', ru: 'Черный', de: 'Schwarz' } },
  { modelNumber: '201', season: 'winter', priceUsd: 45, rawColors: { uk: 'Чорний', ru: 'Черный', de: 'Schwarz' } },
  { modelNumber: '206', season: 'winter', priceUsd: 45, rawColors: { uk: 'Чорний', ru: 'Черный', de: 'Schwarz' } },
  { modelNumber: '208', season: 'winter', priceUsd: 45, rawColors: { uk: 'Чорний', ru: 'Черный', de: 'Schwarz' } },
  { modelNumber: '210', season: 'winter', priceUsd: 45, rawColors: { uk: 'Чорний', ru: 'Черный', de: 'Schwarz' } },
  { modelNumber: '214', season: 'winter', priceUsd: 46, rawColors: { uk: 'Чорний', ru: 'Черный', de: 'Schwarz' } },
  { modelNumber: '218', season: 'winter', priceUsd: 41, rawColors: { uk: 'Пісок, Оливка, Чорний', ru: 'Песок, Олива, Черный', de: 'Sand, Oliv, Schwarz' } },
  { modelNumber: '220', season: 'winter', priceUsd: 48, rawColors: { uk: 'Пісок, Чорний', ru: 'Песок, Черный', de: 'Sand, Schwarz' } },
  { modelNumber: '223', season: 'winter', priceUsd: 44, rawColors: { uk: 'Чорний, Білий', ru: 'Черный, Белый', de: 'Schwarz, Weiß' } },
  { modelNumber: '224', season: 'winter', priceUsd: 47, rawColors: { uk: 'Чорний, Коньяк', ru: 'Черный, Коньяк', de: 'Schwarz, Cognac' } },
  { modelNumber: '225', season: 'winter', priceUsd: 44, rawColors: { uk: 'Чорний, Білий', ru: 'Черный, Белый', de: 'Schwarz, Weiß' } },
  { modelNumber: '226', season: 'winter', priceUsd: 45, rawColors: { uk: 'Чорний (#1 / #2)', ru: 'Черный (#1 / #2)', de: 'Schwarz (#1 / #2)' } },
  { modelNumber: '227', season: 'winter', priceUsd: 45, rawColors: { uk: 'Чорний, Білий, Чорно-білий', ru: 'Черный, Белый, Черно-белый', de: 'Schwarz, Weiß, Schwarz-Weiß' } },
  { modelNumber: '228', season: 'winter', priceUsd: 46, rawColors: { uk: 'Чорний, Білий, Оливка, Сірий', ru: 'Черный, Белый, Олива, Серый', de: 'Schwarz, Weiß, Oliv, Grau' } },
  { modelNumber: '229', season: 'winter', priceUsd: 46, rawColors: { uk: 'Чорний', ru: 'Черный', de: 'Schwarz' } },
];

export function getWholesalePriceByModel(modelNumber: string): number | null {
  const found = PRICE_LIST_2026.find((p) => p.modelNumber === modelNumber.trim());
  return found ? found.priceUsd : null;
}

function getWatermarkText(): string {
  try {
    const tgUser = (
      window as unknown as {
        Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number; first_name?: string; username?: string } } } };
      }
    ).Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser?.id) {
      return `CARDIO B2B • ID:${tgUser.id} ${tgUser.username ? `@${tgUser.username}` : tgUser.first_name || ''} • DO NOT FORWARD`;
    }
  } catch {}
  return 'CARDIO B2B • CONFIDENTIAL PRICE 2026 • DO NOT FORWARD';
}

function buildPdfBlobFromJpegPages(jpegDataUrls: string[], pageWidthPt = 595.28, pageHeightPt = 841.89): Blob {
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

    const imgW = 1240;
    const imgH = 1754;

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

  return new Blob(chunks, { type: 'application/pdf' });
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

type EnrichedCatalogModel = PriceItemConfig & {
  variants: ShoeItem[];
  primaryShoe: ShoeItem;
};

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
      tag: isUnlocked ? '● B2B ПРАЙС ОТКРЫТ ($34–$49)' : '🔒 ЗАКРЫТЫЙ B2B ПРАЙС-КАТАЛОГ 2026',
      title: 'Оптовый каталог с фото и ценами (PDF)',
      btn: isUnlocked ? 'Открыть прайс PDF →' : 'Ввести PIN / PDF →',
    },
    uk: {
      tag: isUnlocked ? '● B2B ПРАЙС ВІДКРИТО ($34–$49)' : '🔒 ЗАКРИТИЙ B2B ПРАЙС-КАТАЛОГ 2026',
      title: 'Гуртовий каталог з фото та цінами (PDF)',
      btn: isUnlocked ? 'Відкрити прайс PDF →' : 'Ввести PIN / PDF →',
    },
    de: {
      tag: isUnlocked ? '● B2B PREISLISTE AKTIV ($34–$49)' : '🔒 EXKLUSIVER B2B PREISKATALOG 2026',
      title: 'Großhandelskatalog mit Fotos & Preisen (PDF)',
      btn: isUnlocked ? 'Preiskatalog PDF →' : 'PIN / PDF →',
    },
  }[safeLang];

  const GOLD = '#C5A880';
  const bg = isDark ? '#141416' : '#161514';
  const textMain = '#F4EFE6';

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
          backgroundColor: bg,
          border: `1px solid ${GOLD}`,
          padding: '11px 14px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
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
              color: GOLD,
              fontWeight: 600,
              marginBottom: '3px',
            }}
          >
            {labels.tag}
          </div>
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: '14px',
              color: textMain,
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
            backgroundColor: GOLD,
            color: '#141413',
            border: 'none',
            padding: '8px 11px',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.9px',
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

type ReadyPdfBundle = {
  file: File;
  blob: Blob;
  fileName: string;
  pages: string[];
};

function WholesalePriceCatalogModal({
  lang,
  isUnlocked,
  onUnlockSuccess,
  onClose,
  onSelectShoe,
}: ModalProps) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState<'all' | SeasonKey>('all');
  const [activeVariantByModel, setActiveVariantByModel] = useState<Record<string, string>>({});
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');
  const [readyPdf, setReadyPdf] = useState<ReadyPdfBundle | null>(null);
  const [shareHint, setShareHint] = useState<string | null>(null);

  const watermark = useMemo(() => getWatermarkText(), []);

  const enrichedModels: EnrichedCatalogModel[] = useMemo(() => {
    const list: EnrichedCatalogModel[] = [];
    for (const item of PRICE_LIST_2026) {
      const variants = cardioCatalog.filter((s) => s.modelNumber.trim() === item.modelNumber.trim());
      if (variants.length > 0) {
        list.push({
          ...item,
          variants,
          primaryShoe: variants[0],
        });
      }
    }
    return list;
  }, []);

  const autumnCount = useMemo(
    () => enrichedModels.filter((m) => m.season === 'autumn').length,
    [enrichedModels]
  );
  const winterCount = useMemo(
    () => enrichedModels.filter((m) => m.season === 'winter').length,
    [enrichedModels]
  );

  const visibleModels = useMemo(() => {
    return enrichedModels.filter((m) => {
      if (seasonFilter !== 'all' && m.season !== seasonFilter) return false;
      return true;
    });
  }, [enrichedModels, seasonFilter]);

  const t = {
    ru: {
      back: '← Закрыть прайс',
      pinTitle: 'Закрытый оптовый прайс CARDIO 2026',
      pinSub: 'Цены предназначены только для оптовых партнеров и владельцев магазинов. Введите 4-значный PIN-код доступа:',
      pinPlaceholder: '• • • •',
      pinUnlockBtn: 'Открыть каталог с ценами →',
      pinErrorText: 'Неверный PIN-код. Запросите код у руководителя отдела продаж ниже.',
      askPinTitle: 'Нет PIN-кода? Получите его за 10 секунд у руководителя:',
      askBoris: 'Запросить PIN • Борис (+38097-454-15-11)',
      askGeorgiy: 'Запросить PIN • Георгий (+38067-719-37-16)',
      headerSub: 'CONFIDENTIAL B2B LOOKBOOK // DO NOT FORWARD',
      mainTitle: 'Прайс-каталог CARDIO 2026',
      downloadPdf: '⬇ Сформировать и скачать PDF с фото',
      downloadPdfShort: '⬇ Скачать PDF',
      generatingPdf: 'Сборка PDF...',
      pdfReadyTitle: (pages: number) => `✓ PDF-каталог готов (${pages} стр. А4)`,
      pdfReadySub: 'Нажмите золотую кнопку ниже — откроется меню телефона (можно сохранить в Загрузки, открыть в PDF или отправить себе в Избранное Telegram):',
      saveToPhoneBtn: '📥 СОХРАНИТЬ / ОТКРЫТЬ PDF НА ТЕЛЕФОНЕ',
      closeReadyBtn: '← Вернуться к карточкам',
      pagesPreviewLabel: 'ГОТОВЫЕ ЛИСТЫ КАТАЛОГА (А4):',
      pageNumberLabel: (idx: number, total: number) => `Лист ${idx} из ${total}`,
      tabAll: `Все модели (${enrichedModels.length})`,
      tabAutumn: `Осень 2026 (${autumnCount})`,
      tabWinter: `Зима 2026 (${winterCount})`,
      seasonAutumnBadge: 'AUTUMN 2026 // ОСЕНЬ',
      seasonWinterBadge: 'WINTER 2026 // ЗИМА',
      modelPrefix: 'Модель №',
      perPair: 'за пару',
      box6: 'Короб 6 п.',
      box8: 'Короб 8 п.',
      colorsLabel: 'Цвета в наличии:',
      orderModelBtn: 'Заказать ростовку →',
      contactsTitle: 'ДЛЯ ОПТОВОГО ЗАКАЗА',
      georgiyName: 'Георгий',
      borisName: 'Борис',
      securityNotice: 'Защита от пересылки: документ маркируется вашим ID. Передача третьим лицам и розничным покупателям запрещена.',
    },
    uk: {
      back: '← Закрити прайс',
      pinTitle: 'Закритий гуртовий прайс CARDIO 2026',
      pinSub: 'Ціни призначені виключно для гуртових партнерів та власників магазинів. Введіть 4-значний PIN-код доступу:',
      pinPlaceholder: '• • • •',
      pinUnlockBtn: 'Відкрити каталог з цінами →',
      pinErrorText: 'Невірний PIN-код. Запитайте код у керівника відділу продажу нижче.',
      askPinTitle: 'Немає PIN-коду? Отримайте його за 10 секунд у керівника:',
      askBoris: 'Запитати PIN • Борис (+38097-454-15-11)',
      askGeorgiy: 'Запитати PIN • Георгій (+38067-719-37-16)',
      headerSub: 'CONFIDENTIAL B2B LOOKBOOK // DO NOT FORWARD',
      mainTitle: 'Прайс-каталог CARDIO 2026',
      downloadPdf: '⬇ Сформувати та завантажити PDF з фото',
      downloadPdfShort: '⬇ Завантажити PDF',
      generatingPdf: 'Формування PDF...',
      pdfReadyTitle: (pages: number) => `✓ PDF-каталог готовий (${pages} стор. А4)`,
      pdfReadySub: 'Натисніть золоту кнопку нижче — відкриється меню телефону (можна зберегти в Завантаження, відкрити в PDF або зберегти в Обране Telegram):',
      saveToPhoneBtn: '📥 ЗБЕРЕГТИ / ВІДКРИТИ PDF НА ТЕЛЕФОНІ',
      closeReadyBtn: '← Повернутися до карток',
      pagesPreviewLabel: 'ГОТОВІ АРКУШІ КАТАЛОГУ (А4):',
      pageNumberLabel: (idx: number, total: number) => `Аркуш ${idx} з ${total}`,
      tabAll: `Всі моделі (${enrichedModels.length})`,
      tabAutumn: `Осінь 2026 (${autumnCount})`,
      tabWinter: `Зима 2026 (${winterCount})`,
      seasonAutumnBadge: 'AUTUMN 2026 // ОСІНЬ',
      seasonWinterBadge: 'WINTER 2026 // ЗИМА',
      modelPrefix: 'Модель №',
      perPair: 'за пару',
      box6: 'Короб 6 п.',
      box8: 'Короб 8 п.',
      colorsLabel: 'Кольори в наявності:',
      orderModelBtn: 'Замовити ростовку →',
      contactsTitle: 'ДЛЯ ГУРТОВОГО ЗАМОВЛЕННЯ',
      georgiyName: 'Георгій',
      borisName: 'Борис',
      securityNotice: 'Захист від пересилання: документ маркується вашим ID. Передача третім особам та роздрібним покупцям заборонена.',
    },
    de: {
      back: '← Schließen',
      pinTitle: 'Exklusiver B2B-Preiskatalog CARDIO 2026',
      pinSub: 'Die Preise sind ausschließlich für Großhandelspartner bestimmt. Bitte 4-stelligen PIN-Code eingeben:',
      pinPlaceholder: '• • • •',
      pinUnlockBtn: 'Preiskatalog öffnen →',
      pinErrorText: 'Ungültiger PIN-Code. Bitte beim Verkaufsleiter anfordern.',
      askPinTitle: 'Kein PIN-Code? Direkt beim Verkaufsleiter anfordern:',
      askBoris: 'PIN anfordern • Boris (+38097-454-15-11)',
      askGeorgiy: 'PIN anfordern • Georgiy (+38067-719-37-16)',
      headerSub: 'CONFIDENTIAL B2B LOOKBOOK // DO NOT FORWARD',
      mainTitle: 'Preiskatalog CARDIO 2026',
      downloadPdf: '⬇ PDF-Katalog mit Fotos erstellen',
      downloadPdfShort: '⬇ PDF laden',
      generatingPdf: 'PDF wird erstellt...',
      pdfReadyTitle: (pages: number) => `✓ PDF-Katalog bereit (${pages} Seiten A4)`,
      pdfReadySub: 'Tippen Sie auf den goldenen Button unten, um die PDF-Datei auf Ihrem Smartphone zu speichern oder zu öffnen:',
      saveToPhoneBtn: '📥 PDF SPEICHERN / ÖFFNEN',
      closeReadyBtn: '← Zurück zum Katalog',
      pagesPreviewLabel: 'KATALOGSEITEN (A4):',
      pageNumberLabel: (idx: number, total: number) => `Seite ${idx} von ${total}`,
      tabAll: `Alle Modelle (${enrichedModels.length})`,
      tabAutumn: `Herbst 2026 (${autumnCount})`,
      tabWinter: `Winter 2026 (${winterCount})`,
      seasonAutumnBadge: 'AUTUMN 2026 // HERBST',
      seasonWinterBadge: 'WINTER 2026 // WINTER',
      modelPrefix: 'Modell Nr.',
      perPair: 'pro Paar',
      box6: 'Kiste 6 P.',
      box8: 'Kiste 8 P.',
      colorsLabel: 'Verfügbare Farben:',
      orderModelBtn: 'Serie bestellen →',
      contactsTitle: 'FÜR GROSSHANDELSBESTELLUNGEN',
      georgiyName: 'Georgiy',
      borisName: 'Boris',
      securityNotice: 'Weiterleitungsschutz: Dokument ist mit Ihrer ID markiert. Weitergabe an Dritte untersagt.',
    },
  }[lang];

  const handlePinSubmit = () => {
    const clean = pinInput.trim();
    if (VALID_WHOLESALE_PINS.has(clean)) {
      setPinError(false);
      onUnlockSuccess();
    } else {
      setPinError(true);
    }
  };

  /**
   * Шаг 1: Рендерим все страницы А4 в память и открываем экран готового файла
   */
  const handleBuildIllustratedPdf = async () => {
    if (pdfGenerating) return;
    setPdfGenerating(true);
    setShareHint(null);

    try {
      const logoImg = await loadImageElement('/logo.png');
      const modelsToRender = visibleModels;
      const cardsPerPage = 6;
      const totalPages = Math.max(1, Math.ceil(modelsToRender.length / cardsPerPage));
      const jpegPages: string[] = [];

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        setPdfProgressText(`${pageIdx + 1}/${totalPages}`);
        const canvas = document.createElement('canvas');
        const W = 1240;
        const H = 1754;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.fillStyle = '#18181A';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = '#C5A880';
        ctx.lineWidth = 2;
        for (let y = 30; y < H - 30; y += 18) {
          ctx.beginPath();
          ctx.moveTo(12, y);
          ctx.lineTo(32, y + 12);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(W - 32, y);
          ctx.lineTo(W - 12, y + 12);
          ctx.stroke();
        }

        ctx.strokeStyle = '#C5A880';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(52, 42, W - 104, H - 84);

        if (logoImg) {
          const logoH = 54;
          const logoW = (logoImg.width / Math.max(1, logoImg.height)) * logoH;
          ctx.save();
          ctx.filter = 'invert(1) brightness(1.2)';
          ctx.drawImage(logoImg, 78, 62, logoW, logoH);
          ctx.restore();
        }

        ctx.fillStyle = '#C5A880';
        ctx.font = 'bold 34px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('C A R D I O   F O O T W E A R', W / 2, 85);

        ctx.fillStyle = '#F4EFE6';
        ctx.font = 'bold 20px Arial, sans-serif';
        const seasonTitle =
          seasonFilter === 'autumn'
            ? 'PRICE LIST AUTUMN 2026'
            : seasonFilter === 'winter'
            ? 'PRICE LIST WINTER 2026'
            : 'WHOLESALE PRICE CATALOG 2026 (AUTUMN & WINTER)';
        ctx.fillText(`${seasonTitle}  •  ${lang.toUpperCase()}  •  PAGE ${pageIdx + 1}/${totalPages}`, W / 2, 118);

        ctx.strokeStyle = '#C5A880';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(72, 54, W - 144, 80);

        const slice = modelsToRender.slice(pageIdx * cardsPerPage, (pageIdx + 1) * cardsPerPage);
        const startX = 72;
        const startY = 154;
        const gapX = 24;
        const gapY = 22;
        const cardW = (W - 144 - gapX) / 2;
        const cardH = 445;

        for (let i = 0; i < slice.length; i++) {
          const item = slice[i];
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = startX + col * (cardW + gapX);
          const y = startY + row * (cardH + gapY);

          ctx.fillStyle = '#202024';
          ctx.fillRect(x, y, cardW, cardH);
          ctx.strokeStyle = '#C5A880';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, cardW, cardH);

          ctx.fillStyle = '#141416';
          ctx.fillRect(x + 1, y + 1, cardW - 2, 58);

          ctx.fillStyle = '#F4EFE6';
          ctx.font = 'bold 26px Georgia, serif';
          ctx.textAlign = 'left';
          ctx.fillText(`№ ${item.modelNumber}`, x + 18, y + 38);

          ctx.fillStyle = '#C5A880';
          ctx.font = 'bold 30px Georgia, serif';
          ctx.textAlign = 'right';
          ctx.fillText(`$${item.priceUsd}`, x + cardW - 18, y + 40);

          const stageX = x + 16;
          const stageY = y + 70;
          const stageW = cardW - 32;
          const stageH = 245;
          ctx.fillStyle = '#F2EFE9';
          ctx.fillRect(stageX, stageY, stageW, stageH);

          const chosenVariantId = activeVariantByModel[item.modelNumber];
          const shoeToDraw =
            item.variants.find((v) => v.id === chosenVariantId) || item.primaryShoe;

          if (shoeToDraw?.image) {
            const shoeImg = await loadImageElement(shoeToDraw.image);
            if (shoeImg) {
              const pad = 18;
              const availW = stageW - pad * 2;
              const availH = stageH - pad * 2;
              const scale = Math.min(availW / Math.max(1, shoeImg.width), availH / Math.max(1, shoeImg.height));
              const drawW = shoeImg.width * scale;
              const drawH = shoeImg.height * scale;
              const drawX = stageX + (stageW - drawW) / 2;
              const drawY = stageY + (stageH - drawH) / 2;
              ctx.drawImage(shoeImg, drawX, drawY, drawW, drawH);
            }
          }

          ctx.textAlign = 'left';
          ctx.fillStyle = '#C5A880';
          ctx.font = 'bold 15px Arial, sans-serif';
          const seasonStr =
            item.season === 'autumn'
              ? lang === 'de'
                ? 'HERBST 2026'
                : lang === 'uk'
                ? 'ОСІНЬ 2026'
                : 'ОСЕНЬ 2026'
              : lang === 'de'
              ? 'WINTER 2026'
              : 'ЗИМА 2026';
          const catStr = shoeToDraw ? ` • ${getLocalizedCategory(shoeToDraw.category, lang).toUpperCase()}` : '';
          ctx.fillText(`${seasonStr}${catStr}`, x + 18, y + 342);

          ctx.fillStyle = '#F4EFE6';
          ctx.font = '18px Georgia, serif';
          const catalogColorsText = item.variants
            .map((v) => `${getLocalizedColor(v.color, lang)}${v.variant ? ` ${v.variant}` : ''}`)
            .join(' / ');
          ctx.fillText(catalogColorsText.slice(0, 42), x + 18, y + 372);

          ctx.strokeStyle = '#383632';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 16, y + 392);
          ctx.lineTo(x + cardW - 16, y + 392);
          ctx.stroke();

          ctx.fillStyle = '#A19D95';
          ctx.font = 'bold 16px Arial, sans-serif';
          ctx.fillText(
            `${t.box6}: $${item.priceUsd * 6}   |   ${t.box8}: $${item.priceUsd * 8}`,
            x + 18,
            y + 422
          );
        }

        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate(-Math.PI / 6);
        ctx.fillStyle = 'rgba(197, 168, 128, 0.09)';
        ctx.font = 'bold 34px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(watermark, 0, -280);
        ctx.fillText(watermark, 0, 0);
        ctx.fillText(watermark, 0, 280);
        ctx.restore();

        ctx.strokeStyle = '#C5A880';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(72, H - 140, W - 144, 82);

        ctx.fillStyle = '#C5A880';
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${t.contactsTitle}:   +38067-719-37-16 (${t.georgiyName})   •   +38097-454-15-11 (${t.borisName})`,
          W / 2,
          H - 102
        );

        ctx.fillStyle = '#A19D95';
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText(watermark, W / 2, H - 74);

        jpegPages.push(canvas.toDataURL('image/jpeg', 0.9));
      }

      const pdfBlob = buildPdfBlobFromJpegPages(jpegPages);
      const fileName = `CARDIO_PRICE_2026_${lang.toUpperCase()}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      setReadyPdf({
        file: pdfFile,
        blob: pdfBlob,
        fileName,
        pages: jpegPages,
      });
    } finally {
      setPdfGenerating(false);
      setPdfProgressText('');
    }
  };

  /**
   * Шаг 2: Вызывается СИНХРОННО в момент клика пользователя по кнопке "СОХРАНИТЬ / ОТКРЫТЬ PDF".
   * Благодаря 0 мс задержки Android WebView сохраняет User Gesture и открывает системное меню сохранения файла.
   */
  const handleInstantSaveOrShare = async () => {
    if (!readyPdf) return;
    setShareHint(null);

    try {
      const nav = navigator as Navigator & { canShare?: (data: { files?: File[] }) => boolean };
      if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare({ files: [readyPdf.file] }))) {
        await nav.share({
          files: [readyPdf.file],
          title: readyPdf.fileName,
        });
        return;
      }
    } catch (err) {
      const errName = (err as { name?: string })?.name;
      if (errName === 'AbortError') return;
    }

    // Резервный метод скачивания для десктопных и мобильных браузеров
    try {
      const url = URL.createObjectURL(readyPdf.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = readyPdf.fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 8000);
      setShareHint(
        lang === 'de'
          ? 'Datei wurde in Downloads gespeichert. Sie können auch die Seiten unten lang drücken.'
          : lang === 'uk'
          ? 'Файл надіслано в Завантаження. Ви також можете затиснути будь-який аркуш нижче, щоб зберегти його в Галерею.'
          : 'Файл отправлен в Загрузки. Вы также можете зажать любой лист ниже пальцем, чтобы сохранить его в Галерею.'
      );
    } catch {}
  };

  const GOLD = '#C5A880';
  const BG = '#121214';
  const SURFACE = '#1A1A1E';
  const INK = '#F4EFE6';
  const MUTED = '#A19D95';
  const BORDER = '#32302B';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: BG,
        color: INK,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '0 14px 90px 14px',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
      }}
    >
      {/* Липкая верхняя шапка (всегда на самом верху, ничего её не перекрывает) */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: BG,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 0',
          marginBottom: '14px',
          borderBottom: `1px solid ${GOLD}`,
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (readyPdf) {
              setReadyPdf(null);
            } else {
              onClose();
            }
          }}
          style={{
            background: SURFACE,
            border: `1px solid ${GOLD}`,
            color: GOLD,
            padding: '9px 12px',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {readyPdf ? t.closeReadyBtn : t.back}
        </button>

        {isUnlocked && !readyPdf && (
          <button
            type="button"
            disabled={pdfGenerating}
            onClick={handleBuildIllustratedPdf}
            style={{
              backgroundColor: GOLD,
              color: '#141413',
              border: 'none',
              padding: '9px 14px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.9px',
              textTransform: 'uppercase',
              cursor: pdfGenerating ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {pdfGenerating ? `${t.generatingPdf} ${pdfProgressText}` : t.downloadPdfShort}
          </button>
        )}

        {isUnlocked && readyPdf && (
          <button
            type="button"
            onClick={handleInstantSaveOrShare}
            style={{
              backgroundColor: GOLD,
              color: '#141413',
              border: 'none',
              padding: '9px 14px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.9px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            📥 PDF ({readyPdf.pages.length})
          </button>
        )}
      </div>

      {/* ЭКРАН 1: ВВОД PIN-КОДА */}
      {!isUnlocked ? (
        <div
          style={{
            maxWidth: '400px',
            margin: '20px auto',
            backgroundColor: SURFACE,
            border: `1.5px solid ${GOLD}`,
            padding: '24px 18px',
            textAlign: 'center',
          }}
        >
          <img
            src="/logo.png"
            alt="Cardio"
            style={{
              height: '44px',
              width: 'auto',
              margin: '0 auto 12px auto',
              display: 'block',
              filter: 'invert(1) brightness(1.15)',
            }}
          />
          <div style={{ fontSize: '9px', letterSpacing: '2px', color: GOLD, textTransform: 'uppercase', marginBottom: '6px' }}>
            CARDIO B2B SECURITY
          </div>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '24px', fontWeight: 400, margin: '0 0 10px 0' }}>
            {t.pinTitle}
          </h2>
          <p style={{ fontSize: '12px', color: MUTED, lineHeight: 1.45, margin: '0 0 18px 0' }}>
            {t.pinSub}
          </p>

          <input
            type="tel"
            inputMode="numeric"
            maxLength={6}
            placeholder={t.pinPlaceholder}
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
              fontWeight: 700,
              backgroundColor: '#121214',
              color: INK,
              WebkitTextFillColor: INK,
              border: `1.5px solid ${pinError ? '#F87171' : GOLD}`,
              outline: 'none',
              marginBottom: '10px',
            }}
          />

          {pinError && (
            <div style={{ fontSize: '11px', color: '#F87171', marginBottom: '10px', lineHeight: 1.35 }}>
              {t.pinErrorText}
            </div>
          )}

          <button
            type="button"
            onClick={handlePinSubmit}
            style={{
              width: '100%',
              padding: '13px',
              backgroundColor: GOLD,
              color: '#141413',
              border: 'none',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            {t.pinUnlockBtn}
          </button>

          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '14px', textAlign: 'left' }}>
            <div style={{ fontSize: '10px', color: MUTED, marginBottom: '8px', textAlign: 'center' }}>
              {t.askPinTitle}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <a
                href="tel:+380974541511"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '9px 10px',
                  border: `1px solid ${BORDER}`,
                  backgroundColor: '#121214',
                  color: INK,
                  textDecoration: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                📞 {t.askBoris}
              </a>
              <a
                href="tel:+380677193716"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '9px 10px',
                  border: `1px solid ${BORDER}`,
                  backgroundColor: '#121214',
                  color: INK,
                  textDecoration: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                📞 {t.askGeorgiy}
              </a>
            </div>
          </div>
        </div>
      ) : readyPdf ? (
        /* ЭКРАН 2: СФОРМИРОВАННЫЙ PDF ГОТОВ К СОХРАНЕНИЮ В ОДИН КЛИК + ПРОСМОТР ЛИСТОВ А4 */
        <div>
          <div
            style={{
              border: `2px solid ${GOLD}`,
              backgroundColor: SURFACE,
              padding: '18px 14px',
              marginBottom: '18px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px', fontFamily: '"Playfair Display", Georgia, serif', color: GOLD, marginBottom: '6px' }}>
              {t.pdfReadyTitle(readyPdf.pages.length)}
            </div>
            <div style={{ fontSize: '11.5px', color: MUTED, lineHeight: 1.45, marginBottom: '14px' }}>
              {t.pdfReadySub}
            </div>

            <button
              type="button"
              onClick={handleInstantSaveOrShare}
              style={{
                width: '100%',
                padding: '15px 16px',
                backgroundColor: GOLD,
                color: '#141413',
                border: 'none',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '1.1px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {t.saveToPhoneBtn}
            </button>

            {shareHint && (
              <div style={{ fontSize: '11px', color: GOLD, marginTop: '10px', lineHeight: 1.35 }}>
                {shareHint}
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: '10px',
              letterSpacing: '1.4px',
              color: GOLD,
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: '10px',
            }}
          >
            {t.pagesPreviewLabel}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {readyPdf.pages.map((dataUrl, idx) => (
              <div
                key={idx}
                style={{
                  border: `1px solid ${GOLD}`,
                  backgroundColor: '#18181A',
                  padding: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10px',
                    color: GOLD,
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  <span>{t.pageNumberLabel(idx + 1, readyPdf.pages.length)}</span>
                  <span>CARDIO 2026</span>
                </div>
                <img
                  src={dataUrl}
                  alt={`CARDIO PDF Page ${idx + 1}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ЭКРАН 3: ВИТРИНА ПРАЙС-КАТАЛОГА */
        <div>
          <div
            style={{
              border: `1.5px solid ${GOLD}`,
              backgroundColor: SURFACE,
              padding: '16px 14px',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '9px', letterSpacing: '1.8px', color: GOLD, textTransform: 'uppercase', marginBottom: '4px' }}>
              {t.headerSub}
            </div>
            <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '26px', fontWeight: 400, margin: '0 0 6px 0' }}>
              {t.mainTitle}
            </h1>
            <div style={{ fontSize: '10px', color: MUTED, marginBottom: '14px' }}>{watermark}</div>

            {/* Крупная заметная кнопка скачивания PDF прямо в заголовке */}
            <button
              type="button"
              disabled={pdfGenerating}
              onClick={handleBuildIllustratedPdf}
              style={{
                width: '100%',
                padding: '13px 16px',
                backgroundColor: GOLD,
                color: '#141413',
                border: 'none',
                fontSize: '10.5px',
                fontWeight: 800,
                letterSpacing: '1.1px',
                textTransform: 'uppercase',
                cursor: pdfGenerating ? 'wait' : 'pointer',
              }}
            >
              {pdfGenerating ? `${t.generatingPdf} ${pdfProgressText}` : t.downloadPdf}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              border: `1px solid ${GOLD}`,
              marginBottom: '16px',
            }}
          >
            {(['all', 'autumn', 'winter'] as const).map((tab, idx) => {
              const active = seasonFilter === tab;
              const label = tab === 'all' ? t.tabAll : tab === 'autumn' ? t.tabAutumn : t.tabWinter;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSeasonFilter(tab)}
                  style={{
                    backgroundColor: active ? GOLD : 'transparent',
                    color: active ? '#141413' : INK,
                    border: 'none',
                    borderLeft: idx === 0 ? 'none' : `1px solid ${GOLD}`,
                    padding: '10px 4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '14px',
              marginBottom: '24px',
            }}
          >
            {visibleModels.map((item) => {
              const selectedVarId = activeVariantByModel[item.modelNumber];
              const activeShoe =
                item.variants.find((v) => v.id === selectedVarId) || item.primaryShoe;
              const catalogColorsList = item.variants
                .map((v) => `${getLocalizedColor(v.color, lang)}${v.variant ? ` ${v.variant}` : ''}`)
                .join(' • ');

              return (
                <div
                  key={`${item.season}-${item.modelNumber}`}
                  style={{
                    backgroundColor: SURFACE,
                    border: `1px solid ${GOLD}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderBottom: `1px solid ${BORDER}`,
                      backgroundColor: '#141416',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '8.5px', letterSpacing: '1.2px', color: GOLD, fontWeight: 600 }}>
                        {item.season === 'autumn' ? t.seasonAutumnBadge : t.seasonWinterBadge}
                      </div>
                      <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '22px', color: INK }}>
                        {t.modelPrefix} {item.modelNumber}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontFamily: '"Playfair Display", Georgia, serif',
                          fontSize: '26px',
                          fontWeight: 700,
                          color: GOLD,
                          lineHeight: 1,
                        }}
                      >
                        ${item.priceUsd}
                      </div>
                      <div style={{ fontSize: '9px', color: MUTED, marginTop: '2px' }}>{t.perPair}</div>
                    </div>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: '190px',
                      backgroundColor: '#F2EFE9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '14px 18px',
                      boxSizing: 'border-box',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={activeShoe.image}
                      alt={`Cardio ${item.modelNumber}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        mixBlendMode: 'multiply',
                      }}
                    />

                    <div
                      style={{
                        position: 'absolute',
                        bottom: '4px',
                        right: '6px',
                        fontSize: '7.5px',
                        letterSpacing: '0.8px',
                        color: 'rgba(22,21,20,0.35)',
                        pointerEvents: 'none',
                        fontWeight: 600,
                      }}
                    >
                      CARDIO 2026 • ${item.priceUsd}
                    </div>
                  </div>

                  {item.variants.length > 1 && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
                        padding: '8px 12px',
                        borderTop: `1px solid ${BORDER}`,
                        backgroundColor: '#151518',
                        overflowX: 'auto',
                      }}
                    >
                      {item.variants.map((v) => {
                        const isSelected = activeShoe.id === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() =>
                              setActiveVariantByModel((prev) => ({
                                ...prev,
                                [item.modelNumber]: v.id,
                              }))
                            }
                            style={{
                              padding: '4px 8px',
                              fontSize: '9px',
                              border: `1px solid ${isSelected ? GOLD : BORDER}`,
                              backgroundColor: isSelected ? GOLD : 'transparent',
                              color: isSelected ? '#141413' : INK,
                              fontWeight: isSelected ? 700 : 400,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {getLocalizedColor(v.color, lang)} {v.variant || ''}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ padding: '10px 12px', borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ fontSize: '10px', color: MUTED, marginBottom: '2px' }}>{t.colorsLabel}</div>
                    <div style={{ fontSize: '13px', fontFamily: '"Playfair Display", Georgia, serif', color: INK, marginBottom: '8px' }}>
                      {catalogColorsList}
                    </div>

                    {activeShoe.features.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                        {activeShoe.features.map((f) => (
                          <span
                            key={f}
                            style={{
                              fontSize: '8.5px',
                              padding: '2px 6px',
                              border: `1px solid ${BORDER}`,
                              color: GOLD,
                              textTransform: 'uppercase',
                            }}
                          >
                            {getLocalizedFeature(f, lang)}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        padding: '7px 8px',
                        backgroundColor: '#121214',
                        border: `1px solid ${BORDER}`,
                        marginBottom: onSelectShoe ? '10px' : '0',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '8.5px', color: MUTED, textTransform: 'uppercase' }}>{t.box6}</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: INK }}>${item.priceUsd * 6}</div>
                      </div>
                      <div style={{ borderLeft: `1px solid ${BORDER}`, paddingLeft: '8px' }}>
                        <div style={{ fontSize: '8.5px', color: MUTED, textTransform: 'uppercase' }}>{t.box8}</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: GOLD }}>${item.priceUsd * 8}</div>
                      </div>
                    </div>

                    {onSelectShoe && (
                      <button
                        type="button"
                        onClick={() => onSelectShoe(activeShoe)}
                        style={{
                          width: '100%',
                          padding: '9px',
                          backgroundColor: 'transparent',
                          border: `1px solid ${GOLD}`,
                          color: GOLD,
                          fontSize: '9.5px',
                          fontWeight: 700,
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                        }}
                      >
                        {t.orderModelBtn}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              border: `1.5px solid ${GOLD}`,
              backgroundColor: SURFACE,
              padding: '16px 14px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1.5px',
                color: GOLD,
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              {t.contactsTitle}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '320px', margin: '0 auto 12px auto' }}>
              <a
                href="tel:+380677193716"
                style={{
                  color: INK,
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '8px',
                  border: `1px solid ${BORDER}`,
                  backgroundColor: '#121214',
                }}
              >
                📞 +38067-719-37-16 — {t.georgiyName}
              </a>
              <a
                href="tel:+380974541511"
                style={{
                  color: INK,
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '8px',
                  border: `1px solid ${BORDER}`,
                  backgroundColor: '#121214',
                }}
              >
                📞 +38097-454-15-11 — {t.borisName}
              </a>
            </div>
            <div style={{ fontSize: '9.5px', color: MUTED, lineHeight: 1.4 }}>{t.securityNotice}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WholesalePriceBanner;
