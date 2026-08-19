import { motion } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'
import type { Lang } from '../App'

type CalcMenuPageProps = {
  onBack: () => void
  lang: Lang
  onOpenSizeCalc?: () => void
  onOpenWidthCalc?: () => void
  onOpenHeelCalc?: () => void
  onOpenColorCalc?: () => void
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

export function CalcMenuPage({
  onBack,
  lang,
  onOpenSizeCalc,
  onOpenWidthCalc,
  onOpenHeelCalc,
  onOpenColorCalc,
  isFavorite = false,
  onToggleFavorite,
}: CalcMenuPageProps) {
  const triggerHaptic = (style: 'light' | 'medium' = 'light') => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
      else if (navigator.vibrate) navigator.vibrate(style === 'light' ? 20 : 40)
    } catch {}
  }

  const t = {
    ru: {
      title: 'PRO Расчёты',
      sizeTitle: 'Размеры',
      sizeSub: 'UK, US, EU, UKR',
      widthTitle: 'Полнота',
      widthSub: 'Расчет по обхвату',
      heelTitle: 'Каблук (H)',
      heelSub: 'Биомеханика и угол',
      saveAddTitle: 'На главную',
      saveAddSub: 'Добавить',
      saveRemoveTitle: 'В избранном',
      saveRemoveSub: 'Сохранено',
      colorTitle: 'Колористика',
      colorSub: 'Смешивание красок',
      backMenu: 'Назад в меню',
    },
    uk: {
      title: 'PRO Розрахунки',
      sizeTitle: 'Розміри',
      sizeSub: 'UK, US, EU, UKR',
      widthTitle: 'Повнота',
      widthSub: 'Розрахунок за обхватом',
      heelTitle: 'Підбор (H)',
      heelSub: 'Біомеханіка та кут',
      saveAddTitle: 'На головну',
      saveAddSub: 'Додати',
      saveRemoveTitle: 'В обраному',
      saveRemoveSub: 'Збережено',
      colorTitle: 'Колористика',
      colorSub: 'Змішування фарб',
      backMenu: 'Назад в меню',
    },
  }[lang]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative flex flex-col h-[100dvh] bg-[var(--color-bg,#1C1816)] text-[var(--color-ink,#F5F1EA)] overflow-hidden justify-between transform-gpu"
    >
      {/* Стабильный фон без мигания и без отложенного «приглушения» */}
      <div className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none bg-[var(--color-bg,#1C1816)]">
        <img
          src="/CalcMenuPage/size.jpg"
          alt=""
          className="w-full h-full object-cover object-[center_top] opacity-[0.08]"
          style={{ transition: 'none' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        {/* Более плотный градиент — сразу приглушает картинку */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(
                to bottom,
                color-mix(in srgb, var(--color-bg, #1C1816) 75%, transparent) 0%,
                color-mix(in srgb, var(--color-bg, #1C1816) 92%, transparent) 55%,
                var(--color-bg, #1C1816) 100%
              )
            `,
          }}
        />
      </div>

      {/* Кнопка Назад */}
      <div className="relative z-50 p-5">
        <button
          onClick={() => {
            triggerHaptic('light')
            onBack()
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-90 transition-transform shadow-sm text-[var(--color-ink,#F5F1EA)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="relative z-10 px-5 flex flex-col justify-end pb-32 flex-1">
        <div className="mb-6">
          <h1 className="text-[34px] font-serif font-normal tracking-wide mb-1 leading-none text-[var(--color-ink,#F5F1EA)]">
            {t.title}
          </h1>
        </div>

        {/* Сетка карточек */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Розміри */}
          <button
            onClick={() => {
              triggerHaptic('medium')
              onOpenSizeCalc?.()
            }}
            className="h-[116px] p-4 rounded-[18px] bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] flex flex-col justify-between text-left transition-transform active:scale-95 shadow-sm hover:shadow-md"
          >
            <div className="w-8 h-8 rounded-[10px] bg-[var(--color-accent,#E4D00A)]/15 text-[var(--color-accent,#E4D00A)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16H3V8h18v8z" />
                <path d="M7 16v-4m4 4v-2m4 2v-4" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-medium leading-tight mb-0.5 text-[var(--color-ink,#F5F1EA)]">
                {t.sizeTitle}
              </div>
              <div className="text-[11px] text-[var(--color-muted,#B9ACA0)] truncate">{t.sizeSub}</div>
            </div>
          </button>

          {/* Повнота */}
          <button
            onClick={() => {
              triggerHaptic('medium')
              onOpenWidthCalc?.()
            }}
            className="h-[116px] p-4 rounded-[18px] bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] flex flex-col justify-between text-left transition-transform active:scale-95 shadow-sm hover:shadow-md"
          >
            <div className="w-8 h-8 rounded-[10px] bg-[var(--pigment-egyptian-blue,#1034A6)]/15 text-[var(--pigment-egyptian-blue,#1034A6)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12H2" />
                <path d="M18 8l4 4-4 4" />
                <path d="M6 8l-4 4 4 4" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-medium leading-tight mb-0.5 text-[var(--color-ink,#F5F1EA)]">
                {t.widthTitle}
              </div>
              <div className="text-[11px] text-[var(--color-muted,#B9ACA0)] truncate">{t.widthSub}</div>
            </div>
          </button>

          {/* Підбор */}
          <button
            onClick={() => {
              triggerHaptic('medium')
              onOpenHeelCalc?.()
            }}
            className="h-[116px] p-4 rounded-[18px] bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] flex flex-col justify-between text-left transition-transform active:scale-95 shadow-sm hover:shadow-md"
          >
            <div className="w-8 h-8 rounded-[10px] bg-[var(--pigment-azurite,#007FFF)]/15 text-[var(--pigment-azurite,#007FFF)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 20h18L12 4 3 20z" />
                <path d="M12 15v.01" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-medium leading-tight mb-0.5 text-[var(--color-ink,#F5F1EA)]">
                {t.heelTitle}
              </div>
              <div className="text-[11px] text-[var(--color-muted,#B9ACA0)] truncate">{t.heelSub}</div>
            </div>
          </button>

          {/* Обране / На головну */}
          <button
            onClick={() => {
              triggerHaptic(isFavorite ? 'light' : 'medium')
              onToggleFavorite?.()
            }}
            className={`h-[116px] p-4 rounded-[18px] transition-all active:scale-95 flex flex-col justify-between text-left shadow-sm hover:shadow-md bg-[var(--color-surface,#25201C)] ${
              isFavorite
                ? 'border border-[var(--pigment-lac-dye,#8B0000)]/50 shadow-[0_0_15px_color-mix(in_srgb,var(--pigment-lac-dye,#8B0000)_20%,transparent)]'
                : 'border border-[var(--color-border,rgba(255,255,255,0.12))]'
            }`}
          >
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-[var(--pigment-lac-dye,#8B0000)]/15 text-[var(--pigment-lac-dye,#8B0000)]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-medium leading-tight mb-0.5 text-[var(--color-ink,#F5F1EA)]">
                {isFavorite ? t.saveRemoveTitle : t.saveAddTitle}
              </div>
              <div
                className={`text-[11px] truncate ${
                  isFavorite ? 'text-[var(--pigment-lac-dye,#8B0000)]' : 'text-[var(--color-muted,#B9ACA0)]'
                }`}
              >
                {isFavorite ? t.saveRemoveSub : t.saveAddSub}
              </div>
            </div>
          </button>

          {/* Колористика */}
          <button
            onClick={() => {
              triggerHaptic('medium')
              onOpenColorCalc?.()
            }}
            className="h-[116px] p-4 rounded-[18px] bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] flex flex-col justify-between text-left transition-transform active:scale-95 shadow-sm hover:shadow-md"
          >
            <div className="w-8 h-8 rounded-[10px] bg-[var(--pigment-malachite,#0BDA51)]/15 text-[var(--pigment-malachite,#0BDA51)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-medium leading-tight mb-0.5 text-[var(--color-ink,#F5F1EA)]">
                {t.colorTitle}
              </div>
              <div className="text-[11px] text-[var(--color-muted,#B9ACA0)] truncate">{t.colorSub}</div>
            </div>
          </button>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light')
            onBack()
          }}
          className="text-center text-[13px] text-[var(--color-muted,#B9ACA0)] hover:text-[var(--color-ink,#F5F1EA)] active:opacity-60 transition-opacity font-medium py-2"
        >
          {t.backMenu}
        </button>
      </div>

      <div className="fixed bottom-[10px] left-0 right-0 z-50 pointer-events-auto">
        <BottomDock active="search" lang={lang} />
      </div>
    </motion.div>
  )
 }
