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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const botToken = process.env.BOT_TOKEN;
  const connectionString = process.env.DATABASE_URL;

  // =========================================================================
  // 1. GET-ЗАПРОС: Прямое скачивание готового PDF-каталога по HTTPS-ссылке
  // =========================================================================
  if (req.method === 'GET') {
    const rawId = req.query?.pdfId;
    const pdfId = Array.isArray(rawId) ? rawId[0] : String(rawId || '');
    const item = pdfMemoryStore.get(pdfId);

    if (!item) {
      return res
        .status(404)
        .send('PDF session expired. Please generate the catalog again.');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${item.fileName}"`);
    res.setHeader('Content-Length', String(item.buffer.length));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(item.buffer);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};

  // =========================================================================
  // 2. POST-ЗАПРОС (РЕЖИМ PDF): Принимает PDF-каталог, шлет в Telegram с запретом
  // пересылки (protect_content: true) и создает прямую ссылку для скачивания
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

      let sentToTelegram = false;
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
          }
        } catch {}
      }

      return res.status(200).json({
        success: true,
        sentToTelegram,
        downloadPath: `/api/orders?pdfId=${encodeURIComponent(pdfId)}`,
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
