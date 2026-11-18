import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Lang, FavoriteItem } from '../App'

type WelcomePageProps = {
  onStart?: () => void
  onOpenMaterials?: () => void
  onOpenStyles?: () => void
  onOpenCalc?: () => void
  lang: Lang
  setLang: (lang: Lang) => void
  favorites?: FavoriteItem[]
  onChangeTab?: (tab: 'search' | 'settings' | 'profile') => void
}

type TgHaptic = {
  impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  notificationOccurred?: (type: 'error' | 'success' | 'warning') => void
  selectionChanged?: () => void
}

type TgWebApp = {
  initDataUnsafe?: { user?: { first_name?: string } }
  HapticFeedback?: TgHaptic
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  expand?: () => void
}

type ExtendedWindow = Window & {
  Telegram?: { WebApp?: TgWebApp }
  TelegramWebviewProxy?: {
    postEvent?: (eventType: string, eventData: string) => void
  }
  webkitAudioContext?: typeof AudioContext
}

function getWin(): ExtendedWindow {
  return window as unknown as ExtendedWindow
}

// ---------------------------------------------------------------------------
// 0. MOLLANI CALLIGRAPHIC SCRIPT FONT LOADER & BRAND WORDMARK CONFIG
// ---------------------------------------------------------------------------
const BRAND_WORDMARK = 'Cordwaine'
const MOLLANI_FONT_URL =
  'https://cdn.jsdelivr.net/gh/baechu-rpg/fonts@f3f7b6e3d8eec01179149bbcdfb30ec3deb5af15/Mollani-Regular.ttf'

let mollaniFontReady = false
let mollaniLoadPromise: Promise<boolean> | null = null

function ensureMollaniFont(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(false)
  }
  if (mollaniFontReady) return Promise.resolve(true)
  if (mollaniLoadPromise) return mollaniLoadPromise

  mollaniLoadPromise = (async () => {
    try {
      if (typeof FontFace !== 'undefined') {
        const face = new FontFace('Mollani', `url(${MOLLANI_FONT_URL}) format('truetype')`, {
          weight: 'normal',
          style: 'normal',
          display: 'swap',
        })
        const loaded = await face.load()
        document.fonts.add(loaded)
        mollaniFontReady = true
        return true
      }
      if (document.fonts && typeof document.fonts.load === 'function') {
        await document.fonts.load('64px "Mollani"')
        mollaniFontReady = document.fonts.check('64px "Mollani"')
        return mollaniFontReady
      }
    } catch {
      mollaniFontReady = false
    }
    return false
  })()

  return mollaniLoadPromise
}

void ensureMollaniFont()

// ---------------------------------------------------------------------------
// 1. VECTOR ORNAMENTS (Crown "the", Diamond Rules, Bespoke Under-Swash)
// ---------------------------------------------------------------------------
const THE_ITALIC_PATH_D =
  'M-12.82 -16.84Q-15.27 -16.84 -15.27 -19.47Q-15.27 -19.88 -15.20 -20.40Q-15.13 -20.93 -15.04 -21.36L-13.45 -28.90L-15.15 -28.90L-15.11 -29.12Q-13.87 -29.12 -13.11 -29.39Q-12.34 -29.66 -11.85 -30.27Q-11.35 -30.88 -10.92 -31.89L-10.70 -31.89L-11.29 -29.12L-8.56 -29.12L-8.61 -28.90L-11.33 -28.90L-12.93 -21.43Q-13.04 -20.87 -13.12 -20.36Q-13.20 -19.85 -13.20 -19.49Q-13.20 -18.48 -12.79 -18.04Q-12.39 -17.60 -11.65 -17.60Q-11.22 -17.60 -10.73 -17.75Q-10.25 -17.90 -9.89 -18.12L-9.78 -17.92Q-10.45 -17.45 -11.21 -17.14Q-11.96 -16.84 -12.82 -16.84ZM1.58 -16.84Q0.60 -16.84 0.06 -17.48Q-0.46 -18.12 -0.46 -19.09Q-0.46 -20.12 -0.03 -22.12L0.35 -23.88Q0.46 -24.33 0.64 -25.18Q0.82 -26.04 0.82 -26.83Q0.82 -27.23 0.73 -27.67Q0.64 -28.11 0.38 -28.41Q0.12 -28.72 -0.40 -28.72Q-1.03 -28.72 -1.64 -28.27Q-2.26 -27.82 -2.78 -27.14Q-3.30 -26.47 -3.65 -25.74Q-4.00 -25.00 -4.11 -24.47L-5.68 -17.06L-7.78 -17.06L-4.69 -31.69Q-4.58 -32.14 -4.54 -32.46Q-4.49 -32.79 -4.49 -32.88Q-4.49 -33.55 -4.95 -33.74Q-5.41 -33.94 -6.07 -33.94L-6.25 -33.94L-6.20 -34.16L-2.06 -34.16L-2.94 -30.02Q-3.18 -28.83 -3.44 -27.77Q-3.70 -26.72 -3.82 -26.29L-3.73 -26.29Q-2.78 -27.77 -1.76 -28.55Q-0.73 -29.33 0.57 -29.33Q1.90 -29.33 2.44 -28.57Q2.98 -27.82 2.98 -26.83Q2.98 -26.27 2.83 -25.60Q2.69 -24.94 2.57 -24.35L1.99 -21.70Q1.85 -21.07 1.77 -20.46Q1.70 -19.85 1.70 -19.33Q1.70 -17.67 2.87 -17.67Q3.38 -17.67 4.20 -18.30L4.33 -18.12Q3.79 -17.67 3.13 -17.25Q2.46 -16.84 1.58 -16.84ZM9.95 -16.84Q8.76 -16.84 7.76 -17.35Q6.76 -17.87 6.16 -18.89Q5.57 -19.92 5.57 -21.50Q5.57 -22.75 5.99 -24.11Q6.42 -25.48 7.28 -26.67Q8.13 -27.86 9.38 -28.60Q10.63 -29.35 12.27 -29.35Q13.69 -29.35 14.48 -28.66Q15.27 -27.98 15.27 -26.76Q15.27 -25.68 14.42 -24.74Q13.58 -23.81 12.12 -23.23Q10.65 -22.64 8.81 -22.64L8.02 -22.64Q7.91 -21.97 7.91 -21.32Q7.91 -19.29 8.48 -18.18Q9.05 -17.06 10.16 -17.06Q11.44 -17.06 12.20 -17.85Q12.97 -18.64 13.37 -19.88Q13.85 -19.74 13.85 -19.20Q13.85 -18.77 13.43 -18.21Q13.02 -17.65 12.16 -17.24Q11.30 -16.84 9.95 -16.84ZM8.67 -22.87Q10.67 -22.87 11.81 -23.97Q12.95 -25.07 12.95 -26.92Q12.95 -29.10 11.73 -29.10Q11.06 -29.10 10.47 -28.55Q9.89 -28.00 9.41 -27.08Q8.94 -26.15 8.60 -25.05Q8.27 -23.95 8.07 -22.87L8.67 -22.87Z'

