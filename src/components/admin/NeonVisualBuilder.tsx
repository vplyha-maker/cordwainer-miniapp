import React, { useEffect, useState } from 'react';
import { BookmarkPlus, Play, SlidersHorizontal, Trash2 } from 'lucide-react';
import { DARK_INPUT_STYLE } from './types';

type RowMap = Record<string, unknown>;
type RowList = RowMap[];

type SavedFilter = {
  id: string;
  label: string;
  table: string;
  column: string;
  op: string;
  value: string;
  sortCol: string;
  sortDir: 'asc' | 'desc';
};

type SavedFilterList = SavedFilter[];

type NeonVisualBuilderProps = {
  tables: string[];
  buildAuthHeaders: () => Record<string, string>;
  showToast: (msg: string) => void;
};

const STORAGE_KEY = 'cordwaine_neon_saved_filters_v1';

const OPS: Array<{ id: string; label: string }> = [
  { id: 'contains', label: 'Содержит' },
  { id: 'eq', label: 'Равно (=)' },
  { id: 'neq', label: 'Не равно (≠)' },
  { id: 'gt', label: 'Больше (>)' },
  { id: 'lt', label: 'Меньше (<)' },
  { id: 'is_null', label: 'Пусто' },
  { id: 'not_null', label: 'Не пусто' },
];

function loadSaved(): SavedFilterList {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedFilterList;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function previewCell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 50);
  const s = String(v);
  return s.length > 48 ? `${s.slice(0, 48)}…` : s;
}

