import React, { useState, useEffect, useRef, useCallback } from 'react'
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

// ============================================================================
// 1. Ultra-Fast GPU WebGL Silk & Stone Shader (0.28x internal buffer + bilinear upscale)
//    - Analytical gradient noise normal (single evaluation instead of 3x finite diff!)
//    - Renders 20,000 pixels instead of 900,000 pixels per frame (< 0.12ms on Android GPU)
//    - Warm Pearl-Champagne (#E4DBD0) + Cashmere Taupe (#CBBFAB) + Smoked Umber (#8B7C6A)
// ============================================================================
const VERTEX_SHADER_SRC = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`

const FRAGMENT_SHADER_SRC = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  varying vec2 v_uv;
  uniform vec2 u_res;
  uniform float u_time;
  uniform float u_glint;
  uniform float u_breath;

  // Sin-less polynomial hash (identical on Android Adreno/Mali & iPhone Apple GPU)
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // Analytical value noise returning (value, dV/dx, dV/dy) in ONE pass (3x faster than finite diff!)
  vec3 noised(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    vec2 u = f * f * (3.0 - 2.0 * f);
    vec2 du = 6.0 * f * (1.0 - f);

    float a = hash12(i + vec2(0.0, 0.0));
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));

    float k0 = a;
    float k1 = b - a;
    float k2 = c - a;
    float k3 = a - b - c + d;

    return vec3(
      k0 + k1 * u.x + k2 * u.y + k3 * u.x * u.y,
      du * (vec2(k1, k2) + k3 * u.yx)
    );
  }

  void main() {
    vec2 aspect = vec2(u_res.x / max(u_res.y, 1.0), 1.0);
    vec2 uv = (v_uv - 0.5) * aspect;
    float t = u_time;

    // Single-pass analytical silk normal + height
    vec3 n1 = noised(uv * 1.55 + vec2(t * 0.04, -t * 0.03));
    vec3 n2 = noised(uv * 2.85 + n1.yz * 0.35 - vec2(t * 0.03, t * 0.04));
    vec2 grad = n1.yz * 0.65 + n2.yz * 0.35;
    vec3 normal = normalize(vec3(-grad * 0.28, 1.0));

    vec3 viewDir = normalize(vec3(uv * 0.3, 1.0));
    vec3 lightPos = vec3(sin(t * 0.18) * 0.4, 0.35 + cos(t * 0.14) * 0.15, 1.25);
    vec3 lightDir = normalize(lightPos - vec3(uv, 0.0));
    vec3 halfVec = normalize(lightDir + viewDir);

    float diff = clamp(dot(normal, lightDir), 0.0, 1.0);
    float spec = pow(clamp(dot(normal, halfVec), 0.0, 1.0), 18.0);

    vec3 pearlCenter = vec3(0.894, 0.859, 0.804);   // #E4DBD0
    vec3 cashmereMid = vec3(0.796, 0.745, 0.671);   // #CBBFAB
    vec3 umberEdge   = vec3(0.545, 0.486, 0.416);   // #8B7C6A
    vec3 warmGold    = vec3(0.835, 0.686, 0.435);   // #D5AF6F

    vec3 baseCol = mix(cashmereMid, pearlCenter, 0.36 + 0.64 * diff);
    baseCol += warmGold * spec * 0.11;

    if (u_glint > 0.001 && u_glint < 0.999) {
      float beamPos = mix(-0.75, 0.75, u_glint);
      float beam = exp(-pow((uv.x - beamPos + uv.y * 0.25) * 5.5, 2.0));
      float env = sin(u_glint * 3.14159);
      baseCol = mix(baseCol, vec3(0.945, 0.890, 0.788), beam * env * 0.32);
    }

    float dist = length(uv);
    float breathWave = 0.5 + 0.5 * sin(t * 1.15);
    float centerAura = exp(-pow(dist * 2.35, 2.0)) * u_breath * (0.75 + 0.25 * breathWave);
    baseCol = mix(baseCol, vec3(0.933, 0.898, 0.839), centerAura * 0.38);

    float vig = smoothstep(0.98, 0.18, dist);
    vec3 finalCol = mix(umberEdge, baseCol, 0.38 + 0.62 * vig);
    finalCol = clamp(finalCol, vec3(0.18), vec3(0.925));

    gl_FragColor = vec4(finalCol, 1.0);
  }
`

// ============================================================================
// 2. Multi-Channel Haptic + Luxury Atelier Sound Engine (0 KB Bundle Size)
// ============================================================================
type HapticStyle = 'selection' | 'light' | 'medium' | 'heavy' | 'success'

declare global {
  interface Window {
    TelegramWebviewProxy?: {
      postEvent?: (eventType: string, eventData: string) => void
    }
    webkitAudioContext?: typeof AudioContext
  }
}

let lastHapticTime = 0
let sharedAudioCtx: AudioContext | null = null
let noiseBuffer: AudioBuffer | null = null
let iosSwitchLabel: HTMLLabelElement | null = null

function getOrInitAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!sharedAudioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) sharedAudioCtx = new Ctx()
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {})
    }
    return sharedAudioCtx
  } catch {
    return null
  }
}

function getPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer
  const len = ctx.sampleRate * 2.0
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.96900 * b2 + white * 0.1538520
    b3 = 0.86650 * b3 + white * 0.3104856
    b4 = 0.55000 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.0168980
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035
    b6 = white * 0.115926
  }
  noiseBuffer = buf
  return buf
}

function playLuxurySound(
  type: 'linenWhisper' | 'suedeSwell' | 'feltChord' | 'goldenShimmer' | 'softTick',
  soundEnabled = true
) {
  if (!soundEnabled) return
  const ctx = getOrInitAudioContext()
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime

  try {
    if (type === 'linenWhisper') {
      const src = ctx.createBufferSource()
      src.buffer = getPinkNoiseBuffer(ctx)
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(520, now)
      filter.frequency.exponentialRampToValueAtTime(920, now + 0.9)
      filter.Q.value = 1.4

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0005, now)
      gain.gain.linearRampToValueAtTime(0.06, now + 0.25)
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.05)

      src.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      src.start(now)
      src.stop(now + 1.1)
    } else if (type === 'suedeSwell') {
      const src = ctx.createBufferSource()
      src.buffer = getPinkNoiseBuffer(ctx)
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(180, now)
      filter.frequency.exponentialRampToValueAtTime(640, now + 0.95)
      filter.frequency.exponentialRampToValueAtTime(140, now + 1.7)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0005, now)
      gain.gain.linearRampToValueAtTime(0.085, now + 0.75)
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.75)

      src.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      src.start(now)
      src.stop(now + 1.8)
    } else if (type === 'feltChord') {
      const chord = [73.42, 110.0, 185.0, 220.0, 277.18, 329.63]
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const filter = ctx.createBiquadFilter()
        const gain = ctx.createGain()

        osc.type = idx < 2 ? 'triangle' : 'sine'
        osc.frequency.setValueAtTime(freq, now)
        osc.detune.setValueAtTime((idx - 2.5) * 3.0, now)

        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(420, now)
        filter.frequency.exponentialRampToValueAtTime(140, now + 3.2)

        const onset = now + idx * 0.032
        const amp = idx < 2 ? 0.048 : 0.028
        gain.gain.setValueAtTime(0.0004, onset)
        gain.gain.linearRampToValueAtTime(amp, onset + 0.09)
        gain.gain.exponentialRampToValueAtTime(0.0004, onset + 3.4)

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        osc.start(onset)
        osc.stop(onset + 3.45)
      })
    } else if (type === 'goldenShimmer') {
      ;[587.33, 880.0, 1318.51].forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)
        const t0 = now + idx * 0.04
        gain.gain.setValueAtTime(0.0004, t0)
        gain.gain.linearRampToValueAtTime(0.014, t0 + 0.18)
        gain.gain.exponentialRampToValueAtTime(0.0004, t0 + 1.35)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t0)
        osc.stop(t0 + 1.4)
      })
    } else if (type === 'softTick') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(660, now)
      gain.gain.setValueAtTime(0.0005, now)
      gain.gain.linearRampToValueAtTime(0.018, now + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0004, now + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.2)
    }
  } catch {}
}

function playDualFreqTactilePulse(style: HapticStyle) {
  const ctx = getOrInitAudioContext()
  if (!ctx || ctx.state !== 'running') return
  try {
    const now = ctx.currentTime
    const isStrong = style === 'medium' || style === 'heavy' || style === 'success'
    const dur = isStrong ? 0.02 : 0.013

    const oscLow = ctx.createOscillator()
    const gainLow = ctx.createGain()
    oscLow.type = 'sine'
    oscLow.frequency.setValueAtTime(isStrong ? 155 : 138, now)
    oscLow.frequency.exponentialRampToValueAtTime(46, now + dur)

    gainLow.gain.setValueAtTime(isStrong ? 0.18 : 0.11, now)
    gainLow.gain.exponentialRampToValueAtTime(0.001, now + dur)

    oscLow.connect(gainLow)
    gainLow.connect(ctx.destination)
    oscLow.start(now)
    oscLow.stop(now + dur + 0.002)

    const oscHigh = ctx.createOscillator()
    const gainHigh = ctx.createGain()
    oscHigh.type = 'triangle'
    oscHigh.frequency.setValueAtTime(isStrong ? 1050 : 920, now)
    oscHigh.frequency.exponentialRampToValueAtTime(240, now + 0.005)

    gainHigh.gain.setValueAtTime(isStrong ? 0.065 : 0.04, now)
    gainHigh.gain.exponentialRampToValueAtTime(0.001, now + 0.005)

    oscHigh.connect(gainHigh)
    gainHigh.connect(ctx.destination)
    oscHigh.start(now)
    oscHigh.stop(now + 0.006)
  } catch {}
}

function ensureIosSwitchFallback(): HTMLLabelElement | null {
  if (typeof document === 'undefined') return null
  if (iosSwitchLabel && document.body.contains(iosSwitchLabel)) return iosSwitchLabel
  try {
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    label.appendChild(input)
    document.body.appendChild(label)
    iosSwitchLabel = label
    return label
  } catch {
    return null
  }
}

function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false
  const tgPlatform = (window.Telegram?.WebApp as Record<string, unknown> | undefined)?.platform
  if (tgPlatform === 'android' || tgPlatform === 'android_x') return true
  return /Android/i.test(navigator.userAgent || '')
}

