import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const MAX_AUTH_AGE_SECONDS = 86400;

interface VerifiedTelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

function verifyTelegramInitData(
  rawInitData: string,
  botToken: string
): VerifiedTelegramUser | null {
  try {
    const params = new URLSearchParams(rawInitData);
    const receivedHash = params.get('hash');
    if (!receivedHash || !/^[0-9a-f]{64}$/i.test(receivedHash)) return null;

    const authDate = Number(params.get('auth_date'));
    if (!Number.isFinite(authDate) || authDate <= 0) return null;
    if (Math.floor(Date.now() / 1000) - authDate > MAX_AUTH_AGE_SECONDS) return null;

    const pairs: string[] = [];
    params.forEach((value, key) => {
      if (key !== 'hash') pairs.push(`${key}=${value}`);
    });
    pairs.sort((a, b) => a.localeCompare(b));

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(pairs.join('\n'))
      .digest('hex');

    const a = Buffer.from(receivedHash.toLowerCase(), 'hex');
    const b = Buffer.from(computedHash.toLowerCase(), 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const userRaw = params.get('user');
    if (!userRaw) return null;
    const parsed = JSON.parse(userRaw) as VerifiedTelegramUser;
    if (!parsed || !Number.isSafeInteger(parsed.id) || parsed.id <= 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminId = (process.env.ADMIN_TELEGRAM_ID || '').trim();
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const connectionString = process.env.DATABASE_URL || '';

  if (!adminId || !botToken || !connectionString) {
    return res.status(403).json({ isAdmin: false });
  }

  const headerInitData = req.headers?.['x-telegram-init-data'];
  const rawInitData = typeof headerInitData === 'string' ? headerInitData.trim() : '';
  if (!rawInitData) {
    return res.status(401).json({ isAdmin: false });
  }

  const tgUser = verifyTelegramInitData(rawInitData, botToken);
  if (!tgUser || String(tgUser.id) !== adminId) {
    return res.status(403).json({ isAdmin: false });
  }

  // Быстрая проверка прав для показа кнопки
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
    console.error('[api/admin-stats] DB error:', err);
    return res.status(500).json({ error: 'Failed to load stats' });
  }
}

