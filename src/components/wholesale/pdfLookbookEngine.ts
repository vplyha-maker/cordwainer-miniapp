/**
 * @file src/components/wholesale/pdfLookbookEngine.ts
 * @description Автономный графический движок генерации журнального PDF-лукбука А4 (Editorial Lookbook)
 * стандарта PDF 1.7 с интерактивными закладками (Outlines), кликабельными ссылками (Instagram, Tel)
 * и модулем прямого сохранения на мобильных устройствах (iOS + Android).
 */

import {
  getLocalizedCategory,
  getLocalizedColor,
  getLocalizedFeature,
} from '../../data/catalog';
import type { FullCatalogPriceItem, SeasonKey } from './wholesaleData';
import type { WholesaleLang } from './wholesaleThemeAndI18n';

/** Стадии жизненного цикла генерации PDF для отображения прогресса в UI */
export type PdfStage = 'idle' | 'rendering_pages' | 'packaging_and_uploading';

/** Результат формирования и доставки PDF-каталога */
export interface PdfDeliveryStatus {
  sentToTelegram: boolean;
  downloadUrl?: string;
  localBlob?: Blob;
  previewPages?: string[];
  fileName: string;
  totalPages: number;
}

/** Расширенная типизация глобального объекта Telegram WebApp */
type TgWebAppExtended = {
  initDataUnsafe?: {
    user?: {
      id?: number;
      first_name?: string;
      username?: string;
    };
  };
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  downloadFile?: (
    params: { url: string; file_name: string },
    callback?: (accepted: boolean) => void
  ) => void;
};

/**
 * Безопасное получение инстанса Telegram WebApp из глобального объекта window.
 */
export function getTgWebApp(): TgWebAppExtended | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Telegram?: { WebApp?: TgWebAppExtended } }).Telegram?.WebApp;
}

/**
 * Извлекает Telegram ID партнёра и формирует персональный идентификатор клиента.
 */
export function getTelegramUserInfo(): { id?: number; clientCode: string } {
  try {
    const u = getTgWebApp()?.initDataUnsafe?.user;
    if (u?.id) {
      return {
        id: u.id,
        clientCode: `CLIENT-${u.id}`,
      };
    }
  } catch {}
  return {
    clientCode: 'CARDIO-OFFICIAL',
  };
}

/**
 * Асинхронно загружает изображение по URL для последующей отрисовки на Canvas.
 */
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
 * Автоматически находит границы объекта (обуви), отсекает лишние пустые поля
 * и оставляет чистый белый фон вокруг объекта для бесшовного наложения через `multiply`.
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

  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const idx = (y * srcW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r < 246 || g < 246 || b < 246) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

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
    outCtx.fillStyle = '#FFFFFF';
    outCtx.fillRect(0, 0, cropW, cropH);
    outCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  }
  return outCanvas;
}

/**
 * Отрисовывает фирменный защитный водяной знак CARDIO по диагонали страницы.
 */
function drawEditorialWatermark(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  clientCode: string,
  modelNumber?: string
) {
  ctx.save();
  ctx.translate(W / 2, H / 2 - 40);
  ctx.rotate((-28 * Math.PI) / 180);
  ctx.textAlign = 'center';

  ctx.fillStyle = 'rgba(23, 23, 23, 0.038)';
  ctx.font = '700 44px "Inter", "Helvetica Neue", Arial, sans-serif';
  const wmLine = `CARDIO FOOTWEAR   ·   ${clientCode}   ·   LOOKBOOK 2026`;

  ctx.fillText(wmLine, 0, -290);
  ctx.fillText(wmLine, 0, 10);
  ctx.fillText(wmLine, 0, 310);

  if (modelNumber) {
    ctx.fillStyle = 'rgba(23, 23, 23, 0.032)';
    ctx.font = '400 72px "Playfair Display", Georgia, serif';
    ctx.fillText(`CARDIO ORIGINAL  //  MODEL №${modelNumber}`, 0, -140);
    ctx.fillText(`CARDIO ORIGINAL  //  MODEL №${modelNumber}`, 0, 160);
  }

  ctx.restore();
}

/**
 * Утилита автоматического переноса длинных строк текста по словам на Canvas.
 */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
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
}

/**
 * Получение локализованных текстов лукбука без упоминания B2B и коробов.
 */
