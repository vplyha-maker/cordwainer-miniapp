import { scrapeZottiCategory } from './scrapers/zotti.js';
import { scrapeBashmachnikCategory } from './scrapers/bashmachnik.js';
import { scrapeMasterokCategory } from './scrapers/masterok.js';
import { saveProduct } from './db/saveProduct.js';

// Бронебойный очиститель цены перед записью в БД
function parseScrapedPrice(rawPrice) {
  if (rawPrice === null || rawPrice === undefined || rawPrice === '') return 0;
  
  let s = String(rawPrice).toLowerCase();
  
  // Перехват статуса "Нет в наличии"
  if (s.includes('нет') || s.includes('немає') || s.includes('null')) return 0;

  // Убираем пробелы (включая неразрывные) и меняем запятую на точку
  s = s.replace(/\s+/g, '').replace(',', '.');
  
  // 2. ИСПРАВЛЕНИЕ: Надежный парсинг (только числа и до 2 знаков после точки)
  const match = s.match(/(\d+(?:\.\d{1,2})?)/);
  if (match) {
    const val = parseFloat(match[0]);
    // Защита от случайного парсинга 6-значных артикулов как цены
    if (!isNaN(val) && val > 0 && val < 100000) {
        return val;
    }
  }
  return 0;
}

async function main() {
  console.log('🚀 === Запуск комплексного парсера цен ===');
  console.log('⏰ Время:', new Date().toISOString());

  let totalProducts = 0;

  // 1. ZOTTI
  try {
    console.log('\n--- 📦 Парсинг Zotti ---');
    // 6. ИСПРАВЛЕНИЕ: Предотвращение утечки памяти (отказ от [...zottiHimiya, ...zottiKlei])
    const zottiUrls = [
      { url: '/ua/catalog/cat/himiya', categoryFallback: 'Zotti Каталог' },
      { url: '/ua/catalog/cat/klei', categoryFallback: 'Zotti Каталог' }
    ];
    let zottiTotal = 0;

    for (const item of zottiUrls) {
      const scrapedData = await scrapeZottiCategory(item.url);
      
      // 4. ИСПРАВЛЕНИЕ: Валидация входных данных из скрейпера
      const validProducts = scrapedData.filter(p => p.name && p.url);

      for (const prod of validProducts) {
        // 1. ИСПРАВЛЕНИЕ: Обработка ошибок в цикле сохранения
        try {
          await saveProduct({
            source: 'zotti',
            sourceId: prod.id || prod.url,
            productCode: prod.code,
            name: prod.name,
            url: prod.url,
            imageUrl: prod.imageUrl,
            // 5. ИСПРАВЛЕНИЕ: Обработка null и пустых строк в категории
            category: (prod.category && prod.category.trim()) || item.categoryFallback,
            price: parseScrapedPrice(prod.price)
          });
          zottiTotal++;
        } catch (err) {
          console.error(`❌ Ошибка сохранения товара Zotti ${prod.name}:`, err.message);
        }
      }
    }

    console.log('✅ Zotti всего сохранено: ' + zottiTotal + ' товаров');
    totalProducts += zottiTotal;
  } catch (err) {
    console.error('❌ Ошибка при парсинге Zotti:', err.message);
  }

  // 2. БАШМАЧНИК
  try {
    console.log('\n--- 📦 Парсинг Башмачник ---');
    const bashUrls = [
      '/ua/g5615908-obuvnye-klei',
      '/ua/g5615908-obuvnye-klei/page_2'
    ];
    let bashTotal = 0;

    for (const url of bashUrls) {
      const scrapedData = await scrapeBashmachnikCategory(url);
      const validProducts = scrapedData.filter(p => p.name && p.url);

      for (const prod of validProducts) {
        try {
          await saveProduct({
            source: 'bashmachnik',
            sourceId: prod.id || prod.url,
            productCode: prod.code,
            name: prod.name,
            url: prod.url,
            imageUrl: prod.imageUrl,
            category: (prod.category && prod.category.trim()) || 'Об обувных клеях',
            price: parseScrapedPrice(prod.price)
          });
          bashTotal++;
        } catch (err) {
          console.error(`❌ Ошибка сохранения товара Башмачник ${prod.name}:`, err.message);
        }
      }
    }

    console.log('✅ Башмачник всего сохранено: ' + bashTotal + ' товаров');
    totalProducts += bashTotal;
  } catch (err) {
    console.error('❌ Ошибка при парсинге Башмачника:', err.message);
  }

  // 3. MASTEROK-KEY
  try {
    console.log('\n--- 📦 Парсинг Masterok-Key ---');
    const masterokPaths = [
      '/ua/g6335007-klej-poliuretanovyj-desmokol',
      '/ua/g6335011-klej-polihloroprenovyj-nairit',
      '/ua/g97716198-klei-vodnoj-osnove',
      '/ua/g6334993-klej-rezinovyj',
      '/ua/g7639421-super-klej',
      '/ua/g18971382-prajmery-travilki',
      '/ua/g18971334-rastvoritel-dlya-kleya',
      '/ua/g18971362-zatverditeli-aktivatory-dlya',
    ];

    let masterokTotal = 0;
    for (let i = 0; i < masterokPaths.length; i++) {
      const path = masterokPaths[i];
      
      // 3. ИСПРАВЛЕНИЕ: Timeout ДО следующего scrape (начиная со второго запроса)
      if (i > 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }

      const items = await scrapeMasterokCategory(path);
      const validProducts = items.filter(p => p.name && p.url);
      
      for (const prod of validProducts) {
        try {
          await saveProduct({
            source: 'masterok',
            sourceId: prod.id || prod.url,
            productCode: prod.code,
            name: prod.name,
            url: prod.url,
            imageUrl: prod.imageUrl,
            category: (prod.category && prod.category.trim()) || path,
            price: parseScrapedPrice(prod.price)
          });
          masterokTotal++;
        } catch (err) {
          console.error(`❌ Ошибка сохранения товара Masterok ${prod.name}:`, err.message);
        }
      }
    }
    console.log('✅ Masterok всего сохранено: ' + masterokTotal + ' товаров');
    totalProducts += masterokTotal;
  } catch (err) {
    console.error('❌ Ошибка при парсинге Masterok:', err.message);
  }

  console.log(
    '\n🏁 === ВСЕГО ОБРАБОТАНО И СОХРАНЕНО: ' + totalProducts + ' товаров ==='
  );
}

main();
