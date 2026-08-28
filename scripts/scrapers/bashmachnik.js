import axios from 'axios';
import * as cheerio from 'cheerio';
import { saveProduct } from '../db/saveProduct.js';

const BASE_URL = 'https://bashmachnik.com.ua';

export async function scrapeBashmachnikCategory(categoryPath) {
  const url = `${BASE_URL}${categoryPath}`;
  console.log(`Парсим Башмачник: ${url}`);

  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(html);
  const productsMap = new Map();

  const skipWords = [
    'фотогалерея', 'товари та послуги', 'товары и услуги', 'головна', 'главная', 
    'про нас', 'о нас', 'контакты', 'контакти', 'відгуки', 'отзывы', 'доставка и оплата',
    'корзина', 'кошик', 'каталог'
  ];

  // Ищем ссылки на товары, которые обязательно содержат /p и числовой ID (например /p123456...)
  $('a[href*="/p"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href');
    if (!href || !href.match(/\/p\d+/)) return;

    const cleanHref = href.split('?')[0];
    const fullUrl = cleanHref.startsWith('http') ? cleanHref : `${BASE_URL}${cleanHref}`;
    
    if (productsMap.has(fullUrl)) return;

    // Находим карточку товара
    const $card = $a.closest('div, li, article').length ? $a.closest('div, li, article') : $a.parent();

    let name = $card.find('[data-qaid="product_name"], a[data-qaid="product_name"], h3, h4').first().text().trim();
    if (!name || name.length < 3) {
      name = $a.text().trim();
    }
    
    if (!name || name.length < 3) return;
    
    const lowerName = name.toLowerCase();
    if (lowerName === 'prom.ua' || skipWords.some(word => lowerName.includes(word))) {
      return;
    }

    // Точный поиск цены
    const $priceEl = $card.find('[data-qaid="product_price"], .price, .b-product-cost__price');
    const priceText = $priceEl.length ? $priceEl.text() : $card.text();
    const priceMatch = priceText.match(/(\d[\d\s.,]*)\s*(грн|грн\.|₴)/i);
    
    let price = null;
    if (priceMatch) {
      const clean = priceMatch[1].replace(/\s/g, '').replace(',', '.');
      price = parseFloat(clean);
    }

    const $img = $card.find('img').first();
    const rawImg = $img.attr('data-src') || $img.attr('src');
    let imageUrl = null;
    if (rawImg && !rawImg.includes('data:image')) {
      imageUrl = rawImg.startsWith('http') ? rawImg : `${BASE_URL}${rawImg}`;
    }

    productsMap.set(fullUrl, {
      source: 'bashmachnik',
      sourceId: null,
      productCode: null,
      name,
      url: fullUrl,
      imageUrl,
      category: categoryPath,
      price: isNaN(price) ? null : price,
    });
  });

  const products = Array.from(productsMap.values());
  console.log(`Успешно извлечено уникальных товаров: ${products.length}`);

  for (const product of products) {
    try {
      await saveProduct(product);
      console.log(`✓ ${product.name} — ${product.price ? product.price + ' грн' : 'нет цены'}`);
    } catch (err) {
      console.error(`Ошибка БД для "${product.name}":`, err.message);
    }
  }

  return products;
}
