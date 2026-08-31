import axios from 'axios';
import * as cheerio from 'cheerio';
import { saveProduct } from '../db/saveProduct.js';

const BASE_URL = 'https://bashmachnik.com.ua';

const skipWords = [
  'фотогалерея', 'товари та послуги', 'товары и услуги', 'головна', 'главная',
  'про нас', 'о нас', 'контакты', 'контакти', 'відгуки', 'отзывы',
  'доставка и оплата', 'доставка і оплата', 'корзина', 'кошик', 'каталог',
  'prom.ua',
];

function extractPrice(text) {
  if (!text) return null;
  const m = String(text).replace(/\u00a0/g, ' ').match(
    /(\d{1,3}(?:[\s\u00a0]\d{3})*|\d+)([.,]\d{1,2})?\s*(?:грн\.?|₴)/i
  );
  if (!m) return null;
  const intPart = m[1].replace(/[\s\u00a0]/g, '');
  const frac = m[2] ? m[2].replace(',', '.') : '';
  const n = parseFloat(intPart + frac);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function absoluteUrl(href) {
  if (!href || href.startsWith('data:')) return null;
  if (href.startsWith('http')) return href.split('?')[0];
  return `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`.split('?')[0];
}

export async function scrapeBashmachnikCategory(categoryPath) {
  const url = `${BASE_URL}${categoryPath}`;
  console.log(`Парсим Башмачник: ${url}`);

  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'uk-UA,uk;q=0.9,ru;q=0.8',
    },
    timeout: 20000,
  });

  const $ = cheerio.load(html);
  const productsMap = new Map();

  $('a[href*="/p"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href');
    if (!href) return;

    const idMatch = href.match(/\/p(\d+)/i);
    if (!idMatch) return;

    const sourceId = idMatch[1];
    const fullUrl = absoluteUrl(href);
    if (!fullUrl || productsMap.has(fullUrl)) return;

    let $card = $a.closest(
      '[data-qaid="product-block"], [data-qaid="product_block"], .b-product-gallery__item, .product-item, .product-card, li, article'
    );
    if (!$card.length) $card = $a.parent();

    let name =
      $card.find('[data-qaid="product_name"]').first().text().trim() ||
      $card.find('a[data-qaid="product_name"]').first().text().trim() ||
      $a.attr('title') ||
      $a.text().trim() ||
      $card.find('h3, h4, .product-title, .b-product-title').first().text().trim();

    name = (name || '').replace(/\s+/g, ' ').trim();
    if (!name || name.length < 3) return;

    const lower = name.toLowerCase();
    if (skipWords.some((w) => lower.includes(w))) return;

    let price = null;
    const priceSelectors = [
      '[data-qaid="product_price"]',
      '[data-qaid="price"]',
      '.b-product-cost__price',
      '.price',
      '.product-price',
      '.cs-goods-price__value',
    ];
    for (const sel of priceSelectors) {
      const t = $card.find(sel).first().text();
      price = extractPrice(t);
      if (price) break;
    }
    if (!price) {
      price = extractPrice($card.text());
    }

    const $img = $card.find('img').first();
    const rawImg =
      $img.attr('data-src') ||
      $img.attr('data-original') ||
      $img.attr('src');
    let imageUrl = absoluteUrl(rawImg);
    if (imageUrl && imageUrl.includes('data:image')) imageUrl = null;

    productsMap.set(fullUrl, {
      source: 'bashmachnik',
      sourceId,
      productCode: null,
      name,
      url: fullUrl,
      imageUrl,
      category: categoryPath,
      price,
    });
  });

  const products = Array.from(productsMap.values());
  console.log(`Успешно извлечено уникальных товаров: ${products.length}`);

  let withPrice = 0;
  for (const product of products) {
    try {
      await saveProduct(product);
      if (product.price) withPrice++;
      console.log(
        `✓ ${product.name.slice(0, 60)} — ${product.price ? product.price + ' грн' : 'нет цены'} [id=${product.sourceId}]`
      );
    } catch (err) {
      console.error(`Ошибка БД для "${product.name}":`, err.message);
    }
  }

  console.log(`С ценой: ${withPrice} / ${products.length}`);
  return products;
}
