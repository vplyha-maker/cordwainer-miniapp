import pg from 'pg'
import axios from 'axios'

const { Client } = pg

// Настройки вашего Cloudflare R2 Воркера
const R2_WORKER_URL = (
  process.env.R2_WORKER_URL || 'https://steep-hall-ab15.vplyha.workers.dev'
).replace(/\/$/, '')
const R2_UPLOAD_SECRET = process.env.R2_UPLOAD_SECRET || 'cardio_secret_2026'

const ALGOLIA_URL =
  'https://2fwotdvm2o-dsn.algolia.net/1/indexes/*/queries?x-algolia-application-id=2FWOTDVM2O&x-algolia-api-key=ac96de6fef0e02bb95d433d8d5c7038a'

const SEARCH_TERMS = [
  // 1. Спортивные, беговые и скейт-бренды
  'Nike', 'Jordan', 'Adidas', 'Yeezy', 'New Balance', 'Asics', 'Converse',
  'Vans', 'Puma', 'Reebok', 'Saucony', 'Mizuno', 'Salomon', 'Hoka', 'On',
  'Under Armour', 'Fila', 'Skechers', 'Etnies', 'Osiris', 'DC',

  // 2. Стритвир и нишевые марки
  'BAPE', 'Supreme', 'Fear of God', 'Kith', 'Palace', 'Off-White',
  "Arc'teryx", 'Veja', 'Autry',

  // 3. Люкс и Высокая мода
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

  // 5. Зима, Аутдор и Повседневная обувь
  'Timberland', 'Timberland boots', 'Timberland boat shoes',
  'UGG', 'UGG boots', 'UGG slippers', 'UGG Tasman',
  'Crocs', 'Crocs clogs', 'Crocs sandals',
  'Dr. Martens', 'Dr. Martens boots', 'Dr. Martens oxfords', 'Dr. Martens loafers',
  'Birkenstock', 'Birkenstock sandals', 'Birkenstock clogs', 'Birkenstock Boston',
  'Clarks', 'Clarks Wallabee', 'Clarks Desert Boot',
  'Merrell', 'Merrell boots', 'Merrell moc',
  'Oakley', 'Oakley mules', 'Oakley boots',
]

/**
 * Извлекает реальный год релиза из полей Algolia без подстановки фейкового 2024 года
 */
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
 * Скачивает фото с GOAT и заливает в ваш Cloudflare R2 через воркер steep-hall-ab15
 * (с резервным откатом на ImgBB, если воркер временно недоступен)
 */