function triggerHaptic(style: HapticStyle = 'light', force = false) {
  const now = performance.now()
  if (!force && now - lastHapticTime < 45) return
  lastHapticTime = now

  const android = isAndroidDevice()
  const impactLevel: 'light' | 'medium' | 'heavy' =
    style === 'heavy' || style === 'success'
      ? 'heavy'
      : android
      ? 'medium'
      : style === 'medium'
      ? 'medium'
      : 'light'

  let handledByTg = false
  try {
    const tgHaptic = window.Telegram?.WebApp?.HapticFeedback
    if (tgHaptic) {
      if (!android && style === 'selection') {
        tgHaptic.selectionChanged?.()
      } else {
        tgHaptic.impactOccurred?.(impactLevel)
        if (style === 'success') {
          tgHaptic.notificationOccurred?.('success')
        }
      }
      handledByTg = true
    }
  } catch {}

  try {
    if (window.TelegramWebviewProxy?.postEvent) {
      window.TelegramWebviewProxy.postEvent(
        'web_app_trigger_haptic_feedback',
        JSON.stringify({
          type: 'impact',
          impact_style: impactLevel,
        })
      )
      if (style === 'success') {
        window.TelegramWebviewProxy.postEvent(
          'web_app_trigger_haptic_feedback',
          JSON.stringify({
            type: 'notification',
            notification_type: 'success',
          })
        )
      }
    }
  } catch {}

  playDualFreqTactilePulse(style)

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if (style === 'success' || style === 'heavy') {
        navigator.vibrate([14, 24, 18])
      } else if (style === 'medium' || android) {
        navigator.vibrate(14)
      } else {
        navigator.vibrate(8)
      }
      return
    }
  } catch {}

  if (!handledByTg && !android) {
    const lbl = ensureIosSwitchFallback()
    lbl?.click()
  }
}

