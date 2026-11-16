import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const PRODUCT_ID_REGEX = /^[a-z0-9_-]{2,32}$/i;
const MAX_AUTH_AGE_SECONDS = 86400; // 24 часа

interface VerifiedTelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

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

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  const rawUserId = Array.isArray(req.query?.userId)
    ? req.query.userId[0]
    : req.query?.userId;
  const rawProductId = Array.isArray(req.query?.productId)
    ? req.query.productId[0]
    : req.query?.productId;

  if (!rawProductId || typeof rawProductId !== 'string' || !PRODUCT_ID_REGEX.test(rawProductId)) {
    return res.status(400).json({ error: 'Некорректный или отсутствующий productId' });
  }

  const headerInitData = req.headers?.['x-telegram-init-data'];
  const queryInitData = req.query?.initData;
  const rawInitData =
    (typeof headerInitData === 'string' && headerInitData.trim()) ||
    (typeof queryInitData === 'string' && queryInitData.trim()) ||
    '';

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return res.status(500).json({ error: 'Не настроена строка подключения к БД' });
  }

  let verifiedUserId: string;

  if (rawInitData) {
    if (!botToken) {
      return res.status(500).json({ error: 'Токен бота не настроен на сервере' });
    }
    const verification = verifyTelegramInitData(rawInitData, botToken);
    if (!verification.valid) {
      return res.status(401).json({ error: verification.reason });
    }
    if (rawUserId && String(verification.user.id) !== String(rawUserId).trim()) {
      return res.status(403).json({ error: 'Несовпадение userId с подписью Telegram initData' });
    }
    verifiedUserId = String(verification.user.id);
  } else {
    // Защита от подстановки чужого ID: требуем подписанный X-Telegram-Init-Data
    return res.status(401).json({
      error: 'Требуется заголовок X-Telegram-Init-Data для подтверждения личности',
    });
  }

  try {
    const sql = neon(connectionString);
    const result = await sql`
      SELECT 1
      FROM user_purchases
      WHERE user_id = ${verifiedUserId}
        AND product_id = ${rawProductId}
      LIMIT 1
    `;

    return res.status(200).json({
      purchased: result.length > 0,
      userId: Number(verifiedUserId),
      productId: rawProductId,
    });
  } catch (error: unknown) {
    console.error('[api/check-purchase] Ошибка запроса к БД:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка при проверке статуса покупки' });
  }
}
