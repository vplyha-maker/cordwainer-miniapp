import type { AdminStats } from './types';

export type ExportOutcome = 'shared' | 'downloaded' | 'preview';

type TgWindow = {
  Telegram?: {
    WebApp?: {
      initData?: string;
    };
  };
};

export function isTelegramWebView(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as unknown as TgWindow).Telegram?.WebApp?.initData);
}

function csvCell(val: string | number | boolean): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildUsersCsv(stats: AdminStats): string {
  const header = ['user_id', 'username', 'first_name', 'source', 'platform', 'lang', 'last_page', 'events', 'pro_count', 'is_banned', 'last_seen'];
  const rows = stats.users.map((u) =>
    [
      u.user_id,
      u.username,
      u.first_name,
      u.source,
      u.platform,
      u.lang,
      u.last_page,
      u.events,
      u.pro_count,
      u.is_banned ? 'yes' : 'no',
      u.last_seen,
    ]
      .map(csvCell)
      .join(','),
  );
  return '\uFEFF' + [header.join(','), ...rows].join('\n');
}

export function buildPagesCsv(stats: AdminStats): string {
  const header = ['page', 'tg_unique', 'web_unique', 'total_events'];
  const rows = stats.pages.map((p) =>
    [p.page, p.tg, p.web, p.events].map(csvCell).join(','),
  );
  return '\uFEFF' + [header.join(','), ...rows].join('\n');
}

