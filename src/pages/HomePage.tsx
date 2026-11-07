import { useEffect, useState, useRef, type CSSProperties } from 'react'
import { BLOG_ARTICLES } from '../data/blog'
import { GLOSSARY_TERMS } from '../data/glossary'
import { CALCULATORS_COUNT } from './CalcMenuPage'
import type { Lang, FavoriteItem } from '../App'

type HomePageProps = {
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

type MenuItem = {
  id: string
  roman: string
  title: string
  subtitle: string
  tag: string
  action?: () => void
  dot?: boolean
}

const HERO_FRAME_CACHE_KEY = 'cordwainer_hero_frame_v2'
let memoryCachedHeroFrame: string | null = null
let sharedHeroVideo: HTMLVideoElement | null = null
let sharedBufferCanvas: HTMLCanvasElement | null = null
let hasValidBufferFrame = false

function getInitialHeroPoster(): string | null {
  if (memoryCachedHeroFrame) return memoryCachedHeroFrame
  try {
    const saved =
      localStorage.getItem(HERO_FRAME_CACHE_KEY) ||
      sessionStorage.getItem(HERO_FRAME_CACHE_KEY)
    if (saved && saved.startsWith('data:image/')) {
      memoryCachedHeroFrame = saved
      return saved
    }
  } catch {}
  return null
}

function getOrCreateSharedVideo(): HTMLVideoElement {
  if (sharedHeroVideo && document.body.contains(sharedHeroVideo)) {
    return sharedHeroVideo
  }
  const videoEl = document.createElement('video')
  videoEl.src = '/Fason/Topsaed.mp4'
  videoEl.muted = true
  videoEl.defaultMuted = true
  videoEl.playsInline = true
  videoEl.loop = true
  videoEl.preload = 'auto'
  videoEl.setAttribute('playsinline', '')
  videoEl.setAttribute('webkit-playsinline', '')
  videoEl.setAttribute('muted', '')

  // Размер 48x48 и высокий z-index не дают Chromium считать видео перекрытым (occluded)
  // или фоновым 1x1 пикселем, а opacity 0.001 делает его полностью невидимым для глаза.
  Object.assign(videoEl.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '48px',
    height: '48px',
    opacity: '0.001',
    pointerEvents: 'none',
    zIndex: '9999',
    transform: 'translateZ(0)',
  })

  document.body.appendChild(videoEl)
  sharedHeroVideo = videoEl
  return videoEl
}

function getOrCreateBufferCanvas(w: number, h: number): HTMLCanvasElement {
  if (!sharedBufferCanvas) {
    sharedBufferCanvas = document.createElement('canvas')
  }
  if (sharedBufferCanvas.width !== w || sharedBufferCanvas.height !== h) {
    sharedBufferCanvas.width = w
    sharedBufferCanvas.height = h
    hasValidBufferFrame = false
  }
  return sharedBufferCanvas
}

/**
 * Автоматически убирает белый фон вокруг 3D-логотипа и обрезает лишние пустые поля,
 * чтобы эмблема отображалась целиком и без белого квадрата в темной теме.
 */
function useTransparentLogo(src: string): string {
  const [processedSrc, setProcessedSrc] = useState<string>(src)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      if (cancelled) return
      try {
        const w = img.naturalWidth
        const h = img.naturalHeight
        if (!w || !h) return

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(img, 0, 0)
        const imgData = ctx.getImageData(0, 0, w, h)
        const data = imgData.data
        const total = w * h

        const isBg = new Uint8Array(total)
        const queue = new Int32Array(total)
        let head = 0
        let tail = 0

        const isWhiteLike = (idx: number) => {
          const p = idx * 4
          if (data[p + 3] < 20) return true
          const r = data[p]
          const g = data[p + 1]
          const b = data[p + 2]
          const minC = Math.min(r, g, b)
          const maxC = Math.max(r, g, b)
          return minC >= 224 && maxC - minC <= 28
        }

        const pushIfBg = (x: number, y: number) => {
          const idx = y * w + x
          if (!isBg[idx] && isWhiteLike(idx)) {
            isBg[idx] = 1
            queue[tail++] = idx
          }
        }

        for (let x = 0; x < w; x++) {
          pushIfBg(x, 0)
          pushIfBg(x, h - 1)
        }
        for (let y = 0; y < h; y++) {
          pushIfBg(0, y)
          pushIfBg(w - 1, y)
        }

        while (head < tail) {
          const curr = queue[head++]
          const cx = curr % w
          const cy = (curr - cx) / w

          if (cx > 0) pushIfBg(cx - 1, cy)
          if (cx < w - 1) pushIfBg(cx + 1, cy)
          if (cy > 0) pushIfBg(cx, cy - 1)
          if (cy < h - 1) pushIfBg(cx, cy + 1)
        }

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x
            const p = idx * 4
            if (isBg[idx]) {
              data[p + 3] = 0
              continue
            }

            let nearBg = false
            for (let dy = -2; dy <= 2 && !nearBg; dy++) {
              const ny = y + dy
              if (ny < 0 || ny >= h) continue
              for (let dx = -2; dx <= 2; dx++) {
                const nx = x + dx
                if (nx < 0 || nx >= w) continue
                if (isBg[ny * w + nx]) {
                  nearBg = true
                  break
                }
              }
            }

            if (nearBg) {
              const r = data[p]
              const g = data[p + 1]
              const b = data[p + 2]
              const minC = Math.min(r, g, b)
              const maxC = Math.max(r, g, b)
              if (minC > 165 && maxC - minC < 35) {
                const alphaRatio = Math.max(0, Math.min(1, (240 - minC) / 75))
                data[p + 3] = Math.round(data[p + 3] * alphaRatio)
                if (alphaRatio > 0.05) {
                  data[p] = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - alphaRatio)) / alphaRatio)))
                  data[p + 1] = Math.max(0, Math.min(255, Math.round((g - 255 * (1 - alphaRatio)) / alphaRatio)))
                  data[p + 2] = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - alphaRatio)) / alphaRatio)))
                }
              }
            }
          }
        }

        let minX = w
        let minY = h
        let maxX = 0
        let maxY = 0
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 20) {
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }
          }
        }

        ctx.putImageData(imgData, 0, 0)

        if (maxX > minX && maxY > minY) {
          const pad = Math.round(Math.max(w, h) * 0.025)
          const sx = Math.max(0, minX - pad)
          const sy = Math.max(0, minY - pad)
          const sw = Math.min(w - sx, maxX - minX + 1 + pad * 2)
          const sh = Math.min(h - sy, maxY - minY + 1 + pad * 2)

          const cropped = document.createElement('canvas')
          cropped.width = sw
          cropped.height = sh
          const cCtx = cropped.getContext('2d')
          if (cCtx) {
            cCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)
            setProcessedSrc(cropped.toDataURL('image/png'))
            return
          }
        }

        setProcessedSrc(canvas.toDataURL('image/png'))
      } catch {
        // Fallback to original image
      }
    }

    img.src = src
    return () => {
      cancelled = true
    }
  }, [src])

  return processedSrc
}

