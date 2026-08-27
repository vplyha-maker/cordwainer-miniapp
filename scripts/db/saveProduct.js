import { sql } from './client.js';

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

  const [row] = await sql`
    INSERT INTO products (source, source_id, product_code, name, url, image_url, category, updated_at)
    VALUES (${source}, ${sourceId}, ${productCode}, ${name}, ${url}, ${imageUrl}, ${category}, NOW())
    ON CONFLICT (source, source_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      url = EXCLUDED.url,
      image_url = EXCLUDED.image_url,
      category = EXCLUDED.category,
      product_code = EXCLUDED.product_code,
      updated_at = NOW()
    RETURNING id
  `;

  const productId = row.id;

  if (price !== null && price !== undefined) {
    await sql`
      INSERT INTO price_history (product_id, price, currency)
      VALUES (${productId}, ${price}, 'UAH')
    `;
  }

  return productId;
}
