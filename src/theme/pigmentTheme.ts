import { Pigment } from '../data/pigments'
import { spectrumToRGB, rgbToHex } from '../utils/colorScience'

export const THEME_PIGMENT_IDS = [
  'titanium_white',
  'bone_black',
  'ivory_black',
  'yellow_ochre',
  'red_ochre',
  'burnt_sienna',
  'raw_sienna',
  'burnt_umber',
  'raw_umber',
  'cadmium_red',
  'pyrrole_red',
  'carmine_lake',
  'ultramarine',
  'prussian_blue',
  'green_earth',
  'van_dyke_brown',
] as const

export type ThemePigmentId = typeof THEME_PIGMENT_IDS[number]

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

  // Справжні кольори пігментів
  const white     = getHex('titanium_white', '#F5F1EA')
  const boneBlack = getHex('bone_black', '#1C1816')
  const ivory     = getHex('ivory_black', '#2A2522')
  const ochre     = getHex('yellow_ochre', '#C4A35A')
  const redOchre  = getHex('red_ochre', '#A65A3A')
  const sienna    = getHex('burnt_sienna', '#8B4513')
  const umber     = getHex('burnt_umber', '#3D2B1F')
  const cadmium   = getHex('cadmium_red', '#E34234')
  const pyrrole   = getHex('pyrrole_red', '#C41E3A')
  const carmine   = getHex('carmine_lake', '#960018')
  const ultra     = getHex('ultramarine', '#3F51B5')
  const prussian  = getHex('prussian_blue', '#003153')
  const greenE    = getHex('green_earth', '#556B2F')
  const vandyke   = getHex('van_dyke_brown', '#4A3728')

  // Записуємо в CSS-змінні
  root.style.setProperty('--pigment-white', white)
  root.style.setProperty('--pigment-bone-black', boneBlack)
  root.style.setProperty('--pigment-ivory-black', ivory)
  root.style.setProperty('--pigment-ochre', ochre)
  root.style.setProperty('--pigment-red-ochre', redOchre)
  root.style.setProperty('--pigment-sienna', sienna)
  root.style.setProperty('--pigment-umber', umber)
  root.style.setProperty('--pigment-cadmium-red', cadmium)
  root.style.setProperty('--pigment-pyrrole-red', pyrrole)
  root.style.setProperty('--pigment-carmine', carmine)
  root.style.setProperty('--pigment-ultramarine', ultra)
  root.style.setProperty('--pigment-prussian', prussian)
  root.style.setProperty('--pigment-green-earth', greenE)
  root.style.setProperty('--pigment-vandyke', vandyke)

  // Основна тема додатку (формується з пігментів)
  root.style.setProperty('--color-bg', boneBlack)           // фон = кісткова сажа
  root.style.setProperty('--color-surface', umber)          // поверхні = палена умбра
  root.style.setProperty('--color-surface-2', ivory)        // друга поверхня
  root.style.setProperty('--color-ink', white)              // текст = білила
  root.style.setProperty('--color-muted', ochre)            // приглушений текст
  root.style.setProperty('--color-accent', ochre)           // головний акцент = вохра
  root.style.setProperty('--color-accent-strong', cadmium)  // сильний акцент = кадмій
  root.style.setProperty('--color-danger', pyrrole)         // небезпека / важливі кнопки
  root.style.setProperty('--color-border', sienna)          // бордери

  // Для Telegram WebApp
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      tg.setHeaderColor(boneBlack)
      tg.setBackgroundColor(boneBlack)
    }
  } catch {}
}