const DIAMOND_RULES_PATH_D =
  'M-92.00 -24.85L-25.80 -24.85L-24.00 -26.55L-22.20 -24.85L-22.20 -24.15L-24.00 -22.45L-25.80 -24.15L-92.00 -24.15ZM92.00 -24.85L25.80 -24.85L24.00 -26.55L22.20 -24.85L22.20 -24.15L24.00 -22.45L25.80 -24.15L92.00 -24.15Z'

const RIGHT_UNDER_SWASH_PATH_D =
  'M-44.0 21.5Q-12.0 25.8 34.0 23.6Q78.0 21.4 116.0 16.8Q78.0 19.8 34.0 21.4Q-12.0 23.2 -44.0 21.5Z'

type CompiledPaths = {
  thePath: Path2D
  rulesPath: Path2D
  swashPath: Path2D
}

let cachedPaths: CompiledPaths | null = null
function getCompiledPaths(): CompiledPaths | null {
  if (typeof Path2D === 'undefined') return null
  if (cachedPaths) return cachedPaths
  cachedPaths = {
    thePath: new Path2D(THE_ITALIC_PATH_D),
    rulesPath: new Path2D(DIAMOND_RULES_PATH_D),
    swashPath: new Path2D(RIGHT_UNDER_SWASH_PATH_D),
  }
  return cachedPaths
}

// ---------------------------------------------------------------------------
// 2. PROCEDURAL BESPOKE ATELIER SOUND ENGINE + HIGH-GAIN MASTER COMPRESSOR
// ---------------------------------------------------------------------------
class SoundEngine {
  private ctx: AudioContext | null = null
  private masterOut: AudioNode | null = null
  public enabled = true

  constructor() {
    try {
      const saved = localStorage.getItem('cordwainer_sound')
      if (saved === '0') this.enabled = false
    } catch {}
  }

  public toggle(): boolean {
    this.enabled = !this.enabled
    try {
      localStorage.setItem('cordwainer_sound', this.enabled ? '1' : '0')
    } catch {}
    if (this.enabled) {
      this.unlock()
      this.softTick(1.1)
    }
    return this.enabled
  }

