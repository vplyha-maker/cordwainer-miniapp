import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  const { userId, productId } = req.query;

  if (!userId || !productId) {
    return res.status(400).json({ error: 'Отсутствует userId или productId' });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return res.status(500).json({ error: 'Не настроена строка подключения к БД' });
  }

  try {
    const sql = neon(connectionString);
    const result = await sql`
      SELECT * FROM user_purchases 
      WHERE user_id = ${userId} AND product_id = ${productId}
    `;

    const isPurchased = result.length > 0;
    return res.status(200).json({ purchased: isPurchased });
  } catch (error: any) {
    console.error('Database check error:', error);
    return res.status(500).json({ error: error.message });
  }
}

