import React, { useState, useEffect, useRef } from 'react';

export type ManagerContact = {
  id: string;
  name: string;
  role: string;
  phone: string;
  phoneDisplay: string;
  viber: string;
  telegramUsername?: string;
  telegramId: string;
  isTest?: boolean;
};

type ManagersContactCardProps = {
  itemsCount?: number;
  onSendOrder?: (manager: ManagerContact) => Promise<boolean>;
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
    name: 'Борис',
    role: 'Руководитель оптового отдела',
    phone: '+380974541511',
    phoneDisplay: '+38 (097) 454-15-11',
    viber: 'viber://chat?number=%2B380974541511',
    telegramId: '8529254699',
  },
  {
    id: 'georgiy',
    name: 'Георгий',
    role: 'Руководитель производства и продаж',
    phone: '+380677193716',
    phoneDisplay: '+38 (067) 719-37-16',
    viber: 'viber://chat?number=%2B380677193716',
    telegramId: '6034597342',
  },
  {
    id: 'test',
    name: 'Test',
    role: 'Тестовый контур проверки заказов',
    phone: '+380000000000',
    phoneDisplay: 'Тестовый канал',
    viber: '',
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
  viber: '#59267C',
  telegram: '#1C6499',
  serif: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
  sans: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
};

// 1. ТАКТИЛЬНЫЙ ДВИЖОК (Telegram WebApp HapticFeedback + HTML5 Vibration fallback)
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
  } catch {
    // Игнорируем ограничения браузера, если вибрация недоступна
  }
}

// 2. ЗВУКОВОЙ ДВИЖОК (предзагрузка в память и мгновенное воспроизведение)
const audioCache: Record<string, HTMLAudioElement> = {};
const SOUND_FILES = ['zakaz.mp3', 'nul.mp3', 'viber.mp3'];

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
      } catch {
        // Игнорируем ошибки предзагрузки
      }
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
      playPromise.catch(() => {
        // Автовоспроизведение может блокироваться до первого тапа
      });
    }
  } catch {
    // Игнорируем аудио-ошибки
  }
}

