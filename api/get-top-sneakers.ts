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

  const query = (req.query.query || '').toString().toLowerCase().trim()
  const gender = (req.query.gender || 'all').toString().toLowerCase().trim()
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 40))
  const offset = (page - 1) * limit

  const SEARCH_TERMS = [
  // 1. Спортивные, беговые и скейт-бренды (Кроссовки и кеды)
  'Nike', 'Jordan', 'Adidas', 'Yeezy', 'New Balance', 'Asics', 'Converse',
  'Vans', 'Puma', 'Reebok', 'Saucony', 'Mizuno', 'Salomon', 'Hoka', 'On',
  'Under Armour', 'Fila', 'Skechers', 'Etnies', 'Osiris', 'DC',

  // 2. Стритвир и нишевые марки
  'BAPE', 'Supreme', 'Fear of God', 'Kith', 'Palace', 'Off-White',
  "Arc'teryx", 'Veja', 'Autry',

  // 3. Люкс и Высокая мода (Кроссовки + Лоферы, туфли, ботинки, мюли)
  'Prada', 'Prada loafers', 'Prada boots', 'Prada heels', 'Prada mules',
  'Gucci', 'Gucci loafers', 'Gucci slides', 'Gucci boots', 'Gucci heels',
  'Balenciaga', 'Balenciaga boots', 'Balenciaga mules', 'Balenciaga sandals',
  'Louis Vuitton', 'Louis Vuitton loafers', 'Louis Vuitton boots', 'Louis Vuitton mules',
  'Dior', 'Dior heels', 'Dior boots', 'Dior sandals',
  'Maison Margiela', 'Maison Margiela Tabi', 'Maison Margiela boots', 'Maison Margiela loafers',
  'Rick Owens', 'Rick Owens boots',
  'Alexander McQueen', 'Alexander McQueen boots', 'Alexander McQueen loafers',
  'Lanvin', 'Lanvin sneakers', 'Lanvin boots',
  'Versace', 'Versace loafers', 'Versace heels',
  'Valentino', 'Valentino heels', 'Valentino boots',
  'Givenchy', 'Givenchy boots', 'Givenchy slides',

  // 4. Премиум кэжуал
  'Lacoste', 'Calvin Klein', 'Tommy Hilfiger', 'Polo Ralph Lauren', 'Dsquared2',

  // 5. Зима, Аутдор и Повседневная обувь (Ботинки, сабо, сандалии, слипоны)
  'Timberland', 'Timberland boots', 'Timberland boat shoes',
  'UGG', 'UGG boots', 'UGG slippers', 'UGG Tasman',
  'Crocs', 'Crocs clogs', 'Crocs sandals',
  'Dr. Martens', 'Dr. Martens boots', 'Dr. Martens oxfords', 'Dr. Martens loafers',
  'Birkenstock', 'Birkenstock sandals', 'Birkenstock clogs', 'Birkenstock Boston',
  'Clarks', 'Clarks Wallabee', 'Clarks Desert Boot',
  'Merrell', 'Merrell boots', 'Merrell moc',
  'Oakley', 'Oakley mules', 'Oakley boots'
]


  const isBrandSearch = KNOWN_BRANDS.includes(query)

  try {
    // === ВОЗВРАЩАЕМ РЕАЛЬНОЕ ВРЕМЯ ИЗ НОВОЙ КОЛОНКИ created_at ===
    const metaRes = await sql`SELECT count(*) as total, max(created_at) as last_update FROM sneakers`
    const globalTotal = parseInt(metaRes[0].total, 10)
    const dbLastUpdate = metaRes[0].last_update 

    let rows: any[] = []

    if (!query || query === 'all') {
      if (gender === 'all') {
        rows = await sql`
          SELECT id, brand, name, gender, retail_price, image_url, release_year, sku
          FROM sneakers
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (gender === 'men') {
        rows = await sql`
          SELECT id, brand, name, gender, retail_price, image_url, release_year, sku
          FROM sneakers
          WHERE gender IN ('men', 'unisex')
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else if (gender === 'women') {
        rows = await sql`
          SELECT id, brand, name, gender, retail_price, image_url, release_year, sku
          FROM sneakers
          WHERE gender IN ('women', 'unisex')
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }
    }
    
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
          ORDER BY created_at DESC
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
          ORDER BY created_at DESC
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
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }
    }

    else {
      if (gender === 'all') {
        rows = await sql`
          SELECT id, brand, name, gender, retail_price, image_url, release_year, sku
          FROM sneakers
          WHERE 
            LOWER(brand) LIKE ${'%' + query + '%'}
            OR to_tsvector('english', name) @@ plainto_tsquery('english', ${query})
            OR LOWER(name) LIKE ${'%' + query + '%'}
          ORDER BY created_at DESC
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
          ORDER BY created_at DESC
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
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }
    }

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
        image: { original: imgUrl },
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
