import { useState, useMemo } from 'react'
import type { Lang } from '../App'
import type { Pigment } from '../data/pigments'
import { getPigmentLore } from '../data/pigmentLore'
import { getPigmentCategory } from '../utils/calculatorLogic'

interface PigmentSelectorProps {
  pigments: Pigment[]
  value: string
  onChange: (newId: string) => void
  lang: Lang
  onInspect?: (pigmentId: string) => void
}

type PigmentGroupMap = Map<string, Pigment[]>

export function PigmentSelector({
  pigments,
  value,
  onChange,
  lang,
  onInspect,
}: PigmentSelectorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedCat, setSelectedCat] = useState<string>('ALL')

  const hairline = 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)'

  const selected = useMemo(
    () => pigments.find((p) => p.id === value),
    [pigments, value]
  )

  const selectedLore = useMemo(
    () => getPigmentLore(selected, lang),
    [selected, lang]
  )

  const t = {
    ru: {
      searchPlaceholder: 'Поиск: название, индекс CI, HEX…',
      allCategories: 'Весь архив',
      selectTitle: 'Архив пигментов',
      close: 'Закрыть',
      unknown: 'Выберите пигмент',
      dossier: 'Паспорт пигмента',
    },
    uk: {
      searchPlaceholder: 'Пошук: назва, індекс CI, HEX…',
      allCategories: 'Увесь архів',
      selectTitle: 'Архів пігментів',
      close: 'Закрити',
      unknown: 'Оберіть пігмент',
      dossier: 'Паспорт пігменту',
    },
    de: {
      searchPlaceholder: 'Suche: Name, CI-Code, HEX…',
      allCategories: 'Alle',
      selectTitle: 'Pigment-Archiv',
      close: 'Schließen',
      unknown: 'Pigment wählen',
      dossier: 'Pigment-Pass',
    },
  }[lang]

  const getLocalizedName = (p: Pigment | undefined) => {
    if (!p) return t.unknown
    if (lang === 'uk') return p.name.uk || p.name.ru
    if (lang === 'de') return p.name.de || p.name.en || p.name.ru
    return p.name.ru
  }

  const selectablePigments = useMemo(
    () => pigments.filter((p) => p.id !== 'cardboard'),
    [pigments]
  )

  const categories = useMemo(() => {
    const set = new Set<string>()
    selectablePigments.forEach((p) => set.add(getPigmentCategory(p.id, lang)))
    return ['ALL', ...Array.from(set)]
  }, [selectablePigments, lang])

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = selectablePigments.filter((p) => {
      const cat = getPigmentCategory(p.id, lang)
      if (selectedCat !== 'ALL' && cat !== selectedCat) return false
      if (!q) return true
      const lore = getPigmentLore(p, lang)
      const haystack = [
        p.id,
        p.name.ru,
        p.name.uk,
        p.name.en,
        p.name.de,
        p.hex || '',
        lore.code,
        ...lore.whereToBuy.leatherBrands,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })

    const map: PigmentGroupMap = new Map()
    matches.forEach((p) => {
      const cat = getPigmentCategory(p.id, lang)
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(p)
    })
    return {
      total: matches.length,
      groups: Array.from(map.entries()),
    }
  }, [selectablePigments, query, selectedCat, lang])

  const shortCode = selectedLore.code.split('·')[0].trim()

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuery('')
          setOpen(true)
        }}
        className="w-full flex items-center justify-between gap-3 py-1.5 px-2 rounded-xl text-left cursor-pointer transition-colors"
        style={{
          background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 4%, transparent)',
          color: 'var(--color-ink, #F4F0E8)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className="w-8 h-8 rounded-lg shrink-0"
            style={{
              backgroundColor: selected?.hex || '#CCCCCC',
              border: '1px solid rgba(0,0,0,0.2)',
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-sans font-semibold leading-tight truncate">
              {getLocalizedName(selected)}
            </div>
            <div className="text-[12px] font-mono opacity-60 mt-0.5 flex items-center gap-1.5 truncate">
              <span>{(selected?.hex || '#------').toUpperCase()}</span>
              <span>·</span>
              <span className="truncate">{shortCode}</span>
            </div>
          </div>
        </div>

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0 opacity-55"
        >
          <path
            d="M6 9L12 15L18 9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[9998] flex items-start justify-center p-3 sm:p-6"
          style={{
            backgroundColor: 'rgba(10, 10, 11, 0.72)',
            paddingTop: 'max(3vh, env(safe-area-inset-top, 12px))',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[520px] max-h-[88vh] flex flex-col rounded-2xl border overflow-hidden shadow-2xl"
            style={{
              backgroundColor: 'var(--color-surface, #141416)',
              color: 'var(--color-ink, #F4F0E8)',
              borderColor: hairline,
            }}
          >
            {/* Шапка */}
            <div
              className="px-4 sm:px-5 pt-4 pb-3 border-b"
              style={{
                backgroundColor: 'var(--color-bg, #0B0B0C)',
                borderColor: hairline,
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className="text-[12px] font-sans uppercase tracking-[0.14em] font-semibold"
                  style={{ color: 'var(--color-accent, #C9A86A)' }}
                >
                  {t.selectTitle} ({filteredGroups.total})
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-8 px-3 rounded-lg border text-[12px] font-sans font-medium cursor-pointer"
                  style={{
                    borderColor: hairline,
                    color: 'var(--color-ink, #F4F0E8)',
                  }}
                >
                  ✕ {t.close}
                </button>
              </div>

              {/* Поиск без autoFocus */}
              <div
                className="flex items-center gap-2.5 h-10 px-3 rounded-xl border"
                style={{
                  background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 4%, transparent)',
                  borderColor: hairline,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-55 shrink-0">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full bg-transparent border-none outline-none text-[14px] font-sans"
                  style={{ color: 'var(--color-ink, #F4F0E8)' }}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="opacity-65 hover:opacity-100 cursor-pointer bg-transparent border-none text-[13px]"
                    style={{ color: 'var(--color-ink, #F4F0E8)' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Категории */}
              <div className="flex gap-1.5 overflow-x-auto pt-3 pb-0.5">
                {categories.map((cat) => {
                  const active = selectedCat === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCat(cat)}
                      className="h-8 px-3 rounded-lg text-[12px] font-sans font-medium whitespace-nowrap border transition-colors cursor-pointer"
                      style={{
                        borderColor: active ? 'var(--color-accent, #C9A86A)' : hairline,
                        backgroundColor: active ? 'var(--color-accent, #C9A86A)' : 'transparent',
                        color: active ? 'var(--color-bg, #0B0B0C)' : 'var(--color-ink, #F4F0E8)',
                      }}
                    >
                      {cat === 'ALL' ? t.allCategories : cat}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Список пигментов */}
            <div className="flex-1 overflow-y-auto">
              {filteredGroups.groups.map(([categoryName, items]) => (
                <div key={categoryName}>
                  <div
                    className="sticky top-0 z-10 px-4 sm:px-5 py-2 text-[11px] font-sans font-semibold uppercase tracking-[0.14em] border-b"
                    style={{
                      backgroundColor: 'var(--color-bg, #0B0B0C)',
                      color: 'var(--color-accent, #C9A86A)',
                      borderColor: hairline,
                    }}
                  >
                    {categoryName} ({items.length})
                  </div>

                  <div className="divide-y" style={{ borderColor: hairline }}>
                    {items.map((p) => {
                      const isSelected = p.id === value
                      const lore = getPigmentLore(p, lang)
                      const ciShort = lore.code.split('·')[0].trim()

                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between px-4 sm:px-5 py-3 transition-colors"
                          style={{
                            borderColor: hairline,
                            backgroundColor: isSelected
                              ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 12%, transparent)'
                              : 'transparent',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onChange(p.id)
                              setOpen(false)
                            }}
                            className="flex items-center gap-3 flex-1 min-w-0 bg-transparent border-none p-0 text-left cursor-pointer"
                            style={{ color: 'var(--color-ink, #F4F0E8)' }}
                          >
                            <span
                              className="w-9 h-9 rounded-lg shrink-0"
                              style={{
                                backgroundColor: p.hex || '#888',
                                border: '1px solid rgba(0,0,0,0.2)',
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-[14px] font-sans font-semibold leading-tight truncate">
                                {getLocalizedName(p)}
                              </div>
                              <div className="text-[12px] font-mono opacity-60 mt-0.5 truncate">
                                {(p.hex || '').toUpperCase()} · {ciShort} · {p.name.en}
                              </div>
                            </div>
                          </button>

                          {onInspect && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpen(false)
                                onInspect(p.id)
                              }}
                              className="ml-2.5 w-8 h-8 rounded-lg border flex items-center justify-center font-serif italic text-[13px] shrink-0 cursor-pointer"
                              style={{
                                borderColor: hairline,
                                color: 'var(--color-accent, #C9A86A)',
                              }}
                              title={t.dossier}
                              aria-label={t.dossier}
                            >
                              i
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
