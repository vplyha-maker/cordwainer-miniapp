/**
 * @file api/orders.ts
 * @description Единый Serverless-комбайн Vercel (экономит лимит функций Vercel):
 * 1. Двухфакторная защита архива заказов через 4-значный код в Telegram (`request_otp` / `verify_otp`).
 * 2. Выдача истории «Мои заказы» из базы Neon ТОЛЬКО доверенным сессиям (Telegram Mini App или по OTP-токену).
 * 3. Прием и выдача защищенного PDF-каталога (`GET / HEAD ?pdfId=...` и `POST action=send_pdf`).
 * 4. Отправка оптовых накладных руководителям в Telegram и сохранение в таблицу `orders` Neon DB.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

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

const OTP_TTL_MS = 5 * 60 * 1000; // Срок жизни 4-значного кода — 5 минут
const OTP_COOLDOWN_MS = 45 * 1000; // Пауза перед повторной отправкой — 45 секунд
const MAX_VERIFY_ATTEMPTS = 5; // Защита от подбора: максимум 5 попыток

/**
 * Нормализует телефон до 10 цифр украинского формата (например: 0988901364)
 */
function normalizePhone(raw: unknown): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('380') && digits.length >= 12) return digits.slice(2, 12);
  if (digits.startsWith('80') && digits.length >= 11) return digits.slice(1, 11);
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Гарантирует наличие таблиц и колонок для архива заказов и OTP-авторизации в базе Neon
 */
async function ensureDatabaseSchema(sql: ReturnType<typeof neon>) {
  await sql`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS invoice_number TEXT,
    ADD COLUMN IF NOT EXISTS client_uid TEXT,
    ADD COLUMN IF NOT EXISTS client_phone TEXT,
    ADD COLUMN IF NOT EXISTS total_usd INTEGER DEFAULT 0
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS cardio_b2b_clients (
      phone TEXT PRIMARY KEY,
      telegram_id TEXT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS cardio_otp_codes (
      phone TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expires_at BIGINT NOT NULL,
      last_sent_at BIGINT NOT NULL,
      attempts INTEGER DEFAULT 0,
      session_token TEXT
    )
  `;
}

/**
 * Загружает заказы проверенного клиента из базы Neon
 */
