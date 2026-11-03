import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Твой текущий код логики upload-chunk
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}


  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = req.body;

  if (!rows || rows.length === 0) {
    return res.status(400).json({ error: 'Нет данных для загрузки' });
  }

  try {
    // Вытаскиваем названия колонок из первого объекта
    const columns = Object.keys(rows[0]);
    let values = [];
    let placeholders = [];
    let paramIndex = 1;

    // Динамически собираем огромный SQL-запрос для массовой вставки
    for (let i = 0; i < rows.length; i++) {
      let rowPlaceholders = [];
      for (let col of columns) {
        // Если значение пустое, передаем null
        values.push(rows[i][col] ? rows[i][col] : null);
        rowPlaceholders.push(`$${paramIndex}`);
        paramIndex++;
      }
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    const query = `
      INSERT INTO kaggle_shoes (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
    `;

    // Выполняем запись в Neon
    await pool.query(query, values);
    
    return res.status(200).json({ success: true, inserted: rows.length });
  } catch (error) {
    console.error('Ошибка записи в Neon:', error);
    // КРИТИЧНО: Возвращаем статус 500, чтобы фронтенд понял, что произошла ошибка
    return res.status(500).json({ error: error.message });
  }
}
