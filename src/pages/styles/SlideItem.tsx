import { useState, useRef, useEffect, useCallback, useMemo, type MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { hapticSwatch, hapticTap, triggerHaptic } from './haptics'
import { getUiText } from './i18n'
import { getDeviceId, getTelegramWebApp, isRunningInTelegram } from './telegram'
import type { StyleSlide, SupportedLang } from './types'

export type SlideItemProps = {
  slide: StyleSlide
  lang: SupportedLang
  index: number
  totalCount: number
  isActive: boolean
  shouldLoadVideo: boolean
  shouldKeepInMemory: boolean
  isMuted: boolean
  onToggleMute: () => void
  onForceMuteSync: () => void
  onShowToast: (msg: string) => void
  onActiveVideoReady: (index: number) => void
}

const editorialEase: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function SlideItem({
  slide,
  lang,
  index,
  totalCount,
  isActive,
  shouldLoadVideo,
  shouldKeepInMemory,
  isMuted,
  onToggleMute,
  onForceMuteSync,
  onShowToast,
  onActiveVideoReady,
}: SlideItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasFetchedLikesRef = useRef(false)
  const tapTimeoutRef = useRef<number | null>(null)
  const heartBurstTimeoutRef = useRef<number | null>(null)
  const likeAbortRef = useRef<AbortController | null>(null)
  const isLikeInFlightRef = useRef(false)

  const [isLiked, setIsLiked] = useState(false)
  const isLikedRef = useRef(false)
  isLikedRef.current = isLiked

  const [likesCount, setLikesCount] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isDescOpen, setIsDescOpen] = useState(false)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [hasVideoError, setHasVideoError] = useState(false)
  const [heartBurst, setHeartBurst] = useState<{ id: number; x: number; y: number } | null>(null)

  const userId = getDeviceId()
  const tg = getTelegramWebApp()
  const t = useMemo(() => getUiText(lang, totalCount), [lang, totalCount])

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current !== null) {
        window.clearTimeout(tapTimeoutRef.current)
        tapTimeoutRef.current = null
      }
      if (heartBurstTimeoutRef.current !== null) {
        window.clearTimeout(heartBurstTimeoutRef.current)
        heartBurstTimeoutRef.current = null
      }
      likeAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.muted = isMuted
    }
  }, [isMuted])

  useEffect(() => {
    if (!shouldLoadVideo || hasFetchedLikesRef.current) return
    const controller = new AbortController()

    const timer = window.setTimeout(async () => {
      try {
        const rawInitData = tg?.initData || ''
        const res = await fetch(
          `/api/like?style_id=${encodeURIComponent(slide.id)}&user_id=${encodeURIComponent(userId)}`,
          {
            signal: controller.signal,
            headers: rawInitData ? { 'X-Telegram-Init-Data': rawInitData } : undefined,
          }
        )
        if (res.ok && !controller.signal.aborted) {
          const data = (await res.json()) as { total?: number; isLiked?: boolean }
          setLikesCount(Math.max(0, Number(data.total) || 0))
          setIsLiked(Boolean(data.isLiked))
          hasFetchedLikesRef.current = true
        }
      } catch {}
    }, isActive ? 350 : 800)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [slide.id, userId, shouldLoadVideo, isActive, tg?.initData])

  const syncAndPlayActiveVideo = useCallback(() => {
    const video = videoRef.current
    if (!video || !isActive) return
    if (video.readyState >= 2) {
      setIsVideoLoaded(true)
      onActiveVideoReady(index)
    }
    setIsPaused(false)
    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        video.muted = true
        onForceMuteSync()
        video.play().catch(() => {})
      })
    }
  }, [isActive, index, onActiveVideoReady, onForceMuteSync])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !slide.video) return

    const targetSrc = slide.poster ? slide.video : `${slide.video}#t=0.001`

    if (shouldLoadVideo) {
      if (video.getAttribute('src') !== targetSrc) {
        setIsVideoLoaded(false)
        setHasVideoError(false)
        video.setAttribute('src', targetSrc)
        video.preload = isActive ? 'auto' : 'metadata'
        video.load()
        if (isActive) {
          syncAndPlayActiveVideo()
        }
      } else {
        if (isActive && video.preload !== 'auto') {
          video.preload = 'auto'
        }
        if (isActive && video.readyState >= 2) {
          setIsVideoLoaded(true)
          onActiveVideoReady(index)
        }
      }
    } else if (!shouldKeepInMemory) {
      if (video.getAttribute('src')) {
        video.pause()
        video.removeAttribute('src')
        video.load()
        setIsVideoLoaded(false)
        setHasVideoError(false)
      }
    }
  }, [
    shouldLoadVideo,
    shouldKeepInMemory,
    isActive,
    slide.video,
    slide.poster,
    index,
    onActiveVideoReady,
    syncAndPlayActiveVideo,
  ])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isActive) {
      if (video.getAttribute('src')) {
        syncAndPlayActiveVideo()
      }
    } else {
      video.pause()
      if (video.readyState >= 1) {
        try {
          video.currentTime = 0.001
        } catch {}
      }
      setIsPaused(false)
      setIsDescOpen(false)
    }
  }, [isActive, syncAndPlayActiveVideo])

  useEffect(() => {
    if (isActive && isVideoLoaded) {
      onActiveVideoReady(index)
    }
  }, [isActive, isVideoLoaded, index, onActiveVideoReady])

  useEffect(() => {
    if (!shouldLoadVideo) return
    const handleOnline = () => {
      const video = videoRef.current
      if (!video || !slide.video) return
      if (
        hasVideoError ||
        (!isVideoLoaded && video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE)
      ) {
        setHasVideoError(false)
        const targetSrc = slide.poster ? slide.video : `${slide.video}#t=0.001`
        video.setAttribute('src', targetSrc)
        video.load()
        if (isActive) syncAndPlayActiveVideo()
      }
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [
    shouldLoadVideo,
    hasVideoError,
    isVideoLoaded,
    isActive,
    slide.video,
    slide.poster,
    syncAndPlayActiveVideo,
  ])

  const handleVideoReady = () => {
    setHasVideoError(false)
    setIsVideoLoaded(true)
    if (isActive) {
      onActiveVideoReady(index)
    }
  }

  const handleVideoError = () => {
    setHasVideoError(true)
    if (isActive) {
      onActiveVideoReady(index)
    }
  }

  const triggerLikeRequest = useCallback(
    async (forceLike = false) => {
      const currentLiked = isLikedRef.current
      if (forceLike && currentLiked) {
        hapticSwatch()
        return
      }
      if (isLikeInFlightRef.current) return

      const next = forceLike ? true : !currentLiked
      isLikedRef.current = next
      setIsLiked(next)
      setLikesCount((c) => (next ? c + 1 : Math.max(0, c - 1)))

      if (next) {
        triggerHaptic('medium')
      } else {
        hapticSwatch()
      }

      isLikeInFlightRef.current = true
      likeAbortRef.current?.abort()
      const controller = new AbortController()
      likeAbortRef.current = controller

      try {
        const rawInitData = tg?.initData || ''
        const res = await fetch(
          `/api/like?style_id=${encodeURIComponent(slide.id)}&user_id=${encodeURIComponent(userId)}`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              ...(rawInitData ? { 'X-Telegram-Init-Data': rawInitData } : {}),
            },
            body: JSON.stringify({
              action: next ? 'like' : 'unlike',
              initData: rawInitData,
            }),
          }
        )
        if (!res.ok) throw new Error('Like failed')
        const data = (await res.json().catch(() => null)) as {
          total?: number
          isLiked?: boolean
        } | null
        if (data && typeof data.total === 'number') {
          setLikesCount(Math.max(0, data.total))
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        isLikedRef.current = !next
        setIsLiked(!next)
        setLikesCount((c) => (next ? Math.max(0, c - 1) : c + 1))
      } finally {
        isLikeInFlightRef.current = false
      }
    },
    [slide.id, tg, userId]
  )

  const handleVideoTap = (e: MouseEvent<HTMLDivElement>) => {
    if (isDescOpen) {
      setIsDescOpen(false)
      hapticSwatch()
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (tapTimeoutRef.current !== null) {
      window.clearTimeout(tapTimeoutRef.current)
      tapTimeoutRef.current = null

      setHeartBurst({ id: Date.now(), x, y })
      void triggerLikeRequest(true)
      if (heartBurstTimeoutRef.current !== null) {
        window.clearTimeout(heartBurstTimeoutRef.current)
      }
      heartBurstTimeoutRef.current = window.setTimeout(() => {
        setHeartBurst(null)
        heartBurstTimeoutRef.current = null
      }, 850)
    } else {
      tapTimeoutRef.current = window.setTimeout(() => {
        tapTimeoutRef.current = null
        const video = videoRef.current
        if (!video) return

        if (video.paused) {
          video.play().catch(() => {})
          setIsPaused(false)
        } else {
          video.pause()
          setIsPaused(true)
        }
        hapticSwatch()
      }, 220)
    }
  }

  const handleShare = async () => {
    hapticTap()

    const title = slide.title[lang].replace('\n', ' ')
    const text =
      lang === 'de'
        ? `Sieh dir diesen Stil an: ${title} in der Cordwainer Enzyklopädie!`
        : lang === 'ru'
          ? `Смотри, какой фасон: ${title} в энциклопедии Cordwainer!`
          : `Дивись, який фасон: ${title} в енциклопедії Cordwainer!`

    const url = `https://www.cordwaine.app/?style=${encodeURIComponent(slide.id)}`

    try {
      if (isRunningInTelegram() && tg?.openTelegramLink) {
        tg.openTelegramLink(
          `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
        )
        return
      }
      if (navigator.share) {
        await navigator.share({ title: 'Cordwainer', text, url })
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        onShowToast(t.copied)
      }
    } catch {}
  }

  const toggleDesc = () => {
    hapticTap()
    setIsDescOpen((v) => !v)
  }

  const actionButtons = (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
        className="w-10 h-10 rounded-full border border-[#F4F0E8]/12 bg-[#0B0B0A]/45 backdrop-blur-md flex items-center justify-center text-[#F4F0E8]/95 hover:border-[#C9A97E]/50 hover:bg-[#0B0B0A]/65 active:scale-95 transition-all cursor-pointer"
      >
        {isMuted ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        )}
      </button>

      <button
        type="button"
        onClick={() => void triggerLikeRequest(false)}
        aria-label="Нравится"
        className={`
          h-10 min-w-[40px] rounded-full border backdrop-blur-md flex items-center justify-center gap-1.5
          active:scale-95 transition-all cursor-pointer
          ${likesCount > 0 ? 'px-3.5' : 'px-0 w-10'}
          ${
            isLiked
              ? 'border-[#C9A97E] bg-[#C9A97E] text-[#0B0B0A]'
              : 'border-[#F4F0E8]/12 bg-[#0B0B0A]/45 text-[#F4F0E8]/95 hover:border-[#C9A97E]/50 hover:bg-[#0B0B0A]/65'
          }
        `}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill={isLiked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {likesCount > 0 && (
          <span className="text-xs font-medium tabular-nums">
            {likesCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => void handleShare()}
        aria-label="Поделиться"
        className="w-10 h-10 rounded-full border border-[#F4F0E8]/12 bg-[#0B0B0A]/45 backdrop-blur-md flex items-center justify-center text-[#F4F0E8]/95 hover:border-[#C9A97E]/50 hover:bg-[#0B0B0A]/65 active:scale-95 transition-all cursor-pointer"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </button>
    </div>
  )

  return (
    <div className="relative h-full w-full flex-shrink-0 snap-start snap-always bg-[#0B0B0A] md:flex md:items-center md:justify-center md:px-8 md:pt-20 md:pb-8">
      <div className="relative h-full w-full md:h-auto md:max-h-[calc(100vh-112px)] md:max-w-[920px] md:grid md:grid-cols-[minmax(280px,390px)_1fr] md:gap-10 md:items-center">
        <div className="relative h-full w-full md:h-[min(78vh,740px)] md:aspect-[9/16] md:mx-auto md:rounded-[12px] md:border md:border-[#F4F0E8]/12 overflow-hidden bg-[#141312]">
          {!isVideoLoaded && (
            <div className="absolute inset-0 z-0 flex items-center justify-center bg-[#141312]">
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-5 h-5 rounded-full border border-[#C9A97E]/40 border-t-[#C9A97E] animate-spin" />
                <span className="text-xs tracking-[0.08em] uppercase text-[#A39E93]">
                  {hasVideoError ? t.videoErrorRetry : t.loadingVideo}
                </span>
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-[#141312]">
            {slide.video ? (
              <video
                ref={videoRef}
                preload="none"
                loop
                playsInline
                webkit-playsinline="true"
                muted={isMuted}
                poster={slide.poster}
                onLoadedData={handleVideoReady}
                onCanPlay={handleVideoReady}
                onPlaying={handleVideoReady}
                onError={handleVideoError}
                className={`
                  w-full h-full object-cover
                  transition-opacity duration-300 ease-out
                  ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}
                  ${slide.hideWatermark ? 'scale-[1.08]' : ''}
                `}
              />
            ) : slide.image ? (
              <img
                src={slide.image}
                alt={slide.title[lang]}
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>

          <div
            onClick={handleVideoTap}
            className="absolute inset-0 z-10 cursor-pointer select-none"
          />

          <AnimatePresence>
            {heartBurst && (
              <motion.div
                key={heartBurst.id}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: [0.3, 1.15, 1], opacity: [0, 1, 0], y: -32 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, ease: editorialEase }}
                style={{ left: heartBurst.x - 36, top: heartBurst.y - 36 }}
                className="absolute z-30 pointer-events-none text-[#C9A97E]"
              >
                <svg width="72" height="72" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isPaused && isActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
              >
                <div className="w-12 h-12 rounded-full bg-[#0B0B0A]/65 backdrop-blur-md border border-[#F4F0E8]/20 flex items-center justify-center text-[#F4F0E8]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="md:hidden absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-[#0B0B0A]/80 via-[#0B0B0A]/35 to-transparent z-10 pointer-events-none" />
          <div
            className={`md:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t z-10 pointer-events-none transition-all duration-300 ${
              isDescOpen
                ? 'h-[48%] from-[#0B0B0A]/95 via-[#0B0B0A]/75 to-transparent'
                : 'h-[26%] from-[#0B0B0A]/85 via-[#0B0B0A]/35 to-transparent'
            }`}
          />

          {/* Заголовок и счётчик */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 10 }}
            transition={{ duration: 0.45, ease: editorialEase }}
            style={{
              top: 'calc(max(env(safe-area-inset-top, 0px), 14px) + 74px)',
            }}
            className="md:hidden absolute left-5 right-5 z-20 flex items-start justify-between gap-4 pointer-events-none"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#C9A97E] mb-1.5">
                {slide.subtitle[lang]}
              </p>
              <h2 className="font-serif text-4xl leading-[1.05] tracking-[-0.02em] text-[#F4F0E8] whitespace-pre-line">
                {slide.title[lang]}
              </h2>
            </div>

            <div className="text-xs tracking-[0.06em] text-[#A39E93] pt-1 tabular-nums shrink-0">
              <span className="text-[#F4F0E8] font-medium">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="mx-1">/</span>
              <span>{String(totalCount).padStart(2, '0')}</span>
            </div>
          </motion.div>

          {/* Нижняя стеклянная панель */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 10 }}
            transition={{ duration: 0.45, ease: editorialEase, delay: 0.06 }}
            style={{
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)',
            }}
            className="md:hidden absolute left-5 right-5 z-20 flex flex-col pointer-events-none"
          >
            <AnimatePresence>
              {isDescOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.22, ease: editorialEase }}
                  onClick={toggleDesc}
                  className="pointer-events-auto mb-2.5 p-4 rounded-2xl bg-[#0B0B0A]/80 backdrop-blur-xl border border-[#F4F0E8]/12 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-[0.1em] text-[#C9A97E]">
                      {slide.subtitle[lang]}
                    </span>
                    <span className="text-xs text-[#A39E93]">
                      {t.hideDesc} ✕
                    </span>
                  </div>
                  <p className="text-sm font-normal leading-[1.6] text-[#F4F0E8]/95">
                    {slide.desc[lang]}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between gap-2.5 pointer-events-auto">
              <button
                type="button"
                onClick={toggleDesc}
                className="flex-1 min-w-0 h-10 px-4 rounded-full bg-[#0B0B0A]/45 backdrop-blur-md border border-[#F4F0E8]/12 hover:border-[#C9A97E]/45 hover:bg-[#0B0B0A]/65 flex items-center justify-between gap-2.5 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="text-[11px] uppercase tracking-[0.1em] text-[#F4F0E8]/95 font-medium truncate">
                  {t.aboutStyle}
                </span>
                <span className="text-sm text-[#C9A97E] font-light leading-none shrink-0">
                  {isDescOpen ? '−' : '+'}
                </span>
              </button>

              {actionButtons}
            </div>
          </motion.div>
        </div>

        <div className="hidden md:flex md:flex-col md:justify-between md:h-[min(78vh,740px)] md:py-4 md:pr-2">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#F4F0E8]/12 mb-6">
              <span className="text-xs uppercase tracking-[0.1em] text-[#C9A97E]">
                {slide.subtitle[lang]}
              </span>
              <span className="text-xs tracking-[0.06em] text-[#A39E93] tabular-nums">
                <span className="text-[#F4F0E8] font-medium">
                  {String(index + 1).padStart(2, '0')}
                </span>{' '}
                / {String(totalCount).padStart(2, '0')}
              </span>
            </div>

            <h2 className="font-serif text-5xl xl:text-6xl leading-[1.03] tracking-[-0.02em] text-[#F4F0E8] whitespace-pre-line mb-6">
              {slide.title[lang]}
            </h2>

            <p className="text-[15px] leading-[1.65] text-[#F4F0E8]/85 max-w-[46ch]">
              {slide.desc[lang]}
            </p>
          </div>

          <div className="pt-6 border-t border-[#F4F0E8]/12 flex items-center justify-between gap-4">
            <span className="text-xs text-[#A39E93]">
              Cordwainer — Lookbook
            </span>
            {actionButtons}
          </div>
        </div>
      </div>
    </div>
  )
}
