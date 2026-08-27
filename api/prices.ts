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

    // Забираем 100 последних обновленных товаров + их самую свежую цену из price_history
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
        (
          SELECT price 
          FROM price_history ph 
          WHERE ph.product_id = p.id 
          ORDER BY scraped_at DESC 
          LIMIT 1
        ) as current_price
      FROM products p
      ORDER BY p.updated_at DESC
      LIMIT 100
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
