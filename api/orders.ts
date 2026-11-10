/**
 * @file api/orders.ts
 * @description Serverless-обработчик Vercel для:
 * 1. Выдачи архива заказов покупателя из базы данных Neon (`GET ?action=history`)
 *    как по Telegram/Web `clientUid`, так и по номеру телефона (для www.cordwainer.app).
 * 2. Приема и выдачи защищенного PDF-каталога (`GET / HEAD ?pdfId=...` и `POST action=send_pdf`).
 * 3. Отправки оптовых накладных руководителям в Telegram и сохранения в таблицу `orders` Neon DB.
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
  // 0. GET-ЗАПРОС АРХИВА ЗАКАЗОВ («МОИ ЗАКАЗЫ» ИЗ БАЗЫ NEON)
  // Работает и для Telegram Mini App (по clientUid), и для www.cordwainer.app (по телефону)
  // =========================================================================
  if (req.method === 'GET' && req.query?.action === 'history') {
    if (!connectionString) {
      return res.status(200).json({ orders: [] });
    }

    const rawUid = req.query?.clientUid;
    const rawPhone = req.query?.phone;
    const clientUid = Array.isArray(rawUid) ? rawUid[0] : String(rawUid || '').trim();
    const cleanPhone = (Array.isArray(rawPhone) ? rawPhone[0] : String(rawPhone || ''))
      .replace(/\D/g, '')
      .slice(-10);

    try {
      const sql = neon(connectionString);

      // Безопасно добавляем колонки для архива, если таблица была создана ранее без них
      await sql`
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS invoice_number TEXT,
        ADD COLUMN IF NOT EXISTS client_uid TEXT,
        ADD COLUMN IF NOT EXISTS client_phone TEXT,
        ADD COLUMN IF NOT EXISTS total_usd INTEGER DEFAULT 0
      `;

      // Форматируем шаблон последних 7 цифр телефона для поиска даже по старым заказам
      const last7 = cleanPhone.length >= 7 ? cleanPhone.slice(-7) : '';
      const formattedTail =
        last7.length === 7
          ? `%${last7.slice(0, 3)}%${last7.slice(3, 5)}%${last7.slice(5, 7)}%`
          : '';

      let rows: Array<Record<string, any>> = [];

      if (clientUid && cleanPhone.length >= 7) {
        rows = await sql`
          SELECT id, invoice_number, manager_name, client_contact, branch_or_comment,
                 total_pairs, total_usd, invoice_text, created_at
          FROM orders
          WHERE client_uid = ${clientUid}
             OR client_phone = ${cleanPhone}
             OR (
               ${formattedTail} <> ''
               AND regexp_replace(client_contact, '[^0-9]', '', 'g') LIKE ${'%' + last7 + '%'}
             )
          ORDER BY id DESC
          LIMIT 25
        `;
      } else if (cleanPhone.length >= 7) {
        rows = await sql`
          SELECT id, invoice_number, manager_name, client_contact, branch_or_comment,
                 total_pairs, total_usd, invoice_text, created_at
          FROM orders
          WHERE client_phone = ${cleanPhone}
             OR regexp_replace(client_contact, '[^0-9]', '', 'g') LIKE ${'%' + last7 + '%'}
          ORDER BY id DESC
          LIMIT 25
        `;
      } else if (clientUid && clientUid !== 'web_guest') {
        rows = await sql`
          SELECT id, invoice_number, manager_name, client_contact, branch_or_comment,
                 total_pairs, total_usd, invoice_text, created_at
          FROM orders
          WHERE client_uid = ${clientUid}
          ORDER BY id DESC
          LIMIT 25
        `;
      }

      const orders = rows.map((r) => ({
        id: String(r.invoice_number || `CRD-DB-${r.id}`),
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        managerName: String(r.manager_name || ''),
        clientContact: String(r.client_contact || ''),
        branchOrComment: String(r.branch_or_comment || ''),
        totalPairs: Number(r.total_pairs || 0),
        totalUsd: Number(r.total_usd || 0) || undefined,
        invoiceText: String(r.invoice_text || ''),
      }));

      return res.status(200).json({ orders });
    } catch {
      return res.status(200).json({ orders: [] });
    }
  }

  // =========================================================================
  // 1. GET / HEAD ЗАПРОС: Прямое скачивание готового PDF-каталога по HTTPS-ссылке
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

    let item = pdfId ? pdfMemoryStore.get(pdfId) : undefined;

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
  // 2. POST-ЗАПРОС (РЕЖИМ PDF)
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
          form.append('protect_content', 'true');
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
  // 3. POST-ЗАПРОС (РЕЖИМ НАКЛАДНОЙ): Отправка заказа и запись в архив Neon DB
  // =========================================================================
  const {
    invoiceNumber,
    clientUid,
    clientPhone,
    telegramId,
    managerName,
    clientContact,
    branchOrComment,
    totalPairs,
    totalUsd,
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

    // 2. Сохраняем заказ в базу данных Neon вместе с идентификаторами для «Моих заказов»
    if (connectionString) {
      const sql = neon(connectionString);
      await sql`
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS invoice_number TEXT,
        ADD COLUMN IF NOT EXISTS client_uid TEXT,
        ADD COLUMN IF NOT EXISTS client_phone TEXT,
        ADD COLUMN IF NOT EXISTS total_usd INTEGER DEFAULT 0
      `;

      await sql`
        INSERT INTO orders (
          invoice_number,
          client_uid,
          client_phone,
          manager_name,
          client_contact,
          branch_or_comment,
          total_pairs,
          total_usd,
          delivery_cost,
          invoice_text
        )
        VALUES (
          ${invoiceNumber || ''},
          ${clientUid || ''},
          ${clientPhone || ''},
          ${managerName},
          ${clientContact || ''},
          ${branchOrComment || ''},
          ${totalPairs || 0},
          ${totalUsd || 0},
          ${deliveryCost || 0},
          ${invoiceText}
        )
      `;
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
