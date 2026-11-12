import pg from 'pg'
import axios from 'axios'

const { Client } = pg
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
  // 1. Прямое числовое поле release_date_year
  if (item.release_date_year) {
    const y = Number(item.release_date_year)
    if (!Number.isNaN(y) && y >= 1970 && y <= 2027) return y
  }

  // 2. Поле release_date (может быть строкой '2021-05-14' или Unix timestamp в секундах)
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

  // 3. Поиск года в названии модели (например, "'99" не берем, только полный 4-значный год)
  if (item.name && typeof item.name === 'string') {
    const nameMatch = item.name.match(/\b(19[8-9]\d|20[0-2]\d)\b/)
    if (nameMatch) return Number(nameMatch[1])
  }

  // Возвращаем null вместо фейкового 2024
  return null
}

/**
 * Выбирает лучшую доступную ссылку на изображение из ответа Algolia
 */
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
 * Скачивает картинку с браузерными заголовками и загружает на ImgBB (или возвращает рабочий прокси-URL)
 */
async function resolveProductionImageUrl(sourceUrl) {
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

    const contentType = imgRes.headers['content-type'] || ''
    const imgSize = imgRes.data?.byteLength || 0

    if (!contentType.includes('image') || imgSize < 2500) {
      return null
    }

    if (process.env.IMGBB_API_KEY) {
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
        return uploadRes.data.data.url
      }
    }

    // Если ImgBB недоступен или лимит исчерпан, но фото валидно — используем проверенный исходный URL
    return sourceUrl
  } catch {
    // Проверяем через глобальный кэш-прокси wsrv.nl
    try {
      const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(sourceUrl)}&w=800&q=85&output=webp`
      const checkProxy = await axios.head(proxyUrl, { timeout: 6000 })
      if (checkProxy.status === 200) {
        return proxyUrl
      }
    } catch {}
    return null
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

  // Гарантируем наличие колонки sku и очищаем пустые записи без фото
  await client.query(`
    ALTER TABLE sneakers ADD COLUMN IF NOT EXISTS sku TEXT;
    DELETE FROM sneakers WHERE image_url IS NULL OR TRIM(image_url) = '' OR TRIM(image_url) = 'null';
  `)

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
        const sku = item.sku || item.designer_color || null

        // Проверяем, есть ли уже запись и нужно ли обновить ей фейковый 2024 год или пустой SKU
        const existingRes = await client.query(
          'SELECT id, release_year, image_url, sku FROM sneakers WHERE id = $1',
          [id]
        )

        if (existingRes.rows.length > 0) {
          const row = existingRes.rows[0]
          const hasReliablePhoto =
            row.image_url &&
            (row.image_url.includes('imgbb.com') || row.image_url.includes('wsrv.nl'))

          // Если год был записан как дефолтный 2024, исправляем на реальный год из Algolia
          if (row.release_year === 2024 && realYear !== 2024) {
            await client.query(
              'UPDATE sneakers SET release_year = $1, sku = COALESCE(sku, $2) WHERE id = $3',
              [realYear, sku, id]
            )
            console.log(`  🔧 Исправлен год релиза для: ${brand} | ${name} -> ${realYear ?? 'NULL'}`)
          }
          if (hasReliablePhoto) continue
        }

        console.log(`  -> Обработка: ${brand} | ${name} (${realYear ?? 'год не указан'})`)
        const verifiedImageUrl = await resolveProductionImageUrl(sourceImage)

        if (!verifiedImageUrl) {
          console.log(`  ⏭️ Пропуск: фото недоступно или заблокировано CDN`)
          continue
        }

        await client.query(
          `
          INSERT INTO sneakers (id, brand, name, gender, retail_price, release_year, image_url, sku)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            release_year = EXCLUDED.release_year,
            image_url = COALESCE(EXCLUDED.image_url, sneakers.image_url),
            sku = COALESCE(EXCLUDED.sku, sneakers.sku),
            retail_price = CASE WHEN EXCLUDED.retail_price > 0 THEN EXCLUDED.retail_price ELSE sneakers.retail_price END
          `,
          [id, brand, name, gender, price, realYear, verifiedImageUrl, sku]
        )

        console.log(`  💾 Сохранено: ${brand} | ${name}`)
        await new Promise((resolve) => setTimeout(resolve, 600))
      }
    } catch (err) {
      console.error('Ошибка шага синхронизации:', err?.message || err)
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  await client.end()
  console.log('\n🏁 СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА!')
}

run()
