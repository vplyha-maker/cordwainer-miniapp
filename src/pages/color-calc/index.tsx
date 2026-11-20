import { motion } from 'framer-motion'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

import type { Lang } from '../../App'
import type { Pigment } from '../../data/pigments'
import { loadAllPigments } from '../../data/loadPigments'
import { usePaintMix } from '../../hooks/usePaintMix'
import { useColorCalculations } from '../../hooks/useColorCalculations'
import {
  type CoverageSystem,
  type RecipeResult,
  simulateLayersKM,
  rgbToLab,
  calculateDeltaE2000,
  hexToRgbObj,
} from '../../utils/calculatorLogic'
import {
  mixSpectra,
  spectrumToRGBWithIlluminant,
  rgbToHex,
  type IlluminantType,
} from '../../utils/colorScience'

import { getColorCalcDict } from './i18n'
import { SpectralChart, type SpectralSeries } from './SpectralChart'
import { FormulaPanel, type LayerSwatchItem } from './FormulaPanel'
import { MatchingPanel } from './MatchingPanel'
import {
  PigmentArchive,
  PigmentDossierModal,
  MasterGuideModal,
} from './PigmentArchive'

export interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

type MobileTabId = 'formula' | 'spectrum' | 'match' | 'archive'
type DesktopRightTabId = 'match' | 'archive'

const DEFAULT_INVENTORY_IDS = [
  'pw_6_anatase',
  'pbk_1_aniline_black',
  'py_154_benzimidazolone_yellow_h3g',
  'py_83_diarylide_yellow_hr',
  'po_73_pyrrole_orange',
  'pr_254_pyrrole_red',
  'pr_122_quinacridone_magenta',
  'pv_23_dioxazine_purple',
  'phthalo_blue',
  'pg_36_phthalo_green_ys',
  'pbr_25_benzimidazolone_brown',
  'acrylic_binder',
] as const

