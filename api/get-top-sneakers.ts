import { neon } from '@neondatabase/serverless'

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sql = neon(process.env.DATABASE_URL!)

  // Параметры
  const query = (req.query.query || '').toString().toLowerCase().trim()
  const gender = (req.query.gender || 'all').toString().toLowerCase().trim() // all | men | women
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 40))
  const offset = (page - 1) * limit

  try {
    let rows: any[]

    // Базовый SELECT
    const selectFields = sql`
      id,
      brand,
      name,
      gender,
      retail_price AS "retailPrice",
      image_url   AS "image",
      release_year,
      sku
    `

    // === 1. Без поискового запроса (просто бренд или "all") ===
    if (!query || query === 'all') {
      if (gender === 'all') {
        rows = await sql`
          SELECT ${selectFields}
          FROM sneakers
          ORDER BY updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (gender === 'men') {
        rows = await sql`
          SELECT ${selectFields}
          FROM sneakers
          WHERE gender IN ('men', 'unisex')
          ORDER BY updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (gender === 'women') {
        rows = await sql`
          SELECT ${selectFields}
          FROM sneakers
          WHERE gender IN ('women', 'unisex')
          ORDER BY updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else {
        rows = []
      }
    }

    // === 2. Есть поисковый запрос ===
    else {
      // Приоритет:
      // 1. Точное совпадение бренда
      // 2. Бренд содержит query
      // 3. Полнотекстовый поиск по name
      // 4. LIKE по name

      if (gender === 'all') {
        rows = await sql`
          SELECT ${selectFields}
          FROM sneakers
          WHERE 
            LOWER(brand) = ${query}
            OR LOWER(brand) LIKE ${'%' + query + '%'}
            OR to_tsvector('english', name) @@ plainto_tsquery('english', ${query})
            OR LOWER(name) LIKE ${'%' + query + '%'}
          ORDER BY
            CASE 
              WHEN LOWER(brand) = ${query} THEN 0
              WHEN LOWER(brand) LIKE ${query + '%'} THEN 1
              WHEN to_tsvector('english', name) @@ plainto_tsquery('english', ${query}) THEN 2
              ELSE 3
            END,
            updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (gender === 'men') {
        rows = await sql`
          SELECT ${selectFields}
          FROM sneakers
          WHERE 
            gender IN ('men', 'unisex')
            AND (
              LOWER(brand) = ${query}
              OR LOWER(brand) LIKE ${'%' + query + '%'}
              OR to_tsvector('english', name) @@ plainto_tsquery('english', ${query})
              OR LOWER(name) LIKE ${'%' + query + '%'}
            )
          ORDER BY
            CASE 
              WHEN LOWER(brand) = ${query} THEN 0
              WHEN LOWER(brand) LIKE ${query + '%'} THEN 1
              WHEN to_tsvector('english', name) @@ plainto_tsquery('english', ${query}) THEN 2
              ELSE 3
            END,
            updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (gender === 'women') {
        rows = await sql`
          SELECT ${selectFields}
          FROM sneakers
          WHERE 
            gender IN ('women', 'unisex')
            AND (
              LOWER(brand) = ${query}
              OR LOWER(brand) LIKE ${'%' + query + '%'}
              OR to_tsvector('english', name) @@ plainto_tsquery('english', ${query})
              OR LOWER(name) LIKE ${'%' + query + '%'}
            )
          ORDER BY
            CASE 
              WHEN LOWER(brand) = ${query} THEN 0
              WHEN LOWER(brand) LIKE ${query + '%'} THEN 1
              WHEN to_tsvector('english', name) @@ plainto_tsquery('english', ${query}) THEN 2
              ELSE 3
            END,
            updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else {
        rows = []
      }
    }

    // Приводим к формату, который ждёт фронтенд
    const results = rows.map((r) => ({
      id: r.id,
      brand: r.brand,
      name: r.name,
      gender: r.gender || 'unisex',
      retailPrice: r.retailPrice ?? 0,
      image: {
        original: r.image || null
      },
      year: r.release_year || null,
      sku: r.sku || null
    }))

    return res.status(200).json({
      results,
      page,
      limit,
      count: results.length
    })
  } catch (error: any) {
    console.error('[get-top-sneakers]', error)
    return res.status(500).json({
      error: 'Database error',
      message: error?.message || 'Unknown error'
    })
  }
                             }
