import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart2,
  Copy,
  Eye,
  Folder,
  FolderPlus,
  HardDrive,
  RefreshCw,
  Replace,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { copyTextToClipboard } from './exportUtils';
import { DARK_INPUT_STYLE, formatShortDate } from './types';

type R2Mode = 'files' | 'analytics';
type TopKind = 'largest' | 'newest';

type R2FileItem = {
  key: string;
  size: number;
  lastModified: string;
};

type R2FileList = R2FileItem[];

type R2ListState = {
  configured: boolean;
  missing: string[];
  bucket: string;
  publicUrl: string;
  prefix: string;
  searchTotal?: number;
  totalSize: number;
  folders: string[];
  files: R2FileList;
  isTruncated: boolean;
  nextToken: string;
};

type R2StatsData = {
  ms: number;
  bucket: string;
  totalFiles: number;
  totalBytes: number;
  formats: Array<{ ext: string; count: number; bytes: number }>;
  largest: R2FileList;
  newest: R2FileList;
};

type PreviewFileState = {
  file: R2FileItem;
  signedUrl: string;
  loading: boolean;
};

type R2StudioTabProps = {
  buildAuthHeaders: () => Record<string, string>;
  showToast: (msg: string) => void;
};

const R2_FREE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isImageKey(key: string): boolean {
  return /\.(webp|jpe?g|png|gif|avif|svg)$/i.test(key);
}

