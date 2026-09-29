import pg from 'pg'
import axios from 'axios'

const { Client } = pg
const ALGOLIA_URL = 'https://2fwotdvm2o-dsn.algolia.net/1/indexes/*/queries?x-algolia-application-id=2FWOTDVM2O&x-algolia-api-key=ac96de6fef0e02bb95d433d8d5c7038a'

// Полный список твоих брендов из приложения
const SEARCH_TERMS = [
  'Nike', 'Jordan', 'Adidas', 'Yeezy', 'New Balance', 'Asics', 'Converse', 
  'Vans', 'Puma', 'Reebok', 'Saucony', 'Mizuno', 'Salomon', 'Hoka', 
  'On Running', 'Merrell', 'Oakley', "Arc'teryx", 'BAPE', 'Supreme', 
  'Fear of God', 'Kith', 'Palace', 'Balenciaga', 'Off-White', 'Gucci', 
  'Prada', 'Louis Vuitton', 'Dior', 'Maison Margiela', 'Rick Owens', 
  'Alexander McQueen', 'Lanvin', 'Crocs', 'Timberland', 'UGG', 
  'Dr. Martens', 'Birkenstock', 'Clarks', 'Veja', 'Autry', 'Lacoste', 
  'Calvin Klein', 'Tommy Hilfiger', 'Polo Ralph Lauren', 'Dsquared2', 
  'Versace', 'Valentino', 'Givenchy', 'Under Armour', 'Fila', 'Skechers', 
  'Etnies', 'Osiris', 'DC'
]

async function run() {
  console.log('Подключаемся к базе Neon...')
  const client = new Client({ connectionString: process.env.NEON_DATABASE_URL })
  await client.connect()

  // Делаем 15 заходов за один запуск экшена
  for (let i = 0; i < 15; i++) {
    // Выбираем случайный бренд из твоего списка
    const randomBrand = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)]
    // Берем случайную страницу от 0 до 5 (чтобы вытягивать самые популярные и свежие модели)
    const randomPage = Math.floor(Math.random() * 6) 

    console.log(`\n=========================================`)
    console.log(`📡 ШАГ ${i + 1}/15 | ИЩЕМ БРЕНД: "${randomBrand}" (Страница ${randomPage})...`)
    
    const queryData = {
      requests: [{
        indexName: "product_variants_v2",
        params: `query=${encodeURIComponent(randomBrand)}&hitsPerPage=100&page=${randomPage}&facetFilters=[["product_category:shoes"]]`
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

      console.log(`Найдено ${uniqueSneakers.length} уникальных моделей. Проверяем в БД...`)

      for (const item of uniqueSneakers) {
        const id = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        
        // Берем оригинальное имя бренда из API, либо подставляем то, которое искали
        const brand = item.brand_name || randomBrand
        const name = item.name || 'Sneaker'
        const gender = item.gender ? item.gender[0] : 'unisex'
        const price = item.retail_price_cents ? item.retail_price_cents / 100 : 0
        const year = item.release_date_year || 2024

        const checkRes = await client.query('SELECT id FROM sneakers WHERE id = $1', [id])
        if (checkRes.rows.length > 0) continue // Пропускаем теки, что уже есть

        try {
          console.log(`  -> Новая модель! Качаем: ${brand} | ${name}`)
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

          console.log(`  ✅ Сохранено!`)
        } catch (imgError) {
           console.log(`  ❌ Ошибка загрузки:`, imgError.message)
        }
        await new Promise(resolve => setTimeout(resolve, 800)) 
      }
    } catch (err) {
      console.error('Ошибка API:', err.message)
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000)) 
  }

  await client.end()
  console.log('\n🏁 МЕГА-ЦИКЛ ЗАВЕРШЕН!')
}

run()
