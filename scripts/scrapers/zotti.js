
import axios from 'axios';
import * as cheerio from 'cheerio';
import { saveProduct } from '../db/saveProduct.js';

const BASE_URL = 'https://zotti.ua';

export async function scrapeZottiCategory(categoryPath) {
  var start = 0;
  var hasMore = true;
  var allProducts = [];
  var limit = 20;

  var cleanPath = categoryPath.split('?')[0];
  if (cleanPath.charAt(0) !== '/') {
    cleanPath = '/' + cleanPath;
  }

  while (hasMore) {
    var url = BASE_URL + cleanPath;
    if (start > 0) {
      url = url + '?start=' + start;
    }

    console.log('Парсим Zotti: ' + url);

    try {
      var response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7',
        },
        timeout: 15000,
      });

      var $ = cheerio.load(response.data);
      var products = [];

      $('.list-product_item').each(function (_, el) {
        var $el = $(el);

        var name = $el.find('h3.title').text().trim();
        if (!name) return;

        var relativeUrl = $el.find('a.link-product').attr('href') || '';
        var fullUrl = relativeUrl.indexOf('http') === 0
          ? relativeUrl
          : BASE_URL + relativeUrl;

        var imageUrl = $el.find('.thumb img').attr('src');
        var fullImage = null;
        if (imageUrl) {
          fullImage =
            imageUrl.indexOf('http') === 0 ? imageUrl : BASE_URL + imageUrl;
        }

        var priceText = $el
          .find('.price_summ')
          .text()
          .replace(/\s/g, '')
          .replace(/\u00a0/g, '')
          .replace('грн.', '')
          .replace('грн', '')
          .replace(',', '.');
        var price = priceText ? parseFloat(priceText) : null;
        var safePrice =
          price !== null && isFinite(price) && price > 0 ? price : null;

        var productCode =
          $el.find('.item-footer .cell').last().text().trim() || null;

        var sourceId = $el.find('form input[name="id"]').attr('value') || null;
        if (!sourceId) {
          var onClickAttr = $el.find('button[onclick]').attr('onclick');
          if (onClickAttr) {
            var match = onClickAttr.match(/buy\((\d+)\)/);
            if (match) sourceId = match[1];
          }
        }
        if (!sourceId && fullUrl) {
          var m = fullUrl.match(/\/(\d+)\/?$/);
          if (m) sourceId = m[1];
        }

        products.push({
          source: 'zotti',
          sourceId: sourceId,
          productCode: productCode,
          name: name,
          url: fullUrl,
          imageUrl: fullImage,
          category: cleanPath,
          price: safePrice,
        });
      });

      if (products.length === 0) {
        hasMore = false;
        console.log('Zotti: товары закончились');
      } else {
        console.log('Zotti: найдено ' + products.length);

        for (var i = 0; i < products.length; i++) {
          try {
            await saveProduct(products[i]);
          } catch (err) {
            console.error(
              'Ошибка сохранения "' + products[i].name + '":',
              err.message
            );
          }
        }

        allProducts = allProducts.concat(products);
        start = start + limit;
        await new Promise(function (r) {
          setTimeout(r, 1000);
        });
      }
    } catch (err) {
      console.error('Ошибка Zotti ' + url + ':', err.message);
      hasMore = false;
    }
  }

  return allProducts;
}