export const R2StudioTab: React.FC<R2StudioTabProps> = ({
  buildAuthHeaders,
  showToast,
}) => {
  const [mode, setMode] = useState<R2Mode>('files');
  const [r2, setR2] = useState<R2ListState | null>(null);
  const [prefix, setPrefix] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [err, setErr] = useState<string>('');

  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [showNewFolder, setShowNewFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  // Private preview modal
  const [preview, setPreview] = useState<PreviewFileState | null>(null);
  const [replacing, setReplacing] = useState<boolean>(false);

  // Analytics tab
  const [stats, setStats] = useState<R2StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [topKind, setTopKind] = useState<TopKind>('largest');

  const fetchList = useCallback(
    async (nextPrefix: string, qSearch = '', appendToken = '') => {
      if (appendToken) setLoadingMore(true);
      else setLoading(true);
      setErr('');

      try {
        const qs = new URLSearchParams({ action: 'r2-list', prefix: nextPrefix });
        if (qSearch.trim()) qs.set('search', qSearch.trim());
        if (appendToken) qs.set('token', appendToken);

        const r = await fetch(`/api/check-purchase?${qs.toString()}`, {
          headers: buildAuthHeaders(),
        });
        const data = (await r.json()) as R2ListState & { ok?: boolean; error?: string };
        if (!r.ok || !data.ok) {
          setErr(data.error || 'Ошибка загрузки R2');
        } else if (appendToken && r2) {
          setR2({
            ...data,
            folders: r2.folders,
            files: [...r2.files, ...data.files],
            totalSize: r2.totalSize + data.totalSize,
          });
        } else {
          setR2(data);
          setPrefix(nextPrefix);
        }
      } catch {
        setErr('Ошибка сети при обращении к R2');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildAuthHeaders, r2],
  );

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setErr('');
    try {
      const r = await fetch('/api/check-purchase?action=r2-stats', {
        method: 'POST',
        headers: buildAuthHeaders(),
      });
      const data = (await r.json()) as R2StatsData & { ok?: boolean; error?: string };
      if (!r.ok || !data.ok) setErr(data.error || 'Ошибка сканирования R2');
      else setStats(data);
    } catch {
      setErr('Ошибка сети');
    } finally {
      setStatsLoading(false);
    }
  }, [buildAuthHeaders]);

  useEffect(() => {
    if (!r2) fetchList('');
  }, [r2, fetchList]);

  useEffect(() => {
    if (mode === 'analytics' && !stats && r2?.configured) {
      fetchStats();
    }
  }, [mode, stats, r2?.configured, fetchStats]);

  const openPrivatePreview = async (file: R2FileItem) => {
    setPreview({ file, signedUrl: '', loading: true });
    try {
      const r = await fetch(`/api/check-purchase?action=r2-view&key=${encodeURIComponent(file.key)}`, {
        headers: buildAuthHeaders(),
      });
      const data = (await r.json()) as { ok?: boolean; url?: string; error?: string };
      if (r.ok && data.ok && data.url) {
        setPreview({ file, signedUrl: data.url, loading: false });
      } else {
        setPreview({ file, signedUrl: '', loading: false });
        showToast(data.error || 'Не удалось получить ссылку превью');
      }
    } catch {
      setPreview({ file, signedUrl: '', loading: false });
      showToast('Ошибка сети');
    }
  };

  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = '';
    if (fileList.length === 0) return;

    let okCount = 0;
    for (let i = 0; i < fileList.length; i += 1) {
      const file = fileList[i];
      setUploadProgress(`${i + 1}/${fileList.length}`);
      try {
        const cleanName = file.name.replace(/\s+/g, '_');
        const targetKey = `${prefix}${cleanName}`;
        const r = await fetch('/api/check-purchase?action=r2-presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
          body: JSON.stringify({ key: targetKey }),
        });
        const data = (await r.json()) as { ok?: boolean; uploadUrl?: string };
        if (!r.ok || !data.ok || !data.uploadUrl) continue;

        const putResp = await fetch(data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });
        if (putResp.ok) okCount += 1;
      } catch {
        // continue next file
      }
    }

    setUploadProgress('');
    showToast(okCount > 0 ? `Загружено файлов: ${okCount} из ${fileList.length}` : 'Ошибка загрузки (проверьте CORS)');
    if (okCount > 0) fetchList(prefix, search);
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !preview) return;

    setReplacing(true);
    try {
      const targetKey = preview.file.key;
      const r = await fetch('/api/check-purchase?action=r2-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ key: targetKey }),
      });
      const data = (await r.json()) as { ok?: boolean; uploadUrl?: string; error?: string };
      if (!r.ok || !data.ok || !data.uploadUrl) {
        showToast(data.error || 'Не удалось получить ссылку замены');
        return;
      }
      const putResp = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!putResp.ok) {
        showToast('Ошибка замены файла в R2');
        return;
      }
      showToast('Файл успешно заменён (ссылка в Neon сохранена)');
      openPrivatePreview({ ...preview.file, size: file.size, lastModified: new Date().toISOString() });
      fetchList(prefix, search);
    } catch {
      showToast('Ошибка сети при замене');
    } finally {
      setReplacing(false);
    }
  };

  const handleDeleteKey = async (key: string) => {
    if (!window.confirm(`Удалить «${key}» из Cloudflare R2 навсегда?`)) return;
    try {
      const r = await fetch('/api/check-purchase?action=r2-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ key }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (r.ok && data.ok) {
        showToast('Файл удалён из R2');
        if (preview?.file.key === key) setPreview(null);
        fetchList(prefix, search);
      } else {
        showToast(data.error || 'Не удалось удалить файл');
      }
    } catch {
      showToast('Ошибка сети');
    }
  };

  const handleEnterNewFolder = () => {
    const clean = newFolderName.trim().replace(/^\/+|\/+$/g, '').replace(/\s+/g, '-');
    if (!clean) return;
    const next = `${prefix}${clean}/`;
    setShowNewFolder(false);
    setNewFolderName('');
    setSearch('');
    fetchList(next, '');
  };

  const parentPrefix = prefix ? prefix.replace(/[^/]+\/$/, '') : '';
  const quotaPct = stats ? Math.min(100, Math.max(0.5, Number(((stats.totalBytes / R2_FREE_LIMIT_BYTES) * 100).toFixed(1)))) : 0;

  return (
    <div className="space-y-3">
      {/* Sub-mode switcher */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setMode('files')}
          className={`rounded-xl border py-2 text-[12px] font-semibold transition ${
            mode === 'files'
              ? 'border-[#C9A86A]/55 bg-[#C9A86A]/15 text-[#C9A86A]'
              : 'border-white/[0.07] bg-[#141412] text-[#A8A095]'
          }`}
        >
          📁 Файлы бакета
        </button>
        <button
          type="button"
          onClick={() => setMode('analytics')}
          className={`rounded-xl border py-2 text-[12px] font-semibold transition ${
            mode === 'analytics'
              ? 'border-[#C9A86A]/55 bg-[#C9A86A]/15 text-[#C9A86A]'
              : 'border-white/[0.07] bg-[#141412] text-[#A8A095]'
          }`}
        >
          📊 Лимит 10 ГБ и ТОП
        </button>
      </div>

      {err && (
        <div className="rounded-xl border border-[#F06A7E]/35 bg-[#F06A7E]/10 px-3 py-2 text-[12px] text-[#F06A7E]">
          {err}
        </div>
      )}

      {r2 && !r2.configured && (
        <div className="rounded-2xl border border-[#C9A86A]/30 bg-[#15130E] p-4 space-y-2 text-[12px]">
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

      {/* MODE 1: FILES BROWSER */}
      {mode === 'files' && r2?.configured && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <HardDrive className="w-4 h-4 text-[#C9A86A] shrink-0" />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold truncate">
                  {r2.bucket} {prefix ? `/ ${prefix}` : ''}
                </div>
                <div className="text-[11px] text-[#8D867C] font-mono">
                  {r2.searchTotal !== undefined
                    ? `Найдено: ${r2.searchTotal} (показано ${r2.files.length})`
                    : `Показано: ${r2.files.length} · ${formatBytes(r2.totalSize)}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                onChange={handleMultiUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={Boolean(uploadProgress)}
                onClick={() => uploadInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-xl bg-[#C9A86A] px-2.5 py-1.5 text-[12px] font-semibold text-[#121210] disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploadProgress ? uploadProgress : 'Загрузить'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewFolder((v) => !v)}
                title="Новая папка"
                className="p-1.5 rounded-xl border border-white/10 text-[#DED7CC]"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fetchList(prefix, search)}
                className="p-1.5 rounded-xl border border-white/10 text-[#C9A86A]"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {showNewFolder && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Имя папки (например: banners)"
                style={DARK_INPUT_STYLE}
                className="flex-1 rounded-xl border border-white/15 px-3 py-1.5 text-[12px] focus:outline-none focus:border-[#C9A86A]"
              />
              <button
                type="button"
                onClick={handleEnterNewFolder}
                className="rounded-xl bg-white/10 px-3 py-1.5 text-[12px] text-[#F5F1EB]"
              >
                Открыть
              </button>
            </div>
          )}

          {/* Global search inside current folder */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchList(prefix, search);
              }}
              placeholder="Поиск по всем 4.2k файлам (nike, 1460, givenchy)..."
              style={DARK_INPUT_STYLE}
              className="w-full rounded-xl border border-white/15 pl-3 pr-9 py-2 text-[12px] focus:outline-none focus:border-[#C9A86A]"
            />
            <button
              type="button"
              onClick={() => fetchList(prefix, search)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#C9A86A]"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {prefix && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                fetchList(parentPrefix, '');
              }}
              className="text-[12px] font-mono text-[#C9A86A]"
            >
              ← Назад ({prefix})
            </button>
          )}

          <div className="space-y-1.5">
            {r2.folders.map((folder) => (
              <button
                key={folder}
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchList(folder, '');
                }}
                className="w-full flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0F0F0E] px-3 py-2 text-left"
              >
                <span className="flex items-center gap-2 text-[13px] text-[#F5F1EB] font-mono">
                  <Folder className="w-4 h-4 text-[#C9A86A]" /> {folder}
                </span>
                <span className="text-[11px] text-[#8D867C]">Открыть →</span>
              </button>
            ))}

            {r2.files.map((f) => (
              <div
                key={f.key}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#0F0F0E] px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => openPrivatePreview(f)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="font-mono text-[12px] text-[#F5F1EB] truncate">
                    {f.key.slice(prefix.length) || f.key}
                  </div>
                  <div className="text-[11px] text-[#8D867C] font-mono">
                    {formatBytes(f.size)} · {formatShortDate(f.lastModified)}
                  </div>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openPrivatePreview(f)}
                    title="Просмотр"
                    className="p-1.5 rounded-lg border border-white/10 text-[#5B9BFF]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteKey(f.key)}
                    title="Удалить"
                    className="p-1.5 rounded-lg border border-[#F06A7E]/30 text-[#F06A7E]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {r2.folders.length === 0 && r2.files.length === 0 && !loading && (
              <div className="text-[12px] text-[#8D867C] text-center py-6">Файлы не найдены</div>
            )}
          </div>

          {r2.isTruncated && r2.nextToken && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => fetchList(prefix, '', r2.nextToken)}
              className="w-full rounded-xl border border-[#C9A86A]/40 bg-[#C9A86A]/10 py-2 text-[12px] font-semibold text-[#C9A86A] disabled:opacity-50"
            >
              {loadingMore ? 'Загрузка...' : 'Загрузить ещё 100 файлов'}
            </button>
          )}
        </div>
      )}

      {/* MODE 2: R2 ANALYTICS & TOP-20 */}
      {mode === 'analytics' && r2?.configured && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                <BarChart2 className="w-4 h-4 text-[#C9A86A]" /> Лимит R2 (Free Tier 10 GB)
              </div>
              <button
                type="button"
                disabled={statsLoading}
                onClick={fetchStats}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-[#C9A86A]"
              >
                {statsLoading ? 'Скан...' : 'Обновить'}
              </button>
            </div>

            {statsLoading && !stats && (
              <div className="text-[12px] text-[#8D867C] py-4 text-center">
                Сканирование всех файлов бакета...
              </div>
            )}

            {stats && (
              <>
                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-[#DED7CC]">
                      {formatBytes(stats.totalBytes)} / 10 GB · {stats.totalFiles} файлов
                    </span>
                    <span className="text-[#3FD08F]">{quotaPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#3FD08F] to-[#C9A86A]"
                      style={{ width: `${quotaPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {stats.formats.map((fmt) => (
                    <span
                      key={fmt.ext}
                      className="rounded-lg border border-white/[0.08] bg-[#0F0F0E] px-2.5 py-1 text-[11px] font-mono text-[#DED7CC]"
                    >
                      .{fmt.ext}: <span className="text-[#C9A86A]">{fmt.count}</span> ({formatBytes(fmt.bytes)})
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {stats && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5 space-y-2.5">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTopKind('largest')}
                  className={`rounded-xl py-1.5 text-[12px] font-semibold ${
                    topKind === 'largest'
                      ? 'bg-[#C9A86A]/20 text-[#C9A86A] border border-[#C9A86A]/45'
                      : 'bg-[#0F0F0E] text-[#A8A095] border border-white/[0.07]'
                  }`}
                >
                  ТОП-20 тяжёлых
                </button>
                <button
                  type="button"
                  onClick={() => setTopKind('newest')}
                  className={`rounded-xl py-1.5 text-[12px] font-semibold ${
                    topKind === 'newest'
                      ? 'bg-[#5B9BFF]/20 text-[#5B9BFF] border border-[#5B9BFF]/45'
                      : 'bg-[#0F0F0E] text-[#A8A095] border border-white/[0.07]'
                  }`}
                >
                  ТОП-20 свежих
                </button>
              </div>

              <div className="space-y-1.5">
                {(topKind === 'largest' ? stats.largest : stats.newest).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => openPrivatePreview(f)}
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#0F0F0E] px-3 py-2 text-left hover:border-[#C9A86A]/40"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[12px] text-[#F5F1EB] truncate">{f.key}</div>
                      <div className="text-[11px] font-mono text-[#8D867C]">
                        {formatShortDate(f.lastModified)}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[12px] font-semibold text-[#C9A86A]">
                      {formatBytes(f.size)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRIVATE FILE PREVIEW MODAL (Presigned GET 5 min + Replace + Delete) */}
      {preview && (
        <div className="fixed inset-0 z-[135] bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[88dvh] rounded-2xl border border-[#C9A86A]/35 bg-[#141412] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <div className="font-mono text-[12px] font-semibold text-[#C9A86A] truncate">
                {preview.file.key}
              </div>
              <button type="button" onClick={() => setPreview(null)} className="p-1 text-[#8D867C]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0A] min-h-[200px] flex items-center justify-center overflow-hidden p-2">
                {preview.loading ? (
                  <div className="text-[12px] text-[#8D867C]">Подпись временной ссылки (5 мин)...</div>
                ) : preview.signedUrl && isImageKey(preview.file.key) ? (
                  <img
                    src={preview.signedUrl}
                    alt={preview.file.key}
                    className="max-h-[300px] w-auto object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-[12px] text-[#8D867C] text-center p-4">
                    Предпросмотр доступен для изображений.
                  </div>
                )}
              </div>

              <div className="flex justify-between text-[11px] font-mono text-[#A8A095]">
                <span>Размер: {formatBytes(preview.file.size)}</span>
                <span>{formatShortDate(preview.file.lastModified)}</span>
              </div>

              <input
                ref={replaceInputRef}
                type="file"
                onChange={handleReplaceFile}
                className="hidden"
              />

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={replacing}
                  onClick={() => replaceInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#C9A86A] py-2 px-2 text-[12px] font-semibold text-[#121210] disabled:opacity-50"
                >
                  <Replace className="w-3.5 h-3.5" /> {replacing ? '...' : 'Заменить'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await copyTextToClipboard(preview.file.key);
                    showToast('Путь скопирован');
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/15 py-2 px-2 text-[12px] text-[#F5F1EB]"
                >
                  <Copy className="w-3.5 h-3.5" /> Путь
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteKey(preview.file.key)}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#F06A7E]/40 bg-[#F06A7E]/10 py-2 px-2 text-[12px] text-[#F06A7E]"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

