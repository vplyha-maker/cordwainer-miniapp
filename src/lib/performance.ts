const STORAGE_KEY = 'cordwainer_perf_mode'

export type PerfMode = 'auto' | 'full' | 'fast'

export function getSavedPerfMode(): PerfMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'full' || v === 'fast' || v === 'auto') return v
  } catch {}
  return 'auto'
}

export function savePerfMode(mode: PerfMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {}
}

/** Эвристика устройства (без FPS) */
export function guessLowPowerDevice(): boolean {
  if (typeof navigator === 'undefined') return false

  // Пользователь просит меньше анимаций
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return true
  }

  const ua = navigator.userAgent || ''
  const isAndroid = /Android/i.test(ua)

  // Мало ядер / мало памяти — частый признак слабого Android
  const cores = navigator.hardwareConcurrency || 4
  const memory = (navigator as any).deviceMemory as number | undefined

  if (isAndroid && cores <= 6) return true
  if (memory !== undefined && memory <= 4) return true

  return false
}

/**
 * Замеряет FPS \~1.2 сек.
 * Возвращает true, если нужно упростить эффекты.
 */
export function measureShouldUseFastMode(durationMs = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'undefined') {
      resolve(guessLowPowerDevice())
      return
    }

    let frames = 0
    const start = performance.now()

    const tick = (now: number) => {
      frames++
      if (now - start < durationMs) {
        requestAnimationFrame(tick)
      } else {
        const fps = (frames * 1000) / (now - start)
        // Ниже \~48 FPS на старте — уже неприятно
        resolve(fps < 48 || guessLowPowerDevice())
      }
    }

    requestAnimationFrame(tick)
  })
}

export function applyPerfMode(mode: 'full' | 'fast') {
  const root = document.documentElement
  root.classList.toggle('perf-fast', mode === 'fast')
  root.classList.toggle('perf-full', mode === 'full')
    }
