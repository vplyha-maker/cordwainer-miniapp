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
  const gender = (req.query.gender || 'all').toString().toLowerCase().trim()
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 40))
  const offset = (page - 1) * limit

  // Список точных брендов для "Умного поиска"
  const KNOWN_BRANDS = [
    'nike', 'jordan', 'adidas', 'yeezy', 'new balance', 'asics', 'converse', 
    'vans', 'puma', 'reebok', 'saucony', 'mizuno', 'salomon', 'hoka', 
    'on', 'merrell', 'oakley', "arc'teryx", 'bape', 'supreme', 
    'fear of god', 'kith', 'palace', 'balenciaga', 'off-white', 'gucci', 
    'prada', 'louis vuitton', 'dior', 'maison margiela', 'rick owens', 
    'alexander mcqueen', 'lanvin', 'crocs', 'timberland', 'ugg', 
    'dr. martens', 'birkenstock', 'clarks', 'veja', 'autry', 'lacoste', 
    'calvin klein', 'tommy hilfiger', 'polo ralph lauren', 'dsquared2', 
    'versace', 'valentino', 'givenchy', 'under armour', 'fila', 'skechers', 
    'etnies', 'osiris', 'dc'
  ]

  // Проверяем, является ли запрос кликом по бренду
  const isBrandSearch = KNOWN_BRANDS.includes(query)

  try {
    // === ИСПРАВЛЕНИЕ: Убираем запрос к несуществующей колонке updated_at ===
    const totalCountRes = await sql`SELECT count(*) as total FROM sneakers`
    const globalTotal = parseInt(totalCountRes[0].total, 10)
    
    // Временно отдаем текущее время сервера, пока не добавим колонку в БД
    const dbLastUpdate = new Date().toISOString() 

    let rows: any[] = []

    // === 2. Запрос "ВСЕ" (Пустой запрос) ===
    if (!query || query === 'all') {
      if (gender === 'all') {
        rows = await sql`
          SELECT id, brand, name, gender, retail_price, image_url, release_year, sku
          FROM sneakers
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (gender === 'men') {
        rows = await sql`
          SELECT id, brand, name, gender, retail_price, image_url, release_year, sku
          FROM sneakers
          WHERE gender IN ('men', 'unisex')
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (gender === 'women') {
        rows = await sql`
          SELECT id, brand, name, gender, retail_price, image_url, release_year, sku
          FROM sneakers
          WHERE gender IN ('women', 'unisex')
          LIMIT ${limit} OFFSET ${offset}
        `
      }
    }
    
    // === 3. СТРОГИЙ ПОИСК ПО БРЕНДУ (Ищем самостоятельное слово в названии бренда) ===
    else if (isBrandSearch) {
      if (gender === 'all') {
        rows = await sql`
          SELECT id, brand, name, gender, retail_price, image_url, release_year, sku
          FROM sneakers
          WHERE (
            LOWER(brand) = ${query} 
            OR LOWER(brand) LIKE ${query + ' %'} 
            OR LOWER(brand) LIKE ${'% ' + query} 
            OR LOWER(brand) LIKE ${'% ' + query + ' %'}
          )
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (gender === 'men') {
        rows = await sql`
          SELECT id, brand, name, gender, retail_price, image_url, release_year, sku
          FROM sneakers
          WHERE gender IN ('men', 'unisex')
            AND (
              LOWER(brand) = ${query} 
              OR LOWER(brand) LIKE ${query + ' %'} 
              OR LOWER(brand) LIKE ${'% ' + query} 
              OR LOWER(brand) LIKE ${'% ' + query + ' %'}
            )
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (gender === 'women') {
        rows = await sql`
          SELECT id, brand, name, gender, retail_price, image_url, release_year, sku
          FROM sneakers
          WHERE gender IN ('women', 'unisex')
            AND (
              LOWER(brand) = ${query} 
              OR LOWER(brand) LIKE ${query + ' %'} 
              OR LOWER(brand) LIKE ${'% ' + query} 
              OR LOWER(brand) LIKE ${'% ' + query + ' %'}
            )
          LIMIT ${limit} OFFSET ${offset}
        `
      }
    }

    // === 4. ОБЫЧНЫЙ ПОИСК (ввод текста руками в строку: "dunk", "travis", и т.д.) ===
    else {
      if (gender === 'all') {
        rows = await sql`
          SELECT id, brand, name, gender, retail_price, image_url, release_year, sku
          FROM sneakers
          WHERE 
            LOWER(brand) LIKE ${'%' + query + '%'}
            OR to_tsvector('english', name) @@ plainto_tsquery('english', ${query})
            OR LOWER(name) LIKE ${'%' + query + '%'}
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (gender === 'men') {
        rows = await sql`
          SELECT id, brand, name, gender, retail_price, image_url, release_year, sku
          FROM sneakers
          WHERE gender IN ('men', 'unisex')
            AND (
              LOWER(brand) LIKE ${'%' + query + '%'}
              OR to_tsvector('english', name) @@ plainto_tsquery('english', ${query})
              OR LOWER(name) LIKE ${'%' + query + '%'}
            )
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (gender === 'women') {
        rows = await sql`
          SELECT id, brand, name, gender, retail_price, image_url, release_year, sku
          FROM sneakers
          WHERE gender IN ('women', 'unisex')
            AND (
              LOWER(brand) LIKE ${'%' + query + '%'}
              OR to_tsvector('english', name) @@ plainto_tsquery('english', ${query})
              OR LOWER(name) LIKE ${'%' + query + '%'}
            )
          LIMIT ${limit} OFFSET ${offset}
        `
      }
    }

    // Приводим к формату фронтенда
    const results = rows.map((r) => {
      const imgUrl = r.image_url ?? r.image ?? r.imageUrl ?? r.imageurl ?? null
      const price = r.retail_price ?? r.retailprice ?? r.retailPrice ?? 0
      const year = r.release_year ?? r.releaseyear ?? r.releaseYear ?? null

      return {
        id: r.id,
        brand: r.brand,
        name: r.name,
        gender: r.gender || 'unisex',
        retailPrice: price,
        image: {
          original: imgUrl
        },
        year: year,
        sku: r.sku || null
      }
    })

    return res.status(200).json({
      results,
      page,
      limit,
      total: globalTotal, 
      lastUpdate: dbLastUpdate,
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
