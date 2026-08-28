import axios from 'axios';
import * as cheerio from 'cheerio';
import { saveProduct } from '../db/saveProduct.js';

const BASE_URL = 'https://bashmachnik.com.ua';

export async function scrapeBashmachnikCategory(categoryPath) {
  const url = `${BASE_URL}${categoryPath}`;
  console.log(`Парсим: ${url}`);

  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(html);
  const products = [];

  // Диагностика: проверяем, сколько всего элементов div на странице
  const totalDivs = $('div').length;
  console.log(`Всего блоков div на странице: ${totalDivs}`);

  // На Prom.ua карточки товаров обернуты в блоки с атрибутом data-qaid="product_block"
  $('[data-qaid="product_block"]').each((_, el) => {
    const $el = $(el);

    const name = $el.find('[data-qaid="product_name"]').text().trim();
    if (!name) return;

    const relativeUrl = $el.find('[data-qaid="product_link"]').attr('href') || '';
    const fullUrl = relativeUrl.startsWith('http')
      ? relativeUrl
      : `${BASE_URL}${relativeUrl}`;

    // На Prom.ua изображения часто подгружаются лениво (lazy load), 
    // поэтому проверяем и data-src, и обычный src
    const $img = $el.find('img');
    const imageUrl = $img.attr('data-src') || $img.attr('src') || $img.attr('data-lazy-src');
    const fullImage = imageUrl
      ? imageUrl.startsWith('http')
        ? imageUrl
        : `${BASE_URL}${imageUrl}`
      : null;

    // Очистка цены (убираем пробелы, "₴", меняем запятую на точку)
    const priceText = $el.find('[data-qaid="product_price"]').text();
    const priceClean = priceText
      .replace(/\s/g, '')
      .replace(/[^0-9,.]/g, '') // Оставляем только цифры, точки и запятые
      .replace(',', '.');
    const price = priceClean ? parseFloat(priceClean) : null;

    // ID товара на проме обычно зашит в атрибуте data-product-id
    const sourceId = $el.attr('data-product-id') || null;

    products.push({
      source: 'bashmachnik',
      sourceId,
      productCode: null, // Артикулы в списке товаров Prom.ua обычно не выводятся
      name,
      url: fullUrl,
      imageUrl: fullImage,
      category: categoryPath,
      price,
    });
  });

  console.log(`Найдено товаров: ${products.length}`);

  for (const product of products) {
    try {
      await saveProduct(product);
      console.log(`✓ ${product.name} — ${product.price} грн`);
    } catch (err) {
      console.error(`Ошибка сохранения "${product.name}":`, err.message);
    }
  }

  return products;
}
