import { neon } from '@neondatabase/serverless';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import 'dotenv/config';

// Подключение к Neon БД
const sql = neon(process.env.DATABASE_URL);

// 1. ПАРСИНГ НОВОСТЕЙ (UA + EN)
async function fetchNewsAlerts() {
  console.log('Сбор новостей из RSS...');

  const feeds = [
    'https://www.pravda.com.ua/rss/',
    'https://nv.ua/rss/all.xml',
    'https://rss.unian.net/site/news_ukr.rss',
    'https://www.ukrinform.ua/rss/block-lastnews',
    'https://www.supplychaindive.com/feeds/news/',
  ];

  const keywords = [
  // Логістика / транспорт
  'логістик', 'логистик',
  'контейнер', 'фрахт', 'перевезен', 'перевізник',
  'порт', 'термінал', 'митниц', 'митн',
  'залізниц', 'укрзаліз', 'вагон', 'локомотив',
  'автотранспорт', 'фура', 'вантажівк',

  // Постачання / ланцюги
  'постачан', 'supply', 'ланцюг поставок', 'supply chain',
  'експорт', 'імпорт', 'транзит',
  'склад', 'дефіцит', 'нестача', 'зрив поставок',

  // Затримки / блокування
  'затримк', 'затримка', 'блокада', 'перекрит',
  'черга на кордоні', 'кордон', 'простій',

  // Тарифи / ціни перевезень
  'тариф', 'ставка фрахту', 'вартість доставки',
  'подорожчан', 'здешевлен',

  // Англійські (Supply Chain Dive тощо)
  'logistics', 'freight', 'container', 'shipping',
  'port', 'terminal', 'customs', 'tariff',
  'shortage', 'delay', 'disruption', 'supply chain',
  'rail', 'truck', 'cargo', 'export', 'import',
];

  const matchedTitles = [];
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const parser = new Parser({
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
    timeout: 15000,
  });

  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);

      for (const item of feed.items) {
        const pubDate = item.pubDate ? new Date(item.pubDate).getTime() : 0;
        if (pubDate && pubDate < oneWeekAgo) continue;

        const title = (item.title || '').trim();
        if (!title) continue;

        const snippet = item.contentSnippet || item.content || '';
        const text = (title + ' ' + snippet).toLowerCase();

        if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
          // уникаємо дублікатів
          if (!matchedTitles.includes(title)) {
            matchedTitles.push(title);
          }
        }
      }
    } catch (e) {
      console.error(`Ошибка чтения RSS (${feedUrl}):`, e.message);
    }
  }

  const alertCount = matchedTitles.length;
  const trend = Math.min(alertCount * 10, 100);

  // Беремо перші 10 новин для стрічки (можна змінити на matchedTitles без slice, якщо хочеш усі)
  const topTitles = matchedTitles.slice(0, 10);
  const titlesText = topTitles.length
    ? topTitles.join('  ·  ')
    : 'Новинний фон спокійний';

  const description =
    alertCount > 0
      ? `Тривожних новин: ${alertCount}  ·  ${titlesText}`
      : 'Новинний фон спокійний.';

  return {
    type: 'news_alert',
    value: alertCount,
    trend,
    description,
  };
}

// 2. ПАРСИНГ СЫРЬЯ (SunSirs) — ОТКЛЮЧЕНО, але функція залишається
async function fetchCommodities(db) {
  console.log('Сбор данных по сырью (SunSirs Китай)...');
  const results = [];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  const sources = [
    { type: 'isocyanate', url: 'https://www.sunsirs.com/uk/prodetail-975.html', name: 'Изоцианат (MDI)' },
    { type: 'rubber',     url: 'https://www.sunsirs.com/uk/prodetail-586.html', name: 'Каучук натуральный' },
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

      const priceCell = $('table td').filter((_, el) => {
        const t = $(el).text().trim();
        return /^\d{4,5}(?:\.\d{1,2})?$/.test(t);
      }).first();

      if (priceCell.length) {
        newValue = parseFloat(priceCell.text().trim());
      }

      if (isNaN(newValue)) {
        const bodyText = $('body').text();
        const match = bodyText.match(/(?:\D|^)(\d{4,5}\.\d{1,2})(?:\D|$)/);
        if (match) {
          newValue = parseFloat(match[1]);
        } else {
          const allNumbers = bodyText.match(/(?:\D|^)(\d{4,5})(?:\D|$)/g) || [];
          const realistic = allNumbers
            .map(n => Number(n.replace(/\D/g, '')))
            .filter(n => n >= 8000 && n <= 30000);
          if (realistic.length > 0) newValue = realistic[0];
        }
      }

      if (isNaN(newValue)) {
        throw new Error(`Адекватная цена не найдена в тексте.`);
      }

      const lastRecord = await db`SELECT value FROM macro_indicators WHERE type = ${src.type}`;
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
async function fetchFreightRates(db) {
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
    const newValue = Number(json?.data?.price ?? json?.price);

    if (isNaN(newValue) || newValue <= 0) {
      throw new Error(`Некорректная цена из API: ${JSON.stringify(json)}`);
    }

    const lastRecord = await db`
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

    // 1. Новости
    indicators.push(await fetchNewsAlerts());

    // 2. Сырьё — ОТКЛЮЧЕНО
    // indicators.push(...await fetchCommodities(sql));

    // 3. Фрахт
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
      console.log(`✅ Обновлен: ${item.type} | Значение: ${item.value} | Тренд: ${item.trend}%`);
    }

    console.log('🎉 Все макро-данные успешно обновлены!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

run();
