import React, { useCallback, useEffect, useState } from 'react';
import {
  FileCode2,
  GitCommitHorizontal,
  Play,
  RefreshCw,
  Workflow,
} from 'lucide-react';
import { formatShortDate } from './types';

type GhSub = 'commits' | 'actions';

type GhCommitItem = {
  sha: string;
  message: string;
  author: string;
  date: string;
};

type GhCommitFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
};

type GhWorkflowItem = {
  id: number;
  name: string;
  state: string;
  path: string;
};

type GhRunItem = {
  id: number;
  name: string;
  status: string;
  conclusion: string;
  branch: string;
  createdAt: string;
};

type GhOverview = {
  configured: boolean;
  missing: string[];
  repos: string[];
  activeRepo: string;
  commits: GhCommitItem[];
  workflows: GhWorkflowItem[];
  runs: GhRunItem[];
  error?: string;
};

type GitHubOpsPanelProps = {
  buildAuthHeaders: () => Record<string, string>;
  showToast: (msg: string) => void;
};

function runBadge(status: string, conclusion: string): string {
  const s = (conclusion || status).toLowerCase();
  if (s === 'success') return 'border-[#3FD08F]/40 bg-[#3FD08F]/15 text-[#3FD08F]';
  if (s === 'failure' || s === 'cancelled') return 'border-[#F06A7E]/45 bg-[#F06A7E]/15 text-[#F06A7E]';
  return 'border-[#C9A86A]/45 bg-[#C9A86A]/15 text-[#C9A86A]';
}

