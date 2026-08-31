import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as cheerio from 'cheerio';
import { saveProduct } from '../db/saveProduct.js';

const execAsync = promisify(exec);
const BASE_URL = 'https://masterok-key.com.ua';

async function fetchWithCurl(url) {
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  
  // Выполняем запрос через системный curl прямо из терминала
  const command = `curl -s -L -A "${userAgent}" -H "Accept-Language: uk-UA,uk;q=0.9,ru;q=0.8" "${url}"`;

  const { stdout } = await execAsync(command, { maxBuffer: 15 * 1024 * 1024 });
  return stdout;
}

function absoluteUrl(href) {
  if (!href || href.startsWith('data:')) return null;
  if (href.startsWith('http')) return href.split('?')[0];
  return BASE_URL + (href.startsWith('/') ? '' : '/') + href.split('?')[0];
}

function parsePrice(val) {
  if (val == null || val === '') return null;
  const n = parseFloat(String(val).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractFromJsonLd($, categoryPath) {
  const map = new Map();

  $('script[type="application/ld+json"]').each((_, el) => {
    let data;
    try {
      data = JSON.parse($(el).html() || '');
    } catch {
      return;
    }

    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      if (!item || item['@type'] !== 'Product') continue;

      const name = (item.name || '').trim();
      if (!name || name.length < 3) continue;

      const offer = item.offers || {};
      const price = parsePrice(offer.price);
      const relUrl = offer.url || item.url || '';
      const fullUrl = absoluteUrl(relUrl);
      if (!fullUrl) continue;

      const idMatch = fullUrl.match(/\/p(\d+)/i);
      const sourceId = idMatch ? idMatch[1] : null;
      if (!sourceId) continue;

      const imageUrl = absoluteUrl(
        Array.isArray(item.image) ? item.image[0] : item.image
      );
      const productCode = item.sku ? String(item.sku).trim() : null;

      map.set(fullUrl, {
        source: 'masterok',
        sourceId,
        productCode,
        name,
        url: fullUrl,
        imageUrl,
        category: categoryPath,
        price,
      });
    }
  });

  return map;
}

function extractFromBlocks($, categoryPath, existingMap) {
  const map = existingMap || new Map();

  $('[data-qaid="product-block"]').each((_, el) => {
    const $card = $(el);
    const productId =
      $card.attr('data-product-id') ||
      $card.attr('data-advtracking-product-id');

    const $link = $card
      .find('a.cs-goods-title, a.cs-image-holder__image-link')
      .first();
    const href = $link.attr('href');
    const fullUrl = absoluteUrl(href);
    if (!fullUrl || map.has(fullUrl)) return;

    const idMatch = fullUrl.match(/\/p(\d+)/i);
    const sourceId = productId || (idMatch ? idMatch[1] : null);
    if (!sourceId) return;

    let name =
      $card.find('a.cs-goods-title').first().text().trim() ||
      $link.attr('title') ||
      $card.find('img').attr('alt') ||
      '';
    name = name.replace(/\s+/g, ' ').trim();
    if (!name || name.length < 3) return;

    const priceText =
      $card
        .find('.cs-goods-price__value_type_current, .cs-goods-price__value')
        .first()
        .text() ||
      $card.find('[data-qaid="product_price"]').first().text() ||
      '';
    const priceMatch = priceText.replace(/\u00a0/g, ' ').match(/(\d[\d\s.,]*)/);
    let price = null;
    if (priceMatch) {
      price = parsePrice(priceMatch[1].replace(/\s/g, '').replace(',', '.'));
    }

    const rawImg = $card.find('img').first().attr('src');
    const imageUrl = absoluteUrl(rawImg);

    const skuText = $card
      .find('.cs-goods-sku')
      .first()
      .text()
      .replace(/код:?/i, '')
      .trim();
    const productCode = skuText || null;

    map.set(fullUrl, {
      source: 'masterok',
      sourceId: String(sourceId),
      productCode,
      name,
      url: fullUrl,
      imageUrl,
      category: categoryPath,
      price,
    });
  });

  return map;
}

export async function scrapeMasterokCategory(categoryPath) {
  const pagesToTry = [categoryPath];
  if (!categoryPath.includes('page')) {
    pagesToTry.push(categoryPath + '/page_2');
  }

  const allMap = new Map();

  for (const path of pagesToTry) {
    const url = path.startsWith('http') ? path : BASE_URL + path;
    console.log('Парсим Masterok (curl): ' + url);

    try {
      const html = await fetchWithCurl(url);

      const $ = cheerio.load(html);
      const fromLd = extractFromJsonLd($, categoryPath);
      const merged = extractFromBlocks($, categoryPath, fromLd);

      if (merged.size === 0 && path !== categoryPath) break;

      for (const [k, v] of merged) {
        if (!allMap.has(k)) allMap.set(k, v);
      }

      if (path === categoryPath && merged.size < 10) break;

      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      if (path !== categoryPath) break;
      console.error('Ошибка Masterok ' + url + ':', err.message);
      break;
    }
  }

  const products = Array.from(allMap.values());
  console.log('Masterok [' + categoryPath + ']: ' + products.length + ' товаров');

  let withPrice = 0;
  for (const product of products) {
    try {
      await saveProduct(product);
      if (product.price) withPrice++;
      console.log(
        '✓ ' +
          product.name.slice(0, 55) +
          ' — ' +
          (product.price ? product.price + ' грн' : 'нет цены') +
          ' [id=' +
          product.sourceId +
          ']'
      );
    } catch (err) {
      console.error('Ошибка БД "' + product.name + '":', err.message);
    }
  }

  console.log('С ценой: ' + withPrice + ' / ' + products.length);
  return products;
}
