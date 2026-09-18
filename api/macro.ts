import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  // Добавляем заголовки CORS, если фронтенд и апи на разных доменах, 
  // и запрещаем кэширование, чтобы данные были всегда свежими
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined');
    }

    const sql = neon(process.env.DATABASE_URL);
    
    // Забираем все индикаторы из базы
    const data = await sql`
      SELECT id, type, value, trend, description, updated_at 
      FROM macro_indicators 
      ORDER BY type ASC;
    `;

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Macro API Error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch macro indicators' });
  }
}

