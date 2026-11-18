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

// Kick off font preload immediately at module evaluation
void ensureMollaniFont()

// ---------------------------------------------------------------------------
// 1. HAUTE-COUTURE DIDONE VECTOR GLYPHS (For 13x13 Matrix & Fallback, 0 KB Latency)
// Pre-compiled into GPU Path2D objects once at module load for 0.00ms per-frame allocation
// ---------------------------------------------------------------------------
const DIDONE_GLYPH_PATHS: Record<string, string> = {
  "A": "M-11.70 11.85L-11.70 11.52L-10.74 11.52Q-9.68 11.52 -9.07 10.96Q-8.45 10.39 -7.95 8.93L-0.72 -11.85L0.98 -11.85L9.31 9.76Q9.68 10.76 10.11 11.14Q10.54 11.52 11.27 11.52L11.70 11.52L11.70 11.85L2.57 11.85L2.57 11.52L3.34 11.52Q4.60 11.52 5.16 11.23Q5.73 10.92 5.73 10.16Q5.73 9.89 5.66 9.51Q5.59 9.13 5.43 8.70L3.40 3.25L-5.59 3.25L-7.42 8.47Q-7.72 9.30 -7.72 9.89Q-7.72 10.79 -6.93 11.16Q-6.13 11.52 -4.37 11.52L-3.60 11.52L-3.60 11.85L-11.70 11.85ZM-5.49 2.92L3.27 2.92L0.85 -3.55Q-0.45 -6.90 -1.21 -9.53Q-1.51 -8.56 -1.78 -7.78Q-2.04 -7.00 -2.32 -6.16Q-2.60 -5.31 -3.04 -4.11L-5.49 2.92Z",
  "B": "M-9.21 11.85L-9.21 11.52L-8.78 11.52Q-6.06 11.52 -6.06 9.13L-6.06 -9.26Q-6.06 -11.52 -8.78 -11.52L-9.21 -11.52L-9.21 -11.85L-0.32 -11.85Q8.22 -11.85 8.22 -6.21Q8.22 -1.19 1.84 -0.70L1.84 -0.63Q5.79 -0.46 7.50 1.18Q9.21 2.82 9.21 5.48Q9.21 11.85 0.68 11.85L-9.21 11.85ZM-0.41 -0.73Q2.34 -0.73 3.50 -1.92Q4.66 -3.12 4.66 -5.91Q4.66 -8.96 3.49 -10.24Q2.31 -11.52 -0.48 -11.52L-2.70 -11.52L-2.70 -0.73L-0.41 -0.73ZM0.51 11.52Q3.30 11.52 4.48 10.13Q5.66 8.73 5.66 5.48Q5.66 2.32 4.50 0.96Q3.34 -0.40 0.58 -0.40L-2.70 -0.40L-2.70 11.52L0.51 11.52Z",
  "C": "M1.61 12.19Q-1.81 12.19 -4.10 10.66Q-6.39 9.13 -7.54 6.41Q-8.68 3.69 -8.68 0.07Q-8.68 -3.58 -7.52 -6.34Q-6.36 -9.09 -3.99 -10.64Q-1.61 -12.19 2.01 -12.19Q5.23 -12.19 6.95 -11.05Q8.68 -9.92 8.68 -8.37Q8.68 -7.24 7.85 -6.69Q7.02 -6.14 5.79 -6.14Q5.79 -9.23 4.80 -10.52Q3.80 -11.82 1.57 -11.82Q-1.94 -11.82 -3.47 -8.84Q-5.00 -5.88 -5.00 -0.10Q-5.00 5.88 -3.35 8.87Q-1.71 11.85 2.01 11.85Q4.27 11.85 5.64 10.71Q7.02 9.56 7.72 7.01Q8.55 7.34 8.55 8.27Q8.55 9.10 7.78 10.01Q7.02 10.92 5.48 11.56Q3.93 12.19 1.61 12.19Z",
  "D": "M-10.49 11.85L-10.49 11.52L-10.06 11.52Q-7.34 11.52 -7.34 9.13L-7.34 -9.26Q-7.34 -11.52 -10.06 -11.52L-10.49 -11.52L-10.49 -11.85L-0.33 -11.85Q4.82 -11.85 7.65 -8.76Q10.49 -5.68 10.49 -0.03Q10.49 3.58 9.28 6.26Q8.07 8.93 5.68 10.40Q3.29 11.85 -0.33 11.85L-10.49 11.85ZM-1.10 11.52Q3.05 11.52 4.93 8.78Q6.81 6.04 6.81 -0.03Q6.81 -6.07 4.95 -8.80Q3.09 -11.52 -1.06 -11.52L-3.98 -11.52L-3.98 11.52L-1.10 11.52Z",
  "E": "M-9.01 11.85L-9.01 11.52L-8.58 11.52Q-5.86 11.52 -5.86 9.13L-5.86 -9.26Q-5.86 -11.52 -8.58 -11.52L-9.01 -11.52L-9.01 -11.85L7.69 -11.85L7.89 -6.04L7.56 -6.04L7.49 -7.14Q7.35 -9.63 6.34 -10.57Q5.33 -11.52 2.81 -11.52L-2.50 -11.52L-2.50 -0.73L5.83 -0.73L5.83 -0.40L-2.50 -0.40L-2.50 11.52L3.64 11.52Q5.43 11.52 6.49 11.12Q7.56 10.72 8.03 9.76Q8.52 8.80 8.62 7.14L8.68 6.04L9.01 6.04L8.79 11.85L-9.01 11.85Z",
  "F": "M-8.47 11.85L-8.47 11.52L-8.04 11.52Q-5.31 11.52 -5.31 9.13L-5.31 -9.26Q-5.31 -11.52 -8.04 -11.52L-8.47 -11.52L-8.47 -11.85L8.27 -11.85L8.47 -6.04L8.13 -6.04L8.07 -7.14Q7.94 -9.63 6.90 -10.57Q5.88 -11.52 3.36 -11.52L-1.96 -11.52L-1.96 0.04L6.38 0.04L6.38 0.37L-1.96 0.37L-1.96 9.13Q-1.96 11.52 0.76 11.52L1.20 11.52L1.20 11.85L-8.47 11.85Z",
  "G": "M0.83 12.19Q-3.02 12.19 -5.56 10.66Q-8.10 9.13 -9.35 6.39Q-10.59 3.65 -10.59 -0.03Q-10.59 -3.62 -9.37 -6.35Q-8.14 -9.09 -5.63 -10.64Q-3.12 -12.19 0.70 -12.19Q4.38 -12.19 6.37 -11.17Q8.36 -10.16 8.36 -8.56Q8.36 -7.43 7.65 -6.85Q6.94 -6.27 5.28 -6.14Q5.28 -9.23 4.20 -10.54Q3.12 -11.85 0.56 -11.85Q-2.12 -11.85 -3.77 -10.67Q-5.41 -9.49 -6.16 -6.88Q-6.91 -4.28 -6.91 -0.03Q-6.91 4.25 -6.08 6.86Q-5.25 9.46 -3.42 10.66Q-1.60 11.85 1.36 11.85Q2.32 11.85 3.22 11.70Q4.12 11.55 4.81 11.36L4.81 3.49Q4.81 1.23 2.09 1.23L1.96 1.23L1.96 0.90L10.59 0.90L10.59 1.23L10.46 1.23Q9.16 1.23 8.67 1.83Q8.17 2.42 8.17 3.62L8.17 10.66Q6.51 11.42 4.74 11.81Q2.99 12.19 0.83 12.19Z",
  "H": "M-11.88 11.85L-11.88 11.52L-11.45 11.52Q-8.73 11.52 -8.73 9.13L-8.73 -9.26Q-8.73 -11.52 -11.45 -11.52L-11.88 -11.52L-11.88 -11.85L-2.23 -11.85L-2.23 -11.52L-2.66 -11.52Q-5.38 -11.52 -5.38 -9.13L-5.38 -0.70L5.38 -0.70L5.38 -9.13Q5.38 -11.52 2.66 -11.52L2.23 -11.52L2.23 -11.85L11.88 -11.85L11.88 -11.52L11.45 -11.52Q8.73 -11.52 8.73 -9.26L8.73 9.13Q8.73 11.52 11.45 11.52L11.88 11.52L11.88 11.85L2.23 11.85L2.23 11.52L2.66 11.52Q5.38 11.52 5.38 9.13L5.38 -0.36L-5.38 -0.36L-5.38 9.13Q-5.38 11.52 -2.66 11.52L-2.23 11.52L-2.23 11.85L-11.88 11.85Z",
  "I": "M-4.83 11.85L-4.83 11.52L-4.40 11.52Q-1.68 11.52 -1.68 9.13L-1.68 -9.26Q-1.68 -11.52 -4.40 -11.52L-4.83 -11.52L-4.83 -11.85L4.83 -11.85L4.83 -11.52L4.40 -11.52Q1.68 -11.52 1.68 -9.13L1.68 9.13Q1.68 11.52 4.40 11.52L4.83 11.52L4.83 11.85L-4.83 11.85Z",
  "J": "M-5.64 19.82L-5.64 19.49L-5.35 19.49Q-3.92 19.49 -2.93 18.94Q-1.93 18.39 -1.40 17.05Q-0.87 15.70 -0.87 13.38L-0.87 -9.26Q-0.87 -11.52 -3.59 -11.52L-4.02 -11.52L-4.02 -11.85L5.64 -11.85L5.64 -11.52L5.21 -11.52Q2.49 -11.52 2.49 -9.13L2.49 12.12Q2.49 15.07 1.47 16.77Q0.46 18.46 -1.25 19.14Q-2.96 19.82 -5.08 19.82L-5.64 19.82Z",
  "K": "M-11.19 11.85L-11.19 11.52L-10.76 11.52Q-8.04 11.52 -8.04 9.13L-8.04 -9.26Q-8.04 -11.52 -10.76 -11.52L-11.19 -11.52L-11.19 -11.85L-1.53 -11.85L-1.53 -11.52L-1.96 -11.52Q-4.68 -11.52 -4.68 -9.13L-4.68 2.03L3.79 -7.57Q5.51 -9.49 5.51 -10.39Q5.51 -11.49 2.39 -11.49L2.39 -11.85L9.73 -11.85L9.73 -11.49Q8.60 -11.49 7.57 -10.81Q6.54 -10.13 4.95 -8.33L-0.17 -2.59L7.14 7.77Q8.66 9.89 9.51 10.71Q10.36 11.52 11.12 11.52L11.19 11.52L11.19 11.85L10.82 11.85Q9.16 11.85 8.08 11.72Q7.00 11.59 6.31 11.26Q5.61 10.92 5.05 10.34Q4.48 9.76 3.85 8.87L-2.39 -0.07L-4.68 2.56L-4.68 9.13Q-4.68 11.52 -1.96 11.52L-1.53 11.52L-1.53 11.85L-11.19 11.85Z",
  "L": "M-9.01 11.85L-9.01 11.52L-8.58 11.52Q-5.86 11.52 -5.86 9.13L-5.86 -9.26Q-5.86 -11.52 -8.58 -11.52L-9.01 -11.52L-9.01 -11.85L0.65 -11.85L0.65 -11.52L0.22 -11.52Q-2.50 -11.52 -2.50 -9.13L-2.50 11.52L3.64 11.52Q5.40 11.52 6.44 11.01Q7.49 10.49 7.99 9.23Q8.48 7.97 8.62 5.81L8.68 4.72L9.01 4.72L8.79 11.85L-9.01 11.85Z",
  "M": "M-14.31 11.85L-14.31 11.52L-13.01 11.52Q-10.29 11.52 -10.29 9.13L-10.29 -9.26Q-10.29 -11.52 -13.01 -11.52L-14.31 -11.52L-14.31 -11.85L-7.57 -11.85L0.89 8.13L8.24 -11.85L14.31 -11.85L14.31 -11.52L13.88 -11.52Q11.16 -11.52 11.16 -9.13L11.16 9.13Q11.16 11.52 13.88 11.52L14.31 11.52L14.31 11.85L5.48 11.85L5.48 11.52L5.58 11.52Q6.67 11.52 7.32 10.92Q7.97 10.33 7.97 9.13L7.97 -10.13L-0.10 11.85L-0.89 11.85L-9.96 -9.70L-9.96 9.13Q-9.96 11.52 -7.24 11.52L-6.64 11.52L-6.64 11.85L-14.31 11.85Z",
  "N": "M-11.57 11.85L-11.57 11.52L-10.61 11.52Q-7.88 11.52 -7.88 9.13L-7.88 -9.26Q-7.88 -11.52 -10.61 -11.52L-11.57 -11.52L-11.57 -11.85L-5.10 -11.85L7.56 7.11L7.56 -9.13Q7.56 -11.52 4.83 -11.52L3.90 -11.52L3.90 -11.85L11.57 -11.85L11.57 -11.52L10.61 -11.52Q7.89 -11.52 7.89 -9.13L7.89 11.85L6.89 11.85L-7.55 -9.79L-7.55 9.13Q-7.55 11.52 -4.83 11.52L-3.90 11.52L-3.90 11.85L-11.57 11.85Z",
  "O": "M0.02 12.19Q-3.50 12.19 -5.83 10.66Q-8.15 9.13 -9.30 6.38Q-10.44 3.62 -10.44 -0.07Q-10.44 -3.75 -9.30 -6.47Q-8.15 -9.20 -5.81 -10.71Q-3.47 -12.22 0.05 -12.22Q3.40 -12.22 5.71 -10.71Q8.02 -9.20 9.23 -6.46Q10.44 -3.72 10.44 -0.03Q10.44 3.65 9.23 6.39Q8.02 9.13 5.70 10.66Q3.37 12.19 0.02 12.19ZM0.02 11.85Q3.57 11.85 5.16 9.03Q6.76 6.21 6.76 -0.03Q6.76 -6.27 5.16 -9.08Q3.57 -11.88 0.05 -11.88Q-3.50 -11.88 -5.13 -9.08Q-6.75 -6.27 -6.75 -0.03Q-6.75 6.21 -5.15 9.03Q-3.53 11.85 0.02 11.85Z",
  "P": "M-8.75 11.85L-8.75 11.52L-8.32 11.52Q-5.59 11.52 -5.59 9.13L-5.59 -9.26Q-5.59 -11.52 -8.32 -11.52L-8.75 -11.52L-8.75 -11.85L0.58 -11.85Q4.76 -11.85 6.76 -10.01Q8.75 -8.17 8.75 -4.91Q8.75 -2.95 7.90 -1.22Q7.06 0.50 5.10 1.56Q3.14 2.62 -0.15 2.62L-2.24 2.62L-2.24 9.13Q-2.24 11.52 0.48 11.52L0.92 11.52L0.92 11.85L-8.75 11.85ZM-0.48 2.29Q2.58 2.29 3.87 0.67Q5.16 -0.96 5.16 -4.78Q5.16 -8.43 3.98 -9.98Q2.80 -11.52 0.02 -11.52L-2.24 -11.52L-2.24 2.29L-0.48 2.29Z",
  "Q": "M6.26 19.49Q4.50 19.49 2.82 18.83Q1.15 18.16 -0.02 16.55Q-1.18 14.94 -1.41 12.12Q-4.43 11.79 -6.44 10.19Q-8.45 8.60 -9.45 5.98Q-10.44 3.36 -10.44 -0.07Q-10.44 -3.75 -9.30 -6.47Q-8.15 -9.20 -5.81 -10.71Q-3.47 -12.22 0.05 -12.22Q3.40 -12.22 5.71 -10.71Q8.02 -9.20 9.23 -6.46Q10.44 -3.72 10.44 -0.03Q10.44 4.81 8.33 8.04Q6.23 11.26 2.24 11.99Q2.41 14.87 3.06 16.42Q3.70 17.96 4.76 18.56Q5.83 19.16 7.15 19.16L7.69 19.16L7.69 19.49L6.26 19.49ZM0.02 11.85Q3.57 11.85 5.16 9.03Q6.76 6.21 6.76 -0.03Q6.76 -6.27 5.16 -9.08Q3.57 -11.88 0.05 -11.88Q-3.50 -11.88 -5.13 -9.08Q-6.75 -6.27 -6.75 -0.03Q-6.75 6.21 -5.15 9.03Q-3.53 11.85 0.02 11.85Z",
  "R": "M-10.36 11.85L-10.36 11.52L-9.93 11.52Q-7.21 11.52 -7.21 9.13L-7.21 -9.26Q-7.21 -11.52 -9.93 -11.52L-10.36 -11.52L-10.36 -11.85L-1.43 -11.85Q2.89 -11.85 5.00 -10.24Q7.11 -8.63 7.11 -5.64Q7.11 -3.72 6.32 -2.47Q5.55 -1.23 4.33 -0.53Q3.12 0.17 1.83 0.53L6.51 7.84Q7.87 9.96 8.66 10.74Q9.46 11.52 10.26 11.52L10.36 11.52L10.36 11.85L9.89 11.85Q8.33 11.85 7.32 11.74Q6.31 11.62 5.64 11.32Q4.98 11.02 4.47 10.44Q3.95 9.86 3.35 8.93L-1.76 0.80L-3.85 0.80L-3.85 9.13Q-3.85 11.52 -1.13 11.52L-0.70 11.52L-0.70 11.85L-10.36 11.85ZM-1.53 0.47Q1.23 0.47 2.39 -0.88Q3.55 -2.23 3.55 -5.41Q3.55 -8.70 2.36 -10.11Q1.16 -11.52 -1.59 -11.52L-3.85 -11.52L-3.85 0.47L-1.53 0.47Z",
  "S": "M-0.41 12.19Q-3.70 12.19 -5.55 10.87Q-7.39 9.56 -7.39 7.60Q-7.39 5.28 -5.00 5.28Q-4.96 8.53 -3.79 10.19Q-2.60 11.85 -0.18 11.85Q1.95 11.85 3.25 10.61Q4.57 9.36 4.57 6.94Q4.57 5.45 4.02 4.52Q3.47 3.58 2.26 2.84Q1.05 2.09 -0.91 1.20Q-1.94 0.70 -3.02 0.12Q-4.10 -0.46 -5.01 -1.28Q-5.92 -2.09 -6.47 -3.27Q-7.02 -4.45 -7.02 -6.07Q-7.02 -9.06 -5.11 -10.62Q-3.20 -12.19 -0.02 -12.19Q1.95 -12.19 3.39 -11.65Q4.83 -11.12 5.64 -10.26Q6.46 -9.39 6.46 -8.37Q6.46 -7.40 5.73 -6.85Q5.00 -6.31 3.83 -6.31Q3.83 -9.06 2.94 -10.46Q2.04 -11.85 -0.05 -11.85Q-1.98 -11.85 -3.12 -10.69Q-4.26 -9.53 -4.26 -7.27Q-4.26 -5.64 -3.67 -4.65Q-3.07 -3.65 -1.86 -2.94Q-0.65 -2.23 1.18 -1.36Q2.84 -0.60 4.25 0.23Q5.66 1.06 6.52 2.32Q7.39 3.58 7.39 5.64Q7.39 8.67 5.34 10.43Q3.30 12.19 -0.41 12.19Z",
  "T": "M-4.86 11.85L-4.86 11.52L-4.43 11.52Q-1.71 11.52 -1.71 9.13L-1.71 -11.52L-4.43 -11.52Q-6.95 -11.52 -7.95 -10.57Q-8.95 -9.63 -9.11 -7.14L-9.18 -6.04L-9.51 -6.04L-9.31 -11.85L9.31 -11.85L9.51 -6.04L9.18 -6.04L9.11 -7.14Q8.98 -9.63 7.97 -10.57Q6.95 -11.52 4.43 -11.52L1.64 -11.52L1.64 9.13Q1.64 11.52 4.37 11.52L4.80 11.52L4.80 11.85L-4.86 11.85Z",
  "U": "M0.12 12.19Q-3.80 12.19 -6.03 10.46Q-8.25 8.73 -8.25 4.68L-8.25 -9.26Q-8.25 -11.52 -10.97 -11.52L-11.40 -11.52L-11.40 -11.85L-1.75 -11.85L-1.75 -11.52L-2.18 -11.52Q-4.90 -11.52 -4.90 -9.16L-4.90 4.88Q-4.90 7.54 -4.18 9.03Q-3.47 10.53 -2.21 11.11Q-0.95 11.69 0.65 11.69Q4.03 11.69 5.97 9.91Q7.92 8.13 7.92 5.02L7.92 -9.26Q7.92 -11.52 5.20 -11.52L4.76 -11.52L4.76 -11.85L11.40 -11.85L11.40 -11.52L10.97 -11.52Q8.25 -11.52 8.25 -9.13L8.25 5.08Q8.25 8.40 6.15 10.29Q4.06 12.19 0.12 12.19Z",
  "V": "M-8.38 -9.73Q-8.71 -10.75 -9.23 -11.14Q-9.74 -11.52 -10.77 -11.52L-11.21 -11.52L-11.21 -11.85L-2.07 -11.85L-2.07 -11.52L-2.87 -11.52Q-3.93 -11.52 -4.43 -11.24Q-4.93 -10.96 -4.93 -10.26Q-4.93 -9.59 -4.60 -8.70L-0.48 3.15Q0.68 6.44 1.31 8.93Q1.68 7.67 2.17 6.13Q2.67 4.58 3.14 3.15L6.92 -8.43Q7.09 -8.96 7.18 -9.36Q7.29 -9.76 7.29 -10.09Q7.29 -10.89 6.75 -11.21Q6.22 -11.52 5.06 -11.52L3.10 -11.52L3.10 -11.85L11.21 -11.85L11.21 -11.52L10.01 -11.52Q9.08 -11.52 8.53 -10.97Q7.98 -10.42 7.52 -8.96L0.65 11.85L-0.78 11.85L-8.38 -9.73Z",
  "W": "M-14.00 -9.76Q-14.29 -10.75 -14.79 -11.14Q-15.29 -11.52 -16.35 -11.52L-16.78 -11.52L-16.78 -11.85L-7.65 -11.85L-7.65 -11.52L-8.42 -11.52Q-9.45 -11.52 -9.93 -11.22Q-10.41 -10.92 -10.41 -10.19Q-10.41 -9.66 -10.14 -8.70L-6.59 2.99Q-6.13 4.48 -5.78 6.03Q-5.43 7.57 -5.10 9.20Q-4.90 8.23 -4.55 6.86Q-4.20 5.48 -3.80 3.89L0.15 -11.62L1.54 -11.62L6.39 2.75Q7.09 4.81 7.60 6.62Q8.12 8.43 8.38 9.60Q8.58 8.83 8.69 8.39Q8.81 7.94 8.96 7.37Q9.11 6.81 9.38 5.78L13.06 -8.17Q13.36 -9.26 13.36 -9.92Q13.36 -10.82 12.81 -11.17Q12.27 -11.52 11.11 -11.52L10.34 -11.52L10.34 -11.85L16.78 -11.85L16.78 -11.52L16.15 -11.52Q15.12 -11.52 14.57 -10.96Q14.03 -10.39 13.63 -8.93L8.12 11.85L6.13 11.85L-0.45 -7.97L-5.36 11.85L-7.42 11.85L-14.00 -9.76Z",
  "X": "M-10.69 11.85L-10.69 11.52L-9.96 11.52Q-9.00 11.52 -8.28 11.01Q-7.57 10.49 -6.67 9.13L-1.16 0.73L-7.00 -9.73Q-7.57 -10.75 -8.19 -11.14Q-8.80 -11.52 -9.86 -11.52L-10.26 -11.52L-10.26 -11.85L-1.26 -11.85L-1.26 -11.52L-1.56 -11.52Q-3.39 -11.52 -3.39 -10.56Q-3.39 -9.86 -2.66 -8.60L1.00 -2.09L5.21 -8.53Q6.17 -9.99 6.17 -10.62Q6.17 -11.52 4.25 -11.52L2.62 -11.52L2.62 -11.85L9.89 -11.85L9.89 -11.52L9.30 -11.52Q8.33 -11.52 7.62 -11.00Q6.90 -10.49 6.01 -9.13L1.16 -1.73L7.57 9.73Q8.13 10.76 8.75 11.14Q9.36 11.52 10.43 11.52L10.69 11.52L10.69 11.85L1.73 11.85L1.73 11.52L2.13 11.52Q3.95 11.52 3.95 10.56Q3.95 9.86 3.22 8.60L-1.00 1.06L-5.88 8.53Q-6.84 10.00 -6.84 10.62Q-6.84 11.52 -4.91 11.52L-2.79 11.52L-2.79 11.85L-10.69 11.85Z",
  "Y": "M-5.18 11.85L-5.18 11.52L-4.41 11.52Q-1.69 11.52 -1.69 9.13L-1.69 1.46L-7.60 -9.76Q-8.13 -10.75 -8.63 -11.14Q-9.13 -11.52 -9.96 -11.52L-10.62 -11.52L-10.62 -11.85L-1.49 -11.85L-1.49 -11.52L-2.62 -11.52Q-4.15 -11.52 -4.15 -10.62Q-4.15 -10.03 -3.49 -8.70L-0.63 -3.19Q0.07 -1.86 0.61 -0.73Q1.16 0.40 1.49 1.16Q1.89 0.40 2.47 -0.76Q3.06 -1.92 3.72 -3.19L6.24 -8.07Q7.04 -9.56 7.04 -10.36Q7.04 -11.02 6.51 -11.27Q5.98 -11.52 4.85 -11.52L3.52 -11.52L3.52 -11.85L10.62 -11.85L10.62 -11.52L9.79 -11.52Q9.00 -11.52 8.41 -10.96Q7.83 -10.39 7.07 -8.93L1.66 1.53L1.66 9.13Q1.66 11.52 4.38 11.52L5.15 11.52L5.15 11.85L-5.18 11.85Z",
  "Z": "M-8.55 11.85L-8.55 11.52L4.23 -11.52L-2.60 -11.52Q-4.43 -11.52 -5.49 -11.09Q-6.56 -10.66 -7.04 -9.64Q-7.52 -8.63 -7.58 -6.87L-7.62 -6.04L-7.95 -6.04L-7.75 -11.85L7.99 -11.85L7.99 -11.52L-4.79 11.52L3.17 11.52Q4.93 11.52 5.96 11.09Q6.99 10.66 7.51 9.65Q8.02 8.63 8.15 6.87L8.22 6.04L8.55 6.04L8.35 11.85L-8.55 11.85Z"
}

