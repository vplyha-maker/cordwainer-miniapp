import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useMemo, useRef } from 'react'

import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { loadAllPigments } from '../data/loadPigments'
import { SpectrumGraph } from '../components/SpectrumGraph'
import {
  mixSpectra,
  spectrumToRGB,
  rgbToHex,
  SpectrumPoint,
} from '../utils/colorScience'
import {
  CoverageSystem,
  getPureBasicPigments,
  getPigmentCategory,
  getOstwaldNeutralizer,
  simulateLayersKM,
  findBasicRecipe
} from '../utils/calculatorLogic'
import { usePaintMix } from '../hooks/usePaintMix'

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

type Mode = 'coverage' | 'neutralize'

const PigmentSelector = ({
  pigments,
  value,
  onChange,
  lang,
  placeholder,
}: {
  pigments: Pigment[]
  value: string
  onChange: (id: string) => void
  lang: Lang
  placeholder?: string
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedPigment = pigments.find((p) => p.id === value)
  const isUk = lang === 'uk'

  const filteredPigments = useMemo(() => {
    const term = search.toLowerCase()
    return pigments.filter((p) => {
      const nameLocal = isUk ? p.name.uk : p.name.ru
      return (
        nameLocal.toLowerCase().includes(term) ||
        p.name.en.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term)
      )
    })
  }, [pigments, search, isUk])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative flex-1 min-w-0" ref={wrapperRef}>
      <div
        className="flex items-center gap-2 bg-white text-black border border-gray-200 rounded-lg px-3 py-2.5 text-sm cursor-text focus-within:border-[#D8A35C] transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <div
          className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0 shadow-inner"
          style={{ backgroundColor: selectedPigment?.hex || '#ccc' }}
        />
        <input
          type="text"
          value={isOpen ? search : selectedPigment ? (isUk ? selectedPigment.name.uk : selectedPigment.name.ru) : ''}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          placeholder={placeholder || (isUk ? 'Пошук кольору...' : 'Поиск цвета...')}
          className="flex-1 w-full bg-transparent outline-none truncate"
          style={{ fontSize: '16px' }}
        />
        <svg className={`w-4 h-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto"
          >
            {filteredPigments.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {isUk ? 'Нічого не знайдено' : 'Ничего не найдено'}
              </div>
            ) : (
              filteredPigments.map((p) => (
                <div key={p.id} className="border-b border-gray-100 last:border-0">
                  <div
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('.info-btn')) return
                      onChange(p.id)
                      setIsOpen(false)
                      setSearch('')
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-md border border-gray-300 shadow-sm flex-shrink-0" style={{ backgroundColor: p.hex || '#e5e7eb' }} />
                      <div className="flex flex-col truncate pr-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {isUk ? p.name.uk : p.name.ru}
                        </span>
                        <span className="text-xs text-gray-500 truncate">
                          {getPigmentCategory(p.id, lang)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="info-btn p-2 text-gray-400 hover:text-[#D8A35C] rounded-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedId(expandedId === p.id ? null : p.id)
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </button>
                  </div>

                  <AnimatePresence>
                    {expandedId === p.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-gray-50 text-xs text-gray-600 px-3"
                      >
                        <div className="py-2 border-t border-gray-100 flex flex-col gap-1 pb-3">
                          <div className="flex justify-between"><span className="opacity-70">ID:</span><span className="font-mono">{p.id}</span></div>
                          <div className="flex justify-between"><span className="opacity-70">EN:</span><span>{p.name.en}</span></div>
                          {p.hex && <div className="flex justify-between"><span className="opacity-70">HEX:</span><span className="font-mono uppercase">{p.hex}</span></div>}
                          {p.spectrum && p.spectrum.length > 0 && (
                            <div className="mt-3 p-2 bg-black/5 rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">{isUk ? 'Спектр відбиття' : 'Спектр отражения'}</p>
                              <SpectrumGraph spectrum={p.spectrum} className="h-20 w-full text-gray-300" lineColor={p.hex || '#666'} />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

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
  const [basicRecipe, setBasicRecipe] = useState<ReturnType<typeof findBasicRecipe>>(null)

  // === Хук управления смесью ===
  const {
    paints,
    amountRefs,
    totalAmount,
    addPaint,
    removePaint,
    updatePaint,
    clearAllAmounts,
  } = usePaintMix(pigments)

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

  const mixedColor = useMemo(() => {
    if (pigments.length === 0 || totalAmount <= 0) return null
    const components: { spectrum: SpectrumPoint[]; volume: number }[] = []
    for (const paint of paints) {
      const pigment = pigments.find((p) => p.id === paint.pigmentId)
      const val = parseFloat(paint.amount) || 0
      if (pigment?.spectrum && val > 0) {
        components.push({ spectrum: pigment.spectrum, volume: val })
      }
    }
    if (components.length === 0) return null
    const mixedSpectrum = mixSpectra(components)
    const rgb = spectrumToRGB(mixedSpectrum)
    return { rgb, hex: rgbToHex(rgb), spectrum: mixedSpectrum }
  }, [paints, pigments, totalAmount])

  const layerData = useMemo(() => {
    if (!mixedColor?.spectrum) return null
    const basePigment = pigments.find((p) => p.id === basePigmentId)
    if (!basePigment?.spectrum) return null
    return simulateLayersKM(basePigment.spectrum, mixedColor.spectrum, coverageSystem)
  }, [basePigmentId, mixedColor, pigments, coverageSystem])

  const layers = useMemo(() => {
    if (!layerData) return null
    return {
      layer1: spectrumToRGB(layerData.layer1),
      layer2: spectrumToRGB(layerData.layer2),
      layer3: spectrumToRGB(layerData.layer3),
      final: spectrumToRGB(layerData.final),
    }
  }, [layerData])

  const coverageAdvice = useMemo(() => {
    if (!layerData) return null
    const { deltaL } = layerData
    const isUk = lang === 'uk'

    let opacityLabel = ''
    let layersLabel = ''
    let note = ''

    if (deltaL > 0.4) {
      opacityLabel = isUk ? 'Низька' : 'Низкая'
      layersLabel = coverageSystem === 'aniline' ? (isUk ? '4–5+ шарів' : '4–5+ слоёв') : (isUk ? '3–4 шари' : '3–4 слоя')
      note = isUk
        ? 'Велика різниця яскравості. Рекомендується ґрунт + акрилова система.'
        : 'Большая разница яркости. Рекомендуется грунт + акриловая система.'
    } else if (deltaL > 0.22) {
      opacityLabel = isUk ? 'Середня' : 'Средняя'
      layersLabel = coverageSystem === 'aniline' ? (isUk ? '3–4 шари' : '3–4 слоя') : (isUk ? '2–3 шари' : '2–3 слоя')
      note = isUk
        ? 'Потрібна помірна кількість шарів. Акрил перекриє швидше.'
        : 'Потребуется умеренное количество слоёв. Акрил перекроет быстрее.'
    } else {
      opacityLabel = isUk ? 'Висока' : 'Высокая'
      layersLabel = isUk ? '1–2 шари' : '1–2 слоя'
      note = isUk
        ? 'Колір добре лягає на основу. Можна працювати тонкими шарами.'
        : 'Цвет хорошо ложится на основу. Можно работать тонкими слоями.'
    }

    return { opacityLabel, layersLabel, note }
  }, [layerData, coverageSystem, lang])

  const neutralizeResult = useMemo(() => {
    const unwanted = pigments.find((p) => p.id === unwantedPigmentId)
    const neutralizer = pigments.find((p) => p.id === neutralizerPigmentId)
    if (!unwanted?.spectrum || !neutralizer?.spectrum) return null

    const components = [
      { spectrum: unwanted.spectrum, volume: 100 - neutralizeStrength },
      { spectrum: neutralizer.spectrum, volume: neutralizeStrength },
    ]
    const mixed = mixSpectra(components)
    const rgb = spectrumToRGB(mixed)
    return { rgb, hex: rgbToHex(rgb) }
  }, [pigments, unwantedPigmentId, neutralizerPigmentId, neutralizeStrength])

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
    const basic = getPureBasicPigments(pigments)
    const result = findBasicRecipe(neutralizer.spectrum, basic)
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
        <div className="bg-[var(--color-surface,#F5F1EA)] rounded-2xl p-4 shadow-sm z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold opacity-80">
              {isUk ? 'Склад суміші (цільовий колір)' : 'Состав смеси (целевой цвет)'}
            </h2>
            {totalAmount > 0 && (
              <button onClick={clearAllAmounts} className="text-xs text-red-500/80 font-medium px-2 py-1 rounded-md hover:bg-red-50">
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

        <div className="bg-[#151210] text-[#F5F1EA] rounded-2xl p-5 shadow-md">
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setMode('coverage')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === 'coverage' ? 'bg-[#D8A35C] text-black' : 'bg-white/10 text-white/70'}`}
            >
              {isUk ? 'Укривистість / Слої' : 'Укрывистость / Слои'}
            </button>
            <button
              onClick={() => setMode('neutralize')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === 'neutralize' ? 'bg-[#D8A35C] text-black' : 'bg-white/10 text-white/70'}`}
            >
              {isUk ? 'Нейтралізація' : 'Нейтрализация'}
            </button>
          </div>

          {mode === 'coverage' && (
            <div className="flex flex-col gap-5">
              <div>
                <div className="text-xs opacity-50 mb-2 font-medium uppercase tracking-wider">
                  {isUk ? 'Колір основи (шкіри)' : 'Цвет основы (кожи)'}
                </div>
                <PigmentSelector pigments={pigments} value={basePigmentId} onChange={setBasePigmentId} lang={lang} />
              </div>

              <div>
                <div className="text-xs opacity-50 mb-2 font-medium uppercase tracking-wider">
                  {isUk ? 'Тип системи' : 'Тип системы'}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCoverageSystem('aniline')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${coverageSystem === 'aniline' ? 'bg-[#D8A35C] text-black' : 'bg-white/10 text-white/70'}`}
                  >
                    {isUk ? 'Анілін (прозорий)' : 'Анилин (прозрачный)'}
                  </button>
                  <button
                    onClick={() => setCoverageSystem('acrylic')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${coverageSystem === 'acrylic' ? 'bg-[#D8A35C] text-black' : 'bg-white/10 text-white/70'}`}
                  >
                    {isUk ? 'Акрил (укривистий)' : 'Акрил (укрывистый)'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-xs opacity-50 mb-2">{isUk ? 'Цільовий колір суміші' : 'Целевой цвет смеси'}</div>
                <div className="w-28 h-28 rounded-2xl border-2 border-white/15 shadow-lg mb-2" style={{ backgroundColor: mixedColor?.hex || '#2a2522' }} />
                {mixedColor ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{mixedColor.hex.toUpperCase()}</span>
                    <button onClick={() => copyHex()} className="px-2.5 py-1 rounded-lg bg-white/10 text-xs">
                      {copied ? '✓' : (isUk ? 'Копіювати' : 'Копировать')}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs opacity-40">{isUk ? 'Введіть обсяги вище' : 'Введите объёмы выше'}</span>
                )}
              </div>

              {coverageAdvice && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-[11px] opacity-50 mb-0.5">{isUk ? 'Укривистість' : 'Укрывистость'}</div>
                      <div className="text-sm font-semibold text-[#D8A35C]">{coverageAdvice.opacityLabel}</div>
                    </div>
                    <div>
                      <div className="text-[11px] opacity-50 mb-0.5">{isUk ? 'Рекомендовано шарів' : 'Рекомендуемо слоёв'}</div>
                      <div className="text-sm font-semibold text-[#D8A35C]">{coverageAdvice.layersLabel}</div>
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
                        <div className="w-full aspect-square rounded-xl border border-white/15" style={{ backgroundColor: rgbToHex(item.color) }} />
                        <span className="text-[10px] opacity-60 text-center">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'neutralize' && (
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
                    <span className="text-2xl font-bold text-[#D8A35C] tabular-nums">{neutralizeStrength}%</span>
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
                  <div className="text-xs opacity-50 mb-2">{isUk ? 'Результат тонування' : 'Результат тонирования'}</div>
                  <div className="w-32 h-32 rounded-2xl border-2 border-white/15 shadow-lg mb-3" style={{ backgroundColor: neutralizeResult.hex }} />
                  <div className="flex items-center gap-2 mb-4">
                    <span className="font-mono text-sm">{neutralizeResult.hex.toUpperCase()}</span>
                    <button onClick={() => copyHex(neutralizeResult.hex)} className="px-2.5 py-1 rounded-lg bg-white/10 text-xs">
                      {copied ? '✓' : (isUk ? 'Копіювати' : 'Копировать')}
                    </button>
                  </div>

                  <button
                    onClick={handleShowRecipe}
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
                      {isUk ? 'Рецепт з базової палітри (±20 мл)' : 'Рецепт из базовой палитры (±20 мл)'}
                    </div>
                    <button onClick={() => setShowRecipe(false)} className="text-white/50 text-lg leading-none">×</button>
                  </div>

                  <div className="flex flex-col gap-2 mb-4">
                    {basicRecipe.recipe.map((item) => (
                      <div key={item.pigment.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: item.pigment.hex }} />
                          <span>{isUk ? item.pigment.name.uk : item.pigment.name.ru}</span>
                        </div>
                        <span className="font-mono text-[#D8A35C]">{item.ml} мл</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg border border-white/15" style={{ backgroundColor: basicRecipe.resultHex }} />
                    <div className="text-xs opacity-70">
                      <div>ΔE ≈ {basicRecipe.deltaE}</div>
                      <div className="opacity-50">
                        {basicRecipe.deltaE < 8
                          ? (isUk ? 'Дуже близький' : 'Очень близкий')
                          : basicRecipe.deltaE < 15
                            ? (isUk ? 'Прийнятний' : 'Приемлемый')
                            : (isUk ? 'Приблизний' : 'Приблизительный')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'coverage' && (
            <>
              <div className="flex justify-between items-end mt-6 mb-4 border-t border-white/10 pt-4">
                <span className="text-sm opacity-60">{isUk ? 'Загальний об’єм суміші' : 'Общий объём смеси'}</span>
                <span className="text-xl font-bold tabular-nums">
                  {totalAmount > 1000 ? (totalAmount / 1000).toFixed(2) + ' л' : totalAmount.toFixed(1) + ' мл'}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {paints.map((paint) => {
                  const paintAmount = parseFloat(paint.amount) || 0
                  const percentage = totalAmount > 0 ? (paintAmount / totalAmount) * 100 : 0
                  const pigment = pigments.find((p) => p.id === paint.pigmentId)
                  const displayPercent = percentage === 0 ? '0%' : percentage < 0.1 ? '<0.1%' : percentage.toFixed(1) + '%'

                  return (
                    <div key={paint.id} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2.5 truncate pr-3 min-w-0">
                          <div className="w-3.5 h-3.5 rounded-full border border-white/25 flex-shrink-0" style={{ backgroundColor: pigment?.hex || '#666' }} />
                          <span className="opacity-85 truncate text-[13px]">{getPigmentName(paint.pigmentId)}</span>
                        </div>
                        <span className="font-mono text-[#D8A35C] text-[13px] tabular-nums">{displayPercent}</span>
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
          )}
        </div>
      </div>
    </motion.div>
  )
}