  public getContext(): AudioContext | null {
    try {
      const AudioCtx = window.AudioContext || getWin().webkitAudioContext
      if (!AudioCtx) return null
      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioCtx()
        this.setupMasterChain(this.ctx)
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {})
      }
      return this.ctx
    } catch {
      return null
    }
  }

  private setupMasterChain(c: AudioContext): void {
    try {
      const comp = c.createDynamicsCompressor()
      comp.threshold.setValueAtTime(-18, c.currentTime)
      comp.knee.setValueAtTime(10, c.currentTime)
      comp.ratio.setValueAtTime(4.0, c.currentTime)
      comp.attack.setValueAtTime(0.003, c.currentTime)
      comp.release.setValueAtTime(0.18, c.currentTime)

      const makeup = c.createGain()
      makeup.gain.setValueAtTime(1.75, c.currentTime)

      comp.connect(makeup)
      makeup.connect(c.destination)
      this.masterOut = comp
    } catch {
      this.masterOut = c.destination
    }
  }

  public getDestination(): AudioNode | null {
    const c = this.getContext()
    if (!c) return null
    return this.masterOut || c.destination
  }

  public unlock(): void {
    this.getContext()
  }

  public linenWhisper(intensity = 1): void {
    if (!this.enabled) return
    const c = this.getContext()
    const dest = this.getDestination()
    if (!c || !dest) return
    try {
      const t0 = c.currentTime
      const dur = 0.095
      const len = Math.floor(c.sampleRate * dur)
      const buf = c.createBuffer(1, len, c.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) {
        const env = Math.sin((i / len) * Math.PI)
        data[i] = (Math.random() * 2 - 1) * env * 0.55
      }
      const src = c.createBufferSource()
      src.buffer = buf

      const filter = c.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(1050 + Math.random() * 260, t0)
      filter.Q.setValueAtTime(2.6, t0)

      const gain = c.createGain()
      const pk = 0.15 * intensity
      gain.gain.setValueAtTime(0.001, t0)
      gain.gain.linearRampToValueAtTime(pk, t0 + 0.018)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

      src.connect(filter)
      filter.connect(gain)
      gain.connect(dest)
      src.start(t0)
      src.stop(t0 + dur + 0.01)
    } catch {}
  }

  public suedeSwell(): void {
    if (!this.enabled) return
    const c = this.getContext()
    const dest = this.getDestination()
    if (!c || !dest) return
    try {
      const t0 = c.currentTime
      const dur = 1.35
      const len = Math.floor(c.sampleRate * dur)
      const buf = c.createBuffer(1, len, c.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) {
        const p = i / len
        const cadence = 0.72 + 0.28 * Math.sin(p * Math.PI * 5.0)
        const env = Math.sin(p * Math.PI) * (1 - p * 0.22) * cadence
        data[i] = (Math.random() * 2 - 1) * env * 0.52
      }
      const src = c.createBufferSource()
      src.buffer = buf

      const filter = c.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(320, t0)
      filter.frequency.exponentialRampToValueAtTime(960, t0 + dur * 0.52)
      filter.frequency.exponentialRampToValueAtTime(240, t0 + dur)

      const gain = c.createGain()
      gain.gain.setValueAtTime(0.001, t0)
      gain.gain.linearRampToValueAtTime(0.18, t0 + dur * 0.45)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

      src.connect(filter)
      filter.connect(gain)
      gain.connect(dest)
      src.start(t0)
      src.stop(t0 + dur + 0.02)
    } catch {}
  }

  public feltChord(): void {
    if (!this.enabled) return
    const c = this.getContext()
    const dest = this.getDestination()
    if (!c || !dest) return
    try {
      const t0 = c.currentTime
      const freqs = [146.83, 220.0, 369.99, 440.0, 659.25]
      const amps = [0.24, 0.19, 0.15, 0.12, 0.09]
      freqs.forEach((f, idx) => {
        const osc = c.createOscillator()
        const filter = c.createBiquadFilter()
        const gain = c.createGain()

        osc.type = idx < 2 ? 'triangle' : 'sine'
        osc.frequency.setValueAtTime(f, t0)

        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(1150 - idx * 90, t0)
        filter.frequency.exponentialRampToValueAtTime(340, t0 + 2.4)

        const onset = t0 + idx * 0.032
        gain.gain.setValueAtTime(0.0001, onset)
        gain.gain.linearRampToValueAtTime(amps[idx], onset + 0.045)
        gain.gain.exponentialRampToValueAtTime(0.0001, onset + 2.5)

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(dest)
        osc.start(onset)
        osc.stop(onset + 2.55)
      })
    } catch {}
  }

  public goldenShimmer(): void {
    if (!this.enabled) return
    const c = this.getContext()
    const dest = this.getDestination()
    if (!c || !dest) return
    try {
      const t0 = c.currentTime
      const notes = [587.33, 739.99, 880.0, 1174.66]
      notes.forEach((freq, idx) => {
        const osc = c.createOscillator()
        const gain = c.createGain()
        osc.type = 'sine'
        const start = t0 + idx * 0.065
        osc.frequency.setValueAtTime(freq, start)

        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.linearRampToValueAtTime(0.16 - idx * 0.025, start + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.95)

        osc.connect(gain)
        gain.connect(dest)
        osc.start(start)
        osc.stop(start + 1.0)
      })
    } catch {}
  }

  public softTick(pitch = 1): void {
    if (!this.enabled) return
    const c = this.getContext()
    const dest = this.getDestination()
    if (!c || !dest) return
    try {
      const t0 = c.currentTime
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(520 * pitch, t0)
      osc.frequency.exponentialRampToValueAtTime(150 * pitch, t0 + 0.028)

      gain.gain.setValueAtTime(0.24, t0)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.028)

      osc.connect(gain)
      gain.connect(dest)
      osc.start(t0)
      osc.stop(t0 + 0.032)
    } catch {}
  }
}

const sound = new SoundEngine()

// ---------------------------------------------------------------------------
// 3. BOOSTED 3-CHANNEL HAPTIC ENGINE (iOS Taptic + Android One UI 7 / Xiaomi HyperOS)
// ---------------------------------------------------------------------------
function haptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  const tgStyle: 'medium' | 'heavy' | 'rigid' =
    style === 'light' ? 'medium' : style === 'medium' ? 'heavy' : 'rigid'

  try {
    const hf = getWin().Telegram?.WebApp?.HapticFeedback
    hf?.impactOccurred?.(tgStyle)
    if (style === 'heavy') {
      hf?.notificationOccurred?.('success')
    }
  } catch {}

  try {
    const post = getWin().TelegramWebviewProxy?.postEvent
    if (post) {
      post(
        'web_app_trigger_haptic_feedback',
        JSON.stringify({ type: 'impact', impact_style: style === 'light' ? 'medium' : 'heavy' })
      )
      if (style !== 'light') {
        setTimeout(() => {
          try {
            post(
              'web_app_trigger_haptic_feedback',
              JSON.stringify({
                type: style === 'heavy' ? 'notification' : 'impact',
                impact_style: 'heavy',
                notification_type: 'success',
              })
            )
          } catch {}
        }, 36)
      }
    }
  } catch {}

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      const pattern =
        style === 'heavy' ? [36, 28, 46] : style === 'medium' ? [26, 24, 20] : [18]
      navigator.vibrate(pattern)
    }
  } catch {}

  try {
    const c = sound.getContext()
    const dest = sound.getDestination()
    if (!c || !dest) return
    const t0 = c.currentTime
    const dur = style === 'heavy' ? 0.055 : style === 'medium' ? 0.042 : 0.028
    const peakGain = style === 'heavy' ? 0.48 : style === 'medium' ? 0.36 : 0.24

    const subOsc = c.createOscillator()
    const clickOsc = c.createOscillator()
    const subGain = c.createGain()
    const clickGain = c.createGain()

    subOsc.type = 'sine'
    subOsc.frequency.setValueAtTime(168, t0)
    subOsc.frequency.exponentialRampToValueAtTime(46, t0 + dur)

    clickOsc.type = 'triangle'
    clickOsc.frequency.setValueAtTime(1950, t0)
    clickOsc.frequency.exponentialRampToValueAtTime(340, t0 + 0.014)

    subGain.gain.setValueAtTime(peakGain, t0)
    subGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

    clickGain.gain.setValueAtTime(peakGain * 0.58, t0)
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.014)

    subOsc.connect(subGain)
    clickOsc.connect(clickGain)
    subGain.connect(dest)
    clickGain.connect(dest)

    subOsc.start(t0)
    clickOsc.start(t0)
    subOsc.stop(t0 + dur + 0.005)
    clickOsc.stop(t0 + 0.018)
  } catch {}
}

