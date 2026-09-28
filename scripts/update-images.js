import pg from 'pg'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import axios from 'axios'
import FormData from 'form-data'

const { Client } = pg
puppeteer.use(StealthPlugin())

async function run() {
  console.log('Подключаемся к базе Neon...')
  const client = new Client({ connectionString: process.env.NEON_DATABASE_URL })
  await client.connect()

  // Ищем те кроссовки, которые все еще висят на битых ссылках StockX
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

  console.log(`Осталось ${rows.length} кроссовок. Меняем тактику: парсим через Bing Images...`)
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  })
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

  for (const row of rows) {
    // Собираем поисковой запрос: Бренд + Название + shoes
    const query = `${row.brand} ${row.name} shoes`
    console.log(`\n🔎 Ищем в обход: ${query}`)

    try {
      // Заходим в поисковик (сервера Microsoft не заблокируют GitHub)
      await page.goto(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' })
      
      const imageUrl = await page.evaluate(() => {
        // Вытаскиваем первую картинку прямо из кэша поисковика (th.bing.com)
        const img = document.querySelector('img.mimg')
        return img ? (img.src || img.getAttribute('data-src')) : null
      })

      if (!imageUrl || !imageUrl.startsWith('http')) {
        console.log(`❌ Картинка не найдена для ${row.id}`)
        continue
      }

      console.log(`  -> Картинка найдена в Bing, качаем...`)
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
      
      const form = new FormData()
      form.append('image', Buffer.from(response.data), 'sneaker.jpg')
      
      console.log(`  -> Заливаем на ImgBB...`)
      const uploadRes = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, form, {
        headers: form.getHeaders()
      })

      const newCleanUrl = uploadRes.data.data.url

      // Записываем новую ссылку в базу
      await client.query('UPDATE sneakers SET image_url = $1 WHERE id = $2', [newCleanUrl, row.id])
      console.log(`  ✅ Успех! Сохранено: ${newCleanUrl}`)
      
    } catch (e) {
      console.error(`  ❌ Ошибка с ID ${row.id}:`, e.message)
    }
    
    // Спим 2 секунды между кроссовками
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  await browser.close()
  await client.end()
  console.log('\n🏁 Цикл завершен. Нажми "Run workflow" еще раз.')
}

run()