function glossaryLabel(count: number, lang: Lang): string {
  if (lang === 'uk') {
    const n10 = count % 10
    const n100 = count % 100
    if (n10 === 1 && n100 !== 11) return `${count} термін`
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return `${count} терміни`
    return `${count} термінів`
  }
  if (lang === 'de') {
    return count === 1 ? `${count} Begriff` : `${count} Begriffe`
  }
  const n10 = count % 10
  const n100 = count % 100
  if (n10 === 1 && n100 !== 11) return `${count} термин`
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return `${count} термина`
  return `${count} терминов`
}

const deepSearch = (obj: any, query: string): boolean => {
  if (!obj) return false
  if (typeof obj === 'string') return obj.toLowerCase().includes(query)
  if (typeof obj === 'object') {
    return Object.values(obj).some((val) => deepSearch(val, query))
  }
  return false
}

const getDisplayTitle = (item: any, lang: Lang): string => {
  if (!item) return '...'
  if (typeof item.title === 'string') return item.title
  if (item.title && item.title[lang]) return item.title[lang]
  if (typeof item.name === 'string') return item.name
  if (item.name && item.name[lang]) return item.name[lang]
  if (typeof item.term === 'string') return item.term
  if (item.term && item.term[lang]) return item.term[lang]
  return '...'
}

