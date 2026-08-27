import { scrapeZottiCategory } from './scrapers/zotti.js';

async function main() {
  console.log('=== Запуск парсера цен ===');
  console.log('Время:', new Date().toISOString());

  try {
    const products = await scrapeZottiCategory('/ua/catalog/cat/klei');
    console.log(`=== Готово: ${products.length} товаров (Zotti) ===`);
  } catch (err) {
    console.error('Критическая ошибка:', err);
    process.exit(1);
  }
}

main();
