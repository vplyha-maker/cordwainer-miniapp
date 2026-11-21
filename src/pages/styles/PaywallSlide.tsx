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
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
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
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 36px)',
      }}
      className="h-full w-full snap-start snap-always relative bg-[#050505] overflow-hidden flex flex-col justify-end px-6"
    >
      {/* Фоновое превью-видео монтируется ТОЛЬКО когда открыт сам Paywall-слайд */}
      {previewVideo && isActive && (
        <video
          src={`${previewVideo}#t=0.001`}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover scale-105 blur-md opacity-30 pointer-events-none"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40 z-0 pointer-events-none" />

      <div className="absolute top-24 left-4 pointer-events-none select-none z-0">
        <h2 className="font-serif text-[22vw] leading-[0.8] text-white/[0.04] tracking-tighter">
          FULL
          <br />
          VIDEO
          <br />
          LOOKBOOK
        </h2>
      </div>

      <div className="relative z-10 w-full mb-2">
        <div className="w-full h-px bg-white/20 mb-6" />

        <p className="text-[9px] font-sans uppercase tracking-[0.35em] text-white/60 mb-3">
          {t.paywall.tag}
        </p>

        <h3 className="font-serif text-4xl min-[390px]:text-5xl tracking-tight text-[#F4F0E8] whitespace-pre-line mb-4">
          {t.paywall.title}
        </h3>

        <p className="text-[11px] min-[390px]:text-[12px] font-sans font-light leading-[1.7] text-white/75 max-w-[320px] mb-5">
          {t.paywall.desc}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {lockedPreviewTitles.map((title) => (
            <span
              key={title}
              className="px-2.5 py-1 text-[9px] font-sans uppercase tracking-[0.15em] text-white/75 bg-white/10 border border-white/15 backdrop-blur-sm"
            >
              {title}
            </span>
          ))}
          <span className="px-2.5 py-1 text-[9px] font-sans uppercase tracking-[0.15em] text-white/50 border border-white/10">
            {t.moreStyles}
          </span>
        </div>

        <p className="text-[9px] font-sans uppercase tracking-[0.2em] text-white/50 mb-2.5">
          {t.paywall.priceNote}
        </p>

        <button
          type="button"
          onClick={onProClick}
          disabled={isPaymentBusy}
          style={{ touchAction: 'manipulation' }}
          className="paywall-btn group relative flex items-center justify-between w-full h-[56px] px-6 border text-[#F4F0E8] hover:bg-white/10 active:scale-[0.98] transition-all outline-none bg-black/50 backdrop-blur-md cursor-pointer disabled:opacity-55"
        >
          {isPaymentBusy ? (
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] animate-pulse mx-auto">
              {paymentState === 'verifying_payment' ? t.paywall.verifying : t.paywall.loading}
            </span>
          ) : (
            <>
              <span className="text-[10px] font-sans uppercase tracking-[0.2em]">
                {t.paywall.btn}
              </span>
              <LockIcon />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