const THE_ITALIC_PATH_D = 'M-12.82 -16.84Q-15.27 -16.84 -15.27 -19.47Q-15.27 -19.88 -15.20 -20.40Q-15.13 -20.93 -15.04 -21.36L-13.45 -28.90L-15.15 -28.90L-15.11 -29.12Q-13.87 -29.12 -13.11 -29.39Q-12.34 -29.66 -11.85 -30.27Q-11.35 -30.88 -10.92 -31.89L-10.70 -31.89L-11.29 -29.12L-8.56 -29.12L-8.61 -28.90L-11.33 -28.90L-12.93 -21.43Q-13.04 -20.87 -13.12 -20.36Q-13.20 -19.85 -13.20 -19.49Q-13.20 -18.48 -12.79 -18.04Q-12.39 -17.60 -11.65 -17.60Q-11.22 -17.60 -10.73 -17.75Q-10.25 -17.90 -9.89 -18.12L-9.78 -17.92Q-10.45 -17.45 -11.21 -17.14Q-11.96 -16.84 -12.82 -16.84ZM1.58 -16.84Q0.60 -16.84 0.06 -17.48Q-0.46 -18.12 -0.46 -19.09Q-0.46 -20.12 -0.03 -22.12L0.35 -23.88Q0.46 -24.33 0.64 -25.18Q0.82 -26.04 0.82 -26.83Q0.82 -27.23 0.73 -27.67Q0.64 -28.11 0.38 -28.41Q0.12 -28.72 -0.40 -28.72Q-1.03 -28.72 -1.64 -28.27Q-2.26 -27.82 -2.78 -27.14Q-3.30 -26.47 -3.65 -25.74Q-4.00 -25.00 -4.11 -24.47L-5.68 -17.06L-7.78 -17.06L-4.69 -31.69Q-4.58 -32.14 -4.54 -32.46Q-4.49 -32.79 -4.49 -32.88Q-4.49 -33.55 -4.95 -33.74Q-5.41 -33.94 -6.07 -33.94L-6.25 -33.94L-6.20 -34.16L-2.06 -34.16L-2.94 -30.02Q-3.18 -28.83 -3.44 -27.77Q-3.70 -26.72 -3.82 -26.29L-3.73 -26.29Q-2.78 -27.77 -1.76 -28.55Q-0.73 -29.33 0.57 -29.33Q1.90 -29.33 2.44 -28.57Q2.98 -27.82 2.98 -26.83Q2.98 -26.27 2.83 -25.60Q2.69 -24.94 2.57 -24.35L1.99 -21.70Q1.85 -21.07 1.77 -20.46Q1.70 -19.85 1.70 -19.33Q1.70 -17.67 2.87 -17.67Q3.38 -17.67 4.20 -18.30L4.33 -18.12Q3.79 -17.67 3.13 -17.25Q2.46 -16.84 1.58 -16.84ZM9.95 -16.84Q8.76 -16.84 7.76 -17.35Q6.76 -17.87 6.16 -18.89Q5.57 -19.92 5.57 -21.50Q5.57 -22.75 5.99 -24.11Q6.42 -25.48 7.28 -26.67Q8.13 -27.86 9.38 -28.60Q10.63 -29.35 12.27 -29.35Q13.69 -29.35 14.48 -28.66Q15.27 -27.98 15.27 -26.76Q15.27 -25.68 14.42 -24.74Q13.58 -23.81 12.12 -23.23Q10.65 -22.64 8.81 -22.64L8.02 -22.64Q7.91 -21.97 7.91 -21.32Q7.91 -19.29 8.48 -18.18Q9.05 -17.06 10.16 -17.06Q11.44 -17.06 12.20 -17.85Q12.97 -18.64 13.37 -19.88Q13.85 -19.74 13.85 -19.20Q13.85 -18.77 13.43 -18.21Q13.02 -17.65 12.16 -17.24Q11.30 -16.84 9.95 -16.84ZM8.67 -22.87Q10.67 -22.87 11.81 -23.97Q12.95 -25.07 12.95 -26.92Q12.95 -29.10 11.73 -29.10Q11.06 -29.10 10.47 -28.55Q9.89 -28.00 9.41 -27.08Q8.94 -26.15 8.60 -25.05Q8.27 -23.95 8.07 -22.87L8.67 -22.87Z'
const DIAMOND_RULES_PATH_D = 'M-92.00 -24.85L-25.80 -24.85L-24.00 -26.55L-22.20 -24.85L-22.20 -24.15L-24.00 -22.45L-25.80 -24.15L-92.00 -24.15ZM92.00 -24.85L25.80 -24.85L24.00 -26.55L22.20 -24.85L22.20 -24.15L24.00 -22.45L25.80 -24.15L92.00 -24.15Z'
const GOLD_SWASH_PATH_D = 'M-118.00 16.20L-115.81 17.06L-113.63 17.61L-111.44 18.06L-109.26 18.43L-107.07 18.74L-104.88 19.01L-102.70 19.23L-100.51 19.42L-98.33 19.57L-96.14 19.68L-93.95 19.77L-91.77 19.83L-89.58 19.86L-87.40 19.86L-85.21 19.85L-83.02 19.81L-80.84 19.75L-78.65 19.67L-76.47 19.58L-74.28 19.47L-72.09 19.34L-69.91 19.20L-67.72 19.04L-65.53 18.88L-63.35 18.70L-61.16 18.50L-58.98 18.30L-56.79 18.09L-54.60 17.87L-52.42 17.63L-50.23 17.39L-48.05 17.14L-45.86 16.88L-43.67 16.61L-41.49 16.33L-39.30 16.05L-37.12 15.75L-34.93 15.45L-32.74 15.14L-30.56 14.82L-28.37 14.49L-26.19 14.16L-24.00 13.80L-24.00 13.80L-26.19 14.22L-28.37 14.65L-30.56 15.10L-32.74 15.55L-34.93 16.01L-37.12 16.47L-39.30 16.92L-41.49 17.37L-43.67 17.82L-45.86 18.25L-48.05 18.68L-50.23 19.09L-52.42 19.49L-54.60 19.86L-56.79 20.22L-58.98 20.56L-61.16 20.88L-63.35 21.16L-65.53 21.42L-67.72 21.66L-69.91 21.86L-72.09 22.02L-74.28 22.16L-76.47 22.25L-78.65 22.32L-80.84 22.34L-83.02 22.33L-85.21 22.27L-87.40 22.18L-89.58 22.05L-91.77 21.87L-93.95 21.66L-96.14 21.41L-98.33 21.11L-100.51 20.77L-102.70 20.40L-104.88 19.98L-107.07 19.52L-109.26 19.01L-111.44 18.46L-113.63 17.85L-115.81 17.16L-118.00 16.20Z'

