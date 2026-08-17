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
        <svg
          className={`w-4 h-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
                          <div className="flex justify-between">
                            <span className="opacity-70">ID:</span>
                            <span className="font-mono">{p.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="opacity-70">EN:</span>
                            <span>{p.name.en}</span>
                          </div>
                          {p.hex && (
                            <div className="flex justify-between">
                              <span className="opacity-70">HEX:</span>
                              <span className="font-mono uppercase">{p.hex}</span>
                            </div>
                          )}
                          {p.spectrum && p.spectrum.length > 0 && (
                            <div className="mt-3 p-2 bg-black/5 rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">
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
