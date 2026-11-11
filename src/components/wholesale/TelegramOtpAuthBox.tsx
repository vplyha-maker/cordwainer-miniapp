/**
 * @file src/components/wholesale/TelegramOtpAuthBox.tsx
 * @description Изолированный UI-компонент двухфакторной защиты архива «Мои заказы»
 * через 4-значный одноразовый код в Telegram (@Cordwainer_bot).
 *
 * ЗАЧЕМ НУЖЕН ЭТОТ ФАЙЛ:
 * 1. Заменяет открытое поле поиска по телефону на веб-сайте (www.cordwainer.app)
 *    защищенной двухшаговой формой: «Запрос кода в Telegram» -> «Ввод 4-значного кода».
 * 2. Если пользователь уже находится внутри Telegram Mini App, скрывает форму ввода кода
 *    и показывает статус доверенной Telegram-сессии.
 * 3. Если пользователь на сайте уже подтвердил свой телефон кодом, сохраняет сессию
 *    и позволяет обновлять архив в 1 клик без повторного ввода кода.
 */

import { useState, type CSSProperties } from 'react';
import type { Lang } from '../../App';
import {
  isTelegramMiniApp,
  getVerifiedPhoneSession,
  clearVerifiedPhoneSession,
  requestTelegramOtp,
  verifyTelegramOtp,
  fetchAndMergeOrderHistory,
  type ArchivedOrder,
} from './orderHistoryStore';

interface TelegramOtpAuthBoxProps {
  lang: Lang;
  clientPhone: string;
  onPhoneChange: (formattedPhone: string) => void;
  formatPhoneFn: (raw: string) => string;
  onOrdersLoaded: (orders: ArchivedOrder[]) => void;
  onHaptic?: (type?: 'light' | 'medium' | 'success' | 'error') => void;
  theme: {
    bg: string;
    surface: string;
    fieldBg: string;
    surfaceActive: string;
    ink: string;
    inkMuted: string;
    border: string;
    danger: string;
    dangerBg: string;
    accentGreen: string;
    successBg: string;
    primaryBtnBg: string;
    primaryBtnText: string;
    serif: string;
    sans: string;
  };
}

