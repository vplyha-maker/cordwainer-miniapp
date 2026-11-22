import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const PRODUCT_ID_REGEX = /^[a-z0-9_-]{2,32}$/i;
const EVENT_REGEX = /^[a-z0-9_:-]{2,48}$/i;
const MAX_AUTH_AGE_SECONDS = 86400; // 24 часа

interface VerifiedTelegramUser {
  id: number;
  first_name?: string;
  username?: string;
  language_code?: string;
}

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

  const rawAction = Array.isArray(req.query?.action)
    ? req.query.action[0]
    : req.query?.action;

  const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const connectionString = process.env.DATABASE_URL || '';

  if (!connectionString) {
    return res.status(500).json({ error: 'Не настроена строка подключения к БД' });
  }

  const headerInitData = req.headers?.['x-telegram-init-data'];
  const queryInitData = req.query?.initData;
  const rawInitData =
    (typeof headerInitData === 'string' && headerInitData.trim()) ||
    (typeof queryInitData === 'string' && queryInitData.trim()) ||
    '';

  // === 1. ЗАПИСЬ СОБЫТИЙ АНАЛИТИКИ: POST /api/check-purchase?action=track ===
  if (rawAction === 'track' && req.method === 'POST') {
    let body: Record<string, any> = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const event = typeof body.event === 'string' ? body.event.trim() : '';
    if (!EVENT_REGEX.test(event)) {
      return res.status(400).json({ error: 'Invalid event name' });
    }

    const page = typeof body.page === 'string' ? body.page.slice(0, 64) : null;
    const lang = typeof body.lang === 'string' ? body.lang.slice(0, 12) : null;
    const platform =
      typeof body.platform === 'string' ? body.platform.slice(0, 32) : 'web';
    const deviceId =
      typeof body.deviceId === 'string' && body.deviceId.trim()
        ? body.deviceId.trim().slice(0, 64)
        : 'web_anon';

    const verified =
      rawInitData && botToken ? verifyTelegramInitData(rawInitData, botToken) : null;
    const tgUser = verified && verified.valid ? verified.user : null;

    const source = tgUser ? 'telegram' : 'web';
    const userId = tgUser ? String(tgUser.id) : deviceId;
    const username = tgUser?.username || null;
    const firstName = tgUser?.first_name || null;
    const finalLang = lang || tgUser?.language_code || null;
    const metaJson =
      body.meta && typeof body.meta === 'object' ? JSON.stringify(body.meta) : null;

    try {
      const sql = neon(connectionString);
      await sql`
        INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
        VALUES (${userId}, ${username}, ${firstName}, ${source}, ${platform}, ${finalLang}, ${event}, ${page}, ${metaJson}::jsonb)
      `;
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[api/check-purchase:track] DB error:', err);
      return res.status(500).json({ error: 'Failed to record event' });
    }
  }

  // === 2. СТАТИСТИКА АДМИНА: GET /api/check-purchase?action=stats ===
  if (rawAction === 'stats' && req.method === 'GET') {
    const adminId = (process.env.ADMIN_TELEGRAM_ID || '').trim();
    if (!adminId || !botToken || !rawInitData) {
      return res.status(403).json({ isAdmin: false });
    }

    const verified = verifyTelegramInitData(rawInitData, botToken);
    if (!verified.valid || String(verified.user.id) !== adminId) {
      return res.status(403).json({ isAdmin: false });
    }

    if (req.query?.check === '1') {
      return res.status(200).json({ isAdmin: true });
    }

    try {
      const sql = neon(connectionString);
      const [todayRows, weekRows, allRows, purchaseRows, pagesRows, recentRows] =
        await Promise.all([
          sql`
            SELECT
              COUNT(DISTINCT CASE WHEN source = 'telegram' THEN user_id END)::int AS tg_users,
              COUNT(DISTINCT CASE WHEN source = 'web' THEN user_id END)::int AS web_users,
              COUNT(*)::int AS events
            FROM app_events
            WHERE created_at >= CURRENT_DATE
          `,
          sql`
            SELECT
              COUNT(DISTINCT CASE WHEN source = 'telegram' THEN user_id END)::int AS tg_users,
              COUNT(DISTINCT CASE WHEN source = 'web' THEN user_id END)::int AS web_users,
              COUNT(*)::int AS events
            FROM app_events
            WHERE created_at >= NOW() - INTERVAL '7 days'
          `,
          sql`
            SELECT
              COUNT(DISTINCT CASE WHEN source = 'telegram' THEN user_id END)::int AS tg_users,
              COUNT(DISTINCT CASE WHEN source = 'web' THEN user_id END)::int AS web_users
            FROM app_events
          `,
          sql`
            SELECT COUNT(*)::int AS total_purchases
            FROM user_purchases
          `,
          sql`
            SELECT
              COALESCE(page, 'unknown') AS page,
              COUNT(DISTINCT CASE WHEN source = 'telegram' THEN user_id END)::int AS tg_users,
              COUNT(DISTINCT CASE WHEN source = 'web' THEN user_id END)::int AS web_users,
              COUNT(*)::int AS opens
            FROM app_events
            WHERE event = 'page_view'
              AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY COALESCE(page, 'unknown')
            ORDER BY opens DESC
            LIMIT 10
          `,
          sql`
            SELECT
              user_id,
              username,
              first_name,
              platform,
              page,
              event,
              created_at
            FROM app_events
            WHERE source = 'telegram'
            ORDER BY created_at DESC
            LIMIT 25
          `,
        ]);

      return res.status(200).json({
        isAdmin: true,
        today: todayRows[0] || { tg_users: 0, web_users: 0, events: 0 },
        week: weekRows[0] || { tg_users: 0, web_users: 0, events: 0 },
        allTime: {
          tg_users: allRows[0]?.tg_users ?? 0,
          web_users: allRows[0]?.web_users ?? 0,
          purchases: purchaseRows[0]?.total_purchases ?? 0,
        },
        topPages: pagesRows,
        recentTelegram: recentRows,
      });
    } catch (err) {
      console.error('[api/check-purchase:stats] DB error:', err);
      return res.status(500).json({ error: 'Failed to load stats' });
    }
  }

  // === 3. СТАНДАРТНАЯ ПРОВЕРКА ПОКУПКИ: GET /api/check-purchase?productId=... ===
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
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
