import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  Copy,
  Database,
  ExternalLink,
  Folder,
  HardDrive,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { copyTextToClipboard } from './exportUtils';
import { NeonQuickCommands } from './NeonQuickCommands';
import { NeonTableBrowser, type NeonTableSummary } from './NeonTableBrowser';
import { NeonVisualBuilder } from './NeonVisualBuilder';
import type { HealthData } from './types';
import { formatShortDate } from './types';

type SubTab = 'health' | 'neon' | 'r2';
type NeonMode = 'commands' | 'tables' | 'builder';

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

export const AdminSystemTab: React.FC<AdminSystemTabProps> = ({
  authMode,
  buildAuthHeaders,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('health');
  const [neonMode, setNeonMode] = useState<NeonMode>('commands');

  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);
  const [mintingLink, setMintingLink] = useState<boolean>(false);

  // Neon metadata
  const [dbSize, setDbSize] = useState<string>('—');
  const [dbBytes, setDbBytes] = useState<number>(0);
  const [activeConns, setActiveConns] = useState<number>(1);
  const [cacheHitPct, setCacheHitPct] = useState<number>(100);
  const [tables, setTables] = useState<NeonTableSummary[]>([]);
  const [tablesLoading, setTablesLoading] = useState<boolean>(false);

  // R2 state
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
      const data = (await r.json()) as {
        ok?: boolean;
        dbSize?: string;
        dbBytes?: number;
        activeConns?: number;
        cacheHitPct?: number;
        tables?: NeonTableSummary[];
      };
      if (r.ok && data.ok) {
        setDbSize(data.dbSize || '—');
        setDbBytes(data.dbBytes || 0);
        setActiveConns(data.activeConns || 1);
        setCacheHitPct(data.cacheHitPct ?? 100);
        setTables(data.tables || []);
      }
    } catch {
      showToast('Не удалось загрузить таблицы Neon');
    } finally {
      setTablesLoading(false);
    }
  }, [buildAuthHeaders, showToast]);

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
        if (!r.ok || !data.ok) setR2Error(data.error || 'Ошибка загрузки R2');
        else {
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
        showToast('Ошибка загрузки в R2 (проверьте CORS)');
        return;
      }
      showToast(`Загружено: ${safeName}`);
      fetchR2(r2Prefix);
    } catch {
      showToast('Загрузка заблокирована CORS в R2');
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

  const parentPrefix = r2Prefix ? r2Prefix.replace(/[^/]+\/$/, '') : '';

  return (
    <div className="space-y-3">
      {/* Main Sub-tab Switcher */}
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/[0.08] bg-[#141412] p-1">
        {(
          [
            { id: 'health', label: 'Обзор' },
            { id: 'neon', label: 'Neon Studio' },
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

      {/* 1. HEALTH & CHROME */}
      {subTab === 'health' && (
        <div className="space-y-3">
          {authMode === 'telegram' && (
            <div className="rounded-2xl border border-[#C9A86A]/35 bg-[#15130E] p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ExternalLink className="w-4 h-4 text-[#C9A86A] shrink-0 mt-0.5" />
                <div>
                  <div className="text-[14px] font-semibold text-[#F5F1EB]">Вход с ПК / Chrome</div>
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
                Активна 12-часовая крипто-сессия в браузере. Доступны прямое скачивание бэкапов CSV/JSON, печать PDF и загрузка файлов в R2.
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. NEON STUDIO (ALL 5 MODULES) */}
      {subTab === 'neon' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'commands', label: '⚡ Команды' },
                { id: 'tables', label: '📋 Таблицы' },
                { id: 'builder', label: '🧩 Конструктор' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setNeonMode(m.id)}
                className={`rounded-xl border py-2 text-[12px] font-semibold transition ${
                  neonMode === m.id
                    ? 'border-[#C9A86A]/55 bg-[#C9A86A]/15 text-[#C9A86A]'
                    : 'border-white/[0.07] bg-[#141412] text-[#A8A095]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {neonMode === 'commands' && (
            <NeonQuickCommands buildAuthHeaders={buildAuthHeaders} showToast={showToast} />
          )}

          {neonMode === 'tables' && (
            <NeonTableBrowser
              dbSize={dbSize}
              dbBytes={dbBytes}
              activeConns={activeConns}
              cacheHitPct={cacheHitPct}
              tables={tables}
              tablesLoading={tablesLoading}
              onRefreshTables={fetchTables}
              buildAuthHeaders={buildAuthHeaders}
              showToast={showToast}
            />
          )}

          {neonMode === 'builder' && (
            <NeonVisualBuilder
              tables={tables.map((t) => t.name)}
              buildAuthHeaders={buildAuthHeaders}
              showToast={showToast}
            />
          )}
        </div>
      )}

      {/* 3. CLOUDFLARE R2 */}
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