const LOGO_TARGETS: Array<{ char: string; x: number; y: number; scale: number }> = [
  {
    "char": "C",
    "x": -106.8,
    "y": -1.6,
    "scale": 1.38
  },
  {
    "char": "O",
    "x": -78.76,
    "y": 0.0,
    "scale": 1.04
  },
  {
    "char": "R",
    "x": -52.13,
    "y": 0.0,
    "scale": 1.04
  },
  {
    "char": "D",
    "x": -25.64,
    "y": 0.0,
    "scale": 1.04
  },
  {
    "char": "W",
    "x": 7.32,
    "y": 0.0,
    "scale": 1.04
  },
  {
    "char": "A",
    "x": 39.15,
    "y": 0.0,
    "scale": 1.04
  },
  {
    "char": "I",
    "x": 60.74,
    "y": 0.0,
    "scale": 1.04
  },
  {
    "char": "N",
    "x": 83.0,
    "y": 0.0,
    "scale": 1.04
  },
  {
    "char": "E",
    "x": 109.41,
    "y": 0.0,
    "scale": 1.04
  }
]

type CompiledPaths = {
  glyphs: Record<string, Path2D>
  thePath: Path2D
  rulesPath: Path2D
  swashPath: Path2D
}

let cachedPaths: CompiledPaths | null = null
function getCompiledPaths(): CompiledPaths | null {
  if (typeof Path2D === 'undefined') return null
  if (cachedPaths) return cachedPaths
  const glyphs: Record<string, Path2D> = {}
  for (const [k, d] of Object.entries(DIDONE_GLYPH_PATHS)) {
    glyphs[k] = new Path2D(d)
  }
  cachedPaths = {
    glyphs,
    thePath: new Path2D(THE_ITALIC_PATH_D),
    rulesPath: new Path2D(DIAMOND_RULES_PATH_D),
    swashPath: new Path2D(GOLD_SWASH_PATH_D),
  }
  return cachedPaths
}

