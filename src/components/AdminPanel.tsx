export const AdminPanel: React.FC = () => {
  // Указываем ваш реальный ID администратора из скриншота
  const ADMIN_ID = 8686072747; 
  
  const currentUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const isAdmin = currentUser?.id === ADMIN_ID;

  const [targetUserId, setTargetUserId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isAdmin) {
    return null;
  }

  const handleGrant = async () => {
    if (!targetUserId.trim()) {
      setStatus({ text: '⚠️ Введите ID пользователя', isError: true });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/admin/grant-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: Number(targetUserId.trim()) })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus({ text: `✅ Доступ выдан, уведомление отправлено!`, isError: false });
        setTargetUserId('');
      } else {
        setStatus({ text: `❌ ${data.error || 'Ошибка при выдаче'}`, isError: true });
      }
    } catch (err) {
      setStatus({ text: `❌ Ошибка сети`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>🛠 Админ-панель Cardio</h3>
      <p style={styles.subtitle}>Выдача премиум-доступа клиенту</p>

      <div style={styles.formGroup}>
        <input
          type="tel"
          placeholder="Telegram ID клиента"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          style={styles.input}
        />
        <button
          onClick={handleGrant}
          disabled={loading}
          style={styles.button}
        >
          {loading ? 'Отправка...' : '🚀 Открыть'}
        </button>
      </div>

      {status && (
        <p style={{ ...styles.status, color: status.isError ? '#ff6b6b' : '#51cf66' }}>
          {status.text}
        </p>
      )}
    </div>
  );
};