async function uploadToCloudflareR2(sourceUrl, sneakerId) {
  try {
    const imgRes = await axios.get(sourceUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: 'https://www.goat.com/',
      },
    })

    const contentType = imgRes.headers['content-type'] || 'image/jpeg'
    const imgSize = imgRes.data?.byteLength || 0

    if (!contentType.includes('image') || imgSize < 2500) {
      console.log('  ⚠️ Файл поврежден или слишком мал, пропускаем.')
      return null
    }

    const ext = contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
      ? 'webp'
      : 'jpg'
    const objectKey = `shoes/${sneakerId}.${ext}`

    // 1. Загружаем в ваш Cloudflare R2 через воркер steep-hall-ab15.vplyha.workers.dev
    try {
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
        console.log(`  ☁️ Фото загружено в Cloudflare R2: ${r2Res.data.url}`)
        return r2Res.data.url
      }
    } catch (r2Err) {
      console.log(
        `  ⚠️ Воркер R2 вернул ошибку (${r2Err?.response?.status || r2Err.message}), пробуем резерв...`
      )
    }

    // 2. Резервный вариант: ImgBB (если задан ключ)
    if (process.env.IMGBB_API_KEY) {
      try {
        const base64Data = Buffer.from(imgRes.data).toString('base64')
        const form = new URLSearchParams()
        form.append('image', base64Data)

        const uploadRes = await axios.post(
          `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
          form.toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000,
          }
        )

        if (uploadRes.data?.data?.url) {
          console.log(`  ✅ Фото залито на резервный ImgBB!`)
          return uploadRes.data.data.url
        }
      } catch {}
    }

    return sourceUrl
  } catch {
    return null
  }
}

/**
 * Автоматически чинит старые карточки в базе, у которых остались прямые ссылки goat.com
 * (перезаливает их фото в ваш Cloudflare R2, не трогая рабочие фото на ImgBB)
 */
async function repairBrokenGoatLinks(client) {
  console.log('\n🔍 Проверяем старые карточки с прямыми ссылками GOAT для переноса в R2...')
  const brokenRes = await client.query(`
    SELECT id, brand, name, image_url
    FROM sneakers
    WHERE image_url LIKE '%goat.com%'
    ORDER BY created_at DESC
    LIMIT 25
  `)

  if (brokenRes.rows.length === 0) {
    console.log('✅ Все текущие карточки уже на облачном хостинге!')
    return
  }

  console.log(`Найдено ${brokenRes.rows.length} карточек с прямыми ссылками GOAT. Переносим в R2...`)
  for (const row of brokenRes.rows) {
    const newUrl = await uploadToCloudflareR2(row.image_url, row.id)
    if (newUrl && newUrl !== row.image_url) {
      await client.query('UPDATE sneakers SET image_url = $1 WHERE id = $2', [newUrl, row.id])
      console.log(`  🔧 Перенесено в R2: ${row.brand} | ${row.name}`)
      await new Promise((r) => setTimeout(r, 400))
    }
  }
}

async function run() {
  const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ Не задан NEON_DATABASE_URL или DATABASE_URL')
    process.exit(1)
  }

  console.log('🔌 Подключаемся к базе Neon...')
  const client = new Client({ connectionString })
  await client.connect()

  // Гарантируем наличие колонки sku и удаляем совсем пустые записи без фото
  await client.query(`
    ALTER TABLE sneakers ADD COLUMN IF NOT EXISTS sku TEXT;
    DELETE FROM sneakers WHERE image_url IS NULL OR TRIM(image_url) = '' OR TRIM(image_url) = 'null';
  `)

  // Шаг 1: Чиним партию старых карточек, которые не загрузились на ImgBB
  await repairBrokenGoatLinks(client)

  // Шаг 2: Парсим новые модели и сразу сохраняем фото в Cloudflare R2
  for (let i = 0; i < 15; i++) {
    const randomBrand = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)]
    const randomPage = Math.floor(Math.random() * 6)

    console.log(`\n=========================================`)
    console.log(`📡 ШАГ ${i + 1}/15 | БРЕНД: "${randomBrand}" (Страница ${randomPage})`)

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
      if (!rawSneakers || rawSneakers.length === 0) {
        console.log('Пустая страница, идем дальше...')
        continue
      }

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

      console.log(`Найдено ${uniqueSneakers.length} моделей с фото. Синхронизируем с БД...`)

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
          // Исправляем старый дефолтный 2024 год на реальный
          if (row.release_year === 2024 && realYear !== 2024) {
            await client.query(
              'UPDATE sneakers SET release_year = $1, sku = COALESCE(sku, $2) WHERE id = $3',
              [realYear, sku, id]
            )
          }
          // Если фото уже лежит на ImgBB или вашем воркере R2 — не трогаем его!
          if (
            row.image_url &&
            (row.image_url.includes('ibb.co') ||
              row.image_url.includes('imgbb.com') ||
              row.image_url.includes('workers.dev'))
          ) {
            continue
          }
        }

        console.log(`  -> Обработка: ${brand} | ${name}`)
        const finalImageUrl = await uploadToCloudflareR2(sourceImage, id)
        if (!finalImageUrl) continue

        await client.query(
          `
          INSERT INTO sneakers (id, brand, name, gender, retail_price, release_year, image_url, sku)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            release_year = EXCLUDED.release_year,
            image_url = EXCLUDED.image_url,
            sku = COALESCE(EXCLUDED.sku, sneakers.sku)
          `,
          [id, brand, name, gender, price, realYear, finalImageUrl, sku]
        )

        console.log(`  💾 Сохранено в БД: ${brand} | ${name}`)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } catch (err) {
      console.error('Ошибка API:', err?.message || err)
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  await client.end()
  console.log('\n🏁 МЕГА-ЦИКЛ ЗАВЕРШЕН!')
}

run()