// ---------------------------------------------------------------------------
// 2. PROCEDURAL BESPOKE ATELIER SOUND ENGINE + HIGH-GAIN MASTER COMPRESSOR
// Boosted 3.8x with DynamicsCompressorNode so every detail is clearly audible on phone speakers
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

  // Stage 1: Warm linen/parchment whisper as letters appear in the 13x13 grid
  public linenWhisper(intensity = 1): void {
    if (!this.enabled) return
    const c = this.getContext()
    const dest = this.getDestination()
    if (!c || !dest) return
    try {
      const t0 = c.currentTime
      const dur = 0.085
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
      const pk = 0.14 * intensity
      gain.gain.setValueAtTime(0.001, t0)
      gain.gain.linearRampToValueAtTime(pk, t0 + 0.016)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

      src.connect(filter)
      filter.connect(gain)
      gain.connect(dest)
      src.start(t0)
      src.stop(t0 + dur + 0.01)
    } catch {}
  }

  // Stage 2: Warm suede air swell during orbital convergence
  public suedeSwell(): void {
    if (!this.enabled) return
    const c = this.getContext()
    const dest = this.getDestination()
    if (!c || !dest) return
    try {
      const t0 = c.currentTime
      const dur = 1.15
      const len = Math.floor(c.sampleRate * dur)
      const buf = c.createBuffer(1, len, c.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) {
        const p = i / len
        const env = Math.sin(p * Math.PI) * (1 - p * 0.25)
        data[i] = (Math.random() * 2 - 1) * env * 0.5
      }
      const src = c.createBufferSource()
      src.buffer = buf

      const filter = c.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(260, t0)
      filter.frequency.exponentialRampToValueAtTime(880, t0 + dur * 0.55)
      filter.frequency.exponentialRampToValueAtTime(220, t0 + dur)

      const gain = c.createGain()
      gain.gain.setValueAtTime(0.001, t0)
      gain.gain.linearRampToValueAtTime(0.18, t0 + dur * 0.48)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

      src.connect(filter)
      filter.connect(gain)
      gain.connect(dest)
      src.start(t0)
      src.stop(t0 + dur + 0.02)
    } catch {}
  }

  // Stage 3: Warm Felt Piano Dmaj9 chord when Cordwaine locks into center
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

  // Stage 4: Subtle golden harmonic shimmer during light pass
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

  // Crisp tactile micro-tick for UI buttons
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
// Upgraded impact strength + reinforced dual-pulse bridge + high-gain sub-bass tactile thump
// ---------------------------------------------------------------------------
function haptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  const tgStyle: 'medium' | 'heavy' | 'rigid' =
    style === 'light' ? 'medium' : style === 'medium' ? 'heavy' : 'rigid'

  // Channel 1: Official Telegram WebApp HapticFeedback API
  try {
    const hf = getWin().Telegram?.WebApp?.HapticFeedback
    hf?.impactOccurred?.(tgStyle)
    if (style === 'heavy') {
      hf?.notificationOccurred?.('success')
    }
  } catch {}

  // Channel 2: Direct Android TelegramWebviewProxy Native Bridge (with reinforced pulse for One UI 7 / HyperOS)
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

  // Channel 3A: Android Navigator Vibration API (multi-pulse envelope for LRA linear actuators)
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      const pattern =
        style === 'heavy' ? [36, 28, 46] : style === 'medium' ? [26, 24, 20] : [18]
      navigator.vibrate(pattern)
    }
  } catch {}

  // Channel 3B: High-gain dual-frequency sub-bass tactile impulse + transient click via AudioContext
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
// Matches the exact iPhone 1000057245.mp4 palette (Zero yellow cast, rich 3D vignette)
// ---------------------------------------------------------------------------
type PrebakedTextures = {
  bgCanvas: HTMLCanvasElement
  glowCanvas: HTMLCanvasElement
  rayCanvas: HTMLCanvasElement
}

