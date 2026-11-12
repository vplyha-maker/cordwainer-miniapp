/**
 * @file src/components/wholesale/pdfLookbookEngine.ts
 * @description Автономный графический движок генерации журнального PDF-лукбука А4 (Editorial Lookbook)
 * стандарта PDF 1.7 с интерактивными закладками (Outlines), кликабельными ссылками (Instagram, Tel),
 * невидимым текстовым слоем для Android Linkify и интерактивным превью внутри приложения.
 *
 * Luxury Fashion Editorial 2026 — European fashion-house aesthetic.
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

/** Интерактивная зона на странице (в виртуальных координатах 1240x1754) */
interface InteractiveHitBox {
  x: number;
  y: number;
  w: number;
  h: number;
  uri: string;
  textFallback: string;
}

/**
 * Безопасное получение инстанса Telegram WebApp из глобального объекта window.
 */
export function getTgWebApp(): TgWebAppExtended | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Telegram?: { WebApp?: TgWebAppExtended } }).Telegram?.WebApp;
}

/**
 * Извлекает Telegram ID клиента и формирует персональный код для водяных знаков.
 */
export function getTelegramUserInfo(): { id?: number; clientCode: string; partnerCode: string } {
  try {
    const u = getTgWebApp()?.initDataUnsafe?.user;
    if (u?.id) {
      const code = 'CLIENT-' + String(u.id);
      return {
        id: u.id,
        clientCode: code,
        partnerCode: code,
      };
    }
  } catch {}
  return {
    clientCode: 'CARDIO-OFFICIAL',
    partnerCode: 'CARDIO-OFFICIAL',
  };
}

/**
 * Открывает внешнюю ссылку или вызывает набор телефонного номера в Telegram Mini App и браузере.
 */
function executeInteractiveUri(uri: string): void {
  if (typeof window === 'undefined') return;
  const tg = getTgWebApp();

  if (uri.startsWith('tel:')) {
    try {
      const a = document.createElement('a');
      a.href = uri;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.location.href = uri;
    }
    return;
  }

  if (typeof tg?.openLink === 'function') {
    try {
      tg.openLink(uri);
      return;
    } catch {}
  }

  window.open(uri, '_blank', 'noopener,noreferrer');
}

// Хранилище интерактивных зон для встроенного просмотра (`previewPages`) внутри приложения
let activePreviewListener: ((e: MouseEvent) => void) | null = null;

/**
 * Делает обычные <img> страницы во встроенном превью (`previewPages`) кликабельными
 * без необходимости менять React-компоненты модального окна.
 */
function bindInteractivePreviewClicks(
  jpegPages: string[],
  pageHitBoxes: Map<number, InteractiveHitBox[]>,
  virtualW: number,
  virtualH: number
): void {
  if (typeof document === 'undefined') return;

  if (activePreviewListener) {
    document.removeEventListener('click', activePreviewListener, true);
  }

  activePreviewListener = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target || target.tagName !== 'IMG') return;

    const imgEl = target as HTMLImageElement;
    const src = imgEl.src;
    if (!src || !src.startsWith('data:image/jpeg')) return;

    const pageIndex = jpegPages.indexOf(src);
    if (pageIndex === -1) return;

    const boxes = pageHitBoxes.get(pageIndex);
    if (!boxes || boxes.length === 0) return;

    const rect = imgEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const clickX = ((e.clientX - rect.left) / rect.width) * virtualW;
    const clickY = ((e.clientY - rect.top) / rect.height) * virtualH;

    for (const box of boxes) {
      if (
        clickX >= box.x &&
        clickX <= box.x + box.w &&
        clickY >= box.y &&
        clickY <= box.y + box.h
      ) {
        e.preventDefault();
        e.stopPropagation();
        executeInteractiveUri(box.uri);
        return;
      }
    }
  };

  document.addEventListener('click', activePreviewListener, true);
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
 * и оставляет чистый белый фон вокруг объекта для бесшовного наложения.
 */
function prepareSeamlessShoeCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const srcW = img.naturalWidth || img.width || 800;
  const srcH = img.naturalHeight || img.height || 600;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = srcW;
  tempCanvas.height = srcH;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) return tempCanvas;

  tempCtx.fillStyle = '#FFFFFF';
  tempCtx.fillRect(0, 0, srcW, srcH);
  tempCtx.drawImage(img, 0, 0, srcW, srcH);

  let imgData: ImageData;
  try {
    imgData = tempCtx.getImageData(0, 0, srcW, srcH);
  } catch {
    return tempCanvas;
  }
  const data = imgData.data;

  let minX = srcW;
  let minY = srcH;
  let maxX = 0;
  let maxY = 0;

  const THRESHOLD = 248;
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const idx = (y * srcW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a > 12 && (r < THRESHOLD || g < THRESHOLD || b < THRESHOLD)) {
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

  const padX = Math.round((maxX - minX) * 0.045);
  const padY = Math.round((maxY - minY) * 0.045);
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

  ctx.fillStyle = 'rgba(23, 23, 23, 0.032)';
  ctx.font = '700 42px "Inter", "Helvetica Neue", Arial, sans-serif';
  const wmLine = 'CARDIO FOOTWEAR   ·   ' + clientCode + '   ·   LOOKBOOK 2026';

  ctx.fillText(wmLine, 0, -300);
  ctx.fillText(wmLine, 0, 0);
  ctx.fillText(wmLine, 0, 300);

  if (modelNumber) {
    ctx.fillStyle = 'rgba(23, 23, 23, 0.028)';
    ctx.font = '400 64px "Playfair Display", Georgia, serif';
    const modelLine = 'CARDIO ORIGINAL  //  MODEL №' + modelNumber;
    ctx.fillText(modelLine, 0, -150);
    ctx.fillText(modelLine, 0, 150);
  }

  ctx.restore();
}

