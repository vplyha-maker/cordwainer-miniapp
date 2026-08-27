import { neon } from '@neondatabase/serverless';

export const config = {
  runtime: 'edge', // или 'nodejs' — edge быстрее и дешевле
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

    // Подставь реальное имя таблицы и колонок из твоего парсера
    const rows = await sql`
      SELECT 
        id,
        name,
        price_zotti,
        url,
        updated_at
      FROM products
      ORDER BY updated_at DESC
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
