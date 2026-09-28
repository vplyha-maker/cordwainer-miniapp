export default async function handler(req, res) {
  // Включаем CORS для Telegram
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // НАША ЛОКАЛЬНАЯ БАЗА (работает мгновенно и без лимитов)
  const LOCAL_DB = [
    { brand: 'Nike', name: 'Dunk Low Retro "White Black" (Panda)', gender: 'unisex', price: 110, img: 'https://images.stockx.com/images/Nike-Dunk-Low-Retro-White-Black-2021-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' },
    { brand: 'Jordan', name: 'Air Jordan 1 Retro High OG "Chicago"', gender: 'men', price: 250, img: 'https://images.stockx.com/images/Air-Jordan-1-Retro-High-OG-Chicago-Reimagined-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' },
    { brand: 'Nike', name: 'Air Force 1 Low "White 07"', gender: 'unisex', price: 115, img: 'https://images.stockx.com/images/Nike-Air-Force-1-Low-White-07-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' },
    { brand: 'New Balance', name: '550 "White Green"', gender: 'men', price: 120, img: 'https://images.stockx.com/images/New-Balance-550-White-Green-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' },
    { brand: 'Adidas', name: 'Yeezy Boost 350 V2 "Zebra"', gender: 'men', price: 230, img: 'https://images.stockx.com/images/Adidas-Yeezy-Boost-350-V2-Zebra-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' },
    { brand: 'Adidas', name: 'Samba OG "Cloud White"', gender: 'unisex', price: 100, img: 'https://images.stockx.com/images/adidas-Samba-OG-Cloud-White-Core-Black-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' },
    { brand: 'Jordan', name: 'Air Jordan 4 Retro "Military Black"', gender: 'men', price: 210, img: 'https://images.stockx.com/images/Air-Jordan-4-Retro-Military-Black-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' },
    { brand: 'New Balance', name: '2002R "Protection Pack Rain Cloud"', gender: 'men', price: 160, img: 'https://images.stockx.com/images/New-Balance-2002R-Protection-Pack-Rain-Cloud-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' },
    { brand: 'Nike', name: 'Travis Scott x Air Jordan 1 Low "Reverse Mocha"', gender: 'men', price: 1200, img: 'https://images.stockx.com/images/Air-Jordan-1-Retro-Low-OG-SP-Travis-Scott-Reverse-Mocha-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' },
    { brand: 'Adidas', name: 'Campus 00s "Core Black"', gender: 'unisex', price: 110, img: 'https://images.stockx.com/images/adidas-Campus-00s-Core-Black-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color' }
  ];

  // Получаем запрос от вашего компонента (например "Nike" или "550")
  const query = (req.query.query || '').toLowerCase();
  
  let filtered = LOCAL_DB;
  
  // Фильтруем по бренду или названию
  if (query && query !== 'all') {
    filtered = LOCAL_DB.filter(s => 
      s.brand.toLowerCase().includes(query) || 
      s.name.toLowerCase().includes(query)
    );
  }

  // Если нажали на бренд, которого пока нет в локальной базе (чтобы экран не был пустым)
  if (filtered.length === 0) {
    filtered = LOCAL_DB;
  }

  // Упаковываем в тот формат, который ждет ваш SneakerIndex.tsx
  const results = filtered.map((item, index) => ({
    id: `local-${index}-${Math.random().toString(36).substring(2, 9)}`,
    brand: item.brand,
    name: item.name,
    gender: item.gender,
    retailPrice: item.price,
    image: {
      original: item.img
    }
  }));

  // Моментальный ответ без ожиданий
  return res.status(200).json({ results });
}
