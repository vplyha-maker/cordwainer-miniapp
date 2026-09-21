import { Pool } from '@neondatabase/serverless';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Подключаемся к твоей базе Neon через переменную окружения
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Достаем наши кроссовки и материалы из созданной таблицы
    const result = await pool.query('SELECT * FROM shoe_materials ORDER BY id DESC');
    return res.status(200).json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: 'Ошибка базы данных Neon', details: error.message });
  }
}

