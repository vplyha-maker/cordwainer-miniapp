import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  Copy,
  Database,
  ExternalLink,
  Folder,
  HardDrive,
  Play,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { copyTextToClipboard } from './exportUtils';
import type { HealthData } from './types';
import { DARK_INPUT_STYLE, formatShortDate } from './types';

type SubTab = 'health' | 'neon' | 'r2';
type RowRecord = Record<string, unknown>;
type RowList = RowRecord[];

type DbTableInfo = {
  name: string;
  rows: number;
  sizePretty: string;
  sizeBytes: number;
};

type R2FileItem = {
  key: string;
  size: number;
  lastModified: string;
};

type R2ListState = {
  configured: boolean;
  missing: string[];
  bucket: string;
  publicUrl: string;
  prefix: string;
  totalSize: number;
  folders: string[];
  files: R2FileItem[];
};

type TgWindow = {
  Telegram?: {
    WebApp?: {
      openLink?: (url: string) => void;
    };
  };
};

type AdminSystemTabProps = {
  authMode: 'telegram' | 'web';
  buildAuthHeaders: () => Record<string, string>;
  showToast: (msg: string) => void;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function cellPreview(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 60);
  const s = String(v);
  return s.length > 48 ? `${s.slice(0, 48)}…` : s;
}

