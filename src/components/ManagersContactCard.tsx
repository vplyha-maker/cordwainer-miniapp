import React, { useState, useEffect, useRef } from 'react';
import type { Lang } from '../App';

export type ManagerContact = {
  id: string;
  name: Record<Lang, string>;
  role: Record<Lang, string>;
  phone: string;
  phoneDisplay: string;
  telegramId: string;
  isTest?: boolean;
};

type ManagersContactCardProps = {
  lang?: Lang;
  itemsCount?: number;
  onSendOrder?: (manager: { id: string; name: string; role: string; phone: string; telegramId: string; isTest?: boolean }) => Promise<boolean>;
  onCopyInvoice?: () => void;
  copied?: boolean;
  isFormValid?: boolean;
  missingFields?: string[];
  onValidationFail?: () => void;
};

export type HapticStyle =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'rigid'
  | 'soft'
  | 'success'
  | 'warning'
  | 'error';

const MANAGERS: ManagerContact[] = [
  {
    id: 'boris',
    name: {
      ru: 'Борис',
      uk: 'Борис',
      de: 'Boris',
    },
    role: {
      ru: 'Руководитель оптового отдела',
      uk: 'Керівник гуртового відділу',
      de: 'Leiter der Großhandelsabteilung',
    },
    phone: '+380974541511',
    phoneDisplay: '+38 (097) 454-15-11',
    telegramId: '8529254699',
  },
  {
    id: 'georgiy',
    name: {
      ru: 'Георгий',
      uk: 'Георгій',
      de: 'Georgiy',
    },
    role: {
      ru: 'Руководитель производства и продаж',
      uk: 'Керівник виробництва та продажів',
      de: 'Leiter Produktion & Vertrieb',
    },
    phone: '+380677193716',
    phoneDisplay: '+38 (067) 719-37-16',
    telegramId: '6034597342',
  },
  {
    id: 'test',
    name: {
      ru: 'Test',
      uk: 'Test',
      de: 'Test',
    },
    role: {
      ru: 'Тестовый контур проверки заказов',
      uk: 'Тестовий контур перевірки замовлень',
      de: 'Testumgebung für Bestellungen',
    },
    phone: '+380000000000',
    phoneDisplay: 'Тестовый канал',
    telegramId: '8686072747',
    isTest: true,
  },
];

const COOLDOWN_STORAGE_KEY = 'cardio_b2b_send_cooldown_v1';
const COOLDOWN_SECONDS = 60;

const THEME = {
  bg: '#F2EFE9',
  surface: '#F8F6F1',
  surfaceActive: '#EAE5DC',
  ink: '#161514',
  inkMuted: '#6E6A63',
  inkLight: '#9A958C',
  border: '#DCD7CC',
  accentGreen: '#1E4620',
  danger: '#9E2A2B',
  serif: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
  sans: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
};

export function triggerHaptic(style: HapticStyle = 'light'): void {
  try {
    const tgHaptic = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            HapticFeedback?: {
              impactOccurred?: (s: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
              notificationOccurred?: (t: 'error' | 'success' | 'warning') => void;
            };
          };
        };
      }
    ).Telegram?.WebApp?.HapticFeedback;

    if (tgHaptic) {
      if (style === 'success' || style === 'warning' || style === 'error') {
        tgHaptic.notificationOccurred?.(style);
        return;
      }
      tgHaptic.impactOccurred?.(style);
      return;
    }

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      const patterns: Record<HapticStyle, number | number[]> = {
        light: 12,
        medium: 25,
        heavy: 40,
        rigid: 30,
        soft: 15,
        success: [20, 45, 30],
        warning: [30, 40, 30],
        error: [45, 40, 45, 40, 45],
      };
      navigator.vibrate(patterns[style] || 15);
    }
  } catch {}
}

const audioCache: Record<string, HTMLAudioElement> = {};
const SOUND_FILES = ['zakaz.mp3', 'nul.mp3'];

