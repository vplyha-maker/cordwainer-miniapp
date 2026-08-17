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

/** WCAG relative luminance → контрастный цвет текста */
function getContrastText(hex: string): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return '#000000'
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  const toLin = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  const L = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b)
  // порог \~0.179 ≈ контраст 4.5:1 к белому/чёрному
  return L > 0.179 ? '#1A1A1A' : '#FFFFFF'
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

  const selectedPigment = pigments.find((p) => p.id === value)
  const isUk = lang === 'uk'

  const bgColor = selectedPigment?.hex || '#2A2522'
  const textColor = selectedPigment?.hex ? getContrastText(selectedPigment.hex) : '#F5F1EA'

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
        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm cursor-text transition-colors border border-white/10"
        style={{ backgroundColor: bgColor, color: textColor }}
        onClick={() => setIsOpen(true)}
      >
        <div
          className="w-5 h-5 rounded-full flex-shrink-0 shadow-inner border border-black/20"
          style={{ backgroundColor: selectedPigment?.hex || '#666' }}
        />
        <input
          type="text"
          value={
            isOpen
              ? search
              : selectedPigment
                ? isUk
                  ? selectedPigment.name.uk
                  : selectedPigment.name.ru
                : ''
          }
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          placeholder={placeholder || (isUk ? 'Пошук кольору...' : 'Поиск цвета...')}
          className="flex-1 w-full bg-transparent outline-none truncate placeholder:opacity-50"
          style={{ fontSize: '16px', color: textColor }}
        />
        <svg
          className={`w-4 h-4 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
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
            className="absolute z-50 left-0 right-0 mt-2 bg-[#1C1816] border border-white/10 rounded-xl shadow-xl max-h-72 overflow-y-auto"
          >
            {filteredPigments.length === 0 ? (
              <div className="p-4 text-center text-sm text-[#F5F1EA]/50">
                {isUk ? 'Нічого не знайдено' : 'Ничего не найдено'}
              </div>
            ) : (
              filteredPigments.map((p) => (
                <div key={p.id} className="border-b border-white/5 last:border-0">
                  <div
                    className="flex items-center justify-between p-3 hover:bg-white/5 cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('.info-btn')) return
                      onChange(p.id)
                      setIsOpen(false)
                      setSearch('')
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-7 h-7 rounded-md border border-white/15 shadow-sm flex-shrink-0"
                        style={{ backgroundColor: p.hex || '#444' }}
                      />
                      <div className="flex flex-col truncate pr-2">
                        <span className="text-sm font-medium text-[#F5F1EA] truncate">
                          {isUk ? p.name.uk : p.name.ru}
                        </span>
                        <span className="text-xs text-[#F5F1EA]/45 truncate">
                          {getPigmentCategory(p.id, lang)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="info-btn p-2 text-[#F5F1EA]/40 hover:text-[#D8A35C] rounded-full"
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
                        className="overflow-hidden bg-white/5 text-xs text-[#F5F1EA]/70 px-3"
                      >
                        <div className="py-2 border-t border-white/5 flex flex-col gap-1 pb-3">
                          <div className="flex justify-between">
                            <span className="opacity-60">ID:</span>
                            <span className="font-mono">{p.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="opacity-60">EN:</span>
                            <span>{p.name.en}</span>
                          </div>
                          {p.hex && (
                            <div className="flex justify-between">
                              <span className="opacity-60">HEX:</span>
                              <span className="font-mono uppercase">{p.hex}</span>
                            </div>
                          )}
                          {p.spectrum && p.spectrum.length > 0 && (
                            <div className="mt-3 p-2 bg-black/20 rounded-lg">
                              <p className="text-xs text-[#F5F1EA]/50 mb-1">
                                {isUk ? 'Спектр відбиття' : 'Спектр отражения'}
                              </p>
                              <SpectrumGraph
                                spectrum={p.spectrum}
                                className="h-20 w-full text-[#F5F1EA]/30"
                                lineColor={p.hex || '#888'}
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
