import pg from 'pg'
import axios from 'axios'

const { Client } = pg
const SEARCH_QUERY = "" 
const ALGOLIA_URL = 'https://2fwotdvm2o-dsn.algolia.net/1/indexes/*/queries?x-algolia-application-id=2FWOTDVM2O&x-algolia-api-key=ac96de6fef0e02bb95d433d8d5c7038a'

async function run() {
  console.log('Подключаемся к базе Neon...')
  const client = new Client({ connectionString: process.env.NEON_DATABASE_URL })
  await client.connect()

  // ПРОХОДИМ СРАЗУ 15 СТРАНИЦ ЗА ОДИН ЗАПУСК
  for (let page = 0; page < 15; page++) {
    console.log(`\n=========================================`)
    console.log(`📡 СКАНИРУЕМ СТРАНИЦУ ${page}...`)
    
    const queryData = {
      requests: [{
        indexName: "product_variants_v2",
        params: `query=${encodeURIComponent(SEARCH_QUERY)}&hitsPerPage=100&page=${page}&facetFilters=[["product_category:shoes"]]`
      }]
    }

    try {
      const { data } = await axios.post(ALGOLIA_URL, queryData)
      const rawSneakers = data.results[0].hits
      if (!rawSneakers || rawSneakers.length === 0) {
        console.log('Пустая страница, идем дальше...')
        continue
      }

      const uniqueSneakers = []
      const seenIds = new Set()

      for (const item of rawSneakers) {
        if (!item.main_picture_url) continue 
        const id = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        
        if (!seenIds.has(id)) {
          seenIds.add(id)
          uniqueSneakers.push(item)
        }
      }

      console.log(`Найдено ${uniqueSneakers.length} уникальных моделей на странице. Заливаем...`)

      for (const item of uniqueSneakers) {
        const id = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const brand = item.brand_name || 'Unknown'
        const name = item.name || 'Sneaker'
        const gender = item.gender ? item.gender[0] : 'unisex'
        const price = item.retail_price_cents ? item.retail_price_cents / 100 : 0
        const year = item.release_date_year || 2024

        const checkRes = await client.query('SELECT id FROM sneakers WHERE id = $1', [id])
        if (checkRes.rows.length > 0) continue // Молча пропускаем существующие

        try {
          console.log(`  -> Качаем: ${brand} | ${name}`)
          const imgRes = await axios.get(item.main_picture_url, { responseType: 'arraybuffer' })
          const base64Data = Buffer.from(imgRes.data).toString('base64')
          
          const form = new URLSearchParams()
          form.append('image', base64Data)

          const uploadRes = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, form.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          })

          await client.query(`
            INSERT INTO sneakers (id, brand, name, gender, retail_price, release_year, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO NOTHING
          `, [id, brand, name, gender, price, year, uploadRes.data.data.url])

          console.log(`  ✅ Успех!`)
        } catch (imgError) {
           console.log(`  ❌ Ошибка загрузки:`, imgError.message)
        }
        await new Promise(resolve => setTimeout(resolve, 800)) // Задержка между кроссовками
      }
    } catch (err) {
      console.error('Ошибка API:', err.message)
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000)) // Задержка между страницами
  }

  await client.end()
  console.log('\n🏁 МЕГА-ЦИКЛ ЗАВЕРШЕН!')
}

run()
