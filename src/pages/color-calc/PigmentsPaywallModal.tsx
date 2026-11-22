import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Lang } from '../../App'
import { useAtelierTheme } from './themeTokens'
import { PIGMENTS_PRICE_STARS, TRIAL_MATCH_LIMIT } from './usePigmentsAccess'
import { hapticTap } from './haptics'

interface PigmentsPaywallModalProps {
  open: boolean
  lang: Lang
  trialRemaining: number
  purchasing: boolean
  purchaseError: string | null
  onBuy: () => void
  onClose: () => void
}

export function PigmentsPaywallModal({
  open,
  lang,
  trialRemaining,
  purchasing,
  purchaseError,
  onBuy,
  onClose,
}: PigmentsPaywallModalProps) {
  const { tokens } = useAtelierTheme()

  const ui = useMemo(() => {
    const map = {
      ru: {
        badge: 'CORDWAINE · SPECTRAL PRO',
        title: 'Полный доступ к лаборатории пигментов',
        subtitleEnded: `Все ${TRIAL_MATCH_LIMIT} пробных подбора использованы. Откройте пожизненный PRO-доступ без подписок.`,
        subtitleTrial: `У вас осталось ${trialRemaining} из ${TRIAL_MATCH_LIMIT} пробных подборов. Разовая покупка открывает PRO навсегда.`,
        features: [
          'Безлимитный автоподбор рецептов CIEDE2000 по 146 FORS-пигментам',
          'Масштабирование партии (10–1000 мл) и копирование полной техкарты',
          '4 источника света (D65 / 2856K / 4200K / 9000K) + спектрофотометр',
          'Неограниченное число пигментов в формуле и автоподгонка пропорций',
        ],
        cta: `Открыть PRO навсегда · ${PIGMENTS_PRICE_STARS} ⭐`,
        loading: 'Открытие счёта Telegram...',
        oneTime: 'Разовый платёж в Telegram Stars · привязывается к вашему Telegram ID',
        later: 'Позже',
      },
      uk: {
        badge: 'CORDWAINE · SPECTRAL PRO',
        title: 'Повний доступ до лабораторії пігментів',
        subtitleEnded: `Усі ${TRIAL_MATCH_LIMIT} пробні підбори використано. Відкрийте довічний PRO-доступ без підписок.`,
        subtitleTrial: `Залишилось ${trialRemaining} з ${TRIAL_MATCH_LIMIT} пробних підборів. Разова покупка відкриває PRO назавжди.`,
        features: [
          'Безлімітний автопідбір рецептів CIEDE2000 по 146 FORS-пігментах',
          'Масштабування партії (10–1000 мл) та копіювання повної техкарти',
          '4 джерела світла (D65 / 2856K / 4200K / 9000K) + спектрофотометр',
          'Необмежена кількість пігментів у формулі та автопідгонка пропорцій',
        ],
        cta: `Відкрити PRO назавжди · ${PIGMENTS_PRICE_STARS} ⭐`,
        loading: 'Відкриття рахунку Telegram...',
        oneTime: 'Разовий платіж у Telegram Stars · привʼязується до вашого Telegram ID',
        later: 'Пізніше',
      },
      de: {
        badge: 'CORDWAINE · SPECTRAL PRO',
        title: 'Vollzugriff auf das Pigment-Labor',
        subtitleEnded: `Alle ${TRIAL_MATCH_LIMIT} Test-Synthesen wurden genutzt. Schalten Sie lebenslangen PRO-Zugang frei.`,
        subtitleTrial: `Noch ${trialRemaining} von ${TRIAL_MATCH_LIMIT} Test-Synthesen übrig. Einmalkauf ohne Abo.`,
        features: [
          'Unbegrenzte CIEDE2000-Rezeptsynthese aus 146 FORS-Pigmenten',
          'Chargen-Skalierung (10–1000 ml) & vollständiger Rezept-Export',
          '4 Lichtarten (D65 / 2856K / 4200K / 9000K) + Spektralphotometer',
          'Beliebig viele Pigmente in der Formel & automatischer Feinabgleich',
        ],
        cta: `PRO lebenslang freischalten · ${PIGMENTS_PRICE_STARS} ⭐`,
        loading: 'Telegram-Rechnung wird geöffnet...',
        oneTime: 'Einmalzahlung in Telegram Stars · dauerhaft an Ihre Telegram-ID gebunden',
        later: 'Später',
      },
    }
    return map[lang]
  }, [lang, trialRemaining])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border p-5 sm:p-6 space-y-4"
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              color: tokens.ink,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className="text-[11px] font-mono uppercase tracking-[0.16em] font-semibold"
                  style={{ color: tokens.accent }}
                >
                  {ui.badge}
                </div>
                <h3 className="text-[20px] font-serif leading-snug mt-1">
                  {ui.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  hapticTap()
                  onClose()
                }}
                className="px-2.5 py-1 rounded-lg border text-[12px] cursor-pointer"
                style={{ borderColor: tokens.border, color: tokens.inkMuted }}
              >
                ✕
              </button>
            </div>

            <p className="text-[13px] leading-relaxed" style={{ color: tokens.inkSecondary }}>
              {trialRemaining > 0 ? ui.subtitleTrial : ui.subtitleEnded}
            </p>

            <ul className="space-y-2.5 pt-1">
              {ui.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5 text-[13px] leading-snug">
                  <span
                    className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{
                      backgroundColor: tokens.activeTintBg,
                      color: tokens.accent,
                    }}
                  >
                    ✓
                  </span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            {purchaseError && (
              <div
                className="px-3 py-2 rounded-xl border text-[12px]"
                style={{
                  borderColor: 'rgba(248,113,113,0.4)',
                  color: tokens.danger,
                }}
              >
                {purchaseError}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={purchasing}
                onClick={onBuy}
                className="w-full h-12 rounded-xl text-[13.5px] font-sans font-semibold cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: tokens.accent,
                  color: tokens.pageBg,
                }}
              >
                {purchasing ? ui.loading : ui.cta}
              </button>

              <p className="text-[11px] text-center" style={{ color: tokens.inkMuted }}>
                {ui.oneTime}
              </p>

              <button
                type="button"
                onClick={() => {
                  hapticTap()
                  onClose()
                }}
                className="w-full py-2 text-[12.5px] font-medium bg-transparent border-0 cursor-pointer"
                style={{ color: tokens.inkMuted }}
              >
                {ui.later}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