export const NeonVisualBuilder: React.FC<NeonVisualBuilderProps> = ({
  tables,
  buildAuthHeaders,
  showToast,
}) => {
  const [table, setTable] = useState<string>(tables[0] || '');
  const [columns, setColumns] = useState<string[]>([]);
  const [column, setColumn] = useState<string>('');
  const [op, setOp] = useState<string>('contains');
  const [value, setValue] = useState<string>('');
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [saved, setSaved] = useState<SavedFilterList>(loadSaved);
  const [running, setRunning] = useState<boolean>(false);
  const [ms, setMs] = useState<number>(0);
  const [resCols, setResCols] = useState<string[]>([]);
  const [resRows, setResRows] = useState<RowList>([]);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    if (!table && tables.length > 0) setTable(tables[0]);
  }, [tables, table]);

  useEffect(() => {
    if (!table) return;
    let active = true;
    const loadCols = async () => {
      try {
        const r = await fetch(`/api/check-purchase?action=db-rows&table=${encodeURIComponent(table)}&limit=10`, {
          headers: buildAuthHeaders(),
        });
        const data = (await r.json()) as { ok?: boolean; columns?: string[] };
        if (r.ok && data.ok && active) {
          const list = data.columns || [];
          setColumns(list);
          setColumn(list[0] || '');
          setSortCol(list[0] || '');
        }
      } catch {
        // ignore
      }
    };
    loadCols();
    return () => {
      active = false;
    };
  }, [table, buildAuthHeaders]);

  const runQuery = async (override?: Partial<SavedFilter>) => {
    const payload = {
      table: override?.table ?? table,
      column: override?.column ?? column,
      op: override?.op ?? op,
      value: override?.value ?? value,
      sortCol: override?.sortCol ?? sortCol,
      sortDir: override?.sortDir ?? sortDir,
    };
    if (!payload.table) return;
    setRunning(true);
    setErr('');
    try {
      const r = await fetch('/api/check-purchase?action=db-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = (await r.json()) as {
        ok?: boolean;
        ms?: number;
        columns?: string[];
        rows?: RowList;
        error?: string;
      };
      if (!r.ok || !data.ok) {
        setErr(data.error || 'Ошибка выполнения');
      } else {
        setMs(data.ms || 0);
        setResCols(data.columns || []);
        setResRows(data.rows || []);
      }
    } catch {
      setErr('Ошибка сети');
    } finally {
      setRunning(false);
    }
  };

  const handleSave = () => {
    if (!table || !column) return;
    const opLabel = OPS.find((o) => o.id === op)?.label || op;
    const label = `${table}: ${column} ${opLabel}${value ? ` «${value}»` : ''}`;
    const item: SavedFilter = {
      id: `f_${Date.now()}`,
      label,
      table,
      column,
      op,
      value,
      sortCol,
      sortDir,
    };
    const next: SavedFilterList = [item, ...saved].slice(0, 6);
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    showToast('Запрос сохранён в «Мои кнопки»');
  };

  const handleDeleteSaved = (id: string) => {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const needsValue = op !== 'is_null' && op !== 'not_null';

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4 space-y-3">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-[#F5F1EB]">
          <SlidersHorizontal className="w-4 h-4 text-[#C9A86A]" />
          Визуальный конструктор (0% SQL)
        </div>

        {/* Table picker pills */}
        <div>
          <div className="text-[11px] text-[#8D867C] mb-1.5">1. Таблица</div>
          <div className="flex flex-wrap gap-1.5">
            {tables.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTable(t)}
                className={`rounded-lg px-2.5 py-1 text-[12px] font-mono transition ${
                  table === t
                    ? 'bg-[#C9A86A] text-[#121210] font-semibold'
                    : 'bg-[#0F0F0E] border border-white/[0.08] text-[#BDB6AC]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Column picker pills */}
        {columns.length > 0 && (
          <div>
            <div className="text-[11px] text-[#8D867C] mb-1.5">2. Колонка для фильтра</div>
            <div className="flex flex-wrap gap-1.5">
              {columns.slice(0, 14).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColumn(c)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-mono transition ${
                    column === c
                      ? 'bg-white/[0.18] text-[#F5F1EB] border border-[#C9A86A]/50'
                      : 'bg-[#0F0F0E] border border-white/[0.06] text-[#9A9389]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Condition pills */}
        <div>
          <div className="text-[11px] text-[#8D867C] mb-1.5">3. Условие</div>
          <div className="flex flex-wrap gap-1.5">
            {OPS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOp(o.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] transition ${
                  op === o.id
                    ? 'bg-[#5B9BFF]/20 text-[#5B9BFF] border border-[#5B9BFF]/45 font-semibold'
                    : 'bg-[#0F0F0E] border border-white/[0.06] text-[#BDB6AC]'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {needsValue && (
          <div>
            <div className="text-[11px] text-[#8D867C] mb-1.5">4. Значение</div>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Например: Nike, 2026, pro_pigments..."
              style={DARK_INPUT_STYLE}
              className="w-full rounded-xl border border-white/15 px-3 py-2 text-[13px] focus:outline-none focus:border-[#C9A86A]"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            disabled={running || !table}
            onClick={() => runQuery()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#C9A86A] px-4 py-2 text-[13px] font-semibold text-[#121210] disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            {running ? 'Поиск...' : 'Найти записи'}
          </button>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            className="rounded-xl border border-white/10 bg-[#0F0F0E] px-3 py-2 text-[11px] text-[#DED7CC]"
          >
            Сортировка: {sortDir === 'desc' ? 'Сначала новые ↓' : 'Сначала старые ↑'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1 rounded-xl border border-[#C9A86A]/35 px-3 py-2 text-[11px] text-[#C9A86A]"
          >
            <BookmarkPlus className="w-3.5 h-3.5" /> Сохранить кнопку
          </button>
        </div>
      </div>

      {/* Saved user buttons */}
      {saved.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5 space-y-2">
          <div className="text-[12px] font-semibold text-[#A8A095]">★ Мои сохранённые кнопки</div>
          <div className="space-y-1.5">
            {saved.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#0F0F0E] px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    setTable(item.table);
                    setColumn(item.column);
                    setOp(item.op);
                    setValue(item.value);
                    setSortCol(item.sortCol);
                    setSortDir(item.sortDir);
                    runQuery(item);
                  }}
                  className="text-left text-[12px] text-[#F5F1EB] truncate flex-1"
                >
                  {item.label}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSaved(item.id)}
                  className="p-1 text-[#8D867C] hover:text-[#F06A7E]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-[#F06A7E]/40 bg-[#F06A7E]/10 px-3 py-2 text-[12px] text-[#F06A7E]">
          {err}
        </div>
      )}

      {resRows.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5 space-y-2">
          <div className="text-[12px] font-mono text-[#C9A86A]">
            Найдено: {resRows.length} стр. ({ms} мс)
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0B0B0A]">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="border-b border-white/[0.08] text-[#8D867C]">
                <tr>
                  {resCols.slice(0, 8).map((c) => (
                    <th key={c} className="px-2.5 py-2 whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-[#DED7CC]">
                {resRows.map((row, idx) => (
                  <tr key={idx}>
                    {resCols.slice(0, 8).map((c) => (
                      <td key={c} className="px-2.5 py-1.5 whitespace-nowrap">
                        {previewCell(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

