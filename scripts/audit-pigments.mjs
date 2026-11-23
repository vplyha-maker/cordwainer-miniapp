import fs from 'node:fs';
import path from 'node:path';

// CIE 1931 2° observer + D65 illuminant (380..780 nm, step 10 nm)
const WL_GRID = [
  380, 390, 400, 410, 420, 430, 440, 450, 460, 470, 480, 490, 500, 510, 520,
  530, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 640, 650, 660, 670,
  680, 690, 700, 710, 720, 730, 740, 750, 760, 770, 780,
];

const D65 = [
  49.98, 54.65, 82.75, 91.49, 93.43, 86.68, 104.86, 117.01, 117.81, 114.86,
  115.92, 108.81, 109.35, 107.80, 104.79, 107.69, 104.41, 104.05, 100.00, 96.33,
  95.79, 88.69, 90.01, 89.60, 87.70, 83.29, 83.70, 80.03, 80.21, 82.28, 78.28,
  69.72, 71.61, 74.35, 61.60, 69.89, 75.09, 63.59, 46.42, 66.81, 63.38,
];

const X_BAR = [
  0.0014, 0.0042, 0.0143, 0.0435, 0.1344, 0.2839, 0.3483, 0.3362, 0.2908,
  0.1954, 0.0956, 0.0320, 0.0049, 0.0093, 0.0633, 0.1655, 0.2904, 0.4334,
  0.5945, 0.7621, 0.9163, 1.0263, 1.0622, 1.0026, 0.8544, 0.6424, 0.4479,
  0.2835, 0.1649, 0.0874, 0.0468, 0.0227, 0.0114, 0.0058, 0.0029, 0.0014,
  0.0007, 0.0003, 0.0002, 0.0001, 0.0000,
];

const Y_BAR = [
  0.0000, 0.0001, 0.0004, 0.0012, 0.0040, 0.0116, 0.0230, 0.0380, 0.0600,
  0.0910, 0.1390, 0.2080, 0.3230, 0.5030, 0.7100, 0.8620, 0.9540, 0.9950,
  0.9950, 0.9520, 0.8700, 0.7570, 0.6310, 0.5030, 0.3810, 0.2650, 0.1750,
  0.1070, 0.0610, 0.0320, 0.0170, 0.0082, 0.0041, 0.0021, 0.0010, 0.0005,
  0.0002, 0.0001, 0.0001, 0.0000, 0.0000,
];

const Z_BAR = [
  0.0065, 0.0201, 0.0679, 0.2074, 0.6456, 1.3856, 1.7471, 1.7721, 1.6692,
  1.2876, 0.8130, 0.4652, 0.2720, 0.1582, 0.0782, 0.0422, 0.0203, 0.0087,
  0.0039, 0.0021, 0.0017, 0.0011, 0.0008, 0.0003, 0.0002, 0.0000, 0.0000,
  0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000,
  0.0000, 0.0000, 0.0000, 0.0000, 0.0000,
];

const NORM_Y = WL_GRID.reduce((s, _, i) => s + D65[i] * Y_BAR[i], 0);
const WHITE_X = (WL_GRID.reduce((s, _, i) => s + D65[i] * X_BAR[i], 0) / NORM_Y) * 100;
const WHITE_Y = 100;
const WHITE_Z = (WL_GRID.reduce((s, _, i) => s + D65[i] * Z_BAR[i], 0) / NORM_Y) * 100;

function walkTxtFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTxtFiles(full, out);
    else if (entry.isFile() && /\.txt$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function parseSpectrumFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const points = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('//')) continue;
    const parts = t.split(/[\s,;]+/);
    if (parts.length < 2) continue;
    const wl = Number(parts[0]);
    const val = Number(parts[1]);
    if (Number.isFinite(wl) && Number.isFinite(val)) {
      points.push([wl, val]);
    }
  }
  const visPoints = points.filter(([wl]) => wl >= 380 && wl <= 780);
  if (visPoints.length < 20) return null;

  points.sort((a, b) => a[0] - b[0]);
  const maxRaw = visPoints.reduce((m, [, v]) => Math.max(m, v), -Infinity);
  const scale = maxRaw > 1.5 ? 100 : 1;

  const curve = WL_GRID.map((targetWl) => {
    let lo = 0;
    let hi = points.length - 1;
    if (targetWl <= points[0][0]) return Math.max(0, Math.min(1, points[0][1] / scale));
    if (targetWl >= points[hi][0]) return Math.max(0, Math.min(1, points[hi][1] / scale));
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (points[mid][0] <= targetWl) lo = mid;
      else hi = mid;
    }
    const [w0, v0] = points[lo];
    const [w1, v1] = points[hi];
    const ratio = w1 === w0 ? 0 : (targetWl - w0) / (w1 - w0);
    const v = (v0 + (v1 - v0) * ratio) / scale;
    return Math.max(0, Math.min(1, v));
  });

  const visMin = visPoints.reduce((m, [, v]) => Math.min(m, v / scale), Infinity);
  const visMax = visPoints.reduce((m, [, v]) => Math.max(m, v / scale), -Infinity);
  const hasNeg = visPoints.some(([, v]) => v < 0);
  const hasOver100 = visPoints.some(([, v]) => v / scale > 1.05);

  return {
    curve,
    wlMin: points[0][0],
    wlMax: points[points.length - 1][0],
    visCount: visPoints.length,
    visMinPct: +(visMin * 100).toFixed(1),
    visMaxPct: +(visMax * 100).toFixed(1),
    scale,
    hasNeg,
    hasOver100,
  };
}

