import { Pool } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Достаем данные из твоей новой большой таблицы на 62 МБ
    const result = await pool.query('SELECT * FROM kaggle_shoes ORDER BY id DESC');
    return res.status(200).json(result.rows);
  } catch (error: any) {
    return res.status(500).json({ error: 'Ошибка базы данных Neon', details: error.message });
  }
}
