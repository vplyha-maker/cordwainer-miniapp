
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
import { hapticReset, hapticSave, hapticSwatch, hapticTap } from './styles/haptics'
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
  initialStyleId?: string | null
}

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.35 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
}

export function StylesPage({
  onBack,
  lang = 'ru' as AppLang,
  initialStyleId = null,
}: StylesPageProps) {
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
  const prevActiveIndexRef = useRef(0)
  const appliedInitialTargetRef = useRef<string | null>(null)

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

  useEffect(() => {
    if (prevActiveIndexRef.current !== activeIndex) {
      prevActiveIndexRef.current = activeIndex
      hapticSwatch()
    }
  }, [activeIndex])

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

  const scrollToSlideIndex = useCallback(
    (targetIdx: number, behavior: ScrollBehavior = 'smooth') => {
      const container = scrollRef.current
      if (!container) return

      const clampedIdx = Math.max(0, Math.min(targetIdx, slideRefs.current.length - 1))

      if (jumpTimerRef.current !== null) {
        window.clearTimeout(jumpTimerRef.current)
        jumpTimerRef.current = null
      }

      isJumpingRef.current = true
      setActiveIndex(clampedIdx)

      const targetEl = slideRefs.current[clampedIdx]
      if (targetEl) {
        targetEl.scrollIntoView({ behavior })
      } else {
        container.scrollTo({
          top: clampedIdx * container.clientHeight,
          behavior,
        })
      }

      jumpTimerRef.current = window.setTimeout(
        () => {
          isJumpingRef.current = false
          jumpTimerRef.current = null
        },
        behavior === 'auto' ? 120 : 750
      )
    },
    []
  )

  // Автопереход к фасону из URL (?style=...) или Telegram start_param
  useEffect(() => {
    if (!initialStyleId) return
    const styleIdx = STYLES_DATA.findIndex((s) => s.id === initialStyleId)
    if (styleIdx === -1) return

    const isUnlockedTarget = styleIdx < visibleStyles.length
    const targetIdx = isUnlockedTarget ? styleIdx : visibleStyles.length
    const targetKey = `${initialStyleId}:${isUnlockedTarget ? 'open' : 'locked'}`

    if (appliedInitialTargetRef.current === targetKey) return
    appliedInitialTargetRef.current = targetKey

    const timer = window.setTimeout(() => {
      scrollToSlideIndex(targetIdx, 'auto')
    }, 60)

    return () => window.clearTimeout(timer)
  }, [initialStyleId, visibleStyles.length, scrollToSlideIndex])

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
    hapticTap()

    if (buttonMode === 'up') {
      returnSlideIndexRef.current = activeIndex
      scrollToSlideIndex(0)
    } else if (buttonMode === 'down' && returnSlideIndexRef.current !== null) {
      const savedIdx = returnSlideIndexRef.current
      returnSlideIndexRef.current = null
      scrollToSlideIndex(savedIdx)
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
      hapticTap()
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
      hapticReset()
      showTelegramAlert(t.errTgOnly)
      return
    }

    setPaymentState('creating_invoice')
    hapticTap()

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
        hapticSave()
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
            hapticSave()
            setPaymentState('purchased')
            setActiveIndex(FREE_STYLES_COUNT)
            window.setTimeout(() => {
              slideRefs.current[FREE_STYLES_COUNT]?.scrollIntoView({ behavior: 'smooth' })
            }, 60)
          } else {
            hapticReset()
            setPaymentState('failed')
            showTelegramAlert(t.errVerifyFailed)
          }
        } else if (status === 'pending') {
          setPaymentState('verifying_payment')
          const verified = await verifyPurchaseOnServer()
          if (verified) {
            hapticSave()
            setPaymentState('purchased')
            setActiveIndex(FREE_STYLES_COUNT)
          } else {
            setPaymentState('idle')
            showTelegramAlert(t.errPending)
          }
        } else if (status === 'cancelled' || status === 'closed') {
          setPaymentState('idle')
        } else {
          hapticReset()
          setPaymentState('failed')
          showTelegramAlert(t.errPayment)
        }
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(error)
      hapticReset()
      setPaymentState('failed')
      showTelegramAlert(`${t.errServer}: ${msg}`)
    }
  }

  const handleToggleMute = useCallback(() => {
    hapticTap()
    setIsMuted((v) => !v)
  }, [])

  const isPaywallSlideActive = showPaywallSlide && activeIndex === visibleStyles.length

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-50 bg-[#0B0B0A] text-[#F4F0E8] overflow-hidden"
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
      `}</style>

      {/* Единый верхний хедер */}
      <header
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 10px)',
        }}
        className="fixed top-0 left-0 right-0 z-[200] px-5 md:px-8 pb-3 flex justify-between items-center pointer-events-none bg-gradient-to-b from-[#0B0B0A]/85 via-[#0B0B0A]/40 to-transparent"
      >
        <button
          type="button"
          onClick={handleBackPress}
          style={{ touchAction: 'manipulation' }}
          className="pointer-events-auto cursor-pointer min-h-[44px] px-4 rounded-[6px] bg-[#141312] border border-[#F4F0E8]/20 hover:border-[#C9A97E]/60 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[#F4F0E8] active:scale-95 transition-colors"
        >
          <span aria-hidden="true">←</span>
          <span>{t.back}</span>
        </button>

        <button
          type="button"
          onClick={handleSmartScroll}
          style={{ touchAction: 'manipulation' }}
          className={`pointer-events-auto cursor-pointer min-h-[44px] px-4 rounded-[6px] bg-[#141312] border border-[#F4F0E8]/20 hover:border-[#C9A97E]/60 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[#F4F0E8] transition-all duration-300 active:scale-95 ${
            buttonMode !== 'hidden'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className={`transition-transform duration-300 ${
              buttonMode === 'down' ? 'rotate-180' : 'rotate-0'
            }`}
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
          <span>{buttonMode === 'up' ? t.up : t.down}</span>
        </button>
      </header>

      {/* Уведомление о копировании */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            style={{
              top: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 64px)',
            }}
            className="fixed left-1/2 -translate-x-1/2 z-[220] px-4 py-2.5 rounded-[6px] bg-[#C9A97E] text-[#0B0B0A] text-xs font-medium tracking-[0.04em] pointer-events-none"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Студийный контейнер */}
      <div className="h-full w-full xl:grid xl:grid-cols-[220px_1fr]">
        {/* Левый индекс фасонов для десктопа (xl+) */}
        <aside className="hidden xl:flex xl:flex-col xl:justify-center xl:border-r xl:border-[#F4F0E8]/10 xl:px-6 xl:pt-20 xl:pb-8 bg-[#141312]/50">
          <p className="text-xs uppercase tracking-[0.08em] text-[#A39E93] mb-4">
            Index
          </p>
          <nav aria-label="Styles index" className="flex flex-col gap-1 overflow-y-auto pr-1">
            {visibleStyles.map((slide, idx) => {
              const isSelected = activeIndex === idx
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => {
                    hapticTap()
                    scrollToSlideIndex(idx)
                  }}
                  className={`w-full min-h-[38px] px-3 py-1.5 rounded-[6px] flex items-center gap-2.5 text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#C9A97E] text-[#0B0B0A] font-medium'
                      : 'text-[#F4F0E8]/75 hover:bg-[#1C1B19] hover:text-[#F4F0E8]'
                  }`}
                >
                  <span
                    className={`tabular-nums shrink-0 ${
                      isSelected ? 'text-[#0B0B0A]/80' : 'text-[#A39E93]'
                    }`}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="truncate">
                    {slide.title[currentLang].replace('\n', ' ')}
                  </span>
                </button>
              )
            })}

            {showPaywallSlide && (
              <button
                type="button"
                onClick={() => {
                  hapticTap()
                  scrollToSlideIndex(visibleStyles.length)
                }}
                className={`mt-2 w-full min-h-[38px] px-3 py-1.5 rounded-[6px] border flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  isPaywallSlideActive
                    ? 'border-[#C9A97E] bg-[#C9A97E] text-[#0B0B0A] font-medium'
                    : 'border-[#C9A97E]/40 text-[#C9A97E] hover:bg-[#1C1B19]'
                }`}
              >
                <span>PRO</span>
                <span className="tabular-nums">{PRO_VIDEOS_PRICE_STARS} ⭐️</span>
              </button>
            )}
          </nav>
        </aside>

        {/* Основная скролл-лента */}
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
      </div>
    </motion.div>
  )
}
