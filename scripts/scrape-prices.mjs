import { scrapeZottiCategory } from './scrapers/zotti.js';
import { scrapeBashmachnikCategory } from './scrapers/bashmachnik.js'; // Добавляем импорт

async function main() {
  console.log('=== Запуск парсера цен ===');
  console.log('Время:', new Date().toISOString());

  try {
    // 1. Парсим Zotti
    const zottiProducts = await scrapeZottiCategory('/ua/catalog/cat/klei');
    console.log(`=== Готово: ${zottiProducts.length} товаров (Zotti) ===\n`);

    // 2. Парсим Башмачник (ссылка на категорию обувных клеев)
    const bashmachnikProducts = await scrapeBashmachnikCategory('/g12630560-obuvnye-klei');
    console.log(`=== Готово: ${bashmachnikProducts.length} товаров (Bashmachnik) ===\n`);

    const total = zottiProducts.length + bashmachnikProducts.length;
    console.log(`=== Общий итог: спарсено ${total} товаров ===`);
    
  } catch (err) {
    console.error('Критическая ошибка:', err);
    process.exit(1);
  }
}

main();
