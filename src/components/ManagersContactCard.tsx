import { useState } from 'react';

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

type ManagersContactCardProps = {
  itemsCount?: number;
  onSendOrder?: (manager: ManagerContact) => Promise<void> | void;
  onCopyInvoice?: () => void;
  copied?: boolean;
};

const THEME = {
  bg: '#F2EFE9',
  surface: '#F8F6F1',
  surfaceActive: '#EAE5DC',
  ink: '#161514',
  inkMuted: '#6E6A63',
  inkLight: '#9A958C',
  border: '#DCD7CC',
  serif: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
  sans: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
};

export function ManagersContactCard({
  itemsCount,
  onSendOrder,
  onCopyInvoice,
  copied = false,
}: ManagersContactCardProps) {
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleSend = async (mgr: ManagerContact) => {
    if (!onSendOrder || sendingId) return;
    try {
      setSendingId(mgr.telegramId);
      await onSendOrder(mgr);
    } finally {
      setSendingId(null);
    }
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
        <span>DIRECT & TELEGRAM</span>
      </div>

      {/* Единый табличный реестр (Swiss Grid) */}
      <div
        style={{
          borderTop: `1px solid ${THEME.border}`,
          borderLeft: `1px solid ${THEME.border}`,
          borderRight: `1px solid ${THEME.border}`,
          backgroundColor: THEME.surface,
        }}
      >
        {MANAGERS_LIST.map((mgr, idx) => {
          const isPrimary = idx === 0;
          const isSending = sendingId === mgr.telegramId;

          return (
            <div
              key={mgr.index}
              style={{
                borderBottom: `1px solid ${THEME.border}`,
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
                      color: THEME.inkLight,
                      letterSpacing: '1px',
                    }}
                  >
                    {mgr.index}
                  </span>
                  <span
                    style={{
                      fontFamily: THEME.serif,
                      fontSize: '19px',
                      fontWeight: 400,
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

              {/* Нижняя строка: 3 действия в одну линию (Отправить заказ | Тел. | Viber) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: onSendOrder ? '1.55fr 0.72fr 0.73fr' : '1fr 1fr',
                  borderTop: `1px solid ${THEME.border}`,
                }}
              >
                {onSendOrder && (
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => handleSend(mgr)}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: isPrimary ? THEME.ink : THEME.surfaceActive,
                      color: isPrimary ? '#FFFFFF' : THEME.ink,
                      border: 'none',
                      borderRight: `1px solid ${THEME.border}`,
                      fontSize: '9px',
                      fontWeight: 600,
                      letterSpacing: '1.2px',
                      textTransform: 'uppercase',
                      cursor: isSending ? 'wait' : 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textAlign: 'left',
                    }}
                  >
                    <span>{isSending ? 'Отправка...' : 'Отправить заказ'}</span>
                    <span style={{ fontSize: '11px' }}>→</span>
                  </button>
                )}

                <a
                  href={`tel:${mgr.phone}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 6px',
                    backgroundColor: 'transparent',
                    color: THEME.ink,
                    textDecoration: 'none',
                    fontSize: '9px',
                    fontWeight: 500,
                    letterSpacing: '1.1px',
                    textTransform: 'uppercase',
                    borderRight: `1px solid ${THEME.border}`,
                  }}
                >
                  Тел. ↗
                </a>

                <a
                  href={`viber://chat?number=${mgr.phone}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 6px',
                    backgroundColor: THEME.bg,
                    color: THEME.ink,
                    textDecoration: 'none',
                    fontSize: '9px',
                    fontWeight: 500,
                    letterSpacing: '1.1px',
                    textTransform: 'uppercase',
                  }}
                >
                  Viber ↗
                </a>
              </div>
            </div>
          );
        })}

        {/* Кнопка копирования текста бордеро прямо в подвале таблицы */}
        {onCopyInvoice && (
          <button
            type="button"
            onClick={onCopyInvoice}
            style={{
              width: '100%',
              padding: '11px 14px',
              backgroundColor: THEME.bg,
              color: THEME.inkMuted,
              border: 'none',
              borderBottom: `1px solid ${THEME.border}`,
              fontSize: '9px',
              letterSpacing: '1.4px',
              textTransform: 'uppercase',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              {copied ? '✓ Текстовая спецификация скопирована' : 'Скопировать текст накладной в буфер'}
            </span>
            <span style={{ fontFamily: THEME.serif, fontStyle: 'italic', fontSize: '11px', textTransform: 'none', letterSpacing: 0 }}>
              {copied ? 'Done' : 'Copy ↗'}
            </span>
          </button>
        )}
      </div>

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
