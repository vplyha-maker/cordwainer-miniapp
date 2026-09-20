// api/get-top-sneakers.ts

export default async function handler(req: any, res: any) {
  // Разрешаем CORS, чтобы твой фронтенд мог обращаться к этому API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // В продакшене лучше указать URL твоего аппа
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Обработка предварительного запроса (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Мы разрешаем только GET запросы
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.KICKSDB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key is not configured' });
  }

  try {
    // Обращаемся к Unified API KicksDB. 
    // Запрашиваем 20 популярных/релевантных моделей (без жестких фильтров для начала)
    const response = await fetch('https://api.kicks.dev/v1/unified/products?limit=20', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch data from KicksDB');
    }

    const data = await response.json();
    
    // Возвращаем данные на фронтенд
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('Error fetching top sneakers:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

