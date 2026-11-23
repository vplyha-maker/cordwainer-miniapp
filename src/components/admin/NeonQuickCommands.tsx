import React, { useState } from 'react';
import { Download, Play, ShieldCheck, Sparkles, Wrench, Zap } from 'lucide-react';
import { copyTextToClipboard, isTelegramWebView } from './exportUtils';
import { DARK_INPUT_STYLE } from './types';

type RowMap = Record<string, unknown>;
type RowList = RowMap[];

type NeonQuickCommandsProps = {
  buildAuthHeaders: () => Record<string, string>;
  showToast: (msg: string) => void;
};

type PresetDef = {
  id: string;
  label: string;
  hint: string;
};

const BUSINESS_CMDS: PresetDef[] = [
  { id: 'recent_orders', label: 'Последние заказы', hint: 'orders (25)' },
  { id: 'pro_owners', label: 'Владельцы PRO', hint: 'user_purchases' },
  { id: 'top_brands', label: 'Топ брендов', hint: 'sneakers' },
  { id: 'top_favorites', label: 'Избранное', hint: 'user_favorites' },
  { id: 'today_activity', label: 'Активность сегодня', hint: 'TG + Web' },
];

const AUDIT_CMDS: PresetDef[] = [
  { id: 'r2_audit', label: 'Сверка Neon ↔ R2', hint: 'Битые фото' },
  { id: 'pro_dupes', label: 'Поиск дублей PRO', hint: 'user_purchases' },
  { id: 'indexes_info', label: 'Индексы таблиц', hint: 'pg_indexes' },
];

function previewCell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 60);
  const s = String(v);
  return s.length > 56 ? `${s.slice(0, 56)}…` : s;
}

