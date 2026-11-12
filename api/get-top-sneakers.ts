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
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  // Cache public catalog responses for 60s at Vercel Edge
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL
  if (!dbUrl) {
    return res.status(500).json({ error: 'Missing DATABASE_URL environment variable' })
  }

  const sql = neon(dbUrl)

  const rawQuery = (req.query.query || '').toString().toLowerCase().trim()
  const query = rawQuery === 'arcteryx' ? "arc'teryx" : rawQuery
  const gender = (req.query.gender || 'all').toString().toLowerCase().trim()
  const sort = (req.query.sort || 'newest').toString().toLowerCase().trim()
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 60))
  const offset = (page - 1) * limit

  const isBrandSearch = KNOWN_BRANDS.has(query)

  try {
    const metaRes = await sql`SELECT max(created_at) as last_update FROM sneakers`
    const dbLastUpdate = metaRes[0]?.last_update || null

    // Build dynamic parameterized WHERE clauses safely
    const conditions: string[] = [
      `image_url IS NOT NULL`,
      `TRIM(image_url) != ''`,
      `TRIM(image_url) != 'null'`,
    ]
    const params: any[] = []

    if (gender === 'men') {
      conditions.push(`LOWER(gender) IN ('men', 'unisex', 'male')`)
    } else if (gender === 'women') {
      conditions.push(`LOWER(gender) IN ('women', 'unisex', 'female', 'wmns')`)
    }

    if (query && query !== 'all') {
      if (isBrandSearch) {
        const idx1 = params.push(query)
        const idx2 = params.push(`${query} %`)
        const idx3 = params.push(`% ${query}`)
        const idx4 = params.push(`% ${query} %`)
        conditions.push(
          `(LOWER(brand) = $${idx1} OR LOWER(brand) LIKE $${idx2} OR LOWER(brand) LIKE $${idx3} OR LOWER(brand) LIKE $${idx4})`
        )
      } else {
        const pIdx = params.push(`%${query}%`)
        conditions.push(
          `(LOWER(brand) LIKE $${pIdx} OR LOWER(name) LIKE $${pIdx} OR LOWER(COALESCE(sku, '')) LIKE $${pIdx})`
        )
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    let orderClause = `ORDER BY (CASE WHEN image_url LIKE '%imgbb.com%' OR image_url LIKE '%r2.dev%' OR image_url LIKE '%firebasestorage%' THEN 0 ELSE 1 END), created_at DESC`
    if (sort === 'price_asc') {
      orderClause = `ORDER BY (CASE WHEN retail_price > 0 THEN 0 ELSE 1 END), retail_price ASC, created_at DESC`
    } else if (sort === 'price_desc') {
      orderClause = `ORDER BY retail_price DESC NULLS LAST, created_at DESC`
    } else if (sort === 'year_desc') {
      orderClause = `ORDER BY release_year DESC NULLS LAST, created_at DESC`
    }

    const countQuery = `SELECT count(*) as total FROM sneakers ${whereClause}`
    const limitIdx = params.length + 1
    const offsetIdx = params.length + 2
    const dataQuery = `
      SELECT id, brand, name, gender, retail_price, image_url, release_year, sku
      FROM sneakers
      ${whereClause}
      ${orderClause}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `

    const [countRes, rows] = await Promise.all([
      sql(countQuery, params),
      sql(dataQuery, [...params, limit, offset]),
    ])

    const totalCount = parseInt(countRes[0]?.total || '0', 10)

    const results = rows.map((r: any) => {
      const imgUrl = r.image_url ?? r.image ?? r.imageUrl ?? null
      const price = Number(r.retail_price ?? r.retailPrice ?? 0)
      const rawYear = r.release_year ?? r.releaseYear ?? null
      const validYear =
        rawYear && Number(rawYear) >= 1970 && Number(rawYear) <= 2027
          ? Number(rawYear)
          : null

      return {
        id: r.id,
        brand: r.brand,
        name: r.name,
        gender: r.gender || 'unisex',
        retailPrice: price,
        image: { original: imgUrl },
        year: validYear,
        releaseYear: validYear,
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
