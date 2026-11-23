import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Copy, Database, ExternalLink } from 'lucide-react';
import { copyTextToClipboard } from './exportUtils';
import { NeonQuickCommands } from './NeonQuickCommands';
import { NeonTableBrowser, type NeonTableSummary } from './NeonTableBrowser';
import { NeonVisualBuilder } from './NeonVisualBuilder';
import { R2StudioTab } from './R2StudioTab';
import type { HealthData } from './types';
import { formatShortDate } from './types';

type SubTab = 'health' | 'neon' | 'r2';
type NeonMode = 'commands' | 'tables' | 'builder';

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

  const [dbSize, setDbSize] = useState<string>('—');
  const [dbBytes, setDbBytes] = useState<number>(0);
  const [activeConns, setActiveConns] = useState<number>(1);
  const [cacheHitPct, setCacheHitPct] = useState<number>(100);
  const [tables, setTables] = useState<NeonTableSummary[]>([]);
  const [tablesLoading, setTablesLoading] = useState<boolean>(false);

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
  }, [subTab, fetchHealth, fetchTables, tables.length]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/[0.08] bg-[#141412] p-1">
        {(
          [
            { id: 'health', label: 'Обзор' },
            { id: 'neon', label: 'Neon Studio' },
            { id: 'r2', label: 'R2 Studio' },
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

      {subTab === 'r2' && (
        <R2StudioTab buildAuthHeaders={buildAuthHeaders} showToast={showToast} />
      )}
    </div>
  );
};