export const NeonQuickCommands: React.FC<NeonQuickCommandsProps> = ({
  buildAuthHeaders,
  showToast,
}) => {
  const [runningId, setRunningId] = useState<string>('');
  const [resultTitle, setResultTitle] = useState<string>('');
  const [resultMs, setResultMs] = useState<number>(0);
  const [cols, setCols] = useState<string[]>([]);
  const [rows, setRows] = useState<RowList>([]);
  const [err, setErr] = useState<string>('');

  const [showRawSql, setShowRawSql] = useState<boolean>(false);
  const [sqlText, setSqlText] = useState<string>(
    'SELECT user_id, COUNT(*) AS mods FROM user_purchases GROUP BY user_id ORDER BY mods DESC',
  );

  const runPreset = async (presetId: string, label: string) => {
    setRunningId(presetId);
    setErr('');
    try {
      const r = await fetch('/api/check-purchase?action=db-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ preset: presetId }),
      });
      const data = (await r.json()) as {
        ok?: boolean;
        ms?: number;
        columns?: string[];
        rows?: RowList;
        message?: string;
        error?: string;
      };
      if (!r.ok || !data.ok) {
        setErr(data.error || 'Команда завершилась с ошибкой');
      } else {
        setResultTitle(label);
        setResultMs(data.ms || 0);
        setCols(data.columns || []);
        setRows(data.rows || []);
        if (data.message) showToast(data.message);
      }
    } catch {
      setErr('Ошибка сети');
    } finally {
      setRunningId('');
    }
  };

  const runCleanup = async (mode: 'otp' | 'old_events') => {
    const text = mode === 'otp' ? 'старые OTP-логи (>7 дн.)' : 'события старше 90 дней';
    if (!window.confirm(`Очистить ${text}?`)) return;
    setRunningId(mode);
    try {
      const r = await fetch('/api/check-purchase?action=db-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ mode }),
      });
      const data = (await r.json()) as { ok?: boolean; deleted?: number; error?: string };
      if (r.ok && data.ok) showToast(`Удалено записей: ${data.deleted ?? 0}`);
      else showToast(data.error || 'Ошибка очистки');
    } catch {
      showToast('Ошибка сети');
    } finally {
      setRunningId('');
    }
  };

  const runCustomSelect = async () => {
    setRunningId('raw_sql');
    setErr('');
    try {
      const r = await fetch('/api/check-purchase?action=db-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ query: sqlText }),
      });
      const data = (await r.json()) as {
        ok?: boolean;
        ms?: number;
        columns?: string[];
        rows?: RowList;
        error?: string;
      };
      if (!r.ok || !data.ok) {
        setErr(data.error || 'Ошибка SQL');
      } else {
        setResultTitle('Свой SELECT');
        setResultMs(data.ms || 0);
        setCols(data.columns || []);
        setRows(data.rows || []);
      }
    } catch {
      setErr('Ошибка сети');
    } finally {
      setRunningId('');
    }
  };

  const exportResultCsv = async () => {
    if (rows.length === 0 || cols.length === 0) return;
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = '\uFEFF' + [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
    if (isTelegramWebView()) {
      await copyTextToClipboard(csv);
      showToast('CSV результата скопирован в буфер');
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neon-command-${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('CSV скачан');
  };

  return (
    <div className="space-y-3">
      {/* Group 1: Business */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5 space-y-2.5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#F5F1EB]">
          <Zap className="w-4 h-4 text-[#C9A86A]" /> Бизнес и каталог (1 тап)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BUSINESS_CMDS.map((cmd) => (
            <button
              key={cmd.id}
              type="button"
              disabled={Boolean(runningId)}
              onClick={() => runPreset(cmd.id, cmd.label)}
              className="rounded-xl border border-white/[0.08] bg-[#0F0F0E] px-3 py-2.5 text-left hover:border-[#C9A86A]/45 transition disabled:opacity-50"
            >
              <div className="text-[12px] font-semibold text-[#F5F1EB]">{cmd.label}</div>
              <div className="text-[10px] font-mono text-[#8D867C] mt-0.5">
                {runningId === cmd.id ? 'Выполняется...' : cmd.hint}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Group 2: Diagnostics & R2 Audit */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5 space-y-2.5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#F5F1EB]">
          <ShieldCheck className="w-4 h-4 text-[#3FD08F]" /> Диагностика и сверка с R2
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {AUDIT_CMDS.map((cmd) => (
            <button
              key={cmd.id}
              type="button"
              disabled={Boolean(runningId)}
              onClick={() => runPreset(cmd.id, cmd.label)}
              className={`rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-50 ${
                cmd.id === 'r2_audit'
                  ? 'border-[#C9A86A]/35 bg-[#16140F]'
                  : 'border-white/[0.08] bg-[#0F0F0E]'
              }`}
            >
              <div className="text-[12px] font-semibold text-[#F5F1EB]">{cmd.label}</div>
              <div className="text-[10px] font-mono text-[#8D867C] mt-0.5">
                {runningId === cmd.id ? 'Проверка...' : cmd.hint}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Group 3: Maintenance */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#F5F1EB]">
            <Wrench className="w-4 h-4 text-[#5B9BFF]" /> Обслуживание Neon
          </div>
          <button
            type="button"
            onClick={() => setShowRawSql((v) => !v)}
            className="text-[11px] text-[#C9A86A] font-mono"
          >
            {showRawSql ? 'Скрыть SQL' : 'SQL-консоль ▾'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(runningId)}
            onClick={() => runPreset('analyze', 'ANALYZE')}
            className="rounded-xl border border-[#3FD08F]/35 bg-[#3FD08F]/10 px-3 py-2 text-[12px] font-semibold text-[#3FD08F] disabled:opacity-50"
          >
            Ускорить БД (ANALYZE)
          </button>
          <button
            type="button"
            disabled={Boolean(runningId)}
            onClick={() => runCleanup('otp')}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-[#DED7CC] disabled:opacity-50"
          >
            Очистить OTP &gt;7д
          </button>
          <button
            type="button"
            disabled={Boolean(runningId)}
            onClick={() => runCleanup('old_events')}
            className="rounded-xl border border-[#F06A7E]/30 bg-[#F06A7E]/10 px-3 py-2 text-[12px] text-[#F06A7E] disabled:opacity-50"
          >
            События &gt;90д
          </button>
        </div>

        {showRawSql && (
          <div className="pt-2 space-y-2">
            <textarea
              rows={3}
              value={sqlText}
              onChange={(e) => setSqlText(e.target.value)}
              style={DARK_INPUT_STYLE}
              className="w-full rounded-xl border border-white/15 p-2.5 font-mono text-[12px] focus:outline-none focus:border-[#C9A86A]"
            />
            <button
              type="button"
              disabled={Boolean(runningId)}
              onClick={runCustomSelect}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#C9A86A] px-3.5 py-2 text-[12px] font-semibold text-[#121210]"
            >
              <Play className="w-3.5 h-3.5" /> Выполнить SELECT (только чтение)
            </button>
          </div>
        )}
      </div>

      {err && (
        <div className="rounded-xl border border-[#F06A7E]/40 bg-[#F06A7E]/10 px-3.5 py-2.5 text-[12px] text-[#F06A7E]">
          {err}
        </div>
      )}

      {/* Result Table */}
      {resultTitle && (
        <div className="rounded-2xl border border-[#C9A86A]/30 bg-[#141412] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#C9A86A]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{resultTitle}</span>
              <span className="font-mono text-[11px] text-[#8D867C]">
                ({rows.length} стр. · {resultMs} мс)
              </span>
            </div>
            {rows.length > 0 && (
              <button
                type="button"
                onClick={exportResultCsv}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-[#DED7CC]"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="text-[12px] text-[#3FD08F] py-3">Ничего не найдено (проблем / записей нет).</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0B0B0A]">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="border-b border-white/[0.08] text-[#8D867C]">
                  <tr>
                    {cols.map((c) => (
                      <th key={c} className="px-2.5 py-2 whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-[#DED7CC]">
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      {cols.map((c) => (
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
        </div>
      )}
    </div>
  );
};

