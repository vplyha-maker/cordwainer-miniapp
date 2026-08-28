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

  // Ищем все элементы, у которых есть ID товара — это 100% карточки
  const $items = $('[data-product-id]');
  
  $items.each((_, el) => {
    const $el = $(el);

    // Ищем название по всем возможным классам Prom.ua
    const name = $el.find('[data-qaid="product_name"], .cs-goods-title, .cs-product-gallery__title, .b-product-line__title').text().trim() || $el.attr('title');
    if (!name) return; // Если названия нет, пропускаем "мусорные" блоки

    // Ищем ссылку на товар
    const $link = $el.find('a[href*="/p"]');
    const relativeUrl = $link.attr('href') || '';
    const fullUrl = relativeUrl.startsWith('http')
      ? relativeUrl
      : `${BASE_URL}${relativeUrl}`;

    // Картинка
    const $img = $el.find('img');
    const imageUrl = $img.attr('data-src') || $img.attr('src') || $img.attr('data-lazy-src');
    const fullImage = imageUrl
      ? imageUrl.startsWith('http')
        ? imageUrl
        : `${BASE_URL}${imageUrl}`
      : null;

    // Цена (ищем по всем возможным классам цены)
    const priceText = $el.find('[data-qaid="product_price"], .cs-goods-price__value, .b-product-cost__price, .cs-goods-price').text();
    const priceClean = priceText
      .replace(/\s/g, '')
      .replace(/[^0-9,.]/g, '')
      .replace(',', '.');
    const price = priceClean ? parseFloat(priceClean) : null;

    const sourceId = $el.attr('data-product-id');

    // Исключаем дубликаты (иногда Prom вкладывает один блок с ID в другой)
    if (!products.some(p => p.sourceId === sourceId)) {
      products.push({
        source: 'bashmachnik',
        sourceId,
        productCode: null,
        name,
        url: fullUrl,
        imageUrl: fullImage,
        category: categoryPath,
        price,
      });
    }
  });

  console.log(`Найдено товаров: ${products.length}`);

  for (const product of products) {
    try {
      await saveProduct(product);
      console.log(`✓ [Башмачник] ${product.name} — ${product.price} грн`);
    } catch (err) {
      console.error(`Ошибка сохранения "${product.name}":`, err.message);
    }
  }

  return products;
}
