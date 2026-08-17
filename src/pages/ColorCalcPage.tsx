import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { loadAllPigments } from '../data/loadPigments'
import { mixSpectra, spectrumToRGB, rgbToHex, SpectrumPoint } from '../utils/colorScience'
// Добавлен импорт графика (убедись, что путь к файлу верный)
import { SpectrumGraph } from './SpectrumGraph' 

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

interface PaintPart {
  id: string
  pigmentId: string
  amount: string
}

// Хелпер для определения категории пигмента на основе его ID
const getPigmentCategory = (id: string, lang: Lang) => {
  const isUk = lang === 'uk'
  if (id.includes('cadmium')) return isUk ? 'Кадмієва група' : 'Кадмиевая группа'
  if (id.includes('cobalt')) return isUk ? 'Кобальтова група' : 'Кобальтовая группа'
  if (id.includes('white') || ['lithopone', 'chalk', 'gypsum'].includes(id)) return isUk ? 'Білила / Наповнювачі' : 'Белила / Наполнители'
  if (id.includes('ochre') || id.includes('sienna') || id.includes('umber') || id === 'green_earth') return isUk ? 'Земляні пігменти' : 'Земляные пигменты'
  if (id.includes('black') || id === 'bitumen') return isUk ? 'Чорні / Вуглецеві' : 'Черные / Углеродные'
  if (id.includes('phthalo')) return isUk ? 'Фталоціаніни (синтетика)' : 'Фталоцианины (синтетика)'
  if (['ultramarine', 'ultramarine_nat', 'prussian_blue', 'azurite'].includes(id)) return isUk ? 'Традиційні сині' : 'Традиционные синие'
  return isUk ? 'Органічний / Інший' : 'Органический / Прочий'
}

