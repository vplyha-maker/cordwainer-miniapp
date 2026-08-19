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
      category: 'БЛОГ И СТАТЬИ',
      title: 'PRO Расчёты',
      desc: 'Изнанка обувной индустрии. Дизайн, технологии и секреты производства',
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
      category: 'БЛОГ ТА СТАТТІ',
      title: 'PRO Розрахунки',
      desc: 'Виворіт взуттєвої індустрії. Дизайн, технології та секрети виробництва',
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
      className="relative flex flex-col h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)] overflow-hidden justify-between transform-gpu"
    >
      {/* Фон */}
      <div className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none">
        <img
          src="/CalcMenuPage/size.jpg"
          alt="Calculators Background"
          className="w-full h-full object-cover object-[center_top] opacity-70 dark:opacity-80"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        {/* Градієнт підлаштовується під тему */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, color-mix(in srgb, var(--color-bg) 25%, transparent) 0%, color-mix(in srgb, var(--color-bg) 75%, transparent) 45%, var(--color-bg) 88%)',
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
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] active:scale-90 transition-transform text-[var(--color-ink)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="relative z-10 px-5 flex flex-col justify-end pb-28 flex-1">
        <div className="mb-6">
          <span className="text-[11px] font-semibold text-[var(--color-accent)] tracking-[0.15em] uppercase block mb-2">
            {t.category}
          </span>
          <h1 className="text-[32px] font-serif font-normal tracking-wide mb-2 leading-none text-[var(--color-ink)]">
            {t.title}
          </h1>
          <p className="text-[13px] text-[var(--color-muted)] leading-relaxed max-w-[280px]">
            {t.desc}
          </p>
        </div>

        {/* Сітка карток */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Розміри */}
          <button
            onClick={() => {
              triggerHaptic('medium')
              onOpenSizeCalc?.()
            }}
            className="h-[104px] p-3.5 rounded-[18px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between text-left transition-transform active:scale-95"
          >
            <div className="w-8 h-8 rounded-[10px] bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9M15 21V9" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-medium leading-tight mb-0.5 text-[var(--color-ink)]">
                {t.sizeTitle}
              </div>
              <div className="text-[11px] text-[var(--color-muted)] truncate">{t.sizeSub}</div>
            </div>
          </button>

          {/* Повнота */}
          <button
            onClick={() => {
              triggerHaptic('medium')
              onOpenWidthCalc?.()
            }}
            className="h-[104px] p-3.5 rounded-[18px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between text-left transition-transform active:scale-95"
          >
            <div className="w-8 h-8 rounded-[10px] bg-[var(--pigment-egyptian-blue)]/15 text-[var(--pigment-egyptian-blue)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-medium leading-tight mb-0.5 text-[var(--color-ink)]">
                {t.widthTitle}
              </div>
              <div className="text-[11px] text-[var(--color-muted)] truncate">{t.widthSub}</div>
            </div>
          </button>

          {/* Підбор */}
          <button
            onClick={() => {
              triggerHaptic('medium')
              onOpenHeelCalc?.()
            }}
            className="h-[104px] p-3.5 rounded-[18px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between text-left transition-transform active:scale-95"
          >
            <div className="w-8 h-8 rounded-[10px] bg-[var(--pigment-azurite)]/15 text-[var(--pigment-azurite)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 20h18L12 4 3 20z" />
                <path d="M12 15v.01" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-medium leading-tight mb-0.5 text-[var(--color-ink)]">
                {t.heelTitle}
              </div>
              <div className="text-[11px] text-[var(--color-muted)] truncate">{t.heelSub}</div>
            </div>
          </button>

          {/* Обране */}
          <button
            onClick={() => {
              triggerHaptic(isFavorite ? 'light' : 'medium')
              onToggleFavorite?.()
            }}
            className={`h-[104px] p-3.5 rounded-[18px] transition-all active:scale-95 flex flex-col justify-between text-left bg-[var(--color-surface)] ${
              isFavorite
                ? 'border border-[var(--pigment-lac-dye)]/50 shadow-[0_0_15px_color-mix(in_srgb,var(--pigment-lac-dye)_20%,transparent)]'
                : 'border border-[var(--color-border)]'
            }`}
          >
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-[var(--pigment-lac-dye)]/15 text-[var(--pigment-lac-dye)]">
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
              <div className="text-[13px] font-medium leading-tight mb-0.5 text-[var(--color-ink)]">
                {isFavorite ? t.saveRemoveTitle : t.saveAddTitle}
              </div>
              <div
                className={`text-[11px] truncate ${
                  isFavorite ? 'text-[var(--pigment-lac-dye)]' : 'text-[var(--color-muted)]'
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
            className="h-[104px] p-3.5 rounded-[18px] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between text-left transition-transform active:scale-95"
          >
            <div className="w-8 h-8 rounded-[10px] bg-[var(--pigment-malachite)]/15 text-[var(--pigment-malachite)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-medium leading-tight mb-0.5 text-[var(--color-ink)]">
                {t.colorTitle}
              </div>
              <div className="text-[11px] text-[var(--color-muted)] truncate">{t.colorSub}</div>
            </div>
          </button>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light')
            onBack()
          }}
          className="text-center text-[13px] text-[var(--color-muted)] hover:text-[var(--color-ink)] active:opacity-60 transition-opacity font-medium py-2"
        >
          {t.backMenu}
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
        <BottomDock active="search" lang={lang} />
      </div>
    </motion.div>
  )
 }
