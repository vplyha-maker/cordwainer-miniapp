// api/salary.ts
import { neon } from '@neondatabase/serverless'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const sql = neon(process.env.DATABASE_URL!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS (на всякий случай)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const userId = Number(req.query.user_id || req.body?.user_id)

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    // ─── GET: получить данные пользователя ───────────────────────────────
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT data FROM salary_data WHERE user_id = ${userId}
      `

      if (rows.length === 0) {
        // Возвращаем пустую структуру
        return res.status(200).json({
          items: [],
          rates: {},
          days: {},
          archive: {},
          updatedAt: new Date().toISOString(),
        })
      }

      return res.status(200).json(rows[0].data)
    }

    // ─── PUT: сохранить / обновить данные ────────────────────────────────
    if (req.method === 'PUT') {
      const data = req.body?.data

      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'data is required' })
      }

      // Добавляем updatedAt на сервере
      const payload = {
        ...data,
        updatedAt: new Date().toISOString(),
      }

      await sql`
        INSERT INTO salary_data (user_id, data, updated_at)
        VALUES (${userId}, ${JSON.stringify(payload)}::jsonb, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          data = EXCLUDED.data,
          updated_at = NOW()
      `

      return res.status(200).json({ ok: true, updatedAt: payload.updatedAt })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: any) {
    console.error('salary API error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
 }