function loadSavedCooldowns(): Record<string, number> {
  try {
    const raw = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    const valid: Record<string, number> = {};
    for (const [key, expiresAt] of Object.entries(parsed)) {
      if (expiresAt > now) {
        valid[key] = expiresAt;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

export function ManagersContactCard({
  itemsCount = 0,
  onSendOrder,
  onCopyInvoice,
  copied = false,
  isFormValid = true,
  missingFields = [],
  onValidationFail,
}: ManagersContactCardProps) {
  // Двухшаговое подтверждение: ID менеджера, которому сейчас открыто подтверждение
  const [confirmingManagerId, setConfirmingManagerId] = useState<string | null>(null);
  // ID менеджера, которому прямо сейчас уходит сетевой запрос
  const [sendingManagerId, setSendingManagerId] = useState<string | null>(null);
  // Таймеры кулдауна (timestamp окончания блокировки для каждого менеджера)
  const [cooldowns, setCooldowns] = useState<Record<string, number>>(() => loadSavedCooldowns());
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Анти-кликер: скрытая ловушка для ботов (honeypot) и детектор спам-серий
  const [honeypotValue, setHoneypotValue] = useState('');
  const [spamBlockedUntil, setSpamBlockedUntil] = useState<number>(0);
  const clickTimestampsRef = useRef<number[]>([]);
  const isSendingRef = useRef<boolean>(false);

  useEffect(() => {
    preloadAppSounds();
  }, []);

  // Тик таймера каждую секунду, пока есть активные кулдауны или анти-спам блок
  useEffect(() => {
    const hasActiveCooldown =
      Object.values(cooldowns).some((exp) => exp > Date.now()) || spamBlockedUntil > Date.now();

    if (!hasActiveCooldown) return;

    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldowns, spamBlockedUntil]);

  // Сохранение кулдаунов в localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(cooldowns));
    } catch {
      // Ignore storage errors
    }
  }, [cooldowns]);

  // Сброс открытого подтверждения, если форма стала невалидной
  useEffect(() => {
    if (!isFormValid && confirmingManagerId) {
      setConfirmingManagerId(null);
    }
  }, [isFormValid, confirmingManagerId]);

  // Проверка на автокликер и спам-частоту нажатий
  const checkAntiClicker = (e: React.MouseEvent): boolean => {
    // 1. Блокируем синтетические клики из JS-скриптов
    if (!e.isTrusted) {
      triggerHaptic('error');
      return false;
    }

    // 2. Если заполнено скрытое поле-ловушка
    if (honeypotValue.trim().length > 0) {
      triggerHaptic('error');
      return false;
    }

    const now = Date.now();
    if (spamBlockedUntil > now) {
      triggerHaptic('error');
      return false;
    }

    // 3. Фильтруем клики за последние 3 секунды (не более 5 быстрых кликов подряд)
    const recentClicks = clickTimestampsRef.current.filter((t) => now - t < 3000);
    recentClicks.push(now);
    clickTimestampsRef.current = recentClicks;

    if (recentClicks.length > 5) {
      triggerHaptic('error');
      setSpamBlockedUntil(now + 10000); // Блокировка на 10 секунд при спам-атаке
      setNowTick(now);
      setConfirmingManagerId(null);
      return false;
    }

    return true;
  };

  // Шаг 1: Нажатие «Отправить заказ» (проверка валидности и открытие подтверждения)
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

  // Шаг 2: Окончательное подтверждение отправки заказа
  const handleConfirmSend = async (e: React.MouseEvent, manager: ManagerContact) => {
    if (!checkAntiClicker(e)) return;
    if (!onSendOrder) return;

    // Синхронная защита от двойного клика
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
      const ok = await onSendOrder(manager);
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
      {/* Скрытое поле-ловушка для ботов и автозаполнителей */}
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
          marginBottom: '8px',
        }}
      >
        <span>II. ОТПРАВКА ЗАКАЗА И КОНТАКТЫ</span>
        <span>ПРЯМАЯ СВЯЗЬ</span>
      </div>

      {/* Предупреждение при срабатывании защиты от автокликера */}
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
          Зафиксирована слишком высокая частота нажатий. Подождите {spamLockSeconds} сек.
        </div>
      )}

      {/* Подсказка, если не все поля заполнены */}
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
          Для отправки заказа укажите: <strong>{missingFields.join(', ')}</strong> ↑
        </div>
      )}

      {/* Кнопка копирования текста накладной в буфер обмена */}
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
            transition: 'background-color 0.2s ease',
          }}
        >
          <span>{copied ? '✓ Текст накладной скопирован' : 'Скопировать текст накладной'}</span>
          <span style={{ fontSize: '12px' }}>{copied ? '✓' : '📋'}</span>
        </button>
      )}

      {/* Карточки руководителей */}
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

          return (
            <div
              key={manager.id}
              style={{
                backgroundColor: THEME.surface,
                border: `1px solid ${isConfirmingThis ? THEME.ink : THEME.border}`,
                padding: '14px',
                boxSizing: 'border-box',
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
                    fontSize: '20px',
                    fontWeight: 500,
                    color: THEME.ink,
                  }}
                >
                  {manager.name}
                </div>
                {!manager.isTest && (
                  <a
                    href={`tel:${manager.phone}`}
                    onClick={() => triggerHaptic('light')}
                    style={{
                      fontSize: '12px',
                      color: THEME.ink,
                      textDecoration: 'none',
                      fontWeight: 600,
                      letterSpacing: '0.3px',
                    }}
                  >
                    {manager.phoneDisplay}
                  </a>
                )}
              </div>

              <div
                style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.9px',
                  color: THEME.inkMuted,
                  marginBottom: '12px',
                }}
              >
                {manager.role}
              </div>

              {/* Блок прямой отправки заказа в Telegram руководителю */}
              {onSendOrder && itemsCount > 0 && (
                <div style={{ marginBottom: manager.isTest ? '0' : '10px' }}>
                  {isConfirmingThis && !isOnCooldown ? (
                    <div
                      style={{
                        backgroundColor: THEME.surfaceActive,
                        border: `1px solid ${THEME.ink}`,
                        padding: '10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: THEME.ink,
                          marginBottom: '8px',
                          fontWeight: 500,
                        }}
                      >
                        Отправить оптовый заказ ({itemsCount} мод.) руководителю ({manager.name})?
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px' }}>
                        <button
                          type="button"
                          disabled={isAnySending || isSpamLocked}
                          onClick={(e) => handleConfirmSend(e, manager)}
                          style={{
                            padding: '11px 10px',
                            backgroundColor: THEME.accentGreen,
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '1.1px',
                            textTransform: 'uppercase',
                            cursor: isAnySending ? 'wait' : 'pointer',
                          }}
                        >
                          {isSendingThis ? 'Отправка заказа...' : '✓ Подтвердить отправку'}
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
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          Отмена
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
                        padding: '12px 14px',
                        backgroundColor: isOnCooldown
                          ? THEME.surfaceActive
                          : THEME.ink,
                        color: isOnCooldown ? THEME.accentGreen : '#FFFFFF',
                        border: `1px solid ${isOnCooldown ? THEME.accentGreen : THEME.ink}`,
                        fontSize: '10px',
                        fontWeight: 600,
                        letterSpacing: '1.3px',
                        textTransform: 'uppercase',
                        cursor:
                          isOnCooldown || isAnySending || isSpamLocked
                            ? 'not-allowed'
                            : 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        opacity: isAnySending && !isSendingThis ? 0.6 : 1,
                      }}
                    >
                      <span>
                        {isSendingThis
                          ? 'Отправка накладной...'
                          : isOnCooldown
                          ? `✓ Заказ отправлен (${manager.name})`
                          : `Отправить заказ • ${manager.name}`}
                      </span>
                      <span
                        style={{
                          fontFamily: isOnCooldown ? THEME.sans : THEME.serif,
                          fontStyle: isOnCooldown ? 'normal' : 'italic',
                          fontSize: isOnCooldown ? '10px' : '13px',
                        }}
                      >
                        {isOnCooldown ? `Повтор через ${cooldownRemaining}с` : 'Telegram →'}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Быстрые кнопки Позвонить / Viber для основных руководителей */}
              {!manager.isTest && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <a
                    href={`tel:${manager.phone}`}
                    onClick={() => triggerHaptic('light')}
                    style={{
                      padding: '9px 8px',
                      border: `1px solid ${THEME.border}`,
                      backgroundColor: THEME.bg,
                      color: THEME.ink,
                      textDecoration: 'none',
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                    }}
                  >
                    Позвонить
                  </a>
                  <a
                    href={manager.viber}
                    onClick={() => {
                      triggerHaptic('light');
                      playAppSound('viber.mp3');
                    }}
                    style={{
                      padding: '9px 8px',
                      border: `1px solid ${THEME.viber}`,
                      backgroundColor: 'transparent',
                      color: THEME.viber,
                      textDecoration: 'none',
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                    }}
                  >
                    Написать в Viber
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ManagersContactCard;
