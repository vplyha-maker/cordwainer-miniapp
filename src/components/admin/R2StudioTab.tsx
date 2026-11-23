import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart2,
  Eye,
  Folder,
  FolderPlus,
  HardDrive,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { DARK_INPUT_STYLE, formatShortDate } from './types';
import { R2PreviewModal } from './R2PreviewModal';
import {
  formatBytes,
  isImageKey,
  optimizeImageToWebP,
  type R2FileItem,
} from './r2ImageUtils';

type R2Mode = 'files' | 'analytics';
type TopKind = 'largest' | 'newest' | 'duplicates';
type ViewLayout = 'list' | 'gallery';

type R2ListState = {
  configured: boolean;
  missing: string[];
  bucket: string;
  publicUrl: string;
  prefix: string;
  searchTotal?: number;
  totalSize: number;
  folders: string[];
  files: R2FileItem[];
  isTruncated: boolean;
  nextToken: string;
};

type R2DuplicateGroup = {
  etag: string;
  size: number;
  keys: string[];
};

type R2StatsData = {
  ms: number;
  bucket: string;
  totalFiles: number;
  totalBytes: number;
  formats: Array<{ ext: string; count: number; bytes: number }>;
  largest: R2FileItem[];
  newest: R2FileItem[];
  duplicates: R2DuplicateGroup[];
  duplicateGroupsCount: number;
  duplicateWastedBytes: number;
};

type R2StudioTabProps = {
  buildAuthHeaders: () => Record<string, string>;
  showToast: (msg: string) => void;
};

const R2_FREE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;

