import { useMemo, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Lang } from '../../App'
import type { Pigment } from '../../data/pigments'
import { getPigmentLore } from '../../data/pigmentLore'
import { getPigmentCategory } from '../../utils/calculatorLogic'
import { SpectralSparkline } from './SpectralChart'
import type { ColorCalcDict } from './i18n'
import { hapticSelect, hapticTap } from './haptics'

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
        p.name.ru,
        p.name.uk,
        p.name.en,
        p.name.de,
        p.hex,
        lore.colorIndex,
        lore.brandAnalogue,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [selectablePigments, query, selectedCat, lang])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#141413]/10 dark:border-white/10 bg-white dark:bg-[#141413] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#141413] dark:text-[#f5f3ee]">
            {dict.tabArchive}
          </h3>
          <span className="font-mono text-[12px] text-[#736f68] dark:text-[#9a968e]">
            {filtered.length} / {selectablePigments.length}
          </span>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.archiveSearchPlaceholder}
          className="w-full rounded-xl border border-[#141413]/12 dark:border-white/12 bg-[#faf8f4] dark:bg-white/[0.04] px-3.5 py-2.5 text-[13.5px] text-[#141413] dark:text-[#f5f3ee] placeholder:text-[#8a857d] focus:outline-none focus:border-[#9a723c]"
        />

        <div className="flex gap-1.5 overflow-x-auto pb-1 mt-3 no-scrollbar">
          {categories.map((cat) => {
            const active = selectedCat === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  hapticSelect()
                  setSelectedCat(cat)
                }}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                  active
                    ? 'bg-[#141413] text-[#faf8f4] border-[#141413] dark:bg-[#f5f3ee] dark:text-[#141413] dark:border-[#f5f3ee]'
                    : 'bg-[#faf8f4] dark:bg-white/[0.04] text-[#6c6861] dark:text-[#9a968e] border-[#141413]/10 dark:border-white/10'
                }`}
              >
                {cat === 'ALL' ? dict.archiveAll : cat}
              </button>
            )
          })}
        </div>

        <div className="mt-4 divide-y divide-[#141413]/8 dark:divide-white/8">
          {filtered.map((p) => {
            const lore = getPigmentLore(p, lang)
            const inFormula = activePigmentIds.includes(p.id)
            return (
              <div
                key={p.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    hapticTap()
                    onInspectPigment(p.id)
                  }}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left"
                >
                  <span
                    className="w-9 h-9 rounded-xl shrink-0 border border-[#141413]/15 dark:border-white/15"
                    style={{ backgroundColor: p.hex }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-medium text-[#141413] dark:text-[#f5f3ee] truncate">
                        {getLocalizedName(p)}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-[#736f68] dark:text-[#9a968e] truncate mt-0.5">
                      <span className="font-mono">{lore.colorIndex}</span>
                      {' · '}
                      {lore.opacity}
                      {lore.brandAnalogue ? ` · ${lore.brandAnalogue}` : ''}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <SpectralSparkline
                    spectrum={p.spectrum}
                    color={p.hex}
                    width={46}
                    height={20}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelect()
                      onAddToFormula(p.id)
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold border transition-colors ${
                      inFormula
                        ? 'border-[#9a723c]/40 bg-[#9a723c]/10 text-[#9a723c]'
                        : 'border-[#141413]/12 dark:border-white/12 bg-[#faf8f4] dark:bg-white/[0.05] text-[#141413] dark:text-[#f5f3ee]'
                    }`}
                  >
                    {inFormula ? '✓' : '+'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface PigmentDossierModalProps {
  pigment: Pigment | null
  lang: Lang
  dict: ColorCalcDict
  onClose: () => void
  onAddToFormula: (pigmentId: string) => void
}

export function PigmentDossierModal({
  pigment,
  lang,
  dict,
  onClose,
  onAddToFormula,
}: PigmentDossierModalProps) {
  const lore = useMemo(
    () => (pigment ? getPigmentLore(pigment, lang) : null),
    [pigment, lang]
  )

  const getLocalizedName = (p: Pigment) => {
    if (lang === 'uk') return p.name.uk || p.name.ru
    if (lang === 'de') return p.name.de || p.name.en || p.name.ru
    return p.name.ru
  }

  return (
    <AnimatePresence>
      {pigment && lore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#faf8f4] dark:bg-[#141413] border border-[#141413]/12 dark:border-white/12 p-5 text-[#141413] dark:text-[#f5f3ee]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-12 h-12 rounded-xl border border-[#141413]/15 dark:border-white/15 shrink-0"
                  style={{ backgroundColor: pigment.hex }}
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#9a723c]">
                    {lore.colorIndex} · {pigment.hex.toUpperCase()}
                  </div>
                  <h3 className="text-[17px] font-semibold leading-snug truncate">
                    {getLocalizedName(pigment)}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-[#141413]/12 dark:border-white/12 text-[#6c6861] dark:text-[#9a968e]"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <div className="rounded-xl bg-white dark:bg-white/[0.04] border border-[#141413]/8 dark:border-white/8 p-3">
                <div className="text-[11px] text-[#736f68] dark:text-[#9a968e]">
                  {dict.dossierOpacity}
                </div>
                <div className="text-[13px] font-semibold mt-0.5">{lore.opacity}</div>
              </div>
              <div className="rounded-xl bg-white dark:bg-white/[0.04] border border-[#141413]/8 dark:border-white/8 p-3">
                <div className="text-[11px] text-[#736f68] dark:text-[#9a968e]">
                  {dict.dossierBrand}
                </div>
                <div className="text-[13px] font-semibold mt-0.5 truncate">
                  {lore.brandAnalogue || '—'}
                </div>
              </div>
            </div>

            {lore.leatherAdvice && (
              <div className="mt-3.5 rounded-xl bg-white dark:bg-white/[0.04] border border-[#141413]/8 dark:border-white/8 p-3.5">
                <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-[#9a723c] mb-1">
                  {dict.dossierAdvice}
                </div>
                <p className="text-[13px] leading-relaxed text-[#3a3834] dark:text-[#d7d3cb]">
                  {lore.leatherAdvice}
                </p>
              </div>
            )}

            {lore.history && (
              <div className="mt-3 rounded-xl bg-white dark:bg-white/[0.04] border border-[#141413]/8 dark:border-white/8 p-3.5">
                <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-[#736f68] dark:text-[#9a968e] mb-1">
                  {dict.dossierOrigin}
                </div>
                <p className="text-[13px] leading-relaxed text-[#4f4c46] dark:text-[#b5b0a6]">
                  {lore.history}
                </p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  hapticSelect()
                  onAddToFormula(pigment.id)
                  onClose()
                }}
                className="flex-1 py-3 rounded-xl bg-[#141413] dark:bg-[#f5f3ee] text-[#faf8f4] dark:text-[#141413] text-[13px] font-semibold"
              >
                + {dict.addToFormula}
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
  initialTab?: 'science' | 'guide'
  lang: Lang
  dict: ColorCalcDict
  onClose: () => void
}

export function MasterGuideModal({
  open,
  initialTab = 'science',
  lang,
  onClose,
}: MasterGuideModalProps) {
  const [tab, setTab] = useState<'science' | 'guide'>(initialTab)

  useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, initialTab])

  const content = useMemo(() => {
    const data = {
      ru: {
        title: 'Научная методика и шпаргалка',
        tabScience: 'Методика и формулы',
        tabGuide: 'Шпаргалка мастера',
        lead: 'Cordwaine не смешивает «цифровые RGB-пиксели». Каждый расчёт строится на реальных лабораторных спектрах 146 пигментов по 81 длине волны видимого света (380–780 нм, шаг 5 нм).',
        blocks: [
          {
            badge: '01 · ФИЗИКА ПРОТИВ RGB',
            title: 'Почему RGB-калькуляторы врут на коже',
            body: 'На экране смешивается свет (аддитивная модель): синий + жёлтый дают грязно-серый. В краске пигменты поглощают и рассеивают свет (субтрактивная физика): синий + жёлтый дают зелёный. Поэтому обычный HEX/RGB не может предсказать реальный замес — нужны полные спектры отражения R(λ).',
            formula: 'RGB: 3 канала (R, G, B)  ≠  Спектр: 81 канал λ ∈ [380…780 нм]',
          },
          {
            badge: '02 · БАЗА ПИГМЕНТОВ (FORS)',
            title: 'Откуда взяты данные 146 пигментов',
            body: 'В основе базы лежат реальные спектры волоконно-оптической спектроскопии отражения (FORS, CHSOS Spectral Database) для физических пигментов — титановых белил (PW6), пирролов (PO73), хинакридонов (PR122, PV19), оксидов железа (PR101, PY42), сажи (PBk9) и др. Это замеры реального вещества, а не «придуманные» HEX-коды.',
            formula: 'R_meas(λ) — замер реального пигмента с шагом Δλ = 5 нм',
          },
          {
            badge: '03 · ПОПРАВКА СОНДЕРСОНА (1942)',
            title: 'Учёт глянца, мокрой плёнки и приборного блика',
            body: 'Прибор FORS фиксирует около 3.4% поверхностного блика Френеля (SCI), из-за чего тёмные тона кажутся выбеленными. Мы снимаем приборный блик и пересчитываем внутреннее отражение слоя отдельно для мокрой (глянцевой, k₁ = 0.002) и сухой (матовой, k₁ = 0.006) плёнки.',
            formula: 'R_int = (R_meas − k₁) / (1 − k₁ − k₂ + k₂ · R_meas),  k₂ = 0.42',
          },
          {
            badge: '04 · КУБЕЛКА–МУНК (1931)',
            title: 'Двухконстантное смешивание K(λ) и S(λ)',
            body: 'У каждого пигмента разделены поглощение K(λ) и рассеяние S(λ). Белила имеют огромное рассеяние S, а хинакридоны и сажа — мощное поглощение K. Поэтому 1 мл белил резко высветляет смесь, а капля сажи мгновенно уводит тон. При 1–3 слоях учитывается просвечивание кожи-подложки.',
            formula: '(K/S)_mix(λ) = [Σ cᵢ · Kᵢ(λ)] / [Σ cᵢ · Sᵢ(λ)]\nR_∞(λ) = 1 + (K/S) − √((K/S)² + 2·(K/S))',
          },
          {
            badge: '05 · CIE 1931 + BRADFORD CAT',
            title: 'Освещение и реальный метамеризм',
            body: 'Итоговый спектр R(λ) интегрируется с реальным спектром выбранной лампы S(λ) (D65 6500K, Бутик 2856K, Студия 4200K, Сумерки 9000K) и кривыми глаза x̄, ȳ, z̄ (CIE 1931 2°), затем применяется хроматическая адаптация Брэдфорда. Так вы заранее видите, «уйдёт» ли коньяк или бордо под тёплым светом витрины.',
            formula: 'X,Y,Z = ∫ R(λ) · S(λ) · (x̄, ȳ, z̄)(λ) dλ  →  Bradford M_BFD → sRGB / Lab',
          },
          {
            badge: '06 · ТОЧНОСТЬ CIEDE2000 (ΔE₀₀)',
            title: 'Как работает автоподбор рецепта',
            body: 'Алгоритм оптимизирует не расстояние в RGB, а лабораторный стандарт восприятия глаза CIEDE2000 (ΔE₀₀) с учётом разбела высококрасящих пигментов. ΔE ≤ 1.0 — неразличимо глазом; ≤ 2.0 — допуск Haute Couture; 2–5 — коммерческий допуск. В реальной мастерской всегда делайте пробный выкрас на обрезке с учётом впитываемости кожи и партии краски.',
            formula: 'ΔE₀₀ ≤ 1.0 (эталон) · ≤ 2.0 (Haute Couture) · 2–5 (коммерческий)',
          },
        ],
        guideItems: [
          {
            title: '1. Мокрая краска всегда темнее и глубже сухой',
            text: 'Вода и эмульсия снижают поверхностное рассеяние. После высыхания акрил чуть «подсвечивается» и становится матовее — всегда проверяйте режим «Сухая» перед замесом.',
          },
          {
            title: '2. Начинайте с базы и добавляйте сильные пигменты по 0.1–0.5 мл',
            text: 'Титановые белила (PW6), сажа (PBk9), фталоцианины (PB15/PG7) и хинакридоны (PR122) обладают высокой красящей силой. Сначала отмерьте базовый объём, а затем вводите колеры малыми дозами.',
          },
          {
            title: '3. Проверяйте оттенок под двумя лампами (D65 и Бутик 2856K)',
            text: 'Землистые и коньячные смеси с хромом/зелёным могут сдвигаться под тёплым светом. Переключайте свет и смотрите на кривую SPD во вкладке «Спектр».',
          },
          {
            title: '4. Тонкие слои на коже работают лучше одного толстого',
            text: 'Для ровного перекрытия тёмной кожи светлым акрилом используйте 2–3 тонких слоя с промежуточной сушкой. Режим «1–3 слоя» показывает реальное просвечивание подложки.',
          },
        ],
      },
      uk: {
        title: 'Наукова методика та шпаргалка',
        tabScience: 'Методика і формули',
        tabGuide: 'Шпаргалка майстра',
        lead: 'Cordwaine не змішує «цифрові RGB-пікселі». Кожен розрахунок базується на реальних лабораторних спектрах 146 пігментів по 81 довжині хвилі видимого світла (380–780 нм, крок 5 нм).',
        blocks: [
          {
            badge: '01 · ФІЗИКА ПРОТИ RGB',
            title: 'Чому RGB-калькулятори помиляються на шкірі',
            body: 'На екрані складається світло (адитивна модель): синій + жовтий дають сірий. У фарбі пігменти поглинають і розсіюють світло (субтрактивна фізика): синій + жовтий дають зелений. Звичайний RGB не здатний передбачити реальний заміс — потрібні спектри відбиття R(λ).',
            formula: 'RGB: 3 канали (R, G, B)  ≠  Спектр: 81 канал λ ∈ [380…780 нм]',
          },
          {
            badge: '02 · БАЗА ПІГМЕНТІВ (FORS)',
            title: 'Звідки взяті дані 146 пігментів',
            body: 'Використано реальні спектри волоконно-оптичної спектроскопії відбиття (FORS, CHSOS Spectral Database) для фізичних пігментів — титанових білил (PW6), піролів (PO73), хінакридонів (PR122), оксидів заліза, сажі тощо.',
            formula: 'R_meas(λ) — вимір реального пігменту з кроком Δλ = 5 нм',
          },
          {
            badge: '03 · ПОПРАВКА СОНДЕРСОНА (1942)',
            title: 'Облік глянцю, мокрої плівки та відблиску',
            body: 'Прилад FORS фіксує ~3.4% поверхневого відблиску Френеля (SCI). Ми знімаємо приладовий відблиск і перераховуємо внутрішнє відбиття шару окремо для мокрої (k₁ = 0.002) та сухої (k₁ = 0.006) плівки.',
            formula: 'R_int = (R_meas − k₁) / (1 − k₁ − k₂ + k₂ · R_meas),  k₂ = 0.42',
          },
          {
            badge: '04 · КУБЕЛКА–МУНК (1931)',
            title: 'Двоконстантне змішування K(λ) та S(λ)',
            body: 'Для кожного пігменту розділено поглинання K(λ) та розсіювання S(λ). Білила мають величезне S, а сажа та хінакридони — сильне K. При 1–3 шарах враховується просвічування шкіри-підкладки.',
            formula: '(K/S)_mix(λ) = [Σ cᵢ · Kᵢ(λ)] / [Σ cᵢ · Sᵢ(λ)]\nR_∞(λ) = 1 + (K/S) − √((K/S)² + 2·(K/S))',
          },
          {
            badge: '05 · CIE 1931 + BRADFORD CAT',
            title: 'Освітлення та реальний метамеризм',
            body: 'Спектр R(λ) інтегрується зі спектром обраної лампи S(λ) (D65 6500K, Бутик 2856K, Студія 4200K, Сутінки 9000K) та кривими ока CIE 1931 2°, після чого застосовується хроматична адаптація Бредфорда.',
            formula: 'X,Y,Z = ∫ R(λ) · S(λ) · (x̄, ȳ, z̄)(λ) dλ  →  Bradford M_BFD → sRGB / Lab',
          },
          {
            badge: '06 · ТОЧНІСТЬ CIEDE2000 (ΔE₀₀)',
            title: 'Як працює автопідбір рецепта',
            body: 'Алгоритм оптимізує перцептивну метрику CIEDE2000 (ΔE₀₀): ≤ 1.0 — непомітно оком; ≤ 2.0 — допуск Haute Couture; 2–5 — комерційний допуск. Завжди робіть пробний викрас на шматочку шкіри.',
            formula: 'ΔE₀₀ ≤ 1.0 (еталон) · ≤ 2.0 (Haute Couture) · 2–5 (комерційний)',
          },
        ],
        guideItems: [
          {
            title: '1. Мокра фарба темніша й глибша за суху',
            text: 'Після висихання акрил стає трохи світлішим і матовішим — перевіряйте режим «Суха» перед замісом.',
          },
          {
            title: '2. Додавайте сильні пігменти по 0.1–0.5 мл',
            text: 'Титанові білила, сажа та хінакридони мають високу фарбувальну силу. Спочатку відміряйте базу, потім вводьте колери малими дозами.',
          },
          {
            title: '3. Перевіряйте колір під D65 та 2856K',
            text: 'Перемикайте світло й контролюйте криву SPD у вкладці «Спектр», щоб уникнути метамеризму.',
          },
          {
            title: '4. Краще 2–3 тонких шари, ніж один товстий',
            text: 'Режим «1–3 шари» показує реальне просвічування підкладки під час нашарування.',
          },
        ],
      },
      de: {
        title: 'Wissenschaftliche Methodik & Leitfaden',
        tabScience: 'Methodik & Formeln',
        tabGuide: 'Praxis-Leitfaden',
        lead: 'Cordwaine mischt keine digitalen RGB-Pixel. Jede Berechnung nutzt reale Laborspektren von 146 Pigmenten über 81 Wellenlängen (380–780 nm, 5-nm-Schritte).',
        blocks: [
          {
            badge: '01 · PHYSIK STATT RGB',
            title: 'Warum RGB-Rechner auf Leder versagen',
            body: 'Bildschirme mischen Licht additiv (Blau + Gelb = Grau). Reale Pigmente absorbieren und streuen Licht subtraktiv (Blau + Gelb = Grün). Nur volle Reflexionsspektren R(λ) bilden echte Farbmischungen ab.',
            formula: 'RGB: 3 Kanäle  ≠  Spektrum: 81 Kanäle λ ∈ [380…780 nm]',
          },
          {
            badge: '02 · FORS-PIGMENTDATENBANK',
            title: 'Herkunft der 146 Pigmentspektren',
            body: 'Gemessen per Faseroptik-Reflexionsspektroskopie (FORS, CHSOS Spectral Database) an realen Pigmenten wie Titanweiß (PW6), Pyrrol (PO73), Chinacridon (PR122), Eisenoxiden und Ruß (PBk9).',
            formula: 'R_meas(λ) — reale Pigmentmessung im 5-nm-Raster',
          },
          {
            badge: '03 · SAUNDERSON-KORREKTUR (1942)',
            title: 'Glanz, Nassfilm & SCI→SCE-Korrektur',
            body: 'FORS-Messungen enthalten ~3,4 % Fresnel-Oberflächenglanz (SCI). Wir entfernen diesen Messglanz und berechnen die innere Reflexion getrennt für nassen (k₁ = 0.002) und trockenen (k₁ = 0.006) Film.',
            formula: 'R_int = (R_meas − k₁) / (1 − k₁ − k₂ + k₂ · R_meas),  k₂ = 0.42',
          },
          {
            badge: '04 · KUBELKA–MUNK (1931)',
            title: 'Zwei-Konstanten-Mischung K(λ) & S(λ)',
            body: 'Absorption K(λ) und Streuung S(λ) werden getrennt berechnet. Titanweiß hat sehr hohes S, Ruß und Chinacridone sehr hohes K. Bei 1–3 Schichten wird das Durchscheinen des Leders berücksichtigt.',
            formula: '(K/S)_mix(λ) = [Σ cᵢ · Kᵢ(λ)] / [Σ cᵢ · Sᵢ(λ)]\nR_∞(λ) = 1 + (K/S) − √((K/S)² + 2·(K/S))',
          },
          {
            badge: '05 · CIE 1931 + BRADFORD CAT',
            title: 'Lichtarten & echte Metamerie',
            body: 'R(λ) wird mit realen Lichtspektren S(λ) (D65 6500K, A 2856K, 4200K, 9000K) und den CIE-1931-2°-Kurven integriert und per Bradford-Matrix adaptiert.',
            formula: 'X,Y,Z = ∫ R(λ) · S(λ) · (x̄, ȳ, z̄)(λ) dλ  →  Bradford M_BFD → sRGB / Lab',
          },
          {
            badge: '06 · CIEDE2000 (ΔE₀₀)',
            title: 'Rezept-Synthese nach Laborstandard',
            body: 'Die Optimierung minimiert die wahrnehmungsgerechte Metrik ΔE₀₀: ≤ 1,0 unsichtbar; ≤ 2,0 Haute-Couture-Toleranz; 2–5 kommerziell. Immer einen Probeauftrag auf Leder prüfen.',
            formula: 'ΔE₀₀ ≤ 1.0 (Referenz) · ≤ 2.0 (Haute Couture) · 2–5 (Kommerziell)',
          },
        ],
        guideItems: [
          {
            title: '1. Nass wirkt immer dunkler als trocken',
            text: 'Prüfen Sie vor dem Anmischen immer den Modus «Trocken».',
          },
          {
            title: '2. Farbstarke Pigmente in 0,1–0,5 ml dosieren',
            text: 'Titanweiß, Ruß und Chinacridone färben extrem stark — Basis zuerst, Tönung tropfenweise.',
          },
          {
            title: '3. Unter D65 und 2856K gegenprüfen',
            text: 'Nutzen Sie die SPD-Lichtkurve im Tab «Spektrum», um Metamerie sofort zu erkennen.',
          },
          {
            title: '4. Mehrere dünne Schichten statt einer dicken',
            text: 'Die 1–3-Schichten-Vorschau zeigt das reale Durchscheinen der Lederbasis.',
          },
        ],
      },
    }
    return data[lang]
  }, [lang])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-xl max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[#faf8f4] dark:bg-[#141413] border border-[#141413]/12 dark:border-white/12 text-[#141413] dark:text-[#f5f3ee] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-5 pt-5 pb-3.5 border-b border-[#141413]/8 dark:border-white/10 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[16px] font-semibold tracking-tight">
                  {content.title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-2.5 py-1 rounded-lg text-[12px] font-medium border border-[#141413]/12 dark:border-white/12 text-[#6c6861] dark:text-[#9a968e]"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 mt-3 rounded-xl bg-[#efeae1] dark:bg-white/[0.06] border border-[#141413]/8 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    hapticSelect()
                    setTab('science')
                  }}
                  className={`py-2 rounded-lg text-[12px] font-semibold transition-colors ${
                    tab === 'science'
                      ? 'bg-[#141413] text-[#faf8f4] dark:bg-[#f5f3ee] dark:text-[#141413]'
                      : 'text-[#6c6861] dark:text-[#9a968e]'
                  }`}
                >
                  {content.tabScience}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hapticSelect()
                    setTab('guide')
                  }}
                  className={`py-2 rounded-lg text-[12px] font-semibold transition-colors ${
                    tab === 'guide'
                      ? 'bg-[#141413] text-[#faf8f4] dark:bg-[#f5f3ee] dark:text-[#141413]'
                      : 'text-[#6c6861] dark:text-[#9a968e]'
                  }`}
                >
                  {content.tabGuide}
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto px-5 py-4 space-y-3.5">
              {tab === 'science' ? (
                <>
                  <p className="text-[13px] leading-relaxed text-[#3a3834] dark:text-[#d7d3cb] bg-white dark:bg-white/[0.04] rounded-xl p-3.5 border border-[#9a723c]/25">
                    {content.lead}
                  </p>
                  {content.blocks.map((b) => (
                    <div
                      key={b.badge}
                      className="rounded-xl bg-white dark:bg-white/[0.04] border border-[#141413]/8 dark:border-white/8 p-4"
                    >
                      <div className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-[#9a723c] font-semibold">
                        {b.badge}
                      </div>
                      <h4 className="text-[14px] font-semibold mt-1 text-[#141413] dark:text-[#f5f3ee]">
                        {b.title}
                      </h4>
                      <p className="text-[12.5px] leading-relaxed text-[#4f4c46] dark:text-[#b8b3a9] mt-1.5">
                        {b.body}
                      </p>
                      <pre className="mt-2.5 px-3 py-2 rounded-lg bg-[#f3f0ea] dark:bg-black/40 border border-[#141413]/8 dark:border-white/8 font-mono text-[11px] leading-relaxed text-[#141413] dark:text-[#e8e3d9] whitespace-pre-wrap break-words">
                        {b.formula}
                      </pre>
                    </div>
                  ))}
                </>
              ) : (
                <div className="space-y-3">
                  {content.guideItems.map((g) => (
                    <div
                      key={g.title}
                      className="rounded-xl bg-white dark:bg-white/[0.04] border border-[#141413]/8 dark:border-white/8 p-4"
                    >
                      <h4 className="text-[13.5px] font-semibold text-[#141413] dark:text-[#f5f3ee]">
                        {g.title}
                      </h4>
                      <p className="text-[12.5px] leading-relaxed text-[#4f4c46] dark:text-[#b8b3a9] mt-1">
                        {g.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
