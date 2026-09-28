import pg from 'pg'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import axios from 'axios'

const { Client } = pg
puppeteer.use(StealthPlugin())

async function run() {
  console.log('Подключаемся к базе Neon...')
  const client = new Client({ connectionString: process.env.NEON_DATABASE_URL })
  await client.connect()

  // Ищем кроссовки со ссылками на StockX
  const { rows } = await client.query(`
    SELECT id, brand, name FROM sneakers 
    WHERE image_url LIKE '%stockx.com%' 
    LIMIT 10
  `)

  if (rows.length === 0) {
    console.log('Все картинки уже обновлены!')
    await client.end()
    return
  }

  console.log(`Осталось ${rows.length} кроссовок. Запускаем поиск через Bing Images...`)
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  })
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

  for (const row of rows) {
    const query = `${row.brand} ${row.name} shoes`
    console.log(`\n🔎 Ищем в Bing: ${query}`)

    try {
      await page.goto(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' })
      
      const imageUrl = await page.evaluate(() => {
        const img = document.querySelector('img.mimg')
        return img ? (img.src || img.getAttribute('data-src')) : null
      })

      if (!imageUrl || !imageUrl.startsWith('http')) {
        console.log(`❌ Картинка не найдена для ${row.id}`)
        continue
      }

      console.log(`  -> Скачиваем картинку...`)
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
      
      console.log(`  -> Конвертируем в Base64 и загружаем на ImgBB...`)
      const base64Data = Buffer.from(response.data).toString('base64')
      
      const form = new URLSearchParams()
      form.append('image', base64Data)

      const uploadRes = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, form.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      const newCleanUrl = uploadRes.data.data.url

      await client.query('UPDATE sneakers SET image_url = $1 WHERE id = $2', [newCleanUrl, row.id])
      console.log(`  ✅ Успех! Сохранено в БД: ${newCleanUrl}`)
      
    } catch (e) {
      console.error(`  ❌ Ошибка с ID ${row.id}:`, e.message)
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  await browser.close()
  await client.end()
  console.log('\n🏁 Цикл завершен. Нажми "Run workflow" еще раз.')
}

run()
