import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const PRODUCT_ID_REGEX = /^[a-z0-9_-]{2,32}$/i;
const EVENT_REGEX = /^[a-z0-9_:-]{2,48}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AUTH_AGE_SECONDS = 86400;

const ALL_PRO_PRODUCTS = [
  'pro_sizes',
  'pro_colors',
  'pro_heel',
  'pro_last',
  'pro_videos',
  'pro_pigments',
] as const;

const PRODUCT_PRICES_STARS: Record<string, number> = {
  pro_sizes: 150,
  pro_colors: 250,
  pro_heel: 250,
  pro_last: 250,
  pro_videos: 350,
  pro_pigments: 1000,
};

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
    const authDate = Number(params.get('auth_date'));
    if (!Number.isFinite(authDate) || authDate <= 0) {
      return { valid: false, reason: 'Некорректный параметр auth_date' };
    }
    if (Math.floor(Date.now() / 1000) - authDate > MAX_AUTH_AGE_SECONDS) {
      return { valid: false, reason: 'Сессия Telegram initData устарела' };
    }
    const pairs: string[] = [];
    params.forEach((value, key) => {
      if (key !== 'hash') pairs.push(`${key}=${value}`);
    });
    pairs.sort((a, b) => a.localeCompare(b));
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(pairs.join('\n'))
      .digest('hex');

    const a = Buffer.from(receivedHash.toLowerCase(), 'hex');
    const b = Buffer.from(computedHash.toLowerCase(), 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, reason: 'Неверная криптографическая подпись initData' };
    }
    const userRaw = params.get('user');
    if (!userRaw) return { valid: false, reason: 'Отсутствует объект пользователя' };
    const parsedUser = JSON.parse(userRaw) as VerifiedTelegramUser;
    if (!parsedUser || !Number.isSafeInteger(parsedUser.id) || parsedUser.id <= 0) {
      return { valid: false, reason: 'Некорректный Telegram ID' };
    }
    return { valid: true, user: parsedUser };
  } catch {
    return { valid: false, reason: 'Ошибка разбора Telegram initData' };
  }
}

function getVerifiedAdmin(
  rawInitData: string,
  botToken: string,
  adminId: string
): VerifiedTelegramUser | null {
  if (!adminId || !botToken || !rawInitData) return null;
  const v = verifyTelegramInitData(rawInitData, botToken);
  if (!v.valid || String(v.user.id) !== adminId) return null;
  return v.user;
}

