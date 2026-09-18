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

// 2. ПАРСИНГ СЫРЬЯ (БРОНЕБОЙНЫЙ ФИЛЬТР SUNSIRS)
async function fetchCommodities(sql) {
  console.log('Сбор данных по сырью (SunSirs Китай)...');
  const results = [];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  const sources = [
    { type: 'isocyanate', url: 'http://www.sunsirs.com/uk/prodetail-447.html', name: 'Изоцианат (MDI)' },
    { type: 'rubber', url: 'http://www.sunsirs.com/uk/prodetail-180.html', name: 'Каучук натуральный' },
    { type: 'latex', url: 'http://www.sunsirs.com/uk/prodetail-180.html', name: 'Латекс (по индексу каучука)' }
  ];

  for (const src of sources) {
    try {
      console.log(`Запрашиваем ${src.name}...`);
      const res = await fetch(src.url, { headers });
      if (!res.ok) throw new Error(`HTTP статус: ${res.status}`);
      const html = await res.text();
      const $ = cheerio.load(html);

      let newValue = NaN;
      // Сканируем весь текст страницы целиком
      const bodyText = $('body').text();

      // Шаг 1: Ищем точную финансовую цену с копейками (например, 14500.00)
      const exactMatches = bodyText.match(/(?:\D|^)(\d{4,5}\.\d{2})(?:\D|$)/g);
      
      if (exactMatches) {
        const cleanMatch = exactMatches[0].replace(/[^\d.]/g, '');
        newValue = parseFloat(cleanMatch);
      } else {
        // Шаг 2: Если копеек нет, ищем целые числа от 4 до 5 знаков
        const allNumbers = bodyText.match(/(?:\D|^)(\d{4,5})(?:\D|$)/g);
        if (allNumbers) {
          const numbers = allNumbers.map(n => Number(n.replace(/\D/g, '')));
          // Отсекаем годы (2024) и номера телефонов. Оставляем только коридор реальных цен сырья.
          const realisticPrices = numbers.filter(n => n >= 5000 && n <= 40000);
          if (realisticPrices.length > 0) {
            newValue = realisticPrices[0];
          }
        }
      }

      if (isNaN(newValue)) {
          throw new Error(`Адекватная цена не найдена в тексте.`);
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
        description: `SunSirs Китай (RMB/ton). Изменение: ${trend > 0 ? '+' : ''}${trend}%`
      });
    } catch (e) {
      console.error(`❌ Ошибка ${src.name}:`, e.message);
    }
  }

  return results;
}

// 3. ПАРСИНГ ФРАХТА (Реальный мировой индекс Drewry WCI)
async function fetchFreightRates(sql) {
  console.log('Сбор данных по фрахту (Drewry World Container Index)...');
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  };

  try {
    const res = await fetch('https://www.drewry.co.uk/trackers-and-indices/latest-trackers-and-indices/world-container-index-assessed-by-drewry', { headers });
    if (!res.ok) throw new Error(`HTTP статус: ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const text = $('body').text();
    const match = text.match(/\$(\d{1,3}(?:,\d{3})*)\s*per\s*40ft/i);
    
    let newValue = NaN;
    if (match) {
      newValue = parseFloat(match[1].replace(/,/g, ''));
    }

    if (isNaN(newValue)) {
      throw new Error('Не удалось найти актуальную цену фрахта на странице Drewry.');
    }

    const lastRecord = await sql`SELECT value FROM macro_indicators WHERE type = 'freight_cn_eu'`;
    let trend = 0;
    
    if (lastRecord.length > 0 && lastRecord[0].value > 0) {
      const oldValue = parseFloat(lastRecord[0].value);
      trend = (((newValue - oldValue) / oldValue) * 100).toFixed(1);
    }

    return {
      type: 'freight_cn_eu',
      value: Number(newValue),
      trend: Number(trend),
      description: `Drewry WCI (Китай -> Европа). Изменение: ${trend > 0 ? '+' : ''}${trend}%`
    };
  } catch (e) {
    console.error('❌ Ошибка сбора фрахта:', e.message);
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
    
    const freight = await fetchFreightRates(sql);
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
