import type { StatsPayload } from './types'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

function escapeCsv(val: unknown): string {
  const s = String(val ?? '')
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function escapeXml(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildDateStamp(days: number): string {
  const d = new Date().toISOString().slice(0, 10)
  const p = days >= 3650 ? 'all' : `${days}d`
  return `cordwaine-analytics-${p}-${d}`
}

export function exportUsersCsv(stats: StatsPayload) {
  const headers = [
    'user_id',
    'source',
    'username',
    'first_name',
    'platform',
    'lang',
    'events_count',
    'active_days',
    'pro_count',
    'last_page',
    'first_seen',
    'last_seen',
  ]
  const rows = stats.users.map((u) =>
    [
      u.user_id,
      u.source,
      u.username || '',
      u.first_name || '',
      u.platform || '',
      u.lang || '',
      u.events_count,
      u.active_days,
      u.pro_count,
      u.last_page || '',
      u.first_seen,
      u.last_seen,
    ]
      .map(escapeCsv)
      .join(',')
  )
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
  triggerDownload(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    `${buildDateStamp(stats.days)}-users.csv`
  )
}

export function exportPagesCsv(stats: StatsPayload) {
  const headers = ['page', 'tg_users', 'web_users', 'opens']
  const rows = stats.topPages.map((p) =>
    [p.page, p.tg_users, p.web_users, p.opens].map(escapeCsv).join(',')
  )
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
  triggerDownload(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    `${buildDateStamp(stats.days)}-pages.csv`
  )
}

function buildWorksheetXml(name: string, rows: (string | number)[][]): string {
  const body = rows
    .map(
      (r) =>
        '<Row>' +
        r
          .map((cell) => {
            const isNum = typeof cell === 'number' && Number.isFinite(cell)
            return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(
              cell
            )}</Data></Cell>`
          })
          .join('') +
        '</Row>'
    )
    .join('')
  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${body}</Table></Worksheet>`
}

export function exportWorkbookExcel(stats: StatsPayload) {
  const summarySheet = buildWorksheetXml('Summary', [
    ['Показатель', 'Значение'],
    ['Период (дней)', stats.days],
    ['Telegram уникальные', stats.summary.tg_users],
    ['Web уникальные', stats.summary.web_users],
    ['Новые пользователи', stats.summary.new_users],
    ['Вернувшиеся пользователи', stats.summary.returning_users],
    ['Всего событий', stats.summary.total_events],
    ['Среднее событий / чел', stats.summary.avg_events_per_user],
    ['Retention 30д (%)', stats.summary.retention_pct],
    ['PRO-доступов в Neon', stats.summary.total_pro],
    ['Оценка в Stars', stats.summary.total_stars],
    ['Расчётный эквивалент USD', stats.summary.total_net_usd],
  ])

  const pagesSheet = buildWorksheetXml('Pages', [
    ['Раздел', 'TG уник.', 'Web уник.', 'Открытия'],
    ...stats.topPages.map((p) => [p.page, p.tg_users, p.web_users, p.opens]),
  ])

  const proSheet = buildWorksheetXml('PRO_Modules', [
    ['Модуль', 'Активаций', 'Stars', 'Расчётный USD'],
    ...stats.proBreakdown.map((r) => [r.product_id, r.count, r.stars, r.net_usd]),
  ])

  const usersSheet = buildWorksheetXml('Users', [
    ['ID', 'Источник', 'Username', 'Имя', 'Платформа', 'Язык', 'Событий', 'PRO'],
    ...stats.users.map((u) => [
      u.user_id,
      u.source,
      u.username || '',
      u.first_name || '',
      u.platform || '',
      u.lang || '',
      u.events_count,
      u.pro_count,
    ]),
  ])

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    summarySheet +
    pagesSheet +
    proSheet +
    usersSheet +
    `</Workbook>`

  triggerDownload(
    new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' }),
    `${buildDateStamp(stats.days)}.xls`
  )
}

export function exportEditorialPdfReport(stats: StatsPayload) {
  const periodLabel = stats.days >= 3650 ? 'За всё время' : `За ${stats.days} дн.`
  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>CORDWAINE Analytics Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif; color: #141413; background: #fff; margin: 0; padding: 32px; }
  .eyebrow { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #9a723c; font-weight: 700; }
  h1 { font-size: 26px; margin: 6px 0 4px; }
  .meta { font-size: 12px; color: #666; margin-bottom: 24px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { border: 1px solid #e5e2dc; border-radius: 10px; padding: 12px; }
  .kpi-label { font-size: 11px; color: #666; text-transform: uppercase; }
  .kpi-val { font-size: 22px; font-weight: 700; margin-top: 4px; }
  h2 { font-size: 15px; margin: 22px 0 10px; border-bottom: 1px solid #e5e2dc; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #eee; }
  th { font-size: 11px; text-transform: uppercase; color: #666; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <div class="eyebrow">CORDWAINE · COMMAND CENTER</div>
  <h1>Аналитический отчёт</h1>
  <div class="meta">Период: ${periodLabel} · Сформирован: ${new Date().toLocaleString('ru-RU')}</div>

  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Telegram уник.</div><div class="kpi-val">${stats.summary.tg_users}</div></div>
    <div class="kpi"><div class="kpi-label">Web уник.</div><div class="kpi-val">${stats.summary.web_users}</div></div>
    <div class="kpi"><div class="kpi-label">Retention 30д</div><div class="kpi-val">${stats.summary.retention_pct}%</div></div>
    <div class="kpi"><div class="kpi-label">PRO-активаций</div><div class="kpi-val">${stats.summary.total_pro} (${stats.summary.total_stars} ⭐)</div></div>
  </div>

  <h2>Рейтинг разделов</h2>
  <table>
    <thead><tr><th>Раздел</th><th>Telegram</th><th>Web</th><th>Открытий</th></tr></thead>
    <tbody>
      ${stats.topPages
        .map(
          (p) =>
            `<tr><td>${escapeXml(p.page)}</td><td>${p.tg_users}</td><td>${p.web_users}</td><td>${p.opens}</td></tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>Распределение PRO-модулей</h2>
  <table>
    <thead><tr><th>Модуль</th><th>Активаций</th><th>Оценка (Stars)</th><th>Расчётный экв.</th></tr></thead>
    <tbody>
      ${stats.proBreakdown
        .map(
          (r) =>
            `<tr><td>${escapeXml(r.product_id)}</td><td>${r.count}</td><td>${r.stars} ⭐</td><td>~$${r.net_usd}</td></tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 300)
  } else {
    triggerDownload(
      new Blob([html], { type: 'text/html;charset=utf-8' }),
      `${buildDateStamp(stats.days)}-report.html`
    )
  }
}