export function HomePage({
  onBack,
  onOpenBlog,
  onOpenCalcMenu,
  onOpenColors,
  onOpenStyles,
  onOpenGlossary,
  onOpenPrices,
  onOpenSneakers,
  onOpenMaterials,
  lang,
  setLang,
  favorites = [],
  onOpenArticle,
  onOpenFavorites,
  onChangeTab,
}: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [posterSrc, setPosterSrc] = useState<string | null>(getInitialHeroPoster)
  const [hasCanvasFrame, setHasCanvasFrame] = useState<boolean>(() => hasValidBufferFrame)

  const heroContainerRef = useRef<HTMLDivElement | null>(null)
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const transparentLogoSrc = useTransparentLogo('/logo.png')

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  const hasNewBlog = BLOG_ARTICLES?.some((a) => a.isNew) || false
  const articleFavorites = favorites?.filter((f) => f.type === 'article') || []
  const glossaryCount = GLOSSARY_TERMS?.length || 0

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    try {
      window.Telegram?.WebApp?.disableVerticalSwipes?.()
    } catch {}

    const checkTheme = () => {
      const dark = document.documentElement.classList.contains('dark')
      setIsDark(dark)
      try {
        const bgHex = dark ? '#0A0A0A' : '#F2EFE9'
        window.Telegram?.WebApp?.setHeaderColor?.(bgHex)
        window.Telegram?.WebApp?.setBackgroundColor?.(bgHex)
      } catch {}
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang
    const supportedLangs = ['ru', 'uk', 'de']
    if (savedLang && supportedLangs.includes(savedLang) && savedLang !== lang) {
      setLang(savedLang)
    }
  }, [lang, setLang])

  /**
   * Защищённый CPU-backed рендерер видео для Android WebView / iOS WKWebView:
   * - Контекст { willReadFrequently: true } отключает Hardware Overlay Hole Punching,
   *   из-за которого после отпускания скролла появлялся серый экран.
   * - Проверка пикселей отсекает чёрные/пустые кадры при старте декодера.
   */
  useEffect(() => {
    if (searchQuery.trim() !== '') return

    const containerEl = heroContainerRef.current
    const canvasEl = heroCanvasRef.current
    if (!containerEl || !canvasEl) return

    const videoEl = getOrCreateSharedVideo()
    const displayCtx = canvasEl.getContext('2d', { willReadFrequently: true })
    if (!displayCtx) return

    let rafId = 0
    let isCancelled = false
    let lastDrawnVideoTime = -1
    let hasSavedPoster = Boolean(memoryCachedHeroFrame)

    const syncCanvasSize = () => {
      const cw = canvasEl.clientWidth || containerEl.clientWidth || 360
      const ch = canvasEl.clientHeight || containerEl.clientHeight || 240
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const targetW = Math.max(1, Math.round(cw * dpr))
      const targetH = Math.max(1, Math.round(ch * dpr))
      return { targetW, targetH }
    }

    // Если в буфере уже есть валидный кадр — мгновенно рисуем его без ожидания видео
    if (hasValidBufferFrame && sharedBufferCanvas) {
      const { targetW, targetH } = syncCanvasSize()
      if (canvasEl.width !== targetW || canvasEl.height !== targetH) {
        canvasEl.width = targetW
        canvasEl.height = targetH
      }
      displayCtx.drawImage(sharedBufferCanvas, 0, 0, targetW, targetH)
      setHasCanvasFrame(true)
    }

    const ensurePlaying = () => {
      if (isCancelled) return
      videoEl.muted = true
      if (videoEl.paused || videoEl.ended) {
        videoEl.play().catch(() => {})
      }
    }

    const renderLoop = () => {
      if (isCancelled) return

      const { targetW, targetH } = syncCanvasSize()
      const bufCanvas = getOrCreateBufferCanvas(targetW, targetH)
      const bufCtx = bufCanvas.getContext('2d', { willReadFrequently: true })

      const isVideoReady =
        videoEl.readyState >= 2 &&
        videoEl.videoWidth > 0 &&
        videoEl.videoHeight > 0 &&
        !videoEl.seeking

      if (isVideoReady && bufCtx && videoEl.currentTime !== lastDrawnVideoTime) {
        const vw = videoEl.videoWidth
        const vh = videoEl.videoHeight
        const scale = Math.max(targetW / vw, targetH / vh)
        const sw = targetW / scale
        const sh = targetH / scale
        const sx = (vw - sw) * 0.5
        const sy = (vh - sh) * 0.5

        try {
          bufCtx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, targetW, targetH)

          // Проверяем 3 точки кадра, чтобы никогда не пропустить чёрный/пустой кадр
          const p1 = bufCtx.getImageData(targetW >> 1, targetH >> 1, 1, 1).data
          const p2 = bufCtx.getImageData(targetW >> 2, targetH >> 2, 1, 1).data
          const p3 = bufCtx.getImageData((targetW * 3) >> 2, (targetH * 2) >> 2, 1, 1).data

          const brightness =
            Math.max(p1[0], p1[1], p1[2]) +
            Math.max(p2[0], p2[1], p2[2]) +
            Math.max(p3[0], p3[1], p3[2])

          if (p1[3] > 200 && brightness > 45) {
            hasValidBufferFrame = true
            lastDrawnVideoTime = videoEl.currentTime

            if (canvasEl.width !== targetW || canvasEl.height !== targetH) {
              canvasEl.width = targetW
              canvasEl.height = targetH
            }
            displayCtx.drawImage(bufCanvas, 0, 0, targetW, targetH)
            setHasCanvasFrame(true)

            if (!hasSavedPoster && videoEl.currentTime > 0.12) {
              hasSavedPoster = true
              try {
                const dataUrl = bufCanvas.toDataURL('image/jpeg', 0.82)
                if (dataUrl && dataUrl.length > 200) {
                  memoryCachedHeroFrame = dataUrl
                  setPosterSrc(dataUrl)
                  try {
                    localStorage.setItem(HERO_FRAME_CACHE_KEY, dataUrl)
                  } catch {}
                  try {
                    sessionStorage.setItem(HERO_FRAME_CACHE_KEY, dataUrl)
                  } catch {}
                }
              } catch {}
            }
          }
        } catch {}
      } else if (hasValidBufferFrame && sharedBufferCanvas) {
        // Поддерживаем актуальный кадр на экране даже при ресайзе/overscroll
        if (canvasEl.width !== targetW || canvasEl.height !== targetH) {
          canvasEl.width = targetW
          canvasEl.height = targetH
          displayCtx.drawImage(sharedBufferCanvas, 0, 0, targetW, targetH)
        }
      }

      rafId = window.requestAnimationFrame(renderLoop)
    }

    ensurePlaying()
    rafId = window.requestAnimationFrame(renderLoop)

    // Мягкий таймер проверки без сброса currentTime и без pause()
    const keepAliveId = window.setInterval(ensurePlaying, 600)

    const onScrollOrTouch = () => {
      ensurePlaying()
      if (hasValidBufferFrame && sharedBufferCanvas && canvasEl) {
        const { targetW, targetH } = syncCanvasSize()
        if (canvasEl.width !== targetW || canvasEl.height !== targetH) {
          canvasEl.width = targetW
          canvasEl.height = targetH
        }
        displayCtx.drawImage(sharedBufferCanvas, 0, 0, targetW, targetH)
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        ensurePlaying()
      }
    }

    window.addEventListener('scroll', onScrollOrTouch, { passive: true })
    window.addEventListener('touchstart', onScrollOrTouch, { passive: true })
    window.addEventListener('touchend', onScrollOrTouch, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      isCancelled = true
      window.cancelAnimationFrame(rafId)
      window.clearInterval(keepAliveId)
      window.removeEventListener('scroll', onScrollOrTouch)
      window.removeEventListener('touchstart', onScrollOrTouch)
      window.removeEventListener('touchend', onScrollOrTouch)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isDark, searchQuery])

  const handleLangChange = (newLang: Lang) => {
    localStorage.setItem('app_lang', newLang)
    localStorage.setItem('cordwainer_lang', newLang)
    setLang(newLang)
  }

  const safeLang = lang && ['ru', 'uk', 'de'].includes(lang) ? lang : 'uk'

  const t = {
    ru: {
      back: 'Назад',
      issue: 'ВЫПУСК № 01 — ЦИФРОВАЯ ЭНЦИКЛОПЕДИЯ',
      heroTag: 'ВИДЕО-ЛУКБУК • 15 СИЛУЭТОВ',
      heroTitle: 'Анатомия\nФормы',
      heroCta: 'Смотреть лукбук',
      search: 'Поиск: коллекция Cardio, силуэты, статьи...',
      clear: 'Сброс',
      learning: 'I. ДОМ ОБУВИ И ЭКСПОЗИЦИЯ',
      tools: 'II. ИНСТРУМЕНТАРИЙ И АРХИВ',
      system: 'III. СИСТЕМА И КОЛЛЕКЦИЯ',
      materials: 'Cardio',
      materialsSub: 'Производство • Опт',
      cardioBadge: 'MAISON CARDIO',
      cardioDesc:
        'Авторское производство мужской обуви. Сезонный лукбук, колодки и прямой оптовый заказ.',
      cardioCta: 'Открыть коллекцию',
      colors: 'Цвета',
      colorsSub: 'Патина и колористика',
      styles: 'Силуэты',
      stylesSub: '15 культовых фасонов',
      sneakers: 'Footwear Index',
      sneakersSub: 'Каталог и мировые релизы',
      calc: 'Калькуляторы',
      calcSub: `${CALCULATORS_COUNT} точных модулей`,
      blog: 'Архив статей',
      blogSub: hasNewBlog ? 'Свежий выпуск' : 'Журнал',
      glossary: 'Глоссарий',
      glossarySub: glossaryLabel(glossaryCount, 'ru'),
      prices: 'Рынок',
      pricesSub: 'Индекс цен',
      settings: 'Интерфейс',
      settingsSub: 'Тема и язык',
      profile: 'Профиль',
      profileSub: 'Личные данные',
      favorites: 'Личный архив',
      favoritesSub:
        articleFavorites.length > 0 ? `Сохранено томов: ${articleFavorites.length}` : 'Пусто',
      supportTitle: 'Меценатство',
      supportDesc: 'Поддержать издание',
      quote: '«Мастерство — в деталях. Знание — в опыте.»',
      searchResults: 'Найдено в архиве',
      noResults: 'По вашему запросу записей не найдено',
      section: 'Раздел',
    },
    uk: {
      back: 'Назад',
      issue: 'ВИПУСК № 01 — ЦИФРОВА ЕНЦИКЛОПЕДІЯ',
      heroTag: 'ВІДЕО-ЛУКБУК • 15 СИЛУЕТІВ',
      heroTitle: 'Анатомія\nФорми',
      heroCta: 'Дивитися лукбук',
      search: 'Пошук: колекція Cardio, силуети, статті...',
      clear: 'Скинути',
      learning: 'I. ДІМ ВЗУТТЯ ТА ЕКСПОЗИЦІЯ',
      tools: 'II. ІНСТРУМЕНТАРІЙ ТА АРХІВ',
      system: 'III. СИСТЕМА ТА КОЛЕКЦІЯ',
      materials: 'Cardio',
      materialsSub: 'Виробництво • Гурт',
      cardioBadge: 'MAISON CARDIO',
      cardioDesc:
        'Авторське виробництво чоловічого взуття. Сезонний лукбук, колодки та пряме гуртове замовлення.',
      cardioCta: 'Відкрити колекцію',
      colors: 'Кольори',
      colorsSub: 'Патина та колористика',
      styles: 'Силуети',
      stylesSub: '15 культових фасонів',
      sneakers: 'Footwear Index',
      sneakersSub: 'Каталог та світові релізи',
      calc: 'Калькулятори',
      calcSub: `${CALCULATORS_COUNT} точних модулів`,
      blog: 'Архів статей',
      blogSub: hasNewBlog ? 'Свіжий випуск' : 'Журнал',
      glossary: 'Глосарій',
      glossarySub: glossaryLabel(glossaryCount, 'uk'),
      prices: 'Ринок',
      pricesSub: 'Індекс цін',
      settings: 'Інтерфейс',
      settingsSub: 'Тема та мова',
      profile: 'Профіль',
      profileSub: 'Особисті дані',
      favorites: 'Особистий архів',
      favoritesSub:
        articleFavorites.length > 0 ? `Збережено томів: ${articleFavorites.length}` : 'Порожньо',
      supportTitle: 'Меценатство',
      supportDesc: 'Підтримати видання',
      quote: '«Майстерність — в деталях. Знання — в досвіді.»',
      searchResults: 'Знайдено в архіві',
      noResults: 'За вашим запитом записів не знайдено',
      section: 'Розділ',
    },
    de: {
      back: 'Zurück',
      issue: 'AUSGABE № 01 — DIGITALE ENZYKLOPÄDIE',
      heroTag: 'VIDEO-LOOKBOOK • 15 SILHOUETTEN',
      heroTitle: 'Anatomie\nder Form',
      heroCta: 'Lookbook öffnen',
      search: 'Suche: Cardio Kollektion, Silhouetten, Artikel...',
      clear: 'Löschen',
      learning: 'I. SCHUHHAUS & EXPOSITION',
      tools: 'II. WERKZEUGE & ARCHIV',
      system: 'III. SYSTEM & SAMMLUNG',
      materials: 'Cardio',
      materialsSub: 'Manufaktur • B2B',
      cardioBadge: 'MAISON CARDIO',
      cardioDesc:
        'Herrenschuh-Manufaktur. Saisonales Lookbook, Leisten und direkte B2B-Bestellung.',
      cardioCta: 'Kollektion öffnen',
      colors: 'Farben',
      colorsSub: 'Patina & Farblehre',
      styles: 'Silhouetten',
      stylesSub: '15 ikonische Schnitte',
      sneakers: 'Footwear Index',
      sneakersSub: 'Katalog & Releases',
      calc: 'Rechner',
      calcSub: `${CALCULATORS_COUNT} Präzisionsmodule`,
      blog: 'Artikelarchiv',
      blogSub: hasNewBlog ? 'Neue Ausgabe' : 'Journal',
      glossary: 'Glossar',
      glossarySub: glossaryLabel(glossaryCount, 'de'),
      prices: 'Markt',
      pricesSub: 'Preisindex',
      settings: 'Oberfläche',
      settingsSub: 'Design & Sprache',
      profile: 'Profil',
      profileSub: 'Persönliche Daten',
      favorites: 'Persönliches Archiv',
      favoritesSub:
        articleFavorites.length > 0 ? `Gespeicherte Bände: ${articleFavorites.length}` : 'Leer',
      supportTitle: 'Patronat',
      supportDesc: 'Edition unterstützen',
      quote: '„Meisterschaft liegt im Detail. Wissen in der Erfahrung.“',
      searchResults: 'Suchergebnisse',
      noResults: 'Keine Einträge gefunden',
      section: 'Bereich',
    },
  }[safeLang]

  const LEARNING: MenuItem[] = [
    { id: 'materials', roman: '01', tag: 'MAISON', title: t.materials, subtitle: t.materialsSub, action: onOpenMaterials },
    { id: 'colors', roman: '02', tag: 'PALETTE', title: t.colors, subtitle: t.colorsSub, action: onOpenColors },
    { id: 'styles', roman: '03', tag: 'LOOKBOOK', title: t.styles, subtitle: t.stylesSub, action: onOpenStyles },
    { id: 'sneakers', roman: '04', tag: 'CATALOG', title: t.sneakers, subtitle: t.sneakersSub, action: onOpenSneakers },
  ]

  const TOOLS: MenuItem[] = [
    { id: 'calc', roman: '05', tag: 'UTILITY', title: t.calc, subtitle: t.calcSub, action: onOpenCalcMenu },
    { id: 'blog', roman: '06', tag: 'EDITORIAL', title: t.blog, subtitle: t.blogSub, action: onOpenBlog, dot: hasNewBlog },
    { id: 'glossary', roman: '07', tag: 'LEXICON', title: t.glossary, subtitle: t.glossarySub, action: () => onOpenGlossary?.() },
    { id: 'prices', roman: '08', tag: 'VALUATION', title: t.prices, subtitle: t.pricesSub, action: onOpenPrices },
  ]

  const SYSTEM: MenuItem[] = [
    { id: 'settings', roman: '09', tag: 'PREFERENCES', title: t.settings, subtitle: t.settingsSub, action: () => onChangeTab?.('settings') },
    { id: 'profile', roman: '10', tag: 'IDENTITY', title: t.profile, subtitle: t.profileSub, action: () => onChangeTab?.('profile') },
  ]

  const query = searchQuery.trim().toLowerCase()
  const searchResults: Array<{ id: string; type: string; title: string; subtitle: string }> = []

  if (query) {
    ;[...LEARNING, ...TOOLS, ...SYSTEM].forEach((item) => {
      if (item.title.toLowerCase().includes(query) || item.subtitle.toLowerCase().includes(query)) {
        searchResults.push({ type: 'category', id: item.id, title: item.title, subtitle: t.section })
      }
    })
    BLOG_ARTICLES?.forEach((article) => {
      if (deepSearch(article, query)) {
        searchResults.push({ type: 'article', id: article.id, title: getDisplayTitle(article, safeLang), subtitle: t.blog })
      }
    })
    GLOSSARY_TERMS?.forEach((term) => {
      if (deepSearch(term, query)) {
        searchResults.push({ type: 'glossary', id: term.id, title: getDisplayTitle(term, safeLang), subtitle: t.glossary })
      }
    })
  }

  const handleResultClick = (res: any) => {
    if (res.type === 'category') {
      const match = [...LEARNING, ...TOOLS, ...SYSTEM].find((i) => i.id === res.id)
      match?.action?.()
    } else if (res.type === 'article') {
      onOpenArticle?.(res.id)
    } else if (res.type === 'glossary') {
      onOpenGlossary?.(res.id)
    }
    setSearchQuery('')
  }

  const handleSupportClick = () => {
    const tributeLink = 'https://t.me/tribute/app?startapp=dQO9'
    const tg = (window as any).Telegram?.WebApp

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(tributeLink)
    } else {
      window.open(tributeLink, '_blank')
    }
  }

  const palette = isDark
    ? {
        text: '#F4EFE6',
        textMuted: 'rgba(244, 239, 230, 0.56)',
        textSubtle: 'rgba(244, 239, 230, 0.36)',
        line: 'rgba(244, 239, 230, 0.13)',
        lineStrong: 'rgba(244, 239, 230, 0.32)',
        surface: 'rgba(244, 239, 230, 0.025)',
        cardioSurface:
          'linear-gradient(135deg, rgba(244, 239, 230, 0.04) 0%, rgba(197, 168, 128, 0.05) 55%, rgba(37, 99, 235, 0.07) 100%)',
        bg: '#0A0A0A',
        accentRed: '#991B1B',
        accentBronze: '#C5A880',
      }
    : {
        text: '#161412',
        textMuted: 'rgba(22, 20, 18, 0.58)',
        textSubtle: 'rgba(22, 20, 18, 0.40)',
        line: 'rgba(22, 20, 18, 0.12)',
        lineStrong: 'rgba(22, 20, 18, 0.28)',
        surface: 'rgba(22, 20, 18, 0.025)',
        cardioSurface:
          'linear-gradient(135deg, rgba(255, 255, 255, 0.62) 0%, rgba(234, 230, 223, 0.55) 65%, rgba(122, 92, 56, 0.06) 100%)',
        bg: '#F2EFE9',
        accentRed: '#881313',
        accentBronze: '#7A5C38',
      }

  const gridItems = LEARNING.slice(1, 3) // 02 Цвета, 03 Силуэты
  const catalogItem = LEARNING[3] // 04 Footwear Index

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden select-none"
      style={{
        background: palette.bg,
        color: palette.text,
      }}
    >
      <style>{`
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none;
        }
      `}</style>

      <div className="relative z-10 flex flex-col min-h-screen max-w-[540px] mx-auto px-5 sm:px-8">
        {/* Верхний колонтитул (Running Header) */}
        <header
          className="pt-6 pb-4 flex items-center justify-between border-b"
          style={{ borderColor: palette.line }}
        >
          {onBack ? (
            <button
              onClick={onBack}
              className="group flex items-center gap-2 text-[9px] font-sans uppercase tracking-[0.28em] outline-none border-0 bg-transparent cursor-pointer active:opacity-50 transition-opacity"
              style={{ color: palette.textMuted }}
            >
              <span>←</span>
              <span>{t.back}</span>
            </button>
          ) : (
            <span
              className="text-[9px] font-sans uppercase tracking-[0.3em]"
              style={{ color: palette.textMuted }}
            >
              CORDWAINER × CARDIO
            </span>
          )}

          {/* Переключатель языков со слэшами (единый код UA) */}
          <div className="flex items-center gap-3">
            {(['ru', 'uk', 'de'] as Lang[]).map((l, i) => (
              <div key={l} className="flex items-center gap-3">
                <button
                  onClick={() => handleLangChange(l)}
                  className="text-[9px] font-mono uppercase tracking-[0.24em] outline-none border-0 bg-transparent cursor-pointer transition-all"
                  style={{
                    color: safeLang === l ? palette.text : palette.textSubtle,
                    borderBottom: safeLang === l ? `1px solid ${palette.text}` : '1px solid transparent',
                    paddingBottom: '2px',
                  }}
                >
                  {l === 'uk' ? 'UA' : l.toUpperCase()}
                </button>
                {i < 2 && (
                  <span className="text-[8px]" style={{ color: palette.line }}>
                    /
                  </span>
                )}
              </div>
            ))}
          </div>
        </header>

        <div className="pb-20">
          {/* Журнальная шапка (Masthead) */}
          <div className="pt-7 pb-6">
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-[8.5px] font-sans uppercase tracking-[0.28em]"
                style={{ color: palette.textMuted }}
              >
                {t.issue}
              </span>
              <span
                className="text-[11px] font-serif italic"
                style={{ color: palette.textMuted }}
              >
                Vol. I
              </span>
            </div>

            <h1
              className="font-serif text-[13.5vw] min-[440px]:text-[62px] leading-[0.86] tracking-[-0.025em] uppercase font-normal"
              style={{ color: palette.text }}
            >
              Cordwainer
            </h1>
          </div>

          {/* Редакционная строка поиска */}
          <div className="mb-8">
            <div
              className="relative flex items-center py-2.5 px-3.5 border transition-colors"
              style={{
                borderColor: searchQuery ? palette.lineStrong : palette.line,
                backgroundColor: palette.surface,
              }}
            >
              <span
                className="text-[11px] font-serif italic mr-3 shrink-0"
                style={{ color: palette.textMuted }}
              >
                Index.
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className="w-full bg-transparent outline-none border-0 text-[12px] font-sans font-light placeholder:opacity-50"
                style={{ color: palette.text } as CSSProperties}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-2 text-[8px] font-sans uppercase tracking-[0.25em] outline-none border-0 bg-transparent cursor-pointer shrink-0"
                  style={{ color: palette.textMuted }}
                >
                  {t.clear}
                </button>
              )}
            </div>
          </div>

          {query ? (
            /* Выдача поиска */
            <div>
              <p
                className="text-[9px] font-sans uppercase tracking-[0.3em] mb-4 pb-2 border-b"
                style={{ color: palette.textMuted, borderColor: palette.line }}
              >
                {t.searchResults} — {searchResults.length}
              </p>
              {searchResults.length > 0 ? (
                <div className="flex flex-col">
                  {searchResults.map((res, i) => (
                    <button
                      key={`${res.type}-${res.id}-${i}`}
                      onClick={() => handleResultClick(res)}
                      className="w-full group flex items-baseline justify-between py-4 border-b text-left outline-none bg-transparent cursor-pointer active:opacity-50 transition-opacity"
                      style={{ borderColor: palette.line }}
                    >
                      <div
                        className="font-serif text-[21px] leading-snug pr-4 transition-transform group-hover:translate-x-1"
                        style={{ color: palette.text }}
                      >
                        {res.title}
                      </div>
                      <div
                        className="text-[8px] font-sans uppercase tracking-[0.25em] shrink-0"
                        style={{ color: palette.textMuted }}
                      >
                        {res.subtitle} ↗
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  className="py-16 text-[14px] font-serif italic text-center"
                  style={{ color: palette.textMuted }}
                >
                  {t.noResults}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* HERO LOOKBOOK BANNER */}
              {onOpenStyles && (
                <div className="mb-12" ref={heroContainerRef}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={onOpenStyles}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onOpenStyles()
                      }
                    }}
                    className="group relative w-full h-[240px] overflow-hidden border outline-none text-left cursor-pointer block"
                    style={{
                      borderColor: palette.line,
                      background: 'linear-gradient(135deg, #3A2E25 0%, #1F1915 100%)',
                    }}
                  >
                    {/* Слой 0: кэшированный кадр (мгновенно, без чёрного квадрата) */}
                    {posterSrc && (
                      <img
                        src={posterSrc}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover object-center block pointer-events-none"
                        style={{ zIndex: 0 }}
                      />
                    )}

                    {/* Слой 1: Программный Canvas (без Hole Punching и потери буфера при скролле) */}
                    <canvas
                      ref={heroCanvasRef}
                      className="absolute inset-0 w-full h-full block pointer-events-none"
                      style={{
                        zIndex: 1,
                        opacity: hasCanvasFrame ? 1 : 0,
                        transition: 'opacity 0.18s ease-out',
                      }}
                    />

                    {/* Слой 3: виньетка */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(to top, rgba(10,10,10,0.84) 0%, rgba(10,10,10,0.28) 52%, rgba(10,10,10,0.14) 100%)',
                        zIndex: 3,
                      }}
                    />

                    {/* Слой 4: типографика */}
                    <div
                      className="relative h-full p-5 sm:p-6 flex flex-col justify-between text-[#F4EFE6]"
                      style={{ zIndex: 4 }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-sans uppercase tracking-[0.32em] text-[#F4EFE6]/80">
                          {t.heroTag}
                        </span>
                        <span className="text-[9px] font-mono tracking-[0.22em] text-[#F4EFE6]/65">
                          01 / 15
                        </span>
                      </div>

                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <h2 className="font-serif font-normal text-[32px] sm:text-[38px] leading-[1.02] tracking-[-0.015em] whitespace-pre-line drop-shadow-sm">
                            {t.heroTitle}
                          </h2>
                        </div>
                        <div className="flex items-center gap-1.5 pb-1 text-[9px] font-sans uppercase tracking-[0.22em] text-[#F4EFE6]/90 border-b border-[#F4EFE6]/40 shrink-0">
                          <span>{t.heroCta}</span>
                          <span>↗</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* СЕКЦИЯ I: ФЛАГМАНСКИЙ ДОМ CARDIO + ЭКСПОЗИЦИЯ */}
              <div className="mb-12">
                <div
                  className="flex items-center justify-between pb-2.5 mb-0 border-b"
                  style={{ borderColor: palette.lineStrong }}
                >
                  <span
                    className="text-[9px] font-sans font-medium uppercase tracking-[0.28em]"
                    style={{ color: palette.text }}
                  >
                    {t.learning}
                  </span>
                  <span
                    className="text-[8.5px] font-mono tracking-[0.22em]"
                    style={{ color: palette.textMuted }}
                  >
                    01—04
                  </span>
                </div>

                <div
                  className="border-l border-r"
                  style={{ borderColor: palette.line }}
                >
                  {/* 01. ФЛАГМАНСКАЯ МОНОГРАФИЯ: CARDIO */}
                  <button
                    type="button"
                    onClick={onOpenMaterials}
                    disabled={!onOpenMaterials}
                    className={`group relative w-full p-4 sm:p-6 text-left outline-none border-b transition-all block overflow-hidden ${
                      onOpenMaterials
                        ? 'cursor-pointer active:opacity-75'
                        : 'opacity-40 cursor-default'
                    }`}
                    style={{
                      borderColor: palette.line,
                      background: palette.cardioSurface,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 w-full mb-3.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="text-[8.5px] font-mono tracking-[0.2em] tabular-nums shrink-0"
                          style={{ color: palette.textMuted }}
                        >
                          01
                        </span>
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: palette.accentBronze }}
                        />
                        <span
                          className="text-[8px] font-sans uppercase tracking-[0.22em] font-medium whitespace-nowrap"
                          style={{ color: palette.text }}
                        >
                          {t.cardioBadge}
                        </span>
                      </div>

                      <span
                        className="text-[7px] font-mono uppercase tracking-[0.16em] px-2 py-0.5 border whitespace-nowrap shrink-0"
                        style={{
                          borderColor: palette.lineStrong,
                          color: palette.textMuted,
                        }}
                      >
                        BESPOKE • B2B
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 my-1.5">
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-baseline gap-2.5 mb-1.5">
                          <h3
                            className="font-serif text-[33px] sm:text-[40px] leading-[0.92] tracking-[0.01em] uppercase font-normal transition-transform duration-300 group-hover:translate-x-0.5"
                            style={{ color: palette.text }}
                          >
                            Cardio
                          </h3>
                          <span
                            className="font-serif italic text-[13px]"
                            style={{ color: palette.accentBronze }}
                          >
                            Atelier
                          </span>
                        </div>

                        <p
                          className="text-[11.5px] font-sans font-light leading-[1.45] max-w-[230px]"
                          style={{ color: palette.textMuted }}
                        >
                          {t.cardioDesc}
                        </p>
                      </div>

                      <div className="relative shrink-0 w-[114px] h-[70px] sm:w-[136px] sm:h-[82px] flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                        <img
                          src={transparentLogoSrc}
                          alt="Cardio Men's Footwear Emblem"
                          className="w-full h-full object-contain"
                          style={{
                            filter: isDark
                              ? 'drop-shadow(0 6px 14px rgba(59, 130, 246, 0.22)) contrast(1.06)'
                              : 'drop-shadow(0 4px 10px rgba(22, 20, 18, 0.10)) contrast(1.05)',
                          }}
                        />
                      </div>
                    </div>

                    <div
                      className="mt-3.5 pt-2.5 border-t flex items-center justify-between gap-3"
                      style={{ borderColor: palette.line }}
                    >
                      <span
                        className="text-[8px] font-sans uppercase tracking-[0.16em] whitespace-nowrap"
                        style={{ color: palette.textMuted }}
                      >
                        {t.materialsSub}
                      </span>
                      <span
                        className="text-[8px] font-sans uppercase tracking-[0.18em] font-medium flex items-center gap-1 whitespace-nowrap shrink-0 border-b pb-0.5"
                        style={{
                          color: palette.text,
                          borderColor: palette.lineStrong,
                        }}
                      >
                        <span>{t.cardioCta}</span>
                        <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                          ↗
                        </span>
                      </span>
                    </div>
                  </button>

                  {/* 02 & 03. ДВУХКОЛОНОЧНЫЙ РЯД: ЦВЕТА И СИЛУЭТЫ */}
                  <div className="grid grid-cols-2">
                    {gridItems.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.action}
                        disabled={!item.action}
                        className={`group relative p-4 sm:p-5 min-h-[126px] flex flex-col justify-between text-left bg-transparent outline-none border-b transition-colors ${
                          idx === 0 ? 'border-r' : ''
                        } ${
                          item.action
                            ? 'cursor-pointer active:opacity-50'
                            : 'opacity-40 cursor-default'
                        }`}
                        style={{ borderColor: palette.line }}
                      >
                        <div className="flex items-center justify-between w-full mb-3">
                          <span
                            className="text-[8.5px] font-mono tracking-[0.22em] tabular-nums"
                            style={{ color: palette.textMuted }}
                          >
                            {item.roman}
                          </span>
                          <span
                            className="text-[7px] font-mono uppercase tracking-[0.22em]"
                            style={{ color: palette.textSubtle }}
                          >
                            {item.tag}
                          </span>
                        </div>

                        <div>
                          <div
                            className="font-serif text-[23px] sm:text-[26px] leading-[1.06] tracking-[-0.01em] mb-1.5 transition-transform group-hover:translate-x-0.5"
                            style={{ color: palette.text }}
                          >
                            {item.title}
                          </div>
                          <div
                            className="text-[8.5px] font-sans uppercase tracking-[0.14em] leading-[1.35]"
                            style={{ color: palette.textMuted }}
                          >
                            {item.subtitle}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* 04. ПОЛНОШИРИННАЯ СТРОКА КАТАЛОГА: FOOTWEAR INDEX */}
                  {catalogItem && (
                    <button
                      type="button"
                      onClick={catalogItem.action}
                      disabled={!catalogItem.action}
                      className={`group w-full p-4 sm:p-5 flex flex-col justify-between text-left bg-transparent outline-none border-b transition-colors overflow-hidden ${
                        catalogItem.action
                          ? 'cursor-pointer active:opacity-50'
                          : 'opacity-40 cursor-default'
                      }`}
                      style={{ borderColor: palette.line }}
                    >
                      <div className="flex items-center justify-between w-full mb-2.5">
                        <span
                          className="text-[8.5px] font-mono tracking-[0.22em] tabular-nums"
                          style={{ color: palette.textMuted }}
                        >
                          {catalogItem.roman}
                        </span>
                        <span
                          className="text-[7px] font-mono uppercase tracking-[0.24em]"
                          style={{ color: palette.textSubtle }}
                        >
                          {catalogItem.tag}
                        </span>
                      </div>

                      <div className="flex items-end justify-between gap-3 w-full">
                        <div className="min-w-0 flex-1">
                          <div
                            className="font-serif text-[23px] sm:text-[27px] leading-[1.06] tracking-[-0.01em] mb-1.5 transition-transform group-hover:translate-x-0.5"
                            style={{ color: palette.text }}
                          >
                            {catalogItem.title}
                          </div>
                          <div
                            className="text-[8.5px] font-sans uppercase tracking-[0.14em] leading-[1.35] break-words"
                            style={{ color: palette.textMuted }}
                          >
                            {catalogItem.subtitle}
                          </div>
                        </div>

                        <span
                          className="text-[11px] shrink-0 pb-0.5 transition-transform duration-300 group-hover:translate-x-0.5"
                          style={{ color: palette.textSubtle }}
                        >
                          ↗
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* СЕКЦИЯ II: Инструментарий */}
              <div className="mb-12">
                <div
                  className="flex items-center justify-between pb-2.5 border-b"
                  style={{ borderColor: palette.lineStrong }}
                >
                  <span
                    className="text-[9px] font-sans font-medium uppercase tracking-[0.28em]"
                    style={{ color: palette.text }}
                  >
                    {t.tools}
                  </span>
                  <span
                    className="text-[8.5px] font-mono tracking-[0.22em]"
                    style={{ color: palette.textMuted }}
                  >
                    05—08
                  </span>
                </div>

                <div className="flex flex-col">
                  {TOOLS.map((item) => (
                    <button
                      key={item.id}
                      onClick={item.action}
                      disabled={!item.action}
                      className={`group flex items-baseline justify-between gap-3 py-4 border-b outline-none bg-transparent text-left transition-opacity ${
                        item.action
                          ? 'cursor-pointer active:opacity-50'
                          : 'opacity-40 cursor-default'
                      }`}
                      style={{ borderColor: palette.line }}
                    >
                      <div className="flex items-baseline gap-3 min-w-0">
                        <span
                          className="text-[8.5px] font-mono tracking-[0.22em] tabular-nums shrink-0"
                          style={{ color: palette.textMuted }}
                        >
                          {item.roman}
                        </span>
                        <span
                          className="font-serif text-[22px] sm:text-[25px] leading-snug tracking-[-0.01em] transition-transform group-hover:translate-x-1"
                          style={{ color: palette.text }}
                        >
                          {item.title}
                        </span>
                        {item.dot && (
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0 self-center"
                            style={{ backgroundColor: palette.accentRed }}
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-[8px] font-sans uppercase tracking-[0.16em]"
                          style={{ color: palette.textMuted }}
                        >
                          {item.subtitle}
                        </span>
                        <span
                          className="text-[10px]"
                          style={{ color: palette.textSubtle }}
                        >
                          ↗
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* СЕКЦИЯ III: Система + Архив + Меценатство */}
              <div className="mb-14">
                <div
                  className="flex items-center justify-between pb-2.5 border-b"
                  style={{ borderColor: palette.lineStrong }}
                >
                  <span
                    className="text-[9px] font-sans font-medium uppercase tracking-[0.28em]"
                    style={{ color: palette.text }}
                  >
                    {t.system}
                  </span>
                  <span
                    className="text-[8.5px] font-mono tracking-[0.22em]"
                    style={{ color: palette.textMuted }}
                  >
                    09—12
                  </span>
                </div>

                {/* Настройки и Профиль в 2 колонки */}
                <div
                  className="grid grid-cols-2 border-l border-r border-b"
                  style={{ borderColor: palette.line }}
                >
                  {SYSTEM.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={item.action}
                      className={`group p-4 text-left bg-transparent outline-none cursor-pointer active:opacity-50 transition-opacity ${
                        idx === 0 ? 'border-r' : ''
                      }`}
                      style={{ borderColor: palette.line }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-[8px] font-mono tracking-[0.22em]"
                          style={{ color: palette.textMuted }}
                        >
                          {item.roman}
                        </span>
                        <span
                          className="text-[9px]"
                          style={{ color: palette.textSubtle }}
                        >
                          ↗
                        </span>
                      </div>
                      <div
                        className="font-serif text-[21px] leading-tight mb-1"
                        style={{ color: palette.text }}
                      >
                        {item.title}
                      </div>
                      <div
                        className="text-[8px] font-sans uppercase tracking-[0.16em]"
                        style={{ color: palette.textMuted }}
                      >
                        {item.subtitle}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Личный архив (Сохраненное) */}
                <button
                  onClick={() => {
                    if (articleFavorites.length === 1) onOpenArticle?.(articleFavorites[0].id)
                    else if (articleFavorites.length > 1) onOpenFavorites?.()
                  }}
                  className="w-full flex items-center justify-between py-4 px-4 border-l border-r border-b outline-none bg-transparent cursor-pointer active:opacity-50 transition-opacity"
                  style={{ borderColor: palette.line, backgroundColor: palette.surface }}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span
                        className="text-[8px] font-mono tracking-[0.22em]"
                        style={{ color: palette.textMuted }}
                      >
                        11
                      </span>
                      <span
                        className="font-serif text-[21px] leading-none"
                        style={{ color: palette.text }}
                      >
                        {t.favorites}
                      </span>
                    </div>
                    <div
                      className="text-[8px] font-sans uppercase tracking-[0.2em] pl-5"
                      style={{ color: palette.textMuted }}
                    >
                      {t.favoritesSub}
                    </div>
                  </div>

                  {articleFavorites.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      {articleFavorites.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="w-8 h-10 border overflow-hidden grayscale contrast-125"
                          style={{ borderColor: palette.lineStrong }}
                        >
                          <img src={item.imagePng} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span
                      className="text-[9px] font-serif italic"
                      style={{ color: palette.textSubtle }}
                    >
                      —
                    </span>
                  )}
                </button>

                {/* Меценатство / Поддержать проект */}
                <button
                  onClick={handleSupportClick}
                  className="group w-full flex items-center justify-between py-4 px-4 border-l border-r border-b outline-none bg-transparent cursor-pointer active:opacity-50 transition-opacity"
                  style={{ borderColor: palette.line }}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span
                        className="text-[8px] font-mono tracking-[0.22em]"
                        style={{ color: palette.textMuted }}
                      >
                        12
                      </span>
                      <span
                        className="font-serif text-[21px] leading-none"
                        style={{ color: palette.text }}
                      >
                        {t.supportTitle}
                      </span>
                    </div>
                    <div
                      className="text-[8px] font-sans uppercase tracking-[0.2em] pl-5"
                      style={{ color: palette.textMuted }}
                    >
                      {t.supportDesc}
                    </div>
                  </div>

                  <span
                    className="text-[8.5px] font-mono uppercase tracking-[0.22em] border px-2.5 py-1 transition-colors"
                    style={{ borderColor: palette.lineStrong, color: palette.text }}
                  >
                    TRIBUTE ↗
                  </span>
                </button>
              </div>

              {/* Редакционный колофон (Footer) */}
              <div className="pt-2 pb-6">
                <div className="flex flex-col items-center text-center px-4">
                  <div
                    className="w-px h-8 mb-5"
                    style={{ backgroundColor: palette.lineStrong }}
                  />
                  <p
                    className="font-serif text-[16px] italic leading-[1.5] max-w-[280px]"
                    style={{ color: palette.textMuted }}
                  >
                    {t.quote}
                  </p>
                  <p
                    className="mt-4 text-[8px] font-mono uppercase tracking-[0.42em]"
                    style={{ color: palette.textSubtle }}
                  >
                    CORDWAINER × CARDIO • MMXXVI
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