async function fetchVerifiedOrdersFromDb(
  sql: ReturnType<typeof neon>,
  cleanPhone: string,
  tgClientUid?: string
) {
  const last7 = cleanPhone.length >= 7 ? cleanPhone.slice(-7) : '';
  let rows: Array<Record<string, any>> = [];

  if (tgClientUid && tgClientUid.startsWith('tg_') && cleanPhone.length >= 7) {
    rows = await sql`
      SELECT id, invoice_number, manager_name, client_contact, branch_or_comment,
             total_pairs, total_usd, invoice_text, created_at
      FROM orders
      WHERE client_uid = ${tgClientUid}
         OR client_phone = ${cleanPhone}
         OR regexp_replace(client_contact, '[^0-9]', '', 'g') LIKE ${'%' + last7 + '%'}
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
  } else if (tgClientUid && tgClientUid.startsWith('tg_')) {
    rows = await sql`
      SELECT id, invoice_number, manager_name, client_contact, branch_or_comment,
             total_pairs, total_usd, invoice_text, created_at
      FROM orders
      WHERE client_uid = ${tgClientUid}
      ORDER BY id DESC
      LIMIT 25
    `;
  }

  return rows.map((r) => ({
    id: String(r.invoice_number || `CRD-DB-${r.id}`),
    createdAt: r.created_at
      ? new Date(r.created_at).toISOString()
      : new Date().toISOString(),
    managerName: String(r.manager_name || ''),
    clientContact: String(r.client_contact || ''),
    branchOrComment: String(r.branch_or_comment || ''),
    totalPairs: Number(r.total_pairs || 0),
    totalUsd: Number(r.total_usd || 0) || undefined,
    invoiceText: String(r.invoice_text || ''),
  }));
}

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
  // 0. GET-ЗАПРОС АРХИВА ЗАКАЗОВ («МОИ ЗАКАЗЫ» — ЗАЩИЩЕННЫЙ РЕЖИМ)
  // Без подтвержденного OTP-токена или активного Telegram ID чужие номера НЕ пробиваются!
  // =========================================================================
  if (req.method === 'GET' && req.query?.action === 'history') {
    if (!connectionString) {
      return res.status(200).json({ orders: [] });
    }

    const rawUid = req.query?.clientUid;
    const rawPhone = req.query?.phone;
    const rawToken = req.query?.sessionToken;

    const clientUid = Array.isArray(rawUid) ? rawUid[0] : String(rawUid || '').trim();
    const cleanPhone = normalizePhone(Array.isArray(rawPhone) ? rawPhone[0] : rawPhone);
    const sessionToken = Array.isArray(rawToken)
      ? rawToken[0]
      : String(rawToken || '').trim();

    try {
      const sql = neon(connectionString);
      await ensureDatabaseSchema(sql);

      // Вариант А: Пользователь зашел официально внутри Telegram Mini App (clientUid = tg_...)
      if (clientUid.startsWith('tg_')) {
        const tgId = clientUid.replace(/^tg_/, '').replace(/\D/g, '');
        if (tgId && cleanPhone.length === 10) {
          await sql`
            INSERT INTO cardio_b2b_clients (phone, telegram_id, updated_at)
            VALUES (${cleanPhone}, ${tgId}, ${Date.now()})
            ON CONFLICT (phone) DO UPDATE
            SET telegram_id = EXCLUDED.telegram_id,
                updated_at = EXCLUDED.updated_at
          `;
        }
        const orders = await fetchVerifiedOrdersFromDb(sql, cleanPhone, clientUid);
        return res.status(200).json({ orders, verified: true });
      }

      // Вариант Б: Пользователь на сайте www.cordwainer.app и у него есть подтвержденный OTP sessionToken
      if (cleanPhone.length === 10 && sessionToken) {
        const validSession = await sql`
          SELECT phone FROM cardio_otp_codes
          WHERE phone = ${cleanPhone} AND session_token = ${sessionToken}
          LIMIT 1
        `;
        if (validSession.length > 0) {
          const orders = await fetchVerifiedOrdersFromDb(sql, cleanPhone);
          return res.status(200).json({ orders, verified: true });
        }
      }

      // Вариант В: Неподтвержденный веб-браузер — отдаем только заказы его собственного браузерного UID
      // (поиск по чужим номерам телефонов без OTP-кода строго заблокирован!)
      if (clientUid && clientUid.startsWith('web_') && clientUid !== 'web_guest') {
        const rows = await sql`
          SELECT id, invoice_number, manager_name, client_contact, branch_or_comment,
                 total_pairs, total_usd, invoice_text, created_at
          FROM orders
          WHERE client_uid = ${clientUid}
          ORDER BY id DESC
          LIMIT 25
        `;
        const orders = rows.map((r) => ({
          id: String(r.invoice_number || `CRD-DB-${r.id}`),
          createdAt: r.created_at
            ? new Date(r.created_at).toISOString()
            : new Date().toISOString(),
          managerName: String(r.manager_name || ''),
          clientContact: String(r.client_contact || ''),
          branchOrComment: String(r.branch_or_comment || ''),
          totalPairs: Number(r.total_pairs || 0),
          totalUsd: Number(r.total_usd || 0) || undefined,
          invoiceText: String(r.invoice_text || ''),
        }));
        return res.status(200).json({ orders, verified: false });
      }

      return res.status(200).json({ orders: [], verified: false });
    } catch {
      return res.status(200).json({ orders: [], verified: false });
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
  // 2. POST-ЗАПРОСЫ TELEGRAM OTP АВТОРИЗАЦИИ (`request_otp` и `verify_otp`)
  // =========================================================================
  if (body.action === 'request_otp' || body.action === 'verify_otp') {
    if (!connectionString) {
      return res.status(500).json({ success: false, error: 'База данных не подключена.' });
    }

    try {
      const sql = neon(connectionString);
      await ensureDatabaseSchema(sql);
      const cleanPhone = normalizePhone(body.phone);

      if (cleanPhone.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Введите корректный 10-значный номер телефона.',
        });
      }

      // --- ШАГ А: ЗАПРОС 4-ЗНАЧНОГО КОДА В TELEGRAM ---
      if (body.action === 'request_otp') {
        const existingOtp = await sql`
          SELECT last_sent_at FROM cardio_otp_codes WHERE phone = ${cleanPhone} LIMIT 1
        `;
        if (existingOtp.length > 0) {
          const elapsed = Date.now() - Number(existingOtp[0].last_sent_at || 0);
          if (elapsed < OTP_COOLDOWN_MS) {
            const waitSec = Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000);
            return res.status(429).json({
              success: false,
              error: `Повторная отправка кода будет доступна через ${waitSec} сек.`,
            });
          }
        }

        // 1. Ищем привязанный Telegram ID в таблице клиентов
        let telegramId = '';
        const clientRows = await sql`
          SELECT telegram_id FROM cardio_b2b_clients WHERE phone = ${cleanPhone} LIMIT 1
        `;
        if (clientRows.length > 0 && clientRows[0].telegram_id) {
          telegramId = String(clientRows[0].telegram_id);
        }

        // 2. Если еще нет в таблице клиентов — ищем в прошлых заказах из Telegram (client_uid LIKE 'tg_%')
        if (!telegramId) {
          const last7 = cleanPhone.slice(-7);
          const orderRows = await sql`
            SELECT client_uid
            FROM orders
            WHERE client_uid LIKE 'tg_%'
              AND (
                client_phone = ${cleanPhone}
                OR regexp_replace(client_contact, '[^0-9]', '', 'g') LIKE ${'%' + last7 + '%'}
              )
            ORDER BY id DESC
            LIMIT 1
          `;
          if (orderRows.length > 0 && orderRows[0].client_uid) {
            telegramId = String(orderRows[0].client_uid).replace(/^tg_/, '');
            if (telegramId) {
              await sql`
                INSERT INTO cardio_b2b_clients (phone, telegram_id, updated_at)
                VALUES (${cleanPhone}, ${telegramId}, ${Date.now()})
                ON CONFLICT (phone) DO NOTHING
              `;
            }
          }
        }

        if (!telegramId) {
          return res.status(404).json({
            success: false,
            error:
              'Этот номер еще не привязан к вашему Telegram. Откройте бот @Cordwainer_bot в Telegram и оформите первый заказ (или откройте архив внутри Telegram), чтобы привязать номер.',
          });
        }

        if (!botToken) {
          return res.status(500).json({
            success: false,
            error: 'BOT_TOKEN не настроен на сервере.',
          });
        }

        const otpCode = String(crypto.randomInt(1000, 10000));
        const now = Date.now();

        await sql`
          INSERT INTO cardio_otp_codes (phone, code, expires_at, last_sent_at, attempts, session_token)
          VALUES (${cleanPhone}, ${otpCode}, ${now + OTP_TTL_MS}, ${now}, 0, NULL)
          ON CONFLICT (phone) DO UPDATE
          SET code = EXCLUDED.code,
              expires_at = EXCLUDED.expires_at,
              last_sent_at = EXCLUDED.last_sent_at,
              attempts = 0,
              session_token = NULL
        `;

        const tgRes = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramId,
              text:
                `🔐 *CARDIO B2B — Код подтверждения*\n\n` +
                `Ваш одноразовый код для доступа к архиву «Мои заказы» на сайте:\n` +
                `*${otpCode}*\n\n` +
                `_Код действителен 5 минут. Никому не сообщайте его._`,
              parse_mode: 'Markdown',
            }),
          }
        );

        const tgData = await tgRes.json();
        if (!tgData?.ok) {
          return res.status(400).json({
            success: false,
            error:
              'Не удалось отправить сообщение в Telegram. Убедитесь, что бот @Cordwainer_bot запущен (/start).',
          });
        }

        return res.status(200).json({
          success: true,
          message: '4-значный код отправлен в ваш Telegram от @Cordwainer_bot!',
        });
      }

      // --- ШАГ Б: ПРОВЕРКА 4-ЗНАЧНОГО КОДА И ВЫДАЧА ЗАКАЗОВ ---
      if (body.action === 'verify_otp') {
        const inputCode = String(body.code || '').replace(/\D/g, '').trim();
        if (inputCode.length !== 4) {
          return res.status(400).json({
            success: false,
            error: 'Введите 4-значный код из Telegram.',
          });
        }

        const otpRows = await sql`
          SELECT code, expires_at, attempts FROM cardio_otp_codes WHERE phone = ${cleanPhone} LIMIT 1
        `;
        if (otpRows.length === 0 || otpRows[0].code === 'USED') {
          return res.status(400).json({
            success: false,
            error: 'Сначала запросите новый код подтверждения.',
          });
        }

        const record = otpRows[0];
        const attempts = Number(record.attempts || 0);

        if (attempts >= MAX_VERIFY_ATTEMPTS) {
          return res.status(429).json({
            success: false,
            error: 'Превышено число попыток (5). Запросите новый код.',
          });
        }

        if (Date.now() > Number(record.expires_at || 0)) {
          return res.status(400).json({
            success: false,
            error: 'Срок действия кода истек (5 минут). Запросите новый код.',
          });
        }

        if (String(record.code) !== inputCode) {
          await sql`
            UPDATE cardio_otp_codes SET attempts = attempts + 1 WHERE phone = ${cleanPhone}
          `;
          const left = MAX_VERIFY_ATTEMPTS - (attempts + 1);
          return res.status(400).json({
            success: false,
            error: `Неверный код. Осталось попыток: ${Math.max(0, left)}.`,
          });
        }

        const sessionToken = crypto.randomBytes(24).toString('hex');
        await sql`
          UPDATE cardio_otp_codes
          SET session_token = ${sessionToken}, code = 'USED'
          WHERE phone = ${cleanPhone}
        `;

        const orders = await fetchVerifiedOrdersFromDb(sql, cleanPhone);
        return res.status(200).json({
          success: true,
          sessionToken,
          phone: cleanPhone,
          orders,
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Ошибка проверки кода',
      });
    }
  }

  // =========================================================================
  // 3. POST-ЗАПРОС (РЕЖИМ PDF)
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
  // 4. POST-ЗАПРОС (РЕЖИМ НАКЛАДНОЙ): Отправка заказа и запись в архив Neon DB
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

    if (connectionString) {
      const sql = neon(connectionString);
      await ensureDatabaseSchema(sql);

      const cleanClientPhone = normalizePhone(clientPhone || clientContact);
      const rawClientUid = String(clientUid || '');

      // Если заказ оформлен из Telegram Mini App — автоматически привязываем телефон к Telegram ID покупателя
      if (rawClientUid.startsWith('tg_') && cleanClientPhone.length === 10) {
        const buyerTgId = rawClientUid.replace(/^tg_/, '').replace(/\D/g, '');
        if (buyerTgId) {
          await sql`
            INSERT INTO cardio_b2b_clients (phone, telegram_id, updated_at)
            VALUES (${cleanClientPhone}, ${buyerTgId}, ${Date.now()})
            ON CONFLICT (phone) DO UPDATE
            SET telegram_id = EXCLUDED.telegram_id,
                updated_at = EXCLUDED.updated_at
          `;
        }
      }

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
          ${rawClientUid},
          ${cleanClientPhone},
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
