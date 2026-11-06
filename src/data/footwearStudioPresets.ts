export type StudioMode = 'itten' | 'achromatic' | 'hybrid';

export type MaterialType = 'smooth' | 'suede' | 'patent' | 'nubuck' | 'grain';

export interface MaterialSpec {
  id: MaterialType;
  label: { ru: string; uk: string; en: string };
  specularOpacity: number; // Сила блика для SVG
  roughness: number;       // Матовость
}

export interface AchromaticPreset {
  id: string;
  name: { ru: string; uk: string; en: string };
  // [Основной верх, Детали/Берцы, Акцент/Подкладка, Подошва]
  colors: [string, string, string, string];
  materials: [MaterialType, MaterialType, MaterialType, MaterialType];
}

export const MATERIALS: Record<MaterialType, MaterialSpec> = {
  smooth: {
    id: 'smooth',
    label: { ru: 'Гладкая кожа', uk: 'Гладка шкіра', en: 'Smooth Leather' },
    specularOpacity: 0.28,
    roughness: 0.2,
  },
  suede: {
    id: 'suede',
    label: { ru: 'Замша / Велюр', uk: 'Замша / Велюр', en: 'Suede' },
    specularOpacity: 0.05,
    roughness: 0.85,
  },
  patent: {
    id: 'patent',
    label: { ru: 'Лаковая кожа', uk: 'Лакова шкіра', en: 'Patent Leather' },
    specularOpacity: 0.65,
    roughness: 0.05,
  },
  nubuck: {
    id: 'nubuck',
    label: { ru: 'Нубук', uk: 'Нубук', en: 'Nubuck' },
    specularOpacity: 0.1,
    roughness: 0.7,
  },
  grain: {
    id: 'grain',
    label: { ru: 'Флотар (зерно)', uk: 'Флотар (зерно)', en: 'Pebbled Leather' },
    specularOpacity: 0.22,
    roughness: 0.45,
  },
};

export const ACHROMATIC_PRESETS: AchromaticPreset[] = [
  {
    id: 'total-black',
    name: { ru: 'Total Black (Игра фактур)', uk: 'Total Black (Гра фактур)', en: 'Total Black Mix' },
    colors: ['#141416', '#1F2024', '#0B0B0C', '#101012'],
    materials: ['smooth', 'suede', 'patent', 'smooth'],
  },
  {
    id: 'pure-white',
    name: { ru: 'Белый + Молочный', uk: 'Білий + Молочний', en: 'White & Off-White' },
    colors: ['#F8F9FA', '#EAE6DF', '#DCD6CD', '#F2EFE9'],
    materials: ['smooth', 'suede', 'nubuck', 'smooth'],
  },
  {
    id: 'panda-contrast',
    name: { ru: 'Ч/Б Контраст', uk: 'Ч/Б Контраст', en: 'B&W Contrast' },
    colors: ['#F7F7F7', '#161618', '#161618', '#F0EFEA'],
    materials: ['smooth', 'smooth', 'patent', 'smooth'],
  },
  {
    id: 'black-white-sole',
    name: { ru: 'Черный верх / Белая подошва', uk: 'Чорний верх / Біла підошва', en: 'Black on White Sole' },
    colors: ['#161618', '#232428', '#D8D8DC', '#F5F5F3'],
    materials: ['suede', 'smooth', 'smooth', 'smooth'],
  },
  {
    id: 'graphite-silver',
    name: { ru: 'Графит + Сталь', uk: 'Графіт + Сталь', en: 'Graphite & Silver' },
    colors: ['#2C2E33', '#4B4E56', '#C4C7CE', '#191A1D'],
    materials: ['nubuck', 'suede', 'patent', 'smooth'],
  },
  {
    id: 'espresso-milk',
    name: { ru: 'Эспрессо + Кэмел', uk: 'Еспресо + Кемел', en: 'Espresso & Camel' },
    colors: ['#2A1B15', '#8C583A', '#E8DFD5', '#1C130F'],
    materials: ['smooth', 'suede', 'smooth', 'smooth'],
  },
];

// Базовые цвета кожи для гибридного режима (База + акцент Иттена)
export const BASE_LEATHER_SWATCHES = [
  { id: 'jet-black', hex: '#141416', name: 'Черный' },
  { id: 'optic-white', hex: '#F7F8FA', name: 'Белый' },
  { id: 'milk', hex: '#EFECE6', name: 'Молочный' },
  { id: 'graphite', hex: '#34373D', name: 'Графит' },
  { id: 'taupe', hex: '#8A7F75', name: 'Тауп' },
  { id: 'espresso', hex: '#2D1D16', name: 'Шоколад' },
];

// Быстрые пресеты для подошвы (4-й слот палитры)
export const SOLE_SWATCHES = [
  { id: 'sole-white', hex: '#F4F4F0', name: 'Белая' },
  { id: 'sole-milk', hex: '#E5DEC9', name: 'Молочная' },
  { id: 'sole-gum', hex: '#B87B46', name: 'Каучук (Gum)' },
  { id: 'sole-black', hex: '#151517', name: 'Черная' },
  { id: 'sole-graphite', hex: '#383A40', name: 'Графит' },
];

