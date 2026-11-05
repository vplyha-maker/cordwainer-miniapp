export type ShoeCategory = 'Ботинки' | 'Кроссовки' | 'Туфли';
export type SizeKey = 40 | 41 | 42 | 43 | 44 | 45;

export interface ShoeItem {
  id: string;
  modelNumber: string;
  variant?: string;
  category: ShoeCategory;
  color: string;
  features: string[];
  image: string;
}

export interface CartItem {
  uid: string;
  shoe: ShoeItem;
  orderMode: 'wholesale' | 'sample';
  sizeRun: Record<SizeKey, number>;
  boxesCount: number;
  sampleSize: SizeKey;
  totalPairs: number;
  formulaText: string;
}

function resolveCatalogLang(lang?: string): 'ru' | 'uk' | 'de' {
  if (lang === 'ru' || lang === 'uk' || lang === 'de') return lang;
  if (lang === 'ua') return 'uk';
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('app_lang');
      if (saved === 'ru' || saved === 'uk' || saved === 'de') return saved;
      if (saved === 'ua') return 'uk';
    } catch {}
  }
  return 'ru';
}

const CATEGORY_TRANSLATIONS: Record<ShoeCategory, Record<'ru' | 'uk' | 'de', string>> = {
  'Ботинки': { ru: 'Ботинки', uk: 'Черевики', de: 'Stiefel' },
  'Кроссовки': { ru: 'Кроссовки', uk: 'Кросівки', de: 'Sneaker' },
  'Туфли': { ru: 'Туфли', uk: 'Туфлі', de: 'Halbschuhe' },
};

const COLOR_TRANSLATIONS: Record<string, Record<'ru' | 'uk' | 'de', string>> = {
  'Белый': { ru: 'Белый', uk: 'Білий', de: 'Weiß' },
  'Черный': { ru: 'Черный', uk: 'Чорний', de: 'Schwarz' },
  'Чёрный': { ru: 'Черный', uk: 'Чорний', de: 'Schwarz' },
  'Коричневый': { ru: 'Коричневый', uk: 'Коричневий', de: 'Braun' },
  'Олива': { ru: 'Олива', uk: 'Олива', de: 'Oliv' },
  'Оливковый': { ru: 'Оливковый', uk: 'Оливковий', de: 'Oliv' },
  'Песок': { ru: 'Песок', uk: 'Пісочний', de: 'Sand' },
  'Песочный': { ru: 'Песочный', uk: 'Пісочний', de: 'Sand' },
  'Серый': { ru: 'Серый', uk: 'Сірий', de: 'Grau' },
  'Зеленый': { ru: 'Зеленый', uk: 'Зелений', de: 'Grün' },
  'Черно-белый': { ru: 'Черно-белый', uk: 'Чорно-білий', de: 'Schwarz-Weiß' },
  'Синий': { ru: 'Синий', uk: 'Синій', de: 'Blau' },
  'Рыжий': { ru: 'Рыжий', uk: 'Рудий', de: 'Rotbraun' },
  'Бежевый': { ru: 'Бежевый', uk: 'Бежевий', de: 'Beige' },
  'Бордовый': { ru: 'Бордовый', uk: 'Бордовий', de: 'Bordeaux' },
};

const FEATURE_TRANSLATIONS: Record<string, Record<'ru' | 'uk' | 'de', string>> = {
  'Мех': { ru: 'Мех', uk: 'Хутро', de: 'Pelzfutter' },
  'Gore-Tex': { ru: 'Gore-Tex', uk: 'Gore-Tex', de: 'Gore-Tex' },
  'Подошва трактор': { ru: 'Подошва трактор', uk: 'Підошва трактор', de: 'Profilsohle' },
  'Подошва бело-черная': { ru: 'Подошва бело-черная', uk: 'Підошва біло-чорна', de: 'Sohle weiß-schwarz' },
  'Подошва черная': { ru: 'Подошва черная', uk: 'Підошва чорна', de: 'Sohle schwarz' },
  'Подошва белая': { ru: 'Подошва белая', uk: 'Підошва біла', de: 'Sohle weiß' },
};

export function getLocalizedCategory(category: ShoeCategory, lang?: string): string {
  const activeLang = resolveCatalogLang(lang);
  return CATEGORY_TRANSLATIONS[category]?.[activeLang] || category;
}

export function getLocalizedColor(color: string, lang?: string): string {
  if (!color) return '';
  const activeLang = resolveCatalogLang(lang);
  const trimmed = color.trim();
  if (COLOR_TRANSLATIONS[trimmed]) return COLOR_TRANSLATIONS[trimmed][activeLang];
  const foundKey = Object.keys(COLOR_TRANSLATIONS).find(
    (k) => k.toLowerCase() === trimmed.toLowerCase()
  );
  return foundKey ? COLOR_TRANSLATIONS[foundKey][activeLang] : color;
}

export function getLocalizedFeature(feature: string, lang?: string): string {
  if (!feature) return '';
  const activeLang = resolveCatalogLang(lang);
  const trimmed = feature.trim();
  if (FEATURE_TRANSLATIONS[trimmed]) return FEATURE_TRANSLATIONS[trimmed][activeLang];
  const foundKey = Object.keys(FEATURE_TRANSLATIONS).find(
    (k) => k.toLowerCase() === trimmed.toLowerCase()
  );
  return foundKey ? FEATURE_TRANSLATIONS[foundKey][activeLang] : feature;
}

