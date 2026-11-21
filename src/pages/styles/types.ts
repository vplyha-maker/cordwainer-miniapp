export type SupportedLang = 'ru' | 'uk' | 'de'

export function normalizeSupportedLang(input: unknown): SupportedLang {
  if (input === 'ru' || input === 'uk' || input === 'de') return input
  return 'ru'
}

export type StyleSlide = {
  id: string
  video?: string
  poster?: string
  image?: string
  title: { ru: string; uk: string; de: string }
  subtitle: { ru: string; uk: string; de: string }
  desc: { ru: string; uk: string; de: string }
  hideWatermark?: boolean
}

export type PaymentState =
  | 'idle'
  | 'creating_invoice'
  | 'invoice_open'
  | 'verifying_payment'
  | 'purchased'
  | 'failed'

export const PRO_VIDEOS_PRICE_STARS = 350
export const FREE_STYLES_COUNT = 3
export const PREVIEW_TAG_COUNT = 4
export const PRO_STORAGE_KEY = 'cordwainer_pro_videos_unlocked'

