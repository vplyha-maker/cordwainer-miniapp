import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(503).json({ 
    error: 'Service Temporarily Disabled',
    message: 'Функция временно отключена.' 
  });
}
