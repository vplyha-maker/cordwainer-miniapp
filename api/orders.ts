import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { telegramId, managerName, clientContact, branchOrComment, totalPairs, deliveryCost, invoiceText } = req.body;
  const botToken = process.env.BOT_TOKEN;
  const connectionString = process.env.DATABASE_URL;

  if (!botToken || !telegramId || !invoiceText) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // 1. Отправляем в Telegram руководителю
    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: invoiceText,
      }),
    });

    const tgData = await tgResponse.json();

    if (!tgData.ok) {
      const description = tgData.description || '';
      if (description.includes('chat not found') || description.includes('bot was blocked')) {
        return res.status(400).json({ 
          error: `Руководитель (${managerName}) еще не запустил бота @Cordwainer_bot! Пусть нажмет /start.` 
        });
      }
      return res.status(500).json({ error: description || 'Telegram API error' });
    }

    // 2. Сохраняем заказ в базу данных Neon (если подключена DATABASE_URL)
    if (connectionString) {
      const sql = neon(connectionString);
      await sql`
        INSERT INTO orders (manager_name, client_contact, branch_or_comment, total_pairs, delivery_cost, invoice_text)
        VALUES (${managerName}, ${clientContact || ''}, ${branchOrComment || ''}, ${totalPairs || 0}, ${deliveryCost || 0}, ${invoiceText})
      `;
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

