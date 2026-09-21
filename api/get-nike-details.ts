export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'RAPIDAPI_KEY is not configured in Vercel' });
  }

  // Получаем URL конкретного товара Nike из параметров запроса
  const productUrl = (req.query.url as string) || '';

  if (!productUrl) {
    return res.status(400).json({ error: 'Parameter "url" is required' });
  }

  try {
    // Формируем запрос к Nike API на RapidAPI
    const apiUrl = `https://nike-api.p.rapidapi.com/get-womens-shoe-details?product_url=${encodeURIComponent(productUrl)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'nike-api.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: 'RapidAPI Nike Error',
        status: response.status,
        details: errorText,
      });
    }

    const data = await response.json();

    // Кешируем ответ на сутки
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: 'Crash: ' + error.message });
  }
}

