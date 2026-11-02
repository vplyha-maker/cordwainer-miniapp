import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'

type StylesPageProps = {
  onBack: () => void
  lang: Lang
}

type StyleSlide = {
  id: string
  video?: string
  poster?: string
  image?: string
  title: { ru: string; uk: string; de: string }
  subtitle: { ru: string; uk: string; de: string }
  desc: { ru: string; uk: string; de: string }
  hideWatermark?: boolean
}

const getDeviceId = () => {
  if (typeof window === 'undefined') return 'unknown'
  const tg = (window as any).Telegram?.WebApp
  const tgUserId = tg?.initDataUnsafe?.user?.id?.toString()
  if (tgUserId) return tgUserId
  let deviceId = localStorage.getItem('cordwainer_device_id')
  if (!deviceId) {
    deviceId = 'web_' + Math.random().toString(36).substring(2, 15)
    localStorage.setItem('cordwainer_device_id', deviceId)
  }
  return deviceId
}

const showTelegramAlert = (message: string) => {
  const tg = (window as any).Telegram?.WebApp
  if (tg?.showAlert) {
    tg.showAlert(message)
  } else {
    alert(message)
  }
}

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0110 0v4"></path>
  </svg>
)

const UI_TEXT = {
  ru: {
    back: 'Назад',
    mute: 'ЗВУК',
    sound: 'ВКЛ',
    like: 'ЛАЙК',
    share: 'ШЕЙР',
    copied: 'Ссылка скопирована',
    up: 'Наверх',
    down: 'Вернуться',
    moreStyles: '+ ещё 8 фасонов',
    errTgOnly: 'Откройте приложение внутри Telegram для оформления доступа.',
    errPayment: 'Оплата была отменена или не завершена.',
    errServer: 'Ошибка соединения',
    paywall: {
      tag: 'ЗАКРЫТАЯ КОЛЛЕКЦИЯ • 12 ФАСОНОВ',
      title: 'Полный\nЛукбук',
      desc: 'Вы посмотрели 3 из 15 фасонов. Разблокируйте полный доступ ко всей видео-энциклопедии обуви навсегда.',
      btn: 'ОТКРЫТЬ ВСЕ 15 ФАСОНОВ • 1 ⭐️',
      loading: 'ПОДГОТОВКА СЧЕТА...',
    },
  },
  uk: {
    back: 'Назад',
    mute: 'ЗВУК',
    sound: 'УВІМК',
    like: 'ЛАЙК',
    share: 'ШЕЙР',
    copied: 'Посилання скопійовано',
    up: 'Вгору',
    down: 'Повернутися',
    moreStyles: '+ ще 8 фасонів',
    errTgOnly: 'Відкрийте додаток у Telegram для оформлення доступу.',
    errPayment: 'Оплату було скасовано або не завершено.',
    errServer: 'Помилка з’єднання',
    paywall: {
      tag: 'ЗАКРИТА КОЛЕКЦІЯ • 12 ФАСОНІВ',
      title: 'Повний\nЛукбук',
      desc: 'Ви переглянули 3 з 15 фасонів. Розблокуйте повний доступ до всієї відео-енциклопедії взуття назавжди.',
      btn: 'ВІДКРИТИ ВСІ 15 ФАСОНІВ • 1 ⭐️',
      loading: 'ПІДГОТОВКА РАХУНКУ...',
    },
  },
  de: {
    back: 'Zurück',
    mute: 'TON',
    sound: 'AN',
    like: 'LIKE',
    share: 'TEILEN',
    copied: 'Link kopiert',
    up: 'Nach oben',
    down: 'Zurück',
    moreStyles: '+ 8 weitere Stile',
    errTgOnly: 'Bitte öffnen Sie die App in Telegram.',
    errPayment: 'Zahlung wurde abgebrochen.',
    errServer: 'Verbindungsfehler',
    paywall: {
      tag: 'EXKLUSIVE KOLLEKTION • 12 STILE',
      title: 'Volles\nLookbook',
      desc: 'Sie haben 3 von 15 Stilen gesehen. Schalten Sie den dauerhaften Zugang zur gesamten Video-Enzyklopädie frei.',
      btn: 'ALLE 15 STILE FREISCHALTEN • 1 ⭐️',
      loading: 'WIRD GELADEN...',
    },
  },
}

