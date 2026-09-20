export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  const { userId, productId } = req.body;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'Токен бота не настроен на Vercel' });
  }

  if (!userId || !productId) {
    return res.status(400).json({ error: 'Не указаны userId или productId' });
  }

  const url = `https://api.telegram.org/bot${token}/createInvoiceLink`;

  // Исправлен шаблонный литерал для payload
  const payload = {
    title: "PRO: Конструктивные данные",
    description: "Разовый доступ к расширенным функциям",
    payload: `${userId}_buy_${productId}`,
    currency: "XTR",
    prices: [{ label: "Цена", amount: 1 }] // 1 звезда
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.ok) {
      return res.status(200).json({ invoiceLink: data.result });
    } else {
      console.error('Telegram API error:', data);
      return res.status(500).json({ 
        error: data.description || 'Ошибка создания инвойса' 
      });
    }
  } catch (e: any) {
    console.error('Fetch error:', e);
    return res.status(500).json({ error: e.message || 'Внутренняя ошибка сервера' });
  }
}
