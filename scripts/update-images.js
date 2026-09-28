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

  console.log(`Осталось ${rows.length} кроссовок. Запускаем мульти-прокси с Base64...`)
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  })
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

  for (const row of rows) {
    console.log(`\n👟 Обрабатываем ID: ${row.id}`)
    
    let rawUrl = row.image_url.replace('http://', 'https://').split('?')[0]
    
    // Арсенал обхода
    const hackUrls = [
      `${rawUrl}?fit=fill&bg=FFFFFF&w=700&h=500&auto=format,compress&q=90&trim=color`,
      `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`,
      `https://res.cloudinary.com/demo/image/fetch/q_auto,f_auto/${rawUrl}`
    ]

    let successBuffer = null

    for (let i = 0; i < hackUrls.length; i++) {
      try {
        console.log(`  -> Пробуем метод ${i + 1}/4...`)
        const response = await page.goto(hackUrls[i], { waitUntil: 'networkidle2', timeout: 15000 })
        const contentType = response.headers()['content-type']
        
        if (contentType && contentType.startsWith('image/')) {
          const buffer = await response.buffer()
          if (buffer.length > 1000) {
            successBuffer = buffer
            console.log(`  ✅ Картинка успешно получена методом ${i + 1}!`)
            break
          }
        }
      } catch (err) {
        // Пробуем следующий метод
      }
    }

    if (!successBuffer) {
      console.log(`  ❌ Все методы провалились для ${row.id}`)
      continue
    }

    try {
      console.log(`  -> Конвертируем в Base64 и заливаем на ImgBB...`)
      const base64Data = successBuffer.toString('base64')
      
      const form = new URLSearchParams()
      form.append('image', base64Data)

      const uploadRes = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, form.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      const newCleanUrl = uploadRes.data.data.url

      await client.query('UPDATE sneakers SET image_url = $1 WHERE id = $2', [newCleanUrl, row.id])
      console.log(`  ✅ Сохранено в БД: ${newCleanUrl}`)
      
    } catch (e) {
      console.error(`  ❌ Ошибка загрузки на ImgBB:`, e.message)
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  await browser.close()
  await client.end()
  console.log('\n🏁 Готово! Жми "Run workflow" еще раз, пока не закончатся все кроссовки.')
}

run()
