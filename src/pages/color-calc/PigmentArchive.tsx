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
  const hairline = 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)'

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
      className="rounded-2xl border overflow-hidden flex flex-col"
      style={{
        background: 'var(--color-surface, #141416)',
        borderColor: hairline,
      }}
    >
      {/* Шапка + поиск + категории */}
      <div
        className="px-4 sm:px-5 pt-4 pb-3.5 border-b flex flex-col gap-3"
        style={{ borderColor: hairline }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[12px] font-sans uppercase tracking-[0.12em] font-semibold opacity-85">
            {dict.archiveTitle}
          </h2>
          <span className="font-mono text-[12px] opacity-55 tabular-nums">
            {filtered.length}
          </span>
        </div>

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
            placeholder={dict.searchPlaceholder}
            className="w-full bg-transparent border-none outline-none text-[14px] font-sans"
            style={{ color: 'var(--color-ink, #F4F0E8)' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[13px] opacity-65 hover:opacity-100 cursor-pointer bg-transparent border-none"
              style={{ color: 'var(--color-ink, #F4F0E8)' }}
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {categories.map((cat) => {
            const active = selectedCat === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCat(cat)}
                className="h-8 px-3 rounded-lg text-[12px] font-sans font-medium whitespace-nowrap border transition-colors cursor-pointer"
                style={{
                  borderColor: active ? 'var(--color-ink, #F4F0E8)' : hairline,
                  background: active ? 'var(--color-ink, #F4F0E8)' : 'transparent',
                  color: active ? 'var(--color-bg, #0B0B0C)' : 'var(--color-ink, #F4F0E8)',
                }}
              >
                {cat === 'ALL' ? dict.all : cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Список пигментов без вложенных карточек */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-[13px] opacity-55">{dict.archiveEmpty}</div>
      ) : (
        <div className="divide-y max-h-[65vh] overflow-y-auto" style={{ borderColor: hairline }}>
          {filtered.map((p) => {
            const lore = getPigmentLore(p, lang)
            const ciShort = lore.code.split('·')[0].trim()
            const inFormula = activePigmentIds.includes(p.id)

            return (
              <div
                key={p.id}
                className="px-4 sm:px-5 py-3.5 flex flex-col gap-2.5 transition-colors"
                style={{
                  borderColor: hairline,
                  background: inFormula
                    ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 6%, transparent)'
                    : 'transparent',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-9 h-9 rounded-lg shrink-0 border border-black/20"
                    style={{ backgroundColor: p.hex || '#444' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-sans font-semibold leading-tight truncate">
                      {getLocalizedName(p)}
                    </div>
                    <div className="text-[12px] font-mono opacity-60 mt-0.5 truncate">
                      {(p.hex || '#------').toUpperCase()} · {ciShort}
                    </div>
                  </div>
                  <SpectralSparkline
                    spectrum={p.spectrum}
                    strokeColor={p.hex || '#C9A86A'}
                    width={54}
                    height={24}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pl-12 text-[12px]">
                  <span className="opacity-65 truncate">
                    {dict.opacityLabels[lore.opacity]}
                  </span>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => onInspectPigment(p.id)}
                      className="underline underline-offset-4 bg-transparent border-none p-0 cursor-pointer font-medium"
                      style={{ color: 'var(--color-accent, #C9A86A)' }}
                    >
                      {dict.pigmentInfoBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddToFormula(p.id)}
                      className="h-8 px-3 rounded-lg border text-[12px] font-sans font-medium transition-colors cursor-pointer"
                      style={{
                        borderColor: inFormula ? 'var(--color-accent, #C9A86A)' : hairline,
                        background: inFormula
                          ? 'var(--color-accent, #C9A86A)'
                          : 'transparent',
                        color: inFormula
                          ? 'var(--color-bg, #0B0B0C)'
                          : 'var(--color-ink, #F4F0E8)',
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
  const hairline = 'color-mix(in srgb, var(--color-ink, #F4F0E8) 12%, transparent)'

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
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(10, 10, 11, 0.76)' }}
        >
          <motion.div
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 14, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[500px] max-h-[86vh] overflow-y-auto rounded-2xl border shadow-2xl"
            style={{
              backgroundColor: 'var(--color-surface, #141416)',
              color: 'var(--color-ink, #F4F0E8)',
              borderColor: hairline,
            }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between gap-3 border-b"
              style={{ borderColor: hairline }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-xl shrink-0 border border-black/20"
                  style={{ backgroundColor: pigment.hex || '#2c2623' }}
                />
                <div className="min-w-0">
                  <span className="text-[11px] font-mono uppercase tracking-[0.12em] block opacity-60">
                    {dict.dossierTitle} · {lore.code}
                  </span>
                  <h3 className="text-[20px] font-serif font-semibold leading-tight truncate mt-0.5">
                    {localizedName}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 cursor-pointer"
                style={{ borderColor: hairline, color: 'var(--color-ink, #F4F0E8)' }}
                aria-label={dict.dossierClose}
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-[13.5px] font-sans leading-relaxed">
              {pigment.spectrum && pigment.spectrum.length > 1 && (
                <div
                  className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
                  style={{
                    backgroundColor: 'var(--color-bg, #0B0B0C)',
                    borderColor: hairline,
                  }}
                >
                  <div className="text-[12px] font-mono opacity-75">
                    <div>R(λ) 380–780 nm</div>
                    <div className="mt-0.5 font-semibold" style={{ color: 'var(--color-accent, #C9A86A)' }}>
                      {(pigment.hex || '').toUpperCase()}
                    </div>
                  </div>
                  <SpectralSparkline
                    spectrum={pigment.spectrum}
                    strokeColor={pigment.hex || '#C9A86A'}
                    width={170}
                    height={42}
                  />
                </div>
              )}

              <div
                className="p-4 rounded-xl border flex flex-col gap-1.5"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 4%, transparent)',
                  borderColor: hairline,
                }}
              >
                <div className="text-[11px] uppercase tracking-[0.12em] opacity-60">
                  {dict.dossierChem}
                </div>
                <div className="font-semibold">{lore.chemicalFamily[lang]}</div>
                <div className="text-[12.5px] opacity-75">
                  {lore.lightfastness} · {lore.tintingStrength[lang]}
                </div>
                <div
                  className="mt-2 pt-2.5 border-t text-[12.5px] opacity-90"
                  style={{ borderColor: hairline }}
                >
                  <strong>{dict.dossierOpacityMeaning}:</strong> {dict.opacityDesc[lore.opacity]}
                </div>
              </div>

              <div>
                <div
                  className="text-[11.5px] uppercase tracking-[0.12em] font-semibold mb-1.5"
                  style={{ color: 'var(--color-accent, #C9A86A)' }}
                >
                  {dict.dossierHistory}
                </div>
                <p className="opacity-85">{lore.history[lang]}</p>
              </div>

              <div>
                <div
                  className="text-[11.5px] uppercase tracking-[0.12em] font-semibold mb-1.5"
                  style={{ color: 'var(--color-accent, #C9A86A)' }}
                >
                  {dict.dossierLeather}
                </div>
                <p className="opacity-85">{lore.leatherUsage[lang]}</p>
              </div>

              <div
                className="p-4 rounded-xl border flex flex-col gap-3"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 4%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--color-accent, #C9A86A) 35%, transparent)',
                }}
              >
                <div
                  className="text-[11.5px] uppercase tracking-[0.12em] font-semibold"
                  style={{ color: 'var(--color-accent, #C9A86A)' }}
                >
                  {dict.dossierWhereToBuy}
                </div>

                <div>
                  <div className="text-[12px] font-semibold opacity-80 mb-1.5">
                    {dict.dossierLeatherBrands}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lore.whereToBuy.leatherBrands.map((b) => (
                      <span
                        key={b}
                        className="text-[12px] font-mono px-2.5 py-1 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--color-surface, #141416)',
                          borderColor: hairline,
                        }}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[12px] font-semibold opacity-80 mb-1.5">
                    {dict.dossierArtSuppliers}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lore.whereToBuy.pigmentSuppliers.map((s) => (
                      <span
                        key={s}
                        className="text-[12px] font-mono px-2.5 py-1 rounded-lg border opacity-80"
                        style={{
                          backgroundColor: 'var(--color-surface, #141416)',
                          borderColor: hairline,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-[12px] opacity-70 pt-2.5 border-t" style={{ borderColor: hairline }}>
                  {lore.whereToBuy.searchHint[lang]}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full h-11 rounded-xl text-[13px] font-sans uppercase tracking-[0.12em] font-semibold cursor-pointer border-none"
                style={{
                  backgroundColor: 'var(--color-ink, #F4F0E8)',
                  color: 'var(--color-bg, #0B0B0C)',
                }}
              >
                {dict.dossierClose}
              </button>
            </div>
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
  const hairline = 'color-mix(in srgb, var(--color-ink, #F4F0E8) 12%, transparent)'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(10, 10, 11, 0.76)' }}
        >
          <motion.div
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 14, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[500px] max-h-[86vh] overflow-y-auto rounded-2xl border shadow-2xl"
            style={{
              backgroundColor: 'var(--color-surface, #141416)',
              color: 'var(--color-ink, #F4F0E8)',
              borderColor: hairline,
            }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between gap-3 border-b"
              style={{ borderColor: hairline }}
            >
              <h3 className="text-[20px] font-serif font-semibold leading-tight">
                {dict.guideModalTitle}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
                style={{ borderColor: hairline, color: 'var(--color-ink, #F4F0E8)' }}
                aria-label={dict.dossierClose}
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-[13.5px] font-sans leading-relaxed">
              <div>
                <div className="font-semibold mb-1" style={{ color: 'var(--color-accent, #C9A86A)' }}>
                  {dict.guideSectionCoats}
                </div>
                <p className="opacity-85">{dict.guideSectionCoatsText}</p>
              </div>
              <div>
                <div className="font-semibold mb-1" style={{ color: 'var(--color-accent, #C9A86A)' }}>
                  {dict.guideSectionWetDry}
                </div>
                <p className="opacity-85">{dict.guideSectionWetDryText}</p>
              </div>
              <div>
                <div className="font-semibold mb-1" style={{ color: 'var(--color-accent, #C9A86A)' }}>
                  {dict.guideSectionIlluminant}
                </div>
                <p className="opacity-85">{dict.guideSectionIlluminantText}</p>
              </div>
              <div
                className="p-4 rounded-xl border flex flex-col gap-2"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 4%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--color-accent, #C9A86A) 35%, transparent)',
                }}
              >
                <div className="font-semibold" style={{ color: 'var(--color-accent, #C9A86A)' }}>
                  {dict.guideSectionOpacity}
                </div>
                <div className="text-[12.5px] opacity-85">• {dict.opacityDesc.opaque}</div>
                <div className="text-[12.5px] opacity-85">• {dict.opacityDesc['semi-opaque']}</div>
                <div className="text-[12.5px] opacity-85">• {dict.opacityDesc['semi-transparent']}</div>
                <div className="text-[12.5px] opacity-85">• {dict.opacityDesc.transparent}</div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full h-11 rounded-xl text-[13px] font-sans uppercase tracking-[0.12em] font-semibold cursor-pointer border-none"
                style={{
                  backgroundColor: 'var(--color-ink, #F4F0E8)',
                  color: 'var(--color-bg, #0B0B0C)',
                }}
              >
                {dict.dossierClose}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
