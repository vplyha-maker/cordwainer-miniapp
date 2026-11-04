import type { VercelRequest, VercelResponse } from '@vercel/node';

// Разрешаем только безопасные публичные методы поиска и расчета доставки
const ALLOWED_METHODS: Record<string, string[]> = {
  Address: ['getCities', 'getWarehouses', 'searchSettlements'],
  InternetDocument: ['getDocumentPrice'],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.NP_API_KEY || process.env.VITE_NP_API_KEY || '';
  const { modelName, calledMethod, methodProperties } = req.body || {};

  if (!modelName || !calledMethod) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }

  // Защита: блокируем любые методы работы с личными данными и ТТН
  const allowedForModel = ALLOWED_METHODS[modelName];
  if (!allowedForModel || !allowedForModel.includes(calledMethod)) {
    return res.status(403).json({ success: false, error: 'Forbidden method' });
  }

  try {
    const npResponse = await fetch('https://api.novaposhta.ua/v2.0/json/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        modelName,
        calledMethod,
        methodProperties: methodProperties || {},
      }),
    });

    const data = await npResponse.json();
    if (!data.success) {
      console.error('NovaPoshta API Error:', data.errors);
    }
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'NP proxy error' });
  }
}