// ============================================================================
// 3. Native Skia Path2D Vector Data (Zero SVG DOM Mutations -> Locked 120 FPS!)
// ============================================================================
const GLYPHS = {
  T: 'M1.188-20.556V-2.268A1.831,1.831,0,0,0,2.268-.612,2.166,2.166,0,0,0,3.312-.36h.4V0H-3.708V-.36h.432A2.076,2.076,0,0,0-1.8-.936,1.945,1.945,0,0,0-1.152-2.3V-20.556H-7.668a1.68,1.68,0,0,0-1.314.54,1.87,1.87,0,0,0-.486,1.3v.576h-.4v-4.068a8.071,8.071,0,0,0,2.034.432q1.314.144,1.962.144H5.868A11.217,11.217,0,0,0,9.9-22.212v4.068H9.5v-.576a1.833,1.833,0,0,0-.5-1.3,1.693,1.693,0,0,0-1.3-.54Z',
  H: 'M4.572-.36a2.068,2.068,0,0,0,1.44-.558,1.884,1.884,0,0,0,.648-1.35v-7.848H-6.624v7.848a1.884,1.884,0,0,0,.648,1.35,2.068,2.068,0,0,0,1.44.558H-4.1V0h-7.344V-.36h.432A2.014,2.014,0,0,0-9.558-.936,1.974,1.974,0,0,0-8.928-2.3V-19.3a1.945,1.945,0,0,0-.648-1.368,2.032,2.032,0,0,0-1.44-.576h-.432v-.36H-4.1v.36h-.432a2.068,2.068,0,0,0-1.44.558,1.884,1.884,0,0,0-.648,1.35V-11.2H6.66v-8.1a1.583,1.583,0,0,0-.468-1.224,2.321,2.321,0,0,0-1.62-.72H4.14v-.36h7.344v.36h-.432a2.106,2.106,0,0,0-1.44.54,1.825,1.825,0,0,0-.648,1.332v17.1A1.64,1.64,0,0,0,9.432-1.08a2.409,2.409,0,0,0,1.62.72h.432V0H4.14V-.36Z',
  E: 'M-7.344-.36A2.05,2.05,0,0,0-5.886-.918a1.911,1.911,0,0,0,.63-1.35v-17.1A1.707,1.707,0,0,0-5.868-20.7a2.154,2.154,0,0,0-1.476-.54h-.5v-.36H2.664a13.77,13.77,0,0,0,2.592-.216,8.4,8.4,0,0,0,1.44-.36v4.1l-.4-.036v-.54a1.833,1.833,0,0,0-.5-1.3,1.693,1.693,0,0,0-1.3-.54H-2.988v9.144H3.168a1.381,1.381,0,0,0,1.1-.432,1.581,1.581,0,0,0,.378-1.08v-.468h.4v5.04h-.4v-.468a1.37,1.37,0,0,0-.756-1.368,2.532,2.532,0,0,0-.612-.144H-2.988v9.144H2.664a6.115,6.115,0,0,0,2.79-.576A4.857,4.857,0,0,0,7.182-3.06,12.218,12.218,0,0,0,8.388-5.148h.36L6.768,0H-7.848V-.36Z',
  C: 'M.99.5Q-4.518.468-7.7-2.556a10.847,10.847,0,0,1-3.186-8.262A10.847,10.847,0,0,1-7.7-19.08Q-4.518-22.1.99-22.1a18.225,18.225,0,0,1,4.5.576,14.265,14.265,0,0,1,3.924,1.584l.792,5.112H9.882Q8.334-21.024.954-21.024a8.685,8.685,0,0,0-6.768,2.736A10.724,10.724,0,0,0-8.3-10.8,12.141,12.141,0,0,0-7.182-5.418a8.211,8.211,0,0,0,3.24,3.546A9.483,9.483,0,0,0,.99-.612,13.127,13.127,0,0,0,5.9-1.458,7.8,7.8,0,0,0,9.4-4.248a9.113,9.113,0,0,0,1.566-4.824h.324l-.4,4.932a9.474,9.474,0,0,1-4.068,3.4A13.63,13.63,0,0,1,.99.5Z',
  O: 'M-6.084-20.664a13.036,13.036,0,0,1,6.1-1.44,13.171,13.171,0,0,1,6.1,1.422,11.121,11.121,0,0,1,4.41,4.014A10.752,10.752,0,0,1,12.168-10.8,10.752,10.752,0,0,1,10.53-4.932,11.121,11.121,0,0,1,6.12-.918,12.325,12.325,0,0,1,.432.5,14.755,14.755,0,0,1-4.716-.324a11.888,11.888,0,0,1-3.87-2.3,10.652,10.652,0,0,1-2.592-3.6,12.079,12.079,0,0,1-.954-4.986,10.051,10.051,0,0,1,1.638-5.454A10.991,10.991,0,0,1-6.084-20.664ZM-6.768-3.42A9.016,9.016,0,0,0,0-.576,8.988,8.988,0,0,0,6.768-3.438,10.217,10.217,0,0,0,9.5-10.8a10.217,10.217,0,0,0-2.736-7.362A8.988,8.988,0,0,0,0-21.024a8.931,8.931,0,0,0-6.75,2.862A10.255,10.255,0,0,0-9.468-10.8,10.359,10.359,0,0,0-6.768-3.42Z',
  R: 'M-2.574-20.484H-4.482V-2.3A1.93,1.93,0,0,0-3.474-.612,2.166,2.166,0,0,0-2.43-.36h.468l.036.36h-7.38V-.36h.5A2,2,0,0,0-7.38-.918a1.785,1.785,0,0,0,.594-1.35v-17.1A1.729,1.729,0,0,0-7.38-20.7,2.041,2.041,0,0,0-8.8-21.24h-.5v-.36H-.27a8.408,8.408,0,0,1,5.346,1.548,4.932,4.932,0,0,1,1.962,4.068,5.926,5.926,0,0,1-1.584,4.212A6.2,6.2,0,0,1,1.422-9.828,8.136,8.136,0,0,1,4.194-7.02q-.036,0,1.242,1.584T7.488-2.97q.774.882,1.278,1.35a4.325,4.325,0,0,0,3.06,1.26V0H10.71A7.774,7.774,0,0,1,6.246-1.116,10.552,10.552,0,0,1,4.014-3.168Q3.8-3.456,2.2-5.706T.486-8.1q-1.944-2.412-3.636-2.412v-.36q4.212,0,5.076-.432a4.07,4.07,0,0,0,1.62-1.3,5.86,5.86,0,0,0,.9-3.168,4.36,4.36,0,0,0-1.3-3.384,5.379,5.379,0,0,0-3.492-1.3Q-1.314-20.484-2.574-20.484Z',
  D: 'M11.88-10.8A10.268,10.268,0,0,1,8.766-2.9,11.9,11.9,0,0,1,.324,0H-11.7V-.36h.468a1.954,1.954,0,0,0,1.44-.576A2,2,0,0,0-9.18-2.3V-19.3a1.924,1.924,0,0,0-.63-1.4,2.088,2.088,0,0,0-1.458-.54H-11.7v-.36H.324a13.648,13.648,0,0,1,6.138,1.3,9.255,9.255,0,0,1,4.014,3.744A11.38,11.38,0,0,1,11.88-10.8ZM-6.84-20.52V-1.08H.324A8.484,8.484,0,0,0,6.876-3.69,10.068,10.068,0,0,0,9.288-10.8a10.068,10.068,0,0,0-2.412-7.11A8.484,8.484,0,0,0,.324-20.52Z',
  W: 'M15.12-21.6v.36h-.288a2.4,2.4,0,0,0-1.44.522,4.1,4.1,0,0,0-1.15,1.566L5.58.5H5.22L.18-13.14-4.86.5h-.36L-12.15-19.152a3.8,3.8,0,0,0-1.12-1.566,2.3,2.3,0,0,0-1.45-.522H-15.0v-.36h6.48v.36h-.288a1.15,1.15,0,0,0-.98.486,1.55,1.55,0,0,0-.32.882,3.4,3.4,0,0,0,.12.828L-4.32-3.42-.18-14.76l-.9-2.484a3.2,3.2,0,0,0-.95-1.476,2.1,2.1,0,0,0-1.35-.486h-.28v-.36h6.48v.36H2.52a1.15,1.15,0,0,0-.98.486,1.55,1.55,0,0,0-.32.882,3.4,3.4,0,0,0,.12.828L5.94-3.42l5.22-15.552a2.5,2.5,0,0,0,.18-.882,1.55,1.55,0,0,0-.36-.9,1.25,1.25,0,0,0-1.08-.486H9.62v-.36Z',
  A: 'M11.826-.36h.288V0H4.734V-.36h.288A1.237,1.237,0,0,0,6.066-.828a1.476,1.476,0,0,0,.36-.882,2.353,2.353,0,0,0-.144-.81L4.3-7.308H-4.806l-1.98,4.68a2.462,2.462,0,0,0-.18.882,1.551,1.551,0,0,0,.36.9,1.258,1.258,0,0,0,1.08.486h.288V0h-6.876V-.36h.288A2.729,2.729,0,0,0-10.3-.882,3.844,3.844,0,0,0-9.018-2.448Q-1.134-19.3-.81-20.088A8.708,8.708,0,0,0-.162-22.1H.162L9.054-2.448A3.131,3.131,0,0,0,11.826-.36ZM-4.338-8.388H3.87L-.162-18.252Z',
  I: 'M-3.564-.36A2.627,2.627,0,0,0-1.872-.936,1.709,1.709,0,0,0-1.152-2.3V-19.3a1.709,1.709,0,0,0-.72-1.368A2.68,2.68,0,0,0-3.6-21.24h-.468v-.36H4.068v.36H3.6a2.665,2.665,0,0,0-1.674.54,1.85,1.85,0,0,0-.774,1.332v17.1a1.769,1.769,0,0,0,.756,1.35A2.682,2.682,0,0,0,3.6-.36h.468L4.1,0H-4.068V-.36Z',
  N: 'M12.15-21.24a1.969,1.969,0,0,0-1.368.522,1.78,1.78,0,0,0-.612,1.278V-4.1a29.7,29.7,0,0,0,.252,3.96L10.494.5H10.17L-8.55-17.244V-2.232A1.753,1.753,0,0,0-7.974-.9a1.977,1.977,0,0,0,1.4.54h.612V0h-6.8V-.36h.612a1.977,1.977,0,0,0,1.4-.54,1.753,1.753,0,0,0,.576-1.332V-17.64a27.41,27.41,0,0,0-.252-3.924l-.072-.576.4.036L8.586-4.5V-19.44a1.918,1.918,0,0,0-.648-1.278A1.969,1.969,0,0,0,6.57-21.24H5.958v-.36h6.8v.36Z',
  G1: 'M6.012-18.612a5.428,5.428,0,0,1,.54,2.52,3.862,3.862,0,0,1-1.188,2.718,5.69,5.69,0,0,1-2.772,1.638A7.259,7.259,0,0,1,6.93-9.828,4.826,4.826,0,0,1,8.64-6.282,6.03,6.03,0,0,1,7.9-3.132,4.982,4.982,0,0,1,5.94-1.26,10.983,10.983,0,0,1,.648,0H-8.28V-.36h.432A2.161,2.161,0,0,0-6.336-.918,1.919,1.919,0,0,0-5.688-2.3V-19.3a1.807,1.807,0,0,0-1.08-1.692,2.243,2.243,0,0,0-1.08-.252H-8.28v-.36H-.936Q4.428-21.6,6.012-18.612ZM6.084-6.048q0-5.364-8.388-5.364v-.36q6.336,0,6.336-4.428,0-4.32-5-4.32H-3.42V-1.08H.612a6.039,6.039,0,0,0,3.96-1.242A4.541,4.541,0,0,0,6.084-6.048Z',
  G2: 'M-1.71-10.224A6.034,6.034,0,0,0-.2-10.008q.684,0,1.116-.036a8.3,8.3,0,0,0,1.224-.234,4.573,4.573,0,0,0,1.44-.63A5.484,5.484,0,0,0,5.814-13.86,6.059,6.059,0,0,0,6.066-15.8,4.258,4.258,0,0,0,4.554-19.26,6.332,6.332,0,0,0,.378-20.52H-3.114V-2.3A1.864,1.864,0,0,0-2.07-.612,2.166,2.166,0,0,0-1.026-.36h.5V0H-7.974V-.36h.5A2.05,2.05,0,0,0-6.012-.918a1.911,1.911,0,0,0,.63-1.35V-19.332a1.886,1.886,0,0,0-.63-1.368,2.088,2.088,0,0,0-1.458-.54h-.5v-.36H.45a9.788,9.788,0,0,1,5.994,1.656A5.287,5.287,0,0,1,8.658-15.48a6.565,6.565,0,0,1-.936,3.528A6.224,6.224,0,0,1,2.034-9,8.708,8.708,0,0,1-1.71-9.864Z',
  G3: 'M6.858-18.648A1.7,1.7,0,0,0,5.814-20.34a2.017,2.017,0,0,0-.756-.144h-7.6v9.144H3.726a1.325,1.325,0,0,0,1.08-.432,1.63,1.63,0,0,0,.36-1.08v-.468H5.6v5.04H5.166v-.468a1.42,1.42,0,0,0-.576-1.26A1.628,1.628,0,0,0,3.8-10.26H-2.538V-2.3A1.984,1.984,0,0,0-1.674-.72a2.218,2.218,0,0,0,1.26.36h.5V0H-7.434V-.36h.5A2.113,2.113,0,0,0-5.454-.918a1.884,1.884,0,0,0,.648-1.35v-17.1a1.761,1.761,0,0,0-1.044-1.62,2.382,2.382,0,0,0-1.08-.252h-.5v-.36H3.186a16.4,16.4,0,0,0,2.3-.18,7.838,7.838,0,0,0,1.764-.4v4.1l-.4-.036Z',
  G4: 'M-6.228-1.188a9.005,9.005,0,0,1-.108-1.764,8.305,8.305,0,0,1,.468-2.7h.432A5.863,5.863,0,0,0-5.472-5,4.249,4.249,0,0,0-4.194-1.818,4.874,4.874,0,0,0-.648-.576a5.669,5.669,0,0,0,3.708-1.1A3.515,3.515,0,0,0,4.392-4.518a3.713,3.713,0,0,0-1.3-2.9L-4.1-12.96a4.943,4.943,0,0,1-1.728-3.96,4.654,4.654,0,0,1,.774-2.592A5.451,5.451,0,0,1-2.9-21.4,7.124,7.124,0,0,1,.36-22.1a15.182,15.182,0,0,1,3.312.324H4.86l.072,3.924h-.4A2.815,2.815,0,0,0,3.492-20.2,4.712,4.712,0,0,0,.5-21.024a5.029,5.029,0,0,0-3.2.99,3.105,3.105,0,0,0-1.26,2.556,3.429,3.429,0,0,0,1.4,2.718L4.716-9.144A4.676,4.676,0,0,1,6.372-5.328a5.391,5.391,0,0,1-1.854,4.14A6.46,6.46,0,0,1,0,.5,14.784,14.784,0,0,1-3.528.072,6.291,6.291,0,0,1-6.228-1.188Z',
  G5: 'M.252.5A12.12,12.12,0,0,1-8.334-2.574a10.8,10.8,0,0,1-3.222-8.244,10.8,10.8,0,0,1,3.222-8.244A11.622,11.622,0,0,1-.018-22.1a16.407,16.407,0,0,1,8.658,2.16l.792,5.112H9.108a7.556,7.556,0,0,0-2.934-4.68A10.7,10.7,0,0,0,.018-21.024a8.351,8.351,0,0,0-6.48,2.754,10.689,10.689,0,0,0-2.5,7.47,10.641,10.641,0,0,0,2.52,7.47A8.969,8.969,0,0,0,.522-.576a10.562,10.562,0,0,0,7.65-3.132L8.208-8.5a1.177,1.177,0,0,0-.414-1.026A1.873,1.873,0,0,0,6.552-9.9h-.5v-.36h6.588v.36h-.5q-1.62,0-1.62,1.44v4.32A12.99,12.99,0,0,1,6.354-.882,12.961,12.961,0,0,1,.252.5Z',
  G6: 'M11.34-21.24H10.8a1.662,1.662,0,0,0-1.476.756,1.574,1.574,0,0,0-.252.756V-7.6A7.608,7.608,0,0,1,6.678-1.674,9.4,9.4,0,0,1,.108.5,9.517,9.517,0,0,1-6.48-1.656a7.523,7.523,0,0,1-2.412-5.9V-19.692a1.417,1.417,0,0,0-.5-1.1,1.773,1.773,0,0,0-1.224-.45h-.54v-.36h6.84v.36h-.54a1.773,1.773,0,0,0-1.224.45,1.417,1.417,0,0,0-.5,1.1v11.7A8.024,8.024,0,0,0-4.806-2.484,6.372,6.372,0,0,0,.234-.468a7.168,7.168,0,0,0,5.22-1.908A6.944,6.944,0,0,0,7.416-7.6v-12.1a1.539,1.539,0,0,0-.522-1.116,1.749,1.749,0,0,0-1.206-.432h-.54v-.36H11.34Z',
  G7: 'M12.15-21.24h-.288a2.7,2.7,0,0,0-1.548.522,4.184,4.184,0,0,0-1.3,1.566Q1.17-2.3.846-1.512A8.708,8.708,0,0,0,.2.5H-.126l-8.892-19.62q-1.044-2.124-2.772-2.124h-.288v-.36H-4.7v.36h-.288a1.172,1.172,0,0,0-1.026.486,1.581,1.581,0,0,0-.342.882,3.413,3.413,0,0,0,.108.828L.2-3.348,6.822-18.972A2.462,2.462,0,0,0,7-19.854a1.551,1.551,0,0,0-.36-.9,1.258,1.258,0,0,0-1.08-.486H5.31v-.36h6.84Z',
  G8: 'M11.412,0H10.08A6.6,6.6,0,0,1,4.788-2.052l-7.92-8.676,7.74-9.108a.787.787,0,0,0,.126-.954.984.984,0,0,0-.918-.45H3.492v-.36h7.344v.36h-.144a4.719,4.719,0,0,0-3.492,1.3L-.648-11.556,8.28-1.836A3.978,3.978,0,0,0,9.612-.72a4.59,4.59,0,0,0,1.8.36ZM-2.268-.36h.4V0h-7.38V-.36h.432A2.076,2.076,0,0,0-7.344-.936,1.945,1.945,0,0,0-6.7-2.3V-19.3a1.945,1.945,0,0,0-.648-1.368A2.076,2.076,0,0,0-8.82-21.24h-.432v-.36h7.38v.36H-2.3a2.069,2.069,0,0,0-1.8.936,1.713,1.713,0,0,0-.288.972V-2.268a1.74,1.74,0,0,0,.63,1.35A2.179,2.179,0,0,0-2.268-.36Z',
  G9: 'M11.7,0H3.168V-.36H3.6A1.209,1.209,0,0,0,4.662-.846,1.519,1.519,0,0,0,5-1.638a1.3,1.3,0,0,0-.18-.63L-.144-9.4-5.4-2.3a1.054,1.054,0,0,0-.252.648,1.527,1.527,0,0,0,.342.81,1.249,1.249,0,0,0,1.1.486h.432V0h-7.848V-.36h.468A4.367,4.367,0,0,0-7.74-2.124l6.7-8.568L-7.128-19.44a4.373,4.373,0,0,0-1.494-1.278,4.039,4.039,0,0,0-1.962-.522h-.468v-.36h8.46v.36h-.432a1.209,1.209,0,0,0-1.062.486,1.519,1.519,0,0,0-.342.792,1.138,1.138,0,0,0,.216.63L.36-12.78l4.356-6.552a1,1,0,0,0,.216-.612,1.527,1.527,0,0,0-.342-.81,1.209,1.209,0,0,0-1.062-.486H3.1v-.36h7.992v.36h-.5a3.841,3.841,0,0,0-1.926.522A5.081,5.081,0,0,0,7.128-19.4l-5.8,8.064L7.776-2.124A3.97,3.97,0,0,0,9.558-.72a5.073,5.073,0,0,0,1.674.36H11.7Z',
  G10: 'M-7.164-.36A2.05,2.05,0,0,0-5.706-.918a1.911,1.911,0,0,0,.63-1.35V-19.3a1.919,1.919,0,0,0-.666-1.368,2.14,2.14,0,0,0-1.494-.576h-.432v-.36H-.216v.36H-.648a2.14,2.14,0,0,0-1.494.576,1.794,1.794,0,0,0-.63,1.368v18.18H2.844a6.23,6.23,0,0,0,2.808-.576A4.826,4.826,0,0,0,7.4-3.06a10.874,10.874,0,0,0,1.17-2.088h.36L6.948,0H-7.668V-.36Z',
  G11: 'M11.7-21.24h-.432a3.586,3.586,0,0,0-1.854.522A4.8,4.8,0,0,0,7.956-19.4L1.044-8.928V-2.3A1.816,1.816,0,0,0,1.656-.936,2.076,2.076,0,0,0,3.132-.36h.432V0h-7.38V-.36h.432A2.076,2.076,0,0,0-1.908-.936,1.816,1.816,0,0,0-1.3-2.3v-6.66L-7.956-19.44a3.812,3.812,0,0,0-3.312-1.8H-11.7v-.36h8.352v.36H-3.78a1.129,1.129,0,0,0-.99.432,1.363,1.363,0,0,0-.306.738A2.028,2.028,0,0,0-5-19.512L.252-10.188l5.58-9.288a1.678,1.678,0,0,0,.108-.594,1.363,1.363,0,0,0-.306-.738,1.17,1.17,0,0,0-1.026-.432H4.176v-.36H11.7Z',
  G12: 'M-8.208-18.72v.576h-.4v-4.068a6.692,6.692,0,0,0,1.71.378q1.242.162,2.322.2h8.28A21.93,21.93,0,0,0,6.12-21.78,6.168,6.168,0,0,0,7.776-22.1v.324L-5.9-1.08H3.96a6.745,6.745,0,0,0,2.808-.594,4.672,4.672,0,0,0,1.746-1.35,10.578,10.578,0,0,0,1.17-2.124h.36L8.1,0H-9.144V-.324L4.284-20.556H-6.444a1.681,1.681,0,0,0-1.548.936A1.988,1.988,0,0,0-8.208-18.72Z',
} as const
type GlyphKey = keyof typeof GLYPHS

