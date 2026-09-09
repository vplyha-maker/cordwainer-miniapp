export type BlogArticle = {
  id: string
  titleRu: string
  titleUk: string
  titleDe: string
  excerptRu: string
  excerptUk: string
  excerptDe: string
  tagRu: string
  tagUk: string
  tagDe: string
  readTimeRu: string
  readTimeUk: string
  readTimeDe: string
  cover: string
  isNew: boolean
  createdAt: string
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'orthopedic-fear',
    titleRu: 'Почему мы до сих пор боимся слова «ортопедическая»?',
    titleUk: 'Чому ми досі боїмося слова «ортопедичне»?',
    titleDe: 'Warum haben wir immer noch Angst vor dem Wort "orthopädisch"?',
    excerptRu: 'Разбираем стереотипы о комфортной обуви и почему бренды прячут правильные колодки за модными фасадами.',
    excerptUk: 'Розбираємо стереотипи про комфортне взуття і чому бренди ховають правильні колодки за модними фасадами.',
    excerptDe: 'Wir analysieren Stereotypen über bequeme Schuhe und warum Marken richtige Leisten hinter modischen Fassaden verstecken.',
    tagRu: 'ИНДУСТРИЯ',
    tagUk: 'ІНДУСТРІЯ',
    tagDe: 'INDUSTRIE',
    readTimeRu: '7 мин',
    readTimeUk: '7 хв',
    readTimeDe: '7 Min',
    cover: '3d.jpg',
    isNew: false,
    createdAt: '2026-08-08',
  },
  {
    id: 'design-vs-story',
    titleRu: 'Что сегодня продает обувь — дизайн или история?',
    titleUk: 'Що сьогодні продає взуття — дизайн чи історія?',
    titleDe: 'Was verkauft heute Schuhe — Design oder Geschichte?',
    excerptRu: 'Как сторителлинг победил функциональность, и почему кроссовки с историей стоят в 10 раз дороже обычных.',
    excerptUk: 'Як сторітелінг переміг функціональність, і чому кросівки з історією коштують у 10 разів дорожче за звичайні.',
    excerptDe: 'Wie Storytelling die Funktionalität besiegt hat und warum Sneaker mit Geschichte 10-mal teurer sind als gewöhnliche.',
    tagRu: 'МАРКЕТИНГ',
    tagUk: 'МАРКЕТИНГ',
    tagDe: 'MARKETING',
    readTimeRu: '5 мин',
    readTimeUk: '5 хв',
    readTimeDe: '5 Min',
    cover: 'Air.jpeg',
    isNew: false,
    createdAt: '2026-08-05',
  },
  {
    id: 'idastril-manuf',
    titleRu: 'Шаг в никуда или шаг к себе? Битва конвейера и ручного ремесла в современной обувной индустрии',
    titleUk: 'Крок у нікуди чи крок до себе? Битва конвеєра та ручного ремесла в сучасній взуттєвій індустрії',
    titleDe: 'Ein Schritt ins Nichts oder ein Schritt zu sich selbst? Der Kampf zwischen Fließband und Handwerk in der modernen Schuhindustrie',
    excerptRu: 'Битва конвейера и ручного ремесла в современной обувной индустрии',
    excerptUk: 'Битва конвеєра та ручного ремесла в сучасній взуттєвій індустрії',
    excerptDe: 'Der Kampf zwischen Fließband und Handwerk in der modernen Schuhindustrie',
    tagRu: 'ИНДУСТРИЯ',
    tagUk: 'ІНДУСТРІЯ',
    tagDe: 'INDUSTRIE',
    readTimeRu: '7 мин',
    readTimeUk: '7 хв',
    readTimeDe: '7 Min',
    cover: 'Shoe-Factories.jpg',
    isNew: false,
    createdAt: '2026-09-05',
  },
  {
    id: 'china-manuf',
    titleRu: 'Иллюзия дешевой пары: суровая арифметика китайского обувпрома',
    titleUk: 'Ілюзія дешевої пари: сувора арифметика китайського взуттєпрому',
    titleDe: 'Die Illusion des billigen Schuhs: Die harte Arithmetik der chinesischen Schuhindustrie',
    excerptRu: 'Производственная панорама: от гибких мастерских до индустриальных гигантов',
    excerptUk: 'Виробнича панорама: від гнучких майстерень до індустріальних гігантів',
    excerptDe: 'Das Produktionspanorama: Von flexiblen Werkstätten bis zu Industriegiganten',
    tagRu: 'ПРОИЗВОДСТВО',
    tagUk: 'ВИРОБНИЦТВО',
    tagDe: 'PRODUKTION',
    readTimeRu: '5 мин',
    readTimeUk: '7 хв',
    readTimeDe: '5 Min',
    cover: 'chinamanuf/xds.jpg',
    isNew: true,
    createdAt: '2026-09-14',
  },
]