export const cardioCatalog: ShoeItem[] = [
  { id: '223', modelNumber: '223', category: 'Кроссовки', color: 'Белый', features: ['Мех', 'Gore-Tex'], image: '/catalog/223.jpg' },
  { id: '223-1', modelNumber: '223', category: 'Кроссовки', color: 'Черный', features: ['Мех', 'Gore-Tex'], image: '/catalog/223(1).jpg' },
  { id: '226', modelNumber: '226', variant: '#1', category: 'Ботинки', color: 'Черный', features: ['Подошва трактор'], image: '/catalog/226.jpg' },
  { id: '226-1', modelNumber: '226', variant: '#2', category: 'Ботинки', color: 'Черный', features: ['Подошва трактор'], image: '/catalog/226(1).jpg' },
  { id: '188', modelNumber: '188', category: 'Ботинки', color: 'Черный', features: ['Подошва трактор'], image: '/catalog/188.jpg' },
  { id: '218', modelNumber: '218', category: 'Ботинки', color: 'Олива', features: [], image: '/catalog/218.jpg' },
  { id: '218-1', modelNumber: '218', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/218(1).jpg' },
  { id: '206', modelNumber: '206', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/206.jpg' },
  { id: '208', modelNumber: '208', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/208.jpg' },
  { id: '173', modelNumber: '173', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/173.jpg' },
  { id: '214', modelNumber: '214', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/214.jpg' },
  { id: '220', modelNumber: '220', category: 'Ботинки', color: 'Песок', features: [], image: '/catalog/220.jpg' },
  { id: '220-1', modelNumber: '220', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/220(1).jpg' },
  { id: '172', modelNumber: '172', category: 'Ботинки', color: 'Олива', features: [], image: '/catalog/172.jpg' },
  { id: '172-1', modelNumber: '172', category: 'Ботинки', color: 'Песок', features: [], image: '/catalog/172(1).jpg' },
  { id: '201', modelNumber: '201', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/201.jpg' },
  { id: '28', modelNumber: '28', category: 'Кроссовки', color: 'Черный', features: [], image: '/catalog/28.jpg' },
  { id: '28-1', modelNumber: '28', category: 'Кроссовки', color: 'Белый', features: [], image: '/catalog/28(1).jpg' },
  { id: '228', modelNumber: '228', category: 'Ботинки', color: 'Серый', features: [], image: '/catalog/228.jpg' },
  { id: '228-1', modelNumber: '228', category: 'Ботинки', color: 'Зеленый', features: ['Подошва бело-черная'], image: '/catalog/228(1).jpg' },
  { id: '228-2', modelNumber: '228', category: 'Ботинки', color: 'Зеленый', features: ['Подошва черная'], image: '/catalog/228(2).jpg' },
  { id: '228-3', modelNumber: '228', category: 'Ботинки', color: 'Черный', features: ['Подошва белая'], image: '/catalog/228(3).jpg' },
  { id: '228-4', modelNumber: '228', category: 'Ботинки', color: 'Черный', features: ['Подошва черная'], image: '/catalog/228(4).jpg' },
  { id: '43', modelNumber: '43', variant: '#1', category: 'Кроссовки', color: 'Белый', features: [], image: '/catalog/43.jpg' },
  { id: '43-2', modelNumber: '43', variant: '#2', category: 'Кроссовки', color: 'Белый', features: [], image: '/catalog/43(2).jpg' },
  { id: '43-3', modelNumber: '43', variant: '#3', category: 'Кроссовки', color: 'Черный', features: [], image: '/catalog/43(3).jpg' },
  { id: '227', modelNumber: '227', category: 'Ботинки', color: 'Черно-белый', features: [], image: '/catalog/227.jpg' },
  { id: '227-1', modelNumber: '227', category: 'Ботинки', color: 'Белый', features: [], image: '/catalog/227(1).jpg' },
  { id: '227-2', modelNumber: '227', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/227(2).jpg' },
  { id: '70', modelNumber: '70', category: 'Туфли', color: 'Коричневый', features: [], image: '/catalog/70.jpg' },
  { id: '70-1', modelNumber: '70', category: 'Туфли', color: 'Черный', features: [], image: '/catalog/70(1).jpg' },
  { id: '36', modelNumber: '36', variant: '#1', category: 'Кроссовки', color: 'Белый', features: [], image: '/catalog/36.jpg' },
  { id: '36-1', modelNumber: '36', category: 'Кроссовки', color: 'Серый', features: [], image: '/catalog/36(1).jpg' },
  { id: '36-2', modelNumber: '36', variant: '#2', category: 'Кроссовки', color: 'Белый', features: [], image: '/catalog/36(2).jpg' },
  { id: '26', modelNumber: '26', category: 'Туфли', color: 'Олива', features: [], image: '/catalog/26.jpg' },
  { id: '44', modelNumber: '44', category: 'Туфли', color: 'Черный', features: [], image: '/catalog/44.jpg' },
  { id: '20', modelNumber: '20', category: 'Кроссовки', color: 'Черный', features: [], image: '/catalog/20.jpg' },
  { id: '210', modelNumber: '210', category: 'Ботинки', color: 'Черный', features: [], image: '/catalog/210.jpg' },
];
