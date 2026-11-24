import { useEffect, useState, useRef, type RefObject } from 'react'
import type { ExtendedWindow } from './types'

const HERO_FRAME_CACHE_KEY = 'cordwainer_hero_frame_v2'

let memoryCachedHeroFrame: string | null = null
let sharedHeroVideo: HTMLVideoElement | null = null
let sharedBufferCanvas: HTMLCanvasElement | null = null
let hasValidBufferFrame = false

function getInitialHeroPoster(): string | null {
  if (memoryCachedHeroFrame) return memoryCachedHeroFrame
  try {
    const saved =
      localStorage.getItem(HERO_FRAME_CACHE_KEY) ||
      sessionStorage.getItem(HERO_FRAME_CACHE_KEY)
    if (saved && saved.startsWith('data:image/')) {
      memoryCachedHeroFrame = saved
      return saved
    }
  } catch {
    // Storage unavailable
  }
  return null
}

function getOrCreateSharedVideo(): HTMLVideoElement {
  if (sharedHeroVideo && document.body.contains(sharedHeroVideo)) {
    return sharedHeroVideo
  }
  const videoEl = document.createElement('video')
  videoEl.src = '/Fason/Topsaed.mp4'
  videoEl.muted = true
  videoEl.defaultMuted = true
  videoEl.playsInline = true
  videoEl.loop = true
  videoEl.preload = 'auto'
  videoEl.setAttribute('playsinline', '')
  videoEl.setAttribute('webkit-playsinline', '')
  videoEl.setAttribute('muted', '')

  Object.assign(videoEl.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '48px',
    height: '48px',
    opacity: '0.001',
    pointerEvents: 'none',
    zIndex: '9999',
    transform: 'translateZ(0)',
  })

  document.body.appendChild(videoEl)
  sharedHeroVideo = videoEl
  return videoEl
}

function getOrCreateBufferCanvas(w: number, h: number): HTMLCanvasElement {
  if (!sharedBufferCanvas) {
    sharedBufferCanvas = document.createElement('canvas')
  }
  if (sharedBufferCanvas.width !== w || sharedBufferCanvas.height !== h) {
    sharedBufferCanvas.width = w
    sharedBufferCanvas.height = h
    hasValidBufferFrame = false
  }
  return sharedBufferCanvas
}

export function useHomeTheme(): boolean {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const tg = (window as ExtendedWindow).Telegram?.WebApp
    try {
      tg?.disableVerticalSwipes?.()
    } catch {
      // Ignore outside Telegram
    }

    const checkTheme = () => {
      const dark = document.documentElement.classList.contains('dark')
      setIsDark(dark)
      try {
        const bgHex = dark ? '#09090B' : '#ECEAE4'
        tg?.setHeaderColor?.(bgHex)
        tg?.setBackgroundColor?.(bgHex)
      } catch {
        // Ignore outside Telegram
      }
    }

    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return isDark
}

