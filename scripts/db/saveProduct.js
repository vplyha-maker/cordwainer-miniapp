
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

  // source_id обязателен для корректного UPSERT.
  // Если его нет — берём стабильный ключ из URL.
  let stableSourceId = sourceId;
  if (!stableSourceId && url) {
    const m = String(url).match(/\/p(\d+)/i) || String(url).match(/[?&]id=(\d+)/i);
    if (m) stableSourceId = m[1];
  }
  if (!stableSourceId && url) {
    // последний запасной вариант — хеш URL (чтобы не плодить дубли)
    stableSourceId = 'url_' + Buffer.from(String(url)).toString('base64url').slice(0, 32);
  }

  // Используем db.get, так как нам нужна одна возвращаемая строка (RETURNING id)
  const row = await db.get(`
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
  `, [
    source,
    stableSourceId,
    productCode ?? null,
    name,
    url ?? null,
    imageUrl ?? null,
    category ?? null
  ]);

  const productId = row.id;

  if (price !== null && price !== undefined && !Number.isNaN(Number(price)) && Number(price) > 0) {
    // Здесь db.run, так как нам не нужно возвращать данные из price_history
    await db.run(`
      INSERT INTO price_history (product_id, price, currency)
      VALUES (?, ?, 'UAH')
    `, [
      productId, 
      Number(price)
    ]);
  }

  return productId;
}
