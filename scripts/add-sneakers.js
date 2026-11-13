import pg from 'pg'
import axios from 'axios'

const { Client } = pg

const R2_WORKER_URL = (
  process.env.R2_WORKER_URL || 'https://steep-hall-ab15.vplyha.workers.dev'
).replace(/\/$/, '')
const R2_UPLOAD_SECRET = process.env.R2_UPLOAD_SECRET || 'cardio_secret_2026'

const MIGRATION_BATCH_SIZE = 250
const CONCURRENCY = 5

const ALGOLIA_URL =
  'https://2fwotdvm2o-dsn.algolia.net/1/indexes/*/queries?x-algolia-application-id=2FWOTDVM2O&x-algolia-api-key=ac96de6fef0e02bb95d433d8d5c7038a'

const SEARCH_TERMS = [
  'Chanel', 'Chanel sneakers', 'Chanel loafers', 'Chanel boots', 'Chanel sandals', 'Chanel ballet flats',
  'Prada', 'Prada loafers', 'Prada boots', 'Prada heels', 'Prada mules', 'Prada America Cup',
  'Valentino', 'Valentino Garavani', 'Valentino heels', 'Valentino boots', 'Valentino sneakers',
  'Balenciaga', 'Balenciaga boots', 'Balenciaga mules', 'Balenciaga sandals', 'Balenciaga Track', 'Balenciaga 3XL',
  'Gucci', 'Gucci loafers', 'Gucci slides', 'Gucci boots', 'Gucci heels',
  'Louis Vuitton', 'Louis Vuitton loafers', 'Louis Vuitton boots', 'Louis Vuitton mules', 'Louis Vuitton Trainer',
  'Dior', 'Dior heels', 'Dior boots', 'Dior sandals', 'Dior B22', 'Dior B30',
  'Saint Laurent', 'Saint Laurent heels', 'Saint Laurent boots', 'Saint Laurent loafers',
  'Bottega Veneta', 'Bottega Veneta boots', 'Bottega Veneta mules', 'Bottega Veneta loafers',
  'Miu Miu', 'Miu Miu loafers', 'Miu Miu boots', 'Miu Miu New Balance',
  'Celine', 'Celine boots', 'Celine loafers', 'Celine sneakers',
  'Loewe', 'Loewe sneakers', 'Loewe Cloudtilt', 'Loewe boots',
  'Hermes', 'Hermes Oran', 'Hermes Chypre', 'Hermes loafers', 'Hermes boots',
  'Loro Piana', 'Loro Piana Summer Walk', 'Loro Piana Open Walk', 'Loro Piana loafers',
  'Maison Margiela', 'Maison Margiela Tabi', 'Maison Margiela Replica', 'Maison Margiela boots',
  'Rick Owens', 'Rick Owens boots', 'Rick Owens Geobasket', 'Rick Owens Ramones',
  'Alexander McQueen', 'Alexander McQueen Oversized', 'Alexander McQueen boots', 'Alexander McQueen loafers',
  'Lanvin', 'Lanvin Curb', 'Lanvin sneakers', 'Lanvin boots',
  'Versace', 'Versace loafers', 'Versace heels', 'Versace Chain Reaction',
  'Givenchy', 'Givenchy boots', 'Givenchy slides',
  'Off-White', 'Fear of God', 'BAPE', 'Supreme', 'Kith', 'Palace',
  "Arc'teryx", 'Veja', 'Autry',
  'Lacoste', 'Calvin Klein', 'Tommy Hilfiger', 'Polo Ralph Lauren', 'Dsquared2',
  'Nike', 'Jordan', 'Adidas', 'Yeezy', 'New Balance', 'Asics', 'Converse',
  'Vans', 'Puma', 'Reebok', 'Saucony', 'Mizuno', 'Salomon', 'Hoka', 'On',
  'Under Armour', 'Fila', 'Skechers', 'Etnies', 'Osiris', 'DC',
  'Timberland', 'Timberland boots', 'UGG', 'UGG Tasman',
  'Crocs', 'Dr. Martens', 'Birkenstock', 'Birkenstock Boston',
  'Clarks', 'Clarks Wallabee', 'Merrell', 'Oakley',
]

