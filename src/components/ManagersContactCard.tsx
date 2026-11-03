const MANAGERS = [
  { name: 'Георгий', phone: '+380677193716', phoneDisplay: '+380 (67) 719-37-16' },
  { name: 'Борис', phone: '+380974541511', phoneDisplay: '+380 (97) 454-15-11' },
  { name: 'Test', phone: '+380675750094', phoneDisplay: '+380 (67) 575-00-94' },
];

export function ManagersContactCard() {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E2DC',
        padding: '14px',
        marginBottom: '32px',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px', color: '#1A1A1A' }}>
        📞 Связь с руководством фабрики
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {MANAGERS.map((mgr, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              borderBottom: idx < MANAGERS.length - 1 ? '1px solid #F0EFEA' : 'none',
              paddingBottom: idx < MANAGERS.length - 1 ? '8px' : '0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>{mgr.name}</span>
              <span style={{ fontSize: '12px', color: '#555' }}>{mgr.phoneDisplay}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <a
                href={`tel:${mgr.phone}`}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '6px 0',
                  background: '#FAF9F6',
                  border: '1px solid #CCC',
                  color: '#1A1A1A',
                  textDecoration: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                📱 Звонок
              </a>
              <a
                href={`viber://chat?number=${mgr.phone}`}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '6px 0',
                  background: '#7360F2',
                  color: '#FFF',
                  textDecoration: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                Viber
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

