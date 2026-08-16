import { Pigment, PIGMENTS, initPigment } from './pigments'
import { SpectrumPoint, parseSpectrum, spectrumToRGB, rgbToHex } from '../utils/colorScience'

const SPECTRUM_FILES: Record<string, string> = {
  titanium_white: 'titanium_white.txt',
  zinc_white: 'zinc_white.txt',
  lead_white: 'lead_white.txt',
  antimony_white: 'antimony_white.txt',
  lithopone: 'lithopone.txt',
  chalk: 'chalk.txt',
  gypsum: 'gypsum.txt',
  cadmium_yellow: 'cadmium_yellow.txt',
  chrome_yellow: 'chrome_yellow.txt',
  naples_yellow: 'naples_yellow.txt',
  hansa_yellow: 'hansa_yellow.txt',
  arylide_yellow: 'arylide_yellow.txt',
  nickel_azo_yellow: 'nickel_azo_yellow.txt',
  cobalt_yellow: 'cobalt_yellow.txt',
  lead_tin_yellow_i: 'lead_tin_yellow_i.txt',
  lead_tin_yellow_ii: 'lead_tin_yellow_ii.txt',
  massicot: 'massicot.txt',
  orpiment: 'orpiment.txt',
  gamboge: 'gamboge.txt',
  saffron: 'saffron.txt',
  curcuma: 'curcuma.txt',
  stil_de_grain: 'stil_de_grain.txt',
  yellow_ochre: 'yellow_ochre.txt',
  yellow_lake_reseda: 'yellow_lake_reseda.txt',
  safflower: 'safflower.txt',
  cadmium_red: 'cadmium_red.txt',
  vermilion: 'vermilion.txt',
  vermilion_nat: 'vermilion_nat.txt',
  red_lead: 'red_lead.txt',
  red_ochre: 'red_ochre.txt',
  realgar: 'realgar.txt',
  alizarine: 'alizarine.txt',
  carmine_lake: 'carmine_lake.txt',
  madder_lake: 'madder_lake.txt',
  lac_dye: 'lac_dye.txt',
  naphthol_red: 'naphthol_red.txt',
  pyrrole_red: 'pyrrole_red.txt',
  rhodamine: 'rhodamine.txt',
  phthalo_blue: 'phthalo_blue.txt',
  ultramarine: 'ultramarine.txt',
  ultramarine_nat: 'ultramarine_nat.txt',
  cobalt_blue: 'cobalt_blue.txt',
  cobalt_cerulean: 'cobalt_cerulean.txt',
  cobalt_chromite_blue: 'cobalt_chromite_blue.txt',
  prussian_blue: 'prussian_blue.txt',
  azurite: 'azurite.txt',
  blue_bice: 'blue_bice.txt',
  egyptian_blue: 'egyptian_blue.txt',
  han_blue: 'han_blue.txt',
  maya_blue: 'maya_blue.txt',
  smalt: 'smalt.txt',
  indigo: 'indigo.txt',
  methylene_blue: 'methylene_blue.txt',
  tyrian_purple: 'tyrian_purple.txt',
  phthalo_green: 'phthalo_green.txt',
  viridian: 'viridian.txt',
  chrome_oxide_green: 'chrome_oxide_green.txt',
  cadmium_green: 'cadmium_green.txt',
  cobalt_titanate_green: 'cobalt_titanate_green.txt',
  green_earth: 'green_earth.txt',
  malachite: 'malachite.txt',
  verdigris: 'verdigris.txt',
  copper_resinate: 'copper_resinate.txt',
  naphthol_green: 'naphthol_green.txt',
  vivianite: 'vivianite.txt',
  burnt_sienna: 'burnt_sienna.txt',
  raw_sienna: 'raw_sienna.txt',
  burnt_umber: 'burnt_umber.txt',
  raw_umber: 'raw_umber.txt',
  van_dyke_brown: 'van_dyke_brown.txt',
  sepia: 'sepia.txt',
  bitumen: 'bitumen.txt',
  bone_black: 'bone_black.txt',
  ivory_black: 'ivory_black.txt',
  lamp_black: 'lamp_black.txt',
  vine_black: 'vine_black.txt',
  aniline_black: 'aniline_black.txt',
  cobalt_violet: 'cobalt_violet.txt',
  manganese_violet: 'manganese_violet.txt',
  iron_gall_ink: 'iron_gall_ink.txt',
  bismuth: 'bismuth.txt',
  acrylic_binder: 'acrylic_binder.txt',
  cardboard: 'cardboard.txt',
}

export async function loadSpectrum(filename: string): Promise<SpectrumPoint[]> {
  const response = await fetch(`/spectra/${filename}`)
  if (!response.ok) {
    throw new Error(`Не удалось загрузить спектр: ${filename}`)
  }
  const text = await response.text()
  return parseSpectrum(text)
}

export async function loadAllPigments(): Promise<Pigment[]> {
  const result: Pigment[] = []

  for (const pigment of PIGMENTS) {
    const filename = SPECTRUM_FILES[pigment.id]

    if (!filename) {
      console.warn(`Нет файла спектра для: ${pigment.id}`)
      result.push(pigment)
      continue
    }

    try {
      const response = await fetch(`/spectra/${filename}`)
      const text = await response.text()
      const initialized = initPigment(pigment, text)
      result.push(initialized)
      console.log(`✓ ${pigment.name.ru} → ${initialized.hex}`)
    } catch (err) {
      console.error(`Ошибка загрузки ${pigment.id}:`, err)
      result.push(pigment)
    }
  }

  return result
}

export function getColorFromSpectrumText(text: string) {
  const spectrum = parseSpectrum(text)
  const rgb = spectrumToRGB(spectrum)
  return {
    rgb,
    hex: rgbToHex(rgb),
  }
}
