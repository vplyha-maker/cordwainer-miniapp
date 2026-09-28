import pg from 'pg'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import axios from 'axios'
import FormData from 'form-data'

const { Client } = pg
puppeteer.use(StealthPlugin())

// Функция для случайной паузы (имитация человека от 3 до 6 секунд)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const randomDelay = () => delay(Math.floor(Math.random() * (6000 - 3000 + 1) + 3000))

async function run() {
  console.log('Подключаемся к базе Neon...')
  const client = new Client({ connectionString: process.env.NEON_DATABASE_URL })
  await client.connect()

  // Ищем кроссовки
  const { rows } = await client.query(`
    SELECT id, image_url FROM sneakers 
    WHERE image_url LIKE '%stockx.com%' 
    LIMIT 10
  `)

  if (rows.length === 0) {
    console.log('Все картинки уже обновлены!')
    await client.end()
    return
  }

  console.log(`Найдено ${rows.length} ссылок StockX. Запускаем браузер-шпион...`)
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  })
  
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

  for (const row of rows) {
    try {
      console.log(`Обрабатываем ID: ${row.id}...`)
      
      const response = await page.goto(row.image_url, { waitUntil: 'networkidle2', timeout: 30000 })
      
      // Проверяем, картинка ли это
      const contentType = response.headers()['content-type']
      if (!contentType || !contentType.startsWith('image/')) {
        console.log(`❌ Cloudflare выдал капчу для ${row.id}. Пропускаем, попробуем в следующем запуске.`)
        await randomDelay()
        continue
      }

      const buffer = await response.buffer()
      const form = new FormData()
      form.append('image', buffer, 'sneaker.jpg')
      
      const uploadRes = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, form, {
        headers: form.getHeaders()
      })

      const newCleanUrl = uploadRes.data.data.url

      await client.query('UPDATE sneakers SET image_url = $1 WHERE id = $2', [newCleanUrl, row.id])
      console.log(`✅ Успех! Новая ссылка: ${newCleanUrl}`)
      
    } catch (e) {
      console.error(`❌ Ошибка с ID ${row.id}:`, e.message)
    }
    
    console.log('Спим несколько секунд, чтобы не злить Cloudflare...')
    await randomDelay()
  }

  await browser.close()
  await client.end()
  console.log('Готово! Жми "Run workflow" еще раз, чтобы обработать следующую партию.')
}

run()
