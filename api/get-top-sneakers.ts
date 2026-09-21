export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', true);
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

  // Получаем бренд из параметров запроса (например, /api/get-top-sneakers?query=adidas)
  const searchQuery = req.query.query || 'nike';
  const limit = req.query.limit || '50';

  try {
    const response = await fetch(`https://sneakers-database3.p.rapidapi.com/731/search%2Bsneaker?query=${encodeURIComponent(searchQuery)}&limit=${limit}&page=1`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'sneakers-database3.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: 'RapidAPI Error', 
        status: response.status, 
        details: errorText 
      });
    }

    const data = await response.json();
    
    // Кэшируем ответ на 24 часа
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    
    return res.status(200).json(data);

  } catch (error: any) {
    return res.status(500).json({ error: 'Crash: ' + error.message });
  }
}
