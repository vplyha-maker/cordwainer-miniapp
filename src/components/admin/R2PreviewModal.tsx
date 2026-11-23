import React, { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Database,
  FolderInput,
  Link2,
  Plus,
  Replace,
  Trash2,
  X,
} from 'lucide-react';
import { copyTextToClipboard } from './exportUtils';
import { DARK_INPUT_STYLE, formatShortDate } from './types';
import {
  formatBytes,
  guessBrandAndTitle,
  isImageKey,
  keyToModelName,
  optimizeImageToWebP,
  type NeonSneakerMatch,
  type R2FileItem,
} from './r2ImageUtils';

type R2PreviewModalProps = {
  file: R2FileItem;
  autoWebp: boolean;
  buildAuthHeaders: () => Record<string, string>;
  showToast: (msg: string) => void;
  onClose: () => void;
  onRefresh: () => void;
  onFileChanged: (nextFile: R2FileItem) => void;
};

export const R2PreviewModal: React.FC<R2PreviewModalProps> = ({
  file,
  autoWebp,
  buildAuthHeaders,
  showToast,
  onClose,
  onRefresh,
  onFileChanged,
}) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [neonMatches, setNeonMatches] = useState<NeonSneakerMatch[]>([]);

  // Rename / Move
  const [showRename, setShowRename] = useState<boolean>(false);
  const [newKey, setNewKey] = useState<string>(file.key);
  const [syncNeon, setSyncNeon] = useState<boolean>(true);
  const [renaming, setRenaming] = useState<boolean>(false);

  // Create Neon row
  const [showCreateNeon, setShowCreateNeon] = useState<boolean>(false);
  const [brandInput, setBrandInput] = useState<string>('');
  const [titleInput, setTitleInput] = useState<string>('');
  const [creatingNeon, setCreatingNeon] = useState<boolean>(false);

  // Replace & Share
  const [replacing, setReplacing] = useState<boolean>(false);
  const [sharingTtl, setSharingTtl] = useState<number>(0);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSignedUrl('');
    setNewKey(file.key);
    setShowRename(false);
    setShowCreateNeon(false);
    const guessed = guessBrandAndTitle(file.key);
    setBrandInput(guessed.brand);
    setTitleInput(guessed.title);

    (async () => {
      try {
        const r = await fetch(
          `/api/check-purchase?action=r2-view&withNeon=1&key=${encodeURIComponent(file.key)}`,
          { headers: buildAuthHeaders() },
        );
        const data = (await r.json()) as {
          ok?: boolean;
          url?: string;
          neonMatches?: NeonSneakerMatch[];
          error?: string;
        };
        if (!active) return;
        if (r.ok && data.ok) {
          setSignedUrl(data.url || '');
          setNeonMatches(data.neonMatches || []);
        } else {
          showToast(data.error || 'Не удалось загрузить превью');
        }
      } catch {
        if (active) showToast('Ошибка сети');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [file.key, buildAuthHeaders, showToast]);

  const handleShareLink = async (ttlSec: number, label: string) => {
    setSharingTtl(ttlSec);
    try {
      const r = await fetch(
        `/api/check-purchase?action=r2-view&key=${encodeURIComponent(file.key)}&ttl=${ttlSec}`,
        { headers: buildAuthHeaders() },
      );
      const data = (await r.json()) as { ok?: boolean; url?: string; error?: string };
      if (r.ok && data.ok && data.url) {
        await copyTextToClipboard(data.url);
        showToast(`Временная ссылка (${label}) скопирована`);
      } else {
        showToast(data.error || 'Не удалось создать ссылку');
      }
    } catch {
      showToast('Ошибка сети');
    } finally {
      setSharingTtl(0);
    }
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    e.target.value = '';
    if (!rawFile) return;

    setReplacing(true);
    try {
      const opt = autoWebp
        ? await optimizeImageToWebP(rawFile)
        : { file: rawFile, originalSize: rawFile.size, finalSize: rawFile.size, savedBytes: 0, converted: false };

      const r = await fetch('/api/check-purchase?action=r2-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ key: file.key }),
      });
      const data = (await r.json()) as { ok?: boolean; uploadUrl?: string; error?: string };
      if (!r.ok || !data.ok || !data.uploadUrl) {
        showToast(data.error || 'Не удалось получить ссылку замены');
        return;
      }
      const putResp = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': opt.file.type || 'application/octet-stream' },
        body: opt.file,
      });
      if (!putResp.ok) {
        showToast('Ошибка замены файла в R2');
        return;
      }

      const savedMsg = opt.savedBytes > 0 ? ` · WebP -${formatBytes(opt.savedBytes)}` : '';
      showToast(`Файл заменён${savedMsg}`);
      onFileChanged({ ...file, size: opt.file.size, lastModified: new Date().toISOString() });
      onRefresh();
    } catch {
      showToast('Ошибка сети при замене');
    } finally {
      setReplacing(false);
    }
  };

  const handleRename = async () => {
    const cleanNew = newKey.trim().replace(/^\/+/, '');
    if (!cleanNew || cleanNew === file.key) return;
    setRenaming(true);
    try {
      const r = await fetch('/api/check-purchase?action=r2-rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ oldKey: file.key, newKey: cleanNew, syncNeon }),
      });
      const data = (await r.json()) as { ok?: boolean; neonUpdated?: number; error?: string };
      if (!r.ok || !data.ok) {
        showToast(data.error || 'Ошибка переименования');
        return;
      }
      const neonNote = data.neonUpdated ? ` · Neon обновлено: ${data.neonUpdated}` : '';
      showToast(`Переименовано${neonNote}`);
      setShowRename(false);
      onFileChanged({ ...file, key: cleanNew, lastModified: new Date().toISOString() });
      onRefresh();
    } catch {
      showToast('Ошибка сети');
    } finally {
      setRenaming(false);
    }
  };

  const handleCreateNeonRecord = async () => {
    if (!titleInput.trim()) {
      showToast('Укажите название модели');
      return;
    }
    setCreatingNeon(true);
    try {
      const r = await fetch('/api/check-purchase?action=r2-link-sneaker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ key: file.key, brand: brandInput.trim(), title: titleInput.trim() }),
      });
      const data = (await r.json()) as { ok?: boolean; match?: NeonSneakerMatch; error?: string };
      if (!r.ok || !data.ok) {
        showToast(data.error || 'Не удалось создать запись в Neon');
        return;
      }
      if (data.match) setNeonMatches([data.match]);
      setShowCreateNeon(false);
      showToast('Модель добавлена в Neon (sneakers)');
    } catch {
      showToast('Ошибка сети');
    } finally {
      setCreatingNeon(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Удалить «${file.key}» из Cloudflare R2 навсегда?`)) return;
    try {
      const r = await fetch('/api/check-purchase?action=r2-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ key: file.key }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (r.ok && data.ok) {
        showToast('Файл удалён из R2');
        onClose();
        onRefresh();
      } else {
        showToast(data.error || 'Не удалось удалить файл');
      }
    } catch {
      showToast('Ошибка сети');
    }
  };

  return (
    <div className="fixed inset-0 z-[135] bg-black/85 flex items-center justify-center p-4">
      <div className="w-full max-w-md max-h-[90dvh] rounded-2xl border border-[#C9A86A]/35 bg-[#141412] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
          <div className="font-mono text-[12px] font-semibold text-[#C9A86A] truncate">
            {file.key}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[#8D867C]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {/* Image preview */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0B0B0A] min-h-[180px] flex items-center justify-center overflow-hidden p-2">
            {loading ? (
              <div className="text-[12px] text-[#8D867C]">Подпись временной ссылки (5 мин)...</div>
            ) : signedUrl && isImageKey(file.key) ? (
              <img
                src={signedUrl}
                alt={file.key}
                className="max-h-[260px] w-auto object-contain rounded-lg"
              />
            ) : (
              <div className="text-[12px] text-[#8D867C] text-center p-4">
                Предпросмотр доступен для изображений.
              </div>
            )}
          </div>

          <div className="flex justify-between text-[11px] font-mono text-[#A8A095]">
            <span>Размер: {formatBytes(file.size)}</span>
            <span>{formatShortDate(file.lastModified)}</span>
          </div>

          {/* Tool 2: Neon Sneakers Link */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0F0F0E] p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#DED7CC]">
                <Database className="w-3.5 h-3.5 text-[#3FD08F]" /> Связь с Neon (sneakers)
              </span>
              {!loading && neonMatches.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreateNeon((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] text-[#C9A86A]"
                >
                  <Plus className="w-3 h-3" /> Добавить
                </button>
              )}
            </div>

            {neonMatches.length > 0 ? (
              <div className="space-y-1">
                {neonMatches.map((m) => (
                  <div key={m.id} className="text-[11px] font-mono text-[#E7E1D7] flex justify-between gap-2">
                    <span className="truncate">
                      {m.brand ? `[${m.brand}] ` : ''}{m.title}
                    </span>
                    <span className="text-[#8D867C] shrink-0">#{m.id}</span>
                  </div>
                ))}
              </div>
            ) : !loading && !showCreateNeon ? (
              <div className="text-[11px] text-[#8D867C]">Не привязано к каталогу sneakers</div>
            ) : null}

            {showCreateNeon && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={brandInput}
                  onChange={(e) => setBrandInput(e.target.value)}
                  placeholder="Бренд (например: Nike)"
                  style={DARK_INPUT_STYLE}
                  className="w-full rounded-lg border border-white/15 px-2.5 py-1.5 text-[12px]"
                />
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Название модели"
                  style={DARK_INPUT_STYLE}
                  className="w-full rounded-lg border border-white/15 px-2.5 py-1.5 text-[12px]"
                />
                <button
                  type="button"
                  disabled={creatingNeon}
                  onClick={handleCreateNeonRecord}
                  className="w-full rounded-lg bg-[#3FD08F]/20 border border-[#3FD08F]/40 py-1.5 text-[12px] font-semibold text-[#3FD08F] disabled:opacity-50"
                >
                  {creatingNeon ? 'Сохранение...' : 'Создать запись в sneakers'}
                </button>
              </div>
            )}
          </div>

          {/* Tool 3: Safe Rename / Move */}
          {showRename && (
            <div className="rounded-xl border border-[#C9A86A]/35 bg-[#15130E] p-2.5 space-y-2">
              <div className="text-[11px] font-semibold text-[#C9A86A]">Переименовать / Перенести в R2</div>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                style={DARK_INPUT_STYLE}
                className="w-full rounded-lg border border-white/15 px-2.5 py-1.5 font-mono text-[11px]"
              />
              <label className="flex items-center gap-2 text-[11px] text-[#DED7CC]">
                <input
                  type="checkbox"
                  checked={syncNeon}
                  onChange={(e) => setSyncNeon(e.target.checked)}
                />
                Автоматически обновить ссылку в Neon
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={renaming || !newKey.trim() || newKey.trim() === file.key}
                  onClick={handleRename}
                  className="flex-1 rounded-lg bg-[#C9A86A] py-1.5 text-[12px] font-semibold text-[#121210] disabled:opacity-50"
                >
                  {renaming ? 'Перенос...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRename(false)}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] text-[#A8A095]"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {/* Tool 6: Temporary Share Links */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={sharingTtl === 3600}
              onClick={() => handleShareLink(3600, '1 ч')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#5B9BFF]/35 bg-[#5B9BFF]/10 py-1.5 px-2 text-[11px] font-medium text-[#5B9BFF]"
            >
              <Link2 className="w-3.5 h-3.5" /> {sharingTtl === 3600 ? '...' : 'Ссылка на 1 ч'}
            </button>
            <button
              type="button"
              disabled={sharingTtl === 86400}
              onClick={() => handleShareLink(86400, '24 ч')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#5B9BFF]/35 bg-[#5B9BFF]/10 py-1.5 px-2 text-[11px] font-medium text-[#5B9BFF]"
            >
              <Link2 className="w-3.5 h-3.5" /> {sharingTtl === 86400 ? '...' : 'Ссылка на 24 ч'}
            </button>
          </div>

          <input
            ref={replaceInputRef}
            type="file"
            accept={isImageKey(file.key) ? 'image/*' : undefined}
            onChange={handleReplaceFile}
            className="hidden"
          />

          {/* Main actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={async () => {
                const modelName = keyToModelName(file.key);
                await copyTextToClipboard(modelName);
                showToast(`Скопировано: ${modelName}`);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2 px-2.5 text-[12px] text-[#F5F1EB]"
            >
              <Copy className="w-3.5 h-3.5" /> Название
            </button>
            <button
              type="button"
              onClick={async () => {
                await copyTextToClipboard(file.key);
                showToast('Путь скопирован');
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2 px-2.5 text-[12px] text-[#F5F1EB]"
            >
              <Copy className="w-3.5 h-3.5" /> Путь
            </button>
            <button
              type="button"
              disabled={replacing}
              onClick={() => replaceInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#C9A86A] py-2 px-2.5 text-[12px] font-semibold text-[#121210] disabled:opacity-50"
            >
              <Replace className="w-3.5 h-3.5" /> {replacing ? '...' : 'Заменить'}
            </button>
            <button
              type="button"
              onClick={() => setShowRename((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#C9A86A]/40 bg-[#C9A86A]/10 py-2 px-2.5 text-[12px] text-[#C9A86A]"
            >
              <FolderInput className="w-3.5 h-3.5" /> Перенести
            </button>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#F06A7E]/40 bg-[#F06A7E]/10 py-2 px-2.5 text-[12px] text-[#F06A7E]"
          >
            <Trash2 className="w-3.5 h-3.5" /> Удалить из R2 навсегда
          </button>
        </div>
      </div>
    </div>
  );
};

