import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Cloud,
  Copy,
  KeyRound,
  Pause,
  Play,
  RefreshCw,
  Rocket,
  RotateCcw,
  Server,
  Terminal,
} from 'lucide-react';
import { copyTextToClipboard } from './exportUtils';
import { GitHubOpsPanel } from './GitHubOpsPanel';
import { formatShortDate } from './types';

type CloudSub = 'vercel' | 'render' | 'github';

type VercelDeployItem = {
  uid: string;
  name: string;
  url: string;
  state: string;
  target: string;
  created: string;
  commitMsg: string;
  branch: string;
};

type VercelState = {
  configured: boolean;
  missing: string[];
  error?: string;
  projectId: string;
  deployments: VercelDeployItem[];
  envKeys: string[];
};

type RenderDeployItem = {
  id: string;
  status: string;
  trigger: string;
  createdAt: string;
  commitMsg: string;
};

type RenderServiceItem = {
  id: string;
  name: string;
  type: string;
  suspended: string;
  url: string;
  region: string;
  updatedAt: string;
  latestDeploy: RenderDeployItem | null;
};

type RenderState = {
  configured: boolean;
  missing: string[];
  error?: string;
  services: RenderServiceItem[];
};

type WebhookInfo = {
  url: string;
  pendingCount: number;
  lastError: string;
  lastErrorDate: string;
};

type CloudStatusData = {
  vercel: VercelState;
  render: RenderState;
};

type CloudOpsTabProps = {
  buildAuthHeaders: () => Record<string, string>;
  showToast: (msg: string) => void;
};

function badgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === 'READY' || s === 'LIVE' || s === 'NOT_SUSPENDED') {
    return 'border-[#3FD08F]/40 bg-[#3FD08F]/15 text-[#3FD08F]';
  }
  if (s.includes('BUILD') || s.includes('PROGRESS') || s === 'QUEUED' || s === 'INITIALIZING') {
    return 'border-[#C9A86A]/45 bg-[#C9A86A]/15 text-[#C9A86A]';
  }
  if (s.includes('ERR') || s.includes('FAIL')) {
    return 'border-[#F06A7E]/45 bg-[#F06A7E]/15 text-[#F06A7E]';
  }
  return 'border-white/15 bg-white/[0.06] text-[#A8A095]';
}