function calculateDeltaE2000Hex(hex1: string, hex2: string): number {
  const rgb1 = hexToRgbObj(hex1)
  const rgb2 = hexToRgbObj(hex2)
  return calculateDeltaE2000(
    rgbToLab(rgb1.r, rgb1.g, rgb1.b),
    rgbToLab(rgb2.r, rgb2.g, rgb2.b)
  )
}

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const dict = useMemo(() => getColorCalcDict(lang), [lang])

  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [copied, setCopied] = useState(false)

  const [mobileTab, setMobileTab] = useState<MobileTabId>('formula')
  const [desktopRightTab, setDesktopRightTab] = useState<DesktopRightTabId>('match')

  const [isWet, setIsWet] = useState(false)
  const [illuminant, setIlluminant] = useState<IlluminantType>('D65')
  const [selectedCoatIdx, setSelectedCoatIdx] = useState<number>(3)
  const [isAutoAdjusting, setIsAutoAdjusting] = useState(false)

  const [inspectedPigmentId, setInspectedPigmentId] = useState<string | null>(null)
  const [showGuideModal, setShowGuideModal] = useState(false)

  const {
    paints,
    setPaints,
    amountRefs,
    totalAmount,
    addPaint,
    removePaint,
    updatePaint,
    clearAllAmounts,
    applyRecipe,
  } = usePaintMix(pigments)

  const { mixedColor } = useColorCalculations({
    pigments,
    paints,
    totalAmount,
    isWet,
  })

  const [targetHex, setTargetHex] = useState('#8B4513')
  const [activeTarget, setActiveTarget] = useState<string | null>(null)
  const [inventoryIds, setInventoryIds] = useState<string[]>([])
  const [maxComponents, setMaxComponents] = useState<3 | 4>(3)
  const [system, setSystem] = useState<CoverageSystem>('acrylic')
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [recipeResult, setRecipeResult] = useState<RecipeResult | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const reqIdRef = useRef(0)

  const loadPigments = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    loadAllPigments()
      .then((loaded) => {
        setPigments(loaded)
        const available = new Set(loaded.map((p) => p.id))
        setInventoryIds(DEFAULT_INVENTORY_IDS.filter((id) => available.has(id)))
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
        setLoadError(true)
      })
  }, [])

  useEffect(() => {
    loadPigments()
  }, [loadPigments])

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  const ensureWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../../workers/recipeWorker.ts', import.meta.url),
        { type: 'module' }
      )
    }
    return workerRef.current
  }, [])

  // Симуляция 4 слоёв по Кубелке–Мунку с учётом выбранного освещения (метамеризм)
  const layerSwatches = useMemo<LayerSwatchItem[] | null>(() => {
    if (!mixedColor?.spectrum || pigments.length === 0) return null
    const basePigment =
      pigments.find((p) => p.id === 'cardboard') ||
      pigments.find((p) => p.id === 'titanium_white') ||
      pigments.find((p) => p.id === 'pw_6_anatase')
    if (!basePigment?.spectrum) return null

    const sim = simulateLayersKM(basePigment.spectrum, mixedColor.spectrum, system)
    return [
      {
        short: 'I',
        label: dict.coatLabels[0],
        hex: rgbToHex(spectrumToRGBWithIlluminant(sim.layer1, illuminant)).toUpperCase(),
      },
      {
        short: 'II',
        label: dict.coatLabels[1],
        hex: rgbToHex(spectrumToRGBWithIlluminant(sim.layer2, illuminant)).toUpperCase(),
      },
      {
        short: 'III',
        label: dict.coatLabels[2],
        hex: rgbToHex(spectrumToRGBWithIlluminant(sim.layer3, illuminant)).toUpperCase(),
      },
      {
        short: '∞',
        label: dict.coatLabels[3],
        hex: rgbToHex(spectrumToRGBWithIlluminant(sim.final, illuminant)).toUpperCase(),
      },
    ]
  }, [mixedColor, pigments, system, illuminant, dict.coatLabels])

  const activeCoat = layerSwatches ? layerSwatches[selectedCoatIdx] || layerSwatches[3] : null

  const displayHex = useMemo(() => {
    if (activeCoat?.hex) return activeCoat.hex
    if (!mixedColor?.spectrum) return null
    return rgbToHex(spectrumToRGBWithIlluminant(mixedColor.spectrum, illuminant)).toUpperCase()
  }, [activeCoat, mixedColor, illuminant])

  const activeLab = useMemo(() => {
    if (!displayHex) return null
    const rgb = hexToRgbObj(displayHex)
    return rgbToLab(rgb.r, rgb.g, rgb.b)
  }, [displayHex])

  const liveDeltaE =
    activeTarget && displayHex ? calculateDeltaE2000Hex(activeTarget, displayHex) : null

  // Кривые компонентов для наложения на спектральный график
  const componentSeries = useMemo<SpectralSeries[]>(() => {
    const out: SpectralSeries[] = []
    for (let i = 0; i < paints.length; i++) {
      const paint = paints[i]
      const amt = parseFloat(paint.amount) || 0
      if (amt <= 0 || paint.pigmentId === 'acrylic_binder') continue
      const pig = pigments.find((p) => p.id === paint.pigmentId)
      if (!pig?.spectrum || pig.spectrum.length < 2) continue
      const label =
        lang === 'uk'
          ? pig.name.uk || pig.name.ru
          : lang === 'de'
          ? pig.name.de || pig.name.ru
          : pig.name.ru
      out.push({
        id: `${paint.id}-${pig.id}`,
        label,
        color: pig.hex || '#D8A35C',
        spectrum: pig.spectrum,
      })
    }
    return out
  }, [paints, pigments, lang])

  const inspectedPigment = useMemo(
    () => (inspectedPigmentId ? pigments.find((p) => p.id === inspectedPigmentId) : undefined),
    [inspectedPigmentId, pigments]
  )

  const activePigmentIds = useMemo(() => paints.map((p) => p.pigmentId), [paints])

  const handleAddFromArchive = useCallback(
    (pigmentId: string) => {
      setPaints((prev) => {
        if (prev.some((row) => row.pigmentId === pigmentId)) return prev
        const emptyIdx = prev.findIndex((row) => !row.amount || parseFloat(row.amount) <= 0)
        if (emptyIdx >= 0) {
          const next = [...prev]
          next[emptyIdx] = { ...next[emptyIdx], pigmentId, amount: '5' }
          return next
        }
        return [
          ...prev,
          {
            id: `arch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            pigmentId,
            amount: '5',
          },
        ]
      })
    },
    [setPaints]
  )

  const copyHex = async () => {
    if (!displayHex) return
    try {
      await navigator.clipboard?.writeText(displayHex)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore clipboard errors in restricted WebView
    }
  }

  const runRecipeSearch = () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(targetHex) || pigments.length === 0 || inventoryIds.length === 0) {
      return
    }
    setRecipeLoading(true)
    setRecipeError(null)
    setRecipeResult(null)

    const id = ++reqIdRef.current
    const worker = ensureWorker()

    const onMsg = (e: MessageEvent) => {
      if (e.data.id !== id) return
      worker.removeEventListener('message', onMsg)
      setRecipeLoading(false)
      if (e.data.error) {
        setRecipeError(String(e.data.error))
        setRecipeResult(null)
        return
      }
      const result = e.data.result as RecipeResult | null
      setRecipeResult(result)
      if (!result) setRecipeError(dict.recipeError)
    }

    worker.addEventListener('message', onMsg)
    worker.postMessage({
      id,
      targetHex,
      basicPigments: pigments,
      maxComponents,
      targetVolume: 20,
      system,
      activeIds: inventoryIds,
      excludeIds: ['cardboard'],
    })
  }

  const autoAdjustCurrentMix = () => {
    if (!activeTarget || paints.length === 0 || pigments.length === 0) return
    setIsAutoAdjusting(true)

    setTimeout(() => {
      try {
        const colorPaints = paints.filter(
          (p) => p.pigmentId !== 'acrylic_binder' && p.pigmentId !== 'cardboard'
        )
        const binderPaint = paints.find((p) => p.pigmentId === 'acrylic_binder')

        const activePigments = colorPaints
          .map((p) => ({
            paintId: p.id,
            amount: parseFloat(p.amount) || 0,
            pigment: pigments.find((pig) => pig.id === p.pigmentId),
          }))
          .filter((p): p is { paintId: string; amount: number; pigment: Pigment } =>
            Boolean(p.pigment?.spectrum)
          )

        const n = activePigments.length
        if (n === 0) {
          setIsAutoAdjusting(false)
          return
        }

        const initialTotal = activePigments.reduce((s, p) => s + p.amount, 0)
        const targetTotalVol = initialTotal > 0 ? initialTotal : 20

        let bestVols = activePigments.map((p) => (p.amount > 0 ? p.amount : targetTotalVol / n))

        const evaluate = (v: number[]) => {
          const components = activePigments.map((ap, i) => ({
            spectrum: ap.pigment.spectrum!,
            volume: v[i],
          }))
          const mixedSpec = mixSpectra(components, isWet)
          if (!mixedSpec.length) return Infinity
          const rgb = spectrumToRGBWithIlluminant(mixedSpec, illuminant)
          return calculateDeltaE2000Hex(activeTarget, rgbToHex(rgb))
        }

        let minDE = evaluate(bestVols)
        const shifts = [4, 1.5, 0.5, 0.15, 0.04]

        for (const s of shifts) {
          let improved = true
          let pass = 0
          while (improved && pass < 20) {
            improved = false
            pass++
            for (let i = 0; i < n; i++) {
              const baseVols = [...bestVols]
              const testUp = [...baseVols]
              testUp[i] += s
              const deUp = evaluate(testUp)
              if (deUp < minDE - 0.001) {
                minDE = deUp
                bestVols = testUp
                improved = true
                continue
              }

              if (baseVols[i] - s >= 0.02) {
                const testDown = [...baseVols]
                testDown[i] -= s
                const deDown = evaluate(testDown)
                if (deDown < minDE - 0.001) {
                  minDE = deDown
                  bestVols = testDown
                  improved = true
                }
              }
            }
          }
        }

        const newSum = bestVols.reduce((s, v) => s + v, 0)
        const scale = newSum > 0 ? targetTotalVol / newSum : 1

        activePigments.forEach((ap, i) => {
          const finalVol = Math.max(0.05, Number((bestVols[i] * scale).toFixed(2)))
          updatePaint(ap.paintId, 'amount', String(finalVol))
        })

        if (binderPaint) {
          const oldBinder = parseFloat(binderPaint.amount) || 0
          const ratio = initialTotal > 0 ? oldBinder / initialTotal : 0.2
          updatePaint(binderPaint.id, 'amount', String(Number((targetTotalVol * ratio).toFixed(2))))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsAutoAdjusting(false)
      }
    }, 40)
  }

  const sendRecipeToMix = () => {
    if (!recipeResult?.recipe?.length) return
    applyRecipe(
      recipeResult.recipe.map((item) => ({
        pigmentId: item.pigment.id,
        ml: item.ml,
      }))
    )
    setActiveTarget(targetHex)
    setSelectedCoatIdx(3)
    setMobileTab('formula')
  }

  const handleSystemChange = (newSystem: CoverageSystem) => {
    setSystem(newSystem)
    if (newSystem === 'aniline') {
      setInventoryIds((prev) => prev.filter((id) => id !== 'acrylic_binder'))
    } else if (newSystem === 'acrylic') {
      if (pigments.some((p) => p.id === 'acrylic_binder')) {
        setInventoryIds((prev) =>
          prev.includes('acrylic_binder') ? prev : [...prev, 'acrylic_binder']
        )
      }
    }
  }

  const toggleInventory = (pid: string) =>
    setInventoryIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
    )

  const resetInventoryDefaults = () => {
    const available = new Set(pigments.map((p) => p.id))
    setInventoryIds(DEFAULT_INVENTORY_IDS.filter((id) => available.has(id)))
  }

  const selectAllInventory = () => {
    const ids = pigments
      .filter((p) => p.id !== 'acrylic_binder' && p.id !== 'cardboard' && p.spectrum)
      .map((p) => p.id)
    if (system === 'acrylic' && pigments.some((p) => p.id === 'acrylic_binder')) {
      ids.push('acrylic_binder')
    }
    setInventoryIds(ids)
  }

  const clearInventory = () => setInventoryIds([])

  const formulaNode = (
    <FormulaPanel
      lang={lang}
      dict={dict}
      pigments={pigments}
      loading={loading}
      loadError={loadError}
      onRetryLoad={loadPigments}
      paints={paints}
      amountRefs={amountRefs}
      totalAmount={totalAmount}
      onAddPaint={addPaint}
      onRemovePaint={removePaint}
      onUpdatePaint={updatePaint}
      onClearAmounts={clearAllAmounts}
      isWet={isWet}
      onToggleWet={() => setIsWet((w) => !w)}
      illuminant={illuminant}
      onIlluminantChange={setIlluminant}
      layerSwatches={layerSwatches}
      selectedCoatIdx={selectedCoatIdx}
      onSelectCoat={setSelectedCoatIdx}
      displayHex={displayHex}
      activeLab={activeLab}
      activeTarget={activeTarget}
      onClearTarget={() => setActiveTarget(null)}
      liveDeltaE={liveDeltaE}
      copied={copied}
      onCopyHex={copyHex}
      isAutoAdjusting={isAutoAdjusting}
      onAutoAdjust={autoAdjustCurrentMix}
      onInspectPigment={setInspectedPigmentId}
      onOpenGuide={() => setShowGuideModal(true)}
    />
  )

  const spectralNode = (
    <SpectralChart
      primarySpectrum={mixedColor?.spectrum || null}
      primaryColor={displayHex || '#D8A35C'}
      primaryLabel={displayHex ? `${dict.mix} · ${displayHex}` : dict.mix}
      componentSeries={componentSeries}
      dict={dict}
    />
  )

  const matchingNode = (
    <MatchingPanel
      lang={lang}
      dict={dict}
      pigments={pigments}
      loading={loading}
      targetHex={targetHex}
      onTargetHexChange={(hex) => {
        setTargetHex(hex)
        setRecipeResult(null)
        setRecipeError(null)
      }}
      maxComponents={maxComponents}
      onMaxComponentsChange={setMaxComponents}
      system={system}
      onSystemChange={handleSystemChange}
      inventoryIds={inventoryIds}
      onToggleInventory={toggleInventory}
      onResetInventoryDefaults={resetInventoryDefaults}
      onSelectAllInventory={selectAllInventory}
      onClearInventory={clearInventory}
      recipeLoading={recipeLoading}
      recipeError={recipeError}
      recipeResult={recipeResult}
      onRunRecipeSearch={runRecipeSearch}
      onSendRecipeToMix={sendRecipeToMix}
      onInspectPigment={setInspectedPigmentId}
    />
  )

  const archiveNode = (
    <PigmentArchive
      lang={lang}
      dict={dict}
      pigments={pigments}
      activePigmentIds={activePigmentIds}
      onAddToFormula={handleAddFromArchive}
      onInspectPigment={setInspectedPigmentId}
    />
  )

  const mobileTabs: { id: MobileTabId; label: string }[] = [
    { id: 'formula', label: dict.navFormula },
    { id: 'spectrum', label: dict.navSpectrum },
    { id: 'match', label: dict.navMatch },
    { id: 'archive', label: dict.navArchive },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="min-h-screen flex flex-col pt-safe pb-10 w-full overflow-x-hidden"
      style={{
        background: 'var(--color-bg, #141210)',
        color: 'var(--color-ink, #F5F1EA)',
      }}
    >
      {/* ШАПКА ТОЛЬКО ДЛЯ ПЛАНШЕТА И ПК (на телефоне скрыта) */}
      <header
        className="hidden md:flex items-center justify-between px-6 lg:px-8 py-4 border-b max-w-[1440px] mx-auto w-full"
        style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center border opacity-75 hover:opacity-100 cursor-pointer"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 16%, transparent)',
              color: 'var(--color-ink, #F5F1EA)',
            }}
            aria-label={dict.back}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div>
            <div className="text-[10px] tracking-[0.28em] uppercase font-semibold" style={{ color: 'var(--color-accent, #D8A35C)' }}>
              {dict.brand} · {dict.edition}
            </div>
            <h1 className="text-[20px] font-serif tracking-wide leading-tight mt-0.5">
              {dict.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className="flex border p-0.5"
            style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 16%, transparent)' }}
          >
            {(['match', 'archive'] as const).map((id) => {
              const active = desktopRightTab === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDesktopRightTab(id)}
                  className="px-3.5 py-1.5 text-[11px] uppercase tracking-[0.16em] font-semibold transition-colors cursor-pointer"
                  style={{
                    background: active
                      ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 20%, transparent)'
                      : 'transparent',
                    color: active
                      ? 'var(--color-accent, #D8A35C)'
                      : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 65%, transparent)',
                  }}
                >
                  {id === 'match' ? dict.navMatch : dict.navArchive}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] border font-semibold cursor-pointer"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-accent, #D8A35C) 48%, transparent)',
              color: 'var(--color-accent, #D8A35C)',
            }}
          >
            ? {dict.guideBtn}
          </button>
        </div>
      </header>

      {/* МОБИЛЬНАЯ КОМПАКТНАЯ ПАНЕЛЬ (без шапки) */}
      <div className="md:hidden px-3 pt-2.5 pb-2 flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 shrink-0 flex items-center justify-center border opacity-80 cursor-pointer"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
              color: 'var(--color-ink, #F5F1EA)',
            }}
            aria-label={dict.back}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div
            className="flex-1 grid grid-cols-4 border p-0.5"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
              background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 3%, transparent)',
            }}
          >
            {mobileTabs.map((tItem) => {
              const active = mobileTab === tItem.id
              return (
                <button
                  key={tItem.id}
                  type="button"
                  onClick={() => setMobileTab(tItem.id)}
                  className="py-2 text-[10px] uppercase tracking-[0.1em] font-semibold transition-colors cursor-pointer"
                  style={{
                    background: active
                      ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 22%, transparent)'
                      : 'transparent',
                    color: active
                      ? 'var(--color-accent, #D8A35C)'
                      : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 65%, transparent)',
                  }}
                >
                  {tItem.label}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="w-9 h-9 shrink-0 flex items-center justify-center border text-[12px] font-bold cursor-pointer"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-accent, #D8A35C) 45%, transparent)',
              color: 'var(--color-accent, #D8A35C)',
            }}
            aria-label={dict.guideBtn}
          >
            {dict.guideShort}
          </button>
        </div>
      </div>

      {/* МОБИЛЬНЫЙ РЕЖИМ: одна рабочая панель за раз */}
      <main className="md:hidden px-3 flex-1">
        {mobileTab === 'formula' && formulaNode}
        {mobileTab === 'spectrum' && spectralNode}
        {mobileTab === 'match' && matchingNode}
        {mobileTab === 'archive' && archiveNode}
      </main>

      {/* ПЛАНШЕТ И ПК: многопанельная спектральная лаборатория */}
      <main className="hidden md:grid md:grid-cols-12 gap-5 px-6 lg:px-8 pt-5 max-w-[1440px] mx-auto w-full flex-1 items-start">
        {/* Левая колонка: Формула + Спектр */}
        <div className="md:col-span-7 xl:col-span-7 flex flex-col gap-5">
          {formulaNode}
          {spectralNode}
        </div>

        {/* Правая колонка: Подбор рецепта или Архив пигментов */}
        <div className="md:col-span-5 xl:col-span-5 flex flex-col gap-5">
          {desktopRightTab === 'match' ? matchingNode : archiveNode}
        </div>
      </main>

      <PigmentDossierModal
        lang={lang}
        dict={dict}
        pigment={inspectedPigment}
        onClose={() => setInspectedPigmentId(null)}
      />

      <MasterGuideModal
        open={showGuideModal}
        dict={dict}
        onClose={() => setShowGuideModal(false)}
      />
    </motion.div>
  )
}