export const AdminSystemTab: React.FC<AdminSystemTabProps> = ({
  authMode,
  buildAuthHeaders,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('health');
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);
  const [mintingLink, setMintingLink] = useState<boolean>(false);

  // Neon Explorer state
  const [dbSize, setDbSize] = useState<string>('—');
  const [tables, setTables] = useState<DbTableInfo[]>([]);
  const [tablesLoading, setTablesLoading] = useState<boolean>(false);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableCols, setTableCols] = useState<string[]>([]);
  const [tableRows, setTableRows] = useState<RowList>([]);
  const [rowsLoading, setRowsLoading] = useState<boolean>(false);
  const [sqlText, setSqlText] = useState<string>(
    'SELECT user_id, COUNT(*) AS mods FROM user_purchases GROUP BY user_id ORDER BY mods DESC',
  );
  const [sqlCols, setSqlCols] = useState<string[]>([]);
  const [sqlRows, setSqlRows] = useState<RowList>([]);
  const [sqlError, setSqlError] = useState<string>('');
  const [sqlRunning, setSqlRunning] = useState<boolean>(false);

  // Cloudflare R2 state
  const [r2, setR2] = useState<R2ListState | null>(null);
  const [r2Prefix, setR2Prefix] = useState<string>('');
  const [r2Loading, setR2Loading] = useState<boolean>(false);
  const [r2Error, setR2Error] = useState<string>('');
  const [r2Uploading, setR2Uploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const r = await fetch('/api/check-purchase?action=health', { headers: buildAuthHeaders() });
      const data = (await r.json()) as HealthData;
      if (r.ok && data.ok) setHealth(data);
    } catch {
      // ignore
    } finally {
      setHealthLoading(false);
    }
  }, [buildAuthHeaders]);

  const fetchTables = useCallback(async () => {
    setTablesLoading(true);
    try {
      const r = await fetch('/api/check-purchase?action=db-tables', { headers: buildAuthHeaders() });
      const data = (await r.json()) as { ok?: boolean; dbSize?: string; tables?: DbTableInfo[] };
      if (r.ok && data.ok) {
        setDbSize(data.dbSize || '—');
        setTables(data.tables || []);
      }
    } catch {
      showToast('Не удалось загрузить таблицы Neon');
    } finally {
      setTablesLoading(false);
    }
  }, [buildAuthHeaders, showToast]);

  const fetchTableRows = async (tableName: string) => {
    setSelectedTable(tableName);
    setRowsLoading(true);
    try {
      const r = await fetch(
        `/api/check-purchase?action=db-rows&table=${encodeURIComponent(tableName)}`,
        { headers: buildAuthHeaders() },
      );
      const data = (await r.json()) as { ok?: boolean; columns?: string[]; rows?: RowList };
      if (r.ok && data.ok) {
        setTableCols(data.columns || []);
        setTableRows(data.rows || []);
      }
    } catch {
      showToast('Ошибка загрузки строк');
    } finally {
      setRowsLoading(false);
    }
  };

  const runReadOnlySql = async () => {
    setSqlRunning(true);
    setSqlError('');
    try {
      const r = await fetch('/api/check-purchase?action=db-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ query: sqlText }),
      });
      const data = (await r.json()) as {
        ok?: boolean;
        columns?: string[];
        rows?: RowList;
        error?: string;
      };
      if (!r.ok || !data.ok) {
        setSqlError(data.error || 'Ошибка SQL');
      } else {
        setSqlCols(data.columns || []);
        setSqlRows(data.rows || []);
      }
    } catch {
      setSqlError('Ошибка сети');
    } finally {
      setSqlRunning(false);
    }
  };

  const runCleanup = async (mode: 'otp' | 'old_events') => {
    const label = mode === 'otp' ? 'старые OTP-логи (>7 дн.)' : 'события старше 90 дней';
    if (!window.confirm(`Очистить ${label}?`)) return;
    try {
      const r = await fetch('/api/check-purchase?action=db-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ mode }),
      });
      const data = (await r.json()) as { ok?: boolean; deleted?: number; error?: string };
      if (r.ok && data.ok) {
        showToast(`Удалено строк: ${data.deleted ?? 0}`);
        fetchTables();
      } else {
        showToast(data.error || 'Ошибка очистки');
      }
    } catch {
      showToast('Ошибка сети');
    }
  };

  const fetchR2 = useCallback(
    async (prefixVal: string) => {
      setR2Loading(true);
      setR2Error('');
      try {
        const r = await fetch(
          `/api/check-purchase?action=r2-list&prefix=${encodeURIComponent(prefixVal)}`,
          { headers: buildAuthHeaders() },
        );
        const data = (await r.json()) as R2ListState & { ok?: boolean; error?: string };
        if (!r.ok || !data.ok) {
          setR2Error(data.error || 'Ошибка загрузки R2');
        } else {
          setR2(data);
          setR2Prefix(prefixVal);
        }
      } catch {
        setR2Error('Ошибка сети при обращении к R2');
      } finally {
        setR2Loading(false);
      }
    },
    [buildAuthHeaders],
  );

  const handleR2Delete = async (key: string) => {
    if (!window.confirm(`Удалить файл «${key}» из Cloudflare R2 навсегда?`)) return;
    try {
      const r = await fetch('/api/check-purchase?action=r2-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ key }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (r.ok && data.ok) {
        showToast('Файл удалён из R2');
        fetchR2(r2Prefix);
      } else {
        showToast(data.error || 'Не удалось удалить файл');
      }
    } catch {
      showToast('Ошибка сети');
    }
  };

  const handleR2UploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setR2Uploading(true);
    try {
      const safeName = file.name.replace(/\s+/g, '_');
      const targetKey = `${r2Prefix}${safeName}`;
      const r = await fetch('/api/check-purchase?action=r2-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ key: targetKey }),
      });
      const data = (await r.json()) as { ok?: boolean; uploadUrl?: string; error?: string };
      if (!r.ok || !data.ok || !data.uploadUrl) {
        showToast(data.error || 'Не удалось получить ссылку загрузки');
        return;
      }

      const putResp = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!putResp.ok) {
        showToast('Ошибка загрузки в R2 (проверьте CORS бакета)');
        return;
      }
      showToast(`Загружено: ${safeName}`);
      fetchR2(r2Prefix);
    } catch {
      showToast('Загрузка заблокирована CORS в R2 (добавьте правило PUT)');
    } finally {
      setR2Uploading(false);
    }
  };

  const handleMintChromeLink = async (mode: 'open' | 'copy') => {
    if (authMode !== 'telegram') return;
    setMintingLink(true);
    try {
      const r = await fetch('/api/check-purchase?action=web-token', {
        method: 'POST',
        headers: buildAuthHeaders(),
      });
      const data = (await r.json()) as { ok?: boolean; token?: string; error?: string };
      if (!r.ok || !data.ok || !data.token) {
        showToast(data.error || 'Не удалось создать ссылку');
        return;
      }
      const magicUrl = `${window.location.origin}/#admin_token=${data.token}`;
      if (mode === 'copy') {
        const copied = await copyTextToClipboard(magicUrl);
        showToast(copied ? 'Ссылка (12 ч) скопирована' : 'Не удалось скопировать');
        return;
      }
      const tgWebApp = (window as unknown as TgWindow).Telegram?.WebApp;
      if (tgWebApp && typeof tgWebApp.openLink === 'function') {
        tgWebApp.openLink(magicUrl);
        showToast('Открываю панель в Chrome...');
      } else {
        window.open(magicUrl, '_blank');
      }
    } catch {
      showToast('Ошибка сети');
    } finally {
      setMintingLink(false);
    }
  };

  useEffect(() => {
    if (subTab === 'health') fetchHealth();
    if (subTab === 'neon' && tables.length === 0) fetchTables();
    if (subTab === 'r2' && !r2) fetchR2('');
  }, [subTab, fetchHealth, fetchTables, fetchR2, tables.length, r2]);

  const parentPrefix = r2Prefix
    ? r2Prefix.replace(/[^/]+\/$/, '')
    : '';

  return (
    <div className="space-y-3">
      {/* Sub-tab Switcher */}
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/[0.08] bg-[#141412] p-1">
        {(
          [
            { id: 'health', label: 'Обзор' },
            { id: 'neon', label: 'Neon БД' },
            { id: 'r2', label: 'Cloudflare R2' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSubTab(item.id)}
            className={`rounded-xl py-2 text-[12px] font-semibold transition ${
              subTab === item.id
                ? 'bg-[#C9A86A] text-[#121210]'
                : 'text-[#BDB6AC] hover:bg-white/[0.04]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* SUBTAB 1: HEALTH & CHROME */}
      {subTab === 'health' && (
        <div className="space-y-3">
          {authMode === 'telegram' && (
            <div className="rounded-2xl border border-[#C9A86A]/35 bg-[#15130E] p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ExternalLink className="w-4 h-4 text-[#C9A86A] shrink-0 mt-0.5" />
                <div>
                  <div className="text-[14px] font-semibold text-[#F5F1EB]">
                    Вход с ПК / Chrome (без пароля)
                  </div>
                  <div className="text-[12px] text-[#A8A095] mt-0.5">
                    На ПК или в ярлыке откройте{' '}
                    <span className="font-mono text-[#C9A86A]">cordwaine.app/?admin=1</span> — бот пришлёт одноразовый код (2 мин).
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={mintingLink}
                  onClick={() => handleMintChromeLink('open')}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#C9A86A] py-2.5 px-3 text-[13px] font-semibold text-[#121210] disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  {mintingLink ? 'Создание...' : 'Открыть в Chrome'}
                </button>
                <button
                  type="button"
                  disabled={mintingLink}
                  onClick={() => handleMintChromeLink('copy')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#C9A86A]/40 bg-white/[0.04] py-2.5 px-3 text-[13px] font-semibold text-[#F5F1EB] disabled:opacity-50"
                >
                  <Copy className="w-4 h-4 text-[#C9A86A]" />
                  Скопировать ссылку (12 ч)
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#3FD08F]" />
                <span className="text-[14px] font-semibold">Состояние Neon PostgreSQL</span>
              </div>
              <button
                type="button"
                onClick={fetchHealth}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-[#C9A86A]"
              >
                {healthLoading ? 'Пинг...' : 'Проверить'}
              </button>
            </div>

            {health ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="rounded-xl bg-[#0F0F0E] border border-white/[0.06] p-3">
                  <div className="text-[11px] text-[#8D867C]">Задержка БД</div>
                  <div className="text-[18px] font-bold font-mono text-[#3FD08F] mt-1">
                    {health.latencyMs} мс
                  </div>
                </div>
                <div className="rounded-xl bg-[#0F0F0E] border border-white/[0.06] p-3">
                  <div className="text-[11px] text-[#8D867C]">app_events</div>
                  <div className="text-[18px] font-bold font-mono text-[#F5F1EB] mt-1">
                    {health.eventsCount}
                  </div>
                </div>
                <div className="rounded-xl bg-[#0F0F0E] border border-white/[0.06] p-3">
                  <div className="text-[11px] text-[#8D867C]">user_purchases</div>
                  <div className="text-[18px] font-bold font-mono text-[#C9A86A] mt-1">
                    {health.purchasesCount}
                  </div>
                </div>
                <div className="rounded-xl bg-[#0F0F0E] border border-white/[0.06] p-3">
                  <div className="text-[11px] text-[#8D867C]">banned_users</div>
                  <div className="text-[18px] font-bold font-mono text-[#F06A7E] mt-1">
                    {health.bannedCount}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[12px] text-[#8D867C]">Загрузка телеметрии...</div>
            )}

            {health && (
              <div className="mt-3 pt-3 border-t border-white/[0.07] space-y-1.5 text-[12px] text-[#BDB6AC]">
                <div className="flex justify-between">
                  <span>Последнее событие:</span>
                  <span className="font-mono text-[#F5F1EB]">
                    {health.lastEventAt ? formatShortDate(health.lastEventAt) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Вход с ПК (Telegram OTP):</span>
                  <span className={health.webKeyConfigured ? 'text-[#3FD08F]' : 'text-[#F06A7E]'}>
                    {health.webKeyConfigured ? 'Активен (?admin=1)' : 'Нет BOT_TOKEN'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {authMode === 'web' && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4 text-[12px] text-[#A8A095] flex items-start gap-2.5">
              <Activity className="w-4 h-4 text-[#3FD08F] shrink-0 mt-0.5" />
              <div>
                Активна 12-часовая крипто-сессия в браузере. Доступны прямое скачивание CSV/Excel, печать PDF и загрузка файлов в R2.
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: NEON DB EXPLORER */}
      {subTab === 'neon' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[14px] font-semibold">Таблицы Neon ({tables.length})</div>
                <div className="text-[11px] text-[#8D867C]">Общий вес базы: {dbSize}</div>
              </div>
              <button
                type="button"
                onClick={fetchTables}
                className="p-2 rounded-xl border border-white/10 text-[#C9A86A]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${tablesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-1.5">
              {tables.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => fetchTableRows(t.name)}
                  className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                    selectedTable === t.name
                      ? 'border-[#C9A86A]/50 bg-[#C9A86A]/10'
                      : 'border-white/[0.06] bg-[#0F0F0E] hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="font-mono text-[13px] text-[#F5F1EB]">{t.name}</span>
                  <span className="font-mono text-[11px] text-[#A8A095]">
                    {t.rows} стр. · <span className="text-[#C9A86A]">{t.sizePretty}</span>
                  </span>
                </button>
              ))}
            </div>

            {selectedTable && (
              <div className="mt-3 pt-3 border-t border-white/[0.07]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold text-[#C9A86A] font-mono">
                    {selectedTable} (последние 25)
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTable('')}
                    className="text-[11px] text-[#8D867C]"
                  >
                    Скрыть
                  </button>
                </div>
                {rowsLoading ? (
                  <div className="text-[12px] text-[#8D867C]">Загрузка строк...</div>
                ) : tableRows.length === 0 ? (
                  <div className="text-[12px] text-[#8D867C]">Таблица пуста</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0B0B0A]">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="border-b border-white/[0.08] text-[#8D867C]">
                        <tr>
                          {tableCols.slice(0, 8).map((c) => (
                            <th key={c} className="px-2.5 py-2 whitespace-nowrap">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05] text-[#DED7CC]">
                        {tableRows.map((row, idx) => (
                          <tr key={idx}>
                            {tableCols.slice(0, 8).map((c) => (
                              <td key={c} className="px-2.5 py-1.5 whitespace-nowrap">
                                {cellPreview(row[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Read-Only SQL Console */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4 space-y-2.5">
            <div className="text-[14px] font-semibold">SQL-консоль (только чтение SELECT)</div>
            <textarea
              rows={3}
              value={sqlText}
              onChange={(e) => setSqlText(e.target.value)}
              style={DARK_INPUT_STYLE}
              className="w-full rounded-xl border border-white/15 p-3 font-mono text-[12px] focus:outline-none focus:border-[#C9A86A]"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={sqlRunning}
                onClick={runReadOnlySql}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#C9A86A] px-3.5 py-2 text-[12px] font-semibold text-[#121210] disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                {sqlRunning ? 'Выполнение...' : 'Выполнить SELECT'}
              </button>
              <button
                type="button"
                onClick={() => runCleanup('otp')}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-[#BDB6AC]"
              >
                Очистить OTP &gt;7д
              </button>
              <button
                type="button"
                onClick={() => runCleanup('old_events')}
                className="rounded-xl border border-[#F06A7E]/30 bg-[#F06A7E]/10 px-3 py-2 text-[11px] text-[#F06A7E]"
              >
                События &gt;90д
              </button>
            </div>
            {sqlError && <div className="text-[12px] text-[#F06A7E]">{sqlError}</div>}
            {sqlRows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0B0B0A]">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="border-b border-white/[0.08] text-[#8D867C]">
                    <tr>
                      {sqlCols.map((c) => (
                        <th key={c} className="px-2.5 py-2 whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] text-[#DED7CC]">
                    {sqlRows.map((row, idx) => (
                      <tr key={idx}>
                        {sqlCols.map((c) => (
                          <td key={c} className="px-2.5 py-1.5 whitespace-nowrap">
                            {cellPreview(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: CLOUDFLARE R2 MANAGER */}
      {subTab === 'r2' && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <HardDrive className="w-4 h-4 text-[#C9A86A] shrink-0" />
              <div className="min-w-0">
                <div className="text-[14px] font-semibold truncate">
                  Cloudflare R2 {r2?.bucket ? `· ${r2.bucket}` : ''}
                </div>
                {r2?.configured && (
                  <div className="text-[11px] text-[#8D867C]">
                    Файлов: {r2.files.length} · Объём: {formatBytes(r2.totalSize)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {r2?.configured && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleR2UploadFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={r2Uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#C9A86A] px-3 py-1.5 text-[12px] font-semibold text-[#121210] disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {r2Uploading ? 'Загрузка...' : 'Загрузить'}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => fetchR2(r2Prefix)}
                className="p-2 rounded-xl border border-white/10 text-[#C9A86A]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${r2Loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {r2Error && (
            <div className="rounded-xl border border-[#F06A7E]/35 bg-[#F06A7E]/10 px-3 py-2 text-[12px] text-[#F06A7E]">
              {r2Error}
            </div>
          )}

          {r2 && !r2.configured && (
            <div className="rounded-xl border border-[#C9A86A]/30 bg-[#15130E] p-3.5 space-y-2 text-[12px]">
              <div className="font-semibold text-[#C9A86A]">
                Добавьте переменные R2 в Vercel → Environment Variables:
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                {['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'].map((k) => {
                  const isMissing = r2.missing.includes(k);
                  return (
                    <div key={k} className="flex justify-between">
                      <span className="text-[#E7E1D7]">{k}</span>
                      <span className={isMissing ? 'text-[#F06A7E]' : 'text-[#3FD08F]'}>
                        {isMissing ? 'Не задана' : 'OK'}
                      </span>
                    </div>
                  );
                })}
                <div className="flex justify-between text-[#8D867C]">
                  <span>R2_PUBLIC_URL (опционально)</span>
                  <span>{r2.publicUrl ? 'OK' : 'для ссылок'}</span>
                </div>
              </div>
            </div>
          )}

          {r2?.configured && (
            <div className="space-y-2">
              {r2Prefix && (
                <button
                  type="button"
                  onClick={() => fetchR2(parentPrefix)}
                  className="text-[12px] font-mono text-[#C9A86A]"
                >
                  ← Назад ({r2Prefix})
                </button>
              )}

              {r2.folders.map((folder) => (
                <button
                  key={folder}
                  type="button"
                  onClick={() => fetchR2(folder)}
                  className="w-full flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0F0F0E] px-3 py-2 text-left"
                >
                  <span className="flex items-center gap-2 text-[13px] text-[#F5F1EB] font-mono">
                    <Folder className="w-4 h-4 text-[#C9A86A]" /> {folder}
                  </span>
                  <span className="text-[11px] text-[#8D867C]">Открыть →</span>
                </button>
              ))}

              {r2.files.map((f) => {
                const fileUrl = r2.publicUrl ? `${r2.publicUrl}/${f.key}` : '';
                return (
                  <div
                    key={f.key}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#0F0F0E] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[12px] text-[#F5F1EB] truncate">
                        {f.key.slice(r2Prefix.length) || f.key}
                      </div>
                      <div className="text-[11px] text-[#8D867C] font-mono">
                        {formatBytes(f.size)} · {formatShortDate(f.lastModified)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {fileUrl && (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-white/10 text-[#5B9BFF]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleR2Delete(f.key)}
                        className="p-1.5 rounded-lg border border-[#F06A7E]/30 text-[#F06A7E]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {r2.folders.length === 0 && r2.files.length === 0 && !r2Loading && (
                <div className="text-[12px] text-[#8D867C] text-center py-6">Папка пуста</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

