import pg from 'pg'
import axios from 'axios'

const { Client } = pg

// Ты можешь вписать сюда конкретную модель (например, "Nike Dunk"), 
// или оставить пустые кавычки "", тогда скрипт будет качать всё подряд из мировых топов.
const SEARCH_QUERY = "" 

// Публичный поисковой ключ GOAT (работает без токенов и регистраций)
const ALGOLIA_URL = 'https://2fwotdvm2o-dsn.algolia.net/1/indexes/*/queries?x-algolia-application-id=2FWOTDVM2O&x-algolia-api-key=ac96de6fef0e02bb95d433d8d5c7038a'

async function run() {
  console.log('Подключаемся к базе Neon...')
  const client = new Client({ connectionString: process.env.NEON_DATABASE_URL })
  await client.connect()

  // Генерируем случайную страницу от 0 до 50, чтобы каждый твой клик добавлял новые кроссовки
  const page = Math.floor(Math.random() * 50)
  console.log(`Сканируем глобальный каталог (Страница ${page})...`)

  const queryData = {
    requests: [{
      indexName: "product_variants_v2", // База всех кроссовок
      params: `query=${encodeURIComponent(SEARCH_QUERY)}&hitsPerPage=20&page=${page}&facetFilters=[["product_category:shoes"]]`
    }]
  }

  try {
    const { data } = await axios.post(ALGOLIA_URL, queryData)
    const sneakers = data.results[0].hits

    console.log(`Получено ${sneakers.length} эталонных моделей из API. Начинаем заливку...`)

    for (const item of sneakers) {
      if (!item.main_picture_url) continue // Пропускаем, если у них нет фото

      // Раскладываем JSON по полочкам
      const id = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const brand = item.brand_name || 'Unknown'
      const name = item.name || 'Sneaker'
      const gender = item.gender ? item.gender[0] : 'unisex'
      const price = item.retail_price_cents ? item.retail_price_cents / 100 : 0
      const year = item.release_date_year || 2024

      console.log(`\n👟 Найдено: ${brand} | ${name}`)

      // 1. Проверяем, есть ли уже этот ID у тебя в базе
      const checkRes = await client.query('SELECT id FROM sneakers WHERE id = $1', [id])
      if (checkRes.rows.length > 0) {
        console.log(`  ⏭ Уже есть в твоей БД. Пропускаем.`)
        continue
      }

      // 2. Скачиваем фото (у GOAT нет блокировок Cloudflare, качается за миллисекунду)
      try {
        console.log(`  -> Скачиваем студийное фото...`)
        const imgRes = await axios.get(item.main_picture_url, { responseType: 'arraybuffer' })
        const base64Data = Buffer.from(imgRes.data).toString('base64')
        
        // 3. Перекидываем на твой надежный ImgBB
        console.log(`  -> Сохраняем на твой ImgBB...`)
        const form = new URLSearchParams()
        form.append('image', base64Data)

        const uploadRes = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, form.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })

        const newCleanUrl = uploadRes.data.data.url

        // 4. Заливаем всё это великолепие в твой Neon
        await client.query(`
          INSERT INTO sneakers (id, brand, name, gender, retail_price, release_year, image_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [id, brand, name, gender, price, year, newCleanUrl])

        console.log(`  ✅ Идеально добавлено в базу!`)
      } catch (imgError) {
         console.log(`  ❌ Ошибка загрузки картинки:`, imgError.message)
      }
      
      // Делаем легкую паузу
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

  } catch (err) {
    console.error('Ошибка при обращении к API:', err.message)
  }

  await client.end()
  console.log('\n🏁 База пополнена! Нажми "Run workflow" еще раз, чтобы добавить следующую партию.')
}

run()

