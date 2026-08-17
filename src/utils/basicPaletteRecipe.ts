/**
 * Эталонные коэффициенты K и S (Kubelka-Munk)
 * для классической 6-цветной палитры
 * Зоны: 450 нм (синяя), 550 нм (зелёная), 650 нм (красная)
 */

export interface KS {
  k450: number
  s450: number
  k550: number
  s550: number
  k650: number
  s650: number
}

export interface BasicPigment {
  id: string
  name: {
    uk: string
    ru: string
    en: string
  }
  hex: string
  ks: KS
}

export const BASIC_PALETTE: BasicPigment[] = [
  {
    id: 'white',
    name: { uk: 'Білий (TiO₂)', ru: 'Белый (TiO₂)', en: 'White (TiO₂)' },
    hex: '#F5F5F5',
    ks: {
      k450: 0.02, s450: 1.00,
      k550: 0.01, s550: 0.95,
      k650: 0.01, s650: 0.90,
    },
  },
  {
    id: 'black',
    name: { uk: 'Чорний (сажа)', ru: 'Чёрный (сажа)', en: 'Black (Carbon)' },
    hex: '#1A1A1A',
    ks: {
      k450: 18.5, s450: 0.05,
      k550: 19.0, s550: 0.05,
      k650: 19.5, s650: 0.05,
    },
  },
  {
    id: 'red',
    name: { uk: 'Червоний (кадмій)', ru: 'Красный (кадмий)', en: 'Red (Cadmium)' },
    hex: '#E53935',
    ks: {
      k450: 14.2, s450: 0.12,
      k550: 12.8, s550: 0.15,
      k650: 0.15, s650: 0.65,
    },
  },
  {
    id: 'blue',
    name: { uk: 'Синій (фтало)', ru: 'Синий (фтало)', en: 'Blue (Phthalo)' },
    hex: '#1E88E5',
    ks: {
      k450: 0.22, s450: 0.55,
      k550: 8.40, s550: 0.18,
      k650: 16.1, s650: 0.08,
    },
  },
  {
    id: 'green',
    name: { uk: 'Зелений (фтало)', ru: 'Зелёный (фтало)', en: 'Green (Phthalo)' },
    hex: '#43A047',
    ks: {
      k450: 6.20, s450: 0.15,
      k550: 0.35, s550: 0.58,
      k650: 12.5, s650: 0.10,
    },
  },
  {
    id: 'yellow',
    name: { uk: 'Жовтий (кадмій)', ru: 'Жёлтый (кадмий)', en: 'Yellow (Cadmium)' },
    hex: '#FDD835',
    ks: {
      k450: 15.1, s450: 0.10,
      k550: 0.12, s550: 0.70,
      k650: 0.08, s650: 0.75,
    },
  },
]

function ksToReflectance(k: number, s: number): number {
  if (s <= 0) return 0
  const ks = k / s
  const r = 1 + ks - Math.sqrt(ks * ks + 2 * ks)
  return Math.max(0, Math.min(1, r))
}

function reflectanceToApproxRGB(r450: number, r550: number, r650: number) {
  const r = Math.round(r650 * 255)
  const g = Math.round(r550 * 255)
  const b = Math.round(r450 * 255)
  return { r, g, b }
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const toHex = (n: number) => {
    const v = Math.max(0, Math.min(255, Math.round(n)))
    return v.toString(16).padStart(2, '0')
  }
  return `#\( {toHex(rgb.r)} \){toHex(rgb.g)}${toHex(rgb.b)}`
}

function mixKS(weights: number[]): { r450: number; r550: number; r650: number } {
  let k450 = 0, s450 = 0
  let k550 = 0, s550 = 0
  let k650 = 0, s650 = 0

  BASIC_PALETTE.forEach((p, i) => {
    const w = weights[i]
    k450 += w * p.ks.k450
    s450 += w * p.ks.s450
    k550 += w * p.ks.k550
    s550 += w * p.ks.s550
    k650 += w * p.ks.k650
    s650 += w * p.ks.s650
  })

  return {
    r450: ksToReflectance(k450, s450),
    r550: ksToReflectance(k550, s550),
    r650: ksToReflectance(k650, s650),
  }
}

