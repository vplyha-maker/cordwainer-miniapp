import { neon } from '@neondatabase/serverless'

export const config = {
  runtime: 'edge',
}

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 час

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const sql = neon(process.env.DATABASE_URL!)

  try {
    // 1. Читаем текущий кэш
    const rows = await sql`
      SELECT currency, rate, updated_at
      FROM currency_rates
      WHERE currency IN ('USD', 'EUR')
    `

    const usdRow = rows.find((r: any) => r.currency === 'USD')
    const eurRow = rows.find((r: any) => r.currency === 'EUR')

    const now = Date.now()
    const usdAge = usdRow ? now - new Date(usdRow.updated_at).getTime() : Infinity
    const eurAge = eurRow ? now - new Date(eurRow.updated_at).getTime() : Infinity

    const isFresh =
      usdAge < CACHE_TTL_MS &&
      eurAge < CACHE_TTL_MS &&
      Number(usdRow?.rate) > 0 &&
      Number(eurRow?.rate) > 0

    // 2. Если кэш свежий — отдаём его (историю не трогаем)
    // ДОБАВЛЕНО: явная проверка usdRow и eurRow для TypeScript
    if (isFresh && usdRow && eurRow) {
      return new Response(
        JSON.stringify({
          usd: Number(usdRow.rate),
          eur: Number(eurRow.rate),
          updatedAt: usdRow.updated_at,
          source: 'cache',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
          },
        }
      )
    }

    // 3. Тянем свежие курсы с НБУ
    const nbuRes = await fetch(
      'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json',
      { headers: { Accept: 'application/json' } }
    )

    if (!nbuRes.ok) {
      // Fallback на старый кэш
      // ДОБАВЛЕНО: явная проверка usdRow и eurRow для TypeScript
      if (usdRow && eurRow && Number(usdRow.rate) > 0 && Number(eurRow.rate) > 0) {
        return new Response(
          JSON.stringify({
            usd: Number(usdRow.rate),
            eur: Number(eurRow.rate),
            updatedAt: usdRow.updated_at,
            source: 'stale-cache',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
      throw new Error(`NBU error ${nbuRes.status}`)
    }

    const rates = await nbuRes.json()
    const usd = rates.find((r: any) => r.cc === 'USD')
    const eur = rates.find((r: any) => r.cc === 'EUR')

    if (!usd?.rate || !eur?.rate) {
      throw new Error('USD or EUR not found in NBU response')
    }

    const usdRate = Number(usd.rate)
    const eurRate = Number(eur.rate)

    // 4. Пишем в ИСТОРИЮ (новые строки)
    await sql`
      INSERT INTO currency_rate_history (currency, rate, scraped_at)
      VALUES 
        ('USD', ${usdRate}, NOW()),
        ('EUR', ${eurRate}, NOW())
    `

    // 5. Обновляем текущий кэш
    await sql`
      INSERT INTO currency_rates (currency, rate, updated_at)
      VALUES ('USD', ${usdRate}, NOW())
      ON CONFLICT (currency) DO UPDATE SET
        rate = EXCLUDED.rate,
        updated_at = NOW()
    `

    await sql`
      INSERT INTO currency_rates (currency, rate, updated_at)
      VALUES ('EUR', ${eurRate}, NOW())
      ON CONFLICT (currency) DO UPDATE SET
        rate = EXCLUDED.rate,
        updated_at = NOW()
    `

    return new Response(
      JSON.stringify({
        usd: usdRate,
        eur: eurRate,
        updatedAt: new Date().toISOString(),
        source: 'nbu',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
        },
      }
    )
  } catch (error: any) {
    console.error('rates api error:', error?.message || error)

    return new Response(
      JSON.stringify({
        usd: null,
        eur: null,
        updatedAt: null,
        source: null,
        error: error?.message || 'Failed to fetch rates',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
