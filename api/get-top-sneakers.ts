import axios from 'axios';

export default async function handler(req, res) {
  // Настройки CORS для Telegram Mini App
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // БЕРЕМ ТОКЕН ИЗ БЕЗОПАСНЫХ ПЕРЕМЕННЫХ VERCEL
  const API_TOKEN = process.env.APIFY_API_TOKEN;

  if (!API_TOKEN) {
    console.error("Критическая ошибка: Токен API не найден в настройках Vercel!");
    return res.status(500).json({ error: 'Server configuration error (missing token)' });
  }

  try {
    const query = req.query.query || 'Nike';
    const limit = parseInt(req.query.limit) || 100;
    
    // URL для вызова API Sneakers123 через Apify
    const url = `https://api.apify.com/v2/acts/dev00~sneaker-database-api/run-sync-get-dataset-items?token=${API_TOKEN}`;

    // Отправляем запрос на Apify
    const response = await axios.post(url, {
      q: query,
      limit: limit,
      currency: "usd"
    });

    const products = response.data;

    if (!products || products.length === 0) {
      return res.status(200).json({ results: [] });
    }

    // Форматируем ответ Sneakers123 под интерфейс Cordwainer (SneakerIndex.tsx)
    const formattedResults = products.map(item => ({
      id: item.sku || Math.random().toString(36).substr(2, 9),
      brand: item.brand || 'Unknown',
      name: item.name || 'Sneaker',
      gender: Array.isArray(item.gender) ? item.gender[0] : (item.gender || 'unisex'),
      retailPrice: item.sale_price || item.price || 0,
      image: {
        original: item.thumbnail_url || ''
      }
    }));

    return res.status(200).json({ results: formattedResults });

  } catch (error) {
    console.error("Apify API Error:", error?.response?.data || error.message);
    res.status(500).json({ 
      error: 'Ошибка при загрузке данных с Apify', 
      details: error?.response?.data || error.message 
    });
  }
}
