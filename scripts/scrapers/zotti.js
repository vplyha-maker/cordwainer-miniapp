import axios from 'axios';
import * as cheerio from 'cheerio';
import { saveProduct } from '../db/saveProduct.js';

const BASE_URL = 'https://zotti.ua';

export async function scrapeZottiCategory(categoryPath) {
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

  $('.list-product_item').each((_, el) => {
    const $el = $(el);

    const name = $el.find('h3.title').text().trim();
    if (!name) return;

    const relativeUrl = $el.find('a.link-product').attr('href') || '';
    const fullUrl = relativeUrl.startsWith('http')
      ? relativeUrl
      : `${BASE_URL}${relativeUrl}`;

    const imageUrl = $el.find('.thumb img').attr('src');
    const fullImage = imageUrl
      ? imageUrl.startsWith('http')
        ? imageUrl
        : `${BASE_URL}${imageUrl}`
      : null;

    const priceText = $el
      .find('.price_summ')
      .text()
      .replace(/\s/g, '')
      .replace('грн.', '')
      .replace(',', '.');
    const price = priceText ? parseFloat(priceText) : null;

    const productCode =
      $el.find('.item-footer .cell').last().text().trim() || null;

    const sourceId =
      $el.find('form input[name="id"]').attr('value') ||
      $el.find('button[onclick]').attr('onclick')?.match(/buy\((\d+)\)/)?.[1] ||
      null;

    products.push({
      source: 'zotti',
      sourceId,
      productCode,
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
