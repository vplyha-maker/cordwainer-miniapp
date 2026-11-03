import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Создаем подключение к базе данных через строку подключения из переменных окружения Vercel
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const { rows } = req.body;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'Нет данных для загрузки' });
  }

  try {
    // Вытаскиваем названия колонок из первого объекта
    const columns = Object.keys(rows[0]);
    let values: any[] = [];
    let placeholders: string[] = [];
    let paramIndex = 1;

    // Динамически собираем SQL-запрос для массовой вставки
    for (let i = 0; i < rows.length; i++) {
      let rowPlaceholders = [];
      for (let col of columns) {
        // Если значение пустое, передаем null
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

    // Выполняем запись в базу данных
    await pool.query(query, values);
    
    // Закрываем пул соединений, чтобы не вешать воркер Vercel
    await pool.end();

    return res.status(200).json({ success: true, inserted: rows.length });
  } catch (error: any) {
    console.error('Ошибка записи в базу данных:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
