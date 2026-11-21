import { useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Lang } from '../../App'
import { hapticSelect } from './haptics'

interface ScienceMethodologyModalProps {
  open: boolean
  lang: Lang
  isDark: boolean
  initialTab?: 'science' | 'guide'
  onClose: () => void
}

export function ScienceMethodologyModal({
  open,
  lang,
  isDark,
  initialTab = 'science',
  onClose,
}: ScienceMethodologyModalProps) {
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
            body: 'В основе базы лежат реальные спектры волоконно-оптической спектроскопии отражения (FORS, CHSOS Spectral Database) для физических пигментов — титановых белил (PW6), пирролов (PO73), хинакридонов (PR122, PV19), оксидов железа (PR101, PY42), костяной сажи (PBk9) и др. Это замеры реального вещества, а не выдуманные HEX-коды.',
            formula: 'R_meas(λ) — лабораторный замер реального пигмента с шагом Δλ = 5 нм',
          },
          {
            badge: '03 · ПОПРАВКА СОНДЕРСОНА (1942)',
            title: 'Учёт глянца, мокрой плёнки и приборного блика',
            body: 'Прибор FORS фиксирует около 3.4% поверхностного блика Френеля (SCI), из-за чего тёмные тона кажутся выбеленными. Мы снимаем приборный блик и пересчитываем внутреннее отражение слоя отдельно для мокрой (глянцевой, k₁ = 0.002) и сухой (матовой, k₁ = 0.006) плёнки.',
            formula: 'R_int = (R_meas − k₁) / (1 − k₁ − k₂ + k₂ · R_meas),   k₂ = 0.42',
          },
          {
            badge: '04 · КУБЕЛКА–МУНК (1931)',
            title: 'Двухконстантное смешивание K(λ) и S(λ)',
            body: 'У каждого пигмента разделены поглощение K(λ) и рассеяние S(λ). Титановые белила имеют огромное рассеяние S, а сажа и хинакридоны — мощное поглощение K. Поэтому 1 мл белил резко высветляет смесь, а капля сажи мгновенно уводит тон. При 1–3 слоях рассчитывается реальное просвечивание кожи-подложки.',
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
            body: 'Алгоритм оптимизирует не расстояние в RGB, а лабораторный стандарт восприятия глаза CIEDE2000 (ΔE₀₀) с проверкой пигментов и в массе, и в разбеле. ΔE ≤ 1.0 — неразличимо глазом; ≤ 2.0 — допуск Haute Couture; 2–5 — коммерческий допуск. В мастерской всегда делайте пробный выкрас на обрезке с учётом пористости кожи и партии краски.',
            formula: 'ΔE₀₀ ≤ 1.0 (эталон) · ≤ 2.0 (Haute Couture) · 2–5 (коммерческий)',
          },
        ],
        guideItems: [
          {
            title: '1. Мокрая краска всегда темнее и глубже сухой',
            text: 'Вода и эмульсия снижают поверхностное рассеяние. После высыхания акрил чуть светлеет и становится матовее — всегда проверяйте режим «Сухая» перед замесом.',
          },
          {
            title: '2. Сильные пигменты вводите по 0.1–0.5 мл',
            text: 'Титановые белила (PW6), сажа (PBk9), фталоцианины (PB15/PG7) и хинакридоны (PR122) имеют высокую красящую силу. Сначала отмерьте базу, затем добавляйте колеры малыми дозами.',
          },
          {
            title: '3. Проверяйте оттенок под D65 и Бутик 2856K',
            text: 'Землистые и коньячные смеси могут сдвигаться под тёплым светом. Переключайте свет и смотрите на кривую SPD во вкладке «Спектр».',
          },
          {
            title: '4. Тонкие слои работают лучше одного толстого',
            text: 'Для ровного перекрытия тёмной кожи светлым акрилом используйте 2–3 тонких слоя с сушкой. Режим «1–3 слоя» показывает реальное просвечивание подложки.',
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
            body: 'На екрані складається світло (адитивна модель): синій + жовтий дають сірий. У фарбі пігменти поглинають і розсіюють світло (субтрактивна фізика): синій + жовтий дають зелений. Звичайний RGB не може передбачити реальний заміс — потрібні повні спектри відбиття R(λ).',
            formula: 'RGB: 3 канали (R, G, B)  ≠  Спектр: 81 канал λ ∈ [380…780 нм]',
          },
          {
            badge: '02 · БАЗА ПІГМЕНТІВ (FORS)',
            title: 'Звідки взяті дані 146 пігментів',
            body: 'Використано реальні спектри волоконно-оптичної спектроскопії відбиття (FORS, CHSOS Spectral Database) для фізичних пігментів — титанових білил (PW6), піролів (PO73), хінакридонів (PR122), оксидів заліза, сажі тощо.',
            formula: 'R_meas(λ) — лабораторний вимір реального пігменту з кроком Δλ = 5 нм',
          },
          {
            badge: '03 · ПОПРАВКА СОНДЕРСОНА (1942)',
            title: 'Облік глянцю, мокрої плівки та відблиску',
            body: 'Прилад FORS фіксує ~3.4% поверхневого відблиску Френеля (SCI). Ми знімаємо приладовий відблиск і перераховуємо внутрішнє відбиття шару окремо для мокрої (k₁ = 0.002) та сухої (k₁ = 0.006) плівки.',
            formula: 'R_int = (R_meas − k₁) / (1 − k₁ − k₂ + k₂ · R_meas),   k₂ = 0.42',
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
            title: '2. Сильні пігменти вводьте по 0.1–0.5 мл',
            text: 'Титанові білила, сажа та хінакридони мають високу фарбувальну силу. Спочатку відміряйте базу, потім додавайте колери малими дозами.',
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
            formula: 'R_int = (R_meas − k₁) / (1 − k₁ − k₂ + k₂ · R_meas),   k₂ = 0.42',
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

  const modalBg = isDark ? '#141413' : '#faf8f4'
  const cardBg = isDark ? '#1c1b19' : '#ffffff'
  const ink = isDark ? '#f5f3ee' : '#141413'
  const muted = isDark ? '#a8a39a' : '#57544e'
  const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(20,20,19,0.1)'
  const formulaBg = isDark ? '#0e0e0d' : '#f3f0ea'
  const segBg = isDark ? 'rgba(255,255,255,0.06)' : '#efeae1'

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
            className="w-full sm:max-w-xl max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden border"
            style={{
              backgroundColor: modalBg,
              borderColor: border,
              color: ink,
            }}
          >
            {/* Header */}
            <div
              className="px-5 pt-5 pb-3.5 border-b shrink-0"
              style={{ borderColor: border }}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[16px] font-serif font-semibold tracking-tight">
                  {content.title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-2.5 py-1 rounded-lg text-[12px] font-medium border cursor-pointer"
                  style={{ borderColor: border, color: muted }}
                >
                  ✕
                </button>
              </div>

              <div
                className="grid grid-cols-2 gap-1.5 p-1 mt-3 rounded-xl border"
                style={{ backgroundColor: segBg, borderColor: border }}
              >
                <button
                  type="button"
                  onClick={() => {
                    hapticSelect()
                    setTab('science')
                  }}
                  className="py-2 rounded-lg text-[12px] font-semibold cursor-pointer"
                  style={{
                    backgroundColor:
                      tab === 'science'
                        ? isDark
                          ? '#f5f3ee'
                          : '#141413'
                        : 'transparent',
                    color:
                      tab === 'science'
                        ? isDark
                          ? '#141413'
                          : '#faf8f4'
                        : muted,
                  }}
                >
                  {content.tabScience}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hapticSelect()
                    setTab('guide')
                  }}
                  className="py-2 rounded-lg text-[12px] font-semibold cursor-pointer"
                  style={{
                    backgroundColor:
                      tab === 'guide'
                        ? isDark
                          ? '#f5f3ee'
                          : '#141413'
                        : 'transparent',
                    color:
                      tab === 'guide'
                        ? isDark
                          ? '#141413'
                          : '#faf8f4'
                        : muted,
                  }}
                >
                  {content.tabGuide}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 py-4 space-y-3.5">
              {tab === 'science' ? (
                <>
                  <p
                    className="text-[13px] leading-relaxed rounded-xl p-3.5 border"
                    style={{
                      backgroundColor: cardBg,
                      borderColor: 'rgba(154,114,60,0.35)',
                      color: ink,
                    }}
                  >
                    {content.lead}
                  </p>
                  {content.blocks.map((b) => (
                    <div
                      key={b.badge}
                      className="rounded-xl p-4 border"
                      style={{ backgroundColor: cardBg, borderColor: border }}
                    >
                      <div
                        className="text-[10.5px] font-mono uppercase tracking-[0.12em] font-semibold"
                        style={{ color: '#9a723c' }}
                      >
                        {b.badge}
                      </div>
                      <h4 className="text-[14px] font-semibold mt-1">{b.title}</h4>
                      <p
                        className="text-[12.5px] leading-relaxed mt-1.5"
                        style={{ color: muted }}
                      >
                        {b.body}
                      </p>
                      <pre
                        className="mt-2.5 px-3 py-2 rounded-lg border font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words"
                        style={{
                          backgroundColor: formulaBg,
                          borderColor: border,
                          color: ink,
                        }}
                      >
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
                      className="rounded-xl p-4 border"
                      style={{ backgroundColor: cardBg, borderColor: border }}
                    >
                      <h4 className="text-[13.5px] font-semibold">{g.title}</h4>
                      <p
                        className="text-[12.5px] leading-relaxed mt-1"
                        style={{ color: muted }}
                      >
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

