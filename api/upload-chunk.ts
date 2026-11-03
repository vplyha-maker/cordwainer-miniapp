import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rows } = req.body;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'Нет данных для загрузки' });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return res.status(500).json({ error: 'DATABASE_URL не настроена на сервере' });
  }

  try {
    const sql = neon(connectionString);

    const columns = Object.keys(rows[0]);
    let values: any[] = [];
    let placeholders: string[] = [];
    let paramIndex = 1;

    for (let i = 0; i < rows.length; i++) {
      let rowPlaceholders = [];
      for (let col of columns) {
        values.push(rows[i][col] !== undefined ? rows[i][col] : null);
        rowPlaceholders.push(`$${paramIndex}`);
        paramIndex++;
      }
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    const query = `
      INSERT INTO kaggle_shoes (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
    `;

    // Выполняем запрос, передавая values как массив в функцию sql
    // @ts-ignore
    await sql(query, values);

    return res.status(200).json({ success: true, inserted: rows.length });
  } catch (error: any) {
    console.error('Ошибка записи в Neon:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
