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


// 2. ПАРСИНГ СЫРЬЯ (SunSirs)
async function fetchCommodities(sql) {
  console.log('Сбор данных по сырью (SunSirs Китай)...');
  const results = [];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  const sources = [
    { type: 'isocyanate', url: 'https://www.sunsirs.com/uk/prodetail-975.html', name: 'Изоцианат (MDI)' },
    { type: 'rubber',     url: 'https://www.sunsirs.com/uk/prodetail-586.html', name: 'Каучук натуральный' },
    // latex — дублируем каучук (отдельной страницы нет)
    { type: 'latex',      url: 'https://www.sunsirs.com/uk/prodetail-586.html', name: 'Латекс (по индексу каучука)' },
  ];

  for (const src of sources) {
    try {
      console.log(`Запрашиваем ${src.name}...`);
      const res = await fetch(src.url, { headers });
      if (!res.ok) throw new Error(`HTTP статус: ${res.status}`);
      const html = await res.text();
      const $ = cheerio.load(html);

      let newValue = NaN;

      // 1. Ищем в таблице цен (самый надёжный способ)
      // Формат: | Commodity | Sectors | Price | Date |
      //          | MDI       | Chemical| 18366.67 | 2026-09-18 |
      const priceCell = $('table td').filter((_, el) => {
        const t = $(el).text().trim();
        return /^\d{4,5}(?:\.\d{1,2})?$/.test(t);
      }).first();

      if (priceCell.length) {
        newValue = parseFloat(priceCell.text().trim());
      }

      // 2. Fallback — ищем по всему тексту числа вида 18366.67 или 18366
      if (isNaN(newValue)) {
        const bodyText = $('body').text();
        const match = bodyText.match(/(?:\D|^)(\d{4,5}\.\d{1,2})(?:\D|$)/);
        if (match) {
          newValue = parseFloat(match[1]);
        } else {
          const allNumbers = bodyText.match(/(?:\D|^)(\d{4,5})(?:\D|$)/g) || [];
          const realistic = allNumbers
            .map(n => Number(n.replace(/\D/g, '')))
            .filter(n => n >= 8000 && n <= 30000); // актуальный коридор цен
          if (realistic.length > 0) newValue = realistic[0];
        }
      }

      if (isNaN(newValue)) {
        throw new Error(`Адекватная цена не найдена в тексте.`);
      }

      const lastRecord = await sql`SELECT value FROM macro_indicators WHERE type = ${src.type}`;
      let trend = 0;
      if (lastRecord.length > 0 && lastRecord[0].value > 0) {
        const oldValue = parseFloat(lastRecord[0].value);
        trend = Number((((newValue - oldValue) / oldValue) * 100).toFixed(1));
      }

      results.push({
        type: src.type,
        value: Number(newValue),
        trend: Number(trend),
        description: `SunSirs Китай (RMB/ton). Изменение: \( {trend > 0 ? '+' : ''} \){trend}%`
      });
    } catch (e) {
      console.error(`❌ Ошибка ${src.name}:`, e.message);
    }
  }

  return results;
 }

// 3. ФРАХТ через OilPriceAPI (Drewry WCI)
async function fetchFreightRates(sql) {
  console.log('Сбор данных по фрахту (OilPriceAPI → Drewry WCI)...');

  const apiKey = process.env.OILPRICE_API_KEY;
  if (!apiKey) {
    console.error('❌ Не задана переменная OILPRICE_API_KEY');
    return null;
  }

  try {
    const res = await fetch(
      'https://api.oilpriceapi.com/v1/prices/latest?by_code=DREWRY_WCI_USD',
      {
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const json = await res.json();
    
    // Структура ответа: { status: "success", data: { price: 4500, ... } }
    const newValue = Number(json?.data?.price ?? json?.price);
    
    if (isNaN(newValue) || newValue <= 0) {
      throw new Error(`Некорректная цена из API: ${JSON.stringify(json)}`);
    }

    const lastRecord = await sql`
      SELECT value FROM macro_indicators WHERE type = 'freight_cn_eu'
    `;
    
    let trend = 0;
    if (lastRecord.length > 0 && lastRecord[0].value > 0) {
      const oldValue = parseFloat(lastRecord[0].value);
      trend = Number((((newValue - oldValue) / oldValue) * 100).toFixed(1));
    }

    return {
      type: 'freight_cn_eu',
      value: newValue,
      trend,
      description: `Drewry WCI (OilPriceAPI). Изменение: \( {trend > 0 ? '+' : ''} \){trend}%`
    };
  } catch (e) {
    console.error('❌ Ошибка сбора фрахта (API):', e.message);
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
