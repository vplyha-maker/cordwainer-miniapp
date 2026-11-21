import type { UiText } from './i18n'
import type { PaymentState } from './types'

type PaywallSlideProps = {
  index: number
  slideRef: (el: HTMLDivElement | null) => void
  isActive: boolean
  previewVideo?: string
  lockedPreviewTitles: string[]
  t: UiText
  paymentState: PaymentState
  isPaymentBusy: boolean
  onProClick: () => void
}

const LockIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
)

export function PaywallSlide({
  index,
  slideRef,
  isActive,
  previewVideo,
  lockedPreviewTitles,
  t,
  paymentState,
  isPaymentBusy,
  onProClick,
}: PaywallSlideProps) {
  return (
    <div
      ref={slideRef}
      data-index={index}
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)',
      }}
      className="h-full w-full snap-start snap-always relative bg-[#0B0B0A] flex flex-col justify-end md:justify-center px-6 md:px-10 pt-24 md:pt-20"
    >
      <div className="w-full max-w-[920px] mx-auto md:grid md:grid-cols-[minmax(280px,390px)_1fr] md:gap-10 md:items-center">
        {/* Превью-кадр (на планшете/десктопе — отдельная колонка 9:16, на мобильном — спокойный фон) */}
        <div className="hidden md:block relative h-[min(78vh,740px)] aspect-[9/16] mx-auto rounded-[8px] border border-[#F4F0E8]/12 overflow-hidden bg-[#141312]">
          {previewVideo && isActive && (
            <video
              src={`${previewVideo}#t=0.001`}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover opacity-55 pointer-events-none"
            />
          )}
          <div className="absolute inset-0 bg-[#0B0B0A]/45 pointer-events-none" />
        </div>

        {previewVideo && isActive && (
          <video
            src={`${previewVideo}#t=0.001`}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="md:hidden absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
          />
        )}
        <div className="md:hidden absolute inset-0 bg-gradient-to-t from-[#0B0B0A] via-[#0B0B0A]/90 to-[#0B0B0A]/60 pointer-events-none" />

        {/* Редакционный блок доступа к коллекции */}
        <div className="relative z-10 w-full max-w-[460px] md:py-4">
          <div className="w-12 h-px bg-[#C9A97E] mb-5" />

          <p className="text-xs uppercase tracking-[0.1em] text-[#C9A97E] mb-3">
            {t.paywall.tag}
          </p>

          <h3 className="font-serif text-4xl md:text-5xl leading-[1.04] tracking-[-0.02em] text-[#F4F0E8] whitespace-pre-line mb-4">
            {t.paywall.title}
          </h3>

          <p className="text-sm md:text-[15px] leading-[1.6] text-[#F4F0E8]/80 max-w-[44ch] mb-6">
            {t.paywall.desc}
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {lockedPreviewTitles.map((title) => (
              <span
                key={title}
                className="px-3 py-1.5 rounded-[6px] text-xs text-[#F4F0E8]/85 bg-[#141312] border border-[#F4F0E8]/12"
              >
                {title}
              </span>
            ))}
            <span className="px-3 py-1.5 rounded-[6px] text-xs text-[#A39E93] bg-[#141312]/60 border border-[#F4F0E8]/10">
              {t.moreStyles}
            </span>
          </div>

          <p className="text-xs text-[#A39E93] mb-3">
            {t.paywall.priceNote}
          </p>

          <button
            type="button"
            onClick={onProClick}
            disabled={isPaymentBusy}
            style={{ touchAction: 'manipulation' }}
            className="w-full min-h-[48px] px-6 py-3 rounded-[6px] border border-[#C9A97E] bg-[#C9A97E] text-[#0B0B0A] hover:bg-[#d6b992] active:scale-[0.99] transition-colors flex items-center justify-between gap-4 cursor-pointer disabled:opacity-55"
          >
            {isPaymentBusy ? (
              <span className="text-xs font-semibold uppercase tracking-[0.08em] mx-auto">
                {paymentState === 'verifying_payment' ? t.paywall.verifying : t.paywall.loading}
              </span>
            ) : (
              <>
                <span className="text-xs font-semibold uppercase tracking-[0.08em]">
                  {t.paywall.btn}
                </span>
                <LockIcon />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
