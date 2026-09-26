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

    // 3. Тянем свежие курсы с ПРИВАТБАНКА (открытое API, без блокировок)
    const pbRes = await fetch(
      'https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5',
      { headers: { Accept: 'application/json' } }
    )

    if (!pbRes.ok) {
      // Fallback на старый кэш
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
      throw new Error(`PrivatBank error ${pbRes.status}`)
    }

    const rates = await pbRes.json()
    // В ПриватБанке названия полей другие: ccy (вместо cc) и sale (вместо rate)
    const usd = rates.find((r: any) => r.ccy === 'USD')
    const eur = rates.find((r: any) => r.ccy === 'EUR')

    if (!usd?.sale || !eur?.sale) {
      throw new Error('USD or EUR not found in PrivatBank response')
    }

    const usdRate = Number(usd.sale)
    const eurRate = Number(eur.sale)

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
        source: 'privatbank',
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