// ---------------------------------------------------------------------------
// 4. PRE-BAKED RAY-CAST ALABASTER-PEARL & SMOKED-PEWTER 3D SPOTLIGHT BUFFER
// ---------------------------------------------------------------------------
type PrebakedTextures = {
  bgCanvas: HTMLCanvasElement
  glowCanvas: HTMLCanvasElement
  rayCanvas: HTMLCanvasElement
  nibSparkCanvas: HTMLCanvasElement
}

function createPrebakedTextures(): PrebakedTextures | null {
  if (typeof document === 'undefined') return null

  const bgW = 180
  const bgH = 360
  const bgCanvas = document.createElement('canvas')
  bgCanvas.width = bgW
  bgCanvas.height = bgH
  const bgCtx = bgCanvas.getContext('2d', { alpha: false })
  if (bgCtx) {
    const img = bgCtx.createImageData(bgW, bgH)
    const data = img.data

    const kLx = -0.22, kLy = 0.26, kLz = 0.94
    const rLx = 0.38, rLy = -0.32, rLz = 0.86

    let p = 0
    for (let y = 0; y < bgH; y++) {
      const nyScr = (1.0 - y / (bgH - 1) - 0.52) * 2.0
      const pY = nyScr * 1.0
      for (let x = 0; x < bgW; x++) {
        const nxScr = (x / (bgW - 1) - 0.5) * 2.0
        const pX = nxScr * 0.5

        const u1 = pX * 6.0 + pY * 2.4
        const v1 = pY * 5.2 - pX * 2.8
        const hX = Math.cos(u1) * Math.sin(v1) * 0.12
        const hY = Math.sin(u1) * Math.cos(v1) * 0.12

        const nx = -hX
        const ny = -hY
        const nz = 1.0
        const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz)
        const snx = nx * invLen
        const sny = ny * invLen
        const snz = nz * invLen

        const diffKey = Math.max(snx * kLx + sny * kLy + snz * kLz, 0.0)
        const diffRim = Math.max(snx * rLx + sny * rLy + snz * rLz, 0.0)

        const hx = kLx * 0.5
        const hy = kLy * 0.5
        const hz = (kLz + 1.0) * 0.5
        const hInv = 1.0 / Math.sqrt(hx * hx + hy * hy + hz * hz)
        const specDot = Math.max(snx * hx * hInv + sny * hy * hInv + snz * hz * hInv, 0.0)
        const spec = Math.pow(specDot, 24.0)

        const dist = Math.sqrt(nxScr * nxScr * 0.85 + nyScr * nyScr * 0.68)
        const centerGlow = Math.exp(-dist * dist * 1.65)
        const vig = Math.max(0.0, Math.min(1.0, (1.22 - dist) / (1.22 - 0.12)))
        const vigSmooth = vig * vig * (3.0 - 2.0 * vig)

        let r = 0.329 + (0.741 - 0.329) * vigSmooth
        let g = 0.318 + (0.729 - 0.318) * vigSmooth
        let b = 0.302 + (0.706 - 0.302) * vigSmooth

        const pearlMix = centerGlow * 0.85
        r = r + (0.949 - r) * pearlMix
        g = g + (0.945 - g) * pearlMix
        b = b + (0.933 - b) * pearlMix

        r += (diffKey - 0.88) * 0.038 + diffRim * 0.018 + spec * 0.075 * centerGlow
        g += (diffKey - 0.88) * 0.038 + diffRim * 0.018 + spec * 0.075 * centerGlow
        b += (diffKey - 0.88) * 0.036 + diffRim * 0.017 + spec * 0.072 * centerGlow

        const dither = (((x * 13 + y * 29) & 7) / 7.0 - 0.5) * (1.2 / 255.0)

        data[p++] = Math.max(0, Math.min(255, Math.round((r + dither) * 255)))
        data[p++] = Math.max(0, Math.min(255, Math.round((g + dither) * 255)))
        data[p++] = Math.max(0, Math.min(255, Math.round((b + dither) * 255)))
        data[p++] = 255
      }
    }
    bgCtx.putImageData(img, 0, 0)
  }

  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = 256
  glowCanvas.height = 256
  const gCtx = glowCanvas.getContext('2d')
  if (gCtx) {
    const grad = gCtx.createRadialGradient(128, 128, 4, 128, 128, 124)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.62)')
    grad.addColorStop(0.45, 'rgba(238, 236, 232, 0.24)')
    grad.addColorStop(1, 'rgba(210, 207, 202, 0)')
    gCtx.fillStyle = grad
    gCtx.fillRect(0, 0, 256, 256)
  }

  const rayCanvas = document.createElement('canvas')
  rayCanvas.width = 256
  rayCanvas.height = 256
  const rCtx = rayCanvas.getContext('2d')
  if (rCtx) {
    const rGrad = rCtx.createLinearGradient(28, 28, 228, 228)
    rGrad.addColorStop(0, 'rgba(255, 252, 245, 0)')
    rGrad.addColorStop(0.5, 'rgba(255, 252, 245, 0.58)')
    rGrad.addColorStop(1, 'rgba(255, 252, 245, 0)')
    rCtx.fillStyle = rGrad
    rCtx.fillRect(0, 0, 256, 256)
  }

  const nibSparkCanvas = document.createElement('canvas')
  nibSparkCanvas.width = 96
  nibSparkCanvas.height = 96
  const nCtx = nibSparkCanvas.getContext('2d')
  if (nCtx) {
    const nGrad = nCtx.createRadialGradient(48, 48, 1, 48, 48, 46)
    nGrad.addColorStop(0, 'rgba(255, 248, 228, 0.95)')
    nGrad.addColorStop(0.28, 'rgba(209, 162, 88, 0.62)')
    nGrad.addColorStop(0.65, 'rgba(158, 118, 56, 0.18)')
    nGrad.addColorStop(1, 'rgba(158, 118, 56, 0)')
    nCtx.fillStyle = nGrad
    nCtx.fillRect(0, 0, 96, 96)
  }

  return { bgCanvas, glowCanvas, rayCanvas, nibSparkCanvas }
}

