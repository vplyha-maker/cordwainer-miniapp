import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'

type ColorsPageProps = {
  onBack: () => void
  lang: Lang
  setLang: (lang: Lang) => void
}

type Scheme =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'rectangular'
  | 'split-complementary'
  | 'monochromatic'

type Silhouette = 'runner' | 'derby' | 'pump'

const LockIcon = ({ size = 10 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mb-[1px]"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0110 0v4"></path>
  </svg>
)

function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
  } catch {}
}
/* ============================================================================
   1. RUNNER — ATELIER LUXURY RUNNER (Пропорции: Loro Piana / Loewe)
   ============================================================================ */
function RunnerSvg({ colors, isDark }: { colors: string[]; isDark: boolean }) {
  const mainColor = colors[0] // 60% — Кожаный каркас, мысок, пяточный стакан
  const secondaryColor = colors[1] // 30% — Замшевая база союзки, берец и язычок
  const tertiaryColor = colors.length > 3 ? colors[2] : colors[1] // 15% — Внутренняя подкладка, стелька, спойлер
  const accentColor = colors[colors.length - 1] // 10% — Протектор, шеврон, ярлык язычка, люверсы

  const outline = isDark ? 'rgba(244, 240, 232, 0.48)' : 'rgba(28, 24, 22, 0.42)'
  const seam = isDark ? 'rgba(244, 240, 232, 0.28)' : 'rgba(28, 24, 22, 0.24)'
  const stitch = isDark ? 'rgba(244, 240, 232, 0.55)' : 'rgba(28, 24, 22, 0.45)'
  const midsoleTop = isDark ? '#262421' : '#FDFBF7'
  const midsoleBottom = isDark ? '#161513' : '#E6E0D6'
  const laceColor = isDark ? '#F4F0E8' : '#FFFFFF'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 680 320"
      className="w-full h-auto max-h-[225px] md:max-h-[285px] select-none overflow-visible"
    >
      <defs>
        {/* Контактная тень студийного лукбука */}
        <radialGradient id="lp-floor" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity={isDark ? '0.75' : '0.22'} />
          <stop offset="55%" stopColor="#000000" stopOpacity={isDark ? '0.25' : '0.07'} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Светотень объема колодки */}
        <linearGradient id="lp-last-volume" x1="15%" y1="0%" x2="25%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.2' : '0.36'} />
          <stop offset="42%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity={isDark ? '0.48' : '0.26'} />
        </linearGradient>

        {/* Мягкий бархатистый градиент для замшевых деталей */}
        <linearGradient id="lp-suede" x1="0%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.12' : '0.24'} />
          <stop offset="50%" stopColor="#000000" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000000" stopOpacity={isDark ? '0.4' : '0.22'} />
        </linearGradient>

        {/* Глубокая тень внутри горловины */}
        <linearGradient id="lp-interior" x1="0%" y1="0%" x2="20%" y2="100%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.68" />
        </linearGradient>

        {/* Градиент скульптурной межподошвы */}
        <linearGradient id="lp-midsole" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={midsoleTop} />
          <stop offset="100%" stopColor={midsoleBottom} />
        </linearGradient>

        {/* Единый герметичный силуэт верха (исключает любые дыры и зазоры) */}
        <clipPath id="lp-upper-clip">
          <path d="M 104 234 C 98 198, 108 156, 126 122 C 132 112, 142 110, 156 114 C 188 120, 224 118, 252 108 C 266 90, 280 76, 296 74 C 312 72, 326 82, 338 98 C 368 134, 408 166, 452 184 C 494 194, 542 200, 574 214 C 588 220, 592 232, 582 242 C 525 250, 420 252, 310 250 C 212 248, 146 242, 104 234 Z" />
        </clipPath>
      </defs>

      {/* Опорная тень */}
      <ellipse cx="342" cy="280" rx="268" ry="14" fill="url(#lp-floor)" />
      <ellipse cx="335" cy="277" rx="210" ry="6" fill="url(#lp-floor)" />

      {/* =====================================================================
          ВЕРХ ОБУВИ (Собран внутри единого лекала #lp-upper-clip)
         ===================================================================== */}
      <g clipPath="url(#lp-upper-clip)" style={{ transition: 'all 0.45s ease' }}>
        {/* 1. ВНУТРЕННЯЯ ПОДКЛАДКА И СТЕЛЬКА (Tertiary 15% — закрывает всю горловину) */}
        <rect x="90" y="65" width="270" height="140" fill={tertiaryColor} />
        <rect x="90" y="65" width="270" height="140" fill="url(#lp-interior)" />
        {/* Стеганые ребра кожаной подкладки пятки */}
        <path
          d="M 155 110 C 150 130, 150 150, 154 168 M 185 112 C 180 132, 180 152, 184 170 M 215 112 C 210 132, 210 152, 214 170"
          fill="none"
          stroke="#000000"
          strokeWidth="1.2"
          opacity="0.25"
        />

        {/* 2. АНАТОМИЧЕСКИЙ ЯЗЫЧОК (Secondary 30%) */}
        <path
          d="M 235 165 C 242 122, 265 82, 296 74 C 314 72, 328 82, 340 100 C 368 136, 405 168, 445 186 L 315 205 Z"
          fill={secondaryColor}
        />
        <path
          d="M 235 165 C 242 122, 265 82, 296 74 C 314 72, 328 82, 340 100 C 368 136, 405 168, 445 186 L 315 205 Z"
          fill="url(#lp-suede)"
        />
        {/* Жаккардовый фирменный лейбл на язычке (Accent 10%) */}
        <path
          d="M 284 74 L 324 80 L 314 102 L 276 94 Z"
          fill={accentColor}
          stroke={outline}
          strokeWidth="1"
        />

        {/* 3. БАЗА ВЕРХА И СОЮЗКА (Secondary 30% — Замша/Нубук) */}
        <path
          d="M 100 135 C 155 152, 202 158, 240 138 L 318 102 L 455 180 L 595 210 L 595 258 L 100 258 Z"
          fill={secondaryColor}
        />
        <path
          d="M 100 135 C 155 152, 202 158, 240 138 L 318 102 L 455 180 L 595 210 L 595 258 L 100 258 Z"
          fill="url(#lp-suede)"
        />

        {/* 4. МЯГКИЙ ВАЛИК ВОРОТНИКА ЩИКОЛОТКИ (Tertiary 15%) */}
        <path
          d="M 122 120 C 156 150, 198 158, 234 140 C 254 130, 268 112, 284 96 L 302 112 C 282 136, 260 158, 228 166 C 188 176, 142 162, 112 138 Z"
          fill={tertiaryColor}
          stroke={seam}
          strokeWidth="1.1"
        />
        <path
          d="M 122 120 C 156 150, 198 158, 234 140 C 254 130, 268 112, 284 96 L 302 112 C 282 136, 260 158, 228 166 C 188 176, 142 162, 112 138 Z"
          fill="url(#lp-last-volume)"
        />

        {/* 5. ФИРМЕННЫЙ ДИАГОНАЛЬНЫЙ ШЕВРОН АТЕЛЬЕ (Accent 10%) */}
        <path
          d="M 248 162 L 298 152 L 352 248 L 302 248 Z"
          fill={accentColor}
          stroke={seam}
          strokeWidth="1"
        />
        <path
          d="M 308 154 L 326 151 L 380 248 L 362 248 Z"
          fill={accentColor}
          fillOpacity="0.85"
          stroke={seam}
          strokeWidth="0.9"
        />

        {/* 6. АРХИТЕКТУРНАЯ ПЛАНКА ШНУРОВКИ / БЕРЦЫ (Main 60%) */}
        <path
          d="M 236 172 C 258 152, 276 122, 292 98 C 300 88, 312 88, 322 98 C 354 132, 394 164, 442 184 L 424 208 C 388 194, 348 168, 312 132 C 296 154, 278 174, 254 186 Z"
          fill={mainColor}
          stroke={outline}
          strokeWidth="1.2"
        />
        <path
          d="M 236 172 C 258 152, 276 122, 292 98 C 300 88, 312 88, 322 98 C 354 132, 394 164, 442 184 L 424 208 C 388 194, 348 168, 312 132 C 296 154, 278 174, 254 186 Z"
          fill="url(#lp-last-volume)"
        />
        <path
          d="M 246 175 C 266 155, 283 127, 298 105 C 303 98, 310 98, 317 105 C 348 138, 388 168, 433 187"
          fill="none"
          stroke={stitch}
          strokeWidth="0.9"
          strokeDasharray="2.5 2.5"
        />

        {/* 7. НИЗКОПРОФИЛЬНЫЙ ОБТЕКАТЕЛЬ МЫСКА (Mudguard — Main 60%) */}
        <path
          d="M 382 252 C 392 216, 424 196, 468 198 C 512 200, 554 204, 588 216 L 592 254 Z"
          fill={mainColor}
          stroke={outline}
          strokeWidth="1.2"
        />
        <path
          d="M 382 252 C 392 216, 424 196, 468 198 C 512 200, 554 204, 588 216 L 592 254 Z"
          fill="url(#lp-last-volume)"
        />
        <path
          d="M 390 248 C 400 220, 428 203, 468 205 C 510 207, 550 210, 582 221"
          fill="none"
          stroke={stitch}
          strokeWidth="0.9"
          strokeDasharray="2.5 2.5"
        />

        {/* 8. СКУЛЬПТУРНЫЙ ПЯТОЧНЫЙ СТАКАН (Heel Counter — Main 60%) */}
        <path
          d="M 98 240 L 122 120 C 148 152, 186 174, 224 192 C 238 210, 244 230, 242 252 L 98 252 Z"
          fill={mainColor}
          stroke={outline}
          strokeWidth="1.2"
        />
        <path
          d="M 98 240 L 122 120 C 148 152, 186 174, 224 192 C 238 210, 244 230, 242 252 L 98 252 Z"
          fill="url(#lp-last-volume)"
        />
        <path
          d="M 120 132 C 146 160, 182 180, 218 197 C 230 214, 236 232, 234 248"
          fill="none"
          stroke={stitch}
          strokeWidth="0.9"
          strokeDasharray="2.5 2.5"
        />
        {/* Кожаная петля на заднике (Accent 10%) */}
        <path
          d="M 118 118 L 142 118 L 136 146 L 112 142 Z"
          fill={accentColor}
          stroke={outline}
          strokeWidth="1"
        />

        {/* Тень стыка верха с подошвой (придает посадку в колодку) */}
        <path
          d="M 104 234 C 146 242, 212 248, 310 250 C 420 252, 525 250, 582 242"
          fill="none"
          stroke="#000000"
          strokeWidth="3.5"
          opacity="0.28"
        />
      </g>

      {/* ВНЕШНИЙ КОНТУР ВЕРХА И КАНТ ГОРЛОВИНЫ */}
      <path
        d="M 104 234 C 98 198, 108 156, 126 122 C 132 112, 142 110, 156 114 C 188 120, 224 118, 252 108 C 266 90, 280 76, 296 74 C 312 72, 326 82, 338 98 C 368 134, 408 166, 452 184 C 494 194, 542 200, 574 214 C 588 220, 592 232, 582 242 C 525 250, 420 252, 310 250 C 212 248, 146 242, 104 234 Z"
        fill="none"
        stroke={outline}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Блик по переднему канту выреза щиколотки */}
      <path
        d="M 126 122 C 158 150, 198 158, 234 140 C 254 130, 268 112, 284 96"
        fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)'}
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* ЛЮВЕРСЫ И ПЛОСКАЯ ШНУРОВКА */}
      <g>
        {[
          { x1: 312, y1: 112, x2: 338, y2: 98, accent: true },
          { x1: 336, y1: 132, x2: 362, y2: 118, accent: false },
          { x1: 360, y1: 150, x2: 388, y2: 136, accent: false },
          { x1: 386, y1: 166, x2: 414, y2: 152, accent: false },
          { x1: 412, y1: 180, x2: 438, y2: 168, accent: true },
        ].map((l, idx) => (
          <g key={idx}>
            <circle
              cx={l.x1}
              cy={l.y1}
              r="3.2"
              fill={l.accent ? accentColor : tertiaryColor}
              stroke={outline}
              strokeWidth="1"
            />
            <path
              d={`M ${l.x1} ${l.y1 + 1.5} Q ${(l.x1 + l.x2) / 2} ${(l.y1 + l.y2) / 2 - 3} ${l.x2} ${l.y2 + 1.5}`}
              fill="none"
              stroke="#000000"
              strokeWidth="4.2"
              strokeLinecap="round"
              opacity="0.22"
            />
            <path
              d={`M ${l.x1} ${l.y1} Q ${(l.x1 + l.x2) / 2} ${(l.y1 + l.y2) / 2 - 4} ${l.x2} ${l.y2}`}
              fill="none"
              stroke={laceColor}
              strokeWidth="3.8"
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>

      {/* =====================================================================
          МНОГОСЛОЙНАЯ ПОДОШВА С ВЫСТУПАЮЩИМ СПОЙЛЕРОМ (Loro Piana Sole)
         ===================================================================== */}
      <g style={{ transition: 'all 0.45s ease' }}>
        {/* Резиновый протектор с заходом на мысок и пятку (Outsole — Accent 10%) */}
        <path
          d="M 94 264 C 96 273, 110 276, 138 276 L 478 276 C 528 276, 568 266, 592 246 C 596 238, 594 228, 586 224 L 580 232 C 562 254, 522 266, 472 268 L 100 264 Z"
          fill={accentColor}
          stroke={outline}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Скульптурная межподошва (Midsole) */}
        <path
          d="M 102 232 C 146 242, 212 248, 310 250 C 420 252, 525 250, 582 240 C 588 246, 588 254, 580 260 C 546 268, 495 270, 440 270 L 102 268 C 92 266, 88 258, 92 246 Z"
          fill="url(#lp-midsole)"
          stroke={outline}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Стабилизирующий спойлер в пятке (Tertiary 15%) */}
        <path
          d="M 91 248 L 232 253 C 238 253, 242 257, 240 261 C 238 265, 232 268, 224 268 L 98 267 C 91 264, 89 256, 91 248 Z"
          fill={tertiaryColor}
          stroke={outline}
          strokeWidth="1.1"
        />

        {/* Архитектурная грань пресс-формы подошвы */}
        <path
          d="M 96 242 C 165 252, 265 256, 390 258 C 475 259, 542 254, 584 244"
          fill="none"
          stroke={seam}
          strokeWidth="1"
        />
      </g>
    </svg>
  )
}

