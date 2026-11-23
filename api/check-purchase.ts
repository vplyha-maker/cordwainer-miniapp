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
const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

type AuthResult = {
  ok: boolean;
  adminId: string;
  via: 'telegram' | 'web' | 'none';
};

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  missing: string[];
};

type R2ObjectRow = {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
};

function getR2Config(): R2Config {
  const accountId = (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '').trim();
  const bucket = (process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET || '').trim();
  const publicUrl = (process.env.R2_PUBLIC_URL || process.env.VITE_R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');

  const missing: string[] = [];
  if (!accountId) missing.push('R2_ACCOUNT_ID');
  if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!bucket) missing.push('R2_BUCKET_NAME');

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl, missing };
}

function sha256Hex(str: string): string {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function hmacBin(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function r2Encode(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function r2EncodePath(pathStr: string): string {
  return pathStr
    .split('/')
    .map((seg) => r2Encode(seg))
    .join('/');
}

function getSigningKey(secretKey: string, dateStamp: string): Buffer {
  const kDate = hmacBin(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacBin(kDate, 'auto');
  const kService = hmacBin(kRegion, 's3');
  return hmacBin(kService, 'aws4_request');
}

async function r2SignedFetch(
  cfg: R2Config,
  method: 'GET' | 'PUT' | 'DELETE',
  key: string,
  queryObj: Record<string, string>,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = key
    ? `/${r2Encode(cfg.bucket)}/${r2EncodePath(key)}`
    : `/${r2Encode(cfg.bucket)}`;

  const queryKeys = Object.keys(queryObj).sort();
  const canonicalQuery = queryKeys
    .map((k) => `${r2Encode(k)}=${r2Encode(queryObj[k])}`)
    .join('&');

  const headersLower: Record<string, string> = {
    host,
    'x-amz-content-sha256': EMPTY_SHA256,
    'x-amz-date': amzDate,
  };
  for (const [hk, hv] of Object.entries(extraHeaders)) {
    headersLower[hk.toLowerCase()] = hv.trim();
  }
  const sortedHeaderKeys = Object.keys(headersLower).sort();
  const canonicalHeaders = sortedHeaderKeys.map((k) => `${k}:${headersLower[k]}\n`).join('');
  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    EMPTY_SHA256,
  ].join('\n');

  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const sig = crypto
    .createHmac('sha256', getSigningKey(cfg.secretAccessKey, dateStamp))
    .update(stringToSign, 'utf8')
    .digest('hex');

  const fetchHeaders: Record<string, string> = {
    Host: host,
    'x-amz-content-sha256': EMPTY_SHA256,
    'x-amz-date': amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
  };
  for (const [hk, hv] of Object.entries(extraHeaders)) {
    fetchHeaders[hk] = hv.trim();
  }

  const url = `https://${host}${canonicalUri}${canonicalQuery ? `?${canonicalQuery}` : ''}`;
  return fetch(url, { method, headers: fetchHeaders });
}

function r2PresignUrl(cfg: R2Config, method: 'GET' | 'PUT', key: string, expiresSec = 300): string {
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalUri = `/${r2Encode(cfg.bucket)}/${r2EncodePath(key)}`;

  const queryObj: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${cfg.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresSec),
    'X-Amz-SignedHeaders': 'host',
  };

  const canonicalQuery = Object.keys(queryObj)
    .sort()
    .map((k) => `${r2Encode(k)}=${r2Encode(queryObj[k])}`)
    .join('&');

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const sig = crypto
    .createHmac('sha256', getSigningKey(cfg.secretAccessKey, dateStamp))
    .update(stringToSign, 'utf8')
    .digest('hex');

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${sig}`;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseR2ListXml(xml: string) {
  const folders: string[] = [];
  const folderRe = /<CommonPrefixes>\s*<Prefix>([\s\S]*?)<\/Prefix>\s*<\/CommonPrefixes>/g;
  let fm: RegExpExecArray | null = folderRe.exec(xml);
  while (fm) {
    folders.push(decodeXml(fm[1]));
    fm = folderRe.exec(xml);
  }

  const files: R2ObjectRow[] = [];
  const itemRe = /<Contents>([\s\S]*?)<\/Contents>/g;
  let im: RegExpExecArray | null = itemRe.exec(xml);
  while (im) {
    const block = im[1];
    const keyM = block.match(/<Key>([\s\S]*?)<\/Key>/);
    const sizeM = block.match(/<Size>(\d+)<\/Size>/);
    const modM = block.match(/<LastModified>([\s\S]*?)<\/LastModified>/);
    const etagM = block.match(/<ETag>([\s\S]*?)<\/ETag>/);
    if (keyM) {
      files.push({
        key: decodeXml(keyM[1]),
        size: sizeM ? Number(sizeM[1]) : 0,
        lastModified: modM ? decodeXml(modM[1]) : '',
        etag: etagM ? decodeXml(etagM[1]).replace(/^"+|"+$/g, '') : '',
      });
    }
    im = itemRe.exec(xml);
  }

  const isTruncated = /<IsTruncated>\s*true\s*<\/IsTruncated>/i.test(xml);
  const nextM = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/);
  const nextToken = nextM ? decodeXml(nextM[1]) : '';

  return { folders, files, isTruncated, nextToken };
}

async function listAllR2Objects(cfg: R2Config, prefix = '') {
  const allFiles: R2ObjectRow[] = [];
  let token = '';
  for (let i = 0; i < 10; i += 1) {
    const q: Record<string, string> = { 'list-type': '2', 'max-keys': '1000' };
    if (prefix) q.prefix = prefix;
    if (token) q['continuation-token'] = token;
    const resp = await r2SignedFetch(cfg, 'GET', '', q);
    if (!resp.ok) throw new Error(`R2 status ${resp.status}`);
    const parsed = parseR2ListXml(await resp.text());
    for (const f of parsed.files) allFiles.push(f);
    if (!parsed.isTruncated || !parsed.nextToken) break;
    token = parsed.nextToken;
  }
  return allFiles;
}

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
    if (obj.newKey) return `${String(obj.oldKey || '')} → ${String(obj.newKey)}`;
    if (obj.op) return String(obj.op);
    if (obj.deploymentId) return String(obj.deploymentId);
    if (obj.repo) return String(obj.repo);
    if (obj.key) return String(obj.key);
    if (obj.pk) return `pk=${String(obj.pk)}`;
    return meta;
  }
  if (typeof meta === 'object') {
    const obj = meta as Record<string, unknown>;
    if (obj.productId) return String(obj.productId);
    if (obj.reason) return String(obj.reason);
    if (obj.ttl) return String(obj.ttl);
    if (obj.newKey) return `${String(obj.oldKey || '')} → ${String(obj.newKey)}`;
    if (obj.op) return String(obj.op);
    if (obj.deploymentId) return String(obj.deploymentId);
    if (obj.repo) return String(obj.repo);
    if (obj.key) return String(obj.key);
    if (obj.pk) return `pk=${String(obj.pk)}`;
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

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function getSneakersCols(sql: ReturnType<typeof getSql>) {
  const snCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sneakers'
  `;
  const colList = snCols.map((c) => String(c.column_name));
  return {
    exists: colList.length > 0,
    imgCol: colList.find((c) => /image|img|photo|pic|url|file/i.test(c)) || '',
    nameCol: colList.find((c) => /name|title|model/i.test(c)) || colList[0] || '',
    brandCol: colList.find((c) => /brand/i.test(c)) || '',
    idCol: colList.includes('id') ? 'id' : colList[0] || '',
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data, X-Admin-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = String(req.query.action || '').trim();

  try {
    const sql = getSql();

    // --- NEON STUDIO: TABLES + HEALTH ---
    if (action === 'db-tables') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const [tables, dbStats, pkRows] = await Promise.all([
        sql`
          SELECT
            relname AS name,
            n_live_tup::int AS rows,
            n_dead_tup::int AS dead_rows,
            pg_size_pretty(pg_total_relation_size(relid)) AS size_pretty,
            pg_total_relation_size(relid)::bigint AS size_bytes
          FROM pg_stat_user_tables
          WHERE schemaname = 'public'
          ORDER BY pg_total_relation_size(relid) DESC
        `,
        sql`
          SELECT
            pg_size_pretty(pg_database_size(current_database())) AS db_size,
            pg_database_size(current_database())::bigint AS db_bytes,
            (SELECT numbackends::int FROM pg_stat_database WHERE datname = current_database()) AS active_conns,
            (SELECT CASE WHEN (blks_hit + blks_read) > 0
              THEN ROUND((blks_hit::numeric / (blks_hit + blks_read)) * 100, 1)
              ELSE 100 END
             FROM pg_stat_database WHERE datname = current_database()) AS cache_hit
        `,
        sql`
          SELECT tc.table_name, kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
          ORDER BY kcu.ordinal_position ASC
        `,
      ]);

      const pkMap: Record<string, string> = {};
      for (const pk of pkRows) {
        const tn = String(pk.table_name);
        if (!pkMap[tn]) pkMap[tn] = String(pk.column_name);
      }

      const st = dbStats[0] || {};
      return res.status(200).json({
        ok: true,
        dbSize: String(st.db_size || '—'),
        dbBytes: Number(st.db_bytes || 0),
        activeConns: Number(st.active_conns || 1),
        cacheHitPct: Number(st.cache_hit || 100),
        tables: tables.map((t) => {
          const name = String(t.name);
          return {
            name,
            rows: Number(t.rows || 0),
            deadRows: Number(t.dead_rows || 0),
            sizePretty: String(t.size_pretty || '0 bytes'),
            sizeBytes: Number(t.size_bytes || 0),
            pkCol: pkMap[name] || null,
          };
        }),
      });
    }

    // --- NEON STUDIO: BROWSER ---
    if (action === 'db-rows') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const reqTable = String(req.query.table || '').trim();
      const validTables = await sql`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ${reqTable} LIMIT 1
      `;
      if (validTables.length === 0) {
        return res.status(400).json({ ok: false, error: 'Таблица не найдена' });
      }
      const safeTable = String(validTables[0].tablename);

      const [cols, pkRows] = await Promise.all([
        sql`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${safeTable}
          ORDER BY ordinal_position ASC
        `,
        sql`
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
            AND tc.table_name = ${safeTable}
          ORDER BY kcu.ordinal_position ASC
        `,
      ]);

      const colNames = cols.map((c) => String(c.column_name));
      const pkCols = pkRows.map((p) => String(p.column_name));

      const limit = Math.min(100, Math.max(10, Number(req.query.limit || 25) || 25));
      const page = Math.max(1, Number(req.query.page || 1) || 1);
      const offset = (page - 1) * limit;
      const search = String(req.query.search || '').trim();
      const reqSortCol = String(req.query.sortCol || '').trim();
      const sortDir = String(req.query.sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      let sortCol = '';
      if (reqSortCol && colNames.includes(reqSortCol)) sortCol = reqSortCol;
      else if (colNames.includes('created_at')) sortCol = 'created_at';
      else if (colNames.includes('id')) sortCol = 'id';
      else if (colNames.length > 0) sortCol = colNames[0];

      const orderSql = sortCol ? `ORDER BY ${quoteIdent(sortCol)} ${sortDir}` : '';
      let whereSql = '';
      const params: unknown[] = [];

      if (search && colNames.length > 0) {
        params.push(`%${search}%`);
        const conds = colNames.map((c) => `CAST(${quoteIdent(c)} AS TEXT) ILIKE $1`);
        whereSql = `WHERE (${conds.join(' OR ')})`;
      }

      const countRows = await sql.query(
        `SELECT COUNT(*)::int AS total FROM "public".${quoteIdent(safeTable)} ${whereSql}`,
        params,
      );
      const total = Number((countRows[0] as { total?: number })?.total || 0);

      const rows = await sql.query(
        `SELECT * FROM "public".${quoteIdent(safeTable)} ${whereSql} ${orderSql} LIMIT ${limit} OFFSET ${offset}`,
        params,
      );

      return res.status(200).json({
        ok: true,
        table: safeTable,
        pkCols,
        pkCol: pkCols[0] || null,
        total,
        page,
        limit,
        sortCol,
        sortDir: sortDir.toLowerCase(),
        columns: colNames,
        rows,
      });
    }

    if (action === 'db-export') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const reqTable = String(req.query.table || '').trim();
      const validTables = await sql`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ${reqTable} LIMIT 1
      `;
      if (validTables.length === 0) return res.status(400).json({ ok: false, error: 'Таблица не найдена' });
      const safeTable = String(validTables[0].tablename);

      const rows = await sql.query(`SELECT * FROM "public".${quoteIdent(safeTable)} LIMIT 1000`);
      const columns = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];
      return res.status(200).json({ ok: true, table: safeTable, columns, rows });
    }

    if (action === 'db-update' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const body = (req.body || {}) as Record<string, unknown>;
      const reqTable = String(body.table || '').trim();
      const pkValues = (body.pkValues || {}) as Record<string, unknown>;
      const updates = (body.updates || {}) as Record<string, unknown>;

      const validTables = await sql`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ${reqTable} LIMIT 1
      `;
      if (validTables.length === 0) return res.status(400).json({ ok: false, error: 'Таблица не найдена' });
      const safeTable = String(validTables[0].tablename);

      const [cols, pkRows] = await Promise.all([
        sql`
          SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${safeTable}
        `,
        sql`
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
            AND tc.table_name = ${safeTable}
          ORDER BY kcu.ordinal_position ASC
        `,
      ]);

      const validCols = new Set(cols.map((c) => String(c.column_name)));
      const pkCols = pkRows.map((p) => String(p.column_name));
      if (pkCols.length === 0) return res.status(400).json({ ok: false, error: 'У таблицы нет Primary Key' });

      for (const pk of pkCols) {
        if (pkValues[pk] === undefined || pkValues[pk] === null) {
          return res.status(400).json({ ok: false, error: `Отсутствует значение ключа ${pk}` });
        }
      }

      const pkSet = new Set(pkCols);
      const keys = Object.keys(updates).filter((k) => validCols.has(k) && !pkSet.has(k));
      if (keys.length === 0) return res.status(400).json({ ok: false, error: 'Нет полей для обновления' });

      const params: unknown[] = [];
      const setParts: string[] = [];
      for (const k of keys) {
        params.push(updates[k] === '' ? null : updates[k]);
        setParts.push(`${quoteIdent(k)} = $${params.length}`);
      }

      const whereParts: string[] = [];
      for (const pk of pkCols) {
        params.push(pkValues[pk]);
        whereParts.push(`${quoteIdent(pk)} = $${params.length}`);
      }

      await sql.query(
        `UPDATE "public".${quoteIdent(safeTable)} SET ${setParts.join(', ')} WHERE ${whereParts.join(' AND ')}`,
        params,
      );

      try {
        const meta = JSON.stringify({ pk: pkCols.map((k) => `${k}=${String(pkValues[k])}`).join(','), fields: keys });
        await sql`
          INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
          VALUES (${auth.adminId}, '', 'Admin', 'admin', ${auth.via}, 'ru', 'admin_db_update', ${safeTable}, ${meta})
        `;
      } catch (e) {
        console.error('db-update audit err:', e);
      }

      return res.status(200).json({ ok: true });
    }

    if (action === 'db-delete' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const body = (req.body || {}) as Record<string, unknown>;
      const reqTable = String(body.table || '').trim();
      const pkValues = (body.pkValues || {}) as Record<string, unknown>;

      const validTables = await sql`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ${reqTable} LIMIT 1
      `;
      if (validTables.length === 0) return res.status(400).json({ ok: false, error: 'Таблица не найдена' });
      const safeTable = String(validTables[0].tablename);

      const pkRows = await sql`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = ${safeTable}
        ORDER BY kcu.ordinal_position ASC
      `;
      const pkCols = pkRows.map((p) => String(p.column_name));
      if (pkCols.length === 0) return res.status(400).json({ ok: false, error: 'У таблицы нет Primary Key' });

      const params: unknown[] = [];
      const whereParts: string[] = [];
      for (const pk of pkCols) {
        if (pkValues[pk] === undefined || pkValues[pk] === null) {
          return res.status(400).json({ ok: false, error: `Отсутствует значение ключа ${pk}` });
        }
        params.push(pkValues[pk]);
        whereParts.push(`${quoteIdent(pk)} = $${params.length}`);
      }

      await sql.query(
        `DELETE FROM "public".${quoteIdent(safeTable)} WHERE ${whereParts.join(' AND ')}`,
        params,
      );

      try {
        const meta = JSON.stringify({ pk: pkCols.map((k) => `${k}=${String(pkValues[k])}`).join(',') });
        await sql`
          INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
          VALUES (${auth.adminId}, '', 'Admin', 'admin', ${auth.via}, 'ru', 'admin_db_delete', ${safeTable}, ${meta})
        `;
      } catch (e) {
        console.error('db-delete audit err:', e);
      }

      return res.status(200).json({ ok: true });
    }

    if (action === 'db-builder' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const t0 = Date.now();
      const body = (req.body || {}) as Record<string, unknown>;
      const reqTable = String(body.table || '').trim();
      const column = String(body.column || '').trim();
      const op = String(body.op || 'contains').trim();
      const value = String(body.value || '').trim();
      const sortCol = String(body.sortCol || '').trim();
      const sortDir = String(body.sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      const validTables = await sql`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ${reqTable} LIMIT 1
      `;
      if (validTables.length === 0) return res.status(400).json({ ok: false, error: 'Выберите таблицу' });
      const safeTable = String(validTables[0].tablename);

      const cols = await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${safeTable}
      `;
      const validCols = new Set(cols.map((c) => String(c.column_name)));

      let whereSql = '';
      const params: unknown[] = [];

      if (column && validCols.has(column)) {
        const qCol = quoteIdent(column);
        if (op === 'is_null') {
          whereSql = `WHERE (${qCol} IS NULL OR CAST(${qCol} AS TEXT) = '')`;
        } else if (op === 'not_null') {
          whereSql = `WHERE (${qCol} IS NOT NULL AND CAST(${qCol} AS TEXT) <> '')`;
        } else if (value) {
          if (op === 'contains') {
            whereSql = `WHERE CAST(${qCol} AS TEXT) ILIKE $1`;
            params.push(`%${value}%`);
          } else if (op === 'eq') {
            whereSql = `WHERE CAST(${qCol} AS TEXT) = $1`;
            params.push(value);
          } else if (op === 'neq') {
            whereSql = `WHERE CAST(${qCol} AS TEXT) <> $1`;
            params.push(value);
          } else if (op === 'gt') {
            whereSql = `WHERE CAST(${qCol} AS NUMERIC) > $1`;
            params.push(Number(value));
          } else if (op === 'lt') {
            whereSql = `WHERE CAST(${qCol} AS NUMERIC) < $1`;
            params.push(Number(value));
          }
        }
      }

      const orderSql = sortCol && validCols.has(sortCol) ? `ORDER BY ${quoteIdent(sortCol)} ${sortDir}` : '';
      const rows = await sql.query(
        `SELECT * FROM "public".${quoteIdent(safeTable)} ${whereSql} ${orderSql} LIMIT 50`,
        params,
      );
      const columns = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];

      return res.status(200).json({ ok: true, ms: Date.now() - t0, columns, rows });
    }

    if (action === 'db-preset' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const t0 = Date.now();
      const body = (req.body || {}) as Record<string, unknown>;
      const preset = String(body.preset || '').trim();

      if (preset === 'analyze') {
        await sql.query('ANALYZE');
        return res.status(200).json({
          ok: true,
          ms: Date.now() - t0,
          message: 'Статистика планировщика PostgreSQL (ANALYZE) обновлена',
          columns: ['status', 'duration_ms'],
          rows: [{ status: 'OK · ANALYZE выполнен', duration_ms: Date.now() - t0 }],
        });
      }

      if (preset === 'r2_audit') {
        const cfg = getR2Config();
        if (cfg.missing.length > 0) {
          return res.status(400).json({ ok: false, error: 'Cloudflare R2 не настроен в Vercel' });
        }
        const meta = await getSneakersCols(sql);
        if (!meta.exists) {
          return res.status(400).json({ ok: false, error: 'Таблица sneakers не найдена в Neon' });
        }

        const allR2Files = await listAllR2Objects(cfg);
        const r2Keys = new Set<string>();
        const r2Basenames = new Set<string>();
        for (const f of allR2Files) {
          r2Keys.add(f.key);
          r2Basenames.add(f.key.split('/').pop() || f.key);
        }

        const selectCols = meta.imgCol
          ? `${quoteIdent(meta.idCol)} AS id, ${quoteIdent(meta.nameCol)} AS title, ${quoteIdent(meta.imgCol)} AS img`
          : `${quoteIdent(meta.idCol)} AS id, ${quoteIdent(meta.nameCol)} AS title, NULL AS img`;
        const snRows = await sql.query(`SELECT ${selectCols} FROM "public"."sneakers"`);

        const usedKeys = new Set<string>();
        const usedBasenames = new Set<string>();
        let emptyImgCount = 0;
        let brokenNeonCount = 0;
        const brokenNeon: Array<{ id: string; title: string; img: string; reason: string }> = [];

        for (const r of snRows as Array<{ id?: unknown; title?: unknown; img?: unknown }>) {
          const raw = String(r.img || '').trim();
          if (!raw) {
            emptyImgCount += 1;
            if (brokenNeon.length < 40) {
              brokenNeon.push({ id: String(r.id ?? ''), title: String(r.title ?? ''), img: '', reason: 'Пустая ссылка в Neon' });
            }
            continue;
          }
          const cleanPath = raw.split('?')[0].replace(/^https?:\/\/[^/]+\//i, '').replace(/^\/+/, '');
          const cleanName = cleanPath.split('/').pop() || cleanPath;
          usedKeys.add(cleanPath);
          usedBasenames.add(cleanName);

          if (!r2Keys.has(cleanPath) && !r2Basenames.has(cleanName)) {
            brokenNeonCount += 1;
            if (brokenNeon.length < 40) {
              brokenNeon.push({ id: String(r.id ?? ''), title: String(r.title ?? ''), img: cleanName, reason: 'Файла нет в R2' });
            }
          }
        }

        let orphanR2Count = 0;
        const orphanR2: Array<{ key: string; size: number }> = [];
        for (const f of allR2Files) {
          const base = f.key.split('/').pop() || f.key;
          if (!usedKeys.has(f.key) && !usedBasenames.has(base)) {
            orphanR2Count += 1;
            if (orphanR2.length < 40) orphanR2.push({ key: f.key, size: f.size });
          }
        }

        return res.status(200).json({
          ok: true,
          ms: Date.now() - t0,
          r2Audit: {
            neonCount: snRows.length,
            r2Count: allR2Files.length,
            emptyImgCount,
            brokenNeonCount,
            orphanR2Count,
            idCol: meta.idCol,
            imgCol: meta.imgCol,
            brokenNeon,
            orphanR2,
          },
          columns: [],
          rows: [],
        });
      }

      const presetQueries: Record<string, string> = {
        pro_owners:
          'SELECT user_id, COUNT(DISTINCT product_id)::int AS modules, STRING_AGG(DISTINCT product_id, \', \') AS list FROM user_purchases GROUP BY user_id ORDER BY modules DESC LIMIT 100',
        pro_dupes:
          'SELECT user_id, product_id, COUNT(*)::int AS duplicates FROM user_purchases GROUP BY user_id, product_id HAVING COUNT(*) > 1 LIMIT 50',
        today_activity:
          'SELECT source, page, COUNT(*)::int AS events, COUNT(DISTINCT user_id)::int AS users FROM app_events WHERE created_at >= CURRENT_DATE AND source IN (\'telegram\', \'web\') GROUP BY source, page ORDER BY events DESC LIMIT 50',
        recent_orders: 'SELECT * FROM orders ORDER BY 1 DESC LIMIT 25',
        top_brands:
          'SELECT COALESCE(NULLIF(brand, \'\'), \'Без бренда\') AS brand, COUNT(*)::int AS models FROM sneakers GROUP BY COALESCE(NULLIF(brand, \'\'), \'Без бренда\') ORDER BY models DESC LIMIT 500',
        top_favorites: 'SELECT * FROM user_favorites ORDER BY 1 DESC LIMIT 50',
        indexes_info:
          'SELECT tablename AS table_name, indexname AS index_name FROM pg_indexes WHERE schemaname = \'public\' ORDER BY tablename, indexname LIMIT 100',
      };

      const chosenSql = presetQueries[preset];
      if (!chosenSql) return res.status(400).json({ ok: false, error: 'Неизвестная команда' });

      const rows = await sql.query(chosenSql);
      const columns = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];
      return res.status(200).json({ ok: true, ms: Date.now() - t0, columns, rows });
    }

    if (action === 'db-sql' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const t0 = Date.now();
      const body = (req.body || {}) as Record<string, unknown>;
      const rawSql = String(body.query || '').trim().replace(/;+\s*$/, '');
      if (!rawSql) return res.status(400).json({ ok: false, error: 'Введите SELECT-запрос' });
      if (rawSql.includes(';')) return res.status(400).json({ ok: false, error: 'Разрешён только один SELECT-запрос' });
      if (!/^(SELECT|WITH)\b/i.test(rawSql)) {
        return res.status(400).json({ ok: false, error: 'Консоль работает только на чтение (SELECT)' });
      }
      if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY|EXECUTE|CALL)\b/i.test(rawSql)) {
        return res.status(400).json({ ok: false, error: 'Изменяющие команды запрещены в консоли' });
      }

      const wrapped = `SELECT * FROM (${rawSql}) AS _q LIMIT 100`;
      const rows = await sql.query(wrapped);
      const columns = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];
      return res.status(200).json({ ok: true, ms: Date.now() - t0, columns, rows });
    }

    if (action === 'db-cleanup' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const body = (req.body || {}) as Record<string, unknown>;
      const mode = String(body.mode || '');

      if (mode === 'otp') {
        const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
        const del = await sql`
          DELETE FROM app_events
          WHERE source = 'admin_otp' AND created_at < ${cutoff}::timestamptz
          RETURNING id
        `;
        return res.status(200).json({ ok: true, deleted: del.length });
      }

      if (mode === 'old_events') {
        const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
        const del = await sql`
          DELETE FROM app_events
          WHERE source IN ('telegram', 'web') AND created_at < ${cutoff}::timestamptz
          RETURNING id
        `;
        return res.status(200).json({ ok: true, deleted: del.length });
      }

      return res.status(400).json({ ok: false, error: 'Неизвестный режим очистки' });
    }

    // --- CLOUDFLARE R2 STUDIO ---
    if (action === 'r2-list') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const cfg = getR2Config();
      if (cfg.missing.length > 0) {
        return res.status(200).json({
          ok: true,
          configured: false,
          missing: cfg.missing,
          bucket: cfg.bucket,
          publicUrl: cfg.publicUrl,
          folders: [],
          files: [],
          isTruncated: false,
          nextToken: '',
        });
      }

      const prefix = String(req.query.prefix || '').trim();
      const search = String(req.query.search || '').trim().toLowerCase();
      const continuationToken = String(req.query.token || '').trim();

      if (search) {
        const allFiles = await listAllR2Objects(cfg, prefix);
        const tokens = search
          .replace(/[^a-z0-9а-яё]+/gi, ' ')
          .trim()
          .split(/\s+/)
          .filter(Boolean);

        let matched = allFiles.filter((f) => {
          const hay = f.key.toLowerCase();
          return tokens.every((t) => hay.includes(t));
        });

        if (matched.length === 0 && tokens.length >= 2) {
          const minHits = Math.max(2, Math.ceil(tokens.length * 0.6));
          matched = allFiles
            .map((f) => {
              const hay = f.key.toLowerCase();
              const hits = tokens.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
              return { f, hits };
            })
            .filter((x) => x.hits >= minHits)
            .sort((a, b) => b.hits - a.hits)
            .map((x) => x.f);
        }

        const limited = matched.slice(0, 100);
        const totalSize = matched.reduce((sum, f) => sum + f.size, 0);
        return res.status(200).json({
          ok: true,
          configured: true,
          missing: [],
          bucket: cfg.bucket,
          publicUrl: cfg.publicUrl,
          prefix,
          searchTotal: matched.length,
          totalSize,
          folders: [],
          files: limited,
          isTruncated: false,
          nextToken: '',
        });
      }

      const queryObj: Record<string, string> = {
        'list-type': '2',
        delimiter: '/',
        'max-keys': '100',
      };
      if (prefix) queryObj.prefix = prefix;
      if (continuationToken) queryObj['continuation-token'] = continuationToken;

      const r2Resp = await r2SignedFetch(cfg, 'GET', '', queryObj);
      if (!r2Resp.ok) {
        const errText = await r2Resp.text();
        return res.status(502).json({
          ok: false,
          error: `Ошибка R2 (${r2Resp.status}): ${errText.slice(0, 140)}`,
        });
      }

      const parsed = parseR2ListXml(await r2Resp.text());
      const totalSize = parsed.files.reduce((sum, f) => sum + f.size, 0);

      return res.status(200).json({
        ok: true,
        configured: true,
        missing: [],
        bucket: cfg.bucket,
        publicUrl: cfg.publicUrl,
        prefix,
        totalSize,
        folders: parsed.folders,
        files: parsed.files,
        isTruncated: parsed.isTruncated,
        nextToken: parsed.nextToken,
      });
    }

    if (action === 'r2-view') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const cfg = getR2Config();
      if (cfg.missing.length > 0) return res.status(400).json({ ok: false, error: 'R2 не настроен' });
      const key = String(req.query.key || '').trim();
      if (!key) return res.status(400).json({ ok: false, error: 'Не указан ключ файла' });

      const reqTtl = Number(req.query.ttl || 300);
      const ttlSec = reqTtl === 3600 || reqTtl === 86400 ? reqTtl : 300;
      const url = r2PresignUrl(cfg, 'GET', key, ttlSec);

      let neonMatches: Array<{ id: string; brand: string; title: string; img: string }> = [];
      if (String(req.query.withNeon || '') === '1') {
        try {
          const meta = await getSneakersCols(sql);
          if (meta.exists && meta.imgCol) {
            const baseName = key.split('/').pop() || key;
            const brandSelect = meta.brandCol ? `${quoteIdent(meta.brandCol)} AS brand` : `'' AS brand`;
            const rows = await sql.query(
              `SELECT ${quoteIdent(meta.idCol)} AS id, ${brandSelect}, ${quoteIdent(meta.nameCol)} AS title, ${quoteIdent(meta.imgCol)} AS img
               FROM "public"."sneakers"
               WHERE ${quoteIdent(meta.imgCol)} = $1 OR ${quoteIdent(meta.imgCol)} LIKE $2 OR ${quoteIdent(meta.imgCol)} = $3
               LIMIT 5`,
              [key, `%/${baseName}`, baseName],
            );
            neonMatches = (rows as Array<Record<string, unknown>>).map((r) => ({
              id: String(r.id ?? ''),
              brand: String(r.brand ?? ''),
              title: String(r.title ?? ''),
              img: String(r.img ?? ''),
            }));
          }
        } catch (e) {
          console.error('r2-view neon lookup error:', e);
        }
      }

      return res.status(200).json({ ok: true, key, url, ttlSec, neonMatches });
    }

    if (action === 'r2-view-batch' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const cfg = getR2Config();
      if (cfg.missing.length > 0) return res.status(400).json({ ok: false, error: 'R2 не настроен' });
      const body = (req.body || {}) as Record<string, unknown>;
      const rawKeys = Array.isArray(body.keys) ? body.keys : [];
      const urls: Record<string, string> = {};
      for (const item of rawKeys.slice(0, 30)) {
        const k = String(item || '').trim();
        if (k) urls[k] = r2PresignUrl(cfg, 'GET', k, 300);
      }
      return res.status(200).json({ ok: true, urls });
    }

    if (action === 'r2-rename' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const cfg = getR2Config();
      if (cfg.missing.length > 0) return res.status(400).json({ ok: false, error: 'R2 не настроен' });

      const body = (req.body || {}) as Record<string, unknown>;
      const oldKey = String(body.oldKey || '').trim().replace(/^\/+/, '');
      const newKey = String(body.newKey || '').trim().replace(/^\/+/, '');
      const syncNeon = body.syncNeon !== false;

      if (!oldKey || !newKey || oldKey === newKey) {
        return res.status(400).json({ ok: false, error: 'Укажите новое имя файла' });
      }

      const copySource = `/${r2Encode(cfg.bucket)}/${r2EncodePath(oldKey)}`;
      const copyResp = await r2SignedFetch(cfg, 'PUT', newKey, {}, { 'x-amz-copy-source': copySource });
      if (!copyResp.ok) {
        const txt = await copyResp.text();
        return res.status(502).json({ ok: false, error: `Ошибка копирования R2 (${copyResp.status}): ${txt.slice(0, 100)}` });
      }

      const delResp = await r2SignedFetch(cfg, 'DELETE', oldKey, {});
      if (!delResp.ok && delResp.status !== 204) {
        return res.status(502).json({ ok: false, error: `Файл скопирован, но старый не удалён (${delResp.status})` });
      }

      let neonUpdated = 0;
      if (syncNeon) {
        try {
          const meta = await getSneakersCols(sql);
          if (meta.exists && meta.imgCol) {
            const oldBase = oldKey.split('/').pop() || oldKey;
            const newBase = newKey.split('/').pop() || newKey;
            const matched = await sql.query(
              `SELECT ${quoteIdent(meta.idCol)} AS id, ${quoteIdent(meta.imgCol)} AS img
               FROM "public"."sneakers"
               WHERE ${quoteIdent(meta.imgCol)} = $1 OR ${quoteIdent(meta.imgCol)} LIKE $2 OR ${quoteIdent(meta.imgCol)} = $3`,
              [oldKey, `%/${oldBase}`, oldBase],
            );
            for (const row of matched as Array<{ id: unknown; img: unknown }>) {
              const rawImg = String(row.img || '');
              const updatedImg = rawImg.includes(oldKey)
                ? rawImg.replace(oldKey, newKey)
                : rawImg.includes(oldBase)
                  ? rawImg.replace(oldBase, newBase)
                  : newKey;
              await sql.query(
                `UPDATE "public"."sneakers" SET ${quoteIdent(meta.imgCol)} = $1 WHERE ${quoteIdent(meta.idCol)} = $2`,
                [updatedImg, row.id],
              );
              neonUpdated += 1;
            }
          }
        } catch (e) {
          console.error('r2-rename neon sync error:', e);
        }
      }

      try {
        const auditMeta = JSON.stringify({ oldKey, newKey, neonUpdated });
        await sql`
          INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
          VALUES (${auth.adminId}, '', 'Admin', 'admin', ${auth.via}, 'ru', 'admin_r2_rename', ${cfg.bucket}, ${auditMeta})
        `;
      } catch (e) {
        console.error('r2-rename audit error:', e);
      }

      return res.status(200).json({ ok: true, oldKey, newKey, neonUpdated });
    }

    if (action === 'r2-link-sneaker' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const body = (req.body || {}) as Record<string, unknown>;
      const key = String(body.key || '').trim().replace(/^\/+/, '');
      const brand = String(body.brand || '').trim();
      const title = String(body.title || '').trim();
      if (!key || !title) return res.status(400).json({ ok: false, error: 'Укажите файл и название модели' });

      const meta = await getSneakersCols(sql);
      if (!meta.exists || !meta.imgCol || !meta.nameCol) {
        return res.status(400).json({ ok: false, error: 'Таблица sneakers не поддерживает автодобавление' });
      }

      const sample = await sql.query(
        `SELECT ${quoteIdent(meta.imgCol)} AS img FROM "public"."sneakers" WHERE ${quoteIdent(meta.imgCol)} IS NOT NULL AND ${quoteIdent(meta.imgCol)} <> '' LIMIT 1`,
      );
      const sampleImg = String((sample[0] as { img?: unknown } | undefined)?.img || '');
      let imgValue = key;
      if (/^https?:\/\//i.test(sampleImg)) {
        const originM = sampleImg.match(/^(https?:\/\/[^/]+)/i);
        if (originM) imgValue = `${originM[1]}/${key}`;
      } else if (!sampleImg.includes('/') && key.includes('/')) {
        imgValue = key.split('/').pop() || key;
      }

      const cols: string[] = [quoteIdent(meta.nameCol), quoteIdent(meta.imgCol)];
      const vals: unknown[] = [title, imgValue];
      if (meta.brandCol && brand) {
        cols.push(quoteIdent(meta.brandCol));
        vals.push(brand);
      }
      const placeholders = vals.map((_, idx) => `$${idx + 1}`).join(', ');
      const inserted = await sql.query(
        `INSERT INTO "public"."sneakers" (${cols.join(', ')}) VALUES (${placeholders}) RETURNING ${quoteIdent(meta.idCol)} AS id`,
        vals,
      );
      const newId = String((inserted[0] as { id?: unknown } | undefined)?.id ?? '');

      return res.status(200).json({
        ok: true,
        match: { id: newId, brand, title, img: imgValue },
      });
    }

    if (action === 'r2-stats' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const cfg = getR2Config();
      if (cfg.missing.length > 0) return res.status(400).json({ ok: false, error: 'R2 не настроен' });

      const t0 = Date.now();
      const allFiles = await listAllR2Objects(cfg);
      let totalBytes = 0;
      const extMap: Record<string, { count: number; bytes: number }> = {};
      const etagMap: Record<string, { size: number; keys: string[] }> = {};

      for (const f of allFiles) {
        totalBytes += f.size;
        const name = f.key.split('/').pop() || '';
        const dot = name.lastIndexOf('.');
        const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().slice(0, 8) : 'other';
        if (!extMap[ext]) extMap[ext] = { count: 0, bytes: 0 };
        extMap[ext].count += 1;
        extMap[ext].bytes += f.size;

        if (f.etag) {
          if (!etagMap[f.etag]) etagMap[f.etag] = { size: f.size, keys: [] };
          etagMap[f.etag].keys.push(f.key);
        }
      }

      const formats = Object.keys(extMap)
        .map((ext) => ({ ext, count: extMap[ext].count, bytes: extMap[ext].bytes }))
        .sort((a, b) => b.bytes - a.bytes);

      const allDupGroups = Object.keys(etagMap)
        .filter((etag) => etagMap[etag].keys.length > 1)
        .map((etag) => ({ etag, size: etagMap[etag].size, keys: etagMap[etag].keys }))
        .sort((a, b) => (b.keys.length - 1) * b.size - (a.keys.length - 1) * a.size);

      const duplicateWastedBytes = allDupGroups.reduce(
        (sum, g) => sum + (g.keys.length - 1) * g.size,
        0,
      );

      const largest = [...allFiles].sort((a, b) => b.size - a.size).slice(0, 20);
      const newest = [...allFiles]
        .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
        .slice(0, 20);

      return res.status(200).json({
        ok: true,
        ms: Date.now() - t0,
        bucket: cfg.bucket,
        totalFiles: allFiles.length,
        totalBytes,
        formats,
        largest,
        newest,
        duplicates: allDupGroups.slice(0, 40),
        duplicateGroupsCount: allDupGroups.length,
        duplicateWastedBytes,
      });
    }

    if (action === 'r2-delete' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const cfg = getR2Config();
      if (cfg.missing.length > 0) return res.status(400).json({ ok: false, error: 'R2 не настроен' });
      const body = (req.body || {}) as Record<string, unknown>;
      const key = String(body.key || '').trim();
      if (!key) return res.status(400).json({ ok: false, error: 'Не указан файл' });

      const r2Resp = await r2SignedFetch(cfg, 'DELETE', key, {});
      if (!r2Resp.ok && r2Resp.status !== 204) {
        return res.status(502).json({ ok: false, error: `Ошибка удаления R2 (${r2Resp.status})` });
      }

      try {
        const auditMeta = JSON.stringify({ key });
        await sql`
          INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
          VALUES (${auth.adminId}, '', 'Admin', 'admin', ${auth.via}, 'ru', 'admin_r2_delete', ${cfg.bucket}, ${auditMeta})
        `;
      } catch (e) {
        console.error('r2 audit log error:', e);
      }

      return res.status(200).json({ ok: true, key });
    }

    if (action === 'r2-presign' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const cfg = getR2Config();
      if (cfg.missing.length > 0) return res.status(400).json({ ok: false, error: 'R2 не настроен' });
      const body = (req.body || {}) as Record<string, unknown>;
      const rawKey = String(body.key || '').trim().replace(/^\/+/, '');
      if (!rawKey) return res.status(400).json({ ok: false, error: 'Не указано имя файла' });

      const uploadUrl = r2PresignUrl(cfg, 'PUT', rawKey, 300);
      return res.status(200).json({
        ok: true,
        key: rawKey,
        uploadUrl,
        publicUrl: cfg.publicUrl ? `${cfg.publicUrl}/${r2EncodePath(rawKey)}` : '',
      });
    }

    // --- CLOUD OPS: VERCEL, RENDER & GITHUB ---
    if (action === 'cloud-status') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const vToken = (process.env.VERCEL_TOKEN || '').trim();
      const vProjectId = (process.env.VERCEL_PROJECT_ID || '').trim();
      const vTeamId = (process.env.VERCEL_TEAM_ID || '').trim();
      const rKey = (process.env.RENDER_API_KEY || '').trim();

      const vMissing: string[] = [];
      if (!vToken) vMissing.push('VERCEL_TOKEN');
      if (!vProjectId) vMissing.push('VERCEL_PROJECT_ID');

      const [vercelState, renderState] = await Promise.all([
        (async () => {
          if (vMissing.length > 0) {
            return { configured: false, missing: vMissing, projectId: vProjectId, deployments: [], envKeys: [] };
          }
          try {
            const teamQs = vTeamId ? `&teamId=${encodeURIComponent(vTeamId)}` : '';
            const teamOnlyQs = vTeamId ? `?teamId=${encodeURIComponent(vTeamId)}` : '';
            const headers = { Authorization: `Bearer ${vToken}` };

            const [depResp, envResp] = await Promise.all([
              fetch(`https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(vProjectId)}&limit=8${teamQs}`, { headers }),
              fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(vProjectId)}/env${teamOnlyQs}`, { headers }),
            ]);

            if (!depResp.ok) {
              const t = await depResp.text();
              return {
                configured: true,
                missing: [],
                projectId: vProjectId,
                deployments: [],
                envKeys: [],
                error: `Vercel API (${depResp.status}): ${t.slice(0, 120)}`,
              };
            }

            const depJson = (await depResp.json()) as {
              deployments?: Array<{
                uid?: string;
                name?: string;
                url?: string;
                state?: string;
                target?: string;
                created?: number;
                meta?: Record<string, string>;
              }>;
            };

            const envKeysSet = new Set<string>();
            if (envResp.ok) {
              const envJson = (await envResp.json()) as { envs?: Array<{ key?: string }> };
              for (const e of envJson.envs || []) {
                if (e.key) envKeysSet.add(e.key);
              }
            }

            const deployments = (depJson.deployments || []).map((d) => ({
              uid: String(d.uid || ''),
              name: String(d.name || ''),
              url: String(d.url || ''),
              state: String(d.state || 'UNKNOWN'),
              target: String(d.target || 'preview'),
              created: d.created ? new Date(d.created).toISOString() : '',
              commitMsg: String(d.meta?.githubCommitMessage || '').split('\n')[0].slice(0, 100),
              branch: String(d.meta?.githubCommitRef || ''),
            }));

            return {
              configured: true,
              missing: [],
              projectId: vProjectId,
              deployments,
              envKeys: Array.from(envKeysSet).sort(),
            };
          } catch (e) {
            return {
              configured: true,
              missing: [],
              projectId: vProjectId,
              deployments: [],
              envKeys: [],
              error: e instanceof Error ? e.message : 'Vercel fetch error',
            };
          }
        })(),
        (async () => {
          if (!rKey) {
            return { configured: false, missing: ['RENDER_API_KEY'], services: [] };
          }
          try {
            const headers = { Authorization: `Bearer ${rKey}`, Accept: 'application/json' };
            const resp = await fetch('https://api.render.com/v1/services?limit=20', { headers });
            if (!resp.ok) {
              const t = await resp.text();
              return {
                configured: true,
                missing: [],
                services: [],
                error: `Render API (${resp.status}): ${t.slice(0, 120)}`,
              };
            }
            const rawList = (await resp.json()) as Array<{
              service?: {
                id?: string;
                name?: string;
                type?: string;
                suspended?: string;
                updatedAt?: string;
                serviceDetails?: { url?: string; region?: string };
              };
            }>;

            const services = await Promise.all(
              rawList.map(async (item) => {
                const s = item.service || {};
                const id = String(s.id || '');
                let latestDeploy: { id: string; status: string; trigger: string; createdAt: string; commitMsg: string } | null = null;
                if (id) {
                  try {
                    const dr = await fetch(`https://api.render.com/v1/services/${encodeURIComponent(id)}/deploys?limit=1`, { headers });
                    if (dr.ok) {
                      const dArr = (await dr.json()) as Array<{
                        deploy?: { id?: string; status?: string; trigger?: string; createdAt?: string; commit?: { message?: string } };
                      }>;
                      const d0 = dArr[0]?.deploy;
                      if (d0) {
                        latestDeploy = {
                          id: String(d0.id || ''),
                          status: String(d0.status || ''),
                          trigger: String(d0.trigger || ''),
                          createdAt: String(d0.createdAt || ''),
                          commitMsg: String(d0.commit?.message || '').split('\n')[0].slice(0, 100),
                        };
                      }
                    }
                  } catch {
                    // ignore deploy lookup failure
                  }
                }
                return {
                  id,
                  name: String(s.name || ''),
                  type: String(s.type || ''),
                  suspended: String(s.suspended || 'not_suspended'),
                  url: String(s.serviceDetails?.url || ''),
                  region: String(s.serviceDetails?.region || ''),
                  updatedAt: String(s.updatedAt || ''),
                  latestDeploy,
                };
              }),
            );

            return { configured: true, missing: [], services };
          } catch (e) {
            return {
              configured: true,
              missing: [],
              services: [],
              error: e instanceof Error ? e.message : 'Render fetch error',
            };
          }
        })(),
      ]);

      return res.status(200).json({ ok: true, vercel: vercelState, render: renderState });
    }

    if (action === 'vercel-action' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const vToken = (process.env.VERCEL_TOKEN || '').trim();
      const vTeamId = (process.env.VERCEL_TEAM_ID || '').trim();
      if (!vToken) return res.status(400).json({ ok: false, error: 'VERCEL_TOKEN не задан' });

      const body = (req.body || {}) as Record<string, unknown>;
      const op = String(body.op || '').trim();
      const deploymentId = String(body.deploymentId || '').trim();
      const name = String(body.name || 'cordwainer-miniapp').trim();
      const headers = { Authorization: `Bearer ${vToken}`, 'Content-Type': 'application/json' };
      const teamQs = vTeamId ? `?teamId=${encodeURIComponent(vTeamId)}` : '';

      if (op === 'logs' && deploymentId) {
        const ampTeam = vTeamId ? `&teamId=${encodeURIComponent(vTeamId)}` : '';
        const r = await fetch(
          `https://api.vercel.com/v3/deployments/${encodeURIComponent(deploymentId)}/events?direction=backward&limit=40${ampTeam}`,
          { headers },
        );
        if (!r.ok) return res.status(502).json({ ok: false, error: `Vercel logs (${r.status})` });
        const ansiRe = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
        const events = (await r.json()) as Array<{ text?: string; payload?: { text?: string } }>;
        const lines = events
          .map((ev) => String(ev.text || ev.payload?.text || '').replace(ansiRe, '').trim())
          .filter(Boolean)
          .slice(0, 30)
          .reverse();
        return res.status(200).json({ ok: true, lines });
      }

      if (op === 'redeploy' && deploymentId) {
        const r = await fetch(`https://api.vercel.com/v13/deployments${teamQs}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ name, deploymentId, target: 'production' }),
        });
        if (!r.ok) {
          const t = await r.text();
          return res.status(502).json({ ok: false, error: `Vercel redeploy (${r.status}): ${t.slice(0, 120)}` });
        }
        try {
          const auditMeta = JSON.stringify({ deploymentId, name });
          await sql`
            INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
            VALUES (${auth.adminId}, '', 'Admin', 'admin', ${auth.via}, 'ru', 'admin_vercel_redeploy', ${name}, ${auditMeta})
          `;
        } catch (e) {
          console.error('vercel audit err:', e);
        }
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ ok: false, error: 'Неизвестная операция Vercel' });
    }

    if (action === 'render-action' && req.method === 'POST') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const body = (req.body || {}) as Record<string, unknown>;
      const op = String(body.op || '').trim();

      if (op === 'webhook') {
        const botToken = (process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').trim();
        if (!botToken) return res.status(400).json({ ok: false, error: 'BOT_TOKEN не задан' });
        const tgR = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
        const tgJson = (await tgR.json()) as {
          ok?: boolean;
          result?: {
            url?: string;
            pending_update_count?: number;
            last_error_message?: string;
            last_error_date?: number;
          };
        };
        if (!tgR.ok || !tgJson.ok || !tgJson.result) {
          return res.status(502).json({ ok: false, error: 'Ошибка Telegram getWebhookInfo' });
        }
        const info = tgJson.result;
        return res.status(200).json({
          ok: true,
          webhook: {
            url: String(info.url || ''),
            pendingCount: Number(info.pending_update_count || 0),
            lastError: String(info.last_error_message || ''),
            lastErrorDate: info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : '',
          },
        });
      }

      const rKey = (process.env.RENDER_API_KEY || '').trim();
      if (!rKey) return res.status(400).json({ ok: false, error: 'RENDER_API_KEY не задан' });

      const serviceId = String(body.serviceId || '').trim();
      const serviceName = String(body.serviceName || serviceId).trim();
      if (!serviceId) return res.status(400).json({ ok: false, error: 'Не указан serviceId' });

      const headers = { Authorization: `Bearer ${rKey}`, 'Content-Type': 'application/json', Accept: 'application/json' };
      const base = `https://api.render.com/v1/services/${encodeURIComponent(serviceId)}`;

      if (op === 'logs') {
        const svcR = await fetch(base, { headers });
        if (!svcR.ok) return res.status(502).json({ ok: false, error: `Render service (${svcR.status})` });
        const svcJson = (await svcR.json()) as { ownerId?: string };
        const ownerId = String(svcJson.ownerId || '');
        if (!ownerId) return res.status(502).json({ ok: false, error: 'Не найден ownerId сервиса' });

        const logsR = await fetch(
          `https://api.render.com/v1/logs?ownerId=${encodeURIComponent(ownerId)}&resource=${encodeURIComponent(serviceId)}&limit=35`,
          { headers },
        );
        if (!logsR.ok) {
          const t = await logsR.text();
          return res.status(502).json({ ok: false, error: `Render logs (${logsR.status}): ${t.slice(0, 100)}` });
        }
        const logsJson = (await logsR.json()) as { logs?: Array<{ timestamp?: string; message?: string }> };
        const ansiRe = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
        const lines = (logsJson.logs || [])
          .map((l) => {
            const ts = l.timestamp ? String(l.timestamp).slice(11, 19) : '';
            const msg = String(l.message || '').replace(ansiRe, '').trim();
            return msg ? (ts ? `[${ts}] ${msg}` : msg) : '';
          })
          .filter(Boolean);
        return res.status(200).json({ ok: true, lines });
      }

      if (op === 'deploys') {
        const r = await fetch(`${base}/deploys?limit=6`, { headers });
        if (!r.ok) return res.status(502).json({ ok: false, error: `Render deploys (${r.status})` });
        const arr = (await r.json()) as Array<{
          deploy?: { id?: string; status?: string; trigger?: string; createdAt?: string; commit?: { message?: string } };
        }>;
        const deploys = arr.map((item) => ({
          id: String(item.deploy?.id || ''),
          status: String(item.deploy?.status || ''),
          trigger: String(item.deploy?.trigger || ''),
          createdAt: String(item.deploy?.createdAt || ''),
          commitMsg: String(item.deploy?.commit?.message || '').split('\n')[0].slice(0, 100),
        }));
        return res.status(200).json({ ok: true, deploys });
      }

      const opPath: Record<string, { path: string; body?: string }> = {
        restart: { path: '/restart' },
        deploy: { path: '/deploys', body: JSON.stringify({ clearCache: 'do_not_clear' }) },
        suspend: { path: '/suspend' },
        resume: { path: '/resume' },
      };
      const target = opPath[op];
      if (!target) return res.status(400).json({ ok: false, error: 'Неизвестная операция Render' });

      const r = await fetch(`${base}${target.path}`, {
        method: 'POST',
        headers,
        body: target.body,
      });
      if (!r.ok) {
        const t = await r.text();
        return res.status(502).json({ ok: false, error: `Render ${op} (${r.status}): ${t.slice(0, 120)}` });
      }

      try {
        const auditMeta = JSON.stringify({ op, serviceId });
        await sql`
          INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
          VALUES (${auth.adminId}, '', 'Admin', 'admin', ${auth.via}, 'ru', ${`admin_render_${op}`}, ${serviceName}, ${auditMeta})
        `;
      } catch (e) {
        console.error('render audit err:', e);
      }

      return res.status(200).json({ ok: true });
    }

    if (action === 'github-ops') {
      const auth = authorizeAdmin(req);
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

      const ghToken = (process.env.GITHUB_TOKEN || '').trim();
      const rawRepos = (process.env.GITHUB_REPOS || process.env.GITHUB_REPO || 'vplyha-maker/cordwainer-miniapp').trim();
      const repos = rawRepos.split(',').map((s) => s.trim()).filter(Boolean);

      if (!ghToken) {
        return res.status(200).json({
          ok: true,
          configured: false,
          missing: ['GITHUB_TOKEN'],
          repos,
          activeRepo: repos[0] || '',
          commits: [],
          workflows: [],
          runs: [],
        });
      }

      const ghHeaders = {
        Authorization: `Bearer ${ghToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };

      if (req.method === 'POST') {
        const body = (req.body || {}) as Record<string, unknown>;
        const op = String(body.op || '').trim();
        const targetRepo = String(body.repo || repos[0] || '').trim();
        if (!repos.includes(targetRepo)) {
          return res.status(400).json({ ok: false, error: 'Репозиторий не в списке разрешённых' });
        }

        if (op === 'commit-files') {
          const sha = String(body.sha || '').trim();
          if (!/^[0-9a-f]{7,40}$/i.test(sha)) return res.status(400).json({ ok: false, error: 'Неверный SHA' });
          const r = await fetch(`https://api.github.com/repos/${targetRepo}/commits/${sha}`, { headers: ghHeaders });
          if (!r.ok) return res.status(502).json({ ok: false, error: `GitHub commit (${r.status})` });
          const j = (await r.json()) as {
            files?: Array<{ filename?: string; status?: string; additions?: number; deletions?: number }>;
          };
          const files = (j.files || []).slice(0, 30).map((f) => ({
            filename: String(f.filename || ''),
            status: String(f.status || ''),
            additions: Number(f.additions || 0),
            deletions: Number(f.deletions || 0),
          }));
          return res.status(200).json({ ok: true, files });
        }

        if (op === 'dispatch') {
          const workflowId = Number(body.workflowId || 0);
          const workflowName = String(body.workflowName || workflowId);
          const ref = String(body.ref || 'main').trim() || 'main';
          if (!workflowId) return res.status(400).json({ ok: false, error: 'Не указан workflowId' });

          const r = await fetch(
            `https://api.github.com/repos/${targetRepo}/actions/workflows/${workflowId}/dispatches`,
            {
              method: 'POST',
              headers: { ...ghHeaders, 'Content-Type': 'application/json' },
              body: JSON.stringify({ ref }),
            },
          );
          if (!r.ok && r.status !== 204) {
            const t = await r.text();
            return res.status(502).json({ ok: false, error: `GitHub dispatch (${r.status}): ${t.slice(0, 120)}` });
          }

          try {
            const auditMeta = JSON.stringify({ repo: targetRepo, workflowId, ref });
            await sql`
              INSERT INTO app_events (user_id, username, first_name, source, platform, lang, event, page, meta)
              VALUES (${auth.adminId}, '', 'Admin', 'admin', ${auth.via}, 'ru', 'admin_gh_dispatch', ${workflowName}, ${auditMeta})
            `;
          } catch (e) {
            console.error('gh audit err:', e);
          }

          return res.status(200).json({ ok: true });
        }

        return res.status(400).json({ ok: false, error: 'Неизвестная операция GitHub' });
      }

      const reqRepo = String(req.query.repo || '').trim();
      const activeRepo = repos.includes(reqRepo) ? reqRepo : repos[0] || '';

      try {
        const [cResp, wfResp, runResp] = await Promise.all([
          fetch(`https://api.github.com/repos/${activeRepo}/commits?per_page=10`, { headers: ghHeaders }),
          fetch(`https://api.github.com/repos/${activeRepo}/actions/workflows?per_page=15`, { headers: ghHeaders }),
          fetch(`https://api.github.com/repos/${activeRepo}/actions/runs?per_page=8`, { headers: ghHeaders }),
        ]);

        if (!cResp.ok) {
          const t = await cResp.text();
          return res.status(200).json({
            ok: true,
            configured: true,
            missing: [],
            repos,
            activeRepo,
            commits: [],
            workflows: [],
            runs: [],
            error: `GitHub API (${cResp.status}): ${t.slice(0, 120)}`,
          });
        }

        const cArr = (await cResp.json()) as Array<{
          sha?: string;
          commit?: { message?: string; author?: { name?: string; date?: string } };
        }>;
        const wfJson = wfResp.ok
          ? ((await wfResp.json()) as { workflows?: Array<{ id?: number; name?: string; state?: string; path?: string }> })
          : { workflows: [] };
        const runJson = runResp.ok
          ? ((await runResp.json()) as {
              workflow_runs?: Array<{
                id?: number;
                name?: string;
                status?: string;
                conclusion?: string | null;
                head_branch?: string;
                created_at?: string;
              }>;
            })
          : { workflow_runs: [] };

        return res.status(200).json({
          ok: true,
          configured: true,
          missing: [],
          repos,
          activeRepo,
          commits: cArr.map((c) => ({
            sha: String(c.sha || ''),
            message: String(c.commit?.message || '').split('\n')[0].slice(0, 110),
            author: String(c.commit?.author?.name || ''),
            date: String(c.commit?.author?.date || ''),
          })),
          workflows: (wfJson.workflows || []).map((w) => ({
            id: Number(w.id || 0),
            name: String(w.name || ''),
            state: String(w.state || ''),
            path: String(w.path || ''),
          })),
          runs: (runJson.workflow_runs || []).map((r) => ({
            id: Number(r.id || 0),
            name: String(r.name || ''),
            status: String(r.status || ''),
            conclusion: String(r.conclusion || ''),
            branch: String(r.head_branch || ''),
            createdAt: String(r.created_at || ''),
          })),
        });
      } catch (e) {
        return res.status(200).json({
          ok: true,
          configured: true,
          missing: [],
          repos,
          activeRepo,
          commits: [],
          workflows: [],
          runs: [],
          error: e instanceof Error ? e.message : 'GitHub fetch error',
        });
      }
    }

    // --- TELEGRAM OTP LOGIN ---
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
        body: JSON.stringify({ chat_id: adminId, text: tgText }),
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

    if (action === 'otp-verify' && req.method === 'POST') {
      const adminId = (process.env.ADMIN_TELEGRAM_ID || '').trim();
      const botToken = (process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').trim();
      if (!adminId || !botToken) return res.status(500).json({ ok: false, error: 'Сервер не настроен' });

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
        return res.status(403).json({ ok: false, error: 'Код больше не действителен. Запросите новый.' });
      }

      const metaObj = parseMetaObj(sentRows[0].meta);
      const expMs = Number(metaObj.expMs || 0);
      const savedSig = String(metaObj.sig || '');

      if (!Number.isFinite(expMs) || Date.now() > expMs || !/^[0-9a-f]{64}$/i.test(savedSig)) {
        return res.status(403).json({ ok: false, error: 'Срок действия кода (2 мин) истёк. Запросите новый.' });
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

      return res.status(200).json({ ok: true, token, expiresAt: new Date(sessionExp).toISOString(), ttlHours: 12 });
    }

    if (action === 'web-token' && req.method === 'POST') {
      const tgAuth = authorizeTelegramOnly(req);
      if (!tgAuth.ok) return res.status(403).json({ ok: false, error: 'Выпуск ссылки доступен только из Telegram' });
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

      return res.status(200).json({ ok: true, token, expiresAt: new Date(expMs).toISOString(), ttlHours: 12 });
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

      if (!userId) return res.status(200).json({ ok: true, banned: false });

      const banRows = await sql`SELECT reason FROM banned_users WHERE user_id = ${userId} LIMIT 1`;
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
      if (!auth.ok) return res.status(403).json({ ok: false, error: 'Forbidden' });

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
        daily.push(dailyMap[iso] || { day_iso: iso, label: `${dd}.${mm}`, tg: 0, web: 0, events: 0 });
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
        SELECT user_id, reason, created_at FROM banned_users ORDER BY created_at DESC LIMIT 50
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
      const ret = retentionRows[0] || { new_users: 0, returning_users: 0, retained_30d: 0, total_30d: 0 };

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
        languages: langRows.map((r) => ({ name: String(r.name), value: Number(r.value || 0) })),
        platforms: platformRows.map((r) => ({ name: String(r.name), value: Number(r.value || 0) })),
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
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return res.status(400).json({ ok: false, error: 'Invalid date' });
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
        sql`SELECT product_id FROM user_purchases WHERE user_id::text = ${targetId}`,
        sql`SELECT reason, created_at FROM banned_users WHERE user_id = ${targetId} LIMIT 1`,
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

      if (!targetId || !productId) return res.status(400).json({ ok: false, error: 'Укажите ID пользователя и модуль' });

      const targets = productId === 'all' ? ALL_CORE_PRO_IDS : [productId];

      if (mode === 'grant') {
        for (const pid of targets) {
          const exists = await sql`
            SELECT 1 FROM user_purchases WHERE user_id::text = ${targetId} AND product_id = ${pid} LIMIT 1
          `;
          if (exists.length === 0) {
            await sql`INSERT INTO user_purchases (user_id, product_id) VALUES (${targetId}, ${pid})`;
          }
        }
      } else {
        for (const pid of targets) {
          await sql`DELETE FROM user_purchases WHERE user_id::text = ${targetId} AND product_id = ${pid}`;
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

      if (!targetId) return res.status(400).json({ ok: false, error: 'Укажите ID пользователя' });
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

    if (!userId) return res.status(200).json({ purchased: false, banned: false });

    const banCheck = await sql`SELECT reason FROM banned_users WHERE user_id = ${userId} LIMIT 1`;
    if (banCheck.length > 0) {
      return res.status(200).json({
        purchased: false,
        banned: true,
        reason: String(banCheck[0].reason || 'Доступ ограничен администратором'),
      });
    }

    if (!productId) return res.status(200).json({ purchased: false, banned: false });

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
