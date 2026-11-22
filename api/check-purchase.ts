import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const PRO_PRICES: Record<string, number> = {
  pro_sizes: 150,
  pro_colors: 250,
  pro_heel: 250,
  pro_last: 250,
  pro_videos: 350,
  pro_pigments: 1000,
  pro_width_calc: 250,
  pro_glossary: 250,
  pro_market: 250,
};

const ALL_CORE_PRO_IDS = [
  'pro_sizes',
  'pro_colors',
  'pro_heel',
  'pro_last',
  'pro_videos',
  'pro_pigments',
];

const WEB_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const OTP_TTL_MS = 2 * 60 * 1000;

type AuthResult = {
  ok: boolean;
  adminId: string;
  via: 'telegram' | 'web' | 'none';
};

function parseMetaObj(meta: unknown): Record<string, unknown> {
  if (!meta) return {};
  if (typeof meta === 'object') return meta as Record<string, unknown>;
  if (typeof meta === 'string') {
    try {
      const parsed = JSON.parse(meta) as unknown;
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function formatAuditMeta(meta: unknown): string {
  if (!meta) return '';
  if (typeof meta === 'string') {
    const obj = parseMetaObj(meta);
    if (obj.productId) return String(obj.productId);
    if (obj.reason) return String(obj.reason);
    if (obj.ttl) return String(obj.ttl);
    return meta;
  }
  if (typeof meta === 'object') {
    const obj = meta as Record<string, unknown>;
    if (obj.productId) return String(obj.productId);
    if (obj.reason) return String(obj.reason);
    if (obj.ttl) return String(obj.ttl);
    return JSON.stringify(obj);
  }
  return String(meta);
}

function verifyTelegramInitData(initData: string, botToken: string): string | null {
  try {
    if (!initData || !botToken) return null;
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');

    const keys = Array.from(params.keys()).sort();
    const dataCheckString = keys.map((k) => `${k}=${params.get(k) || ''}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const hashBuf = Buffer.from(hash, 'hex');
    const compBuf = Buffer.from(computedHash, 'hex');
    if (hashBuf.length !== compBuf.length) return null;
    if (!crypto.timingSafeEqual(hashBuf, compBuf)) return null;

    const userRaw = params.get('user');
    if (!userRaw) return null;
    const userObj = JSON.parse(userRaw) as { id?: number | string };
    return userObj.id != null ? String(userObj.id) : null;
  } catch {
    return null;
  }
}

function getWebSigningKey(botToken: string): Buffer {
  return crypto.createHmac('sha256', 'CordwaineAdminWebSession').update(botToken).digest();
}

function computeOtpSig(botToken: string, challengeId: string, expMs: number, code: string): string {
  return crypto
    .createHmac('sha256', getWebSigningKey(botToken))
    .update(`otp:${challengeId}:${expMs}:${code}`)
    .digest('hex');
}

function createWebSessionToken(adminId: string, botToken: string): { token: string; expMs: number } {
  const expMs = Date.now() + WEB_TOKEN_TTL_MS;
  const nonce = crypto.randomBytes(16).toString('hex');
  const sig = crypto
    .createHmac('sha256', getWebSigningKey(botToken))
    .update(`${adminId}:${expMs}:${nonce}`)
    .digest('hex');
  return { token: `${expMs}.${nonce}.${sig}`, expMs };
}

function verifyWebSessionToken(token: string, adminId: string, botToken: string): boolean {
  try {
    if (!token || !adminId || !botToken) return false;
    const parts = token.trim().split('.');
    if (parts.length !== 3) return false;
    const [expStr, nonce, sigHex] = parts;
    const expMs = Number(expStr);
    if (!Number.isFinite(expMs) || expMs <= Date.now()) return false;
    if (!/^[0-9a-f]{32}$/i.test(nonce) || !/^[0-9a-f]{64}$/i.test(sigHex)) return false;

    const expectedHex = crypto
      .createHmac('sha256', getWebSigningKey(botToken))
      .update(`${adminId}:${expMs}:${nonce}`)
      .digest('hex');

    const a = Buffer.from(sigHex, 'hex');
    const b = Buffer.from(expectedHex, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function authorizeTelegramOnly(req: VercelRequest): AuthResult {
  const expectedAdminId = (process.env.ADMIN_TELEGRAM_ID || '').trim();
  const botToken = (process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const rawInit = req.headers['x-telegram-init-data'];
  const initData = Array.isArray(rawInit) ? rawInit[0] : rawInit || '';

  if (initData && botToken && expectedAdminId) {
    const tgUserId = verifyTelegramInitData(initData, botToken);
    if (tgUserId && tgUserId === expectedAdminId) {
      return { ok: true, adminId: expectedAdminId, via: 'telegram' };
    }
  }
  return { ok: false, adminId: '', via: 'none' };
}

function authorizeAdmin(req: VercelRequest): AuthResult {
  const tgAuth = authorizeTelegramOnly(req);
  if (tgAuth.ok) return tgAuth;

  const expectedAdminId = (process.env.ADMIN_TELEGRAM_ID || '').trim();
  const botToken = (process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const rawTok = req.headers['x-admin-token'];
  const token = Array.isArray(rawTok) ? rawTok[0] : rawTok || '';

  if (token && verifyWebSessionToken(token, expectedAdminId, botToken)) {
    return { ok: true, adminId: expectedAdminId, via: 'web' };
  }

  return { ok: false, adminId: '', via: 'none' };
}

function getSql() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  if (!dbUrl) throw new Error('DATABASE_URL is not configured');
  return neon(dbUrl);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data, X-Admin-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = String(req.query.action || '').trim();

  try {
    const sql = getSql();

    // 1) Request one-time 6-digit Telegram OTP for PC/Chrome login
    if (action === 'otp-request' && req.method === 'POST') {
      const adminId = (process.env.ADMIN_TELEGRAM_ID || '').trim();
      const botToken = (process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').trim();
      if (!adminId || !botToken) {
        return res.status(500).json({ ok: false, error: 'Бот или ADMIN_TELEGRAM_ID не настроены' });
      }

      const cooldownIso = new Date(Date.now() - 60 * 1000).toISOString();
      const recentSent = await sql`
        SELECT 1 FROM app_events
        WHERE source = 'admin_otp' AND event = 'otp_sent' AND created_at >= ${cooldownIso}::timestamptz
        LIMIT 1
      `;
      if (recentSent.length > 0) {
        return res.status(429).json({
          ok: false,
          error: 'Код уже отправлен. Подождите 1 минуту перед повторным запросом.',
        });
      }

      const code = String(crypto.randomInt(100000, 1000000));
      const challengeId = crypto.randomBytes(12).toString('hex');
      const expMs = Date.now() + OTP_TTL_MS;
      const sig = computeOtpSig(botToken, challengeId, expMs, code);
      const metaJson = JSON.stringify({ expMs, sig });

      const tgText = [
        '🔐 CORDWAINE Command Center',
        '',
        `Код входа в браузер: ${code}`,
        '',
        'Действует 2 минуты (макс. 3 попытки).',
        'Если это не вы — просто проигнорируйте.',
      ].join('\n');

      const tgResp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminId,
          text: tgText,
        }),
      });

      if (!tgResp.ok) {
        return res.status(502).json({
          ok: false,
          error: 'Не удалось отправить код в Telegram. Убедитесь, что диалог с ботом открыт.',
        });
      }

      await sql`
        INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
        VALUES (${adminId}, '', 'Admin', 'admin_otp', 'web', 'ru', 'otp_sent', ${challengeId}, ${metaJson})
      `;

      return res.status(200).json({ ok: true, challengeId, ttlSec: 120 });
    }

    // 2) Verify one-time 6-digit Telegram OTP (strict 3 tries/code, 5 fails/10min, single-use)
    if (action === 'otp-verify' && req.method === 'POST') {
      const adminId = (process.env.ADMIN_TELEGRAM_ID || '').trim();
      const botToken = (process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').trim();
      if (!adminId || !botToken) {
        return res.status(500).json({ ok: false, error: 'Сервер не настроен' });
      }

      const body = (req.body || {}) as Record<string, unknown>;
      const challengeId = String(body.challengeId || '').trim();
      const code = String(body.code || '').replace(/\s+/g, '');

      if (!/^[0-9a-f]{24}$/i.test(challengeId) || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ ok: false, error: 'Введите 6 цифр из Telegram' });
      }

      const tenMinAgoIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const globalFails = await sql`
        SELECT COUNT(*)::int AS cnt FROM app_events
        WHERE source = 'admin_otp' AND event = 'otp_fail' AND created_at >= ${tenMinAgoIso}::timestamptz
      `;
      if (Number(globalFails[0]?.cnt || 0) >= 5) {
        return res.status(429).json({
          ok: false,
          error: 'Слишком много неверных попыток. Повторите через 10 минут.',
        });
      }

      const [usedRows, failRows, sentRows] = await Promise.all([
        sql`
          SELECT 1 FROM app_events
          WHERE source = 'admin_otp' AND event = 'otp_used' AND page = ${challengeId}
          LIMIT 1
        `,
        sql`
          SELECT COUNT(*)::int AS cnt FROM app_events
          WHERE source = 'admin_otp' AND event = 'otp_fail' AND page = ${challengeId}
        `,
        sql`
          SELECT meta FROM app_events
          WHERE source = 'admin_otp' AND event = 'otp_sent' AND page = ${challengeId}
          ORDER BY created_at DESC LIMIT 1
        `,
      ]);

      if (usedRows.length > 0 || Number(failRows[0]?.cnt || 0) >= 3 || sentRows.length === 0) {
        return res.status(403).json({
          ok: false,
          error: 'Код больше не действителен. Запросите новый.',
        });
      }

      const metaObj = parseMetaObj(sentRows[0].meta);
      const expMs = Number(metaObj.expMs || 0);
      const savedSig = String(metaObj.sig || '');

      if (!Number.isFinite(expMs) || Date.now() > expMs || !/^[0-9a-f]{64}$/i.test(savedSig)) {
        return res.status(403).json({
          ok: false,
          error: 'Срок действия кода (2 мин) истёк. Запросите новый.',
        });
      }

      const candidateSig = computeOtpSig(botToken, challengeId, expMs, code);
      const a = Buffer.from(candidateSig, 'hex');
      const b = Buffer.from(savedSig, 'hex');
      const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

      if (!valid) {
        const failMeta = JSON.stringify({ attempt: Number(failRows[0]?.cnt || 0) + 1 });
        await sql`
          INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
          VALUES (${adminId}, '', 'Admin', 'admin_otp', 'web', 'ru', 'otp_fail', ${challengeId}, ${failMeta})
        `;
        const left = Math.max(0, 2 - Number(failRows[0]?.cnt || 0));
        return res.status(403).json({
          ok: false,
          error: left > 0 ? `Неверный код (осталось попыток: ${left})` : 'Код заблокирован. Запросите новый.',
        });
      }

      // Burn OTP permanently & mint 12h HMAC session token
      const usedMeta = JSON.stringify({ used: true });
      await sql`
        INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
        VALUES (${adminId}, '', 'Admin', 'admin_otp', 'web', 'ru', 'otp_used', ${challengeId}, ${usedMeta})
      `;

      const { token, expMs: sessionExp } = createWebSessionToken(adminId, botToken);

      try {
        const auditMeta = JSON.stringify({ ttl: '12h' });
        await sql`
          INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
          VALUES (${adminId}, '', 'Admin', 'admin', 'web', 'ru', 'admin_otp_login', 'chrome_otp', ${auditMeta})
        `;
      } catch (logErr) {
        console.error('audit otp login log error:', logErr);
      }

      return res.status(200).json({
        ok: true,
        token,
        expiresAt: new Date(sessionExp).toISOString(),
        ttlHours: 12,
      });
    }

    if (action === 'web-token' && req.method === 'POST') {
      const tgAuth = authorizeTelegramOnly(req);
      if (!tgAuth.ok) {
        return res.status(403).json({ ok: false, error: 'Выпуск ссылки доступен только из Telegram' });
      }
      const botToken = (process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').trim();
      const { token, expMs } = createWebSessionToken(tgAuth.adminId, botToken);

      try {
        const auditMeta = JSON.stringify({ ttl: '12h' });
        await sql`
          INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
          VALUES (${tgAuth.adminId}, '', 'Admin', 'admin', 'telegram', 'ru', 'admin_web_token', 'chrome_session', ${auditMeta})
        `;
      } catch (logErr) {
        console.error('audit web-token log error:', logErr);
      }

      return res.status(200).json({
        ok: true,
        token,
        expiresAt: new Date(expMs).toISOString(),
        ttlHours: 12,
      });
    }

    if (action === 'track' && req.method === 'POST') {
      const body = (req.body || {}) as Record<string, unknown>;
      const userId = String(body.userId || body.user_id || '').slice(0, 80);
      const username = String(body.username || '').slice(0, 80);
      const firstName = String(body.firstName || body.first_name || '').slice(0, 80);
      const source = body.source === 'telegram' ? 'telegram' : 'web';
      const platform = String(body.platform || 'unknown').slice(0, 40);
      const lang = String(body.lang || 'unknown').slice(0, 16);
      const eventName = String(body.event || 'page_view').slice(0, 64);
      const page = String(body.page || 'welcome').slice(0, 64);
      const meta = body.meta ? JSON.stringify(body.meta).slice(0, 1000) : null;

      if (!userId) {
        return res.status(200).json({ ok: true, banned: false });
      }

      const banRows = await sql`
        SELECT reason FROM banned_users WHERE user_id = ${userId} LIMIT 1
      `;
      if (banRows.length > 0) {
        return res.status(200).json({
          ok: true,
          banned: true,
          reason: String(banRows[0].reason || 'Доступ ограничен администратором'),
        });
      }

      await sql`
        INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
        VALUES (${userId}, ${username}, ${firstName}, ${source}, ${platform}, ${lang}, ${eventName}, ${page}, ${meta})
      `;

      return res.status(200).json({ ok: true, banned: false });
    }

    if (action === 'stats') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
      }

      if (String(req.query.check || '') === '1') {
        return res.status(200).json({ ok: true, admin: true, via: auth.via });
      }

      const daysNum = Math.min(3650, Math.max(1, Number(req.query.days || 7) || 7));
      const hideAdmin = String(req.query.hideAdmin || '1') !== '0';
      const excludeId = hideAdmin && auth.adminId ? auth.adminId : '__none__';

      const now = Date.now();
      const sinceIso = new Date(now - daysNum * 86400000).toISOString();
      const prevSinceIso = new Date(now - daysNum * 2 * 86400000).toISOString();
      const fourteenDaysIso = new Date(now - 14 * 86400000).toISOString();
      const thirtyDaysIso = new Date(now - 30 * 86400000).toISOString();

      const summaryRows = await sql`
        SELECT
          COUNT(DISTINCT CASE WHEN source = 'telegram' THEN user_id END)::int AS tg_unique,
          COUNT(DISTINCT CASE WHEN source = 'web' THEN user_id END)::int AS web_unique,
          COUNT(*)::int AS total_events
        FROM app_events
        WHERE created_at >= ${sinceIso}::timestamptz
          AND source IN ('telegram', 'web')
          AND user_id <> ${excludeId}
      `;

      const prevSummaryRows = await sql`
        SELECT
          COUNT(DISTINCT CASE WHEN source = 'telegram' THEN user_id END)::int AS tg_unique,
          COUNT(DISTINCT CASE WHEN source = 'web' THEN user_id END)::int AS web_unique,
          COUNT(*)::int AS total_events
        FROM app_events
        WHERE created_at >= ${prevSinceIso}::timestamptz
          AND created_at < ${sinceIso}::timestamptz
          AND source IN ('telegram', 'web')
          AND user_id <> ${excludeId}
      `;

      const retentionRows = await sql`
        WITH first_seen AS (
          SELECT user_id, MIN(created_at) AS first_at
          FROM app_events
          WHERE source IN ('telegram', 'web') AND user_id <> ${excludeId}
          GROUP BY user_id
        ),
        active_period AS (
          SELECT DISTINCT user_id
          FROM app_events
          WHERE created_at >= ${sinceIso}::timestamptz
            AND source IN ('telegram', 'web')
            AND user_id <> ${excludeId}
        ),
        active_30 AS (
          SELECT user_id, COUNT(DISTINCT DATE(created_at)) AS active_days
          FROM app_events
          WHERE created_at >= ${thirtyDaysIso}::timestamptz
            AND source IN ('telegram', 'web')
            AND user_id <> ${excludeId}
          GROUP BY user_id
        )
        SELECT
          COUNT(CASE WHEN f.first_at >= ${sinceIso}::timestamptz THEN 1 END)::int AS new_users,
          COUNT(CASE WHEN f.first_at < ${sinceIso}::timestamptz THEN 1 END)::int AS returning_users,
          (SELECT COUNT(*)::int FROM active_30 WHERE active_days > 1) AS retained_30d,
          (SELECT COUNT(*)::int FROM active_30) AS total_30d
        FROM active_period a
        JOIN first_seen f ON f.user_id = a.user_id
      `;

      const dailyRows = await sql`
        SELECT
          TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day_iso,
          TO_CHAR(DATE(created_at), 'DD.MM') AS label,
          COUNT(DISTINCT CASE WHEN source = 'telegram' THEN user_id END)::int AS tg,
          COUNT(DISTINCT CASE WHEN source = 'web' THEN user_id END)::int AS web,
          COUNT(*)::int AS events
        FROM app_events
        WHERE created_at >= ${fourteenDaysIso}::timestamptz
          AND source IN ('telegram', 'web')
          AND user_id <> ${excludeId}
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `;

      const dailyMap: Record<string, { day_iso: string; label: string; tg: number; web: number; events: number }> = {};
      for (const r of dailyRows) {
        const iso = String(r.day_iso);
        dailyMap[iso] = {
          day_iso: iso,
          label: String(r.label),
          tg: Number(r.tg || 0),
          web: Number(r.web || 0),
          events: Number(r.events || 0),
        };
      }
      const daily: Array<{ day_iso: string; label: string; tg: number; web: number; events: number }> = [];
      for (let i = 13; i >= 0; i -= 1) {
        const d = new Date(now - i * 86400000);
        const iso = d.toISOString().slice(0, 10);
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        daily.push(
          dailyMap[iso] || {
            day_iso: iso,
            label: `${dd}.${mm}`,
            tg: 0,
            web: 0,
            events: 0,
          },
        );
      }

      const pagesRows = await sql`
        SELECT
          COALESCE(NULLIF(page, ''), 'welcome') AS page,
          COUNT(DISTINCT CASE WHEN source = 'telegram' THEN user_id END)::int AS tg,
          COUNT(DISTINCT CASE WHEN source = 'web' THEN user_id END)::int AS web,
          COUNT(*)::int AS events
        FROM app_events
        WHERE created_at >= ${sinceIso}::timestamptz
          AND source IN ('telegram', 'web')
          AND user_id <> ${excludeId}
        GROUP BY COALESCE(NULLIF(page, ''), 'welcome')
        ORDER BY (COUNT(DISTINCT user_id)) DESC, COUNT(*) DESC
        LIMIT 16
      `;

      const eventsRows = await sql`
        SELECT
          event,
          COUNT(DISTINCT user_id)::int AS users,
          COUNT(*)::int AS count
        FROM app_events
        WHERE created_at >= ${sinceIso}::timestamptz
          AND source IN ('telegram', 'web')
          AND user_id <> ${excludeId}
        GROUP BY event
        ORDER BY COUNT(*) DESC
        LIMIT 16
      `;

      const langRows = await sql`
        SELECT
          UPPER(COALESCE(NULLIF(lang, ''), 'UNKNOWN')) AS name,
          COUNT(DISTINCT user_id)::int AS value
        FROM app_events
        WHERE created_at >= ${sinceIso}::timestamptz
          AND source IN ('telegram', 'web')
          AND user_id <> ${excludeId}
        GROUP BY UPPER(COALESCE(NULLIF(lang, ''), 'UNKNOWN'))
        ORDER BY value DESC
        LIMIT 8
      `;

      const platformRows = await sql`
        SELECT
          LOWER(COALESCE(NULLIF(platform, ''), 'unknown')) AS name,
          COUNT(DISTINCT user_id)::int AS value
        FROM app_events
        WHERE created_at >= ${sinceIso}::timestamptz
          AND source IN ('telegram', 'web')
          AND user_id <> ${excludeId}
        GROUP BY LOWER(COALESCE(NULLIF(platform, ''), 'unknown'))
        ORDER BY value DESC
        LIMIT 8
      `;

      const proRows = await sql`
        SELECT product_id, COUNT(DISTINCT user_id::text)::int AS count
        FROM user_purchases
        WHERE user_id::text <> ${excludeId}
        GROUP BY product_id
        ORDER BY count DESC
      `;

      const proUsersRows = await sql`
        SELECT COUNT(DISTINCT user_id::text)::int AS cnt
        FROM user_purchases
        WHERE user_id::text <> ${excludeId}
      `;

      let totalProCount = 0;
      let totalStars = 0;
      const proBreakdown = proRows.map((r) => {
        const pid = String(r.product_id);
        const cnt = Number(r.count || 0);
        const stars = cnt * (PRO_PRICES[pid] || 250);
        totalProCount += cnt;
        totalStars += stars;
        return { product_id: pid, count: cnt, stars };
      });
      const proUsersCount = Number(proUsersRows[0]?.cnt || 0);

      const usersRows = await sql`
        SELECT
          e.user_id,
          MAX(e.username) AS username,
          MAX(e.first_name) AS first_name,
          MAX(e.source) AS source,
          MAX(e.platform) AS platform,
          MAX(e.lang) AS lang,
          (ARRAY_AGG(e.page ORDER BY e.created_at DESC))[1] AS last_page,
          COUNT(*)::int AS events,
          MAX(e.created_at) AS last_seen,
          COALESCE(p.pro_count, 0)::int AS pro_count,
          CASE WHEN b.user_id IS NOT NULL THEN true ELSE false END AS is_banned
        FROM app_events e
        LEFT JOIN (
          SELECT user_id::text AS uid, COUNT(DISTINCT product_id)::int AS pro_count
          FROM user_purchases
          GROUP BY user_id::text
        ) p ON p.uid = e.user_id::text
        LEFT JOIN banned_users b ON b.user_id::text = e.user_id::text
        WHERE e.created_at >= ${sinceIso}::timestamptz
          AND e.source IN ('telegram', 'web')
          AND e.user_id <> ${excludeId}
        GROUP BY e.user_id, p.pro_count, b.user_id
        ORDER BY MAX(e.created_at) DESC
        LIMIT 80
      `;

      const bannedRows = await sql`
        SELECT user_id, reason, created_at
        FROM banned_users
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const auditRows = await sql`
        SELECT id, user_id, event, page, platform, meta, created_at
        FROM app_events
        WHERE source = 'admin'
        ORDER BY created_at DESC
        LIMIT 40
      `;

      const cur = summaryRows[0] || { tg_unique: 0, web_unique: 0, total_events: 0 };
      const prev = prevSummaryRows[0] || { tg_unique: 0, web_unique: 0, total_events: 0 };
      const ret = retentionRows[0] || {
        new_users: 0,
        returning_users: 0,
        retained_30d: 0,
        total_30d: 0,
      };

      const totalUnique = Number(cur.tg_unique || 0) + Number(cur.web_unique || 0);
      const retentionPct =
        Number(ret.total_30d || 0) > 0
          ? Math.round((Number(ret.retained_30d || 0) / Number(ret.total_30d || 1)) * 100)
          : 0;

      return res.status(200).json({
        ok: true,
        via: auth.via,
        days: daysNum,
        hideAdmin,
        summary: {
          tgUnique: Number(cur.tg_unique || 0),
          webUnique: Number(cur.web_unique || 0),
          totalEvents: Number(cur.total_events || 0),
          prevTgUnique: Number(prev.tg_unique || 0),
          prevWebUnique: Number(prev.web_unique || 0),
          prevTotalEvents: Number(prev.total_events || 0),
          newUsers: Number(ret.new_users || 0),
          returningUsers: Number(ret.returning_users || 0),
          retention30d: retentionPct,
          avgEventsPerUser:
            totalUnique > 0 ? Number((Number(cur.total_events || 0) / totalUnique).toFixed(1)) : 0,
          proUsers: proUsersCount,
          proTotal: totalProCount,
          proStars: totalStars,
          proUsdEst: Number((totalStars * 0.0123).toFixed(1)),
        },
        daily,
        pages: pagesRows.map((r) => ({
          page: String(r.page),
          tg: Number(r.tg || 0),
          web: Number(r.web || 0),
          events: Number(r.events || 0),
        })),
        events: eventsRows.map((r) => ({
          event: String(r.event),
          users: Number(r.users || 0),
          count: Number(r.count || 0),
        })),
        languages: langRows.map((r) => ({
          name: String(r.name),
          value: Number(r.value || 0),
        })),
        platforms: platformRows.map((r) => ({
          name: String(r.name),
          value: Number(r.value || 0),
        })),
        proBreakdown,
        users: usersRows.map((r) => ({
          user_id: String(r.user_id),
          username: String(r.username || ''),
          first_name: String(r.first_name || ''),
          source: String(r.source || 'web'),
          platform: String(r.platform || 'unknown'),
          lang: String(r.lang || 'unknown'),
          last_page: String(r.last_page || 'welcome'),
          events: Number(r.events || 0),
          last_seen: String(r.last_seen || ''),
          pro_count: Number(r.pro_count || 0),
          is_banned: Boolean(r.is_banned),
        })),
        banned: bannedRows.map((r) => ({
          user_id: String(r.user_id),
          reason: String(r.reason || ''),
          created_at: String(r.created_at || ''),
        })),
        auditLog: auditRows.map((r) => ({
          id: Number(r.id || 0),
          actor_id: String(r.user_id || ''),
          event: String(r.event || ''),
          target: String(r.page || ''),
          via: String(r.platform || 'telegram'),
          meta: formatAuditMeta(r.meta),
          created_at: String(r.created_at || ''),
        })),
      });
    }

    if (action === 'day') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const dateStr = String(req.query.date || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return res.status(400).json({ ok: false, error: 'Invalid date' });
      }
      const hideAdmin = String(req.query.hideAdmin || '1') !== '0';
      const excludeId = hideAdmin && auth.adminId ? auth.adminId : '__none__';

      const startIso = `${dateStr}T00:00:00.000Z`;
      const endIso = `${dateStr}T23:59:59.999Z`;

      const totals = await sql`
        SELECT
          COUNT(DISTINCT CASE WHEN source = 'telegram' THEN user_id END)::int AS tg,
          COUNT(DISTINCT CASE WHEN source = 'web' THEN user_id END)::int AS web,
          COUNT(*)::int AS events
        FROM app_events
        WHERE created_at >= ${startIso}::timestamptz
          AND created_at <= ${endIso}::timestamptz
          AND source IN ('telegram', 'web')
          AND user_id <> ${excludeId}
      `;

      const topPages = await sql`
        SELECT COALESCE(NULLIF(page, ''), 'welcome') AS page, COUNT(*)::int AS count
        FROM app_events
        WHERE created_at >= ${startIso}::timestamptz
          AND created_at <= ${endIso}::timestamptz
          AND source IN ('telegram', 'web')
          AND user_id <> ${excludeId}
        GROUP BY COALESCE(NULLIF(page, ''), 'welcome')
        ORDER BY count DESC
        LIMIT 8
      `;

      const recentUsers = await sql`
        SELECT
          user_id,
          MAX(username) AS username,
          MAX(first_name) AS first_name,
          MAX(source) AS source,
          COUNT(*)::int AS events
        FROM app_events
        WHERE created_at >= ${startIso}::timestamptz
          AND created_at <= ${endIso}::timestamptz
          AND source IN ('telegram', 'web')
          AND user_id <> ${excludeId}
        GROUP BY user_id
        ORDER BY events DESC
        LIMIT 12
      `;

      const row = totals[0] || { tg: 0, web: 0, events: 0 };
      return res.status(200).json({
        ok: true,
        date: dateStr,
        tg: Number(row.tg || 0),
        web: Number(row.web || 0),
        events: Number(row.events || 0),
        topPages: topPages.map((p) => ({ page: String(p.page), count: Number(p.count || 0) })),
        users: recentUsers.map((u) => ({
          user_id: String(u.user_id),
          username: String(u.username || ''),
          first_name: String(u.first_name || ''),
          source: String(u.source || 'web'),
          events: Number(u.events || 0),
        })),
      });
    }

    if (action === 'health') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const t0 = Date.now();
      const counts = await sql`
        SELECT
          (SELECT COUNT(*)::int FROM app_events WHERE source IN ('telegram', 'web')) AS events_count,
          (SELECT COUNT(*)::int FROM user_purchases) AS purchases_count,
          (SELECT COUNT(*)::int FROM banned_users) AS banned_count,
          (SELECT MAX(created_at) FROM app_events WHERE source IN ('telegram', 'web')) AS last_event_at
      `;
      const latencyMs = Date.now() - t0;
      const row = counts[0] || {};
      const hasAdmin = Boolean((process.env.ADMIN_TELEGRAM_ID || '').trim());
      const hasBot = Boolean((process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').trim());

      return res.status(200).json({
        ok: true,
        latencyMs,
        eventsCount: Number(row.events_count || 0),
        purchasesCount: Number(row.purchases_count || 0),
        bannedCount: Number(row.banned_count || 0),
        lastEventAt: row.last_event_at ? String(row.last_event_at) : null,
        adminIdConfigured: hasAdmin,
        webKeyConfigured: hasAdmin && hasBot,
        via: auth.via,
      });
    }

    if (action === 'user') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const targetId = String(req.query.targetId || '').trim();
      if (!targetId) return res.status(400).json({ ok: false, error: 'Missing targetId' });

      const [events, purchases, ban, adminHistory] = await Promise.all([
        sql`
          SELECT event, page, platform, created_at
          FROM app_events
          WHERE user_id = ${targetId} AND source IN ('telegram', 'web')
          ORDER BY created_at DESC
          LIMIT 25
        `,
        sql`
          SELECT product_id FROM user_purchases WHERE user_id::text = ${targetId}
        `,
        sql`
          SELECT reason, created_at FROM banned_users WHERE user_id = ${targetId} LIMIT 1
        `,
        sql`
          SELECT event, meta, created_at
          FROM app_events
          WHERE source = 'admin' AND page = ${targetId}
          ORDER BY created_at DESC
          LIMIT 10
        `,
      ]);

      return res.status(200).json({
        ok: true,
        targetId,
        products: purchases.map((p) => String(p.product_id)),
        isBanned: ban.length > 0,
        banReason: ban.length > 0 ? String(ban[0].reason || '') : '',
        events: events.map((e) => ({
          event: String(e.event),
          page: String(e.page || 'welcome'),
          platform: String(e.platform || 'unknown'),
          created_at: String(e.created_at),
        })),
        adminHistory: adminHistory.map((h) => ({
          event: String(h.event),
          meta: formatAuditMeta(h.meta),
          created_at: String(h.created_at),
        })),
      });
    }

    if (action === 'grant' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const body = (req.body || {}) as Record<string, unknown>;
      const targetId = String(body.targetId || '').trim();
      const productId = String(body.productId || '').trim();
      const mode = body.mode === 'revoke' ? 'revoke' : 'grant';

      if (!targetId || !productId) {
        return res.status(400).json({ ok: false, error: 'Укажите ID пользователя и модуль' });
      }

      const targets = productId === 'all' ? ALL_CORE_PRO_IDS : [productId];

      if (mode === 'grant') {
        for (const pid of targets) {
          const exists = await sql`
            SELECT 1 FROM user_purchases WHERE user_id::text = ${targetId} AND product_id = ${pid} LIMIT 1
          `;
          if (exists.length === 0) {
            await sql`
              INSERT INTO user_purchases (user_id, product_id) VALUES (${targetId}, ${pid})
            `;
          }
        }
      } else {
        for (const pid of targets) {
          await sql`
            DELETE FROM user_purchases WHERE user_id::text = ${targetId} AND product_id = ${pid}
          `;
        }
      }

      try {
        const auditEvent = mode === 'grant' ? 'admin_grant_pro' : 'admin_revoke_pro';
        const auditMeta = JSON.stringify({ productId });
        await sql`
          INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
          VALUES (${auth.adminId}, '', 'Admin', 'admin', ${auth.via}, 'ru', ${auditEvent}, ${targetId}, ${auditMeta})
        `;
      } catch (logErr) {
        console.error('audit grant log error:', logErr);
      }

      return res.status(200).json({ ok: true, mode, targetId, productId });
    }

    if (action === 'ban' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const body = (req.body || {}) as Record<string, unknown>;
      const targetId = String(body.targetId || '').trim();
      const mode = body.mode === 'unban' ? 'unban' : 'ban';
      const reason = String(body.reason || 'Ограничено администратором').slice(0, 200);

      if (!targetId) {
        return res.status(400).json({ ok: false, error: 'Укажите ID пользователя' });
      }
      if (mode === 'ban' && auth.adminId && targetId === auth.adminId) {
        return res.status(400).json({ ok: false, error: 'Нельзя заблокировать самого себя' });
      }

      if (mode === 'ban') {
        await sql`
          INSERT INTO banned_users (user_id, reason)
          VALUES (${targetId}, ${reason})
          ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()
        `;
      } else {
        await sql`DELETE FROM banned_users WHERE user_id = ${targetId}`;
      }

      try {
        const auditEvent = mode === 'ban' ? 'admin_ban' : 'admin_unban';
        const auditMeta = JSON.stringify({ reason });
        await sql`
          INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
          VALUES (${auth.adminId}, '', 'Admin', 'admin', ${auth.via}, 'ru', ${auditEvent}, ${targetId}, ${auditMeta})
        `;
      } catch (logErr) {
        console.error('audit ban log error:', logErr);
      }

      return res.status(200).json({ ok: true, mode, targetId });
    }

    const userId = String(req.query.userId || '').trim();
    const productId = String(req.query.productId || '').trim();

    if (!userId) {
      return res.status(200).json({ purchased: false, banned: false });
    }

    const banCheck = await sql`
      SELECT reason FROM banned_users WHERE user_id = ${userId} LIMIT 1
    `;
    if (banCheck.length > 0) {
      return res.status(200).json({
        purchased: false,
        banned: true,
        reason: String(banCheck[0].reason || 'Доступ ограничен администратором'),
      });
    }

    if (!productId) {
      return res.status(200).json({ purchased: false, banned: false });
    }

    const rows = await sql`
      SELECT 1 FROM user_purchases
      WHERE user_id::text = ${userId} AND product_id = ${productId}
      LIMIT 1
    `;

    return res.status(200).json({ purchased: rows.length > 0, banned: false });
  } catch (err) {
    console.error('check-purchase error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
