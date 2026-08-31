import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

export async function saveProduct(product) {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Ошибка: DATABASE_URL не найден в .env');
    return;
  }

  const sql = neon(process.env.DATABASE_URL);

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

  // Твоя логика генерации стабильного ID
  let stableSourceId = sourceId;
  if (!stableSourceId && url) {
    const m = String(url).match(/\/p(\d+)/i) || String(url).match(/[?&]id=(\d+)/i);
    if (m) stableSourceId = m[1];
  }
  if (!stableSourceId && url) {
    stableSourceId = 'url_' + Buffer.from(String(url)).toString('base64url').slice(0, 32);
  }

  try {
    // Выполняем INSERT / UPDATE в таблицу products. 
    // Используем ON CONFLICT (source_id), так как мы только что создали для него UNIQUE ограничение.
    const rows = await sql`
      INSERT INTO products (
        source, source_id, product_code, name, url, image_url, category, updated_at
      )
      VALUES (
        ${source}, 
        ${stableSourceId}, 
        ${productCode ?? null}, 
        ${name}, 
        ${url ?? null}, 
        ${imageUrl ?? null}, 
        ${category ?? null}, 
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (source_id)
      DO UPDATE SET
        name         = EXCLUDED.name,
        url          = EXCLUDED.url,
        image_url    = COALESCE(EXCLUDED.image_url, products.image_url),
        category     = COALESCE(EXCLUDED.category, products.category),
        product_code = COALESCE(EXCLUDED.product_code, products.product_code),
        updated_at   = CURRENT_TIMESTAMP
      RETURNING id;
    `;

    // Neon возвращает массив строк, берем id первого элемента
    const productId = rows[0]?.id;

    // Твоя логика записи истории цен
    if (productId && price !== null && price !== undefined && !Number.isNaN(Number(price)) && Number(price) > 0) {
      await sql`
        INSERT INTO price_history (product_id, price, currency)
        VALUES (${productId}, ${Number(price)}, 'UAH');
      `;
    }

    return productId;
  } catch (error) {
    console.error(`❌ Ошибка сохранения (${name}):`, error.message);
  }
}
