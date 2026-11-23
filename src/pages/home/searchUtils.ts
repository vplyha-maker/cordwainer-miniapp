import type { Lang } from '../../App'
import type { MenuItem, SearchResultItem } from './types'

export function deepSearch(obj: unknown, query: string): boolean {
  if (!obj) return false
  if (typeof obj === 'string') return obj.toLowerCase().includes(query)
  if (typeof obj === 'object') {
    return Object.values(obj as Record<string, unknown>).some((val) =>
      deepSearch(val, query),
    )
  }
  return false
}

export function getDisplayTitle(item: unknown, lang: Lang): string {
  if (!item || typeof item !== 'object') return '...'
  const rec = item as Record<string, unknown>

  const pickLocalized = (field: unknown): string | null => {
    if (typeof field === 'string') return field
    if (field && typeof field === 'object') {
      const localized = (field as Record<string, unknown>)[lang]
      if (typeof localized === 'string') return localized
    }
    return null
  }

  return (
    pickLocalized(rec.title) ||
    pickLocalized(rec.name) ||
    pickLocalized(rec.term) ||
    '...'
  )
}

export function buildSearchResults(params: {
  query: string
  menuItems: MenuItem[]
  articles: Array<{ id: string; [key: string]: unknown }>
  glossaryTerms: Array<{ id: string; [key: string]: unknown }>
  lang: Lang
  labels: { section: string; blog: string; glossary: string }
}): SearchResultItem[] {
  const { query, menuItems, articles, glossaryTerms, lang, labels } = params
  if (!query) return []

  const results: SearchResultItem[] = []

  menuItems.forEach((item) => {
    if (
      item.title.toLowerCase().includes(query) ||
      item.subtitle.toLowerCase().includes(query)
    ) {
      results.push({
        type: 'category',
        id: item.id,
        title: item.title,
        subtitle: labels.section,
      })
    }
  })

  articles.forEach((article) => {
    if (deepSearch(article, query)) {
      results.push({
        type: 'article',
        id: article.id,
        title: getDisplayTitle(article, lang),
        subtitle: labels.blog,
      })
    }
  })

  glossaryTerms.forEach((term) => {
    if (deepSearch(term, query)) {
      results.push({
        type: 'glossary',
        id: term.id,
        title: getDisplayTitle(term, lang),
        subtitle: labels.glossary,
      })
    }
  })

  return results
}