/* ============================================================================
   2. DERBY — BESPOKE PATINA BROGUE (Пропорции: Berluti / John Lobb)
   ============================================================================ */
function DerbySvg({ colors, isDark }: { colors: string[]; isDark: boolean }) {
  const mainColor = colors[0] // 60% — Берцы «лебединая шея», мысок Wingtip, пяточный стакан
  const secondaryColor = colors[1] // 30% — Полированная союзка (Vamp) и язычок
  const tertiaryColor = colors.length > 3 ? colors[2] : colors[1] // 15% — Кожаная подкладка, стелька, рант Goodyear
  const accentColor = colors[colors.length - 1] // 10% — Набойка, профилактика, шнурки, клеймо стельки

  const outline = isDark ? 'rgba(244, 240, 232, 0.48)' : 'rgba(28, 24, 22, 0.42)'
  const seam = isDark ? 'rgba(244, 240, 232, 0.3)' : 'rgba(28, 24, 22, 0.25)'
  const stitch = isDark ? 'rgba(244, 240, 232, 0.58)' : 'rgba(28, 24, 22, 0.48)'
  const soleLeather = isDark ? '#2B211B' : '#CFB99F'
  const soleWaist = isDark ? '#1A130F' : '#9E8468'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 680 320"
      className="w-full h-auto max-h-[225px] md:max-h-[285px] select-none overflow-visible"
    >
      <defs>
        <radialGradient id="jl-floor" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity={isDark ? '0.75' : '0.22'} />
          <stop offset="55%" stopColor="#000000" stopOpacity={isDark ? '0.25' : '0.07'} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Зеркальный глассаж (Glaçage) и патина на телячьей коже */}
        <linearGradient id="jl-glacage" x1="10%" y1="0%" x2="25%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.25' : '0.42'} />
          <stop offset="36%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000000" stopOpacity={isDark ? '0.52' : '0.3'} />
        </linearGradient>

        {/* Темный патинированный мысок и пятка (эффект Berluti) */}
        <radialGradient id="jl-toe-burnish" cx="92%" cy="65%" r="35%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="jl-interior" x1="0%" y1="0%" x2="15%" y2="100%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
        </linearGradient>

        <linearGradient id="jl-sole-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={soleWaist} />
          <stop offset="35%" stopColor={soleLeather} />
          <stop offset="100%" stopColor={soleWaist} />
        </linearGradient>

        {/* Герметичный силуэт верха Дерби */}
        <clipPath id="jl-upper-clip">
          <path d="M 108 242 C 102 206, 110 164, 128 130 C 133 122, 142 120, 155 122 C 192 125, 232 124, 266 116 C 278 98, 294 86, 310 88 C 324 90, 336 102, 348 116 C 380 148, 418 176, 458 190 C 504 202, 554 208, 584 222 C 596 228, 596 240, 586 246 C 535 256, 442 258, 338 256 C 282 255, 244 248, 204 246 L 108 242 Z" />
        </clipPath>
      </defs>

      {/* Опорная тень под каблуком и пучками стопы */}
      <ellipse cx="344" cy="280" rx="262" ry="13" fill="url(#jl-floor)" />
      <ellipse cx="156" cy="279" rx="58" ry="6" fill="url(#jl-floor)" />
      <ellipse cx="455" cy="279" rx="135" ry="7" fill="url(#jl-floor)" />

      {/* =====================================================================
          ВЕРХ ДЕРБИ (Собран без единого зазора в #jl-upper-clip)
         ===================================================================== */}
      <g clipPath="url(#jl-upper-clip)" style={{ transition: 'all 0.45s ease' }}>
        {/* 1. КОЖАНАЯ ПОДКЛАДКА И СТЕЛЬКА (Tertiary 15% — полностью закрывает вырез) */}
        <rect x="95" y="75" width="275" height="125" fill={tertiaryColor} />
        <rect x="95" y="75" width="275" height="125" fill="url(#jl-interior)" />
        {/* Золотое/акцентное тиснение герба на подпятнике стельки */}
        <path
          d="M 152 132 L 194 136 L 188 148 L 146 144 Z"
          fill={accentColor}
          fillOpacity="0.85"
        />

        {/* 2. ЯЗЫЧОК И СОЮЗКА (Vamp & Tongue — Secondary 30%) */}
        <path
          d="M 230 175 C 242 128, 272 90, 310 88 C 326 90, 338 102, 352 118 C 385 152, 422 178, 462 192 L 598 218 L 598 262 L 220 262 Z"
          fill={secondaryColor}
        />
        <path
          d="M 230 175 C 242 128, 272 90, 310 88 C 326 90, 338 102, 352 118 C 385 152, 422 178, 462 192 L 598 218 L 598 262 L 220 262 Z"
          fill="url(#jl-glacage)"
        />

        {/* 3. БЕРЦЫ ОТКРЫТОЙ ШНУРОВКИ С ВЫРЕЗОМ SWAN-NECK (Main 60%) */}
        <path
          d="M 124 128 C 160 148, 204 156, 240 142 C 266 132, 282 112, 298 98 C 306 92, 316 92, 326 102 C 356 132, 392 162, 430 180 C 402 198, 386 222, 398 244 L 340 260 L 104 252 L 104 128 Z"
          fill={mainColor}
          stroke={outline}
          strokeWidth="1.2"
        />
        <path
          d="M 124 128 C 160 148, 204 156, 240 142 C 266 132, 282 112, 298 98 C 306 92, 316 92, 326 102 C 356 132, 392 162, 430 180 C 402 198, 386 222, 398 244 L 340 260 L 104 252 L 104 128 Z"
          fill="url(#jl-glacage)"
        />
        {/* Изящный изгиб двойной строчки «лебединая шея» на берцах */}
        <path
          d="M 304 106 C 334 136, 370 164, 418 182 C 392 200, 378 224, 388 244"
          fill="none"
          stroke={stitch}
          strokeWidth="0.95"
          strokeDasharray="2.5 2.5"
        />
        {/* Перфорация вдоль берцев */}
        <g fill={outline} opacity="0.8">
          <circle cx="410" cy="190" r="1.7" />
          <circle cx="399" cy="200" r="1.7" />
          <circle cx="392" cy="212" r="1.7" />
          <circle cx="390" cy="225" r="1.7" />
          <circle cx="393" cy="238" r="1.7" />
        </g>

        {/* 4. КРЫЛОВИДНЫЙ МЫСОК С МЕДАЛЬОНОМ (Wingtip — Main 60%) */}
        <path
          d="M 358 258 C 382 228, 420 204, 464 188 C 472 204, 496 208, 516 196 C 550 204, 580 214, 596 226 L 596 258 Z"
          fill={mainColor}
          stroke={outline}
          strokeWidth="1.25"
        />
        <path
          d="M 358 258 C 382 228, 420 204, 464 188 C 472 204, 496 208, 516 196 C 550 204, 580 214, 596 226 L 596 258 Z"
          fill="url(#jl-glacage)"
        />
        <path
          d="M 358 258 C 382 228, 420 204, 464 188 C 472 204, 496 208, 516 196 C 550 204, 580 214, 596 226 L 596 258 Z"
          fill="url(#jl-toe-burnish)"
        />
        <path
          d="M 368 254 C 390 228, 424 208, 462 195 C 472 209, 496 213, 516 202 C 546 209, 574 218, 588 228"
          fill="none"
          stroke={stitch}
          strokeWidth="0.95"
          strokeDasharray="2.5 2.5"
        />
        {/* Брогирование крыла и ажурная розетка медальона */}
        <g fill={outline} opacity="0.82">
          <circle cx="380" cy="245" r="1.8" />
          <circle cx="395" cy="233" r="1.8" />
          <circle cx="412" cy="222" r="1.8" />
          <circle cx="430" cy="212" r="1.8" />
          <circle cx="448" cy="203" r="1.8" />
          <circle cx="468" cy="207" r="1.8" />
          <circle cx="486" cy="212" r="1.8" />
          <circle cx="504" cy="209" r="1.8" />
          <circle cx="524" cy="208" r="1.8" />
          <circle cx="544" cy="213" r="1.8" />
          <circle cx="564" cy="220" r="1.8" />
          {/* Розетка медальона */}
          <circle cx="536" cy="232" r="2.3" />
          <circle cx="548" cy="234" r="1.5" />
          <circle cx="524" cy="230" r="1.5" />
          <circle cx="538" cy="224" r="1.5" />
          <circle cx="534" cy="240" r="1.5" />
          <circle cx="560" cy="236" r="1.7" />
        </g>

        {/* 5. ПЯТОЧНЫЙ СТАКАН (Heel Counter — Main 60%) */}
        <path
          d="M 104 244 L 124 132 C 164 154, 202 184, 228 220 C 236 232, 238 242, 236 250 L 104 246 Z"
          fill={mainColor}
          stroke={outline}
          strokeWidth="1.2"
        />
        <path
          d="M 104 244 L 124 132 C 164 154, 202 184, 228 220 C 236 232, 238 242, 236 250 L 104 246 Z"
          fill="url(#jl-glacage)"
        />
        <path
          d="M 124 140 C 160 160, 196 188, 221 222 C 228 232, 230 240, 229 246"
          fill="none"
          stroke={stitch}
          strokeWidth="0.95"
          strokeDasharray="2.5 2.5"
        />
        <g fill={outline} opacity="0.78">
          <circle cx="142" cy="154" r="1.7" />
          <circle cx="160" cy="168" r="1.7" />
          <circle cx="178" cy="183" r="1.7" />
          <circle cx="195" cy="199" r="1.7" />
          <circle cx="210" cy="216" r="1.7" />
          <circle cx="220" cy="234" r="1.7" />
        </g>

        {/* Тень посадки верха в рант */}
        <path
          d="M 108 242 L 204 246 C 244 248, 282 255, 338 256 C 442 258, 535 256, 586 246"
          fill="none"
          stroke="#000000"
          strokeWidth="3.2"
          opacity="0.3"
        />
      </g>

      {/* ВНЕШНИЙ КОНТУР КОЛОДКИ И КАНТ ВЫРЕЗА */}
      <path
        d="M 108 242 C 102 206, 110 164, 128 130 C 133 122, 142 120, 155 122 C 192 125, 232 124, 266 116 C 278 98, 294 86, 310 88 C 324 90, 336 102, 348 116 C 380 148, 418 176, 458 190 C 504 202, 554 208, 584 222 C 596 228, 596 240, 586 246 C 535 256, 442 258, 338 256 C 282 255, 244 248, 204 246 L 108 242 Z"
        fill="none"
        stroke={outline}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Световая грань кожаного канта горловины */}
      <path
        d="M 128 130 C 162 148, 204 156, 240 142 C 266 132, 282 112, 298 98"
        fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)'}
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* ТОНКАЯ ВОЩЕНАЯ ШНУРОВКА (Accent 10%) */}
      <g>
        {[
          { x1: 318, y1: 112, x2: 342, y2: 100 },
          { x1: 340, y1: 130, x2: 364, y2: 118 },
          { x1: 362, y1: 148, x2: 386, y2: 136 },
          { x1: 384, y1: 164, x2: 408, y2: 152 },
        ].map((l, idx) => (
          <g key={idx}>
            <circle cx={l.x1} cy={l.y1} r="2.2" fill="#181512" stroke={outline} strokeWidth="0.8" />
            <path
              d={`M ${l.x1} ${l.y1} Q ${(l.x1 + l.x2) / 2} ${(l.y1 + l.y2) / 2 - 3} ${l.x2} ${l.y2}`}
              fill="none"
              stroke={accentColor}
              strokeWidth="2.6"
              strokeLinecap="round"
              style={{ transition: 'all 0.45s ease' }}
            />
          </g>
        ))}
      </g>

      {/* =====================================================================
          РАНТ GOODYEAR, СКОШЕННАЯ ТАЛИЯ FIDDLEBACK И НАБОРНЫЙ КАБЛУК
         ===================================================================== */}
      <g style={{ transition: 'all 0.45s ease' }}>
        {/* Скошенный наборный кожаный каблук (Cuban / Bespoke Pitched Heel) */}
        <path
          d="M 108 246 L 204 249 L 200 271 L 114 271 Z"
          fill="url(#jl-sole-grad)"
          stroke={outline}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        {/* Слои кожи наборного каблука (Leather Lifts) */}
        <line x1="110" y1="254" x2="203" y2="256" stroke={seam} strokeWidth="0.9" />
        <line x1="112" y1="262" x2="201" y2="263" stroke={seam} strokeWidth="0.9" />
        {/* Акцентная набойка каблука с уголком Джентльмена (Accent 10%) */}
        <path
          d="M 114 271 L 200 271 L 198 278 L 116 278 Z"
          fill={accentColor}
          stroke={outline}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Непрерывная кожаная подошва с узкой талией (без щелей и разрывов!) */}
        <path
          d="M 204 249 C 244 250, 282 257, 338 260 C 442 262, 535 260, 588 250 L 584 260 C 538 270, 445 272, 332 270 C 276 268, 242 257, 202 256 Z"
          fill="url(#jl-sole-grad)"
          stroke={outline}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Износостойкая профилактика пучков подошвы (Topy — Accent 10%) */}
        <path
          d="M 312 269 C 425 271, 528 269, 584 260 L 574 269 C 532 276, 448 278, 326 276 Z"
          fill={accentColor}
          stroke={outline}
          strokeWidth="1.15"
          strokeLinejoin="round"
        />

        {/* Выступающий рант Гудьир с насечкой (Goodyear Welt — Tertiary 15%) */}
        <path
          d="M 105 240 L 204 244 C 244 246, 282 253, 338 255 C 442 257, 535 255, 589 244 L 590 250 C 535 261, 442 263, 338 261 C 282 259, 244 252, 204 250 L 106 246 Z"
          fill={tertiaryColor}
          stroke={outline}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M 110 243 L 204 247 C 244 249, 282 256, 338 258 C 442 260, 534 258, 586 247"
          fill="none"
          stroke={stitch}
          strokeWidth="1.1"
          strokeDasharray="2 2.5"
        />
      </g>
    </svg>
  )
}

