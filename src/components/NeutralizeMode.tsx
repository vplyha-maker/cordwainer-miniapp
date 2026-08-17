import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { PigmentSelector } from './PigmentSelector'
import { BasicRecipeResult } from '../utils/basicPaletteRecipe'

interface NeutralizeModeProps {
  lang: Lang
  pigments: Pigment[]
  unwantedPigmentId: string
  setUnwantedPigmentId: (id: string) => void
  neutralizerPigmentId: string
  setNeutralizerPigmentId: (id: string) => void
  autoNeutralizer: boolean
  setAutoNeutralizer: (value: boolean) => void
  neutralizeStrength: number
  changeStrength: (delta: number) => void
  neutralizeResult: { hex: string } | null
  copied: boolean
  onCopyHex: (hex?: string) => void
  showRecipe: boolean
  setShowRecipe: (value: boolean) => void
  basicRecipe: BasicRecipeResult | null
  onShowRecipe: () => void
  getPigmentName: (id: string) => string
}

export function NeutralizeMode({
  lang,
  pigments,
  unwantedPigmentId,
  setUnwantedPigmentId,
  neutralizerPigmentId,
  setNeutralizerPigmentId,
  autoNeutralizer,
  setAutoNeutralizer,
  neutralizeStrength,
  changeStrength,
  neutralizeResult,
  copied,
  onCopyHex,
  showRecipe,
  setShowRecipe,
  basicRecipe,
  onShowRecipe,
  getPigmentName,
}: NeutralizeModeProps) {
  const isUk = lang === 'uk'

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] opacity-70 leading-relaxed">
        {isUk
          ? 'Оберіть небажаний відтінок — система сама підбере нейтралізатор за колом Оствальда.'
          : 'Выберите нежелательный оттенок — система сама подберёт нейтрализатор по кругу Оствальда.'}
      </p>

      <div>
        <div className="text-xs opacity-50 mb-2 font-medium uppercase tracking-wider">
          {isUk ? 'Небажаний відтінок основи' : 'Нежелательный оттенок основы'}
        </div>
        <PigmentSelector
          pigments={pigments}
          value={unwantedPigmentId}
          onChange={(id) => {
            setUnwantedPigmentId(id)
            setAutoNeutralizer(true)
            setShowRecipe(false)
          }}
          lang={lang}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs opacity-50 font-medium uppercase tracking-wider">
            {isUk ? 'Нейтралізатор' : 'Нейтрализатор'}
          </div>
          {autoNeutralizer && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D8A35C]/20 text-[#D8A35C]">
              {isUk ? 'підібрано' : 'подобран'}
            </span>
          )}
        </div>
        <PigmentSelector
          pigments={pigments}
          value={neutralizerPigmentId}
          onChange={(id) => {
            setNeutralizerPigmentId(id)
            setAutoNeutralizer(false)
            setShowRecipe(false)
          }}
          lang={lang}
        />
      </div>

      <div>
        <div className="text-xs opacity-50 mb-3 font-medium uppercase tracking-wider text-center">
          {isUk ? 'Сила нейтралізації' : 'Сила нейтрализации'}
        </div>
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={() => changeStrength(-5)}
            disabled={neutralizeStrength <= 10}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-xl font-medium active:scale-90"
          >
            −
          </button>
          <div className="w-16 text-center">
            <span className="text-2xl font-bold text-[#D8A35C] tabular-nums">
              {neutralizeStrength}%
            </span>
          </div>
          <button
            onClick={() => changeStrength(5)}
            disabled={neutralizeStrength >= 60}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-xl font-medium active:scale-90"
          >
            +
          </button>
        </div>
      </div>

      {neutralizeResult && (
        <div className="flex flex-col items-center mt-2">
          <div className="text-xs opacity-50 mb-2">
            {isUk ? 'Результат тонування' : 'Результат тонирования'}
          </div>
          <div
            className="w-32 h-32 rounded-2xl border-2 border-white/15 shadow-lg mb-3"
            style={{ backgroundColor: neutralizeResult.hex }}
          />
          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-sm">{neutralizeResult.hex.toUpperCase()}</span>
            <button
              onClick={() => onCopyHex(neutralizeResult.hex)}
              className="px-2.5 py-1 rounded-lg bg-white/10 text-xs"
            >
              {copied ? '✓' : isUk ? 'Копіювати' : 'Копировать'}
            </button>
          </div>

          <button
            onClick={onShowRecipe}
            className="w-full py-3 rounded-xl border border-dashed border-[#D8A35C] text-[#D8A35C] text-sm font-medium hover:bg-[#D8A35C]/10 transition-colors"
          >
            {isUk ? 'Як змішати з базових фарб' : 'Как смешать из базовых красок'}
          </button>
        </div>
      )}

      {showRecipe && basicRecipe && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">
              {isUk
                ? `Рецепт «${getPigmentName(neutralizerPigmentId)}» (±20 мл)`
                : `Рецепт «${getPigmentName(neutralizerPigmentId)}» (±20 мл)`}
            </div>
            <button
              onClick={() => setShowRecipe(false)}
              className="text-white/50 text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {basicRecipe.recipe.map((item) => (
              <div key={item.pigment.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: item.pigment.hex }}
                  />
                  <span>{isUk ? item.pigment.name.uk : item.pigment.name.ru}</span>
                </div>
                <span className="font-mono text-[#D8A35C]">{item.ml} мл</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg border border-white/15"
              style={{ backgroundColor: basicRecipe.resultHex }}
            />
            <div className="text-xs opacity-70">
              <div>ΔE ≈ {basicRecipe.deltaE}</div>
              <div className="opacity-50">
                {basicRecipe.deltaE < 8
                  ? isUk
                    ? 'Дуже близький'
                    : 'Очень близкий'
                  : basicRecipe.deltaE < 15
                    ? isUk
                      ? 'Прийнятний'
                      : 'Приемлемый'
                    : isUk
                      ? 'Приблизний'
                      : 'Приблизительный'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
