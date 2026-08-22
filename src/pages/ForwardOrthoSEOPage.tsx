
// src/pages/ForwardOrthoSEOPage.tsx
// Скрытая SEO-страница (orphan page) для поискового трафика.
// URL: /forward-ortho-converter
// Не связана ссылками из основного UI приложения.

import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { Lang } from '../App'
import { WidthCalcPage } from './WidthCalcPage'

type Props = {
  lang: Lang
  setLang: (lang: Lang) => void
  onBack: () => void
}

const SEO = {
  ru: {
    title: 'Калькулятор полноты колодки онлайн — таблица ГОСТ, обхваты стопы',
    description:
      'Бесплатный калькулятор полноты колодки и конвертер маркировок: ГОСТ (Украина), US, UK, EU. Расчёт обхватов плюсны, подъёма и пятки в мм. Цифровая альтернатива бумажным таблицам и методам Форвард Орто.',
    h1: 'Калькулятор полноты колодки и обхватов стопы',
    lead:
      'Онлайн-таблица полноты по ГОСТ и международным стандартам. Введите размер — получите цифровую и буквенную полноту, обхваты в плюсне, подъёме и пятке. Для конструкторов обуви, ортопедов и сапожников.',
    bullets: [
      'Полнота по ГОСТ: цифровая (1–12) и буквенная (А–Е и шире)',
      'Конвертер US / UK / EU (ISO) ↔ ГОСТ Украина',
      'Обхваты плюсны, подъёма, пятки — мм и дюймы',
      'Мужские, женские и детские колодки',
    ],
    aboutTitle: 'Зачем онлайн-калькулятор вместо бумажных таблиц',
    aboutText:
      'Бумажные таблицы полноты и классические лекала (в том числе методы, известные по практике Форвард Орто) требуют ручного поиска строки и часто дают погрешность при градации. Этот калькулятор сразу пересчитывает полноту и обхваты по размеру, ускоряет подбор колодки для ортопедической и серийной обуви. Подходит конструкторам, ортопедам и мастерам-сапожникам.',
    backLabel: 'На главную Cordwainer',
  },
  uk: {
    title: 'Калькулятор повноти колодки онлайн — таблиця ГОСТ, обхвати стопи',
    description:
      'Безкоштовний калькулятор повноти колодки та конвертер маркувань: ГОСТ (Україна), US, UK, EU. Розрахунок обхватів плюсни, підйому та п’яти в мм. Цифрова альтернатива паперовим таблицям і методам Форвард Орто.',
    h1: 'Калькулятор повноти колодки та обхватів стопи',
    lead:
      'Онлайн-таблиця повноти за ГОСТ і міжнародними стандартами. Введіть розмір — отримайте цифрову та літерну повноту, обхвати в плюсні, підйомі та п’яті. Для конструкторів взуття, ортопедів і шевців.',
    bullets: [
      'Повнота за ГОСТ: цифрова (1–12) і літерна (А–Е та ширше)',
      'Конвертер US / UK / EU (ISO) ↔ ГОСТ Україна',
      'Обхвати плюсни, підйому, п’яти — мм і дюйми',
      'Чоловічі, жіночі та дитячі колодки',
    ],
    aboutTitle: 'Навіщо онлайн-калькулятор замість паперових таблиць',
    aboutText:
      'Паперові таблиці повноти та класичні лекала (зокрема методи, відомі з практики Форвард Орто) потребують ручного пошуку рядка і часто дають похибку при градації. Цей калькулятор одразу перераховує повноту й обхвати за розміром, прискорює підбір колодки для ортопедичного та серійного взуття. Підходить конструкторам, ортопедам і майстрам-шевцям.',
    backLabel: 'На головну Cordwainer',
  },
} as const

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setOg(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function ForwardOrthoSEOPage({ lang, setLang, onBack }: Props) {
  const t = SEO[lang]
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const prevTitle = document.title
    document.title = t.title
    setMeta('description', t.description)
    setMeta('robots', 'index, follow')
    setOg('og:title', t.title)
    setOg('og:description', t.description)
    setOg('og:type', 'website')

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = `${window.location.origin}/forward-ortho-converter`

    return () => {
      document.title = prevTitle
    }
  }, [t])

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col min-h-[100dvh]"
      style={{
        background: 'var(--color-bg, #1C1816)',
        color: 'var(--color-ink, #F5F1EA)',
      }}
    >
      <section className="px-4 md:px-6 pt-5 pb-3 max-w-2xl mx-auto w-full">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-[18px] md:text-[20px] font-semibold leading-snug tracking-tight">
              {t.h1}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
              {t.lead}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setLang('ru')}
              className="px-2 py-1 rounded-lg text-[11px] font-medium"
              style={{
                background: lang === 'ru' ? 'var(--color-accent, #E4D00A)' : 'var(--color-surface, #25201C)',
                color: lang === 'ru' ? '#151210' : 'var(--color-muted)',
              }}
            >
              RU
            </button>
            <button
              type="button"
              onClick={() => setLang('uk')}
              className="px-2 py-1 rounded-lg text-[11px] font-medium"
              style={{
                background: lang === 'uk' ? 'var(--color-accent, #E4D00A)' : 'var(--color-surface, #25201C)',
                color: lang === 'uk' ? '#151210' : 'var(--color-muted)',
              }}
            >
              UK
            </button>
          </div>
        </div>

        <ul className="mb-3 space-y-1">
          {t.bullets.map((b) => (
            <li
              key={b}
              className="text-[12px] flex items-start gap-2"
              style={{ color: 'var(--color-ink)' }}
            >
              <span style={{ color: 'var(--color-accent, #E4D00A)' }}>•</span>
              {b}
            </li>
          ))}
        </ul>

        <div
          className="rounded-2xl p-3.5 text-[12px] leading-relaxed"
          style={{
            background: 'var(--color-surface, #25201C)',
            border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 50%, transparent)',
          }}
        >
          <div className="font-semibold mb-1 text-[13px]">{t.aboutTitle}</div>
          <p style={{ color: 'var(--color-muted, #B9ACA0)' }}>{t.aboutText}</p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="mt-3 text-[12px] underline underline-offset-2 opacity-70 hover:opacity-100"
        >
          ← {t.backLabel}
        </button>
      </section>

      <div className="flex-1 min-h-0 border-t" style={{ borderColor: 'var(--color-border, rgba(255,255,255,0.12))' }}>
        <WidthCalcPage lang={lang} onBack={onBack} />
      </div>
    </motion.div>
  )
}