function getEditorialText(lang: WholesaleLang) {
  switch (lang) {
    case 'uk':
      return {
        edition: 'ОФІЦІЙНИЙ КАТАЛОГ 2026',
        overviewTitle: 'Філософія бездоганного стилю',
        manifestoLead:
          'Кожна пара в нашій колекції — це результат синергії інженерної точності, ручної роботи та безкомпромісного відбору натуральних матеріалів українського виробництва.',
        manifestoBody:
          'Ми створюємо взуття для тих, хто обирає довговічність, статусний зовнішній дизайн та абсолютний комфорт у кожному русі. Власні виробничі потужності в Харкові гарантують контроль якості на кожному етапі.',
        tocTitle: 'ЗМІСТ КАТАЛОГУ',
        tocAutumn: 'Колекція "Осінь 2026"',
        tocWinter: 'Колекція "Зима 2026"',
        tocContacts: 'Контакти та замовлення',
        seasonAutumnLabel: 'КОЛЕКЦІЯ ОСІНЬ 2026',
        seasonWinterLabel: 'КОЛЕКЦІЯ ЗИМА 2026',
        autumnChapter: 'РОЗДІЛ І  ·  СЕЗОН ОСІНЬ',
        winterChapter: 'РОЗДІЛ ІІ  ·  СЕЗОН ЗИМА',
        autumnSub: 'Демісезонна лінійка з натуральної шкіри та нубуку',
        winterSub: 'Утеплені моделі на натуральній вовні',
        modelLabel: 'МОДЕЛЬНИЙ РЯД',
        priceLabel: 'РОЗДРІБНА ЦІНА',
        colorMaterialLabel: 'КОЛІР ТА МАТЕРІАЛ',
        sizeRangeLabel: 'РОЗМІРНА СІТКА',
        fullSizeScale: 'Повна повнота (40—45)',
        naturalLeather: '100% Натуральна шкіра / єврозима',
        contactsPageSub: 'ЗВ`ЯЗОК З ВИРОБНИКОМ ТА ЗАМОВЛЕННЯ',
        contactsPageTitle: 'Контакти та підтримка',
        managerRole: 'ПРЕМІУМ-КОНСУЛЬТАНТ ФАБРИКИ',
        georgiyName: 'Георгій',
        borisName: 'Борис',
        instagramLabel: 'Instagram: @cardio_shoes',
        shippingNote:
          'Швидка доставка замовлень по всій Україні та за кордон. Гарантія якості від виробника.',
      };
    case 'de':
      return {
        edition: 'OFFIZIELLER KATALOG 2026',
        overviewTitle: 'Philosophie des kompromisslosen Stils',
        manifestoLead:
          'Jedes Paar unserer Kollektion ist das Ergebnis ingenieurtechnischer Präzision, handwerklicher Perfektion und handverlesener Naturmaterialien.',
        manifestoBody:
          'Wir fertigen Schuhe für Menschen, die Wert auf Langlebigkeit, markantes Design und absoluten Tragekomfort legen. Unsere eigene Produktion in Charkiw garantiert höchste Qualitätsstandards.',
        tocTitle: 'INHALTSVERZEICHNIS',
        tocAutumn: 'Kollektion "Herbst 2026"',
        tocWinter: 'Kollektion "Winter 2026"',
        tocContacts: 'Kontakte & Bestellung',
        seasonAutumnLabel: 'HERBST-KOLLEKTION 2026',
        seasonWinterLabel: 'WINTER-KOLLEKTION 2026',
        autumnChapter: 'KAPITEL I  ·  HERBST',
        winterChapter: 'KAPITEL II  ·  WINTER',
        autumnSub: 'Demisaison-Modelle aus echtem Leder und Nubuk',
        winterSub: 'Gefütterte Modelle mit Naturwolle',
        modelLabel: 'MODELLNUMMER',
        priceLabel: 'PREIS PRO PAAR',
        colorMaterialLabel: 'FARBE & MATERIAL',
        sizeRangeLabel: 'GRÖSSENBEREICH',
        fullSizeScale: 'Vollständige Skala (40—45)',
        naturalLeather: '100% Echtes Leder',
        contactsPageSub: 'DIREKTVERBINDUNG ZUR HERSTELLUNG',
        contactsPageTitle: 'Kontakte & Support',
        managerRole: 'WERKSBERATER',
        georgiyName: 'Georgiy',
        borisName: 'Boris',
        instagramLabel: 'Instagram: @cardio_shoes',
        shippingNote:
          'Schneller Versand in der Ukraine und international. Herstellergarantie.',
      };
    case 'ru':
    default:
      return {
        edition: 'ОФИЦИАЛЬНЫЙ КАТАЛОГ 2026',
        overviewTitle: 'Философия безупречного стиля',
        manifestoLead:
          'Каждая пара в нашей коллекции — это результат синергии инженерной точности, ручной работы и бескомпромиссного отбора натуральных материалов.',
        manifestoBody:
          'Мы создаем обувь для тех, кто выбирает долговечность, статусный внешний дизайн и абсолютный комфорт в каждом движении. Собственные производственные мощности в Харькове гарантируют контроль качества на каждом этапе.',
        tocTitle: 'СОДЕРЖАНИЕ КАТАЛОГА',
        tocAutumn: 'Коллекция "Осень 2026"',
        tocWinter: 'Коллекция "Зима 2026"',
        tocContacts: 'Контакты и заказ',
        seasonAutumnLabel: 'КОЛЛЕКЦИЯ ОСЕНЬ 2026',
        seasonWinterLabel: 'КОЛЛЕКЦИЯ ЗИМА 2026',
        autumnChapter: 'РАЗДЕЛ I  ·  СЕЗОН ОСЕНЬ',
        winterChapter: 'РАЗДЕЛ II  ·  СЕЗОН ЗИМА',
        autumnSub: 'Демисезонная линейка из натуральной кожи и нубука',
        winterSub: 'Утепленные модели на натуральной шерсти',
        modelLabel: 'МОДЕЛЬНЫЙ РЯД',
        priceLabel: 'ЦЕНА ЗА ПАРУ',
        colorMaterialLabel: 'ЦВЕТ И МАТЕРИАЛ',
        sizeRangeLabel: 'РАЗМЕРНАЯ СЕТКА',
        fullSizeScale: 'Полная полнота (40—45)',
        naturalLeather: '100% Натуральная кожа / еврозима',
        contactsPageSub: 'СВЯЗЬ С ПРОИЗВОДИТЕЛЕМ И ЗАКАЗ',
        contactsPageTitle: 'Контакты и поддержка',
        managerRole: 'ПРЕМИУМ-КОНСУЛЬТАНТ ФАБРИКИ',
        georgiyName: 'Георгий',
        borisName: 'Борис',
        instagramLabel: 'Instagram: @cardio_shoes',
        shippingNote:
          'Быстрая доставка заказов по всей Украине и за рубеж. Гарантия качества от производителя.',
      };
  }
}