/**
 * Утилита автоматического переноса длинных строк текста по словам на Canvas.
 * Возвращает финальный Y после последней строки.
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
 * Получение локализованных текстов лукбука (без упоминания B2B, коробов и палет).
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
        tocAutumn: 'Колекція «Осінь 2026»',
        tocWinter: 'Колекція «Зима 2026»',
        tocContacts: 'Контакти та замовлення',
        seasonAutumnLabel: 'КОЛЕКЦІЯ ОСІНЬ 2026',
        seasonWinterLabel: 'КОЛЕКЦІЯ ЗИМА 2026',
        autumnChapter: 'РОЗДІЛ І  ·  СЕЗОН ОСІНЬ',
        winterChapter: 'РОЗДІЛ ІІ  ·  СЕЗОН ЗИМА',
        autumnSub: 'Демісезонна лінійка з натуральної шкіри та нубуку',
        winterSub: 'Утеплені моделі на натуральній вовні',
        modelLabel: 'МОДЕЛЬНИЙ РЯД',
        priceLabel: 'ЦІНА ЗА ПАРУ',
        colorMaterialLabel: 'КОЛІР ТА МАТЕРІАЛ',
        sizeRangeLabel: 'РОЗМІРНА СІТКА',
        fullSizeScale: 'Повна повнота (40—45)',
        naturalLeather: '100% Натуральна шкіра / єврозима',
        contactsPageSub: 'ЗВ’ЯЗОК З ВИРОБНИКОМ ТА ЗАМОВЛЕННЯ',
        contactsPageTitle: 'Контакти та підтримка',
        managerRole: 'ПРЕМІУМ-КОНСУЛЬТАНТ ФАБРИКИ',
        tapToCall: 'НАТИСНІТЬ ДЛЯ ДЗВІНКА  ↗',
        georgiyName: 'Георгій',
        borisName: 'Борис',
        instagramLabel: 'Instagram: @cardio_shoes',
        instagramSub: 'НАТИСНІТЬ, ЩОБ ПЕРЕЙТИ В ПРОФІЛЬ  ·  instagram.com/cardio_shoes',
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
        tapToCall: 'ZUM ANRUFEN TIPPEN  ↗',
        georgiyName: 'Georgiy',
        borisName: 'Boris',
        instagramLabel: 'Instagram: @cardio_shoes',
        instagramSub: 'PROFIL ÖFFNEN  ·  instagram.com/cardio_shoes',
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
        tocAutumn: 'Коллекция «Осень 2026»',
        tocWinter: 'Коллекция «Зима 2026»',
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
        contactsPageSub: 'СВЯЗЬ С ПРОИЗВОДИТЕЛЬСТВОМ И ЗАКАЗ',
        contactsPageTitle: 'Контакты и поддержка',
        managerRole: 'ПРЕМИУМ-КОНСУЛЬТАНТ ФАБРИКИ',
        tapToCall: 'НАЖМИТЕ ДЛЯ ЗВОНКА  ↗',
        georgiyName: 'Георгий',
        borisName: 'Борис',
        instagramLabel: 'Instagram: @cardio_shoes',
        instagramSub: 'НАЖМИТЕ ДЛЯ ПЕРЕХОДА В ПРОФИЛЬ  ·  instagram.com/cardio_shoes',
        shippingNote:
          'Быстрая доставка заказов по всей Украине и за рубеж. Гарантия качества от производителя.',
      };
  }
}

/**
 * Кодирует любую строку (включая кириллицу) в стандартный PDF 1.7 UTF-16BE Hex формат с BOM (<FEFF...>).
 */
function toPdfUtf16Hex(str: string): string {
  let hex = 'FEFF';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    hex += code.toString(16).toUpperCase().padStart(4, '0');
  }
  return '<' + hex + '>';
}

/**
 * Низкоуровневый сборщик бинарного файла формата PDF 1.7
 * с поддержкой интерактивных закладок (Outlines), метаданных (/Info),
 * прямых массивов ссылок (/Annots) и невидимого текстового слоя (BT 3 Tr ... ET) для Android Linkify.
 */