function createPrebakedTextures(): PrebakedTextures | null {
  if (typeof document === 'undefined') return null

  // 1. Ray-Cast Alabaster-Pearl & Smoked-Pewter Normal-Map Spotlight (180x360)
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

  // 2. Pre-rendered Radial Pure-Pearl Halo Sprite (256x256)
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

  // 3. Pre-rendered Diagonal Specular Ray Sprite (256x256)
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

  return { bgCanvas, glowCanvas, rayCanvas }
}

// ---------------------------------------------------------------------------
// 5. DETERMINISTIC 13x13 MATRIX DATA ("THE" / "CORD" / "WAINE")
// ---------------------------------------------------------------------------
const GRID_SIZE = 13
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE

type WordTargetSpec = {
  char: string
  row: number
  col: number
  wordGroup: 0 | 1 | 2
  logoIndex: number
}

const WORD_SPECS: WordTargetSpec[] = [
  // Row 3: T H E
  { char: 'T', row: 3, col: 5, wordGroup: 0, logoIndex: -1 },
  { char: 'H', row: 3, col: 6, wordGroup: 0, logoIndex: -1 },
  { char: 'E', row: 3, col: 7, wordGroup: 0, logoIndex: -1 },
  // Row 6: C O R D
  { char: 'C', row: 6, col: 4, wordGroup: 1, logoIndex: 0 },
  { char: 'O', row: 6, col: 5, wordGroup: 1, logoIndex: 1 },
  { char: 'R', row: 6, col: 6, wordGroup: 1, logoIndex: 2 },
  { char: 'D', row: 6, col: 7, wordGroup: 1, logoIndex: 3 },
  // Row 9: W A I N E
  { char: 'W', row: 9, col: 4, wordGroup: 2, logoIndex: 4 },
  { char: 'A', row: 9, col: 5, wordGroup: 2, logoIndex: 5 },
  { char: 'I', row: 9, col: 6, wordGroup: 2, logoIndex: 6 },
  { char: 'N', row: 9, col: 7, wordGroup: 2, logoIndex: 7 },
  { char: 'E', row: 9, col: 8, wordGroup: 2, logoIndex: 8 },
]

