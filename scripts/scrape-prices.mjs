import { scrapeZottiCategory } from './scrapers/zotti.js';
import { scrapeBashmachnikCategory } from './scrapers/bashmachnik.js';

async function main() {
  console.log('=== Запуск парсера цен ===');
  console.log('Время:', new Date().toISOString());

  try {
    // 1. Парсим Zotti
    const zottiProducts = await scrapeZottiCategory('/ua/catalog/cat/klei');
    console.log(`=== Готово: ${zottiProducts.length} товаров (Zotti) ===\n`);

    // 2. Парсим Башмачник (Страница 1)
    const bashmachnikPage1 = await scrapeBashmachnikCategory('/ua/g5615908-obuvnye-klei');
    
    // 3. Парсим Башмачник (Страница 2)
    const bashmachnikPage2 = await scrapeBashmachnikCategory('/ua/g5615908-obuvnye-klei/page_2');
    
    // Объединяем товары с обеих страниц Башмачника
    const totalBashmachnik = bashmachnikPage1.length + bashmachnikPage2.length;
    console.log(`=== Готово: ${totalBashmachnik} товаров (Bashmachnik) ===\n`);

    const total = zottiProducts.length + totalBashmachnik;
    console.log(`=== Общий итог: спарсено ${total} товаров ===`);
    
  } catch (err) {
    console.error('Критическая ошибка:', err);
    process.exit(1);
  }
}

main();
