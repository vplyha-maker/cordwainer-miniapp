import axios from 'axios';
import * as cheerio from 'cheerio';
import { saveProduct } from '../db/saveProduct.js';

const BASE_URL = 'https://zotti.ua';

export async function scrapeZottiCategory(categoryPath) {
  let start = 0;
  let hasMore = true;
  const allProducts = [];
  const limit = 20;

  let cleanPath = categoryPath.split('?')[0];
  if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }

  while (hasMore) {
    const url = `${BASE_URL}${cleanPath}${start > 0 ? `?start=${start}` : ''}`;
    console.log(`\n🔍 Парсим страницу: ${url}`);

    try {
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

        let sourceId = $el.find('form input[name="id"]').attr('value') || null;
        if (!sourceId) {
          const onClickAttr = $el.find('button[onclick]').attr('onclick');
          if (onClickAttr) {
            const match = onClickAttr.match(/buy\((\d+)\)/);
            if (match) sourceId = match[1];
          }
        }

        products.push({
          source: 'zotti',
          sourceId,
          productCode,
          name,
          url: fullUrl,
          imageUrl: fullImage,
          category: cleanPath,
          price,
        });
      });

      if (products.length === 0) {
        hasMore = false;
        console.log('🛑 Товары на странице закончились. Переход остановлен.');
      } else {
        console.log(`📦 Найдено товаров на странице: ${products.length}`);

        for (const product of products) {
          try {
            await saveProduct(product);
          } catch (err) {
            console.error(`❌ Ошибка сохранения "${product.name}":`, err.message);
          }
        }

        allProducts.push(...products);
        start += limit;
        
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.error(`❌ Ошибка при запросе ${url}:`, err.message);
      hasMore = false;
    }
  }

  return allProducts;
}
