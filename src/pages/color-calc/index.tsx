import { motion, useReducedMotion } from 'framer-motion'
import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from 'react'

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
import { useAtelierTheme } from './themeTokens'
import {
  hapticConfirm,
  hapticError,
  hapticSelect,
  hapticSuccess,
  hapticTap,
  isHapticsEnabled,
  setHapticsEnabled,
} from './haptics'
import { resolveSubstrateSpectrum, type SubstratePresetId } from './substrate'

export interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

type MobileTabId = 'formula' | 'spectrum' | 'match' | 'archive'
type DesktopRightTabId = 'match' | 'archive'

function calculateDeltaE2000Hex(hex1: string, hex2: string): number {
  const rgb1 = hexToRgbObj(hex1)
  const rgb2 = hexToRgbObj(hex2)
  return calculateDeltaE2000(
    rgbToLab(rgb1.r, rgb1.g, rgb1.b),
    rgbToLab(rgb2.r, rgb2.g, rgb2.b)
  )
}

function buildAllInventoryIds(loaded: Pigment[], sys: CoverageSystem): string[] {
  const ids = loaded
    .filter((p) => p.id !== 'acrylic_binder' && p.id !== 'cardboard' && Boolean(p.spectrum))
    .map((p) => p.id)
  if (sys === 'acrylic' && loaded.some((p) => p.id === 'acrylic_binder')) {
    ids.push('acrylic_binder')
  }
  return ids
}

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const dict = useMemo(() => getColorCalcDict(lang), [lang])
  const prefersReduced = useReducedMotion()
  const { isDark, toggleTheme, tokens } = useAtelierTheme()

  const [hapticsOn, setHapticsOn] = useState<boolean>(() => isHapticsEnabled())
  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [copied, setCopied] = useState(false)

  const [mobileTab, setMobileTab] = useState<MobileTabId>('formula')
  const [desktopRightTab, setDesktopRightTab] = useState<DesktopRightTabId>('match')

  const [isWet, setIsWet] = useState(false)
  const [illuminant, setIlluminant] = useState<IlluminantType>('D65')
  const [substrateId, setSubstrateId] = useState<SubstratePresetId | 'custom'>('crust')
  const [customSubstrateHex, setCustomSubstrateHex] = useState('#6E4B3A')
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
        setInventoryIds(buildAllInventoryIds(loaded, 'acrylic'))
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

  const layerSwatches = useMemo<LayerSwatchItem[] | null>(() => {
    if (!mixedColor?.spectrum || pigments.length === 0) return null
    const baseSpectrum = resolveSubstrateSpectrum(substrateId, customSubstrateHex, pigments)
    const sim = simulateLayersKM(baseSpectrum, mixedColor.spectrum, system)
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
  }, [mixedColor, pigments, substrateId, customSubstrateHex, system, illuminant, dict.coatLabels])

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
        color: pig.hex || tokens.accent,
        spectrum: pig.spectrum,
      })
    }
    return out
  }, [paints, pigments, lang, tokens.accent])

  const inspectedPigment = useMemo(
    () => (inspectedPigmentId ? pigments.find((p) => p.id === inspectedPigmentId) : undefined),
    [inspectedPigmentId, pigments]
  )

  const activePigmentIds = useMemo(() => paints.map((p) => p.pigmentId), [paints])

  const scaleFormulaToVolume = useCallback(
    (targetMl: number) => {
      if (!Number.isFinite(targetMl) || targetMl <= 0 || totalAmount <= 0) return
      hapticConfirm()
      const factor = targetMl / totalAmount
      setPaints((prev) => {
        let maxIdx = -1
        let maxVal = -1
        const scaledNums = prev.map((row, idx) => {
          const cur = parseFloat(row.amount) || 0
          if (cur <= 0) return 0
          const val = Math.max(0.05, Math.round(cur * factor * 100) / 100)
          if (val > maxVal) {
            maxVal = val
            maxIdx = idx
          }
          return val
        })
        if (maxIdx >= 0) {
          const sum = scaledNums.reduce((a, b) => a + b, 0)
          const diff = Math.round((targetMl - sum) * 100) / 100
          if (scaledNums[maxIdx] + diff >= 0.05) {
            scaledNums[maxIdx] = Math.round((scaledNums[maxIdx] + diff) * 100) / 100
          }
        }
        return prev.map((row, idx) =>
          scaledNums[idx] > 0 ? { ...row, amount: String(scaledNums[idx]) } : row
        )
      })
    },
    [totalAmount, setPaints]
  )

  const handleAddFromArchive = useCallback(
    (pigmentId: string) => {
      hapticConfirm()
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
      hapticSuccess()
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      hapticError()
    }
  }

  const runRecipeSearch = () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(targetHex) || pigments.length === 0 || inventoryIds.length === 0) {
      hapticError()
      return
    }
    hapticConfirm()
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
        hapticError()
        setRecipeError(String(e.data.error))
        setRecipeResult(null)
        return
      }
      const result = e.data.result as RecipeResult | null
      setRecipeResult(result)
      if (!result) {
        hapticError()
        setRecipeError(dict.recipeError)
      } else {
        hapticSuccess()
      }
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
    hapticConfirm()
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
        hapticSuccess()
      } catch (err) {
        console.error(err)
        hapticError()
      } finally {
        setIsAutoAdjusting(false)
      }
    }, 40)
  }

  const sendRecipeToMix = () => {
    if (!recipeResult?.recipe?.length) return
    hapticConfirm()
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
    hapticSelect()
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

  const toggleInventory = (pid: string) => {
    hapticSelect()
    setInventoryIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
    )
  }

  const selectAllInventory = () => {
    hapticTap()
    setInventoryIds(buildAllInventoryIds(pigments, system))
  }

  const clearInventory = () => {
    hapticTap()
    setInventoryIds([])
  }

  const handleToggleHaptics = () => {
    const next = !hapticsOn
    setHapticsOn(next)
    setHapticsEnabled(next)
    if (next) hapticTap()
  }

  const themeVars = {
    '--color-bg': tokens.pageBg,
    '--color-surface': tokens.surface,
    '--color-ink': tokens.ink,
    '--color-accent': tokens.accent,
    '--color-danger': tokens.danger,
  } as CSSProperties

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
      onAddPaint={() => {
        hapticTap()
        addPaint()
      }}
      onRemovePaint={(id) => {
        hapticTap()
        removePaint(id)
      }}
      onUpdatePaint={updatePaint}
      onClearAmounts={() => {
        hapticTap()
        clearAllAmounts()
      }}
      onScaleToVolume={scaleFormulaToVolume}
      isWet={isWet}
      onToggleWet={() => {
        hapticSelect()
        setIsWet((w) => !w)
      }}
      illuminant={illuminant}
      onIlluminantChange={(ill) => {
        hapticSelect()
        setIlluminant(ill)
      }}
      substrateId={substrateId}
      customSubstrateHex={customSubstrateHex}
      onSelectSubstrate={(id) => {
        hapticSelect()
        setSubstrateId(id)
      }}
      onCustomSubstrateChange={(hex) => {
        setSubstrateId('custom')
        setCustomSubstrateHex(hex)
      }}
      layerSwatches={layerSwatches}
      selectedCoatIdx={selectedCoatIdx}
      onSelectCoat={(idx) => {
        hapticSelect()
        setSelectedCoatIdx(idx)
      }}
      displayHex={displayHex}
      activeLab={activeLab}
      activeTarget={activeTarget}
      onClearTarget={() => {
        hapticTap()
        setActiveTarget(null)
      }}
      liveDeltaE={liveDeltaE}
      copied={copied}
      onCopyHex={copyHex}
      isAutoAdjusting={isAutoAdjusting}
      onAutoAdjust={autoAdjustCurrentMix}
      onInspectPigment={(id) => {
        hapticTap()
        setInspectedPigmentId(id)
      }}
      onOpenGuide={() => {
        hapticTap()
        setShowGuideModal(true)
      }}
    />
  )

  const spectralNode = (
    <SpectralChart
      primarySpectrum={mixedColor?.spectrum || null}
      primaryColor={displayHex || tokens.accent}
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
      onMaxComponentsChange={(n) => {
        hapticSelect()
        setMaxComponents(n)
      }}
      system={system}
      onSystemChange={handleSystemChange}
      inventoryIds={inventoryIds}
      onToggleInventory={toggleInventory}
      onSelectAllInventory={selectAllInventory}
      onClearInventory={clearInventory}
      recipeLoading={recipeLoading}
      recipeError={recipeError}
      recipeResult={recipeResult}
      onRunRecipeSearch={runRecipeSearch}
      onSendRecipeToMix={sendRecipeToMix}
      onInspectPigment={(id) => {
        hapticTap()
        setInspectedPigmentId(id)
      }}
    />
  )

  const archiveNode = (
    <PigmentArchive
      lang={lang}
      dict={dict}
      pigments={pigments}
      activePigmentIds={activePigmentIds}
      onAddToFormula={handleAddFromArchive}
      onInspectPigment={(id) => {
        hapticTap()
        setInspectedPigmentId(id)
      }}
    />
  )

  const mobileTabs: { id: MobileTabId; label: string }[] = [
    { id: 'formula', label: dict.navFormula },
    { id: 'spectrum', label: dict.navSpectrum },
    { id: 'match', label: dict.navMatch },
    { id: 'archive', label: dict.navArchive },
  ]

  const isMobileMatch = mobileTab === 'match'
  const footerColor = isMobileMatch
    ? recipeResult?.resultHex || targetHex
    : displayHex || tokens.surfaceSoft
  const footerLabel = isMobileMatch
    ? recipeResult
      ? `ΔE ${recipeResult.deltaE.toFixed(1)}`
      : targetHex
    : liveDeltaE !== null
    ? `ΔE ${liveDeltaE.toFixed(1)}`
    : displayHex || '—'

  const themeToggleButton = (
    <button
      type="button"
      onClick={() => {
        hapticTap()
        toggleTheme()
      }}
      aria-label={isDark ? 'Light mode' : 'Dark mode'}
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-colors border"
      style={{
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        color: tokens.inkSecondary,
      }}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
      transition={{ duration: prefersReduced ? 0.05 : 0.2 }}
      className="min-h-[100dvh] flex flex-col w-full overflow-x-hidden transition-colors duration-200 select-none"
      style={{
        ...themeVars,
        backgroundColor: tokens.pageBg,
        color: tokens.ink,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {/* ШАПКА ДЛЯ ПЛАНШЕТА И ПК */}
      <header
        className="hidden md:flex items-center justify-between px-6 lg:px-8 py-4 border-b max-w-[1440px] mx-auto w-full"
        style={{ borderColor: tokens.border }}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              hapticTap()
              onBack()
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center border cursor-pointer transition-colors"
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              color: tokens.ink,
            }}
            aria-label={dict.back}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18L9 12L15 6" />
            </svg>
          </button>

          <div>
            <div
              className="text-[11px] tracking-[0.22em] uppercase font-semibold"
              style={{ color: tokens.accent }}
            >
              {dict.brand} · {dict.edition}
            </div>
            <h1 className="text-[22px] font-serif tracking-tight leading-tight mt-0.5">
              {dict.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className="flex p-1 rounded-xl border"
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
          >
            {(['match', 'archive'] as const).map((id) => {
              const active = desktopRightTab === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    hapticSelect()
                    setDesktopRightTab(id)
                  }}
                  className="px-4 py-1.5 rounded-lg text-[12px] font-sans font-semibold transition-colors cursor-pointer"
                  style={{
                    backgroundColor: active ? tokens.activeBg : 'transparent',
                    color: active ? tokens.activeText : tokens.inkSecondary,
                  }}
                >
                  {id === 'match' ? dict.navMatch : dict.navArchive}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleToggleHaptics}
            className="h-10 px-3.5 rounded-xl text-[12px] font-sans font-medium border cursor-pointer transition-colors"
            style={{
              backgroundColor: hapticsOn ? tokens.activeTintBg : tokens.surface,
              borderColor: hapticsOn ? tokens.activeTintBorder : tokens.border,
              color: hapticsOn ? tokens.accent : tokens.inkMuted,
            }}
          >
            {hapticsOn ? 'Haptic ON' : 'Haptic OFF'}
          </button>

          {themeToggleButton}

          <button
            type="button"
            onClick={() => {
              hapticTap()
              setShowGuideModal(true)
            }}
            className="h-10 px-4 rounded-xl text-[12px] font-sans font-semibold border cursor-pointer"
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              color: tokens.accent,
            }}
          >
            {dict.guideBtn}
          </button>
        </div>
      </header>

      {/* МОБИЛЬНАЯ СТРОКА НАВИГАЦИИ */}
      <div className="md:hidden px-4 pt-3 pb-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            hapticTap()
            onBack()
          }}
          className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border cursor-pointer"
          style={{
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
            color: tokens.ink,
          }}
          aria-label={dict.back}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18L9 12L15 6" />
          </svg>
        </button>

        <div
          className="flex-1 min-w-0 grid grid-cols-4 p-1 rounded-xl border"
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          {mobileTabs.map((tItem) => {
            const active = mobileTab === tItem.id
            return (
              <button
                key={tItem.id}
                type="button"
                onClick={() => {
                  hapticSelect()
                  setMobileTab(tItem.id)
                }}
                className="py-1.5 px-0.5 rounded-lg text-[11px] font-sans font-semibold transition-colors cursor-pointer truncate"
                style={{
                  backgroundColor: active ? tokens.activeBg : 'transparent',
                  color: active ? tokens.activeText : tokens.inkSecondary,
                }}
              >
                {tItem.label}
              </button>
            )
          })}
        </div>

        {themeToggleButton}
      </div>

      {/* СМАРТФОН */}
      <main className="md:hidden px-4 pt-1 pb-24 flex-1">
        {mobileTab === 'formula' && formulaNode}
        {mobileTab === 'spectrum' && spectralNode}
        {mobileTab === 'match' && matchingNode}
        {mobileTab === 'archive' && archiveNode}
      </main>

      {/* ПЛАНШЕТ (md) И ПК (xl) */}
      <main className="hidden md:grid md:grid-cols-12 gap-6 xl:gap-8 px-6 lg:px-8 pt-6 pb-20 max-w-[1440px] mx-auto w-full flex-1 items-start">
        <div className="md:col-span-7 xl:col-span-7 flex flex-col gap-6">
          {formulaNode}
          {spectralNode}
        </div>
        <div className="md:col-span-5 xl:col-span-5 flex flex-col gap-6 xl:sticky xl:top-6">
          {desktopRightTab === 'match' ? matchingNode : archiveNode}
        </div>
      </main>

      {/* НИЖНЯЯ РЕДАКЦИОННАЯ ПАНЕЛЬ */}
      <footer
        className="sticky bottom-0 z-30 border-t px-4 py-3"
        style={{
          backgroundColor: tokens.pageBg,
          borderColor: tokens.border,
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              hapticTap()
              setShowGuideModal(true)
            }}
            className="flex items-center gap-2.5 bg-transparent border-0 cursor-pointer py-1 px-1 shrink-0"
            style={{ color: tokens.ink }}
          >
            <span
              className="w-4 h-4 rounded-full border border-black/15 shrink-0"
              style={{ backgroundColor: footerColor }}
            />
            <span className="text-[13px] font-mono font-semibold tabular-nums">
              {footerLabel}
            </span>
          </button>

          <span
            className="hidden min-[400px]:inline text-[11px] font-sans uppercase tracking-[0.18em] truncate"
            style={{ color: tokens.inkMuted }}
          >
            CORDWAINE · SPECTRAL ATELIER
          </span>

          {isMobileMatch ? (
            <button
              type="button"
              onClick={recipeResult ? sendRecipeToMix : runRecipeSearch}
              disabled={recipeLoading || loading || inventoryIds.length === 0}
              className="h-10 px-4 rounded-xl text-[13px] font-sans font-semibold cursor-pointer disabled:opacity-35 shrink-0 transition-colors"
              style={{
                backgroundColor: recipeResult ? tokens.accent : tokens.activeBg,
                color: tokens.activeText,
              }}
            >
              {recipeLoading ? '...' : recipeResult ? dict.navFormula : dict.navMatch}
            </button>
          ) : (
            <button
              type="button"
              onClick={copyHex}
              disabled={!displayHex}
              className="h-10 px-4 rounded-xl text-[13px] font-sans font-semibold cursor-pointer disabled:opacity-35 shrink-0 transition-colors"
              style={{
                backgroundColor: tokens.activeBg,
                color: tokens.activeText,
              }}
            >
              {copied ? dict.copied : dict.copy}
            </button>
          )}
        </div>
      </footer>

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
