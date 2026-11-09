/**
 * @file src/components/wholesale/pdfLookbookEngine.ts
 * @description Автономный графический движок генерации журнального PDF-лукбука А4 (Editorial Lookbook)
 * и модуль доставки файла в Telegram WebApp / на устройство пользователя.
 *
 * ЗАЧЕМ НУЖЕН ЭТОТ ФАЙЛ:
 * 1. Выполняет автоматическое кадрирование пустых белых полей вокруг фото обуви и переводит
 *    белый студийный фон в тон тёплой бумаги #F5F3EE (эффект бесшовной журнальной вёрстки).
 * 2. Отрисовывает на HTML5 Canvas 5 типов страниц формата А4: Обложку, Манифест/Оглавление,
 *    Шмуцтитулы сезонов (Осень/Зима), Карточки моделей и Контакты оптового отдела.
 * 3. Собирает массив JPEG-страниц в валидный бинарный документ стандарта PDF 1.4 без
 *    тяжёлых сторонних библиотек (экономия размера бандла).
 * 4. Отправляет готовый PDF на сервер (/api/orders) для пересылки через Telegram-бота
 *    и запускает прямое скачивание на телефон.
 */

import {
  getLocalizedCategory,
  getLocalizedColor,
  getLocalizedFeature,
} from '../../data/catalog';
import type { FullCatalogPriceItem, SeasonKey } from './wholesaleData';
import { getPdfLookbookText, type WholesaleLang } from './wholesaleThemeAndI18n';

/** Стадии жизненного цикла генерации PDF для отображения прогресса в UI */
export type PdfStage = 'idle' | 'rendering_pages' | 'packaging_and_uploading';

/** Результат формирования и доставки PDF-каталога */
export interface PdfDeliveryStatus {
  sentToTelegram: boolean;
  downloadUrl?: string;
  localBlob?: Blob;
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
 * Извлекает Telegram ID партнёра и формирует персональный B2B-код для водяных знаков в PDF.
 */
export function getTelegramUserInfo(): { id?: number; partnerCode: string } {
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
 * Автоматически находит границы ботинка, отсекает лишние пустые поля вокруг обуви
 * и умножает RGB-каналы на цвет бумаги #F5F3EE (245, 243, 238), чтобы обувь
 * занимала максимум площади страницы без белых прямоугольных рамок.
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

  // Ищем крайние не-белые пиксели обуви (порог яркости < 245)
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const idx = (y * srcW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r < 245 || g < 245 || b < 245) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Тонируем белый фон в цвет журнальной бумаги #F5F3EE (RGB: 245, 243, 238)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round((data[i] * 245) / 255);
    data[i + 1] = Math.round((data[i + 1] * 243) / 255);
    data[i + 2] = Math.round((data[i + 2] * 238) / 255);
  }
  tempCtx.putImageData(imgData, 0, 0);

  if (maxX <= minX || maxY <= minY) {
    return tempCanvas;
  }

  // Оставляем аккуратное поле 4% вокруг контура обуви
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

/**
 * Утилита автоматического переноса длинных строк текста по словам на Canvas.
 * Возвращает Y-координату следующей свободной строки.
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
 * Низкоуровневый сборщик бинарного файла формата PDF 1.4 из массива JPEG DataURL.
 * Каждая страница встраивается как DCTDecode XObject на лист А4 (595.28 × 841.89 pt).
 */
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
  pushStr(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`
  );
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
  pushStr(
    `trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
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
 * Конвертирует бинарный массив Uint8Array в строку Base64 чанками по 32 КБ (защита от переполнения стека).
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
 * Универсальная функция скачивания или открытия готового PDF-файла:
 * поддерживает нативный метод Telegram `downloadFile`, `openLink`, Web Share API и Blob-ссылку.
 */
export async function triggerPdfDownload(status: {
  downloadUrl?: string;
  localBlob?: Blob;
  fileName: string;
}): Promise<void> {
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
}

/** Параметры запуска генератора PDF-лукбука */
export interface GenerateLookbookParams {
  lang: WholesaleLang;
  seasonFilter: 'all' | SeasonKey;
  allCatalogItems: FullCatalogPriceItem[];
  autumnItems: FullCatalogPriceItem[];
  winterItems: FullCatalogPriceItem[];
  tgUser: { id?: number; partnerCode: string };
  securityNote: string;
  onStageChange: (stage: PdfStage) => void;
  onPageProgress: (currentPage: number, totalPages: number) => void;
}

/**
 * Главная функция-оркестратор: верстает все страницы каталога на Canvas,
 * упаковывает их в PDF, отправляет копию в Telegram-чат и возвращает статус доставки.
 */
export async function generateAndDeliverLookbookPdf(
  params: GenerateLookbookParams
): Promise<{ status: PdfDeliveryStatus; error: string | null }> {
  const {
    lang,
    seasonFilter,
    allCatalogItems,
    autumnItems,
    winterItems,
    tgUser,
    securityNote,
    onStageChange,
    onPageProgress,
  } = params;

  // Оптимальное разрешение А4 (900x1273 при виртуальной сетке 1240x1754 через ctx.scale),
  // чтобы все 43 страницы весили ~1.3 МБ и гарантированно проходили через лимит 4.5 МБ на Vercel
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
  onPageProgress(1, totalPages);
  onStageChange('rendering_pages');

  const logoImg = await loadImageElement('/logo.png');
  const heroShoeItem =
    allCatalogItems.find((i) => i.shoe.modelNumber === '226')?.shoe ||
    allCatalogItems[0]?.shoe ||
    null;
  const heroShoeImgRaw = heroShoeItem ? await loadImageElement(heroShoeItem.image) : null;
  const heroShoeCropped = heroShoeImgRaw ? prepareSeamlessShoeCanvas(heroShoeImgRaw) : null;

  const pdfT = getPdfLookbookText(lang);
  const jpegPages: string[] = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    onPageProgress(pageIdx + 1, totalPages);
    // Даем браузеру отрисовать прогресс-бар и мигание точек
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
    } else if (pageDesc.type === 'manifesto') {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);

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

      const boxSecY = 1040;
      ctx.fillStyle = METALLIC;
      ctx.font = '600 14px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`03 // ${pdfT.boxStandardsTitle}`, PAD, boxSecY);

      ctx.strokeStyle = GRAPHITE;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(PAD, boxSecY + 36, CONTENT_W, 175);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 20px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.box8Title, PAD + 32, boxSecY + 92);