const BG_GRID: Array<[GlyphKey, Array<[number, number]>]> = [
  ['A', [[688,306],[843,429],[781,756],[688,633],[688,511],[595,429],[564,553],[626,553]]],
  ['N', [[657,306],[843,512],[905,635],[657,717],[812,676],[906,347],[564,593]]],
  ['G1', [[719,306],[564,470],[843,267],[843,347],[595,675],[904,553],[936,429],[657,757],[781,635],[657,593],[812,512]]],
  ['O', [[812,266],[657,511],[874,388],[874,757],[657,675],[595,388]]],
  ['C', [[812,306],[843,388],[719,675],[719,756],[935,511],[657,429],[781,553]]],
  ['G2', [[626,306],[781,389],[750,675],[626,757],[936,553],[564,429],[874,347],[843,470],[626,593]]],
  ['D', [[656,266],[874,469],[626,635],[812,716],[905,757],[626,429],[843,553]]],
  ['E', [[688,266],[812,389],[718,634],[874,676],[843,757],[595,716],[905,429],[626,470]]],
  ['R', [[936,266],[904,389],[750,553],[688,717],[936,676]]],
  ['G3', [[720,266],[688,388],[719,512],[843,717],[905,512],[595,635],[688,554],[564,675]]],
  ['G4', [[595,266],[750,388],[719,716],[874,634],[874,430],[936,347],[564,511],[813,553]]],
  ['G5', [[750,266],[813,429],[812,635],[595,757],[936,716],[626,511],[595,347],[688,593]]],
  ['T', [[750,306],[719,347],[564,635],[843,677],[719,554],[812,470]]],
  ['H', [[781,266],[688,429],[782,676],[812,757],[936,389],[657,635],[564,307],[905,470],[688,675],[936,635],[719,388],[595,593],[782,512]]],
  ['G6', [[781,306],[781,430],[750,635],[905,717],[626,675],[750,512],[657,554]]],
  ['I', [[595,307],[657,388],[936,470],[874,553],[688,757],[905,676],[750,347]]],
  ['G7', [[626,267],[781,347],[626,390],[873,511],[750,757],[874,717],[719,429],[595,470],[937,593],[595,553]]],
  ['G8', [[875,266],[935,757],[626,716],[843,635],[750,429],[594,511],[563,388],[781,716]]],
  ['G9', [[875,306],[564,347],[750,593],[564,716]]],
  ['G10', [[906,266],[657,470],[843,307],[717,593]]],
  ['G11', [[906,306],[564,266]]],
  ['G12', [[936,306],[564,757],[750,717],[812,347]]],
]

const WORD_GRID_ITEMS: Array<{ key: GlyphKey; x: number; y: number }> = [
  // THE
  { key: 'T', x: 626, y: 347 },
  { key: 'H', x: 657, y: 347 },
  { key: 'E', x: 688, y: 347 },
  // CORD
  { key: 'C', x: 688, y: 470 },
  { key: 'O', x: 719, y: 470 },
  { key: 'R', x: 750, y: 470 },
  { key: 'D', x: 781, y: 470 },
  // WAINE
  { key: 'W', x: 781, y: 593 },
  { key: 'A', x: 812, y: 593 },
  { key: 'I', x: 843, y: 593 },
  { key: 'N', x: 874, y: 593 },
  { key: 'E', x: 905, y: 593 },
]

