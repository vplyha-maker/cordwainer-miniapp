import React, { useState } from 'react';
import {
  ACHROMATIC_PRESETS,
  BASE_LEATHER_SWATCHES,
  SOLE_SWATCHES,
  MATERIALS,
  MaterialType,
  StudioMode,
} from '../data/footwearStudioPresets';

interface FootwearStudioPanelProps {
  /** Текущие цвета обуви [Верх, Детали, Акцент, Подошва] */
  colors: string[];
  /** Функция обновления цветов в родительском ColorCalcPage */
  onChangeColors: (newColors: string[]) => void;
  /** Текущие цвета от круга Иттена, чтобы брать из них акценты в гибридном режиме */
  ittenColors?: string[];
  /** Опциональный колбэк для передачи выбранных фактур в SVG */
  onChangeMaterials?: (materials: MaterialType[]) => void;
  lang?: 'ru' | 'uk' | 'en';
}

const ZONE_LABELS = {
  ru: ['Союзка (База)', 'Берцы / Детали', 'Акцент / Кант', 'Подошва'],
  uk: ['Союзка (База)', 'Берці / Деталі', 'Акцент / Кант', 'Підошва'],
  en: ['Vamp (Base)', 'Quarter / Details', 'Accent / Trim', 'Outsole'],
};

