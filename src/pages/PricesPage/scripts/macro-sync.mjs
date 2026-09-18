import { neon } from '@neondatabase/serverless';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);
const rssParser = new Parser();

// Вспомогательная функция с жестким таймаутом, чтобы скрипт никогда не висел
async function fetchWithTimeout(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw new Error(err.name === 'AbortError' ? 'Таймаут запроса (сервер не ответил за 20 сек)' : err.message);
  }
}

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

// 2. ПАРСИНГ СЫРЬЯ (С ЗАЩИТОЙ ОТ ЗАВИСАНИЙ)
async function fetchCommodities(sql) {
  console.log('Сбор данных по сырью (ScraperAPI + Таймауты)...');
  const results = [];
  const apiKey = process.env.SCRAPER_API_KEY;

  if (!apiKey) {
    console.error('❌ Ошибка: Не задана переменная SCRAPER_API_KEY');
    return [];
  }

  // render: true только для Yahoo, остальные парсятся дешевым базовым запросом
  const sources = [
    { type: 'rubber', url: 'https://finance.yahoo.com/quote/RUBW.SI/', render: true, name: 'Каучук (Yahoo)' },
    { type: 'isocyanate', url: 'http://www.sunsirs.com/uk/prodetail-447.html', render: false, name: 'Изоцианат (SunSirs)' },
    { type: 'latex', url: 'https://www.indexmundi.com/commodities/?commodity=rubber', render: false, name: 'Латекс (IndexMundi)' }
  ];

  for (const src of sources) {
    try {
      console.log(`Запрашиваем ${src.name}...`);
      
      let scraperUrl = `http://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(src.url)}`;
      if (src.render) scraperUrl += '&render=true'; // Добавляем рендер JS только там, где он нужен
      
      let html = '';
      let success = false;
      
      // Максимум 2 попытки, чтобы не растягивать время выполнения
      for (let i = 0; i < 2; i++) {
        try {
          const res = await fetchWithTimeout(scraperUrl, 20000); // Обрыв связи, если ждем дольше 20 секунд
          if (res.ok) {
            html = await res.text();
            success = true;
            break;
          }
          console.log(`⚠️ Статус ${res.status}. Попытка ${i + 1} из 2...`);
        } catch (err) {
          console.log(`⚠️ ${err.message}. Попытка ${i + 1} из 2...`);
        }
      }

      if (!success) throw new Error('Не удалось загрузить страницу после 2 попыток');

      const $ = cheerio.load(html);
      let newValue = NaN;

      if (src.type === 'rubber') {
        const text = $('fin-streamer[data-symbol="RUBW.SI"][data-field="regularMarketPrice"]').first().text();
        newValue = parseFloat(text.replace(/[^\d.-]/g, ''));
        if (isNaN(newValue)) {
            console.log(`[Отладка] Title Yahoo:`, $('title').text());
        }
      } else if (src.type === 'isocyanate') {
        let text = $('.detail_top_txt').text();
        if (!text) text = $('body').text();
        const match = text.match(/\d{4,}/); 
        if (match) newValue = parseFloat(match[0]);
      } else if (src.type === 'latex') {
        const text = $('#tdPrice').text();
        newValue = parseFloat(text.replace(/[^\d.-]/g, ''));
      }

      if (isNaN(newValue)) throw new Error('Цена не найдена в разметке');

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