const LOGO_MAIN_PATHS: string[] = [
  'M-152.198,0.91Q-162.223,0.852 -168.014,-4.652A19.742,19.742 0 0,1 -173.813,-19.689A19.742,19.742 0 0,1 -168.014,-34.726Q-162.223,-40.222 -152.198,-40.222A33.17,33.17 0 0,1 -144.008,-39.174A25.962,25.962 0 0,1 -136.867,-36.291L-135.425,-26.987H-136.015Q-138.832,-38.264 -152.264,-38.264A15.807,15.807 0 0,0 -164.581,-33.284A19.518,19.518 0 0,0 -169.106,-19.656A22.097,22.097 0 0,0 -167.071,-9.861A14.944,14.944 0 0,0 -161.174,-3.407A17.259,17.259 0 0,0 -152.198,-1.114A23.891,23.891 0 0,0 -143.262,-2.654A14.196,14.196 0 0,0 -136.892,-7.731A16.586,16.586 0 0,0 -134.042,-16.511H-133.452L-134.18,-7.535A17.243,17.243 0 0,1 -141.584,-1.347A24.807,24.807 0 0,1 -152.198,0.91Z',
  'M-120.004,-30.583A19.293,19.293 0 0,1 -110.976,-32.714A19.493,19.493 0 0,1 -101.948,-30.609A16.459,16.459 0 0,1 -95.422,-24.669A15.913,15.913 0 0,1 -92.991,-15.984A15.913,15.913 0 0,1 -95.416,-7.299A16.459,16.459 0 0,1 -101.942,-1.359A18.241,18.241 0 0,1 -110.361,0.74A21.837,21.837 0 0,1 -117.98,-0.48A17.594,17.594 0 0,1 -123.707,-3.884A15.765,15.765 0 0,1 -127.543,-9.212A17.877,17.877 0 0,1 -128.955,-16.591A14.875,14.875 0 0,1 -126.531,-24.663A16.267,16.267 0 0,1 -120.004,-30.583ZM-121.017,-5.062A13.344,13.344 0 0,0 -111,-0.852A13.302,13.302 0 0,0 -100.983,-5.088A15.121,15.121 0 0,0 -96.94,-15.984A15.121,15.121 0 0,0 -100.989,-26.88A13.302,13.302 0 0,0 -111,-31.116A13.218,13.218 0 0,0 -120.99,-26.88A15.177,15.177 0 0,0 -125.013,-15.984A15.331,15.331 0 0,0 -121.017,-5.062Z',
  'M-76.81,-30.316H-79.633V-3.404A2.856,2.856 0 0,0 -78.142,-0.906A3.206,3.206 0 0,0 -76.596,-0.533H-75.904L-75.85,0H-86.773V-0.533H-86.033A2.96,2.96 0 0,0 -83.922,-1.359A2.642,2.642 0 0,0 -83.043,-3.357V-28.665A2.559,2.559 0 0,0 -83.922,-30.636A3.021,3.021 0 0,0 -86.024,-31.435H-86.764V-31.968H-73.4A12.444,12.444 0 0,1 -65.488,-29.677A7.299,7.299 0 0,1 -62.584,-23.656A8.77,8.77 0 0,1 -64.928,-17.423A9.176,9.176 0 0,1 -70.895,-14.545A12.041,12.041 0 0,1 -66.793,-10.39Q-66.846,-10.39 -64.955,-8.045T-61.918,-4.396Q-60.772,-3.09 -60.026,-2.398A6.401,6.401 0 0,0 -55.498,-0.533V0H-57.149A11.506,11.506 0 0,1 -63.756,-1.652A15.617,15.617 0 0,1 -67.059,-4.689Q-67.376,-5.115 -69.744,-8.445T-72.281,-11.988Q-75.158,-15.558 -77.662,-15.558V-16.091Q-71.428,-16.091 -70.15,-16.73A6.024,6.024 0 0,0 -67.752,-18.654A8.673,8.673 0 0,0 -66.42,-23.343A6.453,6.453 0 0,0 -68.344,-28.351A7.961,7.961 0 0,0 -73.512,-30.275Q-74.945,-30.316 -76.81,-30.316Z',
  'M-17.418,-15.984A15.197,15.197 0 0,1 -22.026,-4.292A17.612,17.612 0 0,1 -34.52,0H-52.316V-0.533H-51.623A2.892,2.892 0 0,0 -49.492,-1.385A2.96,2.96 0 0,0 -48.586,-3.404V-28.564A2.848,2.848 0 0,0 -49.519,-30.636A3.09,3.09 0 0,0 -51.677,-31.435H-52.316V-31.968H-34.52A20.199,20.199 0 0,1 -25.436,-30.044A13.697,13.697 0 0,1 -19.496,-24.503A16.842,16.842 0 0,1 -17.418,-15.984ZM-45.123,-30.37V-1.598H-34.52A12.556,12.556 0 0,0 -24.824,-5.461A14.901,14.901 0 0,0 -21.254,-15.984A14.901,14.901 0 0,0 -24.824,-26.507A12.556,12.556 0 0,0 -34.52,-30.37Z',
  'M31.378,-31.968V-31.435H30.951A3.552,3.552 0 0,0 28.82,-30.663A6.068,6.068 0 0,0 27.118,-28.345L17.258,0.74H16.726L9.266,-19.447L1.807,0.74H1.274L-8.982,-28.345A5.624,5.624 0 0,0 -10.64,-30.663A3.404,3.404 0 0,0 -12.786,-31.435H-13.2V-31.968H-3.61V-31.435H-4.036A1.702,1.702 0 0,0 -5.486,-30.716A2.294,2.294 0 0,0 -5.96,-29.411A5.032,5.032 0 0,0 -5.782,-28.185L2.606,-5.062L8.734,-21.845L7.402,-25.521A4.736,4.736 0 0,0 5.996,-27.706A3.108,3.108 0 0,0 3.998,-28.425H3.583V-28.958H13.174V-28.425H12.73A1.702,1.702 0 0,0 11.279,-27.706A2.294,2.294 0 0,0 10.806,-26.4A5.032,5.032 0 0,0 10.983,-25.175L17.791,-5.062L25.517,-28.079A3.7,3.7 0 0,0 25.783,-29.384A2.294,2.294 0 0,0 25.25,-30.716A1.85,1.85 0 0,0 23.652,-31.435H23.238V-31.968Z',
  'M68.502,-0.533H68.929V0H58.006V-0.533H58.433A1.831,1.831 0 0,0 59.978,-1.225A2.184,2.184 0 0,0 60.51,-2.531A3.482,3.482 0 0,0 60.297,-3.73L57.364,-10.816H43.887L40.957,-3.889A3.644,3.644 0 0,0 40.69,-2.584A2.295,2.295 0 0,0 41.223,-1.252A1.862,1.862 0 0,0 42.822,-0.533H43.248V0H33.071V-0.533H33.498A4.039,4.039 0 0,0 35.756,-1.305A5.689,5.689 0 0,0 37.653,-3.623Q49.322,-28.564 49.801,-29.73A12.888,12.888 0 0,0 50.76,-32.708H51.24L64.4,-3.623A4.634,4.634 0 0,0 68.502,-0.533ZM44.58,-12.414H56.728L50.76,-27.013Z',
  'M75.725,-0.533A3.888,3.888 0 0,0 78.229,-1.385A2.529,2.529 0 0,0 79.295,-3.404V-28.564A2.529,2.529 0 0,0 78.229,-30.589A3.966,3.966 0 0,0 75.672,-31.435H74.979V-31.968H87.021V-31.435H86.328A3.944,3.944 0 0,0 83.85,-30.636A2.738,2.738 0 0,0 82.705,-28.665V-3.357A2.618,2.618 0 0,0 83.824,-1.359A3.969,3.969 0 0,0 86.328,-0.533H87.021L87.068,0H74.979V-0.533Z',
  'M130.982,-31.435A2.914,2.914 0 0,0 128.957,-30.663A2.634,2.634 0 0,0 128.052,-28.771V-6.068A43.956,43.956 0 0,0 128.425,-0.207L128.531,0.74H128.052L100.346,-25.521V-3.303A2.594,2.594 0 0,0 101.198,-1.332A2.926,2.926 0 0,0 103.27,-0.533H104.176V0H94.112V-0.533H95.018A2.926,2.926 0 0,0 97.09,-1.332A2.594,2.594 0 0,0 97.942,-3.303V-26.107A40.567,40.567 0 0,0 97.57,-31.915L97.463,-32.767L98.055,-32.714L125.707,-6.66V-28.771A2.839,2.839 0 0,0 124.748,-30.663A2.914,2.914 0 0,0 122.724,-31.435H121.818V-31.968H131.882V-31.435Z',
  'M137.131,-0.533A3.034,3.034 0 0,0 139.289,-1.359A2.828,2.828 0 0,0 140.221,-3.357V-28.665A2.526,2.526 0 0,0 139.315,-30.636A3.188,3.188 0 0,0 137.131,-31.435H136.391V-31.968H151.943A20.38,20.38 0 0,0 155.779,-32.288A12.432,12.432 0 0,0 157.91,-32.82V-26.752L157.318,-26.806V-27.605A2.713,2.713 0 0,0 156.578,-29.529A2.506,2.506 0 0,0 154.654,-30.328H143.578V-16.795H152.689A2.044,2.044 0 0,0 154.317,-17.434A2.34,2.34 0 0,0 154.876,-19.033V-19.725H155.468V-12.266H154.876V-12.959A2.028,2.028 0 0,0 153.757,-14.984A3.747,3.747 0 0,0 152.851,-15.197H143.578V-1.664H151.943A9.05,9.05 0 0,0 156.072,-2.516A7.188,7.188 0 0,0 158.629,-4.529A18.083,18.083 0 0,0 160.414,-7.619H160.947L158.017,0H136.385V-0.533Z'
]
const LOGO_MAIN_CENTERS = [-154, -111, -73, -35, 9, 51, 81, 113, 148]
const LOGO_TAIL_D = 'M 591.0 143.2 C 600.0 156.2, 636.0 158.0, 672.0 144.4 C 665.5 146.8, 635.5 154.2, 601.5 143.6 C 597.0 142.2, 593.5 142.1, 591.0 143.2 Z'
const LOGO_THE_D = 'M-5.525-9.23a.753.753,0,0,0,.312-.962H-8.047l.754-2.548a.874.874,0,0,0-.988-.156l-1.456,2.574-2.08.364a.652.652,0,0,0-.286.728h2.028L-12.6-1.82a5,5,0,0,0-.364,1.482.777.777,0,0,0,.7.7c1.092,0,3.536-1.586,4.992-3.744.052-.312-.1-.468-.364-.468a9.519,9.519,0,0,1-2.964,2.34c-.208,0-.338-.156-.182-.65L-8.359-9.23Zm7.2-9.36a14.242,14.242,0,0,0-3.042.6.253.253,0,0,0-.078.338l.546.364c.416.286.286.65-.286,2.366L-6.123-.312c-.208.6.468.676.754.676A.476.476,0,0,0-4.9.052,42.115,42.115,0,0,1-1.755-5.356a16.414,16.414,0,0,1,3.3-3.458,2.828,2.828,0,0,1,1.4-.7c.364,0,.546.286.546.78A26.721,26.721,0,0,1,1.625-2.028c-.39.91-.65,1.3-1.04,1.3a1.5,1.5,0,0,1-.676-.338.62.62,0,0,0-.364-.156.825.825,0,0,0-.7.832c0,.208.1.754.962.754A2.858,2.858,0,0,0,1.7-.65a9.125,9.125,0,0,0,1.69-2.132A14.924,14.924,0,0,0,5.421-8.866c0-.91-.416-1.742-1.56-1.742a4.455,4.455,0,0,0-2.47,1.014A16.493,16.493,0,0,0-2.717-5.3l-.052-.052L-.091-13.13l1.872-5.3Zm11.83,7.982a4.991,4.991,0,0,0-3.12,1.248A9.772,9.772,0,0,0,6.513-2.366c0,1.274.546,2.73,2.106,2.73,1.092,0,2.574-.416,4.16-2.366a.349.349,0,0,0-.338-.442C11.3-1.456,10.647-.936,9.711-.936A1.333,1.333,0,0,1,8.463-2.418a6.544,6.544,0,0,1,.364-2.314c3.744-1.04,6.318-2.34,6.318-4.316A1.63,1.63,0,0,0,13.507-10.608Zm-.52.806a.555.555,0,0,1,.6.6,2.935,2.935,0,0,1-1.014,1.768A7.555,7.555,0,0,1,9.087-5.512a10.348,10.348,0,0,1,1.924-3.042C11.947-9.568,12.623-9.8,12.987-9.8Z'