const FILLER_POOL = 'ABCDEFGHIKLMNOPRSTUVWXYZ'

type MatrixCell = {
  id: number
  row: number
  col: number
  char: string
  isWord: boolean
  wordGroup: -1 | 0 | 1 | 2
  logoIndex: number
  normDist: number
  spawnDelay: number
  orbitAngle0: number
  orbitRadius: number
  spinStart: number
  driftAngle: number
  driftSpeed: number
}

function buildMatrixCells(): MatrixCell[] {
  const map = new Map<string, WordTargetSpec>()
  WORD_SPECS.forEach((w) => map.set(`${w.row},${w.col}`, w))

  const cells: MatrixCell[] = []
  const maxDist = Math.hypot(6, 6)

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const id = r * GRID_SIZE + c
      const spec = map.get(`${r},${c}`)
      const ch = spec ? spec.char : FILLER_POOL[(id * 11 + r * 5 + c * 3) % FILLER_POOL.length]

      const dr = r - 6
      const dc = c - 6
      const dist = Math.hypot(dr, dc)
      const normDist = dist / maxDist

      const seed1 = Math.sin(id * 12.9898 + 78.233) * 43758.5453
      const frac1 = seed1 - Math.floor(seed1)
      const seed2 = Math.sin(id * 93.9898 + 19.173) * 29183.1234
      const frac2 = seed2 - Math.floor(seed2)

      cells.push({
        id,
        row: r,
        col: c,
        char: ch,
        isWord: Boolean(spec),
        wordGroup: spec ? spec.wordGroup : -1,
        logoIndex: spec ? spec.logoIndex : -1,
        normDist,
        spawnDelay: normDist * 0.24 + frac1 * 0.12,
        orbitAngle0: Math.atan2(dr, dc) + (frac1 - 0.5) * 0.9,
        orbitRadius: 8 + normDist * 16 + frac2 * 8,
        spinStart: (frac1 - 0.5) * 0.68,
        driftAngle: Math.atan2(dr + 0.05, dc + 0.05) + (frac2 - 0.5) * 0.4,
        driftSpeed: 28 + normDist * 48 + frac1 * 20,
      })
    }
  }
  return cells
}

function easeOutCubic(x: number): number {
  const t = Math.max(0, Math.min(1, x))
  return 1 - Math.pow(1 - t, 3)
}