export const R2StudioTab: React.FC<R2StudioTabProps> = ({
  buildAuthHeaders,
  showToast,
}) => {
  const [mode, setMode] = useState<R2Mode>('files');
  const [viewLayout, setViewLayout] = useState<ViewLayout>('list');
  const [autoWebp, setAutoWebp] = useState<boolean>(true);

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

  // Gallery signed thumbnail cache
  const [thumbMap, setThumbMap] = useState<Record<string, string>>({});
  const [thumbsLoading, setThumbsLoading] = useState<boolean>(false);

  // Preview modal
  const [previewFile, setPreviewFile] = useState<R2FileItem | null>(null);

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

  // Batch-sign thumbnails when Gallery mode is active
  useEffect(() => {
    if (viewLayout !== 'gallery' || !r2?.files.length) return;
    const missingKeys = r2.files
      .filter((f) => isImageKey(f.key) && !thumbMap[f.key])
      .slice(0, 24)
      .map((f) => f.key);
    if (missingKeys.length === 0) return;

    let active = true;
    setThumbsLoading(true);
    (async () => {
      try {
        const r = await fetch('/api/check-purchase?action=r2-view-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
          body: JSON.stringify({ keys: missingKeys }),
        });
        const data = (await r.json()) as { ok?: boolean; urls?: Record<string, string> };
        if (active && r.ok && data.ok && data.urls) {
          setThumbMap((prev) => ({ ...prev, ...data.urls }));
        }
      } catch {
        // ignore thumbnail batch failure
      } finally {
        if (active) setThumbsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [viewLayout, r2?.files, thumbMap, buildAuthHeaders]);

  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = '';
    if (fileList.length === 0) return;

    let okCount = 0;
    let totalSaved = 0;
    for (let i = 0; i < fileList.length; i += 1) {
      const rawFile = fileList[i];
      setUploadProgress(`${i + 1}/${fileList.length}`);
      try {
        const opt = autoWebp
          ? await optimizeImageToWebP(rawFile)
          : { file: rawFile, originalSize: rawFile.size, finalSize: rawFile.size, savedBytes: 0, converted: false };
        const cleanName = opt.file.name.replace(/\s+/g, '_');
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
          headers: { 'Content-Type': opt.file.type || 'application/octet-stream' },
          body: opt.file,
        });
        if (putResp.ok) {
          okCount += 1;
          totalSaved += opt.savedBytes;
        }
      } catch {
        // continue next file
      }
    }

    setUploadProgress('');
    if (okCount > 0) {
      const savedNote = totalSaved > 0 ? ` · WebP сэкономил ${formatBytes(totalSaved)}` : '';
      showToast(`Загружено: ${okCount}/${fileList.length}${savedNote}`);
      fetchList(prefix, search);
    } else {
      showToast('Ошибка загрузки (проверьте CORS)');
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
  const quotaPct = stats
    ? Math.min(100, Math.max(0.5, Number(((stats.totalBytes / R2_FREE_LIMIT_BYTES) * 100).toFixed(1))))
    : 0;

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
                accept={autoWebp ? 'image/*' : undefined}
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

          {/* Toolbar: Auto-WebP + List/Gallery switcher */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setAutoWebp((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shrink-0 transition ${
                autoWebp
                  ? 'border-[#3FD08F]/45 bg-[#3FD08F]/10 text-[#3FD08F]'
                  : 'border-white/10 bg-[#0F0F0E] text-[#8D867C]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              WebP: {autoWebp ? 'ВКЛ' : 'ВЫКЛ'}
            </button>

            <div className="inline-flex rounded-xl border border-white/10 bg-[#0F0F0E] p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewLayout('list')}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] whitespace-nowrap ${
                  viewLayout === 'list' ? 'bg-[#C9A86A] text-[#121210] font-semibold' : 'text-[#A8A095]'
                }`}
              >
                <List className="w-3.5 h-3.5" /> Список
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('gallery')}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] whitespace-nowrap ${
                  viewLayout === 'gallery' ? 'bg-[#C9A86A] text-[#121210] font-semibold' : 'text-[#A8A095]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Галерея
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

          {/* Folders */}
          {r2.folders.length > 0 && (
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
            </div>
          )}

          {/* Files: List or Gallery */}
          {viewLayout === 'list' ? (
            <div className="space-y-1.5">
              {r2.files.map((f) => (
                <div
                  key={f.key}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#0F0F0E] px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewFile(f)}
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
                      onClick={() => setPreviewFile(f)}
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
            </div>
          ) : (
            <div className="space-y-2">
              {thumbsLoading && (
                <div className="text-[11px] text-[#C9A86A] font-mono">Подпись миниатюр галереи...</div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {r2.files.map((f) => {
                  const thumb = thumbMap[f.key];
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setPreviewFile(f)}
                      className="rounded-xl border border-white/[0.07] bg-[#0F0F0E] overflow-hidden text-left hover:border-[#C9A86A]/45"
                    >
                      <div className="h-24 bg-[#090908] flex items-center justify-center p-1.5 overflow-hidden">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={f.key}
                            loading="lazy"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] font-mono text-[#6F6960]">
                            {isImageKey(f.key) ? '...' : 'FILE'}
                          </span>
                        )}
                      </div>
                      <div className="px-2 py-1.5">
                        <div className="font-mono text-[10px] text-[#F5F1EB] truncate">
                          {f.key.slice(prefix.length) || f.key}
                        </div>
                        <div className="font-mono text-[10px] text-[#8D867C]">{formatBytes(f.size)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {r2.folders.length === 0 && r2.files.length === 0 && !loading && (
            <div className="text-center py-6 space-y-1">
              <div className="text-[12px] text-[#8D867C]">
                {search.trim() ? 'Файлы не найдены' : 'Папка пуста'}
              </div>
              {!search.trim() && prefix && (
                <div className="text-[11px] text-[#C9A86A]/80">
                  Папка сохранится в R2 после загрузки первого файла
                </div>
              )}
            </div>
          )}

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

      {/* MODE 2: R2 ANALYTICS, TOP-20 & ETAG DUPLICATES */}
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
                Сканирование всех файлов и ETag-хешей...
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
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTopKind('largest')}
                  className={`rounded-xl py-1.5 text-[11px] font-semibold ${
                    topKind === 'largest'
                      ? 'bg-[#C9A86A]/20 text-[#C9A86A] border border-[#C9A86A]/45'
                      : 'bg-[#0F0F0E] text-[#A8A095] border border-white/[0.07]'
                  }`}
                >
                  Тяжёлые
                </button>
                <button
                  type="button"
                  onClick={() => setTopKind('newest')}
                  className={`rounded-xl py-1.5 text-[11px] font-semibold ${
                    topKind === 'newest'
                      ? 'bg-[#5B9BFF]/20 text-[#5B9BFF] border border-[#5B9BFF]/45'
                      : 'bg-[#0F0F0E] text-[#A8A095] border border-white/[0.07]'
                  }`}
                >
                  Свежие
                </button>
                <button
                  type="button"
                  onClick={() => setTopKind('duplicates')}
                  className={`rounded-xl py-1.5 text-[11px] font-semibold ${
                    topKind === 'duplicates'
                      ? 'bg-[#F06A7E]/20 text-[#F06A7E] border border-[#F06A7E]/45'
                      : 'bg-[#0F0F0E] text-[#A8A095] border border-white/[0.07]'
                  }`}
                >
                  Дубли ({stats.duplicateGroupsCount})
                </button>
              </div>

              {topKind === 'duplicates' ? (
                <div className="space-y-2">
                  {stats.duplicates.length === 0 ? (
                    <div className="text-[12px] text-[#3FD08F] text-center py-4">
                      Точных дубликатов по MD5 (ETag) не найдено!
                    </div>
                  ) : (
                    <>
                      <div className="text-[11px] font-mono text-[#F06A7E]">
                        Групп дубликатов: {stats.duplicateGroupsCount} · лишний объём: {formatBytes(stats.duplicateWastedBytes)}
                      </div>
                      {stats.duplicates.map((grp) => (
                        <div
                          key={grp.etag}
                          className="rounded-xl border border-[#F06A7E]/25 bg-[#0F0F0E] p-2.5 space-y-1"
                        >
                          <div className="flex justify-between text-[10px] font-mono text-[#8D867C]">
                            <span>ETag: {grp.etag.slice(0, 12)}...</span>
                            <span className="text-[#C9A86A]">{grp.keys.length}× · {formatBytes(grp.size)}</span>
                          </div>
                          {grp.keys.map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => setPreviewFile({ key: k, size: grp.size, lastModified: '' })}
                              className="w-full py-1 text-left font-mono text-[11px] text-[#F5F1EB] truncate hover:text-[#C9A86A]"
                            >
                              • {k}
                            </button>
                          ))}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(topKind === 'largest' ? stats.largest : stats.newest).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setPreviewFile(f)}
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
              )}
            </div>
          )}
        </div>
      )}

      {previewFile && (
        <R2PreviewModal
          file={previewFile}
          autoWebp={autoWebp}
          buildAuthHeaders={buildAuthHeaders}
          showToast={showToast}
          onClose={() => setPreviewFile(null)}
          onRefresh={() => fetchList(prefix, search)}
          onFileChanged={(nextFile) => setPreviewFile(nextFile)}
        />
      )}
    </div>
  );
};