const STYLES_DATA: StyleSlide[] = [
  {
    id: 'botford',
    video: '/Fason/Botford.mp4',
    poster: '/Fason/posters/Botford.jpg',
    title: { ru: 'Ботфорты', uk: 'Ботфорти', de: 'Overknee' },
    subtitle: { ru: 'Высокий стиль', uk: 'Високий стиль', de: 'Hoher Stil' },
    desc: {
      ru: 'Смелость и элегантность в каждом шаге. Визуально удлиняют силуэт и становятся главным, безупречным акцентом любого образа.',
      uk: 'Сміливість та елегантність у кожному кроці. Візуально подовжують силует і стають головним, бездоганним акцентом будь-якого образу.',
      de: 'Mut und Eleganz bei jedem Schritt. Verlängern optisch die Silhouette und werden zum perfekten Hauptakzent jedes Looks.',
    },
  },
  {
    id: 'chelsea',
    video: '/Fason/chelsi.mp4',
    title: { ru: 'Челси', uk: 'Челсі', de: 'Chelsea' },
    subtitle: { ru: 'Вечная классика', uk: 'Вічна класика', de: 'Ewiger Klassiker' },
    desc: {
      ru: 'Лаконичный дизайн и максимальный комфорт. Идеальный баланс между строгой классикой и расслабленным повседневным стилем.',
      uk: 'Лаконічний дизайн та максимальний комфорт. Ідеальний баланс між суворою класикою та розслабленим повсякденним стилем.',
      de: 'Puristisches Design und maximaler Komfort. Die perfekte Balance zwischen strenger Klassik und entspanntem Alltagsstil.',
    },
  },
  {
    id: 'martins',
    video: '/Fason/martins.mp4',
    title: { ru: 'Мартинсы\n/ Берцы', uk: 'Мартінси\n/ Берці', de: 'Combat\nBoots' },
    subtitle: { ru: 'Бунтарский дух', uk: 'Бунтарський дух', de: 'Rebellischer Geist' },
    desc: {
      ru: 'Грубая эстетика, покорившая мировые подиумы. Массивная подошва и высокая шнуровка создают дерзкий, но притягательный контраст.',
      uk: 'Груба естетика, що підкорила світові подіуми. Масивна підошва та висока шнурівка створюють зухвалий, але притягальний контраст.',
      de: 'Raue Ästhetik, die die Laufstege der Welt eroberte. Massive Sohle und hohe Schnürung schaffen einen provokanten, aber anziehenden Kontrast.',
    },
  },
  {
    id: 'lofer',
    video: '/Fason/lofer.mp4',
    title: { ru: 'Лоферы', uk: 'Лофери', de: 'Loafer' },
    subtitle: { ru: 'Тихая роскошь', uk: 'Тиха розкіш', de: 'Stiller Luxus' },
    desc: {
      ru: 'Воплощение элегантности и абсолютного комфорта. Идеальная база, которая делает любой образ статусным и расслабленным одновременно.',
      uk: 'Втілення елегантності та абсолютного комфорту. Ідеальна база, яка робить будь-який образ статусним і розслабленим водночас.',
      de: 'Die Verkörperung von Eleganz und absolutem Komfort. Die ideale Basis, die jeden Look zugleich statusbewusst und entspannt wirken lässt.',
    },
  },
  {
    id: 'sock_boots',
    video: '/Fason/Sock_boots.mp4',
    title: { ru: 'Туфли\n/ Чулки', uk: 'Туфлі\n/ Панчохи', de: 'Sock\nBoots' },
    subtitle: { ru: 'Гибридная эстетика', uk: 'Гібридна естетика', de: 'Hybride Ästhetik' },
    desc: {
      ru: 'Смелый гибрид классической лодочки и эластичного трикотажа. Безупречно облегает щиколотку, добавляя образу утонченной дерзости и абсолютного комфорта.',
      uk: 'Сміливий гібрид класичного човника та еластичного трикотажу. Бездоганно облягає кісточку, додаючи образу вишуканої зухвалості та абсолютного комфорту.',
      de: 'Ein mutiger Hybrid aus klassischem Pump und elastischem Strick. Umschließt den Knöchel makellos und verleiht dem Look raffinierte Kühnheit und absoluten Komfort.',
    },
  },
  {
    id: 'cozaki',
    video: '/Fason/cozaki.mp4',
    title: { ru: 'Казаки', uk: 'Козаки', de: 'Western\nBoots' },
    subtitle: { ru: 'Свобода формы', uk: 'Свобода форми', de: 'Freiheit der Form' },
    desc: {
      ru: 'Знаковый скошенный каблук и характерный мыс. Идеальный баланс между эстетикой дикого запада и ритмом современного мегаполиса.',
      uk: 'Знаковий скошений каблук та характерний мис. Ідеальний баланс між естетикою дикого заходу та ритмом сучасного мегаполіса.',
      de: 'Ikonischer abgeschrägter Absatz und charakteristische Spitze. Die perfekte Balance zwischen der Ästhetik des Wilden Westens und dem Rhythmus der modernen Metropole.',
    },
  },
  {
    id: 'boti',
    video: '/Fason/boti.mp4',
    title: { ru: 'Ботильоны', uk: 'Ботильйони', de: 'Stiefeletten' },
    subtitle: { ru: 'Идеальные пропорции', uk: 'Ідеальні пропорції', de: 'Perfekte Proportionen' },
    desc: {
      ru: 'Безукоризненная архитектура обуви, мягко обнимающая щиколотку. Универсальный силуэт для создания выверенных, элегантных образов.',
      uk: "Бездоганна архітектура взуття, що м'яко обіймає кісточку. Універсальний силует для створення вивірених, елегантних образів.",
      de: 'Makellose Schuharchitektur, die den Knöchel sanft umschließt. Eine universelle Silhouette zur Kreation ausgewogener, eleganter Looks.',
    },
  },
  {
    id: 'mary_jane',
    video: '/Fason/Mary_Jane.mp4',
    title: { ru: 'Мэри Джейн', uk: 'Мері Джейн', de: 'Mary Jane' },
    subtitle: { ru: 'Новая романтика', uk: 'Нова романтика', de: 'Neue Romantik' },
    desc: {
      ru: 'Символ утонченной женственности. Узнаваемый ремешок на подъеме и трогательный ретро-силуэт задают кокетливый, но неизменно элегантный тон.',
      uk: 'Символ витонченої жіночності. Впізнаваний ремінець на підйомі та зворушливий ретро-силует задають кокетливий, але незмінно елегантний тон.',
      de: 'Ein Symbol raffinierter Weiblichkeit. Der markante Riemen über dem Spann und die berührende Retro-Silhouette geben einen koketten, aber stets eleganten Ton an.',
    },
    hideWatermark: true,
  },
  {
    id: 'topsaed',
    video: '/Fason/Topsaed.mp4',
    title: { ru: 'Топсайдеры', uk: 'Топсайдери', de: 'Bootsschuhe' },
    subtitle: { ru: 'Эстетика ривьеры', uk: "Естетика рів'єри", de: 'Riviera-Ästhetik' },
    desc: {
      ru: 'Элитарная расслабленность и дух закрытых яхт-клубов. Нескользящая подошва и круговая шнуровка — безупречная база для теплого сезона.',
      uk: 'Елітарна розслабленість та дух закритих яхт-клубів. Нековзна підошва та кругова шнурівка — бездоганна база для теплого сезону.',
      de: 'Elitäre Lässigkeit und der Geist exklusiver Yachtclubs. Rutschfeste Sohle und Rundumschnürung — die makellose Basis für die warme Jahreszeit.',
    },
    hideWatermark: true,
  },
  {
    id: 'slingback',
    video: '/Fason/slingback1.mp4',
    title: { ru: 'Слингбэки', uk: 'Слінгбеки', de: 'Slingbacks' },
    subtitle: { ru: 'Изящная строгость', uk: 'Витончена строгість', de: 'Zarte Strenge' },
    desc: {
      ru: 'Чувственный компромисс между классической лодочкой и босоножкой. Открытая пятка визуально облегчает силуэт, делая каждый шаг невесомым.',
      uk: "Чуттєвий компроміс між класичним човником та босоніжкою. Відкрита п'ята візуально полегшує силуэт, роблячи кожен крок невагомим.",
      de: 'Ein sinnlicher Kompromiss zwischen klassischem Pump und Sandale. Die offene Ferse erleichtert die Silhouette optisch und macht jeden Schritt schwerelos.',
    },
    hideWatermark: true,
  },
  {
    id: 'espadrilles',
    video: '/Fason/Espadrilles.mp4',
    title: { ru: 'Эспадрильи', uk: 'Еспадрильї', de: 'Espadrilles' },
    subtitle: { ru: 'Средиземноморский шик', uk: 'Середземноморський шик', de: 'Mediterraner Chic' },
    desc: {
      ru: 'Культовая летняя база, сплетенная из натурального джута. Воплощение расслабленного шика и абсолютной свободы, идеально дополняющее легкие льняные образы.',
      uk: 'Культова літня база, сплетена з натурального джуту. Втілення розслабленого шику та абсолютної свободи, що ідеально доповнює легкі лляні образи.',
      de: 'Die kultige Sommerbasis, geflochten aus natürlicher Jute. Die Verkörperung entspannten Chics und absoluter Freiheit, ideal passend zu leichten Leinen-Looks.',
    },
    hideWatermark: true,
  },
  {
    id: 'muli',
    video: '/Fason/muli.mp4',
    title: { ru: 'Мюли', uk: 'Мюлі', de: 'Mules' },
    subtitle: { ru: 'Непринужденная эстетика', uk: 'Невимушена естетика', de: 'Mühelose Ästhetik' },
    desc: {
      ru: 'Открытая пятка и изящный силуэт, создающие эффект абсолютной легкости. Идеальный выбор для тех, кто ценит утонченный шик и комфорт в каждом движении.',
      uk: "Відкрита п'ята та витончений силует, що створюють ефект абсолютної легкості. Ідеальний вибір для тих, хто цінує вишуканий шик та комфорт у кожному русі.",
      de: 'Offene Ferse und eine anmutige Silhouette, die ein Gefühl von absoluter Leichtigkeit vermitteln. Die ideale Wahl für alle, die raffinierten Chic und Komfort in jeder Bewegung schätzen.',
    },
    hideWatermark: true,
  },
  {
    id: 'huaraches',
    video: '/Fason/Huaraches.mp4',
    title: { ru: 'Гуарачи', uk: 'Гуарачі', de: 'Huaraches' },
    subtitle: { ru: 'Мексиканское наследие', uk: 'Мексиканська спадщина', de: 'Mexikanisches Erbe' },
    desc: {
      ru: 'Аутентичный колорит и изящное ручное плетение кожаных ремешков. Идеальный комфорт для жарких дней, воплощающий дух свободы и многовековые традиции ремесленников.',
      uk: 'Автентичний колорит та витончене ручне плетіння шкіряних ремінців. Ідеальний комфорт для спекотних днів, що втілює дух свободи та багатовікові традиції ремісників.',
      de: 'Authentisches Flair und feines Handgeflecht aus Lederriemen. Idealer Komfort für heiße Tage, der den Geist der Freiheit und jahrhundertealte Handwerkstraditionen verkörpert.',
    },
  },
  {
    id: 'riding',
    video: '/Fason/Riding.mp4',
    title: { ru: 'Жокейские сапоги', uk: 'Жокейські чоботи', de: 'Reiterstiefel' },
    subtitle: { ru: 'Аристократичная стать', uk: 'Аристократична стать', de: 'Aristokratische Haltung' },
    desc: {
      ru: 'Строгие линии и элегантный прямой крой, вдохновленный конным спортом. Безупречно держат форму голенища, придавая любому образу благородство и утонченную строгость.',
      uk: 'Строгі лінії та елегантний прямий крій, натхненний кінним спортом. Бездоганно тримають форму халяви, надаючи будь-якому образу шляхетності та витонченої суворості.',
      de: 'Strenge Linien und ein eleganter, gerader Schnitt, inspiriert vom Reitsport. Sie behalten perfekt ihre Schaftform und verleihen jedem Look eine edle und raffinierte Strenge.',
    },
  },
  {
    id: 'gladiator',
    video: '/Fason/Gladiator.mp4',
    title: { ru: 'Гладиаторы', uk: 'Гладіатори', de: 'Gladiatoren' },
    subtitle: { ru: 'Античная эстетика', uk: 'Антична естетика', de: 'Antike Ästhetik' },
    desc: {
      ru: 'Эффектное сплетение множества ремешков, изящно обхватывающих ногу. Смелый отсыл к историческому наследию, который делает даже самый простой летний наряд невероятно выразительным.',
      uk: 'Ефектне сплетіння безлічі ремінців, що витончено охоплюють ногу. Сміливе відсилання до історичної спадщини, яке робить навіть найпростіше літнє вбрання неймовірно виразним.',
      de: 'Ein spektakuläres Geflecht aus vielen Riemen, die das Bein elegant umschließen. Eine mutige Hommage an das historische Erbe, die selbst das einfachste Sommeroutfit unglaublich ausdrucksstark macht.',
    },
  },
]

