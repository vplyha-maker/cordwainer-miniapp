import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Lang } from '../../App'
import type { Pigment } from '../../data/pigments'
import { getPigmentLore } from '../../data/pigmentLore'
import { getPigmentCategory } from '../../utils/calculatorLogic'
import { SpectralSparkline } from './SpectralChart'
import type { ColorCalcDict } from './i18n'

interface PigmentArchiveProps {
  lang: Lang
  dict: ColorCalcDict
  pigments: Pigment[]
  activePigmentIds: string[]
  onAddToFormula: (pigmentId: string) => void
  onInspectPigment: (pigmentId: string) => void
}

export function PigmentArchive({
  lang,
  dict,
  pigments,
  activePigmentIds,
  onAddToFormula,
  onInspectPigment,
}: PigmentArchiveProps) {
  const [query, setQuery] = useState('')
  const [selectedCat, setSelectedCat] = useState<string>('ALL')

  const getLocalizedName = (p: Pigment) => {
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return selectablePigments.filter((p) => {
      if (selectedCat !== 'ALL' && getPigmentCategory(p.id, lang) !== selectedCat) {
        return false
      }
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
  }, [selectablePigments, selectedCat, query, lang])

  return (
    <section
      className="rounded-3xl border p-4 flex flex-col gap-3"
      style={{
        background: 'var(--color-surface, #141416)',
        borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-sans uppercase tracking-[0.18em] font-semibold opacity-80">
          {dict.archiveTitle} ({filtered.length})
        </h2>
      </div>

      {/* Поиск */}
      <div
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-full border"
        style={{
          background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 4%, transparent)',
          borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 12%, transparent)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-55 shrink-0">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.searchPlaceholder}
          className="w-full bg-transparent border-none outline-none text-[13px] font-sans"
          style={{ color: 'var(--color-ink, #F4F0E8)' }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-[12px] opacity-65 hover:opacity-100 cursor-pointer bg-transparent border-none"
            style={{ color: 'var(--color-ink, #F4F0E8)' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Категории */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-2 border-b"
        style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
      >
        {categories.map((cat) => {
          const active = selectedCat === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCat(cat)}
              className="px-3 py-1 rounded-full text-[10.5px] font-sans font-medium whitespace-nowrap border transition-colors cursor-pointer"
              style={{
                borderColor: active
                  ? 'var(--color-ink, #F4F0E8)'
                  : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 12%, transparent)',
                background: active ? 'var(--color-ink, #F4F0E8)' : 'transparent',
                color: active ? 'var(--color-bg, #0B0B0C)' : 'var(--color-ink, #F4F0E8)',
              }}
            >
              {cat === 'ALL' ? dict.all : cat}
            </button>
          )
        })}
      </div>

      {/* Сетка пигментов */}
      {filtered.length === 0 ? (
        <div className="py-10 text-center text-[12px] opacity-55">{dict.archiveEmpty}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[62vh] overflow-y-auto pr-1">
          {filtered.map((p) => {
            const lore = getPigmentLore(p, lang)
            const ciShort = lore.code.split('·')[0].trim()
            const inFormula = activePigmentIds.includes(p.id)

            return (
              <div
                key={p.id}
                className="p-3 rounded-2xl border flex flex-col gap-2.5"
                style={{
                  background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 3%, transparent)',
                  borderColor: inFormula
                    ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 50%, transparent)'
                    : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-9 h-9 rounded-xl shrink-0 border border-black/20"
                    style={{
                      backgroundColor: p.hex || '#444',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-sans font-semibold truncate">
                      {getLocalizedName(p)}
                    </div>
                    <div className="text-[10px] font-mono opacity-60 truncate">
                      {(p.hex || '#------').toUpperCase()} · {ciShort}
                    </div>
                  </div>
                  <SpectralSparkline
                    spectrum={p.spectrum}
                    strokeColor={p.hex || '#C9A86A'}
                    width={52}
                    height={22}
                  />
                </div>

                <div
                  className="flex items-center justify-between gap-2 pt-2 border-t text-[10.5px]"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 8%, transparent)' }}
                >
                  <span className="opacity-65 truncate">
                    {dict.opacityLabels[lore.opacity]}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onInspectPigment(p.id)}
                      className="underline bg-transparent border-none p-0 cursor-pointer font-medium"
                      style={{ color: 'var(--color-accent, #C9A86A)' }}
                    >
                      ⓘ {dict.pigmentInfoBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddToFormula(p.id)}
                      className="px-2.5 py-0.5 rounded-full border font-semibold transition-colors cursor-pointer"
                      style={{
                        borderColor: inFormula
                          ? 'var(--color-accent, #C9A86A)'
                          : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 20%, transparent)',
                        background: inFormula
                          ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 16%, transparent)'
                          : 'transparent',
                        color: inFormula ? 'var(--color-accent, #C9A86A)' : 'var(--color-ink, #F4F0E8)',
                      }}
                    >
                      {inFormula ? dict.addedToFormula : dict.addToFormula}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

interface PigmentDossierModalProps {
  lang: Lang
  dict: ColorCalcDict
  pigment: Pigment | undefined
  onClose: () => void
}

export function PigmentDossierModal({
  lang,
  dict,
  pigment,
  onClose,
}: PigmentDossierModalProps) {
  const lore = useMemo(() => (pigment ? getPigmentLore(pigment, lang) : null), [pigment, lang])

  const localizedName = pigment
    ? pigment.id === 'acrylic_binder'
      ? dict.binder
      : lang === 'uk'
      ? pigment.name.uk || pigment.name.ru
      : lang === 'de'
      ? pigment.name.de || pigment.name.ru
      : pigment.name.ru
    : ''

  return (
    <AnimatePresence>
      {pigment && lore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(11, 11, 12, 0.72)' }}
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] max-h-[85vh] overflow-y-auto p-5 rounded-3xl border"
            style={{
              backgroundColor: '#F7F4EE',
              color: '#181715',
              borderColor: 'rgba(24,23,21,0.14)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.42)',
            }}
          >
            <div
              className="flex items-center justify-between gap-3 pb-3.5 mb-3.5 border-b"
              style={{ borderColor: 'rgba(24,23,21,0.1)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl shrink-0 border"
                  style={{
                    backgroundColor: pigment.hex || '#2c2623',
                    borderColor: 'rgba(0,0,0,0.2)',
                  }}
                />
                <div className="min-w-0">
                  <span className="text-[9.5px] font-mono uppercase tracking-[0.14em] block text-[#68635B]">
                    {dict.dossierTitle} · {lore.code}
                  </span>
                  <h3 className="text-[18px] font-serif font-bold text-[#181715] truncate">
                    {localizedName}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center border text-[#181715] shrink-0 cursor-pointer"
                style={{ borderColor: 'rgba(24,23,21,0.16)', backgroundColor: '#EFEAE1' }}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3.5 text-[13px] font-sans leading-relaxed">
              {pigment.spectrum && pigment.spectrum.length > 1 && (
                <div
                  className="p-3.5 rounded-2xl flex items-center justify-between gap-3"
                  style={{ backgroundColor: '#141416', color: '#F4F0E8' }}
                >
                  <div className="text-[10px] font-mono opacity-80">
                    <div>R(λ) 380–780 nm</div>
                    <div className="text-[#C9A86A] mt-0.5">{(pigment.hex || '').toUpperCase()}</div>
                  </div>
                  <SpectralSparkline
                    spectrum={pigment.spectrum}
                    strokeColor={pigment.hex || '#C9A86A'}
                    width={180}
                    height={40}
                  />
                </div>
              )}

              <div className="p-3.5 rounded-2xl" style={{ backgroundColor: '#EFEAE1' }}>
                <div className="text-[9.5px] uppercase tracking-[0.14em] text-[#68635B]">
                  {dict.dossierChem}
                </div>
                <div className="font-semibold text-[#181715] mt-0.5">{lore.chemicalFamily[lang]}</div>
                <div className="text-[12px] text-[#524E47] mt-1">
                  {lore.lightfastness} · {lore.tintingStrength[lang]}
                </div>
                <div
                  className="mt-2 pt-2 border-t text-[12px] text-[#181715]"
                  style={{ borderColor: 'rgba(24,23,21,0.1)' }}
                >
                  <strong>{dict.dossierOpacityMeaning}:</strong> {dict.opacityDesc[lore.opacity]}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#9A6B2F] mb-1">
                  {dict.dossierHistory}
                </div>
                <p className="text-[#26221E]">{lore.history[lang]}</p>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#9A6B2F] mb-1">
                  {dict.dossierLeather}
                </div>
                <p className="text-[#26221E]">{lore.leatherUsage[lang]}</p>
              </div>

              <div className="p-3.5 rounded-2xl border flex flex-col gap-2.5" style={{ backgroundColor: '#EFEAE1', borderColor: 'rgba(154,107,47,0.35)' }}>
                <div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#9A6B2F]">
                  {dict.dossierWhereToBuy}
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-[#181715] mb-1.5">
                    {dict.dossierLeatherBrands}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lore.whereToBuy.leatherBrands.map((b) => (
                      <span
                        key={b}
                        className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border text-[#181715]"
                        style={{ backgroundColor: '#F7F4EE', borderColor: 'rgba(24,23,21,0.14)' }}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-[#181715] mb-1.5">
                    {dict.dossierArtSuppliers}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lore.whereToBuy.pigmentSuppliers.map((s) => (
                      <span
                        key={s}
                        className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border text-[#524E47]"
                        style={{ backgroundColor: '#F7F4EE', borderColor: 'rgba(24,23,21,0.12)' }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  className="text-[11px] text-[#524E47] pt-2 border-t"
                  style={{ borderColor: 'rgba(24,23,21,0.1)' }}
                >
                  {lore.whereToBuy.searchHint[lang]}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full mt-4 py-3 rounded-full text-[11.5px] font-sans uppercase tracking-[0.16em] font-semibold cursor-pointer border-none"
              style={{ backgroundColor: '#181715', color: '#F7F4EE' }}
            >
              {dict.dossierClose}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface MasterGuideModalProps {
  open: boolean
  dict: ColorCalcDict
  onClose: () => void
}

export function MasterGuideModal({ open, dict, onClose }: MasterGuideModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(11, 11, 12, 0.72)' }}
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] max-h-[85vh] overflow-y-auto p-5 rounded-3xl border"
            style={{
              backgroundColor: '#F7F4EE',
              color: '#181715',
              borderColor: 'rgba(24,23,21,0.14)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.42)',
            }}
          >
            <div
              className="flex items-center justify-between gap-3 pb-3 mb-3.5 border-b"
              style={{ borderColor: 'rgba(24,23,21,0.1)' }}
            >
              <h3 className="text-[17px] font-serif font-bold text-[#181715]">
                {dict.guideModalTitle}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full border text-[#181715] cursor-pointer"
                style={{ borderColor: 'rgba(24,23,21,0.16)', backgroundColor: '#EFEAE1' }}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3.5 text-[13px] font-sans leading-relaxed">
              <div>
                <div className="font-semibold text-[#9A6B2F] mb-1">{dict.guideSectionCoats}</div>
                <p className="text-[#26221E]">{dict.guideSectionCoatsText}</p>
              </div>
              <div>
                <div className="font-semibold text-[#9A6B2F] mb-1">{dict.guideSectionWetDry}</div>
                <p className="text-[#26221E]">{dict.guideSectionWetDryText}</p>
              </div>
              <div>
                <div className="font-semibold text-[#9A6B2F] mb-1">{dict.guideSectionIlluminant}</div>
                <p className="text-[#26221E]">{dict.guideSectionIlluminantText}</p>
              </div>
              <div
                className="p-3.5 rounded-2xl border flex flex-col gap-1.5"
                style={{ backgroundColor: '#EFEAE1', borderColor: 'rgba(154,107,47,0.35)' }}
              >
                <div className="font-semibold text-[#9A6B2F]">{dict.guideSectionOpacity}</div>
                <div className="text-[12px] text-[#181715]">• {dict.opacityDesc.opaque}</div>
                <div className="text-[12px] text-[#181715]">• {dict.opacityDesc['semi-opaque']}</div>
                <div className="text-[12px] text-[#181715]">• {dict.opacityDesc['semi-transparent']}</div>
                <div className="text-[12px] text-[#181715]">• {dict.opacityDesc.transparent}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full mt-4 py-3 rounded-full text-[11.5px] font-sans uppercase tracking-[0.16em] font-semibold cursor-pointer border-none"
              style={{ backgroundColor: '#181715', color: '#F7F4EE' }}
            >
              {dict.dossierClose}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