export function useScrollReveal(rootRef: RefObject<HTMLDivElement>, active: boolean) {
  useEffect(() => {
    if (!active) return
    const root = rootRef.current
    if (!root) return

    const targets = Array.from(root.querySelectorAll<HTMLElement>('.cw-reveal-block'))
    if (targets.length === 0) return

    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.setAttribute('data-visible', 'true'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-visible', 'true')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' },
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [rootRef, active])
}

export function useHeroVideoCanvas(enabled: boolean, isDark: boolean) {
  const [posterSrc, setPosterSrc] = useState<string | null>(getInitialHeroPoster)
  const [hasCanvasFrame, setHasCanvasFrame] = useState<boolean>(() => hasValidBufferFrame)

  const heroContainerRef = useRef<HTMLDivElement>(null)
  const heroCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!enabled) return

    const containerEl = heroContainerRef.current
    const canvasEl = heroCanvasRef.current
    if (!containerEl || !canvasEl) return

    const videoEl = getOrCreateSharedVideo()
    const displayCtx = canvasEl.getContext('2d', { willReadFrequently: true })
    if (!displayCtx) return

    let rafId = 0
    let isCancelled = false
    let lastDrawnVideoTime = -1
    let hasSavedPoster = Boolean(memoryCachedHeroFrame)

    const syncCanvasSize = () => {
      const cw = canvasEl.clientWidth || containerEl.clientWidth || 360
      const ch = canvasEl.clientHeight || containerEl.clientHeight || 360
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const targetW = Math.max(1, Math.round(cw * dpr))
      const targetH = Math.max(1, Math.round(ch * dpr))
      return { targetW, targetH }
    }

    if (hasValidBufferFrame && sharedBufferCanvas) {
      const { targetW, targetH } = syncCanvasSize()
      if (canvasEl.width !== targetW || canvasEl.height !== targetH) {
        canvasEl.width = targetW
        canvasEl.height = targetH
      }
      displayCtx.drawImage(sharedBufferCanvas, 0, 0, targetW, targetH)
      setHasCanvasFrame(true)
    }

    const ensurePlaying = () => {
      if (isCancelled) return
      videoEl.muted = true
      if (videoEl.paused || videoEl.ended) {
        videoEl.play().catch(() => {})
      }
    }

    const renderLoop = () => {
      if (isCancelled) return

      const { targetW, targetH } = syncCanvasSize()
      const bufCanvas = getOrCreateBufferCanvas(targetW, targetH)
      const bufCtx = bufCanvas.getContext('2d', { willReadFrequently: true })

      const isVideoReady =
        videoEl.readyState >= 2 &&
        videoEl.videoWidth > 0 &&
        videoEl.videoHeight > 0 &&
        !videoEl.seeking

      if (isVideoReady && bufCtx && videoEl.currentTime !== lastDrawnVideoTime) {
        const vw = videoEl.videoWidth
        const vh = videoEl.videoHeight
        const scale = Math.max(targetW / vw, targetH / vh)
        const sw = targetW / scale
        const sh = targetH / scale
        const sx = (vw - sw) * 0.5
        const sy = (vh - sh) * 0.5

        try {
          bufCtx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, targetW, targetH)

          const p1 = bufCtx.getImageData(targetW >> 1, targetH >> 1, 1, 1).data
          const p2 = bufCtx.getImageData(targetW >> 2, targetH >> 2, 1, 1).data
          const p3 = bufCtx.getImageData((targetW * 3) >> 2, (targetH * 2) >> 2, 1, 1).data

          const brightness =
            Math.max(p1[0], p1[1], p1[2]) +
            Math.max(p2[0], p2[1], p2[2]) +
            Math.max(p3[0], p3[1], p3[2])

          if (p1[3] > 200 && brightness > 45) {
            hasValidBufferFrame = true
            lastDrawnVideoTime = videoEl.currentTime

            if (canvasEl.width !== targetW || canvasEl.height !== targetH) {
              canvasEl.width = targetW
              canvasEl.height = targetH
            }
            displayCtx.drawImage(bufCanvas, 0, 0, targetW, targetH)
            setHasCanvasFrame(true)

            if (!hasSavedPoster && videoEl.currentTime > 0.12) {
              hasSavedPoster = true
              try {
                const dataUrl = bufCanvas.toDataURL('image/jpeg', 0.82)
                if (dataUrl && dataUrl.length > 200) {
                  memoryCachedHeroFrame = dataUrl
                  setPosterSrc(dataUrl)
                  try {
                    localStorage.setItem(HERO_FRAME_CACHE_KEY, dataUrl)
                  } catch {
                    // Ignore quota error
                  }
                  try {
                    sessionStorage.setItem(HERO_FRAME_CACHE_KEY, dataUrl)
                  } catch {
                    // Ignore quota error
                  }
                }
              } catch {
                // Ignore tainted canvas
              }
            }
          }
        } catch {
          // Ignore transient decode error
        }
      } else if (hasValidBufferFrame && sharedBufferCanvas) {
        if (canvasEl.width !== targetW || canvasEl.height !== targetH) {
          canvasEl.width = targetW
          canvasEl.height = targetH
          displayCtx.drawImage(sharedBufferCanvas, 0, 0, targetW, targetH)
        }
      }

      rafId = window.requestAnimationFrame(renderLoop)
    }

    ensurePlaying()
    rafId = window.requestAnimationFrame(renderLoop)

    const keepAliveId = window.setInterval(ensurePlaying, 600)

    const onScrollOrTouch = () => {
      ensurePlaying()
      if (hasValidBufferFrame && sharedBufferCanvas && canvasEl) {
        const { targetW, targetH } = syncCanvasSize()
        if (canvasEl.width !== targetW || canvasEl.height !== targetH) {
          canvasEl.width = targetW
          canvasEl.height = targetH
        }
        displayCtx.drawImage(sharedBufferCanvas, 0, 0, targetW, targetH)
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        ensurePlaying()
      }
    }

    window.addEventListener('scroll', onScrollOrTouch, { passive: true })
    window.addEventListener('touchstart', onScrollOrTouch, { passive: true })
    window.addEventListener('touchend', onScrollOrTouch, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      isCancelled = true
      window.cancelAnimationFrame(rafId)
      window.clearInterval(keepAliveId)
      window.removeEventListener('scroll', onScrollOrTouch)
      window.removeEventListener('touchstart', onScrollOrTouch)
      window.removeEventListener('touchend', onScrollOrTouch)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, isDark])

  return { heroContainerRef, heroCanvasRef, posterSrc, hasCanvasFrame }
}

