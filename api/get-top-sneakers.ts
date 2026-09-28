const SneaksAPI = require('sneaks-api');
const sneaks = new SneaksAPI();

export default async function handler(req, res) {
  // Включаем CORS, чтобы фронтенд мог обращаться к этому API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const query = req.query.query || 'Nike';
    const limit = parseInt(req.query.limit) || 100;
    
    // В Sneaks API нет встроенной пагинации, поэтому мы запрашиваем больше данных
    // и обрезаем их вручную на основе переданной страницы
    const page = parseInt(req.query.page) || 1;
    const fetchLimit = limit * page; // Если просят 2-ю страницу, тянем 200 и возвращаем 100-200

    sneaks.getProducts(query, fetchLimit, function(err, products) {
      if (err) {
        console.error("Sneaks API Error:", err);
        return res.status(500).json({ error: 'Failed to fetch sneakers data', details: err.message });
      }

      if (!products || products.length === 0) {
        return res.status(200).json({ results: [] });
      }

      // Вырезаем нужную "страницу" для фронтенда (пагинация)
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProducts = products.slice(startIndex, endIndex);

      // Адаптируем ответ Sneaks API под тот формат, который уже ждет ваш SneakerIndex.tsx
      const formattedResults = paginatedProducts.map(item => ({
        id: item.styleID || item._id,
        brand: item.brand,
        name: item.shoeName,
        gender: item.gender || 'men', // Sneaks не всегда возвращает пол
        retailPrice: item.retailPrice || 0,
        releaseDate: item.releaseDate,
        releaseYear: item.releaseDate ? item.releaseDate.substring(0, 4) : '',
        image: {
          original: item.thumbnail || item.imageLinks?.[0] || ''
        }
      }));

      return res.status(200).json({ results: formattedResults });
    });

  } catch (error) {
    console.error("Handler Error:", error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
