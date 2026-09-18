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
  // Надежные источники по логистике и цепочкам поставок
  const feeds = [
    'https://www.supplychaindive.com/feeds/news/'
  ];

  const keywords = ['strike', 'shortage', 'delay', 'disruption', 'tariff', 'забастовка', 'дефицит'];
  let alertCount = 0;
  let latestAlertTitle = '';
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000; // за последние 7 дней

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

// 2. ПАРСИНГ СЫРЬЯ (Полиуретан, Изоцианат, Каучук)
async function fetchCommodities() {
  console.log('Сбор данных по сырью...');
  const results = [];
  
  // В будущем замените url и selector на реальные сайты доноров
  const sources = [
    { type: 'isocyanate', url: 'https://example.com/iso', selector: '.price', name: 'Изоцианат' },
    { type: 'rubber', url: 'https://example.com/rubber', selector: '.price', name: 'Каучук' },
    { type: 'latex', url: 'https://example.com/latex', selector: '.price', name: 'Латекс' }
  ];

  for (const src of sources) {
    try {
      // Здесь будет логика cheerio для реальных сайтов
      // const res = await fetch(src.url);
      // const html = await res.text();
      // const $ = cheerio.load(html);
      // const value = parseFloat($(src.selector).text().replace(/[^\d.]/g, '')) || 0;
      
      // Временная имитация данных, чтобы интерфейс начал работать:
      const value = 100 + Math.floor(Math.random() * 20); 
      // Имитируем тренд от -15% до +20%
      const trend = (Math.random() * 35 - 15).toFixed(1); 

      results.push({
        type: src.type,
        value: Number(value),
        trend: Number(trend),
        description: `Индекс: ${src.name}. Изменение: ${trend}%`
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
    // Временная имитация цены за контейнер
    const value = 4200 + Math.floor(Math.random() * 800); 
    const trend = (Math.random() * 10 - 3).toFixed(1);

    return {
      type: 'freight_cn_eu',
      value: Number(value),
      trend: Number(trend),
      description: `Ставка фрахта (CN->EU): $${value}. Изменение: ${trend}%`
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

    const commodities = await fetchCommodities();
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
      console.log(`✅ Обновлен: ${item.type} | Тренд: ${item.trend}%`);
    }

    console.log('🎉 Все макро-данные успешно обновлены!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

run();

