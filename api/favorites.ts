import { neon } from '@neondatabase/serverless'

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const sql = neon(process.env.DATABASE_URL!)

  // === 1. ПОЛУЧЕНИЕ АРХИВА (GET) ===
  if (req.method === 'GET') {
    const userId = req.query.user_id
    if (!userId) return res.status(400).json({ error: 'Missing user_id' })

    try {
      // Соединяем таблицу избранного с таблицей кроссовок
      const rows = await sql`
        SELECT s.*
        FROM sneakers s
        JOIN user_favorites uf ON s.id = uf.sneaker_id
        WHERE uf.user_id = ${userId}
        ORDER BY uf.created_at DESC
      `

      // Форматируем для фронтенда
      const favorites = rows.map((r) => {
        const imgUrl = r.image_url ?? r.image ?? r.imageUrl ?? r.imageurl ?? null
        const price = r.retail_price ?? r.retailprice ?? r.retailPrice ?? 0
        const year = r.release_year ?? r.releaseyear ?? r.releaseYear ?? null

        return {
          id: r.id,
          brand: r.brand,
          name: r.name,
          gender: r.gender || 'unisex',
          retailPrice: price,
          image: { original: imgUrl },
          year: year,
          sku: r.sku || null
        }
      })

      return res.status(200).json({ favorites })
    } catch (error: any) {
      console.error('[get-favorites]', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // === 2. ДОБАВЛЕНИЕ ИЛИ УДАЛЕНИЕ (POST) ===
  if (req.method === 'POST') {
    const { user_id, sneaker_id } = req.body
    if (!user_id || !sneaker_id) return res.status(400).json({ error: 'Missing data' })

    try {
      // Проверяем, есть ли уже этот кроссовок в архиве
      const check = await sql`SELECT 1 FROM user_favorites WHERE user_id = ${user_id} AND sneaker_id = ${sneaker_id}`

      if (check.length > 0) {
        // Если есть — удаляем (пользователь отжал сердечко)
        await sql`DELETE FROM user_favorites WHERE user_id = ${user_id} AND sneaker_id = ${sneaker_id}`
        return res.status(200).json({ status: 'removed' })
      } else {
        // Если нет — добавляем
        await sql`INSERT INTO user_favorites (user_id, sneaker_id) VALUES (${user_id}, ${sneaker_id})`
        return res.status(200).json({ status: 'added' })
      }
    } catch (error: any) {
      console.error('[toggle-favorite]', error)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

