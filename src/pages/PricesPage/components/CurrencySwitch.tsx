import type { Currency } from '../../../components/PriceHistoryModal' // Проверьте путь до файла, где лежит тип Currency

export function CurrencySwitch({
  currency,
  onChange,
  usdRate,
  eurRate,
}: {
  currency: Currency
  onChange: (c: Currency) => void
  usdRate?: number | null
  eurRate?: number | null
}) {
  return (
    <div className="flex bg-[var(--color-surface-2)] p-0.5 rounded-md border border-[var(--color-border)]">
      {(['UAH', 'USD', 'EUR'] as Currency[]).map((cur) => {
        if (cur === 'USD' && !usdRate) return null
        if (cur === 'EUR' && !eurRate) return null
        const isActive = currency === cur
        return (
          <button
            key={cur}
            type="button"
            onClick={() => onChange(cur)}
            className={
              'px-2.5 py-1 text-[10px] font-bold rounded transition-all ' +
              (isActive
                ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-ink)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]')
            }
          >
            {cur}
          </button>
        )
      })}
    </div>
  )
}

