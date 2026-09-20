export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  const { userId, productId } = req.body;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'Токен бота не настроен на Vercel' });
  }

  const url = `https://api.telegram.org/bot${token}/createInvoiceLink`;
  const payload = {
    title: "PRO: Конструктивные данные",
    description: "Разовый доступ к расширенным функциям",
    payload: `${userId}_buy_${productId}`,
    provider_token: "", // Пусто для Telegram Stars
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
      res.status(200).json({ invoiceLink: data.result });
    } else {
      res.status(500).json({ error: data.description });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

