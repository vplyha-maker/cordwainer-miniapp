import { SpectrumPoint, parseSpectrum, spectrumToRGB, rgbToHex, RGB } from '../utils/colorScience';

export interface Pigment {
  id: string;
  name: {
    uk: string;
    ru: string;
    en: string;
  };
  /** Сырой текст спектра (из .txt файла) */
  spectrumText?: string;
  /** Уже распарсенный спектр */
  spectrum?: SpectrumPoint[];
  /** Предрассчитанный цвет */
  color?: RGB;
  hex?: string;
}

/**
 * Список пигментов, которые мы будем использовать.
 * Пока оставляем пустые spectrumText — заполним их позже.
 */
export const PIGMENTS: Pigment[] = [
  {
    id: 'titanium_white',
    name: {
      uk: 'Титанові білила',
      ru: 'Титановые белила',
      en: 'Titanium White',
    },
  },
  {
    id: 'zinc_white',
    name: {
      uk: 'Цинкові білила',
      ru: 'Цинковые белила',
      en: 'Zinc White',
    },
  },
  {
    id: 'cadmium_yellow',
    name: {
      uk: 'Кадмій жовтий',
      ru: 'Кадмий жёлтый',
      en: 'Cadmium Yellow',
    },
  },
  {
    id: 'cadmium_red',
    name: {
      uk: 'Кадмій червоний',
      ru: 'Кадмий красный',
      en: 'Cadmium Red',
    },
  },
  {
    id: 'yellow_ochre',
    name: {
      uk: 'Вохра жовта',
      ru: 'Охра жёлтая',
      en: 'Yellow Ochre',
    },
  },
  {
    id: 'bone_black',
    name: {
      uk: 'Кісткова сажа',
      ru: 'Костяная сажа',
      en: 'Bone Black',
    },
  },
  {
    id: 'phthalo_blue',
    name: {
      uk: 'Фталоціанін синій',
      ru: 'Фталоцианин синий',
      en: 'Phthalo Blue',
    },
  },
  {
    id: 'ultramarine',
    name: {
      uk: 'Ультрамарин',
      ru: 'Ультрамарин',
      en: 'Ultramarine',
    },
  },
];

/**
 * Инициализирует пигмент: парсит спектр и считает цвет
 */
export function initPigment(pigment: Pigment, spectrumText: string): Pigment {
  const spectrum = parseSpectrum(spectrumText);
  const color = spectrumToRGB(spectrum);
  const hex = rgbToHex(color);

  return {
    ...pigment,
    spectrumText,
    spectrum,
    color,
    hex,
  };
}