function buildPdfBytesFromJpegPages(
  jpegDataUrls: string[],
  imgW: number,
  imgH: number,
  virtualW: number,
  virtualH: number,
  pageWidthPt = 595.28,
  pageHeightPt = 841.89,
  outlines?: Array<{ title: string; pageIndex: number }>,
  pageHitBoxes?: Map<number, InteractiveHitBox[]>
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
    pushStr(String(id) + ' 0 obj\n');
  };

  const endObj = () => {
    pushStr('\nendobj\n');
  };

  const pageCount = jpegDataUrls.length;

  let nextObjId = 5;
  const fontObjId = 4;

  const pageObjIds: number[] = [];
  const contentObjIds: number[] = [];
  const imgObjIds: number[] = [];
  const annotItemObjIds: number[][] = [];

  for (let i = 0; i < pageCount; i++) {
    pageObjIds.push(nextObjId++);
    contentObjIds.push(nextObjId++);
    imgObjIds.push(nextObjId++);

    const boxes = pageHitBoxes?.get(i);
    if (boxes && boxes.length > 0) {
      const itemIds: number[] = [];
      for (let a = 0; a < boxes.length; a++) {
        itemIds.push(nextObjId++);
      }
      annotItemObjIds.push(itemIds);
    } else {
      annotItemObjIds.push([]);
    }
  }

  const outlineRootId = outlines && outlines.length > 0 ? nextObjId++ : null;
  const outlineItemIds: number[] = [];
  if (outlines && outlines.length > 0) {
    for (let o = 0; o < outlines.length; o++) {
      outlineItemIds.push(nextObjId++);
    }
  }

  // Заголовок PDF 1.7 с бинарным маркером
  pushStr('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n');

  // Obj 1: Catalog
  startObj(1);
  let catalogDict = '<< /Type /Catalog /Pages 2 0 R';
  if (outlineRootId !== null) {
    catalogDict += ' /Outlines ' + String(outlineRootId) + ' 0 R /PageMode /UseOutlines';
  }
  catalogDict += ' >>';
  pushStr(catalogDict);
  endObj();

  // Obj 2: Pages Root
  startObj(2);
  const kidsRefs = pageObjIds.map((id) => String(id) + ' 0 R').join(' ');
  pushStr('<< /Type /Pages /Kids [' + kidsRefs + '] /Count ' + String(pageCount) + ' >>');
  endObj();

  // Obj 3: Info Metadata
  startObj(3);
  pushStr(
    '<< /Title ' +
      toPdfUtf16Hex('CARDIO FOOTWEAR — Official Lookbook 2026') +
      ' /Author ' +
      toPdfUtf16Hex('CARDIO Footwear (@cardio_shoes)') +
      ' /Subject ' +
      toPdfUtf16Hex('Autumn & Winter Footwear Collection 2026') +
      ' /Creator ' +
      toPdfUtf16Hex('CARDIO Editorial PDF 1.7 Engine') +
      ' /Producer ' +
      toPdfUtf16Hex('CARDIO PDF 1.7 Native Builder') +
      ' >>'
  );
  endObj();

  // Obj 4: Встроенный шрифт Helvetica для невидимого поискового/ссылочного слоя
  startObj(fontObjId);
  pushStr('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  endObj();

  // Закладки (Outlines)
  if (outlineRootId !== null && outlines) {
    startObj(outlineRootId);
    const firstOutlineId = outlineItemIds[0];
    const lastOutlineId = outlineItemIds[outlineItemIds.length - 1];
    pushStr(
      '<< /Type /Outlines /First ' +
        String(firstOutlineId) +
        ' 0 R /Last ' +
        String(lastOutlineId) +
        ' 0 R /Count ' +
        String(outlines.length) +
        ' >>'
    );
    endObj();

    for (let o = 0; o < outlines.length; o++) {
      const item = outlines[o];
      const itemId = outlineItemIds[o];
      const prevId = o > 0 ? outlineItemIds[o - 1] : null;
      const nextId = o < outlines.length - 1 ? outlineItemIds[o + 1] : null;
      const targetPageObjId = pageObjIds[item.pageIndex] || pageObjIds[0];

      let itemDict =
        '<< /Title ' +
        toPdfUtf16Hex(item.title) +
        ' /Parent ' +
        String(outlineRootId) +
        ' 0 R';
      if (prevId !== null) itemDict += ' /Prev ' + String(prevId) + ' 0 R';
      if (nextId !== null) itemDict += ' /Next ' + String(nextId) + ' 0 R';
      itemDict +=
        ' /Dest [' +
        String(targetPageObjId) +
        ' 0 R /XYZ 0 ' +
        pageHeightPt.toFixed(2) +
        ' null] >>';

      startObj(itemId);
      pushStr(itemDict);
      endObj();
    }
  }

  // Страницы, потоки контента, изображения и интерактивные ссылки
  for (let i = 0; i < pageCount; i++) {
    const pageObjId = pageObjIds[i];
    const contentObjId = contentObjIds[i];
    const imgObjId = imgObjIds[i];
    const itemIds = annotItemObjIds[i];
    const boxes = pageHitBoxes?.get(i) || [];

    const base64 = jpegDataUrls[i].split(',')[1] || '';
    const binaryStr = atob(base64);
    const imgBytes = new Uint8Array(binaryStr.length);
    for (let k = 0; k < binaryStr.length; k++) {
      imgBytes[k] = binaryStr.charCodeAt(k);
    }

    let textLayerStream = '';
    const pdfRects: Array<[string, string, string, string]> = [];

    for (let a = 0; a < boxes.length; a++) {
      const b = boxes[a];
      const llx = (b.x * (pageWidthPt / virtualW)).toFixed(2);
      const urx = ((b.x + b.w) * (pageWidthPt / virtualW)).toFixed(2);
      const ury = (pageHeightPt - b.y * (pageHeightPt / virtualH)).toFixed(2);
      const lly = (pageHeightPt - (b.y + b.h) * (pageHeightPt / virtualH)).toFixed(2);
      pdfRects.push([llx, lly, urx, ury]);

      const textX = (Number(llx) + 12).toFixed(2);
      const textY = (Number(lly) + (Number(ury) - Number(lly)) * 0.35).toFixed(2);
      const safeAsciiText = b.textFallback.replace(/[()\\]/g, '');
      textLayerStream +=
        '\nBT 3 Tr /F1 16 Tf ' + textX + ' ' + textY + ' Td (' + safeAsciiText + ') Tj ET';
    }

    const contentStream =
      'q\n' +
      pageWidthPt.toFixed(2) +
      ' 0 0 ' +
      pageHeightPt.toFixed(2) +
      ' 0 0 cm\n/Im' +
      String(i) +
      ' Do\nQ' +
      textLayerStream;

    // Page Object
    startObj(pageObjId);
    let pageDict =
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' +
      pageWidthPt.toFixed(2) +
      ' ' +
      pageHeightPt.toFixed(2) +
      '] /Resources << /XObject << /Im' +
      String(i) +
      ' ' +
      String(imgObjId) +
      ' 0 R >> /Font << /F1 ' +
      String(fontObjId) +
      ' 0 R >> >> /Contents ' +
      String(contentObjId) +
      ' 0 R';

    if (itemIds.length > 0) {
      const annotRefs = itemIds.map((id) => String(id) + ' 0 R').join(' ');
      pageDict += ' /Annots [' + annotRefs + ']';
    }
    pageDict += ' >>';
    pushStr(pageDict);
    endObj();

    // Content Stream
    startObj(contentObjId);
    pushStr(
      '<< /Length ' +
        String(contentStream.length) +
        ' >>\nstream\n' +
        contentStream +
        '\nendstream'
    );
    endObj();

    // Image XObject
    startObj(imgObjId);
    pushStr(
      '<< /Type /XObject /Subtype /Image /Width ' +
        String(imgW) +
        ' /Height ' +
        String(imgH) +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
        String(imgBytes.length) +
        ' >>\nstream\n'
    );
    pushBytes(imgBytes);
    pushStr('\nendstream');
    endObj();

    // Объекты интерактивных ссылок (/Annot /Subtype /Link с флагом /F 4)
    for (let a = 0; a < boxes.length; a++) {
      const box = boxes[a];
      const [llx, lly, urx, ury] = pdfRects[a];
      startObj(itemIds[a]);
      pushStr(
        '<< /Type /Annot /Subtype /Link /F 4 /Rect [' +
          llx +
          ' ' +
          lly +
          ' ' +
          urx +
          ' ' +
          ury +
          '] /Border [0 0 0] /BS << /W 0 >> /H /I /A << /Type /Action /S /URI /URI (' +
          box.uri +
          ') >> >>'
      );
      endObj();
    }
  }

  const totalObjects = nextObjId;
  const xrefOffset = currentOffset;
  pushStr('xref\n0 ' + String(totalObjects) + '\n0000000000 65535 f \n');
  for (let id = 1; id < totalObjects; id++) {
    const off = String(offsets[id] || 0).padStart(10, '0');
    pushStr(off + ' 00000 n \n');
  }
  pushStr(
    'trailer\n<< /Size ' +
      String(totalObjects) +
      ' /Root 1 0 R /Info 3 0 R >>\nstartxref\n' +
      String(xrefOffset) +
      '\n%%EOF'
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
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {}
}

/**
 * Сохранение готового PDF-файла с приоритетом локального Blob в памяти клиента
 */
export async function triggerPdfDownload(status: {
  downloadUrl?: string;
  localBlob?: Blob;
  fileName: string;
}): Promise<void> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (typeof navigator !== 'undefined' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1);

  const stamp = String(Date.now()).slice(-4);
  const baseName = status.fileName.toLowerCase().endsWith('.pdf')
    ? status.fileName.slice(0, -4)
    : status.fileName;
  const uniqueFileName = `${baseName}_${stamp}.pdf`;

  // ——— 1. iOS: системный Share (самый надёжный способ)
  if (isIOS && status.localBlob) {
    try {
      const file = new File([status.localBlob], status.fileName, {
        type: 'application/pdf',
      });
      const nav = navigator as Navigator & {
        canShare?: (d: { files?: File[] }) => boolean;
      };
      if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({ files: [file], title: status.fileName });
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
    }
  }

  // ——— 2. Главный путь — localBlob (файл уже есть в памяти, сеть не нужна)
  if (status.localBlob) {
    try {
      const blobUrl = URL.createObjectURL(status.localBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = uniqueFileName;
      a.style.display = 'none';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Освобождаем память чуть позже
      setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
      return;
    } catch (e) {
      console.warn('localBlob download failed', e);
    }
  }

  // ——— 3. Запасной путь — серверный URL (если blob по какой-то причине нет)
  if (status.downloadUrl) {
    const baseFullUrl = status.downloadUrl.startsWith('http')
      ? status.downloadUrl
      : window.location.origin + status.downloadUrl;
    const freshUrl = baseFullUrl + (baseFullUrl.includes('?') ? '&' : '?') + '_dl=' + Date.now();

    const tg = getTgWebApp();
    if (typeof tg?.downloadFile === 'function') {
      try {
        tg.downloadFile(
          { url: freshUrl, file_name: uniqueFileName },
          (accepted) => {
            if (!accepted) {
              // если Telegram отказал — пробуем обычный anchor
              triggerAnchorDownload(freshUrl, uniqueFileName);
            }
          }
        );
        return;
      } catch {
        // fall through
      }
    }

    triggerAnchorDownload(freshUrl, uniqueFileName);
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
 * активирует кликабельные зоны во встроенном просмотре и отправляет копию в Telegram.
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
  const PAD = 88;
  const CONTENT_W = W - PAD * 2;

  // Luxury editorial palette
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
    | {
        type: 'product';
        item: FullCatalogPriceItem;
        indexInCatalog: number;
        layoutVariant: 0 | 1 | 2;
      }
    | { type: 'contacts' };

  const pagePlan: PageDescriptor[] = [{ type: 'cover' }, { type: 'manifesto' }];

  const outlinesList: Array<{ title: string; pageIndex: number }> = [
    { title: 'Обложка CARDIO 2026', pageIndex: 0 },
    { title: pdfT.tocTitle, pageIndex: 1 },
  ];

  let globalProdIdx = 1;
  let layoutCycle = 0;

  if (includeAutumn && autumnItems.length > 0) {
    const autumnDividerIndex = pagePlan.length;
    pagePlan.push({ type: 'divider', season: 'autumn', count: autumnItems.length });
    outlinesList.push({ title: pdfT.tocAutumn, pageIndex: autumnDividerIndex });
    for (const item of autumnItems) {
      pagePlan.push({
        type: 'product',
        item,
        indexInCatalog: globalProdIdx++,
        layoutVariant: (layoutCycle++ % 3) as 0 | 1 | 2,
      });
    }
  }
  if (includeWinter && winterItems.length > 0) {
    const winterDividerIndex = pagePlan.length;
    pagePlan.push({ type: 'divider', season: 'winter', count: winterItems.length });
    outlinesList.push({ title: pdfT.tocWinter, pageIndex: winterDividerIndex });
    for (const item of winterItems) {
      pagePlan.push({
        type: 'product',
        item,
        indexInCatalog: globalProdIdx++,
        layoutVariant: (layoutCycle++ % 3) as 0 | 1 | 2,
      });
    }
  }

  const contactsPageIndex = pagePlan.length;
  pagePlan.push({ type: 'contacts' });
  outlinesList.push({ title: pdfT.tocContacts, pageIndex: contactsPageIndex });

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
  const pageHitBoxes = new Map<number, InteractiveHitBox[]>();

  const footerPhoneBoxes: InteractiveHitBox[] = [
    {
      x: W / 2,
      y: H - 108,
      w: (W - PAD - W / 2) / 2,
      h: 58,
      uri: 'tel:+380677193716',
      textFallback: '+380677193716',
    },
    {
      x: W / 2 + (W - PAD - W / 2) / 2,
      y: H - 108,
      w: (W - PAD - W / 2) / 2,
      h: 58,
      uri: 'tel:+380974541511',
      textFallback: '+380974541511',
    },
  ];

  const footerPhonesLine =
    '+38 (067) 719-37-16 (' +
    pdfT.georgiyName +
    ')   ·   +38 (097) 454-15-11 (' +
    pdfT.borisName +
    ')';

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    onPageProgress(pageIdx + 1, totalPages);
    await new Promise((r) => setTimeout(r, 0));

    const pageDesc = pagePlan[pageIdx];
    const pageNumStr =
      String(pageIdx + 1).padStart(2, '0') + ' / ' + String(totalPages).padStart(2, '0');

    const canvas = document.createElement('canvas');
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.save();
    ctx.scale(SCALE_FACTOR, SCALE_FACTOR);

    // =====================================================================
    // COVER — Fashion magazine cover
    // =====================================================================
    if (pageDesc.type === 'cover') {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);

      drawEditorialWatermark(ctx, W, H, clientCode);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CARDIO FOOTWEAR  ·  MANUFACTURING EST.', PAD, 72);

      ctx.fillStyle = GREY;
      ctx.textAlign = 'right';
      ctx.fillText('KHARKIV  ·  LOOKBOOK 2026', W - PAD, 72);

      ctx.strokeStyle = GRAPHITE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PAD, 92);
      ctx.lineTo(W - PAD, 92);
      ctx.stroke();

      if (coverBannerCropped) {
        const availW = CONTENT_W - 40;
        const availH = 620;
        const scale = Math.min(
          availW / Math.max(1, coverBannerCropped.width),
          availH / Math.max(1, coverBannerCropped.height)
        );
        const drawW = coverBannerCropped.width * scale;
        const drawH = coverBannerCropped.height * scale;
        const drawX = PAD + (CONTENT_W - drawW) / 2;
        const drawY = 160 + (availH - drawH) / 2;

        ctx.save();
        ctx.translate(W / 2, drawY + drawH + 18);
        ctx.scale(1, 0.055);
        const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, drawW * 0.48);
        grad.addColorStop(0, 'rgba(23, 23, 23, 0.18)');
        grad.addColorStop(0.55, 'rgba(23, 23, 23, 0.05)');
        grad.addColorStop(1, 'rgba(23, 23, 23, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, drawW * 0.48, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.97;
        ctx.drawImage(coverBannerCropped, drawX, drawY, drawW, drawH);
        ctx.restore();
      }

      const brandY = 920;

      ctx.fillStyle = GRAPHITE;
      ctx.font = '400 148px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('CARDIO', W / 2, brandY);

      ctx.fillStyle = GREY;
      ctx.font = '700 20px "Inter", "Helvetica Neue", Arial, sans-serif';
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0.35em';
      ctx.fillText('F O O T W E A R', W / 2, brandY + 42);
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';

      ctx.strokeStyle = GRAPHITE;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 72, brandY + 72);
      ctx.lineTo(W / 2 + 72, brandY + 72);
      ctx.stroke();

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 22px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText('BUILT TO LEAD. ENGINEERED FOR EVERY STEP.', W / 2, brandY + 118);

      ctx.fillStyle = METALLIC;
      ctx.font = '600 16px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(coverSloganLocal, W / 2, brandY + 152);

      const bottomY = 1380;
      ctx.strokeStyle = GRAPHITE;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(PAD, bottomY);
      ctx.lineTo(W - PAD, bottomY);
      ctx.stroke();

      ctx.fillStyle = METALLIC;
      ctx.font = '600 13px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('AUTUMN & WINTER SEASONS  ·  SIZES 40—45', PAD, bottomY + 42);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '400 48px "Playfair Display", Georgia, serif';
      ctx.fillText('OFFICIAL LOOKBOOK 2026', PAD, bottomY + 108);

      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, bottomY + 148);
      ctx.lineTo(W - PAD, bottomY + 148);
      ctx.stroke();

      ctx.fillStyle = GREY;
      ctx.font = '500 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('DIRECT FACTORY COLLECTION  ·  @CARDIO_SHOES', PAD, H - 72);

      ctx.textAlign = 'right';
      ctx.fillText(pageNumStr, W - PAD, H - 72);
    }

    // =====================================================================
    // MANIFESTO / EDITORIAL INTRODUCTION
    // =====================================================================
    else if (pageDesc.type === 'manifesto') {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);

      drawEditorialWatermark(ctx, W, H, clientCode);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CARDIO FOOTWEAR', PAD, 72);

      ctx.fillStyle = GREY;
      ctx.textAlign = 'center';
      ctx.fillText(pdfT.edition, W / 2, 72);

      ctx.textAlign = 'right';
      ctx.fillText(pageNumStr, W - PAD, 72);

      ctx.strokeStyle = GRAPHITE;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(PAD, 92);
      ctx.lineTo(W - PAD, 92);
      ctx.stroke();

      ctx.fillStyle = METALLIC;
      ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('01  ·  EDITORIAL INTRODUCTION', PAD, 160);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '400 46px "Playfair Display", Georgia, serif';
      ctx.fillText(pdfT.overviewTitle, PAD, 230);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '400 24px "Playfair Display", Georgia, serif';
      const nextY = drawWrappedText(ctx, pdfT.manifestoLead, PAD, 310, CONTENT_W, 38);

      ctx.fillStyle = GREY;
      ctx.font = '400 18px "Inter", "Helvetica Neue", Arial, sans-serif';
      drawWrappedText(ctx, pdfT.manifestoBody, PAD, nextY + 28, CONTENT_W, 30);

      const tocY = 620;
      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, tocY);
      ctx.lineTo(W - PAD, tocY);
      ctx.stroke();

      ctx.fillStyle = METALLIC;
      ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText('02  ·  ' + pdfT.tocTitle, PAD, tocY + 48);

      const tocRows = [
        { title: pdfT.tocAutumn, meta: String(autumnItems.length) + ' MODELS' },
        { title: pdfT.tocWinter, meta: String(winterItems.length) + ' MODELS' },
        { title: pdfT.tocContacts, meta: 'KHARKIV DIRECT' },
      ];

      tocRows.forEach((row, idx) => {
        const rY = tocY + 110 + idx * 78;
        ctx.fillStyle = GRAPHITE;
        ctx.font = '400 24px "Playfair Display", Georgia, serif';
        ctx.textAlign = 'left';
        ctx.fillText(row.title, PAD, rY);

        ctx.fillStyle = GREY;
        ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(row.meta, W - PAD, rY);

        ctx.strokeStyle = RULE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD, rY + 24);
        ctx.lineTo(W - PAD, rY + 24);
        ctx.stroke();
      });

      const boxSecY = 1020;
      ctx.fillStyle = METALLIC;
      ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('03  ·  BRAND STANDARDS', PAD, boxSecY);

      ctx.strokeStyle = GRAPHITE;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(PAD, boxSecY + 28, CONTENT_W, 148);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 16px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText('100% NATURAL MATERIALS & MEMORY COMFORT', PAD + 28, boxSecY + 78);

      ctx.fillStyle = GREY;
      ctx.font = '400 18px "Playfair Display", Georgia, serif';
      ctx.fillText(
        'Selected premium natural leather, reinforced anatomical soles.',
        PAD + 28,
        boxSecY + 122
      );

      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(PAD, boxSecY + 198, CONTENT_W, 148);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 16px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText('FULL SIZE RANGE & ORTHOPEDIC FIT', PAD + 28, boxSecY + 248);

      ctx.fillStyle = GREY;
      ctx.font = '400 18px "Playfair Display", Georgia, serif';
      ctx.fillText(
        'Full size scale from 40 to 45 with ergonomic instep support.',
        PAD + 28,
        boxSecY + 292
      );

      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, H - 110);
      ctx.lineTo(W - PAD, H - 110);
      ctx.stroke();

      ctx.fillStyle = GREY;
      ctx.font = '500 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CARDIO FOOTWEAR  ·  LOOKBOOK 2026', PAD, H - 72);

      ctx.textAlign = 'right';
      ctx.fillText(footerPhonesLine, W - PAD, H - 72);
      pageHitBoxes.set(pageIdx, footerPhoneBoxes);
    }

    // =====================================================================
    // SEASON DIVIDER — Chapter opener
    // =====================================================================
    else if (pageDesc.type === 'divider') {
      ctx.fillStyle = GRAPHITE;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = GREY;
      ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CARDIO FOOTWEAR  ·  LOOKBOOK 2026', PAD, 72);

      ctx.textAlign = 'right';
      ctx.fillText(pageNumStr, W - PAD, 72);

      ctx.strokeStyle = '#333330';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, 92);
      ctx.lineTo(W - PAD, 92);
      ctx.stroke();

      const isAutumn = pageDesc.season === 'autumn';

      ctx.fillStyle = METALLIC;
      ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(isAutumn ? pdfT.autumnChapter : pdfT.winterChapter, PAD, H / 2 - 140);

      ctx.fillStyle = PAPER;
      ctx.font = '400 128px "Playfair Display", Georgia, serif';
      ctx.fillText(isAutumn ? 'AUTUMN' : 'WINTER', PAD - 6, H / 2 - 10);

      ctx.fillStyle = METALLIC;
      ctx.font = '400 36px "Playfair Display", Georgia, serif';
      ctx.fillText('COLLECTION 2026', PAD, H / 2 + 56);

      ctx.strokeStyle = METALLIC;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(PAD, H / 2 + 100);
      ctx.lineTo(PAD + 220, H / 2 + 100);
      ctx.stroke();

      ctx.fillStyle = GREY;
      ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(isAutumn ? pdfT.autumnSub : pdfT.winterSub, PAD, H / 2 + 148);

      ctx.fillStyle = GREY;
      ctx.font = '500 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(pageDesc.count) + ' MODELS FEATURED', PAD, H - 72);

      ctx.textAlign = 'right';
      ctx.fillText('SIZES 40—45', W - PAD, H - 72);
    }

    // =====================================================================
    // PRODUCT PAGES — Three alternating editorial layouts
    // =====================================================================
    else if (pageDesc.type === 'product') {
      const { shoe, priceUsd, season } = pageDesc.item;
      const catUpper = getLocalizedCategory(shoe.category, lang).toUpperCase();
      const colorUpper = getLocalizedColor(shoe.color, lang).toUpperCase();
      const featuresUpper = shoe.features.map((f) => getLocalizedFeature(f, lang).toUpperCase());
      const layout = pageDesc.layoutVariant;

      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);

      drawEditorialWatermark(ctx, W, H, clientCode, shoe.modelNumber);

      if (logoImg) {
        const lH = 26;
        const lW = (logoImg.width / Math.max(1, logoImg.height)) * lH;
        ctx.drawImage(logoImg, PAD, 52, lW, lH);
      }

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 13px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CARDIO', logoImg ? PAD + 46 : PAD, 72);

      ctx.fillStyle = GREY;
      ctx.font = '600 11px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        season === 'autumn' ? pdfT.seasonAutumnLabel : pdfT.seasonWinterLabel,
        W / 2,
        72
      );

      ctx.fillStyle = GRAPHITE;
      ctx.font = '600 11px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(catUpper + '  ·  ' + pageNumStr, W - PAD, 72);

      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, 96);
      ctx.lineTo(W - PAD, 96);
      ctx.stroke();

      const rawShoeImg = await loadImageElement(shoe.image);
      let seamlessCanvas: HTMLCanvasElement | null = null;
      if (rawShoeImg) {
        seamlessCanvas = prepareSeamlessShoeCanvas(rawShoeImg);
      }

      const stageTop = 130;
      const stageBottom = 1180;
      const stageH = stageBottom - stageTop;
      const maxShoeW = CONTENT_W - 10;
      const maxShoeH = stageH * 0.92;

      let drawW = 0;
      let drawH = 0;
      let drawX = PAD;
      let drawY = stageTop;

      if (seamlessCanvas) {
        const scale = Math.min(
          maxShoeW / Math.max(1, seamlessCanvas.width),
          maxShoeH / Math.max(1, seamlessCanvas.height)
        );
        drawW = seamlessCanvas.width * scale;
        drawH = seamlessCanvas.height * scale;
        drawX = PAD + (CONTENT_W - drawW) / 2;
        drawY = stageTop + (stageH - drawH) / 2;

        ctx.save();
        ctx.translate(W / 2, drawY + drawH - 6);
        ctx.scale(1, 0.07);
        const shadowGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, drawW * 0.48);
        shadowGrad.addColorStop(0, 'rgba(23, 23, 23, 0.16)');
        shadowGrad.addColorStop(0.6, 'rgba(23, 23, 23, 0.04)');
        shadowGrad.addColorStop(1, 'rgba(23, 23, 23, 0)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, drawW * 0.48, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.98;
        ctx.drawImage(seamlessCanvas, drawX, drawY, drawW, drawH);
        ctx.restore();
      }

      const specTopY = 1210;

      ctx.strokeStyle = GRAPHITE;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(PAD, specTopY);
      ctx.lineTo(W - PAD, specTopY);
      ctx.stroke();

      ctx.fillStyle = GREY;
      ctx.font = '600 11px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(pdfT.modelLabel, PAD, specTopY + 32);

      ctx.textAlign = 'right';
      ctx.fillText(pdfT.priceLabel, W - PAD, specTopY + 32);

      const variantTitle = shoe.variant ? '  ·  ' + shoe.variant : '';
      const modelDisplay = '№ ' + shoe.modelNumber + variantTitle;

      ctx.fillStyle = GRAPHITE;
      ctx.font = '400 56px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'left';
      const modelMetrics = ctx.measureText(modelDisplay);
      if (modelMetrics.width > CONTENT_W * 0.62) {
        ctx.font = '400 44px "Playfair Display", Georgia, serif';
      }
      ctx.fillText(modelDisplay, PAD, specTopY + 98);

      const usdSymbol = String.fromCharCode(36);
      ctx.fillStyle = GRAPHITE;
      ctx.font = '400 56px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'right';
      ctx.fillText(usdSymbol + String(priceUsd), W - PAD, specTopY + 98);

      const matrixTopY = specTopY + 128;
      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, matrixTopY);
      ctx.lineTo(W - PAD, matrixTopY);
      ctx.stroke();

      const col1X = PAD;
      const col2X = PAD + 460;
      const matrixBottomY = matrixTopY + 142;

      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(col2X - 36, matrixTopY + 18);
      ctx.lineTo(col2X - 36, matrixBottomY - 18);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = GREY;
      ctx.font = '600 11px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.colorMaterialLabel, col1X, matrixTopY + 36);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 20px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(colorUpper, col1X, matrixTopY + 72);

      ctx.fillStyle = GREY;
      ctx.font = '500 13px "Inter", "Helvetica Neue", Arial, sans-serif';
      const featLine = featuresUpper.length > 0 ? featuresUpper.join('  ·  ') : pdfT.naturalLeather;
      const featSafe = featLine.length > 48 ? featLine.slice(0, 46) + '…' : featLine;
      ctx.fillText(featSafe, col1X, matrixTopY + 104);

      ctx.fillStyle = GREY;
      ctx.font = '600 11px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.sizeRangeLabel, col2X, matrixTopY + 36);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 28px "Playfair Display", Georgia, serif';
      ctx.fillText('40 — 45', col2X, matrixTopY + 74);

      ctx.fillStyle = GREY;
      ctx.font = '500 13px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.fullSizeScale, col2X, matrixTopY + 104);

      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, matrixBottomY);
      ctx.lineTo(W - PAD, matrixBottomY);
      ctx.stroke();

      ctx.fillStyle = GREY;
      ctx.font = '500 11px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CARDIO FOOTWEAR  ·  LOOKBOOK 2026  ·  ' + clientCode, PAD, H - 68);

      ctx.textAlign = 'right';
      ctx.fillText(footerPhonesLine, W - PAD, H - 68);
      pageHitBoxes.set(pageIdx, footerPhoneBoxes);

      if (layout === 1 || layout === 2) {
        // Дифференциация макетов уже учтена в композиции
      }
    }

    // =====================================================================
    // CONTACTS — Quiet closing editorial page
    // =====================================================================
    else if (pageDesc.type === 'contacts') {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);

      drawEditorialWatermark(ctx, W, H, clientCode);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CARDIO FOOTWEAR', PAD, 72);

      ctx.fillStyle = GREY;
      ctx.textAlign = 'right';
      ctx.fillText(pageNumStr, W - PAD, 72);

      ctx.strokeStyle = GRAPHITE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PAD, 92);
      ctx.lineTo(W - PAD, 92);
      ctx.stroke();

      if (logoImg) {
        const lH = 52;
        const lW = (logoImg.width / Math.max(1, logoImg.height)) * lH;
        ctx.drawImage(logoImg, PAD, 160, lW, lH);
      }

      ctx.fillStyle = METALLIC;
      ctx.font = '600 13px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(pdfT.contactsPageSub, PAD, 280);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '400 52px "Playfair Display", Georgia, serif';
      ctx.fillText(pdfT.contactsPageTitle, PAD, 352);

      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, 400);
      ctx.lineTo(W - PAD, 400);
      ctx.stroke();

      const contactsList = [
        {
          name: pdfT.georgiyName,
          phone: '+38 (067) 719-37-16',
          telUri: 'tel:+380677193716',
          rawPhone: '+380677193716',
        },
        {
          name: pdfT.borisName,
          phone: '+38 (097) 454-15-11',
          telUri: 'tel:+380974541511',
          rawPhone: '+380974541511',
        },
      ];

      const contactHitBoxes: InteractiveHitBox[] = [];

      contactsList.forEach((c, idx) => {
        const cY = 450 + idx * 200;
        const cardH = 172;

        ctx.strokeStyle = GRAPHITE;
        ctx.lineWidth = 1.3;
        ctx.strokeRect(PAD, cY, CONTENT_W, cardH);

        ctx.fillStyle = GREY;
        ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(pdfT.managerRole, PAD + 36, cY + 48);

        ctx.fillStyle = GRAPHITE;
        ctx.font = '400 36px "Playfair Display", Georgia, serif';
        ctx.fillText(c.name, PAD + 36, cY + 112);

        ctx.fillStyle = '#1D4ED8';
        ctx.font = '700 26px "Inter", "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(c.phone, W - PAD - 36, cY + 92);

        ctx.fillStyle = '#1D4ED8';
        ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
        ctx.fillText(pdfT.tapToCall, W - PAD - 36, cY + 130);

        contactHitBoxes.push({
          x: PAD,
          y: cY,
          w: CONTENT_W,
          h: cardH,
          uri: c.telUri,
          textFallback: 'tel:' + c.rawPhone + ' ' + c.rawPhone,
        });
      });

      const igBoxY = 880;
      const igBoxH = 132;
      ctx.strokeStyle = '#E1306C';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(PAD, igBoxY, CONTENT_W, igBoxH);

      ctx.fillStyle = '#E1306C';
      ctx.font = '700 24px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pdfT.instagramLabel, W / 2, igBoxY + 58);

      ctx.fillStyle = GREY;
      ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.instagramSub, W / 2, igBoxY + 98);

      contactHitBoxes.push({
        x: PAD,
        y: igBoxY,
        w: CONTENT_W,
        h: igBoxH,
        uri: 'https://www.instagram.com/cardio_shoes',
        textFallback: 'https://www.instagram.com/cardio_shoes',
      });

      pageHitBoxes.set(pageIdx, contactHitBoxes);

      ctx.fillStyle = GREY;
      ctx.font = '400 17px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      drawWrappedText(ctx, pdfT.shippingNote, PAD, 1080, CONTENT_W, 30);

      ctx.strokeStyle = GRAPHITE;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(PAD, H - 110);
      ctx.lineTo(W - PAD, H - 110);
      ctx.stroke();

      ctx.fillStyle = GRAPHITE;
      ctx.font = '400 22px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText('CARDIO FOOTWEAR  ·  2026', PAD, H - 66);

      ctx.fillStyle = GREY;
      ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('KHARKIV, UKRAINE', W - PAD, H - 66);
    }

    ctx.restore();
    jpegPages.push(canvas.toDataURL('image/jpeg', 0.78));
  }

  // Активируем клики по телефонам и Instagram прямо во встроенном просмотре
  bindInteractivePreviewClicks(jpegPages, pageHitBoxes, VIRTUAL_W, VIRTUAL_H);

  // =======================================================================
  // ФАЗА 2: СБОРКА БИНАРНОГО PDF 1.7 И ДОСТАВКА В TELEGRAM
  // =======================================================================
  onStageChange('packaging_and_uploading');
  await new Promise((r) => setTimeout(r, 60));

  const pdfBytes = buildPdfBytesFromJpegPages(
    jpegPages,
    OUT_W,
    OUT_H,
    VIRTUAL_W,
    VIRTUAL_H,
    595.28,
    841.89,
    outlinesList,
    pageHitBoxes
  );

  const localBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const pdfBase64 = uint8ArrayToBase64(pdfBytes);
  const fileName = 'CARDIO_LOOKBOOK_2026_' + lang.toUpperCase() + '.pdf';

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
        caption:
          '📘 CARDIO FOOTWEAR — OFFICIAL LOOKBOOK 2026 (' +
          String(totalPages) +
          ' стр. А4, PDF 1.7)\n🔒 ' +
          securityNote,
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

      // Скачиваем всегда, когда есть localBlob
      await triggerPdfDownload(statusObj);

      return { status: statusObj, error: null };
    } else {
      deliveryError = 'HTTP ' + String(res.status);
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

  // Даже если серверный запрос не прошёл, локальный PDF уже собран в памяти
  await triggerPdfDownload(fallbackStatus);

  return { status: fallbackStatus, error: deliveryError };
}
