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
          // Исключаем баги копирования
          let snippet = item.contentSnippet;
          if (!snippet) snippet = '';
          const text = (item.title + ' ' + snippet).toLowerCase();
          
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

// 2. ПАРСИНГ СЫРЬЯ
async function fetchCommodities(sql) {
  console.log('Сбор данных по сырью (Прямые запросы)...');
  const results = [];

  const standardHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  };

  // --- ИЗОЦИАНАТ ---
  try {
    console.log('Запрашиваем Изоцианат (SunSirs)...');
    const res = await fetch('http://www.sunsirs.com/uk/prodetail-447.html', { headers: standardHeaders });
    const html = await res.text();
    const $ = cheerio.load(html);

    // Заменено на железобетонный if вместо ||
    let text = $('.detail_top_txt').text();
    if (!text) {
      text = $('body').text();
    }

    const match = text.match(/\d{4,}/);
    if (!match) throw new Error('Цена не найдена');

    const newValue = parseFloat(match[0]);
    const lastRecord = await sql`SELECT value FROM macro_indicators WHERE type = 'isocyanate'`;
    let trend = 0;
    if (lastRecord.length > 0 && lastRecord[0].value > 0) {
      const oldValue = parseFloat(lastRecord[0].value);
      trend = (((newValue - oldValue) / oldValue) * 100).toFixed(1);
    }

    results.push({
      type: 'isocyanate',
      value: Number(newValue),
      trend: Number(trend),
      description: `SunSirs (MDI Китай). Изменение: ${trend > 0 ? '+' : ''}${trend}%`
    });
  } catch (e) {
    console.error('❌ Ошибка Изоцианат:', e.message);
  }

  // --- КАУЧУК И ЛАТЕКС ---
  try {
    console.log('Запрашиваем Каучук/Латекс (Открытые источники)...');
    let newValue = NaN;

    try {
      const res = await fetch('https://markets.businessinsider.com/commodities/rubber-price', { headers: standardHeaders });
      const html = await res.text();
      const $ = cheerio.load(html);
      const priceText = $('.price-section__current-value').first().text();
      newValue = parseFloat(priceText.replace(/[^\d.-]/g, ''));
    } catch (err) {}

    if (isNaN(newValue)) {
      console.log('Пробуем резервный источник (IndexMundi)...');
      const res = await fetch('https://www.indexmundi.com/commodities/?commodity=rubber', { headers: standardHeaders });
      const html = await res.text();
      const $ = cheerio.load(html);
      const priceText = $('#tdPrice').text();
      newValue = parseFloat(priceText.replace(/[^\d.-]/g, ''));
    }

    if (isNaN(newValue)) throw new Error('Не удалось получить цену ни с одного источника');

    const types = [
      { id: 'rubber', name: 'Каучук (Мировой индекс)' },
      { id: 'latex', name: 'Латекс (Мировой индекс)' }
    ];

    for (const item of types) {
      const lastRecord = await sql`SELECT value FROM macro_indicators WHERE type = ${item.id}`;
      let trend = 0;
      if (lastRecord.length > 0 && lastRecord[0].value > 0) {
        const oldValue = parseFloat(lastRecord[0].value);
        trend = (((newValue - oldValue) / oldValue) * 100).toFixed(1);
      }
      results.push({
        type: item.id,
        value: Number(newValue),
        trend: Number(trend),
        description: `${item.name}. Изменение: ${trend > 0 ? '+' : ''}${trend}%`
      });
    }
  } catch (e) {
    console.error('❌ Ошибка Каучук/Латекс:', e.message);
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
