import { useState, useEffect } from 'react';

export type ManagerContact = {
  index: string;
  name: string;
  role: string;
  telegramId: string;
  phone: string;
  phoneDisplay: string;
};

export const MANAGERS_LIST: ManagerContact[] = [
  {
    index: '01',
    name: 'Борис',
    role: 'Дирекция • Производство',
    telegramId: '8529254699',
    phone: '+380974541511',
    phoneDisplay: '+380 (97) 454-15-11',
  },
  {
    index: '02',
    name: 'Георгий',
    role: 'Дирекция • Опт',
    telegramId: '6034597342',
    phone: '+380677193716',
    phoneDisplay: '+380 (67) 719-37-16',
  },
  {
    index: '03',
    name: 'Test',
    role: 'Технический отдел',
    telegramId: '8686072747',
    phone: '+380675750094',
    phoneDisplay: '+380 (67) 575-00-94',
  },
];

// Глобальный кэш предзагруженных аудиофайлов, чтобы они не удалялись сборщиком мусора при перерисовке React
const audioCache: Record<string, HTMLAudioElement> = {};

export function preloadAppSounds() {
  if (typeof window === 'undefined') return;
  (['zakaz.mp3', 'nul.mp3'] as const).forEach((file) => {
    if (!audioCache[file]) {
      const audio = new Audio(`/${file}`);
      audio.preload = 'auto';
      audio.volume = 1.0;
      audio.load();
      audioCache[file] = audio;
    }
  });
}

// Резервный синтезатор звука (сработает, если браузер не нашел mp3-файл или заблокировал его)
function playFallbackSynth(type: 'zakaz.mp3' | 'nul.mp3') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'zakaz.mp3') {
      // Двойной восходящий сигнал успешного заказа
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Нисходящий звук аннулирования / сброса
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.26);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.26);
    }
  } catch {
    // Игнорируем
  }
}

// Надежное воспроизведение звука из кэша с проверкой обоих путей (/nul.mp3 и /sounds/nul.mp3)
export function playAppSound(fileName: 'zakaz.mp3' | 'nul.mp3') {
  try {
    let audio = audioCache[fileName];
    if (!audio) {
      audio = new Audio(`/${fileName}`);
      audio.volume = 1.0;
      audioCache[fileName] = audio;
    }
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Пробуем альтернативный путь или включаем синтезатор
        const altAudio = new Audio(`/sounds/${fileName}`);
        altAudio.volume = 1.0;
        altAudio.play().catch(() => {
          playFallbackSynth(fileName);
        });
      });
    }
  } catch {
    playFallbackSynth(fileName);
  }
}

// Тактильный отклик (Telegram WebApp Haptics + Вибрация телефона)
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tgHaptic = (window as any)?.Telegram?.WebApp?.HapticFeedback;
    if (tgHaptic) {
      if (type === 'success' || type === 'warning' || type === 'error') {
        tgHaptic.notificationOccurred(type);
      } else {
        tgHaptic.impactOccurred(type);
      }
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'error' || type === 'warning') {
        navigator.vibrate([50, 40, 60]);
      } else if (type === 'success') {
        navigator.vibrate([35, 50, 80]);
      } else if (type === 'heavy') {
        navigator.vibrate(60);
      } else {
        navigator.vibrate(30);
      }
    }
  } catch {
    // Игнорируем
  }
}

type ManagersContactCardProps = {
  itemsCount?: number;
  onSendOrder?: (manager: ManagerContact) => Promise<boolean | void> | boolean | void;
  onCopyInvoice?: () => void;
  copied?: boolean;
  isFormValid?: boolean;
  missingFields?: string[];
  onValidationFail?: () => void;
};

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