function spectrumToColor(curve) {
  let X = 0;
  let Y = 0;
  let Z = 0;
  for (let i = 0; i < WL_GRID.length; i += 1) {
    const r = curve[i];
    X += r * D65[i] * X_BAR[i];
    Y += r * D65[i] * Y_BAR[i];
    Z += r * D65[i] * Z_BAR[i];
  }
  X = (X / NORM_Y) * 100;
  Y = (Y / NORM_Y) * 100;
  Z = (Z / NORM_Y) * 100;

  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X / WHITE_X);
  const fy = f(Y / WHITE_Y);
  const fz = f(Z / WHITE_Z);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  const C = Math.hypot(a, b);

  const x1 = X / 100;
  const y1 = Y / 100;
  const z1 = Z / 100;
  const lin = [
    3.2406 * x1 - 1.5372 * y1 - 0.4986 * z1,
    -0.9689 * x1 + 1.8758 * y1 + 0.0415 * z1,
    0.0557 * x1 - 0.2040 * y1 + 1.0570 * z1,
  ];
  const toByte = (c) => {
    const cl = Math.max(0, Math.min(1, c));
    const g = cl <= 0.0031308 ? 12.92 * cl : 1.055 * Math.pow(cl, 1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(255, g * 255)));
  };
  const hex = '#' + lin.map((v) => toByte(v).toString(16).padStart(2, '0')).join('').toUpperCase();

  return { L: +L.toFixed(1), a: +a.toFixed(1), b: +b.toFixed(1), C: +C.toFixed(1), hex };
}

function classifyFlags(fileName, spec, col) {
  const n = fileName.toLowerCase();
  const flags = [];
  const isWhiteLike = /(white|chalk|gypsum|kaolin|calcite|titanium|zinc|lead_white|kreide|baryt|lithopone|pw\d)/.test(n);
  const isBlackGrey = /(black|charcoal|ivory|bone|lamp|carbon|graphite|slate|grey|gray|ash|pbk\d)/.test(n);
  const isYellow = /(yellow|gold|ochre|ocher|sienna|massicot|orpiment|gamboge|saffron|py\d)/.test(n);
  const isPurpleViolet = /(purple|violet|tyrian|mauve|magenta|pv\d|nr18)/.test(n);
  const isRed = /(red|carmine|madder|vermilion|cinnabar|crimson|cochineal|alizarin|scarlet|pr\d)/.test(n);
  const isBlue = /(blue|indigo|ultramarine|cobalt|azurite|smalt|prussian|cerulean|phthalo_blue|pb\d)/.test(n);
  const isGreen = /(green|malachite|viridian|verdigris|emerald|celadonite|pg\d)/.test(n);

  if (spec.hasNeg) flags.push('NEG_VAL');
  if (spec.hasOver100) flags.push('OVER_100%');
  if (spec.wlMin > 390 || spec.wlMax < 760) flags.push('SHORT_RANGE');

  if (!isWhiteLike && !isYellow && col.L >= 65 && col.C < 16) {
    flags.push('WASHED_OUT');
  }
  if (!isWhiteLike && !isBlackGrey && col.C < 6 && col.L > 15 && col.L < 85) {
    flags.push('FLAT_GREY');
  }
  if ((isPurpleViolet || isRed || isBlue || isGreen) && col.C < 12) {
    flags.push('LOW_CHROMA');
  }
  if (isBlackGrey && col.L > 38) {
    flags.push('TOO_LIGHT_BLACK');
  }
  if (isWhiteLike && col.L < 75) {
    flags.push('TOO_DARK_WHITE');
  }

  return flags;
}

const targetDir = process.argv[2] || 'public';
const files = walkTxtFiles(targetDir);
const rows = [];

for (const f of files) {
  const spec = parseSpectrumFile(f);
  if (!spec) continue;
  const col = spectrumToColor(spec.curve);
  const rel = path.relative(process.cwd(), f).replace(/\\/g, '/');
  const base = path.basename(f);
  const flags = classifyFlags(base, spec, col);
  rows.push({ rel, base, ...spec, ...col, flags });
}

rows.sort((a, b) => b.flags.length - a.flags.length || a.base.localeCompare(b.base));
const flagged = rows.filter((r) => r.flags.length > 0);

const lines = [];
lines.push(`# Spectral Pigment Audit (${rows.length} files scanned)`);
lines.push('');
lines.push(`- **Total spectral files:** ${rows.length}`);
lines.push(`- **Flagged for review:** ${flagged.length}`);
lines.push(`- **Clean:** ${rows.length - flagged.length}`);
lines.push('');

if (flagged.length > 0) {
  lines.push('## Flagged Pigments');
  lines.push('');
  lines.push('| File | HEX | L* | a* | b* | C* | R(380-780)% | Flags |');
  lines.push('| :--- | :---: | ---: | ---: | ---: | ---: | :---: | :--- |');
  for (const r of flagged) {
    lines.push(
      `| \`${r.base}\` | \`${r.hex}\` | ${r.L} | ${r.a} | ${r.b} | ${r.C} | ${r.visMinPct}–${r.visMaxPct}% | **${r.flags.join(', ')}** |`,
    );
  }
  lines.push('');
}

lines.push('## All Pigments (Full Table)');
lines.push('');
lines.push('| File | HEX | L* | a* | b* | C* | R(380-780)% | Status |');
lines.push('| :--- | :---: | ---: | ---: | ---: | ---: | :---: | :--- |');
for (const r of rows) {
  lines.push(
    `| \`${r.base}\` | \`${r.hex}\` | ${r.L} | ${r.a} | ${r.b} | ${r.C} | ${r.visMinPct}–${r.visMaxPct}% | ${r.flags.length ? r.flags.join(', ') : 'OK'} |`,
  );
}

const report = lines.join('\n');
console.log(report);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
}

