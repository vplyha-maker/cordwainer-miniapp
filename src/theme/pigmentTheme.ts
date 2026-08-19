import { Pigment } from '../data/pigments'
import { spectrumToRGB, rgbToHex } from '../utils/colorScience'

export const THEME_PIGMENT_IDS = [
  'lac_dye',           // Лак-дай
  'egyptian_blue',     // Єгипетський синій
  'orpiment',          // Аурипігмент
  'realgar',           // Реальгар
  'verdigris',         // Ярь-медянка
  'malachite',         // Малахіт
  'azurite',           // Азурит
  'smalt',             // Смальта
  'indigo',            // Індиго
  'madder_lake',       // Крап-лак
  'lead_white',        // Свинцеві білила
  'bone_black',        // Кісткова сажа
] as const

export function applyPigmentTheme(pigments: Pigment[]) {
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

  // Справжні кольори 12 історичних пігментів
  const lacDye      = getHex('lac_dye', '#8B0000')
  const egyptianBlue = getHex('egyptian_blue', '#1034A6')
  const orpiment    = getHex('orpiment', '#E4D00A')
  const realgar     = getHex('realgar', '#E34234')
  const verdigris   = getHex('verdigris', '#43B3AE')
  const malachite   = getHex('malachite', '#0BDA51')
  const azurite     = getHex('azurite', '#007FFF')
  const smalt       = getHex('smalt', '#003399')
  const indigo      = getHex('indigo', '#4B0082')
  const madder      = getHex('madder_lake', '#A52A2A')
  const leadWhite   = getHex('lead_white', '#F5F1EA')
  const boneBlack   = getHex('bone_black', '#1C1816')

  // Записуємо всі пігменти в CSS-змінні
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

  // Основна тема додатку (сформована з історичних пігментів)
  root.style.setProperty('--color-bg', boneBlack)              // фон = кісткова сажа
  root.style.setProperty('--color-surface', indigo)            // поверхні = індиго
  root.style.setProperty('--color-surface-2', smalt)           // друга поверхня = смальта
  root.style.setProperty('--color-ink', leadWhite)             // текст = свинцеві білила
  root.style.setProperty('--color-muted', madder)              // приглушений = крап-лак
  root.style.setProperty('--color-accent', orpiment)           // головний акцент = аурипігмент
  root.style.setProperty('--color-accent-strong', realgar)     // сильний акцент = реальгар
  root.style.setProperty('--color-danger', lacDye)             // небезпека = лак-дай
  root.style.setProperty('--color-border', azurite)            // бордери = азурит
  root.style.setProperty('--color-info', egyptianBlue)         // інформація = єгипетський синій
  root.style.setProperty('--color-success', malachite)         // успіх = малахіт

  // Telegram WebApp
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      tg.setHeaderColor(boneBlack)
      tg.setBackgroundColor(boneBlack)
    }
  } catch {}

  // Для дебагу (можна потім прибрати)
  console.log('%c🎨 Historical Pigment Theme applied', 'color: #E4D00A; font-weight: bold')
  console.log({
    lacDye,
    egyptianBlue,
    orpiment,
    realgar,
    boneBlack,
    leadWhite,
  })
}
