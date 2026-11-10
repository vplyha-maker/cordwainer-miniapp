/**
 * @file api/orders.ts
 * @description Serverless-обработчик Vercel для:
 * 1. Приема и отправки защищенного PDF-каталога в Telegram (@Cordwainer_bot) с выдачей
 *    безотказной прямой HTTPS-ссылки для скачивания на iPhone и Android.
 * 2. Оформления оптовых заказов (накладных) в Telegram руководителям и сохранения в БД Neon.
 *
 * ЧТО ИСПРАВЛЕНО ДЛЯ ANDROID И VERCEL:
 * 1. Защита от потери памяти между инстансами Vercel: если `GET`-запрос попадает на
 *    другой поток сервера, где `pdfMemoryStore` пуст, сервер автоматически восстанавливает
 *    PDF-файл напрямую через `file_id` серверов Telegram или из кэш-таблицы базы данных Neon.
 * 2. Добавлена поддержка HTTP-метода `HEAD`, который используется системным загрузчиком
 *    Android (`DownloadManager`) для проверки типа `application/pdf` перед скачиванием.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

type StoredPdfItem = {
  buffer: Buffer;
  fileName: string;
  createdAt: number;
};

const globalStore = globalThis as unknown as {
  __cardioPdfStore?: Map<string, StoredPdfItem>;
};

const pdfMemoryStore: Map<string, StoredPdfItem> =
  globalStore.__cardioPdfStore || new Map<string, StoredPdfItem>();
globalStore.__cardioPdfStore = pdfMemoryStore;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

/**
 * Скачивает PDF-файл с серверов Telegram по его `file_id`, если локальная память
 * инстанса Vercel очистилась или запрос попал на соседний серверный поток.
 */