type SlideItemProps = {
  slide: StyleSlide
  lang: 'ru' | 'uk' | 'de'
  index: number
  totalCount: number
  isActive: boolean
  isPreloaded: boolean
  isMuted: boolean
  onToggleMute: () => void
  onShowToast: (msg: string) => void
}

const smoothEase: [number, number, number, number] = [0.25, 1, 0.5, 1]

function SlideItem({
  slide,
  lang,
  index,
  totalCount,
  isActive,
  isPreloaded,
  isMuted,
  onToggleMute,
  onShowToast,
}: SlideItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasFetchedLikesRef = useRef(false)
  const tapTimeoutRef = useRef<number | null>(null)

  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [heartBurst, setHeartBurst] = useState<{ id: number; x: number; y: number } | null>(null)

  const userId = getDeviceId()
  const tg = (window as any).Telegram?.WebApp
  const t = UI_TEXT[lang]

  // Загрузка лайков с кэшированием (без повторных запросов при скролле туда-сюда)
  useEffect(() => {
    if (!isPreloaded || hasFetchedLikesRef.current) return
    let mounted = true

    const fetchLikes = async () => {
      try {
        const res = await fetch(`/api/like?style_id=${slide.id}&user_id=${userId}`)
        if (res.ok && mounted) {
          const data = await res.json()
          setLikesCount(data.total || 0)
          setIsLiked(!!data.isLiked)
          hasFetchedLikesRef.current = true
        }
      } catch {}
    }
    fetchLikes()
    return () => {
      mounted = false
    }
  }, [slide.id, userId, isPreloaded])

  // Управление буфером видео
  useEffect(() => {
    const video = videoRef.current
    if (!video || !slide.video) return

    if (isPreloaded) {
      if (video.getAttribute('src') !== slide.video) {
        setIsVideoLoaded(false)
        video.setAttribute('src', slide.video)
        video.load()
      }
    } else {
      if (video.getAttribute('src')) {
        video.pause()
        video.removeAttribute('src')
        video.load()
        setIsVideoLoaded(false)
      }
    }
  }, [isPreloaded, slide.video])

  // Воспроизведение и сброс в фоне без черной вспышки
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isActive) {
      setIsPaused(false)
      const p = video.play()
      if (p) p.catch(() => {})
    } else {
      video.pause()
      video.currentTime = 0
      setIsPaused(false)
    }
  }, [isActive])

  const triggerLikeRequest = useCallback(
    async (forceLike = false) => {
      if (forceLike && isLiked) return

      const next = forceLike ? true : !isLiked
      setIsLiked(next)
      setLikesCount((c) => (next ? c + 1 : Math.max(0, c - 1)))

      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred(next ? 'medium' : 'light')
      }

      try {
        await fetch(`/api/like?style_id=${slide.id}&user_id=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: next ? 'like' : 'unlike' }),
        })
      } catch {
        setIsLiked(!next)
        setLikesCount((c) => (next ? Math.max(0, c - 1) : c + 1))
      }
    },
    [isLiked, slide.id, tg, userId]
  )

  // Распознавание одиночного тапа (Play/Pause) и двойного тапа (Лайк с сердцем)
  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (tapTimeoutRef.current !== null) {
      window.clearTimeout(tapTimeoutRef.current)
      tapTimeoutRef.current = null

      // Двойной тап — ставим лайк и показываем сердце в точке касания
      setHeartBurst({ id: Date.now(), x, y })
      triggerLikeRequest(true)
      setTimeout(() => setHeartBurst(null), 850)
    } else {
      tapTimeoutRef.current = window.setTimeout(() => {
        tapTimeoutRef.current = null
        const video = videoRef.current
        if (!video) return

        if (video.paused) {
          video.play().catch(() => {})
          setIsPaused(false)
        } else {
          video.pause()
          setIsPaused(true)
        }
        if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged()
      }, 220)
    }
  }

  const handleShare = async () => {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light')

    const title = slide.title[lang].replace('\n', ' ')
    const text =
      lang === 'de'
        ? `Sieh dir diesen Stil an: ${title} in der Cordwainer Enzyklopädie!`
        : lang === 'ru'
          ? `Смотри, какой фасон: ${title} в энциклопедии Cordwainer!`
          : `Дивись, який фасон: ${title} в енциклопедії Cordwainer!`

    const url = 'https://www.cordwaine.app'

    try {
      if (tg?.initData) {
        tg.openTelegramLink(
          `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
        )
        return
      }
      if (navigator.share) {
        await navigator.share({ title: 'Cordwainer', text, url })
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        onShowToast(t.copied)
      }
    } catch {}
  }

  return (
    <div className="relative h-full w-full flex-shrink-0 snap-start snap-always overflow-hidden bg-[#050505]">
      {/* Видео / Изображение */}
      <div className="absolute inset-0 bg-[#050505]">
        {slide.video ? (
          <video
            ref={videoRef}
            preload="none"
            loop
            playsInline
            muted={isMuted}
            poster={slide.poster}
            onLoadedData={() => setIsVideoLoaded(true)}
            onPlaying={() => setIsVideoLoaded(true)}
            className={`
              w-full h-full object-cover
              transition-opacity duration-500 ease-out
              ${isActive && (isVideoLoaded || slide.poster) ? 'opacity-100' : 'opacity-0'}
              ${slide.hideWatermark ? 'scale-[1.08]' : ''}
            `}
          />
        ) : slide.image ? (
          <img
            src={slide.image}
            alt={slide.title[lang]}
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      {/* Зона жестов по видео (Single tap = Pause/Play, Double tap = Like) */}
      <div
        onClick={handleVideoTap}
        className="absolute inset-0 z-10 cursor-pointer select-none"
      />

      {/* Анимация сердца при двойном тапе */}
      <AnimatePresence>
        {heartBurst && (
          <motion.div
            key={heartBurst.id}
            initial={{ scale: 0.2, opacity: 0, rotate: -12 }}
            animate={{ scale: [0.2, 1.25, 1], opacity: [0, 1, 0], y: -40 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            style={{ left: heartBurst.x - 40, top: heartBurst.y - 40 }}
            className="absolute z-30 pointer-events-none text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
          >
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Центральный индикатор паузы */}
      <AnimatePresence>
        {isPaused && isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          >
            <div className="w-16 h-16 rounded-full bg-black/45 backdrop-blur-md border border-white/25 flex items-center justify-center text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Верхний и нижний градиенты для идеальной читаемости текста */}
      <div className="absolute top-0 left-0 right-0 h-[38%] bg-gradient-to-b from-black/85 via-black/35 to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-black/95 via-black/55 to-transparent z-10 pointer-events-none" />

      {/* Верхний блок: Заголовок и счетчик 01 / 15 */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 15 }}
        transition={{ duration: 0.8, ease: smoothEase, delay: 0.1 }}
        className="absolute top-[96px] left-6 right-6 z-20 flex items-start justify-between pointer-events-none"
      >
        <div>
          <p className="text-[9px] font-sans uppercase tracking-[0.4em] text-white/70 mb-2">
            {slide.subtitle[lang]}
          </p>
          <h2 className="font-serif text-3xl min-[390px]:text-4xl leading-[1.08] tracking-tight text-[#F4F0E8] whitespace-pre-line drop-shadow-lg">
            {slide.title[lang]}
          </h2>
        </div>
        <div className="text-[10px] font-sans tracking-[0.25em] text-white/60 mt-1 tabular-nums">
          <span>{String(index + 1).padStart(2, '0')}</span>
          <span className="text-white/30 mx-1">/</span>
          <span className="text-white/35">{String(totalCount).padStart(2, '0')}</span>
        </div>
      </motion.div>

      {/* Нижний блок: Вертикальная Reels-панель справа + описание на всю ширину */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 15 }}
        transition={{ duration: 0.8, ease: smoothEase, delay: 0.2 }}
        className="absolute bottom-7 left-6 right-6 z-20 flex flex-col pointer-events-none"
      >
        {/* Вертикальный стек кнопок справа над линией */}
        <div className="self-end flex flex-col items-center gap-4 mb-5 pointer-events-auto">
          {/* Кнопка звука */}
          <button onClick={onToggleMute} className="flex flex-col items-center gap-1 group">
            <div className="w-10 h-10 rounded-full border border-white/35 bg-black/40 backdrop-blur-md flex items-center justify-center text-white transition-all duration-200 active:scale-90">
              {isMuted ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              )}
            </div>
            <span className="text-[8px] tracking-[0.2em] uppercase text-white/75">
              {isMuted ? t.mute : t.sound}
            </span>
          </button>

          {/* Кнопка Лайка */}
          <button onClick={() => triggerLikeRequest(false)} className="flex flex-col items-center gap-1">
            <div
              className={`
                w-10 h-10 rounded-full border flex items-center justify-center
                transition-all duration-200 active:scale-90
                ${
                  isLiked
                    ? 'border-white bg-white text-black shadow-[0_0_16px_rgba(255,255,255,0.4)]'
                    : 'border-white/35 text-white bg-black/40 backdrop-blur-md'
                }
              `}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <span className="text-[8px] tracking-[0.2em] uppercase text-white/75 tabular-nums">
              {likesCount > 0 ? likesCount : t.like}
            </span>
          </button>

          {/* Кнопка Поделиться */}
          <button onClick={handleShare} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full border border-white/35 bg-black/40 backdrop-blur-md flex items-center justify-center text-white transition-all duration-200 active:scale-90">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
            <span className="text-[8px] tracking-[0.2em] uppercase text-white/75">{t.share}</span>
          </button>
        </div>

        {/* Разделительная линия и текст на всю ширину экрана */}
        <div className="w-full h-px bg-white/25 mb-4" />

        <p className="text-[11px] min-[390px]:text-[12px] font-sans font-light leading-[1.65] text-white/90 max-w-[94%]">
          {slide.desc[lang]}
        </p>
      </motion.div>
    </div>
  )
}

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
}

export function StylesPage({ onBack, lang = 'ru' }: StylesPageProps) {
  const currentLang: 'ru' | 'uk' | 'de' =
    lang === 'uk' || lang === 'ru' || lang === 'de' ? lang : 'ru'
  const t = UI_TEXT[currentLang]

  const [isMuted, setIsMuted] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])

  const [isProPurchased, setIsProPurchased] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)

  const [buttonMode, setButtonMode] = useState<'hidden' | 'up' | 'down'>('hidden')
  const returnYRef = useRef<number | null>(null)
  const isJumpingRef = useRef(false)

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2400)
  }, [])

  // Проверка покупки при старте
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id
    if (!userId) return

    fetch(`/api/check-purchase?userId=${userId}&productId=pro_videos`)
      .then((res) => res.json())
      .then((data) => {
        if (data.purchased) setIsProPurchased(true)
      })
      .catch((err) => console.error('Ошибка проверки:', err))
  }, [])

  const visibleStyles = isProPurchased ? STYLES_DATA : STYLES_DATA.slice(0, 3)
  const showPaywallSlide = !isProPurchased
  const lockedPreviewTitles = STYLES_DATA.slice(3, 7).map((s) =>
    s.title[currentLang].replace('\n', ' ')
  )

  // Отслеживание позиции скролла для кнопки "Наверх / Вернуться"
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handlePassiveScroll = () => {
      const currentY = container.scrollTop

      if (currentY > 800) {
        setButtonMode((prev) => (prev !== 'up' ? 'up' : prev))
      } else if (currentY < 100 && returnYRef.current !== null) {
        setButtonMode((prev) => (prev !== 'down' ? 'down' : prev))
      } else {
        setButtonMode((prev) => (prev !== 'hidden' ? 'hidden' : prev))
      }
    }

    container.addEventListener('scroll', handlePassiveScroll, { passive: true })
    return () => container.removeEventListener('scroll', handlePassiveScroll)
  }, [])

  const handleSmartScroll = () => {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light')

    const container = scrollRef.current
    if (!container) return

    if (buttonMode === 'up') {
      returnYRef.current = container.scrollTop
      isJumpingRef.current = true
      setActiveIndex(0)

      container.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => {
        isJumpingRef.current = false
      }, 1000)
    } else if (buttonMode === 'down' && returnYRef.current !== null) {
      isJumpingRef.current = true
      const targetIndex = Math.round(returnYRef.current / Math.max(1, container.clientHeight))
      setActiveIndex(targetIndex)

      container.scrollTo({ top: returnYRef.current, behavior: 'smooth' })
      setTimeout(() => {
        isJumpingRef.current = false
        returnYRef.current = null
      }, 1000)
    }
  }

  // IntersectionObserver для определения активного слайда
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isJumpingRef.current) return

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = Number(entry.target.getAttribute('data-index'))
            if (!Number.isNaN(idx)) {
              setActiveIndex(idx)
            }
          }
        }
      },
      { root, threshold: [0.6] }
    )

    const currentRefs = slideRefs.current.filter(Boolean)
    currentRefs.forEach((el) => observer.observe(el!))

    return () => observer.disconnect()
  }, [isProPurchased])

  // Инициализация Telegram WebApp и системной кнопки Назад
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (!tg) return

    tg.ready()
    tg.expand?.()
    tg.disableVerticalSwipes?.()

    if (tg.BackButton) {
      tg.BackButton.show()
      tg.BackButton.onClick(onBack)
      return () => {
        tg.BackButton.offClick(onBack)
        tg.BackButton.hide()
      }
    }
  }, [onBack])

  const handleProClick = async () => {
    const tg = (window as any).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id

    if (!userId) {
      showTelegramAlert(t.errTgOnly)
      return
    }

    setIsPurchasing(true)
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light')

    try {
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId: 'pro_videos' }),
      })

      const data = await response.json()
      if (!response.ok || !data.invoiceLink) throw new Error(data.error)

      tg.openInvoice(data.invoiceLink, (status: string) => {
        if (status === 'paid') {
          if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success')
          setIsProPurchased(true)
          setActiveIndex(3)
        } else if (status === 'failed') {
          showTelegramAlert(t.errPayment)
        }
      })
    } catch (error: any) {
      console.error(error)
      showTelegramAlert(`${t.errServer}: ${error.message}`)
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleToggleMute = () => {
    if ((window as any).Telegram?.WebApp?.HapticFeedback) {
      ;(window as any).Telegram.WebApp.HapticFeedback.impactOccurred('light')
    }
    setIsMuted((v) => !v)
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-50 bg-[#050505] text-[#F4F0E8] overflow-hidden"
    >
      <style>{`
        .snap-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
          touch-action: pan-y;
        }
        .snap-container::-webkit-scrollbar { display: none; }
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none;
        }
        @keyframes subtleGlow {
          0%, 100% { border-color: rgba(255, 255, 255, 0.25); box-shadow: 0 0 0 rgba(255, 255, 255, 0); }
          50% { border-color: rgba(255, 255, 255, 0.65); box-shadow: 0 0 24px rgba(255, 255, 255, 0.14); }
        }
        .paywall-btn {
          animation: subtleGlow 3.5s infinite ease-in-out;
        }
      `}</style>

      {/* Верхняя панель: Кнопка Назад слева + Умный скролл справа (без наложений на Reels-док) */}
      <header className="absolute top-0 left-0 right-0 z-[100] px-6 pt-[max(2.25rem,env(safe-area-inset-top))] pb-3 flex justify-between items-center pointer-events-none">
        <button
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-2 py-2 px-3.5 -ml-2 rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-[10px] font-sans uppercase tracking-[0.2em] text-white/90 active:scale-95 transition-transform"
        >
          <span>←</span>
          <span>{t.back}</span>
        </button>

        {/* Кнопка Наверх / Вернуться в шапке */}
        <button
          onClick={handleSmartScroll}
          className={`pointer-events-auto flex items-center gap-1.5 py-2 px-3.5 rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-[9px] font-sans uppercase tracking-[0.2em] text-[#F4F0E8] transition-all duration-500 active:scale-95 ${
            buttonMode !== 'hidden'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-3 pointer-events-none'
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="square"
            className={`transition-transform duration-500 ${
              buttonMode === 'down' ? 'rotate-180' : 'rotate-0'
            }`}
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
          <span>{buttonMode === 'up' ? t.up : t.down}</span>
        </button>
      </header>

      {/* Всплывающий тост при копировании ссылки */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[120] px-4 py-2 rounded-full bg-white text-black text-[10px] font-sans uppercase tracking-[0.2em] shadow-xl pointer-events-none"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Основная вертикальная лента */}
      <div
        ref={scrollRef}
        className="snap-container h-full w-full overflow-y-scroll snap-y snap-mandatory"
      >
        {visibleStyles.map((slide, index) => {
          const isPreloaded = Math.abs(activeIndex - index) <= 1
          const isActive = activeIndex === index

          return (
            <div
              key={slide.id}
              ref={(el) => {
                slideRefs.current[index] = el
              }}
              data-index={index}
              className="h-full w-full snap-start snap-always"
            >
              <SlideItem
                slide={slide}
                lang={currentLang}
                index={index}
                totalCount={STYLES_DATA.length}
                isActive={isActive}
                isPreloaded={isPreloaded}
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
                onShowToast={showToast}
              />
            </div>
          )
        })}

        {/* High-Fashion Paywall Slide с живым размытым видео-тизером */}
        {showPaywallSlide && (
          <div
            ref={(el) => {
              slideRefs.current[visibleStyles.length] = el
            }}
            data-index={visibleStyles.length}
            className="h-full w-full snap-start snap-always relative bg-[#050505] overflow-hidden flex flex-col justify-end px-6 pb-10"
          >
            {/* Живое размытое видео 4-го фасона на фоне */}
            {STYLES_DATA[3]?.video && (
              <video
                src={STYLES_DATA[3].video}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-35 pointer-events-none"
              />
            )}

            {/* Драматичное затемнение */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40 z-0 pointer-events-none" />

            {/* Фоновая типографика в стиле Vogue */}
            <div className="absolute top-24 left-4 pointer-events-none select-none z-0">
              <h2 className="font-serif text-[22vw] leading-[0.8] text-white/[0.04] tracking-tighter">
                FULL
                <br />
                VIDEO
                <br />
                LOOKBOOK
              </h2>
            </div>

            {/* Контент пейволла */}
            <div className="relative z-10 w-full mb-2">
              <div className="w-full h-px bg-white/20 mb-6" />

              <p className="text-[9px] font-sans uppercase tracking-[0.35em] text-white/60 mb-3">
                {t.paywall.tag}
              </p>

              <h3 className="font-serif text-4xl min-[390px]:text-5xl tracking-tight text-[#F4F0E8] whitespace-pre-line mb-4">
                {t.paywall.title}
              </h3>

              <p className="text-[11px] min-[390px]:text-[12px] font-sans font-light leading-[1.7] text-white/75 max-w-[320px] mb-5">
                {t.paywall.desc}
              </p>

              {/* Тизер-чипсы заблокированных фасонов */}
              <div className="flex flex-wrap gap-1.5 mb-8">
                {lockedPreviewTitles.map((title) => (
                  <span
                    key={title}
                    className="px-2.5 py-1 text-[9px] font-sans uppercase tracking-[0.15em] text-white/75 bg-white/10 border border-white/15 backdrop-blur-sm"
                  >
                    {title}
                  </span>
                ))}
                <span className="px-2.5 py-1 text-[9px] font-sans uppercase tracking-[0.15em] text-white/50 border border-white/10">
                  {t.moreStyles}
                </span>
              </div>

              <button
                onClick={handleProClick}
                disabled={isPurchasing}
                className="paywall-btn group relative flex items-center justify-between w-full h-[56px] px-6 border text-[#F4F0E8] hover:bg-white/10 active:scale-[0.98] transition-all outline-none bg-black/50 backdrop-blur-md cursor-pointer"
              >
                {isPurchasing ? (
                  <span className="text-[10px] font-sans uppercase tracking-[0.2em] animate-pulse mx-auto">
                    {t.paywall.loading}
                  </span>
                ) : (
                  <>
                    <span className="text-[10px] font-sans uppercase tracking-[0.2em]">
                      {t.paywall.btn}
                    </span>
                    <LockIcon />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
