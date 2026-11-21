import type { Lang } from '../../App'
import type { Gender, MeasureMode, ShoeStyle, WidthFit } from '../../lib/shoeSizes'
import type { SupportedLang } from '../../lib/sizeCalcI18n'

export type SizeCalcPageProps = {
  onBack: () => void
  lang: Lang
}

export type ActiveTab = 'world' | 'fit' | 'brands' | 'guide'
export type UnitMode = 'cm' | 'mm'

export type SavedPrefs = {
  gender?: Gender
  measureMode?: MeasureMode
  unit?: UnitMode
  shoeStyle?: ShoeStyle
  widthFit?: WidthFit
  footMm?: number
}

export const RULER_TICKS = 31
export const PREFS_STORAGE_KEY = 'cordwaine_size_calc_prefs_v1'
export const LEGACY_PREFS_STORAGE_KEY = 'cordwainer_size_calc_prefs_v1'
export const THEME_STORAGE_KEY = 'cordwaine_theme'
export const APP_THEME_STORAGE_KEY = 'cordwainer_theme'
export const HAPTICS_STORAGE_KEY = 'cordwainer_haptics_enabled_v1'

export const VALID_GENDERS: Gender[] = ['men', 'women', 'kids']
export const VALID_MODES: MeasureMode[] = ['foot', 'insole']
export const VALID_UNITS: UnitMode[] = ['cm', 'mm']
export const VALID_STYLES: ShoeStyle[] = ['sneakers', 'classic', 'winter', 'running', 'sandals']
export const VALID_WIDTHS: WidthFit[] = ['narrow', 'standard', 'wide', 'extraWide']

export type UiLabels = {
  styleSection: string
  widthSection: string
  groupSport: string
  groupClassic: string
  footerBrand: string
  reservePrefix: string
  reserveWidthPrefix: string
}

export const UI_LABELS: Record<SupportedLang, UiLabels> = {
  uk: {
    styleSection: 'Тип взуття та запас',
    widthSection: 'Повнота стопи',
    groupSport: 'Спорт і кросівки',
    groupClassic: 'Класика і шкіра',
    footerBrand: 'Cordwaine · Калькулятор розмірів',
    reservePrefix: 'Із запасом',
    reserveWidthPrefix: 'Запас по повноті',
  },
  ru: {
    styleSection: 'Тип обуви и запас',
    widthSection: 'Полнота стопы',
    groupSport: 'Спорт и кроссовки',
    groupClassic: 'Классика и кожа',
    footerBrand: 'Cordwaine · Калькулятор размеров',
    reservePrefix: 'С запасом',
    reserveWidthPrefix: 'Запас по полноте',
  },
  en: {
    styleSection: 'Footwear Type & Allowance',
    widthSection: 'Foot Width',
    groupSport: 'Sport & Sneakers',
    groupClassic: 'Classic & Leather',
    footerBrand: 'Cordwaine · Size Calculator',
    reservePrefix: 'With reserve',
    reserveWidthPrefix: 'Width reserve',
  },
  de: {
    styleSection: 'Schuhtyp & Zugabe',
    widthSection: 'Fußweite',
    groupSport: 'Sport & Sneaker',
    groupClassic: 'Klassik & Leder',
    footerBrand: 'Cordwaine · Größenrechner',
    reservePrefix: 'Mit Zugabe',
    reserveWidthPrefix: 'Weitenzugabe',
  },
}

