import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { telegramId, invoiceText } = req.body;
  const botToken = process.env.BOT_TOKEN;

  if (!botToken || !telegramId || !invoiceText) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: invoiceText,
      }),
    });

    const data = await tgResponse.json();

    if (data.ok) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ error: data.description || 'Telegram API error' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Server network error' });
  }
}