function extractRealReleaseYear(item) {
  if (item.release_date_year) {
    const y = Number(item.release_date_year)
    if (!Number.isNaN(y) && y >= 1970 && y <= 2027) return y
  }

  if (item.release_date) {
    if (typeof item.release_date === 'number') {
      const ms = item.release_date < 1e11 ? item.release_date * 1000 : item.release_date
      const y = new Date(ms).getUTCFullYear()
      if (y >= 1970 && y <= 2027) return y
    } else if (typeof item.release_date === 'string') {
      const match = item.release_date.match(/\b(19[7-9]\d|20[0-2]\d)\b/)
      if (match) return Number(match[1])
    }
  }

  if (item.name && typeof item.name === 'string') {
    const nameMatch = item.name.match(/\b(19[8-9]\d|20[0-2]\d)\b/)
    if (nameMatch) return Number(nameMatch[1])
  }

  return null
}

function pickSourceImageUrl(item) {
  const candidates = [
    item.main_picture_url,
    item.original_picture_url,
    item.grid_picture_url,
    item.picture_url,
  ]
  for (const url of candidates) {
    if (typeof url === 'string' && url.trim().startsWith('http')) {
      return url.trim().replace(/^http:\/\//i, 'https://')
    }
  }
  return null
}

/**
 * Запрашивает строго JPEG/PNG (без AVIF), чтобы iPhone 11 и старые WebKit открывали 100% файлов напрямую
 */
async function uploadToCloudflareR2(sourceUrl, sneakerId) {
  try {
    const imgRes = await axios.get(sourceUrl, {
      responseType: 'arraybuffer',
      timeout: 12000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'image/png,image/jpeg,image/webp;q=0.9,*/*;q=0.8',
        Referer: sourceUrl.includes('goat.com') ? 'https://www.goat.com/' : undefined,
      },
    })

    const contentType = imgRes.headers['content-type'] || 'image/jpeg'
    const imgSize = imgRes.data?.byteLength || 0

    if (!contentType.includes('image') || imgSize < 3000) {
      return 'BROKEN_IMAGE'
    }

    const ext = contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
      ? 'webp'
      : 'jpg'
    const safeId = String(sneakerId)
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .slice(0, 120)
    const objectKey = `shoes/${safeId}.${ext}`

    const r2Res = await axios.put(
      `${R2_WORKER_URL}/${objectKey}`,
      Buffer.from(imgRes.data),
      {
        headers: {
          'Content-Type': contentType,
          'x-upload-secret': R2_UPLOAD_SECRET,
        },
        timeout: 15000,
        maxBodyLength: Infinity,
      }
    )

    if (r2Res.status === 200 && r2Res.data?.url) {
      return r2Res.data.url
    }
    return null
  } catch (err) {
    const status = err?.response?.status
    if (status === 404 || status === 410 || status === 403) {
      return 'BROKEN_IMAGE'
    }
    return null
  }
}

