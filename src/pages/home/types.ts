import type { Lang, FavoriteItem } from '../../App'

export type HomePageProps = {
  onBack?: () => void
  onOpenBlog?: () => void
  onOpenCalcMenu?: () => void
  onOpenColors?: () => void
  onOpenStyles?: () => void
  onOpenGlossary?: (termId?: string) => void
  onOpenPrices?: () => void
  onOpenSneakers?: () => void
  onOpenMaterials?: () => void
  lang: Lang
  setLang: (lang: Lang) => void
  favorites?: FavoriteItem[]
  onOpenArticle?: (articleId: string) => void
  onOpenFavorites?: () => void
  onChangeTab?: (tab: 'search' | 'settings' | 'profile') => void
}

export type MenuItem = {
  id: string
  roman: string
  title: string
  subtitle: string
  tag: string
  action?: () => void
  dot?: boolean
}

export type SearchResultItem = {
  id: string
  type: 'category' | 'article' | 'glossary'
  title: string
  subtitle: string
}

export type HomeStrings = {
  back: string
  issue: string
  heroTag: string
  heroTitle: string
  heroCta: string
  search: string
  clear: string
  learning: string
  tools: string
  system: string
  materials: string
  materialsSub: string
  cardioBadge: string
  cardioDesc: string
  cardioCta: string
  colors: string
  colorsSub: string
  styles: string
  stylesSub: string
  sneakers: string
  sneakersSub: string
  calc: string
  calcSub: string
  blog: string
  blogSub: string
  glossary: string
  glossarySub: string
  prices: string
  pricesSub: string
  settings: string
  settingsSub: string
  profile: string
  profileSub: string
  favorites: string
  favoritesSub: string
  supportTitle: string
  supportDesc: string
  quote: string
  searchResults: string
  noResults: string
  section: string
}

export type HomePalette = {
  isDark: boolean
  bg: string
  bgMesh: string
  headerBg: string
  surface: string
  surfaceElevated: string
  surfaceHover: string
  surfaceSubtle: string
  cardioBg: string
  tributeBg: string
  text: string
  textMuted: string
  textSubtle: string
  border: string
  borderStrong: string
  shadowCard: string
  shadowHero: string
  accentBronze: string
  accentBronzeSoft: string
  accentRed: string
  pillActiveBg: string
  pillActiveText: string
  pillActiveBorder: string
}

export type TelegramWebAppLike = {
  disableVerticalSwipes?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  openTelegramLink?: (url: string) => void
}

export type ExtendedWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebAppLike
  }
}