export function ManagersContactCard({
  itemsCount,
  onSendOrder,
  onCopyInvoice,
  copied = false,
  isFormValid = true,
  missingFields = [],
  onValidationFail,
}: ManagersContactCardProps) {
  const [selectedManagerId, setSelectedManagerId] = useState<string>(MANAGERS_LIST[0].telegramId);
  const [pressedButtonKey, setPressedButtonKey] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentSuccessId, setSentSuccessId] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Защита от детей и кликеров
  const [confirmingManager, setConfirmingManager] = useState<ManagerContact | null>(null);
  const [guardTargetCode, setGuardTargetCode] = useState<number>(0);
  const [guardOptions, setGuardOptions] = useState<number[]>([]);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Предзагружаем звуки сразу при монтировании
  useEffect(() => {
    preloadAppSounds();
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 3500);
  };

  const openSecurityGuard = (mgr: ManagerContact) => {
    const correct = Math.floor(10 + Math.random() * 89);
    let wrong1 = Math.floor(10 + Math.random() * 89);
    let wrong2 = Math.floor(10 + Math.random() * 89);
    while (wrong1 === correct) wrong1 = Math.floor(10 + Math.random() * 89);
    while (wrong2 === correct || wrong2 === wrong1) wrong2 = Math.floor(10 + Math.random() * 89);

    const shuffled = [correct, wrong1, wrong2].sort(() => Math.random() - 0.5);
    setGuardTargetCode(correct);
    setGuardOptions(shuffled);
    setConfirmingManager(mgr);
  };

  const handleInitialSendClick = (mgr: ManagerContact) => {
    setSelectedManagerId(mgr.telegramId);
    setPressedButtonKey(`send-${mgr.telegramId}`);
    setTimeout(() => setPressedButtonKey(null), 180);

    if (!onSendOrder || sendingId) return;

    if (cooldownSeconds > 0) {
      triggerHaptic('warning');
      return;
    }

    if (!isFormValid) {
      triggerHaptic('error');
      onValidationFail?.();
      return;
    }

    triggerHaptic('medium');
    openSecurityGuard(mgr);
  };

  const handleConfirmSecurityCode = async (chosenNumber: number) => {
    if (!confirmingManager || !onSendOrder) return;

    if (chosenNumber !== guardTargetCode) {
      triggerHaptic('error');
      playAppSound('nul.mp3');
      setConfirmingManager(null);
      showToast('Неверный защитный код. Отправка отменена.');
      return;
    }

    const targetMgr = confirmingManager;
    setConfirmingManager(null);

    try {
      setSendingId(targetMgr.telegramId);
      triggerHaptic('success');
      playAppSound('zakaz.mp3');

      const result = await onSendOrder(targetMgr);
      if (result !== false) {
        setSentSuccessId(targetMgr.telegramId);
        setCooldownSeconds(30);
        setTimeout(() => setSentSuccessId(null), 5000);
      }
    } finally {
      setSendingId(null);
    }
  };

  // Безопасный запуск Тел / Viber / Telegram без падения WebView в ошибку ERR_UNKNOWN_URL_SCHEME
  const handleMessengerAction = async (
    type: 'tel' | 'viber' | 'tg',
    mgr: ManagerContact
  ) => {
    const key = `${type}-${mgr.telegramId}`;
    setPressedButtonKey(key);
    setSelectedManagerId(mgr.telegramId);
    triggerHaptic('medium');
    setTimeout(() => setPressedButtonKey(null), 180);

    const cleanDigits = mgr.phone.replace(/\D/g, '');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tgWebApp = (window as any)?.Telegram?.WebApp;

    // Всегда страхуем пользователя копированием номера в буфер обмена
    try {
      await navigator.clipboard.writeText(mgr.phone);
    } catch {
      // Игнорируем
    }

    if (type === 'tel') {
      showToast(`📞 Номер ${mgr.name} (${mgr.phoneDisplay}) скопирован • Вызов...`);
      // Если открыто внутри Telegram Mini App, открываем внешний мост звонка, чтобы не ронять WebView
      const bridgeUrl = `${window.location.origin}${window.location.pathname}?open_tel=${cleanDigits}`;
      if (tgWebApp?.openLink) {
        tgWebApp.openLink(bridgeUrl);
      } else {
        window.open(`tel:+${cleanDigits}`, '_top');
      }
    } else if (type === 'viber') {
      showToast(`💬 Номер ${mgr.name} скопирован • Открываем Viber...`);
      // Открываем через системный браузер телефона (Telegram.WebApp.openLink принимает только https://),
      // а системный браузер сам запускает приложение Viber без ошибки ERR_UNKNOWN_URL_SCHEME
      const bridgeUrl = `${window.location.origin}${window.location.pathname}?open_viber=${cleanDigits}`;
      if (tgWebApp?.openLink) {
        tgWebApp.openLink(bridgeUrl);
      } else {
        window.open(`viber://chat?number=%2B${cleanDigits}`, '_blank');
      }
    } else if (type === 'tg') {
      showToast(`✈️ Открываем чат Telegram (${mgr.name})...`);
      const tgUrl = `https://t.me/+${cleanDigits}`;
      if (tgWebApp?.openTelegramLink) {
        tgWebApp.openTelegramLink(tgUrl);
      } else {
        window.open(tgUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleCopyClick = () => {
    setPressedButtonKey('copy-btn');
    setTimeout(() => setPressedButtonKey(null), 180);

    if (!isFormValid) {
      triggerHaptic('error');
      onValidationFail?.();
      return;
    }

    triggerHaptic('success');
    playAppSound('zakaz.mp3');
    onCopyInvoice?.();
  };

  return (
    <div
      style={{
        marginBottom: '36px',
        fontFamily: THEME.sans,
        color: THEME.ink,
      }}
    >
      {/* Журнальная шапка секции */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          letterSpacing: '1.6px',
          textTransform: 'uppercase',
          color: THEME.inkMuted,
          marginBottom: '8px',
        }}
      >
        <span>
          {onSendOrder
            ? `II. ДИРЕКЦИЯ И ОТПРАВКА (${itemsCount || 0} МОД.)`
            : 'ДИРЕКЦИЯ МАНУФАКТУРЫ'}
        </span>
        <span>DIRECT • VIBER • TG</span>
      </div>

      {/* Всплывающее уведомление о вызове / копировании номера */}
      {statusToast && (
        <div
          style={{
            backgroundColor: THEME.ink,
            color: '#FFFFFF',
            padding: '10px 12px',
            marginBottom: '10px',
            fontSize: '11px',
            letterSpacing: '0.4px',
          }}
        >
          {statusToast}
        </div>
      )}

      {/* Предупреждение, если не заполнены обязательные поля */}
      {onSendOrder && !isFormValid && (
        <div
          onClick={() => {
            triggerHaptic('light');
            onValidationFail?.();
          }}
          style={{
            backgroundColor: '#F9ECEC',
            border: `1px solid ${THEME.danger}`,
            padding: '10px 12px',
            marginBottom: '10px',
            fontSize: '11px',
            color: THEME.danger,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div>
            <strong>Накладная заблокирована:</strong> заполните {missingFields.join(', ')}
          </div>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0, textDecoration: 'underline' }}>
            Заполнить ↑
          </span>
        </div>
      )}

      {/* Модальная вставка защиты от детей и автокликеров */}
      {confirmingManager && (
        <div
          style={{
            backgroundColor: THEME.ink,
            color: '#FFFFFF',
            padding: '16px',
            marginBottom: '12px',
            border: `1px solid ${THEME.ink}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#A8A39A' }}>
              ЗАЩИТА ОТ СЛУЧАЙНОЙ ОТПРАВКИ
            </span>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setConfirmingManager(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#A8A39A',
                fontSize: '11px',
                cursor: 'pointer',
                padding: '2px 4px',
              }}
            >
              ✕ Отмена
            </button>
          </div>

          <div style={{ fontFamily: THEME.serif, fontSize: '17px', marginBottom: '12px', lineHeight: 1.3 }}>
            Отправить заказ руководителю <strong>{confirmingManager.name}</strong>? Для подтверждения нажмите код{' '}
            <span style={{ textDecoration: 'underline', fontWeight: 700 }}>{guardTargetCode}</span>:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {guardOptions.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleConfirmSecurityCode(num)}
                style={{
                  padding: '12px 0',
                  backgroundColor: THEME.surface,
                  color: THEME.ink,
                  border: 'none',
                  fontFamily: THEME.serif,
                  fontSize: '18px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Единый табличный реестр (Swiss Grid) */}
      <div
        style={{
          borderTop: `1px solid ${THEME.border}`,
          borderLeft: `1px solid ${THEME.border}`,
          borderRight: `1px solid ${THEME.border}`,
          backgroundColor: THEME.surface,
        }}
      >
        {MANAGERS_LIST.map((mgr) => {
          const isSelected = selectedManagerId === mgr.telegramId;
          const isSending = sendingId === mgr.telegramId;
          const isSentSuccess = sentSuccessId === mgr.telegramId;
          const isSendPressed = pressedButtonKey === `send-${mgr.telegramId}`;

          let sendBg = THEME.surfaceActive;
          let sendColor = THEME.ink;

          if (!isFormValid) {
            sendBg = '#E6E2D8';
            sendColor = '#8E8980';
          } else if (isSentSuccess) {
            sendBg = THEME.accentGreen;
            sendColor = '#FFFFFF';
          } else if (isSending || isSelected) {
            sendBg = THEME.ink;
            sendColor = '#FFFFFF';
          }

          return (
            <div
              key={mgr.index}
              onClick={() => setSelectedManagerId(mgr.telegramId)}
              style={{
                borderBottom: `1px solid ${THEME.border}`,
                backgroundColor: isSelected ? '#FBF9F5' : THEME.surface,
                transition: 'background-color 0.15s ease',
              }}
            >
              {/* Верхняя строка: Индекс, Имя, Роль и Телефон */}
              <div
                style={{
                  padding: '12px 14px 10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '9px',
                      color: isSelected ? THEME.ink : THEME.inkLight,
                      fontWeight: isSelected ? 700 : 400,
                      letterSpacing: '1px',
                    }}
                  >
                    {mgr.index}
                  </span>
                  <span
                    style={{
                      fontFamily: THEME.serif,
                      fontSize: '19px',
                      fontWeight: isSelected ? 600 : 400,
                      color: THEME.ink,
                      letterSpacing: '0.2px',
                    }}
                  >
                    {mgr.name}
                  </span>
                  <span
                    style={{
                      fontFamily: THEME.serif,
                      fontStyle: 'italic',
                      fontSize: '11px',
                      color: THEME.inkMuted,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    / {mgr.role}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    color: THEME.inkMuted,
                    letterSpacing: '0.4px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {mgr.phoneDisplay}
                </span>
              </div>

              {/* Нижняя строка: 4 действия в одну линию (Отправить заказ | Тел. | Viber | TG) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: onSendOrder ? '1.45fr 0.52fr 0.55fr 0.48fr' : '1fr 1fr 1fr',
                  borderTop: `1px solid ${THEME.border}`,
                }}
              >
                {onSendOrder && (
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInitialSendClick(mgr);
                    }}
                    style={{
                      padding: '11px 10px',
                      backgroundColor: sendBg,
                      color: sendColor,
                      border: 'none',
                      borderRight: `1px solid ${THEME.border}`,
                      fontSize: '9px',
                      fontWeight: 600,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      cursor: isSending ? 'wait' : 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textAlign: 'left',
                      transform: isSendPressed ? 'scale(0.97)' : 'scale(1)',
                      transition: 'all 0.14s ease',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isSending
                        ? 'ОТПРАВКА...'
                        : isSentSuccess
                        ? '✓ ОТПРАВЛЕНО'
                        : cooldownSeconds > 0
                        ? `ПАУЗА ${cooldownSeconds}С`
                        : 'ОТПРАВИТЬ ЗАКАЗ'}
                    </span>
                    <span style={{ fontSize: '11px', flexShrink: 0, marginLeft: '4px' }}>
                      {isSentSuccess ? '✓' : '→'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMessengerAction('tel', mgr);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '11px 4px',
                    backgroundColor:
                      pressedButtonKey === `tel-${mgr.telegramId}` ? THEME.ink : 'transparent',
                    color: pressedButtonKey === `tel-${mgr.telegramId}` ? '#FFFFFF' : THEME.ink,
                    border: 'none',
                    borderRight: `1px solid ${THEME.border}`,
                    fontSize: '9px',
                    fontWeight: 500,
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  ТЕЛ. ↗
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMessengerAction('viber', mgr);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '11px 4px',
                    backgroundColor:
                      pressedButtonKey === `viber-${mgr.telegramId}` ? THEME.ink : 'transparent',
                    color: pressedButtonKey === `viber-${mgr.telegramId}` ? '#FFFFFF' : THEME.ink,
                    border: 'none',
                    borderRight: `1px solid ${THEME.border}`,
                    fontSize: '9px',
                    fontWeight: 500,
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  VIBER ↗
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMessengerAction('tg', mgr);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '11px 4px',
                    backgroundColor:
                      pressedButtonKey === `tg-${mgr.telegramId}` ? THEME.ink : THEME.bg,
                    color: pressedButtonKey === `tg-${mgr.telegramId}` ? '#FFFFFF' : THEME.ink,
                    border: 'none',
                    fontSize: '9px',
                    fontWeight: 600,
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  TG ↗
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ВЫДЕЛЕННАЯ ЗАМЕТНАЯ КНОПКА КОПИРОВАНИЯ НАКЛАДНОЙ */}
      {onCopyInvoice && (
        <div
          style={{
            marginTop: '12px',
            padding: '3px',
            border: `1px solid ${THEME.ink}`,
            backgroundColor: THEME.surface,
          }}
        >
          <button
            type="button"
            onClick={handleCopyClick}
            style={{
              width: '100%',
              padding: '14px 16px',
              backgroundColor: copied
                ? THEME.accentGreen
                : pressedButtonKey === 'copy-btn'
                ? '#333333'
                : THEME.ink,
              color: '#FFFFFF',
              border: 'none',
              fontSize: '10px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transform: pressedButtonKey === 'copy-btn' ? 'scale(0.985)' : 'scale(1)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>
              {copied
                ? '✓ ТЕКСТ НАКЛАДНОЙ СКОПИРОВАН В БУФЕР'
                : 'СКОПИРОВАТЬ ТЕКСТ НАКЛАДНОЙ В БУФЕР'}
            </span>
            <span
              style={{
                fontFamily: THEME.serif,
                fontStyle: 'italic',
                fontSize: '13px',
                textTransform: 'none',
                letterSpacing: 0,
                padding: '2px 8px',
                border: '1px solid rgba(255,255,255,0.35)',
              }}
            >
              {copied ? 'Copied ✓' : 'Copy ↗'}
            </span>
          </button>
        </div>
      )}

      {/* Архивный колонтитул в самом низу */}
      <div
        style={{
          marginTop: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '9px',
          letterSpacing: '1.2px',
          textTransform: 'uppercase',
          color: THEME.inkLight,
        }}
      >
        <span>CORDWAINER // CARDIO B2B</span>
        <span>KHARKIV ATELIER</span>
      </div>
    </div>
  );
}