async function migrateExistingPhotosToR2(client) {
  const statsRes = await client.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE image_url LIKE '%workers.dev%') AS in_r2,
      COUNT(*) FILTER (WHERE image_url LIKE '%goat.com%') AS in_goat,
      COUNT(*) FILTER (WHERE image_url LIKE '%ibb.co%' OR image_url LIKE '%imgbb.com%') AS in_imgbb
    FROM sneakers
  `)
  const st = statsRes.rows[0]
  console.log(`\n📊 СТАТИСТИКА БАЗЫ NEON:`)
  console.log(`   Всего моделей в базе: ${st.total}`)
  console.log(`   ☁️ Уже в вашем Cloudflare R2: ${st.in_r2}`)
  console.log(`   🐐 Осталось прямых ссылок GOAT: ${st.in_goat}`)
  console.log(`   🖼️ Хранится на стороннем ImgBB: ${st.in_imgbb}`)

  const toMigrateRes = await client.query(
    `
    SELECT id, brand, name, image_url
    FROM sneakers
    WHERE image_url NOT LIKE '%workers.dev%'
    ORDER BY (CASE WHEN image_url LIKE '%goat.com%' THEN 0 ELSE 1 END), created_at DESC
    LIMIT $1
  `,
    [MIGRATION_BATCH_SIZE]
  )

  const rows = toMigrateRes.rows
  if (rows.length === 0) {
    console.log('🎉 ВСЕ 100% карточек вашей базы уже перенесены в ваш Cloudflare R2!')
    return
  }

  let migratedCount = 0
  let deletedBrokenCount = 0

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY)

    await Promise.all(
      chunk.map(async (row) => {
        const result = await uploadToCloudflareR2(row.image_url, row.id)

        if (result === 'BROKEN_IMAGE') {
          await client.query('DELETE FROM sneakers WHERE id = $1', [row.id])
          deletedBrokenCount++
        } else if (result && result.includes('workers.dev')) {
          await client.query('UPDATE sneakers SET image_url = $1 WHERE id = $2', [result, row.id])
          migratedCount++
        }
      })
    )
  }

  console.log(
    `\n✅ Партия завершена: перенесено в R2 — ${migratedCount} шт., очищено пустых карточек — ${deletedBrokenCount} шт.`
  )
}

async function run() {
  const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ Не задан NEON_DATABASE_URL или DATABASE_URL')
    process.exit(1)
  }

  const client = new Client({ connectionString })
  await client.connect()

  await client.query(`
    ALTER TABLE sneakers ADD COLUMN IF NOT EXISTS sku TEXT;
    DELETE FROM sneakers WHERE image_url IS NULL OR TRIM(image_url) = '' OR TRIM(image_url) = 'null';

    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE INDEX IF NOT EXISTS idx_sneakers_brand_created ON sneakers (LOWER(brand), created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sneakers_gender_created ON sneakers (gender, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sneakers_name_trgm ON sneakers USING gin (LOWER(name) gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_sneakers_brand_trgm ON sneakers USING gin (LOWER(brand) gin_trgm_ops);
  `)

  await migrateExistingPhotosToR2(client)

  for (let i = 0; i < 10; i++) {
    const randomBrand = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)]
    const randomPage = Math.floor(Math.random() * 6)

    const queryData = {
      requests: [
        {
          indexName: 'product_variants_v2',
          params: `query=${encodeURIComponent(
            randomBrand
          )}&hitsPerPage=100&page=${randomPage}&facetFilters=[["product_category:shoes"]]`,
        },
      ],
    }

    try {
      const { data } = await axios.post(ALGOLIA_URL, queryData, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Content-Type': 'application/json',
        },
      })

      const rawSneakers = data?.results?.[0]?.hits
      if (!rawSneakers || rawSneakers.length === 0) continue

      const uniqueSneakers = []
      const seenIds = new Set()

      for (const item of rawSneakers) {
        const sourceImage = pickSourceImageUrl(item)
        if (!sourceImage) continue

        const id =
          item.slug ||
          item.name
            ?.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')

        if (id && !seenIds.has(id)) {
          seenIds.add(id)
          uniqueSneakers.push({ item, sourceImage, id })
        }
      }

      for (const { item, sourceImage, id } of uniqueSneakers) {
        const brand = item.brand_name || randomBrand.split(' ')[0]
        const name = item.name || 'Sneaker'
        const gender = Array.isArray(item.gender) ? item.gender[0] : item.gender || 'unisex'
        const price = item.retail_price_cents ? Math.round(item.retail_price_cents / 100) : 0
        const realYear = extractRealReleaseYear(item)
        const sku = item.sku || null

        const existingRes = await client.query(
          'SELECT id, release_year, image_url FROM sneakers WHERE id = $1',
          [id]
        )

        if (existingRes.rows.length > 0) {
          const row = existingRes.rows[0]
          if (row.release_year === 2024 && realYear !== 2024) {
            await client.query(
              'UPDATE sneakers SET release_year = $1, sku = COALESCE(sku, $2) WHERE id = $3',
              [realYear, sku, id]
            )
          }
          continue
        }

        const r2Url = await uploadToCloudflareR2(sourceImage, id)
        if (!r2Url || r2Url === 'BROKEN_IMAGE') continue

        await client.query(
          `
          INSERT INTO sneakers (id, brand, name, gender, retail_price, release_year, image_url, sku)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
          `,
          [id, brand, name, gender, price, realYear, r2Url, sku]
        )

        console.log(`  💾 Новая модель в R2 и БД: ${brand} | ${name}`)
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    } catch (err) {
      console.error('Ошибка API:', err?.message || err)
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  await client.end()
}

run()