function easeInOutQuart(x: number): number {
  const t = Math.max(0, Math.min(1, x))
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
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
  // Always launch with the signature intro animation ('intro') automatically on mount
  const [phase, setPhase] = useState<'intro' | 'complete'>('intro')
  const [soundOn, setSoundOn] = useState(() => sound.enabled)
  const [runId, setRunId] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const skipRequestedRef = useRef(false)
  const matrixCells = useMemo(() => buildMatrixCells(), [])

  // Preload Mollani font and configure Telegram WebApp header & background colors
  useEffect(() => {
    void ensureMollaniFont()
    try {
      const bgHex = '#6E6B66'
      getWin().Telegram?.WebApp?.setHeaderColor?.(bgHex)
      getWin().Telegram?.WebApp?.setBackgroundColor?.(bgHex)
      getWin().Telegram?.WebApp?.expand?.()
    } catch {}
  }, [])

  // Language persistence
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
  // SINGLE-CANVAS 60/120FPS ENGINE (Always plays automatically on launch)
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

    // Milestone flags for synchronized audio & haptics across the choreography
    let mSpawn = false
    let mOrbit = false
    let mWord0 = false
    let mWord1 = false
    let mWord2 = false
    let mLogoLock = false
    let mLightSweep = false
    let mDone = false

    let rafId = 0
    let lastNow = performance.now()
    let simTime = 0.0

    // Helper to draw the assembled wordmark in Mollani calligraphic font (with Didone fallback)
    const drawWordmarkGlyphs = (fillColor: string) => {
      ctx.fillStyle = fillColor
      const canUseMollani =
        mollaniFontReady ||
        (typeof document !== 'undefined' &&
          Boolean(document.fonts?.check?.('60px "Mollani"')))

      if (canUseMollani) {
        ctx.save()
        ctx.font = '400 64px "Mollani", "Cormorant Garamond", Georgia, serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(BRAND_WORDMARK, 0, 3)
        ctx.restore()
      } else {
        for (let i = 0; i < LOGO_TARGETS.length; i++) {
          const lt = LOGO_TARGETS[i]
          const g = paths.glyphs[lt.char]
          if (!g) continue
          ctx.save()
          ctx.translate(lt.x, lt.y)
          ctx.scale(lt.scale, lt.scale)
          ctx.fill(g)
          ctx.restore()
        }
      }
    }

    const renderFrame = (now: number) => {
      const rawDt = (now - lastNow) / 1000
      lastNow = now
      const dt = Math.max(0.001, Math.min(0.033, rawDt))

      if (skipRequestedRef.current && simTime < 4.2) {
        simTime = 4.2
        mDone = true
      } else {
        simTime += dt
      }
      const elapsed = simTime

      // Trigger audio & haptic milestones during active intro
      if (!skipRequestedRef.current) {
        if (!mSpawn && elapsed >= 0.06) {
          mSpawn = true
          haptic('light')
          sound.linenWhisper(0.95)
        }
        if (!mOrbit && elapsed >= 0.58) {
          mOrbit = true
          sound.suedeSwell()
        }
        if (!mWord0 && elapsed >= 1.12) {
          mWord0 = true
          haptic('light')
          sound.softTick(0.96)
        }
        if (!mWord1 && elapsed >= 1.32) {
          mWord1 = true
          haptic('medium')
          sound.softTick(1.12)
        }
        if (!mWord2 && elapsed >= 1.52) {
          mWord2 = true
          haptic('medium')
          sound.softTick(1.28)
        }
        if (!mLogoLock && elapsed >= 2.85) {
          mLogoLock = true
          haptic('heavy')
          sound.feltChord()
        }
        if (!mLightSweep && elapsed >= 3.22) {
          mLightSweep = true
          sound.goldenShimmer()
        }
        // Complete intro once so "THE ART OF SHOEMAKING" and the bottom block glide up together
        if (!mDone && elapsed >= 3.85) {
          mDone = true
          setPhase('complete')
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // 1. Blit pre-baked Alabaster-Pearl & Smoked-Pewter 3D spotlight background
      ctx.globalAlpha = 1.0
      ctx.drawImage(textures.bgCanvas, 0, 0, viewW, viewH)

      const centerX = viewW * 0.5
      const centerY = viewH * 0.455
      const gridSpan = Math.min(viewW * 0.84, viewH * 0.54, 390)
      const cellStep = gridSpan / GRID_SIZE
      const cellGlyphScale = (cellStep * 0.43) / 24.0
      const logoMasterScale = Math.min((viewW * 0.82) / 248.0, 1.44)

      // 2. Signature breathing pearl halo behind logo
      if (elapsed > 1.8) {
        const haloIn = easeOutCubic(clamp01((elapsed - 1.8) / 1.1))
        const breathe = 0.5 + 0.5 * Math.sin(elapsed * 1.65)
        const haloR = (135 + breathe * 14) * logoMasterScale
        ctx.globalAlpha = haloIn * (0.52 + breathe * 0.14)
        ctx.drawImage(
          textures.glowCanvas,
          centerX - haloR * 1.45,
          centerY - haloR * 0.85,
          haloR * 2.9,
          haloR * 1.7
        )
      }

      // 3. Matrix letters (Stages 1 -> 2 -> 3)
      if (elapsed < 3.25) {
        for (let i = 0; i < TOTAL_CELLS; i++) {
          const cell = matrixCells[i]
          const glyph = paths.glyphs[cell.char]
          if (!glyph) continue

          const homeX = centerX + (cell.col - 6) * cellStep
          const homeY = centerY + (cell.row - 6) * cellStep

          const spawnP = easeOutCubic(clamp01((elapsed - cell.spawnDelay) / 0.65))
          if (spawnP <= 0.005) continue

          const convP = easeInOutQuart(clamp01((elapsed - 0.35 - cell.normDist * 0.25) / 1.05))
          const curOrbitR = cell.orbitRadius * (1 - convP)
          const curOrbitAng = cell.orbitAngle0 + (1 - convP) * 1.45

          let x = homeX + Math.cos(curOrbitAng) * curOrbitR
          let y = homeY + Math.sin(curOrbitAng) * curOrbitR
          let rot = cell.spinStart * (1 - convP)
          let scale = cellGlyphScale * (0.58 + 0.42 * spawnP)
          let alpha = spawnP * (cell.isWord ? 0.9 : 0.36)
          let useGoldColor = false

          if (cell.isWord) {
            const wgStart = 1.08 + cell.wordGroup * 0.18
            const wgP = easeOutCubic(clamp01((elapsed - wgStart) / 0.35))
            if (wgP > 0) {
              alpha = Math.min(1, alpha + wgP * 0.25)
              scale *= 1 + Math.sin(wgP * Math.PI) * 0.14
              if (wgP > 0.25 && wgP < 0.9) useGoldColor = true
            }
          }

          if (!cell.isWord) {
            const fadeStart = 1.55 + cell.normDist * 0.28
            const fadeP = easeInOutQuart(clamp01((elapsed - fadeStart) / 0.72))
            if (fadeP > 0) {
              x += Math.cos(cell.driftAngle) * cell.driftSpeed * fadeP
              y += Math.sin(cell.driftAngle) * cell.driftSpeed * fadeP
              scale *= 1 - fadeP * 0.35
              alpha *= 1 - fadeP
            }
          } else if (cell.logoIndex === -1) {
            const flyP = easeInOutQuart(clamp01((elapsed - 1.72) / 0.95))
            if (flyP > 0) {
              const targetX = centerX + (cell.col - 6) * 10 * logoMasterScale
              const targetY = centerY - 25.5 * logoMasterScale
              x = x + (targetX - x) * flyP
              y = y + (targetY - y) * flyP
              scale *= 1 - flyP * 0.48
              alpha *= 1 - flyP
            }
          } else {
            const stagger = cell.logoIndex * 0.03
            const flyP = easeInOutQuart(clamp01((elapsed - (1.72 + stagger)) / 1.05))
            const targetSpec = LOGO_TARGETS[cell.logoIndex]
            const targetX = centerX + targetSpec.x * logoMasterScale
            const targetY = centerY + targetSpec.y * logoMasterScale
            const targetScale = logoMasterScale * targetSpec.scale

            const arcLift = Math.sin(flyP * Math.PI) * -14 * (1 - cell.logoIndex * 0.08)
            x = x + (targetX - x) * flyP
            y = y + (targetY - y) * flyP + arcLift
            rot = rot * (1 - flyP)
            scale = scale + (targetScale - scale) * flyP

            const handoffP = clamp01((elapsed - 2.52) / 0.48)
            alpha = (1 - handoffP) * Math.min(1, spawnP * 1.15)
          }

          if (alpha <= 0.008) continue

          ctx.save()
          ctx.translate(x, y)
          if (Math.abs(rot) > 0.001) ctx.rotate(rot)
          ctx.scale(scale, scale)
          ctx.globalAlpha = alpha
          ctx.fillStyle = useGoldColor ? '#8E6835' : cell.isWord ? '#141210' : '#484540'
          ctx.fill(glyph)
          ctx.restore()
        }
      }

      // 4. Assembled Wordmark ("the" + Diamond Rules + "Cordwaine" in Mollani + Calligraphic Gold Swash)
      if (elapsed > 2.42) {
        const lockupAlpha = easeOutCubic(clamp01((elapsed - 2.46) / 0.54))
        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.scale(logoMasterScale, logoMasterScale)

        // 4A. Render "Cordwaine" in Mollani font in Deep Obsidian (#141210)
        ctx.globalAlpha = lockupAlpha
        drawWordmarkGlyphs('#141210')

        // 4B. Render italic "the" & symmetrical diamond-tipped hairline dividers
        const crownP = easeOutCubic(clamp01((elapsed - 2.68) / 0.52))
        if (crownP > 0) {
          ctx.save()
          ctx.globalAlpha = crownP
          ctx.translate(0, (1 - crownP) * 3.5)
          ctx.fillStyle = '#7A5A2F'
          ctx.fill(paths.thePath)
          ctx.globalAlpha = crownP * 0.78
          ctx.fillStyle = '#8C6B3F'
          ctx.fill(paths.rulesPath)
          ctx.restore()
        }

        // 4C. Progressive Golden Swash Draw beneath wordmark
        const swashP = easeOutCubic(clamp01((elapsed - 3.02) / 0.62))
        if (swashP > 0) {
          ctx.save()
          ctx.beginPath()
          ctx.rect(-125, 6, 115 * swashP, 26)
          ctx.clip()
          ctx.globalAlpha = Math.min(1, swashP * 1.15)
          ctx.fillStyle = '#9E7840'
          ctx.fill(paths.swashPath)
          ctx.restore()
        }

        // 4D. Golden Specular Light Sweep across the assembled Mollani wordmark
        const sweepP = clamp01((elapsed - 3.12) / 0.78)
        if (sweepP > 0 && sweepP < 1) {
          const bandX = -155 + sweepP * 310
          ctx.save()
          ctx.beginPath()
          ctx.rect(bandX - 28, -48, 56, 96)
          ctx.clip()

          const env = Math.sin(sweepP * Math.PI)
          ctx.globalAlpha = env * 0.88
          drawWordmarkGlyphs('#C99B53')
          ctx.fillStyle = '#C99B53'
          ctx.fill(paths.thePath)
          ctx.fill(paths.swashPath)
          ctx.restore()

          ctx.save()
          ctx.globalAlpha = env * 0.22
          ctx.drawImage(textures.rayCanvas, bandX - 55, -55, 110, 110)
          ctx.restore()
        }

        ctx.restore()
      }

      rafId = window.requestAnimationFrame(renderFrame)
    }

    rafId = window.requestAnimationFrame(renderFrame)
    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', syncViewport)
    }
  }, [matrixCells, runId])

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

      {/* Single Hardware-Accelerated Canvas (Alabaster-Pearl & Smoked-Pewter 3D Spotlight + Mollani Wordmark) */}
      <canvas
        ref={canvasRef}
        aria-label="The Cordwaine"
        className="fixed inset-0 w-full h-full pointer-events-none block"
      />

      {/* Top Bar: Skip/Replay + Sound Toggle + Luminous Pearl Language Switcher */}
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
          Appears ONLY ONCE simultaneously with the bottom navigation block, floating up from below */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-20 flex flex-col items-center justify-center text-center px-6"
        style={{ top: '54.8%' }}
      >
        <p
          className={`text-[10px] sm:text-[11px] uppercase tracking-[0.42em] text-[#6E5028] font-sans font-medium transition-all duration-900 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isComplete
              ? 'opacity-80 translate-y-0 blur-0'
              : 'opacity-0 translate-y-8 blur-[2px]'
          }`}
        >
          THE ART OF SHOEMAKING
        </p>
        <p
          className={`mt-1.5 text-[11px] italic tracking-[0.12em] text-[#141210]/60 transition-all duration-900 delay-100 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isComplete
              ? 'opacity-85 translate-y-0 blur-0'
              : 'opacity-0 translate-y-8 blur-[2px]'
          }`}
        >
          {t.atelierSub}
        </p>
      </div>

      {/* Bottom Typographic Navigation & Primary Entry CTA — Smoothly floats up from the bottom */}
      <footer
        className={`fixed inset-x-0 bottom-0 z-20 flex flex-col items-center px-6 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isComplete
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-16 pointer-events-none'
        }`}
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 18px, 24px)',
        }}
      >
        {/* 3 Typographic Chapter Links */}
        <nav
          aria-label="Atelier chapters"
          className={`flex items-center justify-center gap-6 sm:gap-9 mb-6 transition-all duration-900 delay-75 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <button
            type="button"
            onClick={() => handleAction(onOpenMaterials ?? onStart)}
            className="text-[15px] sm:text-[16px] tracking-[0.06em] text-[#141210]/90 hover:text-[#7A5A2F] active:scale-95 transition-all duration-300 cursor-pointer"
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
            className="text-[15px] sm:text-[16px] tracking-[0.06em] text-[#141210]/90 hover:text-[#7A5A2F] active:scale-95 transition-all duration-300 cursor-pointer"
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
            className="text-[15px] sm:text-[16px] tracking-[0.06em] text-[#141210]/90 hover:text-[#7A5A2F] active:scale-95 transition-all duration-300 cursor-pointer"
          >
            {t.ch3}
          </button>
        </nav>

        {/* Primary Entry Button + Vertical Scroll Cue */}
        <button
          type="button"
          onClick={() => handleAction(onStart, true)}
          className={`group flex flex-col items-center gap-2.5 pt-1 text-[#141210]/95 hover:text-[#141210] active:scale-95 transition-all duration-900 delay-150 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer ${
            isComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
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

      <style>{`
        @font-face {
          font-family: 'Mollani';
          src: url('${MOLLANI_FONT_URL}') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
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
