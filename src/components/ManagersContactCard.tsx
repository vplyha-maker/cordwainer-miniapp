const MANAGERS = [
  { index: '01', name: 'Георгий', role: 'Дирекция • Опт', phone: '+380677193716', phoneDisplay: '+380 (67) 719-37-16' },
  { index: '02', name: 'Борис', role: 'Дирекция • Производство', phone: '+380974541511', phoneDisplay: '+380 (97) 454-15-11' },
  { index: '03', name: 'Test', role: 'Технический отдел', phone: '+380675750094', phoneDisplay: '+380 (67) 575-00-94' },
];

const THEME = {
  bg: '#F2EFE9',
  surface: '#F8F6F1',
  ink: '#161514',
  inkMuted: '#6E6A63',
  inkLight: '#9A958C',
  border: '#DCD7CC',
  serif: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
  sans: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
};

export function ManagersContactCard() {
  return (
    <div
      style={{
        marginBottom: '36px',
        fontFamily: THEME.sans,
        color: THEME.ink,
      }}
    >
      {/* Журнальная шапка секции в стиле скриншота 3 */}
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
        <span>III. ДИРЕКЦИЯ МАНУФАКТУРЫ</span>
        <span>ПРЯМАЯ ЛИНИЯ</span>
      </div>

      {/* Табличный реестр контактов без зазоров (Swiss Grid) */}
      <div
        style={{
          borderTop: `1px solid ${THEME.border}`,
          borderLeft: `1px solid ${THEME.border}`,
          borderRight: `1px solid ${THEME.border}`,
          backgroundColor: THEME.surface,
        }}
      >
        {MANAGERS.map((mgr) => (
          <div
            key={mgr.index}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: ' stretch',
              borderBottom: `1px solid ${THEME.border}`,
            }}
          >
            {/* Левая ячейка: Индекс, Имя (антиква) и Номер */}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
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
                    fontSize: '18px',
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
                  }}
                >
                  / {mgr.role}
                </span>
              </div>

              <div
                style={{
                  fontSize: '11px',
                  color: THEME.inkMuted,
                  letterSpacing: '0.6px',
                  marginTop: '4px',
                  paddingLeft: '20px',
                }}
              >
                {mgr.phoneDisplay}
              </div>
            </div>

            {/* Правая ячейка: Строгие типографические кнопки в сетке */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                borderLeft: `1px solid ${THEME.border}`,
                minWidth: '148px',
              }}
            >
              <a
                href={`tel:${mgr.phone}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 12px',
                  backgroundColor: 'transparent',
                  color: THEME.ink,
                  textDecoration: 'none',
                  fontSize: '9px',
                  fontWeight: 500,
                  letterSpacing: '1.2px',
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
                  padding: '0 12px',
                  backgroundColor: THEME.bg,
                  color: THEME.ink,
                  textDecoration: 'none',
                  fontSize: '9px',
                  fontWeight: 500,
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                }}
              >
                Viber ↗
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Нижний архивный колонтитул страницы */}
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