function findWeights(targetR: { r450: number; r550: number; r650: number }) {
  const n = BASIC_PALETTE.length
  let bestWeights = new Array(n).fill(0)
  bestWeights[0] = 1
  let bestError = Infinity

  for (let trial = 0; trial < 80; trial++) {
    let weights = new Array(n).fill(0).map(() => Math.random())
    const sum = weights.reduce((a, b) => a + b, 0)
    weights = weights.map(w => w / sum)

    for (let iter = 0; iter < 40; iter++) {
      const mixed = mixKS(weights)
      const err =
        Math.pow(mixed.r450 - targetR.r450, 2) +
        Math.pow(mixed.r550 - targetR.r550, 2) +
        Math.pow(mixed.r650 - targetR.r650, 2)

      if (err < bestError) {
        bestError = err
        bestWeights = [...weights]
      }

      const idx = Math.floor(Math.random() * n)
      const delta = (Math.random() - 0.5) * 0.08
      weights[idx] = Math.max(0, weights[idx] + delta)
      const s = weights.reduce((a, b) => a + b, 0)
      if (s > 0) weights = weights.map(w => w / s)
    }
  }

  return bestWeights
}

export interface BasicRecipeItem {
  pigment: BasicPigment
  ml: number
}

export interface BasicRecipeResult {
  recipe: BasicRecipeItem[]
  resultRgb: { r: number; g: number; b: number }
  resultHex: string
  deltaE: number
}

/**
 * По спектру нейтрализатора возвращает рецепт из базовой палитры (±20 мл)
 */
export function findBasicPaletteRecipe(
  targetSpectrum: { wavelength: number; reflectance: number }[]
): BasicRecipeResult | null {
  if (!targetSpectrum || targetSpectrum.length === 0) return null

  const getR = (wl: number) => {
    let closest = targetSpectrum[0]
    let minDiff = Infinity
    for (const p of targetSpectrum) {
      const d = Math.abs(p.wavelength - wl)
      if (d < minDiff) {
        minDiff = d
        closest = p
      }
    }
    return closest.reflectance / 100
  }

  const targetR = {
    r450: getR(450),
    r550: getR(550),
    r650: getR(650),
  }

  const weights = findWeights(targetR)
  const totalMl = 20
  const recipe: BasicRecipeItem[] = []

  weights.forEach((w, i) => {
    const ml = Math.round(w * totalMl * 10) / 10
    if (ml >= 0.3) {
      recipe.push({
        pigment: BASIC_PALETTE[i],
        ml,
      })
    }
  })

  const currentSum = recipe.reduce((s, r) => s + r.ml, 0)
  if (currentSum > 0 && Math.abs(currentSum - totalMl) > 0.5) {
    const factor = totalMl / currentSum
    recipe.forEach(r => {
      r.ml = Math.round(r.ml * factor * 10) / 10
    })
  }

  const finalWeights = BASIC_PALETTE.map((_, i) => {
    const item = recipe.find(r => r.pigment.id === BASIC_PALETTE[i].id)
    return item ? item.ml / totalMl : 0
  })

  const mixed = mixKS(finalWeights)
  const resultRgb = reflectanceToApproxRGB(mixed.r450, mixed.r550, mixed.r650)
  const resultHex = rgbToHex(resultRgb)

  const deltaE = Math.round(
    Math.sqrt(
      Math.pow(mixed.r450 - targetR.r450, 2) +
      Math.pow(mixed.r550 - targetR.r550, 2) +
      Math.pow(mixed.r650 - targetR.r650, 2)
    ) * 100
  )

  return {
    recipe,
    resultRgb,
    resultHex,
    deltaE,
  }
}
