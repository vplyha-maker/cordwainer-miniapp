import { Pigment, PIGMENTS, initPigment } from './pigments';
import { SpectrumPoint, parseSpectrum, spectrumToRGB, rgbToHex } from '../utils/colorScience';

/**
 * Соответствие id → имя файла в /public/spectra/
 */
const SPECTRUM_FILES: Record<string, string> = {
  titanium_white: 'titanium_white.txt',
  zinc_white: 'zinc_white.txt',
  cadmium_yellow: 'cadmium_yellow.txt',
  cadmium_red: 'cadmium_red.txt',
  yellow_ochre: 'yellow_ochre.txt',
  bone_black: 'bone_black.txt',
  phthalo_blue: 'phthalo_blue.txt',
  ultramarine: 'ultramarine.txt',
};

/**
 * Загружает один спектр по имени файла
 */
export async function loadSpectrum(filename: string): Promise<SpectrumPoint[]> {
  const response = await fetch(`/spectra/${filename}`);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить спектр: ${filename}`);
  }
  const text = await response.text();
  return parseSpectrum(text);
}

/**
 * Загружает и инициализирует все пигменты из списка PIGMENTS
 */
export async function loadAllPigments(): Promise<Pigment[]> {
  const result: Pigment[] = [];

  for (const pigment of PIGMENTS) {
    const filename = SPECTRUM_FILES[pigment.id];

    if (!filename) {
      console.warn(`Нет файла спектра для: ${pigment.id}`);
      result.push(pigment);
      continue;
    }

    try {
      const response = await fetch(`/spectra/${filename}`);
      const text = await response.text();
      const initialized = initPigment(pigment, text);
      result.push(initialized);

      console.log(
        `✓ ${pigment.name.ru} → ${initialized.hex}`,
        initialized.color
      );
    } catch (err) {
      console.error(`Ошибка загрузки ${pigment.id}:`, err);
      result.push(pigment);
    }
  }

  return result;
}

/**
 * Быстрый расчёт цвета из сырого текста спектра
 */
export function getColorFromSpectrumText(text: string) {
  const spectrum = parseSpectrum(text);
  const rgb = spectrumToRGB(spectrum);
  return {
    rgb,
    hex: rgbToHex(rgb),
  };
}