export function TelegramOtpAuthBox({
  lang,
  clientPhone,
  onPhoneChange,
  formatPhoneFn,
  onOrdersLoaded,
  onHaptic,
  theme,
}: TelegramOtpAuthBoxProps) {
  const inTelegram = isTelegramMiniApp();
  const [verifiedSession, setVerifiedSession] = useState(() =>
    getVerifiedPhoneSession()
  );

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: 'info' | 'error' | 'success';
    text: string;
  } | null>(null);

  const t = {
    ru: {
      tgTrustedBadge: '✓ Доверенная сессия Telegram Mini App',
      tgRefreshBtn: '↻ Обновить архив',
      verifiedBadge: (ph: string) => `✓ Номер подтвержден через Telegram (+38 ${ph})`,
      changePhoneBtn: 'Сменить номер',
      webTitle: '🔒 ЗАЩИЩЕННЫЙ ДОСТУП К АРХИВУ ЗАКАЗОВ',
      webHint:
        'Для защиты коммерческой тайны доступ к архиву с веб-сайта открывается по 4-значному коду в ваш Telegram (@Cordwainer_bot):',
      phonePlaceholder: '+38 (0XX) XXX-XX-XX',
      sendCodeBtn: 'Получить код в Telegram →',
      sendingCode: 'Отправка кода...',
      enterCodePrompt: 'Введите 4-значный код, отправленный вам в @Cordwainer_bot:',
      codePlaceholder: '• • • •',
      verifyBtn: 'Подтвердить и открыть заказы →',
      verifying: 'Проверка...',
      backToPhone: '← Изменить номер телефона',
      openBotLink: 'Открыть @Cordwainer_bot в Telegram ↗',
    },
    uk: {
      tgTrustedBadge: '✓ Довірена сесія Telegram Mini App',
      tgRefreshBtn: '↻ Оновити архів',
      verifiedBadge: (ph: string) => `✓ Номер підтверджено через Telegram (+38 ${ph})`,
      changePhoneBtn: 'Змінити номер',
      webTitle: '🔒 ЗАХИЩЕНИЙ ДОСТУП ДО АРХІВУ ЗАМОВЛЕНЬ',
      webHint:
        'Для захисту комерційної таємниці доступ до архіву з веб-сайту відкривається за 4-значним кодом у ваш Telegram (@Cordwainer_bot):',
      phonePlaceholder: '+38 (0XX) XXX-XX-XX',
      sendCodeBtn: 'Отримати код у Telegram →',
      sendingCode: 'Надсилання коду...',
      enterCodePrompt: 'Введіть 4-значний код, надісланий вам у @Cordwainer_bot:',
      codePlaceholder: '• • • •',
      verifyBtn: 'Підтвердити та відкрити замовлення →',
      verifying: 'Перевірка...',
      backToPhone: '← Змінити номер телефону',
      openBotLink: 'Відкрити @Cordwainer_bot у Telegram ↗',
    },
    de: {
      tgTrustedBadge: '✓ Verifizierte Telegram Mini App Sitzung',
      tgRefreshBtn: '↻ Aktualisieren',
      verifiedBadge: (ph: string) => `✓ Nummer via Telegram bestätigt (+38 ${ph})`,
      changePhoneBtn: 'Nummer ändern',
      webTitle: '🔒 GESCHÜTZTER ZUGANG ZUM BESTELLARCHIV',
      webHint:
        'Zum Schutz Ihrer Geschäftsdaten wird das Archiv im Browser über einen 4-stelligen Code in Ihrem Telegram (@Cordwainer_bot) entsperrt:',
      phonePlaceholder: '+38 (0XX) XXX-XX-XX',
      sendCodeBtn: 'Code per Telegram senden →',
      sendingCode: 'Code wird gesendet...',
      enterCodePrompt: '4-stelligen Code aus @Cordwainer_bot eingeben:',
      codePlaceholder: '• • • •',
      verifyBtn: 'Bestätigen & Bestellungen öffnen →',
      verifying: 'Prüfung...',
      backToPhone: '← Telefonnummer ändern',
      openBotLink: '@Cordwainer_bot in Telegram öffnen ↗',
    },
  }[lang];

  const inputBaseStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    border: `1.5px solid ${theme.border}`,
    backgroundColor: theme.fieldBg,
    color: theme.ink,
    WebkitTextFillColor: theme.ink,
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: theme.sans,
    borderRadius: 0,
    outline: 'none',
  };

  // 1. Если открыто внутри Telegram Mini App — никаких кодов вводить не нужно
  if (inTelegram) {
    return (
      <div
        style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          padding: '10px 14px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 600, color: theme.accentGreen }}>
          {t.tgTrustedBadge}
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            onHaptic?.('light');
            setLoading(true);
            try {
              const merged = await fetchAndMergeOrderHistory(clientPhone);
              onOrdersLoaded(merged);
            } finally {
              setLoading(false);
            }
          }}
          style={{
            backgroundColor: theme.bg,
            color: theme.ink,
            border: `1px solid ${theme.border}`,
            padding: '6px 10px',
            fontSize: '9.5px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            cursor: 'pointer',
          }}
        >
          {t.tgRefreshBtn}
        </button>
      </div>
    );
  }

  // 2. Если на веб-сайте телефон УЖЕ подтвержден кодом в текущей сессии
  if (verifiedSession) {
    return (
      <div
        style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.border}`,
          padding: '12px 14px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 600, color: theme.accentGreen }}>
          {t.verifiedBadge(verifiedSession.phone)}
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              onHaptic?.('light');
              setLoading(true);
              try {
                const merged = await fetchAndMergeOrderHistory(verifiedSession.phone);
                onOrdersLoaded(merged);
              } finally {
                setLoading(false);
              }
            }}
            style={{
              backgroundColor: theme.primaryBtnBg,
              color: theme.primaryBtnText,
              border: 'none',
              padding: '6px 10px',
              fontSize: '9.5px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              cursor: 'pointer',
            }}
          >
            {t.tgRefreshBtn}
          </button>

          <button
            type="button"
            onClick={() => {
              onHaptic?.('light');
              clearVerifiedPhoneSession();
              setVerifiedSession(null);
              setStep('phone');
              setOtpCode('');
              setStatusMsg(null);
            }}
            style={{
              backgroundColor: theme.bg,
              color: theme.inkMuted,
              border: `1px solid ${theme.border}`,
              padding: '6px 10px',
              fontSize: '9.5px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              cursor: 'pointer',
            }}
          >
            {t.changePhoneBtn}
          </button>
        </div>
      </div>
    );
  }

  // Обработчик Шага 1: Запрос 4-значного кода в Telegram
  const handleRequestCode = async () => {
    onHaptic?.('light');
    setStatusMsg(null);
    setLoading(true);
    try {
      const res = await requestTelegramOtp(clientPhone);
      if (res.success) {
        onHaptic?.('success');
        setStep('code');
        setOtpCode('');
        setStatusMsg({
          type: 'info',
          text: res.message || t.enterCodePrompt,
        });
      } else {
        onHaptic?.('error');
        setStatusMsg({
          type: 'error',
          text: res.error || 'Ошибка отправки кода',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Обработчик Шага 2: Проверка 4-значного кода
  const handleVerifyCode = async () => {
    onHaptic?.('light');
    setStatusMsg(null);
    setLoading(true);
    try {
      const res = await verifyTelegramOtp(clientPhone, otpCode);
      if (res.success) {
        onHaptic?.('success');
        setVerifiedSession(getVerifiedPhoneSession());
        if (res.orders) {
          onOrdersLoaded(res.orders);
        }
      } else {
        onHaptic?.('error');
        setStatusMsg({
          type: 'error',
          text: res.error || 'Неверный код',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Двухэтапная форма верификации для веб-сайта www.cordwainer.app
  return (
    <div
      style={{
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        padding: '14px',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.9px',
          textTransform: 'uppercase',
          color: theme.ink,
          marginBottom: '4px',
        }}
      >
        {t.webTitle}
      </div>

      <div
        style={{
          fontSize: '11px',
          color: theme.inkMuted,
          lineHeight: 1.4,
          marginBottom: '12px',
        }}
      >
        {t.webHint}
      </div>

      {statusMsg && (
        <div
          style={{
            padding: '8px 10px',
            marginBottom: '10px',
            fontSize: '11px',
            lineHeight: 1.35,
            fontWeight: 500,
            border: `1px solid ${
              statusMsg.type === 'error' ? theme.danger : theme.accentGreen
            }`,
            backgroundColor:
              statusMsg.type === 'error' ? theme.dangerBg : theme.successBg,
            color: statusMsg.type === 'error' ? theme.danger : theme.accentGreen,
          }}
        >
          {statusMsg.text}
        </div>
      )}

      {step === 'phone' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="tel"
            inputMode="tel"
            className="wc-solid-input"
            placeholder={t.phonePlaceholder}
            value={clientPhone}
            onChange={(e) => onPhoneChange(formatPhoneFn(e.target.value))}
            style={inputBaseStyle}
          />
          <button
            type="button"
            disabled={loading}
            onClick={handleRequestCode}
            style={{
              width: '100%',
              backgroundColor: theme.primaryBtnBg,
              color: theme.primaryBtnText,
              border: 'none',
              padding: '11px 14px',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.9px',
              textTransform: 'uppercase',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? t.sendingCode : t.sendCodeBtn}
          </button>

          <a
            href="https://t.me/Cordwainer_bot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '10px',
              color: theme.inkMuted,
              textAlign: 'center',
              textDecoration: 'underline',
              marginTop: '2px',
            }}
          >
            {t.openBotLink}
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={4}
            className="wc-solid-input"
            placeholder={t.codePlaceholder}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleVerifyCode();
            }}
            style={{
              ...inputBaseStyle,
              fontSize: '20px',
              letterSpacing: '8px',
              textAlign: 'center',
              fontWeight: 700,
            }}
          />

          <button
            type="button"
            disabled={loading || otpCode.length < 4}
            onClick={handleVerifyCode}
            style={{
              width: '100%',
              backgroundColor: theme.primaryBtnBg,
              color: theme.primaryBtnText,
              border: 'none',
              padding: '12px 14px',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.9px',
              textTransform: 'uppercase',
              cursor: loading || otpCode.length < 4 ? 'not-allowed' : 'pointer',
              opacity: otpCode.length < 4 ? 0.6 : 1,
            }}
          >
            {loading ? t.verifying : t.verifyBtn}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('phone');
              setStatusMsg(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: theme.inkMuted,
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            {t.backToPhone}
          </button>
        </div>
      )}
    </div>
  );
}

