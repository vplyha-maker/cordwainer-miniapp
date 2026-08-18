import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { SpectrumGraph } from './SpectrumGraph'
import { getPigmentCategory } from '../utils/calculatorLogic'

interface PigmentSelectorProps {
  pigments: Pigment[]
  value: string
  onChange: (id: string) => void
  lang: Lang
  placeholder?: string
}

function getContrastText(hex: string): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return '#000000'
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  const toLin = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  const L = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b)
  return L > 0.179 ? '#1A1A1A' : '#FFFFFF'
}

/** Достаёт CI-код из названия: "Піррол червоний (PR 254)" → "PR 254" */
function extractCI(name: string): string | null {
  const m = name.match(/\((P[A-Z]{0,2}\s?\d+[A-Za-z.]*)\)/i)
  return m ? m[1].replace(/\s+/g, ' ').trim() : null
}

/** Короткое имя без CI-кода в скобках */
function shortName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

export function PigmentSelector({
  pigments,
  value,
  onChange,
  lang,
  placeholder,
}: PigmentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedPigment = pigments.find((p) => p.id === value)
  const isUk = lang === 'uk'

  const displayName = selectedPigment
    ? isUk
      ? selectedPigment.name.uk
      : selectedPigment.name.ru
    : ''

  const bgColor = selectedPigment?.hex || '#2A2522'
  const textColor = selectedPigment?.hex
    ? getContrastText(selectedPigment.hex)
    : '#F5F1EA'

  const filteredPigments = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return pigments

    return pigments.filter((p) => {
      const uk = p.name.uk.toLowerCase()
      const ru = p.name.ru.toLowerCase()
      const en = p.name.en.toLowerCase()
      const id = p.id.toLowerCase()
      const hex = (p.hex || '').toLowerCase()
      const cat = getPigmentCategory(p.id, lang).toLowerCase()
      return (
        uk.includes(term) ||
        ru.includes(term) ||
        en.includes(term) ||
        id.includes(term) ||
        hex.includes(term) ||
        cat.includes(term)
      )
    })
  }, [pigments, search, lang])

  // Группировка по категории
  const grouped = useMemo(() => {
    const map = new Map<string, Pigment[]>()
    for (const p of filteredPigments) {
      const cat = getPigmentCategory(p.id, lang)
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(p)
    }
    return Array.from(map.entries())
  }, [filteredPigments, lang])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
        setExpandedId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (id: string) => {
    onChange(id)
    setIsOpen(false)
    setSearch('')
    setExpandedId(null)
  }

  return (
    <div className="relative flex-1 min-w-0" ref={wrapperRef}>
      {/* ===== Закрытое состояние (кнопка) ===== */}
      <button
        type="button"
        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors border border-white/10 active:scale-[0.99]"
        style={{ backgroundColor: bgColor, color: textColor }}
        onClick={() => {
          setIsOpen(true)
          setSearch('')
        }}
      >
        <div
          className="w-6 h-6 rounded-md flex-shrink-0 shadow-inner border border-black/15"
          style={{ backgroundColor: selectedPigment?.hex || '#666' }}
        />
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span
            className="text-[13px] font-semibold leading-tight"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {selectedPigment ? shortName(displayName) : isUk ? 'Оберіть пігмент' : 'Выберите пигмент'}
          </span>
          {selectedPigment && (
            <span className="text-[10px] opacity-70 leading-none">
              {extractCI(displayName) ||
                (selectedPigment.hex ? selectedPigment.hex.toUpperCase() : '')}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 opacity-60 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* ===== Выпадающий список ===== */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[60] left-0 right-0 mt-2 bg-[#1C1816] border border-white/12 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              // На узких экранах растягиваем почти на всю ширину
              minWidth: 'min(100vw - 32px, 340px)',
              maxWidth: 'calc(100vw - 24px)',
            }}
          >
            {/* Поиск */}
            <div className="sticky top-0 z-10 bg-[#1C1816] border-b border-white/8 px-3 py-2.5">
              <div className="flex items-center gap-2 bg-white/8 rounded-xl px-3 py-2">
                <svg
                  className="w-4 h-4 text-[#F5F1EA]/40 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3-3" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    isUk
                      ? 'Пошук: назва, CI, HEX…'
                      : 'Поиск: название, CI, HEX…'
                  }
                  className="flex-1 bg-transparent outline-none text-[14px] text-[#F5F1EA] placeholder:text-[#F5F1EA]/35"
                  style={{ fontSize: '16px' }}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {search && (
                  <button
                    type="button"
                    className="text-[#F5F1EA]/40 text-xs px-1"
                    onClick={() => setSearch('')}
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[10px] text-[#F5F1EA]/30 px-0.5">
                {filteredPigments.length}{' '}
                {isUk ? 'пігментів' : 'пигментов'}
              </p>
            </div>

            {/* Список */}
            <div className="max-h-[55vh] overflow-y-auto overscroll-contain">
              {filteredPigments.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#F5F1EA]/45">
                  {isUk ? 'Нічого не знайдено' : 'Ничего не найдено'}
                </div>
              ) : (
                grouped.map(([category, items]) => (
                  <div key={category}>
                    <div className="sticky top-0 z-[1] px-3 py-1.5 bg-[#241F1C] border-y border-white/5">
                      <span className="text-[10px] font-semibold tracking-wide uppercase text-[#D8A35C]/80">
                        {category}
                      </span>
                    </div>

                    {items.map((p) => {
                      const name = isUk ? p.name.uk : p.name.ru
                      const ci = extractCI(name)
                      const isSelected = p.id === value
                      const isExpanded = expandedId === p.id

                      return (
                        <div
                          key={p.id}
                          className={`border-b border-white/5 last:border-0 ${
                            isSelected ? 'bg-[#D8A35C]/12' : ''
                          }`}
                        >
                          <div
                            className="flex items-start gap-3 px-3 py-3 active:bg-white/5 cursor-pointer"
                            onClick={() => handleSelect(p.id)}
                          >
                            <div
                              className="w-9 h-9 rounded-lg border border-white/15 shadow-sm flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: p.hex || '#444' }}
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-[14px] font-medium text-[#F5F1EA] leading-snug">
                                    {shortName(name)}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                                    {ci && (
                                      <span className="text-[11px] font-mono text-[#D8A35C]/90">
                                        {ci}
                                      </span>
                                    )}
                                    {p.hex && (
                                      <span className="text-[11px] font-mono text-[#F5F1EA]/45">
                                        {p.hex.toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[#F5F1EA]/40 mt-0.5">
                                    {p.name.en}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  className="info-btn p-1.5 -mr-1 text-[#F5F1EA]/35 active:text-[#D8A35C] rounded-full flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedId(isExpanded ? null : p.id)
                                  }}
                                  aria-label="Info"
                                >
                                  <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-black/25"
                              >
                                <div className="px-3 pb-3 pt-1 text-[12px] text-[#F5F1EA]/70 space-y-1.5">
                                  <div className="flex justify-between gap-2">
                                    <span className="opacity-50">ID</span>
                                    <span className="font-mono text-right break-all">
                                      {p.id}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-2">
                                    <span className="opacity-50">EN</span>
                                    <span className="text-right">{p.name.en}</span>
                                  </div>
                                  {p.hex && (
                                    <div className="flex justify-between gap-2">
                                      <span className="opacity-50">HEX</span>
                                      <span className="font-mono">
                                        {p.hex.toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  {p.spectrum && p.spectrum.length > 0 && (
                                    <div className="mt-2 p-2 bg-black/30 rounded-lg">
                                      <p className="text-[10px] text-[#F5F1EA]/45 mb-1">
                                        {isUk
                                          ? 'Спектр відбиття'
                                          : 'Спектр отражения'}
                                      </p>
                                      <SpectrumGraph
                                        spectrum={p.spectrum}
                                        className="h-16 w-full text-[#F5F1EA]/25"
                                        lineColor={p.hex || '#888'}
                                      />
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
