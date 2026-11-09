/**
 * @file src/components/wholesale/wholesaleData.ts
 * @description Модуль бизнес-данных, конфигураций цен и расчётной логики B2B-раздела CARDIO.
 *
 * ЗАЧЕМ НУЖЕН ЭТОТ ФАЙЛ:
 * 1. Изолирует коммерческие данные (оптовые цены, PIN-коды доступа, стандарты коробов)
 *    от UI-компонентов. Когда меняются цены сезона или добавляется новый PIN-код,
 *    правки вносятся только здесь, без риска задеть вёрстку.
 * 2. Предоставляет быстрые O(1) функции поиска цены по артикулу через хэш-таблицу (Map).
 * 3. Убирает дублирование расчёта формул ростовок между карточкой товара и корзиной.
 */

import { cardioCatalog, type ShoeItem, type SizeKey } from '../../data/catalog';

/**
 * ДЕЙСТВУЮЩИЕ PIN-КОДЫ ДОСТУПА ДЛЯ ОПТОВИКОВ:
 * - '2026' — Общий код сезона CARDIO 2026
 * - '7777' — Мастер-код разработчика
 * - '1511' — Код Бориса (последние 4 цифры его номера +38097-454-15-11)
 * - '3716' — Код Георгия (последние 4 цифры его номера +38067-719-37-16)
 */
export const VALID_WHOLESALE_PINS = new Set(['2026', '7777', '1511', '3716']);

/** Ключи сохранения состояния в localStorage браузера и звуковой ассет верстки PDF */
export const PIN_STORAGE_KEY = 'cardio_b2b_price_pin_ok_v1';
export const CART_STORAGE_KEY = 'cardio_b2b_cart_v1';
export const PDF_AUDIO_SRC = '/pdf.wav';

/** Базовая размерная сетка мужской коллекции CARDIO */
export const SIZES: readonly SizeKey[] = [40, 41, 42, 43, 44, 45] as const;

/**
 * Предустановленные стандарты комплектации оптовых коробов:
 * - STANDARD_8_RUN: Классический короб на 8 пар (ходовые 42 и 43 размеры удвоены)
 * - EVEN_6_RUN: Ровная ростовка на 6 пар (каждый размер по 1 паре)
 */
export const STANDARD_8_RUN: Record<SizeKey, number> = {
  40: 1,
  41: 1,
  42: 2,
  43: 2,
  44: 1,
  45: 1,
};

export const EVEN_6_RUN: Record<SizeKey, number> = {
  40: 1,
  41: 1,
  42: 1,
  43: 1,
  44: 1,
  45: 1,
};

/** Доступные сезоны оптового каталога */
export type SeasonKey = 'autumn' | 'winter';

/** Конфигурация оптовой цены для конкретной модели */
export interface PriceItemConfig {
  modelNumber: string;
  season: SeasonKey;
  priceUsd: number;
}

/** Обогащённый элемент каталога (модель из общей базы + её оптовая цена и сезон) */
export interface FullCatalogPriceItem {
  shoe: ShoeItem;
  priceUsd: number;
  season: SeasonKey;
}

/**
 * Официальный оптовый прайс-лист фабрики CARDIO на 2026 год (в USD за 1 пару).
 */
