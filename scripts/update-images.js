import pg from 'pg'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import axios from 'axios'
import FormData from 'form-data'

const { Client } = pg
puppeteer.use(StealthPlugin())

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const randomDelay = () => delay(Math.floor(Math.random() * (4000 - 2000 + 1) + 2000))

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

  console.log(`Осталось ${rows.length} упрямых ссылок StockX. Применяем мульти-прокси...`)
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  })
  
  const page = await browser.newPage()
  // Ставим реалистичный User-Agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

  for (const row of rows) {
    console.log(`\n👟 Пробуем пробить ID: ${row.id}`)
    
    let rawUrl = row.image_url.replace('http://', 'https://').split('?')[0]
    
    // Арсенал ссылок для обхода
    const hackUrls = [
      `${rawUrl}?fit=fill&bg=FFFFFF&w=700&h=500&auto=format,compress&q=90&trim=color`, // 1. Нативные параметры StockX (вытягивают из кэша)
      `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}`,                             // 2. Мощный публичный CDN
      `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`,               // 3. Открытый прокси AllOrigins
      `https://res.cloudinary.com/demo/image/fetch/q_auto,f_auto/${rawUrl}`             // 4. Трастовый IP Cloudinary
    ]

    let successBuffer = null;

    for (let i = 0; i < hackUrls.length; i++) {
      try {
        console.log(`  -> Попытка ${i + 1}/${hackUrls.length}...`)
        const response = await page.goto(hackUrls[i], { waitUntil: 'networkidle2', timeout: 15000 })
        
        const contentType = response.headers()['content-type']
        
        // Проверяем, действительно ли это картинка (а не HTML/капча)
        if (contentType && contentType.startsWith('image/')) {
          const buffer = await response.buffer()
          // Защита от пикселя-заглушки (обычно весит меньше 1000 байт)
          if (buffer.length > 1000) {
            successBuffer = buffer
            console.log(`  ✅ Картинка получена через метод ${i + 1}!`)
            break; // Выходим из цикла перебора, картинка есть!
          }
        }
      } catch (err) {
        // Ошибка таймаута или защиты, молча пробуем следующий URL
      }
    }

    if (!successBuffer) {
      console.log(`  ❌ Все 4 метода провалились для ${row.id}. Cloudflare победил в этом раунде.`)
      await randomDelay()
      continue // Переходим к следующим кроссовкам
    }

    try {
      console.log(`  -> Загружаем на ImgBB...`)
      const form = new FormData()
      form.append('image', successBuffer, 'sneaker.jpg')
      
      const uploadRes = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, form, {
        headers: form.getHeaders()
      })

      const newCleanUrl = uploadRes.data.data.url

      await client.query('UPDATE sneakers SET image_url = $1 WHERE id = $2', [newCleanUrl, row.id])
      console.log(`  ✅ Успех! Сохранено в БД: ${newCleanUrl}`)
    } catch (e) {
      console.error(`  ❌ Ошибка загрузки на ImgBB:`, e.message)
    }
    
    await randomDelay()
  }

  await browser.close()
  await client.end()
  console.log('\n🏁 Цикл завершен. Нажми "Run workflow" еще раз для проверки.')
}

run()
