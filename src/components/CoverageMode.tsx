import { motion } from 'framer-motion'
import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { rgbToHex } from '../utils/colorScience'
import { CoverageSystem } from '../utils/calculatorLogic'
import { PigmentSelector } from './PigmentSelector'
import { PaintPart } from '../hooks/usePaintMix'

interface CoverageModeProps {
  lang: Lang
  pigments: Pigment[]
  basePigmentId: string
  setBasePigmentId: (id: string) => void
  coverageSystem: CoverageSystem
  setCoverageSystem: (system: CoverageSystem) => void
  mixedColor: { hex: string } | null
  coverageAdvice: {
    opacityLabel: string
    layersLabel: string
    note: string
  } | null
  layers: {
    layer1: [number, number, number]
    layer2: [number, number, number]
    layer3: [number, number, number]
    final: [number, number, number]
  } | null
  copied: boolean
  onCopyHex: () => void
  paints: PaintPart[]
  totalAmount: number
  getPigmentName: (id: string) => string
}

export function CoverageMode({
  lang,
  pigments,
  basePigmentId,
  setBasePigmentId,
  coverageSystem,
  setCoverageSystem,
  mixedColor,
  coverageAdvice,
  layers,
  copied,
  onCopyHex,
  paints,
  totalAmount,
  getPigmentName,
}: CoverageModeProps) {
  const isUk = lang === 'uk'

  return (
    <>
      <div className="flex flex-col gap-5">
        <div>
          <div className="text-xs opacity-50 mb-2 font-medium uppercase tracking-wider">
            {isUk ? 'Колір основи (шкіри)' : 'Цвет основы (кожи)'}
          </div>
          <PigmentSelector
            pigments={pigments}
            value={basePigmentId}
            onChange={setBasePigmentId}
            lang={lang}
          />
        </div>

        <div>
          <div className="text-xs opacity-50 mb-2 font-medium uppercase tracking-wider">
            {isUk ? 'Тип системи' : 'Тип системы'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCoverageSystem('aniline')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${
                coverageSystem === 'aniline' ? 'bg-[#D8A35C] text-black' : 'bg-white/10 text-white/70'
              }`}
            >
              {isUk ? 'Анілін (прозорий)' : 'Анилин (прозрачный)'}
            </button>
            <button
              onClick={() => setCoverageSystem('acrylic')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${
                coverageSystem === 'acrylic' ? 'bg-[#D8A35C] text-black' : 'bg-white/10 text-white/70'
              }`}
            >
              {isUk ? 'Акрил (укривистий)' : 'Акрил (укрывистый)'}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-xs opacity-50 mb-2">
            {isUk ? 'Цільовий колір суміші' : 'Целевой цвет смеси'}
          </div>
          <div
            className="w-28 h-28 rounded-2xl border-2 border-white/15 shadow-lg mb-2"
            style={{ backgroundColor: mixedColor?.hex || '#2a2522' }}
          />
          {mixedColor ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{mixedColor.hex.toUpperCase()}</span>
              <button onClick={onCopyHex} className="px-2.5 py-1 rounded-lg bg-white/10 text-xs">
                {copied ? '✓' : isUk ? 'Копіювати' : 'Копировать'}
              </button>
            </div>
          ) : (
            <span className="text-xs opacity-40">
              {isUk ? 'Введіть обсяги вище' : 'Введите объёмы выше'}
            </span>
          )}
        </div>

        {coverageAdvice && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-[11px] opacity-50 mb-0.5">
                  {isUk ? 'Укривистість' : 'Укрывистость'}
                </div>
                <div className="text-sm font-semibold text-[#D8A35C]">
                  {coverageAdvice.opacityLabel}
                </div>
              </div>
              <div>
                <div className="text-[11px] opacity-50 mb-0.5">
                  {isUk ? 'Рекомендовано шарів' : 'Рекомендуемо слоёв'}
                </div>
                <div className="text-sm font-semibold text-[#D8A35C]">
                  {coverageAdvice.layersLabel}
                </div>
              </div>
            </div>
            <p className="text-[13px] leading-relaxed opacity-80">{coverageAdvice.note}</p>
          </div>
        )}

        {layers && (
          <div>
            <div className="text-xs opacity-50 mb-3 font-medium uppercase tracking-wider">
              {isUk ? 'Симуляція шарів (Kubelka-Munk)' : 'Симуляция слоёв (Kubelka-Munk)'}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: isUk ? '1 шар' : '1 слой', color: layers.layer1 },
                { label: isUk ? '2 шари' : '2 слоя', color: layers.layer2 },
                { label: isUk ? '3 шари' : '3 слоя', color: layers.layer3 },
                { label: isUk ? 'Фінал' : 'Финал', color: layers.final },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-full aspect-square rounded-xl border border-white/15"
                    style={{ backgroundColor: rgbToHex(item.color) }}
                  />
                  <span className="text-[10px] opacity-60 text-center">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Проценты смеси */}
      <div className="flex justify-between items-end mt-6 mb-4 border-t border-white/10 pt-4">
        <span className="text-sm opacity-60">
          {isUk ? 'Загальний об’єм суміші' : 'Общий объём смеси'}
        </span>
        <span className="text-xl font-bold tabular-nums">
          {totalAmount > 1000
            ? (totalAmount / 1000).toFixed(2) + ' л'
            : totalAmount.toFixed(1) + ' мл'}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {paints.map((paint) => {
          const paintAmount = parseFloat(paint.amount) || 0
          const percentage = totalAmount > 0 ? (paintAmount / totalAmount) * 100 : 0
          const pigment = pigments.find((p) => p.id === paint.pigmentId)
          const displayPercent =
            percentage === 0 ? '0%' : percentage < 0.1 ? '<0.1%' : percentage.toFixed(1) + '%'

          return (
            <div key={paint.id} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2.5 truncate pr-3 min-w-0">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/25 flex-shrink-0"
                    style={{ backgroundColor: pigment?.hex || '#666' }}
                  />
                  <span className="opacity-85 truncate text-[13px]">
                    {getPigmentName(paint.pigmentId)}
                  </span>
                </div>
                <span className="font-mono text-[#D8A35C] text-[13px] tabular-nums">
                  {displayPercent}
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: pigment?.hex || '#D8A35C' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(percentage, 100)}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
