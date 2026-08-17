import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { loadAllPigments } from '../data/loadPigments'
import {
  mixSpectra,
  spectrumToRGB,
  rgbToHex,
  SpectrumPoint,
} from '../utils/colorScience'
import { SpectrumGraph } from '../components/SpectrumGraph'

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

interface PaintPart {
  id: string
  pigmentId: string
  amount: string
}

type BaseColor = 'light' | 'beige' | 'russet' | 'brown' | 'black'

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
          placeholder={isUk ? 'Пошук кольору...' : 'Поиск цвета...'}
          className="flex-1 w-full bg-transparent outline-none truncate"
          style={{ fontSize: '16px' }}
        />
        <svg
          className={`w-4 h-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
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
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('.info-btn')) return
                      onChange(p.id)
                      setIsOpen(false)
                      setSearch('')
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-7 h-7 rounded-md border border-gray-300 shadow-sm flex-shrink-0"
                        style={{ backgroundColor: p.hex || '#e5e7eb' }}
                      />
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
                      className="info-btn p-2 text-gray-400 hover:text-[#D8A35C] rounded-full hover:bg-orange-50 transition-colors flex-shrink-0"
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
// Логика рекомендаций для сапожника
// ==========================================

function getLuminance(r: number, g: number, b: number): number {
  // Относительная яркость (0–1)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function getAdvice(
  mixed: { r: number; g: number; b: number } | null,
  base: BaseColor,
  lang: Lang
) {
  const isUk = lang === 'uk'

  if (!mixed) {
    return {
      opacity: isUk ? '—' : '—',
      layers: isUk ? '—' : '—',
      note: isUk
        ? 'Введіть обсяги пігментів, щоб отримати рекомендацію'
        : 'Введите объёмы пигментов, чтобы получить рекомендацию',
      neutralize: null as string | null,
    }
  }

  const lum = getLuminance(mixed.r, mixed.g, mixed.b)

  // Яркость основ (приблизительно)
  const baseLum: Record<BaseColor, number> = {
    light: 0.85,
    beige: 0.72,
    russet: 0.38,
    brown: 0.22,
    black: 0.08,
  }

  const diff = lum - baseLum[base]

  let opacity = ''
  let layers = ''
  let note = ''

  if (diff > 0.35) {
    // Очень светлый поверх тёмного
    opacity = isUk ? 'Низька' : 'Низкая'
    layers = isUk ? '3–4+ шари' : '3–4+ слоя'
    note = isUk
      ? 'Світлий колір погано перекриває темну основу. Рекомендується ґрунт або акрилова (покривна) система. Анілінові барвники майже не перекриють.'
      : 'Светлый цвет плохо перекрывает тёмную основу. Рекомендуется грунт или акриловая (покрывная) система. Анилиновые красители почти не перекроют.'
  } else if (diff > 0.15) {
    opacity = isUk ? 'Середня' : 'Средняя'
    layers = isUk ? '2–3 шари' : '2–3 слоя'
    note = isUk
      ? 'Потрібна помірна кількість шарів. Акрил перекриє краще, анілін збереже текстуру, але шарів знадобиться більше.'
      : 'Потребуется умеренное количество слоёв. Акрил перекроет лучше, анилин сохранит текстуру, но слоёв понадобится больше.'
  } else if (diff > -0.1) {
    opacity = isUk ? 'Хороша' : 'Хорошая'
    layers = isUk ? '1–2 шари' : '1–2 слоя'
    note = isUk
      ? 'Колір близький до основи або темніший. Можна працювати тонкими шарами, зберігаючи текстуру шкіри.'
      : 'Цвет близок к основе или темнее. Можно работать тонкими слоями, сохраняя текстуру кожи.'
  } else {
    opacity = isUk ? 'Висока' : 'Высокая'
    layers = isUk ? '1–2 шари' : '1–2 слоя'
    note = isUk
      ? 'Темний колір добре перекриває світлу основу. Достатньо 1–2 шарів.'
      : 'Тёмный цвет хорошо перекрывает светлую основу. Достаточно 1–2 слоёв.'
  }

  // Нейтрализация по кругу Оствальда (упрощённо по доминирующему оттенку)
  let neutralize: string | null = null

  const { r, g, b } = mixed
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)

  // Желтоватый / оливковый
  if (r > 140 && g > 120 && b < 110 && r - b > 40) {
    neutralize = isUk
      ? 'Якщо основа дає жовтий відтінок — додайте фіолетовий пігмент (нейтралізація за Оствальдом).'
      : 'Если основа даёт жёлтый оттенок — добавьте фиолетовый пигмент (нейтрализация по Оствальду).'
  }
  // Рыжий / оранжевый
  else if (r > 150 && g > 80 && g < 140 && b < 90) {
    neutralize = isUk
      ? 'Рижий/оранжевий відтінок основи нейтралізується синім пігментом.'
      : 'Рыжий/оранжевый оттенок основы нейтрализуется синим пигментом.'
  }
  // Зеленоватый
  else if (g > r && g > b && g - r > 25) {
    neutralize = isUk
      ? 'Зелений відтінок нейтралізується червоним пігментом.'
      : 'Зелёный оттенок нейтрализуется красным пигментом.'
  }
  // Общий совет
  else {
    neutralize = isUk
      ? 'Завжди враховуйте колір основи. Небажаний жовтий нейтралізують фіолетовим, рижий — синім, зелений — червоним.'
      : 'Всегда учитывайте цвет основы. Нежелательный жёлтый нейтрализуют фиолетовым, рыжий — синим, зелёный — красным.'
  }

  return { opacity, layers, note, neutralize }
}

// ==========================================
// Основная страница
// ==========================================

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [baseColor, setBaseColor] = useState<BaseColor>('brown')

  const [paints, setPaints] = useState<PaintPart[]>([
    { id: '1', pigmentId: 'titanium_white', amount: '' },
    { id: '2', pigmentId: 'cadmium_yellow', amount: '' },
  ])

  const amountRefs = useRef<Record<string, HTMLInputElement | null>>({})

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

  const advice = useMemo(
    () => getAdvice(mixedColor?.rgb ?? null, baseColor, lang),
    [mixedColor, baseColor, lang]
  )

  const addPaint = () => {
    const newId = Math.random().toString(36).slice(2)
    setPaints([
      ...paints,
      {
        id: newId,
        pigmentId: pigments[0]?.id || 'titanium_white',
        amount: '',
      },
    ])
    setTimeout(() => {
      amountRefs.current[newId]?.focus()
    }, 50)
  }

  const removePaint = (id: string) => {
    if (paints.length <= 1) return
    setPaints(paints.filter((p) => p.id !== id))
  }

  const updatePaint = (id: string, field: keyof PaintPart, value: string) => {
    setPaints(paints.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const clearAllAmounts = () => {
    setPaints(paints.map((p) => ({ ...p, amount: '' })))
  }

  const getPigmentName = (pigmentId: string) => {
    const pigment = pigments.find((p) => p.id === pigmentId)
    if (!pigment) return '...'
    return lang === 'uk' ? pigment.name.uk : pigment.name.ru
  }

  const copyHex = async () => {
    if (!mixedColor) return
    try {
      await navigator.clipboard.writeText(mixedColor.hex.toUpperCase())
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  const isUk = lang === 'uk'

  const baseColors: Record<BaseColor, { hex: string; labelUk: string; labelRu: string }> = {
    light: { hex: '#E8E0D5', labelUk: 'Світлий', labelRu: 'Светлый' },
    beige: { hex: '#D2B48C', labelUk: 'Бежевий', labelRu: 'Бежевый' },
    russet: { hex: '#A0522D', labelUk: 'Рижий', labelRu: 'Рыжий' },
    brown: { hex: '#5C4033', labelUk: 'Коричневий', labelRu: 'Коричневый' },
    black: { hex: '#1A1512', labelUk: 'Чорний', labelRu: 'Чёрный' },
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen flex flex-col pt-safe px-4 pb-10"
    >
      {/* Header */}
      <div className="flex items-center mb-5 mt-4">
        <button
          onClick={onBack}
          className="p-2.5 -ml-2 text-[var(--color-ink)] opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-xl font-bold ml-1">
          {isUk ? 'Калькулятор кольору' : 'Калькулятор цвета'}
        </h1>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {/* ===== Состав смеси ===== */}
        <div className="bg-[var(--color-surface,#F5F1EA)] rounded-2xl p-4 shadow-sm z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold opacity-80">
              {isUk ? 'Склад суміші' : 'Состав смеси'}
            </h2>

            {totalAmount > 0 && (
              <button
                onClick={clearAllAmounts}
                className="text-xs text-red-500/80 hover:text-red-600 font-medium px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
              >
                {isUk ? 'Очистити обсяги' : 'Очистить объёмы'}
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
                      amountRefs.current[paint.id] = el
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
                      if (!isNaN(num)) {
                        updatePaint(paint.id, 'amount', String(Math.min(num, 5000)))
                      }
                    }}
                    className="w-16 md:w-20 flex-shrink-0 bg-white text-black border border-gray-200 rounded-lg px-2 py-2.5 text-center focus:outline-none focus:border-[#D8A35C] transition-colors"
                    placeholder="0"
                    style={{ fontSize: '16px' }}
                  />

                  <span className="text-xs opacity-50 flex-shrink-0 w-6">мл</span>

                  <button
                    onClick={() => removePaint(paint.id)}
                    className="p-2.5 -mr-1 text-red-500/70 hover:text-red-600 hover:bg-red-50 rounded-full flex-shrink-0 transition-all active:scale-90"
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
            className="mt-4 w-full py-3 rounded-xl border border-dashed border-[#D8A35C] text-[#D8A35C] text-sm font-medium hover:bg-[#D8A35C] hover:text-white transition-colors disabled:opacity-40 active:scale-[0.98]"
          >
            {isUk ? '+ Додати пігмент' : '+ Добавить пигмент'}
          </button>
        </div>

        {/* ===== Результат ===== */}
        <div className="bg-[#151210] text-[#F5F1EA] rounded-2xl p-5 shadow-md relative z-0">
          <h2 className="text-sm font-semibold opacity-70 mb-4">
            {isUk ? 'Результат змішування' : 'Результат смешивания'}
          </h2>

          {/* Большой цвет на фоне основы */}
          <div className="flex flex-col items-center mb-5">
            <div
              className="w-full max-w-[280px] aspect-square rounded-2xl border border-white/10 shadow-lg mb-4 transition-colors duration-300 flex items-center justify-center p-5"
              style={{ backgroundColor: baseColors[baseColor].hex }}
            >
              <div
                className="w-full h-full rounded-xl shadow-inner transition-colors duration-300 relative overflow-hidden"
                style={{ backgroundColor: mixedColor?.hex || '#2a2522' }}
              >
                {!mixedColor && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-white/40 text-center px-4 leading-relaxed">
                      {isUk
                        ? 'Введіть обсяги,\nщоб побачити колір'
                        : 'Введите объёмы,\nчтобы увидеть цвет'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {mixedColor ? (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-mono tracking-wider font-medium">
                    {mixedColor.hex.toUpperCase()}
                  </span>
                  <button
                    onClick={copyHex}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors active:scale-95"
                  >
                    {copied
                      ? (isUk ? 'Скопійовано' : 'Скопировано')
                      : (isUk ? 'Копіювати' : 'Копировать')}
                  </button>
                </div>
                <div className="text-xs opacity-50 font-mono">
                  RGB {mixedColor.rgb.r}, {mixedColor.rgb.g}, {mixedColor.rgb.b}
                </div>
              </div>
            ) : (
              <div className="text-sm opacity-40 font-mono tracking-wider">—</div>
            )}
          </div>

          {/* Выбор цвета основы */}
          <div className="mb-5">
            <div className="text-xs opacity-50 mb-2 font-medium uppercase tracking-wider">
              {isUk ? 'Колір основи (шкіри)' : 'Цвет основы (кожи)'}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.keys(baseColors) as BaseColor[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setBaseColor(key)}
                  className={`flex flex-col items-center gap-1.5 py-2 rounded-xl text-[10px] font-medium transition-all active:scale-95 border ${
                    baseColor === key
                      ? 'border-[#D8A35C] bg-[#D8A35C]/15 text-[#D8A35C]'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: baseColors[key].hex }}
                  />
                  <span>{isUk ? baseColors[key].labelUk : baseColors[key].labelRu}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Рекомендации мастеру */}
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs opacity-50 mb-3 font-medium uppercase tracking-wider">
              {isUk ? 'Рекомендація майстру' : 'Рекомендация мастеру'}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-[11px] opacity-50 mb-0.5">
                  {isUk ? 'Укривистість' : 'Укрывистость'}
                </div>
                <div className="text-sm font-semibold text-[#D8A35C]">
                  {advice.opacity}
                </div>
              </div>
              <div>
                <div className="text-[11px] opacity-50 mb-0.5">
                  {isUk ? 'Кількість шарів' : 'Количество слоёв'}
                </div>
                <div className="text-sm font-semibold text-[#D8A35C]">
                  {advice.layers}
                </div>
              </div>
            </div>

            <p className="text-[13px] leading-relaxed opacity-80 mb-3">
              {advice.note}
            </p>

            {advice.neutralize && (
              <div className="pt-3 border-t border-white/10">
                <div className="text-[11px] opacity-50 mb-1 font-medium">
                  {isUk ? 'Нейтралізація (коло Оствальда)' : 'Нейтрализация (круг Оствальда)'}
                </div>
                <p className="text-[13px] leading-relaxed opacity-80">
                  {advice.neutralize}
                </p>
              </div>
            )}
          </div>

          {/* Общий объём */}
          <div className="flex justify-between items-end mb-5 border-b border-white/10 pb-4">
            <span className="text-sm opacity-60">
              {isUk ? 'Загальний об’єм' : 'Общий объём'}
            </span>
            <span className="text-2xl font-bold tabular-nums">
              {totalAmount > 1000
                ? (totalAmount / 1000).toFixed(2) + ' л'
                : totalAmount.toFixed(1) + ' мл'}
            </span>
          </div>

          {/* Проценты + progress bars */}
          <div className="flex flex-col gap-3">
            {paints.map((paint) => {
              const paintAmount = parseFloat(paint.amount) || 0
              const percentage = totalAmount > 0 ? (paintAmount / totalAmount) * 100 : 0
              const pigment = pigments.find((p) => p.id === paint.pigmentId)
              const displayPercent =
                percentage === 0
                  ? '0%'
                  : percentage < 0.1
                    ? '<0.1%'
                    : percentage.toFixed(1) + '%'

              return (
                <div key={paint.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2.5 truncate pr-3 min-w-0">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/25 flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: pigment?.hex || '#666' }}
                      />
                      <span className="opacity-85 truncate text-[13px]">
                        {getPigmentName(paint.pigmentId)}
                      </span>
                    </div>
                    <span className="font-mono text-[#D8A35C] flex-shrink-0 text-[13px] tabular-nums">
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
        </div>
      </div>
    </motion.div>
  )
}
