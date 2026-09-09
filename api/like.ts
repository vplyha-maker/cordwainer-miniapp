import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  // Подключаемся к базе Neon
  const sql = neon(process.env.DATABASE_URL!);
  
  const { user_id, style_id } = req.query;

  if (!user_id || !style_id) {
    return res.status(400).json({ error: 'Missing user_id or style_id' });
  }

  if (req.method === 'GET') {
    // Получаем общее количество лайков и проверял ли этот юзер
    try {
      const likesCount = await sql`SELECT COUNT(*) FROM style_likes WHERE style_id = ${style_id}`;
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
  
  else if (req.method === 'POST') {
    // Пользователь ставит или убирает лайк
    try {
      // Vercel может передавать body по-разному, обрабатываем безопасно
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { action } = body;
      
      if (action === 'like') {
        // ON CONFLICT DO NOTHING защищает от ошибки двойного клика
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

