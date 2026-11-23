import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Edit3,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { copyTextToClipboard, isTelegramWebView } from './exportUtils';
import { DARK_INPUT_STYLE } from './types';

type RowMap = Record<string, unknown>;
type RowList = RowMap[];
type EditValuesMap = Record<string, string>;

export type NeonTableSummary = {
  name: string;
  rows: number;
  deadRows: number;
  sizePretty: string;
  sizeBytes: number;
  pkCol: string | null;
};

type NeonTableBrowserProps = {
  dbSize: string;
  dbBytes: number;
  activeConns: number;
  cacheHitPct: number;
  tables: NeonTableSummary[];
  tablesLoading: boolean;
  onRefreshTables: () => void;
  buildAuthHeaders: () => Record<string, string>;
  showToast: (msg: string) => void;
};

const NEON_FREE_LIMIT_BYTES = 512 * 1024 * 1024;

function previewCell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 44);
  const s = String(v);
  return s.length > 42 ? `${s.slice(0, 42)}…` : s;
}

export const NeonTableBrowser: React.FC<NeonTableBrowserProps> = ({
  dbSize,
  dbBytes,
  activeConns,
  cacheHitPct,
  tables,
  tablesLoading,
  onRefreshTables,
  buildAuthHeaders,
  showToast,
}) => {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [pkCol, setPkCol] = useState<string | null>(null);
  const [cols, setCols] = useState<string[]>([]);
  const [rows, setRows] = useState<RowList>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loadingRows, setLoadingRows] = useState<boolean>(false);

  // Record Card Editor
  const [editingRow, setEditingRow] = useState<RowMap | null>(null);
  const [editValues, setEditValues] = useState<EditValuesMap>({});
  const [savingRow, setSavingRow] = useState<boolean>(false);

  const loadRows = useCallback(
    async (tName: string, pNum: number, qStr: string, sCol: string, sDir: 'asc' | 'desc') => {
      if (!tName) return;
      setLoadingRows(true);
      try {
        const qs = new URLSearchParams({
          action: 'db-rows',
          table: tName,
          page: String(pNum),
          limit: '25',
          search: qStr,
          sortCol: sCol,
          sortDir: sDir,
        });
        const r = await fetch(`/api/check-purchase?${qs.toString()}`, {
          headers: buildAuthHeaders(),
        });
        const data = (await r.json()) as {
          ok?: boolean;
          pkCol?: string | null;
          total?: number;
          columns?: string[];
          rows?: RowList;
          sortCol?: string;
        };
        if (r.ok && data.ok) {
          setPkCol(data.pkCol ?? null);
          setTotal(data.total || 0);
          setCols(data.columns || []);
          setRows(data.rows || []);
          if (!sCol && data.sortCol) setSortCol(data.sortCol);
        }
      } catch {
        showToast('Ошибка загрузки таблицы');
      } finally {
        setLoadingRows(false);
      }
    },
    [buildAuthHeaders, showToast],
  );

  useEffect(() => {
    if (selectedTable) {
      loadRows(selectedTable, page, search, sortCol, sortDir);
    }
  }, [selectedTable, page, sortCol, sortDir, loadRows]);

  const handleOpenTable = (name: string) => {
    setSelectedTable(name);
    setPage(1);
    setSearch('');
    setSortCol('');
    setSortDir('desc');
  };

  const handleOpenRowEditor = (row: RowMap) => {
    const map: EditValuesMap = {};
    for (const c of cols) {
      const val = row[c];
      map[c] = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
    }
    setEditingRow(row);
    setEditValues(map);
  };

  const handleSaveRow = async () => {
    if (!editingRow || !pkCol || !selectedTable) return;
    if (!window.confirm('Сохранить изменения в базе Neon?')) return;
    setSavingRow(true);
    try {
      const updates: RowMap = {};
      for (const c of cols) {
        if (c === pkCol) continue;
        const orig = editingRow[c];
        const origStr = orig === null || orig === undefined ? '' : typeof orig === 'object' ? JSON.stringify(orig) : String(orig);
        if (editValues[c] !== origStr) {
          updates[c] = editValues[c];
        }
      }
      if (Object.keys(updates).length === 0) {
        showToast('Изменений нет');
        setEditingRow(null);
        return;
      }

      const r = await fetch('/api/check-purchase?action=db-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({
          table: selectedTable,
          pkCol,
          pkVal: editingRow[pkCol],
          updates,
        }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !data.ok) {
        showToast(data.error || 'Не удалось сохранить');
      } else {
        showToast('Запись обновлена (записано в Журнал)');
        setEditingRow(null);
        loadRows(selectedTable, page, search, sortCol, sortDir);
      }
    } catch {
      showToast('Ошибка сети');
    } finally {
      setSavingRow(false);
    }
  };

  const handleDeleteRow = async () => {
    if (!editingRow || !pkCol || !selectedTable) return;
    if (!window.confirm(`Удалить запись ${pkCol}=${String(editingRow[pkCol])} навсегда?`)) return;
    setSavingRow(true);
    try {
      const r = await fetch('/api/check-purchase?action=db-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({
          table: selectedTable,
          pkCol,
          pkVal: editingRow[pkCol],
        }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !data.ok) {
        showToast(data.error || 'Не удалось удалить');
      } else {
        showToast('Запись удалена (записано в Журнал)');
        setEditingRow(null);
        loadRows(selectedTable, page, search, sortCol, sortDir);
        onRefreshTables();
      }
    } catch {
      showToast('Ошибка сети');
    } finally {
      setSavingRow(false);
    }
  };

  const handleBackupTable = async (fmt: 'csv' | 'json') => {
    if (!selectedTable) return;
    try {
      const r = await fetch(
        `/api/check-purchase?action=db-export&table=${encodeURIComponent(selectedTable)}`,
        { headers: buildAuthHeaders() },
      );
      const data = (await r.json()) as { ok?: boolean; columns?: string[]; rows?: RowList };
      if (!r.ok || !data.ok) {
        showToast('Ошибка бэкапа');
        return;
      }
      const bRows = data.rows || [];
      const bCols = data.columns || [];
      let content = '';
      let mime = 'application/json';

      if (fmt === 'json') {
        content = JSON.stringify(bRows, null, 2);
      } else {
        mime = 'text/csv;charset=utf-8';
        const esc = (v: unknown) => {
          const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
          return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        };
        content = '\uFEFF' + [bCols.join(','), ...bRows.map((row) => bCols.map((c) => esc(row[c])).join(','))].join('\n');
      }

      if (isTelegramWebView()) {
        await copyTextToClipboard(content);
        showToast(`Бэкап ${selectedTable}.${fmt} скопирован в буфер`);
        return;
      }
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${selectedTable}-${new Date().toISOString().slice(0, 10)}.${fmt}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`Бэкап ${selectedTable}.${fmt} скачан`);
    } catch {
      showToast('Ошибка сети при бэкапе');
    }
  };

  const quotaPct = Math.min(100, Math.max(1, Math.round((dbBytes / NEON_FREE_LIMIT_BYTES) * 100)));
  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-3">
      {/* Neon Health & 512MB Quota Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <Database className="w-4 h-4 text-[#3FD08F]" /> Здоровье Neon (Free Tier 512 MB)
          </div>
          <button
            type="button"
            onClick={onRefreshTables}
            className="p-1.5 rounded-lg border border-white/10 text-[#C9A86A]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${tablesLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-mono mb-1">
            <span className="text-[#DED7CC]">Занято: {dbSize} / 512 MB</span>
            <span className="text-[#3FD08F]">{quotaPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#3FD08F] to-[#C9A86A]"
              style={{ width: `${quotaPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
          <div className="rounded-xl bg-[#0F0F0E] border border-white/[0.06] py-2">
            <div className="text-[10px] text-[#8D867C]">Cache Hit</div>
            <div className="text-[14px] font-bold text-[#3FD08F]">{cacheHitPct}%</div>
          </div>
          <div className="rounded-xl bg-[#0F0F0E] border border-white/[0.06] py-2">
            <div className="text-[10px] text-[#8D867C]">Таблиц</div>
            <div className="text-[14px] font-bold text-[#F5F1EB]">{tables.length}</div>
          </div>
          <div className="rounded-xl bg-[#0F0F0E] border border-white/[0.06] py-2">
            <div className="text-[10px] text-[#8D867C]">Коннектов</div>
            <div className="text-[14px] font-bold text-[#C9A86A]">{activeConns}</div>
          </div>
        </div>
      </div>

      {/* Tables List */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5 space-y-2">
        <div className="text-[12px] font-semibold text-[#A8A095]">Выберите таблицу для просмотра и правки:</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {tables.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => handleOpenTable(t.name)}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                selectedTable === t.name
                  ? 'border-[#C9A86A]/55 bg-[#C9A86A]/12'
                  : 'border-white/[0.06] bg-[#0F0F0E]'
              }`}
            >
              <span className="font-mono text-[12px] text-[#F5F1EB]">{t.name}</span>
              <span className="font-mono text-[11px] text-[#8D867C]">
                {t.rows} · <span className="text-[#C9A86A]">{t.sizePretty}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Table Browser */}
      {selectedTable && (
        <div className="rounded-2xl border border-[#C9A86A]/30 bg-[#141412] p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono text-[14px] font-bold text-[#C9A86A]">{selectedTable}</div>
              <div className="text-[11px] text-[#8D867C]">
                Всего записей: {total} · Тап по строке = карточка редактирования
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleBackupTable('csv')}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#DED7CC]"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
              <button
                type="button"
                onClick={() => handleBackupTable('json')}
                className="inline-flex items-center gap-1 rounded-lg border border-[#C9A86A]/35 bg-[#C9A86A]/10 px-2.5 py-1 text-[11px] text-[#C9A86A]"
              >
                <Download className="w-3 h-3" /> JSON
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    loadRows(selectedTable, 1, search, sortCol, sortDir);
                  }
                }}
                placeholder={`Поиск внутри ${selectedTable}...`}
                style={DARK_INPUT_STYLE}
                className="w-full rounded-xl border border-white/15 pl-3 pr-9 py-2 text-[12px] focus:outline-none focus:border-[#C9A86A]"
              />
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  loadRows(selectedTable, 1, search, sortCol, sortDir);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#C9A86A]"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loadingRows ? (
            <div className="text-[12px] text-[#8D867C] py-6 text-center">Загрузка...</div>
          ) : rows.length === 0 ? (
            <div className="text-[12px] text-[#8D867C] py-6 text-center">Записи не найдены</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0B0B0A]">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="border-b border-white/[0.08] text-[#8D867C]">
                  <tr>
                    <th className="px-2 py-2" />
                    {cols.slice(0, 7).map((c) => (
                      <th key={c} className="px-2.5 py-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (sortCol === c) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
                            else {
                              setSortCol(c);
                              setSortDir('desc');
                            }
                          }}
                          className="hover:text-[#F5F1EB]"
                        >
                          {c} {sortCol === c ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-[#DED7CC]">
                  {rows.map((row, idx) => (
                    <tr
                      key={idx}
                      onClick={() => handleOpenRowEditor(row)}
                      className="hover:bg-[#C9A86A]/10 cursor-pointer"
                    >
                      <td className="px-2 py-1.5 text-[#C9A86A]">
                        <Edit3 className="w-3.5 h-3.5" />
                      </td>
                      {cols.slice(0, 7).map((c) => (
                        <td key={c} className="px-2.5 py-1.5 whitespace-nowrap">
                          {previewCell(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between text-[12px] text-[#A8A095]">
            <span>
              Стр. {page} из {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-white/10 disabled:opacity-35"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-white/10 disabled:opacity-35"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Card Editor Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-[135] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[85dvh] rounded-2xl border border-[#C9A86A]/35 bg-[#141412] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <div className="font-mono text-[13px] font-semibold text-[#C9A86A]">
                {selectedTable} {pkCol ? `· ${pkCol}=${String(editingRow[pkCol])}` : '(только просмотр)'}
              </div>
              <button type="button" onClick={() => setEditingRow(null)} className="p-1 text-[#8D867C]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cols.map((c) => {
                const isPk = c === pkCol;
                return (
                  <div key={c}>
                    <label className="block text-[11px] font-mono text-[#A8A095] mb-1">
                      {c} {isPk && <span className="text-[#C9A86A]">(ключ)</span>}
                    </label>
                    <input
                      type="text"
                      disabled={isPk || !pkCol}
                      value={editValues[c] ?? ''}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, [c]: e.target.value }))}
                      style={DARK_INPUT_STYLE}
                      className="w-full rounded-xl border border-white/15 px-3 py-2 text-[12px] font-mono disabled:opacity-55 focus:outline-none focus:border-[#C9A86A]"
                    />
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
              {pkCol ? (
                <>
                  <button
                    type="button"
                    disabled={savingRow}
                    onClick={handleDeleteRow}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#F06A7E]/40 bg-[#F06A7E]/10 px-3 py-2 text-[12px] font-semibold text-[#F06A7E] disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Удалить
                  </button>
                  <button
                    type="button"
                    disabled={savingRow}
                    onClick={handleSaveRow}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#C9A86A] px-4 py-2 text-[13px] font-semibold text-[#121210] disabled:opacity-40"
                  >
                    <Save className="w-4 h-4" /> {savingRow ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </>
              ) : (
                <div className="text-[11px] text-[#8D867C]">
                  У таблицы нет Primary Key — редактирование отключено ради безопасности.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

