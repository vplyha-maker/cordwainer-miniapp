import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

export async function saveProductsBatch(products) {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Ошибка: DATABASE_URL не найден в .env');
    return;
  }
  if (!products || products.length === 0) return;

  const sql = neon(process.env.DATABASE_URL);

  // 1. Применяем вашу логику генерации ID и очистки к каждому товару в пакете
  const formattedProducts = products.map((product) => {
    let stableSourceId = product.sourceId;
    if (!stableSourceId && product.url) {
      const m = String(product.url).match(/\/p(\d+)/i) || String(product.url).match(/[?&]id=(\d+)/i);
      if (m) stableSourceId = m[1];
    }
    if (!stableSourceId && product.url) {
      stableSourceId = 'url_' + Buffer.from(String(product.url)).toString('base64url').slice(0, 32);
    }

    const validPrice = (
      product.price !== null && 
      product.price !== undefined && 
      !Number.isNaN(Number(product.price)) && 
      Number(product.price) > 0
    ) ? Number(product.price) : null;

    return {
      source: product.source,
      source_id: stableSourceId,
      product_code: product.productCode ?? null,
      name: product.name,
      url: product.url ?? null,
      image_url: product.imageUrl ?? null,
      category: product.category ?? null,
      current_price: validPrice
    };
  });

  const productsJson = JSON.stringify(formattedProducts);

  try {
    // 2. Единый мощный CTE-запрос для обновления товаров и умной записи истории
    await sql`
      WITH batch_data AS (
        -- Распаковываем JSON массив
        SELECT * FROM json_to_recordset(${productsJson}::json) AS x(
          source text,
          source_id text,
          product_code text,
          name text,
          url text,
          image_url text,
          category text,
          current_price numeric
        )
      ),
      existing_products AS (
        -- Ищем старые цены товаров до обновления, чтобы сравнить их с новыми
        SELECT id, source_id, current_price 
        FROM products 
        WHERE source_id IN (SELECT source_id FROM batch_data)
      ),
      upserted_products AS (
        -- Вставляем или обновляем товары (ваша логика ON CONFLICT)
        INSERT INTO products (
          source, source_id, product_code, name, url, image_url, category, current_price, updated_at
        )
        SELECT 
          source, source_id, product_code, name, url, image_url, category, current_price, CURRENT_TIMESTAMP
        FROM batch_data
        ON CONFLICT (source_id) DO UPDATE SET
          name          = EXCLUDED.name,
          url           = EXCLUDED.url,
          image_url     = COALESCE(EXCLUDED.image_url, products.image_url),
          category      = COALESCE(EXCLUDED.category, products.category),
          product_code  = COALESCE(EXCLUDED.product_code, products.product_code),
          current_price = EXCLUDED.current_price,
          updated_at    = CURRENT_TIMESTAMP
        RETURNING id, source_id, current_price
      )
      -- Вставляем данные в price_history
      INSERT INTO price_history (product_id, price, currency)
      SELECT u.id, u.current_price, 'UAH'
      FROM upserted_products u
      LEFT JOIN existing_products e ON u.source_id = e.source_id
      WHERE u.current_price IS NOT NULL
        -- КЛЮЧЕВОЕ УСЛОВИЕ: Пишем в историю ТОЛЬКО если товара не было (e.id IS NULL) 
        -- ИЛИ если его старая цена отличается от новой спарсенной цены
        AND (e.id IS NULL OR e.current_price IS DISTINCT FROM u.current_price);
    `;
  } catch (error) {
    console.error(`❌ Ошибка пакетного сохранения в БД:`, error.message);
  }
}
