import { scrapeZottiCategory } from './scrapers/zotti.js';
import { scrapeBashmachnikCategory } from './scrapers/bashmachnik.js';
import { scrapeMasterokCategory } from './scrapers/masterok.js';

async function main() {
  console.log('🚀 === Запуск комплексного парсера цен ===');
  console.log('⏰ Время:', new Date().toISOString());

  let totalProducts = 0;

  // 1. ZOTTI
  try {
    console.log('\n--- 📦 Парсинг Zotti ---');
    const zottiHimiya = await scrapeZottiCategory('/ua/catalog/cat/himiya');
    const zottiKlei = await scrapeZottiCategory('/ua/catalog/cat/klei');
    const zottiTotal = zottiHimiya.length + zottiKlei.length;
    console.log(`✅ Zotti всего: ${zottiTotal} товаров`);
    totalProducts += zottiTotal;
  } catch (err) {
    console.error('❌ Ошибка при парсинге Zotti:', err.message);
  }

  // 2. БАШМАЧНИК
  try {
    console.log('\n--- 📦 Парсинг Башмачник ---');
    const bashPage1 = await scrapeBashmachnikCategory('/ua/g5615908-obuvnye-klei');
    const bashPage2 = await scrapeBashmachnikCategory('/ua/g5615908-obuvnye-klei/page_2');
    const bashTotal = bashPage1.length + bashPage2.length;
    console.log(`✅ Башмачник всего: ${bashTotal} товаров`);
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
    for (const path of masterokPaths) {
      const items = await scrapeMasterokCategory(path);
      masterokTotal += items.length;
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log(`✅ Masterok всего: ${masterokTotal} товаров`);
    totalProducts += masterokTotal;
  } catch (err) {
    console.error('❌ Ошибка при парсинге Masterok:', err.message);
  }

  console.log(`\n🏁 === ВСЕГО ОБРАБОТАНО И СОХРАНЕНО: ${totalProducts} товаров ===`);
}

main();