/* ============================================================================
   3. PUMP — HAUTE COUTURE STILETTO 105mm (Пропорции: Gianvito Rossi / YSL)
   ============================================================================ */
function PumpSvg({ colors, isDark }: { colors: string[]; isDark: boolean }) {
  const mainColor = colors[0] // 60% — Скульптурный корпус лодочки
  const secondaryColor = colors[1] // 30% — Игольчатая шпилька, пяточная чашка и острый мысок-кап
  const tertiaryColor = colors.length > 3 ? colors[2] : colors[1] // 15% — Внутренняя кожаная стелька и подкладка
  const accentColor = colors[colors.length - 1] // 10% — Контрастная лакированная подошва, набойка, пряжка

  const outline = isDark ? 'rgba(244, 240, 232, 0.48)' : 'rgba(28, 24, 22, 0.42)'
  const stitch = isDark ? 'rgba(244, 240, 232, 0.5)' : 'rgba(28, 24, 22, 0.4)'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 680 320"
      className="w-full h-auto max-h-[225px] md:max-h-[285px] select-none overflow-visible"
    >
      <defs>
        <radialGradient id="gr-floor" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity={isDark ? '0.78' : '0.24'} />
          <stop offset="55%" stopColor="#000000" stopOpacity={isDark ? '0.25' : '0.06'} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Шелковый глянец вечерней колодки */}
        <linearGradient id="gr-satin" x1="15%" y1="0%" x2="35%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.26' : '0.45'} />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000000" stopOpacity={isDark ? '0.5' : '0.28'} />
        </linearGradient>

        {/* Мягкая внутренняя тень свода стельки */}
        <linearGradient id="gr-footbed-depth" x1="0%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.1" />
          <stop offset="55%" stopColor="#000000" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
        </linearGradient>

        {/* Цилиндрический блик на тонкой шпильке */}
        <linearGradient id="gr-stiletto" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="45%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
        </linearGradient>

        {/* Единый лекальный контур внешнего корпуса лодочки */}
        <clipPath id="gr-body-clip">
          <path d="M 152 64 C 130 92, 126 128, 138 156 C 194 168, 250 214, 322 264 C 352 280, 382 282, 422 282 L 502 282 C 538 282, 568 272, 592 254 C 556 238, 496 226, 438 220 C 392 246, 336 236, 278 190 C 222 146, 178 92, 152 64 Z" />
        </clipPath>
      </defs>

      {/* Подиумные тени: точечная под шпилькой, глубокая под мыском и легкая под высоким сводом */}
      <ellipse cx="365" cy="283" rx="238" ry="10" fill="url(#gr-floor)" />
      <ellipse cx="148" cy="281" rx="22" ry="5" fill="url(#gr-floor)" />
      <ellipse cx="475" cy="281" rx="115" ry="7" fill="url(#gr-floor)" />

      {/* =====================================================================
          1. ИГОЛЬЧАТАЯ ШПИЛЬКА 105 ММ (Stiletto Heel — Secondary 30%)
         ===================================================================== */}
      <g style={{ transition: 'all 0.45s ease' }}>
        <path
          d="M 138 154 L 180 168 C 162 192, 154 230, 152 273 L 144 273 C 144 230, 142 188, 138 154 Z"
          fill={secondaryColor}
          stroke={outline}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 138 154 L 180 168 C 162 192, 154 230, 152 273 L 144 273 C 144 230, 142 188, 138 154 Z"
          fill="url(#gr-stiletto)"
        />
        {/* Миниатюрная набойка шпильки (Accent 10%) */}
        <path
          d="M 144 273 L 152 273 L 152 280 L 144 280 Z"
          fill={accentColor}
          stroke={outline}
          strokeWidth="1.1"
        />
      </g>

      {/* =====================================================================
          2. ВНУТРЕННЯЯ ЧАША СТЕЛЬКИ И ДАЛЬНИЙ БОРТ (Insole — Tertiary 15%)
         ===================================================================== */}
      <g style={{ transition: 'all 0.45s ease' }}>
        <path
          d="M 152 64 C 186 78, 232 122, 290 168 C 344 210, 396 226, 438 220 L 408 248 C 320 232, 218 156, 148 112 Z"
          fill={tertiaryColor}
          stroke={outline}
          strokeWidth="1.2"
        />
        <path
          d="M 152 64 C 186 78, 232 122, 290 168 C 344 210, 396 226, 438 220 L 408 248 C 320 232, 218 156, 148 112 Z"
          fill="url(#gr-footbed-depth)"
        />
        {/* Фирменный кожаный подпятник с тиснением на стельке (Accent 10%) */}
        <path
          d="M 176 92 C 198 106, 222 126, 244 146 L 230 158 C 208 138, 184 118, 164 102 Z"
          fill={accentColor}
          fillOpacity="0.88"
          stroke={outline}
          strokeWidth="0.8"
        />
      </g>

      {/* =====================================================================
          3. ЛАКИРОВАННАЯ ПОДОШВА ПОД СВОДОМ (Signature Sole — Accent 10%)
         ===================================================================== */}
      <g style={{ transition: 'all 0.45s ease' }}>
        <path
          d="M 138 154 C 194 166, 250 212, 322 262 C 352 278, 382 280, 422 280 L 502 280 C 538 280, 568 270, 592 254 L 594 259 C 568 276, 538 285, 502 285 L 420 285 C 380 285, 350 282, 318 266 C 248 218, 192 172, 138 160 Z"
          fill={accentColor}
          stroke={outline}
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </g>

      {/* =====================================================================
          4. СКУЛЬПТУРНЫЙ КОРПУС, ПЯТОЧНАЯ ЧАШКА И ОСТРЫЙ МЫСОК (#gr-body-clip)
         ===================================================================== */}
      <g clipPath="url(#gr-body-clip)" style={{ transition: 'all 0.45s ease' }}>
        {/* Основной корпус лодочки (Main 60%) */}
        <rect x="120" y="55" width="480" height="235" fill={mainColor} />
        <rect x="120" y="55" width="480" height="235" fill="url(#gr-satin)" />

        {/* Скульптурная пяточная чашка (Heel Cup — Secondary 30%) */}
        <path
          d="M 120 60 L 166 60 C 188 106, 212 152, 232 204 L 120 190 Z"
          fill={secondaryColor}
          stroke={outline}
          strokeWidth="1.2"
        />
        <path
          d="M 120 60 L 166 60 C 188 106, 212 152, 232 204 L 120 190 Z"
          fill="url(#gr-satin)"
        />
        <path
          d="M 160 66 C 182 110, 205 154, 224 200"
          fill="none"
          stroke={stitch}
          strokeWidth="0.9"
          strokeDasharray="2.5 2.5"
        />

        {/* Заостренный кутюрный мысок-кап (Pointed Toe Cap — Secondary 30%) */}
        <path
          d="M 468 215 C 482 242, 480 266, 462 288 L 598 288 L 598 215 Z"
          fill={secondaryColor}
          stroke={outline}
          strokeWidth="1.2"
        />
        <path
          d="M 468 215 C 482 242, 480 266, 462 288 L 598 288 L 598 215 Z"
          fill="url(#gr-satin)"
        />
        <path
          d="M 462 218 C 475 242, 473 265, 456 284"
          fill="none"
          stroke={stitch}
          strokeWidth="0.9"
          strokeDasharray="2.5 2.5"
        />
      </g>

      {/* Внешний бритвенно-четкий контур лодочки и блик по декольте */}
      <path
        d="M 152 64 C 130 92, 126 128, 138 156 C 194 168, 250 214, 322 264 C 352 280, 382 282, 422 282 L 502 282 C 538 282, 568 272, 592 254 C 556 238, 496 226, 438 220 C 392 246, 336 236, 278 190 C 222 146, 178 92, 152 64 Z"
        fill="none"
        stroke={outline}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M 152 64 C 178 92, 222 146, 278 190 C 336 236, 392 246, 438 220"
        fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.88)'}
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* =====================================================================
          5. ЮВЕЛИРНАЯ ПРЯЖКА НА ДЕКОЛЬТЕ МЫСКА (Couture Hardware — Accent 10%)
         ===================================================================== */}
      <g style={{ transition: 'all 0.45s ease' }}>
        <path
          d="M 432 214 L 478 222 L 470 240 L 424 231 Z"
          fill={accentColor}
          stroke={outline}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M 439 219 L 470 225 L 465 235 L 434 228 Z"
          fill={secondaryColor}
          stroke={outline}
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
        {/* Блик на грани пряжки */}
        <line
          x1="434"
          y1="216"
          x2="476"
          y2="223"
          stroke="#ffffff"
          strokeWidth="1"
          opacity="0.65"
        />
      </g>
    </svg>
  )
}


        

        

          
        

