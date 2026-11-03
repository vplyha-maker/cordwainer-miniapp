import React, { useState } from 'react';

export const AdminPanel: React.FC = () => {
  const ADMIN_ID = 8686072747; // Ваш ID из Telegram
  
  const currentUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
  const isAdmin = currentUser?.id === ADMIN_ID;

  const [targetUserId, setTargetUserId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isAdmin) {
    return null; // Обычные пользователи вообще не увидят эту панель
  }

  const handleGrant = async () => {
    if (!targetUserId.trim()) {
      setStatus({ text: '⚠️ Введите ID пользователя', isError: true });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/grant-access', {
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

const styles = {
  card: {
    background: '#161616',
    border: '1px solid #2a2a2a',
    borderRadius: '16px',
    padding: '16px',
    margin: '16px 0',
    color: '#ffffff',
  },
  title: { fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0' },
  subtitle: { fontSize: '12px', color: '#888', margin: '0 0 12px 0' },
  formGroup: { display: 'flex', gap: '8px' },
  input: {
    flex: 1,
    background: '#222',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  button: {
    background: '#ffffff',
    color: '#000000',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
  },
  status: { fontSize: '13px', margin: '10px 0 0 0' },
};