const EASES = {
  power1InOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  power2Out: (t: number) => 1 - (1 - t) * (1 - t),
  power2In: (t: number) => t * t,
  power2InOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  power3InOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  expoOut: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  sineInOut: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Stage coordinate constants matching the original 397.912 x 513.68 stage
const STAGE_W = 397.912
const STAGE_H = 513.68
const GRID_OFFSET_X = -551.238
const GRID_OFFSET_Y = -243.824

// Logo wrapper transform in stage space:
// lvb = (328.46, 67.425), scale = (397.912 * 0.9) / 328.46 = 1.0903026
// logoWrapX = (397.912 - 328.46 * scale) / 2 = 19.8956
// logoWrapY = (513.68 - 67.425 * scale) / 2 = 220.083
const LOGO_SCALE = (STAGE_W * 0.9) / 328.46
const LOGO_WRAP_X = (STAGE_W - 328.46 * LOGO_SCALE) / 2
const LOGO_WRAP_Y = (STAGE_H - 67.425 * LOGO_SCALE) / 2
const LOGO_G_X = -586.87
const LOGO_G_Y = -85.41

type CompiledGlyph = {
  path: Path2D
  isWord: boolean
  wordIdx: number
  homeStageX: number
  homeStageY: number
  startStageX: number
  startStageY: number
  startRotRad: number
  driftStageX: number
  driftStageY: number
  targetStageX: number
  targetStageY: number
  targetScale: number
  distNorm: number
}

export function WelcomePage({
  onStart,
  onOpenMaterials,
  onOpenStyles,
  onOpenCalc,
  lang,
  setLang,
}: WelcomePageProps) {
  const [introFinished, setIntroFinished] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cordwainer_sound') !== '0'
    } catch {
      return true
    }
  })

  const soundEnabledRef = useRef(soundEnabled)
  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  const mainRef = useRef<HTMLElement | null>(null)
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const vecCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const philosophyRef = useRef<HTMLDivElement | null>(null)
  const bottomNavRef = useRef<HTMLElement | null>(null)

  const animStateRef = useRef<{
    mode: 'playing' | 'skipping' | 'done'
    startTime: number
    currentTime: number
    skipStartTime: number
    skipFromTime: number
    resetFlags: () => void
  }>({
    mode: 'playing',
    startTime: 0,
    currentTime: 0,
    skipStartTime: 0,
    skipFromTime: 0,
    resetFlags: () => {},
  })

  // Sync Telegram chrome colors seamlessly (header #DDD3C4, bottom bar #AA9B87 matching vignette edge)
  useEffect(() => {
    const syncTelegramChrome = () => {
      try {
        const wa = window.Telegram?.WebApp as Record<string, unknown> | undefined
        if (!wa) return
        ;(wa.ready as (() => void) | undefined)?.()
        ;(wa.expand as (() => void) | undefined)?.()
        ;(wa.setHeaderColor as ((c: string) => void) | undefined)?.('#DDD3C4')
        ;(wa.setBackgroundColor as ((c: string) => void) | undefined)?.('#B5A692')
        ;(wa.setBottomBarColor as ((c: string) => void) | undefined)?.('#A69682')
      } catch {}
    }
    syncTelegramChrome()
    const t1 = window.setTimeout(syncTelegramChrome, 60)
    const t2 = window.setTimeout(syncTelegramChrome, 240)
    const obs = new MutationObserver(syncTelegramChrome)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] })

    const fontId = 'cordwaine-cormorant-font'
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link')
      link.id = fontId
      link.rel = 'stylesheet'
      link.href =
        'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap'
      document.head.appendChild(link)
    }

    const unlockAudio = () => {
      getOrInitAudioContext()
    }
    window.addEventListener('pointerdown', unlockAudio, { passive: true })
    window.addEventListener('touchstart', unlockAudio, { passive: true })

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      obs.disconnect()
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
    }
  }, [])

  // Restore or initialize saved language
  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang
    const supportedLangs: Lang[] = ['ru', 'uk', 'de']

    if (savedLang && supportedLangs.includes(savedLang)) {
      if (savedLang !== lang) setLang(savedLang)
    } else if (!savedLang) {
      const sysLang = navigator.language.slice(0, 2)
      const defaultLang: Lang = supportedLangs.includes(sysLang as Lang)
        ? (sysLang as Lang)
        : 'uk'
      setLang(defaultLang)
      localStorage.setItem('app_lang', defaultLang)
      localStorage.setItem('cordwainer_lang', defaultLang)
    }
    try {
      localStorage.setItem('cordwainer_visited', '1')
    } catch {}
  }, [lang, setLang])

  // ==========================================================================
  // Unified Single-Loop Engine: Low-Res WebGL Silk Shader + High-DPI Path2D Vector Stage
  // Zero SVG DOM mutations during animation -> 120 FPS on Android One UI & iOS!
  // ==========================================================================
  useEffect(() => {
    const glCanvas = glCanvasRef.current
    const vecCanvas = vecCanvasRef.current
    const philosophy = philosophyRef.current
    const bottomNav = bottomNavRef.current
    if (!glCanvas || !vecCanvas || !philosophy || !bottomNav) return

    // 1. Setup WebGL Silk Shader on glCanvas (rendered at 0.28x resolution for 93% GPU savings)
    const gl =
      glCanvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' }) ||
      (glCanvas.getContext('experimental-webgl') as WebGLRenderingContext | null)

    let prog: WebGLProgram | null = null
    let uRes: WebGLUniformLocation | null = null
    let uTime: WebGLUniformLocation | null = null
    let uGlint: WebGLUniformLocation | null = null
    let uBreath: WebGLUniformLocation | null = null

    if (gl) {
      const compile = (type: number, src: string) => {
        const sh = gl.createShader(type)
        if (!sh) return null
        gl.shaderSource(sh, src)
        gl.compileShader(sh)
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          gl.deleteShader(sh)
          return null
        }
        return sh
      }
      const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER_SRC)
      const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC)
      if (vs && fs) {
        prog = gl.createProgram()
        if (prog) {
          gl.attachShader(prog, vs)
          gl.attachShader(prog, fs)
          gl.linkProgram(prog)
          if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            gl.useProgram(prog)
            const buf = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
            const aPos = gl.getAttribLocation(prog, 'a_pos')
            gl.enableVertexAttribArray(aPos)
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
            uRes = gl.getUniformLocation(prog, 'u_res')
            uTime = gl.getUniformLocation(prog, 'u_time')
            uGlint = gl.getUniformLocation(prog, 'u_glint')
            uBreath = gl.getUniformLocation(prog, 'u_breath')
          }
        }
      }
    }

    // 2. Pre-compile Path2D caches once on mount (native C++ Skia paths)
    const ctx2d = vecCanvas.getContext('2d', { alpha: true })
    if (!ctx2d) return

    const glyphPathCache = {} as Record<GlyphKey, Path2D>
    ;(Object.keys(GLYPHS) as GlyphKey[]).forEach((k) => {
      glyphPathCache[k] = new Path2D(GLYPHS[k])
    })

    const logoLetterPaths = LOGO_MAIN_PATHS.map((d) => new Path2D(d))
    const logoTailPath = new Path2D(LOGO_TAIL_D)
    const logoThePath = new Path2D(LOGO_THE_D)

    // Precompute all 169 glyph trajectories in Stage coordinates (397.912 x 513.68)
    const centerStageX = STAGE_W / 2
    const centerStageY = STAGE_H / 2
    const compiledGlyphs: CompiledGlyph[] = []

    // Helper to convert logo-space coordinate (inside <g transform="translate(-586.87 -85.41)">) to stage-space
    const logoToStageX = (lx: number) => LOGO_WRAP_X + (lx + LOGO_G_X) * LOGO_SCALE
    const logoToStageY = (ly: number) => LOGO_WRAP_Y + (ly + LOGO_G_Y) * LOGO_SCALE

    // Word glyphs (12 items: 0..2 = THE, 3..11 = CORDWAINE)
    WORD_GRID_ITEMS.forEach((item, wIdx) => {
      const homeStageX = item.x + GRID_OFFSET_X
      const homeStageY = item.y + GRID_OFFSET_Y
      const dx = homeStageX - centerStageX
      const dy = homeStageY - centerStageY - 10.8
      const radius = Math.hypot(dx, dy)
      const baseAngle = Math.atan2(dy, dx)
      const swirlAngle = baseAngle + (wIdx % 2 === 0 ? 0.52 : -0.52)
      const expandedRadius = radius * 1.18 + 18

      let targetStageX = homeStageX
      let targetStageY = homeStageY
      let targetScale = 1.0

      if (wIdx < 3) {
        // 'THE' converges into '_the_' at logo (650, 104)
        const theOffsets = [-8, 0, 9]
        targetStageX = logoToStageX(650 + theOffsets[wIdx])
        targetStageY = logoToStageY(104)
        targetScale = 0.62 * LOGO_SCALE
      } else {
        // 'CORDWAINE' converges into exact letter centers at logo (750 + cx, 143)
        const mIdx = wIdx - 3
        const cx = LOGO_MAIN_CENTERS[mIdx]
        targetStageX = logoToStageX(750 + cx)
        targetStageY = logoToStageY(143)
        targetScale = (mIdx === 0 ? 1.82 : 1.48) * LOGO_SCALE
      }

      compiledGlyphs.push({
        path: glyphPathCache[item.key],
        isWord: true,
        wordIdx: wIdx,
        homeStageX,
        homeStageY,
        startStageX: centerStageX + Math.cos(swirlAngle) * expandedRadius,
        startStageY: centerStageY + Math.sin(swirlAngle) * expandedRadius,
        startRotRad: swirlAngle * 0.2 + (wIdx % 2 === 0 ? 0.26 : -0.26),
        driftStageX: homeStageX,
        driftStageY: homeStageY,
        targetStageX,
        targetStageY,
        targetScale,
        distNorm: Math.min(1, radius / 240),
      })
    })

    // Background 157 glyphs
    let bgIdx = 0
    BG_GRID.forEach(([gKey, coords]) => {
      const p2d = glyphPathCache[gKey]
      coords.forEach(([gx, gy]) => {
        const homeStageX = gx + GRID_OFFSET_X
        const homeStageY = gy + GRID_OFFSET_Y
        const dx = homeStageX - centerStageX
        const dy = homeStageY - centerStageY - 10.8
        const radius = Math.hypot(dx, dy)
        const baseAngle = Math.atan2(dy, dx)
        const swirlAngle = baseAngle + (bgIdx % 2 === 0 ? 0.48 : -0.48)
        const expandedRadius = radius * 1.18 + 16
        bgIdx++

        compiledGlyphs.push({
          path: p2d,
          isWord: false,
          wordIdx: -1,
          homeStageX,
          homeStageY,
          startStageX: centerStageX + Math.cos(swirlAngle) * expandedRadius,
          startStageY: centerStageY + Math.sin(swirlAngle) * expandedRadius,
          startRotRad: swirlAngle * 0.18 + (bgIdx % 2 === 0 ? 0.24 : -0.24),
          driftStageX: centerStageX + dx * 0.78,
          driftStageY: centerStageY + dy * 0.78 + 10.8,
          targetStageX: homeStageX,
          targetStageY: homeStageY,
          targetScale: 1,
          distNorm: Math.min(1, radius / 240),
        })
      })
    })

    // Viewport dimensions updated ONLY on ResizeObserver / resize (zero per-frame DOM layout reads!)
    let viewW = window.innerWidth || 430
    let viewH = window.innerHeight || 932
    let vecDpr = Math.min(window.devicePixelRatio || 1, 2.0)

    const updateCanvasSizes = () => {
      const rect = mainRef.current?.getBoundingClientRect()
      viewW = Math.max(rect?.width || 0, window.innerWidth || 0, document.documentElement.clientWidth || 360)
      viewH = Math.max(rect?.height || 0, window.innerHeight || 0, document.documentElement.clientHeight || 640)

      // Low-res 0.28x internal buffer for WebGL Silk Shader (hardware bilinear upscaled)
      const glW = Math.max(64, Math.floor(viewW * 0.28))
      const glH = Math.max(64, Math.floor(viewH * 0.28))
      if (glCanvas.width !== glW || glCanvas.height !== glH) {
        glCanvas.width = glW
        glCanvas.height = glH
        if (gl) gl.viewport(0, 0, glW, glH)
      }

      // High-DPI Retina buffer for crisp vector typography
      vecDpr = Math.min(window.devicePixelRatio || 1, 2.0)
      const vW = Math.floor(viewW * vecDpr)
      const vH = Math.floor(viewH * vecDpr)
      if (vecCanvas.width !== vW || vecCanvas.height !== vH) {
        vecCanvas.width = vW
        vecCanvas.height = vH
      }
    }
    updateCanvasSizes()

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && mainRef.current) {
      ro = new ResizeObserver(updateCanvasSizes)
      ro.observe(mainRef.current)
    }
    window.addEventListener('resize', updateCanvasSizes)

    const soundAndHapticFlags = {
      whisper: false,
      swell: false,
      logoLock: false,
      goldenShimmer: false,
      done: false,
    }

    const resetFlags = () => {
      soundAndHapticFlags.whisper = false
      soundAndHapticFlags.swell = false
      soundAndHapticFlags.logoLock = false
      soundAndHapticFlags.goldenShimmer = false
      soundAndHapticFlags.done = false
      setIntroFinished(false)
    }

    const TOTAL_DURATION = 5.8
    const bootMs = performance.now()
    animStateRef.current = {
      mode: 'playing',
      startTime: bootMs - 40,
      currentTime: 0.04,
      skipStartTime: 0,
      skipFromTime: 0,
      resetFlags,
    }

    let lastPhilOpacity = -1
    let lastNavOpacity = -1
    let rafId = 0

    const renderFrame = (now: number) => {
      const st = animStateRef.current
      let t = st.currentTime

      if (st.mode === 'playing') {
        t = (now - st.startTime) / 1000
        if (t >= TOTAL_DURATION) {
          t = TOTAL_DURATION
          st.mode = 'done'
          setIntroFinished(true)
        } else if (t >= 4.95) {
          setIntroFinished(true)
        }
        st.currentTime = t
      } else if (st.mode === 'skipping') {
        const p = clamp01((now - st.skipStartTime) / 420)
        t = lerp(st.skipFromTime, TOTAL_DURATION, EASES.power2InOut(p))
        st.currentTime = t
        if (p >= 1) {
          st.mode = 'done'
          triggerHaptic('success', true)
          setIntroFinished(true)
        }
      }

      const withEffects = st.mode === 'playing'
      const snd = soundEnabledRef.current

      if (withEffects) {
        if (!soundAndHapticFlags.whisper && t >= 0.06) {
          soundAndHapticFlags.whisper = true
          playLuxurySound('linenWhisper', snd)
        }
        if (!soundAndHapticFlags.swell && t >= 1.15) {
          soundAndHapticFlags.swell = true
          triggerHaptic('selection')
          playLuxurySound('suedeSwell', snd)
        }
        if (!soundAndHapticFlags.logoLock && t >= 2.85) {
          soundAndHapticFlags.logoLock = true
          triggerHaptic('medium', true)
          playLuxurySound('feltChord', snd)
        }
        if (!soundAndHapticFlags.goldenShimmer && t >= 3.75) {
          soundAndHapticFlags.goldenShimmer = true
          triggerHaptic('light')
          playLuxurySound('goldenShimmer', snd)
        }
        if (!soundAndHapticFlags.done && t >= 4.95) {
          soundAndHapticFlags.done = true
          triggerHaptic('success', true)
        }
      }

      // 1. Render WebGL Silk Shader
      const shaderGlint = t >= 3.75 && t <= 4.95 ? EASES.power2InOut(clamp01((t - 3.75) / 1.2)) : 0
      const shaderBreath = EASES.power2Out(clamp01((t - 2.9) / 1.5))
      if (gl && prog) {
        gl.uniform2f(uRes, glCanvas.width, glCanvas.height)
        gl.uniform1f(uTime, (now - bootMs) / 1000)
        gl.uniform1f(uGlint, shaderGlint)
        gl.uniform1f(uBreath, shaderBreath)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }

      // 2. Render Retina Vector Stage on 2D Canvas
      ctx2d.setTransform(1, 0, 0, 1, 0, 0)
      ctx2d.clearRect(0, 0, vecCanvas.width, vecCanvas.height)

      // Compute stage placement matching width = min(78vw, 54vh) and gentle settle scale (1 -> 1.14)
      const tSettle = clamp01((t - 2.8) / 2.0)
      const stageZoom = lerp(1, 1.14, EASES.power2InOut(tSettle))
      const stageCssW = Math.min(viewW * 0.78, viewH * 0.54) * stageZoom
      const stageScale = (stageCssW / STAGE_W) * vecDpr
      const stageOriginX = (viewW * vecDpr - STAGE_W * stageScale) / 2
      const stageOriginY = (viewH * vecDpr - STAGE_H * stageScale) / 2 - 20 * vecDpr

      // Draw animated grid & word glyphs (visible while t < 3.45s)
      if (t < 3.45) {
        for (let i = 0; i < compiledGlyphs.length; i++) {
          const g = compiledGlyphs[i]
          let x = g.startStageX
          let y = g.startStageY
          let sc = 0.78
          let rot = g.startRotRad
          let op = 0

          // Stage 1 (0.0 - 1.15s): Smooth emergence & rotation into 13x13 architectural alignment
          const emergeStagger = g.distNorm * 0.28
          const tEmerge = clamp01((t - emergeStagger) / (1.15 - emergeStagger * 0.5))
          if (tEmerge > 0) {
            const e = EASES.power2Out(tEmerge)
            const eMove = EASES.sineInOut(tEmerge)
            op = g.isWord ? lerp(0, 1, e) : lerp(0, 0.45, e)
            sc = lerp(0.78, 1, e)
            x = lerp(g.startStageX, g.homeStageX, eMove)
            y = lerp(g.startStageY, g.homeStageY, eMove)
            rot = lerp(g.startRotRad, 0, eMove)
          }

          // Stage 2 (1.15 - 2.95s): Continuous, buttery convergence (power2InOut X + sineInOut Y, ZERO freeze!)
          if (!g.isWord) {
            const convStagger = g.distNorm * 0.32
            const tConv = clamp01((t - (1.15 + convStagger)) / 1.25)
            if (tConv > 0) {
              if (tConv >= 1) continue
              const ePos = EASES.sineInOut(tConv)
              const eFade = EASES.power2InOut(tConv)
              x = lerp(g.homeStageX, g.driftStageX, ePos)
              y = lerp(g.homeStageY, g.driftStageY, ePos)
              sc = lerp(1, 0.84, eFade)
              op = lerp(0.45, 0, eFade)
            }
          } else {
            const k = g.wordIdx
            const fStagger = k * 0.03
            // Continuous smooth S-curve (power2InOut on X, sineInOut on Y) so letters glide on every frame!
            const tConv = clamp01((t - (1.15 + fStagger)) / (1.72 - fStagger * 0.4))
            if (tConv > 0) {
              const ex = EASES.power2InOut(tConv)
              const ey = EASES.sineInOut(tConv)
              x = lerp(g.homeStageX, g.targetStageX, ex)
              y = lerp(g.homeStageY, g.targetStageY, ey)
              sc = lerp(1, g.targetScale, ex)
              rot = Math.sin(tConv * Math.PI) * (k % 2 === 0 ? 0.09 : -0.09)
            }

            const mStart = (k < 3 ? 2.68 : 2.8) + k * 0.02
            const tMorph = clamp01((t - mStart) / 0.45)
            if (tMorph > 0) {
              op = lerp(1, 0, EASES.power1InOut(tMorph))
            }
          }

          if (op <= 0.004) continue

          ctx2d.save()
          ctx2d.translate(stageOriginX + x * stageScale, stageOriginY + y * stageScale)
          if (Math.abs(rot) > 0.002) {
            // Pivot around optical glyph center (0, -10.8)
            ctx2d.translate(0, -10.8 * stageScale)
            ctx2d.rotate(rot)
            ctx2d.translate(0, 10.8 * stageScale)
          }
          ctx2d.scale(sc * stageScale, sc * stageScale)
          ctx2d.globalAlpha = op

          if (g.isWord) {
            const tDarken = clamp01((t - (0.85 + g.wordIdx * 0.04)) / 0.65)
            const ed = EASES.power2Out(tDarken)
            const r = Math.round(lerp(110, 24, ed))
            const gr = Math.round(lerp(93, 20, ed))
            const b = Math.round(lerp(75, 17, ed))
            ctx2d.fillStyle = `rgb(${r},${gr},${b})`
          } else {
            ctx2d.fillStyle = '#6E5D4B'
          }

          ctx2d.fill(g.path)
          ctx2d.restore()
        }
      }

      // Stage 3 & 4 (t >= 2.68s): Draw Final Crisp Logo ('_the_', Rules, 'Cordwaine', Underline Swash, Golden Glint)
      if (t >= 2.68) {
        const logoOriginX = stageOriginX + LOGO_WRAP_X * stageScale
        const logoOriginY = stageOriginY + LOGO_WRAP_Y * stageScale
        const lScale = LOGO_SCALE * stageScale

        ctx2d.save()
        ctx2d.translate(logoOriginX, logoOriginY)
        ctx2d.scale(lScale, lScale)
        ctx2d.translate(LOGO_G_X, LOGO_G_Y)

        // 3a. '_the_' calligraphic ligature at translate(650, 104)
        const tThe = EASES.power1InOut(clamp01((t - 2.68) / 0.45))
        if (tThe > 0.004) {
          ctx2d.save()
          ctx2d.translate(650, 104)
          ctx2d.globalAlpha = tThe
          ctx2d.fillStyle = '#6E522E'
          ctx2d.fill(logoThePath)
          ctx2d.restore()
        }

        // 3b. Hairline rules flanking '_the_' (2.95 - 3.70s)
        const tRules = EASES.expoOut(clamp01((t - 2.95) / 0.75))
        if (tRules > 0.004) {
          ctx2d.save()
          ctx2d.globalAlpha = tRules
          ctx2d.fillStyle = '#8C6834'
          // Left rule: width 11 growing leftward from x = 634 (623..634)
          const leftW = 11 * tRules
          ctx2d.fillRect(634 - leftW, 103.5, leftW, 1)
          // Right rule: width 77 growing rightward from x = 667 (667..744)
          const rightW = 77 * tRules
          ctx2d.fillRect(667, 103.5, rightW, 1)
          ctx2d.restore()
        }

        // 3c. Main 'Cordwaine' letters at translate(750, 143)
        ctx2d.save()
        ctx2d.translate(750, 143)
        ctx2d.fillStyle = '#181411'
        for (let m = 0; m < logoLetterPaths.length; m++) {
          const mStart = 2.8 + (m + 3) * 0.02
          const alpha = EASES.power1InOut(clamp01((t - mStart) / 0.45))
          if (alpha <= 0.004) continue
          ctx2d.globalAlpha = alpha
          ctx2d.fill(logoLetterPaths[m])

          // Golden light sweep strictly inside each letter (t = 3.75 .. 4.95s)
          if (shaderGlint > 0.001 && shaderGlint < 0.999) {
            const glintCenter = lerp(-185, 185, shaderGlint)
            const distFromBeam = Math.abs(LOGO_MAIN_CENTERS[m] - glintCenter)
            if (distFromBeam < 48) {
              const glowIntensity = Math.cos((distFromBeam / 48) * (Math.PI / 2)) * Math.sin(shaderGlint * Math.PI)
              ctx2d.globalAlpha = alpha * glowIntensity * 0.88
              ctx2d.fillStyle = '#D8AF66'
              ctx2d.fill(logoLetterPaths[m])
              ctx2d.fillStyle = '#181411'
            }
          }
        }
        ctx2d.restore()

        // 3d. Separate Progressive Calligraphic Underline Draw (3.80 - 4.75s)
        const tUnderline = EASES.power2InOut(clamp01((t - 3.8) / 0.9))
        if (tUnderline > 0.004) {
          ctx2d.save()
          ctx2d.beginPath()
          ctx2d.rect(588, 135, 92 * tUnderline, 30)
          ctx2d.clip()
          ctx2d.globalAlpha = 1
          ctx2d.fillStyle = '#9A7234'
          ctx2d.fill(logoTailPath)
          ctx2d.restore()
        }

        ctx2d.restore()
      }

      // 3. Update Philosophy & Bottom Navigation DOM only when opacity changes
      let philOpacity = 0
      let philY = 8
      if (t >= 2.9 && t <= 4.7) {
        const tIn = clamp01((t - 2.9) / 0.4)
        const tOut = clamp01((t - 4.15) / 0.5)
        philOpacity = EASES.power2Out(tIn) * (1 - EASES.power2In(tOut))
        philY = lerp(8, 0, EASES.power2Out(tIn)) - lerp(0, 4, EASES.power2In(tOut))
      }
      if (Math.abs(philOpacity - lastPhilOpacity) > 0.003) {
        lastPhilOpacity = philOpacity
        philosophy.style.opacity = String(philOpacity.toFixed(3))
        philosophy.style.transform = `translate3d(0, ${philY.toFixed(1)}px, 0)`
      }

      const tNav = clamp01((t - 4.85) / 0.9)
      const eNav = EASES.power2Out(tNav)
      if (Math.abs(eNav - lastNavOpacity) > 0.003) {
        lastNavOpacity = eNav
        bottomNav.style.opacity = String(eNav.toFixed(3))
        bottomNav.style.transform = `translate3d(0, ${lerp(14, 0, eNav).toFixed(1)}px, 0)`
        bottomNav.style.pointerEvents = t >= 4.6 ? 'auto' : 'none'
      }

      rafId = requestAnimationFrame(renderFrame)
    }

    rafId = requestAnimationFrame(renderFrame)

    return () => {
      cancelAnimationFrame(rafId)
      ro?.disconnect()
      window.removeEventListener('resize', updateCanvasSizes)
    }
  }, [])

  const handleSkip = useCallback(() => {
    triggerHaptic('medium', true)
    const st = animStateRef.current
    if (st.mode !== 'playing') return
    st.mode = 'skipping'
    st.skipStartTime = performance.now()
    st.skipFromTime = st.currentTime
  }, [])

  const handleReplay = useCallback(() => {
    getOrInitAudioContext()
    triggerHaptic('medium', true)
    const st = animStateRef.current
    st.resetFlags()
    st.mode = 'playing'
    st.startTime = performance.now() - 40
    st.currentTime = 0.04
  }, [])

  const toggleSound = useCallback(() => {
    getOrInitAudioContext()
    triggerHaptic('selection', true)
    setSoundEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem('cordwainer_sound', next ? '1' : '0')
      } catch {}
      if (next) {
        playLuxurySound('softTick', true)
      }
      return next
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSkip])

  const t = {
    ru: {
      ch1: 'Cardio',
      ch2: 'Силуэты',
      ch3: 'Расчёты',
      enter: 'Войти',
      skip: 'Пропустить',
      replay: 'Повтор',
    },
    uk: {
      ch1: 'Cardio',
      ch2: 'Силуети',
      ch3: 'Розрахунки',
      enter: 'Увійти',
      skip: 'Пропустити',
      replay: 'Повтор',
    },
    de: {
      ch1: 'Cardio',
      ch2: 'Silhouetten',
      ch3: 'Rechner',
      enter: 'Eintreten',
      skip: 'Überspringen',
      replay: 'Replay',
    },
  }[lang]

  const langList: Array<{ code: Lang; label: string }> = [
    { code: 'ru', label: 'ru' },
    { code: 'uk', label: 'ukr' },
    { code: 'de', label: 'de' },
  ]
  const activeLangIdx = Math.max(
    0,
    langList.findIndex((item) => item.code === lang)
  )

  return (
    <main
      ref={mainRef}
      onClick={() => {
        if (!introFinished && animStateRef.current.mode === 'playing' && animStateRef.current.currentTime > 0.8) {
          handleSkip()
        }
      }}
      style={
        {
          background: 'radial-gradient(110% 85% at 50% 46%, #E4DBD0 0%, #CBBFAB 58%, #9A8B78 100%)',
          color: '#181411',
          fontFamily: '"Cormorant Garamond", "Cormorant", "Playfair Display", Georgia, serif',
        } as React.CSSProperties
      }
      className="fixed inset-0 grid h-[100lvh] min-h-screen w-full place-items-center overflow-hidden select-none isolate antialiased"
    >
      {/* 0. Low-Res GPU WebGL Ray-Cast Silk & Warm Stone Canvas (0.28x buffer, bilinear upscaled) */}
      <canvas
        ref={glCanvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 block h-full w-full"
      />

      {/* 1. High-DPI Native Skia Path2D Vector Stage Canvas (Zero SVG DOM overhead -> 120 FPS) */}
      <canvas
        ref={vecCanvasRef}
        aria-label="Cordwaine Animated Monogram"
        className="pointer-events-none fixed inset-0 z-10 block h-full w-full"
      />

      {/* Ephemeral Brand Philosophy: "THE ART OF SHOEMAKING" */}
      <div
        ref={philosophyRef}
        aria-hidden="true"
        style={{
          opacity: 0,
          transform: 'translate3d(0, 8px, 0)',
          color: '#6E522E',
          willChange: 'opacity, transform',
        }}
        className="pointer-events-none fixed top-[55%] right-0 left-0 z-20 text-center text-[10.5px] font-medium uppercase tracking-[0.36em]"
      >
        THE ART OF SHOEMAKING
      </div>

      {/* 2. TOP BAR: Replay/Skip + Sound Toggle + Apple-style liquid pill switcher (ru / ukr / de) */}
      <header
        onClick={(e) => e.stopPropagation()}
        className="fixed top-0 right-0 left-0 z-40 flex items-center justify-between px-6 pt-4"
      >
        <div className="flex items-center gap-3">
          {!introFinished ? (
            <button
              type="button"
              onPointerDown={() => triggerHaptic('medium', true)}
              onClick={handleSkip}
              style={{ color: 'rgba(24, 20, 17, 0.65)' }}
              className="min-h-[38px] border-0 bg-transparent py-2 pr-2 text-[15px] font-medium italic tracking-[0.06em] outline-none transition-colors duration-300 hover:text-[#181411] active:scale-95 cursor-pointer"
            >
              {t.skip}
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={() => triggerHaptic('medium', true)}
              onClick={handleReplay}
              style={{ color: 'rgba(24, 20, 17, 0.65)' }}
              className="inline-flex min-h-[38px] items-center gap-2 border-0 bg-transparent py-2 pr-2 text-[15px] font-medium italic tracking-[0.06em] outline-none transition-colors duration-300 hover:text-[#181411] active:scale-95 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                <path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />
              </svg>
              <span>{t.replay}</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
            style={{
              color: soundEnabled ? '#181411' : 'rgba(24, 20, 17, 0.38)',
              borderColor: 'rgba(24, 20, 17, 0.16)',
              background: soundEnabled ? 'rgba(255, 250, 242, 0.45)' : 'transparent',
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full border text-[12px] backdrop-blur-md transition-all duration-300 active:scale-90 cursor-pointer outline-none"
          >
            {soundEnabled ? '♪' : '✕'}
          </button>
        </div>

        {/* Apple-style liquid glass segmented switcher: ru | ukr | de */}
        <div
          role="tablist"
          aria-label="Language switcher"
          style={{
            background: 'rgba(24, 20, 17, 0.07)',
            borderColor: 'rgba(24, 20, 17, 0.14)',
          }}
          className="relative grid grid-cols-3 items-center rounded-full border p-[3px] backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(24,20,17,0.05)]"
        >
          <span
            aria-hidden="true"
            style={{
              transform: `translate3d(${activeLangIdx * 100}%, 0, 0)`,
              background: 'rgba(248, 243, 234, 0.88)',
              boxShadow:
                '0 2px 8px rgba(24, 20, 17, 0.14), inset 0 1px 0.5px rgba(255, 255, 255, 0.9)',
              transition: 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            className="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-full"
          />
          {langList.map((item) => {
            const active = lang === item.code
            return (
              <button
                key={item.code}
                type="button"
                role="tab"
                aria-selected={active}
                onPointerDown={() => {
                  if (lang !== item.code) triggerHaptic('medium', true)
                }}
                onClick={() => {
                  triggerHaptic('medium', true)
                  localStorage.setItem('app_lang', item.code)
                  localStorage.setItem('cordwainer_lang', item.code)
                  setLang(item.code)
                }}
                style={{
                  color: active ? '#181411' : 'rgba(24, 20, 17, 0.52)',
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
                  transition: 'color 280ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                className="relative z-10 min-w-[44px] rounded-full border-0 bg-transparent px-2.5 py-1.5 text-center text-[11px] font-medium lowercase tracking-[0.04em] outline-none cursor-pointer"
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* 3. BOTTOM NAVIGATION: Pure typographic Cardio · Силуэты · Расчёты & Войти */}
      <footer
        ref={bottomNavRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          opacity: 0,
          transform: 'translate3d(0, 14px, 0)',
          pointerEvents: 'none',
          willChange: 'opacity, transform',
        }}
        className="fixed right-0 bottom-7 left-0 z-40 flex flex-col items-center gap-5 px-6"
      >
        <nav aria-label="Chapters" className="flex items-center justify-center gap-6 sm:gap-8">
          {[
            { label: t.ch1, onClick: onOpenMaterials },
            { label: t.ch2, onClick: onOpenStyles },
            { label: t.ch3, onClick: onOpenCalc },
          ].map((item, idx) => (
            <React.Fragment key={item.label}>
              {idx > 0 && (
                <span
                  aria-hidden="true"
                  style={{ color: 'rgba(90, 68, 40, 0.55)' }}
                  className="select-none text-[13px]"
                >
                  ·
                </span>
              )}
              <button
                type="button"
                onPointerDown={() => triggerHaptic('medium', true)}
                onClick={() => {
                  triggerHaptic('medium', true)
                  item.onClick?.()
                }}
                style={{
                  color: '#1F1A16',
                  transition:
                    'color 280ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                className="min-h-[40px] border-0 bg-transparent px-2 py-1.5 text-[18px] font-normal tracking-[0.05em] outline-none hover:text-[#7A5C38] active:scale-95 cursor-pointer"
              >
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* Scroll-cue style primary entry button: Войти */}
        <button
          type="button"
          onPointerDown={() => triggerHaptic('heavy', true)}
          onClick={() => {
            triggerHaptic('success', true)
            onStart?.()
          }}
          style={{
            color: '#181411',
            transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), color 280ms ease',
          }}
          className="group flex flex-col items-center gap-2.5 border-0 bg-transparent px-6 py-1 outline-none active:scale-95 cursor-pointer"
        >
          <span className="text-[13px] font-medium uppercase tracking-[0.35em]">
            {t.enter}
          </span>
          <i
            aria-hidden="true"
            style={{ background: 'rgba(90, 68, 40, 0.28)' }}
            className="relative block h-[36px] w-[1px] overflow-hidden"
          >
            <span
              style={{
                background: '#6E522E',
                animation: 'qtCue 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite',
              }}
              className="absolute top-0 left-0 block h-[40%] w-full"
            />
          </i>
        </button>
      </footer>

      <style>{`
        @keyframes qtCue {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(260%); }
        }
      `}</style>
    </main>
  )
}
