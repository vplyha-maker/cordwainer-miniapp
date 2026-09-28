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

  // Ищем кроссовки, у которых картинки всё еще со StockX
  const { rows } = await client.query(`
    SELECT id, image_url FROM sneakers 
    WHERE image_url LIKE '%stockx.com%' 
    LIMIT 20
  `)

  if (rows.length === 0) {
    console.log('Все картинки уже обновлены!')
    await client.end()
    return
  }

  console.log(`Найдено ${rows.length} ссылок StockX. Запускаем браузер-шпион...`)
  
  // Запускаем Chrome с флагами для серверов GitHub
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  })
  
  const page = await browser.newPage()

  for (const row of rows) {
    try {
      console.log(`Обрабатываем ID: ${row.id}...`)
      
      // Идем на StockX
      const response = await page.goto(row.image_url, { waitUntil: 'networkidle2' })
      const buffer = await response.buffer()

      // Заливаем на ImgBB
      const form = new FormData()
      form.append('image', buffer, 'sneaker.jpg')
      
      const uploadRes = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, form, {
        headers: form.getHeaders()
      })

      const newCleanUrl = uploadRes.data.data.url

      // Перезаписываем ссылку в твоей базе Neon
      await client.query('UPDATE sneakers SET image_url = $1 WHERE id = $2', [newCleanUrl, row.id])
      console.log(`Успех! Новая ссылка: ${newCleanUrl}`)
      
    } catch (e) {
      console.error(`Ошибка с ID ${row.id}:`, e.message)
    }
  }

  await browser.close()
  await client.end()
  console.log('Готово!')
}

run()