export const PRICE_LIST_2026: PriceItemConfig[] = [
  // === ОСЕНЬ 2026 (AUTUMN) ===
  { modelNumber: '20', season: 'autumn', priceUsd: 34 },
  { modelNumber: '22', season: 'autumn', priceUsd: 36 },
  { modelNumber: '23', season: 'autumn', priceUsd: 36 },
  { modelNumber: '26', season: 'autumn', priceUsd: 39 },
  { modelNumber: '28', season: 'autumn', priceUsd: 37 },
  { modelNumber: '35', season: 'autumn', priceUsd: 36 },
  { modelNumber: '36', season: 'autumn', priceUsd: 38 },
  { modelNumber: '37', season: 'autumn', priceUsd: 36 },
  { modelNumber: '43', season: 'autumn', priceUsd: 39 },
  { modelNumber: '44', season: 'autumn', priceUsd: 39 },
  { modelNumber: '70', season: 'autumn', priceUsd: 38 },

  // === ЗИМА 2026 (WINTER) ===
  { modelNumber: '165', season: 'winter', priceUsd: 48 },
  { modelNumber: '172', season: 'winter', priceUsd: 49 },
  { modelNumber: '173', season: 'winter', priceUsd: 48 },
  { modelNumber: '174', season: 'winter', priceUsd: 48 },
  { modelNumber: '188', season: 'winter', priceUsd: 45 },
  { modelNumber: '201', season: 'winter', priceUsd: 45 },
  { modelNumber: '206', season: 'winter', priceUsd: 45 },
  { modelNumber: '208', season: 'winter', priceUsd: 45 },
  { modelNumber: '210', season: 'winter', priceUsd: 45 },
  { modelNumber: '214', season: 'winter', priceUsd: 46 },
  { modelNumber: '218', season: 'winter', priceUsd: 41 },
  { modelNumber: '220', season: 'winter', priceUsd: 48 },
  { modelNumber: '223', season: 'winter', priceUsd: 44 },
  { modelNumber: '224', season: 'winter', priceUsd: 47 },
  { modelNumber: '225', season: 'winter', priceUsd: 44 },
  { modelNumber: '226', season: 'winter', priceUsd: 45 },
  { modelNumber: '227', season: 'winter', priceUsd: 45 },
  { modelNumber: '228', season: 'winter', priceUsd: 46 },
  { modelNumber: '229', season: 'winter', priceUsd: 46 },
];

/**
 * Индексированная Map-таблица для мгновенного поиска конфигурации цены по номеру модели.
 */
const PRICE_MAP = new Map<string, PriceItemConfig>(
  PRICE_LIST_2026.map((item) => [item.modelNumber.trim(), item])
);

/**
 * Возвращает оптовую цену в USD по номеру модели или null, если модель не в оптовом прайсе.
 */
export function getWholesalePriceByModel(modelNumber: string): number | null {
  return PRICE_MAP.get(modelNumber.trim())?.priceUsd ?? null;
}

/**
 * Собирает и сортирует полный список моделей каталога, имеющих оптовую цену.
 * Сортировка: сначала коллекция Осень, затем Зима; внутри сезона — по возрастанию артикула.
 */
export function getWholesaleCatalogItems(): FullCatalogPriceItem[] {
  const result: FullCatalogPriceItem[] = [];

  for (const shoe of cardioCatalog) {
    const priceCfg = PRICE_MAP.get(shoe.modelNumber.trim());
    if (priceCfg) {
      result.push({
        shoe,
        priceUsd: priceCfg.priceUsd,
        season: priceCfg.season,
      });
    }
  }

  return result.sort((a, b) => {
    if (a.season !== b.season) return a.season === 'autumn' ? -1 : 1;
    return Number(a.shoe.modelNumber) - Number(b.shoe.modelNumber);
  });
}

/**
 * Генерирует читаемую строку формулы заказа для накладной и корзины.
 * Используется как при первом добавлении модели в корзину, так и при пересчёте коробов.
 */
export function buildOrderFormulaText(params: {
  orderMode: 'wholesale' | 'sample';
  sampleRunLabel: string;
  sampleSize: SizeKey;
  sizeRun: Record<SizeKey, number>;
  boxesCount: number;
  lineUsd: number;
}): string {
  const { orderMode, sampleRunLabel, sampleSize, sizeRun, boxesCount, lineUsd } = params;

  if (orderMode === 'sample') {
    return `${sampleRunLabel} — р. ${sampleSize} ($${lineUsd})`;
  }

  const sizesBreakdown = SIZES.filter((sz) => sizeRun[sz] > 0)
    .map((sz) => `${sz}р.(${sizeRun[sz] * boxesCount})`)
    .join(' • ');

  return `Ростовок ×${boxesCount} ($${lineUsd}): ${sizesBreakdown}`;
}

