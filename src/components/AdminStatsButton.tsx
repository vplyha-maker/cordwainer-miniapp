import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as echarts from 'echarts';
import {
  Activity,
  BarChart3,
  Check,
  ChevronDown,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  KeyRound,
  LogOut,
  RefreshCw,
  ScrollText,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  ActivityStudioChart,
  ConversionFunnelChart,
  DonutCard,
  PagesBarChart,
} from './admin/AdminCharts';
import {
  buildExcelXml,
  buildPagesCsv,
  buildReportSummaryText,
  buildUsersCsv,
  copyTextToClipboard,
  exportExcelWorkbook,
  exportPagesCsv,
  exportUsersCsv,
  printEditorialReport,
} from './admin/exportUtils';
import type {
  AdminStats,
  AdminTab,
  DayDetail,
  FilterPreset,
  HealthData,
  UserProfile,
} from './admin/types';
import {
  DARK_INPUT_STYLE,
  PALETTE,
  PRO_CATALOG,
  formatDelta,
  formatShortDate,
} from './admin/types';

type UserProfileMap = Record<string, UserProfile>;
type PresetList = FilterPreset[];
type AuthMode = 'none' | 'telegram' | 'web';

type TgWindow = {
  Telegram?: {
    WebApp?: {
      initData?: string;
      openLink?: (url: string) => void;
    };
  };
};

type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => Promise<void>;
};

type PreviewModalData = {
  title: string;
  content: string;
  hint: string;
};

const WEB_TOKEN_STORAGE = 'cordwaine_admin_web_token';
const PRESETS_STORAGE = 'cordwaine_admin_presets_v1';

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: 'overview', label: 'Обзор' },
  { id: 'analytics', label: 'Аналитика' },
  { id: 'crm', label: 'PRO · CRM' },
  { id: 'users', label: 'Люди' },
  { id: 'audit', label: 'Журнал' },
  { id: 'system', label: 'Система' },
];

function getTgInitData(): string {
  if (typeof window === 'undefined') return '';
  return (window as unknown as TgWindow).Telegram?.WebApp?.initData || '';
}

function extractUrlAdminToken(): string {
  if (typeof window === 'undefined') return '';
  const m = window.location.hash.match(/admin_token=([0-9a-f.]+)/i);
  return m ? m[1] : '';
}

function hasAdminHash(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hash.toLowerCase();
  const q = new URLSearchParams(window.location.search);
  return h === '#admin' || q.get('admin') === '1';
}

function loadPresets(): PresetList {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE);
    if (!raw) return [{ id: 'p_7_no', label: '7д · Без меня', days: 7, hideAdmin: true }];
    const parsed = JSON.parse(raw) as PresetList;
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : [{ id: 'p_7_no', label: '7д · Без меня', days: 7, hideAdmin: true }];
  } catch {
    return [{ id: 'p_7_no', label: '7д · Без меня', days: 7, hideAdmin: true }];
  }
}

