export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const page = parseInt(req.query.page) || 1;
  if (page > 1) {
    return res.status(200).json({ results: [] });
  }

  // НАША ПОЛНАЯ ЛОКАЛЬНАЯ БАЗА
  const LOCAL_DB = [
    { id: 'db-1', brand: 'Nike', name: 'Dunk Low Retro "White Black" (Panda)', gender: 'unisex', price: 110, img: 'https://image.goat.com/attachments/product_template_pictures/images/059/095/367/original/711204_00.png' },
    { id: 'db-2', brand: 'Jordan', name: 'Air Jordan 1 Retro High OG "Chicago"', gender: 'men', price: 250, img: 'https://image.goat.com/attachments/product_template_pictures/images/079/930/806/original/1020726_00.png' },
    { id: 'db-3', brand: 'Nike', name: 'Air Force 1 Low "White 07"', gender: 'unisex', price: 115, img: 'https://image.goat.com/attachments/product_template_pictures/images/008/654/900/original/52015_00.png' },
    { id: 'db-4', brand: 'New Balance', name: '550 "White Green"', gender: 'men', price: 120, img: 'https://image.goat.com/attachments/product_template_pictures/images/056/394/914/original/784180_00.png' },
    { id: 'db-5', brand: 'Adidas', name: 'Yeezy Boost 350 V2 "Zebra"', gender: 'men', price: 230, img: 'https://image.goat.com/attachments/product_template_pictures/images/072/179/384/original/128362_00.png' },
    { id: 'db-6', brand: 'Adidas', name: 'Samba OG "Cloud White"', gender: 'unisex', price: 100, img: 'https://image.goat.com/attachments/product_template_pictures/images/010/221/334/original/234479_00.png' },
    { id: 'db-7', brand: 'Jordan', name: 'Air Jordan 4 Retro "Military Black"', gender: 'men', price: 210, img: 'https://image.goat.com/attachments/product_template_pictures/images/072/290/138/original/932289_00.png' },
    { id: 'db-8', brand: 'New Balance', name: '2002R "Protection Pack Rain Cloud"', gender: 'men', price: 160, img: 'https://image.goat.com/attachments/product_template_pictures/images/057/887/760/original/792611_00.png' },
    { id: 'db-9', brand: 'Nike', name: 'Travis Scott x Air Jordan 1 Low', gender: 'men', price: 1200, img: 'https://image.goat.com/attachments/product_template_pictures/images/075/273/956/original/918116_00.png' },
    { id: 'db-10', brand: 'Adidas', name: 'Campus 00s "Core Black"', gender: 'unisex', price: 110, img: 'https://image.goat.com/attachments/product_template_pictures/images/078/200/989/original/1041908_00.png' }
  ];

  const query = (req.query.query || '').toLowerCase().trim();
  let filtered = LOCAL_DB;
  
  if (query && query !== 'all') {
    filtered = LOCAL_DB.filter(s => 
      s.brand.toLowerCase() === query || 
      s.brand.toLowerCase().includes(query) || 
      s.name.toLowerCase().includes(query)
    );
  }

  // Если ничего не нашли по точному запросу, возвращаем пустой массив (чтобы фронтенд честно показал "Ничего не найдено", а не мешал бренды)
  const results = filtered.map(item => ({
    id: item.id,
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
