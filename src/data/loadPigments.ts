import { Pigment, PIGMENTS, initPigment } from './pigments'
import { SpectrumPoint, parseSpectrum, spectrumToRGB, rgbToHex } from '../utils/colorScience'
import { THEME_PIGMENT_IDS } from '../theme/pigmentTheme'

const SPECTRUM_FILES: Record<string, string> = {
  // === Классические ===
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

  // === Modern Art / FORS ===
  pw_6_anatase: 'pw_6_anatase.txt',
  pw_7_zinc_sulfide: 'pw_7_zinc_sulfide.txt',
  pw_11_antimony_white: 'pw_11_antimony_white.txt',
  pw_21_barium_sulfate: 'pw_21_barium_sulfate.txt',
  pbk_1_aniline_black: 'pbk_1_aniline_black.txt',
  py_32_strontium_yellow: 'py_32_strontium_yellow.txt',
  py_53_nickel_titanium_yellow: 'py_53_nickel_titanium_yellow.txt',
  py_83_diarylide_yellow_hr: 'py_83_diarylide_yellow_hr.txt',
  py_108_anthrapyrimidine_yellow: 'py_108_anthrapyrimidine_yellow.txt',
  py_109_isoindole_yellow: 'py_109_isoindole_yellow.txt',
  py_110_isoindolinone_yellow: 'py_110_isoindolinone_yellow.txt',
  py_129_irgazin_yellow: 'py_129_irgazin_yellow.txt',
  py_139_isoindoline_yellow: 'py_139_isoindoline_yellow.txt',
  py_150_nickel_azo_yellow: 'py_150_nickel_azo_yellow.txt',
  py_151_benzimidazolone_yellow_h4g: 'py_151_benzimidazolone_yellow_h4g.txt',
  py_154_benzimidazolone_yellow_h3g: 'py_154_benzimidazolone_yellow_h3g.txt',
  py_159_praseodymium_yellow: 'py_159_praseodymium_yellow.txt',
  py_184_bismuth_vanadate_yellow: 'py_184_bismuth_vanadate_yellow.txt',
  py_213_hostaperm_yellow_h5g: 'py_213_hostaperm_yellow_h5g.txt',
  py_216_rutile_tin_zinc: 'py_216_rutile_tin_zinc.txt',
  po_5_hansa_orange_r: 'po_5_hansa_orange_r.txt',
  po_48_quinacridone_burnt_orange: 'po_48_quinacridone_burnt_orange.txt',
  po_61_isoindole_orange: 'po_61_isoindole_orange.txt',
  po_73_pyrrole_orange: 'po_73_pyrrole_orange.txt',
  pr_3_toluidine_red: 'pr_3_toluidine_red.txt',
  pr_9_naphthol_red_as: 'pr_9_naphthol_red_as.txt',
  pr_12_permanent_bordeaux_trr: 'pr_12_permanent_bordeaux_trr.txt',
  pr_81_rhodamine_6g: 'pr_81_rhodamine_6g.txt',
  pr_90_eosin_y: 'pr_90_eosin_y.txt',
  pr_112_naphthol_red_as_d: 'pr_112_naphthol_red_as_d.txt',
  pr_122_quinacridone_magenta: 'pr_122_quinacridone_magenta.txt',
  pr_144_azo_red: 'pr_144_azo_red.txt',
  pr_166_azo_condensation_red: 'pr_166_azo_condensation_red.txt',
  pr_168_anthraquinone_scarlet: 'pr_168_anthraquinone_scarlet.txt',
  pr_170_1_napthol_red_deep: 'pr_170_1_napthol_red_deep.txt',
  pr_172_erythrosin_b: 'pr_172_erythrosin_b.txt',
  pr_173_rhodamine_b: 'pr_173_rhodamine_b.txt',
  pr_175_benzimidazolone_red_hft: 'pr_175_benzimidazolone_red_hft.txt',
  pr_176_benzimidazolone_carmine: 'pr_176_benzimidazolone_carmine.txt',
  pr_177_anthraquinone_red: 'pr_177_anthraquinone_red.txt',
  pr_179_perylene_maroon: 'pr_179_perylene_maroon.txt',
  pr_206_quinacridone_burnt_scarlet: 'pr_206_quinacridone_burnt_scarlet.txt',
  pr_254_pyrrole_red: 'pr_254_pyrrole_red.txt',
  pr_255_pyrrole_scarlet: 'pr_255_pyrrole_scarlet.txt',
  pr_259_ultramarine_pink: 'pr_259_ultramarine_pink.txt',
  pr_264_pyrrole_red_rubine: 'pr_264_pyrrole_red_rubine.txt',
  pr_265_cerium_sulfide_red: 'pr_265_cerium_sulfide_red.txt',
  pr_274_ponceau_4r: 'pr_274_ponceau_4r.txt',
  basic_red_9_fuchsine: 'basic_red_9_fuchsine.txt',
  pv_3_gentian_violet: 'pv_3_gentian_violet.txt',
  pv_15_ultramarine_violet: 'pv_15_ultramarine_violet.txt',
  pv_19_quinacridone_violet: 'pv_19_quinacridone_violet.txt',
  pv_23_dioxazine_purple: 'pv_23_dioxazine_purple.txt',
  pv_37_dioxazine_violet: 'pv_37_dioxazine_violet.txt',
  pv_55_quinacridone_purple: 'pv_55_quinacridone_purple.txt',
  pb_24_erioglaucine: 'pb_24_erioglaucine.txt',
  pb_33_manganese_blue: 'pb_33_manganese_blue.txt',
  pb_66_synthetic_indigo: 'pb_66_synthetic_indigo.txt',
  pg_12_naphthol_green: 'pg_12_naphthol_green.txt',
  pg_36_phthalo_green_ys: 'pg_36_phthalo_green_ys.txt',
  pg_51_victoria_green: 'pg_51_victoria_green.txt',
  pbr_23_disazo_brown: 'pbr_23_disazo_brown.txt',
  pbr_24_chrome_titanate: 'pbr_24_chrome_titanate.txt',
  pbr_25_benzimidazolone_brown: 'pbr_25_benzimidazolone_brown.txt',
}