// ==========================================
// UX Компонент: Визуальный селектор пигментов
// ==========================================
const PigmentSelector = ({
  pigments,
  value,
  onChange,
  lang,
}: {
  pigments: Pigment[]
  value: string
  onChange: (id: string) => void
  lang: Lang
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedPigment = pigments.find((p) => p.id === value)
  const isUk = lang === 'uk'

  // Живой поиск по локализованному названию, английскому названию и ID
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
      {/* Инпут автодополнения */}
      <div
        className="flex items-center gap-2 bg-white text-black border border-gray-200 rounded-lg px-3 py-2 text-sm cursor-text focus-within:border-[#D8A35C] transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <div
          className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0 shadow-inner"
          style={{ backgroundColor: selectedPigment?.hex || '#ccc' }}
        />
        <input
          type="text"
          value={isOpen ? search : selectedPigment ? (isUk ? selectedPigment.name.uk : selectedPigment.name.ru) : ''}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          placeholder={isUk ? 'Пошук кольору...' : 'Поиск цвета...'}
          className="flex-1 w-full bg-transparent outline-none truncate"
        />
        <svg
          className={`w-4 h-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Выпадающий список */}
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
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('.info-btn')) return;
                      onChange(p.id)
                      setIsOpen(false)
                      setSearch('')
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Выкрас */}
                      <div
                        className="w-6 h-6 rounded-md border border-gray-300 shadow-sm flex-shrink-0"
                        style={{ backgroundColor: p.hex || '#e5e7eb' }}
                      />
                      <div className="flex flex-col truncate pr-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {isUk ? p.name.uk : p.name.ru}
                        </span>
                        {/* Подсказка категории (Progressive Disclosure - Уровень 1) */}
                        <span className="text-xs text-gray-500 truncate">
                          {getPigmentCategory(p.id, lang)}
                        </span>
                      </div>
                    </div>

                    <button
                      className="info-btn p-1.5 text-gray-400 hover:text-[#D8A35C] rounded-full hover:bg-orange-50 transition-colors flex-shrink-0"
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

                  {/* Progressive Disclosure - Уровень 2: Детали из вашего интерфейса Pigment */}
                  <AnimatePresence>
                    {expandedId === p.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-gray-50 text-xs text-gray-600 px-3"
                      >
                        <div className="py-2 border-t border-gray-100 flex flex-col gap-1 pb-3">
                          <div className="flex justify-between">
                            <span className="opacity-70">ID:</span>
                            <span className="font-mono text-gray-800">{p.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="opacity-70">EN:</span>
                            <span className="text-gray-800 font-medium">{p.name.en}</span>
                          </div>
                          {p.hex && (
                            <div className="flex justify-between">
                              <span className="opacity-70">HEX:</span>
                              <span className="font-mono text-gray-800 uppercase">{p.hex}</span>
                            </div>
                          )}
                          
                          {/* Интеграция компонента спектра */}
                          {p.spectrum && p.spectrum.length > 0 && (
                            <div className="mt-3 p-2 bg-black/5 rounded-lg border border-black/5">
                              <p className="text-xs text-gray-500 mb-1 font-medium">
                                {isUk ? 'Спектр відбиття' : 'Спектр отражения'}
                              </p>
                              <SpectrumGraph 
                                spectrum={p.spectrum} 
                                className="h-20 w-full text-gray-300" 
                                lineColor={p.hex || '#666'} 
                              />
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

// ==========================================
// Основная страница калькулятора
// ==========================================
export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)

  const [paints, setPaints] = useState<PaintPart[]>([
    { id: '1', pigmentId: 'titanium_white', amount: '' },
    { id: '2', pigmentId: 'cadmium_yellow', amount: '' },
  ])

  useEffect(() => {
    loadAllPigments()
      .then((loaded: Pigment[]) => {
        setPigments(loaded)
        setLoading(false)
      })
      .catch((err: unknown) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const totalAmount = paints.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

  const mixedColor = useMemo(() => {
    if (pigments.length === 0 || totalAmount <= 0) return null

    const components: { spectrum: SpectrumPoint[]; volume: number }[] = []

    for (const paint of paints) {
      const pigment = pigments.find((p) => p.id === paint.pigmentId)
      const val = parseFloat(paint.amount) || 0
      if (pigment?.spectrum && val > 0) {
        components.push({
          spectrum: pigment.spectrum,
          volume: val,
        })
      }
    }

    if (components.length === 0) return null

    const mixedSpectrum = mixSpectra(components)
    const rgb = spectrumToRGB(mixedSpectrum)

    return {
      rgb,
      hex: rgbToHex(rgb),
    }
  }, [paints, pigments, totalAmount])

  const addPaint = () => {
    setPaints([
      ...paints,
      {
        id: Math.random().toString(36).slice(2),
        pigmentId: pigments[0]?.id || 'titanium_white',
        amount: '',
      },
    ])
  }

  const removePaint = (id: string) => {
    if (paints.length <= 1) return
    setPaints(paints.filter((p) => p.id !== id))
  }

  const updatePaint = (id: string, field: keyof PaintPart, value: string) => {
    setPaints(paints.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const getPigmentName = (pigmentId: string) => {
    const pigment = pigments.find((p) => p.id === pigmentId)
    if (!pigment) return '...'
    return lang === 'uk' ? pigment.name.uk : pigment.name.ru
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen flex flex-col pt-safe px-4 pb-8"
    >
      <div className="flex items-center mb-6 mt-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-[var(--color-ink)] opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-xl font-bold ml-2">
          {lang === 'uk' ? 'Калькулятор кольору' : 'Калькулятор цвета'}
        </h1>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-[var(--color-surface,#F5F1EA)] rounded-2xl p-4 shadow-sm z-10">
          <h2 className="text-sm font-semibold mb-4 opacity-80">
            {lang === 'uk' ? 'Склад суміші' : 'Состав смеси'}
          </h2>

          {loading ? (
            <div className="text-sm opacity-60 py-4 text-center">
              {lang === 'uk' ? 'Завантаження пігментів...' : 'Загрузка пигментов...'}
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
                    type="text"
                    inputMode="decimal"
                    value={paint.amount}
                    onChange={(e) => {
                      let val = e.target.value.replace(',', '.')
                      if (/^\d*\.?\d*$/.test(val)) {
                        if (parseFloat(val) > 5000) val = '5000'
                        updatePaint(paint.id, 'amount', val)
                      }
                    }}
                    className="w-16 md:w-20 flex-shrink-0 bg-white text-black border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-[#D8A35C] transition-colors"
                    placeholder="0"
                  />

                  <span className="text-xs opacity-50 flex-shrink-0">мл</span>

                  <button
                    onClick={() => removePaint(paint.id)}
                    className="p-2 text-red-500 opacity-70 hover:opacity-100 flex-shrink-0 transition-opacity"
                    disabled={paints.length <= 1}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            className="mt-4 w-full py-2.5 rounded-lg border border-dashed border-[#D8A35C] text-[#D8A35C] text-sm font-medium hover:bg-[#D8A35C] hover:text-white transition-colors disabled:opacity-40"
          >
            {lang === 'uk' ? '+ Додати колір' : '+ Добавить цвет'}
          </button>
        </div>

        <div className="bg-[#151210] text-[#F5F1EA] rounded-2xl p-6 shadow-md mt-2 relative z-0">
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-32 h-32 rounded-2xl border-2 border-white/20 shadow-lg mb-3 transition-colors duration-300"
              style={{ backgroundColor: mixedColor?.hex || '#333' }}
            />
            <div className="text-sm opacity-70 font-mono tracking-wider">
              {mixedColor ? mixedColor.hex.toUpperCase() : '—'}
            </div>
          </div>

          <div className="flex justify-between items-end mb-4 border-b border-gray-700 pb-4">
            <span className="text-sm opacity-70">
              {lang === 'uk' ? 'Загальний об’єм:' : 'Общий объем:'}
            </span>
            <span className="text-2xl font-bold">
              {totalAmount > 1000
                ? (totalAmount / 1000).toFixed(2) + ' л'
                : totalAmount.toFixed(1) + ' мл'}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {paints.map((paint) => {
              const paintAmount = parseFloat(paint.amount) || 0
              const percentage =
                totalAmount > 0
                  ? ((paintAmount / totalAmount) * 100).toFixed(1)
                  : '0.0'

              const pigment = pigments.find((p) => p.id === paint.pigmentId)

              return (
                <div key={paint.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 truncate pr-4 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full border border-white/30 flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: pigment?.hex || '#666' }}
                    />
                    <span className="opacity-80 truncate">
                      {getPigmentName(paint.pigmentId)}
                    </span>
                  </div>
                  <span className="font-mono text-[#D8A35C] flex-shrink-0">{percentage}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
