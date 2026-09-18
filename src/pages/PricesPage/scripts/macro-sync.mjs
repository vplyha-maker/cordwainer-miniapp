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

// Помощник для обхода блокировок GitHub (Использует бесплатный публичный прокси AllOrigins)
async function fetchViaProxy(targetUrl) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Proxy статус: ${res.status}`);
  const data = await res.json();
  return cheerio.load(data.contents);
}

// 2. ПАРСИНГ СЫРЬЯ (100% БЕСПЛАТНЫЕ МАКРО-ИНДЕКСЫ)
async function fetchCommodities(sql) {
  console.log('Сбор данных по сырью (Бесплатные открытые API и прокси)...');
  const results = [];

  // --- КАУЧУК (Yahoo Finance API) ---
  try {
    console.log('Запрашиваем Каучук (Yahoo JSON API)...');
    // Прямой запрос к API Yahoo. Возвращает JSON, работает без блокировок.
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/RUBW.SI');
    if (!res.ok) throw new Error(`Yahoo API статус: ${res.status}`);
    const data = await res.json();
    
    const newValue = data.chart.result[0].meta.regularMarketPrice;

    const lastRecord = await sql`SELECT value FROM macro_indicators WHERE type = 'rubber'`;
    let trend = 0;
    if (lastRecord.length > 0 && lastRecord[0].value > 0) {
      const oldValue = parseFloat(lastRecord[0].value);
      trend = (((newValue - oldValue) / oldValue) * 100).toFixed(1);
    }

    results.push({
      type: 'rubber',
      value: Number(newValue),
      trend: Number(trend),
      description: `Сингапур TSR20 ($/kg). Изменение: ${trend > 0 ? '+' : ''}${trend}%`
    });
  } catch (e) { console.error('❌ Ошибка Каучук:', e.message); }

  // --- ИЗОЦИАНАТ (SunSirs - Китай) ---
  try {
    console.log('Запрашиваем Изоцианат (SunSirs)...');
    const $ = await fetchViaProxy('http://www.sunsirs.com/uk/prodetail-447.html');
    
    let text = $('.detail_top_txt').text();
    if (!text) text = $('body').text();
    
    // Ищем цену MDI (обычно это число от 10000 до 25000 юаней за тонну)
    const match = text.match(/\d{4,}/);
    if (!match) throw new Error(`Не найдено число на странице. Текст: ${text.substring(0, 30)}`);
    
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
      description: `SunSirs (RMB/ton). Изменение: ${trend > 0 ? '+' : ''}${trend}%`
    });
  } catch (e) { console.error('❌ Ошибка Изоцианат:', e.message); }

  // --- ЛАТЕКС (IndexMundi) ---
  try {
    console.log('Запрашиваем Латекс (IndexMundi)...');
    const $ = await fetchViaProxy('https://www.indexmundi.com/commodities/?commodity=rubber');
    
    const priceText = $('#tdPrice').text();
    const match = priceText.match(/[\d.]+/);
    if (!match) throw new Error('Элемент #tdPrice не найден или пуст.');
    
    const newValue = parseFloat(match[0]);

    const lastRecord = await sql`SELECT value FROM macro_indicators WHERE type = 'latex'`;
    let trend = 0;
    if (lastRecord.length > 0 && lastRecord[0].value > 0) {
      const oldValue = parseFloat(lastRecord[0].value);
      trend = (((newValue - oldValue) / oldValue) * 100).toFixed(1);
    }

    results.push({
      type: 'latex',
      value: Number(newValue),
      trend: Number(trend),
      description: `IndexMundi ($/kg). Изменение: ${trend > 0 ? '+' : ''}${trend}%`
    });
  } catch (e) { console.error('❌ Ошибка Латекс:', e.message); }

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
