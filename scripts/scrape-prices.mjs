import { scrapeZottiCategory } from './scrapers/zotti.js';
import { scrapeBashmachnikCategory } from './scrapers/bashmachnik.js';
import { scrapeMasterokCategory } from './scrapers/masterok.js';

async function main() {
  console.log('=== Запуск комплексного парсера цен ===');
  console.log('Время:', new Date().toISOString());
  var totalProducts = 0;

  // 1. ZOTTI (Химия + Клей)
  try {
    console.log('\n--- 📦 Парсинг Zotti ---');
    const zottiHimiya = await scrapeZottiCategory('/ua/catalog/cat/himiya');
    const zottiKlei = await scrapeZottiCategory('/ua/catalog/cat/klei');
    const zottiTotal = zottiHimiya.length + zottiKlei.length;
    console.log(`✅ Zotti всего: ${zottiTotal} товаров`);
    totalProducts += zottiTotal;
  } catch (err) {
    console.error('Ошибка Zotti:', err.message);
  }

  // 2. БАШМАЧНИК (Клеи, Страницы 1 и 2)
  try {
    console.log('\n--- 📦 Парсинг Башмачник ---');
    const bashPage1 = await scrapeBashmachnikCategory('/ua/g5615908-obuvnye-klei');
    const bashPage2 = await scrapeBashmachnikCategory('/ua/g5615908-obuvnye-klei/page_2');
    const bashTotal = bashPage1.length + bashPage2.length;
    console.log(`✅ Башмачник всего: ${bashTotal} товаров`);
    totalProducts += bashTotal;
  } catch (err) {
    console.error('Ошибка Башмачник:', err.message);
  }

  console.log(`\n🏁 === ВСЕГО ОБРАБОТАНО И СОХРАНЕНО: ${totalProducts} товаров ===`);
}

main();