/* ============================================================================
   ОСНОВНОЙ КОМПОНЕНТ СТРАНИЦЫ ЦВЕТОВ
   ============================================================================ */
export function ColorsPage({ onBack, lang, setLang }: ColorsPageProps) {
  const [scheme, setScheme] = useState<Scheme>('complementary')
  const [silhouette, setSilhouette] = useState<Silhouette>('runner')
  const [baseHue, setBaseHue] = useState(0)
  const [whiteAmount, setWhiteAmount] = useState(0.05)
  const [blackAmount, setBlackAmount] = useState(0.05)
  const [showGuide, setShowGuide] = useState(false)

  const [isProPurchased, setIsProPurchased] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [showProModal, setShowProModal] = useState(false)

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  const wheelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const rafId = useRef<number | null>(null)
  const pendingValue = useRef<number | null>(null)

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id
    if (!userId) return

    fetch(`/api/check-purchase?userId=${userId}&productId=pro_colors`)
      .then((res) => res.json())
      .then((data) => {
        if (data.purchased) setIsProPurchased(true)
      })
      .catch((err) => console.error('Ошибка проверки покупки:', err))
  }, [])

  const handleProClick = async () => {
    const tg = (window as any).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id

    if (!userId) {
      alert('Ошибка: Откройте приложение через Telegram.')
      return
    }

    setIsPurchasing(true)
    haptic('light')

    try {
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId: 'pro_colors' }),
      })

      const data = await response.json()
      if (!response.ok || !data.invoiceLink) throw new Error(data.error)

      tg.openInvoice(data.invoiceLink, (status: string) => {
        if (status === 'paid') {
          haptic('heavy')
          setIsProPurchased(true)
          setShowProModal(false)
        } else if (status === 'failed') {
          alert('Оплата была отменена или произошла ошибка.')
        }
      })
    } catch (error: any) {
      console.error(error)
      alert(`Сбой сервера: ${error.message}`)
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleLangChange = (newLang: Lang) => {
    localStorage.setItem('app_lang', newLang)
    setLang(newLang)
  }

  const handleSchemeClick = (s: Scheme) => {
    const isFree = s === 'complementary' || s === 'analogous'
    if (!isFree && !isProPurchased) {
      haptic('medium')
      setShowProModal(true)
      return
    }
    haptic('light')
    setScheme(s)
  }

  const handleSilhouetteChange = (next: Silhouette) => {
    if (next === silhouette) return
    haptic('light')
    setSilhouette(next)
  }

  const t = {
    ru: {
      title: 'Цвета',
      complementary: 'Комплементарная',
      analogous: 'Аналогичная',
      triadic: 'Триадная',
      tetradic: 'Тетрада (квадрат)',
      rectangular: 'Тетрада (прямоугольник)',
      'split-complementary': 'Контрастная триада',
      monochromatic: 'Монохромная',
      silhouetteRunner: 'Сникер',
      silhouetteDerby: 'Дерби',
      silhouettePump: 'Лодочки',
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      roleUpper: 'Верх',
      roleDetailsLining: 'Детали • Подкладка',
      roleDetails: 'Детали верха',
      roleLining: 'Подкладка • Стелька',
      roleAccent: 'Подошва • Акцент',
      quote: '«Цвет — это душа обуви.»',
      white: 'К белому',
      black: 'К чёрному',
      pure: 'Чистый',
      ittenLabel: 'Круговая палитра',
      guideBtn: 'Гид',
      guideTitle: 'Цвет в дизайне',
      guideClose: 'Закрыть',
      paywallTitle: 'PRO: Палитры',
      paywallDesc:
        'Откройте доступ ко всем профессиональным цветовым схемам: триады, тетрады и благородный монохром.',
      paywallBtn: 'ОТКРЫТЬ ДОСТУП • 1 ⭐️',
      loading: 'ОБРАБОТКА...',
      guideIntro:
        'Круг Иттена — классический инструмент гармонизации цвета. В обуви он особенно важен: основная палитра почти всегда строится вокруг нейтралей (чёрный, белый, бежевый, серый), а цвет появляется точечно — в коже верха, подкладке, строчке, подошве или фурнитуре.',
      guideBalanceTitle: 'Правило баланса',
      guideBalance:
        '60 % — основной цвет (обычно нейтраль или доминирующий тон кожи).\n30 % — поддерживающий цвет (подкладка, язычок, задник).\n10 % — акцент (строчка, логотип, металлическая фурнитура, подошва).',
      guideSchemesTitle: 'Схемы и применение',
      guideComplementary:
        'Комплементарная — два противоположных цвета. Даёт сильный, энергичный контраст. Хороша для спортивной и fashion-обуви, где нужен яркий акцент на нейтральном фоне.',
      guideAnalogous:
        'Аналогичная — соседние цвета на круге. Создаёт мягкий, спокойный переход. Идеальна для классической и повседневной обуви, когда хочется богатства тона без резкости.',
      guideTriadic:
        'Триадная — три цвета через 120°. Живая и сбалансированная. Подходит для капсульных коллекций и сезонных цветовых историй.',
      guideTetradic:
        'Тетрада (квадрат) — четыре цвета через 90°. Самая яркая схема. Используйте один доминирующий тон, два поддерживающих и один чистый акцент, иначе композиция станет пёстрой.',
      guideRectangular:
        'Тетрада (прямоугольник) — две комплементарные пары со сдвигом. Мягче квадрата, даёт больше пространства для нюансов. Отлично работает в премиальной и дизайнерской обуви.',
      guideSplit:
        'Контрастная триада — основной цвет + два соседних к его комплементу. Контраст есть, но мягче чистой комплементарной. Универсальный выбор для большинства моделей.',
      guideMono:
        'Монохромная — один цвет в разных тонах и насыщенностях. Самая элегантная и «дорогая» схема. Идеальна для минимализма, вечерней обуви и когда кожа сама по себе выразительна.',
      guideFootwearTitle: 'Специфика обуви',
      guideFootwear:
        '• Верх: основной цвет (60–70 %).\n• Подкладка и стелька: поддерживающий или более светлый тон.\n• Подошва и каблук: часто нейтраль или акцент.\n• Фурнитура и строчка: самый чистый и яркий акцент (5–10 %).\n• Чёрный и белый — не «отсутствие цвета», а мощные инструменты контраста и формы.',
      guideTip:
        'Совет: всегда проверяйте сочетание при разном освещении — дневном, тёплом искусственном и холодном. Кожа и замша меняют оттенок сильнее, чем кажется.',
    },
    uk: {
      title: 'Кольори',
      complementary: 'Комплементарна',
      analogous: 'Аналогічна',
      triadic: 'Тріадна',
      tetradic: 'Тетрада (квадрат)',
      rectangular: 'Тетрада (прямокутник)',
      'split-complementary': 'Контрастна тріада',
      monochromatic: 'Монохромна',
      silhouetteRunner: 'Снікер',
      silhouetteDerby: 'Дербі',
      silhouettePump: 'Човники',
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      roleUpper: 'Верх',
      roleDetailsLining: 'Деталі • Підкладка',
      roleDetails: 'Деталі верху',
      roleLining: 'Підкладка • Устілка',
      roleAccent: 'Підошва • Акцент',
      quote: '«Колір — це душа взуття.»',
      white: 'До білого',
      black: 'До чорного',
      pure: 'Чистий',
      ittenLabel: 'Кругова палітра',
      guideBtn: 'Гід',
      guideTitle: 'Колір у дизайні',
      guideClose: 'Закрити',
      paywallTitle: 'PRO: Палітри',
      paywallDesc:
        'Відкрийте доступ до всіх професійних колірних схем: тріади, тетради та шляхетний монохром.',
      paywallBtn: 'ВІДКРИТИ ДОСТУП • 1 ⭐️',
      loading: 'ОБРОБКА...',
      guideIntro:
        'Коло Іттена — класичний інструмент гармонізації кольору. У взутті він особливо важливий: основна палітра майже завжди будується навколо нейтралей (чорний, білий, бежевий, сірий), а колір з’являється точково — у шкірі верху, підкладці, рядку, підошві чи фурнітурі.',
      guideBalanceTitle: 'Правило балансу',
      guideBalance:
        '60 % — основний колір (зазвичай нейтраль або домінуючий тон шкіри).\n30 % — підтримуючий колір (підкладка, язичок, задник).\n10 % — акцент (рядок, логотип, металева фурнітура, підошва).',
      guideSchemesTitle: 'Схеми і застосування',
      guideComplementary:
        'Комплементарна — два протилежні кольори. Дає сильний, енергійний контраст. Добре працює у спортивному та fashion-взутті, де потрібен яскравий акцент на нейтральному тлі.',
      guideAnalogous:
        'Аналогічна — сусідні кольори на колі. Створює м’який, спокійний перехід. Ідеальна для класичного та повсякденного взуття, коли хочеться багатства тону без різкості.',
      guideTriadic:
        'Тріадна — три кольори через 120°. Жива і збалансована. Підходить для капсульних колекцій і сезонних кольорових історій.',
      guideTetradic:
        'Тетрада (квадрат) — чотири кольори через 90°. Найяскравіша схема. Використовуйте один домінуючий тон, два підтримуючих і один чистий акцент, інакше композиція стане строкатою.',
      guideRectangular:
        'Тетрада (прямокутник) — дві комплементарні пари зі зсувом. М’якша за квадрат, дає більше простору для нюансів. Відмінно працює в преміальному та дизайнерському взутті.',
      guideSplit:
        'Контрастна тріада — основний колір + два сусідні до його комплементу. Контраст є, але м’якший за чисту комплементарну. Універсальний вибір для більшості моделей.',
      guideMono:
        'Монохромна — один колір у різних тонах і насиченостях. Найелегантніша і «дорога» схема. Ідеальна для мінімалізму, вечірнього взуття і коли шкіра сама по собі виразна.',
      guideFootwearTitle: 'Специфіка взуття',
      guideFootwear:
        '• Верх: основний колір (60–70 %).\n• Підкладка і устілка: підтримуючий або світліший тон.\n• Підошва і підбор: часто нейтраль або акцент.\n• Фурнітура і рядок: найчистіший і найяскравіший акцент (5–10 %).\n• Чорний і білий — не «відсутність кольору», а потужні інструменти контрасту і форми.',
      guideTip:
        'Порада: завжди перевіряйте поєднання при різному освітленні — денному, теплому штучному і холодному. Шкіра і замша змінюють відтінок сильніше, ніж здається.',
    },
    de: {
      title: 'Farben',
      complementary: 'Komplementär',
      analogous: 'Analog',
      triadic: 'Triadisch',
      tetradic: 'Tetradisch (Quadrat)',
      rectangular: 'Tetradisch (Rechteck)',
      'split-complementary': 'Split-Komplementär',
      monochromatic: 'Monochromatisch',
      silhouetteRunner: 'Sneaker',
      silhouetteDerby: 'Derby',
      silhouettePump: 'Pumps',
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      roleUpper: 'Oberleder',
      roleDetailsLining: 'Details • Futter',
      roleDetails: 'Details',
      roleLining: 'Futter • Sohle',
      roleAccent: 'Laufsohle • Akzent',
      quote: '«Farbe ist die Seele des Schuhs.»',
      white: 'Zu Weiß',
      black: 'Zu Schwarz',
      pure: 'Rein',
      ittenLabel: 'Farbkreis',
      guideBtn: 'Guide',
      guideTitle: 'Farbe im Design',
      guideClose: 'Schließen',
      paywallTitle: 'PRO: Paletten',
      paywallDesc:
        'Schalten Sie alle professionellen Farbschemata frei: Triaden, Tetraden und edles Monochrom.',
      paywallBtn: 'FREISCHALTEN FÜR 1 ⭐️',
      loading: 'LÄDT...',
      guideIntro:
        'Der Itten-Farbkreis ist ein klassisches Werkzeug zur Farbharmonisierung. Bei Schuhen ist er besonders wichtig: Die Grundpalette ist fast immer um neutrale Farben (Schwarz, Weiß, Beige, Grau) herum aufgebaut, und Farbe taucht punktuell auf — im Oberleder, im Futter, in den Nähten, der Sohle oder den Beschlägen.',
      guideBalanceTitle: 'Die Balance-Regel',
      guideBalance:
        '60 % — Hauptfarbe (meist neutral oder der dominierende Lederton).\n30 % — Unterstützende Farbe (Futter, Zunge, Fersenkappe).\n10 % — Akzent (Nähte, Logo, Metallbeschläge, Sohle).',
      guideSchemesTitle: 'Farbschemata & Anwendung',
      guideComplementary:
        'Komplementär — zwei gegenüberliegende Farben. Ergibt einen starken, energetischen Kontrast. Gut für Sport- und Fashion-Schuhe, bei denen ein leuchtender Akzent auf neutralem Grund benötigt wird.',
      guideAnalogous:
        'Analog — benachbarte Farben auf dem Kreis. Schafft einen weichen, ruhigen Übergang. Ideal für klassische und Freizeitschuhe, wenn man eine reiche Tonalität ohne Härte wünscht.',
      guideTriadic:
        'Triadisch — drei Farben im 120°-Abstand. Lebendig und ausgewogen. Geeignet für Capsule-Kollektionen und saisonale Farbgeschichten.',
      guideTetradic:
        'Tetradisch (Quadrat) — vier Farben im 90°-Abstand. Das lebhafteste Schema. Verwenden Sie einen dominierenden Ton, zwei unterstützende und einen reinen Akzent, sonst wird die Komposition zu bunt.',
      guideRectangular:
        'Tetradisch (Rechteck) — zwei komplementäre Paare mit Verschiebung. Weicher als das Quadrat, bietet mehr Raum für Nuancen. Funktioniert hervorragend bei Premium- und Designerschuhen.',
      guideSplit:
        'Split-Komplementär — Hauptfarbe + die zwei Nachbarn ihrer Komplementärfarbe. Kontrast ist vorhanden, aber weicher als rein komplementär. Eine universelle Wahl für die meisten Modelle.',
      guideMono:
        'Monochromatisch — eine Farbe in verschiedenen Tönen und Sättigungen. Das eleganteste und „teuerste“ Schema. Ideal für Minimalismus, Abendschuhe und wenn das Leder an sich schon ausdrucksstark ist.',
      guideFootwearTitle: 'Besonderheiten bei Schuhen',
      guideFootwear:
        '• Obermaterial: Hauptfarbe (60–70 %).\n• Futter und Innensohle: unterstützender oder hellerer Ton.\n• Sohle und Absatz: oft neutral oder Akzent.\n• Beschläge und Nähte: der reinste und hellste Akzent (5–10 %).\n• Schwarz und Weiß sind keine „Farblosigkeit“, sondern mächtige Werkzeuge für Kontrast und Form.',
      guideTip:
        'Tipp: Überprüfen Sie Farbkombinationen immer bei unterschiedlichen Lichtverhältnissen — Tageslicht, warmes Kunstlicht und kaltes Licht. Leder und Wildleder verändern ihren Farbton stärker als es scheint.',
    },
  }[lang]

  const makeIttenColor = (hue: number, white: number, black: number, satBase = 85): string => {
    const sat = Math.max(12, Math.min(92, satBase * (1 - white * 0.75) * (1 - black * 0.55)))
    const light = Math.max(
      18,
      Math.min(88, 50 * (1 - black * 0.9) * (1 - white * 0.45) + white * 42)
    )
    return `hsl(${((hue % 360) + 360) % 360}, ${sat.toFixed(1)}%, ${light.toFixed(1)}%)`
  }

  const getColors = useCallback((): string[] => {
    const h = ((baseHue % 360) + 360) % 360

    if (scheme === 'monochromatic') {
      return [
        makeIttenColor(h, whiteAmount * 0.15, blackAmount * 0.3, 82),
        makeIttenColor(h, whiteAmount + 0.45, blackAmount * 0.2, 45),
        makeIttenColor(h, whiteAmount * 0.05, blackAmount + 0.35, 70),
      ]
    }

    switch (scheme) {
      case 'complementary':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.55, blackAmount * 0.45, 78),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.1, blackAmount * 0.15, 88),
        ]
      case 'analogous':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 30) % 360, whiteAmount * 0.6, blackAmount * 0.35, 80),
          makeIttenColor((h - 30 + 360) % 360, whiteAmount * 0.15, blackAmount * 0.25, 86),
        ]
      case 'triadic':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 120) % 360, whiteAmount * 0.55, blackAmount * 0.4, 80),
          makeIttenColor((h + 240) % 360, whiteAmount * 0.12, blackAmount * 0.2, 86),
        ]
      case 'tetradic':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 90) % 360, whiteAmount * 0.5 + 0.1, blackAmount * 0.4 + 0.05, 72),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.45 + 0.12, blackAmount * 0.35 + 0.08, 68),
          makeIttenColor((h + 270) % 360, whiteAmount * 0.08, blackAmount * 0.12, 88),
        ]
      case 'rectangular':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 60) % 360, whiteAmount * 0.45 + 0.08, blackAmount * 0.35 + 0.05, 75),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.45 + 0.12, blackAmount * 0.35 + 0.08, 70),
          makeIttenColor((h + 240) % 360, whiteAmount * 0.08, blackAmount * 0.12, 88),
        ]
      case 'split-complementary':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 150) % 360, whiteAmount * 0.55, blackAmount * 0.4, 80),
          makeIttenColor((h + 210) % 360, whiteAmount * 0.12, blackAmount * 0.2, 86),
        ]
      default:
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.55, blackAmount * 0.45, 78),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.1, blackAmount * 0.15, 88),
        ]
    }
  }, [baseHue, whiteAmount, blackAmount, scheme])

  const colors = getColors()
  const isTetrad = scheme === 'tetradic' || scheme === 'rectangular'

  const wheelBackground = `conic-gradient(
    from 0deg,
    hsl(0, 90%, 50%),
    hsl(30, 90%, 50%),
    hsl(60, 90%, 50%),
    hsl(90, 90%, 50%),
    hsl(120, 90%, 50%),
    hsl(150, 90%, 50%),
    hsl(180, 90%, 50%),
    hsl(210, 90%, 50%),
    hsl(240, 90%, 50%),
    hsl(270, 90%, 50%),
    hsl(300, 90%, 50%),
    hsl(330, 90%, 50%),
    hsl(360, 90%, 50%)
  )`

  const pointerColor = `hsl(${baseHue}, 85%, 50%)`

  const updateFromAngle = useCallback((clientX: number, clientY: number) => {
    const el = wheelRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy

    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    angle = (angle + 90 + 360) % 360

    pendingValue.current = Math.round(angle)

    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        if (pendingValue.current !== null) {
          setBaseHue(pendingValue.current)
          pendingValue.current = null
        }
        rafId.current = null
      })
    }
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updateFromAngle(e.clientX, e.clientY)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    updateFromAngle(e.clientX, e.clientY)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const pointerAngle = baseHue
  const ratioLabels = isTetrad
    ? [t.main55, t.secondary20, t.secondary15, t.accent10]
    : [t.main60, t.secondary30, t.accent10]

  const roleLabels = isTetrad
    ? [t.roleUpper, t.roleDetails, t.roleLining, t.roleAccent]
    : [t.roleUpper, t.roleDetailsLining, t.roleAccent]

  const SCHEMES: Scheme[] = [
    'complementary',
    'analogous',
    'triadic',
    'tetradic',
    'rectangular',
    'split-complementary',
    'monochromatic',
  ]

  const SILHOUETTES: { id: Silhouette; label: string }[] = [
    { id: 'runner', label: t.silhouetteRunner },
    { id: 'derby', label: t.silhouetteDerby },
    { id: 'pump', label: t.silhouettePump },
  ]

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative min-h-[100dvh] w-full transition-colors duration-[1.5s] ${cBg} ${cText}`}
    >
      <style>{`
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        input[type=range] {
          -webkit-appearance: none;
          background: transparent;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 1px;
          background: ${isDark ? 'rgba(244,240,232,0.2)' : 'rgba(28,24,22,0.2)'};
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: ${isDark ? '#F4F0E8' : '#1C1816'};
          margin-top: -5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
      `}</style>

      {/* HEADER */}
      <header className="px-6 pt-8 pb-4 flex items-start justify-between z-20">
        <button
          onClick={onBack}
          className={`group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors`}
        >
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {['ru', 'uk', 'de'].map((l) => (
              <button
                key={l}
                onClick={() => handleLangChange(l as Lang)}
                className={`text-[10px] font-sans uppercase tracking-[0.25em] outline-none border-0 bg-transparent cursor-pointer transition-colors duration-300 ${
                  lang === l ? cText : cTextMuted
                } ${cHover}`}
              >
                {l === 'uk' ? 'UKR' : l}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowGuide(true)}
            className={`text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors`}
          >
            {t.guideBtn}
          </button>
        </div>
      </header>

      <div className="px-6 pb-24">
        <div className="mb-10">
          <h1 className="font-serif text-[18vw] min-[400px]:text-6xl leading-[0.85] tracking-[-0.04em]">
            {t.title}
          </h1>
        </div>

        {/* СХЕМЫ ЦВЕТОВ */}
        <div className={`flex overflow-x-auto gap-8 pb-5 mb-10 border-b ${cLine} scrollbar-hide`}>
          {SCHEMES.map((s) => {
            const isFree = s === 'complementary' || s === 'analogous'
            const isLocked = !isFree && !isProPurchased

            return (
              <button
                key={s}
                onClick={() => handleSchemeClick(s)}
                className={`flex items-center gap-1.5 text-[9px] font-sans uppercase tracking-[0.25em] whitespace-nowrap transition-all duration-300 outline-none border-none bg-transparent cursor-pointer ${
                  scheme === s ? `italic ${cText} opacity-100` : `${cTextMuted} opacity-60 hover:opacity-100`
                }`}
              >
                {isLocked && (
                  <span className="text-[#FFB020]">
                    <LockIcon size={8} />
                  </span>
                )}
                {t[s]}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center md:items-start mb-16">
          {/* ЦВЕТОВОЙ КРУГ ИТТЕНА */}
          <div className="flex flex-col items-center shrink-0">
            <div
              ref={wheelRef}
              className="relative w-[180px] h-[180px] md:w-[220px] md:h-[220px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none"
              style={{
                background: wheelBackground,
                boxShadow: `0 0 0 1px ${
                  isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }, 0 10px 30px rgba(0,0,0,0.15)`,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div
                className="absolute inset-[24%] rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 32%, white 0%, ${colors[0]} 42%, #111 95%)`,
                  boxShadow:
                    'inset -4px -4px 12px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25)',
                }}
              />
              <div
                className="absolute top-1 left-1/2 w-4 h-4 rounded-full border-[1.5px] border-white shadow-md pointer-events-none origin-[50%_86px] md:origin-[50%_106px]"
                style={{
                  backgroundColor: pointerColor,
                  transform: `translateX(-50%) rotate(${pointerAngle}deg)`,
                }}
              />
            </div>
            <p className={`mt-6 text-[9px] font-sans tracking-[0.3em] uppercase ${cTextMuted}`}>
              {t.ittenLabel}
            </p>
          </div>

          {/* СИЛУЭТЫ ОБУВИ, ПЕРЕКЛЮЧАТЕЛЬ И СВОТЧИ */}
          <div className="flex-1 w-full max-w-md">
            {/* Переключатель силуэтов обуви */}
            <div className="flex justify-center items-center gap-6 mb-4">
              {SILHOUETTES.map((item) => {
                const active = silhouette === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSilhouetteChange(item.id)}
                    className={`relative pb-2 text-[9px] font-sans uppercase tracking-[0.28em] outline-none border-none bg-transparent cursor-pointer transition-all duration-300 ${
                      active ? `${cText} opacity-100` : `${cTextMuted} opacity-50 hover:opacity-85`
                    }`}
                  >
                    {item.label}
                    {active && (
                      <motion.div
                        layoutId="silhouetteIndicator"
                        className={`absolute bottom-0 left-0 right-0 h-[1px] ${
                          isDark ? 'bg-[#F4F0E8]' : 'bg-[#1C1816]'
                        }`}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Визуализация выбранной модели */}
            <div className="mb-10 flex justify-center items-center px-2 min-h-[215px] md:min-h-[265px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={silhouette}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full flex justify-center items-center"
                >
                  {silhouette === 'runner' && <RunnerSvg colors={colors} isDark={isDark} />}
                  {silhouette === 'derby' && <DerbySvg colors={colors} isDark={isDark} />}
                  {silhouette === 'pump' && <PumpSvg colors={colors} isDark={isDark} />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Слайдеры Тон/Тень */}
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div>
                <div
                  className={`flex justify-between text-[9px] font-sans uppercase tracking-widest mb-4 ${cTextMuted}`}
                >
                  <span>{t.pure}</span>
                  <span>{t.white}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={whiteAmount}
                  onChange={(e) => setWhiteAmount(parseFloat(e.target.value))}
                />
              </div>
              <div>
                <div
                  className={`flex justify-between text-[9px] font-sans uppercase tracking-widest mb-4 ${cTextMuted}`}
                >
                  <span>{t.pure}</span>
                  <span>{t.black}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={blackAmount}
                  onChange={(e) => setBlackAmount(parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* Свотчи палитры с подписями зон обуви */}
            <div className={`grid gap-4 ${isTetrad ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {colors.map((c, i) => (
                <div key={i} className="flex flex-col">
                  <div
                    className={`w-full h-24 mb-3 shadow-sm border ${
                      isDark ? 'border-white/10' : 'border-black/5'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                  <div className={`text-[9px] font-sans uppercase tracking-[0.2em] ${cText}`}>
                    {ratioLabels[i]}
                  </div>
                  <div
                    className={`mt-1 text-[8px] font-sans uppercase tracking-[0.12em] leading-tight ${cTextMuted}`}
                  >
                    {roleLabels[i]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ЦИТАТА */}
        <div className="pb-10 pt-4">
          <div className="flex flex-col items-center text-center px-4">
            <div className={`w-px h-12 mb-8 ${cLine} border-l`} />
            <p className={`font-serif text-[18px] sm:text-[20px] italic leading-[1.5] ${cTextMuted}`}>
              {t.quote}
            </p>
            <p className={`mt-6 text-[9px] font-sans font-bold uppercase tracking-[0.4em] ${cText}`}>
              Cordwainer
            </p>
          </div>
        </div>
      </div>

      {/* МОДАЛКА PRO ДОСТУПА */}
      <AnimatePresence>
        {showProModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#000000]/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-[340px] p-8 border ${cLine} ${
                isDark ? 'bg-[#111111]' : 'bg-[#EAE6DF]'
              } shadow-2xl flex flex-col overflow-hidden`}
            >
              <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l ${cLine}`} />
              <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${cLine}`} />
              <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${cLine}`} />
              <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r ${cLine}`} />

              <button
                onClick={() => setShowProModal(false)}
                className={`absolute top-4 right-4 ${cTextMuted} hover:text-current`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              <div className={`flex justify-center mb-5 ${cTextMuted} opacity-50`}>
                <LockIcon size={32} />
              </div>

              <h3 className={`font-serif text-2xl tracking-tight mb-4 text-center ${cText}`}>
                {t.paywallTitle}
              </h3>

              <p
                className={`text-[12px] font-sans font-light leading-relaxed mb-8 text-center ${cTextMuted}`}
              >
                {t.paywallDesc}
              </p>

              <button
                onClick={handleProClick}
                disabled={isPurchasing}
                className={`group flex items-center justify-center gap-3 w-full py-4 border ${cLine} ${cText} hover:bg-current/5 active:scale-95 transition-all outline-none bg-transparent`}
              >
                {isPurchasing ? (
                  <span className="text-[10px] font-sans uppercase tracking-[0.2em] animate-pulse">
                    {t.loading}
                  </span>
                ) : (
                  <>
                    <LockIcon size={14} />
                    <span className="text-[10px] font-sans uppercase tracking-[0.2em]">
                      {t.paywallBtn}
                    </span>
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY: ГИД */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed inset-0 z-[90] flex flex-col ${cBg} ${cText} overflow-hidden`}
          >
            <div className="px-6 pt-10 pb-6 flex items-start justify-between shrink-0">
              <h2 className="font-serif text-[12vw] min-[400px]:text-5xl leading-none tracking-tight">
                {t.guideTitle}
              </h2>
              <button
                onClick={() => setShowGuide(false)}
                className={`text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors mt-2`}
              >
                {t.guideClose}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide space-y-12">
              <p className="text-[14px] min-[400px]:text-[16px] leading-[1.8] font-light max-w-lg">
                {t.guideIntro}
              </p>

              <div>
                <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-6 ${cTextMuted}`}>
                  {t.guideBalanceTitle}
                </h3>
                <p
                  className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] whitespace-pre-line font-light border-l border-current/20 pl-5 max-w-lg`}
                >
                  {t.guideBalance}
                </p>
              </div>

              <div>
                <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-8 ${cTextMuted}`}>
                  {t.guideSchemesTitle}
                </h3>
                <div className="space-y-8 max-w-lg">
                  {[
                    { title: t.complementary, text: t.guideComplementary },
                    { title: t.analogous, text: t.guideAnalogous },
                    { title: t.triadic, text: t.guideTriadic },
                    { title: t.tetradic, text: t.guideTetradic },
                    { title: t.rectangular, text: t.guideRectangular },
                    { title: t['split-complementary'], text: t.guideSplit },
                    { title: t.monochromatic, text: t.guideMono },
                  ].map((item) => (
                    <div key={item.title}>
                      <div className="font-serif text-[22px] min-[400px]:text-[26px] leading-[1.2] mb-3">
                        {item.title}
                      </div>
                      <p
                        className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] font-light ${cTextMuted}`}
                      >
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-6 ${cTextMuted}`}>
                  {t.guideFootwearTitle}
                </h3>
                <p
                  className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] whitespace-pre-line font-light border-l border-current/20 pl-5 max-w-lg`}
                >
                  {t.guideFootwear}
                </p>
              </div>

              <div className={`pt-8 border-t ${cLine} max-w-lg`}>
                <p
                  className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] font-light italic ${cTextMuted}`}
                >
                  {t.guideTip}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