export const GitHubOpsPanel: React.FC<GitHubOpsPanelProps> = ({
  buildAuthHeaders,
  showToast,
}) => {
  const [sub, setSub] = useState<GhSub>('commits');
  const [repo, setRepo] = useState<string>('');
  const [data, setData] = useState<GhOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [openSha, setOpenSha] = useState<string>('');
  const [commitFiles, setCommitFiles] = useState<GhCommitFile[]>([]);
  const [filesLoading, setFilesLoading] = useState<boolean>(false);
  const [dispatchingId, setDispatchingId] = useState<number>(0);

  const fetchOverview = useCallback(
    async (targetRepo = '') => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ action: 'github-ops' });
        if (targetRepo) qs.set('repo', targetRepo);
        const r = await fetch(`/api/check-purchase?${qs.toString()}`, {
          headers: buildAuthHeaders(),
        });
        const json = (await r.json()) as GhOverview & { ok?: boolean; error?: string };
        if (r.ok && json.ok) {
          setData(json);
          if (json.activeRepo) setRepo(json.activeRepo);
        } else {
          showToast(json.error || 'Ошибка загрузки GitHub');
        }
      } catch {
        showToast('Ошибка сети GitHub API');
      } finally {
        setLoading(false);
      }
    },
    [buildAuthHeaders, showToast],
  );

  useEffect(() => {
    if (!data) fetchOverview('');
  }, [data, fetchOverview]);

  const handleToggleCommitFiles = async (sha: string) => {
    if (openSha === sha) {
      setOpenSha('');
      setCommitFiles([]);
      return;
    }
    setOpenSha(sha);
    setCommitFiles([]);
    setFilesLoading(true);
    try {
      const r = await fetch('/api/check-purchase?action=github-ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ op: 'commit-files', repo, sha }),
      });
      const json = (await r.json()) as { ok?: boolean; files?: GhCommitFile[]; error?: string };
      if (r.ok && json.ok) setCommitFiles(json.files || []);
      else showToast(json.error || 'Не удалось загрузить файлы коммита');
    } catch {
      showToast('Ошибка сети');
    } finally {
      setFilesLoading(false);
    }
  };

  const handleDispatch = async (wf: GhWorkflowItem) => {
    if (!window.confirm(`Запустить workflow «${wf.name}» в ветке main?`)) return;
    setDispatchingId(wf.id);
    try {
      const r = await fetch('/api/check-purchase?action=github-ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ op: 'dispatch', repo, workflowId: wf.id, workflowName: wf.name, ref: 'main' }),
      });
      const json = (await r.json()) as { ok?: boolean; error?: string };
      if (r.ok && json.ok) {
        showToast(`Workflow «${wf.name}» запущен`);
        fetchOverview(repo);
      } else {
        showToast(json.error || 'Не удалось запустить (проверьте workflow_dispatch)');
      }
    } catch {
      showToast('Ошибка сети');
    } finally {
      setDispatchingId(0);
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-6 text-center text-[12px] text-[#8D867C]">
        Загрузка данных GitHub...
      </div>
    );
  }

  if (data && !data.configured) {
    return (
      <div className="rounded-2xl border border-[#C9A86A]/30 bg-[#15130E] p-4 space-y-2 text-[12px]">
        <div className="font-semibold text-[#C9A86A]">
          Добавьте GITHUB_TOKEN в Vercel → Environment Variables (Type: Secret):
        </div>
        <div className="text-[11px] text-[#A8A095]">
          GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens (права: Contents: Read, Actions: Read &amp; Write).
        </div>
      </div>
    );
  }

  const manualWorkflows = (data?.workflows || []).filter((wf) =>
    wf.path.startsWith('.github/workflows/'),
  );

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold truncate">{repo || 'GitHub'}</div>
          <div className="text-[10px] font-mono text-[#8D867C]">
            Коммитов: {data?.commits.length || 0} · Actions: {manualWorkflows.length}
          </div>
        </div>
        <button
          type="button"
          onClick={() => fetchOverview(repo)}
          className="p-1.5 rounded-xl border border-white/10 text-[#C9A86A] shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {data && data.repos.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {data.repos.map((rp) => (
            <button
              key={rp}
              type="button"
              onClick={() => fetchOverview(rp)}
              className={`rounded-lg border px-2 py-1 font-mono text-[10px] ${
                rp === repo
                  ? 'border-[#C9A86A]/55 bg-[#C9A86A]/15 text-[#C9A86A]'
                  : 'border-white/10 bg-[#0F0F0E] text-[#A8A095]'
              }`}
            >
              {rp.split('/').pop()}
            </button>
          ))}
        </div>
      )}

      {data?.error && (
        <div className="rounded-xl border border-[#F06A7E]/35 bg-[#F06A7E]/10 px-3 py-2 text-[11px] text-[#F06A7E]">
          {data.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setSub('commits')}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-[11px] font-semibold ${
            sub === 'commits'
              ? 'bg-[#C9A86A]/20 text-[#C9A86A] border border-[#C9A86A]/45'
              : 'bg-[#0F0F0E] text-[#A8A095] border border-white/[0.07]'
          }`}
        >
          <GitCommitHorizontal className="w-3.5 h-3.5" /> Коммиты
        </button>
        <button
          type="button"
          onClick={() => setSub('actions')}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-[11px] font-semibold ${
            sub === 'actions'
              ? 'bg-[#5B9BFF]/20 text-[#5B9BFF] border border-[#5B9BFF]/45'
              : 'bg-[#0F0F0E] text-[#A8A095] border border-white/[0.07]'
          }`}
        >
          <Workflow className="w-3.5 h-3.5" /> Actions ({data?.runs.length || 0})
        </button>
      </div>

      {sub === 'commits' && (
        <div className="space-y-2">
          {(data?.commits || []).map((c) => (
            <div key={c.sha} className="rounded-xl border border-white/[0.07] bg-[#0F0F0E] p-2.5 space-y-2">
              <button
                type="button"
                onClick={() => handleToggleCommitFiles(c.sha)}
                className="w-full text-left"
              >
                <div className="text-[12px] font-medium text-[#F5F1EB] leading-snug break-words">
                  {c.message}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-[#8D867C] mt-1">
                  <span>{c.sha.slice(0, 7)} · {c.author}</span>
                  <span>{formatShortDate(c.date)}</span>
                </div>
              </button>

              {openSha === c.sha && (
                <div className="rounded-lg border border-white/10 bg-[#080807] p-2 space-y-1">
                  {filesLoading ? (
                    <div className="text-[10px] text-[#8D867C]">Загрузка изменённых файлов...</div>
                  ) : commitFiles.length === 0 ? (
                    <div className="text-[10px] text-[#8D867C]">Файлы не найдены</div>
                  ) : (
                    commitFiles.map((f) => (
                      <div key={f.filename} className="flex items-center justify-between gap-2 text-[10px] font-mono">
                        <span className="inline-flex items-center gap-1 text-[#DED7CC] truncate">
                          <FileCode2 className="w-3 h-3 text-[#C9A86A] shrink-0" /> {f.filename}
                        </span>
                        <span className="shrink-0">
                          <span className="text-[#3FD08F]">+{f.additions}</span>{' '}
                          <span className="text-[#F06A7E]">-{f.deletions}</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sub === 'actions' && (
        <div className="space-y-3">
          {manualWorkflows.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[#A8A095]">Ручной запуск Workflows</div>
              {manualWorkflows.map((wf) => (
                <div
                  key={wf.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-[#0F0F0E] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-[12px] text-[#F5F1EB] truncate">{wf.name}</div>
                    <div className="text-[10px] font-mono text-[#8D867C] truncate">{wf.path}</div>
                  </div>
                  <button
                    type="button"
                    disabled={dispatchingId === wf.id}
                    onClick={() => handleDispatch(wf)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#C9A86A] px-2.5 py-1 text-[11px] font-semibold text-[#121210] shrink-0 disabled:opacity-50"
                  >
                    <Play className="w-3 h-3" /> {dispatchingId === wf.id ? '...' : 'Старт'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-[#A8A095]">Последние запуски</div>
            {(data?.runs || []).length === 0 ? (
              <div className="text-[11px] text-[#8D867C] text-center py-3">Запусков GitHub Actions пока нет</div>
            ) : (
              (data?.runs || []).map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#0F0F0E] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-[12px] text-[#F5F1EB] truncate">{run.name}</div>
                    <div className="text-[10px] font-mono text-[#8D867C]">
                      {run.branch} · {formatShortDate(run.createdAt)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg border px-2 py-0.5 font-mono text-[10px] uppercase ${runBadge(run.status, run.conclusion)}`}
                  >
                    {run.conclusion || run.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
