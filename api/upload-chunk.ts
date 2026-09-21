import { Pool } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Берем пачку поменьше, чтобы сервер отдавал мгновенно
    const limit = 50;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const result = await pool.query('SELECT * FROM kaggle_shoes ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, offset]);
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Ошибка базы данных Neon', details: error.message });
  }
}
