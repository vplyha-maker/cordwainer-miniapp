import { neon } from '@neondatabase/serverless';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Забираем все товары + актуальную цену + историю (последние 15 точек)
    const rows = await sql`
      SELECT 
        p.id,
        p.name,
        p.source,
        p.product_code,
        p.url,
        p.image_url,
        p.category,
        p.updated_at,
        ph.price AS current_price,
        (
          SELECT COALESCE(
            json_agg(h.price ORDER BY h.scraped_at ASC, h.id ASC),
            '[]'::json
          )
          FROM (
            SELECT price, scraped_at, id
            FROM price_history
            WHERE product_id = p.id
            ORDER BY scraped_at DESC NULLS LAST, id DESC
            LIMIT 15
          ) h
        ) AS history
      FROM products p
      LEFT JOIN LATERAL (
        SELECT price 
        FROM price_history 
        WHERE product_id = p.id 
        ORDER BY scraped_at DESC NULLS LAST, id DESC
        LIMIT 1
      ) ph ON TRUE
      ORDER BY p.id ASC
    `;

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('prices api error:', error);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