async function fetchPdfBufferFromTelegram(
  botToken: string,
  tgFileId: string
): Promise<Buffer | null> {
  try {
    const infoRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(tgFileId)}`
    );
    const infoData = await infoRes.json();
    const filePath = infoData?.result?.file_path;
    if (!infoData?.ok || !filePath) return null;

    const fileRes = await fetch(
      `https://api.telegram.org/file/bot${botToken}/${filePath}`
    );
    if (!fileRes.ok) return null;

    const arrayBuf = await fileRes.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const botToken = process.env.BOT_TOKEN;
  const connectionString = process.env.DATABASE_URL;

  // =========================================================================
  // 1. GET / HEAD ЗАПРОС: Прямое скачивание готового PDF-каталога по HTTPS-ссылке
  // (Поддержка HEAD обязательна для системного загрузчика Android DownloadManager)
  // =========================================================================
  if (req.method === 'GET' || req.method === 'HEAD') {
    const rawId = req.query?.pdfId;
    const rawTgFileId = req.query?.tgFileId;
    const rawFn = req.query?.fn;

    const pdfId = Array.isArray(rawId) ? rawId[0] : String(rawId || '');
    const tgFileId = Array.isArray(rawTgFileId)
      ? rawTgFileId[0]
      : String(rawTgFileId || '');
    const fallbackFileName =
      (Array.isArray(rawFn) ? rawFn[0] : String(rawFn || '')) ||
      'CARDIO_LOOKBOOK_2026.pdf';

    // Шаг 1: Ищем файл в быстрой оперативной памяти текущего потока Vercel
    let item = pdfId ? pdfMemoryStore.get(pdfId) : undefined;

    // Шаг 2: Если запрос попал на другой поток Vercel — забираем файл по `tgFileId` из Telegram
    if (!item && tgFileId && botToken) {
      const tgBuffer = await fetchPdfBufferFromTelegram(botToken, tgFileId);
      if (tgBuffer && tgBuffer.length > 0) {
        item = {
          buffer: tgBuffer,
          fileName: fallbackFileName,
          createdAt: Date.now(),
        };
        if (pdfId) {
          pdfMemoryStore.set(pdfId, item);
        }
      }
    }

    // Шаг 3: Резервный поиск в базе данных Neon (если открывали вне Telegram и попали на другой поток)
    if (!item && pdfId && connectionString) {
      try {
        const sql = neon(connectionString);
        const rows = await sql`
          SELECT file_name, pdf_base64
          FROM cardio_pdf_cache
          WHERE pdf_id = ${pdfId}
          LIMIT 1
        `;
        if (rows.length > 0 && rows[0].pdf_base64) {
          const dbBuffer = Buffer.from(String(rows[0].pdf_base64), 'base64');
          item = {
            buffer: dbBuffer,
            fileName: String(rows[0].file_name || fallbackFileName),
            createdAt: Date.now(),
          };
          pdfMemoryStore.set(pdfId, item);
        }
      } catch {}
    }

    if (!item) {
      return res
        .status(404)
        .send('PDF session expired. Please generate the catalog again.');
    }

    const safeFileName = item.fileName.replace(/["\r\n]/g, '');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`
    );
    res.setHeader('Content-Length', String(item.buffer.length));
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    return res.status(200).send(item.buffer);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};

  // =========================================================================
  // 2. POST-ЗАПРОС (РЕЖИМ PDF): Принимает PDF-каталог, шлет в Telegram с запретом
  // пересылки (protect_content: true) и создает безотказную ссылку для скачивания
  // =========================================================================
  if (body.action === 'send_pdf' || body.pdfBase64) {
    try {
      const {
        pdfBase64,
        fileName = 'CARDIO_LOOKBOOK_2026.pdf',
        chatId,
        caption,
      } = body;

      if (!pdfBase64) {
        return res.status(400).json({ success: false, error: 'Missing pdfBase64' });
      }

      const cleanBase64 = pdfBase64.includes(',')
        ? pdfBase64.split(',')[1]
        : pdfBase64;
      const buffer = Buffer.from(cleanBase64, 'base64');

      const pdfId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      pdfMemoryStore.set(pdfId, {
        buffer,
        fileName,
        createdAt: Date.now(),
      });

      if (pdfMemoryStore.size > 15) {
        const oldestKey = pdfMemoryStore.keys().next().value;
        if (oldestKey) pdfMemoryStore.delete(oldestKey);
      }

      // Дополнительно сохраняем в кэш-таблицу Neon (на случай межпоточных запросов на Vercel)
      if (connectionString) {
        try {
          const sql = neon(connectionString);
          await sql`
            CREATE TABLE IF NOT EXISTS cardio_pdf_cache (
              pdf_id TEXT PRIMARY KEY,
              file_name TEXT NOT NULL,
              pdf_base64 TEXT NOT NULL,
              created_at BIGINT NOT NULL
            )
          `;
          const cutoff = Date.now() - 30 * 60 * 1000;
          await sql`DELETE FROM cardio_pdf_cache WHERE created_at < ${cutoff}`;
          await sql`
            INSERT INTO cardio_pdf_cache (pdf_id, file_name, pdf_base64, created_at)
            VALUES (${pdfId}, ${fileName}, ${cleanBase64}, ${Date.now()})
          `;
        } catch {}
      }

      let sentToTelegram = false;
      let tgFileId = '';

      if (botToken && chatId) {
        try {
          const form = new FormData();
          form.append('chat_id', String(chatId));
          form.append('protect_content', 'true'); // Запрет на пересылку и сохранение в Telegram
          if (caption) form.append('caption', String(caption));

          const blob = new Blob([buffer], { type: 'application/pdf' });
          form.append('document', blob, fileName);

          const tgRes = await fetch(
            `https://api.telegram.org/bot${botToken}/sendDocument`,
            {
              method: 'POST',
              body: form,
            }
          );
          const tgData = await tgRes.json();
          if (tgData?.ok) {
            sentToTelegram = true;
            tgFileId = String(tgData?.result?.document?.file_id || '');
          }
        } catch {}
      }

      const queryParts = [
        `pdfId=${encodeURIComponent(pdfId)}`,
        `fn=${encodeURIComponent(fileName)}`,
      ];
      if (tgFileId) {
        queryParts.push(`tgFileId=${encodeURIComponent(tgFileId)}`);
      }

      return res.status(200).json({
        success: true,
        sentToTelegram,
        downloadPath: `/api/orders?${queryParts.join('&')}`,
      });
    } catch (err: any) {
      return res
        .status(500)
        .json({ success: false, error: err?.message || 'PDF error' });
    }
  }

  // =========================================================================
  // 3. POST-ЗАПРОС (РЕЖИМ НАКЛАДНОЙ): Стандартная отправка оптового заказа
  // =========================================================================
  const {
    telegramId,
    managerName,
    clientContact,
    branchOrComment,
    totalPairs,
    deliveryCost,
    invoiceText,
  } = body;

  if (!botToken || !telegramId || !invoiceText) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // 1. Отправляем в Telegram руководителю
    const tgResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: invoiceText,
        }),
      }
    );

    const tgData = await tgResponse.json();

    if (!tgData.ok) {
      const description = tgData.description || '';
      if (
        description.includes('chat not found') ||
        description.includes('bot was blocked')
      ) {
        return res.status(400).json({
          error: `Руководитель (${managerName}) еще не запустил бота @Cordwainer_bot! Пусть нажмет /start.`,
        });
      }
      return res
        .status(500)
        .json({ error: description || 'Telegram API error' });
    }

    // 2. Сохраняем заказ в базу данных Neon (если подключена DATABASE_URL)
    if (connectionString) {
      const sql = neon(connectionString);
      await sql`
        INSERT INTO orders (manager_name, client_contact, branch_or_comment, total_pairs, delivery_cost, invoice_text)
        VALUES (${managerName}, ${clientContact || ''}, ${branchOrComment || ''}, ${totalPairs || 0}, ${deliveryCost || 0}, ${invoiceText})
      `;
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