      ctx.fillStyle = GREY;
      ctx.font = '400 22px "Playfair Display", Georgia, serif';
      ctx.fillText(pdfT.box8Formula, PAD + 32, boxSecY + 150);

      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(PAD, boxSecY + 240, CONTENT_W, 175);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 20px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.box6Title, PAD + 32, boxSecY + 296);

      ctx.fillStyle = GREY;
      ctx.font = '400 22px "Playfair Display", Georgia, serif';
      ctx.fillText(pdfT.box6Formula, PAD + 32, boxSecY + 354);

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
    } else if (pageDesc.type === 'product') {
      const { shoe, priceUsd, season } = pageDesc.item;
      const catUpper = getLocalizedCategory(shoe.category, lang).toUpperCase();
      const colorUpper = getLocalizedColor(shoe.color, lang).toUpperCase();
      const featuresUpper = shoe.features.map((f) => getLocalizedFeature(f, lang).toUpperCase());

      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);

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

      ctx.fillStyle = '#EAE6DF';
      ctx.font = '400 180px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText(`№${shoe.modelNumber}`, PAD - 6, 285);

      const rawShoeImg = await loadImageElement(shoe.image);
      if (rawShoeImg) {
        const seamlessCanvas = prepareSeamlessShoeCanvas(rawShoeImg);
        const stageTop = 150;
        const stageHeight = 1060;
        const maxShoeW = CONTENT_W - 20;
        const maxShoeH = 880;

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

        ctx.drawImage(seamlessCanvas, drawX, drawY, drawW, drawH);
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

      const matrixTopY = specTopY + 150;
      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, matrixTopY);
      ctx.lineTo(W - PAD, matrixTopY);
      ctx.stroke();

      const col1X = PAD;
      const col2X = PAD + 340;
      const col3X = PAD + 565;
      const col4X = PAD + 825;
      const matrixBottomY = matrixTopY + 168;

      [col2X - 24, col3X - 24, col4X - 24].forEach((divX) => {
        ctx.strokeStyle = RULE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(divX, matrixTopY + 22);
        ctx.lineTo(divX, matrixBottomY - 22);
        ctx.stroke();
      });

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

      ctx.fillStyle = GREY;
      ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.sizeRangeLabel, col2X, matrixTopY + 42);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 26px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText('40 — 45', col2X, matrixTopY + 86);

      ctx.fillStyle = GREY;
      ctx.font = '500 14px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.fullSizeScale, col2X, matrixTopY + 122);

      ctx.fillStyle = GREY;
      ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.box6Label, col3X, matrixTopY + 42);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 34px "Playfair Display", Georgia, serif';
      ctx.fillText(`$${priceUsd * 6}`, col3X, matrixTopY + 90);

      ctx.fillStyle = GREY;
      ctx.font = '500 14px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.box6Sub, col3X, matrixTopY + 122);

      ctx.fillStyle = GREY;
      ctx.font = '600 12px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.box8Label, col4X, matrixTopY + 42);

      ctx.fillStyle = GRAPHITE;
      ctx.font = '700 34px "Playfair Display", Georgia, serif';
      ctx.fillText(`$${priceUsd * 8}`, col4X, matrixTopY + 90);

      ctx.fillStyle = GREY;
      ctx.font = '500 14px "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(pdfT.box8Sub, col4X, matrixTopY + 122);

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
    } else if (pageDesc.type === 'contacts') {
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

    ctx.restore();
    jpegPages.push(canvas.toDataURL('image/jpeg', 0.72));
  }

  // =======================================================================
  // ФАЗА 2: УПАКОВКА БИНАРНОГО PDF И ОТПРАВКА НА СЕРВЕР / В TELEGRAM
  // =======================================================================
  onStageChange('packaging_and_uploading');
  await new Promise((r) => setTimeout(r, 80));

  const pdfBytes = buildPdfBytesFromJpegPages(jpegPages, OUT_W, OUT_H);
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
        caption: `📘 CARDIO FOOTWEAR — WHOLESALE COLLECTION 2026 (${totalPages} стр. А4)\n🔒 ${securityNote}`,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.downloadPath) {
        const statusObj: PdfDeliveryStatus = {
          sentToTelegram: Boolean(data.sentToTelegram),
          downloadUrl: data.downloadPath,
          localBlob,
          fileName,
          totalPages,
        };
        await triggerPdfDownload(statusObj);
        return { status: statusObj, error: null };
      }
    } else {
      deliveryError = `HTTP ${res.status}`;
    }
  } catch (err) {
    deliveryError = err instanceof Error ? err.message : 'Network error';
  }

  // Fallback: если сервер недоступен или вернул ошибку, отдаём собранный PDF напрямую из памяти браузера
  const fallbackStatus: PdfDeliveryStatus = {
    sentToTelegram: false,
    localBlob,
    fileName,
    totalPages,
  };
  await triggerPdfDownload(fallbackStatus);
  return { status: fallbackStatus, error: deliveryError };
}