/**
 * Низкоуровневый сборщик бинарного файла формата PDF 1.7
 * с поддержкой интерактивных закладок (Outlines), метаданных (/Info) и ссылок (/Annots).
 */
function buildPdfBytesFromJpegPages(
  jpegDataUrls: string[],
  imgW: number,
  imgH: number,
  pageWidthPt = 595.28,
  pageHeightPt = 841.89,
  outlines?: Array<{ title: string; pageIndex: number }>,
  pageAnnotations?: Map<number, Array<{ rect: [number, number, number, number]; uri: string }>>
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
  
  // Объектные идентификаторы:
  // 1: Catalog
  // 2: Pages Root
  // 3: Info Dictionary
  // 4: Outlines Root (если есть)
  // 5+: Outline items, pages, content streams, XObjects, annotations
  
  let nextObjId = 5;
  const pageObjIds: number[] = [];
  const contentObjIds: number[] = [];
  const imgObjIds: number[] = [];
  const annotListObjIds: (number | null)[] = [];
  const annotItemObjIds: number[][] = [];

  for (let i = 0; i < pageCount; i++) {
    pageObjIds.push(nextObjId++);
    contentObjIds.push(nextObjId++);
    imgObjIds.push(nextObjId++);

    const annots = pageAnnotations?.get(i);
    if (annots && annots.length > 0) {
      annotListObjIds.push(nextObjId++);
      const itemIds: number[] = [];
      for (let a = 0; a < annots.length; a++) {
        itemIds.push(nextObjId++);
      }
      annotItemObjIds.push(itemIds);
    } else {
      annotListObjIds.push(null);
      annotItemObjIds.push([]);
    }
  }

  // Outlines objects setup
  const outlineRootId = outlines && outlines.length > 0 ? nextObjId++ : null;
  const outlineItemIds: number[] = [];
  if (outlines && outlines.length > 0) {
    for (let o = 0; o < outlines.length; o++) {
      outlineItemIds.push(nextObjId++);
    }
  }

  pushStr('%PDF-1.7\n%âãÏÓ\n');

  // Obj 1: Catalog
  startObj(1);
  let catalogDict = `<< /Type /Catalog /Pages 2 0 R`;
  if (outlineRootId !== null) {
    catalogDict += ` /Outlines ${outlineRootId} 0 R`;
  }
  catalogDict += ` >>`;
  pushStr(catalogDict);
  endObj();

  // Obj 2: Pages
  startObj(2);
  pushStr(
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`
  );
  endObj();

  // Obj 3: Info Metadata
  startObj(3);
  pushStr(
    `<< /Title (CARDIO FOOTWEAR - Official Lookbook 2026) /Author (CARDIO Manufacturing) /Subject (Exclusive Footwear Collection) /Creator (CARDIO PDF Engine) /Producer (PDF 1.7 Generator) >>`
  );
  endObj();

  // Obj 4: Outlines Root (если есть)
  if (outlineRootId !== null && outlines) {
    startObj(outlineRootId);
    pushStr(
      `<< /Type /Outlines /First ${outlineItemIds[0]} 0 R /Last ${outlineItemIds[outlineItemIds.length - 1]} 0 R /Count ${outlines.length} >>`
    );
    endObj();

    // Outline items
    for (let o = 0; o < outlines.length; o++) {
      const item = outlines[o];
      const itemId = outlineItemIds[o];
      const prevId = o > 0 ? outlineItemIds[o - 1] : null;
      const nextId = o < outlines.length - 1 ? outlineItemIds[o + 1] : null;
      const targetPageObjId = pageObjIds[item.pageIndex] || pageObjIds[0];

      let itemDict = `<< /Title (${item.title}) /Parent ${outlineRootId} 0 R`;
      if (prevId !== null) itemDict += ` /Prev ${prevId} 0 R`;
      if (nextId !== null) itemDict += ` /Next ${nextId} 0 R`;
      itemDict += ` /Dest [${targetPageObjId} 0 R /XYZ null null null] >>`;

      startObj(itemId);
      pushStr(itemDict);
      endObj();
    }
  }

  // Запись страниц, потоков контента, картинок и аннотаций
  for (let i = 0; i < pageCount; i++) {
    const pageObjId = pageObjIds[i];
    const contentObjId = contentObjIds[i];
    const imgObjId = imgObjIds[i];
    const annotListId = annotListObjIds[i];
    const itemIds = annotItemObjIds[i];

    const base64 = jpegDataUrls[i].split(',')[1] || '';
    const binaryStr = atob(base64);
    const imgBytes = new Uint8Array(binaryStr.length);
    for (let k = 0; k < binaryStr.length; k++) {
      imgBytes[k] = binaryStr.charCodeAt(k);
    }

    const contentStream = `q\n${pageWidthPt.toFixed(2)} 0 0 ${pageHeightPt.toFixed(2)} 0 0 cm\n/Im${i} Do\nQ`;

    // Page Object
    startObj(pageObjId);
    let pageDict = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(2)}] ` +
      `/Resources << /XObject << /Im${i} ${imgObjId} 0 R >> >> /Contents ${contentObjId} 0 R`;
    if (annotListId !== null) {
      pageDict += ` /Annots ${annotListId} 0 R`;
    }
    pageDict += ` >>`;
    pushStr(pageDict);
    endObj();

    // Content Stream
    startObj(contentObjId);
    pushStr(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`);
    endObj();

    // Image XObject
    startObj(imgObjId);
    pushStr(
      `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`
    );
    pushBytes(imgBytes);
    pushStr('\nendstream');
    endObj();

    // Annotation List & Items
    const annots = pageAnnotations?.get(i);
    if (annotListId !== null && annots && itemIds.length === annots.length) {
      startObj(annotListId);
      pushStr(`[${itemIds.map((id) => `${id} 0 R`).join(' ')}]`);
      endObj();

      for (let a = 0; a < annots.length; a++) {
        const ann = annots[a];
        startObj(itemIds[a]);
        pushStr(
          `<< /Type /Annot /Subtype /Link /Rect [${ann.rect.join(' ')}] /Border [0 0 0] /A << /S /URI /URI (${ann.uri}) >> >>`
        );
        endObj();
      }
    }
  }

  const totalObjects = nextObjId;
  const xrefOffset = currentOffset;
  pushStr(`xref\n0 ${totalObjects}\n0000000000 65535 f \n`);
  for (let id = 1; id < totalObjects; id++) {
    const off = String(offsets[id] || 0).padStart(10, '0');
    pushStr(`${off} 00000 n \n`);
  }
  pushStr(
    `trailer\n<< /Size ${totalObjects} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const merged = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    merged.set(c, pos);
    pos += c.length;
  }
  return merged;
}

/**
 * Конвертирует бинарный массив Uint8Array в строку Base64 чанками по 32 КБ.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize))
    );
  }
  return btoa(binary);
}

/**
 * Вспомогательный запуск скачивания через скрытый тег <a download>
 */
function triggerAnchorDownload(url: string, fileName: string): void {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {}
}

/**
 * Сохранение готового PDF-файла с разделением iOS и Android:
 */
export async function triggerPdfDownload(status: {
  downloadUrl?: string;
  localBlob?: Blob;
  fileName: string;
}): Promise<void> {
  const tg = getTgWebApp();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isAndroid = /Android/i.test(ua);
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (typeof navigator !== 'undefined' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1);

  const stamp = String(Date.now()).slice(-4);
  const uniqueFileName = status.fileName.replace(/\.pdf$/i, '') + `_${stamp}.pdf`;

  if (isIOS && !isAndroid && status.localBlob) {
    try {
      const file = new File([status.localBlob], status.fileName, {
        type: 'application/pdf',
      });
      const nav = navigator as Navigator & {
        canShare?: (d: { files?: File[] }) => boolean;
      };
      if (
        typeof nav.share === 'function' &&
        (!nav.canShare || nav.canShare({ files: [file] }))
      ) {
        await nav.share({
          files: [file],
          title: status.fileName,
        });
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
    }
  }

  if (status.downloadUrl) {
    const baseFullUrl = status.downloadUrl.startsWith('http')
      ? status.downloadUrl
      : `${window.location.origin}${status.downloadUrl}`;
    const sep = baseFullUrl.includes('?') ? '&' : '?';
    const freshUrl = `${baseFullUrl}${sep}_dl=${Date.now()}`;

    if (typeof tg?.downloadFile === 'function') {
      try {
        tg.downloadFile(
          {
            url: freshUrl,
            file_name: uniqueFileName,
          },
          (accepted) => {
            if (!accepted && isAndroid) {
              triggerAnchorDownload(freshUrl, uniqueFileName);
            }
          }
        );
        return;
      } catch {
        if (isAndroid) {
          triggerAnchorDownload(freshUrl, uniqueFileName);
          return;
        }
      }
    }

    if (isAndroid) {
      triggerAnchorDownload(freshUrl, uniqueFileName);
      return;
    }
  }

  if (status.localBlob) {
    try {
      const blobUrl = URL.createObjectURL(status.localBlob);
      triggerAnchorDownload(blobUrl, uniqueFileName);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {}
  }
}

/** Параметры запуска генератора PDF-лукбука */
export interface GenerateLookbookParams {
  lang: WholesaleLang;
  seasonFilter: 'all' | SeasonKey;
  allCatalogItems: FullCatalogPriceItem[];
  autumnItems: FullCatalogPriceItem[];
  winterItems: FullCatalogPriceItem[];
  tgUser: { id?: number; clientCode?: string; partnerCode?: string };
  securityNote: string;
  onStageChange: (stage: PdfStage) => void;
  onPageProgress: (currentPage: number, totalPages: number) => void;
}

/**
 * Главная функция-оркестратор: верстает страницы каталога на Canvas,
 * упаковывает в PDF 1.7 с интерактивными закладками и ссылками,
 * отправляет копию в Telegram и возвращает превью.
 */
export async function generateAndDeliverLookbookPdf(
  params: GenerateLookbookParams
): Promise<{ status: PdfDeliveryStatus; error: string | null }> {
  const {
    lang,
    seasonFilter,
    autumnItems,
    winterItems,
    tgUser,
    securityNote,
    onStageChange,
    onPageProgress,
  } = params;

  const clientCode = tgUser.clientCode || tgUser.partnerCode || 'CARDIO-OFFICIAL';
  const pdfT = getEditorialText(lang);

  const VIRTUAL_W = 1240;
  const VIRTUAL_H = 1754;
  const OUT_W = 900;
  const OUT_H = 1273;
  const SCALE_FACTOR = OUT_W / VIRTUAL_W;

  const W = VIRTUAL_W;
  const H = VIRTUAL_H;
  const PAD = 84;
  const CONTENT_W = W - PAD * 2;

  const PAPER = '#F5F3EE';
  const GRAPHITE = '#171717';
  const GREY = '#85837E';
  const METALLIC = '#A69984';
  const RULE = '#D6D1C7';

  const includeAutumn = seasonFilter === 'all' || seasonFilter === 'autumn';
  const includeWinter = seasonFilter === 'all' || seasonFilter === 'winter';

  type PageDescriptor =
    | { type: 'cover' }
    | { type: 'manifesto' }
    | { type: 'divider'; season: SeasonKey; count: number }
    | { type: 'product'; item: FullCatalogPriceItem; indexInCatalog: number }
    | { type: 'contacts' };

  const pagePlan: PageDescriptor[] = [{ type: 'cover' }, { type: 'manifesto' }];

  // Для закладок (Outlines)
  const outlinesList: Array<{ title: string; pageIndex: number }> = [
    { title: 'Обложка', pageIndex: 0 },
    { title: 'Манифест и Оглавление', pageIndex: 1 },
  ];

  let globalProdIdx = 1;
  let autumnDividerIndex = -1;
  let winterDividerIndex = -1;

  if (includeAutumn && autumnItems.length > 0) {
    autumnDividerIndex = pagePlan.length;
    pagePlan.push({ type: 'divider', season: 'autumn', count: autumnItems.length });
    outlinesList.push({ title: 'Осенняя коллекция 2026', pageIndex: autumnDividerIndex });
    for (const item of autumnItems) {
      pagePlan.push({ type: 'product', item, indexInCatalog: globalProdIdx++ });
    }
  }
  if (includeWinter && winterItems.length > 0) {
    winterDividerIndex = pagePlan.length;
    pagePlan.push({ type: 'divider', season: 'winter', count: winterItems.length });
    outlinesList.push({ title: 'Зимняя коллекция 2026', pageIndex: winterDividerIndex });
    for (const item of winterItems) {
      pagePlan.push({ type: 'product', item, indexInCatalog: globalProdIdx++ });
    }
  }
  
  const contactsPageIndex = pagePlan.length;
  pagePlan.push({ type: 'contacts' });
  outlinesList.push({ title: 'Контакты и заказ', pageIndex: contactsPageIndex });

  const totalPages = pagePlan.length;
  onPageProgress(1, totalPages);
  onStageChange('rendering_pages');

  const logoImg = await loadImageElement('/logo.png');
  const coverBannerRaw = (await loadImageElement('/baner1.png')) || logoImg;
  const coverBannerCropped = coverBannerRaw ? prepareSeamlessShoeCanvas(coverBannerRaw) : null;

  const coverSloganLocal = {
    ru: 'ШАГ ВПЕРЕДИ. ХАРАКТЕР В КАЖДОЙ ПАРЕ.',
    uk: 'КРОК ПОПЕРЕДУ. ХАРАКТЕР У КОЖНІЙ ПАРІ.',
    de: 'EINEN SCHRITT VORAUS. CHARAKTER IN JEDEM PAAR.',
  }[lang];

  const jpegPages: string[] = [];
  const pageAnnotations = new Map<number, Array<{ rect: [number, number, number, number]; uri: string }>>();

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    onPageProgress(pageIdx + 1, totalPages);
    await new Promise((r) => setTimeout(r, 0));

    const pageDesc = pagePlan[pageIdx];
    const pageNumStr = `${String(pageIdx + 1).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`;

    const canvas = document.createElement('canvas');
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.save();
    ctx.scale(SCALE_FACTOR, SCALE_FACTOR);

    if (pageDesc.type === 'cover') {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);

      drawEditorialWatermark(ctx, W, H, clientCode);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '600 13px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CARDIO FOOTWEAR // MANUFACTURING EST.', PAD, 76);

      ctx.fillStyle = GREY;
      ctx.textAlign = 'right';
      ctx.fillText(`KHARKIV  ·  LOOKBOOK 2026`, W - PAD, 76);

      ctx.strokeStyle = GRAPHITE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PAD, 98);
      ctx.lineTo(W - PAD, 98);
      ctx.stroke();

      if (coverBannerCropped) {
        const availW = CONTENT_W - 60;
        const availH = 540;
        const scale = Math.min(
          availW / Math.max(1, coverBannerCropped.width),
          availH / Math.max(1, coverBannerCropped.height)
        );
        const drawW = coverBannerCropped.width * scale;
        const drawH = coverBannerCropped.height * scale;
        const drawX = PAD + (CONTENT_W - drawW) / 2;
        const drawY = 190 + (availH - drawH) / 2;

        ctx.save();
        ctx.translate(W / 2, drawY + drawH + 16);
        ctx.scale(1, 0.06);
        const grad = ctx.createRadialGradient(0, 0, 20, 0, 0, drawW * 0.42);
        grad.addColorStop(0, 'rgba(23, 23, 23, 0.20)');
        grad.addColorStop(0.6, 'rgba(23, 23, 23, 0.06)');
        grad.addColorStop(1, 'rgba(23, 23, 23, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, drawW * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(coverBannerCropped, drawX, drawY, drawW, drawH);
        ctx.restore();
      }

      const brandCenterY = 890;

      ctx.fillStyle = GRAPHITE;
      ctx.font = '400 138px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('CARDIO', W / 2, brandCenterY);

      ctx.fillStyle = GREY;
      ctx.font = '700 22px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText('F O O T W E A R', W / 2, brandCenterY + 46);

      ctx.strokeStyle = GRAPHITE;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 90, brandCenterY + 84);
      ctx.lineTo(W / 2 + 90, brandCenterY + 84);
      ctx.stroke();

      ctx.fillStyle = GRAPHITE;
      ctx.font = '800 30px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText('BUILT TO LEAD. ENGINEERED FOR EVERY STEP.', W / 2, brandCenterY + 142);

      ctx.fillStyle = METALLIC;
      ctx.font = '600 19px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(coverSloganLocal, W / 2, brandCenterY + 184);

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
      ctx.fillText('OFFICIAL LOOKBOOK 2026', PAD, bottomBlockY + 118);

      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, bottomBlockY + 165);
      ctx.lineTo(W - PAD, bottomBlockY + 165);
      ctx.stroke();

      ctx.fillStyle = GREY;
      ctx.font = '500 14px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('DIRECT FACTORY COLLECTION  ·  EDITION 2026', PAD, H - 78);

      ctx.textAlign = 'right';
      ctx.fillText(pageNumStr, W - PAD, H - 78);
    } else if (pageDesc.type === 'manifesto') {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);

      drawEditorialWatermark(ctx, W, H, clientCode);

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

      ctx.fillStyle = METALLIC;
      ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('01 // EDITORIAL INTRODUCTION', PAD, 170);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '400 44px "Playfair Display", Georgia, serif';
      ctx.fillText(pdfT.overviewTitle, PAD, 232);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '400 26px "Playfair Display", Georgia, serif';
      const nextY = drawWrappedText(ctx, pdfT.manifestoLead, PAD, 315, CONTENT_W, 40);

      ctx.fillStyle = GREY;
      ctx.font = '400 20px "Inter", "Helvetica Neue", Arial, sans-serif';
      drawWrappedText(ctx, pdfT.manifestoBody, PAD, nextY + 24, CONTENT_W, 32);

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
        { title: pdfT.tocAutumn, meta: `${autumnItems.length} MODELS` },
        { title: pdfT.tocWinter, meta: `${winterItems.length} MODELS` },
        { title: pdfT.tocContacts, meta: 'KHARKIV DIRECT' },
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

      const boxSecY = 1040;
      ctx.fillStyle = METALLIC;
      ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`03 // BRAND STANDARDS`, PAD, boxSecY);

      ctx.strokeStyle = GRAPHITE;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(PAD, boxSecY + 36, CONTENT_W, 175);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 20px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText('100% NATURAL MATERIALS & MEMORY COMFORT', PAD + 32, boxSecY + 92);

      ctx.fillStyle = GREY;
      ctx.font = '400 22px "Playfair Display", Georgia, serif';
      ctx.fillText('Selected Italian and Ukrainian leather, reinforced soles.', PAD + 32, boxSecY + 150);

      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(PAD, boxSecY + 240, CONTENT_W, 175);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 20px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText('FULL SIZE RANGE & ORTHOPEDIC FIT', PAD + 32, boxSecY + 296);

      ctx.fillStyle = GREY;
      ctx.font = '400 22px "Playfair Display", Georgia, serif';
      ctx.fillText('Full size scale from 40 to 45 with ergonomic instep support.', PAD + 32, boxSecY + 354);

      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, H - 115);
      ctx.lineTo(W - PAD, H - 115);
      ctx.stroke();

      ctx.fillStyle = GREY;
      ctx.font = '500 14px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CARDIO FOOTWEAR  ·  LOOKBOOK 2026', PAD, H - 76);

      ctx.textAlign = 'right';
      ctx.fillText(
        `+38 (067) 719-37-16 (${pdfT.georgiyName})   ·   +38 (097) 454-15-11 (${pdfT.borisName})`,
        W - PAD,
        H - 76
      );
    } else if (pageDesc.type === 'divider') {
      ctx.fillStyle = GRAPHITE;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = GREY;
      ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CARDIO FOOTWEAR // LOOKBOOK 2026', PAD, 76);

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
      ctx.fillText(`${pageDesc.count} MODELS FEATURED`, PAD, H - 78);

      ctx.textAlign = 'right';
      ctx.fillText('SIZES 40—45', W - PAD, H - 78);
    } else if (pageDesc.type === 'product') {
      const { shoe, priceUsd, season } = pageDesc.item;
      const catUpper = getLocalizedCategory(shoe.category, lang).toUpperCase();
      const colorUpper = getLocalizedColor(shoe.color, lang).toUpperCase();
      const featuresUpper = shoe.features.map((f) => getLocalizedFeature(f, lang).toUpperCase());

      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);

      drawEditorialWatermark(ctx, W, H, clientCode, shoe.modelNumber);

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

      ctx.fillStyle = '#DFDBD2';
      ctx.font = '400 164px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText(`№ ${shoe.modelNumber}`, PAD - 4, 265);

      const rawShoeImg = await loadImageElement(shoe.image);
      if (rawShoeImg) {
        const seamlessCanvas = prepareSeamlessShoeCanvas(rawShoeImg);
        const stageTop = 180;
        const stageHeight = 1030;
        const maxShoeW = CONTENT_W - 20;
        const maxShoeH = 850;

        const scale = Math.min(
          maxShoeW / Math.max(1, seamlessCanvas.width),
          maxShoeH / Math.max(1, seamlessCanvas.height)
        );
        const drawW = seamlessCanvas.width * scale;
        const drawH = seamlessCanvas.height * scale;
        const drawX = PAD + (CONTENT_W - drawW) / 2;
        const drawY = stageTop + (stageHeight - drawH) / 2;

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

        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(seamlessCanvas, drawX, drawY, drawW, drawH);
        ctx.restore();
      }

      const specTopY = 1270;

      ctx.strokeStyle = GRAPHITE;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(PAD, specTopY);
      ctx.lineTo(W - PAD, specTopY);
      ctx.stroke();

      ctx.fillStyle = GREY;
      ctx.font = '600 13px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(pdfT.modelLabel, PAD, specTopY + 38);

      ctx.textAlign = 'right';
      ctx.fillText(pdfT.priceLabel, W - PAD, specTopY + 38);

      const variantTitle = shoe.variant ? `  ·  ${shoe.variant}` : '';
      ctx.fillStyle = GRAPHITE;
      ctx.font = '400 68px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText(`№ ${shoe.modelNumber}${variantTitle}`, PAD, specTopY + 114);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '400 68px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'right';
      ctx.fillText(`$${priceUsd}`, W - PAD, specTopY + 114);

      const matrixTopY = specTopY + 150;
      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, matrixTopY);
      ctx.lineTo(W - PAD, matrixTopY);
      ctx.stroke();

      const col1X = PAD;
      const col2X = PAD + 420;
      const matrixBottomY = matrixTopY + 168;

      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(col2X - 40, matrixTopY + 22);
      ctx.lineTo(col2X - 40, matrixBottomY - 22);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = GREY;
      ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.colorMaterialLabel, col1X, matrixTopY + 42);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 24px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(colorUpper, col1X, matrixTopY + 86);

      ctx.fillStyle = GREY;
      ctx.font = '500 14px "Inter", "Helvetica Neue", Arial, sans-serif';
      const featLine = featuresUpper.length > 0 ? featuresUpper.join('  ·  ') : pdfT.naturalLeather;
      ctx.fillText(featLine.slice(0, 52), col1X, matrixTopY + 122);

      ctx.fillStyle = GREY;
      ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.sizeRangeLabel, col2X, matrixTopY + 42);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 32px "Playfair Display", Georgia, serif';
      ctx.fillText('40 — 45', col2X, matrixTopY + 88);

      ctx.fillStyle = GREY;
      ctx.font = '500 14px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.fullSizeScale, col2X, matrixTopY + 122);

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
        `CARDIO FOOTWEAR  ·  LOOKBOOK 2026  ·  ${clientCode}`,
        PAD,
        H - 72
      );

      ctx.textAlign = 'right';
      ctx.fillText(
        `+38 (067) 719-37-16 (${pdfT.georgiyName})   ·   +38 (097) 454-15-11 (${pdfT.borisName})`,
        W - PAD,
        H - 72
      );
    } else if (pageDesc.type === 'contacts') {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);

      drawEditorialWatermark(ctx, W, H, clientCode);

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

      const contactsList = [
        { name: pdfT.georgiyName, phone: '+38 (067) 719-37-16', telUri: 'tel:+380677193716' },
        { name: pdfT.borisName, phone: '+38 (097) 454-15-11', telUri: 'tel:+380974541511' },
      ];

      const pageAnnotsList: Array<{ rect: [number, number, number, number]; uri: string }> = [];

      contactsList.forEach((c, idx) => {
        const cY = 510 + idx * 220;
        ctx.strokeStyle = GRAPHITE;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(PAD, cY, CONTENT_W, 180);

        ctx.fillStyle = GREY;
        ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(pdfT.managerRole, PAD + 40, cY + 52);

        ctx.fillStyle = GRAPHITE;
        ctx.font = '400 38px "Playfair Display", Georgia, serif';
        ctx.fillText(c.name, PAD + 40, cY + 115);

        ctx.fillStyle = '#1D4ED8'; // Кликабельный синий цвет для телефона
        ctx.font = '700 28px "Inter", "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(c.phone, W - PAD - 40, cY + 112);

        // Добавляем PDF Annotation для телефона (конвертация координат Canvas в PDF points)
        const boxX1 = (W - PAD - 40 - 240) * (595.28 / W);
        const boxY1 = 841.89 - ((cY + 140) * (841.89 / H));
        const boxX2 = (W - PAD - 40) * (595.28 / W);
        const boxY2 = 841.89 - ((cY + 70) * (841.89 / H));
        pageAnnotsList.push({ rect: [boxX1, boxY1, boxX2, boxY2], uri: c.telUri });
      });

      // Блок Instagram ссылки
      const igBoxY = 970;
      ctx.strokeStyle = METALLIC;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(PAD, igBoxY, CONTENT_W, 100);

      ctx.fillStyle = '#E1306C'; // Фирменный цвет Instagram
      ctx.font = '700 24px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pdfT.instagramLabel, W / 2, igBoxY + 60);

      const igX1 = (PAD + CONTENT_W / 2 - 200) * (595.28 / W);
      const igY1 = 841.89 - ((igBoxY + 90) * (841.89 / H));
      const igX2 = (PAD + CONTENT_W / 2 + 200) * (595.28 / W);
      const igY2 = 841.89 - ((igBoxY + 10) * (841.89 / H));
      pageAnnotsList.push({ rect: [igX1, igY1, igX2, igY2], uri: 'https://instagram.com/cardio_shoes' });

      if (pageAnnotsList.length > 0) {
        pageAnnotations.set(pageIdx, pageAnnotsList);
      }

      ctx.fillStyle = GREY;
      ctx.font = '400 20px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      drawWrappedText(ctx, pdfT.shippingNote, PAD, 1120, CONTENT_W, 34);

      ctx.strokeStyle = GRAPHITE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PAD, H - 110);
      ctx.lineTo(W - PAD, H - 110);
      ctx.stroke();

      ctx.fillStyle = GRAPHITE;
      ctx.font = '400 26px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText('CARDIO FOOTWEAR  ·  2026', PAD, H - 65);

      ctx.fillStyle = GREY;
      ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('KHARKIV, UKRAINE', W - PAD, H - 65);
    }

    ctx.restore();
    jpegPages.push(canvas.toDataURL('image/jpeg', 0.75));
  }

  // =======================================================================
  // ФАЗА 2: СБОРКА PDF 1.7 И ДОСТАВКА
  // =======================================================================
  onStageChange('packaging_and_uploading');
  await new Promise((r) => setTimeout(r, 80));

  const pdfBytes = buildPdfBytesFromJpegPages(
    jpegPages,
    OUT_W,
    OUT_H,
    595.28,
    841.89,
    outlinesList,
    pageAnnotations
  );

  const localBlob = new Blob([pdfBytes], { type: 'application/pdf' });
  const pdfBase64 = uint8ArrayToBase64(pdfBytes);
  const fileName = `CARDIO_LOOKBOOK_2026_${lang.toUpperCase()}.pdf`;

  let deliveryError: string | null = null;

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_pdf',
        pdfBase64,
        fileName,
        chatId: tgUser.id,
        caption: `📘 CARDIO FOOTWEAR — OFFICIAL LOOKBOOK 2026 (${totalPages} стр. А4, PDF 1.7)\n🔒 ${securityNote}`,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const statusObj: PdfDeliveryStatus = {
        sentToTelegram: Boolean(data?.sentToTelegram),
        downloadUrl: data?.downloadPath,
        localBlob,
        previewPages: jpegPages,
        fileName,
        totalPages,
      };

      const isAndroid =
        typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
      if (isAndroid && statusObj.downloadUrl) {
        await triggerPdfDownload(statusObj);
      }

      return { status: statusObj, error: null };
    } else {
      deliveryError = `HTTP ${res.status}`;
    }
  } catch (err) {
    deliveryError = err instanceof Error ? err.message : 'Network error';
  }

  const fallbackStatus: PdfDeliveryStatus = {
    sentToTelegram: false,
    localBlob,
    previewPages: jpegPages,
    fileName,
    totalPages,
  };
  return { status: fallbackStatus, error: deliveryError };
}