// ---------------------------------------------------------------------------
// 5. CALLIGRAPHIC GOLD-LEAF MICRO-SPARKS
// ---------------------------------------------------------------------------
type GoldMote = {
  id: number
  triggerP: number
  offsetY: number
  driftX: number
  driftY: number
  size: number
}

function buildCalligraphicMotes(): GoldMote[] {
  const motes: GoldMote[] = []
  for (let i = 0; i < 24; i++) {
    const seed1 = Math.sin(i * 19.13 + 7.21) * 43758.5453
    const f1 = seed1 - Math.floor(seed1)
    const seed2 = Math.sin(i * 47.89 + 31.17) * 29183.1234
    const f2 = seed2 - Math.floor(seed2)

    motes.push({
      id: i,
      triggerP: (i / 24) * 0.92 + f1 * 0.05,
      offsetY: (f1 - 0.5) * 18,
      driftX: -8 - f2 * 16,
      driftY: -12 + (f1 - 0.5) * 22,
      size: 1.1 + f2 * 1.4,
    })
  }
  return motes
}

function easeOutCubic(x: number): number {
  const t = Math.max(0, Math.min(1, x))
  return 1 - Math.pow(1 - t, 3)
}

function easeInOutCubic(x: number): number {
  const t = Math.max(0, Math.min(1, x))
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function clamp01(x: number): number {
  return x <= 0 ? 0 : x >= 1 ? 1 : x
}

export function WelcomePage({
  onStart,
  onOpenMaterials,
  onOpenStyles,
  onOpenCalc,
  lang,
  setLang,
}: WelcomePageProps) {
  const [phase, setPhase] = useState<'intro' | 'complete'>('intro')
  const [soundOn, setSoundOn] = useState(() => sound.enabled)
  const [runId, setRunId] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const skipRequestedRef = useRef(false)
  const motes = useMemo(() => buildCalligraphicMotes(), [])

  useEffect(() => {
    void ensureMollaniFont()
    try {
      const bgHex = '#6E6B66'
      getWin().Telegram?.WebApp?.setHeaderColor?.(bgHex)
      getWin().Telegram?.WebApp?.setBackgroundColor?.(bgHex)
      getWin().Telegram?.WebApp?.expand?.()
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('app_lang') as Lang | null
      const supported: Lang[] = ['ru', 'uk', 'de']
      if (savedLang && supported.includes(savedLang)) {
        if (savedLang !== lang) setLang(savedLang)
      } else if (!savedLang) {
        const sys = navigator.language.slice(0, 2) as Lang
        const def: Lang = supported.includes(sys) ? sys : 'uk'
        setLang(def)
        localStorage.setItem('app_lang', def)
        localStorage.setItem('cordwainer_lang', def)
      }
      localStorage.setItem('cordwainer_visited', '1')
    } catch {}
  }, [lang, setLang])

  const t = {
    ru: {
      replay: 'Повтор',
      skip: 'Пропустить',
      ch1: 'Cardio',
      ch2: 'Силуэты',
      ch3: 'Расчёты',
      enter: 'Войти',
      atelierSub: 'Bespoke Shoemaking Archive',
    },
    uk: {
      replay: 'Повтор',
      skip: 'Пропустити',
      ch1: 'Cardio',
      ch2: 'Силуети',
      ch3: 'Розрахунки',
      enter: 'Увійти',
      atelierSub: 'Bespoke Shoemaking Archive',
    },
    de: {
      replay: 'Replay',
      skip: 'Überspringen',
      ch1: 'Cardio',
      ch2: 'Silhouetten',
      ch3: 'Rechner',
      enter: 'Eintreten',
      atelierSub: 'Bespoke Shoemaking Archive',
    },
  }[lang]

  // -------------------------------------------------------------------------
  // SINGLE-CANVAS CALLIGRAPHIC SIGNATURE ENGINE (Auto-fitted via measureText)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const paths = getCompiledPaths()
    const textures = createPrebakedTextures()
    if (!paths || !textures) return

    let dpr = Math.min(window.devicePixelRatio || 1, 2.0)
    let viewW = window.innerWidth
    let viewH = window.innerHeight

    const syncViewport = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2.0)
      viewW = window.innerWidth
      viewH = window.innerHeight
      canvas.width = Math.round(viewW * dpr)
      canvas.height = Math.round(viewH * dpr)
    }
    syncViewport()
    window.addEventListener('resize', syncViewport)

    skipRequestedRef.current = false
    setPhase('intro')

    let mCrown = false
    let mNibStart = false
    let mStrokeMid1 = false
    let mStrokeMid2 = false
    let mSwashLock = false
    let mLightSweep = false
    let mDone = false

    let rafId = 0
    let lastNow = performance.now()
    let simTime = 0.0
    let waitTimeForFont = 0.0

    const FONT_SPEC = '400 64px "Mollani", "Cormorant Garamond", Georgia, serif'

    const measureWordBounds = () => {
      ctx.save()
      ctx.font = FONT_SPEC
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const m = ctx.measureText(BRAND_WORDMARK)
      ctx.restore()

      const leftExt = Math.max(m.actualBoundingBoxLeft || 135, m.width * 0.5)
      const rightExt = Math.max(m.actualBoundingBoxRight || 135, m.width * 0.5)
      const padLeft = leftExt + 14
      const padRight = rightExt + 16
      const totalSpan = padLeft + padRight
      const opticalOffsetX = (leftExt - rightExt) * 0.5

      return { padLeft, padRight, totalSpan, opticalOffsetX }
    }

    const drawMollaniWord = (fillColor: string, opticalOffsetX: number) => {
      ctx.save()
      ctx.fillStyle = fillColor
      ctx.font = FONT_SPEC
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(BRAND_WORDMARK, opticalOffsetX, 4)
      ctx.restore()
    }

    const renderFrame = (now: number) => {
      const rawDt = (now - lastNow) / 1000
      lastNow = now
      const dt = Math.max(0.001, Math.min(0.033, rawDt))

      const fontLoadedNow =
        mollaniFontReady ||
        (typeof document !== 'undefined' &&
          Boolean(document.fonts?.check?.('64px "Mollani"')))

      if (skipRequestedRef.current && simTime < 3.6) {
        simTime = 3.6
        mDone = true
      } else if (!fontLoadedNow && simTime >= 0.35 && waitTimeForFont < 1.2) {
        waitTimeForFont += dt
      } else {
        simTime += dt
      }
      const elapsed = simTime

      if (!skipRequestedRef.current) {
        if (!mCrown && elapsed >= 0.08) {
          mCrown = true
          haptic('light')
          sound.linenWhisper(1.0)
        }
        if (!mNibStart && elapsed >= 0.48) {
          mNibStart = true
          haptic('medium')
          sound.suedeSwell()
        }
        if (!mStrokeMid1 && elapsed >= 1.05) {
          mStrokeMid1 = true
          haptic('light')
          sound.softTick(1.02)
        }
        if (!mStrokeMid2 && elapsed >= 1.62) {
          mStrokeMid2 = true
          haptic('medium')
          sound.softTick(1.16)
        }
        if (!mSwashLock && elapsed >= 2.18) {
          mSwashLock = true
          haptic('heavy')
          sound.feltChord()
        }
        if (!mLightSweep && elapsed >= 2.55) {
          mLightSweep = true
          sound.goldenShimmer()
        }
        if (!mDone && elapsed >= 3.15) {
          mDone = true
          setPhase('complete')
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      ctx.globalAlpha = 1.0
      ctx.drawImage(textures.bgCanvas, 0, 0, viewW, viewH)

      const bounds = measureWordBounds()
      const centerX = viewW * 0.5
      const centerY = viewH * 0.445
      const logoMasterScale = Math.min((viewW * 0.84) / bounds.totalSpan, 1.32)

      const haloIn = easeOutCubic(clamp01((elapsed - 0.15) / 1.1))
      if (haloIn > 0) {
        const breathe = 0.5 + 0.5 * Math.sin(elapsed * 1.65)
        const haloR = (138 + breathe * 14) * logoMasterScale
        ctx.globalAlpha = haloIn * (0.54 + breathe * 0.14)
        ctx.drawImage(
          textures.glowCanvas,
          centerX - haloR * 1.45,
          centerY - haloR * 0.85,
          haloR * 2.9,
          haloR * 1.7
        )
      }

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.scale(logoMasterScale, logoMasterScale)

      if (elapsed < 2.3) {
        const arcIn = easeOutCubic(clamp01((elapsed - 0.05) / 0.55))
        const arcOut = 1 - easeInOutCubic(clamp01((elapsed - 1.55) / 0.7))
        const arcAlpha = arcIn * arcOut
        if (arcAlpha > 0.01) {
          ctx.save()
          ctx.globalAlpha = arcAlpha * 0.28
          ctx.strokeStyle = '#8C6B3F'
          ctx.lineWidth = 0.65
          ctx.beginPath()
          ctx.arc(0, 18, 124, Math.PI * 1.14, Math.PI * 1.14 + Math.PI * 0.72 * arcIn)
          ctx.stroke()
          ctx.restore()
        }
      }

      const crownP = easeOutCubic(clamp01((elapsed - 0.14) / 0.72))
      if (crownP > 0) {
        ctx.save()
        const liftY = -22.5 + (1 - crownP) * 5.0
        ctx.translate(0, liftY)

        const ruleSpan = 28 + 70 * crownP
        ctx.save()
        ctx.beginPath()
        ctx.rect(-ruleSpan, -38, ruleSpan * 2, 24)
        ctx.clip()
        ctx.globalAlpha = crownP * 0.82
        ctx.fillStyle = '#8C6B3F'
        ctx.fill(paths.rulesPath)
        ctx.restore()

        ctx.globalAlpha = crownP
        ctx.fillStyle = '#7A5A2F'
        ctx.fill(paths.thePath)
        ctx.restore()
      }

      const writeRaw = clamp01((elapsed - 0.46) / 1.72)
      const writeP = easeInOutCubic(writeRaw)

      if (writeRaw > 0) {
        const startX = -bounds.padLeft + bounds.opticalOffsetX
        const endX = bounds.padRight + bounds.opticalOffsetX
        const nibX = startX + (endX - startX) * writeP

        ctx.save()
        ctx.beginPath()
        ctx.rect(startX - 10, -76, nibX - (startX - 10), 152)
        ctx.clip()
        ctx.globalAlpha = Math.min(1, writeRaw * 3.2)
        drawMollaniWord('#141210', bounds.opticalOffsetX)
        ctx.restore()

        if (writeRaw < 0.99) {
          const bandWidth = 44
          const edgeEnv = Math.sin(writeRaw * Math.PI)
          ctx.save()
          ctx.beginPath()
          ctx.rect(nibX - bandWidth, -76, bandWidth + 10, 152)
          ctx.clip()
          ctx.globalAlpha = Math.min(1, edgeEnv * 1.15)
          drawMollaniWord('#B6863E', bounds.opticalOffsetX)
          ctx.restore()

          const nibY =
            writeP < 0.28
              ? Math.sin((writeP / 0.28) * Math.PI * 1.8) * 18
              : Math.sin((writeP - 0.28) * 22.0) * 6.5

          ctx.save()
          ctx.globalAlpha = edgeEnv * 0.78
          ctx.drawImage(textures.nibSparkCanvas, nibX - 24, nibY - 24, 48, 48)
          ctx.restore()
        }

        if (elapsed < 2.65) {
          for (let i = 0; i < motes.length; i++) {
            const m = motes[i]
            if (writeP < m.triggerP) continue
            const age = (writeP - m.triggerP) / 0.36
            if (age <= 0 || age >= 1) continue

            const moteX = startX + (endX - startX) * m.triggerP + m.driftX * age
            const moteY = m.offsetY + m.driftY * age
            const moteAlpha = Math.sin(age * Math.PI) * 0.75

            ctx.save()
            ctx.globalAlpha = moteAlpha
            ctx.fillStyle = '#C99B53'
            ctx.beginPath()
            ctx.arc(moteX, moteY, m.size * (1 - age * 0.4), 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }
        }
      }

      const swashP = easeOutCubic(clamp01((elapsed - 2.12) / 0.58))
      if (swashP > 0) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(-48, 12, 170 * swashP, 20)
        ctx.clip()
        ctx.globalAlpha = Math.min(1, swashP * 1.15)
        ctx.fillStyle = '#9E7840'
        ctx.fill(paths.swashPath)
        ctx.restore()
      }

      const sweepP = clamp01((elapsed - 2.48) / 0.74)
      if (sweepP > 0 && sweepP < 1) {
        const sweepHalf = Math.max(bounds.padLeft, bounds.padRight) + 25
        const bandX = -sweepHalf + sweepP * (sweepHalf * 2)
        const env = Math.sin(sweepP * Math.PI)

        ctx.save()
        ctx.beginPath()
        ctx.rect(bandX - 30, -72, 60, 144)
        ctx.clip()

        ctx.globalAlpha = env * 0.88
        drawMollaniWord('#C99B53', bounds.opticalOffsetX)
        ctx.fillStyle = '#C99B53'
        ctx.save()
        ctx.translate(0, -22.5)
        ctx.fill(paths.thePath)
        ctx.restore()
        ctx.fill(paths.swashPath)
        ctx.restore()

        ctx.save()
        ctx.globalAlpha = env * 0.22
        ctx.drawImage(textures.rayCanvas, bandX - 55, -55, 110, 110)
        ctx.restore()
      }

      ctx.restore()

      rafId = window.requestAnimationFrame(renderFrame)
    }

    rafId = window.requestAnimationFrame(renderFrame)
    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', syncViewport)
    }
  }, [motes, runId])

  const handleReplayOrSkip = useCallback(() => {
    sound.unlock()
    haptic('medium')
    sound.softTick(1.05)
    if (phase !== 'complete') {
      skipRequestedRef.current = true
      setPhase('complete')
    } else {
      setRunId((n) => n + 1)
    }
  }, [phase])

  const handleToggleSound = useCallback(() => {
    const next = sound.toggle()
    setSoundOn(next)
    haptic('light')
  }, [])

  const handleSelectLang = useCallback(
    (code: Lang) => {
      sound.unlock()
      if (code === lang) return
      haptic('medium')
      sound.softTick(code === 'ru' ? 0.95 : code === 'uk' ? 1.08 : 1.2)
      setLang(code)
      try {
        localStorage.setItem('app_lang', code)
        localStorage.setItem('cordwainer_lang', code)
      } catch {}
    },
    [lang, setLang]
  )

  const handleAction = useCallback((cb?: () => void, isPrimary = false) => {
    sound.unlock()
    haptic(isPrimary ? 'heavy' : 'medium')
    sound.softTick(isPrimary ? 1.25 : 1.05)
    cb?.()
  }, [])

  const langIndex = lang === 'ru' ? 0 : lang === 'uk' ? 1 : 2
  const isComplete = phase === 'complete'

  return (
    <div
      onPointerDown={() => sound.unlock()}
      className="fixed inset-0 w-full h-[100lvh] min-h-screen overflow-hidden select-none bg-[#6E6B66] text-[#141210]"
      style={{
        fontFamily:
          '"Cormorant Garamond", "Playfair Display", "Didot", "Bodoni MT", "Georgia", serif',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      {/* Hidden DOM font-preloader so CSS immediately fetches Mollani-Regular.ttf on first mount */}
      <span
        aria-hidden="true"
        className="fixed -top-96 left-0 opacity-0 pointer-events-none select-none"
        style={{ fontFamily: '"Mollani", serif' }}
      >
        {BRAND_WORDMARK}
      </span>

      {/* Single Hardware-Accelerated Canvas */}
      <canvas
        ref={canvasRef}
        aria-label="The Cordwaine"
        className="fixed inset-0 w-full h-full pointer-events-none block"
      />

      {/* Top Bar */}
      <header
        className="relative z-20 flex items-center justify-between px-5 sm:px-8"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px) + 14px, 20px)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReplayOrSkip}
            className="group inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-full text-[#141210]/80 hover:text-[#141210] active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <span
              className="text-[13px] text-[#7A5A2F] transition-transform duration-500 group-hover:-rotate-45"
              aria-hidden="true"
            >
              {isComplete ? '↻' : '⏭'}
            </span>
            <span className="italic text-[14px] tracking-[0.04em]">
              {isComplete ? t.replay : t.skip}
            </span>
          </button>

          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={soundOn ? 'Mute sound' : 'Enable sound'}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-[#141210]/15 bg-[#FAF9F6]/45 text-[#141210]/80 hover:text-[#141210] active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <span className="text-[11px] leading-none">
              {soundOn ? '♪' : '✕'}
            </span>
          </button>
        </div>

        {/* Luminous Pearl Segmented Language Switcher */}
        <div
          role="tablist"
          aria-label="Language switcher"
          className="relative grid grid-cols-3 items-center p-[3px] rounded-full border border-[#141210]/12 bg-[#141210]/10 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] w-[138px] h-[32px]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] rounded-full bg-[#FAF9F6] shadow-[0_2px_6px_rgba(20,18,16,0.16)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              width: 'calc((100% - 6px) / 3)',
              transform: `translate3d(${langIndex * 100}%, 0, 0)`,
            }}
          />
          {(
            [
              { code: 'ru' as Lang, label: 'ru' },
              { code: 'uk' as Lang, label: 'ukr' },
              { code: 'de' as Lang, label: 'de' },
            ] as const
          ).map((item) => {
            const active = lang === item.code
            return (
              <button
                key={item.code}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleSelectLang(item.code)}
                className={`relative z-10 flex items-center justify-center h-full rounded-full text-[11px] tracking-[0.06em] font-sans transition-colors duration-300 cursor-pointer ${
                  active
                    ? 'text-[#141210] font-semibold'
                    : 'text-[#141210]/65 hover:text-[#141210]/90 font-normal'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* Center Signature Philosophy Subtitle ("THE ART OF SHOEMAKING")
          Uses GPU-accelerated @keyframes so Android WebView NEVER skips the float-up animation */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-20 flex flex-col items-center justify-center text-center px-6"
        style={{ top: '56.5%' }}
      >
        {isComplete && (
          <>
            <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.42em] text-[#6E5028] font-sans font-medium will-change-[transform,opacity] animate-[cordwaineFloatUpSub_900ms_cubic-bezier(0.22,1,0.36,1)_both]">
              THE ART OF SHOEMAKING
            </p>
            <p className="mt-1.5 text-[11px] italic tracking-[0.12em] text-[#141210]/60 will-change-[transform,opacity] animate-[cordwaineFloatUp_950ms_cubic-bezier(0.22,1,0.36,1)_90ms_both]">
              {t.atelierSub}
            </p>
          </>
        )}
      </div>

      {/* Bottom Typographic Navigation & Primary Entry CTA
          Mounted on phase === 'complete' with explicit GPU keyframe animation for identical iOS & Android smoothness */}
      {isComplete && (
        <footer
          className="fixed inset-x-0 bottom-0 z-20 flex flex-col items-center px-6 pointer-events-auto"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 18px, 24px)',
          }}
        >
          <nav
            aria-label="Atelier chapters"
            className="flex items-center justify-center gap-6 sm:gap-9 mb-6 will-change-[transform,opacity] animate-[cordwaineFloatUp_950ms_cubic-bezier(0.22,1,0.36,1)_60ms_both]"
          >
            <button
              type="button"
              onClick={() => handleAction(onOpenMaterials ?? onStart)}
              className="text-[15px] sm:text-[16px] tracking-[0.06em] text-[#141210]/90 hover:text-[#7A5A2F] active:scale-95 transition-colors duration-300 cursor-pointer"
            >
              {t.ch1}
            </button>

            <span
              aria-hidden="true"
              className="w-1 h-1 rounded-full bg-[#7A5A2F]/60"
            />

            <button
              type="button"
              onClick={() => handleAction(onOpenStyles ?? onStart)}
              className="text-[15px] sm:text-[16px] tracking-[0.06em] text-[#141210]/90 hover:text-[#7A5A2F] active:scale-95 transition-colors duration-300 cursor-pointer"
            >
              {t.ch2}
            </button>

            <span
              aria-hidden="true"
              className="w-1 h-1 rounded-full bg-[#7A5A2F]/60"
            />

            <button
              type="button"
              onClick={() => handleAction(onOpenCalc ?? onStart)}
              className="text-[15px] sm:text-[16px] tracking-[0.06em] text-[#141210]/90 hover:text-[#7A5A2F] active:scale-95 transition-colors duration-300 cursor-pointer"
            >
              {t.ch3}
            </button>
          </nav>

          <button
            type="button"
            onClick={() => handleAction(onStart, true)}
            className="group flex flex-col items-center gap-2.5 pt-1 text-[#141210]/95 hover:text-[#141210] active:scale-95 transition-colors duration-300 cursor-pointer will-change-[transform,opacity] animate-[cordwaineFloatUp_1000ms_cubic-bezier(0.22,1,0.36,1)_160ms_both]"
          >
            <span className="text-[11px] uppercase tracking-[0.38em] font-sans font-medium pl-[0.38em]">
              {t.enter}
            </span>
            <span className="relative w-[1px] h-7 bg-[#141210]/25 overflow-hidden">
              <span className="
                absolute inset-x-0 top-0 h-3.5 bg-[#7A5A2F]
                animate-[cordwainePulseLine_2.2s_ease-in-out_infinite]
              " />
            </span>
          </button>
        </footer>
      )}

      <style>{`
        @font-face {
          font-family: 'Mollani';
          src: url('${MOLLANI_FONT_URL}') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @keyframes cordwaineFloatUp {
          0% {
            opacity: 0;
            transform: translate3d(0, 44px, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes cordwaineFloatUpSub {
          0% {
            opacity: 0;
            transform: translate3d(0, 36px, 0);
          }
          100% {
            opacity: 0.82;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes cordwainePulseLine {
          0% { transform: translateY(-100%); opacity: 0; }
          45% { opacity: 0.95; }
          100% { transform: translateY(220%); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default WelcomePage
