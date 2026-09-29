import pg from 'pg'
import axios from 'axios'

const { Client } = pg
const ALGOLIA_URL = 'https://2fwotdvm2o-dsn.algolia.net/1/indexes/*/queries?x-algolia-application-id=2FWOTDVM2O&x-algolia-api-key=ac96de6fef0e02bb95d433d8d5c7038a'

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
  'Oakley', 'Oakley mules', 'Oakley boots'
]

async function run() {
  console.log('Подключаемся к базе Neon...')
  const client = new Client({ connectionString: process.env.NEON_DATABASE_URL })
  await client.connect()

  for (let i = 0; i < 15; i++) {
    const randomBrand = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)]
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
        const brand = item.brand_name || randomBrand
        const name = item.name || 'Sneaker'
        const gender = item.gender ? item.gender[0] : 'unisex'
        const price = item.retail_price_cents ? Math.round(item.retail_price_cents / 100) : 0
        const year = item.release_date_year || 2024

        const checkRes = await client.query('SELECT id FROM sneakers WHERE id = $1', [id])
        if (checkRes.rows.length > 0) continue 

        console.log(`  -> Обработка модели: ${brand} | ${name}`)
        
        // ПО УМОЛЧАНИЮ: берем оригинальную ссылку с GOAT
        let finalImageUrl = item.main_picture_url

        try {
          const imgRes = await axios.get(item.main_picture_url, { 
            responseType: 'arraybuffer',
            timeout: 8000 
          })
          
          const contentType = imgRes.headers['content-type'] || ''
          const imgSize = imgRes.data.byteLength || 0

          if (contentType.includes('image') && imgSize > 2000) {
            const base64Data = Buffer.from(imgRes.data).toString('base64')
            const form = new URLSearchParams()
            form.append('image', base64Data)

            const uploadRes = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, form.toString(), {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            })
            // ЕСЛИ УСПЕШНО: меняем на ссылку ImgBB
            finalImageUrl = uploadRes.data.data.url
            console.log(`  ✅ Фото залито на ImgBB!`)
          } else {
            console.log(`  ⚠️ Картинка нестандартная, используем прямую ссылку GOAT.`)
          }
        } catch (imgError) {
           console.log(`  ⚠️ Ошибка хостинга ImgBB, используем прямую ссылку GOAT.`)
        }

        // ВАЖНО: Модель теперь сохраняется В ЛЮБОМ СЛУЧАЕ
        await client.query(`
          INSERT INTO sneakers (id, brand, name, gender, retail_price, release_year, image_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [id, brand, name, gender, price, year, finalImageUrl])

        console.log(`  💾 Успешно сохранено в базу!`)
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
