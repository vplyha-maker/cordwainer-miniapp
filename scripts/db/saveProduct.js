import { db } from './client.js';

export async function saveProduct(product) {
  const {
    source,
    sourceId,
    productCode,
    name,
    url,
    imageUrl,
    category,
    price,
  } = product;

  let stableSourceId = sourceId;
  if (!stableSourceId && url) {
    const m = String(url).match(/\/p(\d+)/i) || String(url).match(/[?&]id=(\d+)/i);
    if (m) stableSourceId = m[1];
  }
  if (!stableSourceId && url) {
    stableSourceId = 'url_' + Buffer.from(String(url)).toString('base64url').slice(0, 32);
  }

  let row;
  const sql = `
    INSERT INTO products (
      source, source_id, product_code, name, url, image_url, category, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT (source, source_id)
    DO UPDATE SET
      name        = EXCLUDED.name,
      url         = EXCLUDED.url,
      image_url   = COALESCE(EXCLUDED.image_url, products.image_url),
      category    = COALESCE(EXCLUDED.category, products.category),
      product_code = COALESCE(EXCLUDED.product_code, products.product_code),
      updated_at  = CURRENT_TIMESTAMP
    RETURNING id
  `;

  const params = [
    source,
    stableSourceId,
    productCode ?? null,
    name,
    url ?? null,
    imageUrl ?? null,
    category ?? null
  ];

  if (typeof db.get === 'function') {
    row = await db.get(sql, params);
  } else if (typeof db.prepare === 'function') {
    row = db.prepare(sql).get(...params);
  } else {
    throw new Error('Не найден подходящий метод выполнения запроса в объекте db');
  }

  const productId = row?.id;

  if (productId && price !== null && price !== undefined && !Number.isNaN(Number(price)) && Number(price) > 0) {
    const priceSql = `
      INSERT INTO price_history (product_id, price, currency)
      VALUES (?, ?, 'UAH')
    `;
    const priceParams = [productId, Number(price)];

    if (typeof db.run === 'function') {
      await db.run(priceSql, priceParams);
    } else if (typeof db.prepare === 'function') {
      db.prepare(priceSql).run(...priceParams);
    }
  }

  return productId;
}