export function preloadAppSounds(): void {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
  for (const file of SOUND_FILES) {
    if (!audioCache[file]) {
      try {
        const audio = new Audio(`/${file}`);
        audio.preload = 'auto';
        audio.volume = 0.75;
        audio.load();
        audioCache[file] = audio;
      } catch {}
    }
  }
}

export function playAppSound(fileName: string): void {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
  try {
    const cleanName = fileName.replace(/^\//, '');
    let audio = audioCache[cleanName];
    if (!audio) {
      audio = new Audio(`/${cleanName}`);
      audio.volume = 0.75;
      audioCache[cleanName] = audio;
    } else {
      audio.currentTime = 0;
    }
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  } catch {}
}

function loadSavedCooldowns(): Record<string, number> {
  try {
    const raw = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    const valid: Record<string, number> = {};
    for (const [key, expiresAt] of Object.entries(parsed)) {
      if (expiresAt > now) valid[key] = expiresAt;
    }
    return valid;
  } catch {
    return {};
  }
}

export function ManagersContactCard({
  lang = 'ru',
  itemsCount = 0,
  onSendOrder,
  onCopyInvoice,
  copied = false,
  isFormValid = true,
  missingFields = [],
  onValidationFail,
}: ManagersContactCardProps) {
  const safeLang = lang && ['ru', 'uk', 'de'].includes(lang) ? lang : 'ru';

  const t = {
    ru: {
      sectionTitle: 'II. ОТПРАВКА ЗАКАЗА И КОНТАКТЫ',
      directContact: 'ПРЯМАЯ СВЯЗЬ',
      spamLock: 'Зафиксирована слишком высокая частота нажатий. Подождите',
      sec: 'сек.',
      fillFields: 'Для отправки заказа укажите:',
      copyBtn: 'Скопировать текст накладной',
      copiedBtn: '✓ Текст накладной скопирован',
      confirmQ: (count: number, name: string) => `Отправить оптовый заказ (${count} мод.) руководителю (${name})?`,
      confirmBtn: '✓ Подтвердить',
      cancelBtn: 'Отмена',
      sendingText: 'Отправка накладной...',
      sentText: (name: string) => `✓ Заказ отправлен (${name})`,
      sendBtn: (name: string) => `Отправить заказ • ${name}`,
      inSec: (sec: number) => `Через ${sec}с`,
      callBtn: 'Позвонить',
    },
    uk: {
      sectionTitle: 'II. ВІДПРАВКА ЗАМОВЛЕННЯ ТА КОНТАКТИ',
      directContact: 'ПРЯМИЙ ЗВ\'ЯЗОК',
      spamLock: 'Зафіксовано завелику частоту натискань. Зачекайте',
      sec: 'сек.',
      fillFields: 'Для відправки замовлення вкажіть:',
      copyBtn: 'Скопіювати текст накладної',
      copiedBtn: '✓ Текст накладної скопійовано',
      confirmQ: (count: number, name: string) => `Надіслати гуртове замовлення (${count} мод.) керівнику (${name})?`,
      confirmBtn: '✓ Підтвердити',
      cancelBtn: 'Скасувати',
      sendingText: 'Відправка накладної...',
      sentText: (name: string) => `✓ Замовлення надіслано (${name})`,
      sendBtn: (name: string) => `Надіслати замовлення • ${name}`,
      inSec: (sec: number) => `Через ${sec}с`,
      callBtn: 'Зателефонувати',
    },
    de: {
      sectionTitle: 'II. BESTELLUNG SENDEN & KONTAKTE',
      directContact: 'DIREKTER KONTAKT',
      spamLock: 'Zu viele Klicks. Bitte warten Sie',
      sec: 'Sek.',
      fillFields: 'Bitte füllen Sie folgende Felder aus:',
      copyBtn: 'Rechnungstext kopieren',
      copiedBtn: '✓ Rechnungstext kopiert',
      confirmQ: (count: number, name: string) => `Großbestellung (${count} Mod.) an Leiter (${name}) senden?`,
      confirmBtn: '✓ Bestätigen',
      cancelBtn: 'Abbrechen',
      sendingText: 'Wird gesendet...',
      sentText: (name: string) => `✓ Bestellt (${name})`,
      sendBtn: (name: string) => `Bestellung senden • ${name}`,
      inSec: (sec: number) => `In ${sec}s`,
      callBtn: 'Anrufen',
    },
  }[safeLang];

  const [confirmingManagerId, setConfirmingManagerId] = useState<string | null>(null);
  const [sendingManagerId, setSendingManagerId] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>(() => loadSavedCooldowns());
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const [honeypotValue, setHoneypotValue] = useState('');
  const [spamBlockedUntil, setSpamBlockedUntil] = useState<number>(0);
  const clickTimestampsRef = useRef<number[]>([]);
  const isSendingRef = useRef<boolean>(false);

  useEffect(() => {
    preloadAppSounds();
  }, []);

  useEffect(() => {
    const hasActiveCooldown =
      Object.values(cooldowns).some((exp) => exp > Date.now()) || spamBlockedUntil > Date.now();
    if (!hasActiveCooldown) return;

    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldowns, spamBlockedUntil]);

  useEffect(() => {
    try {
      localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(cooldowns));
    } catch {}
  }, [cooldowns]);

  useEffect(() => {
    if (!isFormValid && confirmingManagerId) {
      setConfirmingManagerId(null);
    }
  }, [isFormValid, confirmingManagerId]);

  const checkAntiClicker = (e: React.MouseEvent): boolean => {
    if (!e.isTrusted || honeypotValue.trim().length > 0) return false;
    const now = Date.now();
    if (spamBlockedUntil > now) return false;

    const recentClicks = clickTimestampsRef.current.filter((t) => now - t < 3000);
    recentClicks.push(now);
    clickTimestampsRef.current = recentClicks;

    if (recentClicks.length > 5) {
      setSpamBlockedUntil(now + 10000);
      setNowTick(now);
      setConfirmingManagerId(null);
      return false;
    }
    return true;
  };

  const handleInitiateSend = (e: React.MouseEvent, manager: ManagerContact) => {
    if (!checkAntiClicker(e)) return;
    if (isSendingRef.current || sendingManagerId) return;

    const cooldownLeft = Math.ceil(((cooldowns[manager.id] || 0) - Date.now()) / 1000);
    if (cooldownLeft > 0) {
      triggerHaptic('warning');
      return;
    }

    if (!isFormValid) {
      triggerHaptic('error');
      onValidationFail?.();
      return;
    }

    triggerHaptic('medium');
    setConfirmingManagerId(manager.id);
  };

  const handleConfirmSend = async (e: React.MouseEvent, manager: ManagerContact) => {
    if (!checkAntiClicker(e)) return;
    if (!onSendOrder) return;
    if (isSendingRef.current || sendingManagerId) return;

    if (!isFormValid) {
      triggerHaptic('error');
      setConfirmingManagerId(null);
      onValidationFail?.();
      return;
    }

    isSendingRef.current = true;
    setSendingManagerId(manager.id);
    triggerHaptic('medium');

    try {
      const localizedManager = {
        id: manager.id,
        name: manager.name[safeLang] || manager.name.ru,
        role: manager.role[safeLang] || manager.role.ru,
        phone: manager.phone,
        telegramId: manager.telegramId,
        isTest: manager.isTest,
      };

      const ok = await onSendOrder(localizedManager);
      if (ok) {
        playAppSound('zakaz.mp3');
        triggerHaptic('success');
        const expiresAt = Date.now() + COOLDOWN_SECONDS * 1000;
        setCooldowns((prev) => ({ ...prev, [manager.id]: expiresAt }));
        setNowTick(Date.now());
        setConfirmingManagerId(null);
      } else {
        triggerHaptic('error');
      }
    } catch {
      triggerHaptic('error');
    } finally {
      isSendingRef.current = false;
      setSendingManagerId(null);
    }
  };

  const isSpamLocked = spamBlockedUntil > nowTick;
  const spamLockSeconds = Math.max(0, Math.ceil((spamBlockedUntil - nowTick) / 1000));

  return (
    <div style={{ fontFamily: THEME.sans, color: THEME.ink }}>
      <input
        type="text"
        name="company_fax_bot_trap"
        tabIndex={-1}
        autoComplete="off"
        value={honeypotValue}
        onChange={(e) => setHoneypotValue(e.target.value)}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '1.4px',
          color: THEME.inkMuted,
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: `1px solid ${THEME.border}`,
        }}
      >
        <span>{t.sectionTitle}</span>
        <span>{t.directContact}</span>
      </div>

      {isSpamLocked && (
        <div
          style={{
            backgroundColor: '#FDF2F2',
            border: `1px solid ${THEME.danger}`,
            color: THEME.danger,
            padding: '10px 12px',
            fontSize: '11px',
            marginBottom: '12px',
            fontWeight: 600,
          }}
        >
          {t.spamLock} {spamLockSeconds} {t.sec}
        </div>
      )}

      {onSendOrder && !isFormValid && missingFields.length > 0 && (
        <div
          onClick={() => {
            triggerHaptic('light');
            onValidationFail?.();
          }}
          style={{
            backgroundColor: THEME.surfaceActive,
            border: `1px solid ${THEME.border}`,
            borderLeft: `3px solid ${THEME.danger}`,
            padding: '10px 12px',
            fontSize: '11px',
            color: THEME.ink,
            marginBottom: '12px',
            cursor: 'pointer',
            lineHeight: 1.4,
          }}
        >
          {t.fillFields} <strong>{missingFields.join(', ')}</strong> ↑
        </div>
      )}

      {onCopyInvoice && itemsCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            if (!checkAntiClicker(e)) return;
            triggerHaptic('medium');
            onCopyInvoice();
          }}
          style={{
            width: '100%',
            padding: '12px 14px',
            marginBottom: '14px',
            backgroundColor: copied ? THEME.accentGreen : THEME.surface,
            color: copied ? '#FFFFFF' : THEME.ink,
            border: `1px solid ${copied ? THEME.accentGreen : THEME.ink}`,
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '1.3px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <span>{copied ? t.copiedBtn : t.copyBtn}</span>
          <span style={{ fontSize: '12px' }}>{copied ? '✓' : '📋'}</span>
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {MANAGERS.map((manager) => {
          const cooldownRemaining = Math.max(
            0,
            Math.ceil(((cooldowns[manager.id] || 0) - nowTick) / 1000)
          );
          const isOnCooldown = cooldownRemaining > 0;
          const isSendingThis = sendingManagerId === manager.id;
          const isConfirmingThis = confirmingManagerId === manager.id;
          const isAnySending = Boolean(sendingManagerId);

          const localizedName = manager.name[safeLang] || manager.name.ru;
          const localizedRole = manager.role[safeLang] || manager.role.ru;

          return (
            <div
              key={manager.id}
              style={{
                backgroundColor: THEME.surface,
                border: `1px solid ${isConfirmingThis ? THEME.ink : THEME.border}`,
                padding: '14px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '4px',
                }}
              >
                <div
                  style={{
                    fontFamily: THEME.serif,
                    fontSize: '22px',
                    fontWeight: 400,
                    color: THEME.ink,
                  }}
                >
                  {localizedName}
                </div>
                {!manager.isTest && (
                  <a
                    href={`tel:${manager.phone}`}
                    onClick={() => triggerHaptic('light')}
                    style={{
                      fontSize: '11px',
                      color: THEME.ink,
                      textDecoration: 'none',
                      fontWeight: 600,
                      letterSpacing: '0.6px',
                    }}
                  >
                    {manager.phoneDisplay}
                  </a>
                )}
              </div>

              <div
                style={{
                  fontSize: '9.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.9px',
                  color: THEME.inkMuted,
                  marginBottom: '12px',
                }}
              >
                {localizedRole}
              </div>

              {onSendOrder && itemsCount > 0 && (
                <div style={{ marginBottom: manager.isTest ? '0' : '8px' }}>
                  {isConfirmingThis && !isOnCooldown ? (
                    <div
                      style={{
                        backgroundColor: THEME.surfaceActive,
                        border: `1px solid ${THEME.ink}`,
                        padding: '12px 10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: THEME.ink,
                          marginBottom: '10px',
                          fontWeight: 500,
                          lineHeight: 1.4,
                        }}
                      >
                        {t.confirmQ(itemsCount, localizedName)}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          type="button"
                          disabled={isAnySending || isSpamLocked}
                          onClick={(e) => handleConfirmSend(e, manager)}
                          style={{
                            padding: '11px 8px',
                            backgroundColor: THEME.accentGreen,
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '9.5px',
                            fontWeight: 600,
                            letterSpacing: '0.8px',
                            textTransform: 'uppercase',
                            cursor: isAnySending ? 'wait' : 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isSendingThis ? t.sendingText : t.confirmBtn}
                        </button>
                        <button
                          type="button"
                          disabled={isAnySending}
                          onClick={() => {
                            triggerHaptic('light');
                            setConfirmingManagerId(null);
                          }}
                          style={{
                            padding: '11px 8px',
                            backgroundColor: THEME.surface,
                            color: THEME.ink,
                            border: `1px solid ${THEME.border}`,
                            fontSize: '9.5px',
                            fontWeight: 600,
                            letterSpacing: '0.8px',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          {t.cancelBtn}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isOnCooldown || isAnySending || isSpamLocked}
                      onClick={(e) => handleInitiateSend(e, manager)}
                      style={{
                        width: '100%',
                        padding: '12px 12px',
                        backgroundColor: isOnCooldown ? THEME.surfaceActive : THEME.ink,
                        color: isOnCooldown ? THEME.accentGreen : '#FFFFFF',
                        border: `1px solid ${isOnCooldown ? THEME.accentGreen : THEME.ink}`,
                        cursor:
                          isOnCooldown || isAnySending || isSpamLocked
                            ? 'not-allowed'
                            : 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: isAnySending && !isSendingThis ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 600,
                          letterSpacing: '0.65px',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {isSendingThis
                          ? t.sendingText
                          : isOnCooldown
                          ? t.sentText(localizedName)
                          : t.sendBtn(localizedName)}
                      </span>
                      <span
                        style={{
                          fontFamily: isOnCooldown ? THEME.sans : THEME.serif,
                          fontStyle: isOnCooldown ? 'normal' : 'italic',
                          fontSize: isOnCooldown ? '9.5px' : '13px',
                          letterSpacing: isOnCooldown ? '0.5px' : 'normal',
                          textTransform: isOnCooldown ? 'uppercase' : 'none',
                          fontWeight: isOnCooldown ? 600 : 400,
                          flexShrink: 0,
                        }}
                      >
                        {isOnCooldown ? t.inSec(cooldownRemaining) : 'Telegram →'}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {!manager.isTest && (
                <a
                  href={`tel:${manager.phone}`}
                  onClick={() => triggerHaptic('light')}
                  style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 12px',
                    border: `1px solid ${THEME.border}`,
                    backgroundColor: THEME.bg,
                    color: THEME.ink,
                    textDecoration: 'none',
                    fontSize: '9.5px',
                    fontWeight: 600,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  {t.callBtn}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ManagersContactCard;
