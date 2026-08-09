export type BlogArticle = {
  id: string
  titleRu: string
  titleUk: string
  excerptRu: string   // Краткое описание для карточки
  excerptUk: string   // Короткий опис для картки
  tagRu: string       // Рубрика (ИНДУСТРИЯ, МАРКЕТИНГ)
  tagUk: string       // Рубрика (ІНДУСТРІЯ, МАРКЕТИНГ)
  readTimeRu: string  // Время чтения ('7 мин')
  readTimeUk: string  // Час читання ('7 хв')
  cover: string       // Твой параметр для обложки (понадобится позже внутри статьи)
  isNew: boolean
  createdAt: string   // Твой параметр даты
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'orthopedic-fear',
    titleRu: 'Почему мы до сих пор боимся слова «ортопедическая»?',
    titleUk: 'Чому ми досі боїмося слова «ортопедичне»?',
    excerptRu: 'Разбираем стереотипы о комфортной обуви и почему бренды прячут правильные колодки за модными фасадами.',
    excerptUk: 'Розбираємо стереотипи про комфортне взуття і чому бренди ховають правильні колодки за модними фасадами.',
    tagRu: 'ИНДУСТРИЯ',
    tagUk: 'ІНДУСТРІЯ',
    readTimeRu: '7 мин',
    readTimeUk: '7 хв',
    cover: '/covers/ortho.png',
    isNew: true,
    createdAt: '2026-08-08',
  },
  {
    id: 'design-vs-story',
    titleRu: 'Что сегодня продает обувь — дизайн или история?',
    titleUk: 'Що сьогодні продає взуття — дизайн чи історія?',
    excerptRu: 'Как сторителлинг победил функциональность, и почему кроссовки с историей стоят в 10 раз дороже обычных.',
    excerptUk: 'Як сторітелінг переміг функціональність, і чому кросівки з історією коштують у 10 разів дорожче за звичайні.',
    tagRu: 'МАРКЕТИНГ',
    tagUk: 'МАРКЕТИНГ',
    readTimeRu: '5 мин',
    readTimeUk: '5 хв',
    cover: '/covers/story.png',
    isNew: false,
    createdAt: '2026-08-05',
  },
  {
  id: 'idastril-manuf'
  titleRu: string
  titleUk: string
  excerptRu: string   // Краткое описание для карточки
  excerptUk: string   // Короткий опис для картки
  tagRu: string       // Рубрика (ИНДУСТРИЯ, МАРКЕТИНГ)
  tagUk: string       // Рубрика (ІНДУСТРІЯ, МАРКЕТИНГ)
  readTimeRu: string  // Время чтения ('7 мин')
  readTimeUk: string  // Час читання ('7 хв')
  cover: string       // Твой параметр для обложки (понадобится позже внутри статьи)
  isNew: boolean
  createdAt: string   // Твой параметр даты
  }
]
