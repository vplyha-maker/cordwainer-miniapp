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

  // Генерация стабильного ID
  let stableSourceId = sourceId;
  if (!stableSourceId && url) {
    const m = String(url).match(/\/p(\d+)/i) || String(url).match(/[?&]id=(\d+)/i);
    if (m) stableSourceId = m[1];
  }
  if (!stableSourceId && url) {
    stableSourceId = 'url_' + Buffer.from(String(url)).toString('base64url').slice(0, 32);
  }

  // Проверка на валидность цены перед записью
  const validPrice = (price !== null && price !== undefined && !Number.isNaN(Number(price)) && Number(price) > 0) 
    ? Number(price) 
    : null;

  try {
    // Выполняем INSERT / UPDATE. Добавлено поле current_price!
    const rows = await sql`
      INSERT INTO products (
        source, source_id, product_code, name, url, image_url, category, current_price, updated_at
      )
      VALUES (
        ${source}, 
        ${stableSourceId}, 
        ${productCode ?? null}, 
        ${name}, 
        ${url ?? null}, 
        ${imageUrl ?? null}, 
        ${category ?? null}, 
        ${validPrice}, 
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (source_id)
      DO UPDATE SET
        name          = EXCLUDED.name,
        url           = EXCLUDED.url,
        image_url     = COALESCE(EXCLUDED.image_url, products.image_url),
        category      = COALESCE(EXCLUDED.category, products.category),
        product_code  = COALESCE(EXCLUDED.product_code, products.product_code),
        current_price = EXCLUDED.current_price, -- Обязательно обновляем цену при повторном парсинге
        updated_at    = CURRENT_TIMESTAMP
      RETURNING id;
    `;

    // Neon возвращает массив строк, берем id первого элемента
    const productId = rows[0]?.id;

    // Логика записи истории цен
    if (productId && validPrice !== null) {
      await sql`
        INSERT INTO price_history (product_id, price, currency)
        VALUES (${productId}, ${validPrice}, 'UAH');
      `;
    }

    return productId;
  } catch (error) {
    console.error(`❌ Ошибка сохранения (${name}):`, error.message);
  }
}
