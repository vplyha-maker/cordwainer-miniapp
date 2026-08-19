import { Pigment } from '../data/pigments'
import { spectrumToRGB, rgbToHex } from '../utils/colorScience'

export const THEME_PIGMENT_IDS = [
  'lac_dye',
  'egyptian_blue',
  'orpiment',
  'realgar',
  'verdigris',
  'malachite',
  'azurite',
  'smalt',
  'indigo',
  'madder_lake',
  'lead_white',
  'bone_black',
] as const

export function applyPigmentTheme(pigments: Pigment[], isDark: boolean = true) {
  const root = document.documentElement

  const getHex = (id: string, fallback: string): string => {
    const p = pigments.find((x) => x.id === id)
    if (p?.spectrum && p.spectrum.length > 0) {
      try {
        return rgbToHex(spectrumToRGB(p.spectrum)).toUpperCase()
      } catch {
        return fallback
      }
    }
    if (p?.hex) return p.hex.toUpperCase()
    return fallback
  }

  // Кольори пігментів
  const lacDye       = getHex('lac_dye', '#8B0000')
  const egyptianBlue = getHex('egyptian_blue', '#1034A6')
  const orpiment     = getHex('orpiment', '#E4D00A')
  const realgar      = getHex('realgar', '#E34234')
  const verdigris    = getHex('verdigris', '#43B3AE')
  const malachite    = getHex('malachite', '#0BDA51')
  const azurite      = getHex('azurite', '#007FFF')
  const smalt        = getHex('smalt', '#003399')
  const indigo       = getHex('indigo', '#4B0082')
  const madder       = getHex('madder_lake', '#A52A2A')
  const leadWhite    = getHex('lead_white', '#F5F1EA')
  const boneBlack    = getHex('bone_black', '#1C1816')

  // Записуємо всі пігменти
  root.style.setProperty('--pigment-lac-dye', lacDye)
  root.style.setProperty('--pigment-egyptian-blue', egyptianBlue)
  root.style.setProperty('--pigment-orpiment', orpiment)
  root.style.setProperty('--pigment-realgar', realgar)
  root.style.setProperty('--pigment-verdigris', verdigris)
  root.style.setProperty('--pigment-malachite', malachite)
  root.style.setProperty('--pigment-azurite', azurite)
  root.style.setProperty('--pigment-smalt', smalt)
  root.style.setProperty('--pigment-indigo', indigo)
  root.style.setProperty('--pigment-madder', madder)
  root.style.setProperty('--pigment-lead-white', leadWhite)
  root.style.setProperty('--pigment-bone-black', boneBlack)

  if (isDark) {
    // ===== НІЧНА ТЕМА =====
    root.style.setProperty('--color-bg', boneBlack)
    root.style.setProperty('--color-surface', '#25201C')
    root.style.setProperty('--color-surface-2', '#2F2924')
    root.style.setProperty('--color-ink', leadWhite)
    root.style.setProperty('--color-muted', '#B9ACA0')
    root.style.setProperty('--color-accent', orpiment)
    root.style.setProperty('--color-accent-strong', realgar)
    root.style.setProperty('--color-danger', lacDye)
    root.style.setProperty('--color-border', 'rgba(255,255,255,0.12)')
    root.style.setProperty('--color-info', egyptianBlue)
    root.style.setProperty('--color-success', malachite)

    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  } else {
    // ===== ДЕННА ТЕМА =====
    root.style.setProperty('--color-bg', leadWhite)
    root.style.setProperty('--color-surface', '#F0EBE3')
    root.style.setProperty('--color-surface-2', '#E8E2D9')
    root.style.setProperty('--color-ink', boneBlack)
    root.style.setProperty('--color-muted', '#6B5E54')
    root.style.setProperty('--color-accent', madder)
    root.style.setProperty('--color-accent-strong', realgar)
    root.style.setProperty('--color-danger', lacDye)
    root.style.setProperty('--color-border', 'rgba(0,0,0,0.12)')
    root.style.setProperty('--color-info', egyptianBlue)
    root.style.setProperty('--color-success', malachite)

    document.documentElement.classList.add('light')
    document.documentElement.classList.remove('dark')
  }

  // Telegram header/background
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      const bg = isDark ? boneBlack : leadWhite
      tg.setHeaderColor(bg)
      tg.setBackgroundColor(bg)
    }
  } catch {}
}
