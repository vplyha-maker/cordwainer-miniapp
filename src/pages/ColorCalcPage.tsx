import { motion } from 'framer-motion'
import { Lang } from '../App' // Проверьте, чтобы путь до App.tsx был корректным

interface ColorCalcPageProps {
  lang: Lang
  onBack: () => void
}

export function ColorCalcPage({ lang, onBack }: ColorCalcPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen flex flex-col pt-safe px-4 pb-8"
    >
      {/* Шапка страницы */}
      <div className="flex items-center mb-6 mt-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-[var(--color-ink)] opacity-70 hover:opacity-100 transition-opacity"
        >
          {/* Иконка стрелки назад */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-xl font-bold ml-2">
          {lang === 'uk' ? 'Калькулятор кольорів' : 'Калькулятор цветов'}
        </h1>
      </div>

      {/* Временная заглушка для контента */}
      <div className="flex-1 flex items-center justify-center text-center opacity-50">
        <p>
          {lang === 'uk'
            ? 'Тут буде інтерфейс калькулятора...'
            : 'Здесь будет интерфейс калькулятора...'}
        </p>
      </div>
    </motion.div>
  )
}