function xmlEsc(v: string | number): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function makeSheet(name: string, headers: string[], rows: Array<Array<string | number>>): string {
  const headXml =
    '<Row>' +
    headers.map((h) => `<Cell><Data ss:Type="String">${xmlEsc(h)}</Data></Cell>`).join('') +
    '</Row>';
  const bodyXml = rows
    .map(
      (r) =>
        '<Row>' +
        r
          .map((c) => {
            const isNum = typeof c === 'number' && Number.isFinite(c);
            return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${xmlEsc(c)}</Data></Cell>`;
          })
          .join('') +
        '</Row>',
    )
    .join('');
  return `<Worksheet ss:Name="${xmlEsc(name)}"><Table>${headXml}${bodyXml}</Table></Worksheet>`;
}

export function buildExcelXml(stats: AdminStats, days: number): string {
  const summarySheet = makeSheet(
    'Summary',
    ['Metric', 'Value'],
    [
      ['Period (days)', days],
      ['Telegram Unique', stats.summary.tgUnique],
      ['Web Unique', stats.summary.webUnique],
      ['Total Events', stats.summary.totalEvents],
      ['New Users', stats.summary.newUsers],
      ['Returning Users', stats.summary.returningUsers],
      ['Retention 30d (%)', stats.summary.retention30d],
      ['PRO Activations (Neon)', stats.summary.proTotal],
      ['PRO Stars (est.)', stats.summary.proStars],
      ['PRO USD (est.)', stats.summary.proUsdEst],
    ],
  );

  const pagesSheet = makeSheet(
    'Pages',
    ['Page', 'TG Unique', 'Web Unique', 'Events'],
    stats.pages.map((p) => [p.page, p.tg, p.web, p.events]),
  );

  const usersSheet = makeSheet(
    'Users',
    ['User ID', 'Username', 'Source', 'Platform', 'Last Page', 'Events', 'PRO', 'Banned'],
    stats.users.map((u) => [
      u.user_id,
      u.username || u.first_name || 'Guest',
      u.source,
      u.platform,
      u.last_page,
      u.events,
      u.pro_count,
      u.is_banned ? 'YES' : 'NO',
    ]),
  );

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${summarySheet}${pagesSheet}${usersSheet}
</Workbook>`;
}

export function buildReportSummaryText(stats: AdminStats, days: number): string {
  const periodLabel = days >= 3650 ? 'Всё время' : `${days} дн.`;
  const topPages = stats.pages
    .slice(0, 6)
    .map((p, idx) => `${idx + 1}. ${p.page}: TG ${p.tg} · Web ${p.web} (${p.events} соб.)`)
    .join('\n');
  const proLines = stats.proBreakdown
    .map((p) => `• ${p.product_id}: ${p.count} (${p.stars} ★)`)
    .join('\n');

  return [
    `CORDWAINE · Аналитический отчёт (${periodLabel})`,
    `Сформирован: ${new Date().toLocaleString('ru-RU')}`,
    '',
    `— Telegram уник.: ${stats.summary.tgUnique}`,
    `— Web уник.: ${stats.summary.webUnique}`,
    `— Всего событий: ${stats.summary.totalEvents} (${stats.summary.avgEventsPerUser} / чел.)`,
    `— Новые / Возвраты: ${stats.summary.newUsers} / ${stats.summary.returningUsers} (Retention 30д: ${stats.summary.retention30d}%)`,
    `— PRO в Neon (всего): ${stats.summary.proTotal} · ${stats.summary.proStars} ★ (усл. ~$${stats.summary.proUsdEst})`,
    '',
    'Топ разделов:',
    topPages || 'Нет данных',
    '',
    'PRO-модули (Neon):',
    proLines || 'Нет активаций',
  ].join('\n');
}

async function shareOrDownload(
  filename: string,
  content: string,
  mimeType: string,
): Promise<ExportOutcome> {
  if (isTelegramWebView()) {
    try {
      const file = new File([content], filename, { type: mimeType });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({ files: [file], title: filename });
        return 'shared';
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        return 'shared';
      }
    }
    return 'preview';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return 'downloaded';
}

export async function exportUsersCsv(stats: AdminStats): Promise<ExportOutcome> {
  const dateTag = new Date().toISOString().slice(0, 10);
  return shareOrDownload(`cordwaine-users-${dateTag}.csv`, buildUsersCsv(stats), 'text/csv;charset=utf-8');
}

export async function exportPagesCsv(stats: AdminStats): Promise<ExportOutcome> {
  const dateTag = new Date().toISOString().slice(0, 10);
  return shareOrDownload(`cordwaine-pages-${dateTag}.csv`, buildPagesCsv(stats), 'text/csv;charset=utf-8');
}

export async function exportExcelWorkbook(stats: AdminStats, days: number): Promise<ExportOutcome> {
  const dateTag = new Date().toISOString().slice(0, 10);
  return shareOrDownload(
    `cordwaine-report-${dateTag}.xls`,
    buildExcelXml(stats, days),
    'application/vnd.ms-excel',
  );
}

export function printEditorialReport(stats: AdminStats, days: number): boolean {
  if (isTelegramWebView()) return false;
  const win = window.open('', '_blank', 'width=900,height=720');
  if (!win) return false;

  const periodLabel = days >= 3650 ? 'Всё время' : `${days} дн.`;
  const pageRows = stats.pages
    .map(
      (p) =>
        `<tr><td>${xmlEsc(p.page)}</td><td>${p.tg}</td><td>${p.web}</td><td>${p.events}</td></tr>`,
    )
    .join('');

  win.document.write(`<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>CORDWAINE Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; color: #171512; padding: 32px; max-width: 820px; margin: 0 auto; }
  h1 { font-size: 24px; margin: 0 0 6px; letter-spacing: -0.02em; }
  .sub { color: #6B655D; font-size: 13px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .card { border: 1px solid #E5DFD5; border-radius: 10px; padding: 12px; }
  .label { font-size: 11px; color: #7A746B; text-transform: uppercase; letter-spacing: 0.04em; }
  .val { font-size: 22px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th, td { border-bottom: 1px solid #EAE4DB; padding: 8px 6px; text-align: left; }
  th { font-size: 11px; text-transform: uppercase; color: #7A746B; }
</style></head><body>
  <h1>CORDWAINE · Аналитический отчёт</h1>
  <div class="sub">Период: ${periodLabel} · Сформирован: ${new Date().toLocaleString('ru-RU')}</div>
  <div class="grid">
    <div class="card"><div class="label">Telegram уник.</div><div class="val">${stats.summary.tgUnique}</div></div>
    <div class="card"><div class="label">Web уник.</div><div class="val">${stats.summary.webUnique}</div></div>
    <div class="card"><div class="label">События</div><div class="val">${stats.summary.totalEvents}</div></div>
    <div class="card"><div class="label">PRO (Neon)</div><div class="val">${stats.summary.proTotal}</div></div>
  </div>
  <h3>Рейтинг разделов</h3>
  <table><thead><tr><th>Раздел</th><th>Telegram</th><th>Web</th><th>Событий</th></tr></thead><tbody>${pageRows || '<tr><td colspan="4">Нет данных</td></tr>'}</tbody></table>
</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 250);
  return true;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