export const CloudOpsTab: React.FC<CloudOpsTabProps> = ({
  buildAuthHeaders,
  showToast,
}) => {
  const [sub, setSub] = useState<CloudSub>('vercel');
  const [data, setData] = useState<CloudStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string>('');
  const [busyKey, setBusyKey] = useState<string>('');

  // Vercel extras
  const [showEnvs, setShowEnvs] = useState<boolean>(false);
  const [logsUid, setLogsUid] = useState<string>('');
  const [logsLines, setLogsLines] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);

  // Render extras: deploys, live logs, Telegram webhook
  const [deploysSvcId, setDeploysSvcId] = useState<string>('');
  const [deploysList, setDeploysList] = useState<RenderDeployItem[]>([]);
  const [deploysLoading, setDeploysLoading] = useState<boolean>(false);

  const [rLogsSvcId, setRLogsSvcId] = useState<string>('');
  const [rLogsLines, setRLogsLines] = useState<string[]>([]);
  const [rLogsLoading, setRLogsLoading] = useState<boolean>(false);

  const [webhook, setWebhook] = useState<WebhookInfo | null>(null);
  const [webhookLoading, setWebhookLoading] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await fetch('/api/check-purchase?action=cloud-status', {
        headers: buildAuthHeaders(),
      });
      const json = (await r.json()) as CloudStatusData & { ok?: boolean; error?: string };
      if (!r.ok || !json.ok) {
        setErr(json.error || 'Не удалось загрузить статус Cloud');
      } else {
        setData({ vercel: json.vercel, render: json.render });
      }
    } catch {
      setErr('Ошибка сети при обращении к Cloud API');
    } finally {
      setLoading(false);
    }
  }, [buildAuthHeaders]);

  useEffect(() => {
    if (!data) fetchStatus();
  }, [data, fetchStatus]);

  const handleVercelRedeploy = async (dep: VercelDeployItem) => {
    if (!window.confirm(`Пересобрать прод Vercel на основе «${dep.commitMsg || dep.uid}»?`)) return;
    setBusyKey(`redeploy:${dep.uid}`);
    try {
      const r = await fetch('/api/check-purchase?action=vercel-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ op: 'redeploy', deploymentId: dep.uid, name: dep.name }),
      });
      const json = (await r.json()) as { ok?: boolean; error?: string };
      if (r.ok && json.ok) {
        showToast('Redeploy запущен в Vercel');
        fetchStatus();
      } else {
        showToast(json.error || 'Ошибка запуска Redeploy');
      }
    } catch {
      showToast('Ошибка сети');
    } finally {
      setBusyKey('');
    }
  };

  const handleVercelLogs = async (uid: string) => {
    if (logsUid === uid) {
      setLogsUid('');
      setLogsLines([]);
      return;
    }
    setLogsUid(uid);
    setLogsLines([]);
    setLogsLoading(true);
    try {
      const r = await fetch('/api/check-purchase?action=vercel-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ op: 'logs', deploymentId: uid }),
      });
      const json = (await r.json()) as { ok?: boolean; lines?: string[]; error?: string };
      if (r.ok && json.ok) setLogsLines(json.lines || []);
      else showToast(json.error || 'Не удалось загрузить логи');
    } catch {
      showToast('Ошибка сети');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRenderAction = async (
    svc: RenderServiceItem,
    op: 'restart' | 'deploy' | 'suspend' | 'resume',
    label: string,
  ) => {
    if (!window.confirm(`${label} сервис «${svc.name}» в Render?`)) return;
    setBusyKey(`render:${svc.id}:${op}`);
    try {
      const r = await fetch('/api/check-purchase?action=render-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ op, serviceId: svc.id, serviceName: svc.name }),
      });
      const json = (await r.json()) as { ok?: boolean; error?: string };
      if (r.ok && json.ok) {
        showToast(`${svc.name}: ${label} выполнен`);
        fetchStatus();
      } else {
        showToast(json.error || `Ошибка Render (${label})`);
      }
    } catch {
      showToast('Ошибка сети');
    } finally {
      setBusyKey('');
    }
  };

  const handleToggleRenderDeploys = async (svcId: string) => {
    if (deploysSvcId === svcId) {
      setDeploysSvcId('');
      setDeploysList([]);
      return;
    }
    setDeploysSvcId(svcId);
    setRLogsSvcId('');
    setDeploysList([]);
    setDeploysLoading(true);
    try {
      const r = await fetch('/api/check-purchase?action=render-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ op: 'deploys', serviceId: svcId }),
      });
      const json = (await r.json()) as { ok?: boolean; deploys?: RenderDeployItem[]; error?: string };
      if (r.ok && json.ok) setDeploysList(json.deploys || []);
      else showToast(json.error || 'Не удалось загрузить деплои');
    } catch {
      showToast('Ошибка сети');
    } finally {
      setDeploysLoading(false);
    }
  };

  const handleToggleRenderLogs = async (svcId: string) => {
    if (rLogsSvcId === svcId) {
      setRLogsSvcId('');
      setRLogsLines([]);
      return;
    }
    setRLogsSvcId(svcId);
    setDeploysSvcId('');
    setRLogsLines([]);
    setRLogsLoading(true);
    try {
      const r = await fetch('/api/check-purchase?action=render-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ op: 'logs', serviceId: svcId }),
      });
      const json = (await r.json()) as { ok?: boolean; lines?: string[]; error?: string };
      if (r.ok && json.ok) setRLogsLines(json.lines || []);
      else showToast(json.error || 'Не удалось загрузить логи Render');
    } catch {
      showToast('Ошибка сети');
    } finally {
      setRLogsLoading(false);
    }
  };

  const handleCheckWebhook = async () => {
    setWebhookLoading(true);
    try {
      const r = await fetch('/api/check-purchase?action=render-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ op: 'webhook', serviceId: 'bot' }),
      });
      const json = (await r.json()) as { ok?: boolean; webhook?: WebhookInfo; error?: string };
      if (r.ok && json.ok && json.webhook) setWebhook(json.webhook);
      else showToast(json.error || 'Не удалось проверить вебхук');
    } catch {
      showToast('Ошибка сети');
    } finally {
      setWebhookLoading(false);
    }
  };

  const latestProd = data?.vercel.deployments.find((d) => d.target === 'production') || data?.vercel.deployments[0];

  return (
    <div className="space-y-3">
      {/* 3-way sub-switcher: Vercel / Render / GitHub */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => setSub('vercel')}
          className={`rounded-xl border py-2 text-[11px] font-semibold transition ${
            sub === 'vercel'
              ? 'border-[#C9A86A]/55 bg-[#C9A86A]/15 text-[#C9A86A]'
              : 'border-white/[0.07] bg-[#141412] text-[#A8A095]'
          }`}
        >
          ▲ Vercel {data?.vercel.deployments.length ? `(${data.vercel.deployments.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setSub('render')}
          className={`rounded-xl border py-2 text-[11px] font-semibold transition ${
            sub === 'render'
              ? 'border-[#C9A86A]/55 bg-[#C9A86A]/15 text-[#C9A86A]'
              : 'border-white/[0.07] bg-[#141412] text-[#A8A095]'
          }`}
        >
          ⚡ Render {data?.render.services.length ? `(${data.render.services.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setSub('github')}
          className={`rounded-xl border py-2 text-[11px] font-semibold transition ${
            sub === 'github'
              ? 'border-[#C9A86A]/55 bg-[#C9A86A]/15 text-[#C9A86A]'
              : 'border-white/[0.07] bg-[#141412] text-[#A8A095]'
          }`}
        >
          🐙 GitHub
        </button>
      </div>

      {err && sub !== 'github' && (
        <div className="rounded-xl border border-[#F06A7E]/35 bg-[#F06A7E]/10 px-3 py-2 text-[12px] text-[#F06A7E]">
          {err}
        </div>
      )}

      {loading && !data && sub !== 'github' && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-6 text-center text-[12px] text-[#8D867C]">
          Загрузка статусов Vercel и Render...
        </div>
      )}

      {/* VERCEL PANEL */}
      {sub === 'vercel' && data && (
        <div className="space-y-3">
          {!data.vercel.configured ? (
            <div className="rounded-2xl border border-[#C9A86A]/30 bg-[#15130E] p-4 space-y-2 text-[12px]">
              <div className="font-semibold text-[#C9A86A]">
                Добавьте переменные Vercel в Environment Variables:
              </div>
              <div className="font-mono text-[11px] space-y-1 text-[#E7E1D7]">
                {data.vercel.missing.map((k) => (
                  <div key={k}>• {k}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Cloud className="w-4 h-4 text-[#C9A86A] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold truncate">Vercel Deployments</div>
                    <div className="text-[11px] font-mono text-[#8D867C] truncate">
                      {data.vercel.projectId}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {latestProd && (
                    <button
                      type="button"
                      disabled={Boolean(busyKey)}
                      onClick={() => handleVercelRedeploy(latestProd)}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#C9A86A] px-2.5 py-1.5 text-[11px] font-semibold text-[#121210] disabled:opacity-50"
                    >
                      <Rocket className="w-3.5 h-3.5" /> Redeploy
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={fetchStatus}
                    className="p-1.5 rounded-xl border border-white/10 text-[#C9A86A]"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {data.vercel.error && (
                <div className="rounded-xl border border-[#F06A7E]/35 bg-[#F06A7E]/10 px-3 py-2 text-[11px] text-[#F06A7E]">
                  {data.vercel.error}
                </div>
              )}

              {data.vercel.envKeys.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowEnvs((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-[11px] text-[#A8A095] hover:text-[#F5F1EB]"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#C9A86A]" />
                    Переменные окружения ({data.vercel.envKeys.length})
                    {showEnvs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {showEnvs && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {data.vercel.envKeys.map((k) => (
                        <span
                          key={k}
                          className="rounded-lg border border-white/[0.08] bg-[#0F0F0E] px-2 py-0.5 font-mono text-[10px] text-[#DED7CC]"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {data.vercel.deployments.map((d) => (
                  <div
                    key={d.uid}
                    className="rounded-xl border border-white/[0.07] bg-[#0F0F0E] p-2.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium text-[#F5F1EB] break-words leading-snug">
                          {d.commitMsg || d.name}
                        </div>
                        <div className="text-[10px] font-mono text-[#8D867C] mt-0.5">
                          {d.branch || 'main'} · {d.target || 'preview'} · {formatShortDate(d.created)}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg border px-2 py-0.5 font-mono text-[10px] font-semibold ${badgeClass(d.state)}`}
                      >
                        {d.state}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleVercelLogs(d.uid)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-[#DED7CC]"
                      >
                        <Terminal className="w-3 h-3 text-[#5B9BFF]" />
                        {logsUid === d.uid ? 'Скрыть логи' : 'Логи'}
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(busyKey)}
                        onClick={() => handleVercelRedeploy(d)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#C9A86A]/35 px-2 py-1 text-[11px] text-[#C9A86A] disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" /> Повторить
                      </button>
                      {logsUid === d.uid && logsLines.length > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            await copyTextToClipboard(logsLines.join('\n'));
                            showToast('Лог скопирован');
                          }}
                          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-[#A8A095]"
                        >
                          <Copy className="w-3 h-3" /> Копировать
                        </button>
                      )}
                    </div>

                    {logsUid === d.uid && (
                      <div className="rounded-lg border border-white/10 bg-[#080807] p-2 font-mono text-[10px] text-[#CFC8BC] max-h-48 overflow-y-auto space-y-0.5">
                        {logsLoading ? (
                          <div className="text-[#8D867C]">Загрузка логов сборки...</div>
                        ) : logsLines.length === 0 ? (
                          <div className="text-[#8D867C]">Строк лога не найдено</div>
                        ) : (
                          logsLines.map((line, i) => (
                            <div key={i} className="break-all leading-relaxed">
                              {line}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER PANEL */}
      {sub === 'render' && data && (
        <div className="space-y-3">
          {/* Telegram Bot Webhook Health */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12px] font-semibold">
                <Activity className="w-4 h-4 text-[#3FD08F]" /> Вебхук Telegram-бота
              </div>
              <button
                type="button"
                disabled={webhookLoading}
                onClick={handleCheckWebhook}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-[#C9A86A]"
              >
                {webhookLoading ? 'Проверка...' : 'Проверить'}
              </button>
            </div>
            {webhook && (
              <div className="rounded-xl border border-white/[0.06] bg-[#0F0F0E] p-2.5 space-y-1 font-mono text-[10px]">
                <div className="flex justify-between gap-2">
                  <span className="text-[#8D867C]">Режим:</span>
                  <span className="text-[#F5F1EB] truncate">{webhook.url || 'Polling (webhook не задан)'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#8D867C]">В очереди:</span>
                  <span className={webhook.pendingCount > 0 ? 'text-[#C9A86A]' : 'text-[#3FD08F]'}>
                    {webhook.pendingCount}
                  </span>
                </div>
                {webhook.lastError && (
                  <div className="text-[#F06A7E] pt-1 break-words">
                    Ошибка ({webhook.lastErrorDate ? formatShortDate(webhook.lastErrorDate) : ''}): {webhook.lastError}
                  </div>
                )}
              </div>
            )}
          </div>

          {!data.render.configured ? (
            <div className="rounded-2xl border border-[#C9A86A]/30 bg-[#15130E] p-4 space-y-2 text-[12px]">
              <div className="font-semibold text-[#C9A86A]">
                Добавьте переменную RENDER_API_KEY в Vercel → Environment Variables
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#C9A86A]" />
                  <div className="text-[13px] font-semibold">
                    Сервисы Render ({data.render.services.length})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchStatus}
                  className="p-1.5 rounded-xl border border-white/10 text-[#C9A86A]"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {data.render.error && (
                <div className="rounded-xl border border-[#F06A7E]/35 bg-[#F06A7E]/10 px-3 py-2 text-[11px] text-[#F06A7E]">
                  {data.render.error}
                </div>
              )}

              <div className="space-y-2.5">
                {data.render.services.map((svc) => {
                  const isSuspended = svc.suspended === 'suspended';
                  const stLabel = isSuspended
                    ? 'SUSPENDED'
                    : (svc.latestDeploy?.status || 'LIVE').toUpperCase();

                  return (
                    <div
                      key={svc.id}
                      className="rounded-xl border border-white/[0.07] bg-[#0F0F0E] p-3 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-[#F5F1EB] truncate">
                            {svc.name}
                          </div>
                          <div className="text-[10px] font-mono text-[#8D867C]">
                            {svc.type} {svc.region ? `· ${svc.region}` : ''} · {formatShortDate(svc.updatedAt)}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-lg border px-2 py-0.5 font-mono text-[10px] font-semibold ${badgeClass(stLabel)}`}
                        >
                          {stLabel}
                        </span>
                      </div>

                      {svc.latestDeploy?.commitMsg && (
                        <div className="text-[11px] text-[#BDB6AC] truncate">
                          Последний деплой: {svc.latestDeploy.commitMsg}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          disabled={Boolean(busyKey) || isSuspended}
                          onClick={() => handleRenderAction(svc, 'restart', 'Перезапустить')}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/15 py-1.5 px-2 text-[11px] text-[#F5F1EB] disabled:opacity-40"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#5B9BFF]" /> Restart
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(busyKey) || isSuspended}
                          onClick={() => handleRenderAction(svc, 'deploy', 'Задеплоить')}
                          className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#C9A86A] py-1.5 px-2 text-[11px] font-semibold text-[#121210] disabled:opacity-40"
                        >
                          <Rocket className="w-3.5 h-3.5" /> Deploy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleRenderLogs(svc.id)}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 py-1.5 px-2 text-[11px] text-[#DED7CC]"
                        >
                          <Terminal className="w-3.5 h-3.5 text-[#5B9BFF]" />
                          {rLogsSvcId === svc.id ? 'Скрыть логи' : 'Логи бота'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleRenderDeploys(svc.id)}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 py-1.5 px-2 text-[11px] text-[#DED7CC]"
                        >
                          <Server className="w-3.5 h-3.5 text-[#C9A86A]" />
                          {deploysSvcId === svc.id ? 'Скрыть' : 'Деплои'}
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={Boolean(busyKey)}
                        onClick={() =>
                          handleRenderAction(
                            svc,
                            isSuspended ? 'resume' : 'suspend',
                            isSuspended ? 'Запустить' : 'Остановить',
                          )
                        }
                        className={`w-full inline-flex items-center justify-center gap-1 rounded-xl border py-1.5 px-2 text-[11px] disabled:opacity-40 ${
                          isSuspended
                            ? 'border-[#3FD08F]/40 bg-[#3FD08F]/10 text-[#3FD08F]'
                            : 'border-[#F06A7E]/35 bg-[#F06A7E]/10 text-[#F06A7E]'
                        }`}
                      >
                        {isSuspended ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        {isSuspended ? 'Resume (Запустить)' : 'Suspend (Остановить)'}
                      </button>

                      {rLogsSvcId === svc.id && (
                        <div className="rounded-lg border border-white/10 bg-[#080807] p-2 font-mono text-[10px] text-[#CFC8BC] max-h-48 overflow-y-auto space-y-0.5">
                          {rLogsLoading ? (
                            <div className="text-[#8D867C]">Загрузка живых логов Render...</div>
                          ) : rLogsLines.length === 0 ? (
                            <div className="text-[#8D867C]">Свежих строк лога нет</div>
                          ) : (
                            rLogsLines.map((line, idx) => (
                              <div key={idx} className="break-all leading-relaxed">
                                {line}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {deploysSvcId === svc.id && (
                        <div className="rounded-lg border border-white/10 bg-[#080807] p-2 space-y-1.5">
                          {deploysLoading ? (
                            <div className="text-[11px] text-[#8D867C]">Загрузка деплоев...</div>
                          ) : deploysList.length === 0 ? (
                            <div className="text-[11px] text-[#8D867C]">История деплоев пуста</div>
                          ) : (
                            deploysList.map((dep) => (
                              <div key={dep.id} className="flex items-center justify-between gap-2 text-[10px] font-mono">
                                <span className="text-[#DED7CC] truncate">
                                  {dep.commitMsg || dep.trigger || dep.id}
                                </span>
                                <span className="shrink-0 text-[#8D867C]">
                                  {dep.status} · {formatShortDate(dep.createdAt)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GITHUB PANEL */}
      {sub === 'github' && (
        <GitHubOpsPanel buildAuthHeaders={buildAuthHeaders} showToast={showToast} />
      )}
    </div>
  );
};
