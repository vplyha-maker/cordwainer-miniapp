import { useState, useMemo } from 'react'
import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { getPigmentLore } from '../data/pigmentLore'
import { getPigmentCategory } from '../utils/calculatorLogic'

interface PigmentSelectorProps {
  pigments: Pigment[]
  value: string
  onChange: (newId: string) => void
  lang: Lang
  onInspect?: (pigmentId: string) => void
}

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
      countSuffix: 'пигментов в архиве',
      allCategories: 'Весь архив',
      selectTitle: 'Спектральный Архив Пигментов',
      close: 'Закрыть',
      unknown: 'Выберите пигмент',
    },
    uk: {
      searchPlaceholder: 'Пошук: назва, індекс CI, HEX…',
      countSuffix: 'пігментів в архіві',
      allCategories: 'Увесь архів',
      selectTitle: 'Спектральний Архів Пігментів',
      close: 'Закрити',
      unknown: 'Оберіть пігмент',
    },
    de: {
      searchPlaceholder: 'Suche: Name, CI-Code, HEX…',
      countSuffix: 'Pigmente im Archiv',
      allCategories: 'Alle',
      selectTitle: 'Spektrales Pigment-Archiv',
      close: 'Schließen',
      unknown: 'Pigment wählen',
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

    const map = new Map<string, Pigment[]>()
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
      {/* КНОПКА ВЫБРАННОГО ПИГМЕНТА (Читаемая, во всю ширину строки, без обрезки букв) */}
      <button
        type="button"
        onClick={() => {
          setQuery('')
          setOpen(true)
        }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '8px 10px',
          border: '1px solid color-mix(in srgb, var(--color-ink, #181512) 16%, transparent)',
          background: 'color-mix(in srgb, var(--color-ink, #181512) 3%, transparent)',
          color: 'var(--color-ink, #181512)',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <span
            style={{
              width: 30,
              height: 30,
              flexShrink: 0,
              backgroundColor: selected?.hex || '#CCCCCC',
              border: '1px solid rgba(0,0,0,0.22)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.25,
                color: 'var(--color-ink, #181512)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {getLocalizedName(selected)}
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: 'monospace',
                opacity: 0.65,
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{(selected?.hex || '#------').toUpperCase()}</span>
              <span>·</span>
              <span>{shortCode}</span>
            </div>
          </div>
        </div>

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          style={{ flexShrink: 0, opacity: 0.55 }}
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

      {/* МОДАЛЬНОЕ ОКНО ВЫБОРА ПИГМЕНТА:
          1. БЕЗ autoFocus — клавиатура НЕ выскакивает сама и не закрывает список!
          2. Привязано к верху экрана (paddingTop: 3vh) — даже при ручном поиске список виден над клавиатурой.
          3. Высококонтрастная тема Lookbook (#181512 текст на #FAF7F2 фоне) — все 147 пигментов идеально читаемы! */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            backgroundColor: 'rgba(15, 13, 11, 0.68)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '3vh 12px 12px 12px',
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 500,
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#FAF7F2',
              color: '#181512',
              border: '1px solid #2A2521',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
              overflow: 'hidden',
            }}
          >
            {/* Шапка селектора (Тёмный эспрессо в стиле Haute Couture) */}
            <div
              style={{
                backgroundColor: '#181512',
                color: '#F5F1EA',
                padding: '12px 14px 10px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    color: '#D8A35C',
                  }}
                >
                  {t.selectTitle} ({filteredGroups.total})
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#F5F1EA',
                    fontSize: 11,
                    padding: '3px 9px',
                    cursor: 'pointer',
                  }}
                >
                  ✕ {t.close}
                </button>
              </div>

              {/* Поле поиска БЕЗ autoFocus! Клавиатура откроется только если пользователь сам нажмёт на строку поиска */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#26221E',
                  border: '1px solid rgba(255,255,255,0.16)',
                  padding: '7px 10px',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6, flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#F5F1EA',
                    fontSize: 13,
                  }}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#F5F1EA',
                      opacity: 0.7,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Быстрые вкладки категорий — можно фильтровать в один тап вообще без клавиатуры! */}
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  overflowX: 'auto',
                  paddingTop: 10,
                  paddingBottom: 2,
                }}
              >
                {categories.map((cat) => {
                  const active = selectedCat === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCat(cat)}
                      style={{
                        padding: '4px 9px',
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        whiteSpace: 'nowrap',
                        border: active ? '1px solid #D8A35C' : '1px solid rgba(255,255,255,0.14)',
                        backgroundColor: active ? '#D8A35C' : 'transparent',
                        color: active ? '#181512' : '#E5DFD5',
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {cat === 'ALL' ? t.allCategories : cat}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Прокручиваемый список пигментов (Тёмный контрастный текст #181512 на светлом фоне #FAF7F2) */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {filteredGroups.groups.map(([categoryName, items]) => (
                <div key={categoryName}>
                  <div
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      backgroundColor: '#EAE4DA',
                      color: '#5A4632',
                      padding: '6px 14px',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid rgba(24,21,18,0.1)',
                    }}
                  >
                    {categoryName} ({items.length})
                  </div>

                  {items.map((p) => {
                    const isSelected = p.id === value
                    const lore = getPigmentLore(p, lang)
                    const ciShort = lore.code.split('·')[0].trim()

                    return (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '9px 14px',
                          borderBottom: '1px solid rgba(24,21,18,0.08)',
                          backgroundColor: isSelected ? '#EFE6D5' : '#FAF7F2',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onChange(p.id)
                            setOpen(false)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            flex: 1,
                            minWidth: 0,
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: '#181512',
                          }}
                        >
                          <span
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 4,
                              flexShrink: 0,
                              backgroundColor: p.hex || '#888',
                              border: '1px solid rgba(0,0,0,0.22)',
                              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3)',
                            }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: '#181512',
                                lineHeight: 1.25,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {getLocalizedName(p)}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: '#575049',
                                fontFamily: 'monospace',
                                marginTop: 2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
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
                            style={{
                              marginLeft: 8,
                              width: 28,
                              height: 28,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid rgba(24,21,18,0.2)',
                              backgroundColor: 'rgba(216,163,92,0.15)',
                              color: '#8C5E24',
                              fontWeight: 700,
                              fontSize: 12,
                              flexShrink: 0,
                              cursor: 'pointer',
                            }}
                            title="Паспорт пигмента"
                          >
                            ⓘ
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
