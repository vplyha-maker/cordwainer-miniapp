import { motion } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'
import type { Lang } from '../App'

// ЭКСПОРТИРУЕМ КОЛИЧЕСТВО ДЛЯ HOMEPAGE (чтобы обновлялось автоматически)
export const CALCULATORS_COUNT = 5;

type CalcMenuPageProps = {
  onBack: () => void
  lang: Lang
  onOpenSizeCalc?: () => void
  onOpenWidthCalc?: () => void
  onOpenHeelCalc?: () => void
  onOpenColorCalc?: () => void
  onOpenSalaryCalc?: () => void 
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
  onOpenSalaryCalc,
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
      salaryTitle: 'Зарплата',
      salarySub: 'Сдельная оплата',
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
      salaryTitle: 'Зарплата',
      salarySub: 'Відрядна оплата',
      backMenu: 'Назад в меню',
    },
    de: {
      title: 'PRO Rechner',
      sizeTitle: 'Größen',
      sizeSub: 'UK, US, EU, UKR',
      widthTitle: 'Weite',
      widthSub: 'Umfang', // Сокращено для вместимости
      heelTitle: 'Absatz (H)',
      heelSub: 'Biomechanik', // Сокращено
      saveAddTitle: 'Startseite', // Сокращено
      saveAddSub: 'Hinzufügen',
      saveRemoveTitle: 'Favorit', // Сокращено
      saveRemoveSub: 'Gespeichert',
      colorTitle: 'Farben',
      colorSub: 'Farbmischung',
      salaryTitle: 'Lohn',
      salarySub: 'Akkordlohn',
      backMenu: 'Zurück zum Menü',
    },
  }[lang]

  const cardBase =
    'h-[124px] p-3.5 md:p-4 rounded-[18px] bg-[var(--color-surface)] border flex flex-col justify-between text-left transition-transform active:scale-95 shadow-sm hover:border-[var(--color-accent)] overflow-hidden'

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="relative flex flex-col h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)] overflow-hidden justify-between transform-gpu"
    >
      <div className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none bg-[var(--color-bg)] z-0">
        <img
          src="/CalcMenuPage/size.jpg"
          alt=""
          className="w-full h-full object-cover object-[center_top] opacity-15"
          style={{ transition: 'none' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        {/* Плотный градиент для скрытия "грязного" смешивания цветов */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(
              to bottom,
              color-mix(in srgb, var(--color-bg) 60%, transparent) 0%,
              var(--color-bg) 75%,
              var(--color-bg) 100%
            )`,
          }}
        />
      </div>

      <div className="relative z-50 p-4 md:p-6 pb-0">
        <button
          onClick={() => {
            triggerHaptic('light')
            onBack()
          }}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] active:scale-90 transition-transform shadow-sm text-[var(--color-ink)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="relative z-10 px-4 md:px-6 flex flex-col justify-end pb-[110px] flex-1 max-w-full">
        <div className="mb-5">
          <h1 className="text-[36px] md:text-[40px] font-serif font-bold tracking-wide mb-1 leading-none text-[var(--color-ink)]">
            {t.title}
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
          {/* 1. Размеры */}
          <button onClick={() => { triggerHaptic('medium'); onOpenSizeCalc?.(); }} className={`${cardBase} border-[var(--color-border)]`}>
            <div 
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: 'color-mix(in srgb, var(--color-accent, #B46513) 15%, var(--color-surface))', color: 'var(--color-accent, #B46513)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16H3V8h18v8z" />
                <path d="M7 16v-4m4 4v-2m4 2v-4" />
              </svg>
            </div>
            <div className="min-w-0 mt-3 w-full">
              <div className="text-[14px] font-bold leading-snug mb-1 text-[var(--color-ink)] truncate">{t.sizeTitle}</div>
              <div className="text-[12px] font-medium text-[var(--color-muted)] truncate">{t.sizeSub}</div>
            </div>
          </button>

          {/* 2. Полнота */}
          <button onClick={() => { triggerHaptic('medium'); onOpenWidthCalc?.(); }} className={`${cardBase} border-[var(--color-border)]`}>
            <div 
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: 'color-mix(in srgb, var(--pigment-egyptian-blue, #1E3A8A) 15%, var(--color-surface))', color: 'var(--pigment-egyptian-blue, #1E3A8A)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12H2" />
                <path d="M18 8l4 4-4 4" />
                <path d="M6 8l-4 4 4 4" />
              </svg>
            </div>
            <div className="min-w-0 mt-3 w-full">
              <div className="text-[14px] font-bold leading-snug mb-1 text-[var(--color-ink)] truncate">{t.widthTitle}</div>
              <div className="text-[12px] font-medium text-[var(--color-muted)] truncate">{t.widthSub}</div>
            </div>
          </button>

          {/* 3. Каблук */}
          <button onClick={() => { triggerHaptic('medium'); onOpenHeelCalc?.(); }} className={`${cardBase} border-[var(--color-border)]`}>
            <div 
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: 'color-mix(in srgb, var(--pigment-azurite, #1D4ED8) 15%, var(--color-surface))', color: 'var(--pigment-azurite, #1D4ED8)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 20h18L12 4 3 20z" />
                <path d="M12 15v.01" />
              </svg>
            </div>
            <div className="min-w-0 mt-3 w-full">
              <div className="text-[14px] font-bold leading-snug mb-1 text-[var(--color-ink)] truncate">{t.heelTitle}</div>
              <div className="text-[12px] font-medium text-[var(--color-muted)] truncate">{t.heelSub}</div>
            </div>
          </button>

          {/* 4. Избранное (На главную) */}
          <button
            onClick={() => { triggerHaptic(isFavorite ? 'light' : 'medium'); onToggleFavorite?.(); }}
            className={`${cardBase} ${
              isFavorite ? 'border-[var(--pigment-lac-dye,#991B1B)] shadow-[0_0_12px_color-mix(in_srgb,var(--pigment-lac-dye,#991B1B)_20%,transparent)]' : 'border-[var(--color-border)]'
            }`}
          >
            <div 
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
              style={{
                background: isFavorite ? 'color-mix(in srgb, var(--pigment-lac-dye, #991B1B) 15%, var(--color-surface))' : 'color-mix(in srgb, var(--color-muted) 15%, var(--color-surface))',
                color: isFavorite ? 'var(--pigment-lac-dye, #991B1B)' : 'var(--color-muted)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div className="min-w-0 mt-3 w-full">
              <div className="text-[14px] font-bold leading-snug mb-1 text-[var(--color-ink)] truncate">
                {isFavorite ? t.saveRemoveTitle : t.saveAddTitle}
              </div>
              <div className={`text-[12px] font-medium truncate ${isFavorite ? 'text-[var(--pigment-lac-dye,#991B1B)]' : 'text-[var(--color-muted)]'}`}>
                {isFavorite ? t.saveRemoveSub : t.saveAddSub}
              </div>
            </div>
          </button>

          {/* 5. Колористика */}
          <button onClick={() => { triggerHaptic('medium'); onOpenColorCalc?.(); }} className={`${cardBase} border-[var(--color-border)]`}>
            <div 
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: 'color-mix(in srgb, var(--pigment-malachite, #047857) 15%, var(--color-surface))', color: 'var(--pigment-malachite, #047857)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <div className="min-w-0 mt-3 w-full">
              <div className="text-[14px] font-bold leading-snug mb-1 text-[var(--color-ink)] truncate">{t.colorTitle}</div>
              <div className="text-[12px] font-medium text-[var(--color-muted)] truncate">{t.colorSub}</div>
            </div>
          </button>

          {/* 6. ЗАРПЛАТА */}
          <button 
            onClick={() => { triggerHaptic('medium'); if (onOpenSalaryCalc) onOpenSalaryCalc(); }} 
            className={`${cardBase} border-[var(--color-border)]`}
          >
            <div 
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: 'color-mix(in srgb, var(--pigment-lac-dye, #E11D48) 15%, var(--color-surface))', color: 'var(--pigment-lac-dye, #E11D48)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            </div>
            <div className="min-w-0 mt-3 w-full">
              <div className="text-[14px] font-bold leading-snug mb-1 text-[var(--color-ink)] truncate">{t.salaryTitle}</div>
              <div className="text-[12px] font-medium text-[var(--color-muted)] truncate">{t.salarySub}</div>
            </div>
          </button>
        </div>

        <button
          onClick={() => { triggerHaptic('light'); onBack(); }}
          className="text-center text-[14px] text-[var(--color-muted)] hover:text-[var(--color-ink)] active:opacity-60 transition-opacity font-bold py-2"
        >
          {t.backMenu}
        </button>
      </div>

      <div 
        className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
        style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto w-full max-w-[var(--app-max-width)]">
          <BottomDock active="workspace" lang={lang} />
        </div>
      </div>
    </motion.div>
  )
}
