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
  
  // Ищем первое адекватное число
  const match = s.match(/\d+(\.\d+)?/);
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
    const zottiHimiya = await scrapeZottiCategory('/ua/catalog/cat/himiya');
    const zottiKlei = await scrapeZottiCategory('/ua/catalog/cat/klei');
    
    const zottiProducts = [...zottiHimiya, ...zottiKlei];

    for (const prod of zottiProducts) {
      await saveProduct({
        source: 'zotti',
        sourceId: prod.id || prod.url,
        productCode: prod.code,
        name: prod.name,
        url: prod.url,
        imageUrl: prod.imageUrl,
        category: prod.category || 'Zotti Каталог',
        price: parseScrapedPrice(prod.price) // <-- ОЧИСТКА ЗДЕСЬ
      });
    }

    console.log('✅ Zotti всего сохранено: ' + zottiProducts.length + ' товаров');
    totalProducts += zottiProducts.length;
  } catch (err) {
    console.error('❌ Ошибка при парсинге Zotti:', err.message);
  }

  // 2. БАШМАЧНИК
  try {
    console.log('\n--- 📦 Парсинг Башмачник ---');
    const bashPage1 = await scrapeBashmachnikCategory('/ua/g5615908-obuvnye-klei');
    const bashPage2 = await scrapeBashmachnikCategory(
      '/ua/g5615908-obuvnye-klei/page_2'
    );
    
    const bashProducts = [...bashPage1, ...bashPage2];

    for (const prod of bashProducts) {
      await saveProduct({
        source: 'bashmachnik',
        sourceId: prod.id || prod.url,
        productCode: prod.code,
        name: prod.name,
        url: prod.url,
        imageUrl: prod.imageUrl,
        category: prod.category || 'Об обувных клеях',
        price: parseScrapedPrice(prod.price) // <-- ОЧИСТКА ЗДЕСЬ
      });
    }

    console.log('✅ Башмачник всего сохранено: ' + bashProducts.length + ' товаров');
    totalProducts += bashProducts.length;
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
    for (const path of masterokPaths) {
      const items = await scrapeMasterokCategory(path);
      
      for (const prod of items) {
        await saveProduct({
          source: 'masterok',
          sourceId: prod.id || prod.url,
          productCode: prod.code,
          name: prod.name,
          url: prod.url,
          imageUrl: prod.imageUrl,
          category: prod.category || path,
          price: parseScrapedPrice(prod.price) // <-- ОЧИСТКА ЗДЕСЬ
        });
      }

      masterokTotal += items.length;
      await new Promise((r) => setTimeout(r, 1000));
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