async function loadOnePigment(pigment: Pigment): Promise<Pigment> {
  const filename = SPECTRUM_FILES[pigment.id]
  if (!filename) {
    console.warn(`Нет файла спектра для: ${pigment.id}`)
    return pigment
  }

  try {
    const response = await fetch(`/spectra/${filename}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const text = await response.text()
    const initialized = initPigment(pigment, text)
    console.log(`✓ ${pigment.name.ru} → ${initialized.hex}`)
    return initialized
  } catch (err) {
    console.error(`Ошибка загрузки ${pigment.id}:`, err)
    return pigment
  }
}

/** Быстрая загрузка только пигментов, нужных для темы (параллельно) */
export async function loadThemePigments(): Promise<Pigment[]> {
  const themeIds = new Set(THEME_PIGMENT_IDS as readonly string[])
  const themePigments = PIGMENTS.filter((p) => themeIds.has(p.id))
  return Promise.all(themePigments.map(loadOnePigment))
}

/** Полная загрузка всех пигментов (для колористики и т.д.) */
export async function loadAllPigments(): Promise<Pigment[]> {
  // Сначала быстро тема
  const theme = await loadThemePigments()

  // Потом остальные
  const themeIds = new Set(THEME_PIGMENT_IDS as readonly string[])
  const rest = PIGMENTS.filter((p) => !themeIds.has(p.id))
  const restResults = await Promise.all(rest.map(loadOnePigment))

  // Собираем полный список в том же порядке, что и PIGMENTS
  const map = new Map<string, Pigment>()
  ;[...theme, ...restResults].forEach((p) => map.set(p.id, p))

  return PIGMENTS.map((p) => map.get(p.id) || p)
}

export function getColorFromSpectrumText(text: string) {
  const spectrum = parseSpectrum(text)
  const rgb = spectrumToRGB(spectrum)
  return {
    rgb,
    hex: rgbToHex(rgb),
  }
}