export const FootwearStudioPanel: React.FC<FootwearStudioPanelProps> = ({
  colors,
  onChangeColors,
  ittenColors,
  onChangeMaterials,
  lang = 'ru',
}) => {
  const [mode, setMode] = useState<StudioMode>('itten');
  const [lockedZones, setLockedZones] = useState<boolean[]>([false, false, false, false]);
  const [zoneMaterials, setZoneMaterials] = useState<MaterialType[]>([
    'smooth',
    'suede',
    'smooth',
    'smooth',
  ]);
  const [activeZoneIndex, setActiveZoneIndex] = useState<number>(0);

  // Нормализуем массив до 4 зон
  const safeColors = [
    colors[0] || '#141416',
    colors[1] || colors[0] || '#232428',
    colors[2] || colors[1] || '#D8D8DC',
    colors[3] || '#F4F4F0',
  ];

  const applyColorsWithLocks = (targetColors: string[]) => {
    const next = safeColors.map((curr, idx) =>
      lockedZones[idx] ? curr : (targetColors[idx] ?? curr)
    );
    onChangeColors(next);
  };

  const toggleLock = (idx: number) => {
    setLockedZones((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const handleZoneColorChange = (idx: number, hex: string) => {
    const next = [...safeColors];
    next[idx] = hex;
    onChangeColors(next);
  };

  const handleMaterialChange = (idx: number, mat: MaterialType) => {
    const next = [...zoneMaterials];
    next[idx] = mat;
    setZoneMaterials(next);
    onChangeMaterials?.(next);
  };

  // Применение гибридной схемы 60-30-10: Нейтральная база + Акцент из круга Иттена
  const applyHybridBase = (baseHex: string, secondaryHex?: string) => {
    const ittenAccent = ittenColors?.[0] || safeColors[2];
    const next = [
      baseHex,
      secondaryHex || baseHex,
      ittenAccent, // Яркий акцент по Иттену
      safeColors[3], // Сохраняем выбранную подошву
    ];
    applyColorsWithLocks(next);
  };

  // Быстрая ротация зон местами (без учета замороженных)
  const rotateUnlockedZones = () => {
    const unlockedIndices = lockedZones
      .map((locked, i) => (!locked ? i : -1))
      .filter((i) => i !== -1);
    if (unlockedIndices.length < 2) return;

    const next = [...safeColors];
    const firstColor = next[unlockedIndices[0]];
    for (let i = 0; i < unlockedIndices.length - 1; i++) {
      next[unlockedIndices[i]] = next[unlockedIndices[i + 1]];
    }
    next[unlockedIndices[unlockedIndices.length - 1]] = firstColor;
    onChangeColors(next);
  };

  return (
    <div className="w-full rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 text-zinc-100 space-y-4 shadow-xl">
      {/* Переключатель режимов проектирования */}
      <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80">
        <button
          type="button"
          onClick={() => setMode('itten')}
          className={`py-2 px-2 rounded-lg text-xs font-medium transition ${
            mode === 'itten'
              ? 'bg-zinc-800 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Круг Иттена
        </button>
        <button
          type="button"
          onClick={() => setMode('achromatic')}
          className={`py-2 px-2 rounded-lg text-xs font-medium transition ${
            mode === 'achromatic'
              ? 'bg-zinc-800 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Ч/Б и База
        </button>
        <button
          type="button"
          onClick={() => setMode('hybrid')}
          className={`py-2 px-2 rounded-lg text-xs font-medium transition ${
            mode === 'hybrid'
              ? 'bg-zinc-800 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          База + Акцент
        </button>
      </div>

      {/* РЕЖИМ 1: Готовые ахроматические и базовые капсулы */}
      {mode === 'achromatic' && (
        <div className="space-y-2.5">
          <div className="text-xs text-zinc-400">
            Классические обувные сочетания вне спектрального круга:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ACHROMATIC_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  applyColorsWithLocks(preset.colors);
                  setZoneMaterials(preset.materials);
                  onChangeMaterials?.(preset.materials);
                }}
                className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-zinc-950/70 hover:bg-zinc-800/80 border border-zinc-800 transition text-left"
              >
                <div className="flex items-center gap-1">
                  {preset.colors.map((hex, i) => (
                    <span
                      key={i}
                      className="w-5 h-5 rounded-full border border-zinc-700"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-zinc-200">
                  {preset.name[lang]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* РЕЖИМ 2: Гибрид 60-30-10 (Черная/Белая база + цвет Иттена) */}
      {mode === 'hybrid' && (
        <div className="space-y-3">
          <div className="text-xs text-zinc-400">
            Выберите базовую кожу (60–80% верха), а цвет из круга Иттена станет акцентом:
          </div>
          <div className="flex flex-wrap gap-2">
            {BASE_LEATHER_SWATCHES.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                onClick={() => applyHybridBase(swatch.hex)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs transition"
              >
                <span
                  className="w-4 h-4 rounded-full border border-zinc-600"
                  style={{ backgroundColor: swatch.hex }}
                />
                <span>{swatch.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Позонный конструктор деталей (Союзка, Берцы, Акцент, Подошва) */}
      <div className="space-y-2 pt-1 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Детали кроя и Заморозка (Lock)
          </span>
          <button
            type="button"
            onClick={rotateUnlockedZones}
            className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
          >
            ↻ Поменять местами
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {ZONE_LABELS[lang].map((label, idx) => {
            const isSelected = activeZoneIndex === idx;
            const isLocked = lockedZones[idx];
            return (
              <div
                key={idx}
                onClick={() => setActiveZoneIndex(idx)}
                className={`cursor-pointer rounded-xl p-2 border transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500/80 bg-zinc-800/70'
                    : 'border-zinc-800 bg-zinc-950/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="w-6 h-6 rounded-lg border border-zinc-600 shadow-inner"
                    style={{ backgroundColor: safeColors[idx] }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLock(idx);
                    }}
                    title={isLocked ? 'Разблокировать зону' : 'Закрепить цвет зоны'}
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      isLocked
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {isLocked ? '🔒' : '🔓'}
                  </button>
                </div>
                <div className="mt-2">
                  <div className="text-[11px] font-medium text-zinc-200 leading-tight">
                    {label}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    {MATERIALS[zoneMaterials[idx]].label[lang]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Настройка выбранной зоны: быстрый цвет (Ч/Б/Каучук) + Фактура кожи */}
      <div className="rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-300 font-medium">
            Зона: {ZONE_LABELS[lang][activeZoneIndex]}
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            {safeColors[activeZoneIndex]}
          </span>
        </div>

        {/* Быстрые цвета для выбранной зоны (если выбрана Подошва — показываем подошвенные цвета) */}
        <div className="flex flex-wrap gap-1.5">
          {(activeZoneIndex === 3 ? SOLE_SWATCHES : BASE_LEATHER_SWATCHES).map((sw) => (
            <button
              key={sw.id}
              type="button"
              onClick={() => handleZoneColorChange(activeZoneIndex, sw.hex)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/70 text-[11px] transition"
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-zinc-600"
                style={{ backgroundColor: sw.hex }}
              />
              <span>{sw.name}</span>
            </button>
          ))}
        </div>

        {/* Выбор фактуры кожи для текущей детали */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(Object.keys(MATERIALS) as MaterialType[]).map((matKey) => {
            const active = zoneMaterials[activeZoneIndex] === matKey;
            return (
              <button
                key={matKey}
                type="button"
                onClick={() => handleMaterialChange(activeZoneIndex, matKey)}
                className={`px-2.5 py-1 rounded-lg text-[11px] border transition ${
                  active
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-medium'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {MATERIALS[matKey].label[lang]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