export const AdminStatsButton: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('none');
  const [webToken, setWebToken] = useState<string>('');
  const [mintingLink, setMintingLink] = useState<boolean>(false);

  // One-time Telegram OTP login modal (shown ONLY on /#admin in browser)
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [otpChallengeId, setOtpChallengeId] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpBusy, setOtpBusy] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string>('');
  const [otpInfo, setOtpInfo] = useState<string>('');

  const [open, setOpen] = useState<boolean>(false);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [days, setDays] = useState<number>(7);
  const [hideAdmin, setHideAdmin] = useState<boolean>(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [showSearchBar, setShowSearchBar] = useState<boolean>(false);
  const [showExportBar, setShowExportBar] = useState<boolean>(false);
  const [smartQuery, setSmartQuery] = useState<string>('');
  const [presets, setPresets] = useState<PresetList>(loadPresets);
  const [toast, setToast] = useState<string>('');

  const [chartChannel, setChartChannel] = useState<'all' | 'tg' | 'web'>('all');
  const [chartKind, setChartKind] = useState<'area' | 'line' | 'bar'>('area');
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [dayLoading, setDayLoading] = useState<boolean>(false);
  const activityChartRef = useRef<echarts.ECharts | null>(null);

  const [crmUserId, setCrmUserId] = useState<string>('');
  const [crmProduct, setCrmProduct] = useState<string>('pro_pigments');
  const [crmDropdownOpen, setCrmDropdownOpen] = useState<boolean>(false);
  const [banReason, setBanReason] = useState<string>('');
  const [crmBusy, setCrmBusy] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [userSearch, setUserSearch] = useState<string>('');
  const [userSourceFilter, setUserSourceFilter] = useState<'all' | 'telegram' | 'web'>('all');
  const [userSort, setUserSort] = useState<'recent' | 'events' | 'pro'>('recent');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<UserProfileMap>({});
  const [profileLoadingId, setProfileLoadingId] = useState<string | null>(null);

  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);
  const [previewModal, setPreviewModal] = useState<PreviewModalData | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? '' : prev));
    }, 2800);
  }, []);

  const buildAuthHeaders = useCallback(
    (overrideToken?: string): Record<string, string> => {
      const headers: Record<string, string> = {};
      const initData = getTgInitData();
      if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
      }
      const tok = overrideToken !== undefined ? overrideToken : webToken;
      if (tok) {
        headers['X-Admin-Token'] = tok;
      }
      return headers;
    },
    [webToken],
  );

  useEffect(() => {
    let active = true;

    const verifyAuth = async () => {
      const initData = getTgInitData();
      if (initData) {
        try {
          const r = await fetch('/api/check-purchase?action=stats&check=1', {
            headers: { 'X-Telegram-Init-Data': initData },
          });
          if (r.ok && active) {
            setAuthMode('telegram');
            return;
          }
        } catch {
          // ignore
        }
      }

      const urlToken = extractUrlAdminToken();
      if (urlToken) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        try {
          const r = await fetch('/api/check-purchase?action=stats&check=1', {
            headers: { 'X-Admin-Token': urlToken },
          });
          if (r.ok && active) {
            localStorage.setItem(WEB_TOKEN_STORAGE, urlToken);
            setWebToken(urlToken);
            setAuthMode('web');
            setOpen(true);
            return;
          }
        } catch {
          // ignore
        }
      }

      const savedToken = localStorage.getItem(WEB_TOKEN_STORAGE) || '';
      if (savedToken) {
        try {
          const r = await fetch('/api/check-purchase?action=stats&check=1', {
            headers: { 'X-Admin-Token': savedToken },
          });
          if (r.ok && active) {
            setWebToken(savedToken);
            setAuthMode('web');
            if (hasAdminHash()) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
              setOpen(true);
            }
            return;
          }
          localStorage.removeItem(WEB_TOKEN_STORAGE);
        } catch {
          // ignore
        }
      }

      if (hasAdminHash() && active) {
        setShowOtpModal(true);
      }
    };

    verifyAuth();

    const onHashChange = () => {
      if (hasAdminHash()) {
        if (authMode === 'none') {
          setShowOtpModal(true);
        } else {
          setOpen(true);
        }
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      active = false;
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [authMode]);

  const handleRequestOtp = async () => {
    setOtpBusy(true);
    setOtpError('');
    setOtpInfo('');
    try {
      const r = await fetch('/api/check-purchase?action=otp-request', { method: 'POST' });
      const data = (await r.json()) as { ok?: boolean; challengeId?: string; error?: string };
      if (!r.ok || !data.ok || !data.challengeId) {
        setOtpError(data.error || 'Не удалось отправить код');
      } else {
        setOtpChallengeId(data.challengeId);
        setOtpCode('');
        setOtpInfo('Код отправлен в ваш Telegram. Действует 2 минуты.');
      }
    } catch {
      setOtpError('Ошибка сети');
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = otpCode.replace(/\D/g, '');
    if (clean.length !== 6 || !otpChallengeId) {
      setOtpError('Введите 6 цифр из Telegram');
      return;
    }
    setOtpBusy(true);
    setOtpError('');
    try {
      const r = await fetch('/api/check-purchase?action=otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: otpChallengeId, code: clean }),
      });
      const data = (await r.json()) as { ok?: boolean; token?: string; error?: string };
      if (!r.ok || !data.ok || !data.token) {
        setOtpError(data.error || 'Неверный код');
        return;
      }
      localStorage.setItem(WEB_TOKEN_STORAGE, data.token);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setWebToken(data.token);
      setAuthMode('web');
      setShowOtpModal(false);
      setOtpChallengeId('');
      setOtpCode('');
      setOpen(true);
    } catch {
      setOtpError('Ошибка сети при проверке кода');
    } finally {
      setOtpBusy(false);
    }
  };

  const handleWebLogout = () => {
    localStorage.removeItem(WEB_TOKEN_STORAGE);
    setWebToken('');
    setAuthMode('none');
    setOpen(false);
  };

  const handleMintChromeLink = async (mode: 'open' | 'copy') => {
    if (authMode !== 'telegram') return;
    setMintingLink(true);
    try {
      const r = await fetch('/api/check-purchase?action=web-token', {
        method: 'POST',
        headers: buildAuthHeaders(),
      });
      const data = (await r.json()) as { ok?: boolean; token?: string; error?: string };
      if (!r.ok || !data.ok || !data.token) {
        showToast(data.error || 'Не удалось создать ссылку');
        return;
      }
      const magicUrl = `${window.location.origin}/#admin_token=${data.token}`;
      if (mode === 'copy') {
        const copied = await copyTextToClipboard(magicUrl);
        showToast(copied ? 'Ссылка (12 ч) скопирована — вставьте в Chrome' : 'Не удалось скопировать');
        return;
      }
      const tgWebApp = (window as unknown as TgWindow).Telegram?.WebApp;
      if (tgWebApp && typeof tgWebApp.openLink === 'function') {
        tgWebApp.openLink(magicUrl);
        showToast('Открываю панель в Chrome...');
      } else {
        window.open(magicUrl, '_blank');
      }
    } catch {
      showToast('Ошибка сети при выпуске ссылки');
    } finally {
      setMintingLink(false);
    }
  };

  const fetchStats = useCallback(async () => {
    if (authMode === 'none') return;
    setLoading(true);
    setError('');
    try {
      const url = `/api/check-purchase?action=stats&days=${days}&hideAdmin=${hideAdmin ? '1' : '0'}`;
      const r = await fetch(url, { headers: buildAuthHeaders() });
      const data = (await r.json()) as AdminStats & { error?: string };
      if (r.status === 403 && authMode === 'web') {
        localStorage.removeItem(WEB_TOKEN_STORAGE);
        setAuthMode('none');
        setOpen(false);
        return;
      }
      if (!r.ok || !data.ok) {
        setError(data.error || 'Ошибка загрузки статистики из Neon');
      } else {
        setStats(data);
      }
    } catch {
      setError('Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  }, [authMode, days, hideAdmin, buildAuthHeaders]);

  const fetchHealth = useCallback(async () => {
    if (authMode === 'none') return;
    setHealthLoading(true);
    try {
      const r = await fetch('/api/check-purchase?action=health', {
        headers: buildAuthHeaders(),
      });
      const data = (await r.json()) as HealthData;
      if (r.ok && data.ok) setHealth(data);
    } catch {
      // ignore
    } finally {
      setHealthLoading(false);
    }
  }, [authMode, buildAuthHeaders]);

  useEffect(() => {
    if (open && authMode !== 'none') {
      fetchStats();
    }
  }, [open, authMode, fetchStats]);

  useEffect(() => {
    if (open && tab === 'system' && authMode !== 'none') {
      fetchHealth();
    }
  }, [open, tab, authMode, fetchHealth]);

  const handleSelectDay = useCallback(
    async (dayIso: string) => {
      setDayLoading(true);
      try {
        const url = `/api/check-purchase?action=day&date=${encodeURIComponent(dayIso)}&hideAdmin=${hideAdmin ? '1' : '0'}`;
        const r = await fetch(url, { headers: buildAuthHeaders() });
        const data = (await r.json()) as DayDetail & { ok?: boolean };
        if (r.ok && data.ok) {
          setDayDetail(data);
        }
      } catch {
        showToast('Не удалось загрузить детализацию дня');
      } finally {
        setDayLoading(false);
      }
    },
    [hideAdmin, buildAuthHeaders, showToast],
  );

  const handleToggleUser = async (uid: string) => {
    if (expandedUserId === uid) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(uid);
    if (userProfiles[uid]) return;
    setProfileLoadingId(uid);
    try {
      const r = await fetch(
        `/api/check-purchase?action=user&targetId=${encodeURIComponent(uid)}`,
        { headers: buildAuthHeaders() },
      );
      const data = (await r.json()) as UserProfile & { ok?: boolean };
      if (r.ok && data.ok) {
        setUserProfiles((prev) => ({ ...prev, [uid]: data }));
      }
    } catch {
      // ignore
    } finally {
      setProfileLoadingId(null);
    }
  };

  const executeCrmGrant = async (mode: 'grant' | 'revoke') => {
    const uid = crmUserId.trim();
    if (!uid) {
      showToast('Введите ID пользователя');
      return;
    }
    setCrmBusy(true);
    try {
      const r = await fetch('/api/check-purchase?action=grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ targetId: uid, productId: crmProduct, mode }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !data.ok) {
        showToast(data.error || 'Ошибка операции');
      } else {
        showToast(mode === 'grant' ? 'PRO-доступ выдан' : 'PRO-доступ снят');
        setUserProfiles((prev) => {
          const copy = { ...prev };
          delete copy[uid];
          return copy;
        });
        fetchStats();
      }
    } catch {
      showToast('Ошибка сети');
    } finally {
      setCrmBusy(false);
    }
  };

  const executeCrmBan = async (mode: 'ban' | 'unban', targetOverride?: string) => {
    const uid = (targetOverride || crmUserId).trim();
    if (!uid) {
      showToast('Введите ID пользователя');
      return;
    }
    setCrmBusy(true);
    try {
      const r = await fetch('/api/check-purchase?action=ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify({ targetId: uid, mode, reason: banReason.trim() }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !data.ok) {
        showToast(data.error || 'Ошибка операции');
      } else {
        showToast(mode === 'ban' ? `Пользователь ${uid} заблокирован` : `Блокировка снята`);
        setBanReason('');
        fetchStats();
      }
    } catch {
      showToast('Ошибка сети');
    } finally {
      setCrmBusy(false);
    }
  };

  const handleSavePreset = () => {
    const label = `${days >= 3650 ? 'Всё' : `${days}д`} · ${hideAdmin ? 'Без меня' : 'Все'}`;
    if (presets.some((p) => p.days === days && p.hideAdmin === hideAdmin)) {
      showToast('Такой пресет уже сохранён');
      return;
    }
    const next: PresetList = [{ id: `p_${Date.now()}`, label, days, hideAdmin }, ...presets].slice(0, 4);
    setPresets(next);
    try {
      localStorage.setItem(PRESETS_STORAGE, JSON.stringify(next));
    } catch {
      // ignore
    }
    showToast(`Пресет «${label}» сохранён`);
  };

  const handleExportAction = async (kind: 'users_csv' | 'pages_csv' | 'excel' | 'pdf') => {
    if (!stats) return;
    setShowExportBar(false);

    if (kind === 'pdf') {
      const printed = printEditorialReport(stats, days);
      if (printed) {
        showToast('Окно печати PDF открыто');
      } else {
        setPreviewModal({
          title: 'Отчёт CORDWAINE (для Telegram)',
          content: buildReportSummaryText(stats, days),
          hint: 'Telegram WebView блокирует печать. Скопируйте отчёт ниже или откройте панель в Chrome (вкладка «Система» → «Открыть в Chrome»).',
        });
      }
      return;
    }

    if (kind === 'users_csv') {
      const res = await exportUsersCsv(stats);
      if (res === 'shared') showToast('Открыто меню отправки CSV');
      else if (res === 'downloaded') showToast('CSV пользователей скачан');
      else {
        setPreviewModal({
          title: 'CSV · Пользователи',
          content: buildUsersCsv(stats),
          hint: 'Скопируйте CSV ниже или откройте панель в Chrome.',
        });
      }
      return;
    }

    if (kind === 'pages_csv') {
      const res = await exportPagesCsv(stats);
      if (res === 'shared') showToast('Открыто меню отправки CSV');
      else if (res === 'downloaded') showToast('CSV разделов скачан');
      else {
        setPreviewModal({
          title: 'CSV · Разделы',
          content: buildPagesCsv(stats),
          hint: 'Скопируйте CSV ниже или откройте панель в Chrome.',
        });
      }
      return;
    }

    const res = await exportExcelWorkbook(stats, days);
    if (res === 'shared') showToast('Открыто меню отправки Excel (.xls)');
    else if (res === 'downloaded') showToast('Excel (.xls) скачан');
    else {
      setPreviewModal({
        title: 'Excel XML (резервный просмотр)',
        content: buildExcelXml(stats, days),
        hint: 'Для прямого скачивания .xls откройте панель в Chrome.',
      });
    }
  };

  const handleExportChartPng = async () => {
    const chart = activityChartRef.current;
    if (!chart) return;
    try {
      const dataUrl = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#141412' });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'cordwaine-activity.png', { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({ files: [file], title: 'CORDWAINE Activity' });
        showToast('График отправлен');
        return;
      }
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'cordwaine-activity.png';
      a.click();
      showToast('PNG графика сохранён');
    } catch {
      showToast('Экспорт PNG доступен в Chrome');
    }
  };

  const filteredUsers = useMemo(() => {
    if (!stats) return [];
    const q = (userSearch || smartQuery).trim().toLowerCase();
    return stats.users
      .filter((u) => {
        if (userSourceFilter !== 'all' && u.source !== userSourceFilter) return false;
        if (!q) return true;
        return (
          u.user_id.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.first_name.toLowerCase().includes(q) ||
          u.last_page.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (userSort === 'events') return b.events - a.events;
        if (userSort === 'pro') return b.pro_count - a.pro_count || b.events - a.events;
        return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
      });
  }, [stats, userSearch, smartQuery, userSourceFilter, userSort]);

  const smartMatches = useMemo(() => {
    const q = smartQuery.trim().toLowerCase();
    if (!q || !stats) return null;
    const users = stats.users
      .filter(
        (u) =>
          u.user_id.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.first_name.toLowerCase().includes(q),
      )
      .slice(0, 4);
    const pages = stats.pages.filter((p) => p.page.toLowerCase().includes(q)).slice(0, 4);
    return { users, pages };
  }, [smartQuery, stats]);

  const selectedProductObj =
    PRO_CATALOG.find((p) => p.id === crmProduct) || PRO_CATALOG[0];

  // One-time Telegram OTP Modal on /#admin (zero static password!)
  if (authMode === 'none') {
    if (!showOtpModal) return null;
    return (
      <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#C9A86A]/35 bg-[#141412] p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#C9A86A]">
              <KeyRound className="w-4 h-4" />
              <span className="text-[11px] font-semibold tracking-[0.14em] uppercase">
                CORDWAINE · TELEGRAM OTP
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowOtpModal(false);
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
              }}
              className="p-1.5 rounded-lg text-[#9A9389] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h3 className="text-[17px] font-semibold text-[#F5F1EB]">Вход по коду в Telegram</h3>
            <p className="text-[12px] text-[#8D867C] mt-1">
              Одноразовый 6-значный код придёт в личный чат с ботом (действует 2 минуты, до 3 попыток).
            </p>
          </div>

          {!otpChallengeId ? (
            <button
              type="button"
              disabled={otpBusy}
              onClick={handleRequestOtp}
              className="w-full rounded-xl bg-[#C9A86A] py-2.5 text-[14px] font-semibold text-[#121210] disabled:opacity-50"
            >
              {otpBusy ? 'Отправка в Telegram...' : 'Прислать код в Telegram'}
            </button>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={DARK_INPUT_STYLE}
                className="w-full rounded-xl border border-white/15 px-4 py-3 text-center text-[22px] tracking-[0.35em] font-mono focus:outline-none focus:border-[#C9A86A]"
                autoFocus
              />
              <button
                type="submit"
                disabled={otpBusy || otpCode.length !== 6}
                className="w-full rounded-xl bg-[#C9A86A] py-2.5 text-[14px] font-semibold text-[#121210] disabled:opacity-45"
              >
                {otpBusy ? 'Проверка...' : 'Войти в Command Center'}
              </button>
              <button
                type="button"
                disabled={otpBusy}
                onClick={handleRequestOtp}
                className="w-full rounded-xl border border-white/10 py-2 text-[12px] text-[#BDB6AC]"
              >
                Отправить новый код
              </button>
            </form>
          )}

          {otpInfo && <div className="text-[12px] text-[#3FD08F]">{otpInfo}</div>}
          {otpError && <div className="text-[12px] text-[#F06A7E]">{otpError}</div>}
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="CORDWAINE Command Center"
        className="fixed bottom-5 left-4 z-[90] flex items-center gap-2 rounded-full border border-[#C9A86A]/45 bg-[#141412]/95 px-3.5 py-2.5 text-[#C9A86A] shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md active:scale-95 transition"
      >
        <BarChart3 className="w-4 h-4" />
        <span className="text-[12px] font-semibold tracking-wide hidden sm:inline">Admin</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4">
          <div className="w-full h-[95dvh] md:h-[90dvh] md:max-w-4xl lg:max-w-[1260px] rounded-t-[26px] md:rounded-[26px] border border-white/[0.1] bg-[#0D0D0C] text-[#F5F1EB] flex flex-col lg:flex-row overflow-hidden shadow-2xl">
            <aside className="hidden lg:flex w-[240px] shrink-0 flex-col border-r border-white/[0.08] bg-[#111110] p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#3FD08F]" />
                <span className="text-[11px] font-semibold tracking-[0.16em] text-[#C9A86A] uppercase">
                  CORDWAINE
                </span>
              </div>
              <div className="text-[18px] font-bold tracking-tight mb-5">Command Center</div>

              <nav className="space-y-1 flex-1">
                {TABS.map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition ${
                        active
                          ? 'bg-[#C9A86A] text-[#121210] font-semibold'
                          : 'text-[#BDB6AC] hover:bg-white/[0.05]'
                      }`}
                    >
                      <span>{t.label}</span>
                      {t.id === 'audit' && stats && stats.auditLog.length > 0 && (
                        <span className={`text-[11px] font-mono ${active ? 'text-[#121210]/70' : 'text-[#8D867C]'}`}>
                          {stats.auditLog.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-white/[0.08] space-y-2">
                <div className="text-[11px] text-[#8D867C]">
                  Сессия: <span className="text-[#DED7CC]">{authMode === 'web' ? 'Chrome (12ч)' : 'Telegram'}</span>
                </div>
                {authMode === 'web' && (
                  <button
                    type="button"
                    onClick={handleWebLogout}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-[12px] text-[#F06A7E] hover:bg-[#F06A7E]/10"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Завершить Web-сессию
                  </button>
                )}
              </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <header className="shrink-0 border-b border-white/[0.08] bg-[#111110]/95 px-3.5 pt-3 pb-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#3FD08F] shrink-0" />
                    <span className="text-[15px] font-bold tracking-tight truncate">
                      {TABS.find((t) => t.id === tab)?.label || 'Обзор'}
                    </span>
                    <span className="hidden sm:inline text-[11px] text-[#8D867C] font-mono">
                      · {authMode === 'web' ? 'WEB' : 'TG'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSearchBar((v) => !v);
                        setShowExportBar(false);
                      }}
                      title="Поиск"
                      className={`p-2 rounded-xl border transition ${
                        showSearchBar
                          ? 'border-[#C9A86A] bg-[#C9A86A]/15 text-[#C9A86A]'
                          : 'border-white/10 bg-white/[0.03] text-[#D6CFC4]'
                      }`}
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowExportBar((v) => !v);
                        setShowSearchBar(false);
                      }}
                      title="Экспорт"
                      className={`p-2 rounded-xl border transition ${
                        showExportBar
                          ? 'border-[#C9A86A] bg-[#C9A86A]/15 text-[#C9A86A]'
                          : 'border-white/10 bg-white/[0.03] text-[#D6CFC4]'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        fetchStats();
                        if (tab === 'system') fetchHealth();
                      }}
                      title="Обновить"
                      className="p-2 rounded-xl border border-[#C9A86A]/35 bg-[#C9A86A]/10 text-[#C9A86A]"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {authMode === 'web' && (
                      <button
                        type="button"
                        onClick={handleWebLogout}
                        title="Выйти"
                        className="lg:hidden p-2 rounded-xl border border-white/10 bg-white/[0.03] text-[#F06A7E]"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      title="Закрыть"
                      className="p-2 rounded-xl border border-white/10 bg-white/[0.03] text-[#BDB6AC]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="lg:hidden grid grid-cols-3 gap-1.5 mt-2.5">
                  {TABS.map((t) => {
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={`rounded-xl py-1.5 px-2 text-[12px] font-semibold text-center transition ${
                          active
                            ? 'bg-[#C9A86A] text-[#121210]'
                            : 'bg-white/[0.04] text-[#BDB6AC] border border-white/[0.06]'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {showSearchBar && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      value={smartQuery}
                      onChange={(e) => setSmartQuery(e.target.value)}
                      placeholder="Поиск: Telegram ID, @username, раздел..."
                      style={DARK_INPUT_STYLE}
                      className="w-full rounded-xl border border-white/15 px-3 py-2 text-[13px] focus:outline-none focus:border-[#C9A86A]"
                      autoFocus
                    />
                    {smartMatches && (
                      <div className="mt-2 rounded-xl border border-white/10 bg-[#161614] p-2.5 space-y-2 text-[12px]">
                        {smartMatches.users.length === 0 && smartMatches.pages.length === 0 && (
                          <div className="text-[#8D867C]">Ничего не найдено</div>
                        )}
                        {smartMatches.users.map((u) => (
                          <button
                            key={u.user_id}
                            type="button"
                            onClick={() => {
                              setTab('users');
                              setUserSearch(u.user_id);
                              setShowSearchBar(false);
                            }}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.06] text-left"
                          >
                            <span className="truncate">
                              {u.username ? `@${u.username}` : u.first_name || 'Guest'}{' '}
                              <span className="font-mono text-[#8D867C]">#{u.user_id}</span>
                            </span>
                            <span className="text-[#C9A86A] shrink-0">Люди →</span>
                          </button>
                        ))}
                        {smartMatches.pages.map((p) => (
                          <button
                            key={p.page}
                            type="button"
                            onClick={() => {
                              setTab('analytics');
                              setShowSearchBar(false);
                            }}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.06] text-left"
                          >
                            <span>Раздел: {p.page}</span>
                            <span className="font-mono text-[#5B9BFF]">{p.events} соб.</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {showExportBar && (
                  <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleExportAction('users_csv')}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2 px-2.5 text-[12px] text-[#F5F1EB]"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#C9A86A]" /> CSV Люди
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportAction('pages_csv')}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2 px-2.5 text-[12px] text-[#F5F1EB]"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#5B9BFF]" /> CSV Разделы
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportAction('excel')}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[#C9A86A]/35 bg-[#C9A86A]/10 py-2 px-2.5 text-[12px] text-[#C9A86A]"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Excel (.xls)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportAction('pdf')}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[#3FD08F]/35 bg-[#3FD08F]/10 py-2 px-2.5 text-[12px] text-[#3FD08F]"
                    >
                      <Download className="w-3.5 h-3.5" /> Отчёт / PDF
                    </button>
                  </div>
                )}
              </header>

              <div className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-3.5">
                {(tab === 'overview' || tab === 'analytics' || tab === 'users') && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#141412] p-0.5">
                      {[
                        { label: '24ч', v: 1 },
                        { label: '7д', v: 7 },
                        { label: '30д', v: 30 },
                        { label: 'Всё', v: 3650 },
                      ].map((p) => (
                        <button
                          key={p.v}
                          type="button"
                          onClick={() => setDays(p.v)}
                          className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${
                            days === p.v ? 'bg-white/[0.12] text-[#F5F1EB]' : 'text-[#8D867C]'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setHideAdmin((v) => !v)}
                      className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[12px] font-medium transition ${
                        hideAdmin
                          ? 'border-[#C9A86A]/45 bg-[#C9A86A]/12 text-[#C9A86A]'
                          : 'border-white/10 bg-[#141412] text-[#9A9389]'
                      }`}
                    >
                      {hideAdmin && <Check className="w-3.5 h-3.5" />}
                      Без меня
                    </button>

                    <button
                      type="button"
                      onClick={handleSavePreset}
                      className="rounded-xl border border-white/10 bg-[#141412] px-2.5 py-1.5 text-[11px] text-[#BDB6AC]"
                    >
                      + Пресет
                    </button>

                    {presets.map((pr) => (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => {
                          setDays(pr.days);
                          setHideAdmin(pr.hideAdmin);
                        }}
                        className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[11px] text-[#A8A095]"
                      >
                        ★ {pr.label}
                      </button>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="rounded-2xl border border-[#F06A7E]/40 bg-[#F06A7E]/10 px-4 py-3 text-[13px] text-[#F06A7E]">
                    {error}
                  </div>
                )}

                {!stats && loading && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-24 rounded-2xl bg-white/[0.04] animate-pulse" />
                    ))}
                  </div>
                )}

                {/* TAB 1: OVERVIEW */}
                {stats && tab === 'overview' && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {(() => {
                        const tgDelta = formatDelta(stats.summary.tgUnique, stats.summary.prevTgUnique);
                        const webDelta = formatDelta(stats.summary.webUnique, stats.summary.prevWebUnique);
                        return (
                          <>
                            <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5">
                              <div className="flex items-center justify-between text-[11px] text-[#8D867C]">
                                <span>Telegram уник.</span>
                                {!tgDelta.neutral && (
                                  <span className={tgDelta.positive ? 'text-[#3FD08F]' : 'text-[#F06A7E]'}>
                                    {tgDelta.text}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1.5 text-[24px] font-bold font-mono text-[#C9A86A]">
                                {stats.summary.tgUnique}
                              </div>
                              <div className="mt-1 text-[11px] text-[#8D867C]">
                                Событий: {stats.summary.totalEvents}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5">
                              <div className="flex items-center justify-between text-[11px] text-[#8D867C]">
                                <span>Браузер (Web)</span>
                                {!webDelta.neutral && (
                                  <span className={webDelta.positive ? 'text-[#5B9BFF]' : 'text-[#F06A7E]'}>
                                    {webDelta.text}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1.5 text-[24px] font-bold font-mono text-[#5B9BFF]">
                                {stats.summary.webUnique}
                              </div>
                              <div className="mt-1 text-[11px] text-[#8D867C]">
                                Сред. соб./чел: {stats.summary.avgEventsPerUser}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5">
                              <div className="text-[11px] text-[#8D867C]">Новые / Возвраты</div>
                              <div className="mt-1.5 text-[24px] font-bold font-mono text-[#F5F1EB]">
                                {stats.summary.newUsers}{' '}
                                <span className="text-[#8D867C] font-normal">/</span>{' '}
                                {stats.summary.returningUsers}
                              </div>
                              <div className="mt-1 text-[11px] text-[#8D867C]">
                                Retention 30д: {stats.summary.retention30d}%
                              </div>
                            </div>

                            <div className="rounded-2xl border border-[#3FD08F]/25 bg-[#0F1B15] p-3.5">
                              <div className="text-[11px] text-[#3FD08F]">PRO в Neon</div>
                              <div className="mt-1.5 text-[19px] font-bold font-mono text-[#3FD08F] leading-tight">
                                {stats.summary.proUsers ?? 0} чел. · {stats.summary.proTotal} мод.
                              </div>
                              <div className="mt-1 text-[11px] text-[#8D867C]">
                                {stats.summary.proStars.toLocaleString('ru-RU')} ★ · усл. ~${stats.summary.proUsdEst}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <div>
                          <div className="text-[14px] font-semibold text-[#F5F1EB]">
                            Динамика активности (14 дней)
                          </div>
                          <div className="text-[11px] text-[#8D867C]">
                            Тап по колонке дня = детализация
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleExportChartPng}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#D6CFC4]"
                        >
                          PNG
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#0D0D0C] p-0.5 text-[11px]">
                          {(['all', 'tg', 'web'] as const).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setChartChannel(c)}
                              className={`px-2.5 py-1 rounded-lg ${
                                chartChannel === c ? 'bg-white/[0.12] text-[#F5F1EB]' : 'text-[#8D867C]'
                              }`}
                            >
                              {c === 'all' ? 'Все' : c === 'tg' ? 'TG' : 'Web'}
                            </button>
                          ))}
                        </div>
                        <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#0D0D0C] p-0.5 text-[11px]">
                          {(['area', 'line', 'bar'] as const).map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => setChartKind(k)}
                              className={`px-2.5 py-1 rounded-lg capitalize ${
                                chartKind === k ? 'bg-white/[0.12] text-[#F5F1EB]' : 'text-[#8D867C]'
                              }`}
                            >
                              {k}
                            </button>
                          ))}
                        </div>
                      </div>

                      <ActivityStudioChart
                        data={stats.daily}
                        channel={chartChannel}
                        chartKind={chartKind}
                        onSelectDay={handleSelectDay}
                        chartRefOut={activityChartRef}
                      />

                      {(dayLoading || dayDetail) && (
                        <div className="mt-3 rounded-xl border border-[#C9A86A]/30 bg-[#0F0F0E] p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-semibold text-[#C9A86A]">
                              {dayLoading ? 'Загрузка дня...' : `Детализация за ${dayDetail?.date}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => setDayDetail(null)}
                              className="text-[11px] text-[#8D867C]"
                            >
                              Скрыть
                            </button>
                          </div>
                          {dayDetail && !dayLoading && (
                            <div className="space-y-2 text-[12px]">
                              <div className="flex gap-4 font-mono">
                                <span className="text-[#C9A86A]">TG: {dayDetail.tg}</span>
                                <span className="text-[#5B9BFF]">Web: {dayDetail.web}</span>
                                <span className="text-[#DED7CC]">Событий: {dayDetail.events}</span>
                              </div>
                              {dayDetail.topPages.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {dayDetail.topPages.map((p) => (
                                    <span
                                      key={p.page}
                                      className="rounded-lg bg-white/[0.05] px-2 py-0.5 text-[11px] text-[#D6CFC4]"
                                    >
                                      {p.page}: {p.count}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <DonutCard
                        title="Каналы трафика"
                        items={[
                          { name: 'Telegram', value: stats.summary.tgUnique },
                          { name: 'Web', value: stats.summary.webUnique },
                        ]}
                        centerText={String(stats.summary.tgUnique + stats.summary.webUnique)}
                        colors={[PALETTE.gold, PALETTE.blue]}
                      />
                      <DonutCard
                        title="Языки аудитории"
                        items={stats.languages}
                        centerText={String(stats.languages.reduce((a, b) => a + b.value, 0))}
                      />
                      <DonutCard
                        title="Платформы устройств"
                        items={stats.platforms}
                        centerText={String(stats.platforms.reduce((a, b) => a + b.value, 0))}
                        colors={[PALETTE.blue, PALETTE.gold, PALETTE.emerald, PALETTE.violet]}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: ANALYTICS */}
                {stats && tab === 'analytics' && (
                  <div className="space-y-3.5">
                    <PagesBarChart pages={stats.pages} />
                    <ConversionFunnelChart
                      totalVisits={stats.summary.tgUnique + stats.summary.webUnique}
                      tgUsers={stats.summary.tgUnique}
                      returningUsers={stats.summary.returningUsers}
                      proActivations={stats.summary.proTotal}
                    />
                    <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4">
                      <div className="text-[14px] font-semibold mb-2.5">События системы</div>
                      <div className="divide-y divide-white/[0.06]">
                        {stats.events.map((ev) => (
                          <div key={ev.event} className="py-2 flex items-center justify-between text-[13px]">
                            <span className="font-mono text-[#E7E1D7]">{ev.event}</span>
                            <span className="font-mono text-[12px]">
                              <span className="text-[#C9A86A]">{ev.users} чел</span>
                              <span className="text-[#8D867C]"> · {ev.count}×</span>
                            </span>
                          </div>
                        ))}
                        {stats.events.length === 0 && (
                          <div className="text-[12px] text-[#8D867C] py-3">Событий за период нет</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: PRO · CRM */}
                {stats && tab === 'crm' && (
                  <div className="space-y-3.5">
                    <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4 space-y-3.5">
                      <div>
                        <div className="text-[15px] font-semibold flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#C9A86A]" />
                          Управление PRO-доступом
                        </div>
                        <div className="text-[12px] text-[#8D867C] mt-0.5">
                          Все операции записываются в «Журнал»
                        </div>
                      </div>

                      <div>
                        <label className="block text-[12px] text-[#A8A095] mb-1.5">ID пользователя</label>
                        <input
                          type="text"
                          value={crmUserId}
                          onChange={(e) => setCrmUserId(e.target.value)}
                          placeholder="Telegram ID (или web_... для бана)"
                          style={DARK_INPUT_STYLE}
                          className="w-full rounded-xl border border-white/15 px-3.5 py-2.5 text-[14px] font-mono focus:outline-none focus:border-[#C9A86A]"
                        />
                      </div>

                      <div className="relative">
                        <label className="block text-[12px] text-[#A8A095] mb-1.5">Модуль PRO</label>
                        <button
                          type="button"
                          onClick={() => setCrmDropdownOpen((v) => !v)}
                          className="w-full flex items-center justify-between rounded-xl border border-white/15 bg-[#0E0E0D] px-3.5 py-2.5 text-[14px] text-[#F5F1EB]"
                        >
                          <span>{selectedProductObj.label}</span>
                          <span className="flex items-center gap-2 text-[#C9A86A] font-mono text-[13px]">
                            {selectedProductObj.price}
                            <ChevronDown className="w-4 h-4 text-[#8D867C]" />
                          </span>
                        </button>
                        {crmDropdownOpen && (
                          <div className="mt-1.5 rounded-xl border border-white/15 bg-[#121210] overflow-hidden divide-y divide-white/[0.06]">
                            {PRO_CATALOG.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setCrmProduct(item.id);
                                  setCrmDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] ${
                                  crmProduct === item.id
                                    ? 'bg-[#C9A86A]/15 text-[#C9A86A] font-semibold'
                                    : 'text-[#E7E1D7]'
                                }`}
                              >
                                <span>{item.label}</span>
                                <span className="font-mono text-[#C9A86A]">{item.price}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          disabled={crmBusy || !crmUserId.trim()}
                          onClick={() =>
                            setConfirmAction({
                              title: 'Выдать PRO-доступ?',
                              description: `Пользователь #${crmUserId.trim()} получит «${selectedProductObj.label}» в Neon.`,
                              confirmLabel: 'Выдать PRO',
                              danger: false,
                              onConfirm: () => executeCrmGrant('grant'),
                            })
                          }
                          className="rounded-xl bg-[#C9A86A] py-2.5 text-[13px] font-semibold text-[#121210] disabled:opacity-40"
                        >
                          Выдать PRO
                        </button>
                        <button
                          type="button"
                          disabled={crmBusy || !crmUserId.trim()}
                          onClick={() =>
                            setConfirmAction({
                              title: 'Забрать PRO-доступ?',
                              description: `Удалить «${selectedProductObj.label}» у пользователя #${crmUserId.trim()}?`,
                              confirmLabel: 'Забрать PRO',
                              danger: true,
                              onConfirm: () => executeCrmGrant('revoke'),
                            })
                          }
                          className="rounded-xl border border-white/15 bg-white/[0.04] py-2.5 text-[13px] font-semibold text-[#F5F1EB] disabled:opacity-40"
                        >
                          Забрать PRO
                        </button>
                      </div>

                      <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
                        <div className="text-[14px] font-semibold text-[#F06A7E] flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4" /> Блокировка пользователя
                        </div>
                        <input
                          type="text"
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                          placeholder="Причина блокировки (необязательно)"
                          style={DARK_INPUT_STYLE}
                          className="w-full rounded-xl border border-white/15 px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-[#F06A7E]"
                        />
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            disabled={crmBusy || !crmUserId.trim()}
                            onClick={() =>
                              setConfirmAction({
                                title: 'Заблокировать пользователя?',
                                description: `Доступ для #${crmUserId.trim()} будет мгновенно закрыт.`,
                                confirmLabel: 'Заблокировать',
                                danger: true,
                                onConfirm: () => executeCrmBan('ban'),
                              })
                            }
                            className="rounded-xl bg-[#D94A64] py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
                          >
                            Заблокировать
                          </button>
                          <button
                            type="button"
                            disabled={crmBusy || !crmUserId.trim()}
                            onClick={() => executeCrmBan('unban')}
                            className="rounded-xl border border-[#3FD08F]/40 bg-[#3FD08F]/10 py-2.5 text-[13px] font-semibold text-[#3FD08F] disabled:opacity-40"
                          >
                            Разблокировать
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4">
                      <div className="text-[14px] font-semibold mb-2">
                        Заблокированные ({stats.banned.length})
                      </div>
                      {stats.banned.length === 0 ? (
                        <div className="text-[12px] text-[#8D867C]">Список пуст</div>
                      ) : (
                        <div className="space-y-2">
                          {stats.banned.map((b) => (
                            <div
                              key={b.user_id}
                              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0F0F0E] px-3 py-2"
                            >
                              <div className="min-w-0">
                                <div className="font-mono text-[13px] text-[#F5F1EB]">#{b.user_id}</div>
                                <div className="text-[11px] text-[#8D867C] truncate">{b.reason}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => executeCrmBan('unban', b.user_id)}
                                className="shrink-0 rounded-lg border border-[#3FD08F]/35 px-2.5 py-1 text-[11px] text-[#3FD08F]"
                              >
                                Снять
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <DonutCard
                      title="Распределение PRO-модулей (★)"
                      subtitle={`${stats.summary.proUsers ?? 0} чел. · ${stats.summary.proTotal} мод. · усл. экв. ~$${stats.summary.proUsdEst}`}
                      items={stats.proBreakdown.map((p) => ({
                        name: `${p.product_id} (${p.count})`,
                        value: p.stars,
                      }))}
                      centerText={`${stats.summary.proStars.toLocaleString('ru-RU')} ★`}
                    />
                  </div>
                )}

                {/* TAB 4: USERS */}
                {stats && tab === 'users' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Поиск по ID, @username, имени или разделу..."
                        style={DARK_INPUT_STYLE}
                        className="w-full rounded-xl border border-white/15 px-3.5 py-2 text-[13px] focus:outline-none focus:border-[#C9A86A]"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#141412] p-0.5 text-[11px]">
                          {(['all', 'telegram', 'web'] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setUserSourceFilter(s)}
                              className={`px-2.5 py-1 rounded-lg ${
                                userSourceFilter === s
                                  ? 'bg-[#C9A86A] text-[#121210] font-semibold'
                                  : 'text-[#8D867C]'
                              }`}
                            >
                              {s === 'all' ? 'Все' : s === 'telegram' ? 'TG' : 'Web'}
                            </button>
                          ))}
                        </div>
                        <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#141412] p-0.5 text-[11px]">
                          {(
                            [
                              { id: 'recent', label: 'Новые' },
                              { id: 'events', label: 'Актив.' },
                              { id: 'pro', label: 'PRO' },
                            ] as const
                          ).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setUserSort(s.id)}
                              className={`px-2.5 py-1 rounded-lg ${
                                userSort === s.id
                                  ? 'bg-white/[0.12] text-[#F5F1EB] font-semibold'
                                  : 'text-[#8D867C]'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-[12px] text-[#8D867C] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Найдено пользователей: {filteredUsers.length}
                    </div>

                    <div className="space-y-2">
                      {filteredUsers.map((u) => {
                        const isOpen = expandedUserId === u.user_id;
                        const prof = userProfiles[u.user_id];
                        return (
                          <div
                            key={u.user_id}
                            className="rounded-2xl border border-white/[0.08] bg-[#141412] overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleUser(u.user_id)}
                              className="w-full p-3 flex items-center justify-between gap-2 text-left"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                    u.source === 'telegram'
                                      ? 'bg-[#C9A86A]/15 text-[#C9A86A]'
                                      : 'bg-[#5B9BFF]/15 text-[#5B9BFF]'
                                  }`}
                                >
                                  {u.source === 'telegram' ? 'TG' : 'WEB'}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[13px] font-semibold text-[#F5F1EB] truncate">
                                      {u.username
                                        ? `@${u.username}`
                                        : u.first_name || 'Guest'}
                                    </span>
                                    {u.pro_count > 0 && (
                                      <span className="rounded-md bg-[#3FD08F]/15 px-1.5 py-0.5 text-[10px] font-mono text-[#3FD08F]">
                                        PRO ×{u.pro_count}
                                      </span>
                                    )}
                                    {u.is_banned && (
                                      <span className="rounded-md bg-[#F06A7E]/15 px-1.5 py-0.5 text-[10px] text-[#F06A7E]">
                                        BAN
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-mono text-[#8D867C] truncate">
                                    #{u.user_id} · {u.last_page} · {u.events} соб.
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-[11px] font-mono text-[#A8A095]">
                                  {formatShortDate(u.last_seen)}
                                </div>
                              </div>
                            </button>

                            {isOpen && (
                              <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] bg-[#10100F] space-y-2.5 text-[12px]">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-[#A8A095]">
                                    PRO:{' '}
                                    <span className="text-[#3FD08F] font-mono">
                                      {prof
                                        ? prof.products.length > 0
                                          ? prof.products.join(', ')
                                          : 'нет'
                                        : '...'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCrmUserId(u.user_id);
                                      setTab('crm');
                                    }}
                                    className="rounded-lg border border-[#C9A86A]/40 bg-[#C9A86A]/10 px-2.5 py-1 text-[11px] font-semibold text-[#C9A86A]"
                                  >
                                    В CRM / Бан →
                                  </button>
                                </div>

                                {profileLoadingId === u.user_id && (
                                  <div className="text-[#8D867C]">Загрузка истории...</div>
                                )}

                                {prof && prof.events.length > 0 && (
                                  <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {prof.events.slice(0, 12).map((ev, idx) => (
                                      <div
                                        key={`${ev.created_at}-${idx}`}
                                        className="flex items-center justify-between font-mono text-[11px] text-[#BDB6AC]"
                                      >
                                        <span>
                                          {ev.event} · <span className="text-[#C9A86A]">{ev.page}</span>
                                        </span>
                                        <span className="text-[#7E786E]">
                                          {formatShortDate(ev.created_at)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-6 text-center text-[13px] text-[#8D867C]">
                          Пользователи не найдены
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 5: AUDIT LOG */}
                {stats && tab === 'audit' && (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ScrollText className="w-4 h-4 text-[#C9A86A]" />
                      <div>
                        <div className="text-[14px] font-semibold">Журнал действий администратора</div>
                        <div className="text-[11px] text-[#8D867C]">
                          Выдача PRO, блокировки и входы в Chrome из Neon
                        </div>
                      </div>
                    </div>

                    {stats.auditLog.length === 0 ? (
                      <div className="text-[12px] text-[#8D867C] py-6 text-center">
                        Пока нет записей. Любая операция в «PRO · CRM» или вход в Chrome появится здесь.
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.06]">
                        {stats.auditLog.map((entry) => (
                          <div key={entry.id} className="py-2.5 flex items-start justify-between gap-2 text-[12px]">
                            <div className="min-w-0">
                              <div className="font-mono text-[#F5F1EB]">
                                <span
                                  className={
                                    entry.event.includes('ban') && !entry.event.includes('unban')
                                      ? 'text-[#F06A7E]'
                                      : entry.event.includes('grant')
                                        ? 'text-[#3FD08F]'
                                        : 'text-[#C9A86A]'
                                  }
                                >
                                  {entry.event}
                                </span>{' '}
                                → #{entry.target}
                              </div>
                              <div className="text-[11px] text-[#8D867C] truncate">
                                {entry.meta || '—'} · via {entry.via}
                              </div>
                            </div>
                            <div className="shrink-0 font-mono text-[11px] text-[#8D867C]">
                              {formatShortDate(entry.created_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 6: SYSTEM HEALTH + CHROME LAUNCH */}
                {tab === 'system' && (
                  <div className="space-y-3">
                    {authMode === 'telegram' && (
                      <div className="rounded-2xl border border-[#C9A86A]/35 bg-[#15130E] p-4 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <ExternalLink className="w-4 h-4 text-[#C9A86A] shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[14px] font-semibold text-[#F5F1EB]">
                              Вход с ПК / Chrome (без пароля)
                            </div>
                            <div className="text-[12px] text-[#A8A095] mt-0.5">
                              На ПК откройте <span className="font-mono text-[#C9A86A]">cordwaine.app/#admin</span> — бот пришлёт одноразовый 6-значный код прямо сюда (2 мин, макс. 3 попытки). Или откройте Chrome прямо с телефона:
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={mintingLink}
                            onClick={() => handleMintChromeLink('open')}
                            className="flex items-center justify-center gap-2 rounded-xl bg-[#C9A86A] py-2.5 px-3 text-[13px] font-semibold text-[#121210] disabled:opacity-50"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {mintingLink ? 'Создание...' : 'Открыть в Chrome'}
                          </button>
                          <button
                            type="button"
                            disabled={mintingLink}
                            onClick={() => handleMintChromeLink('copy')}
                            className="flex items-center justify-center gap-2 rounded-xl border border-[#C9A86A]/40 bg-white/[0.04] py-2.5 px-3 text-[13px] font-semibold text-[#F5F1EB] disabled:opacity-50"
                          >
                            <Copy className="w-4 h-4 text-[#C9A86A]" />
                            Скопировать ссылку (12 ч)
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-[#3FD08F]" />
                          <span className="text-[14px] font-semibold">Состояние Neon PostgreSQL</span>
                        </div>
                        <button
                          type="button"
                          onClick={fetchHealth}
                          className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-[#C9A86A]"
                        >
                          {healthLoading ? 'Пинг...' : 'Проверить'}
                        </button>
                      </div>

                      {health ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          <div className="rounded-xl bg-[#0F0F0E] border border-white/[0.06] p-3">
                            <div className="text-[11px] text-[#8D867C]">Задержка БД</div>
                            <div className="text-[18px] font-bold font-mono text-[#3FD08F] mt-1">
                              {health.latencyMs} мс
                            </div>
                          </div>
                          <div className="rounded-xl bg-[#0F0F0E] border border-white/[0.06] p-3">
                            <div className="text-[11px] text-[#8D867C]">app_events</div>
                            <div className="text-[18px] font-bold font-mono text-[#F5F1EB] mt-1">
                              {health.eventsCount}
                            </div>
                          </div>
                          <div className="rounded-xl bg-[#0F0F0E] border border-white/[0.06] p-3">
                            <div className="text-[11px] text-[#8D867C]">user_purchases</div>
                            <div className="text-[18px] font-bold font-mono text-[#C9A86A] mt-1">
                              {health.purchasesCount}
                            </div>
                          </div>
                          <div className="rounded-xl bg-[#0F0F0E] border border-white/[0.06] p-3">
                            <div className="text-[11px] text-[#8D867C]">banned_users</div>
                            <div className="text-[18px] font-bold font-mono text-[#F06A7E] mt-1">
                              {health.bannedCount}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[12px] text-[#8D867C]">Загрузка телеметрии...</div>
                      )}

                      {health && (
                        <div className="mt-3 pt-3 border-t border-white/[0.07] space-y-1.5 text-[12px] text-[#BDB6AC]">
                          <div className="flex justify-between">
                            <span>Последнее событие:</span>
                            <span className="font-mono text-[#F5F1EB]">
                              {health.lastEventAt ? formatShortDate(health.lastEventAt) : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>ADMIN_TELEGRAM_ID:</span>
                            <span className={health.adminIdConfigured ? 'text-[#3FD08F]' : 'text-[#F06A7E]'}>
                              {health.adminIdConfigured ? 'Настроен' : 'Не задан'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Вход с ПК (Telegram OTP):</span>
                            <span className={health.webKeyConfigured ? 'text-[#3FD08F]' : 'text-[#F06A7E]'}>
                              {health.webKeyConfigured ? 'Активен (/#admin)' : 'Нет BOT_TOKEN'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {authMode === 'web' && (
                      <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4 text-[12px] text-[#A8A095] flex items-start gap-2.5">
                        <Activity className="w-4 h-4 text-[#3FD08F] shrink-0 mt-0.5" />
                        <div>
                          Вы вошли в Chrome по крипто-сессии (действует 12 часов). В Chrome работают прямое скачивание CSV/Excel, печать PDF и широкая десктоп-панель.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {toast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[140] rounded-xl border border-[#C9A86A]/40 bg-[#171614] px-4 py-2.5 text-[13px] text-[#F5F1EB] shadow-2xl">
              {toast}
            </div>
          )}

          {confirmAction && (
            <div className="fixed inset-0 z-[130] bg-black/75 flex items-center justify-center p-4">
              <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#151513] p-5 space-y-4">
                <div>
                  <div className="text-[16px] font-semibold text-[#F5F1EB]">{confirmAction.title}</div>
                  <div className="text-[13px] text-[#A8A095] mt-1">{confirmAction.description}</div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className="rounded-xl border border-white/15 py-2.5 text-[13px] text-[#DED7CC]"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const fn = confirmAction.onConfirm;
                      setConfirmAction(null);
                      await fn();
                    }}
                    className={`rounded-xl py-2.5 text-[13px] font-semibold ${
                      confirmAction.danger
                        ? 'bg-[#D94A64] text-white'
                        : 'bg-[#C9A86A] text-[#121210]'
                    }`}
                  >
                    {confirmAction.confirmLabel}
                  </button>
                </div>
              </div>
            </div>
          )}

          {previewModal && (
            <div className="fixed inset-0 z-[135] bg-black/80 flex items-center justify-center p-4">
              <div className="w-full max-w-lg max-h-[82dvh] rounded-2xl border border-white/15 bg-[#141412] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                  <span className="text-[14px] font-semibold text-[#F5F1EB]">{previewModal.title}</span>
                  <button
                    type="button"
                    onClick={() => setPreviewModal(null)}
                    className="p-1 text-[#8D867C]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-4 pt-3 text-[12px] text-[#C9A86A]">{previewModal.hint}</div>
                <pre className="flex-1 overflow-auto m-4 p-3 rounded-xl bg-[#0B0B0A] border border-white/[0.07] text-[11px] font-mono text-[#E7E1D7] whitespace-pre-wrap break-all">
                  {previewModal.content}
                </pre>
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyTextToClipboard(previewModal.content);
                      showToast(ok ? 'Скопировано в буфер' : 'Не удалось скопировать');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#C9A86A] py-2.5 text-[13px] font-semibold text-[#121210]"
                  >
                    <Copy className="w-4 h-4" /> Скопировать всё
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewModal(null)}
                    className="rounded-xl border border-white/15 px-4 py-2.5 text-[13px] text-[#DED7CC]"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AdminStatsButton;
