import { Pool } from '@neondatabase/serverless';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не разрешен' });

  const { rows } = req.body;
  if (!rows || rows.length === 0) return res.status(400).json({ error: 'Нет данных' });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Чистим названия колонок от спецсимволов для базы
    const keys = Object.keys(rows[0]).map(k => k.replace(/[^a-zA-Z0-9_]/g, ''));
    const tableName = 'kaggle_shoes';

    // Автоматически создаем таблицу под структуру твоего файла
    const columnsDef = keys.map(k => `"${k}" TEXT`).join(', ');
    await pool.query(`CREATE TABLE IF NOT EXISTS ${tableName} (id SERIAL PRIMARY KEY, ${columnsDef})`);

    // Подготавливаем запрос на массовую вставку
    const values: string[] = [];
    const flatData: any[] = [];
    let paramIndex = 1;

    rows.forEach((row: any) => {
      const rowPlaceholders: string[] = [];
      keys.forEach((_, i) => {
        rowPlaceholders.push(`$${paramIndex++}`);
        // Оригинальные ключи из CSV
        const originalKey = Object.keys(rows[0])[i];
        flatData.push(row[originalKey] !== undefined ? String(row[originalKey]) : null);
      });
      values.push(`(${rowPlaceholders.join(', ')})`);
    });

    const query = `INSERT INTO ${tableName} ("${keys.join('", "')}") VALUES ${values.join(', ')}`;
    await pool.query(query, flatData);

    return res.status(200).json({ success: true, inserted: rows.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