export function useTransparentLogo(src: string): string {
  const [processedSrc, setProcessedSrc] = useState<string>(src)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      if (cancelled) return
      try {
        const w = img.naturalWidth
        const h = img.naturalHeight
        if (!w || !h) return

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(img, 0, 0)
        const imgData = ctx.getImageData(0, 0, w, h)
        const data = imgData.data
        const total = w * h

        const isBg = new Uint8Array(total)
        const queue = new Int32Array(total)
        let head = 0
        let tail = 0

        const isWhiteLike = (idx: number) => {
          const p = idx * 4
          if (data[p + 3] < 20) return true
          const r = data[p]
          const g = data[p + 1]
          const b = data[p + 2]
          const minC = Math.min(r, g, b)
          const maxC = Math.max(r, g, b)
          return minC >= 224 && maxC - minC <= 28
        }

        const pushIfBg = (x: number, y: number) => {
          const idx = y * w + x
          if (!isBg[idx] && isWhiteLike(idx)) {
            isBg[idx] = 1
            queue[tail++] = idx
          }
        }

        for (let x = 0; x < w; x++) {
          pushIfBg(x, 0)
          pushIfBg(x, h - 1)
        }
        for (let y = 0; y < h; y++) {
          pushIfBg(0, y)
          pushIfBg(w - 1, y)
        }

        while (head < tail) {
          const curr = queue[head++]
          const cx = curr % w
          const cy = (curr - cx) / w

          if (cx > 0) pushIfBg(cx - 1, cy)
          if (cx < w - 1) pushIfBg(cx + 1, cy)
          if (cy > 0) pushIfBg(cx, cy - 1)
          if (cy < h - 1) pushIfBg(cx, cy + 1)
        }

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x
            const p = idx * 4
            if (isBg[idx]) {
              data[p + 3] = 0
              continue
            }

            let nearBg = false
            for (let dy = -2; dy <= 2 && !nearBg; dy++) {
              const ny = y + dy
              if (ny < 0 || ny >= h) continue
              for (let dx = -2; dx <= 2; dx++) {
                const nx = x + dx
                if (nx < 0 || nx >= w) continue
                if (isBg[ny * w + nx]) {
                  nearBg = true
                  break
                }
              }
            }

            if (nearBg) {
              const r = data[p]
              const g = data[p + 1]
              const b = data[p + 2]
              const minC = Math.min(r, g, b)
              const maxC = Math.max(r, g, b)
              if (minC > 165 && maxC - minC < 35) {
                const alphaRatio = Math.max(0, Math.min(1, (240 - minC) / 75))
                data[p + 3] = Math.round(data[p + 3] * alphaRatio)
                if (alphaRatio > 0.05) {
                  data[p] = Math.max(
                    0,
                    Math.min(255, Math.round((r - 255 * (1 - alphaRatio)) / alphaRatio)),
                  )
                  data[p + 1] = Math.max(
                    0,
                    Math.min(255, Math.round((g - 255 * (1 - alphaRatio)) / alphaRatio)),
                  )
                  data[p + 2] = Math.max(
                    0,
                    Math.min(255, Math.round((b - 255 * (1 - alphaRatio)) / alphaRatio)),
                  )
                }
              }
            }
          }
        }

        let minX = w
        let minY = h
        let maxX = 0
        let maxY = 0
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 20) {
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }
          }
        }

        ctx.putImageData(imgData, 0, 0)

        if (maxX > minX && maxY > minY) {
          const pad = Math.round(Math.max(w, h) * 0.025)
          const sx = Math.max(0, minX - pad)
          const sy = Math.max(0, minY - pad)
          const sw = Math.min(w - sx, maxX - minX + 1 + pad * 2)
          const sh = Math.min(h - sy, maxY - minY + 1 + pad * 2)

          const cropped = document.createElement('canvas')
          cropped.width = sw
          cropped.height = sh
          const cCtx = cropped.getContext('2d')
          if (cCtx) {
            cCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)
            setProcessedSrc(cropped.toDataURL('image/png'))
            return
          }
        }

        setProcessedSrc(canvas.toDataURL('image/png'))
      } catch {
        // Fallback to original image
      }
    }

    img.src = src
    return () => {
      cancelled = true
    }
  }, [src])

  return processedSrc
}
