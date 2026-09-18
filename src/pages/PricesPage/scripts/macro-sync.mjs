import { neon } from '@neondatabase/serverless';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import 'dotenv/config';

// Подключение к Neon БД (URL берется из переменных окружения)
const sql = neon(process.env.DATABASE_URL);
const rssParser = new Parser();

// 1. ПАРСИНГ НОВОСТЕЙ (Лента RSS по логистике)
async function fetchNewsAlerts() {
  console.log('Сбор новостей из RSS...');
  const feeds = [
    'https://www.supplychaindive.com/feeds/news/'
  ];

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
          const hasAlert = keywords.some(kw => text.includes(kw));
          if (hasAlert) {
            alertCount++;
            if (!latestAlertTitle) latestAlertTitle = item.title;
          }
        }
      }
    } catch (e) {
      console.error(`Ошибка чтения RSS (${feedUrl}):`, e.message);
    }
  }

  const trend = Math.min(alertCount * 10, 100);
  const description = alertCount > 0 
    ? `Тревожных новостей о логистике: ${alertCount}. Последняя: "${latestAlertTitle}"`
    : 'Новостной фон спокойный, сбоев поставок не замечено.';

  return { type: 'news_alert', value: alertCount, trend, description };
}

// 2. ПАРСИНГ СЫРЬЯ (ALIBABA через ScraperAPI)
async function fetchCommodities(sql) {
  console.log('Сбор данных по сырью с Alibaba (через API-обходчик)...');
  const results = [];
  
  const apiKey = process.env.SCRAPER_API_KEY;
  if (!apiKey) {
    console.error('❌ Ошибка: Не задана переменная SCRAPER_API_KEY');
    return [];
  }

  // Расширенные селекторы для поиска цен
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
      // Добавлен параметр country_code=US для более стабильной выдачи
      const scraperUrl = `http://api.scraperapi.com/?api_key=${apiKey}&url=${targetUrl}&render=true&country_code=US`;

      const res = await fetch(scraperUrl);
      if (!res.ok) throw new Error(`ScraperAPI вернул статус: ${res.status}`);

      const html = await res.text();
      const $ = cheerio.load(html);
      
      // Пытаемся найти текст по нашим расширенным селекторам
      const rawText = $(src.selector).first().text().trim();
      
      // Ищем первое совпадение с цифрами (цена)
      const match = rawText.match(/[\d.]+/);
      const newValue = match ? parseFloat(match[0]) : NaN;
      
      if (isNaN(newValue)) {
        // Если цена не найдена, выводим кусок HTML (title страницы), чтобы понять, не капча ли это
        const pageTitle = $('title').text();
        throw new Error(`Цена не найдена. Title страницы: "${pageTitle}". Найденный текст: "${rawText.substring(0, 30)}"`);
      }

      // Запрашиваем предыдущую цену из БД для расчета тренда
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
      console.error(`Ошибка сбора сырья (${src.type}):`, e.message);
    }
  }
  return results;
}

// 3. ПАРСИНГ ФРАХТА (Логистика Китай -> Европа)
async function fetchFreightRates() {
  console.log('Сбор данных по фрахту...');
  try {
    // Пока оставляем имитацию. Позже можно подключить API Freightos или аналогичный парсер.
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

// ОСНОВНАЯ ФУНКЦИЯ СИНХРОНИЗАЦИИ
async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Ошибка: Не задана переменная DATABASE_URL');
    process.exit(1);
  }

  try {
    const indicators = [];
    
    const news = await fetchNewsAlerts();
    indicators.push(news);

    // Передаем объект sql в функцию для расчета тренда
    const commodities = await fetchCommodities(sql);
    indicators.push(...commodities);

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
