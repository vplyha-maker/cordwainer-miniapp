export default async function handler(req, res) {
  // Включаем CORS для Telegram
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ОСТАНАВЛИВАЕМ БЕСКОНЕЧНЫЙ СКРОЛЛ
  // Если фронтенд просит 2-ю страницу, отдаем пустоту, чтобы не было дублей и тряски
  const page = parseInt(req.query.page) || 1;
  if (page > 1) {
    return res.status(200).json({ results: [] });
  }

  // НАША ЛОКАЛЬНАЯ БАЗА
  // Жесткие ID и прокси wsrv.nl для обхода блокировок картинок StockX
  const LOCAL_DB = [
    { id: 'db-1', brand: 'Nike', name: 'Dunk Low Retro "White Black" (Panda)', gender: 'unisex', price: 110, img: 'https://wsrv.nl/?url=images.stockx.com/images/Nike-Dunk-Low-Retro-White-Black-2021-Product.jpg' },
    { id: 'db-2', brand: 'Jordan', name: 'Air Jordan 1 Retro High OG "Chicago"', gender: 'men', price: 250, img: 'https://wsrv.nl/?url=images.stockx.com/images/Air-Jordan-1-Retro-High-OG-Chicago-Reimagined-Product.jpg' },
    { id: 'db-3', brand: 'Nike', name: 'Air Force 1 Low "White 07"', gender: 'unisex', price: 115, img: 'https://wsrv.nl/?url=images.stockx.com/images/Nike-Air-Force-1-Low-White-07-Product.jpg' },
    { id: 'db-4', brand: 'New Balance', name: '550 "White Green"', gender: 'men', price: 120, img: 'https://wsrv.nl/?url=images.stockx.com/images/New-Balance-550-White-Green-Product.jpg' },
    { id: 'db-5', brand: 'Adidas', name: 'Yeezy Boost 350 V2 "Zebra"', gender: 'men', price: 230, img: 'https://wsrv.nl/?url=images.stockx.com/images/Adidas-Yeezy-Boost-350-V2-Zebra-Product.jpg' },
    { id: 'db-6', brand: 'Adidas', name: 'Samba OG "Cloud White"', gender: 'unisex', price: 100, img: 'https://wsrv.nl/?url=images.stockx.com/images/adidas-Samba-OG-Cloud-White-Core-Black-Product.jpg' },
    { id: 'db-7', brand: 'Jordan', name: 'Air Jordan 4 Retro "Military Black"', gender: 'men', price: 210, img: 'https://wsrv.nl/?url=images.stockx.com/images/Air-Jordan-4-Retro-Military-Black-Product.jpg' },
    { id: 'db-8', brand: 'New Balance', name: '2002R "Protection Pack Rain Cloud"', gender: 'men', price: 160, img: 'https://wsrv.nl/?url=images.stockx.com/images/New-Balance-2002R-Protection-Pack-Rain-Cloud-Product.jpg' },
    { id: 'db-9', brand: 'Nike', name: 'Travis Scott x Air Jordan 1 Low', gender: 'men', price: 1200, img: 'https://wsrv.nl/?url=images.stockx.com/images/Air-Jordan-1-Retro-Low-OG-SP-Travis-Scott-Reverse-Mocha-Product.jpg' },
    { id: 'db-10', brand: 'Adidas', name: 'Campus 00s "Core Black"', gender: 'unisex', price: 110, img: 'https://wsrv.nl/?url=images.stockx.com/images/adidas-Campus-00s-Core-Black-Product.jpg' }
  ];

  const query = (req.query.query || '').toLowerCase();
  let filtered = LOCAL_DB;
  
  if (query && query !== 'all') {
    filtered = LOCAL_DB.filter(s => 
      s.brand.toLowerCase().includes(query) || 
      s.name.toLowerCase().includes(query)
    );
  }

  if (filtered.length === 0) {
    filtered = LOCAL_DB;
  }

  const results = filtered.map(item => ({
    id: item.id, // БОЛЬШЕ НИКАКОГО MATH.RANDOM!
    brand: item.brand,
    name: item.name,
    gender: item.gender,
    retailPrice: item.price,
    image: {
      original: item.img
    }
  }));

  return res.status(200).json({ results });
}
