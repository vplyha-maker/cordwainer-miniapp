export type ShoeCategory = 'Ботинки' | 'Кроссовки' | 'Туфли';

export interface ShoeItem {
  id: string;
  modelNumber: string; // Номер модели (для группировки цветов и B2B-заказа)
  variant?: string;    // Отличия (#1, #2 или вариация по фото)
  category: ShoeCategory;
  color: string;
  features: string[];  // Мех, Гортекс, подошва и т.д.
  image: string;       // Путь к файлу в папке public/catalog/
}

export const cardioCatalog: ShoeItem[] = [
  // Модель 223
  { id: '223', modelNumber: '223', category: 'Кроссовки', color: 'Белый', features: ['Мех', 'Gore-Tex'], image: '/catalog/223.jpg' },
  { id: '223-1', modelNumber: '223', category: 'Кроссовки', color: 'Черный', features: ['Мех', 'Gore-Tex'], image: '/catalog/223(1).jpg' },

  // Модель 226
  { id: '226', modelNumber: '226', category: 'Ботинки', color: 'Черный', features: ['Подошва трактор'], image: '/catalog/226.jpg' },
  { id: '226-1', modelNumber: '226', variant: 'Вариант 2', category: 'Ботинки', color: 'Черный', features: ['Подошва трактор'], image: '/catalog/226(1).jpg' },
  { id: '226-base', modelNumber: '226', variant: 'Базовый', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/226.jpg' }, // Проверьте имя файла (дублирует 226.jpg)

  // Модель 188
  { id: '188', modelNumber: '188', category: 'Ботинки', color: 'Черный', features: ['Подошва трактор'], image: '/catalog/188.jpg' },

  // Модель 218
  { id: '218', modelNumber: '218', category: 'Ботинки', color: 'Олива', features: [], image: '/catalog/218.jpg' },
  { id: '218-1', modelNumber: '218', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/218(1).jpg' },

  // Модель 206, 208, 173, 214
  { id: '206', modelNumber: '206', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/206.jpg' },
  { id: '208', modelNumber: '208', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/208.jpg' },
  { id: '173', modelNumber: '173', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/173.jpg' },
  { id: '214', modelNumber: '214', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/214.jpg' },

  // Модель 220
  { id: '220', modelNumber: '220', category: 'Ботинки', color: 'Песок', features: [], image: '/catalog/220.jpg' },
  { id: '220-1', modelNumber: '220', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/220(1).jpg' },

  // Модель 172
  { id: '172', modelNumber: '172', category: 'Ботинки', color: 'Олива', features: [], image: '/catalog/172.jpg' },
  { id: '172-1', modelNumber: '172', category: 'Ботинки', color: 'Песок', features: [], image: '/catalog/172(1).jpg' },

  // Модель 201
  { id: '201', modelNumber: '201', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/201.jpg' },

  // Модель 28
  { id: '28', modelNumber: '28', category: 'Кроссовки', color: 'Черный', features: [], image: '/catalog/28.jpg' },
  { id: '28-1', modelNumber: '28', category: 'Кроссовки', color: 'Белый', features: [], image: '/catalog/28(1).jpg' },

  // Модель 228
  { id: '228', modelNumber: '228', category: 'Ботинки', color: 'Серый', features: [], image: '/catalog/228.jpg' },
  { id: '228-1', modelNumber: '228', category: 'Ботинки', color: 'Зеленый', features: ['Подошва бело-черная'], image: '/catalog/228(1).jpg' },
  { id: '228-2', modelNumber: '228', category: 'Ботинки', color: 'Зеленый', features: ['Подошва черная'], image: '/catalog/228(2).jpg' },
  { id: '228-3', modelNumber: '228', category: 'Ботинки', color: 'Черный', features: ['Подошва белая'], image: '/catalog/228(3).jpg' },
  { id: '228-4', modelNumber: '228', category: 'Ботинки', color: 'Черный', features: ['Подошва черная'], image: '/catalog/228(4).jpg' },

  // Модель 43
  { id: '43', modelNumber: '43', variant: '#1', category: 'Кроссовки', color: 'Белый', features: [], image: '/catalog/43.jpg' },
  { id: '43-2', modelNumber: '43', variant: '#2', category: 'Кроссовки', color: 'Белый', features: [], image: '/catalog/43(2).jpg' },
  { id: '43-3', modelNumber: '43', category: 'Кроссовки', color: 'Черный', features: [], image: '/catalog/43(3).jpg' },

  // Модель 227
  { id: '227', modelNumber: '227', category: 'Ботинки', color: 'Черно-белый', features: [], image: '/catalog/227.jpg' },
  { id: '227-1', modelNumber: '227', category: 'Ботинки', color: 'Белый', features: [], image: '/catalog/227(1).jpg' },
  { id: '227-2', modelNumber: '227', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/227(2).jpg' },

  // Модель 70
  { id: '70', modelNumber: '70', category: 'Туфли', color: 'Коричневый', features: [], image: '/catalog/70.jpg' },
  { id: '70-1', modelNumber: '70', category: 'Туфли', color: 'Черный', features: [], image: '/catalog/70(1).jpg' },

  // Модель 36
  { id: '36', modelNumber: '36', variant: '#1', category: 'Кроссовки', color: 'Белый', features: [], image: '/catalog/36.jpg' },
  { id: '36-1', modelNumber: '36', category: 'Кроссовки', color: 'Серый', features: [], image: '/catalog/36(1).jpg' },
  { id: '36-2', modelNumber: '36', variant: '#2', category: 'Кроссовки', color: 'Белый', features: [], image: '/catalog/36(2).jpg' },

  // Модели 26, 44, 20, 210
  { id: '26', modelNumber: '26', category: 'Туфли', color: 'Олива', features: [], image: '/catalog/26.jpg' },
  { id: '44', modelNumber: '44', category: 'Туфли', color: 'Черный', features: [], image: '/catalog/44.jpg' },
  { id: '20', modelNumber: '20', category: 'Кроссовки', color: 'Черный', features: [], image: '/catalog/20.jpg' },
  { id: '210', modelNumber: '210', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/210.jpg' },
];

