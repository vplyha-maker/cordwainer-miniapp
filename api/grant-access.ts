import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;
  const ADMIN_ID = 8686072747; // Ваш ID из скриншота

  if (!userId || isNaN(Number(userId))) {
    return res.status(400).json({ error: 'Некорректный Telegram ID' });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const MINI_APP_URL = 'https://t.me/ваш_бот/miniapp'; // Замените на ссылку вашего бота/миника

  try {
    // 1. Здесь ваш SQL-запрос (если используете postgres / pg на Vercel)
    /*
      import { sql } from '@vercel/postgres'; // или ваш клиент базы данных
      await sql`
        INSERT INTO user_purchases (user_id, product_id, purchased_at)
        VALUES 
          (${userId}, 'pro_videos', NOW()),
          (${userId}, 'pro_colors', NOW()),
          (${userId}, 'pro_glossary', NOW()),
          (${userId}, 'pro_sizes', NOW()),
          (${userId}, 'pro_width_calc', NOW()),
          (${userId}, 'pro_market', NOW())
        ON CONFLICT DO NOTHING;
      `;
    */

    // 2. Отправка сообщения пользователю в Telegram
    const message = 
      `🎉 **Доступ активирован!**\n\n` +
      `Вам открыты все профессиональные функции в мини-приложении **Cardio** ` +
      `(каталог, калькуляторы цвета, видео и инструменты).\n\n` +
      `Все функции уже разблокированы, заходите! 👇`;

    const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Открыть Cardio Mini App', url: MINI_APP_URL }]
          ]
        }
      })
    });

    const tgData = await tgResponse.json() as { ok: boolean; description?: string };

    if (!tgData.ok) {
      console.error('Telegram error:', tgData.description);
    }

    return res.status(200).json({ success: true, message: 'Доступ успешно выдан' });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
}

