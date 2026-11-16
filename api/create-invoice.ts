import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const PRODUCT_ID_REGEX = /^[a-z0-9_-]{2,32}$/i;
const MAX_AUTH_AGE_SECONDS = 86400; // 24 часа

interface VerifiedTelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

interface ProductConfig {
  title: string;
  description: string;
  amount: number;
}

const PRODUCT_CATALOG: Record<string, ProductConfig> = {
  pro_colors: {
    title: 'PRO: Палитры и схемы Иттена',
    description: 'Разовый доступ ко всем профессиональным цветовым схемам (триады, тетрады, монохром)',
    amount: 1,
  },
  pro_heel: {
    title: 'PRO: Конструктивные данные каблука',
    description: 'Разовый доступ к инженерным расчётам, биомеханике и спецификациям каблука',
    amount: 1,
  },
  pro_last: {
    title: 'PRO: Параметры колодки',
    description: 'Разовый доступ к расширенным конструктивным данным обувной колодки',
    amount: 1,
  },
};

const DEFAULT_PRODUCT_CONFIG: ProductConfig = {
  title: 'PRO: Конструктивные данные',
  description: 'Разовый доступ к расширенным профессиональным функциям Cordwainer',
  amount: 1,
};

/**
 * Криптографическая проверка подписи Telegram WebApp initData (HMAC-SHA256)
 * согласно официальной спецификации Telegram Mini Apps.
 */
function verifyTelegramInitData(
  rawInitData: string,
  botToken: string
): { valid: true; user: VerifiedTelegramUser } | { valid: false; reason: string } {
  try {
    const params = new URLSearchParams(rawInitData);
    const receivedHash = params.get('hash');
    if (!receivedHash || !/^[0-9a-f]{64}$/i.test(receivedHash)) {
      return { valid: false, reason: 'Отсутствует или повреждён hash в initData' };
    }

    const authDateRaw = params.get('auth_date');
    const authDate = authDateRaw ? Number(authDateRaw) : NaN;
    if (!Number.isFinite(authDate) || authDate <= 0) {
      return { valid: false, reason: 'Некорректный параметр auth_date' };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec - authDate > MAX_AUTH_AGE_SECONDS) {
      return { valid: false, reason: 'Сессия Telegram initData устарела' };
    }

    const pairs: string[] = [];
    params.forEach((value, key) => {
      if (key !== 'hash') {
        pairs.push(`${key}=${value}`);
      }
    });
    pairs.sort((a, b) => a.localeCompare(b));
    const dataCheckString = pairs.join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const receivedBuf = Buffer.from(receivedHash.toLowerCase(), 'hex');
    const computedBuf = Buffer.from(computedHash.toLowerCase(), 'hex');

    if (
      receivedBuf.length !== computedBuf.length ||
      !crypto.timingSafeEqual(receivedBuf, computedBuf)
    ) {
      return { valid: false, reason: 'Неверная криптографическая подпись initData' };
    }

    const userRaw = params.get('user');
    if (!userRaw) {
      return { valid: false, reason: 'В initData отсутствует объект пользователя' };
    }

    const parsedUser = JSON.parse(userRaw) as VerifiedTelegramUser;
    if (!parsedUser || !Number.isSafeInteger(parsedUser.id) || parsedUser.id <= 0) {
      return { valid: false, reason: 'Некорректный Telegram ID пользователя' };
    }

    return { valid: true, user: parsedUser };
  } catch {
    return { valid: false, reason: 'Ошибка разбора Telegram initData' };
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Токен бота не настроен на Vercel' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const { userId: rawUserId, productId: rawProductId, initData: bodyInitData } = body;

  if (!rawProductId || typeof rawProductId !== 'string' || !PRODUCT_ID_REGEX.test(rawProductId)) {
    return res.status(400).json({ error: 'Некорректный или отсутствующий productId' });
  }

  const headerInitData = req.headers?.['x-telegram-init-data'];
  const rawInitData =
    (typeof headerInitData === 'string' && headerInitData.trim()) ||
    (typeof bodyInitData === 'string' && bodyInitData.trim()) ||
    '';

  if (!rawInitData) {
    return res.status(401).json({
      error: 'Требуется подпись Telegram initData для выставления счёта',
    });
  }

  const verification = verifyTelegramInitData(rawInitData, token);
  if (!verification.valid) {
    return res.status(401).json({ error: verification.reason });
  }

  if (rawUserId && String(verification.user.id) !== String(rawUserId).trim()) {
    return res.status(403).json({ error: 'Несовпадение userId с подписью Telegram initData' });
  }

  const verifiedUserId = String(verification.user.id);

  // Защита от повторного выставления счёта, если продукт уже куплен
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    try {
      const sql = neon(connectionString);
      const existing = await sql`
        SELECT 1
        FROM user_purchases
        WHERE user_id = ${verifiedUserId}
          AND product_id = ${rawProductId}
        LIMIT 1
      `;
      if (existing.length > 0) {
        return res.status(409).json({
          error: 'Доступ к этому модулю уже активирован для вашего аккаунта',
          alreadyPurchased: true,
        });
      }
    } catch (dbErr) {
      console.error('[api/create-invoice] Предупреждение при проверке дубликата покупки:', dbErr);
    }
  }

  const productMeta = PRODUCT_CATALOG[rawProductId] ?? DEFAULT_PRODUCT_CONFIG;
  const url = `https://api.telegram.org/bot${token}/createInvoiceLink`;

  const payload = {
    title: productMeta.title,
    description: productMeta.description,
    payload: `${verifiedUserId}_buy_${rawProductId}`,
    currency: 'XTR',
    prices: [{ label: productMeta.title, amount: productMeta.amount }],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      ok?: boolean;
      result?: string;
      description?: string;
    };

    if (data.ok && data.result) {
      return res.status(200).json({ invoiceLink: data.result });
    } else {
      console.error('[api/create-invoice] Ошибка Telegram Bot API:', data);
      return res.status(502).json({
        error: data.description || 'Не удалось сгенерировать ссылку на оплату в Telegram',
      });
    }
  } catch (e: unknown) {
    console.error('[api/create-invoice] Сетевая ошибка при обращении к Telegram API:', e);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при создании счёта' });
  }
}
