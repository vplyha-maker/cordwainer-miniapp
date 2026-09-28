import SneaksAPI from 'sneaks-api';

const sneaks = new SneaksAPI();

// РЕЗЕРВНАЯ БАЗА. Если API тормозит, пользователь мгновенно увидит эти хиты, а не ошибку.
const FALLBACK_SNEAKERS = [
  { id: 'fb-1', brand: 'Nike', name: 'Dunk Low Retro "White Black" (Panda)', gender: 'unisex', retailPrice: 110, image: { original: 'https://images.stockx.com/images/Nike-Dunk-Low-Retro-White-Black-2021-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' } },
  { id: 'fb-2', brand: 'Jordan', name: 'Air Jordan 1 Retro High "Chicago"', gender: 'men', retailPrice: 180, image: { original: 'https://images.stockx.com/images/Air-Jordan-1-Retro-Chicago-2015-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' } },
  { id: 'fb-3', brand: 'New Balance', name: '550 "White Green"', gender: 'men', retailPrice: 110, image: { original: 'https://images.stockx.com/images/New-Balance-550-White-Green-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' } },
  { id: 'fb-4', brand: 'Adidas', name: 'Yeezy Boost 350 V2 "Zebra"', gender: 'men', retailPrice: 220, image: { original: 'https://images.stockx.com/images/Adidas-Yeezy-Boost-350-V2-Zebra-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' } },
  { id: 'fb-5', brand: 'Adidas', name: 'Samba OG "Cloud White"', gender: 'unisex', retailPrice: 100, image: { original: 'https://images.stockx.com/images/adidas-Samba-OG-Cloud-White-Core-Black-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' } },
  { id: 'fb-6', brand: 'Nike', name: 'Air Force 1 Low "White 07"', gender: 'unisex', retailPrice: 110, image: { original: 'https://images.stockx.com/images/Nike-Air-Force-1-Low-White-07-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' } },
  { id: 'fb-7', brand: 'Jordan', name: 'Air Jordan 4 Retro "Military Black"', gender: 'men', retailPrice: 210, image: { original: 'https://images.stockx.com/images/Air-Jordan-4-Retro-Military-Black-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' } }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query.query || 'Nike';
  const limit = parseInt(req.query.limit) || 15;

  try {
    // Делаем защитный "Таймер" на 7 секунд. Если API не успеет - отдаем резерв
    const getSneakersFast = () => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout")), 7000);
      
      sneaks.getProducts(query, limit, (err, products) => {
        clearTimeout(timer);
        if (err) reject(err);
        else resolve(products);
      });
    });

    const products = await getSneakersFast();

    if (!products || products.length === 0) throw new Error("No items");

    const formattedResults = products.map(item => ({
      id: item.styleID || item._id || Math.random().toString(),
      brand: item.brand || 'Sneaker',
      name: item.shoeName || 'Model',
      gender: item.gender || 'unisex',
      retailPrice: item.retailPrice || 0,
      image: {
        original: item.thumbnail || item.imageLinks?.[0] || 'https://via.placeholder.com/400'
      }
    }));

    return res.status(200).json({ results: formattedResults });

  } catch (error) {
    console.warn("API не успел ответить. Включаю резервную базу каталога.");
    
    // Если пользователь искал бренд, пытаемся выдать релевантные резервные кроссовки
    const q = query.toLowerCase();
    let safeResults = FALLBACK_SNEAKERS.filter(s => 
      s.brand.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
    
    // Если в резерве нет такого бренда, отдаем весь резервный список, чтобы экран не был пустым
    if (safeResults.length === 0) safeResults = FALLBACK_SNEAKERS;

    return res.status(200).json({ results: safeResults });
  }
}
