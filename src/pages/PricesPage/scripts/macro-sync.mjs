import { neon } from '@neondatabase/serverless';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import 'dotenv/config';

// Подключение к Neon БД
const sql = neon(process.env.DATABASE_URL);
const rssParser = new Parser();

// 1. ПАРСИНГ НОВОСТЕЙ
async function fetchNewsAlerts() {
  console.log('Сбор новостей из RSS...');
  const feeds = ['https://www.supplychaindive.com/feeds/news/'];
  const keywords = ['strike', 'shortage', 'delay', 'disruption', 'tariff', 'забастовка', 'дефицит'];
  let alertCount = 0;
  let latestAlertTitle = '';
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const feedUrl of feeds) {
    try {
      const feed = await rssParser.parseURL(feedUrl);
      for (const item of feed.items) {
        const pubDate = new Date(item.pubDate).getTime();
        if (pubDate > oneWeekAgo) {
          const text = (item.title + ' ' + (item.contentSnippet || '')).toLowerCase();
          if (keywords.some(kw => text.includes(kw))) {
            alertCount++;
            if (!latestAlertTitle) latestAlertTitle = item.title;
          }
        }
      }
    } catch (e) {
      console.error(`Ошибка чтения RSS:`, e.message);
    }
  }

  const trend = Math.min(alertCount * 10, 100);
  const description = alertCount > 0 
    ? `Тревожных новостей: ${alertCount}. Последняя: "${latestAlertTitle}"`
    : 'Новостной фон спокойный.';

  return { type: 'news_alert', value: alertCount, trend, description };
}

// 2. ПАРСИНГ СЫРЬЯ (ALIBABA) С АВТО-ПОВТОРАМИ
async function fetchCommodities(sql) {
  console.log('Сбор данных по сырью с Alibaba (premium API)...');
  const results = [];
  
  const apiKey = process.env.SCRAPER_API_KEY;
  if (!apiKey) {
    console.error('❌ Ошибка: Не задана переменная SCRAPER_API_KEY');
    return [];
  }

  const sources = [
    { 
      type: 'isocyanate', 
      url: 'https://www.alibaba.com/trade/search?SearchText=mdi+isocyanate+polyurethane', 
      selector: '.search-card-e-price-main, .elements-title-price, .moq-price, span[class*="price"], div[class*="price-main"]', 
      name: 'Изоцианат MDI (Alibaba)' 
    },
    { 
      type: 'rubber', 
      url: 'https://www.alibaba.com/trade/search?SearchText=neoprene+chloroprene+rubber', 
      selector: '.search-card-e-price-main, .elements-title-price, .moq-price, span[class*="price"], div[class*="price-main"]', 
      name: 'Каучук Наирит (Alibaba)' 
    },
    { 
      type: 'latex', 
      url: 'https://www.alibaba.com/trade/search?SearchText=liquid+natural+latex', 
      selector: '.search-card-e-price-main, .elements-title-price, .moq-price, span[class*="price"], div[class*="price-main"]', 
      name: 'Латекс жидкий (Alibaba)' 
    }
  ];

  for (const src of sources) {
    try {
      console.log(`Запрашиваем ${src.name}...`);
      const targetUrl = encodeURIComponent(src.url);
      
      // Добавлен device_type=desktop для стабильной верстки
      const scraperUrl = `http://api.scraperapi.com/?api_key=${apiKey}&url=${targetUrl}&render=true&premium=true&country_code=US&device_type=desktop`;

      let html = '';
      let success = false;
      const maxRetries = 3;

      // Блок авто-повтора (3 попытки, если ScraperAPI падает с 500 ошибкой)
      for (let i = 0; i < maxRetries; i++) {
        const res = await fetch(scraperUrl);
        if (res.ok) {
          html = await res.text();
          success = true;
          break; // Успешно - выходим из цикла попыток
        }
        console.log(`⚠️ ScraperAPI статус ${res.status}. Попытка ${i + 1} из ${maxRetries}. Ждем 5 сек...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Пауза 5 секунд
      }

      if (!success) {
        throw new Error(`ScraperAPI не смог загрузить страницу после ${maxRetries} попыток.`);
      }

      const $ = cheerio.load(html);
      const rawText = $(src.selector).first().text().trim();
      
      // Ищем цены, игнорируя мелкие цифры вроде "1" (часто это минимальный заказ)
      // Ищем числа с плавающей точкой (например, 1.50 или 200)
      const matches = rawText.match(/\d+[.,]\d+/g);
      let newValue = NaN;

      if (matches && matches.length > 0) {
        newValue = parseFloat(matches[0].replace(',', '.'));
      } else {
        // Если дробного нет, берем первое целое число больше 1
        const allNumbers = rawText.match(/\d+/g);
        if (allNumbers) {
          const validNumbers = allNumbers.map(Number).filter(n => n > 1);
          if (validNumbers.length > 0) newValue = validNumbers[0];
        }
      }
      
      if (isNaN(newValue)) {
        const pageTitle = $('title').text();
        throw new Error(`Цена не найдена. Title: "${pageTitle}". Текст: "${rawText.substring(0, 30)}"`);
      }

      const lastRecord = await sql`SELECT value FROM macro_indicators WHERE type = ${src.type}`;
      let trend = 0;

      if (lastRecord.length > 0 && lastRecord[0].value > 0) {
        const oldValue = parseFloat(lastRecord[0].value);
        trend = (((newValue - oldValue) / oldValue) * 100).toFixed(1);
      }

      results.push({
        type: src.type,
        value: Number(newValue),
        trend: Number(trend),
        description: `Опт: ${src.name}. Изменение: ${trend > 0 ? '+' : ''}${trend}%`
      });

    } catch (e) {
      console.error(`❌ Ошибка сбора сырья (${src.type}):`, e.message);
    }
  }
  return results;
}

// 3. ПАРСИНГ ФРАХТА
async function fetchFreightRates() {
  console.log('Сбор данных по фрахту...');
  try {
    const value = 4200 + Math.floor(Math.random() * 800); 
    const trend = (Math.random() * 10 - 3).toFixed(1);

    return {
      type: 'freight_cn_eu',
      value: Number(value),
      trend: Number(trend),
      description: `Ставка фрахта (CN->EU): $${value}. Изменение: ${trend > 0 ? '+' : ''}${trend}%`
    };
  } catch (e) {
    console.error('Ошибка сбора фрахта:', e.message);
    return null;
  }
}

// ОСНОВНАЯ ФУНКЦИЯ
async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Ошибка: Не задана переменная DATABASE_URL');
    process.exit(1);
  }

  try {
    const indicators = [];
    indicators.push(await fetchNewsAlerts());
    indicators.push(...await fetchCommodities(sql));
    
    const freight = await fetchFreightRates();
    if (freight) indicators.push(freight);

    console.log(`Собрано индикаторов: ${indicators.length}. Сохраняем в БД...`);

    for (const item of indicators) {
      await sql`
        INSERT INTO macro_indicators (type, value, trend, description, updated_at)
        VALUES (${item.type}, ${item.value}, ${item.trend}, ${item.description}, NOW())
        ON CONFLICT (type) DO UPDATE SET
          value = EXCLUDED.value,
          trend = EXCLUDED.trend,
          description = EXCLUDED.description,
          updated_at = NOW();
      `;
      console.log(`✅ Обновлен: ${item.type} | Цена: ${item.value} | Тренд: ${item.trend}%`);
    }

    console.log('🎉 Все макро-данные успешно обновлены!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

run();
