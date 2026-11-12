import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

import { Lang } from '../App'
import { Pigment } from '../data/pigments'
import { loadAllPigments } from '../data/loadPigments'
import { getPigmentLore, OpacityLevel } from '../data/pigmentLore'
import { usePaintMix } from '../hooks/usePaintMix'
import { useColorCalculations } from '../hooks/useColorCalculations'
import { PigmentSelector } from '../components/PigmentSelector'
import {
  type CoverageSystem,
  type RecipeResult,
  getPigmentCategory,
  simulateLayersKM,
  rgbToLab,
  calculateDeltaE2000,
  hexToRgbObj,
} from '../utils/calculatorLogic'

import { mixSpectra, spectrumToRGB, rgbToHex } from '../utils/colorScience'

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

type TabId = 'mix' | 'pro'

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

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true
  return false
}

function calculateDeltaE2000Hex(hex1: string, hex2: string): number {
  const rgb1 = hexToRgbObj(hex1)
  const rgb2 = hexToRgbObj(hex2)
  return calculateDeltaE2000(
    rgbToLab(rgb1.r, rgb1.g, rgb1.b),
    rgbToLab(rgb2.r, rgb2.g, rgb2.b)
  )
}

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  const [pigments, setPigments] = useState<Pigment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [copied, setCopied] = useState(false)

  const [tab, setTab] = useState<TabId>('mix')
  const [isWet, setIsWet] = useState(false)
  const [isAutoAdjusting, setIsAutoAdjusting] = useState(false)
  // Активный слой выкраски (0 = 1 слой, 1 = 2 слоя, 2 = 3 слоя, 3 = Полный ∞)
  const [selectedCoatIdx, setSelectedCoatIdx] = useState<number>(3)
  // Открытый паспорт пигмента
  const [inspectedPigmentId, setInspectedPigmentId] = useState<string | null>(null)
  // Открытая памятка-шпаргалка (что такое Слои, Мокрая/Сухая, Кроющий/Лессировочный)
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false)

  const {
    paints,
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
  const [activeCategory, setActiveCategory] = useState<string>('ALL')

  const [inventoryIds, setInventoryIds] = useState<string[]>([])
  const [maxComponents, setMaxComponents] = useState<3 | 4>(3)
  const [system, setSystem] = useState<CoverageSystem>('acrylic')
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [recipeResult, setRecipeResult] = useState<RecipeResult | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const uploadedImgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null)
  const [pickerCrosshair, setPickerCrosshair] = useState<{ x: number; y: number } | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const reqIdRef = useRef(0)
  const isIOSRef = useRef(detectIOS())

  const isIOS = isIOSRef.current

  const t = {
    ru: {
      edition: 'ATELIER COLORIMETRY · КУБЕЛКА–МУНК',
      title: 'Ателье Формул',
      mixTab: 'Формула Смеси',
      proTab: 'Ателье Подбора',
      mixComposition: 'Пропорции компонентов',
      clear: 'Сбросить вес',
      loading: 'Загрузка спектрального архива…',
      loadError: 'Не удалось загрузить спектры',
      retry: 'Повторить',
      addPigment: '+ Добавить компонент',
      autoAdjust: 'Калибровать под цель',
      adjusting: 'Калибровка…',
      result: 'Карта Оттенка',
      guideBtn: 'Как читать карту?',
      wet: 'Мокрая (Глянец)',
      dry: 'Сухая (Мат)',
      wetExplain: 'Свежая краска в баночке или под глянцевым лаком/воском — цвет глубже и темнее.',
      dryExplain: 'Высохшая краска без лака — микропоры рассеивают свет, тон выглядит чуть светлее и матовее.',
      reset: 'Снять цель',
      target: 'Эталон',
      mix: 'Образец',
      ciePerfect: 'Эталонный допуск Haute Couture (ΔE ≤ 2.0)',
      cieAcceptable: 'Коммерческий допуск (ΔE 2.0 – 5.0)',
      cieBad: 'Требуется корректировка тона (ΔE > 5.0)',
      copy: 'Скопировать',
      copied: 'Скопировано',
      totalVolume: 'Суммарный выход',
      targetColor: 'Целевой Образец',
      uploadPhoto: 'Загрузить Лукбук / Фото',
      camera: 'Видоискатель',
      photo: 'Фототека',
      pickColor: 'Зафиксировать тон',
      tapPhotoHint: 'Нажмите на любую область фото для снятия оттенка',
      maxPigments: 'комп.',
      acrylic: 'Акрил (Кроющий)',
      aniline: 'Анилин (Лессировка)',
      inventory: 'Палитра Ателье',
      default: 'Базовая',
      all: 'Весь архив',
      picking: 'Спектральный синтез…',
      pickRecipe: 'Синтезировать Рецепт',
      recipeError: 'Не удалось синтезировать точный рецепт',
      cameraNotReady: 'Оптика фокусируется, подождите секунду',
      recipe: 'Спецификация Рецепта',
      binder: 'Акриловое связующее (База)',
      moveToMix: 'Передать на колеровку →',
      pigmentInfoBtn: 'История и где брать',
      dossierTitle: 'Паспорт пигмента',
      dossierChem: 'Химический класс и индекс',
      dossierOpacityMeaning: 'Что значит укрывистость на коже',
      dossierHistory: 'История открытия',
      dossierLeather: 'Применение в кожевенном ремесле',
      dossierWhereToBuy: 'Где брать и в каких красках искать',
      dossierLeatherBrands: 'Краски для кожи и обуви (Cordwainer):',
      dossierArtSuppliers: 'Чистые пигменты и акриловые дисперсии:',
      dossierClose: 'Понятно, закрыть',
      opacityOpaque: 'Кроющий',
      opacitySemiOpaque: 'Полукроющий',
      opacitySemiTrans: 'Полупрозрачный',
      opacityTrans: 'Лессировочный',
      opacityDesc: {
        opaque: 'Кроющий (плотный) — закрашивает старый цвет кожи и пятна за 1–2 слоя, как грунтовая эмаль.',
        'semi-opaque': 'Полукроющий — полностью перекрывает фон за 2–3 слоя, сохраняя живую текстуру кожи.',
        'semi-transparent': 'Полупрозрачный — мягко тонирует кожу, оставляя видимым её природный рисунок.',
        transparent: 'Лессировочный (прозрачный) — работает как цветное стекло для патины, глассажа и глубоких переливов.',
      },
      coatLabels: ['1 слой', '2 слоя', '3 слоя', 'Полный ∞'],
      coatExplanations: [
        '1 слой: тонкое нанесение — сквозь полупрозрачную краску ещё просвечивает светлая кожа.',
        '2 слоя: стандартная покраска — цвет набирает силу, но прозрачные пигменты ещё дают глубину.',
        '3 слоя: плотное покрытие — базовый фон кожи почти полностью перекрыт.',
        'Полный (∞): 100% перекрытие — итоговый цвет густой краски в баночке или в 4+ слоёв.',
      ],
      guideModalTitle: 'Шпаргалка мастера: как работает карта оттенка',
      guideSectionCoats: '1. Что такое «1 слой, 2 слоя, 3 слоя, Полный ∞»?',
      guideSectionCoatsText:
        'Краска на коже ложится не сразу намертво: в 1 слой сквозь неё слегка просвечивает бежевая кожа (особенно у прозрачных пигментов). Нажимая на кнопки «1 слой → 2 слоя → 3 слоя → Полный ∞», вы заранее видите, сколько слоёв нужно нанести кистью или аэрографом, чтобы перекрыть кожу до нужного оттенка.',
      guideSectionWetDry: '2. Зачем переключатель «Сухая (Мат) / Мокрая (Глянец)»?',
      guideSectionWetDryText:
        'Любая краска для кожи при высыхании немного светлеет и становится матовой, потому что микрошероховатости рассеивают свет. Режим «Сухая» показывает цвет высохшей краски без финиша. Режим «Мокрая» показывает, каким сочным и тёмным станет этот же цвет, пока он свежий или когда вы покроете обувь глянцевым лаком, аппретом или воском.',
      guideSectionOpacity: '3. Что означают типы укрывистости пигментов?',
      ml: 'мл',
      l: 'л',
    },
    uk: {
      edition: 'ATELIER COLORIMETRY · КУБЕЛКА–МУНК',
      title: 'Ательє Формул',
      mixTab: 'Формула Суміші',
      proTab: 'Ательє Підбору',
      mixComposition: 'Пропорції компонентів',
      clear: 'Скинути вагу',
      loading: 'Завантаження спектрального архіву…',
      loadError: 'Помилка завантаження спектрів',
      retry: 'Повторити',
      addPigment: '+ Додати компонент',
      autoAdjust: 'Калібрувати під ціль',
      adjusting: 'Калібрування…',
      result: 'Карта Відтінку',
      guideBtn: 'Як читати карту?',
      wet: 'Мокра (Глянець)',
      dry: 'Суха (Мат)',
      wetExplain: 'Свіжа фарба в баночці або під глянцевим лаком/воском — колір глибший і темніший.',
      dryExplain: 'Висохла фарба без лаку — мікропори розсіюють світло, тон виглядає трохи світлішим і матовішим.',
      reset: 'Зняти ціль',
      target: 'Еталон',
      mix: 'Зразок',
      ciePerfect: 'Еталонний допуск Haute Couture (ΔE ≤ 2.0)',
      cieAcceptable: 'Комерційний допуск (ΔE 2.0 – 5.0)',
      cieBad: 'Потребує коригування тону (ΔE > 5.0)',
      copy: 'Скопіювати',
      copied: 'Скопійовано',
      totalVolume: 'Сумарний вихід',
      targetColor: 'Цільовий Зразок',
      uploadPhoto: 'Завантажити Лукбук / Фото',
      camera: 'Видошукач',
      photo: 'Фототека',
      pickColor: 'Зафіксувати тон',
      tapPhotoHint: 'Натисніть на будь-яку ділянку фото для зняття відтінку',
      maxPigments: 'комп.',
      acrylic: 'Акрил (Криючий)',
      aniline: 'Анілін (Лесування)',
      inventory: 'Палітра Ательє',
      default: 'Базова',
      all: 'Увесь архів',
      picking: 'Спектральний синтез…',
      pickRecipe: 'Синтезувати Рецепт',
      recipeError: 'Не вдалося синтезувати рецепт',
      cameraNotReady: 'Оптика фокусується, зачекайте секунду',
      recipe: 'Специфікація Рецепта',
      binder: 'Акрилове зв’язуюче (База)',
      moveToMix: 'Передати на колерування →',
      pigmentInfoBtn: 'Історія та де брати',
      dossierTitle: 'Паспорт пігменту',
      dossierChem: 'Хімічний клас та індекс',
      dossierOpacityMeaning: 'Що означає покривність на шкірі',
      dossierHistory: 'Історія відкриття',
      dossierLeather: 'Застосування у шкіряному ремеслі',
      dossierWhereToBuy: 'Де брати та в яких фарбах шукати',
      dossierLeatherBrands: 'Фарби для шкіри та взуття (Cordwainer):',
      dossierArtSuppliers: 'Чисті пігменти та акрилові дисперсії:',
      dossierClose: 'Зрозуміло, закрити',
      opacityOpaque: 'Криючий',
      opacitySemiOpaque: 'Напівкриючий',
      opacitySemiTrans: 'Напівпрозорий',
      opacityTrans: 'Лесувальний',
      opacityDesc: {
        opaque: 'Криючий (щільний) — зафарбовує старий колір шкіри та плями за 1–2 шари, як ґрунтова емаль.',
        'semi-opaque': 'Напівкриючий — повністю перекриває фон за 2–3 шари, зберігаючи живу текстуру шкіри.',
        'semi-transparent': 'Напівпрозорий — м’яко тонує шкіру, залишаючи видимим її природний малюнок.',
        transparent: 'Лесувальний (прозорий) — працює як кольорове скло для патини, гласажу та глибоких переливів.',
      },
      coatLabels: ['1 шар', '2 шари', '3 шари', 'Повний ∞'],
      coatExplanations: [
        '1 шар: тонке нанесення — крізь напівпрозору фарбу ще просвічує світла шкіра.',
        '2 шари: стандартне фарбування — колір набирає силу, але прозорі пігменти ще дають глибину.',
        '3 шари: щільне покриття — базовий фон шкіри майже повністю перекритий.',
        'Повний (∞): 100% перекриття — підсумковий колір густої фарби в баночці або в 4+ шарів.',
      ],
      guideModalTitle: 'Шпаргалка майстра: як працює карта відтінку',
      guideSectionCoats: '1. Що таке «1 шар, 2 шари, 3 шари, Повний ∞»?',
      guideSectionCoatsText:
        'Фарба на шкірі лягає поступово: в 1 шар крізь неї злегка просвічує бежева основа шкіри. Натискаючи на кнопки шарів, ви заздалегідь бачите, скільки проходів пензлем чи аерографом потрібно зробити.',
      guideSectionWetDry: '2. Навіщо перемикач «Суха (Мат) / Мокра (Глянець)»?',
      guideSectionWetDryText:
        'Будь-яка фарба при висиханні трохи світлішає і стає матовою. Режим «Суха» показує висохлу фарбу без фінішу, а «Мокра» — яким насиченим стане колір під глянцевим лаком, апретом або воском.',
      guideSectionOpacity: '3. Що означають типи покривності пігментів?',
      ml: 'мл',
      l: 'л',
    },
    de: {
      edition: 'ATELIER COLORIMETRY · KUBELKA–MUNK',
      title: 'Farb-Atelier',
      mixTab: 'Rezeptur',
      proTab: 'Atelier-Matching',
      mixComposition: 'Komponenten & Anteile',
      clear: 'Gewicht leeren',
      loading: 'Spektralarchiv wird geladen…',
      loadError: 'Fehler beim Laden der Spektren',
      retry: 'Wiederholen',
      addPigment: '+ Komponente hinzufügen',
      autoAdjust: 'Auf Ziel kalibrieren',
      adjusting: 'Kalibrierung…',
      result: 'Farbkarte',
      guideBtn: 'Hilfe & Begriffe',
      wet: 'Nass (Glanz)',
      dry: 'Trocken (Matt)',
      wetExplain: 'Frische Farbe im Glas oder unter Glanz-Finish/Wachs — der Farbton wirkt tiefer und dunkler.',
      dryExplain: 'Getrocknete Farbe ohne Finish — durch Lichtstreuung wirkt der Ton etwas heller und matter.',
      reset: 'Ziel lösen',
      target: 'Referenz',
      mix: 'Muster',
      ciePerfect: 'Haute-Couture-Toleranz (ΔE ≤ 2.0)',
      cieAcceptable: 'Kommerziell akzeptabel (ΔE 2.0 – 5.0)',
      cieBad: 'Tonkorrektur erforderlich (ΔE > 5.0)',
      copy: 'Kopieren',
      copied: 'Kopiert',
      totalVolume: 'Gesamtvolumen',
      targetColor: 'Ziel-Referenz',
      uploadPhoto: 'Lookbook / Foto laden',
      camera: 'Sucher',
      photo: 'Galerie',
      pickColor: 'Farbton erfassen',
      tapPhotoHint: 'Tippen Sie auf das Foto, um den Farbton aufzunehmen',
      maxPigments: 'Komp.',
      acrylic: 'Acryl (Deckend)',
      aniline: 'Anilin (Lasur)',
      inventory: 'Atelier-Archiv',
      default: 'Standard',
      all: 'Alle',
      picking: 'Spektralsynthese…',
      pickRecipe: 'Rezeptur Synthetisieren',
      recipeError: 'Rezeptur konnte nicht erstellt werden',
      cameraNotReady: 'Kamera fokussiert, bitte warten',
      recipe: 'Rezeptur-Spezifikation',
      binder: 'Acryl-Bindemittel (Basis)',
      moveToMix: 'In Rezeptur übernehmen →',
      pigmentInfoBtn: 'Historie & Bezugsquellen',
      dossierTitle: 'Pigment-Dossier',
      dossierChem: 'Chemische Klasse & Colour Index',
      dossierOpacityMeaning: 'Bedeutung der Deckkraft auf Leder',
      dossierHistory: 'Entdeckungsgeschichte',
      dossierLeather: 'Anwendung im Schuh- & Lederhandwerk',
      dossierWhereToBuy: 'Bezugsquellen & Marken',
      dossierLeatherBrands: 'Leder- & Schuhfarben (Cordwainer):',
      dossierArtSuppliers: 'Reinpigmente & Künstler-Dispersionen:',
      dossierClose: 'Verstanden, schließen',
      opacityOpaque: 'Deckend',
      opacitySemiOpaque: 'Halbdeckend',
      opacitySemiTrans: 'Halbtransparent',
      opacityTrans: 'Lasierend',
      opacityDesc: {
        opaque: 'Deckend — überdeckt den alten Lederton und Flecken bereits in 1–2 Schichten vollständig.',
        'semi-opaque': 'Halbdeckend — deckt nach 2–3 Schichten voll ab und erhält die natürliche Ledernarbung.',
        'semi-transparent': 'Halbtransparent — tönt das Leder sanft ab, während die Struktur sichtbar bleibt.',
        transparent: 'Lasierend (transparent) — wirkt wie farbiges Glas für Patina, Wasserglanz und Tiefeneffekte.',
      },
      coatLabels: ['1. Schicht', '2. Schicht', '3. Schicht', 'Vollton ∞'],
      coatExplanations: [
        '1. Schicht: Dünner Auftrag — das helle Grundleder scheint bei lasierenden Pigmenten noch durch.',
        '2. Schicht: Normaler Auftrag — der Farbton gewinnt an Tiefe und Sättigung.',
        '3. Schicht: Dichter Auftrag — der Untergrund ist fast vollständig abgedeckt.',
        'Vollton (∞): 100 % Deckung — die Farbe im Gebinde oder ab 4+ Schichten.',
      ],
      guideModalTitle: 'Atelier-Leitfaden: Schichten, Glanz & Deckkraft',
      guideSectionCoats: '1. Was bedeuten „1. Schicht, 2. Schicht, 3. Schicht, Vollton ∞“?',
      guideSectionCoatsText:
        'Je nach Deckkraft scheint beim ersten Auftrag noch das Grundleder durch. Durch Antippen der Schichten sehen Sie vorab, wie sich der Ton mit jedem Auftrag verändert.',
      guideSectionWetDry: '2. Wozu dient der Schalter „Trocken (Matt) / Nass (Glanz)“?',
      guideSectionWetDryText:
        'Lederfarbe trocknet etwas heller und matter auf. „Trocken“ zeigt den unversiegelten Zustand, „Nass“ zeigt den tiefen Ton im nassen Zustand oder unter Glanzappretur/Wachs.',
      guideSectionOpacity: '3. Was bedeuten die Deckkraft-Stufen?',
      ml: 'ml',
      l: 'l',
    },
  }[lang]

  // Симуляция выкраски в 4 слоя по Кубелке-Мунку с понятными названиями
  const layerSwatches = useMemo(() => {
    if (!mixedColor?.spectrum || pigments.length === 0) return null
    const basePigment =
      pigments.find((p) => p.id === 'cardboard') ||
      pigments.find((p) => p.id === 'titanium_white') ||
      pigments.find((p) => p.id === 'pw_6_anatase')
    if (!basePigment?.spectrum) return null
    const sim = simulateLayersKM(basePigment.spectrum, mixedColor.spectrum, system)
    return [
      { short: 'I', label: t.coatLabels[0], hex: rgbToHex(spectrumToRGB(sim.layer1)).toUpperCase() },
      { short: 'II', label: t.coatLabels[1], hex: rgbToHex(spectrumToRGB(sim.layer2)).toUpperCase() },
      { short: 'III', label: t.coatLabels[2], hex: rgbToHex(spectrumToRGB(sim.layer3)).toUpperCase() },
      { short: '∞', label: t.coatLabels[3], hex: rgbToHex(spectrumToRGB(sim.final)).toUpperCase() },
    ]
  }, [mixedColor, pigments, system, t.coatLabels])

  const activeCoat = layerSwatches ? layerSwatches[selectedCoatIdx] || layerSwatches[3] : null
  const displayHex = activeCoat?.hex || (mixedColor?.hex ? mixedColor.hex.toUpperCase() : null)
  const squareColor = displayHex || '#1E1B19'

  const activeLab = useMemo(() => {
    if (!displayHex) return null
    const rgb = hexToRgbObj(displayHex)
    return rgbToLab(rgb.r, rgb.g, rgb.b)
  }, [displayHex])

  const liveDeltaE =
    activeTarget && displayHex
      ? calculateDeltaE2000Hex(activeTarget, displayHex)
      : null

  const pigmentName = useCallback(
    (p: Pigment | undefined) => {
      if (!p) return '—'
      if (lang === 'uk') return p.name.uk || p.name.ru
      if (lang === 'de') return p.name.de || p.name.ru
      return p.name.ru
    },
    [lang]
  )

  const opacityLabel = useCallback(
    (op: OpacityLevel) => {
      if (op === 'opaque') return t.opacityOpaque
      if (op === 'semi-opaque') return t.opacitySemiOpaque
      if (op === 'semi-transparent') return t.opacitySemiTrans
      return t.opacityTrans
    },
    [t]
  )

  const selectablePigments = useMemo(
    () => pigments.filter((p) => p.id !== 'acrylic_binder' && p.id !== 'cardboard' && p.spectrum),
    [pigments]
  )

  const categories = useMemo(() => {
    const set = new Set<string>()
    selectablePigments.forEach((p) => set.add(getPigmentCategory(p.id, lang)))
    return ['ALL', ...Array.from(set)]
  }, [selectablePigments, lang])

  const filteredInventoryPigments = useMemo(() => {
    if (activeCategory === 'ALL') return selectablePigments
    return selectablePigments.filter((p) => getPigmentCategory(p.id, lang) === activeCategory)
  }, [selectablePigments, activeCategory, lang])

  const inspectedPigment = useMemo(
    () => (inspectedPigmentId ? pigments.find((p) => p.id === inspectedPigmentId) : undefined),
    [inspectedPigmentId, pigments]
  )

  const inspectedLore = useMemo(
    () => (inspectedPigmentId ? getPigmentLore(inspectedPigment, lang) : null),
    [inspectedPigmentId, inspectedPigment, lang]
  )

  const resetInventoryDefaults = useCallback(() => {
    const available = new Set(pigments.map((p) => p.id))
    setInventoryIds(DEFAULT_INVENTORY_IDS.filter((id) => available.has(id)))
  }, [pigments])

  const loadPigments = () => {
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
  }

  useEffect(() => {
    loadPigments()
  }, [])

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((tr) => tr.stop())
    }
  }, [stream])

  useEffect(() => {
    return () => {
      if (uploadedPhotoUrl) URL.revokeObjectURL(uploadedPhotoUrl)
    }
  }, [uploadedPhotoUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!cameraActive || !stream || !video) return
    video.srcObject = stream
    video.muted = true
    video.playsInline = true

    const tryPlay = async () => {
      try {
        await video.play()
      } catch (err) {
        console.error(err)
      }
    }
    if (video.readyState >= 2) tryPlay()
    else {
      const onMeta = () => tryPlay()
      video.addEventListener('loadedmetadata', onMeta)
      return () => video.removeEventListener('loadedmetadata', onMeta)
    }
  }, [cameraActive, stream])

  const ensureWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../workers/recipeWorker.ts', import.meta.url), { type: 'module' })
    }
    return workerRef.current
  }, [])

  const copyHex = async () => {
    if (!displayHex) return
    try {
      await navigator.clipboard?.writeText(displayHex)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Fallback
    }
  }

  const sampleFromSource = useCallback(
    (source: HTMLVideoElement | HTMLImageElement, cx?: number, cy?: number) => {
      const srcW = 'videoWidth' in source ? source.videoWidth : source.naturalWidth
      const srcH = 'videoHeight' in source ? source.videoHeight : source.naturalHeight
      if (!srcW || !srcH) return

      const size = 15
      const half = Math.floor(size / 2)
      const centerX = cx ?? srcW / 2
      const centerY = cy ?? srcH / 2
      const sx = Math.max(0, Math.min(srcW - size, Math.round(centerX - half)))
      const sy = Math.max(0, Math.min(srcH - size, Math.round(centerY - half)))
      const sw = Math.min(size, srcW - sx)
      const sh = Math.min(size, srcH - sy)

      const canvas = document.createElement('canvas')
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)
      const data = ctx.getImageData(0, 0, sw, sh).data

      let sumR = 0,
        sumG = 0,
        sumB = 0
      const pixels = sw * sh
      for (let i = 0; i < data.length; i += 4) {
        sumR += data[i]
        sumG += data[i + 1]
        sumB += data[i + 2]
      }

      const r = Math.round(sumR / pixels)
      const g = Math.round(sumG / pixels)
      const b = Math.round(sumB / pixels)
      const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()

      setTargetHex(hex)
      setRecipeResult(null)
      setRecipeError(null)
    },
    []
  )

  const handleImageFile = (file: File | undefined | null) => {
    if (!file || !file.type.startsWith('image/')) return
    stopCamera()
    if (uploadedPhotoUrl) URL.revokeObjectURL(uploadedPhotoUrl)
    const url = URL.createObjectURL(file)
    setUploadedPhotoUrl(url)
    setPickerCrosshair({ x: 50, y: 50 })
  }

  const handlePhotoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = uploadedImgRef.current
    if (!img || !img.naturalWidth) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    setPickerCrosshair({ x: relX * 100, y: relY * 100 })
    sampleFromSource(img, relX * img.naturalWidth, relY * img.naturalHeight)
  }

  const startCamera = () => {
    setRecipeError(null)
    setUploadedPhotoUrl(null)
    if (isIOSRef.current) {
      fileInputRef.current?.click()
      return
    }
    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        cameraInputRef.current?.click()
        return
      }
      try {
        if (stream) {
          stream.getTracks().forEach((tr) => tr.stop())
          setStream(null)
        }
        let media: MediaStream
        try {
          media = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          })
        } catch {
          media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        }
        setStream(media)
        setCameraActive(true)
      } catch {
        setCameraActive(false)
        setStream(null)
        cameraInputRef.current?.click()
      }
    })()
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((tr) => tr.stop())
      setStream(null)
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
  }

  const captureFromCamera = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) {
      setRecipeError(t.cameraNotReady)
      return
    }
    sampleFromSource(video)
  }

  const runRecipeSearch = () => {
    if (!targetHex || targetHex.length < 7 || pigments.length === 0 || inventoryIds.length === 0) return
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
      if (!result) setRecipeError(t.recipeError)
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
        const colorPaints = paints.filter((p) => p.pigmentId !== 'acrylic_binder' && p.pigmentId !== 'cardboard')
        const binderPaint = paints.find((p) => p.pigmentId === 'acrylic_binder')

        const activePigments = colorPaints
          .map((p) => ({
            paintId: p.id,
            amount: parseFloat(p.amount) || 0,
            pigment: pigments.find((pig) => pig.id === p.pigmentId)!,
          }))
          .filter((p) => p.pigment?.spectrum)

        const n = activePigments.length
        if (n === 0) {
          setIsAutoAdjusting(false)
          return
        }

        const initialTotal = activePigments.reduce((s, p) => s + p.amount, 0)
        const targetTotalVol = initialTotal > 0 ? initialTotal : 20

        let bestVols = activePigments.map((p) => (p.amount > 0 ? p.amount : targetTotalVol / n))
        let minDE = Infinity

        const evaluate = (v: number[]) => {
          const components = activePigments.map((ap, i) => ({
            spectrum: ap.pigment.spectrum!,
            volume: v[i],
          }))
          const mixedSpec = mixSpectra(components, isWet)
          if (!mixedSpec.length) return Infinity
          const rgb = spectrumToRGB(mixedSpec)
          const hex = rgbToHex(rgb)
          return calculateDeltaE2000Hex(activeTarget, hex)
        }

        minDE = evaluate(bestVols)

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
    stopCamera()
    setTab('mix')
  }

  const handleSystemChange = (newSystem: CoverageSystem) => {
    setSystem(newSystem)
    if (newSystem === 'aniline') {
      setInventoryIds((prev) => prev.filter((id) => id !== 'acrylic_binder'))
    } else if (newSystem === 'acrylic') {
      const hasBinder = pigments.some((p) => p.id === 'acrylic_binder')
      if (hasBinder) {
        setInventoryIds((prev) => (prev.includes('acrylic_binder') ? prev : [...prev, 'acrylic_binder']))
      }
    }
  }

  const toggleInventory = (pid: string) =>
    setInventoryIds((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]))

  const selectAllInventory = () => {
    const ids = selectablePigments.map((p) => p.id)
    if (system === 'acrylic' && pigments.some((p) => p.id === 'acrylic_binder')) {
      ids.push('acrylic_binder')
    }
    setInventoryIds(ids)
  }

  const clearInventory = () => setInventoryIds([])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="min-h-screen flex flex-col pt-safe px-4 md:px-8 pb-12 max-w-2xl mx-auto w-full"
      style={{
        background: 'var(--color-bg, #141210)',
        color: 'var(--color-ink, #F5F1EA)',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Editorial Top Header */}
      <header
        className="flex items-center justify-between py-3.5 border-b"
        style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }}
      >
        <button
          onClick={onBack}
          className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full transition-opacity opacity-70 hover:opacity-100"
          style={{ color: 'var(--color-ink, #F5F1EA)' }}
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[9px] tracking-[0.26em] uppercase opacity-45 font-medium">
            {t.edition}
          </span>
          <h1 className="text-[18px] font-serif tracking-wide mt-0.5" style={{ color: 'var(--color-ink, #F5F1EA)' }}>
            {t.title}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowGuideModal(true)}
          style={{
            fontSize: 10,
            padding: '4px 8px',
            border: '1px solid color-mix(in srgb, var(--color-accent, #D8A35C) 50%, transparent)',
            color: 'var(--color-accent, #D8A35C)',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ?
        </button>
      </header>

      {/* Editorial Segmented Switcher */}
      <div
        className="grid grid-cols-2 p-1 rounded-none border my-4"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
          background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 3%, transparent)',
        }}
      >
        {(['mix', 'pro'] as const).map((id) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => {
                setTab(id)
                if (id !== 'pro') stopCamera()
              }}
              className="py-2.5 text-[11px] uppercase tracking-[0.18em] font-semibold transition-all"
              style={{
                background: active ? 'var(--color-ink, #F5F1EA)' : 'transparent',
                color: active ? 'var(--color-bg, #141210)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 60%, transparent)',
              }}
            >
              {id === 'mix' ? t.mixTab : t.proTab}
            </button>
          )
        })}
      </div>

      <div className="flex-1 flex flex-col gap-5">
        {tab === 'mix' && (
          <>
            {/* HAUTE COUTURE LOOKBOOK SWATCH CARD */}
            <section
              className="border overflow-hidden transition-all"
              style={{
                background: 'var(--color-surface, #1C1917)',
                borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
              }}
            >
              {/* Верхняя планка: КАРТА ОТТЕНКА + Как читать карту? + Переключатель Сухая/Мокрая */}
              <div
                className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b"
                style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] opacity-70 font-semibold">
                    {t.result}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGuideModal(true)}
                    style={{
                      fontSize: 10,
                      color: 'var(--color-accent, #D8A35C)',
                      textDecoration: 'underline',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    ⓘ {t.guideBtn}
                  </button>
                  {activeTarget && (
                    <button
                      onClick={() => setActiveTarget(null)}
                      className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 border"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-danger, #f87171) 45%, transparent)',
                        color: 'var(--color-danger, #f87171)',
                      }}
                    >
                      ✕ {t.reset}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setIsWet(!isWet)}
                  className="text-[10px] tracking-[0.12em] uppercase font-semibold px-3 py-1 border transition-all"
                  style={{
                    borderColor: isWet
                      ? 'var(--color-accent, #D8A35C)'
                      : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 18%, transparent)',
                    color: isWet ? 'var(--color-accent, #D8A35C)' : 'var(--color-ink, #F5F1EA)',
                    background: isWet
                      ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 12%, transparent)'
                      : 'transparent',
                  }}
                >
                  {isWet ? t.wet : t.dry}
                </button>
              </div>

              {/* Понятная живая подсказка под переключателем Сухая / Мокрая */}
              <div
                style={{
                  padding: '6px 14px',
                  fontSize: 11,
                  opacity: 0.72,
                  borderBottom: '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                  background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 2%, transparent)',
                }}
              >
                {isWet ? t.wetExplain : t.dryExplain}
              </div>

              {/* Главное поле цвета Lookbook: 50/50 (Эталон слева, Образец активного слоя справа) */}
              <div
                className="relative w-full flex overflow-hidden"
                style={{ height: 152 }}
              >
                {activeTarget && (
                  <div
                    className="w-1/2 h-full relative flex flex-col justify-end p-3.5 border-r"
                    style={{
                      backgroundColor: activeTarget,
                      borderColor: 'rgba(255,255,255,0.18)',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 'fit-content',
                        padding: '3px 8px',
                        fontSize: 9,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        fontFamily: 'monospace',
                        backgroundColor: 'rgba(0,0,0,0.52)',
                        color: '#FFFFFF',
                      }}
                    >
                      {t.target} · {activeTarget}
                    </span>
                  </div>
                )}

                <div
                  className="flex-1 h-full relative flex flex-col justify-between p-3.5 transition-colors duration-300"
                  style={{ backgroundColor: squareColor }}
                >
                  {isWet ? (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.03) 38%, rgba(0,0,0,0.08) 100%)',
                      }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 pointer-events-none opacity-15"
                      style={{
                        backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 0)',
                        backgroundSize: '6px 6px',
                      }}
                    />
                  )}

                  <div className="relative z-10 flex justify-end w-full">
                    {liveDeltaE !== null && (
                      <span
                        style={{
                          padding: '4px 10px',
                          fontSize: 11,
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          backgroundColor: 'rgba(0,0,0,0.68)',
                          color: liveDeltaE <= 2 ? '#4ade80' : liveDeltaE <= 5 ? '#facc15' : '#f87171',
                        }}
                      >
                        ΔE₀₀ {liveDeltaE.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <div className="relative z-10 flex items-end justify-between w-full">
                    <span
                      style={{
                        padding: '3px 8px',
                        fontSize: 9,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        fontFamily: 'monospace',
                        backgroundColor: 'rgba(0,0,0,0.52)',
                        color: '#FFFFFF',
                      }}
                    >
                      {t.mix} {activeCoat ? `(${activeCoat.label})` : ''} · {displayHex || 'UNMIXED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ИНТЕРАКТИВНЫЕ 4 СЛОЯ НАНЕСЕНИЯ («1 слой», «2 слоя», «3 слоя», «Полный ∞») + ПОНЯТНАЯ РАСШИФРОВКА */}
              {layerSwatches && (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      borderTop: '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)',
                    }}
                  >
                    {layerSwatches.map((ls, idx) => {
                      const isSelectedCoat = selectedCoatIdx === idx
                      return (
                        <button
                          key={ls.short}
                          type="button"
                          onClick={() => setSelectedCoatIdx(idx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '9px 4px',
                            borderRight:
                              idx < 3
                                ? '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)'
                                : 'none',
                            borderBottom: isSelectedCoat
                              ? '2px solid var(--color-accent, #D8A35C)'
                              : '2px solid transparent',
                            background: isSelectedCoat
                              ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 14%, transparent)'
                              : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span
                            style={{
                              width: 13,
                              height: 13,
                              borderRadius: '50%',
                              backgroundColor: ls.hex,
                              border: '1px solid rgba(0,0,0,0.25)',
                              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: isSelectedCoat ? 700 : 500,
                              opacity: isSelectedCoat ? 1 : 0.65,
                              color: 'var(--color-ink, #F5F1EA)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {ls.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Человеческое объяснение выбранного слоя */}
                  <div
                    style={{
                      padding: '6px 14px',
                      fontSize: 11,
                      opacity: 0.75,
                      borderTop: '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                      background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 2%, transparent)',
                    }}
                  >
                    {t.coatExplanations[selectedCoatIdx]}
                  </div>
                </>
              )}

              {/* Pantone-Style Technical Specification Footer */}
              <div
                className="p-4 flex flex-wrap items-center justify-between gap-3 border-t"
                style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }}
              >
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-[0.22em] opacity-45">
                    SPECTRUM HEX / CIELAB {activeCoat ? `· ${activeCoat.label.toUpperCase()}` : ''}
                  </span>
                  <div className="flex items-baseline gap-3 mt-0.5">
                    <span className="font-mono text-[20px] font-semibold tracking-wider">
                      {displayHex || '#------'}
                    </span>
                    {activeLab && (
                      <span className="font-mono text-[11px] opacity-55">
                        L*{activeLab.L.toFixed(0)} a*{activeLab.a.toFixed(0)} b*{activeLab.b.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right pr-2">
                    <span className="block text-[9px] uppercase tracking-[0.2em] opacity-45">
                      {t.totalVolume}
                    </span>
                    <span className="font-mono text-[15px] font-semibold tabular-nums">
                      {totalAmount > 1000
                        ? (totalAmount / 1000).toFixed(2) + ' ' + t.l
                        : totalAmount.toFixed(1) + ' ' + t.ml}
                    </span>
                  </div>

                  <button
                    onClick={copyHex}
                    disabled={!displayHex}
                    className="h-10 px-4 text-[11px] uppercase tracking-[0.18em] font-semibold border transition-all disabled:opacity-30"
                    style={{
                      borderColor: 'var(--color-accent, #D8A35C)',
                      background: copied ? 'var(--color-accent, #D8A35C)' : 'transparent',
                      color: copied ? 'var(--color-bg, #141210)' : 'var(--color-accent, #D8A35C)',
                    }}
                  >
                    {copied ? t.copied : t.copy}
                  </button>
                </div>
              </div>

              {liveDeltaE !== null && (
                <div
                  className="px-4 py-2 text-[11px] border-t flex items-center justify-between"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                    background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 3%, transparent)',
                  }}
                >
                  <span className="opacity-75">
                    {liveDeltaE <= 2 ? t.ciePerfect : liveDeltaE <= 5 ? t.cieAcceptable : t.cieBad}
                  </span>
                </div>
              )}
            </section>

            {/* СЕКЦИЯ ПРОПОРЦИЙ КОМПОНЕНТОВ */}
            <section
              className="border p-4 md:p-5"
              style={{
                background: 'var(--color-surface, #1C1917)',
                borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
              }}
            >
              <div
                className="flex items-center justify-between pb-3.5 mb-3.5 border-b"
                style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      backgroundColor: squareColor,
                      border: '1px solid rgba(0,0,0,0.25)',
                      display: 'inline-block',
                    }}
                  />
                  <h2 className="text-[11px] uppercase tracking-[0.22em] font-semibold opacity-75">
                    {t.mixComposition}
                  </h2>
                </div>

                {totalAmount > 0 && (
                  <button
                    onClick={clearAllAmounts}
                    className="text-[10px] uppercase tracking-[0.16em] opacity-60 hover:opacity-100"
                    style={{ color: 'var(--color-danger, #f87171)' }}
                  >
                    {t.clear}
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-10 text-center text-[12px] uppercase tracking-[0.2em] opacity-40">
                  {t.loading}
                </div>
              ) : loadError ? (
                <div className="py-6 flex flex-col items-center gap-3">
                  <p className="text-[12px]" style={{ color: 'var(--color-danger, #f87171)' }}>
                    {t.loadError}
                  </p>
                  <button
                    onClick={loadPigments}
                    className="px-4 py-2 text-[11px] uppercase tracking-[0.16em] border"
                    style={{ borderColor: 'var(--color-accent, #D8A35C)', color: 'var(--color-accent, #D8A35C)' }}
                  >
                    {t.retry}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {paints.map((paint, idx) => {
                    const currentAmount = parseFloat(paint.amount) || 0
                    const sliderMax = Math.max(20, Math.ceil(currentAmount * 1.5))
                    const pct = totalAmount > 0 ? Math.round((currentAmount / totalAmount) * 100) : 0
                    const selectedPigment = pigments.find((p) => p.id === paint.pigmentId)
                    const lore = getPigmentLore(selectedPigment, lang)

                    return (
                      <div
                        key={paint.id}
                        className="p-3 border transition-colors"
                        style={{
                          background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 2%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)',
                          overflow: 'hidden',
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* ЯРУС 1: Номер + Селектор пигмента во всю ширину + Кнопка удаления */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                          <span className="font-mono text-[10px] opacity-40" style={{ width: 18, flexShrink: 0 }}>
                            0{idx + 1}
                          </span>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <PigmentSelector
                              pigments={pigments}
                              value={paint.pigmentId}
                              onChange={(newId) => updatePaint(paint.id, 'pigmentId', newId)}
                              lang={lang}
                              onInspect={(id) => setInspectedPigmentId(id)}
                            />
                          </div>

                          <button
                            onClick={() => removePaint(paint.id)}
                            disabled={paints.length <= 1}
                            className="w-7 h-7 flex items-center justify-center opacity-40 hover:opacity-100 disabled:opacity-10"
                            style={{ flexShrink: 0 }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* ЯРУС 2: Ползунок с minWidth: 0 (чтобы проценты НИКОГДА не вылезали за рамки!) + мл + % */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            paddingLeft: 26,
                            paddingRight: 2,
                            marginTop: 10,
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        >
                          <input
                            type="range"
                            min="0"
                            max={sliderMax}
                            step="0.1"
                            value={currentAmount}
                            onChange={(e) => updatePaint(paint.id, 'amount', e.target.value)}
                            className="h-1 appearance-none cursor-pointer"
                            style={{
                              flex: 1,
                              minWidth: 0,
                              width: '100%',
                              background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 16%, transparent)',
                              accentColor: 'var(--color-accent, #D8A35C)',
                            }}
                          />

                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, flexShrink: 0 }}>
                            <input
                              ref={(el) => {
                                if (el) amountRefs.current.set(paint.id, el)
                                else amountRefs.current.delete(paint.id)
                              }}
                              type="text"
                              inputMode="decimal"
                              enterKeyHint="done"
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
                                const val = e.target.value.replace(',', '.')
                                if (val === '.' || val === '') updatePaint(paint.id, 'amount', '')
                                else {
                                  const num = parseFloat(val)
                                  if (!isNaN(num)) updatePaint(paint.id, 'amount', String(Math.min(num, 5000)))
                                }
                              }}
                              className="bg-transparent border-b border-transparent focus:border-current text-right font-mono text-[15px] font-semibold focus:outline-none p-0"
                              placeholder="0.0"
                              style={{ width: 46, color: 'var(--color-ink, #F5F1EA)' }}
                            />
                            <span className="text-[11px] font-mono opacity-45">{t.ml}</span>
                          </div>

                          <span
                            className="font-mono text-[10px] opacity-55 text-right tabular-nums"
                            style={{ width: 32, flexShrink: 0 }}
                          >
                            {pct}%
                          </span>
                        </div>

                        {/* ЯРУС 3: Кликабельный тип укрывистости (с объяснением) + бренд + кнопка «ⓘ История и где брать» */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            paddingLeft: 26,
                            marginTop: 8,
                            paddingTop: 7,
                            borderTop: '1px solid color-mix(in srgb, var(--color-ink, #F5F1EA) 7%, transparent)',
                            fontSize: 11,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setShowGuideModal(true)}
                            style={{
                              opacity: 0.7,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              minWidth: 0,
                              flex: 1,
                              textAlign: 'left',
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                              color: 'inherit',
                              cursor: 'pointer',
                            }}
                            title={t.opacityDesc[lore.opacity]}
                          >
                            <span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                              {opacityLabel(lore.opacity)} (?)
                            </span>
                            {' · '}
                            <span>{lore.whereToBuy.leatherBrands[0]}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setInspectedPigmentId(paint.pigmentId)}
                            style={{
                              flexShrink: 0,
                              color: 'var(--color-accent, #D8A35C)',
                              fontWeight: 600,
                              textDecoration: 'underline',
                              whiteSpace: 'nowrap',
                              fontSize: 11,
                              cursor: 'pointer',
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                            }}
                          >
                            ⓘ {t.pigmentInfoBtn}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
                <button
                  onClick={addPaint}
                  disabled={loading || loadError}
                  className="flex-1 py-3 text-[11px] uppercase tracking-[0.18em] font-semibold border transition-opacity disabled:opacity-40"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 22%, transparent)',
                    color: 'var(--color-ink, #F5F1EA)',
                  }}
                >
                  {t.addPigment}
                </button>

                {activeTarget && paints.some((p) => p.pigmentId !== 'acrylic_binder') && (
                  <button
                    onClick={autoAdjustCurrentMix}
                    disabled={isAutoAdjusting || loading}
                    className="flex-1 py-3 text-[11px] uppercase tracking-[0.18em] font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: 'var(--color-accent, #D8A35C)',
                      color: 'var(--color-bg, #141210)',
                    }}
                  >
                    {isAutoAdjusting ? t.adjusting : t.autoAdjust}
                  </button>
                )}
              </div>
            </section>
          </>
        )}

        {tab === 'pro' && (
          <>
            {/* TARGET SWATCH & INTERACTIVE LOOKBOOK SAMPLER */}
            <section
              className="border p-4 md:p-5"
              style={{
                background: 'var(--color-surface, #1C1917)',
                borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] uppercase tracking-[0.22em] font-semibold opacity-75">
                  {t.targetColor}
                </h2>
                <span className="font-mono text-[11px] opacity-45">CIEDE2000 ENGINE</span>
              </div>

              <div className="flex items-stretch gap-3 mb-4">
                <div
                  className="w-20 h-14 border flex-shrink-0"
                  style={{
                    backgroundColor: targetHex,
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 18%, transparent)',
                  }}
                />
                <input
                  type="text"
                  value={targetHex}
                  onChange={(e) => {
                    let v = e.target.value.trim()
                    if (!v.startsWith('#')) v = '#' + v
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                      setTargetHex(v.toUpperCase())
                      setRecipeResult(null)
                    }
                  }}
                  className="flex-1 px-4 font-mono tracking-[0.15em] text-[16px] border focus:outline-none"
                  style={{
                    background: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 4%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
                    color: 'var(--color-ink, #F5F1EA)',
                  }}
                  placeholder="#RRGGBB"
                  maxLength={7}
                />
              </div>

              <div className="flex gap-2 mb-3">
                {isIOS ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 text-[11px] uppercase tracking-[0.16em] font-semibold border"
                    style={{
                      borderColor: 'var(--color-accent, #D8A35C)',
                      color: 'var(--color-accent, #D8A35C)',
                    }}
                  >
                    {t.uploadPhoto}
                  </button>
                ) : !cameraActive ? (
                  <>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 py-2.5 text-[11px] uppercase tracking-[0.16em] font-semibold border"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 22%, transparent)',
                        color: 'var(--color-ink, #F5F1EA)',
                      }}
                    >
                      {t.camera}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2.5 text-[11px] uppercase tracking-[0.16em] font-semibold border"
                      style={{
                        borderColor: 'var(--color-accent, #D8A35C)',
                        color: 'var(--color-accent, #D8A35C)',
                      }}
                    >
                      {t.photo}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={captureFromCamera}
                      className="flex-1 py-2.5 text-[11px] uppercase tracking-[0.16em] font-semibold"
                      style={{
                        background: 'var(--color-accent, #D8A35C)',
                        color: 'var(--color-bg, #141210)',
                      }}
                    >
                      {t.pickColor}
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2.5 text-[11px] border"
                      style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 20%, transparent)' }}
                    >
                      ✕
                    </button>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleImageFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
                {!isIOS && (
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      handleImageFile(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                )}
              </div>

              {uploadedPhotoUrl && (
                <div className="mt-3">
                  <div
                    onClick={handlePhotoClick}
                    className="relative overflow-hidden border cursor-crosshair select-none bg-black"
                    style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 16%, transparent)' }}
                  >
                    <img
                      ref={uploadedImgRef}
                      src={uploadedPhotoUrl}
                      alt="Lookbook sample"
                      onLoad={(e) => sampleFromSource(e.currentTarget)}
                      className="w-full max-h-64 object-contain mx-auto"
                    />
                    {pickerCrosshair && (
                      <div
                        className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg pointer-events-none flex items-center justify-center"
                        style={{
                          left: `${pickerCrosshair.x}%`,
                          top: `${pickerCrosshair.y}%`,
                          backgroundColor: targetHex,
                        }}
                      />
                    )}
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.14em] opacity-50 mt-1.5 text-center">
                    {t.tapPhotoHint}
                  </p>
                </div>
              )}

              {cameraActive && !isIOS && (
                <div
                  className="relative overflow-hidden mt-2 border bg-black"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 16%, transparent)' }}
                >
                  <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-52 object-cover" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-6 h-6 border border-white/90" />
                </div>
              )}
            </section>

            {/* PARAMETERS & COVERAGE SYSTEM */}
            <section
              className="border p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3"
              style={{
                background: 'var(--color-surface, #1C1917)',
                borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
              }}
            >
              <div className="flex border" style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)' }}>
                {([3, 4] as const).map((num) => (
                  <button
                    key={num}
                    onClick={() => setMaxComponents(num)}
                    className="flex-1 py-2 text-[11px] uppercase tracking-[0.15em] font-semibold"
                    style={{
                      background: maxComponents === num ? 'var(--color-accent, #D8A35C)' : 'transparent',
                      color: maxComponents === num ? 'var(--color-bg, #141210)' : 'var(--color-ink, #F5F1EA)',
                    }}
                  >
                    ≤ {num} {t.maxPigments}
                  </button>
                ))}
              </div>

              <div className="flex border" style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)' }}>
                {(['acrylic', 'aniline'] as const).map((sys) => (
                  <button
                    key={sys}
                    onClick={() => handleSystemChange(sys)}
                    className="flex-1 py-2 text-[11px] uppercase tracking-[0.12em] font-semibold"
                    style={{
                      background: system === sys ? 'var(--color-accent, #D8A35C)' : 'transparent',
                      color: system === sys ? 'var(--color-bg, #141210)' : 'var(--color-ink, #F5F1EA)',
                    }}
                  >
                    {sys === 'acrylic' ? t.acrylic : t.aniline}
                  </button>
                ))}
              </div>
            </section>

            {/* CATEGORIZED ATELIER ARCHIVE */}
            <section
              className="border p-4 md:p-5"
              style={{
                background: 'var(--color-surface, #1C1917)',
                borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 14%, transparent)',
              }}
            >
              <div className="flex items-center justify-between mb-3 gap-2">
                <h2 className="text-[11px] uppercase tracking-[0.22em] font-semibold opacity-75">
                  {t.inventory} ({inventoryIds.length})
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetInventoryDefaults}
                    className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 border"
                    style={{ borderColor: 'var(--color-accent, #D8A35C)', color: 'var(--color-accent, #D8A35C)' }}
                  >
                    {t.default}
                  </button>
                  <button onClick={selectAllInventory} className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 opacity-60 hover:opacity-100">
                    {t.all}
                  </button>
                  <button onClick={clearInventory} className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 text-red-400">
                    ✕
                  </button>
                </div>
              </div>

              <div
                className="flex gap-1.5 overflow-x-auto pb-2.5 mb-3 border-b"
                style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }}
              >
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] whitespace-nowrap border transition-colors"
                    style={{
                      borderColor: activeCategory === cat ? 'var(--color-ink, #F5F1EA)' : 'transparent',
                      background: activeCategory === cat ? 'color-mix(in srgb, var(--color-ink, #F5F1EA) 12%, transparent)' : 'transparent',
                    }}
                  >
                    {cat === 'ALL' ? t.all : cat}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                {filteredInventoryPigments.map((p) => {
                  const on = inventoryIds.includes(p.id)
                  return (
                    <div
                      key={p.id}
                      className="flex items-center border transition-all"
                      style={{
                        background: on
                          ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 18%, transparent)'
                          : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 3%, transparent)',
                        borderColor: on
                          ? 'var(--color-accent, #D8A35C)'
                          : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleInventory(p.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px]"
                        style={{
                          color: on ? 'var(--color-ink, #F5F1EA)' : 'color-mix(in srgb, var(--color-ink, #F5F1EA) 50%, transparent)',
                        }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0"
                          style={{ backgroundColor: p.hex || '#444' }}
                        />
                        <span>{pigmentName(p)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectedPigmentId(p.id)}
                        className="px-2 py-1.5 text-[11px] border-l"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)',
                          color: 'var(--color-accent, #D8A35C)',
                        }}
                        title={t.pigmentInfoBtn}
                      >
                        ⓘ
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>

            <button
              onClick={runRecipeSearch}
              disabled={recipeLoading || loading || !targetHex || targetHex.length < 7 || inventoryIds.length === 0}
              className="w-full py-4 text-[12px] uppercase tracking-[0.24em] font-semibold transition-opacity disabled:opacity-35"
              style={{
                background: 'var(--color-accent, #D8A35C)',
                color: 'var(--color-bg, #141210)',
              }}
            >
              {recipeLoading ? t.picking : t.pickRecipe}
            </button>

            {recipeError && (
              <p className="text-[12px] text-center" style={{ color: 'var(--color-danger, #f87171)' }}>
                {recipeError}
              </p>
            )}

            {/* SYNTHESIZED RECIPE SPECIFICATION CARD */}
            <AnimatePresence>
              {recipeResult && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="border overflow-hidden"
                  style={{
                    background: 'var(--color-surface, #1C1917)',
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 18%, transparent)',
                  }}
                >
                  <div
                    className="grid grid-cols-2 h-28 border-b"
                    style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 12%, transparent)' }}
                  >
                    <div className="p-3 flex flex-col justify-between" style={{ backgroundColor: targetHex }}>
                      <span className="text-[9px] uppercase tracking-[0.2em] font-mono bg-black/50 text-white px-2 py-0.5 w-fit">
                        {t.target}
                      </span>
                      <span className="font-mono text-[12px] text-white bg-black/50 px-2 py-0.5 w-fit">
                        {targetHex}
                      </span>
                    </div>
                    <div
                      className="p-3 flex flex-col justify-between"
                      style={{ backgroundColor: recipeResult.resultHex || '#333' }}
                    >
                      <span className="text-[9px] uppercase tracking-[0.2em] font-mono bg-black/50 text-white px-2 py-0.5 w-fit">
                        {t.recipe}
                      </span>
                      <span className="font-mono text-[12px] text-white bg-black/50 px-2 py-0.5 w-fit">
                        {(recipeResult.resultHex || '').toUpperCase()} · ΔE₀₀ {recipeResult.deltaE.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 md:p-5">
                    <div
                      className="flex flex-col divide-y mb-4"
                      style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 10%, transparent)' }}
                    >
                      {recipeResult.recipe.map((item, i) => {
                        const lore = getPigmentLore(item.pigment, lang)
                        return (
                          <div
                            key={i}
                            className="py-2.5"
                            style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 8%, transparent)' }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0"
                                  style={{ backgroundColor: item.pigment.hex || '#888' }}
                                />
                                <span className="text-[13px] font-medium truncate">
                                  {item.isBinder ? t.binder : pigmentName(item.pigment)}
                                </span>
                              </div>
                              <span className="font-mono text-[14px] font-semibold tabular-nums flex-shrink-0">
                                {item.ml.toFixed(2)} {t.ml}
                              </span>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                                paddingLeft: 24,
                                marginTop: 4,
                                fontSize: 11,
                              }}
                            >
                              <span className="opacity-60 truncate">
                                {opacityLabel(lore.opacity)} · {lore.whereToBuy.leatherBrands[0]}
                              </span>
                              <button
                                type="button"
                                onClick={() => setInspectedPigmentId(item.pigment.id)}
                                style={{
                                  color: 'var(--color-accent, #D8A35C)',
                                  fontWeight: 600,
                                  textDecoration: 'underline',
                                  flexShrink: 0,
                                }}
                              >
                                ⓘ {t.pigmentInfoBtn}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <button
                      onClick={sendRecipeToMix}
                      className="w-full py-3.5 text-[11px] uppercase tracking-[0.2em] font-semibold border transition-colors"
                      style={{
                        borderColor: 'var(--color-accent, #D8A35C)',
                        background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 16%, transparent)',
                        color: 'var(--color-accent, #D8A35C)',
                      }}
                    >
                      {t.moveToMix}
                    </button>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* МОДАЛЬНАЯ ШПАРГАЛКА МАСТЕРА: Что такое Слои 1–∞, Мокрая/Сухая краска и Кроющий/Лессировочный пигмент */}
      <AnimatePresence>
        {showGuideModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowGuideModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(15, 13, 11, 0.72)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 480,
                maxHeight: '85vh',
                overflowY: 'auto',
                backgroundColor: '#FAF7F2',
                color: '#181512',
                border: '1px solid #2A2521',
                padding: 20,
                boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingBottom: 12,
                  marginBottom: 14,
                  borderBottom: '1px solid rgba(24,21,18,0.12)',
                }}
              >
                <h3 style={{ fontSize: 16, fontFamily: 'serif', fontWeight: 700, margin: 0, color: '#181512' }}>
                  {t.guideModalTitle}
                </h3>
                <button
                  onClick={() => setShowGuideModal(false)}
                  style={{
                    width: 30,
                    height: 30,
                    border: '1px solid rgba(24,21,18,0.2)',
                    background: 'transparent',
                    color: '#181512',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13, lineHeight: 1.55 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#8C5E24', marginBottom: 4 }}>
                    {t.guideSectionCoats}
                  </div>
                  <p style={{ margin: 0, color: '#26221E' }}>{t.guideSectionCoatsText}</p>
                </div>

                <div>
                  <div style={{ fontWeight: 700, color: '#8C5E24', marginBottom: 4 }}>
                    {t.guideSectionWetDry}
                  </div>
                  <p style={{ margin: 0, color: '#26221E' }}>{t.guideSectionWetDryText}</p>
                </div>

                <div
                  style={{
                    padding: 12,
                    backgroundColor: '#EFE6D5',
                    border: '1px solid #C59B5F',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#8C5E24' }}>
                    {t.guideSectionOpacity}
                  </div>
                  <div style={{ fontSize: 12, color: '#181512' }}>• {t.opacityDesc.opaque}</div>
                  <div style={{ fontSize: 12, color: '#181512' }}>• {t.opacityDesc['semi-opaque']}</div>
                  <div style={{ fontSize: 12, color: '#181512' }}>• {t.opacityDesc['semi-transparent']}</div>
                  <div style={{ fontSize: 12, color: '#181512' }}>• {t.opacityDesc.transparent}</div>
                </div>
              </div>

              <button
                onClick={() => setShowGuideModal(false)}
                style={{
                  width: '100%',
                  marginTop: 16,
                  padding: '11px 16px',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  fontWeight: 700,
                  backgroundColor: '#181512',
                  color: '#F5F1EA',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {t.dossierClose}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛЬНЫЙ ПАСПОРТ ПИГМЕНТА (с расшифровкой укрывистости на коже, историей и брендами) */}
      <AnimatePresence>
        {inspectedPigmentId && inspectedLore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setInspectedPigmentId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(15, 13, 11, 0.72)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 480,
                maxHeight: '85vh',
                overflowY: 'auto',
                backgroundColor: '#FAF7F2',
                color: '#181512',
                border: '1px solid #2A2521',
                padding: 20,
                boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingBottom: 14,
                  marginBottom: 14,
                  borderBottom: '1px solid rgba(24,21,18,0.12)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      flexShrink: 0,
                      backgroundColor: inspectedPigment?.hex || '#2c2623',
                      border: '1px solid rgba(0,0,0,0.25)',
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.16em',
                        color: '#6E655C',
                        display: 'block',
                      }}
                    >
                      {t.dossierTitle} · {inspectedLore.code}
                    </span>
                    <h3
                      style={{
                        fontSize: 17,
                        fontFamily: 'serif',
                        fontWeight: 700,
                        color: '#181512',
                        margin: 0,
                      }}
                    >
                      {inspectedPigmentId === 'acrylic_binder' ? t.binder : pigmentName(inspectedPigment)}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setInspectedPigmentId(null)}
                  style={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(24,21,18,0.2)',
                    background: 'transparent',
                    color: '#181512',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13, lineHeight: 1.55 }}>
                <div
                  style={{
                    padding: 12,
                    backgroundColor: '#F0ECE3',
                    border: '1px solid rgba(24,21,18,0.1)',
                  }}
                >
                  <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#6E655C' }}>
                    {t.dossierChem}
                  </div>
                  <div style={{ fontWeight: 700, color: '#181512', marginTop: 2 }}>
                    {inspectedLore.chemicalFamily[lang]}
                  </div>
                  <div style={{ fontSize: 12, color: '#4A433C', marginTop: 4 }}>
                    {inspectedLore.lightfastness} · {inspectedLore.tintingStrength[lang]}
                  </div>
                  {/* Понятная расшифровка типа укрывистости прямо в паспорте пигмента */}
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: '1px solid rgba(24,21,18,0.1)',
                      fontSize: 12,
                      color: '#181512',
                    }}
                  >
                    <strong>{t.dossierOpacityMeaning}:</strong> {t.opacityDesc[inspectedLore.opacity]}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.18em',
                      fontWeight: 700,
                      color: '#8C5E24',
                      marginBottom: 4,
                    }}
                  >
                    {t.dossierHistory}
                  </div>
                  <p style={{ margin: 0, color: '#26221E' }}>{inspectedLore.history[lang]}</p>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.18em',
                      fontWeight: 700,
                      color: '#8C5E24',
                      marginBottom: 4,
                    }}
                  >
                    {t.dossierLeather}
                  </div>
                  <p style={{ margin: 0, color: '#26221E' }}>{inspectedLore.leatherUsage[lang]}</p>
                </div>

                <div
                  style={{
                    padding: 14,
                    backgroundColor: '#EFE6D5',
                    border: '1px solid #C59B5F',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.18em',
                      fontWeight: 700,
                      color: '#8C5E24',
                    }}
                  >
                    {t.dossierWhereToBuy}
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#181512', marginBottom: 5 }}>
                      {t.dossierLeatherBrands}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {inspectedLore.whereToBuy.leatherBrands.map((b) => (
                        <span
                          key={b}
                          style={{
                            fontSize: 11,
                            fontFamily: 'monospace',
                            padding: '3px 8px',
                            backgroundColor: '#FAF7F2',
                            border: '1px solid rgba(24,21,18,0.2)',
                            color: '#181512',
                          }}
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#181512', marginBottom: 5 }}>
                      {t.dossierArtSuppliers}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {inspectedLore.whereToBuy.pigmentSuppliers.map((s) => (
                        <span
                          key={s}
                          style={{
                            fontSize: 11,
                            fontFamily: 'monospace',
                            padding: '3px 8px',
                            backgroundColor: '#FAF7F2',
                            border: '1px solid rgba(24,21,18,0.16)',
                            color: '#3A342E',
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: '#4A433C',
                      paddingTop: 8,
                      borderTop: '1px solid rgba(24,21,18,0.12)',
                    }}
                  >
                    {inspectedLore.whereToBuy.searchHint[lang]}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectedPigmentId(null)}
                style={{
                  width: '100%',
                  marginTop: 16,
                  padding: '11px 16px',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  fontWeight: 700,
                  backgroundColor: '#181512',
                  color: '#F5F1EA',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {t.dossierClose}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
