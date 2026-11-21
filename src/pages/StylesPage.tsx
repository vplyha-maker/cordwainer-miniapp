import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type MouseEvent,
  type TouchEvent,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang as AppLang } from '../App'
import { getUiText } from './styles/i18n'
import { PaywallSlide } from './styles/PaywallSlide'
import { SlideItem } from './styles/SlideItem'
import { STYLES_DATA } from './styles/stylesData'
import { getTelegramWebApp, isRunningInTelegram, showTelegramAlert } from './styles/telegram'
import {
  FREE_STYLES_COUNT,
  PREVIEW_TAG_COUNT,
  PRO_STORAGE_KEY,
  PRO_VIDEOS_PRICE_STARS,
  normalizeSupportedLang,
  type PaymentState,
  type StyleSlide,
  type SupportedLang,
} from './styles/types'

export {
  FREE_STYLES_COUNT,
  PREVIEW_TAG_COUNT,
  PRO_VIDEOS_PRICE_STARS,
  STYLES_DATA,
  normalizeSupportedLang,
  type PaymentState,
  type StyleSlide,
  type SupportedLang,
}

type StylesPageProps = {
  onBack: () => void
  lang: AppLang
}

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
}

export function StylesPage({ onBack, lang = 'ru' as AppLang }: StylesPageProps) {
  const currentLang = normalizeSupportedLang(lang)
  const totalStylesCount = STYLES_DATA.length
  const t = useMemo(() => getUiText(currentLang, totalStylesCount), [currentLang, totalStylesCount])

  const [isMuted, setIsMuted] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [readySlideIndex, setReadySlideIndex] = useState<number>(-1)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [paymentState, setPaymentState] = useState<PaymentState>('idle')
  const [buttonMode, setButtonMode] = useState<'hidden' | 'up' | 'down'>('hidden')

  const scrollRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const toastTimerRef = useRef<number | null>(null)
  const jumpTimerRef = useRef<number | null>(null)
  const returnSlideIndexRef = useRef<number | null>(null)
  const isJumpingRef = useRef(false)

  const isProPurchased = paymentState === 'purchased'
  const isPaymentBusy =
    paymentState === 'creating_invoice' ||
    paymentState === 'invoice_open' ||
    paymentState === 'verifying_payment'

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current)
      if (jumpTimerRef.current !== null) window.clearTimeout(jumpTimerRef.current)
    }
  }, [])

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null)
      toastTimerRef.current = null
    }, 2400)
  }, [])

  const handleActiveVideoReady = useCallback((idx: number) => {
    setReadySlideIndex((prev) => (prev === idx ? prev : idx))
  }, [])

  const handleForceMuteSync = useCallback(() => {
    setIsMuted(true)
  }, [])

  const verifyPurchaseOnServer = useCallback(async (): Promise<boolean> => {
    const tg = getTelegramWebApp()
    const userId = tg?.initDataUnsafe?.user?.id
    const rawInitData = tg?.initData || ''
    if (!userId || !rawInitData) {
      try {
        localStorage.removeItem(PRO_STORAGE_KEY)
      } catch {}
      return false
    }

    try {
      const res = await fetch(
        `/api/check-purchase?userId=${encodeURIComponent(String(userId))}&productId=pro_videos`,
        {
          method: 'GET',
          headers: { 'X-Telegram-Init-Data': rawInitData },
        }
      )
      if (!res.ok) return false
      const data = (await res.json()) as { purchased?: boolean }
      if (data.purchased === true) {
        setPaymentState('purchased')
        try {
          localStorage.setItem(PRO_STORAGE_KEY, 'true')
        } catch {}
        return true
      } else {
        try {
          localStorage.removeItem(PRO_STORAGE_KEY)
        } catch {}
        return false
      }
    } catch (err) {
      console.error('Ошибка проверки покупки pro_videos:', err)
      return false
    }
  }, [])

  useEffect(() => {
    void verifyPurchaseOnServer()
  }, [verifyPurchaseOnServer])

  const visibleStyles = isProPurchased
    ? STYLES_DATA
    : STYLES_DATA.slice(0, FREE_STYLES_COUNT)
  const showPaywallSlide = !isProPurchased

  const lockedPreviewTitles = useMemo(
    () =>
      STYLES_DATA.slice(FREE_STYLES_COUNT, FREE_STYLES_COUNT + PREVIEW_TAG_COUNT).map((s) =>
        s.title[currentLang].replace('\n', ' ')
      ),
    [currentLang]
  )

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handlePassiveScroll = () => {
      const currentY = container.scrollTop
      const slideH = Math.max(300, container.clientHeight)

      if (currentY > slideH * 1.2) {
        setButtonMode((prev) => (prev !== 'up' ? 'up' : prev))
      } else if (currentY < slideH * 0.25 && returnSlideIndexRef.current !== null) {
        setButtonMode((prev) => (prev !== 'down' ? 'down' : prev))
      } else {
        setButtonMode((prev) => (prev !== 'hidden' ? 'hidden' : prev))
      }
    }

    container.addEventListener('scroll', handlePassiveScroll, { passive: true })
    return () => container.removeEventListener('scroll', handlePassiveScroll)
  }, [])

  const handleSmartScroll = () => {
    const tg = getTelegramWebApp()
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light')

    const container = scrollRef.current
    if (!container) return

    if (jumpTimerRef.current !== null) {
      window.clearTimeout(jumpTimerRef.current)
      jumpTimerRef.current = null
    }

    if (buttonMode === 'up') {
      returnSlideIndexRef.current = activeIndex
      isJumpingRef.current = true
      setActiveIndex(0)

      container.scrollTo({ top: 0, behavior: 'smooth' })
      jumpTimerRef.current = window.setTimeout(() => {
        isJumpingRef.current = false
        jumpTimerRef.current = null
      }, 750)
    } else if (buttonMode === 'down' && returnSlideIndexRef.current !== null) {
      const targetIdx = Math.min(returnSlideIndexRef.current, slideRefs.current.length - 1)
      isJumpingRef.current = true
      setActiveIndex(targetIdx)

      const targetEl = slideRefs.current[targetIdx]
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' })
      } else {
        container.scrollTo({
          top: targetIdx * container.clientHeight,
          behavior: 'smooth',
        })
      }

      jumpTimerRef.current = window.setTimeout(() => {
        isJumpingRef.current = false
        returnSlideIndexRef.current = null
        jumpTimerRef.current = null
      }, 750)
    }
  }

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isJumpingRef.current) return

        let bestIdx: number | null = null
        let bestRatio = 0

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            const idx = Number(entry.target.getAttribute('data-index'))
            if (!Number.isNaN(idx) && entry.intersectionRatio > bestRatio) {
              bestRatio = entry.intersectionRatio
              bestIdx = idx
            }
          }
        }

        if (bestIdx !== null) {
          setActiveIndex(bestIdx)
        }
      },
      { root, threshold: [0.55, 0.75] }
    )

    const maxSlides = visibleStyles.length + (showPaywallSlide ? 1 : 0)
    for (let i = 0; i < maxSlides; i++) {
      const el = slideRefs.current[i]
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [visibleStyles.length, showPaywallSlide])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', handleKeyDown)

    const tg = getTelegramWebApp()
    if (isRunningInTelegram() && tg) {
      tg.ready()
      tg.expand?.()
      tg.disableVerticalSwipes?.()

      if (tg.BackButton) {
        tg.BackButton.show()
        tg.BackButton.onClick(onBack)
        return () => {
          window.removeEventListener('keydown', handleKeyDown)
          tg.BackButton?.offClick(onBack)
          tg.BackButton?.hide()
        }
      }
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onBack])

  const handleBackPress = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.stopPropagation()
      const tg = getTelegramWebApp()
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light')
      onBack()
    },
    [onBack]
  )

  const handleProClick = async () => {
    if (isPaymentBusy || isProPurchased) return
    const tg = getTelegramWebApp()
    const userId = tg?.initDataUnsafe?.user?.id
    const rawInitData = tg?.initData || ''

    if (!isRunningInTelegram() || !userId || !rawInitData || !tg?.openInvoice) {
      showTelegramAlert(t.errTgOnly)
      return
    }

    setPaymentState('creating_invoice')
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light')

    try {
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': rawInitData,
        },
        body: JSON.stringify({
          userId,
          productId: 'pro_videos',
          initData: rawInitData,
          amountStars: PRO_VIDEOS_PRICE_STARS,
        }),
      })

      const data = (await response.json()) as {
        invoiceLink?: string
        error?: string
        alreadyPurchased?: boolean
      }

      if (response.status === 409 && data.alreadyPurchased) {
        setPaymentState('purchased')
        try {
          localStorage.setItem(PRO_STORAGE_KEY, 'true')
        } catch {}
        setActiveIndex(FREE_STYLES_COUNT)
        return
      }

      if (!response.ok || !data.invoiceLink) {
        throw new Error(data.error || t.errServer)
      }

      setPaymentState('invoice_open')

      tg.openInvoice(data.invoiceLink, async (status: string) => {
        if (status === 'paid') {
          setPaymentState('verifying_payment')
          let verified = await verifyPurchaseOnServer()
          if (!verified) {
            await new Promise((r) => setTimeout(r, 850))
            verified = await verifyPurchaseOnServer()
          }
          if (!verified) {
            await new Promise((r) => setTimeout(r, 1200))
            verified = await verifyPurchaseOnServer()
          }

          if (verified) {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success')
            setPaymentState('purchased')
            setActiveIndex(FREE_STYLES_COUNT)
            window.setTimeout(() => {
              slideRefs.current[FREE_STYLES_COUNT]?.scrollIntoView({ behavior: 'smooth' })
            }, 60)
          } else {
            setPaymentState('failed')
            showTelegramAlert(t.errVerifyFailed)
          }
        } else if (status === 'pending') {
          setPaymentState('verifying_payment')
          const verified = await verifyPurchaseOnServer()
          if (verified) {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success')
            setPaymentState('purchased')
            setActiveIndex(FREE_STYLES_COUNT)
          } else {
            setPaymentState('idle')
            showTelegramAlert(t.errPending)
          }
        } else if (status === 'cancelled' || status === 'closed') {
          setPaymentState('idle')
        } else {
          setPaymentState('failed')
          showTelegramAlert(t.errPayment)
        }
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(error)
      setPaymentState('failed')
      showTelegramAlert(`${t.errServer}: ${msg}`)
    }
  }

  const handleToggleMute = useCallback(() => {
    const tg = getTelegramWebApp()
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('light')
    }
    setIsMuted((v) => !v)
  }, [])

  const isPaywallSlideActive = showPaywallSlide && activeIndex === visibleStyles.length

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-50 bg-[#050505] text-[#F4F0E8] overflow-hidden"
    >
      <style>{`
        .snap-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
          touch-action: pan-y;
        }
        .snap-container::-webkit-scrollbar { display: none; }
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none;
        }
        @keyframes subtleGlow {
          0%, 100% { border-color: rgba(255, 255, 255, 0.25); box-shadow: 0 0 0 rgba(255, 255, 255, 0); }
          50% { border-color: rgba(255, 255, 255, 0.65); box-shadow: 0 0 24px rgba(255, 255, 255, 0.14); }
        }
        .paywall-btn {
          animation: subtleGlow 3.5s infinite ease-in-out;
        }
      `}</style>

      <header
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 10px)',
        }}
        className="fixed top-0 left-0 right-0 z-[200] px-6 pb-2 flex justify-between items-center pointer-events-none"
      >
        <button
          type="button"
          onClick={handleBackPress}
          style={{ touchAction: 'manipulation' }}
          className="pointer-events-auto cursor-pointer min-h-[38px] min-w-[84px] flex items-center justify-center gap-2 py-2 px-3.5 -ml-1 rounded-full bg-black/55 backdrop-blur-xl border border-white/25 text-[10px] font-sans uppercase tracking-[0.2em] text-white shadow-[0_4px_16px_rgba(0,0,0,0.5)] active:scale-95 transition-transform"
        >
          <span className="text-xs leading-none">←</span>
          <span>{t.back}</span>
        </button>

        <button
          type="button"
          onClick={handleSmartScroll}
          style={{ touchAction: 'manipulation' }}
          className={`pointer-events-auto cursor-pointer min-h-[38px] flex items-center gap-1.5 py-2 px-3.5 rounded-full bg-black/55 backdrop-blur-xl border border-white/25 text-[10px] font-sans uppercase tracking-[0.2em] text-[#F4F0E8] shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-all duration-500 active:scale-95 ${
            buttonMode !== 'hidden'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-3 pointer-events-none'
          }`}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="square"
            className={`transition-transform duration-500 ${
              buttonMode === 'down' ? 'rotate-180' : 'rotate-0'
            }`}
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
          <span>{buttonMode === 'up' ? t.up : t.down}</span>
        </button>
      </header>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            style={{
              top: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 56px)',
            }}
            className="fixed left-1/2 -translate-x-1/2 z-[220] px-4 py-2 rounded-full bg-white text-black text-[10px] font-sans uppercase tracking-[0.2em] shadow-xl pointer-events-none"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={scrollRef}
        className="snap-container h-full w-full overflow-y-scroll snap-y snap-mandatory"
      >
        {visibleStyles.map((slide, index) => {
          const isActive = activeIndex === index
          const isNextSlideReadyToPreload =
            index === activeIndex + 1 && readySlideIndex === activeIndex
          const isPrevSlide = index === activeIndex - 1

          const shouldLoadVideo = isActive || isNextSlideReadyToPreload || isPrevSlide
          const shouldKeepInMemory = Math.abs(activeIndex - index) <= 1

          return (
            <div
              key={slide.id}
              ref={(el) => {
                slideRefs.current[index] = el
              }}
              data-index={index}
              className="h-full w-full snap-start snap-always"
            >
              <SlideItem
                slide={slide}
                lang={currentLang}
                index={index}
                totalCount={totalStylesCount}
                isActive={isActive}
                shouldLoadVideo={shouldLoadVideo}
                shouldKeepInMemory={shouldKeepInMemory}
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
                onForceMuteSync={handleForceMuteSync}
                onShowToast={showToast}
                onActiveVideoReady={handleActiveVideoReady}
              />
            </div>
          )
        })}

        {showPaywallSlide && (
          <PaywallSlide
            index={visibleStyles.length}
            slideRef={(el) => {
              slideRefs.current[visibleStyles.length] = el
            }}
            isActive={isPaywallSlideActive}
            previewVideo={STYLES_DATA[FREE_STYLES_COUNT]?.video}
            lockedPreviewTitles={lockedPreviewTitles}
            t={t}
            paymentState={paymentState}
            isPaymentBusy={isPaymentBusy}
            onProClick={() => void handleProClick()}
          />
        )}
      </div>
    </motion.div>
  )
}