async function logAdminAudit(
  sql: any,
  adminUser: VerifiedTelegramUser,
  event: string,
  meta: Record<string, unknown>
) {
  try {
    await sql`
      INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
      VALUES (
        ${String(adminUser.id)},
        ${adminUser.username || null},
        ${adminUser.first_name || 'Admin'},
        'admin',
        'command_center',
        ${adminUser.language_code || 'ru'},
        ${event},
        'admin_crm',
        ${JSON.stringify(meta)}::jsonb
      )
    `;
  } catch {
    // не блокируем основную операцию при ошибке аудита
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const rawAction = Array.isArray(req.query?.action)
    ? req.query.action[0]
    : req.query?.action;

  const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const connectionString = process.env.DATABASE_URL || '';
  const adminId = (process.env.ADMIN_TELEGRAM_ID || '').trim();

  if (!connectionString) {
    return res.status(500).json({ error: 'Не настроена строка подключения к БД' });
  }

  const headerInitData = req.headers?.['x-telegram-init-data'];
  const queryInitData = req.query?.initData;
  const rawInitData =
    (typeof headerInitData === 'string' && headerInitData.trim()) ||
    (typeof queryInitData === 'string' && queryInitData.trim()) ||
    '';

  // === 1. TRACK ===
  if (rawAction === 'track' && req.method === 'POST') {
    let body: Record<string, any> = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const event = typeof body.event === 'string' ? body.event.trim() : '';
    if (!EVENT_REGEX.test(event)) return res.status(400).json({ error: 'Invalid event' });

    const page = typeof body.page === 'string' ? body.page.slice(0, 64) : null;
    const lang =
      typeof body.lang === 'string'
        ? body.lang.slice(0, 12)
        : typeof body.meta?.lang === 'string'
        ? String(body.meta.lang).slice(0, 12)
        : null;
    const platform = typeof body.platform === 'string' ? body.platform.slice(0, 32) : 'web';
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

      let banned = false;
      let reason = '';
      if (userId !== adminId) {
        try {
          const banRows = await sql`
            SELECT reason FROM banned_users WHERE user_id = ${userId} LIMIT 1
          `;
          if (banRows.length > 0) {
            banned = true;
            reason = String(banRows[0]?.reason || '');
          }
        } catch {
          // ignore
        }
      }
      return res.status(200).json({ ok: true, banned, reason });
    } catch (err) {
      console.error('[track] DB error:', err);
      return res.status(500).json({ error: 'Failed to record event' });
    }
  }

  // === 2. STATS (Advanced Analytics + Period Comparison + Audit Log) ===
  if (rawAction === 'stats' && req.method === 'GET') {
    const adminUser = getVerifiedAdmin(rawInitData, botToken, adminId);
    if (!adminUser) return res.status(403).json({ isAdmin: false });
    if (req.query?.check === '1') return res.status(200).json({ isAdmin: true });

    const daysRaw = Number(req.query?.days ?? 7);
    const days = [1, 7, 30, 3650].includes(daysRaw) ? daysRaw : 7;
    const hideAdmin = String(req.query?.hideAdmin ?? '1') === '1';
    const excludedId = hideAdmin ? adminId : '__none__';

    const nowMs = Date.now();
    const sinceIso = new Date(nowMs - days * 86400 * 1000).toISOString();
    const prevSinceIso = new Date(nowMs - days * 2 * 86400 * 1000).toISOString();
    const since14Iso = new Date(nowMs - 14 * 86400 * 1000).toISOString();
    const since30Iso = new Date(nowMs - 30 * 86400 * 1000).toISOString();

    try {
      const sql = neon(connectionString);

      const [
        summaryRows,
        prevSummaryRows,
        newVsRetRows,
        retentionRows,
        dailyRows,
        pagesRows,
        langsRows,
        platformsRows,
        eventsRows,
        proByProductRows,
        usersRows,
        auditRows,
      ] = await Promise.all([
        sql`
          SELECT
            COUNT(DISTINCT CASE WHEN source = 'telegram' THEN user_id END)::int AS tg_users,
            COUNT(DISTINCT CASE WHEN source = 'web' THEN user_id END)::int AS web_users,
            COUNT(DISTINCT user_id)::int AS total_users,
            COUNT(*)::int AS total_events
          FROM app_events
          WHERE created_at >= ${sinceIso}::timestamptz
            AND source <> 'admin'
            AND user_id <> ${excludedId}
        `,
        sql`
          SELECT
            COUNT(DISTINCT CASE WHEN source = 'telegram' THEN user_id END)::int AS tg_users,
            COUNT(DISTINCT CASE WHEN source = 'web' THEN user_id END)::int AS web_users,
            COUNT(DISTINCT user_id)::int AS total_users,
            COUNT(*)::int AS total_events
          FROM app_events
          WHERE created_at >= ${prevSinceIso}::timestamptz
            AND created_at < ${sinceIso}::timestamptz
            AND source <> 'admin'
            AND user_id <> ${excludedId}
        `,
        sql`
          WITH first_visits AS (
            SELECT user_id, MIN(created_at) AS first_seen
            FROM app_events
            WHERE source <> 'admin' AND user_id <> ${excludedId}
            GROUP BY user_id
          ),
          period_users AS (
            SELECT DISTINCT user_id
            FROM app_events
            WHERE created_at >= ${sinceIso}::timestamptz
              AND source <> 'admin'
              AND user_id <> ${excludedId}
          )
          SELECT
            COUNT(*) FILTER (WHERE fv.first_seen >= ${sinceIso}::timestamptz)::int AS new_users,
            COUNT(*) FILTER (WHERE fv.first_seen < ${sinceIso}::timestamptz)::int AS returning_users
          FROM period_users pu
          JOIN first_visits fv ON fv.user_id = pu.user_id
        `,
        sql`
          WITH per_user AS (
            SELECT user_id, COUNT(DISTINCT DATE(created_at)) AS active_days
            FROM app_events
            WHERE created_at >= ${since30Iso}::timestamptz
              AND source <> 'admin'
              AND user_id <> ${excludedId}
            GROUP BY user_id
          )
          SELECT
            COUNT(*)::int AS total_30d,
            COUNT(*) FILTER (WHERE active_days >= 2)::int AS returning_30d
          FROM per_user
        `,
        sql`
          SELECT
            TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day_iso,
            TO_CHAR(DATE(created_at), 'DD.MM') AS day_label,
            COUNT(DISTINCT CASE WHEN source = 'telegram' THEN user_id END)::int AS tg_users,
            COUNT(DISTINCT CASE WHEN source = 'web' THEN user_id END)::int AS web_users,
            COUNT(*)::int AS events
          FROM app_events
          WHERE created_at >= ${since14Iso}::timestamptz
            AND source <> 'admin'
            AND user_id <> ${excludedId}
          GROUP BY DATE(created_at)
          ORDER BY DATE(created_at) ASC
        `,
        sql`
          SELECT
            COALESCE(page, 'unknown') AS page,
            COUNT(DISTINCT CASE WHEN source = 'telegram' THEN user_id END)::int AS tg_users,
            COUNT(DISTINCT CASE WHEN source = 'web' THEN user_id END)::int AS web_users,
            COUNT(*)::int AS opens
          FROM app_events
          WHERE event = 'page_view'
            AND created_at >= ${sinceIso}::timestamptz
            AND source <> 'admin'
            AND user_id <> ${excludedId}
          GROUP BY COALESCE(page, 'unknown')
          ORDER BY opens DESC
          LIMIT 16
        `,
        sql`
          SELECT
            COALESCE(NULLIF(lang, ''), 'unknown') AS lang,
            COUNT(DISTINCT user_id)::int AS users
          FROM app_events
          WHERE created_at >= ${sinceIso}::timestamptz
            AND source <> 'admin'
            AND user_id <> ${excludedId}
          GROUP BY COALESCE(NULLIF(lang, ''), 'unknown')
          ORDER BY users DESC
          LIMIT 6
        `,
        sql`
          SELECT
            COALESCE(NULLIF(platform, ''), 'web') AS platform,
            COUNT(DISTINCT user_id)::int AS users
          FROM app_events
          WHERE created_at >= ${sinceIso}::timestamptz
            AND source <> 'admin'
            AND user_id <> ${excludedId}
          GROUP BY COALESCE(NULLIF(platform, ''), 'web')
          ORDER BY users DESC
          LIMIT 6
        `,
        sql`
          SELECT
            event,
            COUNT(DISTINCT user_id)::int AS unique_users,
            COUNT(*)::int AS total
          FROM app_events
          WHERE created_at >= ${sinceIso}::timestamptz
            AND source <> 'admin'
            AND user_id <> ${excludedId}
          GROUP BY event
          ORDER BY total DESC
          LIMIT 14
        `,
        sql`
          SELECT product_id, COUNT(*)::int AS count
          FROM user_purchases
          GROUP BY product_id
          ORDER BY count DESC
        `,
        sql`
          SELECT
            e.user_id,
            MAX(e.username) AS username,
            MAX(e.first_name) AS first_name,
            MAX(e.source) AS source,
            MAX(e.platform) AS platform,
            MAX(e.lang) AS lang,
            COUNT(*)::int AS events_count,
            COUNT(DISTINCT DATE(e.created_at))::int AS active_days,
            MIN(e.created_at) AS first_seen,
            MAX(e.created_at) AS last_seen,
            (ARRAY_AGG(e.page ORDER BY e.created_at DESC))[1] AS last_page,
            (
              SELECT COUNT(*)::int
              FROM user_purchases p
              WHERE p.user_id::text = e.user_id::text
            ) AS pro_count
          FROM app_events e
          WHERE e.source <> 'admin' AND e.user_id <> ${excludedId}
          GROUP BY e.user_id
          ORDER BY MAX(e.created_at) DESC
          LIMIT 80
        `,
        sql`
          SELECT id, user_id, username, first_name, event, meta, created_at
          FROM app_events
          WHERE source = 'admin'
          ORDER BY created_at DESC
          LIMIT 50
        `,
      ]);

      let bannedUsers: any[] = [];
      try {
        bannedUsers = await sql`
          SELECT user_id, reason, created_at
          FROM banned_users
          ORDER BY created_at DESC
          LIMIT 60
        `;
      } catch {
        bannedUsers = [];
      }

      const proBreakdown = proByProductRows.map((row: any) => {
        const pid = String(row.product_id);
        const count = Number(row.count) || 0;
        const unitStars = PRODUCT_PRICES_STARS[pid] ?? 250;
        const stars = count * unitStars;
        return {
          product_id: pid,
          count,
          stars,
          net_usd: Number((stars * 0.0123).toFixed(2)),
        };
      });

      const totalProCount = proBreakdown.reduce((a, b) => a + b.count, 0);
      const totalStars = proBreakdown.reduce((a, b) => a + b.stars, 0);
      const totalNetUsd = Number((totalStars * 0.0123).toFixed(2));

      const curTotalUsers = Number(summaryRows[0]?.total_users) || 0;
      const curTotalEvents = Number(summaryRows[0]?.total_events) || 0;
      const avgEvents =
        curTotalUsers > 0 ? Number((curTotalEvents / curTotalUsers).toFixed(1)) : 0;

      const retTotal = Number(retentionRows[0]?.total_30d) || 0;
      const retBack = Number(retentionRows[0]?.returning_30d) || 0;
      const retentionPct = retTotal > 0 ? Math.round((retBack / retTotal) * 100) : 0;

      return res.status(200).json({
        isAdmin: true,
        days,
        hideAdmin,
        syncedAt: new Date().toISOString(),
        summary: {
          tg_users: Number(summaryRows[0]?.tg_users) || 0,
          web_users: Number(summaryRows[0]?.web_users) || 0,
          total_users: curTotalUsers,
          total_events: curTotalEvents,
          avg_events_per_user: avgEvents,
          new_users: Number(newVsRetRows[0]?.new_users) || 0,
          returning_users: Number(newVsRetRows[0]?.returning_users) || 0,
          retention_pct: retentionPct,
          total_pro: totalProCount,
          total_stars: totalStars,
          total_net_usd: totalNetUsd,
        },
        previous: {
          tg_users: Number(prevSummaryRows[0]?.tg_users) || 0,
          web_users: Number(prevSummaryRows[0]?.web_users) || 0,
          total_users: Number(prevSummaryRows[0]?.total_users) || 0,
          total_events: Number(prevSummaryRows[0]?.total_events) || 0,
        },
        daily: dailyRows,
        topPages: pagesRows,
        langs: langsRows,
        platforms: platformsRows,
        events: eventsRows,
        proBreakdown,
        users: usersRows,
        bannedUsers,
        auditLog: auditRows,
      });
    } catch (err: any) {
      console.error('[stats] DB error:', err);
      return res.status(500).json({
        error: 'Failed to load stats',
        detail: String(err?.message || err),
      });
    }
  }

  // === 3. DAY DRILL-DOWN ===
  if (rawAction === 'day' && req.method === 'GET') {
    const adminUser = getVerifiedAdmin(rawInitData, botToken, adminId);
    if (!adminUser) return res.status(403).json({ error: 'Forbidden' });

    const dateStr = String(req.query?.date || '').trim();
    if (!DATE_REGEX.test(dateStr)) {
      return res.status(400).json({ error: 'Invalid date format YYYY-MM-DD' });
    }
    const hideAdmin = String(req.query?.hideAdmin ?? '1') === '1';
    const excludedId = hideAdmin ? adminId : '__none__';

    try {
      const sql = neon(connectionString);
      const [pages, users] = await Promise.all([
        sql`
          SELECT COALESCE(page, 'unknown') AS page, COUNT(*)::int AS opens
          FROM app_events
          WHERE DATE(created_at) = ${dateStr}::date
            AND source <> 'admin'
            AND user_id <> ${excludedId}
          GROUP BY COALESCE(page, 'unknown')
          ORDER BY opens DESC
          LIMIT 10
        `,
        sql`
          SELECT
            user_id,
            MAX(username) AS username,
            MAX(first_name) AS first_name,
            MAX(source) AS source,
            COUNT(*)::int AS events_count
          FROM app_events
          WHERE DATE(created_at) = ${dateStr}::date
            AND source <> 'admin'
            AND user_id <> ${excludedId}
          GROUP BY user_id
          ORDER BY COUNT(*) DESC
          LIMIT 15
        `,
      ]);
      return res.status(200).json({ date: dateStr, pages, users });
    } catch (err) {
      console.error('[day] DB error:', err);
      return res.status(500).json({ error: 'Failed to load day details' });
    }
  }

  // === 4. SYSTEM HEALTH ===
  if (rawAction === 'health' && req.method === 'GET') {
    const adminUser = getVerifiedAdmin(rawInitData, botToken, adminId);
    if (!adminUser) return res.status(403).json({ error: 'Forbidden' });

    const started = Date.now();
    try {
      const sql = neon(connectionString);
      const [evMeta, purMeta] = await Promise.all([
        sql`SELECT COUNT(*)::int AS count, MAX(created_at) AS last_at FROM app_events`,
        sql`SELECT COUNT(*)::int AS count FROM user_purchases`,
      ]);
      let banCount: number | null = null;
      try {
        const b = await sql`SELECT COUNT(*)::int AS count FROM banned_users`;
        banCount = Number(b[0]?.count) || 0;
      } catch {
        banCount = null;
      }
      const dbLatencyMs = Date.now() - started;
      return res.status(200).json({
        checkedAt: new Date().toISOString(),
        apiStatus: 'ok',
        dbStatus: dbLatencyMs > 1800 ? 'warn' : 'ok',
        dbLatencyMs,
        botTokenConfigured: Boolean(botToken),
        adminIdConfigured: Boolean(adminId),
        tables: {
          app_events: Number(evMeta[0]?.count) || 0,
          user_purchases: Number(purMeta[0]?.count) || 0,
          banned_users: banCount,
        },
        lastEventAt: evMeta[0]?.last_at || null,
      });
    } catch (err: any) {
      return res.status(200).json({
        checkedAt: new Date().toISOString(),
        apiStatus: 'ok',
        dbStatus: 'error',
        dbLatencyMs: Date.now() - started,
        error: String(err?.message || 'DB unreachable'),
        botTokenConfigured: Boolean(botToken),
        adminIdConfigured: Boolean(adminId),
        tables: { app_events: null, user_purchases: null, banned_users: null },
        lastEventAt: null,
      });
    }
  }

  // === 5. USER PROFILE ===
  if (rawAction === 'user' && req.method === 'GET') {
    const adminUser = getVerifiedAdmin(rawInitData, botToken, adminId);
    if (!adminUser) return res.status(403).json({ error: 'Forbidden' });

    const targetId = String(req.query?.targetId || '').trim();
    if (!targetId) return res.status(400).json({ error: 'Missing targetId' });

    try {
      const sql = neon(connectionString);
      const [events, purchases, adminHistory] = await Promise.all([
        sql`
          SELECT event, page, platform, lang, created_at
          FROM app_events
          WHERE user_id = ${targetId} AND source <> 'admin'
          ORDER BY created_at DESC
          LIMIT 25
        `,
        sql`
          SELECT product_id
          FROM user_purchases
          WHERE user_id::text = ${targetId}
        `,
        sql`
          SELECT event, meta, created_at
          FROM app_events
          WHERE source = 'admin' AND meta->>'targetUserId' = ${targetId}
          ORDER BY created_at DESC
          LIMIT 10
        `,
      ]);
      return res.status(200).json({
        userId: targetId,
        events,
        products: purchases.map((r: any) => String(r.product_id)),
        adminHistory,
      });
    } catch (err) {
      console.error('[user] DB error:', err);
      return res.status(500).json({ error: 'Failed to load user profile' });
    }
  }

  // === 6. GRANT / REVOKE PRO (with real Audit Log) ===
  if (rawAction === 'grant' && req.method === 'POST') {
    const adminUser = getVerifiedAdmin(rawInitData, botToken, adminId);
    if (!adminUser) return res.status(403).json({ error: 'Forbidden' });

    let body: Record<string, any> = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const targetUserId = String(body.targetUserId || '').trim();
    const productId = String(body.productId || '').trim();
    const revoke = Boolean(body.revoke);

    if (!/^\d{3,20}$/.test(targetUserId)) {
      return res.status(400).json({ error: 'Некорректный Telegram ID (нужны только цифры)' });
    }

    const productsToApply: string[] =
      productId === 'all'
        ? [...ALL_PRO_PRODUCTS]
        : PRODUCT_ID_REGEX.test(productId)
        ? [productId]
        : [];

    if (productsToApply.length === 0) {
      return res.status(400).json({ error: 'Некорректный productId' });
    }

    try {
      const sql = neon(connectionString);
      for (let i = 0; i < productsToApply.length; i++) {
        const pid = productsToApply[i];
        if (revoke) {
          await sql`
            DELETE FROM user_purchases
            WHERE user_id::text = ${targetUserId} AND product_id = ${pid}
          `;
        } else {
          const exists = await sql`
            SELECT 1 FROM user_purchases
            WHERE user_id::text = ${targetUserId} AND product_id = ${pid}
            LIMIT 1
          `;
          if (exists.length === 0) {
            await sql`
              INSERT INTO user_purchases (user_id, product_id)
              VALUES (${targetUserId}, ${pid})
            `;
          }
        }
      }
      await logAdminAudit(sql, adminUser, revoke ? 'admin_revoke_pro' : 'admin_grant_pro', {
        targetUserId,
        productId,
        result: 'ok',
      });
      return res.status(200).json({ ok: true, targetUserId, products: productsToApply, revoke });
    } catch (err) {
      console.error('[grant] DB error:', err);
      return res.status(500).json({ error: 'Ошибка обновления доступа в Neon' });
    }
  }

  // === 7. BAN / UNBAN (with real Audit Log) ===
  if (rawAction === 'ban' && req.method === 'POST') {
    const adminUser = getVerifiedAdmin(rawInitData, botToken, adminId);
    if (!adminUser) return res.status(403).json({ error: 'Forbidden' });

    let body: Record<string, any> = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const targetUserId = String(body.targetUserId || '').trim();
    const unban = Boolean(body.unban);
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 160) : '';

    if (!targetUserId || targetUserId.length < 3 || targetUserId.length > 64) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }
    if (!unban && targetUserId === adminId) {
      return res.status(400).json({ error: 'Нельзя заблокировать самого себя' });
    }

    try {
      const sql = neon(connectionString);
      if (unban) {
        await sql`DELETE FROM banned_users WHERE user_id = ${targetUserId}`;
      } else {
        await sql`
          INSERT INTO banned_users (user_id, reason)
          VALUES (${targetUserId}, ${reason || 'Доступ ограничен администратором'})
          ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()
        `;
      }
      await logAdminAudit(sql, adminUser, unban ? 'admin_unban' : 'admin_ban', {
        targetUserId,
        reason: reason || null,
        result: 'ok',
      });
      return res.status(200).json({ ok: true, targetUserId, unban });
    } catch (err) {
      console.error('[ban] DB error:', err);
      return res.status(500).json({ error: 'Ошибка обновления бана' });
    }
  }

  // === 8. STANDARD PURCHASE CHECK ===
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

  if (!rawInitData) {
    return res.status(401).json({ error: 'Требуется X-Telegram-Init-Data' });
  }
  if (!botToken) {
    return res.status(500).json({ error: 'Токен бота не настроен на сервере' });
  }
  const verification = verifyTelegramInitData(rawInitData, botToken);
  if (!verification.valid) return res.status(401).json({ error: verification.reason });
  if (rawUserId && String(verification.user.id) !== String(rawUserId).trim()) {
    return res.status(403).json({ error: 'Несовпадение userId с initData' });
  }
  const verifiedUserId = String(verification.user.id);

  try {
    const sql = neon(connectionString);
    if (verifiedUserId !== adminId) {
      try {
        const banRows = await sql`
          SELECT 1 FROM banned_users WHERE user_id = ${verifiedUserId} LIMIT 1
        `;
        if (banRows.length > 0) {
          return res.status(200).json({
            purchased: false,
            banned: true,
            userId: Number(verifiedUserId),
            productId: rawProductId,
          });
        }
      } catch {
        // ignore
      }
    }

    const result = await sql`
      SELECT 1
      FROM user_purchases
      WHERE user_id::text = ${verifiedUserId}
        AND product_id = ${rawProductId}
      LIMIT 1
    `;

    return res.status(200).json({
      purchased: result.length > 0,
      userId: Number(verifiedUserId),
      productId: rawProductId,
    });
  } catch (error: unknown) {
    console.error('[check-purchase] DB error:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка при проверке покупки' });
  }
}
