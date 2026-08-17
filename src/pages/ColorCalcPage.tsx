import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { loadAllPigments } from '../data/loadPigments'
import {
  CoverageSystem,
  getOstwaldNeutralizer,
} from '../utils/calculatorLogic'
import { usePaintMix } from '../hooks/usePaintMix'
import { useColorCalculations } from '../hooks/useColorCalculations'
import { PigmentSelector } from '../components/PigmentSelector'
import { CoverageMode } from '../components/CoverageMode'
import { NeutralizeMode } from '../components/NeutralizeMode'
import {
  findBasicPaletteRecipe,
  BasicRecipeResult,
} from '../utils/basicPaletteRecipe'

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

type Mode = 'coverage' | 'neutralize'

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [mode, setMode] = useState<Mode>('coverage')
  const [coverageSystem, setCoverageSystem] = useState<CoverageSystem>('acrylic')

  const [basePigmentId, setBasePigmentId] = useState('titanium_white')
  const [unwantedPigmentId, setUnwantedPigmentId] = useState('cadmium_yellow')
  const [neutralizerPigmentId, setNeutralizerPigmentId] = useState('ultramarine')
  const [neutralizeStrength, setNeutralizeStrength] = useState(35)
  const [autoNeutralizer, setAutoNeutralizer] = useState(true)

  const [showRecipe, setShowRecipe] = useState(false)
  const [basicRecipe, setBasicRecipe] = useState<BasicRecipeResult | null>(null)

  // === Хуки ===
  const {
    paints,
    amountRefs,
    totalAmount,
    addPaint,
    removePaint,
    updatePaint,
    clearAllAmounts,
  } = usePaintMix(pigments)

  const {
    mixedColor,
    layers,
    coverageAdvice,
    neutralizeResult,
  } = useColorCalculations({
    pigments,
    paints,
    totalAmount,
    basePigmentId,
    coverageSystem,
    unwantedPigmentId,
    neutralizerPigmentId,
    neutralizeStrength,
    lang,
  })

  useEffect(() => {
    loadAllPigments()
      .then((loaded) => {
        setPigments(loaded)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!autoNeutralizer || pigments.length === 0) return
    const recommended = getOstwaldNeutralizer(unwantedPigmentId, pigments)
    setNeutralizerPigmentId(recommended)
  }, [unwantedPigmentId, pigments, autoNeutralizer])

  const getPigmentName = (pigmentId: string) => {
    const pigment = pigments.find((p) => p.id === pigmentId)
    if (!pigment) return '...'
    return lang === 'uk' ? pigment.name.uk : pigment.name.ru
  }

  const copyHex = async (hex?: string) => {
    const value = hex || mixedColor?.hex
    if (!value) return
    try {
      await navigator.clipboard.writeText(value.toUpperCase())
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error(err)
    }
  }

  const changeStrength = (delta: number) => {
    setNeutralizeStrength((prev) => Math.min(60, Math.max(10, prev + delta)))
  }

  const handleShowRecipe = () => {
    const neutralizer = pigments.find((p) => p.id === neutralizerPigmentId)
    if (!neutralizer?.spectrum) return

    const result = findBasicPaletteRecipe(neutralizer.spectrum)
    setBasicRecipe(result)
    setShowRecipe(true)
  }

  const isUk = lang === 'uk'

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen flex flex-col pt-safe px-4 pb-10"
    >
      {/* Header */}
      <div className="flex items-center mb-5 mt-4">
        <button onClick={onBack} className="p-2.5 -ml-2 text-[var(--color-ink)] opacity-70 hover:opacity-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-xl font-bold ml-1">
          {isUk ? 'Калькулятор кольору' : 'Калькулятор цвета'}
        </h1>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {/* ===== Блок смеси ===== */}
        <div className="bg-[var(--color-surface,#F5F1EA)] rounded-2xl p-4 shadow-sm z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold opacity-80">
              {isUk ? 'Склад суміші (цільовий колір)' : 'Состав смеси (целевой цвет)'}
            </h2>
            {totalAmount > 0 && (
              <button
                onClick={clearAllAmounts}
                className="text-xs text-red-500/80 font-medium px-2 py-1 rounded-md hover:bg-red-50"
              >
                {isUk ? 'Очистити' : 'Очистить'}
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-sm opacity-60 py-6 text-center">
              {isUk ? 'Завантаження пігментів...' : 'Загрузка пигментов...'}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {paints.map((paint) => (
                <div key={paint.id} className="flex items-center gap-2">
                  <PigmentSelector
                    pigments={pigments}
                    value={paint.pigmentId}
                    onChange={(newId) => updatePaint(paint.id, 'pigmentId', newId)}
                    lang={lang}
                  />
                  <input
                    ref={(el) => {
                      if (el) amountRefs.current.set(paint.id, el)
                      else amountRefs.current.delete(paint.id)
                    }}
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={paint.amount}
                    onChange={(e) => {
                      let val = e.target.value.replace(',', '.')
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        const num = parseFloat(val)
                        if (!isNaN(num) && num > 5000) val = '5000'
                        updatePaint(paint.id, 'amount', val)
                      }
                    }}
                    onBlur={(e) => {
                      let val = e.target.value.replace(',', '.')
                      if (val === '.' || val === '') {
                        updatePaint(paint.id, 'amount', '')
                        return
                      }
                      const num = parseFloat(val)
                      if (!isNaN(num)) updatePaint(paint.id, 'amount', String(Math.min(num, 5000)))
                    }}
                    className="w-16 md:w-20 flex-shrink-0 bg-white text-black border border-gray-200 rounded-lg px-2 py-2.5 text-center focus:outline-none focus:border-[#D8A35C]"
                    placeholder="0"
                    style={{ fontSize: '16px' }}
                  />
                  <span className="text-xs opacity-50 flex-shrink-0 w-6">мл</span>
                  <button
                    onClick={() => removePaint(paint.id)}
                    className="p-2.5 -mr-1 text-red-500/70 hover:text-red-600 hover:bg-red-50 rounded-full"
                    disabled={paints.length <= 1}
                    style={{ opacity: paints.length <= 1 ? 0.3 : 1 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addPaint}
            disabled={loading}
            className="mt-4 w-full py-3 rounded-xl border border-dashed border-[#D8A35C] text-[#D8A35C] text-sm font-medium hover:bg-[#D8A35C] hover:text-white transition-colors disabled:opacity-40"
          >
            {isUk ? '+ Додати пігмент' : '+ Добавить пигмент'}
          </button>
        </div>

        {/* ===== Блок режимов ===== */}
        <div className="bg-[#151210] text-[#F5F1EA] rounded-2xl p-5 shadow-md">
          {/* Переключатель режимов */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setMode('coverage')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                mode === 'coverage' ? 'bg-[#D8A35C] text-black' : 'bg-white/10 text-white/70'
              }`}
            >
              {isUk ? 'Укривистість / Слої' : 'Укрывистость / Слои'}
            </button>
            <button
              onClick={() => setMode('neutralize')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                mode === 'neutralize' ? 'bg-[#D8A35C] text-black' : 'bg-white/10 text-white/70'
              }`}
            >
              {isUk ? 'Нейтралізація' : 'Нейтрализация'}
            </button>
          </div>

          {/* Контент режимов */}
          {mode === 'coverage' && (
            <CoverageMode
              lang={lang}
              pigments={pigments}
              basePigmentId={basePigmentId}
              setBasePigmentId={setBasePigmentId}
              coverageSystem={coverageSystem}
              setCoverageSystem={setCoverageSystem}
              mixedColor={mixedColor}
              coverageAdvice={coverageAdvice}
              layers={layers}
              copied={copied}
              onCopyHex={() => copyHex()}
              paints={paints}
              totalAmount={totalAmount}
              getPigmentName={getPigmentName}
            />
          )}

          {mode === 'neutralize' && (
            <NeutralizeMode
              lang={lang}
              pigments={pigments}
              unwantedPigmentId={unwantedPigmentId}
              setUnwantedPigmentId={setUnwantedPigmentId}
              neutralizerPigmentId={neutralizerPigmentId}
              setNeutralizerPigmentId={setNeutralizerPigmentId}
              autoNeutralizer={autoNeutralizer}
              setAutoNeutralizer={setAutoNeutralizer}
              neutralizeStrength={neutralizeStrength}
              changeStrength={changeStrength}
              neutralizeResult={neutralizeResult}
              copied={copied}
              onCopyHex={copyHex}
              showRecipe={showRecipe}
              setShowRecipe={setShowRecipe}
              basicRecipe={basicRecipe}
              onShowRecipe={handleShowRecipe}
            />
          )}
        </div>
      </div>
    </motion.div>
  )
}
