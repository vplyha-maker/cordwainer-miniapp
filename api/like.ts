import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  // Подключаемся к базе данных Neon
  const sql = neon(process.env.DATABASE_URL!);
  
  const { user_id, style_id } = req.query;

  // Проверка: передал ли фронтенд нужные ID
  if (!user_id || !style_id) {
    return res.status(400).json({ error: 'Missing user_id or style_id' });
  }

  // ЕСЛИ ФРОНТЕНД ЗАПРАШИВАЕТ ЛАЙКИ (при загрузке видео)
  if (req.method === 'GET') {
    try {
      // Считаем все лайки для этого видео
      const likesCount = await sql`SELECT COUNT(*) FROM style_likes WHERE style_id = ${style_id}`;
      // Проверяем, ставил ли лайк текущий пользователь
      const userLike = await sql`SELECT 1 FROM style_likes WHERE style_id = ${style_id} AND user_id = ${user_id}`;
      
      res.status(200).json({ 
        total: Number(likesCount[0].count), 
        isLiked: userLike.length > 0 
      });
    } catch (error) {
      console.error('GET Error:', error);
      res.status(500).json({ error: 'DB Error on GET' });
    }
  } 
  
  // ЕСЛИ ПОЛЬЗОВАТЕЛЬ НАЖАЛ НА СЕРДЕЧКО (ставит или убирает лайк)
  else if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { action } = body;
      
      if (action === 'like') {
        // ON CONFLICT DO NOTHING - защита, если юзер кликнет 10 раз подряд
        await sql`INSERT INTO style_likes (user_id, style_id) VALUES (${user_id}, ${style_id}) ON CONFLICT DO NOTHING`;
      } else if (action === 'unlike') {
        await sql`DELETE FROM style_likes WHERE user_id = ${user_id} AND style_id = ${style_id}`;
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('POST Error:', error);
      res.status(500).json({ error: 'DB Error on POST' });
    }
  } 
  
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

