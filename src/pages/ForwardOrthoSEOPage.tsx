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
    title: 'Расчёт ортопедической колодки и полноты стопы | Альтернатива Форвард Орто',
    description:
      'Точный онлайн-конвертер полноты стопы и маркировок колодок (ГОСТ Украина, США, ЕС, Англия). Инструмент для конструкторов обуви и ортопедов. Цифровая альтернатива классическим методам Форвард Орто.',
    h1: 'Профессиональный калькулятор полноты колодок',
    lead:
      'Цифровое решение для ортопедии и обувного производства. Конвертация между стандартами ГОСТ (Украина), ISO/EU, США и Англии. Быстрый расчёт обхватов в плюсне, подъёме и пятке.',
    bullets: [
      'Полнота по ГОСТ (цифровая и буквенная маркировка)',
      'Эквиваленты US / UK / EU (ISO)',
      'Обхваты: плюсна, подъём, пятка — в мм и дюймах',
      'Мужские, женские и детские колодки',
    ],
    aboutTitle: 'Зачем этот инструмент',
    aboutText:
      'Классические таблицы Форвард Орто и бумажные лекала уступают цифровому расчёту по скорости и точности. Калькулятор учитывает градацию по размеру и полноте, что важно при проектировании ортопедической и серийной обуви. Подходит конструкторам, ортопедам и мастерам-сапожникам.',
    backLabel: 'На главную Cordwainer',
  },
  uk: {
    title: 'Розрахунок ортопедичної колодки та повноти стопи | Альтернатива Форвард Орто',
    description:
      'Точний онлайн-конвертер повноти стопи та маркувань колодок (ГОСТ Україна, США, ЄС, Англія). Інструмент для конструкторів взуття та ортопедів. Цифрова альтернатива класичним методам Форвард Орто.',
    h1: 'Професійний калькулятор повноти колодок',
    lead:
      'Цифрове рішення для ортопедії та взуттєвого виробництва. Конвертація між стандартами ГОСТ (Україна), ISO/EU, США та Англії. Швидкий розрахунок обхватів у плюсні, підйомі та п’яті.',
    bullets: [
      'Повнота за ГОСТ (цифрове та літерне маркування)',
      'Еквіваленти US / UK / EU (ISO)',
      'Обхвати: плюсна, підйом, п’ята — у мм і дюймах',
      'Чоловічі, жіночі та дитячі колодки',
    ],
    aboutTitle: 'Навіщо цей інструмент',
    aboutText:
      'Класичні таблиці Форвард Орто та паперові лекала поступаються цифровому розрахунку за швидкістю й точністю. Калькулятор враховує градацію за розміром і повнотою — це важливо при проектуванні ортопедичного та серійного взуття. Підходить конструкторам, ортопедам і майстрам-шевцям.',
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
