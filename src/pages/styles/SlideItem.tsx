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

const smoothEase: [number, number, number, number] = [0.25, 1, 0.5, 1]

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
      if (forceLike && currentLiked) return
      if (isLikeInFlightRef.current) return

      const next = forceLike ? true : !currentLiked
      isLikedRef.current = next
      setIsLiked(next)
      setLikesCount((c) => (next ? c + 1 : Math.max(0, c - 1)))

      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred(next ? 'medium' : 'light')
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
      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged()
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
        if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged()
      }, 220)
    }
  }

  const handleShare = async () => {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light')

    const title = slide.title[lang].replace('\n', ' ')
    const text =
      lang === 'de'
        ? `Sieh dir diesen Stil an: ${title} in der Cordwainer Enzyklopädie!`
        : lang === 'ru'
          ? `Смотри, какой фасон: ${title} в энциклопедии Cordwainer!`
          : `Дивись, який фасон: ${title} в енциклопедії Cordwainer!`

    const url = 'https://www.cordwaine.app'

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
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light')
    setIsDescOpen((v) => !v)
  }

  return (
    <div className="relative h-full w-full flex-shrink-0 snap-start snap-always overflow-hidden bg-[#050505]">
      {!isVideoLoaded && (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-gradient-to-b from-[#0d0d0d] via-[#151412] to-[#080808] animate-pulse">
          <div className="flex flex-col items-center gap-2 opacity-40">
            <div className="w-5 h-5 rounded-full border border-white/40 border-t-white animate-spin" />
            <span className="text-[8px] font-sans uppercase tracking-[0.3em] text-white/70">
              {hasVideoError ? t.videoErrorRetry : t.loadingVideo}
            </span>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-[#050505]">
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
            initial={{ scale: 0.2, opacity: 0, rotate: -12 }}
            animate={{ scale: [0.2, 1.25, 1], opacity: [0, 1, 0], y: -40 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            style={{ left: heartBurst.x - 40, top: heartBurst.y - 40 }}
            className="absolute z-30 pointer-events-none text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
          >
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPaused && isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          >
            <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/25 flex items-center justify-center text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-0 left-0 right-0 h-[34%] bg-gradient-to-b from-black/75 via-black/25 to-transparent z-10 pointer-events-none" />
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t z-10 pointer-events-none transition-all duration-500 ${
          isDescOpen
            ? 'h-[50%] from-black/90 via-black/60 to-transparent'
            : 'h-[22%] from-black/65 via-black/25 to-transparent'
        }`}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 12 }}
        transition={{ duration: 0.7, ease: smoothEase, delay: 0.08 }}
        style={{
          top: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 60px)',
        }}
        className="absolute left-6 right-6 z-20 flex items-start justify-between pointer-events-none"
      >
        <div>
          <p className="text-[9px] font-sans uppercase tracking-[0.38em] text-white/75 mb-1.5 drop-shadow">
            {slide.subtitle[lang]}
          </p>
          <h2 className="font-serif text-3xl min-[390px]:text-4xl leading-[1.06] tracking-tight text-[#F4F0E8] whitespace-pre-line drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
            {slide.title[lang]}
          </h2>
        </div>

        <div className="text-[10px] font-sans tracking-[0.22em] text-white/65 mt-1 tabular-nums drop-shadow">
          <span>{String(index + 1).padStart(2, '0')}</span>
          <span className="text-white/35 mx-1">/</span>
          <span className="text-white/40">{String(totalCount).padStart(2, '0')}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 12 }}
        transition={{ duration: 0.7, ease: smoothEase, delay: 0.15 }}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
        }}
        className="absolute left-6 right-6 z-20 flex flex-col pointer-events-none"
      >
        <AnimatePresence>
          {isDescOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.28, ease: smoothEase }}
              onClick={toggleDesc}
              className="pointer-events-auto mb-3 p-4 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/15 shadow-2xl cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] font-sans uppercase tracking-[0.3em] text-white/50">
                  {slide.subtitle[lang]}
                </span>
                <span className="text-[8px] font-sans uppercase tracking-[0.2em] text-white/60">
                  {t.hideDesc} ✕
                </span>
              </div>
              <p className="text-[11px] min-[390px]:text-[12px] font-sans font-light leading-[1.65] text-[#F4F0E8]/95">
                {slide.desc[lang]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full h-px bg-white/20 mb-3" />

        <div className="flex items-center justify-between gap-3 pointer-events-auto">
          <button
            type="button"
            onClick={toggleDesc}
            className="flex-1 min-w-0 text-left group py-0.5 pr-2 active:opacity-70 transition-opacity bg-transparent border-0 cursor-pointer"
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[8px] font-sans uppercase tracking-[0.28em] text-white/65">
                {t.aboutStyle}
              </span>
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-white/30 text-[9px] leading-none text-white/80">
                {isDescOpen ? '−' : '+'}
              </span>
            </div>
            <p className="text-[11px] font-sans font-light text-white/85 truncate">
              {slide.desc[lang]}
            </p>
          </button>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
              className="w-9 h-9 rounded-full border border-white/30 bg-black/35 backdrop-blur-md flex items-center justify-center text-white transition-transform duration-200 active:scale-90 cursor-pointer"
            >
              {isMuted ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
                h-9 px-2.5 min-w-[36px] rounded-full border flex items-center justify-center gap-1.5
                transition-all duration-200 active:scale-90 cursor-pointer
                ${
                  isLiked
                    ? 'border-white bg-white text-black shadow-[0_0_14px_rgba(255,255,255,0.35)]'
                    : 'border-white/30 text-white bg-black/35 backdrop-blur-md'
                }
              `}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {likesCount > 0 && (
                <span className="text-[9px] font-sans tracking-wider tabular-nums">
                  {likesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleShare()}
              aria-label="Поделиться"
              className="w-9 h-9 rounded-full border border-white/30 bg-black/35 backdrop-blur-md flex items-center justify-center text-white transition-transform duration-200 active:scale-90 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

