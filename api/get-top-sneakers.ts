import { neon } from '@neondatabase/serverless'

const KNOWN_BRANDS = new Set([
  'nike', 'jordan', 'adidas', 'yeezy', 'new balance', 'asics', 'converse',
  'vans', 'puma', 'reebok', 'saucony', 'mizuno', 'salomon', 'hoka',
  'on', 'merrell', 'oakley', "arc'teryx", 'arcteryx', 'bape', 'supreme',
  'fear of god', 'kith', 'palace', 'balenciaga', 'off-white', 'gucci',
  'prada', 'louis vuitton', 'dior', 'maison margiela', 'rick owens',
  'alexander mcqueen', 'lanvin', 'crocs', 'timberland', 'ugg',
  'dr. martens', 'birkenstock', 'clarks', 'veja', 'autry', 'lacoste',
  'calvin klein', 'tommy hilfiger', 'polo ralph lauren', 'dsquared2',
  'versace', 'valentino', 'givenchy', 'under armour', 'fila', 'skechers',
  'etnies', 'osiris', 'dc',
])

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

  const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL
  if (!dbUrl) {
    return res.status(500).json({ error: 'Missing DATABASE_URL' })
  }

  const sql = neon(dbUrl)

  const rawQuery = (req.query.query || '').toString().toLowerCase().trim()
  const query = rawQuery === 'arcteryx' ? "arc'teryx" : rawQuery
  const gender = (req.query.gender || 'all').toString().toLowerCase().trim()
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 60))
  const offset = (page - 1) * limit

  const isBrandSearch = KNOWN_BRANDS.has(query)

  try {
    const metaRes = await sql`SELECT max(created_at) as last_update FROM sneakers`
    const dbLastUpdate = metaRes[0]?.last_update || null

    let rows: any[] = []
    let totalCount = 0

    // Используем только теговые шаблоны sql`...`, которые требует драйвер @neondatabase/serverless
    if (!query || query === 'all') {
      if (gender === 'all') {
        const [countRes, dataRes] = await Promise.all([
          sql`SELECT count(*) as total FROM sneakers WHERE image_url IS NOT NULL AND image_url != '' AND image_url != 'null'`,
          sql`SELECT id, brand, name, gender, retail_price, image_url, release_year, sku FROM sneakers WHERE image_url IS NOT NULL AND image_url != '' AND image_url != 'null' ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        ])
        totalCount = parseInt(countRes[0]?.total || '0', 10)
        rows = dataRes
      } else if (gender === 'men') {
        const [countRes, dataRes] = await Promise.all([
          sql`SELECT count(*) as total FROM sneakers WHERE gender IN ('men', 'unisex') AND image_url IS NOT NULL AND image_url != '' AND image_url != 'null'`,
          sql`SELECT id, brand, name, gender, retail_price, image_url, release_year, sku FROM sneakers WHERE gender IN ('men', 'unisex') AND image_url IS NOT NULL AND image_url != '' AND image_url != 'null' ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        ])
        totalCount = parseInt(countRes[0]?.total || '0', 10)
        rows = dataRes
      } else if (gender === 'women') {
        const [countRes, dataRes] = await Promise.all([
          sql`SELECT count(*) as total FROM sneakers WHERE gender IN ('women', 'unisex') AND image_url IS NOT NULL AND image_url != '' AND image_url != 'null'`,
          sql`SELECT id, brand, name, gender, retail_price, image_url, release_year, sku FROM sneakers WHERE gender IN ('women', 'unisex') AND image_url IS NOT NULL AND image_url != '' AND image_url != 'null' ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        ])
        totalCount = parseInt(countRes[0]?.total || '0', 10)
        rows = dataRes
      }
    } else if (isBrandSearch) {
      const pStart = `${query} %`
      const pEnd = `% ${query}`
      const pMid = `% ${query} %`

      if (gender === 'all') {
        const [countRes, dataRes] = await Promise.all([
          sql`SELECT count(*) as total FROM sneakers WHERE image_url IS NOT NULL AND image_url != '' AND image_url != 'null' AND (LOWER(brand) = ${query} OR LOWER(brand) LIKE ${pStart} OR LOWER(brand) LIKE ${pEnd} OR LOWER(brand) LIKE ${pMid})`,
          sql`SELECT id, brand, name, gender, retail_price, image_url, release_year, sku FROM sneakers WHERE image_url IS NOT NULL AND image_url != '' AND image_url != 'null' AND (LOWER(brand) = ${query} OR LOWER(brand) LIKE ${pStart} OR LOWER(brand) LIKE ${pEnd} OR LOWER(brand) LIKE ${pMid}) ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        ])
        totalCount = parseInt(countRes[0]?.total || '0', 10)
        rows = dataRes
      } else if (gender === 'men') {
        const [countRes, dataRes] = await Promise.all([
          sql`SELECT count(*) as total FROM sneakers WHERE gender IN ('men', 'unisex') AND image_url IS NOT NULL AND image_url != '' AND image_url != 'null' AND (LOWER(brand) = ${query} OR LOWER(brand) LIKE ${pStart} OR LOWER(brand) LIKE ${pEnd} OR LOWER(brand) LIKE ${pMid})`,
          sql`SELECT id, brand, name, gender, retail_price, image_url, release_year, sku FROM sneakers WHERE gender IN ('men', 'unisex') AND image_url IS NOT NULL AND image_url != '' AND image_url != 'null' AND (LOWER(brand) = ${query} OR LOWER(brand) LIKE ${pStart} OR LOWER(brand) LIKE ${pEnd} OR LOWER(brand) LIKE ${pMid}) ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        ])
        totalCount = parseInt(countRes[0]?.total || '0', 10)
        rows = dataRes
      } else if (gender === 'women') {
        const [countRes, dataRes] = await Promise.all([
          sql`SELECT count(*) as total FROM sneakers WHERE gender IN ('women', 'unisex') AND image_url IS NOT NULL AND image_url != '' AND image_url != 'null' AND (LOWER(brand) = ${query} OR LOWER(brand) LIKE ${pStart} OR LOWER(brand) LIKE ${pEnd} OR LOWER(brand) LIKE ${pMid})`,
          sql`SELECT id, brand, name, gender, retail_price, image_url, release_year, sku FROM sneakers WHERE gender IN ('women', 'unisex') AND image_url IS NOT NULL AND image_url != '' AND image_url != 'null' AND (LOWER(brand) = ${query} OR LOWER(brand) LIKE ${pStart} OR LOWER(brand) LIKE ${pEnd} OR LOWER(brand) LIKE ${pMid}) ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        ])
        totalCount = parseInt(countRes[0]?.total || '0', 10)
        rows = dataRes
      }
    } else {
      const searchPattern = `%${query}%`
      if (gender === 'all') {
        const [countRes, dataRes] = await Promise.all([
          sql`SELECT count(*) as total FROM sneakers WHERE image_url IS NOT NULL AND image_url != '' AND image_url != 'null' AND (LOWER(brand) LIKE ${searchPattern} OR LOWER(name) LIKE ${searchPattern})`,
          sql`SELECT id, brand, name, gender, retail_price, image_url, release_year, sku FROM sneakers WHERE image_url IS NOT NULL AND image_url != '' AND image_url != 'null' AND (LOWER(brand) LIKE ${searchPattern} OR LOWER(name) LIKE ${searchPattern}) ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        ])
        totalCount = parseInt(countRes[0]?.total || '0', 10)
        rows = dataRes
      } else if (gender === 'men') {
        const [countRes, dataRes] = await Promise.all([
          sql`SELECT count(*) as total FROM sneakers WHERE gender IN ('men', 'unisex') AND image_url IS NOT NULL AND image_url != '' AND image_url != 'null' AND (LOWER(brand) LIKE ${searchPattern} OR LOWER(name) LIKE ${searchPattern})`,
          sql`SELECT id, brand, name, gender, retail_price, image_url, release_year, sku FROM sneakers WHERE gender IN ('men', 'unisex') AND image_url IS NOT NULL AND image_url != '' AND image_url != 'null' AND (LOWER(brand) LIKE ${searchPattern} OR LOWER(name) LIKE ${searchPattern}) ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        ])
        totalCount = parseInt(countRes[0]?.total || '0', 10)
        rows = dataRes
      } else if (gender === 'women') {
        const [countRes, dataRes] = await Promise.all([
          sql`SELECT count(*) as total FROM sneakers WHERE gender IN ('women', 'unisex') AND image_url IS NOT NULL AND image_url != '' AND image_url != 'null' AND (LOWER(brand) LIKE ${searchPattern} OR LOWER(name) LIKE ${searchPattern})`,
          sql`SELECT id, brand, name, gender, retail_price, image_url, release_year, sku FROM sneakers WHERE gender IN ('women', 'unisex') AND image_url IS NOT NULL AND image_url != '' AND image_url != 'null' AND (LOWER(brand) LIKE ${searchPattern} OR LOWER(name) LIKE ${searchPattern}) ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        ])
        totalCount = parseInt(countRes[0]?.total || '0', 10)
        rows = dataRes
      }
    }

    const results = rows.map((r: any) => {
      const imgUrl = r.image_url ?? r.image ?? r.imageUrl ?? r.imageurl ?? null
      const price = Number(r.retail_price ?? r.retailprice ?? r.retailPrice ?? 0)
      const rawYear = Number(r.release_year ?? r.releaseyear ?? r.releaseYear ?? 0)

      // Игнорируем искусственный дефолтный 2024 год, который записал старый парсер
      const cleanYear =
        rawYear >= 1970 && rawYear <= 2027 && rawYear !== 2024 ? rawYear : null

      return {
        id: r.id,
        brand: r.brand,
        name: r.name,
        gender: r.gender || 'unisex',
        retailPrice: price,
        image: { original: imgUrl },
        year: cleanYear,
        sku: r.sku || null,
      }
    })

    return res.status(200).json({
      results,
      page,
      limit,
      total: totalCount,
      lastUpdate: dbLastUpdate,
      count: results.length,
    })
  } catch (error: any) {
    console.error('[get-top-sneakers]', error)
    return res.status(500).json({
      error: 'Database error',
      message: error?.message || 'Unknown error',
    })
  }
}
