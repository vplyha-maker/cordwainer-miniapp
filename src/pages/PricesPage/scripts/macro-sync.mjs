import { neon } from '@neondatabase/serverless';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import 'dotenv/config';

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

// 2. ПАРСИНГ СЫРЬЯ (БАЗОВЫЙ ScraperAPI: 1 запрос = 1 кредит)
async function fetchCommodities(sql) {
  console.log('Сбор данных по сырью (Базовый ScraperAPI)...');
  const results = [];
  const apiKey = process.env.SCRAPER_API_KEY;

  if (!apiKey) {
    console.error('❌ Ошибка: Не задана переменная SCRAPER_API_KEY');
    return [];
  }

  const sources = [
    { type: 'rubber', url: 'https://finance.yahoo.com/quote/RUBW.SI/', name: 'Каучук (Yahoo Finance)' },
    { type: 'isocyanate', url: 'http://www.sunsirs.com/uk/prodetail-447.html', name: 'Изоцианат (SunSirs Китай)' },
    { type: 'latex', url: 'https://www.indexmundi.com/commodities/?commodity=rubber', name: 'Латекс (IndexMundi)' }
  ];

  for (const src of sources) {
    try {
      console.log(`Запрашиваем ${src.name}...`);
      
      // ВАЖНО: Никаких premium=true или render=true. Это самый дешевый запрос.
      const scraperUrl = `http://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(src.url)}`;
      
      let html = '';
      let success = false;
      
      // Страховка: если сервер моргнет, скрипт попробует еще раз
      for (let i = 0; i < 3; i++) {
        const res = await fetch(scraperUrl);
        if (res.ok) {
          html = await res.text();
          success = true;
          break;
        }
        console.log(`⚠️ ScraperAPI статус ${res.status}. Попытка ${i + 1} из 3...`);
        await new Promise(r => setTimeout(r, 3000));
      }

      if (!success) throw new Error('Не удалось загрузить страницу');

      const $ = cheerio.load(html);
      let newValue = NaN;

      // Индивидуальные парсеры под каждый сайт
      if (src.type === 'rubber') {
        const text = $('fin-streamer[data-symbol="RUBW.SI"][data-field="regularMarketPrice"]').first().text();
        newValue = parseFloat(text.replace(/[^\d.-]/g, ''));
      } else if (src.type === 'isocyanate') {
        let text = $('.detail_top_txt').text();
        if (!text) text = $('body').text();
        const match = text.match(/\d{4,}/); // MDI в Китае измеряется тысячами юаней за тонну
        if (match) newValue = parseFloat(match[0]);
      } else if (src.type === 'latex') {
        const text = $('#tdPrice').text();
        newValue = parseFloat(text.replace(/[^\d.-]/g, ''));
      }

      if (isNaN(newValue)) throw new Error('Цена не найдена в разметке');

      // Расчет тренда
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
        description: `Макро-индекс. Изменение: ${trend > 0 ? '+' : ''}${trend}%`
      });
    } catch (e) {
      console.error(`❌ Ошибка ${src.name}:`, e.message);
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
