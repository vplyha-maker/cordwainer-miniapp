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

  try {
    const response = await fetch('https://sneaker-database-stockx.p.rapidapi.com/productprice?styleId=HQ6448', {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'sneaker-database-stockx.p.rapidapi.com',
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
    return res.status(200).json(data);

  } catch (error: any) {
    return res.status(500).json({ error: 'Crash: ' + error.message });
  }
}
